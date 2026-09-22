'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/dashboard/Modal';
import { addOperator } from './actions';

export function AddOperatorButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ method: 'Bankily', expected_phone: '', merchant_code: '', label: '' });

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await addOperator(form);
      if (!res.ok) setErr(res.error ?? null);
      else { setOpen(false); setForm({ method: 'Bankily', expected_phone: '', merchant_code: '', label: '' }); }
    });
  }

  const isCodeMethod = form.method === 'BIM' || form.method === 'Masrvi' || form.method === 'Click' || form.method === 'Sedad' || form.method === 'BCIPAY';

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">+ Ajouter opérateur</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un opérateur">
        <div className="space-y-3">
          <select value={form.method} onChange={e => setForm({...form, method: e.target.value})} className="w-full rounded-md border border-neutral-300 px-3 py-2">
            {['Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click', 'BCIPAY'].map(m => <option key={m}>{m}</option>)}
          </select>
          <input value={form.expected_phone} onChange={e => setForm({...form, expected_phone: e.target.value})} placeholder="Numéro du device qui reçoit les SMS (8 chiffres)" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          {isCodeMethod && (
            <input value={form.merchant_code} onChange={e => setForm({...form, merchant_code: e.target.value})} placeholder={`Code commerçant ${form.method} (ex: ${form.method === 'BIM' ? '05791' : form.method === 'Click' ? '060530' : form.method === 'Sedad' ? '08272' : form.method === 'BCIPAY' ? '02292' : '036240'})`} className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          )}
          <input value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder="Libellé (optionnel)" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button onClick={submit} disabled={pending} className="w-full rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Ajout…' : 'Ajouter'}</button>
        </div>
      </Modal>
    </>
  );
}
