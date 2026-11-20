/* ============================================================
   MODÈLE V3 — données du Registre Classe (iPhone)
   Valeurs fixes et données vides. Détail des champs : SCHEMA.md.
   Toute fiche a un id unique et un champ maj (horodatage ISO) :
   c'est lui qui départage deux copies lors d'une fusion.
   ============================================================ */

const Modele = {
  FORMAT: 'registre-classe',
  VERSION: 1,

  /* listes de fiches, toutes fusionnées de la même façon */
  COLLECTIONS: ['classes', 'eleves', 'salles', 'placements', 'sequences', 'evaluations',
    'positionnements', 'observations', 'appreciations', 'archivesV2'],

  NIVEAUX_SCOLAIRES: ['6e', '5e', '4e', '3e'],

  /* évaluation par compétences : la couleur s'affiche toujours avec son chiffre */
  NIVEAUX: [
    { n: 1, lab: 'Maîtrise insuffisante', court: 'MI', couleur: 'rouge' },
    { n: 2, lab: 'Maîtrise fragile', court: 'MF', couleur: 'jaune' },
    { n: 3, lab: 'Maîtrise satisfaisante', court: 'MS', couleur: 'vert clair' },
    { n: 4, lab: 'Très bonne maîtrise', court: 'TBM', couleur: 'vert foncé' },
  ],
  ABSENT: 'abs',
  NON_EVALUE: 'ne',

  /* motifs proposés pour Noter (modifiables dans les réglages) */
  MOTIFS: [
    { id: 'part', lab: 'Participation', valence: 1 },
    { id: 'inv', lab: 'Investissement', valence: 1 },
    { id: 'entr', lab: 'Entraide', valence: 1 },
    { id: 'idee', lab: 'Idée originale', valence: 1 },
    { id: 'bav', lab: 'Bavardage', valence: -1 },
    { id: 'pert', lab: 'Perturbe le cours', valence: -1 },
    { id: 'oubli', lab: 'Matériel oublié', valence: -1 },
    { id: 'tnf', lab: 'Travail non fait', valence: -1 },
    { id: 'rang', lab: 'Rangement non fait', valence: -1 },
    { id: 'ret', lab: 'Retard', valence: 0 },
  ],

  /* punitions scolaires que le professeur peut donner (BO spécial n° 6 du 25 août 2011) ;
     les sanctions relèvent du chef d'établissement : on en fait la demande.
     Jamais de zéro disciplinaire. */
  PUNITIONS: [
    { id: 'carnet', lab: 'Mot dans le carnet de correspondance', suivi: 'Vérifier la signature du carnet' },
    { id: 'excuse', lab: 'Excuse orale ou écrite', suivi: '' },
    { id: 'devoir', lab: 'Devoir supplémentaire', suivi: 'Corriger le devoir supplémentaire' },
    { id: 'retenue', lab: 'Retenue', suivi: 'Organiser la retenue avec la vie scolaire' },
    { id: 'exclusion', lab: 'Exclusion ponctuelle de cours', suivi: 'Informer par écrit le CPE et le chef d’établissement', note: 'Exceptionnelle : l’élève est pris en charge, le CPE et le chef d’établissement sont informés par écrit.' },
    { id: 'sanction', lab: 'Demande de sanction (rapport d’incident)', suivi: 'Rédiger le rapport d’incident', note: 'Les sanctions (avertissement, blâme, exclusion…) sont prononcées par le chef d’établissement.' },
  ],

  /* — périodes : trimestres par défaut (dates modifiables dans les réglages) — */
  anneeScolaire(iso) { const [y, m] = String(iso).split('-').map(Number); return m >= 8 ? y : y - 1; },
  trimestres(rentree) {
    return [
      { id: `t1-${rentree}`, nom: '1er trimestre', debut: `${rentree}-09-01`, fin: `${rentree}-11-30` },
      { id: `t2-${rentree}`, nom: '2e trimestre', debut: `${rentree}-12-01`, fin: `${rentree + 1}-03-06` },
      { id: `t3-${rentree}`, nom: '3e trimestre', debut: `${rentree + 1}-03-07`, fin: `${rentree + 1}-07-31` },
    ];
  },
  semestres(rentree) {
    return [
      { id: `s1-${rentree}`, nom: '1er semestre', debut: `${rentree}-09-01`, fin: `${rentree + 1}-01-31` },
      { id: `s2-${rentree}`, nom: '2e semestre', debut: `${rentree + 1}-02-01`, fin: `${rentree + 1}-07-31` },
    ];
  },
  periodeDe(d, iso) { return d.reglages.periodes.find(p => iso >= p.debut && iso <= p.fin) || null; },

  vide(aujourdhui = U.today()) {
    const d = {
      format: Modele.FORMAT,
      version: Modele.VERSION,
      reglages: {
        periodes: Modele.trimestres(Modele.anneeScolaire(aujourdhui)),
        motifs: U.copie(Modele.MOTIFS),
        options: { sequenceFaible: false },
        maj: '',
      },
      supprimes: {},
    };
    Modele.COLLECTIONS.forEach(c => { d[c] = []; });
    return d;
  },

  /* retire une fiche en gardant sa trace : une sauvegarde plus ancienne ne la fera pas revenir */
  supprimer(d, collection, id, maj = U.maintenant()) {
    d[collection] = d[collection].filter(x => x.id !== id);
    d.supprimes[id] = maj;
  },
};
