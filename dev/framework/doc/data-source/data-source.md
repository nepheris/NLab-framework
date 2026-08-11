# DataSource — contrat de description de source

## Objectif

`DataSource` décrit une source de données indépendamment du provider qui la consomme. L'objet doit rester simple, sérialisable et sans effet de bord sur les configurations fournies par l'appelant.

Ce contrat consolide les travaux parallèles C/B sur DataSource : la flexibilité historique de `location` est conservée, tandis que les améliorations compatibles de robustesse sont reprises après libération du lock B.

## Erreur structurée

`DataSourceError` expose :

- `name = "DataSourceError"` ;
- `message` ;
- `code` ;
- `details`.

Les codes utilisés par le constructeur sont :

- `INVALID_ID` ;
- `INVALID_TYPE` ;
- `INVALID_OPTIONS` ;
- `INVALID_METADATA` ;
- `CIRCULAR_CONFIG` pour une configuration récursive impossible à cloner proprement.

## Identité

`id` et `type` sont obligatoires :

- chaînes uniquement ;
- normalisées par `trim()` ;
- non vides après normalisation.

## Localisation

`location` reste volontairement libre et vaut `null` par défaut. Le framework peut donc y placer une URL, un chemin, un descripteur ou un objet spécifique à un provider.

Le contrat ne clone pas `location`, car certains consommateurs peuvent y placer une référence ou un objet non sérialisable. Cette décision préserve la compatibilité du contrat C #24 et n'intègre pas la restriction `string/URL` de la branche B abandonnée.

## Options et métadonnées

`options` et `metadata` :

- valent `{}` lorsqu'ils sont `null` ou `undefined` ;
- doivent être des objets non-tableaux à la racine ;
- sont clonés récursivement pour les tableaux et objets simples imbriqués ;
- conservent par référence les valeurs non plain-object comme `Date`, classe ou instance spécialisée ;
- rejettent les références circulaires avec `CIRCULAR_CONFIG`.

Une mutation ultérieure des objets simples/tableaux fournis par l'appelant ne modifie donc pas la configuration interne de la DataSource.

## Sérialisation

`toJSON()` retourne un nouvel objet contenant :

- `id` ;
- `type` ;
- `location` ;
- un clone récursif de `options` ;
- un clone récursif de `metadata`.

Les conteneurs simples retournés peuvent être modifiés sans affecter l'instance.

## Coordination du lot

Un lock B antérieur `8B-DATA-SOURCE-ROBUSTNESS` couvrait le même fichier. La collision a été détectée après intégration de C #24 ; B n'a pas fusionné sa branche et a passé son lock à `released`, supersédé par C.

Ce follow-up `8B-DATA-SOURCE-CONSOLIDATION` reprend uniquement les améliorations B compatibles : erreur structurée et clonage récursif sûr. Il ne reprend pas la restriction de `location` afin d'éviter une rupture de contrat.

## Tests

`dev/framework/tests/data-source-contract.test.mjs` couvre :

- normalisation `id/type` ;
- codes `DataSourceError` ;
- clonage récursif des options/métadonnées d'entrée ;
- indépendance des configurations retournées par `toJSON()` ;
- valeurs `null` ;
- conservation libre de `location` ;
- conservation par référence d'une valeur spécialisée (`Date`) ;
- détection des références circulaires ;
- validations des champs obligatoires et des conteneurs.

## Hors périmètre

Ce lot ne choisit pas de provider, ne résout pas les URLs, ne charge aucune donnée et ne modifie ni DataProvider, DataResolver, DataIndex, TableWiz ou la démo.
