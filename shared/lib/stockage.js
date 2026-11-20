/* ============================================================
   STOCKAGE — une seule interface, plusieurs branchements
   Les écrans ne savent pas où ils tournent. Chaque branchement
   range des documents JSON par clé, avec les mêmes fonctions :
   lire(cle), ecrire(cle, valeur), supprimer(cle), cles(), fermer().
   - indexeddb : iPhone (PWA) et navigateur de test ;
   - memoire   : tests ;
   - fichiers JSON du PC (Neutralino) : ajouté en phase 4.
   ============================================================ */

const Stockage = {
  indexeddb(nomBase) {
    let db = null;
    const ouvrir = () => db ? Promise.resolve(db) : new Promise((ok, ko) => {
      if (!('indexedDB' in self)) return ko(new Error('IndexedDB indisponible'));
      const r = indexedDB.open(nomBase, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('docs');
      r.onsuccess = () => { db = r.result; ok(db); };
      r.onerror = () => ko(r.error);
      r.onblocked = () => ko(new Error('Base bloquée par un autre onglet'));
    });
    const tx = async (mode, fn) => {
      const d = await ouvrir();
      return new Promise((ok, ko) => {
        const t = d.transaction('docs', mode);
        const rq = fn(t.objectStore('docs'));
        t.oncomplete = () => ok(rq ? rq.result : undefined);
        t.onerror = () => ko(t.error);
        t.onabort = () => ko(t.error);
      });
    };
    return {
      type: 'indexeddb',
      async lire(cle) { const v = await tx('readonly', s => s.get(cle)); return v === undefined ? null : v; },
      async ecrire(cle, valeur) { await tx('readwrite', s => s.put(U.copie(valeur), cle)); },
      async supprimer(cle) { await tx('readwrite', s => s.delete(cle)); },
      cles() { return tx('readonly', s => s.getAllKeys()); },
      fermer() { if (db) { db.close(); db = null; } },
    };
  },

  memoire() {
    const m = new Map();
    return {
      type: 'memoire',
      async lire(cle) { return m.has(cle) ? U.copie(m.get(cle)) : null; },
      async ecrire(cle, valeur) { m.set(cle, U.copie(valeur)); },
      async supprimer(cle) { m.delete(cle); },
      async cles() { return [...m.keys()]; },
      fermer() { },
    };
  },

  /* demande à l'appareil de ne pas effacer les données s'il manque de place */
  async persister() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist();
  },
};
