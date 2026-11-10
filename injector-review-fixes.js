// UI actions for the review patch. Persistent data lives in gameState.
(function () {
    'use strict';
    const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    document.addEventListener('click', async e => {
        const button = e.target.closest('.youth-dismiss');
        if (!button) return;
        const name = decodeURIComponent(button.dataset.player);
        const ok = window.pcfConfirm ? await window.pcfConfirm('Despedir canterano', `¿Dar la baja a ${name}? No recibirás ingresos por la salida.`) : confirm(`¿Dar la baja a ${name}?`);
        if (!ok) return;
        const state = window.gameLogic.getViewState();
        state.academy = (state.academy || []).filter(p => p.name !== name);
        window.gameLogic.updateGameState(state);
        window.gameLogic.addNews(`Cantera: ${name} ha recibido la baja.`, 'info');
        window.ui?.refreshUI(state);
    });
    window.negotiateBoardObjective = function(state, rank, count, options = {}) {
        const o=state.boardObjectives;
        const label=target=>target===1?'Ganar la liga':target>=count-1?`Evitar el último puesto: ${target}º o mejor`:
            target>count/2?`Consolidar la categoría: ${target}º o mejor`:`Acabar entre los ${target} primeros`;
        return new Promise(resolve=>{
            const root=document.createElement('div');root.style.cssText='position:fixed;inset:0;z-index:290000;background:#000b;display:grid;place-items:center;padding:20px;overflow:auto';
            const proposed=state.boardTarget,relaxed=Math.min(count-1,proposed+Math.max(1,Math.round(count/10)));
            root.innerHTML=`<section style="max-width:600px;background:#10274a;color:white;padding:24px;border:1px solid #ffd700;border-radius:8px"><h2>${options.joining?'Condiciones antes de firmar':'Acuerdo de temporada'}</h2><p>${esc(state.team)} · ${esc(state.currentSeason)} · Plantilla ${rank}ª de ${count}</p><p><b>${esc(label(proposed))}</b></p><ul><li>Salarios: hasta ${esc(o.wageLimit.toLocaleString('es-ES'))} €/sem.</li><li>Control de deuda: saldo mínimo ${esc(o.cashFloor.toLocaleString('es-ES'))} €.</li>${o.youthMinutes?`<li>Dar ${o.youthMinutes} minutos a jugadores de hasta 21 años.</li>`:''}${o.development?'<li>Mejorar al menos un canterano.</li>':''}${o.copaWins?`<li>Ganar ${o.copaWins} eliminatoria(s) de Copa.</li>`:''}</ul><p id="boardNegotiationResult">La directiva valora el conjunto del proyecto y revisa los objetivos secundarios cada cuatro jornadas.</p><button class="btn" data-action="accept">Aceptar y firmar</button><button class="btn" data-action="counter" ${relaxed===proposed?'disabled':''}>Proponer ${relaxed}º o mejor</button>${options.joining?'<button class="btn" data-action="cancel">Rechazar el contrato</button>':''}<p>La contraoferta rebaja el objetivo liguero, a cambio de reducir el límite salarial un 5% y dar más minutos a jóvenes. La directiva puede rechazarla.</p></section>`;
            const finish=accepted=>{root.remove();resolve(accepted);};
            root.querySelector('[data-action="accept"]').onclick=()=>finish(true);
            root.querySelector('[data-action="cancel"]')?.addEventListener('click',()=>finish(false));
            root.querySelector('[data-action="counter"]').onclick=()=>{
                const button=root.querySelector('[data-action="counter"]');button.disabled=true;
                const chance=Math.max(.35,.85-(relaxed-proposed-1)*.15);
                if(Math.random()<chance){
                    state.boardTarget=relaxed;o.leagueTarget=relaxed;o.negotiated=true;o.wageLimit=Math.round(o.wageLimit*.95);
                    if(o.youthMinutes)o.youthMinutes+=90;
                    state.boardConfidence=Math.max(40,(state.boardConfidence||65)-3);
                    root.querySelector('#boardNegotiationResult').textContent=`Contraoferta aceptada: ${label(relaxed)}. Se aplican las condiciones adicionales. Pulsa Aceptar y firmar para confirmar.`;
                }else root.querySelector('#boardNegotiationResult').textContent='La directiva rechaza la contraoferta y mantiene las condiciones iniciales. Puedes aceptarlas o rechazar el contrato.';
            };
            document.body.appendChild(root);
        });
    };
    function renderGoals(){
        const page=document.getElementById('dashboard'),goals=window.pcfWorld?.getObjectives?.();if(!page||!goals?.length)return;
        let panel=document.getElementById('boardObjectivesPanel');
        if(!panel){panel=document.createElement('section');panel.id='boardObjectivesPanel';panel.className='data-box';page.appendChild(panel);}
        panel.replaceChildren();const title=document.createElement('h3');title.textContent='Objetivos con la directiva';panel.appendChild(title);
        for(const g of goals){const row=document.createElement('p');const mark=document.createElement('span');mark.className='obj-mark '+(g.met?'ok':'pending');mark.textContent=g.met?'\u2713':'';row.appendChild(mark);row.appendChild(document.createTextNode(`${g.label} \u00b7 Actual: ${Math.round(g.value).toLocaleString('es-ES')}`));panel.appendChild(row);}
    }
    function install(){
        if(!window.ui?.refreshUI){setTimeout(install,300);return;}
        const original=window.ui.refreshUI;
        window.ui.refreshUI=function(...args){const result=original.apply(this,args);renderGoals();return result;};
        renderGoals();
    }
    install();
})();
