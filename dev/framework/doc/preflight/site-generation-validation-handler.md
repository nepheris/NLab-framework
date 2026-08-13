# Site Generation — handler `validation`

## Objet

`tools/site/handlers/validation-handler.mjs` relie le stage machine `validation` du pipeline Lot 9 au `DataValidator` existant.

Principe clé : **le handler valide exactement le snapshot `data.loaded` produit par l'étape précédente**. Il ne recharge pas les sources et n'introduit donc aucun écart entre les données chargées et les données contrôlées.

## Entrées

Le factory `createValidationStageHandler()` reçoit :

- `registry` — registre générique des collections et règles déjà compris par `DataValidator` ;
- `collections` — sous-ensemble optionnel de collections à valider ;
- `failOnWarnings` — transforme les warnings en échec si activé ;
- `validatorFactory` — point d'injection de test/extension, par défaut le vrai `DataValidator`.

Le handler reçoit via les dépendances du runner la sortie :

```json
{
  "data.loaded": {
    "collections": {
      "groups": [],
      "items": []
    }
  }
}
```

## Provider snapshot read-only

Le handler construit un provider interne en lecture seule au-dessus de `data.loaded` et le transmet à `DataValidator`.

Cela garantit la chaîne :

```text
data-load
   ↓
data.loaded
   ↓
validation du même snapshot
   ↓
validation.report
```

Aucun appel réseau ni relecture de fichier n'est effectué par le handler de validation.

## Résultat

Le rapport complet du `DataValidator` est publié sous :

```json
{
  "validation.report": {
    "valid": true,
    "checked": 12,
    "errors": 0,
    "warnings": 0,
    "issues": []
  }
}
```

Mapping vers le runner :

- aucune erreur / aucun warning → `pass` ;
- warnings seuls → `warn` ;
- au moins une erreur → `fail` ;
- `failOnWarnings:true` → un warning suffit pour `fail`.

Les warnings sont également remontés dans le tableau `warnings` du résultat afin d'être visibles dans le run report global.

## Validation partielle

Si `collections` est fourni, le handler valide le registre puis uniquement les collections sélectionnées. Le rapport utilise alors `scope: selected` et conserve le détail par collection.

## Échecs structurés

Le handler produit un `fail` explicite notamment lorsque :

- `data.loaded` est absent des dépendances ;
- une collection attendue n'existe pas dans le snapshot ;
- le snapshot contient une collection qui n'est pas un tableau ;
- le validator ne respecte pas l'interface attendue ;
- le handler est appelé pour un stage autre que `validation`.

Les exceptions internes ne sortent pas brutalement du pipeline : elles sont converties en résultat structuré pour laisser `SiteGenerationRunner` appliquer la politique `on_failure` du stage.

## Test versionné

`tests/site-generation-validation-handler.test.mjs` couvre :

1. snapshot nominal valide ;
2. champ requis manquant → `fail` ;
3. relation manquante avec politique warning → `warn` ;
4. `failOnWarnings` ;
5. sous-ensemble de collections ;
6. dépendance `data.loaded` absente ;
7. mauvais type de stage ;
8. intégration `HandlerRegistry → data-load → validation → SiteGenerationRunner`.

## Frontières

Ce lot ne :

- recharge aucune source ;
- ne modifie pas `DataValidator` ;
- ne résout pas encore les relations pour le rendu ;
- n'embarque aucune logique métier ;
- ne touche ni TableWiz, ni V20, ni la démo, ni l'architecture ;
- ne requiert aucune validation HUMAN.
