import { SOURCES } from './sources.js';
import { searchTrials } from './connectors.js';
import { searchAll, runScan, DEFAULT_TOPICS } from './radar.js';
import { LEVELS, compare, summarize } from './classify.js';
import { store, loadArchive, saveArchive } from './store.js';
import { DISCLAIMER, STUDY, ATLAS, THERAPIES, INTEGRATIVE, INTEGRATIVE_WARNINGS, GLOSSARY } from './content.js';
import { ATLAS_DETAIL, EPI_LINKS } from './atlas-data.js';
import { importFeed } from './feed.js';

const $ = (s) => document.querySelector(s);
const view = $('#view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
const fmtDate = (t) => (t ? new Date(t).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

let mode = store.get('mode', 'simple'); // 'simple' | 'scientific'
const cache = new Map(); // key -> record, per i preferiti

const NAV = [
  ['home', 'Home Radar'], ['study', 'Studio della malattia'], ['atlas', 'Atlante dei tumori'], ['therapies', 'Terapie e cure'],
  ['integrative', 'Medicina integrata'], ['discoveries', 'Nuove scoperte'], ['trials', 'Studi clinici'], ['search', 'Ricerca AI'],
  ['archive', 'Archivio scientifico'], ['watch', 'Preferiti e monitoraggio'], ['sources', 'Fonti'],
];

// ---------- utilità ----------
const glossRe = new RegExp(`(?<![\\p{L}])(${Object.keys(GLOSSARY).sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'giu');
function gloss(text) {
  const key = (t) => Object.keys(GLOSSARY).find((k) => k.toLowerCase() === t.toLowerCase());
  return esc(text).replace(glossRe, (m) => `<abbr title="${esc(GLOSSARY[key(m)] || '')}">${m}</abbr>`);
}

function notDemonstrated(r) {
  const out = [];
  const c = r.cls;
  if (c.preclinical) out.push('Non dimostra alcun beneficio nell’essere umano.');
  if (r.isPreprint) out.push('Non è ancora stato verificato da revisori indipendenti.');
  if (/osservazionale|retrospettivo|prospettico/i.test(c.design)) out.push('Non dimostra che una cosa sia la causa dell’altra (correlazione ≠ causalità).');
  if (/fase I\b|fase II\b/.test(c.design)) out.push('Su pochi pazienti: serve la conferma di studi più ampi (fase III).');
  out.push('Per applicare i risultati a una singola persona serve il parere di un professionista sanitario.');
  return out;
}

function recCard(r) {
  cache.set(r.key, r);
  const favs = store.get('favs', {});
  const c = r.cls;
  const lvl = LEVELS[c.level];
  const authors = (r.authors || []).length > 3 ? r.authors.slice(0, 3).join(', ') + ' et al.' : (r.authors || []).join(', ');
  return `<article class="card rec">
    <h3><button class="star" data-fav="${esc(r.key)}" aria-label="Preferito" title="Preferito">${favs[r.key] ? '★' : '☆'}</button><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a></h3>
    <div class="mute">${esc(authors)}${authors ? ' · ' : ''}${esc(r.journal || 'Rivista non indicata')} · ${esc(r.date || 'data n.d.')}</div>
    <div><span class="badge">${esc(c.design)}</span><span class="badge l${lvl.rank}" title="${esc(lvl.hint)}">${esc(lvl.label)}</span>${r.isPreprint ? '<span class="badge pre">Preprint non revisionato</span>' : ''}${c.preclinical ? '<span class="badge pre">Preclinico</span>' : ''}<span class="badge">${esc((r.foundIn || [r.sourceName]).join(' + '))}</span></div>
    ${mode === 'simple' ? `<p class="mute">${gloss(lvl.hint)}</p>` : ''}
    <details ${mode === 'scientific' ? 'open' : ''}><summary>Dettagli scientifici</summary>
      <p><b>Motivazione della classificazione (automatica):</b> ${esc(c.reasons.join('; ') || '—')}</p>
      ${c.flags.length ? `<p class="note">${c.flags.map(esc).join('<br>')}</p>` : ''}
      <p><b>Cosa non dimostra:</b></p><ul>${notDemonstrated(r).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p><b>Partecipanti/campione:</b> ${c.sample ?? 'non rilevato'} · <b>Finanziamenti:</b> ${esc((c.funding || []).join(', ') || 'non indicati nei metadati')} · <b>Conflitti di interesse:</b> ${esc(c.conflictsOfInterest)}</p>
      ${(r.affiliations || []).length ? `<p><b>Istituzioni:</b> ${esc(r.affiliations.slice(0, 4).join(' · '))}</p>` : ''}
      ${r.authors?.length ? `<p><b>Autori:</b> ${esc(r.authors.slice(0, 12).join(', '))}${r.authors.length > 12 ? '…' : ''}</p>` : ''}
      <p><b>Abstract:</b> ${r.abstract ? esc(r.abstract) : '<i>non disponibile da questa fonte</i>'}</p>
      <p class="mute">${r.doi ? 'DOI: ' + esc(r.doi) + ' · ' : ''}${r.pmid ? 'PMID: ' + esc(r.pmid) : ''}</p>
    </details></article>`;
}

function statusLine(statuses) {
  return Object.entries(statuses).map(([id, s]) => {
    const name = SOURCES.find((x) => x.id === id)?.name.split(' (')[0] || id;
    return s.status === 'ok' ? `<span class="badge">${esc(name)}: ${s.count}</span>` : `<span class="badge pre" title="${esc(s.error)}">${esc(name)}: non disponibile</span>`;
  }).join('');
}

// Ricerca + visualizzazione risultati dentro un contenitore
async function searchInto(el, query, opts = {}) {
  el.innerHTML = '<p class="mute">Interrogo le fonti scientifiche…</p>';
  let res;
  try {
    res = await searchAll(query, { limit: opts.limit || 15, oncology: opts.oncology !== false });
  } catch (e) {
    el.innerHTML = `<p class="err">Errore imprevisto: ${esc(e.message)}</p>`;
    return null;
  }
  store.set('sourceStatus', { ...store.get('sourceStatus', {}), ...res.statuses });
  const down = Object.values(res.statuses).filter((s) => s.status !== 'ok').length;
  const recs = res.records;
  const draw = (sort) => {
    const list = [...recs];
    if (sort === 'evidence') list.sort((a, b) => LEVELS[b.cls.level].rank - LEVELS[a.cls.level].rank);
    el.querySelector('.list').innerHTML = list.map(recCard).join('') || '<p class="mute">Nessun risultato.</p>';
  };
  const cmp = compare(recs);
  const byLevel = summarize(recs);
  el.innerHTML = `
    <div class="row">${statusLine(res.statuses)}</div>
    ${down ? `<p class="err">${down} fonte/i non raggiungibile/i: i risultati sono parziali.${down === Object.keys(res.statuses).length ? ' Verifica la connessione internet.' : ''}</p>` : ''}
    ${recs.length ? `<p class="mute">${recs.length} documenti unici (${res.rawCount} prima della deduplicazione) · ${Object.entries(byLevel).map(([l, n]) => `${n} ${LEVELS[l].label.toLowerCase()}`).join(' · ')}</p>` : ''}
    ${cmp.possibleContradiction ? `<p class="note"><b>Possibili risultati discordanti</b> tra studi clinici su questo tema. ${esc(cmp.note)}</p>` : ''}
    <div class="row"><label class="mute">Ordina: <select data-sort><option value="date">Più recenti</option><option value="evidence">Solidità delle evidenze</option></select></label></div>
    <div class="list"></div>`;
  el.querySelector('[data-sort]').onchange = (e) => draw(e.target.value);
  draw('date');
  return { ...res, cmp, byLevel };
}

function trialCard(t) {
  return `<article class="card rec"><h3><a href="${esc(safeUrl(t.url))}" target="_blank" rel="noopener noreferrer">${esc(t.title)}</a></h3>
    <div><span class="badge">${esc(t.id)}</span><span class="badge">${esc(t.phases.join('/').replace(/PHASE/g, 'Fase ') || 'Fase n.d.')}</span><span class="badge">${esc(t.status)}</span>${t.hasResults ? '<span class="badge l5">Risultati pubblicati</span>' : ''}</div>
    <p class="mute">Sponsor: ${esc(t.sponsor || t.organization || 'n.d.')} · Partecipanti previsti: ${esc(t.enrollment ?? 'n.d.')} · Inizio: ${esc(t.startDate || 'n.d.')} · Ultimo aggiornamento: ${esc(t.lastUpdate || 'n.d.')}</p>
    <p class="mute">Paesi: ${esc(t.countries.slice(0, 8).join(', ') || 'n.d.')}${t.countries.length > 8 ? '…' : ''}</p>
    <details ${mode === 'scientific' ? 'open' : ''}><summary>Dettagli</summary>
      <p><b>Condizioni:</b> ${esc(t.conditions.join(', ') || 'n.d.')}</p><p><b>Trattamento studiato:</b> ${esc(t.interventions.join(', ') || 'n.d.')}</p>
      <p><b>Criteri di inclusione/esclusione (estratto):</b> ${esc(t.eligibility || 'n.d.')}</p></details></article>`;
}

async function trialsInto(el, query, filters = {}, limit = 10) {
  el.innerHTML = '<p class="mute">Interrogo ClinicalTrials.gov…</p>';
  try {
    const t = await searchTrials(query, { limit, ...filters });
    store.set('sourceStatus', { ...store.get('sourceStatus', {}), ctgov: { status: 'ok', count: t.length, at: Date.now() } });
    el.innerHTML = `<p class="note">Uno studio in reclutamento NON è un trattamento disponibile al pubblico: l’arruolamento dipende da criteri di eleggibilità e dal centro.</p>` + (t.map(trialCard).join('') || '<p class="mute">Nessuno studio trovato.</p>');
  } catch (e) {
    store.set('sourceStatus', { ...store.get('sourceStatus', {}), ctgov: { status: 'errore', error: e.message, at: Date.now() } });
    el.innerHTML = `<p class="err">ClinicalTrials.gov non raggiungibile (${esc(e.message)}).</p>`;
  }
}

const searchForm = (action, value = '', extra = '') => `<form class="row" data-form="${action}"><input type="search" name="q" value="${esc(value)}" placeholder="Es. tumore al pancreas, curcumina, KRAS…" required>${extra}<button class="primary">Cerca</button></form>`;

// ---------- viste ----------
const views = {
  async home() {
    const scan = store.get('lastScan');
    const arch = Object.values(loadArchive()).sort((a, b) => b.firstSeen - a.firstSeen);
    const down = scan?.sourcesDown || [];
    view.innerHTML = `<h1>Home Radar</h1>
      <div class="stats">
        <div class="stat"><span class="mute">Ultima scansione</span><b style="font-size:1rem">${fmtDate(scan?.at)}</b></div>
        <div class="stat"><span class="mute">Fonti controllate (ok)</span><b>${scan ? esc(scan.sourcesChecked) : '—'}</b></div>
        <div class="stat"><span class="mute">Nuove pubblicazioni</span><b>${scan ? esc(scan.newCount) : '—'}</b></div>
        <div class="stat"><span class="mute">Documenti analizzati</span><b>${scan ? esc(scan.analyzed) : '—'}</b></div>
        <div class="stat"><span class="mute">Fonti non disponibili</span><b>${scan ? esc(down.length) : '—'}</b></div>
      </div>
      <p class="mute">Valori reali registrati dall’ultima scansione${scan ? ` (argomenti: ${esc(scan.topics.join(', '))})` : ' — nessuna scansione ancora eseguita'}. ${down.length ? 'Non raggiungibili: ' + esc(down.map((d) => d.id).join(', ')) : ''}</p>
      <div class="row"><button class="primary" id="scanBtn">Aggiorna radar ora</button><span id="scanMsg" class="mute"></span></div>
      <h2>Ultime pubblicazioni individuate</h2>
      ${arch.length ? arch.slice(0, 10).map(recCard).join('') : '<p class="mute">L’archivio è vuoto: premi “Aggiorna radar ora” per la prima scansione.</p>'}
      <h2>Scorciatoie</h2>
      <div class="grid">${NAV.slice(1, 8).map(([h, l]) => `<a class="card" href="#/${h}"><h3>${l}</h3></a>`).join('')}</div>`;
    $('#scanBtn').onclick = async (e) => {
      e.target.disabled = true;
      $('#scanMsg').textContent = 'Scansione in corso…';
      await doScan();
      views.home();
    };
  },

  study(id) {
    if (id) {
      const item = STUDY.flatMap((g) => g.items).find((i) => i[0] === id);
      if (!item) return notFound();
      view.innerHTML = `<p><a href="#/study">← Studio della malattia</a></p><h1>${esc(item[1])}</h1>
        <div class="card"><p>${gloss(mode === 'simple' ? item[2] : item[3])}</p><p class="mute">Cambia modalità in alto per passare da spiegazione semplice a scientifica.</p></div>
        <h2>Ricerche scientifiche recenti</h2><div id="res"></div>`;
      searchInto($('#res'), item[4]);
      return;
    }
    view.innerHTML = `<h1>Studio della malattia</h1><p class="mute">Percorso educativo: ogni argomento è collegato alle pubblicazioni più recenti.</p>` +
      STUDY.map((g) => `<h2>${g.group}</h2><div class="grid">${g.items.map((i) => `<a class="card" href="#/study/${i[0]}"><h3>${esc(i[1])}</h3><p class="mute">${esc(i[2])}</p></a>`).join('')}</div>`).join('') +
      `<h2>Glossario</h2><div class="card"><dl>${Object.entries(GLOSSARY).map(([k, v]) => `<dt><b>${esc(k)}</b></dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
  },

  atlas(id) {
    if (id) {
      const t = ATLAS.find((a) => a[0] === id);
      if (!t) return notFound();
      const d = ATLAS_DETAIL[id];
      const ul = (a) => `<ul>${a.map((x) => `<li>${gloss(x)}</li>`).join('')}</ul>`;
      view.innerHTML = `<p><a href="#/atlas">← Atlante</a></p><h1>${esc(t[1])}</h1><div class="card"><p>${esc(t[2])}</p>
        ${d ? `<h2>Organo e tessuti</h2><p>${esc(d.tissue)}</p><h2>Tipologie e sottotipi</h2>${ul(d.subtypes)}<h2>Fattori di rischio noti</h2>${ul(d.risk)}
        <h2>Biomarcatori e alterazioni associate</h2>${ul(d.bio)}<h2>Diagnosi</h2><p>${gloss(d.dx)}</p><h2>Stadiazione</h2><p>${esc(d.staging)}</p>
        <h2>Modalità di trattamento (in generale)</h2>${ul(d.tx)}
        <p class="note">Scheda di orientamento a scopo educativo. La scelta del trattamento dipende da stadio, caratteristiche biologiche e condizioni del paziente: la decide l’équipe oncologica secondo le linee guida aggiornate. Terapie approvate e sperimentali sono distinte nella sezione “Terapie e cure”.</p>` : ''}
        <h2>Epidemiologia e prognosi</h2><p class="mute">I dati cambiano nel tempo e per sottogruppo: consulta le fonti aggiornate. ${EPI_LINKS.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join(' · ')}</p>
        <p class="mute">Linee guida: <a href="https://www.cancer.gov/" target="_blank" rel="noopener noreferrer">NCI</a> · <a href="https://www.esmo.org/guidelines" target="_blank" rel="noopener noreferrer">ESMO</a> · <a href="https://www.aiom.it/linee-guida-aiom/" target="_blank" rel="noopener noreferrer">AIOM</a> · <a href="https://www.aifa.gov.it/" target="_blank" rel="noopener noreferrer">AIFA</a></p></div>
        <h2>Ricerca recente</h2><div id="r1"></div>
        <h2>Revisioni sistematiche e meta-analisi</h2><div id="r2"></div>
        <h2>Studi clinici (ClinicalTrials.gov)</h2><div id="r3"></div>`;
      searchInto($('#r1'), t[3], { limit: 10 });
      searchInto($('#r2'), `(${t[3]}) AND (systematic review OR meta-analysis)`, { limit: 8 });
      trialsInto($('#r3'), t[3]);
      return;
    }
    view.innerHTML = `<h1>Atlante dei tumori</h1><div class="grid">${ATLAS.map((a) => `<a class="card" href="#/atlas/${a[0]}"><h3>${esc(a[1])}</h3><p class="mute">${esc(a[2])}</p></a>`).join('')}</div>`;
  },

  therapies(id) {
    if (id) {
      const t = THERAPIES.flatMap((g) => g.items).find((i) => i[0] === id);
      if (!t) return notFound();
      view.innerHTML = `<p><a href="#/therapies">← Terapie</a></p><h1>${esc(t[1])}</h1><div class="card"><p>${esc(t[2])}</p>
        <p><b>Stato:</b> <span class="badge ${/sperimentale/i.test(t[3]) ? 'pre' : 'l5'}">${esc(t[3])}</span></p>
        <p class="note">Lo stato regolatorio varia per tumore e Paese: verifica sempre EMA, FDA e AIFA. Terapie approvate e sperimentali sono sempre distinte.</p></div>
        <h2>Ricerche recenti</h2><div id="r1"></div><h2>Studi clinici in corso</h2><div id="r2"></div>`;
      searchInto($('#r1'), t[4], { limit: 10 });
      trialsInto($('#r2'), t[4]);
      return;
    }
    view.innerHTML = `<h1>Terapie e cure</h1>` + THERAPIES.map((g) => `<h2>Terapie ${g.group.toLowerCase()}</h2><div class="grid">${g.items.map((i) => `<a class="card" href="#/therapies/${i[0]}"><h3>${esc(i[1])}</h3><p class="mute">${esc(i[2])}</p><span class="badge">${esc(i[3])}</span></a>`).join('')}</div>`).join('');
  },

  integrative(id) {
    const warn = `<div class="note"><b>Leggi prima di continuare</b><ul>${INTEGRATIVE_WARNINGS.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
    if (id) {
      const it = INTEGRATIVE.flatMap((g) => g.items).find((i) => i[0] === id);
      if (!it) return notFound();
      view.innerHTML = `<p><a href="#/integrative">← Medicina integrata</a></p><h1>${esc(it[1])}</h1>${warn}
        <p class="mute">Per ogni voce OncoRadar mostra cosa è stato realmente studiato. Dosi, biodisponibilità, tossicità e interazioni vanno letti nei singoli studi (modalità scientifica) e discussi con l’oncologo.</p>
        <h2>Cosa dice la letteratura</h2><div id="res"></div>`;
      const resEl = $('#res');
      searchInto(resEl, it[2], { limit: 20 }).then((r) => {
        if (!r || !resEl.isConnected) return; // l'utente può aver cambiato pagina nel frattempo
        const pre = r.records.filter((x) => x.cls.preclinical).length;
        const clin = r.records.filter((x) => LEVELS[x.cls.level].rank >= LEVELS.clinica_preliminare.rank).length;
        resEl.insertAdjacentHTML('afterbegin', `<p class="okbox">Tra i ${r.records.length} documenti più recenti: <b>${clin}</b> con dati sull’uomo (di qualunque solidità), <b>${pre}</b> solo preclinici. ${clin === 0 ? 'Nessuna evidenza sull’uomo emersa in questa ricerca: non significa che l’effetto sia escluso, ma non è dimostrato.' : ''}</p>`);
      }).catch(() => {});
      return;
    }
    view.innerHTML = `<h1>Medicina integrata</h1>${warn}` + INTEGRATIVE.map((g) => `<h2>${g.group}</h2><div class="grid">${g.items.map((i) => `<a class="card" href="#/integrative/${i[0]}"><h3>${esc(i[1])}</h3></a>`).join('')}</div>`).join('') +
      `<h2>Ricerca libera su approcci non convenzionali</h2>${searchForm('integrative-free')}<div id="res"></div>`;
  },

  discoveries() {
    const cats = [['Nuovi bersagli terapeutici', 'novel therapeutic target'], ['Nuovi biomarcatori', 'novel biomarker'], ['Meccanismi di resistenza', 'mechanism of resistance'], ['Metodi diagnostici', 'novel diagnostic method early detection'], ['Strategie immunoterapiche', 'novel immunotherapy strategy'], ['Nuove molecole', 'first-in-human novel compound']];
    view.innerHTML = `<h1>Nuove scoperte</h1><p class="mute">Ogni scheda riporta cosa dimostra e cosa non dimostra ancora, senza titoli sensazionalistici.</p><div class="row">${cats.map((c, i) => `<button data-cat="${i}">${c[0]}</button>`).join('')}</div><div id="res"></div>`;
    view.onclick = (e) => { const b = e.target.closest('[data-cat]'); if (b) searchInto($('#res'), cats[b.dataset.cat][1], { limit: 15 }); };
  },

  trials() {
    view.innerHTML = `<h1>Radar studi clinici</h1>${searchForm('trials', '', `<select name="status"><option value="">Ogni stato</option><option value="RECRUITING">In reclutamento</option><option value="NOT_YET_RECRUITING">Non ancora in reclutamento</option><option value="ACTIVE_NOT_RECRUITING">Attivo, non recluta</option><option value="COMPLETED">Concluso</option><option value="SUSPENDED">Sospeso</option><option value="TERMINATED">Interrotto</option></select><select name="phase"><option value="">Ogni fase</option><option value="PHASE1">Fase I</option><option value="PHASE2">Fase II</option><option value="PHASE3">Fase III</option><option value="PHASE4">Fase IV</option></select>`)}
      <p class="mute">Cerca per tumore, farmaco, gene, mutazione, Paese o centro. Fonte attiva: ClinicalTrials.gov. WHO ICTRP, CTIS e altri registri non sono ancora collegati.</p><div id="res"></div>`;
  },

  search(_, params) {
    const q = params.get('q') || '';
    view.innerHTML = `<h1>Ricerca avanzata</h1>${searchForm('search', q, '<label class="mute"><input type="checkbox" name="onc" checked> Solo oncologia</label>')}
      <p class="note">La sintesi è generata con regole deterministiche sui metadati e sugli abstract: non è un modello di linguaggio e non inventa fonti. Un livello di analisi generativa richiederebbe un servizio a pagamento (da valutare insieme).</p><div id="res"></div>`;
    if (q) runAdvanced(q, params.get('onc') !== '0');
  },

  archive() {
    const all = Object.values(loadArchive()).sort((a, b) => b.firstSeen - a.firstSeen);
    view.innerHTML = `<h1>Archivio scientifico</h1><p class="mute">${all.length} documenti salvati su questo dispositivo (max 300, i più recenti).</p>
      <div class="row"><input type="search" id="af" placeholder="Filtra per titolo o argomento"><select id="al"><option value="">Ogni livello</option>${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div><div id="list"></div>`;
    const draw = () => {
      const t = $('#af').value.toLowerCase(), l = $('#al').value;
      $('#list').innerHTML = all.filter((r) => (!t || (r.title + ' ' + (r.topic || '')).toLowerCase().includes(t)) && (!l || r.cls.level === l)).slice(0, 60).map(recCard).join('') || '<p class="mute">Nessun documento.</p>';
    };
    $('#af').oninput = draw; $('#al').onchange = draw; draw();
  },

  watch() {
    const topics = store.get('topics', []);
    const favs = Object.values(store.get('favs', {}));
    const notifs = store.get('notifs', []);
    view.innerHTML = `<h1>Preferiti e monitoraggio</h1>
      <h2>Argomenti seguiti</h2>
      <form class="row" data-form="follow"><input type="text" name="topic" placeholder="Es. immunoterapia, microbiota, CAR-T" required><select name="freq"><option value="daily">Giornaliera</option><option value="weekly">Settimanale</option><option value="open">Ad ogni apertura</option></select><button class="primary">Segui</button></form>
      ${topics.map((t, i) => `<span class="badge">${esc(t.topic)} · ${{ daily: 'giornaliera', weekly: 'settimanale', open: 'ad ogni apertura' }[t.freq]} <button class="star" data-unfollow="${i}" aria-label="Smetti di seguire">×</button></span>`).join('') || '<p class="mute">Nessun argomento seguito.</p>'}
      <p class="note">Il controllo avviene quando apri OncoRadar (nessun server in background): le notifiche di sistema funzionano mentre l’app è aperta. <button id="permBtn">Abilita notifiche del browser</button> <button id="chkBtn">Controlla ora</button></p>
      <h2>Notifiche</h2>${notifs.slice(0, 20).map((n) => `<div class="card"><b>${esc(n.title)}</b><div class="mute">${esc(n.topic)} · ${esc(n.date || '')} · ${esc(n.levelLabel)}</div><a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener noreferrer">Fonte originale</a></div>`).join('') || '<p class="mute">Nessuna notifica.</p>'}
      <h2>Preferiti</h2>${favs.map(recCard).join('') || '<p class="mute">Nessun preferito: usa la stella accanto a un risultato.</p>'}`;
    $('#permBtn').onclick = async () => { try { alert('Permesso: ' + (await Notification.requestPermission())); } catch { alert('Notifiche non supportate da questo browser.'); } };
    $('#chkBtn').onclick = async (e) => { e.target.disabled = true; await checkFollowed(true); views.watch(); };
  },

  sources() {
    const st = store.get('sourceStatus', {});
    view.innerHTML = `<h1>Registro delle fonti</h1><p class="mute">Solo le fonti con connettore realmente implementato risultano “collegate”. Le altre sono elencate come obiettivo, senza dichiarare accessi che non esistono.</p>
      <div style="overflow-x:auto"><table><thead><tr><th>Fonte</th><th>Tipo</th><th>Affidabilità</th><th>Accesso</th><th>Frequenza</th><th>Limiti</th><th>Stato</th><th>Ultima scansione</th></tr></thead><tbody>${SOURCES.map((s) => {
        const x = st[s.id];
        const stato = !s.connector ? 'Non ancora collegata' : !x ? 'Collegata (mai interrogata)' : x.status === 'ok' ? 'Operativa' : 'Errore: ' + esc(x.error);
        return `<tr><td>${esc(s.name)}</td><td>${esc(s.type)}</td><td>${esc(s.reliability)}</td><td>${esc(s.access)}</td><td>${esc(s.frequency)}</td><td>${esc(s.limits)}</td><td>${stato}</td><td>${x ? fmtDate(x.at) : '—'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  },
};

async function runAdvanced(q, onc) {
  const el = $('#res');
  el.innerHTML = '<div id="sum"></div><h2>Studi e pubblicazioni</h2><div id="pubs"></div><h2>Studi clinici correlati</h2><div id="tr"></div>';
  trialsInto($('#tr'), q, {}, 5);
  const r = await searchInto($('#pubs'), q, { limit: 20, oncology: onc });
  if (!r) return;
  const recs = r.records;
  const human = recs.filter((x) => LEVELS[x.cls.level].rank >= LEVELS.clinica_preliminare.rank).length;
  const pre = recs.filter((x) => x.cls.preclinical).length;
  const prepr = recs.filter((x) => x.isPreprint).length;
  $('#sum').innerHTML = `<h2>Risposta sintetica</h2><div class="card">
    <p>Trovati <b>${recs.length}</b> documenti unici su “${esc(q)}”: <b>${human}</b> con dati sull’uomo, <b>${pre}</b> preclinici (laboratorio/animali), <b>${prepr}</b> preprint non revisionati.</p>
    <p><b>Concordanze e discordanze:</b> ${r.cmp.possibleContradiction ? 'rilevati possibili risultati discordanti tra studi clinici (da verificare leggendo le fonti).' : r.cmp.clinicalCount < 2 ? 'dati clinici insufficienti per un confronto.' : 'nessuna discordanza evidente dai soli abstract.'}</p>
    <p><b>Limiti delle conoscenze:</b> la ricerca esamina i ${recs.length} documenti più recenti restituiti dalle fonti attive, non l’intera letteratura; la classificazione è euristica. Per decisioni cliniche rivolgiti al tuo oncologo.</p></div>`;
}

function notFound() { view.innerHTML = '<h1>Non trovato</h1><p><a href="#/home">Torna alla Home</a></p>'; }

// ---------- scansione e notifiche ----------
async function doScan() {
  const topics = [...new Set([...DEFAULT_TOPICS, ...store.get('topics', []).map((t) => t.topic)])];
  try { await runScan(topics); } catch (e) { console.error(e); }
}

const DUE = { open: 0, daily: 864e5, weekly: 6048e5 };
async function checkFollowed(force) {
  const topics = store.get('topics', []);
  const last = store.get('topicChecks', {});
  const archive = loadArchive();
  const found = [];
  for (const t of topics) {
    if (!force && Date.now() - (last[t.topic] || 0) < DUE[t.freq]) continue;
    const { records } = await searchAll(t.topic, { limit: 10 });
    last[t.topic] = Date.now();
    for (const r of records) {
      if (archive[r.key]) continue;
      archive[r.key] = { ...r, abstract: (r.abstract || '').slice(0, 1500), firstSeen: Date.now(), topic: t.topic };
      found.push({ topic: t.topic, title: r.title, date: r.date, levelLabel: r.cls.levelLabel, url: r.url, key: r.key, at: Date.now() });
    }
  }
  saveArchive(archive);
  store.set('topicChecks', last);
  if (found.length) {
    store.set('notifs', [...found, ...store.get('notifs', [])].slice(0, 100));
    try { if (Notification.permission === 'granted') new Notification('OncoRadar', { body: `${found.length} nuove pubblicazioni sugli argomenti seguiti` }); } catch { /* non supportato */ }
  }
  return found.length;
}

// ---------- eventi globali ----------
document.addEventListener('click', (e) => {
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    const favs = store.get('favs', {});
    const k = fav.dataset.fav;
    if (favs[k]) delete favs[k]; else if (cache.get(k)) favs[k] = { ...cache.get(k), abstract: (cache.get(k).abstract || '').slice(0, 1500) };
    store.set('favs', favs);
    fav.textContent = favs[k] ? '★' : '☆';
    return;
  }
  const un = e.target.closest('[data-unfollow]');
  if (un) { const t = store.get('topics', []); t.splice(Number(un.dataset.unfollow), 1); store.set('topics', t); views.watch(); }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const f = new FormData(form);
  const q = (f.get('q') || '').toString().trim();
  switch (form.dataset.form) {
    case 'search': location.hash = `#/search?q=${encodeURIComponent(q)}&onc=${f.get('onc') ? 1 : 0}`; break;
    case 'trials': trialsInto($('#res'), q, { status: f.get('status'), phase: f.get('phase') }, 20); break;
    case 'integrative-free': searchInto($('#res'), q, { limit: 20 }); break;
    case 'follow': {
      const topic = (f.get('topic') || '').toString().trim();
      const t = store.get('topics', []);
      if (topic && !t.some((x) => x.topic.toLowerCase() === topic.toLowerCase())) t.push({ topic, freq: f.get('freq') });
      store.set('topics', t); views.watch(); break;
    }
  }
});

// ---------- router e interfaccia ----------
function route() {
  const [path, qs] = (location.hash.slice(1) || '/home').split('?');
  const [, name = 'home', id] = path.split('/');
  view.onclick = null;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#/${name}`));
  (Object.hasOwn(views, name) ? views[name] : notFound).call(views, id, new URLSearchParams(qs || ''));
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
  const dark = document.documentElement.dataset.theme === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.dataset.theme);
  $('#themeBtn').textContent = dark ? '☀' : '☾';
}

$('#banner').textContent = DISCLAIMER;
$('#nav').innerHTML = NAV.map(([h, l]) => `<a href="#/${h}">${l}</a>`).join('');
$('#modeBtn').textContent = mode === 'simple' ? 'Semplice' : 'Scientifica';
$('#modeBtn').onclick = () => { mode = mode === 'simple' ? 'scientific' : 'simple'; store.set('mode', mode); $('#modeBtn').textContent = mode === 'simple' ? 'Semplice' : 'Scientifica'; route(); };
$('#themeBtn').onclick = () => { const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); const t = dark ? 'light' : 'dark'; store.set('theme', t); applyTheme(t); };
applyTheme(store.get('theme', null));
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// Feed giornaliero prodotto dalla GitHub Action (se presente): importato nell'archivio locale.
async function loadFeed() {
  try {
    const res = await fetch('data/radar.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const feed = await res.json();
    const meta = store.get('feedMeta');
    if (meta?.generatedAt === feed.generatedAt) return;
    const archive = loadArchive();
    const imported = importFeed(archive, feed);
    saveArchive(archive);
    store.set('feedMeta', { generatedAt: feed.generatedAt, imported, sourcesChecked: feed.sourcesChecked, sourcesDown: feed.sourcesDown, analyzed: feed.analyzed, newCount: feed.newCount });
    if (!store.get('lastScan')) store.set('lastScan', { at: Date.parse(feed.generatedAt), sourcesChecked: feed.sourcesChecked, sourcesDown: (feed.sourcesDown || []).map((id) => ({ id, error: 'non raggiungibile nell’ultima scansione del server' })), newCount: feed.newCount, analyzed: feed.analyzed, topics: ['scansione giornaliera del server'] });
    if (location.hash === '' || location.hash === '#/home') route();
  } catch { /* feed non disponibile: l'app funziona comunque con la scansione locale */ }
}

// Scansione automatica al massimo una volta ogni 24 ore, più il controllo degli argomenti seguiti.
(async () => {
  if (!navigator.onLine) return;
  await loadFeed();
  const scan = store.get('lastScan');
  if (!scan || Date.now() - scan.at > 864e5) { await doScan(); if (location.hash === '' || location.hash === '#/home') route(); }
  const n = await checkFollowed(false);
  if (n && location.hash === '#/watch') route();
})();
