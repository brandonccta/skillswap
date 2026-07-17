/**
 * TypeScript Node.js Integration Test — SkillSwap Mobile Services
 * ================================================================
 *
 * Mirrors integration_test_3users.py exactly, but exercises the TypeScript
 * service-layer business logic against the live Supabase database.
 *
 * Uses a standalone Supabase client (no expo/React Native dependencies) so
 * the test runs in plain Node via:
 *
 *   npx tsx mobile/__tests__/integration_test_mobile.ts      (from project root)
 *
 * Credentials are loaded from the root .env file (two levels up).
 * The service role key is used so RLS is bypassed in cleanup, matching the
 * behaviour of conftest.py and integration_test_3users.py.
 *
 * Test users are namespaced separately from the Python integration test:
 *   ALICE   = "ts_int_alice"
 *   BOB     = "ts_int_bob"
 *   CHARLIE = "ts_int_charlie"
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Load .env from the project root (one level above mobile/)
// ---------------------------------------------------------------------------
function loadDotEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv(path.resolve(__dirname, '..', '..', '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[FATAL] SUPABASE_URL and SUPABASE_KEY must be set in ../.env');
  process.exit(1);
}

const db: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Test user IDs (different namespace from Python test)
// ---------------------------------------------------------------------------
const ALICE   = 'ts_int_alice';
const BOB     = 'ts_int_bob';
const CHARLIE = 'ts_int_charlie';

// ---------------------------------------------------------------------------
// Constants mirroring types/index.ts
// ---------------------------------------------------------------------------
const ACTIVE_TRADE_STATUSES     = ['pending', 'accepted', 'in_progress'];
const MESSAGEABLE_TRADE_STATUSES = ['accepted', 'in_progress', 'awaiting_confirmation'];
const CONFIRMABLE_STATUSES       = ['in_progress', 'awaiting_confirmation'];

// ---------------------------------------------------------------------------
// Test result tracking
// ---------------------------------------------------------------------------
let PASS = 0;
let FAIL = 0;
const BUGS: string[] = [];

type Result = Record<string, unknown>;

function check(label: string, result: Result, expectedStatus: string, extraChecks: [string, boolean][] = []): Result {
  const actual = result['status'] as string;
  let ok = actual === expectedStatus;
  if (ok && extraChecks.length) {
    for (const [desc, val] of extraChecks) {
      if (!val) {
        ok = false;
        console.log(`  [EXTRA FAIL] ${desc}`);
      }
    }
  }
  if (ok) {
    PASS++;
    console.log(`  [PASS] ${label}`);
  } else {
    FAIL++;
    const msg = `  [FAIL] ${label} — expected '${expectedStatus}', got '${actual}' | full=${JSON.stringify(result)}`;
    console.log(msg);
    BUGS.push(msg);
  }
  return result;
}

function ts(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
async function cleanup(): Promise<void> {
  console.log('\n[CLEANUP] Removing TypeScript integration test data...');
  try {
    for (const uid of [ALICE, BOB, CHARLIE]) {
      await db.from('reviews').delete().eq('reviewer_id', uid);
      await db.from('reviews').delete().eq('reviewed_user_id', uid);
      await db.from('messages').delete().eq('sender_id', uid);

      const { data: asReq } = await db.from('trades').select('trade_id').eq('requester_id', uid);
      const { data: asTgt } = await db.from('trades').select('trade_id').eq('target_user_id', uid);
      const allIds = [...(asReq ?? []), ...(asTgt ?? [])].map((r) => r.trade_id);
      for (const tid of allIds) {
        await db.from('trade_confirmations').delete().eq('trade_id', tid);
      }
      await db.from('trades').delete().eq('requester_id', uid);
      await db.from('trades').delete().eq('target_user_id', uid);
      await db.from('skills').delete().eq('user_id', uid);
    }
    console.log('[CLEANUP] Done.');
  } catch (e) {
    console.log(`[CLEANUP] Warning: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// Service functions — mirrors TypeScript service files exactly.
// Uses the module-level `db` client instead of the expo supabase client.
// ---------------------------------------------------------------------------

function checkRequired(payload: Record<string, unknown>, required: string[]): string[] {
  return required.filter((f) => !payload[f] && payload[f] !== 0);
}

async function createSkill(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['userId', 'skillName', 'proficiency', 'tags']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    const proficiency = payload['proficiency'] as number;
    if (!Number.isInteger(proficiency) || proficiency < 1 || proficiency > 5)
      return { status: 'invalid_proficiency', message: 'Proficiency must be an integer between 1 and 5.', data: null };

    if ((payload['skillName'] as string).length > 100)
      return { status: 'validation_error', message: 'Skill name exceeds 100 character limit.', data: null };

    const rawTags = payload['tags'];
    const tagsArray = Array.isArray(rawTags)
      ? (rawTags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [(rawTags as string).trim().toLowerCase()].filter(Boolean);
    const tagsStr = tagsArray.join(',');

    const { data: existing } = await db
      .from('skills').select('skill_id')
      .eq('user_id', payload['userId'])
      .ilike('skill_name', payload['skillName'] as string);
    if (existing && existing.length > 0)
      return { status: 'duplicate_skill', message: 'Skill name already exists for this user.', data: null };

    const { data, error } = await db.from('skills').insert({
      user_id: payload['userId'],
      skill_name: payload['skillName'],
      proficiency,
      tags: tagsStr,
      portfolio_description: (payload['portfolioDescription'] as string) ?? '',
      media_url: (payload['mediaUrl'] as string) ?? '',
    }).select('skill_id').single();

    if (error || !data) return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    return { status: 'success', message: 'Skill created.', data: { skillId: data.skill_id, skillName: payload['skillName'] } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function getSkillById(skillId: string): Promise<Result> {
  const { data, error } = await db.from('skills')
    .select('skill_id, user_id, skill_name, proficiency, tags, portfolio_description, media_url, created_at')
    .eq('skill_id', skillId).single();
  if (error || !data) return { status: 'not_found', message: 'Skill not found.', data: null };
  return { status: 'success', data };
}

async function getTradeById(tradeId: string): Promise<Result> {
  const { data, error } = await db.from('trades')
    .select('trade_id, requester_id, offered_skill_id, target_user_id, desired_skill_id, status, created_at')
    .eq('trade_id', tradeId).single();
  if (error || !data) return { status: 'not_found', message: 'Trade not found.', data: null };
  return { status: 'success', data };
}

async function submitTrade(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['requesterId', 'offeredSkillId', 'targetUserId', 'desiredSkillId']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    if (payload['requesterId'] === payload['targetUserId'])
      return { status: 'invalid_trade_self', message: 'Cannot trade with yourself.', data: null };

    const offered = await getSkillById(payload['offeredSkillId'] as string);
    if (offered.status === 'not_found') return { status: 'skill_not_found', message: 'Offered skill does not exist.', data: null };
    if (offered.status !== 'success' || (offered.data as Record<string, unknown>)['user_id'] !== payload['requesterId'])
      return { status: 'unauthorized_skill', message: 'Offered skill does not belong to requester.', data: null };

    const desired = await getSkillById(payload['desiredSkillId'] as string);
    if (desired.status === 'not_found') return { status: 'skill_not_found', message: 'Desired skill does not exist.', data: null };
    if (desired.status !== 'success' || (desired.data as Record<string, unknown>)['user_id'] !== payload['targetUserId'])
      return { status: 'invalid_target_skill', message: 'Desired skill does not belong to target user.', data: null };

    const { data: existing } = await db.from('trades').select('trade_id')
      .eq('requester_id', payload['requesterId'])
      .eq('offered_skill_id', payload['offeredSkillId'])
      .eq('target_user_id', payload['targetUserId'])
      .eq('desired_skill_id', payload['desiredSkillId'])
      .in('status', ACTIVE_TRADE_STATUSES);
    if (existing && existing.length > 0)
      return { status: 'duplicate_trade', message: 'An active trade already exists for this skill pair.', data: null };

    const { data, error } = await db.from('trades').insert({
      requester_id: payload['requesterId'],
      offered_skill_id: payload['offeredSkillId'],
      target_user_id: payload['targetUserId'],
      desired_skill_id: payload['desiredSkillId'],
      status: 'pending',
    }).select('trade_id').single();

    if (error || !data) return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    return { status: 'success', message: 'Trade submitted.', data: { tradeId: data.trade_id, status: 'pending' } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function listTrades(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['userId']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };
    const userId = payload['userId'] as string;
    const { data } = await db.from('trades').select('*')
      .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    return { status: 'success', message: 'Trades retrieved.', data: { trades: data ?? [] } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function acceptTrade(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['tradeId', 'userId']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    const tradeResult = await getTradeById(payload['tradeId'] as string);
    if (tradeResult.status === 'not_found') return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    if (tradeResult.status !== 'success') return { status: 'error', message: 'Storage error.', data: null };
    const trade = tradeResult.data as Record<string, unknown>;

    if (payload['userId'] !== trade['target_user_id'])
      return { status: 'unauthorized', message: 'Only the trade recipient can accept.', data: null };
    if (trade['status'] !== 'pending')
      return { status: 'invalid_trade_status', message: 'Trade is not in a pending state.', data: null };

    const { error } = await db.from('trades').update({ status: 'in_progress' }).eq('trade_id', payload['tradeId']);
    if (error) return { status: 'error', message: error.message, data: null };
    return { status: 'success', message: 'Trade accepted.', data: { tradeId: payload['tradeId'] } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function declineTrade(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['tradeId', 'userId']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    const tradeResult = await getTradeById(payload['tradeId'] as string);
    if (tradeResult.status === 'not_found') return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    if (tradeResult.status !== 'success') return { status: 'error', message: 'Storage error.', data: null };
    const trade = tradeResult.data as Record<string, unknown>;

    if (payload['userId'] !== trade['target_user_id'])
      return { status: 'unauthorized', message: 'Only the trade recipient can decline.', data: null };
    if (trade['status'] !== 'pending')
      return { status: 'invalid_trade_status', message: 'Trade is not in a pending state.', data: null };

    const { error } = await db.from('trades').update({ status: 'declined' }).eq('trade_id', payload['tradeId']);
    if (error) return { status: 'error', message: error.message, data: null };
    return { status: 'success', message: 'Trade declined.', data: { tradeId: payload['tradeId'] } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function sendMessage(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['senderId', 'tradeId', 'content']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    if (!(payload['content'] as string).trim())
      return { status: 'empty_message', message: 'Message content cannot be empty.', data: null };

    const tradeResult = await getTradeById(payload['tradeId'] as string);
    if (tradeResult.status === 'not_found') return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    if (tradeResult.status !== 'success') return { status: 'error', message: 'Storage error.', data: null };
    const trade = tradeResult.data as Record<string, unknown>;

    if (!MESSAGEABLE_TRADE_STATUSES.includes(trade['status'] as string))
      return { status: 'trade_not_active', message: 'Trade is not in an active state.', data: null };
    if (payload['senderId'] !== trade['requester_id'] && payload['senderId'] !== trade['target_user_id'])
      return { status: 'unauthorized', message: 'Sender is not a participant of this trade.', data: null };

    const { data, error } = await db.from('messages').insert({
      sender_id: payload['senderId'],
      trade_id:  payload['tradeId'],
      content:   payload['content'],
      created_at: new Date().toISOString(),
    }).select('message_id').single();

    if (error || !data) return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    return { status: 'success', message: 'Message sent.', data: { id: data.message_id } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function confirmTrade(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['tradeId', 'userId']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    const tradeResult = await getTradeById(payload['tradeId'] as string);
    if (tradeResult.status === 'not_found') return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    if (tradeResult.status !== 'success') return { status: 'error', message: 'Storage error.', data: null };
    const trade = tradeResult.data as Record<string, unknown>;

    if (payload['userId'] !== trade['requester_id'] && payload['userId'] !== trade['target_user_id'])
      return { status: 'unauthorized', message: 'User is not a participant of this trade.', data: null };
    if (!CONFIRMABLE_STATUSES.includes(trade['status'] as string))
      return { status: 'invalid_trade_status', message: 'Trade is not in a confirmable state.', data: null };

    const { data: existingConf } = await db.from('trade_confirmations').select('id')
      .eq('trade_id', payload['tradeId']).eq('confirmed_by', payload['userId']);
    if (!existingConf || existingConf.length === 0) {
      await db.from('trade_confirmations').insert({ trade_id: payload['tradeId'], confirmed_by: payload['userId'] });
    }

    const { data: confRows } = await db.from('trade_confirmations').select('confirmed_by').eq('trade_id', payload['tradeId']);
    const newStatus = (confRows?.length ?? 0) >= 2 ? 'completed' : 'awaiting_confirmation';

    const { error } = await db.from('trades').update({ status: newStatus }).eq('trade_id', payload['tradeId']);
    if (error) return { status: 'error', message: error.message, data: null };
    return { status: 'success', message: `Trade status updated to ${newStatus}.`, data: { newStatus } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}

async function submitReview(payload: Record<string, unknown>): Promise<Result> {
  try {
    const missing = checkRequired(payload, ['reviewerId', 'reviewedUserId', 'tradeId', 'overallRating', 'skillAccuracyRating']);
    if (missing.length) return { status: 'incomplete', message: 'Missing required fields.', missing };

    const overall   = payload['overallRating'] as number;
    const accuracy  = payload['skillAccuracyRating'] as number;
    if (!Number.isInteger(overall) || overall < 1 || overall > 5 ||
        !Number.isInteger(accuracy) || accuracy < 1 || accuracy > 5)
      return { status: 'invalid_rating', message: 'Ratings must be integers between 1 and 5.', data: null };

    const tradeResult = await getTradeById(payload['tradeId'] as string);
    if (tradeResult.status === 'not_found') return { status: 'trade_not_found', message: 'Trade does not exist.', data: null };
    if (tradeResult.status !== 'success') return { status: 'error', message: 'Storage error.', data: null };
    const trade = tradeResult.data as Record<string, unknown>;

    if (trade['status'] !== 'completed')
      return { status: 'trade_not_complete', message: 'Reviews can only be submitted after trade is completed.', data: null };
    if (payload['reviewerId'] !== trade['requester_id'] && payload['reviewerId'] !== trade['target_user_id'])
      return { status: 'unauthorized', message: 'Reviewer is not a participant of this trade.', data: null };

    const { data: existing } = await db.from('reviews').select('review_id')
      .eq('reviewer_id', payload['reviewerId']).eq('trade_id', payload['tradeId']);
    if (existing && existing.length > 0)
      return { status: 'review_exists', message: 'You have already reviewed this trade.', data: null };

    const { data, error } = await db.from('reviews').insert({
      reviewer_id:           payload['reviewerId'],
      reviewed_user_id:      payload['reviewedUserId'],
      trade_id:              payload['tradeId'],
      overall_rating:        overall,
      skill_accuracy_rating: accuracy,
      comment:               (payload['comment'] as string) ?? '',
    }).select('review_id').single();

    if (error || !data) return { status: 'error', message: error?.message ?? 'Storage error.', data: null };
    return { status: 'success', message: 'Review submitted.', data: { id: data.review_id } };
  } catch (e) {
    return { status: 'error', message: String(e), data: null };
  }
}


// ===========================================================================
// MAIN TEST RUN
// ===========================================================================
async function main(): Promise<void> {

  // =========================================================================
  // PHASE 0: Pre-test cleanup
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 0: Pre-test cleanup');
  console.log('='.repeat(70));
  await cleanup();

  // =========================================================================
  // PHASE 1: Skill Profile Creation
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: Skill Profile Creation');
  console.log('='.repeat(70));

  let r = await createSkill({ userId: ALICE, skillName: 'Python Programming', proficiency: 5,
    tags: ['python', 'backend', 'automation'], portfolioDescription: '8 years Python dev.' });
  check('1a. Alice creates Python Programming', r, 'success',
    [['skillId present', !!(r.data as Record<string,unknown>)?.['skillId']]]);
  const alicePythonSkillId = (r.data as Record<string,unknown>)?.['skillId'] as string;

  r = await createSkill({ userId: ALICE, skillName: 'Data Science', proficiency: 3, tags: ['pandas', 'numpy', 'ml'] });
  check('1b. Alice creates Data Science', r, 'success');
  const aliceDataSciSkillId = (r.data as Record<string,unknown>)?.['skillId'] as string;

  r = await createSkill({ userId: ALICE, skillName: 'Python Programming', proficiency: 4, tags: ['python'] });
  check('1c. Alice duplicate skill blocked', r, 'duplicate_skill');

  r = await createSkill({ userId: ALICE, skillName: 'PYTHON PROGRAMMING', proficiency: 4, tags: ['python'] });
  check('1d. Alice duplicate skill blocked (case-insensitive)', r, 'duplicate_skill');

  r = await createSkill({ userId: BOB, skillName: 'UI/UX Design', proficiency: 4,
    tags: ['figma', 'ux', 'design'], portfolioDescription: 'Designed products for 1M+ users.' });
  check('1e. Bob creates UI/UX Design', r, 'success');
  const bobDesignSkillId = (r.data as Record<string,unknown>)?.['skillId'] as string;

  r = await createSkill({ userId: BOB, skillName: 'Web Development', proficiency: 3, tags: ['react', 'html', 'css'] });
  check('1f. Bob creates Web Development', r, 'success');
  const bobWebDevSkillId = (r.data as Record<string,unknown>)?.['skillId'] as string;

  r = await createSkill({ userId: CHARLIE, skillName: 'Music Production', proficiency: 4,
    tags: ['ableton', 'mixing', 'mastering'], portfolioDescription: 'Produced tracks for 50+ artists.' });
  check('1g. Charlie creates Music Production', r, 'success');
  const charlieMusicSkillId = (r.data as Record<string,unknown>)?.['skillId'] as string;

  r = await createSkill({ userId: CHARLIE, skillName: 'Cooking', proficiency: 6, tags: ['food'] });
  check('1h. Invalid proficiency (6) blocked', r, 'invalid_proficiency');

  r = await createSkill({ userId: CHARLIE, skillName: 'Cooking', tags: ['food'] } as Record<string,unknown>);
  check('1i. Missing proficiency field blocked', r, 'incomplete');

  r = await createSkill({ userId: CHARLIE, skillName: 'Sound Engineering', proficiency: 3,
    tags: ['  Pro Tools  ', 'LIVE Sound', 'Studio'] });
  check('1j. Charlie creates Sound Engineering (tags normalized)', r, 'success');
  const charlieSoundSkillId = (r.data as Record<string,unknown>)?.['skillId'] as string;

  // =========================================================================
  // PHASE 2: Trade Request Submission
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: Trade Request Submission');
  console.log('='.repeat(70));

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: alicePythonSkillId,
    targetUserId: ALICE, desiredSkillId: aliceDataSciSkillId });
  check('2a. Alice self-trade blocked', r, 'invalid_trade_self');

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: alicePythonSkillId,
    targetUserId: BOB, desiredSkillId: bobDesignSkillId });
  check('2b. Alice->Bob trade submitted (Python<->Design)', r, 'success',
    [['tradeId present', !!(r.data as Record<string,unknown>)?.['tradeId']],
     ['status is pending', (r.data as Record<string,unknown>)?.['status'] === 'pending']]);
  const aliceBobTradeId = (r.data as Record<string,unknown>)?.['tradeId'] as string;

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: alicePythonSkillId,
    targetUserId: BOB, desiredSkillId: bobDesignSkillId });
  check('2c. Alice->Bob duplicate trade blocked', r, 'duplicate_trade');

  r = await submitTrade({ requesterId: CHARLIE, offeredSkillId: charlieMusicSkillId,
    targetUserId: ALICE, desiredSkillId: aliceDataSciSkillId });
  check('2d. Charlie->Alice trade submitted (Music<->DataSci)', r, 'success');
  const charlieAliceTradeId = (r.data as Record<string,unknown>)?.['tradeId'] as string;

  r = await submitTrade({ requesterId: CHARLIE, offeredSkillId: charlieMusicSkillId,
    targetUserId: BOB, desiredSkillId: bobWebDevSkillId });
  check('2e. Charlie->Bob trade submitted (Music<->WebDev)', r, 'success');
  const charlieBobTradeId = (r.data as Record<string,unknown>)?.['tradeId'] as string;

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: '00000000-0000-0000-0000-000000000001',
    targetUserId: BOB, desiredSkillId: bobDesignSkillId });
  check('2f. Trade with non-existent offered skill blocked', r, 'skill_not_found');

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: bobDesignSkillId,
    targetUserId: CHARLIE, desiredSkillId: charlieMusicSkillId });
  check('2g. Unauthorized offered skill blocked', r, 'unauthorized_skill');

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: alicePythonSkillId,
    targetUserId: BOB, desiredSkillId: charlieMusicSkillId });
  check('2h. Desired skill not belonging to target blocked', r, 'invalid_target_skill');

  // =========================================================================
  // PHASE 3: List Trades
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3: List Trades');
  console.log('='.repeat(70));

  r = await listTrades({ userId: ALICE });
  check('3a. Alice list_trades success', r, 'success');
  const aliceTrades = ((r.data as Record<string,unknown>)?.['trades'] as Record<string,unknown>[]) ?? [];
  const aliceTradeIdSet = new Set(aliceTrades.map((t) => t['trade_id']));
  check('3b. Alice sees alice_bob_trade in list',
    { status: aliceTradeIdSet.has(aliceBobTradeId) ? 'success' : 'missing' }, 'success');
  check('3c. Alice sees charlie_alice_trade in list',
    { status: aliceTradeIdSet.has(charlieAliceTradeId) ? 'success' : 'missing' }, 'success');
  console.log(`       Alice has ${aliceTrades.length} trade(s) total`);

  r = await listTrades({ userId: BOB });
  check('3d. Bob list_trades success', r, 'success');
  const bobTrades = ((r.data as Record<string,unknown>)?.['trades'] as Record<string,unknown>[]) ?? [];
  const bobTradeIdSet = new Set(bobTrades.map((t) => t['trade_id']));
  check('3e. Bob sees alice_bob_trade in list',
    { status: bobTradeIdSet.has(aliceBobTradeId) ? 'success' : 'missing' }, 'success');
  check('3f. Bob sees charlie_bob_trade in list',
    { status: bobTradeIdSet.has(charlieBobTradeId) ? 'success' : 'missing' }, 'success');

  r = await listTrades({ userId: CHARLIE });
  check('3g. Charlie list_trades success', r, 'success');
  const charlieTrades = ((r.data as Record<string,unknown>)?.['trades'] as Record<string,unknown>[]) ?? [];
  console.log(`       Charlie has ${charlieTrades.length} trade(s) total`);

  r = await listTrades({});
  check('3h. list_trades missing userId blocked', r, 'incomplete');

  // =========================================================================
  // PHASE 4: Trade Accept / Decline
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 4: Trade Accept / Decline');
  console.log('='.repeat(70));

  r = await acceptTrade({ tradeId: aliceBobTradeId, userId: CHARLIE });
  check('4a. Charlie cannot accept Alice->Bob trade (unauthorized)', r, 'unauthorized');

  r = await acceptTrade({ tradeId: aliceBobTradeId, userId: ALICE });
  check('4b. Alice cannot accept her own trade (unauthorized)', r, 'unauthorized');

  r = await acceptTrade({ tradeId: aliceBobTradeId, userId: BOB });
  check('4c. Bob accepts Alice->Bob trade', r, 'success',
    [['tradeId in data', !!(r.data as Record<string,unknown>)?.['tradeId']]]);

  r = await acceptTrade({ tradeId: aliceBobTradeId, userId: BOB });
  check('4d. Bob double-accept blocked (invalid status)', r, 'invalid_trade_status');

  r = await declineTrade({ tradeId: charlieAliceTradeId, userId: ALICE });
  check('4e. Alice declines Charlie->Alice trade', r, 'success');

  r = await declineTrade({ tradeId: charlieAliceTradeId, userId: ALICE });
  check('4f. Alice double-decline blocked (invalid status)', r, 'invalid_trade_status');

  r = await acceptTrade({ tradeId: charlieBobTradeId, userId: BOB });
  check('4g. Bob accepts Charlie->Bob trade', r, 'success');

  r = await declineTrade({ tradeId: '00000000-0000-0000-0000-000099990001', userId: ALICE });
  check('4h. Decline non-existent trade returns trade_not_found', r, 'trade_not_found');

  // =========================================================================
  // PHASE 5: Messaging
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 5: Messaging');
  console.log('='.repeat(70));

  r = await sendMessage({ senderId: ALICE, tradeId: aliceBobTradeId,
    content: "Hey Bob! I'm excited to start our Python <-> Design skill swap." });
  check('5a. Alice sends first message in alice_bob trade', r, 'success',
    [['messageId present', !!(r.data as Record<string,unknown>)?.['id']]]);

  r = await sendMessage({ senderId: BOB, tradeId: aliceBobTradeId,
    content: "Awesome Alice! When can we start?" });
  check('5b. Bob replies in alice_bob trade', r, 'success');

  r = await sendMessage({ senderId: ALICE, tradeId: aliceBobTradeId,
    content: "Works for me! Let's do a 1-hour session twice a week." });
  check('5c. Alice sends follow-up message', r, 'success');

  r = await sendMessage({ senderId: CHARLIE, tradeId: charlieBobTradeId,
    content: "Bob, I'll teach you mixing and mastering first. Ready?" });
  check('5d. Charlie sends message in charlie_bob trade', r, 'success');

  r = await sendMessage({ senderId: BOB, tradeId: charlieBobTradeId,
    content: "Yes! I've always wanted to learn music production. Let's go!" });
  check('5e. Bob replies in charlie_bob trade', r, 'success');

  r = await sendMessage({ senderId: CHARLIE, tradeId: charlieBobTradeId, content: '   ' });
  check('5f. Empty message blocked', r, 'empty_message');

  r = await sendMessage({ senderId: ALICE, tradeId: charlieBobTradeId, content: 'Hey can I join?' });
  check('5g. Alice cannot message in charlie_bob trade (unauthorized)', r, 'unauthorized');

  r = await sendMessage({ senderId: CHARLIE, tradeId: charlieAliceTradeId,
    content: "Alice, let's still swap?" });
  check('5h. Message on declined trade blocked (trade_not_active)', r, 'trade_not_active');

  r = await sendMessage({ senderId: ALICE, tradeId: aliceBobTradeId } as Record<string,unknown>);
  check('5i. Message missing content field blocked', r, 'incomplete');

  for (let i = 1; i <= 3; i++) {
    r = await sendMessage({ senderId: BOB, tradeId: aliceBobTradeId,
      content: `Session update #${i}: great progress so far!` });
    check(`5j-${i}. Bob sends consecutive message #${i}`, r, 'success');
  }

  // =========================================================================
  // PHASE 6: Trade Completion Confirmation
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 6: Trade Completion Confirmation');
  console.log('='.repeat(70));

  r = await confirmTrade({ tradeId: aliceBobTradeId, userId: CHARLIE });
  check('6a. Charlie cannot confirm alice_bob trade (unauthorized)', r, 'unauthorized');

  r = await confirmTrade({ tradeId: aliceBobTradeId, userId: ALICE });
  check('6b. Alice confirms alice_bob (-> awaiting_confirmation)', r, 'success',
    [['newStatus is awaiting_confirmation',
      (r.data as Record<string,unknown>)?.['newStatus'] === 'awaiting_confirmation']]);

  r = await confirmTrade({ tradeId: aliceBobTradeId, userId: ALICE });
  check('6c. Alice re-confirm is idempotent (still awaiting_confirmation)', r, 'success',
    [['newStatus stays awaiting_confirmation',
      (r.data as Record<string,unknown>)?.['newStatus'] === 'awaiting_confirmation']]);

  r = await sendMessage({ senderId: BOB, tradeId: aliceBobTradeId,
    content: 'Almost done! Confirming now too.' });
  check('6d. Bob can still message during awaiting_confirmation', r, 'success');

  r = await confirmTrade({ tradeId: aliceBobTradeId, userId: BOB });
  check('6e. Bob confirms alice_bob (-> completed)', r, 'success',
    [['newStatus is completed',
      (r.data as Record<string,unknown>)?.['newStatus'] === 'completed']]);

  r = await sendMessage({ senderId: ALICE, tradeId: aliceBobTradeId,
    content: 'That was awesome!' });
  check('6f. Message blocked in completed trade (trade_not_active)', r, 'trade_not_active');

  r = await acceptTrade({ tradeId: aliceBobTradeId, userId: BOB });
  check('6g. Accept on completed trade blocked (invalid status)', r, 'invalid_trade_status');

  r = await confirmTrade({ tradeId: charlieBobTradeId, userId: CHARLIE });
  check('6h. Charlie confirms charlie_bob (-> awaiting_confirmation)', r, 'success',
    [['newStatus is awaiting_confirmation',
      (r.data as Record<string,unknown>)?.['newStatus'] === 'awaiting_confirmation']]);

  r = await confirmTrade({ tradeId: charlieBobTradeId, userId: BOB });
  check('6i. Bob confirms charlie_bob (-> completed)', r, 'success',
    [['newStatus is completed',
      (r.data as Record<string,unknown>)?.['newStatus'] === 'completed']]);

  r = await confirmTrade({ tradeId: '00000000-0000-0000-0000-000099990002', userId: ALICE });
  check('6j. Confirm non-existent trade returns trade_not_found', r, 'trade_not_found');

  r = await confirmTrade({ tradeId: charlieAliceTradeId, userId: CHARLIE });
  check('6k. Confirm on declined trade blocked (invalid_trade_status)', r, 'invalid_trade_status');

  // =========================================================================
  // PHASE 7: Review Submission
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 7: Review Submission');
  console.log('='.repeat(70));

  r = await submitReview({ reviewerId: ALICE, reviewedUserId: BOB, tradeId: aliceBobTradeId,
    overallRating: 5, skillAccuracyRating: 5, comment: 'Bob is an incredible UI/UX designer!' });
  check('7a. Alice reviews Bob (alice_bob trade)', r, 'success',
    [['reviewId present', !!(r.data as Record<string,unknown>)?.['id']]]);

  r = await submitReview({ reviewerId: BOB, reviewedUserId: ALICE, tradeId: aliceBobTradeId,
    overallRating: 5, skillAccuracyRating: 4, comment: 'Alice is an amazing Python teacher.' });
  check('7b. Bob reviews Alice (alice_bob trade)', r, 'success');

  r = await submitReview({ reviewerId: ALICE, reviewedUserId: BOB, tradeId: aliceBobTradeId,
    overallRating: 3, skillAccuracyRating: 3, comment: 'Changed my mind.' });
  check('7c. Alice duplicate review blocked (review_exists)', r, 'review_exists');

  r = await submitReview({ reviewerId: CHARLIE, reviewedUserId: BOB, tradeId: charlieBobTradeId,
    overallRating: 4, skillAccuracyRating: 4, comment: 'Bob learned web dev basics really well!' });
  check('7d. Charlie reviews Bob (charlie_bob trade)', r, 'success');

  r = await submitReview({ reviewerId: BOB, reviewedUserId: CHARLIE, tradeId: charlieBobTradeId,
    overallRating: 5, skillAccuracyRating: 5, comment: 'Charlie is a world-class music producer!' });
  check('7e. Bob reviews Charlie (charlie_bob trade)', r, 'success');

  r = await submitReview({ reviewerId: CHARLIE, reviewedUserId: ALICE, tradeId: charlieAliceTradeId,
    overallRating: 2, skillAccuracyRating: 2, comment: 'Alice declined my request.' });
  check('7f. Review on non-completed (declined) trade blocked', r, 'trade_not_complete');

  r = await submitReview({ reviewerId: CHARLIE, reviewedUserId: ALICE, tradeId: aliceBobTradeId,
    overallRating: 1, skillAccuracyRating: 1, comment: "I wasn't even in this trade." });
  check('7g. Outsider review blocked (unauthorized)', r, 'unauthorized');

  r = await submitReview({ reviewerId: ALICE, reviewedUserId: BOB, tradeId: charlieBobTradeId,
    overallRating: 6, skillAccuracyRating: 3, comment: 'Testing' });
  check('7h. Invalid overallRating (6) blocked', r, 'invalid_rating');

  r = await submitReview({ reviewerId: BOB, reviewedUserId: ALICE, tradeId: aliceBobTradeId,
    skillAccuracyRating: 4 } as Record<string,unknown>);
  check('7i. Missing overallRating in review blocked', r, 'incomplete');

  r = await submitReview({ reviewerId: ALICE, reviewedUserId: BOB, tradeId: charlieBobTradeId,
    overallRating: 0, skillAccuracyRating: 1, comment: 'Zero rating test' });
  check('7j. Rating = 0 blocked (invalid_rating)', r, 'invalid_rating');

  // =========================================================================
  // PHASE 8: Final State Verification
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 8: Final State Verification via list_trades');
  console.log('='.repeat(70));

  r = await listTrades({ userId: ALICE });
  check('8a. Alice final list_trades success', r, 'success');
  const aliceFinal = ((r.data as Record<string,unknown>)?.['trades'] as Record<string,unknown>[]) ?? [];
  const aliceFinalStatuses = Object.fromEntries(aliceFinal.map((t) => [t['trade_id'], t['status']]));
  check('8b. alice_bob trade is completed',
    { status: aliceFinalStatuses[aliceBobTradeId] === 'completed' ? 'success'
      : `wrong_status:${aliceFinalStatuses[aliceBobTradeId]}` }, 'success');
  check('8c. charlie_alice trade is declined',
    { status: aliceFinalStatuses[charlieAliceTradeId] === 'declined' ? 'success'
      : `wrong_status:${aliceFinalStatuses[charlieAliceTradeId]}` }, 'success');

  r = await listTrades({ userId: CHARLIE });
  check('8d. Charlie final list_trades success', r, 'success');
  const charlieFinal = ((r.data as Record<string,unknown>)?.['trades'] as Record<string,unknown>[]) ?? [];
  const charlieFinalStatuses = Object.fromEntries(charlieFinal.map((t) => [t['trade_id'], t['status']]));
  check('8e. charlie_bob trade is completed',
    { status: charlieFinalStatuses[charlieBobTradeId] === 'completed' ? 'success'
      : `wrong_status:${charlieFinalStatuses[charlieBobTradeId]}` }, 'success');
  check('8f. charlie_alice trade is declined',
    { status: charlieFinalStatuses[charlieAliceTradeId] === 'declined' ? 'success'
      : `wrong_status:${charlieFinalStatuses[charlieAliceTradeId]}` }, 'success');

  // =========================================================================
  // PHASE 9: Additional Edge Cases
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 9: Additional Edge Cases');
  console.log('='.repeat(70));

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: alicePythonSkillId,
    targetUserId: BOB, desiredSkillId: bobDesignSkillId });
  check('9a. Alice can resubmit trade after previous completed (new active trade)', r, 'success');
  const aliceBobTrade2Id = (r.data as Record<string,unknown>)?.['tradeId'] as string;

  r = await submitTrade({ requesterId: ALICE, offeredSkillId: alicePythonSkillId,
    targetUserId: BOB, desiredSkillId: bobDesignSkillId });
  check('9b. Duplicate of new active trade blocked', r, 'duplicate_trade');

  r = await confirmTrade({ tradeId: aliceBobTrade2Id, userId: ALICE });
  check('9c. Confirm on pending trade blocked (invalid_trade_status)', r, 'invalid_trade_status');

  r = await createSkill({ userId: CHARLIE, skillName: 'Web Development', proficiency: 2, tags: ['html', 'css'] });
  check('9d. Charlie can create Web Development (same name, different user)', r, 'success');

  r = await acceptTrade({ tradeId: aliceBobTrade2Id } as Record<string,unknown>);
  check('9e. accept_trade missing userId blocked', r, 'incomplete');

  r = await declineTrade({ tradeId: '00000000-0000-0000-0000-000099990099', userId: BOB });
  check('9f. Decline non-existent trade returns trade_not_found', r, 'trade_not_found');

  // =========================================================================
  // POST-TEST CLEANUP
  // =========================================================================
  await cleanup();

  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('TYPESCRIPT INTEGRATION TEST RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total checks : ${PASS + FAIL}`);
  console.log(`  Passed       : ${PASS}`);
  console.log(`  Failed       : ${FAIL}`);

  if (BUGS.length) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('BUGS / FAILURES DETECTED:');
    console.log('='.repeat(70));
    BUGS.forEach((bug, i) => console.log(`  ${i + 1}. ${bug}`));
  } else {
    console.log('\n  No bugs detected. All integration checks passed.');
  }
  console.log('='.repeat(70));

  process.exit(FAIL === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});
