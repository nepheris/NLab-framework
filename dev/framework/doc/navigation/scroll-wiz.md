# ScrollWiz — contrat SC1

## Rôle

`ScrollWiz` conserve les positions de scroll entre liens, onglets, panneaux ou vues identifiées par une clé stable, et formalise la visibilité du bouton « Retour en haut ».

Le moteur est DOM-free : il ne lit ni n’écrit directement `window.scrollX/scrollY` et n’appelle pas `scrollTo()`. NavigationWiz ou une couche applicative pourra consommer ses descripteurs ultérieurement.

## Positions par clé

```js
wiz.capture('tab:settings', {
  x: 0,
  y: 640,
  meta: { panel:'advanced' }
});
```

API :

- `capture(key, position)`
- `get(key, { fallback })`
- `has(key)`
- `clear(key)` / `clear()`
- `beforeNavigate(fromKey, position)`
- `restore(toKey)`
- `transition({ fromKey, toKey, position })`

Les coordonnées sont normalisées à `>= 0`. Les metadata sont clonées défensivement.

## Restauration

`restore()` retourne un descripteur :

```js
{
  key,
  x,
  y,
  behavior: 'auto' | 'smooth' | 'instant',
  found,
  meta
}
```

Si aucune position n’est connue, le fallback par défaut est `{x:0,y:0}` et `found=false`.

`transition()` combine capture de la vue quittée et restauration de la vue cible.

## Retour en haut

Politiques :

- `always` — bouton toujours visible ;
- `threshold` — visible à partir d’une distance configurable ;
- `never` — jamais visible.

Valeur par défaut : `threshold`, seuil `480`.

```js
wiz.shouldShowBackToTop({ y: 700 });
wiz.setBackToTop('threshold', { threshold: 300 });
wiz.backToTopDescriptor({ behavior:'smooth' });
```

Le descripteur Retour en haut est simplement :

```js
{ x:0, y:0, behavior:'smooth' }
```

La couche navigateur décide quand et comment l’appliquer.

## Persistance

Deux contrats injectables sont supportés :

- BrowserStorage nLab : `get/set` ;
- Web Storage : `getItem/setItem`.

Le snapshot persistant contient la politique, le seuil et toutes les positions connues.

Les erreurs de stockage sont contenues.

## Callbacks

`onChange` reçoit un snapshot lors de :

- `capture`
- `clear`
- changement de politique

Aucune dépendance EventBus n’est imposée.

## Erreurs structurées

- `KEY_REQUIRED`
- `INVALID_POLICY`

## Vérification

Node 22 :

```text
scroll wiz tests: ok
```

La suite couvre : capture/get, clone metadata, restore found/fallback, transition, trois politiques BackToTop, validation, clear, callbacks et hydratation Web Storage.

## Raccord futur

NavigationWiz, tabs et panneaux pourront utiliser une clé stable (`page:*`, `tab:*`, `panel:*`) et appliquer les descripteurs via `window.scrollTo()` dans un lot d’intégration séparé. SC1 ne modifie pas NavigationWiz, HeaderStudio ni la démo.
