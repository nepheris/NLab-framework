# DataJoinCompositeKeyMatcher

`DataJoinCompositeKeyMatcher` est la couche de suggestion **composite** au-dessus des candidats simples produits par `DataJoinKeyMatcher`.

Elle ne modifie ni `DataJoinKeyMatcher`, ni `DataJoinSpec`, ni les données sources. Son rôle est de transformer plusieurs paires de champs plausibles en propositions de clés composites, puis de faire évaluer ces propositions par un moteur injecté compatible avec `DataJoinSpec.diagnose()`.

## Pourquoi une brique séparée ?

Une bonne clé de jointure n'est pas toujours un seul champ. Exemple :

- gauche : `tenantId + customerId` ;
- droite : `tenantId + id`.

`customerId = id` peut être ambigu entre plusieurs tenants. La clé composite peut supprimer cette ambiguïté sans forcer l'interface graphique à inventer sa propre logique de combinaison.

La séparation conserve trois responsabilités distinctes :

1. `DataJoinKeyMatcher` propose des paires simples à partir des catalogues de champs ;
2. `DataJoinCompositeKeyMatcher` combine et classe plusieurs paires ;
3. `DataJoinSpec` reste la source de vérité pour le diagnostic réel d'une jointure donnée.

## Contrat

```js
const matcher = new DataJoinCompositeKeyMatcher({
  keyMatcher,
  evaluator,
  minComponents: 2,
  maxComponents: 3
});

const result = matcher.match(
  leftRows,
  rightRows,
  leftCatalog,
  rightCatalog,
  { leftSource, rightSource }
);
```

### Dépendances injectées

`keyMatcher` doit exposer :

```js
keyMatcher.match(leftCatalog, rightCatalog, context)
```

et retourner au minimum `{ candidates: [] }` dans le format `DataJoinKeyMatcher`.

`evaluator` reçoit :

```js
({ keys, comparison }, leftRows, rightRows) => diagnosis
```

`diagnosis` doit suivre la forme publique utile de `DataJoinSpec.diagnose()` : `rows`, `keys.matchedRows`, `observedCardinality`, `rejected`, `duplicates`, `warnings`.

## Adaptateur DataJoinSpec

Le helper `createDataJoinSpecCandidateEvaluator(DataJoinSpec)` construit un évaluateur sans introduire de dépendance statique dans la brique :

```js
import { DataJoinSpec } from './data-join-spec.js';
import { DataJoinKeyMatcher } from './data-join-key-matcher.js';
import {
  DataJoinCompositeKeyMatcher,
  createDataJoinSpecCandidateEvaluator
} from './data-join-composite-key-matcher.js';

const matcher = new DataJoinCompositeKeyMatcher({
  keyMatcher: new DataJoinKeyMatcher({ minScore: 25 }),
  evaluator: createDataJoinSpecCandidateEvaluator(DataJoinSpec)
});
```

L'adaptateur utilise volontairement une jointure `inner`, `expectedCardinality:'auto'`, `direction:'none'`, `precedence:'none'` et collision `nested` : l'objectif est de **mesurer la qualité de la clé**, pas de choisir le comportement métier final de la relation.

## Sortie candidat

Chaque proposition expose :

- `score` 0..100 ;
- `keys[]` directement compatibles avec `DataJoinSpec V1` ;
- `components[]` : résumé des candidats simples utilisés ;
- `comparisonHint.coerce` ;
- `observedCardinality` ;
- `coverage.left/right/average/minimum` ;
- `diagnostics` bornés à des statistiques agrégées ;
- `reasons[]` avec contribution chiffrée ;
- `warnings[]`.

Le score mélange :

- l'évidence des candidats simples ;
- la couverture réelle des lignes gauche/droite ;
- l'équilibre de cette couverture ;
- la cardinalité observée ;
- les lignes rejetées ;
- une petite pénalité de complexité au-delà de deux composantes.

Le score est une **aide au classement**, jamais une validation métier automatique.

## Garde-fou critique : coercition globale V1

`DataJoinSpec V1` possède une seule option :

```js
comparison.coerce = 'none' | 'string' | 'number'
```

Cette coercition s'applique à **toutes** les composantes de la clé. Le composite matcher ne prétend donc pas qu'on peut avoir, dans une même clé, une composante `coerce:number` et une autre `coerce:string`.

Ces combinaisons sont exclues et comptabilisées dans :

```js
result.considered.incompatibleCoercion
```

avec warning global `INCOMPATIBLE_COMPOSITE_COERCION`.

Une coercition `number` peut être propagée à une autre composante uniquement si cette composante était déjà strictement `number ↔ number`. Une coercition `string` peut être appliquée aux autres scalaires du candidat composite.

## Pas de réutilisation de champ

Une clé composite ne peut pas réutiliser le même chemin deux fois du même côté. Par exemple, les deux paires suivantes ne sont jamais combinées :

```text
customerId -> id
customerId -> legacyId
```

Le même principe s'applique côté droit.

## Exploration bornée

L'exploration combinatoire est volontairement limitée :

- `seedLimit` : nombre maximal de candidats simples de départ ;
- `minComponents` / `maxComponents` : 2..4 ;
- `maxCombinations` : nombre maximal de combinaisons générées ;
- `maxEvaluations` : nombre maximal d'appels au diagnostic ;
- `maxCandidates` : nombre maximal de propositions retournées.

Les limites sont signalées par :

- `COMBINATION_LIMIT_REACHED` ;
- `EVALUATION_LIMIT_REACHED`.

La stratégie parcourt d'abord les candidats simples les mieux classés ; en cas de coupure, les combinaisons les plus prometteuses sont donc évaluées en priorité.

## Warnings principaux

- `INCOMPATIBLE_COMPOSITE_COERCION` ;
- `MANY_TO_MANY_REMAINS` ;
- `LOW_COMPOSITE_COVERAGE` ;
- warnings remontés par le diagnostic DataJoinSpec ;
- warnings hérités des composants simples ;
- limites de combinaison/évaluation.

## Non-objectifs V1

La brique ne :

- crée pas ou ne modifie pas un `DataJoinSpec` métier ;
- n'applique aucune suggestion dans un `DataJoinWorkspace` ;
- ne choisit pas INNER / LEFT / RIGHT / FULL ;
- ne choisit pas la précédence ou la collision métier ;
- ne remplace pas le diagnostic `DataJoinSpec` ;
- ne fait aucun rendu DOM ;
- ne parcourt pas un espace de clés sans borne.

La future UI peut afficher les propositions, leurs raisons et leurs warnings, puis demander une sélection explicite avant de produire un `JoinSpec`.
