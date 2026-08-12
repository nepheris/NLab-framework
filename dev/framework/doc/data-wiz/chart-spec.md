# DataWizChartSpec

`DataWizChartSpec` est la grammaire de visualisation **renderer-independent** de DataWiz. Elle décrit l'intention analytique d'un graphique sans produire de `trace`, `layout`, `series`, option ECharts ou autre structure spécifique à une librairie.

## Position

Chaîne cible :

`source → DatasetProfile → ChartSpec → RendererAdapter`

Le lot suivant pourra construire des recommandations explicables `DatasetProfile → ChartSpec`. Les adapters Plotly/ECharts/Vega resteront séparés.

## Contrat V1

Un ChartSpec contient :

- `id`, `label` ;
- `mark` ;
- descripteur `source` ;
- `encodings` par canal ;
- `presentation` générique ;
- `metadata` JSON-safe.

### Marks

`bar | line | area | point | scatter | histogram | box | violin | heatmap | radar`

### Canaux

`x | y | color | size | detail | facet | row | column | theta | radius`

Chaque encodage accepte :

- `field` ;
- `type: auto | quantitative | nominal | ordinal | temporal` ;
- `aggregate: none | count | distinct | sum | mean | median | min | max` ;
- `bin: false | true | {maxBins}` ;
- `timeUnit` ;
- `title` ;
- `sort: none | asc | desc`.

`aggregate=count` peut omettre `field`.

### Présentation générique

- titre/sous-titre ;
- orientation `auto/vertical/horizontal` ;
- stack `none/zero/normalize/center` ;
- legend `auto/show/hide` ;
- interactions abstraites `tooltip/zoom/select`.

Aucun champ `renderer`, `trace`, `layout`, `series`, `plotly`, etc. n'est accepté : les clés inconnues sont rejetées afin d'éviter que le contrat sédimente une API de renderer.

## Validation

`spec.validate(profile?)` produit :

```js
{ valid, gate: 'ready'|'warning'|'blocked', messages: [...] }
```

La validation structurelle est stricte à la construction. La validation sémantique reste explicable et non destructive.

Sans profil, elle contrôle notamment les canaux nécessaires au mark :

- line/area/scatter : `x + y` ;
- histogram : `x` avec binning ;
- box/violin : `y` ;
- heatmap : `x + y` ;
- radar : `theta + radius`.

Avec `DataWizDatasetProfile`, elle ajoute :

- champ absent ;
- champ non adressable par `specPath` ;
- incompatibilité quantitative/temporelle ;
- agrégat numérique sur champ non numérique ;
- binning non numérique ;
- `timeUnit` non temporel ;
- identifiant utilisé comme dimension visuelle ;
- forte cardinalité catégorielle ;
- profil échantillonné.

Le validateur **ne remplace jamais** le choix utilisateur par un autre mark ou encodage. Le moteur de recommandation sera un composant séparé.

## API

- `snapshot()` ;
- `update(patch)` atomique ;
- `setEncoding(channel, encoding)` ;
- `removeEncoding(channel)` ;
- `reset()` ;
- `validate(profile?)` ;
- `explain(profile?)` ;
- `serialize()` / `parse()`.

## Exemples

### Série temporelle

```js
new DataWizChartSpec({
  mark: 'line',
  encodings: {
    x: { field: 'createdAt', type: 'temporal' },
    y: { field: 'revenue', type: 'quantitative', aggregate: 'sum' }
  }
});
```

### Fréquence par catégorie

```js
new DataWizChartSpec({
  mark: 'bar',
  encodings: {
    x: { field: 'category', type: 'nominal' },
    y: { aggregate: 'count', type: 'quantitative' }
  }
});
```

### Histogramme

```js
new DataWizChartSpec({
  mark: 'histogram',
  encodings: {
    x: { field: 'price', type: 'quantitative', bin: { maxBins: 20 } }
  }
});
```

## Séparation des responsabilités

`DatasetProfile` décrit les données. `ChartSpec` décrit une intention de visualisation. Un futur `ChartRecommender` propose des ChartSpec avec score/raison/warnings. Un `RendererAdapter` transforme ensuite un ChartSpec validé en configuration Plotly/ECharts/Vega.

Cette séparation évite de coupler DataWiz à Plotly et permet de benchmarker Perspective ou d'autres moteurs sans changer la grammaire métier.
