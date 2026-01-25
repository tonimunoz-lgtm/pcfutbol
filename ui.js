function renderStandingsTable(standings, currentTeam) {
    const tbody=document.getElementById('standingsTable');
    const sorted=Object.entries(standings).sort((a,b)=>b[1].pts!==a[1].pts?b[1].pts-a[1].pts:(b[1].gf-b[1].gc)-(a[1].gf-a[1].gc));
    tbody.innerHTML = sorted.map(([team,stats],i)=>`
        <tr style="${team===currentTeam?'background: rgba(233, 69, 96, 0.2);':''}">
            <td><strong>${i+1}</strong></td>
            <td><strong>${team}</strong></td>
            <td>${stats.pj}</td>
            <td>${stats.g}</td>
            <td>${stats.e}</td>
            <td>${stats.p}</td>
            <td>${stats.gf}</td>
            <td>${stats.gc}</td>
            <td>${stats.gf-stats.gc}</td>
            <td style="color:#00ff00;font-weight:bold;">${stats.pts}</td>
        </tr>`).join('');
}

function renderSquadList(squad,currentTeam){
    const list=document.getElementById('squadList');
    if(!squad || squad.length===0){ list.innerHTML='<div class="alert alert-info">❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar!</div>'; return; }
    const sorted=squad.sort((a,b)=>b.overall-a.overall);
    list.innerHTML=sorted.map((p,idx)=>`
        <div class="player-card">
            <div style="flex:1;">
                <div style="color:#e94560;font-weight:bold;margin-bottom:5px;">${idx+1}. ${p.name}</div>
                <div style="font-size:0.85em;color:#999;">
                    <span>${p.position}</span> | 
                    <span>${p.age} años</span> | 
                    <span>Nivel ${p.overall}/100</span> | 
                    <span>${p.salary}€/sem</span> |
                    <span>${p.matches||0} partidos</span>
                </div>
            </div>
            <div style="display:flex;gap:5px;">
                <button class="btn btn-sm" onclick="window.negotiatePlayer('${p.name}')">Negociar</button>
                <button class="btn btn-sm" onclick="window.sellPlayerConfirm('${p.name}')" style="background:#c73446;">Vender</button>
            </div>
        </div>`).join('');
}

function renderAcademyList(academy){
    const list=document.getElementById('academyList');
    if(!academy || academy.length===0){ list.innerHTML='<div class="alert alert-info">❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos!</div>'; return; }
    list.innerHTML=academy.map((p,idx)=>`
        <div class="player-card">
            <div style="flex:1;">
                <div style="color:#e94560;font-weight:bold;margin-bottom:5px;">${idx+1}. ${p.name}</div>
                <div style="font-size:0.85em;color:#999;">
                    Edad ${p.age} | Nivel ${p.overall} | Potencial ${p.potential} | Partidos ${p.matches}
                </div>
            </div>
            <div style="display:flex;gap:5px;">
                <button class="btn btn-sm" onclick="window.promoteYoungster('${p.name}')">Promocionar</button>
            </div>
        </div>`).join('');
}

function updateDashboardStats(state,standings){
    const balance=state.balance.toFixed(0);
    const weeklyBalance=state.weeklyBalance?.toFixed(0) || 0;
    const weeklyIncome=state.weeklyIncome?.toFixed(0) || 0;
    const weeklyExpenses=state.weeklyExpenses?.toFixed(0) || 0;
    document.getElementById('balance').innerText=`${balance}€`;
    document.getElementById('weeklyIncome').innerText=`${weeklyIncome}€`;
    document.getElementById('weeklyExpenses').innerText=`${weeklyExpenses}€`;
    document.getElementById('weeklyBalance').innerText=`${weeklyBalance}€`;
}

function refreshUI(state,standings){
    updateDashboardStats(state,standings);
    renderStandingsTable(standings,state.team);
    renderSquadList(state.squad,state.team);
    renderAcademyList(state.academy);
}

export { renderStandingsTable, renderSquadList, renderAcademyList, updateDashboardStats, refreshUI };
