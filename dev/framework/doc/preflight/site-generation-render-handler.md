# Site Generation — handler `render`

## Objet

`tools/site/handlers/render-handler.mjs` branche le stage machine `render` du pipeline Lot 9 sur la brique de rendu générique existante **RendererWiz**.

- Artefact nLab référencé : `RendererWiz`
- ID nLab : **non déclaré** dans les contrats actuellement présents dans le repository.
- Source : `dev/framework/wiz/renderer-wiz.js`

Le handler reste renderer-neutral au niveau du pipeline : il reçoit un `render.config` déclaratif et produit `pages.rendered`. Aucun nom de page, de collection ou de domaine métier n'est codé en dur.

## Entrées

Le stage consomme :

- `data.resolved` — snapshot produit par le handler `relations` ;
- `render.config` — configuration déclarative des familles de pages.

Le handler peut également recevoir `config` lors de sa création ; cette valeur est prioritaire et facilite les tests ou un assemblage explicite par le consommateur.

## `render.config` V1 implicite

Exemple :

```json
{
  "pages": [
    {
      "id": "catalogue-cards",
      "collection": "items",
      "renderer": "cards",
      "source": "enriched",
      "options": {
        "titleField": "name",
        "textField": "description"
      }
    }
  ]
}
```

Chaque entrée exige :

- `id` unique ;
- `collection` présente dans `data.resolved.collections` ;
- `renderer` connu du renderer injecté ;
- `source` optionnel parmi `data`, `resolved`, `enriched`, `entry` ;
- `options` optionnel, transmis au renderer.

`source` vaut `enriched` par défaut : les champs du record source et les relations résolues sont fusionnés dans un objet de rendu sans modifier le snapshot d'origine.

## Sortie

Le handler produit :

```json
{
  "pages.rendered": {
    "pages": {
      "catalogue-cards": {
        "id": "catalogue-cards",
        "collection": "items",
        "renderer": "cards",
        "source": "enriched",
        "record_count": 12,
        "content": "<div>...</div>"
      }
    },
    "page_ids": ["catalogue-cards"],
    "page_count": 1,
    "total_records": 12
  }
}
```

Le handler ne choisit aucun chemin de publication. Cette responsabilité appartient aux stages `routes` et `output`.

## RendererWiz

`RendererWiz` fournit actuellement plusieurs renderers génériques :

- `cards` ;
- `compact-cards` ;
- `list` ;
- `links` ;
- `gallery` ;
- `tiles` ;
- `filmstrip` ;
- `table`.

Le handler n'en dépend pas par une liste codée en dur : il utilise `renderer.has()` lorsqu'elle existe et `renderer.render()` pour l'exécution. Un autre renderer compatible peut donc être injecté.

## Échecs structurés

Le handler retourne `status: fail` notamment pour :

- `data.resolved` absent ;
- `render.config` invalide ;
- ID de page dupliqué ;
- collection absente ;
- renderer inconnu ;
- source de record invalide ;
- sortie du renderer non textuelle ;
- erreur interne du renderer.

Le runner conserve ensuite la responsabilité de l'application de `on_failure`.

## Test

`tests/site-generation-render-handler.test.mjs` couvre :

1. rendu multi-pages avec le vrai `RendererWiz` ;
2. `render.config` transmis comme artefact ;
3. renderer inconnu ;
4. collection absente ;
5. ID de page dupliqué ;
6. type de stage incorrect ;
7. `data.resolved` absent ;
8. intégration avec `SiteGenerationRunner` et propagation d'artefacts.

## Frontières

Ce lot ne :

- définit aucune page métier ;
- ne choisit aucun chemin/slug ;
- ne copie aucun asset ;
- n'assemble aucun dossier web ;
- ne publie aucune preview ;
- ne modifie pas `RendererWiz` ;
- ne nécessite aucune validation HUMAN.
