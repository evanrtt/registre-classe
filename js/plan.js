/* ============================================================
   PLAN DE CLASSE — verrouillé par défaut ; « Modifier » ouvre
   deux outils : Meubles (déplacer îlots et éléments fixes au
   doigt, aimantés sur la grille, +1 / −1 poste, quart de tour)
   et Élèves (toucher deux places pour les échanger, ou un élève
   puis une place). « Terminer » reverrouille.
   Verrouillé : toucher un élève ouvre sa fiche de suivi.
   ============================================================ */

const Plan = {
  titre: 'Plan de classe',
  onglet: 'classes',
  avecClasse: true,
  edition: false,
  outil: 'eleves',
  ilot: null,           // îlot choisi (Meubles)
  fixe: null,           // élément fixe choisi (Meubles)
  choix: null,          // place choisie (clé) ou élève choisi ('e:' + id)

  depuisTableau() { return App.lirePref('vue') === 'tableau'; },

  afficher(root) {
    const c = App.classe();
    if (!c) { root.innerHTML = `<div class="vide-grand"><b>Aucune classe</b></div>`; return; }
    const { salle, pl } = Salle.pour(c.id);
    Salle.nettoyer(salle, pl);
    const sans = Salle.sansPlace(salle, pl, c.id);
    const autres = Salle.classesDe(salle).filter(x => x.id !== c.id);
    const ed = Plan.edition, meubles = ed && Plan.outil === 'meubles';
    const f = meubles && (salle.fixes || []).find(x => x.id === Plan.fixe);
    root.innerHTML = `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="pl.retour">‹ ${U.esc(c.nom)}</button>
        <span class="sp"></span>
        ${ed ? `<button type="button" class="btn principal" data-act="pl.terminer">Terminer</button>`
          : `<button type="button" class="btn" data-act="pl.vue">${Plan.depuisTableau() ? 'Vue du fond' : 'Vue du tableau'}</button>
             <button type="button" class="btn" data-act="pl.modifier">🔒 Modifier</button>`}
      </div>
      ${ed ? `<div class="segments">
          <button type="button" class="seg" data-act="pl.outil" data-o="eleves" aria-pressed="${Plan.outil === 'eleves'}">Élèves</button>
          <button type="button" class="seg" data-act="pl.outil" data-o="meubles" aria-pressed="${Plan.outil === 'meubles'}">Meubles</button>
        </div>` : ''}
      ${Zoom.aide()}<div class="zone-salle" id="zoneSalle">${Salle.html(salle, pl, {
        depuisTableau: !ed && Plan.depuisTableau(), editeur: meubles,
        ilotChoisi: meubles ? Plan.ilot : null, fixesChoisis: f ? Salle.groupe(salle, f).map(x => x.id) : [],
        choisi: ed && Plan.outil === 'eleves' ? Plan.choix : null,
      })}</div>
      ${ed ? Plan.barre(salle, pl, sans, autres) : `
        <p class="aide">${U.pl(salle.ilots.reduce((a, i) => a + i.postes, 0), 'place')} · ${U.pl(App.elevesDe(c.id).length - sans.length, 'élève placé', 'élèves placés')}.
          Touchez un élève pour ouvrir sa fiche. Le plan est verrouillé : « Modifier » pour changer la salle ou les places.</p>
        ${sans.length ? `<p class="aide">Sans place : ${sans.map(e => U.esc(U.nomCourt(e))).join(', ')}</p>` : ''}
        <button type="button" class="btn large" data-act="pl.imprimer">Imprimer le plan</button>`}`;
    Plan.lier(salle, pl);
  },

  barre(salle, pl, sans, autres) {
    if (Plan.outil === 'eleves') return `
      <div class="ligne-outils">
        <button type="button" class="btn" data-act="pl.alpha">Ordre alphabétique</button>
        <button type="button" class="btn" data-act="pl.hasard">Au hasard</button>
        <button type="button" class="btn" data-act="pl.vider">Vider</button>
      </div>
      <p class="aide">Touchez deux places pour les échanger, ou un élève ci-dessous puis une place.</p>
      ${sans.length ? `<div class="puces">${sans.map(e => `<button type="button" class="puce ${Plan.choix === 'e:' + e.id ? 'choisie' : ''}" data-act="pl.choixEleve" data-id="${U.esc(e.id)}">${U.esc(U.nomCourt(e))}</button>`).join('')}</div>`
        : '<p class="aide">Tous les élèves ont une place.</p>'}`;
    const avert = autres.length ? `<p class="aide alerte">Cette salle sert aussi à ${autres.map(x => U.esc(x.nom)).join(', ')} : les meubles changent pour elles aussi.</p>` : '';
    const i = salle.ilots.find(x => x.id === Plan.ilot);
    if (i) return `${avert}<div class="ligne-outils">
          <button type="button" class="btn" data-act="pl.poste" data-d="-1" ${i.postes <= 1 ? 'disabled' : ''}>−1 poste</button>
          <button type="button" class="btn" data-act="pl.poste" data-d="1" ${i.postes >= 3 ? 'disabled' : ''}>+1 poste</button>
          <button type="button" class="btn" data-act="pl.tourner">↻ Tourner</button>
          <button type="button" class="btn danger" data-act="pl.retirerIlot">Retirer</button>
        </div><p class="aide">Faites glisser l’îlot pour le déplacer.</p>`;
    const f = (salle.fixes || []).find(x => x.id === Plan.fixe);
    if (f) {
      const g = Salle.groupe(salle, f);
      return `${avert}<p class="aide"><b>${U.esc(Salle.nomType(f.type))}</b> · faites-le glisser pour le déplacer.</p>
        <div class="ligne-outils">
          ${g.length === 1 ? `<button type="button" class="btn" data-act="pl.longueur" data-d="-1" ${Math.max(f.l, f.h) <= 1 ? 'disabled' : ''}>− Plus court</button>
            <button type="button" class="btn" data-act="pl.longueur" data-d="1">+ Plus long</button>` : ''}
          <button type="button" class="btn" data-act="pl.tournerFixe">↻ Tourner</button>
          <button type="button" class="btn danger" data-act="pl.retirerFixe">Retirer</button>
        </div>`;
    }
    return `${avert}<div class="ligne-outils">
          <button type="button" class="btn" data-act="pl.ajouterIlot">+ Îlot de 2</button>
          <button type="button" class="btn" data-act="pl.ajouterFixe">+ Tableau, bureau…</button>
          <button type="button" class="btn" data-act="pl.prereglage">Salle toute prête…</button>
        </div><p class="aide">Touchez un îlot, le tableau, le bureau, une porte ou une fenêtre pour le modifier ; faites-le glisser pour le déplacer.</p>`;
  },

  /* toucher et glisser dans la salle */
  lier(salle, pl) {
    const root = document.getElementById('vue');
    Zoom.lier(root);
    const zone = document.querySelector('#zoneSalle .salle');
    if (!zone) return;
    if (!Plan.edition) {
      zone.addEventListener('click', e => { if (Zoom.recent()) return; const p = e.target.closest('[data-eleve]'); if (p) Suivi.ouvrir(p.dataset.eleve); });
      return;
    }
    if (Plan.outil === 'eleves') {
      zone.addEventListener('click', e => { if (Zoom.recent()) return; const p = e.target.closest('[data-cle]'); if (p) Plan.toucherPlace(salle, pl, p.dataset.cle); });
      return;
    }
    /* meubles : glisser un îlot ou un élément fixe (avec son groupe), aimanté sur les cases */
    const pc = (v, t) => (100 * v / t) + '%';
    let g = null;
    zone.addEventListener('pointerdown', e => {
      if (Zoom.actif) return;
      const el = e.target.closest('.ilot, .fixe'); if (!el) return;
      let objs, type, obj;
      if (el.dataset.ilot) {
        obj = salle.ilots.find(x => x.id === el.dataset.ilot); if (!obj) return;
        type = 'ilot'; objs = [obj];
      } else {
        obj = (salle.fixes || []).find(x => x.id === el.dataset.fixe); if (!obj) return;
        type = 'fixe'; objs = Salle.groupe(salle, obj);
      }
      const boite = type === 'ilot' ? { x: obj.x, y: obj.y, ...Salle.dims(obj) } : Salle.boite(objs);
      g = {
        type, obj, objs, boite, bouge: false, dx: 0, dy: 0,
        els: objs.map(o => zone.querySelector(type === 'ilot' ? `[data-ilot="${o.id}"]` : `[data-fixe="${o.id}"]`)),
        k: zone.clientWidth / salle.cols, x0: e.clientX, y0: e.clientY,
      };
      try { el.setPointerCapture(e.pointerId); } catch (err) { }
    });
    zone.addEventListener('pointermove', e => {
      if (!g) return;
      if (Zoom.actif) { g = null; App.rafraichir(); return; }
      if (!g.bouge && Math.abs(e.clientX - g.x0) + Math.abs(e.clientY - g.y0) < 6) return;
      g.bouge = true; e.preventDefault();
      const b = g.boite;
      g.dx = U.clamp(Math.round((e.clientX - g.x0) / g.k), -b.x, salle.cols - b.x - b.l);
      g.dy = U.clamp(Math.round((e.clientY - g.y0) / g.k), -b.y, salle.rangs - b.y - b.h);
      g.objs.forEach((o, n) => { const el = g.els[n]; if (el) { el.style.left = pc(o.x + g.dx, salle.cols); el.style.top = pc(o.y + g.dy, salle.rangs); } });
    });
    const fin = () => {
      if (!g) return;
      const { type, obj, objs, bouge, dx, dy } = g;
      g = null;
      if (bouge) {
        if (dx || dy) { objs.forEach(o => { o.x += dx; o.y += dy; }); salle.maj = U.maintenant(); App.modifie('salles'); }
        Plan.choisir(type, obj.id);
      } else if (type === 'ilot') Plan.choisir('ilot', Plan.ilot === obj.id ? null : obj.id);
      else Plan.choisir('fixe', Salle.groupe(salle, obj).some(o => o.id === Plan.fixe) ? null : obj.id);
      App.rafraichir();
    };
    zone.addEventListener('pointerup', fin);
    zone.addEventListener('pointercancel', () => { if (g) { g = null; App.rafraichir(); } });
  },
  choisir(type, id) { Plan.ilot = type === 'ilot' ? id : null; Plan.fixe = type === 'fixe' ? id : null; },

  toucherPlace(salle, pl, cle) {
    const ici = pl.places[cle];
    if (Plan.choix && Plan.choix.startsWith('e:')) {
      pl.places[cle] = Plan.choix.slice(2);
      Plan.choix = null;
    } else if (Plan.choix && Plan.choix !== cle) {
      const la = pl.places[Plan.choix];
      if (ici) pl.places[Plan.choix] = ici; else delete pl.places[Plan.choix];
      if (la) pl.places[cle] = la; else delete pl.places[cle];
      Plan.choix = null;
    } else {
      Plan.choix = Plan.choix === cle ? null : cle;
      App.rafraichir(); return;
    }
    App.modifie('placements', pl);
    App.rafraichir();
  },

  placer(ordre) {
    const c = App.classe(); const { salle, pl } = Salle.pour(c.id);
    const cles = Salle.cles(salle);
    pl.places = {};
    ordre(App.elevesDe(c.id)).forEach((e, k) => { if (cles[k]) pl.places[cles[k]] = e.id; });
    App.modifie('placements', pl); App.rafraichir();
  },

  imprimer() {
    const c = App.classe(); const { salle, pl } = Salle.pour(c.id);
    const dt = Plan.depuisTableau();
    UI.imprimer(`<header class="imp-tete"><h1>Plan de classe — ${U.esc(c.nom)}</h1>
        <p>${dt ? 'Vue depuis le tableau' : 'Vue depuis le fond de la salle'} · ${U.esc(U.fmtFull(U.today()))}</p></header>
      ${Salle.html(salle, pl, { depuisTableau: dt })}`, 'imp-plan');
  },
};

App.enregistrerVue('plan', Plan);
const planModifie = salle => { salle.maj = U.maintenant(); App.modifie('salles'); App.rafraichir(); };
UI.on('pl.retour', () => { Plan.edition = false; Classes.ouverte = App.classeId; App.aller('classes'); });
UI.on('pl.vue', () => { App.ecrirePref('vue', Plan.depuisTableau() ? 'fond' : 'tableau'); App.rafraichir(); });
UI.on('pl.modifier', () => { Plan.edition = true; Plan.choisir(null); Plan.choix = null; App.rafraichir(); });
UI.on('pl.terminer', () => { Plan.edition = false; Plan.choisir(null); Plan.choix = null; App.rafraichir(); UI.message('Plan verrouillé.'); });
UI.on('pl.outil', d => { Plan.outil = d.o; Plan.choisir(null); Plan.choix = null; App.rafraichir(); });
UI.on('pl.imprimer', () => Plan.imprimer());
UI.on('pl.choixEleve', d => { Plan.choix = Plan.choix === 'e:' + d.id ? null : 'e:' + d.id; App.rafraichir(); });
UI.on('pl.alpha', () => Plan.placer(l => l));
UI.on('pl.hasard', () => Plan.placer(l => U.melange(l)));
UI.on('pl.vider', () => UI.confirmer('Retirer tous les élèves de leur place ?', () => {
  const { pl } = Salle.pour(App.classeId); pl.places = {}; App.modifie('placements', pl); App.rafraichir();
}, 'Vider'));

/* — îlots — */
const planIlot = () => { const { salle } = Salle.pour(App.classeId); return { salle, i: salle.ilots.find(x => x.id === Plan.ilot) }; };
const planRentrerIlot = (salle, i) => { const { l, h } = Salle.dims(i); i.x = U.clamp(i.x, 0, salle.cols - l); i.y = U.clamp(i.y, 0, salle.rangs - h); };
UI.on('pl.poste', d => {
  const { salle, i } = planIlot(); if (!i) return;
  i.postes = U.clamp(i.postes + Number(d.d), 1, 3);
  planRentrerIlot(salle, i); planModifie(salle);
});
UI.on('pl.tourner', () => {
  const { salle, i } = planIlot(); if (!i) return;
  i.rot = (i.rot + 90) % 360;
  planRentrerIlot(salle, i); planModifie(salle);
});
UI.on('pl.retirerIlot', () => {
  const { salle, i } = planIlot(); if (!i) return;
  salle.ilots = salle.ilots.filter(x => x !== i); Plan.ilot = null;
  planModifie(salle);
});
UI.on('pl.ajouterIlot', () => {
  const { salle } = Salle.pour(App.classeId);
  const i = { id: U.id('i'), x: Math.round(salle.cols / 2 - 5), y: Math.round(salle.rangs / 2 - 2), postes: 2, rot: 0 };
  planRentrerIlot(salle, i);
  salle.ilots.push(i); Plan.choisir('ilot', i.id);
  planModifie(salle);
});

/* — éléments fixes : tableau, bureau, table, portes, fenêtres — */
const planFixe = () => { const { salle } = Salle.pour(App.classeId); const f = (salle.fixes || []).find(x => x.id === Plan.fixe); return { salle, f, g: f ? Salle.groupe(salle, f) : [] }; };
UI.on('pl.tournerFixe', () => { const { salle, f, g } = planFixe(); if (!f) return; Salle.tournerGroupe(salle, g); planModifie(salle); });
UI.on('pl.longueur', d => {
  const { salle, f } = planFixe(); if (!f) return;
  const k = f.l >= f.h ? 'l' : 'h';
  f[k] = U.clamp(f[k] + Number(d.d), 1, k === 'l' ? salle.cols : salle.rangs);
  Salle.rentrer(salle, [f]); planModifie(salle);
});
UI.on('pl.retirerFixe', () => {
  const { salle, f, g } = planFixe(); if (!f) return;
  salle.fixes = salle.fixes.filter(x => !g.includes(x)); Plan.fixe = null;
  planModifie(salle);
});
UI.on('pl.ajouterFixe', () => {
  UI.feuille({
    titre: 'Ajouter dans la salle',
    corps: `<div class="liste-cartes">${Salle.TYPES.map(t => `<button type="button" class="carte-classe" data-act="pl.fixeType" data-t="${t.type}"><b>${U.esc(t.lab)}</b></button>`).join('')}</div>`,
  });
});
UI.on('pl.fixeType', d => {
  const { salle } = Salle.pour(App.classeId);
  const t = Salle.TYPES.find(x => x.type === d.t); if (!t) return;
  const x = Math.round(salle.cols / 2 - t.l / 2), y = Math.round(salle.rangs / 2 - t.h / 2);
  const g = t.type === 'bureauL'
    ? [{ id: U.id('f'), type: 'bureau', x, y, l: 9, h: 3 }, { id: U.id('f'), type: 'bureau', x, y, l: 3, h: 7 }]
    : [{ id: U.id('f'), type: t.type, x, y, l: t.l, h: t.h }];
  salle.fixes = salle.fixes || [];
  salle.fixes.push(...g); Salle.rentrer(salle, g);
  Plan.choisir('fixe', g[0].id);
  UI.fermer(); planModifie(salle);
});

UI.on('pl.prereglage', () => {
  UI.feuille({
    titre: 'Salle toute prête',
    corps: `<p class="aide">Remplace les meubles de la salle (les élèves seront à replacer).</p>
      <button type="button" class="btn large" id="prCroquis">Salle du croquis (15 paires)</button>
      <div class="champ"><span>Rangées de paires</span>
        <div class="ligne-outils"><input id="prC" class="saisie court" type="number" min="1" max="4" value="3"> colonnes ×
          <input id="prR" class="saisie court" type="number" min="1" max="8" value="5"> rangées</div>
        <button type="button" class="btn large" id="prRang">Créer les rangées</button></div>`,
  });
  const remplacer = neuve => {
    const { salle, pl } = Salle.pour(App.classeId);
    Object.assign(salle, { cols: neuve.cols, rangs: neuve.rangs, ilots: neuve.ilots, fixes: neuve.fixes, maj: U.maintenant() });
    Salle.classesDe(salle).forEach(c => { const p = App.d.placements.find(x => x.classeId === c.id); if (p) { p.places = {}; App.modifie('placements', p); } });
    pl.places = {}; Plan.choisir(null);
    App.modifie('salles'); UI.fermer(); App.rafraichir();
  };
  document.getElementById('prCroquis').onclick = () => remplacer(Salle.croquis());
  document.getElementById('prRang').onclick = () => remplacer(Salle.rangees(U.clamp(Number(document.getElementById('prC').value) || 3, 1, 4), U.clamp(Number(document.getElementById('prR').value) || 5, 1, 8)));
});
