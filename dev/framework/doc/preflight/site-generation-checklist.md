# Generic site generation checklist

Ce contrat prépare la **checklist de génération** autorisée en travail parallèle par le préflight Lot 9, sans exécuter de génération et sans introduire de logique métier dans le Framework.

Contrat machine :

`dev/framework/data/site-generation-checklist.schema.json`

Fixture générique :

`dev/framework/tests/fixtures/site-generation-checklist.json`

## Stages de référence

La fixture couvre onze stages génériques :

1. `preflight` — vérifier les gates et prérequis ;
2. `data-load` — charger les sources via les providers déclarés ;
3. `validation` — appliquer les contrats de données ;
4. `relations` — résoudre les références ;
5. `render` — produire les pages/composants ;
6. `assets` — préparer/copier les assets ;
7. `routes` — construire les routes publiques ;
8. `output` — assembler la sortie `web/` ;
9. `preview` — rendre la sortie consultable ;
10. `comparison` — comparer avec une référence lorsque disponible ;
11. `report` — produire le compte rendu de génération.

La liste est un **checklist de référence**, pas l'implémentation d'un moteur. Un projet peut définir une autre checklist compatible avec le schéma si ses dépendances restent cohérentes.

## Modèle d'un stage

Chaque stage déclare :

- `id` stable ;
- `type` ;
- `label` ;
- `mode`: `machine`, `human` ou `hybrid` ;
- `required` ;
- `depends_on` ;
- `inputs` ;
- `outputs` ;
- `success_criteria` ;
- `on_failure`: `stop`, `warn` ou `continue`.

Le schéma reste déclaratif : il ne contient ni commande shell, ni callback JS, ni chemin machine absolu.

## DAG de génération

La fixture de référence forme un graphe acyclique. Le test vérifie :

- IDs uniques ;
- dépendances existantes ;
- absence d'auto-dépendance ;
- absence de cycle ;
- dépendances placées avant le stage consommateur dans la fixture de référence.

Le stage `output` dépend à la fois de `assets` et `routes`, puis `preview` dépend de `output`.

## Human / preview

`comparison` est volontairement :

- `mode: human` ;
- `required: false` ;
- `on_failure: warn`.

Cela permet de préparer la checklist avant que la source/référence métier réelle soit accessible, sans transformer cette absence en faux succès technique.

À l'inverse, les stages requis de la fixture utilisent `on_failure: stop`.

## Relation avec le workspace contract

`site-workspace.schema.json` définit **où** vivent `atelier/data/assets/config/web`.

`site-generation-checklist.schema.json` décrit **quelles étapes** une génération doit contrôler.

Les deux contrats restent séparés pour éviter qu'une structure de dossiers devienne un moteur de génération implicite.

## Frontières

Ce lot :

- ne crée aucun dossier `Sites/` ;
- ne charge aucune donnée métier réelle ;
- ne définit aucun renderer métier ;
- ne publie rien ;
- ne choisit pas une URL de preview ;
- ne modifie aucun runtime du Framework ;
- ne remplace pas le LivePreflight du Lot 9.

Il fournit uniquement un format machine et une checklist générique testable.

## Tests

`site-generation-checklist.test.mjs` vérifie le schéma et la fixture, dont le DAG et l'absence de vocabulaire métier.

Le test générique `data-schema-integrity.test.mjs` couvrira automatiquement le nouveau schéma après intégration.
