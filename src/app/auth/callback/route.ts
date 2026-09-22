import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-error?reason=missing_code`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-error?reason=${encodeURIComponent(error.message)}`);
  }

  // If next was explicitly provided, honor it.
  // Otherwise, redirect super_admin to /admin, everyone else to /dashboard.
  if (searchParams.has('next')) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = (user?.app_metadata as any)?.role === 'super_admin';
  return NextResponse.redirect(`${origin}${isAdmin ? '/admin' : '/dashboard'}`);
}
