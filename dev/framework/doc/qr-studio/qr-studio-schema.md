# QRStudioSchema

`QRStudioSchema` décrit l’interface et les presets standards du **QR Studio** sans générer de QR code et sans gérer la persistance.

## Frontières

Le découpage est volontaire :

- `QRWiz` reste le moteur de payload, options et génération ;
- `QRPresetCodec` reste le validateur/import-export JSON des collections QR ;
- `QRPresetStorage` reste l’adaptateur de stockage local ;
- `PresetManager` reste le gestionnaire générique de création, duplication, validation et suppression ;
- `QRStudioSchema` fournit uniquement les **descripteurs UI consommables**.

Aucun de ces composants existants n’est modifié par QS1.

## Libellés normalisés

Le schéma fixe notamment les libellés demandés par le backlog :

- `dark` → **Couleur QR code** ;
- `light` → **Couleur arrière-plan** ;
- `transparent` → **Arrière-plan transparent** ;
- `errorCorrectionLevel` → **Correction d'erreur**.

Les autres champs décrits sont : taille, marge, format, logo, taille du logo, fond du logo et arrondi du fond du logo.

Chaque descriptor fournit un `id`, `path`, `label`, `type`, `group`, une valeur `default` et, lorsque pertinent, bornes, pas, unité, options, aide ou condition `visibleWhen`.

## Correction d’erreur

`errorCorrectionLevels()` expose quatre options explicites :

- `L` — Faible, environ 7 % ;
- `M` — Moyenne, environ 15 %, recommandée par défaut ;
- `Q` — Élevée, environ 25 % ;
- `H` — Très élevée, environ 30 %, notamment adaptée aux QR avec logo central.

Les pourcentages sont fournis comme indications pédagogiques dans le descriptor, pas comme calculs du moteur.

## Presets système

Le catalogue de base contient exactement six presets :

1. `standard` — noir sur blanc ;
2. `transparent` — arrière-plan transparent ;
3. `colored-background` — exemple avec fond coloré ;
4. `with-logo` — modèle prévu pour un logo, correction `H` recommandée ;
5. `theme-monochrome` — modèle monochrome avec bindings sémantiques `text/surface` à résoudre ultérieurement par le thème ;
6. `custom` — point de départ éditable.

Le preset `with-logo` ne fabrique pas d’asset fictif : `logo` reste `null` et `meta.requires = ['logo']` indique à l’UI qu’un asset doit être fourni.

Le preset `theme-monochrome` conserve des couleurs de repli concrètes et expose `meta.themeBindings`. Le moteur QR n’a donc pas à comprendre les variables CSS du thème.

## Panneau commun

```js
const schema = new QRStudioSchema();
const panel = schema.controlPanel({ presetId: 'standard' });
```

Le descriptor de panneau contient :

- le preset sélectionné ;
- tous les champs du Studio ;
- sa configuration de départ ;
- les quatre actions standard demandées :
  - `Modifier` ;
  - `Régénérer` ;
  - `Valider / OK` ;
  - `Reset`.

Ce descriptor ne déclenche aucune action. Une couche UI peut relier `regenerate` à `QRWiz.generate()`, `validate` à PresetManager/QRPresetCodec, etc.

## Brouillon depuis un preset

```js
schema.draftFromPreset('transparent', {
  dark: '#123456'
});
```

retourne une copie du preset avec le patch appliqué sans modifier le catalogue système.

## Copie défensive

`fields()`, `field()`, `presets()`, `preset()`, `draftFromPreset()`, `controlPanel()` et `snapshot()` retournent des copies. Une UI peut donc éditer son brouillon sans altérer le schéma de référence.

## Vérification

```bash
node dev/framework/tests/qr-studio-schema.test.mjs
```

La suite couvre : libellés, niveaux de correction, groupes/conditions logo, ordre des six presets, transparence, correction `H` du preset logo, bindings thème, brouillon non mutatif, panneau commun, copie défensive et erreurs de schéma.
