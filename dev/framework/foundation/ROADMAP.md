# Roadmap — Framework V2 + crash-test Recettes du Cœur

> Branche de construction : `New`  
> Progression = lots construits techniquement ; les lots visuels restent `🟠 À tester` jusqu'au crash-test humain.

# AVANCEMENT GLOBAL — 69 % — 🔵 EN COURS

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

🟠 Validation visuelle finale regroupée au Lot 12.

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
- [ ] Pages deployment.

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
- [ ] 🟣 décision : stabiliser V2 ou lancer un cycle suivant.

---

# Différé après le premier crash-test

IdentityWiz, ExternalDataWiz Drive/OneDrive/GitHub privé, AccessGate serveur/edge, SQLite, statistiques avancées, fuzzy search avancée et traitements média complexes.

# Règle d'exécution autonome

Pour les Lots 9 à 11 : refetch → implémentation → contrôles → itération → roadmap → commit → poursuite automatique. Les vraies décisions humaines sont marquées 🟣 et regroupées au Lot 12 autant que possible.
