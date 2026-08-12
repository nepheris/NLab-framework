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

Une colonne doit pouvoir déclarer un renderer sans incorporer la logique métier dans TableWiz :

- `text` ;
- `number` ;
- `badge` ;
- `tags` ;
- `link` ;
- `image` ;
- `boolean` ;
- `date` ;
- renderer personnalisé fourni par le consommateur.

## Contrat avec JSON Studio

TableWiz doit être stabilisé avant les nouveaux développements de JSON Studio qui dépendent de la vue tabulaire.

JSON Studio réutilisera :

- `CodeBlock` pour Raw ;
- `TableWiz` pour Table ;
- une brique Tree/Form spécifique pour la hiérarchie.

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

L’incrément A1 conserve `SearchWiz`, `FilterWiz` et `PaginationModel` comme briques spécialisées et renforce uniquement l’orchestration TableWiz :

- tri normalisé `asc|desc` et `toggleSort()` fiable, y compris si une colonne ne déclare que `id` ;
- `clearSort()` et `reset()` ;
- restauration facultative de la configuration initiale des colonnes via `resetColumns()` ;
- `setRegexFilter()` comme façade vers `FilterWiz` ;
- regex de recherche ou filtre invalides confinées et exposées via `lastError` / `result.error` ;
- retour automatique à la page 1 lors d’un changement de recherche, filtre ou tri ;
- entrées non-tableau traitées défensivement ;
- en-têtes triables au clavier avec `aria-sort` dans le rendu DOM.

Test dédié : `dev/framework/tests/table-wiz-legacy.test.mjs`.

## Incrément A2 — resize réel des colonnes

A2 transforme la largeur déclarative en interaction générique intégrée à TableWiz, sans dépendance CSS/DOM externe :

- paramètres globaux `resizable`, `minColumnWidth`, `maxColumnWidth` et `resizeStep` ;
- override par colonne avec `resizable:false`, `minWidth` et `maxWidth` ;
- largeur numérique ou `px` normalisée et bornée ; les autres valeurs CSS restent déclaratives pour compatibilité ;
- API `columnWidth()`, `resizeColumn()`, `adjustColumnWidth()` et `resetColumnWidth()` ;
- `colgroup` généré pour appliquer la largeur à toute la colonne ;
- poignée accessible `role=separator`, utilisable au pointer et avec `ArrowLeft` / `ArrowRight` ;
- callback `onColumnResize` après validation du changement ;
- nettoyage des listeners globaux de drag via `destroy()` et avant chaque nouveau rendu ;
- recalcul des offsets sticky à partir des largeurs réellement connues plutôt que d’un pas fixe par index ;
- tests DOM sans navigateur via faux document injecté par `ownerDocument`.

Validation locale Node 22 : `table wiz legacy tests: ok`.

## Critères de validation

- aucune régression de `process()` / recherche / filtres / pagination ;
- largeur réellement modifiable à la souris ;
- tri et filtre visibles et réinitialisables ;
- colonnes masquables et réordonnables ;
- rendu utilisable sur mobile ;
- export d'une ligne et d'une colonne sans dupliquer l'éditeur JSON ;
- tests automatiques + review visuelle dédiée avant intégration finale.
