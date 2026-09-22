import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export type IdempotencyHit = {
  status: number;
  body: unknown;
};

/**
 * Look up an existing idempotency response.
 * Returns null if no entry, otherwise the cached response.
 * Throws on body_hash mismatch (caller must return 409).
 */
export async function lookupIdempotency(
  merchantId: string,
  key: string,
  bodyHash: string
): Promise<{ kind: 'hit'; payload: IdempotencyHit } | { kind: 'miss' } | { kind: 'conflict' }> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('idempotency_keys')
    .select('body_hash, response_status, response_body, expires_at')
    .eq('merchant_id', merchantId)
    .eq('key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!data) return { kind: 'miss' };
  if (data.body_hash !== bodyHash) return { kind: 'conflict' };

  return {
    kind: 'hit',
    payload: { status: data.response_status, body: data.response_body },
  };
}

/**
 * Save idempotency response after successful processing.
 * Best-effort — failure logged but does not break the request.
 */
export async function saveIdempotency(
  merchantId: string,
  key: string,
  bodyHash: string,
  status: number,
  body: unknown
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('idempotency_keys')
    .insert({
      merchant_id: merchantId,
      key,
      body_hash: bodyHash,
      response_status: status,
      response_body: body,
    });
  if (error && !error.message.includes('duplicate')) {
    console.error('[idempotency] save failed', error);
  }
}

export function hashBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}
