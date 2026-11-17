// Scansione giornaliera eseguita da GitHub Action: interroga le fonti, classifica e scrive data/radar.json.
// Uso: node scripts/scan.mjs   (Node 20+)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { searchAll } from '../js/radar.js';
import { ATLAS } from '../js/content.js';
import { DEFAULT_TOPICS } from '../js/radar.js';
import { mergeFeed, slim } from '../js/feed.js';

const OUT = new URL('../data/radar.json', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let prev = null;
try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* prima esecuzione */ }

const topics = [...new Set([...DEFAULT_TOPICS, ...ATLAS.map((a) => a[3])])];
const statuses = {};
const down = new Set();
const fresh = [];
const uniqueKeys = new Set();

for (const topic of topics) {
  const { records, statuses: st } = await searchAll(topic, { limit: 10 });
  for (const [id, s] of Object.entries(st)) {
    const p = statuses[id] || { ok: 0, errors: 0, count: 0 };
    if (s.status === 'ok') { p.ok++; p.count += s.count; } else { p.errors++; p.lastError = s.error; }
    statuses[id] = p;
  }
  for (const r of records) { uniqueKeys.add(r.key); fresh.push(slim({ ...r, topic })); }
  await sleep(400); // cortesia verso le API (NCBI: max ~3 richieste/s senza chiave)
}

for (const [id, s] of Object.entries(statuses)) if (s.ok === 0) down.add(id);

const { records, added } = mergeFeed(prev, fresh);
const out = {
  generatedAt: new Date().toISOString(),
  topics: topics.length,
  analyzed: uniqueKeys.size,
  newCount: added,
  sourcesChecked: Object.values(statuses).filter((s) => s.ok > 0).length,
  sourcesDown: [...down],
  sourceStatus: statuses,
  records,
};
// Se TUTTE le fonti sono irraggiungibili non si sovrascrive nulla e l'esecuzione fallisce in modo visibile.
if (out.sourcesChecked === 0) { console.error('Nessuna fonte raggiungibile: feed non modificato.'); process.exit(1); }
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
console.log(`OK: ${records.length} record, ${added} nuovi, fonti ok: ${out.sourcesChecked}, giù: ${out.sourcesDown.join(',') || 'nessuna'}`);
