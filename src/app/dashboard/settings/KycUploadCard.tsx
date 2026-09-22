'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadKyc, submitKycForReview } from './kyc-actions';

type DocType = 'rc' | 'nif' | 'id';

const DOC_LABELS: Record<DocType, string> = {
  rc: 'Registre de commerce (RC)',
  nif: 'NIF',
  id: 'Pièce d\'identité',
};

type Props = {
  merchant: {
    id: string;
    status: string;
    kyc_documents?: Record<string, string> | null;
  };
};

export function KycUploadCard({ merchant }: Props) {
  const router = useRouter();
  const docs = merchant.kyc_documents ?? {};

  // Local "uploaded" tracking — we mark a doc as uploaded once the server action succeeds,
  // even before router.refresh() returns the new merchant row.
  const [uploaded, setUploaded] = useState<Record<DocType, boolean>>({
    rc: !!docs.rc_url,
    nif: !!docs.nif_url,
    id: !!docs.id_url,
  });
  const [errors, setErrors] = useState<Record<DocType, string | null>>({
    rc: null,
    nif: null,
    id: null,
  });
  const [pendingDoc, setPendingDoc] = useState<DocType | null>(null);
  const [, startTransition] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const status = merchant.status;
  const isPendingReview = status === 'pending_kyc';
  const isActive = status === 'active';
  const allUploaded = uploaded.rc && uploaded.nif && uploaded.id;

  function handleFile(docType: DocType, file: File | null) {
    if (!file) return;
    setErrors(e => ({ ...e, [docType]: null }));
    setPendingDoc(docType);
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadKyc(fd);
      setPendingDoc(null);
      if (!res.ok) {
        setErrors(e => ({ ...e, [docType]: res.error ?? 'Erreur upload' }));
      } else {
        setUploaded(u => ({ ...u, [docType]: true }));
        router.refresh();
      }
    });
  }

  function handleSubmit() {
    setSubmitError(null);
    setSubmitSuccess(false);
    startSubmit(async () => {
      const res = await submitKycForReview();
      if (!res.ok) {
        setSubmitError(res.error ?? 'Erreur soumission');
      } else {
        setSubmitSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">KYC — Documents légaux</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Uploadez les 3 documents (JPG, PNG ou PDF · max 10 MB chacun) puis soumettez pour validation.
        </p>
      </div>

      {isActive && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Compte vérifié. Vous pouvez activer le mode live.
        </div>
      )}

      {isPendingReview && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          ⏳ Documents en attente de validation par le super-admin.
        </div>
      )}

      <div className="space-y-3">
        {(['rc', 'nif', 'id'] as DocType[]).map(docType => (
          <DocZone
            key={docType}
            label={DOC_LABELS[docType]}
            uploaded={uploaded[docType]}
            error={errors[docType]}
            disabled={pendingDoc !== null && pendingDoc !== docType}
            pending={pendingDoc === docType}
            onChange={file => handleFile(docType, file)}
          />
        ))}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      {submitSuccess && (
        <p className="text-sm text-emerald-700">✓ Soumis pour validation. Vous serez notifié par email.</p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!allUploaded || submitting || isPendingReview || isActive}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? 'Envoi…' : 'Soumettre pour validation'}
        </button>
      </div>
    </div>
  );
}

function DocZone({
  label,
  uploaded,
  error,
  disabled,
  pending,
  onChange,
}: {
  label: string;
  uploaded: boolean;
  error: string | null;
  disabled: boolean;
  pending: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900">{label}</span>
        <span
          className={`text-xs ${
            uploaded ? 'text-emerald-700' : 'text-neutral-500'
          }`}
        >
          {pending ? 'Upload…' : uploaded ? 'Uploadé ✓' : 'Vide'}
        </span>
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        disabled={disabled || pending}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
        className="mt-2 block w-full text-xs text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:text-neutral-900 hover:file:bg-neutral-200 disabled:opacity-50"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
