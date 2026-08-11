# Lot 9 — Pré-vol Recettes du Cœur

## But

Préparer le crash-test métier du nLab Web Framework sur **Les Recettes du Cœur** sans dépendre de la résolution immédiate des régressions de la Preview V17+.

Ce document ne modifie aucun runtime. Il fixe les frontières, les entrées/sorties et l’ordre de raccordement afin de pouvoir démarrer rapidement le site dès que la base Framework retenue est validée.

## Principe d’architecture

Le Framework reste générique. Le métier Recettes du Cœur reste séparé.

```text
nLab Web Framework
├── composants génériques
├── wiz génériques
├── data/runtime générique
└── contrats / renderers

Recettes du Cœur
├── données métier
├── configuration métier
├── assets métier
├── templates / compositions métier
└── génération du web public
```

Aucune règle spécifique aux recettes ne doit être codée dans une brique générique si elle peut être décrite par données, configuration, mapping ou template.

## Entrées métier attendues

À raccorder lors du crash-test :

- référentiel recettes ;
- référentiel ingrédients ;
- catégories ;
- tags ;
- allergènes ;
- saisonnalité ;
- équipements ;
- astuces ;
- médias / images ;
- configuration du site public ;
- dictionnaires de données et versions des référentiels.

## Contrats Framework à éprouver

### 1. Data / JSON

- chargement de plusieurs JSON liés ;
- résolution des relations par identifiant ;
- validation des structures ;
- mapping libellé humain / ID technique ;
- gestion des données manquantes ou désactivées ;
- conservation des métadonnées et versions.

### 2. JSON Studio

À utiliser d’abord comme outil de contrôle/édition, pas comme dépendance bloquante de la génération :

- navigation hiérarchique ;
- champs typés ;
- listes/tokens ;
- relations inter-JSON ;
- import/export ;
- validation ;
- diff / historique lorsque disponible.

### 3. Search / Filter

Cas métier prioritaires :

- recherche recette ;
- catégories ;
- tags ;
- ingrédients ;
- allergènes ;
- saison ;
- filtres combinés ET/OU ;
- état actif/publicable.

### 4. TableWiz / DataWiz / ResultSet

À éprouver avec les vraies données :

- tables d’administration ;
- cartes recette ;
- listes ;
- vues galerie ;
- tri/recherche ;
- pagination ;
- renderers images, liens, tags, booléens et IDs liés.

### 5. Media Renderer

Cas réels :

- image recette ;
- image ingrédient ;
- fallback quand image absente ;
- ratios ;
- object-fit ;
- transparence ;
- miniatures.

### 6. QRWiz

Cas métier :

- QR d’une recette ;
- QR d’une astuce ;
- URL publique ;
- génération reproductible ;
- contrôle de lisibilité ;
- export image/PDF selon besoins.

### 7. Theme / identité

- thème public Recettes du Cœur distinct de l’outillage Webmaster ;
- aucun réglage métier ne doit polluer la configuration globale du Framework ;
- presets exportables/reproductibles.

## Séparation des dossiers cible

La structure exacte du dépôt métier devra être confirmée sur le dépôt réel, mais le contrat de séparation est :

```text
Sites/Recettes-du-Coeur/
├── atelier/        # travail, contrôles, compositions, génération
├── data/           # données métier / référentiels nécessaires
├── assets/         # médias métier
├── config/         # configuration du site
└── web/            # sortie générée publiable
```

Le dossier `framework/` reste le Framework générique embarqué ou synchronisé selon la stratégie retenue ; il ne devient pas un dossier métier.

## Parcours minimum pour produire un premier site ce soir

Le premier objectif n’est pas de brancher tout le Framework. Il faut produire un **vertical slice** démontrable :

1. charger un sous-ensemble réel de recettes + ingrédients ;
2. résoudre les relations recette → ingrédients ;
3. afficher un index public de recettes ;
4. afficher une fiche recette ;
5. faire fonctionner recherche + un petit jeu de filtres ;
6. gérer les images + fallback ;
7. générer une URL/QR recette ;
8. publier en Preview ;
9. comparer le résultat aux pages actuelles ;
10. seulement ensuite élargir aux astuces, PDF et autres référentiels.

## Critères de succès du premier crash-test

- aucune logique recette dupliquée dans le Framework ;
- données réelles chargées sans conversion manuelle ad hoc ;
- relations inter-JSON fonctionnelles ;
- page index + fiche générées ;
- recherche/filtre fonctionnels ;
- médias robustes ;
- QR reproductible ;
- Preview publiable ;
- anomalies Framework consignées séparément des anomalies métier.

## Ce qui peut avancer pendant H001 suspendu

- inventaire des données et contrats ;
- préparation du mapping métier ;
- structure d’atelier ;
- checklist de génération ;
- jeux de données de test représentatifs ;
- contrats de rendu ;
- tests de validation JSON ;
- documentation des dépendances ;
- audit du site existant dès que son dépôt est accessible.

## Ce qui reste bloqué par la validation Preview

- promotion d’une nouvelle version du Theme Workshop ;
- validation finale du JSON Studio visuel ;
- promotion d’une nouvelle convergence DataWiz/QRWiz issue de V17+ ;
- choix définitif de la base de démonstration supérieure à V16.

## Point de reprise opérationnel

Quand l’utilisateur revient :

1. ne pas reprendre automatiquement V17/V18/V19 ;
2. garder V16 comme référence ;
3. décider si on corrige V17 ou si on crée une nouvelle review depuis V16 ;
4. en parallèle, commencer le vertical slice Recettes du Cœur avec les contrats ci-dessus dès que le dépôt/données métier sont accessibles.
