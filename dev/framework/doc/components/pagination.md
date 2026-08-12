# Pagination — contrat

## Objectif

`PaginationModel` porte l'état de pagination indépendamment du DOM. `renderPagination()` fournit un rendu navigateur optionnel et destructible sans imposer de dépendance à TableWiz ou à une démo.

Ce contrat termine le lot `8B-PAGINATION-CONTRACT`, initialement réservé par l'Agent C puis repris par l'Agent A après disparition de la session C. Le changement d'agent ne modifie pas l'objectif fonctionnel du lot.

## PaginationModel

Le constructeur accepte :

- `page` — page courante, indexée à partir de 1 ;
- `pageSize` — nombre d'éléments par page ;
- `total` — nombre total d'éléments ;
- `pageSizes` — tailles proposées par l'interface consommatrice.

### Normalisation

- `pageSize` est converti en entier positif ;
- `total` est converti en entier positif ou nul ;
- `page` reste dans `[1, pageCount]` ;
- `pageSizes` est dédupliqué, trié, limité aux entiers positifs et contient toujours `pageSize`.

`pageCount` vaut au minimum 1, même lorsque `total === 0`, afin de conserver un état de navigation stable.

### Méthodes

- `setPage(page)` ;
- `setPageSize(size)` — conserve autant que possible la position logique de la première ligne visible ;
- `setTotal(total)` ;
- `slice(items)` — renvoie la tranche courante et accepte défensivement une entrée non-tableau ;
- `pages(maxButtons)` — fenêtre de numéros autour de la page courante ;
- `toJSON()` — snapshot sérialisable de l'état.

Toutes les méthodes de mutation renvoient le modèle.

## renderPagination

Signature :

```js
renderPagination(container, model, {
  onChange,
  document,
  CustomEvent,
  eventTarget,
  ariaLabel
})
```

`document` et `CustomEvent` sont injectables. Sans DOM utilisable, la fonction renvoie un contrôleur no-op au lieu de lever une exception.

### Accessibilité

Le conteneur reçoit :

- classe `nlab-pagination` ;
- `role="navigation"` ;
- un `aria-label` configurable.

Les boutons exposent des libellés ARIA explicites. La page active utilise `aria-current="page"`. Le résumé `Page X/Y · N éléments` utilise `aria-live="polite"`.

### Événement

Un changement effectif de page :

1. met à jour le modèle ;
2. appelle `onChange(model)` lorsqu'il est fourni ;
3. émet `nlab:page` sur `eventTarget` lorsque `CustomEvent` et `dispatchEvent` sont disponibles ;
4. rerend la pagination.

Le `detail` de l'événement correspond au snapshot `model.toJSON()`.

Un clic sur la page déjà active ne génère pas un faux changement.

### Cycle de vie

`renderPagination()` renvoie un contrôleur :

```js
{
  model,
  render(),
  destroy()
}
```

`destroy()` :

- détache les listeners créés par le renderer ;
- vide le conteneur ;
- retire la classe et les attributs ARIA ajoutés par le renderer ;
- rend les appels suivants inoffensifs.

## Compatibilité

L'API historique reste valide :

```js
renderPagination(container, model, { onChange });
```

Le retour du contrôleur est additif ; les consommateurs qui ignoraient la valeur de retour continuent de fonctionner.

## Tests

`dev/framework/tests/pagination.test.mjs` couvre :

- normalisation page/pageSize/total/pageSizes ;
- conservation de position lors du changement de taille ;
- bornage de page ;
- `slice()` défensif ;
- fenêtre de pages ;
- rendu sans DOM ;
- faux DOM injecté ;
- ARIA ;
- callback `onChange` ;
- événement `nlab:page` ;
- absence de faux événement sur page inchangée ;
- `destroy()`.

## Hors périmètre

Ce composant ne définit pas la toolbar TableWiz, la persistance de page, le routage URL ni la présentation métier des collections.
