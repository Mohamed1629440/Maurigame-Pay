import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export default async function AdminKycListPage() {
  const admin = createSupabaseAdminClient();

  const { data: rows } = await admin
    .from('merchants')
    .select('id, name, legal_name, owner_email, contact_phone, kyc_documents, created_at')
    .eq('status', 'pending_kyc')
    .order('created_at', { ascending: true });

  const merchants = (rows ?? []).filter(r => {
    const docs = (r.kyc_documents as Record<string, string> | null) ?? {};
    return docs.rc_url && docs.nif_url && docs.id_url;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">KYC en attente</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Marchands ayant soumis leurs 3 documents et en attente de validation.
      </p>

      {merchants.length === 0 ? (
        <div className="mt-8 rounded-lg bg-white p-6 text-sm text-neutral-500 shadow-sm">
          Aucun KYC en attente.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Marchand</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Soumis</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {merchants.map(m => (
                <tr key={m.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{m.name ?? '—'}</div>
                    <div className="text-xs text-neutral-500">{m.legal_name ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{m.owner_email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{m.contact_phone ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/kyc/${m.id}`}
                      className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white"
                    >
                      Examiner
                    </Link>
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
