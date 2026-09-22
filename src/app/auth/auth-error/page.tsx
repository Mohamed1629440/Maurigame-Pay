import Link from 'next/link';

export const metadata = { title: "Erreur d'authentification · KitPay" };

export default function AuthErrorPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams.reason ?? 'unknown';
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-red-900">Authentification échouée</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Le lien magique est invalide ou expiré.
        </p>
        <p className="mt-2 font-mono text-xs text-neutral-500">Raison : {reason}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Réessayer
        </Link>
      </div>
    </main>
  );
}
