export function validateBackup(value) {
    const state=value?.format==='pcf-backup-v1'?value.gameState:null;
    if(!state || typeof state.team!=='string' || !state.team || !Array.isArray(state.squad) || !Array.isArray(state.academy) || !Number.isInteger(state.week) || state.week<1)
        throw new Error('El archivo no es una copia válida de PC Fútbol.');
    function check(node,depth=0){
        if(depth>80)throw new Error('La copia contiene una estructura demasiado profunda.');
        if(!node || typeof node!=='object')return;
        for(const key of Object.keys(node)){
            if(['__proto__','constructor','prototype'].includes(key))throw new Error('La copia contiene campos no permitidos.');
            check(node[key],depth+1);
        }
    }
    check(state);
    return state;
}
