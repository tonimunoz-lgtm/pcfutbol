// cards-sanctions-system.js - Sistema completo de tarjetas y sanciones

/**
 * SISTEMA DE TARJETAS Y SANCIONES
 * 
 * Características:
 * - Probabilidad realista de tarjetas amarillas y rojas por partido
 * - Acumulación de tarjetas amarillas (5 amarillas = 1 partido de sanción)
 * - Tarjetas rojas = 2 partidos de sanción
 * - Contador de semanas de sanción que se reduce automáticamente
 * - Al cumplir sanción, se resetean las tarjetas
 * - Aparece en resúmenes de partidos y noticias
 */

// Constantes del sistema
const CARDS_CONFIG = {
    // Probabilidades base por partido
    BASE_YELLOW_CARD_PROB: 0.15,  // 15% probabilidad por jugador titular
    BASE_RED_CARD_PROB: 0.01,      // 1% probabilidad por jugador titular
    
    // Sanciones
    YELLOW_CARDS_FOR_SUSPENSION: 5,  // 5 amarillas = 1 partido
    RED_CARD_SUSPENSION_WEEKS: 2,     // Roja = 2 partidos
    YELLOW_SUSPENSION_WEEKS: 1,       // 5 amarillas = 1 partido
    
    // Modificadores por mentalidad
    MENTALITY_MODIFIERS: {
        defensive: { yellow: 0.8, red: 0.6 },
        balanced: { yellow: 1.0, red: 1.0 },
        attacking: { yellow: 1.2, red: 1.4 }
    },
    
    // Posiciones con más probabilidad de tarjetas
    POSITION_MODIFIERS: {
        'POR': 0.5,   // Porteros reciben menos tarjetas
        'DFC': 1.3,   // Defensas centrales más
        'LI': 1.2,
        'LD': 1.2,
        'MC': 1.0,
        'MCO': 0.9,
        'MD': 1.1,
        'MI': 1.1,
        'EXT': 1.0,
        'DC': 1.1
    }
};

/**
 * Inicializa las propiedades de tarjetas en un jugador
 */
export function initializePlayerCards(player) {
    if (!player.cards) {
        player.cards = {
            yellow: 0,           // Tarjetas amarillas acumuladas
            red: 0,              // Tarjetas rojas (0 o 1 generalmente)
            isSuspended: false,  // ¿Está sancionado?
            suspensionWeeks: 0   // Semanas de sanción restantes
        };
    }
    return player;
}

/**
 * Genera tarjetas durante un partido
 * @param {Array} lineup - Alineación del equipo
 * @param {string} mentality - Mentalidad del equipo (defensive, balanced, attacking)
 * @returns {Object} - { yellowCards: Array, redCards: Array }
 */
export function generateMatchCards(lineup, mentality = 'balanced') {
    const yellowCards = [];
    const redCards = [];
    
    const mentalityMod = CARDS_CONFIG.MENTALITY_MODIFIERS[mentality] || 
                         CARDS_CONFIG.MENTALITY_MODIFIERS.balanced;
    
    lineup.forEach(player => {
        // Inicializar si no tiene el sistema de tarjetas
        initializePlayerCards(player);
        
        // No puede recibir tarjetas si ya está suspendido (no debería estar en lineup)
        if (player.cards.isSuspended) return;
        
        // Modificador por posición
        const posMod = CARDS_CONFIG.POSITION_MODIFIERS[player.position] || 1.0;
        
        // Probabilidad de amarilla
        const yellowProb = CARDS_CONFIG.BASE_YELLOW_CARD_PROB * 
                          mentalityMod.yellow * 
                          posMod;
        
        // Probabilidad de roja
        const redProb = CARDS_CONFIG.BASE_RED_CARD_PROB * 
                       mentalityMod.red * 
                       posMod;
        
        // Generar tarjeta roja (tiene prioridad)
        if (Math.random() < redProb) {
            player.cards.red++;
            player.cards.isSuspended = true;
            player.cards.suspensionWeeks = CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS;
            redCards.push({
                player: player.name,
                position: player.position,
                minute: Math.floor(Math.random() * 90) + 1
            });
        }
        // Si no hay roja, puede haber amarilla
        else if (Math.random() < yellowProb) {
            player.cards.yellow++;
            yellowCards.push({
                player: player.name,
                position: player.position,
                minute: Math.floor(Math.random() * 90) + 1
            });
            
            // Comprobar si alcanza las 5 amarillas
            if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION) {
                player.cards.isSuspended = true;
                player.cards.suspensionWeeks = CARDS_CONFIG.YELLOW_SUSPENSION_WEEKS;
            }
        }
    });
    
    return { yellowCards, redCards };
}

/**
 * Reduce las sanciones de todos los jugadores al avanzar una semana
 * @param {Array} squad - Plantilla del equipo
 * @param {Function} addNewsCallback - Función para añadir noticias
 */
export function updateWeeklySuspensions(squad, addNewsCallback) {
    squad.forEach(player => {
        initializePlayerCards(player);
        
        if (player.cards.isSuspended && player.cards.suspensionWeeks > 0) {
            player.cards.suspensionWeeks--;
            
            // Si termina la sanción
            if (player.cards.suspensionWeeks <= 0) {
                player.cards.isSuspended = false;
                player.cards.suspensionWeeks = 0;
                
                // Resetear tarjetas al cumplir sanción
                const wasYellow = player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION;
                const wasRed = player.cards.red > 0;
                
                player.cards.yellow = 0;
                player.cards.red = 0;
                
                if (addNewsCallback) {
                    const reason = wasRed ? 'tarjeta roja' : '5 tarjetas amarillas';
                    addNewsCallback(
                        `✅ ${player.name} ha cumplido su sanción por ${reason} y vuelve a estar disponible.`,
                        'success'
                    );
                }
            }
        }
    });
}

/**
 * Obtiene el estado de un jugador (apto, lesionado, sancionado)
 * @param {Object} player - Jugador
 * @returns {Object} - { status: string, icon: string, weeks: number, description: string }
 */
export function getPlayerStatus(player) {
    // Inicializar tarjetas si no existen
    initializePlayerCards(player);
    
    // Prioridad: Lesión > Sanción > Apto
    if (player.isInjured && player.weeksOut > 0) {
        return {
            status: 'injured',
            icon: '🏥',
            weeks: player.weeksOut,
            description: `Lesionado (${player.weeksOut} sem.)`
        };
    }
    
    if (player.cards.isSuspended && player.cards.suspensionWeeks > 0) {
        const reason = player.cards.red > 0 ? '🟥' : '🟨×5';
        return {
            status: 'suspended',
            icon: '🚫',
            weeks: player.cards.suspensionWeeks,
            description: `Sancionado ${reason} (${player.cards.suspensionWeeks} sem.)`
        };
    }
    
    // Apto pero con tarjetas acumuladas
    if (player.cards.yellow > 0 && player.cards.yellow < CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION) {
        return {
            status: 'available',
            icon: '✅',
            weeks: 0,
            description: `Apto 🟨×${player.cards.yellow}`
        };
    }
    
    // Completamente apto
    return {
        status: 'available',
        icon: '✅',
        weeks: 0,
        description: 'Apto'
    };
}

/**
 * Verifica si un jugador puede ser alineado
 * @param {Object} player - Jugador
 * @returns {Object} - { canPlay: boolean, reason: string }
 */
export function canPlayerPlay(player) {
    initializePlayerCards(player);
    
    if (player.isInjured && player.weeksOut > 0) {
        return {
            canPlay: false,
            reason: `Lesionado (${player.weeksOut} semanas restantes)`
        };
    }
    
    if (player.cards.isSuspended && player.cards.suspensionWeeks > 0) {
        const cardType = player.cards.red > 0 ? 'tarjeta roja' : '5 tarjetas amarillas';
        return {
            canPlay: false,
            reason: `Sancionado por ${cardType} (${player.cards.suspensionWeeks} partidos)`
        };
    }
    
    return {
        canPlay: true,
        reason: ''
    };
}

/**
 * Genera el texto del resumen de tarjetas para el partido
 * @param {Object} cardsData - Datos de tarjetas del partido
 * @param {string} teamName - Nombre del equipo
 * @returns {string} - HTML con el resumen
 */
export function generateCardsMatchSummary(cardsData, teamName) {
    let summary = '';
    
    if (cardsData.yellowCards && cardsData.yellowCards.length > 0) {
        summary += `<div class="cards-summary yellow-cards">`;
        summary += `<h4>🟨 Tarjetas Amarillas ${teamName}:</h4>`;
        summary += `<ul>`;
        cardsData.yellowCards.forEach(card => {
            summary += `<li>${card.player} (${card.position}) - Min. ${card.minute}'</li>`;
        });
        summary += `</ul></div>`;
    }
    
    if (cardsData.redCards && cardsData.redCards.length > 0) {
        summary += `<div class="cards-summary red-cards">`;
        summary += `<h4>🟥 Tarjetas Rojas ${teamName}:</h4>`;
        summary += `<ul>`;
        cardsData.redCards.forEach(card => {
            summary += `<li>${card.player} (${card.position}) - Min. ${card.minute}' ⚠️ Sanción: ${CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS} partidos</li>`;
        });
        summary += `</ul></div>`;
    }
    
    return summary;
}

/**
 * Genera noticias sobre tarjetas importantes
 * @param {Object} cardsData - Datos de tarjetas
 * @param {Function} addNewsCallback - Función para añadir noticias
 */
export function generateCardsNews(cardsData, addNewsCallback) {
    if (!addNewsCallback) return;
    
    // Noticias de tarjetas rojas
    if (cardsData.redCards && cardsData.redCards.length > 0) {
        cardsData.redCards.forEach(card => {
            addNewsCallback(
                `🟥 ¡${card.player} vio la tarjeta roja! Estará sancionado ${CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS} partidos.`,
                'warning'
            );
        });
    }
    
    // Noticias de jugadores que alcanzan las 5 amarillas
    if (cardsData.suspendedPlayers && cardsData.suspendedPlayers.length > 0) {
        cardsData.suspendedPlayers.forEach(player => {
            addNewsCallback(
                `🟨 ${player} ha alcanzado 5 tarjetas amarillas y será sancionado ${CARDS_CONFIG.YELLOW_SUSPENSION_WEEKS} partido.`,
                'warning'
            );
        });
    }
}

/**
 * Obtiene estadísticas de tarjetas del equipo
 * @param {Array} squad - Plantilla
 * @returns {Object} - Estadísticas
 */
export function getTeamCardsStats(squad) {
    let totalYellow = 0;
    let totalRed = 0;
    let suspended = 0;
    let atRisk = 0; // Jugadores con 4 amarillas
    
    squad.forEach(player => {
        initializePlayerCards(player);
        totalYellow += player.cards.yellow;
        totalRed += player.cards.red;
        
        if (player.cards.isSuspended) {
            suspended++;
        }
        
        if (player.cards.yellow === 4) {
            atRisk++;
        }
    });
    
    return {
        totalYellow,
        totalRed,
        suspended,
        atRisk,
        avgYellowPerPlayer: squad.length > 0 ? (totalYellow / squad.length).toFixed(1) : 0
    };
}

export default {
    CARDS_CONFIG,
    initializePlayerCards,
    generateMatchCards,
    updateWeeklySuspensions,
    getPlayerStatus,
    canPlayerPlay,
    generateCardsMatchSummary,
    generateCardsNews,
    getTeamCardsStats
};
