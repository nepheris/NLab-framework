# SessionConfigBundle — bundle global de configurations validées

## Objectif

`SessionConfigBundle` agrège les configurations **validées** des modules pendant une session de test ou de réglage.

Il répond au besoin du backlog UX : produire un bloc JSON global, stable et transmissible, sans coupler les Studios entre eux et sans dupliquer `PresetManager`.

Le composant est DOM-free. Il ne lit ni `localStorage`, ni le presse-papiers, ni des fichiers. Ces opérations restent des adaptateurs d'interface ; le bundle fournit le texte JSON à sauvegarder, télécharger ou copier.

## Format

Le format sérialisé est versionné :

```json
{
  "type": "nlab.session-config-bundle",
  "version": 1,
  "sessionId": "review.session-1",
  "entries": []
}
```

Chaque entrée représente le dernier snapshot validé d'un module :

```js
{
  moduleId,
  presetId,
  label,
  revision,
  reference,
  config,
  metadata
}
```

Les entrées sont toujours exportées par ordre alphabétique de `moduleId`. Un même contenu produit donc un ordre déterministe, indépendamment de l'ordre dans lequel les Studios ont été validés.

## Validation et révisions

```js
const bundle = new SessionConfigBundle({ sessionId: 'review.session-1' });

bundle.validate('studio.qr', qrConfig, {
  presetId: 'custom-1',
  label: 'QR personnalisé validé'
});
```

La première validation crée `revision: 1`. Une nouvelle validation du même `moduleId` remplace le snapshot et incrémente la révision.

La mutation est atomique : le nouveau `config` et les metadata sont entièrement validés avant de remplacer l'entrée courante.

## Référence figée

Une configuration validée peut devenir la référence locale de session :

```js
bundle.markReference('studio.qr');
```

Une référence refuse ensuite une validation ou une suppression accidentelle avec l'erreur `REFERENCE_LOCKED`.

Un outil explicite peut appeler `releaseReference(moduleId)` avant modification, ou `validate(..., { replaceReference: true })` pour remplacer volontairement la référence tout en conservant son état `reference:true`.

`remove()` et `clear()` protègent également les références. Leur option `force:true` est réservée aux actions explicites de reset global.

## JSON sûr

`config` et `metadata` doivent être JSON-safe :

- `null`, chaînes, booléens, nombres finis ;
- tableaux ;
- objets simples.

Sont rejetés : cycles, nombres non finis, fonctions/`undefined`/symboles/bigint, instances d'objets non simples, clés sensibles `__proto__` / `prototype` / `constructor`, et profondeur supérieure à 64 niveaux.

Les clés d'objets sont clonées dans un ordre déterministe. Les lectures (`get`, `list`, `snapshot`, `toJSON`) renvoient des copies défensives.

## API

- `validate(moduleId, config, options)` : valide et enregistre le dernier snapshot d'un module.
- `get(moduleId)` / `has(moduleId)` : accès défensif.
- `list()` : toutes les entrées triées par `moduleId`.
- `markReference(moduleId)` / `releaseReference(moduleId)` : fige ou libère une référence locale.
- `remove(moduleId, { force })` : suppression protégée.
- `clear({ force })` : reset global protégé.
- `summary()` : `sessionId`, nombre d'entrées, nombre de références et IDs modules.
- `serialize({ indent })` : JSON versionné, indentation bornée 0..8.
- `copyText(options)` : alias sémantique de `serialize()` pour un futur bouton Copier.
- `SessionConfigBundle.parse(input)` : restaure un bundle V1 et refuse types/versions incompatibles ou modules dupliqués.

## Intégration avec les Studios

Le bundle ne connaît aucun Studio concret. Un contrôleur peut écouter l'action `OK/Valider` de Theme Workshop, QR Studio, HeaderStudio, TableWiz, etc., puis enregistrer leur configuration normalisée :

```js
bundle.validate('theme.workshop', themeSnapshot, {
  presetId: activePresetId,
  metadata: { source: 'theme-workshop' }
});
```

Cette séparation garantit qu'un nouveau Studio peut rejoindre le workflow sans modifier le bundle.

## Hors périmètre

Ce lot ne modifie pas `PresetManager`, `VisitorPreferences`, les Studios/Wizards existants, `localStorage`, le presse-papiers, les downloads ou la démo. Les adaptateurs UI/persistance restent des lots d'intégration séparés.

## Tests

`dev/framework/tests/session-config-bundle.test.mjs` couvre révisions, tri déterministe, copies défensives, références verrouillées, remplacement explicite, import/export V1, duplicats de modules, cycles, nombres non finis, clés sensibles et reset forcé/non forcé.

Baseline : Node 22.16.0 — `session config bundle tests: ok`.
