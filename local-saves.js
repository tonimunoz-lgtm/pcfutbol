// Large saves must not share the tiny localStorage budget with logos/catalogs.
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('pcf-manager-saves', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('games');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
export async function localSave(user, id, data) {
    const db = await openDB();
    try { await new Promise((resolve, reject) => {
        const tx = db.transaction('games', 'readwrite');
        tx.objectStore('games').put(data, JSON.stringify([user, id]));
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
}
export async function localLoad(user, id) {
    const db = await openDB();
    try { return await new Promise((resolve, reject) => {
        const r = db.transaction('games').objectStore('games').get(JSON.stringify([user, id]));
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    }); } finally { db.close(); }
}
export async function localList(user) {
    const db = await openDB();
    try { return await new Promise((resolve, reject) => {
        const out = [], r = db.transaction('games').objectStore('games').openCursor();
        r.onsuccess = () => { const c = r.result; if (!c) return resolve(out);
            if (JSON.parse(c.key)[0] === user) out.push(c.value); c.continue(); };
        r.onerror = () => reject(r.error);
    }); } finally { db.close(); }
}
export async function localDelete(user, id) {
    const db = await openDB();
    try { await new Promise((resolve, reject) => {
        const tx = db.transaction('games', 'readwrite'); tx.objectStore('games').delete(JSON.stringify([user,id]));
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    }); } finally { db.close(); }
}
