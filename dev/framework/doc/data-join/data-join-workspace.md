# DataJoinWorkspace

## Rôle

`DataJoinWorkspace` est le modèle DOM-free qui relie l’éditeur graphique futur aux deux briques de jointure déjà intégrées :

- `DataJoinSpec` décrit les clés, le type de jointure, la cardinalité, la comparaison et les collisions ;
- `DataJoinExecutor` diagnostique/matérialise la jointure sans modifier les sources ;
- `DataJoinWorkspace` conserve la **configuration de travail** : quelles sont les deux sources, où se trouve leur collection de lignes et quel `DataJoinSpec` est actif.

Le nom reste volontairement neutre. Il ne préjuge pas de la décision d’architecture encore en revue sur un futur `RelationGraph` / `RelationEngine`.

## Contrat V1

Type sérialisé :

```text
nlab.data-join-workspace
```

Version : `1`.

Un workspace contient deux descripteurs : `left` et `right`.

```js
{
  id: 'orders',
  label: 'Orders',
  kind: 'json',
  rootPath: '/orders',
  metadata: { file: 'orders.json' }
}
```

- `id` : identifiant stable obligatoire ;
- `label` : libellé d’interface, repli sur `id` ;
- `kind` : nature/adapter logique, `json` par défaut ;
- `rootPath` : JSON Pointer de la collection choisie dans la source, chaîne vide pour la racine ;
- `metadata` : métadonnées JSON-like optionnelles.

`rootPath` décrit la sélection. Le workspace **n’extrait pas lui-même** la collection d’un document hiérarchique : l’adapter/UI charge le document, sélectionne la collection puis la lie au workspace avec `bind()`.

## Configuration et binding runtime

```js
import { DataJoinWorkspace } from '../../core/data-join-workspace.js';

const workspace = new DataJoinWorkspace({
  sources: {
    left:  { id:'orders', rootPath:'/orders' },
    right: { id:'customers', rootPath:'/customers' }
  },
  join: {
    type: 'left',
    keys: [{ left:'customerId', right:'id' }],
    expectedCardinality: 'N:1'
  }
});

workspace.bind('left', orders, { sourceId:'orders' });
workspace.bind('right', customers, { sourceId:'customers' });
```

Les tableaux passés à `bind()` sont des **bindings runtime**. Ils ne sont jamais ajoutés au snapshot ni au JSON sérialisé.

Le contrôle facultatif `sourceId` permet à un loader de vérifier qu’il rattache bien le dataset attendu après rechargement d’un workspace.

Changer le `label` ou les métadonnées d’une source conserve son binding. Changer son `id`, son `kind` ou son `rootPath` invalide le binding afin d’éviter d’exécuter une relation sur une collection devenue différente.

## État de préparation

```js
workspace.status();
```

Retour :

```js
{
  ready: true,
  left: {
    configured: true,
    bound: true,
    id: 'orders',
    label: 'Orders',
    kind: 'json',
    rootPath: '/orders',
    rows: 120
  },
  right: { /* même contrat */ },
  joinConfigured: true,
  joinType: 'left'
}
```

Un workspace est `ready` seulement lorsque :

1. les deux descripteurs de source sont configurés ;
2. les deux collections runtime sont liées — une collection vide est un binding valide ;
3. un `DataJoinSpec` est configuré.

`diagnose()` et `execute()` refusent un workspace incomplet avec `WORKSPACE_NOT_READY`.

## Jointure

`setJoin()` accepte :

- une instance `DataJoinSpec` ;
- un snapshot du spec ;
- un payload V1 `{type:'nlab.data-join-spec', version:1, join:{...}}` ;
- la chaîne JSON de ce payload.

```js
workspace.setJoin(spec);
workspace.updateJoin({ type:'inner' });
workspace.clearJoin();
```

Le workspace ne réimplémente aucune sémantique de jointure.

## Diagnostic et exécution

```js
const diagnostic = workspace.diagnose();
const result = workspace.execute({
  strictCardinality: true,
  maxOutputRows: 50000
});
```

`diagnose()` délègue au `DataJoinSpec` courant.

`execute()` délègue au `DataJoinExecutor` courant et conserve son résultat : `rows`, `provenance`, `execution`, `diagnostic`. Il ajoute seulement :

```js
workspace: {
  leftSourceId,
  rightSourceId,
  joinType
}
```

Cela permet à une UI, un export ou un audit de rattacher le résultat aux deux sources sans dupliquer les datasets.

## Sérialisation sans données

```js
const json = workspace.serialize();
```

Exemple de payload :

```json
{
  "type": "nlab.data-join-workspace",
  "version": 1,
  "sources": {
    "left": {
      "id": "orders",
      "label": "Orders",
      "kind": "json",
      "rootPath": "/orders",
      "metadata": {}
    },
    "right": {
      "id": "customers",
      "label": "Customers",
      "kind": "json",
      "rootPath": "/customers",
      "metadata": {}
    }
  },
  "join": {
    "type": "nlab.data-join-spec",
    "version": 1,
    "join": {
      "type": "left",
      "keys": [{ "left":"customerId", "right":"id", "label":"" }]
    }
  }
}
```

Les lignes de `orders` et `customers` ne figurent pas dans ce payload.

Après :

```js
const restored = DataJoinWorkspace.parse(json);
```

les descripteurs et le `DataJoinSpec` sont restaurés, mais `status().ready === false` tant que les deux collections n’ont pas été reliées explicitement par `bind()`.

## Sécurité / robustesse

- snapshot et descripteurs clonés défensivement ;
- cycles et nombres non finis interdits dans la configuration ;
- clés `__proto__`, `prototype`, `constructor` rejetées ;
- `rootPath` validé comme JSON Pointer ;
- `sourceId` peut protéger le rebind ;
- les datasets runtime ne sont ni copiés dans la configuration ni sérialisés ;
- aucune dépendance DOM, stockage, TableWiz, JSON Studio ou DataWiz.

## Pourquoi pas `swap()` en V1

L’inversion gauche/droite n’est pas une simple permutation visuelle : elle doit inverser les clés, les jointures `left/right`, les semi/anti joins, les cardinalités `1:N/N:1`, la direction et potentiellement la précédence.

V1 n’expose donc pas de `swap()` partiel ou ambigu. Cette opération pourra être ajoutée plus tard comme transformation atomique testée du `DataJoinSpec`.

## Préparation de l’éditeur graphique

Ce contrat permet à une future UI à deux arbres de :

1. charger deux documents ;
2. sélectionner une collection dans chacun (`rootPath`) ;
3. binder les lignes correspondantes ;
4. construire les couples de clés dans `DataJoinSpec` ;
5. afficher `diagnose()` avant exécution ;
6. exécuter puis inspecter `rows + provenance` ;
7. sauvegarder la configuration sans sauvegarder les données source.

La couche visuelle reste un lot séparé : elle pourra changer sans modifier le moteur de jointure ni le format du workspace.

## Vérification

```bash
node dev/framework/tests/data-join-workspace.test.mjs
```

Couverture : configuration/binding, statut, diagnostic/exécution délégués, non-sérialisation des datasets, parse/rebind, contrôle `sourceId`, invalidation de binding, mise à jour atomique du JoinSpec, JSON Pointer et configuration hostile.
