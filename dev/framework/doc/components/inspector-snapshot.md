# InspectorSnapshot — snapshot JSON portable

## Objectif

`InspectorSnapshot` fournit une représentation JSON déterministe d'un InspectorPanel/FloatingPanel et de l'état du composant inspecté. Il permet d'exporter un état de diagnostic ou de configuration sans dépendre du DOM ni d'une interface particulière.

Le document est conçu pour être lisible par un humain, comparable dans Git et réimportable sans ambiguïté.

## Format

Le format courant est versionné :

```json
{
  "type": "nlab.inspector-snapshot",
  "version": 1,
  "component": {
    "id": "catalog.inspector",
    "type": "InspectorPanel"
  },
  "panel": {},
  "state": {},
  "configuration": {},
  "controls": [],
  "dependencies": [],
  "tests": {},
  "technical": {},
  "metadata": {}
}
```

`component.id` est obligatoire et doit respecter un identifiant sûr. `type`, `version` et `label` sont facultatifs.

## Capture

```js
const snapshot = new InspectorSnapshot().capture({
  component: { id: 'catalog.inspector', type: 'InspectorPanel' },
  panel: floatingPanelState,
  state: () => runtimeState,
  configuration: currentConfig,
  controls: controlInventory,
  dependencies: ['SearchWiz', 'FilterWiz']
});
```

Les sections peuvent être fournies :

- comme valeurs JSON ;
- comme fonctions sans argument ;
- comme objets exposant `toJSON()`.

Cette dernière forme permet d'utiliser directement `FloatingPanelState` sans couplage entre les deux composants.

## Sections

- `panel` : position, taille, dock, lock, pin ou autres états du panneau ;
- `state` : état courant du composant inspecté ;
- `configuration` : configuration reproductible ;
- `controls` : inventaire des contrôles exposés ;
- `dependencies` : dépendances déclarées ;
- `tests` : état ou résultat synthétique des tests ;
- `technical` : module, renderer, provider ou autres informations techniques ;
- `metadata` : informations libres non structurelles.

`controls` et `dependencies` doivent rester des tableaux.

## Déterminisme et isolation

Les objets sont copiés récursivement. Les clés des objets sont triées lors de la normalisation afin qu'une même donnée produise un JSON stable, indépendamment de l'ordre d'insertion d'origine.

La capture et le parsing ne partagent pas les références mutables des objets fournis. Modifier un snapshot retourné ne modifie donc pas l'état source.

Sont refusés :

- références circulaires ;
- nombres non finis ;
- symboles et bigint ;
- objets non compatibles JSON ;
- profondeur d'imbrication excessive.

Les propriétés `undefined` des objets sont ignorées, comme lors d'une sérialisation JSON classique.

## API

### `capture(input)`

Construit et normalise un snapshot version 1.

### `validate(input)`

Accepte un objet ou une chaîne JSON et retourne :

```js
{ valid: true, errors: [] }
```

ou une erreur structurée sans lever d'exception.

### `serialize(snapshot, { space })`

Valide puis sérialise le snapshot. L'indentation est bornée entre 0 et 8, avec 2 par défaut.

### `parse(input)`

Accepte une chaîne JSON ou un objet déjà parsé, valide type/version/structure et retourne une nouvelle copie normalisée.

## Tests

`dev/framework/tests/inspector-snapshot.test.mjs` couvre notamment :

- capture d'un `FloatingPanelState` via `toJSON()` ;
- providers fonctionnels ;
- tri déterministe des clés ;
- isolation des références ;
- round-trip serialize/parse ;
- indentation ;
- type/version invalides ;
- contrôles/dépendances de mauvais type ;
- identifiants invalides ;
- nombres non finis ;
- références circulaires.

Baseline du lot : Node 22.16.0, `inspector snapshot tests: ok`.

## Hors périmètre

Ce composant ne crée pas les onglets de l'InspectorPanel et n'inventorie pas automatiquement le DOM. Il fournit la primitive de snapshot JSON sur laquelle ces fonctions peuvent s'appuyer ensuite.
