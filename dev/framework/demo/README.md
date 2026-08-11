# Catalogue / Playground Framework V2

Point d'entrée : `index.html`.

Cette page rassemble sur une seule surface les briques du framework afin de servir de :

- catalogue visuel ;
- playground de configuration ;
- atelier de thèmes ;
- démonstration data-driven ;
- banc de test responsive ;
- support de non-régression manuelle.

## Jeux de données

`data/fixtures/` contient volontairement de petits fichiers :

- `simple.json` — valeurs simples ;
- `errors.json` — erreurs, doublons et valeurs manquantes ;
- `references.json` — relations par IDs ;
- `images.json` — médias ;
- `discrete.json` — catégories ;
- `continuous.json` — variables numériques ;
- `mixed.json` — mélange réaliste pour les rendus.

La page charge `mixed.json` pour rester légère.

## QR

La démonstration charge la bibliothèque `qrcode` uniquement comme **adapter de playground**. `QRWiz` reste indépendant de cette bibliothèque dans le framework.

## Validation visuelle

Les éléments du Lot 3 à 8 restent `🟠 À tester` jusqu'à la revue humaine du crash-test final.
