# get.nsi.xyz

Démonstration d'un **formulaire HTTP GET** (site de cours 1NSI).

Le calcul est effectué **côté serveur** par un Cloudflare Worker : le code
source affiché par le navigateur ne montre qu'un HTML propre (aucun script
serveur exposé, comme avec PHP).

## Comportement

- `GET /` → le formulaire vide.
- `GET /?nb1=…&nb2=…` → le formulaire pré-rempli **et** le résultat.
- Les entrées « absurdes » sont acceptées (mots, décimaux, HTML…) et
  interprétées « à la PHP » : un texte non numérique vaut 0.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/index.js` | Le Worker : page, calcul, `/style.css` |
| `wrangler.json` | Projet Cloudflare + domaine personnalisé `get.nsi.xyz` |

## Déploiement

```bash
node ../workflow/scripts/wrangler.mjs deploy   # ou : npx wrangler deploy
```
