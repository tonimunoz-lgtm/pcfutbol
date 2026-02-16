// match-summary-enhanced.js - Resumen de partido mejorado con tarjetas y lesiones

/**
 * COMPONENTE DE RESUMEN DE PARTIDO MEJORADO
 * 
 * Integra toda la información de:
 * - Resultado del partido
 * - Goleadores
 * - Tarjetas amarillas y rojas
 * - Lesiones
 * - Estadísticas
 */

import * as CardsSystem from './cards-sanctions-system.js';

/**
 * Genera el HTML completo del resumen del partido
 * @param {Object} matchData - Datos del partido
 * @returns {string} - HTML del resumen
 */
export function generateEnhancedMatchSummary(matchData) {
    const {
        homeTeam,
        awayTeam,
        homeGoals,
        awayGoals,
        homeCards = { yellowCards: [], redCards: [] },
        awayCards = { yellowCards: [], redCards: [] },
        homeInjuries = [],
        awayInjuries = [],
        goalScorers = [],
        isPlayerTeam = false,
        teamName = '',
        week = 0
    } = matchData;
    
    const isHome = homeTeam === teamName;
    const myGoals = isHome ? homeGoals : awayGoals;
    const opponentGoals = isHome ? awayGoals : homeGoals;
    const myCards = isHome ? homeCards : awayCards;
    const opponentCards = isHome ? awayCards : homeCards;
    const opponent = isHome ? awayTeam : homeTeam;
    
    // Determinar resultado
    let resultClass = 'draw';
    let resultText = 'Empate';
    
    if (myGoals > opponentGoals) {
        resultClass = 'win';
        resultText = '¡Victoria!';
    } else if (myGoals < opponentGoals) {
        resultClass = 'loss';
        resultText = 'Derrota';
    }
    
    let html = `
        <div class="match-summary enhanced">
            <!-- Cabecera del resultado -->
            <div class="match-header ${resultClass}">
                <div class="match-week">Jornada ${week}</div>
                <div class="match-result-text">${resultText}</div>
                <div class="match-score-display">
                    <div class="team-display home ${isHome ? 'my-team' : ''}">
                        <div class="team-name">${homeTeam}</div>
                        <div class="team-score">${homeGoals}</div>
                    </div>
                    <div class="score-separator">-</div>
                    <div class="team-display away ${!isHome ? 'my-team' : ''}">
                        <div class="team-score">${awayGoals}</div>
                        <div class="team-name">${awayTeam}</div>
                    </div>
                </div>
            </div>
            
            <!-- Contenido principal -->
            <div class="match-content">
    `;
    
    // Goleadores
    if (goalScorers && goalScorers.length > 0) {
        html += `
            <div class="match-section goalscorers">
                <h4>⚽ Goleadores</h4>
                <ul class="scorer-list">
        `;
        
        goalScorers.forEach(scorer => {
            html += `
                <li class="scorer-item">
                    <span class="scorer-name">${scorer.name}</span>
                    <span class="scorer-minute">${scorer.minute}'</span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    
    // Tarjetas del equipo del jugador
    if (isPlayerTeam) {
        html += generateCardsSection(myCards, teamName, true);
    }
    
    // Tarjetas del rival (solo si es relevante)
    if (isPlayerTeam && (opponentCards.yellowCards.length > 0 || opponentCards.redCards.length > 0)) {
        html += generateCardsSection(opponentCards, opponent, false);
    }
    
    // Lesiones
    if (isPlayerTeam && (homeInjuries.length > 0 || awayInjuries.length > 0)) {
        const myInjuries = isHome ? homeInjuries : awayInjuries;
        
        if (myInjuries.length > 0) {
            html += `
                <div class="match-section injuries">
                    <h4>🏥 Lesiones</h4>
                    <div class="injury-list">
            `;
            
            myInjuries.forEach(injury => {
                html += `
                    <div class="injury-item">
                        <div class="injury-player">
                            <span class="player-name">${injury.playerName}</span>
                            <span class="injury-type">${injury.injuryType}</span>
                        </div>
                        <div class="injury-duration">
                            ${injury.weeksOut} ${injury.weeksOut === 1 ? 'semana' : 'semanas'}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
    }
    
    // Advertencias importantes
    html += generateMatchWarnings(matchData);
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Genera la sección de tarjetas
 * @param {Object} cards - Tarjetas del equipo
 * @param {string} teamName - Nombre del equipo
 * @param {boolean} isMyTeam - Si es el equipo del jugador
 * @returns {string} - HTML de la sección
 */
function generateCardsSection(cards, teamName, isMyTeam) {
    const { yellowCards = [], redCards = [] } = cards;
    
    if (yellowCards.length === 0 && redCards.length === 0) {
        return '';
    }
    
    let html = `
        <div class="match-section cards ${isMyTeam ? 'my-team-cards' : 'opponent-cards'}">
            <h4>📇 Tarjetas ${teamName}</h4>
    `;
    
    // Tarjetas amarillas
    if (yellowCards.length > 0) {
        html += `
            <div class="cards-subsection yellow-cards-section">
                <div class="subsection-header">🟨 Amarillas (${yellowCards.length})</div>
                <ul class="cards-list">
        `;
        
        yellowCards.forEach(card => {
            html += `
                <li class="card-item yellow">
                    <span class="card-player">${card.player}</span>
                    <span class="card-position">${card.position}</span>
                    <span class="card-minute">${card.minute}'</span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    
    // Tarjetas rojas
    if (redCards.length > 0) {
        html += `
            <div class="cards-subsection red-cards-section">
                <div class="subsection-header">🟥 Rojas (${redCards.length})</div>
                <ul class="cards-list">
        `;
        
        redCards.forEach(card => {
            html += `
                <li class="card-item red">
                    <span class="card-player">${card.player}</span>
                    <span class="card-position">${card.position}</span>
                    <span class="card-minute">${card.minute}'</span>
                    <span class="card-suspension">⚠️ Sanción: ${CardsSystem.CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS} partidos</span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    
    html += `</div>`;
    
    return html;
}

/**
 * Genera advertencias importantes del partido
 * @param {Object} matchData - Datos del partido
 * @returns {string} - HTML de advertencias
 */
function generateMatchWarnings(matchData) {
    const warnings = [];
    
    // Advertencia de suspensiones
    if (matchData.suspendedPlayers && matchData.suspendedPlayers.length > 0) {
        warnings.push({
            type: 'suspension',
            icon: '🚫',
            message: `${matchData.suspendedPlayers.join(', ')} ${
                matchData.suspendedPlayers.length === 1 ? 'ha alcanzado' : 'han alcanzado'
            } 5 tarjetas amarillas y ${
                matchData.suspendedPlayers.length === 1 ? 'estará suspendido' : 'estarán suspendidos'
            } el próximo partido.`
        });
    }
    
    // Advertencia de jugadores en riesgo (4 amarillas)
    if (matchData.playersAtRisk && matchData.playersAtRisk.length > 0) {
        warnings.push({
            type: 'risk',
            icon: '⚠️',
            message: `${matchData.playersAtRisk.join(', ')} ${
                matchData.playersAtRisk.length === 1 ? 'tiene' : 'tienen'
            } 4 tarjetas amarillas. ¡Una más y suspensión!`
        });
    }
    
    // Advertencia de lesiones graves
    if (matchData.homeInjuries || matchData.awayInjuries) {
        const allInjuries = [...(matchData.homeInjuries || []), ...(matchData.awayInjuries || [])];
        const seriousInjuries = allInjuries.filter(inj => inj.weeksOut >= 6);
        
        if (seriousInjuries.length > 0) {
            warnings.push({
                type: 'injury',
                icon: '🏥',
                message: `Lesión${seriousInjuries.length > 1 ? 'es' : ''} de larga duración: ${
                    seriousInjuries.map(inj => `${inj.playerName} (${inj.weeksOut} sem.)`).join(', ')
                }`
            });
        }
    }
    
    if (warnings.length === 0) {
        return '';
    }
    
    let html = `
        <div class="match-section warnings">
            <h4>⚠️ Avisos Importantes</h4>
            <div class="warnings-list">
    `;
    
    warnings.forEach(warning => {
        html += `
            <div class="warning-item ${warning.type}">
                <span class="warning-icon">${warning.icon}</span>
                <span class="warning-message">${warning.message}</span>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Estilos CSS para el resumen mejorado
 */
export const enhancedSummaryCSS = `
/* ========================================
   RESUMEN DE PARTIDO MEJORADO - ESTILOS
   ======================================== */

.match-summary.enhanced {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    margin-bottom: 24px;
}

.match-header {
    padding: 24px;
    text-align: center;
    position: relative;
}

.match-header.win {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border-bottom: 4px solid #10b981;
}

.match-header.draw {
    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    border-bottom: 4px solid #6366f1;
}

.match-header.loss {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-bottom: 4px solid #ef4444;
}

.match-week {
    font-size: 0.9em;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 8px;
}

.match-result-text {
    font-size: 1.8em;
    font-weight: 700;
    margin-bottom: 16px;
}

.match-score-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    font-size: 1.2em;
}

.team-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.team-display.my-team .team-name {
    font-weight: 700;
    color: #1f2937;
}

.team-name {
    font-size: 0.9em;
    color: #6b7280;
}

.team-score {
    font-size: 2em;
    font-weight: 800;
    color: #1f2937;
}

.score-separator {
    font-size: 1.5em;
    font-weight: 300;
    color: #9ca3af;
}

.match-content {
    padding: 24px;
}

.match-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e5e7eb;
}

.match-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.match-section h4 {
    margin: 0 0 16px 0;
    font-size: 1.1em;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Goleadores */
.scorer-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.scorer-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 6px;
    margin-bottom: 8px;
}

.scorer-item:last-child {
    margin-bottom: 0;
}

.scorer-name {
    font-weight: 600;
    color: #1f2937;
}

.scorer-minute {
    color: #6b7280;
    font-size: 0.9em;
}

/* Tarjetas */
.cards-subsection {
    margin-bottom: 16px;
}

.cards-subsection:last-child {
    margin-bottom: 0;
}

.subsection-header {
    font-weight: 600;
    margin-bottom: 8px;
    color: #374151;
}

.cards-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.card-item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 6px;
}

.card-item:last-child {
    margin-bottom: 0;
}

.card-item.yellow {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
}

.card-item.red {
    background: #fee2e2;
    border-left: 4px solid #ef4444;
}

.card-player {
    font-weight: 600;
    color: #1f2937;
}

.card-position {
    color: #6b7280;
    font-size: 0.9em;
}

.card-minute {
    color: #374151;
    font-size: 0.9em;
}

.card-suspension {
    grid-column: 1 / -1;
    font-size: 0.85em;
    color: #991b1b;
    font-weight: 600;
    margin-top: 4px;
}

/* Lesiones */
.injury-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.injury-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #fef3c7;
    border-radius: 8px;
    border-left: 4px solid #ef4444;
}

.injury-player {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.injury-player .player-name {
    font-weight: 600;
    color: #1f2937;
}

.injury-type {
    font-size: 0.85em;
    color: #6b7280;
}

.injury-duration {
    font-weight: 700;
    color: #991b1b;
    background: white;
    padding: 4px 12px;
    border-radius: 4px;
}

/* Advertencias */
.warnings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.warning-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    border-left: 4px solid;
}

.warning-item.suspension {
    background: #fef3c7;
    border-left-color: #f59e0b;
}

.warning-item.risk {
    background: #fef3c7;
    border-left-color: #eab308;
}

.warning-item.injury {
    background: #fee2e2;
    border-left-color: #ef4444;
}

.warning-icon {
    font-size: 1.5em;
}

.warning-message {
    flex: 1;
    font-size: 0.95em;
    color: #1f2937;
    line-height: 1.5;
}
`;

export default {
    generateEnhancedMatchSummary,
    enhancedSummaryCSS
};
