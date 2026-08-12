# MediaWiz — modes de vue

## Objectif

Ce lot étend `MediaWiz` avec des modes explicites de consultation et de téléchargement, sans modifier QRWiz ni introduire de dépendance DOM.

Modes normalisés :

- `preview` — comportement historique ;
- `viewer` — vue principale ;
- `inline` — rendu inline lorsqu'il existe, notamment SVG de confiance ;
- `thumbnail` / `thumb` / `vignette` — vignette cliquable ;
- `new-tab` / `link` / `external` — lien vers un nouvel onglet ;
- `download` — lien de téléchargement.

Un mode inconnu retombe sur `preview`.

## Images

- `preview`, `viewer`, `inline` : `<img>` ;
- `thumbnail` : image dans un lien `.nlab-media-thumbnail--image` ;
- `new-tab` : lien externe ;
- `download` : lien avec attribut `download`.

Les options historiques `loading`, `ratio` et `objectFit` restent appliquées au rendu image.

## SVG

Un SVG fourni par `item.inline` reste un chemin volontairement brut et doit provenir d'une source de confiance.

- `preview`, `viewer`, `inline` utilisent `item.inline` lorsqu'il existe ;
- `thumbnail` utilise l'URL SVG dans une balise image ;
- `new-tab` et `download` utilisent toujours l'URL et n'injectent pas le contenu inline.

## PDF

- `preview`, `viewer`, `inline` : `<object type="application/pdf">` avec fallback lien ;
- `thumbnail` : lien de vignette avec classe `.nlab-media-thumbnail--pdf` ;
- `new-tab` / alias historique `link` : lien `target="_blank" rel="noopener"` ;
- `download` : lien avec nom de fichier déterministe.

Le viewer PDF expose la classe `.nlab-media-viewer--pdf` pour le style futur.

## Vidéo / audio

Le comportement player historique reste utilisé en `preview` / `viewer` / `inline`.

`thumbnail`, `new-tab` et `download` produisent des liens dédiés plutôt qu'un player.

## Fichiers génériques

Les fichiers non reconnus restent des liens vers un nouvel onglet par défaut. Ils supportent également `thumbnail` et `download`.

## Nom de téléchargement

La priorité est :

1. `downloadName` ;
2. `filename` ;
3. dernier segment du chemin URL sans query/hash ;
4. fallback `download`.

La valeur est échappée avant insertion dans l'attribut HTML.

## Sécurité et compatibilité

Les protections MediaWiz existantes sont conservées :

- rejet `javascript:` et `vbscript:` ;
- rejet `data:text/html` ;
- fallback URL sûr ;
- échappement HTML des URL, labels et noms de téléchargement ;
- `rel="noopener"` pour les nouveaux onglets.

L'alias historique `mode:'link'` reste compatible et correspond désormais à `new-tab`.

## Classes CSS exposées

- `.nlab-media-viewer` ;
- `.nlab-media-viewer--pdf` ;
- `.nlab-media-link` ;
- `.nlab-media-link--<type>` ;
- `.nlab-media-thumbnail` ;
- `.nlab-media-thumbnail--<type>` ;
- `.nlab-media-thumbnail__label` ;
- `.nlab-media-download`.

Aucun style supplémentaire n'est imposé dans ce lot.

## Tests

`dev/framework/tests/media-view-modes.test.mjs` couvre :

- image preview/thumbnail ;
- SVG viewer/inline/new-tab ;
- PDF viewer/thumbnail/link/download ;
- dérivation du nom de téléchargement ;
- vidéo/audio ;
- URL dangereuse et fallback sûr ;
- mode inconnu ;
- propagation du mode dans `gallery()`.

Validation locale complémentaire : les assertions historiques MediaWiz sur échappement, loading, ratio/object-fit, fallback et galerie restent vertes.

Baseline : Node 22.16.0 — `media view modes tests: ok` et `media regression tests: ok`.
