# DataJoinExecutor

## Rôle

`DataJoinExecutor` matérialise un `DataJoinSpec` V1 sans modifier les deux collections source.

Il est volontairement DOM-free et indépendant de DataWiz, TableWiz, JSON Studio, DataResolver et DataValidator.

Le lot sépare deux responsabilités :

- `DataJoinSpec` décrit et diagnostique la relation ;
- `DataJoinExecutor` exécute cette relation.

## API

```js
import { DataJoinSpec } from '../../core/data-join-spec.js';
import { DataJoinExecutor, executeDataJoin } from '../../core/data-join-executor.js';

const spec = new DataJoinSpec({
  type: 'left',
  keys: [{ left: 'customerId', right: 'id' }],
  expectedCardinality: 'N:1',
  collision: { policy: 'nested' }
});

const result = executeDataJoin(orders, customers, spec);
```

`spec` peut être :

- une instance exposant `snapshot()` ;
- un snapshot normalisé de `DataJoinSpec` ;
- le payload sérialisé V1 `{ type:'nlab.data-join-spec', version:1, join:{...} }`.

## Types de jointure

Le moteur exécute tous les types déclarés par `DataJoinSpec` :

- `inner` ;
- `left` ;
- `right` ;
- `full` ;
- `left-semi` ;
- `left-anti` ;
- `right-semi` ;
- `right-anti`.

Les clés simples et composites utilisent les mêmes options de comparaison que `DataJoinSpec` : trim, casse, coercition `none|string|number`, blancs comme null et `nullMatchesNull`.

Une clé inutilisable est traitée comme non appariée. Elle peut donc apparaître dans une jointure externe ou anti, mais jamais créer une correspondance artificielle.

## Politiques de collision

### `nested`

Valeur par défaut et la plus sûre :

```js
{
  left:  { ...ligneGauche },
  right: { ...ligneDroite }
}
```

Une ligne absente vaut `null`.

### `suffix`

Les champs de même nom reçoivent `leftSuffix` / `rightSuffix`. Les champs non conflictuels gardent leur nom.

### `leftWins` / `rightWins`

Fusion plate des deux objets, avec priorité explicite au côté choisi.

### `error`

Toute collision de nom de champ sur une paire appariée provoque `JOIN_FIELD_COLLISION`.

## Résultat

```js
{
  rows: [...],
  provenance: [...],
  execution: {...},
  diagnostic: {...} | null
}
```

`provenance` est parallèle à `rows`. Chaque entrée contient :

```js
{
  leftIndex: 12 | null,
  rightIndex: 4 | null,
  kind: 'matched' | 'unmatched-left' | 'unmatched-right' |
        'matched-left' | 'matched-right'
}
```

`execution` contient notamment :

- type et politique de collision ;
- cardinalité attendue et observée ;
- nombre de lignes d'entrée/sortie ;
- nombre de paires appariées ;
- lignes appariées/non appariées par côté ;
- clés rejetées avec index et motif ;
- plafond d'exécution appliqué.

Si l'objet `spec` expose `diagnose()`, son diagnostic complet est aussi retourné dans `diagnostic`.

## Cardinalité stricte

Par défaut, une divergence entre cardinalité attendue et observée reste diagnostique.

```js
executor.execute(left, right, spec, {
  strictCardinality: true
});
```

Dans ce mode, un mismatch déclenche `CARDINALITY_MISMATCH` avant matérialisation des lignes.

Le contrôle fonctionne également à partir d'un simple snapshot : l'exécuteur recalcule la cardinalité observée à partir de ses index.

## Protection contre l'explosion de sortie

Le moteur calcule le nombre de lignes avant matérialisation.

Plafond par défaut : `250000` lignes.

```js
const executor = new DataJoinExecutor({
  maxOutputRows: 50000
});
```

Un dépassement déclenche `OUTPUT_LIMIT_EXCEEDED` avec `estimatedRows` et `maxOutputRows`.

Le plafond peut être réduit ponctuellement dans `execute(..., { maxOutputRows })`.

## Non-mutation et sécurité

- les collections d'entrée ne sont jamais modifiées ;
- les lignes produites sont clonées ;
- cycles et nombres non finis sont rejetés ;
- clés `__proto__`, `prototype`, `constructor` interdites ;
- chemins de jointure dangereux rejetés ;
- les semi/anti joins renvoient des clones de la ligne du côté sélectionné.

## Complexité

L'indexation est linéaire sur les deux collections, puis la matérialisation est proportionnelle au nombre de lignes réellement produit :

`O(left + right + output)`.

Le coût intrinsèque d'un `N:N` reste donc visible et est borné par `maxOutputRows`.

## Vérification

```bash
node dev/framework/tests/data-join-executor.test.mjs
```

Résultat attendu :

```text
data join executor tests: ok
```

Le test couvre les huit types de jointure, les quatre politiques de fusion, coercition, nulls, cardinalité stricte, limite d'explosion, non-mutation et chemins dangereux.
