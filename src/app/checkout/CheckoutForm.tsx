"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMRU } from "@/lib/format";
import type { Product } from "@/lib/types";

type Method = "Bankily" | "Masrvi" | "Sedad" | "BIM" | "Click";
const ALL_METHODS: Method[] = ["Bankily", "Masrvi", "Sedad", "BIM", "Click"];

export default function CheckoutForm({ product, enabledMethods }: { product: Product; enabledMethods?: string[] }) {
  const METHODS = enabledMethods
    ? ALL_METHODS.filter(m => enabledMethods.includes(m))
    : ALL_METHODS;
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<Method | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const cleanPhone = phone.replace(/\s+/g, "");
    if (cleanPhone.length < 8) {
      setError("Numéro invalide (8 chiffres minimum)");
      return;
    }
    if (!method) {
      setError("Choisissez un mode de paiement");
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Email invalide");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          phone: cleanPhone,
          method,
          email: trimmedEmail || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        setLoading(false);
        return;
      }
      router.push(`/pay/${data.ref}`);
    } catch (e: any) {
      setError(e.message || "Erreur réseau");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6 text-sm text-stone-500">
        <a href="/" className="hover:text-stone-900">← Retour</a>
      </div>

      <h1 className="text-xl font-medium mb-6">Validation du paiement</h1>

      <div className="bg-stone-100 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500">Article</p>
          <p className="font-medium">{product.name}</p>
        </div>
        <p className="font-medium">{formatMRU(product.price)}</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-stone-700 mb-2">
            Votre numéro {method ? method : "mobile money"}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="22 12 34 56"
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-stone-900"
          />
          <p className="text-xs text-stone-500 mt-1">
            Important : le paiement doit être envoyé depuis ce numéro pour validation automatique.
          </p>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-2">
            Email <span className="text-stone-400 font-normal">(facultatif — pour recevoir le reçu)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-stone-900"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-2">Mode de paiement</label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`py-3 rounded-md border font-medium text-sm ${
                  method === m
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-stone-900 text-white py-3 rounded-md font-medium hover:bg-stone-800 disabled:opacity-50"
        >
          {loading ? "Création..." : "Continuer vers le paiement"}
        </button>
      </div>
    </div>
  );
}
