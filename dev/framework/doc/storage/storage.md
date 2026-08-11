# BrowserStorage — contrat de robustesse

## Objectif

`BrowserStorage` encapsule un stockage compatible Web Storage avec namespace JSON. Une indisponibilité du stockage navigateur ne doit pas interrompre le framework.

## Construction

Le stockage peut être injecté explicitement.

Sans argument, `BrowserStorage` tente de résoudre `globalThis.localStorage`. L'accès est protégé car certains contextes navigateur peuvent lever une exception de sécurité dès la lecture de la propriété.

Si aucun stockage utilisable n'est disponible, l'instance reste valide :

- `get()` retourne le fallback ;
- `set()` et `remove()` retournent `false` ;
- `clear()` ne lève pas d'exception.

## Namespace

`prefix` vaut `nlab:` par défaut. `key(name)` concatène le préfixe et le nom normalisé en chaîne.

`clear()` ne tente de supprimer que les clés commençant par le préfixe courant.

## Lecture

`get(name, fallback)` retourne le fallback lorsque :

- le stockage est absent ;
- `getItem` est absent ou lève une exception ;
- la clé est absente ;
- la valeur n'est pas un JSON valide.

## Écriture

`set(name, value)` retourne `false` lorsque :

- le stockage ou `setItem` est absent ;
- `JSON.stringify` échoue, par exemple structure circulaire ou `BigInt` ;
- la sérialisation retourne `undefined` ;
- `setItem` lève une erreur de quota ou de sécurité.

Une écriture réussie retourne `true`.

## Suppression

`remove(name)` conserve le contrat booléen et neutralise les erreurs du provider.

`clear()` est best-effort : une erreur sur une clé ou une suppression n'empêche pas la tentative de traitement des autres clés du namespace. Une erreur de lecture globale de `length` arrête simplement le nettoyage.

## Tests

`dev/framework/tests/storage-robustness.test.mjs` couvre :

- lecture/écriture/suppression nominales ;
- isolation par préfixe ;
- stockage absent ;
- JSON circulaire, `undefined`, `BigInt` ;
- exceptions `getItem/setItem/removeItem` ;
- exception de lecture `length` ;
- erreurs partielles pendant `clear()` ;
- getter `globalThis.localStorage` qui lève une erreur de sécurité.

## Hors périmètre

Ce lot ne change pas la stratégie de persistance, n'ajoute ni IndexedDB ni synchronisation distante, et ne touche pas URL Resolver, Search/Filter, la démo ou les fichiers réservés A/B.
