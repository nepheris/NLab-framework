# DataWizDatasetProfile

`DataWizDatasetProfile` est le contrat de **profilage analytique renderer-independent** placé entre les données brutes/DataWiz et les futurs `ChartSpec` / moteurs de recommandation. Il ne modifie pas `data-wiz.js`, ne choisit aucun graphique et ne dépend ni de Plotly, ni de Perspective, ni d'une grille UI.

## Rôle dans la chaîne

Architecture cible :

`source → DatasetProfile → ChartSpec/ViewSpec → RendererAdapter`

Le profil fournit au futur moteur de visualisation les faits qu'il ne doit pas ré-inférer dans le DOM :

- schéma et chemins ;
- types sémantiques ;
- cardinalité ;
- statistiques numériques, texte et temporelles ;
- rôle analytique probable ;
- exemples ;
- warnings de qualité/adressabilité ;
- compatibilité directe avec les variables `DataWizProvenance`.

## API

### Création

```js
const profile = DataWizDatasetProfile.fromRows(rows, options);
```

Options bornées :

- `maxRows` : 5000 ;
- `maxFields` : 256 ;
- `maxDepth` : 8 ;
- `maxDistinct` : 2048 par champ ;
- `maxExamples` : 5 ;
- `maxNumericSamples` : 4096 pour la médiane.

Le profil est déterministe : à lignes/options identiques, la sérialisation est identique.

### Lecture

- `snapshot()` : copie défensive complète ;
- `field(pathOrPointer)` : champ par `specPath` ou JSON Pointer ;
- `facts()` : buckets directement exploitables par le futur moteur de recommandation ;
- `toProvenanceVariables()` : variables compatibles `DataWizProvenance` ;
- `explain()` : résumé compact ;
- `serialize()` / `parse()` : round-trip versionné.

## Champs

Chaque champ contient notamment :

- `pointer` : identité JSON Pointer exacte ;
- `path` : libellé dot-path humain ;
- `specPath` : chemin utilisable par `DataWiz` si non ambigu ;
- `addressable` ;
- `dataType` ;
- `role` ;
- `count/present/missing/nulls/blanks` ;
- `distinct`, `cardinality`, `unique` ;
- distribution des types observés ;
- exemples bornés ;
- statistiques numériques ;
- statistiques de longueur de texte ;
- plage temporelle ;
- warnings de champ.

### Types compatibles provenance

`string | number | integer | boolean | date | datetime | array | object | mixed | unknown`

Les chaînes entièrement convertibles en nombres sont classées `integer` ou `number`, avec warning `NUMERIC_COERCION_USED`, afin d'être cohérent avec la sémantique numérique actuelle de DataWiz.

Les dates ISO `YYYY-MM-DD` et datetimes ISO sont détectées séparément. Un champ contenant seulement une partie de valeurs temporelles reste `string` et reçoit `PARTIAL_TEMPORAL_VALUES`.

### Rôles analytiques

`identifier | dimension | measure | time | label | unknown`

L'inférence est volontairement déterministe et explicable :

- noms forts `id/uuid/guid/key` + forte unicité → `identifier` ;
- date/datetime ou nom temporel → `time` ;
- `name/title/label/...` → `label` ;
- nombre avec diversité suffisante ou nom de mesure (`amount`, `price`, `value`, etc.) → `measure` ;
- chaînes/booléens et numériques de faible cardinalité → `dimension` ;
- structures/mixte → `unknown`.

Le futur moteur de recommandations doit consommer ces rôles comme **faits suggérés**, pas comme choix utilisateur irréversibles.

## Chemins imbriqués et clés avec point littéral

L'identité d'un champ est toujours son JSON Pointer. Exemple :

- clé littérale `"a.b"` → pointer `/a.b` ;
- objet `{a:{b:...}}` → pointer `/a/b`.

Les deux ont le même texte humain `a.b`, mais seul le second peut être adressé sans ambiguïté par la convention dot-path actuelle de DataWiz. Le premier expose donc :

```js
{ addressable: false, specPath: null }
```

et `toProvenanceVariables()` l'omet par défaut. Une UI peut quand même l'afficher via son `pointer`; elle ne doit pas inventer un `specPath`.

## Bornes et warnings

Warnings globaux principaux :

- `ROW_SAMPLE_LIMIT_REACHED` ;
- `FIELD_LIMIT_REACHED` ;
- `DEPTH_LIMIT_REACHED` ;
- `NON_OBJECT_ROWS_IGNORED` ;
- `CYCLIC_OBJECT_SKIPPED` ;
- `UNSAFE_FIELD_SKIPPED` ;
- `UNADDRESSABLE_FIELD_PATH`.

Warnings de champ :

- `MIXED_TYPES` ;
- `NUMERIC_COERCION_USED` ;
- `NON_FINITE_VALUES` ;
- `DISTINCT_LIMIT_REACHED` ;
- `HIGH_CARDINALITY_DIMENSION` ;
- `IDENTIFIER_NOT_UNIQUE` ;
- `PARTIAL_TEMPORAL_VALUES`.

Le profilage est volontairement borné afin de rester utilisable sur des datasets volumineux sans transformer DataWiz en moteur analytique lourd. Perspective/Arquero/DuckDB-Wasm restent des options d'exécution séparées à benchmarker, pas des dépendances de ce contrat.

## Préparation de ChartSpec

`facts()` retourne déjà des groupes :

- `numeric` ;
- `categorical` ;
- `temporal` ;
- `identifiers` ;
- `labels` ;
- `unsupported`.

Le prochain moteur de recommandation pourra appliquer des règles explicables, par exemple :

- 1 numérique → histogramme ;
- 1 catégorie → fréquence ;
- temps + mesure → ligne ;
- catégorie + mesure → barres ;
- 2 mesures → scatter.

Cette logique doit rester dans un lot séparé : `DatasetProfile` décrit les données, il ne décide pas encore de la visualisation.
