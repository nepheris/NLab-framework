# FileFormatRegistry — formats de fichiers et clés d’icônes

## Objectif

`FileFormatRegistry` fournit une résolution DOM-free et déterministe des formats de fichiers utilisés par les futurs composants Documents / Media.

Le registre ne dessine aucune icône. Il retourne une `iconKey` sémantique stable que l’UI pourra relier plus tard à `IconRegistry` ou à un autre renderer.

## Formats intégrés

Le registre inclut :

- `generic` → `iconKey: file` ;
- `folder` → `folder` ;
- `archive` → `archive` (`zip`, `7z`, `rar`, `tar`, `tar.gz`, `tgz`, `gz`, `bz2`) ;
- `image` → `image` ;
- `svg` → `svg` ;
- `json` → `json` ;
- `javascript` → `javascript` ;
- `python` → `python` ;
- `bash` → `bash` ;
- `html` → `html` ;
- `pdf` → `pdf` ;
- `word` → `document` ;
- `spreadsheet` → `spreadsheet` ;
- `text` → `text`.

Chaque descriptor contient :

```js
{
  id,
  label,
  iconKey,
  category,
  extensions,
  mimes,
  builtIn
}
```

Les lectures retournent des copies afin qu’un consommateur ne puisse pas modifier le registre par mutation indirecte.

## Résolution

`resolve(input, options)` accepte une chaîne de nom de fichier ou un objet.

Ordre de priorité :

1. `format`, `formatId` ou `type` explicite connu ;
2. `kind: 'folder'` ;
3. MIME exact ;
4. MIME wildcard, par exemple `image/*` ;
5. extension explicite ;
6. extension déduite de `filename`, `name` ou `path` ;
7. fallback, `generic` par défaut.

Le résultat ajoute :

```js
{
  matchedBy: 'explicit' | 'kind' | 'mime' | 'extension' | 'fallback',
  matchedValue
}
```

Les paramètres MIME (`; charset=utf-8`) sont ignorés lors de la résolution. Les query strings et fragments présents dans un nom de fichier sont également ignorés.

Les extensions composées sont supportées : `archive.tar.gz` privilégie `tar.gz` avant `gz`.

## Registre custom

`register(descriptor)` permet d’ajouter un format custom.

Exemple :

```js
registry.register({
  id: 'geojson',
  label: 'GeoJSON',
  iconKey: 'map-data',
  category: 'data',
  extensions: ['geojson'],
  mimes: ['application/geo+json']
});
```

Les IDs, extensions et MIME sont normalisés et validés. Un alias déjà attribué à un autre format est refusé afin de garder une résolution déterministe.

Les formats intégrés ne peuvent pas être remplacés ou supprimés par le registre custom.

`unregister(id)` libère un format custom et ses aliases.

## API

### `FileFormatRegistry.builtins()`

Retourne une copie de la liste intégrée.

### `has(id)` / `get(id)`

Teste ou récupère un descriptor.

### `list({ category })`

Liste tous les formats, avec filtre optionnel de catégorie.

### `register(descriptor, { replace })`

Ajoute un format custom. `replace:true` ne concerne qu’un format custom existant avec le même ID ; les built-ins restent protégés.

### `unregister(id)`

Supprime un format custom.

### `resolve(input, { fallback })`

Résout le format le plus précis.

## Compatibilité Documents / Media

Le registre est volontairement indépendant de `MediaWiz`, `DocumentWiz` et `IconRegistry`.

Un renderer peut consommer simplement :

```js
const descriptor = registry.resolve({ filename, mime });
const icon = iconRegistry.get(descriptor.iconKey);
```

Cette séparation évite que la logique extension/MIME soit dupliquée dans chaque renderer et permet à l’UI de changer de pack d’icônes sans modifier la détection des fichiers.

## Tests

`dev/framework/tests/file-format-registry.test.mjs` couvre :

- résolution PDF, SVG, image, tableur, texte, archive composée et dossier ;
- priorité MIME / type explicite / extension ;
- MIME wildcard ;
- query string et paramètres MIME ;
- fallback générique et fallback custom ;
- registre custom ;
- conflits d’extensions/MIME ;
- protection des built-ins ;
- validation des IDs, extensions et MIME ;
- copies défensives.

Baseline : Node 22.16.0, `file format registry tests: ok`.

## Hors périmètre

Ce lot n’ajoute aucun SVG, ne modifie aucun pack d’icônes et ne change aucun renderer. L’intégration visuelle et les icônes finales restent indépendantes de ce contrat.
