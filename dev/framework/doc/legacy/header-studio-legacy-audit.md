# Header Studio — extraction legacy

## Sources

- MVola V15/V16 — comportements de Header Studio ;
- MadaNotes — navigation/UI ;
- nLab Review V16 — header d’actions, sommaire responsive et libellés icône/texte.

## Décision

Ne pas recopier un header métier ni une barre de navigation spécifique à une application.

`HeaderStudio` devient un moteur générique de composition d’un header : l’application fournit les items et les callbacks ; le composant gère ordre, visibilité, présentation, responsive, menu et profils.

Le composant ne connaît ni MVola, ni MadaNotes, ni les routes d’une application.

## Périmètre réservé Agent A

- `dev/framework/components/header-studio.js`
- `dev/framework/tests/header-studio*.mjs`
- `dev/framework/doc/legacy/header-studio*.md`

## H1 — état / responsive / profils

### Modèle d’item

Un item accepte notamment :

- `id` obligatoire et unique ;
- `labels.short` / `labels.long` ou `label` ;
- `icon` ;
- `visible` ;
- `order` ;
- `position`: `start | center | end | menu` ;
- `labelMode`: `auto | icon | short | long` ;
- `collapse`: `keep | menu | hide` ;
- `group` ;
- `href` ;
- `disabled`.

Les IDs dupliqués ou absents sont rejetés tôt.

### Ordre et visibilité

API :

- `orderedItems()` ;
- `setVisible()` / `toggleVisible()` ;
- `setPosition()` ;
- `setItemLabelMode()` ;
- `reorder()` ;
- `moveItem()` ;
- `resetItems()` ;
- `itemState()` / `applyItemState()`.

`reorder()` accepte une liste partielle : les items explicitement nommés passent en tête dans l’ordre fourni ; les autres conservent leur ordre relatif.

### Labels

Le composant distingue :

- `icon` — icône seule, avec `aria-label` / title long ;
- `short` — libellé court ;
- `long` — libellé complet ;
- `auto` — long en mode normal, court en mode compact.

Un `labelMode` global peut être surchargé par item.

### Responsive

`compactBreakpoint` détermine le mode :

- largeur supérieure → `full` ;
- largeur inférieure ou égale → `compact`.

En compact, chaque item décide :

- `keep` — reste dans sa zone ;
- `menu` — migre dans le menu ;
- `hide` — disparaît.

Un item dont `position=menu` reste toujours dans le menu.

`resolve({ width })` produit un état pur avec :

- `mode` ;
- zones `start`, `center`, `end`, `menu` ;
- présentation résolue de chaque item ;
- nombre d’items visibles.

### Groupes / menu

`group` est conservé comme métadonnée et exposé via `data-header-group` dans le rendu.

La zone menu est rendue dans un `details/summary` natif et les items reçoivent `role=menuitem`.

### Drag & drop

Lorsque `reorderable=true` :

- les items rendus sont `draggable` ;
- `dragstart/drop` déclenche un déplacement déterministe ;
- `onReorder(itemState)` permet au consommateur de persister le nouvel ordre ;
- aucun stockage n’est imposé par le drag/drop.

### Actions

Le composant ne contient aucune logique métier.

- un item avec `href` est rendu comme lien ;
- sinon comme bouton ;
- `onAction({ id, item, event })` transmet l’action au consommateur ;
- un item `disabled` ne déclenche pas l’action.

Les labels et icônes fallback sont injectés via `textContent`, jamais via `innerHTML`.

### Profils / presets

Format versionné `1`.

Un profil contient :

- `labelMode` ;
- `compactBreakpoint` ;
- `menuLabel` ;
- état des items : visibilité, ordre, position, labelMode, collapse.

API :

- `snapshotProfile()` ;
- `registerProfile()` / `registerProfiles()` ;
- `profileNames()` / `profileState()` / `removeProfile()` ;
- `applyProfile()` ;
- `serializeProfiles()` / `importProfiles()` ;
- `saveProfiles()` / `loadProfiles()`.

L’import de profils est atomique : un payload invalide ne remplace pas la collection existante.

Le stockage est injectable via `getItem/setItem`; aucune dépendance directe à `localStorage`.

## H2 — audit d’intégration et sécurité

### NavigationWiz

`NavigationWiz` reste une brique indépendante : il construit le sommaire de contenu et suit la section active. `HeaderStudio` ne doit pas absorber cette logique.

L’intégration applicative se fait simplement en déclarant dans HeaderStudio un item « Sommaire » / « Navigation » dont le callback pilote l’UI NavigationWiz. Cette séparation évite de dupliquer la hiérarchie de navigation dans le header.

### IconRegistry

`IconRegistry.render()` retourne actuellement une chaîne SVG. HeaderStudio ne l’injecte volontairement pas par `innerHTML`.

Le contrat d’intégration est :

```js
iconRenderer(iconId, item, documentRef)
```

L’adaptateur peut retourner un vrai nœud DOM construit par le consommateur. Si l’adaptateur retourne une chaîne, HeaderStudio la traite comme texte et non comme HTML.

Cette frontière conserve la possibilité d’utiliser IconRegistry sans transformer HeaderStudio en point d’injection SVG/HTML arbitraire.

### Hrefs sûrs

Les `href` relatifs, ancres et URLs normales restent acceptés.

Les schémas exécutables ou embarqués suivants sont rejetés dès la construction de l’item :

- `javascript:` ;
- `data:` ;
- `vbscript:`.

Un `href` refusé produit une erreur explicite `Unsafe header href for <id>` avant tout rendu DOM.

### Dépendances

HeaderStudio conserve **zéro import runtime** vers :

- `NavigationWiz` ;
- `IconRegistry` ;
- `BrowserStorage` ;
- la démo.

Les interactions se font par callbacks/adaptateurs et stockage injecté.

## Validation automatisée

Test : `dev/framework/tests/header-studio.test.mjs`.

Couverture :

- IDs obligatoires/uniques ;
- ordre partiel et déplacement ;
- visibilité / positions ;
- full/compact ;
- modes icon/short/long/auto ;
- politiques keep/menu/hide ;
- round-trip d’état ;
- profils isolés et import atomique ;
- persistance injectable ;
- rendu DOM / ARIA ;
- callback action ;
- drag/drop ;
- item désactivé ;
- rejet des `href` dangereux ;
- lien relatif conservé comme ancre ;
- adaptateur d’icône retournant un nœud DOM.

Résultat Node 22 après H2 :

```text
header studio tests: ok
```

## Restant avant revue

Travail autonome :

1. contrôler le `New` courant et les locks parallèles ;
2. comparer la branche au `New` courant et vérifier que le diff reste limité aux trois fichiers Header Studio ;
3. synchroniser la branche avec `New` si celui-ci a avancé ;
4. créer la PR et effectuer l’audit final API / sécurité / tests ;
5. passer le lock en `review` lorsque ces contrôles sont verts.

Une validation HUMAN n’est utile qu’au moment où le rendu visuel / ergonomique réel du header doit être arbitré.
