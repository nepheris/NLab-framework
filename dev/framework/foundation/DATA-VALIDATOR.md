# DataValidator — Validation des données

## Objectif

`DataValidator` contrôle la cohérence minimale d'une base métier avant son utilisation par les composants du Framework V2. Il ne transforme jamais les données : il produit un rapport structuré exploitable par les outils de diagnostic, JSON Studio et les futures interfaces Webmaster.

## Contrôles initiaux

- structure minimale du `DataRegistry` ;
- présence de `provider`, `source` et `idField` pour chaque collection ;
- existence des collections ciblées par les relations ;
- record sous forme d'objet ;
- présence de l'identifiant canonique ;
- champs déclarés dans `requiredFields` ;
- champs de relation marqués `required` ;
- unicité des IDs dans une collection ;
- cardinalité `one` / `many` ;
- intégrité des références vers les collections cibles.

## Rapport

Chaque validation retourne un objet stable :

```text
{
  scope,
  collection,
  valid,
  checked,
  errors,
  warnings,
  issues
}
```

Une issue contient au minimum :

```text
{
  level,
  code,
  collection,
  recordIndex,
  field,
  details
}
```

Le validateur ne dépend donc d'aucune présentation particulière. JSON Studio pourra colorer les lignes, les diagnostics pourront agréger les erreurs, et un export pourra utiliser exactement le même rapport.

## Champs requis

Le contrat `collection.schema.json` accepte désormais :

```json
"requiredFields": ["name", "status"]
```

L'`idField` est toujours considéré comme obligatoire. Une relation avec `required: true` ajoute également son champ aux champs obligatoires.

## Intégrité référentielle

Les relations sont contrôlées à partir de leurs déclarations :

```text
field + target + targetField + cardinality
```

Une référence absente produit une erreur si `onMissing` vaut `error`, sinon un warning. Cette première version n'applique aucune réparation automatique.

## API initiale

```text
init()
validateRegistry()
validateRecord(collectionName, record)
validateCollection(collectionName)
validateAll()
clearIndexes()
```

## Frontière de responsabilité

Cette version valide le contrat générique du framework. Elle ne cherche pas à réimplémenter l'intégralité de JSON Schema.

Les règles métier avancées pourront être apportées ultérieurement par :

- un schéma de record ;
- un adaptateur de validation ;
- un validateur externe ;
- des règles déclaratives propres au projet.

`DataValidator` restera alors l'orchestrateur et le format commun de rapport.

## Tests réalisés

Tests Node.js avant commit :

- record valide ;
- champ requis manquant ;
- ID dupliqué ;
- mauvaise cardinalité ;
- référence inexistante ;
- agrégation `validateAll()` ;
- comptage distinct erreurs / warnings.

Résultat : tests passants.
