# Décisions — Framework V2

Ce journal conserve les décisions structurantes de la branche `New`. Git garde l’historique exact des modifications ; ce fichier garde l’historique lisible des choix.

## 2026-08-11 — Branche de reconstruction

- La V2 est reconstruite sur la branche `New`.
- `main` et les anciennes branches restent des références et ne servent pas de base directe à la nouvelle arborescence.
- La progression doit rester lisible commit par commit.

## 2026-08-11 — Autonomie du framework

- Le framework est traité comme un artefact autonome.
- Il possède ses propres conventions internes.
- Les conventions complètes du système nLab ne sont pas imposées à l’intérieur du framework pendant sa conception.
- L’intégration dans l’écosystème nLab sera traitée après stabilisation de l’architecture interne.

## 2026-08-11 — Séparation framework / métier

- Les données nécessaires au fonctionnement du framework sont distinctes physiquement des données métier.
- Le framework contient les moteurs, contrats, composants, thèmes, icônes, registres et ressources génériques.
- Les projets consommateurs possèdent leurs propres données, médias, documents et imports/exports métier.

## 2026-08-11 — Format canonique

- JSON est le format canonique des données métier structurées.
- CSV est privilégié pour les exports plats et échanges tabulaires simples.
- XLSX, CSV, TXT, JSON externe, API et autres sources passent par des adaptateurs avant consommation par le framework.

## 2026-08-11 — Base métier logique

- Une base métier peut être constituée d’un seul JSON ou de plusieurs collections JSON.
- Les collections sont reliées par identifiants canoniques et relations déclarées.
- Le framework construit une vue logique commune via index, relations et résolution.
- Les données résolues pour l’affichage ne doivent pas être dupliquées dans les objets métier sauf besoin explicite du schéma.

## 2026-08-11 — DataProvider

- Les composants UI et les Wiz ne connaissent ni le format physique ni l’emplacement réel des données.
- L’accès passe par un `DataProvider`.
- Le premier provider cible le JSON local/statique.
- Les futurs providers pourront viser GitHub, Google Drive, OneDrive, API ou SQLite sans modifier les composants consommateurs.

## 2026-08-11 — Médias et documents

- Images, SVG, PDF, audio, vidéo, QR et documents sont des données métier lorsqu’ils appartiennent au contenu du projet.
- Ils peuvent être référencés directement ou par un registre média lorsque la traçabilité et la réutilisation le justifient.
