/* ============================================================
   ENVOI DU PC — fichier .registre « Envoyer vers l'iPhone »
   Produit par le Registre Atelier, reçu par le Registre Classe.
   Sens unique. Seules les séquences entrent dans les données de
   l'iPhone (par fusion) ; cours et tâches forment l'instantané
   « Aujourd'hui », remplacé à chaque envoi. Détail : SCHEMA.md.
   ============================================================ */

const Envoi = {
  FORMAT: 'registre-envoi',
  VERSION: 1,

  /* texte du fichier → envoi vérifié (lève une erreur lisible sinon) */
  lire(texte) {
    let e;
    try { e = JSON.parse(texte); } catch (err) { throw new Error('Ce fichier n’est pas lisible.'); }
    if (e?.format === Modele.FORMAT) throw new Error('C’est une sauvegarde : utilisez « Importer une sauvegarde ».');
    if (e?.format !== Envoi.FORMAT) throw new Error('Ce fichier ne vient pas du Registre Atelier (« Envoyer vers l’iPhone »).');
    if (!(e.version >= 1)) throw new Error('Ce fichier d’envoi est sans numéro de version.');
    if (e.version > Envoi.VERSION) throw new Error('Ce fichier vient d’une version plus récente du Registre Atelier : mettez l’app à jour.');
    /* chaque champ affiché est remis en texte : un fichier incomplet ne bloque pas l'app */
    const liste = x => (Array.isArray(x) ? x.filter(y => y && typeof y === 'object') : []);
    const t = v => (v == null ? '' : String(v));
    return {
      ...e,
      sequences: liste(e.sequences).filter(s => s.id && Modele.NIVEAUX_SCOLAIRES.includes(s.niveau)),
      /* couleur en hexadécimal seulement : elle va dans un attribut style */
      classes: liste(e.classes).map(c => ({ nom: t(c.nom), niveau: t(c.niveau), couleur: /^#[0-9a-f]{3,8}$/i.test(c.couleur) ? c.couleur : '' })),
      cours: liste(e.cours).map(c => ({
        d: t(c.d), h: t(c.h), f: t(c.f), salle: t(c.salle), classe: t(c.classe),
        seance: c.seance && typeof c.seance === 'object' ? {
          seq: t(c.seance.seq), n: t(c.seance.n), titre: t(c.seance.titre), consigne: t(c.seance.consigne),
          contrainte: t(c.seance.contrainte), materiel: (Array.isArray(c.seance.materiel) ? c.seance.materiel : []).map(t), apporter: t(c.seance.apporter),
        } : null,
      })),
      taches: liste(e.taches).map(x => ({ titre: t(x.titre), echeance: t(x.echeance), classe: t(x.classe) })),
    };
  },

  /* séquences de l'envoi → données de l'iPhone. Appariement : identifiant PC, sinon niveau + numéro
     d'une séquence saisie à la main. La fiche locale garde son id : ses évaluations restent attachées. */
  fusionner(d, envoi, maj = U.maintenant()) {
    const out = U.copie(d);
    const r = { ajouts: 0, misesAJour: 0, inchanges: 0, lignes: [] };
    const entrants = new Set(envoi.sequences.map(s => String(s.id)));
    const champs = x => JSON.stringify([x.niveau, x.num, x.nom, x.competences, x.questionnements, x.source, x.pcId]);
    envoi.sequences.forEach(s => {
      const v = {
        niveau: s.niveau, num: Number(s.num) || null, nom: String(s.nom || ''),
        competences: (s.competences || []).map(String), questionnements: (s.questionnements || []).map(String),
        source: 'pc', pcId: String(s.id),
      };
      const l = out.sequences.find(x => x.pcId === v.pcId)
        || (v.num && out.sequences.find(x => !x.pcId && x.niveau === v.niveau && Number(x.num) === v.num)) || null;
      /* numéro unique par niveau : celui du PC l'emporte (sauf sur une séquence que cet envoi met aussi à jour) */
      if (v.num) out.sequences.filter(x => x !== l && x.niveau === v.niveau && Number(x.num) === v.num && !entrants.has(x.pcId)).forEach(x => {
        x.num = null; x.maj = maj;
        r.lignes.push(`${x.niveau} : « ${x.nom || 'Sans titre'} » n’a plus de numéro (le n° ${v.num} vient du PC).`);
      });
      /* même id sur tout appareil : une sauvegarde d'un autre appareil se fusionne sans doublon */
      if (!l) { out.sequences.push({ id: 'pc-' + v.pcId, ...v, maj }); r.ajouts++; }
      else if (champs(l) === champs(v)) r.inchanges++;
      else { Object.assign(l, v, { maj }); r.misesAJour++; }
    });
    out.sequences.filter(x => x.pcId && !entrants.has(x.pcId)).forEach(x => {
      r.lignes.push(`${x.niveau} : « ${x.nom || 'Sans titre'} » n’est plus envoyée par le PC : supprimez-la dans Évaluer si elle ne sert plus.`);
    });
    return { donnees: out, rapport: r };
  },

  resume(r) {
    const parts = [];
    if (r.ajouts) parts.push(U.pl(r.ajouts, 'séquence ajoutée', 'séquences ajoutées'));
    if (r.misesAJour) parts.push(U.pl(r.misesAJour, 'séquence mise à jour', 'séquences mises à jour'));
    return parts.length ? parts.join(', ') + ' (évaluations gardées).' : 'Rien de nouveau dans les séquences.';
  },
};
