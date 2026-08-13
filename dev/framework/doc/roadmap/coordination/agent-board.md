# nLab Web Framework — tableau multi-agent

> **Instantané vérifié : 2026-08-13 04:44 +02:00.**  
> **Source de vérité :** `coordination/locks/*.json`. Ce tableau distingue désormais explicitement **activité de session** et **protection de scope**.

## 1. État de coordination

| Agent | Activité de session observée | Scope protégé actuellement | Interprétation |
|---|---|---|---|
| 🟦 **A** | aucune activité de session récente démontrée au moment de ce contrôle | TableWiz `review`, V20 `blocked_human`, architecture sémantique `review`, carte d'architecture `review` | aucun codage A présumé actif ; les scopes restent protégés uniquement par leur état de revue/validation |
| 🟩 **B** | 🛠️ session actuelle | mutex documentaire uniquement pendant ce refresh | pas de scope runtime réservé |
| 🟧 **C** | aucune activité de session active connue | aucun scope métier actif connu | anciens lots conservés comme historique |
| 🟣👤 **HUMAN** | validations ouvertes | V20, décisions architecture ; revue visuelle TableWiz si souhaitée | ce sont des gates de décision, pas des agents actifs |

### Règle de lecture

Un lock persistant **ne prouve jamais qu'un agent travaille encore**.

- `reserved` / `in_progress` + signal récent de session = **travail actif** ;
- `review` = **travail autonome terminé**, scope conservé pour revue/intégration ;
- `blocked` avec `HUMAN_*` = **aucun travail agent en cours**, gate humaine ouverte ;
- `done` = intégré, aucune réservation active ;
- `released` = libre.

Ainsi, un lot `review` ou `blocked_human` ne doit plus être présenté comme « Agent A actif ».

---

## 2. Lots A encore ouverts — état factuel

| PR / lock | Production autonome | Intégration | Activité agent | Action restante |
|---|---|---|---|---|
| **#33 — TableWiz A1–A7** | ✅ terminée et testée | 👀 PR ouverte | **inactive côté production** | revue API/visuelle puis intégration ; ne pas redévelopper |
| **#47 — architecture sémantique** | ✅ document terminé | 👀 PR ouverte | **inactive côté production** | arbitrage architecture HUMAN |
| **#48 — Architecture Map** | ✅ JSON + HTML terminés | 👀 PR ouverte | **inactive côté production** | revue lisibilité/architecture HUMAN |
| **V20 Scope/Layout** | ✅ travail autonome arrêté au point prévu | ⛔ non intégré | **inactive côté production** | validation visuelle HUMAN |
| **Header Studio #44** | ✅ terminé | ✅ mergé | aucune | aucune ; lock `done` |

### Conclusion opérationnelle

Il n'existe donc **aucun “verrou fantôme dont on ignore si le travail a été fait”** sur ces lots :

- TableWiz, architecture sémantique et carte d'architecture sont **faits côté production**, mais pas encore validés/intégrés ;
- V20 est **explicitement en attente HUMAN** ;
- Header Studio est **déjà intégré**.

Les scopes `review` restent protégés uniquement pour empêcher une seconde implémentation concurrente. Ils ne signifient pas qu'une session A tourne encore.

---

## 3. État réel du Lot 8B

Plusieurs lignes autrefois indiquées « à faire » sont **déjà intégrées** sur `New` :

| Lot | État réel | Preuve de coordination |
|---|---|---|
| **JSON Studio — industrialisation** | 🟢 terminé | lock `8B-JSON-STUDIO-INDUSTRIALIZATION` = `done`, PR **#51** |
| **DataWiz — convergence** | 🟢 terminé | lock `8B-DATAWIZ-CONVERGENCE` = `done`, PR **#54** |
| **AssetLogoProfile** | 🟢 contrat intégré | lock `8B-ASSET-LOGO-PROFILE` = `done`, PR **#90** |
| **Pagination** | 🟢 terminé | reprise C par A, PR **#34** |
| **Header Studio** | 🟢 terminé | lock `8B-HEADER-LEGACY-EXTRACTION` = `done`, PR **#44** |
| **Outillage de tests / anti-collision** | 🟢 intégré | runner, workflow manuel et checker `file_scope` présents |

---

## 4. Lot 9 — pré-vol / crash-test métier

L'infrastructure de pré-vol est exécutable. Les quatre anciennes gates techniques suivantes sont maintenant terminées :

- `P9-002` — schémas data ✅ ;
- `P9-004` — Media / QR ✅ ;
- `P9-005` — SEO / Share ✅ ;
- `P9-006` — observabilité ✅.

Restent sur le chemin critique :

- `P9-003` — TableWiz : production terminée, PR #33 en revue ;
- `P9-007` — V20 : validation HUMAN ;
- `P9-008` — données Recettes du Cœur : dépendance externe.

Le crash-test métier n'est donc pas bloqué par un agent inconnu ; il dépend de ces trois gates identifiées.

---

## 5. Identité visuelle Web Framework

Deux choses restent distinctes :

1. 🟢 **`AssetLogoProfile`** : contrat générique intégré ;
2. ⚪ **pack binaire officiel du logo nLab Web Framework** : encore à déposer à partir de la source validée, sans régénération approximative.

---

## 6. Règles de reprise

1. Lire `New` et les locks réels avant toute réservation.
2. Ne jamais déduire l'activité d'un agent de la seule existence d'un lock, d'une branche ou d'une PR.
3. Pour parler d'**agent actif**, exiger un signal récent de session/coordination ou un lock `reserved|in_progress` corroboré par une activité récente.
4. `review` signifie : production autonome terminée, scope protégé pour revue ; **pas session active**.
5. `blocked` par une gate HUMAN/externe signifie : aucune production agent active tant que la condition n'est pas levée.
6. Un scope `review` ou `blocked` reste protégé contre une seconde implémentation, mais les autres lots disjoints peuvent avancer normalement.
7. Une PR mergée doit conduire le lock à `done`; une PR abandonnée doit conduire à `released` ou à une reprise explicite.
8. Avant reprise d'un vrai `in_progress` ancien, appliquer la procédure de lock orphelin de `coordination/README.md`.

---

## 7. Prochaines zones de travail sans collision

- 🧪 préparation/qualité Lot 9 hors scopes TableWiz/V20 ;
- 🎨 pack binaire officiel du logo lorsque la source validée est exploitable ;
- 📚 documentation/contrats manquants sur des périmètres libres ;
- 🏖️ POC avancés disjoints en sandbox ;
- après validation des gates HUMAN/externes : vertical slice Recettes du Cœur.

---

## 8. Historique

Les attributions détaillées restent dans :

- `coordination/locks/*.json` ;
- l'Issue #1 ;
- les PR et l'historique Git.

La couleur d'un agent reste une attribution historique. **Elle n'est plus interprétée comme un indicateur de présence en temps réel.**
