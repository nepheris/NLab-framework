# Primitives UI — Lot 3

Le Lot 3 fournit les briques visuelles génériques utilisées par les Wiz du Framework V2.

## Briques

- `ui/base.css` : tokens de base, layout responsive, Header/Footer/Hero/Section/Sidebar, toolbar, pagination et FloatingPanel.
- `components/layout.js` : création et configuration des composants de layout.
- `components/floating-panel.js` : état + montage d'un panneau flottant déplaçable, redimensionnable, verrouillable, minimisable et dockable.
- `components/toolbar.js` : modèle d'actions, favoris, priorité, visibilité et overflow.
- `components/foldable.js` : ouverture/fermeture, ouvrir tout, fermer tout, reset, persistance et restauration par ancre.
- `components/pagination.js` : pagination indépendante du renderer.

## Principe

Les primitives ne connaissent aucune donnée métier. Elles exposent uniquement des comportements/configurations génériques.

Le Theme Workshop pourra modifier leurs paramètres exposés (dimensions, espacements, tokens) sans réécrire leurs moteurs.

## Responsive

Le socle CSS est mobile-first et inclut une rupture simple pour sidebar/panneaux. Les tests visuels multi-breakpoints seront menés dans le Lot 8 avec la page de démonstration exhaustive.

## État de validation

Code implémenté et contrôlé structurellement. Validation UX finale : `🟠 À tester` dans le catalogue puis le crash-test Recettes du Cœur.
