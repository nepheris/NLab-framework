# Roadmap — Framework V2 + crash-test Recettes du Cœur

> Branche de construction : `New`
>
> Méthode de suivi : progression par lots et sous-lots, avec statuts visuels et validation finale différée.

# AVANCEMENT GLOBAL — 23 % — 🔵 EN COURS

Progression actuelle : lots 0, 1 et 2 terminés techniquement. Les lots visuels passent en 🟠 **À tester** tant qu'ils n'ont pas été validés dans le crash-test final.

## Tableau de bord

| Lot | Objet | Avancement | État |
|---|---|---:|---|
| 0 | Gouvernance, conventions et roadmap | 100 % | ✅ Terminé |
| 1 | Fondation data | 100 % | ✅ Terminé |
| 2 | Core runtime transversal | 100 % | ✅ Terminé |
| 3 | Primitives UI | 0 % | ⬜ À faire |
| 4 | Theme Workshop, présentation, icônes, aide, navigation | 0 % | ⬜ À faire |
| 5 | Data UX : TableWiz, Search, Filter, Renderer, JSON Studio | 0 % | ⬜ À faire |
| 6 | Média, document, QR, partage | 0 % | ⬜ À faire |
| 7 | Web : SEO, analytics, performance, monitoring | 0 % | ⬜ À faire |
| 8 | Catalogue, jeux de données, page de démo, tests et itérations | 0 % | ⬜ À faire |
| 9 | Webmaster privé — atelier Recettes du Cœur | 0 % | ⬜ À faire |
| 10 | Webmaster — web Recettes du Cœur | 0 % | ⬜ À faire |
| 11 | Preview public — crash-test intégral | 0 % | ⬜ À faire |
| 12 | Validation humaine finale et corrections | 0 % | 🟣 Décision humaine |

## Légende

- ✅ **Terminé** — implémenté et contrôlé techniquement.
- 🔵 **En cours** — travail actif.
- 🟠 **À tester** — implémenté mais validation UX/fonctionnelle différée.
- ⬜ **À faire** — planifié, non commencé.
- 🔴 **Bloqué** — dépendance externe ou décision indispensable avant de continuer.
- 🟣 **Décision humaine** — point explicitement réservé à une validation/arbitrage utilisateur.

La couleur n'est jamais le seul indicateur : le texte du statut est toujours présent.

---

# LOT 0 — Gouvernance — 100 % ✅ Terminé

- ✅ 100 % — Branche `New` propre et historique lisible.
- ✅ 100 % — Documentation `foundation/` segmentée.
- ✅ 100 % — `DECISIONS.md` + `ROADMAP.md`.
- ✅ 100 % — séparation framework / métier.
- ✅ 100 % — JSON canonique métier.

---

# LOT 1 — Fondation data — 100 % ✅ Terminé

## 1.1 Contrats — 100 % ✅
- [x] DataProvider.
- [x] DataSource.
- [x] DataAdapter.
- [x] DataRegistry / DataSchema / DataRelation.
- [x] requiredFields.

## 1.2 Accès, index, résolution — 100 % ✅
- [x] JsonDataProvider read-only.
- [x] cache provider.
- [x] DataIndex factorisé.
- [x] DataResolver.
- [x] relations `one` / `many`.
- [x] valeurs canoniques non mutées.

## 1.3 Validation — 100 % ✅
- [x] DataValidator.
- [x] IDs, doublons, champs requis, cardinalités, références.
- [x] rapport errors / warnings / issues.

## 1.4 Runtime data — 100 % ✅
- [x] registry providers/adapters.
- [x] tests de fondation.

---

# LOT 2 — Core runtime transversal — 100 % ✅ Terminé

## 2.1 State — 100 % ✅
- [x] StateStore.
- [x] get/set/update/reset.
- [x] subscriptions.
- [x] persistance optionnelle.
- [x] défaut projet + surcharge utilisateur locale.

## 2.2 Events — 100 % ✅
- [x] EventBus `on/off/once/emit`.
- [x] erreurs listener isolées.

## 2.3 Registry global — 100 % ✅
- [x] services/components/wiz/providers/adapters/renderers/icons/themes/help.

## 2.4 URL / Storage / Environment — 100 % ✅
- [x] URLResolver.
- [x] BrowserStorage.
- [x] `production|preview|development`.
- [x] `visitor|webmaster` comme expérience UX uniquement.

---

# LOT 3 — Primitives UI — 0 % ⬜ À faire

## 3.1 Layout — 0 % ⬜
- [ ] Container / stack / grid.
- [ ] Header / Footer / Hero / Section / Sidebar.
- [ ] tailles, min/max, paddings, gaps et densité pilotables par tokens/config.
- [ ] responsive commun.

## 3.2 FloatingPanel — 0 % ⬜
- [ ] déplacer / resize 8 directions.
- [ ] lock/unlock.
- [ ] minimize/restore/close/pin.
- [ ] dock/undock/fullscreen.
- [ ] clamp viewport.
- [ ] persistance taille/position.

## 3.3 Toolbar — 0 % ⬜
- [ ] actions/groupes/sous-menus.
- [ ] favoris/priorité/overflow `…`.
- [ ] profils.
- [ ] configuration drag/drop en expérience Webmaster.

## 3.4 Foldable — 0 % ⬜
- [ ] open/closed/default.
- [ ] ouvrir tout / fermer tout / reset.
- [ ] ancres + persistance.

## 3.5 Pagination — 0 % ⬜
- [ ] page/taille.
- [ ] first/prev/next/last.
- [ ] variantes compactes et responsive.

Critère : les Wiz complexes ne recréent aucune mécanique UI de base.

---

# LOT 4 — Theme Workshop / Présentation — 0 % ⬜ À faire

## 4.1 ThemeWiz — 0 % ⬜
- [ ] tokens couleurs, typo, radius, shadow, spacing, density, icons.
- [ ] light/dark + presets.
- [ ] color picker live.
- [ ] cascade global → site → section → composant.
- [ ] variantes de thèmes par page/section.
- [ ] import/export JSON.
- [ ] reset au thème canonique.

## 4.2 Theme Workshop Webmaster — 0 % ⬜
- [ ] bouton `Déverrouiller la mise en page`.
- [ ] poignées visibles sur composants modifiables.
- [ ] ajuster hauteur Header/Hero/Section et dimensions autorisées.
- [ ] ajuster marges/paddings/gaps dans les limites du composant.
- [ ] verrouillage individuel d'un composant.
- [ ] `Verrouiller tout`.
- [ ] aperçu immédiat desktop/tablette/mobile.
- [ ] historique/reset des modifications de session.
- [ ] sérialisation complète dans un JSON de thème.
- [ ] charger un JSON de thème et l'appliquer au site.
- [ ] créer/dupliquer/renommer une variante.

🟣 **Décision humaine différée** — choix du ou des thèmes/variantes à retenir comme défauts après crash-test.

## 4.3 Personnalisation visiteur — 0 % ⬜
- [ ] options autorisées définies par le Webmaster.
- [ ] sous-thème utilisateur local, sans modifier le thème canonique.
- [ ] préférences locales de densité/rendu/navigation.
- [ ] reset vers défaut public.
- [ ] possibilité future d'export/import du profil utilisateur.

## 4.4 Icon Registry — 0 % ⬜
- [ ] packs SVG génériques.
- [ ] `currentColor` quand possible.
- [ ] fallback framework + override projet.

## 4.5 HelpWiz — 0 % ⬜
- [ ] help_id, court/long, tooltip/inline/FloatingPanel.
- [ ] technique en expérience Webmaster/dev.

## 4.6 NavigationWiz — 0 % ⬜
- [ ] arbre/sidebar/scrollspy.
- [ ] H1/H2/H3.
- [ ] branches repliables.
- [ ] restauration d'ancre.
- [ ] conventions multilingues.

---

# LOT 5 — Data UX, cœur data-driven — 0 % ⬜ À faire

Principe : **une même source de données → plusieurs visualisations**, sans dupliquer les données.

## 5.1 ResultSet + Renderer contract — 0 % ⬜
- [ ] pipeline Input → Search → Filters → ResultSet → Renderer → Pagination.
- [ ] aucune logique de rendu dans Search/Filter.
- [ ] sélection de renderer indépendante des données.

## 5.2 DataResolver de présentation — 0 % ⬜
- [ ] id / label / id+label.
- [ ] icon / image / image+label.
- [ ] arrays + metadata.

## 5.3 RendererWiz — 0 % ⬜
- [ ] cards.
- [ ] compact cards.
- [ ] list.
- [ ] links.
- [ ] gallery.
- [ ] tiles.
- [ ] filmstrip/pellicule.
- [ ] table.
- [ ] renderer par défaut configurable selon breakpoint.
- [ ] l'utilisateur peut changer de vue si le Webmaster l'autorise.

## 5.4 SearchWiz — 0 % ⬜
- [ ] global / champs ciblés / exact / regex / avancé.
- [ ] score de correspondance.
- [ ] nettoyage tokens.
- [ ] résultats séparés du rendu.

## 5.5 FilterWiz — 0 % ⬜
- [ ] select/checkbox/radio/buttons/chips/cards/images.
- [ ] ranges/sliders/dates.
- [ ] ET/OU.

## 5.6 TableWiz — 0 % ⬜
- [ ] colonnes show/hide/reorder/resize.
- [ ] sticky header + colonnes individuelles.
- [ ] recherche globale et par colonne.
- [ ] regex/filtres/sort/pagination.
- [ ] densité/wrap/zebra/zoom.
- [ ] vue complète / synthétique / profils de colonnes.
- [ ] id/label/icon/image.
- [ ] formats conditionnels discrets/continus.
- [ ] export CSV/JSON.
- [ ] graphiques simples disponibles mais non prioritaires.

## 5.7 JSON Studio — 0 % ⬜
- [ ] Raw / Tree / Form / Table / Preview / Validation.
- [ ] fichier / sous-section / record.
- [ ] arrays ordonnés.
- [ ] références résolues.
- [ ] images.
- [ ] import/export/diff.
- [ ] save adapter conditionnel.

## 5.8 DataWiz — 0 % ⬜
- [ ] stats de base.
- [ ] tableaux synthétiques.
- [ ] graphiques simples seulement après les rendus data principaux.

---

# LOT 6 — Média / Document / QR / Share — 0 % ⬜ À faire

- [ ] MediaWiz : image/SVG/preview/gallery/filmstrip/zoom.
- [ ] QRWiz : URLResolver, couleurs, thème, logo, SVG/PNG si possible.
- [ ] ShareWiz : URL, QR, print, PDF, email, Web Share.
- [ ] DocumentWiz : profils data-driven, champs, layout, logo, QR, thème, état UI.

---

# LOT 7 — Web / SEO / Analytics / Observabilité — 0 % ⬜ À faire

## 7.1 SEOWiz — 0 % ⬜
- [ ] title/description/canonical/language/robots/share image.
- [ ] JSON-LD/breadcrumbs/dates/author/source.
- [ ] meta/OG/social depuis un modèle structuré unique.

## 7.2 AnalyticsWiz — 0 % ⬜
- [ ] API provider-neutral.
- [ ] pageView/event/search/filter/download/share/print.
- [ ] adapter GA4.
- [ ] emplacement Matomo/Plausible.
- [ ] consent adapter.

## 7.3 Performance/Monitoring — 0 % ⬜
- [ ] temps d'initialisation.
- [ ] compteurs provider/data.
- [ ] erreurs runtime.
- [ ] diagnostics/hook observabilité.

---

# LOT 8 — Catalogue, démos, datasets, tests et itérations — 0 % ⬜ À faire

## 8.1 Jeux de données de test — 0 % ⬜
- [ ] `simple.json`.
- [ ] `errors.json`.
- [ ] `references.json`.
- [ ] `images.json`.
- [ ] `discrete.json`.
- [ ] `continuous.json`.
- [ ] `mixed.json`.
- [ ] petit dataset réaliste dérivé des données publiques Recettes du Cœur quand utile.
- [ ] datasets volontairement courts pour rester rapides et lisibles.

## 8.2 Page HTML de démonstration exhaustive — 0 % ⬜
- [ ] une page de développement présentant toutes les familles du framework.
- [ ] Layout/Header/Hero/Sections/Sidebar.
- [ ] FloatingPanel et Toolbar.
- [ ] Theme Workshop + color picker + handles + locks.
- [ ] Search/Filter/Renderer/Pagination.
- [ ] cards/list/filmstrip/table/gallery.
- [ ] TableWiz complet.
- [ ] JSON Studio.
- [ ] Help/Navigation/Icons.
- [ ] Media/QR/Share/Document.
- [ ] paramètres et JSON de configuration visibles.
- [ ] possibilité de changer le breakpoint simulé.

## 8.3 Responsive adaptatif — 0 % ⬜
- [ ] tests petit téléphone / téléphone / tablette / desktop / large.
- [ ] règles de renderer par breakpoint.
- [ ] exemple : filmstrip/card desktop → list/compact mobile si plus pertinent.
- [ ] aucune perte de fonctionnalité essentielle.

## 8.4 Cycles d'itération — 0 % ⬜
- [ ] itération A après primitives UI.
- [ ] itération B après Theme Workshop.
- [ ] itération C après Data UX.
- [ ] itération D après page de démo complète.
- [ ] corriger factorisation/UX avant passage au Webmaster.

## 8.5 Tests — 0 % ⬜
- [ ] core/data/runtime.
- [ ] primitives UI.
- [ ] data UX.
- [ ] URL/env.
- [ ] responsive smoke tests.
- [ ] catalogue smoke test.
- [ ] checklist non-régression.

---

# LOT 9 — Webmaster privé : atelier Recettes du Cœur — 0 % ⬜ À faire

Cible : `nepheris/NLab-Webmaster/Sites/Recettes-du-Coeur/atelier/`.

## 9.1 Audit/import — 0 % ⬜
- [ ] recettes/astuces/ingrédients/référentiels.
- [ ] catégories/tags/sources/saisonnalité/allergènes.
- [ ] médias/logos/mascotte/images réutilisables.
- [ ] reprise des meilleures structures précédentes sans recopier les moteurs obsolètes.

## 9.2 Modèle métier — 0 % ⬜
- [ ] collections JSON séparées.
- [ ] IDs canoniques et relations déclarées.
- [ ] pas de répétition du libellé quand une référence suffit.
- [ ] sources/media/documentation liés par ID.
- [ ] schémas et validation.

🟣 **Décision humaine seulement si nécessaire** — arbitrage d'un mapping métier réellement ambigu impossible à déduire de l'existant. Sinon le travail continue automatiquement.

## 9.3 Atelier — 0 % ⬜
- [ ] `data/`, `schemas/`, `media/`, `documents/`, `imports/`, `exports/`, `config/`, `tools/`.
- [ ] validation avant génération.
- [ ] génération `atelier → web`.
- [ ] diagnostics relations/assets/liens.

## 9.4 Racine publiable — règle obligatoire — 0 % ⬜

Le dossier suivant est la **racine publiable logique du site dans Webmaster** :

```text
Sites/Recettes-du-Coeur/web/
```

Règles :
- [ ] la configuration privée peut déclarer `source_root: "Sites/Recettes-du-Coeur/web"`.
- [ ] pour le site généré, le contenu de `web/` est traité comme `/`.
- [ ] aucune URL publique ne contient `Sites/Recettes-du-Coeur/web/`.
- [ ] assets/data/liens dans `web/` sont relatifs à cette racine.
- [ ] Preview reçoit **le contenu de `web/` à sa propre racine**, pas le dossier parent.
- [ ] même règle pour une publication de production.

Cette règle permet au même `web/` autonome de fonctionner dans Webmaster, Preview et production sans recoder les URLs.

---

# LOT 10 — Webmaster : web Recettes du Cœur — 0 % ⬜ À faire

## 10.1 Identité — 0 % ⬜
- [ ] conserver l'esprit du site.
- [ ] réutiliser logo/mascotte/images pertinentes.
- [ ] thème projet au-dessus du framework.
- [ ] responsive 4+ paliers.

## 10.2 Pages — 0 % ⬜
- [ ] accueil.
- [ ] recettes + fiche.
- [ ] astuces + fiche.
- [ ] ingrédients si données suffisantes.
- [ ] recherche.
- [ ] contact/informations sans secret en dur.

## 10.3 Crash-test des briques — 0 % ⬜
- [ ] Layout/Navigation/Help/Theme.
- [ ] Theme Workshop en expérience Webmaster.
- [ ] Search/Filter/Renderer/Pagination.
- [ ] cards/list/filmstrip adaptatifs.
- [ ] TableWiz sur une vue métier utile.
- [ ] QR/Share/Document.
- [ ] SEO structurel.
- [ ] Analytics configurable/désactivable.

## 10.4 Personnalisation publique — 0 % ⬜
- [ ] thème public par défaut.
- [ ] éventuelles variantes autorisées.
- [ ] sous-thème personnel local du visiteur.
- [ ] préférences de rendu enregistrées localement.
- [ ] cadre d'options imposé par le Webmaster.

🟣 **Décision humaine différée** — retenir le thème public final et les variantes après test global.

## 10.5 Itération site — 0 % ⬜
- [ ] passe UX desktop.
- [ ] passe UX mobile/tablette.
- [ ] passe data-driven/recherche.
- [ ] correction des écarts avant publication Preview.

---

# LOT 11 — Preview public : crash-test intégral — 0 % ⬜ À faire

Cible : `nepheris/NLab-Webmaster-Preview-`.

- [ ] reset/refetch Preview avant publication.
- [ ] publier uniquement le contenu autonome de `web/`.
- [ ] aucun `atelier/`.
- [ ] aucun secret/donnée privée.
- [ ] chemins relatifs valides.
- [ ] assets/images/logo.
- [ ] chargement JSON.
- [ ] relations/ID résolus.
- [ ] navigation/search/filter/pagination.
- [ ] cards/list/filmstrip/table.
- [ ] Theme Workshop désactivé pour visiteur mais préférences autorisées disponibles.
- [ ] QR/Share/Print/Document.
- [ ] responsive réel.
- [ ] console JS propre.
- [ ] déploiement Pages vérifié.

À la fin du lot, l'état devient **🟠 À tester** jusqu'à revue utilisateur.

---

# LOT 12 — Validation humaine finale — 0 % 🟣 Décision humaine

Cette phase concentre volontairement les validations humaines afin de laisser les lots précédents avancer sans interruptions inutiles.

- [ ] 🟣 revue visuelle du catalogue/framework.
- [ ] 🟣 revue Theme Workshop et ergonomie des poignées/locks/color picker.
- [ ] 🟣 choix du thème Recettes du Cœur et variantes à conserver.
- [ ] 🟣 revue responsive et rendus automatiques par breakpoint.
- [ ] 🟣 revue publique du crash-test Preview.
- [ ] audit factorisation / source unique de vérité.
- [ ] audit framework vs métier.
- [ ] audit public/privé.
- [ ] audit UX/accessibilité/performance/SEO/docs.
- [ ] corrections finales.
- [ ] 🟣 décision : V2 stabilisable ou nouveau cycle.

---

# Différé après le premier crash-test

- IdentityWiz Google/Microsoft/GitHub.
- ExternalDataWiz Drive/OneDrive/GitHub privé/API.
- AccessGate avec protection serveur/edge réelle.
- provider SQLite.
- statistiques avancées.
- fuzzy search avancée.
- médias audio/vidéo complexes.

---

# Règle d'exécution autonome

Pour les lots 3 à 11 :

1. refetch systématique de la branche/cible avant écriture ;
2. implémentation ;
3. tests techniques disponibles ;
4. itération/correction si le test révèle un problème ;
5. mise à jour de la roadmap ;
6. commit lisible ;
7. poursuite sans demander de validation intermédiaire tant qu'aucune vraie décision humaine bloquante n'est requise.

Les décisions humaines sont signalées par 🟣 et regroupées autant que possible dans le Lot 12.
