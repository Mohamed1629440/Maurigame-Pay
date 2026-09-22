import { requireMerchant } from '@/lib/dashboard/queries';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ReconcileForm } from './ReconcileForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

export default async function ReconciliationPage() {
  const { merchant, supabase } = await requireMerchant();
  const { data: orphans } = await supabase
    .from('orphan_sms')
    .select('*')
    .eq('merchant_id', merchant.id)
    .is('resolved_at', null)
    .order('received_at', { ascending: false })
    .limit(50);

  if (!orphans || orphans.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="Opérations"
          title={<><em>Réconciliation</em> manuelle</>}
          description="Les SMS reçus sans match automatique apparaissent ici."
        />
        <EmptyState
          title="Aucun SMS orphelin"
          description="Tous les paiements reçus ont été matchés automatiquement avec un intent."
        />
      </div>
    );
  }

  const { data: pendingIntents } = await supabase
    .from('payment_intents')
    .select('ref, amount, method, customer_phone')
    .eq('merchant_id', merchant.id)
    .eq('status', 'pending')
    .eq('mode', 'live');

  return (
    <div>
      <PageHeader
        eyebrow="Opérations"
        title={<><em>Réconciliation</em> manuelle</>}
        description={`${orphans.length} SMS sans match automatique. Associez chaque orphelin à un intent pending pour le valider.`}
      />

      <ul className="space-y-3">
        {orphans.map((o) => (
          <li
            key={o.id}
            className="bg-white border border-[var(--stone-200)] rounded-sm p-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="serif text-xl font-medium text-[var(--ink)]">
                    {o.parsed_amount?.toLocaleString('fr-FR')}{' '}
                    <span className="text-[var(--stone-500)] text-sm">MRU</span>
                  </span>
                  <span className="font-mono text-[10px] tracking-wider uppercase border border-[var(--bronze)]/40 text-[var(--bronze)] bg-[var(--gold-soft)]/40 rounded-sm px-2 py-0.5">
                    {o.parsed_method ?? 'Inconnu'}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-[var(--stone-500)] tracking-wide">
                  Sender : {o.parsed_phone ?? '—'} ·{' '}
                  Reçu : {new Date(o.received_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <ReconcileForm
                orphanId={o.id}
                candidates={(pendingIntents ?? []).filter(
                  (i) => i.amount === o.parsed_amount && i.method === o.parsed_method
                )}
              />
            </div>
            <details className="mt-4 group">
              <summary className="cursor-pointer kp-eyebrow text-[var(--stone-500)] hover:text-[var(--ink)] transition-colors duration-200 select-none list-none">
                <span className="inline-block transition-transform duration-200 group-open:rotate-90 mr-1">
                  ›
                </span>
                Voir le SMS brut
              </summary>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-[12px] text-[var(--stone-700)] bg-[var(--paper-warm)] border border-[var(--stone-200)] rounded-sm p-3 leading-relaxed">
                {o.raw_body}
              </pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
