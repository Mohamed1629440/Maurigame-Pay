"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const METHODS = ["Bankily", "Masrvi", "Sedad", "BIM", "Click"] as const;
type Method = typeof METHODS[number];

const PRESETS = [50, 100, 500, 1000];

export default function DemoForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | "">(100);
  const [method, setMethod] = useState<Method>("Bankily");
  const [label, setLabel] = useState("Demo KitPay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+?222/, "");
    if (cleanPhone.length < 8) {
      setError("Numero invalide (8 chiffres minimum)");
      return;
    }
    if (!amount || Number(amount) < 5) {
      setError("Montant minimum : 5 MRU");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          method,
          amount: Number(amount),
          label
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la creation de l'intent");
        setLoading(false);
        return;
      }
      router.push(`/pay/${data.ref}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur reseau";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[var(--stone-200)] rounded-sm p-7 md:p-9 shadow-sm">
      {/* Phone */}
      <div className="mb-5">
        <label htmlFor="df-phone" className="block kp-eyebrow text-[var(--bronze)] mb-2">
          Numero du payeur (Mauritanie)
        </label>
        <input
          id="df-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="41 XX XX XX"
          required
          className="w-full border-b-2 border-[var(--stone-300)] focus:border-[var(--ink)] outline-none py-3 text-lg font-mono tracking-wider bg-transparent text-[var(--ink)] placeholder:text-[var(--stone-400)] transition-colors"
          autoComplete="tel"
        />
        <p className="text-xs text-[var(--stone-500)] mt-2">8 chiffres mauritaniens. Pas besoin du prefixe +222.</p>
      </div>

      {/* Amount */}
      <div className="mb-5">
        <label htmlFor="df-amount" className="block kp-eyebrow text-[var(--bronze)] mb-2">
          Montant a encaisser
        </label>
        <div className="flex items-center gap-3 mb-3">
          <input
            id="df-amount"
            type="number"
            min={5}
            max={5000}
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            className="flex-1 border-b-2 border-[var(--stone-300)] focus:border-[var(--ink)] outline-none py-3 text-3xl serif font-medium bg-transparent text-[var(--ink)] transition-colors"
          />
          <span className="kp-eyebrow text-[var(--stone-500)]">MRU</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`text-xs font-mono px-3 py-1.5 border transition-colors ${
                amount === p
                  ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                  : "border-[var(--stone-300)] text-[var(--stone-700)] hover:border-[var(--ink)]"
              }`}
            >
              {p} MRU
            </button>
          ))}
        </div>
      </div>

      {/* Method */}
      <div className="mb-5">
        <label className="block kp-eyebrow text-[var(--bronze)] mb-3">Operateur de paiement</label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`py-2.5 px-2 text-xs font-medium border transition-all ${
                method === m
                  ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                  : "border-[var(--stone-300)] text-[var(--stone-700)] hover:border-[var(--ink)] bg-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div className="mb-7">
        <label htmlFor="df-label" className="block kp-eyebrow text-[var(--bronze)] mb-2">
          Libelle (optionnel)
        </label>
        <input
          id="df-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          placeholder="Ex : Abonnement Mai, Commande #4521..."
          className="w-full border-b-2 border-[var(--stone-300)] focus:border-[var(--ink)] outline-none py-2 text-sm bg-transparent text-[var(--ink)] placeholder:text-[var(--stone-400)] transition-colors"
        />
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border-l-2 border-red-500 text-sm text-red-900">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="kp-btn kp-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Creation..." : "Lancer le paiement →"}
      </button>

      <p className="text-xs text-[var(--stone-500)] mt-5 text-center leading-relaxed">
        Aucun compte requis. L&apos;intent expire dans 15 minutes si non paye.
        <br />
        Pour la demo : ajoutez une macro MacroDroid qui simule le SMS de confirmation.
      </p>
    </form>
  );
}
