// Pure helpers: preserve every field, including the persistent world and Unicode.
export function splitSnapshot(snapshot, limit = 180000) {
    if(!Number.isInteger(limit)||limit<2)throw new Error('Tamaño de fragmento inválido.');
    if(snapshot?.stateBlocks?.codec==='structural-v1'){
        const groups=snapshot.stateBlocks.blocks.map(block=>splitSnapshot(block,limit));
        return [JSON.stringify({_pcfBlocks:'structural-v1',counts:groups.map(parts=>parts.length)}),...groups.flat()];
    }
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
    let header;try{header=JSON.parse(chunks[0]);}catch(_){}
    if(header?._pcfBlocks==='structural-v1'){
        if(!Array.isArray(header.counts) || header.counts.some(n=>!Number.isInteger(n)||n<1) || header.counts.reduce((a,b)=>a+b,1)!==chunks.length)throw new Error('Fragmentos de bloques incompletos.');
        let offset=1;const blocks=header.counts.map(n=>{const block=JSON.parse(chunks.slice(offset,offset+n).join(''));offset+=n;return block;});
        return {stateBlocks:{codec:'structural-v1',blocks}};
    }
    return JSON.parse(chunks.join(''));
}
export async function chunkIds(chunks) {
    return Promise.all(chunks.map(async text => {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    }));
}
