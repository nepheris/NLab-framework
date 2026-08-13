# Site Generation — handler `routes`

## Objet

`tools/site/handlers/routes-handler.mjs` branche le stage machine `routes` du Lot 9 sur un contrat déclaratif déterministe.

Il transforme :

```text
pages.rendered + routes.config -> routes.manifest
```

sans logique métier, sans accès réseau, sans publication et sans validation HUMAN.

## Artefacts nLab référencés

Aucun artefact nLab existant n'est requis par ce lot. La recherche dans le repository ne montre pas de brique dédiée de routage à réutiliser ; le handler reste donc une orchestration locale et déclarative du pipeline.

## Entrées

### `pages.rendered`

Artefact produit par le stage `render`. Chaque route référence un `page_id` existant.

### `routes.config`

Format minimal :

```json
{
  "routes": [
    {
      "id": "route.home",
      "page_id": "home",
      "path": "/"
    },
    {
      "id": "route.catalog",
      "page_id": "catalog",
      "path": "/catalog"
    }
  ]
}
```

Champs :

- `id` — identifiant stable de route ;
- `page_id` — identifiant d'une entrée de `pages.rendered.pages` ;
- `path` — chemin public POSIX normalisé ;
- `output_file` — optionnel, indice pour le stage `output` ;
- `metadata` — métadonnées libres sérialisables.

## Garanties

Le handler :

- refuse les IDs de route dupliqués ;
- refuse les chemins publics dupliqués ;
- refuse une route pointant vers une page inexistante ;
- normalise les séparateurs et le slash initial ;
- refuse les segments `.` / `..` ;
- refuse les query strings et fragments dans `path` ;
- conserve l'ordre déclaratif de `routes.config.routes` ;
- ne génère aucun slug métier automatiquement ;
- ne choisit aucun nom de fichier de publication par défaut.

La reproductibilité vient donc du contrat déclaré, pas d'une heuristique cachée.

## Sortie

Le stage produit :

```json
{
  "routes.manifest": {
    "routes": [],
    "route_ids": [],
    "paths": [],
    "by_id": {},
    "by_path": {},
    "route_count": 0
  }
}
```

`by_id` et `by_path` permettent aux stages suivants d'accéder de façon déterministe à une route sans recalculer la configuration.

## Échecs structurés

Le handler produit `status: fail` avec notamment :

- `INVALID_ROUTES_CONFIG` ;
- `INVALID_ROUTE_CONFIG` ;
- `INVALID_ROUTE_ID` ;
- `DUPLICATE_ROUTE_ID` ;
- `INVALID_ROUTE_PAGE_ID` ;
- `UNKNOWN_ROUTE_PAGE` ;
- `INVALID_ROUTE_PATH` ;
- `DUPLICATE_ROUTE_PATH`.

## Frontières

Ce lot ne :

- crée pas le fichier HTML final ;
- ne copie aucun asset ;
- ne publie aucune preview ;
- ne définit aucune convention métier de slug ;
- ne décide pas de redirections ;
- ne modifie pas la navigation runtime du Framework.

Ces responsabilités appartiennent aux stages suivants ou à des configurations spécifiques du consommateur.

## Test

`tests/site-generation-routes-handler.test.mjs` couvre :

1. manifeste nominal ;
2. config fournie comme artefact ;
3. chemin dupliqué ;
4. page inconnue ;
5. path traversal refusé ;
6. mauvais type de stage ;
7. `pages.rendered` absent ;
8. intégration `SiteGenerationRunner -> routes` avec artefacts propagés.
