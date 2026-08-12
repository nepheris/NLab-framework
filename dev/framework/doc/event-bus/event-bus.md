# EventBus — contrat de robustesse

## Objectif

`EventBus` fournit un bus d'événements synchrone léger avec listeners nommés, wildcard `*`, abonnement ponctuel et isolation des erreurs consommateurs.

## Noms d'événement

Les noms doivent être des chaînes non vides. Ils sont normalisés par `trim()` pour que `" ready "` et `"ready"` désignent le même bucket.

Un nom vide ou non chaîne est rejeté explicitement.

## Abonnements

- `on(name, listener)` ajoute un listener et retourne une fonction de désabonnement ;
- le même listener ajouté plusieurs fois au même événement reste unique grâce au `Set` ;
- `once(name, listener)` se désabonne **avant** d'appeler le consumer, de sorte qu'une exception du consumer ne réactive pas l'abonnement ;
- `off(name, listener)` retire un listener précis ;
- `off(name)` retire tout le bucket ;
- les opérations `off` retournent un booléen indiquant si une suppression a eu lieu.

## Dispatch

`emit(name, payload, meta)` construit une enveloppe :

- `name` normalisé ;
- `payload` ;
- `meta` ;
- `timestamp` fourni par la clock du bus.

Les listeners exacts sont suivis des listeners wildcard. La liste est snapshotée avant exécution : un listener ajouté pendant un `emit()` ne reçoit que le tour suivant.

Chaque erreur de listener est capturée dans `errors` sans empêcher les autres listeners de s'exécuter.

Le résultat expose :

- `delivered` : nombre de tentatives de livraison ;
- `errors` : erreurs capturées ;
- `event` : enveloppe émise.

`emit('*')` ne concatène pas deux fois le bucket wildcard.

## Clock injectable

Le constructeur accepte `clock`, fonction utilisée pour produire le timestamp. La valeur par défaut est `Date.now()`.

Cette injection permet des tests déterministes sans changer le comportement nominal.

## Introspection et nettoyage

- `listenerCount(name)` retourne le nombre de listeners d'un événement ;
- `listenerCount()` retourne le total ;
- `events()` liste les buckets non vides ;
- `clear(name)` supprime un bucket et retourne le nombre de listeners retirés ;
- `clear()` vide le bus et retourne le nombre total retiré.

## Tests

`dev/framework/tests/event-bus-robustness.test.mjs` couvre :

- normalisation des noms ;
- listeners exacts et wildcard ;
- isolation des erreurs ;
- `once()` fautif ;
- snapshot des listeners ;
- déduplication par `Set` ;
- cas `emit('*')` ;
- `off`, `clear`, `listenerCount`, `events` ;
- validation des entrées ;
- clock déterministe.

## Hors périmètre

Ce lot ne transforme pas EventBus en système asynchrone, ne définit pas de priorité de listeners et ne modifie ni la démo, ni StateStore, ni les fichiers réservés A/B.
