'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type OnboardingPayload = {
  // Step 1
  name: string;
  legal_name: string;
  business_type: string;
  rc_number: string;
  nif: string;
  // Step 2
  contact_phone: string;
  address: string;
  city: string;
  // Step 3
  operator_method: string;
  operator_phone: string;
  operator_label: string;
};

export async function submitOnboarding(payload: OnboardingPayload): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: 'Non authentifié' };

  // Find this user's merchant via merchant_members (RLS-respecting query)
  const { data: members, error: memErr } = await supabase
    .from('merchant_members')
    .select('merchant_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);

  if (memErr || !members || members.length === 0) {
    return { ok: false, error: 'Aucun merchant trouvé pour ce compte' };
  }

  const merchantId = members[0].merchant_id;

  // Use admin client to bypass RLS for the multi-table update
  const admin = createSupabaseAdminClient();

  // Update merchant fields
  const { error: updateErr } = await admin
    .from('merchants')
    .update({
      name: payload.name,
      legal_name: payload.legal_name || null,
      business_type: payload.business_type || null,
      rc_number: payload.rc_number || null,
      nif: payload.nif || null,
      contact_phone: payload.contact_phone || null,
      address: payload.address || null,
      city: payload.city || 'Nouakchott',
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchantId);

  if (updateErr) return { ok: false, error: `Update merchant failed: ${updateErr.message}` };

  // Insert merchant_operator (only if not duplicate)
  const phoneClean = payload.operator_phone.replace(/\s+/g, '');
  const { error: opErr } = await admin
    .from('merchant_operators')
    .insert({
      merchant_id: merchantId,
      method: payload.operator_method,
      expected_phone: phoneClean,
      label: payload.operator_label || `${payload.operator_method} principal`,
      enabled: true,
    });

  // Conflict (couple already exists for another merchant) → 23505
  if (opErr && !opErr.message.includes('duplicate')) {
    return { ok: false, error: `Insert operator failed: ${opErr.message}` };
  }

  return { ok: true };
}

export async function finishOnboarding(): Promise<never> {
  redirect('/dashboard?welcome=1');
}
