# nLab Web Framework

## 🗺️ Roadmap GitHub

> Objectif : industrialiser le framework nLab jusqu’à un socle générique, testable et réutilisable, puis le confronter à un vrai cas métier. Principe de lecture : **pilotage immédiatement visible, détail à la demande**.

<a name="haut"></a>

## 1. Pilotage

### 1.1 Phase active

> 👇👇👇 **POINT DE TRAVAIL ACTIF**  
> 🎯 **Phase active : [Lot 8B — Consolidation UX / industrialisation](#phase-8b)**  
> 🟣👤 **Jalon HUMAN actif : [H001 — validation UX du cycle V19](#human-h001)**  
> 👥 **Exécution parallèle : 🟦 A + 🟩 B + 🟧 C — [voir le tableau multi-agent](#agents-actifs)**

> ℹ️ Le raccord technique du Theme Workshop est terminé en V19. Le jalon reste ouvert tant que la validation visuelle HUMAN n’a pas confirmé le comportement réel des portées et des contrôles raccordés.

<details>
<summary><strong>🧭 1.2 Sommaire — cliquer pour déplier</strong></summary>

- [📎 1.3 Fichiers associés](#fichiers-associes)
- [📘 1.4 Légende](#legende)
- [👥 1.5 Tableau multi-agent](#agents-actifs)
- [📊 1.6 Vue globale](#vue-globale)
- [📍 1.7 État actuel](#etat-actuel)
- [🟣👤 1.8 Jalons HUMAN](#jalons-human)
- [2. Lots historiques 0 à 8](#lots-historiques)
- [3. Lot 8B — phase active](#phase-8b)
- [4. Lot 9 — crash-test métier](#lot-9)
- [5. Lots 10 à 12](#lots-futurs)
- [6. Séquence d’industrialisation](#industrialisation)
- [9. Méthode autonome](#methode-autonome)
- [10. 💡 Backlog non bloquant](#backlog)
- [11. Capitalisation / clôture](#capitalisation)

</details>

<a name="fichiers-associes"></a>

### 📎 1.3 Fichiers associés

- 🗂️ **Dépôt :** [nepheris/nLab-Web-Framework](https://github.com/nepheris/nLab-Web-Framework) <a href="https://github.com/nepheris/nLab-Web-Framework" target="_blank">↗</a>
- 👥 **Tableau multi-agent détaillé :** [`coordination/agent-board.md`](./coordination/agent-board.md) <a href="./coordination/agent-board.md" target="_blank">↗</a>
- 🔒 **Verrous A/B/C — source de vérité opérationnelle :** [`coordination/locks/`](./coordination/locks/) <a href="./coordination/locks/" target="_blank">↗</a>
- ⚙️ **Procédure de coordination :** [`coordination/README.md`](./coordination/README.md) <a href="./coordination/README.md" target="_blank">↗</a>
- 🤖 **Brief machine / REX :** [`rex.machine.json`](./rex.machine.json) <a href="./rex.machine.json" target="_blank">↗</a>
- 🟣👤 **Fiche HUMAN active :** [`human-check.md`](./human-check.md) <a href="./human-check.md" target="_blank">↗</a>
- 🔎 **Cycle de démonstration courant :** [`../../demo/ROADMAP_V19.md`](../../demo/ROADMAP_V19.md) <a href="../../demo/ROADMAP_V19.md" target="_blank">↗</a>
- 🔎 **Cycle précédent :** [`../../demo/ROADMAP_V18.md`](../../demo/ROADMAP_V18.md) <a href="../../demo/ROADMAP_V18.md" target="_blank">↗</a>
- 🟧 **Contrat Analytics / consentement :** [`../analytics/contract.md`](../analytics/contract.md) <a href="../analytics/contract.md" target="_blank">↗</a>
- 🟧 **Contrat NotificationCenter :** [`../components/notification-center.md`](../components/notification-center.md) <a href="../components/notification-center.md" target="_blank">↗</a>
- 🟧 **Contrat CodeBlock :** [`../components/code-block.md`](../components/code-block.md) <a href="../components/code-block.md" target="_blank">↗</a>
- 🟧 **Contrat PresetManager :** [`../components/preset-manager.md`](../components/preset-manager.md) <a href="../components/preset-manager.md" target="_blank">↗</a>
- 🟧 **Contrat NavigationWiz :** [`../navigation/navigation-wiz.md`](../navigation/navigation-wiz.md) <a href="../navigation/navigation-wiz.md" target="_blank">↗</a>
- 🟧 **Contrat HelpWiz :** [`../help/help-wiz.md`](../help/help-wiz.md) <a href="../help/help-wiz.md" target="_blank">↗</a>
- 🟧 **Contrat BrowserStorage :** [`../storage/storage.md`](../storage/storage.md) <a href="../storage/storage.md" target="_blank">↗</a>
- 🟧 **Contrat StateStore :** [`../state-store/state-store.md`](../state-store/state-store.md) <a href="../state-store/state-store.md" target="_blank">↗</a>
- 🟧 **Contrat EventBus :** [`../event-bus/event-bus.md`](../event-bus/event-bus.md) <a href="../event-bus/event-bus.md" target="_blank">↗</a>
- 🟧 **Contrat FrameworkRegistry :** [`../registry/registry.md`](../registry/registry.md) <a href="../registry/registry.md" target="_blank">↗</a>
- 🟩 **Contrat DataIndex :** [`../data-index/data-index.md`](../data-index/data-index.md) <a href="../data-index/data-index.md" target="_blank">↗</a>
- 🟧 **Pré-vol Lot 9 — checklist humaine :** [`lot9-preflight-checklist.md`](./lot9-preflight-checklist.md) <a href="./lot9-preflight-checklist.md" target="_blank">↗</a>
- 🟧 **Pré-vol Lot 9 — checklist machine :** [`lot9-preflight.machine.json`](./lot9-preflight.machine.json) <a href="./lot9-preflight.machine.json" target="_blank">↗</a>
- 💡 **Boîte à idées :** backlog de cette roadmap jusqu’à création d’un fichier dédié.

<a name="legende"></a>

### 📘 1.4 Légende

<details open>
<summary><strong>Cliquer pour déplier / replier</strong></summary>

**Avancement fonctionnel**

- ⚪ `0 %` — à faire
- 🟡 `1–99 %` — en cours
- 🟢 `100 %` — terminé / validé
- ⏸️ `—` — différé volontairement
- ⬜ — domaine non actif dans le schéma synthétique
- 🎯 — domaine / point actuellement actif

**Propriétaires multi-agent**

- 🟦 **A** — Agent A
- 🟩 **B** — Agent B
- 🟧 **C** — Agent C
- 🟣👤 **HUMAN** — intervention humaine
- ⚪ **Libre** — aucune réservation active après contrôle des locks/branches

**État d’un verrou**

- 🔒 `reserved` — réservé, pas encore commencé
- 🛠️ `in_progress` — travail en cours
- 👀 `review` — prêt à relire / consolider
- ⛔ `blocked` — dépendance ou validation bloquante
- ✅ `done` — terminé / intégré / livré
- ♻️ `released` — libéré

**Autres repères**

- 🤖 — mémoire machine / REX
- 💡 — idée / capitalisation
- 🔎 — audit / contrôle
- 🔷 — navigation interne
- 📈 — avancement / détail de phase

> Les **carrés colorés** identifient les agents ; les **cercles** `🟢/🟡/⚪` restent réservés à l’avancement fonctionnel.  
> **La couleur de l’agent est persistante après `done`** : `🟩 B ✅` reste affiché pour conserver l’historique de qui a réalisé la tâche. Les tâches antérieures au protocole de locks ne sont pas réattribuées sans preuve Git fiable.

</details>

<a name="agents-actifs"></a>

### 👥 1.5 Tableau multi-agent

<details open>
<summary><strong>👥 Répartition active A/B/C — ouverte par défaut</strong></summary>

> **Source de vérité :** `coordination/locks/*.json`. Ce tableau est un instantané humain lisible. En cas d’écart, le lock JSON le plus récent prime.

| Agent | Statut | Tâche verrouillée | Branche | Périmètre synthétique |
|---|---|---|---|---|
| 🟦 A | 🛠️ `in_progress` | `8B-V20-SCOPE-LAYOUT` | `review-v20-from-v16` | Scope Lab / Layout Lab V20, démo |
| 🟦 A | 👀 `review` | `8B-SEMANTIC-ARCHITECTURE` | `agent-a/semantic-architecture` | nomenclature et responsabilités architecturales |
| 🟦 A | 👀 `review` | `8B-ARCHITECTURE-MAP` | `agent-a/architecture-map` | carte hiérarchique Framework + Data métier |
| 🟦 A | 🔒 `reserved` | `8B-HEADER-LEGACY-EXTRACTION` | `agent-a/header-studio-from-v16` | Header Studio générique |
| 🟦 A | 🔒 `reserved` | `8B-TABLEWIZ-LEGACY-EXTRACTION` | `agent-a/tablewiz-legacy-from-v16` | TableWiz legacy → API générique |

> 🟩 **B** et 🟧 **C** n’ont pas de lock métier actif dans ce snapshot après leurs dernières intégrations. De nouveaux locks peuvent apparaître pendant que les autres agents continuent ; les fichiers JSON restent la source de vérité.

**Dernières intégrations B :** Data Schemas #7, QR/Media #8, Observability #9, SEO/Share #10, Search/Filter #12, URL Resolver #13, DataIndex #19.  
**Dernières intégrations C :** Analytics #2, pré-vol Lot 9 #3, NotificationCenter #4, CodeBlock #5, PresetManager #6, NavigationWiz #11, HelpWiz #14, BrowserStorage #15, StateStore #16, EventBus #17, FrameworkRegistry #18.

**Lecture rapide :**

- 🟦 **A** conserve le chantier visuel/HUMAN, les extractions Header/TableWiz et deux livrables d’architecture en review.
- 🟩 **B** a consolidé les contrats data, média, observabilité, SEO/Share, Search/Filter, URL Resolver et DataIndex.
- 🟧 **C** a consolidé plusieurs briques autonomes UI/core et le pré-vol métier sans toucher aux fichiers A/B.
- 🟣👤 **HUMAN** reste requis pour H001 et les arbitrages visuels associés.

**Historique détaillé :** [`coordination/agent-board.md`](./coordination/agent-board.md) conserve les tâches `done`, PR et SHA par agent.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="vue-globale"></a>

### 📊 1.6 Vue globale

<details open>
<summary><strong>📊 Avancement global — ouvert par défaut</strong></summary>

| Domaine | Focus | État | Avancement | Cible |
|---|---|---|---:|---|
| Architecture Framework | ⬜ | 🟡 | ~90 % | socle propre, factorisé et stable |
| Catalogue / Playground | ⬜ | 🟡 | ~85 % | banc d’essai complet |
| UX / concepts | 🎯 | 🟡 | ~75 % | comportements validés humainement |
| Composants industrialisés | ⬜ | 🟡 | ~75 % | prototypes extraits en composants génériques |
| JSON / data métier | ⬜ | 🟡 | ~65 % | édition + relations inter-JSON robustes |
| Tests / robustesse | ⬜ | 🟡 | ~70 % | non-régression et cas négatifs |
| Intégration métier | ⬜ | 🟡 | ~20 % | crash-test Recettes du Cœur |

```text
⬜ ARCHITECTURE FRAMEWORK       ████████████████████  ~90 %
⬜ CATALOGUE / PLAYGROUND      █████████████████░░░  ~85 %
🎯 UX / CONCEPTS               ███████████████░░░░░  ~75 %   ← VALIDATION ACTIVE
⬜ COMPOSANTS INDUSTRIALISÉS   ███████████████░░░░░  ~75 %
⬜ JSON / DATA MÉTIER          █████████████░░░░░░░  ~65 %
⬜ TESTS / ROBUSTESSE          ██████████████░░░░░░  ~70 %
⬜ INTÉGRATION MÉTIER          ████░░░░░░░░░░░░░░░░  ~20 %
```

> Ces valeurs représentent une maturité fonctionnelle et architecturale, pas un pourcentage de lignes de code terminées. Elles sont distinctes du statut des locks A/B/C.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="etat-actuel"></a>

### 📍 1.7 État actuel

<details open>
<summary><strong>📍 État actuel — ouvert par défaut</strong></summary>

```text
Socle Framework largement construit
↓
Catalogue / Playground V18 : preuve de la portée native Theme Workshop
↓
V19 : raccord technique des contrôles historiques compatibles
↓
POINT ACTIF : validation HUMAN V19 + industrialisation parallèle A/B/C
↓
Robustesse data / recherche / média / URL / SEO / observabilité consolidée
↓
Core consolidé : Storage / StateStore / EventBus / FrameworkRegistry / DataIndex
↓
Briques autonomes Analytics / Notification / Code / Presets / Navigation / Help consolidées
↓
SI VALIDÉ : poursuite des composants autonomes et convergence data/UI
SI BLOQUANT : correction ciblée V20 déjà isolée par Agent A
```

**Process cible :**

```text
Idée
  ↓
Prototype dans la démo
  ↓
Validation UX
  ↓
Extraction dans le framework
  ↓
Démo consommant la brique générique
  ↓
Test métier / crash-test
```

La démo reste un laboratoire. Une fonction validée ne doit pas rester durablement spécifique à la démo.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="jalons-human"></a>

### 🟣👤 1.8 Jalons HUMAN

- 🟣👤 **H001 — validation UX du cycle V19 : actif.** → [voir détail](#human-h001)
- ⚪ **H002 — validation de sortie du Lot 8B : à planifier après industrialisation prioritaire.**
- ⚪ **H003 — validation avant crash-test Recettes du Cœur : futur.**

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="lots-historiques"></a>

# 2. Lots historiques 0 à 8

<details>
<summary><strong>📈 Lots 0 à 2 — socle initial — 🟢 100 %</strong></summary>

Les trois premiers lots constituent le socle initial du framework et étaient déjà considérés terminés dans la roadmap précédente.

🔷 [↑ Sommaire](#haut)
</details>

<details>
<summary><strong>📈 Lots 3 à 8 — construction Framework V2 — 🟡 largement réalisée</strong></summary>

Blocs historiquement couverts :

- UI et composants génériques ;
- Theme Workshop / système de thèmes ;
- architecture data-driven et données structurées ;
- renderers et vues ;
- sorties / exports ;
- observabilité et diagnostic ;
- Catalogue / Playground.

> Ces travaux précèdent en partie le protocole multi-agent actuel : **aucune couleur A/B/C n’est ajoutée rétroactivement sans lock/PR ou preuve Git fiable**.

Le détail exact de l’ancienne numérotation interne ne doit pas être réinventé : lorsqu’un artefact historique fiable est retrouvé, il prime.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="phase-8b"></a>

# 3. Lot 8B — Consolidation UX / industrialisation

<details open>
<summary><strong>🎯📈 Lot 8B — Consolidation UX / industrialisation — 🟡 ACTIVE</strong></summary>

**Objectif :** fermer le cycle de construction du Catalogue / Playground en transformant les prototypes validés en briques génériques propres.

| État | Avancement | Pilotage | Action |
|---|---:|---|---|
| 🟢 | 100 % | — | page V19 versionnée et clairement identifiable |
| 🟢 | 100 % | — | header / sommaire / Info-Test / responsive consolidés dans la démo |
| 🟢 | 100 % | — | jeux de données de test enrichis |
| 🟢 | 100 % | — | relations inter-JSON de démonstration prouvées |
| 🟢 | 100 % | — | Theme Workshop : cascade native `global → type → instance`, profils et resets |
| 🟢 | 100 % technique | — | raccord des contrôles historiques compatibles à l’API scoped en V19 |
| 🟢 | 100 % | 🟩 B ✅ | schémas `collection / registry / relation` validés et contrat de relation consolidé via PR #7 |
| 🟢 | 100 % | 🟩 B ✅ | QRWiz / MediaWiz robustesse consolidée via PR #8 |
| 🟢 | 100 % | 🟩 B ✅ | RuntimeMonitor / observabilité consolidés via PR #9 |
| 🟢 | 100 % | 🟩 B ✅ | contrats SEO / Share consolidés via PR #10 |
| 🟢 | 100 % | 🟩 B ✅ | SearchWiz / FilterWiz robustesse consolidée via PR #12 |
| 🟢 | 100 % | 🟩 B ✅ | URL Resolver robustesse consolidée via PR #13 |
| 🟢 | 100 % | 🟩 B ✅ | DataIndex : construction atomique, entrées/doublons validés, introspection `has/size` via PR #19 |
| 🟢 | 100 % | 🟧 C ✅ | AnalyticsWiz / consentement / provider GA4 intégré via PR #2 |
| 🟢 | 100 % | 🟧 C ✅ | NotificationCenter complet et sans DOM intégré via PR #4 |
| 🟢 | 100 % tâche | 🟧 C ✅ | CodeBlock : presets/alias, formatage JSON, export/copie sûrs et tokenisation corrigée via PR #5 |
| 🟢 | 100 % | 🟧 C ✅ | PresetManager : import/export atomique et canoniques protégés via PR #6 |
| 🟢 | 100 % | 🟧 C ✅ | NavigationWiz : IDs/observer/hash robustes via PR #11 |
| 🟢 | 100 % | 🟧 C ✅ | HelpWiz : registre cloné, contexte visitor/webmaster, attach/detach robustes via PR #14 |
| 🟢 | 100 % | 🟧 C ✅ | BrowserStorage : quota/security/sérialisation et clear best-effort couverts via PR #15 |
| 🟢 | 100 % | 🟧 C ✅ | StateStore : chemins sûrs, reset/hydratation et résistance prototype-pollution via PR #16 |
| 🟢 | 100 % | 🟧 C ✅ | EventBus : listeners isolés, `once/off`, wildcard et introspection consolidés via PR #17 |
| 🟢 | 100 % | 🟧 C ✅ | FrameworkRegistry : lectures sûres, validation, pruning et introspection via PR #18 |
| 🟡 | HUMAN actif | 🟦 A + 🟣👤 | validation visuelle des portées, profils, resets et contrôles historiques V19/V20 |
| 🟡 | review | 🟦 A 👀 | architecture sémantique — nomenclature et responsabilités |
| 🟡 | review | 🟦 A 👀 | carte hiérarchique Framework + Data métier |
| 🟡 | ~75 % | 🟦 A / 🟩 B / 🟧 C | extraction et consolidation parallèles de briques framework |
| ⚪ | 0 % | ⚪ Libre | **intégrer le logo nLab Web Framework déjà validé : retrouver les fichiers source validés, créer `doc/roadmap/icons/`, y déposer le pack officiel (variantes, icône, manifest/README) et le référencer dans la documentation** |
| ⚪ | 0 % | ⚪ Libre | **industrialiser JSON Studio en composant autonome** |
| ⚪ | 0 % | 🟦 A — TableWiz réservé | convergence TableWiz / DataWiz / ResultSet |
| ⚪ | 0 % | 🟣👤 | clôture HUMAN du Lot 8B |

**Chantiers parallèles actuellement verrouillés dans le Lot 8B :**

- 🟦 A — V20 Scope/Layout 🛠️ ; architecture sémantique 👀 ; carte d’architecture 👀 ; Header 🔒 ; TableWiz 🔒.
- 🟩 B — aucun lock métier actif dans ce snapshot ; sept lots autonomes sont 🟩 B ✅ intégrés.
- 🟧 C — aucun lock métier actif dans ce snapshot ; dix lots 8B autonomes sont 🟧 C ✅ intégrés, plus le pré-vol Lot 9.

> Le tableau garde les pastilles des agents sur les lignes `done` : cette trace sert à mesurer les domaines où chaque agent a été efficace et à préparer les prochains découpages parallèles.

<a name="human-h001"></a>
<details open>
<summary><strong>🟣👤 H001 — Validation UX du cycle V19 — ACTIF</strong></summary>

**État technique :** le raccord est intégré. La décision restante est humaine.

**Pourquoi l’humain intervient :**
1. vérifier que `Cet élément / Même type / Global` produit des effets distincts et compréhensibles ;
2. valider les profils et resets sur la nouvelle API native ;
3. vérifier que couleurs, background, bordures, typographie et densité ne produisent plus d’écriture globale parasite en portée Type/Instance ;
4. arbitrer une éventuelle correction V20 avant de passer au JSON Studio.

**Contrôle :** 🟣👤 [`human-check.md`](./human-check.md) <a href="./human-check.md" target="_blank">↗</a>

**Après validation :** clôturer H001 et lancer l’industrialisation de JSON Studio.

🟣👤 [Retour aux jalons HUMAN](#jalons-human) · 🔷 [↑ Sommaire](#haut)
</details>

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="lot-9"></a>

# 4. Lot 9 — Crash-test métier Recettes du Cœur

<details open>
<summary><strong>📈 Lot 9 — Crash-test métier — ⚪ exécution 0 % / pré-vol intégré</strong></summary>

> 🟧 C ✅ **`9-PREFLIGHT-MACHINE-CHECKLIST` est `done` et intégré via PR #3** : la checklist machine et la fiche humaine de pré-vol sont disponibles dans la roadmap. Le crash-test métier lui-même n’a pas encore démarré.

Ordre prévu :

1. atelier privé `Sites/Recettes-du-Coeur/atelier/` ;
2. consommation des briques génériques du framework sur les vraies données métier ;
3. génération du `web/` ;
4. validation ;
5. publication Preview.

**Règle :** le cas métier éprouve le framework ; il ne doit pas provoquer une duplication de logique spécifique dans le framework.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="lots-futurs"></a>

# 5. Lots 10 à 12 — futur

<details>
<summary><strong>📈 Lots 10 à 12 — ⏸️ intitulés historiques à récupérer</strong></summary>

Ces lots existaient dans l’ancienne roadmap. Leurs intitulés exacts ne sont pas suffisamment établis dans les éléments récupérés ; ils restent volontairement non renommés jusqu’à récupération d’une source fiable.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="industrialisation"></a>

# 6. Séquence d’industrialisation

<details open>
<summary><strong>📈 Priorités techniques après V19</strong></summary>

0. 🟦 A + 🟣👤 **H001 — validation V19/V20** : confirmer visuellement le raccord scoped ; correction V20 uniquement si anomalie bloquante.
1. ⚪ **JSON Studio** — composant framework, validation, undo/redo, historique, diff, relations multiples, mapping d’affichage.
2. 🟦 A **TableWiz / DataWiz** — TableWiz legacy est réservé ; convergence DataSource, ResultSet et renderers partagés à consolider ensuite.
3. 🟩 B ✅ **Search / Set Filter** — robustesse SearchWiz/FilterWiz intégrée via PR #12.
4. 🟩 B ✅ **Media Renderer** — robustesse MediaWiz intégrée via PR #8.
5. 🟩 B ✅ **QRWiz** — robustesse QRWiz intégrée via PR #8.
6. 🟧 C ✅ **NotificationCenter** — niveaux `info / success / warning / error / dev`, cycle de vie, compatibilité sans DOM et variables de thème intégrés via PR #4.
7. 🟧 C ✅ **CodeBlock — socle contractuel** : presets/alias, formatage JSON, export/copie défensifs et tokeniseur sûr intégrés via PR #5 ; le pliage JSON hiérarchique avancé reste une évolution distincte.
8. 🟧 C ✅ **PresetManager** — import/export atomique et validation de collection intégrés via PR #6.
9. 🟧 C ✅ **NavigationWiz / HelpWiz** — navigation et aide contextuelle génériques durcies via PR #11/#14.
10. 🟩 B ✅ / 🟧 C ✅ **Core robuste** — URL Resolver #13, BrowserStorage #15, StateStore #16, EventBus #17, FrameworkRegistry #18 et DataIndex #19 consolidés.
11. ⚪ **Identité visuelle** — intégrer dans le dépôt le pack du logo nLab Web Framework déjà validé et raccorder les références documentaires.
12. 🟩 B / 🟧 C **Consolidation / tests / documentation** — poursuivre sur les briques encore libres après contrôle des locks.
13. 🟧 C ✅ **Lot 9 — pré-vol intégré**, puis crash-test Recettes du Cœur après critères de sortie.

> Cette liste donne l’ordre technique. **Les locks A/B/C priment sur l’ordre** : aucune tâche ne peut être reprise si son périmètre ou ses fichiers sont déjà réservés.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="methode-autonome"></a>

# 9. Méthode autonome

<details open>
<summary><strong>⚙️ Mode d’exécution multi-agent — ouvert par défaut</strong></summary>

```text
0. lire coordination/locks/ pour A + B + C
1. vérifier les file_scope + branches agent-a/* agent-b/* agent-c/*
2. vérifier le HEAD GitHub
3. lire roadmap + REX + décisions canoniques
4. choisir une tâche réellement libre et indépendante
5. créer / reprendre son lock avant toute modification
6. travailler sur une branche dédiée si le chantier est substantiel
7. analyser les cas réels
8. choisir le minimum nécessaire
9. POC si utile
10. tests positifs + négatifs
11. confrontation au corpus réel
12. simplifier / factoriser
13. documenter
14. implémenter
15. re-tester
16. audit vérité / sécurité / factorisation
17. mettre à jour REX à chaque jalon structurel
18. re-vérifier locks A/B/C + HEAD
19. comparer la branche avec sa base et contrôler le file_scope
20. commit sans force
21. mettre le lock en review/done/released selon le cas
22. rafraîchir le tableau multi-agent dès que le mutex documentaire est disponible
23. conserver la pastille de l'agent sur toute tâche `done`
24. continuer si le critère de sortie est satisfait
```

### Règle spéciale roadmap / tableau

`coordination/locks/COORD-ROADMAP-AGENT-DASHBOARD.json` est le **mutex documentaire persistant**.

- un seul agent à la fois édite `roadmap.md`, `coordination/agent-board.md` ou `coordination/README.md` ;
- si le mutex est `in_progress` chez A, B ou C, les autres agents continuent leur code mais ne touchent pas aux fichiers de pilotage ;
- lorsqu’il est `released` ou `done`, l’agent qui veut rafraîchir le tableau met à jour ce même lock à son nom avant édition ;
- les locks métier restent toujours la source de vérité ;
- après intégration, le propriétaire reste affiché dans l’historique (`🟦 A ✅`, `🟩 B ✅`, `🟧 C ✅`).

**Chat / rapport :** réponse courte avec principaux changements, statut, prochain point et liens directs. Les détails restent dans GitHub.

**Déclencher 🟣👤 HUMAN uniquement si le jugement humain peut réellement modifier la décision.**

**Version de démo :** chaque commit qui modifie la page de démonstration incrémente sa version visible dans le titre navigateur, le titre principal et un marquage visuel lisible.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="backlog"></a>

# 10. 💡 Backlog / boîte à idées non bloquante

> Une nouvelle idée ne modifie pas automatiquement le périmètre du livrable courant.

| Classe | Usage | Bloque la clôture ? |
|---|---|---|
| `BEFORE_CLOSE` | nécessaire avant fermeture du lot actif | oui |
| `LATER` | évolution moyen / long terme | non |
| `NOTE` | remarque, piste ou enseignement | non |

<details open>
<summary><strong>BEFORE_CLOSE — Lot 8B</strong></summary>

- 🟣👤 validation HUMAN V19 de la portée native et des contrôles raccordés ;
- **intégration du pack officiel du logo nLab Web Framework déjà validé dans `dev/framework/doc/roadmap/icons/`, avec manifest/README et références documentaires** ;
- extraction JSON Studio ;
- convergence minimale TableWiz / DataWiz ;
- nettoyage des comportements encore spécifiques à la démo ;
- validation HUMAN de sortie 8B.

</details>

<details>
<summary><strong>LATER / NOTE — idées différées</strong></summary>

- `LATER` — **support HTML “base de connaissances visuelle”** : transformer les synthèses graphiques/explicatives pertinentes en page HTML autonome, lisible et navigable, utilisable comme support de compréhension d’un projet ou d’un système ;
- `LATER` — **support visuel joint aux notes Markdown** : intégrer l’image directement dans le `.md` lorsque GitHub sait l’afficher ; sinon stocker l’asset à côté et le référencer explicitement ;
- `LATER` — **test des ancres / IDs de section** : vérifier qu’un lien GitHub vers `roadmap.md#section-id` ouvre directement la bonne section/sous-section et étudier si un `<details>` ciblé peut être ouvert automatiquement ou nécessite une convention alternative ;
- `LATER` — vue graphique DataWiz / ResultSet ;
- `LATER` — détourage / masque d’images avancé ;
- `LATER` — pliage JSON hiérarchique avancé dans CodeBlock ;
- `LATER` — éditeur riche distinct du CodeBlock ;
- `NOTE` — récupérer la nomenclature historique exacte des lots 10 à 12.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="capitalisation"></a>

# 11. Capitalisation / clôture

- finaliser le REX machine ;
- distinguer réussites, difficultés et anti-patterns ;
- vérifier le backlog `BEFORE_CLOSE` ;
- transférer les `LATER` / `NOTE` utiles dans la boîte à idées ;
- proposer les améliorations de template détectées sans les propager automatiquement ;
- demander une validation synthétique avant application aux autres roadmaps ;
- archiver roadmap finale + REX ;
- améliorer le template à partir de l’expérience réelle.