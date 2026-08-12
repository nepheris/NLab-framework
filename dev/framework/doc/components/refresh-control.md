# RefreshControl

`RefreshControl` est la primitive standard d'action **Actualiser** du framework. Elle fixe le contrat d'état, d'accessibilité et de feedback sans dépendre de `NavigationWiz`, `HeaderStudio` ou `DataRefresh`.

## Objectif

Le backlog UX demande un bouton Actualiser avec icône SVG, feedback visible et comportement équivalent à un reload de page. Cette primitive sépare :

- le **contrôle UI** (`RefreshControl`) ;
- l'**action métier/données** (`onRefresh`, éventuellement connectée à DataRefresh) ;
- le **reload navigateur** (`reload`) ;
- l'**icône physique** (`iconRenderer`, idéalement alimenté par IconWiz/IconRegistry).

Aucun de ces moteurs n'est modifié par ce lot.

## États

Le contrôle expose quatre états déterministes :

- `idle` — prêt ;
- `running` — actualisation en cours ;
- `success` — dernière actualisation réussie ;
- `error` — dernière actualisation en erreur.

`state()` retourne aussi `disabled`, `busy`, `runCount`, `lastSource` et une erreur sérialisée `{name,message}`.

## Activation

```js
const refresh = new RefreshControl({
  onRefresh: async () => provider.reload()
});

const result = await refresh.activate({ source: 'toolbar' });
```

Règles :

1. si le contrôle est désactivé, l'activation est ignorée avec `reason: "disabled"` ;
2. pendant `running`, toute nouvelle activation retourne **la même Promise** ;
3. `onRefresh` est prioritaire ;
4. sans `onRefresh`, l'adaptateur `reload` est utilisé ;
5. par défaut, `reload` appelle `globalThis.location.reload()` lorsqu'il existe ;
6. si aucun handler n'est disponible, le contrôle passe en `error` plutôt que d'annoncer un faux succès ;
7. une exception callback/reload est contenue dans le résultat `{ok:false,error,...}` et dans l'état `error`.

Le contrôle n'impose pas de temporisation automatique du feedback. `reset()` ramène explicitement à `idle` et refuse de casser une opération `running`.

## DOM et accessibilité

`mount(element)` rend le contrôle avec `documentRef` injectable.

Le DOM produit utilise :

- un vrai `button[type=button]` ;
- `aria-label` ;
- `aria-busy` pendant l'actualisation ;
- `data-action="refresh"` ;
- un feedback `role="status" aria-live="polite"` ;
- `data-refresh-state` sur le wrapper ;
- une icône décorative `aria-hidden="true"`.

Aucun `innerHTML` n'est utilisé. Le texte passe uniquement par `textContent`.

## Icône sémantique

```js
const control = new RefreshControl({
  iconRenderer: ({ key, state, document }) => iconWiz.render(key, { state, document })
});
```

Le contrat demande toujours `key: "refresh"`. Si l'adaptateur d'icône échoue ou ne retourne rien, le fallback texte `↻` est utilisé ; une erreur d'icône ne doit pas bloquer l'action Actualiser.

## Feedback / événements

`onStateChange(detail)` reçoit chaque transition. Un observateur défaillant ne casse pas le contrôle.

Quand `CustomEvent` est disponible et qu'un élément est monté, `nlab:refresh-state` est également émis avec le même détail cloné défensivement.

## Frontières de responsabilité

Ce lot ne modifie pas :

- `NavigationWiz` ;
- `HeaderStudio` ;
- `DataRefresh` ;
- `IconWiz` / `IconRegistry` ;
- la démo V19/V20 ;
- le CSS global.

Les intégrations possibles restent séparées : bouton Header, navigation latérale, toolbar Data, ou reload complet de page.

## Vérification

Test dédié :

```bash
node dev/framework/tests/refresh-control.test.mjs
```

Le test couvre notamment : coalescence concurrente, succès, erreur, désactivation, reload injecté, absence de handler, observateur défaillant, rendu DOM injectable, ARIA, icône et destruction.
