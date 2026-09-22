'use server';

import { randomBytes, createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireMerchant } from '@/lib/dashboard/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const MAX_KEYS_PER_MERCHANT = 10;

export async function createApiKey(args: { mode: 'test' | 'live'; label: string }): Promise<{ ok: boolean; key?: string; error?: string }> {
  const { merchant } = await requireMerchant();
  const admin = createSupabaseAdminClient();

  // Block live keys if KYC not validated
  if (args.mode === 'live' && merchant.status !== 'active') {
    return { ok: false, error: 'KYC required for live keys. Submit KYC documents in Settings.' };
  }

  // Limit count
  const { count } = await admin.from('api_keys').select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id).is('revoked_at', null);
  if ((count ?? 0) >= MAX_KEYS_PER_MERCHANT) {
    return { ok: false, error: `Maximum ${MAX_KEYS_PER_MERCHANT} active keys per merchant. Revoke an old one first.` };
  }

  const key = `kp_${args.mode}_${randomBytes(16).toString('hex')}`;
  const keyHash = createHash('sha256').update(key).digest('hex');
  const { error } = await admin.from('api_keys').insert({
    merchant_id: merchant.id,
    key_prefix: key.substring(0, 12),
    key_hash: keyHash,
    mode: args.mode,
    label: args.label || `${args.mode} key`,
  });
  if (error) return { ok: false, error: error.message };
  // NOTE: do NOT revalidatePath here — would remount CreateKeyButton and clear showKey state.
  // Client calls router.refresh() on close.
  return { ok: true, key };
}

export async function revokeApiKey(id: string) {
  const { merchant } = await requireMerchant();
  const admin = createSupabaseAdminClient();
  await admin.from('api_keys').update({ revoked_at: new Date().toISOString() })
    .eq('id', id).eq('merchant_id', merchant.id);
  revalidatePath('/dashboard/api-keys');
  return { ok: true };
}
