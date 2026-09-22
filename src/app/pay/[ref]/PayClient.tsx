'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  intentRef: string;
  initialStatus: string;
  amount: number;
  method: string;
  description: string | null;
  merchantName: string;
  merchantLogoUrl: string | null;
  brandColor: string;
  merchantPhone: string;
  merchantDisplayCode: string | null;
  expiresAt: string;
  successUrl: string | null;
  cancelUrl: string | null;
};

export function PayClient({
  intentRef,
  initialStatus,
  amount,
  method,
  description,
  merchantName,
  merchantLogoUrl,
  brandColor,
  merchantPhone,
  merchantDisplayCode,
  expiresAt,
  successUrl,
  cancelUrl,
}: Props) {
  const ref = intentRef;
  const [status, setStatus] = useState(initialStatus);
  const [now, setNow] = useState(Date.now());
  const expiryMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const remaining = Math.max(0, Math.floor((expiryMs - now) / 1000));

  const methodKey = method.toLowerCase();
  const methodLogo = METHOD_LOGOS[methodKey] ?? null;
  const methodLabel = METHOD_LABELS[methodKey] ?? method;
  const isGimtel = GIMTEL_METHODS.has(methodKey);
  const isCodeMethod = CODE_METHODS.has(methodKey);

  useEffect(() => {
    if (status !== 'pending') return;

    const supabase = createSupabaseBrowserClient();
    const poll = setInterval(async () => {
      const { data } = await supabase
        .rpc('get_intent_public', { p_ref: ref });
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.status && row.status !== status) setStatus(row.status);
    }, 5000);

    return () => clearInterval(poll);
  }, [ref, status]);

  useEffect(() => {
    if (status !== 'pending') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== 'paid') return;
    fetch('/api/internal/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    }).catch(() => {/* silent */});
  }, [status, ref]);

  useEffect(() => {
    if (status === 'paid' && successUrl) {
      const id = setTimeout(() => {
        window.location.href = successUrl;
      }, 3000);
      return () => clearTimeout(id);
    }
  }, [status, successUrl]);

  if (status === 'paid') {
    return (
      <div className="text-center py-2">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--forest)]/[0.08] border border-[var(--forest)]/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--forest)]"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="kp-eyebrow text-[var(--forest)] mb-2">— Paiement reçu</p>
        <h1 className="serif text-3xl font-medium text-[var(--ink)] leading-none tracking-tight">
          {formatAmount(amount)}
        </h1>
        {successUrl && (
          <>
            <p className="mt-5 text-sm text-[var(--stone-600)]">Redirection en cours…</p>
            <a href={successUrl} className="kp-link mt-3 inline-block">
              Continuer maintenant
            </a>
          </>
        )}
      </div>
    );
  }

  if (status === 'expired' || (status === 'pending' && remaining === 0)) {
    return (
      <div className="text-center py-2">
        <p className="kp-eyebrow text-[var(--stone-500)] mb-2">— Délai écoulé</p>
        <h1 className="serif text-2xl font-medium text-[var(--ink)] italic">
          Le paiement n&rsquo;a pas été reçu
        </h1>
        <p className="mt-3 text-sm text-[var(--stone-600)] leading-relaxed">
          La fenêtre de validation est dépassée.
        </p>
        {cancelUrl && (
          <a href={cancelUrl} className="kp-btn kp-btn-ghost mt-7">
            Recommencer
          </a>
        )}
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="text-center py-2">
        <p className="kp-eyebrow text-[var(--stone-500)] mb-2">— Annulé</p>
        <h1 className="serif text-2xl font-medium text-[var(--ink)] italic">
          Paiement annulé
        </h1>
        {cancelUrl && (
          <a href={cancelUrl} className="kp-btn kp-btn-ghost mt-7">
            Retour
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-2">
        <h1 className="serif text-2xl sm:text-[26px] font-medium text-[var(--ink)] tracking-tight">
          Payer via <em className="italic">{methodLabel}</em>
          {isGimtel && (
            <span className="ml-2 font-mono not-italic text-base font-normal text-[var(--stone-500)]">
              · GIMTEL
            </span>
          )}
        </h1>
        <p className="mt-2 text-sm text-[var(--stone-600)] leading-relaxed">
          {isGimtel
            ? 'Utilisez le numéro ci-dessous pour effectuer le paiement via GIMTEL.'
            : isCodeMethod
            ? `Saisissez le code commerçant ci-dessous dans l'appli ${methodLabel} pour effectuer le paiement.`
            : 'Envoyez le montant exact ci-dessous au numéro indiqué.'}
        </p>
      </div>

      {isGimtel && <GimtelNotice methodLabel={methodLabel} />}

      <div className="mt-6 text-center">
        <p className="kp-eyebrow text-[var(--bronze)] mb-2">— Montant à envoyer</p>
        <CopyableAmount amount={amount} />
        {description && (
          <p className="mt-3 text-sm text-[var(--stone-600)] italic serif">
            {description}
          </p>
        )}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3 px-2">
        <MethodBadge logo={methodLogo} label={methodLabel} />
        <FlowArrow remaining={remaining} isGimtel={isGimtel} />
        <MerchantBadge logoUrl={merchantLogoUrl} name={merchantName} brandColor={brandColor} />
      </div>

      <ul className="mt-7 bg-[var(--paper-warm)] border border-[var(--stone-200)] rounded-sm divide-y divide-[var(--stone-200)]">
        <Row label="Statut">
          <span className="inline-flex items-center gap-1.5 bg-[var(--gold-soft)]/50 text-[var(--bronze)] font-mono text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-sm">
            <span className="kp-pulse" aria-hidden="true" />
            En attente de paiement
          </span>
        </Row>
        <Row label={isCodeMethod ? 'Code commerçant' : 'Numéro à payer'} value={isCodeMethod ? (merchantDisplayCode ?? merchantPhone) : formatPhone(merchantPhone)} copy={isCodeMethod ? (merchantDisplayCode ?? merchantPhone) : merchantPhone} mono />
        <Row label="Référence" value={ref} copy={ref} mono />
        <Row label="Total à payer" emphasis>
          <span className="serif italic font-semibold text-[var(--ink)]">{formatAmount(amount)}</span>
        </Row>
      </ul>

      <details className="mt-5 bg-white border border-[var(--stone-200)] rounded-sm px-4 py-3 text-xs group">
        <summary className="cursor-pointer kp-eyebrow text-[var(--stone-500)] hover:text-[var(--ink)] transition-colors duration-200 select-none list-none flex items-center gap-1">
          <span className="inline-block transition-transform duration-200 group-open:rotate-90">
            ›
          </span>
          Comment payer avec {methodLabel}{isGimtel ? ' via GIMTEL' : ''} ?
        </summary>
        {isCodeMethod ? (
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-[var(--stone-700)] leading-relaxed">
            <li>
              Ouvrez l&apos;application <strong className="text-[var(--ink)]">{methodLabel}</strong> sur votre téléphone.
            </li>
            <li>Choisissez « Paiement marchand » ou « Payer un commerçant ».</li>
            <li>
              Saisissez le code commerçant{' '}
              <code className="font-mono text-[var(--ink)]">{merchantDisplayCode ?? merchantPhone}</code>.
            </li>
            <li>
              Saisissez exactement{' '}
              <strong className="serif italic text-[var(--ink)]">{formatAmount(amount)}</strong>.
            </li>
            <li>Validez. Cette page se met à jour automatiquement dès la confirmation.</li>
          </ol>
        ) : (
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-[var(--stone-700)] leading-relaxed">
            <li>
              Ouvrez l&apos;application{' '}
              <strong className="text-[var(--ink)]">{methodLabel}</strong> sur votre téléphone.
            </li>
            <li>Choisissez « Transfert » ou « Envoyer de l&apos;argent ».</li>
            <li>
              Saisissez le numéro{' '}
              <code className="font-mono text-[var(--ink)]">{formatPhone(merchantPhone)}</code>.
            </li>
            {isGimtel && (
              <li className="font-medium text-[var(--ink)]">
                Sélectionnez l&apos;opérateur{' '}
                <span className="inline-flex items-center gap-1">
                  <img src="/payments/click.png" alt="Click" className="inline h-4 w-4 object-contain rounded-sm border border-[var(--stone-200)]" />
                  <strong>Click</strong>
                </span>{' '}
                dans la liste des opérateurs GIMTEL.
              </li>
            )}
            <li>
              Saisissez exactement{' '}
              <strong className="serif italic text-[var(--ink)]">{formatAmount(amount)}</strong>.
            </li>
            <li>Validez. Cette page se met à jour automatiquement dès la confirmation.</li>
          </ol>
        )}
      </details>

      <div className="mt-5 flex items-center justify-center gap-2 pt-4 border-t border-[var(--stone-200)]">
        <span className="kp-pulse" aria-hidden="true" />
        <span className="kp-eyebrow text-[var(--stone-500)]">— Expire dans</span>
        <span className="font-mono font-semibold tabular-nums text-[var(--ink)] text-sm">
          {formatTime(remaining)}
        </span>
      </div>

      {cancelUrl && (
        <a href={cancelUrl} className="block mt-5 text-center text-sm font-medium text-[#c0392b] hover:text-[#a02718] underline underline-offset-4 transition-colors duration-200">
          Annuler le paiement
        </a>
      )}
      <input type="hidden" data-brand-color={brandColor} />
    </div>
  );
}

function CopyableAmount({ amount }: { amount: number }) {
  const [copied, setCopied] = useState(false);
  const text = String(amount);

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silent */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Cliquer pour copier le montant"
      className="group inline-flex items-baseline gap-3 cursor-pointer"
    >
      <span className="serif text-5xl sm:text-6xl font-medium text-[var(--ink)] leading-none tracking-tight group-hover:text-[var(--bronze)] transition-colors duration-200">
        {amount.toLocaleString('fr-FR')}
      </span>
      <span className="text-2xl text-[var(--stone-500)] font-normal">MRU</span>
      <span
        className={`ml-1 inline-flex items-center justify-center h-6 w-6 rounded-sm border transition-colors duration-200 ${
          copied
            ? 'border-[var(--forest)] text-[var(--forest)] bg-[var(--forest)]/[0.08]'
            : 'border-[var(--stone-300)] text-[var(--stone-500)] group-hover:border-[var(--bronze)] group-hover:text-[var(--bronze)]'
        }`}
        aria-hidden="true"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
    </button>
  );
}

function MethodBadge({ logo, label }: { logo: string | null; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className="h-12 w-12 rounded-sm bg-white border border-[var(--stone-200)] flex items-center justify-center overflow-hidden">
        {logo ? (
          <img src={logo} alt={label} className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="serif italic text-[var(--bronze)] text-base">{label.charAt(0)}</span>
        )}
      </div>
      <p className="kp-eyebrow text-[var(--stone-500)] text-[10px]">— {label}</p>
    </div>
  );
}

function MerchantBadge({
  logoUrl,
  name,
  brandColor,
}: {
  logoUrl: string | null;
  name: string;
  brandColor: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className="h-12 w-12 rounded-sm border border-[var(--stone-200)] flex items-center justify-center overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center text-white serif font-medium"
            style={{ backgroundColor: brandColor }}
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className="kp-eyebrow text-[var(--stone-500)] text-[10px] text-center max-w-[120px] truncate">
        — {name}
      </p>
    </div>
  );
}

function FlowArrow({ remaining, isGimtel }: { remaining: number; isGimtel?: boolean }) {
  const pulse = remaining > 0;
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 min-w-[48px]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="14"
        viewBox="0 0 32 14"
        fill="none"
        className={`text-[var(--bronze)] ${pulse ? 'kp-arrow-pulse' : ''}`}
        aria-hidden="true"
      >
        <path
          d="M0 7h28M22 1l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isGimtel && (
        <span className="inline-flex items-center gap-1">
          <img src="/payments/click.png" alt="Click" className="h-4 w-4 object-contain" />
          <span className="font-mono text-[10px] text-[var(--stone-500)] tracking-wide">Click</span>
        </span>
      )}
    </div>
  );
}

function GimtelNotice({ methodLabel }: { methodLabel: string }) {
  return (
    <div className="mt-5 flex items-start gap-3 bg-[var(--ink)] text-white rounded-sm px-4 py-3.5">
      <div className="shrink-0 mt-0.5 h-8 w-8 rounded-sm bg-white/10 flex items-center justify-center">
        <img src="/payments/click.png" alt="Click" className="h-6 w-6 object-contain" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] tracking-widest uppercase text-white/60 mb-1">
          Via GIMTEL · Click
        </p>
        <p className="text-sm leading-snug text-white">
          Après avoir saisi le numéro dans{' '}
          <strong>{methodLabel}</strong>, sélectionnez l&apos;opérateur{' '}
          <strong>Click</strong> dans la liste GIMTEL avant de valider.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  copy,
  mono,
  emphasis,
  children,
}: {
  label: string;
  value?: string;
  copy?: string;
  mono?: boolean;
  emphasis?: boolean;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!copy) return;
    try {
      await navigator.clipboard?.writeText(copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silent */
    }
  }

  return (
    <li className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${emphasis ? 'bg-white/40' : ''}`}>
      <span className={`kp-eyebrow ${emphasis ? 'text-[var(--ink)]' : 'text-[var(--stone-500)]'}`}>
        — {label}
      </span>
      {children ? (
        <span className="text-right">{children}</span>
      ) : copy ? (
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 text-right text-[var(--ink)] hover:text-[var(--bronze)] transition-colors duration-200 cursor-pointer ${
            mono ? 'font-mono' : 'serif italic font-medium'
          }`}
          title="Cliquer pour copier"
        >
          <span>{value}</span>
          <span
            className={`inline-flex items-center justify-center h-5 w-5 rounded-sm border transition-colors duration-200 ${
              copied
                ? 'border-[var(--forest)] text-[var(--forest)] bg-[var(--forest)]/[0.08]'
                : 'border-[var(--stone-300)] text-[var(--stone-400)]'
            }`}
            aria-hidden="true"
          >
            {copied ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </span>
        </button>
      ) : (
        <span className={`text-right text-[var(--ink)] ${mono ? 'font-mono' : 'serif italic font-medium'}`}>
          {value}
        </span>
      )}
    </li>
  );
}

const GIMTEL_METHODS = new Set(['bankily']);
const CODE_METHODS = new Set(['bim', 'masrvi', 'click', 'sedad', 'bcipay']);

const METHOD_LOGOS: Record<string, string> = {
  bankily: '/payments/bankily.png',
  masrvi: '/payments/masrvi.png',
  sedad: '/payments/sedad.png',
  bim: '/payments/bim.png',
  click: '/payments/click.png',
  bcipay: '/payments/bcipay.png',
};

const METHOD_LABELS: Record<string, string> = {
  bankily: 'Bankily',
  masrvi: 'Masrvi',
  sedad: 'Sedad',
  bim: 'BIM',
  click: 'Click',
  bcipay: 'BCIPAY',
};

function formatAmount(n: number) {
  return `${n.toLocaleString('fr-FR')} MRU`;
}

function formatPhone(p: string) {
  const cleaned = p.replace(/\D/g, '');
  if (cleaned.length === 8)
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)}`;
  return p;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
