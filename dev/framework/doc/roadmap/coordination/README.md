# nLab Web Framework — coordination multi-agent

Ce dossier est le **plan de contrôle partagé** entre les agents qui travaillent en parallèle sur le Web Framework.

## Principe

Chaque action de roadmap doit être **réservée avant modification** par la création d'un fichier unique dans `locks/`.

Exemple :

`locks/8B-TABLEWIZ-LEGACY-EXTRACTION.json`

La création du fichier est volontairement utilisée comme verrou atomique : si le fichier existe déjà, un second agent ne doit pas prendre la tâche.

## Règles obligatoires

1. Lire `coordination/locks/` avant de choisir une action.
2. Vérifier aussi les `file_scope` des verrous actifs afin d'éviter deux tâches différentes touchant le même fichier.
3. Réserver l'action avec un fichier `locks/<TASK-ID>.json` avant le premier changement.
4. Un verrou contient au minimum : `task_id`, `agent`, `status`, `branch`, `file_scope`, `reserved_at`, `base`.
5. Utiliser une branche dédiée pour tout chantier substantiel (`agent-a/...`, `agent-b/...` ou branche de review explicitement réservée).
6. Ne modifier **aucun fichier** présent dans le `file_scope` d'un autre verrou `reserved` ou `in_progress`.
7. Un commit doit rester **mono-action** : uniquement les fichiers nécessaires à la tâche réservée ; pas de reformatage ou de correction opportuniste hors périmètre.
8. Avant intégration, comparer la branche à sa base et vérifier que les fichiers modifiés restent dans le périmètre annoncé.
9. Une tâche terminée n'est pas supprimée : son verrou passe à `done` avec le SHA final. On conserve ainsi l'historique d'attribution.
10. Si une tâche change d'agent, le verrou existant est mis à jour explicitement ; aucun second verrou concurrent n'est créé.

## Statuts

- `reserved` : prise mais pas encore modifiée ;
- `in_progress` : modifications en cours ;
- `blocked` : dépendance externe ou validation humaine ;
- `review` : prête à être relue/testée ;
- `done` : terminée et intégrée ou livrée ;
- `released` : abandonnée et disponible pour réattribution.

## Discipline Git

Le mécanisme de verrou ne remplace pas Git : il empêche les collisions **avant** qu'elles n'arrivent.

Pour réduire encore les conflits :

- une branche par chantier ;
- commits petits et cohérents ;
- pas de commit global de fichiers non modifiés par la tâche ;
- pas d'édition simultanée de `roadmap.md` par plusieurs agents : les agents écrivent d'abord dans leur verrou/fiche de tâche, puis la roadmap canonique est consolidée séparément ;
- les previews et snapshots restent immuables après publication.

## Convention des agents

- `A` : agent de la session principale actuelle ;
- `B` : second agent parallèle ;
- d'autres identifiants peuvent être ajoutés sans changer le protocole.

## Exemple de verrou

```json
{
  "task_id": "8B-TABLEWIZ-LEGACY-EXTRACTION",
  "agent": "A",
  "status": "in_progress",
  "base": "de21ec85170112efb23c4d5c987502b9e49dd966",
  "branch": "agent-a/tablewiz-legacy-from-v16",
  "file_scope": [
    "dev/framework/wiz/table-wiz.js",
    "dev/framework/tests/table-wiz*.mjs"
  ],
  "reserved_at": "2026-08-11T23:58:00+02:00"
}
```
