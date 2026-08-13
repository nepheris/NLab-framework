# nLab Web Framework — architecture sémantique des données et de la présentation

> Statut : proposition d'architecture à valider avant renommage du runtime.
> Objectif : remplacer les noms hérités des POC (`*Wiz`) par une nomenclature qui distingue clairement logique, interaction, rendu et configuration.

## 1. Principe directeur

Le suffixe d'un objet décrit sa responsabilité :

- **Engine** : logique pure, sans dépendance DOM ; transforme, résout ou calcule.
- **Model** : état ou contrat de données.
- **Adapter** : entrée/sortie vers un format ou une source externe.
- **Control** : interaction utilisateur qui modifie un état ou une requête.
- **View** : représentation structurée de contenu/données.
- **Viz** : visualisation analytique de données.
- **Bar / Toolbar** : conteneur composable de contrôles/actions.
- **Studio** : interface d'auteur permettant de configurer, composer et sauvegarder.
- **Service** : effet externe ou capacité transversale (partage, SEO, export, impression, etc.).

`Wiz` n'est plus utilisé comme catégorie générique.

## 2. Architecture cible

```text
Sources / formats
 JSON · CSV · API · SQLite · objets JS
          │
          ▼
      Adapters
          │
          ▼
      Data Model
 DataSource · Dataset · RelationGraph
          │
          ▼
       Engines
 Query · Relation · Stats · Presentation
          │
          ▼
       ResultSet
          │
    ┌─────┴──────────────┐
    ▼                    ▼
 Controls              Views / Viz
 Search                TableView
 Filter                FormView
 Sort                  TreeView
 Fields                CardView
 Range                 GalleryView
 Pagination            MediaView
 Export                KPIViz
 View selector         HistogramViz
 Zoom                  HeatmapViz
    │                    │
    └──────────┬─────────┘
               ▼
          Data Toolbar
               │
               ▼
           Data Studio
```

Le **Data Studio** configure cette architecture ; il ne devient pas lui-même le moteur de traitement.

## 3. Distinction View / Viz

### View
Une **View** représente ou édite les données selon une structure d'interface :

- `TableView`
- `FormView`
- `TreeView`
- `CardView`
- `ListView`
- `GalleryView`
- `MediaView`
- `CodeView`

### Viz
Une **Viz** transforme un `ResultSet` en lecture analytique :

- `KPIViz`
- `HistogramViz`
- `BarViz`
- `DonutViz`
- `HeatmapViz`
- `TreemapViz`
- `WaterfallViz`
- `WaffleViz`
- `RadarViz`

**Règle :** `SearchViz` n'est pas retenu. Une recherche ne visualise pas les données : elle agit sur le jeu de résultats. Le nom cible est `SearchControl` côté UI et `SearchEngine` / `QueryEngine` côté logique.

## 4. Les Studios

### Data Studio
Studio générique des données, indépendant du format d'origine.

Il compose :

- sources et adapters ;
- relations ;
- champs et types ;
- `TableView`, `FormView`, `TreeView`, `Raw/CodeView` ;
- visualisations ;
- contrôles de recherche/filtre/tri ;
- toolbar ;
- profils ;
- imports/exports.

Le nom historique **JSON Studio** devient à terme un mode / adapter du Data Studio et non le produit principal.

### Theme Studio
Configure les tokens visuels et leurs portées :

- fond site / section / élément ;
- couleurs ;
- typographies ;
- gradients ;
- clair/sombre ;
- famille / type / sous-type / instance ;
- presets de thème.

### Layout Studio
Configure la géométrie et le comportement des zones :

- header ;
- footer ;
- hero ;
- sections ;
- panneaux dockables ;
- hauteurs / largeurs ;
- sticky ;
- resize ;
- verrouillage ;
- page / site ;
- responsive.

### QR Studio
Interface d'auteur de QR ; utilise un moteur/générateur QR indépendant.

Le même principe pourra être utilisé ultérieurement pour d'autres studios spécialisés.

## 5. Data Toolbar

Le nom cible pour la barre issue du POC MVola est **Data Toolbar**.

Pourquoi pas `DataVizBar` : elle ne contient pas seulement des visualisations ; elle contient aussi recherche, filtres, tri, champs, plage, export, pagination et choix de vue.

Modules candidats :

- `SearchControl`
- `FilterControl`
- `SortControl`
- `FieldControl`
- `RangeControl`
- `PaginationControl`
- `ViewControl`
- `PerspectiveControl`
- `ZoomControl`
- `ExportControl`
- actions spécifiques enregistrées comme plugins.

La toolbar est :

- ordonnable par drag & drop ;
- configurable ;
- avec séparateurs ;
- labels icône / court / long ;
- labels côté / dessous ;
- modules visibles/masqués ;
- sauvegarde en profils ;
- réutilisable dans header, section, panneau ou zone dédiée.

Le **Data Studio** configure la toolbar ; la **Data Toolbar** reste utilisable seule au runtime.

## 6. Factorisation majeure : Query Engine

Aujourd'hui `TableWiz` orchestre directement `SearchWiz`, `FilterWiz`, tri et pagination. Cette responsabilité ne doit pas appartenir au tableau.

Cible :

```text
QueryEngine
├── SearchEngine
├── FilterEngine
├── SortEngine
└── PaginationModel
        │
        ▼
     ResultSet
```

`TableView`, `KPIViz`, `HistogramViz`, `CardView`, etc. consomment **le même ResultSet**.

Conséquence : une recherche ou un filtre appliqué depuis la Data Toolbar met à jour simultanément le tableau, les KPI et toutes les visualisations liées.

## 7. Factorisation majeure : View Registry

Le `RendererWiz` actuel mélange registre, choix responsive et rendus concrets. Il doit évoluer vers :

- `ViewRegistry` : enregistre/résout les vues disponibles ;
- `ViewResolver` : choisit une vue selon profil, contexte ou largeur ;
- vues concrètes séparées (`CardView`, `ListView`, etc.).

Le rendu `table` générique du RendererWiz doit être supprimé à terme au profit de `TableView`.

`MediaWiz.gallery()` et `MediaWiz.filmstrip()` ne doivent pas dupliquer `GalleryView`/`FilmstripView` : le média devient un type de cellule/contenu rendu par une vue.

## 8. Factorisation majeure : données statistiques

Le `DataWiz` actuel effectue trois familles de tâches : description, groupement et histogramme.

Cible recommandée :

- `DataProfiler` : count, missing, unique, top, typage/profil ;
- `StatsEngine` : agrégats numériques ;
- opérations group/histogram comme transformations de données partagées par les Viz.

Une première migration peut conserver une seule classe `StatsEngine` afin de ne pas sur-fragmenter prématurément.

## 9. Formats : sortir du JSON-centric

Le framework ne doit pas supposer que le stockage est JSON.

Cible :

```text
DataAdapter
├── JsonAdapter
├── CsvAdapter
├── ApiAdapter
└── SQLiteAdapter        # futur
```

Les Views/Controls/Viz ne connaissent jamais le format source. Ils manipulent `Dataset` / `ResultSet`.

Les jointures deviennent des relations du modèle (`RelationGraph` / `RelationEngine`) et non des manipulations spécifiques à deux fichiers JSON.

## 10. Mapping actuel → cible proposée

| Actuel | Cible proposée | Catégorie | Remarque |
|---|---|---|---|
| `DataWiz` | `DataProfiler` + `StatsEngine` | Engine | split progressif |
| `SearchWiz` | `SearchEngine` | Engine | orchestration future par QueryEngine |
| `FilterWiz` | `FilterEngine` | Engine | idem |
| tri dans `TableWiz` | `SortEngine` | Engine | sortir du tableau |
| pagination | `PaginationModel` | Model | nom actuel déjà pertinent |
| `TableWiz` | `TableView` + `TableStudio` si édition/config avancée | View/Studio | moteur query retiré |
| `RendererWiz` | `ViewRegistry` + `ViewResolver` | Core | plus de rendu monolithique |
| `MediaWiz` | `MediaView` / `MediaRenderer` | View | galleries factorisées |
| `JSON Studio` | `Data Studio` | Studio | JSON devient adapter/mode |
| `QRWiz` | `QRGenerator` | Engine/Service | `QR Studio` pour l'UI |
| `DocumentWiz` | `DocumentRenderer` / `DocumentExportService` | View/Service | impression/export séparables |
| `SeoWiz` | `SEOService` | Service | pas un wizard |
| `ShareWiz` | `ShareService` | Service | pas un wizard |
| `PresentationResolver` | `ViewResolver` ou `PresentationResolver` | Core | à harmoniser avec ViewRegistry |
| `PresetManager` | `ProfileStore` / `PresetStore` | Model/Service | générique aux studios/toolbars |
| `Toolbar` | `Toolbar` / `ComposableToolbar` | Component | primitive générique |
| `FloatingPanel` | `DockPanel` | Component | gauche/droite/flottant/rail |
| `ThemeWorkshop` | `ThemeStudio` | Studio | nom utilisateur + responsabilité claire |

## 11. Noms utilisateur vs noms techniques

Les noms visibles dans l'interface doivent rester courts :

- **Data Studio**
- **Theme Studio**
- **Layout Studio**
- **QR Studio**
- **Table**
- **Form**
- **Tree**
- **KPI**
- **Data Toolbar**

Les noms techniques peuvent être plus précis : `QueryEngine`, `ViewRegistry`, `SearchControl`, etc.

Il ne faut donc pas exposer nécessairement les noms de classes à l'utilisateur.

## 12. Migration recommandée

Ne pas renommer immédiatement tous les fichiers.

1. Valider cette nomenclature.
2. Créer les nouvelles interfaces/contrats sans casser V16.
3. Introduire `QueryEngine` et `ViewRegistry` en premier.
4. Faire migrer TableWiz vers `TableView` sur la branche dédiée.
5. Construire la Data Toolbar sur les Controls.
6. Construire les Viz sur le même `ResultSet`.
7. Faire évoluer JSON Studio vers Data Studio.
8. Ajouter des aliases temporaires pour compatibilité (`SearchWiz -> SearchEngine`, etc.) si nécessaire.
9. Retirer les anciens noms uniquement après migration des consommateurs et tests.

## 13. Règles anti-duplication

- une recherche n'est implémentée qu'une fois ;
- un filtre n'est implémenté qu'une fois ;
- un tableau ne possède pas son propre moteur de requête ;
- une Viz ne recharge pas elle-même les données ;
- une View ne connaît pas le format source ;
- les galleries/filmstrips ne sont pas recodés par chaque type média ;
- les Studios configurent les briques, ils ne dupliquent pas leur logique runtime ;
- les profils utilisent un stockage commun ;
- les Toolbars utilisent la même primitive de composition/drag-drop.

## 14. Décision proposée

La famille `*Wiz` devient une famille historique/de compatibilité, puis disparaît progressivement.

La grammaire cible de nLab devient :

**Engine → Model/ResultSet → Control → View/Viz → Toolbar → Studio**

avec **Adapter** pour les formats et **Service** pour les capacités transversales.
