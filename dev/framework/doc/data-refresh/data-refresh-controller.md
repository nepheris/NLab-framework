# DataRefreshController

Contrat DOM-free d'orchestration du rafraîchissement des collections de données.

## Rôle

`DataRefreshController` ne remplace ni `DataProvider` ni `JsonDataProvider`. Il orchestre leur API publique afin qu'une source JSON ou dynamique puisse signaler qu'une collection est devenue obsolète, puis être rechargée de manière déterministe.

Le contrôleur ne crée volontairement aucun timer et n'écoute aucun événement navigateur. Une future couche de polling, WebSocket, SSE, file-watch ou bouton `Actualiser` appelle simplement `invalidate()` et/ou `refresh()`.

## API

### `new DataRefreshController({ provider, clock?, fingerprintFn?, onChange? })`

Le provider doit exposer `getCollection(name, options)`. Les APIs optionnelles utilisées lorsqu'elles existent sont :

- `clearCache(name?)` ;
- `listCollections()` pour `refreshAll()`.

### `invalidate(name, options?)`

Marque une collection obsolète, incrémente son `epoch` et purge son cache provider si `clearCache()` est disponible.

Options : `reason` (défaut `external-change`) et `clearProviderCache` (défaut `true`).

Une invalidation survenant pendant un chargement rend ce chargement `superseded`; son résultat reste observable mais ne remet pas la collection en état frais.

### `refresh(name, options?)`

Recharge la collection via `provider.getCollection(name, { refresh:true })` par défaut.

Options : `reason`, `force` (défaut `true`) et `coalesce` (défaut `true`). Deux refresh concurrents d'une même collection sont coalescés au niveau du chargement provider. Le contrat ne promet pas l'identité de référence du `Promise`, seulement un appel provider unique et un résultat cohérent.

### `refreshAll(names?, options?)`

Recharge un ensemble explicite de collections ou, sans argument, la liste retournée par `provider.listCollections()`. Le retour utilise `Promise.allSettled` afin qu'une collection en erreur ne bloque pas les autres.

### `status(name)` / `listStatus()`

Expose un snapshot défensif : `loading`, `stale`, `error`, `revision`, `size`, `fingerprint`, `changed`, `superseded`, `epoch`, timestamps, raisons et dernière copie de `data`.

`revision` augmente uniquement lorsque l'empreinte des données change.

### `data(name, fallback?)`

Retourne une copie défensive de la dernière collection chargée.

### `subscribe(listener)`

Événements : `loading`, `ready`, `superseded`, `error`, `invalidate`, `clear`, `clear-all`. Retourne une fonction de désabonnement.

### `clear(name?)`

Supprime l'état local et purge le cache provider correspondant. Sans nom, efface tout.

## Erreurs

`DataRefreshError` fournit des codes stables : `PROVIDER_REQUIRED`, `COLLECTION_REQUIRED`, `INVALID_LISTENER`, `INVALID_COLLECTION_LIST`, `INVALID_COLLECTION_RESULT`, `CYCLIC_DATA`, `REFRESH_FAILED`.

## Intégration avec JsonDataProvider

`JsonDataProvider` supporte déjà `provider.getCollection(name, { refresh:true })` et `provider.clearCache(name)`. Le contrôleur exploite ces capacités sans modifier le provider.

```js
watcher.on('source-change', ({ collection }) => {
  refresh.invalidate(collection, { reason:'source-change' });
  return refresh.refresh(collection, { reason:'source-change' });
});
```

## Frontières

Ce lot n'implémente pas de polling automatique, `setInterval`, WebSocket/SSE, écoute DOM, bouton `Actualiser`, ni de mutation de `DataProvider`, `JsonDataProvider`, `DataWiz`, `DataResolver` ou de la démo. Ces couches peuvent consommer ce contrat ultérieurement.
