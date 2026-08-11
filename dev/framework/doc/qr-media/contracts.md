# QR / Media — contrats de robustesse

## QRWiz

### Payload

- une URL explicite est résolue par `urlResolver` lorsqu'il existe ;
- `canonical=true` utilise l'URL courante sans hash ni query ;
- sans resolver, l'URL courante du navigateur est utilisée si disponible ;
- un payload vide est refusé avant appel de l'encodeur.

### Options normalisées

- `width` : entier borné entre 64 et 4096, défaut 256 ;
- `margin` : entier borné entre 0 et 64, défaut 2 ;
- correction d'erreur : `L`, `M`, `Q` ou `H`, défaut `M` ;
- format : `svg` ou `png`, défaut `svg` ;
- `logoSize` : borné entre 0.10 et 0.32 ;
- `logoRadius` : valeur numérique non négative ;
- `transparent=true` transmet une couleur de fond QR alpha `#00000000`.

### Rendu

`render()` ne dépend plus d'un global `document` ou `Node` :

- SVG : rendu direct via `innerHTML` ;
- Data URL / chaîne : utilisation de `container.ownerDocument` si disponible ;
- sans DOM : la sortie générée est retournée sans `ReferenceError` ;
- objet node-like : remplacement si `nodeType` est présent.

Les valeurs injectées dans l'overlay logo SVG sont échappées.

## MediaWiz

### URL et fallback

L'ordre de résolution est : `url` → `fallbackUrl` → `fallback`.

Les schémas dangereux `javascript:`, `vbscript:` et `data:text/html` sont ignorés. Si l'URL primaire est rejetée mais qu'un fallback sûr existe, le fallback est utilisé.

### Options d'image / vidéo

- `loading` est limité à `lazy` ou `eager` ; toute autre valeur retombe sur `lazy` ;
- `ratio` / `aspectRatio` accepte un nombre positif ou une forme `16/9` ;
- `objectFit` accepte `cover`, `contain`, `fill`, `none`, `scale-down` ;
- les valeurs invalides ne sont pas injectées dans le style.

Les labels, légendes, URLs et styles générés sont échappés avant insertion HTML.

## Compatibilité

- les signatures publiques existantes sont conservées ;
- les options nouvelles sont facultatives ;
- les SVG inline restent un chemin volontairement brut et doivent donc provenir d'une source de confiance.

## Vérification

`tests/qr-media-robustness.test.mjs` a été exécuté localement sur le contenu exact du lot :

```text
qr media robustness tests: ok
```
