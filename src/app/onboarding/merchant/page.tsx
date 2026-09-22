'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitOnboarding } from './actions';

const OPERATORS = ['Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click'] as const;
const BUSINESS_TYPES = [
  { value: 'sarl', label: 'SARL' },
  { value: 'sa', label: 'SA' },
  { value: 'individual', label: 'Personne physique' },
  { value: 'association', label: 'Association' },
  { value: 'public', label: 'Établissement public' },
  { value: 'autre', label: 'Autre' },
];

const STEPS = [
  { n: 1, num: '01', label: 'Identité' },
  { n: 2, num: '02', label: 'Contact' },
  { n: 3, num: '03', label: 'Opérateur' },
  { n: 4, num: '04', label: 'Récapitulatif' },
] as const;

type Form = {
  name: string;
  legal_name: string;
  business_type: string;
  rc_number: string;
  nif: string;
  contact_phone: string;
  address: string;
  city: string;
  operator_method: string;
  operator_phone: string;
  operator_label: string;
};

const INITIAL: Form = {
  name: '', legal_name: '', business_type: '', rc_number: '', nif: '',
  contact_phone: '', address: '', city: 'Nouakchott',
  operator_method: 'Bankily', operator_phone: '', operator_label: '',
};

export default function OnboardingMerchantPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<Form>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function next() {
    setError(null);
    if (step === 1 && !form.name.trim()) {
      setError('Nom commercial requis');
      return;
    }
    if (step === 3 && !form.operator_phone.trim()) {
      setError('Numéro marchand requis');
      return;
    }
    setStep((s) => (s + 1) as typeof step);
  }
  function back() {
    setError(null);
    setStep((s) => (s - 1) as typeof step);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await submitOnboarding(form);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Erreur inconnue');
      return;
    }
    router.push('/dashboard?welcome=1');
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] py-10 sm:py-16 px-4">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="kp-eyebrow text-[var(--bronze)] mb-3">— Configuration marchand</p>
          <h1 className="kp-section-title text-[var(--ink)]">
            Bienvenue chez <em>KitPay</em>
          </h1>
          <p className="mt-3 text-sm text-[var(--stone-600)] leading-relaxed">
            Quatre étapes pour configurer votre compte marchand. Vous pourrez tester
            l&apos;intégration immédiatement après.
          </p>
        </header>

        {/* Progress steps */}
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <li
                key={s.n}
                className={`flex flex-col gap-1 border-t-2 pt-3 transition-colors duration-200 ${
                  active
                    ? 'border-[var(--bronze)]'
                    : done
                      ? 'border-[var(--forest)]'
                      : 'border-[var(--stone-200)]'
                }`}
              >
                <span
                  className={`font-mono text-[10px] tracking-[0.25em] ${
                    active
                      ? 'text-[var(--bronze)]'
                      : done
                        ? 'text-[var(--forest)]'
                        : 'text-[var(--stone-400)]'
                  }`}
                >
                  {s.num}
                </span>
                <span
                  className={`text-sm font-medium ${
                    active || done ? 'text-[var(--ink)]' : 'text-[var(--stone-500)]'
                  } ${active ? 'serif italic' : ''}`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="bg-white border border-[var(--stone-200)] rounded-sm p-6 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_24px_60px_-24px_rgba(58,52,42,0.18)]">
          {step === 1 && (
            <fieldset className="space-y-4">
              <legend className="serif text-xl font-medium text-[var(--ink)] mb-2 italic">
                Identité business
              </legend>
              <Input
                label="Nom commercial *"
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="Ma boutique, Cafe Central..."
              />
              <Input
                label="Raison sociale"
                value={form.legal_name}
                onChange={(v) => set('legal_name', v)}
                placeholder="Ma SARL"
              />
              <Select
                label="Type"
                value={form.business_type}
                onChange={(v) => set('business_type', v)}
                options={[{ value: '', label: '—' }, ...BUSINESS_TYPES]}
              />
              <Input
                label="N° Registre de Commerce"
                value={form.rc_number}
                onChange={(v) => set('rc_number', v)}
                placeholder="12345/2024"
              />
              <Input label="NIF" value={form.nif} onChange={(v) => set('nif', v)} />
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="space-y-4">
              <legend className="serif text-xl font-medium text-[var(--ink)] mb-2 italic">
                Contact
              </legend>
              <Input
                label="Téléphone contact"
                value={form.contact_phone}
                onChange={(v) => set('contact_phone', v)}
                placeholder="22 12 34 56"
              />
              <Input
                label="Adresse"
                value={form.address}
                onChange={(v) => set('address', v)}
                placeholder="Tevragh Zeina, Lot 4"
              />
              <Input label="Ville" value={form.city} onChange={(v) => set('city', v)} />
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="space-y-4">
              <legend className="serif text-xl font-medium text-[var(--ink)] mb-2 italic">
                Premier opérateur de paiement
              </legend>
              <p className="text-sm text-[var(--stone-600)] leading-relaxed">
                Le numéro de téléphone qui reçoit les SMS Bankily/Masrvi/etc. C&apos;est
                ce numéro que les clients vont créditer.
              </p>
              <Select
                label="Opérateur"
                value={form.operator_method}
                onChange={(v) => set('operator_method', v)}
                options={OPERATORS.map((op) => ({ value: op, label: op }))}
              />
              <Input
                label="Numéro marchand *"
                value={form.operator_phone}
                onChange={(v) => set('operator_phone', v)}
                placeholder="46 XX XX XX"
              />
              <Input
                label="Libellé interne"
                value={form.operator_label}
                onChange={(v) => set('operator_label', v)}
                placeholder="Bankily principal"
              />
            </fieldset>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="serif text-xl font-medium text-[var(--ink)] mb-2 italic">
                Récapitulatif
              </h2>
              <ul className="border border-[var(--stone-200)] rounded-sm divide-y divide-[var(--stone-100)] bg-[var(--paper-warm)]/40">
                <Recap label="Nom" value={form.name} />
                <Recap label="Raison sociale" value={form.legal_name} />
                <Recap label="Type" value={form.business_type} />
                <Recap label="RC" value={form.rc_number} mono />
                <Recap label="NIF" value={form.nif} mono />
                <Recap label="Téléphone" value={form.contact_phone} mono />
                <Recap
                  label="Adresse"
                  value={`${form.address}${form.address ? ', ' : ''}${form.city}`}
                />
                <Recap
                  label="Opérateur"
                  value={`${form.operator_method} · ${form.operator_phone}`}
                  mono
                />
              </ul>
              <p className="border border-[var(--bronze)]/40 bg-[var(--gold-soft)]/40 rounded-sm px-4 py-3 text-sm text-[var(--stone-700)] leading-relaxed">
                Statut : <strong className="font-mono">pending_kyc</strong>. Votre compte
                sera en mode test seulement jusqu&apos;à validation KYC. Vous pourrez
                intégrer KitPay et tester votre flow dès maintenant.
              </p>
            </div>
          )}

          {error && (
            <p
              className="mt-5 text-sm text-[#9b1c1c] border-l-2 border-[#9b1c1c] pl-3"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 pt-6 border-t border-[var(--stone-200)]">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 || submitting}
              className="kp-btn kp-btn-ghost text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                disabled={submitting}
                className="kp-btn kp-btn-primary text-xs"
              >
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="kp-btn kp-btn-accent text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Création…' : 'Créer mon compte marchand'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="kp-eyebrow text-[var(--bronze)] block mb-2">— {label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-sm border border-[var(--stone-200)] bg-white px-3 py-2.5 text-[var(--ink)] placeholder:text-[var(--stone-400)] focus:border-[var(--bronze)] focus:outline-none focus:ring-1 focus:ring-[var(--bronze)] transition-colors duration-200"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="kp-eyebrow text-[var(--bronze)] block mb-2">— {label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-sm border border-[var(--stone-200)] bg-white px-3 py-2.5 text-[var(--ink)] focus:border-[var(--bronze)] focus:outline-none focus:ring-1 focus:ring-[var(--bronze)] transition-colors duration-200 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Recap({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="kp-eyebrow text-[var(--stone-500)]">— {label}</span>
      <span
        className={`text-right text-[var(--ink)] ${
          mono ? 'font-mono text-[13px]' : 'serif italic font-medium'
        }`}
      >
        {value || '—'}
      </span>
    </li>
  );
}
