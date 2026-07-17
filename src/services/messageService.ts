/**
 * TypeScript port of engine.py:send_message + storage_handler.py:save_message.
 *
 * Validation mirrors the Python engine exactly:
 *   Step 1 — required fields: senderId, tradeId, content
 *   Step 2 — non-empty content, trade must be active (accepted|in_progress), sender is participant
 *   Step 3 — INSERT
 */
import { supabase } from '../lib/supabase';
import { Message, ResponsePayload, MESSAGEABLE_TRADE_STATUSES } from '../types';
import { getTradeById } from './tradeService';

function checkRequired(payload: object, required: string[]): string[] {
  const p = payload as Record<string, unknown>;
  return required.filter((f) => !p[f] && p[f] !== 0);
}

// ─── sendMessage ─────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  senderId: string;
  tradeId: string;
  content: string;
}

export async function sendMessage(
  payload: SendMessagePayload
): Promise<ResponsePayload<{ id: string }>> {
  try {
    // Step 1 — required fields
    const missing = checkRequired(payload, ['senderId', 'tradeId', 'content']);
    if (missing.length) {
      return { status: 'incomplete', message: 'Missing required fields.', missing };
    }

    // Step 2 — non-empty content
    if (!payload.content.trim()) {
      return { status: 'empty_message', message: 'Message content cannot be empty.', data: null };
    }

    // Fetch and validate trade
    const tradeResult = await getTradeById(payload.tradeId);
    if (tradeResult.status === 'not_found') {
      return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    }
    if (tradeResult.status !== 'success') {
      return { status: 'error', message: 'Storage error.', data: null };
    }
    const trade = tradeResult.data!;

    if (!MESSAGEABLE_TRADE_STATUSES.includes(trade.status)) {
      return { status: 'trade_not_active', message: 'Trade is not in an active state.', data: null };
    }

    if (payload.senderId !== trade.requester_id && payload.senderId !== trade.target_user_id) {
      return { status: 'unauthorized', message: 'Sender is not a participant of this trade.', data: null };
    }

    // Step 3 — INSERT
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: payload.senderId,
        trade_id: payload.tradeId,
        content: payload.content,
        created_at: new Date().toISOString(),
      })
      .select('message_id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    }

    return { status: 'success', message: 'Message sent.', data: { id: data.message_id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── getMessages ──────────────────────────────────────────────────────────────

export async function getMessages(tradeId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: true });
  return (data as Message[]) ?? [];
}
