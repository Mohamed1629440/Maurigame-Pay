// Utilitaires purs (pas de dépendance Supabase) — utilisable côté client et serveur

export function formatMRU(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " MRU";
}

export function generateRef(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return "KP-" + rand;
}

// Génère un ID slug à partir d'un nom (pour les nouveaux produits)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}
