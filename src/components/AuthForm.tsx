'use client';

import { useState } from 'react';

type Props = {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  ctaLabel: string;
  successMessage?: string;
};

export function AuthForm({ action, ctaLabel, successMessage = "Vérifiez votre email pour le lien de connexion." }: Props) {
  const [state, setState] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('pending');
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await action(formData);

    if (res.ok) {
      setState('sent');
    } else {
      setState('error');
      setError(res.error ?? 'Une erreur est survenue.');
    }
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="rounded-md border border-[var(--forest)]/30 bg-[var(--forest)]/[0.04] p-6"
      >
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-[var(--forest)]"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <div className="min-w-0">
            <p className="kp-eyebrow text-[var(--forest)]">— Email envoyé</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--stone-700)]">
              {successMessage}
            </p>
            <p className="mt-3 text-[12px] text-[var(--stone-500)]">
              Vérifiez aussi vos spams. Le lien expire dans 1 heure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="kp-eyebrow text-[var(--bronze)] block mb-2"
        >
          — Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          className="block w-full rounded-md border border-[var(--stone-200)] bg-white px-4 py-3 text-[var(--ink)] placeholder:text-[var(--stone-400)] transition-colors duration-200 focus:border-[var(--bronze)] focus:outline-none focus:ring-1 focus:ring-[var(--bronze)] disabled:bg-[var(--stone-50)] disabled:cursor-not-allowed"
          placeholder="vous@exemple.com"
          disabled={state === 'pending'}
        />
      </div>

      {error && (
        <p
          className="text-sm text-[#9b1c1c] border-l-2 border-[#9b1c1c] pl-3"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'pending'}
        className="kp-btn kp-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {state === 'pending' ? (
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
            Envoi…
          </>
        ) : (
          <>
            {ctaLabel}
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>
    </form>
  );
}
