# DataWiz Plotly Adapter

`DataWizPlotlyAdapter` est le premier compilateur renderer concret de la chaîne DataWiz. Il ne charge pas Plotly.js et n'accède pas au DOM : il traduit un `DataWizChartSpec` déjà validé et un payload `DataWizChartDataMaterializer` en plan Plotly JSON `{ data, layout, config }`.

## Position

`DatasetProfile → ChartRecommender → ChartSpec → ChartDataMaterializer → PlotlyAdapter → {data, layout, config} → runtime Plotly.js`

Les transformations de données restent donc hors de l'adapter.

## Runtime

Le runtime Plotly.js est externe : `runtimeBundled:false`. L'adapter vise la forme d'API Plotly.js 3.x vérifiée lors du développement du contrat V1 et ne fait aucun appel `Plotly.newPlot()`/`Plotly.react()` lui-même.

Une couche UI pourra ultérieurement choisir la version du runtime, charger Plotly.js puis transmettre le plan généré.

## Capabilities V1

Marks compilés :

- `bar` ;
- `line` ;
- `area` ;
- `point` ;
- `scatter` ;
- `histogram` ;
- `box` ;
- `radar`.

`heatmap` et `violin` ne sont pas déclarés tant que leur compilation n'est pas testée. Un ChartSpec utilisant ces marks est donc bloqué par `DataWizRendererAdapter` avant le compilateur.

Canaux déclarés : `x`, `y`, `color`, `size`, `detail`, `theta`, `radius`.

Les facets `facet/row/column` ne font pas partie du V1.

## Compilation des marks

### Bar

Produit des traces Plotly `bar`. Un `color` nominal/ordinal sépare les données en traces. L'orientation `horizontal` échange les tableaux x/y et les titres d'axes afin de respecter la convention Plotly des barres horizontales.

`stack:zero` devient `layout.barmode='stack'`. `stack:normalize` ajoute `layout.barnorm='percent'`.

### Line / Area

Produit des traces `scatter` en mode `lines`.

Une area non empilée utilise `fill:'tozeroy'`. Les areas empilées utilisent `stackgroup`; le mode normalisé ajoute `groupnorm:'percent'`.

### Point / Scatter

Produit `scatter` en mode `markers`.

- `size` devient `marker.size` ;
- `color` quantitatif devient `marker.color` + `showscale:true` ;
- `color` nominal/ordinal crée des traces séparées.

### Box

Produit une trace Plotly `box` (ou plusieurs si `color` est catégoriel) à partir des valeurs raw matérialisées.

### Histogram

Le Materializer a déjà calculé les bins. L'adapter produit donc une trace `bar` avec :

- x = centres des bins ;
- y = fréquences `metrics.count` ;
- width = largeur des bins si disponible ;
- customdata = indices source + bornes du bin.

Le runtime Plotly ne rebine pas les données.

### Radar

Produit `scatterpolar` avec `theta`, `r`, `mode:'lines+markers'` et `fill:'toself'`.

## Présentation et interactions

Le plan utilise :

- `layout.title.text` et `layout.title.subtitle.text` ;
- titres x/y issus des encodages ;
- `showlegend` ;
- `layout.dragmode='select'` si demandé ;
- `config.responsive=true` ;
- `config.displaylogo=false` ;
- `config.scrollZoom` selon l'interaction zoom.

Si `tooltip=false`, les traces portent `hoverinfo:'skip'`.

## Provenance

Chaque trace reçoit `customdata` dérivé de `ChartData.provenance.sourceIndexes`. La provenance reste disponible pour de futurs événements de hover/clic/sélection sans remonter aux lignes par heuristique.

## API

### Factory

```js
const adapter = createDataWizPlotlyAdapter();
```

Le résultat est un `DataWizRendererAdapter` standard. Il expose donc `assess()`, `supports()` et `compile()`.

### Compilation pure

```js
const plan = compileDataWizPlotlyPlan(chartPayload, chartData);
```

Cette fonction est exportée pour les tests et pour les usages où l'assessment a déjà été réalisé.

## Garde-fous

- payload ChartSpec V1 requis ;
- payload ChartData V1 requis ;
- mark ChartSpec/ChartData identique ;
- histogramme exige `mode:'histogram'` ;
- mark hors capabilities explicitement refusé ;
- sortie strictement JSON-safe et copiée défensivement ;
- aucun import Plotly, aucune fonction, aucun nœud DOM dans le plan.
