# Header Studio — extraction legacy

## Sources

- MVola V15/V16 — comportements de Header Studio ;
- MadaNotes — navigation/UI ;
- nLab Review V16 — header d’actions, sommaire responsive et libellés icône/texte.

## Décision

Ne pas recopier un header métier ni une barre de navigation spécifique à une application.

`HeaderStudio` devient un moteur générique de composition d’un header : l’application fournit les items et les callbacks, le composant gère ordre, visibilité, présentation, responsive, menu et profils.

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

`resolve({ width })` produit un état pur :

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

Les labels et icônes fallback sont injectés via `textContent` et non `innerHTML`.

Une application peut injecter `iconRenderer(icon, item)` pour produire un nœud DOM d’icône sans coupler HeaderStudio à IconRegistry.

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

## Validation H1

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
- item désactivé.

Résultat Node 22 :

```text
header studio tests: ok
```

## Suites autonomes envisagées

1. tester les cas de groupes multiples et profils responsive plus fins ;
2. ajouter une API de presets d’appareil / stratégie de collapse si nécessaire sans logique métier ;
3. audit d’intégration avec `NavigationWiz`, `IconRegistry` et les patterns de la démo sans modifier leurs fichiers ;
4. synchroniser la branche avec `New`, contrôler le diff et passer en review lorsque le contrat est stable.

Une validation HUMAN n’est utile qu’au moment où le rendu visuel / ergonomique réel doit être arbitré.
