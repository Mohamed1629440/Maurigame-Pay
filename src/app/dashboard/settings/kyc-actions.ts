'use server';

import { revalidatePath } from 'next/cache';
import { requireMerchant } from '@/lib/dashboard/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { uploadKycDoc } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function uploadKyc(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { merchant } = await requireMerchant();
  const docType = String(formData.get('doc_type') ?? '');
  const file = formData.get('file') as File | null;
  if (!['rc', 'nif', 'id'].includes(docType)) return { ok: false, error: 'Invalid doc_type' };
  if (!file) return { ok: false, error: 'No file' };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: 'Type not allowed (jpg/png/pdf only)' };
  if (file.size > MAX_SIZE) return { ok: false, error: 'File too large (max 10 MB)' };

  const bytes = await file.arrayBuffer();
  const upload = await uploadKycDoc(merchant.id, `${docType}-${file.name}`, bytes, file.type);
  if (!upload.ok || !upload.path) return { ok: false, error: upload.error };

  // Update merchants.kyc_documents jsonb
  const admin = createSupabaseAdminClient();
  const { data: m } = await admin.from('merchants').select('kyc_documents').eq('id', merchant.id).single();
  const docs = (m?.kyc_documents as Record<string, string> ?? {});
  docs[`${docType}_url`] = upload.path;
  await admin.from('merchants').update({ kyc_documents: docs }).eq('id', merchant.id);

  revalidatePath('/dashboard/settings');
  return { ok: true };
}

export async function submitKycForReview(): Promise<{ ok: boolean; error?: string }> {
  const { merchant } = await requireMerchant();
  const admin = createSupabaseAdminClient();
  const { data: m } = await admin.from('merchants').select('kyc_documents, status').eq('id', merchant.id).single();
  const docs = (m?.kyc_documents as Record<string, string> ?? {});
  if (!docs.rc_url || !docs.nif_url || !docs.id_url) {
    return { ok: false, error: 'Tous les 3 documents (RC, NIF, pièce identité) sont requis' };
  }
  await admin.from('merchants').update({ status: 'pending_kyc' }).eq('id', merchant.id);

  // Notify Telegram super-admin
  await notifySuperAdmin(`🔍 Nouveau KYC à valider — merchant ${merchant.id}`);
  revalidatePath('/dashboard/settings');
  return { ok: true };
}

async function notifySuperAdmin(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch (e) {
    console.error('[telegram] notify failed', e);
  }
}
