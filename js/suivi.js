/* ============================================================
   SUIVI — fiche d'un élève par période, et vue de la classe
   Fiche : compétences (par grand domaine, une pastille par
   séquence, positionnement à droite), comportement, faits
   marquants (notes, punitions et leur suivi), appréciation.
   Vue classe : élèves × compétences en pastilles, bilan imprimable.
   ============================================================ */

const Suivi = {
  titre: 'Fiche de suivi',
  onglet: 'classes',
  eleveId: null,
  retour: 'classes',

  ouvrir(eid) {
    if (App.vue !== 'suivi') Suivi.retour = App.vue || 'classes';
    Suivi.eleveId = eid;
    App.aller('suivi');
  },
  fleche(t) { return t > 0 ? '<span class="tendance positif" title="En progrès">↗</span>' : t < 0 ? '<span class="tendance negatif" title="En baisse">↘</span>' : ''; },

  afficher(root) {
    const e = App.eleve(Suivi.eleveId);
    if (!e) { root.innerHTML = `<div class="vide-grand"><b>Élève introuvable</b></div><button type="button" class="btn large" data-act="su.retour">Retour</button>`; return; }
    const c = App.classe(e.classeId);
    const p = Bilan.choisie();
    document.getElementById('titre').textContent = U.nomComplet(e);
    const retour = { classes: c?.nom || 'Classe', plan: 'Plan', noter: 'Noter', bilan: 'Classe', evaluer: 'Évaluer' }[Suivi.retour] || 'Retour';
    if (!p) { root.innerHTML = `<p class="aide">Aucune période : réglez-les dans « Plus ».</p>`; return; }
    root.innerHTML = `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="su.retour">‹ ${U.esc(retour)}</button>
        <span class="sp"></span>
        <button type="button" class="btn" data-act="su.modifier">Modifier</button>
      </div>
      <p class="aide entete-eleve">${U.esc(c?.nom || '')}${(e.amenagements || []).map(a => ` <span class="tag">${U.esc(a)}</span>`).join('')}
        ${e.suivi ? ` <span class="tag alerte">à suivre${e.suiviMotif ? ' : ' + U.esc(e.suiviMotif) : ''}</span>` : ''}</p>
      ${Bilan.segments('su.periode')}
      ${App.d.reglages.options?.sequenceFaible ? Suivi.blocFaible(e, p) : ''}
      ${Suivi.blocCompetences(e, p)}
      ${Suivi.blocComportement(e, p)}
      ${Suivi.blocFaits(e, p)}
      ${Suivi.blocAppreciation(e, p)}`;
    Suivi.lier(root, e, p);
  },

  blocFaible(e, p) {
    const f = Bilan.faible(e, p);
    return `<section class="bloc"><h2>Séquence la moins bien réussie</h2>
      ${f ? `<p><b>${U.esc(Evaluer.libelle(f.seq))}</b> · moyenne ${U.n1(f.moy)}</p>
        <div class="vals">${f.vals.map((x, k) => `<span class="val" title="${U.esc(Programme.courte(x.comp))}">${UI.pastille(x.v, 'mini')}<small>C${k + 1}</small></span>`).join('')}</div>`
      : '<p class="aide">Pas encore d’évaluation sur la période.</p>'}</section>`;
  },

  blocCompetences(e, p) {
    const lignes = Bilan.lignes(e, p);
    if (!lignes.length) return `<section class="bloc"><h2>Compétences</h2><p class="aide">Aucune séquence évaluée sur la période (${U.esc(U.fmtDate(p.debut))} → ${U.esc(U.fmtDate(p.fin))}).</p></section>`;
    const groupes = new Map();
    lignes.forEach(l => {
      const g = Programme.competence(l.comp)?.groupe || { id: '?', nom: 'Autres' };
      if (!groupes.has(g.id)) groupes.set(g.id, { g, l: [] });
      groupes.get(g.id).l.push(l);
    });
    return `<section class="bloc"><h2>Compétences</h2>
      ${[...groupes.values()].map(({ g, l }) => `<p class="groupe-comp">${U.esc(g.nom)}</p>
        <ul class="lignes-comp">${l.map(x => `<li>
          <span class="lab">${U.esc(Programme.courte(x.comp))}</span>
          <span class="vals">${x.vals.map(v => `<span class="val" title="${U.esc(Evaluer.libelle(v.seq))}">${UI.pastille(v.v, 'mini')}<small>S${U.esc(v.seq.num || '?')}</small></span>`).join('')}</span>
          <button type="button" class="pos" data-act="su.pos" data-comp="${U.esc(x.comp)}" aria-label="Positionnement">
            ${UI.pastille(x.pos)}${Suivi.fleche(x.tendance)}${x.manuel ? '<i class="manuel" title="Choisi à la main">✎</i>' : ''}</button>
        </li>`).join('')}</ul>`).join('')}
      <p class="aide">À droite : le positionnement de la période (le niveau le plus fréquent). Touchez-le pour le changer.</p></section>`;
  },

  blocComportement(e, p) {
    const cmp = Bilan.comportement(e.id, p);
    const avant = Bilan.precedente(p);
    return `<section class="bloc"><h2>Comportement</h2>
      ${cmp.length ? `<ul class="liste-infos">${cmp.map(x => {
        const t = x.avant === null ? 0 : Math.sign(x.n - x.avant);
        const ton = x.valence > 0 ? 'positif' : x.valence < 0 ? 'negatif' : '';
        const fl = !t ? '' : (t > 0) === (x.valence >= 0) ? `<span class="tendance positif">${t > 0 ? '↗' : '↘'}</span>` : `<span class="tendance negatif">${t > 0 ? '↗' : '↘'}</span>`;
        return `<li><span class="${ton}">${x.valence > 0 ? '+' : x.valence < 0 ? '−' : '·'} ${U.esc(x.lab)}</span>
          <span><b>${x.n}</b> ${fl}${x.avant !== null ? ` <small class="aide">${U.esc(Bilan.court(avant))} : ${x.avant}</small>` : ''}</span></li>`;
      }).join('')}</ul>` : '<p class="aide">Rien de noté sur la période.</p>'}</section>`;
  },

  blocFaits(e, p) {
    const faits = Bilan.faits(e.id, p);
    return `<section class="bloc"><h2>Faits marquants</h2>
      ${faits.length ? `<ul class="liste-faits">${faits.map(o => {
        const pu = o.punition && Modele.PUNITIONS.find(x => x.id === o.punition.type);
        return `<li><div><small class="aide">${U.esc(U.fmtDate(o.date))}</small> ${U.esc(o.texte)}</div>
          ${pu?.suivi ? `<label class="case-a-cocher"><input type="checkbox" data-pun="${U.esc(o.id)}" ${o.punition.fait ? 'checked' : ''}><span>${U.esc(pu.suivi)} — fait</span></label>` : ''}
        </li>`;
      }).join('')}</ul>` : '<p class="aide">Aucune note libre ni punition sur la période.</p>'}
      <button type="button" class="btn large" data-act="su.note">+ Note libre</button></section>`;
  },

  blocAppreciation(e, p) {
    const a = Bilan.appreciation(e.id, p.id);
    return `<section class="bloc"><h2>Appréciation · ${U.esc(p.nom)}</h2>
      <textarea id="suApp" class="saisie" rows="5" placeholder="Votre appréciation pour le bulletin…">${U.esc(a?.texte || '')}</textarea>
      <div class="ligne-outils" style="margin-top:8px"><span class="aide" id="suNb"></span><span class="sp"></span>
        <button type="button" class="btn" data-act="su.brouillon">Proposer un brouillon</button></div></section>`;
  },

  lier(root, e, p) {
    root.querySelectorAll('[data-pun]').forEach(b => b.onchange = () => {
      const o = App.d.observations.find(x => x.id === b.dataset.pun); if (!o?.punition) return;
      o.punition.fait = b.checked; App.modifie('observations', o);
    });
    const t = document.getElementById('suApp'), nb = document.getElementById('suNb');
    const compter = () => { nb.textContent = U.pl(t.value.length, 'caractère'); };
    const ecrire = U.debounce(() => Bilan.ecrireAppreciation(e.id, p.id, t.value.trim()), 500);
    t.oninput = () => { compter(); ecrire(); };
    t.onblur = () => Bilan.ecrireAppreciation(e.id, p.id, t.value.trim());
    compter();
  },

  positionner(comp) {
    const e = App.eleve(Suivi.eleveId), p = Bilan.choisie();
    const l = Bilan.lignes(e, p).find(x => x.comp === comp); if (!l) return;
    UI.feuille({
      titre: 'Positionnement',
      corps: `<p><b>${U.esc(Programme.courte(comp))}</b></p>
        <p class="aide">${U.esc(U.nomComplet(e))} · ${U.esc(p.nom)} · séquences : ${l.vals.map(v => UI.pastille(v.v, 'mini')).join(' ')}</p>
        <div class="choix-niveaux">${Modele.NIVEAUX.map(n => `<button type="button" class="choix-niv" data-act="su.posChoix" data-comp="${U.esc(comp)}" data-v="${n.n}" aria-pressed="${l.manuel && l.pos === n.n}">
          ${UI.pastille(n.n)}<span>${U.esc(n.lab)}</span></button>`).join('')}</div>
        <button type="button" class="btn large" data-act="su.posChoix" data-comp="${U.esc(comp)}" data-v="" aria-pressed="${!l.manuel}">Automatique${l.auto ? ` : ${l.auto}` : ''}</button>
        <p class="aide">Automatique = le niveau le plus fréquent de la période ; à égalité, le plus récent.</p>`,
    });
  },

  note() {
    const e = App.eleve(Suivi.eleveId);
    UI.feuille({
      titre: 'Note libre',
      corps: `<textarea id="suNote" class="saisie" rows="4" placeholder="Ce que j’ai remarqué…"></textarea>`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="suNoteOk">Ajouter</button>`,
    });
    document.getElementById('suNoteOk').onclick = () => {
      const t = document.getElementById('suNote').value.trim(); if (!t) return;
      Noter.observation(e.id, { motif: 'libre', valence: 0, texte: t }, false);
      UI.fermer(); App.rafraichir();
    };
  },
};

const SuiviClasse = {
  titre: 'Suivi de la classe',
  onglet: 'classes',
  avecClasse: true,
  tri: 'alpha',

  donnees(c, p) {
    const comps = Bilan.competencesClasse(c.id, p);
    const els = App.elevesDe(c.id).map(e => {
      const lignes = new Map(Bilan.lignes(e, p).map(l => [l.comp, l]));
      const pos = comps.map(id => lignes.get(id)?.pos ?? null);
      return { e, pos, moy: U.moy(pos), t: Bilan.totaux(e.id, p) };
    });
    if (SuiviClasse.tri === 'fragiles') els.sort((a, b) => (a.moy ?? 9) - (b.moy ?? 9) || U.sortNom(a.e, b.e));
    return { comps, els };
  },

  afficher(root) {
    const c = App.classe();
    if (!c) { root.innerHTML = `<div class="vide-grand"><b>Aucune classe</b></div>`; return; }
    const p = Bilan.choisie();
    if (!p) { root.innerHTML = `<p class="aide">Aucune période : réglez-les dans « Plus ».</p>`; return; }
    const { comps, els } = SuiviClasse.donnees(c, p);
    root.innerHTML = `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="sc.retour">‹ ${U.esc(c.nom)}</button>
        <span class="sp"></span>
        <button type="button" class="btn" data-act="sc.imprimer">Imprimer le bilan</button>
      </div>
      ${Bilan.segments('sc.periode')}
      <div class="segments">
        <button type="button" class="seg" data-act="sc.tri" data-t="alpha" aria-pressed="${SuiviClasse.tri === 'alpha'}">A → Z</button>
        <button type="button" class="seg" data-act="sc.tri" data-t="fragiles" aria-pressed="${SuiviClasse.tri === 'fragiles'}">Fragiles d’abord</button>
      </div>
      ${comps.length ? `<ol class="legende-comp">${comps.map((id, k) => `<li><b>C${k + 1}</b> ${U.esc(Programme.courte(id))}</li>`).join('')}</ol>` : `<p class="aide">Aucune séquence évaluée sur la période.</p>`}
      ${els.length ? `<table class="grille-eval grille-bilan">
        <thead><tr><th></th>${comps.map((id, k) => `<th>C${k + 1}</th>`).join('')}<th>+/−</th></tr></thead>
        <tbody>${els.map(x => `<tr data-act="sc.eleve" data-id="${U.esc(x.e.id)}" class="${x.moy !== null && x.moy < 2 ? 'decroche' : ''}">
          <th>${x.e.suivi ? '<s class="point" aria-label="à suivre"></s>' : ''}${U.esc(x.e.prenom)} <small>${U.esc((x.e.nom || '')[0] || '')}.</small></th>
          ${x.pos.map(v => `<td>${UI.pastille(v, 'mini')}</td>`).join('')}
          <td class="cpt-pm">${x.t.plus ? `<span class="cpt-p">+${x.t.plus}</span>` : ''} ${x.t.moins ? `<span class="cpt-m">−${x.t.moins}</span>` : ''}</td></tr>`).join('')}</tbody>
      </table>
      <p class="aide">Positionnement de la période par compétence. Touchez un élève pour ouvrir sa fiche. Ligne rosée : moyenne sous 2.</p>`
      : `<div class="vide-grand"><b>Pas d’élèves dans ${U.esc(c.nom)}</b></div>`}`;
  },

  /* bilan de la période : un tableau par classe, à imprimer ou à enregistrer en PDF */
  imprimer() {
    const c = App.classe(), p = Bilan.choisie();
    const { comps, els } = SuiviClasse.donnees(c, p);
    UI.imprimer(`<header class="imp-tete"><h1>Bilan — ${U.esc(c.nom)} — ${U.esc(p.nom)}</h1>
        <p>Arts plastiques · du ${U.esc(U.fmtFull(p.debut))} au ${U.esc(U.fmtFull(p.fin))} · édité le ${U.esc(U.fmtFull(U.today()))}</p></header>
      ${comps.length ? `<ol class="legende-comp">${comps.map((id, k) => `<li><b>C${k + 1}</b> ${U.esc(Programme.courte(id))}</li>`).join('')}</ol>` : ''}
      <p class="legende-niv">${Modele.NIVEAUX.map(n => `${UI.pastille(n.n, 'mini')} ${U.esc(n.lab)}`).join(' · ')}</p>
      <table class="imp-bilan">
        <thead><tr><th>Élève</th>${comps.map((id, k) => `<th>C${k + 1}</th>`).join('')}<th>+ / −</th><th>Appréciation</th></tr></thead>
        <tbody>${els.map(x => `<tr><th>${U.esc(U.nomComplet(x.e))}</th>${x.pos.map(v => `<td>${UI.pastille(v, 'mini')}</td>`).join('')}
          <td>${x.t.plus ? '+' + x.t.plus : ''} ${x.t.moins ? '−' + x.t.moins : ''}</td>
          <td class="app">${U.br(Bilan.appreciation(x.e.id, p.id)?.texte || '')}</td></tr>`).join('')}</tbody>
      </table>`, 'imp-bilan-page');
  },
};

App.enregistrerVue('suivi', Suivi);
App.enregistrerVue('bilan', SuiviClasse);
UI.on('su.retour', () => {
  const e = App.eleve(Suivi.eleveId);
  if (Suivi.retour === 'classes' && e) Classes.ouverte = e.classeId;
  if (e && App.vues[Suivi.retour]?.avecClasse) { App.classeId = e.classeId; App.ecrirePref('classe', e.classeId); }
  App.aller(Suivi.retour === 'suivi' ? 'classes' : Suivi.retour);
});
UI.on('su.modifier', () => Classes.formEleve(App.eleve(Suivi.eleveId)));
UI.on('su.periode', d => { Bilan.choix = d.id; App.rafraichir(); });
UI.on('su.pos', d => Suivi.positionner(d.comp));
UI.on('su.posChoix', d => {
  Bilan.poserManuel(Suivi.eleveId, Bilan.choisie().id, d.comp, d.v ? Number(d.v) : null);
  UI.fermer(); App.rafraichir();
});
UI.on('su.note', () => Suivi.note());
UI.on('su.brouillon', () => {
  const e = App.eleve(Suivi.eleveId), p = Bilan.choisie();
  const t = document.getElementById('suApp');
  const poser = () => { t.value = Bilan.brouillon(e, p); Bilan.ecrireAppreciation(e.id, p.id, t.value); t.dispatchEvent(new Event('input')); t.focus(); };
  if (t.value.trim()) UI.confirmer('Remplacer votre texte par un brouillon ?', poser, 'Remplacer'); else poser();
});
UI.on('sc.retour', () => { Classes.ouverte = App.classeId; App.aller('classes'); });
UI.on('sc.periode', d => { Bilan.choix = d.id; App.rafraichir(); });
UI.on('sc.tri', d => { SuiviClasse.tri = d.t; App.rafraichir(); });
UI.on('sc.eleve', d => Suivi.ouvrir(d.id));
UI.on('sc.imprimer', () => SuiviClasse.imprimer());
