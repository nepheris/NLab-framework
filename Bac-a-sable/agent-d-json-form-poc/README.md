# POC Agent D — JSON → formulaire hiérarchique repliable

## Périmètre

Prototype strictement limité à `Bac-a-sable/agent-d-json-form-poc/`. Aucun fichier de `dev/framework/` n'est modifié.

## Objectif

Démontrer qu'un JSON arbitraire peut être rendu dynamiquement comme un formulaire hiérarchique :

- chaque objet devient une section repliable ;
- chaque tableau devient une section repliable avec ses éléments ;
- les niveaux peuvent être imbriqués sans profondeur métier codée en dur ;
- les valeurs terminales sont éditées avec un contrôle dérivé de leur type ;
- toutes les vues/éditions reposent sur un état JSON canonique unique ;
- le document modifié peut être exporté en JSON.

## Briques du framework utilisées comme contrats

Le POC suit les contrats existants, sans les modifier :

- `dev/framework/components/data-editor.json` (`COMP_DATA_EDITOR`) : état canonique, vue formulaire, édition imbriquée, objets repliables ;
- `dev/framework/components/field-renderers.json` (`NLAB_FIELD_RENDERERS`) : résolution des contrôles selon le type JSON ;
- `dev/framework/components/hierarchical-options.json` (`NLAB_HIERARCHICAL_OPTIONS`) : profondeur hiérarchique pilotée par les données et non limitée à un niveau parent/enfant.

Ces briques sont actuellement des contrats JSON. Le POC implémente donc une couche runtime minimale dans `index.html` pour vérifier le comportement avant intégration éventuelle par les agents travaillant sur le framework.

## Fichiers

- `index.html` : POC autonome ;
- `sample-recette.json` : jeu d'essai métier de type recette. Il est explicitement fourni comme échantillon de démonstration et non comme copie d'un JSON canonique des Recettes du Cœur, le dépôt canonique n'étant pas accessible depuis la connexion GitHub utilisée pour ce test.

## Test manuel

1. Ouvrir `index.html` via GitHub Pages ou un petit serveur HTTP local.
2. Vérifier l'ouverture/repli des sections `metadata`, `Data`, `ingredients`, `etapes`, etc.
3. Modifier un texte, un nombre et un booléen.
4. Utiliser **Tout déplier** puis **Tout replier**.
5. Charger un autre fichier `.json` avec **Charger JSON**.
6. Cliquer **Exporter JSON** et vérifier que les valeurs modifiées sont conservées et typées.

> Note : en ouverture directe `file://`, le navigateur peut bloquer le `fetch` de `sample-recette.json`. Le POC contient volontairement un fallback embarqué afin de rester démontrable dans ce cas.

## Proposition d'intégration après validation

Si le comportement est validé, transmettre aux agents A/B/C une proposition de runtime générique de type `hierarchical-form-renderer` branché sur `COMP_DATA_EDITOR`, en conservant : état canonique unique, résolution des champs via `NLAB_FIELD_RENDERERS`, politique de sections repliables configurable, et aucune connaissance métier spécifique dans le renderer.
