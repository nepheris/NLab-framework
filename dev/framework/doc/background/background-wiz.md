# BackgroundWiz — contrat BG1

## Rôle

`BackgroundWiz` normalise les fonds de présentation sans modifier le DOM, Theme Workshop, ThemeEngine, V20 ou la démo.

Modes :

- `transparent`
- `solid`
- `gradient`
- `image`

Le moteur produit des descripteurs, une chaîne CSS déterministe, un objet de styles ou des variables CSS. L’application réelle de ces valeurs reste à la couche consommatrice.

## Portée

Chaque fond expose :

- `scope: global | type | instance`
- `target` optionnel

La portée est **descriptive**. BackgroundWiz n’écrit jamais lui-même dans un scope global/type/instance ; cela évite toute collision avec la logique scoped de V20 tant qu’elle reste en validation HUMAN.

## Transparent / couleur unie

```js
wiz.normalize({ type:'solid', color:'#fff', scope:'instance' });
```

Les valeurs de couleur refusent les caractères d’injection CSS et les fonctions d’image/gradient (`url()`, `image-set()`, gradients…).

## Gradient

```js
{
  type:'gradient',
  kind:'linear',
  angle:180,
  stops:[
    { color:'#000', position:0 },
    { color:'#fff', position:100 }
  ]
}
```

- `kind: linear | radial`
- minimum 2 stops
- positions bornées entre 0 et 100
- stops sans position distribués automatiquement
- angle normalisé sur `[0,360)`
- radial : `shape` descriptif

`css()` produit par exemple :

```text
linear-gradient(180deg, #000 0%, #fff 100%)
```

## Image

Options :

- `url`
- `size: cover | contain | auto`
- `position`
- `repeat`
- `attachment: scroll | fixed`
- couleur de fallback optionnelle

Les schémas exécutables sont refusés. Une URL `data:` n’est admise que pour `data:image/*`.

## Sorties

### CSS

```js
wiz.css(descriptor)
```

### Objet de styles

```js
wiz.style(descriptor)
```

Pour une image, l’objet fournit notamment `backgroundImage`, `backgroundPosition`, `backgroundSize`, `backgroundRepeat`, `backgroundAttachment` et éventuellement `backgroundColor`.

### Variables

```js
wiz.variables(descriptor, { prefix:'--nlab-background' })
```

Produit :

- `<prefix>-type`
- `<prefix>-scope`
- `<prefix>-value`

### Snapshot

`snapshot()` retourne un clone défensif du descripteur normalisé.

## Erreurs structurées

- `INVALID_BACKGROUND`
- `INVALID_CSS_TOKEN`
- `INVALID_COLOR`
- `GRADIENT_STOPS_REQUIRED`
- `INVALID_GRADIENT_STOP`
- `IMAGE_URL_REQUIRED`
- `UNSAFE_IMAGE_URL`

## Vérification exacte

Moteur : `d6df03951d69e1554ccbabcb7b57e3c24cf06a41`  
Test : `668f3273e951a11c700c6820422350093210b500`

Node 22 :

```text
background wiz tests: ok
```

Couverture : transparent, couleur, portée, injection CSS, gradients linéaires/radiaux, stops automatiques, angle, image, fallback couleur, domaines URL sûrs, `data:image`, styles, variables et clone défensif.

## Suite

Le raccord à Theme Workshop/V20 et la validation visuelle des gradients/images restent des tâches séparées. Le contrat BG1 peut être intégré indépendamment.
