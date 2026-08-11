# RuntimeMonitor — contrat de robustesse

## Objectif

`RuntimeMonitor` fournit un mécanisme léger pour :

- chronométrer une opération (`start` / `end`) ;
- compter des événements (`count`) ;
- capturer des erreurs (`capture`) ;
- exposer un état ponctuel (`snapshot`) ;
- réinitialiser l'état (`clear`).

## Rétention des erreurs

`maxErrors` est normalisé à la construction :

- entier négatif → `0` ;
- valeur non finie ou non numérique → `100` ;
- `Infinity` reste illimité ;
- valeur décimale → entier inférieur après normalisation.

La file d'erreurs reste FIFO et ne dépasse jamais la limite finie configurée.

## Isolation des données

Les objets exposés par :

- `end()` ;
- `capture()` ;
- les événements `monitor:metric` / `monitor:error` ;
- `snapshot()`

sont des copies superficielles des données internes. Une mutation du résultat, du payload d'événement ou de l'objet `meta/context` source ne doit donc pas altérer l'état conservé par le monitor.

## Compteurs

`count(name, delta)` convertit `delta` en nombre et refuse les valeurs non finies avec une `TypeError`. Les deltas négatifs restent autorisés.

## Tests

`tests/runtime-monitor-robustness.test.mjs` couvre :

- timing + événement metric ;
- fin de marque inexistante ;
- compteurs et delta négatif ;
- delta non numérique ;
- capture `Error` et chaîne ;
- FIFO `maxErrors` ;
- `maxErrors=0`, négatif, `NaN`, `Infinity` ;
- isolation des snapshots / événements / objets source ;
- `clear()`.

Exécution locale du contenu exact du lot :

```text
runtime monitor robustness tests: ok
```
