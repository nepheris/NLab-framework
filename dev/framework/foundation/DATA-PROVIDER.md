# DataProvider — contrat initial

`DataProvider` est la frontière entre le modèle logique du framework et le stockage physique.

## Contrat minimal

- `init()` : initialise le provider.
- `listCollections()` : liste les collections disponibles.
- `getCollection(name)` : retourne une collection.
- `getRecord(name, id, options)` : retourne un enregistrement.
- `saveCollection()` : écriture optionnelle.
- `saveRecord()` : écriture optionnelle.
- `deleteRecord()` : suppression optionnelle.
- `close()` : libère les ressources éventuelles.

Le contrat est lecture seule par défaut. Chaque provider déclare ses capacités : lecture, écriture, suppression, requêtes avancées et transactions.

## DataRegistry

Le registre associe des collections à un provider et décrit leur source, leur champ identifiant, leur champ libellé éventuel, leur schéma et leurs relations.

## Relations

Une relation déclare :

- `field` : champ source contenant la référence ;
- `target` : collection cible ;
- `targetField` : champ cible, `id` par défaut ;
- `cardinality` : `one` ou `many` ;
- `required` : référence obligatoire ou non ;
- `onMissing` : politique en cas de référence absente.

## Étape suivante

Créer `JsonDataProvider`, premier provider concret pour les collections JSON locales/statique, puis ajouter DataResolver et DataValidator.

## Test réalisé

Le contrat JavaScript a été testé avec un provider mémoire minimal : lecture d’une collection, recherche par identifiant et refus d’écriture en lecture seule. Les trois schémas JSON ont aussi été parsés avec succès avant commit.
