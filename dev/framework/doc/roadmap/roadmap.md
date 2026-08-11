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
| 🟦 A | 🔒 `reserved` | `8B-HEADER-LEGACY-EXTRACTION` | `agent-a/header-studio-from-v16` | Header Studio générique |
| 🟦 A | 🔒 `reserved` | `8B-TABLEWIZ-LEGACY-EXTRACTION` | `agent-a/tablewiz-legacy-from-v16` | TableWiz legacy → API générique |
| 🟩 B | 🛠️ `in_progress` | `8B-SEARCH-FILTER-ROBUSTNESS` | `agent-b/search-filter-robustness` | SearchWiz / FilterWiz robustesse, hors TableWiz |

**Livraisons B intégrées dans `New` pendant ce cycle :**

| Agent | Statut | Tâche | Intégration | Résultat |
|---|---|---|---|---|
| 🟩 B | ✅ `done` | `8B-DATA-SCHEMAS-VALIDATION` | PR #7 — `1257647aa0f9862bc98cadf7938796d7db6fcff4` | schémas data/relations validés et fallback `targetField` corrigé |
| 🟩 B | ✅ `done` | `8B-QR-MEDIA-ROBUSTNESS` | PR #8 — `5490fd3f1bc13532d1a7d28ba8ec276edf42fa5e` | QRWiz / MediaWiz durcis |
| 🟩 B | ✅ `done` | `8B-OBSERVABILITY-ROBUSTNESS` | PR #9 — `0a5f08e762f1167ec1991199a33f0da3e63726ac` | RuntimeMonitor durci et testé |
| 🟩 B | ✅ `done` | `8B-SEO-SHARE-CONTRACTS` | PR #10 — `5d95554858a5a4a60ed205e779dcd4aa4d77b61f` | SEO/Share et fallbacks navigateur durcis |

**Livraisons C intégrées dans `New` :**

| Agent | Statut | Tâche | Intégration | Résultat |
|---|---|---|---|---|
| 🟧 C | ✅ `done` | `8B-ANALYTICS-CONSENT-PROVIDER` | PR #2 — `6571142bba33e8d684a7da37bf217761e4c3cba4` | AnalyticsWiz / consentement / GA4 renforcés + tests dédiés |
| 🟧 C | ✅ `done` | `9-PREFLIGHT-MACHINE-CHECKLIST` | PR #3 — `3a999b6044f4a360897c8a2f794f5ffe887f1dca` | pré-vol machine + checklist humaine Lot 9 intégrés |
| 🟧 C | ✅ `done` | `8B-NOTIFICATION-CENTER-CONTRACT` | PR #4 — `8a8c1a8b01efd445e06aae5125c4f02395741a84` | NotificationCenter sans DOM, niveaux complets, cycle de vie, thème + tests |
| 🟧 C | ✅ `done` | `8B-CODEBLOCK-CONTRACT` | PR #5 — `86f12ae01f199f60c422e79c5f5fa81ee0c4d1d9` | presets/alias, formatage JSON, export/copie sûrs et tokeniseur corrigé |
| 🟧 C | ✅ `done` | `8B-PRESET-MANAGER-IMPORT` | PR #6 — `ff9ab4ed974ea4a8a83bdf84f545e9b7313434d6` | import atomique, validation de collection et protection des canoniques |
| 🟧 C | ✅ `done` | `8B-NAVIGATION-CONTRACT` | PR #11 — `9d02216a3395002da7ef300dc83aa1c70567cae5` | NavigationWiz sans DOM implicite, IDs/observer/hash robustes |

**Lecture rapide :**

- 🟦 **A** travaille sur V20 ; l’architecture sémantique est en review ; Header et TableWiz restent réservés.
- 🟩 **B** a intégré Data Schemas, QR/Media, Observability et SEO/Share, puis travaille maintenant sur Search/Filter.
- 🟧 **C** a intégré six lots autonomes dont CodeBlock, PresetManager et NavigationWiz dans ce cycle ; aucun lock métier C n’est actif à cet instant.
- 🟣👤 **HUMAN** reste requis pour H001 et les arbitrages visuels associés.

Le détail complet et les `file_scope` sont visibles dans [`coordination/agent-board.md`](./coordination/agent-board.md) et surtout dans [`coordination/locks/`](./coordination/locks/).

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
| Composants industrialisés | ⬜ | 🟡 | ~70 % | prototypes extraits en composants génériques |
| JSON / data métier | ⬜ | 🟡 | ~60 % | édition + relations inter-JSON robustes |
| Tests / robustesse | ⬜ | 🟡 | ~55 % | non-régression et cas négatifs |
| Intégration métier | ⬜ | 🟡 | ~20 % | crash-test Recettes du Cœur |

```text
⬜ ARCHITECTURE FRAMEWORK       ████████████████████  ~90 %
⬜ CATALOGUE / PLAYGROUND      █████████████████░░░  ~85 %
🎯 UX / CONCEPTS               ███████████████░░░░░  ~75 %   ← VALIDATION ACTIVE
⬜ COMPOSANTS INDUSTRIALISÉS   ██████████████░░░░░░  ~70 %
⬜ JSON / DATA MÉTIER          ████████████░░░░░░░░  ~60 %
⬜ TESTS / ROBUSTESSE          ███████████░░░░░░░░░  ~55 %
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
Robustesse data / QR / Media / SEO / Share / Observability consolidée
↓
POINT PARALLÈLE : Search / Filter + extractions A + briques autonomes C
↓
SI VALIDÉ : poursuite des composants autonomes
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
| 🟢 | 100 % | 🟩 B ✅ | QRWiz / MediaWiz robustesse, fallbacks et entrées invalides consolidés via PR #8 |
| 🟢 | 100 % | 🟩 B ✅ | RuntimeMonitor / observabilité consolidés via PR #9 |
| 🟢 | 100 % | 🟩 B ✅ | contrats SEO / Share et fallbacks navigateur consolidés via PR #10 |
| 🟢 | 100 % | 🟧 C ✅ | contrat AnalyticsWiz / consentement / provider GA4 renforcé, documenté, testé et intégré via PR #2 |
| 🟢 | 100 % | 🟧 C ✅ | NotificationCenter : niveaux `info/success/warning/error/dev`, compatibilité sans DOM, cycle de vie et thème, intégré via PR #4 |
| 🟢 | 100 % tâche | 🟧 C ✅ | CodeBlock : presets/alias, formatage JSON, export/copie sûrs et tokenisation corrigée via PR #5 |
| 🟢 | 100 % | 🟧 C ✅ | PresetManager : import/export atomique, validation de collection, canoniques protégés via PR #6 |
| 🟢 | 100 % | 🟧 C ✅ | NavigationWiz : dépendances injectables, IDs sans collision, observer/hash robustes via PR #11 |
| 🟡 | HUMAN actif | 🟦 A + 🟣👤 | validation visuelle des portées, profils, resets et contrôles historiques V19/V20 |
| 🟡 | ~70 % | 🟦 A / 🟩 B / 🟧 C | extraction et consolidation parallèles de briques framework |
| ⚪ | 0 % | ⚪ Libre | **intégrer le logo nLab Web Framework déjà validé : retrouver les fichiers source validés, créer `doc/roadmap/icons/`, y déposer le pack officiel (variantes, icône, manifest/README) et le référencer dans la documentation** |
| ⚪ | 0 % | ⚪ Libre | **industrialiser JSON Studio en composant autonome** |
| ⚪ | 0 % | 🟦 A — TableWiz réservé | convergence TableWiz / DataWiz / ResultSet |
| ⚪ | 0 % | 🟣👤 | clôture HUMAN du Lot 8B |

**Chantiers parallèles actuellement verrouillés dans le Lot 8B :**

- 🟦 A — V20 Scope/Layout 🛠️ ; architecture sémantique 👀 ; Header 🔒 ; TableWiz 🔒.
- 🟩 B — Search/Filter robustesse 🛠️ ; Data Schemas, QR/Media, Observability et SEO/Share sont ✅ intégrés.
- 🟧 C — aucun verrou métier actif dans ce snapshot ; six lots autonomes sont ✅ intégrés dans `New`.

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
3. 🟩 B 🛠️ **Search / Set Filter** — robustesse SearchWiz/FilterWiz en cours dans `8B-SEARCH-FILTER-ROBUSTNESS`.
4. 🟩 B ✅ **Media Renderer** — robustesse MediaWiz intégrée via PR #8.
5. 🟩 B ✅ **QRWiz** — robustesse QRWiz intégrée via PR #8.
6. 🟧 C ✅ **NotificationCenter** — niveaux `info / success / warning / error / dev`, cycle de vie, compatibilité sans DOM et variables de thème intégrés via PR #4.
7. 🟧 C ✅ **CodeBlock — socle contractuel** : presets/alias, formatage JSON, export/copie défensifs et tokeniseur sûr intégrés via PR #5 ; le pliage JSON hiérarchique avancé reste une évolution distincte.
8. 🟧 C ✅ **PresetManager** — import/export atomique et validation de collection intégrés via PR #6.
9. 🟧 C ✅ **NavigationWiz** — hiérarchie, IDs, observer et restauration d’ancre durcis via PR #11.
10. ⚪ **Identité visuelle** — intégrer dans le dépôt le pack du logo nLab Web Framework déjà validé et raccorder les références documentaires.
11. 🟩 B / 🟧 C **Consolidation / tests / documentation** — plusieurs contrats sont ✅ intégrés ; poursuivre sur les briques encore libres après contrôle des locks.
12. 🟧 C ✅ **Lot 9 — pré-vol intégré**, puis crash-test Recettes du Cœur après critères de sortie.

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
23. continuer si le critère de sortie est satisfait
```

### Règle spéciale roadmap / tableau

`coordination/locks/COORD-ROADMAP-AGENT-DASHBOARD.json` est le **mutex documentaire persistant**.

- un seul agent à la fois édite `roadmap.md`, `coordination/agent-board.md` ou `coordination/README.md` ;
- si le mutex est `in_progress` chez A, B ou C, les autres agents continuent leur code mais ne touchent pas aux fichiers de pilotage ;
- lorsqu’il est `released` ou `done`, l’agent qui veut rafraîchir le tableau met à jour ce même lock à son nom avant édition ;
- les locks métier restent toujours la source de vérité.

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