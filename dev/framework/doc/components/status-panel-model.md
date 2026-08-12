# StatusPanelModel — panneau d'état persistant

## Objectif

`StatusPanelModel` fournit le contrat DOM-free des panneaux persistants d'état demandés en 8C : `info`, `success`, `warning`, `error` et `dev`.

Il complète `NotificationCenter` sans le remplacer : NotificationCenter reste destiné aux notifications transitoires/toasts, tandis que ce modèle conserve un état lisible, des détails, des actions et un historique exploitable dans un FloatingPanel ou un autre renderer.

## Niveaux

Niveaux canoniques :

- `info` ;
- `success` ;
- `warning` ;
- `error` ;
- `dev`.

`danger` est accepté comme alias de `error` pour compatibilité avec le vocabulaire NotificationCenter.

## Entrée

`show()` accepte une chaîne ou un descripteur :

```js
model.show({
  level: 'warning',
  title: 'Import partiel',
  message: 'Deux lignes ont été ignorées.',
  code: 'IMPORT_PARTIAL',
  details: { rejected: 2 },
  actions: [
    { id: 'open.log', label: 'Voir le log' }
  ],
  metadata: { source: 'importer' }
});
```

Chaque affichage reçoit une `revision` monotone. Le statut précédent est conservé dans un historique borné lorsque `preserveHistory` est actif.

## API

- `show(input, { preserveHistory })` ;
- raccourcis `info()`, `success()`, `warning()`, `error()`, `dev()` ;
- `close()` / `reopen()` ;
- `clear({ history })` ;
- `restorePrevious()` ;
- `setActionEnabled()` ;
- `executeAction()` ;
- `descriptor()` ;
- `snapshot()`.

## Actions

Les actions sont uniquement des descripteurs (`id`, `label`, `kind`, `disabled`, `metadata`). Le modèle ne connaît pas le DOM ni le routeur concret.

Un callback `onAction` injectable peut traduire l'action vers `PanelActionRegistry`, NavigationWiz ou une commande applicative. `executeAction()` contient les erreurs du callback et retourne un résultat structuré.

## Accessibilité et rendu

`descriptor()` produit un plan neutre :

- `kind: 'status-panel'` ;
- état ouvert/fermé ;
- niveau et `iconKey` sémantique ;
- entrée courante ;
- ARIA : `role=alert` + live assertive pour warning/error, `role=status` + polite pour les autres niveaux.

Aucun HTML/CSS ni SVG n'est imposé.

## Robustesse

`details`, `metadata` et metadata d'actions doivent être JSON-safe. Le modèle refuse cycles, nombres non finis, prototypes d'objets non standards et clés sensibles (`__proto__`, `prototype`, `constructor`). Les snapshots sont clonés défensivement.

Les IDs d'action sont normalisés et dédupliqués dans un même statut.

## Hors périmètre

Ce lot ne modifie pas `NotificationCenter`, FloatingPanel, Inspector, PanelActionRegistry, la démo ou la roadmap canonique. Le renderer visuel du panneau reste un lot d'intégration séparé.

## Tests

`status-panel-model.test.mjs` couvre les cinq niveaux, alias danger, révisions, historique borné, close/reopen/restore, actions activées/désactivées, callback actions, erreurs isolées, ARIA, copies défensives, cycles et validations.

Baseline : Node 22.16.0 — `status panel model tests: ok`.
