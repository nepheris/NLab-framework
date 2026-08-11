# Framework V2 — Fondation

Ce dossier documente les décisions structurantes de la branche `New` et l'état du développement.

## Documents

- `DECISIONS.md` : décisions d’architecture validées et leur portée.
- `ROADMAP.md` : suivi détaillé des lots, pourcentages, statuts et décisions humaines.
- `DATA-ARCHITECTURE.md` : séparation framework / métier, formats, relations et médias.
- `DATA-PROVIDER.md` : contrat générique d’accès aux données.
- `JSON-DATA-PROVIDER.md` : provider JSON statique/read-only.
- `DATA-RESOLVER.md` : indexation et résolution des relations `one` / `many`.
- `DATA-VALIDATOR.md` : validation structurelle et intégrité référentielle.
- `CORE-RUNTIME.md` : State, Events, Registry, URL, Storage et Environment.
- `UI-PRIMITIVES.md` : Layout, FloatingPanel, Toolbar, Foldable et Pagination.

## Règles de travail

- Les commits de construction sont faits sur `New`.
- La roadmap est mise à jour à chaque jalon stable.
- Les données métier restent séparées du framework.
- Les composants et Wiz accèdent aux données par abstraction.
- Les couches de résolution et de validation ne mutent pas les données canoniques.
- Les décisions nécessitant une validation utilisateur sont signalées `🟣 Décision humaine` dans la roadmap.

## État actuel

- Lots 0 à 2 : terminés techniquement.
- Lot 3 : implémenté, validation visuelle différée au catalogue/crash-test.
- Étape active : Lot 4 — Theme Workshop / présentation / navigation / aide / icônes.
