# Framework V2 — cycle de revue V18

> Roadmap de cycle de démonstration. La source de pilotage projet reste [`../doc/roadmap/roadmap.md`](../doc/roadmap/roadmap.md).

## Objectif

Valider la première extraction réelle d’un comportement auparavant simulé dans la démo : la portée du Theme Workshop devient une capacité du composant framework.

## Implémenté dans V18

- `ThemeWorkshop` stocke désormais des couches `global / type / instance` ;
- cascade d’application : `global → type → instance`, avec compatibilité des anciens patches par ID ;
- tokens CSS et styles peuvent être scopés ;
- reset complet d’une portée ou reset d’une propriété précise ;
- profils capables de mémoriser `scope + target + patch` ;
- export Workshop passe en version 3 et inclut les portées/profils ;
- la démo marque les panneaux Theme Workshop comme éléments éditables typés ;
- profils visuels `Défaut / XS / L / XL / XXL` réellement appliqués via le composant ;
- affichage du nombre d’éléments touchés selon la portée choisie ;
- test ciblé de reset des coins ;
- version V18 affichée dans le titre navigateur, le H1, le badge et le header.

## À tester HUMAN

1. Sur le panneau Couleurs, choisir `Cet élément`, puis `XXL` : seul le panneau doit changer.
2. Choisir `Même type`, puis `XS` : les panneaux de même type doivent changer ensemble.
3. Choisir `Global`, puis `L` : tous les éléments `data-theme-editable` doivent recevoir la couche globale.
4. Revenir à `Défaut` sur chaque portée et vérifier le retour à la cascade précédente.
5. Tester `↺ Coins` : seule la propriété `borderRadius` de la portée active doit être supprimée.
6. Recharger la page et vérifier la persistance de la session V18.

## Prochaine passe prioritaire

1. valider/corriger le comportement des portées V18 ;
2. brancher progressivement les contrôles existants du Theme Workshop sur cette API de portée, au lieu des écritures globales historiques ;
3. démarrer l’extraction de JSON Studio en composant framework autonome ;
4. conserver les améliorations non bloquantes dans le backlog canonique.
