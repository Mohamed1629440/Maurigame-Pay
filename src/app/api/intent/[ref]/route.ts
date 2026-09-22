import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { ref: string } }) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("payment_intents")
    .select("*")
    .eq("ref", params.ref)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
