import { createSupabaseAdminClient } from '@/lib/supabase/server';

export type RateLimitResult =
  | { ok: true; remaining: number; limit: number; resetIn: number }
  | { ok: false; remaining: 0; limit: number; resetIn: number; serviceError?: true };

const DEFAULT_LIMITS = { test: 60, live: 120 } as const;

/**
 * Increment counter and check against plan-level limit.
 * Resets on minute boundary.
 */
export async function checkRateLimit(
  apiKeyId: string,
  merchantId: string,
  mode: 'test' | 'live'
): Promise<RateLimitResult> {
  const admin = createSupabaseAdminClient();

  const { data: count, error } = await admin.rpc('rate_limit_increment', { p_api_key_id: apiKeyId });

  if (error) {
    console.error('[rate-limit] RPC failed — failing closed to prevent bypass', error);
    return { ok: false, remaining: 0, limit: 0, resetIn: 60, serviceError: true };
  }

  // Resolve plan limit — fallback to default if not found
  let limit: number = DEFAULT_LIMITS[mode];
  const { data: merchant } = await admin
    .from('merchants')
    .select('plan_id')
    .eq('id', merchantId)
    .maybeSingle();
  if (merchant?.plan_id) {
    const { data: plan } = await admin
      .from('merchant_plans')
      .select('rate_limit_per_min')
      .eq('id', merchant.plan_id)
      .maybeSingle();
    if (plan?.rate_limit_per_min) limit = plan.rate_limit_per_min;
  }

  const used = (count as number) ?? 0;
  const remaining = Math.max(0, limit - used);
  const now = Date.now();
  const resetIn = 60 - Math.floor((now / 1000) % 60);

  if (used > limit) {
    return { ok: false, remaining: 0, limit, resetIn };
  }
  return { ok: true, remaining, limit, resetIn };
}
