# Generic site workspace folder contract

Ce contrat formalise la séparation de dossiers préparée pour le Lot 9 sans créer de structure métier dans le Framework.

Source de l'intention : le préflight Lot 9 autorise explicitement, en travail parallèle sûr, la préparation du contrat `atelier/config/assets/web`; le préflight détaillé ajoute le rôle `data/` et rappelle que le Framework reste générique et séparé.

Le contrat machine est :

`dev/framework/data/site-workspace.schema.json`

## Structure standard

```text
<site-root>/
├── atelier/   # travail, contrôle, compositions, génération
├── data/      # données / référentiels du site
├── assets/    # médias et assets propres au site
├── config/    # configuration du site
└── web/       # sortie générée publiable
```

Le chemin racine reste libre et relatif, par exemple `Sites/example/`. Le schéma ne contient aucun nom métier Recettes du Cœur.

## Sémantique des rôles

| Rôle | mutable | generated | publishable |
|---|---:|---:|---:|
| `atelier/` | oui | non | non |
| `data/` | oui | non | non |
| `assets/` | oui | non | non |
| `config/` | oui | non | non |
| `web/` | non | oui | oui |

`web/` est volontairement considéré comme une sortie : le contrat de base demande de le générer plutôt que de le traiter comme source éditable.

Chaque entrée possède aussi un champ `purpose`, afin qu'une instance réelle documente son usage sans changer la convention de rôle.

## Séparation du Framework

La clé `framework` décrit comment le site accède au Framework générique :

- `external` ;
- `synchronized` ;
- `embedded-readonly`.

Dans tous les cas :

```json
{
  "business_logic_allowed": false
}
```

Le contrat ne décide pas aujourd'hui quelle stratégie d'embarquement sera retenue pour le dépôt métier réel. Cette décision reste distincte de la séparation logique.

## Racine

`root` est un chemin relatif POSIX terminant par `/`.

Le schéma refuse notamment :

- les chemins absolus ;
- les backslashes Windows ;
- les segments `..`.

Cela permet de transmettre un workspace sans encoder une machine locale ou un montage disque particulier.

## Exemple générique

```json
{
  "schema": "nlab.site-workspace",
  "version": 1,
  "root": "Sites/example/",
  "directories": {
    "atelier": {
      "path": "atelier/",
      "purpose": "Contrôles et génération",
      "mutable": true,
      "generated": false,
      "publishable": false
    },
    "data": {
      "path": "data/",
      "purpose": "Données du site",
      "mutable": true,
      "generated": false,
      "publishable": false
    },
    "assets": {
      "path": "assets/",
      "purpose": "Assets du site",
      "mutable": true,
      "generated": false,
      "publishable": false
    },
    "config": {
      "path": "config/",
      "purpose": "Configuration du site",
      "mutable": true,
      "generated": false,
      "publishable": false
    },
    "web": {
      "path": "web/",
      "purpose": "Sortie générée publiable",
      "mutable": false,
      "generated": true,
      "publishable": true
    }
  },
  "framework": {
    "strategy": "external",
    "path": null,
    "business_logic_allowed": false
  }
}
```

## Frontières

Ce lot ne :

- crée aucun dossier `Sites/` ;
- ne crée aucun workspace Recettes du Cœur ;
- ne choisit pas l'emplacement définitif du dépôt métier ;
- ne modifie aucun runtime du Framework ;
- n'introduit aucune règle métier dans le Framework ;
- ne décide pas de la stratégie finale `external/synchronized/embedded-readonly`.

Il prépare uniquement le contrat générique que le futur workspace métier pourra instancier lorsque sa source sera accessible.

## Test

`site-workspace-contract.test.mjs` vérifie :

- Draft 2020-12, `$id` et discriminants V1 ;
- absence de vocabulaire métier dans le schéma générique ;
- cinq rôles obligatoires et chemins constants ;
- `web/` comme seule sortie publiable/générée ;
- Framework sans logique métier ;
- stratégie d'accès au Framework ;
- règles de chemin racine relatif.

Le test générique `data-schema-integrity.test.mjs` couvrira automatiquement ce nouveau schéma après intégration.
