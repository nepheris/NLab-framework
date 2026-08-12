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

### Autocomplétion configurable

`suggest(items, query, options)` fournit une liste de valeurs directement exploitable par une interface d'autocomplétion sans modifier les objets source.

Options :

- `fields` : champ unique ou liste de champs ; en son absence, les valeurs scalaires de l'objet sont candidates ;
- `limit` : nombre maximal de suggestions, `8` par défaut et `0` pour désactiver la sortie ;
- `minChars` : longueur minimale de la requête, `1` par défaut ;
- `locale` : même normalisation locale/diacritique que la recherche ;
- `match` : `contains` par défaut, ou `prefix` pour n'accepter que les valeurs commençant par la requête.

Les tableaux de valeurs (par exemple `tags`) sont aplatis d'un niveau. Les objets imbriqués, valeurs nulles et chaînes vides ne deviennent pas des suggestions.

Ordre de score :

1. égalité exacte normalisée ;
2. préfixe de la valeur complète ;
3. préfixe d'un token en mode `contains` ;
4. présence de la requête ailleurs dans la valeur en mode `contains`.

À score égal, les valeurs les plus courtes puis l'ordre de la source sont prioritaires. La déduplication utilise la forme normalisée : `Entrée`, `entree` et `ENTRÉE` ne produisent qu'une suggestion, en conservant la première forme rencontrée.

Une source invalide, une requête sous `minChars` ou `limit:0` retourne `[]`.

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
- autocomplétion `prefix` / `contains`, limites et `minChars` ;
- déduplication insensible aux accents/casse ;
- suggestions depuis des champs tableaux ;
- chemins imbriqués ;
- logique AND/OR ;
- opérateurs numériques, date, regex, contains, in, overlap ;
- opérateurs inconnus et entrées invalides ;
- absence de mutation du tableau source via le `ResultSet` retourné.

Exécution locale sur le contenu exact du lot :

```text
search filter robustness tests: ok
```
