"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Article = {
  id: string;
  badge: string;
  category: string;
  name: string;
  pitch: string;
  amount: number;
  defaultMethod: "Bankily" | "Masrvi" | "Sedad" | "BIM" | "Click";
  illustration: React.ReactNode;
};

const ARTICLES: Article[] = [
  {
    id: "demo-express",
    badge: "01",
    category: "Decouverte",
    name: "Test express KitPay",
    pitch: "Montant symbolique pour valider un paiement reel de bout en bout. Recu envoye en moins d'une minute.",
    amount: 5,
    defaultMethod: "Bankily",
    illustration: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="6" y="14" width="108" height="52" fill="none" stroke="currentColor" strokeWidth="0.6" rx="2" />
        <line x1="6" y1="34" x2="114" y2="34" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" />
        <text x="14" y="28" fontFamily="JetBrains Mono, monospace" fontSize="6" fill="currentColor" letterSpacing="0.15em">TEST EXPRESS</text>
        <text x="14" y="50" fontFamily="Bodoni Moda, Georgia, serif" fontSize="14" fontStyle="italic" fill="currentColor">5 MRU</text>
        <text x="14" y="60" fontFamily="JetBrains Mono, monospace" fontSize="4.5" fill="currentColor" opacity="0.6">REF KP-XXXXXX</text>
      </svg>
    )
  },
  {
    id: "saas-month",
    badge: "02",
    category: "SaaS",
    name: "Test abonnement mensuel",
    pitch: "Simulation d'un encaissement d'abonnement SaaS recurrent. Webhook payment.succeeded en moins d'une seconde.",
    amount: 10,
    defaultMethod: "Bankily",
    illustration: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="20" y="10" width="80" height="60" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <rect x="28" y="20" width="50" height="2.5" fill="currentColor" opacity="0.45" />
        <rect x="28" y="28" width="64" height="2.5" fill="currentColor" opacity="0.3" />
        <rect x="28" y="36" width="40" height="2.5" fill="currentColor" opacity="0.3" />
        <rect x="28" y="44" width="58" height="2.5" fill="currentColor" opacity="0.3" />
        <path d="M 60 56 q 10 -8 16 0 q 4 6 12 -2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <text x="60" y="78" fontFamily="JetBrains Mono, monospace" fontSize="4.5" fill="currentColor" textAnchor="middle">SaaS &middot; 10 MRU</text>
      </svg>
    )
  },
  {
    id: "ecommerce-order",
    badge: "03",
    category: "E-commerce",
    name: "Test commande boutique",
    pitch: "Simulation panier d'achat avec montant symbolique. Le webhook declenche l'expedition cote marchand.",
    amount: 25,
    defaultMethod: "Masrvi",
    illustration: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="14" y="22" width="92" height="44" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <path d="M 14 22 L 22 12 L 98 12 L 106 22" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <line x1="40" y1="12" x2="40" y2="22" stroke="currentColor" strokeWidth="0.4" />
        <line x1="80" y1="12" x2="80" y2="22" stroke="currentColor" strokeWidth="0.4" />
        <rect x="22" y="32" width="32" height="22" fill="currentColor" opacity="0.18" />
        <rect x="62" y="32" width="32" height="22" fill="currentColor" opacity="0.18" />
        <text x="60" y="78" fontFamily="JetBrains Mono, monospace" fontSize="4.5" fill="currentColor" textAnchor="middle">PANIER &middot; 25 MRU</text>
      </svg>
    )
  },
  {
    id: "consult-30",
    badge: "04",
    category: "Conseil",
    name: "Test consultation expert",
    pitch: "Simulation d'un appel paye apres consultation. Email avec lien envoye automatiquement.",
    amount: 50,
    defaultMethod: "Sedad",
    illustration: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <circle cx="38" cy="36" r="14" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <path d="M 18 66 Q 38 48 58 66" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="82" cy="36" r="14" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
        <path d="M 62 66 Q 82 48 102 66" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
        <text x="60" y="78" fontFamily="JetBrains Mono, monospace" fontSize="4.5" fill="currentColor" textAnchor="middle">CALL &middot; 50 MRU</text>
      </svg>
    )
  }
];

const ALL_METHODS: Article["defaultMethod"][] = ["Bankily", "Masrvi", "Sedad", "BIM", "Click"];

export default function Sandbox({ enabledMethods }: { enabledMethods?: string[] }) {
  const METHODS = enabledMethods
    ? (ALL_METHODS.filter(m => enabledMethods.includes(m)) as Article["defaultMethod"][])
    : ALL_METHODS;
  const router = useRouter();
  const [activeId, setActiveId] = useState(ARTICLES[0].id);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [methodOverride, setMethodOverride] = useState<Article["defaultMethod"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const active = ARTICLES.find((a) => a.id === activeId)!;
  const selectedMethod = methodOverride ?? active.defaultMethod;

  function selectArticle(id: string) {
    setActiveId(id);
    setMethodOverride(null);
    setError("");
  }

  async function buy() {
    setError("");
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+?222/, "");
    if (cleanPhone.length < 8) {
      setError("Entrez un numero mauritanien (8 chiffres minimum)");
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Email invalide — format attendu : nom@exemple.mr");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          email: trimmedEmail || null,
          method: selectedMethod,
          amount: active.amount,
          label: active.name
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la creation du paiement");
        setLoading(false);
        return;
      }
      router.push(`/pay/${data.ref}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur reseau");
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 items-start">
      {/* === LEFT : CATALOGUE + CHECKOUT === */}
      <div>
        <div className="kp-eyebrow text-[var(--bronze)] mb-3">— Articles a tester</div>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {ARTICLES.map((a) => {
            const isActive = a.id === activeId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => selectArticle(a.id)}
                className={`group text-left border transition-all overflow-hidden ${
                  isActive
                    ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                    : "bg-white border-[var(--stone-200)] hover:border-[var(--ink)]"
                }`}
              >
                <div className={`aspect-[3/2] ${isActive ? "bg-[var(--ink-2)] text-[var(--bronze-light)]" : "bg-[var(--paper-warm)] text-[var(--stone-500)] group-hover:text-[var(--ink)]"} transition-colors p-3 flex items-center justify-center`}>
                  {a.illustration}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-mono text-[10px] tracking-[0.25em] ${isActive ? "text-[var(--bronze-light)]" : "text-[var(--bronze)]"}`}>
                      {a.badge} &middot; {a.category}
                    </span>
                    <span className="font-mono text-[11px] font-semibold">
                      {a.amount.toLocaleString("fr-FR")}<span className={`ml-1 text-[9px] ${isActive ? "text-stone-400" : "text-[var(--stone-500)]"}`}>MRU</span>
                    </span>
                  </div>
                  <div className="serif text-base font-medium leading-tight">{a.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Checkout panel */}
        <div className="bg-white border border-[var(--stone-200)] p-6 md:p-7">
          <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-[var(--stone-200)]">
            <div className="min-w-0">
              <div className="kp-eyebrow text-[var(--bronze)] mb-1">Article selectionne</div>
              <div className="serif text-lg font-medium leading-tight truncate">{active.name}</div>
              <div className="text-xs text-[var(--stone-500)] mt-1">{active.pitch}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="serif text-3xl font-medium leading-none">{active.amount.toLocaleString("fr-FR")}</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--stone-500)] mt-1">MRU</div>
            </div>
          </div>

          {/* Phone */}
          <label htmlFor="sb-phone" className="block kp-eyebrow text-[var(--bronze)] mb-2">
            Numero de paiement
          </label>
          <input
            id="sb-phone"
            type="tel"
            placeholder="41 XX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border-b-2 border-[var(--stone-300)] focus:border-[var(--ink)] outline-none py-2.5 text-lg font-mono tracking-wider bg-transparent text-[var(--ink)] placeholder:text-[var(--stone-400)] transition-colors mb-1"
            autoComplete="tel"
          />
          <p className="text-[11px] text-[var(--stone-500)] mb-5">8 chiffres mauritaniens. Pas besoin du prefixe +222.</p>

          {/* Email */}
          <label htmlFor="sb-email" className="block kp-eyebrow text-[var(--bronze)] mb-2">
            Email pour le recu
          </label>
          <input
            id="sb-email"
            type="email"
            placeholder="vous@exemple.mr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-b-2 border-[var(--stone-300)] focus:border-[var(--ink)] outline-none py-2.5 text-base bg-transparent text-[var(--ink)] placeholder:text-[var(--stone-400)] transition-colors mb-1"
            autoComplete="email"
          />
          <p className="text-[11px] text-[var(--stone-500)] mb-5">Vous recevrez la facture nominative apres paiement (optionnel).</p>

          {/* Operator override */}
          <label className="block kp-eyebrow text-[var(--bronze)] mb-2.5">
            Operateur de paiement
          </label>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodOverride(m)}
                className={`py-2 px-1 text-xs font-medium border transition-all ${
                  selectedMethod === m
                    ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                    : "border-[var(--stone-300)] text-[var(--stone-700)] hover:border-[var(--ink)] bg-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border-l-2 border-red-500 text-sm text-red-900">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={buy}
            disabled={loading}
            className="kp-btn kp-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creation du paiement..." : `Payer ${active.amount.toLocaleString("fr-FR")} MRU →`}
          </button>

          <p className="text-[11px] text-[var(--stone-500)] mt-4 text-center">
            Vous serez redirige vers la page de paiement live.
            Lorsque le SMS de confirmation arrive, le statut bascule en moins d&apos;une seconde et le recu part par email.
          </p>
        </div>
      </div>

      {/* === RIGHT : API PREVIEW === */}
      <div className="lg:sticky lg:top-24">
        <div className="kp-eyebrow text-[var(--bronze)] mb-3">— Sous le capot</div>
        <h3 className="serif text-2xl font-medium text-[var(--ink)] mb-5 leading-tight">
          Ce que recoit votre serveur.
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--stone-500)]">Requete</span>
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--forest)]">POST /api/demo</span>
            </div>
            <pre className="kp-code text-[12px]"><code>{`{
  "phone": "${phone || "41XXXXXX"}",
  "email": "${email || "vous@exemple.mr"}",
  "method": "${selectedMethod}",
  "amount": ${active.amount},
  "label": "${active.name}"
}`}</code></pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--stone-500)]">Reponse</span>
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--forest)]">200 OK</span>
            </div>
            <pre className="kp-code text-[12px]"><code>{`{
  "ref": "KP-9F2A1C",
  "amount": ${active.amount},
  "method": "${selectedMethod}"
}`}</code></pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--stone-500)]">Webhook (apres paiement)</span>
              <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--bronze)]">
                <span className="kp-pulse" style={{ background: "var(--bronze-light)" }}></span>
                ATTENDU
              </span>
            </div>
            <pre className="kp-code text-[12px]"><code>{`{
  "event": "payment.confirmed",
  "ref": "KP-9F2A1C",
  "amount": ${active.amount},
  "method": "${selectedMethod}",
  "customer_email": "${email || "vous@exemple.mr"}",
  "paid_at": "2026-05-05T22:47:13Z",
  "signature": "hmac-sha256:abc..."
}`}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}
