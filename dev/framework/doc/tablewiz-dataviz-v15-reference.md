# TableWiz / DataViz — référence UX issue des rapports MVola V8/V15

Statut : **référence de conception**, pas code source à recopier.
Agent : A
Base de travail : Review V16
Branche : `agent-a/tablewiz-legacy-from-v16`

## 1. Principe retenu

Les rapports MVola montrent deux générations complémentaires :

- **V8** : socle fonctionnel simple et lisible (KPI, vues tableau/graphique, filtres métier, tri, sections pliables, état du header, thème clair/sombre, persistance locale) ;
- **V15** : évolution vers un véritable **DataViz Studio**, avec barre compacte, configuration dépliable, ordre personnalisable, drag and drop, profils, formats d'export, champs visibles et Header Studio.

La cible nLab ne doit pas embarquer le monolithe MVola. Elle doit réécrire ces comportements sous forme de moteurs génériques et composables.

## 2. Architecture cible

### TableWiz
Responsable du jeu de données tabulaire et de ses interactions :

- colonnes ;
- tri multi-mode ;
- recherche globale ;
- recherche par colonne ;
- filtres simples et avancés ;
- pagination ;
- largeur / redimensionnement ;
- visibilité / ordre des colonnes ;
- sticky ;
- sélection ;
- export du jeu complet, filtré ou sélectionné.

### DataViz
Responsable des représentations et KPI d'un ResultSet :

- KPI ;
- tableau ;
- histogramme ;
- flux ;
- camembert/donut ;
- treemap ;
- waterfall ;
- waffle ;
- radar ;
- heatmap ;
- représentations métier enregistrées comme plugins.

### DataVizBar
Barre compacte d'usage quotidien :

- affiche seulement les commandes actives ;
- ordre libre ;
- séparateurs ;
- labels icône / court / long ;
- labels à côté / dessous ;
- commandes déplaçables par drag & drop ;
- overflow horizontal sur petits écrans ;
- bouton Configuration fixe.

### DataVizStudio
Panneau qui se déplie sous la barre :

- catalogue des vues disponibles ;
- catalogue des modules de commande ;
- activer / masquer une commande ;
- drag & drop entre éléments ;
- insertion de séparateurs / espaces ;
- visibilité des champs ;
- options propres à chaque type de graphique ;
- formats d'export autorisés ;
- profils enregistrables ;
- restauration du profil par défaut.

### ToolbarProfile / Preset
Le profil doit être un objet sérialisable, indépendant du DOM :

```json
{
  "views": ["table", "hist", "pie"],
  "modules": ["search", "filters", "fields", "zoom", "export"],
  "order": ["search", "filters", "table", "hist", "pie", "export"],
  "separators": ["table", "export"],
  "label_mode": "short",
  "label_position": "side",
  "visible_fields": ["name", "status", "amount"],
  "export_formats": ["xlsx", "csv", "pdf", "json"]
}
```

La persistance `localStorage` est une implémentation possible, mais le moteur doit accepter un provider externe.

## 3. Ce qu'il faut reprendre du comportement MVola

### V8

- état des sections ;
- KPI recalculés à partir d'une transaction de référence ;
- boutons de valeurs / presets ;
- vues tableau / graphique ;
- filtres et classement ;
- état du header (sticky / libre) ;
- clair / sombre ;
- sauvegarde des réglages.

### V15

- barre DataViz compacte ;
- bouton configuration qui ouvre le Studio sous la barre ;
- `dragstart / dragover / drop` pour l'ordre ;
- poignée visuelle de drag ;
- profils sérialisés ;
- visibilité des champs ;
- label icône/court/long et position côté/dessous ;
- modules indépendants : montants, scénarios, plage, zoom, classement, pliage, export, champs, espace ;
- export Excel/CSV/PDF/JSON ;
- sous-menus de configuration propres aux vues ;
- Header Studio comme preuve que le même moteur de toolbar peut être réutilisé ailleurs.

## 4. Ce qu'il ne faut pas reprendre

- sélecteurs CSS dépendant du DOM MVola ;
- état global monolithique `state` ;
- fonctions qui déclenchent directement `renderAll()` ;
- CSS métier et couleurs MVola ;
- dépendances par ID HTML ;
- patchs successifs V8→V15 empilés dans un seul fichier ;
- logique d'export couplée aux libellés MVola ;
- drag & drop directement lié à `state.dvOrder`.

## 5. Contrats proposés

### `ToolbarModel`

- `register(item)`
- `setVisible(id, bool)`
- `move(id, targetId, position)`
- `insertSeparator(position)`
- `setLabelMode(mode)`
- `setLabelPosition(position)`
- `snapshot()`
- `restore(snapshot)`

### `DataVizStudio`

- consomme un `ToolbarModel` ;
- consomme un registre de vues et modules ;
- ne connaît pas MVola ni le DOM métier ;
- émet des événements (`toolbar:change`, `view:change`, `filter:change`, `export:request`).

### `ExportWiz`

Doit accepter explicitement le niveau d'export :

- dataset complet ;
- dataset filtré ;
- page courante ;
- sélection ;
- vue/KPI courant.

Formats initiaux : CSV, JSON, XLSX/Excel-compatible, PDF/print view.

## 6. Priorité d'implémentation

1. `ToolbarModel` générique + tests.
2. `DataVizBar` compacte.
3. `DataVizStudio` dépliable.
4. drag/drop + clavier/reorder API.
5. profils/presets.
6. Search / Filter / Fields modules.
7. branchement TableWiz actuel.
8. KPI/DataViz views.
9. ExportWiz et niveaux d'export.
10. application du même moteur au Header Studio.

## 7. Critère HUMAN

La cible visuelle doit retrouver le comportement perçu de V15 :

> une barre légère et immédiatement utilisable ; clic sur Configuration ; un Studio descend sous la barre ; l'utilisateur compose ses vues/commandes, les déplace comme une toolbar de logiciel bureautique, enregistre un profil, referme le Studio et retrouve une barre compacte conforme à son choix.

Le style graphique sera refait avec les tokens nLab ; seule l'ergonomie est prise comme référence.
