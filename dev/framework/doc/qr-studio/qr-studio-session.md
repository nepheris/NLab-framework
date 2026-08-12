# QRStudioSession

`QRStudioSession` porte l’état de travail du QR Studio autour des six presets système décrits par `QRStudioSchema`.

Il ne remplace ni QRWiz, ni le codec/storage QR, ni le PresetManager générique.

## Trois niveaux par preset

Chaque preset conserve trois configurations distinctes :

- `canonical` — configuration système issue de `QRStudioSchema`, jamais modifiée par la session ;
- `reference` — configuration locale validée par l’utilisateur pendant la session ;
- `draft` — configuration actuellement éditée.

Cette séparation permet au bouton **Valider / OK** de mettre à jour la référence locale sans modifier le preset canonique du framework.

## Sélection et panneau commun

```js
session.select('transparent');
session.controlPanel();
```

`controlPanel()` réutilise le descriptor fourni par `QRStudioSchema`, mais remplace sa configuration par le `draft` actif et ajoute :

- `editing` ;
- `dirty` ;
- `validated` ;
- compteur de générations ;
- `reference` locale.

La liste d’actions reste celle du schéma : `Modifier`, `Régénérer`, `Valider / OK`, `Reset`.

## Édition

```js
session.beginEdit();
session.patch({ dark: '#123456' });
```

`patch()` n’altère que le brouillon. `dirty` compare le brouillon à la référence locale avec une comparaison JSON stable indépendante de l’ordre des clés.

Le modèle ne crée, duplique, renomme ou supprime aucun preset libre : ces opérations restent la responsabilité du `PresetManager` générique.

## Régénération

```js
const session = new QRStudioSession({
  generate: (config) => qrWiz.generate(config)
});

await session.regenerate();
```

La génération est entièrement injectée : `QRStudioSession` ne dépend pas directement de QRWiz.

Avant la génération, le brouillon est validé par le codec injecté lorsqu’il expose `validatePreset()`. Une configuration invalide retourne `reason: invalid` sans appeler le générateur.

Une génération réussie met à jour le compteur et `lastGeneration`, mais **ne valide pas** le brouillon comme référence locale.

## Validation locale

```js
session.validate();
```

Si la configuration est valide :

1. le `draft` devient la nouvelle `reference` ;
2. `editing` repasse à `false` ;
3. `dirty` devient faux ;
4. la session tente de sauvegarder les références via le storage injecté.

Un storage indisponible n’empêche pas la validation locale en mémoire ; le résultat `persisted` indique séparément le résultat de persistance.

## Reset

Par défaut :

```js
session.reset();
```

restaure le brouillon vers la **référence locale**.

Pour revenir à la définition système sans écraser immédiatement la référence validée :

```js
session.reset('standard', { to: 'canonical' });
```

Le brouillon redevient canonique mais reste `dirty` tant qu’il diffère de la référence locale. Une validation explicite est nécessaire pour remplacer cette référence.

## Import / export

`exportJSON({source:'reference'|'draft'})` délègue à `QRPresetCodec.exportCollection()` lorsqu’un codec est injecté.

`importJSON()` délègue à `QRPresetCodec.importCollection()`, valide atomiquement les presets connus puis remplace leurs références/brouillons. Un ID inconnu est refusé avec `reason: unknown-preset` : l’ajout de presets libres reste du ressort de PresetManager.

Le JSON retourné par `exportJSON()` peut être copié par une couche UI sans ajouter de logique au modèle.

## Persistance

`save()` et `load()` délèguent à un adaptateur compatible `QRPresetStorage` :

- `storage.save(presets,{activeId,meta})` ;
- `storage.load()`.

La session ne touche jamais directement `localStorage`.

## Événements

`onChange` optionnel reçoit des transitions descriptives :

- `select` ;
- `edit` ;
- `patch` ;
- `regenerate` / `regenerate-error` ;
- `validate` ;
- `reset-reference` / `reset-canonical` ;
- `import` / `load`.

Une erreur de l’observateur est contenue et ne casse pas l’état de session.

## Frontières

QSS1 ne modifie pas :

- `QRWiz` ;
- `QRPresetCodec` ;
- `QRPresetStorage` ;
- `PresetManager` ;
- `QRStudioSchema` ;
- la démo ou le CSS.

## Vérification

```bash
node dev/framework/tests/qr-studio-session.test.mjs
```

La suite couvre sélection, édition, dirty state, génération, validation/persistance, reset référence/canonique, panneau commun, validation codec, import/export, load, IDs inconnus et erreurs de générateur.
