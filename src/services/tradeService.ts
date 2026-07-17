/**
 * TypeScript port of engine.py:submit_trade + storage_handler.py:save_trade/get_trade.
 *
 * Validation mirrors the Python engine exactly:
 *   Step 1 — required fields: requesterId, offeredSkillId, targetUserId, desiredSkillId
 *   Step 2 — no self-trade, verify skill ownership, no active duplicate
 *   Step 3 — INSERT with status 'pending'
 */
import { supabase } from '../lib/supabase';
import { Trade, ResponsePayload, ACTIVE_TRADE_STATUSES } from '../types';
import { getSkillById } from './skillService';

function checkRequired(payload: object, required: string[]): string[] {
  const p = payload as Record<string, unknown>;
  return required.filter((f) => !p[f] && p[f] !== 0);
}

// ─── submitTrade ─────────────────────────────────────────────────────────────

export interface SubmitTradePayload {
  requesterId: string;
  offeredSkillId: string;
  targetUserId: string;
  desiredSkillId: string;
}

export async function submitTrade(
  payload: SubmitTradePayload
): Promise<ResponsePayload<{ tradeId: string; status: string }>> {
  try {
    // Step 1 — required fields
    const missing = checkRequired(payload, [
      'requesterId', 'offeredSkillId', 'targetUserId', 'desiredSkillId',
    ]);
    if (missing.length) {
      return { status: 'incomplete', message: 'Missing required fields.', missing };
    }

    // Step 2 — no self-trade
    if (payload.requesterId === payload.targetUserId) {
      return { status: 'invalid_trade_self', message: 'Cannot trade with yourself.', data: null };
    }

    // Verify offered skill exists and belongs to requester
    const offeredResult = await getSkillById(payload.offeredSkillId);
    if (offeredResult.status === 'not_found') {
      return { status: 'skill_not_found', message: 'Offered skill does not exist.', data: null };
    }
    if (offeredResult.status !== 'success' || offeredResult.data!.user_id !== payload.requesterId) {
      return { status: 'unauthorized_skill', message: 'Offered skill does not belong to requester.', data: null };
    }

    // Verify desired skill exists and belongs to target
    const desiredResult = await getSkillById(payload.desiredSkillId);
    if (desiredResult.status === 'not_found') {
      return { status: 'skill_not_found', message: 'Desired skill does not exist.', data: null };
    }
    if (desiredResult.status !== 'success' || desiredResult.data!.user_id !== payload.targetUserId) {
      return { status: 'invalid_target_skill', message: 'Desired skill does not belong to target user.', data: null };
    }

    // Check for active duplicate trade
    const { data: existing } = await supabase
      .from('trades')
      .select('trade_id')
      .eq('requester_id', payload.requesterId)
      .eq('offered_skill_id', payload.offeredSkillId)
      .eq('target_user_id', payload.targetUserId)
      .eq('desired_skill_id', payload.desiredSkillId)
      .in('status', ACTIVE_TRADE_STATUSES);

    if (existing && existing.length > 0) {
      return {
        status: 'duplicate_trade',
        message: 'An active trade already exists for this skill pair.',
        data: null,
      };
    }

    // Step 3 — INSERT
    const { data, error } = await supabase
      .from('trades')
      .insert({
        requester_id: payload.requesterId,
        offered_skill_id: payload.offeredSkillId,
        target_user_id: payload.targetUserId,
        desired_skill_id: payload.desiredSkillId,
        status: 'pending',
      })
      .select('trade_id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    }

    return {
      status: 'success',
      message: 'Trade submitted.',
      data: { tradeId: data.trade_id, status: 'pending' },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── getTrades ───────────────────────────────────────────────────────────────

export async function getTrades(userId: string): Promise<Trade[]> {
  const { data } = await supabase
    .from('trades')
    .select('*')
    .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return (data as Trade[]) ?? [];
}

// ─── getTradeById ─────────────────────────────────────────────────────────────

export async function getTradeById(
  tradeId: string
): Promise<ResponsePayload<Trade>> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('trade_id, requester_id, offered_skill_id, target_user_id, desired_skill_id, status, created_at')
      .eq('trade_id', tradeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { status: 'not_found', message: 'Trade not found.', data: null };
      }
      return { status: 'error', message: error.message, data: null };
    }
    if (!data) {
      return { status: 'not_found', message: 'Trade not found.', data: null };
    }
    return { status: 'success', data: data as Trade };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── acceptTrade ──────────────────────────────────────────────────────────────
// Mirrors engine.py:accept_trade — only the target user may accept a pending trade.

export async function acceptTrade(
  tradeId: string,
  userId: string
): Promise<ResponsePayload<{ tradeId: string }>> {
  try {
    const tradeResult = await getTradeById(tradeId);
    if (tradeResult.status === 'not_found') {
      return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    }
    if (tradeResult.status !== 'success') {
      return { status: 'error', message: 'Storage error.', data: null };
    }
    const trade = tradeResult.data!;

    if (userId !== trade.target_user_id) {
      return { status: 'unauthorized', message: 'Only the trade recipient can accept.', data: null };
    }
    if (trade.status !== 'pending') {
      return { status: 'invalid_trade_status', message: 'Trade is not in a pending state.', data: null };
    }

    const { error, count } = await supabase
      .from('trades')
      .update({ status: 'in_progress' })
      .eq('trade_id', tradeId)
      .eq('status', 'pending');  // Atomic guard: only update if still pending.

    if (error) {
      return { status: 'error', message: error.message, data: null };
    }
    if (count === 0) {
      return { status: 'invalid_trade_status', message: 'Trade is not in a pending state.', data: null };
    }
    return { status: 'success', message: 'Trade accepted.', data: { tradeId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── declineTrade ─────────────────────────────────────────────────────────────
// Mirrors engine.py:decline_trade — only the target user may decline a pending trade.

export async function declineTrade(
  tradeId: string,
  userId: string
): Promise<ResponsePayload<{ tradeId: string }>> {
  try {
    const tradeResult = await getTradeById(tradeId);
    if (tradeResult.status === 'not_found') {
      return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    }
    if (tradeResult.status !== 'success') {
      return { status: 'error', message: 'Storage error.', data: null };
    }
    const trade = tradeResult.data!;

    if (userId !== trade.target_user_id) {
      return { status: 'unauthorized', message: 'Only the trade recipient can decline.', data: null };
    }
    if (trade.status !== 'pending') {
      return { status: 'invalid_trade_status', message: 'Trade is not in a pending state.', data: null };
    }

    const { error, count } = await supabase
      .from('trades')
      .update({ status: 'declined' })
      .eq('trade_id', tradeId)
      .eq('status', 'pending');  // Atomic guard: only update if still pending.

    if (error) {
      return { status: 'error', message: error.message, data: null };
    }
    if (count === 0) {
      return { status: 'invalid_trade_status', message: 'Trade is not in a pending state.', data: null };
    }
    return { status: 'success', message: 'Trade declined.', data: { tradeId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}
