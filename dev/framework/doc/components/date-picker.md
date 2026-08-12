# DatePicker — contrat de composant simple

## Objectif

`DatePicker` est une primitive date minimale et réutilisable pour formulaires et filtres. Le contrat reste volontairement limité au besoin V2 : une date civile unique, sans calendrier avancé, agenda, timeline ni génération ICS.

La valeur canonique est toujours une chaîne ISO `YYYY-MM-DD`. Le composant n'utilise pas d'heure ni de fuseau horaire pour comparer les dates.

## API principale

```js
const picker = new DatePicker({
  value: '2026-08-12',
  min: '2026-01-01',
  max: '2026-12-31',
  required: true,
  label: 'Date de publication'
});
```

Options :

- `value` : date courante ou chaîne vide ;
- `min` / `max` : bornes ISO optionnelles ;
- `required` : interdit une valeur vide lors de la validation ;
- `disabled` : rend le contrôle natif inactif ;
- `id`, `name`, `label`, `help` : métadonnées de formulaire ;
- `onChange(detail)` : callback optionnel ;
- `documentRef` : référence DOM injectable pour compatibilité hors navigateur.

## Validation

`DatePicker.isValidIsoDate(value)` valide strictement le calendrier, y compris les années bissextiles.

`DatePicker.normalizeDate(value)` :

- supprime les espaces périphériques ;
- accepte une valeur vide par défaut ;
- lève `TypeError` pour une date non ISO ou impossible ;
- `allowEmpty:false` permet de rendre la normalisation stricte sur le vide.

`validate(value)` ne modifie pas l'état et retourne :

```js
{
  valid: false,
  value: '2026-07-31',
  errors: [
    { code: 'min', message: 'Date must be on or after 2026-08-01', min: '2026-08-01' }
  ]
}
```

Codes d'erreur :

- `required` ;
- `invalid-date` ;
- `min` ;
- `max`.

## Mutations

- `setValue(value, options)` applique uniquement une valeur valide au regard du contrat courant ; une valeur invalide est refusée sans écraser la valeur précédente ;
- `setRange({ min, max })` modifie les bornes et refuse une plage où `min > max` ;
- `setRequired(bool)` ;
- `setDisabled(bool)` ;
- `setOnChange(callback)`.

`state()` retourne un snapshot indépendant contenant valeur, bornes, flags et erreurs de validation.

## Événements

Une mutation valide avec changement de valeur :

1. appelle `onChange(detail)` si fourni ;
2. émet `nlab:date-change` via `CustomEvent` lorsque cette primitive est disponible et que le composant est monté.

Le champ `detail.source` vaut `api` pour une mutation programmatique ou `input` pour un changement venant du champ natif.

## Rendu et accessibilité

`mount(element)` rend un contrôle natif `<input type="date">` avec :

- `label` associé ;
- `min`, `max`, `required`, `disabled` ;
- `aria-invalid` ;
- `aria-describedby` vers aide/erreur lorsque nécessaire ;
- zone d'erreur `role="status"` / `aria-live="polite"`.

Toutes les valeurs injectées dans le HTML sont échappées.

Hors navigateur, le composant peut être instancié et validé normalement sans DOM. `mount(null)` et `render()` restent sans effet destructif.

`destroy()` vide le conteneur monté puis détache la référence.

## Tests

`dev/framework/tests/date-picker.test.mjs` couvre notamment :

- dates valides et impossibles ;
- année bissextile ;
- format ISO strict ;
- required/min/max ;
- refus atomique des valeurs invalides ;
- changement de plage ;
- callback de changement ;
- snapshot isolé ;
- rendu natif, attributs et échappement HTML ;
- changement issu du champ ;
- destruction ;
- exécution sans DOM.

Baseline du lot : Node 22, `date picker tests: ok`.

## Hors périmètre

Ce composant ne couvre pas :

- calendrier mensuel personnalisé ;
- sélection de période/date-range ;
- date + heure ;
- agenda ;
- timeline ;
- récurrences ;
- génération ICS.

Ces fonctions restent des briques distinctes et ne sont pas nécessaires au DatePicker simple V2.
