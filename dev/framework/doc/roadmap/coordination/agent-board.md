# nLab Web Framework — tableau multi-agent

> Vue opérationnelle des tâches réservées par les agents. **Source de vérité :** les fichiers `coordination/locks/*.json`. Ce tableau est un instantané lisible ; en cas d'écart, le lock JSON le plus récent prime.

## Légende agents

- 🟦 **A** — Agent A : UX, démo active, extraction legacy et architecture selon ses locks.
- 🟩 **B** — Agent B : robustesse, contrats, tests et lots autonomes selon ses locks.
- 🟧 **C** — Agent C : lots parallèles indépendants selon ses locks.
- 🟣👤 **HUMAN** — validation humaine requise ; ce n'est pas un agent logiciel.
- ⚪ **Libre** — aucune réservation active connue.

> **Convention de traçabilité : la couleur de l'agent reste affichée après `done`.** Une tâche `🟩 B ✅`, par exemple, signifie qu'elle a été réalisée par B même si son lock n'est plus actif.

## Légende statuts

- `🔒 reserved` — réservé, pas encore commencé.
- `🛠️ in_progress` — travail en cours.
- `👀 review` — prêt pour revue / consolidation.
- `⛔ blocked` — bloqué par dépendance ou validation.
- `✅ done` — terminé / intégré / livré.
- `♻️ released` — libéré et disponible pour réattribution.

## Tâches actuellement attribuées

| Agent | Statut | Tâche | Branche | Périmètre synthétique |
|---|---|---|---|---|
| 🟦 A | 🛠️ `in_progress` | `8B-V20-SCOPE-LAYOUT` | `review-v20-from-v16` | Scope Lab / Layout Lab V20, démo |
| 🟦 A | 👀 `review` | `8B-SEMANTIC-ARCHITECTURE` | `agent-a/semantic-architecture` | nomenclature et responsabilités architecturales |
| 🟦 A | 👀 `review` | `8B-ARCHITECTURE-MAP` | `agent-a/architecture-map` | carte hiérarchique Framework + Data métier |
| 🟦 A | 🔒 `reserved` | `8B-HEADER-LEGACY-EXTRACTION` | `agent-a/header-studio-from-v16` | Header Studio générique |
| 🟦 A | 🔒 `reserved` | `8B-TABLEWIZ-LEGACY-EXTRACTION` | `agent-a/tablewiz-legacy-from-v16` | TableWiz legacy → API générique |

> 🟩 **B** et 🟧 **C** n'ont pas de lock métier actif dans ce snapshot après leurs dernières intégrations. De nouveaux locks peuvent apparaître à tout moment ; les JSON de `locks/` priment toujours.

## Livraisons B intégrées

| Agent | Statut | Tâche | Intégration | Résultat |
|---|---|---|---|---|
| 🟩 B | ✅ `done` | `8B-DATA-SCHEMAS-VALIDATION` | PR #7 — `1257647aa0f9862bc98cadf7938796d7db6fcff4` | schémas data/relations validés, fallback `targetField` corrigé |
| 🟩 B | ✅ `done` | `8B-QR-MEDIA-ROBUSTNESS` | PR #8 — `5490fd3f1bc13532d1a7d28ba8ec276edf42fa5e` | QRWiz / MediaWiz durcis, fallbacks et entrées invalides couverts |
| 🟩 B | ✅ `done` | `8B-OBSERVABILITY-ROBUSTNESS` | PR #9 — `0a5f08e762f1167ec1991199a33f0da3e63726ac` | RuntimeMonitor durci et testé |
| 🟩 B | ✅ `done` | `8B-SEO-SHARE-CONTRACTS` | PR #10 — `5d95554858a5a4a60ed205e779dcd4aa4d77b61f` | SEO/Share déterministes et fallbacks navigateur durcis |
| 🟩 B | ✅ `done` | `8B-SEARCH-FILTER-ROBUSTNESS` | PR #12 — `7572591e4f4987c2478d5891f7e5fc3453db785c` | SearchWiz Unicode/stopwords/fields et FilterWiz fail-closed consolidés |
| 🟩 B | ✅ `done` | `8B-URL-RESOLVER-ROBUSTNESS` | PR #13 — `cf606f256329567200bc8d054d7ef073a1e393cc` | URL Resolver résilient, bases relatives et contexte hors navigateur couverts |
| 🟩 B | ✅ `done` | `8B-DATA-INDEX-ROBUSTNESS` | PR #19 — `00d1a5738a8eb5dcf56049ec02ff3af2e08db4f3` | DataIndex atomique, entrées validées, doublons structurés, `has/size` |
| 🟩 B | ✅ `done` | `8B-DATA-RESOLVER-ROBUSTNESS` | PR #22 — `6f4f3a999b235983b16494fd22930b3352899440` | DataResolver : collections own-property, provider/data/relations validés, cache ciblé |

## Livraisons C intégrées

| Agent | Statut | Tâche | Intégration | Résultat |
|---|---|---|---|---|
| 🟧 C | ✅ `done` | `8B-ANALYTICS-CONSENT-PROVIDER` | PR #2 — `6571142bba33e8d684a7da37bf217761e4c3cba4` | contrat AnalyticsWiz / consentement / provider GA4 renforcé + tests dédiés |
| 🟧 C | ✅ `done` | `9-PREFLIGHT-MACHINE-CHECKLIST` | PR #3 — `3a999b6044f4a360897c8a2f794f5ffe887f1dca` | checklist machine + fiche humaine du pré-vol Lot 9 intégrées |
| 🟧 C | ✅ `done` | `8B-NOTIFICATION-CENTER-CONTRACT` | PR #4 — `8a8c1a8b01efd445e06aae5125c4f02395741a84` | NotificationCenter sans DOM, niveaux complets, cycle de vie, thème et tests dédiés |
| 🟧 C | ✅ `done` | `8B-CODEBLOCK-CONTRACT` | PR #5 — `86f12ae01f199f60c422e79c5f5fa81ee0c4d1d9` | presets/alias langage, formatage JSON, export/copie sûrs et tokeniseur corrigé |
| 🟧 C | ✅ `done` | `8B-PRESET-MANAGER-IMPORT` | PR #6 — `ff9ab4ed974ea4a8a83bdf84f545e9b7313434d6` | import de collections atomique et validé, canoniques protégés |
| 🟧 C | ✅ `done` | `8B-NAVIGATION-CONTRACT` | PR #11 — `9d02216a3395002da7ef300dc83aa1c70567cae5` | NavigationWiz sans DOM implicite, IDs sûrs, observer/hash robustes |
| 🟧 C | ✅ `done` | `8B-HELPWIZ-CONTRACT` | PR #14 — `181ab313a73e00bd74749119e41a939f526856a9` | HelpWiz cloné/contextualisé, attach idempotent, detach/destroy et événements injectables |
| 🟧 C | ✅ `done` | `8B-STORAGE-ROBUSTNESS` | PR #15 — `1b84292ee6d10c0de0b34cc4dc11150ccf499de8` | BrowserStorage résilient aux erreurs quota/security/sérialisation et clear best-effort |
| 🟧 C | ✅ `done` | `8B-STATE-STORE-ROBUSTNESS` | PR #16 — `d4ba568af90ccf91ab413159dde2ed499b86f124` | StateStore protégé contre chemins invalides/prototype pollution et hydratation/reset fiabilisés |
| 🟧 C | ✅ `done` | `8B-EVENT-BUS-ROBUSTNESS` | PR #17 — `2d7d4e7a195143747e92348c3c99b72334b07466` | EventBus déterministe, listeners isolés, wildcard/once/off/introspection consolidés |
| 🟧 C | ✅ `done` | `8B-REGISTRY-ROBUSTNESS` | PR #18 — `892d96e1aa1aa074acf0c1965ee0bc42a43031e6` | FrameworkRegistry : lectures sûres, validation, pruning et introspection |
| 🟧 C | ✅ `done` | `8B-RESULTSET-ROBUSTNESS` | PR #20 — `f23baf9e723aae7055fb4167ed0e0b723a28087d` | ResultSet : contexte isolé, total logique conservé et helpers d'itération/introspection |
| 🟧 C | ✅ `done` | `8B-DATA-PROVIDER-ROBUSTNESS` | PR #21 — `539f418b38e5f5b82743d16df362e5653b558d81` | DataProvider : options clonées, capabilities, getRecord et erreurs structurées |
| 🟧 C | ✅ `done` | `8B-DATA-RUNTIME-REGISTRY` | PR #23 — `80293795b9c1039be640288259930b744c0d1adc` | DataRuntimeRegistry : types normalisés, remplacements explicites, providers/adapters séparés |

## Règle de lecture et d'historique

1. Une ligne colorée active signifie qu'un agent possède un lock actif ou en review.
2. La couleur identifie **le propriétaire**, le pictogramme de statut indique **l'état**.
3. Une ligne `✅ done` **conserve définitivement la couleur de l'agent qui l'a réalisée**.
4. Avant de prendre une tâche, un agent doit contrôler tous les `file_scope` A/B/C, pas seulement le nom du lot.
5. Une tâche sans lock actif est considérée libre uniquement après vérification des branches et du HEAD de `New`.
6. Les tâches historiques antérieures au protocole de locks ne sont pas réattribuées rétroactivement sans preuve Git fiable.

## Mutex de mise à jour du tableau

`locks/COORD-ROADMAP-AGENT-DASHBOARD.json` sert de verrou de contrôle pour `roadmap.md`, ce tableau et la procédure de coordination.

- si le mutex est `in_progress` chez un autre agent : ne pas éditer ces fichiers ;
- si le mutex est `released` ou `done` : l'agent qui veut rafraîchir le tableau met à jour ce même lock à son nom avant édition ;
- après rafraîchissement : passer le mutex à `released` avec le SHA de sortie ;
- les locks métier restent la source de vérité et peuvent être créés même si le mutex du tableau est occupé.

Ainsi, les agents continuent de travailler en parallèle sans modifier simultanément la roadmap canonique.
