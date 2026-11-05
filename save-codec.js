// Keep complete career snapshots below Firestore's document limit.
async function packAtomic(state,threshold=180000) {
    const json=JSON.stringify(state),bytes=new TextEncoder().encode(json);
    if(bytes.length<threshold)return {gameState:state};
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
async function unpackAtomic(data) {
    if(!data?.packedState)return data;
    if(data.packedState.codec!=='gzip-base64-v1'||typeof DecompressionStream==='undefined')throw new Error('Este navegador no puede descomprimir la partida.');
    const binary=atob(data.packedState.data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    return {...data,gameState:JSON.parse(text)};
}


// Structural blocks preserve calendars and groups of clubs independently.
// Serialization/compression yields between blocks instead of encoding one huge world.
export async function packGameState(state) {
    if(!state.world?.clubs || Array.isArray(state.world.clubs))return packAtomic(state);
    const {world,...local}=state,{clubs,divisions,...worldBase}=world;
    const blocks=[];
    async function add(section,value,name){blocks.push({section,...(name===undefined?{}:{name}),data:await packAtomic(value,4096)});}
    const worldPayload={...worldBase};
    if(Object.hasOwn(world,'divisions'))worldPayload.divisions=divisions && typeof divisions==='object'?{}:divisions;
    await add('state',local);await add('world',worldPayload);
    for(const name of Object.keys(divisions||{}).sort()){
        const {calendar,...base}=divisions[name];await add('division',base,name);
        if(calendar!==undefined)await add('calendar',calendar,name);
    }
    const names=Object.keys(clubs).sort();
    for(let i=0;i<names.length;i+=12)await add('clubs',Object.fromEntries(names.slice(i,i+12).map(n=>[n,clubs[n]])));
    return {stateBlocks:{codec:'structural-v1',blocks}};
}
export async function unpackGameData(data) {
    if(!data?.stateBlocks)return unpackAtomic(data);
    if(data.stateBlocks.codec!=='structural-v1' || !Array.isArray(data.stateBlocks.blocks))throw new Error('Formato de bloques desconocido.');
    let local,world;const divisions={},clubs={};
    const put=(object,key,value)=>Object.defineProperty(object,key,{value,writable:true,enumerable:true,configurable:true});
    for(const block of data.stateBlocks.blocks){
        const decoded=await unpackAtomic(block.data),value=decoded.gameState;
        switch(block.section){
            case 'state':local=value;break;
            case 'world':world=value;break;
            case 'division':put(divisions,block.name,value);break;
            case 'calendar':if(!Object.hasOwn(divisions,block.name))throw new Error('División incompleta.');divisions[block.name].calendar=value;break;
            case 'clubs':for(const [name,club] of Object.entries(value))put(clubs,name,club);break;
            default:throw new Error('Sección de guardado desconocida.');
        }
    }
    if(!local || !world)throw new Error('Guardado incompleto.');
    put(world,'clubs',clubs);if(Object.hasOwn(world,'divisions'))put(world,'divisions',Object.keys(divisions).length?divisions:world.divisions);put(local,'world',world);
    return {...data,gameState:local};
}
