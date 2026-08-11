# Data UX — Lot 5

Le Lot 5 met en place le cœur data-driven du Framework V2.

## Pipeline

```text
Input → SearchWiz → FilterWiz → ResultSet → RendererWiz → Pagination
                           └→ TableWiz
                           └→ JSON Studio
                           └→ DataWiz
```

La recherche et les filtres ne connaissent pas la présentation. Les renderers sont interchangeables sans recopier les données.

## Briques

- `ResultSet` : conteneur stable de résultats + métadonnées.
- `SearchWiz` : texte global/ciblé, exact, regex et score simple.
- `FilterWiz` : opérateurs génériques, ET/OU, plages, dates et arrays.
- `RendererWiz` : cards, compact cards, list, links, gallery, tiles, filmstrip et table.
- `PresentationResolver` : ID/label/image/icon et modes combinés.
- `TableWiz` : colonnes, visibilité, ordre, largeur, sticky, recherche, filtres, tri, pagination, export CSV/JSON et images.
- `JsonStudio` : raw, tree, form, table, preview, import/export, arrays ordonnés, diff, validation/résolution/save adapters.
- `DataWiz` : descriptif, groupBy et histogrammes de base.

## Responsive data-driven

`RendererWiz.chooseForWidth()` permet au projet de définir un renderer par breakpoint. Le choix automatique n'empêche pas l'utilisateur de changer de vue si le profil du site l'autorise.

## Priorité

Le lot privilégie la recherche et les rendus conviviaux (cartes, listes, pellicules, tableaux). Les graphiques avancés restent secondaires.

## Validation

Implémentation technique initiale terminée. Les interactions et rendus passent en `🟠 À tester` dans le catalogue du Lot 8 et dans le crash-test Recettes du Cœur.
