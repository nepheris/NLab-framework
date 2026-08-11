# Core runtime transversal

Le noyau runtime du Framework V2 fournit les services partagés qui évitent les dépendances directes entre Wiz et composants.

## Briques

- `StateStore` : état global namespacé par chemins, subscriptions ciblées, reset et persistance optionnelle.
- `EventBus` : `on`, `off`, `once`, `emit`, listeners isolés en cas d'erreur.
- `FrameworkRegistry` : registres namespacés pour services, composants, Wiz, providers, adapters, renderers, icons, themes et help.
- `URLResolver` : chemins relatifs, assets, API et URL courante.
- `BrowserStorage` : JSON dans localStorage/sessionStorage via préfixe.
- `Environment` : `production|preview|development` et `visitor|webmaster`.

## Règle de sécurité

`experience: webmaster` est un état UX. Ce n'est jamais une autorisation ni une barrière de sécurité.

## Communication

```text
Component/Wiz
   ├── StateStore
   ├── EventBus
   └── FrameworkRegistry
```

Un composant publie des événements ou lit un service enregistré. Il n'a pas besoin de connaître l'implémentation concrète de l'autre composant.

## Persistance

La persistance navigateur est facultative. Les valeurs initiales restent les valeurs par défaut du projet ; les préférences utilisateur peuvent les surcharger localement sans modifier la configuration canonique.
