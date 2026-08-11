# 🟣👤 HUMAN — H001 Validation Theme Workshop V19

> Contrôle humain court. Les détails techniques restent dans la roadmap et les fichiers GitHub associés.

## Navigation

### 🗺️ **[RETOUR À LA ROADMAP](./roadmap.md)** <a href="./roadmap.md" target="_blank">↗</a>

- 🤖 [REX machine](./rex.machine.json) <a href="./rex.machine.json" target="_blank">↗</a>
- 🔎 [Roadmap du cycle V19](../../demo/ROADMAP_V19.md) <a href="../../demo/ROADMAP_V19.md" target="_blank">↗</a>
- 🗂️ [Repo](https://github.com/nepheris/nLab-Web-Framework) <a href="https://github.com/nepheris/nLab-Web-Framework" target="_blank">↗</a>

## Statut

**🟣 H001 — INTERVENTION HUMAINE ACTIVE**

**État technique :** le raccord des contrôles historiques compatibles à l’API scoped est maintenant intégré en V19. Le jalon reste ouvert uniquement pour validation UX/visuelle.

## Pourquoi l'humain intervient

1. confirmer que la portée correspond bien au modèle mental attendu ;
2. vérifier visuellement la cascade `global → type → instance` ;
3. confirmer les profils scoped, les resets et le comportement des contrôles historiques raccordés avant passage à JSON Studio.

## À vérifier

- [ ] `Cet élément` + profil `XXL` : seul le panneau ciblé change ;
- [ ] `Même type` + profil `XS` : tous les panneaux `demo-panel` changent ensemble ;
- [ ] `Global` + profil `L` : tous les éléments `data-theme-editable` reçoivent la couche ;
- [ ] `Défaut` sur une portée : retour à la couche précédente sans effacer les autres portées ;
- [ ] `↺ Coins` : suppression de `borderRadius` uniquement ;
- [ ] Couleurs / color picker : aucune écriture globale parasite en portée Type ou Instance ;
- [ ] Background + presets Clair/Sombre/Couleur/Dégradé : respect de la portée active ;
- [ ] Bordures : visible, largeur et rayon respectent la portée active ;
- [ ] Typographie : polices et graisse de titres respectent la portée active ;
- [ ] Densité : preset, +/- et reset respectent la portée active ;
- [ ] rechargement de page : persistance de la session scoped ;
- [ ] vérifier que les anciennes fonctions globales du Theme Workshop restent opérationnelles en portée Global.

## Décision attendue

- valider cette mécanique comme base générique et clôturer H001 ;
- demander une correction ciblée V20 ;
- différer un comportement non bloquant en `LATER` / `NOTE`.

## Point exact de reprise

Après validation H001 :

> 🎯 **Industrialiser JSON Studio en composant framework autonome, puis poursuivre la convergence TableWiz / DataWiz / ResultSet.**

La réponse ChatGPT associée doit rester synthétique : statut, changements, point de décision et liens GitHub.
