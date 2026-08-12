# WebmasterMode — contrat global WM1

## Rôle

`WebmasterMode` fixe l’état global `public ↔ webmaster` demandé par le backlog UX sans modifier le DOM, HeaderStudio, InspectorPanel ou la démo.

Modes :

- `public`
- `webmaster`

Fonctions pilotées :

- `ids`
- `infoTest`
- `help`
- `tools`
- `diagnostics`

## Valeurs par défaut

En mode `public`, les cinq fonctions sont désactivées.

En mode `webmaster`, elles sont activées.

Des overrides de session permettent de masquer ou activer une fonction indépendamment du mode global, par exemple masquer les IDs/Info-Test tout en restant en mode Webmaster.

## API

- `setMode(mode)`
- `toggle()`
- `setFeature(feature, enabled)`
- `clearFeature(feature)`
- `clearOverrides()`
- `isEnabled(feature)`
- `features()`
- `snapshot()`
- `attributes()`
- `replace(snapshot)`
- `hydrate()`
- `persist()`
- `subscribe(listener)`

`setMode(..., { resetOverrides:true })` permet de repartir des valeurs du mode sans conserver les choix de session précédents.

## Attributs descriptifs

`attributes()` produit un objet applicable par une future couche DOM :

```js
{
  'data-view-mode': 'webmaster',
  'data-webmaster': 'true',
  'data-feature-ids': 'true',
  'data-feature-info-test': 'true',
  'data-feature-help': 'true',
  'data-feature-tools': 'true',
  'data-feature-diagnostics': 'true'
}
```

Le contrôleur n’applique pas lui-même ces attributs.

## Persistance

Deux contrats sont supportés :

### BrowserStorage nLab

```js
storage.get(key, fallback)
storage.set(key, value)
```

### Web Storage

```js
storage.getItem(key)
storage.setItem(key, JSON.stringify(value))
```

Le snapshot persistant contient seulement :

```js
{
  mode,
  overrides
}
```

Les fonctions effectives sont recalculées depuis le mode et les overrides.

Les erreurs de stockage sont contenues et ne bloquent pas le contrôleur.

## Abonnements

`subscribe(listener, { immediate })` retourne une fonction de désabonnement.

Les événements contiennent un snapshot défensif :

```js
{
  type: 'mode' | 'feature' | 'replace' | 'snapshot',
  snapshot
}
```

Aucune dépendance EventBus n’est imposée.

## Erreurs structurées

- `INVALID_MODE`
- `UNKNOWN_FEATURE`
- `INVALID_SNAPSHOT`

## Vérification exacte

Moteur : `9fdcde3b75c36576f48cdf970fe46f2af3ec2ede`  
Test : `93e01e3d42c2c8e210fb5f139a0925d5248d6685`

Node 22 :

```text
webmaster mode tests: ok
```

Couverture : valeurs public/webmaster, overrides persistants entre changements de mode, clear/reset overrides, attributs, erreurs, Web Storage, BrowserStorage, abonnements, snapshots défensifs et `replace()`.

## Raccords futurs

- HeaderStudio : bouton/toggle Web ↔ Webmaster ;
- toggle secondaire IDs + boutons Info/Test ;
- Inspector : affichage des projections DiagnosticIdRegistry ;
- aides et outils supplémentaires conditionnés par `help/tools/diagnostics`.

Ces raccords UI restent séparés afin de conserver ce contrôleur testable et indépendant de la présentation.
