# Lot 9 — Checklist de pré-vol opérationnelle

> Fiche humaine associée à [`lot9-preflight.machine.json`](./lot9-preflight.machine.json).  
> Cette fiche ne remplace ni la roadmap canonique ni les verrous de coordination. Avant toute action, relire `coordination/locks/`.

## 1. Décision actuelle

**Préparation Lot 9 : autorisée.**  
**Intégration réelle Recettes du Cœur : pas encore prête.**

Le travail de préparation peut avancer sans toucher au runtime de référence : inventaire métier, mapping, fixtures, structure d’atelier, contrats de rendu et checklist de génération.

L’intégration réelle doit attendre la levée des portes bloquantes ci-dessous.

## 2. Contrôle rapide

| Gate | Contrôle | État snapshot | Source / propriétaire |
|---|---|---|---|
| `P9-001` | séparation Framework / métier | ✅ pass | pré-vol Lot 9 |
| `P9-002` | schémas data validés | 🟡 in progress | Agent B — `8B-DATA-SCHEMAS-VALIDATION` |
| `P9-003` | Search / Filter / Table robustes | 🟡 in progress | A/B selon verrous et issue #1 |
| `P9-004` | Media / QR robustes | 🟡 in progress | Agent B — `8B-QR-MEDIA-ROBUSTNESS` |
| `P9-005` | SEO / Share | 🟡 in progress | Agent B — `8B-SEO-SHARE-CONTRACTS` |
| `P9-006` | observabilité runtime | 🟡 in progress | Agent B — `8B-OBSERVABILITY-ROBUSTNESS` |
| `P9-007` | référence UX validée | 🟣 bloqué HUMAN | Agent A / H001 / V20 |
| `P9-008` | données Recettes du Cœur accessibles et inventoriées | ⛔ externe | dépôt/données métier |
| `P9-009` | vertical slice défini | ✅ ready | pré-vol Lot 9 |
| `P9-010` | politique Preview disponible | ✅ ready | `preview-policy.md` |
| `P9-011` | discipline multi-agent active | ✅ pass | coordination/locks |

> Les états ci-dessus sont un **snapshot**. La source live reste `dev/framework/doc/roadmap/coordination/locks/`.

## 3. Conditions minimales avant le vrai crash-test

Le vertical slice réel ne démarre que lorsque :

- les schémas `collection`, `data-registry` et `relation` ont leurs validations positives/négatives ;
- Search / Filter / Table disposent d’un chemin testé suffisant pour index, filtrage et rendu ;
- Media / QR ont leurs fallbacks et cas d’erreur sécurisés ;
- SEO / Share disposent de contrats déterministes ;
- RuntimeMonitor expose les erreurs du crash-test sans perte silencieuse ;
- la référence UX retenue est explicitement validée HUMAN ;
- les vraies données métier Recettes du Cœur sont accessibles et inventoriées.

## 4. Travail C autorisé sans dépendance

Tant que les gates précédentes sont ouvertes, l’agent C peut travailler uniquement sur des éléments ne modifiant pas le runtime réservé :

1. préparer un inventaire des datasets Recettes du Cœur dès que le dépôt métier est accessible ;
2. préparer le mapping `recette → ingrédients → référentiels liés` ;
3. définir les fixtures minimales du vertical slice ;
4. vérifier que la séparation cible `atelier / data / assets / config / web` reste respectée ;
5. tenir la checklist machine à jour par une tâche réservée distincte si le modèle évolue.

## 5. Vertical slice cible

Quand les gates sont levées :

```text
vraies recettes + ingrédients
        ↓
résolution des relations
        ↓
index public
        ↓
fiche recette
        ↓
recherche + filtres minimaux
        ↓
images + fallback
        ↓
URL + QR
        ↓
Preview immuable
```

Le premier crash-test doit rester volontairement étroit. Les astuces, PDF, exports avancés et référentiels secondaires viennent après validation de cette tranche verticale.

## 6. Contrôle avant prise d’une nouvelle tâche

Avant toute nouvelle réservation C :

1. relire `coordination/README.md` ;
2. relire **tous** les fichiers `coordination/locks/*.json` ;
3. comparer les `file_scope` ;
4. vérifier le HEAD de `New` ;
5. créer un verrou atomique distinct ;
6. travailler sur une branche dédiée ;
7. ne jamais modifier `roadmap.md` pendant qu’un autre agent consolide la roadmap.

## 7. Critère de sortie de cette tâche

Cette tâche est terminée lorsque :

- la checklist machine est valide JSON ;
- la fiche humaine décrit les mêmes gates ;
- aucun fichier réservé A/B n’a été modifié ;
- la branche C ne contient que les deux fichiers annoncés ;
- le verrou `9-PREFLIGHT-MACHINE-CHECKLIST` passe à `review` avec le SHA final.
