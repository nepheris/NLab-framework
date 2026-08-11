# Roadmap — Framework V2

## Lot 1 — Fondation

État : **en cours**.

- [x] Branche `New` minimale.
- [x] Principes internes du framework.
- [x] Séparation framework / données métier.
- [x] JSON canonique / CSV export plat.
- [x] Principe DataProvider.
- [x] Contrat DataProvider.
- [x] DataRegistry — contrat initial.
- [x] DataSchema — contrat initial.
- [x] DataRelation — contrat initial.
- [x] DataResolver — indexation et résolution `one` / `many` sans mutation des données canoniques.
- [x] DataValidator — validation structurelle, IDs, champs requis, cardinalités et intégrité référentielle.
- [x] Provider JSON local/statique — première implémentation read-only.
- [x] Datasets de démonstration — jeu multi-collections avec relations `one` et `many`.
- [ ] State / Events / Registry global.
- [ ] FloatingPanel.
- [ ] Toolbar.
- [ ] Foldable / contrôleur de sections.
- [ ] Theme.
- [ ] Icon Registry.
- [ ] Help.
- [ ] Catalogue / playground.

### Étape active suivante

`State / Events / Registry global` : définir le noyau transverse qui permet aux composants de partager un état, d'émettre des événements et d'enregistrer leurs services sans dépendances directes entre modules.

## Lot 2 — Données et exploration

- JSON Studio.
- TableWiz.
- FilterWiz.
- SearchWiz.
- RendererWiz.
- PaginationWiz.

## Lot 3 — Publication et diffusion

- DocumentWiz / impression / PDF.
- QRWiz.
- ShareWiz.
- SEO structurel.
- AnalyticsWiz et providers analytics.

## Lot 4 — Services externes, différé

- IdentityWiz.
- Google / Microsoft / autres providers d’identité.
- ExternalDataWiz.
- Google Drive / OneDrive / GitHub privé / autres stockages.
- AccessGate.

## Principe

Chaque étape suffisamment stable est documentée et commitée séparément sur `New`. Les anciens projets servent de références et de sources de POC, pas de base à recopier intégralement.
