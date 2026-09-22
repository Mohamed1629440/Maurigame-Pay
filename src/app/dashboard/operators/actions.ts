'use server';

import { revalidatePath } from 'next/cache';
import { requireMerchant } from '@/lib/dashboard/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const VALID_METHODS = ['Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click', 'BCIPAY'] as const;

export async function addOperator(form: { method: string; expected_phone: string; merchant_code: string; label: string }) {
  const { merchant } = await requireMerchant();
  if (!VALID_METHODS.includes(form.method as any)) return { ok: false, error: 'Méthode invalide' };
  const phone = form.expected_phone.replace(/\s+/g, '');
  if (!phone.match(/^\d{8,12}$/)) return { ok: false, error: 'Téléphone invalide (8-12 chiffres)' };
  const isCodeMethod = form.method === 'BIM' || form.method === 'Masrvi' || form.method === 'Click' || form.method === 'Sedad' || form.method === 'BCIPAY';
  const merchantCode = form.merchant_code.replace(/\s+/g, '') || null;
  if (isCodeMethod && merchantCode && !/^\d{4,10}$/.test(merchantCode)) {
    return { ok: false, error: 'Code commerçant invalide (4-10 chiffres)' };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('merchant_operators').insert({
    merchant_id: merchant.id,
    method: form.method,
    expected_phone: phone,
    merchant_code: merchantCode,
    label: form.label || null,
    enabled: true,
  });
  if (error) {
    if (error.message.includes('duplicate')) return { ok: false, error: 'Ce couple opérateur+numéro est déjà utilisé.' };
    return { ok: false, error: error.message };
  }
  revalidatePath('/dashboard/operators');
  return { ok: true };
}

export async function toggleOperator(id: string, enabled: boolean) {
  const { merchant } = await requireMerchant();
  const admin = createSupabaseAdminClient();
  await admin.from('merchant_operators').update({ enabled }).eq('id', id).eq('merchant_id', merchant.id);
  revalidatePath('/dashboard/operators');
  return { ok: true };
}

export async function deleteOperator(id: string) {
  const { merchant } = await requireMerchant();
  const admin = createSupabaseAdminClient();
  await admin.from('merchant_operators').delete().eq('id', id).eq('merchant_id', merchant.id);
  revalidatePath('/dashboard/operators');
  return { ok: true };
}
