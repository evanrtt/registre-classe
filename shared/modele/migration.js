/* ============================================================
   MIGRATION — toute donnée lue passe par Migration.versActuel
   - sauvegarde V2 (« le-registre », version 2) → modèle V3 ;
   - modèle V3 ancien → version actuelle, étape par étape.
   Renvoie { donnees, rapport } : le rapport (phrases) est montré
   au professeur, rien n'est perdu en silence.
   ============================================================ */

const Migration = {
  /* ETAPES[n] fait passer les données de la version n à la version n + 1 */
  ETAPES: {},

  versActuel(d) {
    if (d && d.format === 'le-registre') return Migration.depuisV2(d);
    if (d && d.format === 'registre-envoi') throw new Error('C’est un envoi du PC : utilisez « Recevoir du PC ».');
    if (!d || d.format !== Modele.FORMAT) throw new Error('Ce fichier n’est pas une sauvegarde du Registre.');
    if (!(d.version >= 1)) throw new Error('Sauvegarde sans numéro de version.');
    if (d.version > Modele.VERSION) throw new Error('Sauvegarde faite avec une version plus récente de l’app : mettre l’app à jour avant de l’ouvrir.');
    let out = U.copie(d);
    for (let v = out.version; v < Modele.VERSION; v++) { out = Migration.ETAPES[v](out); out.version = v + 1; }
    return { donnees: out, rapport: [] };
  },

  /* — V2 → V3 — */
  depuisV2(v2) {
    if (!(v2.version >= 2)) throw new Error('Sauvegarde de la toute première version : l’ouvrir d’abord dans le Registre V2, puis l’exporter à nouveau.');
    const dateRef = v2.exporte ? String(v2.exporte).slice(0, 10) : U.today();
    const majRef = v2.exporte || U.maintenant();
    const maj = x => (x && x.maj ? String(x.maj) : majRef);
    const d = Modele.vide(dateRef);
    const rapport = [];

    /* réglages : on garde les périodes et les motifs choisis dans la V2 */
    if ((v2.periodes || []).length) {
      d.reglages.periodes = v2.periodes.map(p => ({ id: p.id, nom: p.nom, debut: p.debut, fin: p.fin }));
      rapport.push(`Périodes de la V2 conservées (${v2.periodes.map(p => p.nom).join(', ')}) : modifiables dans les réglages.`);
    }
    const palette = v2.meta && v2.meta.palette;
    if (palette && palette.length) d.reglages.motifs = palette.map(p => ({ id: p.id, lab: p.lab, valence: p.v || 0 }));
    d.reglages.maj = majRef;

    /* classes et élèves */
    const classes = v2.classes || [];
    d.classes = classes.map(c => ({ id: c.id, nom: c.nom || '', niveau: c.niveau || '', couleur: c.couleur || '', maj: maj(c) }));
    const horsCollege = classes.filter(c => !Modele.NIVEAUX_SCOLAIRES.includes(c.niveau));
    if (horsCollege.length) rapport.push(`Niveau à vérifier pour : ${horsCollege.map(c => c.nom).join(', ')}.`);
    d.eleves = (v2.eleves || []).map(e => ({
      id: e.id, classeId: e.classeId, nom: e.nom || '', prenom: e.prenom || '',
      amenagements: (e.amenagements || []).slice(), notes: e.notes || '',
      suivi: !!e.suivi, suiviMotif: e.suiviMotif || '', maj: maj(e),
    }));
    const eleveExiste = new Set(d.eleves.map(e => e.id));

    /* plans de classe : chaque table V2 devient un poste seul, à réorganiser en îlots */
    classes.forEach(c => {
      const p = c.plan;
      if (!p || !(p.tables || []).length) return;
      const salleId = 'v2-salle-' + c.id;
      d.salles.push({
        id: salleId, nom: 'Plan de ' + (c.nom || 'la classe') + ' (V2)', cols: (p.cols || 8) * 6, rangs: (p.rows || 5) * 5,
        ilots: p.tables.map(t => { const [r, k] = t.split('-').map(Number); return { id: 'i' + t, x: k * 6, y: r * 5, postes: 1, rot: 0 }; }),
        fixes: [], maj: maj(c),
      });
      const places = {};
      Object.entries(p.places || {}).forEach(([t, eid]) => { if (eleveExiste.has(eid)) places['i' + t + '.0'] = eid; });
      d.placements.push({ id: 'v2-placement-' + c.id, classeId: c.id, salleId, places, maj: maj(c) });
    });
    if (d.salles.length) rapport.push(`${U.pl(d.salles.length, 'plan de classe repris', 'plans de classe repris')} en postes seuls : à regrouper en îlots avec « Modifier ».`);

    /* séquences : seules les infos utiles pour évaluer */
    const seqV2 = v2.sequences || [];
    d.sequences = seqV2.map(s => ({
      id: s.id, niveau: s.niveau || '', nom: s.nom || '', num: s.num || null,
      competences: (s.competences || []).slice(), questionnements: (s.questionnements || []).slice(),
      source: 'v2', maj: maj(s),
    }));
    const compDeLigne = {};
    seqV2.forEach(s => ((s.grille && s.grille.lignes) || []).forEach(l => { if (l.compId) compDeLigne[l.id] = l.compId; }));

    /* évaluations : les lignes de grille d'une même séquence se regroupent en une évaluation par classe */
    const niveauDe = Object.fromEntries(classes.map(c => [c.id, c.niveau || '']));
    const groupes = new Map();
    let aPart = 0;
    const evals = (v2.evals || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    evals.forEach(ev => {
      const comp = compDeLigne[ev.grilleLigneId];
      if (ev.mode !== 'maitrise' || !comp) {
        d.archivesV2.push({ id: 'v2-eval-' + ev.id, type: 'evaluation', contenu: U.copie(ev), maj: maj(ev) });
        aPart++;
        return;
      }
      let seqId = ev.chapitreId;
      if (!seqId || !d.sequences.some(s => s.id === seqId)) {
        const niv = niveauDe[ev.classeId] || '';
        seqId = 'v2-sans-sequence-' + (niv || 'x');
        if (!d.sequences.some(s => s.id === seqId)) {
          d.sequences.push({ id: seqId, niveau: niv, nom: 'Évaluations reprises de la V2', num: null, competences: [], questionnements: [], source: 'v2', maj: majRef });
        }
      }
      const cle = ev.classeId + '|' + seqId;
      if (!groupes.has(cle)) {
        groupes.set(cle, { id: 'v2-' + ev.classeId + '-' + seqId, sequenceId: seqId, classeId: ev.classeId, date: ev.date || dateRef, niveaux: {}, maj: maj(ev) });
      }
      const g = groupes.get(cle);
      if (ev.date > g.date) g.date = ev.date;
      if (maj(ev) > g.maj) g.maj = maj(ev);
      const seq = d.sequences.find(s => s.id === seqId);
      if (!seq.competences.includes(comp)) seq.competences.push(comp);
      Object.entries(ev.notes || {}).forEach(([eid, r]) => {
        if (!eleveExiste.has(eid) || !r) return;
        let val = null;
        if (r.st === 'abs') val = Modele.ABSENT;
        else if (r.st === 'disp' || r.st === 'nn') val = Modele.NON_EVALUE;
        else if ([1, 2, 3, 4].includes(r.v)) val = r.v;
        if (val === null) return;
        (g.niveaux[eid] = g.niveaux[eid] || {})[comp] = val;
      });
    });
    d.evaluations = [...groupes.values()];
    if (aPart) rapport.push(`${U.pl(aPart, 'évaluation notée sur 20 ou sans compétence', 'évaluations notées sur 20 ou sans compétence')} : conservées à part, non converties en niveaux.`);

    /* observations (Noter) et punitions */
    d.observations = (v2.obs || []).filter(o => eleveExiste.has(o.eleveId)).map(o => ({
      id: o.id, eleveId: o.eleveId, classeId: o.classeId, date: o.date, h: o.h || '',
      motif: o.pid || '', valence: typeof o.valence === 'number' ? o.valence : 0, texte: o.texte || '',
      sequenceId: o.seqId || '',
      punition: o.pun ? { type: o.pun.type || '', motif: o.pun.motif || '', fait: !!o.pun.fait } : null,
      maj: maj(o),
    }));

    /* appréciations : { classe: { période: { élève: texte } } } → une fiche par élève et par période */
    Object.values(v2.apprec || {}).forEach(parPeriode => {
      Object.entries(parPeriode || {}).forEach(([pid, parEleve]) => {
        Object.entries(parEleve || {}).forEach(([eid, texte]) => {
          if (!texte || !eleveExiste.has(eid)) return;
          d.appreciations.push({ id: 'v2-ap-' + pid + '-' + eid, eleveId: eid, periodeId: pid, texte, maj: majRef });
        });
      });
    });

    rapport.unshift(`Reprise de la V2 : ${U.pl(d.classes.length, 'classe')}, ${U.pl(d.eleves.length, 'élève')}, ${U.pl(d.observations.length, 'observation')}, ${U.pl(d.evaluations.length, 'évaluation')} par compétences, ${U.pl(d.appreciations.length, 'appréciation')}.`);
    rapport.push('Les séquences détaillées, le cahier de textes et les diaporamas de la V2 seront repris par le Registre Atelier (PC).');
    return { donnees: d, rapport };
  },
};
