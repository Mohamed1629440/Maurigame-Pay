import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { loginWithEmail } from './actions';

export const metadata = {
  title: 'Connexion · KitPay',
  description: 'Accédez à votre espace marchand KitPay via lien magique sécurisé.',
};

const OPERATORS = ['Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click'];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] flex items-center px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1180px] grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        {/* LEFT — Editorial brand panel */}
        <aside className="hidden lg:flex flex-col justify-between min-h-[560px] py-2">
          <div>
            <Link
              href="/"
              className="kp-eyebrow text-[var(--bronze)] inline-flex items-center gap-2 hover:text-[var(--ink)] transition-colors duration-200"
            >
              <span aria-hidden="true">←</span>
              <span>KitPay</span>
            </Link>

            <h1 className="kp-section-title text-[var(--ink)] mt-10 max-w-[18ch]">
              Votre espace
              <br />
              <em>marchand</em> en
              <br />
              un <em>lien</em>.
            </h1>

            <p className="mt-7 text-[15px] leading-relaxed text-[var(--stone-600)] max-w-md">
              Aucun mot de passe à retenir. Saisissez votre email, recevez un lien
              magique, accédez immédiatement à votre dashboard, vos clés API, vos
              webhooks et l’historique de vos paiements.
            </p>
          </div>

          <div className="mt-12 pt-10 border-t border-[var(--stone-200)]">
            <p className="kp-eyebrow text-[var(--stone-500)] mb-4">— 5 opérateurs supportés</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--stone-700)] font-mono">
              {OPERATORS.map((name) => (
                <li key={name} className="flex items-center gap-1.5">
                  <span className="kp-pulse" aria-hidden="true" />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Mobile-only header (replaces left panel on small screens) */}
        <div className="lg:hidden text-center">
          <Link
            href="/"
            className="kp-eyebrow text-[var(--bronze)] inline-block mb-4"
          >
            ← KitPay
          </Link>
          <h1 className="kp-section-title text-[var(--ink)]">
            Connexion à <em>votre espace</em>
          </h1>
        </div>

        {/* RIGHT — Form card */}
        <section className="w-full">
          <div className="mx-auto max-w-[440px] bg-white border border-[var(--stone-200)] rounded-md p-8 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_24px_60px_-24px_rgba(58,52,42,0.18)]">
            <div className="hidden lg:block mb-7">
              <p className="kp-eyebrow text-[var(--bronze)] mb-2">— Connexion</p>
              <h2 className="serif text-2xl font-medium text-[var(--ink)] leading-tight">
                Recevez votre <em className="italic">lien magique</em>
              </h2>
            </div>

            <AuthForm action={loginWithEmail} ctaLabel="Recevoir le lien" />

            <div className="mt-7 pt-6 border-t border-[var(--stone-200)] text-center">
              <p className="text-[13px] text-[var(--stone-600)]">
                Pas encore marchand KitPay ?
              </p>
              <Link href="/signup" className="kp-link mt-2 inline-block">
                Créer un compte
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-[var(--stone-500)]">
            En vous connectant, vous acceptez nos conditions d’utilisation.
          </p>
        </section>
      </div>
    </main>
  );
}
