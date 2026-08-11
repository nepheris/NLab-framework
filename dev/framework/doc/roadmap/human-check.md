# 🟣👤 HUMAN — H001 Validation Theme Workshop / Preview

> Contrôle humain court. Les détails techniques restent dans la roadmap et les fichiers GitHub associés.

## Navigation

### 🗺️ **[RETOUR À LA ROADMAP](./roadmap.md)** <a href="./roadmap.md" target="_blank">↗</a>

- 🤖 [REX machine](./rex.machine.json) <a href="./rex.machine.json" target="_blank">↗</a>
- 🔎 [Roadmap du cycle V19](../../demo/ROADMAP_V19.md) <a href="../../demo/ROADMAP_V19.md" target="_blank">↗</a>
- 🗂️ [Repo](https://github.com/nepheris/nLab-Web-Framework) <a href="https://github.com/nepheris/nLab-Web-Framework" target="_blank">↗</a>
- 🌐 Preview multi-versions : https://nepheris.github.io/nLab-Webmaster-Preview/

## Statut

**⏸️ H001 — SUSPENDU TEMPORAIREMENT POUR VALIDATION HUMAINE**

**Dernière base visuellement déclarée fonctionnelle : V16.**

- V17 a été testée par l’utilisateur et présente des régressions visibles, notamment sur des blocs DataWiz / QRWiz et autres zones du Catalogue.
- V16 est la dernière version que l’utilisateur a identifiée comme fonctionnelle lors du parcours V17 → V16.
- V15, V14 et V13 restent disponibles dans la Preview multi-versions pour comparaison si nécessaire.
- V18/V19 restent conservées dans l’historique mais ne doivent pas être considérées comme validées.

**Décision de travail :** ne pas poursuivre de modification runtime sur Theme Workshop / JSON Studio / DataWiz / QRWiz tant que H001 est suspendu. Les tâches indépendantes peuvent continuer.

## Pourquoi l'humain intervient

1. confirmer la dernière base visuellement saine ;
2. identifier précisément les régressions introduites après V16 ;
3. choisir entre reprise incrémentale depuis V16 et reconstruction ciblée des blocs cassés ;
4. valider chaque nouvelle version via la Preview multi-versions avant de la déclarer stable.

## À vérifier à la reprise

- [ ] comparer V16 à V17 bloc par bloc ;
- [ ] DataWiz : présence, rendu, contrôles, données ;
- [ ] QRWiz / QR Studio : présence, rendu, types, presets, génération ;
- [ ] JSON Studio : affichage, édition, relations, export ;
- [ ] Theme Workshop : contrôles globaux historiques ;
- [ ] TableWiz / Search / Set Filter : absence de régression ;
- [ ] responsive / navigation / Info-Test ;
- [ ] choisir la base de reprise définitive.

## Règle Preview désormais retenue

Chaque nouvelle review doit être publiée comme **snapshot autonome** dans `nLab-Webmaster-Preview`, sans écraser les reviews précédentes. L’index public conserve au minimum les cinq dernières versions testables avec :

- numéro de version visible ;
- numéro de review ;
- date ;
- SHA source ;
- lien autonome ;
- contrôle automatique de structure, syntaxe JS et imports locaux avant exposition dans l’index.

## Point exact de reprise

> 🎯 Reprendre depuis **V16 comme référence visuelle actuelle**, analyser V16 → V17, puis produire une nouvelle review isolée et l’ajouter à la Preview sans supprimer les précédentes.

Après validation seulement : reprendre l’industrialisation JSON Studio puis la convergence TableWiz / DataWiz / ResultSet.
