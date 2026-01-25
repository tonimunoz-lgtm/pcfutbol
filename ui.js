// ui.js - Renderizado y UI  
  
import * as gameLogic from './gameLogic.js';  
import { ATTRIBUTES, POSITIONS, STAFF_ROLES, FORMATIONS, PRESEASON_WEEKS, SEASON_WEEKS } from './config.js';  
  
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
  
    let headerHtml = `  
        <div style="overflow-x: auto;">  
            <table style="font-size: 0.8em; min-width: 1200px;">  
                <thead>  
                    <tr>  
                        <th>Nº</th>  
                        <th>JUGADOR</th>  
                        <th>OVR</th>  
                        <th>POT</th>  
                        <th>EDAD</th>  
                        <th>POS</th>  
                        <th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>FORMA</th>  
                        <th>ESTADO</th>  
                        <th>SALARIO</th>  
                        <th>VALOR</th>  
                        <th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    const sorted = squad.sort((a, b) => b.overall - a.overall);  
    let playersHtml = sorted.map((p, idx) => {  
        const statusText = p.isInjured ? `<span style="color: #ff3333;">Les. (${p.weeksOut} sem)</span>` : 'Apto';  
        return `  
            <tr style="${p.club === currentTeam ? 'background: rgba(233, 69, 96, 0.1);' : ''}">  
                <td>${idx + 1}</td>  
                <td>${p.name}</td>  
                <td><strong>${p.overall}</strong></td>  
                <td>${p.potential}</td>  
                <td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td>  
                <td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.form || 0}</td>  
                <td>${statusText}</td>  
                <td>${p.salary.toLocaleString('es-ES')}€</td>  
                <td>${p.value.toLocaleString('es-ES')}€</td>  
                <td>  
                    <button class="btn btn-sm" ${p.isInjured ? 'disabled' : ''} onclick="window.setPlayerTrainingFocusUI(${idx}, '${p.name}')">Entrenar</button>  
                    <button class="btn btn-sm" onclick="window.sellPlayerConfirm('${p.name}')" style="background: #c73446;">Vender</button>  
                </td>  
            </tr>  
        `;  
    }).join('');  
  
    list.innerHTML = headerHtml + playersHtml + `</tbody></table></div>`;  
}  
  
function renderAcademyList(academy) {  
    const list = document.getElementById('academyList');  
    if (!list) return;  
  
    if (!academy || academy.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos!</div>';  
        return;  
    }  
  
    let headerHtml = `  
        <div style="overflow-x: auto;">  
            <table style="font-size: 0.8em; min-width: 1200px;">  
                <thead>  
                    <tr>  
                        <th>Nº</th>  
                        <th>JUGADOR</th>  
                        <th>OVR</th>  
                        <th>POT</th>  
                        <th>EDAD</th>  
                        <th>POS</th>  
                        <th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>FORMA</th>  
                        <th>ESTADO</th>  
                        <th>PART.</th>  
                        <th>SALARIO</th>  
                        <th>VALOR</th>  
                        <th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    const sorted = academy.sort((a, b) => b.overall - a.overall);  
    let youngstersHtml = sorted.map((p, idx) => {  
        const statusText = p.isInjured ? `<span style="color: #ff3333;">Les. (${p.weeksOut} sem)</span>` : 'Apto';  
        return `  
            <tr style="${p.club === 'Tu Equipo' ? 'background: rgba(233, 69, 96, 0.1);' : ''}">  
                <td>${idx + 1}</td>  
                <td>${p.name}</td>  
                <td><strong>${p.overall}</strong></td>  
                <td>${p.potential}</td>  
                <td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td>  
                <td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.form || 0}</td>  
                <td>${statusText}</td>  
                <td>${p.matches || 0}</td>  
                <td>${p.salary.toLocaleString('es-ES')}€</td>  
                <td>${p.value.toLocaleString('es-ES')}€</td>  
                <td>  
                    <button class="btn btn-sm" ${p.isInjured ? 'disabled' : ''} onclick="window.promoteConfirm('${p.name}')">Ascender</button>  
                </td>  
            </tr>  
        `;  
    }).join('');  
  
    list.innerHTML = headerHtml + youngstersHtml + `</tbody></table></div>`;  
}  
  
  
function renderPlayerMarketList(players) {  
    const list = document.getElementById('availablePlayersSearchResult');  
    if (!list) return;  
    if (!players || players.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">No se encontraron jugadores que coincidan con los criterios.</div>';  
        return;  
    }  
  
    let headerHtml = `  
        <div style="overflow-x: auto;">  
            <table style="font-size: 0.8em; min-width: 1300px;">  
                <thead>  
                    <tr>  
                        <th>JUGADOR</th>  
                        <th>OVR</th>  
                        <th>POT</th>  
                        <th>EDAD</th>  
                        <th>POS</th>  
                        <th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>CLUB</th>  
                        <th>SALARIO</th>  
                        <th>VALOR</th>  
                        <th>PRECIO P.</th>  
                        <th>ESTADO</th>  
                        <th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    let playersHtml = players.map((p, idx) => {  
        const estado = p.loanListed ? 'Cedible' : (p.transferListed ? 'Transferible' : 'No Disponible');  
        const askingPrice = p.transferListed ? p.askingPrice.toLocaleString('es-ES') + '€' : '-';  
        return `  
            <tr>  
                <td>${p.name}</td>  
                <td><strong>${p.overall}</strong></td>  
                <td>${p.potential}</td>  
                <td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td>  
                <td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.club}</td>  
                <td>${p.salary.toLocaleString('es-ES')}€</td>  
                <td>${p.value.toLocaleString('es-ES')}€</td>  
                <td>${askingPrice}</td>  
                <td>${estado}</td>  
                <td>  
                    <button class="btn btn-sm" ${!p.transferListed && !p.loanListed ? 'disabled' : ''} onclick="window.startNegotiationUI('${encodeURIComponent(JSON.stringify(p))}')">  
                        Negociar  
                    </button>  
                </td>  
            </tr>  
        `;  
    }).join('');  
  
    list.innerHTML = headerHtml + playersHtml + `</tbody></table></div>`;  
}  
  
  
function renderAvailableYoungstersMarket(youngsters) {  
    const list = document.getElementById('availableYoungstersList');  
    if (!list) return;  
    if (!youngsters || youngsters.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">No hay jóvenes talentos disponibles.</div>';  
        return;  
    }  
  
    let headerHtml = `  
        <div style="overflow-x: auto;">  
            <table style="font-size: 0.8em; min-width: 1100px;">  
                <thead>  
                    <tr>  
                        <th>JUGADOR</th>  
                        <th>OVR</th>  
                        <th>POT</th>  
                        <th>EDAD</th>  
                        <th>POS</th>  
                        <th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>CLUB</th>  
                        <th>COSTE</th>  
                        <th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    let youngstersHtml = youngsters.map(y => `  
        <tr>  
            <td>${y.name}</td>  
            <td><strong>${y.overall}</strong></td>  
            <td>${y.potential}</td>  
            <td>${y.age}</td>  
            <td>${y.position || 'N/A'}</td>  
            <td>${y.foot || 'N/A'}</td>  
            ${ATTRIBUTES.map(attr => `<td>${y[attr] || 0}</td>`).join('')}  
            <td>${y.club}</td>  
            <td>${y.cost.toLocaleString('es-ES')}€</td>  
            <td>  
                <button class="btn btn-sm" onclick="window.fichYoungsterConfirm('${encodeURIComponent(JSON.stringify(y))}')">Contratar</button>  
            </td>  
        </tr>  
    `).join('');  
  
    list.innerHTML = headerHtml + youngstersHtml + `</tbody></table></div>`;  
}  
  
  
function renderNextMatchCard(homeTeam, opponentName, week) {  
    const matchInfo = document.getElementById('matchInfo');  
    if (!matchInfo) return;  
    const state = gameLogic.getGameState();  
  
    let matchDisplay = '';  
    if (state.seasonType === 'preseason') {  
        matchDisplay = `  
            <div style="text-align: center; background: rgba(233, 69, 96, 0.15); border: 2px solid #e94560; padding: 40px; border-radius: 5px; margin: 20px 0;">  
                <div style="color: #e94560; font-size: 1.4em; margin-bottom: 25px; font-weight: bold;">PRETEMPORADA ${state.currentSeason}</div>  
                <div style="color: #999; font-size: 1.2em; margin-bottom: 25px;">Semana ${state.week} de ${PRESEASON_WEEKS}</div>  
                <div style="color: #e94560; font-size: 1.4em; font-weight: bold;">¡A preparar la temporada!</div>  
            </div>  
        `;  
    } else {  
        matchDisplay = `  
            <div style="text-align: center; background: rgba(233, 69, 96, 0.15); border: 2px solid #e94560; padding: 40px; border-radius: 5px; margin: 20px 0;">  
                <div style="color: #e94560; font-size: 1.4em; margin-bottom: 25px; font-weight: bold;">${state.team}</div>  
                <div style="color: #999; font-size: 1.2em; margin-bottom: 25px;">⚽ VS ⚽</div>  
                <div style="color: #e94560; font-size: 1.4em; font-weight: bold;">${opponentName}</div>  
                <div style="color: #999; margin-top: 25px; font-size: 0.95em;">Jornada ${state.week} de ${SEASON_WEEKS}</div>  
            </div>  
        `;  
    }  
    matchInfo.innerHTML = matchDisplay;  
}  
  
function updateDashboardStats(state) {  
    document.getElementById('teamName').textContent = state.team || '-';  
    document.getElementById('weekNo').textContent = `${state.week} (${state.currentSeason})`;  
    document.getElementById('balanceDisplay').textContent = state.balance.toLocaleString('es-ES') + '€';  
  
    const teamStats = state.standings[state.team];  
    const sorted = Object.entries(state.standings).sort((a, b) => {  
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;  
        const dgA = a[1].gf - a[1].gc;  
        const dgB = b[1].gf - b[1].gc;  
        if (dgB !== dgA) return dgB - dgA;  
        return b[1].gf - a[1].gf;  
    });  
    const position = teamStats ? sorted.findIndex(([name]) => name === state.team) + 1 : '-';  
  
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
  
    const newsFeedElem = document.getElementById('newsFeed');  
    if (newsFeedElem) {  
        newsFeedElem.innerHTML = state.newsFeed.map(news => `  
            <div class="alert ${news.type === 'error' ? 'alert-error' : news.type === 'warning' ? 'alert-warning' : news.type === 'success' ? 'alert-success' : 'alert-info'}" style="font-size: 0.9em; margin-bottom: 5px;">  
                <strong>Semana ${news.week}:</strong> ${news.message}  
            </div>  
        `).join('');  
    }  
    const dashButton = document.querySelector('button[onclick="switchPage(\'dashboard\', this)"]');  
    if (dashButton && state.unreadNewsCount > 0) {  
        dashButton.innerHTML = `Dashboard <span style="background: #ff3333; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7em;">${state.unreadNewsCount}</span>`;  
    } else if (dashButton) {  
        dashButton.innerHTML = `Dashboard`;  
    }  
  
    const simulateButton = document.getElementById('simulateWeekButton');  
    if (simulateButton) {  
        simulateButton.disabled = false;  
    }  
}  
  
function refreshUI(state) {  
    updateDashboardStats(state);  
    renderStandingsTable(state.standings, state.team);  
    renderSquadList(state.squad, state.team);  
    renderAcademyList(state.academy);  
  
    if (document.getElementById('lineup').classList.contains('active')) {  
        window.renderLineupPageUI();  
    }  
  
    if (state.negotiationStep > 0) {  
        window.updateNegotiationModal();  
    } else {  
        window.closeModal('negotiation');  
    }  
  
    const opponentName = state.nextOpponent || 'Rival Indefinido';  
    renderNextMatchCard(state.team, opponentName, state.week);  
}  
  
export {  
    renderStandingsTable,  
    renderSquadList,  
    renderAcademyList,  
    renderPlayerMarketList,  
    renderAvailableYoungstersMarket,  
    renderNextMatchCard,  
    updateDashboardStats,  
    refreshUI  
};  

