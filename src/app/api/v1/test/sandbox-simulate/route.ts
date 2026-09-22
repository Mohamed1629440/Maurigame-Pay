import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { errBadRequest, errForbidden, errNotFound, errConflict, errInternal } from '@/lib/api/errors';

export async function POST(request: NextRequest) {
  let body: { ref?: string; client_secret?: string } = {};
  try { body = await request.json(); } catch { return errBadRequest('invalid_param', 'Body must be JSON'); }

  if (!body.ref || !body.client_secret) {
    return errBadRequest('missing_param', '`ref` and `client_secret` are required');
  }

  const admin = createSupabaseAdminClient();
  const { data: intent } = await admin
    .from('payment_intents')
    .select('ref, status, mode, client_secret, amount, method, expected_phone, customer_phone')
    .eq('ref', body.ref)
    .maybeSingle();

  if (!intent) return errNotFound('Intent');
  if (intent.client_secret !== body.client_secret) return errForbidden('invalid_param', 'Invalid client_secret');
  if (intent.mode !== 'test') return errForbidden('test_mode_only', 'sandbox-simulate works only in test mode');
  if (intent.status !== 'pending') return errConflict('intent_not_pending', `Intent is in status \`${intent.status}\``);

  const { data: updated, error } = await admin
    .from('payment_intents')
    .update({
      status: 'paid',
      matched_tier: 1,
      actual_sender_phone: intent.customer_phone ?? '22999999',
      sms_received: '[SIMULATED via sandbox-simulate]',
      paid_at: new Date().toISOString(),
    })
    .eq('ref', body.ref)
    .select('*')
    .single();

  if (error || !updated) return errInternal();

  // Enqueue webhook
  await admin.rpc('enqueue_webhook_delivery', {
    p_merchant_id: updated.merchant_id,
    p_event_type: 'payment.succeeded',
    p_payload: {
      id: `evt_${crypto.randomBytes(12).toString('hex')}`,
      type: 'payment.succeeded',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: updated },
    },
  });

  return NextResponse.json({ ok: true, ref: body.ref });
}
