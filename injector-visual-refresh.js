// Presentation only: never changes game state, handlers, IDs or save formats.
(function(){
    'use strict';
    const DIR='assets/modern/';
    const images={
        noticias:'news',podio:'trophy',calendario:'calendar',marcador:'goal',alineacion:'pitch',tactica:'tactics',rival:'search',entrenamiento:'training',fichar:'transfer',negociaciones:'contract',plantilla:'squad',cantera:'academy',empleados:'user',caja:'wallet',estadio:'stadium',entradas:'wallet',
        'seccion-informacion':'info','seccion-equipo':'pitch','seccion-fichajes':'transfer','seccion-gestion':'chart','boton-cargar':'load','boton-guardar':'save','boton-nuevo':'new','boton-seguir':'play','boton-admin':'settings','boton-salir':'logout',
        liga:'trophy',copa:'trophy',playoff:'trophy','europa-maxima':'star','europa-segunda':'trophy','europa-tercera':'shield',ascenso:'up',descenso:'down',
        transferible:'transfer',cedible:'loan',cedido:'loan',libre:'free',lesionado:'medic',sancionado:'card-red',apercibido:'card-yellow',titular:'check','mi-equipo':'shield',nueva:'news',urgente:'warning',forma:'chart',
        'segundo-entrenador':'user',ojeador:'search','entrenador-juveniles':'academy','entrenador-porteros':'goal','entrenador-fisico':'training','secretario-tecnico':'contract',medico:'medic',fisioterapeuta:'medic',analista:'chart',
        'ampliar-5000':'stadium','ampliar-10000':'stadium','iluminacion-led':'light','pantalla-gigante':'video','palcos-vip':'star',restaurantes:'nutrition',aparcamiento:'parking','tienda-oficial':'shop','cesped-hibrido':'pitch',museo:'building',gimnasio:'training','residencia-cantera':'home',nutricion:'nutrition','sala-video':'video','piscina-recuperacion':'water','instalaciones-medicas':'medic',fisioterapia:'medic','campo-entrenamiento':'pitch'
    };
    const emojis={
        '⚽':'ball','🏆':'trophy','🎮':'pitch','☁':'load','💾':'save','📂':'load','🆕':'new','⏩':'play','▶':'play','⏭':'play','⚙':'settings','🚪':'logout',
        '📊':'chart','📈':'chart','📉':'down','📋':'contract','📅':'calendar','📆':'calendar','🎯':'tactics','🔍':'search','🔎':'search','🔄':'transfer','🤝':'handshake',
        '💰':'wallet','💵':'wallet','💶':'wallet','💸':'wallet','🏦':'building','🪙':'wallet','📣':'news','📢':'news','📰':'news','🔔':'news','📨':'message','📩':'message','💬':'message',
        '🏟':'stadium','🏠':'home','🏡':'home','🏗':'building','🔧':'settings','🛠':'settings','🔨':'building','💪':'training','🏋':'training','🌱':'academy','🎓':'academy','👤':'user','👥':'squad','👨':'user','🧑':'user',
        '🧤':'goal','🥅':'goal','👕':'squad','👔':'user','🏥':'medic','🩺':'medic','🤕':'medic','🩹':'medic','🚑':'medic','✅':'check','✔':'check','☑':'check','❌':'close','✖':'close','⚠':'warning','🚨':'warning','⛔':'warning',
        '⭐':'star','🌟':'star','🥇':'trophy','🥈':'trophy','🥉':'trophy','💎':'star','⏱':'clock','🕒':'clock','⏰':'clock','⌛':'clock','📺':'video','🎥':'video','🎬':'video','🎧':'headphones','🏁':'flag','🚩':'flag','🛡':'shield','📄':'document','✍':'contract','📝':'contract','➕':'new','⬆':'up','⬇':'down','🟥':'card-red','🟨':'card-yellow','🟢':'check','🔴':'warning','🔵':'info','📍':'flag','🔓':'free','🔒':'shield'
    };
    const token=/[\p{Extended_Pictographic}\u2705\u274c\u26a0\u2716\u2714\u23e9\u23ed\u2b06\u2b07\u2795](?:\ufe0f|\p{Emoji_Modifier}|\u200d[\p{Extended_Pictographic}\u2640\u2642]\ufe0f?)*/gu;
    const scope='button,h1,h2,h3,h4,summary,label,.section-title,.header-title,.data-label,.alert,.works,.pcf-news-bar,.pcf-summary-view';
    function iconFor(value){return emojis[String(value).replace(/\ufe0f/g,'')]||'info';}
    function assetFor(src){const match=String(src||'').match(/(?:^|\/)assets\/iconos\/(?:[^/]+\/)*([^/?]+)\.(?:webp|png)(?:[?#]|$)/i);return match?DIR+(images[match[1]]||'info')+'.svg':null;}
    // Helpers also allow a host to refresh content inserted outside observed panels.
    window.pcfVisualIconFor=iconFor;window.pcfVisualAssetFor=assetFor;
    function image(img){const replacement=assetFor(img.getAttribute('src'));if(replacement)img.setAttribute('src',replacement);}
    function decorate(text){
        const parent=text.parentElement;
        if(!parent || !parent.closest(scope) || parent.closest('script,style,textarea,option,pre,code,svg,.pcf-symbol'))return;
        const value=text.nodeValue;if(!value)return;
        token.lastIndex=0;const matches=[...value.matchAll(token)];if(!matches.length)return;
        const fragment=document.createDocumentFragment();let offset=0;
        for(const match of matches){
            fragment.appendChild(document.createTextNode(value.slice(offset,match.index)));
            const symbol=document.createElement('span');symbol.className='pcf-symbol';symbol.setAttribute('aria-hidden','true');
            const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('focusable','false');
            const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href',DIR+'sprite.svg#'+iconFor(match[0]));svg.appendChild(use);symbol.appendChild(svg);
            // Keep the original text available to existing UI label/selection code.
            const legacy=document.createElement('span');legacy.className='pcf-legacy-symbol';legacy.textContent=match[0];symbol.appendChild(legacy);fragment.appendChild(symbol);
            offset=match.index+match[0].length;
        }
        fragment.appendChild(document.createTextNode(value.slice(offset)));text.replaceWith(fragment);
        const button=parent.closest('button');
        if(button && !button.hasAttribute('aria-label') && !button.textContent.replace(token,'').trim())button.setAttribute('aria-label',button.title||'Acción');
    }
    function refresh(root=document.body){
        if(!root)return;
        if(root.nodeType===3){decorate(root);return;}
        if(root.matches?.('img'))image(root);
        root.querySelectorAll?.('img').forEach(image);
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),texts=[];let node;
        while((node=walker.nextNode()))texts.push(node);texts.forEach(decorate);
    }
    window.pcfRefreshVisuals=refresh;
    function start(){
        refresh();let scheduled=false;const queued=new Set();
        const observer=new MutationObserver(records=>{
            for(const record of records){
                if(record.type==='attributes')queued.add(record.target);
                else if(record.type==='characterData')queued.add(record.target);
                else for(const node of record.addedNodes)queued.add(node);
            }
            if(scheduled||!queued.size)return;scheduled=true;
            requestAnimationFrame(()=>{
                scheduled=false;observer.disconnect();
                const roots=queued.size>50?[document.body]:[...queued];queued.clear();
                try{for(const root of roots)if(root.isConnected)refresh(root);}finally{observe();}
            });
        });
        const observe=()=>observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src']});observe();
    }
    if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
