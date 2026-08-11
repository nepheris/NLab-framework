# Framework V2 — cycle de revue V19

> Roadmap de cycle de démonstration. La source de pilotage projet reste [`../doc/roadmap/roadmap.md`](../doc/roadmap/roadmap.md).

## Objectif

Terminer le raccord technique commencé en V18 : la portée native du Theme Workshop doit être utilisée non seulement par les profils de démonstration, mais aussi par les contrôles historiques compatibles.

## Implémenté dans V19

- conservation de la cascade native `global → type → instance` et de la persistance V18 ;
- sélecteur de portée disponible sur Couleurs/Background, Typographie et Densité ;
- profils `Défaut / XS / L / XL / XXL` conservés sur l’API scoped ;
- color pickers raccordés à la portée active ;
- background uni/dégradé/transparent et presets Clair/Sombre/Couleur/Dégradé raccordés à la portée active ;
- bordures (visible, largeur, rayon) raccordées à la portée active ;
- typographie (polices et graisse de titres) raccordée à la portée active ;
- densité preset et réglage fin +/- raccordés à la portée active ;
- lorsqu’une portée `type` ou `instance` est active, les anciens listeners globaux correspondants sont neutralisés pour éviter une double écriture ;
- version V19 affichée dans le titre navigateur, le H1, le badge et le header.

## Statut technique

**🟢 Raccord technique des contrôles historiques compatibles : terminé.**

Le jalon n’est toutefois pas clôturé fonctionnellement : la validation visuelle HUMAN reste requise avant de considérer la mécanique UX comme validée.

## À tester HUMAN

1. Sur Couleurs & Background, choisir `Cet élément`, modifier une couleur et un fond : seul le panneau ciblé doit changer.
2. Choisir `Même type`, modifier les bordures : tous les panneaux `demo-panel` concernés doivent changer, pas les autres types.
3. Choisir `Global`, modifier une couleur ou un fond : le comportement global historique doit rester disponible.
4. Sur Typographie, tester `Cet élément`, `Même type`, puis `Global` et vérifier l’héritage des variables typographiques.
5. Sur Densité, tester preset, `+`, `-` et reset avec les trois portées.
6. Tester les presets de fond avec une portée non globale et confirmer qu’ils ne modifient pas toute la page.
7. Revenir à `Défaut` puis tester `↺ Coins` pour vérifier les resets de couche/propriété.
8. Recharger la page et vérifier la persistance de la session scoped.

## Décision après validation

- si validé : clôturer H001 et passer la priorité suivante à l’industrialisation de JSON Studio ;
- si anomalie bloquante : correction ciblée V20 avant JSON Studio ;
- si anomalie non bloquante : inscrire en backlog et poursuivre l’industrialisation.
