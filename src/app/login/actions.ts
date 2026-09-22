'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function loginWithEmail(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'Email requis' };

  const supabase = createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      shouldCreateUser: false, // login ne crée pas un compte
    },
  });

  if (error) {
    // shouldCreateUser=false → si l'email n'existe pas, supabase renvoie une erreur
    // Pour ne pas leak l'existence des comptes, on retourne ok=true quand même
    if (error.message.toLowerCase().includes('user not found') || error.message.toLowerCase().includes('signups not allowed')) {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
