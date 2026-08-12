# PresetManager — contrat import/export

## Objectif

`PresetManager` gère des presets canoniques immuables et des presets utilisateur persistables. L'import d'une collection doit être **atomique** : une collection invalide ne doit jamais laisser le manager dans un état partiellement remplacé.

## Format exporté

`exportJSON()` produit une collection :

```json
{
  "version": 1,
  "type": "nlab-preset-collection",
  "namespace": "qr",
  "activeId": "qr.mon-preset",
  "presets": []
}
```

Les presets canoniques peuvent être présents dans l'export pour description, mais ils ne sont jamais réimportés comme presets utilisateur et ne peuvent pas être écrasés.

## Validation d'import

`importJSON()` valide avant commit :

- collection objet ;
- `type === "nlab-preset-collection"` ;
- version absente ou `1` ;
- namespace compatible ;
- `presets` obligatoirement sous forme de tableau ;
- `activeId` chaîne ou `null` ;
- chaque preset utilisateur possède un `id` ;
- aucun doublon d'ID dans le même paquet ;
- aucun preset utilisateur ne remplace un preset canonique ;
- `activeId`, lorsqu'il est fourni, référence un preset présent dans l'état final préparé.

## Atomicité

L'import construit d'abord une `Map` temporaire.

Si une validation échoue à n'importe quel point :

- `presets` courant reste inchangé ;
- `activeId` reste inchangé ;
- aucune persistance n'est déclenchée avec un état partiel.

Le nouvel état n'est assigné au manager qu'après validation complète de la collection.

## Mode `replace`

`importJSON(input, { replace: true })` :

1. repart uniquement des presets canoniques locaux ;
2. applique les presets utilisateur importés ;
3. conserve les canoniques locaux, même si le paquet contient une copie canonique différente ;
4. remet `activeId` à `null` si le paquet n'en fournit pas ;
5. applique `activeId` uniquement s'il existe dans l'état préparé.

Sans `replace`, les presets importés sont fusionnés avec les presets utilisateur déjà présents et l'`activeId` courant est conservé lorsque le paquet n'en fournit pas.

## Compatibilité

Le format reste en version `1`. Les collections versionnées autrement sont rejetées explicitement au lieu d'être interprétées silencieusement.

Les opérations historiques `create`, `duplicate`, `rename`, `update`, `validate`, `reset`, `remove`, `upsert`, `save` et `load` ne changent pas de contrat dans ce lot.

## Tests

`dev/framework/tests/preset-manager.test.mjs` couvre :

- immutabilité des presets canoniques ;
- création / mise à jour / validation / duplication / renommage ;
- export/import nominal ;
- rechargement depuis stockage ;
- atomicité d'un import `replace` invalide ;
- `activeId` inconnu ;
- version/type/namespace/shape invalides ;
- doublons d'IDs importés ;
- remplacement complet avec conservation des canoniques ;
- remise à zéro et restauration de l'`activeId`.

## Hors périmètre

Ce lot ne modifie pas l'interface `PresetManagerView`, la démo active, Theme Workshop ou les chantiers réservés A/B.
