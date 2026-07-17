import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data ?? null;
}

export async function getProfiles(userIds: string[]): Promise<Record<string, Profile>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const map: Record<string, Profile> = {};
  for (const p of data ?? []) {
    map[p.id] = p;
  }
  return map;
}

export async function upsertProfile(
  userId: string,
  fields: { display_name?: string; bio?: string; avatar_url?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' });
  return { error: error?.message ?? null };
}
