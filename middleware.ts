import { NextResponse, type NextRequest } from 'next/server';
import { updateSupabaseSession } from './src/lib/supabase/middleware-helper';

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/admin'];
const ADMIN_LOGIN = '/admin-login';
const AUTH_PAGES = ['/signup', '/login'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);

  const pathname = request.nextUrl.pathname;
  const isProtected = pathname !== ADMIN_LOGIN && PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some(p => pathname === p);

  // Block protected routes for unauthenticated users
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith('/admin')) {
      url.pathname = '/admin-login';
    } else {
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from /signup and /login
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico
     * - api/cron        (machine to machine, protected by CRON_SECRET)
     * - api/v1          (public REST API, protected by Bearer API key)
     * - api/sms-ingest  (phone SMS forwarder, protected by WEBHOOK_SECRET)
     * - pay             (public hosted checkout, no auth required)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/cron|api/v1|api/sms-ingest|pay).*)',
  ],
};
