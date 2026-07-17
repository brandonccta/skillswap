// ─── Domain models (match Supabase column names exactly) ────────────────────

export interface Skill {
  skill_id: string;
  user_id: string;
  skill_name: string;
  proficiency: number; // 1-5
  tags: string; // comma-separated
  portfolio_description: string | null;
  media_url: string | null;
  is_seeking: boolean; // true = wants to learn, false = can teach
  created_at: string;
}

export type TradeStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'completed'
  | 'declined';

// Statuses that block a new duplicate trade from being created for the same skill pair.
// NOTE: 'accepted' is omitted — the accept_trade handler skips it and writes 'in_progress'
// directly, so a trade never actually reaches 'accepted'.
export const ACTIVE_TRADE_STATUSES: TradeStatus[] = [
  'pending',
  'in_progress',
  'awaiting_confirmation',
];

export const MESSAGEABLE_TRADE_STATUSES: TradeStatus[] = [
  'in_progress',
  'awaiting_confirmation',
];

export interface Trade {
  trade_id: string;
  requester_id: string;
  offered_skill_id: string;
  target_user_id: string;
  desired_skill_id: string;
  status: TradeStatus;
  created_at: string;
}

export interface Message {
  message_id: string;
  sender_id: string;
  trade_id: string;
  content: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  created_at: string;
}

export interface Review {
  review_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  trade_id: string;
  overall_rating: number; // 1-5
  skill_accuracy_rating: number; // 1-5
  comment: string | null;
  created_at: string;
}

// ─── Standardised response shape (mirrors Python engine return contracts) ────

export type SuccessPayload<T = unknown> = {
  status: 'success';
  message?: string;
  data: T;
};

export type IncompletePayload = {
  status: 'incomplete';
  message: string;
  missing: string[];
};

export type ErrorPayload = {
  status: string; // e.g. 'duplicate_skill', 'unauthorized', 'error', …
  message: string;
  data: null;
};

export type ResponsePayload<T = unknown> =
  | SuccessPayload<T>
  | IncompletePayload
  | ErrorPayload;
