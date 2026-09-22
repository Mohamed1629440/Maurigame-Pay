'use client';

import { useState } from 'react';

type Props = {
  refValue: string;
  clientSecret: string;
};

export function SimulateButton({ refValue, clientSecret }: Props) {
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function simulate() {
    setPending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/test/sandbox-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: refValue, client_secret: clientSecret }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="kp-eyebrow text-[var(--bronze)] mb-3 text-center">
        — Outil sandbox
      </p>
      <button
        type="button"
        onClick={simulate}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 font-mono text-[11px] tracking-wider uppercase border border-[var(--bronze)]/40 text-[var(--bronze)] bg-[var(--gold-soft)]/40 hover:bg-[var(--gold-soft)]/70 hover:border-[var(--bronze)] rounded-sm px-4 py-2.5 cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Simulation…
          </>
        ) : (
          'Simuler le paiement'
        )}
      </button>
      {err && (
        <p
          className="mt-2 text-sm text-[#9b1c1c] border-l-2 border-[#9b1c1c] pl-3"
          role="alert"
        >
          {err}
        </p>
      )}
    </div>
  );
}
