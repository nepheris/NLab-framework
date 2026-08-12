# JSON Studio — contrat industrialisé

## Objectif

`JsonStudio` est l’éditeur générique des données JSON du framework. Il orchestre les vues Raw, Table, Tree et Form sans dupliquer les responsabilités de `TableWiz`, `DataValidator` ou `DataResolver`.

Le composant reste indépendant du métier et conserve les données brutes comme source éditable. Les données résolues et les valeurs d’affichage sont produites séparément.

## Périmètre Agent A

- `dev/framework/wiz/json-studio.js`
- `dev/framework/tests/json-studio*.mjs`
- `dev/framework/doc/json-studio/*.md`

`TableWiz` est explicitement hors scope : la branche JSON Studio conserve uniquement le contrat minimal `table.render(container, rows)` tant que la PR TableWiz #33 n’est pas intégrée.

## J1 — noyau sûr, historique et diff

### Chemins

Les opérations `get`, `set` et `unset` acceptent des chemins pointés et les chemins tableaux.

Les segments suivants sont rejetés avant toute lecture ou mutation :

- `__proto__`
- `prototype`
- `constructor`

L’objectif est d’empêcher les écritures sensibles au prototype.

### Mutations

API principale :

- `setData()`
- `set()`
- `unset()`
- `transaction()`
- `add()`
- `remove()`
- `move()`

`transaction()` travaille sur une copie et ne publie le nouvel état qu’après le retour du mutateur. Les transactions asynchrones sont refusées explicitement afin de ne pas créer un état partiellement publié.

Les opérations sur tableaux valident le chemin et les index.

### Raw

`importRaw()` parse d’abord le texte. Un JSON invalide :

- ne modifie pas les données courantes ;
- renseigne `lastError` avec `INVALID_JSON`.

### Historique

- `historyLimit`
- `historyState()`
- `undo()`
- `redo()`
- `clearHistory()`
- `markOriginal()`
- `resetToOriginal()`

Une nouvelle mutation après undo invalide la pile redo.

### Diff

`diff()` retourne des changements structurés :

- `added`
- `removed`
- `changed`

Chaque changement expose `path`, `before`, `after`.

## J2 — rendu DOM sûr

Les vues `raw`, `tree` et `form` construisent leurs nœuds via `document.createElement()` et `textContent`.

Aucune clé ni valeur JSON n’est injectée avec `innerHTML`.

### Raw

Le textarea marque `aria-invalid=true` sur JSON invalide et conserve les données précédentes.

### Tree

- arbre `details/summary` ;
- profondeur initiale limitée ;
- tout déplier / tout replier ;
- curseur de profondeur.

### Form

- booléens via `select` ;
- nombres via input number et validation avant commit ;
- texte long via textarea ;
- ajout d’item pour les tableaux ;
- chaque édition passe par les mutations historisées du studio.

### Table

La vue Table délègue toujours au composant injecté :

```js
table.render(container, rows)
```

Aucune fonctionnalité TableWiz n’est recodée dans JSON Studio.

## J3 — validation du buffer et relations multiples

### Validation

Le `DataValidator` courant sait valider explicitement un record avec :

```js
validateRecord(collectionName, record, { recordIndex })
```

mais `validateCollection(collectionName)` recharge la collection depuis son provider.

JSON Studio doit valider **le buffer en cours d’édition**. Pour une collection en mémoire :

1. chaque record du buffer est envoyé à `validateRecord()` ;
2. les issues sont agrégées ;
3. `errors`, `warnings`, `checked` et `valid` sont recalculés ;
4. `validateCollection()` n’est pas utilisé silencieusement pour un buffer local.

Une future méthode explicite `validateCollectionData()` reste supportée si un validateur l’expose.

### Résolution

`resolved({ collection })` consomme le contrat existant :

```js
DataResolver.resolveRecord(collectionName, record)
```

La sortie attendue reste :

```js
{
  data,
  resolved,
  issues
}
```

Les cardinalités `one` et `many` restent la responsabilité de DataResolver.

### Mapping d’affichage

JSON Studio ajoute une couche **non destructive** :

- `displayResolvedValue(raw, resolved, mapping)`
- `mapResolvedRecord(resolution, { mappings })`
- `resolvedDisplay(context, { mappings })`

La donnée brute n’est pas remplacée. Le résultat contient un objet `display` séparé.

Exemple :

```js
const result = await studio.resolvedDisplay(
  { collection: 'recipes' },
  {
    mappings: {
      category_id: {
        mode: 'id+label',
        labelField: 'name'
      },
      tag_ids: {
        mode: 'label',
        labelField: 'label'
      }
    }
  }
);
```

Modes :

- `label`
- `id`
- `id+label`
- `object`

Options :

- `idField` — défaut `id` ;
- `labelField` — champ lisible prioritaire ;
- `labelFields` — liste de fallbacks ;
- `separator` — séparateur de `id+label`, défaut ` — `.

Sans champ de label explicite, l’ordre de fallback est :

1. `label`
2. `name`
3. `title`
4. `id`
5. valeur brute

Une relation `many` produit une liste de valeurs d’affichage. Un élément non résolu conserve son identifiant brut à la même position.

Cette couche répond au besoin de représentation lisible sans transformer les références métier dans le JSON source.

## Erreurs structurées principales

- `UNSAFE_PATH`
- `INVALID_PATH`
- `NOT_AN_ARRAY`
- `INVALID_ARRAY_INDEX`
- `ASYNC_TRANSACTION_UNSUPPORTED`
- `INVALID_JSON`
- `RESOLVER_CONTRACT_REQUIRED`
- `SAVE_ADAPTER_REQUIRED`

## Tests

### Exécutés localement avant publication J1/J2

- `json studio core tests: ok`
- `json studio DOM tests: ok`

### Tests présents dans la branche

`dev/framework/tests/json-studio-core.test.mjs` couvre notamment :

- historique / undo / redo ;
- limites d’historique ;
- paths sûrs ;
- mutations de tableaux ;
- import Raw transactionnel ;
- diff ;
- DOM Tree/Form/Raw sûr ;
- délégation Table.

`dev/framework/tests/json-studio-relations.test.mjs` couvre :

- validation de chaque record du buffer ;
- interdiction implicite de relire le provider via `validateCollection()` ;
- agrégation errors/warnings ;
- résolution one/many ;
- modes label/id/id+label/object ;
- mapping de champ imbriqué ;
- fallback d’un élément many non résolu ;
- absence de mutation de la donnée brute ;
- erreur explicite si le resolver ne respecte pas `resolveRecord()`.

### Limite d’exécution actuelle

Au checkpoint J3, le runtime de l’agent ne peut pas résoudre `github.com` (`Could not resolve host: github.com`). Le test J3 est donc versionné mais ne doit pas être présenté comme exécuté depuis un clone réel tant qu’un runner GitHub ou un runtime réseau n’a pas été utilisé.

## Critères de sortie avant intégration

1. diff strictement limité au scope JSON Studio ;
2. aucun changement TableWiz / DataValidator / DataResolver ;
3. suite JSON Studio verte sur un environnement capable d’exécuter la branche ;
4. non-régression du test DataUX/JsonStudio ;
5. revue du mapping d’affichage avant de lui ajouter une convention métier plus spécialisée.
