import { packGameState } from './save-codec.js';
self.onmessage=async event=>{
    const {id,state}=event.data;
    try{self.postMessage({id,snapshot:await packGameState(state)});}
    catch(error){self.postMessage({id,error:String(error.message||error)});}
};
