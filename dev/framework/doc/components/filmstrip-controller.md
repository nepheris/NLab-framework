# FilmstripController

Contrat DOM-free de navigation pour une pellicule/carrousel dont les contrôleurs visuels peuvent être remplacés sans modifier le moteur.

## Contrôleurs supportés

- `arrows` : précédent/suivant et états disabled ;
- `dots` : liste des positions et élément actif ;
- `scrollbar` : min/max/value/progression ;
- `slider` : même contrat numérique, rendu différent ;
- `thumbnails` : éléments indexés avec `selected` ;
- `counter` : position humaine `N / total`.

`setControllers()` change la combinaison active. Un renderer peut donc passer de flèches+dots à slider+compteur sans recréer la logique de navigation.

## Navigation

`go(index)`, `next()`, `previous()`, `first()` et `last()` utilisent :

- un comportement borné par défaut ;
- un modulo déterministe lorsque `loop:true`.

`setCount()` ajuste l'index courant si le nombre d'éléments change. `preserve:'start'` force le retour au premier élément.

## Descripteurs

`controller(type)` retourne un descripteur spécifique à un contrôleur actif. `descriptors()` retourne tous les contrôleurs actifs dans leur ordre configuré.

`controller(type)` retourne `null` si le type est valide mais non activé. Un type inconnu déclenche `FilmstripControllerError(INVALID_CONTROLLER)`.

## État

`snapshot()` expose :

- `count`, `index`, `loop`, `progress` ;
- contrôleurs actifs ;
- `canPrevious`, `canNext` ;
- metadata clonées défensivement.

`subscribe(listener)` reçoit les changements d'index, de nombre d'items, de boucle et de contrôleurs.

## Frontières

Ce lot n'implémente aucun HTML/CSS, drag, scrolling navigateur, autoplay, MediaWiz ou JsonStudio. Ces couches consommeront les descripteurs dans des lots d'intégration séparés.
