# SessionConfigTransfer

`SessionConfigTransfer` est la couche de **transport utilisateur** des configurations de session.

Elle complète les briques existantes sans les remplacer :

- `SessionConfigRegistry` reste la source de vérité du bloc JSON global de session ;
- `SessionConfigBundle` reste le modèle/codec d'un bundle de configurations ;
- `SessionConfigStorage` reste responsable de la persistance locale ;
- `SessionConfigTransfer` fournit les opérations `Copier`, `Télécharger`, `Importer depuis texte` et `Importer depuis fichier`.

Le composant est DOM-free : presse-papiers, téléchargement et lecture de fichier sont injectés.

## Modes

Le constructeur reçoit **exactement une** source :

```js
const transfer = new SessionConfigTransfer({ registry });
```

ou :

```js
const transfer = new SessionConfigTransfer({ bundle });
```

En mode `registry`, l'import utilise `SessionConfigRegistry.importText()` et peut remplacer ou fusionner le registre.

En mode `bundle`, l'import utilise la méthode statique `parse()` du constructeur du bundle puis remplace le bundle courant du transport par le bundle validé.

## Bloc JSON global

```js
const descriptor = transfer.descriptor({
  referencesOnly: true,
  indent: 2,
  filename: 'configuration-session.json'
});
```

Le descriptor contient :

- `text` : JSON à afficher ou transmettre ;
- `filename` : nom de fichier normalisé, sans chemin ;
- `mime` : `application/json;charset=utf-8` ;
- `bytes` : taille UTF-8 ;
- `mode` ;
- `referencesOnly` en mode Registry.

`referencesOnly:true` s'appuie sur le contrat public de `SessionConfigRegistry.payload()` et permet d'exporter uniquement les références validées.

## Copier

Le presse-papiers est injecté :

```js
const transfer = new SessionConfigTransfer({
  registry,
  clipboard: navigator.clipboard
});

await transfer.copy({ referencesOnly: true });
```

Le cœur n'accède jamais directement à `navigator`.

Résultats structurés :

- succès : `ok:true`, taille et nom du fichier ;
- `clipboard-unavailable` ;
- `clipboard-rejected` ;
- `clipboard-error`.

## Télécharger

Le downloader est également injecté :

```js
const transfer = new SessionConfigTransfer({
  registry,
  downloader: async ({ text, filename, mime }) => {
    // Adaptateur navigateur, Electron, test, etc.
    return true;
  }
});

await transfer.download();
```

Cette séparation évite de dupliquer dans le core la logique DOM déjà disponible dans les couches de présentation telles que `CodeBlock`.

## Import depuis texte

```js
const result = transfer.importText(jsonText, {
  replace: true
});
```

En mode Registry, `replace:false` permet une fusion conforme au contrat du registre.

Les erreurs de parsing, schema ou version sont capturées et retournées sous la forme :

```js
{
  ok: false,
  operation: 'import',
  reason: 'invalid-data',
  error: { name, code, message }
}
```

## Import depuis fichier

Un objet compatible `File.text()` suffit :

```js
await transfer.importFile(file, { replace: true });
```

Un reader peut aussi être injecté :

```js
new SessionConfigTransfer({
  registry,
  readText: async (file) => customReader(file)
});
```

La taille d'import est bornée à **2 MiB par défaut**. Lorsque `file.size` est disponible, les fichiers trop gros sont refusés avant lecture ; la taille réelle du texte est ensuite contrôlée à nouveau.

`maxBytes` permet de modifier cette limite pour un contexte maîtrisé.

## Capabilities et état

```js
transfer.capabilities();
transfer.snapshot();
```

`capabilities()` décrit le mode, la disponibilité du clipboard/downloader, le nom de fichier et la limite d'import.

`snapshot()` ajoute la dernière erreur et un résumé de la source courante.

## Événements

`onEvent` reçoit des événements `copy`, `download`, `import` et `error` avec des résultats clonés défensivement.

```js
new SessionConfigTransfer({
  registry,
  onEvent(event) {
    console.log(event.type, event.result);
  }
});
```

## Frontières

SCT1 ne modifie pas :

- `SessionConfigRegistry` ;
- `SessionConfigBundle` ;
- `SessionConfigStorage` ;
- `CodeBlock` ;
- les Studios ;
- les démos ou CSS.

Une UI peut donc connecter les boutons **Copier / Télécharger / Importer** à ce transport sans faire dépendre les modèles de configuration du DOM.

## Vérification

```bash
node dev/framework/tests/session-config-transfer.test.mjs
```

La suite couvre Registry réel, Bundle réel, références seulement, nettoyage du nom de fichier, clipboard/downloader injectés, import texte/fichier, remplacement de Registry, import de Bundle, limite de taille et erreurs de capabilities/providers.
