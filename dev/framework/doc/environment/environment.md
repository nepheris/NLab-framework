# Environment — contrat de configuration

`Environment` centralise le mode d'exécution, l'expérience utilisateur et les bases d'URL du framework.

## Valeurs canoniques

Modes :

- `production` ;
- `preview` ;
- `development`.

Expériences :

- `visitor` ;
- `webmaster`.

Les entrées `mode` et `experience` sont trimées et normalisées en minuscules avant validation.

## Bases

- `baseUrl` : chaîne, `URL` ou `null` ; chaîne vide → `null` ;
- `assetsBase` : chaîne, `URL` ou `null` ; `null` → `assets/` ; chaîne vide autorisée ;
- `apiBase` : chaîne, `URL` ou `null` ; chaîne vide → `null`.

Les objets `URL` sont sérialisés en chaîne pour que `toJSON()` reste stable.

## Helpers

- `isProduction` ;
- `isPreview` ;
- `isDevelopment` ;
- `isVisitorExperience` ;
- `isWebmasterExperience`.

## Erreurs

`EnvironmentError` expose des codes structurés :

- `INVALID_MODE` ;
- `INVALID_EXPERIENCE` ;
- `INVALID_BASEURL` ;
- `INVALID_ASSETSBASE` ;
- `INVALID_APIBASE`.

Les erreurs de mode/expérience exposent également la liste des valeurs autorisées dans `details.allowed`.

## Compatibilité

Le format `toJSON()` reste :

```json
{
  "mode": "preview",
  "experience": "webmaster",
  "baseUrl": null,
  "assetsBase": "assets/",
  "apiBase": null
}
```

Ce contrat reste compatible avec `URLResolver`, qui accepte lui aussi des bases relatives/absolues et les contextes sans navigateur.

## Test dédié

`tests/environment-robustness.test.mjs` couvre défauts, normalisation, getters, objets `URL`, bases vides, sérialisation et entrées invalides.
