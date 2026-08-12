# DensityWiz — contrat DN1

## Rôle

`DensityWiz` formalise la densité de présentation comme un petit ensemble de tokens spécialisés. Il ne remplace pas `PresetManager` : il définit uniquement ce qu’est un preset de densité.

Presets intégrés :

- `compact`
- `normal`
- `comfortable`

## Tokens

Chaque preset possède :

- `gap`
- `paddingX`
- `paddingY`
- `controlHeight`
- `rowHeight`
- `sectionGap`

Les longueurs acceptent `px`, `rem`, `em` ou un nombre converti en pixels. Les valeurs négatives sont refusées ; `controlHeight` et `rowHeight` doivent être strictement positifs.

## Presets intégrés

Les trois presets de base sont éditables avec `replace:true`, puis restaurables via `resetPreset(name)`.

Ils ne peuvent pas être supprimés.

Les valeurs initiales constituent un point de départ technique ; leur calibration visuelle finale reste HUMAN.

## Presets personnalisés

```js
wiz.registerPreset('Tight Custom', {
  gap: 4,
  paddingX: '5px',
  paddingY: '4px',
  controlHeight: 28,
  rowHeight: 30,
  sectionGap: 8
});
```

Le nom est normalisé (`tight-custom`).

API :

- `registerPreset(name, descriptor, { replace })`
- `getPreset(name)`
- `presetNames()`
- `removePreset(name)`
- `resetPreset(name)`

Un remplacement partiel conserve les valeurs existantes du preset ; un nouveau preset incomplet utilise `normal` comme fallback.

## Résolution

`normalize()` / `snapshot()` acceptent un nom de preset ou un descripteur :

```js
wiz.normalize({
  preset: 'compact',
  scope: 'type',
  target: 'table',
  gap: '7px'
});
```

Le résultat contient le preset, une portée descriptive `global/type/instance`, le target optionnel et tous les tokens normalisés.

## Variables CSS

`variables()` produit notamment :

- `--nlab-density-preset`
- `--nlab-density-scope`
- `--nlab-density-gap`
- `--nlab-density-padding-x`
- `--nlab-density-padding-y`
- `--nlab-density-control-height`
- `--nlab-density-row-height`
- `--nlab-density-section-gap`

Le préfixe est configurable.

## Frontière avec PresetManager

DensityWiz ne gère volontairement pas :

- persistance ;
- import/export ;
- favoris ;
- catalogue générique de presets.

Ces responsabilités appartiennent au `PresetManager` déjà présent dans le framework. Une intégration ultérieure pourra stocker les snapshots DensityWiz dans ce gestionnaire sans dupliquer son code.

## Erreurs structurées

- `INVALID_DENSITY`
- `INVALID_LENGTH`
- `INVALID_PRESET_NAME`
- `DUPLICATE_PRESET`
- `UNKNOWN_PRESET`
- `BUILTIN_PRESET`

## Vérification exacte

Moteur : `aaf636fe3ee6106da85275786dfcf7c6bc13ba3a`  
Test : `a2864fefc48763b8e9847b32185b800e83384365`

Node 22 :

```text
density wiz tests: ok
```

Couverture : presets de base, overrides, preset custom, remplacement partiel, reset builtin, suppression custom, protection builtin, longueurs invalides, variables et clones défensifs.

## Suite

Le raccord au Theme Workshop/V20 et la calibration visuelle Compact/Normal/Confortable restent des lots d’intégration/HUMAN séparés.
