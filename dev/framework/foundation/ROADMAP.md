# 🗺️ Roadmap GitHub — Framework nLab V2 + crash-test Recettes du Cœur

> Objectif : stabiliser le Framework nLab V2 par un catalogue testable, une consolidation UX transverse puis un crash-test réel sur Recettes du Cœur. Principe de lecture : **pilotage immédiatement visible, détail à la demande**.

<a name="haut"></a>

## 1. Pilotage

### 1.1 Phase active

> 👇👇👇 **POINT DE TRAVAIL ACTIF** 👇👇👇  
> 🎯 **PHASE ACTIVE : [Phase 8B — Consolidation UX transverse / Atelier Webmaster](#phase-8b)**  
> ▶️ **Reprise : valider le Preset Manager générique puis l’intégrer à QR Studio, Theme Workshop, responsive/cartes et TableWiz.**  
> 🟣👤 **Jalon HUMAN actif : [H001 — Validation UX de la consolidation 8B](#human-h001)** — non bloquant pour les travaux indépendants.

> **Règle de lecture :** cette roadmap n’est pas strictement séquentielle. Un lot techniquement construit peut rester à tester ; une phase antérieure peut rester sous 100 % si son critère bloquant est franchi. Les améliorations non bloquantes restent suivies sans empêcher la progression.

<details>
<summary><strong>🧭 1.2 Sommaire — cliquer pour déplier</strong></summary>

- [📎 1.3 Fichiers associés](#fichiers-associes)
- [📘 1.4 Légende](#legende)
- [📊 1.5 Vue globale](#vue-globale)
- [📍 1.6 État actuel](#etat-actuel)
- [🟣👤 1.7 Jalons HUMAN](#jalons-human)
- [2. Fondations et runtime](#bloc-a)
- [3. UI, présentation, données et sorties](#bloc-b)
- [4. Catalogue et consolidation UX](#bloc-c)
- [5. Crash-test Recettes du Cœur](#bloc-d)
- [6. Validation finale](#bloc-e)
- [7. Méthode autonome et RETEX](#methode-autonome)
- [8. 💡 Backlog / boîte à idées](#backlog-roadmap)
- [9. Capitalisation / clôture](#capitalisation)

</details>

<a name="fichiers-associes"></a>

### 📎 1.3 Fichiers associés

> Le lien principal ouvre normalement. Le petit `↗` offre une ouverture séparée compacte.

- 🗂️ **Dépôt Framework :** [nepheris/NLab-framework](https://github.com/nepheris/NLab-framework) <a href="https://github.com/nepheris/NLab-framework" target="_blank">↗</a>
- 🌐 **Preview publique :** [NLab Webmaster Preview](https://nepheris.github.io/NLab-Webmaster-Preview-/) <a href="https://nepheris.github.io/NLab-Webmaster-Preview-/" target="_blank">↗</a>
- 📈 **Détail opérationnel 8B :** [`ROADMAP-8B-DETAIL.md`](./ROADMAP-8B-DETAIL.md) <a href="./ROADMAP-8B-DETAIL.md" target="_blank">↗</a>
- 🤖 **REX machine cumulatif :** [`roadmap-framework-v2.rex.machine.json`](./roadmap-framework-v2.rex.machine.json) <a href="./roadmap-framework-v2.rex.machine.json" target="_blank">↗</a>
- 🟣👤 **Fiche HUMAN active / dernière :** [`roadmap-framework-v2.human-check.md`](./roadmap-framework-v2.human-check.md) <a href="./roadmap-framework-v2.human-check.md" target="_blank">↗</a>
- 🧠 **RETEX narratif :** [`RETEX-AUTONOMIE.md`](./RETEX-AUTONOMIE.md) <a href="./RETEX-AUTONOMIE.md" target="_blank">↗</a>
- 📋 **Backlog UX :** [`BACKLOG-UX.md`](./BACKLOG-UX.md) <a href="./BACKLOG-UX.md" target="_blank">↗</a>
- 💡 **Boîte à idées :** [`IDEAS.md`](./IDEAS.md) <a href="./IDEAS.md" target="_blank">↗</a>
- ⚖️ **Décisions :** [`DECISIONS.md`](./DECISIONS.md) <a href="./DECISIONS.md" target="_blank">↗</a>

<a name="legende"></a>

### 📘 1.4 Légende

<details>
<summary><strong>Cliquer pour déplier / replier la légende</strong></summary>

- ⚪ `0 %` — à faire
- 🟡 `1–99 %` — en cours
- 🟢 `100 %` — terminé / validé techniquement
- 🟠 — construit mais validation UX/fonctionnelle encore requise
- ⏸️ `—` — différé volontairement
- 🟣👤 `HUMAN` — intervention humaine utile à la décision
- 🤖 — brief / mémoire machine
- 💡 — idée / capitalisation
- 🔎 — audit / contrôle
- 🔷 — navigation interne
- 🎯 — phase ou point actif
- 📈 — tableau d’avancement / détail de phase
- ↗ — ouverture séparée

Les pourcentages expriment la maturité du périmètre décrit, pas le temps restant.

</details>

<a name="vue-globale"></a>

### 📊 1.5 Vue globale

<details open>
<summary><strong>📊 Avancement global — ouvert par défaut</strong></summary>

| Domaine | État | Avancement | Cible |
|---|---|---:|---|
| Gouvernance + fondations data | 🟢 | 100 % | Contrats, validation, providers et décisions stabilisés |
| Core runtime | 🟢 | 100 % | State, events, registry, URL, storage, environment |
| Primitives UI + présentation | 🟠 | 100 % technique | Validation UX via catalogue puis site réel |
| Data UX | 🟠 | 100 % technique | Search/Filter/Renderer/Table/JSON/DataWiz éprouvés visuellement |
| Media / QR / Share / Document | 🟠 | 100 % technique | Studios interactifs et sorties éprouvés |
| Web / observabilité | 🟠 | 100 % technique | SEO, analytics, performance et monitoring éprouvés |
| Catalogue / Playground | 🟠 | 100 % socle | Page unique de test, Preview versionnée et protocole de recette |
| Consolidation UX 8B | 🟡 | 40 % | Primitives transverses factorisées + presets reproductibles |
| Diagnostic avancé 8C | ⚪ | 0 % | Inspector/notifications/observabilité UI avancés |
| Crash-test Recettes du Cœur | ⚪ | 0 % | Atelier privé → web généré → Preview public |
| Validation finale | 🟣👤 | 0 % | Revue humaine + audits + décision de stabilisation V2 |

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="etat-actuel"></a>

### 📍 1.6 État actuel

<details open>
<summary><strong>📍 État technique actuel — ouvert par défaut</strong></summary>

```text
Lots 0 → 8 : socle technique construit
   ↓
Catalogue public versionné + IDs + Info/Test + Preview
   ↓
Theme / Responsive / QR / CodeBlock / Inspector consolidés
   ↓
PresetManager + PresetManagerView + démo isolée construits
   ↓
Preview #13 déclenchée pour validation du Preset Manager
   ↓
PHASE ACTIVE : intégration progressive du Preset Manager
   ↓
PROCHAINE ÉTAPE : QR Studio → Theme/Densité → Responsive/Cartes → TableWiz
```

**Cible du cycle V2 :**

```text
Framework générique
→ réglage visuel dans le catalogue
→ preset/config exportable en JSON
→ reproduction déterministe sans explication verbale
→ crash-test Recettes du Cœur
→ génération atelier privé → web publiable
→ Preview public
→ audit + validation humaine
```

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="jalons-human"></a>

### 🟣👤 1.7 Jalons HUMAN

Vue courte : statut ici, détail dans la phase concernée.

- 🟣👤 **H001 — Validation UX de la consolidation 8B : actif.** → [Phase 8B](#human-h001)
- 🟣👤 **H002 — Mapping métier réellement ambigu Recettes du Cœur : conditionnel.** → [Phase 9](#human-h002)
- 🟣👤 **H003 — Choix thème / variantes publiques Recettes du Cœur : planifié.** → [Phase 10](#human-h003)
- 🟣👤 **H004 — Validation Preview public : planifié.** → [Phase 11](#human-h004)
- 🟣👤 **H005 — Stabilisation Framework V2 : planifié.** → [Phase 12](#human-h005)

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="bloc-a"></a>

# 2. Fondations et runtime

<a name="phase-0"></a>
<details>
<summary><strong>📈 Phase 0 — Gouvernance — 🟢 100 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | Branche `New`, historique incrémental, `foundation/`, décisions et séparation framework/métier/public/privé. |
| 🟢 | 100 % | Roadmap, backlog UX, RETEX et boîte à idées distincts. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-1"></a>
<details>
<summary><strong>📈 Phase 1 — Fondation data — 🟢 100 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | DataProvider / DataSource / DataAdapter / Registry / Schema / Relation. |
| 🟢 | 100 % | JsonDataProvider, DataIndex, DataResolver, DataValidator, registries runtime. |
| 🟢 | 100 % | Tests de fondation ajoutés. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-2"></a>
<details>
<summary><strong>📈 Phase 2 — Core runtime — 🟢 100 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | StateStore, EventBus, FrameworkRegistry. |
| 🟢 | 100 % | URLResolver, BrowserStorage, Environment. |
| 🟢 | 100 % | Expérience `visitor|webmaster` définie comme état UX, jamais comme autorisation. |

🔷 [↑ Sommaire](#haut)
</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="bloc-b"></a>

# 3. UI, présentation, données et sorties

<a name="phase-3"></a>
<details>
<summary><strong>📈 Phase 3 — Primitives UI — 🟠 100 % technique / à tester</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | Layout, Header/Footer/Hero/Section/Sidebar. |
| 🟢 | 100 % | FloatingPanel, Toolbar, Foldable, Pagination. |
| 🟠 | — | Ergonomie réelle suivie dans la consolidation 8B. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-4"></a>
<details>
<summary><strong>📈 Phase 4 — Theme Workshop / présentation — 🟠 100 % technique / à tester</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | Cascade `base → site → variante → section → composant → utilisateur`. |
| 🟢 | 100 % | Theme Workshop, préférences visiteur, Icon Registry, HelpWiz, NavigationWiz. |
| 🟠 | — | UX, presets, backgrounds, typographie et portées consolidés en 8B. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-5"></a>
<details>
<summary><strong>📈 Phase 5 — Data UX — 🟠 100 % technique / à tester</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | ResultSet, SearchWiz, FilterWiz, PresentationResolver, RendererWiz. |
| 🟢 | 100 % | TableWiz, JSON Studio, DataWiz. |
| 🟠 | — | Vues avancées et ergonomie sont précisées dans 8B. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-6"></a>
<details>
<summary><strong>📈 Phase 6 — Media / QR / Share / Document — 🟠 100 % technique / à tester</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | MediaWiz, QRWiz, ShareWiz, DocumentWiz et contrats d’encodeur. |
| 🟠 | — | QR Studio, Media/Link/Asset Workshop servent à éprouver les variantes réelles. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-7"></a>
<details>
<summary><strong>📈 Phase 7 — Web / observabilité — 🟠 100 % technique / à tester</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | SEOWiz, OpenGraph, AnalyticsWiz, GA4 adapter, consent, RuntimeMonitor. |
| 🟠 | — | Validation intégrée au crash-test réel. |

🔷 [↑ Sommaire](#haut)
</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="bloc-c"></a>

# 4. Catalogue et consolidation UX

<a name="phase-8"></a>
<details>
<summary><strong>📈 Phase 8 — Catalogue / Playground — 🟠 100 % socle / à tester</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | Datasets de test, page unique, responsive simulé, renderers, Table/JSON/DataWiz. |
| 🟢 | 100 % | FloatingPanel/Help, QR réel, DocumentWiz, configuration active. |
| 🟢 | 100 % | IDs humains/techniques, Info/Test, CodeBlock et Preview versionnée. |
| 🟠 | — | Validation visuelle progressive via Preview. |

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-8b"></a>

> 👇👇👇 **POINT DE TRAVAIL ACTIF** 👇👇👇

<details open>
<summary><strong>🎯📈 Phase 8B — Consolidation UX transverse / Atelier Webmaster — 🟡 40 % — ACTIVE</strong></summary>

**Objectif :** figer les primitives qui seront dupliquées partout avant de construire le site métier.

| Sous-phase | État | Avancement | Prochaine cible |
|---|---|---:|---|
| 8B.1 IDs / Info / InspectorPanel | 🟡 | 45 % | Généraliser aux sous-sections + détails techniques |
| 8B.2 CodeBlock | 🟡 | 80 % | HTML/CSS/CSV + adoption dans autres studios |
| 8B.3 FloatingPanel / handles | 🟡 | 70 % | États/dock overlay-push + primitive commune |
| 8B.4 QR Studio | 🟡 | 65 % | Presets éditables/validables via Preset Manager |
| 8B.5 Preset Manager générique | 🟡 | 70 % | **Intégrer QR → Theme/Density → Responsive/Cards → Table** |
| 8B.6 Theme Workshop V2 | 🟡 | 35 % | BackgroundWiz N couleurs, portée Global/Type/Instance, liens |
| 8B.7 Navigation développement | 🟡 | 55 % | Web/Public ↔ Webmaster + primitive breakpoint local |
| 8B.8 JSON Studio / Data UX V2 | 🟡 | 15 % | Tree/Form/Raw+CodeBlock/Filmstrip controllers |
| 8B.9 Media / Link / Asset | ⚪ | 0 % | LinkWiz, MediaWiz, PDF, Asset/Logo Workshop |

**Preuves Preset Manager déjà construites :**
- moteur générique avec presets canoniques et utilisateur ;
- création / duplication / renommage / suppression ;
- preset actif + validation + reset ;
- persistance `localStorage` ;
- import/export JSON ;
- vue UI générique ;
- démo isolée ;
- tests automatisés ajoutés.

📈 **Détail complet :** [`ROADMAP-8B-DETAIL.md`](./ROADMAP-8B-DETAIL.md) <a href="./ROADMAP-8B-DETAIL.md" target="_blank">↗</a>

<a name="human-h001"></a>
<details open>
<summary><strong>🟣👤 H001 — Validation UX de la consolidation 8B — ACTIF</strong></summary>

**Pourquoi l’humain intervient :**
1. les choix d’ergonomie du catalogue influencent toutes les briques réutilisées ensuite ;
2. les presets doivent correspondre à une manière de travailler réellement efficace ;
3. les retours Preview peuvent modifier le design de la primitive avant duplication.

**Contrôle :** 🟣👤 [`roadmap-framework-v2.human-check.md`](./roadmap-framework-v2.human-check.md) <a href="./roadmap-framework-v2.human-check.md" target="_blank">↗</a>

**Après validation :** intégrer le Preset Manager dans QR Studio puis poursuivre automatiquement les intégrations indépendantes.

🟣👤 [Retour aux jalons HUMAN](#jalons-human) · 🔷 [↑ Sommaire](#haut)
</details>

**Critère de sortie 8B :** chaque grande abstraction transverse est prouvée au moins une fois et un réglage visuel peut être exporté en JSON puis reproduit sans explication verbale détaillée.

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-8c"></a>
<details>
<summary><strong>📈 Phase 8C — Diagnostic avancé / notifications / observabilité UI — ⚪ 0 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| ⚪ | 0 % | InspectorPanel à onglets Test / Technique / Dépendances / État / Configuration. |
| ⚪ | 0 % | Inventaire dynamique des contrôles et snapshot JSON. |
| ⚪ | 0 % | FloatingPanel notification/toast + historique. |
| ⚪ | 0 % | Live Preview, inspecteur de cascade et contraste/accessibilité live. |

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="bloc-d"></a>

# 5. Crash-test Recettes du Cœur

<a name="phase-9"></a>
<details>
<summary><strong>📈 Phase 9 — Webmaster privé / atelier métier — ⚪ 0 %</strong></summary>

**Cible :** `nepheris/NLab-Webmaster/Sites/Recettes-du-Coeur/atelier/`.

| État | Avancement | Action |
|---|---:|---|
| ⚪ | 0 % | Audit recettes, astuces, ingrédients, référentiels, sources et médias existants. |
| ⚪ | 0 % | Modèle métier canonique en collections JSON + IDs + relations + schémas. |
| ⚪ | 0 % | Structure `data/schemas/media/documents/imports/exports/config/tools`. |
| ⚪ | 0 % | Validation puis génération `atelier → web`. |
| ⚪ | 0 % | Garantir `Sites/Recettes-du-Coeur/web/` comme racine logique publiable. |

<a name="human-h002"></a>
**🟣👤 H002 — uniquement si un mapping métier est réellement ambigu et impossible à déduire.**

- [ ] RETEX 02 avant passage Atelier → Web.

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-10"></a>
<details>
<summary><strong>📈 Phase 10 — Web Recettes du Cœur — ⚪ 0 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| ⚪ | 0 % | Reprendre identité, logo, mascotte et médias publics pertinents. |
| ⚪ | 0 % | Accueil, recettes, astuces, ingrédients si pertinent, recherche, contact/informations. |
| ⚪ | 0 % | Crash-test Layout/Nav/Help/Theme/Search/Filter/Renderer/Table/QR/Share/Document/SEO/Analytics. |
| ⚪ | 0 % | Responsive téléphone → large et renderer adapté au breakpoint. |

<a name="human-h003"></a>
**🟣👤 H003 — choix du thème public et des variantes finales.**

- [ ] RETEX 03 après premier site fonctionnel.

🔷 [↑ Sommaire](#haut)
</details>

<a name="phase-11"></a>
<details>
<summary><strong>📈 Phase 11 — Preview public / crash-test intégral — ⚪ 0 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| ⚪ | 0 % | Refetch/reset Preview puis publier uniquement le contenu de `web/` à la racine. |
| ⚪ | 0 % | Contrôler absence d’atelier/secrets, chemins relatifs, assets, JSON, relations et navigation. |
| ⚪ | 0 % | Contrôler recherche/filtres/rendus/table, thème, QR/share/document, responsive et console. |
| ⚪ | 0 % | Distinguer build artifact, deployment Pages et contenu réellement servi. |
| ⚪ | 0 % | Identifier chaque publication avec version visible + `PREVIEW_BUILD.json`. |

<a name="human-h004"></a>
**🟣👤 H004 — validation réelle du Preview public dans le navigateur utilisateur.**

- [ ] RETEX 04 après publication Preview.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="bloc-e"></a>

# 6. Validation finale

<a name="phase-12"></a>
<details>
<summary><strong>📈 Phase 12 — Validation humaine finale et corrections — 🟣👤 0 %</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟣👤 | 0 % | Revue visuelle catalogue/framework et Theme Workshop. |
| 🟣👤 | 0 % | Responsive, renderers, thème Recettes du Cœur et Preview public. |
| ⚪ | 0 % | Audit factorisation, source de vérité, framework/métier, public/privé. |
| ⚪ | 0 % | Audit UX, accessibilité, performance, SEO et documentation. |
| ⚪ | 0 % | Corrections finales et RETEX 05. |

<a name="human-h005"></a>
**🟣👤 H005 — décision finale : stabiliser Framework V2 ou ouvrir un nouveau cycle.**

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="methode-autonome"></a>

# 7. Méthode autonome et RETEX

<details open>
<summary><strong>⚙️ Mode d’exécution — ouvert par défaut</strong></summary>

```text
1. lire ROADMAP + REX machine + DECISIONS
2. vérifier le HEAD GitHub avant toute écriture
3. analyser le besoin réel / retour Preview
4. trier : maintenant / BEFORE_CLOSE / LATER / NOTE
5. implémenter la plus petite primitive factorisable
6. ajouter tests et contrôles techniques
7. confronter au catalogue / cas réel
8. simplifier et réutiliser les briques existantes
9. mettre à jour la roadmap si l’état structurel change
10. mettre à jour le REX à chaque jalon structurel
11. re-vérifier HEAD
12. commit sans force
13. publier Preview si le rendu humain doit être vérifié
14. contrôler artifact ≠ deployment ≠ page réellement servie
15. continuer automatiquement si aucun vrai jalon HUMAN ne bloque
```

**Chat / rapport :** réponse courte avec changements, statut, prochaine étape et liens directs. Les détails, preuves et listes longues vivent dans GitHub.

**Après chaque commit :** SHA complet, message, repo, URL commit et liens vers les principaux fichiers modifiés.

**Déclencher 🟣👤 HUMAN uniquement si le jugement humain peut réellement modifier la décision.**

### Checkpoints RETEX
- 🟢 RETEX 01 — Lots 0→8 + incident Preview : réalisé.
- ⚪ RETEX 02 — avant Atelier → Web.
- ⚪ RETEX 03 — après premier site Recettes du Cœur fonctionnel.
- ⚪ RETEX 04 — après publication Preview du crash-test.
- ⚪ RETEX 05 — avant stabilisation V2.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="backlog-roadmap"></a>

# 8. 💡 Backlog / boîte à idées non bloquante

> Une nouvelle idée ne modifie pas automatiquement le périmètre du livrable courant.

| Classe | Usage | Bloque la clôture ? |
|---|---|---|
| `BEFORE_CLOSE` | nécessaire avant la fin du cycle V2 courant | oui |
| `LATER` | évolution d’une roadmap ultérieure | non |
| `NOTE` | remarque, piste ou enseignement à capitaliser | non |

<details open>
<summary><strong>💡 Sources de suivi — ouvertes par défaut</strong></summary>

- `BEFORE_CLOSE` / détail opérationnel UX : [`BACKLOG-UX.md`](./BACKLOG-UX.md)
- `LATER` / `NOTE` : [`IDEAS.md`](./IDEAS.md)
- détail des tâches de consolidation : [`ROADMAP-8B-DETAIL.md`](./ROADMAP-8B-DETAIL.md)

**Exemples `LATER` déjà capitalisés :** éditeur riche, calendrier/agenda/ICS, timelines, données spatiales/cartes, types spécialisés téléphone/SIRET/monnaie, analyses statistiques avancées, affichage conditionnel, cellules typées et exports avancés.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="capitalisation"></a>

# 9. Capitalisation / clôture

- finaliser le REX machine ;
- consolider `RETEX-AUTONOMIE.md` avec réussites, difficultés et anti-patterns ;
- vérifier les éléments `BEFORE_CLOSE` ;
- transférer les `LATER` / `NOTE` utiles vers la boîte à idées ;
- auditer les décisions canoniques ;
- archiver roadmap finale + REX + fiche HUMAN ;
- décider 🟣👤 de stabiliser V2 ou d’ouvrir une roadmap suivante ;
- améliorer le template de roadmap uniquement à partir de l’expérience réelle.

🔷 **[↑ Retour au sommaire](#haut)**
