# Backlog UX — tri des retours de test

Ce fichier complète la roadmap principale. Il capture immédiatement les idées issues des tests afin qu'aucune ne reste uniquement dans la conversation.

## Règle de tri

Chaque retour est classé dans une seule catégorie :

- 🔵 **À intégrer maintenant** — convention ou primitive transversale qui doit être figée avant de poursuivre le crash-test métier.
- ⬜ **À planifier plus tard** — fonctionnalité utile mais non bloquante pour la consolidation actuelle.
- 🟣 **Décision humaine** — arbitrage qui nécessite explicitement une validation utilisateur.
- ✅ **Intégré** — réalisé et reporté dans la roadmap principale.

Lorsqu'un élément 🔵 est terminé, il est coché ici et sa progression est répercutée dans `ROADMAP.md`. Les éléments ⬜ restent tracés jusqu'à leur lot cible.

---

# Consolidation immédiate — Lot 8B

## Identification et diagnostic

- [ ] 🔵 Chaque section, sous-section et composant testable possède un **ID humain court** stable, par exemple `DMO-042`.
- [ ] 🔵 Chaque élément possède aussi un **ID technique stable** lisible, par exemple `demo.theme.background.gradient`.
- [ ] 🔵 L'ID humain sert aux retours utilisateur ; l'ID technique sert au diagnostic, aux logs et aux dépendances.
- [ ] 🔵 Bouton standard `info/test` sur chaque zone testable.
- [ ] 🔵 Tooltip court au survol et FloatingPanel détaillé au clic.
- [ ] 🔵 Le panneau indique : objectif, choses à tester, résultat attendu, ID humain, ID technique.
- [ ] 🔵 Mode Webmaster détaillé : template, composant, fichiers JS/CSS/JSON, providers, dépendances et héritage de configuration.
- [ ] 🔵 Contrat commun `Classique / Avancé` pour les panneaux de réglage.

## LinkWiz / contrat de lien

- [ ] 🔵 Distinguer les types de destination :
  - ancre sur la même page ;
  - section/sous-section interne ;
  - page interne au site ;
  - URL externe ;
  - ressource média/document ;
  - action commandée par le framework.
- [ ] 🔵 Cible d'ouverture explicite : même contexte, nouvel onglet, viewer interne, téléchargement.
- [ ] 🔵 États visuels : normal, hover, focus, visited, active, disabled.
- [ ] 🔵 Icône standard pour lien externe lorsque configurée.
- [ ] 🔵 Support de l'ancre et restauration/scroll vers la cible.
- [ ] 🔵 Support des paramètres/accessibilité `title`, `aria-label`, texte alternatif lorsque nécessaire.
- [ ] 🔵 Présentation d'un lien comme texte, bouton, image, vignette, carte ou surface complète.
- [ ] 🔵 Une image liée peut être cliquable ou décorative indépendamment du conteneur.
- [ ] 🔵 Une carte peut être : non cliquable, lien partiel, ou surface entièrement cliquable.
- [ ] 🔵 Éviter les liens imbriqués invalides : le framework doit gérer une hiérarchie d'actions sans produire de `<a>` imbriqués.
- [ ] 🔵 Tokens ThemeWiz pour les liens : couleur, hover, visited, focus, active, disabled, décoration.
- [ ] 🔵 Démo catalogue couvrant tous les types de liens.

## MediaWiz / documents

- [ ] 🔵 Contrat de présentation média commun : inline, vignette, galerie, viewer, lien, téléchargement.
- [ ] 🔵 PDF : ouvrir dans le viewer interne ou dans un nouvel onglet.
- [ ] 🔵 PDF : paramètre de page initiale (`page=1` par défaut, page définie possible).
- [ ] 🔵 PDF : vignette/preview si disponible ; fallback icône PDF si aucune vignette n'existe.
- [ ] 🔵 PDF : bouton ouvrir, télécharger, partager, imprimer lorsque autorisé.
- [ ] 🔵 Images/médias utilisés comme liens passent par le même contrat LinkWiz.
- [ ] 🔵 Les cartes et renderers utilisent LinkWiz/MediaWiz au lieu de recréer leur logique de clic.

## Thème, backgrounds et présentation

- [ ] 🔵 BackgroundWiz : transparent, uni, gradient, image.
- [ ] 🔵 Gradient : 2, 3 ou N couleurs, stops éditables, orientation/angle.
- [ ] 🔵 Portée des modifications : global site, type de composant, instance.
- [ ] 🔵 TypographyWiz : texte, titres, accent, tailles, graisses, line-height, letter-spacing.
- [ ] 🔵 Densité : presets Compact/Normal/Confortable éditables + presets personnalisés.
- [ ] 🔵 Handles de resize/move visuellement explicites.
- [ ] 🔵 Hero et composants dimensionnables dans les deux sens avec min/max explicites.
- [ ] 🔵 Undo/Redo + Reset commun aux Workshops.

## IconWiz / états standards

- [ ] 🔵 IDs d'icônes sémantiques indépendants du SVG physique.
- [ ] 🔵 États : default, hover, active, inactive, success, warning, danger, locked, unlocked.
- [ ] 🔵 Pack de base : info, aide, close, reset, lock/unlock, pin, visibility, settings, navigation, save, print, download, upload, files, media, QR, share, liens, thème, filtre, recherche.
- [ ] 🔵 Catalogue visuel des icônes et de leurs états.
- [ ] 🔵 Possibilité future de remplacer un pack d'icônes sans changer les composants.

## JSON Studio / Data UX

- [ ] 🔵 Tree réellement pliable/dépliable avec expand/collapse all.
- [ ] 🔵 Form réellement généré et éditable selon le schéma.
- [ ] 🔵 Raw simple + mode partagé Raw/lecture colorisée.
- [ ] 🔵 Thème clair/sombre de visualisation du code.
- [ ] 🔵 Diff expliqué : référence/original vs version modifiée.
- [ ] 🔵 Filmstrip : contrôleurs interchangeables (flèches, dots, scrollbar, slider, miniatures, compteur).
- [ ] 🔵 DataWiz : expliciter source, variable, mesure et résultat.

## FloatingPanel

- [ ] 🔵 Poignée de déplacement explicite.
- [ ] 🔵 Poignée de resize explicite et taille configurable.
- [ ] 🔵 Icône lock/unlock avec état clair.
- [ ] 🔵 Pin/unpin avec icône punaise.
- [ ] 🔵 Close avec état danger/hover cohérent.
- [ ] 🔵 Tooltips et `aria-label` sur toutes les actions.

## QR / assets

- [ ] 🔵 QR Studio montrant plusieurs variantes simultanément : standard, transparent, fond coloré, avec logo, monochrome thème.
- [ ] 🔵 Asset/Logo Workshop : original, couleur transparent, couleur avec fond, monochrome recolorable, favicon.
- [ ] 🔵 Préviews sur fonds clair/sombre et formes de fond carrées/arrondies.

## Catalogue de test

- [ ] 🔵 Chaque zone dispose d'un bouton Info/Test et de ses deux IDs.
- [ ] 🔵 Chaque module indique explicitement ce qui doit être testé et le résultat attendu.
- [ ] 🔵 Vue miniature/live preview de la page entière pendant l'édition du Header/Hero/Sections.
- [ ] 🔵 Contrôle responsive téléphone/tablette/desktop/large.

---

# Planifié plus tard — non bloquant pour Lot 8B

- [ ] ⬜ Rendu PDF avancé avec génération automatique de miniatures multi-pages si une bibliothèque dédiée est retenue.
- [ ] ⬜ Annotation PDF avancée.
- [ ] ⬜ Vectorisation automatique avancée de logos bitmap complexes ; conserver le raster lorsque la vectorisation n'est pas pertinente.
- [ ] ⬜ Packs d'icônes alternatifs complets au-delà du pack de référence.
- [ ] ⬜ Animations complexes de transitions entre thèmes et renderers.
- [ ] ⬜ Statistiques/graphiques avancés au-delà des KPI et distributions simples.
- [ ] ⬜ Traitements audio/vidéo avancés.

---

# Méthode de travail pour les prochains retours

À chaque session de test :

1. capturer chaque idée ou anomalie ;
2. lui attribuer l'ID de la zone concernée quand disponible ;
3. classifier `maintenant / plus tard / décision humaine` ;
4. ajouter immédiatement l'élément à ce backlog ;
5. ne développer immédiatement que ce qui est transverse ou bloque le prochain crash-test ;
6. répercuter l'avancement dans `ROADMAP.md` lorsqu'un ensemble est stabilisé ;
7. alimenter `RETEX-AUTONOMIE.md` lorsqu'une leçon réutilisable apparaît.

Cette règle permet de séparer la collecte d'idées de la décision de développement et évite de perdre ou de traiter prématurément les suggestions.
