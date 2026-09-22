'use client';

import { useState, useTransition } from 'react';
import { updateMerchantSettings } from './actions';

type FormState = {
  name: string;
  legal_name: string;
  rc_number: string;
  nif: string;
  contact_phone: string;
  address: string;
  city: string;
  brand_color: string;
};

export function SettingsForm({ initial }: { initial: FormState }) {
  const [form, setForm] = useState<FormState>(initial);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function submit() {
    setErr(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateMerchantSettings(form);
      if (!res.ok) setErr(res.error ?? 'Erreur de sauvegarde');
      else setSaved(true);
    });
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <Field label="Nom commercial">
        <input value={form.name} onChange={e => update('name', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Raison sociale">
        <input value={form.legal_name} onChange={e => update('legal_name', e.target.value)}
          placeholder="Ex: MA SARL"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="N° RC">
          <input value={form.rc_number} onChange={e => update('rc_number', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="NIF">
          <input value={form.nif} onChange={e => update('nif', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </Field>
      </div>

      <Field label="Téléphone de contact">
        <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)}
          placeholder="Ex: 22XXXXXXX"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Adresse">
        <input value={form.address} onChange={e => update('address', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Ville">
        <input value={form.city} onChange={e => update('city', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </Field>

      <Field label="Couleur de marque">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={form.brand_color}
            onChange={e => update('brand_color', e.target.value)}
            className="h-10 w-16 rounded border border-neutral-300"
          />
          <input
            value={form.brand_color}
            onChange={e => update('brand_color', e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </div>
      </Field>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {saved && <p className="text-sm text-emerald-700">✓ Paramètres sauvegardés.</p>}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
