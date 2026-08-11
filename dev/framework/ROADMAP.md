# nLab Framework — Roadmap projet canonique

> Cette roadmap est la source de pilotage du projet Framework. Les fichiers `demo/ROADMAP_Vxx.md` sont des roadmaps de cycle de démonstration et ne remplacent pas ce document.

## 1. Vue d'avancement

```text
ARCHITECTURE FRAMEWORK
████████████████████  ~90 %

CATALOGUE / PLAYGROUND
████████████████░░░░  ~80 %

UX / CONCEPTS
██████████████░░░░░░  ~70 %

COMPOSANTS INDUSTRIALISÉS
██████████░░░░░░░░░░  ~50 %

JSON / DATA MÉTIER
██████████░░░░░░░░░░  ~50 %

TESTS / ROBUSTESSE
██████░░░░░░░░░░░░░░  ~30 %

INTÉGRATION MÉTIER
████░░░░░░░░░░░░░░░░  ~20 %
```

Ces valeurs représentent une maturité fonctionnelle et architecturale, pas un pourcentage de lignes de code terminées.

## 2. Process de développement

`Idée → prototype dans la démo → validation UX → extraction dans le framework → démo consommant la brique générique → test métier`

La page de démonstration reste un laboratoire. Elle ne doit pas devenir une seconde application monolithique parallèle au framework.

## 3. Structure de pilotage nLab retrouvée

La roadmap historique utilisait le modèle canonique nLab :

- vue globale du projet ;
- vue de l'état courant ;
- phases/lots terminés repliés ;
- phase active ouverte ;
- détail opérationnel du lot actif ;
- jalons **HUMAN** pour les validations utilisateur ;
- **REX machine** pour les constats techniques et apprentissages ;
- backlog catégorisé **BEFORE_CLOSE / LATER / NOTE** ;
- boîte à idées séparée du scope actif.

## 4. Roadmap historique récupérée

### Lots 0 à 2 — socle initial — TERMINÉ

Les trois premiers lots constituent le socle du framework et étaient déjà considérés terminés dans la roadmap précédente.

### Lots 3 à 8 — construction du Framework V2 — LARGEMENT RÉALISÉ

Les blocs historiques retrouvés couvrent :

- UI et composants génériques ;
- Theme Workshop / système de thèmes ;
- architecture data-driven et données structurées ;
- renderers et vues ;
- sorties / exports ;
- observabilité et outils de diagnostic ;
- catalogue / playground de démonstration.

Le détail exact de l'ancienne numérotation interne entre ces thèmes doit être conservé lorsqu'il est retrouvé dans un artefact historique ; il ne doit pas être réinventé.

### Lot 8B — Consolidation UX / Preset Manager — PHASE ACTIVE HISTORIQUE

La dernière roadmap canonique retrouvée positionnait le projet en **8B**.

Objectif : consolider l'UX, les presets, les vues et les composants avant fermeture du cycle de construction du catalogue.

Le lot 8B doit conserver :

- détail opérationnel ;
- validations HUMAN ;
- REX machine ;
- backlog BEFORE_CLOSE ;
- éléments LATER ;
- NOTE / boîte à idées.

La série de démonstration V15 → V17 est une continuation concrète de ce travail de consolidation.

### Lot 9 — Crash-test métier Recettes du Cœur — PROCHAIN GRAND JALON

L'ancienne roadmap prévoyait après le Lot 8 :

1. atelier privé `Sites/Recettes-du-Coeur/atelier/` ;
2. utilisation des briques génériques du framework sur les vraies données métier ;
3. génération du `web/` ;
4. validation ;
5. publication Preview.

Le lot 9 ne doit pas dupliquer la logique métier dans le framework : il sert à éprouver le framework sur un cas réel.

### Lots 10 à 12 — FUTUR

Ces lots existaient dans l'ancienne roadmap comme phases futures. Leurs intitulés exacts ne sont pas suffisamment établis dans les éléments récupérés aujourd'hui ; ils restent donc volontairement non renommés jusqu'à récupération de la source historique complète.

## 5. État courant — cycle V17

La V17 du Catalogue / Playground a apporté notamment :

- version visible dans le titre, le H1 et la page ;
- header pleine largeur et sommaire sous le header ;
- état `Catalogue initialisé` ;
- cohérence Info/Test ;
- resets de propriétés ;
- couleurs / gradients / profils de test ;
- responsive ;
- Set Filter enrichi ;
- TableWiz enrichi ;
- prototype JSON Studio hiérarchique et éditable ;
- démonstration de relations inter-JSON par `sical` ;
- QR Studio enrichi ;
- annotations explicites des fonctions différées.

Voir `demo/ROADMAP_V17.md` pour le détail du cycle V17.

## 6. Prochaine séquence d'industrialisation

1. **Theme Workshop industrialisé** — portée réelle `instance / type / global`, profils unifiés, reset par propriété.
2. **JSON Studio composant framework** — extraction en composant, validation, undo/redo, historique, diff, relations multiples, mapping d'affichage.
3. **TableWiz / DataWiz convergence** — DataSource, ResultSet et renderers partagés.
4. **Search / Set Filter industrialisé** — pondération des tokens, stopwords configurables, locale, suggestions multi-colonnes.
5. **Media Renderer générique** — fond, transparence, ratio, object-fit, bordures et coins indépendants, masque/détourage.
6. **QRWiz industrialisé** — contenus typés, presets, logos, validation de lisibilité.
7. **NotificationCenter global** — `info / success / warning / error / dev` pilotés par le thème.
8. **CodeBlock** — presets par langage, JSON hiérarchique pliable, distinction bloc de code / éditeur enrichi.
9. **Consolidation / tests / documentation**.
10. **Lot 9 : crash-test Recettes du Cœur**.

## 7. HUMAN

À chaque fermeture de lot :

- test manuel de la démonstration ;
- validation des comportements UX ;
- validation des noms et portées ;
- décision : intégrer au framework / reporter / supprimer.

## 8. REX machine

À alimenter au fil des cycles :

- ce qui a été factorisé ;
- ce qui reste spécifique à la démo ;
- duplications détectées ;
- problèmes de source de vérité ;
- dette technique ;
- limites découvertes en test réel.

## 9. Backlog

### BEFORE_CLOSE

Éléments nécessaires avant fermeture du lot actif.

### LATER

Fonctions pertinentes mais non bloquantes pour le lot actif.

### NOTE

Constats, idées et pistes qui nécessitent encore une décision.

## 10. Règle de versionnement de la démonstration

Chaque commit qui modifie la page de démonstration doit incrémenter son numéro de version visible dans le titre navigateur, le titre principal et un marquage visuel immédiatement lisible dans la page.
