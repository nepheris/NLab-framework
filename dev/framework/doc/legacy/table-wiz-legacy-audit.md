# TableWiz — audit et extraction legacy

Base historique : Review V16 (`de21ec85170112efb23c4d5c987502b9e49dd966`).  
Base d’implémentation du chantier Agent A : `New@0112184cd211c6422c33b2deca2a39be3f0da577`.

## Décision

Ne pas recopier les anciens tableaux monolithiques. `TableWiz` reste le moteur/API canonique et récupère progressivement les comportements UX éprouvés dans les rapports historiques, tout en déléguant recherche, filtres et pagination aux briques spécialisées.

Le `file_scope` du chantier reste limité à :

- `dev/framework/wiz/table-wiz.js`
- `dev/framework/tests/table-wiz*.mjs`
- `dev/framework/doc/legacy/table-wiz*.md`

## Contrat avec JSON Studio

TableWiz doit être stabilisé avant les développements JSON Studio dépendant de la vue tabulaire.

JSON Studio doit réutiliser :

- `CodeBlock` pour Raw ;
- `TableWiz` pour Table ;
- une brique Tree/Form distincte pour la hiérarchie.

Aucune logique tabulaire ne doit être recodée dans JSON Studio.

## Incréments intégrés dans la branche A

### A1 — moteur / tri / regex / reset

- tri `asc|desc`, `toggleSort()` et `clearSort()` ;
- support des colonnes déclarées uniquement par `id` ;
- `reset()` / `resetColumns()` ;
- `setRegexFilter()` via FilterWiz ;
- regex invalides confinées dans `lastError` / `result.error` ;
- pagination remise à 1 après recherche, filtre ou tri ;
- entrées défensives ;
- headers triables au clavier et `aria-sort`.

### A2 — resize réel

- bornes globales et par colonne ;
- largeur numérique / `px` normalisée ;
- `columnWidth()`, `resizeColumn()`, `adjustColumnWidth()`, `resetColumnWidth()` ;
- `colgroup` ;
- poignée pointer + clavier accessible ;
- callback `onColumnResize` ;
- nettoyage des listeners ;
- offsets sticky basés sur les largeurs réelles.

### A3 — visibilité / ordre / état de pilotage

- visibilité multiple et toggle ;
- réordre partiel déterministe ;
- déplacement indexé ;
- restauration de l’ordre initial ;
- import/export de l’état des colonnes ;
- `toolbarState()` sans dépendance au composant Toolbar externe.

### A4 — mobile / standalone

- modes `table`, `stacked`, `auto` ;
- breakpoint mobile ;
- vue empilée ;
- wrapper standalone scrollable et ARIA ;
- le rendu table historique reste le défaut.

### A5 — exports avancés

- ligne, colonne et sélection ;
- données brutes ou résultat après `process()` ;
- CSV ciblé ;
- JSON ciblé ;
- HTML autonome échappé ;
- CSS d’impression paysage pour génération PDF navigateur, sans dépendance PDF externe.

### A6 — édition typée

L’édition reste générique : TableWiz connaît les types déclarés, pas la sémantique métier.

API :

- `editableColumnIds()` ;
- `coerceCellValue()` ;
- `editRecord()` ;
- `editCell()` ;
- `editRow()` atomique.

Types intégrés :

- `text` ;
- `number` ;
- `integer` ;
- `boolean` ;
- `date` ;
- `tags` / `list` ;
- `json` ;
- `link` / `image` comme chaînes.

Extensions par colonne :

- `parse(raw, context)` ;
- `validate(value, context)` ;
- `required` / `nullable` ;
- `separator` / `unique` pour listes ;
- `editable:false` pour interdire explicitement une cellule.

Les chemins de champ imbriqués (`meta.note`) sont supportés avec rejet des segments dangereux `__proto__`, `prototype`, `constructor`.

Les éditions peuvent être immuables (`mutate:false`) ou modifier explicitement la collection source (`mutate:true`). Les échecs sont structurés (`INVALID_INTEGER`, `INVALID_BOOLEAN`, `VALIDATION_FAILED`, etc.) et ne laissent pas de mutation partielle.

Le rendu table peut générer des éditeurs natifs (`input` / `textarea`) lorsque l’édition est activée. Le rattachement au tableau source utilise `rowKey` (par défaut `id`), y compris après une recherche SearchWiz qui clone les lignes.

### A7 — profils / presets et persistance injectable

Un profil est un snapshot versionné de la configuration d’utilisation :

- recherche et options ;
- filtres ;
- tri ;
- colonnes (visibilité, ordre, largeur, sticky) ;
- vue ;
- pagination.

API :

- `snapshotProfile()` ;
- `registerProfile()` / `registerProfiles()` ;
- `profileNames()` / `profileState()` / `removeProfile()` ;
- `applyProfile()` ;
- `serializeProfiles()` / `importProfiles()` ;
- `saveProfiles()` / `loadProfiles()` / `clearStoredProfiles()`.

La persistance est **injectable** via une interface `getItem/setItem/removeItem`. TableWiz ne dépend donc pas directement de `localStorage`, ce qui permet navigateur, tests, wrappers applicatifs ou stockage spécifique.

L’import est atomique : une collection de profils invalide n’écrase pas les profils déjà chargés. La version actuelle du format est `1`.

`toolbarState()` expose désormais les profils disponibles et le profil actif.

## Sécurité / robustesse

- aucun chemin de données prototype-sensitive n’est édité ;
- les exports HTML échappent les valeurs ;
- aucune exception de regex invalide ne fuit vers le consommateur ;
- les parsers/validateurs d’édition échouent sous forme structurée ;
- la persistance de profils est optionnelle et injectable ;
- aucune dépendance navigateur n’est requise pour les tests du moteur.

## Tests

Test principal :

`dev/framework/tests/table-wiz-legacy.test.mjs`

Couverture :

- process / pagination / tri / recherche / regex ;
- champs imbriqués ;
- resize pointer + clavier ;
- visibilité / ordre / état ;
- mobile / standalone ;
- exports ciblés et HTML sûr ;
- édition typée immuable et mutable ;
- édition atomique de ligne ;
- éditeur DOM après recherche ;
- profils / import / export / stockage injectable ;
- compatibilité défensive.

Commande :

```bash
node dev/framework/tests/table-wiz-legacy.test.mjs
```

Résultat A7 local sous Node 22 :

```text
table wiz legacy tests: ok
```

## Restant avant clôture du lock

Travail autonome :

1. exécuter la suite de tests framework disponible sur la branche ;
2. comparer la branche au `New` courant et vérifier l’absence de collision avec les agents parallèles ;
3. audit final API / régressions ;
4. passer la PR en `ready for review` et le lock en `review` si tout est vert.

Validation humaine éventuelle :

- comportement visuel des éditeurs, resize et mobile sur navigateur réel ;
- ergonomie générale avant intégration finale si le jugement visuel peut modifier la décision.
