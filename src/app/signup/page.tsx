import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { signupWithEmail } from './actions';

export const metadata = {
  title: 'Inscription · KitPay',
  description: 'Créez votre compte marchand KitPay. Aucun mot de passe, lien magique sécurisé.',
};

const STEPS = [
  { n: '01', title: 'Email', desc: 'Recevez votre lien magique sécurisé' },
  { n: '02', title: 'Onboarding', desc: 'Configurez votre numéro Bankily / Masrvi' },
  { n: '03', title: 'Production', desc: 'Encaissez en quelques heures' },
];

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] flex items-center px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1180px] grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        {/* LEFT — Editorial onboarding panel */}
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
              Encaissez en <em>MRU</em>.
              <br />
              Une seule <em>API</em>.
            </h1>

            <p className="mt-7 text-[15px] leading-relaxed text-[var(--stone-600)] max-w-md">
              Connectez Bankily, Masrvi, Sedad, BIM et Click à votre SaaS
              ou e-commerce. SDK, webhooks signés, dashboard de réconciliation —
              tout inclus.
            </p>
          </div>

          <ol className="mt-10 pt-8 border-t border-[var(--stone-200)] space-y-5">
            {STEPS.map((step) => (
              <li key={step.n} className="flex items-start gap-4">
                <span
                  className="kp-eyebrow text-[var(--bronze)] mt-1 shrink-0"
                  aria-hidden="true"
                >
                  {step.n}
                </span>
                <div className="min-w-0">
                  <p className="serif text-base font-medium text-[var(--ink)] italic">
                    {step.title}
                  </p>
                  <p className="text-[13px] text-[var(--stone-600)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        {/* Mobile-only header */}
        <div className="lg:hidden text-center">
          <Link
            href="/"
            className="kp-eyebrow text-[var(--bronze)] inline-block mb-4"
          >
            ← KitPay
          </Link>
          <h1 className="kp-section-title text-[var(--ink)]">
            Créer votre <em>compte marchand</em>
          </h1>
        </div>

        {/* RIGHT — Form card */}
        <section className="w-full">
          <div className="mx-auto max-w-[440px] bg-white border border-[var(--stone-200)] rounded-md p-8 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_24px_60px_-24px_rgba(58,52,42,0.18)]">
            <div className="hidden lg:block mb-7">
              <p className="kp-eyebrow text-[var(--bronze)] mb-2">— Inscription</p>
              <h2 className="serif text-2xl font-medium text-[var(--ink)] leading-tight">
                Démarrez en <em className="italic">30 secondes</em>
              </h2>
            </div>

            <AuthForm
              action={signupWithEmail}
              ctaLabel="Créer mon compte"
              successMessage="Cliquez sur le lien magique dans l’email pour activer votre compte et démarrer l’onboarding."
            />

            <div className="mt-7 pt-6 border-t border-[var(--stone-200)] text-center">
              <p className="text-[13px] text-[var(--stone-600)]">
                Déjà inscrit chez KitPay ?
              </p>
              <Link href="/login" className="kp-link mt-2 inline-block">
                Se connecter
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-[var(--stone-500)]">
            Aucun mot de passe à retenir. Lien magique uniquement.
          </p>
        </section>
      </div>
    </main>
  );
}
