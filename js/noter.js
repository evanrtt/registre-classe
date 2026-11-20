/* ============================================================
   NOTER — on choisit le motif une fois (en bas, à portée du
   pouce), puis chaque toucher sur un élève l'applique : +1.
   Motif « Compétence » : on choisit la séquence et la compétence
   en haut, le niveau en bas, puis on touche les élèves.
   Appui long sur un élève = la feuille complète (motifs, note
   libre, punition, à suivre, fiche). « Annuler » retire le
   dernier geste, quel qu'il soit.
   ============================================================ */

const Noter = {
  titre: 'Noter',
  avecClasse: true,
  COMP: 'competence',
  motif: null,          // id du motif, ou Noter.COMP
  pile: [],             // gestes de la séance : { obs: id } ou { niv: { seq, classe, eleve, comp }, avant }
  liste: false,
  comp: {},             // classe → { seq, comp, v } pour le motif Compétence

  motifs() { return App.d.reglages.motifs; },
  motifCourant() { return Noter.motifs().find(m => m.id === Noter.motif) || Noter.motifs()[0]; },
  signe(m) { return m.valence > 0 ? '+' : m.valence < 0 ? '−' : '·'; },
  ton(m) { return m.valence > 0 ? 'positif' : m.valence < 0 ? 'negatif' : ''; },

  compteurs(cid) {
    const t = U.today(), out = {};
    App.d.observations.forEach(o => {
      if (o.classeId !== cid || o.date !== t) return;
      const c = out[o.eleveId] = out[o.eleveId] || { plus: 0, moins: 0 };
      if (o.valence > 0) c.plus++; else if (o.valence < 0) c.moins++;
    });
    return out;
  },

  afficher(root) {
    const c = App.classe();
    if (!c) { root.innerHTML = `<div class="vide-grand"><b>Aucune classe</b><p>Créez d’abord une classe dans « Classes ».</p></div>`; return; }
    if (Noter.motif === Noter.COMP) return Noter.afficherComp(root, c);
    const m = Noter.motifCourant();
    root.innerHTML = `
      <div class="ligne-outils">
        <span class="aide">Touchez un élève : <b class="${Noter.ton(m)}">${U.esc(Noter.signe(m) + ' ' + m.lab)}</b></span>
        <span class="sp"></span>${Noter.basculeListe(c)}
      </div>
      ${Noter.corps(c, { compteurs: Noter.compteurs(c.id) })}
      <div class="barre-motifs" role="toolbar" aria-label="Motif à appliquer">
        <button type="button" class="motif motif-comp" data-act="no.comp">◐ Compétence</button>
        ${Noter.motifs().map(x => `<button type="button" class="motif ${Noter.ton(x)}" data-act="no.motif" data-id="${U.esc(x.id)}" aria-pressed="${x.id === m.id}">${U.esc(Noter.signe(x) + ' ' + x.lab)}</button>`).join('')}
      </div>
      ${Noter.boutonAnnuler()}`;
    Noter.lier(root, eid => Noter.appliquer(eid, Noter.motifCourant()));
  },

  /* — motif Compétence — */
  sequencesComp(c) { return Evaluer.sequencesDe(c.niveau).filter(s => (s.competences || []).length); },
  /* séquence proposée : celle ouverte dans Évaluer, sinon la dernière évaluée par la classe, sinon la dernière */
  etatComp(c) {
    const seqs = Noter.sequencesComp(c);
    const st = Noter.comp[c.id] = Noter.comp[c.id] || { seq: null, comp: null, v: null };
    if (!seqs.some(s => s.id === st.seq)) {
      const recente = App.d.evaluations.filter(ev => ev.classeId === c.id && seqs.some(s => s.id === ev.sequenceId))
        .sort((a, b) => (b.date + (b.maj || '')).localeCompare(a.date + (a.maj || '')))[0];
      st.seq = (seqs.find(s => s.id === Evaluer.sequence[c.id]) || seqs.find(s => s.id === recente?.sequenceId) || seqs[seqs.length - 1] || {}).id || null;
    }
    const seq = seqs.find(s => s.id === st.seq) || null;
    const comps = seq ? Evaluer.ordre(seq) : [];
    if (!comps.includes(st.comp)) st.comp = comps[0] || null;
    return { st, seq, comps, seqs };
  },
  afficherComp(root, c) {
    const { st, seq, comps } = Noter.etatComp(c);
    const piste = [1, 2, 3, 4, Modele.ABSENT, Modele.NON_EVALUE];
    if (!seq) {
      root.innerHTML = `<div class="ligne-outils"><button type="button" class="btn" data-act="no.motifs">‹ Motifs</button></div>
        <div class="vide-grand"><b>Aucune séquence de ${U.esc(c.niveau)} avec des compétences</b><p>Créez-la dans « Évaluer » (elle viendra aussi du PC).</p></div>
        <button type="button" class="btn principal large" data-aller="evaluer">Aller à Évaluer</button>`;
      return;
    }
    const ev = Evaluer.evaluation(seq.id, c.id);
    const niveaux = {};
    App.elevesDe(c.id).forEach(e => { const v = ev?.niveaux[e.id]?.[st.comp]; if (v !== undefined) niveaux[e.id] = v; });
    const k = comps.indexOf(st.comp);
    root.innerHTML = `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="no.motifs">‹ Motifs</button>
        <button type="button" class="btn choix-seq" data-act="no.seq">${U.esc(Evaluer.libelle(seq))} ▾</button>
        ${Noter.basculeListe(c)}
      </div>
      ${comps.length > 1 ? `<div class="segments">${comps.map((id, i) => `<button type="button" class="seg" data-act="no.compId" data-id="${U.esc(id)}" aria-pressed="${id === st.comp}">C${i + 1}</button>`).join('')}</div>` : ''}
      <p class="aide"><b>C${k + 1}</b> ${U.esc(Programme.courte(st.comp))} · ${st.v === null ? 'choisissez un niveau en bas, puis touchez les élèves.' : `touchez un élève : ${UI.pastille(st.v, 'mini')}`}</p>
      ${Noter.corps(c, { niveaux })}
      <div class="barre-motifs pinceaux" role="toolbar" aria-label="Niveau à poser">
        ${piste.map(v => `<button type="button" class="pinceau" data-act="no.niv" data-v="${v}" aria-pressed="${String(st.v) === String(v)}">${UI.pastille(v)}</button>`).join('')}
      </div>
      ${Noter.boutonAnnuler()}`;
    Noter.lier(root, eid => Noter.appliquerNiv(eid));
  },
  appliquerNiv(eid) {
    const c = App.classe(); const { st, seq } = Noter.etatComp(c);
    if (!seq || !st.comp) return;
    if (st.v === null) { UI.message('Choisissez d’abord un niveau en bas.'); return; }
    const avant = Evaluer.poserDans(seq.id, c.id, eid, st.comp, st.v);
    Noter.pile.push({ niv: { seq: seq.id, classe: c.id, eleve: eid, comp: st.comp }, avant });
    Noter.retour(eid);
  },
  choisirSequence(c) {
    const { st, seqs } = Noter.etatComp(c);
    UI.feuille({
      titre: `Séquences de ${c.niveau}`,
      corps: `<div class="liste-cartes">${seqs.map(s => `<button type="button" class="carte-classe ${s.id === st.seq ? 'choisie' : ''}" data-act="no.seqChoix" data-id="${U.esc(s.id)}">
        <b>${U.esc(Evaluer.libelle(s))}</b><span>${U.pl(s.competences.length, 'compétence')}</span></button>`).join('')}</div>`,
    });
  },

  /* — plan ou liste des élèves — */
  basculeListe(c) {
    const { salle, pl } = Salle.pour(c.id);
    const n = App.elevesDe(c.id).length;
    return n && Salle.sansPlace(salle, pl, c.id).length < n ? `<button type="button" class="btn" data-act="no.liste">${Noter.liste ? 'Plan' : 'Liste'}</button>` : '';
  },
  /* o : { compteurs } pour les motifs, { niveaux } pour une compétence */
  corps(c, o) {
    const { salle, pl } = Salle.pour(c.id);
    Salle.nettoyer(salle, pl);
    const sans = Salle.sansPlace(salle, pl, c.id);
    const els = App.elevesDe(c.id);
    if (!els.length) return `<div class="vide-grand"><b>Pas d’élèves dans ${U.esc(c.nom)}</b><p>Ajoutez-les dans « Classes ».</p></div>`;
    const lignes = l => `<ul class="liste-noter">${l.map(e => Noter.ligne(e, o)).join('')}</ul>`;
    if (Noter.liste || sans.length === els.length) return lignes(els);
    return `${Zoom.aide()}<div class="zone-salle" id="zoneNoter">${Salle.html(salle, pl, { ...o, depuisTableau: Plan.depuisTableau() })}</div>
      ${sans.length ? `<p class="aide">Sans place :</p>${lignes(sans)}` : ''}`;
  },
  ligne(e, o) {
    const c = o.compteurs?.[e.id];
    const fin = o.niveaux ? UI.pastille(o.niveaux[e.id])
      : `${c?.plus ? `<span class="cpt-p">+${c.plus}</span>` : ''}${c?.moins ? `<span class="cpt-m">−${c.moins}</span>` : ''}`;
    return `<li><div class="eleve-noter" data-eleve="${U.esc(e.id)}"><b>${U.esc(e.prenom)}</b> ${U.esc(e.nom)}<span class="sp"></span>${fin}</div></li>`;
  },
  boutonAnnuler() { return Noter.pile.length ? `<button type="button" class="btn-annuler" data-act="no.annuler">↶ Annuler</button>` : ''; },

  /* toucher = le geste choisi ; appui long = feuille de l'élève ; un zoom à deux doigts ne compte pas */
  lier(root, geste) {
    Zoom.lier(root);
    let t = null;
    root.querySelectorAll('[data-eleve]').forEach(el => {
      el.addEventListener('pointerdown', e => {
        t = { el, x: e.clientX, y: e.clientY, long: false, zoom: Zoom.n };
        t.timer = setTimeout(() => { if (t && t.zoom === Zoom.n && !Zoom.actif) { t.long = true; Noter.feuilleEleve(el.dataset.eleve); } }, 500);
      });
      el.addEventListener('pointermove', e => { if (t && Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y) > 12) { clearTimeout(t.timer); t = null; } });
      el.addEventListener('pointerup', () => {
        if (!t || t.el !== el) return;
        clearTimeout(t.timer);
        if (!t.long && t.zoom === Zoom.n && !Zoom.actif) geste(el.dataset.eleve);
        t = null;
      });
      el.addEventListener('pointercancel', () => { if (t) clearTimeout(t.timer); t = null; });
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  },

  observation(eleveId, champs, annulable = true) {
    const e = App.eleve(eleveId);
    const o = { id: U.id('o'), eleveId, classeId: e.classeId, date: U.today(), h: U.heure(), motif: '', valence: 0, texte: '', sequenceId: '', punition: null, ...champs, maj: U.maintenant() };
    App.d.observations.push(o);
    if (annulable) Noter.pile.push({ obs: o.id });
    App.modifie('observations');
    return o;
  },
  appliquer(eleveId, m) {
    if (!App.eleve(eleveId)) return;
    Noter.observation(eleveId, { motif: m.id, valence: m.valence, texte: m.lab });
    Noter.retour(eleveId);
  },
  /* petit retour visuel et vibration après un geste */
  retour(eleveId) {
    if (navigator.vibrate) navigator.vibrate(15);
    App.rafraichir();
    const el = document.querySelector(`#vue [data-eleve="${CSS.escape(eleveId)}"]`);
    if (el) { el.classList.add('tamponne'); setTimeout(() => el.classList.remove('tamponne'), 500); }
  },
  annuler() {
    const g = Noter.pile.pop(); if (!g) return;
    if (g.obs) {
      const o = App.d.observations.find(x => x.id === g.obs);
      App.supprimer('observations', g.obs);
      App.rafraichir();
      if (o) UI.message(`Retiré : ${o.texte} (${U.nomCourt(App.eleve(o.eleveId) || {})})`);
    } else if (g.niv) {
      const n = g.niv;
      Evaluer.remettre(n.seq, n.classe, n.eleve, n.comp, g.avant);
      App.rafraichir();
      UI.message(`Niveau retiré (${U.nomCourt(App.eleve(n.eleve) || {})})`);
    }
  },

  feuilleEleve(eid) {
    const e = App.eleve(eid); if (!e) return;
    const t = U.today();
    const jour = App.d.observations.filter(o => o.eleveId === eid && o.date === t).sort((a, b) => a.h < b.h ? 1 : -1);
    UI.feuille({
      titre: U.nomComplet(e), haute: true,
      corps: `
        ${(e.amenagements || []).length ? `<p class="aide">${e.amenagements.map(U.esc).join(' · ')}</p>` : ''}
        <button type="button" class="btn large" data-act="no.fiche" data-eleve="${U.esc(eid)}">Fiche de suivi</button>
        <div class="grille-motifs" style="margin-top:12px">${Noter.motifs().map(m => `<button type="button" class="motif ${Noter.ton(m)}" data-act="no.motifEleve" data-id="${U.esc(m.id)}" data-eleve="${U.esc(eid)}">${U.esc(Noter.signe(m) + ' ' + m.lab)}</button>`).join('')}</div>
        <label class="champ"><span>Note libre</span><textarea id="noLibre" class="saisie" rows="2" placeholder="Ce que j’ai remarqué…"></textarea></label>
        <button type="button" class="btn large" data-act="no.libre" data-eleve="${U.esc(eid)}">Ajouter la note</button>
        <div class="champ"><span>Punition (liste conforme au BO)</span>
          <select id="noPun" class="saisie">${Modele.PUNITIONS.map(p => `<option value="${p.id}">${U.esc(p.lab)}</option>`).join('')}</select>
          <input id="noPunMotif" class="saisie" placeholder="Motif"></div>
        <button type="button" class="btn danger large" data-act="no.punition" data-eleve="${U.esc(eid)}">Donner la punition</button>
        <label class="interrupteur"><input type="checkbox" id="noSuivi" ${e.suivi ? 'checked' : ''}><span>À suivre de près</span></label>
        <div class="champ"><span>Aujourd’hui</span>
          ${jour.length ? `<ul class="liste-jour">${jour.map(o => `<li><span class="${o.valence > 0 ? 'positif' : o.valence < 0 ? 'negatif' : ''}">${U.esc(o.h)} · ${U.esc(o.texte || o.motif)}</span>
            <button type="button" class="btn-icone" data-act="no.retirer" data-id="${U.esc(o.id)}" data-eleve="${U.esc(eid)}" aria-label="Retirer">✕</button></li>`).join('')}</ul>`
          : '<p class="aide">Rien de noté aujourd’hui.</p>'}</div>`,
    });
    document.getElementById('noSuivi').onchange = ev => { e.suivi = ev.target.checked; App.modifie('eleves', e); };
  },
};

App.enregistrerVue('noter', Noter);
UI.on('no.motif', d => { Noter.motif = d.id; App.rafraichir(); });
UI.on('no.comp', () => { Noter.motif = Noter.COMP; App.rafraichir(); });
UI.on('no.motifs', () => { Noter.motif = null; App.rafraichir(); });
UI.on('no.seq', () => Noter.choisirSequence(App.classe()));
UI.on('no.seqChoix', d => { Noter.etatComp(App.classe()).st.seq = d.id; UI.fermer(); App.rafraichir(); });
UI.on('no.compId', d => { Noter.etatComp(App.classe()).st.comp = d.id; App.rafraichir(); });
UI.on('no.niv', d => {
  const st = Noter.etatComp(App.classe()).st;
  const v = /^\d$/.test(d.v) ? Number(d.v) : d.v;
  st.v = String(st.v) === String(v) ? null : v;
  App.rafraichir();
});
UI.on('no.liste', () => { Noter.liste = !Noter.liste; App.rafraichir(); });
UI.on('no.annuler', () => Noter.annuler());
UI.on('no.fiche', d => { UI.fermer(); Suivi.ouvrir(d.eleve); });
UI.on('no.motifEleve', d => {
  const m = Noter.motifs().find(x => x.id === d.id);
  Noter.observation(d.eleve, { motif: m.id, valence: m.valence, texte: m.lab });
  Noter.feuilleEleve(d.eleve); UI.message(`${Noter.signe(m)} ${m.lab}`);
});
UI.on('no.libre', d => {
  const t = document.getElementById('noLibre').value.trim(); if (!t) return;
  Noter.observation(d.eleve, { motif: 'libre', valence: 0, texte: t });
  Noter.feuilleEleve(d.eleve); UI.message('Note ajoutée.');
});
UI.on('no.punition', d => {
  const p = Modele.PUNITIONS.find(x => x.id === document.getElementById('noPun').value);
  const motif = document.getElementById('noPunMotif').value.trim();
  if (!motif) { UI.message('Indiquez le motif de la punition.', { erreur: true }); return; }
  Noter.observation(d.eleve, { motif: 'punition', valence: -1, texte: `${p.lab} — ${motif}`, punition: { type: p.id, motif, fait: false } });
  Noter.feuilleEleve(d.eleve);
  UI.message(p.note || `Punition notée${p.suivi ? ' · à faire : ' + p.suivi.toLowerCase() : ''}.`);
});
UI.on('no.retirer', d => {
  App.supprimer('observations', d.id);
  Noter.pile = Noter.pile.filter(g => g.obs !== d.id);
  Noter.feuilleEleve(d.eleve);
});
