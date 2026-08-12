# MediaDocumentWiz — contrat documents MD1

## Rôle

`MediaDocumentWiz` formalise les documents/médias du backlog sans recomposer le HTML produit par `MediaWiz`.

Il produit uniquement des **descripteurs** : format, aperçu, viewer, liens et actions. Les destinations passent par un `LinkWiz` injecté ; les métadonnées de format passent par un `FileFormatRegistry` injecté.

Aucun fichier `media-wiz.js`, `link-wiz.js` ou `file-format-registry.js` n’est modifié.

## Modes

- `inline`
- `thumbnail`
- `gallery`
- `viewer`
- `link`
- `download`

Pour un PDF sans mode explicite, le mode par défaut est `viewer`. Pour un autre format, le défaut est `inline`.

## Normalisation

```js
const doc = wiz.normalize({
  id: 'guide',
  url: '/docs/guide.pdf',
  initialPage: 3,
  previewUrl: '/docs/guide.png',
  permissions: {
    share: true,
    print: true
  }
});
```

Le résultat contient :

- `id`
- `url`
- `label`
- `mode`
- `page`
- `format`
- `permissions`
- `preview`
- `metadata`

Les metadata sont clonées défensivement.

## PDF

Pour `format.id === 'pdf'` :

- `page` / `initialPage` doit être un entier positif ;
- la présentation `viewer` expose `{ url, formatId, page }` ;
- une vignette explicite utilise `preview.kind = image` ;
- sans vignette, le fallback est `preview.kind = icon` avec l’`iconKey` du File Format Registry.

La page initiale reste une métadonnée du viewer : le moteur ne réécrit pas arbitrairement l’URL du document.

## LinkWiz obligatoire pour les destinations

Toute destination interactive est normalisée par :

```js
linkWiz.normalize(descriptor)
```

Cela concerne :

- ouvrir ;
- nouvel onglet ;
- viewer ;
- download ;
- partage ;
- impression.

Si aucun LinkWiz compatible n’est injecté alors qu’une présentation exige une destination, `LINK_WIZ_REQUIRED` est levée.

Ainsi, MediaDocumentWiz ne crée pas son propre contrat concurrent de sécurité/cible.

## Lien principal

`primaryLink()` applique les règles suivantes :

- `inline` / `gallery` → pas de lien principal ;
- `download` → cible LinkWiz `download` ;
- `viewer` → cible `viewer` ;
- `thumbnail` PDF → `viewer` ;
- autre thumbnail → `new` ;
- `link` → `new`.

## Actions permissionnées

Permissions par défaut :

- `open: true`
- `download: true`
- `share: false`
- `print: false`

`actions()` ne retourne que les actions autorisées.

- `open` → lien média viewer pour PDF, sinon nouvel onglet ;
- `download` → lien média `download` ;
- `share` → action LinkWiz `media.share` ;
- `print` → action LinkWiz `media.print`.

L’exécution effective du partage/impression appartient à la couche applicative.

## Galerie

`gallery(items)` produit une liste de présentations en mode `gallery` sans lien principal automatique. Cela laisse au renderer le choix de la hiérarchie DOM et évite de créer une ancre autour d’un contenu qui contiendrait déjà un lien.

## File Format Registry

Lorsqu’il est injecté, le registry reçoit notamment :

```js
{
  format,
  filename,
  mime
}
```

Le descripteur résolu (`id`, `label`, `iconKey`, etc.) est conservé dans `document.format`.

Sans registry, un fallback minimal distingue PDF et fichier générique.

## Erreurs structurées

- `INVALID_DOCUMENT`
- `URL_REQUIRED`
- `INVALID_PAGE`
- `LINK_WIZ_REQUIRED`

## Vérification

Prototype Node 22 :

```text
media document wiz tests: ok
```

Blobs publiés :

- moteur : `c0245a007b333cb56fcd85d5b0f0eb75193a955e`
- test : `5bcf0043417f6645c7607750f474553e5a8e600d`

La suite couvre : PDF viewer/page, fallback icône, preview image, thumbnail, link, download filename, galerie, permissions, actions share/print, délégation LinkWiz, absence de LinkWiz, fallback sans registry et clone défensif des metadata.

## Raccord futur

Un lot séparé pourra brancher `MediaWiz` sur ces descripteurs et sur `LinkWiz.render()` sans réintroduire d’ancres imbriquées. MD1 ne touche pas le renderer historique et peut donc être intégré indépendamment.
