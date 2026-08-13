# nLab Web Framework — tableau multi-agent

> **Instantané vérifié : 2026-08-13 04:20 +02:00.**  
> **Source de vérité :** `coordination/locks/*.json`. Ce tableau est une vue humaine ; en cas d'écart, le lock JSON le plus récent prime.

## 1. État de coordination

| Agent | État observé | Travail à ne pas chevaucher |
|---|---|---|
| 🟦 **A** | actif / review sur plusieurs lots | TableWiz, V20 Scope/Layout, architecture sémantique, carte d'architecture, Header selon locks |
| 🟩 **B** | 🛠️ session actuelle | synchronisation documentaire du pilotage uniquement (`COORD-ROADMAP-AGENT-DASHBOARD`) |
| 🟧 **C** | aucun lock métier actif connu | aucune reprise automatique de ses anciens lots ; historique conservé dans les locks |
| 🟣👤 **HUMAN** | validations ouvertes | UX V19/V20, TableWiz et décisions d'architecture selon PR/locks |

### Mutex de pilotage

`COORD-ROADMAP-AGENT-DASHBOARD` est réservé temporairement par **B** pour remettre la vue humaine en cohérence avec les intégrations déjà présentes sur `New`.

Aucun fichier runtime n'entre dans ce périmètre.

---

## 2. Travaux A encore ouverts / à protéger

Les PR ouvertes constatées ciblent la branche d'intégration **`New`** :

| PR | État | Sujet | Décision |
|---|---|---|---|
| **#33** | draft / review | TableWiz legacy → API générique | ne pas reprendre ; validation/revue A + HUMAN |
| **#47** | review | architecture sémantique / nomenclature | ne pas fusionner automatiquement ; décision architecturale HUMAN |
| **#48** | review | carte hiérarchique Framework + Data métier | ne pas fusionner automatiquement ; revue lisibilité/architecture HUMAN |

Les branches et locks A restent prioritaires sur leur `file_scope`, même si un heartbeat externe paraît ancien.

---

## 3. État réel du Lot 8B — corrections par rapport à l'ancien tableau

Plusieurs lignes autrefois indiquées « à faire » sont **déjà intégrées** sur `New` :

| Lot | État réel | Preuve de coordination |
|---|---|---|
| **JSON Studio — industrialisation** | 🟢 terminé | lock `8B-JSON-STUDIO-INDUSTRIALIZATION` = `done`, PR **#51**, merge `c0672fe4…` |
| **DataWiz — convergence** | 🟢 terminé | lock `8B-DATAWIZ-CONVERGENCE` = `done`, PR **#54**, merge `4fdc193f…` |
| **AssetLogoProfile** | 🟢 contrat intégré | lock `8B-ASSET-LOGO-PROFILE` = `done`, PR **#90** ; profil de variantes de logos réutilisable |
| **Pagination** | 🟢 terminé | reprise C par A, PR **#34** |
| **Outillage de tests / anti-collision** | 🟢 intégré | runner, workflow manuel et checker `file_scope` présents |

### JSON Studio

Le lock confirme :

- historique undo/redo sécurisé ;
- Tree/Form avec chemins internes robustes, y compris clés JSON contenant des points ;
- validation via `DataValidator` ;
- résolution d'affichage via `DataResolver` ;
- contrat minimal avec TableWiz conservé ;
- tests Node 22 verts.

**Conséquence :** JSON Studio ne doit plus apparaître comme « 0 % / à industrialiser » dans les vues de pilotage.

### DataWiz

La convergence intégrée couvre notamment :

- statistiques typées ;
- chemins imbriqués sûrs ;
- groupements déterministes ;
- médiane et histogrammes robustes ;
- compatibilité UX existante testée.

Les POC DataWiz plus avancés (ChartSpec, JoinSpec, Perspective/Plotly/DuckDB-Wasm) restent des pistes/hand-offs tant qu'ils ne sont pas promus par un lot verrouillé.

---

## 4. Lot 9 — pré-vol / crash-test métier

Le **crash-test métier Recettes du Cœur n'est pas déclaré terminé**. En revanche, son infrastructure de pré-vol est beaucoup plus avancée que ne le laissait entendre l'ancien snapshot.

Contrats déjà constatés comme intégrés dans les locks :

- checklist machine de pré-vol ;
- contrat de dossier/workspace site (`atelier`, `data`, `assets`, `config`, `web`) ;
- plusieurs contrats de pré-vol/live-preflight et fixtures représentatives sont présents dans la coordination.

**Règle :** avant de lancer le crash-test métier, lire les locks `9-*` réels ; ne pas recréer un contrat déjà livré.

---

## 5. Identité visuelle Web Framework

Deux choses sont distinctes :

1. 🟢 **`AssetLogoProfile`** : contrat générique de déclaration/audit des variantes de logos — intégré ;
2. ⚪ **pack binaire officiel du logo nLab Web Framework** : la roadmap demande encore de déposer les fichiers validés individuellement dans le repo et de les référencer.

Une planche validée contenant les variantes existe dans les ressources historiques, mais elle ne doit pas être découpée/régénérée approximativement sans source image exploitable dans la session. Ce lot reste donc libre mais doit préserver les visuels validés.

---

## 6. Règles de reprise

1. Lire `New`, jamais supposer que `main` représente l'état opérationnel courant.
2. Lire **tous les locks pertinents** avant de réserver une tâche.
3. Un lock `reserved / in_progress / blocked / review` interdit tout chevauchement de `file_scope`.
4. Un lock ancien n'est jamais libéré automatiquement uniquement à cause de son âge.
5. Créer une branche dédiée après réservation.
6. Re-synchroniser avec `New` avant PR/merge.
7. Les validations UX/architecture identifiées HUMAN ne sont pas fusionnées automatiquement.
8. Après intégration, passer le lock au statut factuel correspondant.

---

## 7. Prochaines zones de travail sans collision

À confirmer systématiquement par lecture des locks au moment de la réservation :

- 🔎 synchronisation finale de la roadmap avec les locks récents ;
- 🎨 pack binaire officiel du logo Web Framework, dès que la source validée est exploitable ;
- 🧪 compléments de qualité Lot 9 non encore couverts par un lock `9-*` ;
- 📚 documentation des contrats déjà intégrés lorsqu'elle est absente et que le périmètre n'est pas verrouillé ;
- 🏖️ recherche/POC DataWiz avancé uniquement en bac à sable tant qu'aucune promotion n'est décidée.

---

## 8. Historique

Les anciennes attributions détaillées restent disponibles dans :

- l'historique Git de ce fichier ;
- `coordination/locks/*.json` ;
- les PR associées.

La couleur d'un agent dans un lock terminé reste la preuve d'attribution historique ; ce snapshot privilégie volontairement **l'état présent** plutôt qu'une duplication exhaustive de toutes les livraisons passées.
