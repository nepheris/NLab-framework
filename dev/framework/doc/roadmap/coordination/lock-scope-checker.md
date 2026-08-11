# Contrôleur de chevauchement des locks

## Pourquoi

Le protocole multi-agent impose de vérifier tous les `file_scope` avant de réserver une tâche. Un incident réel a montré qu'une vérification uniquement par `task_id` ne suffit pas :

- B avait réservé `8B-DATA-SOURCE-ROBUSTNESS` ;
- C a ensuite créé `8B-DATA-SOURCE-CONTRACT` ;
- les IDs étaient différents, mais les deux scopes contenaient `dev/framework/core/data-source.js`.

Git/GitHub ont empêché la perte de données et B a libéré son lock, mais la collision aurait dû être détectée **avant** la seconde réservation.

## Outil

`dev/framework/tools/coordination/check-lock-overlaps.mjs`

Le script lit les fichiers JSON d'un dossier de locks et compare les `file_scope` des tâches considérées occupées.

Statuts occupés :

- `reserved` ;
- `in_progress` ;
- `blocked` ;
- `review`.

Statuts libérés pour le contrôle :

- `done` ;
- `released`.

Le statut `review` reste considéré occupé afin d'éviter qu'une autre branche modifie les mêmes fichiers avant intégration/clôture.

## Audit global

```bash
node dev/framework/tools/coordination/check-lock-overlaps.mjs \
  dev/framework/doc/roadmap/coordination/locks
```

Le code de sortie vaut :

- `0` : aucun chevauchement ;
- `2` : au moins un chevauchement actif ;
- `1` : erreur de lecture/parsing/usage.

## Contrôle d'un candidat

Préparer le lock candidat dans un fichier temporaire **avant de le créer dans `locks/`**, puis exécuter :

```bash
node dev/framework/tools/coordination/check-lock-overlaps.mjs \
  dev/framework/doc/roadmap/coordination/locks \
  /tmp/candidate-lock.json
```

Le script compare le candidat aux locks occupés existants en ignorant uniquement un lock portant le même `task_id`.

## Globs

Les scopes exacts et les globs simples `*`, `**`, `?` sont compris.

Cas couverts :

- exact ↔ exact ;
- exact ↔ glob ;
- glob ↔ glob.

Pour deux globs, l'algorithme est volontairement conservateur : si leurs préfixes littéraux sont compatibles, il considère qu'un chevauchement est possible. Un faux positif est préférable à deux agents modifiant silencieusement le même fichier.

## Sortie

La sortie JSON contient :

- `ok` ;
- `mode` (`audit` ou `candidate`) ;
- nombre de locks occupés ;
- résumé du candidat si applicable ;
- collisions avec agents, statuts, branches et paires de scopes concernées.

## Discipline recommandée

Avant toute réservation :

1. créer le JSON candidat hors du dossier `locks/` ;
2. exécuter le checker en mode candidat ;
3. si `ok:true`, créer le lock atomique ;
4. si conflit, relire le lock propriétaire et choisir une autre tâche ou coordonner explicitement la succession ;
5. après réservation, continuer les contrôles HEAD/diff habituels.

Le checker complète Git et le verrou atomique ; il ne les remplace pas.

## Tests

`dev/framework/tests/coordination-lock-overlaps.test.mjs` reproduit notamment la collision DataSource B/C et vérifie :

- scopes exacts ;
- scopes glob ;
- statuts occupés/libérés ;
- audit global ;
- mode candidat ;
- même `task_id` ignoré ;
- chargement du dossier ;
- fichier JSON invalide.
