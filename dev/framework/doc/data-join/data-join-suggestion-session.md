# DataJoinSuggestionSession

`DataJoinSuggestionSession` est le modèle DOM-free qui se place entre les moteurs de suggestion DataJoin et une future interface graphique.

Il agrège les candidats **simples** (`DataJoinKeyMatcher`) et **composites** (`DataJoinCompositeKeyMatcher`), leur donne une identité stable, gère une sélection explicitement déclenchée par l'utilisateur et transforme cette sélection en **proposition partielle** de configuration de jointure.

La session ne modifie jamais `DataJoinSpec`, `DataJoinWorkspace` ou les datasets source.

## Position dans la chaîne

```text
DataJoinFieldCatalog
        │
        ├── DataJoinKeyMatcher
        │
        └── DataJoinCompositeKeyMatcher
                    │
                    ▼
          DataJoinSuggestionSession
                    │
             sélection explicite
                    │
                    ▼
        proposition de configuration
                    │
            future UI / Workspace
```

La session est volontairement une frontière de décision : le classement automatique peut proposer, mais **aucun candidat n'est sélectionné automatiquement**.

## Construction

```js
const session = new DataJoinSuggestionSession({
  simpleMatcher,
  compositeMatcher,
  maxSuggestions: 100
});
```

Au moins un matcher doit exposer `match()`.

La signature attendue est celle des briques existantes :

```js
simpleMatcher.match(leftCatalog, rightCatalog, context);

compositeMatcher.match(
  leftRows,
  rightRows,
  leftCatalog,
  rightCatalog,
  context
);
```

Les lignes runtime ne sont transmises qu'au matcher composite pendant `refresh()`. Elles ne sont jamais stockées dans l'état de session.

## Rafraîchissement atomique

```js
session.refresh({
  leftRows,
  rightRows,
  leftCatalog,
  rightCatalog,
  context
});
```

Le rafraîchissement :

1. exécute les matchers injectés ;
2. normalise et valide tous les résultats ;
3. produit des identifiants stables ;
4. déduplique les candidats sémantiquement identiques ;
5. trie par score, complexité puis identité ;
6. applique `maxSuggestions` ;
7. met à jour l'état en une seule opération.

Si un matcher ou un candidat est invalide, la session précédente reste intacte.

## Identité stable

L'identité d'un candidat dépend uniquement de :

- son type `simple` ou `composite` ;
- ses couples de chemins gauche/droite ;
- la coercition recommandée.

Elle ne dépend pas du score, des raisons, de la couverture ni de la cardinalité.

Conséquence : si un rafraîchissement recalcule exactement la même clé avec un score différent, son identifiant reste stable et une sélection explicite peut être conservée.

Pour une clé composite, l'identité canonique ne dépend pas de l'ordre d'arrivée des composantes.

## Classement

`list()` renvoie des snapshots défensifs :

```js
session.list();
session.list({ kind: 'composite' });
session.list({ minScore: 70, limit: 10 });
```

Chaque entrée expose notamment :

```js
{
  id,
  rank,
  kind,
  score,
  keys,
  comparisonHint,
  cardinality,
  summary,
  reasons,
  warnings
}
```

Les composites peuvent en plus exposer :

- `coverage` ;
- `components`.

Les diagnostics volumineux ou les lignes source ne sont pas copiés dans la session.

## Sélection explicite

```js
session.select(candidateId);
session.selected();
session.clearSelection();
```

Une session fraîche commence toujours avec :

```text
selectionState = none
```

`select(id)` est la seule opération qui crée une sélection.

Lors d'un nouveau `refresh()` :

- si le même identifiant existe encore : sélection conservée ;
- si le candidat a disparu ou si ses clés/coercition ont changé : sélection supprimée et `selectionState = invalidated`.

Il n'existe aucun fallback automatique vers le nouveau candidat classé n°1.

## Proposition de configuration

```js
const proposal = session.proposal();
```

Par défaut, la proposition contient uniquement :

```js
{
  keys: [...],
  comparison: {
    coerce: 'none' | 'string' | 'number'
  }
}
```

Elle ne choisit jamais :

- `type` (`inner`, `left`, `right`, etc.) ;
- `collision` ;
- `direction` ;
- `precedence` ;
- les autres options de comparaison.

C'est une **proposition partielle** : le consommateur doit la fusionner explicitement avec son état métier.

### Cardinalité

Trois politiques sont disponibles :

```js
session.proposal({ cardinalityPolicy: 'omit' });      // défaut
session.proposal({ cardinalityPolicy: 'auto' });
session.proposal({ cardinalityPolicy: 'candidate' });
```

- `omit` : ne propose rien ;
- `auto` : ajoute `expectedCardinality:'auto'` ;
- `candidate` : reprend la cardinalité du candidat si elle est connue, sinon `auto`.

La politique `candidate` reste une suggestion : elle n'est pas appliquée par la session.

## État et snapshot

```js
session.status();
session.snapshot();
```

`status()` expose :

- `revision` ;
- `candidateCount` ;
- `selectedId` ;
- `hasSelection` ;
- `selectionState` ;
- `warningCount` ;
- résumé du dernier refresh.

`snapshot()` ajoute les candidats et warnings normalisés dans une enveloppe :

```js
{
  type: 'nlab.data-join-suggestion-session',
  version: 1,
  ...
}
```

Le snapshot ne contient jamais :

- `leftRows` / `rightRows` ;
- les catalogues complets ;
- les objets runtime des matchers ;
- un `DataJoinWorkspace` ;
- un `DataJoinSpec` mutable.

Il s'agit d'un snapshot de lecture, pas d'un format de persistance longue durée garantissant la fraîcheur des données.

## Garde-fous

La frontière de session rejette notamment :

- scores non finis ou hors 0..100 ;
- coercitions inconnues ;
- chemins vides, trop longs ou contenant `__proto__`, `prototype`, `constructor` ;
- candidats simples/composites mal formés ;
- contextes non objets ;
- options hors limites.

Les sorties sont clonées défensivement : modifier le résultat de `list()`, `selected()`, `proposal()` ou `snapshot()` ne modifie pas l'état interne.

## Non-objectifs V1

La session ne :

- recalcule pas les scores ;
- ne refait pas le diagnostic des clés ;
- ne choisit pas de candidat automatiquement ;
- ne modifie pas `DataJoinSpec` ;
- ne modifie pas `DataJoinWorkspace` ;
- ne sérialise pas les datasets ;
- ne choisit pas les politiques métier de jointure ;
- ne rend aucun DOM/HTML/CSS.

Le futur éditeur graphique peut donc utiliser cette brique comme modèle de sélection sans coupler ses composants visuels aux moteurs d'analyse.
