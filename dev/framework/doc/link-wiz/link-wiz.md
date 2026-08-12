# LinkWiz — contrat de lien L1

## Rôle

`LinkWiz` normalise et rend les destinations interactives du framework sans absorber `UrlResolver`, `MediaWiz`, la navigation applicative ou le thème.

Il répond au contrat transverse du backlog UX : distinguer type de destination, cible, accessibilité, présentation et action, avec une hiérarchie qui évite les ancres HTML imbriquées.

## Types

- `anchor` — ancre de page, `href` commençant par `#` ;
- `section` — section/sous-section interne ;
- `page` — page ou chemin interne ;
- `external` — destination externe ;
- `media` — document/média ;
- `action` — action framework identifiée par `actionId`.

Sans type explicite, LinkWiz infère `action`, `anchor`, `external` ou `page` à partir du descripteur.

## Cibles

- `same` — navigation normale ;
- `new` — nouvel onglet/contexte avec `rel=noopener noreferrer` ;
- `viewer` — surface pilotée par callback `navigate`, destinée à un viewer interne ;
- `download` — ancre avec attribut `download` et nom optionnel.

Les liens externes utilisent `new` par défaut et ajoutent aussi le token `external` au `rel`.

## Présentations

Le descripteur accepte :

- `text` ;
- `button` ;
- `image` ;
- `thumbnail` ;
- `card` ;
- `surface`.

Le rendu visuel détaillé reste injecté via `contentRenderer(link, documentRef)`. LinkWiz fournit le contrat et les attributs, pas le métier graphique.

## Accessibilité

Le contrat supporte `title`, `ariaLabel` / `aria-label` et `alt`.

Une présentation `image` ou `thumbnail` non décorative doit disposer d’un nom accessible (`alt` ou `ariaLabel`).

Les liens désactivés exposent `aria-disabled=true` et sortent de la tabulation.

Une surface navigable qui ne peut pas utiliser `<a>` reçoit `role=link`, `tabindex=0` et répond à Entrée/Espace.

## Sécurité des href

Avant décision sur le schéma, LinkWiz retire les caractères ASCII de contrôle/espacement de la partie analysée. Les schémas exécutables/embarqués interdits restent ainsi refusés même lorsqu’ils sont obfusqués par retour ligne ou tabulation.

La valeur originale d’un href accepté n’est pas réécrite.

Les ancres de type `anchor` doivent commencer par `#`.

Erreurs structurées principales :

- `INVALID_DEFINITION` ;
- `HREF_REQUIRED` ;
- `UNSAFE_HREF` ;
- `INVALID_ANCHOR` ;
- `ACTION_ID_REQUIRED` ;
- `ACCESSIBLE_NAME_REQUIRED`.

## Hiérarchie d’actions / ancres imbriquées

Si une destination navigable est rendue dans un conteneur déjà situé sous une balise `<a>`, LinkWiz **ne crée pas une seconde ancre**.

Il rend une surface `span[role=link]` et délègue l’activation à :

```js
navigate({ href, target, link, event })
```

Le résultat de `render()` expose `nestedAnchorAvoided=true` dans ce cas.

La même stratégie est utilisée pour `target=viewer`, afin que le viewer interne soit réellement piloté par le consommateur plutôt que par la navigation navigateur.

## Actions framework

Un descripteur `type=action` exige `actionId` et est rendu comme bouton. L’activation appelle :

```js
onAction({ actionId, link, event })
```

Un item disabled n’émet pas l’action.

## Icône externe

Les liens externes peuvent afficher une icône standard. Par défaut le fallback est `↗` ; un consommateur peut injecter un vrai nœud DOM via `externalIconRenderer`.

Aucune chaîne HTML n’est injectée par `innerHTML`.

## États CSS

`stateClasses()` fournit les classes sémantiques :

- `nlab-link` ;
- `nlab-link--<type>` ;
- `nlab-link--<presentation>` ;
- `nlab-link--normal|active|disabled`.

Les pseudo-états `hover`, `focus`, `visited` restent naturellement gérés par CSS/ThemeWiz et ne sont pas stockés comme état métier.

## Vérification

Test : `dev/framework/tests/link-wiz.test.mjs`.

Node 22 sur le prototype L1 :

```text
link wiz tests: ok
```

Couverture :

- inférence anchor/page/external/action ;
- sécurité `new` et `rel` ;
- href obfusqué ;
- download / viewer ;
- accessibilité image ;
- disabled ;
- action callback ;
- viewer callback ;
- prévention d’ancre imbriquée ;
- clone défensif des metadata.

## Frontières

Ce lot ne modifie pas :

- `UrlResolver` ;
- `MediaWiz` ;
- `ThemeWiz` ;
- la démo ;
- CodeBlock / Inspector / scopes Agent B.

Les raccords MediaWiz → LinkWiz et catalogue visuel seront des lots d’intégration séparés après stabilisation du contrat.
