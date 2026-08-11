# 🗺️ Roadmap GitHub — nLab Framework

> Objectif : industrialiser le framework nLab jusqu’à un socle générique, testable et réutilisable, puis le confronter à un vrai cas métier. Principe : **pilotage immédiatement visible, détail à la demande**.

<a name="haut"></a>

## 1. Pilotage

### 1.1 Phase active

> 👇👇👇 **POINT DE TRAVAIL ACTIF**  
> 🎯 **Phase active : [Lot 8B — Consolidation UX / industrialisation](#phase-8b)**  
> 🟣👤 **Jalon HUMAN actif : [H001 — validation Theme Workshop V18](#human-h001)**

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
- [10. 💡 Backlog](#backlog)
- [11. Capitalisation / clôture](#capitalisation)

</details>

<a name="fichiers-associes"></a>

### 📎 1.3 Fichiers associés

- 🗂️ **Dépôt :** [nepheris/NLab-framework](https://github.com/nepheris/NLab-framework) <a href="https://github.com/nepheris/NLab-framework" target="_blank">↗</a>
- 🤖 **REX machine :** [`rex.machine.json`](./rex.machine.json) <a href="./rex.machine.json" target="_blank">↗</a>
- 🟣👤 **HUMAN actif :** [`human-check.md`](./human-check.md) <a href="./human-check.md" target="_blank">↗</a>
- 🔎 **Cycle courant :** [`../../demo/ROADMAP_V18.md`](../../demo/ROADMAP_V18.md) <a href="../../demo/ROADMAP_V18.md" target="_blank">↗</a>
- 🔎 **Cycle précédent :** [`../../demo/ROADMAP_V17.md`](../../demo/ROADMAP_V17.md)

<a name="legende"></a>

### 📘 1.4 Légende

<details>
<summary><strong>Cliquer pour déplier / replier</strong></summary>

- ⚪ `0 %` — à faire
- 🟡 `1–99 %` — en cours
- 🟢 `100 %` — terminé / validé
- ⏸️ `—` — différé volontairement
- 🟣👤 — intervention humaine
- 🤖 — mémoire machine / REX
- 💡 — idée / capitalisation
- 🔎 — audit / contrôle
- 🎯 — point actif

</details>

<a name="vue-globale"></a>

### 📊 1.5 Vue globale

<details open>
<summary><strong>📊 Avancement global — ouvert par défaut</strong></summary>

| Domaine | État | Avancement | Cible |
|---|---|---:|---|
| Architecture Framework | 🟡 | ~92 % | socle propre, factorisé et stable |
| Catalogue / Playground | 🟡 | ~82 % | banc d’essai complet |
| UX / concepts | 🟡 | ~72 % | comportements validés humainement |
| Composants industrialisés | 🟡 | ~55 % | prototypes extraits en composants génériques |
| JSON / data métier | 🟡 | ~50 % | édition + relations inter-JSON robustes |
| Tests / robustesse | 🟡 | ~32 % | non-régression et cas négatifs |
| Intégration métier | 🟡 | ~20 % | crash-test Recettes du Cœur |

```text
ARCHITECTURE FRAMEWORK       ████████████████████  ~92 %
CATALOGUE / PLAYGROUND      ████████████████░░░░  ~82 %
UX / CONCEPTS               ██████████████░░░░░░  ~72 %
COMPOSANTS INDUSTRIALISÉS   ███████████░░░░░░░░░  ~55 %
JSON / DATA MÉTIER          ██████████░░░░░░░░░░  ~50 %
TESTS / ROBUSTESSE          ██████░░░░░░░░░░░░░░  ~32 %
INTÉGRATION MÉTIER          ████░░░░░░░░░░░░░░░░  ~20 %
```

> Estimation de maturité fonctionnelle et architecturale, pas pourcentage de lignes de code.

</details>

<a name="etat-actuel"></a>

### 📍 1.6 État actuel

<details open>
<summary><strong>📍 État actuel — ouvert par défaut</strong></summary>

```text
Catalogue / Playground passé en V18
↓
Theme Workshop : portée global / type / instance désormais implémentée dans le composant framework
↓
Profils scoped + reset par propriété disponibles et testables dans la démo
↓
POINT ACTIF : validation HUMAN de la portée V18
↓
PROCHAINE ÉTAPE : brancher progressivement les contrôles Theme Workshop sur cette API
puis extraire JSON Studio en composant framework autonome
```

**Process canonique :**

```text
Idée → prototype démo → validation UX → extraction framework → démo générique → test métier
```

</details>

<a name="jalons-human"></a>

### 🟣👤 1.7 Jalons HUMAN

- 🟣👤 **H001 — validation Theme Workshop V18 : actif.** → [voir détail](#human-h001)
- ⚪ **H002 — validation de sortie du Lot 8B :** après industrialisation prioritaire.
- ⚪ **H003 — validation avant crash-test Recettes du Cœur :** futur.

---

<a name="lots-historiques"></a>

# 2. Lots historiques 0 à 8

<details>
<summary><strong>📈 Lots 0 à 2 — socle initial — 🟢 100 %</strong></summary>

Socle initial considéré terminé dans la roadmap historique.
</details>

<details>
<summary><strong>📈 Lots 3 à 8 — construction Framework V2 — 🟡 largement réalisée</strong></summary>

Blocs couverts : UI/composants, thèmes, data structurée, renderers, sorties, diagnostic et Catalogue/Playground. La numérotation historique exacte ne doit pas être réinventée sans source fiable.
</details>

---

<a name="phase-8b"></a>

# 3. Lot 8B — Consolidation UX / industrialisation

<details open>
<summary><strong>🎯📈 Lot 8B — Consolidation UX / industrialisation — 🟡 ACTIVE</strong></summary>

| État | Avancement | Action |
|---|---:|---|
| 🟢 | 100 % | V17 : banc d’essai UX/data enrichi |
| 🟢 | 100 % | V18 : API de portée `global / type / instance` extraite dans `ThemeWorkshop` |
| 🟢 | 100 % | profils scoped + reset complet / propriété implémentés |
| 🟡 | ~80 % | validation UX des thèmes / profils / portée |
| 🟡 | ~50 % | extraction globale des prototypes vers le framework |
| ⚪ | 0 % | **valider la portée V18 sur cas instance / type / global** |
| ⚪ | 0 % | brancher les contrôles existants sur l’API scoped |
| ⚪ | 0 % | industrialiser JSON Studio en composant autonome |
| ⚪ | 0 % | convergence TableWiz / DataWiz / ResultSet |
| ⚪ | 0 % | clôture HUMAN du Lot 8B |

<a name="human-h001"></a>
<details open>
<summary><strong>🟣👤 H001 — Validation Theme Workshop V18 — ACTIF</strong></summary>

**À contrôler :**
1. `Cet élément` ne modifie qu’une instance ;
2. `Même type` modifie les panneaux typés identiques ;
3. `Global` touche tous les éléments éditables ;
4. `Défaut` revient à la couche précédente ;
5. `↺ Coins` supprime seulement `borderRadius` ;
6. la session scoped persiste après rechargement.

**Contrôle détaillé :** [`human-check.md`](./human-check.md)

**Après validation :** raccordement des contrôles Theme Workshop puis JSON Studio.
</details>

</details>

---

<a name="lot-9"></a>

# 4. Lot 9 — Crash-test métier Recettes du Cœur

<details>
<summary><strong>📈 Lot 9 — ⚪ 0 %</strong></summary>

1. atelier privé `Sites/Recettes-du-Coeur/atelier/` ;
2. utilisation des briques génériques ;
3. génération du `web/` ;
4. validation ;
5. publication Preview.

Le cas métier éprouve le framework sans dupliquer la logique métier dans celui-ci.
</details>

---

<a name="lots-futurs"></a>

# 5. Lots 10 à 12 — futur

<details>
<summary><strong>📈 Lots 10 à 12 — ⏸️ intitulés historiques à récupérer</strong></summary>

Intitulés volontairement non réinventés tant qu’aucune source historique fiable n’est retrouvée.
</details>

---

<a name="industrialisation"></a>

# 6. Séquence d’industrialisation

<details open>
<summary><strong>📈 Priorités après V18</strong></summary>

1. **Theme Workshop** — valider V18 puis raccorder les contrôles existants à l’API scoped.
2. **JSON Studio** — composant framework, validation, undo/redo, historique, diff, relations multiples.
3. **TableWiz / DataWiz** — DataSource, ResultSet et renderers partagés.
4. **Search / Set Filter** — pondération, stopwords, locale, suggestions multi-colonnes.
5. **Media Renderer** — fond, ratio, object-fit, bordures, coins, masque/détourage.
6. **QRWiz** — contenus typés, presets, logos, validation de lisibilité.
7. **NotificationCenter** — thèmes `info / success / warning / error / dev`.
8. **CodeBlock** — presets par langage et JSON hiérarchique.
9. **Consolidation / tests / documentation**.
10. **Lot 9 — crash-test Recettes du Cœur**.

</details>

---

<a name="methode-autonome"></a>

# 9. Méthode autonome

<details open>
<summary><strong>⚙️ Mode d’exécution</strong></summary>

```text
1. lire roadmap + REX + décisions canoniques
2. vérifier HEAD GitHub
3. analyser cas réel
4. minimum nécessaire / POC si utile
5. tests positifs + négatifs
6. simplifier / factoriser
7. implémenter
8. re-tester
9. audit vérité / sécurité / factorisation
10. mettre à jour REX au jalon structurel
11. re-vérifier HEAD
12. commit sans force
13. actualiser roadmap
14. continuer si critère de sortie satisfait
```

**Version démo :** chaque commit qui modifie effectivement la page incrémente sa version visible.

</details>

---

<a name="backlog"></a>

# 10. 💡 Backlog

| Classe | Usage | Bloque ? |
|---|---|---|
| `BEFORE_CLOSE` | nécessaire avant fermeture du lot actif | oui |
| `LATER` | évolution moyen / long terme | non |
| `NOTE` | remarque / enseignement | non |

<details open>
<summary><strong>BEFORE_CLOSE — Lot 8B</strong></summary>

- valider la portée Theme Workshop V18 ;
- raccorder les contrôles historiques au scope réel ;
- extraction JSON Studio ;
- convergence minimale TableWiz / DataWiz ;
- nettoyage des comportements encore spécifiques à la démo ;
- validation HUMAN de sortie 8B.

</details>

<details>
<summary><strong>LATER / NOTE</strong></summary>

- `LATER` — vue graphique DataWiz / ResultSet ;
- `LATER` — détourage / masque avancé ;
- `LATER` — éditeur riche distinct du CodeBlock ;
- `NOTE` — récupérer les intitulés historiques exacts des lots 10 à 12.

</details>

---

<a name="capitalisation"></a>

# 11. Capitalisation / clôture

- finaliser le REX machine ;
- distinguer réussites, difficultés et anti-patterns ;
- vérifier `BEFORE_CLOSE` ;
- transférer les `LATER` / `NOTE` utiles ;
- proposer les améliorations de template détectées sans propagation automatique ;
- demander validation avant intégration au template canonique et avant propagation aux autres roadmaps ;
- archiver roadmap finale + REX.
