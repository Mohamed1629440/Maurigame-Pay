import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';
import { DashboardNav } from './DashboardNav';

export const metadata = { title: 'Dashboard · KitPay' };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Find merchant for this user
  const { data: members } = await supabase
    .from('merchant_members')
    .select('merchant_id, role, merchants(id, name, status)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);

  // If no merchant yet → redirect to onboarding
  if (!members || members.length === 0) {
    redirect('/onboarding/merchant');
  }

  const merchant = (members[0] as any).merchants;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-[var(--stone-200)] bg-[var(--paper)] flex flex-col">
        {/* Brand block */}
        <div className="px-5 pt-6 pb-5 border-b border-[var(--stone-200)]">
          <Link
            href="/"
            className="block group"
            aria-label="Retour à l'accueil KitPay"
          >
            <p className="kp-eyebrow text-[var(--bronze)] mb-1.5 group-hover:text-[var(--ink)] transition-colors duration-200">
              — KitPay
            </p>
            <h2 className="serif text-xl font-medium text-[var(--ink)] leading-tight italic">
              {merchant?.name ?? 'Sans nom'}
            </h2>
          </Link>
          {merchant?.status === 'pending_kyc' && (
            <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--bronze)] bg-[var(--gold-soft)]/40 border border-[var(--bronze-light)]/40 px-2 py-1 rounded-sm">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--bronze)] animate-pulse"
                aria-hidden="true"
              />
              KYC en attente
            </span>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <DashboardNav />
        </div>

        {/* User block */}
        <div className="border-t border-[var(--stone-200)] px-5 py-4">
          <p
            className="font-mono text-[11px] text-[var(--stone-500)] mb-2 truncate"
            title={user.email ?? ''}
          >
            {user.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        <div className="max-w-[1280px] mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
