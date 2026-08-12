# DataWizChartRecommender

`DataWizChartRecommender` est le moteur de recommandations explicables placé entre `DataWizDatasetProfile` et `DataWizChartSpec`.

Il ne rend aucun graphique, n'applique aucune proposition et n'a aucune dépendance Plotly, Perspective, ECharts ou Vega.

## Chaîne

`DatasetProfile → ChartRecommender → propositions ChartSpec → choix utilisateur → RendererAdapter`

Le résultat expose toujours `autoApplied: false`. Le premier résultat est un classement, jamais une décision automatique.

## API

```js
const result = new DataWizChartRecommender().recommend(profile, options);
```

Le profil peut être une instance `DataWizDatasetProfile`, son snapshot ou son payload versionné.

Options :

- `maxRecommendations` : 12 par défaut, maximum 50 ;
- `maxFieldsPerRole` : 5 par défaut, maximum 20 ;
- `includeSecondary` : inclut les variantes secondaires comme radar ;
- `source` : descripteur source abstrait injecté dans les ChartSpec.

Les options inconnues sont rejetées. Aucun paramètre `renderer`, `plotly`, etc. n'est accepté.

## Résultat

Chaque recommandation contient :

- `id` stable dérivé du pattern et des encodages ;
- `rank` ;
- `score` entre 0 et 100 ;
- `rule` ;
- `reason` ;
- `warnings` structurés ;
- `chart` : payload `DataWizChartSpec` V1 ;
- `validation` : résultat de `ChartSpec.validate(profile)`.

Toute proposition `blocked` par ChartSpec est éliminée avant classement.

## Règles V1

### Numérique seul

`numeric-distribution` → histogramme quantitatif avec binning.

### Catégorie seule

`categorical-frequency` → barres de fréquence (`count`).

### Temps + mesure

`temporal-measure` → ligne temporelle avec agrégation de la mesure.

Le moteur utilise `sum` pour les champs dont le nom évoque un volume (`amount`, `total`, `revenue`, `sales`, `quantity`, etc.), sinon `mean`.

### Catégorie + mesure

Deux propositions peuvent être générées :

- `category-measure` → barres agrégées ;
- `category-distribution` → box plot pour comparer les distributions.

### Deux mesures

`measure-pair` → scatter pour examiner leur relation.

### Temps sans mesure

`temporal-frequency` → fréquence de lignes dans le temps.

### Radar secondaire

Pour une catégorie de 2 à 12 modalités et une mesure, `category-radar-secondary` peut être proposée si `includeSecondary=true`.

Son score est volontairement inférieur et elle reçoit `SECONDARY_VISUALIZATION`, car les barres sont généralement plus lisibles pour la comparaison.

## Scoring

Le score est déterministe. Il combine :

1. priorité du pattern ;
2. complétude du champ ;
3. rôle analytique inféré par DatasetProfile ;
4. cardinalité utile pour les dimensions ;
5. pénalités de qualité (`MIXED_TYPES`, `NON_FINITE_VALUES`, forte cardinalité, etc.) ;
6. warnings générés par ChartSpec.

À score égal, le tri est stable par règle puis identifiant.

Le score est un outil de classement local, pas une probabilité statistique.

## Sécurité sémantique

Les champs utilisés doivent être adressables par le `specPath` DataWiz. Les champs uniquement identifiés par JSON Pointer parce qu'ils sont ambigus pour le dot-path ne sont pas recommandés automatiquement.

Les identifiants sont exclus des pools numérique et catégoriel. Un identifiant texte (`uuid`) n'est donc jamais proposé comme catégorie uniquement parce que son type est `string`.

## Non auto-application

Le moteur ne fournit aucune méthode `apply`, `select`, `accept` ou mutation de ChartSpec existant.

Une UI doit :

1. afficher le classement ;
2. afficher raison et warnings ;
3. laisser l'utilisateur choisir explicitement une proposition ;
4. instancier ou adopter ensuite le ChartSpec choisi dans une couche séparée.

Cette séparation conserve la possibilité future d'introduire CompassQL/Draco ou des heuristiques plus avancées sans changer le workflow utilisateur.
