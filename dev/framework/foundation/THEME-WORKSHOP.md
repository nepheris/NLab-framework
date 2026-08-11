# Theme Workshop, personnalisation, aide et navigation — Lot 4

Le Lot 4 transforme les primitives du Lot 3 en expérience configurable.

## ThemeEngine

- cascade `base → site → variante → section → composant → surcharge utilisateur` ;
- application via variables CSS `--nlab-*` ;
- thèmes light/dark/presets possibles ;
- variantes nommées ;
- import/export JSON ;
- persistance optionnelle.

## ThemeWorkshop

L'expérience Webmaster peut déverrouiller les composants portant `data-theme-editable`.

Fonctions initiales :

- poignées de redimensionnement vertical ;
- verrouillage individuel et global ;
- modification live des tokens ;
- color picker pour les tokens couleur ;
- patchs de composant ;
- sauvegarde de session ;
- commit du patch vers le thème site ;
- export/import JSON complet.

Les contrôles supplémentaires (poignées horizontales, marges/paddings détaillés, historique undo/redo visuel) seront exercés et raffinés pendant le catalogue du Lot 8.

## Personnalisation visiteur

`VisitorPreferences` stocke uniquement les options autorisées par le Webmaster. Le sous-thème local ne modifie pas le thème canonique public.

## Icon Registry

SVG génériques, colorables avec `currentColor`, avec fallback et possibilité d'override par projet.

## HelpWiz

Aide contextuelle par `help_id`, texte court/long et détails techniques uniquement en expérience Webmaster.

## NavigationWiz

Arbre H1/H2/H3, sidebar, scrollspy, ancres et restauration de position.

## Validation

Implémentation technique terminée. Le comportement visuel reste `🟠 À tester` dans la page catalogue puis sur Recettes du Cœur.
