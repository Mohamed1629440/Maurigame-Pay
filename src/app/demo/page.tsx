import Link from "next/link";
import { fetchActiveProducts } from "@/lib/products";
import { formatMRU } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await fetchActiveProducts();

  return (
    <div className="h-[calc(100vh-4rem)] min-h-[600px] overflow-hidden flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 py-5">
      {/* Header */}
      <div>
        <p className="kp-eyebrow text-[var(--bronze)] mb-1.5">— Démo marchand</p>
        <h1 className="serif text-2xl sm:text-3xl font-medium text-[var(--ink)] leading-tight">
          Choisissez un service
        </h1>
        <p className="text-sm text-[var(--stone-600)] mt-1">
          Paiement en quelques clics via Bankily, Masrvi, Sedad, BIM ou Click.
        </p>
      </div>

      {/* Liste produits — grid avec scroll interne si dépasse */}
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
        {products.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-6 text-center">
            <p className="text-stone-600 text-sm">Aucun produit disponible pour le moment.</p>
            <p className="text-xs text-stone-500 mt-1.5">
              Si vous êtes administrateur, ajoutez des produits depuis{" "}
              <a href="/admin" className="underline">l&apos;admin</a>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col hover:border-[var(--bronze)] transition-colors"
              >
                <h2 className="font-medium text-stone-900 text-sm mb-1.5 leading-tight">
                  {p.name}
                </h2>
                <p className="text-xs text-stone-600 mb-3 flex-1 leading-snug line-clamp-3">
                  {p.description || ""}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">{formatMRU(p.price)}</span>
                  <Link
                    href={`/checkout?product=${p.id}`}
                    className="bg-stone-900 text-white text-xs px-3 py-1.5 rounded-md hover:bg-stone-800 font-semibold"
                  >
                    Acheter →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-3 text-[11px] text-stone-500 bg-stone-100 rounded-lg px-3 py-2">
        <strong className="text-stone-700">À propos :</strong> KitPay teste un flux de paiement par
        SMS. Le SMS de confirmation reçu sur le téléphone marchand déclenche automatiquement la
        validation.
      </div>
    </div>
  );
}
