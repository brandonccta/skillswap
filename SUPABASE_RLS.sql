-- =============================================================================
-- Supabase Row Level Security policies for SkillSwap mobile app
--
-- Run this SQL in the Supabase SQL editor (Project > SQL Editor > New query).
--
-- IMPORTANT: The Python backend uses the service_role key which BYPASSES RLS.
-- These policies only apply to the React Native app which uses the anon key.
-- The existing Python test suite (pytest tests/ -v) is completely unaffected.
-- =============================================================================

-- Enable RLS on all tables (required before policies take effect)
ALTER TABLE skills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades               ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_confirmations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SKILLS
-- =============================================================================

-- Anyone authenticated can view all skills (needed for Explore screen)
CREATE POLICY "skills_select_all"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert skills for themselves
CREATE POLICY "skills_insert_own"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own skills
CREATE POLICY "skills_update_own"
  ON skills FOR UPDATE
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Users can delete their own skills
CREATE POLICY "skills_delete_own"
  ON skills FOR DELETE
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- =============================================================================
-- TRADES
-- =============================================================================

-- Users can only see trades they are a participant of
CREATE POLICY "trades_select_participant"
  ON trades FOR SELECT
  TO authenticated
  USING (
    requester_id::text = auth.uid()::text
    OR target_user_id::text = auth.uid()::text
  );

-- Any authenticated user can create a trade
CREATE POLICY "trades_insert_authenticated"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (requester_id::text = auth.uid()::text);

-- Trade participants can update trade status (accept/decline/confirm)
CREATE POLICY "trades_update_participant"
  ON trades FOR UPDATE
  TO authenticated
  USING (
    requester_id::text = auth.uid()::text
    OR target_user_id::text = auth.uid()::text
  );

-- =============================================================================
-- MESSAGES
-- =============================================================================

-- Users can only read messages for trades they participate in
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  TO authenticated
  USING (
    trade_id IN (
      SELECT trade_id FROM trades
      WHERE requester_id::text = auth.uid()::text
         OR target_user_id::text = auth.uid()::text
    )
  );

-- Users can only send messages as themselves
CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id::text = auth.uid()::text);

-- =============================================================================
-- TRADE CONFIRMATIONS
-- =============================================================================

-- Users can only read their own confirmations
CREATE POLICY "confirmations_select_own"
  ON trade_confirmations FOR SELECT
  TO authenticated
  USING (confirmed_by::text = auth.uid()::text);

-- Users can only confirm as themselves
CREATE POLICY "confirmations_insert_own"
  ON trade_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (confirmed_by::text = auth.uid()::text);

-- =============================================================================
-- REVIEWS
-- =============================================================================

-- Anyone authenticated can read reviews (shown on user profiles)
CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- Users can only submit reviews as themselves
CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id::text = auth.uid()::text);
