# TypographyWiz — contrat TY1

## Rôle

`TypographyWiz` normalise les paramètres typographiques sans écrire dans le DOM, ThemeEngine, Theme Workshop, V20 ou la démo.

Le moteur couvre : famille, taille, graisse, style, hauteur de ligne, espacement des lettres, alignement, transformation, décoration et portée descriptive.

## Portée

- `global`
- `type`
- `instance`

`target` est optionnel. Comme BackgroundWiz, la portée est descriptive uniquement : aucune écriture scoped n’est effectuée par le moteur.

## Familles

`fontFamily` accepte une chaîne ou une liste. Les noms simples restent tels quels ; les noms contenant des espaces sont quotés.

La normalisation est idempotente : un descripteur déjà normalisé comme `Inter, sans-serif` peut être renormalisé, fusionné ou snapshoté sans devenir un seul nom de police re-quoté.

Les caractères d’injection CSS et fonctions `url()/expression()/image-set()` sont refusés.

## Dimensions

### Taille

Nombre → pixels, ou chaîne avec unités sûres : `px`, `rem`, `em`, `%`, `vw`, `vh`, `ch`, `ex`.

Une taille doit être strictement positive.

### Line-height

Accepte une valeur unitaire positive ou une longueur sûre. Valeur par défaut : `1.5`.

### Letter-spacing

Accepte `normal` ou une longueur sûre, y compris négative.

Les expressions CSS arbitraires telles que `calc()` ne font pas partie de TY1.

## Graisse et styles

`fontWeight` : entier `1..1000` ou `normal / bold / bolder / lighter`.

`fontStyle` : `normal / italic / oblique`.

`textAlign` : `start / end / left / right / center / justify`.

`textTransform` : `none / uppercase / lowercase / capitalize`.

`textDecoration` : `none / underline / overline / line-through`.

## Sorties

- `normalize()` — descripteur canonique ;
- `style()` — objet de propriétés CSS ;
- `variables()` — variables CSS à préfixe configurable ;
- `merge(base, override)` — fusion puis normalisation ;
- `snapshot()` — clone défensif canonique.

## Erreurs structurées

- `INVALID_TYPOGRAPHY`
- `INVALID_CSS_TOKEN`
- `INVALID_LENGTH`
- `INVALID_WEIGHT`

## Vérification exacte

Moteur : `c3f7ae407b02e1534c1245d36b6f9806f26e87cd`  
Test : `21151b6d0b616b7de5b5a11eae9bd83bb21b5812`

Node 22 :

```text
typography wiz tests: ok
```

La revue a détecté et corrigé avant publication un défaut d’idempotence des listes de familles : un descripteur normalisé `Inter, sans-serif` est désormais renormalisé correctement.

## Suite

Le choix/catalogue réel des polices, les styles visuels finaux et le raccord scoped à V20 restent des tâches d’intégration/HUMAN séparées.
