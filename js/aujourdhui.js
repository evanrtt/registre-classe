/* ============================================================
   AUJOURD'HUI — la journée envoyée par le PC (Registre Atelier)
   Instantané du dernier envoi (cours des 4 semaines, séance de
   chaque cours, tâches), rangé à part dans le stockage et remplacé
   à chaque envoi. Sans envoi : les premiers pas de l'app.
   ============================================================ */

const Aujourdhui = {
  titre: 'Aujourd’hui',
  CLE: 'envoi/aujourdhui',
  envoi: undefined,     // undefined = pas encore lu, null = aucun envoi
  jour: null,

  async charger() {
    if (Aujourdhui.envoi === undefined) Aujourdhui.envoi = (await App.stockage.lire(Aujourdhui.CLE)) || null;
    return Aujourdhui.envoi;
  },
  async enregistrer(envoi) {
    const { exporte, classes, cours, taches } = envoi;
    Aujourdhui.envoi = { exporte, classes, cours, taches };
    Aujourdhui.jour = null;
    await App.stockage.ecrire(Aujourdhui.CLE, Aujourdhui.envoi);
  },

  /* jours qui ont des cours, dans l'ordre */
  jours(e) { return [...new Set(e.cours.map(c => c.d))].sort(); },

  async afficher(root) {
    const e = await Aujourdhui.charger();
    if (App.vue !== 'aujourdhui') return;
    if (!e) { root.innerHTML = Aujourdhui.premiersPas(); return; }
    const t = U.today(), jours = Aujourdhui.jours(e);
    const jour = Aujourdhui.jour || jours.find(d => d >= t) || t;
    const k = jours.indexOf(jour);
    const avant = k > 0 ? jours[k - 1] : jours.filter(d => d < jour).pop();
    const apres = k >= 0 ? jours[k + 1] : jours.find(d => d > jour);
    const cours = e.cours.filter(c => c.d === jour).sort((a, b) => a.h.localeCompare(b.h));
    const fin = jours[jours.length - 1];
    root.innerHTML = `
      ${!fin || t > fin ? `<p class="aide alerte">Cet envoi du PC s’arrête ${fin ? 'le ' + U.esc(U.fmtFull(fin)) : 'sans aucun cours'} : envoyez-en un nouveau (Registre Atelier → Réglages → « Envoyer vers l’iPhone »).</p>` : ''}
      <div class="jour-nav">
        <button type="button" class="btn-icone" data-act="aj.jour" data-d="${U.esc(avant || '')}" ${avant ? '' : 'disabled'} aria-label="Jour de cours précédent">◀</button>
        <h2>${jour === t ? 'Aujourd’hui, ' : ''}${U.esc(U.fmtLong(jour))}</h2>
        <button type="button" class="btn-icone" data-act="aj.jour" data-d="${U.esc(apres || '')}" ${apres ? '' : 'disabled'} aria-label="Jour de cours suivant">▶</button>
      </div>
      ${cours.length ? cours.map(c => Aujourdhui.carte(c, e)).join('') : `<div class="vide-grand"><b>Pas de cours ce jour-là</b></div>`}
      ${e.taches.length ? `<section class="bloc"><h2>À faire</h2><ul class="liste-infos">${e.taches.map(x => `<li><span>${U.esc(x.titre)}${x.classe ? ` <span class="tag">${U.esc(x.classe)}</span>` : ''}</span>
        <b class="${x.echeance && x.echeance < t ? 'negatif' : ''}">${x.echeance ? U.esc(U.fmtDate(x.echeance)) : ''}</b></li>`).join('')}</ul></section>` : ''}
      <p class="aide centre">Envoyé du PC le ${U.esc(U.fmtFull(String(e.exporte).slice(0, 10)))}.</p>`;
  },

  carte(c, e) {
    const coul = e.classes.find(x => x.nom === c.classe)?.couleur || 'var(--bord)';
    const ici = App.d.classes.find(x => x.nom === c.classe);
    const s = c.seance;
    return `<article class="bloc cours" style="border-left-color:${U.esc(coul)}">
      <header class="cours-tete"><b>${U.esc(c.h)}${c.f ? '–' + U.esc(c.f) : ''}</b><b>${U.esc(c.classe)}</b><span class="aide">${U.esc(c.salle)}</span>
        ${ici ? `<button type="button" class="btn" data-act="aj.noter" data-id="${U.esc(ici.id)}">Noter</button>` : ''}</header>
      ${s ? `<p class="aide">${U.esc(s.seq)}</p>
        <h3>Séance ${U.esc(s.n)}${s.titre ? ' — ' + U.esc(s.titre) : ''}</h3>
        ${s.consigne ? `<p>${U.br(s.consigne)}</p>` : ''}
        ${s.contrainte ? `<p><b>Contrainte :</b> ${U.br(s.contrainte)}</p>` : ''}
        ${s.materiel.length ? `<p><b>Matériel :</b> ${s.materiel.map(U.esc).join(', ')}</p>` : ''}
        ${s.apporter ? `<p><b>À apporter :</b> ${U.esc(s.apporter)}</p>` : ''}`
        : `<p class="aide">Aucune séance prévue.</p>`}
    </article>`;
  },

  /* premier lancement : ce qu'il reste à faire, dans l'ordre */
  premiersPas() {
    const fait = v => v ? '<span class="positif">✓</span>' : '';
    return `<section class="bloc">
        <h2>Bienvenue dans le Registre Classe</h2>
        <p class="aide">Tout reste sur cet iPhone, même sans réseau. Trois étapes pour commencer :</p>
        <ol class="premiers-pas">
          <li><b>Recevoir vos séquences du PC.</b> Dans le Registre Atelier : Réglages → « Envoyer vers l’iPhone ». Copiez le fichier sur cet iPhone (mail à vous-même, Fichiers…).
            <button type="button" class="btn principal large" data-act="pl2.recevoir">Recevoir du PC</button></li>
          <li><b>Créer vos classes</b> et coller la liste des élèves. ${fait(App.d.classes.length)}
            <button type="button" class="btn large" data-aller="classes">Classes</button></li>
          <li><b>Sauvegarder chaque semaine</b> dans l’app Fichiers (Plus → « Exporter une sauvegarde »).</li>
        </ol>
      </section>`;
  },
};

App.enregistrerVue('aujourdhui', Aujourdhui);
UI.on('aj.jour', d => { if (d.d) { Aujourdhui.jour = d.d; App.aller('aujourdhui'); } });
UI.on('aj.noter', d => { App.classeId = d.id; App.ecrirePref('classe', d.id); App.aller('noter'); });
