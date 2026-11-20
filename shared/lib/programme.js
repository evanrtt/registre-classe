/* ============================================================
   PROGRAMME — accès au programme officiel d'arts plastiques
   Données : shared/programme/programme.json (programme 2020).
   Cycle 3 = 6e ; cycle 4 = 5e, 4e, 3e.
   ============================================================ */

const Programme = {
  donnees: null,
  _index: null,

  /* l'URL dépend de la page qui charge (ex. 'shared/programme/programme.json') */
  async charger(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Programme introuvable : ' + url);
    Programme.utiliser(await r.json());
  },
  utiliser(d) { Programme.donnees = d; Programme._index = null; },

  /* — niveaux et cycles — */
  niveaux() { return Object.keys(Programme.donnees.niveaux).sort(U.sortNiv); },
  cycleDe(niveau) { return Programme.donnees.niveaux[niveau] || null; },
  cycle(c) { return Programme.donnees.cycles[c] || null; },

  /* — recherche par identifiant — */
  _idx() {
    if (Programme._index) return Programme._index;
    const ix = { groupes: {}, competences: {}, questionnements: {}, items: {} };
    for (const [c, cy] of Object.entries(Programme.donnees.cycles)) {
      const cycle = Number(c);
      cy.competences.forEach(g => {
        ix.groupes[g.id] = { ...g, cycle };
        g.items.forEach(it => { ix.competences[it.id] = { ...it, groupe: ix.groupes[g.id], cycle }; });
      });
      cy.questionnements.forEach(q => {
        ix.questionnements[q.id] = { ...q, cycle };
        q.items.forEach(it => { ix.items[it.id] = { ...it, questionnement: ix.questionnements[q.id], cycle }; });
      });
    }
    return (Programme._index = ix);
  },
  /* une compétence détaillée (ex. 'c4k2e'), avec son grand domaine (groupe) et son cycle */
  competence(id) { return Programme._idx().competences[id] || null; },
  /* un des 4 grands domaines de compétences (ex. 'c4k2') */
  groupe(id) { return Programme._idx().groupes[id] || null; },
  /* un sous-questionnement (ex. 'c3q1d'), avec son questionnement parent */
  questionnement(id) { return Programme._idx().items[id] || null; },
  domaineSocle(id) { return Programme.donnees.domainesSocle.find(d => d.id === id) || null; },

  /* toutes les compétences détaillées d'un cycle, dans l'ordre du programme */
  competencesDu(c) {
    const cy = Programme.cycle(c);
    return cy ? cy.competences.flatMap(g => g.items.map(it => Programme.competence(it.id))) : [];
  },
  /* libellé court, pour une pastille ou un en-tête de colonne */
  courte(id) {
    const c = Programme.competence(id);
    return c ? (c.court || c.lab) : '';
  },
};
