# CodeBlockStorage — persistance locale optionnelle

## Objectif

`CodeBlockStorage` apporte une persistance locale indépendante pour l'état éditable de `CodeBlock`, sans modifier le composant principal ni introduire de dépendance DOM.

L'adaptateur peut utiliser `localStorage` ou un provider compatible injecté. Il est donc testable sous Node et utilisable dans un navigateur où le stockage est désactivé ou restreint.

## État persisté

Le snapshot version 1 conserve :

- `value` : contenu du bloc ;
- `language` ;
- `filename` ;
- `theme` ;
- `highlighted` ;
- `fontScale` borné entre 70 et 160.

Le document stocké utilise :

```json
{
  "type": "nlab.code-block-state",
  "version": 1,
  "state": {},
  "meta": {}
}
```

## API

### `snapshot(block)`

Normalise un état CodeBlock sans le modifier.

### `serialize(block, { meta })`

Produit le JSON versionné destiné au stockage.

### `parse(raw)`

Valide le type, la version et normalise l'état chargé.

### `save(block, options)`

Sauvegarde l'état si le provider est disponible et l'état valide.

Résultats d'échec structurés :

- `unavailable` ;
- `invalid-state` ;
- `storage-error`.

### `load(block, { apply })`

Charge le document. Avec un `block` et `apply:true`, restaure l'état via les setters publics lorsqu'ils existent : langage, nom de fichier, contenu, thème, coloration, taille de police.

Le mode `apply:false` permet de prévisualiser le document sans modifier une instance.

Une erreur pendant l'application retourne `reason:'apply-error'`.

### `apply(block, state)`

Applique explicitement un snapshot normalisé à une instance ou à un objet compatible.

### `clear()`

Supprime uniquement la clé de stockage configurée.

## Provider et clé

Clé par défaut : `nlab.code-block.state.v1`.

`storage:null` désactive explicitement la persistance. Sans option `storage`, l'adaptateur tente de lire `globalThis.localStorage` dans un bloc protégé : une `SecurityError` d'accès ne casse donc pas la construction.

## Tests

`dev/framework/tests/code-block-storage.test.mjs` couvre :

- snapshot et sérialisation ;
- sauvegarde et chargement ;
- restauration via setters ;
- application sur objet simple ;
- normalisation thème/taille ;
- JSON ou type invalide ;
- état invalide ;
- stockage absent ;
- erreurs lecture/écriture/suppression ;
- suppression de l'état.

Baseline : Node 22, `code block storage tests: ok`.

## Hors périmètre

Le lot n'ajoute pas d'autosave périodique, de synchronisation multi-onglets ni de modification de `code-block.js`. L'intégration UI peut choisir explicitement quand sauvegarder ou restaurer l'état.
