// Pure helpers: preserve every field, including the persistent world and Unicode.
export function splitSnapshot(snapshot, limit = 180000) {
    const text = JSON.stringify(snapshot), chunks = [];
    for (let i = 0; i < text.length;) {
        let end = Math.min(i + limit, text.length);
        const code = text.charCodeAt(end - 1);
        if (end < text.length && code >= 0xD800 && code <= 0xDBFF) end--;
        chunks.push(text.slice(i, end)); i = end;
    }
    return chunks;
}
export function joinSnapshot(chunks) {
    if (!chunks.length || chunks.some(c => typeof c !== 'string')) throw new Error('Guardado incompleto: falta un fragmento.');
    return JSON.parse(chunks.join(''));
}
export async function chunkIds(chunks) {
    return Promise.all(chunks.map(async text => {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    }));
}
