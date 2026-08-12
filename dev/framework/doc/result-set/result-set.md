# ResultSet — contrat de données

## Objectif

`ResultSet` représente un sous-ensemble de résultats avec contexte de recherche : items courants, total logique, requête, filtres et métadonnées. Les transformations doivent conserver ce contexte sans partager les conteneurs de métadonnées entre instances.

## Construction

`items` doit être itérable. Le constructeur copie l'itérable dans un tableau propre.

`total` :

- vaut `items.length` lorsqu'il est absent ;
- est normalisé en nombre ;
- doit être un entier positif ou nul ;
- ne peut pas être inférieur au nombre d'items présents.

Cette règle permet un ResultSet paginé (`total > length`) tout en rejetant les états incohérents.

`meta` doit être un objet simple. `filters`, lorsqu'il s'agit d'un tableau ou d'un objet simple, est copié au niveau du conteneur.

## Propriétés utilitaires

- `length` — nombre d'items actuellement présents ;
- `isEmpty` — vrai lorsque `length === 0` ;
- `first` — premier item ou `undefined` ;
- `at(index)` — accès compatible `Array.at()` ;
- le ResultSet est itérable via `Symbol.iterator`.

## Transformations

### `map(fn)`

Applique un callback aux items et retourne un nouveau ResultSet. Le `total`, la requête, les filtres et les métadonnées sont propagés.

### `slice(start, end)`

Retourne un nouveau ResultSet contenant la tranche demandée tout en conservant le `total` logique original. Ce comportement est adapté aux pages ou fenêtres partielles.

### `withMeta(meta)`

Fusionne des métadonnées dans une nouvelle instance sans modifier le ResultSet source.

Pour `map`, `slice` et `withMeta`, les conteneurs `filters` et `meta` sont recréés afin qu'une modification de haut niveau sur l'instance transformée ne modifie pas la source.

Les objets items eux-mêmes restent par référence, comme dans le contrat historique ; ResultSet n'impose pas de clonage profond des données métier.

## Sérialisation

`toJSON()` retourne :

- `items` dans un nouveau tableau ;
- `total` ;
- `query` ;
- `filters` dans un nouveau conteneur lorsque possible ;
- `meta` dans un nouvel objet.

Cela permet `JSON.stringify(resultSet)` et l'inspection sans exposer les tableaux/conteneurs internes.

## Tests

`dev/framework/tests/result-set-robustness.test.mjs` couvre :

- invariants `items/total/meta` ;
- total paginé ;
- helpers length/isEmpty/first/at/iterator ;
- propagation map/slice/withMeta ;
- indépendance des conteneurs filters/meta ;
- sérialisation `toJSON` ;
- iterables non-array ;
- cas invalides ;
- normalisation d'un total numérique sous forme de chaîne.

## Hors périmètre

Ce lot ne définit pas le moteur de pagination, ne modifie pas TableWiz réservé par l'agent A et ne change pas les données des items par clonage profond.
