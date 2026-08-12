# DiagnosticCoverageAudit

`DiagnosticCoverageAudit` est un **préflight DOM-free** pour vérifier la couverture de diagnostic avant un crash-test ou une validation HUMAN.

Il ne remplace ni `DiagnosticIdRegistry` ni `InfoTestControl` et n'inspecte pas le DOM. Une démo ou un catalogue lui fournit un manifeste déclaratif de zones.

## Deux niveaux d'audit

### 1. Qualité du registre

```js
const report = audit.auditRegistry();
```

Pour chaque entrée du `DiagnosticIdRegistry`, l'audit vérifie les informations nécessaires au panneau Info/Test :

- `objective` ;
- au moins un élément dans `thingsToTest` ;
- `expectedResult`.

L'absence de fichier source déclaré est signalée en **warning** (`NO_FILES`) et non comme erreur bloquante.

Le registre reste la source de vérité des formats `humanId` et `technicalId`; DCA1 ne duplique pas leurs expressions de validation.

## 2. Couverture des zones

Une couche d'intégration peut fournir :

```js
const zones = [
  {
    key: 'header',
    ref: 'HDR-001',
    testable: true,
    infoTest: true,
    titleId: true
  }
];

const report = audit.auditZones(zones);
```

Pour une zone `testable !== false`, le préflight vérifie :

- présence d'une référence diagnostic ;
- référence enregistrée ;
- métadonnées de test complètes ;
- déclaration d'un contrôle Info/Test ;
- déclaration de l'ID humain dans le titre.

Une zone explicitement `testable:false` peut ne pas avoir de diagnostic.

## Options de zone

```js
audit.auditZones(zones, {
  requireInfoTest: true,
  requireTitleId: true
});
```

Ces deux règles peuvent être désactivées pour une surface particulière, mais elles sont actives par défaut conformément au backlog UX.

## Références partagées

Si plusieurs zones utilisent le même diagnostic, le rapport ajoute le warning `SHARED_DIAGNOSTIC_REF`.

Ce n'est pas automatiquement une erreur : certaines représentations peuvent légitimement partager le même objet logique. Le warning permet cependant de repérer les duplications accidentelles avant validation.

## Rapport

Les rapports `registry` et `zones` exposent :

```js
{
  scope,
  valid,
  count,
  errors,
  warnings,
  invalid,
  items
}
```

Chaque item contient une liste d'issues structurées :

```js
{
  level: 'error' | 'warning',
  code,
  message,
  details
}
```

Principaux codes :

- `MISSING_OBJECTIVE` ;
- `MISSING_THINGS_TO_TEST` ;
- `MISSING_EXPECTED_RESULT` ;
- `NO_FILES` ;
- `ZONE_REF_REQUIRED` ;
- `UNKNOWN_DIAGNOSTIC` ;
- `INFO_TEST_MISSING` ;
- `TITLE_ID_MISSING` ;
- `DUPLICATE_ZONE_KEY` ;
- `SHARED_DIAGNOSTIC_REF`.

## Rapport combiné

```js
const result = audit.audit({ zones });
```

combine l'audit du registre et celui des zones :

```js
{
  valid,
  errors,
  warnings,
  registry,
  zones
}
```

L'option `registry:false` permet de n'auditer que le manifeste fourni.

## Garde assert

```js
audit.assert(result);
```

retourne le rapport lorsqu'il est valide et lance `DiagnosticCoverageAuditError` avec le code `COVERAGE_FAILED` sinon. Cette API peut servir dans un script de préflight ou une suite de tests.

## Ce que DCA1 ne prouve pas

Le préflight est volontairement déclaratif. Il **ne prouve pas** :

- que le bouton Info/Test est visuellement lisible ;
- que l'ID est réellement visible à l'écran ;
- que les contrastes/couleurs sont corrects ;
- que le panneau s'ouvre dans le bon emplacement ;
- que la démo a correctement construit son manifeste.

Ces points restent à valider par le wiring de la démo et par le crash-test HUMAN.

## Frontières

DCA1 ne modifie pas :

- `DiagnosticIdRegistry` ;
- `InfoTestControl` ;
- `WebmasterMode` ;
- les démos ;
- le CSS ;
- la roadmap canonique.

## Vérification

```bash
node dev/framework/tests/diagnostic-coverage-audit.test.mjs
```

La suite utilise le vrai `DiagnosticIdRegistry` et couvre les métadonnées manquantes, warnings de fichiers, manifests valides/incomplets, diagnostics inconnus, références partagées, zones non testables, rapport combiné et garde `assert()`.
