// Feed giornaliero prodotto dalla GitHub Action (data/radar.json). Funzioni pure, testabili.

export const FEED_MAX = 600;

// Unisce il feed precedente con le nuove scansioni conservando firstSeen e tenendo i più recenti.
export function mergeFeed(prev, fresh, now = Date.now()) {
  const map = new Map();
  for (const r of prev?.records || []) map.set(r.key, r);
  let added = 0;
  for (const r of fresh) {
    const old = map.get(r.key);
    if (old) map.set(r.key, { ...r, firstSeen: old.firstSeen || now });
    else { map.set(r.key, { ...r, firstSeen: now }); added++; }
  }
  const records = [...map.values()]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b.firstSeen - a.firstSeen)
    .slice(0, FEED_MAX);
  return { records, added };
}

// Riduce un record per la pubblicazione nel feed (abstract troncato, niente campi inutili).
export function slim(r) {
  return {
    key: r.key, source: r.source, sourceName: r.sourceName, foundIn: r.foundIn, title: r.title,
    authors: (r.authors || []).slice(0, 12), affiliations: (r.affiliations || []).slice(0, 4),
    journal: r.journal, date: r.date, doi: r.doi, pmid: r.pmid, url: r.url,
    abstract: (r.abstract || '').slice(0, 1500), pubTypes: r.pubTypes, isPreprint: r.isPreprint,
    funding: r.funding, cls: r.cls, topic: r.topic,
  };
}

// Incorpora il feed nell'archivio locale senza sovrascrivere i record già presenti.
export function importFeed(archive, feed) {
  let imported = 0;
  for (const r of feed?.records || []) {
    if (!archive[r.key]) { archive[r.key] = r; imported++; }
  }
  return imported;
}
