# Operateurs supportes

Chaque operateur envoie un SMS de confirmation dans son propre format
sur le telephone marchand. Ce document liste, pour chacun, le format
attendu par le parser inclus dans `src/app/api/sms-ingest/route.ts` et
les particularites connues.

Les exemples sont anonymises. Remplacer `XXXXXXXX` par un vrai numero
a 8 chiffres et `XX` par des chiffres reels.

## Bankily

| Champ                       | Valeur                                                        |
|-----------------------------|---------------------------------------------------------------|
| Identifiant methode         | `Bankily`                                                     |
| Type d'identifiant marchand | Numero de telephone                                           |
| Expediteur SMS observe      | `Bankily`, ou `Click` lorsque le paiement transite par GIMTEL |
| Format SMS                  | `Transfert recu : 5  de +222XXXXXXXX (BANKILY)\n#REF...`      |
| Champs extraits             | montant + telephone client                                    |
| Branche parser              | declenche si `from` contient `bankily` OU si le corps contient `(BANKILY)` |
| Fonction SQL                | `match_payment_bankily`                                       |

### Particularites

- Les paiements Bankily transitent souvent via GIMTEL, ce qui fait que
  le SMS provient de l'expediteur `Click` avec la mention `(BANKILY)`
  entre parentheses dans le corps.
- Le montant est parfois suivi de deux espaces (normal, on normalise).
- Le double espace apres `recu :` est reel : ne pas le corriger dans le
  parser.

## Masrvi

| Champ                       | Valeur                                                        |
|-----------------------------|---------------------------------------------------------------|
| Identifiant methode         | `Masrvi`                                                      |
| Type d'identifiant marchand | Numero + code marchand (6 chiffres)                           |
| Expediteur SMS observe      | `BMCI` (pas `Masrvi`)                                         |
| Format SMS                  | `Client +222 XX XX XX XX (REF123456) a paye 50.00 MRU pour la facture #.` |
| Champs extraits             | montant + telephone client                                    |
| Branche parser              | declenche si `from` contient `bmci` OU si le corps contient `pour la facture` |
| Fonction SQL                | `match_payment_masrvi`                                        |

### Particularites

- L'expediteur SMS est `BMCI`, pas `Masrvi`. Configurer le forwarder
  sur `BMCI`.
- SMS multi-lignes (retour a la ligne dans le corps). Utiliser le mode
  query param `?sms_body=...` du forwarder plutot que le JSON body,
  sinon les sauts de ligne cassent le JSON.
- Le code marchand Masrvi (6 chiffres) doit etre communique au client
  via la page hosted.

## Sedad

| Champ                       | Valeur                                                        |
|-----------------------------|---------------------------------------------------------------|
| Identifiant methode         | `Sedad`                                                       |
| Type d'identifiant marchand | Code marchand (5 chiffres)                                    |
| Expediteur SMS observe      | `BMI` (pas `Sedad`)                                           |
| Format SMS                  | `vous avez recu 10.0 MRU de XXXXXXXX`                         |
| Champs extraits             | montant + telephone client                                    |
| Branche parser              | declenche si `from` contient `sedad` (forcer manuellement dans le forwarder) |
| Fonction SQL                | `match_payment_sedad`                                         |

### Particularites

- Piege important : l'expediteur reel du SMS est `BMI`, mais le parser
  ne se declenche que si `from` contient `sedad`. Dans MacroDroid, il
  faut donc filtrer sur l'expediteur `BMI` mais forcer le champ
  `from=Sedad` dans le body/query param.
- Le meme numero peut recevoir des SMS Sedad ET BIM depuis l'expediteur
  `BMI` selon le type de compte.

## BIM

| Champ                       | Valeur                                                        |
|-----------------------------|---------------------------------------------------------------|
| Identifiant methode         | `BIM`                                                         |
| Type d'identifiant marchand | Code marchand (5 chiffres)                                    |
| Expediteur SMS observe      | `BIM`                                                         |
| Format SMS                  | `Vous avez recu 40 MRU du XXXXXXXX`                           |
| Champs extraits             | montant + telephone client                                    |
| Branche parser              | declenche si `from` contient `bim` ET pas `bci`               |
| Fonction SQL                | `match_payment_bim`                                           |

### Particularites

- Le meme format que BCIPAY : le parser distingue par l'expediteur
  (`BIM` sans `BCI` -> branche BIM).
- Le SMS ne contient pas le telephone marchand (seulement le tel du
  payeur), donc le matching Tier 1 se fait exclusivement sur
  `customer_phone` + `amount`. Si le client n'a pas ete demande son
  numero a l'avance, le matching passera en Tier 2 (amount seul).

## Click

| Champ                       | Valeur                                                        |
|-----------------------------|---------------------------------------------------------------|
| Identifiant methode         | `Click`                                                       |
| Type d'identifiant marchand | Code marchand (6 chiffres)                                    |
| Expediteur SMS observe      | `Click`                                                       |
| Format SMS moderne          | `Client +222 XX XX XX XX a paye 5.00 MRU`                     |
| Format SMS ancien (masque)  | `Client *NNNN a paye 5.00 MRU. (REFXXXXXXX).`                 |
| Champs extraits             | montant + telephone client (les 4 derniers chiffres seulement dans l'ancien format) |
| Branche parser              | declenche si `from` contient `click`                          |
| Fonction SQL                | `match_payment_click`                                         |

### Particularites

- L'ancien format masque le numero client aux 4 derniers chiffres
  (`*0015`). Le matching Tier 1 est alors difficile (`expected_phone`
  ne matche pas). Utiliser `match_payment_click` avec un guard sur les
  4 derniers chiffres, ou se rabattre sur Tier 2.
- SMS multi-lignes ("Nouveau solde X MRU" sur la 2e ligne). Utiliser
  le mode query param du forwarder.

## BCIPAY

| Champ                       | Valeur                                                        |
|-----------------------------|---------------------------------------------------------------|
| Identifiant methode         | `BCIPAY`                                                      |
| Type d'identifiant marchand | Code marchand (5 chiffres)                                    |
| Expediteur SMS observe      | `BCIPAY` (parfois juste `BCI`)                                |
| Format SMS                  | `Vous avez recu 5.0 MRU du XXXXXXXX`                          |
| Champs extraits             | montant + telephone client                                    |
| Branche parser              | declenche si `from` contient `bci` ou `bcipay`                |
| Fonction SQL                | `match_payment_bcipay`                                        |

### Particularites

- Meme format que BIM. Le parser distingue via l'expediteur : si `from`
  contient `bci`, c'est BCIPAY ; si `bim` sans `bci`, c'est BIM.
- Le SMS ne contient jamais le telephone du payeur (le `XXXXXXXX` dans
  le SMS est le tel MARCHAND, pas le client). Donc le matching est
  quasi-systematiquement Tier 2 (amount seul).

## Ajouter un nouvel operateur

Voir la section "Common tasks a user will ask you to do" #3 dans
[AGENTS.md](../AGENTS.md) pour la marche a suivre complete :

1. Ajouter une branche dans `parseSms()` (`src/app/api/sms-ingest/route.ts`).
2. Creer une migration SQL `supabase/v37_match_payment_<name>.sql`.
3. Ajouter la valeur au CHECK constraint sur `payment_intents.method`.
4. Etendre `METHOD_FN` et `VALID_METHODS`.
5. Documenter le SMS dans ce fichier.
6. Ajouter une fixture dans `tests/test-methods-parser.mjs`.
