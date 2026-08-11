# SearchWiz / FilterWiz — contrats de robustesse

## Périmètre

Ce lot consolide uniquement `SearchWiz` et `FilterWiz`. `TableWiz` reste explicitement hors périmètre et sous la responsabilité de son propre lock.

## SearchWiz

### Entrées

- une source non-tableau produit un `ResultSet` vide au lieu d'une exception ;
- `fields` accepte un tableau de noms ou un nom unique ;
- `locale` pilote la minuscule localisée, avec fallback standard ;
- le tokenizer conserve les lettres/nombres Unicode et retire les diacritiques combinants ;
- `stopwords` est optionnel et normalisé avec la même règle que la requête.

### Matching

- la recherche texte conserve le scoring historique ;
- `exact` compare le haystack normalisé ;
- une RegExp globale/sticky voit son `lastIndex` remis à zéro avant chaque ligne ;
- le tri est stable à score égal grâce à l'index source ;
- `limit` est normalisé en entier positif ou nul ; `total` conserve le nombre avant limitation.

## FilterWiz

### Entrées

- une source non-tableau devient une source vide ;
- un filtre objet unique est accepté comme une liste à un élément ;
- `logic` est normalisé à `or` ou, par défaut, `and` ;
- les filtres sans `field` valide sont ignorés.

### Fail-closed

Un filtre mal formé ne doit pas élargir silencieusement le résultat :

- opérateur inconnu → aucun match ;
- RegExp invalide → aucun match ;
- `values` non-tableau pour `in` / `overlap` → liste vide ;
- `contains` avec valeur vide → aucun match ;
- comparaisons numériques avec `null`, vide, booléen ou nombre non fini → aucun match ;
- `date-between` avec donnée ou borne invalide → aucun match.

Les RegExp fournies avec un état (`g` / `y`) sont remises à `lastIndex=0` avant chaque test.

## Vérification

`tests/search-filter-robustness.test.mjs` couvre notamment :

- accents et Unicode non latin ;
- stopwords configurables ;
- `fields` chaîne ou tableau ;
- RegExp globale stable ;
- exact / limite / total ;
- chemins imbriqués ;
- logique AND/OR ;
- opérateurs numériques, date, regex, contains, in, overlap ;
- opérateurs inconnus et entrées invalides ;
- absence de mutation du tableau source via le `ResultSet` retourné.

Exécution locale sur le contenu exact du lot :

```text
search filter robustness tests: ok
```
