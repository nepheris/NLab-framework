# JSON Studio — vérification Agent A J1–J3

## Résultat

Le moteur JSON Studio J1–J3 a été reconstruit dans le sandbox Agent A à partir du contenu publié sur la branche `agent-a/json-studio-industrialization`, avec un stub minimal de `TableWiz` pour isoler les contrats propres à JSON Studio.

Le Git blob SHA calculé localement pour le moteur testé est :

```text
8d8edcd1b0559d413060ad43a9ae819ca3ddf0ee
```

Il est **identique** au blob GitHub de :

```text
dev/framework/wiz/json-studio.js
```

après l’incrément J3.

Cette vérification supersède la limitation d’exécution notée au premier checkpoint J3 dans `json-studio.md`.

## Tests exécutés — Node 22

### Core / historique

```text
json studio core tests: ok
```

Couvre :

- clone défensif ;
- chemins sûrs ;
- set/unset ;
- add/remove/move ;
- undo/redo ;
- limite d’historique ;
- transactions ;
- import Raw transactionnel ;
- diff ;
- reset vers original.

### DOM

```text
json studio DOM tests: ok
```

Couvre :

- clés/valeurs HTML traitées comme texte ;
- Tree sans `innerHTML` ;
- Form numérique validé avant commit ;
- Raw invalide non destructif ;
- délégation minimale à `table.render(container, rows)`.

### Relations / mapping d’affichage

```text
json studio relation/display tests: ok
```

Couvre :

- validation du buffer courant record par record ;
- absence d’appel à `validateCollection()` pour les données éditées ;
- agrégation erreurs/warnings ;
- résolution `one` et `many` ;
- mapping `label`, `id`, `id+label`, `object` ;
- champ label imbriqué ;
- fallback identifiant pour relation many non résolue ;
- non-mutation de la donnée brute ;
- erreur explicite si le resolver ne fournit pas `resolveRecord()`.

## Contrats externes contrôlés

### DataValidator

Le contrat courant expose `validateRecord(collectionName, record, { recordIndex })` et `validateCollection(collectionName)` recharge la collection via provider.

JSON Studio utilise donc `validateRecord()` pour son buffer édité, ce qui évite de valider silencieusement un autre jeu de données.

### DataResolver

Le contrat courant expose `resolveRecord(collectionName, record)` et retourne :

```js
{
  collection,
  data,
  resolved,
  issues
}
```

JSON Studio ne modifie pas cette résolution. Il produit une propriété `display` séparée pour les valeurs lisibles.

### TableWiz

La branche JSON Studio ne modifie pas TableWiz et conserve le contrat minimal historique :

```js
table.render(container, rows)
```

L’adoption des nouvelles API TableWiz A1–A7 reste conditionnée à l’intégration de la PR #33.

## Conclusion

J1–J3 sont techniquement prêts pour revue :

- moteur exact exécuté ;
- tests core/DOM/relations verts ;
- scope indépendant ;
- validation et résolution alignées sur les contrats actuels ;
- aucun fichier TableWiz, DataValidator, DataResolver ou démo modifié.
