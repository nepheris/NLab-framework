# CodeBlockJsonFolding — pliage JSON hiérarchique

## Objectif

`CodeBlockJsonFolding` fournit un modèle DOM-free pour représenter et piloter un JSON hiérarchique pliable sans modifier le composant `CodeBlock` existant. Le moteur est destiné à être branché ultérieurement sur une UI, un Inspector ou une vue JSON sans imposer de dépendance navigateur.

## Entrées

Le constructeur accepte :

```js
new CodeBlockJsonFolding({
  value: '{"user":{"name":"Ada"}}',
  collapseDepth: null
});
```

`value` peut être une chaîne JSON valide ou une valeur déjà parsée compatible JSON.

Les valeurs non JSON sont refusées :

- nombres non finis ;
- `undefined`, fonctions, symboles ou bigint ;
- cycles ;
- clés sensibles `__proto__`, `prototype`, `constructor`.

`CodeBlockJsonFolding.parse(value, options)` permet un parsing structuré sans exception propagée :

```js
{ ok: true, model, error: null }
// ou
{ ok: false, model: null, error }
```

## Arbre et chemins

Chaque nœud expose :

- `key` ;
- `path` ;
- `depth` ;
- `type` ;
- `container` ;
- `collapsed` ;
- `summary` ;
- `children`.

Les chemins utilisent une forme JSON Pointer avec échappement `~0` / `~1`. La racine est `''`.

Exemples :

- `/user/name` ;
- `/items/0` ;
- une clé `a/b~c` devient `/a~1b~0c`.

## Pilotage du pliage

### `find(path)`

Retourne le nœud correspondant ou `null`.

### `setCollapsed(path, value)`

Plie ou déplie un conteneur. Un chemin absent retourne `reason:'missing'`; un scalaire retourne `reason:'not-container'`.

### `toggle(path)`

Inverse l’état d’un conteneur.

### `collapseAll({ includeRoot })`

Plie tous les conteneurs. Par défaut la racine reste visible.

### `expandAll()`

Déplie tous les conteneurs.

### `collapseDeeperThan(depth)`

Plie les conteneurs à partir de la profondeur donnée. La valeur est normalisée vers un entier positif ou nul.

## Mise à jour atomique

`setValue(value, { preserveCollapsed })` parse et valide la nouvelle valeur avant toute mutation.

Si l’entrée est invalide :

```js
{ changed: false, error }
```

L’état précédent reste intact.

Avec `preserveCollapsed:true`, les chemins repliés encore présents dans la nouvelle structure conservent leur état.

## Snapshots

`snapshot()` retourne des copies indépendantes :

```js
{
  value,
  root,
  visible
}
```

Modifier le snapshot ne modifie jamais le modèle interne.

## Rendu neutre

### `renderText()`

Produit une vue hiérarchique textuelle déterministe avec marqueurs :

- `▼` conteneur ouvert ;
- `▶` conteneur fermé ;
- `•` valeur scalaire.

### `renderHtml()`

Produit des lignes HTML sémantiques avec :

- `data-json-path` ;
- `data-json-type` ;
- `data-json-depth` ;
- `data-json-collapsed` pour les conteneurs.

Toutes les clés, valeurs et métadonnées textuelles sont échappées. Aucun contenu source n’est injecté comme HTML actif.

## Compatibilité

Ce lot est volontairement découplé de `code-block.js`. Il peut être utilisé comme adaptateur optionnel par une UI future sans modifier le contrat actuel de `CodeBlock`.

Il ne dépend pas de JSON Studio, TableWiz ou d’un DOM global.

## Tests

`dev/framework/tests/code-block-json-folding.test.mjs` couvre :

- parsing chaîne JSON ;
- arbre objets/tableaux/scalaires ;
- chemins JSON Pointer ;
- toggle / collapse / expand ;
- profondeur ;
- snapshot isolé ;
- rendu texte ;
- échappement HTML ;
- mise à jour atomique ;
- conservation optionnelle des chemins repliés ;
- JSON invalide ;
- clés sensibles ;
- nombres non finis ;
- cycles.

Baseline : Node 22.16.0 — `code block json folding tests: ok`.

## Hors périmètre

Ce lot ne modifie pas le rendu principal de `CodeBlock`, n’ajoute pas de CSS de démo et ne remplace pas JSON Studio. L’intégration visuelle interactive peut être réalisée séparément lorsque le périmètre UI correspondant est libre.
