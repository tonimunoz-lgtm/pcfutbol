import { packGameState } from './save-codec.js';
let worker,unavailable=false,sequence=0;
const waiting=new Map();
function stop(error){
    unavailable=true;worker?.terminate();worker=null;
    for(const job of waiting.values()){clearTimeout(job.timer);job.reject(error);}waiting.clear();
}
export async function prepareGameState(state){
    if(unavailable || typeof Worker==='undefined')return packGameState(state);
    try{
        if(!worker){
            worker=new Worker(new URL('./save-worker.js',import.meta.url),{type:'module'});
            worker.onmessage=event=>{
                const job=waiting.get(event.data.id);if(!job)return;
                waiting.delete(event.data.id);clearTimeout(job.timer);
                if(event.data.error)job.reject(new Error(event.data.error));else job.resolve(event.data.snapshot);
            };
            worker.onerror=()=>stop(new Error('Worker de guardado no disponible'));
            worker.onmessageerror=()=>stop(new Error('Respuesta de guardado ilegible'));
        }
        return await new Promise((resolve,reject)=>{
            const id=++sequence,timer=setTimeout(()=>stop(new Error('Tiempo de preparación agotado')),10000);
            waiting.set(id,{resolve,reject,timer});worker.postMessage({id,state});
        });
    }catch(error){
        if(!unavailable)stop(error);
        return packGameState(state); // CSP, browser support and load errors have a complete fallback.
    }
}
