# JSON Studio — vérification Agent A J1–J3 + revue d’intégration

## Résultat

Le moteur JSON Studio a été reconstruit et exécuté dans le sandbox Agent A avec un stub minimal de `TableWiz`, afin d’isoler ses contrats propres.

Après revue d’intégration, deux durcissements supplémentaires ont été appliqués :

1. `setData(..., { recordHistory:false })` purge désormais les anciennes piles undo/redo afin qu’un remplacement de dataset ne permette pas de revenir accidentellement dans l’historique du dataset précédent ;
2. les vues Tree/Form conservent les chemins sous forme de tableaux en interne, ce qui permet d’éditer correctement une clé JSON contenant un point (`"a.b"`) sans la confondre avec un chemin imbriqué.

Le Git blob SHA du moteur revu et testé est :

```text
1c4867ae8329322933c8db98aee10c25b44a74bb
```

Il est identique au blob GitHub de `dev/framework/wiz/json-studio.js` après la revue.

## Tests exécutés — Node 22

```text
json studio core tests: ok
json studio DOM tests: ok
json studio relation/display tests: ok
```

### Core / historique

Couvre notamment : clone défensif, chemins sûrs, set/unset, add/remove/move, undo/redo, limite d’historique, transactions, import Raw transactionnel, diff, reset vers original et purge de l’historique lors d’un remplacement non historisé de dataset.

### DOM

Couvre notamment : clés/valeurs HTML traitées comme texte, Tree sans `innerHTML`, Form numérique validé avant commit, Raw invalide non destructif, délégation minimale à `table.render(container, rows)` et édition correcte d’une clé littérale contenant `.`.

### Relations / mapping d’affichage

Couvre : validation du buffer courant record par record, absence d’appel à `validateCollection()` pour les données éditées, agrégation erreurs/warnings, résolution `one` et `many`, modes `label`, `id`, `id+label`, `object`, champ label imbriqué, fallback identifiant d’une relation many non résolue et non-mutation de la donnée brute.

## Contrats externes contrôlés

### DataValidator

Le contrat courant expose `validateRecord(collectionName, record, { recordIndex })` tandis que `validateCollection(collectionName)` recharge la collection via provider. JSON Studio utilise donc `validateRecord()` pour son buffer édité.

### DataResolver

Le contrat courant expose `resolveRecord(collectionName, record)` et retourne `{ collection, data, resolved, issues }`. JSON Studio produit une propriété `display` séparée sans transformer les références métier brutes.

### TableWiz

JSON Studio ne modifie pas TableWiz et conserve le contrat historique minimal :

```js
table.render(container, rows)
```

Il n’a donc pas besoin des API A1–A7 de la PR #33 pour être intégré.

## Conclusion

Le lot est techniquement prêt pour intégration autonome :

- moteur exact exécuté ;
- tests core/DOM/relations verts après revue ;
- deux anomalies de revue corrigées ;
- scope indépendant ;
- aucun fichier TableWiz, DataValidator, DataResolver, DataWiz ou démo modifié.
