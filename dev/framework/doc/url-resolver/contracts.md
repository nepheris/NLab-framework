# URLResolver — contrat de robustesse

## Objectif

`URLResolver` centralise la composition des URLs de page, assets et API sans imposer de politique de sécurité de protocole au core générique.

## Base

- fallback sans navigateur : `http://localhost/` ;
- `baseUrl` peut être une URL absolue, relative ou un objet `URL` ;
- une base relative est résolue contre `globalThis.location.href` lorsqu'il existe ;
- si la location runtime est invalide mais qu'une base explicite valide est fournie, la base explicite reste utilisable ;
- une entrée réellement invalide produit une erreur explicite.

## Résolution

`resolve(path, base)` accepte :

- chemins relatifs ;
- URLs absolues ;
- objets `URL` ;
- une base relative, elle-même résolue contre `baseUrl`.

## Assets et API

- `assetsBase=null` revient au défaut `assets/` ;
- `apiBase=null` ou chaîne vide désactive l'API et `api()` retourne `null` ;
- les bases assets/API relatives sont composées à partir de `baseUrl`.

## URL courante

`current()` :

- suit la `location.href` runtime lorsqu'elle est valide ;
- retombe sur `baseUrl` si `location` est absente ou invalide ;
- permet de retirer hash et query indépendamment via `stripHash` et `stripQuery`.

## Vérification

`tests/url-resolver-robustness.test.mjs` couvre base absolue/relative, assets, API, objets `URL`, contextes sans navigateur, location invalide et retrait query/hash.

Exécution locale sur le contenu exact du lot :

```text
url resolver robustness tests: ok
```
