# LivePreflight machine output schema

`live-preflight-output.schema.json` est le point d'entrée JSON Schema pour un consommateur qui lit indistinctement la sortie machine de LivePreflight.

Il ne redéfinit aucun champ. Il compose les deux contrats V1 existants :

```json
{
  "oneOf": [
    { "$ref": "live-preflight-report.schema.json" },
    { "$ref": "live-preflight-error.schema.json" }
  ]
}
```

## Branches

### Succès

`nlab.live-preflight-report` V1 : rapport produit lorsque le registre de coordination est exploitable et qu'aucune collision active n'empêche l'évaluation.

Le rapport peut conclure `ready_for_real_integration: true` ou `false` ; dans les deux cas il s'agit d'un **rapport de succès de l'outil**.

### Erreur CLI

`nlab.live-preflight-error` V1 : enveloppe écrite sur `stderr` quand le CLI ne peut pas produire de rapport normal, par exemple :

- collision active de locks ;
- registre de locks invalide ;
- JSON invalide ;
- override invalide ;
- erreur d'usage.

## Discrimination

Les deux branches possèdent un champ racine `schema` avec une constante différente :

- `nlab.live-preflight-report` ;
- `nlab.live-preflight-error`.

Le `oneOf` reste donc non ambigu pour un consommateur V1.

## Résolution des références

Les trois schémas se trouvent dans `dev/framework/data/`. Les `$ref` relatifs du schéma d'union sont résolus par rapport à son `$id` :

- `live-preflight-report.schema.json` ;
- `live-preflight-error.schema.json`.

Aucune URL absolue spécifique au dépôt GitHub n'est nécessaire.

## Test de contrat

`live-preflight-output-schema.test.mjs` vérifie sans dépendance externe :

1. Draft 2020-12 et `$id` du schéma d'union ;
2. exactement deux branches `oneOf` ;
3. résolution filesystem des deux `$ref` relatifs ;
4. Draft, `$id`, objet racine fermé et version V1 de chaque cible ;
5. discriminants `schema` distincts ;
6. classification unique d'exemples succès/erreur et rejet d'un discriminant inconnu ;
7. quelques invariants structurants propres à chaque branche.

Ce test n'essaie pas de devenir un validateur JSON Schema générique. Les contrats détaillés restent testés dans les suites de chaque schéma.

## Versionnement

Le schéma d'union est un index de contrats. Ajouter une nouvelle enveloppe ou une version incompatible doit être une décision explicite : les schémas V1 existants ne doivent pas être élargis silencieusement pour absorber un format différent.
