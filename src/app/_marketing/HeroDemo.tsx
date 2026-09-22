"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { id: 0, label: "Intent cree", color: "stone" },
  { id: 1, label: "SMS envoye", color: "stone" },
  { id: 2, label: "SMS recu", color: "bronze" },
  { id: 3, label: "Paiement confirme", color: "forest" }
];

export default function HeroDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => (s + 1) % (STEPS.length + 1));
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      {/* Carte principale */}
      <div className="bg-[var(--ink)] text-white rounded-sm overflow-hidden shadow-2xl">
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
          <span className="w-2 h-2 rounded-full bg-white/20"></span>
          <span className="w-2 h-2 rounded-full bg-white/20"></span>
          <span className="w-2 h-2 rounded-full bg-white/20"></span>
          <span className="ml-2 font-mono text-[10px] text-stone-400 truncate">your-domain.example/payment/KP-9F2A1C</span>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--bronze-light)] mb-3">PAIEMENT EN ATTENTE</div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="serif text-4xl font-medium">1 240</span>
            <span className="text-stone-400 text-sm">MRU</span>
          </div>
          <div className="text-stone-400 text-xs mb-6">via Bankily &middot; ref KP-9F2A1C</div>

          {/* Steps */}
          <div className="space-y-2.5">
            {STEPS.map((s, i) => {
              const active = step >= i;
              const current = step === i;
              return (
                <div key={s.id} className="flex items-center gap-3 transition-opacity duration-500" style={{ opacity: active ? 1 : 0.35 }}>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      active ? "bg-[var(--forest-light)]" : "bg-white/20"
                    } ${current ? "kp-pulse" : ""}`}
                  ></span>
                  <span className={`font-mono text-[11px] tracking-wider uppercase ${active ? "text-white" : "text-stone-500"}`}>
                    {s.label}
                  </span>
                  {active && i === 3 && (
                    <span className="ml-auto text-[10px] tracking-[0.2em] uppercase font-semibold text-[var(--forest-light)]">
                      OK
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-[10px] text-stone-500">webhook.payment.confirmed</span>
          <span className="font-mono text-[10px] text-[var(--bronze-light)]">latence &lt; 1 s</span>
        </div>
      </div>

      {/* Petit badge flottant */}
      <div className="absolute -top-3 -right-3 bg-[var(--bronze)] text-white px-3 py-1.5 rounded-sm shadow-lg">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase">EN PRODUCTION</div>
      </div>

      {/* Carte SMS qui apparait quand step >= 2 */}
      <div
        className="absolute -bottom-6 -left-6 bg-white border border-[var(--stone-300)] rounded-sm shadow-[0_28px_70px_-12px_rgba(58,52,42,0.35),0_8px_24px_-8px_rgba(58,52,42,0.18)] p-4 max-w-[260px] transition-all duration-500"
        style={{
          opacity: step >= 2 ? 1 : 0,
          transform: step >= 2 ? "translateY(0)" : "translateY(8px)"
        }}
      >
        <div className="flex items-start gap-2 mb-2">
          <div className="w-7 h-7 bg-[var(--ink)] text-white rounded-sm font-mono text-[11px] flex items-center justify-center font-bold">B</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[var(--ink)]">BANKILY</div>
            <div className="text-[9px] text-[var(--stone-500)] font-mono">22:47</div>
          </div>
        </div>
        <p className="text-[11px] text-[var(--stone-700)] leading-relaxed">
          Vous avez recu <strong>1 240 MRU</strong> de 41XXXXXX. Reference KP-9F2A1C. Solde : 8 240 MRU.
        </p>
      </div>
    </div>
  );
}
