# QRPresetCodec — contrat import/export des presets QR

## Objectif

`QRPresetCodec` fournit le contrat autonome de validation et de sérialisation des presets QR. Il ne modifie ni `QRWiz` ni le `PresetManager` générique : il sert de frontière stricte entre une configuration QR éditable et un document JSON portable.

## Format de document

Le format courant est versionné :

```json
{
  "type": "nlab.qr-presets",
  "version": 1,
  "presets": [],
  "activeId": null,
  "meta": {}
}
```

Un import est accepté uniquement si `type`, `version`, la collection, les presets et `activeId` sont tous cohérents. Aucune collection partiellement valide n'est retournée.

## Preset

Forme canonique minimale :

```json
{
  "id": "public-default",
  "name": "Public default",
  "config": {
    "type": "url",
    "url": "https://example.test"
  }
}
```

Champs optionnels conservés : `label`, `description`, `tags`, `meta`.

L'identifiant doit respecter `[A-Za-z0-9][A-Za-z0-9._-]{0,79}`. Les identifiants en doublon sont refusés au niveau collection.

## Validation QR

Les types connus sont alignés sur les payloads QR actuels :

- `url` ;
- `text` ;
- `email` / `mail` ;
- `tel` / `phone` / `telephone` ;
- `wifi` / `wi-fi` ;
- `contact` / `vcard`.

Pour les types qui nécessitent un contenu, le codec exige les champs minimaux correspondants : texte, adresse email, téléphone, SSID ou nom de contact.

Les options visuelles structurantes sont validées avant export/import :

- `width` : 64 à 4096 ;
- `margin` : 0 à 64 ;
- `logoSize` : 0.10 à 0.32 ;
- `logoRadius` : 0 à 256 ;
- `errorCorrectionLevel` : L/M/Q/H ;
- `format` : SVG/PNG.

## API

### `validatePreset(preset)`

Retourne `{ valid, errors }` sans modifier ni lever d'erreur pour un simple contrôle d'interface.

### `normalizePreset(preset)`

Valide puis retourne une copie JSON indépendante. En cas d'erreur, lève un `TypeError` enrichi avec `error.issues`.

### `exportCollection(presets, options)`

Valide toute la collection avant sérialisation. Options :

- `activeId` ;
- `meta` ;
- `space`, indentation JSON bornée entre 0 et 8.

La sortie est une chaîne JSON versionnée.

### `importCollection(input)`

Accepte une chaîne JSON ou un objet déjà parsé. Le contrôle est atomique : type, version, forme, chaque preset, doublons et `activeId` sont vérifiés avant retour.

## Robustesse JSON

Les copies de configuration et métadonnées :

- refusent nombres non finis ;
- refusent fonctions, symboles, bigint et objets non JSON ;
- refusent références circulaires ;
- bornent la profondeur d'imbrication ;
- n'exposent pas les références mutables de l'objet source.

## Tests

`dev/framework/tests/qr-preset-codec.test.mjs` couvre :

- preset valide et contraintes de contenu ;
- contraintes visuelles ;
- copie indépendante ;
- export/import et round-trip ;
- doublons et `activeId` inexistant ;
- type/version invalides ;
- JSON syntaxiquement invalide ;
- collection partiellement invalide ;
- références circulaires et nombres non finis ;
- indentation bornée.

Baseline : Node 22, `qr preset codec tests: ok`.

## Hors périmètre

Le codec ne gère pas le stockage local, l'interface d'édition des presets, ni le cycle de vie du PresetManager générique. Ces responsabilités restent séparées afin d'éviter un couplage QR ↔ gestionnaire global.
