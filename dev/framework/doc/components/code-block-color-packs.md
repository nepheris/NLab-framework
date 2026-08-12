# CodeBlockColorPacks — packs de coloration configurables

## Objectif

`CodeBlockColorPacks` ajoute une couche de coloration configurable au-dessus des classes sémantiques déjà produites par `CodeBlock`, sans modifier `code-block.js` ni imposer un nouveau rendu par défaut.

Le composant reste autonome : il peut être utilisé avec un vrai DOM, un DOM injecté ou sans DOM.

## Tokens pris en charge

Les catégories sont alignées sur les classes existantes de CodeBlock :

- `key` ;
- `string` ;
- `literal` ;
- `number` ;
- `comment` ;
- `keyword` ;
- `tag` ;
- `property`.

`CodeBlockColorPacks.tokenKinds()` retourne une copie de cette liste.

## Packs intégrés

Trois packs sont disponibles :

- `default` : aucune couleur inline, donc comportement historique conservé ;
- `classic` : palette légère avec variantes clair/sombre ;
- `contrast` : contraste renforcé avec variantes clair/sombre.

`CodeBlockColorPacks.builtinPacks()` retourne une copie indépendante des définitions.

## Pack personnalisé

Un pack est un objet :

```js
{
  label: 'Brand',
  light: {
    keyword: '#112233',
    string: 'rgb(10, 20, 30)',
    comment: 'var(--muted)'
  },
  dark: {
    keyword: '#ddeeff'
  }
}
```

En mode sombre, la palette `dark` surcharge la palette `light`. Les clés absentes conservent donc la valeur claire éventuelle.

La validation refuse :

- les catégories de token inconnues ;
- les couleurs vides ;
- les valeurs contenant `;`, guillemets ou balises ;
- les formats non reconnus.

Les formats acceptés couvrent notamment hex, `rgb/rgba`, `hsl/hsla`, couleurs nommées simples et `var(--variable)`.

`CodeBlockColorPacks.validatePack(pack)` retourne `{ valid, errors }` sans mutation.

## API

### Construction

```js
const colors = new CodeBlockColorPacks({
  active: 'classic',
  theme: 'dark',
  packs: {
    brand: { light: { keyword: '#112233' } }
  }
});
```

Un identifiant de pack inconnu au constructeur retombe sur `default`.

### `list()`

Retourne les packs sous forme de copies indépendantes avec `builtin:true|false`.

### `register(id, pack, { replace })`

Ajoute un pack validé. Les identifiants doivent être sûrs. Un doublon est refusé sauf remplacement explicite.

### `remove(id)`

Supprime uniquement un pack personnalisé. Les packs intégrés sont protégés. Si le pack actif est supprimé, l'état revient à `default`.

### `setActive(id)`

Active un pack existant et retourne `true`. Un identifiant absent retourne `false` sans changer l'état.

### `setTheme(theme)`

Normalise le thème sur `light` ou `dark`.

### `palette()` / `color()` / `cssVariables()`

Ces méthodes exposent la palette résolue sans DOM. Les variables générées suivent la convention :

```text
--nlab-code-token-keyword
--nlab-code-token-string
...
```

### `apply(root, options)`

Applique le pack aux classes `.nlab-codeblock__<token>` trouvées sous `root` :

- `root.dataset.colorPack` et `root.dataset.colorTheme` sont renseignés si disponibles ;
- les variables CSS sont posées sur le root ;
- les couleurs sont appliquées aux tokens reconnus ;
- un retour vers `default` retire les styles posés par l'adaptateur ;
- en l'absence de root, l'appel retourne un résultat neutre plutôt que de lever une erreur DOM.

Résultat structuré :

```js
{
  applied: true,
  reason: null,
  count: 12,
  pack: 'classic',
  theme: 'dark'
}
```

## Compatibilité

Le lot ne modifie pas `CodeBlock` lui-même. Le pack `default` est volontairement vide afin de préserver le comportement CSS historique. L'adaptateur peut être branché seulement là où une personnalisation est souhaitée.

## Sécurité

Les noms de packs sont restreints à un identifiant sûr. Les valeurs de couleur passent par une validation stricte avant stockage ou application. Aucun fragment HTML n'est accepté ou généré par cette primitive.

## Tests

`dev/framework/tests/code-block-color-packs.test.mjs` couvre :

- tokens canoniques et copies défensives ;
- validation de packs ;
- palettes intégrées ;
- packs personnalisés et héritage clair/sombre ;
- activation, suppression et doublons ;
- rejet de couleur contenant une tentative d'injection ;
- variables CSS ;
- application sur DOM injecté ;
- nettoyage lors du retour à `default` ;
- fonctionnement sans DOM.

Baseline : Node 22.16.0 — `code block color packs tests: ok`.

## Hors périmètre

Ce lot ne change pas la tokenisation, n'ajoute pas de grammaire complète, ne modifie pas la démo, Theme Workshop, DataWiz, JSON Studio, TableWiz, Header Studio ou V20.
