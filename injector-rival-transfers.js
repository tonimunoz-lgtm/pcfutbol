// Real transactions are committed once by gameLogic's world market.
// This panel only reads the saved world and never fabricates transfer news.
(function(){
    'use strict';
    function render(){
        const page=document.getElementById('transfers'),api=window.pcfWorld;
        if(!page||!api)return;
        if(!api.hasWorld())return;
        let panel=document.getElementById('worldMarketPanel');
        if(!panel){panel=document.createElement('details');panel.id='worldMarketPanel';panel.className='data-box';page.appendChild(panel);}
        const opened=panel.open;panel.replaceChildren();panel.open=opened;
        const summary=document.createElement('summary');summary.textContent='Mundo de la partida: clubes y movimientos reales';panel.appendChild(summary);
        const select=document.createElement('select');
        for(const c of api.listClubs()){const option=document.createElement('option');option.value=c.name;option.textContent=c.name;select.appendChild(option);}
        panel.appendChild(select);const clubBox=document.createElement('div');panel.appendChild(clubBox);
        function showClub(){
            const c=api.getClub(select.value);if(!c)return;clubBox.replaceChildren();
            const text=document.createElement('p');text.textContent=`${c.name} · ${c.division} · Caja ${Math.round(c.balance).toLocaleString('es-ES')} € · ${c.squad.length} jugadores`;clubBox.appendChild(text);
            const table=document.createElement('table');const header=document.createElement('tr');
            for(const label of ['Jugador','Posición','Edad','Media','Contrato','Salario semanal']){const th=document.createElement('th');th.textContent=label;header.appendChild(th);}const thead=document.createElement('thead');thead.appendChild(header);table.appendChild(thead);
            const body=document.createElement('tbody');for(const p of c.squad){const row=document.createElement('tr');for(const val of [p.name,p.position,p.age,p.overall,p.contractYears,Math.round(p.salary||0).toLocaleString('es-ES')+' €']){const td=document.createElement('td');td.textContent=val;row.appendChild(td);}body.appendChild(row);}table.appendChild(body);clubBox.appendChild(table);
        }
        select.onchange=showClub;showClub();
        const title=document.createElement('h3');title.textContent='Últimos movimientos registrados';panel.appendChild(title);
        const history=api.getTransfers().slice(-25).reverse();
        if(!history.length){const p=document.createElement('p');p.textContent='Todavía no se han cerrado operaciones en esta partida.';panel.appendChild(p);}
        for(const m of history){const p=document.createElement('p');p.textContent=m.type==='renewal'?`${m.season}, J${m.week}: ${m.to} renueva a ${m.name}.`:`${m.season}, J${m.week}: ${m.name}, ${m.from} → ${m.to} · ${m.type==='loan'?'Cesión':Math.round(m.fee).toLocaleString('es-ES')+' €'}`;panel.appendChild(p);}
    }
    document.addEventListener('click',e=>{if(e.target.closest('[onclick*="transfers"]'))setTimeout(render,100);});
    function install(){if(!window.ui?.refreshUI){setTimeout(install,300);return;}const original=window.ui.refreshUI;window.ui.refreshUI=function(...args){const r=original.apply(this,args);if(document.getElementById('worldMarketPanel'))render();return r;};}
    install();
})();
