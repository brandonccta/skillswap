/**
 * TypeScript port of engine.py:create_skill + storage_handler.py:save_skill/get_skill.
 *
 * Validation mirrors the Python engine exactly:
 *   Step 1 — required fields: userId, skillName, proficiency, tags
 *   Step 2 — business rules: proficiency 1-5, name ≤100 chars, normalise tags
 *   Step 3 — duplicate check (.ilike), then INSERT
 */
import { supabase } from '../lib/supabase';
import { Skill, ResponsePayload } from '../types';

const REQUIRED = ['userId', 'skillName', 'proficiency', 'tags'] as const;

function checkRequired(payload: object, required: readonly string[]): string[] {
  const p = payload as Record<string, unknown>;
  return required.filter((f) => !p[f] && p[f] !== 0);
}

// ─── createSkill ────────────────────────────────────────────────────────────

export interface CreateSkillPayload {
  userId: string;
  skillName: string;
  proficiency: number;
  tags: string | string[];
  portfolioDescription?: string;
  mediaUrl?: string;
  isSeeking?: boolean;
}

export async function createSkill(
  payload: CreateSkillPayload
): Promise<ResponsePayload<{ skillId: string; skillName: string }>> {
  try {
    // Step 1 — required fields
    const missing = checkRequired(payload, REQUIRED);
    if (missing.length) {
      return { status: 'incomplete', message: 'Missing required fields.', missing };
    }

    // Step 2 — business rules
    const proficiency = payload.proficiency;
    if (!Number.isInteger(proficiency) || proficiency < 1 || proficiency > 5) {
      return {
        status: 'invalid_proficiency',
        message: 'Proficiency must be an integer between 1 and 5.',
        data: null,
      };
    }

    if (payload.skillName.length > 100) {
      return {
        status: 'validation_error',
        message: 'Skill name exceeds 100 character limit.',
        data: null,
      };
    }

    // Normalise tags
    const tagsArray = Array.isArray(payload.tags)
      ? payload.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [payload.tags.trim().toLowerCase()].filter(Boolean);

    if (tagsArray.length === 0) {
      return { status: 'incomplete', message: 'At least one valid tag is required.', missing: ['tags'] };
    }

    const tagsStr = tagsArray.join(',');

    // Step 3 — duplicate check
    const { data: existing } = await supabase
      .from('skills')
      .select('skill_id')
      .eq('user_id', payload.userId)
      .ilike('skill_name', payload.skillName);

    if (existing && existing.length > 0) {
      return {
        status: 'duplicate_skill',
        message: 'Skill name already exists for this user.',
        data: null,
      };
    }

    // INSERT
    const { data, error } = await supabase
      .from('skills')
      .insert({
        user_id: payload.userId,
        skill_name: payload.skillName,
        proficiency,
        tags: tagsStr,
        portfolio_description: payload.portfolioDescription ?? '',
        media_url: payload.mediaUrl ?? '',
        is_seeking: payload.isSeeking ?? false,
      })
      .select('skill_id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    }

    return {
      status: 'success',
      message: 'Skill created.',
      data: { skillId: data.skill_id, skillName: payload.skillName },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── getUserSkills ───────────────────────────────────────────────────────────

export async function getUserSkills(userId: string): Promise<Skill[]> {
  const { data } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as Skill[]) ?? [];
}

// ─── getSkillById ────────────────────────────────────────────────────────────

export async function getSkillById(
  skillId: string
): Promise<ResponsePayload<Skill>> {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('skill_id, user_id, skill_name, proficiency, tags, portfolio_description, media_url, is_seeking, created_at')
      .eq('skill_id', skillId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { status: 'not_found', message: 'Skill not found.', data: null };
      }
      return { status: 'error', message: error.message, data: null };
    }
    if (!data) {
      return { status: 'not_found', message: 'Skill not found.', data: null };
    }
    return { status: 'success', data: data as Skill };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}

// ─── getAllSkills (for Explore screen) ───────────────────────────────────────

export async function getAllSkills(tagFilter?: string): Promise<Skill[]> {
  let query = supabase
    .from('skills')
    .select('*')
    .order('created_at', { ascending: false });

  if (tagFilter && tagFilter.trim()) {
    // Strip LIKE metacharacters (% and _) to prevent pattern injection.
    const safe = tagFilter.trim().toLowerCase().replace(/[%_]/g, '');
    if (safe) {
      query = query.ilike('tags', `%${safe}%`);
    }
  }

  const { data } = await query;
  return (data as Skill[]) ?? [];
}
