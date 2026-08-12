# QRPresetStorage — contrat de stockage local

## Objectif

`QRPresetStorage` fournit une persistance locale optionnelle pour les collections de presets QR. Il utilise `QRPresetCodec` comme frontière de validation et n'écrit jamais une collection invalide.

Le stockage est injectable pour les tests, environnements restreints ou futurs adaptateurs. Sans injection, le composant tente d'utiliser `globalThis.localStorage` de façon défensive.

## Construction

```js
const storage = new QRPresetStorage({
  key: 'nlab.qr.presets.v1'
});
```

Options :

- `storage` : objet compatible Storage (`getItem`, `setItem`, `removeItem`) ;
- `key` : clé de persistance, défaut `nlab.qr.presets.v1` ;
- `codec` : instance de `QRPresetCodec` injectable.

`storage:null` désactive explicitement la persistance. Un accès global à `localStorage` refusé par le navigateur est traité comme indisponible au lieu de provoquer une erreur à la construction.

## Disponibilité

`isAvailable()` vérifie uniquement le contrat structurel du provider. Les erreurs réelles de permissions/quota restent gérées au moment de chaque opération.

## Sauvegarde

`save(presets, { activeId, meta, space })` :

1. vérifie la disponibilité du provider ;
2. valide et sérialise toute la collection via `QRPresetCodec` ;
3. appelle `setItem` uniquement si la collection est valide.

Résultat de succès :

```js
{
  ok: true,
  reason: null,
  key: 'nlab.qr.presets.v1',
  bytes: 420,
  json: '{...}'
}
```

Une collection invalide retourne `reason:'invalid-data'` et `issues`. Le contenu précédemment stocké n'est alors pas modifié.

Une erreur du provider (quota, permissions, etc.) retourne `reason:'storage-error'` avec une erreur normalisée `{ name, message }`.

## Chargement

`load()` distingue quatre cas :

- stockage indisponible : `ok:false`, `reason:'unavailable'` ;
- aucune valeur : `ok:true`, `found:false` ;
- document valide : `ok:true`, `found:true`, `document` ;
- JSON ou collection invalide en stockage : `ok:false`, `found:true`, `reason:'invalid-data'`.

La collection retournée par le codec est une copie indépendante ; une mutation de l'objet chargé ne modifie pas la valeur persistée.

## Suppression

`clear()` supprime uniquement la clé configurée. L'absence de stockage ou une erreur provider utilise les mêmes raisons structurées que les autres opérations.

## Codes `reason`

- `unavailable` : provider absent/incompatible ;
- `invalid-data` : preset ou document refusé par le codec ;
- `storage-error` : exception du provider de stockage.

Les opérations réussies retournent `reason:null`.

## Tests

`dev/framework/tests/qr-preset-storage.test.mjs` couvre :

- stockage mémoire injectable ;
- sauvegarde/chargement/clear ;
- `activeId` et métadonnées ;
- isolation des objets chargés ;
- refus d'une sauvegarde invalide sans écraser la précédente ;
- JSON corrompu en stockage ;
- stockage absent ;
- erreur de quota ;
- erreurs de lecture/suppression ;
- fallback de clé.

Baseline : Node 22, `qr preset storage tests: ok`.

## Hors périmètre

Le composant ne synchronise pas plusieurs onglets, ne chiffre pas les données et ne remplace pas le `PresetManager` générique. Il apporte uniquement la persistance locale minimale requise par QR Studio.
