# nLab Web Framework

## 📄 Fiche projet

> **Résumé en une phrase :** nLab Web Framework transforme des jeux de données dispersés en expériences web structurées, croisées, intelligibles et à forte valeur ajoutée, depuis le site public jusqu’à l’application métier locale.

## 1. Identité

- **Nom :** nLab Web Framework
- **Type nLab :** FRMW
- **Statut :** DEV / ACTIVE
- **Dépôt :** [nepheris/nLab-Web-Framework](https://github.com/nepheris/nLab-Web-Framework)
- **Roadmap :** [`roadmap.md`](./roadmap.md)
- **REX machine :** [`project-brief.rex.machine.json`](./project-brief.rex.machine.json)

## 2. Logo / identité visuelle

Le logo officiel est en cours de finalisation selon la procédure canonique nLab. Après validation, les variantes fond clair, fond sombre, monochrome et icône seront affichées ici et dans la roadmap.

## 3. Présentation rapide

nLab Web Framework est un framework web orienté données. Son rôle n’est pas seulement d’afficher des pages : il prend un ou plusieurs jeux de données, les structure, les relie, les filtre, les croise et les transforme en vues compréhensibles et utiles. Le même socle doit pouvoir servir à un site public, un catalogue interactif, un tableau de bord, une interface d’exploration ou une véritable application métier web fonctionnant en ligne ou localement.

## 4. Idée de base / problème à résoudre

Des données existent souvent sous des formes dispersées : JSON, référentiels, tableaux, médias, relations par identifiants, données métier, contenus éditoriaux. Prises séparément, elles restent difficiles à lire, explorer et exploiter. Le projet vise à fournir un socle générique pour les transformer en une expérience web cohérente, navigable et interactive sans reconstruire à chaque fois toute l’architecture de rendu, de recherche, de filtrage, de relation et de thème.

## 5. Valeur ajoutée

Le framework apporte de la valeur en rendant les données :

- **intelligibles** — vues adaptées au type d’information ;
- **croisables** — relations entre sources et référentiels ;
- **explorables** — recherche, filtres, tris, regroupements et navigation ;
- **présentables** — cartes, tableaux, listes, galeries, documents et sorties ;
- **éditables** — JSON Studio et composants de manipulation ;
- **réutilisables** — mêmes briques pour plusieurs projets ;
- **contextualisées** — IDs, libellés, images, métadonnées et données liées ;
- **déployables** — site public, preview, application métier web ou usage local.

## 6. Entrées → transformation → sorties

```text
ENTRÉES
JSON / tableaux / référentiels / médias / métadonnées / données liées
  ↓
NORMALISATION & RÉSOLUTION
DataSource / registry / relations / IDs / schémas
  ↓
TRANSFORMATION
recherche / filtres / regroupements / calculs / croisement / enrichissement
  ↓
RENDUS
TableWiz / DataWiz / cartes / listes / galeries / JSON Studio / QR / documents
  ↓
SORTIES
site public / application web / dashboard / exploration locale / exports
```

## 7. Ce que contient le projet

- moteur de thème et Theme Workshop ;
- composants UI génériques ;
- DataSource / DataResolver / ResultSet et relations inter-données ;
- Search / Filter / Renderer ;
- TableWiz / DataWiz ;
- JSON Studio ;
- Media Renderer ;
- QRWiz / DocumentWiz / CodeBlock ;
- navigation, aide, panneaux flottants et notifications ;
- Catalogue / Playground pour tester et valider les briques ;
- mécanismes de configuration et d’export.

## 8. Ce que le projet ne doit pas devenir

- un site métier codé en dur ;
- une collection de composants indépendants sans source de vérité commune ;
- une démo monolithique qui duplique le framework ;
- un framework dépendant d’un seul cas d’usage ou d’un seul format de données.

## 9. Cycle de création / évolution

```text
Idée
  ↓
Prototype dans le Catalogue / Playground
  ↓
Validation UX / HUMAN
  ↓
Extraction dans une brique générique
  ↓
Démo consommant la brique réelle
  ↓
Crash-test métier
  ↓
Capitalisation dans nLab
```

## 10. Liens structurels

- **Projet parent / écosystème :** nLab
- **Type :** FRMW
- **Roadmap :** `roadmap.md`
- **REX projet :** `project-brief.rex.machine.json`
- **REX roadmap :** `roadmap.rex.machine.json` à adopter comme nom canonique
- **Cycle courant :** Catalogue / Playground V18
- **Crash-test métier prévu :** Les Recettes du Cœur
- **Future Knowledge Base :** cette fiche et son REX sont conçus pour être indexables et reliables à d’autres objets nLab.
