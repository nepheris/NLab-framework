# InfoTestControl

`InfoTestControl` est le contrôle standard **Info/Test** destiné aux zones testables du framework.

Il ne remplace pas `InspectorPanel`, `FloatingPanel`, `DiagnosticIdRegistry` ni `WebmasterMode`. Son rôle est de relier ces contrats sans dupliquer leur logique.

## Responsabilités

- résoudre un ID humain/technique via un `DiagnosticIdRegistry` injecté ;
- produire un descriptor `classic` ou `advanced` ;
- afficher un bouton Info/Test accessible ;
- exposer un tooltip court issu de l'objectif ou d'un texte explicite ;
- respecter le gate global `WebmasterMode.isEnabled('infoTest')` lorsqu'il est fourni ;
- transmettre une demande d'ouverture à un callback externe `onOpen` ;
- émettre `nlab:info-test-open` lorsqu'un DOM/CustomEvent est disponible ;
- ne jamais instancier directement un Inspector ou un FloatingPanel.

## Descriptor

```js
const control = new InfoTestControl({
  ref: 'DMO-042',
  registry: diagnosticRegistry,
  mode: 'classic'
});

control.descriptor();
```

Le mode `classic` contient l'identification et le contrat de test : titre, objectif, choses à tester, résultat attendu.

Le mode `advanced` reprend le contrat du registre et peut inclure fichiers, providers, dépendances, configuration et metadata.

Un mode autre que `classic|advanced` est rejeté avec `INVALID_MODE`.

## Visibilité Webmaster

Lorsque `webmasterMode` expose `isEnabled()` :

```js
webmasterMode.isEnabled('infoTest')
```

la valeur pilote la visibilité du contrôle. Sans contrôleur Webmaster injecté, InfoTestControl reste utilisable de manière autonome.

Si `webmasterMode.subscribe()` existe, le rendu se synchronise automatiquement aux changements et l'abonnement est libéré par `destroy()`.

## Ouverture du panneau externe

```js
const control = new InfoTestControl({
  ref: 'DMO-042',
  registry,
  onOpen: ({ descriptor, attributes, source }) => {
    inspector.open({ descriptor, attributes, source });
  }
});
```

`requestOpen()` :

- refuse silencieusement une ouverture masquée (`reason: hidden`) ;
- refuse un contrôle désactivé (`reason: disabled`) ;
- transforme une référence inconnue en résultat structuré `UNKNOWN_DIAGNOSTIC` ;
- clone le descriptor et les attributs avant transmission ;
- contient une erreur de `onOpen` dans le résultat sans casser le contrôle.

## DOM / accessibilité

Le rendu utilise `document.createElement` et `textContent`, jamais `innerHTML`.

Le bouton produit notamment :

- `data-action="info-test"` ;
- `data-diagnostic-mode="classic|advanced"` ;
- `data-test-id` ;
- `data-technical-id` ;
- `data-test-kind` ;
- `aria-haspopup="dialog"` ;
- un `aria-label` incluant l'ID humain quand il est disponible ;
- un `title` court servant de tooltip natif/fallback.

L'icône est fournie par un adaptateur injectable avec la clé sémantique `info`. Un fallback `ⓘ` reste disponible si aucun renderer n'est fourni.

## Frontières

Ce lot ne modifie pas :

- `DiagnosticIdRegistry` ;
- `WebmasterMode` ;
- les composants Inspector ;
- `FloatingPanel` ;
- `HeaderStudio` ;
- la démo ;
- le CSS global.

La composition visuelle du panneau détaillé est donc indépendante et peut évoluer sans changer le contrat du bouton.

## Vérification

```bash
node dev/framework/tests/info-test-control.test.mjs
```

La suite couvre résolution classic/advanced, visibilité Webmaster, disabled/hidden, référence inconnue, callback d'ouverture, attributs diagnostic, DOM injectable, ARIA, icône et destruction.
