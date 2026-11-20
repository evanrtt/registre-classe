/* ============================================================
   UI — feuille du bas (fenêtre), messages, confirmation
   Une seule feuille à la fois, qui monte du bas de l'écran,
   à portée du pouce. Tout le HTML dynamique passe par U.esc.
   ============================================================ */

const UI = {
  actions: {},
  on(nom, fn) { UI.actions[nom] = fn; },

  /* feuille : titre, contenu HTML, boutons du bas ; fermer() la referme */
  feuille({ titre, corps, pied = '', haute = false, quandFerme = null }) {
    const f = document.getElementById('feuille');
    f.className = 'feuille' + (haute ? ' haute' : '');
    f.innerHTML = `<div class="feuille-poignee" aria-hidden="true"></div>
      <header class="feuille-tete"><h2>${U.esc(titre)}</h2><button type="button" class="btn-icone" data-fermer aria-label="Fermer">✕</button></header>
      <div class="feuille-corps">${corps}</div>
      ${pied ? `<footer class="feuille-pied">${pied}</footer>` : ''}`;
    f.hidden = false;
    document.getElementById('feuilleFond').hidden = false;
    UI._quandFerme = quandFerme;
    return f;
  },
  fermer() {
    document.getElementById('feuille').hidden = true;
    document.getElementById('feuilleFond').hidden = true;
    const q = UI._quandFerme; UI._quandFerme = null;
    if (q) q();
  },
  ouverte() { return !document.getElementById('feuille').hidden; },

  /* message bref, avec une action facultative (« Annuler ») */
  message(texte, { erreur = false, action = null, duree = 3200 } = {}) {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast' + (erreur ? ' erreur' : '');
    const s = document.createElement('span'); s.textContent = texte; t.append(s);
    if (action) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = action.lab;
      b.onclick = () => { action.fn(); t.remove(); };
      t.append(b);
    }
    box.append(t);
    setTimeout(() => t.remove(), action ? duree + 2500 : duree);
  },

  confirmer(question, oui, labOui = 'Supprimer') {
    UI.feuille({
      titre: 'Confirmer', corps: `<p>${U.esc(question)}</p>`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn danger" id="uiOui">${U.esc(labOui)}</button>`,
    });
    document.getElementById('uiOui').onclick = () => { UI.fermer(); oui(); };
  },

  /* impression (plan, bilan) : une page à part, en couleurs claires ; sur l'iPhone,
     « Imprimer » puis Partager → « Enregistrer dans Fichiers » donne un PDF */
  imprimer(html, classe = '') {
    let box = document.getElementById('impression');
    if (!box) { box = document.createElement('div'); box.id = 'impression'; document.body.append(box); }
    box.className = classe;
    box.innerHTML = html;
    setTimeout(() => window.print(), 60);
  },

  /* niveau de maîtrise : couleur + chiffre, toujours ensemble */
  pastille(v, extra = '') {
    if (v === Modele.ABSENT) return `<span class="niv niv-abs ${extra}">Abs</span>`;
    if (v === Modele.NON_EVALUE) return `<span class="niv niv-ne ${extra}">NE</span>`;
    if ([1, 2, 3, 4].includes(v)) return `<span class="niv niv-${v} ${extra}">${v}</span>`;
    return `<span class="niv niv-vide ${extra}">·</span>`;
  },
};

/* une seule délégation pour tous les boutons : data-act="nom" (+ data-…) */
document.addEventListener('click', e => {
  if (e.target.closest('[data-fermer]') || e.target.id === 'feuilleFond') { UI.fermer(); return; }
  const a = e.target.closest('[data-act]');
  if (a && UI.actions[a.dataset.act]) { e.preventDefault(); UI.actions[a.dataset.act](a.dataset, a, e); return; }
  const v = e.target.closest('[data-aller]');
  if (v) App.aller(v.dataset.aller);
});
