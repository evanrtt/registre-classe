/* ============================================================
   U — utilitaires communs aux deux apps
   Échappement, dates (ISO yyyy-mm-dd partout), nombres, noms.
   Repris de la V2 (core.js).
   ============================================================ */

const U = {
  /* identifiant unique : préfixe + horodatage + hasard (sûr pour la fusion entre appareils) */
  id(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  /* tout texte inséré dans du HTML passe par ici */
  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  /* texte multiligne : échappé, retours à la ligne conservés */
  br(s) { return U.esc(s).replace(/\n/g, '<br>'); },

  /* — dates — */
  today() { return U.iso(new Date()); },
  /* horodatage complet, pour le champ maj des fiches */
  maintenant() { return new Date().toISOString(); },
  iso(d) {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  },
  parse(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); },
  addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); },
  diffDays(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); },
  JOURS: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  MOIS: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  fmtLong(s) {
    if (!s) return '—';
    const d = U.parse(s);
    return `${U.JOURS[d.getDay()]} ${d.getDate()} ${U.MOIS[d.getMonth()]}`;
  },
  fmtDate(s) {
    if (!s) return '—';
    const d = U.parse(s);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  },
  fmtFull(s) {
    if (!s) return '—';
    const d = U.parse(s);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  },

  /* — heures (« 08:30 ») — */
  min(h) { if (!h) return 0; const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); },
  hm(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },
  heure() { const d = new Date(); return U.hm(d.getHours() * 60 + d.getMinutes()); },

  /* — nombres — */
  moy(arr) {
    const v = arr.filter(x => typeof x === 'number' && isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  },
  n1(v) { return v == null || !isFinite(v) ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  pl(n, s, p) { return n + ' ' + (n > 1 ? (p || s + 's') : s); },

  /* — élèves et niveaux — */
  ORDRE_NIV: ['6e', '5e', '4e', '3e'],
  sortNiv(a, b) {
    const i = U.ORDRE_NIV.indexOf(a), j = U.ORDRE_NIV.indexOf(b);
    if (i >= 0 && j >= 0) return i - j;
    if (i >= 0) return -1;
    if (j >= 0) return 1;
    return String(a).localeCompare(String(b), 'fr');
  },
  sortNom(a, b) {
    return (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr', { sensitivity: 'base' });
  },
  initiales(e) { return ((e.prenom || '')[0] || '') + ((e.nom || '')[0] || ''); },
  nomComplet(e) { return (e.prenom || '') + ' ' + (e.nom || '').toUpperCase(); },
  nomCourt(e) { return (e.prenom || '') + ' ' + ((e.nom || '')[0] || '').toUpperCase() + '.'; },

  melange(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },
  copie(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); },
};
