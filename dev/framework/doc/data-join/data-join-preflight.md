# DataJoinPreflight

`DataJoinPreflight` est la frontière de contrôle **avant exécution** de la chaîne DataJoin. Il ne remplace ni `DataJoinSpec.diagnose()` ni `DataJoinExecutor` : il agrège le diagnostic existant et ajoute les risques de matérialisation que l'interface doit pouvoir afficher avant de lancer une jointure.

## Rôle

La chaîne recommandée devient :

`FieldCatalog → KeyMatcher/CompositeKeyMatcher → SuggestionSession → ConfigDraft → DataJoinSpec → DataJoinPreflight → DataJoinExecutor/Workspace`

Le préflight reste DOM-free, synchrone, non destructif et sans persistance des datasets.

## Contrôles

### Diagnostic métier existant

Le résultat reprend intégralement `DataJoinSpec.diagnose(leftRows, rightRows)` :

- lignes gauche/droite ;
- groupes appariés ;
- lignes matched/unmatched ;
- clés rejetées ;
- doublons ;
- cardinalité observée ;
- estimation du nombre de lignes de sortie ;
- warnings de cardinalité et d'explosion.

Les diagnostics de niveau `error` deviennent des blockers du préflight.

### Audit des valeurs matérialisables

Les lignes qui peuvent réellement être matérialisées par le type de jointure sont parcourues sans mutation afin de détecter avant `execute()` :

- nombres non finis ;
- objets/tableaux cycliques ;
- valeurs non JSON-like ;
- clés `__proto__`, `prototype`, `constructor`.

Ces erreurs reproduisent les familles d'erreurs que `DataJoinExecutor` refuserait au moment de cloner les lignes.

### Collisions de champs

Le moteur d'exécution fusionne les objets par **champs top-level**. Le préflight analyse les ensembles réels de champs gauche/droite, puis recalcule les groupes de clés avec les mêmes règles de comparaison que l'exécuteur afin de contrôler les **formes de lignes effectivement appariées**. Cela évite les faux négatifs qu'une simple union globale de schéma provoquerait en mode suffixe.

- `nested` : les overlaps restent isolés dans `{ left, right }` ; information seulement ;
- `error` : tout overlap top-level bloque avant exécution ;
- `leftWins` : les champs droits en overlap seront écrasés ; warning ;
- `rightWins` : les champs gauches en overlap seront écrasés ; warning ;
- `suffix` : projection exacte des noms de sortie, détection des collisions secondaires produites par les suffixes et des clés de sortie dangereuses.

Exemple de collision secondaire avec suffixe :

- gauche : `id`, `id_left` ;
- droite : `id` ;
- suffixe gauche : `_left`.

Le champ gauche `id` devient `id_left` et entre alors en collision avec le champ gauche `id_left` déjà présent. `DataJoinPreflight` retourne `JOIN_OUTPUT_KEY_COLLISION` avant l'exécuteur.

Les jointures `left-semi`, `left-anti`, `right-semi`, `right-anti` matérialisent une seule ligne source ; la politique de collision de paire est signalée comme non applicable.

## Gate

Le résultat contient :

- `gate: "ready"` : aucune erreur ni warning ;
- `gate: "warning"` : exécution possible mais arbitrage/revue utile ;
- `gate: "blocked"` : au moins une erreur préflight ;
- `ready` : vrai tant que le gate n'est pas `blocked` ;
- `executableWithoutWarnings` : vrai uniquement pour `ready`.

`maxOutputRows` est vérifié sur l'estimation du diagnostic. Un dépassement produit `OUTPUT_LIMIT_EXCEEDED` avant exécution.

## Contrat de sortie

Le résultat versionné `nlab.data-join-preflight` V1 contient :

- résumé du JoinSpec ;
- compteurs de lignes ;
- diagnostic DataJoin complet ;
- catalogue top-level gauche/droite et overlaps ;
- état de complétude du scan de champs ;
- échantillons bornés de projections de champs pour les formes appariées en mode `suffix` ;
- messages structurés `code/level/message/details` ;
- gate final.

Toutes les structures retournées sont des copies défensives.

## Bornes

Options :

- `maxOutputRows` : défaut `250000` ;
- `maxIssues` : défaut `100` ;
- `maxDistinctFields` : défaut `4096` par côté ;
- `maxShapePairs` : défaut `20000` formes gauche/droite distinctes réellement appariées.

Si le scan des formes appariées atteint `maxShapePairs`, `error` et `suffix` passent le gate à `blocked` (`SHAPE_PAIR_SCAN_LIMIT_EXCEEDED`) car le préflight ne peut plus certifier l'absence de collision. Pour les politiques non bloquantes (`nested`, `leftWins`, `rightWins`), le même cas reste un warning.

Si la limite de champs distincts est atteinte, le moteur émet `FIELD_SCAN_LIMIT_EXCEEDED`. L'exécuteur reste l'autorité finale au moment de l'exécution ; le préflight sert à déplacer les erreurs prévisibles dans l'étape de revue utilisateur.

## Intégration UI

Une future UI peut afficher :

1. le `gate` ;
2. les blockers ;
3. les warnings de cardinalité/explosion ;
4. les overlaps de champs ;
5. la projection suffixée ;
6. l'estimation de sortie.

Elle ne doit pas réimplémenter ces règles dans le DOM. Le DOM consomme le résultat du préflight et laisse `DataJoinExecutor` effectuer l'exécution réelle.
