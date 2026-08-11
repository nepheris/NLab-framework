# TableWiz — audit des implémentations legacy

Base de travail : Review V16 (`de21ec85170112efb23c4d5c987502b9e49dd966`).

## Décision

Ne pas recopier un ancien tableau monolithique. Conserver `TableWiz` comme moteur/API canonique et réintégrer progressivement les comportements UX déjà éprouvés dans les anciens rapports.

## Ce que TableWiz V16 sait déjà faire

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

TableWiz doit être stabilisé avant JSON Studio.

JSON Studio réutilisera :

- `CodeBlock` pour Raw ;
- `TableWiz` pour Table ;
- une brique Tree/Form spécifique pour la hiérarchie.

Aucune fonctionnalité tabulaire ne doit être recodée dans JSON Studio si elle appartient naturellement à TableWiz.

## Séquence d'intégration

1. tests de non-régression du moteur V16 ;
2. toolbar + regex + tri/reset ;
3. resize réel des colonnes ;
4. visibilité/réordre ;
5. mobile/standalone ;
6. exports ligne/colonne/sélection ;
7. édition typée ;
8. profils/presets ;
9. intégration dans JSON Studio.

## Critères de validation

- aucune régression de `process()` / recherche / filtres / pagination ;
- largeur réellement modifiable à la souris ;
- tri et filtre visibles et réinitialisables ;
- colonnes masquables et réordonnables ;
- rendu utilisable sur mobile ;
- export d'une ligne et d'une colonne sans dupliquer l'éditeur JSON ;
- tests automatiques + review visuelle dédiée avant intégration.
