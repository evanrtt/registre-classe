/* ============================================================
   CLASSES & ÉLÈVES — les classes, leurs élèves, le plan
   ============================================================ */

const Classes = {
  titre: 'Classes',
  ouverte: null,

  afficher(root) {
    const c = Classes.ouverte && App.classe(Classes.ouverte);
    if (c) return Classes.detail(root, c);
    const liste = App.classesTriees();
    root.innerHTML = `
      ${liste.length ? `<div class="liste-cartes">${liste.map(x => {
        const n = App.elevesDe(x.id).length;
        return `<button type="button" class="carte-classe" data-act="cl.ouvrir" data-id="${U.esc(x.id)}">
          <b>${U.esc(x.nom)}</b><span>${U.esc(x.niveau)} · ${U.pl(n, 'élève')}</span></button>`;
      }).join('')}</div>`
      : `<div class="vide-grand"><b>Aucune classe pour l’instant</b><p>Créez vos classes, puis collez la liste des élèves.</p></div>`}
      <button type="button" class="btn principal large" data-act="cl.nouvelle">+ Nouvelle classe</button>`;
  },

  detail(root, c) {
    document.getElementById('titre').textContent = c.nom;
    const els = App.elevesDe(c.id);
    root.innerHTML = `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="cl.retour">‹ Classes</button>
        <span class="sp"></span>
        <button type="button" class="btn" data-act="cl.modifier" data-id="${U.esc(c.id)}">Modifier</button>
      </div>
      <div class="deux-boutons">
        <button type="button" class="btn principal" data-act="cl.plan" data-id="${U.esc(c.id)}">Plan de classe</button>
        <button type="button" class="btn principal" data-act="cl.bilan" data-id="${U.esc(c.id)}">Suivi de la classe</button>
      </div>
      ${els.length ? `<p class="aide">Touchez un élève pour ouvrir sa fiche de suivi.</p>
        <ul class="liste-eleves">${els.map(e => `<li><button type="button" data-act="cl.fiche" data-id="${U.esc(e.id)}">
          <b>${U.esc((e.nom || '').toUpperCase())}</b> ${U.esc(e.prenom)}
          ${(e.amenagements || []).length ? `<span class="tag">${U.esc(e.amenagements[0].split('—')[0].trim())}</span>` : ''}
          ${e.suivi ? '<span class="tag alerte">à suivre</span>' : ''}</button></li>`).join('')}</ul>`
        : `<div class="vide-grand"><b>Pas encore d’élèves</b><p>Collez la liste exportée du logiciel de vie scolaire : un élève par ligne, « NOM Prénom ».</p></div>`}
      <div class="deux-boutons">
        <button type="button" class="btn" data-act="cl.eleve" data-classe="${U.esc(c.id)}">+ Élève</button>
        <button type="button" class="btn" data-act="cl.coller" data-id="${U.esc(c.id)}">Coller une liste</button>
      </div>`;
  },

  formClasse(c) {
    const niv = Modele.NIVEAUX_SCOLAIRES;
    UI.feuille({
      titre: c ? 'Modifier la classe' : 'Nouvelle classe',
      corps: `<label class="champ"><span>Nom</span><input id="clNom" class="saisie" value="${U.esc(c?.nom || '')}" placeholder="5e A" autocomplete="off"></label>
        <div class="champ"><span>Niveau</span><div class="segments">${niv.map(n => `<button type="button" class="seg" data-niv="${n}" aria-pressed="${(c?.niveau || '5e') === n}">${n}</button>`).join('')}</div></div>
        ${c ? `<button type="button" class="btn danger large" id="clSuppr">Supprimer la classe</button>` : ''}`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="clOk">${c ? 'Enregistrer' : 'Créer'}</button>`,
    });
    let niveau = c?.niveau || '5e';
    document.querySelectorAll('[data-niv]').forEach(b => b.onclick = () => {
      niveau = b.dataset.niv;
      document.querySelectorAll('[data-niv]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    });
    document.getElementById('clOk').onclick = () => {
      const nom = document.getElementById('clNom').value.trim();
      if (!nom) { UI.message('Donnez un nom à la classe.', { erreur: true }); return; }
      let x = c;
      if (!x) { x = { id: U.id('c'), nom, niveau, couleur: '' }; App.d.classes.push(x); App.classeId = x.id; App.ecrirePref('classe', x.id); Classes.ouverte = x.id; }
      Object.assign(x, { nom, niveau });
      App.modifie('classes', x);
      UI.fermer(); App.rafraichir();
    };
    const sup = document.getElementById('clSuppr');
    if (sup) sup.onclick = () => {
      const n = App.elevesDe(c.id).length;
      UI.confirmer(`Supprimer ${c.nom}${n ? ` et ses ${n} élèves, avec leurs observations et évaluations` : ''} ? Exportez d’abord une sauvegarde (Plus) si besoin.`, () => {
        App.d.eleves.filter(e => e.classeId === c.id).forEach(e => { Classes.retirerSuivi(e.id); App.supprimer('eleves', e.id); });
        ['observations', 'evaluations', 'placements'].forEach(col => App.d[col].filter(x => x.classeId === c.id).forEach(x => App.supprimer(col, x.id)));
        App.supprimer('classes', c.id);
        Classes.ouverte = null; if (App.classeId === c.id) App.classeId = App.d.classes[0]?.id || null;
        App.rafraichir();
      });
    };
  },

  formEleve(e, classeId) {
    UI.feuille({
      titre: e ? U.nomComplet(e) : 'Nouvel élève', haute: true,
      corps: `<label class="champ"><span>Prénom</span><input id="elP" class="saisie" value="${U.esc(e?.prenom || '')}" autocomplete="off"></label>
        <label class="champ"><span>Nom</span><input id="elN" class="saisie" value="${U.esc(e?.nom || '')}" autocomplete="off"></label>
        <label class="champ"><span>Aménagements (PAP, PPS, PAI…) · un par ligne</span><textarea id="elA" class="saisie" rows="3">${U.esc((e?.amenagements || []).join('\n'))}</textarea></label>
        <label class="interrupteur"><input type="checkbox" id="elS" ${e?.suivi ? 'checked' : ''}><span>À suivre de près</span></label>
        <label class="champ"><span>Pourquoi</span><input id="elM" class="saisie" value="${U.esc(e?.suiviMotif || '')}"></label>
        ${e ? `<button type="button" class="btn danger large" id="elSuppr">Retirer l’élève de la classe</button>` : ''}`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="elOk">Enregistrer</button>`,
    });
    document.getElementById('elOk').onclick = () => {
      const prenom = document.getElementById('elP').value.trim(), nom = document.getElementById('elN').value.trim();
      if (!prenom && !nom) { UI.message('Indiquez au moins un prénom ou un nom.', { erreur: true }); return; }
      let x = e;
      if (!x) { x = { id: U.id('e'), classeId, nom: '', prenom: '', amenagements: [], notes: '', suivi: false, suiviMotif: '' }; App.d.eleves.push(x); }
      Object.assign(x, {
        prenom, nom, amenagements: document.getElementById('elA').value.split('\n').map(t => t.trim()).filter(Boolean),
        suivi: document.getElementById('elS').checked, suiviMotif: document.getElementById('elM').value.trim(),
      });
      App.modifie('eleves', x);
      UI.fermer(); App.rafraichir();
    };
    const sup = document.getElementById('elSuppr');
    if (sup) sup.onclick = () => UI.confirmer(`Retirer ${U.nomComplet(e)} de la classe ? Ses observations et évaluations seront aussi retirées.`, () => {
      App.d.observations.filter(o => o.eleveId === e.id).forEach(o => App.supprimer('observations', o.id));
      App.d.evaluations.forEach(ev => { if (ev.niveaux[e.id]) { delete ev.niveaux[e.id]; App.modifie('evaluations', ev); } });
      Classes.retirerSuivi(e.id);
      App.supprimer('eleves', e.id);
      if (App.vue === 'suivi') { Classes.ouverte = e.classeId; App.aller('classes'); } else App.rafraichir();
    }, 'Retirer');
  },

  /* positionnements et appréciations d'un élève qu'on retire */
  retirerSuivi(eid) {
    ['positionnements', 'appreciations'].forEach(col => App.d[col].filter(x => x.eleveId === eid).forEach(x => App.supprimer(col, x.id)));
  },

  /* « DURAND Léa », « Léa DURAND » ou « Durand Léa » : les mots en majuscules sont le nom */
  lireLigne(l) {
    const mots = l.replace(/[\t;,]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!mots.length) return null;
    const maj = mots.filter(m => m.length > 1 && m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m));
    const cap = m => m.toLowerCase().replace(/(^|[-'’ ])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
    if (maj.length && maj.length < mots.length) return { nom: cap(maj.join(' ')), prenom: cap(mots.filter(m => !maj.includes(m)).join(' ')) };
    return { nom: cap(mots[0]), prenom: cap(mots.slice(1).join(' ')) };
  },
  coller(cid) {
    UI.feuille({
      titre: 'Coller une liste', haute: true,
      corps: `<p class="aide">Un élève par ligne : « NOM Prénom » (copiée du logiciel de vie scolaire).</p>
        <textarea id="clListe" class="saisie" rows="10" placeholder="DURAND Léa&#10;MARTIN Tom"></textarea>`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="clAjout">Ajouter</button>`,
    });
    document.getElementById('clAjout').onclick = () => {
      const deja = new Set(App.elevesDe(cid).map(e => (e.nom + '|' + e.prenom).toLowerCase()));
      let n = 0, doublons = 0;
      document.getElementById('clListe').value.split('\n').map(Classes.lireLigne).filter(Boolean).forEach(x => {
        if (deja.has((x.nom + '|' + x.prenom).toLowerCase())) { doublons++; return; }
        const e = { id: U.id('e'), classeId: cid, nom: x.nom, prenom: x.prenom, amenagements: [], notes: '', suivi: false, suiviMotif: '', maj: U.maintenant() };
        App.d.eleves.push(e); deja.add((x.nom + '|' + x.prenom).toLowerCase()); n++;
      });
      App.modifie('eleves');
      UI.fermer(); App.rafraichir();
      UI.message(`${U.pl(n, 'élève ajouté', 'élèves ajoutés')}${doublons ? ` · ${U.pl(doublons, 'déjà présent', 'déjà présents')}` : ''}.`);
    };
  },
};

App.enregistrerVue('classes', Classes);
UI.on('cl.ouvrir', d => { Classes.ouverte = d.id; App.classeId = d.id; App.ecrirePref('classe', d.id); App.rafraichir(); });
UI.on('cl.retour', () => { Classes.ouverte = null; App.aller('classes'); });
UI.on('cl.nouvelle', () => Classes.formClasse(null));
UI.on('cl.modifier', d => Classes.formClasse(App.classe(d.id)));
UI.on('cl.eleve', d => Classes.formEleve(d.id ? App.eleve(d.id) : null, d.classe));
UI.on('cl.coller', d => Classes.coller(d.id));
UI.on('cl.plan', d => { App.classeId = d.id; App.aller('plan'); });
UI.on('cl.bilan', d => { App.classeId = d.id; App.ecrirePref('classe', d.id); App.aller('bilan'); });
UI.on('cl.fiche', d => Suivi.ouvrir(d.id));
