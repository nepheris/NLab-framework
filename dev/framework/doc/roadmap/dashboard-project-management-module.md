# Candidat — Module Dashboard / Project Management / Gantt

Statut : **backlog de capitalisation / non canonique**.

## Objectif

Capitaliser les retours d'expérience des dashboards nLab pour construire un module générique du Web Framework couvrant :

- dashboard de pilotage ;
- vues projet et portefeuille ;
- roadmap ;
- Gantt / timeline ;
- post-it / kanban léger ;
- filtres, thèmes et regroupements ;
- composants de statut, progression, jalons et blocages ;
- vues HUMAN de validation ;
- raccord futur à une authentification GitHub pour les données non publiques.

## Sources de REX prioritaires

- nLab Cockpit ;
- Post-it Dashboard ;
- Agent Board du nLab Control Plane ;
- vues Cockpit / Roadmap / Gantt du Webmaster Preview ;
- futur projet transversal `nLab Dashboard`.

## Principe de capitalisation

Les POC/MVP restent des projets indépendants tant qu'ils servent leur validation propre. Une fois suffisamment stabilisés, leurs patterns réutilisables sont extraits sous forme de composants, contrats et modules génériques du Web Framework.

Le Framework ne copie pas les règles métier particulières des projets : il capitalise uniquement les primitives réutilisables.

## Lots candidats

### DPM-100 — Inventaire REX
- recenser les composants et interactions communs ;
- identifier les divergences métier ;
- produire une matrice `pattern / source / réutilisabilité / dépendances`.

### DPM-200 — Contrat de données générique
- projet ;
- tâche ;
- jalon ;
- dépendance ;
- période ;
- progression ;
- statut ;
- ressource/agent ;
- vues et filtres.

### DPM-300 — Composants de visualisation
- cards KPI ;
- tableau de pilotage ;
- timeline/Gantt ;
- kanban/post-it ;
- roadmap ;
- filtres multi-sélection et thèmes.

### DPM-400 — Composition Dashboard
- layout responsive ;
- widgets configurables ;
- bindings vers DataResolver / PresentationResolver ;
- persistance locale optionnelle.

### DPM-500 — Sécurité et données protégées
- aucune donnée privée embarquée dans un artefact public ;
- support d'un provider d'authentification externe ;
- cible initiale : GitHub Auth ;
- tests authentifié / non authentifié.

### DPM-600 — Validation par cas réels
- nLab Cockpit ;
- Post-it Dashboard ;
- Agent Board ;
- au moins un projet non-nLab pour vérifier la généricité.

## Dépendance HUMAN

La priorisation détaillée de ce module sera alignée sur le futur projet `nLab Dashboard` après validation de sa roadmap.
