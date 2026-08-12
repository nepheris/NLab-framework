# PresentationResolver — contrat de résolution de présentation

## Objectif

`PresentationResolver` combine une configuration globale, une configuration par type, un schéma de collection et un override d'appel pour produire une présentation déterministe.

Le composant reste indépendant de TableWiz et des renderers concrets.

## Priorités

Pour les propriétés simples, l'ordre est :

1. `override` ;
2. `schema` lorsqu'une propriété correspondante existe ;
3. configuration du type ;
4. defaults ;
5. fallback interne.

`renderer` suit `override.renderer → schema.renderer → base.renderer → "table"`.

`sort` suit `override.sort → schema.defaultSort → base.sort → null`.

`groupBy` suit `override.groupBy → schema.defaultGroupBy → base.groupBy → null`.

`filter` suit `override.filter → base.filter → null`, comme dans le contrat historique.

La résolution utilise **la première valeur différente de `undefined`** et non `??`. Cela permet à un override explicite `null` de désactiver un tri, groupe ou filtre hérité. Les valeurs `false`, `0` et chaîne vide restent également explicites.

## Vue

`view` est fusionnée dans l'ordre :

1. `base.view` ;
2. `schema.view` ;
3. `override.view`.

Chaque niveau doit être un objet simple lorsqu'il est fourni.

## Type

`type` est converti en chaîne, normalisé par `trim()` et revient à `collection` lorsqu'il est vide/null.

Un type sans configuration dédiée utilise uniquement les defaults.

## Isolation des configurations

Le constructeur clone récursivement tableaux et objets simples de `defaults` et `byType`.

Chaque résolution clone également les valeurs structurées de sortie (`view`, `sort`, `filter`, etc.). Modifier le résultat d'un appel ne doit donc pas altérer les appels suivants ni les configurations du resolver.

Les valeurs spécialisées non plain-object restent par référence.

Les cycles dans les tableaux/objets simples de configuration sont rejetés afin d'éviter une résolution partiellement clonée.

## Validation

Sont validés comme objets simples lorsqu'ils existent :

- `defaults` ;
- `byType` ;
- chaque entrée `byType[type]` ;
- `schema` ;
- `override` ;
- les blocs `view` fusionnés.

Un tableau ou une primitive à ces positions produit une erreur explicite plutôt qu'un spread JavaScript ambigu.

## Tests

`dev/framework/tests/presentation-resolver.test.mjs` couvre :

- defaults + byType ;
- priorité schema/override ;
- fusion des vues ;
- `null` explicite pour annuler les héritages ;
- `false` explicite ;
- fallback sur `undefined` ;
- type vide ;
- isolation des entrées et des sorties entre résolutions ;
- validations de structure ;
- cycle de configuration.

## Hors périmètre

Ce lot ne choisit pas de renderer concret, ne modifie pas TableWiz, ne valide pas la sémantique métier d'un sort/filter et ne touche ni la démo ni les fichiers réservés A/B.
