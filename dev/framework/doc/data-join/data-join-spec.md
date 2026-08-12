# DataJoinSpec — contrat et diagnostic de jointure

`DataJoinSpec` formalise une jointure entre deux jeux de données sans modifier ni fusionner les sources. Le modèle est DOM-free, sérialisable et conçu pour être produit ultérieurement par une interface graphique à deux arbres JSON.

## Séparation des concepts

Quatre dimensions restent volontairement indépendantes :

- **type de jointure** : quelles lignes doivent apparaître dans le résultat ;
- **cardinalité** : combien de lignes de chaque côté partagent une même clé ;
- **direction** : sens de navigation logique du lien ;
- **précédence / collision** : règle future en cas de champs concurrents.

Cette séparation évite de confondre un lien « maître → détail » avec un `LEFT JOIN`, ou une navigation bidirectionnelle avec une fusion destructive.

## Format V1

```json
{
  "type": "nlab.data-join-spec",
  "version": 1,
  "join": {
    "type": "left",
    "keys": [
      { "left": "customer.id", "right": "customerId", "label": "Client" }
    ],
    "expectedCardinality": "1:N",
    "direction": "left-to-right",
    "precedence": "left",
    "comparison": {
      "trim": true,
      "caseSensitive": true,
      "coerce": "none",
      "blankAsNull": true,
      "nullMatchesNull": false
    },
    "collision": {
      "policy": "nested",
      "leftSuffix": "_left",
      "rightSuffix": "_right"
    },
    "metadata": {}
  }
}
```

## Types de jointure

- `inner`
- `left`
- `right`
- `full`
- `left-semi`
- `left-anti`
- `right-semi`
- `right-anti`

Le diagnostic calcule une estimation du nombre de lignes que chacun de ces types produirait. Il n'exécute pas encore la fusion.

## Clés

`keys` accepte de 1 à 16 correspondances. Plusieurs éléments définissent une **clé composite**.

Les chemins utilisent une notation pointée simple (`customer.id`). Les segments `__proto__`, `prototype` et `constructor` sont rejetés.

Les clés doivent être scalaires. Les objets/tableaux sont signalés comme clés inutilisables au diagnostic.

## Comparaison

- `trim` : supprime les espaces autour des chaînes ;
- `caseSensitive` : contrôle la casse ;
- `coerce`: `none`, `string`, `number` ;
- `blankAsNull` : chaîne vide assimilée à une valeur manquante ;
- `nullMatchesNull` : désactivé par défaut, comme choix prudent pour les jointures de données.

## Cardinalités

Valeurs attendues : `auto`, `1:1`, `1:N`, `N:1`, `N:N`.

La cardinalité observée est dérivée uniquement des clés réellement appariées :

- aucune duplication → `1:1` ;
- duplication à droite → `1:N` ;
- duplication à gauche → `N:1` ;
- duplication des deux côtés sur des clés appariées → `N:N`.

Si une cardinalité explicite est attendue et que l'observation la contredit, le diagnostic émet `CARDINALITY_MISMATCH` au niveau `error`.

## Diagnostic préalable

```js
const spec = new DataJoinSpec(config);
const report = spec.diagnose(leftRows, rightRows);
```

Le rapport contient :

- lignes gauche/droite ;
- estimation des lignes de sortie ;
- nombre de clés appariées ;
- lignes appariées/non appariées de chaque côté ;
- clés rejetées par motif ;
- groupes de doublons avec clé et effectif ;
- cardinalité attendue et observée ;
- warnings structurés.

Warnings V1 :

- `LEFT_KEYS_REJECTED`
- `RIGHT_KEYS_REJECTED`
- `LEFT_KEY_DUPLICATES`
- `RIGHT_KEY_DUPLICATES`
- `MANY_TO_MANY`
- `CARDINALITY_MISMATCH`
- `OUTPUT_EXPLOSION`

## Direction, précédence et collisions

`direction` : `none`, `left-to-right`, `right-to-left`, `bidirectional`.

`precedence` : `none`, `left`, `right`, `error`, `manual`.

Politiques de collision préparées : `nested`, `suffix`, `leftWins`, `rightWins`, `error`.

Ces options sont enregistrées mais ne déclenchent aucune écriture dans les JSON source. Le futur moteur d'exécution devra produire un **résultat dérivé**.

## Usage futur dans l'interface graphique

Le flux cible est :

```text
JSON A → arbre/champs ─┐
                       ├─→ JoinSpec → diagnose() → erreurs/warnings → exécution future
JSON B → arbre/champs ─┘
```

L'UI pourra donc :

1. charger deux JSON ;
2. sélectionner les record sets ;
3. choisir un chemin de chaque côté ;
4. ajouter éventuellement plusieurs clés ;
5. choisir type de jointure/cardinalité attendue ;
6. afficher le diagnostic avant activation du bouton d'exécution.

## Limites V1

- aucun moteur de fusion de lignes ;
- aucune modification de `DataResolver`, `DataValidator` ou JSON Studio ;
- pas de JSONPath complet : chemins pointés simples et sûrs ;
- diagnostic en mémoire destiné au POC et aux volumes raisonnables ; DuckDB-Wasm/Worker reste une piste pour les gros volumes.
