# IconWiz — contrat sémantique I1

## Rôle

`IconWiz` sépare les **IDs sémantiques** utilisés par les composants des IDs SVG physiques fournis par `IconRegistry`.

Cette couche permet de remplacer un pack d’icônes sans modifier les consommateurs et de représenter des états standards indépendamment du dessin physique.

`icon-registry.js` reste hors scope et inchangé.

## IDs sémantiques de base

Le pack core couvre :

`info`, `help`, `close`, `reset`, `lock`, `unlock`, `pin`, `visibility`, `settings`, `refresh`, `navigation`, `save`, `print`, `download`, `upload`, `files`, `media`, `qr`, `share`, `links`, `theme`, `filter`, `search`, `resize`.

Lorsque le pack SVG physique actuel ne possède pas encore une icône dédiée, le pack sémantique peut déclarer un **substitut**. `audit()` rend ces substitutions visibles afin qu’elles puissent être remplacées plus tard sans modifier les composants.

Exemples actuels : `save → export`, `files → copy`, `qr → responsive`.

## États standards

- `default`
- `hover`
- `active`
- `inactive`
- `success`
- `warning`
- `danger`
- `locked`
- `unlocked`

Un pack peut fournir une variante physique par état. Sans variante, l’icône par défaut est conservée et l’état reste disponible via la classe CSS `nlab-icon-wiz--<state>`.

Les états `locked` / `unlocked` utilisent les icônes sémantiques lock/unlock comme fallback global lorsqu’une entrée ne fournit pas sa propre variante.

## Packs remplaçables

```js
wiz.registerPack('rounded', {
  settings: 'settings-rounded',
  save: {
    default: 'save-rounded',
    success: 'check-rounded'
  }
});

wiz.usePack('rounded');
```

Par défaut un pack étend `core`, donc seuls les remplacements nécessaires sont déclarés.

API :

- `registerPack(name, pack, { extend })`
- `removePack(name)`
- `usePack(name)`
- `packNames()`
- `hasSemantic(id)`
- `resolve(id, { state, pack, fallback })`

## Résolution

`resolve()` retourne notamment :

```js
{
  semanticId,
  state,
  pack,
  physicalId,
  available,
  substitute,
  fallbackUsed
}
```

`available` est calculé contre l’`IconRegistry` injecté. Un consommateur peut donc distinguer un alias valide d’une ressource physique réellement absente.

## Rendu

`render()` délègue le SVG physique au registry injecté et ajoute les classes/metadata sémantiques.

Sans document, il retourne `{ html, resolved }`.

Avec un `document` injecté, il retourne `{ node, resolved }` avec :

- `data-icon-id`
- `data-icon-state`
- `data-icon-physical`
- `aria-label` si un titre est fourni, sinon `aria-hidden=true`.

Le moteur ne parse ni ne modifie les SVG physiques.

## Audit de couverture

```js
const report = wiz.audit();
```

Le rapport expose :

- nombre total d’IDs sémantiques contrôlés ;
- nombre de ressources physiques disponibles ;
- `missing` ;
- `substitutes` ;
- détail de résolution par ID.

Cela permet au futur catalogue visuel d’identifier clairement les icônes qui nécessitent encore un dessin dédié.

## Coordination avec File Format Registry

Le File Format Registry de l’Agent B peut produire des **clés sémantiques** d’icônes. IconWiz peut les résoudre ensuite, sans que les deux lots modifient les mêmes fichiers.

## Vérification

Node 22 :

```text
icon wiz tests: ok
```

Couverture : IDs/states, alias core, lock/unlock, fallback, packs dérivés, état spécifique, suppression de pack, audit, rendu string/DOM et validation de pack.

## Lots suivants

Le catalogue visuel et l’ajout de nouveaux SVG physiques sont séparés de ce contrat. Ils peuvent être réalisés après validation du pack ou lorsque l’audit signale les substitutions à remplacer.
