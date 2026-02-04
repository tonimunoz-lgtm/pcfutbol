// ui.js - Renderizado y UI

import * as gameLogic from './gameLogic.js';
import { ATTRIBUTES, POSITIONS, STAFF_ROLES, FORMATIONS, PRESEASON_WEEKS } from './config.js';

// ============================================
// 🆕 FUNCIONES PARA SISTEMA DE TARJETAS Y ESTADO (YA EXISTENTES Y MEJORADAS)
// ============================================

/**
 * Genera los badges HTML para mostrar el estado de un jugador
 * @param {Object} player - Objeto jugador con sus propiedades
 * @returns {string} HTML con los badges de estado
 */
function renderPlayerStatusBadges(player) {
    let badges = '';

    // ❌ LESIONADO (prioridad máxima)
    if (player.isInjured) {
        badges += `<span class="injured-badge" title="Lesionado ${player.weeksOut} semanas">❌ Lesión (${player.weeksOut} sem)</span>`;
    }

    // ⛔ SANCIONADO (prioridad alta)
    if (player.isSuspended) {
        badges += `<span class="suspended-badge" title="Sancionado ${player.suspensionWeeks} partidos">⛔ SANCIÓN (${player.suspensionWeeks} p.)</span>`;
    }

    // 🟥 TARJETA ROJA
    if (player.redCards > 0) {
        badges += `<span class="red-card-badge" title="Tarjetas rojas esta temporada">🟥 x${player.redCards}</span>`;
    }

    // 🟨 TARJETAS AMARILLAS
    if (player.yellowCards > 0) {
        const isWarning = player.yellowCards >= 4;
        const badgeClass = isWarning ? 'warning-badge' : 'yellow-card-badge';
        const warningText = isWarning ? ' ⚠️' : '';
        badges += `<span class="${badgeClass}" title="Tarjetas amarillas (${player.yellowCards}/5)">🟨 x${player.yellowCards}${warningText}</span>`;
    }

    return badges ? `<span class="player-status-indicator">${badges}</span>` : '';
}

/**
 * Añade clases CSS al contenedor del jugador según su estado
 * @param {HTMLElement} element - Elemento DOM del jugador
 * @param {Object} player - Objeto jugador
 */
function applyPlayerStatusClasses(element, player) {
    element.classList.remove('injured', 'suspended'); // Limpiar clases anteriores
    if (player.isInjured) {
        element.classList.add('injured');
    }
    if (player.isSuspended) {
        element.classList.add('suspended');
    }
}

// ============================================
// FUNCIONES EXISTENTES (MODIFICADAS)
// ============================================

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

// Función para actualizar la UI completa
export function updateUI() {
    const gameState = gameLogic.getGameState();
    renderHeader(gameState);
    renderSquad(gameState);
    renderLineup(gameState);
    renderFinances(gameState);
    renderNews(gameState);
    renderStaff(gameState);
    renderPlayerMarket(gameState);
    renderYoungsterMarket(gameState);
    renderStandingsTable(gameState);
    renderCalendar(gameState);
    renderStadium(gameState);
    renderNegotiationModal(gameState);
}

// ============================================
// MODIFICACIÓN: renderSquad (displayPlayerList)
// ============================================

function renderSquad(gameState) {
    const playerListDiv = document.getElementById('playerList');
    if (!playerListDiv) return;

    let html = '';
    gameState.squad.forEach(player => {
        const overall = gameLogic.getPlayerOverall(player);
        const positionAbbr = player.position.substring(0, 3).toUpperCase();
        const playerCardClass = `player-card ${player.isInjured ? 'injured' : ''} ${player.isSuspended ? 'suspended' : ''}`; // Clases CSS para lesionado/sancionado

        // Determinar el estado textual
        let statusText = 'Apto';
        if (player.isInjured) {
            statusText = `Lesionado (${player.weeksOut} sem)`;
        } else if (player.isSuspended) {
            statusText = `Sancionado (${player.suspensionWeeks} p.)`;
        }

        html += `
            <div class="${playerCardClass}" draggable="true" ondragstart="drag(event)" data-player-id="${player.id}">
                <span class="player-overall">${overall}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-position">${positionAbbr}</span>
                <span class="player-age">${player.age} años</span>
                <span class="player-value">${player.value.toLocaleString()}€</span>
                <div class="player-status-badges">${renderPlayerStatusBadges(player)}</div>
                <div class="player-details-toggle" onclick="togglePlayerDetails(event, '${player.id}')">
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="player-details" id="details-${player.id}" style="display: none;">
                    <p>Salario: ${player.salary.toLocaleString()}€/sem</p>
                    <p>Estado: ${statusText}</p>
                    <p>Tarjetas amarillas: ${player.yellowCards}</p>
                    <p>Tarjetas rojas: ${player.redCards}</p>
                    <p>Puntos de forma: ${player.form}</p>
                    <p>Potencial: ${player.potential}</p>
                    <p>Pierna hábil: ${player.foot}</p>
                    <p>Partidos jugados: ${player.matches}</p>
                    <div class="attributes-grid">
                        ${ATTRIBUTES.map(attr => `<span>${attr}: ${player[attr]}</span>`).join('')}
                    </div>
                    <button class="button-small" onclick="initiateTransfer('${player.id}')">Transferir</button>
                    <!-- Otros botones de acción -->
                </div>
            </div>
        `;
    });
    playerListDiv.innerHTML = html;
}

// ============================================
// MODIFICACIÓN: renderLineup
// ============================================

function renderLineup(gameState) {
    const lineupDiv = document.getElementById('lineupPitch');
    if (!lineupDiv) return;

    lineupDiv.innerHTML = ''; // Limpiar alineación actual

    const formationConfig = FORMATIONS[gameState.formation];
    if (!formationConfig) {
        console.error('Formación no encontrada:', gameState.formation);
        return;
    }

    Object.keys(formationConfig).forEach(positionKey => {
        const playerSlot = document.createElement('div');
        playerSlot.className = `pitch-player-slot ${positionKey}`;
        playerSlot.dataset.positionKey = positionKey;
        playerSlot.ondragover = allowDrop;
        playerSlot.ondrop = drop;

        const currentPlayer = gameState.lineup.find(p => p && p.positionKey === positionKey); // Asumir que `positionKey` se guarda en el jugador de la alineación
        
        if (currentPlayer) {
            const playerElement = document.createElement('div');
            // Añadir data-player-id para poder identificarlo en drag and drop
            playerElement.dataset.playerId = currentPlayer.id;
            playerElement.className = 'pitch-player';
            applyPlayerStatusClasses(playerElement, currentPlayer); // Aplica clases CSS

            playerElement.innerHTML = `
                <span class="player-overall">${gameLogic.getPlayerOverall(currentPlayer)}</span>
                <span class="player-name">${currentPlayer.name}</span>
                <span class="player-position-abbr">${currentPlayer.position.substring(0, 3).toUpperCase()}</span>
                ${renderPlayerStatusBadges(currentPlayer)} <!-- Mostrar tarjetas y estado aquí -->
            `;
            playerSlot.appendChild(playerElement);
        } else {
            // Espacio vacío
            playerSlot.innerHTML = `<span class="empty-slot-label">${formationConfig[positionKey].name}</span>`;
        }
        lineupDiv.appendChild(playerSlot);
    });
}

// ============================================
// MODIFICACIÓN: Lógica de Drag and Drop
// ============================================

// Exportar funciones del juego para que sean accesibles globalmente si se usan en HTML en línea
window.drag = function(ev) {
    const playerId = ev.target.dataset.playerId;
    if (!playerId) {
        console.error("No se encontró player-id en el elemento arrastrado:", ev.target);
        return;
    }
    ev.dataTransfer.setData("text/plain", playerId);

    const gameState = gameLogic.getGameState();
    const player = gameState.squad.find(p => p.id === playerId);

    // Impedir arrastrar jugadores lesionados o sancionados a la alineación
    if (player && (player.isInjured || player.isSuspended)) {
        alert(`¡${player.name} está ${player.isInjured ? 'lesionado' : 'sancionado'} y no puede ser alineado!`);
        ev.preventDefault(); // Cancela la operación de arrastre
        return;
    }
}

window.allowDrop = function(ev) {
    ev.preventDefault(); // Permite soltar
}

window.drop = function(ev) {
    ev.preventDefault();
    const playerId = ev.dataTransfer.getData("text/plain");
    const targetSlot = ev.currentTarget; // El slot donde se soltó
    const positionKey = targetSlot.dataset.positionKey; // La posición de la alineación

    const gameState = gameLogic.getGameState();
    const player = gameState.squad.find(p => p.id === playerId);

    if (!player) {
        console.error("Jugador no encontrado:", playerId);
        return;
    }

    // Doble comprobación al soltar (aunque ya se previene en drag)
    if (player.isInjured || player.isSuspended) {
        alert(`¡${player.name} está ${player.isInjured ? 'lesionado' : 'sancionado'} y no puede ser alineado en esta posición!`);
        return;
    }

    // Eliminar al jugador de su posición anterior en la alineación si ya estaba
    gameState.lineup.forEach((p, index) => {
        if (p && p.id === playerId) {
            gameState.lineup[index] = null;
        }
    });

    // Encontrar un slot vacío o reemplazar al jugador actual
    let targetIndex = gameState.lineup.findIndex(p => p && p.positionKey === positionKey);
    if (targetIndex === -1) {
        // No hay un jugador en esa posición, encontrar el primer slot vacío para esta posición
        targetIndex = gameState.lineup.findIndex(p => p === null);
        if (targetIndex === -1) { // Si no hay slots vacíos, no hacer nada o manejar el error
            targetIndex = 10; // Fallback, si no hay un slot vacío, lo pone al final
        }
    }
    
    // Asignar el jugador al slot en la alineación
    player.positionKey = positionKey; // Guardar la clave de la posición para futura referencia
    gameState.lineup[targetIndex] = player;

    // Actualizar el estado del juego y la UI
    gameLogic.updateGameState(gameState); // Esto guardaría el nuevo estado en gameLogic
    updateUI(); // Volver a renderizar la UI
}

// También es necesario manejar el drag del jugador de la alineación al banquillo (fuera de la alineación)
// Esto requiere un "slot" de banquillo o un área donde se puedan soltar los jugadores.
// Por ahora, asumimos que al arrastrar fuera de un pitch-player-slot y no soltar en otro, el jugador vuelve a la plantilla.
// Esto es más complejo y podría requerir un "banquillo" visual.
window.dragEnd = function(ev) {
    // Si el jugador se arrastra fuera de un slot de alineación y no se suelta en otro, debería volver a la plantilla.
    // Esta lógica se maneja mejor en la función drop de los slots o con un área de 'banquillo'
}


// ... El resto de tus funciones de UI ...
function renderHeader(gameState) {
    const headerDiv = document.getElementById('header');
    if (!headerDiv) return;

    headerDiv.innerHTML = `
        <h1 class="text-2xl font-bold text-white">${gameState.team}</h1>
        <p class="text-white">Semana: ${gameState.week} | ${gameState.currentSeason}</p>
        <p class="text-white">División: ${gameState.division}</p>
        <p class="text-white">Balance: ${gameState.balance.toLocaleString()}€</p>
    `;
}


function renderFinances(gameState) {
    const financesDiv = document.getElementById('financesOverview');
    if (!financesDiv) return;

    financesDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-2">Finanzas Semanales</h3>
        <p>Ingresos: +${gameState.weeklyIncome.toLocaleString()}€</p>
        <p>Gastos: -${gameState.weeklyExpenses.toLocaleString()}€</p>
        <p>Neto: ${(gameState.weeklyIncome - gameState.weeklyExpenses).toLocaleString()}€</p>
    `;
}

function renderNews(gameState) {
    const newsFeedDiv = document.getElementById('newsFeed');
    if (!newsFeedDiv) return;

    let newsHtml = '';
    gameState.newsFeed.forEach(newsItem => {
        let icon = '';
        let colorClass = '';
        switch (newsItem.type) {
            case 'info': icon = 'ℹ️'; colorClass = 'text-blue-500'; break;
            case 'warning': icon = '⚠️'; colorClass = 'text-yellow-500'; break;
            case 'error': icon = '❌'; colorClass = 'text-red-500'; break;
            case 'success': icon = '✅'; colorClass = 'text-green-500'; break;
            case 'system': icon = '⚙️'; colorClass = 'text-gray-500'; break;
        }
        newsHtml += `<div class="news-item ${colorClass}">${icon} ${newsItem.message}</div>`;
    });
    newsFeedDiv.innerHTML = newsHtml;

    const newsBadge = document.getElementById('newsBadge');
    if (newsBadge) {
        newsBadge.textContent = gameState.unreadNewsCount;
        newsBadge.style.display = gameState.unreadNewsCount > 0 ? 'inline-block' : 'none';
    }
}

function renderStaff(gameState) {
    const staffListDiv = document.getElementById('staffList');
    if (!staffListDiv) return;

    let html = '';
    Object.entries(gameState.staff).forEach(([roleKey, staffMember]) => {
        const roleName = STAFF_ROLES[roleKey];
        html += `
            <div class="staff-card">
                <p><strong>${roleName}</strong>: ${staffMember ? staffMember.name : 'Vacante'}</p>
                ${staffMember ? `
                    <p>Nivel: ${staffMember.level}</p>
                    <p>Salario: ${staffMember.salary.toLocaleString()}€/sem</p>
                    <p>Contrato: ${staffMember.contract} semanas</p>
                ` : '<button class="button-small" onclick="hireStaff(\'' + roleKey + '\')">Contratar</button>'}
            </div>
        `;
    });
    staffListDiv.innerHTML = html;
}

function hireStaff(roleKey) {
    alert(`Contratar staff para ${roleKey} (funcionalidad no implementada aún).`);
}

function renderPlayerMarket(gameState) {
    const marketDiv = document.getElementById('playerMarket');
    if (!marketDiv) return;

    const playerMarket = gameLogic.getPlayerMarket();
    let html = '';

    playerMarket.forEach(player => {
        html += `
            <div class="player-card market-player-card">
                <span class="player-overall">${gameLogic.getPlayerOverall(player)}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-position">${player.position.substring(0,3).toUpperCase()}</span>
                <span class="player-age">${player.age} años</span>
                <span class="player-value">${player.value.toLocaleString()}€</span>
                <button class="button-small" onclick="gameLogic.initiateTransfer('${player.id}')">Fichar</button>
            </div>
        `;
    });
    marketDiv.innerHTML = html;
}

function renderYoungsterMarket(gameState) {
    const marketDiv = document.getElementById('youngsterMarket');
    if (!marketDiv) return;

    const youngsterMarket = gameLogic.getYoungsterMarket();
    let html = '';

    youngsterMarket.forEach(player => {
        html += `
            <div class="player-card market-player-card">
                <span class="player-overall">${gameLogic.getPlayerOverall(player)}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-position">${player.position.substring(0,3).toUpperCase()}</span>
                <span class="player-age">${player.age} años</span>
                <span class="player-value">${player.value.toLocaleString()}€</span>
                <button class="button-small" onclick="alert('Fichar joven (${player.name})')">Fichar</button>
            </div>
        `;
    });
    marketDiv.innerHTML = html;
}

function renderStandingsTable(gameState) {
    const standingsDiv = document.getElementById('standingsTable');
    if (!standingsDiv) return;

    if (!gameState.standings || Object.keys(gameState.standings).length === 0) {
        standingsDiv.innerHTML = '<p class="text-center text-gray-500">No hay clasificación disponible</p>';
        return;
    }

    const validStandings = Object.entries(gameState.standings)
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
                    <th>Pos</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>G</th>
                    <th>E</th>
                    <th>P</th>
                    <th>GF</th>
                    <th>GC</th>
                    <th>DG</th>
                    <th>PTS</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(([teamName, stats], index) => {
        const goalDifference = stats.gf - stats.gc;
        html += `
            <tr class="${teamName === gameState.team ? 'current-team' : ''}">
                <td>${index + 1}</td>
                <td>${getTeamLogo(teamName)}${teamName}</td>
                <td>${stats.pj}</td>
                <td>${stats.g}</td>
                <td>${stats.e}</td>
                <td>${stats.p}</td>
                <td>${stats.gf}</td>
                <td>${stats.gc}</td>
                <td>${goalDifference}</td>
                <td>${stats.pts}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;
    standingsDiv.innerHTML = html;
}

function renderCalendar(gameState) {
    const calendarDiv = document.getElementById('seasonCalendar');
    if (!calendarDiv) return;

    let html = `
        <h3 class="text-xl font-semibold mb-2">Calendario de Temporada</h3>
        <p>Semana actual: ${gameState.week}</p>
        <div class="match-list">
    `;

    gameState.seasonCalendar.forEach(match => {
        const isCurrentWeek = match.week === gameState.week;
        const isPastMatch = match.week < gameState.week;
        const isOurMatch = match.home === gameState.team || match.away === gameState.team;
        
        let matchResult = '';
        let matchClass = '';
        if (isPastMatch && isOurMatch) {
            const ourResult = gameState.matchHistory.find(m => m.week === match.week && m.home === match.home && m.away === match.away);
            if (ourResult) {
                if (ourResult.result === 'win') {
                    matchResult = ` <span class="text-green-500">(${ourResult.home === gameState.team ? 'V' : 'D'})</span>`;
                    matchClass = 'match-win';
                } else if (ourResult.result === 'draw') {
                    matchResult = ` <span class="text-yellow-500">(E)</span>`;
                    matchClass = 'match-draw';
                } else {
                    matchResult = ` <span class="text-red-500">(${ourResult.home === gameState.team ? 'D' : 'V'})</span>`;
                    matchClass = 'match-loss';
                }
            }
        }


        html += `
            <div class="match-item ${isCurrentWeek ? 'current-week-match' : ''} ${matchClass}">
                <span class="font-bold">Semana ${match.week}:</span> ${getTeamLogo(match.home)} ${match.home} vs ${getTeamLogo(match.away)} ${match.away}
                ${match.homeGoals !== null ? `(${match.homeGoals} - ${match.awayGoals})` : ''}
                ${matchResult}
            </div>
        `;
    });

    html += '</div>';
    calendarDiv.innerHTML = html;
}

function renderStadium(gameState) {
    const stadiumDiv = document.getElementById('stadiumOverview');
    if (!stadiumDiv) return;

    stadiumDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-2">Estadio: ${gameState.stadiumName}</h3>
        ${gameState.stadiumImage ? `<img src="${gameState.stadiumImage}" alt="${gameState.stadiumName}" class="w-full h-48 object-cover rounded mb-2">` : ''}
        <p>Capacidad: ${gameState.stadiumCapacity.toLocaleString()}</p>
        <p>Precio de entrada: ${gameState.ticketPrice}€</p>
        <p>Aficionados: ${gameState.fanbase.toLocaleString()}</p>
        <p>Popularidad: ${gameState.popularity}%</p>
    `;
}

function renderNegotiationModal(gameState) {
    const negotiationModal = document.getElementById('negotiationModal');
    if (!negotiationModal) return;

    if (gameState.negotiatingPlayer) {
        negotiationModal.style.display = 'block';
        const player = gameState.negotiatingPlayer;
        let contentHtml = `
            <h3 class="text-xl font-semibold mb-4">Negociando por ${player.name}</h3>
            <p>Overall: ${gameLogic.getPlayerOverall(player)} | Edad: ${player.age} | Posición: ${player.position}</p>
            <p>Valor de mercado: ${player.value.toLocaleString()}€ | Salario actual: ${player.salary.toLocaleString()}€/sem</p>
        `;

        if (gameState.negotiationStep === 0) { // Ofertar al club
            contentHtml += `
                <div class="mt-4">
                    <label for="clubOfferValue" class="block text-sm font-medium text-gray-700">Oferta al club (Mínimo ${player.value.toLocaleString()}€):</label>
                    <input type="number" id="clubOfferValue" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${player.value}">
                    <button class="button-primary mt-2" onclick="gameLogic.makeClubOffer(document.getElementById('clubOfferValue').value)">Hacer Oferta</button>
                </div>
            `;
        } else if (gameState.negotiationStep === 1) { // Ofertar al jugador
            contentHtml += `
                <p class="mt-4 text-green-600">¡El club ha aceptado tu oferta de ${gameState.clubOffer.value.toLocaleString()}€!</p>
                <div class="mt-4">
                    <label for="playerOfferSalary" class="block text-sm font-medium text-gray-700">Oferta de Salario Semanal:</label>
                    <input type="number" id="playerOfferSalary" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${player.salary}">
                </div>
                <div class="mt-4">
                    <label for="playerOfferContract" class="block text-sm font-medium text-gray-700">Semanas de Contrato:</label>
                    <input type="number" id="playerOfferContract" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="104"> <!-- 2 años -->
                    <button class="button-primary mt-2" onclick="gameLogic.makePlayerOffer(document.getElementById('playerOfferSalary').value, document.getElementById('playerOfferContract').value)">Ofertar al Jugador</button>
                </div>
            `;
        }
        contentHtml += `<button class="button-secondary mt-4" onclick="gameLogic.cancelNegotiation()">Cancelar Negociación</button>`;
        document.getElementById('negotiationModalContent').innerHTML = contentHtml;

    } else {
        negotiationModal.style.display = 'none';
    }
}

// Función para mostrar/ocultar detalles de jugador en la lista de la plantilla
window.togglePlayerDetails = function(event, playerId) {
    event.stopPropagation(); // Evitar que se propague el evento al card completo
    const detailsDiv = document.getElementById(`details-${playerId}`);
    if (detailsDiv) {
        detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
        const icon = event.currentTarget.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        }
    }
}

// Exportar funciones para acceso global si es necesario (ej. desde index.html)
export { updateUI, renderPlayerStatusBadges, applyPlayerStatusClasses };
