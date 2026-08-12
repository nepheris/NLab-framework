# SearchAdvancedOptions — paramètres avancés communs

## Objectif

`SearchAdvancedOptions` fournit un modèle DOM-free pour piloter un panneau de paramètres avancés autour de `SearchWiz` sans coupler le moteur de recherche à une interface particulière.

Le modèle couvre uniquement des options déjà compatibles avec les contrats publics de `SearchWiz.search()` et `SearchWiz.suggest()`.

## État canonique

Valeurs par défaut :

```json
{
  "mode": "contains",
  "fields": null,
  "limit": null,
  "locale": "fr",
  "stopwords": [],
  "suggest": {
    "enabled": true,
    "inheritFields": true,
    "fields": null,
    "minChars": 1,
    "limit": 8,
    "match": "contains"
  }
}
```

### Mode de recherche

Trois modes de panneau sont exposés :

- `contains` → `SearchWiz.search({ mode:'text', exact:false, regex:false })` ;
- `exact` → `SearchWiz.search({ mode:'text', exact:true, regex:false })` ;
- `regex` → `SearchWiz.search({ mode:'regex', exact:false, regex:true })`.

Une valeur de mode inconnue retombe sur `contains`.

## Champs et stopwords

`fields` accepte `null`, une chaîne ou un tableau de chaînes. Les valeurs sont :

- trimées ;
- dédupliquées selon la locale ;
- limitées à 256 entrées ;
- limitées à 256 caractères par valeur.

`null` signifie que `SearchWiz` conserve son comportement de recherche sur les champs disponibles.

`stopwords` suit la même normalisation mais retourne toujours un tableau.

## Locale et limites

La locale est validée par `Intl.Collator`. Une locale invalide retombe sur `fr`.

Les limites numériques sont converties en entiers, bornées à `0..1_000_000`. La limite principale peut rester `null`, ce qui conserve l'absence de limite de `SearchWiz.search()`.

## Autocomplétion

Le sous-objet `suggest` contrôle :

- `enabled` ;
- `inheritFields` ;
- `fields` spécifiques si l'héritage est désactivé ;
- `minChars` ;
- `limit` ;
- `match: contains|prefix`.

`forSuggest()` retourne `null` lorsque l'autocomplétion est désactivée. Sinon il produit directement l'objet attendu par `SearchWiz.suggest()`.

Quand `inheritFields:true`, l'autocomplétion reprend les champs de la recherche principale au moment de l'appel.

## API

### `SearchAdvancedOptions.defaults()`

Retourne un nouvel objet avec l'état canonique par défaut.

### `snapshot()`

Retourne une copie isolée de l'état courant.

### `update(patch)`

Applique un patch atomique. Le sous-objet `suggest` est fusionné avec son état courant avant normalisation.

### `reset()`

Revient à l'état initial fourni au constructeur.

### `resetDefaults()`

Revient aux valeurs canoniques du composant.

### `forSearch()`

Produit uniquement les options compatibles avec `SearchWiz.search()` :

```js
{
  fields,
  mode,
  exact,
  regex,
  limit,
  locale,
  stopwords
}
```

### `forSuggest()`

Produit les options compatibles avec `SearchWiz.suggest()` ou `null` si l'autocomplétion est désactivée.

## Import / export

Le format JSON est versionné :

```json
{
  "type": "nlab.search-advanced-options",
  "version": 1,
  "options": {}
}
```

- `toJSON()` retourne le payload structuré ;
- `serialize({ indent })` sérialise avec indentation bornée à 0–8 ;
- `SearchAdvancedOptions.parse(payload)` refuse un type ou une version incompatibles.

## Compatibilité

Ce lot ne modifie pas `search-wiz.js`. Un consommateur peut l'utiliser ainsi :

```js
const options = new SearchAdvancedOptions({ mode: 'exact', fields: ['name'] });
const result = searchWiz.search(rows, query, options.forSearch());

const suggestOptions = options.forSuggest();
const suggestions = suggestOptions
  ? searchWiz.suggest(rows, query, suggestOptions)
  : [];
```

## Tests

`dev/framework/tests/search-advanced-options.test.mjs` couvre :

- valeurs par défaut ;
- normalisation des modes, champs, locale, stopwords et limites ;
- mapping exact vers `search()` et `suggest()` ;
- héritage des champs d'autocomplétion ;
- désactivation des suggestions ;
- snapshots défensifs ;
- update/reset ;
- import/export versionné ;
- bornes et entrées invalides.

Baseline du lot : Node 22.16.0, `search advanced options tests: ok`.

## Hors périmètre

Ce modèle ne construit aucun panneau DOM, ne choisit aucune icône et ne modifie ni `SearchWiz`, ni `FilterWiz`, ni `TableWiz`, ni la démo. L'intégration visuelle pourra consommer ce contrat plus tard sans réimplémenter la normalisation des paramètres.
