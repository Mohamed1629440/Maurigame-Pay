# Architecture

## Vue d'ensemble des composants

```
                 +------------------+
                 |  Merchant SaaS   |
                 | (Sign, ERP, etc) |
                 +--------+---------+
                          |
                          | 1. POST /api/v1/intents (Bearer kp_live_...)
                          |    body: {amount, method, success_url, ...}
                          |
                          | 2. redirects customer to hosted_url
                          v
   +---------+     +---------------+       +----------------+
   | Client  |<----|  KitPay Next  |------>| Supabase Auth  |
   |Browser  |     |    (Netlify   |       | +   Postgres   |
   +----+----+     |    /Vercel)   |       | +   Storage    |
        |          +---------------+       | +   Realtime*  |
        |                 ^                +----------------+
        |                 |
        | 3. pays via Bankily/Masrvi/BIM/Click/Sedad/BCIPAY
        v
   [Merchant phone]
   receives operator SMS
        |
        | 4. Android SMS forwarder
        |    POST /api/sms-ingest  header x-webhook-secret
        v
   +---------------+
   |  Next.js api  |
   |  sms-ingest   |
   +-------+-------+
           | 5. parseSms(from, body) - 6 branches
           |    RPC match_payment_<method>(amount, sender, raw)
           v
   +---------------+
   | Supabase RPC  |
   | UPDATE intent |----- 6. enqueue_webhook_delivery() inserts rows
   |  status=paid  |         into webhook_deliveries (status='pending')
   +-------+-------+
           |
           | 7. Hosted page polls get_intent_public every 5s,
           |    sees status=paid, redirects customer to success_url
           v
   +--------------------+
   |  Merchant callback |
   |   (success_url)    |
   +--------------------+
           ^
           | (parallel path)
           |
           | 8. External cron every 30s POSTs
           |    /api/cron/deliver-webhooks?secret=<CRON_SECRET>
           |
   +------------------+           +---------------------+
   |  cron-job.org    |---------->|  deliver-webhooks   |
   |  (or equivalent) |           |  worker (Next.js)   |
   +------------------+           +----------+----------+
                                             | 9. Signs payload with HMAC,
                                             |    POST merchant webhook URL,
                                             |    updates delivery status.
                                             v
                                  +---------------------+
                                  | Merchant webhook    |
                                  | endpoint (any lang) |
                                  +---------------------+

  * Supabase Realtime is available but the current hosted page uses
    simple polling (5s) via get_intent_public() for maximum reliability
    on flaky mobile networks. Realtime can be added later without a
    schema change.
```

## Cycle de vie d'une intention de paiement

```
   [creation: POST /v1/intents]
              |
              v
        +----------+
        | pending  |
        +----+-----+
             |
   +---------+---------------+-----------------+
   | SMS matches Tier 1/2    | expires_at hit  | POST cancel
   | via match_payment_*     | (cron)          |
   v                         v                 v
+------+                +---------+       +-----------+
| paid |                | expired |       | cancelled |
+------+                +---------+       +-----------+
   |
   v
enqueue_webhook_delivery('payment.succeeded', payload)
```

Transitions supportees :

| Etat de depart | Evenement                                       | Etat d'arrivee |
|----------------|-------------------------------------------------|----------------|
| pending        | SMS matche par phone + amount (Tier 1)          | paid           |
| pending        | SMS matche par amount seul (Tier 2, sans collision) | paid       |
| pending        | Cron `/api/cron/expire-intents` apres `expires_at` | expired      |
| pending        | `POST /v1/intents/{ref}/cancel`                 | cancelled      |

Un intent ne peut jamais quitter les etats `paid`, `expired` ou
`cancelled` (etats terminaux).

## Tables Postgres (schema `public`)

| Table                | Role                                                                             |
|----------------------|----------------------------------------------------------------------------------|
| `merchants`          | Un compte marchand par societe. Champs KYC (RC, NIF), status, branding.          |
| `merchant_members`   | Multi-utilisateur par marchand (roles owner, admin, dev, viewer).                |
| `merchant_operators` | Numeros et codes marchand par methode (Bankily, Masrvi, etc.).                   |
| `merchant_plans`     | Tiers de plans (free, pro, enterprise). Sert au rate limiting et a la facturation. |
| `api_keys`           | Cles Bearer par marchand. Format `kp_test_...` / `kp_live_...`, stockees en SHA-256. |
| `payment_intents`    | Intents de paiement. Statut pending/paid/expired/cancelled, mode test/live.      |
| `orphan_sms`         | SMS parses mais non matches (Tier 3). Le marchand peut les reconcilier a la main. |
| `webhooks`           | URLs de webhook configurees par les marchands, avec secret HMAC.                 |
| `webhook_deliveries` | Journal des tentatives de livraison webhook. Le worker cron les traite.          |
| `idempotency_keys`   | Cache 24h pour supporter `Idempotency-Key` sur `POST /v1/intents`.               |
| `api_audit_log`      | Journal des appels API par marchand (retention 90 jours).                        |
| `api_rate_limits`    | Sliding window 1 minute pour le rate limiting par cle API.                       |
| `products`           | Catalogue produits (heritage POC, garde pour la home et le sandbox).             |

## Fonctions SQL cles

| Fonction                          | Role                                                                          |
|-----------------------------------|-------------------------------------------------------------------------------|
| `match_payment_bankily`           | Match Bankily. Tier 1 (phone+amount), Tier 2 (amount avec collision guard).   |
| `match_payment_masrvi`            | Match Masrvi (SMS de BMCI). Meme logique.                                     |
| `match_payment_bim`               | Match BIM.                                                                    |
| `match_payment_sedad`             | Match Sedad.                                                                  |
| `match_payment_click`             | Match Click natif.                                                            |
| `match_payment_bcipay`            | Match BCIPAY.                                                                 |
| `match_payment_v3`                | Fonction generique multi-operateurs (legacy, encore utilisee comme fallback). |
| `enqueue_webhook_delivery`        | Insere une ligne dans `webhook_deliveries` pour chaque webhook actif.         |
| `expire_old_intents`              | Bascule les intents pending en `expired` apres `expires_at`.                  |
| `verify_api_key`                  | Verifie une cle API et retourne le merchant_id, le mode, les scopes.          |
| `handle_new_user`                 | Trigger sur INSERT auth.users. Cree un merchant placeholder pour l'onboarding. |
| `get_intent_public`               | RPC publique (anon key) qui retourne les champs publics d'un intent par ref.  |
| `rate_limit_increment`            | Incremente le compteur de rate limit pour une cle API.                        |

## Row-Level Security

RLS est activee sur toutes les tables sensibles depuis la migration v14.

Pattern general :
- L'utilisateur authentifie (`auth.uid()`) ne voit que les rows de ses
  merchants (helper `public.user_is_member_of(merchant_id)`).
- Le role `service_role` (Supabase service key) bypasse RLS et est
  utilise cote serveur uniquement.
- Le role `anon` (Supabase anon key) ne voit rien, sauf via la RPC
  `get_intent_public(ref)` qui retourne un sous-ensemble strictement
  public (statut, montant, methode, `expires_at`, `success_url`,
  `cancel_url`).

## Modes test vs live

- `kp_test_*` : les intents sont crees en mode `test`. Le SMS ingest
  ignore les intents test (car le SMS reel ne sert qu'a un vrai
  paiement). Les intents test peuvent etre passes en `paid` via
  `POST /v1/test/simulate-payment` pour tester l'integration marchand
  sans envoyer d'argent.
- `kp_live_*` : les intents sont crees en mode `live`. Le KYC du
  marchand doit etre `active` pour pouvoir emettre des cles live.

## Endpoints critiques

| Endpoint                              | Auth                    | Role                                            |
|---------------------------------------|-------------------------|-------------------------------------------------|
| `POST /api/v1/intents`                | Bearer `kp_*`           | Cree un intent.                                 |
| `GET /api/v1/intents/{ref}`           | Bearer `kp_*`           | Lit un intent.                                  |
| `POST /api/v1/intents/{ref}/cancel`   | Bearer `kp_*`           | Annule un intent pending.                       |
| `POST /api/sms-ingest`                | header WEBHOOK_SECRET   | Recoit un SMS depuis le forwarder Android.      |
| `POST /api/cron/deliver-webhooks`     | header CRON_SECRET      | Livre les webhooks en attente. Cron externe.    |
| `POST /api/cron/expire-intents`       | header CRON_SECRET      | Expire les intents. Cron externe (5 min).       |
| `POST /api/cron/finalize-pending`     | header CRON_SECRET      | Retente email/telegram pour paid intents.       |
| `GET /pay/{ref}`                      | public                  | Page hosted de paiement.                        |

## Storage

Un seul bucket : `kyc-documents` (prive). Les fichiers KYC uploades par
les marchands (RC, NIF, ID) sont stockes dans
`kyc-documents/{merchant_id}/{filename}`. Les policies (migration v25)
autorisent :
- l'owner du merchant en CRUD sur son propre dossier,
- le super_admin en SELECT sur tout,
- le service role en bypass.
