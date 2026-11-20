/* ============================================================
   PLUS — sauvegarde (avec rappel), restauration (par fusion),
   stockage, réglages (périodes, motifs, fiche élève), résultat
   du test de la coque
   ============================================================ */

const Plus = {
  titre: 'Plus',
  VERSION: '0.4.1',
  RAPPEL_JOURS: 7,

  async afficher(root) {
    const d = App.d;
    const derniere = App.lirePref('sauvegarde');
    const vieille = !derniere || U.diffDays(derniere, U.today()) >= Plus.RAPPEL_JOURS;
    root.innerHTML = `
      <section class="bloc">
        <h2>Recevoir du PC</h2>
        <p class="aide">Dans le Registre Atelier : Réglages → « Envoyer vers l’iPhone », puis copiez le fichier sur cet iPhone (mail à vous-même, Fichiers…). Les séquences sont mises à jour sans toucher aux évaluations ; « Aujourd’hui » montre les cours des quatre semaines suivantes.</p>
        <button type="button" class="btn principal large" data-act="pl2.recevoir">Recevoir du PC</button>
      </section>
      <section class="bloc">
        <h2>Sauvegarde</h2>
        <p class="aide">Tout est enregistré sur cet iPhone. Exportez régulièrement une sauvegarde dans l’app Fichiers (ou par mail) : c’est votre filet de sécurité.</p>
        <p class="aide ${vieille ? 'alerte' : ''}">${derniere ? `Dernière sauvegarde : ${U.esc(U.fmtFull(derniere))}.` : '<b>Aucune sauvegarde pour l’instant.</b>'}
          ${vieille ? ` Un rappel s’affiche à l’ouverture après ${Plus.RAPPEL_JOURS} jours sans sauvegarde.` : ''}</p>
        <button type="button" class="btn principal large" data-act="pl2.sauver">Exporter une sauvegarde</button>
        <button type="button" class="btn large" data-act="pl2.restaurer">Importer une sauvegarde</button>
        <p class="aide">L’import ajoute ce qui manque et garde la version la plus récente de chaque fiche : rien n’est écrasé sans le dire. Une sauvegarde de l’ancien Registre (V2) est reprise.</p>
      </section>
      <section class="bloc">
        <h2>Sur cet iPhone</h2>
        <ul class="liste-infos">
          <li><span>Classes</span><b>${d.classes.length}</b></li>
          <li><span>Élèves</span><b>${d.eleves.length}</b></li>
          <li><span>Observations</span><b>${d.observations.length}</b></li>
          <li><span>Évaluations</span><b>${d.evaluations.length}</b></li>
          <li><span>Stockage protégé</span><b id="plPersist">…</b></li>
        </ul>
      </section>
      <section class="bloc">
        <h2>Périodes</h2>
        <ul class="liste-infos">${Bilan.periodes().map(p => `<li><span>${U.esc(p.nom)}</span><b>${U.esc(U.fmtDate(p.debut))} → ${U.esc(U.fmtDate(p.fin))}</b></li>`).join('')}</ul>
        <button type="button" class="btn large" data-act="pl2.periodes">Modifier les périodes</button>
      </section>
      <section class="bloc">
        <h2>Noter</h2>
        <p class="aide">${U.pl(d.reglages.motifs.length, 'motif')} : ${d.reglages.motifs.map(m => U.esc(m.lab)).join(', ')}.</p>
        <button type="button" class="btn large" data-act="pl2.motifs">Modifier les motifs</button>
      </section>
      <section class="bloc">
        <h2>Fiche élève</h2>
        <label class="interrupteur"><input type="checkbox" id="plFaible" ${d.reglages.options?.sequenceFaible ? 'checked' : ''}><span>Montrer la séquence la moins bien réussie</span></label>
        <p class="aide">Celle dont la moyenne des niveaux est la plus basse sur la période ; à égalité, la plus récente.</p>
      </section>
      <section class="bloc">
        <h2>Test de la coque</h2>
        <p class="aide" id="plTest">…</p>
        <a class="btn large" href="test-coque.html">Ouvrir la page de test</a>
      </section>
      <p class="aide centre">Registre Classe · version ${Plus.VERSION}</p>`;
    document.getElementById('plFaible').onchange = e => {
      d.reglages.options = { ...(d.reglages.options || {}), sequenceFaible: e.target.checked };
      App.modifie(null, d.reglages);
    };
    const p = document.getElementById('plPersist');
    try { p.textContent = navigator.storage && navigator.storage.persisted && await navigator.storage.persisted() ? 'oui' : 'non'; } catch (e) { p.textContent = '—'; }
    Plus.resultatTest();
  },

  /* la page de test de la coque garde ses chiffres dans sa propre base, sur ce même iPhone */
  resultatTest() {
    const el = document.getElementById('plTest'); if (!el) return;
    try {
      const r = indexedDB.open('registre-classe-test', 1);
      r.onupgradeneeded = () => { r.transaction.abort(); };
      r.onerror = () => { el.textContent = 'Pas encore de test sur cet iPhone.'; };
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('essai')) { el.textContent = 'Pas encore de test sur cet iPhone.'; db.close(); return; }
        const g = db.transaction('essai').objectStore('essai').get('fiche');
        g.onsuccess = () => {
          const f = g.result; db.close();
          if (!f) { el.textContent = 'Pas encore de test sur cet iPhone.'; return; }
          const o = f.ouvertures || [];
          el.textContent = `Compteur : ${f.compteur} · ouvert ${f.total} fois depuis le ${new Date(f.premiere).toLocaleDateString('fr-FR')}`
            + (o.length ? ` · dernière ouverture : ${new Date(o[o.length - 1]).toLocaleDateString('fr-FR')}.` : '.');
        };
      };
    } catch (e) { el.textContent = '—'; }
  },

  async sauver() {
    const texte = Sauvegarde.empaqueter(App.d);
    const nom = Sauvegarde.nomFichier();
    const f = new File([texte], nom, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f); a.download = nom; document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      App.ecrirePref('sauvegarde', U.today());
      UI.message('Sauvegarde prête : enregistrez-la dans Fichiers.');
      App.rafraichir();
    } catch (e) { if (e.name !== 'AbortError') UI.message('La sauvegarde n’a pas pu se faire.', { erreur: true }); }
  },

  /* à l'ouverture : un rappel par jour au plus, après RAPPEL_JOURS jours sans sauvegarde */
  rappel() {
    if (!App.d.eleves.length) return;
    const der = App.lirePref('sauvegarde'), t = U.today();
    if (der && U.diffDays(der, t) < Plus.RAPPEL_JOURS) return;
    if (App.lirePref('rappel') === t) return;
    App.ecrirePref('rappel', t);
    UI.message(der ? `Dernière sauvegarde il y a ${U.pl(U.diffDays(der, t), 'jour')}.` : 'Aucune sauvegarde de vos données pour l’instant.',
      { action: { lab: 'Sauvegarder', fn: () => Plus.sauver() }, duree: 6000 });
  },

  /* — périodes : trimestres ou semestres, dates modifiables — */
  periodes() {
    const ps = Bilan.periodes();
    const rentree = Modele.anneeScolaire(ps[0]?.debut || U.today());
    const ligne = (p, k) => `<div class="periode" data-k="${k}">
        <input class="saisie" data-champ="nom" value="${U.esc(p.nom)}" aria-label="Nom">
        <div class="deux-dates"><label><span>du</span><input type="date" class="saisie" data-champ="debut" value="${U.esc(p.debut)}"></label>
          <label><span>au</span><input type="date" class="saisie" data-champ="fin" value="${U.esc(p.fin)}"></label></div></div>`;
    UI.feuille({
      titre: 'Périodes', haute: true,
      corps: `<div class="segments">
          <button type="button" class="seg" data-modele="trimestres">Trimestres</button>
          <button type="button" class="seg" data-modele="semestres">Semestres</button></div>
        <p class="aide">Année ${rentree}–${rentree + 1}. Les appréciations et positionnements déjà saisis restent attachés à leur période.</p>
        <div id="plPeriodes">${ps.map(ligne).join('')}</div>`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="plPerOk">Enregistrer</button>`,
    });
    let liste = U.copie(ps);
    const box = document.getElementById('plPeriodes');
    const lire = () => { box.querySelectorAll('.periode').forEach(el => { const p = liste[el.dataset.k]; el.querySelectorAll('[data-champ]').forEach(i => { p[i.dataset.champ] = i.value.trim(); }); }); };
    document.querySelectorAll('[data-modele]').forEach(b => b.onclick = () => {
      const neuves = Modele[b.dataset.modele](rentree);
      /* une période qui garde son identifiant garde ses appréciations */
      liste = neuves.map(n => ps.find(p => p.id === n.id) ? { ...n, ...ps.find(p => p.id === n.id) } : n);
      box.innerHTML = liste.map(ligne).join('');
    });
    document.getElementById('plPerOk').onclick = () => {
      lire();
      const tri = liste.slice().sort((a, b) => a.debut.localeCompare(b.debut));
      const err = tri.find((p, k) => !p.nom || !p.debut || !p.fin || p.debut > p.fin || (k && p.debut <= tri[k - 1].fin));
      if (err) { UI.message(`Vérifiez « ${err.nom || 'sans nom'} » : chaque période a un nom, commence avant de finir et après la fin de la précédente.`, { erreur: true, duree: 5000 }); return; }
      App.d.reglages.periodes = tri.map(p => ({ id: p.id, nom: p.nom, debut: p.debut, fin: p.fin }));
      App.modifie(null, App.d.reglages);
      Bilan.choix = null;
      UI.fermer(); App.rafraichir(); UI.message('Périodes enregistrées.');
    };
  },

  /* — motifs de Noter : nom et sens (+, −, neutre) ; les observations déjà notées gardent leur texte — */
  motifs() {
    let liste = U.copie(App.d.reglages.motifs);
    const ligne = (m, k) => `<li class="motif-ligne" data-k="${k}">
        <input class="saisie" value="${U.esc(m.lab)}" aria-label="Nom du motif">
        <div class="segments valence">${[[1, '+'], [0, '·'], [-1, '−']].map(([v, lab]) => `<button type="button" class="seg" data-v="${v}" aria-pressed="${m.valence === v}">${lab}</button>`).join('')}</div>
        <button type="button" class="btn-icone" data-retirer aria-label="Retirer">✕</button></li>`;
    UI.feuille({
      titre: 'Motifs de Noter', haute: true,
      corps: `<p class="aide">+ positif, − négatif, · neutre (retard…). Retirer un motif ne retire pas ce qui a déjà été noté.</p>
        <ul class="liste-motifs" id="plMotifs"></ul>
        <button type="button" class="btn large" id="plMotifAjout">+ Ajouter un motif</button>`,
      pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="plMotifOk">Enregistrer</button>`,
    });
    const box = document.getElementById('plMotifs');
    const lire = () => box.querySelectorAll('.motif-ligne').forEach(el => { liste[el.dataset.k].lab = el.querySelector('input').value.trim(); });
    const dessiner = () => { box.innerHTML = liste.map(ligne).join(''); };
    dessiner();
    box.addEventListener('click', e => {
      const li = e.target.closest('.motif-ligne'); if (!li) return;
      const m = liste[li.dataset.k];
      const v = e.target.closest('[data-v]');
      if (v) { m.valence = Number(v.dataset.v); li.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b === v))); }
      if (e.target.closest('[data-retirer]')) { lire(); liste.splice(Number(li.dataset.k), 1); dessiner(); }
    });
    document.getElementById('plMotifAjout').onclick = () => {
      lire(); liste.push({ id: U.id('m'), lab: '', valence: 1 }); dessiner();
      box.lastElementChild.querySelector('input').focus();
    };
    document.getElementById('plMotifOk').onclick = () => {
      lire();
      liste = liste.filter(m => m.lab);
      if (!liste.length) { UI.message('Gardez au moins un motif.', { erreur: true }); return; }
      App.d.reglages.motifs = liste;
      App.modifie(null, App.d.reglages);
      if (Noter.motif !== Noter.COMP && !liste.some(m => m.id === Noter.motif)) Noter.motif = null;
      UI.fermer(); App.rafraichir(); UI.message('Motifs enregistrés.');
    };
  },

  /* fichier « Envoyer vers l'iPhone » du PC : résumé, puis séquences fusionnées et Aujourd'hui remplacé */
  recevoir() {
    const inp = document.createElement('input');
    inp.type = 'file'; // pas de filtre accept : iOS grise les .registre (extension inconnue) ; le contenu est vérifié à la lecture
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      let envoi;
      try { envoi = Envoi.lire(await f.text()); } catch (e) { UI.message(e.message, { erreur: true, duree: 5000 }); return; }
      const { donnees, rapport } = Envoi.fusionner(App.d, envoi);
      const jours = Aujourdhui.jours(envoi);
      UI.feuille({
        titre: 'Recevoir du PC',
        corps: `<p><b>${U.esc(Envoi.resume(rapport))}</b></p>
          ${rapport.lignes.map(l => `<p class="aide alerte">${U.esc(l)}</p>`).join('')}
          <p class="aide">Aujourd’hui : ${jours.length ? `${U.pl(envoi.cours.length, 'cours', 'cours')} du ${U.esc(U.fmtFull(jours[0]))} au ${U.esc(U.fmtFull(jours[jours.length - 1]))}` : 'aucun cours'}, ${U.pl(envoi.taches.length, 'tâche')} (remplace l’envoi précédent).</p>`,
        pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="plRecOk">Recevoir</button>`,
      });
      document.getElementById('plRecOk').onclick = async () => {
        App.d = donnees;
        await Depot.enregistrer(App.stockage, App.d, ['sequences']);
        await Aujourdhui.enregistrer(envoi);
        UI.fermer(); App.aller('aujourdhui');
        UI.message('Envoi du PC reçu.');
      };
    };
    inp.click();
  },

  restaurer() {
    const inp = document.createElement('input');
    inp.type = 'file'; // pas de filtre accept : iOS grise les .registre (extension inconnue) ; le contenu est vérifié à la lecture
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      let lu;
      try { lu = Sauvegarde.lire(await f.text()); } catch (e) { UI.message(e.message, { erreur: true }); return; }
      const { donnees, rapport } = Fusion.fusionner(App.d, lu.donnees);
      UI.feuille({
        titre: 'Importer la sauvegarde',
        corps: `${lu.rapport.map(l => `<p class="aide">${U.esc(l)}</p>`).join('')}
          <p><b>${U.esc(Fusion.resume(rapport))}</b></p>`,
        pied: `<button type="button" class="btn" data-fermer>Annuler</button><button type="button" class="btn principal" id="plImp">Importer</button>`,
      });
      document.getElementById('plImp').onclick = async () => {
        App.d = donnees;
        await Depot.enregistrer(App.stockage, App.d);
        if (!App.classe()) App.classeId = App.d.classes[0]?.id || null;
        UI.fermer(); App.aller('plus');
        UI.message('Sauvegarde importée.');
      };
    };
    inp.click();
  },
};

App.enregistrerVue('plus', Plus);
UI.on('pl2.sauver', () => Plus.sauver());
UI.on('pl2.restaurer', () => Plus.restaurer());
UI.on('pl2.recevoir', () => Plus.recevoir());
UI.on('pl2.periodes', () => Plus.periodes());
UI.on('pl2.motifs', () => Plus.motifs());
