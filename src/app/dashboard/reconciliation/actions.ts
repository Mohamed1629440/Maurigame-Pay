'use server';

import { revalidatePath } from 'next/cache';
import { requireMerchant } from '@/lib/dashboard/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function reconcileOrphan(args: { orphan_id: string; target_ref: string }) {
  const { merchant, user } = await requireMerchant();
  const admin = createSupabaseAdminClient();

  // Verify orphan and intent both belong to this merchant
  const { data: orphan } = await admin.from('orphan_sms')
    .select('*').eq('id', args.orphan_id).eq('merchant_id', merchant.id).maybeSingle();
  if (!orphan) return { ok: false, error: 'Orphan not found' };

  const { data, error } = await admin.rpc('reconcile_orphan', {
    p_orphan_id: args.orphan_id,
    p_target_ref: args.target_ref,
    p_admin: user.email,
  });
  if (error) return { ok: false, error: error.message };
  if (data && (data as any).success === false) return { ok: false, error: (data as any).error };
  revalidatePath('/dashboard/reconciliation');
  return { ok: true };
}
