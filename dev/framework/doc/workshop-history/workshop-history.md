# WorkshopHistory — contrat commun WH1

## Rôle

`WorkshopHistory` fournit le socle commun Undo / Redo / Reset demandé pour les Workshops du framework.

Le moteur est indépendant du DOM et n’est raccordé automatiquement à aucun Workshop existant. Les intégrations futures pourront l’adopter sans réimplémenter l’historique.

## État JSON-like

Le moteur accepte uniquement :

- `null`
- chaînes
- booléens
- nombres finis
- tableaux
- objets simples

Les fonctions, `undefined`, nombres non finis, objets exotiques et structures circulaires sont refusés avec `INVALID_STATE`.

Toutes les entrées/sorties sont clonées défensivement.

## Historique

```js
const history = new WorkshopHistory({
  initial: config,
  limit: 100,
  onChange(event) {}
});
```

API :

- `get()`
- `commit(next, { label })`
- `transaction(mutator, { label })`
- `undo()`
- `redo()`
- `reset()`
- `markBaseline()`
- `replace()`
- `clearHistory()`
- `status()`
- `snapshot()`

## Comparaison sémantique

Deux objets possédant les mêmes clés/valeurs mais dans un ordre de propriétés différent sont considérés identiques.

Les tableaux restent ordonnés.

Un commit sans changement réel ne crée pas d’entrée d’historique.

## Limite

`limit` borne la pile Undo. Les entrées les plus anciennes sont supprimées lorsque la limite est dépassée.

Toute nouvelle mutation après un Undo invalide la pile Redo.

## Transactions

```js
history.transaction(draft => {
  draft.background = '...';
  draft.density = 'compact';
}, { label:'update presentation' });
```

Le mutateur travaille sur un clone ; la publication est atomique à son retour.

Les transactions asynchrones sont refusées avec `ASYNC_TRANSACTION_UNSUPPORTED` afin d’éviter les états intermédiaires non déterministes.

## Reset et baseline

`reset()` restaure la baseline et est **undoable par défaut**.

```js
history.reset();
history.undo(); // revient à l’état avant reset
```

Pour un reset définitif sans historique :

```js
history.reset({ recordHistory:false });
```

`markBaseline(next, { clearHistory })` définit la nouvelle référence.

## Remplacement de configuration

`replace(next)` remplace le dataset/configuration courant et purge les anciennes piles par défaut. Cela évite qu’un Undo fasse revenir dans la configuration d’un autre document/projet.

Options :

- `baseline:true` pour faire du nouvel état la référence ;
- `clearHistory:false` si un consommateur choisit explicitement de conserver les piles.

## Statut

`status()` expose :

- `canUndo`
- `canRedo`
- `undoCount`
- `redoCount`
- `limit`
- `nextUndo`
- `nextRedo`
- `dirty` par rapport à la baseline

## Callback

`onChange` reçoit un snapshot défensif :

```js
{
  type: 'commit' | 'undo' | 'redo' | 'reset' | 'replace' | 'baseline',
  label,
  state,
  status
}
```

Aucune dépendance EventBus n’est imposée.

## Vérification exacte

Moteur : `7e1004f4ce59b65ad2da6002df81f96c29094126`  
Test : `ab561158566a15fff9266ecc7d8a0d6d6db7b6e7`

Node 22 :

```text
workshop history tests: ok
```

Couverture : clones, dirty state, no-op commit, comparaison indépendante de l’ordre des clés, limite, undo/redo, invalidation redo, reset undoable, baseline, replace, reset définitif, états invalides, cycle, transaction async et callbacks.

## Frontières

WH1 ne modifie pas :

- JsonStudio, qui conserve son historique intégré actuel ;
- Theme Workshop ;
- V20 ;
- BackgroundWiz / TypographyWiz / DensityWiz ;
- la démo.

L’adoption progressive par ces Workshops sera un lot d’intégration séparé après validation de leurs interfaces.
