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

/*function renderStandingsTable(state) {
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
}*/

function renderStandingsTable(state) {
    const standingsDiv = document.getElementById('standingsTable');
    if (!standingsDiv) return;

  const DIVISION_NAMES = {
        primera:      'Primera División',
        segunda:      'Segunda División',
        rfef_grupo1:  'Primera RFEF Grupo 1',
        rfef_grupo2:  'Primera RFEF Grupo 2',
        promesas:     'Liga Promesas',
    
    };
    const divTitle = DIVISION_NAMES[state.division] || state.division || 'Liga';
    const h1 = document.querySelector('#standings h1');
    if (h1) h1.textContent = '📈 Clasificación — ' + divTitle;

    if (!state.standings || Object.keys(state.standings).length === 0) {
        standingsDiv.innerHTML = '<p class="text-center text-gray-500">No hay clasificación disponible</p>';
        return;
    }

    const validStandings = Object.entries(state.standings)
        .filter(([team, stats]) => stats && stats.pts !== undefined);

    if (validStandings.length === 0) {
        standingsDiv.innerHTML = '<p class="text-center text-gray-500">Clasificación no disponible</p>';
        return;
    }

    const sorted = validStandings.sort((a, b) => {
        const ptsDiff = (b[1].pts || 0) - (a[1].pts || 0);
        if (ptsDiff !== 0) return ptsDiff;

        const gdB = (b[1].gf || 0) - (b[1].gc || 0);
        const gdA = (a[1].gf || 0) - (a[1].gc || 0);
        if (gdB !== gdA) return gdB - gdA;

        return (b[1].gf || 0) - (a[1].gf || 0);
    });

    // Solo generar las filas <tr>
    let rowsHtml = '';
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

        rowsHtml += `
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

    standingsDiv.innerHTML = rowsHtml;
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
        <div class="pcf-player-scroll" tabindex="0" aria-label="Tabla de jugadores desplazable" style="overflow: auto; max-height: 65vh;">
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
                        <th>FORMA / FÍSICO</th>
                        <th>ESTADO</th>
                        <th>CONTRATO</th>
                        <th>DURACIÓN</th>
                        <th>CLÁUSULA</th>
                        <th>SALARIO</th>
                   <!-- <th>VALOR</th> -->
                        <th>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>  
    `;  
  
    // ✅ FIX: Guardar índice REAL en squad original antes de ordenar
    // openTrainingModal necesita el índice en gameState.squad, no en el array ordenado
    squad.forEach((p, realIdx) => { if (p) p._realSquadIndex = realIdx; });
    const sorted = [...squad].sort((a, b) => b.overall - a.overall);  
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
                <td><strong>${p.overall}</strong>${(p.ovrSeasonStart !== undefined && p.overall > p.ovrSeasonStart) ? `<small style="color:#1b5e20;font-weight:800;margin-left:4px" title="Ha mejorado ${p.overall - p.ovrSeasonStart} esta temporada">▲${p.overall - p.ovrSeasonStart}</small>` : ''}</td>  
                <td>${p.potential}</td>  
                <td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td>  
                <td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.form || 0}<br><small title="Condición física; se recupera con descanso">Físico ${Math.round(p.condition ?? 100)}%</small></td>  
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
            statusHTML += `<br><span style="color: #2196F3; font-size: 0.85em;">${stIcon('transferible','pcf-st-sm')}En venta (${p.askingPrice.toLocaleString('es-ES')}€)</span>`;
        } else if (p.loanListed) {
            statusHTML += `<br><span style="color: #9C27B0; font-size: 0.85em;">${stIcon('cedible','pcf-st-sm')}Cedible</span>`;
        }
        
        return statusHTML;
    })()}
</td>
                <td>${contractYears} ${contractYears === 1 ? 'año' : 'años'}</td>
                <td>${releaseClause.toLocaleString('es-ES')}€</td>
                <td>${p.salary.toLocaleString('es-ES')}€</td>  
           <!-- <td>${p.value.toLocaleString('es-ES')}€</td> -->
                

<td style="display: flex; gap: 3px; flex-wrap: nowrap; justify-content: center;">
    ${p.contractType !== 'loaned_out' ? `
        <button class="btn btn-sm" onclick="window.openTrainingModal(${p._realSquadIndex})" 
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
    const state = (typeof window !== 'undefined' && window.gameLogic?.getViewState?.()) || {};
  
    if (!academy || academy.length === 0) {  
        list.innerHTML = '<div class="alert alert-info">❌ No hay jóvenes en cantera. ¡Contrata talentos para desarrollarlos!</div>';  
        return;  
    }  
  
    const coach = state.staff && state.staff.entrenadorJuveniles;
    const training = (academy || []).filter(p => p && p.inTraining).length;
    let headerHtml = `  
        <div class="alert ${coach ? 'alert-success' : 'alert-warning'}" style="margin-bottom:8px">${coach
            ? `🏋️ Tu entrenador de juveniles (nivel ${coach.level}) entrena a <strong>${training} de ${academy.length}</strong> canteranos: tiene ${coach.level * 2} plazas (2 por nivel) y elige a los que tienen más margen hasta su potencial.`
            : '⚠️ Sin entrenador de juveniles los canteranos no progresan. Contrátalo en Entrenamiento o en Empleados.'}</div>
        <div class="pcf-player-scroll" tabindex="0" aria-label="Tabla de jugadores desplazable" style="overflow: auto; max-height: 65vh;">  
            <table style="font-size: 0.8em; min-width: 1200px;">  
                <thead>  
                    <tr>  
                        <th>Nº</th>  
                        <th>JUGADOR</th>  
                        <th>MEDIA</th>  
                        <th>POT</th>  
                        <th title="Media con la que llegó a la cantera → media actual">PROGRESO</th>  
                        <th title="Si el entrenador de juveniles le está entrenando esta temporada">ENTRENO</th>  
                        <th>EDAD</th>  
                        <th>POS</th>  
                        <th>PIE</th>  
                        ${ATTRIBUTES.map(attr => `<th>${attr}</th>`).join('')}  
                        <th>FORMA / FÍSICO</th>  
                        <th>ESTADO</th>  
                        <th>PART.</th>  
                        <th>SALARIO</th>  
                   <!-- <th>VALOR</th> -->
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
                <td style="white-space:nowrap">${(() => { const st = p.ovrStart ?? p.overall; const d = p.overall - st;
                    return `${st} → ${p.overall} <span style="color:${d > 0 ? '#1b5e20' : '#666'};font-weight:800">${d > 0 ? '▲ +' + d : '='}</span>`; })()}</td>  
                <td style="white-space:nowrap">${state.staff && state.staff.entrenadorJuveniles
                    ? (p.inTraining ? '<span style="color:#1b5e20;font-weight:800">🏋️ Entrenando</span>' : '<span style="color:#8a6d00">Sin plaza</span>')
                    : '<span style="color:#888">Sin entrenador</span>'}</td>  
                <td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td>  
                <td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${p.form || 0}<br><small title="Condición física; se recupera con descanso">Físico ${Math.round(p.condition ?? 100)}%</small></td>  
                <td>${statusText}</td>  
                <td>${p.matches || 0}</td>  
                <td>${p.salary.toLocaleString('es-ES')}€</td>  
           <!-- <td>${p.value.toLocaleString('es-ES')}€</td> -->  
                <td>  
                    <button class="btn btn-sm" ${p.isInjured ? 'disabled' : ''} onclick="window.promoteConfirm('${p.name}')">Ascender</button><button class="btn btn-sm youth-dismiss" data-player="${encodeURIComponent(p.name)}">Despedir</button>  
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
        <div class="pcf-player-scroll" tabindex="0" aria-label="Tabla de jugadores desplazable" style="overflow: auto; max-height: 65vh;">  
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
        const free = !!p.isFreeAgent;
        const estadoHtml = free ? stIcon('libre','pcf-st-sm') + 'Libre'
            : (p.transferListed && p.loanListed) ? stIcon('transferible','pcf-st-sm') + stIcon('cedible','pcf-st-sm') + 'Transferible · Cedible'
            : p.loanListed ? stIcon('cedible','pcf-st-sm') + 'Cedible'
            : p.transferListed ? stIcon('transferible','pcf-st-sm') + 'Transferible' : 'No disponible';
        const estado = free ? 'Libre' : (p.transferListed && p.loanListed) ? 'Transferible · Cedible' : p.loanListed ? 'Cedible' : (p.transferListed ? 'Transferible' : 'No disponible');  
        const askingPrice = free ? 'GRATIS' : p.transferListed ? (p.askingPrice || 0).toLocaleString('es-ES') + '€' : '-';  
        const clauseAmount = free ? null : (p.releaseClause || ((p.value || 0) * 3));
        
        return `  
            <tr>  
                <td>${p.name}</td>  
                <td><strong>${p.overall}</strong></td>  
                <td>${p.potential}</td>  
                <td>${p.age}</td>  
                <td>${p.position || 'N/A'}</td>  
                <td>${p.foot || 'N/A'}</td>  
                ${ATTRIBUTES.map(attr => `<td>${p[attr] || 0}</td>`).join('')}  
                <td>${free ? 'Sin club' : p.club}</td>  
                <td>${(p.salary || 0).toLocaleString('es-ES')}€</td>  
                <td>${(p.value || 0).toLocaleString('es-ES')}€</td>  
                <td style="color: #b45f06; font-weight: bold;">
                    ${clauseAmount == null ? '—' : clauseAmount.toLocaleString('es-ES') + '€'}
                </td>
                <td>${askingPrice}</td>  
                <td class="pcf-estado" title="${estado}">${estadoHtml}</td>  
                <td>  
                    ${free ? `
                        <button class="btn btn-sm" onclick="window.signFreeAgent('${p.id}')">✅ Fichar</button>
                    ` : p.transferListed || p.loanListed ? `
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
        <div class="pcf-player-scroll" tabindex="0" aria-label="Tabla de jugadores desplazable" style="overflow: auto; max-height: 65vh;">  
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
    const state = gameLogic.getViewState();  
  
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
const stIcon = (n, c = '') => `<img class="pcf-st-icon ${c}" src="assets/iconos/estados/${n}.webp" alt="" aria-hidden="true">`;

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
  
        const myMatch = jornadaMatches.find(m => m.home === state.team || m.away === state.team);
        calendarHtml += `  
          <div class="pcf-cal-card ${myMatch ? 'has-mine' : ''} ${state.week === i ? 'current' : ''}">
            <h2 class="pcf-cal-week ${state.week === i ? 'current' : ''}" id="pcf-cal-j${i}">Jornada ${i}${state.week === i ? ' · próxima' : ''}${myMatch ? ` <span class="pcf-cal-mine">${stIcon('mi-equipo','pcf-st-sm')}${myMatch.home === state.team ? 'vs ' + myMatch.away + ' (casa)' : 'en ' + myMatch.home}</span>` : ''}</h2>  
            <table class="pcf-cal-table">  
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
            const rowStyle = '';  
  
            // Buscar el resultado en el matchHistory  
            const playedMatch = state.matchHistory.find(  
                mh => mh.week === i &&  
                      ((mh.home === match.home && mh.away === match.away) ||  
                       (mh.home === match.away && mh.away === match.home))  
            );  
  
            const score = playedMatch ? playedMatch.score : '-';  
  
            calendarHtml += `  
                <tr class="${isOurMatch ? 'pcf-my-match' : 'pcf-other-match'}">  
                    <td>${isOurMatch && match.home === state.team ? stIcon('mi-equipo','pcf-st-sm') : ''}${match.home}</td>  
                    <td>${isOurMatch && match.away === state.team ? stIcon('mi-equipo','pcf-st-sm') : ''}${match.away}</td>  
                    <td>${score}</td>  
                </tr>  
            `;  
        });  
        calendarHtml += `  
                </tbody>  
            </table>  
          </div>
        `;  
    }  
  
    const onlyMine = !!state.calendarOnlyMine;
    calendarContent.innerHTML = `<div class="pcf-cal-toolbar">
        <label><input type="checkbox" ${onlyMine ? 'checked' : ''} onchange="window.gameLogic.updateGameState({calendarOnlyMine:this.checked}); window.ui.renderCalendarPage(window.gameLogic.getViewState())"> Solo mis partidos</label>
        <button class="btn btn-sm" onclick="document.getElementById('pcf-cal-j${state.week}')?.scrollIntoView({behavior:'smooth',block:'start'})">⏩ Ir a la próxima jornada</button>
    </div><div class="pcf-cal-grid ${onlyMine ? 'pcf-cal-only-mine' : ''}">` + calendarHtml + `</div>`;
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
        <div class="pcf-player-scroll" tabindex="0" aria-label="Tabla de jugadores desplazable" style="overflow: auto; max-height: 65vh;">
            <table style="font-size: 0.9em; min-width: 1000px;">
                <thead>
                    <tr>
                        <th>JUGADOR</th>
                        <th>MEDIA</th>
                        <th>EDAD</th>
                        <th>POS</th>
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
                <td>${p.overall}</td>
                <td>${p.age}</td>
                <td>${p.position}</td>
                <td style="color: ${urgencyColor}; font-weight: bold;">
                    ${p.contractYears} ${p.contractYears === 1 ? 'año' : 'años'}
                    ${p.contractYears <= 1 ? '⚠️' : ''}
                </td>
                <td>${p.salary.toLocaleString('es-ES')}€</td>
                <td>${(p.releaseClause || 0).toLocaleString('es-ES')}€</td>
                <td>
                    ${(p.refusesToRenew && p.refusalSeason === state.currentSeason)
                        ? `<button class="btn btn-sm" disabled style="opacity:.7;cursor:help;background:#7a2430" title="${String(p.refusalReason || 'No quiere renovar').replace(/"/g, '&quot;')}">🚫 No quiere renovar</button>`
                        : (state.pendingRenewals || []).some(r => r.playerName === p.name)
                        ? `<button class="btn btn-sm" disabled style="opacity:.6;cursor:default" title="Responderá en las próximas jornadas">📨 Oferta enviada</button>`
                        : `<button class="btn btn-sm" onclick="window.openRenewalModal(${state.squad.indexOf(p)})">📝 Renovar</button>`}
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
