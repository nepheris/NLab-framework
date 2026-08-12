# InspectorDockLayout — modes dock overlay / push-content

## Objectif

`InspectorDockLayout` fournit un moteur d'état et de layout DOM-free pour les modes de dock d'un InspectorPanel. Il sépare le calcul du layout de la couche visuelle afin que les comportements `overlay` et `push` puissent être testés sans navigateur réel.

## Modes

- `overlay` : le panneau est docké mais n'ajoute aucun inset au contenu ;
- `push` : le contenu reçoit un inset égal à `size + gap` du côté du panneau.

Les modes sont exposés par `InspectorDockLayout.modes()`.

## Côtés

Les côtés supportés sont : `left`, `right`, `top`, `bottom`.

`InspectorDockLayout.sides()` retourne une copie de cette liste.

## Construction

```js
const dock = new InspectorDockLayout({
  mode: 'push',
  side: 'right',
  size: 320,
  gap: 12
});
```

Les valeurs invalides retombent sur des défauts sûrs : `overlay`, `right`, `360px`, gap `0`.

## API

### `setMode`, `setSide`, `setSize`, `setGap`

Mettent à jour le modèle et retournent l'instance.

### `plan({ viewportWidth, viewportHeight })`

Retourne un plan déterministe :

- mode et côté ;
- taille bornée au viewport ;
- styles du panneau ;
- insets numériques du contenu ;
- variables CSS `--nlab-inspector-*`.

Les docks gauche/droite ont un minimum de 160px. Les docks haut/bas ont un minimum de 120px. Une taille supérieure au viewport est bornée à la dimension disponible.

### `snapshot(options)`

Retourne une copie compacte de l'état résolu : `mode`, `side`, `size`, `gap`, `contentInset`.

### `apply({ panel, content, viewportWidth, viewportHeight })`

Applique le plan sur des cibles injectées :

- `panel.dataset.dockMode` et `dockSide` ;
- position/taille du panneau ;
- variables CSS ;
- marges du contenu en mode `push` ;
- nettoyage des marges quand on revient en `overlay`.

Si aucune cible n'est fournie, la méthode retourne `{ applied:false, reason:'no-target' }` au lieu de provoquer une erreur DOM.

## Variables CSS

Le plan expose notamment :

- `--nlab-inspector-dock-size` ;
- `--nlab-inspector-dock-gap` ;
- `--nlab-inspector-push-top` ;
- `--nlab-inspector-push-right` ;
- `--nlab-inspector-push-bottom` ;
- `--nlab-inspector-push-left`.

Elles permettent à une intégration visuelle de reprendre le même calcul sans dupliquer la logique.

## Compatibilité

Ce lot ne modifie pas `floating-panel.js`. Il fournit une primitive séparée pouvant être branchée ultérieurement dans une vue ou un contrôleur InspectorPanel.

## Tests

`dev/framework/tests/inspector-dock-layout.test.mjs` couvre :

- modes et côtés canoniques ;
- overlay sans inset ;
- push avec gap ;
- bornes minimales ;
- bornage au viewport ;
- normalisation d'entrées invalides ;
- application DOM injectable ;
- nettoyage lors du retour overlay ;
- fonctionnement sans cible DOM.

Baseline : Node 22.16.0 — `inspector dock layout tests: ok`.

## Hors périmètre

Ce lot ne définit pas le CSS final de la démo, ne décide pas l'ergonomie visuelle et ne modifie aucun scope Agent A, DataWiz, JSON Studio, TableWiz, Header Studio ou V20.
