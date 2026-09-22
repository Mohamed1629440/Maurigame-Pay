import Sandbox from "../_marketing/Sandbox";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata = {
  title: "Sandbox KitPay — Testez l'API en conditions reelles",
  description:
    "Quatre scenarios pre-configures pour tester KitPay : SaaS, e-commerce, scolarite, libre. Chaque demo cree un intent reel et bascule en realtime."
};

export const dynamic = "force-dynamic";

const SANDBOX_MERCHANT_ID = "00000000-0000-0000-0000-000000000001";

async function getEnabledMethods(): Promise<string[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("merchant_operators")
    .select("method")
    .eq("merchant_id", SANDBOX_MERCHANT_ID)
    .eq("enabled", true);
  return (data ?? []).map((r: { method: string }) => r.method);
}

export default async function SandboxPage() {
  const enabledMethods = await getEnabledMethods();
  return (
    <>
      {/* ===== HERO SANDBOX ===== */}
      <section className="border-b border-[var(--stone-200)] bg-[var(--paper-warm)]">
        <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-14">
          <div className="kp-eyebrow text-[var(--bronze)] mb-4">— Sandbox</div>
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-end">
            <div>
              <h1 className="kp-hero-title text-[var(--ink)] mb-5" style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)" }}>
                Testez KitPay<br /><em>pour 5 MRU.</em>
              </h1>
              <p className="text-[var(--stone-600)] text-lg leading-relaxed max-w-xl">
                Vrai paiement, montant symbolique. Choisissez un scenario, entrez votre numero,
                payez 5 a 50 MRU avec {enabledMethods.join(', ')}. Vous voyez la confirmation
                arriver en temps reel. Aucun compte requis.
              </p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm">
                <span className="kp-pulse"></span>
                <span className="text-[var(--stone-700)]"><strong>API en production</strong> - la meme infrastructure que les marchands en live</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--bronze)] inline-block flex-shrink-0"></span>
                <span className="text-[var(--stone-700)]"><strong>{enabledMethods.length} operateur{enabledMethods.length > 1 ? 's' : ''}</strong> {enabledMethods.join(', ')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--ink)] inline-block flex-shrink-0"></span>
                <span className="text-[var(--stone-700)]"><strong>Webhook signe HMAC</strong> en moins d&apos;une seconde apres confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FLOW DIAGRAM ===== */}
      <section className="border-b border-[var(--stone-200)]">
        <div className="max-w-[1280px] mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
            {[
              { num: "01", title: "Votre app", desc: "POST /api/demo" },
              { num: "02", title: "KitPay API", desc: "Cree un intent (ref)" },
              { num: "03", title: "Le client paie", desc: "Bankily, Masrvi..." },
              { num: "04", title: "Webhook live", desc: "payment.confirmed" }
            ].map((step, i, arr) => (
              <div key={step.num} className="relative bg-white border border-[var(--stone-200)] p-5">
                <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--bronze)] mb-2">{step.num}</div>
                <div className="serif text-base font-medium text-[var(--ink)] mb-1">{step.title}</div>
                <div className="font-mono text-[11px] text-[var(--stone-500)]">{step.desc}</div>
                {i < arr.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-[var(--bronze)] text-lg z-10">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SANDBOX BODY ===== */}
      <section className="max-w-[1280px] mx-auto px-6 py-14 md:py-16">
        <Sandbox enabledMethods={enabledMethods} />
      </section>

      {/* ===== AFTER-DEMO TIPS ===== */}
      <section className="bg-[var(--ink)] text-white">
        <div className="max-w-[1280px] mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-10">
            <p className="kp-eyebrow text-[var(--bronze-light)] mb-3">— Apres votre demo</p>
            <h2 className="kp-section-title">Trois etapes<br /><em className="text-[var(--bronze-light)]">pour passer en production.</em></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/[0.04] border border-white/10 p-7">
              <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--bronze-light)] mb-3">01</div>
              <h3 className="serif text-xl font-medium mb-2">Recuperez vos cles</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Apres une mission de cadrage de 30 minutes, nous vous donnons votre <code className="font-mono text-[var(--bronze-light)]">api_key</code> et votre <code className="font-mono text-[var(--bronze-light)]">webhook_secret</code> dedies.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 p-7">
              <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--bronze-light)] mb-3">02</div>
              <h3 className="serif text-xl font-medium mb-2">Branchez votre app</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Trois appels d&apos;API : creer un intent, rediriger le client, recevoir le webhook. Notre equipe accompagne sur appel pour les premiers tests.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 p-7">
              <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--bronze-light)] mb-3">03</div>
              <h3 className="serif text-xl font-medium mb-2">Encaissez en MRU</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                Vos premieres transactions arrivent. Les 100 premieres sont gratuites pour valider votre integration sans engagement.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <a href="mailto:hello@example.com?subject=KitPay%20-%20Acces%20API" className="kp-btn kp-btn-primary" style={{ background: "#fff", color: "var(--ink)" }}>
              Demander un acces API
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
