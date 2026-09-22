import { StatCard } from '@/components/dashboard/StatCard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export default async function AdminOverviewPage() {
  const admin = createSupabaseAdminClient();

  const [merchantsRes, pendingRes, activeRes, txRes] = await Promise.all([
    admin.from('merchants').select('id', { count: 'exact', head: true }),
    admin.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'pending_kyc'),
    admin.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('payment_intents').select('id', { count: 'exact', head: true }),
  ]);

  const totalMerchants = merchantsRes.count ?? 0;
  const pendingKyc = pendingRes.count ?? 0;
  const activeMerchants = activeRes.count ?? 0;
  const totalTransactions = txRes.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Vue globale</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Statistiques cross-marchands de la plateforme KitPay.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Marchands (total)" value={totalMerchants} />
        <StatCard label="KYC en attente" value={pendingKyc} hint="À valider" />
        <StatCard label="Marchands actifs" value={activeMerchants} />
        <StatCard label="Transactions (total)" value={totalTransactions} />
      </div>
    </div>
  );
}
