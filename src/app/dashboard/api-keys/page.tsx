import { requireMerchant } from '@/lib/dashboard/queries';
import { CreateKeyButton } from './CreateKeyButton';
import { revokeApiKey } from './actions';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

export default async function ApiKeysPage() {
  const { merchant, supabase } = await requireMerchant();
  const { data: keys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Développeurs"
        title={<>Clés <em>API</em></>}
        description="Authentification Bearer pour l'API REST KitPay. Les clés live nécessitent un KYC validé."
        action={<CreateKeyButton kycActive={merchant.status === 'active'} />}
      />

      {!keys || keys.length === 0 ? (
        <EmptyState
          title="Aucune clé API"
          description="Créez votre première clé pour commencer l'intégration. Une clé test est dispo immédiatement."
        />
      ) : (
        <div className="bg-white border border-[var(--stone-200)] rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--stone-200)] bg-[var(--paper-warm)]">
              <tr>
                {['Label', 'Mode', 'Préfixe', 'Dernière utilisation', 'État', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--stone-500)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  className="border-t border-[var(--stone-100)] hover:bg-[var(--stone-50)] transition-colors duration-150"
                >
                  <td className="px-4 py-3 serif text-[var(--ink)]">{k.label ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ModeBadge mode={k.mode} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[var(--stone-700)]">
                    {k.key_prefix}…
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--stone-500)]">
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleString('fr-FR')
                      : 'Jamais'}
                  </td>
                  <td className="px-4 py-3">
                    {k.revoked_at ? (
                      <span className="inline-flex items-center font-mono text-[10px] tracking-wider uppercase border border-[var(--stone-300)] text-[var(--stone-500)] bg-[var(--stone-100)] rounded-sm px-2 py-0.5">
                        Révoquée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase border border-[var(--forest)]/40 text-[var(--forest)] bg-[var(--forest)]/[0.06] rounded-sm px-2 py-0.5">
                        <span className="kp-pulse" aria-hidden="true" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revoked_at && (
                      <form
                        action={
                          revokeApiKey.bind(null, k.id) as unknown as (
                            formData: FormData
                          ) => Promise<void>
                        }
                      >
                        <button
                          type="submit"
                          className="font-mono text-[10px] tracking-wider uppercase text-[#9b1c1c] hover:text-[#7f1818] transition-colors duration-200 cursor-pointer"
                        >
                          — Révoquer
                        </button>
                      </form>
                    )}
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

function ModeBadge({ mode }: { mode: string }) {
  if (mode === 'test') {
    return (
      <span className="inline-flex items-center font-mono text-[10px] tracking-wider uppercase border border-[var(--bronze)]/40 text-[var(--bronze)] bg-[var(--gold-soft)]/40 rounded-sm px-2 py-0.5">
        Test
      </span>
    );
  }
  return (
    <span className="inline-flex items-center font-mono text-[10px] tracking-wider uppercase border border-[var(--forest)]/40 text-[var(--forest)] bg-[var(--forest)]/[0.06] rounded-sm px-2 py-0.5">
      Live
    </span>
  );
}
