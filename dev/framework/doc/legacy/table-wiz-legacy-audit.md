# TableWiz — audit des implémentations legacy

Base historique : Review V16 (`de21ec85170112efb23c4d5c987502b9e49dd966`).
Base d’implémentation actuelle : `New` au démarrage du chantier Agent A (`0112184cd211c6422c33b2deca2a39be3f0da577`).

## Décision

Ne pas recopier un ancien tableau monolithique. Conserver `TableWiz` comme moteur/API canonique et réintégrer progressivement les comportements UX déjà éprouvés dans les anciens rapports.

## Ce que TableWiz sait déjà faire

- colonnes déclaratives ;
- visibilité d'une colonne ;
- largeur déclarative ;
- colonne sticky ;
- réordre logique des colonnes ;
- recherche via `SearchWiz` ;
- filtres via `FilterWiz` ;
- tri ascendant/descendant ;
- pagination ;
- export CSV ;
- export JSON ;
- rendu image simple.

## Fonctions legacy à récupérer en priorité

Sources principales : anciens rapports HTML solaires et pages MVola V15/V16.

### P0 — UX indispensable

- toolbar attachée au tableau ;
- choix de la colonne de tri/filtre ;
- tri A→Z / Z→A ;
- reset ordre/filtre ;
- filtre regex avec gestion d'erreur ;
- entête sticky ;
- poignées de redimensionnement par colonne ;
- mode pleine page / standalone ;
- mode mobile ;
- mémorisation locale des largeurs et réglages.

### P1 — configuration

- sélecteur de colonnes visibles ;
- réordre drag/drop des colonnes ;
- profils/presets enregistrables ;
- densité compacte/normale ;
- position/visibilité de la toolbar ;
- choix de lignes visibles / plage de lignes ;
- pagination pilotable.

### P1 — édition de données

- cellules éditables selon type ;
- listes/tags avec ajout et suppression d'un item ;
- ordre des items d'une liste ;
- booléens ;
- nombres ;
- texte long ;
- liens ;
- images ;
- badges / valeurs discrètes.

### P1 — exports

- table complète ;
- ligne individuelle ;
- colonne individuelle ;
- sélection de lignes/colonnes ;
- CSV ;
- JSON ;
- HTML standalone ;
- PDF paysage via vue d'impression.

### P2 — renderers typés

Une colonne doit pouvoir déclarer un renderer sans incorporer la logique métier dans TableWiz : `text`, `number`, `badge`, `tags`, `link`, `image`, `boolean`, `date` ou renderer personnalisé.

## Contrat avec JSON Studio

TableWiz doit être stabilisé avant les nouveaux développements de JSON Studio qui dépendent de la vue tabulaire. JSON Studio réutilisera `CodeBlock` pour Raw, `TableWiz` pour Table et une brique Tree/Form spécifique pour la hiérarchie.

Aucune fonctionnalité tabulaire ne doit être recodée dans JSON Studio si elle appartient naturellement à TableWiz.

## Séquence d'intégration

1. tests de non-régression du moteur courant ;
2. tri/regex/reset puis toolbar ;
3. resize réel des colonnes ;
4. visibilité/réordre ;
5. mobile/standalone ;
6. exports ligne/colonne/sélection ;
7. édition typée ;
8. profils/presets ;
9. intégration dans les vues consommatrices, dont JSON Studio.

## Incrément A1 — moteur / tri / regex / reset

- tri normalisé `asc|desc` et `toggleSort()` fiable, y compris pour une colonne déclarée uniquement avec `id` ;
- `clearSort()` et `reset()` ;
- restauration facultative de la configuration initiale via `resetColumns()` ;
- `setRegexFilter()` comme façade vers `FilterWiz` ;
- regex invalides confinées via `lastError` / `result.error` ;
- retour page 1 après changement recherche/filtre/tri ;
- entrées non-tableau défensives ;
- headers triables au clavier avec `aria-sort`.

## Incrément A2 — resize réel des colonnes

- paramètres globaux `resizable`, `minColumnWidth`, `maxColumnWidth`, `resizeStep` ;
- overrides colonne `resizable:false`, `minWidth`, `maxWidth` ;
- largeur numérique ou `px` normalisée et bornée ; valeurs CSS non-px conservées ;
- API `columnWidth()`, `resizeColumn()`, `adjustColumnWidth()`, `resetColumnWidth()` ;
- `colgroup` pour propager les largeurs à la colonne ;
- poignée `role=separator`, pointer + `ArrowLeft`/`ArrowRight` ;
- callback `onColumnResize` ;
- nettoyage des listeners via `destroy()` et avant rerender ;
- offsets sticky calculés depuis les largeurs connues ;
- tests DOM via faux document sans dépendance navigateur.

## Incrément A3 — visibilité, ordre et état de pilotage

A3 prépare la toolbar et la persistance sans prendre le scope du composant Toolbar externe :

- `setColumnsVisible()`, `toggleColumn()`, `showAllColumns()` et `visibleColumnIds()` ;
- `reorder()` devient déterministe avec liste partielle : les colonnes nommées passent en tête et les autres conservent leur ordre relatif ;
- `moveColumn()` permet un déplacement indexé ;
- `resetColumnOrder()` restaure uniquement l’ordre initial ;
- `columnState()` expose un état sérialisable (`id`, champ, label, visibilité, ordre, largeur, sticky, resizable) ;
- `applyColumnState()` restaure visibilité, largeur, sticky et ordre sans introduire de dépendance de stockage ;
- `toolbarState()` expose recherche, filtres, tri, état des colonnes, compteurs et `canReset` ;
- le composant Toolbar concret pourra consommer cet état dans un lot ultérieur sans modifier le contrat TableWiz.

Validation locale Node 22 après A3 : `table wiz legacy tests: ok`.

## Incrément A4 — mobile / standalone

A4 ajoute une présentation responsive générique sans remplacer le rendu table historique :

- `viewMode` accepte `table`, `stacked` ou `auto` ; `table` reste la valeur par défaut rétrocompatible ;
- `mobileBreakpoint` pilote la bascule `auto` à partir de la largeur réelle du conteneur au rendu ;
- `setViewMode()`, `setStandalone()` et `setMobileBreakpoint()` exposent le pilotage sans dépendance externe ;
- la vue `stacked` transforme chaque ligne en bloc lisible avec couples label/valeur et support des images ;
- le mode `standalone` enveloppe la sortie dans une région ARIA focusable et scrollable, adaptée à une page ou une zone autonome ;
- `toolbarState()` expose aussi `view.mode`, `view.standalone` et `view.mobileBreakpoint` ;
- la logique de recherche, filtre, tri et pagination reste commune aux vues table et stacked ;
- aucun fichier CSS global ni composant Toolbar externe n’est modifié : le périmètre reste strictement TableWiz.

Validation locale Node 22 après A4 : `table wiz legacy tests: ok`.

## Incrément A5 — exports avancés

A5 couvre les sorties utiles sans introduire de générateur PDF externe dans TableWiz :

- `exportSelection()` produit une sélection déterministe de lignes et colonnes ;
- `exportRow()` et `exportColumn()` couvrent les exports unitaires ;
- `rowIndexes` déduplique les indices, ignore les valeurs invalides et conserve l’ordre explicitement demandé ;
- `columnIds` permet de cibler et ordonner les colonnes, y compris indépendamment de leur visibilité courante ;
- l’option `processed:true` permet d’exporter le résultat après recherche, filtre et tri plutôt que les données brutes ;
- `exportCSV()` conserve sa signature historique tout en acceptant désormais sélection de lignes/colonnes et données traitées ;
- `exportSelectionJSON()` sérialise la sélection sans modifier `exportJSON()` et sa compatibilité historique ;
- `exportHTML()` génère un document HTML autonome, UTF-8 et imprimable, avec échappement systématique des données et du titre ;
- `exportPrintHTML()` prépare par défaut une vue d’impression paysage via `@page`, utilisable ensuite par le navigateur pour produire un PDF ;
- aucun téléchargement automatique, aucune dépendance navigateur et aucune bibliothèque PDF ne sont imposés au moteur.

Validation locale Node 22 après A5 : `table wiz legacy tests: ok`, y compris test d’échappement d’une valeur `<script>`.

## Critères de validation

- aucune régression de `process()` / recherche / filtres / pagination ;
- largeur réellement modifiable à la souris ;
- tri et filtre visibles et réinitialisables ;
- colonnes masquables et réordonnables ;
- rendu utilisable sur mobile ;
- export d'une ligne et d'une colonne sans dupliquer l'éditeur JSON ;
- tests automatiques + review visuelle dédiée avant intégration finale.
