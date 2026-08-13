# 🔎 Lot 9 — état live du pré-vol

> **Projet cible :** Recettes du Cœur  
> **Framework :** nLab Web Framework  
> **Instantané vérifié :** 2026-08-13 04:34 +02:00  
> **Nature :** vue documentaire ; la source de vérité reste `../roadmap/lot9-preflight.machine.json` + `../roadmap/coordination/locks/*.json`.

## Synthèse

Le pré-vol machine du Lot 9 est désormais **techniquement exécutable de bout en bout** : le `PreflightGateEvaluator`, le runner live, le contrat du checklist machine et les schémas de rapport/sortie sont intégrés et testés.

Le checklist historique conservait 7 gates bloquantes dans son snapshot. La relecture des locks actuels réduit les blocages réellement ouverts à **3 familles** :

1. `P9-003` — TableWiz : implémentation autonome terminée mais lock encore en `review` ;
2. `P9-007` — référence UX V20 : `blocked` sur validation visuelle HUMAN ;
3. `P9-008` — données source Recettes du Cœur : `blocked_external` tant que le corpus métier n'est pas accessible/inventorié dans le contexte du crash-test.

Les gates `P9-002`, `P9-004`, `P9-005` et `P9-006`, indiquées `in_progress` dans le snapshot d'origine, correspondent maintenant à des locks `done` intégrés dans `New`.

## État des gates

| Gate | Sujet | Snapshot initial | État live constaté | Décision |
|---|---|---|---|---|
| `P9-001` | séparation framework / métier | `pass` | `pass` | 🟢 acquis |
| `P9-002` | schémas de données structurées | `in_progress` | lock `8B-DATA-SCHEMAS-VALIDATION` = `done` | 🟢 franchi |
| `P9-003` | Search / Filter / Table | `in_progress` | TableWiz = `review` | 🟡 reste à clôturer/revoir |
| `P9-004` | Media + QR | `in_progress` | lock `8B-QR-MEDIA-ROBUSTNESS` = `done` | 🟢 franchi |
| `P9-005` | SEO + Share | `in_progress` | lock `8B-SEO-SHARE-CONTRACTS` = `done` | 🟢 franchi |
| `P9-006` | observabilité runtime | `in_progress` | lock `8B-OBSERVABILITY-ROBUSTNESS` = `done` | 🟢 franchi |
| `P9-007` | référence UX promue | `blocked_human` | V20 = `blocked`, HUMAN visual validation | 🟣 bloquant HUMAN |
| `P9-008` | sources Recettes du Cœur | `blocked_external` | pas de résolution live portée par un lock framework | 🟠 bloquant externe |
| `P9-009` | contrat vertical slice | `ready` | `ready`, non bloquant pour l'entrée | 🟢 prêt |
| `P9-010` | politique Preview | `ready` | `ready`, non bloquant pour l'entrée | 🟢 prêt |
| `P9-011` | discipline multi-agent | `pass` | active ; aucun chevauchement volontaire dans ce snapshot | 🟢 acquis |

## Chaîne technique disponible

```text
lot9-preflight.machine.json
        ↓
coordination/locks/*.json
        ↓
PreflightGateEvaluator
        ↓
run-live-preflight.mjs
        ↓
rapport nlab.live-preflight-report V1
        ↓
live-preflight-output.schema.json
```

Le runner est **read-only** : il ne modifie ni checklist, ni locks, ni roadmap.

## Ce qui peut avancer sans collision

- maintenir les contrats/fixtures de pré-vol et de génération déjà intégrés ;
- préparer le workspace métier lorsque les données Recettes du Cœur sont accessibles ;
- relire les résultats live avant toute intégration réelle ;
- préparer la vertical slice sans intégrer de logique métier dans le runtime générique.

## Ce qui ne doit pas être repris en parallèle

- **TableWiz** : PR #33 / lock `8B-TABLEWIZ-LEGACY-EXTRACTION` en `review` chez A ;
- **V20 Scope/Layout** : lock `8B-V20-SCOPE-LAYOUT` bloqué sur validation HUMAN ;
- toute modification de ces `file_scope` tant que leurs locks ne sont pas libérés.

## Prochain jalon logique

Le framework n'a plus besoin d'une nouvelle brique de pré-vol fondamentale avant le crash-test. Le chemin critique est maintenant :

```text
clôturer TableWiz review
        +
validation HUMAN V20
        +
accès/inventaire données Recettes du Cœur
        ↓
relancer le pré-vol live
        ↓
si GO : démarrer la vertical slice réelle
```

Cet instantané ne remplace jamais le runner live : avant tout GO réel, le pré-vol doit être recalculé depuis les locks courants.
