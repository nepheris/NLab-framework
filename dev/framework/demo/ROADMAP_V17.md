# Framework V2 — cycle de revue V17

> **Roadmap de cycle de démonstration.** La roadmap projet canonique du nLab Framework est maintenant restaurée dans [`../ROADMAP.md`](../ROADMAP.md). Ce document V17 conserve uniquement le détail de la passe de démonstration et ne remplace plus la feuille de route globale.

## Objectif

Transformer la page de démonstration en vrai banc d'essai du framework : chaque contrôle visible doit être testable, les comportements génériques doivent rester factorisés et le JSON Studio doit devenir un éditeur métier exploitable, pas une simple visualisation.

## Vue d'avancement globale

> Les pourcentages ci-dessous représentent une estimation de **maturité fonctionnelle**, pas un taux de lignes de code terminées.

```text
ARCHITECTURE FRAMEWORK
████████████████████  ~90 %

CATALOGUE / PLAYGROUND
████████████████░░░░  ~80 %

UX / CONCEPTS
██████████████░░░░░░  ~70 %

COMPOSANTS INDUSTRIALISÉS
██████████░░░░░░░░░░  ~50 %

JSON / DATA MÉTIER
██████████░░░░░░░░░░  ~50 %

TESTS / ROBUSTESSE
██████░░░░░░░░░░░░░░  ~30 %

INTÉGRATION MÉTIER
████░░░░░░░░░░░░░░░░  ~20 %
```

### Process cible

```text
Idée
  ↓
Prototype dans la démo
  ↓
Validation UX
  ↓
Extraction dans le framework
  ↓
Démo consommant la brique générique
  ↓
Test métier / crash-test
```

La page de démonstration reste un laboratoire de validation. Une fonctionnalité considérée comme validée doit ensuite être extraite dans une brique générique du framework afin d'éviter que la démo ne devienne une application monolithique parallèle.

## Implémenté dans V17

- numéro de version V17 visible dans le titre HTML, le H1 et en très grand dans la page ;
- header pleine largeur avec sommaire démarrant sous le header ; conservation du comportement hamburger/repli ;
- badge visible `Catalogue initialisé` ;
- couche Info/Test plus cohérente : IDs et métadonnées de test disparaissent avec Info OFF ;
- boutons de retour à la valeur par défaut ajoutés aux principaux champs configurables ;
- background : Couleur 1 et Couleur 2 côte à côte, inversion directe et rotation du sens du dégradé ;
- profils de test Défaut / XS / L / XL / XXL avec portée affichée `Cet élément`, `Même type` ou `Global` ;
- responsive : orientation automatique portrait pour mobile/tablette et paysage pour desktop ;
- Set Filter : tokens colorés selon leur provenance, suppression par croix, drag & drop pour réordonner, modes de saisie fermée/ouverte/libre, options casse/accents/caractères spéciaux/mots parasites et prévisualisation de tokenisation ;
- TableWiz : dataset enrichi, images, téléphone, code postal et texte long, recherche globale, tri A→Z/Z→A et bandes alternées ;
- JSON Studio : sections/sous-sections pliables, compteurs d'items, tout plier/tout déplier, édition typée, textarea long, listes en tokens, suppression/ajout, ajout d'item et export complet ;
- relation inter-JSON de démonstration via `sical` entre recettes et ingrédients, avec affichage ID + libellé humain + image + donnée nutritionnelle ;
- QR Studio : types URL, texte, contact, email, téléphone, SMS, Wi-Fi, GPS et événement ; coins indépendants ; presets carrés/arrondis/mixte ; fond transparent ;
- annotations de roadmap dans les zones volontairement différées.

## Prochaine passe prioritaire

1. **Theme Workshop industrialisé** : vraie portée de mutation `instance / type / global` dans le moteur de thème, schéma unique des profils et reset par propriété.
2. **JSON Studio composant framework** : extraire le prototype de démonstration vers `components/json-studio.js`, validation, undo/redo, historique, diff visuel, relations multiples et mapping des champs d'affichage.
3. **TableWiz/DataWiz convergence** : même DataSource, mêmes colonnes typées, renderers partagés et vues table/cartes/galerie/graphiques issues d'un ResultSet unique.
4. **Search/Set Filter** : score de compatibilité pondéré selon l'ordre des tokens, dictionnaire de stopwords configurable, normaliseurs par locale et suggestions multi-colonnes.
5. **QRWiz** : génération pilotée par type de contenu, bibliothèque de presets, profils de logo multicolore et validation de lisibilité/correction d'erreur.
6. **Media renderer** : cadre d'image générique (fond, transparence, quatre coins indépendants, détourage/masque) partagé entre cartes, tables, galerie et QR.
7. **NotificationCenter** : thèmes `info/success/warning/error/dev`, tokens de couleurs dans le thème et remplacement des notifications locales restantes.
8. **CodeBlock** : presets selon langage ; JSON hiérarchique pliable ; éditeur enrichi distinct du simple bloc de code.

## Règle de versionnement de la démo

Chaque commit qui modifie la page de démonstration doit incrémenter son numéro de version visible. La version doit apparaître au minimum dans le titre navigateur, le titre principal et un marquage visuel immédiatement lisible dans la page.
