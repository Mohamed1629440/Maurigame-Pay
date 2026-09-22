import { PageHeader } from '@/components/dashboard/PageHeader';

export const metadata = { title: 'Développeurs · KitPay' };

const ENDPOINTS = [
  { method: 'POST', path: '/v1/intents', desc: 'Créer un intent de paiement' },
  { method: 'GET', path: '/v1/intents/:ref', desc: 'Récupérer un intent' },
  { method: 'GET', path: '/v1/intents', desc: 'Lister les intents (cursor pagination)' },
  { method: 'POST', path: '/v1/intents/:ref/cancel', desc: 'Annuler un intent pending' },
  { method: 'POST', path: '/v1/test/simulate-payment', desc: 'Simuler un paiement (mode test)' },
];

export default async function DevelopersPage() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://YOUR_DOMAIN';

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Documentation"
        title={<><em>Développeurs</em></>}
        description="Intégrez KitPay dans votre SaaS. L'API suit le pattern Stripe — auth Bearer, JSON body, idempotency keys, webhooks signés HMAC."
      />

      <Section eyebrow="01 · Authentification" title="Bearer token API">
        <p className="text-sm text-[var(--stone-700)] leading-relaxed mb-3">
          Créez vos clés API dans{' '}
          <a
            href="/dashboard/api-keys"
            className="text-[var(--bronze)] hover:text-[var(--ink)] transition-colors duration-200 underline-offset-2 hover:underline"
          >
            Clés API
          </a>
          . Préfixe <code className="font-mono text-[12px] bg-[var(--paper-warm)] px-1.5 py-0.5 rounded-sm">kp_test_*</code>{' '}
          pour la sandbox, <code className="font-mono text-[12px] bg-[var(--paper-warm)] px-1.5 py-0.5 rounded-sm">kp_live_*</code>{' '}
          pour la prod (KYC requis).
        </p>
      </Section>

      <Section eyebrow="02 · Exemple curl" title="Créer un intent">
        <pre className="kp-code">
{`curl -X POST ${origin}/api/v1/intents \\
  -H "Authorization: Bearer kp_test_xxx" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '`}<span className="num">{`{
    "amount": 5000,
    "method": "Bankily",
    "description": "Audit IA Express",
    "success_url": "https://votresaas.com/payment/success",
    "cancel_url": "https://votresaas.com/payment/cancel",
    "metadata": { "invoice_id": "inv_123" }
  }`}</span>{`'`}
        </pre>
      </Section>

      <Section eyebrow="03 · Méthodes supportées" title="5 opérateurs mauritaniens">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click'].map((m) => (
            <div
              key={m}
              className="font-mono text-sm text-[var(--ink)] bg-white border border-[var(--stone-200)] rounded-sm px-3 py-2"
            >
              {m}
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="04 · Endpoints REST" title="API publique /v1">
        <ul className="space-y-2">
          {ENDPOINTS.map((e) => (
            <li
              key={e.path}
              className="flex items-center gap-3 bg-white border border-[var(--stone-200)] rounded-sm px-3 py-2.5"
            >
              <span
                className={`font-mono text-[10px] tracking-wider uppercase rounded-sm px-2 py-0.5 shrink-0 ${
                  e.method === 'POST'
                    ? 'bg-[var(--bronze)] text-white'
                    : 'border border-[var(--stone-300)] text-[var(--stone-700)] bg-[var(--paper-warm)]'
                }`}
              >
                {e.method}
              </span>
              <code className="font-mono text-[13px] text-[var(--ink)] truncate">
                {e.path}
              </code>
              <span className="ml-auto text-xs text-[var(--stone-500)] hidden sm:block truncate">
                {e.desc}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-10 pt-6 border-t border-[var(--stone-200)] font-mono text-[11px] text-[var(--stone-500)] tracking-wider">
        — SDK npm <span className="text-[var(--bronze)]">@kitpay/node</span> et doc complète à venir.
      </p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <p className="kp-eyebrow text-[var(--bronze)] mb-2">— {eyebrow}</p>
      <h2 className="serif text-xl font-medium text-[var(--ink)] mb-4">{title}</h2>
      {children}
    </section>
  );
}
