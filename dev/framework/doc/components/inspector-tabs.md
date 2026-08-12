# InspectorTabs — modèle d’onglets Inspector

## Objectif

`InspectorTabs` fournit le modèle d’état DOM-free des onglets communs d’un InspectorPanel. Le rendu visuel reste séparé : cette primitive porte uniquement l’ordre, l’onglet actif, la visibilité, la disponibilité et les badges.

## Onglets canoniques

L’ordre par défaut est stable :

1. `test` — Test ;
2. `technical` — Technique ;
3. `dependencies` — Dépendances ;
4. `state` — État ;
5. `configuration` — Configuration.

Ils sont exposés par `INSPECTOR_CANONICAL_TABS`.

## Construction

```js
const tabs = new InspectorTabs({
  activeId: 'state',
  onChange(detail) {
    // synchronisation UI éventuelle
  }
});
```

Une liste personnalisée peut être injectée. Les identifiants doivent être sûrs et uniques.

## API

### `list({ visibleOnly })`

Retourne une copie des onglets. `visibleOnly:true` masque les entrées déclarées invisibles.

### `active()`

Retourne une copie de l’onglet actif ou `null` si aucun onglet n’est actuellement activable.

### `activate(id, options)`

Active un onglet uniquement s’il est visible et enabled. Le résultat est structuré :

```js
{
  changed: true,
  activeId: 'configuration',
  reason: null
}
```

Un onglet absent, invisible ou désactivé retourne `reason:'unavailable'` sans modifier l’état.

Options :

- `emit` — `true` par défaut ;
- `source` — origine de l’activation (`api`, `keyboard`, etc.).

### `setVisible(id, visible)`

Modifie la visibilité. Si l’onglet actif devient invisible, le premier onglet visible et enabled devient automatiquement actif.

### `setEnabled(id, enabled)`

Même comportement de réparation automatique lorsque l’onglet actif devient indisponible.

### `setBadge(id, badge)`

Ajoute ou retire un badge textuel sans imposer de style ni de sémantique visuelle.

### `snapshot()`

Retourne :

```js
{
  activeId: 'state',
  tabs: []
}
```

La copie est indépendante de l’état interne et peut être intégrée dans `InspectorSnapshot`.

## Événements

`onChange(detail)` reçoit :

- `action` : `activate`, `visibility`, `enabled` ou `badge` ;
- `source` ;
- `activeId` ;
- `tabs`.

Aucun `CustomEvent` ni accès DOM n’est requis.

## Robustesse

- tableau `tabs` obligatoire ;
- identifiants invalides refusés ;
- doublons refusés ;
- activation d’un onglet indisponible fail-closed ;
- état actif réparé automatiquement ;
- snapshots et métadonnées retournés sous forme de copies.

## Tests

`dev/framework/tests/inspector-tabs.test.mjs` couvre :

- les cinq onglets canoniques ;
- activation et activation idempotente ;
- visibilité et fallback actif ;
- enabled/disabled ;
- badges ;
- aucun onglet activable ;
- onglets personnalisés ;
- identifiants invalides et doublons ;
- suppression d’événement via `emit:false` ;
- origine `source` ;
- isolation du snapshot.

Baseline : Node 22.16.0 — `inspector tabs tests: ok`.

## Hors périmètre

Ce lot ne dessine pas les onglets, ne définit pas de CSS et ne modifie pas `FloatingPanel`. Il fournit le moteur d’état commun attendu avant une intégration visuelle dans l’InspectorPanel.
