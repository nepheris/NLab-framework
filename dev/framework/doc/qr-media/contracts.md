# QR / Media — contrats de robustesse

## QRWiz

### Payload URL historique

- sans `type`, le comportement reste `url` pour compatibilité ;
- une URL explicite est résolue par `urlResolver` lorsqu'il existe ;
- `canonical=true` utilise l'URL courante sans hash ni query ;
- sans resolver, l'URL courante du navigateur est utilisée si disponible ;
- un payload vide est refusé avant appel de l'encodeur.

### Payloads structurés

`payload(config)` accepte désormais un `type` explicite :

- `text` : `text` ou `value` est encodé tel quel ;
- `email` / `mail` : URI `mailto:` avec `subject` et `body` encodés en query string ;
- `tel` / `phone` / `telephone` : URI `tel:` avec espaces retirés ;
- `wifi` / `wi-fi` : payload standard `WIFI:` ;
- `contact` / `vcard` : vCard 3.0.

Un `type` inconnu produit une chaîne vide et est donc refusé par `generate()` au même titre qu'un autre payload vide.

#### Wi-Fi

Configuration acceptée directement ou sous `wifi` :

```js
{
  type: 'wifi',
  wifi: {
    ssid: 'Mon réseau',
    password: 'secret',
    security: 'WPA2',
    hidden: false
  }
}
```

- `WEP` reste `WEP` ;
- `open`, `none`, `nopass` deviennent `nopass` et n'émettent pas de champ mot de passe ;
- les autres variantes WPA/WPA2/WPA3 utilisent `WPA`, largement reconnu par les lecteurs QR ;
- `\`, `;`, `,`, `:` et `"` sont échappés dans SSID/mot de passe.

#### Contact / vCard

Le contact accepte notamment `name/fullName`, `firstName`, `lastName`, `organization/org`, `phone/tel`, `email`, `url`, `address` et `note`.

La sortie est une vCard 3.0 à lignes CRLF. Les caractères structurants `\`, `;`, `,` et les retours à la ligne sont échappés. Une adresse objet peut fournir `street`, `city`, `region`, `postalCode/zip` et `country`.

### Génération multiple

`generateMany(entries, options)` produit une liste structurée en conservant strictement l'ordre d'entrée.

Une entrée recommandée est :

```js
{
  batchName: 'menu-ete',
  label: 'Menu été',
  config: { type: 'url', url: '/menus/ete' }
}
```

Les valeurs primitives sont acceptées comme raccourci de `type:'text'`. Pour chaque entrée, le résultat contient :

- `index` : index métier configurable ;
- `position` : position 0-based dans le tableau source ;
- `name` : `batchName`, sinon `name`, sinon `<namePrefix>-<index>` ;
- `label` : libellé fourni ou nom ;
- `ok` ;
- `payload` ;
- `output` généré ou `null` ;
- `error` normalisée (`name`, `message`) ou `null`.

Options :

- `startIndex` : premier index, `1` par défaut ;
- `namePrefix` : préfixe automatique, `qr` par défaut ;
- `stopOnError` : `false` par défaut pour continuer le lot malgré une entrée invalide.

Avec `stopOnError:false`, une erreur reste locale à sa ligne et les entrées suivantes sont générées. Avec `stopOnError:true`, l'erreur est relancée et enrichie par `error.qrBatch` avec le contexte de la ligne fautive.

Le batch reste séquentiel volontairement : ordre déterministe, charge encodeur maîtrisée et comportement identique pour les adaptateurs synchrones ou asynchrones.

### Options normalisées

- `width` : entier borné entre 64 et 4096, défaut 256 ;
- `margin` : entier borné entre 0 et 64, défaut 2 ;
- correction d'erreur : `L`, `M`, `Q` ou `H`, défaut `M` ;
- format : `svg` ou `png`, défaut `svg` ;
- `logoSize` : borné entre 0.10 et 0.32 ;
- `logoRadius` : valeur numérique non négative ;
- `transparent=true` transmet une couleur de fond QR alpha `#00000000`.

### Rendu

`render()` ne dépend plus d'un global `document` ou `Node` :

- SVG : rendu direct via `innerHTML` ;
- Data URL / chaîne : utilisation de `container.ownerDocument` si disponible ;
- sans DOM : la sortie générée est retournée sans `ReferenceError` ;
- objet node-like : remplacement si `nodeType` est présent.

Les valeurs injectées dans l'overlay logo SVG sont échappées.

## MediaWiz

### URL et fallback

L'ordre de résolution est : `url` → `fallbackUrl` → `fallback`.

Les schémas dangereux `javascript:`, `vbscript:` et `data:text/html` sont ignorés. Si l'URL primaire est rejetée mais qu'un fallback sûr existe, le fallback est utilisé.

### Options d'image / vidéo

- `loading` est limité à `lazy` ou `eager` ; toute autre valeur retombe sur `lazy` ;
- `ratio` / `aspectRatio` accepte un nombre positif ou une forme `16/9` ;
- `objectFit` accepte `cover`, `contain`, `fill`, `none`, `scale-down` ;
- les valeurs invalides ne sont pas injectées dans le style.

Les labels, légendes, URLs et styles générés sont échappés avant insertion HTML.

## Compatibilité

- les signatures publiques existantes sont conservées ;
- l'absence de `type` conserve le payload URL historique ;
- les options nouvelles sont facultatives ;
- les SVG inline restent un chemin volontairement brut et doivent donc provenir d'une source de confiance.

## Vérification

`tests/qr-media-robustness.test.mjs` couvre les payloads structurés, le mode batch et le contrat QR/Media historique. Les validations locales du lot donnent :

```text
qr batch tests: ok
qr media robustness tests: ok
```
