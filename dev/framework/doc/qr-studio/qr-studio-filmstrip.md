# QRStudioFilmstrip

`QRStudioFilmstrip` fournit la couche de présentation DOM-free de la **pellicule compacte des presets QR**.

Son objectif est de présenter simultanément tous les presets système du `QRStudioSession`, tout en conservant une sélection navigable et les états utiles à l'interface.

## Frontières

Le découpage reste strict :

- `QRStudioSession` reste la source de vérité du workflow `draft / référence / validation / reset` ;
- `FilmstripController` reste la source de vérité de la navigation générique ;
- `QRWiz` reste le générateur QR ;
- `QRStudioFilmstrip` ne génère pas de QR, ne persiste rien et ne rend aucun DOM/CSS.

## Construction

```js
const filmstrip = new QRStudioFilmstrip({
  session,
  controllers: ['arrows', 'dots', 'thumbnails', 'counter'],
  loop: true
});
```

La session doit exposer les API publiques `list`, `select`, `beginEdit`, `patch`, `regenerate`, `validate` et `reset`.

Un `FilmstripController` compatible peut être injecté. Sinon le composant en crée un avec les contrôleurs `arrows`, `dots`, `thumbnails` et `counter`.

## Tous les presets visibles

```js
const descriptor = filmstrip.descriptor();
```

Le descriptor principal contient :

- `type: 'qr-studio-filmstrip'` ;
- `layout: 'compact'` ;
- `allVisible: true` ;
- `count` ;
- `selectedId` ;
- `items` : toutes les cartes/presets ;
- `controller` : snapshot du FilmstripController et descripteurs de contrôles.

Avec le schéma QR actuel, les six éléments sont :

1. `standard` ;
2. `transparent` ;
3. `colored-background` ;
4. `with-logo` ;
5. `theme-monochrome` ;
6. `custom`.

## État d'une carte

Chaque item expose notamment :

- `selected` ;
- `editing` ;
- `dirty` ;
- `validated` ;
- `pending` ;
- `generationCount` ;
- `preview` / `previewError` ;
- `config` et `meta` copiés défensivement ;
- `status` ;
- `markers` sémantiques ;
- les quatre actions standard ;
- `ariaLabel` et `ariaCurrent`.

Les valeurs `status` possibles sont :

- `regenerating` ;
- `generation-error` ;
- `editing-dirty` ;
- `editing` ;
- `dirty` ;
- `validated` ;
- `idle`.

## Bordure de sélection et états

`markers.selection` vaut `border` pour le preset sélectionné et `none` pour les autres. Le composant ne choisit aucune couleur ou épaisseur : la couche visuelle peut traduire ce marker en bordure sans remplacer le fond de la carte.

Les autres markers séparent explicitement :

- édition ;
- modifications non validées ;
- validation ;
- génération pending/error/ready.

## Navigation synchronisée

```js
filmstrip.select('with-logo');
filmstrip.next();
filmstrip.previous();
```

La sélection est synchronisée dans les deux sens :

- une action du filmstrip appelle `QRStudioSession.select()` ;
- un changement d'index émis par `FilmstripController` sélectionne le preset correspondant dans la session.

Un garde `syncing` évite les boucles lors des synchronisations programmatiques.

## Actions de preset

Le filmstrip délègue directement au workflow du `QRStudioSession` :

```js
filmstrip.beginEdit('with-logo');
filmstrip.patch({ dark: '#123456' }, { id: 'with-logo' });
await filmstrip.regenerate('with-logo');
filmstrip.validate('with-logo', { persist: false });
filmstrip.reset('with-logo');
```

Chaque carte contient les actions :

- `Modifier` ;
- `Régénérer` ;
- `Valider / OK` ;
- `Reset`.

Pendant une régénération, les actions sont désactivées par descriptor afin d'éviter les commandes concurrentes sur la même carte.

## Preview

Par défaut, lorsqu'une régénération a réussi, `preview` reprend `lastGeneration.result` de la session.

Une couche spécifique peut fournir un adaptateur :

```js
new QRStudioFilmstrip({
  session,
  previewOf(state) {
    return buildPreviewDescriptor(state);
  }
});
```

Les erreurs de `previewOf` sont contenues dans `previewError` et ne cassent pas la pellicule.

Aucun asset fictif ou rendu QR n'est créé par ce composant.

## Contrôleurs génériques

Les descripteurs `arrows`, `dots` et `counter` viennent directement de `FilmstripController`.

Pour `thumbnails`, la liste générique est enrichie avec :

- `id` ;
- `label` ;
- `selected` ;
- `status`.

La couche UI peut donc conserver les contrôleurs interchangeables tout en affichant les informations propres aux presets QR.

## Événements

`onChange` reçoit les événements de présentation :

- `select` ;
- `edit` ;
- `patch` ;
- `regenerate-start` ;
- `regenerate` / `regenerate-error` ;
- `validate` / `validate-error` ;
- `reset` ;
- `refresh` lorsque demandé.

## Nettoyage

```js
filmstrip.destroy();
```

supprime l'abonnement au `FilmstripController` et vide les états pending locaux.

## Vérification

```bash
node dev/framework/tests/qr-studio-filmstrip.test.mjs
```

Le test utilise le vrai `QRStudioSession` et couvre les six presets système, la visibilité simultanée, la sélection bidirectionnelle, les contrôleurs, l'édition, le dirty state, la régénération, le preview, la validation, le reset, les erreurs de preview et l'absence de générateur.
