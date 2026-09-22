# KitPay SolutionIA

**A sovereign SMS-driven payment infrastructure for Mauritania.**
**Une infrastructure de paiement souveraine pilotee par SMS pour la Mauritanie.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Made for Mauritania](https://img.shields.io/badge/Made%20for-Mauritania-brightgreen.svg)](https://en.wikipedia.org/wiki/Mauritania)

---

## English

### The problem

Mauritania has no Stripe, no PayPal Business, no Adyen. Every merchant who
wants to accept a payment ends up doing the same manual dance: the customer
sends money through Bankily, Masrvi, Sedad, BIM, Click or BCIPAY, and the
merchant reads the SMS receipt, checks the amount, reconciles it against
the order in a spreadsheet. It works, but it does not scale, it produces
mistakes, and it is impossible to plug into a website checkout or a SaaS.

### The idea

Every operator sends a confirmation SMS to the merchant phone when a
payment arrives. KitPay SolutionIA turns those SMS into a real payment
infrastructure:

1. A merchant creates a `payment_intent` via a REST API call (`POST /v1/intents`)
   with an amount and a method.
2. The customer is redirected to a hosted checkout page (`/pay/KP-XXXXXX`)
   that shows the exact number to send the money to.
3. The customer pays through the operator app as usual.
4. The confirmation SMS arrives on the merchant phone. An Android SMS
   forwarder application POSTs the raw SMS to the KitPay server.
5. KitPay parses the SMS, matches it against pending intents (Tier 1 by
   phone + amount, Tier 2 by amount alone) and marks the intent `paid`.
6. The hosted checkout page detects the status change and either redirects
   the customer to the merchant `success_url` or notifies the merchant
   server via a signed HTTP webhook.

At no point does KitPay touch the money. The funds stay in the merchant
mobile money account.

### The flow

```
   Customer                    Merchant app                   KitPay
      |                              |                            |
      |----- selects amount -------->|                            |
      |                              |--- POST /v1/intents ------>|
      |                              |<-- {hosted_url, ref} ------|
      |<-------------- redirect to hosted_url --------------------|
      |                                                           |
      |----- pays via Bankily/Masrvi/BIM/Click/Sedad/BCIPAY ----->|
      |                                                           |
      |                                                           v
      |                                             [Merchant phone]
      |                                             receives operator SMS
      |                                                           |
      |                                             Android SMS forwarder
      |                                                 POST /api/sms-ingest
      |                                                           |
      |                                                           v
      |                                             match_payment_* (Supabase)
      |                                                UPDATE status='paid'
      |                                             INSERT webhook_deliveries
      |                                                           |
      |<-------------- redirected to success_url -----------------|
                                                                  |
                                                                  v
                                             /api/cron/deliver-webhooks
                                                (external cron, every 30s)
                                                          POST merchant URL
                                                          X-KitPay-Signature
```

### What this repository contains

- **Next.js 14 application** (App Router, TypeScript, Tailwind CSS).
- **Public REST API** at `/api/v1/intents` (Stripe-style, Bearer token
  auth, idempotency keys, rate limiting, audit log).
- **Hosted checkout page** at `/pay/[ref]` (polling-based, redirects to the
  merchant `success_url`).
- **Merchant dashboard** with onboarding, KYC upload, API keys, webhooks,
  operators and reconciliation.
- **Super-admin dashboard** for KYC review and platform observability.
- **Supabase Postgres schema** (35 migrations, RLS enabled, multi-tenant).
- **Signed HTTP webhook worker** at `/api/cron/deliver-webhooks` with
  exponential retries.
- **SMS ingest endpoint** at `/api/sms-ingest` with six built-in parsers
  (Bankily, Masrvi, Sedad, BIM, Click, BCIPAY).
- **Cron endpoints** for intent expiration and pending finalization.

### Stack

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage + RLS)
- Netlify or Vercel for hosting
- Resend for email receipts
- Telegram Bot API for internal notifications
- Any external cron (cron-job.org, GitHub Actions, Netlify Scheduled
  Functions) to trigger the webhook worker every 30 to 60 seconds
- An Android phone with an SMS forwarder application
  (recommended: [SMS Forwarder](https://play.google.com/store/apps/details?id=tech.bogomolov.incomingsmsgateway)
  by Bogdan Tudose, or MacroDroid)

### Get started

See **[INSTALL.md](./INSTALL.md)** for the full step-by-step guide.

For developers who want to feed this repository to their AI coding
assistant, see **[AGENTS.md](./AGENTS.md)**.

### Documentation

- [docs/architecture.md](./docs/architecture.md) - components, database
  tables, payment intent lifecycle.
- [docs/api.md](./docs/api.md) - REST API reference with cURL examples.
- [docs/integration.md](./docs/integration.md) - two integration patterns
  (redirect callback and signed HTTP webhooks) with Node, Python and PHP
  verification snippets.
- [docs/operators.md](./docs/operators.md) - one table per supported
  operator with the SMS format and known quirks.
- [docs/android-setup.md](./docs/android-setup.md) - configure the SMS
  forwarder on the merchant phone.

### Legal notice

This software is designed for a merchant who wants to accept payments on
their own operator accounts (Bankily, Masrvi, etc.). Collecting funds on
behalf of third parties may constitute a payment service activity and can
require a licence from the Banque Centrale de Mauritanie. Each operator is
responsible for their own compliance. This software is provided as is,
without any warranty, express or implied. See the [LICENSE](./LICENSE)
file for the full terms.

The names "KitPay" and "KitPay SolutionIA" and the associated logo remain
the property of Solutionia SARL. Forks are welcome under the MIT license
but should be renamed to avoid confusion with the official project.

### Credit

Created and maintained by Moulaye El Hacen Hammony
([Solutionia SARL](https://solutionia.work), Nouakchott).

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Francais

### Le probleme

La Mauritanie n'a ni Stripe, ni PayPal Business, ni Adyen. Chaque marchand
qui veut encaisser un paiement en ligne finit par faire la meme
manipulation manuelle : le client envoie de l'argent via Bankily, Masrvi,
Sedad, BIM, Click ou BCIPAY, le marchand lit le SMS de confirmation,
verifie le montant, et rapproche a la main avec sa commande. Ca marche,
mais ca ne passe pas a l'echelle, ca produit des erreurs, et c'est
impossible a brancher sur un checkout de site ou un SaaS.

### L'idee

Chaque operateur envoie un SMS de confirmation sur le telephone du
marchand quand un paiement arrive. KitPay SolutionIA transforme ces SMS en
vraie infrastructure de paiement :

1. Un marchand cree un `payment_intent` via un appel REST
   (`POST /v1/intents`) avec un montant et une methode.
2. Le client est redirige vers une page de checkout hebergee
   (`/pay/KP-XXXXXX`) qui affiche le numero exact ou envoyer l'argent.
3. Le client paie via l'application de l'operateur comme d'habitude.
4. Le SMS de confirmation arrive sur le telephone marchand. Une
   application Android de forwarding SMS envoie le SMS brut au serveur
   KitPay.
5. KitPay parse le SMS, le rapproche des intents en attente (Tier 1 par
   telephone + montant, Tier 2 par montant seul) et passe l'intent en
   `paid`.
6. La page hebergee detecte le changement de statut et redirige le client
   vers le `success_url` du marchand, ou notifie le serveur marchand via
   un webhook HTTP signe.

A aucun moment KitPay ne touche l'argent. Les fonds restent sur le compte
mobile money du marchand.

### Le flux

Voir le schema ASCII dans la section anglaise ci-dessus.

### Ce que contient ce depot

- Application **Next.js 14** (App Router, TypeScript, Tailwind CSS).
- **API REST publique** a `/api/v1/intents` (style Stripe, auth Bearer,
  cles d'idempotence, rate limiting, journal d'audit).
- **Page de checkout hebergee** a `/pay/[ref]` (polling, redirige vers le
  `success_url` du marchand).
- **Dashboard marchand** avec onboarding, upload KYC, cles API, webhooks,
  operateurs et reconciliation.
- **Dashboard super-admin** pour valider les KYC et observer la plateforme.
- **Schema Postgres Supabase** (35 migrations, RLS activee, multi-tenant).
- **Worker webhook HTTP signe** a `/api/cron/deliver-webhooks` avec retry
  exponentiel.
- **Endpoint d'ingestion SMS** a `/api/sms-ingest` avec six parsers
  integres (Bankily, Masrvi, Sedad, BIM, Click, BCIPAY).
- **Endpoints cron** pour l'expiration des intents et la finalisation
  differee.

### Stack technique

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage + RLS)
- Netlify ou Vercel pour l'hebergement
- Resend pour les recus par email
- API Bot Telegram pour les notifications internes
- N'importe quel cron externe (cron-job.org, GitHub Actions, Netlify
  Scheduled Functions) pour declencher le worker webhook toutes les 30 a
  60 secondes
- Un telephone Android avec une application de forwarding SMS
  (recommande : [SMS Forwarder](https://play.google.com/store/apps/details?id=tech.bogomolov.incomingsmsgateway)
  de Bogdan Tudose, ou MacroDroid)

### Commencer

Voir **[INSTALL.md](./INSTALL.md)** pour le guide pas a pas complet.

Pour les developpeurs qui veulent nourrir ce depot a leur assistant IA de
code, voir **[AGENTS.md](./AGENTS.md)**.

### Documentation

- [docs/architecture.md](./docs/architecture.md) : composants, tables,
  cycle de vie d'une intention de paiement.
- [docs/api.md](./docs/api.md) : reference API REST avec exemples cURL.
- [docs/integration.md](./docs/integration.md) : deux patterns
  d'integration (redirect callback et webhooks HTTP signes) avec des
  snippets de verification en Node, Python et PHP.
- [docs/operators.md](./docs/operators.md) : un tableau par operateur
  supporte avec le format SMS et les particularites connues.
- [docs/android-setup.md](./docs/android-setup.md) : configurer le
  forwarder SMS sur le telephone marchand.

### Avertissement juridique

Ce logiciel est concu pour un marchand qui souhaite encaisser des
paiements sur ses propres comptes operateur (Bankily, Masrvi, etc.).
Collecter des fonds pour le compte de tiers peut constituer une activite
de services de paiement et etre soumise a agrement de la Banque Centrale
de Mauritanie. Chaque operateur est responsable de sa propre conformite.
Ce logiciel est fourni tel quel, sans aucune garantie, expresse ou
implicite. Voir le fichier [LICENSE](./LICENSE) pour les termes complets.

Les noms "KitPay" et "KitPay SolutionIA" ainsi que le logo associe
restent la propriete de Solutionia SARL. Les forks sont bienvenus sous
la licence MIT mais doivent etre renommes pour eviter la confusion avec
le projet officiel.

### Credit

Cree et maintenu par Moulaye El Hacen Hammony
([Solutionia SARL](https://solutionia.work), Nouakchott).

Les contributions sont les bienvenues. Voir [CONTRIBUTING.md](./CONTRIBUTING.md).
