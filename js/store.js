// Archivio locale (localStorage) con accesso sempre protetto da try/catch.
const K = 'oncoradar:v1:';

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(K + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(K + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

export const MAX_ARCHIVE = 300;

// Il database interno dell'archivio: record deduplicati, abstract troncati per risparmiare spazio.
export function loadArchive() {
  return store.get('archive', {});
}

export function saveArchive(map) {
  const items = Object.values(map).sort((a, b) => (b.firstSeen || 0) - (a.firstSeen || 0));
  const trimmed = {};
  for (const r of items.slice(0, MAX_ARCHIVE)) trimmed[r.key] = r;
  store.set('archive', trimmed);
  return trimmed;
}
