# DataSource — contrat de description de source

## Objectif

`DataSource` décrit une source de données indépendamment du provider qui la consomme. L'objet doit rester simple, sérialisable et sans effet de bord sur les conteneurs d'options ou de métadonnées fournis par l'appelant.

## Identité

`id` et `type` sont obligatoires :

- chaînes uniquement ;
- normalisées par `trim()` ;
- non vides après normalisation.

Les valeurs invalides sont rejetées explicitement au constructeur.

## Localisation

`location` reste volontairement libre et vaut `null` par défaut. Le framework peut donc y placer une URL, un chemin, un descripteur ou un objet spécifique à un provider.

Le contrat ne clone pas `location`, car certains consommateurs peuvent y placer une référence ou un objet non sérialisable.

## Options et métadonnées

`options` et `metadata` :

- valent `{}` lorsqu'ils sont `null` ou `undefined` ;
- doivent être des objets non-tableaux ;
- sont copiés superficiellement au constructeur.

Une modification ultérieure de l'objet fourni par l'appelant ne modifie donc pas le conteneur interne de la DataSource.

## Sérialisation

`toJSON()` retourne un nouvel objet contenant :

- `id` ;
- `type` ;
- `location` ;
- une copie de `options` ;
- une copie de `metadata`.

Les conteneurs retournés peuvent être modifiés sans affecter l'instance.

## Tests

`dev/framework/tests/data-source-contract.test.mjs` couvre :

- normalisation `id/type` ;
- copie des options/métadonnées d'entrée ;
- indépendance des conteneurs retournés par `toJSON()` ;
- `null` pour options/métadonnées ;
- conservation libre de `location` ;
- validations des champs obligatoires et des conteneurs.

## Hors périmètre

Ce lot ne choisit pas de provider, ne résout pas les URLs, ne charge aucune donnée et ne modifie ni DataProvider, DataResolver, DataIndex, TableWiz ou la démo.
