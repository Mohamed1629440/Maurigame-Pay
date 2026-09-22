'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

async function ensureSuperAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.app_metadata as any)?.role;
  if (!user || role !== 'super_admin') redirect('/dashboard');
  return user;
}

export async function approveKyc(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSuperAdmin();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('merchants').update({
    status: 'active',
    kyc_verified_at: new Date().toISOString(),
  }).eq('id', merchantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/kyc');
  revalidatePath(`/admin/kyc/${merchantId}`);
  return { ok: true };
}

export async function rejectKyc(merchantId: string, note: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSuperAdmin();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('merchants').update({
    status: 'pending_kyc',
    kyc_notes: note,
  }).eq('id', merchantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/kyc');
  revalidatePath(`/admin/kyc/${merchantId}`);
  return { ok: true };
}
