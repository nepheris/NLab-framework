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
- [ ] 🔵 Afficher l'ID humain directement dans les titres/sous-titres de la démo lorsque cela reste lisible.
- [ ] 🔵 Bouton standard `Info/Test` sur chaque zone testable, section et sous-section.
- [ ] 🔵 Tooltip court au survol et FloatingPanel détaillé au clic.
- [ ] 🔵 Le panneau indique : objectif, choses à tester, résultat attendu, ID humain, ID technique.
- [ ] 🔵 Donner un nom stable au panneau d'information : **InspectorPanel**.
- [ ] 🔵 Mode Webmaster détaillé : template, composant, fichiers JS/CSS/JSON, providers, dépendances et héritage de configuration.
- [ ] 🔵 Contrat commun `Classique / Avancé` pour les panneaux de réglage.
- [ ] 🔵 Toggle global dans le header pour afficher/masquer IDs + boutons Info/Test.
- [ ] 🔵 Mode global `Web public ↔ Webmaster` ; le mode Webmaster active les aides, IDs, outils et diagnostics supplémentaires.

## Preset / configuration workflow

- [ ] 🔵 Chaque Studio ou module paramétrable supporte des presets nommés.
- [ ] 🔵 Un preset peut être sélectionné, modifié, régénéré, validé (`OK`) puis figé comme référence locale de session.
- [ ] 🔵 Le preset actif est visuellement identifiable par bordure/état, sans remplacer tout le fond du module.
- [ ] 🔵 Actions communes : créer, dupliquer, renommer, reset, valider, supprimer un preset non système.
- [ ] 🔵 Persistance locale via `localStorage` pour retrouver les presets pendant les tests.
- [ ] 🔵 Export JSON des presets/configurations vers un fichier local téléchargeable.
- [ ] 🔵 Import JSON depuis un fichier local ou depuis un texte collé.
- [ ] 🔵 Bloc JSON global rassemblant toutes les configurations validées de la session.
- [ ] 🔵 Bouton `Copier` pour transmettre la configuration machine directement dans une conversation.
- [ ] 🔵 Ce contrat devient générique et réutilisable par Theme Workshop, QR Studio, Header/Hero, TableWiz et futurs Studios.

## CodeBlock / vision de code

- [ ] 🔵 Composant standard `CodeBlock` pour JSON, code et textes techniques.
- [ ] 🔵 thème clair / sombre propre au bloc, indépendant du thème général.
- [ ] 🔵 mode brut / coloration syntaxique.
- [ ] 🔵 bouton Copier dans le presse-papiers.
- [ ] 🔵 bouton Télécharger en fichier texte ou extension adaptée (`.json`, `.css`, `.js`, etc.).
- [ ] 🔵 état visuel bref après copie/téléchargement.

## LinkWiz / contrat de lien

- [ ] 🔵 Distinguer les types de destination : ancre même page, section/sous-section interne, page interne, URL externe, média/document, action framework.
- [ ] 🔵 Cible : même contexte, nouvel onglet, viewer interne, téléchargement.
- [ ] 🔵 États visuels : normal, hover, focus, visited, active, disabled.
- [ ] 🔵 Icône standard pour lien externe lorsque configurée.
- [ ] 🔵 Support de l'ancre et restauration/scroll vers la cible.
- [ ] 🔵 Support `title`, `aria-label`, alt lorsque nécessaire.
- [ ] 🔵 Présentation : texte, bouton, image, vignette, carte ou surface complète.
- [ ] 🔵 Image liée cliquable ou décorative indépendamment du conteneur.
- [ ] 🔵 Carte : non cliquable, lien partiel ou surface entièrement cliquable.
- [ ] 🔵 Éviter les `<a>` imbriqués invalides via hiérarchie d'actions.
- [ ] 🔵 Tokens ThemeWiz : couleur, hover, visited, focus, active, disabled, décoration.
- [ ] 🔵 Démo catalogue couvrant les types de liens.

## MediaWiz / documents

- [ ] 🔵 Contrat : inline, vignette, galerie, viewer, lien, téléchargement.
- [ ] 🔵 PDF : viewer interne ou nouvel onglet.
- [ ] 🔵 PDF : page initiale configurable.
- [ ] 🔵 PDF : vignette/preview ou fallback icône PDF.
- [ ] 🔵 PDF : ouvrir, télécharger, partager, imprimer lorsque autorisé.
- [ ] 🔵 Médias utilisés comme liens passent par LinkWiz.
- [ ] 🔵 Cartes/renderers utilisent LinkWiz/MediaWiz au lieu de recréer leur logique.

## Thème, backgrounds et présentation

- [ ] 🔵 BackgroundWiz : transparent, uni, gradient, image.
- [ ] 🔵 Gradient : 2, 3 ou N couleurs, stops éditables, orientation/angle.
- [ ] 🔵 Le thème desktop de démonstration utilise par défaut un fond légèrement dégradé afin de rendre immédiatement visible la vraie transparence des composants/QR.
- [ ] 🔵 Portée : global site, type de composant, instance.
- [ ] 🔵 TypographyWiz : texte, titres, accent, tailles, graisses, line-height, letter-spacing.
- [ ] 🔵 Densité : Compact/Normal/Confortable éditables + presets personnalisés.
- [ ] 🔵 Handles de resize/move visuellement explicites.
- [ ] 🔵 Hero/composants dimensionnables dans les deux sens avec min/max.
- [ ] 🔵 Undo/Redo + Reset commun aux Workshops.

## IconWiz / états standards

- [ ] 🔵 IDs sémantiques indépendants du SVG physique.
- [ ] 🔵 États : default, hover, active, inactive, success, warning, danger, locked, unlocked.
- [ ] 🔵 Pack de base : info, aide, close, reset, lock/unlock, pin, visibility, settings, refresh, navigation, save, print, download, upload, files, media, QR, share, liens, thème, filtre, recherche, resize.
- [ ] 🔵 Catalogue visuel des icônes et de leurs états.
- [ ] 🔵 Possibilité future de remplacer un pack sans modifier les composants.
- [ ] 🔵 Boutons interactifs ont un feedback visible au hover/clic.

## Navigation / aide contextuelle

- [ ] 🔵 Navigation latérale hiérarchique pliable/repliable.
- [ ] 🔵 Actions : tout plier, tout déplier, état par défaut (ex. H1/H2 ouverts).
- [ ] 🔵 Bouton Actualiser avec SVG et feedback d'état, équivalent fonctionnel à un reload de la page.
- [ ] 🔵 Démo d'un panneau d'aide contextuel latéral repliable, distinct du FloatingPanel.

## JSON Studio / Data UX

- [ ] 🔵 Tree réellement pliable/dépliable avec expand/collapse all.
- [ ] 🔵 Form généré et éditable selon le schéma.
- [ ] 🔵 Raw simple + mode partagé Raw/lecture colorisée.
- [ ] 🔵 thème clair/sombre de visualisation du code.
- [ ] 🔵 Diff expliqué : référence/original vs version modifiée.
- [ ] 🔵 Filmstrip : contrôleurs interchangeables (flèches, dots, scrollbar, slider, miniatures, compteur).
- [ ] 🔵 DataWiz : expliciter source, variable, mesure et résultat.

## FloatingPanel / InspectorPanel

- [ ] 🔵 Poignée de déplacement explicite.
- [ ] 🔵 Poignée de resize explicite et réutilisée comme modèle pour Hero/sections éditables.
- [ ] 🔵 Séparer clairement la poignée de resize de l'action lock/unlock.
- [ ] 🔵 Icône `resize` dédiée, grisée quand inactive et explicite au hover.
- [ ] 🔵 Icône lock/unlock séparée.
- [ ] 🔵 Pin/unpin avec punaise pour figer le panel à sa position.
- [ ] 🔵 Option d'ancrage/docking distincte du pin si nécessaire.
- [ ] 🔵 Close via SVG avec état danger/hover.
- [ ] 🔵 Tooltips et `aria-label` sur toutes les actions.
- [ ] 🔵 Ouverture/fermeture pilotable depuis des boutons de page, titres ou actions framework.

## QR Studio

- [ ] 🔵 Réparer l'action `Régénérer` et garantir le rerender du QR personnalisé.
- [ ] 🔵 Renommer les champs : `Couleur QR code`, `Couleur arrière-plan`, `Arrière-plan transparent`.
- [ ] 🔵 Remplacer `L/M/Q/H` par un libellé explicite `Correction d'erreur` avec texte d'aide pour chaque niveau.
- [ ] 🔵 Le mode transparent doit réellement produire un fond transparent, avec le fond dégradé de page permettant de le vérifier visuellement.
- [ ] 🔵 Vue pellicule compacte présentant tous les presets QR simultanément.
- [ ] 🔵 Presets : standard, transparent, fond coloré, avec logo, monochrome thème, personnalisé.
- [ ] 🔵 Chaque preset possède `Modifier`, `Régénérer`, `Valider/OK`, `Reset`.
- [ ] 🔵 Un preset en édition est signalé par une bordure/état visible.
- [ ] 🔵 Les paramètres du preset sélectionné sont chargés dans le panneau de contrôle commun.
- [ ] 🔵 Une validation met à jour la configuration locale de référence du preset.
- [ ] 🔵 Export/import JSON de tous les presets QR.
- [ ] 🔵 Copier la configuration JSON QR dans le presse-papiers.

## QR / assets complémentaires

- [ ] 🔵 Asset/Logo Workshop : original, couleur transparent, couleur avec fond, monochrome recolorable, favicon.
- [ ] 🔵 Préviews sur fonds clair/sombre et formes carrées/arrondies.

## Catalogue de test

- [ ] 🔵 Chaque zone dispose d'un bouton Info/Test et de ses deux IDs.
- [ ] 🔵 Chaque module indique explicitement ce qui doit être testé et le résultat attendu.
- [ ] 🔵 Vue miniature/live preview de la page entière pendant l'édition Header/Hero/Sections.
- [ ] 🔵 Contrôle responsive téléphone/tablette/desktop/large.

---

# Consolidation suivante — Lot 8C

## Diagnostic avancé

- [ ] ⬜ InspectorPanel à onglets : `Test`, `Technique`, `Dépendances`, `État`, `Configuration`.
- [ ] ⬜ Onglet `État` inventoriant les boutons/contrôles de la page et leur état courant : actif, inactif, locked, hidden, selected, disabled.
- [ ] ⬜ Export snapshot du diagnostic en JSON.
- [ ] ⬜ FloatingPanels spécialisés pour notifications d'état, succès, warning et erreur.
- [ ] ⬜ API générique permettant d'ouvrir/fermer un FloatingPanel depuis n'importe quelle action enregistrée.

---

# Planifié plus tard — non bloquant pour Lot 8B/8C

- [ ] ⬜ Sauvegarde directe de configurations vers un backoffice/repo : nécessite une API ou un provider d'écriture authentifié ; le site statique reste export/import local.
- [ ] ⬜ Rendu PDF avancé avec génération automatique de miniatures multi-pages.
- [ ] ⬜ Annotation PDF avancée.
- [ ] ⬜ Vectorisation automatique avancée de logos bitmap complexes.
- [ ] ⬜ Packs d'icônes alternatifs complets.
- [ ] ⬜ Animations complexes de transitions.
- [ ] ⬜ Statistiques/graphiques avancés.
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

Cette règle sépare la collecte d'idées de la décision de développement et évite de perdre ou de traiter prématurément les suggestions.
