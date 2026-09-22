-- =====================================================================
-- KitPay v2 — Migration : products + customer_email
-- À exécuter dans Supabase SQL Editor
-- =====================================================================

-- 1. Nouvelle table products
create table if not exists products (
  id text primary key,
  name text not null,
  description text,
  price integer not null check (price > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_active on products (active, created_at desc);

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Seed avec les 2 produits actuels (idempotent)
insert into products (id, name, description, price, active) values
  ('produit-a', 'Produit A', 'Premier produit de démonstration. Vous pouvez modifier ou supprimer ce produit depuis l''admin.', 5000, true),
  ('produit-b', 'Produit B', 'Second produit de démonstration. Le catalogue est maintenant dynamique : ajoutez vos vrais produits depuis /admin.', 15000, true)
on conflict (id) do nothing;

-- 2. Ajout de customer_email sur payment_intents
alter table payment_intents add column if not exists customer_email text;

-- Suivi de l'envoi de la facture
alter table payment_intents add column if not exists invoice_sent_at timestamptz;

-- 3. RLS pour products
alter table products enable row level security;

-- Anon peut lire les produits actifs (pour la page d'accueil et le checkout)
drop policy if exists "anon read active products" on products;
create policy "anon read active products" on products
  for select to anon using (active = true);

-- service_role fait tout (admin via API routes)
drop policy if exists "service all on products" on products;
create policy "service all on products" on products
  for all to service_role using (true) with check (true);
