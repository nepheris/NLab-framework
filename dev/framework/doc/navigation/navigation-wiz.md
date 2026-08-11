# NavigationWiz — contrat de navigation

## Objectif

`NavigationWiz` construit une navigation hiérarchique depuis des titres de contenu, rend un sommaire pliable, suit la section visible et restaure une ancre. Le composant doit pouvoir être importé/testé hors navigateur sans dépendance implicite à `document` ou `IntersectionObserver`.

## Construction de l'arbre

`buildTree()` :

- cherche `contentSelector` dans `root` ;
- collecte les titres correspondant à `headingSelector` ;
- conserve les IDs existants ;
- génère des IDs `section-N` uniquement pour les titres sans ID ;
- évite qu'un ID généré entre en collision avec un ID déjà présent ;
- construit la hiérarchie selon le niveau H1…H6.

Si `root` ou le contenu n'est pas disponible, la méthode retourne `[]` et remet `items` à vide.

## Rendu

`render(container, tree)` utilise en priorité `container.ownerDocument`, puis le document injecté. Il ne lit plus directement le `document` global.

Sans document capable de créer des éléments ou sans `replaceChildren`, la méthode retourne l'instance sans lever d'exception.

Le comportement historique est conservé :

- liste `<ul>` ;
- liens vers `#id` ;
- nœuds parents sous `<details>` ;
- niveaux 1 et 2 ouverts par défaut.

## Profondeur

- `expandAll()` ouvre tous les `<details>` ;
- `collapseAll()` les ferme ;
- `setDepth(n)` ouvre les groupes dont le niveau est inférieur ou égal à `n` ;
- `defaultState()` applique une profondeur 2.

Toutes ces méthodes sont défensives si aucun conteneur n'est monté.

## Observation de la section active

Le constructeur accepte `intersectionObserverClass` pour injection/test.

`observe()` :

1. utilise la classe injectée ou `globalThis.IntersectionObserver` ;
2. déconnecte un observer précédent avant d'en créer un nouveau ;
3. observe les éléments présents dans `items` ;
4. active le lien correspondant à l'entrée visible la plus haute ;
5. tolère les entrées incomplètes sans interrompre la page.

Sans API Observer ou sans conteneur exploitable, la méthode ne fait rien et retourne l'instance.

## Restauration d'ancre

`restore(hash)` :

- accepte un hash avec ou sans `#` ;
- protège `decodeURIComponent` contre les encodages invalides ;
- cherche d'abord la cible dans `items`, puis via `root.getElementById` si disponible ;
- appelle `scrollIntoView({ block: 'start' })` lorsque la cible existe ;
- retourne `true` si une cible a été trouvée, sinon `false`.

Un hash mal encodé ne doit jamais provoquer d'exception.

## Cycle de vie

`destroy()` déconnecte l'observer, remet `observer` et `container` à `null`, puis retourne l'instance.

## Tests

`dev/framework/tests/navigation-wiz.test.mjs` couvre :

- fonctionnement sans DOM ;
- construction hiérarchique H1/H2/H3 ;
- génération d'IDs sans collision ;
- rendu et liens ;
- expand/collapse/depth ;
- injection et remplacement d'IntersectionObserver ;
- activation du lien visible ;
- restauration d'ancre ;
- hash mal encodé ;
- nettoyage par `destroy()`.

## Hors périmètre

Ce lot ne modifie ni la navigation visuelle de la démo active, ni Header Studio, ni Theme Workshop. Il fiabilise uniquement le contrat générique de `NavigationWiz` pour les futurs consommateurs du framework.
