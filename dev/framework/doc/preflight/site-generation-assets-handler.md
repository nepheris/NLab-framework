# Site Generation Assets Handler

## Objet

`assets-handler.mjs` implémente le stage machine `assets` du pipeline de génération Lot 9.

Il transforme :

```text
pages.rendered + assets.sources
              ↓
        assets.prepared
```

Le handler prépare physiquement des fichiers dans un `outputRoot` déclaré, sans logique métier.

## Artefacts nLab référencés

Aucun artefact nLab existant n'est requis par ce lot.

## Contrat `assets.sources`

Le handler accepte soit un tableau, soit `{ assets: [...] }`.

Chaque entrée supporte :

```json
{
  "id": "logo",
  "source": "img/logo.svg",
  "target": "assets/logo.svg",
  "required": true,
  "fallback": "img/fallback.svg",
  "metadata": {}
}
```

- `id` doit être unique ;
- `target` doit être unique ;
- `source`, `target` et `fallback` sont des chemins relatifs sûrs ;
- aucun `..`, chemin absolu, query string ou fragment n'est accepté ;
- `required` vaut `true` par défaut ;
- `fallback` est explicite : aucun fallback métier n'est inventé.

## Préparation

Pour chaque asset :

1. lecture de `sourceRoot/source` ;
2. si absent et fallback déclaré, lecture du fallback ;
3. si toujours absent :
   - asset requis → `fail` ;
   - asset optionnel → `warn` + entrée `missing` ;
4. création du dossier cible ;
5. copie byte-for-byte vers `outputRoot/target` ;
6. ajout d'une entrée au manifeste `assets.prepared`.

Le handler ne modifie pas `pages.rendered`.

## Sortie

`assets.prepared` contient notamment :

- `assets[]` ;
- `asset_count` ;
- `missing_count` ;
- `output_root`.

Chaque entrée préparée expose `id`, source réellement utilisée, target, statut, fallback éventuel et taille en octets.

## Statuts

- `pass` : tous les assets sont préparés sans anomalie ;
- `warn` : fallback utilisé et/ou asset optionnel absent ;
- `fail` : asset requis absent, chemin non sûr, doublon ou erreur filesystem.

## Frontières

Le handler :

- ne choisit pas les fichiers métier ;
- ne génère pas de slug ou route ;
- ne transforme pas implicitement les images ;
- ne publie rien ;
- ne décide pas d'un fallback non déclaré ;
- n'embarque aucune validation HUMAN.

Une transformation future (optimisation image, compression, dérivés, etc.) devra rester explicite via un contrat ou processeur dédié plutôt que d'être cachée dans ce handler V1.

## Test

`dev/framework/tests/site-generation-assets-handler.test.mjs` couvre :

- copie nominale ;
- fallback explicite ;
- asset optionnel absent ;
- asset requis absent ;
- doublon de target ;
- path traversal refusé ;
- mauvais type de stage ;
- absence de `pages.rendered` ;
- intégration avec `SiteGenerationRunner`.

Commande :

```bash
node dev/framework/tests/site-generation-assets-handler.test.mjs
```
