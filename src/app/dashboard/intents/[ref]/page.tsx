import { notFound } from 'next/navigation';
import { requireMerchant } from '@/lib/dashboard/queries';
import { cancelIntent } from './actions';
import { CopyButton } from '@/components/dashboard/CopyButton';

export default async function IntentDetail({ params }: { params: { ref: string } }) {
  const { merchant, supabase } = await requireMerchant();

  const { data: intent } = await supabase
    .from('payment_intents')
    .select('*, merchant_operators(method, expected_phone)')
    .eq('ref', params.ref).eq('merchant_id', merchant.id)
    .maybeSingle();

  if (!intent) notFound();

  const cancelAction = cancelIntent.bind(null, intent.ref);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold text-neutral-900">{intent.ref}</h1>
        <CopyButton value={intent.ref}>Copier ref</CopyButton>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-white p-6 shadow-sm text-sm">
        <Field label="Montant" value={`${intent.amount.toLocaleString('fr-FR')} MRU`} />
        <Field label="Méthode" value={intent.method} />
        <Field label="Status" value={intent.status} />
        <Field label="Mode" value={intent.mode} />
        <Field label="Customer phone" value={intent.customer_phone ?? '—'} />
        <Field label="Sender phone" value={intent.actual_sender_phone ?? '—'} />
        <Field label="Tier match" value={intent.matched_tier?.toString() ?? '—'} />
        <Field label="Hosted URL" value={`/pay/${intent.ref}`} />
        <Field label="Success URL" value={intent.success_url ?? '—'} />
        <Field label="Cancel URL" value={intent.cancel_url ?? '—'} />
        <Field label="Créé" value={new Date(intent.created_at).toLocaleString('fr-FR')} />
        <Field label="Expire" value={new Date(intent.expires_at).toLocaleString('fr-FR')} />
        <Field label="Payé à" value={intent.paid_at ? new Date(intent.paid_at).toLocaleString('fr-FR') : '—'} />
      </dl>

      {intent.sms_received && (
        <details className="mt-4 rounded-lg bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold text-sm">SMS reçu</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-neutral-700">{intent.sms_received}</pre>
        </details>
      )}

      {intent.metadata && Object.keys(intent.metadata).length > 0 && (
        <details className="mt-4 rounded-lg bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold text-sm">Metadata</summary>
          <pre className="mt-2 text-xs text-neutral-700">{JSON.stringify(intent.metadata, null, 2)}</pre>
        </details>
      )}

      {intent.status === 'pending' && (
        <form action={cancelAction as unknown as (formData: FormData) => Promise<void>} className="mt-6">
          <button type="submit" className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100">
            Annuler ce paiement
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-neutral-900">{value}</dd>
    </div>
  );
}
