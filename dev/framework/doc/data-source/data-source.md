# DataSource — contrat de configuration

`DataSource` décrit une source de données sans implémenter elle-même la lecture. La logique d'accès reste du ressort des providers/adapters.

## Champs

- `id` : chaîne non vide, normalisée par trim ;
- `type` : chaîne non vide, normalisée par trim ;
- `location` : chaîne, objet `URL` ou `null` ; une chaîne vide devient `null` ;
- `options` : objet de configuration ;
- `metadata` : objet de métadonnées.

## Isolation des configurations

Les objets et tableaux ordinaires contenus dans `options` et `metadata` sont copiés récursivement :

- modifier l'objet fourni au constructeur ne modifie pas la `DataSource` ;
- modifier le résultat de `toJSON()` ne modifie pas la `DataSource` ;
- les objets à prototype nul sont également copiés ;
- une référence circulaire est rejetée avec `CIRCULAR_CONFIG` afin que la représentation reste sérialisable.

## Erreurs structurées

`DataSourceError` expose un `code` et des `details` lorsque pertinent :

- `INVALID_ID` ;
- `INVALID_TYPE` ;
- `INVALID_LOCATION` ;
- `INVALID_OPTIONS` ;
- `INVALID_METADATA` ;
- `CIRCULAR_CONFIG`.

## Sérialisation

`toJSON()` conserve le format historique :

```json
{
  "id": "recipes",
  "type": "json-static",
  "location": "data/recipes.json",
  "options": {},
  "metadata": {}
}
```

Le snapshot retourné est détaché des objets internes.

## Test dédié

`tests/data-source-robustness.test.mjs` couvre validation, trim, URL, isolation imbriquée, objets à prototype nul, erreurs de shape, circularité et sérialisation.
