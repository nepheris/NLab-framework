# Checkpoint UX — retours Preview #14

Ce checkpoint transforme les retours de test de la Preview #14 en actions traçables. Il complète `ROADMAP-8B-DETAIL.md` sans modifier le périmètre macro.

## Fait dans la passe suivante

- [x] version Preview visible dans le titre navigateur, le header et un bandeau large de la page ;
- [x] correction du mode Sommaire « sous le header » : header pleine largeur ;
- [x] masquage cohérent des IDs/Info quand `Info OFF` ;
- [x] Couleur 1 / Couleur 2 rapprochées + inversion du dégradé ;
- [x] profils visuels extrêmes XS/L/XL/XXL pour éprouver les limites ;
- [x] orientation responsive pilotable par bouton et défaut portrait mobile/tablette, paysage desktop ;
- [x] zone de tokens enrichie avec type/couleur/suppression et options de normalisation ;
- [x] dataset commun élargi : téléphone, code postal, SIRET, URL, texte long, média ;
- [x] JSON Studio Tree hiérarchique avec tout plier/tout déplier/profondeur ;
- [x] JSON Studio Form hiérarchique éditable avec sections et compteurs d'items ;
- [x] Diff JSON typé `added|removed|changed` ;
- [x] préparation export JSON complet / item / champ ;
- [x] FloatingPanel : menu secondaire pour docking gauche/droite/flottant ;
- [x] QR : types URL/Texte/Contact/Email/Téléphone/Wi-Fi visibles ;
- [x] QR : logo central et style regroupés ;
- [x] QR : cadre carré/arrondi/mixte comme première preuve de réutilisation des coins ;
- [x] notifications factorisées dans `NotificationCenter` avec `info/success/warning/danger` ;
- [x] jeux JSON relationnels `recipes-linked.json` + `ingredients-linked.json` pour le futur resolver visuel.

## À terminer dans le Lot 8B

- [ ] rendre la portée Theme `Global / Même type / Instance` réellement sémantique dans le moteur, pas seulement dans l'interface ;
- [ ] profils nommés avec portée stockée et affichée ;
- [ ] profils Theme/Typographie/Densité plus nombreux et réellement sauvegardables via Preset Manager ;
- [ ] Theme clair/sombre global fiable et testable ;
- [ ] contrôles de coins réutilisables par section, carte, image et QR ;
- [ ] autocomplete : liste fermée / liste ouverte / saisie libre ;
- [ ] tokenizer configurable : casse, accents, caractères spéciaux, stop-words ;
- [ ] drag/reorder réel des tokens ;
- [ ] TableWiz : tri, filtres colonne, sticky, visibilité, resize, ordre, édition et renderers typés ;
- [ ] JSON Studio Raw via CodeBlock comme renderer canonique ;
- [ ] JSON Studio : ajout/suppression/réordre de champs et items dans Form ;
- [ ] JSON Studio : association d'un champ ID à un référentiel externe et choix du label/image/champs résolus ;
- [ ] JSON Studio : vue diff côte à côte avec couleurs paramétrables ;
- [ ] FloatingPanel : primitive unique `floating|dock-left|dock-right`, overlay ou push-content ;
- [ ] barre d'onglets latérale gauche/droite et overflow responsive des actions ;
- [ ] QR : encodeur permettant de modifier réellement le style des modules internes du QR (carré/arrondi) ;
- [ ] QR : presets par type de contenu et exemple réel de payload par type ;
- [ ] logo QR multicolore de démonstration ;
- [ ] Document/Media multi-formats selon `ROADMAP-8B-DETAIL.md`.

## Boîte à idées / après le crash-test

- détourage / masques d'images avancés et transformations non destructives ;
- éditeur de texte riche complet ;
- rendu graphique du Search/Filter ;
- calendriers/timeline/cartographie et autres vues spécialisées déjà suivies dans `IDEAS.md`.

## Règle de reprise

Les fonctions transversales doivent être factorisées avant duplication : notifications, presets, portée, coins, renderers typés, relations JSON et docking de panneaux sont des primitives communes, pas des exceptions propres à la démo.
