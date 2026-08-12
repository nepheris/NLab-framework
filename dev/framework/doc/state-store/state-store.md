# StateStore — contrat de robustesse

## Objectif

`StateStore` fournit un état cloné, adressable par chemins pointés, persistable et observable. Les mutations doivent rester déterministes même lorsque le stockage ou un listener externe échoue.

## État initial

`initialState` doit être un objet. Les defaults et l'état courant sont clonés afin qu'une mutation extérieure ne modifie pas le store.

## Chemins

Les opérations de mutation utilisent des chemins `a.b.c` non vides.

Sont rejetés :

- chemin vide ;
- segment vide (`a..b`) ;
- `__proto__` ;
- `prototype` ;
- `constructor`.

Cette validation empêche l'écriture par chemin de polluer les prototypes JavaScript.

`get()` sans chemin retourne un clone de l'état complet. Pour compatibilité défensive, un chemin invalide passé à `get()` retourne le fallback au lieu de muter ou lever.

## Mutation

`set(path, value)` crée les objets intermédiaires nécessaires. Si un intermédiaire existant est primitif, il est remplacé par un objet afin que l'écriture imbriquée soit déterministe.

`update(path, updater)` conserve le contrat existant et applique le résultat via `set()`.

## Reset

`reset()` restaure l'ensemble des defaults.

`reset(path)` :

- restaure la valeur du chemin depuis les defaults si elle existe ;
- supprime la clé courante si aucun default n'existe pour ce chemin ;
- n'émet qu'une seule notification pour le chemin ciblé.

Le double signal historique provoqué par `reset(path)` puis `set()` est supprimé.

## Abonnements

`subscribe(path, listener)` accepte un chemin exact ou `*`.

Les snapshots fournis aux listeners sont clonés. Une exception levée par un listener est isolée : elle ne bloque pas les autres listeners ni la persistance de la mutation.

La fonction retournée par `subscribe()` désabonne le listener.

## Hydratation

Lorsque `storage` et `storageKey` sont fournis, l'hydratation fusionne profondément les objets sauvegardés avec les defaults : une préférence imbriquée sauvegardée ne fait plus disparaître les autres valeurs par défaut du même objet.

Les segments dangereux présents dans un objet sauvegardé sont ignorés pendant la fusion.

Une exception du provider de stockage laisse les defaults intacts.

## Persistance

La persistance reste optionnelle. Une exception de `storage.set()` est neutralisée afin qu'une mutation déjà appliquée au state ne fasse pas échouer l'application.

## Tests

`dev/framework/tests/state-store-robustness.test.mjs` couvre :

- clonage et lecture imbriquée ;
- set/update ;
- remplacement d'un intermédiaire primitif ;
- chemins invalides et protection anti-prototype-pollution ;
- listener fautif isolé ;
- reset ciblé sans double notification ;
- suppression d'une clé sans default ;
- reset global ;
- hydratation profonde ;
- objet sauvegardé contenant `__proto__` ;
- provider de stockage en erreur ;
- validation du state initial et des abonnements.

## Hors périmètre

Ce lot ne change pas la sémantique de routage des événements, n'ajoute pas de transactions multi-path ni de middleware. Il ne touche pas la démo, Theme Workshop, Header, TableWiz ou les fichiers réservés A/B.
