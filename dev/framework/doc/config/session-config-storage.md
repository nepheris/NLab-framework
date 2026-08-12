# SessionConfigStorage — persistance locale du registre de session

## Objectif

`SessionConfigStorage` raccorde le contrat `SessionConfigRegistry` à un stockage injecté sans modifier ni le registre ni `BrowserStorage`.

Il ferme le besoin de persistance locale des configurations validées : le registre reste la source de vérité du contenu, tandis que cet adaptateur prend en charge sauvegarde, restauration, suppression et auto-save optionnel.

## Providers supportés

Le stockage peut exposer l'une des deux interfaces :

- `BrowserStorage`-like : `get(name, fallback)`, `set(name, value)`, `remove(name)` ;
- Web Storage brut : `getItem(key)`, `setItem(key, value)`, `removeItem(key)`.

Le provider reste injecté. Le module n'accède jamais directement à `globalThis.localStorage`.

## Registre attendu

Le registre doit exposer :

- `payload(options)` ;
- `importPayload(payload, options)`.

`subscribe(listener)` est nécessaire uniquement pour `autoSave`.

Le contrat correspond directement à `SessionConfigRegistry`, sans import statique ni couplage de classe.

## Enveloppe persistée

```json
{
  "type": "nlab.session-config-storage",
  "version": 1,
  "savedAt": 123456789,
  "payload": {
    "schema": "nlab.session-config",
    "version": 1,
    "modules": {}
  }
}
```

L'enveloppe sépare la version du mécanisme de stockage de la version propre au payload du registre.

## API

### `save({ referencesOnly })`

Récupère `registry.payload()` puis écrit une enveloppe versionnée. `referencesOnly:true` permet de persister uniquement les configurations marquées comme références validées.

### `load({ replace })`

Lit et valide l'enveloppe puis appelle `registry.importPayload()`. `replace:true` est la valeur par défaut afin qu'une restauration représente exactement le snapshot stocké.

Un stockage absent retourne `NOT_FOUND` sans modifier le registre.

### `remove()`

Supprime la clé persistée via le provider injecté.

### `startAutoSave()` / `stopAutoSave()`

L'auto-save s'abonne aux changements du registre. Une sauvegarde est déclenchée à chaque événement publié par le registre.

Pendant `load()`, l'auto-save est temporairement suspendu : l'import ne réécrit donc pas immédiatement l'enveloppe qu'il est en train de restaurer.

### `status()` / `destroy()`

`status()` expose la clé, le type de provider, l'état auto-save, les derniers timestamps save/load et la dernière erreur structurée. `destroy()` coupe l'abonnement auto-save.

## Erreurs structurées

Les opérations `save/load/remove` contiennent les erreurs et retournent `{ok:false, code, operation, key, error}`. Les erreurs de construction ou de démarrage d'auto-save non supporté restent synchrones.

Codes principaux :

- `NOT_FOUND` ;
- `READ_FAILED` / `WRITE_FAILED` / `REMOVE_FAILED` ;
- `UNSUPPORTED_TYPE` / `UNSUPPORTED_VERSION` ;
- `INVALID_PAYLOAD` / `INVALID_SAVED_AT` ;
- `INVALID_REGISTRY` / `INVALID_STORAGE` / `INVALID_KEY` ;
- `AUTOSAVE_UNSUPPORTED`.

Le payload et l'enveloppe sont vérifiés comme JSON-safe : cycles, nombres non finis, prototypes non standards et clés sensibles sont refusés.

## Hors périmètre

Ce lot ne modifie pas :

- `SessionConfigRegistry` ;
- `SessionConfigBundle` ;
- `BrowserStorage` ;
- QR Studio / PresetManager ;
- la démo ou la roadmap canonique.

Il ne décide pas quand l'interface doit proposer « Enregistrer » : il fournit uniquement le contrat persistant réutilisable.

## Tests

`session-config-storage.test.mjs` couvre BrowserStorage-like, Web Storage brut, références seules, load replace, auto-save, suspension auto-save pendant load, enveloppes invalides, erreurs provider, validation des dépendances et statut.

Baseline : Node 22.16.0 — `session config storage tests: ok`.
