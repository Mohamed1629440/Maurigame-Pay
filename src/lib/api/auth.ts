import { type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export type ApiAuthContext = {
  merchantId: string;
  apiKeyId: string;
  mode: 'test' | 'live';
  scopes: string[];
};

export type ApiAuthResult =
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; reason: 'missing' | 'malformed' | 'invalid' };

/**
 * Extract Bearer token from request and resolve merchant_id + mode.
 * Caller MUST handle the !ok case (return 401).
 */
export async function authenticateApi(req: NextRequest): Promise<ApiAuthResult> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { ok: false, reason: 'missing' };

  const match = authHeader.match(/^Bearer\s+(kp_(test|live)_[A-Za-z0-9]{16,})$/);
  if (!match) return { ok: false, reason: 'malformed' };

  const key = match[1];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('verify_api_key', { p_key: key });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return { ok: false, reason: 'invalid' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    ctx: {
      merchantId: row.merchant_id,
      apiKeyId: row.api_key_id,
      mode: row.mode,
      scopes: row.scopes ?? [],
    },
  };
}

/**
 * Check that the merchant is allowed to use this api_key in `live` mode
 * (i.e., KYC validated). For `test` mode, always allowed.
 */
export async function ensureKycForLive(ctx: ApiAuthContext): Promise<{ ok: boolean }> {
  if (ctx.mode === 'test') return { ok: true };

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('merchants')
    .select('status')
    .eq('id', ctx.merchantId)
    .single();

  if (!data || data.status !== 'active') {
    return { ok: false };
  }
  return { ok: true };
}
