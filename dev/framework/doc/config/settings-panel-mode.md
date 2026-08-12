# SettingsPanelMode — contrat Classique / Avancé

## Objectif

`SettingsPanelMode` formalise le contrat commun **Classique / Avancé** demandé pour les panneaux de réglage. Il reste DOM-free et ne modifie aucun Studio existant.

La règle par défaut est monotone : le mode `advanced` montre tous les réglages visibles, tandis que `classic` ne montre que ceux déclarés de niveau classique. Des overrides explicites peuvent adapter un panneau particulier sans dupliquer le moteur.

## Descripteurs

Chaque réglage ou section est enregistré avec :

```js
{
  id,
  label,
  level: 'classic' | 'advanced',
  visible,
  enabled,
  group,
  metadata
}
```

`visible:false` reste prioritaire sur les overrides de mode. `enabled` est indépendant de la visibilité : un panneau peut afficher un réglage désactivé avec son explication.

## Modes

- `classic` — expose les entrées `level:classic` ;
- `advanced` — expose les entrées classiques et avancées.

`setMode()` et `toggle()` pilotent l'état. `descriptor()` fournit des descripteurs de boutons avec labels `Classique` / `Avancé`, état actif et `ariaPressed`.

## Overrides explicites

`setOverride(id, mode, visible)` permet une exception locale : par exemple afficher un champ avancé en classique pour un Studio particulier. Passer `null` supprime l'override et restaure la règle commune.

Une entrée globalement `visible:false` ne peut pas être rendue visible par un override de mode ; cela évite qu'un champ indisponible réapparaisse par accident.

## API

- `register(descriptor, { replace })` / `unregister(id)` ;
- `setMode(mode)` / `toggle()` ;
- `setEnabled(id, enabled)` ;
- `setVisible(id, visible)` ;
- `setOverride(id, mode, visible)` ;
- `get(id, { mode })` ;
- `list({ mode, visibleOnly, group })` ;
- `descriptor()` ;
- `snapshot()`.

Les listes sont triées par ID pour rester déterministes. Les metadata et snapshots sont clonés défensivement et doivent être JSON-safe.

## Intégration

Un panneau de réglage peut utiliser `list({visibleOnly:true})` pour choisir les champs rendus, tout en conservant ses propres composants et son propre état métier.

Le modèle n'impose ni CSS, ni layout, ni persistance. Il peut être partagé par Theme Workshop, QR Studio, Header/Hero, TableWiz ou de futurs Studios sans les coupler.

## Hors périmètre

Ce lot ne modifie aucun panneau, Wizard, Studio, thème, démo ou roadmap canonique. Le style visuel du toggle et la validation ergonomique restent des tâches d'intégration/HUMAN.

## Tests

`settings-panel-mode.test.mjs` couvre les deux modes, la propriété de sur-ensemble avancé, groupes, visibilité globale, overrides, activation, snapshots défensifs et validations.

Baseline : Node 22.16.0 — `settings panel mode tests: ok`.
