# nLab Web Framework — coordination multi-agent

Ce dossier est le **plan de contrôle partagé** entre les agents qui travaillent en parallèle sur le Web Framework.

## Principe

Chaque action de roadmap doit être **réservée avant modification** par la création d'un fichier unique dans `locks/`.

Exemple :

`locks/8B-TABLEWIZ-LEGACY-EXTRACTION.json`

La création du fichier est volontairement utilisée comme verrou atomique : si le fichier existe déjà, un second agent ne doit pas prendre la tâche.

Le suivi humain est complété par [`agent-board.md`](./agent-board.md), qui reprend les locks sous forme de tableau coloré A/B/C. **En cas d'écart, le lock JSON prime toujours.**

Le ticket GitHub central reste **Issue #1 — Coordination agents — finalisation parallèle du framework** ; il sert de point de discussion, tandis que les locks + la roadmap constituent le contrôle opérationnel.

## Couleurs des agents

La couleur est dérivée du champ `agent` du lock ; il n'est pas nécessaire de dupliquer une valeur `color` dans chaque JSON.

- 🟦 `A` — Agent A ;
- 🟩 `B` — Agent B ;
- 🟧 `C` — Agent C ;
- 🟣👤 `HUMAN` — validation humaine ;
- ⚪ `Libre` — aucune réservation active après contrôle des locks, branches et du HEAD.

Les couleurs d'agent sont des **carrés** afin de ne pas les confondre avec les cercles de statut de la roadmap (`🟢` terminé, `🟡` en cours, etc.).

### Persistance de l'attribution

La couleur du propriétaire **ne disparaît pas quand une tâche passe à `done`**.

- `🟦 A ✅` = tâche terminée par A ;
- `🟩 B ✅` = tâche terminée par B ;
- `🟧 C ✅` = tâche terminée par C.

La roadmap et `agent-board.md` doivent conserver cette attribution afin de savoir, a posteriori, qui a réalisé chaque chantier et d'améliorer le découpage des futurs travaux parallèles. Les tâches historiques antérieures au protocole de locks ne sont pas attribuées rétroactivement sans preuve Git/lock/PR fiable.

## Règles obligatoires

1. Lire `coordination/locks/` avant de choisir une action.
2. Vérifier **tous les agents A/B/C** et les `file_scope` de leurs verrous actifs afin d'éviter deux tâches différentes touchant le même fichier.
3. Vérifier aussi les branches `agent-a/*`, `agent-b/*`, `agent-c/*` et le HEAD de `New` lorsqu'une réservation vient d'être créée ou semble absente du tableau.
4. Réserver l'action avec un fichier `locks/<TASK-ID>.json` avant le premier changement.
5. Un verrou contient au minimum : `task_id`, `agent`, `status`, `branch`, `file_scope`, `reserved_at`, `base`.
6. **Après création du lock et avant création de la branche**, relire le dossier de locks complet : deux tâches de noms différents peuvent viser le même fichier.
7. Utiliser une branche dédiée pour tout chantier substantiel (`agent-a/...`, `agent-b/...`, `agent-c/...` ou branche de review explicitement réservée).
8. Ne modifier **aucun fichier** présent dans le `file_scope` d'un autre verrou `reserved`, `in_progress` ou `review` tant que ce verrou n'est pas explicitement libéré ou réattribué.
9. Si deux locks actifs se chevauchent malgré les contrôles, **le lock actif le plus ancien sur le `file_scope` a priorité**. Le second agent arrête le chantier, ne fusionne rien et passe son lock à `released` ou `blocked` avec une note de collision.
10. Un commit doit rester **mono-action** : uniquement les fichiers nécessaires à la tâche réservée ; pas de reformatage ou de correction opportuniste hors périmètre.
11. Avant intégration, comparer la branche à sa base, relire **tous les locks actifs une nouvelle fois** et vérifier que les fichiers modifiés restent dans le périmètre annoncé.
12. Si `New` a modifié un fichier du `file_scope` depuis la réservation, identifier le propriétaire avant PR ; ne jamais fusionner par-dessus sans réconciliation explicite.
13. Une tâche terminée n'est pas supprimée : son verrou passe à `done` avec le SHA final. On conserve ainsi l'historique d'attribution.
14. Si une tâche change d'agent, le verrou existant est mis à jour explicitement ; aucun second verrou concurrent n'est créé.
15. Après création ou changement d'état d'un lock, le tableau multi-agent doit être rafraîchi dès que le mutex documentaire est disponible.
16. Après intégration d'une tâche, conserver la **pastille de l'agent + `✅`** dans la roadmap et le tableau historique.

### Incident de référence — DataSource

Le 12/08/2026, deux locks de noms différents ont couvert `core/data-source.js` en parallèle. Le chantier B antérieur a détecté la modification de `New` avant PR et n'a pas été fusionné ; la PR #24 de C a été conservée et créditée à C. Cet incident confirme que le contrôle doit porter sur les **`file_scope`**, pas seulement sur les IDs de tâches.

## Statuts

- 🔒 `reserved` : prise mais pas encore modifiée ;
- 🛠️ `in_progress` : modifications en cours ;
- ⛔ `blocked` : dépendance externe ou validation humaine ;
- 👀 `review` : prête à être relue/testée ;
- ✅ `done` : terminée et intégrée ou livrée ;
- ♻️ `released` : abandonnée ou terminée côté réservation et disponible pour réattribution.

## Discipline Git

Le mécanisme de verrou ne remplace pas Git : il empêche les collisions **avant** qu'elles n'arrivent.

Pour réduire encore les conflits :

- une branche par chantier ;
- commits petits et cohérents ;
- pas de commit global de fichiers non modifiés par la tâche ;
- pas d'édition simultanée de `roadmap.md`, `agent-board.md` ou de cette procédure par plusieurs agents ;
- les previews et snapshots restent immuables après publication.

## Mutex roadmap / tableau multi-agent

Le verrou persistant suivant protège les fichiers de pilotage partagés :

`locks/COORD-ROADMAP-AGENT-DASHBOARD.json`

Son `file_scope` couvre :

- `dev/framework/doc/roadmap/roadmap.md` ;
- `dev/framework/doc/roadmap/coordination/README.md` ;
- `dev/framework/doc/roadmap/coordination/agent-board.md`.

Procédure :

1. lire le mutex avant d'éditer un de ces fichiers ;
2. s'il est `in_progress` chez un autre agent, ne pas éditer le pilotage ;
3. s'il est `released` ou `done`, mettre à jour **ce même lock** à son nom, statut `in_progress`, avant édition ;
4. rafraîchir la roadmap et `agent-board.md` depuis les locks réels ;
5. conserver dans les lignes `done` la couleur de l'agent qui a livré ;
6. passer ensuite le mutex à `released` avec le SHA de sortie.

Les agents peuvent continuer leurs chantiers métier pendant qu'un autre agent possède le mutex documentaire : seuls les fichiers de pilotage sont sérialisés.

## Convention des agents

- 🟦 `A` : agent A / session principale de construction UX et chantiers qu'il verrouille ;
- 🟩 `B` : agent B / second agent parallèle et chantiers qu'il verrouille ;
- 🟧 `C` : agent C / troisième agent parallèle et chantiers qu'il verrouille.

La lettre n'implique pas un type de tâche permanent : **le lock est l'autorité**. Un agent peut prendre tout lot libre compatible avec les règles de collision.

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
