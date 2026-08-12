# DiagnosticIdRegistry — IDs humains et techniques G1

## Rôle

`DiagnosticIdRegistry` formalise la double identification demandée par le backlog UX :

- **ID humain court et stable** pour les retours de test, par exemple `DMO-042` ;
- **ID technique stable et lisible** pour logs, dépendances et diagnostic, par exemple `demo.theme.background.gradient`.

Le registre est DOM-free. Il ne modifie ni InspectorPanel, ni EventBus, ni FrameworkRegistry, ni la démo. Ces couches pourront consommer son contrat ultérieurement.

## Format des IDs

### ID humain

Format : préfixe majuscule + tiret + numéro sur au moins 3 chiffres.

Exemples valides :

- `DMO-042`
- `SEC-100`
- `CMP-0012`

Un ID humain invalide produit `INVALID_HUMAN_ID`.

### ID technique

Format hiérarchique minuscule composé de segments alphanumériques séparés par `.`, `_` ou `-`.

Exemples :

- `demo.theme.background.gradient`
- `framework.header.actions`
- `data.json-studio.raw`

Un ID technique invalide produit `INVALID_TECHNICAL_ID`.

## Entrée de registre

```js
registry.register({
  humanId: 'DMO-042',
  technicalId: 'demo.theme.background.gradient',
  kind: 'section',
  title: 'Gradient',
  objective: 'Vérifier le rendu du gradient',
  thingsToTest: ['Stops', 'Angle'],
  expectedResult: 'Gradient visible',
  files: ['demo.css'],
  providers: ['theme'],
  dependencies: ['theme.engine'],
  configuration: { scope: 'global' },
  metadata: { owner: 'A' }
});
```

Le bloc `test` peut également contenir `objective`, `thingsToTest` et `expectedResult`.

Toutes les données retournées sont clonées défensivement.

## Unicité et remplacement

Les deux index sont uniques :

- `humanId` ;
- `technicalId`.

Sans `replace`, toute collision produit `DUPLICATE_ID`.

Avec `replace:true`, le remplacement est **complet** : les champs omis reprennent leurs valeurs par défaut, ils ne sont pas fusionnés implicitement avec l’ancienne entrée.

Si le nouvel `humanId` pointe vers une entrée et le nouveau `technicalId` vers une autre entrée différente, l’opération est refusée avec `AMBIGUOUS_REPLACE`. Le registre évite ainsi de fusionner silencieusement deux diagnostics existants.

## Recherche

API :

- `get(humanIdOrTechnicalId)` ;
- `has(ref)` ;
- `unregister(ref)` ;
- `resolveMany(refs)` ;
- `snapshot()`.

`list()` permet de filtrer :

```js
registry.list({
  kind: 'section',
  technicalPrefix: 'demo.theme'
});
```

Le préfixe technique respecte la frontière de segment : `demo.theme` correspond à lui-même ou à `demo.theme.*`.

## Génération d’un ID humain

```js
registry.nextHumanId({
  prefix: 'DMO',
  padding: 3
});
```

La stratégie est volontairement **max + 1**, pas « premier trou disponible ».

Exemple : si `DMO-042` existe, le suivant est `DMO-043`. Cela évite de recycler un ancien numéro potentiellement déjà cité dans un retour utilisateur, un ticket ou un historique.

## Attributs pour la future UI

`attributes(ref)` produit un descripteur directement applicable par une couche DOM :

```js
{
  'data-test-id': 'DMO-042',
  'data-technical-id': 'demo.theme.background.gradient',
  'data-test-kind': 'section'
}
```

Le registre ne modifie pas lui-même le DOM.

## Contrat Classique / Avancé

### Classique

```js
registry.describe('DMO-042', { mode: 'classic' });
```

Retourne :

- `humanId`
- `technicalId`
- `kind`
- `title`
- `objective`
- `thingsToTest`
- `expectedResult`

C’est le contenu attendu d’un panneau Inspector orienté test utilisateur.

### Avancé

```js
registry.describe('DMO-042', { mode: 'advanced' });
```

Ajoute :

- `files`
- `providers`
- `dependencies`
- `configuration`
- `metadata`

Ce niveau prépare le mode Webmaster détaillé demandé par le backlog.

## Erreurs structurées

- `INVALID_ENTRY`
- `INVALID_HUMAN_ID`
- `INVALID_TECHNICAL_ID`
- `DUPLICATE_ID`
- `AMBIGUOUS_REPLACE`
- `UNKNOWN_ID`

## Vérification exacte

Moteur publié/testé :

```text
d33589422793de81ab1899a9aa71364bbc1ca71f
```

Test publié/testé :

```text
3863b3283e81705fedb2ac8d14995ea8f94c089b
```

Node 22 :

```text
diagnostic id registry tests: ok
```

La suite couvre : double index, génération max+1, attributs DOM descriptifs, projections classique/avancé, clones défensifs, formats invalides, collisions, remplacement complet, remplacement ambigu, filtres, résolution multiple et suppression.

## Raccords futurs

Le raccord à InspectorPanel, l’affichage des IDs dans les titres de la démo et le toggle global `Web public ↔ Webmaster` restent des lots d’intégration/UI séparés. Ils pourront consommer ce registre sans changer son format de données.
