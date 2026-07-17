/**
 * TypeScript port of engine.py:submit_review + storage_handler.py:save_review.
 *
 * Validation mirrors the Python engine exactly:
 *   Step 1 — required fields: reviewerId, reviewedUserId, tradeId, overallRating, skillAccuracyRating
 *   Step 2 — both ratings 1-5 integers, trade is completed, reviewer is participant
 *   Step 3 — duplicate check, then INSERT
 */
import { supabase } from '../lib/supabase';
import { ResponsePayload } from '../types';
import { getTradeById } from './tradeService';

function checkRequired(payload: object, required: string[]): string[] {
  const p = payload as Record<string, unknown>;
  return required.filter((f) => !p[f] && p[f] !== 0);
}

// ─── submitReview ─────────────────────────────────────────────────────────────

export interface SubmitReviewPayload {
  reviewerId: string;
  reviewedUserId: string;
  tradeId: string;
  overallRating: number;
  skillAccuracyRating: number;
  comment?: string;
}

export async function submitReview(
  payload: SubmitReviewPayload
): Promise<ResponsePayload<{ id: string }>> {
  try {
    // Step 1 — required fields
    const missing = checkRequired(payload, [
      'reviewerId', 'reviewedUserId', 'tradeId', 'overallRating', 'skillAccuracyRating',
    ]);
    if (missing.length) {
      return { status: 'incomplete', message: 'Missing required fields.', missing };
    }

    // Step 2 — validate ratings
    const { overallRating, skillAccuracyRating } = payload;
    if (
      !Number.isInteger(overallRating) || overallRating < 1 || overallRating > 5 ||
      !Number.isInteger(skillAccuracyRating) || skillAccuracyRating < 1 || skillAccuracyRating > 5
    ) {
      return {
        status: 'invalid_rating',
        message: 'Ratings must be integers between 1 and 5.',
        data: null,
      };
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

    if (trade.status !== 'completed') {
      return {
        status: 'trade_not_complete',
        message: 'Reviews can only be submitted after trade is completed.',
        data: null,
      };
    }

    if (payload.reviewerId !== trade.requester_id && payload.reviewerId !== trade.target_user_id) {
      return { status: 'unauthorized', message: 'Reviewer is not a participant of this trade.', data: null };
    }

    const otherParticipant =
      payload.reviewerId === trade.requester_id ? trade.target_user_id : trade.requester_id;
    if (payload.reviewedUserId !== otherParticipant) {
      return { status: 'unauthorized', message: 'Reviewed user must be the other trade participant.', data: null };
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('reviewer_id', payload.reviewerId)
      .eq('trade_id', payload.tradeId);

    if (existing && existing.length > 0) {
      return { status: 'review_exists', message: 'You have already reviewed this trade.', data: null };
    }

    // Step 3 — INSERT
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: payload.reviewerId,
        reviewed_user_id: payload.reviewedUserId,
        trade_id: payload.tradeId,
        overall_rating: overallRating,
        skill_accuracy_rating: skillAccuracyRating,
        comment: payload.comment ?? '',
      })
      .select('review_id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    }

    return { status: 'success', message: 'Review submitted.', data: { id: data.review_id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── getReviewsForUser ────────────────────────────────────────────────────────

export async function getReviewsForUser(reviewedUserId: string) {
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewed_user_id', reviewedUserId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
