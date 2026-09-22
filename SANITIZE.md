# Sanitize log

Rapport des elements retires ou anonymises avant la publication publique
de ce depot sous MIT. Ce document sert de trace pour audit.

## 1. Fichiers supprimes du depot avant publication

| Chemin                                   | Raison                                                        |
|------------------------------------------|---------------------------------------------------------------|
| `n8n/` (dossier entier, 25 fichiers)     | Legacy : n8n n'est plus utilise dans la chaine. Contenait aussi 8 JWT n8n API hardcoded. |
| `docs/superpowers/` (dossier entier)     | Notes internes de conception, fortement contextualisees Solutionia. |
| `_inspect.mjs`, `_inspect2.mjs`, `_inspect3.mjs`, `_inspect4.mjs` | Scripts de debug personnels lus `.env.local`. |
| `_rollback.mjs`, `_rollback2.mjs`        | Scripts de rollback personnels.                                |
| `API KitPay SUPABASE.txt`                | Contenait 2 cles Supabase (sb_secret + sb_publishable) en clair. |
| `MIGRATION_V2.md`, `MIGRATION_V3.md`     | Docs de versions internes, references chemins Windows persos. |
| `.env.local`                             | Contenait 13 vrais secrets. Non copie lors de la duplication du repo. |
| `.git/`                                  | Historique Git de developpement retire. Republication depuis un depot vierge. |
| `tsconfig.tsbuildinfo`                   | Cache TypeScript, non versionne.                              |
| `supabase/v17_seed_solutionia_membership.sql` | Seed lie a l'utilisateur `<owner-email>` en dur. |
| `supabase/v19_seed_solutionia_keys.sql`  | Idem, avec generation de cles API Solutionia.                 |
| `supabase/v28_seed_masrvi_operator.sql`  | Seed d'operateur pour le merchant Solutionia.                 |
| `supabase/_verify_v5_to_v17.sql`         | Script de verification perso.                                 |
| `src/app/api/internal/` (dossier entier) | Routes legacy declenchees par n8n (jamais appelees dans le flow actuel). |
| `.claude/`                               | Config editeur agent.                                          |

## 2. Fichiers dont le contenu a ete assaini

| Fichier                                     | Element sanitize                                       | Remplacement                       |
|---------------------------------------------|--------------------------------------------------------|-----------------------------------|
| `.env.example`                              | Refonte totale : ajout de commentaires, retrait references n8n, ajout `CRON_SECRET`, retrait `INTERNAL_SECRET` obsolete. | Placeholders explicites.          |
| `.gitignore`                                | Refonte totale : ajout `.env.*`, `.netlify/`, `.vercel/`, scripts `_*.mjs`, editors, OS files. | Version robuste.                  |
| `README.md`                                 | Ancien README pointait n8n comme architecture active et incluait des chemins Windows personnels. | Reecrit de zero bilingue EN/FR.   |
| `middleware.ts`                             | Commentaire "n8n internal endpoints", matcher incluait `api/internal`. | Retire api/internal, commentaire mis a jour. |
| `supabase/migration_v3_multitenant.sql`     | Seed hardcode du merchant "Solutionia SARL" avec email `<owner-email>`. | Bloc retrofit legacy neutre.      |
| `supabase/v5_apply_v3_v4_if_missing.sql`    | Idem seed Solutionia.                                  | Bloc retrofit legacy neutre.      |
| `supabase/v18_handle_new_user_v2.sql`       | Commentaire referencant "Solutionia".                  | Commentaire generique.            |
| `supabase/v22_enqueue_webhook_delivery.sql` | Commentaire "Le worker n8n picke".                     | Description du worker Next.js.    |
| `supabase/v30_match_payment_sedad.sql`      | Numero client 4XXXXXXX dans commentaire, seed operateur hardcode. | Anonymise en `XXXXXXXX`, seed retire. |
| `supabase/v31_match_payment_click_natif.sql` | Numero client XX XX XX XX dans commentaire, seed operateur hardcode. | Anonymise, seed retire. |
| `supabase/v35_match_payment_bcipay.sql`     | Numero marchand 3XXXXXXX dans commentaire, seed operateur hardcode. | Anonymise, seed retire. |
| `supabase/v36_match_payment_bankily.sql`    | Numero client 4XXXXXXX dans commentaire, seed operateur hardcode. | Anonymise, seed retire. |
| `src/app/api/sms-ingest/route.ts`           | Cinq numeros reels 3XXXXXXX / 4XXXXXXX / 2XXXXXXX dans les exemples SMS des commentaires. | Placeholders `XXXXXXXX` / `XX XX XX XX`. |
| `src/app/api/demo/route.ts`                 | `SANDBOX_MERCHANT_ID` hardcode a `00000000-...-0001` (Solutionia) + commentaires Solutionia + reference n8n. | Nouveau : env var `SANDBOX_MERCHANT_ID`, fallback = premier merchant, commentaires reecrits. |
| `src/app/layout.tsx`                        | Metadata description `Editions par Solutionia`, lien vers `https://solutionia.work` dans footer, email `contact@solutionia.work` dans footer. | Description neutre, mention "Open source sous licence MIT", credit MIT + GitHub. |
| `src/app/page.tsx` (landing)                | Section TRUST CLIENTS complete avec liens `https://sign.solutionia.work`, `https://lpproduction.netlify.app`, `https://nouakchott.biz` + emails `contact@solutionia.work` + URL `https://api.solutionia.work` dans code snippet. | Section retiree, URLs remplacees par `https://YOUR_DOMAIN`, emails par `hello@example.com`. |
| `src/app/dashboard/developers/page.tsx`     | URL par defaut `https://api.solutionia.work`.          | `https://YOUR_DOMAIN`.            |
| `src/app/sandbox/page.tsx`                  | "meme infrastructure que Sign.solutionia.work" + email contact. | Texte generique + email placeholder. |
| `src/app/onboarding/merchant/page.tsx`      | Placeholders reels avec noms et numero marchand. | `Ma boutique, Cafe Central...`, `Ma SARL`, `46 XX XX XX`. |
| `src/app/dashboard/settings/SettingsForm.tsx` | Placeholder `Ex: SOLUTIONIA SARL`.                    | `Ex: MA SARL`.                     |
| `src/app/payment/[ref]/page.tsx`            | Fallback tel `+222 22 45 67 89`.                       | `+222 46 XX XX XX`.               |
| `src/app/_marketing/HeroDemo.tsx`           | URL `kitpay.solutionia.work` dans une preview d'iframe. | `your-domain.example`.            |
| `src/lib/email.ts`                          | Pied du recu email `Solution IA - Nouakchott, Mauritanie - NIF: a renseigner`. | Retire (footer neutre KitPay).   |
| `android/SETUP.md`                          | Documentait les URLs n8n cloud (`https://<n8n-instance>/webhook/kitpay-sms*`), incompatible avec le flow actuel. | Redirige vers `docs/android-setup.md` reecrit sans n8n. |

## 3. Fichiers ajoutes

| Fichier                                        | Role                                                                |
|------------------------------------------------|---------------------------------------------------------------------|
| `README.md`                                    | Documentation produit bilingue EN/FR.                              |
| `INSTALL.md`                                   | Guide de deploiement pas a pas.                                    |
| `AGENTS.md`                                    | Instructions pour agents IA (Claude Code, Copilot, Cursor, etc.).  |
| `LICENSE`                                      | MIT + clause trademark (nom KitPay reserve).                       |
| `SECURITY.md`                                  | Politique de reporting de vulnerabilite.                           |
| `CONTRIBUTING.md`                              | Guide contributions (FR/AR/EN).                                    |
| `SANITIZE.md`                                  | Le present document.                                                |
| `docs/architecture.md`                         | Composants, tables, cycle de vie payment_intent.                   |
| `docs/api.md`                                  | Reference API REST avec exemples cURL.                             |
| `docs/integration.md`                          | Deux patterns (redirect callback + webhook HTTP signe).            |
| `docs/operators.md`                            | Un tableau par operateur avec format SMS anonymise.                |
| `docs/android-setup.md`                        | Config forwarder SMS sans references n8n.                          |
| `src/app/api/cron/deliver-webhooks/route.ts`   | Worker HTTP qui livre les webhooks signes HMAC avec retry exponentiel. |

## 4. A faire cote infrastructure APRES publication

Elements a rotationner ou desactiver cote services externes, meme si
les valeurs ne sont plus dans le repo :

- Rotationner `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_ANON_KEY` du
  projet Supabase concerne.
- Rotationner la Resend API Key.
- Revoquer et recreer le bot Telegram.
- Changer `ADMIN_PASSWORD` en prod.
- Changer `WEBHOOK_SECRET` en prod + mettre a jour le forwarder Android.
- Changer `CRON_SECRET` en prod + mettre a jour cron-job.org.
- Revoquer la n8n API Key qui trainait dans les scripts `n8n/*.js`.

## 5. Verifications finales

Commandes lancees et resultats :

```bash
# Aucune reference Solutionia sensible restante dans le code source
grep -rniE "(sign\.solutionia|nouakchott\.biz|lpproduction|<real-phone-numbers>|<owner-email>)" src/ supabase/
# -> aucun match hors des attributions legitimes de licence

# Aucun JWT ou cle Supabase reelle en clair
grep -rE "(eyJhbGciOi|sb_secret_[A-Za-z0-9_]{20,}|re_[a-zA-Z0-9]{20,}|kp_(test|live)_[a-f0-9]{20,})" \
  --exclude-dir=node_modules --exclude-dir=.next .
# -> aucun match

# .env.local absent du depot
ls -la .env.local 2>&1
# -> No such file or directory
```

## 6. Elements gardes intentionnellement

- Attribution "Solutionia SARL" dans `LICENSE`, `README.md` et le footer
  de `src/app/layout.tsx` : legitime en tant qu'editeur du projet MIT.
- Nom "KitPay SolutionIA" dans le repo : marque du projet.
- Reference a Nouakchott dans `LICENSE` et les commentaires SQL
  (`city text DEFAULT 'Nouakchott'`) : choix produit legitime (KitPay
  cible la Mauritanie).
