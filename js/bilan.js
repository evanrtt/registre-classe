/* ============================================================
   BILAN — calculs du suivi, par période (trimestre par défaut)
   - Une évaluation appartient à la période de sa date.
   - Positionnement d'une compétence sur la période : le niveau
     le plus fréquent ; à égalité, le plus récent. Le professeur
     peut le changer à la main (fiche « positionnements »).
   - Tendance : dernier niveau comparé au premier de la période.
   - Séquence la moins bien réussie : moyenne des niveaux la plus
     basse ; à égalité, la plus récente (Q9, à confirmer).
   ============================================================ */

const Bilan = {
  choix: null,          // période choisie à l'écran (partagée par la fiche élève et la vue classe)

  periodes() { return App.d.reglages.periodes.slice().sort((a, b) => a.debut.localeCompare(b.debut)); },
  periode(id) { return Bilan.periodes().find(p => p.id === id) || null; },
  courante() {
    const ps = Bilan.periodes(), t = U.today();
    return ps.find(p => t >= p.debut && t <= p.fin) || ps.filter(p => p.debut <= t).pop() || ps[0] || null;
  },
  choisie() { return Bilan.periode(Bilan.choix) || Bilan.courante(); },
  precedente(p) { const ps = Bilan.periodes(); const i = ps.findIndex(x => x.id === p.id); return i > 0 ? ps[i - 1] : null; },
  /* « T1 », « S2 »… pour les boutons ; sinon le nom */
  court(p) { const m = /^(\d)\D*(trimestre|semestre)/i.exec(p.nom); return m ? m[2][0].toUpperCase() + m[1] : p.nom; },
  mot(p) { return /semestre/i.test(p.nom) ? 'semestre' : /trimestre/i.test(p.nom) ? 'trimestre' : 'période'; },
  dans(p, iso) { return !!iso && iso >= p.debut && iso <= p.fin; },
  segments(act) {
    const p = Bilan.choisie();
    return `<div class="segments">${Bilan.periodes().map(x => `<button type="button" class="seg" data-act="${act}" data-id="${U.esc(x.id)}" aria-pressed="${x.id === p?.id}">${U.esc(Bilan.court(x))}</button>`).join('')}</div>`;
  },

  /* — compétences — */
  evaluations(cid, p) {
    return App.d.evaluations.filter(ev => ev.classeId === cid && Bilan.dans(p, ev.date))
      .map(ev => ({ ev, seq: App.d.sequences.find(s => s.id === ev.sequenceId) })).filter(x => x.seq)
      .sort((a, b) => a.ev.date.localeCompare(b.ev.date) || (a.seq.num || 0) - (b.seq.num || 0));
  },
  rang(id) { const c = Programme.competence(id); return c ? Programme.competencesDu(c.cycle).findIndex(x => x.id === id) : 999; },
  competencesClasse(cid, p) {
    const s = new Set();
    Bilan.evaluations(cid, p).forEach(({ seq }) => (seq.competences || []).forEach(id => s.add(id)));
    return [...s].sort((a, b) => Bilan.rang(a) - Bilan.rang(b));
  },
  nombres(vals) { return vals.map(x => x.v).filter(v => typeof v === 'number'); },
  auto(vals) {
    const n = Bilan.nombres(vals); if (!n.length) return null;
    const cpt = {}; n.forEach(v => { cpt[v] = (cpt[v] || 0) + 1; });
    const max = Math.max(...Object.values(cpt));
    for (let i = n.length - 1; i >= 0; i--) if (cpt[n[i]] === max) return n[i];
    return null;
  },
  tendance(vals) { const n = Bilan.nombres(vals); return n.length < 2 ? 0 : Math.sign(n[n.length - 1] - n[0]); },
  manuel(eid, pid, comp) { return App.d.positionnements.find(x => x.eleveId === eid && x.periodeId === pid && x.competenceId === comp) || null; },
  /* une ligne par compétence évaluée dans la période : { comp, vals: [{ seq, v }], auto, pos, manuel, tendance } */
  lignes(e, p) {
    const m = new Map();
    Bilan.evaluations(e.classeId, p).forEach(({ ev, seq }) => (seq.competences || []).forEach(comp => {
      if (!m.has(comp)) m.set(comp, []);
      m.get(comp).push({ seq, v: ev.niveaux[e.id]?.[comp] });
    }));
    return [...m.entries()].sort((a, b) => Bilan.rang(a[0]) - Bilan.rang(b[0])).map(([comp, vals]) => {
      const auto = Bilan.auto(vals), man = Bilan.manuel(e.id, p.id, comp);
      return { comp, vals, auto, manuel: !!man?.niveau, pos: man?.niveau || auto, tendance: Bilan.tendance(vals) };
    });
  },
  /* niveau choisi à la main (null = revenir au calcul) */
  poserManuel(eid, pid, comp, niveau) {
    const m = Bilan.manuel(eid, pid, comp);
    if (niveau == null) { if (m) App.supprimer('positionnements', m.id); return; }
    if (m) { m.niveau = niveau; App.modifie('positionnements', m); return; }
    const x = { id: U.id('p'), eleveId: eid, periodeId: pid, competenceId: comp, niveau, maj: U.maintenant() };
    App.d.positionnements.push(x); App.modifie('positionnements');
  },
  faible(e, p) {
    let pire = null;
    Bilan.evaluations(e.classeId, p).forEach(({ ev, seq }) => {
      const vals = Evaluer.ordre(seq).map(comp => ({ comp, v: ev.niveaux[e.id]?.[comp] }));
      const moy = U.moy(Bilan.nombres(vals));
      if (moy !== null && (!pire || moy <= pire.moy)) pire = { seq, vals, moy };
    });
    return pire;
  },

  /* — comportement : compteurs par motif sur la période, et sur la période d'avant — */
  observations(eid, p) { return p ? App.d.observations.filter(o => o.eleveId === eid && Bilan.dans(p, o.date)) : []; },
  comportement(eid, p) {
    const avant = Bilan.precedente(p);
    const compter = obs => { const c = {}; obs.forEach(o => { if (o.motif === 'libre' || o.motif === 'punition') return; c[o.motif] = (c[o.motif] || 0) + 1; }); return c; };
    const ici = compter(Bilan.observations(eid, p)), la = compter(Bilan.observations(eid, avant));
    const motifs = new Map(App.d.reglages.motifs.map(m => [m.id, m]));
    const exemple = id => Bilan.observations(eid, p).concat(Bilan.observations(eid, avant)).find(o => o.motif === id);
    return [...new Set([...Object.keys(ici), ...Object.keys(la)])].map(id => {
      const m = motifs.get(id) || { id, lab: exemple(id)?.texte || id, valence: exemple(id)?.valence || 0 };
      return { id, lab: m.lab, valence: m.valence, n: ici[id] || 0, avant: avant ? la[id] || 0 : null };
    }).filter(x => x.n || x.avant).sort((a, b) => b.valence - a.valence || b.n - a.n);
  },
  totaux(eid, p) {
    const t = { plus: 0, moins: 0 };
    Bilan.observations(eid, p).forEach(o => { if (o.valence > 0) t.plus++; else if (o.valence < 0) t.moins++; });
    return t;
  },
  /* notes libres et punitions, les plus récentes d'abord */
  faits(eid, p) {
    return Bilan.observations(eid, p).filter(o => o.motif === 'libre' || o.punition)
      .sort((a, b) => (b.date + b.h).localeCompare(a.date + a.h));
  },

  /* — appréciation — */
  appreciation(eid, pid) { return App.d.appreciations.find(a => a.eleveId === eid && a.periodeId === pid) || null; },
  ecrireAppreciation(eid, pid, texte) {
    let a = Bilan.appreciation(eid, pid);
    if (!a) { if (!texte) return; a = { id: U.id('a'), eleveId: eid, periodeId: pid, texte: '' }; App.d.appreciations.push(a); }
    a.texte = texte;
    App.modifie('appreciations', a);
  },
  /* brouillon à partir des compétences et du comportement ; le professeur le relit et le corrige */
  brouillon(e, p) {
    const mot = Bilan.mot(p);
    const lignes = Bilan.lignes(e, p).filter(l => typeof l.pos === 'number');
    const cmp = Bilan.comportement(e.id, p);
    const n = (...ids) => ids.reduce((a, id) => a + (cmp.find(x => x.id === id)?.n || 0), 0);
    const plus = cmp.filter(x => x.valence > 0).reduce((a, x) => a + x.n, 0);
    const moins = cmp.filter(x => x.valence < 0).reduce((a, x) => a + x.n, 0);
    const bas = id => { const t = Programme.courte(id); return t.charAt(0).toLowerCase() + t.slice(1); };
    const ph = [];
    let moy = null;
    if (lignes.length) {
      moy = U.moy(lignes.map(l => l.pos));
      ph.push(moy >= 3.5 ? `Très bon ${mot} en arts plastiques.` : moy >= 2.75 ? `Bon ${mot} en arts plastiques.`
        : moy >= 2 ? `Un ${mot} correct, avec des acquis encore fragiles.` : `Un ${mot} difficile : les compétences travaillées ne sont pas encore maîtrisées.`);
      const tri = lignes.slice().sort((a, b) => b.pos - a.pos);
      const fort = tri[0], faible = tri[tri.length - 1];
      if (fort.pos >= 3) ph.push(`Point fort : ${bas(fort.comp)}.`);
      if (faible !== fort && faible.pos <= 2) ph.push(`À consolider : ${bas(faible.comp)}.`);
    }
    if (n('part', 'inv') >= 3) ph.push('Participation active en classe.');
    else if (plus >= 3) ph.push('Une attitude positive en classe.');
    if (n('bav', 'pert') >= 3) ph.push('Les bavardages gênent le travail : plus de concentration est attendue.');
    if (n('oubli') >= 2) ph.push('Attention aux oublis de matériel.');
    if (n('tnf') >= 2) ph.push('Le travail demandé doit être fait.');
    if (!ph.length) return `Pas encore assez d’éléments pour ce ${mot}.`;
    if (moy !== null) ph.push(moy >= 2.75 && moins < 3 ? 'Continuez ainsi !' : 'Courage, les progrès sont à portée.');
    return ph.join(' ');
  },
};
