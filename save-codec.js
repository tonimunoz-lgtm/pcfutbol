// Keep complete career snapshots below Firestore's document limit.
export async function packGameState(state) {
    const json=JSON.stringify(state),bytes=new TextEncoder().encode(json);
    if(bytes.length<180000)return {gameState:state};
    if(typeof CompressionStream!=='undefined'){
        const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
        const packed=new Uint8Array(await new Response(stream).arrayBuffer());
        let binary='';for(let i=0;i<packed.length;i+=16384)binary+=String.fromCharCode(...packed.subarray(i,i+16384));
        const data=btoa(binary);
        return {packedState:{codec:'gzip-base64-v1',data}};
    }
    // Oversized snapshots are split by the cloud persistence layer.
    return {gameState:state};
}
export async function unpackGameData(data) {
    if(!data?.packedState)return data;
    if(data.packedState.codec!=='gzip-base64-v1'||typeof DecompressionStream==='undefined')throw new Error('Este navegador no puede descomprimir la partida.');
    const binary=atob(data.packedState.data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    return {...data,gameState:JSON.parse(text)};
}
