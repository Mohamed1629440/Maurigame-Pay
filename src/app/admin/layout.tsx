import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';

export const metadata = { title: 'Admin · KitPay' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');
  const role = (user.app_metadata as any)?.role;
  if (role !== 'super_admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-bold text-neutral-900">KitPay Admin</h2>
        <p className="mt-1 text-xs text-neutral-500">Super-admin</p>
        <nav className="mt-6 space-y-1">
          <Link href="/admin" className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100">Vue globale</Link>
          <Link href="/admin/kyc" className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100">KYC en attente</Link>
          <Link href="/admin/merchants" className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100">Tous les marchands</Link>
        </nav>
        <div className="mt-8 border-t border-neutral-200 pt-4">
          <p className="mb-2 text-xs">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
