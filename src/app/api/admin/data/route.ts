import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-admin-pwd") === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = supabaseAdmin();
  const [pendingRes, orphansRes, productsRes, recentRes] = await Promise.all([
    sb
      .from("payment_intents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("orphan_sms")
      .select("*")
      .is("resolved_at", null)
      .order("received_at", { ascending: false })
      .limit(50),
    sb.from("products").select("*").order("created_at", { ascending: false }),
    sb
      .from("payment_intents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
  ]);
  return NextResponse.json({
    pending: pendingRes.data || [],
    orphans: orphansRes.data || [],
    products: productsRes.data || [],
    recentPayments: recentRes.data || []
  });
}
