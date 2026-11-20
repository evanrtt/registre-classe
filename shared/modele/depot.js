/* ============================================================
   DÉPÔT — enregistrer et recharger les données, sauvegardes
   Les données sont rangées dans un Stockage (shared/lib/stockage.js),
   un document par collection, pour n'écrire que ce qui change.
   Une sauvegarde est un fichier .registre (JSON lisible).
   ============================================================ */

const Depot = {
  PREFIXE: 'classe/',

  async charger(stockage) {
    const tete = await stockage.lire(Depot.PREFIXE + 'tete');
    if (!tete) return { donnees: Modele.vide(), rapport: [] };
    const d = { ...tete };
    for (const c of Modele.COLLECTIONS) d[c] = (await stockage.lire(Depot.PREFIXE + c)) || [];
    return Migration.versActuel(d);
  },

  /* collections : celles qui ont changé (toutes si rien n'est précisé) */
  async enregistrer(stockage, d, collections = Modele.COLLECTIONS) {
    const { format, version, reglages, supprimes } = d;
    await stockage.ecrire(Depot.PREFIXE + 'tete', { format, version, reglages, supprimes });
    for (const c of collections) await stockage.ecrire(Depot.PREFIXE + c, d[c]);
  },
};

const Sauvegarde = {
  EXTENSION: '.registre',

  nomFichier(iso = U.today()) { return 'registre-classe-' + iso + Sauvegarde.EXTENSION; },
  empaqueter(d) { return JSON.stringify({ ...d, exporte: U.maintenant() }); },

  /* texte du fichier → { donnees, rapport } (V2 ou V3, toujours remis à la version actuelle) */
  lire(texte) {
    let d;
    try { d = JSON.parse(texte); } catch (e) { throw new Error('Ce fichier n’est pas une sauvegarde lisible.'); }
    const r = Migration.versActuel(d);
    delete r.donnees.exporte;
    return r;
  },
};
