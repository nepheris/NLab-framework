# Média, QR, partage et documents — Lot 6

Le Lot 6 fournit les moteurs de sortie et de diffusion du Framework V2.

## MediaWiz

Rendu générique image, SVG, vidéo, audio, PDF, galerie et pellicule. Les médias métier restent référencés par le projet ; le moteur ne les embarque pas.

## QRWiz

- payload basé sur `URLResolver` ;
- URL courante ou canonique ;
- taille, marge, correction d'erreur, couleurs, transparence, logo et format ;
- encodeur injecté par adapter.

Le framework ne simule jamais un QR. Sans encodeur réel configuré, `generate()` échoue explicitement. Un adapter compatible avec une bibliothèque QR peut être branché sans modifier les consommateurs.

## ShareWiz

- copie d'URL ;
- email ;
- Web Share natif ;
- impression ;
- QR via QRWiz ;
- cascade de métadonnées/image préparée.

## DocumentWiz

- sélection de champs ;
- profil data-driven ;
- labels/layout/CSS/logo/footer ;
- rendu HTML imprimable ;
- QR optionnel ;
- génération PDF laissée au navigateur ou à un adapter ultérieur.

## Validation

Les contrats et moteurs sont implémentés. QR/print/share devront être exercés dans le catalogue puis dans le crash-test public.
