/* ============================================================
   SALLE — plan de la salle et placement des élèves
   Unités : cases de papier quadrillé. Un poste = 5 × 3 cases,
   plus 1 case de chaise du côté opposé au tableau. Un îlot =
   1 à 3 postes côte à côte ; (x, y) = son coin haut-gauche,
   chaises comprises. La salle (meubles) sert à plusieurs classes ;
   chaque classe garde son placement (clé « îlot.poste » → élève).
   ============================================================ */

const Salle = {
  POSTE_L: 5, POSTE_P: 3,

  /* la salle du croquis : 3 colonnes de paires (2 + 3 à gauche, 5, 5), tableau en bas, bureau en L */
  croquis() {
    const paire = (x, y) => ({ id: U.id('i'), x, y, postes: 2, rot: 0 });
    return {
      id: U.id('s'), nom: 'Salle d’arts plastiques', cols: 39, rangs: 35, maj: U.maintenant(),
      ilots: [
        paire(1, 1), paire(1, 6), paire(1, 15), paire(1, 19), paire(1, 23),
        paire(14, 1), paire(14, 6), paire(14, 11), paire(14, 16), paire(14, 20),
        paire(27, 2), paire(27, 7), paire(27, 11), paire(27, 16), paire(27, 20),
      ],
      fixes: [
        { id: U.id('f'), type: 'tableau', x: 11, y: 33, l: 16, h: 1 },
        { id: U.id('f'), type: 'bureau', x: 28, y: 27, l: 9, h: 3 },
        { id: U.id('f'), type: 'bureau', x: 28, y: 27, l: 3, h: 7 },
        { id: U.id('f'), type: 'table', x: 32, y: 32, l: 5, h: 2 },
        { id: U.id('f'), type: 'porte', x: 0, y: 10, l: 1, h: 5 },
        { id: U.id('f'), type: 'porte', x: 0, y: 28, l: 1, h: 5 },
        { id: U.id('f'), type: 'fenetre', x: 38, y: 6, l: 1, h: 7 },
        { id: U.id('f'), type: 'fenetre', x: 38, y: 16, l: 1, h: 7 },
        { id: U.id('f'), type: 'fenetre', x: 38, y: 25, l: 1, h: 7 },
      ],
    };
  },
  /* n colonnes × m rangées de paires, allées de 3 cases, tableau en bas */
  rangees(nc, nr) {
    const cols = nc * 10 + (nc + 1) * 3, rangs = nr * 5 + 6;
    const ilots = [];
    for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) ilots.push({ id: U.id('i'), x: 3 + c * 13, y: 1 + r * 5, postes: 2, rot: 0 });
    return {
      id: U.id('s'), nom: `${nc} × ${nr} paires`, cols, rangs, maj: U.maintenant(), ilots,
      fixes: [{ id: U.id('f'), type: 'tableau', x: Math.round(cols / 2 - 8), y: rangs - 2, l: 16, h: 1 }],
    };
  },

  /* la salle et le placement d'une classe, créés au besoin (une salle commune par défaut) */
  pour(cid) {
    const d = App.d;
    let pl = d.placements.find(p => p.classeId === cid);
    let salle = pl && d.salles.find(s => s.id === pl.salleId);
    if (!salle) {
      salle = d.salles[0];
      if (!salle) { salle = Salle.croquis(); d.salles.push(salle); App.modifie('salles'); }
      if (!pl) { pl = { id: U.id('pl'), classeId: cid, salleId: salle.id, places: {}, maj: U.maintenant() }; d.placements.push(pl); }
      else pl.salleId = salle.id;
      App.modifie('placements', pl);
    }
    return { salle, pl };
  },
  classesDe(salle) { return App.d.placements.filter(p => p.salleId === salle.id).map(p => App.classe(p.classeId)).filter(Boolean); },

  /* — géométrie — */
  dims(i) {
    const long = Salle.POSTE_L * i.postes, prof = Salle.POSTE_P + 1;
    return i.rot % 180 === 0 ? { l: long, h: prof } : { l: prof, h: long };
  },
  cles(salle) { return salle.ilots.flatMap(i => Array.from({ length: i.postes }, (_, p) => i.id + '.' + p)); },
  libres(salle, pl) { return Salle.cles(salle).filter(k => !pl.places[k]); },
  /* élèves de la classe qui n'ont pas de place */
  sansPlace(salle, pl, cid) {
    const places = new Set(Salle.cles(salle).map(k => pl.places[k]).filter(Boolean));
    return App.elevesDe(cid).filter(e => !places.has(e.id));
  },
  /* places dont l'élève a quitté la classe, ou dont l'îlot a perdu un poste */
  nettoyer(salle, pl) {
    const ok = new Set(Salle.cles(salle));
    let n = 0;
    Object.keys(pl.places).forEach(k => {
      const e = App.eleve(pl.places[k]);
      if (!ok.has(k) || !e || e.classeId !== pl.classeId) { delete pl.places[k]; n++; }
    });
    if (n) App.modifie('placements', pl);
  },

  /* — éléments fixes : un groupe = les éléments du même type qui se chevauchent (le bureau en L) — */
  TYPES: [
    { type: 'tableau', lab: 'Tableau', l: 16, h: 1 },
    { type: 'bureau', lab: 'Bureau du professeur', l: 9, h: 3 },
    { type: 'bureauL', lab: 'Bureau en L', l: 9, h: 7 },
    { type: 'table', lab: 'Table', l: 5, h: 2 },
    { type: 'porte', lab: 'Porte', l: 1, h: 5 },
    { type: 'fenetre', lab: 'Fenêtre', l: 1, h: 7 },
  ],
  nomType(t) { return { tableau: 'Tableau', bureau: 'Bureau', table: 'Table', porte: 'Porte', fenetre: 'Fenêtre' }[t] || t; },
  groupe(salle, f) {
    const inter = (a, b) => a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.h && b.y < a.y + a.h;
    const g = [f];
    for (let k = 0; k < g.length; k++) (salle.fixes || []).forEach(b => { if (b.type === f.type && !g.includes(b) && inter(g[k], b)) g.push(b); });
    return g;
  },
  boite(g) {
    const x = Math.min(...g.map(f => f.x)), y = Math.min(...g.map(f => f.y));
    return { x, y, l: Math.max(...g.map(f => f.x + f.l)) - x, h: Math.max(...g.map(f => f.y + f.h)) - y };
  },
  /* garde un groupe d'éléments dans la salle */
  rentrer(salle, g) {
    const b = Salle.boite(g);
    const dx = U.clamp(b.x, 0, Math.max(0, salle.cols - b.l)) - b.x, dy = U.clamp(b.y, 0, Math.max(0, salle.rangs - b.h)) - b.y;
    g.forEach(f => { f.x += dx; f.y += dy; });
  },
  /* quart de tour dans le sens des aiguilles d'une montre, autour du coin du groupe */
  tournerGroupe(salle, g) {
    const b = Salle.boite(g);
    g.forEach(f => {
      const rx = f.x - b.x, ry = f.y - b.y;
      Object.assign(f, { x: b.x + (b.h - (ry + f.h)), y: b.y + rx, l: f.h, h: f.l });
    });
    Salle.rentrer(salle, g);
  },

  /* — dessin — options : compteurs { eleveId: { plus, moins } }, niveaux { eleveId: niveau },
     choisi (clé), ilotChoisi, fixesChoisis (ids), editeur */
  html(salle, pl, o = {}) {
    const pc = (v, t) => (100 * v / t).toFixed(3) + '%';
    const pos = (x, y, l, h) => `left:${pc(x, salle.cols)};top:${pc(y, salle.rangs)};width:${pc(l, salle.cols)};height:${pc(h, salle.rangs)}`;
    const nomFixe = { tableau: 'Tableau', bureau: '', table: '', porte: 'Porte', fenetre: '' };
    const choisis = new Set(o.fixesChoisis || []);
    const fixes = (salle.fixes || []).map(f => `<div class="fixe fixe-${U.esc(f.type)} ${choisis.has(f.id) ? 'choisi' : ''}" data-fixe="${U.esc(f.id)}" style="${pos(f.x, f.y, f.l, f.h)}">${nomFixe[f.type] ? `<span>${nomFixe[f.type]}</span>` : ''}</div>`).join('');
    const ilots = salle.ilots.map(i => {
      const { l, h } = Salle.dims(i);
      const postes = Array.from({ length: i.postes }, (_, p) => {
        const cle = i.id + '.' + p;
        const e = App.eleve(pl.places[cle]);
        const c = e && o.compteurs ? o.compteurs[e.id] : null;
        const v = e && o.niveaux ? o.niveaux[e.id] : undefined;
        const marque = v !== undefined ? `<em class="cpt niv-chaise">${v === Modele.ABSENT ? 'Abs' : v === Modele.NON_EVALUE ? 'NE' : U.esc(v)}</em>`
          : c && (c.plus || c.moins) ? `<em class="cpt">${c.plus ? `<span class="p">+${c.plus}</span>` : ''}${c.moins ? `<span class="m">−${c.moins}</span>` : ''}</em>` : '';
        return `<div class="poste ${e ? '' : 'vide'} ${o.choisi === cle ? 'choisi' : ''} ${v !== undefined ? 'pv-' + U.esc(v) : ''}" data-cle="${cle}" ${e ? `data-eleve="${U.esc(e.id)}"` : ''}>
          <span class="chaise">${marque}</span>
          <span class="table">${e ? `<b>${U.esc(e.prenom)}</b><i>${U.esc((e.nom || '')[0] || '')}.</i>` : ''}
            ${e && (e.suivi || (e.amenagements || []).length) ? '<s class="drapeau" aria-hidden="true"></s>' : ''}</span>
        </div>`;
      }).join('');
      return `<div class="ilot rot${i.rot} ${o.ilotChoisi === i.id ? 'choisi' : ''}" data-ilot="${i.id}" style="${pos(i.x, i.y, l, h)}">${postes}</div>`;
    }).join('');
    return `<div class="salle ${o.depuisTableau ? 'depuis-tableau' : ''} ${o.editeur ? 'editeur' : ''}" style="aspect-ratio:${salle.cols} / ${salle.rangs}" data-salle="${salle.id}">
      ${o.editeur ? `<div class="quadrillage" style="background-size:calc(100% / ${salle.cols}) calc(100% / ${salle.rangs})"></div>` : ''}${fixes}${ilots}</div>`;
  },
};

/* ============================================================
   ZOOM — agrandir le plan à deux doigts (1 à 3 fois), puis le
   parcourir d'un doigt. Le zoom est gardé sur cet appareil.
   Un geste à deux doigts n'est jamais compté comme un toucher
   sur un élève (Zoom.n change à chaque geste).
   ============================================================ */

const Zoom = {
  MAX: 3,
  n: 0,
  actif: false,
  fin: 0,
  z() { return U.clamp(Number(App.lirePref('zoom')) || 1, 1, Zoom.MAX); },
  recent() { return Zoom.actif || Date.now() - Zoom.fin < 400; },
  aide() {
    return `<p class="aide zoom-aide" ${Zoom.z() > 1.01 ? '' : 'hidden'}>Plan agrandi · <button type="button" class="lien" data-act="zoom.normal">taille normale</button></p>`;
  },
  lier(root) {
    const zone = root.querySelector('.zone-salle'), salle = zone && zone.querySelector('.salle');
    if (!salle) return;
    const vue = document.getElementById('vue');
    const appliquer = z => {
      salle.style.width = (z * 100).toFixed(1) + '%';
      const a = root.querySelector('.zoom-aide'); if (a) a.hidden = z <= 1.01;
    };
    appliquer(Zoom.z());
    let g = null;
    const ecart = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
    zone.addEventListener('touchstart', e => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      Zoom.actif = true; Zoom.n++;
      g = { d: ecart(e.touches), z: Zoom.z(), cur: Zoom.z() };
    }, { passive: false });
    zone.addEventListener('touchmove', e => {
      if (!g || e.touches.length !== 2) return;
      e.preventDefault();
      const nz = U.clamp(g.z * ecart(e.touches) / g.d, 1, Zoom.MAX);
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const r = salle.getBoundingClientRect(), k = nz / g.cur;
      appliquer(nz); g.cur = nz;
      /* le point sous les doigts reste sous les doigts */
      zone.scrollLeft += (mx - r.left) * (k - 1);
      vue.scrollTop += (my - r.top) * (k - 1);
    }, { passive: false });
    const fin = e => {
      if (g && e.touches.length < 2) { App.ecrirePref('zoom', String(Math.round(g.cur * 100) / 100)); g = null; }
      if (!e.touches.length && Zoom.actif) { Zoom.actif = false; Zoom.fin = Date.now(); }
    };
    zone.addEventListener('touchend', fin);
    zone.addEventListener('touchcancel', fin);
    /* Safari : empêcher le zoom de toute la page pendant le geste */
    zone.addEventListener('gesturestart', e => e.preventDefault());
  },
};

UI.on('zoom.normal', () => { App.ecrirePref('zoom', '1'); App.rafraichir(); });
