# RETEX autonomie — brief machine pour ChatGPT

Objectif : capitaliser les enseignements de la construction autonome du Framework V2 et du premier essai de publication Preview afin d'améliorer vitesse, fiabilité et qualité lors des prochains cycles.

## Règle générale

Ce document est un référentiel opérationnel destiné à être relu avant une nouvelle séquence autonome importante. Il complète la roadmap et `DECISIONS.md`.

## Ce qui a bien fonctionné

- Découper le travail en lots stables avec un commit lisible par lot/sous-lot.
- Mettre à jour la roadmap après les jalons techniques importants.
- Séparer les états `Terminé`, `À tester`, `À faire`, `Bloqué` et `Décision humaine`.
- Regrouper les décisions humaines à la fin lorsque l'autonomie technique est possible.
- Utiliser des contrats génériques avant les implémentations : DataProvider, Resolver, Validator, State, Events, Registry, Wiz.
- Construire une page catalogue/playground avant le crash-test métier.
- Garder les données canoniques séparées des rendus et des données résolues.
- Refetch systématique avant chaque écriture Git pour éviter d'écraser un changement concurrent.
- Donner après chaque commit : repo, branche, SHA, URL commit, URL du fichier/dossier principal.

## Ce qui a coûté du temps inutilement

- Mélanger plusieurs méthodes d'écriture Git dans une même séquence (`contents API` puis `tree/commit/update_ref`). Cela a créé des têtes intermédiaires et nécessité des consolidations.
- Considérer un workflow GitHub Actions `success` comme preuve suffisante que la bonne page était réellement visible publiquement.
- Donner un lien jsDelivr vers un fichier HTML : jsDelivr sert le fichier comme ressource, pas comme page web exécutée.
- Publier d'abord dans un sous-répertoire alors que la cible de test attendue était la racine publique du Preview.
- Vérifier uniquement l'artefact de build sans vérifier explicitement le point d'entrée public, sa version et ses dépendances.
- Continuer trop loin sans créer assez tôt un mécanisme d'identification de la version réellement servie.

## Bonnes pratiques Git à conserver

1. Refetch de la branche immédiatement avant chaque écriture.
2. Une seule stratégie d'écriture par séquence :
   - soit `create_blob → create_tree → create_commit → update_ref` pour un lot multi-fichiers ;
   - soit Contents API pour une petite modification isolée.
3. Ne pas mélanger les deux avant d'avoir refetch la nouvelle tête.
4. Commit cohérent et atomique.
5. Après commit, vérifier la nouvelle tête de branche.
6. Fournir les liens de consultation directs.

## Publication Preview — procédure obligatoire

Avant d'annoncer qu'une preview est disponible :

1. Refetch du repo Preview et de la source à publier.
2. Construire explicitement un dossier `_site` autonome.
3. Vérifier que `_site/index.html` est bien le point d'entrée attendu.
4. Vérifier les fichiers requis par `index.html` : CSS, JS, modules, datasets, médias.
5. Ajouter un fichier `PREVIEW_BUILD.json` contenant :
   - SHA de la source ;
   - SHA du repo Preview ;
   - date de build ;
   - type de preview.
6. Injecter une identification discrète de version dans le HTML ou rendre `PREVIEW_BUILD.json` consultable.
7. Faire échouer le workflow si les fichiers obligatoires sont absents.
8. Vérifier le job GitHub Actions.
9. Vérifier l'artefact `github-pages` réellement uploadé.
10. Vérifier le `deployment_status` GitHub Pages et son `environment_url`.
11. Ne fournir au testeur que l'URL publique cible, jamais un raw/jsDelivr comme substitut à une vraie preview.
12. Si le contenu public ne correspond pas à l'artefact malgré un déploiement `success`, traiter le problème comme un problème de publication/cache et ne pas prétendre que la preview est validée.

## Contrôles à intégrer au workflow Preview

Le workflow doit contenir un step de validation avant upload :

- `test -f _site/index.html` ;
- `grep` d'un marqueur attendu dans le titre ou le contenu ;
- présence du CSS principal ;
- présence du JS principal ;
- présence des modules importés essentiels ;
- présence du dataset de démonstration ;
- génération de `PREVIEW_BUILD.json` ;
- affichage dans les logs de la SHA source.

## Page catalogue / démo

- La démo doit fonctionner depuis une vraie racine HTTP, pas depuis un CDN de fichiers bruts.
- Les chemins doivent être relatifs et testables sous GitHub Pages.
- Les dépendances tierces doivent rester explicites et limitées.
- Les datasets doivent être petits mais couvrir plusieurs cas : texte, nombres, booléens, arrays, relations, images, erreurs.
- Une page de démo doit permettre de vérifier rapidement : thème, responsive, recherche, filtres, renderers, tableaux, JSON Studio, panneaux, sorties.

## Gestion des validations

- Tests unitaires/structurels → peuvent mener à `✅ Terminé`.
- UI/UX sans revue humaine → `🟠 À tester`.
- Arbitrage de design ou choix final de thème → `🟣 Décision humaine`.
- Dépendance externe empêchant réellement d'avancer → `🔴 Bloqué`.

## Checkpoints RETEX

Le RETEX n'est pas mis à jour à chaque micro-étape. Il doit être enrichi :

- après un lot particulièrement complexe ;
- après un incident ou une fausse hypothèse coûteuse ;
- avant de changer de repo/couche majeure (framework → Webmaster → Preview) ;
- après un crash-test ;
- avant stabilisation d'une version.

À chaque checkpoint :

1. noter ce qui a bien fonctionné ;
2. noter ce qui a échoué ou coûté du temps ;
3. transformer l'enseignement en règle opérationnelle ;
4. mettre à jour la roadmap si une nouvelle étape de contrôle devient nécessaire ;
5. éviter de conserver des anecdotes sans règle réutilisable.

## Priorité d'optimisation pour les prochains cycles

1. Vérifiabilité avant vitesse apparente.
2. Un seul chemin de publication.
3. Une seule source de vérité par information.
4. Automatiser les contrôles répétitifs dans le workflow plutôt que les refaire mentalement.
5. Vérifier le résultat réellement consommé par l'utilisateur, pas seulement le résultat intermédiaire produit par l'outil.
6. Produire des preuves simples : SHA, fichier build metadata, URL publique, statut deployment.

## Incident Preview du 2026-08-11 — enseignement

Constat : le build et le déploiement Pages ont été marqués `success`, et l'artefact contenait le catalogue, mais l'utilisateur continuait à voir l'ancien `index.html` de test à la racine publique.

Conclusion opérationnelle : `workflow success` ≠ `preview publiquement vérifiée`. Il faut distinguer :

`source correcte → artefact correct → deployment success → contenu public effectivement servi`.

Ces quatre niveaux doivent être contrôlés séparément lors d'un crash-test de publication.
