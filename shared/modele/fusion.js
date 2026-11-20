/* ============================================================
   FUSION — importer une sauvegarde sans écraser en silence
   Pour chaque fiche (même id) : la plus récente (maj) l'emporte.
   Une fiche supprimée ne revient pas si la sauvegarde est plus
   ancienne que la suppression. Le rapport compte tout ce qui a
   changé, et les conflits (même date, contenus différents :
   la version de l'appareil est gardée).
   ============================================================ */

const Fusion = {
  fusionner(local, entrant) {
    const out = U.copie(local);
    const r = { ajouts: 0, misesAJour: 0, suppressions: 0, ignores: 0, conflits: 0 };
    const date = x => (x && x.maj) || '';

    /* suppressions connues des deux côtés */
    Object.entries(entrant.supprimes || {}).forEach(([id, m]) => {
      if (!out.supprimes[id] || m > out.supprimes[id]) out.supprimes[id] = m;
    });
    const supprime = x => out.supprimes[x.id] && out.supprimes[x.id] >= date(x);

    Modele.COLLECTIONS.forEach(col => {
      out[col] = out[col] || [];
      const index = new Map(out[col].map((x, i) => [x.id, i]));
      (entrant[col] || []).forEach(x => {
        if (supprime(x)) { r.ignores++; return; }
        if (!index.has(x.id)) { index.set(x.id, out[col].push(U.copie(x)) - 1); r.ajouts++; return; }
        const i = index.get(x.id), l = out[col][i];
        if (date(x) > date(l)) { out[col][i] = U.copie(x); r.misesAJour++; }
        else if (date(x) === date(l) && JSON.stringify(x) !== JSON.stringify(l)) r.conflits++;
      });
      const avant = out[col].length;
      out[col] = out[col].filter(x => !supprime(x));
      r.suppressions += avant - out[col].length;
    });

    if (date(entrant.reglages) > date(out.reglages)) { out.reglages = U.copie(entrant.reglages); r.misesAJour++; }
    return { donnees: out, rapport: r };
  },

  /* phrase à montrer au professeur après un import */
  resume(r) {
    const parts = [];
    if (r.ajouts) parts.push(U.pl(r.ajouts, 'fiche ajoutée', 'fiches ajoutées'));
    if (r.misesAJour) parts.push(U.pl(r.misesAJour, 'fiche mise à jour', 'fiches mises à jour'));
    if (r.suppressions) parts.push(U.pl(r.suppressions, 'fiche supprimée', 'fiches supprimées'));
    if (r.ignores) parts.push(U.pl(r.ignores, 'fiche déjà supprimée ignorée', 'fiches déjà supprimées ignorées'));
    if (r.conflits) parts.push(U.pl(r.conflits, 'conflit', 'conflits') + ' (version de cet appareil gardée)');
    return parts.length ? parts.join(', ') + '.' : 'Rien de nouveau dans cette sauvegarde.';
  },
};
