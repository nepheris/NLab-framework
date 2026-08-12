# InspectorControlInventory — inventaire dynamique des contrôles

## Objectif

`InspectorControlInventory` extrait un inventaire déterministe des contrôles exposés par un InspectorPanel, sans dépendre d'un DOM global. Il peut analyser un conteneur DOM réel, une liste d'éléments injectée ou un faux DOM utilisé dans les tests Node.

Cette primitive alimente directement le champ `controls` de `InspectorSnapshot` sans couplage entre les deux composants.

## Sélecteur par défaut

```text
input,select,textarea,button,[data-control]
```

Un sélecteur personnalisé peut être fourni à `scan()`.

## API

### `scan(root, options)`

```js
const rows = inventory.scan(panelElement, {
  includeDisabled: true
});
```

Chaque descripteur contient :

- `id` : identifiant stable de l'inventaire ;
- `sourceId` : identifiant provenant de `data-control-id`, `id` ou `name` ;
- `tag` ;
- `type` : `data-control-type`, type natif ou tag ;
- `name` ;
- `label` ;
- `value` ;
- `disabled`, `required`, `readOnly`, `hidden` ;
- `constraints` ;
- `dataset` trié ;
- `options` pour les `<select>`.

Les contraintes connues sont `min`, `max`, `step`, `minLength`, `maxLength`, `pattern` et `placeholder`.

### Identifiants

La priorité de l'identifiant source est :

1. `data-control-id` ;
2. `id` ;
3. `name` ;
4. fallback `control-N`.

En cas de doublon, le premier identifiant est conservé puis les suivants reçoivent `#2`, `#3`, etc. L'ordre reste celui fourni par le conteneur.

### Valeurs typées

- checkbox / radio : booléen `checked` ;
- select multiple : tableau des valeurs sélectionnées ;
- autres contrôles : chaîne issue de `value` ;
- types custom : `data-control-type` peut remplacer le type sémantique sans perdre la lecture checkbox/radio native.

### Labels

La résolution du label suit :

1. `data-label` ;
2. `aria-label` ;
3. premier élément de `labels` ;
4. `placeholder`, `title` ou `textContent`.

## `summarize(inventory)`

Retourne une synthèse compacte :

```js
{
  total: 5,
  enabled: 4,
  disabled: 1,
  required: 1,
  hidden: 0,
  byType: {
    checkbox: 1,
    search: 1,
    select: 1
  }
}
```

`byType` est trié pour faciliter les snapshots et comparaisons Git.

## Compatibilité hors navigateur

Aucun accès à `document`, `window` ou `Node` n'est nécessaire. `scan()` accepte :

- un objet avec `querySelectorAll()` ;
- un tableau d'éléments ;
- un iterable ;
- `null` ou un objet non compatible, qui retourne simplement `[]`.

## Tests

`dev/framework/tests/inspector-control-inventory.test.mjs` couvre :

- inputs, select, textarea ;
- contrôles custom `data-control-*` ;
- checkbox avec type sémantique custom ;
- select multiple ;
- labels ;
- contraintes ;
- options de select ;
- contrôles désactivés ;
- IDs dupliqués ;
- fallback d'identifiant ;
- synthèse par type ;
- entrées sans DOM.

Baseline : Node 22.16.0, `inspector control inventory tests: ok`.

## Hors périmètre

Cette primitive ne dessine pas les contrôles et ne modifie pas l'InspectorPanel. Elle inventorie l'existant afin que l'Inspector, le snapshot JSON ou un futur onglet Configuration puissent l'exploiter.
