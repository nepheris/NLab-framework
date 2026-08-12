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
- `csv` ;
- `markdown`.

Les alias courants sont normalisés, par exemple `js → javascript`, `py → python`, `sh/shell → bash`, `md → markdown`.

Chaque preset définit une extension et un MIME d'export. Quand aucun nom de fichier n'est fourni, le composant utilise automatiquement `export.<extension>` et suit les changements de langage tant que le nom reste automatique.

`CodeBlock.languagePresets()` expose une copie des presets, `CodeBlock.normalizeLanguage()` normalise une valeur extérieure et `CodeBlock.detectLanguage()` fournit une détection prudente sans instancier le composant.

## Détection automatique

Le mode `language: 'auto'` active une détection réévaluée lorsque le contenu change.

Ordre de résolution :

1. extension explicite du nom de fichier lorsqu'elle correspond à un preset connu ;
2. signatures fortes du contenu : JSON valide, shebang/syntaxe Python ou shell, structure HTML, règles CSS, syntaxe JavaScript, Markdown ;
3. structure tabulaire CSV cohérente sur plusieurs lignes ;
4. fallback `text` ou fallback explicite fourni par l'appelant.

La détection CSV vérifie un nombre de colonnes cohérent sur plusieurs lignes et ignore les séparateurs placés à l'intérieur de champs entre guillemets. Une phrase ou un fragment ambigu reste `text`.

`setLanguage('auto')` active ce mode sur une instance existante. `detectLanguage({ apply })` permet aussi de prévisualiser (`apply:false`) ou d'appliquer la détection à l'instance.

Si le nom de fichier reste automatique, son extension suit le langage détecté. Un nom explicite reste conservé et son extension devient prioritaire pour la détection tant que le mode automatique est actif.

## Sécurité de rendu

Le contenu est toujours échappé avant insertion dans le rendu HTML.

La coloration syntaxique intégrée reste volontairement légère. Elle couvre :

- JSON ;
- JavaScript ;
- Python ;
- Bash ;
- HTML : commentaires et balises ;
- CSS : commentaires, chaînes, propriétés et valeurs numériques.

CSV et Markdown restent affichés comme texte échappé. Ce composant n'est pas un parseur de langage complet.

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

Le preset CSV exporte avec `text/csv;charset=utf-8`.

## Nom de fichier

- `setFilename('fichier.ext')` fixe un nom explicite ;
- `setFilename('')` revient au nom automatique du langage ;
- `useLanguageFilename('snippet')` force par exemple `snippet.py`, `snippet.json` ou `snippet.csv` selon le langage courant.

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

Les extensions du contrat ajoutent :

- `CodeBlock.detectLanguage(value, options)` ;
- `instance.detectLanguage(options)` ;
- le mode `language: 'auto'`.

Le comportement `danger`/notifications n'est pas concerné par ce composant.

## Tests

`dev/framework/tests/code-block.test.mjs` couvre :

- normalisation des langages et presets, y compris CSV ;
- détection automatique par contenu et extension ;
- fallback prudent vers `text` ;
- réévaluation d'une instance en mode `auto` ;
- noms de fichiers automatiques et explicites ;
- échappement HTML ;
- coloration JSON, JavaScript, HTML et CSS ;
- formatage JSON valide/invalide ;
- copie injectée et absence de Clipboard API ;
- payloads d'export JSON/CSV ;
- téléchargement avec primitives injectées ;
- absence de DOM/URL/Blob ;
- bornes de taille de police.

Baseline de validation du lot : Node 22, `code block tests: ok`.

## Hors périmètre

Ce lot ne transforme pas CodeBlock en éditeur riche ni en IDE. Le pliage hiérarchique JSON avancé, la coloration complète par grammaire, les packs de coloration configurables et la persistance locale du contenu édité restent des évolutions distinctes. Aucun changement de démo, Theme Workshop, Header, TableWiz, roadmap ou autre périmètre A n'est inclus.
