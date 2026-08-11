# Décisions — Framework V2

Ce journal conserve les décisions structurantes de la branche `New`. Git garde l’historique exact des modifications ; ce fichier garde l’historique lisible des choix.

## 2026-08-11 — Branche de reconstruction

- La V2 est reconstruite sur la branche `New`.
- `main` et les anciennes branches restent des références et ne servent pas de base directe à la nouvelle arborescence.
- La progression doit rester lisible commit par commit.

## 2026-08-11 — Autonomie du framework

- Le framework est traité comme un artefact autonome.
- Il possède ses propres conventions internes.
- Les conventions complètes du système nLab ne sont pas imposées à l’intérieur du framework pendant sa conception.
- L’intégration dans l’écosystème nLab sera traitée après stabilisation de l’architecture interne.

## 2026-08-11 — Séparation framework / métier

- Les données nécessaires au fonctionnement du framework sont distinctes physiquement des données métier.
- Le framework contient les moteurs, contrats, composants, thèmes, icônes, registres et ressources génériques.
- Les projets consommateurs possèdent leurs propres données, médias, documents et imports/exports métier.

## 2026-08-11 — Format canonique

- JSON est le format canonique des données métier structurées.
- CSV est privilégié pour les exports plats et échanges tabulaires simples.
- XLSX, CSV, TXT, JSON externe, API et autres sources passent par des adaptateurs avant consommation par le framework.

## 2026-08-11 — Base métier logique

- Une base métier peut être constituée d’un seul JSON ou de plusieurs collections JSON.
- Les collections sont reliées par identifiants canoniques et relations déclarées.
- Le framework construit une vue logique commune via index, relations et résolution.
- Les données résolues pour l’affichage ne doivent pas être dupliquées dans les objets métier sauf besoin explicite du schéma.

## 2026-08-11 — DataProvider

- Les composants UI et les Wiz ne connaissent ni le format physique ni l’emplacement réel des données.
- L’accès passe par un `DataProvider`.
- Le premier provider cible le JSON local/statique.
- Les futurs providers pourront viser GitHub, Google Drive, OneDrive, API ou SQLite sans modifier les composants consommateurs.

## 2026-08-11 — Médias et documents

- Images, SVG, PDF, audio, vidéo, QR et documents sont des données métier lorsqu’ils appartiennent au contenu du projet.
- Ils peuvent être référencés directement ou par un registre média lorsque la traçabilité et la réutilisation le justifient.

## 2026-08-11 — Roadmap et décisions humaines

- La roadmap affiche l’avancement global avant le tableau de bord.
- La légende est placée après le tableau de bord.
- Les sous-lots portent eux aussi un statut et un pourcentage quand cela apporte de la lisibilité.
- `🟣 Décision humaine` identifie explicitement les points qui nécessitent une validation/arbitrage utilisateur.
- Les décisions humaines sont regroupées autant que possible en fin de crash-test afin de permettre une exécution autonome des lots techniques.

## 2026-08-11 — Theme Workshop

- Le framework doit fournir un atelier de thème interactif en expérience Webmaster.
- Un mode déverrouillé affiche des poignées sur les composants autorisés pour ajuster dimensions, espacements et autres paramètres exposés.
- Header, Hero, Sections et composants compatibles peuvent être verrouillés individuellement ; un verrouillage global est disponible.
- Les couleurs sont modifiables via color picker live.
- Le résultat complet est sérialisable en JSON, exportable, importable et réapplicable à un autre site.
- La cascade est : framework/global → site → section/page → composant.
- Plusieurs variantes de thème peuvent être définies et affectées à des sections/pages.
- Le thème canonique reste séparé des préférences visiteur.

## 2026-08-11 — Personnalisation visiteur

- Le Webmaster définit le périmètre des options modifiables par le public.
- Un visiteur peut enregistrer localement son sous-thème et ses préférences de densité/rendu/navigation.
- Ces préférences ne modifient jamais le thème public canonique.
- Le visiteur peut revenir au thème public par défaut.

## 2026-08-11 — Framework data-driven

- Une même donnée doit pouvoir être visualisée sous plusieurs renderers sans duplication : carte, carte compacte, liste, liens, galerie, tuiles, pellicule/filmstrip, tableau.
- SearchWiz et FilterWiz produisent un jeu de résultats indépendant du renderer.
- TableWiz offre vues complètes/synthétiques, profils de colonnes, recherches et filtres par colonne.
- Les graphiques numériques restent disponibles mais sont moins prioritaires que recherche, cartes, listes, pellicules et tableaux.
- Le renderer par défaut peut varier selon le breakpoint tout en restant modifiable si le Webmaster l’autorise.

## 2026-08-11 — Page de démonstration

- Le framework possède une page HTML de développement suffisamment complète pour visualiser pratiquement toutes ses briques.
- Elle utilise de petits datasets synthétiques et, si utile, un sous-ensemble de données publiques Recettes du Cœur.
- Elle expose les paramètres actifs et les JSON de configuration afin de servir à la fois de catalogue, playground et outil de non-régression.
- Elle permet de tester différents breakpoints et le Theme Workshop.

## 2026-08-11 — Racine publiable Recettes du Cœur

- Dans le repo privé Webmaster, `Sites/Recettes-du-Coeur/web/` est la racine publiable logique du site.
- Une configuration privée peut déclarer cette valeur comme `source_root`.
- À l’intérieur du site généré, le contenu de `web/` est traité comme la racine `/` : les URLs ne contiennent jamais le chemin interne Webmaster.
- Les liens, assets et données sont relatifs à cette racine logique.
- Pour Preview ou production, le **contenu** de `web/` est copié à la racine de la destination.
- Ainsi, le même artefact `web/` reste autonome quel que soit l’emplacement physique de publication.
