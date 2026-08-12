# SessionConfigRegistry

Registre DOM-free des configurations validées pendant une session de test ou d'édition.

## Objectif

Le backlog demande un bloc JSON global qui rassemble les configurations validées des Studios/modules. `SessionConfigRegistry` fournit ce contrat sans modifier PresetManager ni les Studios existants.

Chaque module publie une configuration JSON-like sous une clé stable telle que `theme.main`, `qr.main`, `header.desktop` ou `table.orders`.

## Publication

```js
registry.publish('theme.main', config, {
  reference: true,
  metadata: { studio:'theme' }
});
```

Une configuration sémantiquement identique conserve sa `revision`; une modification incrémente la révision.

Les snapshots sont clonés défensivement.

## Référence de session

`reference` indique si l'entrée fait partie de la configuration de référence locale validée. `setReference(key, boolean)` permet de modifier cet état sans réécrire le contenu.

`payload({ referencesOnly:true })` ne conserve que ces références.

## Export global

```js
registry.exportText();
```

Produit un JSON versionné :

```json
{
  "schema": "nlab.session-config",
  "version": 1,
  "exportedAt": 123,
  "modules": {
    "theme.main": {
      "revision": 2,
      "reference": true,
      "validatedAt": 122,
      "config": {},
      "metadata": {}
    }
  }
}
```

Le texte peut être copié vers une conversation ou écrit dans un fichier par une couche UI ultérieure.

## Import

`importPayload(payload, { replace })` et `importText(text, { replace })` valident d'abord l'ensemble du payload avant publication. `replace:true` remplace le registre courant; sinon les modules importés sont fusionnés par clé.

## Sécurité et déterminisme

Le registre accepte uniquement : `null`, chaînes, booléens, nombres finis, tableaux et objets simples JSON-like.

Sont rejetés :

- cycles ;
- `Infinity`, `-Infinity`, `NaN` ;
- objets avec prototype non standard ;
- clés dangereuses `__proto__`, `prototype`, `constructor` ;
- clés module ne respectant pas le format stable.

Les clés d'objets sont triées lors de la normalisation afin de produire une empreinte déterministe.

## API

- `publish(key, config, options)` ;
- `get(key)` / `has(key)` / `list()` ;
- `setReference(key, boolean)` ;
- `remove(key)` / `clear()` ;
- `payload(options)` / `exportText(options)` ;
- `importPayload(payload, options)` / `importText(text, options)` ;
- `subscribe(listener)`.

## Frontières

Ce lot n'implémente pas :

- le bouton Copier ;
- le téléchargement de fichier ;
- la sélection UI d'un preset ;
- la persistance de PresetManager ;
- le branchement automatique Theme/QR/Header/Table/JSON Studio.

Ces modules pourront publier leurs snapshots validés dans ce registre lors de lots d'intégration séparés.
