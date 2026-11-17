// Registro delle fonti. "connector" indica se esiste un connettore realmente implementato.
// Le fonti senza connettore sono elencate onestamente come "non ancora collegate".
export const SOURCES = [
  { id: 'pubmed', name: 'PubMed / MEDLINE', type: 'Letteratura biomedica', reliability: 'Alta (indicizzazione curata NLM)', access: 'API ufficiale NCBI E-utilities', frequency: 'Quotidiana', limits: 'Max ~3 richieste/s senza chiave; solo metadati e riassunto', connector: true },
  { id: 'europepmc', name: 'Europe PMC (incl. PubMed Central, bioRxiv, medRxiv, Research Square)', type: 'Letteratura e preprint', reliability: 'Alta; i preprint sono segnalati come non revisionati', access: 'API REST ufficiale', frequency: 'Quotidiana', limits: 'Testo completo solo per i contenuti open access', connector: true },
  { id: 'openalex', name: 'OpenAlex', type: 'Metadati bibliografici aperti', reliability: 'Media-alta (aggregatore automatico)', access: 'API REST aperta', frequency: 'Continua', limits: 'Possibili errori di attribuzione di autori/istituzioni', connector: true },
  { id: 'crossref', name: 'Crossref', type: 'Metadati DOI', reliability: 'Alta per i DOI, abstract spesso assenti', access: 'API REST aperta', frequency: 'Continua', limits: 'Non filtra per ambito medico: risultati meno pertinenti', connector: true },
  { id: 'ctgov', name: 'ClinicalTrials.gov', type: 'Registro studi clinici', reliability: 'Alta (dati dichiarati dagli sponsor)', access: 'API v2 ufficiale', frequency: 'Quotidiana', limits: 'Un registro non garantisce che il trattamento sia disponibile', connector: true },
  { id: 'cochrane', name: 'Cochrane Library', type: 'Revisioni sistematiche', reliability: 'Molto alta', access: 'Nessuna API libera; solo abstract pubblici via PubMed', frequency: '—', limits: 'Non collegata direttamente (le revisioni compaiono in PubMed)', connector: false },
  { id: 'ictrp', name: 'WHO ICTRP', type: 'Portale registri studi', reliability: 'Alta', access: 'Nessuna API pubblica stabile', frequency: '—', limits: 'Non ancora collegata', connector: false },
  { id: 'ctis', name: 'EU CTIS', type: 'Registro studi UE', reliability: 'Alta', access: 'Nessuna API pubblica documentata', frequency: '—', limits: 'Non ancora collegata', connector: false },
  { id: 'isrctn', name: 'ISRCTN / ANZCTR / JRCT / ChiCTR', type: 'Registri nazionali', reliability: 'Alta', access: 'Raggiungibili in parte via WHO ICTRP', frequency: '—', limits: 'Non ancora collegati', connector: false },
  { id: 'semanticscholar', name: 'Semantic Scholar / CORE / BASE / DOAJ', type: 'Aggregatori accademici', reliability: 'Media', access: 'API con chiave o limiti stretti', frequency: '—', limits: 'Non ancora collegati (valutare chiavi gratuite)', connector: false },
  { id: 'institutions', name: 'NCI, NIH, ESMO, ASCO, EORTC, IARC, WHO, EMA, FDA, AIFA, ISS, AIOM, AIRC', type: 'Istituzioni e linee guida', reliability: 'Alta', access: 'Feed RSS/pagine pubbliche (varia)', frequency: '—', limits: 'Non ancora collegati; NCCN è in gran parte ad accesso riservato', connector: false },
];

export function sourceById(id) {
  return SOURCES.find((s) => s.id === id);
}
