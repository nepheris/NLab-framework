# DataWizChartDataMaterializer

`DataWizChartDataMaterializer` transforme des lignes source et un `DataWizChartSpec` en données encodées renderer-neutral.

Il se place avant les adapters concrets afin que Plotly, ECharts ou un autre renderer ne réimplémente pas les règles d'agrégation, de binning ou de timeUnit.

## Chaîne

`rows + ChartSpec → ChartDataMaterializer → RendererAdapter → renderer concret`

## Modes

### Raw

Si aucun encodage n'utilise d'agrégat, chaque ligne source valide produit une ligne matérialisée. Les transformations `bin` et `timeUnit` peuvent modifier la valeur du canal, mais aucune agrégation implicite n'est ajoutée.

### Aggregate

Dès qu'au moins un canal demande un agrégat :

- les canaux `aggregate:none` deviennent les clés de groupement ;
- les autres canaux sont calculés par groupe ;
- la provenance conserve tous les indices source du groupe.

Agrégats V1 : `count`, `distinct`, `sum`, `mean`, `median`, `min`, `max`.

Une agrégation globale sans dimension produit un groupe unique. Sur un dataset vide, `count` matérialise donc explicitement `0`.

### Histogram

Le mark `histogram` est matérialisé explicitement :

- calcul des bornes de bins ;
- affectation des valeurs aux bins ;
- fréquence par bin dans `metrics.count` ;
- provenance des lignes par bin.

V1 accepte uniquement le canal `x` pour ce mode. Les canaux supplémentaires sont refusés plutôt qu'ignorés silencieusement.

## Time units

Les unités temporelles sont calculées en UTC : année, trimestre, mois, semaine ISO commençant le lundi, jour/date, heure, minute et seconde.

La valeur matérialisée est le début canonique du bucket en ISO UTC.

## Binning

Les bins utilisent le domaine observé sur les lignes source et `maxBins` du ChartSpec. Le résultat contient :

- min/max ;
- largeur ;
- liste des bins ;
- centre de chaque bin.

Les valeurs de canal binées utilisent le centre numérique du bin. Les métadonnées complètes restent dans `transforms.bins`.

## Résultat

Le payload `nlab.data-wiz-chart-data` V1 contient :

- `mark` ;
- `mode` ;
- copie des encodages ;
- `records`, chaque enregistrement contenant `values` et éventuellement `metrics` ;
- `provenance` parallèle avec `sourceIndexes` ;
- `transforms.bins` ;
- diagnostics input/output et warnings bornés.

## Garde-fous

- ChartSpec `blocked` refusé avant transformation ;
- lignes non objet ignorées avec diagnostic ;
- valeurs quantitatives/temporelles invalides rejetées par ligne ou groupe ;
- cycles et valeurs non JSON-safe ne traversent pas le résultat ;
- limite `maxOutputRows` ;
- limite `maxGroups` ;
- conflit `aggregate + bin/timeUnit` refusé en V1.

Le Materializer ne modifie jamais les lignes source.

## Suite logique

Un adapter Plotly peut désormais recevoir un payload déjà matérialisé et se limiter à la traduction visuelle : traces, axes, légende et interactions. Les règles de données restent dans une couche renderer-neutral testable séparément.
