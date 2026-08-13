# Site Generation Human Summary — vue HUMAN V1

## Objet

Ce lot matérialise la décision HUMAN H002 :

- le `nlab.site-generation-run-report` reste la source exhaustive machine ;
- la vue humaine est une projection dérivée de ce même rapport ;
- aucune seconde source d'état n'est maintenue.

## API

`tools/site/present-site-generation-run.mjs` expose :

- `buildSiteGenerationHumanSummary(report)` ;
- `formatSiteGenerationHumanSummary(summaryOrReport)` ;
- `SiteGenerationHumanSummaryError`.

## Modèle dérivé

La projection `nlab.site-generation-human-summary` V1 expose notamment :

- `decision`: `GO` ou `NO_GO` ;
- `attention_required` ;
- point d'arrêt éventuel ;
- compteurs de blocages, étapes requises non exécutées, warnings et contrôles HUMAN ;
- liste lisible des blocages ;
- liste lisible des étapes sautées ;
- contrôles HUMAN à effectuer ;
- projection de chaque stage avec icône, libellé et statut humain.

Le rapport machine source est conservé dans `raw_report` à titre de traçabilité ; il n'est jamais modifié par le presenter.

## Lecture humaine

Exemple nominal avec attention :

```text
GÉNÉRATION — Generic static site generation

État général
🟢 GO — génération réussie

Étapes
🟢 Pré-vol — OK
🟢 Chargement des données — OK
🟢 Validation des données — OK
🟡 Comparaison de référence — ATTENTION — review_reference_diff

Blocages : 0
Étapes requises non exécutées : 0
Warnings : 1

🟣 Contrôle HUMAN
→ Comparaison de référence: 2 differences
```

Exemple bloqué :

```text
État général
🔴 NO_GO — génération non validée
Arrêt : Validation des données (generation.validation)
```

## Principe de décision

Le presenter **ne recalcule pas** la vérité métier ou technique :

- `GO` vient uniquement de `report.ok === true` ;
- `NO_GO` vient de tout autre état global ;
- les blocages et étapes sautées proviennent des listes du run report ;
- les warnings proviennent du run report ;
- les contrôles HUMAN sont déduits uniquement des warnings et des stages `human` / `hybrid` qui ne sont pas `pass`.

La vue humaine ne peut donc pas diverger silencieusement du contrat machine.

## Libellés V1

Les types génériques du pipeline sont présentés en français : Pré-vol, Chargement des données, Validation des données, Relations, Rendu des pages, Assets, Routes, Assemblage web, Preview, Comparaison de référence, Rapport final.

Un type inconnu retombe sur l'ID du stage au lieu d'inventer un libellé.

## Validation

`tests/site-generation-human-summary.test.mjs` couvre :

1. GO avec warning non bloquant ;
2. NO-GO avec `halt_stage` et stage requis sauté ;
3. GO propre sans contrôle HUMAN supplémentaire ;
4. immutabilité du report source ;
5. rejet d'un contrat de run report non supporté.

Le scénario a été exécuté avec Node avant publication du lot.

## Frontières

Ce lot ne :

- modifie pas `run-site-generation.mjs` ;
- ne modifie pas le JSON Schema du run report ;
- n'ajoute pas encore d'interface HTML/DOM ;
- ne crée pas de second fichier d'état ;
- ne touche pas TableWiz, V20, la démo, l'architecture ou la roadmap canonique.
