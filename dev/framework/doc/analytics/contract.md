# AnalyticsWiz — contrat consentement / provider

## Objectif

Garantir qu'une tentative de mesure analytique ne soit déclarée comme envoyée que si le provider l'accepte réellement, sans rendre l'application dépendante de la disponibilité d'un service analytics.

## Contrat de décision

Avant tout envoi, `AnalyticsWiz` applique les contrôles suivants :

1. `enabled === true` ;
2. présence d'un provider exposant `track(name, data)` ;
3. consentement autorisé lorsque l'adapter de consentement est présent ;
4. nom d'événement non vide.

Une tentative bloquée retourne un résultat structuré avec `sent: false` et une raison explicite :

- `disabled` ;
- `provider-unavailable` ;
- `consent-denied` ;
- `consent-error` ;
- `invalid-event-name`.

## Contrat provider

Le provider peut retourner un objet contenant `sent` et `reason`.

- si le provider retourne `{ sent: false, reason }`, `AnalyticsWiz` propage l'échec ;
- si le provider réussit ou ne retourne aucun objet, `AnalyticsWiz` retourne `sent: true` ;
- si le provider lève une exception, elle est convertie en résultat `provider-error` afin que l'analytics ne casse pas le parcours applicatif.

Le résultat brut du provider est conservé dans `providerResult` lorsqu'il existe.

## ConsentAdapter

`ConsentAdapter` accepte un stockage optionnel via `get(key, defaultValue)` et `set(key, value)`.

Sans stockage, la valeur définie par `set()` est maintenant conservée en mémoire pour la durée de vie de l'adapter. La valeur par défaut reste `false` lorsqu'un adapter est créé sans option contraire.

Le framework ne décide pas à la place du site de la politique juridique ou fonctionnelle de consentement : le site doit fournir la politique et l'interface appropriées.

## GA4Provider

`GA4Provider` exige toujours un `measurementId`.

Le dispatcher `gtag` peut être injecté explicitement. Sinon, il est recherché sur `globalThis.gtag` au moment de chaque envoi, ce qui permet un chargement différé de GA4 après la création du provider.

Si `gtag` n'est pas disponible, le provider retourne :

```json
{
  "sent": false,
  "reason": "gtag-unavailable"
}
```

Ce résultat est propagé par `AnalyticsWiz` au lieu d'être transformé à tort en succès.

## Tests

`dev/framework/tests/analytics-contracts.test.mjs` couvre :

- succès MemoryAnalyticsProvider ;
- analytics désactivé ;
- consentement refusé puis accordé ;
- provider absent ;
- provider qui refuse l'envoi ;
- provider qui lève une exception ;
- erreur du stockage de consentement ;
- nom d'événement invalide ;
- GA4 sans `gtag` ;
- disponibilité tardive de `globalThis.gtag`.

## Hors périmètre

Ce lot ne branche aucun outil analytics sur le site public et ne modifie ni SEO/Share, ni Observability, ni la démo, ni le Theme Workshop. Il prépare seulement un contrat fiable pour le crash-test Lot 9.
