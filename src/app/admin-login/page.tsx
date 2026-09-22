'use client';

import { useState } from 'react';
import { adminLogin } from './actions';

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await adminLogin(formData);
    if (!res.ok) {
      setError(res.error ?? 'Erreur');
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-md p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">Admin KitPay</h1>
        <p className="text-sm text-neutral-500 mb-6">Connexion super-admin</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="block w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              placeholder="admin@exemple.com"
              disabled={pending}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-600 mb-1">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="block w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              disabled={pending}
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 border-l-2 border-red-700 pl-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-neutral-900 text-white text-sm py-2 font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
