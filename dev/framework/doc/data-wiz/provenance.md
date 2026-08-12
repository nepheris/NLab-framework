# DataWiz provenance model

`DataWizProvenance` formalise la chaîne **source → variables → mesure → résultat** demandée par le backlog Data UX, sans dépendre du DOM, de `DataWiz` lui-même ni d'un moteur de visualisation.

## Objectif

Le modèle répond à deux besoins distincts :

1. fournir à l'interface une explication stable de la provenance d'un résultat ;
2. préparer les futurs contrats déclaratifs `DatasetProfile` / `ViewSpec` / `ChartSpec` sans coupler le runtime à Plotly, ECharts ou Vega-Lite.

Il ne calcule aucune statistique et n'exécute aucune jointure : ces responsabilités restent dans les moteurs de données. Il décrit seulement ce qui a été utilisé et produit.

## Contrat sérialisé

```json
{
  "type": "nlab.data-wiz-provenance",
  "version": 1,
  "provenance": {
    "source": {
      "id": "sales",
      "label": "Ventes",
      "kind": "collection",
      "rows": 120,
      "metadata": { "file": "sales.json" }
    },
    "variables": [
      {
        "field": "region",
        "label": "Région",
        "role": "dimension",
        "dataType": "string",
        "sourceField": "region",
        "metadata": {}
      },
      {
        "field": "amount",
        "label": "Montant",
        "role": "measure",
        "dataType": "number",
        "sourceField": "amount",
        "metadata": {}
      }
    ],
    "measure": {
      "operation": "sum",
      "field": "amount",
      "label": "Total",
      "options": {}
    },
    "result": {
      "kind": "table",
      "rows": 4,
      "value": null,
      "fields": ["region", "amount"],
      "metadata": {}
    }
  }
}
```

## Vocabulaire V1

### Source

`kind` : `dataset`, `collection`, `resultset`, `file`, `api`, `derived`, `unknown`.

`rows` est soit `null`, soit un entier positif ou nul. Les métadonnées doivent rester JSON-sûres.

### Variables

Chaque variable possède un `field` obligatoire. Les doublons de `field` sont supprimés en conservant la première occurrence.

Rôles : `identifier`, `dimension`, `measure`, `time`, `label`, `unknown`.

Types : `string`, `number`, `integer`, `boolean`, `date`, `datetime`, `array`, `object`, `mixed`, `unknown`.

### Mesure

La mesure est optionnelle (`null`). Opérations : `none`, `count`, `distinct`, `sum`, `mean`, `median`, `min`, `max`, `custom`.

Toutes les opérations sauf `none` et `count` exigent un champ. `options` permet aux moteurs futurs d'indiquer des choix supplémentaires sans modifier le contrat de provenance.

### Résultat

`kind` : `scalar`, `series`, `table`, `distribution`, `summary`, `unknown`.

`value` accepte toute valeur JSON-sûre, y compris `0`, `false` et `null`. `fields` est dédupliqué.

## API

```js
const provenance = new DataWizProvenance(initialState);

provenance.snapshot();
provenance.update({ result: { kind: 'scalar', rows: 1, value: 42 } });
provenance.setSource(source);
provenance.setVariables(variables);
provenance.setMeasure(measure);
provenance.setResult(result);
provenance.reset();
provenance.explain();
provenance.toJSON();
provenance.serialize({ indent: 2 });

const restored = DataWizProvenance.parse(serialized);
```

`update()` est atomique : si la normalisation du nouvel état échoue, l'état précédent reste inchangé.

`explain()` retourne la même information accompagnée de textes neutres utilisables par une UI. Il ne génère pas de HTML.

## Sécurité et isolation

- toutes les entrées et sorties sont clonées ;
- les cycles sont rejetés ;
- `NaN` et les infinis sont rejetés ;
- les clés `__proto__`, `prototype` et `constructor` sont rejetées dans les valeurs libres ;
- aucune référence DOM, aucun stockage navigateur et aucune dépendance externe.

## Intégration future

Le flux recommandé est :

```text
DataSource / ResultSet
        ↓
DataWiz / QueryEngine
        ↓
DataWizProvenance ──→ explication UI / diagnostic
        ↓
DatasetProfile
        ↓
ViewSpec / ChartSpec
        ↓
RendererAdapter (Plotly / ECharts / Vega-Lite / autre)
```

Le modèle de provenance doit rester indépendant de la future décision de nomenclature `Wiz / Engine / View / Viz` : son schéma sérialisé peut survivre à cette migration.
