# DataWizRendererAdapter

`DataWizRendererAdapter` définit la frontière entre `DataWizChartSpec` et une implémentation de rendu concrète.

La version 1 reste DOM-free et n'importe aucune bibliothèque graphique. Un adapter Plotly, ECharts ou autre reste un lot séparé.

## Chaîne

`DatasetProfile → ChartRecommender → ChartSpec → RendererAdapter.assess() → RendererAdapter.compile() → renderer concret`

L'assessment précède toujours la compilation.

## Contrat sérialisable

Le contrat contient un descripteur `id / label / version / metadata` et des capabilities explicites :

- marks ;
- channels ;
- aggregates ;
- timeUnits ;
- stackModes ;
- orientations ;
- legendModes ;
- binning ;
- interactions `tooltip / zoom / select` ;
- maxEncodings.

La fonction de compilation est injectée séparément et n'est jamais sérialisée.

## Assessment

`assess(chartSpec, { profile })` retourne :

- `gate: ready | warning | blocked` ;
- `ready` ;
- `compileAllowed` ;
- la validation ChartSpec ;
- les messages de compatibilité de l'adapter.

Les incompatibilités de mark, channel, aggregate, timeUnit, binning, stack, orientation ou limite d'encodages sont bloquantes.

Les limitations de légende ou d'interaction sont des dégradations non bloquantes : le graphique reste représentable, mais certaines fonctions demandées ne seront pas garanties.

Une validation ChartSpec déjà bloquée bloque aussi l'adapter, même si les capabilities techniques accepteraient le mark.

## Compilation injectée

`compile()` normalise d'abord le ChartSpec, lance l'assessment, refuse un gate bloqué, clone le contexte transmis au compilateur, puis exige un résultat synchrone et JSON-safe.

Le contexte et le résultat sont copiés défensivement. Les cycles, valeurs non finies et clés dangereuses sont rejetés par le contrat.

La version 1 refuse les compilateurs asynchrones. Une évolution éventuelle devra passer par une version de contrat distincte.

## Intérêt de la séparation

Le découplage capabilities / compilation permet :

- d'expliquer dans une future UI pourquoi un renderer ne peut pas rendre un ChartSpec ;
- de comparer plusieurs renderers avant compilation ;
- de tester les capabilities sans charger une bibliothèque graphique ;
- de remplacer un compilateur sans modifier ChartSpec ;
- de conserver DatasetProfile et ChartRecommender indépendants du renderer.

## Suite logique

Un adapter Plotly concret pourra déclarer ses capabilities et traduire un ChartSpec vers un plan Plotly sans modifier la grammaire métier. Les tests de conformité pourront alors vérifier l'adapter contre ce contrat avant toute intégration visuelle.
