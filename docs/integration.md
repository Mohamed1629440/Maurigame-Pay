# Integration guide

Deux patterns d'integration sont supportes, souvent combines.

## Pattern 1 : Redirect callback (recommande, sans infrastructure)

Le plus simple, aucune infrastructure requise cote marchand.

### Flow

1. Le client clique "Payer" sur votre site.
2. Votre serveur cree un intent avec `success_url` et `cancel_url` :

```bash
curl -X POST https://kitpay.example/api/v1/intents \
  -H "Authorization: Bearer kp_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "method": "Bankily",
    "success_url": "https://votre-site.com/order/1234/kitpay-return",
    "cancel_url": "https://votre-site.com/order/1234/cancel",
    "metadata": {"order_id": "1234"}
  }'
```

3. Vous recevez `{ref, hosted_url, ...}`. Redirigez le client :

```javascript
res.redirect(303, hostedUrl);
```

4. Le client paie via Bankily/Masrvi/etc. sur la page hosted.
5. KitPay detecte le paiement (SMS + match), et redirige le client
   vers `success_url` (ou `cancel_url` en cas d'annulation ou
   d'expiration).
6. Sur votre `success_url`, vous verifiez le statut cote serveur :

```bash
curl https://kitpay.example/api/v1/intents/KP-A3F9X2 \
  -H "Authorization: Bearer kp_live_..."
```

Si `status="paid"`, marquer la commande payee et livrer.

### Avantages

- Aucune infrastructure serveur cote marchand (pas de endpoint public
  a exposer).
- Pattern familier : identique a Stripe Checkout ou PayPal.
- Fonctionne meme si le worker webhook KitPay est en panne.

### Inconvenients

- Si le client ferme le navigateur avant la redirection, vous ne saurez
  pas immediatement que le paiement a reussi (il faudra attendre le
  polling de votre cron interne, ou l'action manuelle du client).

## Pattern 2 : Signed HTTP webhook (async)

Le pattern classique Stripe pour recevoir un POST HTTPS signe des que
le paiement est detecte, meme si le client a ferme son navigateur.

### Setup

1. Dans `/dashboard/webhooks`, cliquer "Ajouter un webhook".
2. Renseigner :
   - URL : votre endpoint (`https://votre-site.com/kitpay/webhook`).
   - Evenements : cocher `payment.succeeded`, `payment.expired`,
     `payment.cancelled`.
3. Sauvegarder. KitPay affiche le secret HMAC (`whsec_...`). Le noter,
   il ne sera plus jamais affiche.

### Format du POST

```
POST https://votre-site.com/kitpay/webhook
Content-Type: application/json
X-KitPay-Signature: t=1727020200,v1=abcdef1234567890...
User-Agent: KitPay-Webhook/1.0

{
  "id": "evt_a1b2c3d4",
  "type": "payment.succeeded",
  "created": 1727020200,
  "livemode": true,
  "data": {
    "object": {
      "ref": "KP-A3F9X2",
      "amount": 5000,
      "method": "Bankily",
      "status": "paid",
      "matched_tier": 1,
      "customer_phone": "+222 46 XX XX XX",
      "actual_sender_phone": "+222 46 XX XX XX",
      "description": "Commande #1234",
      "metadata": {"order_id": "1234"},
      "paid_at": "2026-09-22T16:23:45Z",
      "created_at": "2026-09-22T16:15:00Z"
    }
  }
}
```

### Verification de la signature

Le header `X-KitPay-Signature` est au format Stripe-like :

```
t=<unix_ts>,v1=<hex_hmac_sha256>
```

Le HMAC est calcule sur `"{t}.{raw_body}"` avec votre `whsec_...`.

Verifiez :
1. La signature correspond bien au calcul HMAC-SHA256.
2. Le timestamp `t` est recent (typiquement < 5 minutes) pour eviter
   les rejeux.

### Snippet Node.js

```javascript
const crypto = require('crypto');

function verifyKitPaySignature(rawBody, header, secret, toleranceSec = 300) {
  const parts = Object.fromEntries(
    header.split(',').map(p => p.split('=').map(s => s.trim()))
  );
  const t = parseInt(parts.t, 10);
  const v1 = parts.v1;
  if (!t || !v1) return false;

  if (Math.abs(Math.floor(Date.now() / 1000) - t) > toleranceSec) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Express example
app.post('/kitpay/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body.toString('utf8');
    const header = req.get('X-KitPay-Signature');
    if (!verifyKitPaySignature(rawBody, header, process.env.KITPAY_WEBHOOK_SECRET)) {
      return res.status(400).send('invalid signature');
    }
    const event = JSON.parse(rawBody);
    if (event.type === 'payment.succeeded') {
      // grant order, update DB, etc.
    }
    res.status(200).send('ok');
  }
);
```

### Snippet Python

```python
import hmac, hashlib, time
from flask import Flask, request, abort

app = Flask(__name__)

def verify_kitpay_signature(raw_body: bytes, header: str, secret: str, tolerance: int = 300) -> bool:
    parts = dict(p.strip().split('=', 1) for p in header.split(','))
    t = int(parts.get('t', 0))
    v1 = parts.get('v1', '')
    if not t or not v1:
        return False
    if abs(int(time.time()) - t) > tolerance:
        return False
    payload = f"{t}.{raw_body.decode('utf-8')}".encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)

@app.post('/kitpay/webhook')
def webhook():
    header = request.headers.get('X-KitPay-Signature', '')
    if not verify_kitpay_signature(request.data, header, KITPAY_WEBHOOK_SECRET):
        abort(400, 'invalid signature')
    event = request.get_json(force=True)
    if event['type'] == 'payment.succeeded':
        # grant order, update DB, etc.
        pass
    return 'ok', 200
```

### Snippet PHP

```php
<?php
function verify_kitpay_signature(string $rawBody, string $header, string $secret, int $tolerance = 300): bool {
    $parts = [];
    foreach (explode(',', $header) as $p) {
        [$k, $v] = array_map('trim', explode('=', $p, 2));
        $parts[$k] = $v;
    }
    $t = (int)($parts['t'] ?? 0);
    $v1 = $parts['v1'] ?? '';
    if (!$t || !$v1) return false;
    if (abs(time() - $t) > $tolerance) return false;
    $expected = hash_hmac('sha256', $t . '.' . $rawBody, $secret);
    return hash_equals($expected, $v1);
}

$raw = file_get_contents('php://input');
$header = $_SERVER['HTTP_X_KITPAY_SIGNATURE'] ?? '';
if (!verify_kitpay_signature($raw, $header, getenv('KITPAY_WEBHOOK_SECRET'))) {
    http_response_code(400);
    exit('invalid signature');
}
$event = json_decode($raw, true);
if ($event['type'] === 'payment.succeeded') {
    // grant order, update DB, etc.
}
echo 'ok';
```

### Politique de retry

Le worker KitPay reessaie une livraison qui ne repond pas en 2xx avec
la sequence suivante :

| Tentative | Delai avant la prochaine  |
|-----------|---------------------------|
| 1 (initiale) | 1 minute               |
| 2         | 5 minutes                 |
| 3         | 30 minutes                |
| 4         | 2 heures                  |
| 5         | 12 heures                 |
| 6 et plus | marque `failed` (arret)   |

Considere comme succes : tout code HTTP dans `[200, 299]`.
Considere comme echec : timeout (10 secondes), erreur reseau, ou tout
autre code HTTP (`3xx`, `4xx`, `5xx`).

Le marchand peut declencher un retry manuel depuis le dashboard
(`/dashboard/webhooks/{id}`), meme apres l'etat `failed`.

### Bonnes pratiques cote marchand

- **Idempotence** : conservez la liste des `event.id` deja traites
  (par exemple dans une table `kitpay_processed_events`). Meme evenement
  = ne traiter qu'une fois.
- **Reponse rapide** : votre endpoint doit repondre en moins de 10s.
  Faites le vrai travail (envoi de mail, mise a jour ERP, etc.) en
  asynchrone (queue, worker) apres avoir renvoye le 200.
- **Ne pas se fier au timestamp du serveur KitPay** : utilisez plutot
  `data.object.paid_at` qui vient du match SMS et refletle l'heure de
  paiement reelle.
- **Verifier `livemode`** : filtrer les evenements test si vous ne
  voulez pas polluer votre production.

## Combiner les deux patterns

Pattern conseille pour un e-commerce robuste :

- **Redirect callback** pour l'UX client (retour immediat, page de
  merci).
- **Webhook signe** pour le traitement backend fiable (marquage
  commande payee, envoi mail marchand, mise a jour stock).

Verifier toujours cote serveur avec `GET /v1/intents/{ref}` avant de
livrer, quel que soit le pattern utilise.
