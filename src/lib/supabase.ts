import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (utilisé pour realtime sur la page paiement)
export function supabaseBrowser() {
  return createBrowserClient(URL, ANON);
}

// Server client avec service_role (pour les Route Handlers /api/*)
export function supabaseAdmin() {
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
