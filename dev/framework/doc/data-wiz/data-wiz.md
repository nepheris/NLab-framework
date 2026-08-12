# DataWiz — convergence D1

## Rôle

`DataWiz` est un moteur DOM-free de description et d’agrégation légère. Il complète TableWiz sans prendre en charge le rendu, l’édition, le tri de table ou l’export.

Le contrat historique est conservé :

- `describe(items, fields)` retourne `{ rows, fields }` et garde `count`, `missing`, `unique`, `top`, `numeric.min/max/mean/sum` ;
- `groupBy(items, field)` retourne des groupes `{ value, count, rows }` ;
- `histogram(items, field, { bins })` retourne des bins `{ min, max, count }`.

## Chemins de champs

Les trois opérations acceptent des chemins imbriqués comme `meta.score`.

Les segments `__proto__`, `prototype` et `constructor` sont refusés avec `error.code = 'UNSAFE_PATH'`.

## `describe()`

En plus du contrat historique, chaque champ expose :

- `types` : nombre de valeurs par type JS ;
- `numeric.count` : nombre de valeurs réellement numériques ;
- `numeric.median` : médiane des valeurs numériques.

### Sémantique numérique

Sont numériques :

- nombres finis ;
- chaînes non vides convertibles en nombre fini.

Ne sont pas convertis implicitement : booléens, objets, tableaux, chaîne vide, `null`, `undefined`, `NaN`, infinities.

Cela évite notamment que `false` soit compté comme `0`.

### `top`

Le classement est déterministe : fréquence décroissante, puis ordre de première apparition en cas d’égalité.

Les identités sont typées : le nombre `1` et la chaîne `'1'` restent deux valeurs distinctes.

## `groupBy()`

```js
wiz.groupBy(items, 'category', {
  emptyLabel: '(vide)',
  sort: 'input'
});
```

- un tableau de valeurs crée un groupe par valeur ;
- un tableau vide, `null`, `undefined` ou chaîne vide rejoint le groupe vide ;
- `sort: 'input'` conserve l’ordre de découverte ;
- `sort: 'asc' | 'desc'` applique un ordre textuel déterministe avec comparaison numérique naturelle.

Le tableau `rows` de chaque groupe contient les références des lignes sources ; DataWiz ne clone ni ne modifie les enregistrements.

## `histogram()`

```js
wiz.histogram(items, 'meta.score', {
  bins: 10,
  min: null,
  max: null
});
```

- `bins` est normalisé entre 1 et 200 ;
- `min`/`max` peuvent fixer un domaine explicite ;
- les valeurs hors domaine sont ignorées ;
- les bins suivent `[min,max)` sauf le dernier qui inclut `max` ;
- un domaine constant (`min === max`) retourne un seul bin ;
- `max < min` lève une `RangeError` avec `error.code = 'INVALID_HISTOGRAM_DOMAIN'`.

## Entrées défensives

Une entrée `items` non tableau est traitée comme une collection vide. Aucune méthode ne dépend du DOM ni d’un provider externe.

## Frontières avec les autres briques

- **TableWiz** : présentation/interaction tabulaire ; aucun fichier TableWiz n’est modifié par D1.
- **JsonStudio** : édition et validation du buffer JSON ; DataWiz ne modifie pas ses données.
- **DataResolver / DataValidator** : résolution et validation métier ; DataWiz reste purement descriptif.

## Vérification D1

Node 22 :

```text
data wiz convergence tests: ok
```

Le test `dev/framework/tests/data-wiz-convergence.test.mjs` couvre :

- compatibilité des sorties historiques ;
- champs imbriqués ;
- statistiques numériques strictes et médiane ;
- comptage des types ;
- rejet des chemins dangereux ;
- groupements scalaires/tableaux/vides et tri ;
- histogramme standard, domaine explicite et domaine constant ;
- erreur de domaine ;
- absence de conversion numérique des booléens/vides.
