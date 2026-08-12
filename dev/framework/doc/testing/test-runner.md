# nLab Framework — Test Runner

## Objectif

`dev/framework/tools/testing/run-tests.mjs` exécute les tests Node `*.test.mjs` du framework sans dépendance externe.

Le runner sert à la fois :

- au contrôle local avant PR ;
- aux scripts d'intégration ;
- à une future CI ;
- aux agents A/B/C pour produire un résultat reproductible avant de clôturer un lock.

## Découverte

La découverte est récursive à partir du dossier demandé.

Seuls les fichiers terminant par `.test.mjs` sont exécutés. Les entrées sont triées par nom à chaque niveau afin de conserver un ordre déterministe.

Un filtre `--match` accepte une expression régulière appliquée au chemin relatif du test.

## Exécution

Chaque test est lancé dans un processus Node séparé avec `process.execPath`.

Le runner capture :

- code de sortie ;
- signal ;
- durée ;
- stdout ;
- stderr.

Les tests sont exécutés séquentiellement. Cela privilégie la lisibilité et réduit les interactions indésirables entre tests qui manipulent des globals ou des fichiers temporaires.

## Résultat

Le résumé expose :

- `ok` ;
- dossier ;
- filtre ;
- mode fail-fast ;
- total découvert ;
- total exécuté ;
- passed / failed / skipped ;
- durée ;
- résultat de chaque test.

Un répertoire ne contenant aucun `*.test.mjs` est considéré en échec afin d'éviter qu'une mauvaise configuration CI ne soit validée silencieusement.

## Usage

Depuis la racine du dépôt :

```bash
node dev/framework/tools/testing/run-tests.mjs
```

Un autre dossier peut être fourni :

```bash
node dev/framework/tools/testing/run-tests.mjs dev/framework/tests
```

### Filtrer

```bash
node dev/framework/tools/testing/run-tests.mjs \
  dev/framework/tests \
  --match 'data|storage'
```

### Fail-fast

```bash
node dev/framework/tools/testing/run-tests.mjs \
  dev/framework/tests \
  --fail-fast
```

### JSON

```bash
node dev/framework/tools/testing/run-tests.mjs \
  dev/framework/tests \
  --json
```

La sortie JSON est adaptée à une consommation CI/machine.

### Verbose

`--verbose` retransmet stdout/stderr des tests pendant leur exécution en mode humain. Sans cette option, la sortie d'un test réussi reste silencieuse ; la sortie d'un test échoué est incluse dans le bilan humain.

## Codes de sortie CLI

- `0` — au moins un test découvert et aucun échec ;
- `1` — test en échec, aucun test trouvé ou erreur d'usage/exécution.

## API module

Le module exporte :

- `discoverTests()` ;
- `runTest()` ;
- `runTests()` ;
- `formatHuman()` ;
- `parseArgs()` ;
- `runCli()`.

Cela permet de composer le runner dans d'autres outils sans lancer le CLI.

## Tests du runner

`dev/framework/tests/test-runner.test.mjs` crée un répertoire temporaire contenant :

- tests passants ;
- test en échec ;
- test imbriqué ;
- fichier non-test à ignorer.

Il couvre découverte, filtre, fail-fast, bilan humain, sortie JSON, codes de sortie CLI et répertoire vide.

## Hors périmètre

Ce lot ne modifie aucun test métier existant, n'ajoute pas encore de workflow GitHub Actions et ne remplace pas les validations HUMAN de la démo.
