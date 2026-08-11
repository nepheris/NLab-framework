# HelpWiz — contrat d'aide contextuelle

## Objectif

`HelpWiz` associe des identifiants d'aide à des contenus courts/longs et raccorde les éléments `data-help-id` à un panneau ou à l'événement `nlab:help`.

Le composant doit rester importable hors navigateur, ne pas multiplier les handlers lors d'attachements répétés et ne pas exposer les objets du registre par référence.

## Registre

- `register(id, entry)` exige un ID non vide et une entrée objet ;
- l'entrée est clonée à l'enregistrement ;
- `get(id)` retourne une copie ;
- `has(id)` teste l'existence ;
- `unregister(id)` retire une entrée ;
- `short(id)` et `long(id)` conservent les fallbacks historiques.

Une modification de l'objet fourni à `register()` ou de l'objet retourné par `get()` ne doit pas modifier le registre interne.

## Contenu contextualisé

`content(id, { experience })` produit le payload normalisé :

- `id` ;
- `title` ;
- `short` ;
- `long` ;
- `examples` ;
- `links` ;
- `media` ;
- `technical`.

`experience` est normalisé vers `visitor` ou `webmaster`.

- en mode `visitor`, `technical` vaut toujours `null` ;
- en mode `webmaster`, le bloc technique est fourni s'il existe.

Les collections et le bloc technique sont clonés.

## Attachement

`attach(root, { experience })` :

1. recherche les éléments `[data-help-id]` ;
2. ignore proprement les IDs inconnus ;
3. met à jour le `title` du déclencheur ;
4. remplace un handler HelpWiz déjà présent sur le même déclencheur au lieu d'en ajouter un second ;
5. construit le contenu au moment du clic ;
6. appelle `panelFactory(content, context)` lorsqu'une factory est fournie ;
7. sinon émet `nlab:help` si un mécanisme d'événement est disponible.

Sans DOM exploitable, `attach()` ne lève aucune exception et retourne l'instance.

## Événements

L'ordre de résolution est :

1. `eventFactory` injectée ;
2. `customEventClass` injectée ou `globalThis.CustomEvent` ;
3. fallback historique `document.createEvent('CustomEvent')` ;
4. aucun dispatch si aucune primitive n'est disponible.

Cela rend le composant testable et utilisable défensivement dans les contextes sans navigateur.

## Cycle de vie

- `detach(root)` retire les handlers créés par cette instance sur le root donné ;
- `detach()` sans argument retire tous les handlers ;
- `destroy()` détache tous les handlers et retourne l'instance.

Les handlers étrangers au composant ne sont pas touchés.

## Tests

`dev/framework/tests/help-wiz.test.mjs` couvre :

- validation et clonage du registre ;
- fallbacks short/long ;
- payload visitor/webmaster ;
- attachement nominal ;
- attachement idempotent ;
- ID inconnu ;
- `panelFactory` ;
- `CustomEvent` injecté ;
- `eventFactory` ;
- fonctionnement sans DOM ;
- `detach`, `destroy`, `unregister`.

## Hors périmètre

Ce lot ne modifie pas le rendu du panneau d'aide, Header Studio, Navigation visuelle, Search/Filter, URL Resolver ni la démo active. Il consolide uniquement le contrat générique de HelpWiz.
