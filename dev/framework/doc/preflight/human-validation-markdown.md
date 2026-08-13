# 🟣👤 Validation HUMAN par cases Markdown

## Objet

Ce contrat transforme un rapport HUMAN Markdown en interface de décision légère et relisible par machine.

Le principe retenu est :

```text
run report JSON machine
        ↓
synthèse HUMAN dérivée
        ↓
rapport Markdown à cases
        ↓
réponse HUMAN
        ↓
lecture machine
        ↓
pass / fail / blocked pour le runner
```

Le Markdown n'est pas une deuxième source de vérité technique : il contient uniquement la réponse HUMAN appliquée à des points dérivés du rapport machine.

## Format d'un point à valider

```md
<!-- nlab-human-validation-item:{"id":"HV-001","stage_id":"generation.preview","kind":"human-stage"} -->
## HV-001 — Preview

**À vérifier :** Confirmer le rendu visuel.

**Source :** [Ouvrir la preview](https://example.test/preview)

- [ ] ✅ Validé
- [ ] 🔁 À retravailler

> Commentaire HUMAN (optionnel) :

<!-- /nlab-human-validation-item -->
```

Les commentaires HTML `nlab-human-validation-*` sont des marqueurs machine et ne doivent pas être supprimés lors de la réponse HUMAN.

## Réponse HUMAN

Pour chaque point, une seule réponse est autorisée :

### Validé

```md
- [x] ✅ Validé
- [ ] 🔁 À retravailler
```

### À retravailler

```md
- [ ] ✅ Validé
- [x] 🔁 À retravailler
```

### Pas encore décidé

```md
- [ ] ✅ Validé
- [ ] 🔁 À retravailler
```

Les deux cases cochées simultanément constituent une réponse invalide et bloquent la reprise automatique.

Dans un fichier `.md` GitHub, l'état exploité par le framework est l'état enregistré dans la source (`[ ]` ou `[x]`). L'utilisateur peut donc modifier le rapport dans l'éditeur GitHub ou par son workflow Git habituel ; à la relecture du fichier, la décision est immédiatement déterminable.

## États machine

`parseHumanValidationMarkdown()` produit `nlab.human-validation-markdown-state` V1 :

- toutes les cases nécessaires validées → `validated` ;
- au moins un point `À retravailler` → `rework` ;
- au moins un point sans réponse et aucun rework → `pending` ;
- une paire contradictoire → `invalid`.

`humanValidationDecisionFromMarkdown()` convertit ensuite cet état dans le vocabulaire du `SiteGenerationRunner` :

| Markdown HUMAN | Décision runner |
|---|---|
| `validated` | `pass` |
| `rework` | `fail` |
| `pending` | `blocked` |
| `invalid` | erreur explicite, aucune continuation |

La sortie est directement compatible avec l'entrée `decisions[stage.id]` du runner.

## Génération du rapport

`buildHumanValidationMarkdown(summaryOrReport, options)` génère le rapport à partir :

- d'un `nlab.site-generation-run-report` V1 ; ou
- d'un `nlab.site-generation-human-summary` V1.

L'option `sources` permet d'associer un lien à un contrôle via son `stage_id` ou son ID `HV-xxx` : preview, document de comparaison, capture, spécification, PR, etc.

Exemple :

```js
const markdown = buildHumanValidationMarkdown(summary, {
  sources: {
    'generation.preview': {
      label: 'Ouvrir la preview',
      url: 'https://example.test/preview'
    }
  }
});
```

## Règles de gouvernance

1. Un rapport HUMAN ne contient que les points nécessitant réellement une intervention humaine.
2. Un lien de consultation est ajouté lorsqu'un artefact de preuve ou une preview existe.
3. Une seule réponse peut être cochée par point.
4. `À retravailler` empêche la validation globale, même si d'autres points sont validés.
5. Une absence de réponse maintient le workflow en `blocked`, sans inventer de décision.
6. Le commentaire HUMAN reste libre et informatif ; la décision machine est portée exclusivement par les cases.
7. Les marqueurs HTML et IDs `HV-xxx` sont conservés afin que la lecture ne dépende pas du texte visible.
8. Aucune modification automatique du JSON machine source n'est réalisée : la réponse HUMAN est une décision de workflow distincte et traçable.

## Portée

Le mécanisme est générique et peut être réutilisé pour :

- validation de preview ;
- comparaison visuelle ;
- choix d'architecture ;
- validation de migration ;
- contrôle d'un résultat de génération ;
- tout autre jalon HUMAN exposé par un framework/projet nLab.
