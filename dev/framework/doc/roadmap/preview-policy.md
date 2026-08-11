# Preview multi-versions — politique de validation

## Objectif

La Preview du nLab Web Framework sert de banc de validation humaine. Une nouvelle review ne doit plus remplacer silencieusement la précédente : elle est publiée comme snapshot autonome afin de permettre une comparaison immédiate et un retour à une base saine.

## Référence actuelle

- dernière version visuellement déclarée fonctionnelle : **V16** ;
- V17 : régression visible signalée ;
- V18/V19 : non validées ;
- V15/V14/V13 : conservées comme points de comparaison.

## Publication

Le dépôt `nLab-Webmaster-Preview` publie un index public contenant les dernières reviews admissibles.

Chaque entrée affiche au minimum :

- `Version N` pour la lecture humaine de l’index ;
- numéro de review d’origine ;
- date/heure de la review ;
- SHA exact du nLab Web Framework ;
- lien vers un snapshot autonome.

## Contrôles automatiques avant exposition

Une review n’est ajoutée à l’index que si le build vérifie au minimum :

1. présence de la page de démonstration ;
2. présence des fichiers de style et du runtime principal ;
3. présence des briques critiques existantes à cette étape, notamment DataWiz, QRWiz, JSON Studio et Theme Workshop ;
4. syntaxe JavaScript des fichiers du snapshot ;
5. résolution des imports relatifs locaux ;
6. construction complète de l’artefact GitHub Pages.

Ces contrôles sont des **smoke tests techniques**. Ils ne remplacent pas la validation visuelle HUMAN.

## Règle de non-régression

Une version peut être :

- **techniquement admissible** : elle passe les contrôles automatiques ;
- **visuellement validée** : elle est testée par l’utilisateur et jugée saine ;
- **référence stable** : elle devient la base de reprise connue.

Ne jamais assimiler ces trois états.

## Politique de conservation

- conserver au minimum les cinq dernières reviews testables dans l’index ;
- ne pas supprimer une version encore utile au diagnostic ;
- une nouvelle review est ajoutée, pas substituée ;
- le numéro visible de review reste cohérent avec le cycle de démonstration ;
- les SHAs sources restent immuables dans les snapshots.

## Reprise après régression

Si une review N est cassée et N-1 fonctionne :

1. figer N-1 comme référence ;
2. comparer N-1 → N ;
3. isoler les modifications fonctionnelles ;
4. corriger ou réintroduire les changements par petits lots ;
5. publier chaque correction comme nouvelle review autonome ;
6. valider visuellement avant promotion de la nouvelle référence.

## URL publique

`https://nepheris.github.io/nLab-Webmaster-Preview/`
