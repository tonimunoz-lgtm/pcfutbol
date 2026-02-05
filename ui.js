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

// teamData.js - Base de datos de equipos con datos reales
const TEAM_CUSTOM_DATA = {
    // Primera División
    'Real Madrid': {
        logo: null, // Se cargará desde localStorage o se subirá
        stadiumImage: null,
        stadiumCapacity: 81044,
        initialBudget: 80000000,
        stadiumName: 'Santiago Bernabéu'
    },
    'FC Barcelona': {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 99354,
        initialBudget: 75000000,
        stadiumName: 'Spotify Camp Nou'
    },
    'Atlético Madrid': {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 70460,
        initialBudget: 50000000,
        stadiumName: 'Cívitas Metropolitano'
    },
    // ... Añade más equipos según necesites
};

// Función para obtener datos del equipo (con fallback a localStorage)
function getTeamData(teamName) {
    const storedData = localStorage.getItem(`team_data_${teamName}`);
    if (storedData) {
        return JSON.parse(storedData);
    }
    return TEAM_CUSTOM_DATA[teamName] || {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 10000,
        initialBudget: 5000000,
        stadiumName: 'Estadio Municipal'
    };
}

// Función para guardar datos del equipo
function saveTeamData(teamName, data) {
    localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));
}

// Función para cargar todos los datos de equipos desde localStorage
function loadAllTeamData() {
    const allData = {};
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('team_data_')) {
            const teamName = key.replace('team_data_', '');
            allData[teamName] = JSON.parse(localStorage.getItem(key));
        }
    });
    return allData;
}

export { TEAM_CUSTOM_DATA, getTeamData, saveTeamData, loadAllTeamData };

/* -- General Styling -- */  
@font-face {  
    font-family: 'PC-Futbol-Retro'; /* Nombre de la fuente si tienes una específica */  
    /* src: url('path/to/your/font.ttf') format('truetype'); */  
    /* font-weight: normal; */  
    /* font-style: normal; */  
}  
  
* {   
    margin: 0;   
    padding: 0;   
    box-sizing: border-box;   
    font-family: 'PC-Futbol-Retro', Arial, sans-serif; /* Usar la fuente retro o Arial como fallback */  
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7); /* Sombra de texto para mejor visibilidad */  
}  
  
body {  
    background: linear-gradient(180deg, #1A3E6F 0%, #0F2040 100%); /* Degradado de fondo más oscuro y azulado */  
    color: #E0E0E0; /* Color de texto general más claro */  
    min-height: 100vh;  
    overflow: hidden; /* Evitar scroll principal para el diseño de 4 cuadrantes */  
    display: flex;  
    flex-direction: column;  
    justify-content: space-between;  
    align-items: center;  
    position: relative; /* Para posicionar el header y el main-layout */  
}  

/* ============================================
   HEADER - Barra superior con info del equipo
   ============================================ */
.header {
    width: 100%;
    height: 60px;
    background: linear-gradient(90deg, #0F2040 0%, #1A3E6F 100%);
    border-bottom: 2px solid #5588FF;
    padding: 5px 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 100;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
    font-size: 0.9em;
}

.header-title {
    font-size: 1.8em;
    font-weight: bold;
    color: #FFD700;
    letter-spacing: 2px;
    text-align: center;
    text-transform: uppercase;
    flex-grow: 1;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 100%;
}

.info-box {
    background-color: rgba(58, 102, 176, 0.5);
    border: 1px solid #5588FF;
    padding: 5px 10px;
    border-radius: 3px;
    text-align: center;
    font-size: 0.75em;
    color: #FFF;
}

.info-box span {
    display: block;
    line-height: 1.2;
}

.team-logo-header {
    width: 40px;
    height: 40px;
    border: 1px solid #5588FF;
    border-radius: 50%;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
    object-fit: contain;
    background-color: #FFF;
    padding: 2px;
}

/* ============================================
   MAIN LAYOUT - Diseño de 4 cuadrantes
   ============================================ */
/* ===== Cuadrantes principales ===== */
.main-layout {
    position: relative;
    width: 100%;
    max-width: 1200px;
    height: calc(100vh - 60px);
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0;
    overflow: hidden;
    margin: auto;
}

.quadrant {
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid #224488;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    overflow-y: auto;
    box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.6);
}

/* Gradientes y bordes de cada cuadrante */
.quadrant.top-left {
    background: linear-gradient(135deg, rgba(30, 80, 150, 0.6) 0%, rgba(15, 30, 60, 0.6) 100%);
    border-bottom: none;
    border-right: none;
    justify-content: flex-start; /* contenido arriba */
}

.quadrant.top-right {
    background: linear-gradient(-135deg, rgba(30, 80, 150, 0.6) 0%, rgba(15, 30, 60, 0.6) 100%);
    border-bottom: none;
    border-left: none;
    justify-content: flex-start;
}

.quadrant.bottom-left {
    background: linear-gradient(-135deg, rgba(15, 30, 60, 0.6) 0%, rgba(30, 80, 150, 0.6) 100%);
    border-top: none;
    border-right: none;
    display: flex;
    flex-direction: column-reverse; /* Crece de abajo hacia arriba */
    justify-content: flex-start;    /* empieza desde el fondo */
}

.quadrant.bottom-right {
    background: linear-gradient(135deg, rgba(15, 30, 60, 0.6) 0%, rgba(30, 80, 150, 0.6) 100%);
    border-top: none;
    border-left: none;
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-start;
}

/* Títulos de sección */
.section-title {
    font-size: 1.2em;
    font-weight: bold;
    color: #FFD700;
    text-transform: uppercase;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 3px;
    border: 1px solid #5588FF;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    width: 100%;
    text-align: center;
    margin-top: 10px; /* espacio entre botones y título */
}

/* Botones dentro de los cuadrantes */
.quadrant .menu-button {
    width: 80%;
    margin-bottom: 10px;
}

/* ============================================
   Contenedor interno para los botones
   ============================================ */
.quadrant-content {
    margin-top: 20px; /* separa botones del título */
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* Ajuste opcional: si quieres margen entre cada botón */
.quadrant-content .menu-button {
    margin-top: 10px;
}


/* ============================================
   CÍRCULO CENTRAL - Simulación y opciones
   ============================================ */
.main-center-circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: linear-gradient(45deg, #3A66B0 0%, #1A3E6F 100%);
    border: 3px solid #5588FF;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
    z-index: 50;
}

.center-option {
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid #5588FF;
    padding: 8px 15px;
    border-radius: 5px;
    color: #FFF;
    width: 80%;
    text-align: center;
    font-size: 0.9em;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.center-option:hover {
    background-color: rgba(0, 0, 0, 0.6);
    border-color: #FFD700;
}

.center-option.simulate-btn {
    background-color: #8BC34A;
    font-weight: bold;
    color: #000;
    border-color: #FFD700;
}

.center-option.save-btn {
    background-color: #3A66B0;
    font-weight: bold;
    color: #FFD700;
}

.center-option.exit-btn {
    background-color: #920300;
    font-weight: bold;
    color: #FFF;
}

.main-ball-decoration {
    width: 50px;
    height: 50px;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="%238BC34A" d="M504 256c0 136.974-111.026 248-248 248S8 392.974 8 256 119.026 8 256 8s248 111.026 248 248zM192.83 361.35C167.92 386.25 128 357.7 128 322.61V222.84l71.43 14.29c-6.68 13.97-10.6 29.58-10.6 46.12 0 16.54 3.92 32.15 10.6 46.12zm128 0c6.68-13.97 10.6-29.58 10.6-46.12 0-16.54-3.92-32.15-10.6-46.12L384 222.84v99.77c0 35.09-39.92 63.64-64.83 38.74zM256 368c-24.58 0-47.78-7.92-67.28-21.43L256 269.43l67.28 77.14C303.78 360.08 280.58 368 256 368zM64 256c0-23.75 6.94-46.06 19.3-65.26L160 216c-3.13 13.9-5 28.53-5 43.6s1.88 29.7 5 43.6l-76.7 25.26C70.94 302.06 64 279.75 64 256zm384 0c0 23.75-6.94 46.06-19.3 65.26L352 296c3.13-13.9 5-28.53 5-43.6s-1.88-29.7-5-43.6l76.7-25.26C441.06 209.94 448 232.25 448 256zM256 144c-16.54 0-32.15 3.92-46.12 10.6L144 192h23l89-102.86V144zM167.28 144c19.5-13.51 42.7-21.43 67.28-21.43s47.78 7.92 67.28 21.43L256 242.57 188.72 165.43zM344.83 154.65c24.91-24.9 64.83 3.65 64.83 38.74v99.77l-71.43-14.29c6.68-13.97 10.6-29.58 10.6-46.12 0-16.54-3.92-32.15-10.6-46.12z" /></svg>') no-repeat center center;
    background-size: contain;
    position: absolute;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    filter: drop-shadow(0 0 5px rgba(0,0,0,0.8));
    z-index: 10;
}

/* ============================================
   BOTONES DE MENÚ - En los cuadrantes
   ============================================ */
.menu-button {
    background-color: #3A66B0;
    color: #FFF;
    border: 1px solid #5588FF;
    padding: 8px 15px;
    margin: 5px 0;
    width: 80%;
    text-align: left;
    font-size: 0.95em;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 5px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
    transition: all 0.1s ease;
    position: relative;
    padding-left: 50px;
    line-height: 24px;
}

.menu-button:hover {
    transform: translateY(-1px);
    box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.7);
    border-color: #FFD700;
}

.menu-button.green-button { background-color: #588F27; border-color: #8BC34A; }
.menu-button.green-button:hover { background-color: #72B739; }
.menu-button.blue-button { background-color: #3A66B0; border-color: #5588FF; }
.menu-button.blue-button:hover { background-color: #4D81D1; }
.menu-button.red-button { background-color: #920300; border-color: #C70000; }
.menu-button.red-button:hover { background-color: #D30000; }
.menu-button.orange-button { background-color: #E27200; border-color: #FF9800; }
.menu-button.orange-button:hover { background-color: #FF8000; }

/* Iconos para los botones */
.menu-button::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    background-size: contain;
    background-repeat: no-repeat;
    filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.5));
}

.results-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.classification-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="%23FFFFFF" d="M0 64C0 46.3 14.3 32 32 32H416c17.7 0 32 14.3 32 32V96c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V64zM160 160c17.7 0 32 14.3 32 32V480c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V192c0-17.7 14.3-32 32-32H160zM416 160H256c-17.7 0-32 14.3-32 32V480c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zM336 240a24 24 0 1 0 0-48 24 24 0 1 0 0 48zm0 96a24 24 0 1 0 0-48 24 24 0 1 0 0 48zm0 96a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/></svg>'); }
.calendar-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="%23FFFFFF" d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h32c17.7 0 32 14.3 32 32v48H0V96c0-17.7 14.3-32 32-32H64V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64H128zm320 160H0V480c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32V160z"/></svg>'); }
.lineup-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.tactics-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.transfer-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="%23FFFFFF" d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h32c17.7 0 32 14.3 32 32v48H0V96c0-17.7 14.3-32 32-32H64V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64H128zm320 160H0V480c0 17.7 14.3 32 32 32H416c17.7 0 32-14.3 32-32V160z"/></svg>'); }
.squad-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.staff-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.cash-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.decisions-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }
.stadium-icon::before { background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="%23FFFFFF" d="M144 0a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM0 320a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm144 160a32 32 0 1 0 0 64 32 32 0 1 0 0-64zM240 0h320c26.5 0 48 21.5 48 48v416c0 26.5-21.5 48-48 48H240c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zm80 432c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16zm0-128c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H336c-8.8 0-16-7.2-16-16z"/></svg>'); }

/* ============================================
   PÁGINAS DE CONTENIDO - Pantallas secundarias
   ============================================ */
.page {
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    width: 100%;
    height: calc(100vh - 60px);
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 80;
    padding: 30px;
    overflow-y: auto;
}

.page.active {
    display: block;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #5588FF;
}

.page-close-btn {
    background: #920300;
    color: #FFF;
    border: 1px solid #C70000;
    padding: 8px 15px;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
    text-transform: uppercase;
    transition: all 0.2s;
}

.page-close-btn:hover {
    background: #D30000;
    border-color: #FFD700;
}

/* ============================================
   ELEMENTOS COMUNES DE UI
   ============================================ */
h1 {
    color: #FFD700;
    font-size: 1.8em;
    margin-bottom: 20px;
    padding-bottom: 10px;
}

h2 {
    color: #5588FF;
    font-size: 1.3em;
    margin: 20px 0 10px 0;
}

.data-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin: 15px 0;
}

.data-box {
    background: rgba(58, 102, 176, 0.2);
    border: 1px solid #5588FF;
    padding: 15px;
    border-radius: 3px;
    text-align: center;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
}

.data-label {
    color: #BBB;
    font-size: 0.8em;
    margin-bottom: 8px;
}

.data-value {
    font-size: 1.8em;
    font-weight: bold;
    color: #8BC34A;
}

.data-value.negative {
    color: #C70000;
}

/* Tablas */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    background: rgba(0,0,0,0.3);
    border: 1px solid #5588FF;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

th {
    padding: 12px;
    text-align: left;
    color: #FFD700;
    background: rgba(58, 102, 176, 0.4);
    font-weight: bold;
    border: 1px solid rgba(85, 136, 255, 0.5);
}

td {
    padding: 10px;
    border: 1px solid rgba(85, 136, 255, 0.2);
    background-color: rgba(0, 0, 0, 0.2);
}

tr:nth-child(even) td {
    background-color: rgba(0, 0, 0, 0.1);
}

tr:hover {
    background: rgba(85, 136, 255, 0.1);
}

/* Botones */
.btn {
    background: linear-gradient(180deg, #5588FF 0%, #3A66B0 100%);
    color: white;
    padding: 10px 20px;
    border: 1px solid #8BC34A;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
    margin: 5px 5px 5px 0;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
    text-transform: uppercase;
}

.btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #8BC34A 0%, #588F27 100%);
    transform: translateY(-1px);
    box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.7);
    border-color: #FFD700;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 0.85em;
    border-width: 1px;
}

/* Inputs */
input, select {
    width: 100%;
    padding: 10px;
    background: rgba(0,0,0,0.5);
    border: 1px solid #5588FF;
    color: #FFF;
    border-radius: 3px;
    margin-bottom: 10px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3);
}

input:focus, select:focus {
    outline: none;
    border-color: #FFD700;
    box-shadow: inset 0 0 8px rgba(255, 215, 0, 0.5);
}

/* Alertas */
.alert {
    padding: 12px;
    margin: 10px 0;
    border-radius: 3px;
    border: 1px solid;
    background-color: rgba(0,0,0,0.3);
}

.alert-info { border-color: #5588FF; color: #5588FF; background-color: rgba(58, 102, 176, 0.2); }
.alert-success { border-color: #8BC34A; color: #8BC34A; background-color: rgba(139, 195, 74, 0.2); }
.alert-warning { border-color: #FF9800; color: #FF9800; background-color: rgba(255, 152, 0, 0.2); }
.alert-error { border-color: #C70000; color: #C70000; background-color: rgba(199, 0, 0, 0.2); }

/* Modales */
.modal {
    display: none;
    position: fixed;
    z-index: 200;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.modal.active {
    display: flex;
}

.modal-content {
    background: linear-gradient(180deg, #0F2040 0%, #1A3E6F 100%);
    border: 2px solid #5588FF;
    padding: 30px;
    border-radius: 8px;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.9);
    position: relative;
}

.modal-close {
    float: right;
    color: #FFD700;
    font-size: 2em;
    cursor: pointer;
    position: absolute;
    top: 10px;
    right: 20px;
    background-color: rgba(0,0,0,0.5);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    line-height: 28px;
    text-align: center;
    transition: color 0.2s, background-color 0.2s;
}

.modal-close:hover {
    color: #FF0000;
    background-color: rgba(255,255,255,0.2);
}

/* ============================================
   ESTILOS ESPECÍFICOS DEL JUEGO
   ============================================ */

/* Campo de fútbol para alineación */
.pitch-container {
    position: relative;
    width: 100%;
    padding-bottom: 75%;
    background: #2e7d32;
    background-image:
        linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
    background-size: 20% 12.5%, 100% 12.5%;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid #8BC34A;
    box-shadow: inset 0 0 15px rgba(0,0,0,0.7);
}

.pitch-position-placeholder {
    position: absolute;
    width: 18%;
    height: 10%;
    background: rgba(0,0,0,0.2);
    border: 1px dashed rgba(255,255,255,0.5);
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-size: 0.7em;
    color: rgba(255,255,255,0.7);
    transition: background 0.2s;
}

.pitch-position-placeholder.highlight {
    background: rgba(85, 136, 255, 0.4);
}

.pitch-player {
    background: #0F2040;
    border: 2px solid #5588FF;
    padding: 2px 5px;
    border-radius: 5px;
    font-weight: bold;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 90%;
    height: 90%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
    cursor: grab;
    user-select: none;
}

.pitch-player.injured {
    background: #C70000;
    border-color: red;
    cursor: not-allowed;
    opacity: 0.7;
}

.reserves-container {
    margin-top: 20px;
    border-top: 2px solid #5588FF;
    padding-top: 20px;
}

.reserves-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    min-height: 80px;
    border: 1px dashed #BBB;
    padding: 10px;
    align-content: flex-start;
    background-color: rgba(0,0,0,0.3);
    border-radius: 5px;
}

.draggable-player {
    background: #0F2040;
    border: 1px solid #5588FF;
    padding: 5px 10px;
    border-radius: 3px;
    margin: 5px;
    cursor: grab;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
}

.draggable-player.injured {
    background: #C70000;
    border-color: red;
    cursor: not-allowed;
    opacity: 0.7;
}

/* Tarjetas de jugador */
.player-card {
    background: rgba(58, 102, 176, 0.15);
    border: 1px solid #5588FF;
    padding: 12px;
    margin: 8px 0;
    border-radius: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3);
}

/* Instalaciones */
.facility-section {
    background: rgba(58, 102, 176, 0.2);
    border: 1px solid #5588FF;
    padding: 20px;
    border-radius: 5px;
    margin-bottom: 30px;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
}

/* News Feed */
#newsFeed {
    margin-top: 20px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid rgba(85, 136, 255, 0.3);
    border-radius: 5px;
    padding: 10px;
    background: rgba(0,0,0,0.3);
}

/* Negociación */
.negotiation-player-info {
    background: rgba(58, 102, 176, 0.25);
    border: 1px solid #5588FF;
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 5px;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
}

.negotiation-step {
    margin-top: 20px;
    border-top: 1px dashed rgba(85, 136, 255, 0.3);
    padding-top: 20px;
}

/* Team Selection */
.team-selection-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid rgba(85, 136, 255, 0.3);
    padding: 10px;
    border-radius: 5px;
    background-color: rgba(0,0,0,0.2);
}

/* ============================================
   🆕 SISTEMA DE TARJETAS Y SANCIONES
   Añade estas clases al final de tu style.css
   ============================================ */

/* 🆕 INDICADORES DE ESTADO DE JUGADORES */
.player-status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    font-size: 0.85em;
}

/* 🟨 Tarjeta Amarilla */
.yellow-card-badge {
    display: inline-block;
    background: #FFD700;
    color: #000;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #FFA500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 🟥 Tarjeta Roja */
.red-card-badge {
    display: inline-block;
    background: #C70000;
    color: #FFF;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #8B0000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* ⛔ Sancionado */
.suspended-badge {
    display: inline-block;
    background: #FF4500;
    color: #FFF;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #8B0000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    animation: pulse-suspend 1.5s ease-in-out infinite;
}

@keyframes pulse-suspend {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

/* ❌ Lesionado */
.injured-badge {
    display: inline-block;
    background: #8B0000;
    color: #FFF;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #550000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* 🆕 JUGADORES SANCIONADOS EN ALINEACIÓN */
.pitch-player.suspended {
    background: linear-gradient(135deg, #FF4500 0%, #8B0000 100%);
    border: 2px solid #FF0000;
    cursor: not-allowed;
    opacity: 0.7;
    animation: pulse-suspend 1.5s ease-in-out infinite;
    position: relative;
}

.draggable-player.suspended {
    background: linear-gradient(135deg, #FF4500 0%, #8B0000 100%);
    border: 2px solid #FF0000;
    cursor: not-allowed;
    opacity: 0.7;
}

/* 🆕 ICONOS EN ALINEACIÓN */
.pitch-player.injured {
    position: relative;
}

.pitch-player.injured::after {
    content: '❌';
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 1.2em;
    color: #FFF;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.pitch-player.suspended::after {
    content: '⛔';
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 1.2em;
    color: #FFF;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 🆕 TARJETAS EN LISTAS DE PLANTILLA */
.player-card.injured {
    background: rgba(199, 0, 0, 0.2);
    border-left: 4px solid #C70000;
}

.player-card.suspended {
    background: rgba(255, 69, 0, 0.2);
    border-left: 4px solid #FF4500;
}

/* 🆕 INDICADOR DE ADVERTENCIA (4 amarillas) */
.warning-badge {
    display: inline-block;
    background: #FFA500;
    color: #000;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #FF8C00;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    animation: pulse-warning 1s ease-in-out infinite;
}

@keyframes pulse-warning {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

/* 🆕 TOOLTIP EXPLICATIVO (opcional) */
.player-status-indicator[title]:hover::before {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: #FFF;
    padding: 5px 10px;
    border-radius: 5px;
    white-space: nowrap;
    font-size: 0.75em;
    z-index: 1000;
    margin-bottom: 5px;
}
EOF
cat /mnt/user-data/outputs/NUEVOS_ESTILOS_CSS.txt
Salida

/* ============================================
   🆕 SISTEMA DE TARJETAS Y SANCIONES
   Añade estas clases al final de tu style.css
   ============================================ */

/* 🆕 INDICADORES DE ESTADO DE JUGADORES */
.player-status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    font-size: 0.85em;
}

/* 🟨 Tarjeta Amarilla */
.yellow-card-badge {
    display: inline-block;
    background: #FFD700;
    color: #000;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #FFA500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 🟥 Tarjeta Roja */
.red-card-badge {
    display: inline-block;
    background: #C70000;
    color: #FFF;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #8B0000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* ⛔ Sancionado */
.suspended-badge {
    display: inline-block;
    background: #FF4500;
    color: #FFF;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #8B0000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    animation: pulse-suspend 1.5s ease-in-out infinite;
}

@keyframes pulse-suspend {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

/* ❌ Lesionado */
.injured-badge {
    display: inline-block;
    background: #8B0000;
    color: #FFF;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #550000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* 🆕 JUGADORES SANCIONADOS EN ALINEACIÓN */
.pitch-player.suspended {
    background: linear-gradient(135deg, #FF4500 0%, #8B0000 100%);
    border: 2px solid #FF0000;
    cursor: not-allowed;
    opacity: 0.7;
    animation: pulse-suspend 1.5s ease-in-out infinite;
    position: relative;
}

.draggable-player.suspended {
    background: linear-gradient(135deg, #FF4500 0%, #8B0000 100%);
    border: 2px solid #FF0000;
    cursor: not-allowed;
    opacity: 0.7;
}

/* 🆕 ICONOS EN ALINEACIÓN */
.pitch-player.injured {
    position: relative;
}

.pitch-player.injured::after {
    content: '❌';
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 1.2em;
    color: #FFF;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.pitch-player.suspended::after {
    content: '⛔';
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 1.2em;
    color: #FFF;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 🆕 TARJETAS EN LISTAS DE PLANTILLA */
.player-card.injured {
    background: rgba(199, 0, 0, 0.2);
    border-left: 4px solid #C70000;
}

.player-card.suspended {
    background: rgba(255, 69, 0, 0.2);
    border-left: 4px solid #FF4500;
}

/* 🆕 INDICADOR DE ADVERTENCIA (4 amarillas) */
.warning-badge {
    display: inline-block;
    background: #FFA500;
    color: #000;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    border: 1px solid #FF8C00;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    animation: pulse-warning 1s ease-in-out infinite;
}

@keyframes pulse-warning {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

/* 🆕 TOOLTIP EXPLICATIVO (opcional) */
.player-status-indicator[title]:hover::before {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: #FFF;
    padding: 5px 10px;
    border-radius: 5px;
    white-space: nowrap;
    font-size: 0.75em;
    z-index: 1000;
    margin-bottom: 5px;
}

// saved-games-manager.js  
(function() {  
    console.log('📦 Saved Games Manager cargando...'); // Corregido: Eliminar caracteres extraños  
  
    // Crear modal para mostrar partidas guardadas  
    function createSavedGamesModal() {  
        const modal = document.createElement('div');  
        modal.id = 'savedGamesModal';  
        modal.className = 'modal';  
        modal.style.zIndex = '10001';  
        modal.innerHTML = `  
            <span class="close-button" onclick="window.closeSavedGamesModal()">×</span>  
            <h2>💾 Partidas Guardadas</h2>  
            <div id="savedGamesLoading" style="text-align: center; padding: 20px;">Cargando partidas...</div>  
            <div id="savedGamesEmpty" style="text-align: center; padding: 20px; display: none;">  
                No tienes partidas guardadas en la nube<br>  
                Guarda tu primera partida usando el botón "💾 Guardar"  
            </div>  
            <div id="savedGamesList" class="list-container"></div>  
            <button class="btn" onclick="window.closeSavedGamesModal()">Cerrar</button>  
        `;  
        document.body.appendChild(modal);  
    }  
  
    // Abrir modal de partidas guardadas  
    window.openSavedGamesModal = async function() {  
        let modal = document.getElementById('savedGamesModal');  
        if (!modal) {  
            createSavedGamesModal();  
            modal = document.getElementById('savedGamesModal');  
        }  
        modal.classList.add('active');  
        // Mostrar loading  
        document.getElementById('savedGamesLoading').style.display = 'block';  
        document.getElementById('savedGamesList').innerHTML = '';  
        document.getElementById('savedGamesEmpty').style.display = 'none';  
  
        // Verificar autenticación  
        if (!window.currentUserId) {  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            document.getElementById('savedGamesList').innerHTML = `  
                ❌ Debes iniciar sesión para ver tus partidas guardadas en la nube  
            `;  
            return;  
        }  
  
        try {  
            // Esperar a que Firebase esté listo  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            // Cargar partidas  
            const games = await window.loadUserSavedGames(window.currentUserId);  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            if (!games || games.length === 0) {  
                document.getElementById('savedGamesEmpty').style.display = 'block';  
                return;  
            }  
  
            // Ordenar por fecha (más recientes primero)  
            games.sort((a, b) => b.lastSaved - a.lastSaved);  
  
            // Renderizar lista de partidas  
            const gamesList = document.getElementById('savedGamesList');  
            gamesList.innerHTML = games.map(game => `  
                <div class="list-item game-item">  
                    <h3>${game.name}</h3>  
                    <p>  
                        <strong>Equipo:</strong> ${game.team} |  
                        <strong>División:</strong> ${game.division || 'N/A'} |  
                        <strong>Jornada:</strong> ${game.week}  
                    </p>  
                    <p>📅 Guardada: ${new Date(game.lastSaved).toLocaleString('es-ES')}</p>  
                    <div class="actions">  
                        <button class="btn btn-success btn-sm" onclick="window.loadGameFromCloudUI('${game.id}')">▶️ Cargar</button>  
                        <button class="btn btn-danger btn-sm" onclick="window.deleteGameFromCloudUI('${game.id}', '${game.name}')">🗑️ Eliminar</button>  
                    </div>  
                </div>  
            `).join('');  
  
        } catch (error) {  
            console.error('❌ Error cargando partidas:', error); // Corregido: Eliminar caracteres extraños  
            document.getElementById('savedGamesLoading').style.display = 'none';  
            document.getElementById('savedGamesList').innerHTML = `  
                ❌ Error al cargar las partidas: ${error.message}  
            `;  
        }  
    };  
  
    // Cerrar modal  
    window.closeSavedGamesModal = function() {  
        const modal = document.getElementById('savedGamesModal');  
        if (modal) {  
            modal.classList.remove('active');  
        }  
    };  
  
    // Cargar partida desde la nube  
    window.loadGameFromCloudUI = async function(gameId) {  
        if (!window.currentUserId) {  
            alert('⚠️ Debes iniciar sesión para cargar partidas'); // Corregido: Eliminar caracteres extraños  
            return;  
        }  
        if (!confirm('¿Seguro que quieres cargar esta partida? Se perderá el progreso actual no guardado.')) {  
            return;  
        }  
        try {  
            // Esperar a que Firebase esté listo  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const result = await window.loadGameFromCloud(window.currentUserId, gameId);  
            if (result.success) {  
                alert('✅ Partida cargada correctamente'); // Corregido: Eliminar caracteres extraños  
                // Refrescar UI  
                if (window.ui && window.gameLogic) {  
                    // *** MODIFICACIÓN CLAVE AQUÍ: Actualizar el gameState global antes de refrescar la UI ***  
                    window.gameLogic.updateGameState(result.data.gameState);  
                    window.ui.refreshUI(window.gameLogic.getGameState());  
                } else {  
                    console.warn('gameLogic o ui no disponibles después de cargar partida, recargando página.');  
                    location.reload(); // Recargar si los módulos principales no están accesibles  
                }  
                // Cerrar modal y cambiar a dashboard  
                window.closeSavedGamesModal();  
                const dashboardButton = document.querySelector('.menu-item[onclick="window.switchPage(\'dashboard\', this)"]');  
                if (dashboardButton) {  
                    window.switchPage('dashboard', dashboardButton);  
                }  
            } else {  
                alert('❌ Error al cargar la partida: ' + (result.message || result.error)); // Corregido: Eliminar caracteres extraños  
            }  
        } catch (error) {  
            console.error('❌ Error cargando partida:', error); // Corregido: Eliminar caracteres extraños  
            alert('❌ Error al cargar la partida: ' + error.message); // Corregido: Eliminar caracteres extraños  
        }  
    };  
  
    // Eliminar partida de la nube  
    window.deleteGameFromCloudUI = async function(gameId, gameName) {  
        if (!window.currentUserId) {  
            alert('⚠️ Debes iniciar sesión para eliminar partidas'); // Corregido: Eliminar caracteres extraños  
            return;  
        }  
        if (!confirm(`¿Seguro que quieres eliminar la partida "${gameName}"? Esta acción no se puede deshacer.`)) {  
            return;  
        }  
        try {  
            // Esperar a que Firebase esté listo  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const result = await window.deleteGameFromCloud(window.currentUserId, gameId);  
            if (result.success) {  
                alert('✅ Partida eliminada correctamente'); // Corregido: Eliminar caracteres extraños  
                // Recargar lista de partidas  
                window.openSavedGamesModal();  
            } else {  
                alert('❌ Error al eliminar la partida: ' + (result.error || 'Error desconocido')); // Corregido: Eliminar caracteres extraños  
            }  
        } catch (error) {  
            console.error('❌ Error eliminando partida:', error); // Corregido: Eliminar caracteres extraños  
            alert('❌ Error al eliminar la partida: ' + error.message); // Corregido: Eliminar caracteres extraños  
        }  
    };  
  
    // Añadir botón "Cargar de la Nube" al header  
    window.addEventListener('DOMContentLoaded', () => {  
        setTimeout(() => {  
            const headerInfo = document.querySelector('.header-info');  
            if (headerInfo && !document.getElementById('loadFromCloudBtn')) {  
                const loadBtn = document.createElement('button');  
                loadBtn.id = 'loadFromCloudBtn';  
                loadBtn.className = 'btn btn-sm';  
                loadBtn.innerHTML = '☁️ Cargar'; // Corregido: Eliminar caracteres extraños  
                loadBtn.onclick = () => window.openSavedGamesModal();  
                loadBtn.style.background = '#0099ff'; // Un color distintivo para cargar  
                // Insertar después del botón "Guardar"  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.parentNode.insertBefore(loadBtn, saveBtn.nextSibling);  
                } else {  
                    headerInfo.appendChild(loadBtn);  
                }  
            }  
        }, 1000);  
    });  
    console.log('✅ Saved Games Manager cargado correctamente'); // Corregido: Eliminar caracteres extraños  
})();  

// players.js - Base de datos de jugadores profesionales y cantera  


import { ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS, STAFF_LEVEL_EFFECTS, TEAMS_DATA } from './config.js';  
  
// Combinar todos los equipos de TEAMS_DATA para la generación de jugadores de la IA  
const ALL_AI_CLUBS = [  
    ...TEAMS_DATA.primera,  
    ...TEAMS_DATA.segunda,  
    ...TEAMS_DATA.rfef_grupo1, // Ahora usa los grupos separados  
    ...TEAMS_DATA.rfef_grupo2  // Ahora usa los grupos separados  
];  
  
const PLAYER_FIRST_NAMES = [  
    "Juan", "Pedro", "Pablo", "Alberto", "Manuel", "Sergio", "Daniel", "Carlos", "Luis", "Francisco",  
    "Javier", "David", "José", "Antonio", "Fernando", "Gonzalo", "Diego", "Miguel", "Álvaro", "Adrián",  
    "Iván", "Jorge", "Raúl", "Ricardo", "Roberto", "Rubén", "Santiago", "Saúl", "Sebastián", "Vicente",  
    "Marco", "Alejandro", "Gabriel", "Mario", "Ángel", "Héctor", "Óscar", "Lucas", "Hugo", "Bruno",  
    "Guillermo", "Ignacio", "Enrique", "Emilio", "Arturo", "Ramón", "César", "Israel", "Joaquín", "Rafael"  
];  
  
const PLAYER_LAST_NAMES = [  
    "García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín",  
    "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutierrez",  
    "Navarro", "Torres", "Ramírez", "Serrano", "Molina", "Ortiz", "Delgado", "Castro", "Rubio", "Marín",  
    "Domínguez", "Reyes", "Vázquez", "Cordero", "Cruz", "Guerrero", "Paredes", "Fuentes", "Flores", "Benítez"  
];  
  
function generateRandomName() {  
    const firstName = PLAYER_FIRST_NAMES[Math.floor(Math.random() * PLAYER_FIRST_NAMES.length)];  
    const lastName1 = PLAYER_LAST_NAMES[Math.floor(Math.random() * PLAYER_LAST_NAMES.length)];  
    let lastName2Initial = '';  
    do {  
        lastName2Initial = PLAYER_LAST_NAMES[Math.floor(Math.random() * PLAYER_LAST_NAMES.length)][0];  
    } while (lastName2Initial.toLowerCase() === lastName1[0].toLowerCase());  
        
    return `${firstName} ${lastName1} ${lastName2Initial}.`;  
}  
  
export function calculateOverall(player) {  
    const weights = POSITION_ATTRIBUTE_WEIGHTS[player.position];  
    if (!weights) {  
        // Fallback si la posición del jugador no tiene pesos definidos, promediar todos los atributos.  
        // Esto es útil si se permiten posiciones no estándar o si un jugador se alinea en una posición "no natural".  
        let overallSum = 0;  
        let count = 0;  
        for (const attr of ATTRIBUTES) {  
            if (player[attr] !== undefined) {  
                overallSum += player[attr];  
                count++;  
            }  
        }  
        return count > 0 ? Math.round(overallSum / count) : 0;  
    }  
  
    let overallSum = 0;  
    let totalWeight = 0;  
    
    for (const attr of ATTRIBUTES) {  
        const weight = weights[attr] || 0;  
        overallSum += (player[attr] || 0) * weight;  
        totalWeight += weight;  
    }  
    
    if (totalWeight === 0) {  
        // Si no hay pesos definidos o son cero, usar el promedio simple.  
        let simpleOverallSum = 0;  
        let count = 0;  
        for (const attr of ATTRIBUTES) {  
            if (player[attr] !== undefined) {  
                simpleOverallSum += player[attr];  
                count++;  
            }  
        }  
        return count > 0 ? Math.round(simpleOverallSum / count) : 0;  
    }  
    
    return Math.round(overallSum / totalWeight);  
}  
  
function generateRandomAttributes(minVal, maxVal) {  
    const attrs = {};  
    for (const attr of ATTRIBUTES) {  
        attrs[attr] = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));  
    }  
    return attrs;  
}  
  
function generateRandomFoot() {  
    const feet = ['Diestro', 'Zurdo', 'Ambidiestro'];  
    return feet[Math.floor(Math.random() * feet.length)];  
}  
  
const ELITE_PLAYERS_BASE = [  
  { name: 'Griezmann', position: 'DC', age: 33, salary: 15000, value: 180000, club: 'Atlético Madrid', EN: 70, VE: 85, RE: 80, AG: 85, CA: 80, EF: 90, MO: 88, AT: 90, DF: 60, foot: 'Zurdo' },  
  { name: 'Koke', position: 'MC', age: 32, salary: 12000, value: 150000, club: 'Atlético Madrid', EN: 80, VE: 70, RE: 88, AG: 80, CA: 80, EF: 85, MO: 85, AT: 80, DF: 80, foot: 'Diestro' },  
  { name: 'Oblak', position: 'POR', age: 31, salary: 10000, value: 120000, club: 'Atlético Madrid', EN: 90, VE: 60, RE: 70, AG: 80, CA: 95, EF: 85, MO: 88, AT: 40, DF: 95, foot: 'Diestro' },  
  { name: 'Nahuel Molina', position: 'LD', age: 26, salary: 8000, value: 90000, club: 'Atlético Madrid', EN: 80, VE: 85, RE: 85, AG: 75, CA: 70, EF: 70, MO: 80, AT: 75, DF: 80, foot: 'Diestro' },  
  { name: 'José Giménez', position: 'DFC', age: 29, salary: 9000, value: 100000, club: 'Atlético Madrid', EN: 90, VE: 70, RE: 85, AG: 90, CA: 85, EF: 75, MO: 85, AT: 50, DF: 90, foot: 'Diestro' },  
  { name: 'Axel Witsel', position: 'MC', age: 35, salary: 6000, value: 30000, club: 'Atlético Madrid', EN: 80, VE: 65, RE: 80, AG: 70, CA: 75, EF: 70, MO: 75, AT: 65, DF: 75, foot: 'Diestro' },  
  { name: 'Samuel Lino', position: 'EXT', age: 24, salary: 7000, value: 80000, club: 'Atlético Madrid', EN: 60, VE: 88, RE: 80, AG: 82, CA: 70, EF: 80, MO: 80, AT: 85, DF: 50, foot: 'Diestro' },  
  { name: 'Álvaro Morata', position: 'DC', age: 31, salary: 10000, value: 100000, club: 'Atlético Madrid', EN: 60, VE: 80, RE: 75, AG: 70, CA: 80, EF: 85, MO: 82, AT: 85, DF: 40, foot: 'Diestro' },  
  { name: 'Reinildo Mandava', position: 'LI', age: 30, salary: 6500, value: 50000, club: 'Atlético Madrid', EN: 85, VE: 78, RE: 80, AG: 80, CA: 70, EF: 70, MO: 78, AT: 50, DF: 85, foot: 'Zurdo' },  
  { name: 'Marcos Llorente', position: 'MD', age: 29, salary: 9000, value: 95000, club: 'Atlético Madrid', EN: 75, VE: 85, RE: 90, AG: 80, CA: 75, EF: 75, MO: 85, AT: 80, DF: 70, foot: 'Diestro' },  
  { name: 'Pablo Barrios', position: 'MC', age: 21, salary: 3000, value: 40000, club: 'Atlético Madrid', EN: 70, VE: 78, RE: 80, AG: 75, CA: 70, EF: 75, MO: 78, AT: 75, DF: 70, foot: 'Diestro' },  
  // Algunos jugadores de otros equipos para el mercado inicial  
  { name: 'Rodri Hernández', position: 'MC', age: 27, salary: 12000, value: 150000, club: 'Man City', EN: 85, VE: 75, RE: 90, AG: 80, CA: 85, EF: 80, MO: 90, AT: 80, DF: 90, foot: 'Diestro' },  
  { name: 'Jude Bellingham', position: 'MCO', age: 21, salary: 10000, value: 120000, club: 'Real Madrid', EN: 75, VE: 85, RE: 85, AG: 88, CA: 85, EF: 88, MO: 90, AT: 90, DF: 70, foot: 'Diestro' },  
  { name: 'Erling Haaland', position: 'DC', age: 24, salary: 18000, value: 200000, club: 'Man City', EN: 60, VE: 90, RE: 80, AG: 80, CA: 90, EF: 95, MO: 90, AT: 93, DF: 40, foot: 'Zurdo' },  
  { name: 'Kylian Mbappé', position: 'EXT', age: 25, salary: 16000, value: 190000, club: 'PSG', EN: 65, VE: 97, RE: 88, AG: 92, CA: 80, EF: 92, MO: 90, AT: 95, DF: 55, foot: 'Diestro' },  
];  
  
const YOUNGSTERS_BASE = [  
  { name: 'Gavi', position: 'MC', age: 19, salary: 1000, value: 50000, club: 'FC Barcelona', EN: 65, VE: 70, RE: 75, AG: 78, CA: 68, EF: 70, MO: 75, AT: 72, DF: 65, foot: 'Diestro', potential: 92 },  
  { name: 'Lamine Yamal', position: 'EXT', age: 17, salary: 800, value: 40000, club: 'FC Barcelona', EN: 55, VE: 85, RE: 70, AG: 70, CA: 65, EF: 75, MO: 70, AT: 78, DF: 50, foot: 'Zurdo', potential: 94 },  
  { name: 'Endrick', position: 'DC', age: 18, salary: 900, value: 45000, club: 'Real Madrid', EN: 50, VE: 80, RE: 65, AG: 70, CA: 70, EF: 80, MO: 70, AT: 82, DF: 40, foot: 'Zurdo', potential: 93 },  
  { name: 'Arda Güler', position: 'MCO', age: 19, salary: 700, value: 35000, club: 'Real Madrid', EN: 45, VE: 70, RE: 60, AG: 68, CA: 75, EF: 70, MO: 65, AT: 70, DF: 45, foot: 'Zurdo', potential: 90 },  
];  
  
  
let ALL_AVAILABLE_PLAYERS = [];  
let ALL_AVAILABLE_YOUNGSTERS = [];  
  
function generateRandomPlayer(minOverallTarget, maxOverallTarget) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 18 + Math.floor(Math.random() * 15); // 18 a 32 años  
    const club = ALL_AI_CLUBS[Math.floor(Math.random() * ALL_AI_CLUBS.length)]; // Usar ALL_AI_CLUBS  
    const foot = generateRandomFoot();  
  
    const player = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: club,  
        foot: foot,  
        matches: 0,  
        form: 75 + Math.floor(Math.random() * 10),  
        isInjured: false,  
        weeksOut: 0,  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 20), Math.min(100, maxOverallTarget + 10))  
    };  
  
    player.overall = calculateOverall(player);  
    player.potential = player.overall + Math.floor(Math.random() * (100 - player.overall));  
  
    player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000);  
    player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5);  
  
    player.transferListed = Math.random() < 0.3;  
    player.loanListed = Math.random() < 0.2 && age < 25;  
    player.askingPrice = player.value + Math.floor(Math.random() * player.value * 0.5);  
    player.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.5 * player.salary) : 0;  
  
    return player;  
}  
  
  
function generateRandomYoungster(minOverallTarget, maxOverallTarget, isStar = false) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 16 + Math.floor(Math.random() * 3);  
    const club = ALL_AI_CLUBS[Math.floor(Math.random() * ALL_AI_CLUBS.length)]; // Usar ALL_AI_CLUBS  
    const foot = generateRandomFoot();  
  
    const youngster = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: club,  
        foot: foot,  
        matches: 0,  
        form: 70 + Math.floor(Math.random() * 10),  
        isInjured: false,  
        weeksOut: 0,  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 10), Math.min(100, maxOverallTarget + 5))  
    };  
  
    youngster.overall = calculateOverall(youngster);  
    youngster.potential = youngster.overall + Math.floor(Math.random() * (95 - youngster.overall));  
  
    if (isStar) {  
        youngster.potential = Math.min(100, youngster.potential + 10 + Math.floor(Math.random() * 10));  
        youngster.overall = Math.min(90, youngster.overall + 5 + Math.floor(Math.random() * 5));  
    }  
  
    youngster.salary = Math.floor(youngster.overall * 50 + Math.random() * 200);  
    youngster.value = Math.floor(youngster.overall * 1000 + youngster.potential * 500 + youngster.salary * 5);  
    youngster.cost = youngster.value;  
  
    return youngster;  
}  
  
  
function initPlayerDatabase() {  
    ALL_AVAILABLE_PLAYERS = [];  
    ELITE_PLAYERS_BASE.forEach(p => {  
        const fullPlayer = {  
            ...p,  
            matches: 0,  
            form: 80 + Math.floor(Math.random() * 10),  
            isInjured: false,  
            weeksOut: 0  
        };  
        if (!fullPlayer.overall) fullPlayer.overall = calculateOverall(fullPlayer);  
        if (!fullPlayer.potential) fullPlayer.potential = fullPlayer.overall + Math.floor(Math.random() * (100 - fullPlayer.overall));  
  
        fullPlayer.transferListed = Math.random() < 0.1;  
        fullPlayer.loanListed = Math.random() < 0.05 && fullPlayer.age < 25;  
        fullPlayer.askingPrice = fullPlayer.value + Math.floor(Math.random() * fullPlayer.value * 0.2);  
        fullPlayer.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * fullPlayer.salary) : 0;  
  
        ALL_AVAILABLE_PLAYERS.push(fullPlayer);  
    });  
  
    for (let i = 0; i < 200; i++) {  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(65, 85));  
    }  
    for (let i = 0; i < 300; i++) {  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(45, 65));  
    }  
    return ALL_AVAILABLE_PLAYERS; // Devuelve la lista completa por si se usa en generateInitialSquad  
}  
  
function initYoungsterDatabase() {  
    ALL_AVAILABLE_YOUNGSTERS = [];  
    YOUNGSTERS_BASE.forEach(y => {  
        const fullYoungster = {  
            ...y,  
            matches: 0,  
            form: 70 + Math.floor(Math.random() * 10),  
            isInjured: false,  
            weeksOut: 0  
        };  
        if (!fullYoungster.overall) fullYoungster.overall = calculateOverall(fullYoungster);  
        if (!fullYoungster.potential) fullYoungster.potential = fullYoungster.overall + Math.floor(Math.random() * (95 - fullYoungster.overall));  
        if (!fullYoungster.cost) fullYoungster.cost = fullYoungster.value;  
  
        ALL_AVAILABLE_YOUNGSTERS.push(fullYoungster);  
    });  
  
    for (let i = 0; i < 40; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(40, 60));  
    }  
    for (let i = 0; i < 10; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(50, 70, true));  
    }  
}  
  
function getPlayerMarket(filters = {}, scoutLevel = 0) {  
    let filteredPlayers = [...ALL_AVAILABLE_PLAYERS];  
  
    if (filters.position && filters.position !== 'ALL') {  
        filteredPlayers = filteredPlayers.filter(p => p.position === filters.position);  
    }  
    if (filters.minOverall) {  
        filteredPlayers = filteredPlayers.filter(p => p.overall >= filters.minOverall);  
    }  
    if (filters.maxAge) {  
        filteredPlayers = filteredPlayers.filter(p => p.age <= filters.maxAge);  
    }  
    if (filters.searchName) {  
        const searchTerm = filters.searchName.toLowerCase();  
        filteredPlayers = filteredPlayers.filter(p => p.name.toLowerCase().includes(searchTerm));  
    }  
    if (filters.transferListed) {  
        filteredPlayers = filteredPlayers.filter(p => p.transferListed);  
    }  
    if (filters.loanListed) {  
        filteredPlayers = filteredPlayers.filter(p => p.loanListed);  
    }  
  
    let finalPlayers = [...filteredPlayers];  
    if (scoutLevel > 0) {  
        const scoutEffectMultiplier = STAFF_LEVEL_EFFECTS[scoutLevel]?.scoutQuality || 1;  
        // La probabilidad de encontrar nuevos jugadores debería ser inversamente proporcional al número ya encontrados  
        const currentFound = finalPlayers.length;  
        let dynamicScoutChance = 0.1 * scoutEffectMultiplier * (1 - (currentFound / 200)); // Disminuye si ya hay muchos  
        dynamicScoutChance = Math.max(0.01, dynamicScoutChance); // Mínimo 1% de oportunidad  
  
        if (Math.random() < dynamicScoutChance) {  
            const potentialFinds = ALL_AVAILABLE_PLAYERS.filter(p =>  
                !finalPlayers.some(fp => fp.name === p.name) &&  
                p.overall > (60 + scoutLevel * 5) &&  
                (p.transferListed || p.loanListed || Math.random() < 0.1 * scoutEffectMultiplier)  
            );  
            if (potentialFinds.length > 0) {  
                potentialFinds.sort((a,b) => b.overall - a.overall);  
                finalPlayers.push(...potentialFinds.slice(0, Math.min(3, potentialFinds.length)));  
            }  
        }  
    }  
  
    return finalPlayers  
        .sort((a, b) => b.overall - a.overall)  
        .slice(0, 50);  
}  
  
  
function getYoungsterMarket(filters = {}, scoutLevel = 0) {  
    let filteredYoungsters = [...ALL_AVAILABLE_YOUNGSTERS];  
  
    if (filters.minOverall) {  
        filteredYoungsters = filteredYoungsters.filter(p => p.overall >= filters.minOverall);  
    }  
    if (filters.maxAge) {  
        filteredYoungsters = filteredYoungsters.filter(p => p.age <= filters.maxAge);  
    }  
    if (filters.searchName) {  
        const searchTerm = filters.searchName.toLowerCase();  
        filteredYoungsters = filteredYoungsters.filter(p => p.name.toLowerCase().includes(searchTerm));  
    }  
    if (filters.minPotential) {  
        filteredYoungsters = filteredYoungsters.filter(p => p.potential >= filters.minPotential);  
    }  
  
    let finalYoungsters = [...filteredYoungsters];  
    if (scoutLevel > 0) {  
        const scoutEffectMultiplier = STAFF_LEVEL_EFFECTS[scoutLevel]?.scoutQuality || 1;  
        const currentFound = finalYoungsters.length;  
        let dynamicScoutChance = 0.2 * scoutEffectMultiplier * (1 - (currentFound / 50)); // Disminuye si ya hay muchos  
        dynamicScoutChance = Math.max(0.02, dynamicScoutChance); // Mínimo 2% de oportunidad  
  
        if (Math.random() < dynamicScoutChance) {  
            const potentialFinds = ALL_AVAILABLE_YOUNGSTERS.filter(y =>  
                !finalYoungsters.some(fy => fy.name === y.name) &&  
                y.potential > (70 + scoutLevel * 5)  
            );  
            if (potentialFinds.length > 0) {  
                potentialFinds.sort((a,b) => b.potential - a.potential);  
                finalYoungsters.push(...potentialFinds.slice(0, Math.min(5, potentialFinds.length)));  
            }  
        }  
    }  
  
    return finalYoungsters  
        .sort((a, b) => b.potential - a.potential)  
        .slice(0, 30);  
}  
  
initPlayerDatabase();  
initYoungsterDatabase();  
  
  
export {  
    ALL_AVAILABLE_PLAYERS,  
    ALL_AVAILABLE_YOUNGSTERS,  
    getPlayerMarket,  
    getYoungsterMarket,  
    initPlayerDatabase,  
    initYoungsterDatabase,  
    generateRandomName // Exportar para gameLogic.js  
};  

// InjectorManager.js
const injectors = [];

export function registerInjector(injector) {
  injectors.push(injector);
}

export function emit(event, payload) {
  injectors.forEach(i => {
    if (i[event]) i[event](payload);
  });
}

// injector-player-arrows.js
(function() {
    // Esperar a que la UI esté cargada
    window.addEventListener('DOMContentLoaded', () => {
        // Guardar atributos anteriores al aplicar entrenamiento
        const originalApplyTraining = window.gameLogic?.applyWeeklyTraining;
        if (originalApplyTraining) {
            window.gameLogic.applyWeeklyTraining = function() {
                const state = window.gameLogic.getGameState();
                const playerIndex = state.trainingFocus.playerIndex;
                
                if (playerIndex >= 0 && playerIndex < state.squad.length) {
                    const player = state.squad[playerIndex];
                    // Guardar valores anteriores
                    if (!player.previousAttributes) {
                        player.previousAttributes = {};
                    }
                    ATTRIBUTES.forEach(attr => {
                        player.previousAttributes[attr] = player[attr] || 0;
                    });
                }
                
                // Llamar a la función original
                return originalApplyTraining.call(this);
            };
        }
        
        console.log('✓ Player arrows injector loaded');
    });
})();

// injector-login-ui.js
(function() {
    console.log('🔐 Login UI Injector cargando...');

    // Usuarios por defecto - SOLO ADMIN
    const DEFAULT_USERS = {
        'tonaco92@gmail.com': { 
            email: 'tonaco92@gmail.com', 
            password: '12345678', 
            role: 'admin',
            name: 'Antonio (Admin)'
        }
    };

    // Guardar usuarios por defecto si no existen
    Object.values(DEFAULT_USERS).forEach(user => {
        if (!localStorage.getItem('user_' + user.email)) {
            localStorage.setItem('user_' + user.email, JSON.stringify(user));
            console.log(`✅ Usuario por defecto creado: ${user.email}`);
        }
    });

    // Función de login
 // Función de login CON FIREBASE
window.loginUser = async function(email, password) {
    // Login especial para admin (mantener en local)
    if (email === 'tonaco92@gmail.com' && password === '12345678') {
        const adminUser = {
            email: email,
            uid: 'admin-local-uid',
            role: 'admin',
            name: 'Tonaco92 (Admin)'
        };
        
        window.currentUser = adminUser;
        window.currentUserId = adminUser.uid;
        localStorage.setItem('currentUser', JSON.stringify(adminUser));

         // 🔥 HABILITAR BOTÓN DE GUARDAR MANUALMENTE
    setTimeout(() => {
        const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            console.log('✅ Botón de guardar habilitado para admin');
        }
    }, 500);
        
        return { success: true, user: adminUser };
    }
    
    // Para otros usuarios, usar Firebase
    if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = userCredential.user;
            
            const userData = {
                email: user.email,
                uid: user.uid,
                role: 'user',
                name: user.displayName || email.split('@')[0]
            };
            
            window.currentUser = userData;
            window.currentUserId = userData.uid;
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            console.log('✅ Login exitoso en Firebase:', user.email);
            return { success: true, user: userData };
            
        } catch (error) {
            console.error('❌ Error de Firebase Auth:', error);
            let message = 'Error de autenticación';
            if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
            if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
            if (error.code === 'auth/invalid-email') message = 'Email inválido';
            return { success: false, message };
        }
    }
    
    return { success: false, message: 'Firebase no está disponible' };
};

    // Función de registro (solo para usuarios normales)
   // Función de registro CON FIREBASE
window.registerUser = async function(email, password, name) {
    if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = userCredential.user;
            
            // Actualizar perfil con el nombre
            if (name) {
                await updateProfile(user, { displayName: name });
            }
            
            console.log('✅ Usuario registrado en Firebase:', email);
            return { success: true, message: 'Usuario registrado correctamente' };
            
        } catch (error) {
            console.error('❌ Error registrando en Firebase:', error);
            let message = 'Error al registrar usuario';
            if (error.code === 'auth/email-already-in-use') message = 'Este email ya está registrado';
            if (error.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres';
            if (error.code === 'auth/invalid-email') message = 'Email inválido';
            return { success: false, message };
        }
    }
    
    return { success: false, message: 'Firebase no está disponible' };
};
    // Función de logout
 // Función de logout CON FIREBASE
window.logoutUser = async function() {
    if (!confirm('¿Seguro que quieres cerrar sesión?')) {
        return;
    }
    
    // Cerrar sesión en Firebase
    if (window.firebaseAuth && window.firebaseConfig && window.firebaseConfig.enabled) {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(window.firebaseAuth);
            console.log('✅ Sesión cerrada en Firebase');
        } catch (error) {
            console.error('❌ Error cerrando sesión en Firebase:', error);
        }
    }
    
    window.currentUser = null;
    window.currentUserId = null;
    localStorage.removeItem('currentUser');
    location.reload();
};

    // Crear modal de login
    function createLoginModal() {
        const modal = document.createElement('div');
        modal.id = 'loginModal';
        modal.className = 'modal active'; // active por defecto
        modal.style.zIndex = '10000';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; text-align: center;">
                <h1 style="color: #e94560; margin-bottom: 30px;">⚽ PC FÚTBOL MANAGER</h1>
                
                <!-- Pestañas -->
                <div style="display: flex; margin-bottom: 20px; border-bottom: 2px solid #e94560;">
                    <button id="loginTab" class="btn" onclick="window.switchLoginTab('login')" 
                            style="flex: 1; border-radius: 0; background: #e94560;">
                        Iniciar Sesión
                    </button>
                    <button id="registerTab" class="btn" onclick="window.switchLoginTab('register')" 
                            style="flex: 1; border-radius: 0; background: rgba(233, 69, 96, 0.3);">
                        Registrarse
                    </button>
                </div>

                <!-- Formulario de Login -->
                <div id="loginForm" style="display: block;">
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Email:</label>
                        <input type="email" id="loginEmail" placeholder="correo@ejemplo.com" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Contraseña:</label>
                        <input type="password" id="loginPassword" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <button class="btn" onclick="window.handleLogin()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        🔓 Entrar
                    </button>
                    <p style="margin-top: 15px; color: #999; font-size: 0.9em;">
                        Admin: tonaco92@gmail.com / 12345678
                    </p>
                </div>

                <!-- Formulario de Registro -->
                <div id="registerForm" style="display: none;">
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Nombre:</label>
                        <input type="text" id="registerName" placeholder="Tu nombre" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Email:</label>
                        <input type="email" id="registerEmail" placeholder="correo@ejemplo.com" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 15px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Contraseña:</label>
                        <input type="password" id="registerPassword" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <div style="margin-bottom: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px; color: #e94560;">Confirmar Contraseña:</label>
                        <input type="password" id="registerPasswordConfirm" placeholder="••••••••" 
                               style="width: 100%; padding: 12px;">
                    </div>
                    <button class="btn" onclick="window.handleRegister()" style="width: 100%; padding: 15px; font-size: 1.1em;">
                        ✍️ Crear Cuenta
                    </button>
                    <p style="margin-top: 10px; color: #999; font-size: 0.85em;">
                        Las cuentas registradas son de usuario normal (no admin)
                    </p>
                </div>

                <div id="loginMessage" style="margin-top: 15px; padding: 10px; border-radius: 5px; display: none;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        console.log('✅ Modal de login creado');
    }

    // Cambiar entre pestañas
    window.switchLoginTab = function(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const messageDiv = document.getElementById('loginMessage');

        messageDiv.style.display = 'none'; // Limpiar mensajes al cambiar de pestaña

        if (tab === 'login') {
            loginTab.style.background = '#e94560';
            registerTab.style.background = 'rgba(233, 69, 96, 0.3)';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginTab.style.background = 'rgba(233, 69, 96, 0.3)';
            registerTab.style.background = '#e94560';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    };

    // Manejar login
window.handleLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');

    if (!email || !password) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Por favor, completa todos los campos';
        return;
    }

    // Mostrar mensaje de "Iniciando sesión..."
    messageDiv.style.display = 'block';
    messageDiv.style.background = 'rgba(255, 255, 0, 0.2)';
    messageDiv.style.color = 'yellow';
    messageDiv.textContent = '⏳ Iniciando sesión...';

    try {
        const result = await window.loginUser(email, password); // ← AWAIT aquí
        
        if (result.success) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Bienvenido, ' + result.user.name;

            console.log(`✅ Login exitoso: ${result.user.email} (${result.user.role})`);

            // Cerrar modal después de 1 segundo
            setTimeout(() => {
                document.getElementById('loginModal').classList.remove('active');
                addUserButtons(result.user);
            }, 1000);
        } else {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ ' + result.message;
        }
    } catch (error) {
        console.error('❌ Error en handleLogin:', error);
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Error: ' + error.message;
    }
};

    // Manejar registro
    window.handleRegister = async function() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const messageDiv = document.getElementById('loginMessage');

    if (!name || !email || !password || !passwordConfirm) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Por favor, completa todos los campos';
        return;
    }

    if (password !== passwordConfirm) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Las contraseñas no coinciden';
        return;
    }

    if (password.length < 6) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ La contraseña debe tener al menos 6 caracteres';
        return;
    }

    // Mostrar mensaje de "Registrando..."
    messageDiv.style.display = 'block';
    messageDiv.style.background = 'rgba(255, 255, 0, 0.2)';
    messageDiv.style.color = 'yellow';
    messageDiv.textContent = '⏳ Registrando usuario...';

    try {
        const result = await window.registerUser(email, password, name); // ← AWAIT aquí
        
        if (result.success) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(0, 255, 0, 0.2)';
            messageDiv.style.color = '#00ff00';
            messageDiv.textContent = '✅ Cuenta creada. Puedes iniciar sesión ahora';

            console.log(`✅ Usuario registrado: ${email}`);

            // Cambiar a pestaña de login después de 2 segundos
            setTimeout(() => {
                window.switchLoginTab('login');
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = '';
                messageDiv.style.display = 'none';
            }, 2000);
        } else {
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            messageDiv.style.color = 'red';
            messageDiv.textContent = '❌ ' + result.message;
        }
    } catch (error) {
        console.error('❌ Error en handleRegister:', error);
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(255, 0, 0, 0.2)';
        messageDiv.style.color = 'red';
        messageDiv.textContent = '❌ Error: ' + error.message;
    }
};

    // Añadir botones de usuario al header
    function addUserButtons(user) {
        const headerInfo = document.querySelector('.header-info');
        if (!headerInfo) {
            console.warn('⚠️ No se encontró .header-info');
            return;
        }

        // Añadir botón de admin si es admin
        if (user.role === 'admin' && !document.getElementById('adminButton')) {
            const adminBtn = document.createElement('button');
            adminBtn.id = 'adminButton';
            adminBtn.className = 'btn btn-sm';
            adminBtn.innerHTML = '⚙️ Admin';
            adminBtn.onclick = () => {
                if (window.openAdminPanel) {
                    window.openAdminPanel();
                } else {
                    alert('El panel de administración aún no está cargado');
                }
            };
            adminBtn.style.background = '#ff9500';
            headerInfo.insertBefore(adminBtn, headerInfo.firstChild);
            console.log('✅ Botón de Admin añadido');
        }

        // Añadir botón de logout
        if (!document.getElementById('logoutButton')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutButton';
            logoutBtn.className = 'btn btn-sm';
            logoutBtn.innerHTML = '🚪 Salir';
            logoutBtn.onclick = window.logoutUser;
            logoutBtn.style.background = '#c73446';
            headerInfo.appendChild(logoutBtn);
            console.log('✅ Botón de Logout añadido');
        }

        // Añadir indicador de usuario
        if (!document.getElementById('userIndicator')) {
            const userIndicator = document.createElement('div');
            userIndicator.id = 'userIndicator';
            userIndicator.className = 'info-box';
            userIndicator.innerHTML = `👤 ${user.name}`;
            headerInfo.insertBefore(userIndicator, headerInfo.firstChild);
            console.log('✅ Indicador de usuario añadido');
        }
    }

    // Permitir login con Enter
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (loginForm && loginForm.style.display !== 'none') {
                window.handleLogin();
            } else if (registerForm && registerForm.style.display !== 'none') {
                window.handleRegister();
            }
        }
    });

    // Inicializar
    window.addEventListener('DOMContentLoaded', () => {
        console.log('🔐 Inicializando sistema de login...');
        
        // Verificar si hay sesión guardada
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                window.currentUser = JSON.parse(savedUser);
                console.log(`✅ Sesión restaurada: ${window.currentUser.email} (${window.currentUser.role})`);
                
                // Esperar a que el DOM esté completamente cargado
                setTimeout(() => {
                    addUserButtons(window.currentUser);
                }, 1000);
            } catch (error) {
                console.error('❌ Error restaurando sesión:', error);
                localStorage.removeItem('currentUser');
                createLoginModal();
            }
        } else {
            // No hay sesión, mostrar modal de login
            console.log('⚠️ No hay sesión activa, mostrando modal de login');
            createLoginModal();
        }
    });

    console.log('✅ Login UI Injector cargado correctamente');
})();

// injector-firebase-sync.js  
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
import { TEAM_CUSTOM_DATA } from './teamData.js'; // <-- Importación correcta de TEAM_CUSTOM_DATA  
  
(function() {  
    console.log('🔥 Firebase Sync Injector cargando...');  
  
    // Función para obtener los datos por defecto específicos de un equipo  
    function getDefaultTeamDataForTeam(teamName) {  
        // Utiliza TEAM_CUSTOM_DATA del archivo teamData.js como base  
        const customData = TEAM_CUSTOM_DATA[teamName];  
        return customData || { // Fallback si no hay customData para ese equipo  
            logo: null,  
            stadiumImage: null,  
            stadiumCapacity: 10000,  
            initialBudget: 5000000,  
            stadiumName: 'Estadio Municipal'  
        };  
    }  
  
    // =============================  
    // FUNCIONES EQUIPOS MEJORADAS  
    // =============================  
    async function getTeamDataFromFirebaseSafe(teamName) {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (!isFirebaseEnabled || !window.firebaseDB) {  
            return { success: false, data: null };  
        }  
        try {  
            // Esperar a que la autenticación esté lista  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const result = await window.getTeamDataFromFirebase(teamName);  
            if (result.success && result.data) {  
                return result;  
            }  
            // Si no hay datos en Firebase, inicializar con defaultTeamData para ese equipo  
            if (!result.data) {  
                console.log(`📝 Inicializando datos por defecto para ${teamName}`);  
                const teamSpecificDefault = getDefaultTeamDataForTeam(teamName); // Usar esta función  
                await window.saveTeamDataToFirebase(teamName, teamSpecificDefault);  
                return { success: true, data: teamSpecificDefault };  
            }  
            return { success: false, data: null };  
        } catch (error) {  
            console.error('❌ Error accediendo a Firebase para equipo:', error);  
            return { success: false, data: null };  
        }  
    }  
  
    // Función global para obtener datos del equipo  
    // Esta es la función principal que el juego (gameLogic, admin) debe llamar  
window.getTeamData = async function(teamName) {
    console.log(`📥 Cargando datos para ${teamName}...`);
    // Primero intentar cargar desde Firebase
    const firebaseResult = await getTeamDataFromFirebaseSafe(teamName);
    let teamData;
    if (firebaseResult.success && firebaseResult.data) {
        console.log(`✅ Datos cargados desde Firebase para ${teamName}`);
        teamData = firebaseResult.data;
    } else {
        // Fallback a localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);
            teamData = JSON.parse(localData);
        } else {
            console.log(`⚠️ No hay datos para ${teamName}, usando valores por defecto.`);
            teamData = getDefaultTeamDataForTeam(teamName);
        }
    }

    // 🔥 Inicializar campos de lesiones, sanciones y tarjetas
    if (teamData.squad && Array.isArray(teamData.squad)) {
        teamData.squad.forEach(p => {
            p.isInjured = p.isInjured ?? false;
            p.weeksOut = p.weeksOut ?? 0;

            p.isSuspended = p.isSuspended ?? false;
            p.suspensionWeeks = p.suspensionWeeks ?? 0;

            p.yellowCards = p.yellowCards ?? 0;
            p.redCards = p.redCards ?? 0;
        });
    }

    // Guardar en localStorage y opcionalmente Firebase
    localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));

    return teamData;
};

 
  
    // Función global para guardar datos del equipo (llamada desde admin panel)  
    window.saveTeamData = async function(teamName, teamData) {  
        // Siempre guardar en localStorage primero (sincrónico)  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        console.log(`💾 Datos guardados en localStorage para ${teamName}`);  
  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (isFirebaseEnabled && window.firebaseDB) {  
            try {  
                // Esperar a que la autenticación esté lista  
                if (window.authReadyPromise) {  
                    await window.authReadyPromise;  
                }  
                const result = await window.saveTeamDataToFirebase(teamName, teamData);  
                if (result.success) {  
                    console.log(`✅ Datos guardados en Firebase para ${teamName}`);  
                    return { success: true };  
                } else {  
                    console.warn('⚠️ Error guardando en Firebase, datos guardados solo localmente', result.error);  
                    return { success: false, error: result.error };  
                }  
            } catch (error) {  
                console.warn('⚠️ Error guardando en Firebase:', error);  
                return { success: false, error: error.message };  
            }  
        }  
        return { success: true, message: 'Guardado en localStorage (Firebase deshabilitado)' };  
    };  
      
    // Global function to get all team data (used by admin panel export)  
    window.getAllTeamsData = async function() {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (isFirebaseEnabled && window.firebaseDB) {  
            try {  
                await window.authReadyPromise;  
                const result = await window.getAllTeamsDataFromFirebase();  
                if (result.success) {  
                    return result.data;  
                }  
            } catch (error) {  
                console.warn('⚠️ Error al cargar todos los datos de equipos desde Firebase:', error);  
            }  
        }  
        // Fallback a cargar desde localStorage si Firebase no está disponible o falla  
        const allData = {};  
        Object.keys(localStorage).forEach(key => {  
            if (key.startsWith('team_data_')) {  
                const teamName = key.replace('team_data_', '');  
                try {  
                    allData[teamName] = JSON.parse(localStorage.getItem(key));  
                } catch (error) {  
                    console.error(`Error parseando datos de ${teamName} desde localStorage:`, error);  
                }  
            }  
        });  
        return allData;  
    };  
  
  
    // =============================  
    // PRECARGA DE EQUIPOS DESDE FIREBASE  
    // =============================  
    async function preloadTeamsFromFirebase() {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (!isFirebaseEnabled || !window.firebaseDB) {  
            console.log('⚠️ Firebase no disponible para precarga de equipos');  
            return;  
        }  
        try {  
            // Esperar a que la autenticación esté lista  
            if (window.authReadyPromise) {  
                console.log('⏳ Esperando autenticación para precargar equipos...');  
                await window.authReadyPromise;  
            }  
            console.log('📥 Precargando equipos desde Firebase...');  
            const querySnapshot = await getDocs(collection(window.firebaseDB, 'teams_data'));  
            let count = 0;  
            querySnapshot.forEach(docSnap => {  
                const teamData = docSnap.data();  
                localStorage.setItem(`team_data_${docSnap.id}`, JSON.stringify(teamData));  
                count++;  
            });  
            console.log(`✅ ${count} equipos precargados desde Firebase`);  
        } catch (error) {  
            console.warn('⚠️ Error precargando equipos desde Firebase:', error);  
        }  
    }  
  
    // =============================  
    // AUTENTICACIÓN Y LISTENERS  
    // =============================  
    const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
    if (isFirebaseEnabled && window.firebaseAuth) {  
        // Este onAuthStateChanged ya está en firebase-config.js.  
        // Es mejor dejar que firebase-config.js maneje el estado de currentUserId y authReady  
        // y este injector solo reaccione a ello si es necesario,  
        // o que firebase-config.js llame a preloadTeamsFromFirebase.  
        // He eliminado el listener duplicado aquí para evitar efectos secundarios.  
        // preloadTeamsFromFirebase ahora se llamará desde firebase-config.js  
    } else if (isFirebaseEnabled) {  
        console.warn('⚠️ window.firebaseAuth no disponible en injector-firebase-sync');  
    }  
  
    // =============================  
    // INICIALIZACIÓN  
    // =============================  
    window.addEventListener('DOMContentLoaded', () => {  
        // El estado del botón de guardar es gestionado por firebase-config.js  
        // cuando onAuthStateChanged se dispara.  
        console.log('✓ Firebase Sync Injector cargado correctamente');  
    });  
})();  

// injector-expose-functions.js
// Este injector expone las funciones del módulo ES6 al scope global
// para que puedan ser llamadas desde onclick en el HTML

(function() {
    console.log('🔗 Function Exposure Injector cargando...');

    // Esperar a que los módulos estén cargados
    function waitForModules() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.gameLogic && window.ui) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout de seguridad
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.gameLogic || !window.ui) {
                    console.error('❌ Módulos no cargados después de 10 segundos');
                }
                resolve();
            }, 10000);
        });
    }

    // Función principal de exposición
    async function exposeGameFunctions() {
        await waitForModules();

        if (!window.gameLogic) {
            console.error('❌ gameLogic no disponible');
            return;
        }

        console.log('📤 Exponiendo funciones del juego...');

        // ============================================
        // PRIMERO: FUNCIONES AUXILIARES Y DE UTILIDAD
        // ============================================

        // Función para popular el select de intercambio de jugadores
        window.populatePlayerExchangeSelect = function() {
            const select = document.getElementById('playerExchangeSelect');
            if (!select) return;
            
            select.innerHTML = '';
            const state = window.gameLogic.getGameState();
            state.squad.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                option.textContent = `${p.name} (OVR: ${p.overall}) - VAL: ${p.value.toLocaleString('es-ES')}€`;
                select.appendChild(option);
            });
        };

        // ============================================
        // SEGUNDO: FUNCIONES DE NEGOCIACIÓN
        // ============================================

        window.updateNegotiationModal = function() {
            const state = window.gameLogic.getGameState();
            const player = state.negotiatingPlayer;

            if (!player) {
                if (window.closeModal) {
                    window.closeModal('negotiation');
                }
                return;
            }

            document.getElementById('negotiationPlayerName').textContent = player.name;
            document.getElementById('negotiationPlayerNameStep1').textContent = player.name;
            document.getElementById('negotiationPlayerClub').textContent = player.club;
            document.getElementById('negotiationPlayerClubStep2').textContent = player.club;
            document.getElementById('negotiationPlayerPosition').textContent = player.position;
            document.getElementById('negotiationPlayerAge').textContent = player.age;
            document.getElementById('negotiationPlayerOverall').textContent = player.overall;
            document.getElementById('negotiationPlayerPotential').textContent = player.potential;
            document.getElementById('negotiationPlayerCurrentSalary').textContent = player.salary.toLocaleString('es-ES');
            document.getElementById('negotiationPlayerValue').textContent = player.value.toLocaleString('es-ES');

            const askingPriceElem = document.getElementById('negotiationPlayerAskingPrice');
            const loanInfoElem = document.getElementById('negotiationPlayerLoanInfo');
            if (player.transferListed) {
                askingPriceElem.style.display = 'block';
                document.getElementById('negotiationPlayerAskingPriceValue').textContent = player.askingPrice.toLocaleString('es-ES');
                loanInfoElem.style.display = 'none';
            } else if (player.loanListed) {
                askingPriceElem.style.display = 'none';
                loanInfoElem.style.display = 'block';
                document.getElementById('negotiationPlayerLoanContribution').textContent = (player.loanWageContribution || 0).toLocaleString('es-ES');
            } else {
                askingPriceElem.style.display = 'none';
                loanInfoElem.style.display = 'none';
            }

            document.getElementById('negotiationStep1').style.display = 'none';
            document.getElementById('negotiationStep2').style.display = 'none';

            if (state.negotiationStep === 1) {
                document.getElementById('negotiationStep1').style.display = 'block';
                document.getElementById('offeredSalary').value = player.salary;
                document.getElementById('offeredBonus').checked = false;
                document.getElementById('offeredCar').checked = false;
                document.getElementById('offeredHouse').checked = false;
                document.getElementById('offeredMerchPercent').checked = false;
                document.getElementById('offeredTicketPercent').checked = false;

            } else if (state.negotiationStep === 2) {
                document.getElementById('negotiationStep2').style.display = 'block';

                const negotiationLoanOffer = document.getElementById('negotiationLoanOffer');
                const negotiationTransferOffer = document.getElementById('negotiationTransferOffer');

                negotiationLoanOffer.style.display = 'none';
                negotiationTransferOffer.style.display = 'none';

                document.getElementById('negotiationClubMessage').textContent = `Estás a punto de hacer una oferta a ${player.club} por ${player.name}.`;

                if (player.loanListed) {
                    negotiationLoanOffer.style.display = 'block';
                    document.getElementById('loanPlayerSalaryExample').textContent = player.salary.toLocaleString('es-ES');
                    document.getElementById('loanClubContributionInfo').textContent = (player.loanWageContribution || 0).toLocaleString('es-ES');
                    document.getElementById('loanWageContribution').value = 50;
                    document.getElementById('loanWageContributionValue').textContent = '50%';
                } else if (player.transferListed) {
                    negotiationTransferOffer.style.display = 'block';
                    document.getElementById('offerAmount').value = player.askingPrice;
                    window.populatePlayerExchangeSelect();
                }
            }
        };

        window.endNegotiationUI = function(success) {
            window.gameLogic.endNegotiation(success);
            if (window.closeModal) {
                window.closeModal('negotiation');
            }
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
        };

        window.submitPlayerOffer = function() {
            const offeredSalary = parseInt(document.getElementById('offeredSalary').value);
            const offeredBonus = document.getElementById('offeredBonus').checked;
            const offeredCar = document.getElementById('offeredCar').checked;
            const offeredHouse = document.getElementById('offeredHouse').checked;
            const offeredMerchPercent = document.getElementById('offeredMerchPercent').checked;
            const offeredTicketPercent = document.getElementById('offeredTicketPercent').checked;

            const result = window.gameLogic.offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent);
            alert(result.message);
            if (result.success) {
                window.updateNegotiationModal();
            } else {
                if (result.message && result.message.includes('No está interesado')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.submitLoanOffer = function() {
            const loanWageContribution = parseInt(document.getElementById('loanWageContribution').value);
            const result = window.gameLogic.offerToClub(loanWageContribution, [], true);
            alert(result.message);
            if (result.success) {
                window.endNegotiationUI(true);
            } else {
                if (result.message && result.message.includes('rechazado tu oferta de cesión')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.submitTransferOffer = function() {
            const offerAmount = parseInt(document.getElementById('offerAmount').value);
            const playerExchangeSelect = document.getElementById('playerExchangeSelect');
            const selectedPlayers = Array.from(playerExchangeSelect.selectedOptions).map(option => option.value);

            const result = window.gameLogic.offerToClub(offerAmount, selectedPlayers, false);
            alert(result.message);
            if (result.success) {
                window.endNegotiationUI(true);
            } else {
                if (result.message && result.message.includes('rechazado tu oferta')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.startNegotiationUI = function(encodedPlayerJson) {
            const player = JSON.parse(decodeURIComponent(encodedPlayerJson));
            const result = window.gameLogic.startNegotiation(player);
            if (result.success) {
                window.updateNegotiationModal();
                window.openModal('negotiation');
            } else {
                alert('Error: ' + result.message);
            }
        };

        // ============================================
        // TERCERO: FUNCIONES DE ENTRENAMIENTO
        // ============================================

        window.setPlayerTrainingFocusUI = function(playerIndex, playerName) {
            const state = window.gameLogic.getGameState();
            const player = state.squad[playerIndex];

            if (!player) {
                alert('Jugador no encontrado');
                return;
            }

            const ATTRIBUTES = window.ATTRIBUTES || ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];

            document.getElementById('trainingPlayerName').textContent = playerName;
            document.getElementById('trainingPlayerNameInfo').textContent = playerName;
            document.getElementById('trainingPlayerPosition').textContent = player.position;
            document.getElementById('trainingPlayerOverall').textContent = player.overall;
            document.getElementById('trainingPlayerPotential').textContent = player.potential;

            const attributesList = document.getElementById('trainingPlayerAttributes');
            attributesList.innerHTML = '';
            ATTRIBUTES.forEach(attr => {
                attributesList.innerHTML += `<li style="display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(233, 69, 96, 0.3); padding: 5px; border-radius: 3px;"><strong>${attr}:</strong> ${player[attr] || 0}</li>`;
            });

            const attributeRadioButtons = document.getElementById('attributeRadioButtons');
            attributeRadioButtons.innerHTML = '';
            ATTRIBUTES.forEach(attr => {
                const checked = (state.trainingFocus && state.trainingFocus.playerIndex === playerIndex && state.trainingFocus.attribute === attr) ? 'checked' : '';
                attributeRadioButtons.innerHTML += `
                    <div>
                        <input type="radio" id="attr_${attr}" name="trainingAttribute" value="${attr}" ${checked}>
                        <label for="attr_${attr}">${attr}</label>
                    </div>
                `;
            });

            // Advertencias de staff
            if (!state.staff.entrenador) {
                document.getElementById('trainingStaffWarning').style.display = 'block';
            } else {
                document.getElementById('trainingStaffWarning').style.display = 'none';
            }

            if (player.position === 'POR' && !state.staff.entrenadorPorteros) {
                document.getElementById('trainingGkStaffWarning').style.display = 'block';
            } else {
                document.getElementById('trainingGkStaffWarning').style.display = 'none';
            }

            // Guardar el índice para submitTrainingFocus
            window.currentTrainingPlayerIndex = playerIndex;

            window.openModal('training');
        };

        window.submitTrainingFocus = function() {
            const selectedAttribute = document.querySelector('input[name="trainingAttribute"]:checked')?.value;
            if (!selectedAttribute) {
                alert('Por favor, selecciona un atributo para entrenar.');
                return;
            }

            const playerIndex = window.currentTrainingPlayerIndex;
            if (playerIndex === undefined || playerIndex === -1) {
                alert('Error: No se ha seleccionado un jugador válido.');
                return;
            }

            const result = window.gameLogic.setTrainingFocus(playerIndex, selectedAttribute);
            alert(result.message);
            if (result.success && window.closeModal) {
                window.closeModal('training');
            }
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
        };

        // ============================================
        // CUARTO: FUNCIONES DE PLANTILLA Y CANTERA
        // ============================================

        window.sellPlayer = function(playerName) {
            if (confirm(`¿Estás seguro de que quieres vender a ${playerName}?`)) {
                const result = window.gameLogic.sellPlayer(playerName);
                alert(result.message);
                if (result.success && window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(window.gameLogic.getGameState());
                }
            }
        };

        window.sellPlayerConfirm = function(name) {
            if (confirm(`¿Estás seguro de que quieres vender a ${name}?`)) {
                const result = window.gameLogic.sellPlayer(name);
                alert(result.message);
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(window.gameLogic.getGameState());
                }
            }
        };

        window.promoteYoungster = function(playerName) {
            window.promoteConfirm(playerName);
        };

        window.promoteConfirm = function(name) {
            if (confirm(`¿Ascender a ${name} a la primera plantilla?`)) {
                const result = window.gameLogic.promoteYoungster(name);
                alert(result.message);
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(window.gameLogic.getGameState());
                }
            }
        };

        window.fichYoungsterConfirm = function(encodedYoungsterJson) {
            const youngster = JSON.parse(decodeURIComponent(encodedYoungsterJson));
            const result = window.gameLogic.signYoungster(youngster);
            alert(result.message);
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
            if (result.success && window.closeModal) {
                window.closeModal('signYoungster');
            }
        };

        window.negotiatePlayer = function(playerName) {
            alert(`La funcionalidad "Negociar" para jugadores de tu plantilla no está implementada todavía. Esto sería para renovaciones, subidas de sueldo, etc.`);
            console.log(`Intentando negociar con ${playerName}`);
        };

        // AHORA SÍ: Abrir modal de entrenamiento (que ya tiene setPlayerTrainingFocusUI definida)
        window.openTrainingModal = function(playerIndex, playerName) {
            window.setPlayerTrainingFocusUI(playerIndex, playerName);
        };

        console.log('✅ Funciones del juego expuestas globalmente');
        console.log('   ✓ sellPlayer');
        console.log('   ✓ openTrainingModal');
        console.log('   ✓ promoteYoungster');
        console.log('   ✓ negotiatePlayer');
        console.log('   ✓ startNegotiationUI');
        console.log('   ✓ submitPlayerOffer');
        console.log('   ✓ submitLoanOffer');
        console.log('   ✓ submitTransferOffer');
        console.log('   ✓ endNegotiationUI');
        console.log('   ✓ setPlayerTrainingFocusUI');
        console.log('   ✓ submitTrainingFocus');
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', exposeGameFunctions);
    } else {
        // DOM ya está listo
        exposeGameFunctions();
    }

    console.log('✅ Function Exposure Injector cargado correctamente');
})();

// injector-cloud-load.js
(function() {
    console.log('☁️ Cloud Load Injector cargando...');

    // ========================================
    // FUNCIONES DE CARGA DESDE LA NUBE
    // ========================================

    // Función para abrir el modal de partidas guardadas
    window.openSavedGamesModal = async function() {
        if (!window.currentUserId) {
            alert('⚠️ Debes iniciar sesión para acceder a tus partidas guardadas en la nube.');
            return;
        }

        // Crear modal si no existe
        if (!document.getElementById('savedGamesModal')) {
            const modal = document.createElement('div');
            modal.id = 'savedGamesModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px;">
                    <span class="modal-close" onclick="document.getElementById('savedGamesModal').classList.remove('active')">&times;</span>
                    <h1>☁️ Partidas Guardadas en la Nube</h1>
                    <div id="savedGamesListContainer" style="margin-top: 20px;">
                        <div class="alert alert-info">Cargando partidas...</div>
                    </div>
                    <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="document.getElementById('savedGamesModal').classList.remove('active')">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Abrir modal
        document.getElementById('savedGamesModal').classList.add('active');
        
        // Cargar partidas
        try {
            const games = await window.loadUserSavedGames(window.currentUserId);
            const container = document.getElementById('savedGamesListContainer');
            
            if (!games || games.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No tienes partidas guardadas en la nube.</div>';
                return;
            }

            // Ordenar por fecha de guardado (más reciente primero)
            games.sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0));

            container.innerHTML = games.map(game => {
                const lastSavedDate = new Date(game.lastSaved || 0);
                const dateStr = lastSavedDate.toLocaleString('es-ES');
                
                return `
                    <div class="player-card" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #00ff00;">${game.name || 'Partida sin nombre'}</strong><br>
                            <span style="color: #999; font-size: 0.9em;">
                                Equipo: ${game.team || '?'} | 
                                Jornada: ${game.week || '?'} | 
                                División: ${game.division || '?'}
                            </span><br>
                            <span style="color: #666; font-size: 0.85em;">
                                Guardada: ${dateStr}
                            </span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-sm" onclick="window.loadGameFromCloudUI('${game.id}')">📂 Cargar</button>
                            <button class="btn btn-sm" style="background: #c73446;" onclick="window.deleteGameFromCloudUI('${game.id}', '${(game.name || 'esta partida').replace(/'/g, "\\'")}')">🗑️ Borrar</button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error cargando partidas:', error);
            document.getElementById('savedGamesListContainer').innerHTML = 
                '<div class="alert alert-error">❌ Error al cargar las partidas: ' + error.message + '</div>';
        }
    };

    // Función para cargar una partida específica
    window.loadGameFromCloudUI = async function(gameId) {
        if (!window.currentUserId) {
            alert('⚠️ Debes iniciar sesión para cargar partidas.');
            return;
        }

        if (!confirm('¿Cargar esta partida? Se perderá el progreso no guardado de la partida actual.')) {
            return;
        }

        try {
            const result = await window.loadGameFromCloud(window.currentUserId, gameId);
            
            if (result.success && result.data && result.data.gameState) {
                // Verificar que gameLogic esté disponible
                if (!window.gameLogic) {
                    alert('❌ Error: El sistema de juego no está cargado.');
                    return;
                }

                // Cargar el estado del juego
                window.gameLogic.updateGameState(result.data.gameState);
                
                // Guardar también en localStorage como backup
                window.gameLogic.saveToLocalStorage();
                
                // Refrescar la UI
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(result.data.gameState);
                }
                
                // Cerrar modal
                document.getElementById('savedGamesModal').classList.remove('active');
                
                // Ir a dashboard
                const dashboardButton = document.querySelector('.menu-item[onclick*="dashboard"]');
                if (dashboardButton && window.switchPage) {
                    window.switchPage('dashboard', dashboardButton);
                }
                
                alert(`✅ Partida "${result.data.name}" cargada correctamente!\n\nEquipo: ${result.data.team}\nJornada: ${result.data.week}`);
            } else {
                alert('❌ Error al cargar la partida: ' + (result.message || result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al cargar partida:', error);
            alert('❌ Error inesperado al cargar la partida: ' + error.message);
        }
    };

    // Función para eliminar una partida
    window.deleteGameFromCloudUI = async function(gameId, gameName) {
        if (!window.currentUserId) {
            alert('⚠️ Debes iniciar sesión para eliminar partidas.');
            return;
        }

        if (!confirm(`¿Estás seguro de que quieres eliminar "${gameName}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const result = await window.deleteGameFromCloud(window.currentUserId, gameId);
            
            if (result.success) {
                alert(`✅ Partida "${gameName}" eliminada correctamente.`);
                // Recargar la lista de partidas
                window.openSavedGamesModal();
            } else {
                alert('❌ Error al eliminar la partida: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al eliminar partida:', error);
            alert('❌ Error inesperado al eliminar la partida: ' + error.message);
        }
    };

    // ========================================
    // MODIFICAR LA SECCIÓN DE OPCIONES
    // ========================================

    function injectCloudLoadUI() {
        // Esperar a que el DOM esté listo
        const settingsPage = document.getElementById('settings');
        if (!settingsPage) {
            console.warn('⚠️ Página de settings no encontrada, reintentando...');
            setTimeout(injectCloudLoadUI, 500);
            return;
        }

        console.log('📝 Modificando sección de Opciones...');

        // Buscar el botón de "Cargar de la Nube" que tiene el alert
        const buttons = settingsPage.querySelectorAll('button');
        let cloudLoadButton = null;
        
        buttons.forEach(btn => {
            if (btn.textContent.includes('Cargar de la Nube') || btn.onclick?.toString().includes('Funcionalidad de cargar desde la nube')) {
                cloudLoadButton = btn;
            }
        });

        if (cloudLoadButton) {
            // Reemplazar el botón existente
            cloudLoadButton.onclick = window.openSavedGamesModal;
            cloudLoadButton.innerHTML = '☁️ Ver y Cargar Partidas de la Nube';
            console.log('✅ Botón de "Cargar de la Nube" actualizado');
        } else {
            // Si no existe, añadir una nueva sección completa
            const cloudSection = document.createElement('div');
            cloudSection.innerHTML = `
                <hr style="margin-top: 20px; border-color: rgba(233, 69, 96, 0.3);">
                <h2>☁️ Opciones de la Nube</h2>
                <p style="color: #999; margin-bottom: 10px;">
                    Las partidas se guardan automáticamente en la nube cuando haces clic en "💾 Guardar" en el header.
                </p>
                <button class="btn" onclick="window.openSavedGamesModal()">☁️ Ver y Cargar Partidas de la Nube</button>
            `;
            
            // Insertar antes del botón de cerrar (si existe)
            const closeButton = Array.from(buttons).find(btn => 
                btn.textContent.includes('Cerrar') || btn.style.background.includes('c73446')
            );
            
            if (closeButton) {
                closeButton.parentNode.insertBefore(cloudSection, closeButton);
            } else {
                settingsPage.appendChild(cloudSection);
            }
            console.log('✅ Sección de opciones de la nube añadida');
        }

        // Añadir indicador de estado de Firebase
        if (!document.getElementById('firebaseStatusIndicator')) {
            const statusIndicator = document.createElement('p');
            statusIndicator.id = 'firebaseStatusIndicator';
            statusIndicator.style.cssText = 'margin-top: 10px; color: #999; font-size: 0.9em;';
            statusIndicator.innerHTML = `
                <strong>Estado de Firebase:</strong> 
                <span id="firebaseStatus">Verificando...</span>
            `;
            
            // Insertar después del botón de la nube
            const cloudBtn = Array.from(settingsPage.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Ver y Cargar Partidas')
            );
            
            if (cloudBtn && cloudBtn.parentNode) {
                cloudBtn.parentNode.insertBefore(statusIndicator, cloudBtn.nextSibling);
            }
            
            // Actualizar estado después de un momento
            setTimeout(updateFirebaseStatus, 2000);
        }
    }

    // Función para actualizar el estado de Firebase
    function updateFirebaseStatus() {
        const statusSpan = document.getElementById('firebaseStatus');
        if (!statusSpan) return;

        if (window.firebaseConfig && window.firebaseConfig.enabled && window.currentUserId) {
            statusSpan.innerHTML = '✅ Conectado (Usuario: ' + window.currentUserId.substring(0, 8) + '...)';
            statusSpan.style.color = '#00ff00';
        } else if (window.firebaseConfig && window.firebaseConfig.enabled) {
            statusSpan.innerHTML = '⚠️ Firebase habilitado pero sin autenticar';
            statusSpan.style.color = 'orange';
        } else {
            statusSpan.innerHTML = '❌ Firebase deshabilitado (solo localStorage)';
            statusSpan.style.color = 'red';
        }
    }

    // Exponer función para actualizar estado (útil después del login)
    window.updateFirebaseStatusIndicator = updateFirebaseStatus;

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    window.addEventListener('DOMContentLoaded', () => {
        console.log('☁️ Inicializando Cloud Load Injector...');
        
        // Intentar inyectar después de un pequeño delay
        setTimeout(injectCloudLoadUI, 1000);
        
        // También intentar cuando se cambie a la página de settings
        const originalSwitchPage = window.switchPage;
        if (originalSwitchPage) {
            window.switchPage = function(pageId, element) {
                originalSwitchPage(pageId, element);
                if (pageId === 'settings') {
                    setTimeout(() => {
                        updateFirebaseStatus();
                    }, 100);
                }
            };
        }
    });

    // Actualizar estado cuando cambie el usuario
    const originalLoginUser = window.loginUser;
    if (originalLoginUser) {
        window.loginUser = function(...args) {
            const result = originalLoginUser.apply(this, args);
            if (result.success) {
                setTimeout(updateFirebaseStatus, 1000);
            }
            return result;
        };
    }

    console.log('✅ Cloud Load Injector cargado correctamente');
})();

// injector-budget.js
(function() {
    const CATEGORY_BUDGETS = {
        'primera': 50_000_000,
        'segunda': 20_000_000,
        'rfef_grupo1': 5_000_000,
        'rfef_grupo2': 5_000_000
    };
    
    // Interceptar cuando se selecciona un equipo
    const originalSelectTeam = window.gameLogic?.selectTeamWithInitialSquad;
    if (originalSelectTeam) {
        window.gameLogic.selectTeamWithInitialSquad = function(teamName, divisionType, gameMode) {
            // Llamar a la función original
            const result = originalSelectTeam.call(this, teamName, divisionType, gameMode);
            
            // Modificar el presupuesto según la división
            const state = window.gameLogic.getGameState();
            state.balance = CATEGORY_BUDGETS[divisionType] || state.balance;
            window.gameLogic.updateGameState(state);
            
            console.log(`Presupuesto inyectado para ${teamName} en ${divisionType}: ${state.balance.toLocaleString()}€`);
            return result;
        };
    }
})();

// injector-admin-complete.js
(function() {
    const DIVISIONS = {
        'primera': 'Primera División',
        'segunda': 'Segunda División',
        'rfef_grupo1': 'Primera RFEF Grupo 1',
        'rfef_grupo2': 'Primera RFEF Grupo 2'
    };

    window.openAdminPanel = function() {
        if (!window.gameLogic) {
            alert('El juego aún no está cargado completamente');
            return;
        }

        // Crear modal si no existe
        if (!document.getElementById('adminModal')) {
            const modal = document.createElement('div');
            modal.id = 'adminModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <span class="modal-close" onclick="document.getElementById('adminModal').classList.remove('active')">&times;</span>
                    <h1 style="color: #e94560;">🔧 Panel de Administración</h1>
                    
                    <div style="margin-bottom: 30px;">
                        <h2>Seleccionar Equipo</h2>
                        <label>División:</label>
                        <select id="adminDivisionSelect" onchange="window.adminBackend.loadTeamsFromDivision()" style="margin-bottom: 10px;">
                            <option value="">-- Selecciona una división --</option>
                            <option value="primera">Primera División</option>
                            <option value="segunda">Segunda División</option>
                            <option value="rfef_grupo1">Primera RFEF Grupo 1</option>
                            <option value="rfef_grupo2">Primera RFEF Grupo 2</option>
                        </select>
                        
                        <label>Equipo:</label>
                        <select id="adminTeamSelect" onchange="window.adminBackend.loadTeamData()">
                            <option value="">-- Selecciona un equipo --</option>
                        </select>
                    </div>

                    <div id="adminTeamDataContainer" style="display: none;">
                        <h2>Datos del Equipo: <span id="adminCurrentTeamName"></span></h2>
                        
                        <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <h3>🏟️ Estadio</h3>
                            <div style="margin-bottom: 10px;">
                                <label>Nombre del estadio:</label>
                                <input id="adminStadiumName" type="text" placeholder="Ej: Santiago Bernabéu">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label>Capacidad:</label>
                                <input id="adminStadiumCapacity" type="number" step="1000" min="1000">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label>Foto del estadio (.png):</label>
                                <input id="adminStadiumImage" type="file" accept="image/png,image/jpeg">
                                <div id="adminStadiumPreview" style="margin-top: 10px;"></div>
                            </div>
                        </div>

                        <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <h3>🛡️ Escudo</h3>
                            <div style="margin-bottom: 10px;">
                                <label>Escudo del equipo (.png):</label>
                                <input id="adminTeamLogo" type="file" accept="image/png,image/jpeg">
                                <div id="adminLogoPreview" style="margin-top: 10px;"></div>
                            </div>
                        </div>

                        <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <h3>💰 Presupuesto Inicial</h3>
                            <div style="margin-bottom: 10px;">
                                <label>Presupuesto inicial (€):</label>
                                <input id="adminInitialBudget" type="number" step="1000000" min="0">
                                <small style="display: block; color: #999; margin-top: 5px;">Este será el presupuesto al iniciar con este equipo</small>
                            </div>
                        </div>

                        <div style="margin-top: 20px;">
                            <button class="btn" onclick="window.adminBackend.saveTeamData()">💾 Guardar Datos</button>
                            <button class="btn" style="background: #ff9500;" onclick="window.adminBackend.exportAllData()">📦 Exportar Todos los Datos</button>
                            <button class="btn" style="background: #00aa00;" onclick="document.getElementById('adminImportFile').click()">📥 Importar Datos</button>
                            <input type="file" id="adminImportFile" accept=".json" style="display: none;" onchange="window.adminBackend.importAllData(event)">
                        </div>
                    </div>

                    <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="document.getElementById('adminModal').classList.remove('active')">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('adminModal').classList.add('active');
    };

    window.adminBackend = {
        currentTeam: null,
        currentDivision: null,

        loadTeamsFromDivision: function() {
            const divisionKey = document.getElementById('adminDivisionSelect').value;
            const teamSelect = document.getElementById('adminTeamSelect');
            
            if (!divisionKey) {
                teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>';
                document.getElementById('adminTeamDataContainer').style.display = 'none';
                return;
            }

            this.currentDivision = divisionKey;
            const teams = window.TEAMS_DATA[divisionKey] || [];
            
            teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>' + 
                teams.map(team => `<option value="${team}">${team}</option>`).join('');
            
            document.getElementById('adminTeamDataContainer').style.display = 'none';
        },

       // En injector-admin-complete.js, modificar loadTeamData:
loadTeamData: async function() {
    const teamName = document.getElementById('adminTeamSelect').value;
    if (!teamName) {
        document.getElementById('adminTeamDataContainer').style.display = 'none';
        return;
    }

    this.currentTeam = teamName;
    document.getElementById('adminCurrentTeamName').textContent = teamName;
    document.getElementById('adminTeamDataContainer').style.display = 'block';

    // Cargar datos usando la nueva función que busca en Firebase
    const teamData = await window.getTeamData(teamName);

    // Rellenar formulario
    document.getElementById('adminStadiumName').value = teamData.stadiumName || '';
    document.getElementById('adminStadiumCapacity').value = teamData.stadiumCapacity || 10000;
    document.getElementById('adminInitialBudget').value = teamData.initialBudget || 5000000;

    // Mostrar previews si existen
    if (teamData.logo) {
        document.getElementById('adminLogoPreview').innerHTML = 
            `<img src="${teamData.logo}" style="max-width: 100px; max-height: 100px; border: 2px solid #e94560; border-radius: 5px;">`;
    } else {
        document.getElementById('adminLogoPreview').innerHTML = '<p style="color: #999;">No hay escudo cargado</p>';
    }

    if (teamData.stadiumImage) {
        document.getElementById('adminStadiumPreview').innerHTML = 
            `<img src="${teamData.stadiumImage}" style="max-width: 200px; max-height: 150px; border: 2px solid #e94560; border-radius: 5px;">`;
    } else {
        document.getElementById('adminStadiumPreview').innerHTML = '<p style="color: #999;">No hay foto del estadio</p>';
    }
},

// Modificar saveTeamData:
saveTeamData: async function() {
    if (!this.currentTeam) {
        alert('Selecciona un equipo primero');
        return;
    }

    const logoFile = document.getElementById('adminTeamLogo').files[0];
    const stadiumFile = document.getElementById('adminStadiumImage').files[0];

    const teamData = {
        stadiumName: document.getElementById('adminStadiumName').value || 'Estadio Municipal',
        stadiumCapacity: parseInt(document.getElementById('adminStadiumCapacity').value) || 10000,
        initialBudget: parseInt(document.getElementById('adminInitialBudget').value) || 5000000,
        logo: null,
        stadiumImage: null
    };

    // Cargar datos existentes
    const existingData = await window.getTeamData(this.currentTeam);
    teamData.logo = existingData.logo;
    teamData.stadiumImage = existingData.stadiumImage;

    // Procesar archivos de imagen
    const promises = [];

    if (logoFile) {
        promises.push(
            new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    teamData.logo = e.target.result;
                    resolve();
                };
                reader.readAsDataURL(logoFile);
            })
        );
    }

    if (stadiumFile) {
        promises.push(
            new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    teamData.stadiumImage = e.target.result;
                    resolve();
                };
                reader.readAsDataURL(stadiumFile);
            })
        );
    }

    await Promise.all(promises);

    // Guardar en Firebase y localStorage
    const saveResult = await window.saveTeamData(this.currentTeam, teamData);
    
    if (saveResult.success) {
        // Actualizar el juego si es el equipo actual
        if (window.gameLogic) {
            const state = window.gameLogic.getGameState();
            if (state.team === this.currentTeam) {
                console.log('🔄 Actualizando datos del equipo actual en el juego...');
                state.teamLogo = teamData.logo;
                state.stadiumImage = teamData.stadiumImage;
                state.stadiumName = teamData.stadiumName;
                state.stadiumCapacity = teamData.stadiumCapacity;
                
                window.gameLogic.updateGameState(state);
                
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(state);
                }
            }
        }
        
        alert(`✅ Datos guardados en Firebase para ${this.currentTeam}:\n\n` +
              `🏟️ Estadio: ${teamData.stadiumName}\n` +
              `👥 Capacidad: ${teamData.stadiumCapacity.toLocaleString()}\n` +
              `💰 Presupuesto: ${teamData.initialBudget.toLocaleString()}€\n` +
              `🛡️ Escudo: ${teamData.logo ? 'Sí' : 'No'}\n` +
              `📷 Foto estadio: ${teamData.stadiumImage ? 'Sí' : 'No'}`);
        
        this.loadTeamData();
    } else {
        alert(`❌ Error al guardar en Firebase: ${saveResult.error}\n\nLos datos se guardaron localmente, pero no se sincronizaron.`);
    }
},

// Modificar exportAllData:
exportAllData: async function() {
    const allData = await window.getAllTeamsData();

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcfutbol_teams_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    alert(`✅ Datos exportados correctamente (${Object.keys(allData).length} equipos)`);
},

// Modificar importAllData:
importAllData: async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Guardar todos los datos en Firebase
            const promises = Object.keys(data).map(teamName => 
                window.saveTeamData(teamName, data[teamName])
            );
            
            await Promise.all(promises);
            
            alert(`✅ Datos importados correctamente a Firebase para ${Object.keys(data).length} equipos`);
            
            if (this.currentTeam) {
                await this.loadTeamData();
            }
        } catch (error) {
            alert('❌ Error al importar los datos: ' + error.message);
       }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}
    }; // <-- Este es el cierre del objeto window.adminBackend

    // Auto-activar panel de admin al cargar (para testing)
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            // Añadir botón de admin al header
            const headerInfo = document.querySelector('.header-info');
            if (headerInfo && !document.getElementById('adminButton')) {
                const adminBtn = document.createElement('button');
                adminBtn.id = 'adminButton';
                adminBtn.className = 'btn btn-sm';
                adminBtn.innerHTML = '⚙️ Admin';
                adminBtn.onclick = () => window.openAdminPanel();
                adminBtn.style.background = '#ff9500';
                headerInfo.appendChild(adminBtn);
            }
        }, 1000);
    });
})();

<!DOCTYPE HTML>

<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PC Fútbol Manager</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Firebase Config y Injectors -->
    <script type="module" src="./firebase-config.js"></script>
    <script type="module" src="./injector-firebase-sync.js"></script>

        
    <!-- HEADER -->
    <div class="header">
        <div class="header-info">
            <img id="teamLogoHeader" class="team-logo-header" src="" alt="Logo" style="display: none;">
            <div class="info-box">
                <span>Equipo:</span>
                <span id="teamName">-</span>
            </div>
        </div>
        
        <div class="header-title">⚽ PC FÚTBOL MANAGER</div>
        
        <div class="header-info">
            <div class="info-box">
                <span>Jornada:</span>
                <span id="weekNo">1</span>
            </div>
            <div class="info-box">
                <span>Dinero:</span>
                <span id="balanceDisplay">0€</span>
            </div>
        </div>
    </div>

    <!-- MAIN LAYOUT - 4 CUADRANTES -->
    <div class="main-layout">
        
        <!-- CUADRANTE SUPERIOR IZQUIERDO: INFORMACIÓN -->
        <div class="quadrant top-left">
            <div class="section-title">📊 INFORMACIÓN</div>
            <button class="menu-button blue-button results-icon" onclick="openPage('dashboard')">Resultados</button>
            <button class="menu-button blue-button classification-icon" onclick="openPage('standings')">Clasificación</button>
            <button class="menu-button blue-button calendar-icon" onclick="openPage('calendar')">Calendario</button>
        </div>

        <!-- CUADRANTE SUPERIOR DERECHO: EQUIPO -->
        <div class="quadrant top-right">
            <div class="section-title">👥 EQUIPO</div>
            <button class="menu-button green-button lineup-icon" onclick="openPage('lineup')">Alineación</button>
            <button class="menu-button green-button tactics-icon" onclick="openPage('tactics')">Táctica</button>
            <button class="menu-button green-button" style="opacity: 0.5; cursor: not-allowed;">Ver Rival</button>
        </div>

        <!-- CUADRANTE INFERIOR IZQUIERDO: FICHAJES -->
        <div class="quadrant bottom-left">
            <div class="section-title">🔄 FICHAJES</div>
            <button class="menu-button orange-button transfer-icon" onclick="openPage('transfers')">Fichar</button>
            <button class="menu-button orange-button squad-icon" onclick="openPage('squad')">Plantilla</button>
            <button class="menu-button orange-button" onclick="openPage('academy')">Cantera</button>
        </div>

        <!-- CUADRANTE INFERIOR DERECHO: GESTIÓN -->
        <div class="quadrant bottom-right">
            <div class="section-title">💼 GESTIÓN</div>
            <button class="menu-button red-button staff-icon" onclick="openPage('staff')">Empleados</button>
            <button class="menu-button red-button cash-icon" onclick="openPage('finance')">Caja</button>
            <button class="menu-button red-button decisions-icon" onclick="openPage('commercial')">Decisiones</button>
            <button class="menu-button red-button stadium-icon" onclick="openPage('facilities')">Estadio</button>
        </div>

        <!-- CÍRCULO CENTRAL: ACCIONES PRINCIPALES -->
        <div class="main-center-circle">
            <button class="center-option simulate-btn" onclick="window.simulateWeek()">⏩ SEGUIR</button>
            <button class="center-option save-btn" onclick="window.saveCurrentGame()">💾 GRABAR LIGA</button>
            <button class="center-option load-btn" onclick="window.openSettingsPage()">☁️ CARGAR PARTIDA</button>
            <button class="center-option exit-btn" onclick="window.openModal('gameMode')">Nuevo Juego</button>
        </div>
    </div>

    <!-- ============================================
         PÁGINAS DE CONTENIDO (Ocultas por defecto)
         ============================================ -->

 <!-- SECCIÓN DE SETTINGS OCULTA -->
    <div id="settingsPage" class="page" style="display: none;">
        <div id="settings" class="settings-container">
            <h1>⚙️ Opciones</h1>
            <p>Aquí se cargarán las opciones y el botón de la nube por el injector.</p>
            <!-- injector-cloud-load.js inyectará la sección de Cloud Load aquí -->
        </div>
        <button class="btn" onclick="window.closeSettingsPage()">Cerrar</button>
    </div>
    
    <!-- RENOVAR CONTRATOS -->
<div id="renewContracts" class="page">
    <div class="page-header">
        <h1>✍️ Renovar Contratos</h1>
        <button class="page-close-btn" onclick="closePage('renewContracts')">✖ CERRAR</button>
    </div>
    <div id="renewContractsContent">
        <!-- La tabla de jugadores se cargará aquí -->
    </div>
</div>


    
    <!-- DASHBOARD / RESULTADOS -->
    <div id="dashboard" class="page">
        <div class="page-header">
            <h1>📊 Dashboard del Club</h1>
            <button class="page-close-btn" onclick="closePage('dashboard')">✖ CERRAR</button>
        </div>
        
        <div id="warningAlert" style="display: none;"></div>
        
        <div class="data-grid">
            <div class="data-box">
                <div class="data-label">Posición</div>
                <div class="data-value" id="dashPos">-</div>
            </div>
            <div class="data-box">
                <div class="data-label">Puntos</div>
                <div class="data-value" id="dashPts">0</div>
            </div>
            <div class="data-box">
                <div class="data-label">PJ</div>
                <div class="data-value" id="dashPJ">0</div>
            </div>
            <div class="data-box">
                <div class="data-label">Goles</div>
                <div class="data-value" id="dashGoals">0</div>
            </div>
            <div class="data-box">
                <div class="data-label">Jugadores</div>
                <div class="data-value" id="dashSquad">0</div>
            </div>
            <div class="data-box">
                <div class="data-label">Juveniles</div>
                <div class="data-value" id="dashAcademy">0</div>
            </div>
        </div>
        
        <h2>Estado Financiero</h2>
        <table>
            <tr><td>Dinero en Caja:</td><td id="dashBalance">0€</td></tr>
            <tr><td>Ingresos Semanales:</td><td id="dashIncome">0€</td></tr>
            <tr><td>Gastos Semanales:</td><td id="dashExpenses">0€</td></tr>
            <tr><td>Balance Semanal:</td><td id="dashWeekly" class="data-value">+0€</td></tr>
        </table>
        
        <h2>Últimas Noticias</h2>
        <div id="newsFeed">
            <div class="alert alert-info">No hay noticias recientes.</div>
        </div>
    </div>

    <!-- CLASIFICACIÓN -->
    <div id="standings" class="page">
        <div class="page-header">
            <h1>📈 Clasificación Liga</h1>
            <button class="page-close-btn" onclick="closePage('standings')">✖ CERRAR</button>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Pos</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
                    <th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
                </tr>
            </thead>
            <tbody id="standingsTable"></tbody>
        </table>
    </div>

    <!-- CALENDARIO -->
    <div id="calendar" class="page">
        <div class="page-header">
            <h1>📅 Calendario de Partidos</h1>
            <button class="page-close-btn" onclick="closePage('calendar')">✖ CERRAR</button>
        </div>
        
        <div id="calendarContent">
            <div class="alert alert-info">Aquí se mostrarán los partidos de tu división.</div>
        </div>
    </div>

    <!-- ALINEACIÓN -->
    <div id="lineup" class="page">
        <div class="page-header">
            <h1>⚽ Alineación</h1>
            <button class="page-close-btn" onclick="closePage('lineup')">✖ CERRAR</button>
        </div>
        
        <p class="alert alert-info" id="lineupMessage">Arrastra y suelta jugadores para configurar tu alineación. Los jugadores lesionados no pueden ser alineados.</p>
        
        <div class="pitch-container" id="pitchContainer">
            <!-- Aquí se renderizarán los 11 titulares -->
        </div>
        
        <div class="reserves-container">
            <h2>Suplentes y No Convocados</h2>
            <div class="reserves-list" id="reservesList">
                <!-- Aquí se renderizarán los suplentes -->
            </div>
        </div>
        
        <button class="btn" style="margin-top: 20px;" onclick="window.saveLineup()">Guardar Alineación</button>
    </div>

    <!-- TÁCTICAS -->
    <div id="tactics" class="page">
        <div class="page-header">
            <h1>🎯 Tácticas</h1>
            <button class="page-close-btn" onclick="closePage('tactics')">✖ CERRAR</button>
        </div>
        
        <div class="form-group" style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 5px;">Formación:</label>
            <select id="formationSelect" onchange="window.updateFormation()">
                <option value="433">4-3-3 Ofensiva</option>
                <option value="442">4-4-2 Clásica</option>
                <option value="352">3-5-2 Ultra Ofensiva</option>
                <option value="541">5-4-1 Defensiva</option>
                <option value="451">4-5-1 Contención</option>
            </select>
            
            <label style="display: block; margin-top: 15px; margin-bottom: 5px;">Mentalidad:</label>
            <select id="mentalitySelect" onchange="window.updateMentality()">
                <option value="defensive">Defensiva</option>
                <option value="balanced" selected>Equilibrada</option>
                <option value="offensive">Ofensiva</option>
            </select>
        </div>
    </div>

    <!-- MERCADO / FICHAJES -->
    <div id="transfers" class="page">
        <div class="page-header">
            <h1>🔄 Mercado de Fichajes</h1>
            <button class="page-close-btn" onclick="closePage('transfers')">✖ CERRAR</button>
        </div>
        
        <div class="alert alert-info">💡 Busca talentos jóvenes para comprar barato y revender caro, o refuerza tu equipo.</div>
        
        <h2>Buscar Jugadores</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="marketSearchName" placeholder="Nombre del jugador" style="width: 150px;">
            <select id="marketPosition" style="width: 120px;">
                <option value="ALL">Posición</option>
            </select>
            <input type="number" id="marketMinOverall" placeholder="Media min." min="1" max="99" style="width: 100px;">
            <input type="number" id="marketMaxAge" placeholder="Edad max." min="16" max="40" style="width: 100px;">
            <label style="display:flex; align-items:center; gap: 5px;">
                <input type="checkbox" id="marketTransferListed" style="width:auto;"> Transferibles
            </label>
            <label style="display:flex; align-items:center; gap: 5px;">
                <input type="checkbox" id="marketLoanListed" style="width:auto;"> Cedibles
            </label>
            <button class="btn btn-sm" onclick="window.searchPlayersMarket()">Buscar</button>
            <button class="btn btn-sm" onclick="window.clearPlayerMarketFilters()" style="background: #c73446;">Limpiar</button>
        </div>
        
        <div id="availablePlayersSearchResult" style="margin-top: 20px;">
            <div class="alert alert-info">Utiliza los filtros de búsqueda para encontrar jugadores.</div>
        </div>
        
        <h2>Contratar Jóvenes de Cantera</h2>
        <div id="availableYoungstersList" style="margin-top: 20px;"></div>
    </div>

    <!-- PLANTILLA -->
    <div id="squad" class="page">
        <div class="page-header">
            <h1>👥 Plantilla</h1>
            <button class="page-close-btn" onclick="closePage('squad')">✖ CERRAR</button>
        </div>
        
        <div id="squadList" style="margin-top: 20px;"></div>
    </div>

    <!-- CANTERA -->
    <div id="academy" class="page">
        <div class="page-header">
            <h1>🎓 Academia y Cantera</h1>
            <button class="page-close-btn" onclick="closePage('academy')">✖ CERRAR</button>
        </div>
        
        <button class="btn" onclick="window.openModal('signYoungster')">+ Contratar Joven de Mercado</button>
        <div id="academyList" style="margin-top: 20px;"></div>
    </div>

    <!-- STAFF / EMPLEADOS -->
    <div id="staff" class="page">
        <div class="page-header">
            <h1>👔 Personal del Club</h1>
            <button class="page-close-btn" onclick="closePage('staff')">✖ CERRAR</button>
        </div>
        
        <table>
            <thead>
                <tr><th>Rol</th><th>Nombre</th><th>Nivel</th><th>Salario</th><th>Cláusula</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                <tr><td>🏥 Médico</td><td id="staffMedicoName"></td><td id="staffMedicoLevel"></td><td id="staffMedicoSalary"></td><td id="staffMedicoClausula"></td><td><button class="btn btn-sm" id="btnHireMedico" onclick="window.openHireStaffModal('medico')"></button></td></tr>
                <tr><td>🧪 Entrenador Físico</td><td id="staffEntrenadorName"></td><td id="staffEntrenadorLevel"></td><td id="staffEntrenadorSalary"></td><td id="staffEntrenadorClausula"></td><td><button class="btn btn-sm" id="btnHireEntrenador" onclick="window.openHireStaffModal('entrenador')"></button></td></tr>
                <tr><td>⚽ Entrenador Porteros</td><td id="staffEntrenadorPorterosName"></td><td id="staffEntrenadorPorterosLevel"></td><td id="staffEntrenadorPorterosSalary"></td><td id="staffEntrenadorPorterosClausula"></td><td><button class="btn btn-sm" id="btnHireEntrenadorPorteros" onclick="window.openHireStaffModal('entrenadorPorteros')"></button></td></tr>
                <tr><td>🩹 Fisioterapeuta</td><td id="staffFisioName"></td><td id="staffFisioLevel"></td><td id="staffFisioSalary"></td><td id="staffFisioClausula"></td><td><button class="btn btn-sm" id="btnHireFisio" onclick="window.openHireStaffModal('fisio')"></button></td></tr>
                <tr><td>🎬 Analista Vídeo</td><td id="staffAnalistaName"></td><td id="staffAnalistaLevel"></td><td id="staffAnalistaSalary"></td><td id="staffAnalistaClausula"></td><td><button class="btn btn-sm" id="btnHireAnalista" onclick="window.openHireStaffModal('analista')"></button></td></tr>
                <tr><td>🔍 Ojeador</td><td id="staffScoutName"></td><td id="staffScoutLevel"></td><td id="staffScoutSalary"></td><td id="staffScoutClausula"></td><td><button class="btn btn-sm" id="btnHireScout" onclick="window.openHireStaffModal('scout')"></button></td></tr>
                <tr><td>✍️ Secretario Técnico</td><td id="staffSecretarioName"></td><td id="staffSecretarioLevel"></td><td id="staffSecretarioSalary"></td><td id="staffSecretarioClausula"></td><td><button class="btn btn-sm" id="btnHireSecretario" onclick="window.openHireStaffModal('secretario')"></button></td></tr>
                <tr><td>🧑‍🏫 Segundo Entrenador</td><td id="staffSegundoEntrenadorName"></td><td id="staffSegundoEntrenadorLevel"></td><td id="staffSegundoEntrenadorSalary"></td><td id="staffSegundoEntrenadorClausula"></td><td><button class="btn btn-sm" id="btnHireSegundoEntrenador" onclick="window.openHireStaffModal('segundoEntrenador')"></button></td></tr>
            </tbody>
        </table>
    </div>

    <!-- FINANZAS / CAJA -->
    <div id="finance" class="page">
        <div class="page-header">
            <h1>💼 Finanzas</h1>
            <button class="page-close-btn" onclick="closePage('finance')">✖ CERRAR</button>
        </div>
        
        <div class="data-grid">
            <div class="data-box">
                <div class="data-label">Ingresos/Semana</div>
                <div class="data-value" id="financeWeeklyIncome">0€</div>
            </div>
            <div class="data-box">
                <div class="data-label">Gastos/Semana</div>
                <div class="data-value negative" id="financeWeeklyExpenses">0€</div>
            </div>
            <div class="data-box">
                <div class="data-label">Balance Actual</div>
                <div class="data-value" id="financeBalance">0€</div>
            </div>
        </div>
        
        <h2>Detalle de Ingresos</h2>
        <table>
            <tr><td>Capacidad Estadio:</td><td id="financeStadiumCapacity">0</td></tr>
            <tr><td>Asistencia Esperada:</td><td id="financeExpectedAttendance">0</td></tr>
            <tr><td>Precio Entrada:</td><td><input type="number" id="ticketPriceInput" min="5" max="100" onchange="window.setTicketPriceFromInput()">€</td></tr>
            <tr><td>Popularidad del Club:</td><td id="financePopularity">0%</td></tr>
            <tr><td>Fanbase:</td><td id="financeFanbase">0</td></tr>
            <tr><td>Merchandising vendido:</td><td id="financeMerchandisingItemsSold">0</td></tr>
            <tr><td>Precio Merchandising:</td><td><input type="number" id="merchandisingPriceInput" min="1" max="50" onchange="window.setMerchandisingPriceFromInput()">€</td></tr>
            <tr><td>Ingresos Merchandising:</td><td id="financeMerchandisingRevenue">0€</td></tr>
        </table>
    </div>

    <!-- COMERCIAL / DECISIONES -->
    <div id="commercial" class="page">
        <div class="page-header">
            <h1>🛒 Gestión Comercial</h1>
            <button class="page-close-btn" onclick="closePage('commercial')">✖ CERRAR</button>
        </div>
        
        <div class="data-grid">
            <div class="data-box">
                <div class="data-label">Popularidad del Club</div>
                <div class="data-value" id="commercialPopularity">0%</div>
            </div>
            <div class="data-box">
                <div class="data-label">Base de Fans</div>
                <div class="data-value" id="commercialFanbase">0</div>
            </div>
            <div class="data-box">
                <div class="data-label">Merchandising Vendido (semana)</div>
                <div class="data-value" id="commercialItemsSold">0</div>
            </div>
            <div class="data-box">
                <div class="data-label">Ingresos Merchandising (semana)</div>
                <div class="data-value" id="commercialMerchRevenue">0€</div>
            </div>
        </div>
        
        <h2>Ajustes Comerciales</h2>
        <p>Ajusta el precio de tus entradas y merchandising para maximizar beneficios. Ten en cuenta que precios muy altos pueden reducir la popularidad y la asistencia.</p>
        
        <div style="margin-top: 20px;">
            <label style="display: block; margin-bottom: 5px;">Precio de la Entrada (actual: <span id="currentTicketPrice">0</span>€):</label>
            <input type="range" id="ticketPriceSlider" min="5" max="100" value="20" oninput="window.updateTicketPriceDisplay(this.value)" onchange="window.setTicketPriceFromSlider(this.value)">
            <span id="ticketPriceSliderValue">20</span>€
        </div>
        
        <div style="margin-top: 15px;">
            <label style="display: block; margin-bottom: 5px;">Precio del Merchandising (actual: <span id="currentMerchandisingPrice">0</span>€):</label>
            <input type="range" id="merchandisingPriceSlider" min="1" max="50" value="10" oninput="window.updateMerchandisingPriceDisplay(this.value)" onchange="window.setMerchandisingPriceFromSlider(this.value)">
            <span id="merchandisingPriceSliderValue">10</span>€
        </div>
    </div>

    <!-- INSTALACIONES / ESTADIO -->
    <div id="facilities" class="page">
        <div class="page-header">
            <h1>🏟️ Instalaciones</h1>
            <button class="page-close-btn" onclick="closePage('facilities')">✖ CERRAR</button>
        </div>
        
        <!-- Sección del Estadio -->
        <div class="facility-section">
            <h2>Estadio</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <p style="margin-bottom: 10px;"><strong>Nombre:</strong> <span id="stadiumNameDisplay" style="color: #00ff00;">-</span></p>
                    <p style="margin-bottom: 10px;"><strong>Capacidad actual:</strong> <span id="currentStadiumCapacity" style="color: #00ff00;">0</span> espectadores</p>
                    <button class="btn" onclick="window.expandStadium()">Expandir Estadio (+10.000 asientos - 50.000€)</button>
                </div>
                <div id="stadiumImageContainer" style="text-align: center;">
                    <p style="color: #999;">No hay imagen del estadio disponible</p>
                </div>
            </div>
        </div>
        
        <!-- Sección del Centro de Entrenamiento -->
        <div class="facility-section">
            <h2>Centro de Entrenamiento</h2>
            <p style="margin-bottom: 15px;"><strong>Nivel actual:</strong> <span id="currentTrainingLevel" style="color: #00ff00; font-size: 1.5em;">1</span></p>
            <p style="color: #999; margin-bottom: 15px; font-size: 0.9em;">Un mejor centro de entrenamiento mejora la efectividad de los entrenamientos individuales</p>
            <button class="btn" onclick="window.improveFacilities()">Mejorar Entrenamientos (30.000€)</button>
        </div>
    </div>

    <!-- ============================================
         MODALES (mantienen la misma estructura)
         ============================================ -->

    <!-- MODAL: Selección de Modo de Juego -->
    <div id="gameModeModal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="window.closeModal('gameMode')">&times;</span>
            <h1>Modo de Juego</h1>
            <button class="btn" style="width: 100%; padding: 20px; margin-top: 20px;" onclick="window.startGameMode('manager')">🏅 Liga Manager (Empezar con equipo preexistente)</button>
            <button class="btn" style="width: 100%; padding: 20px; margin-top: 20px;" onclick="window.startGameMode('promanager')">🚀 Liga Promanager (Empezar desde abajo)</button>
        </div>
    </div>

        <!-- MODAL: Selección de Equipo -->
    <div id="selectTeamModal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="window.closeModal('selectTeam')">&times;</span>
            <h1>Selecciona tu Equipo</h1>
            <h2>Primera División</h2>
            <div id="primeraList" class="team-selection-list"></div>
            <h2>Segunda División</h2>
            <div id="segundaList" class="team-selection-list"></div>
            <h2>Primera RFEF Grupo 1</h2>
            <div id="rfef_grupo1List" class="team-selection-list"></div>
            <h2>Primera RFEF Grupo 2</h2>
            <div id="rfef_grupo2List" class="team-selection-list"></div>
        </div>
    </div>

    <!-- MODAL: Contratar Joven -->
    <div id="signYoungsterModal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="window.closeModal('signYoungster')">&times;</span>
            <h1>Contratar Joven</h1>
            <div id="availableYoungstersList"></div>
        </div>
    </div>

    <!-- MODAL: Negociación -->
    <div id="negotiationModal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="window.endNegotiationUI(false)">&times;</span>
            <h1>Negociación de Fichajes</h1>
            
            <div class="negotiation-player-info">
                <h3><span id="negotiationPlayerName"></span> (<span id="negotiationPlayerClub"></span>)</h3>
                <p>Posición: <span id="negotiationPlayerPosition"></span> | Edad: <span id="negotiationPlayerAge"></span> | Media: <span id="negotiationPlayerOverall"></span> | Potencial: <span id="negotiationPlayerPotential"></span></p>
                <p>Salario Actual: <span id="negotiationPlayerCurrentSalary"></span>€/sem | Valor de Mercado: <span id="negotiationPlayerValue"></span>€</p>
                <p id="negotiationPlayerAskingPrice" style="display: none;"><span style="color: orange; font-weight: bold;">Precio solicitado: <span id="negotiationPlayerAskingPriceValue"></span>€</span></p>
                <p id="negotiationPlayerLoanInfo" style="display: none;"><span style="color: lightblue; font-weight: bold;">Cedible (club actual paga <span id="negotiationPlayerLoanContribution"></span>€/sem)</span></p>
            </div>
            
            <!-- PASO 1: Oferta al Jugador -->
            <div id="negotiationStep1" class="negotiation-step">
                <h2>Paso 1: Ofrecer Contrato Personal a <span id="negotiationPlayerNameStep1"></span></h2>
                <label for="offeredSalary">Salario Semanal:</label>
                <input type="number" id="offeredSalary" value="0" min="0" step="100">€
                
                <div class="negotiation-incentives">
                    <div><input type="checkbox" id="offeredBonus"><label for="offeredBonus">Prima por Fichaje</label></div>
                    <div><input type="checkbox" id="offeredCar"><label for="offeredCar">Coche</label></div>
                    <div><input type="checkbox" id="offeredHouse"><label for="offeredHouse">Casa</label></div>
                    <div><input type="checkbox" id="offeredMerchPercent"><label for="offeredMerchPercent">% Merchandising</label></div>
                    <div><input type="checkbox" id="offeredTicketPercent"><label for="offeredTicketPercent">% Entradas</label></div>
                </div>
                <button class="btn" onclick="window.submitPlayerOffer()">Hacer Oferta al Jugador</button>
                <button class="btn" style="background: #c73446;" onclick="window.endNegotiationUI(false)">Cancelar Negociación</button>
            </div>
            
            <!-- PASO 2: Oferta al Club -->
            <div id="negotiationStep2" class="negotiation-step" style="display: none;">
                <h2>Paso 2: Negociar con el Club <span id="negotiationPlayerClubStep2"></span></h2>
                <p id="negotiationClubMessage"></p>
                
                <!-- Si es cesión -->
                <div id="negotiationLoanOffer" style="display: none;">
                    <label for="loanWageContribution">¿Qué porcentaje de su salario semanal pagarías? (Actual: <span id="loanPlayerSalaryExample"></span>€)</label>
                    <input type="range" id="loanWageContribution" min="0" max="100" value="50" oninput="document.getElementById('loanWageContributionValue').textContent=this.value+'%'">
                    <span id="loanWageContributionValue">50</span>%
                    <p class="alert alert-info">El club de origen paga <span id="loanClubContributionInfo"></span>€ de su salario actual.</p>
                    <button class="btn" onclick="window.submitLoanOffer()">Hacer Oferta de Cesión</button>
                </div>
                
                <!-- Si es traspaso -->
                <div id="negotiationTransferOffer" style="display: none;">
                    <label for="offerAmount">Cantidad de Traspaso:</label>
                    <input type="number" id="offerAmount" value="0" min="0" step="1000">€
                    <label style="margin-top: 15px;">Jugadores a incluir en el intercambio (opcional):</label>
                    <select id="playerExchangeSelect" multiple style="min-height: 100px;"></select>
                    <button class="btn" onclick="window.submitTransferOffer()">Hacer Oferta de Traspaso</button>
                </div>
                <button class="btn" style="background: #c73446; margin-top: 10px;" onclick="window.endNegotiationUI(false)">Cancelar Negociación</button>
            </div>
        </div>
    </div>

    <!-- MODAL: Entrenamiento -->
    <div id="trainingModal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="window.closeModal('training')">&times;</span>
            <h1>Entrenamiento Individual</h1>
            
            <div class="training-player-info">
                <h3>Jugador: <span id="trainingPlayerName"></span></h3>
                <p>Posición: <span id="trainingPlayerPosition"></span> | Media: <span id="trainingPlayerOverall"></span> | Potencial: <span id="trainingPlayerPotential"></span></p>
                <p>Atributos actuales:</p>
                <ul id="trainingPlayerAttributes" style="list-style: none; display: flex; flex-wrap: wrap; gap: 10px;"></ul>
            </div>
            
            <p class="alert alert-info" id="trainingInfoMessage">Selecciona un atributo para que <span id="trainingPlayerNameInfo"></span> se enfoque esta semana.</p>
            <div id="trainingStaffWarning" class="alert alert-warning" style="display: none;">
                ⚠️ ¡Advertencia! No tienes un entrenador físico contratado. El entrenamiento será menos efectivo.
            </div>
            <div id="trainingGkStaffWarning" class="alert alert-warning" style="display: none;">
                ⚠️ ¡Advertencia! No tienes un entrenador de porteros contratado. El entrenamiento para POR será menos efectivo.
            </div>
            
            <div class="attribute-selection" style="margin-top: 20px;">
                <p>Seleccionar atributo para entrenar:</p>
                <div id="attributeRadioButtons"></div>
            </div>
            
            <button class="btn" style="margin-top: 20px;" onclick="window.submitTrainingFocus()">Establecer Foco de Entrenamiento</button>
            <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="window.closeModal('training')">Cerrar</button>
        </div>
    </div>

    <!-- MODAL: Contratar Staff -->
    <div id="hireStaffModal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="window.closeModal('hireStaff')">&times;</span>
            <h1>Contratar Personal: <span id="staffRoleDisplayName"></span></h1>
            <p>Selecciona un candidato para el puesto de <span id="staffRoleDisplayNameInfo"></span>.</p>
            <div id="staffCandidatesList" style="margin-top: 20px;"></div>
            <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="window.closeModal('hireStaff')">Cancelar</button>
        </div>
    </div>

    <!-- MODAL: Resultado del Partido -->
    <div id="matchResultModal" class="modal">
        <div class="modal-content" style="text-align: center; max-width: 500px; padding: 40px;">
            <h1 id="matchResultTitle" style="color: #00ff00; margin-bottom: 20px;"></h1>
            <div id="matchResultDetails" style="font-size: 1.5em; font-weight: bold;"></div>
            <p id="matchResultMessage" style="margin-top: 20px; font-size: 1.1em; color: #e94560;"></p>
        </div>
    </div>

    <!-- SCRIPTS DEL JUEGO -->
    <script type="module">
        import * as gameLogic from './gameLogic.js';
        import * as ui from './ui.js';
        import { TEAMS_DATA, FORMATIONS, POSITIONS, ATTRIBUTES, STAFF_ROLES, PRESEASON_WEEKS } from './config.js';
        import { getPlayerMarket, getYoungsterMarket } from './players.js';

        // 🆕 IMPORTAR FUNCIONES DE BADGES
        const { renderPlayerStatusBadges, applyPlayerStatusClasses } = ui;

        // 🆕 Exponer globalmente para uso en HTML
        window.renderPlayerStatusBadges = renderPlayerStatusBadges;
        window.applyPlayerStatusClasses = applyPlayerStatusClasses;

        // ============================================
        // FUNCIONES PARA NAVEGACIÓN DE PÁGINAS
        // ============================================
        
        window.openPage = function(pageId) {
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');
                
                // Actualizar contenido según la página
                const state = gameLogic.getGameState();
                if (pageId === 'squad') ui.renderSquadList(state.squad, state.team);
                if (pageId === 'academy') ui.renderAcademyList(state.academy);
                if (pageId === 'transfers') {
                    window.searchPlayersMarket();
                    window.renderAvailableYoungsters();
                }
                if (pageId === 'finance') window.updateFinanceDisplay(state);
                if (pageId === 'facilities') window.updateFacilitiesDisplay(state);
                if (pageId === 'commercial') window.updateCommercialDisplay(state);
                if (pageId === 'staff') window.updateStaffDisplay(state);
                if (pageId === 'tactics') window.updateTacticsDisplay(state);
                if (pageId === 'lineup') window.renderLineupPageUI();
                if (pageId === 'dashboard') gameLogic.markNewsAsRead();
                if (pageId === 'calendar') ui.renderCalendarPage(state);
                if (pageId === 'standings') ui.renderStandingsTable(state);
            }
        };
        
        window.closePage = function(pageId) {
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.remove('active');
            }
        };

        window.handleExit = function() {
            if (confirm('¿Estás seguro de que quieres salir? Asegúrate de guardar tu partida antes.')) {
                // Aquí puedes añadir lógica de salida o redireccionamiento
                window.location.reload();
            }
        };

        window.openSettingsPage = function() {
            const mainPage = document.getElementById('mainPage');
            const settingsPage = document.getElementById('settingsPage');

            if (mainPage) mainPage.style.display = 'none';
            if (settingsPage) settingsPage.style.display = 'block';

            if (window.injectCloudLoadUI) {
                window.injectCloudLoadUI();
            }
        };

        window.closeSettingsPage = function() {
            const mainPage = document.getElementById('mainPage');
            const settingsPage = document.getElementById('settingsPage');

            if (settingsPage) settingsPage.style.display = 'none';
            if (mainPage) mainPage.style.display = 'grid';
        };

        window.negotiatePlayer = function(playerName) {
            alert(`La funcionalidad "Negociar" para jugadores de tu plantilla no está implementada todavía.`);
        };

        // Variables y funciones para Drag & Drop
        let draggedPlayer = null;

        window.allowDrop = function(ev) {
            ev.preventDefault();
            ev.currentTarget.classList.add('highlight');
        };

      window.drag = function(ev, playerJson) {
    const player = JSON.parse(decodeURIComponent(playerJson));

    // Validar lesiones
    if (player.isInjured) {
        ev.preventDefault();
        alert("Los jugadores lesionados no pueden ser alineados.");
        return;
    }

    // 🆕 VALIDAR SANCIONES
    if (player.isSuspended) {
        ev.preventDefault();
        alert(`${player.name} está sancionado y no puede jugar.`);
        return;
    }

    draggedPlayer = player;
    ev.dataTransfer.setData("text/plain", playerJson);
    ev.dataTransfer.effectAllowed = "move";
};
        
        window.drop = function(ev, targetSlotId) {
            ev.preventDefault();
            ev.currentTarget.classList.remove('highlight');

            const state = gameLogic.getGameState();
            let currentLineup = gameLogic.getLineup();
            let currentSquad = state.squad;

            const droppedPlayer = draggedPlayer;
            if (!droppedPlayer || droppedPlayer.isInjured) return;

            const isDroppedPlayerInCurrentLineup = currentLineup.some(p => p && p.name === droppedPlayer.name);
            let newProposedLineup = [...currentLineup];

            if (targetSlotId.startsWith('pitch-slot-')) {
                const targetIndex = parseInt(targetSlotId.replace('pitch-slot-', ''));
                const playerAlreadyInTargetSlot = newProposedLineup[targetIndex];

                if (playerAlreadyInTargetSlot && playerAlreadyInTargetSlot.name === droppedPlayer.name) {
                    return;
                }

                if (isDroppedPlayerInCurrentLineup) {
                    const sourceIndex = newProposedLineup.findIndex(p => p && p.name === droppedPlayer.name);
                    if (sourceIndex !== -1) {
                        newProposedLineup[sourceIndex] = playerAlreadyInTargetSlot;
                        newProposedLineup[targetIndex] = droppedPlayer;
                    }
                } else {
                    newProposedLineup[targetIndex] = droppedPlayer;
                }
            } else if (targetSlotId === 'reservesList') {
                if (isDroppedPlayerInCurrentLineup) {
                    const sourceIndex = newProposedLineup.findIndex(p => p && p.name === droppedPlayer.name);
                    if (sourceIndex !== -1) {
                        newProposedLineup[sourceIndex] = null;
                    }
                } else {
                    return;
                }
            }

            const finalLineupPlayers = newProposedLineup.filter(p => p !== null);
            gameLogic.setLineup(finalLineupPlayers);
            window.renderLineupPageUI();
            draggedPlayer = null;
        };

        window.dragleave = function(ev) {
            ev.preventDefault();
            ev.currentTarget.classList.remove('highlight');
        };

        window.openModal = function(type) {        
    if (type === 'gameMode') {        
        document.getElementById('gameModeModal').classList.add('active');        
    } else if (type === 'selectTeam') {        
        document.getElementById('selectTeamModal').classList.add('active');        
        window.renderTeamSelectors(); // <-- ¡Asegúrate de que esta línea esté aquí!  
    } else if (type === 'signYoungster') {        
        document.getElementById('signYoungsterModal').classList.add('active');        
        window.renderAvailableYoungsters();        
    } else if (type === 'negotiation') {        
        document.getElementById('negotiationModal').classList.add('active');        
    } else if (type === 'training') {        
        document.getElementById('trainingModal').classList.add('active');        
    } else if (type === 'hireStaff') {        
        document.getElementById('hireStaffModal').classList.add('active');        
    } else if (type === 'matchResult') {        
        document.getElementById('matchResultModal').classList.add('active');        
    }        
};
      
        window.closeModal = function(type) {      
            document.getElementById(type + 'Modal').classList.remove('active');      
        };      
      
       window.startGameMode = function(mode) {        
    window.gameMode = mode;        
    window.closeModal('gameMode');  
    // DESCOMENTA o ASEGÚRATE de que esta línea esté presente:  
    window.renderTeamSelectors(); // 👈 IMPORTANTE  
    window.openModal('selectTeam');        
};    
      
// -------------------------
// Renderizado de selección de equipos (robusto)
// -------------------------
// -------------------------  
// Renderizado de selección de equipos (robusto)  
// -------------------------  
function renderTeamSelectors() {  
    // Comprobación de seguridad: TEAMS_DATA debe existir  
    if (!window.TEAMS_DATA) {  
        console.error('⚠️ TEAMS_DATA no está disponible. No se pueden mostrar equipos.');  
        return;  
    }  
  
    const divisions = ['primera', 'segunda', 'rfef_grupo1', 'rfef_grupo2'];  
    const divisionListIds = {  
        'primera': 'primeraList',  
        'segunda': 'segundaList',  
        'rfef_grupo1': 'rfef_grupo1List',  
        'rfef_grupo2': 'rfef_grupo2List'  
    };  
  
    divisions.forEach(divisionKey => {  
        const listElement = document.getElementById(divisionListIds[divisionKey]);  
        if (!listElement) return;  
  
        // MODIFICACIÓN: FILTRAR ELEMENTOS NULL/UNDEFINED DEL ARRAY DE EQUIPOS  
        const teamsToRender = (window.TEAMS_DATA[divisionKey] || []).filter(team => team);  
  
        if (teamsToRender.length === 0) {  
            listElement.innerHTML = `<p style="color: #ccc; font-style: italic;">No hay equipos disponibles</p>`;  
            return;  
        }  
  
        // Crear botones para cada equipo  
        listElement.innerHTML = teamsToRender.map(team => {  
            const safeTeam = team.replace(/'/g, "\\'"); // Escapar comillas simples  
            return `  
                <button class="btn" style="width: 100%; margin: 5px 0; background: rgba(233, 69, 96, 0.1); border-color: #e94560; color: #fff;"  
                        onclick="window.selectTeamAndStart('${safeTeam}', '${divisionKey}')">  
                    ${team}  
                </button>  
            `;  
        }).join('');  
    });  
}  
  
// Hacer global para que los modales lo llamen  
window.renderTeamSelectors = renderTeamSelectors;  

// -------------------------
// Selección de equipo y arranque
// -------------------------
window.selectTeamAndStart = function(teamName, division) {
    if (!teamName || !division) {
        alert('⚠️ Equipo o división inválidos');
        return;
    }

    console.log('Seleccionando equipo:', teamName, 'Division:', division);

    gameLogic.selectTeamWithInitialSquad(teamName, division, window.gameMode);
    ui.refreshUI(gameLogic.getGameState());
    window.closeModal('selectTeam');

    // Abrir dashboard automáticamente
    const dashboardButton = document.querySelector('.menu-item[onclick="window.switchPage(\'dashboard\', this)"]');
    if (dashboardButton) window.switchPage('dashboard', dashboardButton);
};

      

        
        // Funciones de mercado
        window.searchPlayersMarket = function() {
            const filters = {
                searchName: document.getElementById('marketSearchName').value,
                position: document.getElementById('marketPosition').value,
                minOverall: parseInt(document.getElementById('marketMinOverall').value) || 0,
                maxAge: parseInt(document.getElementById('marketMaxAge').value) || 100,
                transferListed: document.getElementById('marketTransferListed').checked,
                loanListed: document.getElementById('marketLoanListed').checked
            };
            const players = gameLogic.getPlayerMarket(filters);
            ui.renderPlayerMarketList(players);
        };

        window.clearPlayerMarketFilters = function() {
            document.getElementById('marketSearchName').value = '';
            document.getElementById('marketPosition').value = 'ALL';
            document.getElementById('marketMinOverall').value = '';
            document.getElementById('marketMaxAge').value = '';
            document.getElementById('marketTransferListed').checked = false;
            document.getElementById('marketLoanListed').checked = false;
            window.searchPlayersMarket();
        };

        function renderAvailableYoungsters() {
            const youngsters = gameLogic.getYoungsterMarket();
            ui.renderAvailableYoungstersMarket(youngsters);
        }
        window.renderAvailableYoungsters = renderAvailableYoungsters;

        window.fichYoungsterConfirm = function(encodedYoungsterJson) {
            const youngster = JSON.parse(decodeURIComponent(encodedYoungsterJson));
            const result = gameLogic.signYoungster(youngster);
            alert(result.message);
            ui.refreshUI(gameLogic.getGameState());
            if (result.success) {
                window.closeModal('signYoungster');
            }
        };

        window.sellPlayerConfirm = function(name) {
            if (confirm(`¿Estás seguro de que quieres vender a ${name}?`)) {
                const result = gameLogic.sellPlayer(name);
                alert(result.message);
                ui.refreshUI(gameLogic.getGameState());
            }
        };

        window.promoteConfirm = function(name) {
            if (confirm(`¿Ascender a ${name} a la primera plantilla?`)) {
                const result = gameLogic.promoteYoungster(name);
                alert(result.message);
                ui.refreshUI(gameLogic.getGameState());
            }
        };

        // Simulación
        window.simulateWeek = async function() {
            const state = gameLogic.getGameState();
            const lineupValidation = gameLogic.validateLineup(state.lineup);
            
            if (!lineupValidation.success) {
                if (state.staff.segundoEntrenador) {
                    alert(`¡Advertencia del Segundo Entrenador!\n\nTu alineación actual es INVÁLIDA:\n${lineupValidation.message}\n\nPor favor, corrige la alineación antes de simular la jornada.`);
                    gameLogic.addNews(`[Segundo Entrenador - CRÍTICO] Alineación inválida: ${lineupValidation.message}. Por favor, corrige.`, 'error');
                    window.openPage('lineup');
                    return;
                } else {
                    alert(`¡Alineación inválida detectada!\n\n${lineupValidation.message}\n\nTu equipo será penalizado con una derrota 0-3 por alineación indebida.`);
                    gameLogic.addNews(`[SISTEMA - ATENCIÓN] Alineación inválida detectada: ${lineupValidation.message}. Derrota 0-3 forzada.`, 'error');
                }
            }
            
            const simulationResult = gameLogic.simulateFullWeek();
            ui.refreshUI(gameLogic.getGameState());

            if (simulationResult && simulationResult.myMatch) {
                const myMatch = simulationResult.myMatch;
                const matchResultTitle = document.getElementById('matchResultTitle');
                const matchResultDetails = document.getElementById('matchResultDetails');
                const matchResultMessage = document.getElementById('matchResultMessage');

                matchResultDetails.innerHTML = `${myMatch.home} ${myMatch.score} ${myMatch.away}`;
                
                if (myMatch.home === state.team) {
                    if (parseInt(myMatch.score.split('-')[0]) > parseInt(myMatch.score.split('-')[1])) {
                        matchResultTitle.textContent = '¡VICTORIA!';
                        matchResultTitle.style.color = '#00ff00';
                    } else if (parseInt(myMatch.score.split('-')[0]) === parseInt(myMatch.score.split('-')[1])) {
                        matchResultTitle.textContent = 'EMPATE';
                        matchResultTitle.style.color = 'orange';
                    } else {
                        matchResultTitle.textContent = 'DERROTA';
                        matchResultTitle.style.color = 'red';
                    }
                } else {
                    if (parseInt(myMatch.score.split('-')[1]) > parseInt(myMatch.score.split('-')[0])) {
                        matchResultTitle.textContent = '¡VICTORIA!';
                        matchResultTitle.style.color = '#00ff00';
                    } else if (parseInt(myMatch.score.split('-')[1]) === parseInt(myMatch.score.split('-')[0])) {
                        matchResultTitle.textContent = 'EMPATE';
                        matchResultTitle.style.color = 'orange';
                    } else {
                        matchResultTitle.textContent = 'DERROTA';
                        matchResultTitle.style.color = 'red';
                    }
                }

                window.openModal('matchResult');
                await new Promise(resolve => setTimeout(resolve, 5000));
                window.closeModal('matchResult');
            }

            window.openPage('dashboard');
        };

        // Negociación
        window.startNegotiationUI = function(encodedPlayerJson) {
            const player = encodedPlayerJson;
            const result = gameLogic.startNegotiation(player);
            if (result.success) {
                window.updateNegotiationModal();
                window.openModal('negotiation');
            } else {
                alert('Error: ' + result.message);
            }
        };

        window.startPlayerNegotiation = window.startNegotiationUI;

        window.updateNegotiationModal = function() {
            const state = gameLogic.getGameState();
            const player = state.negotiatingPlayer;

            if (!player) {
                window.closeModal('negotiation');
                return;
            }

            document.getElementById('negotiationPlayerName').textContent = player.name;
            document.getElementById('negotiationPlayerNameStep1').textContent = player.name;
            document.getElementById('negotiationPlayerClub').textContent = player.club;
            document.getElementById('negotiationPlayerClubStep2').textContent = player.club;
            document.getElementById('negotiationPlayerPosition').textContent = player.position;
            document.getElementById('negotiationPlayerAge').textContent = player.age;
            document.getElementById('negotiationPlayerOverall').textContent = player.overall;
            document.getElementById('negotiationPlayerPotential').textContent = player.potential;
            document.getElementById('negotiationPlayerCurrentSalary').textContent = player.salary.toLocaleString('es-ES');
            document.getElementById('negotiationPlayerValue').textContent = player.value.toLocaleString('es-ES');

            const askingPriceElem = document.getElementById('negotiationPlayerAskingPrice');
            const loanInfoElem = document.getElementById('negotiationPlayerLoanInfo');
            
            if (player.transferListed) {
                askingPriceElem.style.display = 'block';
                document.getElementById('negotiationPlayerAskingPriceValue').textContent = player.askingPrice.toLocaleString('es-ES');
                loanInfoElem.style.display = 'none';
            } else if (player.loanListed) {
                askingPriceElem.style.display = 'none';
                loanInfoElem.style.display = 'block';
                document.getElementById('negotiationPlayerLoanContribution').textContent = (player.loanWageContribution || 0).toLocaleString('es-ES');
            } else {
                askingPriceElem.style.display = 'none';
                loanInfoElem.style.display = 'none';
            }

            document.getElementById('negotiationStep1').style.display = 'none';
            document.getElementById('negotiationStep2').style.display = 'none';

            if (state.negotiationStep === 1) {
                document.getElementById('negotiationStep1').style.display = 'block';
                document.getElementById('offeredSalary').value = player.salary;
                document.getElementById('offeredBonus').checked = false;
                document.getElementById('offeredCar').checked = false;
                document.getElementById('offeredHouse').checked = false;
                document.getElementById('offeredMerchPercent').checked = false;
                document.getElementById('offeredTicketPercent').checked = false;
            } else if (state.negotiationStep === 2) {
                document.getElementById('negotiationStep2').style.display = 'block';

                const negotiationLoanOffer = document.getElementById('negotiationLoanOffer');
                const negotiationTransferOffer = document.getElementById('negotiationTransferOffer');

                negotiationLoanOffer.style.display = 'none';
                negotiationTransferOffer.style.display = 'none';

                document.getElementById('negotiationClubMessage').textContent = `Estás a punto de hacer una oferta a ${player.club} por ${player.name}.`;

                if (player.loanListed) {
                    negotiationLoanOffer.style.display = 'block';
                    document.getElementById('loanPlayerSalaryExample').textContent = player.salary.toLocaleString('es-ES');
                    document.getElementById('loanClubContributionInfo').textContent = (player.loanWageContribution || 0).toLocaleString('es-ES');
                    document.getElementById('loanWageContribution').value = 50;
                    document.getElementById('loanWageContributionValue').textContent = '50%';
                } else if (player.transferListed) {
                    negotiationTransferOffer.style.display = 'block';
                    document.getElementById('offerAmount').value = player.askingPrice;
                    window.populatePlayerExchangeSelect();
                }
            }
        };

        window.submitPlayerOffer = function() {
            const offeredSalary = parseInt(document.getElementById('offeredSalary').value);
            const offeredBonus = document.getElementById('offeredBonus').checked;
            const offeredCar = document.getElementById('offeredCar').checked;
            const offeredHouse = document.getElementById('offeredHouse').checked;
            const offeredMerchPercent = document.getElementById('offeredMerchPercent').checked;
            const offeredTicketPercent = document.getElementById('offeredTicketPercent').checked;

            const result = gameLogic.offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent);
            alert(result.message);
            if (result.success) {
                window.updateNegotiationModal();
            } else {
                if (result.message.includes('No está interesado')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        function populatePlayerExchangeSelect() {
            const select = document.getElementById('playerExchangeSelect');
            select.innerHTML = '';
            const state = gameLogic.getGameState();
            state.squad.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                option.textContent = `${p.name} (OVR: ${p.overall}) - VAL: ${p.value.toLocaleString('es-ES')}€`;
                select.appendChild(option);
            });
        }
        window.populatePlayerExchangeSelect = populatePlayerExchangeSelect;

        window.submitLoanOffer = function() {
            const loanWageContribution = parseInt(document.getElementById('loanWageContribution').value);
            const result = gameLogic.offerToClub(loanWageContribution, [], true);
            alert(result.message);
            if (result.success) {
                window.endNegotiationUI(true);
            } else {
                if (result.message.includes('rechazado tu oferta de cesión')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.submitTransferOffer = function() {
            const offerAmount = parseInt(document.getElementById('offerAmount').value);
            const playerExchangeSelect = document.getElementById('playerExchangeSelect');
            const selectedPlayers = Array.from(playerExchangeSelect.selectedOptions).map(option => option.value);

            const result = gameLogic.offerToClub(offerAmount, selectedPlayers, false);
            alert(result.message);
            if (result.success) {
                window.endNegotiationUI(true);
            } else {
                if (result.message.includes('rechazado tu oferta')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.endNegotiationUI = function(success) {
            gameLogic.endNegotiation(success);
            window.closeModal('negotiation');
            ui.refreshUI(gameLogic.getGameState());
        };

        // Entrenamiento
        let currentTrainingPlayerIndex = -1;

        window.setPlayerTrainingFocusUI = function(playerIndex, playerName) {
            currentTrainingPlayerIndex = playerIndex;
            const state = gameLogic.getGameState();
            const player = state.squad[playerIndex];

            if (!player) return;

            document.getElementById('trainingPlayerName').textContent = playerName;
            document.getElementById('trainingPlayerNameInfo').textContent = playerName;
            document.getElementById('trainingPlayerPosition').textContent = player.position;
            document.getElementById('trainingPlayerOverall').textContent = player.overall;
            document.getElementById('trainingPlayerPotential').textContent = player.potential;

            const attributesList = document.getElementById('trainingPlayerAttributes');
            attributesList.innerHTML = '';
            ATTRIBUTES.forEach(attr => {
                attributesList.innerHTML += `<li style="display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(233, 69, 96, 0.3); padding: 5px; border-radius: 3px;"><strong>${attr}:</strong> ${player[attr] || 0}</li>`;
            });

            const attributeRadioButtons = document.getElementById('attributeRadioButtons');
            attributeRadioButtons.innerHTML = '';
            ATTRIBUTES.forEach(attr => {
                const checked = (state.trainingFocus.playerIndex === playerIndex && state.trainingFocus.attribute === attr) ? 'checked' : '';
                attributeRadioButtons.innerHTML += `
                    <div>
                        <input type="radio" id="attr_${attr}" name="trainingAttribute" value="${attr}" ${checked}>
                        <label for="attr_${attr}">${attr}</label>
                    </div>
                `;
            });

            if (!state.staff.entrenador) {
                document.getElementById('trainingStaffWarning').style.display = 'block';
            } else {
                document.getElementById('trainingStaffWarning').style.display = 'none';
            }

            if (player.position === 'POR' && !state.staff.entrenadorPorteros) {
                document.getElementById('trainingGkStaffWarning').style.display = 'block';
            } else {
                document.getElementById('trainingGkStaffWarning').style.display = 'none';
            }

            window.openModal('training');
        };

        window.submitTrainingFocus = function() {
            const selectedAttribute = document.querySelector('input[name="trainingAttribute"]:checked')?.value;
            if (!selectedAttribute) {
                alert('Por favor, selecciona un atributo para entrenar.');
                return;
            }

            const result = gameLogic.setTrainingFocus(currentTrainingPlayerIndex, selectedAttribute);
            alert(result.message);
            if (result.success) {
                window.closeModal('training');
            }
            ui.refreshUI(gameLogic.getGameState());
        };

        // Staff
        window.openHireStaffModal = function(role) {
            document.getElementById('staffRoleDisplayName').textContent = STAFF_ROLES[role].displayName;
            document.getElementById('staffRoleDisplayNameInfo').textContent = STAFF_ROLES[role].displayName;

            const candidates = gameLogic.generateStaffCandidates(role, true);
            const list = document.getElementById('staffCandidatesList');
            const state = gameLogic.getGameState();
            const existingStaff = state.staff[role];

            let indemnizationMessage = '';
            if (existingStaff) {
                const indemnization = existingStaff.salary * 52;
                indemnizationMessage = `<p class="alert alert-warning">Al contratar a un nuevo ${STAFF_ROLES[role].displayName}, se despedirá a ${existingStaff.name} con una indemnización de ${indemnization.toLocaleString('es-ES')}€ (salario de un año).</p>`;
            }

            list.innerHTML = indemnizationMessage + candidates.map((c, idx) => `
                <div class="staff-candidate">
                    <div>
                        <strong>${c.name}</strong> (Nivel ${c.level})<br>
                        Salario: ${c.salary.toLocaleString('es-ES')}€/semana | Cláusula: ${c.clausula.toLocaleString('es-ES')}€
                    </div>
                    <button class="btn btn-sm" onclick="window.hireStaffConfirm('${encodeURIComponent(JSON.stringify(c))}')">Contratar</button>
                </div>
            `).join('');

            window.openModal('hireStaff');
        };

        window.hireStaffConfirm = function(encodedCandidateJson) {
            const candidate = JSON.parse(decodeURIComponent(encodedCandidateJson));
            const state = gameLogic.getGameState();
            const existingStaff = state.staff[candidate.role];
            let confirmationMessage = `¿Estás seguro de que quieres contratar a ${candidate.name} (Nivel ${candidate.level}) por un salario de ${candidate.salary.toLocaleString('es-ES')}€/semana y una cláusula de ${candidate.clausula.toLocaleString('es-ES')}€?`;

            if (existingStaff) {
                const indemnization = existingStaff.salary * 52;
                confirmationMessage += `\n\nEsto implicará despedir a ${existingStaff.name} con una indemnización de ${indemnization.toLocaleString('es-ES')}€ (salario de un año).`;
            }

            if (confirm(confirmationMessage)) {
                const result = gameLogic.hireStaffFromCandidates(candidate);
                alert(result.message);
                if (result.success) {
                    window.closeModal('hireStaff');
                }
                ui.refreshUI(gameLogic.getGameState());
                window.updateStaffDisplay(gameLogic.getGameState());
            }
        };

        // Tácticas
        window.updateFormation = function() {
            const state = gameLogic.getGameState();
            const newFormation = document.getElementById('formationSelect').value;
            const updatedState = { ...state, formation: newFormation };
            gameLogic.updateGameState(updatedState);
            alert('Formación actualizada a ' + FORMATIONS[updatedState.formation].name);
            window.renderLineupPageUI();
        };

        window.updateMentality = function() {
            const state = gameLogic.getGameState();
            const newMentality = document.getElementById('mentalitySelect').value;
            const updatedState = { ...state, mentality: newMentality };
            gameLogic.updateGameState(updatedState);
            alert('Mentalidad táctica actualizada a ' + updatedState.mentality);
        };

        function updateTacticsDisplay(state) {
            const formationSelect = document.getElementById('formationSelect');
            const mentalitySelect = document.getElementById('mentalitySelect');
            if(formationSelect) formationSelect.value = state.formation;
            if(mentalitySelect) mentalitySelect.value = state.mentality;
        }
        window.updateTacticsDisplay = updateTacticsDisplay;

        // Instalaciones
        window.expandStadium = function() {
            const result = gameLogic.expandStadium();
            alert(result.message);
            ui.refreshUI(gameLogic.getGameState());
            window.updateFacilitiesDisplay(gameLogic.getGameState());
        };

        window.improveFacilities = function() {
            const result = gameLogic.improveFacilities();
            alert(result.message);
            ui.refreshUI(gameLogic.getGameState());
            window.updateFacilitiesDisplay(gameLogic.getGameState());
        };

        function updateFacilitiesDisplay(state) {
            const currentStadiumCapacity = document.getElementById('currentStadiumCapacity');
            const currentTrainingLevel = document.getElementById('currentTrainingLevel');
            const stadiumNameDisplay = document.getElementById('stadiumNameDisplay');
            const stadiumImageContainer = document.getElementById('stadiumImageContainer');

            if (currentStadiumCapacity) currentStadiumCapacity.textContent = state.stadiumCapacity.toLocaleString('es-ES');
            if (currentTrainingLevel) currentTrainingLevel.textContent = state.trainingLevel;
            if (stadiumNameDisplay) stadiumNameDisplay.textContent = state.stadiumName || 'Estadio Municipal';

            if (stadiumImageContainer && state.stadiumImage) {
                stadiumImageContainer.innerHTML = `
                    <img src="${state.stadiumImage}"
                         style="max-width: 100%; max-height: 300px; border: 2px solid #e94560; border-radius: 10px; display: block;">
                `;
            } else if (stadiumImageContainer) {
                stadiumImageContainer.innerHTML = '<p style="color: #999;">No hay imagen del estadio disponible</p>';
            }
        }
        window.updateFacilitiesDisplay = updateFacilitiesDisplay;

        // Staff Display
        function updateStaffDisplay(state) {
            Object.keys(STAFF_ROLES).forEach(role => {
                const staff = state.staff[role];
                const nameElem = document.getElementById(`staff${role.charAt(0).toUpperCase() + role.slice(1)}Name`);
                const levelElem = document.getElementById(`staff${role.charAt(0).toUpperCase() + role.slice(1)}Level`);
                const salaryElem = document.getElementById(`staff${role.charAt(0).toUpperCase() + role.slice(1)}Salary`);
                const clausulaElem = document.getElementById(`staff${role.charAt(0).toUpperCase() + role.slice(1)}Clausula`);
                const btnElem = document.getElementById(`btnHire${role.charAt(0).toUpperCase() + role.slice(1)}`);

                if (nameElem) nameElem.textContent = staff ? staff.name : 'No Contratado';
                if (levelElem) levelElem.textContent = staff ? staff.level : '-';
                if (salaryElem) salaryElem.textContent = staff ? staff.salary.toLocaleString('es-ES') + '€' : '-';
                if (clausulaElem) clausulaElem.textContent = staff ? 'N/A' : '-';
                if (btnElem) {
                    btnElem.disabled = !!staff;
                    btnElem.textContent = staff ? 'Contratado' : 'Contratar';
                }
            });
        }
        window.updateStaffDisplay = updateStaffDisplay;

        // Precios
        window.setTicketPriceFromInput = function() {
            const input = document.getElementById('ticketPriceInput');
            const newPrice = input.value;
            const result = gameLogic.setTicketPrice(newPrice);
            if (result.success) {
                alert(result.message);
                ui.refreshUI(gameLogic.getGameState());
                window.updateFinanceDisplay(gameLogic.getGameState());
                window.updateCommercialDisplay(gameLogic.getGameState());
            } else {
                alert('Error: ' + result.message);
                input.value = gameLogic.getGameState().ticketPrice;
            }
        };

        window.setMerchandisingPriceFromInput = function() {
            const input = document.getElementById('merchandisingPriceInput');
            const newPrice = input.value;
            const result = gameLogic.setMerchandisingPrice(newPrice);
            if (result.success) {
                alert(result.message);
                ui.refreshUI(gameLogic.getGameState());
                window.updateFinanceDisplay(gameLogic.getGameState());
                window.updateCommercialDisplay(gameLogic.getGameState());
            } else {
                alert('Error: ' + result.message);
                input.value = gameLogic.getGameState().merchandisingPrice;
            }
        };

        window.updateTicketPriceDisplay = function(value) {
            document.getElementById('ticketPriceSliderValue').textContent = value;
        };

        window.setTicketPriceFromSlider = function(value) {
            const result = gameLogic.setTicketPrice(value);
            if (result.success) {
                ui.refreshUI(gameLogic.getGameState());
                window.updateFinanceDisplay(gameLogic.getGameState());
            } else {
                alert('Error: ' + result.message);
                document.getElementById('ticketPriceSlider').value = gameLogic.getGameState().ticketPrice;
                document.getElementById('ticketPriceSliderValue').textContent = gameLogic.getGameState().ticketPrice;
            }
        };

        window.updateMerchandisingPriceDisplay = function(value) {
            document.getElementById('merchandisingPriceSliderValue').textContent = value;
        };

        window.setMerchandisingPriceFromSlider = function(value) {
            const result = gameLogic.setMerchandisingPrice(value);
            if (result.success) {
                ui.refreshUI(gameLogic.getGameState());
                window.updateFinanceDisplay(gameLogic.getGameState());
            } else {
                alert('Error: ' + result.message);
                document.getElementById('merchandisingPriceSlider').value = gameLogic.getGameState().merchandisingPrice;
                document.getElementById('merchandisingPriceSliderValue').textContent = gameLogic.getGameState().merchandisingPrice;
            }
        };

        function updateFinanceDisplay(state) {
            document.getElementById('financeWeeklyIncome').textContent = state.weeklyIncome.toLocaleString('es-ES') + '€';
            document.getElementById('financeWeeklyExpenses').textContent = state.weeklyExpenses.toLocaleString('es-ES') + '€';
            document.getElementById('financeBalance').textContent = state.balance.toLocaleString('es-ES') + '€';
            document.getElementById('financeStadiumCapacity').textContent = state.stadiumCapacity.toLocaleString('es-ES');

            let expectedAttendance = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (state.ticketPrice / 100)));
            expectedAttendance = Math.max(0, Math.min(state.stadiumCapacity, expectedAttendance));
            document.getElementById('financeExpectedAttendance').textContent = expectedAttendance.toLocaleString('es-ES');

            const ticketPriceInput = document.getElementById('ticketPriceInput');
            if (ticketPriceInput) ticketPriceInput.value = state.ticketPrice;

            document.getElementById('financePopularity').textContent = state.popularity + '%';
            document.getElementById('financeFanbase').textContent = state.fanbase.toLocaleString('es-ES');
            document.getElementById('financeMerchandisingItemsSold').textContent = state.merchandisingItemsSold.toLocaleString('es-ES');

            const merchandisingPriceInput = document.getElementById('merchandisingPriceInput');
            if (merchandisingPriceInput) merchandisingPriceInput.value = state.merchandisingPrice;

            document.getElementById('financeMerchandisingRevenue').textContent = state.merchandisingRevenue.toLocaleString('es-ES') + '€';
        }
        window.updateFinanceDisplay = updateFinanceDisplay;

        function updateCommercialDisplay(state) {
            document.getElementById('commercialPopularity').textContent = state.popularity + '%';
            document.getElementById('commercialFanbase').textContent = state.fanbase.toLocaleString('es-ES');
            document.getElementById('commercialItemsSold').textContent = state.merchandisingItemsSold.toLocaleString('es-ES');
            document.getElementById('commercialMerchRevenue').textContent = state.merchandisingRevenue.toLocaleString('es-ES') + '€';

            const ticketPriceSlider = document.getElementById('ticketPriceSlider');
            const merchandisingPriceSlider = document.getElementById('merchandisingPriceSlider');

            if (ticketPriceSlider) {
                ticketPriceSlider.value = state.ticketPrice;
                document.getElementById('currentTicketPrice').textContent = state.ticketPrice;
                document.getElementById('ticketPriceSliderValue').textContent = state.ticketPrice;
            }
            if (merchandisingPriceSlider) {
                merchandisingPriceSlider.value = state.merchandisingPrice;
                document.getElementById('currentMerchandisingPrice').textContent = state.merchandisingPrice;
                document.getElementById('merchandisingPriceSliderValue').textContent = state.merchandisingPrice;
            }
        }
        window.updateCommercialDisplay = updateCommercialDisplay;

        // Alineación
       window.renderLineupPageUI = function() {
    const state = gameLogic.getGameState();
    const currentFormation = FORMATIONS[state.formation];
    let lineup = gameLogic.getLineup();
    let reserves = gameLogic.getReservePlayers();

    // 🆕 VALIDAR ALINEACIÓN Y MOSTRAR ADVERTENCIA
    const lineupValidation = gameLogic.validateLineup(lineup);
    const lineupMessageElem = document.getElementById('lineupMessage');
    
    if (lineupMessageElem) {
        if (!lineupValidation.success) {
            lineupMessageElem.className = 'alert alert-error';
            lineupMessageElem.innerHTML = `⚠️ <strong>ALINEACIÓN INVÁLIDA:</strong> ${lineupValidation.message}`;
            lineupMessageElem.style.fontSize = '1.1em';
            lineupMessageElem.style.fontWeight = 'bold';
        } else {
            lineupMessageElem.className = 'alert alert-info';
            lineupMessageElem.innerHTML = `Alineación actual: ${FORMATIONS[state.formation].name}. Arrastra y suelta jugadores para configurar tu alineación.`;
        }
    }

const pitchContainer = document.getElementById('pitchContainer');
            const reservesList = document.getElementById('reservesList');

            pitchContainer.innerHTML = '';
            reservesList.innerHTML = '';

            const slotWidth = 18;
            const slotHeight = 10;

            currentFormation.layout.forEach((posData, index) => {
                const slot = document.createElement('div');
                slot.classList.add('pitch-position-placeholder');
                slot.id = `pitch-slot-${index}`;

                const leftOffset = posData.x * (100 / 5) + ( (100 / 5) - slotWidth ) / 2;
                const topOffset = posData.y * (100 / 8) + ( (100 / 8) - slotHeight ) / 2;

                slot.style.left = `${leftOffset}%`;
                slot.style.top = `${topOffset}%`;
                slot.style.width = `${slotWidth}%`;
                slot.style.height = `${slotHeight}%`;

                slot.textContent = posData.pos; // Muestra la posición táctica

                slot.ondragover = window.allowDrop;
                slot.ondragleave = window.dragleave;
                slot.ondrop = (ev) => window.drop(ev, `pitch-slot-${index}`);

                const playerInSlot = lineup[index];
                if (playerInSlot) {
                    const playerDiv = document.createElement('div');
                    playerDiv.classList.add('pitch-player');

                    // 🆕 Aplicar clases CSS de estado
                    window.applyPlayerStatusClasses(playerDiv, playerInSlot);

                    // 🆕 NO PERMITIR ARRASTRAR SI LESIONADO O SANCIONADO
                    playerDiv.draggable = !playerInSlot.isInjured && !playerInSlot.isSuspended;

                    playerDiv.ondragstart = (ev) => {
                        // 🆕 VALIDAR ANTES DE ARRASTRAR (Ya lo tienes, solo asegúrate de que esté aquí)
                        if (playerInSlot.isInjured) {
                            ev.preventDefault();
                            alert(`❌ ${playerInSlot.name} está LESIONADO y no puede jugar.`);
                            return;
                        }
                        if (playerInSlot.isSuspended) {
                            ev.preventDefault();
                            alert(`⛔ ${playerInSlot.name} está SANCIONADO y no puede jugar.`);
                            return;
                        }
                        window.drag(ev, encodeURIComponent(JSON.stringify(playerInSlot)));
                    };

                    // 🆕 Contenido del jugador con nombre, overall y badges
                    playerDiv.innerHTML = `
                        <span>${playerInSlot.name}</span>
                        <span>(${playerInSlot.position}, ${playerInSlot.overall})</span>
                        ${window.renderPlayerStatusBadges(playerInSlot)}
                    `;
                    playerDiv.dataset.playername = playerInSlot.name;
                    slot.appendChild(playerDiv);
                }
                pitchContainer.appendChild(slot);
            });

            reserves.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.classList.add('draggable-player');

                // 🆕 Aplicar clases CSS de estado
                window.applyPlayerStatusClasses(playerDiv, player);

                // 🆕 NO PERMITIR ARRASTRAR
                playerDiv.draggable = !player.isInjured && !player.isSuspended;

                playerDiv.ondragstart = (ev) => {
                    // 🆕 VALIDAR ESTADO (Ya lo tienes, solo asegúrate de que esté aquí)
                    if (player.isInjured) {
                        ev.preventDefault();
                        alert(`❌ ${player.name} está LESIONADO (${player.weeksOut} semanas) y no puede jugar.`);
                        return;
                    }
                    if (player.isSuspended) {
                        ev.preventDefault();
                        alert(`⛔ ${player.name} está SANCIONADO (${player.suspensionWeeks} partidos) y no puede jugar.`);
                        return;
                    }
                    window.drag(ev, encodeURIComponent(JSON.stringify(player)));
                };

                // 🆕 Contenido del jugador con nombre, overall, posición y badges
                playerDiv.innerHTML = `
                    ${player.name} (${player.overall}) - ${player.position}
                    ${window.renderPlayerStatusBadges(player)}
                `;
                playerDiv.dataset.playername = player.name;
                reservesList.appendChild(playerDiv);
            });

            reservesList.ondragover = window.allowDrop;
            reservesList.ondragleave = window.dragleave;
            reservesList.ondrop = (ev) => window.drop(ev, 'reservesList');

            if (lineupMessageElem) {
                const validation = gameLogic.validateLineup(lineup);
                if (!validation.success) {
                    lineupMessageElem.className = 'alert alert-warning';
                    lineupMessageElem.innerHTML = `⚠️ Advertencia: ${validation.message}`;
                } else {
                    lineupMessageElem.className = 'alert alert-info';
                    lineupMessageElem.innerHTML = `Alineación actual: ${FORMATIONS[state.formation].name}. Arrastra y suelta jugadores para configurar tu alineación.`;
                }
            }
        };

        window.saveLineup = function() {
    const state = gameLogic.getGameState();
    const currentFormation = FORMATIONS[state.formation];
    const newLayout = Array(11).fill(null);

    currentFormation.layout.forEach((posData, index) => {
        const slot = document.getElementById(`pitch-slot-${index}`);
        const playerDiv = slot?.querySelector('.pitch-player');
        if (playerDiv) {
            const playerName = playerDiv.dataset.playername;
            const fullPlayer = state.squad.find(p => p.name === playerName);
            if (fullPlayer) {
                newLayout[index] = fullPlayer;
            }
        }
    });

    // 🆕 VALIDAR ANTES DE GUARDAR
    const validationResult = gameLogic.validateLineup(newLayout);
    
    if (!validationResult.success) {
        alert(`❌ NO SE PUEDE GUARDAR LA ALINEACIÓN:\n\n${validationResult.message}\n\nPor favor, corrige los errores antes de guardar.`);
        gameLogic.addNews(`[Alineación] Intento de guardar alineación inválida: ${validationResult.message}`, 'error');
        window.renderLineupPageUI(); // Re-renderizar para mostrar errores
        return;
    }

    const result = gameLogic.setLineup(newLayout);
    if (result.success) {
        gameLogic.addNews('✅ Alineación guardada correctamente', 'success');
        alert('✅ ' + result.message);
        ui.refreshUI(gameLogic.getGameState());
        window.renderLineupPageUI();
    } else {
        gameLogic.addNews(`[Alineación] Error: ${result.message}`, 'error');
        alert(`❌ Error al guardar la alineación: ${result.message}`);
    }
};

        // Guardar/Cargar
        window.saveCurrentGame = async function() {
            if (!window.currentUserId) {
                alert('⚠️ Debes iniciar sesión para guardar partidas en la nube.');
                return;
            }

            const gameName = prompt('Introduce un nombre para tu partida guardada:', `Partida ${new Date().toLocaleDateString()}`);
            if (!gameName) return;

            const gameId = 'game_' + Date.now();
            const currentGameState = gameLogic.getGameState();

            try {
                const result = await window.saveGameToCloud(window.currentUserId, gameId, gameName, currentGameState);
                if (result.success) {
                    alert('✅ Partida guardada en la nube correctamente.');
                } else {
                    alert('❌ Error al guardar la partida en la nube: ' + (result.error || 'Error desconocido'));
                    console.error('Error al guardar la partida en la nube:', result.error);
                }
            } catch (error) {
                console.error('Error inesperado al guardar la partida:', error);
                alert('❌ Error inesperado al guardar la partida: ' + error.message);
            }
        };

        // Modales
        window.openModal = function(type) {
            document.getElementById(type + 'Modal').classList.add('active');
        };

       

        // Inicialización
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🎮 Inicializando PC Fútbol Manager...');
            
            const marketPositionSelect = document.getElementById('marketPosition');
            POSITIONS.forEach(pos => {
                const option = document.createElement('option');
                option.value = pos;
                option.textContent = pos;
                marketPositionSelect.appendChild(option);
            });

            const formationSelect = document.getElementById('formationSelect');
            Object.keys(FORMATIONS).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = FORMATIONS[key].name;
                formationSelect.appendChild(option);
            });

            // Intentar cargar partida guardada
            const savedStateResult = gameLogic.loadFromLocalStorage();
            if (savedStateResult.success) {
                console.log('✓ Partida cargada desde localStorage');
                ui.refreshUI(gameLogic.getGameState());
            } else {
                console.log('⚠️ No hay partida guardada, abriendo modal de selección');
                // Pequeño delay para asegurar que el DOM está completamente cargado
                setTimeout(() => {
                    window.openModal('gameMode');
                }, 100);
            }
        });

   
        // Exponer globalmente
        window.gameLogic = gameLogic;
        window.ui = ui;
        window.TEAMS_DATA = TEAMS_DATA;
        window.ATTRIBUTES = ATTRIBUTES;
        window.POSITIONS = POSITIONS;
        window.FORMATIONS = FORMATIONS;
        console.log('✓ Módulos cargados y exportados');
    </script>

    <!-- Injectors -->
    <script src="./injector-login-ui.js"></script>
    <script src="./injector-cloud-load.js"></script>
    <script src="./injector-budget.js"></script>
    <script src="./injector-player-arrows.js"></script>
    <script src="./injector-admin-complete.js"></script>
    <script src="./contractsInjector.js"></script>
    <script src="./injector-expose-functions.js"></script>


</body>
</html>

// gameLogic.js - Lógica central del juego  
import {  
    TEAMS_DATA, ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS,  
    STAFF_ROLES, STAFF_LEVEL_EFFECTS, DIVISION_MULTIPLIERS,  
    BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS,  
    FORMATIONS, PRESEASON_WEEKS, PROMOTION_RELEGATION  
} from './config.js';  
import { getPlayerMarket as getPlayerMarketData, getYoungsterMarket as getYoungsterMarketData, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall, generateRandomName } from './players.js';  
import { getTeamData, saveTeamData } from './teamData.js';


// Estado global del juego  
const gameState = {  
    team: null, 
    teamLogo: null,
    stadiumImage: null,
    stadiumName: 'Estadio',
    week: 1,  
    division: 'Primera',
    squad: [],  
    academy: [],  
    standings: {},  
    stadiumCapacity: 5000,  
    ticketPrice: 20,  
    merchandisingRevenue: 500,  
    staff: {  
        medico: null,  
        entrenador: null,  
        entrenadorPorteros: null,  
        fisio: null,  
        analista: null,  
        scout: null,  
        secretario: null,  
        segundoEntrenador: null  
    },  
    balance: 50000,  
    weeklyIncomeBase: 5000,  
    weeklyIncome: 0,  
    weeklyExpenses: 0,  
    formation: '433',  
    lineup: [],  
    mentality: 'balanced',  
    trainingLevel: 1,  
    matchHistory: [],  
    popularity: 50,  
    fanbase: 10000,  
    merchandisingPrice: 10,  
    merchandisingItemsSold: 0,  
    negotiatingPlayer: null,  
    negotiationStep: 0,  
    playerOffer: null,  
    clubOffer: null,  
    trainingFocus: {  
        playerIndex: -1,  
        attribute: null  
    },  
    newsFeed: [],  
    unreadNewsCount: 0,  
    currentSeason: '2025/2026',  
    seasonType: 'preseason',  
    leagueTeams: [],  
    nextOpponent: null,  
    cupProgress: 0,  
    europeanProgress: 0,
    seasonCalendar: [],
    maxSeasonWeeks: 38  
};  
  
function getGameState() {  
    return JSON.parse(JSON.stringify(gameState));  
}  
  
function updateGameState(newState) {  
    Object.assign(gameState, newState);  
    updateWeeklyFinancials();  
}  
  
function addNews(message, type = 'info', read = false) {  
    gameState.newsFeed.unshift({ week: gameState.week, message: message, timestamp: Date.now(), type: type, read: read });  
    if (gameState.newsFeed.length > 20) {  
        gameState.newsFeed.pop();  
    }  
    if (type !== 'system' && !read) {
        gameState.unreadNewsCount++;  
    }  
}  
  
function markNewsAsRead() {  
    gameState.unreadNewsCount = 0;  
}  
  
function initStandings(teamsArray) {  
    const standings = {};  
    teamsArray.forEach(team => {  
        standings[team] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };  
    });  
    return standings;  
}  
  
function generateLeagueCalendar(teams) {  
    const numTeams = teams.length;  
    if (numTeams < 2) return [];  
  
    let schedule = [];  
    let tempTeams = [...teams];  
  
    if (numTeams % 2 !== 0) {  
        tempTeams.push("BYE");  
    }  
    const numActualTeams = tempTeams.length;  
    const numRounds = numActualTeams - 1;
  
    for (let round = 0; round < numRounds; round++) {  
        for (let i = 0; i < numActualTeams / 2; i++) {  
            const homeTeam = tempTeams[i];  
            const awayTeam = tempTeams[numActualTeams - 1 - i];  
  
            if (homeTeam !== "BYE" && awayTeam !== "BYE") {  
                schedule.push({ home: homeTeam, away: awayTeam, week: round + 1, homeGoals: null, awayGoals: null });  
            }  
        }  
  
        const lastTeam = tempTeams.pop();  
        tempTeams.splice(1, 0, lastTeam);  
    }  
  
    const secondHalfSchedule = schedule.map(match => ({  
        home: match.away,  
        away: match.home,  
        week: match.week + numRounds,
        homeGoals: null,  
        awayGoals: null  
    }));  
  
    const fullSchedule = [...schedule, ...secondHalfSchedule];  
    fullSchedule.sort((a, b) => a.week - b.week);
  
    return fullSchedule;  
}  
  
  
function generateInitialSquad() {  
    const squad = [];  
    const allAvailablePlayers = initPlayerDatabase();
  
    const elitePlayersNames = ['Griezmann', 'Koke', 'Oblak', 'Nahuel Molina', 'José Giménez', 'Samuel Lino', 'Álvaro Morata', 'Reinildo Mandava', 'Marcos Llorente', 'Pablo Barrios', 'Axel Witsel'];  
    if (gameState.team === 'Atlético Madrid') {  
        elitePlayersNames.forEach(name => {  
            const p = allAvailablePlayers.find(ep => ep.name === name);  
            if (p && !squad.some(s => s.name === p.name)) {
                squad.push({ 
                    ...p, 
                    club: gameState.team, 
                    isInjured: false, 
                    weeksOut: 0, 
                    matches: 0, 
                    form: 70 + Math.floor(Math.random() * 20),
                    // 🆕 CAMPOS DE TARJETAS
                    yellowCards: 0,
                    redCards: 0,
                    isSuspended: false,
                    suspensionWeeks: 0
                });  
            }  
        });  
    }  
  
    while (squad.length < 18) {
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
        const player = {  
            name: generateRandomName(),  
            age: 18 + Math.floor(Math.random() * 10),  
            position: pos,  
            foot: Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro'),  
            matches: 0,  
            form: 60 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,
            // 🆕 CAMPOS DE TARJETAS
            yellowCards: 0,
            redCards: 0,
            isSuspended: false,
            suspensionWeeks: 0,
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 40 + Math.floor(Math.random() * 30);
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000);  
        player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5);  
        squad.push({ ...player, club: gameState.team });  
    }  
  
    squad.sort((a,b) => b.overall - a.overall);  
    gameState.lineup = squad.slice(0, 11);
    return squad;  
}  
  
function generateInitialAcademy() {  
    const academy = [];  
    for (let i = 0; i < 5; i++) {  
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
        const player = {  
            name: generateRandomName(),  
            age: 16 + Math.floor(Math.random() * 2),  
            position: pos,  
            foot: Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro'),  
            matches: 0,  
            form: 50 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,
            // 🆕 CAMPOS DE TARJETAS (cantera también)
            yellowCards: 0,
            redCards: 0,
            isSuspended: false,
            suspensionWeeks: 0,
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 30 + Math.floor(Math.random() * 20);
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 50 + Math.random() * 200);  
        player.value = Math.floor(player.overall * 1000 + player.potential * 500 + player.salary * 5);  
        player.cost = player.value;  
  
        academy.push({ ...player, club: gameState.team });  
    }  
    return academy;  
}  

function getAgeStage(age) {
    if (age <= 20) return 'youth';
    if (age <= 24) return 'growth';
    if (age <= 27) return 'prime';
    if (age <= 30) return 'plateau';
    if (age <= 33) return 'decline_soft';
    return 'decline_hard';
}


function setupNewSeason(prevSeasonDivision, nextDivisionKey) {  
    const nextSeasonYear = parseInt(gameState.currentSeason.split('/')[0]) + 1;  
    const newSeasonName = `${nextSeasonYear}/${nextSeasonYear + 1}`;  
  
    gameState.week = 1;  
    gameState.matchHistory = [];  
    gameState.standings = {};  
    gameState.newsFeed = [];  
    gameState.unreadNewsCount = 0;  
    gameState.seasonType = 'preseason';  
    gameState.currentSeason = newSeasonName;  
    gameState.division = nextDivisionKey;  
  
    let teamsInNewDivision = TEAMS_DATA[nextDivisionKey];  
    if (!teamsInNewDivision) {  
        console.error(`División no encontrada en TEAMS_DATA: ${nextDivisionKey}. Usando Primera por defecto.`);  
        teamsInNewDivision = TEAMS_DATA.primera;  
        gameState.division = 'primera';  
    }  
  
    if (!teamsInNewDivision.includes(gameState.team)) {  
        teamsInNewDivision.push(gameState.team);  
    }  
    gameState.leagueTeams = teamsInNewDivision;  
    gameState.standings = initStandings(teamsInNewDivision);  
  
    gameState.seasonCalendar = generateLeagueCalendar(teamsInNewDivision);  
    gameState.maxSeasonWeeks = teamsInNewDivision.length * 2 - 2;  
  
    addNews(`¡Comienza la ${newSeasonName} en ${gameState.division}! Es tiempo de pretemporada.`, 'success');  
  
    initPlayerDatabase();  
    initYoungsterDatabase();  
  
    // ===== PRIMERA PLANTILLA =====
    gameState.squad = gameState.squad.filter(p => {
        p.age++;  
        p.matches = 0;  
        p.form = 70 + Math.floor(Math.random() * 20);  
        p.isInjured = false;  
        p.weeksOut = 0;
        
        // 🆕 RESETEAR TARJETAS AL INICIO DE TEMPORADA
        p.yellowCards = 0;
        p.redCards = 0;
        p.isSuspended = false;
        p.suspensionWeeks = 0;

        const stage = getAgeStage(p.age);

        if (stage === 'decline_soft' || stage === 'decline_hard') {
            const physicalAttrs = ['VE', 'AG', 'RE'];
            physicalAttrs.forEach(attr => {
                if (p[attr] > 40 && Math.random() < (stage === 'decline_hard' ? 0.8 : 0.5)) {
                    p[attr]--;
                }
            });
        }

        if (stage === 'decline_hard') {
            ['VI', 'PA', 'CO'].forEach(attr => {
                if (p[attr] > 50 && Math.random() < 0.2) {
                    p[attr]--;
                }
            });
        }

        p.overall = calculatePlayerOverall(p);

        if (p.age >= 36 && Math.random() < 0.25) {
            addNews(`${p.name} se ha retirado del fútbol a los ${p.age} años.`, 'info');
            return false;
        }

        return true;
    });
  
    // ===== CANTERA =====
    gameState.academy.forEach(p => {  
        p.age++;  
        p.matches = 0;  
        p.form = 60 + Math.floor(Math.random() * 20);  
        p.isInjured = false;  
        p.weeksOut = 0;
        // 🆕 RESETEAR TARJETAS CANTERA
        p.yellowCards = 0;
        p.redCards = 0;
        p.isSuspended = false;
        p.suspensionWeeks = 0;
    });  
  
    const availablePlayers = gameState.squad
        .filter(p => !p.isInjured && !p.isSuspended) // 🆕 TAMBIÉN FILTRAR SANCIONADOS
        .sort((a, b) => b.overall - a.overall);  

    setLineup(availablePlayers.slice(0, 11));  
}
 
  
async function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
    Object.assign(gameState, {
        team: teamName,
        division: divisionType,
        gameMode: gameMode,
        currentSeason: '2025/2026',
        seasonType: 'preseason',
        week: 1,
        matchHistory: [],
        standings: {},
        newsFeed: [],
        unreadNewsCount: 0,
        squad: [],
        academy: [],
        lineup: [],
        leagueTeams: [],
        seasonCalendar: []
    });

    gameState.squad = generateInitialSquad();
    gameState.academy = generateInitialAcademy();

    if (window.getTeamData) {
        const teamData = await window.getTeamData(teamName);

        gameState.teamLogo = teamData.logo || null;
        gameState.stadiumImage = teamData.stadiumImage || null;
        gameState.stadiumName = teamData.stadiumName || (teamName + ' Stadium');
        gameState.stadiumCapacity = teamData.stadiumCapacity || 10000;
        gameState.balance = teamData.initialBudget || gameState.balance;
    }

    let teamsInDivision = TEAMS_DATA[divisionType] || TEAMS_DATA.primera;
    if (!teamsInDivision.includes(teamName)) teamsInDivision.push(teamName);

    gameState.leagueTeams = teamsInDivision;
    gameState.standings = initStandings(teamsInDivision);
    gameState.seasonCalendar = generateLeagueCalendar(teamsInDivision);

    addNews(`¡Bienvenido al PC Fútbol Manager, temporada ${gameState.currentSeason}!`, 'info');
    updateWeeklyFinancials();
}

  
function signPlayer(player) {  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'La plantilla está completa (25 jugadores max).' };  
    }  
    const newPlayer = { ...player };  
    ATTRIBUTES.forEach(attr => {  
        if (newPlayer[attr] === undefined) {  
            newPlayer[attr] = 50 + Math.floor(Math.random() * 30);  
        }  
    });  
    newPlayer.overall = calculatePlayerOverall(newPlayer);  
    newPlayer.form = 70 + Math.floor(Math.random() * 20);  
    newPlayer.matches = 0;  
    newPlayer.isInjured = false;  
    newPlayer.weeksOut = 0;
    // 🆕 INICIALIZAR TARJETAS EN NUEVOS FICHAJES
    newPlayer.yellowCards = newPlayer.yellowCards || 0;
    newPlayer.redCards = newPlayer.redCards || 0;
    newPlayer.isSuspended = newPlayer.isSuspended || false;
    newPlayer.suspensionWeeks = newPlayer.suspensionWeeks || 0;
  
    gameState.squad.push(newPlayer);  
    updateWeeklyFinancials();  
    addNews(`¡${player.name} ha sido fichado!`, 'success');  
    return { success: true, message: `¡${player.name} ha sido fichado!` };  
}  
  
function signYoungster(youngster) {  
    if (gameState.balance < youngster.cost) {  
        return { success: false, message: 'Dinero insuficiente para contratar a este joven.' };  
    }  
    if (gameState.academy.length >= 15) {  
        return { success: false, message: 'La cantera está completa (15 jóvenes max).' };  
    }  
  
    const newYoungster = { ...youngster, club: gameState.team };  
    newYoungster.overall = calculatePlayerOverall(newYoungster);  
    newYoungster.form = 60 + Math.floor(Math.random() * 20);  
    newYoungster.isInjured = false;  
    newYoungster.weeksOut = 0;
    // 🆕 INICIALIZAR TARJETAS
    newYoungster.yellowCards = 0;
    newYoungster.redCards = 0;
    newYoungster.isSuspended = false;
    newYoungster.suspensionWeeks = 0;
  
    gameState.balance -= newYoungster.cost;  
    gameState.academy.push(newYoungster);  
    updateWeeklyFinancials();  
    addNews(`¡${youngster.name} se une a la cantera!`, 'info');  
    return { success: true, message: `${youngster.name} ha sido contratado para la cantera.` };  
}  
  
function promoteYoungster(name) {  
    const index = gameState.academy.findIndex(y => y.name === name);  
    if (index === -1) {  
        return { success: false, message: 'Joven no encontrado en la cantera.' };  
    }  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'No hay espacio en la primera plantilla.' };  
    }  
  
    const youngster = gameState.academy.splice(index, 1)[0];  
    const promotedPlayer = { ...youngster };  
    promotedPlayer.position = promotedPlayer.position || 'MC';  
    promotedPlayer.salary = Math.floor(promotedPlayer.overall * 150 + Math.random() * 1000);  
    promotedPlayer.value = Math.floor(promotedPlayer.overall * 2000 + promotedPlayer.potential * 500 + promotedPlayer.salary * 5);  
    promotedPlayer.club = gameState.team;  
    promotedPlayer.matches = 0;  
    promotedPlayer.isInjured = false;  
    promotedPlayer.weeksOut = 0;
    // 🆕 MANTENER TARJETAS AL ASCENDER
    promotedPlayer.yellowCards = promotedPlayer.yellowCards || 0;
    promotedPlayer.redCards = promotedPlayer.redCards || 0;
    promotedPlayer.isSuspended = promotedPlayer.isSuspended || false;
    promotedPlayer.suspensionWeeks = promotedPlayer.suspensionWeeks || 0;
  
    gameState.squad.push(promotedPlayer);  
    updateWeeklyFinancials();  
    addNews(`¡${youngster.name} ha sido ascendido a la primera plantilla!`, 'info');  
    return { success: true, message: `${youngster.name} ha sido ascendido a la primera plantilla.` };  
}  
  
function sellPlayer(name) {  
    const index = gameState.squad.findIndex(p => p.name === name);  
    if (index === -1) {  
        return { success: false, message: 'Jugador no encontrado en la plantilla.' };  
    }  
    const player = gameState.squad.splice(index, 1)[0];  
  
    const salePrice = Math.floor(player.overall * 2000 + (player.matches * 500) * (1 + Math.random() * 0.5));  
    gameState.balance += salePrice;  
    updateWeeklyFinancials();  
    addNews(`¡${player.name} ha sido vendido por ${salePrice.toLocaleString('es-ES')}€!`, 'info');  
    return { success: true, message: `${player.name} vendido por ${salePrice}€.` };  
}  
  
function startNegotiation(player) {  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
  
    gameState.negotiatingPlayer = player;  
    gameState.negotiationStep = 1;  
  
    return { success: true, message: `Iniciando negociación con ${player.name}.` };  
}  
  
function offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    let acceptanceChance = 0.5;  
  
    const salaryFactor = offeredSalary / player.salary;  
    if (salaryFactor > 1.5) acceptanceChance += 0.3;  
    else if (salaryFactor > 1.2) acceptanceChance += 0.15;  
    else if (salaryFactor < 0.8) acceptanceChance -= 0.2;  
  
    if (offeredBonus) acceptanceChance += 0.05;  
    if (offeredCar) acceptanceChance += 0.05;  
    if (offeredHouse) acceptanceChance += 0.05;  
    if (offeredMerchPercent) acceptanceChance += 0.03;  
    if (offeredTicketPercent) acceptanceChance += 0.03;  
  
    if (player.overall > 80 && gameState.popularity < 60) acceptanceChance -= 0.1;  
    if (player.loanListed && offeredSalary >= player.salary) acceptanceChance += 0.2;  
  
    const roll = Math.random();  
    const secretaryEffect = gameState.staff.secretario ? (STAFF_LEVEL_EFFECTS[gameState.staff.secretario.level]?.negotiation || 0.1) : 0;  
    acceptanceChance += secretaryEffect;  
  
    const accepted = roll < acceptanceChance;  
  
    if (accepted) {  
        gameState.playerOffer = {  
            salary: offeredSalary,  
            bonus: offeredBonus,  
            car: offeredCar,  
            house: offeredHouse,  
            merchPercent: offeredMerchPercent,  
            ticketPercent: offeredTicketPercent  
        };  
        gameState.negotiationStep = 2;  
        return { success: true, message: `${player.name} ha aceptado tu oferta personal. Ahora a negociar con su club, el ${player.club}.` };  
    } else {  
        if (roll > 0.8) {  
            endNegotiation();  
            return { success: false, message: `${player.name} ha rechazado tu oferta. No está interesado en venir.`, type: 'error' };  
        } else {  
            return { success: false, message: `${player.name} encuentra tu oferta insuficiente. Podrías subir el salario o añadir más incentivos.` };  
        }  
    }  
}  
  
function offerToClub(offerAmount, playerExchange = [], isLoan = false) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    if (player.loanListed && isLoan) {  
        const myWageContribution = offerAmount;  
        if (myWageContribution < 0 || myWageContribution > 100) {  
             return { success: false, message: 'La contribución salarial debe ser un porcentaje entre 0 y 100.' };  
        }  
  
        const actualWageToPay = player.salary * (myWageContribution / 100);  
        const finalWageForUs = actualWageToPay - (player.loanWageContribution || 0);  
  
        let acceptanceChance = 0.5;  
        if (myWageContribution >= 80) acceptanceChance += 0.3;  
        else if (myWageContribution >= 50) acceptanceChance += 0.1;  
        else if (myWageContribution < 30) acceptanceChance -= 0.2;  
  
        const roll = Math.random();  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            gameState.clubOffer = { type: 'loan', wageContribution: myWageContribution, finalWageForUs };  
            endNegotiation(true);  
            const newPlayer = {  
                ...player,  
                salary: finalWageForUs,  
                loan: true,  
                club: gameState.team  
            };  
            return signPlayer(newPlayer);  
        } else {  
            endNegotiation();  
            return { success: false, message: `El ${player.club} ha rechazado tu oferta de cesión. Quieren que te hagas cargo de más salario.`, type: 'error' };  
        }  
  
    } else {  
        const playerAskingPrice = player.askingPrice;  
  
        let acceptanceChance = 0.5;  
        const offerFactor = offerAmount / playerAskingPrice;  
        if (offerFactor >= 1) acceptanceChance += 0.3;  
        else if (offerFactor >= 0.8) acceptanceChance += 0.1;  
        else if (offerFactor < 0.6) acceptanceChance -= 0.3;  
  
        if (playerExchange.length > 0) {  
            const totalExchangeValue = playerExchange.reduce((sum, pName) => {  
                const p = gameState.squad.find(s => s.name === pName);  
                return sum + (p ? p.value : 0);  
            }, 0);  
            acceptanceChance += (totalExchangeValue / player.value) * 0.1;  
        }  
  
        const roll = Math.random();  
        const secretaryEffect = gameState.staff.secretario ? (STAFF_LEVEL_EFFECTS[gameState.staff.secretario.level]?.negotiation || 0.1) : 0;  
        acceptanceChance += secretaryEffect;  
  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            if (gameState.balance < offerAmount) {  
                endNegotiation();  
                return { success: false, message: 'No tienes suficiente dinero para esta oferta.', type: 'error' };  
            }  
            gameState.balance -= offerAmount;  
            playerExchange.forEach(pName => {  
                const index = gameState.squad.findIndex(p => p.name === pName);  
                if (index !== -1) {  
                    gameState.squad.splice(index, 1);  
                }  
            });  
  
            const newPlayer = {  
                ...player,  
                salary: gameState.playerOffer.salary,  
                loan: false,  
                club: gameState.team  
            };  
            endNegotiation(true);  
            return signPlayer(newPlayer);  
        } else {  
            if (roll > 0.8) {  
                endNegotiation();  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. No quieren vender a ${player.name}.`, type: 'error' };  
            } else {  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. Podrías mejorarla o añadir algún jugador.` };  
            }  
        }  
    }  
}  
  
function endNegotiation(success = false) {  
    if (!success && gameState.negotiatingPlayer) {  
        addNews(`Negociación por ${gameState.negotiatingPlayer.name} fracasada.`, 'error');  
    }  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
}  
  
function setTrainingFocus(playerIndex, attribute) {  
    if (playerIndex < 0 || playerIndex >= gameState.squad.length) {  
        return { success: false, message: 'Jugador no válido.' };  
    }  
    if (!ATTRIBUTES.includes(attribute)) {  
        return { success: false, message: 'Atributo no válido para entrenar.' };  
    }  
  
    gameState.trainingFocus = { playerIndex, attribute };  
    return { success: true, message: `Entrenamiento enfocado en ${attribute} para ${gameState.squad[playerIndex].name}.` };  
}  
  
function applyWeeklyTraining() {  
    if (gameState.trainingFocus.playerIndex === -1 || !gameState.trainingFocus.attribute) {  
        return { success: false, message: 'No hay un foco de entrenamiento establecido.' };  
    }  
  
    const player = gameState.squad[gameState.trainingFocus.playerIndex];  
    const attribute = gameState.trainingFocus.attribute;  
  
    if (player.isInjured) {  
        return { success: false, message: `${player.name} está lesionado y no puede entrenar.`, type: 'system' };  
    }  
  
    const currentAttrValue = player[attribute];  
    const potentialAttrValue = player.potential;  
  
    if (currentAttrValue >= potentialAttrValue) {  
        return { success: false, message: `${player.name} ya alcanzó su potencial máximo en ${attribute}.`, type: 'system' };  
    }  
  
    let improvementChance = 0.3;
    const ageModifier = getAgeModifier(player.age);

    improvementChance *= Math.max(0, ageModifier); 
    let improvementAmount = 1;  
  
    improvementChance += (gameState.trainingLevel * 0.02);  
  
    if (gameState.staff.entrenador) {  
        const coachLevel = gameState.staff.entrenador.level;  
        const coachEffect = STAFF_LEVEL_EFFECTS[coachLevel]?.training || 1;  
        improvementChance *= coachEffect;  
    }  
  
    if (player.position === 'POR' && ['EN', 'CA', 'DF'].includes(attribute) && gameState.staff.entrenadorPorteros) {  
        const gkCoachLevel = gameState.staff.entrenadorPorteros.level;  
        const gkCoachEffect = STAFF_LEVEL_EFFECTS[gkCoachLevel]?.training || 1;  
        improvementChance *= gkCoachEffect;  
    } else if (player.position === 'POR' && !gameState.staff.entrenadorPorteros) {  
        improvementChance *= 0.5;  
    }  
  
    if (currentAttrValue >= potentialAttrValue - 5) improvementChance *= 0.5;  
  
    let message = '';  
    if (Math.random() < improvementChance) {  
        player[attribute] = Math.min(100, currentAttrValue + improvementAmount);  
        player.overall = calculatePlayerOverall(player);  
        message = `${player.name} ha mejorado su ${attribute} a ${player[attribute]}! (OVR: ${player.overall})`;  
        addNews(`[Entrenamiento] ${message}`, 'system');  
        return { success: true, message: message };  
    } else {  
        message = `${player.name} no ha mostrado mejoras significativas en ${attribute} esta semana.`;  
        return { success: false, message: message, type: 'system' };  
    }  
}  
  
function getPlayerMarket(filters = {}) {  
    const scoutLevel = gameState.staff.scout?.level || 0;  
    return getPlayerMarketData(filters, scoutLevel);  
}  
  
function getYoungsterMarket(filters = {}) {  
    const scoutLevel = gameState.staff.scout?.level || 0;  
    return getYoungsterMarketData(filters, scoutLevel);  
}  
  
  
const calculateTeamEffectiveOverall = (teamSquad) => {  
    const availablePlayers = teamSquad.filter(p => !p.isInjured);  
    if (availablePlayers.length === 0) return 40;  
    return availablePlayers.reduce((sum, p) => sum + p.overall, 0) / availablePlayers.length;  
};  
  
function generateInjury(player) {  
    let injuryProb = BASE_INJURY_PROB_PER_MATCH;  
    let recoveryMin = BASE_RECOVERY_TIME_WEEKS.min;  
    let recoveryMax = BASE_RECOVERY_TIME_WEEKS.max;  
  
    if (gameState.staff.fisio) {  
        const fisioLevel = gameState.staff.fisio.level;  
        const fisioEffect = STAFF_LEVEL_EFFECTS[fisioLevel]?.injuryProb || 1;  
        injuryProb /= fisioEffect;  
    }  
  
    if (player.form < 60) injuryProb *= 1.5;  
    if (player.AG > 85) injuryProb *= 1.2;  
  
    if (Math.random() < injuryProb) {  
        player.isInjured = true;  
        if (gameState.staff.medico) {  
            const medicoLevel = gameState.staff.medico.level;  
            const medicoEffect = STAFF_LEVEL_EFFECTS[medicoLevel]?.recoveryTime || 1;  
            recoveryMin = Math.max(1, Math.round(recoveryMin / medicoEffect));  
            recoveryMax = Math.max(1, Math.round(recoveryMax / medicoEffect));  
        }  
        player.weeksOut = Math.max(1, Math.round(Math.random() * (recoveryMax - recoveryMin) + recoveryMin));  
  
        addNews(`¡${player.name} se ha lesionado! Estará de baja ${player.weeksOut} semanas.`, 'warning');  
        return true;  
    }  
    return false;  
}

// 🆕 FUNCIÓN PARA GENERAR TARJETAS
function generateCards(player) {
    const baseCardProb = 0.18; // 18% probabilidad base de tarjeta
    let cardProb = baseCardProb;
    
    // Jugadores más agresivos (bajo DF, alto AT) tienen más probabilidad
    if (player.DF < 60) cardProb *= 1.3;
    if (player.AT > 80) cardProb *= 1.2;
    
    // Mentalidad ofensiva = más tarjetas
    if (gameState.mentality === 'offensive') cardProb *= 1.15;
    
    if (Math.random() < cardProb) {
        const isRed = Math.random() < 0.08; // 8% de que sea roja directa
        
        if (isRed) {
            player.redCards++;
            player.isSuspended = true;
            player.suspensionWeeks = 1; // 1 partido de sanción por roja
            addNews(`🟥 ¡${player.name} ha visto tarjeta ROJA! Sancionado 1 partido.`, 'error');
            return 'red';
        } else {
            player.yellowCards++;
            addNews(`🟨 ${player.name} ha visto tarjeta amarilla.`, 'warning');
            
            // Ciclo de 5 amarillas = sanción
            if (player.yellowCards >= 5) {
                player.isSuspended = true;
                player.suspensionWeeks = 1;
                player.yellowCards = 0; // Reset tras sanción
                addNews(`⚠️ ${player.name} sancionado por acumulación de 5 amarillas. Descansa 1 partido.`, 'warning');
                return 'yellow-suspension';
            }
            return 'yellow';
        }
    }
    return null;
}
  
function calculateMatchOutcome({ teamOverall, opponentOverall, mentality = 'balanced', isHome = true, teamForm = 75, opponentForm = 75 }) {
    let teamFactor = teamOverall / 100 * (teamForm / 100);
    let opponentFactor = opponentOverall / 100 * (opponentForm / 100);

    if (isHome) teamFactor *= 1.1;
    else opponentFactor *= 1.1;

    switch (mentality) {
        case 'offensive':
            teamFactor *= 1.15;
            opponentFactor *= 0.9;
            break;
        case 'defensive':
            teamFactor *= 0.9;
            opponentFactor *= 1.1;
            break;
        case 'balanced':
        default:
            break;
    }

    const randomModTeam = (Math.random() - 0.5) * 0.2;
    const randomModOpp = (Math.random() - 0.5) * 0.2;

    teamFactor += randomModTeam;
    opponentFactor += randomModOpp;

    teamFactor = Math.max(0.1, teamFactor);
    opponentFactor = Math.max(0.1, opponentFactor);

    const teamGoals = Math.round(teamFactor * (Math.random() * 4 + 1));
    const opponentGoals = Math.round(opponentFactor * (Math.random() * 4 + 1));

    return {
        teamGoals: Math.max(0, teamGoals),
        opponentGoals: Math.max(0, opponentGoals)
    };
}


  
function playMatch(homeTeamName, awayTeamName) {
    let homeTeamOverall = 70 + Math.floor(Math.random() * 20);
    let awayTeamOverall = 70 + Math.floor(Math.random() * 20);

    let homeForm = 75;
    let awayForm = 75;
    let homeMentality = 'balanced';
    let awayMentality = 'balanced';

    if (homeTeamName === gameState.team) {
        homeTeamOverall = calculateTeamEffectiveOverall(gameState.lineup);
        homeMentality = gameState.mentality;
    }
    if (awayTeamName === gameState.team) {
        awayTeamOverall = calculateTeamEffectiveOverall(gameState.lineup);
        awayMentality = gameState.mentality;
    }

    const { teamGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchOutcome({
        teamOverall: homeTeamOverall,
        opponentOverall: awayTeamOverall,
        mentality: homeMentality,
        isHome: true,
        teamForm: homeForm,
        opponentForm: awayForm
    });

    const updateStats = (team, gf, gc) => {
        const s = gameState.standings[team];
        if (s) {
            s.pj++;
            s.gf += gf;
            s.gc += gc;
            if (gf > gc) { s.g++; s.pts += 3; }
            else if (gf === gc) { s.e++; s.pts += 1; }
            else s.p++;
        }
    };
    updateStats(homeTeamName, homeGoals, awayGoals);
    updateStats(awayTeamName, awayGoals, homeGoals);

    // 🆕 GENERAR TARJETAS Y LESIONES PARA MI EQUIPO
    if (homeTeamName === gameState.team || awayTeamName === gameState.team) {
        gameState.lineup.forEach(player => {
            if (player && !player.isInjured) {
                // Generar tarjetas
                generateCards(player);
                // 🔧 GENERAR LESIONES
                generateInjury(player);
            }
        });
        
        addNews(`Partido: ${homeTeamName} ${homeGoals} - ${awayGoals} ${awayTeamName}`, 'info');
    }

    return { homeTeam: homeTeamName, awayTeam: awayTeamName, homeGoals, awayGoals };
}


  
function secondCoachAdvice() {  
    if (!gameState.staff.segundoEntrenador) return;  
  
    const currentLineup = gameState.lineup;  
    const availableSquad = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
  
    if (gameState.trainingFocus.playerIndex === -1 && Math.random() < 0.7) {  
        addNews(`[Segundo Entrenador] ¡No hemos fijado un foco de entrenamiento para esta semana!`, 'warning');  
    }  
  
    const lowFormLineupPlayers = currentLineup.filter(p => p.form < 65 && !p.isInjured);  
    if (lowFormLineupPlayers.length > 0 && Math.random() < 0.6) {  
        const p = lowFormLineupPlayers[Math.floor(Math.random() * lowFormLineupPlayers.length)];  
        addNews(`[Segundo Entrenador] ${p.name} (${p.overall}) tiene baja forma (${p.form}). ¿Debería salir en el once inicial?`, 'warning');  
    }  
  
    const promisingBenched = availableSquad.filter(p =>  
        !currentLineup.some(lp => lp.name === p.name) &&  
        p.age < 23 && p.potential > 80 && p.matches < (gameState.week * 0.5)  
    );  
    if (promisingBenched.length > 0 && Math.random() < 0.4) {  
        const p = promisingBenched[Math.floor(Math.random() * promisingBenched.length)];  
        addNews(`[Segundo Entrenador] ${p.name} (${p.overall}/${p.potential}) es un gran talento. Deberíamos darle más minutos para que crezca.`, 'info');  
    }  
  
    const criticalPositions = ['POR', 'DFC', 'MC', 'DC'];  
    for (const pos of criticalPositions) {  
        const availableInPosition = availableSquad.filter(p => p.position === pos).length;  
        if (pos === 'POR' && availableInPosition < 2) {  
            addNews(`[Segundo Entrenador] Solo tenemos ${availableInPosition} ${pos} apto. Deberíamos buscar refuerzos para la portería.`, 'warning');  
        } else if (pos !== 'POR' && availableInPosition < 3) {  
            addNews(`[Segundo Entrenador] Tenemos pocos ${pos} aptos (${availableInPosition}). Considera fichar.`, 'warning');  
        }  
    }  
  
    if (gameState.staff.scout && gameState.balance > 100000 && Math.random() < 0.3) {  
        const topPlayersInMarket = getPlayerMarketData({}, gameState.staff.scout.level)  
                                    .filter(p => p.overall > 80 && p.transferListed && !p.loanListed);  
        if (topPlayersInMarket.length > 0) {  
            const p = topPlayersInMarket[Math.floor(Math.random() * topPlayersInMarket.length)];  
            addNews(`[Segundo Entrenador] Nuestro ojeador ha encontrado a ${p.name} (${p.position}, OVR ${p.overall}) del ${p.club}. ¡Podría ser un gran fichaje!`, 'info');  
        }  
    }  
  
    // 🆕 AVISOS SOBRE TARJETAS Y SANCIONES
    const playersWithYellows = gameState.squad.filter(p => p.yellowCards >= 4);
    if (playersWithYellows.length > 0) {
        playersWithYellows.forEach(p => {
            addNews(`[Segundo Entrenador - ATENCIÓN] ${p.name} tiene ${p.yellowCards} amarillas. ¡Una más y será sancionado!`, 'warning');
        });
    }
    
    const suspendedPlayers = currentLineup.filter(p => p.isSuspended);
    if (suspendedPlayers.length > 0) {
        suspendedPlayers.forEach(p => {
            addNews(`[Segundo Entrenador - CRÍTICO] ¡${p.name} está SANCIONADO y no puede jugar! Retíralo de la alineación.`, 'error');
        });
    }
    
    const lineupValidation = validateLineup(currentLineup);  
    if (!lineupValidation.success) {
        addNews(`[Segundo Entrenador - ALINEACIÓN CRÍTICA] Tu alineación es INVÁLIDA: ${lineupValidation.message}. Por favor, corrígela.`, 'error');  
    }  
}  
  
function boardMessages() {  
    let satisfaction = 0;  
    const teamStats = gameState.standings[gameState.team];  
    if (teamStats && teamStats.pj > 0) {  
        satisfaction += (teamStats.pts / teamStats.pj) - 2;  
        satisfaction += gameState.balance / 100000;  
        satisfaction += gameState.popularity / 10 - 5;  
  
        let message = '';  
        if (satisfaction < -2) {  
            message = `[Directiva] Esperábamos mejores resultados a estas alturas de la temporada y estamos preocupados. Hay que mejorar.`;  
            addNews(message, 'error');  
        } else if (satisfaction < 0) {  
            message = `[Directiva] No estamos del todo satisfechos con el progreso actual. Es necesario un empujón.`;  
            addNews(message, 'warning');  
        } else if (satisfaction > 2) {  
            message = `[Directiva] Felicitaciones por el buen desempeño del equipo y la excelente gestión. Sigan así.`;  
            addNews(message, 'success');  
        } else if (Math.random() < 0.1) {  
             message = `[Directiva] La estabilidad económica es clave para nuestro proyecto a largo plazo.`;  
             addNews(message, 'info');  
        }  
    }  
}  
  
function endSeason() {  
    const currentDivision = gameState.division;  
    const currentSeason = gameState.currentSeason;  
    const teams = Object.entries(gameState.standings).sort((a, b) => b[1].pts - a[1].pts);  
    const myTeamRank = teams.findIndex(([name]) => name === gameState.team) + 1;  
  
    let nextDivisionKey = currentDivision;  
  
    let seasonSummary = `¡Fin de la temporada ${currentSeason}!\n`;  
  
    const promoReleConfig = PROMOTION_RELEGATION[currentDivision];  
  
    if (currentDivision.includes('rfef')) {
        const numPromote = promoReleConfig.promote;  
        const teamsInMyGroup = gameState.leagueTeams;  
        const sortedMyGroup = teams.filter(([teamName]) => teamsInMyGroup.includes(teamName));  
        const myTeamRankInGroup = sortedMyGroup.findIndex(([name]) => name === gameState.team) + 1;  
  
        if (myTeamRankInGroup <= numPromote) {  
            seasonSummary += `¡Has ascendido a Segunda División! Felicidades.\n`;  
            nextDivisionKey = 'segunda';  
        } else if (myTeamRankInGroup > (teamsInMyGroup.length - promoReleConfig.relegate)) {  
            seasonSummary += `¡Has descendido a Tercera RFEF! Es hora de reconstruir.\n`;  
            nextDivisionKey = 'rfef_grupo1';
        }  
        else {  
            seasonSummary += `Tu equipo permanece en Primera RFEF.\n`;  
        }  
            
        const promotedTeams = sortedMyGroup.slice(0, numPromote);  
        seasonSummary += `Equipos que ascienden de tu grupo a Segunda: ${promotedTeams.map(t => t[0]).join(', ')}.\n`;  
        const relegatedTeams = sortedMyGroup.slice(-promoReleConfig.relegate);  
        seasonSummary += `Equipos que descienden de tu grupo a Tercera RFEF: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
    } else if (currentDivision === 'segunda') {  
        const numPromote = promoReleConfig.promote;  
        const promotedTeams = teams.slice(0, numPromote);  
        if (myTeamRank <= numPromote) {  
            seasonSummary += `¡Has ascendido a Primera División! ¡Un logro enorme!\n`;  
            nextDivisionKey = 'primera';  
        }  
  
        const numRelegate = promoReleConfig.relegate;  
        const relegatedTeams = teams.slice(-numRelegate);  
        if (myTeamRank > teams.length - numRelegate) {  
            seasonSummary += `¡Has descendido a Primera RFEF! Es hora de reconstruir.\n`;  
            nextDivisionKey = Math.random() < 0.5 ? 'rfef_grupo1' : 'rfef_grupo2';  
        } else if (myTeamRank > numPromote) {  
            seasonSummary += `Tu equipo permanece en Segunda División.\n`;  
        }  
        seasonSummary += `Equipos que ascienden a Primera: ${promotedTeams.map(t => t[0]).join(', ')}.\n`;  
        seasonSummary += `Equipos que descienden a Primera RFEF: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
  
    } else if (currentDivision === 'primera') {  
        const numRelegate = promoReleConfig.relegate;  
        const relegatedTeams = teams.slice(-numRelegate);  
        if (myTeamRank > teams.length - numRelegate) {  
            seasonSummary += `¡Has descendido a Segunda División! A trabajar para volver.\n`;  
            nextDivisionKey = 'segunda';  
        } else {  
            seasonSummary += `Tu equipo permanece en Primera División.\n`;  
        }  
        seasonSummary += `Equipos que descienden a Segunda: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
        const topPositions = [1, 2, 3, 4, 5, 6, 7];  
        if (topPositions.slice(0, 4).includes(myTeamRank)) {  
            seasonSummary += `¡Te has clasificado para la Champions League!\n`;  
        } else if (topPositions.slice(4, 6).includes(myTeamRank)) {  
            seasonSummary += `¡Te has clasificado para la Europa League!\n`;  
        } else if (topPositions.slice(6, 7).includes(myTeamRank)) {  
            seasonSummary += `¡Te has clasificado para la Conference League!\n`;  
        }  
    }  
  
    alert(seasonSummary);  
    addNews(seasonSummary, 'info');  
    setupNewSeason(currentDivision, nextDivisionKey);  
}  
  
function simulateFullWeek() {
    let myMatchResult = null;
    let forcedLoss = false;

    // 🔹 Pretemporada
    if (gameState.seasonType === 'preseason') {
        handlePreseasonWeek();
        gameState.week++;
        updateWeeklyFinancials();

        if (gameState.week > PRESEASON_WEEKS) {
            gameState.seasonType = 'regular';
            gameState.week = 1;
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${gameState.division}!`, 'success');
        }
        return { myMatch: null, forcedLoss: false };
    }

    // 🔹 VALIDACIÓN DE ALINEACIÓN ANTES DE SIMULAR
    const preSimLineupValidation = validateLineup(gameState.lineup);

    if (!preSimLineupValidation.success) {
        addNews(`[ALINEACIÓN INVÁLIDA] ${preSimLineupValidation.message}`, 'error');

        // ❌ Detener la simulación: no avanzar semana ni jugar partidos
        return { myMatch: null, forcedLoss: false, error: true, message: 'Corrige la alineación antes de jugar la jornada.' };
    }

    // 🔹 A partir de aquí, la alineación es válida y se puede simular la jornada
    applyWeeklyTraining();

    // 🔹 Reducir sanciones y lesiones
    gameState.squad.forEach(p => {
        if (p.isInjured) {
            p.weeksOut--;
            if (p.weeksOut <= 0) {
                p.isInjured = false;
                p.weeksOut = 0;
                addNews(`¡${p.name} se ha recuperado de su lesión!`, 'info');
            }
        }
        if (p.isSuspended) {
            p.suspensionWeeks--;
            if (p.suspensionWeeks <= 0) {
                p.isSuspended = false;
                p.suspensionWeeks = 0;
                addNews(`✅ ${p.name} ha cumplido su sanción y puede volver a jugar.`, 'success');
            }
        }
    });

    gameState.academy.forEach(y => {
        if (y.isInjured) {
            y.weeksOut--;
            if (y.weeksOut <= 0) {
                y.isInjured = false;
                y.weeksOut = 0;
                addNews(`¡${y.name} (cantera) se ha recuperado de su lesión!`, 'info');
            }
        }
        if (y.isSuspended) {
            y.suspensionWeeks--;
            if (y.suspensionWeeks <= 0) {
                y.isSuspended = false;
                y.suspensionWeeks = 0;
            }
        }
    });

    secondCoachAdvice();

    if (gameState.week % 4 === 0) {
        boardMessages();
    }

    // 🔹 Obtener los partidos de esta jornada
    const currentWeekMatches = gameState.seasonCalendar.filter(match => match.week === gameState.week);
    console.log(`📅 Jornada ${gameState.week}: ${currentWeekMatches.length} partidos programados`);

    // 🔹 Partidos de mi equipo
    let myTeamMatch = currentWeekMatches.find(match =>
        match.home === gameState.team || match.away === gameState.team
    );

    if (myTeamMatch) {
        const result = playMatch(myTeamMatch.home, myTeamMatch.away);

        myMatchResult = {
            home: result.homeTeam,
            away: result.awayTeam,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            score: `${result.homeGoals}-${result.awayGoals}`,
        };

        gameState.matchHistory.push({
            week: gameState.week,
            home: result.homeTeam,
            away: result.awayTeam,
            score: `${result.homeGoals}-${result.awayGoals}`
        });
    }

    // 🔹 Partidos de otros equipos
    currentWeekMatches
        .filter(match => match !== myTeamMatch)
        .forEach(match => {
            const alreadyPlayed = gameState.matchHistory.some(mh =>
                mh.week === gameState.week &&
                mh.home === match.home &&
                mh.away === match.away
            );

            if (!alreadyPlayed) {
                const result = playMatch(match.home, match.away);
                gameState.matchHistory.push({
                    week: gameState.week,
                    home: result.homeTeam,
                    away: result.awayTeam,
                    score: `${result.homeGoals}-${result.awayGoals}`
                });

                console.log(`⚽ ${result.homeTeam} ${result.homeGoals}-${result.awayGoals} ${result.awayTeam}`);
            }
        });

    console.log(`✅ Jornada ${gameState.week} completada - ${gameState.matchHistory.filter(m => m.week === gameState.week).length} partidos jugados`);

    // 🔹 Avanzar semana y actualizar finanzas
    gameState.week++;
    updateWeeklyFinancials();

    // 🔹 Mensajes y alertas por crisis financiera
    if (gameState.staff.segundoEntrenador &&
        (gameState.weeklyIncome - gameState.weeklyExpenses < -10000) &&
        gameState.balance < 0) {
        addNews(`[Segundo Entrenador - ¡CRISIS!] Nuestros números están muy mal. Si esto continúa, la directiva podría tomar medidas drásticas.`, 'error');
    }

    if (gameState.balance < -100000 && gameState.week > 10) {
        addNews(`¡Has sido despedido! La directiva ha perdido la confianza debido a la pésima gestión económica.`, 'error');
        alert("¡GAME OVER! Has sido despedido por la directiva.");
        resetGame();
        return { myMatch: myMatchResult, forcedLoss: forcedLoss, gameOver: true };
    }

    // 🔹 Final de temporada
    if (gameState.week > gameState.maxSeasonWeeks) {
        endSeason();
    }

    return { myMatch: myMatchResult, forcedLoss: forcedLoss };
}

  
function handlePreseasonWeek() {  
    addNews(`Semana ${gameState.week} de pretemporada.`, 'system');  
    if (Math.random() < 0.5) {  
        const currentDivisionTeams = gameState.leagueTeams;  
        const potentialOpponents = currentDivisionTeams.filter(t => t !== gameState.team);  
        if (potentialOpponents.length > 0) {  
            const opponent = potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];  
            gameState.nextOpponent = opponent;  
            if (gameState.staff.segundoEntrenador) {  
                addNews(`[Segundo Entrenador] Hemos recibido una invitación para un amistoso de pretemporada contra el ${opponent}.`, 'info');  
            } else {  
                addNews(`Invitación para amistoso de pretemporada contra el ${opponent}.`, 'info');  
            }  
        }  
    }  
}  
  
function updateWeeklyFinancials() {  
    const playerSalaries = gameState.squad.reduce((sum, p) => sum + p.salary, 0);  
    const staffSalaries = Object.values(gameState.staff).reduce((sum, s) => sum + (s?.salary || 0), 0);  
    gameState.weeklyExpenses = playerSalaries + staffSalaries;  
  
    let attendance = Math.floor(gameState.stadiumCapacity * (0.5 + (gameState.popularity / 200) - (gameState.ticketPrice / 100)));  
    attendance = Math.max(0, Math.min(gameState.stadiumCapacity, attendance));  
  
    gameState.merchandisingItemsSold = Math.floor(gameState.fanbase * (gameState.popularity / 500) * (0.01 + Math.random() * 0.02));  
    gameState.merchandisingRevenue = gameState.merchandisingItemsSold * gameState.merchandisingPrice;  
  
    gameState.weeklyIncome = gameState.weeklyIncomeBase +  
                             Math.floor(gameState.ticketPrice * attendance) +  
                             gameState.merchandisingRevenue;  
  
    if (gameState.team) {  
        gameState.balance = gameState.balance + gameState.weeklyIncome - gameState.weeklyExpenses;  
    }  
}  
  
function expandStadium(cost = 50000, capacityIncrease = 10000) {  
    if (gameState.balance < cost) {  
        return { success: false, message: 'Dinero insuficiente para expandir el estadio.' };  
    }  
    gameState.balance -= cost;  
    gameState.stadiumCapacity += capacityIncrease;  
    gameState.weeklyIncomeBase += Math.floor(capacityIncrease / 20);  
    updateWeeklyFinancials();  
    addNews(`¡Estadio expandido a ${gameState.stadiumCapacity.toLocaleString('es-ES')} espectadores!`);  
    return { success: true, message: `¡Estadio expandido a ${gameState.stadiumCapacity} espectadores!` };  
}  
  
function improveFacilities(cost = 30000, trainingLevelIncrease = 1) {  
    if (gameState.balance < cost) {  
        return { success: false, message: 'Dinero insuficiente para mejorar las instalaciones.' };  
    }  
    gameState.balance -= cost;  
    gameState.trainingLevel = (gameState.trainingLevel || 0) + trainingLevelIncrease;  
    gameState.merchandisingRevenue += 200;  
    updateWeeklyFinancials();  
    addNews(`¡Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}!`);  
    return { success: true, message: `¡Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}!` };  
}  
  
let currentStaffCandidates = {};  
  
function generateStaffCandidates(role, forceNew = false) {  
    if (currentStaffCandidates[role] && !forceNew) {  
        return currentStaffCandidates[role];  
    }  
  
    const candidates = [];  
    const roleConfig = STAFF_ROLES[role];  
    const staffNames = ["Juan", "Pedro", "María", "Carlos", "Ana", "Luis", "Sofía", "Pablo", "Laura", "Diego", "Miguel", "Sergio", "Elena", "Ricardo", "Carmen", "Javier"];  
  
    const divisionForMultiplier = gameState.division.includes('rfef') ? 'rfef_grupo1' : gameState.division;  
    const divisionFactor = DIVISION_MULTIPLIERS[divisionForMultiplier] || 1;  
  
    for (let i = 0; i < 3; i++) {  
        const level = 1 + Math.floor(Math.random() * 5);
        const salary = Math.floor(roleConfig.minSalary + (roleConfig.maxSalary - roleConfig.minSalary) * (level / 5));  
        const name = staffNames[Math.floor(Math.random() * staffNames.length)] + " " + staffNames[Math.floor(Math.random() * staffNames.length)];  
  
        let clausula = Math.floor(roleConfig.baseClausula * level * roleConfig.levelCostMultiplier * divisionFactor * (0.8 + Math.random() * 0.4));  
  
        if (level === 1 && Math.random() < 0.5) {  
            clausula = 0;  
        } else if (level <= 2 && Math.random() < 0.2) {  
            clausula = 0;  
        } else {  
            clausula = Math.max(clausula, 1000);  
        }  
  
        candidates.push({ name: name, level: level, salary: Math.round(salary), role: role, displayName: roleConfig.displayName, clausula: Math.round(clausula) });  
    }  
    currentStaffCandidates[role] = candidates;  
    return candidates;  
}  
  
function hireStaffFromCandidates(candidate) {  
    const existingStaff = gameState.staff[candidate.role];  
    let indemnization = 0;  
  
    if (existingStaff) {  
        indemnization = existingStaff.salary * 52;  
        if (gameState.balance < indemnization + candidate.clausula + candidate.salary) {  
            return { success: false, message: `Dinero insuficiente. Necesitas ${indemnization.toLocaleString('es-ES')}€ para indemnizar a ${existingStaff.name} y pagar al nuevo staff.`, type: 'error' };  
        }  
        gameState.balance -= indemnization;  
        addNews(`¡${existingStaff.name} (${existingStaff.displayName}) ha sido despedido con una indemnización de ${indemnization.toLocaleString('es-ES')}€!`, 'warning');  
    }  
  
    if (gameState.balance < candidate.clausula) {  
        return { success: false, message: `Dinero insuficiente para pagar la cláusula de ${candidate.clausula.toLocaleString('es-ES')}€.` };  
    }  
    if (gameState.balance < candidate.salary) {  
        return { success: false, message: `Dinero insuficiente para pagar el salario de ${candidate.salary.toLocaleString('es-ES')}€/sem.` };  
    }  
  
    gameState.balance -= candidate.clausula;  
    gameState.staff[candidate.role] = candidate;  
    currentStaffCandidates[candidate.role] = null;  
    updateWeeklyFinancials();  
    addNews(`¡${candidate.name} (${candidate.displayName}, Nivel ${candidate.level}) se une al staff! (Cláusula: ${candidate.clausula.toLocaleString('es-ES')}€)`, 'success');  
    return { success: true, message: `¡${candidate.displayName} ${candidate.name} contratado exitosamente!` };  
}  
  
function setTicketPrice(newPrice) {  
    newPrice = parseInt(newPrice);  
    if (isNaN(newPrice) || newPrice < 5 || newPrice > 100) {  
        return { success: false, message: 'El precio de la entrada debe ser un número entre 5 y 100.' };  
    }  
    gameState.ticketPrice = newPrice;  
    updateWeeklyFinancials();  
    return { success: true, message: `El precio de la entrada se ha establecido en ${newPrice}€.` };  
}  
  
function setMerchandisingPrice(newPrice) {  
    newPrice = parseInt(newPrice);  
    if (isNaN(newPrice) || newPrice < 1 || newPrice > 50) {  
        return { success: false, message: 'El precio del merchandising debe ser un número entre 1 y 50.' };  
    }  
    gameState.merchandisingPrice = newPrice;  
    updateWeeklyFinancials();  
    return { success: true, message: `El precio del merchandising se ha establecido en ${newPrice}€.` };  
}  
  
function getLineup() {  
    return [...gameState.lineup];  
}  
  
function getReservePlayers() {  
    const lineupNames = new Set(gameState.lineup.map(p => p.name));  
    return gameState.squad.filter(p => !lineupNames.has(p.name));  
}  
  
function setLineup(newLineup) {  
    if (newLineup.length > 11) {  
        console.warn("Intentando establecer una alineación con más de 11 jugadores. Se truncará.");  
        newLineup = newLineup.slice(0, 11);  
    }  
          
    if (newLineup.length < 11) {  
        const availableSquadPlayers = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
        const currentLineupNames = new Set(newLineup.map(p => p.name));  
        const playersToFill = availableSquadPlayers  
                                .filter(p => !currentLineupNames.has(p.name))  
                                .sort((a,b) => b.overall - a.overall)  
                                .slice(0, 11 - newLineup.length);  
              
        gameState.lineup = [...newLineup, ...playersToFill];  
        if (gameState.lineup.length > 11) {  
            gameState.lineup = gameState.lineup.slice(0, 11);  
        }  
    } else {  
        gameState.lineup = newLineup;  
    }  
  
    const validPlayers = gameState.lineup.every(p => gameState.squad.some(s => s.name === p.name));  
    if (!validPlayers) {  
        console.warn("Jugadores en la alineación no encontrados en la plantilla. Reconstruyendo alineación.");  
        const currentSquadNames = new Set(gameState.squad.map(p => p.name));  
        const filteredLineup = gameState.lineup.filter(p => currentSquadNames.has(p.name));  
        gameState.lineup = filteredLineup;  
        if (gameState.lineup.length < 11) {  
            const availableSquadPlayers = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
            const currentFilteredLineupNames = new Set(filteredLineup.map(p => p.name));  
            const playersToFill = availableSquadPlayers  
                                    .filter(p => !currentFilteredLineupNames.has(p.name))  
                                    .sort((a,b) => b.overall - a.overall)  
                                    .slice(0, 11 - gameState.lineup.length);  
            gameState.lineup = [...gameState.lineup, ...playersToFill];  
        }  
    }  
      
    return { success: true, message: 'Alineación guardada correctamente.' };  
}  
  
function validateLineup(lineupToCheck) {  
    if (!Array.isArray(lineupToCheck) || lineupToCheck.length !== 11) {  
        return { success: false, message: 'La alineación debe contener exactamente 11 jugadores.' };  
    }  
  
    const availablePlayers = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
    const availablePlayerNames = new Set(availablePlayers.map(p => p.name));  
    const playerNamesInLineup = new Set();  
    let hasGK = false;  
    let numNonGkPlayers = 0;  
  
    for (const player of lineupToCheck) {  
        if (!player) {  
            return { success: false, message: '¡Error! Hay slots vacíos en la alineación. Debes rellenar los 11 puestos.' };  
        }  
        if (playerNamesInLineup.has(player.name)) {  
            return { success: false, message: `¡Error! El jugador ${player.name} está duplicado en la alineación.` };  
        }  
        playerNamesInLineup.add(player.name);  
  
        if (!availablePlayerNames.has(player.name)) {  
            const fullPlayer = gameState.squad.find(p => p.name === player.name);  
            if (fullPlayer && fullPlayer.isInjured) {  
                return { success: false, message: `¡Error! ${player.name} está lesionado y no puede jugar.` };  
            }
            // 🆕 VALIDAR SANCIONES
            if (fullPlayer && fullPlayer.isSuspended) {
                return { success: false, message: `¡Error! ${player.name} está SANCIONADO y no puede jugar.` };
            }
            return { success: false, message: `¡Error! ${player.name} no está en la plantilla o no está apto.` };  
        }  
  
        if (player.position === 'POR') {  
            hasGK = true;  
        } else {  
            numNonGkPlayers++;  
        }  
    }  
  
    if (!hasGK) {  
        return { success: false, message: '¡Error! Necesitas al menos un portero en la alineación.' };  
    }  
        
    if (numNonGkPlayers !== 10) {  
        return { success: false, message: '¡Error! Debes alinear exactamente 1 portero y 10 jugadores de campo.' };  
    }  
  
  
    return { success: true, message: 'Alineación válida.' };  
}  
  
function saveToLocalStorage() {  
    localStorage.setItem('pcfutbol-save', JSON.stringify(gameState));  
    return { success: true, message: 'Partida guardada en el dispositivo.' };  
}  
  
function loadFromLocalStorage() {  
    const saved = localStorage.getItem('pcfutbol-save');  
    if (saved) {  
        const loadedState = JSON.parse(saved);  
        Object.assign(gameState, loadedState);  
        Object.keys(STAFF_ROLES).forEach(role => {  
            if (gameState.staff[role] === undefined) gameState.staff[role] = null;  
        });  
        if (!gameState.newsFeed) gameState.newsFeed = [];  
        if (!gameState.unreadNewsCount) gameState.unreadNewsCount = 0;  
        if (!gameState.trainingFocus) gameState.trainingFocus = { playerIndex: -1, attribute: null };  
        
        // 🆕 MIGRACIÓN: Añadir campos de tarjetas a partidas antiguas
        gameState.squad.forEach(p => {
            if (p.yellowCards === undefined) p.yellowCards = 0;
            if (p.redCards === undefined) p.redCards = 0;
            if (p.isSuspended === undefined) p.isSuspended = false;
            if (p.suspensionWeeks === undefined) p.suspensionWeeks = 0;
        });
        
        gameState.academy.forEach(y => {
            if (y.yellowCards === undefined) y.yellowCards = 0;
            if (y.redCards === undefined) y.redCards = 0;
            if (y.isSuspended === undefined) y.isSuspended = false;
            if (y.suspensionWeeks === undefined) y.suspensionWeeks = 0;
        });
              
        if (!gameState.lineup || gameState.lineup.length === 0) {  
            gameState.lineup = gameState.squad.slice(0, 11);  
        } else if (gameState.lineup.length < 11) {  
            setLineup(gameState.lineup);
        }  
              
        if (!gameState.currentSeason) gameState.currentSeason = '2025/2026';  
        if (!gameState.seasonType) gameState.seasonType = 'preseason';  
        if (!gameState.leagueTeams || gameState.leagueTeams.length === 0) {  
            const divisionKey = gameState.division;  
            let teamsInDivision = TEAMS_DATA[divisionKey];  
            if (!teamsInDivision) {
                console.warn(`División "${divisionKey}" no encontrada al cargar. Usando 'primera' por defecto.`);  
                teamsInDivision = TEAMS_DATA.primera;  
                gameState.division = 'primera';
            }  
      
            if (!teamsInDivision.includes(gameState.team)) {  
                teamsInDivision.push(gameState.team);  
            }  
            gameState.leagueTeams = teamsInDivision;  
        }  
        if (!gameState.seasonCalendar || gameState.seasonCalendar.length === 0) {  
            console.log("Generando calendario al cargar partida.");  
            gameState.seasonCalendar = generateLeagueCalendar(gameState.leagueTeams);  
        }  
        if (!gameState.maxSeasonWeeks || gameState.maxSeasonWeeks === 0) {  
            gameState.maxSeasonWeeks = gameState.leagueTeams.length * 2 - 2;  
        }  
    
        if (!gameState.nextOpponent) gameState.nextOpponent = null;  
        if (!gameState.nextOpponent && gameState.seasonCalendar.length > 0 && gameState.week <= gameState.maxSeasonWeeks) {  
            const matchesForCurrentWeek = gameState.seasonCalendar.filter(match => match.week === gameState.week);  
            const myMatch = matchesForCurrentWeek.find(match => match.home === gameState.team || match.away === gameState.team);  
            if (myMatch) {  
                gameState.nextOpponent = (myMatch.home === gameState.team) ? myMatch.away : myMatch.home;  
            } else {  
                gameState.nextOpponent = "No hay oponente";
            }  
        }  
            
        updateWeeklyFinancials();  
        return { success: true, message: 'Partida cargada.' };  
    }  
    return { success: false, message: 'No hay partida guardada en el dispositivo.' };  
}  
  
function resetGame() {  
    localStorage.removeItem('pcfutbol-save');  
    initPlayerDatabase();  
    initYoungsterDatabase();  
    window.location.reload();  
}  
  
function getSeasonCalendar() {  
    return gameState.seasonCalendar;  
}  
      
export {  
    getGameState,  
    updateGameState,  
    selectTeamWithInitialSquad,  
    simulateFullWeek,  
    playMatch,  
    signPlayer,  
    signYoungster,  
    promoteYoungster,  
    sellPlayer,  
    expandStadium,  
    improveFacilities,  
    generateStaffCandidates,  
    hireStaffFromCandidates,  
    setTicketPrice,  
    setMerchandisingPrice,  
    saveToLocalStorage,  
    loadFromLocalStorage,  
    resetGame,  
    initStandings,  
    getPlayerMarket,  
    getYoungsterMarket,  
    startNegotiation,  
    offerToPlayer,  
    offerToClub,  
    endNegotiation,  
    setTrainingFocus,  
    applyWeeklyTraining,  
    addNews,  
    markNewsAsRead,  
    getLineup,  
    getReservePlayers,  
    setLineup,  
    validateLineup,
    generateLeagueCalendar,  
    getSeasonCalendar,
    // 🆕 EXPORTAR LAS FUNCIONES CRÍTICAS
    generateCards,
    generateInjury
};  

if (typeof window !== 'undefined') {
    window.gameLogic = {
        getGameState,
        updateGameState,
        selectTeamWithInitialSquad,
        simulateFullWeek,
        playMatch,
        validateLineup,
        setLineup,
        getLineup,
        getReservePlayers,
        addNews,
        markNewsAsRead,
        // 🆕 EXPONER TAMBIÉN EN WINDOW
        generateCards,
        generateInjury
    };
}
function getAgeModifier(age) {
    if (age <= 20) return 1.5;
    if (age <= 24) return 1.2;
    if (age <= 27) return 1.0;
    if (age <= 30) return 0.7;
    if (age <= 33) return 0.3;
    return -0.5;
}

// firebase-config.js  
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';  
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';  
  
// Configuración directa de Firebase  
const firebaseConfig = {  
    enabled: true, // ⚠️ true = Firebase habilitado, false = solo localStorage  
    apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",  
    authDomain: "cuentacuentos-57631.firebaseapp.com",  
    projectId: "cuentacuentos-57631",  
    storageBucket: "cuentacuentos-57631.firebasestorage.app",  
    messagingSenderId: "654911737232",  
    appId: "1:654911737232:web:e87ecaea12351dd3d5b715"  
};  
  
let app = null;  
let db = null;  
let auth = null;  
let currentUserId = null;  
let authReady = false;  
  
// Promise para esperar a que la autenticación esté lista  
let resolveAuthReady;  
const authReadyPromise = new Promise((resolve) => {  
    resolveAuthReady = resolve; // Captura la función de resolución  
});  
window.authReadyPromise = authReadyPromise; // Exponer globalmente  
  
// Inicializar Firebase  
if (firebaseConfig.enabled) {  
    try {  
        console.log('🔥 Inicializando Firebase...');  
        app = initializeApp(firebaseConfig);  
        db = getFirestore(app);  
        auth = getAuth(app);  
  
        // Exponer globalmente  
        window.firebaseApp = app;  
        window.firebaseDB = db;  
        window.firebaseAuth = auth;  
        window.firebaseConfig = firebaseConfig; // Exponer la configuración completa  
  
       /* // Autenticación anónima INMEDIATA  
        signInAnonymously(auth)  
            .then(() => {  
                console.log('✅ Autenticación anónima iniciada');  
            })  
            .catch(error => {  
                console.error('❌ Error en autenticación anónima:', error); // Este es el error auth/admin-restricted-operation  
                // Si la autenticación anónima falla al inicio, resolvemos la promesa para no bloquear  
                if (resolveAuthReady) {  
                    resolveAuthReady(null);  
                    resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
            });  */
  
        // Listener de cambios de autenticación  
        onAuthStateChanged(auth, (user) => {  
            if (user) {  
                currentUserId = user.uid;  
                window.currentUserId = user.uid;  
                authReady = true;  
                console.log('✅ Usuario autenticado con UID:', user.uid, 'Email:', user.email || 'sin email'); 
                // Resolver la promesa de autenticación lista  
                if (resolveAuthReady) { // Asegurarse de que resolveAuthReady ha sido asignado  
                   resolveAuthReady(user.uid);  
                   resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
                // Habilitar botón de guardar si existe (se manejará en injector-firebase-sync.js también)  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.disabled = false;  
                    saveBtn.style.opacity = '1';  
                }  
            } else {  
                currentUserId = null;  
                window.currentUserId = null;  
                authReady = false;  
                console.log('⚠️ Usuario no autenticado');  
                // Deshabilitar botón de guardar si existe (se manejará en injector-firebase-sync.js también)  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.disabled = true;  
                    saveBtn.style.opacity = '0.5';  
                }  
                // Si no hay usuario y la promesa no se ha resuelto, resuélvela con null  
                if (resolveAuthReady) { // Asegurarse de que resolveAuthReady ha sido asignado  
                    resolveAuthReady(null);  
                    resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
            }  
        });  
        console.log('✅ Firebase inicializado correctamente');  
    } catch (error) {  
        console.error('❌ Error inicializando Firebase:', error);  
        window.firebaseConfig = { enabled: false }; // Deshabilitar si hay error  
        // Si Firebase falla al inicializar, resuelve la promesa para no bloquear  
        if (resolveAuthReady) {  
            resolveAuthReady(null);  
            resolveAuthReady = null;  
        }  
    }  
} else {  
    console.log('⚠️ Firebase deshabilitado en la configuración');  
    window.firebaseConfig = { enabled: false }; // Asegurarse de que esté deshabilitado globalmente  
    // Si Firebase está deshabilitado, resuelve la promesa para no bloquear  
    if (resolveAuthReady) {  
        resolveAuthReady(null);  
        resolveAuthReady = null;  
    }  
}  
  
// ==========================================  
// FUNCIONES PARA DATOS DE EQUIPOS (GLOBALES)  
// ==========================================  
  
async function saveTeamDataToFirebase(teamName, teamData) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, guardando solo en localStorage');  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para saveTeamDataToFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar para guardar datos de equipo' };  
        }  
    }  
      
    try {  
        console.log(`📤 Guardando datos de equipo en Firebase: ${teamName}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await setDoc(doc(db, 'teams_data', teamName), teamData);  
        console.log(`✅ Datos del equipo ${teamName} guardados en Firebase`);  
        // También guardar en localStorage como caché  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: true };  
    } catch (error) {  
        console.error('❌ Error guardando en Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: error.message };  
    }  
}  
  
async function getTeamDataFromFirebase(teamName) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando desde localStorage');  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            return { success: true, data: JSON.parse(localData) };  
        }  
        return { success: false, data: null };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para getTeamDataFromFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar para cargar datos de equipo' };  
        }  
    }  
  
    try {  
        console.log(`📥 Cargando desde Firebase: ${teamName}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const docRef = doc(db, 'teams_data', teamName);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            console.log(`✅ Datos del equipo ${teamName} cargados desde Firebase`);  
            const data = docSnap.data();  
            // Guardar en localStorage como caché  
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));  
            return { success: true, data: data };  
        } else {  
            console.log(`⚠️ No hay datos en Firebase para ${teamName}, buscando en localStorage`);  
            const localData = localStorage.getItem(`team_data_${teamName}`);  
            if (localData) {  
                const data = JSON.parse(localData);  
                // Subir a Firebase para sincronización  
                console.log(`📤 Subiendo datos locales de ${teamName} a Firebase...`);  
                // Asegúrate de usar el db inicializado  
                await setDoc(doc(db, 'teams_data', teamName), data);  
                return { success: true, data: data };  
            }  
            return { success: false, data: null };  
        }  
    } catch (error) {  
        console.error('❌ Error cargando desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            return { success: true, data: JSON.parse(localData) };  
        }  
        return { success: false, error: error.message };  
    }  
}  
  
async function getAllTeamsDataFromFirebase() {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando desde localStorage');  
        const allData = {};  
        Object.keys(localStorage).forEach(key => {  
            if (key.startsWith('team_data_')) {  
                const teamName = key.replace('team_data_', '');  
                try {  
                    allData[teamName] = JSON.parse(localStorage.getItem(key));  
                } catch (error) {  
                    console.error(`Error parseando datos de ${teamName}:`, error);  
                }  
            }  
        });  
        return { success: true, data: allData };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para getAllTeamsDataFromFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar para cargar todos los datos de equipo' };  
        }  
    }  
  
    try {  
        console.log('📥 Cargando todos los equipos desde Firebase...');  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const querySnapshot = await getDocs(collection(db, 'teams_data'));  
        const allData = {};  
        querySnapshot.forEach((doc) => {  
            allData[doc.id] = doc.data();  
            // Guardar en localStorage como caché  
            localStorage.setItem(`team_data_${doc.id}`, JSON.stringify(doc.data()));  
        });  
        console.log(`✅ ${Object.keys(allData).length} equipos cargados desde Firebase`);  
        return { success: true, data: allData };  
    } catch (error) {  
        console.error('❌ Error cargando todos los equipos:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
// ==========================================  
// FUNCIONES PARA PARTIDAS GUARDADAS (POR USUARIO)  
// ==========================================  
  
async function saveGameToCloud(userId, gameId, gameName, gameState) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, guardando localmente');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        localGames[gameId] = { id: gameId, name: gameName,  
            team: gameState.team, week: gameState.week, lastSaved: Date.now(), gameState: gameState };  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación antes de guardar partida...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
  
    // Validar userId y gameId después de esperar autenticación  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string') {  
        console.error('❌ Error: userId es inválido:', finalUserId);  
        return { success: false, error: 'Usuario no autenticado o ID de usuario inválido' };  
    }  
    if (!gameId || typeof gameId !== 'string') {  
        console.error('❌ Error: gameId es inválido:', gameId);  
        return { success: false, error: 'ID de partida inválido' };  
    }  
  
    try {  
        console.log(`📤 Guardando partida ${gameId} en Firebase para usuario ${finalUserId}...`);  
        const gameData = {  
            id: gameId,  
            name: gameName,  
            team: gameState.team,  
            week: gameState.week,  
            division: gameState.division,  
            lastSaved: Date.now(),  
            gameState: gameState  
        };  
        // Asegúrate de que db esté definido y no sea null/undefined aquí  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await setDoc(doc(db, 'users', finalUserId, 'saved_games', gameId), gameData);  
        console.log(`✅ Partida ${gameId} guardada en Firebase`);  
        // También guardar localmente como backup  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        localGames[gameId] = gameData;  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        console.error('❌ Error guardando partida en Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
async function loadUserSavedGames(userId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando juegos locales');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        return Object.values(localGames);  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para loadUserSavedGames...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return [];  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string') {  
        console.error('❌ Error: userId es inválido para cargar partidas');  
        return [];  
    }  
  
    try {  
        console.log(`📥 Cargando partidas guardadas desde Firebase para usuario ${finalUserId}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const querySnapshot = await getDocs(collection(db, 'users', finalUserId, 'saved_games'));  
        const games = [];  
        querySnapshot.forEach((doc) => {  
            games.push(doc.data());  
        });  
        console.log(`✅ ${games.length} partidas cargadas desde Firebase`);  
        // Guardar en localStorage como caché  
        const localGames = {};  
        games.forEach(game => { localGames[game.id] = game; });  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return games;  
    } catch (error) {  
        console.error('❌ Error cargando partidas desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        return Object.values(localGames);  
    }  
}  
  
async function loadGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando desde localStorage');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        if (localGames[gameId]) {  
            return { success: true, data: localGames[gameId] };  
        }  
        return { success: false, message: 'Partida no encontrada' };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para loadGameFromCloud...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, message: 'No se pudo autenticar' };  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string' || !gameId || typeof gameId !== 'string') {  
        console.error('❌ Error: userId o gameId son inválidos para cargar partida');  
        return { success: false, message: 'Parámetros inválidos' };  
    }  
  
    try {  
        console.log(`📥 Cargando partida ${gameId} desde Firebase para usuario ${finalUserId}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const docRef = doc(db, 'users', finalUserId, 'saved_games', gameId);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            const gameData = docSnap.data();  
            console.log(`✅ Partida ${gameId} cargada desde Firebase`);  
            return { success: true, data: gameData };  
        } else {  
            console.log('⚠️ Partida no encontrada en Firebase');  
            return { success: false, message: 'Partida no encontrada en Firebase' };  
        }  
    } catch (error) {  
        console.error('❌ Error cargando partida desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
async function deleteGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, eliminando localmente');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: true };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para deleteGameFromCloud...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string' || !gameId || typeof gameId !== 'string') {  
        console.error('❌ Error: userId o gameId son inválidos para eliminar partida');  
        return { success: false, error: 'Parámetros inválidos' };  
    }  
  
    try {  
        console.log(`🗑️ Eliminando partida ${gameId} de Firebase para usuario ${finalUserId}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await deleteDoc(doc(db, 'users', finalUserId, 'saved_games', gameId));  
        console.log(`✅ Partida ${gameId} eliminada de Firebase`);  
        // También eliminar localmente  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        console.error('❌ Error eliminando partida de Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
// ==========================================  
// EXPORTAR FUNCIONES GLOBALMENTE  
// ==========================================  
window.saveTeamDataToFirebase = saveTeamDataToFirebase;  
window.getTeamDataFromFirebase = getTeamDataFromFirebase;  
window.getAllTeamsDataFromFirebase = getAllTeamsDataFromFirebase;  
window.saveGameToCloud = saveGameToCloud;  
window.loadUserSavedGames = loadUserSavedGames;  
window.loadGameFromCloud = loadGameFromCloud;  
window.deleteGameFromCloud = deleteGameFromCloud;  
  
// Exportar como módulos ES6  
export {  
    app,  
    auth,  
    db,   
    onAuthStateChanged,  
    saveTeamDataToFirebase,  
    getTeamDataFromFirebase,  
    getAllTeamsDataFromFirebase,  
    saveGameToCloud,  
    loadUserSavedGames,  
    loadGameFromCloud,  
    deleteGameFromCloud,  
    authReadyPromise,  
    firebaseConfig // Exportar firebaseConfig también  
};  

// contractsInjector.js
(function contractsInjector() {
    const WAIT_INTERVAL = 500;
    const MAX_TRIES = 20;
    let tries = 0;

    // Esperar a que el juego y funciones estén listas
    const waitForGame = setInterval(() => {
        if (window.gameState && window.addNews && window.renderSquadList) {
            clearInterval(waitForGame);
            console.log('🧩 Contracts Injector cargado');
            initContractsSystem();
            hookEndOfSeason();
            hookFichajesView();
        }
        if (++tries > MAX_TRIES) clearInterval(waitForGame);
    }, WAIT_INTERVAL);

    // Inicializa datos de contratos y cedidos si no existen
    function initContractsSystem() {
        gameState.squad.forEach(p => {
            if (p.contractType === undefined) p.contractType = 'owned'; // 'owned' | 'loan'
            if (p.contractYears === undefined) p.contractYears = Math.floor(Math.random() * 4) + 1;
        });

        injectRenovarButton();
        notifyPendingRenewals();
    }

    // Inyecta botón "Renovar" en Fichajes (arriba de Cantera)
    // ---------------------------
// Inyecta botón "Renovar" en Fichajes
// ---------------------------
function injectRenovarButton() {
    let tries = 0;
    const maxTries = 40; // más intentos para esperar a que cargue la página

    const interval = setInterval(() => {
        // Buscamos el botón "Cantera" dentro de varias posibles secciones
        const canteraBtn = Array.from(document.querySelectorAll('button'))
            .find(b => /cantera/i.test(b.textContent));

        // Solo inyectamos si encontramos el botón y aún no existe nuestro botón
        if (canteraBtn && !document.getElementById('btn-renovar')) {
            const renovarBtn = document.createElement('button');
            renovarBtn.id = 'btn-renovar';
            renovarBtn.className = canteraBtn.className; // copia estilo del botón existente
            renovarBtn.textContent = '🔄 Renovar';
            renovarBtn.style.marginBottom = '5px';
            renovarBtn.onclick = () => {
                // Abrimos la página de renovación y cargamos los datos
                window.openPage('renewContracts');
                openRenovarView();
            };

            canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
            console.log('✅ Botón Renovar inyectado en Fichajes');
            clearInterval(interval);
            return;
        }

        tries++;
        if (tries >= maxTries) {
            clearInterval(interval);
            console.warn('⚠️ No se pudo encontrar el botón "Cantera" para inyectar "Renovar"');
        }
    }, 300); // revisamos cada 300ms
}

// ---------------------------
// Llamar a injectRenovarButton cuando se abra la página de Fichajes
// ---------------------------
if (window.openPage) {
    const originalOpenPage = window.openPage;
    window.openPage = function(pageId) {
        originalOpenPage(pageId);
        if (pageId === 'transfers') {
            setTimeout(injectRenovarButton, 300); // espera a que cargue la sección de Fichajes
        }
    };
}

    // ---------------------------
    // Abrir vista de Renovar
    // ---------------------------
    function openRenovarView() {
        const contentContainer = document.getElementById('renewContractsContent');
        if (!contentContainer) {
            console.error("Error: Elemento 'renewContractsContent' no encontrado.");
            return;
        }
        contentContainer.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Jugador</th>
                    <th>Pos</th>
                    <th>Contrato</th>
                    <th>Años</th>
                    <th>Salario</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        gameState.squad.forEach(player => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${player.name}</td>
                <td>${player.position}</td>
                <td>${player.contractType === 'loan' ? 'Cedido' : 'Propiedad'}</td>
                <td>${player.contractType === 'loan' ? '1 (Cesión)' : player.contractYears}</td>
                <td>${player.salary ? player.salary.toLocaleString('es-ES') : 'N/A'}€/sem</td>
                <td>
                    <button class="btn btn-sm btn-success" ${player.contractType === 'loan' ? 'disabled' : ''}>Negociar</button>
                </td>
            `;
            if (player.contractType === 'loan') {
                tr.querySelector('button').setAttribute('title', 'No se puede renovar a un jugador cedido');
            } else {
                tr.querySelector('button').onclick = () => openRenewNegotiation(player);
            }
            tbody.appendChild(tr);
        });

        contentContainer.appendChild(table);
    }

    // Avisos sobre jugadores pendientes de renovar
    function notifyPendingRenewals() {
        const pending = gameState.squad.filter(
            p => p.contractType === 'owned' && p.contractYears === 1
        );

        if (pending.length > 0) {
            addNews(
                `[Director Técnico] Hay ${pending.length} jugadores con contrato a punto de expirar.`,
                'warning'
            );
        }
    }

    // Negociación de renovación
    function openRenewNegotiation(player) {
        const salary = Math.round(player.salary * 1.1);

        const years = prompt(
            `Negociar renovación con ${player.name}\nAños de contrato (1-5):`,
            player.contractYears
        );
        if (!years) return;

        const accepted = Math.random() < getRenewalChance(player, salary, years);

        if (accepted) {
            player.contractYears = Number(years);
            player.salary = salary;
            addNews(
                `✅ ${player.name} ha renovado su contrato por ${years} años.`,
                'success'
            );
        } else {
            addNews(
                `❌ ${player.name} ha rechazado la oferta de renovación.`,
                'error'
            );
        }

        openRenovarView(); // refrescar tabla después de negociación
    }

    // Probabilidad de aceptación de renovación
    function getRenewalChance(player, salary, years) {
        let chance = 0.5;
        if (salary >= player.salary * 1.1) chance += 0.2;
        if (years >= player.contractYears) chance += 0.1;
        if (player.age > 30) chance += 0.1;
        if (gameState.popularity > 70) chance += 0.1;
        return Math.min(chance, 0.9);
    }

    // Hook al final de temporada
    function hookEndOfSeason() {
        const originalEndSeason = window.endSeason;
        window.endSeason = function () {
            decrementContracts();
            if (originalEndSeason) originalEndSeason.apply(this, arguments);
        };
    }

    function decrementContracts() {
        const freedPlayers = [];
        gameState.squad.forEach(player => {
            if (player.contractType === 'loan') {
                player.contractType = 'owned';
                player.contractYears = 1;
            } else {
                player.contractYears--;
                if (player.contractYears <= 0) freedPlayers.push(player);
            }
        });

        if (freedPlayers.length > 0) {
            freedPlayers.forEach(p => {
                p.isFreeAgent = true;
                gameState.squad = gameState.squad.filter(pl => pl !== p);
            });
            addNews(
                `[Mercado] ${freedPlayers.length} jugadores han quedado libres al terminar su contrato.`,
                'info'
            );
        }

        notifyPendingRenewals();
    }

    // Hook para añadir jugadores libres al final de Fichajes
    function hookFichajesView() {
        const originalRenderFichajes = window.renderFichajes;
        if (!originalRenderFichajes) return;

        window.renderFichajes = function () {
            originalRenderFichajes.apply(this, arguments);

            const table = document.querySelector('#fichajes-table tbody');
            if (!table) return;

            const freeAgents = gameState.squad.concat(gameState.freeAgents || [])
                .filter(p => p.isFreeAgent);

            freeAgents.forEach(player => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${player.name}</td>
                    <td>${player.position}</td>
                    <td>${player.age}</td>
                    <td>
                        <button class="btn btn-sm btn-primary">Negociar</button>
                    </td>
                `;
                tr.querySelector('button').onclick = () => openSignContract(player);
                table.appendChild(tr);
            });
        };
    }

    function openSignContract(player) {
        const years = prompt(`Negociar contrato con ${player.name}\nAños de contrato (1-5):`, 1);
        if (!years) return;
        const salary = prompt(`Salario anual para ${player.name}?`, 100000);
        if (!salary) return;

        player.contractType = 'owned';
        player.contractYears = Number(years);
        player.salary = Number(salary);
        player.isFreeAgent = false;
        gameState.squad.push(player);

        addNews(`✅ Has fichado a ${player.name} por ${years} años.`, 'success');
        renderFichajes();
    }

    // ---------------------------
    // Integración con openPage
    // ---------------------------
    const originalOpenPage = window.openPage;
    window.openPage = function(pageId) {
        if (originalOpenPage) originalOpenPage(pageId);
        if (pageId === 'renewContracts') openRenovarView();
    };

})();

// ==========================================
// CONFIGURACIÓN DE FIREBASE (Solo config, no exports)
// ==========================================

const firebaseConfigData = {
    enabled: true, // ⚠️ true = Firebase habilitado, false = solo localStorage
    apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",
    authDomain: "cuentacuentos-57631.firebaseapp.com",
    projectId: "cuentacuentos-57631",
    storageBucket: "cuentacuentos-57631.firebasestorage.app",
    messagingSenderId: "654911737232",
    appId: "1:654911737232:web:e87ecaea12351dd3d5b715"
};

// Exponer globalmente (no como export de módulo)
window.firebaseConfigData = firebaseConfigData;

console.log(firebaseConfigData.enabled ? '✅ Firebase HABILITADO' : '⚠️ Firebase DESHABILITADO');
  
const TEAMS_DATA = {  
    primera: [ // Primera División (20 equipos) - Basado en 23/24  
        'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Girona FC', 'Athletic Club',  
        'Real Sociedad', 'Real Betis', 'Valencia CF', 'Villarreal CF', 'Getafe CF',  
        'CA Osasuna', 'Rayo Vallecano', 'Sevilla FC', 'RCD Mallorca', 'UD Las Palmas',  
        'Celta de Vigo', 'Deportivo Alavés', 'Cádiz CF', 'Granada CF', 'UD Almería'  
    ],  
    segunda: [ // Segunda División (22 equipos) - Basado en 23/24  
        'SD Eibar', 'RCD Espanyol', 'Real Oviedo', 'Sporting Gijón', 'Levante UD',  
        'Burgos CF', 'Racing Santander', 'CD Leganés', 'Real Valladolid', 'Real Zaragoza',  
        'CD Tenerife', 'FC Cartagena', 'Albacete Balompié', 'SD Huesca', 'CD Mirandés',  
        'Villarreal B', 'AD Alcorcón', 'SD Amorebieta', 'FC Andorra', 'CD Eldense',  
        'Racing de Ferrol', 'Elche CF'  
    ],  
    rfef_grupo1: [ // Primera RFEF Grupo 1 (20 equipos) - Basado en 23/24  
        'RC Deportivo', 'FC Barcelona Atlètic', 'Real Madrid Castilla', 'Cultural Leonesa', 'Unionistas Salamanca CF',  
        'Celta Fortuna', 'Rayo Majadahonda', 'SD Logroñés', 'Osasuna Promesas', 'Real Sociedad B',  
        'Gimnàstic Tarragona', 'CE Sabadell FC', 'CD Lugo', 'UE Cornellà', 'Teruel',  
        'Fuenlabrada', 'Sestao River', 'Tarazona', 'Arenteiro', 'Logroñés'  
    ],  
    rfef_grupo2: [ // Primera RFEF Grupo 2 (20 equipos) - Basado en 23/24  
        'Málaga CF', 'Recreativo Huelva', 'Córdoba CF', 'AD Ceuta FC', 'CD Castellón',  
        'Antequera CF', 'Atlético Baleares', 'Linares Deportivo', 'UD Ibiza', 'CF Intercity',  
        'Real Murcia CF', 'Atlético Sanluqueño', 'Melilla', 'Algeciras CF', 'San Fernando CD',  
        'Recreativo Granada', 'UD Melilla', 'CP Cacereño', 'Yeclano Deportivo', 'Granada B'  
    ]  
};  
  
const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MD', 'MI', 'EXT', 'DC'];  
  
const ATTRIBUTES = [  
    'EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'  
];  
  
const POSITION_ATTRIBUTE_WEIGHTS = {  
    'POR': { EN: 0.1, VE: 0.1, RE: 0.1, AG: 0.1, CA: 0.2, EF: 0.1, MO: 0.1, AT: 0.05, DF: 0.15 },  
    'DFC': { EN: 0.2, VE: 0.1, RE: 0.15, AG: 0.1, CA: 0.15, EF: 0.1, MO: 0.1, AT: 0.05, DF: 0.15 },  
    'LI': { EN: 0.15, VE: 0.15, RE: 0.2, AG: 0.1, CA: 0.05, EF: 0.05, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'LD': { EN: 0.15, VE: 0.15, RE: 0.2, AG: 0.1, CA: 0.05, EF: 0.05, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'MC': { EN: 0.1, VE: 0.1, RE: 0.2, AG: 0.1, CA: 0.1, EF: 0.1, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'MCO': { EN: 0.05, VE: 0.15, RE: 0.15, AG: 0.15, CA: 0.1, EF: 0.15, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'MD': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.1, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'MI': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.1, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'EXT': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.15, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'DC': { EN: 0.05, VE: 0.15, RE: 0.1, AG: 0.1, CA: 0.15, EF: 0.2, MO: 0.1, AT: 0.15, DF: 0.0 },  
};  
  
// Layouts visuales para la alineación en el campo (x, y son coordenadas relativas en una cuadrícula virtual 5x9)  
// El campo tiene 5 columnas (0 a 4) y 9 filas (0 a 8)  
// Las coordenadas se han ajustado para centrar mejor las líneas de jugadores.  
const FORMATIONS = {  
    '433': {  
        name: '4-3-3',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 }, // Portero  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 }, // Defensas  
            { pos: 'MC', x: 1, y: 4 }, { pos: 'MCO', x: 2, y: 4 }, { pos: 'MC', x: 3, y: 4 }, // Medios  
            { pos: 'EXT', x: 0, y: 6 }, { pos: 'DC', x: 2, y: 6 }, { pos: 'EXT', x: 4, y: 6 } // Delanteros  
        ]  
    },  
    '442': {  
        name: '4-4-2',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 1, y: 6 }, { pos: 'DC', x: 3, y: 6 }  
        ]  
    },  
    '352': {  
        name: '3-5-2',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 2, y: 2 }, { pos: 'DFC', x: 3, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MCO', x: 2, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 1, y: 6 }, { pos: 'DC', x: 3, y: 6 }  
        ]  
    },  
    '541': {  
        name: '5-4-1',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 2, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 2, y: 6 }  
        ]  
    },  
    '451': {  
        name: '4-5-1',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MCO', x: 2, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 2, y: 6 }  
        ]  
    }  
};  
  
const DIVISION_MULTIPLIERS = {  
    primera: 1.5,  
    segunda: 1.0,  
    rfef_grupo1: 0.7, // Se usa para la generación de staff si el equipo está en esta división  
    rfef_grupo2: 0.7  // Se usa para la generación de staff si el equipo está en esta división  
};  
  
const STAFF_ROLES = {  
    medico: { displayName: 'Médico', minSalary: 800, maxSalary: 2500, baseClausula: 5000, levelCostMultiplier: 1.5 },  
    entrenador: { displayName: 'Entrenador Físico', minSalary: 700, maxSalary: 2000, baseClausula: 4000, levelCostMultiplier: 1.5 },  
    entrenadorPorteros: { displayName: 'Entrenador de Porteros', minSalary: 600, maxSalary: 1800, baseClausula: 3500, levelCostMultiplier: 1.5 },  
    fisio: { displayName: 'Fisioterapeuta', minSalary: 750, maxSalary: 2200, baseClausula: 4500, levelCostMultiplier: 1.5 },  
    analista: { displayName: 'Analista de Vídeo', minSalary: 600, maxSalary: 1500, baseClausula: 3000, levelCostMultiplier: 1.5 },  
    scout: { displayName: 'Ojeador', minSalary: 700, maxSalary: 2000, baseClausula: 4000, levelCostMultiplier: 1.5 },  
    secretario: { displayName: 'Secretario Técnico', minSalary: 1000, maxSalary: 3000, baseClausula: 6000, levelCostMultiplier: 1.5 },  
    segundoEntrenador: { displayName: 'Segundo Entrenador', minSalary: 1000, maxSalary: 3000, baseClausula: 7000, levelCostMultiplier: 1.5 }  
};  
  
const STAFF_LEVEL_EFFECTS = {  
    1: { training: 0.5, injuryProb: 1.5, recoveryTime: 1.5, scoutQuality: 0.5, negotiation: 0.5 },  
    2: { training: 0.75, injuryProb: 1.25, recoveryTime: 1.25, scoutQuality: 0.75, negotiation: 0.75 },  
    3: { training: 1.0, injuryProb: 1.0, recoveryTime: 1.0, scoutQuality: 1.0, negotiation: 1.0 },  
    4: { training: 1.25, injuryProb: 0.75, recoveryTime: 0.75, scoutQuality: 1.25, negotiation: 1.25 },  
    5: { training: 1.5, injuryProb: 0.5, recoveryTime: 0.5, scoutQuality: 1.5, negotiation: 1.5 }  
};  
  
const BASE_INJURY_PROB_PER_MATCH = 0.005;  
const BASE_RECOVERY_TIME_WEEKS = { min: 3, max: 10 };  
  
// ELIMINADA: const SEASON_WEEKS = 38; // El número de semanas de la temporada ahora se calculará dinámicamente.  
const PRESEASON_WEEKS = 4; // Número de semanas de pretemporada, esto se mantiene fijo.  
  
const PROMOTION_RELEGATION = {  
    primera: {  
        relegate: 3  
    },  
    segunda: {  
        promote: 3, // 2 directos, 1 playoff (simulado como 3 directos para simplificar)  
        relegate: 4  
    },  
    rfef_grupo1: { // Por ejemplo, los 2 primeros de cada grupo ascienden a Segunda  
        promote: 2,  
        relegate: 4 // Los últimos 4 de cada grupo descienden a Tercera RFEF (no implementado en el juego)  
    },  
    rfef_grupo2: {  
        promote: 2,  
        relegate: 4  
    }  
};  
  
export {      
    TEAMS_DATA,  
    POSITIONS,  
    ATTRIBUTES,  
    POSITION_ATTRIBUTE_WEIGHTS,  
    FORMATIONS,  
    DIVISION_MULTIPLIERS,  
    STAFF_ROLES,  
    STAFF_LEVEL_EFFECTS,  
    BASE_INJURY_PROB_PER_MATCH,  
    BASE_RECOVERY_TIME_WEEKS,  
    // ELIMINADA: SEASON_WEEKS, // Ya no se exporta una constante fija  
    PRESEASON_WEEKS,  
    PROMOTION_RELEGATION  
};  

// cards-system.injector.js
(function () {
    'use strict';

    // ============================
    // 1️⃣ Helpers globales
    // ============================
    if (!window.renderPlayerStatusBadges) {
        window.renderPlayerStatusBadges = function (p) {
            let b = '';
            if (p.isInjured) b += `<span class="injured-badge">❌ Lesión (${p.weeksOut}sem)</span>`;
            if (p.isSuspended) b += `<span class="suspended-badge">⛔ SANCIÓN (${p.suspensionWeeks})</span>`;
            if (p.redCards > 0) b += `<span class="red-card-badge">🟥 x${p.redCards}</span>`;
            if (p.yellowCards > 0) {
                const warn = p.yellowCards >= 4;
                b += `<span class="${warn ? 'warning-badge' : 'yellow-card-badge'}">
                        🟨 x${p.yellowCards}${warn ? ' ⚠️' : ''}
                      </span>`;
            }
            return b ? `<span class="player-status-indicator">${b}</span>` : '';
        };
    }

    if (!window.applyPlayerStatusClasses) {
        window.applyPlayerStatusClasses = function (el, p) {
            if (p.isInjured) el.classList.add('injured');
            if (p.isSuspended) el.classList.add('suspended');
        };
    }

    // ============================
    // 2️⃣ Parchear window.drag
    // ============================
    function patchDrag() {
        if (!window.drag || window.drag.__patched) return;

        const original = window.drag;
        window.drag = function (ev, playerJson) {
            const p = JSON.parse(decodeURIComponent(playerJson));

            if (p.isInjured) {
                ev.preventDefault();
                alert(`${p.name} está lesionado y no puede jugar.`);
                return;
            }

            if (p.isSuspended) {
                ev.preventDefault();
                alert(`${p.name} está sancionado y no puede jugar.`);
                return;
            }

            return original(ev, playerJson);
        };

        window.drag.__patched = true;
    }

    // ============================
    // 3️⃣ Actualizar badges en DOM
    // ============================
    function refreshBadges() {
        // Se asume que cada jugador tiene dataset.player con su JSON
        document.querySelectorAll('[data-player]').forEach(el => {
            try {
                const p = JSON.parse(el.dataset.player);

                window.applyPlayerStatusClasses(el, p);

                // Evitar duplicar badges
                if (!el.querySelector('.player-status-indicator')) {
                    el.innerHTML += window.renderPlayerStatusBadges(p);
                }

                // Bloquear arrastre si sancionado o lesionado
                el.draggable = !p.isInjured && !p.isSuspended;
                el.ondragstart = (ev) => {
                    if (p.isInjured || p.isSuspended) ev.preventDefault();
                    else window.drag(ev, encodeURIComponent(JSON.stringify(p)));
                };
            } catch (_) {}
        });
    }

    // ============================
    // 4️⃣ Auto‑detectar cambios y re-render
    // ============================
    function boot() {
        patchDrag();
        refreshBadges();
    }

    const observer = new MutationObserver(boot);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('DOMContentLoaded', boot);

})();

// admin.js
window.adminBackend = {
    updateTeamBudget(teamName, newBudget) {
        const state = gameLogic.getGameState();
        const team = state.teams.find(t => t.name === teamName);
        if (!team) return { success: false, message: 'Equipo no encontrado' };
        team.budget = newBudget;
        gameLogic.updateGameState(state);
        return { success: true, message: `Presupuesto de ${teamName} actualizado a ${newBudget.toLocaleString()}€` };
    },

    updateStadiumCapacity(teamName, newCapacity) {
        const state = gameLogic.getGameState();
        const team = state.teams.find(t => t.name === teamName);
        if (!team) return { success: false, message: 'Equipo no encontrado' };
        team.stadiumCapacity = newCapacity;
        gameLogic.updateGameState(state);
        return { success: true, message: `Aforo de ${teamName} actualizado a ${newCapacity}` };
    },

    uploadTeamLogo(teamName, fileInputId) {
        const file = document.getElementById(fileInputId).files[0];
        if (!file) return { success: false, message: 'No se seleccionó archivo' };
        const reader = new FileReader();
        reader.onload = function(e) {
            const state = gameLogic.getGameState();
            const team = state.teams.find(t => t.name === teamName);
            if (team) {
                team.logo = e.target.result; // base64
                gameLogic.updateGameState(state);
            }
        };
        reader.readAsDataURL(file);
        return { success: true, message: 'Logo cargado correctamente' };
    },

    uploadStadiumImage(teamName, fileInputId) {
        const file = document.getElementById(fileInputId).files[0];
        if (!file) return { success: false, message: 'No se seleccionó archivo' };
        const reader = new FileReader();
        reader.onload = function(e) {
            const state = gameLogic.getGameState();
            const team = state.teams.find(t => t.name === teamName);
            if (team) {
                team.stadiumImage = e.target.result; // base64
                gameLogic.updateGameState(state);
            }
        };
        reader.readAsDataURL(file);
        return { success: true, message: 'Imagen del estadio cargada correctamente' };
    }
};
