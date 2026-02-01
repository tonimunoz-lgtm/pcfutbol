// ui.js - Renderizado y UI  
import * as gameLogic from './gameLogic.js';  
import { ATTRIBUTES, POSITIONS, STAFF_ROLES, FORMATIONS, PRESEASON_WEEKS } from './config.js';  
  
// ui.js - Añadir al principio del archivo  
async function getTeamLogo(teamName, size = '25px') {  
    // Usar la función global getTeamData que ya maneja la sincronización con Firebase  
    if (window.getTeamData) {  
        const teamData = await window.getTeamData(teamName);  
        if (teamData && teamData.logo) {  
            return `<img src="${teamData.logo}" alt="${teamName} logo" style="height:${size}; width:${size}; vertical-align: middle; margin-right: 5px;">`;  
        }  
    }  
    // Fallback a localStorage si window.getTeamData no está disponible (ej. durante el inicio)  
    const storedData = localStorage.getItem(`team_data_${teamName}`);  
    if (storedData) {  
        const teamData = JSON.parse(storedData);  
        if (teamData.logo) {  
            return `<img src="${teamData.logo}" alt="${teamName} logo" style="height:${size}; width:${size}; vertical-align: middle; margin-right: 5px;">`;  
        }  
    }  
    return ''; // Sin logo  
}  
  
async function renderStandingsTable(standings, currentTeam) { // Hacer async  
    const tbody = document.getElementById('standingsTable');  
    if (!tbody) return;  
  
    const sorted = Object.entries(standings).sort((a, b) => {  
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;  
        const dgA = a[1].gf - a[1].gc;  
        const dgB = b[1].gf - b[1].gc;  
        if (dgB !== dgA) return dgB - dgA;  
        return b[1].gf - a[1].gf;  
    });  
  
    const rowsPromises = sorted.map(async ([team, stats], i) => { // Usar map con async  
        const logoHtml = await getTeamLogo(team, '25px'); // await para el logo  
        return `  
            <tr>  
                <td><strong>${i + 1}</strong></td>  
                <td>${logoHtml} <strong>${team}</strong></td>  
                <td>${stats.pj}</td>  
                <td>${stats.g}</td>  
                <td>${stats.e}</td>  
                <td>${stats.p}</td>  
                <td>${stats.gf}</td>  
                <td>${stats.gc}</td>  
                <td>${stats.gf - stats.gc}</td>  
                <td>${stats.pts}</td>  
            </tr>  
        `;  
    });  
    tbody.innerHTML = (await Promise.all(rowsPromises)).join(''); // Esperar a todas las promesas  
}  
  
function renderSquadList(squad, currentTeam) {  
    const list = document.getElementById('squadList');  
    if (!list) return;  
  
    if (!squad || squad.length === 0) {  
        list.innerHTML = '<tr><td colspan="20"> ❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar! </td></tr>'; // Corregido: Eliminar caracteres extraños  
        return;  
    }  
  
    let headerHtml = `  
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
    `;  
  
    const sorted = squad.sort((a, b) => b.overall - a.overall);  
    let playersHtml = sorted.map((p, idx) => {  
        const statusText = p.isInjured ? `Les. (${p.weeksOut} sem)` : 'Apto'; // Corregido: Eliminar caracteres extraños  
        return `  
            <tr>  
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
                    <button class="btn btn-sm" onclick="window.openTrainingModal(${squad.indexOf(p)})">Entrenar</button>  
                    <button class="btn btn-sm btn-danger" onclick="window.sellPlayer('${p.name}')">Vender</button>  
                </td>  
            </tr>  
        `;  
    }).join('');  
  
    list.innerHTML = headerHtml + `<tbody>${playersHtml}</tbody>`;  
}  
  
function renderAcademyList(academy) {  
    const list = document.getElementById('academyList');  
    if (!list) return;  
  
    if (!academy || academy.length === 0) {  
        list.innerHTML = '<tr><td colspan="20"> ❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos! </td></tr>'; // Corregido: Eliminar caracteres extraños  
        return;  
    }  
  
    let headerHtml = `  
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
    `;  
  
    const sorted = academy.sort((a, b) => b.overall - a.overall);  
    let youngstersHtml = sorted.map((p, idx) => {  
        const statusText = p.isInjured ? `Les. (${p.weeksOut} sem)` : 'Apto'; // Corregido: Eliminar caracteres extraños  
        return `  
            <tr>  
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
                    <button class="btn btn-sm" onclick="window.promoteYoungster('${p.name}')">Ascender</button>  
                </td>  
            </tr>  
        `;  
    }).join('');  
  
    list.innerHTML = headerHtml + `<tbody>${youngstersHtml}</tbody>`;  
}  
  
function renderPlayerMarketList(players) {  
    const list = document.getElementById('availablePlayersSearchResult');  
    if (!list) return;  
  
    if (!players || players.length === 0) {  
        list.innerHTML = '<tr><td colspan="20"> No se encontraron jugadores que coincidan con los criterios. </td></tr>';  
        return;  
    }  
  
    let headerHtml = `  
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
                    <button class="btn btn-sm btn-primary" onclick="window.startPlayerNegotiation(${JSON.stringify(p).replace(/"/g, '&quot;')})">Negociar</button>  
                </td>  
            </tr>  
        `;  
    }).join('');  
  
    list.innerHTML = headerHtml + `<tbody>${playersHtml}</tbody>`;  
}  
  
function renderAvailableYoungstersMarket(youngsters) {  
    const list = document.getElementById('availableYoungstersList');  
    if (!list) return;  
  
    if (!youngsters || youngsters.length === 0) {  
        list.innerHTML = '<tr><td colspan="20"> No hay jóvenes talentos disponibles. </td></tr>';  
        return;  
    }  
  
    let headerHtml = `  
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
                <button class="btn btn-sm btn-primary" onclick="window.gameLogic.signYoungster(${JSON.stringify(y).replace(/"/g, '&quot;')})">Contratar</button>  
            </td>  
        </tr>  
    `).join('');  
  
    list.innerHTML = headerHtml + `<tbody>${youngstersHtml}</tbody>`;  
}  
  
function renderNextMatchCard(homeTeam, opponentName, week) {  
    const matchInfo = document.getElementById('matchInfo');  
    if (!matchInfo) return;  
  
    const state = gameLogic.getGameState();  
    let matchDisplay = '';  
    if (state.seasonType === 'preseason') {  
        matchDisplay = `  
            <h3>PRETEMPORADA ${state.currentSeason}</h3>  
            <p>Semana ${state.week} de ${PRESEASON_WEEKS}</p>  
            <p>¡A preparar la temporada!</p>  
        `;  
    } else {  
        matchDisplay = `  
            <h3>${state.team} ⚽ VS ⚽ ${opponentName}</h3>  
            <p>Jornada ${state.week} de ${state.maxSeasonWeeks}</p>  
        `;  
    }  
    matchInfo.innerHTML = matchDisplay;  
}  
  
async function updateDashboardStats(state) { // Marcar como async  
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
            warningAlert.innerHTML = ` ⚠️ ATENCIÓN: Tu club está en números rojos (${weekly.toLocaleString('es-ES')}€/semana). Si continúa así, ¡podrías ser destituido! `;  
            warningAlert.style.display = 'block';  
        } else {  
            warningAlert.style.display = 'none';  
        }  
    }  
  
    const newsFeedElem = document.getElementById('newsFeed');  
    if (newsFeedElem) {  
        newsFeedElem.innerHTML = state.newsFeed.map(news => `<p><strong>Semana ${news.week}:</strong> ${news.message}</p>`).join('');  
    }  
  
    const dashButton = document.querySelector('button[onclick="switchPage(\'dashboard\', this)"]');  
    if (dashButton && state.unreadNewsCount > 0) {  
        dashButton.innerHTML = `Dashboard <span class="badge">${state.unreadNewsCount}</span>`;  
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
        calendarContent.innerHTML = '<h3>Aún no hay calendario generado para esta temporada.</h3>';  
        return;  
    }  
  
    let calendarHtml = '';  
    const numJornadas = state.maxSeasonWeeks; // Usar el máximo de semanas definido en el estado  
  
    for (let i = 1; i <= numJornadas; i++) {  
        const jornadaMatches = calendar.filter(match => match.week === i); // Filtra los partidos de la semana 'i'  
        if (jornadaMatches.length === 0) continue; // Si no hay partidos para esta semana, saltar  
  
        calendarHtml += `<h3>Jornada ${i}</h3>`;  
        calendarHtml += `  
            <table class="data-table">  
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
            const playedMatch = state.matchHistory.find( mh => mh.week === i &&  
                ((mh.home === match.home && mh.away === match.away) || (mh.home === match.away && mh.away === match.home))  
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
  
async function refreshUI(state) { // Marcar como async  
    await updateDashboardStats(state); // await  
    await renderStandingsTable(state.standings, state.team); // await  
    renderSquadList(state.squad, state.team);  
    renderAcademyList(state.academy);  
  
    // Actualizar header con logo  
    const teamNameElement = document.getElementById('teamName');  
    if (teamNameElement && state.team) {  
        // Usar la versión asíncrona de getTeamLogo  
        const logoHtml = await getTeamLogo(state.team, '25px');  
        if (logoHtml) {  
            teamNameElement.innerHTML = `${logoHtml} ${state.team}`;  
        } else {  
            teamNameElement.textContent = state.team;  
        }  
    }  
  
    // Actualizar imagen y nombre del estadio en facilities  
    const stadiumImageElement = document.getElementById('stadiumImage');  
    const stadiumNameElement = document.getElementById('stadiumName');  
    const stadiumCapacityElement = document.getElementById('stadiumCapacity');  
  
    if (stadiumImageElement) {  
        stadiumImageElement.src = state.stadiumImage || '';  
        stadiumImageElement.alt = state.stadiumImage ? state.stadiumName : 'No hay imagen del estadio disponible';  
        stadiumImageElement.style.display = state.stadiumImage ? 'block' : 'none';  
    }  
    if (stadiumNameElement) {  
        stadiumNameElement.textContent = state.stadiumName || '-';  
    }  
    if (stadiumCapacityElement) {  
        stadiumCapacityElement.textContent = state.stadiumCapacity.toLocaleString('es-ES');  
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
  
// Función para renderizar logo del equipo  
// Esta función es redundante con getTeamLogo, pero si se usa desde fuera de este módulo, se deja  
async function renderTeamLogo(teamName, size = '30px') { // Marcar como async  
    return await getTeamLogo(teamName, size); // Reutilizar la función principal  
}  
  
  
// Exportaciones  
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
    renderCalendarPage // NEW EXPORT  
};  
