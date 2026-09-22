// Server-only — fonctions qui nécessitent Supabase service_role
import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export async function fetchActiveProducts(): Promise<Product[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Product;
}

export async function fetchAllProducts(): Promise<Product[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Product[];
}
