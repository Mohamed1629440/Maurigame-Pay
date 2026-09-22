# Configuration du telephone Android

Le telephone marchand qui recoit les SMS de confirmation doit forwarder
chaque SMS pertinent au serveur KitPay. Deux applications sont testees
et recommandees :

- **SMS Forwarder** (Bogdan Tudose) : gratuit, open source, simple.
  Recommande pour la plupart des cas.
- **MacroDroid** : gratuit avec limites (achats in-app pour lever les
  limites). Plus flexible, filtres avances, logs detailles.

Dans les deux cas, l'objectif est identique : declencher un
`POST https://<votre-domaine>/api/sms-ingest` a chaque SMS pertinent,
avec le header `x-webhook-secret` valide et un body JSON qui contient
`from` et `sms_body`.

## Prerequis physiques

- Une carte SIM avec les comptes mobile money du marchand actifs.
- Le telephone doit rester **branche en permanence** et connecte a
  Internet.
- Desactiver l'optimisation batterie pour l'application (sinon Android
  la met en veille au bout de quelques heures).
- Configurer un monitoring externe (uptimerobot.com par exemple) qui
  verifie que `POST /api/sms-ingest` repond, et qui vous alerte si le
  telephone est offline.

## Configuration avec SMS Forwarder

1. Installer [SMS Forwarder](https://play.google.com/store/apps/details?id=tech.bogomolov.incomingsmsgateway)
   depuis le Play Store.
2. Ouvrir l'app, autoriser la lecture des SMS.
3. Bouton `+` en bas a droite pour ajouter une regle.
4. Champs a remplir pour chaque operateur :

### Bankily

```
Sender (filter)     : Bankily
URL                 : https://<votre-domaine>/api/sms-ingest
HTTP method         : POST
Headers             : x-webhook-secret: <VOTRE WEBHOOK_SECRET>
                      Content-Type: application/json
Body                : {"from": "%from%", "sms_body": "%text%"}
```

Repeter pour chaque operateur en changeant le filtre expediteur :

| Operateur | Filtre expediteur | Remarque                                                       |
|-----------|-------------------|----------------------------------------------------------------|
| Bankily   | `Bankily`         | Parfois aussi `Click` (paiements via GIMTEL, mentionne dans le corps) |
| Masrvi    | `BMCI`            | Passer aussi le corps en query param si multi-lignes           |
| BIM       | `BIM`             |                                                                |
| Click     | `Click`           |                                                                |
| Sedad     | `BMI`             | ATTENTION: forcer `from=Sedad` (voir ci-dessous)               |
| BCIPAY    | `BCIPAY` ou `BCI` |                                                                |

### Cas special Sedad

Le SMS Sedad vient de l'expediteur `BMI`, mais le parser KitPay ne
declenche la branche Sedad que si `from=Sedad`. Deux options :

**Option A** : creer une regle SMS Forwarder avec filtre `BMI` mais
forcer le champ from dans le body :

```
Body : {"from": "Sedad", "sms_body": "%text%"}
```

**Option B** : utiliser MacroDroid qui permet de rewriter le champ
avant l'envoi.

### Cas special multi-lignes (Masrvi, Click)

Les SMS multi-lignes cassent le JSON body (les retours a la ligne
invalident la chaine). Utiliser un query param a la place :

```
URL  : https://<votre-domaine>/api/sms-ingest?from=BMCI&sms_body=%text%
Body : (vide)
```

Le serveur accepte les deux modes (body JSON ou query param) et prend
la valeur non-vide.

## Configuration avec MacroDroid

MacroDroid offre plus de flexibilite. Pattern general :

```
Trigger : SMS Received -> Sender contains "<operateur>"
Action  : HTTP Request
          Method  : POST
          URL     : https://<votre-domaine>/api/sms-ingest
          Headers : x-webhook-secret: <VOTRE WEBHOOK_SECRET>
                    Content-Type: application/json
          Body    : {"from": "<operateur>", "sms_body": "[sms_message]"}
```

Adapter le trigger, l'operateur et le body pour chaque operateur, en
suivant le tableau ci-dessus.

## Verifier que ca marche

Une fois configure :

1. S'envoyer un SMS depuis un autre telephone contenant le mot cle
   filtre (par exemple `Bankily`).
2. Dans SMS Forwarder ou MacroDroid, verifier que la regle s'est
   declenchee (icone verte ou log).
3. Dans les logs Netlify/Vercel, chercher `sms-ingest`. Vous devez
   voir une entree avec code 200 et `matched: false` (car le SMS de
   test ne correspond a aucun intent) ou `matched: true` si vous avez
   un intent pending.
4. Dans Supabase, la table `orphan_sms` doit contenir la ligne (SMS
   parse mais non matche) OU la table `payment_intents` doit avoir un
   intent passe en `paid`.

## Debug

### Le SMS n'est pas envoye

- Verifier que l'application a bien l'autorisation de lire les SMS.
- Verifier que l'optimisation batterie est desactivee pour l'app.
- Verifier la connexion Internet du telephone.
- Redemarrer l'app.

### Le SMS est envoye mais le serveur repond 401

`WEBHOOK_SECRET` ne matche pas. Verifier :
- La valeur dans le header envoye par le forwarder.
- La valeur dans `.env.local` puis dans les env vars Netlify/Vercel de
  production.
- Redeployer si vous avez change `WEBHOOK_SECRET` en prod.

### Le SMS est parse mais le status ne change pas

Verifier dans la table `orphan_sms` : si votre SMS y est, le parser a
fait son travail mais aucun intent en attente ne matche (montant ou
methode different, ou intent deja expire). Verifier :
- Le montant du SMS = montant de l'intent.
- La methode = celle utilisee lors du `POST /v1/intents`.
- L'intent est encore en status `pending` (pas expire).
- Le tel client saisi (`customer_phone`) matche celui du SMS pour
  Tier 1. Sinon Tier 2 se declenche si un seul intent pending existe
  pour ce montant.

### Le forwarder marche 24h puis s'arrete

Presque toujours l'optimisation batterie Android qui met l'app en
veille. Solutions :

- Parametres > Batterie > Optimisation > Choisir "Non optimise" pour
  SMS Forwarder / MacroDroid.
- Sur certains constructeurs (Xiaomi, Huawei, Oppo), il faut aussi
  aller dans les parametres constructeur specifiques (par exemple
  "Autostart" chez Xiaomi).
- Installer une app "keep alive" comme Wakey.
- Configurer un monitoring qui redemarre le telephone a distance (par
  exemple via Tasker + IFTTT) si le forwarder est mort.
