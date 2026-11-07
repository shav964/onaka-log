// IndexedDB の薄いラッパー。データは端末の外に出さない

const NAME = 'harakiroku';
const VERSION = 1;
export const STORES = ['entries', 'dishes', 'foods', 'experiments', 'meta'];

let dbp;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: s === 'meta' ? 'key' : 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const getAll = (store) => tx(store, 'readonly', (s) => s.getAll());
export const put = (store, value) => tx(store, 'readwrite', (s) => s.put(value));
export const del = (store, id) => tx(store, 'readwrite', (s) => s.delete(id));

export async function getMeta(key, fallback) {
  const r = await tx('meta', 'readonly', (s) => s.get(key));
  return r ? r.value : fallback;
}
export const setMeta = (key, value) => put('meta', { key, value });

export async function dumpAll() {
  const out = {};
  for (const s of STORES) out[s] = await getAll(s);
  return out;
}

// バックアップの読み込み。全ストアを一括で置き換える
export async function replaceAll(data) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES, 'readwrite');
    for (const s of STORES) {
      const st = t.objectStore(s);
      st.clear();
      for (const v of data[s] || []) st.put(v);
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
