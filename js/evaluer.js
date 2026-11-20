/* ============================================================
   ÉVALUER — une évaluation par séquence et par classe, sur les
   compétences de la séquence. Comme pour Noter : on choisit le
   niveau en bas (1 rouge · 2 jaune · 3 vert clair · 4 vert foncé,
   Abs, NE), puis on touche les cases. Toucher une case qui a déjà
   ce niveau l'efface. En-tête de colonne : remplir les cases vides.
   ============================================================ */

const Evaluer = {
  titre: 'Évaluer',
  avecClasse: true,
  sequence: {},         // classe → séquence ouverte
  pinceau: null,

  ordre(s) {
    const cy = Programme.cycleDe(s.niveau);
    const tous = cy ? Programme.competencesDu(cy).map(c => c.id) : [];
    return (s.competences || []).slice().sort((a, b) => tous.indexOf(a) - tous.indexOf(b));
  },
  sequencesDe(niveau) { return App.d.sequences.filter(s => s.niveau === niveau).sort((a, b) => (a.num || 99) - (b.num || 99)); },
  evaluation(sid, cid, creer) {
    let ev = App.d.evaluations.find(x => x.sequenceId === sid && x.classeId === cid);
    if (!ev && creer) { ev = { id: U.id('v'), sequenceId: sid, classeId: cid, date: U.today(), niveaux: {}, maj: U.maintenant() }; App.d.evaluations.push(ev); }
    return ev || null;
  },
  libelle(s) { return `Séq. ${s.num || '?'} — ${s.nom || 'Sans titre'}`; },

  afficher(root) {
    const c = App.classe();
    if (!c) { root.innerHTML = `<div class="vide-grand"><b>Aucune classe</b><p>Créez d’abord une classe dans « Classes ».</p></div>`; return; }
    const s = App.d.sequences.find(x => x.id === Evaluer.sequence[c.id] && x.niveau === c.niveau);
    return s ? Evaluer.grille(root, c, s) : Evaluer.liste(root, c);
  },

  liste(root, c) {
    const seqs = Evaluer.sequencesDe(c.niveau);
    const n = App.elevesDe(c.id).length;
    root.innerHTML = `
      <div class="ligne-outils"><span class="aide">Séquences de ${U.esc(c.niveau)} : choisissez celle que vous évaluez.</span>
        <span class="sp"></span><button type="button" class="btn" data-act="ev.bilan">Suivi de la classe</button></div>
      ${seqs.length ? `<div class="liste-cartes">${seqs.map(s => {
        const ev = Evaluer.evaluation(s.id, c.id);
        const faits = ev ? Object.values(ev.niveaux).filter(x => Object.keys(x).length).length : 0;
        return `<button type="button" class="carte-classe" data-act="ev.ouvrir" data-id="${U.esc(s.id)}">
          <b>${U.esc(Evaluer.libelle(s))}</b><span>${U.pl((s.competences || []).length, 'compétence')} · ${faits}/${n} élèves évalués</span></button>`;
      }).join('')}</div>` : `<div class="vide-grand"><b>Aucune séquence de ${U.esc(c.niveau)}</b><p>Elles viendront du PC ; en attendant, créez-la ici avec ses compétences.</p></div>`}
      <button type="button" class="btn principal large" data-act="ev.nouvelle">+ Nouvelle séquence</button>`;
  },

  grille(root, c, s) {
    const comps = Evaluer.ordre(s);
    const ev = Evaluer.evaluation(s.id, c.id);
    const els = App.elevesDe(c.id);
    const piste = [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [Modele.ABSENT, 'Abs'], [Modele.NON_EVALUE, 'NE']];
    root.innerHTML = `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="ev.retour">‹ Séquences</button>
        <span class="sp"></span>
        <button type="button" class="btn" data-act="ev.modifier" data-id="${U.esc(s.id)}">Modifier</button>
      </div>
      <h2 class="titre-seq">${U.esc(Evaluer.libelle(s))}</h2>
      ${ev ? `<label class="date-eval"><span>Évaluée le</span><input type="date" id="evDate" value="${U.esc(ev.date)}">
        <span class="aide">${U.esc(Modele.periodeDe(App.d, ev.date)?.nom || 'hors des périodes')}</span></label>` : ''}
      ${comps.length ? `
      <ol class="legende-comp">${comps.map((id, k) => `<li><b>C${k + 1}</b> ${U.esc(Programme.courte(id))}</li>`).join('')}</ol>
      <table class="grille-eval">
        <thead><tr><th></th>${comps.map((id, k) => `<th><button type="button" class="tete-col" data-act="ev.colonne" data-comp="${U.esc(id)}" title="Remplir les cases vides">C${k + 1}</button></th>`).join('')}</tr></thead>
        <tbody>${els.map(e => `<tr><th>${U.esc(e.prenom)} <small>${U.esc((e.nom || '')[0] || '')}.</small></th>
          ${comps.map(id => `<td><button type="button" class="case" data-act="ev.case" data-eleve="${U.esc(e.id)}" data-comp="${U.esc(id)}">${UI.pastille(ev?.niveaux[e.id]?.[id])}</button></td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <div class="barre-motifs pinceaux" role="toolbar" aria-label="Niveau à poser">
        ${piste.map(([v, lab]) => `<button type="button" class="pinceau" data-act="ev.pinceau" data-v="${v}" aria-pressed="${String(Evaluer.pinceau) === String(v)}">${UI.pastille(v)}</button>`).join('')}
      </div>` : `<div class="vide-grand"><b>Pas de compétence dans cette séquence</b><p>« Modifier » pour cocher les compétences évaluées.</p></div>`}`;
    const date = document.getElementById('evDate');
    if (date) date.onchange = () => {
      if (!date.value) { date.value = ev.date; return; }
      ev.date = date.value; App.modifie('evaluations', ev); App.rafraichir();
    };
  },

  /* pose un niveau (le même niveau déjà posé s'efface) et rend la valeur d'avant, pour « Annuler ».
     La date de l'évaluation reste celle du premier niveau posé : elle range l'évaluation dans sa période. */
  poserDans(sid, cid, eid, comp, v) {
    const ev = Evaluer.evaluation(sid, cid, true);
    const n = ev.niveaux[eid] = ev.niveaux[eid] || {};
    const avant = n[comp];
    if (String(avant) === String(v)) delete n[comp]; else n[comp] = v;
    if (!Object.keys(n).length) delete ev.niveaux[eid];
    App.modifie('evaluations', ev);
    return avant;
  },
  remettre(sid, cid, eid, comp, avant) {
    const ev = Evaluer.evaluation(sid, cid); if (!ev) return;
    const n = ev.niveaux[eid] = ev.niveaux[eid] || {};
    if (avant === undefined) delete n[comp]; else n[comp] = avant;
    if (!Object.keys(n).length) delete ev.niveaux[eid];
    App.modifie('evaluations', ev);
  },
  poser(eid, comp, v) { const c = App.classe(); Evaluer.poserDans(Evaluer.sequence[c.id], c.id, eid, comp, v); },

  /* création ou modification d'une séquence faite sur l'iPhone (les séquences du PC arriveront par l'envoi) */
  form(s) {
    const c = App.classe();
    const niv = s?.niveau || c.niveau;
    const cy = Programme.cycleDe(niv);
    const pris = new Map(App.d.sequences.filter(x => x.niveau === niv && x.id !== s?.id && x.num).map(x => [Number(x.num), x]));
    let libre = 1; while (pris.has(libre)) libre++;
    const num = s?.num || libre;
    const max = 100;
    const sel = new Set(s?.competences || []);
    const pc = s?.source === 'pc';
    UI.feuille({
      titre: s ? 'Modifier la séquence' : `Nouvelle séquence de ${niv}`, haute: true,
      corps: `${pc ? '<p class="aide alerte">Séquence venue du PC : modifiez-la plutôt sur le PC, sinon le prochain envoi remplacera ces changements.</p>' : ''}
        <label class="champ"><span>Nom</span><input id="evNom" class="saisie" value="${U.esc(s?.nom || '')}" placeholder="Le portrait détourné"></label>
        <label class="champ"><span>Numéro</span><select id="evNum" class="saisie">${Array.from({ length: max }, (_, k) => k + 1).map(n => {
          const autre = pris.get(n);
          return `<option value="${n}" ${n === Number(num) ? 'selected' : ''} ${autre ? 'disabled' : ''}>${n}${autre ? ' — déjà pris : ' + U.esc(autre.nom || 'sans titre') : ''}</option>`;
        }).join('')}</select></label>
        <div class="champ"><span>Compétences évaluées</span>
          ${Programme.cycle(cy).competences.map(g => `<p class="groupe-comp">${U.esc(g.nom)}</p>
            ${g.items.map(it => `<label class="case-a-cocher"><input type="checkbox" data-comp="${it.id}" ${sel.has(it.id) ? 'checked' : ''}><span>${U.esc(it.court || it.lab)}</span></label>`).join('')}`).join('')}</div>
        ${s ? `<button type="button" class="btn danger large" id="evSuppr">Supprimer la séquence</button>` : ''}`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="evOk">${s ? 'Enregistrer' : 'Créer'}</button>`,
    });
    document.getElementById('evOk').onclick = () => {
      const nom = document.getElementById('evNom').value.trim();
      if (!nom) { UI.message('Donnez un nom à la séquence.', { erreur: true }); return; }
      const competences = [...document.querySelectorAll('[data-comp]:checked')].map(i => i.dataset.comp);
      let x = s;
      if (!x) { x = { id: U.id('q'), niveau: niv, nom: '', num: null, competences: [], questionnements: [], source: 'iphone' }; App.d.sequences.push(x); }
      Object.assign(x, { nom, num: Number(document.getElementById('evNum').value), competences });
      App.modifie('sequences', x);
      Evaluer.sequence[c.id] = x.id;
      UI.fermer(); App.rafraichir();
    };
    const sup = document.getElementById('evSuppr');
    if (sup) sup.onclick = () => UI.confirmer(`Supprimer « ${s.nom} » et ses évaluations ?`, () => {
      App.d.evaluations.filter(e => e.sequenceId === s.id).forEach(e => App.supprimer('evaluations', e.id));
      App.supprimer('sequences', s.id);
      delete Evaluer.sequence[c.id];
      App.rafraichir();
    });
  },
};

App.enregistrerVue('evaluer', Evaluer);
UI.on('ev.ouvrir', d => { Evaluer.sequence[App.classeId] = d.id; App.rafraichir(); });
UI.on('ev.retour', () => { delete Evaluer.sequence[App.classeId]; App.rafraichir(); });
UI.on('ev.nouvelle', () => Evaluer.form(null));
UI.on('ev.bilan', () => App.aller('bilan'));
UI.on('ev.modifier', d => Evaluer.form(App.d.sequences.find(s => s.id === d.id)));
UI.on('ev.pinceau', d => {
  const v = /^\d$/.test(d.v) ? Number(d.v) : d.v;
  Evaluer.pinceau = String(Evaluer.pinceau) === String(v) ? null : v;
  App.rafraichir();
});
UI.on('ev.case', (d, el) => {
  if (Evaluer.pinceau === null) { UI.message('Choisissez d’abord un niveau en bas, puis touchez les cases.'); return; }
  Evaluer.poser(d.eleve, d.comp, Evaluer.pinceau);
  const c = App.classe();
  const ev = Evaluer.evaluation(Evaluer.sequence[c.id], c.id);
  el.innerHTML = UI.pastille(ev?.niveaux[d.eleve]?.[d.comp]);
});
UI.on('ev.colonne', d => {
  if (Evaluer.pinceau === null) { UI.message('Choisissez d’abord un niveau en bas.'); return; }
  const c = App.classe();
  const ev = Evaluer.evaluation(Evaluer.sequence[c.id], c.id, true);
  const vides = App.elevesDe(c.id).filter(e => ev.niveaux[e.id]?.[d.comp] === undefined);
  if (!vides.length) { UI.message('Aucune case vide dans cette colonne.'); return; }
  UI.confirmer(`Mettre ${U.pl(vides.length, 'case vide', 'cases vides')} de cette compétence au niveau choisi ? Les cases déjà remplies ne changent pas.`, () => {
    vides.forEach(e => { (ev.niveaux[e.id] = ev.niveaux[e.id] || {})[d.comp] = Evaluer.pinceau; });
    App.modifie('evaluations', ev); App.rafraichir();
  }, 'Remplir');
});
