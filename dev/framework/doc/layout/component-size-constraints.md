# ComponentSizeConstraints

`ComponentSizeConstraints` est un modèle DOM-free de contraintes de redimensionnement réutilisable par Hero, sections, cartes, panneaux ou futurs composants éditables.

Il ne remplace pas `layout.js`, `FloatingPanel` ou `ResponsivePreview` et n'applique aucun style au DOM.

## Axes

Le mode `axis` accepte :

- `x` — largeur uniquement ;
- `y` — hauteur uniquement ;
- `both` — largeur et hauteur ;
- `none` — redimensionnement interdit.

`canResize()` et `handleDescriptors()` permettent à une future couche UI de déterminer les poignées à afficher sans coder la logique de contraintes dans le renderer.

## Bornes

```js
const constraints = new ComponentSizeConstraints({
  axis: 'both',
  minWidth: 320,
  maxWidth: 1200,
  minHeight: 160,
  maxHeight: 720
});
```

`plan(current, proposal)` clamp la proposition dans les bornes. Une proposition de drag négative ou nulle est acceptée puis clampée vers le minimum ; seul l'état courant doit être une taille positive valide.

## Viewport et origine

```js
constraints.plan(current, proposal, {
  viewport: { width: 1280, height: 800 },
  origin: { x: 100, y: 40 }
});
```

Les maxima effectifs tiennent compte de l'espace restant entre l'origine du composant et le bord du viewport. Le modèle retourne les `limits` réellement appliquées.

## Ratio d'aspect

Un `aspectRatio` positif est supporté lorsque `axis: 'both'`.

```js
new ComponentSizeConstraints({
  axis: 'both',
  aspectRatio: 16 / 9
});
```

`anchor` peut être `width`, `height` ou `auto`. En mode `auto`, la dimension dont la variation relative est la plus forte pilote le ratio.

Une combinaison ratio + bornes/viewport impossible retourne `UNSATISFIABLE_ASPECT_RATIO` plutôt que de produire une taille incohérente.

Le ratio est volontairement interdit pour `axis: x|y|none`, car préserver un ratio obligerait à modifier une dimension déclarée non redimensionnable.

## Clavier

`keyboardDelta()` produit un delta sans effet DOM :

- flèches gauche/droite → largeur ;
- flèches haut/bas → hauteur ;
- `step` configurable, `8` par défaut ;
- `shiftKey` applique `keyboardMultiplier`, `5` par défaut.

`planKeyboard()` combine ce delta avec les mêmes bornes, ratio et contraintes viewport qu'un drag.

## Descripteurs de poignées

`handleDescriptors()` retourne des descripteurs sémantiques :

- `resize-x` / `ew-resize` ;
- `resize-y` / `ns-resize` ;
- `resize-both` / `nwse-resize` lorsque les deux axes sont actifs.

Chaque descripteur contient aussi un `ariaLabel`. Le style, l'icône et la position visuelle de ces poignées restent du ressort de la couche UI et de la validation HUMAN.

## Frontières

CS1 ne modifie pas :

- `components/layout.js` ;
- `components/floating-panel.js` ;
- Hero/sections ;
- `ResponsivePreview` ;
- V20/démo ;
- CSS.

`layout.js` pourra plus tard appliquer la taille résolue, et FloatingPanel pourra éventuellement adopter le modèle dans un lot distinct si cela apporte une convergence utile.

## Vérification

```bash
node dev/framework/tests/component-size-constraints.test.mjs
```

La suite couvre axes, bornes, viewport/origine, clavier, poignées, ratio width/height/auto, snapshot défensif, propositions négatives et erreurs de configuration.
