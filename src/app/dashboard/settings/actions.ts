'use server';

import { revalidatePath } from 'next/cache';
import { requireMerchant } from '@/lib/dashboard/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function updateMerchantSettings(form: {
  name: string; legal_name: string; rc_number: string; nif: string;
  contact_phone: string; address: string; city: string;
  brand_color: string;
}) {
  const { merchant } = await requireMerchant();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('merchants').update({
    name: form.name, legal_name: form.legal_name || null,
    rc_number: form.rc_number || null, nif: form.nif || null,
    contact_phone: form.contact_phone || null, address: form.address || null,
    city: form.city || 'Nouakchott', brand_color: form.brand_color || '#171717',
    updated_at: new Date().toISOString(),
  }).eq('id', merchant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/settings');
  return { ok: true };
}
