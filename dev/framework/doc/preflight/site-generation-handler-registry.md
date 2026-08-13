# Site Generation Handler Registry — contrat V1

## Objet

`tools/site/site-generation-handler-registry.mjs` fournit le registre générique entre la checklist déclarative et les handlers exécutables du `SiteGenerationRunner`.

Le registre ne contient aucune logique métier : il décrit uniquement quelles capacités d'exécution sont disponibles pour un stage donné.

## Résolution

Deux niveaux sont supportés :

1. handler enregistré par `stage.id` ;
2. fallback sur un handler enregistré par `stage.type`.

Un handler de stage a toujours priorité sur le handler générique de type. Cela permet un comportement générique par défaut puis une spécialisation explicite sans modifier le runner.

## Couverture

`inspect(checklist)` produit `nlab.site-generation-handler-registry-report` V1 avec :

- `ready_for_machine_stages` ;
- `missing_machine_stage_ids` ;
- `human_or_hybrid_pending_stage_ids` ;
- inventaire des handlers enregistrés ;
- résolution détaillée de chaque stage.

Pour un stage `machine`, l'absence de handler est une capacité manquante.

Pour un stage `human` ou `hybrid`, l'absence de handler n'est pas présentée comme une erreur machine : le stage reste classé `decision_or_handler_required` et peut être satisfait par la couche de décision HUMAN.

## Export vers le runner

`buildHandlers(checklist)` retourne un objet directement compatible avec l'option `handlers` de `runSiteGeneration()`.

Par défaut, l'export échoue s'il manque un handler à un stage `machine`. L'option `requireMachineCoverage:false` autorise un export partiel pour inspection ou construction progressive.

## Invariants

- clé stage/type non vide ;
- handler obligatoirement fonction ;
- doublon refusé par défaut ;
- remplacement volontaire via `{ replace:true }` ;
- priorité stable `stage.id > stage.type` ;
- métadonnées clonées et non utilisées comme état d'exécution ;
- aucun état HUMAN n'est stocké dans le registre.

## Frontières

Ce registre ne :

- modifie pas `SiteGenerationRunner` ;
- n'implémente aucun handler concret ;
- ne contient aucune règle Recettes du Cœur ;
- ne décide pas des validations HUMAN ;
- ne crée pas de DOM, preview ou rendu.

## Test

`tests/site-generation-handler-registry.test.mjs` couvre :

- résolution par type ;
- override par stage ID ;
- rapport de couverture ;
- détection d'un handler machine manquant ;
- export complet et partiel ;
- doublons/remplacement ;
- unregister ;
- validation des clés et fonctions.
