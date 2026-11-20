# Modèle V3 — Registre Classe (iPhone)

Version du schéma : **1** (`Modele.VERSION`). Format : `registre-classe`.

Toute fiche a un `id` unique et un champ `maj` (date et heure ISO de la dernière modification). Lors d'un import, `maj` départage deux copies d'une même fiche : la plus récente l'emporte, et le professeur voit un résumé de ce qui a changé (`Fusion.resume`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `modele.js` | Valeurs fixes (niveaux de maîtrise, motifs, punitions, trimestres) et données vides |
| `migration.js` | Sauvegarde V2 → V3 ; versions futures du schéma, étape par étape |
| `fusion.js` | Import d'une sauvegarde par fusion, jamais par écrasement |
| `depot.js` | Enregistrement dans un `Stockage`, fichiers de sauvegarde `.registre` |
| `envoi.js` | Fichier « Envoyer vers l’iPhone » du Registre Atelier : lecture et fusion des séquences |

## Données

```
{
  format: 'registre-classe', version: 1,
  reglages:  { periodes: [...], motifs: [...], options: { sequenceFaible }, maj },
  supprimes: { <id>: <maj de la suppression> },
  classes, eleves, salles, placements, sequences, evaluations,
  positionnements, observations, appreciations, archivesV2
}
```

### Réglages
- `periodes` : `{ id, nom, debut, fin }` (dates ISO). Trimestres par défaut : T1 du 1er septembre au 30 novembre, T2 du 1er décembre au 6 mars, T3 du 7 mars au 31 juillet (semestres possibles). La période d'une fiche se déduit de sa date.
- `motifs` : boutons de Noter, `{ id, lab, valence }` avec `valence` = 1 (positif), −1 (négatif) ou 0.
- `options.sequenceFaible` : afficher la séquence la moins bien réussie dans la fiche élève (désactivé par défaut).

### Fiches

| Collection | Champs | Notes |
|---|---|---|
| `classes` | `id, nom, niveau, couleur, maj` | `niveau` ∈ 6e, 5e, 4e, 3e (le cycle s'en déduit) |
| `eleves` | `id, classeId, nom, prenom, amenagements[], notes, suivi, suiviMotif, maj` | `amenagements` : textes libres (PAP, PPS…) |
| `salles` | `id, nom, cols, rangs, ilots[], fixes[], maj` | Une salle sert à plusieurs classes |
| `placements` | `id, classeId, salleId, places, maj` | `places` : `{ '<ilotId>.<poste>': eleveId }` |
| `sequences` | `id, niveau, nom, num, competences[], questionnements[], source, pcId, maj` | Compétences **de la séquence** ; `source` : `pc`, `iphone` ou `v2` ; `pcId` (facultatif) : identifiant de la séquence dans le Registre Atelier, posé à la réception d’un envoi |
| `evaluations` | `id, sequenceId, classeId, date, niveaux, maj` | En général une par séquence et par classe. `date` = jour du premier niveau posé (modifiable) : elle range l'évaluation dans sa période |
| `positionnements` | `id, eleveId, periodeId, competenceId, niveau, maj` | Positionnement choisi à la main ; sans fiche, il est calculé : le niveau le plus fréquent de la période, à égalité le plus récent |
| `observations` | `id, eleveId, classeId, date, h, motif, valence, texte, sequenceId, punition, maj` | `punition` : `null` ou `{ type, motif, fait }` (type ∈ `PUNITIONS`) |
| `appreciations` | `id, eleveId, periodeId, texte, maj` | |
| `archivesV2` | `id, type, contenu, maj` | Données V2 non converties (notes sur 20…), gardées telles quelles |

- **Îlot** : `{ id, x, y, postes, rot }` — coin haut-gauche sur la grille, en cases de papier quadrillé, chaises comprises ; un poste fait 5 × 3 cases plus 1 case de chaise (côté opposé au tableau) ; 1 à 3 postes ; rotation 0 (chaises en haut, élèves tournés vers le tableau en bas), 90, 180 ou 270.
- **Élément fixe** : `{ id, type, x, y, l, h }` — `type` ∈ tableau, bureau, table, porte, fenetre. Les éléments du même type qui se chevauchent forment un groupe (le bureau en L) : ils se déplacent et tournent ensemble.
- **Niveaux d'une évaluation** : `{ <eleveId>: { <competenceId>: 1 | 2 | 3 | 4 | 'abs' | 'ne' } }`. 1 rouge, 2 jaune, 3 vert clair, 4 vert foncé ; `abs` = absent, `ne` = non évalué.

## Règles

- **Suppression** : `Modele.supprimer` retire la fiche et note son `id` dans `supprimes`. Une sauvegarde plus ancienne ne la fait pas revenir.
- **Nouvelle version du schéma** : incrémenter `Modele.VERSION` et ajouter `Migration.ETAPES[n]` (passage de n à n + 1). Ne jamais modifier une étape publiée.
- **Reprise de la V2** : périodes et motifs conservés ; plans de classe repris en postes seuls ; évaluations « maîtrise » regroupées par classe et séquence (la compétence vient de la ligne de grille) ; notes sur 20 gardées dans `archivesV2` ; séquences détaillées, cahier et diaporamas laissés au Registre Atelier (PC).

## Envoi du PC (`envoi.js`)

Fichier `Envoi vers l’iPhone AAAA-MM-JJ.registre` produit par le Registre Atelier (Réglages → « Envoyer vers l’iPhone »), reçu sur l’iPhone par Plus → « Recevoir du PC ». Sens unique, hors ligne.

```
{
  format: 'registre-envoi', version: 1, exporte: <ISO>,
  sequences: [{ id, niveau, num, nom, competences[], questionnements[] }],
  classes:   [{ nom, niveau, couleur }],
  cours:     [{ d, h, f, salle, classe, seance }],
  taches:    [{ titre, echeance, classe }]
}
```

- `cours` : les cours des 28 jours qui suivent l’export, vacances et jours fériés retirés ; `classe` = nom de la classe. `seance` vaut `null` ou `{ seq, n, titre, consigne, contrainte, materiel[], apporter }` (`seq` = « Séq. n — nom », `n` = rang de la séance).
- **Séquences** : fusionnées dans `sequences`. Appariement par `pcId`, sinon par niveau + numéro avec une séquence saisie sur l’iPhone qui n’a pas encore de `pcId`. La fiche garde son `id` (les évaluations y restent attachées) ; niveau, numéro, nom, compétences et questionnements viennent du PC. Une autre séquence du même niveau qui portait ce numéro le perd (`num: null`), et le résumé le signale. Les évaluations ne sont jamais modifiées.
- **Aujourd’hui** : `exporte`, `classes`, `cours` et `taches` sont rangés à part dans le stockage (`envoi/aujourdhui`) et remplacés à chaque envoi. Ils ne font pas partie de la sauvegarde : il suffit de renvoyer le fichier depuis le PC.
- Version plus récente que `Envoi.VERSION` : refusée (« mettez l’app à jour »).
