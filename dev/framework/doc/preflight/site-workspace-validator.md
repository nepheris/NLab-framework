# Site Workspace Validator

## Objet

`validate-site-workspace.mjs` fournit un contrôle **read-only, DOM-free et générique** d'un workspace site nLab réel avant génération.

Il complète le contrat déclaratif `data/site-workspace.schema.json` : le schéma décrit la structure attendue ; le validateur contrôle également que les répertoires déclarés existent réellement sur le système de fichiers.

## Entrée

```bash
node dev/framework/tools/site/validate-site-workspace.mjs <workspace.json> [base-directory]
```

Le manifeste doit respecter `nlab.site-workspace` V1.

Rôles obligatoires :

- `atelier/`
- `data/`
- `assets/`
- `config/`
- `web/`

Le validateur ne crée, ne déplace et ne supprime aucun fichier.

## Contrôles

Le rapport vérifie notamment :

- `schema = nlab.site-workspace` et `version = 1` ;
- racine relative POSIX sans `..`, chemin absolu ni backslash ;
- cinq rôles obligatoires et aucun rôle inconnu ;
- chemins et flags `mutable/generated/publishable` conformes au contrat ;
- `purpose` non vide ;
- stratégie Framework parmi `external`, `synchronized`, `embedded-readonly` ;
- frontière `business_logic_allowed:false` ;
- existence physique de chacun des cinq dossiers ;
- absence de résolution hors racine ;
- warning lorsque `embedded-readonly` ne déclare pas `framework.path`.

## Sortie machine

Succès ou non-conformité produit un JSON `nlab.site-workspace-validation-report` V1 contenant :

- `ok` ;
- `workspace_file` ;
- `workspace_root` ;
- `errors[]` ;
- `warnings[]` ;
- état des cinq répertoires.

Codes de sortie CLI :

- `0` : workspace conforme ;
- `2` : workspace lu correctement mais non conforme ;
- `1` : erreur d'usage/lecture/exécution.

## Frontières

Ce lot ne :

- génère aucun site ;
- ne crée aucun dossier `Sites/` ;
- ne contient aucune règle Recettes du Cœur ;
- ne modifie pas TableWiz, V20, la démo ou l'architecture ;
- ne remplace pas un validateur JSON Schema généraliste.

Le contrat JSON Schema demeure la définition canonique de structure. Ce validateur constitue le **pré-vol filesystem** permettant ensuite au générateur Lot 9 de refuser proprement un workspace incomplet ou mal séparé.
