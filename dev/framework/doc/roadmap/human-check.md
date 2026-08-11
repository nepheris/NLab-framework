# 🟣👤 HUMAN — H001 Validation Theme Workshop V18

> Contrôle humain court. Les détails techniques restent dans la roadmap et les fichiers GitHub associés.

## Navigation

### 🗺️ **[RETOUR À LA ROADMAP](./roadmap.md)** <a href="./roadmap.md" target="_blank">↗</a>

- 🤖 [REX machine](./rex.machine.json) <a href="./rex.machine.json" target="_blank">↗</a>
- 🔎 [Roadmap du cycle V18](../../demo/ROADMAP_V18.md) <a href="../../demo/ROADMAP_V18.md" target="_blank">↗</a>
- 🗂️ [Repo](https://github.com/nepheris/NLab-framework) <a href="https://github.com/nepheris/NLab-framework" target="_blank">↗</a>

## Statut

**🟣 H001 — INTERVENTION HUMAINE ACTIVE**

## Pourquoi l'humain intervient

1. confirmer que la portée correspond bien au modèle mental attendu ;
2. vérifier visuellement la cascade `global → type → instance` ;
3. confirmer les profils scoped et le reset par propriété avant raccordement de tous les contrôles Theme Workshop.

## À vérifier

- [ ] `Cet élément` + profil `XXL` : seul le panneau ciblé change ;
- [ ] `Même type` + profil `XS` : tous les panneaux `demo-panel` changent ensemble ;
- [ ] `Global` + profil `L` : tous les éléments `data-theme-editable` reçoivent la couche ;
- [ ] `Défaut` sur une portée : retour à la couche précédente sans effacer les autres portées ;
- [ ] `↺ Coins` : suppression de `borderRadius` uniquement ;
- [ ] rechargement de page : persistance de la session scoped ;
- [ ] vérifier que les anciennes fonctions du Theme Workshop restent opérationnelles.

## Décision attendue

- valider cette mécanique comme base générique ;
- demander une correction ciblée ;
- différer un comportement non bloquant en `LATER` / `NOTE`.

## Point exact de reprise

Dès validation :

> 🎯 **Raccorder progressivement les contrôles Theme Workshop existants à l’API scoped, puis extraire JSON Studio en composant framework autonome.**

La réponse ChatGPT associée doit rester synthétique : statut, changements, point de décision et liens GitHub.
