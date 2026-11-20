/* ============================================================
   APP — données, enregistrement, navigation
   Les données suivent le modèle V3 (shared/modele) et sont
   rangées dans IndexedDB (shared/lib/stockage.js). Toute
   modification passe par App.modifie : horodatage (maj) puis
   enregistrement différé, et immédiat quand l'app passe en
   arrière-plan (l'iPhone peut la fermer sans prévenir).
   ============================================================ */

const App = {
  d: null,
  stockage: null,
  vue: null,
  vues: {},
  sales: new Set(),
  classeId: null,

  async demarrer() {
    try {
      await Programme.charger('shared/programme/programme.json');
      App.stockage = Stockage.indexeddb('registre-classe');
      const { donnees, rapport } = await Depot.charger(App.stockage);
      App.d = donnees;
      if (rapport.length) UI.message(rapport[0]);
    } catch (e) {
      console.error(e);
      document.getElementById('vue').innerHTML = `<p class="attente">Le registre n’a pas pu s’ouvrir : ${U.esc(e.message)}</p>`;
      return;
    }
    Stockage.persister().catch(() => { });
    App.classeId = App.lirePref('classe');
    if (!App.classe()) App.classeId = App.d.classes[0]?.id || null;
    document.getElementById('choixClasse').addEventListener('change', e => { App.choisirClasse(e.target.value); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) App.enregistrer(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
    App.aller('aujourdhui');
    Plus.rappel();
  },

  /* — préférences de cet appareil (pas des données à sauvegarder) — */
  lirePref(k) { try { return localStorage.getItem('registre-classe:' + k); } catch (e) { return null; } },
  ecrirePref(k, v) { try { localStorage.setItem('registre-classe:' + k, v); } catch (e) { } },

  /* — enregistrement — */
  modifie(collection, fiche) {
    if (fiche) fiche.maj = U.maintenant();
    if (collection) App.sales.add(collection);
    App.enregistrerBientot();
  },
  enregistrerBientot: U.debounce(() => App.enregistrer(), 400),
  async enregistrer() {
    const cols = [...App.sales];
    App.sales.clear();
    try { await Depot.enregistrer(App.stockage, App.d, cols); }
    catch (e) { console.warn(e); cols.forEach(c => App.sales.add(c)); UI.message('Enregistrement impossible : faites une sauvegarde (Plus).', { erreur: true }); }
  },
  supprimer(collection, id) { Modele.supprimer(App.d, collection, id); App.modifie(collection); },

  /* — accès aux données — */
  classe(id = App.classeId) { return App.d.classes.find(c => c.id === id) || null; },
  eleve(id) { return App.d.eleves.find(e => e.id === id) || null; },
  elevesDe(cid = App.classeId) { return App.d.eleves.filter(e => e.classeId === cid).sort(U.sortNom); },
  classesTriees() { return App.d.classes.slice().sort((a, b) => U.sortNiv(a.niveau, b.niveau) || a.nom.localeCompare(b.nom, 'fr')); },
  choisirClasse(id) {
    App.classeId = id; App.ecrirePref('classe', id);
    App.aller(App.vue);
  },

  /* — navigation — */
  enregistrerVue(nom, vue) { App.vues[nom] = vue; },
  aller(nom, params = {}) {
    const v = App.vues[nom] || App.vues.classes;
    App.vue = nom;
    if (UI.ouverte()) UI.fermer();
    document.querySelectorAll('[data-aller]').forEach(b => b.setAttribute('aria-current', String(b.dataset.aller === (v.onglet || nom))));
    document.getElementById('titre').textContent = v.titre || '';
    const sel = document.getElementById('choixClasse');
    sel.hidden = !v.avecClasse || !App.d.classes.length;
    if (!sel.hidden) sel.innerHTML = App.classesTriees().map(c => `<option value="${U.esc(c.id)}" ${c.id === App.classeId ? 'selected' : ''}>${U.esc(c.nom)}</option>`).join('');
    const root = document.getElementById('vue');
    root.scrollTop = 0;
    v.afficher(root, params);
    /* une barre d'outils fixe en bas (motifs, niveaux) laisse la place au contenu */
    root.classList.toggle('avec-barre', !!root.querySelector('.barre-motifs'));
    const actif = root.querySelector('.barre-motifs [aria-pressed="true"]');
    if (actif) actif.scrollIntoView({ inline: 'center', block: 'nearest' });
  },
  rafraichir() { const y = document.getElementById('vue').scrollTop; App.aller(App.vue); document.getElementById('vue').scrollTop = y; },
};
