import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { signedUrlFor } from '@/lib/storage';
import { KycReviewActions } from './KycReviewActions';

type DocLink = { label: string; url: string | null; path: string | null };

export default async function AdminKycDetailPage({ params }: { params: { id: string } }) {
  const admin = createSupabaseAdminClient();

  const { data: merchant } = await admin
    .from('merchants')
    .select('id, name, legal_name, rc_number, nif, contact_phone, owner_email, address, city, status, kyc_documents, kyc_notes, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!merchant) notFound();

  const docs = (merchant.kyc_documents as Record<string, string> | null) ?? {};

  const docLinks: DocLink[] = await Promise.all(
    [
      { label: 'Registre de commerce', key: 'rc_url' },
      { label: 'NIF', key: 'nif_url' },
      { label: 'Pièce d\'identité', key: 'id_url' },
    ].map(async d => {
      const path = docs[d.key] ?? null;
      const url = path ? await signedUrlFor(path, 3600) : null;
      return { label: d.label, url, path };
    })
  );

  return (
    <div>
      <Link href="/admin/kyc" className="text-xs text-neutral-500 hover:underline">← Retour à la liste</Link>

      <h1 className="mt-2 text-2xl font-bold text-neutral-900">{merchant.name ?? '—'}</h1>
      <p className="mt-1 text-sm text-neutral-600">{merchant.legal_name ?? ''}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Informations</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Email" value={merchant.owner_email} />
            <Row label="Téléphone" value={merchant.contact_phone} mono />
            <Row label="N° RC" value={merchant.rc_number} mono />
            <Row label="NIF" value={merchant.nif} mono />
            <Row label="Adresse" value={merchant.address} />
            <Row label="Ville" value={merchant.city} />
            <Row label="Statut" value={merchant.status} />
            <Row label="Inscrit" value={new Date(merchant.created_at).toLocaleString('fr-FR')} />
          </dl>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Documents</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {docLinks.map(d => (
              <li key={d.label} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                <span>{d.label}</span>
                {d.url ? (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white"
                  >
                    Voir →
                  </a>
                ) : (
                  <span className="text-xs text-neutral-400">Non fourni</span>
                )}
              </li>
            ))}
          </ul>
          {merchant.kyc_notes && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Note précédente :</p>
              <p className="mt-1">{merchant.kyc_notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <KycReviewActions merchantId={merchant.id} status={merchant.status} />
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}
