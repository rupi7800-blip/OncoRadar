import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeFeed, slim, importFeed, FEED_MAX } from '../js/feed.js';
import { ATLAS } from '../js/content.js';
import { ATLAS_DETAIL } from '../js/atlas-data.js';

const r = (key, date, extra = {}) => ({ key, date, title: key, ...extra });

test('mergeFeed: conserva firstSeen dei record già noti e conta i nuovi', () => {
  const prev = { records: [r('a', '2026-01-01', { firstSeen: 111 })] };
  const { records, added } = mergeFeed(prev, [r('a', '2026-01-01'), r('b', '2026-02-01')], 999);
  assert.equal(added, 1);
  assert.equal(records.find((x) => x.key === 'a').firstSeen, 111);
  assert.equal(records.find((x) => x.key === 'b').firstSeen, 999);
  assert.equal(records[0].key, 'b'); // più recente per data
});

test('mergeFeed: rispetta il limite massimo', () => {
  const fresh = Array.from({ length: FEED_MAX + 50 }, (_, i) => r('k' + i, '2026-01-01'));
  assert.equal(mergeFeed(null, fresh).records.length, FEED_MAX);
});

test('slim: tronca abstract e autori', () => {
  const s = slim({ key: 'k', title: 't', abstract: 'x'.repeat(5000), authors: Array(50).fill('A') });
  assert.equal(s.abstract.length, 1500);
  assert.equal(s.authors.length, 12);
});

test('importFeed: non sovrascrive i record locali', () => {
  const archive = { a: { key: 'a', title: 'locale' } };
  const n = importFeed(archive, { records: [{ key: 'a', title: 'feed' }, { key: 'b', title: 'nuovo' }] });
  assert.equal(n, 1);
  assert.equal(archive.a.title, 'locale');
  assert.equal(archive.b.title, 'nuovo');
});

test('Atlante: ogni tumore ha una scheda completa', () => {
  for (const [id] of ATLAS) {
    const d = ATLAS_DETAIL[id];
    assert.ok(d, 'manca la scheda ' + id);
    for (const f of ['tissue', 'subtypes', 'risk', 'bio', 'dx', 'staging', 'tx']) assert.ok(d[f] && d[f].length, `${id}.${f} vuoto`);
  }
});
