/* ============================================================
   REGISTRE CLASSE — test de la coque (phase 1)
   Vérifie sur l'iPhone : installation, mode avion, données
   conservées, stockage persistant, export de fichier, caméra.
   Remplacé par l'app en phase 2.
   ============================================================ */

const VERSION = '0.1.0';   /* garder identique au numéro de CACHE dans sw.js */

const Test = (() => {
  const $ = id => document.getElementById(id);
  const etat = {};          /* libellé → [ok (true, false ou null), texte] */
  let db = null, fiche = null, flux = null;

  /* ---------------------------------------------------------- dates */
  function quand(iso) {
    return new Date(iso).toLocaleString('fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }
  function depuis(iso) {
    const h = (Date.now() - new Date(iso)) / 3600000;
    if (h < 1) return 'il y a moins d’une heure';
    if (h < 48) return `il y a ${Math.round(h)} h`;
    return `il y a ${Math.round(h / 24)} jours`;
  }

  /* ---------------------------------------------------------- affichage */
  function poser(cle, ok, texte) {
    etat[cle] = [ok, texte];
    $('etat').replaceChildren(...Object.entries(etat).map(([c, [o, t]]) => {
      const li = document.createElement('li');
      if (o !== null) li.className = o ? 'ok' : 'ko';
      const b = document.createElement('strong');
      b.textContent = c;
      const s = document.createElement('span');
      s.textContent = t;
      li.append(b, s);
      return li;
    }));
  }

  function afficherFiche() {
    $('compteur').textContent = fiche.compteur;
    const o = fiche.ouvertures;
    const lignes = [`Ouverte ${fiche.total} fois.`, `Première ouverture : ${quand(fiche.premiere)}.`];
    if (o.length > 1) lignes.push(`Ouverture précédente : ${quand(o[o.length - 2])} (${depuis(o[o.length - 2])}).`);
    $('ouvertures').textContent = lignes.join(' ');
  }

  /* ---------------------------------------------------------- IndexedDB : une seule fiche d'essai */
  function ouvrirBase() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open('registre-classe-test', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('essai');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  function lire() {
    return new Promise((ok, ko) => {
      const r = db.transaction('essai').objectStore('essai').get('fiche');
      r.onsuccess = () => ok(r.result || null);
      r.onerror = () => ko(r.error);
    });
  }
  function ecrire() {
    return new Promise((ok, ko) => {
      const t = db.transaction('essai', 'readwrite');
      t.objectStore('essai').put(fiche, 'fiche');
      t.oncomplete = () => ok();
      t.onerror = () => ko(t.error);
    });
  }

  async function chargerFiche() {
    try {
      db = await ouvrirBase();
      const maintenant = new Date().toISOString();
      fiche = (await lire()) || { premiere: maintenant, compteur: 0, total: 0, ouvertures: [] };
      fiche.total += 1;
      fiche.ouvertures = fiche.ouvertures.concat(maintenant).slice(-50);
      await ecrire();
      poser('Données', true, fiche.total > 1 ? `retrouvées (${fiche.total} ouvertures)` : 'première ouverture');
      afficherFiche();
    } catch (e) {
      poser('Données', false, 'IndexedDB indisponible : ' + e.message);
    }
  }

  async function plusUn() {
    if (!fiche) return;
    fiche.compteur += 1;
    await ecrire();
    afficherFiche();
  }

  /* ---------------------------------------------------------- vérifications */
  function verifierInstallation() {
    const ok = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    poser('Écran d’accueil', ok, ok ? 'lancée depuis l’icône' : 'ouverte dans Safari');
  }

  function verifierReseau() {
    poser('Réseau', null, navigator.onLine ? 'en ligne' : 'hors ligne');
  }

  async function verifierHorsLigne() {
    if (!('serviceWorker' in navigator)) return poser('Hors ligne', false, 'non pris en charge');
    try {
      await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const versions = (await caches.keys()).filter(k => k.startsWith('registre-classe-'));
      poser('Hors ligne', versions.length > 0, versions.length ? 'prêt (' + versions.join(', ') + ')' : 'en préparation…');
    } catch (e) {
      poser('Hors ligne', false, 'échec : ' + e.message);
    }
  }

  async function verifierStockage() {
    if (!navigator.storage || !navigator.storage.persisted) return poser('Stockage persistant', false, 'non pris en charge');
    const p = await navigator.storage.persisted();
    poser('Stockage persistant', p, p ? 'accordé' : 'non accordé');
    if (navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      poser('Espace', null, `${Math.round(usage / 1024)} Ko sur ${Math.round(quota / 1048576)} Mo`);
    }
  }

  /* ---------------------------------------------------------- essais */
  async function demanderPersistance() {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    verifierStockage();
  }

  async function exporter() {
    const contenu = JSON.stringify({ app: 'registre-classe', version: VERSION, export: new Date().toISOString(), fiche }, null, 2);
    const nom = 'essai-registre-classe.registre';
    const f = new File([contenu], nom, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({ files: [f] });
        poser('Export', true, 'fichier partagé');
      } catch (e) {
        if (e.name !== 'AbortError') poser('Export', false, e.message);
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = nom;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    poser('Export', true, 'fichier téléchargé');
  }

  async function camera() {
    const v = $('video');
    if (flux) {
      flux.getTracks().forEach(t => t.stop());
      flux = null;
      v.hidden = true;
      $('camera').textContent = 'Tester la caméra';
      return;
    }
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      v.srcObject = flux;
      v.hidden = false;
      await v.play();
      $('camera').textContent = 'Arrêter la caméra';
      poser('Caméra', true, 'image reçue');
    } catch (e) {
      flux = null;
      poser('Caméra', false, e.name === 'NotAllowedError' ? 'refusée' : e.message);
    }
  }

  /* ---------------------------------------------------------- démarrage */
  function init() {
    $('version').textContent = VERSION;
    ['Écran d’accueil', 'Réseau', 'Hors ligne', 'Données', 'Stockage persistant'].forEach(c => { etat[c] = [null, '…']; });
    $('plus').addEventListener('click', plusUn);
    $('persister').addEventListener('click', demanderPersistance);
    $('exporter').addEventListener('click', exporter);
    $('camera').addEventListener('click', camera);
    addEventListener('online', verifierReseau);
    addEventListener('offline', verifierReseau);
    verifierInstallation();
    verifierReseau();
    chargerFiche();
    verifierHorsLigne();
    verifierStockage();
  }

  return { init };
})();

Test.init();
