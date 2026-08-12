# AssetLogoProfile — contrat Asset/Logo Workshop

## Objectif

`AssetLogoProfile` formalise les variantes attendues par l'Asset/Logo Workshop sans effectuer de traitement bitmap/vectoriel et sans imposer de rendu visuel.

Le contrat est DOM-free et versionné. Il permet à une UI, MediaWiz ou un futur atelier de connaître les assets disponibles, leur rôle et les previews à produire.

## Variantes canoniques

- `original` — source de référence ;
- `color-transparent` — version couleur avec transparence ;
- `color-background` — version couleur avec fond explicite ;
- `monochrome` — variante recolorable ;
- `favicon` — asset favicon avec tailles/dimensions.

Chaque variante peut fournir source, MIME image, dimensions, transparence, recolorabilité, fond/avant-plan, tailles et metadata JSON-safe.

`color-transparent` est toujours marqué `transparent:true` et `monochrome` toujours `recolorable:true`. Une variante `color-background` doit fournir un fond. Un favicon doit fournir au moins des dimensions ou une liste de tailles.

## Sources

Les sources relatives sont acceptées. Les URLs `http`/`https` et les `data:image/*` sont acceptées. Les schémas actifs ou non-image (`javascript:`, `data:text/html`, etc.) sont refusés.

Le MIME, lorsqu'il est fourni, doit être de type `image/*`.

## Matrice de preview

`previewMatrix()` produit des descripteurs déterministes pour les combinaisons demandées :

- fonds `light` / `dark` ;
- formes `square` / `rounded`.

Par défaut, chaque variante présente génère les quatre previews. Le résultat ne dessine rien ; il fournit uniquement `variant`, `background`, `shape` et une copie de l'asset.

## Audit

`audit()` retourne :

- `complete` — les cinq variantes sont présentes ;
- `usable` — au minimum `original` existe ;
- `present` / `missing` ;
- warnings structurés.

Cette séparation permet de travailler avec un profil partiel sans prétendre qu'il est complet.

## API

- `setVariant(kind, descriptor)` ;
- `removeVariant(kind)` ;
- `hasVariant(kind)` / `getVariant(kind)` ;
- `listVariants()` ;
- `previewMatrix(options)` ;
- `audit()` ;
- `snapshot()` / `toJSON()` ;
- `serialize()` ;
- `AssetLogoProfile.parse()`.

Le format sérialisé utilise `type: nlab.asset-logo-profile`, version 1.

## Robustesse

Les metadata sont clonées défensivement et doivent être JSON-safe. Cycles, nombres non finis, prototypes non standards et clés sensibles sont refusés. Les dimensions sont des entiers positifs bornés à 32768.

## Hors périmètre

Ce lot ne vectorise pas d'image, ne recolore aucun SVG, ne génère pas de favicon et ne choisit aucune esthétique. Il ne modifie pas IconWiz, MediaWiz, QR Studio, ResponsivePreview, la démo ou la roadmap canonique.

## Tests

`asset-logo-profile.test.mjs` couvre les cinq variantes, règles transparent/monochrome/favicon, matrice de preview, audit, import/export, copies défensives, sources sûres, MIME, dimensions et cycles.

Baseline : Node 22.16.0 — `asset logo profile tests: ok`.
