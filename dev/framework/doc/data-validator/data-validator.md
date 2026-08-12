# DataValidator — contrat de robustesse

`DataValidator` contrôle la cohérence structurelle et référentielle des données sans les réparer. Il conserve le format de rapport historique utilisé par les outils de diagnostic et les futurs studios Webmaster.

## Garanties ajoutées

- `registry.collections` doit être un objet ;
- les collections sont résolues uniquement via leurs **propriétés propres** (`constructor`, `__proto__`, etc. ne deviennent jamais des collections) ;
- une définition de collection, `requiredFields` ou `relations` mal formée produit une issue structurée ;
- un provider déclaré mais absent de `registry.providers` produit `UNKNOWN_PROVIDER` lorsque le registre expose cette table ;
- les relations valident `field`, `target`, `cardinality`, `onMissing` et `targetField` ;
- `provider.getCollection()` doit exister et retourner un tableau ;
- les index de référence sont réutilisés via `DataIndex` et peuvent être invalidés avec `clearIndexes()` ;
- un doublon sur la clé cible d'une relation devient `DUPLICATE_TARGET_KEY` dans le rapport au lieu de laisser fuiter `DataIndexError` ;
- `validateAll()` agrège les erreurs structurées de collection/provider au lieu d'interrompre l'ensemble de l'audit.

## Rapport stable

Chaque rapport conserve :

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

Une référence absente reste :

- `error` si `onMissing: "error"` ;
- `warning` pour les autres policies, conformément au contrat historique du validateur.

Le validateur ne réalise aucune réparation automatique ; `keep` / `null` restent des politiques de résolution appliquées par `DataResolver`.

## Codes de structure supplémentaires

Parmi les codes désormais explicitement produits :

- `INVALID_COLLECTION_DEFINITION` ;
- `UNKNOWN_PROVIDER` ;
- `INVALID_REQUIRED_FIELDS` ;
- `INVALID_RELATIONS` ;
- `INVALID_RELATION` ;
- `INVALID_RELATION_CARDINALITY` ;
- `INVALID_MISSING_POLICY` ;
- `INVALID_TARGET_FIELD` ;
- `INVALID_RELATION_TARGET` ;
- `GET_COLLECTION_REQUIRED` ;
- `INVALID_COLLECTION_DATA` ;
- `DUPLICATE_TARGET_KEY`.

Les codes historiques (`MISSING_PROVIDER`, `MISSING_SOURCE`, `MISSING_ID_FIELD`, `MISSING_REQUIRED_FIELD`, `INVALID_CARDINALITY`, `REFERENCE_NOT_FOUND`, `DUPLICATE_ID`, etc.) sont conservés.

## Compatibilité avec DataResolver / DataIndex

Pour une relation, la clé cible suit le même ordre que `DataResolver` :

1. `relation.targetField` ;
2. `target.idField` ;
3. `id`.

`DataIndex` reste le cache commun des clés de référence et assure l'unicité de l'index construit.

## Test dédié

`tests/data-validator-robustness.test.mjs` couvre :

- registre valide ;
- cache et invalidation ciblée ;
- propriété héritée `constructor` ;
- mauvaise cardinalité de valeur ;
- provider inconnu ;
- `requiredFields` et relation mal formés ;
- collection provider non-tableau ;
- provider sans `getCollection` ;
- clé cible dupliquée ;
- ID principal dupliqué.

Exécution locale du contenu exact du lot : `data validator robustness tests: ok`.
