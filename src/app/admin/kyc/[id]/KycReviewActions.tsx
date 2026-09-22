'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/dashboard/Modal';
import { approveKyc, rejectKyc } from './actions';

export function KycReviewActions({ merchantId, status }: { merchantId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function approve() {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = await approveKyc(merchantId);
      if (!res.ok) setErr(res.error ?? 'Erreur');
      else {
        setMsg('✓ Marchand validé.');
        router.refresh();
      }
    });
  }

  function reject() {
    if (!note.trim()) {
      setErr('Note obligatoire pour un refus.');
      return;
    }
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = await rejectKyc(merchantId, note.trim());
      if (!res.ok) setErr(res.error ?? 'Erreur');
      else {
        setMsg('Refus enregistré.');
        setRejectOpen(false);
        setNote('');
        router.refresh();
      }
    });
  }

  if (status === 'active') {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        ✓ Ce marchand est déjà validé.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Décision</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={approve}
          disabled={pending}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? 'Traitement…' : 'Valider le KYC'}
        </button>
        <button
          onClick={() => setRejectOpen(true)}
          disabled={pending}
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 disabled:opacity-50"
        >
          Refuser…
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Refuser le KYC">
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Indiquez la raison du refus. Le marchand pourra re-soumettre après corrections.
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            placeholder="Ex: La pièce d'identité est illisible, merci de re-uploader une version plus nette."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectOpen(false)}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={reject}
              disabled={pending || !note.trim()}
              className="rounded-md bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {pending ? 'Envoi…' : 'Confirmer le refus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
