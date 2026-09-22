import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function signedUrlFor(path: string, expiresIn = 3600): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.storage.from('kyc-documents').createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function uploadKycDoc(
  merchantId: string,
  filename: string,
  bytes: ArrayBuffer,
  mimeType: string
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const admin = createSupabaseAdminClient();
  const path = `${merchantId}/${Date.now()}-${filename}`;
  const { error } = await admin.storage.from('kyc-documents').upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}
