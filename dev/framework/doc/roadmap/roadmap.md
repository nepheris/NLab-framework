# nLab Framework

## 🗺️ Roadmap GitHub

> Objectif : industrialiser le framework nLab jusqu’à un socle générique, testable et réutilisable, puis le confronter à un vrai cas métier. Principe de lecture : **pilotage immédiatement visible, détail à la demande**.

<a name="haut"></a>

## 1. Pilotage

### 1.1 Phase active

> 👇👇👇 **POINT DE TRAVAIL ACTIF**  
> 🎯 **Phase active : [Lot 8B — Consolidation UX / industrialisation](#phase-8b)**  
> 🟣👤 **Jalon HUMAN actif : [H001 — validation UX du cycle V18](#human-h001)**

> ℹ️ Une phase antérieure peut rester sous 100 % si son critère bloquant est satisfait. Les compléments non bloquants restent suivis sans empêcher la progression.

<details>
<summary><strong>🧭 1.2 Sommaire — cliquer pour déplier</strong></summary>

- [📎 1.3 Fichiers associés](#fichiers-associes)
- [📘 1.4 Légende](#legende)
- [📊 1.5 Vue globale](#vue-globale)
- [📍 1.6 État actuel](#etat-actuel)
- [🟣👤 1.7 Jalons HUMAN](#jalons-human)
- [2. Lots historiques 0 à 8](#lots-historiques)
- [3. Lot 8B — phase active](#phase-8b)
- [4. Lot 9 — crash-test métier](#lot-9)
- [5. Lots 10 à 12](#lots-futurs)
- [6. Séquence d’industrialisation](#industrialisation)
- [9. Méthode autonome](#methode-autonome)
- [10. 💡 Backlog non bloquant](#backlog)
- [11. Capitalisation / clôture](#capitalisation)

</details>

<a name="fichiers-associes"></a>

### 📎 1.3 Fichiers associés

- 🗂️ **Dépôt :** [nepheris/NLab-framework](https://github.com/nepheris/NLab-framework) <a href="https://github.com/nepheris/NLab-framework" target="_blank">↗</a>
- 🤖 **Brief machine / REX :** [`rex.machine.json`](./rex.machine.json) <a href="./rex.machine.json" target="_blank">↗</a>
- 🟣👤 **Fiche HUMAN active :** [`human-check.md`](./human-check.md) <a href="./human-check.md" target="_blank">↗</a>
- 🔎 **Cycle de démonstration courant :** [`../../demo/ROADMAP_V18.md`](../../demo/ROADMAP_V18.md) <a href="../../demo/ROADMAP_V18.md" target="_blank">↗</a>
- 💡 **Boîte à idées :** backlog de cette roadmap jusqu’à création d’un fichier dédié.

<a name="legende"></a>

### 📘 1.4 Légende

<details>
<summary><strong>Cliquer pour déplier / replier</strong></summary>

- ⚪ `0 %` — à faire
- 🟡 `1–99 %` — en cours
- 🟢 `100 %` — terminé / validé
- ⏸️ `—` — différé volontairement
- ⬜ — domaine non actif dans le schéma synthétique
- 🟦 — domaine actuellement travaillé
- 🟣👤 — intervention humaine
- 🤖 — mémoire machine / REX
- 💡 — idée / capitalisation
- 🔎 — audit / contrôle
- 🔷 — navigation interne
- 🎯 — point actif
- 📈 — avancement / détail de phase

</details>

<a name="vue-globale"></a>

### 📊 1.5 Vue globale

<details open>
<summary><strong>📊 Avancement global — ouvert par défaut</strong></summary>

| Domaine | Focus | État | Avancement | Cible |
|---|---|---|---:|---|
| Architecture Framework | ⬜ | 🟡 | ~90 % | socle propre, factorisé et stable |
| Catalogue / Playground | ⬜ | 🟡 | ~80 % | banc d’essai complet |
| UX / concepts | ⬜ | 🟡 | ~70 % | comportements validés humainement |
| **Composants industrialisés** | **🟦 ACTIF** | 🟡 | ~55 % | prototypes extraits en composants génériques |
| JSON / data métier | ⬜ | 🟡 | ~50 % | édition + relations inter-JSON robustes |
| Tests / robustesse | ⬜ | 🟡 | ~30 % | non-régression et cas négatifs |
| Intégration métier | ⬜ | 🟡 | ~20 % | crash-test Recettes du Cœur |

```text
⬜ ARCHITECTURE FRAMEWORK       ████████████████████  ~90 %
⬜ CATALOGUE / PLAYGROUND      ████████████████░░░░  ~80 %
⬜ UX / CONCEPTS               ██████████████░░░░░░  ~70 %
🟦 COMPOSANTS INDUSTRIALISÉS   ███████████░░░░░░░░░  ~55 %   ← ACTIF
⬜ JSON / DATA MÉTIER          ██████████░░░░░░░░░░  ~50 %
⬜ TESTS / ROBUSTESSE          ██████░░░░░░░░░░░░░░  ~30 %
⬜ INTÉGRATION MÉTIER          ████░░░░░░░░░░░░░░░░  ~20 %
```

> Le repère 🟦 indique **où l’effort courant est concentré**. Les autres domaines restent visibles en gris/neutre pour conserver la vision globale.

> Ces valeurs représentent une maturité fonctionnelle et architecturale, pas un pourcentage de lignes de code terminées.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="etat-actuel"></a>

### 📍 1.6 État actuel

<details open>
<summary><strong>📍 État actuel — ouvert par défaut</strong></summary>

```text
Socle Framework largement construit
↓
Catalogue / Playground V18 testant la portée native du Theme Workshop
↓
Theme Workshop industrialisé : global → type → instance
↓
POINT ACTIF : valider cette industrialisation et raccorder les contrôles historiques
↓
PROCHAINE ÉTAPE : JSON Studio → composant framework autonome
```

**Process cible :**

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

La démo reste un laboratoire. Une fonction validée ne doit pas rester durablement spécifique à la démo.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

<a name="jalons-human"></a>

### 🟣👤 1.7 Jalons HUMAN

- 🟣👤 **H001 — validation UX du cycle V18 : actif.** → [voir détail](#human-h001)
- ⚪ **H002 — validation de sortie du Lot 8B : à planifier après industrialisation prioritaire.**
- ⚪ **H003 — validation avant crash-test Recettes du Cœur : futur.**

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="lots-historiques"></a>

# 2. Lots historiques 0 à 8

<details>
<summary><strong>📈 Lots 0 à 2 — socle initial — 🟢 100 %</strong></summary>

Les trois premiers lots constituent le socle initial du framework et étaient déjà considérés terminés dans la roadmap précédente.

🔷 [↑ Sommaire](#haut)
</details>

<details>
<summary><strong>📈 Lots 3 à 8 — construction Framework V2 — 🟡 largement réalisée</strong></summary>

Blocs historiquement couverts :

- UI et composants génériques ;
- Theme Workshop / système de thèmes ;
- architecture data-driven et données structurées ;
- renderers et vues ;
- sorties / exports ;
- observabilité et diagnostic ;
- Catalogue / Playground.

Le détail exact de l’ancienne numérotation interne ne doit pas être réinventé : lorsqu’un artefact historique fiable est retrouvé, il prime.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="phase-8b"></a>

# 3. Lot 8B — Consolidation UX / industrialisation

<details open>
<summary><strong>🎯📈 Lot 8B — Consolidation UX / industrialisation — 🟡 ACTIVE</strong></summary>

**Objectif :** fermer le cycle de construction du Catalogue / Playground en transformant les prototypes validés en briques génériques propres.

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | page V18 versionnée et clairement identifiable |
| 🟢 | 100 % | header / sommaire / Info-Test / responsive consolidés dans la démo |
| 🟢 | 100 % | jeux de données de test enrichis |
| 🟢 | 100 % | relations inter-JSON de démonstration prouvées |
| 🟢 | 100 % | Theme Workshop : cascade native `global → type → instance`, profils et resets |
| 🟡 | ~75 % | validation UX des thèmes, profils, Set Filter, TableWiz, JSON Studio, QR Studio |
| 🟡 | ~55 % | extraction des prototypes vers des composants framework |
| 🟡 | en cours | raccorder les contrôles historiques Theme Workshop à la nouvelle API scoped |
| ⚪ | 0 % | **industrialiser JSON Studio en composant autonome** |
| ⚪ | 0 % | convergence TableWiz / DataWiz / ResultSet |
| ⚪ | 0 % | clôture HUMAN du Lot 8B |

<a name="human-h001"></a>
<details open>
<summary><strong>🟣👤 H001 — Validation UX du cycle V18 — ACTIF</strong></summary>

**Pourquoi l’humain intervient :**
1. vérifier que `Cet élément / Même type / Global` produit des effets distincts et compréhensibles ;
2. valider les profils et resets sur la nouvelle API native ;
3. arbitrer les corrections avant de passer au JSON Studio.

**Contrôle :** 🟣👤 [`human-check.md`](./human-check.md) <a href="./human-check.md" target="_blank">↗</a>

**Après validation :** raccorder les contrôles historiques puis extraire JSON Studio hors de la démo.

🟣👤 [Retour aux jalons HUMAN](#jalons-human) · 🔷 [↑ Sommaire](#haut)
</details>

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="lot-9"></a>

# 4. Lot 9 — Crash-test métier Recettes du Cœur

<details>
<summary><strong>📈 Lot 9 — Crash-test métier — ⚪ 0 %</strong></summary>

Ordre prévu :

1. atelier privé `Sites/Recettes-du-Coeur/atelier/` ;
2. consommation des briques génériques du framework sur les vraies données métier ;
3. génération du `web/` ;
4. validation ;
5. publication Preview.

**Règle :** le cas métier éprouve le framework ; il ne doit pas provoquer une duplication de logique spécifique dans le framework.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="lots-futurs"></a>

# 5. Lots 10 à 12 — futur

<details>
<summary><strong>📈 Lots 10 à 12 — ⏸️ intitulés historiques à récupérer</strong></summary>

Ces lots existaient dans l’ancienne roadmap. Leurs intitulés exacts ne sont pas suffisamment établis dans les éléments récupérés ; ils restent volontairement non renommés jusqu’à récupération d’une source fiable.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="industrialisation"></a>

# 6. Séquence d’industrialisation

<details open>
<summary><strong>📈 Priorités techniques après V18</strong></summary>

1. **Theme Workshop** — terminer le raccord des contrôles historiques à la portée native.
2. **JSON Studio** — composant framework, validation, undo/redo, historique, diff, relations multiples, mapping d’affichage.
3. **TableWiz / DataWiz** — DataSource, ResultSet et renderers partagés.
4. **Search / Set Filter** — pondération des tokens, stopwords configurables, locale, suggestions multi-colonnes.
5. **Media Renderer** — fond, transparence, ratio, object-fit, bordures, coins indépendants, masque/détourage.
6. **QRWiz** — contenus typés, presets, logos, validation de lisibilité.
7. **NotificationCenter** — `info / success / warning / error / dev` pilotés par le thème.
8. **CodeBlock** — presets par langage, JSON hiérarchique pliable, distinction bloc de code / éditeur enrichi.
9. **Consolidation / tests / documentation**.
10. **Lot 9 — crash-test Recettes du Cœur**.

🔷 [↑ Sommaire](#haut)
</details>

---

<a name="methode-autonome"></a>

# 9. Méthode autonome

<details open>
<summary><strong>⚙️ Mode d’exécution — ouvert par défaut</strong></summary>

```text
1. lire roadmap + REX + décisions canoniques
2. vérifier le HEAD GitHub
3. analyser les cas réels
4. choisir le minimum nécessaire
5. POC si utile
6. tests positifs + négatifs
7. confrontation au corpus réel
8. simplifier / factoriser
9. documenter
10. implémenter
11. re-tester
12. audit vérité / sécurité / factorisation
13. mettre à jour REX à chaque jalon structurel
14. re-vérifier HEAD
15. commit sans force
16. actualiser roadmap
17. continuer si le critère de sortie est satisfait
```

**Chat / rapport :** réponse courte avec principaux changements, statut, prochain point et liens directs. Les détails restent dans GitHub.

**Déclencher 🟣👤 HUMAN uniquement si le jugement humain peut réellement modifier la décision.**

**Version de démo :** chaque commit qui modifie la page de démonstration incrémente sa version visible dans le titre navigateur, le titre principal et un marquage visuel lisible.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="backlog"></a>

# 10. 💡 Backlog / boîte à idées non bloquante

> Une nouvelle idée ne modifie pas automatiquement le périmètre du livrable courant.

| Classe | Usage | Bloque la clôture ? |
|---|---|---|
| `BEFORE_CLOSE` | nécessaire avant fermeture du lot actif | oui |
| `LATER` | évolution moyen / long terme | non |
| `NOTE` | remarque, piste ou enseignement | non |

<details open>
<summary><strong>BEFORE_CLOSE — Lot 8B</strong></summary>

- raccord complet des contrôles Theme Workshop à la nouvelle API scoped ;
- extraction JSON Studio ;
- convergence minimale TableWiz / DataWiz ;
- nettoyage des comportements encore spécifiques à la démo ;
- validation HUMAN de sortie 8B.

</details>

<details>
<summary><strong>LATER / NOTE — idées différées</strong></summary>

- `LATER` — **support HTML “base de connaissances visuelle”** : transformer les synthèses graphiques/explicatives pertinentes en page HTML autonome, lisible et navigable, utilisable comme support de compréhension d’un projet ou d’un système ;
- `LATER` — **support visuel joint aux notes Markdown** : intégrer l’image directement dans le `.md` lorsque GitHub sait l’afficher ; sinon stocker l’asset à côté et le référencer explicitement ;
- `LATER` — **test des ancres / IDs de section** : vérifier qu’un lien GitHub vers `roadmap.md#section-id` ouvre directement la bonne section/sous-section et étudier si un `<details>` ciblé peut être ouvert automatiquement ou nécessite une convention alternative ;
- `LATER` — vue graphique DataWiz / ResultSet ;
- `LATER` — détourage / masque d’images avancé ;
- `LATER` — éditeur riche distinct du CodeBlock ;
- `NOTE` — logo **nLab Framework validé** ; l’intégrer comme asset officiel du projet et dans les futurs supports lorsque le pipeline d’assets est appliqué ;
- `NOTE` — récupérer la nomenclature historique exacte des lots 10 à 12.

</details>

🔷 **[↑ Retour au sommaire](#haut)**

---

<a name="capitalisation"></a>

# 11. Capitalisation / clôture

- finaliser le REX machine ;
- distinguer réussites, difficultés et anti-patterns ;
- vérifier le backlog `BEFORE_CLOSE` ;
- transférer les `LATER` / `NOTE` utiles dans la boîte à idées ;
- proposer les améliorations de template détectées sans les propager automatiquement ;
- demander une validation synthétique avant application aux autres roadmaps ;
- archiver roadmap finale + REX ;
- améliorer le template à partir de l’expérience réelle.
