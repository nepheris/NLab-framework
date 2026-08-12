# InspectorNotificationBridge — adaptation Inspector → NotificationCenter

## Objectif

`InspectorNotificationBridge` relie les événements et résultats de l’InspectorPanel à une primitive de notifications injectable, notamment `NotificationCenter`, sans dépendre du DOM ni modifier le composant de notifications existant.

Le bridge reste volontairement séparé du rendu : il traduit un code d’événement ou un résultat d’opération en niveau, message, durée et persistance.

## Provider attendu

Le provider peut exposer les méthodes spécialisées :

- `info(message, options)` ;
- `success(message, options)` ;
- `warning(message, options)` ;
- `error(message, options)` ;
- `dev(message, options)`.

Si ces méthodes ne sont pas disponibles, le bridge utilise `show(message, { type, ...options })`.

En l’absence de provider compatible, l’appel retourne un résultat structuré `reason:'unavailable'` sans exception.

## Règles intégrées

Les règles par défaut couvrent notamment :

- `snapshot:exported` → success ;
- `snapshot:imported` → success ;
- `configuration:saved` → success ;
- `configuration:reset` → info ;
- `validation:warning` → warning ;
- `validation:error` → error persistant ;
- `operation:error` → error.

Elles sont exposées par `INSPECTOR_NOTIFICATION_RULES`.

## Construction

```js
const bridge = new InspectorNotificationBridge({
  center,
  dedupeWindow: 800,
  prefix: 'Inspector —'
});
```

Options :

- `center` — provider de notifications injectable ;
- `rules` — règles additionnelles ou remplacements ;
- `dedupeWindow` — fenêtre de déduplication en millisecondes ;
- `now` — horloge injectable pour tests ;
- `prefix` — préfixe optionnel des messages.

## API

### `notify(code, detail, options)`

Résout la règle du code puis appelle le provider.

Le résultat est toujours structuré :

```js
{
  shown: true,
  reason: null,
  code: 'snapshot:exported',
  type: 'success',
  message: 'Snapshot JSON exporté',
  node
}
```

Raisons neutres possibles :

- `invalid-code` ;
- `unmapped` ;
- `empty-message` ;
- `duplicate` ;
- `unavailable` ;
- `provider-declined`.

Les options permettent de remplacer ponctuellement `message`, `type`, `duration`, `persistent`, `dedupeKey` et `force`.

### `handle(event, options)`

Accepte un objet de type événement :

```js
bridge.handle({
  type: 'control:changed',
  detail: { id:'density' }
});
```

Le code est lu depuis `event.type` ou `event.code`, et les données depuis `detail` ou `data`.

### `reportResult(operation, result, options)`

Convertit un résultat d’opération en notification :

- `error` ou `ok:false` → error ;
- warnings → warning ;
- sinon → success.

Les messages peuvent être remplacés par `successMessage`, `warningMessage` ou `errorMessage`.

### `setRule(code, rule)`

Ajoute ou remplace une règle. Le message peut être une chaîne ou une fonction :

```js
bridge.setRule('control:changed', {
  type:'info',
  message:(detail) => `Contrôle ${detail.id} modifié`,
  duration:0
});
```

### `removeRule(code)` / `listRules()`

Permettent de piloter les règles. `listRules()` retourne des copies indépendantes.

### `setCenter(center)`

Change le provider sans reconstruire le bridge.

### `clearDedupe()`

Vide l’historique de déduplication et retourne le nombre de clés supprimées.

## Déduplication

Par défaut, un même triplet `code + type + message` n’est pas renvoyé pendant 800 ms.

Cette protection évite les toasts en rafale lors de plusieurs mutations identiques d’un panneau. `force:true` permet de contourner volontairement cette règle.

## Compatibilité avec NotificationCenter

Le contrat actuel de `NotificationCenter` expose les méthodes spécialisées et un fallback `show()`. Le bridge n’importe pas directement cette classe : il dépend uniquement de son interface publique, ce qui permet aussi l’usage avec un provider de tests ou un autre système de notification.

## Robustesse

- aucune dépendance DOM ;
- type inconnu normalisé vers `info` ;
- alias `danger → error` ;
- durée invalide ignorée ;
- code absent fail-closed ;
- règle non mappée neutre ;
- provider absent neutre ;
- copies des règles indépendantes ;
- horloge injectable pour comportement déterministe.

## Tests

`dev/framework/tests/inspector-notification-bridge.test.mjs` couvre :

- règles intégrées ;
- provider spécialisé ;
- fallback `show()` ;
- prefix ;
- durée et persistance ;
- déduplication et `force` ;
- règle dynamique avec fonction de message ;
- événement générique ;
- provider absent ;
- `reportResult()` success/warning/error ;
- validation des règles ;
- isolation de `listRules()` ;
- suppression et purge de déduplication.

Baseline : Node 22.16.0 — `inspector notification bridge tests: ok`.

## Hors périmètre

Ce lot ne modifie ni `NotificationCenter`, ni `FloatingPanel`, ni la démo. Le câblage visuel réel d’un InspectorPanel pourra utiliser ce bridge sans changer son contrat interne.
