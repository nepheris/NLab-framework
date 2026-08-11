# nLab Web Framework — matrice de travail parallèle depuis V16

> Référence humaine actuelle : **Review V16**. Les travaux ci-dessous sont classés selon leur dépendance au jalon de validation visuelle. L'objectif est de continuer à avancer sans modifier le rendu/comportement que l'humain est en train de tester.

## 1. Règle de travail

- **Piste A — dépend de V16/H001** : ne pas modifier sans validation humaine.
- **Piste B — indépendante** : peut être auditée, documentée, testée et préparée en parallèle.
- Une tâche B ne doit pas modifier `demo/index.html`, `demo/demo-core.js`, `demo/review-pass-v16.js` ni le comportement Theme Workshop de la référence V16.
- Les tests automatiques sécurisent une brique mais ne remplacent pas une validation visuelle HUMAN.

## 2. Inventaire aval

| Domaine | État | Dépend de V16/H001 ? | Travail parallèle autorisé |
|---|---|---|---|
| Theme Workshop scoped / profils / resets | suspendu | **oui** | documentation comparative seulement |
| JSON Studio UX de démo | suspendu | **oui partiellement** | contrats, tests du moteur autonome, fixtures |
| JSON Studio industrialisation | préparatoire | non pour l'API/contrats | audit API, invariants, tests, schéma de sortie |
| DataSource / DataProvider / DataResolver | disponible | non | tests, contrats, cas négatifs, docs |
| ResultSet | disponible | non | invariants, tests map/slice/meta |
| DataWiz | disponible | non | tests statistiques, valeurs manquantes, groupements, histogrammes |
| TableWiz | disponible | non | tests tri/pagination/export/colonnes sans changer l'UX |
| SearchWiz | disponible | non | tests score/normalisation/champs/locale |
| FilterWiz / Set Filter moteur | disponible | non | tests opérateurs, listes, combinaisons |
| RendererWiz | disponible | non | tests choix de vue et rendu structurel |
| MediaWiz | disponible | non | contrats image/fallback/ratio/object-fit |
| QRWiz | disponible | non | payload, options, encodeur, transparence, logo, sécurité SVG |
| NotificationCenter | disponible | non | tests niveaux et cycle de vie |
| CodeBlock | disponible | non | tests format/export/édition hors démo |
| PresetManager | disponible | non | tests déjà présents + cas d'import/export |
| NavigationWiz | disponible | non | audit contrats responsive/navigation |
| HelpWiz | disponible | non | audit liens/contextes |
| SEO Wiz | disponible | non | contrats metadata/schema |
| ShareWiz | disponible | non | contrats URL/payload |
| AnalyticsWiz | disponible | non | contrat provider + consentement, sans branchement public |
| Observability / RuntimeMonitor | disponible | non | tests erreurs/événements/diagnostic |
| Data schemas (`collection`, `registry`, `relation`) | disponible | non | validation fixtures et compatibilité métier |
| Identité/logo Web Framework | indépendant | non | récupération/intégration du pack validé si source retrouvée |
| Preview multi-versions | opérationnel | non | maintien registre + snapshots immuables + validation automatique |
| Lot 9 Recettes du Cœur — pré-vol | préparatoire | non | architecture, contrats données, checklist, vertical slice |
| Lot 9 — intégration réelle du site | futur | oui partiellement | attendre choix du socle runtime final pour le branchement définitif |
| Consolidation tests/docs | disponible | non | augmenter couverture sans modifier le runtime de référence |

## 3. Ordre de travail autonome recommandé

1. **Non-régression data/QR** : DataWiz, ResultSet, QRWiz, Search/Filter, TableWiz.
2. **Contrats métier Recettes du Cœur** : datasets, relations, champs attendus, erreurs et fallbacks.
3. **JSON Studio moteur** : tests de données et contrats sans toucher à l'UX V16.
4. **Media / QR / SEO / Share** : contrats nécessaires aux fiches recettes publiques.
5. **Observabilité** : rendre les erreurs explicites avant le crash-test métier.
6. **Preview** : chaque nouveau review est ajouté au registre et conservé comme snapshot.
7. **Identité** : intégrer le pack officiel lorsqu'une source validée est retrouvée.

## 4. Ce qui reste volontairement gelé

Pendant la validation V16 :

- Theme Workshop visuel ;
- contrôles historiques de la démo ;
- layout du Catalogue / Playground ;
- `review-pass-v16.js` ;
- nouvelle passe V17+ ;
- toute modification dont le résultat nécessite immédiatement un jugement visuel.

## 5. Critère de reprise de la piste A

Quand l'humain termine le contrôle V16 :

1. enregistrer les fonctions V16 réellement validées ;
2. comparer V17 fonction par fonction et non commit par commit ;
3. créer la prochaine review à partir de V16 ;
4. ajouter automatiquement cette review à la Preview multi-versions ;
5. conserver V16 comme point de retour jusqu'à validation de la nouvelle review.
