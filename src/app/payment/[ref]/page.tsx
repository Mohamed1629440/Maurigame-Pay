"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { formatMRU } from "@/lib/format";
import type { PaymentIntent } from "@/lib/types";

const MERCHANT = process.env.NEXT_PUBLIC_MERCHANT_PHONE || "+222 46 XX XX XX";

export default function PaymentPage({ params }: { params: { ref: string } }) {
  const router = useRouter();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [checking, setChecking] = useState(false);
  const finalizedRef = useRef(false);

  async function finalizeAndRedirect() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    try {
      await fetch("/api/internal/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: params.ref }),
      });
    } catch {
      /* silent */
    } finally {
      router.push(`/success/${params.ref}`);
    }
  }

  async function refreshIntent() {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from("payment_intents")
      .select("*")
      .eq("ref", params.ref)
      .single();

    if (error || !data) {
      if (loading) {
        setError("Intention de paiement introuvable");
        setLoading(false);
      }
      return null;
    }
    setIntent(data as PaymentIntent);
    if (loading) setLoading(false);
    if (data.status === "paid") finalizeAndRedirect();
    return data as PaymentIntent;
  }

  async function handleManualCheck() {
    setChecking(true);
    await refreshIntent();
    setTimeout(() => setChecking(false), 600);
  }

  useEffect(() => {
    const sb = supabaseBrowser();
    refreshIntent();

    const channel = sb
      .channel(`intent-${params.ref}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_intents",
          filter: `ref=eq.${params.ref}`,
        },
        (payload) => {
          const updated = payload.new as PaymentIntent;
          setIntent(updated);
          if (updated.status === "paid") finalizeAndRedirect();
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (finalizedRef.current) return;
      refreshIntent();
    }, 3000);

    return () => {
      sb.removeChannel(channel);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ref]);

  useEffect(() => {
    if (!intent || intent.status !== "pending") return;
    const expiresAt = new Date(intent.expires_at).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [intent]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <p className="kp-eyebrow text-[var(--stone-500)]">— Chargement…</p>
      </main>
    );
  }
  if (error || !intent) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <p className="serif text-xl text-[var(--ink)] italic">
          {error || "Erreur"}
        </p>
      </main>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = secondsLeft === 0 && intent.status === "pending";

  return (
    <main className="min-h-screen bg-[var(--paper)] py-10 sm:py-16 px-4">
      <div className="mx-auto max-w-md">
        <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--stone-500)] mb-6 text-center">
          REFERENCE · {intent.ref}
        </p>

        <div className="bg-white border border-[var(--stone-200)] rounded-sm p-7 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_24px_60px_-24px_rgba(58,52,42,0.18)]">
          <p className="kp-eyebrow text-[var(--bronze)] text-center mb-3">
            — Montant à envoyer via {intent.method}
          </p>
          <p className="text-center serif text-5xl sm:text-6xl font-medium text-[var(--ink)] leading-none tracking-tight">
            {intent.amount.toLocaleString("fr-FR")}
            <span className="ml-2 text-2xl text-[var(--stone-500)] font-normal">MRU</span>
          </p>

          <div className="mt-7 pt-6 border-t border-[var(--stone-200)]">
            <p className="kp-eyebrow text-[var(--stone-500)] text-center mb-2">
              — Au numéro
            </p>
            <p className="font-mono text-lg text-center text-[var(--ink)]">
              {MERCHANT}
            </p>
          </div>

          <div className="mt-6 border border-[var(--bronze)]/40 bg-[var(--gold-soft)]/40 rounded-sm px-4 py-3 text-sm text-[var(--stone-700)] leading-relaxed">
            Le paiement doit être envoyé depuis le numéro{" "}
            <strong className="font-mono text-[var(--ink)]">
              {intent.expected_phone}
            </strong>{" "}
            pour validation automatique.
          </div>

          {!expired ? (
            <div className="mt-5 pt-4 border-t border-[var(--stone-200)] flex items-center justify-center gap-2">
              <span className="kp-pulse" aria-hidden="true" />
              <span className="kp-eyebrow text-[var(--stone-500)]">— Expire dans</span>
              <span className="font-mono font-semibold tabular-nums text-[var(--ink)] text-sm">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-[var(--stone-200)] text-center">
              <p className="serif text-base text-[var(--ink)] italic">
                Cette intention de paiement a expiré.
              </p>
            </div>
          )}
        </div>

        <div className="text-center my-6 flex flex-col items-center gap-3">
          {!expired && (
            <span className="inline-flex items-center gap-2 border border-[var(--bronze)]/40 bg-[var(--gold-soft)]/40 text-[var(--bronze)] font-mono text-[11px] tracking-wider uppercase px-3 py-1.5 rounded-sm">
              <span className="kp-pulse" aria-hidden="true" />
              En attente du paiement
            </span>
          )}
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="kp-eyebrow text-[var(--stone-700)] hover:text-[var(--ink)] transition-colors duration-200 cursor-pointer disabled:opacity-50"
          >
            {checking ? "— Vérification…" : "— J'ai payé, vérifier maintenant"}
          </button>
          <p className="text-[11px] text-[var(--stone-500)] max-w-xs leading-relaxed">
            La page se met à jour automatiquement dès que le SMS de confirmation arrive.
            Cliquez si rien ne se passe au bout d&apos;une minute.
          </p>
        </div>

        <details className="bg-white border border-[var(--stone-200)] rounded-sm p-4 text-xs group">
          <summary className="cursor-pointer kp-eyebrow text-[var(--stone-500)] hover:text-[var(--ink)] transition-colors duration-200 select-none list-none">
            <span className="inline-block transition-transform duration-200 group-open:rotate-90 mr-1">
              ›
            </span>
            Comment payer ?
          </summary>
          <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-[var(--stone-700)]">
            <li>Ouvrez l&apos;application {intent.method} sur votre téléphone</li>
            <li>Choisissez &quot;Transfert&quot; ou &quot;Envoyer de l&apos;argent&quot;</li>
            <li>
              Saisissez le numéro{" "}
              <code className="font-mono text-[var(--ink)]">{MERCHANT}</code>
            </li>
            <li>
              Saisissez exactement{" "}
              <strong className="serif italic text-[var(--ink)]">
                {intent.amount.toLocaleString("fr-FR")} MRU
              </strong>
            </li>
            <li>Validez. Cette page se mettra à jour automatiquement.</li>
          </ol>
        </details>

        <p className="mt-8 text-center kp-eyebrow text-[var(--stone-500)]">
          — Sécurisé par KitPay · Mauritanie
        </p>
      </div>
    </main>
  );
}
