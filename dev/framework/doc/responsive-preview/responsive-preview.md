# ResponsivePreview

Contrat DOM-free de prévisualisation responsive destiné aux outils de test et Workshops.

## Presets intégrés

- `phone` : 390 × 844, DPR 3 ;
- `tablet` : 820 × 1180, DPR 2 ;
- `desktop` : 1440 × 900, DPR 1 ;
- `large` : 1920 × 1080, DPR 1.

`ResponsivePreview.presets()` retourne des copies défensives de ces descripteurs.

## Orientation

`setOrientation('portrait'|'landscape')` normalise largeur/hauteur sans modifier le preset source. `toggleOrientation()` commute entre les deux orientations.

## Viewport personnalisé

`setCustom({ width, height, dpr, label })` crée un viewport `custom`. Les dimensions sont bornées à 1–10000 px et le DPR à 0,5–4.

## Scale et fit

`setScale()` fixe un scale descriptif entre 0,1 et 2.

`fit({width,height},{padding,maxScale})` calcule le scale maximal permettant de contenir le viewport dans une surface disponible. Il retourne également les dimensions rendues.

## Descripteur

`descriptor()` expose le viewport courant, le scale, les dimensions rendues et trois variables CSS descriptives :

- `--nlab-preview-width` ;
- `--nlab-preview-height` ;
- `--nlab-preview-scale`.

Le moteur n'applique pas lui-même ces variables.

## État

`snapshot()` retourne preset, orientation, scale, viewport custom éventuel et viewport normalisé. `subscribe()` permet d'observer les changements.

## Frontières

Ce lot ne modifie aucun iframe, CSS, V20, Theme Workshop ou démo. Le chrome visuel de téléphone/tablette/desktop et la miniature live restent des lots d'intégration/HUMAN séparés.
