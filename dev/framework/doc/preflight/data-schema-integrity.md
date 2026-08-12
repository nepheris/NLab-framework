# Data JSON Schema integrity contract

`data-schema-integrity.test.mjs` protège automatiquement tous les fichiers `dev/framework/data/*.schema.json`.

Le test ne contient pas de catalogue manuel : il découvre les schémas présents dans le dossier à chaque exécution. Tout nouveau `*.schema.json` est donc couvert automatiquement par le runner de tests standard du framework.

## Invariants globaux

Pour chaque schéma :

- le fichier doit contenir du JSON valide ;
- `$schema` doit être `https://json-schema.org/draft/2020-12/schema` ;
- `$id` doit exister et être non vide ;
- les `$id` doivent être uniques dans le dossier.

## Références

Le test parcourt récursivement les `$ref`.

### Référence locale dans le même document

Exemple :

```json
{ "$ref": "#/$defs/gateStatus" }
```

Le JSON Pointer doit réellement se résoudre dans le document courant.

### Référence relative vers un autre fichier

Exemple :

```json
{ "$ref": "collection.schema.json" }
```

Le fichier cible doit exister relativement au schéma source. Si la référence contient aussi un fragment JSON Pointer, le document cible est chargé et le fragment doit se résoudre.

### Référence distante

Les URI avec schéma (`https:`, etc.) ne sont pas téléchargées. Le test est volontairement offline et dependency-free ; il contrôle uniquement l'intégrité locale du dépôt.

## LivePreflight

Lorsque `live-preflight-output.schema.json` existe, le test vérifie en plus qu'il référence explicitement :

- `live-preflight-report.schema.json` ;
- `live-preflight-error.schema.json`.

Cela protège le point d'entrée machine succès/erreur sans maintenir un second catalogue.

## Ce que ce test ne fait pas

Ce n'est pas un validateur JSON Schema complet. Il ne valide pas des jeux de données contre les schémas et n'implémente pas Draft 2020-12.

Son rôle est plus ciblé : détecter tôt les erreurs de maintenance structurelles du référentiel de schémas lui-même — JSON cassé, draft divergent, `$id` dupliqué ou `$ref` local mort.

## Exécution

Le runner standard découvre récursivement tous les `*.test.mjs`, donc aucune modification CI n'est nécessaire :

```bash
node dev/framework/tools/testing/run-tests.mjs dev/framework/tests
```

Le test seul :

```bash
node dev/framework/tests/data-schema-integrity.test.mjs
```

Résultat attendu :

```text
data schema integrity tests: ok (N schemas)
```
