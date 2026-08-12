# NotificationCenter — contrat de composant

## Objectif

`NotificationCenter` fournit une pile légère de notifications applicatives sans rendre le runtime dépendant de la présence du DOM ni d'une bibliothèque externe.

## Niveaux supportés

Le contrat public couvre :

- `info` ;
- `success` ;
- `warning` ;
- `error` ;
- `dev`.

`danger()` est conservé comme alias rétrocompatible de `error()`.

Un type inconnu est normalisé vers `info`.

## Compatibilité sans DOM

Le constructeur accepte `documentRef` et `root`.

Si aucun DOM utilisable n'est disponible :

- `mount()` retourne `null` ;
- `show()` et les helpers de niveau retournent `null` ;
- aucune exception `document is not defined` ne doit être levée.

Cela permet l'import et l'utilisation défensive du composant dans des tests Node, des outils de génération ou des contextes SSR.

## Cycle de vie

- `show(message, options)` ajoute une notification ;
- `dismiss(node)` retire une notification avec la transition de sortie ;
- `dismiss(node, { immediate: true })` retire immédiatement ;
- `clear()` vide la pile et retourne le nombre d'éléments retirés ;
- `destroy()` vide la pile, retire le host et remet l'instance à l'état non monté.

`duration: 0` ou `persistent: true` désactive l'auto-dismiss pour la notification concernée.

## Limite de pile

`maxItems` vaut `5` par défaut.

Lorsque la limite est dépassée, les notifications les plus anciennes sont retirées en premier. Cette règle évite une accumulation illimitée lors d'une rafale d'événements.

## Accessibilité

Le host utilise :

- `aria-live="polite"` ;
- `aria-relevant="additions removals"`.

Les notifications `warning` et `error` utilisent `role="alert"`. Les autres niveaux utilisent `role="status"`.

## Variables de thème

Les couleurs peuvent être pilotées avec :

- `--nlab-notification-info` ;
- `--nlab-notification-success` ;
- `--nlab-notification-warning` ;
- `--nlab-notification-error` ;
- `--nlab-notification-dev`.

Chaque variable conserve un fallback vers les anciennes variables génériques (`--nlab-info`, `--nlab-success`, `--nlab-warning`, `--nlab-danger`, `--nlab-dev`) puis vers une couleur par défaut.

## Tests

`dev/framework/tests/notification-center.test.mjs` couvre :

- import/utilisation sans DOM ;
- montage idempotent ;
- niveaux et alias `danger → error` ;
- rôles ARIA ;
- variables de thème ;
- limite `maxItems` ;
- `dismiss` ;
- `clear` ;
- normalisation d'un type inconnu ;
- `destroy`.

## Hors périmètre

Ce composant ne décide pas de la politique métier d'affichage des notifications et ne modifie ni la démo active, ni Theme Workshop, ni les chantiers réservés A/B. Le raccord visuel global reste piloté par le thème et les intégrations consommatrices.
