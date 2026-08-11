# Framework V2 — Fondation

Ce dossier documente les décisions structurantes de la branche `New` et l'état du Lot 1.

## Documents

- `DECISIONS.md` : décisions d’architecture validées et leur portée.
- `DATA-ARCHITECTURE.md` : séparation framework / métier, formats, relations et médias.
- `DATA-PROVIDER.md` : contrat générique d’accès aux données.
- `JSON-DATA-PROVIDER.md` : premier provider JSON statique/read-only.
- `DATA-RESOLVER.md` : indexation et résolution des relations `one` / `many`.
- `DATA-VALIDATOR.md` : validation structurelle et intégrité référentielle.
- `ROADMAP.md` : ordre des lots et état d’avancement.

## Règles de travail

- Toute évolution V2 est développée sur `New`.
- Le framework conserve ses propres conventions internes ; l’intégration formelle dans l’écosystème nLab viendra après stabilisation.
- Les données métier restent physiquement séparées des données et ressources internes du framework.
- JSON est le format canonique métier ; CSV reste un format d’échange/export plat.
- Les composants UI et les Wiz accèdent aux données par abstraction, jamais directement par leur emplacement physique.
- Les données canoniques ne sont pas mutées par les couches de résolution ou de validation.

## État actuel

- Fondation documentaire : en place.
- Architecture des données : décidée.
- DataProvider : contrat défini.
- JsonDataProvider : première implémentation read-only.
- DataRegistry / DataSchema / DataRelation : contrats initiaux définis.
- DataResolver : opérationnel sur relations `one` / `many`.
- DataValidator : opérationnel sur structure, champs requis, IDs, cardinalités et références.
- Étape active suivante : `State / Events / Registry global`.
