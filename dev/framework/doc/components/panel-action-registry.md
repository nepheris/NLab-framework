# PanelActionRegistry — actions génériques de panneaux

## Objectif

`PanelActionRegistry` ferme le besoin 8C : ouvrir, fermer, basculer ou focaliser un panneau depuis n'importe quelle action enregistrée, sans coupler l'émetteur à `FloatingPanel`, Inspector ou au DOM.

Le registre est un **routeur de commandes**. Les composants comme `InfoTestControl`, un titre, un bouton de page ou une action framework peuvent produire un ID d'action stable ; le registre résout ensuite le panneau et l'opération.

## Contrat

```js
const registry = new PanelActionRegistry();
registry.registerPanel('inspector.main', mountedFloatingPanel);
registry.registerAction({
  id: 'diagnostic.open',
  panelId: 'inspector.main',
  operation: 'open',
  metadata: { source: 'info-test' }
});

await registry.execute('diagnostic.open', { technicalId: 'demo.theme.background' });
```

Opérations supportées : `open`, `close`, `toggle`, `focus`.

## Adaptation des providers

Le registre n'importe pas `floating-panel.js`. Il reconnaît seulement un petit contrat injectable :

- `open(payload)` ou `reopen(payload)` ou `setOpen(true, payload)` ;
- `close(payload)` ou `setOpen(false, payload)` ;
- `focus(payload)` ;
- `toggle(payload)`, ou à défaut un état `open` lisible via `state.open`, `isOpen()`, `snapshot()` ou `toJSON()`.

Cela permet d'utiliser un `mountFloatingPanel`, un état de panneau, un wrapper Inspector ou un faux provider de test.

## Exécution sûre

`execute()` retourne toujours une Promise de résultat structuré. Une erreur du provider n'est pas relancée dans l'appelant : elle devient `ok:false` avec un code et un message. Les callbacks `onResult` sont isolés de leurs propres erreurs.

Par défaut, deux activations concurrentes du même ID d'action sont **coalescées** et reçoivent exactement la même Promise. `execute(id, payload, { coalesce:false })` permet un lancement indépendant explicite.

Codes principaux :

- `ACTION_NOT_FOUND` ;
- `ACTION_DISABLED` ;
- `PANEL_NOT_FOUND` ;
- `STATE_UNAVAILABLE` pour un toggle sans état observable ;
- `OPERATION_UNSUPPORTED` ;
- `PANEL_ACTION_FAILED` pour une erreur du provider.

## Registre

- `registerPanel(panelId, provider, { replace })` / `unregisterPanel()` ;
- `registerAction(descriptor, { replace })` / `unregisterAction()` ;
- `setEnabled()` ;
- `getAction()` / `listActions()` ;
- `execute()` ;
- `snapshot()`.

Les IDs sont normalisés en minuscules et validés. Les metadata d'actions doivent être JSON-safe ; cycles, nombres non finis, prototypes non standards et clés sensibles sont refusés. Les snapshots sont défensifs et triés.

## Coordination

Ce lot ne modifie pas :

- `floating-panel.js` ;
- `InfoTestControl` ;
- les composants Inspector existants ;
- ResponsivePreview ;
- DataJoin ;
- la démo ou la roadmap canonique.

`InfoTestControl` peut donc émettre une demande d'ouverture sans connaître ce registre ; un intégrateur branche ensuite cette demande sur un ID d'action.

## Tests

`panel-action-registry.test.mjs` couvre open/close/toggle/focus, fallback `setOpen`, activation/désactivation, provider absent, erreurs isolées, toggle sans état, coalescence Promise, snapshots défensifs et validation des IDs/opérations.
