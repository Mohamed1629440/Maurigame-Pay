# Contributing to KitPay SolutionIA

Merci de votre interet pour KitPay SolutionIA. Les contributions sont les
bienvenues en francais, anglais ou arabe. Ce document decrit les cas les
plus utiles et le process de pull request.

## Ce qui aide vraiment le projet

### 1. Signaler un nouveau format de SMS operateur

C'est probablement la contribution la plus precieuse. Chaque banque et
chaque application mobile money peut changer le format de son SMS de
confirmation sans preavis. Si vous voyez un SMS qui n'est pas parse
correctement :

1. Ouvrez une issue avec le titre `SMS parsing: <operateur> <version app>`.
2. Copiez le SMS exact **en anonymisant** le numero et les montants
   (remplacez le numero par `+222 46 XX XX XX` et les montants par un
   nombre rond fictif).
3. Precisez l'operateur, la version de l'application, et la date.
4. Ne partagez jamais un vrai numero de telephone, une reference de
   transaction reelle ou le montant reel.

Exemple d'issue utile :

```
Operateur: Bankily 4.2
Date: 2026-09-22
Format observe: "Vous avez recu XX MRU de +222 46 XX XX XX. Ref: NNNNN"
Fichier concerne: src/app/api/sms-ingest/route.ts (branche Bankily)
```

### 2. Ameliorer la documentation

- Corrections de coquilles, clarifications, exemples supplementaires.
- Traduction vers l'anglais ou l'arabe des sections manquantes.
- Nouveaux tutoriels d'integration (Node, PHP, Python, Django, Laravel,
  Rails, etc.).

### 3. Nouveaux operateurs

Si vous voulez ajouter un operateur qui n'est pas encore supporte
(par exemple un nouveau service mobile money mauritanien) :

1. Ouvrez une issue de discussion d'abord pour valider l'approche.
2. Ajoutez la branche de parsing dans `src/app/api/sms-ingest/route.ts`.
3. Ajoutez la fonction SQL `match_payment_<operateur>` dans une nouvelle
   migration `supabase/v37_...sql`.
4. Documentez le format SMS dans `docs/operators.md` avec un exemple
   anonymise.

## Process de pull request

1. Fork ce depot puis creez une branche depuis `main`
   (`git checkout -b fix/bankily-parser`).
2. Faites vos changements. Preferez plusieurs petits commits clairs a un
   seul enorme commit.
3. Verifiez que `npm run lint` et `npm test` passent.
4. Ouvrez la PR contre `main` avec :
   - une description en une ou deux phrases de ce qui change et pourquoi ;
   - un lien vers l'issue si applicable ;
   - une note "testable en" avec les etapes pour reproduire.
5. Un mainteneur relira sous une semaine. Merci de rester patient.

## Ce qui sera refuse

- Cle API, secret, numero de telephone reel ou reference de transaction
  reelle dans un PR.
- Ajout de dependance lourde sans justification.
- Changement de licence.
- Modification du nom "KitPay" ou "KitPay SolutionIA" dans les fichiers
  principaux (voir la mention dans le fichier `LICENSE`).

## Code de conduite

Soyez respectueux. La communaute mauritanienne tech est petite, tout le
monde se retrouve. Pas d'attaque personnelle, pas de discrimination, pas
de contenu politique dans les issues et les PR.
