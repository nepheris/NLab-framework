# Site Generation — handler `relations`

## Objet

`tools/site/handlers/relations-handler.mjs` branche le stage machine `relations` du pipeline Lot 9 sur le `DataResolver` existant.

Le handler consomme le snapshot `data.loaded` déjà produit par `data-load` et propagé par le `SiteGenerationRunner`. Il ne recharge donc aucune source externe et résout les relations sur exactement les données qui ont été validées.

## Entrées

Le factory `createRelationsStageHandler()` reçoit :

- `registry` — registre de collections et relations ;
- `collections` — sous-ensemble optionnel de collections à résoudre ;
- `failOnWarnings` — transforme les warnings relationnels en échec ;
- `resolverFactory` — point d'injection de test/extension, utilisant `DataResolver` par défaut.

Le handler lit `data.loaded` depuis `inputs` puis, en fallback, depuis `artifacts`.

## Sorties

En succès, le stage publie :

```json
{
  "data.resolved": {
    "collections": {
      "items": [
        {
          "data": { "id": "i1", "group_id": "g1" },
          "resolved": {
            "group_id": { "id": "g1", "label": "Group 1" }
          },
          "issues": []
        }
      ]
    },
    "collection_names": ["items"],
    "record_counts": { "items": 1 },
    "total_records": 1
  },
  "relations.report": {
    "valid": true,
    "collection_count": 1,
    "record_count": 1,
    "errors": 0,
    "warnings": 0,
    "issues": []
  }
}
```

Le format `{ data, resolved, issues }` est conservé tel que fourni par `DataResolver`, afin de ne pas écraser les champs métier d'origine.

## Statuts

- `pass` — aucune anomalie relationnelle ;
- `warn` — uniquement des warnings selon les politiques `onMissing` ;
- `fail` — erreur du resolver, relation obligatoire introuvable avec politique `error`, ou `failOnWarnings:true`.

## Cohérence du pipeline

La chaîne devient :

```text
data-load
  ↓ data.loaded
validation
  ↓ validation.report
relations
  ↳ consomme data.loaded via artifacts
  ↓ data.resolved + relations.report
```

`depends_on` continue de représenter l'ordre d'exécution (`relations` attend `validation`) tandis que `inputs`/`artifacts` transportent le snapshot produit plus tôt.

## Test

`tests/site-generation-relations-handler.test.mjs` couvre :

1. résolution nominale avec le vrai `DataResolver` ;
2. référence absente en politique `warn` ;
3. `failOnWarnings` ;
4. politique relationnelle `error` ;
5. sélection/déduplication de collections ;
6. absence de `data.loaded` ;
7. mauvais type de stage ;
8. intégration complète `data-load → validation → relations` avec propagation d'artefacts du runner.

## Frontières

Ce lot :

- ne modifie pas `DataResolver` ;
- ne recharge aucune source métier ;
- n'impose aucun nom de collection ;
- ne transforme pas les données source en place ;
- ne touche pas TableWiz, V20, la démo ou l'architecture ;
- ne nécessite aucune validation HUMAN.
