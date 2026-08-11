# CodeBlock — contrat de composant

## Objectif

`CodeBlock` fournit un bloc de code autonome pour affichage, coloration légère, édition simple, copie et export texte. Le composant doit rester utilisable de façon défensive hors navigateur et ne doit jamais injecter le contenu source comme HTML actif.

## Langages et presets

Les langages canoniques sont :

- `text` ;
- `json` ;
- `javascript` ;
- `python` ;
- `bash` ;
- `html` ;
- `css` ;
- `markdown`.

Les alias courants sont normalisés, par exemple `js → javascript`, `py → python`, `sh/shell → bash`, `md → markdown`.

Chaque preset définit une extension et un MIME d'export. Quand aucun nom de fichier n'est fourni, le composant utilise automatiquement `export.<extension>` et suit les changements de langage tant que le nom reste automatique.

`CodeBlock.languagePresets()` expose une copie des presets et `CodeBlock.normalizeLanguage()` permet de normaliser une valeur extérieure sans instancier le composant.

## Sécurité de rendu

Le contenu est toujours échappé avant insertion dans le rendu HTML.

La coloration syntaxique intégrée reste volontairement légère. Elle couvre principalement JSON, JavaScript, Python et Bash. Les autres langages restent affichés comme texte échappé ; ce composant n'est pas un parseur de langage complet.

## JSON

`formatJson({ indent, apply })` fournit un formatage déterministe :

- hors langage `json` → `formatted:false`, raison `not-json` ;
- JSON invalide → `formatted:false`, raison `invalid-json` ;
- JSON valide → valeur formatée, avec application optionnelle au contenu courant.

L'indentation est bornée entre 0 et 8 espaces.

## Copie

`copy()` utilise :

1. le `clipboard` injecté au constructeur s'il existe ;
2. sinon `globalThis.navigator.clipboard` au moment de l'appel.

Si aucune API de presse-papiers n'est disponible, la méthode retourne `false` au lieu de provoquer une erreur de référence hors navigateur. Une erreur réelle de `writeText()` reste propagée afin que l'appelant puisse distinguer indisponibilité et échec du provider.

## Export et téléchargement

`exportText()` retourne :

- `value` ;
- `language` ;
- `filename` ;
- `mime`.

`download()` utilise `document`, `URL` et `Blob` injectables. Si les primitives nécessaires sont absentes, la méthode retourne `false`. En navigateur, elle crée un Blob avec le MIME du preset, lance le téléchargement puis révoque l'Object URL.

## Nom de fichier

- `setFilename('fichier.ext')` fixe un nom explicite ;
- `setFilename('')` revient au nom automatique du langage ;
- `useLanguageFilename('snippet')` force par exemple `snippet.py` ou `snippet.json` selon le langage courant.

## Compatibilité API

Les méthodes historiques restent disponibles :

- `setValue` ;
- `setTheme` ;
- `setHighlighted` ;
- `setLanguage` ;
- `setEditable` ;
- `setEditing` ;
- `setFontScale` ;
- `copy` ;
- `download` ;
- `mount` ;
- `formatted` ;
- `render`.

Le comportement `danger`/notifications n'est pas concerné par ce composant.

## Tests

`dev/framework/tests/code-block.test.mjs` couvre :

- normalisation des langages et presets ;
- noms de fichiers automatiques et explicites ;
- échappement HTML ;
- coloration JSON ;
- formatage JSON valide/invalide ;
- copie injectée et absence de Clipboard API ;
- payload d'export ;
- téléchargement avec primitives injectées ;
- absence de DOM/URL/Blob ;
- bornes de taille de police.

## Hors périmètre

Ce lot ne transforme pas CodeBlock en éditeur riche ni en IDE. Le pliage hiérarchique JSON avancé, la coloration complète par grammaire et les fonctions d'éditeur riche restent des évolutions distinctes. Aucun changement de démo, Theme Workshop ou chantier A/B n'est inclus.
