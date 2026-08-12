# ContextHelpPanel — panneau d'aide contextuelle latéral

## Objectif

`ContextHelpPanel` fournit le **modèle DOM-free** du panneau d'aide contextuelle latéral demandé par le backlog UX. Il est volontairement distinct de `FloatingPanel` : il représente une aide persistante ancrée à gauche ou à droite, repliable, avec navigation historique.

Le rendu visuel reste un adaptateur ultérieur ; le présent contrat stabilise l'état et la résolution du contenu.

## Source de contenu

Le constructeur accepte un provider `help` injectable. Il peut s'agir de `HelpWiz`, d'une fonction ou d'un faux provider de test.

Avec `HelpWiz`, le panneau appelle :

```js
help.content(id, { experience: 'visitor' | 'webmaster' })
```

`HelpWiz` reste inchangé. Le panneau peut aussi recevoir directement le `detail` d'un événement `nlab:help` :

```js
panel.open(event.detail);
```

## État

- `open` / fermé ;
- `collapsed` / déplié ;
- côté `left | right` ;
- largeur 240..720 px ;
- expérience `visitor | webmaster` ;
- aide active ;
- historique borné avec back/forward.

Un panneau replié reste ouvert mais son `descriptor().width` devient 48, tandis que `expandedWidth` conserve la largeur choisie.

## API

- `open(idOrContent, { replace })` ;
- `close()` / `reopen()` ;
- `setCollapsed()` / `toggleCollapsed()` ;
- `setExperience()` ;
- `setSide()` / `setWidth()` ;
- `back()` / `forward()` ;
- `clearHistory({ keepCurrent })` ;
- `current()` ;
- `descriptor()` ;
- `snapshot()`.

`open('id')` vérifie que le provider peut réellement résoudre l'aide ; une entrée inconnue retourne `{ ok:false, code:'HELP_NOT_FOUND' }` sans polluer l'historique.

## Expérience visitor / webmaster

Changer `experience` ne duplique pas l'historique. Le contenu de l'entrée active est résolu à la demande dans le mode courant. Une même aide peut ainsi exposer sa section `technical` uniquement en mode webmaster, conformément au contrat `HelpWiz`.

## Historique

Une nouvelle aide supprime le forward historique, comme une navigation classique. `maxHistory` est borné entre 1 et 128 entrées. `clearHistory({keepCurrent:true})` conserve uniquement l'aide active.

## Descripteur de rendu

`descriptor()` retourne un plan neutre :

- `kind: 'context-help-panel'` ;
- ouverture/repli ;
- côté et largeur ;
- contenu courant ;
- `canBack/canForward` ;
- métadonnées ARIA (`role: complementary`, label, expanded).

Aucun HTML/CSS n'est généré par ce modèle.

## Robustesse

Les contenus inline sont clonés défensivement et doivent être JSON-safe. Cycles, nombres non finis, prototypes non standards et clés sensibles sont refusés. Les erreurs du provider sont remappées en `HELP_PROVIDER_ERROR`.

## Hors périmètre

Ce lot ne modifie pas `HelpWiz`, FloatingPanel, Inspector, ResponsivePreview, Header, la démo ou la roadmap canonique. Il ne décide pas du style visuel du rail latéral.

## Tests

`context-help-panel.test.mjs` couvre résolution HelpWiz, visitor/webmaster, open/close/reopen, collapse, côtés/largeurs, historique back/forward, contenu inline, snapshots défensifs, limite d'historique et entrées invalides.
