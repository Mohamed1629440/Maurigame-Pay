import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { PayClient } from './PayClient';
import { SimulateButton } from './SimulateButton';

export const metadata = { title: 'Paiement · KitPay' };
export const dynamic = 'force-dynamic';

type IntentRow = {
  ref: string;
  amount: number;
  method: string;
  status: string;
  mode: string;
  description: string | null;
  expires_at: string;
  paid_at: string | null;
  success_url: string | null;
  cancel_url: string | null;
  client_secret: string;
  merchant_id: string;
  merchant_operator_id: string | null;
};

type MerchantRow = {
  id: string;
  name: string;
  brand_color: string | null;
  logo_url: string | null;
};

export default async function PayPage({ params }: { params: { ref: string } }) {
  const admin = createSupabaseAdminClient();

  const { data: intent } = await admin
    .from('payment_intents')
    .select('ref, amount, method, status, mode, description, expires_at, paid_at, success_url, cancel_url, client_secret, merchant_id, merchant_operator_id')
    .eq('ref', params.ref)
    .maybeSingle<IntentRow>();

  if (!intent) {
    notFound();
  }

  const [{ data: merchant }, { data: operator }] = await Promise.all([
    admin
      .from('merchants')
      .select('id, name, brand_color, logo_url')
      .eq('id', intent.merchant_id)
      .maybeSingle<MerchantRow>(),
    intent.merchant_operator_id
      ? admin
          .from('merchant_operators')
          .select('expected_phone, merchant_code, method')
          .eq('id', intent.merchant_operator_id)
          .maybeSingle()
      : Promise.resolve({ data: null as null | { expected_phone: string; merchant_code: string | null; method: string } }),
  ]);

  const merchantName = merchant?.name ?? 'Marchand';
  const brandColor = merchant?.brand_color ?? '#171717';
  const logoUrl = merchant?.logo_url ?? null;
  const merchantPhone = operator?.expected_phone ?? '—';
  // For BIM: show the code commerçant (merchant_code) to the client, not the device phone
  const merchantDisplayCode = operator?.merchant_code ?? null;

  return (
    <main className="min-h-screen bg-[var(--paper)] py-10 sm:py-16 px-4">
      <div className="mx-auto max-w-md">
        {intent.cancel_url && (
          <a
            href={intent.cancel_url}
            className="inline-flex items-center gap-2 mb-4 text-[var(--stone-600)] hover:text-[var(--ink)] transition-colors duration-200 group"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--stone-300)] group-hover:border-[var(--bronze)] group-hover:bg-white transition-colors duration-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </span>
            <span className="kp-eyebrow">— Retour à {merchantName}</span>
          </a>
        )}

        {intent.mode === 'test' && (
          <div className="mb-4 flex items-center gap-2 border border-[var(--bronze)]/40 bg-[var(--gold-soft)]/40 rounded-sm px-4 py-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--bronze)]"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="kp-eyebrow text-[var(--bronze)]">
              — Mode test · paiement simulé
            </p>
          </div>
        )}

        <div className="bg-white border border-[var(--stone-200)] rounded-sm p-7 sm:p-9 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_24px_60px_-24px_rgba(58,52,42,0.18)]">
          <PayClient
            intentRef={intent.ref}
            initialStatus={intent.status}
            amount={intent.amount}
            method={intent.method}
            description={intent.description}
            merchantName={merchantName}
            merchantLogoUrl={logoUrl}
            brandColor={brandColor}
            merchantPhone={merchantPhone}
            merchantDisplayCode={merchantDisplayCode}
            expiresAt={intent.expires_at}
            successUrl={intent.success_url}
            cancelUrl={intent.cancel_url}
          />

          {intent.mode === 'test' && intent.status === 'pending' && (
            <div className="mt-6 pt-5 border-t border-[var(--stone-200)]">
              <SimulateButton refValue={intent.ref} clientSecret={intent.client_secret} />
            </div>
          )}
        </div>

        <p className="mt-6 text-center kp-eyebrow text-[var(--stone-500)]">
          — Sécurisé par KitPay · Mauritanie
        </p>
      </div>
    </main>
  );
}
