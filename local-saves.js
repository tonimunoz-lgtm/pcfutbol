// Large saves must not share the tiny localStorage budget with logos/catalogs.
const summary=data=>Object.fromEntries(['id','name','team','week','division','lastSaved','baseVersion'].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
function openDB() {
    return new Promise((resolve, reject) => {
        let blocked=false;
        const request = indexedDB.open('pcf-manager-saves', 2);
        request.onupgradeneeded = () => {
            const db=request.result;
            if(!db.objectStoreNames.contains('games'))db.createObjectStore('games');
            if(!db.objectStoreNames.contains('summaries')){
                const summaries=db.createObjectStore('summaries');
                const cursor=request.transaction.objectStore('games').openCursor();
                cursor.onsuccess=()=>{const row=cursor.result;if(row){summaries.put(summary(row.value),row.key);row.continue();}};
            }
        };
        request.onblocked=()=>{blocked=true;reject(new Error('Cierra las pestañas antiguas del juego para actualizar las copias locales.'));};
        request.onsuccess=()=>{
            if(blocked){request.result.close();return;}
            request.result.onversionchange=()=>request.result.close();resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
}
export async function localSave(user, id, data) {
    const db = await openDB();
    try { await new Promise((resolve, reject) => {
        const tx = db.transaction(['games','summaries'], 'readwrite');
        tx.objectStore('games').put(data, JSON.stringify([user, id]));
        tx.objectStore('summaries').put(summary(data),JSON.stringify([user,id]));
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
        const out = [], r = db.transaction('summaries').objectStore('summaries').openCursor();
        r.onsuccess = () => { const c = r.result; if (!c) return resolve(out);
            if (JSON.parse(c.key)[0] === user) out.push(c.value); c.continue(); };
        r.onerror = () => reject(r.error);
    }); } finally { db.close(); }
}
export async function localDelete(user, id) {
    const db = await openDB();
    try { await new Promise((resolve, reject) => {
        const tx = db.transaction(['games','summaries'], 'readwrite'); tx.objectStore('games').delete(JSON.stringify([user,id]));tx.objectStore('summaries').delete(JSON.stringify([user,id]));
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);tx.onabort=()=>reject(tx.error);
    }); } finally { db.close(); }
}
