// ui.js - Renderizado y UI  
  
import * as gameLogic from './gameLogic.js';  
import { ATTRIBUTES, POSITIONS, STAFF_ROLES, FORMATIONS, PRESEASON_WEEKS } from './config.js';

// ============================================
// 🆕 FUNCIONES PARA SISTEMA DE TARJETAS Y LESIONES
// ============================================

function renderPlayerStatusBadges(player) {
    let badges = '';
    
    if (player.isInjured) {
        badges += `<span class="injured-badge">❌ Lesión (${player.weeksOut}sem)</span>`;
    }
    
    if (player.isSuspended) {
        badges += `<span class="suspended-badge">⛔ SANCIÓN (${player.suspensionWeeks})</span>`;
    }
    
    if (player.redCards > 0) {
        badges += `<span class="red-card-badge">🟥 x${player.redCards}</span>`;
    }
    
    if (player.yellowCards > 0) {
        const isWarning = player.yellowCards >= 4;
        const badgeClass = isWarning ? 'warning-badge' : 'yellow-card-badge';
        badges += `<span class="${badgeClass}">🟨 x${player.yellowCards}${isWarning ? ' ⚠️' : ''}</span>`;
    }
    
    return badges;
}

function applyPlayerStatusClasses(element, player) {
    if (player.isInjured) element.classList.add('injured');
    if (player.isSuspended) element.classList.add('suspended');
}

function getTeamLogo(teamName, size = '25px') {
    const storedData = localStorage.getItem(`team_data_${teamName}`);
    if (storedData) {
        const teamData = JSON.parse(storedData);
        if (teamData.logo) {
            return `<img src="${teamData.logo}" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle; margin-right: 8px; border-radius: 3px;">`;
        }
    }
    return '';
}

function renderStandingsTable(state) {
    const standingsDiv = document.getElementById('standingsTable');
    if (!standingsDiv) return;

    if (!state.standings || Object.keys(state.standings).length === 0) {
        standingsDiv.innerHTML = '<p class="text-center text-gray-500">No hay clasificación disponible</p>';
        return;
    }

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

    const sorted = validStandings.sort((a, b) => {
        const ptsA = a[1].pts || 0;
        const ptsB = b[1].pts || 0;
        if (ptsB !== ptsA) return ptsB - ptsA;

        const gdA = (a[1].gf || 0) - (a[1].gc || 0);
        const gdB = (b[1].gf || 0) - (b[1].gc || 0);
        if (gdB !== gdA) return gdB - gdA;

        return (b[1].gf || 0) - (a[1].gf || 0);
    });

    let html = `
        <table class="standings-table">
            <thead>
                <tr>
                    <th>Pos</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
                    <th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(([team, stats], index) => {
        const isMyTeam = team === state.team;
        const rowClass = isMyTeam ? 'my-team-row' : '';

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

    html += `</tbody></table>`;
    standingsDiv.innerHTML = html;
}

  
function renderSquadList(squad, currentTeam) {
    const list = document.getElementById('squadList');  
    if (!list) return;

    if (!squad || squad.length === 0) {
        list.innerHTML = '<div class="alert alert-info">❌ No hay jugadores en plantilla. ¡Ficha algunos para comenzar!</div>';
        return;
    }

    // Cabecera de la tabla
    let headerHtml = `  
        <div style="overflow-x: auto;">  
            <table style="font-size: 0.8em; min-width: 1200px;">  
                <thead>  
                    <tr>  
                        <th>Nº</th><th>JUGADOR</th><th>OVR</th><th>POT</th><th>EDAD</th><th>POS</th><th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>FORMA</th><th>ESTADO</th><th>TARJETAS</th><th>SALARIO</th><th>VALOR</th><th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  

    // Ordenar por overall descendente
    const sorted = [...squad].sort((a, b) => b.overall - a.overall);
    const squadIndexMap = new Map();
    squad.forEach((p, i) => squadIndexMap.set(p.name, i));

    // Filas de jugadores
    let playersHtml = sorted.map((p, idx) => {
        const realIndex = squadIndexMap.get(p.name);

        // Estado dinámico
        let statusText = '<span style="color: #00ff00;">Apto</span>';
        if (p.isInjured) {
            statusText = `<span style="color: #ff3333; font-weight: bold;">❌ Lesionado (${p.weeksOut} sem)</span>`;
        } else if (p.isSuspended) {
            statusText = `<span style="color: #FF4500; font-weight: bold;">⛔ Sancionado (${p.suspensionWeeks} partidos)</span>`;
        }

        // Tarjetas
        let cardsText = '';
        if (p.yellowCards > 0) {
            const warning = p.yellowCards >= 4 ? ' ⚠️' : '';
            cardsText += `<span style="background:#FFD700;color:#000;padding:2px 6px;border-radius:3px;margin-right:4px;font-size:0.85em;">🟨 x${p.yellowCards}${warning}</span>`;
        }
        if (p.redCards > 0) {
            cardsText += `<span style="background:#C70000;color:#FFF;padding:2px 6px;border-radius:3px;margin-right:4px;font-size:0.85em;">🟥 x${p.redCards}</span>`;
        }
        if (!cardsText) cardsText = '<span style="color: #888;">-</span>';

        // Clase para fila según estado
        const rowClass = p.isInjured ? 'injured' : p.isSuspended ? 'suspended' : '';

        return `
            <tr class="${rowClass}">
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
                <td>${cardsText}</td>
                <td>${p.salary.toLocaleString('es-ES')}€</td>
                <td>${p.value.toLocaleString('es-ES')}€</td>
                <td>
                    <button class="btn btn-sm" ${p.isInjured || p.isSuspended ? 'disabled' : ''}
                        onclick="window.setPlayerTrainingFocusUI(${realIndex}, '${p.name}')">Entrenar</button>
                    <button class="btn btn-sm" style="background:#c73446;" 
                        onclick="window.sellPlayerConfirm('${p.name}')">Vender</button>
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
                        <th>Nº</th><th>JUGADOR</th><th>OVR</th><th>POT</th><th>EDAD</th><th>POS</th><th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>FORMA</th><th>ESTADO</th><th>TARJETAS</th><th>PART.</th><th>SALARIO</th><th>VALOR</th><th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    const sorted = academy.sort((a, b) => b.overall - a.overall);  
    let youngstersHtml = sorted.map((p, idx) => {
        let statusText = '<span style="color: #00ff00;">Apto</span>';
        if (p.isInjured) {
            statusText = `<span style="color: #ff3333; font-weight: bold;">❌ Lesionado (${p.weeksOut} sem)</span>`;
        } else if (p.isSuspended) {
            statusText = `<span style="color: #FF4500; font-weight: bold;">⛔ Sancionado (${p.suspensionWeeks})</span>`;
        }
        
        let cardsText = '';
        if (p.yellowCards > 0) {
            cardsText += `<span style="background:#FFD700;color:#000;padding:2px 6px;border-radius:3px;margin-right:4px;font-size:0.85em;">🟨 x${p.yellowCards}</span>`;
        }
        if (p.redCards > 0) {
            cardsText += `<span style="background:#C70000;color:#FFF;padding:2px 6px;border-radius:3px;margin-right:4px;font-size:0.85em;">🟥 x${p.redCards}</span>`;
        }
        if (!cardsText) cardsText = '<span style="color: #888;">-</span>';
        
        const rowClass = p.isInjured ? 'injured' : p.isSuspended ? 'suspended' : '';
        
        return `  
            <tr class="${rowClass}" style="${p.club === 'Tu Equipo' ? 'background: rgba(233, 69, 96, 0.1);' : ''}">  
                <td>${idx + 1}</td><td>${p.name}</td><td><strong>${p.overall}</strong></td><td>${p.potential}</td>  
                <td>${p.age}</td><td>${p.position || 'N/A'}</td><td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.form || 0}</td><td>${statusText}</td><td>${cardsText}</td><td>${p.matches || 0}</td>  
                <td>${p.salary.toLocaleString('es-ES')}€</td><td>${p.value.toLocaleString('es-ES')}€</td>  
                <td>  
                    <button class="btn btn-sm" ${p.isInjured || p.isSuspended ? 'disabled' : ''} onclick="window.promoteConfirm('${p.name}')">Ascender</button>  
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
                        <th>JUGADOR</th><th>OVR</th><th>POT</th><th>EDAD</th><th>POS</th><th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>CLUB</th><th>TARJETAS</th><th>SALARIO</th><th>VALOR</th><th>PRECIO P.</th><th>ESTADO</th><th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    let playersHtml = players.map((p, idx) => {
        let cardsText = '';
        if (p.yellowCards > 0) {
            cardsText += `<span style="background:#FFD700;color:#000;padding:2px 6px;border-radius:3px;margin-right:4px;font-size:0.85em;">🟨 x${p.yellowCards}</span>`;
        }
        if (p.redCards > 0) {
            cardsText += `<span style="background:#C70000;color:#FFF;padding:2px 6px;border-radius:3px;margin-right:4px;font-size:0.85em;">🟥 x${p.redCards}</span>`;
        }
        if (p.isSuspended) {
            cardsText += `<span style="background:#FF4500;color:#FFF;padding:2px 6px;border-radius:3px;font-size:0.85em;">⛔ SANCIONADO</span>`;
        }
        if (!cardsText) cardsText = '<span style="color: #888;">-</span>';
        
        const estado = p.loanListed ? 'Cedible' : (p.transferListed ? 'Transferible' : 'No Disponible');  
        const askingPrice = p.transferListed ? p.askingPrice.toLocaleString('es-ES') + '€' : '-';  
        
        return `  
            <tr>  
                <td>${p.name}</td><td><strong>${p.overall}</strong></td><td>${p.potential}</td><td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td><td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.club}</td><td>${cardsText}</td><td>${p.salary.toLocaleString('es-ES')}€</td>  
                <td>${p.value.toLocaleString('es-ES')}€</td><td>${askingPrice}</td><td>${estado}</td>  
                <td>  
                    <button class="btn btn-sm" ${!p.transferListed && !p.loanListed ? 'disabled' : ''} onclick="window.startNegotiationUI('${encodeURIComponent(JSON.stringify(p))}')">Negociar</button>  
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
                        <th>JUGADOR</th><th>OVR</th><th>POT</th><th>EDAD</th><th>POS</th><th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>CLUB</th><th>COSTE</th><th>ACCIONES</th>  
                    </tr>  
                </thead>  
                <tbody>  
    `;  
  
    let youngstersHtml = youngsters.map(y => `  
        <tr>  
            <td>${y.name}</td><td><strong>${y.overall}</strong></td><td>${y.potential}</td><td>${y.age}</td>  
            <td>${y.position || 'N/A'}</td><td>${y.foot || 'N/A'}</td>  
            ${ATTRIBUTES.map(attr => `<td>${y[attr] || 0}</td>`).join('')}  
            <td>${y.club}</td><td>${y.cost.toLocaleString('es-ES')}€</td>  
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
  
function renderCalendarPage(state) {  
    const calendarContent = document.getElementById('calendarContent');  
    if (!calendarContent) return;  
  
    const calendar = state.seasonCalendar;
    if (!calendar || calendar.length === 0) {  
        calendarContent.innerHTML = '<div class="alert alert-info">Aún no hay calendario generado para esta temporada.</div>';  
        return;  
    }  
  
    let calendarHtml = '';  
    const numJornadas = state.maxSeasonWeeks;
  
    for (let i = 1; i <= numJornadas; i++) {  
        const jornadaMatches = calendar.filter(match => match.week === i);
  
        if (jornadaMatches.length === 0) continue;
  
        calendarHtml += `  
            <h2 style="color: ${state.week === i ? '#00ff00' : '#e94560'};">Jornada ${i}</h2>  
            <table>  
                <thead>  
                    <tr>  
                        <th>Local</th><th>Visitante</th><th>Resultado</th>  
                    </tr>  
                </thead>  
                <tbody>  
        `;  
        jornadaMatches.forEach(match => {  
            const isOurMatch = match.home === state.team || match.away === state.team;  
            const rowStyle = isOurMatch ? 'background: rgba(233, 69, 96, 0.1); font-weight: bold;' : '';  
  
            const playedMatch = state.matchHistory.find(  
                mh => mh.week === i &&  
                      ((mh.home === match.home && mh.away === match.away) ||  
                       (mh.home === match.away && mh.away === match.home))  
            );  
  
            const score = playedMatch ? playedMatch.score : '-';  
  
            calendarHtml += `  
                <tr style="${rowStyle}">  
                    <td>${match.home}</td><td>${match.away}</td><td>${score}</td>  
                </tr>  
            `;  
        });  
        calendarHtml += `</tbody></table>`;  
    }  
  
    calendarContent.innerHTML = calendarHtml;  
}  
  
  
function refreshUI(state) {
  window.gameLogic.updateSuspensionsAndInjuries?.();  
  updateDashboardStats(state);
    renderStandingsTable(state);
    renderSquadList(state.squad, state.team);
    renderAcademyList(state.academy);
    
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

    if (document.getElementById('lineup') && document.getElementById('lineup').classList.contains('active')) {
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

function renderTeamLogo(teamName, size = '30px') {
    const storedData = localStorage.getItem(`team_data_${teamName}`);
    if (storedData) {
        const teamData = JSON.parse(storedData);
        if (teamData.logo) {
            return `<img src="${teamData.logo}" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle; margin-right: 8px;">`;
        }
    }
    return '';
}

if (typeof window !== 'undefined') {
    window.renderPlayerStatusBadges = renderPlayerStatusBadges;
    window.applyPlayerStatusClasses = applyPlayerStatusClasses;
}

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
    renderCalendarPage,
    renderPlayerStatusBadges,
    applyPlayerStatusClasses
};
