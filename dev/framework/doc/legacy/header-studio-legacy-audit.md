# Header Studio — extraction legacy et revue d’intégration

## Décision

`HeaderStudio` est une primitive générique de composition de header. L’application fournit les items, callbacks et adaptateurs ; le composant gère ordre, visibilité, responsive, menu, libellés et profils. Il ne connaît ni le métier, ni les routes d’une application, ni la démo.

## Périmètre Agent A

- `dev/framework/components/header-studio.js`
- `dev/framework/tests/header-studio*.mjs`
- `dev/framework/doc/legacy/header-studio*.md`

## Contrat H1

### Items

Un item accepte notamment : `id`, labels court/long, icône, visibilité, ordre, position `start|center|end|menu`, `labelMode`, politique responsive `keep|menu|hide`, groupe, href et état disabled.

Les IDs absents ou dupliqués sont rejetés tôt.

### Ordre / visibilité / responsive

API principale :

- `orderedItems()` ;
- `setVisible()` / `toggleVisible()` ;
- `setPosition()` ;
- `setItemLabelMode()` / `setLabelMode()` ;
- `reorder()` / `moveItem()` / `resetItems()` ;
- `itemState()` / `applyItemState()` ;
- `resolve({ width })`.

`resolve()` produit les zones `start`, `center`, `end`, `menu`. En mode compact, un item peut rester, migrer vers le menu ou disparaître selon sa politique `collapse`.

### Rendu

Le rendu utilise des éléments DOM natifs, `textContent` et des attributs ARIA. Aucun HTML ou SVG arbitraire n’est injecté via `innerHTML`.

`iconRenderer(iconId, item, documentRef)` peut retourner un vrai nœud DOM. Une chaîne retournée par l’adaptateur reste du texte.

Les actions restent applicatives via `onAction`. Le drag/drop appelle `onReorder(itemState)` et n’impose aucun stockage.

### Profils

Les profils sont versionnés et peuvent capturer label mode, breakpoint, libellé de menu et état des items. L’import est atomique et le stockage est injectable via `getItem/setItem` ; il n’existe aucune dépendance directe à `localStorage`.

## H2 — frontières d’intégration

### NavigationWiz

NavigationWiz reste indépendante. HeaderStudio peut exposer un item « navigation » dont le callback pilote l’UI externe, sans absorber la hiérarchie de navigation.

### IconRegistry

HeaderStudio ne consomme aucune chaîne SVG brute. L’adaptation se fait par le callback `iconRenderer` et un nœud DOM explicite.

### Dépendances runtime

HeaderStudio conserve zéro import vers NavigationWiz, IconRegistry, BrowserStorage ou la démo.

## Revue sécurité avant intégration

La revue autonome précédant l’intégration a ajouté deux durcissements.

### 1. Normalisation des schémas d’URL

Avant contrôle, les caractères de contrôle et espaces ASCII de la partie schéma sont neutralisés pour la décision de sécurité. Un schéma interdit reste donc refusé même s’il est obfusqué par un retour ligne, une tabulation ou un autre caractère de contrôle.

Les ancres, chemins relatifs et schémas ordinaires restent inchangés dans la valeur rendue.

### 2. Clonage défensif des profils

Le clone récursif des objets utilise désormais `Object.defineProperty()` pour créer chaque propriété propre. Une propriété JSON nommée `__proto__` reste ainsi une propriété de données ordinaire du clone et ne modifie pas son prototype.

Cette correction protège les profils importés tout en préservant leur contenu JSON.

## Validation automatisée

Test : `dev/framework/tests/header-studio.test.mjs`.

Couverture :

- IDs obligatoires et uniques ;
- ordre, déplacement, visibilité et positions ;
- modes full/compact ;
- libellés icon/short/long/auto ;
- politiques keep/menu/hide ;
- round-trip d’état ;
- profils, import atomique et stockage injectable ;
- DOM / ARIA / callbacks / drag-drop ;
- item désactivé ;
- liens relatifs ;
- adaptateur d’icône DOM ;
- refus des schémas dangereux, y compris obfusqués par caractères de contrôle ;
- conservation sûre d’une propriété propre `__proto__` dans un profil importé.

Node 22 après revue :

```text
header studio tests: ok
header studio security review tests: ok
```

Blob exact du moteur testé et publié :

```text
1017be6f14af7027fb0c0b1259ac67d9e9286124
```

## Critère de sortie

Le moteur générique peut être intégré sans validation visuelle. La **validation HUMAN reste nécessaire uniquement lors du raccord dans une démo/application réelle**, pour juger ergonomie, densité, comportement compact et cohérence visuelle. Elle ne bloque pas l’intégration de la primitive testée dans le framework.
