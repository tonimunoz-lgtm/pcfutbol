// ui.js - Renderizado y UI  
  
function renderStandingsTable(standings, currentTeam) {  
    const tbody = document.getElementById('standingsTable');  
    if (!tbody) return;  
  
    const sorted = Object.entries(standings).sort((a, b) => {  
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;  
        const dgA = a[1].gf - a[1].gc;  
        const dgB = b[1].gf - b[1].gc;  
        if (dgB !== dgA) return dgB - dgA;  
        return b[1].gf - a[1].gf;  
    });  
  
    tbody.innerHTML = sorted.map(([team, stats], i) => `  
        <tr style="${team === currentTeam ? 'background: rgba(233, 69, 96, 0.2);' : ''}">  
            <td><strong>${i + 1}</strong></td>  
            <td><strong>${team}</strong></td>  
            <td>${stats.pj}</td>  
            <td>${stats.g}</td>  
            <td>${stats.e}</td>  
            <td>${stats.p}</td>  
            <td>${stats.gf}</td>  
            <td>${stats.gc}</td>  
            <td>${stats.gf - stats.gc}</td>  
            <td style="color: #00ff00; font-weight: bold;">${stats.pts}</td>  
        </tr>  
    `).join('');  
}  
  
function renderSquadList(squad, currentTeam) {  
    const list = document.getElementById('squadList');  
    if (!list) return;  
  
    if (!squad || squad.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar!</div>';  
        return;  
    }  
  
    const sorted = squad.sort((a, b) => b.overall - a.overall);  
    list.innerHTML = sorted.map((p, idx) => `  
        <div class="player-card">  
            <div style="flex: 1;">  
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">${idx + 1}. ${p.name}</div>  
                <div style="font-size: 0.85em; color: #999;">  
                    <span>${p.position || 'N/A'}</span> |  
                    <span>${p.age} años</span> |  
                    <span>Nivel ${p.overall}/100</span> |  
                    <span>${p.salary.toLocaleString('es-ES')}€/sem</span> |  
                    <span>${p.matches || 0} partidos</span>  
                </div>  
            </div>  
            <div style="display: flex; gap: 5px;">  
                <!-- Botón de negociar eliminado si no hay funcionalidad, o se deja como placeholder -->  
                <!-- <button class="btn btn-sm" onclick="window.negotiatePlayer('${p.name}')">Negociar</button> -->  
                <button class="btn btn-sm" onclick="window.sellPlayerConfirm('${p.name}')" style="background: #c73446;">Vender</button>  
            </div>  
        </div>  
    `).join('');  
}  
  
function renderAcademyList(academy) {  
    const list = document.getElementById('academyList');  
    if (!list) return;  
  
    if (!academy || academy.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos!</div>';  
        return;  
    }  
  
    list.innerHTML = academy.map((p, idx) => `  
        <div class="player-card">  
            <div style="flex: 1;">  
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">${idx + 1}. ${p.name}</div>  
                <div style="font-size: 0.85em; color: #999;">  
                    Edad ${p.age} |  
                    Nivel ${p.overall}/100 |  
                    Potencial ${p.potential}/100 |  
                    ${p.matches || 0} partidos |  
                    Progreso: ${Math.floor(((p.matches || 0) / 25) * 100)}%  
                </div>  
            </div>  
            <div style="display: flex; gap: 5px;">  
                <button class="btn btn-sm" onclick="window.promoteConfirm('${p.name}')">Ascender</button>  
            </div>  
        </div>  
    `).join('');  
}  
  
function renderAvailablePlayersMarket(players) {  
    const list = document.getElementById('availablePlayersList');  
    if (!list) return;  
    if (!players || players.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">No hay jugadores disponibles en el mercado.</div>';  
        return;  
    }  
  
    list.innerHTML = players.map(p => `  
        <div class="player-card">  
            <div style="flex: 1;">  
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">  
                    ${p.name} ${p.loan ? '(📋 Cesión)' : ''}  
                </div>  
                <div style="font-size: 0.85em; color: #999;">  
                    ${p.position} | ${p.age} años | Nivel ${p.overall}/100 |  
                    Salario: ${p.salary.toLocaleString('es-ES')}€/sem | ${p.loan ? 'Gratis' : 'Coste: ' + p.cost.toLocaleString('es-ES') + '€'}  
                </div>  
            </div>  
            <button class="btn btn-sm" onclick="window.fichPlayerConfirm('${encodeURIComponent(JSON.stringify(p))}')">  
                Fichar${p.loan ? ' (Préstamo)' : ''}  
            </button>  
        </div>  
    `).join('');  
}  
  
function renderAvailableYoungstersMarket(youngsters) {  
    const list = document.getElementById('availableYoungstersList');  
    if (!list) return;  
    if (!youngsters || youngsters.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">No hay jóvenes talentos disponibles.</div>';  
        return;  
    }  
  
    list.innerHTML = youngsters.map(y => `  
        <div class="player-card">  
            <div style="flex: 1;">  
                <div style="color: #e94560; font-weight: bold; margin-bottom: 5px;">${y.name}</div>  
                <div style="font-size: 0.85em; color: #999;">  
                    Edad ${y.age} |  
                    Nivel actual ${y.overall}/100 |  
                    Potencial ${y.potential}/100 |  
                    Coste: ${y.cost.toLocaleString('es-ES')}€  
                </div>  
            </div>  
            <button class="btn btn-sm" onclick="window.fichYoungsterConfirm('${encodeURIComponent(JSON.stringify(y))}')">Contratar</button>  
        </div>  
    `).join('');  
}  
  
function renderNextMatchCard(homeTeam, awayTeam, week) {  
    const matchInfo = document.getElementById('matchInfo');  
    if (!matchInfo) return;  
    matchInfo.innerHTML = `  
        <div style="text-align: center; background: rgba(233, 69, 96, 0.15); border: 2px solid #e94560; padding: 40px; border-radius: 5px; margin: 20px 0;">  
            <div style="color: #e94560; font-size: 1.4em; margin-bottom: 25px; font-weight: bold;">${homeTeam}</div>  
            <div style="color: #999; font-size: 1.2em; margin-bottom: 25px;">⚽ VS ⚽</div>  
            <div style="color: #e94560; font-size: 1.4em; font-weight: bold;">${awayTeam}</div>  
            <div style="color: #999; margin-top: 25px; font-size: 0.95em;">Jornada ${week}</div>  
        </div>  
    `;  
}  
  
function updateDashboardStats(state) {  
    // Actualizar elementos del header  
    document.getElementById('teamName').textContent = state.team || '-';  
    document.getElementById('weekNo').textContent = state.week;  
    document.getElementById('balanceDisplay').textContent = state.balance.toLocaleString('es-ES') + '€';  
  
  
    const teamStats = state.standings[state.team];  
    const sorted = Object.entries(state.standings).sort((a, b) => {  
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;  
        const dgA = a[1].gf - a[1].gc;  
        const dgB = b[1].gf - b[1].gc;  
        if (dgB !== dgA) return dgB - dgA;  
        return b[1].gf - a[1].gf;  
    });  
    const position = sorted.findIndex(([name]) => name === state.team) + 1;  
  
    document.getElementById('dashPos').textContent = position;  
    document.getElementById('dashPts').textContent = teamStats?.pts || 0;  
    document.getElementById('dashPJ').textContent = teamStats?.pj || 0;  
    document.getElementById('dashGoals').textContent = teamStats?.gf || 0;  
    document.getElementById('dashSquad').textContent = state.squad?.length || 0;  
    document.getElementById('dashAcademy').textContent = state.academy?.length || 0;  
    document.getElementById('dashBalance').textContent = state.balance.toLocaleString('es-ES') + '€';  
    document.getElementById('dashIncome').textContent = state.weeklyIncome.toLocaleString('es-ES') + '€';  
    document.getElementById('dashExpenses').textContent = state.weeklyExpenses.toLocaleString('es-ES') + '€';  
  
    const weekly = state.weeklyIncome - state.weeklyExpenses;  
    document.getElementById('dashWeekly').textContent = (weekly >= 0 ? '+' : '') + weekly.toLocaleString('es-ES') + '€';  
    document.getElementById('dashWeekly').className = `data-value ${weekly < 0 ? 'negative' : ''}`;  
  
  
    const warningAlert = document.getElementById('warningAlert');  
    if (warningAlert) {  
        if (weekly < 0) {  
            warningAlert.innerHTML = `  
                <div class="alert alert-warning" style="border-color: #ff3333; background: rgba(255, 51, 51, 0.1); color: #ff3333;">  
                    ⚠️ ATENCIÓN: Tu club está en números rojos (${weekly.toLocaleString('es-ES')}€/semana). Si continúa así, ¡podrías ser destituido!  
                </div>  
            `;  
            warningAlert.style.display = 'block';  
        } else {  
            warningAlert.style.display = 'none';  
        }  
    }  
}  
  
// Refresca toda la UI  
function refreshUI(state) {  
    updateDashboardStats(state);  
    renderStandingsTable(state.standings, state.team);  
    renderSquadList(state.squad, state.team);  
    renderAcademyList(state.academy);  
  
    const rivals = Object.keys(state.standings).filter(t => t !== state.team);  
    const nextRival = rivals.length > 0 ? rivals[Math.floor(Math.random() * rivals.length)] : 'Equipo IA';  
    renderNextMatchCard(state.team, nextRival, state.week);  
}  
  
// Exportar todas las funciones necesarias  
export {  
    renderStandingsTable,  
    renderSquadList,  
    renderAcademyList,  
    renderAvailablePlayersMarket,  
    renderAvailableYoungstersMarket,  
    renderNextMatchCard,  
    updateDashboardStats,  
    refreshUI  
};  
