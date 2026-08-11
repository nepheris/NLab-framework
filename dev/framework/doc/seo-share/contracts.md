# SEO / Share — contrats de robustesse

## SEOWiz

### Modèle

- `canonical` utilise `canonical`, puis `url`, puis une chaîne vide ;
- `language` vaut `fr` par défaut ;
- `robots` vaut `index,follow` par défaut ;
- `image` utilise `image`, puis `shareImage` ;
- `breadcrumbs` est toujours un tableau : une valeur non-tableau devient `[]`.

### Application au document

`apply()` accepte un document injecté et reste neutre si aucun DOM n'est disponible. Cela permet l'utilisation du modèle SEO dans des contextes de test, SSR ou génération sans navigateur.

Lors d'applications successives :

- une meta dont la nouvelle valeur est vide est supprimée ;
- le canonical est supprimé si la nouvelle valeur est vide ;
- l'ancien JSON-LD est supprimé avant éventuel remplacement ;
- les meta OpenGraph et Twitter ne conservent donc pas d'état obsolète d'une page précédente.

## ShareWiz

### Metadata

L'ordre de sélection d'image est : `image` → `sectionImage` → `siteImage` → `fallbackImage`.

L'URL provient d'une URL explicite, du `urlResolver`, puis de `globalThis.location` si disponible.

### Clipboard

- API absente → `{ ok:false, reason:'clipboard-unavailable' }` ;
- écriture réussie → `{ ok:true }` ;
- erreur d'écriture → `{ ok:false, reason:'clipboard-error', error }`.

### Web Share

- API absente → `{ ok:false, reason:'web-share-unavailable' }` ;
- partage réussi → `{ ok:true }` ;
- rejet / annulation / erreur → `{ ok:false, reason:'web-share-error', error }`.

Aucune référence directe au global lexical `navigator` n'est utilisée : toutes les APIs passent par `globalThis.navigator`.

## Vérification

`tests/seo-share-contracts.test.mjs` couvre modèle, breadcrumbs, DOM absent, création/nettoyage des meta, canonical, JSON-LD, metadata de partage, email, Clipboard, Web Share et QR.

Exécution locale du contenu exact du lot :

```text
seo share contracts tests: ok
```
