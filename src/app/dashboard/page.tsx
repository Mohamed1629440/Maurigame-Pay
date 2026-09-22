import Link from 'next/link';
import { StatCard } from '@/components/dashboard/StatCard';
import { requireMerchant } from '@/lib/dashboard/queries';

type SearchParams = { period?: '7d' | '30d' | '90d'; mode?: 'test' | 'live'; welcome?: string };

export default async function DashboardOverview({ searchParams }: { searchParams: SearchParams }) {
  const { merchant, supabase } = await requireMerchant();

  const period = searchParams.period ?? '30d';
  const mode = searchParams.mode ?? 'live';
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [intentsRes, paidRes, expiredRes, sumRes, tiersRes, opsRes] = await Promise.all([
    supabase.from('payment_intents').select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id).eq('mode', mode).gte('created_at', since),
    supabase.from('payment_intents').select('amount', { count: 'exact' })
      .eq('merchant_id', merchant.id).eq('mode', mode).eq('status', 'paid').gte('created_at', since),
    supabase.from('payment_intents').select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id).eq('mode', mode).eq('status', 'expired').gte('created_at', since),
    supabase.from('payment_intents').select('amount').eq('merchant_id', merchant.id)
      .eq('mode', mode).eq('status', 'paid').gte('created_at', since),
    supabase.from('payment_intents').select('matched_tier', { count: 'exact' })
      .eq('merchant_id', merchant.id).eq('mode', mode).eq('status', 'paid').gte('created_at', since),
    supabase.from('payment_intents').select('method').eq('merchant_id', merchant.id)
      .eq('mode', mode).eq('status', 'paid').gte('created_at', since),
  ]);

  const totalCount = intentsRes.count ?? 0;
  const paidCount = paidRes.count ?? 0;
  const expiredCount = expiredRes.count ?? 0;
  const totalAmount = (sumRes.data ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const avgTicket = paidCount > 0 ? Math.round(totalAmount / paidCount) : 0;
  const successRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  const tierDist: Record<string, number> = { '1': 0, '2': 0, '3': 0 };
  (tiersRes.data ?? []).forEach((r: any) => {
    if (r.matched_tier) tierDist[String(r.matched_tier)] = (tierDist[String(r.matched_tier)] ?? 0) + 1;
  });

  const methodCounts: Record<string, number> = {};
  (opsRes.data ?? []).forEach((r: any) => {
    methodCounts[r.method] = (methodCounts[r.method] ?? 0) + 1;
  });
  const topMethods = Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div>
      <header className="mb-8">
        <p className="kp-eyebrow text-[var(--bronze)] mb-3">— Dashboard</p>
        <h1 className="kp-section-title text-[var(--ink)]">
          Vue <em>d&rsquo;ensemble</em>
        </h1>
      </header>

      {searchParams.welcome === '1' && (
        <div className="mb-8 border border-[var(--forest)]/30 bg-[var(--forest)]/[0.04] rounded-sm p-6">
          <div className="flex items-start gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-[var(--forest)]"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <div className="min-w-0">
              <p className="kp-eyebrow text-[var(--forest)]">— Bienvenue sur KitPay</p>
              <h2 className="serif text-xl font-medium text-[var(--ink)] mt-2 italic">
                Votre compte est en mode test
              </h2>
              <p className="mt-2 text-sm text-[var(--stone-700)] leading-relaxed">
                Génère ta clé API et fais ton premier paiement de test.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/dashboard/api-keys" className="kp-btn kp-btn-primary text-xs">
                  Créer une clé API →
                </Link>
                <Link href="/dashboard/developers" className="kp-btn kp-btn-ghost text-xs">
                  Voir la doc
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-[var(--stone-200)] pb-5">
        <Filter
          label="Période"
          current={period}
          options={[{ v: '7d', l: '7j' }, { v: '30d', l: '30j' }, { v: '90d', l: '90j' }]}
          param="period"
          mode={mode}
        />
        <span className="text-[var(--stone-300)]" aria-hidden="true">·</span>
        <Filter
          label="Mode"
          current={mode}
          options={[{ v: 'test', l: 'Test' }, { v: 'live', l: 'Live' }]}
          param="mode"
          period={period}
        />
        {expiredCount > 0 && (
          <>
            <span className="text-[var(--stone-300)]" aria-hidden="true">·</span>
            <span className="font-mono text-[11px] tracking-wider text-[var(--stone-500)]">
              {expiredCount} expirés
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="CA encaissé"
          value={`${totalAmount.toLocaleString('fr-FR')} MRU`}
        />
        <StatCard label="Transactions" value={totalCount} />
        <StatCard
          label="Taux de réussite"
          value={`${successRate}%`}
          hint={`${paidCount} / ${totalCount}`}
        />
        <StatCard
          label="Ticket moyen"
          value={`${avgTicket.toLocaleString('fr-FR')} MRU`}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title="Distribution Tier matching" eyebrow="Réconciliation">
          {paidCount === 0 ? (
            <p className="text-sm text-[var(--stone-500)] italic">
              Aucun paiement réussi sur la période.
            </p>
          ) : (
            <ul className="space-y-4 mt-1">
              <TierRow
                label="Tier 1"
                sublabel="phone + amount"
                count={tierDist['1']}
                total={paidCount}
                color="var(--forest)"
              />
              <TierRow
                label="Tier 2"
                sublabel="amount FIFO"
                count={tierDist['2']}
                total={paidCount}
                color="var(--bronze)"
              />
              <TierRow
                label="Tier 3"
                sublabel="manuel"
                count={tierDist['3']}
                total={paidCount}
                color="var(--stone-400)"
              />
            </ul>
          )}
        </Panel>

        <Panel title="Top opérateurs" eyebrow="Méthodes de paiement">
          {topMethods.length === 0 ? (
            <p className="text-sm text-[var(--stone-500)] italic">
              Aucune transaction sur la période.
            </p>
          ) : (
            <ul className="space-y-3 mt-1">
              {topMethods.map(([method, count], idx) => {
                const pct = paidCount > 0 ? Math.round((count / paidCount) * 100) : 0;
                return (
                  <li key={method} className="flex items-center gap-4">
                    <span
                      className="font-mono text-[10px] tracking-[0.2em] text-[var(--stone-400)] w-6 shrink-0"
                      aria-hidden="true"
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="serif text-base text-[var(--ink)] flex-1">
                      {method}
                    </span>
                    <span className="font-mono text-sm text-[var(--stone-700)]">
                      {count}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--stone-500)] w-12 text-right">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[var(--stone-200)] rounded-sm p-6">
      {eyebrow && (
        <p className="kp-eyebrow text-[var(--stone-500)] mb-2">— {eyebrow}</p>
      )}
      <h3 className="serif text-lg font-medium text-[var(--ink)] leading-tight mb-5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Filter({
  label,
  current,
  options,
  param,
  period,
  mode,
}: {
  label: string;
  current: string;
  options: { v: string; l: string }[];
  param: string;
  period?: string;
  mode?: string;
}) {
  function buildHref(value: string) {
    const sp = new URLSearchParams();
    if (param === 'period') {
      sp.set('period', value);
      if (mode) sp.set('mode', mode);
    } else {
      sp.set('mode', value);
      if (period) sp.set('period', period);
    }
    return `?${sp.toString()}`;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="kp-eyebrow text-[var(--stone-500)]">— {label}</span>
      <div className="flex items-center gap-1">
        {options.map((o) => {
          const active = current === o.v;
          return (
            <Link
              key={o.v}
              href={buildHref(o.v)}
              aria-current={active ? 'true' : undefined}
              className={`font-mono text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-sm transition-colors duration-200 ${
                active
                  ? 'bg-[var(--ink)] text-white'
                  : 'text-[var(--stone-700)] hover:bg-[var(--stone-100)]'
              }`}
            >
              {o.l}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TierRow({
  label,
  sublabel,
  count,
  total,
  color,
}: {
  label: string;
  sublabel: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="serif text-sm font-medium text-[var(--ink)]">{label}</span>
          <span className="font-mono text-[10px] tracking-wider text-[var(--stone-500)] truncate">
            {sublabel}
          </span>
        </div>
        <span className="font-mono text-sm text-[var(--stone-700)] shrink-0">
          {count}
          <span className="text-[var(--stone-400)] ml-1">({pct}%)</span>
        </span>
      </div>
      <div className="h-[3px] w-full overflow-hidden bg-[var(--stone-100)] rounded-full">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </li>
  );
}
