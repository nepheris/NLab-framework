# nLab Web Framework — tableau multi-agent

> Vue opérationnelle des tâches réservées par les agents. **Source de vérité :** les fichiers `coordination/locks/*.json`. Ce tableau est un instantané lisible ; en cas d'écart, le lock JSON le plus récent prime.

## Légende agents

- 🟦 **A** — Agent A : UX, démo active, extraction legacy et architecture sémantique selon ses locks.
- 🟩 **B** — Agent B : robustesse, contrats, tests et lots autonomes selon ses locks.
- 🟧 **C** — Agent C : lots parallèles indépendants selon ses locks.
- 🟣👤 **HUMAN** — validation humaine requise ; ce n'est pas un agent logiciel.
- ⚪ **Libre** — aucune réservation active connue.

## Légende statuts

- 🔒 `reserved` — réservé, pas encore commencé.
- 🛠️ `in_progress` — travail en cours.
- 👀 `review` — prêt pour revue / consolidation.
- ⛔ `blocked` — bloqué par dépendance ou validation.
- ✅ `done` — terminé / intégré / livré.
- ♻️ `released` — libéré et disponible pour réattribution.

## Tâches actuellement attribuées

| Agent | Statut | Tâche | Branche | Périmètre synthétique |
|---|---|---|---|---|
| 🟦 A | 🛠️ `in_progress` | `8B-V20-SCOPE-LAYOUT` | `review-v20-from-v16` | Scope Lab / Layout Lab V20, démo |
| 🟦 A | 🛠️ `in_progress` | `8B-SEMANTIC-ARCHITECTURE` | `agent-a/semantic-architecture` | nomenclature et responsabilités architecturales |
| 🟦 A | 🔒 `reserved` | `8B-HEADER-LEGACY-EXTRACTION` | `agent-a/header-studio-from-v16` | Header Studio générique |
| 🟦 A | 🔒 `reserved` | `8B-TABLEWIZ-LEGACY-EXTRACTION` | `agent-a/tablewiz-legacy-from-v16` | TableWiz legacy → API générique |
| 🟩 B | 🛠️ `in_progress` | `8B-OBSERVABILITY-ROBUSTNESS` | `agent-b/observability-robustness` | RuntimeMonitor / tests robustesse |
| 🟩 B | 🛠️ `in_progress` | `8B-SEO-SHARE-CONTRACTS` | `agent-b/seo-share-contracts` | SEO / Share / fallbacks navigateur |
| 🟩 B | 🛠️ `in_progress` | `8B-DATA-SCHEMAS-VALIDATION` | `agent-b/data-schemas-validation` | schémas data et relations |
| 🟩 B | 🔒 `reserved` | `8B-QR-MEDIA-ROBUSTNESS` | `agent-b/qr-media-robustness` | QRWiz / MediaWiz robustesse |

> 🟧 **C n'a plus de lock métier actif dans ce snapshot.** Les trois derniers lots ont été intégrés dans `New` et restent historisés dans leurs locks `done`.

## Livraisons C récemment intégrées

| Agent | Statut | Tâche | Intégration | Résultat |
|---|---|---|---|---|
| 🟧 C | ✅ `done` | `8B-ANALYTICS-CONSENT-PROVIDER` | PR #2 — `6571142bba33e8d684a7da37bf217761e4c3cba4` | contrat AnalyticsWiz / consentement / provider GA4 renforcé + tests dédiés |
| 🟧 C | ✅ `done` | `9-PREFLIGHT-MACHINE-CHECKLIST` | PR #3 — `3a999b6044f4a360897c8a2f794f5ffe887f1dca` | checklist machine + fiche humaine du pré-vol Lot 9 intégrées |
| 🟧 C | ✅ `done` | `8B-NOTIFICATION-CENTER-CONTRACT` | PR #4 — `8a8c1a8b01efd445e06aae5125c4f02395741a84` | NotificationCenter sans DOM, niveaux complets, cycle de vie, thème et tests dédiés |

## Règle de lecture

1. Une ligne colorée signifie qu'un agent possède un lock actif ou en review.
2. La couleur identifie **le propriétaire**, le pictogramme de statut indique **l'état**.
3. Avant de prendre une tâche, un agent doit contrôler tous les `file_scope` A/B/C, pas seulement le nom du lot.
4. Une tâche `done` reste historisée dans son lock ; elle peut être retirée de la section active et déplacée vers une synthèse de clôture.
5. Une tâche sans lock actif est considérée libre uniquement après vérification des branches et du HEAD de `New`.

## Mutex de mise à jour du tableau

`locks/COORD-ROADMAP-AGENT-DASHBOARD.json` sert de verrou de contrôle pour `roadmap.md`, ce tableau et la procédure de coordination.

- si le mutex est `in_progress` chez un autre agent : ne pas éditer ces fichiers ;
- si le mutex est `released` ou `done` : l'agent qui veut rafraîchir le tableau met à jour ce même lock à son nom avant édition ;
- après rafraîchissement : passer le mutex à `released` avec le SHA de sortie ;
- les locks métier restent la source de vérité et peuvent être créés même si le mutex du tableau est occupé.

Ainsi, les agents continuent de travailler en parallèle sans modifier simultanément la roadmap canonique.
