# Framework V2 — Fondation interne

Ce document fixe les conventions internes de la V2 du framework. Elles sont propres au framework et ne cherchent pas à reproduire la nomenclature du système nLab qui l'encapsulera ensuite comme artefact autonome.

## 1. Principe de séparation

Le framework contient les moteurs, contrats, composants et ressources nécessaires à son fonctionnement. Les données métier appartiennent au projet/site consommateur et restent physiquement séparées du framework.

```text
framework/
├── core/
├── data/
├── providers/
├── components/
├── wiz/
├── themes/
├── icons/
├── help/
├── demo/
└── tests/

metier/                       # hors du framework, dans le projet consommateur
├── data/
├── media/
├── documents/
├── imports/
└── exports/
```

Règle : le framework sait comment charger, valider, relier, transformer, visualiser et exporter. Le métier fournit les données et les profils propres au projet.

## 2. Format canonique des données métier

Le JSON est le format canonique de fonctionnement pour les données métier structurées.

CSV, XLSX, TXT et autres formats sont considérés comme des formats d'import/export ou des sources externes. Ils sont normalisés vers le modèle JSON canonique avant consommation par les composants du framework.

Le CSV reste adapté aux exports plats : résultats de recherche, tableaux, extractions et échanges simples.

## 3. Collections métier séparées

Une base métier peut être constituée d'un fichier unique ou de plusieurs collections JSON reliées entre elles.

Exemple :

```text
metier/data/
├── recettes.json
├── astuces.json
├── ingredients.json
├── allergenes.json
├── saisonnalite.json
├── sources.json
└── medias.json
```

Les relations se font par identifiants canoniques. Les informations résolues à l'affichage ne sont pas dupliquées dans les données sauf exigence explicite du schéma métier.

## 4. Sources externes et normalisation

Les sources externes ne sont pas directement couplées aux composants d'affichage.

```text
CSV / XLSX / TXT / JSON externe / API
                ↓
             Adapter
                ↓
          normalisation
                ↓
           validation
                ↓
        JSON métier canonique
```

Un adaptateur est responsable de la conversion d'une source donnée vers le modèle métier attendu.

## 5. DataProvider

Les composants du framework ne doivent pas dépendre directement d'un fichier JSON, de GitHub, de Google Drive, d'une API ou d'une future base SQLite.

Ils accèdent aux données à travers une interface DataProvider.

```text
UI / Wiz
   ↓
DataModel
   ↓
DataProvider
   ↓
JSON local / GitHub / Drive / API / SQLite / autre
```

Le premier provider sera le provider JSON local/statique. Les autres providers pourront être ajoutés sans modifier TableWiz, SearchWiz, JSON Studio ou les pages métier.

## 6. DataModel

Le socle de données de la V2 doit fournir les responsabilités suivantes :

- DataSource : décrit une source physique ou externe ;
- DataAdapter : convertit une source vers le modèle canonique ;
- DataSchema : décrit la structure et les contraintes ;
- DataRegistry : déclare les collections disponibles ;
- DataIndex : construit les index nécessaires à la résolution et à la recherche ;
- DataRelation : décrit les liens entre collections ;
- DataResolver : transforme une référence canonique en représentation exploitable ;
- DataValidator : détecte les données invalides et les références cassées ;
- DataProvider : abstrait l'accès physique et la persistance.

## 7. Relations déclaratives

Les relations ne doivent pas être déduites uniquement du nom des champs.

Exemple conceptuel :

```json
{
  "field": "ingredient_id",
  "type": "reference",
  "target": "ingredients",
  "target_key": "id"
}
```

Le resolver doit ensuite pouvoir fournir, selon le besoin du renderer :

- l'ID brut ;
- le libellé humain ;
- ID + libellé ;
- une icône ;
- une image ;
- d'autres métadonnées déclarées par le modèle.

La valeur stockée reste la valeur canonique. La résolution est une couche de présentation tant qu'aucune transformation explicite n'est demandée.

## 8. Médias et documents

Images, SVG, PDF, vidéos, audio et autres documents sont des données métier lorsqu'ils appartiennent au contenu du projet.

Ils peuvent être référencés directement ou via un registre média lorsque le projet a besoin de métadonnées, de réutilisation ou de traçabilité.

Le framework peut fournir les moteurs MediaWiz, DocumentWiz, QRWiz et les renderers associés, mais ne possède pas les médias métier du projet consommateur.

## 9. Données internes du framework

Les données internes du framework sont limitées aux éléments nécessaires à son fonctionnement, par exemple :

- définitions et registres de composants ;
- schémas techniques ;
- profils de rendu génériques ;
- thèmes génériques ;
- catalogue d'icônes ;
- aide du framework ;
- datasets de démonstration et de test explicitement identifiés comme tels.

Les datasets de démonstration ne sont jamais des données métier de production.

## 10. Principe d'évolution

La V2 privilégie des contrats simples et stables plutôt qu'une imitation complète d'un SGBD.

Le premier objectif couvre :

- collections ;
- identifiants ;
- références ;
- relations ;
- index ;
- validation ;
- recherche ;
- lecture/écriture via provider lorsque l'environnement le permet.

Les jointures complexes, moteurs de requête avancés ou backend SQL pourront être ajoutés ultérieurement derrière DataProvider sans casser les composants de présentation.

## 11. Règle d'architecture

> Aucun composant UI ou Wiz ne doit connaître le format physique ou l'emplacement réel de la source de données.

Cette règle constitue la frontière principale de la Fondation V2.