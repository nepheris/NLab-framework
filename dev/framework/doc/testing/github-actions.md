# GitHub Actions — tests du nLab Web Framework

## Objectif

Le workflow `.github/workflows/nlab-framework-tests.yml` fournit un point d'exécution GitHub pour la suite Node du framework en réutilisant le runner intégré par le lot `8B-TEST-RUNNER`.

Cette première version est volontairement **manuelle uniquement** (`workflow_dispatch`). Elle ne s'exécute pas automatiquement sur `push` ou `pull_request` afin de ne pas transformer immédiatement un outil de diagnostic en gate bloquante pour les branches parallèles A/B/C.

## Lancement

Dans GitHub Actions, sélectionner **nLab Framework Tests**, puis **Run workflow**.

Deux paramètres sont disponibles :

- `match` — expression régulière facultative appliquée aux chemins des tests ;
- `fail_fast` — arrête la suite après le premier test en échec.

Sans paramètre, le workflow lance :

```bash
node dev/framework/tools/testing/run-tests.mjs dev/framework/tests
```

## Environnement

Le job utilise :

- `ubuntu-latest` ;
- `actions/checkout@v4` ;
- `actions/setup-node@v4` ;
- Node.js 22 ;
- permissions minimales `contents: read` ;
- timeout de 15 minutes.

Aucune installation de dépendance n'est nécessaire pour le runner actuel, qui repose uniquement sur les modules Node standards.

## Concurrence

Le groupe de concurrence est lié à `github.ref`. Deux lancements manuels sur la même ref ne sont pas annulés automatiquement (`cancel-in-progress: false`) afin de conserver les traces de diagnostics déclenchés volontairement.

## Passage futur en gate automatique

L'activation sur `pull_request` ou `push` doit rester une tâche distincte. Avant de l'activer, vérifier :

1. qu'une exécution complète sur le HEAD de référence est verte ;
2. que les tests ne dépendent pas d'un environnement local non reproduit dans GitHub Actions ;
3. que le temps d'exécution est compatible avec le workflow parallèle A/B/C ;
4. quels chemins doivent déclencher la suite ;
5. si le check devient requis par une règle de protection de branche.

Cette séparation évite de bloquer les PR de travail pendant la phase actuelle d'industrialisation.

## Hors périmètre

Ce lot :

- n'ajoute pas de trigger automatique ;
- ne modifie aucun test existant ;
- ne change pas les règles de protection de branche ;
- ne publie pas d'artefact de test ;
- ne modifie pas la démo ou les fichiers A/B.
