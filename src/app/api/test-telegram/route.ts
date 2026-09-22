import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Endpoint de test rapide pour valider la config Telegram
// Appel : http://localhost:3000/api/test-telegram?pwd=ADMIN_PASSWORD

export async function GET(req: NextRequest) {
  const pwd = req.nextUrl.searchParams.get("pwd");
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendTelegramMessage(
    "*🧪 Test KitPay*\n\nSi tu vois ce message, la config Telegram est OK\\!\n\n_Bot et chat\\_id correctement configurés\\._"
  );

  return NextResponse.json(result);
}
