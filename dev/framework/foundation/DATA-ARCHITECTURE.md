# Architecture des données — Framework V2

## 1. Frontière physique

Le framework et les données métier ne partagent pas les mêmes fichiers.

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

metier/
├── data/
├── media/
├── documents/
├── imports/
└── exports/
```

## 2. Données internes du framework

Elles servent au fonctionnement générique : schémas techniques, registres, profils, thèmes, icônes, aide, configuration et datasets de démonstration.

## 3. Données métier

Elles décrivent le contenu présenté ou exploité par le site : objets métier, textes, listes, valeurs, images, médias, documents, sources, références et fichiers téléchargeables.

## 4. Format canonique

JSON est le format canonique. Les formats CSV, XLSX, TXT ou API sont des sources ou sorties transformées par adaptateurs.

```text
Source externe
    ↓
DataAdapter
    ↓
normalisation
    ↓
validation
    ↓
JSON canonique
```

## 5. Collections et relations

Une base métier peut être mono-fichier ou multi-collections.

Exemple :

```text
recettes.json
astuces.json
ingredients.json
allergenes.json
saisonnalite.json
sources.json
medias.json
```

Les relations sont explicites et reposent sur des identifiants canoniques.

```json
{
  "field": "ingredient_id",
  "type": "reference",
  "target": "ingredients",
  "target_key": "id"
}
```

## 6. Vue logique

```text
collections JSON
      ↓
DataRegistry
      ↓
DataIndex + DataRelation
      ↓
DataResolver
      ↓
DataModel
      ↓
UI / Wiz / exports
```

## 7. DataProvider

Le DataProvider abstrait la lecture et, lorsque possible, l’écriture.

```text
DataModel
   ↓
DataProvider
   ↓
JSON local | GitHub | Drive | API | SQLite | autre
```

Cette frontière permet de remplacer le stockage sans réécrire TableWiz, SearchWiz, JSON Studio ou les pages métier.
