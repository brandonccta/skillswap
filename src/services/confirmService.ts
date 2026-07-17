/**
 * TypeScript port of engine.py:confirm_trade + storage_handler.py:update_trade_status.
 *
 * Validation mirrors the Python engine exactly:
 *   Step 1 — required fields: tradeId, userId
 *   Step 2 — trade exists, user is participant, trade is confirmable
 *   Step 3 — upsert trade_confirmations, count confirmers, update trade status
 */
import { supabase } from '../lib/supabase';
import { ResponsePayload } from '../types';
import { getTradeById } from './tradeService';

function checkRequired(payload: object, required: string[]): string[] {
  const p = payload as Record<string, unknown>;
  return required.filter((f) => !p[f] && p[f] !== 0);
}

// Mirrors engine.py:confirm_trade — only in_progress or awaiting_confirmation trades
// are confirmable; pending / accepted / completed / declined are all rejected.
const CONFIRMABLE_STATUSES = ['in_progress', 'awaiting_confirmation'];

// ─── confirmTrade ─────────────────────────────────────────────────────────────

export interface ConfirmTradePayload {
  tradeId: string;
  userId: string;
}

export async function confirmTrade(
  payload: ConfirmTradePayload
): Promise<ResponsePayload<{ newStatus: string }>> {
  try {
    // Step 1 — required fields
    const missing = checkRequired(payload, ['tradeId', 'userId']);
    if (missing.length) {
      return { status: 'incomplete', message: 'Missing required fields.', missing };
    }

    // Step 2 — trade must exist and be confirmable
    const tradeResult = await getTradeById(payload.tradeId);
    if (tradeResult.status === 'not_found') {
      return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    }
    if (tradeResult.status !== 'success') {
      return { status: 'error', message: 'Storage error.', data: null };
    }
    const trade = tradeResult.data!;

    if (payload.userId !== trade.requester_id && payload.userId !== trade.target_user_id) {
      return { status: 'unauthorized', message: 'User is not a participant of this trade.', data: null };
    }

    if (!CONFIRMABLE_STATUSES.includes(trade.status)) {
      return { status: 'invalid_trade_status', message: 'Trade is not in a confirmable state.', data: null };
    }

    // Step 3 — insert confirmation (idempotent: skip if already exists)
    const { data: existingConf } = await supabase
      .from('trade_confirmations')
      .select('id')
      .eq('trade_id', payload.tradeId)
      .eq('confirmed_by', payload.userId);

    if (!existingConf || existingConf.length === 0) {
      const { error: insertError } = await supabase.from('trade_confirmations').insert({
        trade_id: payload.tradeId,
        confirmed_by: payload.userId,
      });
      if (insertError) {
        return { status: 'error', message: insertError.message, data: null };
      }
    }

    // Step 4 — Atomically advance the trade status.
    //
    // Problem with reading trade.status up-front and deriving newStatus from it:
    // if User B's getTradeById call returns 'in_progress' because User A's update
    // hadn't committed yet (timing window), newStatus would be computed as
    // 'awaiting_confirmation' instead of 'completed', leaving the trade stuck.
    //
    // Fix: two atomic conditional UPDATEs, no pre-read status dependency.
    //   1. Try awaiting_confirmation → completed (succeeds only if the other
    //      party already confirmed and the trade is at awaiting_confirmation).
    //   2. If that UPDATE touches 0 rows, fall back to in_progress →
    //      awaiting_confirmation (this is the first confirmation).
    //
    // Idempotent case: if this user already confirmed, skip both UPDATEs and
    // return the current trade status unchanged.

    const userAlreadyConfirmed = !!(existingConf && existingConf.length > 0);
    let newStatus: string;

    if (userAlreadyConfirmed) {
      // Idempotent repeat — do not touch the trade status.
      newStatus = trade.status;
    } else {
      // New confirmation from this user.  Attempt the completion upgrade first:
      // if the other party has already confirmed (trade is awaiting_confirmation),
      // this UPDATE transitions atomically to completed in a single round-trip.
      const { data: completedRows, error: completeError } = await supabase
        .from('trades')
        .update({ status: 'completed' })
        .eq('trade_id', payload.tradeId)
        .eq('status', 'awaiting_confirmation')
        .select('trade_id');

      if (completeError) {
        return { status: 'error', message: completeError.message, data: null };
      }

      if (completedRows && completedRows.length > 0) {
        // The other party had already confirmed; trade is now completed.
        newStatus = 'completed';
      } else {
        // First confirmation — advance to awaiting_confirmation.
        // The .neq guard prevents downgrading an already-completed trade.
        const { error: updateError } = await supabase
          .from('trades')
          .update({ status: 'awaiting_confirmation' })
          .eq('trade_id', payload.tradeId)
          .neq('status', 'completed');
        if (updateError) {
          return { status: 'error', message: updateError.message, data: null };
        }
        newStatus = 'awaiting_confirmation';
      }
    }

    return {
      status: 'success',
      message: `Trade status updated to ${newStatus}.`,
      data: { newStatus },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── hasUserConfirmedTrade ────────────────────────────────────────────────────

/**
 * Returns true if the given user has already submitted a confirmation for the
 * given trade.  Queries only the current user's own rows, which is always
 * permitted regardless of RLS policy.
 */
export async function hasUserConfirmedTrade(tradeId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('trade_confirmations')
    .select('id')
    .eq('trade_id', tradeId)
    .eq('confirmed_by', userId);
  return !!(data && data.length > 0);
}
