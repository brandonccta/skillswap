-- =============================================================================
-- Profiles table setup for SkillSwap mobile app
--
-- Run this SQL in the Supabase SQL editor (Project > SQL Editor > New query).
-- Run SUPABASE_RLS.sql first if you haven't already.
-- =============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL DEFAULT '',
  avatar_url   TEXT        DEFAULT '',
  bio          TEXT        DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (needed for trade screens, explore)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only create their own profile row
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id::text = auth.uid()::text);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text);

-- =============================================================================
-- Auto-create a profile row when a new user signs up
-- Copies full_name from Google OAuth metadata if present
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- Backfill: create profile rows for existing users who signed up before
-- this trigger was added. Safe to run multiple times (ON CONFLICT DO NOTHING).
-- =============================================================================
INSERT INTO public.profiles (id, display_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
