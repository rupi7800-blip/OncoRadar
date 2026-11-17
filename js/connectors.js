// Connettori reali alle API pubbliche. Ogni connettore restituisce record normalizzati.
// Nessun dato viene inventato: se un campo manca resta vuoto.

const ONCO_TERMS = 'cancer OR tumor OR tumour OR neoplasm OR oncology OR carcinoma';

export async function fetchJson(url, { timeout = 15000, fetchImpl = globalThis.fetch } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const q = encodeURIComponent;

function base(source, sourceName) {
  return { source, sourceName, authors: [], affiliations: [], pubTypes: [], isPreprint: false, abstract: '' };
}

// ---- PubMed (E-utilities): esearch + esummary ----
export async function searchPubMed(query, { limit = 20, oncology = true, ...o } = {}) {
  const term = oncology ? `(${query}) AND (neoplasms[MeSH Terms] OR cancer[tiab] OR tumor[tiab] OR oncology[tiab])` : query;
  const root = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const s = await fetchJson(`${root}esearch.fcgi?db=pubmed&retmode=json&sort=date&retmax=${limit}&term=${q(term)}`, o);
  const ids = s?.esearchresult?.idlist || [];
  if (!ids.length) return [];
  const d = await fetchJson(`${root}esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`, o);
  return ids
    .map((id) => d?.result?.[id])
    .filter(Boolean)
    .map((r) => {
      const doi = (r.articleids || []).find((a) => a.idtype === 'doi')?.value || '';
      return {
        ...base('pubmed', 'PubMed'),
        title: strip(r.title),
        authors: (r.authors || []).map((a) => a.name),
        journal: r.fulljournalname || r.source || '',
        date: r.sortpubdate ? r.sortpubdate.slice(0, 10).replace(/\//g, '-') : r.pubdate || '',
        doi,
        pmid: String(r.uid || id),
        url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid || id}/`,
        pubTypes: r.pubtype || [],
        isPreprint: (r.pubtype || []).some((t) => /preprint/i.test(t)),
      };
    });
}

// ---- Europe PMC (include preprint: source PPR) ----
export async function searchEuropePMC(query, { limit = 20, oncology = true, ...o } = {}) {
  const term = oncology ? `(${query}) AND (${ONCO_TERMS})` : query;
  const d = await fetchJson(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&sort=P_PDATE_D%20desc&pageSize=${limit}&query=${q(term)}`,
    o
  );
  return (d?.resultList?.result || []).map((r) => {
    const preprint = r.source === 'PPR';
    const id = r.pmid || r.id;
    return {
      ...base('europepmc', 'Europe PMC'),
      title: strip(r.title),
      authors: r.authorString ? r.authorString.replace(/\.$/, '').split(/,\s*/) : [],
      affiliations: r.affiliation ? [strip(r.affiliation)] : [],
      journal: r.journalTitle || (r.bookOrReportDetails && r.bookOrReportDetails.publisher) || '',
      date: r.firstPublicationDate || String(r.pubYear || ''),
      doi: r.doi || '',
      pmid: r.pmid || '',
      url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${id}`,
      abstract: strip(r.abstractText),
      pubTypes: r.pubTypeList?.pubType || [],
      isPreprint: preprint,
      funding: (r.grantsList?.grant || []).map((g) => g.agency).filter(Boolean),
    };
  });
}

// ---- OpenAlex ----
function invertedToText(idx) {
  if (!idx) return '';
  const words = [];
  for (const [w, pos] of Object.entries(idx)) for (const p of pos) words[p] = w;
  return words.filter(Boolean).join(' ');
}

export async function searchOpenAlex(query, { limit = 20, oncology = true, ...o } = {}) {
  const term = oncology ? `${query} cancer` : query;
  const d = await fetchJson(
    `https://api.openalex.org/works?search=${q(term)}&sort=publication_date:desc&per-page=${limit}&filter=type:article|review|preprint`,
    o
  );
  return (d?.results || []).map((r) => ({
    ...base('openalex', 'OpenAlex'),
    title: strip(r.title || r.display_name),
    authors: (r.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
    affiliations: [...new Set((r.authorships || []).flatMap((a) => (a.institutions || []).map((i) => i.display_name)))].filter(Boolean),
    journal: r.primary_location?.source?.display_name || '',
    date: r.publication_date || '',
    doi: (r.doi || '').replace('https://doi.org/', ''),
    url: r.doi || r.id,
    abstract: invertedToText(r.abstract_inverted_index),
    pubTypes: r.type ? [r.type] : [],
    isPreprint: r.type === 'preprint' || r.primary_location?.version === 'submittedVersion',
  }));
}

// ---- Crossref (metadati DOI; non filtra per ambito medico, quindi si aggiunge "cancer") ----
export async function searchCrossref(query, { limit = 20, oncology = true, ...o } = {}) {
  const term = oncology ? `${query} cancer` : query;
  const d = await fetchJson(
    `https://api.crossref.org/works?query=${q(term)}&rows=${limit}&sort=issued&order=desc&filter=type:journal-article,type:posted-content`,
    o
  );
  return (d?.message?.items || []).map((r) => {
    const parts = r.issued?.['date-parts']?.[0] || [];
    return {
      ...base('crossref', 'Crossref'),
      title: strip((r.title || [])[0]),
      authors: (r.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ')),
      journal: (r['container-title'] || [])[0] || '',
      date: parts.length ? parts.map((n) => String(n).padStart(2, '0')).join('-').replace(/^(\d{4})-/, '$1-') : '',
      doi: r.DOI || '',
      url: r.URL || (r.DOI ? `https://doi.org/${r.DOI}` : ''),
      abstract: strip(r.abstract),
      pubTypes: r.type ? [r.type] : [],
      isPreprint: r.subtype === 'preprint' || r.type === 'posted-content',
    };
  });
}

// ---- ClinicalTrials.gov v2: studi clinici (struttura diversa dalle pubblicazioni) ----
export async function searchTrials(query, { limit = 20, status = '', phase = '', ...o } = {}) {
  let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${q(query)}&pageSize=${limit}&sort=LastUpdatePostDate:desc&format=json`;
  if (status) url += `&filter.overallStatus=${q(status)}`;
  if (phase) url += `&filter.advanced=${q('AREA[Phase]' + phase)}`;
  const d = await fetchJson(url, o);
  return (d?.studies || []).map((s) => {
    const p = s.protocolSection || {};
    const id = p.identificationModule || {};
    const st = p.statusModule || {};
    const countries = [...new Set((p.contactsLocationsModule?.locations || []).map((l) => l.country).filter(Boolean))];
    return {
      source: 'ctgov',
      sourceName: 'ClinicalTrials.gov',
      id: id.nctId,
      title: id.briefTitle || id.officialTitle || '',
      sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name || '',
      organization: id.organization?.fullName || '',
      countries,
      phases: p.designModule?.phases || [],
      enrollment: p.designModule?.enrollmentInfo?.count ?? null,
      conditions: p.conditionsModule?.conditions || [],
      interventions: (p.armsInterventionsModule?.interventions || []).map((i) => i.name),
      eligibility: strip(p.eligibilityModule?.eligibilityCriteria).slice(0, 600),
      startDate: st.startDateStruct?.date || '',
      status: st.overallStatus || '',
      lastUpdate: st.lastUpdatePostDate || '',
      hasResults: Boolean(s.hasResults),
      url: `https://clinicaltrials.gov/study/${id.nctId}`,
    };
  });
}

// Connettori di pubblicazioni attivi (usati dal Radar).
export const PUBLICATION_CONNECTORS = [
  { id: 'pubmed', fn: searchPubMed },
  { id: 'europepmc', fn: searchEuropePMC },
  { id: 'openalex', fn: searchOpenAlex },
  { id: 'crossref', fn: searchCrossref },
];
