# LinkThemeTokens

`LinkThemeTokens` porte les **pseudo-états visuels** des liens sans transformer `LinkWiz` en machine d'état CSS.

Le contrat répond au backlog UX pour : couleur, hover, focus, visited, active, disabled et décoration.

## États

Les états supportés sont :

- `normal` ;
- `hover` ;
- `focus` ;
- `visited` ;
- `active` ;
- `disabled`.

`normal` constitue la base. Par défaut, les autres états héritent de ses tokens et remplacent seulement leurs valeurs explicites.

```js
const theme = new LinkThemeTokens({
  normal: { color: 'var(--color-link)', decoration: 'underline' },
  hover: { color: '#1455cc' },
  focus: { outline: '2px solid currentColor' },
  visited: { color: 'rebeccapurple' },
  disabled: { opacity: 0.45 }
});
```

## Tokens d'un état

Chaque état peut définir :

- `color` ;
- `decoration` / `textDecoration` : `none`, `underline`, `overline`, `line-through` ;
- `decorationColor` / `textDecorationColor` ;
- `decorationStyle` / `textDecorationStyle` : `solid`, `double`, `dotted`, `dashed`, `wavy` ;
- `outline` — principalement pour le focus ;
- `opacity` — nombre entre `0` et `1`.

Le contrat ne choisit aucune palette par défaut.

## Héritage

```js
theme.state('hover');
```

retourne la fusion `normal + hover`.

Pour obtenir uniquement les overrides :

```js
theme.state('hover', { inherit: false });
```

## Variables CSS

```js
theme.variables();
```

projette des variables déterministes, par exemple :

- `--nlab-link-color` ;
- `--nlab-link-decoration` ;
- `--nlab-link-hover-color` ;
- `--nlab-link-focus-outline` ;
- `--nlab-link-visited-color` ;
- `--nlab-link-active-decoration` ;
- `--nlab-link-disabled-opacity`.

Le préfixe est configurable mais doit être un nom de custom property CSS valide commençant par `--`.

Ce lot **n'injecte aucun CSS** et ne modifie pas ThemeEngine.

## Sécurité

Les valeurs libres sont bornées à 256 caractères et rejettent :

- `;` et accolades ;
- caractères de contrôle ;
- balises `< >` ;
- `url(...)` ;
- `expression(...)`.

Les valeurs usuelles comme `var(--token)`, `currentColor`, `#fff`, `rgb(...)` ou `2px solid currentColor` restent acceptées tant qu'elles ne contiennent pas de construction interdite.

## Merge / snapshot

`merge()` applique des overrides d'état sans supprimer les autres tokens.

`snapshot()` retourne une copie défensive.

La forme courte sans clé d'état décrit directement `normal` :

```js
new LinkThemeTokens({ color: 'blue', decoration: 'none' });
```

## Frontières

Ce lot ne modifie pas :

- `LinkWiz` ;
- ThemeEngine / `default.json` ;
- les CSS globaux ;
- la démo ;
- les renderers de cartes/médias.

`LinkWiz` conserve donc son état métier `normal/active/disabled`, tandis que `hover/focus/visited` restent des pseudo-états de présentation consommables par CSS/ThemeWiz.

## Vérification

```bash
node dev/framework/tests/link-theme-tokens.test.mjs
```

Couverture : états, héritage, variables CSS, merge, copie défensive, forme courte, sécurité des valeurs, enums, opacity, état inconnu et préfixe invalide.
