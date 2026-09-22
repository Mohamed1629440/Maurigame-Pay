import Link from 'next/link';
import { requireMerchant } from '@/lib/dashboard/queries';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { PageHeader } from '@/components/dashboard/PageHeader';

type SearchParams = { status?: string; method?: string; mode?: string; q?: string };

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  expired: 'Expiré',
  cancelled: 'Annulé',
};

export default async function IntentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { merchant, supabase } = await requireMerchant();
  const mode = searchParams.mode ?? 'live';

  let query = supabase
    .from('payment_intents')
    .select('ref, amount, method, status, mode, customer_phone, description, created_at, paid_at')
    .eq('merchant_id', merchant.id)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(100);

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.method) query = query.eq('method', searchParams.method);
  if (searchParams.q) query = query.or(`ref.ilike.%${searchParams.q}%,customer_phone.ilike.%${searchParams.q}%`);

  const { data: rows } = await query;

  return (
    <div>
      <PageHeader
        eyebrow="Paiements"
        title={<><em>Historique</em> des intents</>}
        description="Tous les paiements crées via l'API KitPay, filtrables par statut, méthode ou référence."
        action={<ModeToggle current={mode} />}
      />

      <form
        className="mb-6 flex flex-wrap gap-2 items-center pb-5 border-b border-[var(--stone-200)]"
      >
        <input
          name="q"
          placeholder="Ref ou téléphone…"
          defaultValue={searchParams.q ?? ''}
          className="rounded-sm border border-[var(--stone-200)] bg-white px-3 py-2 text-sm font-mono text-[var(--ink)] placeholder:text-[var(--stone-400)] focus:outline-none focus:border-[var(--bronze)] focus:ring-1 focus:ring-[var(--bronze)] transition-colors duration-200"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ''}
          className="rounded-sm border border-[var(--stone-200)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--bronze)] cursor-pointer"
        >
          <option value="">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="paid">Payés</option>
          <option value="expired">Expirés</option>
          <option value="cancelled">Annulés</option>
        </select>
        <select
          name="method"
          defaultValue={searchParams.method ?? ''}
          className="rounded-sm border border-[var(--stone-200)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--bronze)] cursor-pointer"
        >
          <option value="">Toutes méthodes</option>
          {['Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input type="hidden" name="mode" value={mode} />
        <button type="submit" className="kp-btn kp-btn-primary text-xs cursor-pointer">
          Filtrer
        </button>
      </form>

      {!rows || rows.length === 0 ? (
        <EmptyState
          title="Aucun paiement"
          description="Crée ton premier intent via l'API ou la sandbox."
        />
      ) : (
        <div className="bg-white border border-[var(--stone-200)] rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--stone-200)] bg-[var(--paper-warm)]">
              <tr>
                {['Ref', 'Montant', 'Méthode', 'Statut', 'Customer', 'Créé', 'Payé'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--stone-500)]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.ref}
                  className="border-t border-[var(--stone-100)] hover:bg-[var(--stone-50)] transition-colors duration-150"
                >
                  <td className="px-4 py-3 font-mono text-[13px]">
                    <Link
                      href={`/dashboard/intents/${r.ref}`}
                      className="text-[var(--ink)] hover:text-[var(--bronze)] transition-colors duration-200"
                    >
                      {r.ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 serif font-medium text-[var(--ink)]">
                    {r.amount.toLocaleString('fr-FR')}{' '}
                    <span className="text-[var(--stone-500)] text-xs ml-0.5">MRU</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--stone-700)]">{r.method}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--stone-500)]">
                    {r.customer_phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--stone-500)]">
                    {new Date(r.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--stone-500)]">
                    {r.paid_at ? new Date(r.paid_at).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModeToggle({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-1 border border-[var(--stone-200)] rounded-sm p-0.5 bg-white">
      <Link
        href="?mode=test"
        aria-current={current === 'test' ? 'true' : undefined}
        className={`font-mono text-[11px] tracking-wider uppercase px-3 py-1 rounded-sm transition-colors duration-200 ${
          current === 'test'
            ? 'bg-[var(--bronze)] text-white'
            : 'text-[var(--stone-700)] hover:bg-[var(--stone-100)]'
        }`}
      >
        Test
      </Link>
      <Link
        href="?mode=live"
        aria-current={current === 'live' ? 'true' : undefined}
        className={`font-mono text-[11px] tracking-wider uppercase px-3 py-1 rounded-sm transition-colors duration-200 ${
          current === 'live'
            ? 'bg-[var(--forest)] text-white'
            : 'text-[var(--stone-700)] hover:bg-[var(--stone-100)]'
        }`}
      >
        Live
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'border-[var(--bronze)]/40 text-[var(--bronze)] bg-[var(--gold-soft)]/40',
    paid: 'border-[var(--forest)]/40 text-[var(--forest)] bg-[var(--forest)]/[0.06]',
    expired: 'border-[var(--stone-300)] text-[var(--stone-500)] bg-[var(--stone-100)]',
    cancelled: 'border-[var(--stone-300)] text-[var(--stone-500)] bg-[var(--stone-100)]',
  };
  return (
    <span
      className={`inline-flex items-center font-mono text-[10px] tracking-wider uppercase border rounded-sm px-2 py-0.5 ${styles[status] ?? 'border-[var(--stone-200)]'}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
