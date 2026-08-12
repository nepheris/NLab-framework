# VisitorPreferences — première visite VP1

## Rôle

`VisitorPreferences` conserve les préférences initiales et persistantes du visiteur sans rendre l’interface de première visite.

Le contrat historique `get() / set() / themePatch()` reste compatible.

VP1 ajoute :

- langue ;
- schéma `system / light / dark` ;
- densité ;
- accent ;
- mode initial `public / webmaster` ;
- consentement personnalisation ;
- consentement télémétrie optionnel ;
- état `firstVisitCompleted`.

## Première visite

```js
prefs.needsFirstVisit();

prefs.completeFirstVisit({
  language: 'fr',
  scheme: 'dark',
  density: 'normal',
  accent: 'blue',
  viewMode: 'public',
  personalization: true,
  telemetry: false
});
```

`completeFirstVisit()` fusionne les valeurs avec l’état courant puis force `firstVisitCompleted=true`.

La télémétrie est tri-state :

- `null` — non choisie ;
- `true` — acceptée ;
- `false` — refusée.

## Langue

Formats acceptés : langue ISO courte, avec région optionnelle, par exemple :

- `fr`
- `en`
- `en-GB`
- `fr-FR`

La langue est normalisée (`en-gb → en-GB`).

## Handoff Theme / Webmaster

### Theme

```js
prefs.themePatch();
```

Retourne toujours le contrat historique :

```js
{
  scheme,
  density,
  accent
}
```

### WebmasterMode

```js
prefs.webmasterPatch();
```

Retourne :

```js
{ mode:'public' | 'webmaster' }
```

`WebmasterMode` reste la source de vérité runtime. VisitorPreferences ne stocke que le choix initial/persistant à lui transmettre.

## Consentements

```js
prefs.consents();
```

Retourne :

```js
{
  personalization: true | false,
  telemetry: true | false | null
}
```

## Persistance

Support :

- BrowserStorage nLab (`get/set`) ;
- Web Storage (`getItem/setItem`).

Méthodes :

- `persist()` ;
- `reload()` ;
- `reset()` ;
- `replace(snapshot, { merge })`.

Les erreurs de stockage sont contenues.

## Compatibilité

`set(name, value)` reste utilisable pour des clés personnalisées ; les valeurs connues sont normalisées/validées.

Les snapshots sont clonés défensivement via `getAll()` et `get()`.

## Erreurs structurées

- `PREFERENCE_NAME_REQUIRED`
- `INVALID_SNAPSHOT`
- `INVALID_LANGUAGE`
- `INVALID_SCHEME`
- `INVALID_VIEW_MODE`
- `INVALID_PREFERENCE`

## Vérification

Node 22 :

```text
visitor preferences tests: ok
```

Couverture : defaults, première visite, langue normalisée, themePatch rétrocompatible, handoff WebmasterMode, consentements, WebStorage, BrowserStorage, custom key défensive, replace/reset et validations.

## Raccord futur

La vraie UX de première visite (panneau/modal avec langue, thème, mode Web/Webmaster, personnalisation et télémétrie) reste un lot d’intégration/HUMAN séparé. VP1 fournit uniquement le contrat persistant et testable.
