# WebmasterModeControl

`WebmasterModeControl` est l'adaptateur DOM-free qui expose les **toggles globaux destinés au Header** sans faire dépendre `HeaderStudio` de la logique Webmaster.

Il consomme uniquement l'API publique de `WebmasterMode`.

## Deux contrôles

`controls()` retourne exactement deux descriptors :

1. `webmaster-mode` — bascule `Web public ↔ Webmaster` ;
2. `diagnostic-tools` — affiche/masque ensemble les features `ids` et `infoTest`.

```js
const control = new WebmasterModeControl({ webmasterMode });
const descriptors = control.controls();
```

Chaque descriptor expose notamment :

- `id` ;
- `type: 'toggle'` ;
- `label` ;
- `actionLabel` ;
- `pressed` ;
- `mixed` ;
- `ariaPressed` ;
- `ariaLabel` ;
- `value`.

La future couche Header peut donc rendre les contrôles sans connaître les règles internes de `WebmasterMode`.

## Mode global

```js
control.toggleMode();
control.setMode('public');
control.setMode('webmaster');
```

Le contrôle délègue à `WebmasterMode.setMode()` / `toggle()`.

En mode Webmaster sans overrides, le modèle existant active les features `ids`, `infoTest`, `help`, `tools` et `diagnostics`. En mode public, elles sont désactivées par défaut.

## Toggle IDs + Info/Test

```js
control.setTestTools(true);
control.toggleTestTools();
```

`setTestTools()` met à jour ensemble :

- `ids` ;
- `infoTest`.

Les deux appels internes `setFeature()` sont effectués avec persistance suspendue, puis un unique `persist()` est demandé si la persistance est activée. Le contrôle ignore également les deux notifications internes pendant la mutation et émet **un seul événement `test-tools`** à sa propre couche consommatrice.

Cela évite un double rerender du futur Header.

## État mixte

Les features restent modifiables indépendamment dans `WebmasterMode`. Si `ids` et `infoTest` divergent :

```js
control.state().testToolsMixed === true
control.controls()[1].ariaPressed === 'mixed'
```

Le prochain clic sur `diagnostic-tools` réactive les deux features ensemble.

## Activation générique

```js
control.activate('webmaster-mode');
control.activate('diagnostic-tools');
```

permet à une couche d'actions de déclencher les contrôles par ID stable.

Un ID inconnu produit `UNKNOWN_CONTROL`.

## Synchronisation externe

Le contrôle s'abonne à `WebmasterMode.subscribe()`.

Une modification provenant d'un autre composant produit un événement `external` et un nouveau descriptor. Les mutations déclenchées par `WebmasterModeControl` lui-même sont filtrées par le garde interne `mutating`.

## Descriptor global

```js
control.descriptor();
```

retourne :

```js
{
  type: 'webmaster-mode-control',
  state: { ... },
  controls: [ ... ]
}
```

`state` contient :

- `mode` ;
- `webmaster` ;
- `ids` ;
- `infoTest` ;
- `testTools` ;
- `testToolsMixed` ;
- snapshot `features` ;
- snapshot `overrides`.

## Frontières

WMC1 ne modifie pas :

- `core/webmaster-mode.js` ;
- `components/info-test-control.js` ;
- `components/header-studio.js` ;
- les démos ou CSS.

Le placement visuel des deux toggles dans le Header reste une étape distincte. Le contrat permet cependant de la réaliser sans recopier la logique de mode ou de diagnostic.

## Nettoyage

```js
control.destroy();
```

supprime l'abonnement au `WebmasterMode`. L'appel est idempotent et indique par booléen si une destruction a réellement été effectuée.

## Vérification

```bash
node dev/framework/tests/webmaster-mode-control.test.mjs
```

La suite utilise le vrai `WebmasterMode` et vérifie : mode public/webmaster, état des features, persistance unique du toggle combiné, état `mixed`, activation par ID, erreurs structurées et désabonnement.
