import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyIntentExpired } from "@/lib/telegram";
import type { PaymentIntent } from "@/lib/types";

// Route à appeler périodiquement (toutes les 5-10 min) pour :
// 1. Expirer les intents pending dont expires_at < now()
// 2. Notifier sur Telegram chaque expiration
//
// Sécurité : doit être appelée avec le header x-cron-secret = CRON_SECRET
//
// Déclencheurs possibles :
// - Vercel Cron (vercel.json)
// - n8n Schedule trigger
// - cron-job.org externe
// - Manuel : curl -H "x-cron-secret: ..." http://localhost:3000/api/cron/expire-intents

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  // Récupérer les intents à expirer (pour pouvoir les notifier avant l'update)
  const { data: toExpire } = await sb
    .from("payment_intents")
    .select("*")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  const intents = (toExpire || []) as PaymentIntent[];

  if (intents.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  // Marquer comme expirés
  const refs = intents.map((i) => i.ref);
  await sb.from("payment_intents").update({ status: "expired" }).in("ref", refs);

  // Notifier Telegram pour chaque (en parallèle, non bloquant)
  await Promise.allSettled(intents.map((i) => notifyIntentExpired(i)));

  return NextResponse.json({
    expired: intents.length,
    refs
  });
}
