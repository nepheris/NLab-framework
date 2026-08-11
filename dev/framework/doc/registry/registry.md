# FrameworkRegistry — contrat de robustesse

## Objectif

`FrameworkRegistry` stocke les services, composants, wiz, providers, adapters, renderers, icônes, thèmes et aides par namespace. Les opérations de lecture ne doivent pas modifier la structure du registre.

## Clés

Les namespaces et IDs doivent être des chaînes non vides. Ils sont normalisés par `trim()`.

Un namespace ou ID vide/non chaîne est rejeté explicitement.

## Création de namespace

`namespace(name)` conserve son rôle historique : il retourne le bucket et le crée s'il n'existe pas.

En revanche, les opérations de lecture/suppression ne passent plus par `namespace()` :

- `get` ;
- `has` ;
- `list` ;
- `remove` ;
- `size`.

Ainsi, consulter un namespace inconnu ne crée plus de bucket fantôme.

## Valeurs et fallback

`get(namespace, id, fallback)` teste désormais la présence avec `Map.has()`.

Une valeur enregistrée égale à `null` ou `undefined` reste donc une valeur réelle et n'est pas remplacée par le fallback. Le fallback n'est utilisé que lorsque l'entrée est absente.

## Écriture

`register(namespace, id, value)` refuse par défaut un ID déjà présent.

`register(..., { replace: true })` remplace explicitement l'entrée existante.

Le registre conserve les valeurs par référence : classes, fonctions, instances et objets peuvent être enregistrés sans clonage.

## Suppression et nettoyage

`remove(namespace, id)` retourne un booléen. Lorsque la dernière entrée d'un namespace est supprimée, le bucket vide est également retiré.

`clear(namespace)` supprime un namespace et retourne le nombre d'entrées retirées.

`clear()` vide le registre et retourne le nombre total d'entrées retirées.

## Introspection

- `namespaceNames()` retourne les namespaces réellement présents ;
- `size(namespace)` retourne la taille d'un bucket ;
- `size()` retourne le nombre total d'entrées.

## Tests

`dev/framework/tests/registry-robustness.test.mjs` couvre :

- lectures inconnues sans création de namespace ;
- normalisation des clés ;
- register / replace ;
- distinction valeurs `null`/`undefined` et fallback ;
- list / has / get ;
- pruning d'un namespace vide ;
- clear ciblé/global et compteurs ;
- validation namespace/id ;
- constantes `REGISTRY_NAMESPACES`.

## Hors périmètre

Ce lot ne limite pas les namespaces aux constantes officielles et ne change pas la nature des valeurs stockées. Il ne modifie ni le bootstrap du framework, ni la démo, ni les fichiers réservés A/B.
