# Roadmap — Framework V2 + crash-test Recettes du Cœur

> Branche de construction : `New`
>
> Méthode de suivi : progression calculée par jalons cochés (pas par estimation d'effort).

## Légende

- ✅ **Terminé** — implémenté et contrôlé techniquement.
- 🔵 **En cours** — travail actif.
- 🟠 **À tester** — implémenté, validation fonctionnelle finale différée.
- ⬜ **À faire** — planifié, non commencé.
- 🔴 **Bloqué** — dépendance externe ou décision indispensable.

Les couleurs/emoji ne sont jamais le seul indicateur : chaque état est aussi écrit en toutes lettres.

## Tableau de bord

| Lot | Objet | Avancement | État |
|---|---|---:|---|
| 0 | Gouvernance, conventions et roadmap | 100 % | ✅ Terminé |
| 1 | Fondation data | 82 % | 🔵 En cours |
| 2 | Core runtime transversal | 0 % | ⬜ À faire |
| 3 | Primitives UI | 0 % | ⬜ À faire |
| 4 | Présentation, thème, icônes, aide, navigation | 0 % | ⬜ À faire |
| 5 | Data UX : JSON Studio, TableWiz, Search, Filter, Renderer | 0 % | ⬜ À faire |
| 6 | Média, document, QR, partage | 0 % | ⬜ À faire |
| 7 | Web : SEO, analytics, performance, monitoring | 0 % | ⬜ À faire |
| 8 | Catalogue, démos, tests et non-régression | 0 % | ⬜ À faire |
| 9 | Webmaster privé — atelier Recettes du Cœur | 0 % | ⬜ À faire |
| 10 | Webmaster — web Recettes du Cœur | 0 % | ⬜ À faire |
| 11 | Preview public — crash-test intégral | 0 % | ⬜ À faire |
| 12 | Validation finale et corrections | 0 % | ⬜ À faire |

**Avancement global actuel : 14 % — 🔵 En cours**

---

# LOT 0 — Gouvernance, conventions et roadmap — 100 % ✅

Objectif : disposer d'une branche propre, d'un historique lisible et d'une documentation de décision indépendante du code.

- [x] Branche `New` minimale et indépendante.
- [x] Conventions internes propres au framework autonome.
- [x] Séparation physique framework / données métier du projet consommateur.
- [x] JSON canonique pour les données métier structurées.
- [x] Documentation segmentée dans `foundation/`.
- [x] Journal `DECISIONS.md`.
- [x] Roadmap détaillée avec avancement et statuts.
- [x] Un commit cohérent par étape stable.

Critère de sortie : architecture de travail compréhensible sans relire l'historique de conversation.

---

# LOT 1 — Fondation data — 82 % 🔵

Objectif : abstraire complètement la donnée physique et fournir un modèle relationnel/documentaire léger utilisable par tous les Wiz.

## 1.1 Contrats
- [x] `DataProvider`.
- [x] `DataRegistry` — contrat initial.
- [x] `DataSchema` / collection schema — contrat initial.
- [x] `DataRelation` — `one` / `many`, targetField, politique missing.
- [x] `requiredFields` déclaratifs.

## 1.2 Accès et résolution
- [x] `JsonDataProvider` read-only.
- [x] Cache provider.
- [x] Dataset multi-collections de démonstration.
- [x] `DataResolver`.
- [x] Index paresseux.
- [x] Résolution `one`.
- [x] Résolution `many`.
- [x] Conservation des valeurs canoniques.

## 1.3 Validation
- [x] `DataValidator`.
- [x] Validation registry.
- [x] Validation collection/record.
- [x] Champs requis / IDs / doublons.
- [x] Cardinalités.
- [x] Intégrité référentielle.
- [x] Rapport errors / warnings / issues.

## 1.4 À finaliser dans le lot
- [ ] `DataSource` explicite.
- [ ] `DataAdapter` interface.
- [ ] `DataIndex` factorisé hors Resolver/Validator.
- [ ] Registry global des providers/adapters.
- [ ] Tests automatisés de fondation dans `tests/`.

Critère de sortie : toute UI peut demander des collections et relations sans connaître JSON/GitHub/Drive/API.

---

# LOT 2 — Core runtime transversal — 0 % ⬜

Objectif : découpler les composants et donner au framework un noyau commun minimal.

## 2.1 State
- [ ] Store global léger.
- [ ] `get/set/update/reset`.
- [ ] Namespaces de state.
- [ ] Subscription ciblée.
- [ ] Persistance optionnelle localStorage/sessionStorage.
- [ ] État par défaut vs personnalisation utilisateur.

## 2.2 Events
- [ ] EventBus `on/off/once/emit`.
- [ ] Noms d'événements structurés.
- [ ] Payload standard.
- [ ] Erreurs isolées par listener.

## 2.3 Registry global
- [ ] Services.
- [ ] Components.
- [ ] Wiz.
- [ ] Providers.
- [ ] Renderers.
- [ ] Icons.
- [ ] Themes.
- [ ] Help entries.

## 2.4 URL / Storage / Environment
- [ ] `URLResolver`.
- [ ] base URL et assets relatifs.
- [ ] `mode: production|preview|development`.
- [ ] `experience: visitor|webmaster` sans rôle d'authentification.
- [ ] abstraction storage navigateur.

Critère de sortie : aucun module fonctionnel n'a besoin d'importer directement un autre module métier pour communiquer.

---

# LOT 3 — Primitives UI — 0 % ⬜

Objectif : fournir les briques visuelles réutilisables avant les Wiz complexes.

## 3.1 Layout
- [ ] Container / stack / grid primitives.
- [ ] Header.
- [ ] Footer.
- [ ] Hero.
- [ ] Section.
- [ ] Sidebar.
- [ ] responsive commun.

## 3.2 FloatingPanel
- [ ] Déplacement.
- [ ] Resize 8 directions.
- [ ] Lock/unlock.
- [ ] Minimize/restore.
- [ ] Close.
- [ ] Pin.
- [ ] Dock/undock.
- [ ] Fullscreen.
- [ ] Clamp viewport.
- [ ] Persistance taille/position.

## 3.3 Toolbar
- [ ] actions génériques.
- [ ] groupes / sous-menus.
- [ ] priorité / favoris.
- [ ] overflow `…`.
- [ ] profils.
- [ ] drag/drop de configuration en mode Webmaster.

## 3.4 Foldable
- [ ] section ouverte/fermée/défaut.
- [ ] ouvrir tout / fermer tout / reset.
- [ ] persistance locale optionnelle.
- [ ] restauration via ancres.

## 3.5 Pagination
- [ ] page courante / taille page.
- [ ] prev/next/first/last.
- [ ] variantes compactes.
- [ ] responsive.

Critère de sortie : les futurs Wiz se composent uniquement avec ces primitives.

---

# LOT 4 — Présentation / Theme / Icons / Help / Navigation — 0 % ⬜

## 4.1 ThemeWiz
- [ ] tokens globaux.
- [ ] clair / sombre.
- [ ] presets.
- [ ] palette live.
- [ ] overrides site → section → composant.
- [ ] densité.
- [ ] import/export de thème.
- [ ] personnalisation locale.

## 4.2 Icon Registry
- [ ] packs actions/navigation/data/table/search/files/status/layout/help/output.
- [ ] SVG `currentColor` quand possible.
- [ ] fallback framework.
- [ ] override projet.
- [ ] `logo-full.svg` / `logo-mono.svg` conventions.

## 4.3 HelpWiz
- [ ] `help_id`.
- [ ] aide courte / longue.
- [ ] tooltip.
- [ ] inline.
- [ ] FloatingPanel.
- [ ] documentation technique en expérience Webmaster/dev.

## 4.4 NavigationWiz
- [ ] arbre hiérarchique.
- [ ] sidebar.
- [ ] scrollspy.
- [ ] H1/H2/H3 long document.
- [ ] branches repliables.
- [ ] restauration d'ancre.
- [ ] conventions multilingues.

Critère de sortie : une page complète peut être thémée, naviguée et documentée sans CSS/JS spécifique au métier.

---

# LOT 5 — Data UX — 0 % ⬜

## 5.1 DataResolver de présentation
- [ ] modes id / label / id+label.
- [ ] icon / image / image+label.
- [ ] metadata arbitrary.
- [ ] résolution arrays.

## 5.2 TableWiz
- [ ] colonnes visibles/cachées.
- [ ] reorder / resize.
- [ ] sticky header.
- [ ] sticky colonnes individuelles.
- [ ] sort.
- [ ] recherche globale / colonne.
- [ ] regex.
- [ ] filtres.
- [ ] pagination.
- [ ] densité / wrap / zebra / zoom.
- [ ] rendu ID/label/icon/image.
- [ ] formats conditionnels discrets.
- [ ] gradients continus / seuils / outliers.
- [ ] export CSV/JSON.
- [ ] profils de vues.

## 5.3 SearchWiz
- [ ] texte global.
- [ ] champs ciblés.
- [ ] exact.
- [ ] regex.
- [ ] mode avancé.
- [ ] score de correspondance.

## 5.4 FilterWiz
- [ ] select.
- [ ] checkbox/radio.
- [ ] boutons/chips/cards/images.
- [ ] sliders/ranges.
- [ ] dates.
- [ ] opérateurs ET/OU.

## 5.5 RendererWiz
- [ ] cards.
- [ ] compact cards.
- [ ] list.
- [ ] table.
- [ ] links.
- [ ] gallery.
- [ ] tiles.
- [ ] filmstrip.

## 5.6 JSON Studio
- [ ] Raw JSON.
- [ ] Tree.
- [ ] Form.
- [ ] Table via TableWiz.
- [ ] Preview.
- [ ] Validation via DataValidator.
- [ ] whole file / subsection / record.
- [ ] arrays ordonnés/reorder.
- [ ] références ID + labels résolus.
- [ ] images.
- [ ] import/export.
- [ ] diff.
- [ ] save adapter conditionnel.

## 5.7 DataWiz
- [ ] stats descriptives de base.
- [ ] tableaux synthétiques.
- [ ] graphiques simples.

Critère de sortie : exploration et édition d'un référentiel métier sans code spécifique de page.

---

# LOT 6 — Média / Document / QR / Share — 0 % ⬜

## 6.1 MediaWiz
- [ ] image.
- [ ] SVG.
- [ ] preview.
- [ ] gallery/filmstrip.
- [ ] zoom.
- [ ] emplacements futurs vidéo/audio/PDF.

## 6.2 QRWiz
- [ ] URL canonique/courante via URLResolver.
- [ ] taille.
- [ ] correction d'erreur.
- [ ] couleurs / fond / transparence.
- [ ] marge.
- [ ] logo optionnel.
- [ ] thème.
- [ ] export SVG/PNG si capacité disponible.

## 6.3 ShareWiz
- [ ] copier URL.
- [ ] QR.
- [ ] print.
- [ ] PDF.
- [ ] email.
- [ ] Web Share.
- [ ] metadata title/description/url/image.
- [ ] cascade image page → section → site → fallback.

## 6.4 DocumentWiz
- [ ] impression page courante.
- [ ] profil document data-driven.
- [ ] sélection de champs.
- [ ] template/layout.
- [ ] logo / QR / thème.
- [ ] PDF navigateur si faisable sans dépendance lourde.
- [ ] état UI/personnalisation transmis au document.

Critère de sortie : une fiche structurée peut être partagée, imprimée et produite en document depuis sa source canonique.

---

# LOT 7 — Web / SEO / Analytics / Observabilité — 0 % ⬜

## 7.1 SEOWiz structurel
- [ ] title.
- [ ] description.
- [ ] canonical.
- [ ] language.
- [ ] robots.
- [ ] share image.
- [ ] JSON-LD.
- [ ] breadcrumbs.
- [ ] dates/author/source.
- [ ] rendu meta/OG/social.

## 7.2 AnalyticsWiz
- [ ] API provider-neutral.
- [ ] page view.
- [ ] event.
- [ ] search.
- [ ] filter.
- [ ] download/share/print.
- [ ] adapter GA4.
- [ ] emplacement futur Matomo/Plausible.
- [ ] consent adapter.

## 7.3 Performance / Monitoring
- [ ] chronométrage initialisation.
- [ ] compteurs provider/data.
- [ ] erreurs capturées.
- [ ] diagnostics runtime.
- [ ] hooks observabilité.

Critère de sortie : le site peut produire une sortie web structurée et observable sans couplage à un fournisseur unique.

---

# LOT 8 — Catalogue / Demo / Tests / Non-régression — 0 % ⬜

## 8.1 Demo datasets
- [ ] `simple.json`.
- [ ] `errors.json`.
- [ ] `references.json`.
- [ ] `images.json`.
- [ ] `discrete.json`.
- [ ] `continuous.json`.
- [ ] `mixed.json`.

## 8.2 Catalogue / Playground
- [ ] Layout.
- [ ] Toolbar.
- [ ] Table.
- [ ] Search/Filter.
- [ ] Cards/Renderer.
- [ ] Pagination.
- [ ] FloatingPanel.
- [ ] Theme.
- [ ] Icons.
- [ ] Help.
- [ ] JSON Studio.
- [ ] DataWiz.
- [ ] QR/Share/Document.
- [ ] paramètres actifs visibles.
- [ ] JSON de configuration visible.

## 8.3 Tests
- [ ] tests core data.
- [ ] tests runtime.
- [ ] tests primitives UI.
- [ ] tests data UX.
- [ ] tests URL/env.
- [ ] smoke test catalogue.
- [ ] checklist non-régression.

Critère de sortie : le framework peut être évalué sans projet métier externe.

---

# LOT 9 — Webmaster privé : atelier Recettes du Cœur — 0 % ⬜

Cible : `nepheris/NLab-Webmaster/Sites/Recettes-du-Coeur/atelier/`.

Objectif : constituer la source métier privée et les outils de génération sans duplication d'information.

## 9.1 Audit/import de l'existant
- [ ] inventorier recettes.
- [ ] inventorier astuces.
- [ ] inventorier ingrédients.
- [ ] inventorier allergènes / saisonnalité / catégories / tags / sources.
- [ ] inventorier médias et logos réutilisables.
- [ ] identifier les anciennes structures à adapter, pas recopier aveuglément.

## 9.2 Modèle métier canonique
- [ ] `data/registry.json`.
- [ ] collections JSON séparées.
- [ ] IDs canoniques.
- [ ] relations déclaratives.
- [ ] aucun libellé dupliqué quand une référence suffit.
- [ ] sources/documentation par IDs.
- [ ] médias comme objets/références métier.
- [ ] schémas de collections.

## 9.3 Atelier
- [ ] `data/`.
- [ ] `schemas/`.
- [ ] `media/`.
- [ ] `documents/`.
- [ ] `imports/`.
- [ ] `exports/`.
- [ ] `config/`.
- [ ] génération `atelier → web`.
- [ ] validation DataValidator avant génération.
- [ ] diagnostics liens cassés.

Critère de sortie : le dossier `web/` peut être régénéré uniquement à partir de l'atelier + framework, sans données métier recopiées manuellement dans les pages.

---

# LOT 10 — Webmaster : web Recettes du Cœur — 0 % ⬜

Cible : `nepheris/NLab-Webmaster/Sites/Recettes-du-Coeur/web/`.

Objectif : premier vrai site consommateur du Framework V2.

## 10.1 Identité visuelle
- [ ] réutiliser logo/mascotte/images existantes pertinentes.
- [ ] conserver l'esprit visuel Recettes du Cœur.
- [ ] thème projet au-dessus des tokens framework.
- [ ] responsive 4 paliers.

## 10.2 Pages publiques
- [ ] accueil.
- [ ] catalogue recettes.
- [ ] fiche recette.
- [ ] astuces.
- [ ] fiche astuce.
- [ ] ingrédients si données suffisantes.
- [ ] recherche.
- [ ] contact/informations nécessaires sans secret codé en dur.

## 10.3 Fonctionnalités framework utilisées
- [ ] Header/Footer/Hero/Sections.
- [ ] NavigationWiz.
- [ ] SearchWiz.
- [ ] FilterWiz.
- [ ] RendererWiz.
- [ ] PaginationWiz.
- [ ] TableWiz sur une vue métier utile.
- [ ] HelpWiz.
- [ ] ThemeWiz / densité.
- [ ] QRWiz.
- [ ] ShareWiz.
- [ ] DocumentWiz sur recette.
- [ ] SEO structurel.
- [ ] Analytics adapter configurable mais désactivable.

Critère de sortie : aucune page métier principale n'embarque sa propre copie des moteurs génériques.

---

# LOT 11 — Preview public : crash-test intégral — 0 % ⬜

Cible : `nepheris/NLab-Webmaster-Preview-`.

- [ ] refetch/reset Preview avant publication.
- [ ] publier uniquement le contenu autonome de `web/`.
- [ ] vérifier qu'aucun fichier `atelier/` n'est publié.
- [ ] vérifier absence de secrets/données privées.
- [ ] vérifier chemins relatifs sous Pages.
- [ ] vérifier assets/images/logo.
- [ ] vérifier chargement JSON.
- [ ] vérifier navigation.
- [ ] vérifier recherche/filtres/pagination.
- [ ] vérifier fiches et relations résolues.
- [ ] vérifier QR/Share/Print/Document.
- [ ] vérifier responsive.
- [ ] vérifier console JS.
- [ ] vérifier Pages deployment.

Critère de sortie : un utilisateur externe peut parcourir le crash-test depuis GitHub Pages avec uniquement les ressources de `web/`.

---

# LOT 12 — Validation finale / corrections — 0 % ⬜

Cette phase est la première qui nécessite réellement la validation utilisateur globale.

- [ ] audit architecture / factorisation.
- [ ] audit source unique de vérité.
- [ ] audit séparation framework/métier.
- [ ] audit public/privé.
- [ ] audit UX desktop/tablette/mobile.
- [ ] audit accessibilité de base.
- [ ] audit performance.
- [ ] audit SEO structurel.
- [ ] audit documentation.
- [ ] revue des écarts entre roadmap et réalisation.
- [ ] corrections issues du crash-test.
- [ ] décision : framework V2 prêt pour stabilisation ou nouveau cycle.

---

# Hors périmètre du premier crash-test — différé

Ces briques restent prévues mais ne bloquent pas Recettes du Cœur V2 :

- IdentityWiz Google/Microsoft/GitHub.
- ExternalDataWiz Google Drive/OneDrive/GitHub privé/API distante.
- AccessGate avec vraie protection serveur/edge.
- provider SQLite.
- moteurs statistiques avancés.
- fuzzy search avancée.
- traitements audio/vidéo complexes.

---

# Règle d'exécution autonome

Pour les lots 1 à 11 :

1. refetch de la branche/cible avant chaque écriture ;
2. implémentation ;
3. tests disponibles sans interaction utilisateur ;
4. mise à jour de cette roadmap ;
5. commit distinct et lisible ;
6. poursuite automatique si aucune décision métier bloquante n'est requise.

Les fonctionnalités implémentées mais non encore validées visuellement par l'utilisateur passent en **🟠 À tester** plutôt qu'en ✅ si leur comportement UX ne peut pas être considéré comme définitivement validé par tests techniques seuls.
