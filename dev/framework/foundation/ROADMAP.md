# Roadmap — Framework V2 + crash-test Recettes du Cœur

> Branche de construction : `New`  
> Progression = lots construits techniquement ; les lots visuels restent `🟠 À tester` jusqu'au crash-test humain.

# AVANCEMENT GLOBAL — 69 % MACRO — 🔵 CONSOLIDATION 8B EN COURS

## Tableau de bord

| Lot | Objet | Avancement | État |
|---|---|---:|---|
| 0 | Gouvernance, conventions, roadmap | 100 % | ✅ Terminé |
| 1 | Fondation data | 100 % | ✅ Terminé |
| 2 | Core runtime | 100 % | ✅ Terminé |
| 3 | Primitives UI | 100 % | 🟠 À tester |
| 4 | Theme Workshop, thème, icônes, aide, navigation | 100 % | 🟠 À tester |
| 5 | Data UX : Search, Filter, Renderer, Table, JSON Studio | 100 % | 🟠 À tester |
| 6 | Media, QR, Share, Document | 100 % | 🟠 À tester |
| 7 | SEO, Analytics, Performance, Monitoring | 100 % | 🟠 À tester |
| 8 | Catalogue, datasets, responsive, tests/itérations | 100 % | 🟠 À tester |
| 8B | Consolidation UX transverse / atelier Webmaster | 25 % | 🔵 En cours |
| 8C | Diagnostic avancé / notifications / observabilité UI | 0 % | ⬜ À faire |
| 9 | Webmaster privé — atelier Recettes du Cœur | 0 % | 🔵 En cours |
| 10 | Webmaster — web Recettes du Cœur | 0 % | ⬜ À faire |
| 11 | Preview public — crash-test intégral | 0 % | ⬜ À faire |
| 12 | Validation humaine finale et corrections | 0 % | 🟣 Décision humaine |

## Légende

- ✅ **Terminé** — contrôlé techniquement, pas de validation visuelle restante pour le lot.
- 🔵 **En cours** — travail actif.
- 🟠 **À tester** — construit mais validation UX/fonctionnelle globale différée.
- ⬜ **À faire** — planifié.
- 🔴 **Bloqué** — dépendance réelle empêchant de continuer.
- 🟣 **Décision humaine** — validation/arbitrage explicitement réservé à l'utilisateur.

## Checkpoints RETEX / amélioration continue

Le fichier machine [`RETEX-AUTONOMIE.md`](./RETEX-AUTONOMIE.md) capitalise les enseignements réutilisables.

- [x] **RETEX 01 — après construction autonome des Lots 0 à 8 et premier incident Preview** : capitaliser Git, publication, validation réelle et erreurs à ne pas répéter.
- [ ] **RETEX 02 — avant passage Atelier → Web** : vérifier les enseignements de modélisation métier et de génération.
- [ ] **RETEX 03 — après premier site Recettes du Cœur fonctionnel** : capitaliser UX, responsive, Theme Workshop et data-driven.
- [ ] **RETEX 04 — après publication Preview du crash-test** : capitaliser publication, cache, assets, liens et contrôle utilisateur réel.
- [ ] **RETEX 05 — avant stabilisation V2** : synthèse finale, règles à conserver et dette à reporter.

Règle : un checkpoint RETEX doit transformer les incidents et réussites en **règles opérationnelles réutilisables**, pas seulement en historique narratif.

---

# LOT 0 — Gouvernance — 100 % ✅

- [x] branche `New` propre ;
- [x] historique commit par commit ;
- [x] `foundation/` segmenté ;
- [x] `DECISIONS.md` ;
- [x] roadmap avec pourcentages/statuts ;
- [x] séparation framework / métier / public / privé.

# LOT 1 — Fondation data — 100 % ✅

- [x] DataProvider / DataSource / DataAdapter ;
- [x] DataRegistry / DataSchema / DataRelation ;
- [x] JsonDataProvider ;
- [x] DataIndex factorisé ;
- [x] DataResolver `one` / `many` sans mutation des IDs ;
- [x] DataValidator : IDs, doublons, required, cardinalités, références ;
- [x] provider/adapter registry ;
- [x] tests de fondation.

# LOT 2 — Core runtime — 100 % ✅

- [x] StateStore ;
- [x] EventBus ;
- [x] FrameworkRegistry ;
- [x] URLResolver ;
- [x] BrowserStorage ;
- [x] Environment `production|preview|development` ;
- [x] Experience `visitor|webmaster` UX uniquement.

# LOT 3 — Primitives UI — 100 % 🟠 À tester

- [x] Container / stack / row / grid ;
- [x] Header / Footer / Hero / Section / Sidebar ;
- [x] tokens de dimensions/espacements/densité ;
- [x] FloatingPanel : move, resize, lock, minimize, dock, clamp, persistence adapter ;
- [x] Toolbar : actions, priorité, favoris, visibilité, overflow, reorder model ;
- [x] Foldable : open/close/all/reset/ancres/persistance ;
- [x] Pagination : tailles/pages/first/prev/next/last ;
- [x] tests modèles UI.

🟠 Validation : ergonomie réelle sur la page catalogue puis Recettes du Cœur.

# LOT 4 — Theme Workshop / Présentation — 100 % 🟠 À tester

## ThemeWiz
- [x] cascade `base → site → variante → section → composant → utilisateur` ;
- [x] tokens CSS ;
- [x] light/dark/presets compatibles ;
- [x] variantes ;
- [x] import/export JSON ;
- [x] persistance.

## Theme Workshop Webmaster
- [x] mode `Déverrouiller` ;
- [x] poignées sur `data-theme-editable` ;
- [x] redimensionnement live ;
- [x] lock individuel / lock all ;
- [x] color pickers ;
- [x] patchs par composant ;
- [x] export/import du workshop + thème ;
- [x] commit du patch vers le thème site ;
- [x] reset session.

## Personnalisation visiteur
- [x] options autorisées par le Webmaster ;
- [x] sous-thème local ;
- [x] accent/densité/scheme ;
- [x] reset vers défaut canonique.

## Présentation
- [x] Icon Registry SVG `currentColor` ;
- [x] HelpWiz ;
- [x] NavigationWiz H1/H2/H3, arbre, scrollspy, ancres.

🟣 Décision différée : thèmes/variantes à retenir après le crash-test.

# LOT 5 — Data UX — 100 % 🟠 À tester

- [x] ResultSet indépendant du rendu ;
- [x] SearchWiz texte/champs/exact/regex/score ;
- [x] FilterWiz ET/OU, arrays, ranges, dates, regex ;
- [x] PresentationResolver ID/label/image/icon ;
- [x] RendererWiz : cards, compact-cards, list, links, gallery, tiles, filmstrip, table ;
- [x] renderer conseillé par breakpoint ;
- [x] TableWiz : colonnes, visibilité, ordre, largeur, sticky, recherche, filtre, tri, pagination, images, CSV/JSON ;
- [x] JSON Studio : raw/tree/form/table/preview, arrays, diff, import/export, validation/resolver/save adapters ;
- [x] DataWiz : descriptif, groupBy, histogrammes simples ;
- [x] tests des moteurs data.

Priorité conservée : recherche + cartes/listes/pellicules/tableaux avant les graphiques avancés.

# LOT 6 — Media / QR / Share / Document — 100 % 🟠 À tester

- [x] MediaWiz image/SVG/audio/vidéo/PDF/gallery/filmstrip ;
- [x] QRWiz URL courante/canonique, taille, marge, niveau correction, couleurs, transparence, logo, format ;
- [x] contrat d'encodeur QR injecté ;
- [x] ShareWiz copy/email/Web Share/print/QR ;
- [x] DocumentWiz data-driven, profils, champs, labels, logo, HTML print, QR ;
- [x] tests avec encodeur QR de test.

# LOT 7 — Web / Observabilité — 100 % 🟠 À tester

- [x] SEOWiz structuré : title, description, canonical, language, robots, image, JSON-LD, breadcrumbs ;
- [x] OpenGraph/social générés depuis la même source ;
- [x] AnalyticsWiz provider-neutral ;
- [x] pageView/event/search/filter/download/share/print ;
- [x] Memory provider ;
- [x] adapter GA4 ;
- [x] ConsentAdapter ;
- [x] RuntimeMonitor : temps, compteurs, erreurs, snapshots ;
- [x] tests.

# LOT 8 — Catalogue / Datasets / Itérations — 100 % 🟠 À tester

## Datasets
- [x] `simple.json` ;
- [x] `errors.json` ;
- [x] `references.json` ;
- [x] `images.json` ;
- [x] `discrete.json` ;
- [x] `continuous.json` ;
- [x] `mixed.json` ;
- [x] SVG de démonstration légers.

## Catalogue HTML
- [x] page unique `demo/index.html` ;
- [x] Header/Hero/Sections ;
- [x] NavigationWiz ;
- [x] Theme Workshop + color picker + handles + locks ;
- [x] breakpoint simulé 360/480/768/1024/1280 ;
- [x] renderer automatique par largeur ;
- [x] recherche / filtre / choix de renderer ;
- [x] cartes/listes/pellicule/galerie/table ;
- [x] TableWiz ;
- [x] JSON Studio ;
- [x] DataWiz ;
- [x] FloatingPanel + HelpWiz ;
- [x] QR réel via adapter de playground ;
- [x] DocumentWiz ;
- [x] configuration active et JSON de thème visibles.

## Cycles internes
- [x] itération A : primitives structurées avant Theme Workshop ;
- [x] itération B : Theme Workshop composé avec les primitives ;
- [x] itération C : renderers séparés de Search/Filter ;
- [x] itération D : composition dans une page unique de démonstration.
- [x] RETEX 01 après premier essai de publication Preview.

🟠 Validation visuelle finale regroupée au Lot 12.

---

# LOT 8B — Consolidation UX transverse / Atelier Webmaster — 25 % 🔵

Objectif : figer maintenant les primitives qui seront réutilisées dans toutes les pages, afin d'éviter leur duplication dans le framework et dans les sites consommateurs.

## 8B.1 Identification / Info / InspectorPanel — 35 % 🔵
- [x] IDs humains stables sur les sections actuelles du catalogue ;
- [x] IDs techniques stables associés ;
- [x] bouton global pour afficher/masquer les informations de développement ;
- [x] boutons Info/Test injectés sur les sections actuelles ;
- [x] InspectorPanel basé sur FloatingPanel pour afficher aide et métadonnées ;
- [ ] généraliser aux sous-sections et composants testables ;
- [ ] onglets Test / Technique / Dépendances / État / Configuration ;
- [ ] inventaire des fichiers JS/CSS/JSON/providers actifs par module.

## 8B.2 CodeBlock standard — 70 % 🔵
- [x] composant générique `CodeBlock` ;
- [x] thème local clair/sombre ;
- [x] mode brut/colorisé JSON ;
- [x] copier dans le presse-papiers avec feedback ;
- [x] télécharger en fichier texte/JSON ;
- [x] utilisation dans le catalogue pour exporter la configuration machine ;
- [ ] prise en charge syntaxique additionnelle HTML/CSS/JS/CSV ;
- [ ] adoption progressive dans tous les écrans qui affichent du code/configuration.

## 8B.3 FloatingPanel / handles / états — 35 % 🔵
- [x] pin/unpin fonctionnel et persistant ;
- [x] pin empêche le déplacement tout en laissant le resize disponible ;
- [x] fermeture séparée ;
- [ ] SVG sémantiques pin/close/lock/resize ;
- [ ] lock/unlock séparé du handle ;
- [ ] poignée resize commune FloatingPanel/Header/Hero/composants éditables ;
- [ ] taille de poignée configurable ;
- [ ] états visuels default/hover/active/inactive/locked/unlocked.

## 8B.4 QR Studio / presets — 35 % 🔵
- [x] génération JavaScript live ;
- [x] Standard / Transparent / Fond coloré / Avec logo / Monochrome / Personnalisé ;
- [x] labels explicites pour couleur QR et couleur arrière-plan ;
- [x] niveaux de correction L/M/Q/H explicités ;
- [x] feedback visuel sur Régénérer ;
- [x] fond de la démo permettant de contrôler visuellement la transparence ;
- [ ] vue pellicule compacte ;
- [ ] édition d'un preset sélectionné ;
- [ ] validation/figeage d'un preset ;
- [ ] sauvegarde locale des presets ;
- [ ] import/export JSON des presets ;
- [ ] bouton copier via CodeBlock ;
- [ ] statut visuel du preset actif/validé.

## 8B.5 Preset Manager générique — 0 % ⬜
- [ ] créer/dupliquer/renommer/supprimer ;
- [ ] modifier puis valider ;
- [ ] reset canonique ;
- [ ] sauvegarde `localStorage` ;
- [ ] import/export JSON ;
- [ ] utiliser le même moteur pour QR, thèmes, densité, backgrounds, Header, Hero, Table et renderers.

## 8B.6 Theme Workshop V2 — 0 % ⬜
- [ ] BackgroundWiz : transparent, couleur unie, gradient, image ;
- [ ] gradients 2/3/N couleurs avec stops ;
- [ ] orientation horizontale/verticale/diagonale + angle avancé ;
- [ ] portée Global / Type de composant / Instance ;
- [ ] TypographyWiz ;
- [ ] densité Compact/Normal/Confortable éditable + presets personnalisés ;
- [ ] Undo/Redo + Reset commun ;
- [ ] styles de liens normal/hover/focus/visited/active/disabled ;
- [ ] liens internes/externes/ancres/médias et surfaces cliquables.

## 8B.7 Navigation de développement — 0 % ⬜
- [ ] hiérarchie pliable ;
- [ ] Tout plier ;
- [ ] Tout déplier ;
- [ ] État par défaut H1/H2 ;
- [ ] bouton Actualiser avec feedback ;
- [ ] affichage optionnel des IDs ;
- [ ] toggle Web public / Webmaster.

## 8B.8 JSON Studio / Data UX V2 — 0 % ⬜
- [ ] Tree réellement pliable/dépliable ;
- [ ] expand/collapse all ;
- [ ] Form réellement éditable selon schéma ;
- [ ] Raw seul / Raw + vue colorisée ;
- [ ] clair/sombre local ;
- [ ] Diff expliqué original vs modifié ;
- [ ] DataWiz explicite source/variable/mesure/résultat ;
- [ ] Filmstrip avec contrôleurs interchangeables.

## 8B.9 Media / Link / Asset — 0 % ⬜
- [ ] LinkWiz : ancre, section, page interne, externe, média, action ;
- [ ] ouverture même contexte / nouvel onglet / viewer / téléchargement ;
- [ ] image/vignette/carte/surface cliquable sans liens HTML imbriqués ;
- [ ] MediaWiz : inline, vignette, galerie, viewer, lien, téléchargement ;
- [ ] PDF : page initiale configurable, viewer ou nouvel onglet, fallback icône ;
- [ ] Asset/Logo Workshop : transparent, fond, monochrome recolorable, favicon ;
- [ ] aperçu clair/sombre et fond carré/arrondi.

Critère de sortie du Lot 8B : chaque grande abstraction transverse doit être prouvée au moins une fois et réutilisable sans réécriture dans Recettes du Cœur.

---

# LOT 8C — Diagnostic avancé / notifications / observabilité UI — 0 % ⬜

- [ ] InspectorPanel à onglets : Test / Technique / Dépendances / État / Configuration ;
- [ ] inventaire dynamique des boutons/contrôles visibles sur la page ;
- [ ] état `active|inactive|disabled|locked|pinned|hidden` ;
- [ ] snapshot JSON de diagnostic copiable/téléchargeable via CodeBlock ;
- [ ] ouverture/fermeture des FloatingPanels depuis des boutons, titres ou événements ;
- [ ] FloatingPanel spécialisé notification/toast/état ;
- [ ] historique des notifications ;
- [ ] actions de notification avec niveaux info/success/warning/error ;
- [ ] mini vue globale/Live Preview de la page pendant l'édition Header/Hero/Sections ;
- [ ] inspecteur de cascade de thème et configuration héritée ;
- [ ] contrôle contraste/accessibilité live de base.

---

# LOT 9 — Webmaster privé : atelier Recettes du Cœur — 0 % 🔵 En cours

Cible : `nepheris/NLab-Webmaster/Sites/Recettes-du-Coeur/atelier/`.

## 9.1 Audit/import
- [ ] inventorier recettes, astuces, ingrédients ;
- [ ] inventorier allergènes, saisonnalité, catégories, tags, sources ;
- [ ] inventorier médias, logos, mascotte et images publiques réutilisables ;
- [ ] identifier les anciennes structures utiles sans recopier les moteurs obsolètes.

## 9.2 Modèle métier canonique
- [ ] `data/registry.json` ;
- [ ] collections JSON séparées ;
- [ ] IDs canoniques ;
- [ ] relations déclaratives ;
- [ ] aucune répétition de libellé lorsqu'un ID suffit ;
- [ ] sources/médias liés par IDs ;
- [ ] schémas de collections.

🟣 Décision humaine uniquement si un mapping métier est réellement ambigu et impossible à déduire.

## 9.3 Structure atelier
- [ ] `data/` ;
- [ ] `schemas/` ;
- [ ] `media/` ;
- [ ] `documents/` ;
- [ ] `imports/` ;
- [ ] `exports/` ;
- [ ] `config/` ;
- [ ] `tools/` ;
- [ ] validation avant génération ;
- [ ] génération atelier → web ;
- [ ] diagnostics IDs/relations/assets/liens.

## 9.4 Racine publiable obligatoire

```text
Sites/Recettes-du-Coeur/web/
```

- [ ] `source_root` privé peut pointer vers ce chemin ;
- [ ] dans l'artefact, `web/` est traité comme `/` ;
- [ ] aucune URL publique ne contient le chemin interne Webmaster ;
- [ ] assets/data/liens restent relatifs ;
- [ ] Preview reçoit le **contenu** de `web/` à sa racine ;
- [ ] production suit le même contrat.

- [ ] **RETEX 02 avant passage Atelier → Web**.

---

# LOT 10 — Webmaster : web Recettes du Cœur — 0 % ⬜

## Identité et pages
- [ ] reprendre logo/mascotte/images publiques pertinentes ;
- [ ] thème Recettes du Cœur basé sur ThemeWiz ;
- [ ] accueil ;
- [ ] recettes + fiche ;
- [ ] astuces + fiche ;
- [ ] ingrédients si données suffisantes ;
- [ ] recherche ;
- [ ] contact/informations sans secret en dur.

## Crash-test du framework
- [ ] Header/Footer/Hero/Sections ;
- [ ] Navigation/Help/Theme ;
- [ ] Theme Workshop en expérience Webmaster ;
- [ ] Search/Filter/Renderer/Pagination ;
- [ ] cards/list/filmstrip adaptatifs ;
- [ ] TableWiz ;
- [ ] QR/Share/Document ;
- [ ] SEO ;
- [ ] Analytics configurable/désactivable ;
- [ ] personnalisation visiteur locale dans le cadre Webmaster.

## Responsive
- [ ] téléphone petit ;
- [ ] téléphone ;
- [ ] tablette ;
- [ ] desktop ;
- [ ] large ;
- [ ] renderer par défaut adapté au breakpoint.

- [ ] **RETEX 03 après premier site Recettes du Cœur fonctionnel**.

🟣 Décision différée : thème public et variantes finales.

---

# LOT 11 — Preview public — 0 % ⬜

Cible : `nepheris/NLab-Webmaster-Preview-`.

- [ ] refetch/reset Preview ;
- [ ] publier seulement le contenu autonome de `web/` ;
- [ ] aucun `atelier/` ;
- [ ] aucun secret/donnée privée ;
- [ ] vérifier chemins relatifs ;
- [ ] assets/images/logo ;
- [ ] JSON et relations ;
- [ ] recherche/filtres/rendus/table ;
- [ ] thème/preferences ;
- [ ] QR/share/document ;
- [ ] responsive ;
- [ ] console JS ;
- [ ] Pages build artifact contrôlé ;
- [ ] deployment GitHub Pages contrôlé ;
- [ ] contenu public réellement servi contrôlé séparément du statut workflow ;
- [ ] `PREVIEW_BUILD.json` permet d'identifier la version servie ;
- [ ] **RETEX 04 après publication Preview**.

État attendu après déploiement : 🟠 **À tester**.

---

# LOT 12 — Validation humaine finale — 0 % 🟣

- [ ] 🟣 revue visuelle catalogue/framework ;
- [ ] 🟣 Theme Workshop : poignées, locks, color pickers, export/import ;
- [ ] 🟣 choix thème/variantes Recettes du Cœur ;
- [ ] 🟣 responsive et renderers automatiques ;
- [ ] 🟣 revue du Preview public ;
- [ ] audit factorisation / source unique de vérité ;
- [ ] audit framework/métier et public/privé ;
- [ ] audit UX/accessibilité/performance/SEO/docs ;
- [ ] corrections finales ;
- [ ] **RETEX 05 avant stabilisation V2** ;
- [ ] 🟣 décision : stabiliser V2 ou lancer un cycle suivant.

---

# Différé après le premier crash-test — explicitement tracé

## Données / identité / accès
- [ ] IdentityWiz / OAuth ;
- [ ] ExternalDataWiz Drive/OneDrive/GitHub privé ;
- [ ] AccessGate serveur/edge ;
- [ ] provider SQLite ;
- [ ] persistance serveur/backoffice des presets et configurations.

## Documents / médias
- [ ] génération avancée de miniatures PDF multi-pages ;
- [ ] annotation PDF ;
- [ ] vectorisation automatique avancée des bitmaps complexes ;
- [ ] traitements audio/vidéo avancés.

## UI / rendu
- [ ] packs d'icônes alternatifs complets ;
- [ ] animations complexes entre thèmes/renderers ;
- [ ] statistiques/graphiques avancés ;
- [ ] fuzzy search avancée.

Aucun élément différé ne doit rester seulement dans `BACKLOG-UX.md` ou dans la conversation : la roadmap reste la source de visibilité macro, le backlog sert au détail opérationnel.

# Règle d'exécution autonome

Pour les Lots 8B à 11 : refetch → implémentation → contrôles → itération → checkpoint RETEX lorsque prévu → roadmap → commit → poursuite automatique. Les vraies décisions humaines sont marquées 🟣 et regroupées au Lot 12 autant que possible.
