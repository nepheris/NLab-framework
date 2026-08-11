# 💡 Boîte à idées — Framework nLab

Ce document collecte les évolutions intéressantes qui **ne font pas partie du périmètre actif de la roadmap Framework V2**. Il évite de perdre une idée sans polluer les lots en cours.

## Règle de tri

Une idée entre ici lorsqu'elle est utile mais non nécessaire pour terminer le crash-test actuel. Si elle devient nécessaire à un lot actif, elle est déplacée vers `ROADMAP.md` ou `ROADMAP-8B-DETAIL.md` avec un statut explicite.

## Édition de texte / contenu riche

- Mini éditeur de texte riche réutilisable : saisie, gras, italique, souligné, couleur, liens, images, listes, titres.
- Barre d'outils compacte et mode avancé.
- Persistance locale optionnelle.
- Export HTML, texte, PDF, image et DOCX/Word quand le moteur d'export sera disponible.
- Étudier les éditeurs JavaScript existants avant implémentation afin de réutiliser les bons patterns et éviter une réécriture inutile ; conserver une façade nLab indépendante de la bibliothèque retenue.

## Dates / calendrier / agenda

- DatePicker et DateTimePicker génériques.
- Saisie simple de date à court terme si nécessaire dans les formulaires.
- Vues jour / semaine / mois / trimestre / année.
- Agenda avec rendez-vous et événements.
- Frises chronologiques horizontales et verticales.
- Timeline défilante.
- Plages de dates et récurrences.
- Import/export calendrier au format iCalendar / ICS.
- Compatibilité avec les agendas courants via fichier ICS.

## Données spatiales / cartes

- MapWiz pour données géographiques.
- Points, marqueurs, clusters, zones et parcours.
- Fonds de carte interchangeables.
- Affichage de données spatiales issues des collections métier.
- Filtres et sélection croisée carte ↔ tableau/liste.

## Types de données spécialisés

Créer à terme un registre de types avec parsing, validation, formatage, édition et rendu associés :

- téléphone ;
- email ;
- URL ;
- SIRET / SIREN et autres identifiants structurés ;
- monnaie / devise ;
- pourcentage ;
- durée ;
- date / heure ;
- coordonnées géographiques ;
- fichier / média ;
- booléen ;
- tags / ensembles de valeurs ;
- nombres entiers, décimaux et plages.

Chaque type pourra exposer ses renderers et filtres adaptés dans TableWiz, FormWiz et JSON Studio.

## Analyse de données

- statistiques descriptives simples : nombre, minimum, maximum, moyenne, médiane, somme, écart-type ;
- regroupements ;
- distributions ;
- agrégations par catégorie ;
- règles d'affichage conditionnel ;
- mise en forme conditionnelle en cellule, ligne ou colonne ;
- palettes d'état pilotées par seuils ;
- indicateurs calculés ;
- graphiques plus avancés après le premier crash-test.

## Rendus conditionnels et cellules spécialisées

- règles conditionnelles par valeur, type ou expression ;
- texte éditorial ;
- URL complète, raccourcie, libellé, ancre ou simple icône ;
- média avec miniature ;
- PDF avec vignette et accès viewer ;
- fichier avec icône par type ;
- image inline ou miniature ;
- booléen sous forme texte, 0/1, checkbox ou toggle ;
- tags sous forme de chips ;
- format monétaire localisé ;
- dates selon profils d'affichage.

## Documents / exports futurs

- exports multi-formats depuis une même représentation : HTML, PDF, image, texte, CSV, JSON, DOCX, ZIP ;
- snapshots de sections ou visualisations ;
- génération de miniatures pour documents ;
- empaquetage ZIP de plusieurs sorties ;
- profils d'export sauvegardables.

## Principes de conception pour les idées futures

- vérifier d'abord les bibliothèques JavaScript existantes et leurs licences ;
- envelopper les dépendances tierces derrière une API nLab pour rester remplaçable ;
- ne jamais faire d'une bibliothèque externe la source de vérité du modèle métier ;
- privilégier des briques composables plutôt que des composants monolithiques ;
- ajouter une idée à la roadmap active uniquement lorsqu'elle devient nécessaire au prochain objectif concret.
