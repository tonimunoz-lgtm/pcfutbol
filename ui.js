// ui.js - Renderizado y UI  
  
import * as gameLogic from './gameLogic.js';  
import { ATTRIBUTES, POSITIONS, STAFF_ROLES, FORMATIONS, PRESEASON_WEEKS } from './config.js'; // Eliminado SEASON_WEEKS de aquí  
  
// ui.js - Añadir al principio del archivo

function getTeamLogo(teamName, size = '25px') {
    const storedData = localStorage.getItem(`team_data_${teamName}`);
    if (storedData) {
        const teamData = JSON.parse(storedData);
        if (teamData.logo) {
            return `<img src="${teamData.logo}" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle; margin-right: 8px; border-radius: 3px;">`;
        }
    }
    return ''; // Sin logo
}

function renderStandingsTable(state) {
    const standingsDiv = document.getElementById('standingsTable');
    if (!standingsDiv) return;

    // ✅ Validación: verificar que standings exista
    if (!state.standings || Object.keys(state.standings).length === 0) {
        standingsDiv.innerHTML = '<p class="text-center text-gray-500">No hay clasificación disponible</p>';
        return;
    }

    // ✅ Filtrar equipos con datos inválidos
    const validStandings = Object.entries(state.standings)
        .filter(([team, stats]) => {
            if (!stats || stats.pts === undefined) {
                console.warn(`⚠️ Equipo ${team} tiene datos inválidos en standings:`, stats);
                return false;
            }
            return true;
        });

    if (validStandings.length === 0) {
        standingsDiv.innerHTML = '<p class="text-center text-gray-500">Clasificación no disponible</p>';
        return;
    }

    // Ordenar por puntos, diferencia de goles, goles a favor
    const sorted = validStandings.sort((a, b) => {
        const ptsA = a[1].pts || 0;
        const ptsB = b[1].pts || 0;
        if (ptsB !== ptsA) return ptsB - ptsA;

        const gdA = (a[1].gf || 0) - (a[1].gc || 0);
        const gdB = (b[1].gf || 0) - (b[1].gc || 0);
        if (gdB !== gdA) return gdB - gdA;

        return (b[1].gf || 0) - (a[1].gf || 0);
    });

    // Generar HTML de la tabla
    let html = `
        <table class="standings-table">
            <thead>
                <tr>
                    <th>Pos</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>G</th>
                    <th>E</th>
                    <th>P</th>
                    <th>GF</th>
                    <th>GC</th>
                    <th>DG</th>
                    <th>Pts</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(([team, stats], index) => {
        const isMyTeam = team === state.team;
        const rowClass = isMyTeam ? 'my-team-row' : '';

        // Obtener logo del equipo
        let teamLogo = '';
        const storedData = localStorage.getItem(`team_data_${team}`);
        if (storedData) {
            const teamData = JSON.parse(storedData);
            if (teamData.logo) {
                teamLogo = `<img src="${teamData.logo}" style="width:25px; height:25px; object-fit:contain; margin-right:5px;">`;
            }
        }

        html += `
            <tr class="${rowClass}">
                <td>${index + 1}</td>
                <td class="team-name">${teamLogo}${team}</td>
                <td>${stats.pj || 0}</td>
                <td>${stats.g || 0}</td>
                <td>${stats.e || 0}</td>
                <td>${stats.p || 0}</td>
                <td>${stats.gf || 0}</td>
                <td>${stats.gc || 0}</td>
                <td>${(stats.gf || 0) - (stats.gc || 0)}</td>
                <td><strong>${stats.pts || 0}</strong></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    standingsDiv.innerHTML = html;
}



  
// ✅ FUNCIÓN renderSquadList CORREGIDA - REEMPLAZAR COMPLETA en ui.js

function renderSquadList(squad, currentTeam) {  
    const list = document.getElementById('squadList');  
    if (!list) return;  
  
    if (!squad || squad.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar!</div>';  
        return;  
    }  
  
    let headerHtml = `
        <div style="overflow-x: auto;">
            <table style="font-size: 0.8em; min-width: 1400px;">
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
                        <th>CONTRATO</th>
                        <th>DURACIÓN</th>
                        <th>CLÁUSULA</th>
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
        
        // ✅ VALORES CON DEFAULTS
        const contractType = p.contractType || 'owned';
        const contractYears = p.contractYears || 0;
        const releaseClause = p.releaseClause || 0;
        
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
                
                <!-- ✅ COLUMNAS EN ORDEN CORRECTO -->
                <td>
    ${(() => {
        let statusHTML = '';
        
        // Estado de contrato
        if (p.contractType === 'loaned_out') {
            statusHTML += `<span style="color: #9E9E9E;">📤 Cedido a ${p.loanedTo || '?'}</span>`;
        } else if (p.contractType === 'loaned') {
            statusHTML += `<span style="color: #FF9800;">🔄 Cedido</span>`;
        } else {
            statusHTML += `<span style="color: #4CAF50;">✅ Contratado</span>`;
        }
        
        // Indicador de mercado
        if (p.transferListed) {
            statusHTML += `<br><span style="color: #2196F3; font-size: 0.85em;">💰 En venta (${p.askingPrice.toLocaleString('es-ES')}€)</span>`;
        } else if (p.loanListed) {
            statusHTML += `<br><span style="color: #9C27B0; font-size: 0.85em;">🔄 Cedible</span>`;
        }
        
        return statusHTML;
    })()}
</td>
                <td>${contractYears} ${contractYears === 1 ? 'año' : 'años'}</td>
                <td>${releaseClause.toLocaleString('es-ES')}€</td>
                <td>${p.salary.toLocaleString('es-ES')}€</td>  
                <td>${p.value.toLocaleString('es-ES')}€</td>
                

<td style="display: flex; gap: 3px; flex-wrap: nowrap; justify-content: center;">
    ${p.contractType !== 'loaned_out' ? `
        <button class="btn btn-sm" onclick="window.openTrainingModal(${idx})" 
                title="Entrenar" style="padding: 5px 8px;">
            💪
        </button>
    ` : ''}
    
    ${contractType === 'owned' ? `
        ${!p.transferListed && !p.loanListed ? `
            <button class="btn btn-sm" style="background: #FF9800; padding: 5px 8px;" 
                    onclick="window.openSellPlayerModal(${idx})" title="Poner en venta">
                💰
            </button>
        ` : `
            <button class="btn btn-sm" style="background: #9E9E9E; padding: 5px 8px;" 
                    onclick="window.removeFromMarket(${idx})" title="Retirar del mercado">
                ❌
            </button>
        `}
        <button class="btn btn-sm" style="background: #c73446; padding: 5px 8px;" 
                onclick="window.firePlayerConfirm('${p.name}')" title="Despedir">
            🚪
        </button>
    ` : p.contractType === 'loaned_out' ? `
        <span style="color: #9E9E9E; font-size: 0.85em;">📤 Cedido</span>
    ` : `
        <button class="btn btn-sm" style="background: #9E9E9E; padding: 5px 8px;" 
                disabled title="Cedido a nosotros">
            🔒
        </button>
    `}
</td>
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
            <table style="font-size: 0.8em; min-width: 1400px;">  
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
                        <th>CLÁUSULA</th>  
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
        const clauseAmount = p.releaseClause || (p.value * 3);
        
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
                <td style="color: #FF9800; font-weight: bold;">
                    ${clauseAmount.toLocaleString('es-ES')}€
                </td>
                <td>${askingPrice}</td>  
                <td>${estado}</td>  
                <td>  
                    ${p.transferListed || p.loanListed ? `
                        <button class="btn btn-sm" onclick="window.startNegotiationUI('${encodeURIComponent(JSON.stringify(p))}')">  
                            Negociar  
                        </button>
                    ` : `
                        <button class="btn btn-sm" style="background: #FF5722;" 
                                onclick="window.payReleaseClause('${encodeURIComponent(JSON.stringify(p))}')">
                            💰 Cláusula
                        </button>
                    `}
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
                <div style="color: #999; margin-top: 25px; font-size: 0.95em;">Jornada ${state.week} de ${state.maxSeasonWeeks}</div>  
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
// ✅ AÑADIR INFORMACIÓN DE TRANSFERENCIAS
const purchases = state.playerPurchases || 0;
const sales = state.playerSalesIncome || 0;
const compensations = state.playerCompensations || 0;
const transferBalance = sales - purchases - compensations;

const dashPurchasesEl = document.getElementById('dashPurchases');
const dashSalesEl = document.getElementById('dashSales');
const dashCompensationsEl = document.getElementById('dashCompensations');
const dashTransferBalanceEl = document.getElementById('dashTransferBalance');

if (dashPurchasesEl) dashPurchasesEl.textContent = purchases.toLocaleString('es-ES') + '€';
if (dashSalesEl) dashSalesEl.textContent = sales.toLocaleString('es-ES') + '€';
if (dashCompensationsEl) dashCompensationsEl.textContent = compensations.toLocaleString('es-ES') + '€';

if (dashTransferBalanceEl) {
    dashTransferBalanceEl.textContent = (transferBalance >= 0 ? '+' : '') + transferBalance.toLocaleString('es-ES') + '€';
    dashTransferBalanceEl.style.color = transferBalance >= 0 ? '#4CAF50' : '#f44336';
}
  
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
  
// NEW: Función para renderizar la página de calendario (modificada)  
function renderCalendarPage(state) {  
    const calendarContent = document.getElementById('calendarContent');  
    if (!calendarContent) return;  
  
    const calendar = state.seasonCalendar; // Usar directamente el calendario del estado  
    if (!calendar || calendar.length === 0) {  
        calendarContent.innerHTML = '<div class="alert alert-info">Aún no hay calendario generado para esta temporada.</div>';  
        return;  
    }  
  
    let calendarHtml = '';  
    const numJornadas = state.maxSeasonWeeks; // Usar el máximo de semanas definido en el estado  
  
    for (let i = 1; i <= numJornadas; i++) {  
        const jornadaMatches = calendar.filter(match => match.week === i); // Filtra los partidos de la semana 'i'  
  
        if (jornadaMatches.length === 0) continue; // Si no hay partidos para esta semana, saltar  
  
        calendarHtml += `  
            <h2 style="color: ${state.week === i ? '#00ff00' : '#e94560'};">Jornada ${i}</h2>  
            <table>  
                <thead>  
                    <tr>  
                        <th>Local</th>  
                        <th>Visitante</th>  
                        <th>Resultado</th>  
                    </tr>  
                </thead>  
                <tbody>  
        `;  
        jornadaMatches.forEach(match => {  
            const isOurMatch = match.home === state.team || match.away === state.team;  
            const rowStyle = isOurMatch ? 'background: rgba(233, 69, 96, 0.1); font-weight: bold;' : '';  
  
            // Buscar el resultado en el matchHistory  
            const playedMatch = state.matchHistory.find(  
                mh => mh.week === i &&  
                      ((mh.home === match.home && mh.away === match.away) ||  
                       (mh.home === match.away && mh.away === match.home))  
            );  
  
            const score = playedMatch ? playedMatch.score : '-';  
  
            calendarHtml += `  
                <tr style="${rowStyle}">  
                    <td>${match.home}</td>  
                    <td>${match.away}</td>  
                    <td>${score}</td>  
                </tr>  
            `;  
        });  
        calendarHtml += `  
                </tbody>  
            </table>  
        `;  
    }  
  
    calendarContent.innerHTML = calendarHtml;  
}  
  
  
function refreshUI(state) {
    updateDashboardStats(state);
    renderStandingsTable(state.standings, state.team);
    renderSquadList(state.squad, state.team);
    renderAcademyList(state.academy);
    
    // Actualizar header con logo
    const teamNameElement = document.getElementById('teamName');
    if (teamNameElement && state.team) {
        const storedData = localStorage.getItem(`team_data_${state.team}`);
        if (storedData) {
            const teamData = JSON.parse(storedData);
            if (teamData.logo) {
                teamNameElement.innerHTML = `
                    <img src="${teamData.logo}" style="width: 25px; height: 25px; object-fit: contain; vertical-align: middle; margin-right: 5px;">
                    ${state.team}
                `;
            } else {
                teamNameElement.textContent = state.team;
            }
        } else {
            teamNameElement.textContent = state.team;
        }
    }

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


// ✅ AÑADIR NUEVA FUNCIÓN EN ui.js

function renderNegotiationsList(state) {
    const list = document.getElementById('negotiationsSquadList');
    if (!list) return;
    
    if (!state.squad || state.squad.length === 0) {
        list.innerHTML = '<div class="alert alert-info">No hay jugadores en plantilla</div>';
        return;
    }
    
    // Filtrar solo jugadores propios (no cedidos)
    const ownedPlayers = state.squad.filter(p => p.contractType === 'owned');
    
    if (ownedPlayers.length === 0) {
        list.innerHTML = '<div class="alert alert-info">No tienes jugadores propios para renovar</div>';
        return;
    }
    
    // Ordenar por años restantes (urgentes primero)
    const sorted = ownedPlayers.sort((a, b) => a.contractYears - b.contractYears);
    
    let html = `
        <div style="overflow-x: auto;">
            <table style="font-size: 0.9em; min-width: 1000px;">
                <thead>
                    <tr>
                        <th>JUGADOR</th>
                        <th>EDAD</th>
                        <th>POS</th>
                        <th>OVR</th>
                        <th>AÑOS RESTANTES</th>
                        <th>SALARIO</th>
                        <th>CLÁUSULA</th>
                        <th>ACCIÓN</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sorted.forEach((p, idx) => {
        const urgencyColor = p.contractYears <= 1 ? '#ff3333' : 
                           p.contractYears <= 2 ? '#FF9800' : '#4CAF50';
        
        html += `
            <tr style="background: ${p.contractYears <= 1 ? 'rgba(255, 51, 51, 0.1)' : ''};">
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.position}</td>
                <td>${p.overall}</td>
                <td style="color: ${urgencyColor}; font-weight: bold;">
                    ${p.contractYears} ${p.contractYears === 1 ? 'año' : 'años'}
                    ${p.contractYears <= 1 ? '⚠️' : ''}
                </td>
                <td>${p.salary.toLocaleString('es-ES')}€</td>
                <td>${(p.releaseClause || 0).toLocaleString('es-ES')}€</td>
                <td>
                    <button class="btn btn-sm" onclick="window.openRenewalModal(${state.squad.indexOf(p)})">
                        📝 Renovar
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    list.innerHTML = html;
}


// Función para renderizar logo del equipo
function renderTeamLogo(teamName, size = '30px') {
    const storedData = localStorage.getItem(`team_data_${teamName}`);
    if (storedData) {
        const teamData = JSON.parse(storedData);
        if (teamData.logo) {
            return `<img src="${teamData.logo}" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle; margin-right: 8px;">`;
        }
    }
    return ''; // Sin logo
}

window.renderNextMatchInfo = function () {
    const state = gameLogic.getGameState();
    if (!state || !state.nextMatch) return;

    const match = state.nextMatch;

    document.getElementById('nextMatchTeams').textContent =
        `${match.home} vs ${match.away}`;

    document.getElementById('nextMatchDate').textContent =
        `Jornada ${state.week}`;
};


export {  
    renderStandingsTable,
    renderTeamLogo,
    renderSquadList,  
    renderAcademyList,  
    renderPlayerMarketList,  
    renderAvailableYoungstersMarket,  
    renderNextMatchCard,  
    updateDashboardStats,  
    refreshUI,  
    // NEW EXPORT  
    renderCalendarPage,  
    renderNegotiationsList
};  
