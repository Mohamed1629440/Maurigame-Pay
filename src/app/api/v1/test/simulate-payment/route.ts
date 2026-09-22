import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { authenticateApi } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { logApiCall } from '@/lib/api/audit';
import { serializeIntent, type IntentRecord } from '@/lib/api/intents';
import {
  errUnauthorized, errBadRequest, errForbidden, errNotFound,
  errConflict, errRateLimit, errInternal,
} from '@/lib/api/errors';

export async function POST(request: NextRequest) {
  const auth = await authenticateApi(request);
  if (!auth.ok) return errUnauthorized();
  const ctx = auth.ctx;

  if (ctx.mode !== 'test') {
    logApiCall({ request, merchantId: ctx.merchantId, apiKeyId: ctx.apiKeyId, endpoint: '/v1/test/simulate-payment', method: 'POST', statusCode: 403 });
    return errForbidden('test_mode_only', 'simulate-payment is only available with kp_test_ keys');
  }

  const rl = await checkRateLimit(ctx.apiKeyId, ctx.merchantId, ctx.mode);
  if (!rl.ok) return rl.serviceError ? errInternal('rate_limit_unavailable') : errRateLimit(rl.resetIn);

  let body: { ref?: string; tier?: 1 | 2; fake_sender_phone?: string } = {};
  try {
    body = await request.json();
  } catch {
    return errBadRequest('invalid_param', 'Body must be valid JSON');
  }

  if (!body.ref) {
    return errBadRequest('missing_param', '`ref` is required', 'ref');
  }
  const tier = body.tier === 2 ? 2 : 1;
  const sender = body.fake_sender_phone ?? '22999999';

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from('payment_intents')
    .select('*')
    .eq('ref', body.ref)
    .eq('merchant_id', ctx.merchantId)
    .eq('mode', 'test')
    .maybeSingle();

  if (!existing) {
    logApiCall({ request, merchantId: ctx.merchantId, apiKeyId: ctx.apiKeyId, endpoint: '/v1/test/simulate-payment', method: 'POST', statusCode: 404 });
    return errNotFound('Test-mode intent');
  }
  if (existing.status !== 'pending') {
    logApiCall({ request, merchantId: ctx.merchantId, apiKeyId: ctx.apiKeyId, endpoint: '/v1/test/simulate-payment', method: 'POST', statusCode: 409 });
    return errConflict('intent_not_pending', `Intent is in status \`${existing.status}\` and cannot be simulated.`);
  }

  const { data: updated, error: updateErr } = await admin
    .from('payment_intents')
    .update({
      status: 'paid',
      matched_tier: tier,
      actual_sender_phone: sender,
      sms_received: `[SIMULATED] tier=${tier} sender=${sender}`,
      paid_at: new Date().toISOString(),
    })
    .eq('ref', body.ref)
    .eq('merchant_id', ctx.merchantId)
    .select('*')
    .single();

  if (updateErr || !updated) {
    logApiCall({ request, merchantId: ctx.merchantId, apiKeyId: ctx.apiKeyId, endpoint: '/v1/test/simulate-payment', method: 'POST', statusCode: 500 });
    return errInternal();
  }

  let phone: string | null = null;
  if (updated.merchant_operator_id) {
    const { data: op } = await admin
      .from('merchant_operators')
      .select('expected_phone')
      .eq('id', updated.merchant_operator_id)
      .maybeSingle();
    phone = op?.expected_phone ?? null;
  }

  const origin = new URL(request.url).origin;
  const responseBody = serializeIntent(updated as IntentRecord, phone, null, origin, true);

  // Enqueue webhook (test mode includes livemode: false)
  await admin.rpc('enqueue_webhook_delivery', {
    p_merchant_id: ctx.merchantId,
    p_event_type: 'payment.succeeded',
    p_payload: {
      id: `evt_${crypto.randomBytes(12).toString('hex')}`,
      type: 'payment.succeeded',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: responseBody },
    },
  });

  logApiCall({ request, merchantId: ctx.merchantId, apiKeyId: ctx.apiKeyId, endpoint: '/v1/test/simulate-payment', method: 'POST', statusCode: 200 });
  return NextResponse.json(responseBody);
}
