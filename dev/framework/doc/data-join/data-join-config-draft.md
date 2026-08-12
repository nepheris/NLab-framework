# DataJoinConfigDraft

`DataJoinConfigDraft` est la couche DOM-free de **revue explicite** située entre une suggestion sélectionnée (`DataJoinSuggestionSession`) et un futur `DataJoinSpec` métier.

Son rôle est de conserver un brouillon complet de configuration, d'exiger une confirmation explicite des politiques de jointure et de produire un payload `nlab.data-join-spec` V1 uniquement lorsque toutes les sections ont été revues.

La brique ne modifie jamais un `DataJoinSpec` ou un `DataJoinWorkspace` existant.

## Position dans la chaîne

```text
FieldCatalog
   ↓
KeyMatcher
   ↓
CompositeKeyMatcher
   ↓
SuggestionSession
   ↓ sélection explicite
DataJoinConfigDraft
   ↓ revue explicite de toutes les politiques
payload DataJoinSpec V1
   ↓
future UI / Workspace
```

## Pourquoi un draft séparé ?

Une suggestion de clé ne suffit pas à définir une relation.

Le consommateur doit encore choisir ou accepter explicitement :

- type de jointure ;
- cardinalité attendue ;
- direction de navigation ;
- précédence ;
- règles de comparaison ;
- politique de collision.

`DataJoinConfigDraft` distingue donc **valeur courante** et **valeur revue**.

Les valeurs par défaut existent immédiatement, mais elles ne sont pas considérées comme approuvées tant que la section correspondante n'a pas été modifiée ou confirmée.

## Sections de revue

Sept sections sont suivies :

```text
keys
join
cardinality
navigation
precedence
comparison
collision
```

Un draft neuf démarre avec toutes les sections à `false`.

```js
draft.status();
// {
//   reviewed: {
//     keys: false,
//     join: false,
//     cardinality: false,
//     navigation: false,
//     precedence: false,
//     comparison: false,
//     collision: false
//   },
//   complete: false,
//   ...
// }
```

## Valeurs par défaut

Le brouillon utilise les mêmes valeurs initiales que `DataJoinSpec V1` :

```js
{
  type: 'inner',
  keys: [],
  expectedCardinality: 'auto',
  direction: 'none',
  precedence: 'none',
  comparison: {
    trim: true,
    caseSensitive: true,
    coerce: 'none',
    blankAsNull: true,
    nullMatchesNull: false
  },
  collision: {
    policy: 'nested',
    leftSuffix: '_left',
    rightSuffix: '_right'
  },
  metadata: {}
}
```

Ces valeurs ne constituent pas une validation automatique.

## Adopter une proposition

La sortie de `DataJoinSuggestionSession.proposal()` peut être adoptée :

```js
draft.adoptProposal(proposal);
```

Le contrat accepté est volontairement étroit :

```js
{
  ok: true,
  candidateId,
  kind,
  patch: {
    keys: [...],
    comparison: {
      coerce: 'none' | 'string' | 'number'
    },
    expectedCardinality?: 'auto' | '1:1' | '1:N' | 'N:1' | 'N:N'
  },
  evidence?: {...}
}
```

Le draft n'accepte pas qu'une suggestion choisisse `type`, `collision`, `direction` ou `precedence`.

Après adoption :

- `keys` est `reviewed:true`, car la sélection de la suggestion est explicite ;
- `comparison` repasse à `reviewed:false` ;
- `cardinality` repasse à `reviewed:false` ;
- l'éventuelle coercition recommandée devient la valeur courante ;
- l'éventuelle cardinalité proposée devient la valeur courante ;
- sans cardinalité proposée, la valeur revient à `auto`.

Le reste des politiques déjà revues est conservé.

## Modification manuelle des clés

```js
draft.update('keys', [
  { left: 'customerId', right: 'id', label: '' }
]);
```

Une modification manuelle des clés :

- marque `keys` comme revu ;
- supprime l'origine `candidateId` ;
- remet `comparison.coerce` à `none` ;
- remet `expectedCardinality` à `auto` ;
- invalide la revue `comparison` ;
- invalide la revue `cardinality`.

La clé modifiée peut donc être utilisée, mais les hypothèses qui dépendaient de l'ancienne clé doivent être confirmées de nouveau.

## Mise à jour des politiques

```js
draft.update('join', 'left');
draft.update('cardinality', 'N:1');
draft.update('navigation', 'left-to-right');
draft.update('precedence', 'left');

draft.update('comparison', {
  trim: true,
  caseSensitive: false,
  coerce: 'string',
  blankAsNull: true,
  nullMatchesNull: false
});

draft.update('collision', {
  policy: 'suffix',
  leftSuffix: '_order',
  rightSuffix: '_customer'
});
```

Une mise à jour d'une section signifie que la valeur résultante a été explicitement revue.

### Valeurs exactes acceptées

Types :

```text
inner
left
right
full
left-semi
left-anti
right-semi
right-anti
```

Cardinalités :

```text
auto
1:1
1:N
N:1
N:N
```

Directions :

```text
none
left-to-right
right-to-left
bidirectional
```

Précédence :

```text
none
left
right
error
manual
```

Collision :

```text
nested
suffix
leftWins
rightWins
error
```

Coercition :

```text
none
string
number
```

Le draft valide ces enums **exactement**. Il ne reproduit pas le fallback permissif de `DataJoinSpec` : une valeur inconnue est rejetée afin que l'UI ne transforme pas silencieusement une erreur de saisie en valeur par défaut.

## Confirmer une valeur sans la changer

L'interface peut afficher la valeur par défaut ou recommandée et demander à l'utilisateur de l'accepter :

```js
draft.confirm('join');
draft.confirm('comparison');
draft.confirm('collision');
```

`confirm()` marque la section comme revue sans modifier sa valeur.

`keys` ne peut pas être confirmé tant qu'aucune clé n'existe.

Une section peut être réouverte :

```js
draft.unconfirm('collision');
```

## Métadonnées

Les métadonnées sont optionnelles et ne constituent pas une politique de jointure :

```js
draft.setMetadata({
  purpose: 'orders-customers'
});
```

Elles sont clonées défensivement et doivent être JSON-like, finies, non cycliques et sans clés prototype-sensitive.

## Finalisation

```js
const result = draft.finalize();
```

Si une section n'est pas revue :

```js
{
  ok: false,
  reason: 'incomplete',
  missing: ['comparison', 'collision']
}
```

Lorsque toutes les sections sont revues :

```js
{
  ok: true,
  payload: {
    type: 'nlab.data-join-spec',
    version: 1,
    join: {
      ...
    }
  },
  source,
  reviewed
}
```

La finalisation produit une **copie**. Elle ne crée ni ne modifie une relation runtime.

## Validation par DataJoinSpec injecté

Le helper :

```js
createDataJoinSpecDraftValidator(DataJoinSpec)
```

permet de vérifier qu'un payload final est accepté par le contrat réel :

```js
const draft = new DataJoinConfigDraft({
  validator: createDataJoinSpecDraftValidator(DataJoinSpec)
});
```

Le helper :

1. vérifie l'enveloppe `nlab.data-join-spec` V1 ;
2. construit une **nouvelle** instance de `DataJoinSpec` ;
3. lit `snapshot()` ;
4. compare sémantiquement le snapshot normalisé au draft.

Si `DataJoinSpec` normalise la configuration différemment, la finalisation échoue avec :

```text
DATA_JOIN_SPEC_NORMALIZATION_MISMATCH
```

Cela évite qu'un changement futur du contrat transforme silencieusement la configuration préparée.

## Validation stricte à la frontière

Le draft rejette notamment :

- enum inconnu ou mauvaise casse ;
- booléen représenté par une chaîne (`"false"`) ;
- champs inconnus dans `comparison` ou `collision` ;
- proposition contenant des politiques qui ne lui appartiennent pas ;
- plus de 16 clés ;
- clé dupliquée ;
- chemins vides ou prototype-sensitive ;
- chaînes supérieures à 512 caractères ;
- valeurs non finies ;
- objets non sûrs et cycles ;
- résultat de validator non conforme.

Cette validation est volontairement plus stricte que les fallbacks internes du moteur.

## Snapshot

```js
draft.snapshot();
```

renvoie :

```js
{
  type: 'nlab.data-join-config-draft',
  version: 1,
  status,
  join,
  source
}
```

Le snapshot contient uniquement le brouillon et une provenance minimale de la suggestion :

- `candidateId` ;
- `kind` ;
- score/cardinalité/couverture bornés si disponibles ;
- nombre de warnings.

Il ne contient jamais :

- datasets gauche/droite ;
- catalogues complets ;
- instances de matcher ;
- `DataJoinWorkspace` ;
- instance mutable de `DataJoinSpec`.

## Non-objectifs V1

`DataJoinConfigDraft` ne :

- sélectionne pas une suggestion ;
- n'évalue pas les clés ;
- ne calcule pas de cardinalité ;
- ne choisit pas automatiquement une politique ;
- ne modifie pas un `DataJoinSpec` existant ;
- ne modifie pas un `DataJoinWorkspace` ;
- n'exécute pas la jointure ;
- ne rend aucun DOM/HTML/CSS.

Il fournit uniquement une frontière de revue explicite et un payload final autonome.
