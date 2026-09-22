import { requireMerchant } from '@/lib/dashboard/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { SettingsForm } from './SettingsForm';
import { KycUploadCard } from './KycUploadCard';
import { PageHeader } from '@/components/dashboard/PageHeader';

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  pending_kyc: 'KYC en attente',
  suspended: 'Suspendu',
};

export default async function SettingsPage() {
  const { merchant } = await requireMerchant();

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from('merchants')
    .select(
      'id, name, legal_name, rc_number, nif, contact_phone, address, city, brand_color, status, kyc_documents'
    )
    .eq('id', merchant.id)
    .maybeSingle();

  const initial = {
    name: row?.name ?? '',
    legal_name: row?.legal_name ?? '',
    rc_number: row?.rc_number ?? '',
    nif: row?.nif ?? '',
    contact_phone: row?.contact_phone ?? '',
    address: row?.address ?? '',
    city: row?.city ?? 'Nouakchott',
    brand_color: row?.brand_color ?? '#171717',
  };

  const status = row?.status ?? 'pending_kyc';

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Compte marchand"
        title={<><em>Paramètres</em></>}
        description="Informations légales, marque et documents KYC. La validation KYC active le mode live."
      />

      <div className="bg-white border border-[var(--stone-200)] rounded-sm p-5 mb-8">
        <p className="kp-eyebrow text-[var(--stone-500)] mb-2">— Statut du compte</p>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase border rounded-sm px-2.5 py-1 ${
              status === 'active'
                ? 'border-[var(--forest)]/40 text-[var(--forest)] bg-[var(--forest)]/[0.06]'
                : status === 'suspended'
                  ? 'border-[#9b1c1c]/40 text-[#9b1c1c] bg-[#fef2f2]'
                  : 'border-[var(--bronze)]/40 text-[var(--bronze)] bg-[var(--gold-soft)]/40'
            }`}
          >
            {status === 'active' && <span className="kp-pulse" aria-hidden="true" />}
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
      </div>

      <SettingsForm initial={initial} />

      <KycUploadCard
        merchant={{
          id: merchant.id,
          status,
          kyc_documents: (row?.kyc_documents as Record<string, string> | null) ?? null,
        }}
      />
    </div>
  );
}
