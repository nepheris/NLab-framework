# DataJoinKeyMatcher

## Rôle

`DataJoinKeyMatcher` propose des **candidats de clés de jointure** à partir de deux résultats `DataJoinFieldCatalog`.

Il ne modifie aucun `DataJoinSpec`, n'exécute aucune jointure et n'affirme jamais qu'une relation est correcte. Son résultat est une aide déterministe et explicable destinée à une UI, un CLI ou un audit.

La validation réelle reste le travail de `DataJoinSpec.diagnose()` puis de `DataJoinExecutor`.

## API

```js
import { DataJoinKeyMatcher } from '../../core/data-join-key-matcher.js';

const matcher = new DataJoinKeyMatcher({
  minScore: 35,
  maxCandidates: 20,
  uniqueThreshold: 0.95
});

const result = matcher.match(leftCatalog, rightCatalog, {
  leftSource:  { id:'orders', label:'Orders' },
  rightSource: { id:'customers', label:'Customers' }
});
```

Raccourci :

```js
matchDataJoinKeys(leftCatalog, rightCatalog, context, options);
```

Seuls les champs `joinable:true` avec un `specPath` non vide sont considérés.

## Sortie

```js
{
  candidates: [...],
  considered: {
    left: 4,
    right: 3,
    pairs: 12
  },
  settings: {
    minScore: 35,
    maxCandidates: 20,
    uniqueThreshold: 0.95
  },
  warnings: [...]
}
```

### Candidat

```js
{
  score: 86,
  left: {
    pointer: '/customerId',
    specPath: 'customerId',
    name: 'customerId',
    type: 'string',
    types: ['string'],
    present: 100,
    missing: 0,
    nulls: 0,
    distinct: 20,
    completeness: 1,
    uniqueness: 0.2
  },
  right: {
    pointer: '/id',
    specPath: 'id',
    name: 'id',
    type: 'string',
    types: ['string'],
    present: 20,
    missing: 0,
    nulls: 0,
    distinct: 20,
    completeness: 1,
    uniqueness: 1
  },
  expectedCardinality: 'N:1',
  comparisonHint: { coerce:'none' },
  reasons: [...],
  warnings: []
}
```

## Score explicable

Le score est borné entre `0` et `100`. Chaque contribution apparaît dans `reasons[]` sous la forme :

```js
{
  code: 'EXACT_LEAF_NAME',
  weight: 42,
  message: 'Same normalized field name: sku'
}
```

Le moteur utilise actuellement les signaux suivants.

### Relation de nom de type clé étrangère

Exemple :

```text
Orders.customerId ↔ Customers.id
```

Si le nom d'une source permet de reconnaître un préfixe `<entity>Id`, ce signal reçoit un poids fort `FOREIGN_KEY_NAME`.

Il est volontairement plus fort qu'un simple `id ↔ id` entre deux sources de noms différents, car les identifiants primaires de deux entités différentes sont fréquemment sans rapport.

Cette règle reste une heuristique : elle ne prouve aucune correspondance de valeurs.

### Nom et chemin

- même nom de feuille normalisé : `EXACT_LEAF_NAME` ;
- même chemin normalisé : `EXACT_PATH` ;
- `id ↔ id` entre deux entités nommées différemment reçoit une petite pénalité `GENERIC_ID_CROSS_ENTITY`.

La normalisation :

- décompose le camelCase ;
- ignore espaces, `_`, `-` et ponctuation ;
- ignore la casse ;
- retire les diacritiques Unicode ;
- applique une singularisation très prudente du nom de source uniquement pour reconnaître des patterns de clé étrangère.

## Compatibilité de type

Signaux :

- type scalaire unique identique : bonus fort ;
- ensembles de types observés qui se recouvrent : bonus ;
- `number ↔ string` : candidat possible avec petit bonus et warning `COERCION_REQUIRED` ;
- autres types scalaires incompatibles : pénalité et `TYPE_MISMATCH`.

Pour `number ↔ string`, `comparisonHint.coerce` vaut :

- `number` si les quelques exemples string disponibles sont tous convertibles en nombres finis ;
- sinon `string`.

Ce hint ne modifie jamais le `DataJoinSpec`.

## Complétude

Le ratio utilisé est :

```text
(present - nulls) / (present + missing)
```

- les deux côtés à au moins 95 % donnent un petit bonus `HIGH_COMPLETENESS` ;
- un côté sous 50 % reçoit une pénalité et `SPARSE_KEY`.

## Unicité et cardinalité probable

Le ratio d'unicité observé est :

```text
distinct / (present - nulls)
```

Avec `uniqueThreshold=0.95` :

- gauche unique + droite unique → `1:1` ;
- gauche unique + droite non unique → `1:N` ;
- gauche non unique + droite unique → `N:1` ;
- aucune unique → `N:N` + warning `MANY_TO_MANY_LIKELY` ;
- pas assez de valeurs non nulles → `unknown`.

Il s'agit d'une estimation sur le profil échantillonné, pas d'une contrainte de base de données déclarée.

## Échantillonnage

Si un catalogue indique `rows.total > rows.sampled`, le résultat global contient :

```js
{
  code: 'SAMPLED_PROFILE',
  side: 'left',
  message: 'left catalog is based on 100 of 1000 rows'
}
```

L'UI peut ainsi distinguer une recommandation calculée sur l'ensemble des lignes d'une recommandation calculée sur échantillon.

## Ce que le matcher ne fait pas

V1 ne :

- compare pas l'ensemble réel des valeurs gauche/droite ;
- ne calcule pas de taux de match ;
- ne propose pas de clé composite ;
- ne choisit pas de type `INNER/LEFT/...` ;
- ne modifie pas `DataJoinSpec` ;
- ne lance pas automatiquement une jointure.

Les exemples du catalogue sont uniquement un indice pour le hint de coercition number/string. Ils ne sont pas utilisés comme preuve d'overlap.

## Ordre déterministe

Les candidats sont triés par :

1. score décroissant ;
2. `left.specPath` ;
3. `right.specPath`.

Puis la liste est bornée à `maxCandidates`.

Cette règle rend le résultat stable pour les tests et pour l'UI.

## Séquence recommandée côté UI

```text
DataJoinFieldCatalog gauche
             +
DataJoinFieldCatalog droite
             │
             ▼
     DataJoinKeyMatcher
             │
       suggestions
             │
      sélection HUMAN
             │
             ▼
       DataJoinSpec
             │
          diagnose()
             │
             ▼
     DataJoinExecutor
```

Une UI peut pré-sélectionner visuellement le meilleur candidat, mais ne doit pas l'appliquer silencieusement comme relation validée.

## Vérification

```bash
node dev/framework/tests/data-join-key-matcher.test.mjs
```

Couverture : clé étrangère nominale, nom/path identique, `id ↔ id` inter-entités, types identiques, coercition number/string, mismatch, sparse, cardinalités probables, profil échantillonné, filtrage joinable, limites, stabilité et non-mutation.
