// Motore Radar: interroga le fonti in parallelo, registra lo stato di ciascuna, deduplica e classifica.
import { PUBLICATION_CONNECTORS } from './connectors.js';
import { classify } from './classify.js';
import { store, loadArchive, saveArchive } from './store.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function recordKey(r) {
  if (r.doi) return 'doi:' + r.doi.toLowerCase();
  if (r.pmid) return 'pmid:' + r.pmid;
  return 'title:' + norm(r.title).slice(0, 120);
}

// Unisce i duplicati provenienti da fonti diverse mantenendo il record più ricco.
export function dedupe(records) {
  const map = new Map();
  for (const r of records) {
    if (!r.title) continue;
    const key = recordKey(r);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...r, key, foundIn: [r.sourceName] });
      continue;
    }
    const keep = (prev.abstract || '').length >= (r.abstract || '').length ? prev : { ...r, key };
    keep.foundIn = [...new Set([...prev.foundIn, r.sourceName])];
    keep.pmid = keep.pmid || prev.pmid || r.pmid;
    keep.doi = keep.doi || prev.doi || r.doi;
    keep.authors = keep.authors?.length ? keep.authors : prev.authors;
    keep.affiliations = keep.affiliations?.length ? keep.affiliations : prev.affiliations?.length ? prev.affiliations : r.affiliations;
    keep.pubTypes = [...new Set([...(prev.pubTypes || []), ...(r.pubTypes || [])])];
    keep.isPreprint = prev.isPreprint && r.isPreprint;
    keep.funding = [...new Set([...(prev.funding || []), ...(r.funding || [])])];
    map.set(key, keep);
  }
  return [...map.values()];
}

const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

// Ricerca su tutti i connettori attivi. Una fonte che fallisce non blocca le altre.
export async function searchAll(query, opts = {}) {
  const connectors = opts.connectors || PUBLICATION_CONNECTORS;
  const settled = await Promise.allSettled(connectors.map((c) => c.fn(query, opts)));
  const statuses = {};
  const all = [];
  settled.forEach((res, i) => {
    const id = connectors[i].id;
    if (res.status === 'fulfilled') {
      statuses[id] = { status: 'ok', count: res.value.length, at: Date.now() };
      all.push(...res.value);
    } else {
      statuses[id] = { status: 'errore', error: String(res.reason?.message || res.reason), at: Date.now() };
    }
  });
  const records = dedupe(all)
    .map((r) => ({ ...r, cls: classify(r) }))
    .sort(byDateDesc);
  return { records, statuses, rawCount: all.length };
}

// Scansione completa: argomenti seguiti + argomenti predefiniti; aggiorna archivio e statistiche reali.
export async function runScan(topics, opts = {}) {
  const archive = loadArchive();
  const seenBefore = new Set(Object.keys(archive));
  const statuses = {};
  const newByTopic = {};
  let analyzed = 0;
  let newCount = 0;

  for (const topic of topics) {
    const { records, statuses: st } = await searchAll(topic, { limit: 15, ...opts });
    for (const [id, s] of Object.entries(st)) {
      const prev = statuses[id];
      if (!prev || (prev.status === 'ok' && s.status === 'errore')) statuses[id] = s;
      if (prev?.status === 'ok' && s.status === 'ok') statuses[id] = { ...s, count: prev.count + s.count };
    }
    for (const r of records) {
      analyzed++;
      if (!archive[r.key]) {
        archive[r.key] = { ...r, abstract: (r.abstract || '').slice(0, 1500), firstSeen: Date.now(), topic };
        if (!seenBefore.has(r.key)) {
          newCount++;
          (newByTopic[topic] ||= []).push(r.key);
        }
      }
    }
  }

  saveArchive(archive);
  const entries = Object.values(statuses);
  const scan = {
    at: Date.now(),
    sourcesChecked: entries.filter((s) => s.status === 'ok').length,
    sourcesDown: Object.entries(statuses).filter(([, s]) => s.status === 'errore').map(([id, s]) => ({ id, error: s.error })),
    newCount,
    analyzed,
    topics,
  };
  store.set('lastScan', scan);
  store.set('sourceStatus', { ...store.get('sourceStatus', {}), ...statuses });
  return { scan, newByTopic };
}

export const DEFAULT_TOPICS = ['immunotherapy', 'tumor microenvironment', 'circulating tumor DNA', 'tumor metabolism'];
