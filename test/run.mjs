import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPubMed, searchEuropePMC, searchOpenAlex, searchCrossref, searchTrials } from '../js/connectors.js';
import { classify, compare, LEVELS } from '../js/classify.js';
import { dedupe, searchAll } from '../js/radar.js';

const json = (data, ok = true, status = 200) => ({ ok, status, json: async () => data });
const urls = [];
function mockFetch(routes) {
  return async (url) => {
    urls.push(url);
    for (const [frag, data] of routes) if (url.includes(frag)) return data instanceof Error ? Promise.reject(data) : json(data);
    return json({}, false, 404);
  };
}

test('PubMed: esearch + esummary normalizzati', async () => {
  const f = mockFetch([
    ['esearch', { esearchresult: { idlist: ['111', '222'] } }],
    ['esummary', { result: {
      111: { uid: '111', title: 'A <i>phase II</i> trial', authors: [{ name: 'Rossi M' }], fulljournalname: 'J Onc', sortpubdate: '2026/05/01 00:00', pubtype: ['Clinical Trial, Phase II'], articleids: [{ idtype: 'doi', value: '10.1/x' }] },
      222: { uid: '222', title: 'Other', authors: [], source: 'Cancer', pubdate: '2026' } } }],
  ]);
  const r = await searchPubMed('melanoma', { fetchImpl: f });
  assert.equal(r.length, 2);
  assert.equal(r[0].title, 'A phase II trial');
  assert.equal(r[0].doi, '10.1/x');
  assert.equal(r[0].date, '2026-05-01');
  assert.match(urls.find((u) => u.includes('esearch')), /neoplasms%5BMeSH/);
});

test('PubMed: nessun risultato non chiama esummary', async () => {
  let n = 0;
  const f = async (u) => { n++; return json({ esearchresult: { idlist: [] } }); };
  assert.deepEqual(await searchPubMed('zzz', { fetchImpl: f }), []);
  assert.equal(n, 1);
});

test('Europe PMC: preprint riconosciuti', async () => {
  const f = mockFetch([['europepmc', { resultList: { result: [
    { source: 'PPR', id: 'PPR1', title: 'Preprint study', authorString: 'A B, C D.', doi: '10.1/p', abstractText: 'mice xenograft', firstPublicationDate: '2026-06-01', pubTypeList: { pubType: ['Preprint'] } },
    { source: 'MED', id: '9', pmid: '9', title: 'Paper', journalTitle: 'Lancet', pubYear: 2025, grantsList: { grant: [{ agency: 'AIRC' }] } }] } }]]);
  const r = await searchEuropePMC('glioma', { fetchImpl: f });
  assert.equal(r[0].isPreprint, true);
  assert.equal(r[1].isPreprint, false);
  assert.deepEqual(r[1].funding, ['AIRC']);
  assert.deepEqual(r[0].authors, ['A B', 'C D']);
});

test('OpenAlex: abstract ricostruito dall’indice invertito', async () => {
  const f = mockFetch([['openalex', { results: [{ id: 'https://openalex.org/W1', title: 'T', doi: 'https://doi.org/10.2/y', publication_date: '2026-01-02', abstract_inverted_index: { Hello: [0], world: [1] }, authorships: [{ author: { display_name: 'Ann' }, institutions: [{ display_name: 'Uni X' }] }], type: 'article' }] }]]);
  const r = await searchOpenAlex('x', { fetchImpl: f });
  assert.equal(r[0].abstract, 'Hello world');
  assert.equal(r[0].doi, '10.2/y');
  assert.deepEqual(r[0].affiliations, ['Uni X']);
});

test('Crossref: data e autori', async () => {
  const f = mockFetch([['crossref', { message: { items: [{ title: ['T'], DOI: '10.3/z', author: [{ given: 'A', family: 'B' }], issued: { 'date-parts': [[2026, 3, 9]] }, type: 'journal-article' }] } }]]);
  const r = await searchCrossref('x', { fetchImpl: f });
  assert.equal(r[0].date, '2026-03-09');
  assert.deepEqual(r[0].authors, ['A B']);
});

test('ClinicalTrials.gov: campi del registro', async () => {
  const f = mockFetch([['clinicaltrials', { studies: [{ hasResults: true, protocolSection: {
    identificationModule: { nctId: 'NCT01', briefTitle: 'Trial' }, statusModule: { overallStatus: 'RECRUITING', startDateStruct: { date: '2026-01' }, lastUpdatePostDate: '2026-07-01' },
    designModule: { phases: ['PHASE2'], enrollmentInfo: { count: 80 } }, sponsorCollaboratorsModule: { leadSponsor: { name: 'NCI' } },
    contactsLocationsModule: { locations: [{ country: 'Italy' }, { country: 'Italy' }, { country: 'France' }] },
    armsInterventionsModule: { interventions: [{ name: 'DrugX' }] }, eligibilityModule: { eligibilityCriteria: 'Age >= 18' } } }] }]]);
  const [t] = await searchTrials('x', { fetchImpl: f });
  assert.equal(t.id, 'NCT01');
  assert.deepEqual(t.countries, ['Italy', 'France']);
  assert.equal(t.enrollment, 80);
  assert.equal(t.hasResults, true);
  assert.equal(t.url, 'https://clinicaltrials.gov/study/NCT01');
});

test('HTTP errore → eccezione', async () => {
  await assert.rejects(searchCrossref('x', { fetchImpl: async () => json({}, false, 503) }), /HTTP 503/);
});

// ---- Classificazione ----
const rec = (o) => ({ title: '', abstract: 'x'.repeat(10), pubTypes: [], ...o });

test('classify: in vitro/animali ≠ risultati clinici', () => {
  const c = classify(rec({ title: 'Compound X inhibits growth in mice xenograft', abstract: 'In vitro and in mice xenograft models, compound X reduced tumor growth.' }));
  assert.equal(c.level, 'preclinica');
  assert.equal(c.preclinical, true);
  assert.match(c.design, /animale/);
});

test('classify: preprint non supera "preliminare" e viene segnalato', () => {
  const c = classify(rec({ isPreprint: true, pubTypes: ['Meta-Analysis'], abstract: 'A meta-analysis of trials.' }));
  assert.equal(c.level, 'clinica_preliminare');
  assert.ok(c.flags.some((f) => /Preprint/.test(f)));
});

test('classify: meta-analisi → consolidata; senza abstract declassata', () => {
  assert.equal(classify(rec({ pubTypes: ['Meta-Analysis'], abstract: 'Pooled analysis.' })).level, 'consolidata');
  const c = classify(rec({ pubTypes: ['Meta-Analysis'], abstract: '' }));
  assert.equal(c.level, 'clinica_preliminare');
  assert.ok(c.flags.some((f) => /Abstract non disponibile/.test(f)));
});

test('classify: fasi cliniche e RCT', () => {
  assert.match(classify(rec({ pubTypes: ['Clinical Trial, Phase II'] })).design, /fase II/);
  assert.equal(classify(rec({ pubTypes: ['Clinical Trial, Phase II'] })).level, 'clinica_preliminare');
  assert.equal(classify(rec({ pubTypes: ['Randomized Controlled Trial'], title: 'Phase III trial' })).level, 'clinica_significativa');
  assert.match(classify(rec({ title: 'Phase 1 study of X', abstract: 'Phase 1 dose escalation' })).design, /fase I$/);
});

test('classify: osservazionale non implica causalità', () => {
  const c = classify(rec({ abstract: 'A retrospective cohort of patients.' }));
  assert.equal(c.level, 'clinica_preliminare');
  assert.ok(c.reasons.length);
});

test('classify: nessun indicatore → insufficiente, mai inventato', () => {
  const c = classify(rec({ title: 'Untitled', abstract: '' }));
  assert.equal(c.level, 'insufficiente');
  assert.equal(c.sample, null);
});

test('compare: rileva discordanza solo tra studi clinici', () => {
  const mk = (k, abstract) => ({ key: k, abstract, cls: { level: 'clinica_significativa' } });
  const r = compare([mk('a', 'Treatment significantly improved survival.'), mk('b', 'There was no significant difference in survival.')]);
  assert.equal(r.possibleContradiction, true);
  const r2 = compare([{ key: 'c', abstract: 'significantly improved', cls: { level: 'preclinica' } }]);
  assert.equal(r2.clinicalCount, 0);
});

// ---- Radar ----
test('dedupe: stesso DOI da fonti diverse → un record, abstract più ricco, fonti unite', () => {
  const out = dedupe([
    { title: 'Same', doi: '10.1/A', abstract: '', sourceName: 'PubMed', pubTypes: ['Journal Article'], authors: ['X'] },
    { title: 'Same', doi: '10.1/a', abstract: 'Long abstract', sourceName: 'Europe PMC', pubTypes: ['Review'] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].abstract, 'Long abstract');
  assert.deepEqual(out[0].foundIn.sort(), ['Europe PMC', 'PubMed']);
});

test('dedupe: senza DOI né PMID usa il titolo normalizzato', () => {
  assert.equal(dedupe([{ title: 'Hello, World!' }, { title: 'hello world' }]).length, 1);
});

test('searchAll: una fonte che fallisce non blocca le altre e viene segnalata', async () => {
  const ok = async () => [{ title: 'T1', doi: '10.9/q', abstract: 'abs', pubTypes: [], sourceName: 'Ok' }];
  const bad = async () => { throw new Error('HTTP 500'); };
  const r = await searchAll('x', { connectors: [{ id: 'pubmed', fn: ok }, { id: 'crossref', fn: bad }] });
  assert.equal(r.records.length, 1);
  assert.equal(r.statuses.pubmed.status, 'ok');
  assert.equal(r.statuses.crossref.status, 'errore');
  assert.match(r.statuses.crossref.error, /500/);
  assert.ok(r.records[0].cls);
});

test('LEVELS: tutte le classi richieste esistono', () => {
  for (const k of ['consolidata', 'clinica_significativa', 'clinica_preliminare', 'preclinica', 'ipotesi', 'insufficiente', 'contraddittori']) assert.ok(LEVELS[k]);
});

// ---- Regressioni segnalate dall'audit ----

test('classify: "follow-up of 5 years" non è un campione', () => {
  const c = classify(rec({ abstract: 'Median follow-up of 5 years in a retrospective cohort.' }));
  assert.equal(c.sample, null);
  assert.equal(classify(rec({ abstract: 'We enrolled 1,200 patients in a cohort.' })).sample, 1200);
  assert.equal(classify(rec({ abstract: 'Randomized trial, n = 85.' })).sample, 85);
});

test('classify: RCT senza fase né campione ampio non è "significativa"', () => {
  assert.equal(classify(rec({ pubTypes: ['Randomized Controlled Trial'], abstract: 'A small randomized trial.' })).level, 'clinica_preliminare');
  assert.equal(classify(rec({ pubTypes: ['Randomized Controlled Trial'], abstract: 'Randomized trial of 450 patients.' })).level, 'clinica_significativa');
});

test('runScan: una fonte che fallisce solo su un argomento resta operativa; analyzed conta documenti unici', async () => {
  const { runScan: scan } = await import('../js/radar.js');
  let call = 0;
  const flaky = async () => { call++; if (call === 1) throw new Error('HTTP 500'); return [{ title: 'Doc', doi: '10.5/dup', abstract: 'a', pubTypes: [], sourceName: 'S' }]; };
  const { scan: s } = await scan(['t1', 't2', 't3'], { connectors: [{ id: 'pubmed', fn: flaky }] });
  assert.equal(s.sourcesChecked, 1);
  assert.deepEqual(s.sourcesDown, []);
  assert.equal(s.analyzed, 1); // lo stesso documento trovato in 2 argomenti conta una volta
});

// ---- Regressioni dalla revisione finale ----
test('classify: "phase II enzymes" in cell lines è preclinico, non fase II', () => {
  const c = classify(rec({ title: 'Sulforaphane induces phase II detoxifying enzymes in cell lines', abstract: 'In vitro, sulforaphane induces phase II detoxifying enzymes in cultured cells.' }));
  assert.equal(c.level, 'preclinica');
  assert.doesNotMatch(c.design, /fase/);
});

test('classify: "cohort of mice" è animale, non osservazionale', () => {
  const c = classify(rec({ abstract: 'A cohort of mice bearing xenograft tumors was treated.' }));
  assert.equal(c.level, 'preclinica');
  assert.match(c.design, /animale/);
});

test('classify: una vera fase II con pazienti resta clinica', () => {
  const c = classify(rec({ title: 'A phase II trial of X', abstract: 'In this phase II trial, patients were enrolled.' }));
  assert.match(c.design, /fase II/);
  assert.equal(c.level, 'clinica_preliminare');
});

test('PubMed: il tipo "Preprint" viene riconosciuto', async () => {
  const f = mockFetch([
    ['esearch', { esearchresult: { idlist: ['7'] } }],
    ['esummary', { result: { 7: { uid: '7', title: 'NIH preprint', authors: [], pubtype: ['Preprint'], pubdate: '2026' } } }],
  ]);
  assert.equal((await searchPubMed('x', { fetchImpl: f }))[0].isPreprint, true);
});

test('dedupe: se una fonte lo segnala preprint, resta preprint', () => {
  const out = dedupe([
    { title: 'P', doi: '10.7/pp', isPreprint: false, sourceName: 'PubMed' },
    { title: 'P', doi: '10.7/pp', isPreprint: true, sourceName: 'Europe PMC' },
  ]);
  assert.equal(out[0].isPreprint, true);
});
