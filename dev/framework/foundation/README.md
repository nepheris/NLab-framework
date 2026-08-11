# Framework V2 — Fondation

Ce dossier documente les décisions structurantes de la branche `New`.

## Documents

- `DECISIONS.md` : décisions d’architecture validées et leur portée.
- `DATA-ARCHITECTURE.md` : séparation framework / métier, formats, relations et médias.
- `ROADMAP.md` : ordre des lots et état d’avancement.

## Règles de travail

- Toute évolution V2 est développée sur `New`.
- Le framework conserve ses propres conventions internes ; l’intégration formelle dans l’écosystème nLab viendra après stabilisation.
- Les données métier restent physiquement séparées des données et ressources internes du framework.
- JSON est le format canonique métier ; CSV reste un format d’échange/export plat.
- Les composants UI et les Wiz accèdent aux données par abstraction, jamais directement par leur emplacement physique.

## État actuel

- Fondation documentaire : en place.
- Architecture des données : décidée.
- DataProvider : prochaine brique technique.
- DataRegistry / DataSchema / DataRelation : à formaliser avec le DataProvider.
