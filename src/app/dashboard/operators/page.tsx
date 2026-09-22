import { requireMerchant } from '@/lib/dashboard/queries';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { AddOperatorButton } from './AddOperatorButton';
import { toggleOperator, deleteOperator } from './actions';
import { PageHeader } from '@/components/dashboard/PageHeader';

export default async function OperatorsPage() {
  const { merchant, supabase } = await requireMerchant();
  const { data: ops } = await supabase
    .from('merchant_operators')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at');

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title={<><em>Opérateurs</em> de paiement</>}
        description="Numéros marchands (ou codes commerçants pour BIM/Masrvi) qui reçoivent les SMS de paiement."
        action={<AddOperatorButton />}
      />

      {!ops || ops.length === 0 ? (
        <EmptyState
          title="Aucun opérateur"
          description="Ajoutez le premier numéro marchand qui reçoit les SMS de paiement."
          action={<AddOperatorButton />}
        />
      ) : (
        <ul className="bg-white border border-[var(--stone-200)] rounded-sm divide-y divide-[var(--stone-100)] overflow-hidden">
          {ops.map((op) => (
            <li
              key={op.id}
              className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--stone-50)] transition-colors duration-150"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="serif text-base font-medium text-[var(--ink)] italic">
                    {op.method}
                  </span>
                  <span className="font-mono text-sm text-[var(--stone-700)]">
                    {op.expected_phone}
                  </span>
                  {(op.method === 'BIM' || op.method === 'Masrvi') && op.merchant_code && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--stone-400)] border border-[var(--stone-200)] rounded-sm px-1.5 py-0.5">
                      code: {op.merchant_code}
                    </span>
                  )}
                </div>
                {op.label && (
                  <p className="mt-1 text-xs text-[var(--stone-500)]">{op.label}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <form
                  action={
                    toggleOperator.bind(null, op.id, !op.enabled) as unknown as (
                      formData: FormData
                    ) => Promise<void>
                  }
                >
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase border rounded-sm px-2.5 py-1 cursor-pointer transition-colors duration-200 ${
                      op.enabled
                        ? 'border-[var(--forest)]/40 text-[var(--forest)] bg-[var(--forest)]/[0.06] hover:bg-[var(--forest)]/[0.1]'
                        : 'border-[var(--stone-300)] text-[var(--stone-500)] bg-[var(--stone-100)] hover:bg-[var(--stone-200)]'
                    }`}
                  >
                    {op.enabled && <span className="kp-pulse" aria-hidden="true" />}
                    {op.enabled ? 'Activé' : 'Désactivé'}
                  </button>
                </form>
                <form
                  action={
                    deleteOperator.bind(null, op.id) as unknown as (
                      formData: FormData
                    ) => Promise<void>
                  }
                >
                  <button
                    type="submit"
                    className="font-mono text-[10px] tracking-wider uppercase border border-[var(--stone-200)] text-[#9b1c1c] hover:bg-[#fef2f2] hover:border-[#9b1c1c]/40 rounded-sm px-2.5 py-1 cursor-pointer transition-colors duration-200"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
