# FloatingPanel — contrat robuste F1

## Rôle

`FloatingPanelState` et `mountFloatingPanel()` fournissent le comportement générique d’un panneau flottant : position, taille, verrouillage, épinglage, minimisation, docking et cycle ouvert/fermé.

Le lot F1 reste séparé de l’Inspector et de son moteur de dock : aucun fichier `inspector-*`, `layout.js`, CSS ou démo n’est modifié.

## État normalisé

`FloatingPanelState` conserve les champs historiques et ajoute `open` :

```js
{
  x, y,
  width, height,
  locked,
  minimized,
  docked,
  pinned,
  open
}
```

Règles :

- `x` / `y` sont finis et non négatifs ;
- largeur minimale : `280` ;
- hauteur minimale : `180` ;
- docking autorisé : `left`, `right`, `top`, `bottom`, sinon `null` ;
- `apply()` / `hydrate()` normalisent un snapshot avant application ;
- `toJSON()` produit le snapshot persistant.

Les API historiques restent disponibles : `move`, `resize`, `toggleLock`, `toggleMinimize`, `togglePin`, `dock`, `undock`.

Nouvelles API d’état : `setOpen`, `close`, `reopen`.

## Mouvement / resize

Le déplacement reste impossible lorsque le panneau est :

- verrouillé ;
- docké ;
- épinglé.

Le resize reste impossible lorsque le panneau est verrouillé ou docké.

Les coordonnées et tailles sont bornées au viewport injecté.

## Montage injectable

```js
mountFloatingPanel(element, {
  state,
  storage,
  storageKey,
  hydrate: true,
  onChange,
  onClose,
  document,
  window
});
```

`document` et `window` sont injectables, avec fallback vers les globals navigateur. Cela permet un test sans navigateur réel.

Sans DOM/window utilisable, la fonction retourne un contrôleur sûr dont les méthodes modifient quand même l’état.

## Stockage

Deux contrats sont supportés sans dépendance directe :

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

Au montage, `hydrate=true` recharge le snapshot lorsqu’il existe. Les erreurs de lecture/écriture sont contenues et n’empêchent pas le panneau de fonctionner.

## Actions DOM standardisées

Un bouton ou contrôle peut exposer :

```html
<button data-panel-action="lock">…</button>
<button data-panel-action="pin">…</button>
<button data-panel-action="minimize">…</button>
<button data-panel-action="dock-left">…</button>
<button data-panel-action="dock-right">…</button>
<button data-panel-action="dock-top">…</button>
<button data-panel-action="dock-bottom">…</button>
<button data-panel-action="undock">…</button>
<button data-panel-action="close">…</button>
```

Les actions `lock`, `pin`, `minimize` reçoivent automatiquement `aria-pressed` cohérent avec l’état.

Le drag handle `[data-panel-bar]` reçoit un `aria-label` par défaut s’il n’en possède pas. Le resize handle `[data-panel-resize]` reçoit également un libellé accessible par défaut.

## Cycle open / close

`state.open` pilote `element.hidden`.

Le contrôleur expose :

- `open()` ;
- `close()` ;
- callback `onClose(snapshot)` lorsqu’une fermeture réelle se produit.

Toutes les mutations pilotées par le contrôleur exécutent `onChange(snapshot)` et tentent la sauvegarde.

## Docking

Avant chaque rendu, les propriétés CSS de docking (`left/right/top/bottom/width/height`) sont nettoyées afin qu’un `undock()` ne conserve aucun style d’un mode précédent.

Les quatre modes historiques sont conservés : gauche, droite, haut, bas.

Le moteur B `inspector-dock-layout.js` reste indépendant : il gère les plans overlay/push-content de l’Inspector ; FloatingPanel ne l’importe pas et ne le modifie pas.

## Destruction

`destroy()` est idempotent et retire :

- listener du drag handle ;
- listener du resize handle ;
- listeners globaux pointermove/pointerup ;
- listeners des contrôles `data-panel-action`.

Un drag en cours est abandonné.

## Vérification

Moteur exact publié/testé :

```text
c1e27023945de7fd31f829fc48baf594b256ea56
```

Test exact publié/testé :

```text
1e10e51de8b188c52c0db4cb9c93d1390dd36ff9
```

Node 22 :

```text
floating panel robustness tests: ok
```

Couverture : normalisation, docking invalide, guards lock/pin/dock, resize, stockage, actions/ARIA, déplacement et resize pointer, open/close, erreurs de stockage, mode no-DOM et destruction idempotente.

## HUMAN

La validation visuelle des poignées, icônes, densité et affordances dans une vraie démo reste une vérification UX séparée. Elle ne bloque pas l’intégration du contrat comportemental F1.
