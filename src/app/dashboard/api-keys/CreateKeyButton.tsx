'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/dashboard/Modal';
import { CopyButton } from '@/components/dashboard/CopyButton';
import { createApiKey } from './actions';

export function CreateKeyButton({ kycActive }: { kycActive: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showKey, setShowKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ mode: 'test' as 'test'|'live', label: '' });

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await createApiKey(form);
      if (!res.ok) setErr(res.error ?? null);
      else if (res.key) setShowKey(res.key);
    });
  }

  function close() {
    const wasShowingKey = showKey !== null;
    setOpen(false); setShowKey(null); setForm({ mode: 'test', label: '' });
    if (wasShowingKey) router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">+ Créer clé</button>
      <Modal open={open} onClose={close} title={showKey ? 'Clé créée — copiez-la maintenant' : 'Créer une clé API'}>
        {showKey ? (
          <div>
            <p className="text-sm text-amber-900">⚠ Cette clé ne sera plus jamais affichée. Copiez-la dans votre gestionnaire de mots de passe.</p>
            <pre className="mt-3 select-all rounded bg-neutral-900 p-3 font-mono text-xs text-neutral-100">{showKey}</pre>
            <div className="mt-3 flex justify-end gap-2">
              <CopyButton value={showKey}>Copier</CopyButton>
              <button onClick={close} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">J'ai sauvegardé</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <select value={form.mode} onChange={e => setForm({...form, mode: e.target.value as any})} className="w-full rounded-md border border-neutral-300 px-3 py-2">
              <option value="test">Test (kp_test_*)</option>
              <option value="live" disabled={!kycActive}>Live (kp_live_*) {!kycActive && '— KYC requis'}</option>
            </select>
            <input value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder="Label (ex: Production server)" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button onClick={submit} disabled={pending} className="w-full rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Création…' : 'Créer'}</button>
          </div>
        )}
      </Modal>
    </>
  );
}
