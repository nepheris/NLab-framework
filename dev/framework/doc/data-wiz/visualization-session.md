# DataWizVisualizationSession

`DataWizVisualizationSession` orchestre les briques de visualisation DataWiz sans créer de nouvelle logique analytique ou de rendu.

## Pipeline

`rows runtime → DatasetProfile → ChartRecommender → choix explicite ChartSpec → ChartDataMaterializer → RendererAdapter.assess/compile`

La session ne rend rien et ne connaît aucun DOM.

## Principe : aucun choix implicite

`recommend()` calcule et mémorise un classement, mais laisse toujours :

```text
autoSelected = false
selected = false
```

jusqu'à l'appel explicite de `selectRecommendation(id)` ou `setChart(chartSpec)`.

Le premier score n'est donc jamais appliqué automatiquement.

## Lignes runtime-only

`bindRows(rows)` conserve les lignes uniquement pour les opérations runtime. Les lignes ne sont jamais incluses dans `snapshot()` ou `serialize()`.

Un rebind :

- incrémente `dataRevision` ;
- invalide profil, recommandations, sélection et ChartData ;
- invalide le résumé du dernier compile.

`unbindRows()` applique la même invalidation.

## Profil et recommandations

`profile(options)` appelle `DataWizDatasetProfile.fromRows()` via une factory injectable. Un nouveau profil invalide les recommandations et toute sélection précédente.

`recommend(options)` consomme le profil courant. Une sélection issue d'une recommandation reste valide seulement si son identifiant existe encore après un refresh du classement ; sinon elle est supprimée.

`refresh()` enchaîne uniquement profil + recommandations. Il ne sélectionne rien.

## Sélection

Deux origines sont distinguées :

- `recommendation` : sélection par `selectRecommendation(id)` ;
- `manual` : ChartSpec fourni par `setChart()`.

Une recommandation est revalidée contre le profil courant avant adoption. Un ChartSpec manuel peut rester un état d'édition : la matérialisation ou l'adapter effectueront leurs validations normales avant exécution.

## Matérialisation et cache runtime

`materialize()` appelle `DataWizChartDataMaterializer` avec les rows et le ChartSpec sélectionné.

Le résultat ChartData est conservé uniquement en mémoire. Le cache est identifié par :

- `dataRevision` ;
- `selectionRevision`.

Une seconde compilation du même état peut donc réutiliser le ChartData, sans recalculer les transformations. Tout rebind ou changement de ChartSpec l'invalide.

## RendererAdapter

`assess(adapter)` demande uniquement la compatibilité du ChartSpec courant.

`compile(adapter, { context })` :

1. exige une sélection ;
2. matérialise si le cache n'est pas valide ;
3. injecte le ChartData autoritatif dans le contexte ;
4. appelle `adapter.compile()` avec le profil courant ;
5. retourne le résultat sans persister le plan compilé.

Un `context.chartData` fourni par l'appelant est remplacé par le ChartData de la session.

## Snapshot minimal

Le snapshot versionné contient seulement :

- source ;
- status de pipeline ;
- résumé `profile.explain()` ;
- résumé des recommandations (id/rank/rule/score/reason/codes de warnings) ;
- sélection et payload ChartSpec.

Il ne contient pas :

- rows ;
- profil complet avec exemples ;
- payload ChartData ;
- plan renderer compilé.

La sérialisation sert donc à l'inspection/diagnostic de session, pas à reconstituer les données source.

## Dépendances injectables

Le constructeur accepte des dépendances de test ou d'intégration :

- `profileFactory(rows, options)` ;
- `recommender.recommend(profile, options)` ;
- `materializer.materialize(rows, chart, options)`.

Les defaults utilisent les briques DataWiz canoniques. Les renderers restent injectés par appel : la session n'a pas de renderer par défaut et ne dépend pas de Plotly.
