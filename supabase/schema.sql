-- =====================================================================
-- KitPay — POC paiement par SMS Bankily/Masrvi
-- Schéma Supabase (à exécuter dans le SQL Editor du dashboard Supabase)
-- =====================================================================

-- 1. Table principale : intentions de paiement
create table if not exists payment_intents (
  ref text primary key,
  product_id text not null,
  product_name text not null,
  amount integer not null check (amount > 0),
  expected_phone text not null,
  method text not null check (method in ('Bankily', 'Masrvi')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  matched_tier integer check (matched_tier in (1, 2, 3)),
  actual_sender_phone text,
  sms_received text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  paid_at timestamptz
);

-- Index pour matching rapide (le tier 1 fait amount + expected_phone + status pending)
create index if not exists idx_pi_match
  on payment_intents (amount, expected_phone, status)
  where status = 'pending';

create index if not exists idx_pi_amount_method
  on payment_intents (amount, method, status)
  where status = 'pending';

create index if not exists idx_pi_status_created
  on payment_intents (status, created_at desc);

-- 2. SMS orphelins (qui n'ont pas matché auto, à réconcilier manuellement)
create table if not exists orphan_sms (
  id uuid primary key default gen_random_uuid(),
  raw_body text not null,
  parsed_amount integer,
  parsed_phone text,
  parsed_method text,
  received_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_to_ref text references payment_intents(ref),
  resolved_by text
);

create index if not exists idx_orphan_unresolved
  on orphan_sms (received_at desc)
  where resolved_at is null;

-- 3. Fonction de matching à 2 niveaux
-- Appelée par n8n via RPC après parsing du SMS
create or replace function match_payment(
  p_amount integer,
  p_sender_phone text,
  p_method text,
  p_raw_sms text
)
returns json
language plpgsql
security definer
as $$
declare
  v_intent payment_intents;
  v_count integer;
  v_orphan_id uuid;
begin
  -- TIER 1 : phone exact + amount exact
  select * into v_intent
  from payment_intents
  where amount = p_amount
    and expected_phone = p_sender_phone
    and method = p_method
    and status = 'pending'
    and expires_at > now()
  order by created_at asc
  limit 1;

  if found then
    update payment_intents
    set status = 'paid',
        matched_tier = 1,
        actual_sender_phone = p_sender_phone,
        sms_received = p_raw_sms,
        paid_at = now()
    where ref = v_intent.ref;

    return json_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref);
  end if;

  -- TIER 2 : amount + method, si UN SEUL candidat pending
  select count(*) into v_count
  from payment_intents
  where amount = p_amount
    and method = p_method
    and status = 'pending'
    and expires_at > now();

  if v_count = 1 then
    select * into v_intent
    from payment_intents
    where amount = p_amount
      and method = p_method
      and status = 'pending'
      and expires_at > now()
    limit 1;

    update payment_intents
    set status = 'paid',
        matched_tier = 2,
        actual_sender_phone = p_sender_phone,
        sms_received = p_raw_sms,
        paid_at = now()
    where ref = v_intent.ref;

    return json_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref);
  end if;

  -- TIER 3 : orphelin → file admin
  insert into orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  values (p_raw_sms, p_amount, p_sender_phone, p_method)
  returning id into v_orphan_id;

  return json_build_object(
    'matched', false,
    'tier', 3,
    'orphan_id', v_orphan_id,
    'candidates_count', v_count
  );
end;
$$;

-- 4. Fonction de réconciliation manuelle (appelée par admin)
create or replace function reconcile_orphan(
  p_orphan_id uuid,
  p_target_ref text,
  p_admin text default 'admin'
)
returns json
language plpgsql
security definer
as $$
declare
  v_orphan orphan_sms;
  v_intent payment_intents;
begin
  select * into v_orphan from orphan_sms where id = p_orphan_id;
  if not found then
    return json_build_object('success', false, 'error', 'orphan not found');
  end if;
  if v_orphan.resolved_at is not null then
    return json_build_object('success', false, 'error', 'already resolved');
  end if;

  select * into v_intent from payment_intents where ref = p_target_ref;
  if not found then
    return json_build_object('success', false, 'error', 'intent not found');
  end if;
  if v_intent.status != 'pending' then
    return json_build_object('success', false, 'error', 'intent not pending');
  end if;

  update payment_intents
  set status = 'paid',
      matched_tier = 3,
      actual_sender_phone = v_orphan.parsed_phone,
      sms_received = v_orphan.raw_body,
      paid_at = now()
  where ref = p_target_ref;

  update orphan_sms
  set resolved_at = now(),
      resolved_to_ref = p_target_ref,
      resolved_by = p_admin
  where id = p_orphan_id;

  return json_build_object('success', true, 'ref', p_target_ref);
end;
$$;

-- 5. Tâche d'expiration (à exécuter par cron Supabase ou n8n schedule)
create or replace function expire_old_intents()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update payment_intents
  set status = 'expired'
  where status = 'pending' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 6. RLS — politique : anon peut LIRE son intent par ref (pour la page paiement),
-- service_role fait tout le reste (insert/update via API et n8n)
alter table payment_intents enable row level security;
alter table orphan_sms enable row level security;

-- Anon peut lire un intent par sa ref (pour le polling/realtime de la page paiement)
create policy "anon read by ref" on payment_intents
  for select to anon using (true);

-- service_role fait tout (utilisé par les Route Handlers Next.js et par n8n)
create policy "service all on intents" on payment_intents
  for all to service_role using (true) with check (true);

create policy "service all on orphans" on orphan_sms
  for all to service_role using (true) with check (true);

-- 7. Realtime : activer pour que la page de paiement reçoive les updates
alter publication supabase_realtime add table payment_intents;
