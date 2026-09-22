'use client';

import { useState, useTransition } from 'react';
import { reconcileOrphan } from './actions';

type Candidate = {
  ref: string;
  amount: number;
  method: string;
  customer_phone: string | null;
};

export function ReconcileForm({ orphanId, candidates }: { orphanId: string; candidates: Candidate[] }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [targetRef, setTargetRef] = useState<string>(candidates[0]?.ref ?? '');

  function submit() {
    if (!targetRef) {
      setErr('Sélectionnez un paiement candidat.');
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await reconcileOrphan({ orphan_id: orphanId, target_ref: targetRef });
      if (!res.ok) setErr(res.error ?? 'Erreur de réconciliation');
    });
  }

  if (candidates.length === 0) {
    return <span className="text-xs text-neutral-500">Aucun candidat (montant+méthode)</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={targetRef}
        onChange={e => setTargetRef(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
      >
        {candidates.map(c => (
          <option key={c.ref} value={c.ref}>
            {c.ref} · {c.amount.toLocaleString('fr-FR')} MRU · {c.method}
          </option>
        ))}
      </select>
      <button
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-50"
      >
        {pending ? 'Association…' : 'Associer'}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
