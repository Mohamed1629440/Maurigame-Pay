import { type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { hashBody } from './idempotency';

/**
 * Async audit log insert. Fire-and-forget; never blocks the response.
 */
export function logApiCall(args: {
  request: NextRequest;
  merchantId: string | null;
  apiKeyId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  body?: string;
}): void {
  const admin = createSupabaseAdminClient();
  const ip = args.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = args.request.headers.get('user-agent') ?? null;
  const bodyHash = args.body ? hashBody(args.body) : null;

  admin
    .from('api_audit_log')
    .insert({
      merchant_id: args.merchantId,
      api_key_id: args.apiKeyId,
      endpoint: args.endpoint,
      method: args.method,
      status_code: args.statusCode,
      ip,
      user_agent: userAgent,
      body_hash: bodyHash,
    })
    .then(({ error }) => {
      if (error) console.error('[audit] insert failed', error);
    });
}
