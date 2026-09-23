import "./globals.css";
import type { Metadata } from "next";
import { KpHeader } from "@/components/KpHeader";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";

export const metadata: Metadata = {
  title: "Maurigame Pay - منصة الدفع الإلكتروني في موريتانيا",
  description:
    "Maurigame Pay - منصة دفع إلكتروني في موريتانيا لدعم Bankily وMasrvi وSedad وBIM وClick."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex flex-col">
          <RecoveryRedirect />
          <KpHeader />

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--stone-200)] bg-[var(--paper-warm)] mt-20">
            <div className="max-w-[1280px] mx-auto px-6 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                <div className="col-span-2">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="inline-flex w-7 h-7 items-center justify-center bg-[var(--ink)] text-white font-mono text-[12px] font-semibold rounded-sm">M</span>
                    <span className="serif text-[15px] tracking-[0.18em] uppercase font-medium">Maurigame Pay</span>
                  </div>
                  <p className="text-sm text-[var(--stone-600)] max-w-md leading-relaxed">
                    L'infrastructure de paiement souveraine de la Mauritanie. Une seule integration pour tous les operateurs locaux. Open source sous licence MIT.
                  </p>
                </div>
                <div>
                  <h4 className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-4">Produit</h4>
                  <div className="flex flex-col gap-2 text-sm text-[var(--stone-600)]">
                    <a href="/#fonctionnement" className="hover:text-[var(--ink)]">Comment ca marche</a>
                    <a href="/#operateurs" className="hover:text-[var(--ink)]">Operateurs</a>
                    <a href="/#tarifs" className="hover:text-[var(--ink)]">Tarifs</a>
                    <a href="/sandbox" className="hover:text-[var(--ink)]">Sandbox</a>
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-4">Developpeurs</h4>
                  <div className="flex flex-col gap-2 text-sm text-[var(--stone-600)]">
                    <a href="/#api" className="hover:text-[var(--ink)]">API REST</a>
                    <a href="/#api" className="hover:text-[var(--ink)]">Webhooks</a>
                    <a href="/#api" className="hover:text-[var(--ink)]">SDK JavaScript</a>
                    <a href="/admin" className="hover:text-[var(--ink)]">Dashboard</a>
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--stone-200)] pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-[var(--stone-500)]">
                <span>&copy; 2026 KitPay SolutionIA &middot; Solutionia SARL, Nouakchott &middot; Licence MIT</span>
                <span>Contributions bienvenues sur GitHub</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
