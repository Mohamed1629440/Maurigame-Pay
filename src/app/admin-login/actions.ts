'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function adminLogin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { ok: false, error: 'Email et mot de passe requis' };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { ok: false, error: 'Identifiants incorrects' };
  }

  const role = (data.user.app_metadata as any)?.role;
  if (role !== 'super_admin') {
    await supabase.auth.signOut();
    return { ok: false, error: 'Acces refuse' };
  }

  redirect('/admin');
}
