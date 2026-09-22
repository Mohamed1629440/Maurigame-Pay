'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Supabase implicit flow: session comes from the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Minimum 8 caracteres');
      return;
    }
    setStatus('pending');
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('done');
      setTimeout(() => router.push('/admin-login'), 2000);
    }
  }

  if (status === 'done') {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-md p-8 shadow-sm text-center">
          <p className="text-green-700 font-medium">Mot de passe mis a jour !</p>
          <p className="text-sm text-neutral-500 mt-2">Redirection vers la connexion...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-md p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-neutral-500 mb-6">Compte admin KitPay</p>

        {!sessionReady && (
          <p className="text-sm text-neutral-400 mb-4">Verification du lien en cours...</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-600 mb-1">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="block w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              disabled={status === 'pending'}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs font-medium text-neutral-600 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="block w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              disabled={status === 'pending'}
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 border-l-2 border-red-700 pl-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === 'pending' || !sessionReady}
            className="w-full rounded bg-neutral-900 text-white text-sm py-2 font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {status === 'pending' ? 'Mise a jour...' : 'Definir le mot de passe'}
          </button>
        </form>
      </div>
    </main>
  );
}
