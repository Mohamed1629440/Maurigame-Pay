import { fetchProductById } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase";
import CheckoutForm from "./CheckoutForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SANDBOX_MERCHANT_ID = "00000000-0000-0000-0000-000000000001";

async function getEnabledMethods(): Promise<string[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("merchant_operators")
    .select("method")
    .eq("merchant_id", SANDBOX_MERCHANT_ID)
    .eq("enabled", true);
  return (data ?? []).map((r: { method: string }) => r.method);
}

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: { product?: string };
}) {
  const productId = searchParams.product || "";
  const [product, enabledMethods] = await Promise.all([
    fetchProductById(productId),
    getEnabledMethods(),
  ]);

  if (!product || !product.active) {
    return (
      <div>
        <p className="text-stone-600">Produit introuvable ou indisponible.</p>
        <Link href="/" className="text-sm text-stone-900 underline mt-4 inline-block">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return <CheckoutForm product={product} enabledMethods={enabledMethods} />;
}
