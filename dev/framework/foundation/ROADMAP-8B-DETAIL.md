# Roadmap détaillée — Lot 8B

Ce document est une extension opérationnelle de `ROADMAP.md`. Il consolide les retours de test du catalogue et sert de liste détaillée jusqu'à la stabilisation du Lot 8B.

## Theme Workshop

- [x] séparer clairement Couleurs / Background / Typographie / Densité ;
- [x] renommer `accent` en **Couleur d'accent** dans l'interface ;
- [x] renommer `fg` en **Couleur du texte** ;
- [x] renommer `bg` en **Background / Couleur de fond** ;
- [x] ajouter **Police principale**, **Police titres**, **Police d'accent** ;
- [x] ajouter aperçu H1/H2/H3/H4/H5, texte, gras, italique, accent et citation ;
- [x] proposer affichage HEX / RGB / HSL dans le color picker ;
- [x] densité Compact / Normal / Confortable avec réglage fin +/- ;
- [x] fond global uni ou dégradé deux couleurs avec direction ;
- [x] presets de fond clair / sombre / couleur / dégradé ;
- [ ] BackgroundWiz N couleurs, stops et image ;
- [ ] portée Global / Type / Instance ;
- [ ] presets de densité personnalisables et nommables ;
- [ ] Undo/Redo général ;
- [ ] templates Header multiples + personnalisé ;
- [ ] dériver ensuite les templates Footer du même moteur que Header ;
- [ ] templates Hero multiples + personnalisé.

## Édition visuelle / handles

- [x] séparer verrouillage et poignée de redimensionnement ;
- [x] SVG de resize distinct du SVG lock/unlock ;
- [x] code couleur locked/unlocked ;
- [x] autoriser réduction et agrandissement avec minimum explicite ;
- [ ] généraliser déplacement / resize aux sections compatibles ;
- [ ] Preset Manager pour dimensions Header/Hero/Section.

## Navigation / responsive

- [x] navigation latérale repliable ;
- [x] hiérarchie pliable par niveaux ;
- [x] Tout plier / Tout déplier / état par défaut ;
- [x] bouton Actualiser ;
- [x] cadre gris explicite autour de la zone responsive simulée ;
- [x] breakpoint local dans la section responsive ;
- [x] synchronisation breakpoint local / global ;
- [ ] toggle complet Web public / Webmaster ;
- [ ] permettre aux modules compatibles d'avoir leur propre breakpoint local via une primitive commune.

## Search / Filter / Renderer / Cards

- [x] modes recherche Contient / Exact / Regex dans le catalogue ;
- [x] réglage live de la taille minimale des cartes ;
- [x] affichage/masquage des images ;
- [ ] SearchWiz : panneau paramètres avancés commun ;
- [ ] autocomplétion configurable ;
- [ ] icônes sémantiques par mode de recherche ;
- [ ] filtres texte / radio / checkbox / boutons / image / chips ;
- [ ] contrôles discrets multi-valeurs ;
- [ ] profils de cartes ;
- [ ] choix des champs affichés dans une carte ;
- [ ] ordre des champs ;
- [ ] enregistrer/exporter/importer les presets de cartes.

## TableWiz

- [x] bouton Mode avancé visible dans la démo ;
- [ ] tri A→Z / Z→A par colonne avec SVG d'état ;
- [ ] recherche par colonne ;
- [ ] filtres typés selon variable texte/discrète/continue/date/booléen ;
- [ ] opérateurs contient / ne contient pas / = / ≠ / > / < / intervalle / regex ;
- [ ] pin/sticky par colonne ;
- [ ] afficher/masquer une colonne ;
- [ ] redimensionnement largeur colonne à la souris ;
- [ ] hauteur de lignes configurable ;
- [ ] drag/drop d'ordre des colonnes ;
- [ ] mode édition des données avec SVG crayon ;
- [ ] rendu booléen brut / 0-1 / checkbox / toggle modifiable ou lecture seule ;
- [ ] rendu tags sous forme de chips réordonnables/éditables ;
- [ ] presets Table simples et avancés ;
- [ ] réutiliser les mêmes primitives dans la vue Table du JSON Studio.

## JSON Studio

- [x] libellé Diff rendu explicite référence ↔ modifié dans le catalogue ;
- [ ] Tree pliable/dépliable réellement interactif ;
- [ ] Tout plier / Tout déplier ;
- [ ] Form réellement généré depuis schéma et éditable ;
- [ ] Raw seul / Raw + lecture colorisée ;
- [ ] CodeBlock comme moteur d'affichage du Raw ;
- [ ] réutilisation des renderers TableWiz et tags/booléens.

## CodeBlock

- [x] clair / sombre ;
- [x] brut / colorisé ;
- [x] Copier tout avec confirmation visible ;
- [x] téléchargement ;
- [x] démos JSON / JavaScript / Python / Bash / texte ;
- [ ] HTML / CSS / CSV ;
- [ ] détection automatique du langage quand fiable ;
- [ ] packs de coloration configurables.

## InspectorPanel / FloatingPanel

- [x] lock/unlock séparé ;
- [x] pin/unpin ;
- [x] plier/déplier ;
- [x] fermeture SVG danger ;
- [x] empêcher le drag lorsqu'on clique sur un bouton du header ;
- [x] pin bloque le déplacement mais laisse le resize ;
- [ ] onglets Test / Technique / Dépendances / État / Configuration ;
- [ ] inventaire dynamique des contrôles ;
- [ ] snapshot JSON ;
- [ ] notifications/toasts à partir de la même primitive.

## QR Studio

- [x] pellicule compacte horizontale ;
- [x] choix des previews visibles ;
- [x] preset actif ;
- [x] Régénérer avec feedback ;
- [x] vraie transparence visible sur fond de page ;
- [x] configuration rendue avec CodeBlock ;
- [ ] modifier et valider chaque preset ;
- [ ] stockage local ;
- [ ] import/export JSON ;
- [ ] Preset Manager générique.

## Documents / Media / DataWiz — à poursuivre après les primitives ci-dessus

- [ ] DocumentWiz : plusieurs previews (HTML, print/PDF, autres profils) ;
- [ ] MediaWiz : image/PDF/SVG avec modes viewer/vignette/nouvel onglet/téléchargement ;
- [ ] DataWiz : vues explicites KPI/distribution/groupement avec source/variable/mesure/résultat ;
- [ ] DataWiz : presets de vues.

## Critère de sortie

Le Lot 8B est terminé lorsque les primitives communes sont stables et qu'un réglage réalisé visuellement peut être exporté en JSON puis reproduit sans explication verbale détaillée.