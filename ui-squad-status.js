// ui-squad-status.js - Componente UI para mostrar estado de jugadores en la plantilla

/**
 * MÓDULO UI PARA PLANTILLA CON TARJETAS Y SANCIONES
 * 
 * Este módulo extiende la UI de la plantilla para mostrar:
 * - Estado del jugador (Apto, Lesionado, Sancionado)
 * - Iconos visuales según el estado
 * - Contador de semanas restantes
 * - Tarjetas amarillas acumuladas
 */

import * as CardsSystem from './cards-sanctions-system.js';
import * as InjurySystem from './injuries-system.js';

/**
 * Genera el HTML para la columna de estado del jugador
 * @param {Object} player - Jugador
 * @returns {string} - HTML con el estado
 */
export function renderPlayerStatus(player) {
    // Inicializar sistemas
    InjurySystem.initializePlayerInjury(player);
    CardsSystem.initializePlayerCards(player);
    
    let statusHTML = '<div class="player-status">';
    
    // PRIORIDAD 1: Lesión
    if (player.isInjured && player.weeksOut > 0) {
        statusHTML += `
            <div class="status-badge status-injured">
                <span class="status-icon">🏥</span>
                <span class="status-text">Lesionado</span>
                <div class="status-detail">${player.injuryType || 'Lesión'}</div>
                <div class="status-weeks">${player.weeksOut} sem.</div>
            </div>
        `;
    }
    // PRIORIDAD 2: Sanción
    else if (player.cards.isSuspended && player.cards.suspensionWeeks > 0) {
        const cardIcon = player.cards.red > 0 ? '🟥' : '🟨×5';
        statusHTML += `
            <div class="status-badge status-suspended">
                <span class="status-icon">🚫</span>
                <span class="status-text">Sancionado</span>
                <div class="status-detail">${cardIcon}</div>
                <div class="status-weeks">${player.cards.suspensionWeeks} ${player.cards.suspensionWeeks === 1 ? 'partido' : 'partidos'}</div>
            </div>
        `;
    }
    // PRIORIDAD 3: Apto (con o sin tarjetas)
    else {
        statusHTML += `
            <div class="status-badge status-available">
                <span class="status-icon">✅</span>
                <span class="status-text">Apto</span>
        `;
        
        // Mostrar tarjetas amarillas acumuladas (si tiene)
        if (player.cards.yellow > 0) {
            const yellowCount = player.cards.yellow;
            const isAtRisk = yellowCount === 4; // Una más y sanción
            
            statusHTML += `
                <div class="status-detail yellow-cards ${isAtRisk ? 'at-risk' : ''}">
                    🟨×${yellowCount}
                    ${isAtRisk ? ' ⚠️' : ''}
                </div>
            `;
        }
        
        statusHTML += `</div>`;
    }
    
    statusHTML += '</div>';
    
    return statusHTML;
}

/**
 * Genera el HTML completo para la tabla de plantilla
 * @param {Array} squad - Plantilla del equipo
 * @param {Object} options - Opciones de visualización
 * @returns {string} - HTML de la tabla
 */
export function renderSquadTable(squad, options = {}) {
    const {
        showCards = true,
        showInjuries = true,
        sortBy = 'position' // 'position', 'overall', 'status'
    } = options;
    
    // Ordenar plantilla
    let sortedSquad = [...squad];
    if (sortBy === 'position') {
        sortedSquad.sort((a, b) => a.position.localeCompare(b.position));
    } else if (sortBy === 'overall') {
        sortedSquad.sort((a, b) => b.overall - a.overall);
    } else if (sortBy === 'status') {
        sortedSquad.sort((a, b) => {
            // Lesionados primero, luego sancionados, luego aptos
            const aScore = a.isInjured ? 0 : (a.cards?.isSuspended ? 1 : 2);
            const bScore = b.isInjured ? 0 : (b.cards?.isSuspended ? 1 : 2);
            return aScore - bScore;
        });
    }
    
    let html = `
        <table class="squad-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Pos</th>
                    <th>Overall</th>
                    <th>Edad</th>
                    <th>Forma</th>
                    <th>Estado</th>
                    ${showCards ? '<th>Tarjetas</th>' : ''}
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedSquad.forEach(player => {
        InjurySystem.initializePlayerInjury(player);
        CardsSystem.initializePlayerCards(player);
        
        const isUnavailable = player.isInjured || player.cards.isSuspended;
        const rowClass = isUnavailable ? 'player-unavailable' : '';
        
        html += `
            <tr class="${rowClass}" data-player-id="${player.name}">
                <td class="player-name">
                    ${player.name}
                    ${isUnavailable ? '<span class="unavailable-badge">No disponible</span>' : ''}
                </td>
                <td>${player.position}</td>
                <td class="overall-cell">${player.overall}</td>
                <td>${player.age}</td>
                <td class="form-cell">
                    <div class="form-bar">
                        <div class="form-fill" style="width: ${player.form}%"></div>
                    </div>
                    <span class="form-value">${player.form}</span>
                </td>
                <td class="status-cell">
                    ${renderPlayerStatus(player)}
                </td>
        `;
        
        if (showCards) {
            html += `
                <td class="cards-cell">
                    ${renderPlayerCards(player)}
                </td>
            `;
        }
        
        html += `</tr>`;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

/**
 * Genera el HTML para mostrar las tarjetas de un jugador
 * @param {Object} player - Jugador
 * @returns {string} - HTML con las tarjetas
 */
function renderPlayerCards(player) {
    CardsSystem.initializePlayerCards(player);
    
    let html = '<div class="player-cards-display">';
    
    // Amarillas
    if (player.cards.yellow > 0) {
        const isAtRisk = player.cards.yellow === 4;
        html += `
            <span class="card-count yellow ${isAtRisk ? 'at-risk' : ''}">
                🟨 ${player.cards.yellow}
                ${isAtRisk ? ' ⚠️' : ''}
            </span>
        `;
    }
    
    // Rojas
    if (player.cards.red > 0) {
        html += `
            <span class="card-count red">
                🟥 ${player.cards.red}
            </span>
        `;
    }
    
    // Si no tiene tarjetas
    if (player.cards.yellow === 0 && player.cards.red === 0) {
        html += '<span class="no-cards">—</span>';
    }
    
    html += '</div>';
    
    return html;
}

/**
 * Genera estadísticas resumidas del equipo
 * @param {Array} squad - Plantilla
 * @returns {string} - HTML con estadísticas
 */
export function renderTeamStatusSummary(squad) {
    const injuryStats = InjurySystem.getTeamInjuryStats(squad);
    const cardsStats = CardsSystem.getTeamCardsStats(squad);
    
    const availablePlayers = squad.filter(p => {
        const canPlay = CardsSystem.canPlayerPlay(p);
        return !p.isInjured && canPlay.canPlay;
    }).length;
    
    let html = `
        <div class="team-status-summary">
            <div class="summary-section">
                <h4>📊 Estado de la Plantilla</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Disponibles:</span>
                        <span class="stat-value available">${availablePlayers}/${squad.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🏥 Lesionados:</span>
                        <span class="stat-value ${injuryStats.totalInjured > 0 ? 'warning' : ''}">${injuryStats.totalInjured}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🚫 Sancionados:</span>
                        <span class="stat-value ${cardsStats.suspended > 0 ? 'warning' : ''}">${cardsStats.suspended}</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📇 Disciplina</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">🟨 Total Amarillas:</span>
                        <span class="stat-value">${cardsStats.totalYellow}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🟥 Total Rojas:</span>
                        <span class="stat-value ${cardsStats.totalRed > 0 ? 'danger' : ''}">${cardsStats.totalRed}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">⚠️ En riesgo (4 amarillas):</span>
                        <span class="stat-value ${cardsStats.atRisk > 0 ? 'warning' : ''}">${cardsStats.atRisk}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Añade indicadores visuales a la alineación
 * @param {Object} player - Jugador
 * @param {HTMLElement} playerElement - Elemento DOM del jugador
 */
export function addLineupStatusIndicators(player, playerElement) {
    InjurySystem.initializePlayerInjury(player);
    CardsSystem.initializePlayerCards(player);
    
    // Limpiar indicadores previos
    const existingIndicators = playerElement.querySelectorAll('.status-indicator');
    existingIndicators.forEach(ind => ind.remove());
    
    // Crear contenedor de indicadores
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = 'status-indicator';
    
    // Indicador de lesión
    if (player.isInjured) {
        const injuryBadge = document.createElement('span');
        injuryBadge.className = 'lineup-badge injury-badge';
        injuryBadge.innerHTML = '🏥';
        injuryBadge.title = `Lesionado - ${player.weeksOut} semanas`;
        indicatorContainer.appendChild(injuryBadge);
        
        // Deshabilitar selección
        playerElement.classList.add('player-injured');
        playerElement.style.opacity = '0.5';
        playerElement.style.pointerEvents = 'none';
    }
    
    // Indicador de sanción
    if (player.cards.isSuspended) {
        const suspensionBadge = document.createElement('span');
        suspensionBadge.className = 'lineup-badge suspension-badge';
        suspensionBadge.innerHTML = '🚫';
        suspensionBadge.title = `Sancionado - ${player.cards.suspensionWeeks} partidos`;
        indicatorContainer.appendChild(suspensionBadge);
        
        // Deshabilitar selección
        playerElement.classList.add('player-suspended');
        playerElement.style.opacity = '0.5';
        playerElement.style.pointerEvents = 'none';
    }
    
    // Indicador de tarjetas amarillas en riesgo
    if (!player.isInjured && !player.cards.isSuspended && player.cards.yellow === 4) {
        const riskBadge = document.createElement('span');
        riskBadge.className = 'lineup-badge risk-badge';
        riskBadge.innerHTML = '⚠️';
        riskBadge.title = '4 tarjetas amarillas - ¡En riesgo!';
        indicatorContainer.appendChild(riskBadge);
    }
    
    // Añadir indicadores al elemento
    if (indicatorContainer.children.length > 0) {
        playerElement.appendChild(indicatorContainer);
    }
}

/**
 * Estilos CSS necesarios para los componentes
 * Añadir esto a style.css
 */
export const requiredCSS = `
/* ========================================
   SISTEMA DE TARJETAS Y SANCIONES - ESTILOS
   ======================================== */

.player-status {
    display: flex;
    align-items: center;
    justify-content: center;
}

.status-badge {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85em;
    min-width: 120px;
}

.status-badge .status-icon {
    font-size: 1.5em;
    margin-bottom: 4px;
}

.status-badge .status-text {
    font-weight: 600;
    margin-bottom: 2px;
}

.status-badge .status-detail {
    font-size: 0.9em;
    opacity: 0.9;
}

.status-badge .status-weeks {
    font-size: 0.85em;
    font-weight: 500;
    margin-top: 2px;
}

.status-injured {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border: 2px solid #ef4444;
    color: #991b1b;
}

.status-suspended {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    color: #92400e;
}

.status-available {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border: 2px solid #10b981;
    color: #065f46;
}

.status-available .status-detail.yellow-cards {
    margin-top: 4px;
    padding: 2px 6px;
    background: #fef3c7;
    border-radius: 4px;
    font-weight: 600;
}

.status-available .status-detail.yellow-cards.at-risk {
    background: #fed7aa;
    animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.player-cards-display {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
}

.card-count {
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.9em;
}

.card-count.yellow {
    background: #fef3c7;
    color: #92400e;
}

.card-count.yellow.at-risk {
    background: #fed7aa;
    border: 2px solid #f59e0b;
    animation: pulse-warning 2s infinite;
}

.card-count.red {
    background: #fee2e2;
    color: #991b1b;
    border: 2px solid #ef4444;
}

.no-cards {
    color: #9ca3af;
    font-style: italic;
}

.player-unavailable {
    background-color: #f9fafb !important;
    opacity: 0.7;
}

.unavailable-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 6px;
    background: #ef4444;
    color: white;
    border-radius: 4px;
    font-size: 0.75em;
    font-weight: 600;
}

.team-status-summary {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.summary-section {
    margin-bottom: 20px;
}

.summary-section:last-child {
    margin-bottom: 0;
}

.summary-section h4 {
    margin: 0 0 12px 0;
    color: #1f2937;
    font-size: 1.1em;
}

.summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 6px;
}

.stat-label {
    font-size: 0.9em;
    color: #6b7280;
}

.stat-value {
    font-weight: 700;
    font-size: 1.1em;
    color: #1f2937;
}

.stat-value.available {
    color: #059669;
}

.stat-value.warning {
    color: #f59e0b;
}

.stat-value.danger {
    color: #ef4444;
}

/* Indicadores en la alineación */
.lineup-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 10;
}

.injury-badge {
    border: 2px solid #ef4444;
}

.suspension-badge {
    border: 2px solid #f59e0b;
}

.risk-badge {
    border: 2px solid #eab308;
}

.player-injured,
.player-suspended {
    position: relative;
    cursor: not-allowed !important;
}

.player-injured::after,
.player-suspended::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    border-radius: inherit;
    pointer-events: none;
}
`;

export default {
    renderPlayerStatus,
    renderSquadTable,
    renderTeamStatusSummary,
    addLineupStatusIndicators,
    requiredCSS
};
