# nLab Web Framework — Lighthouse et benchmark de promotion

Statut : `CANDIDATE — PROCESSUS EN TEST`  
Date : 2026-08-13

## Finalité

Lighthouse complète les tests unitaires, le préflight et la revue HUMAN par une mesure répétable de la qualité de la page réellement publiée. Il ne remplace ni les tests fonctionnels, ni les données terrain, ni l'inspection du réseau.

## Quand exécuter le benchmark

- après déploiement réussi d'une preview publique ;
- avant validation HUMAN et promotion ;
- après une modification susceptible d'affecter le rendu, le JavaScript, le CSS, les images, les polices, les routes ou le chargement des données ;
- après une correction de performance afin de comparer avant/après.

Aucun audit PageSpeed ou Lighthouse n'est déclenché par le runtime du site.

## Protocole minimal

1. Vérifier l'URL publique, le nom du projet, la version visible et le commit.
2. Exécuter Lighthouse en Mobile au moins trois fois.
3. Conserver la médiane et les rapports.
4. Répéter en Bureau.
5. Comparer avec la dernière baseline compatible.
6. Classer chaque écart : amélioration, bruit de mesure, régression justifiée ou correction requise.
7. Relier le rapport et la décision à la preview.

## Lecture du rapport

Suivre séparément :

- scores Performance, Accessibilité, Bonnes pratiques et SEO ;
- FCP, LCP, Speed Index, TBT et CLS ;
- poids des documents, scripts, styles, images, polices et ressources tierces ;
- nombre total de requêtes et appels API ;
- ressources bloquant le rendu ;
- JavaScript/CSS inutilisé ;
- tâches longues et travail du thread principal ;
- erreurs d'accessibilité et de structure sémantique.

Le score global est un indicateur synthétique. Les métriques brutes, les diagnostics et les différences par rapport à la baseline pilotent la décision.

## Budgets initiaux en mode avertissement

- catégorie < 0,90 : avertissement ;
- LCP laboratoire > 2 500 ms : avertissement ;
- CLS > 0,10 : avertissement ;
- nouvelle requête API automatique : correction requise sauf justification explicite ;
- augmentation inexpliquée du poids, du nombre de requêtes ou du TBT : revue requise ;
- nouvel échec Accessibilité, Bonnes pratiques ou SEO : correction ou justification traçable.

INP est suivi dans les données terrain lorsqu'elles existent. TBT reste un signal de laboratoire et ne doit pas être présenté comme une équivalence exacte d'INP.

## Automatisation Lighthouse CI

L'industrialisation candidate devra :

- exécuter plusieurs runs et utiliser une agrégation médiane ;
- conserver les rapports comme artefacts ;
- comparer la branche courante avec une référence ;
- commencer avec des assertions `warn` ;
- ne passer en `error` que les budgets stabilisés ;
- permettre des seuils par famille de pages ;
- ne pas dupliquer les audits pour un même commit et une même URL.

## Preuve minimale

Le rapport de benchmark doit contenir : projet, version, SHA, URL, date/heure Europe/Paris, profil, nombre de runs, méthode d'agrégation, résultats, baseline, écarts et décision HUMAN.

## Références

- https://developer.chrome.com/docs/lighthouse/overview
- https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
- https://github.com/GoogleChrome/lighthouse-ci
- https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- https://web.dev/articles/lighthouse-ci
- https://web.dev/articles/defining-core-web-vitals-thresholds
