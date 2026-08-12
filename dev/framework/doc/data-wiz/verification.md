# DataWiz — vérification D1

## Moteur exact

Le moteur testé localement correspond exactement au blob GitHub publié sur `agent-a/datawiz-convergence` :

```text
46118da7e264b3283573a933cb9a209c5556f5f4
```

## Node 22

```text
data wiz convergence tests: ok
data ux DataWiz compatibility: ok
```

La seconde vérification reprend les assertions DataWiz historiques de `dev/framework/tests/data-ux.test.mjs` :

- `describe(...).fields.score.numeric.max === 12` ;
- le groupe `dessert` obtenu par `groupBy()` contient deux lignes.

## Git

Checkpoint avant PR :

- `ahead_by: 3` ;
- `behind_by: 0` ;
- trois fichiers modifiés/ajoutés ;
- tous dans le `file_scope` `8B-DATAWIZ-CONVERGENCE`.

Aucun fichier TableWiz, JsonStudio, Header, V20, Inspector ou CodeBlock n’est modifié.
