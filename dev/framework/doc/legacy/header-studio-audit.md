# Header Studio — audit des implémentations legacy

Base de travail : Review V16 (`de21ec85170112efb23c4d5c987502b9e49dd966`).

## Sources observées

- MVola V15/V16 : header sticky, toolbar responsive et Header Studio avancé ;
- MadaNotes : navigation hiérarchique, quick-nav, états pliables, toolbar flottante/verrouillable et aide contextuelle.

## Décision

Créer une primitive générique `HeaderStudio` / `HeaderModel` au lieu de conserver des listeners spécifiques à la démo.

La logique métier MVola n'est pas reprise ; seuls les comportements génériques le sont.

## Fonctionnalités éprouvées à récupérer

### Composition

- marque/logo + titre + sous-titre ;
- zone de navigation ;
- zone d'actions ;
- séparateurs ;
- commandes libres fournies par le consommateur.

### Commandes

- visible / masquée ;
- ordre configurable ;
- réordre drag/drop ;
- libellé : icône seule / court / long ;
- position du libellé : à côté / dessous ;
- regroupement en menu ou commandes séparées ;
- presets/profils sauvegardables.

### Comportement

- sticky / non-sticky ;
- shadow visible / non visible ;
- fond normal / transparent ;
- hauteur paramétrable ;
- verrouillage du layout ;
- responsive : desktop / tablette / mobile ;
- repli automatique ou passage icône seule aux petits breakpoints.

### Navigation

Les menus hiérarchiques de MadaNotes montrent un modèle réutilisable :

- accès rapides ;
- branches récursives ;
- sections/sous-sections ;
- hover desktop sans casser le clic ;
- possibilité d'associer une aide contextuelle.

Cette navigation devra rester une brique consommée par le Header, pas du code métier intégré au Header.

## Relation avec Theme / Layout

Le Header doit exposer ses propriétés au système de portée :

`Site → famille layout → type header → sous-type → instance`

Les dimensions et styles doivent pouvoir être appliqués selon une portée explicite et testable.

Propriétés candidates :

- height / minHeight / maxHeight ;
- width mode (`full`, `content`) ;
- sticky ;
- shadow ;
- transparent ;
- border ;
- radius ;
- background ;
- density ;
- label mode.

## Ce qui ne doit pas être dupliqué

- icônes → IconRegistry ;
- profils → PresetManager ;
- drag/drop générique → primitive réutilisable si elle existe ;
- panneaux latéraux → DockPanel ;
- thème/couleurs → ThemeEngine ;
- redimensionnement → primitive Layout/Resize commune.

## Séquence d'intégration

1. modèle de configuration pur ;
2. tests ordre/visibilité/libellés ;
3. rendu d'un vrai header de démonstration ;
4. sticky/shadow/transparence ;
5. responsive ;
6. drag/drop ;
7. profils ;
8. raccord au Scope/Layout Lab ;
9. review visuelle dédiée.

## Critères de validation

- le header ressemble à un header de site, pas à une toolbar de test ;
- comportement visible immédiatement dans la preview ;
- toutes les commandes peuvent être réordonnées et masquées sans modifier le HTML source ;
- aucune dépendance au métier MVola/MadaNotes ;
- responsive mobile sans débordement ;
- configuration exportable/réimportable ;
- pas de régression V16 hors branche de travail.
