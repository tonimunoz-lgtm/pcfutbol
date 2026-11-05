// Awaited domain subscribers run in registration order. Re-installing a key
// replaces its listener, so opening/loading a career cannot accumulate hooks.
export function createGameEvents(){
    const topics=new Map();
    return {
        subscribe(topic,key,listener){
            if(!topics.has(topic))topics.set(topic,new Map());
            const listeners=topics.get(topic);listeners.set(key,listener);
            return ()=>{if(listeners.get(key)===listener)listeners.delete(key);};
        },
        async emit(topic,event){for(const listener of [...(topics.get(topic)?.values()||[])])await listener(event);},
        count(topic){return topics.get(topic)?.size||0;}
    };
}
