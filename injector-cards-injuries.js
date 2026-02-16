// injector-cards-injuries.js
// Sistema completo de tarjetas, sanciones y lesiones mejoradas
// Se inyecta automáticamente sin modificar archivos existentes

console.log('🎴 Cargando sistema de tarjetas y lesiones mejorado...');

// ============================================
// CONFIGURACIÓN
// ============================================

const CARDS_CONFIG = {
    BASE_YELLOW_CARD_PROB: 0.15,  // 15% por jugador por partido
    BASE_RED_CARD_PROB: 0.01,     // 1% por jugador por partido
    YELLOW_CARDS_FOR_SUSPENSION: 5,
    RED_CARD_SUSPENSION_WEEKS: 2,
    
    MENTALITY_MODIFIERS: {
        defensive: { yellow: 0.8, red: 0.6 },
        balanced: { yellow: 1.0, red: 1.0 },
        offensive: { yellow: 1.2, red: 1.4 }
    },
    
    POSITION_MODIFIERS: {
        POR: { yellow: 0.5, red: 0.3 },
        DFC: { yellow: 1.3, red: 1.2 },
        LI: { yellow: 1.2, red: 1.0 },
        LD: { yellow: 1.2, red: 1.0 },
        MC: { yellow: 1.0, red: 0.8 },
        MCD: { yellow: 1.4, red: 1.1 },
        MCO: { yellow: 0.9, red: 0.7 },
        MD: { yellow: 1.1, red: 0.9 },
        MI: { yellow: 1.1, red: 0.9 },
        EXT: { yellow: 1.0, red: 0.8 },
        DC: { yellow: 0.8, red: 0.6 }
    }
};

const INJURY_CONFIG = {
    TYPES: [
        { name: "Esguince leve", minWeeks: 1, maxWeeks: 2, probability: 0.35 },
        { name: "Contusión muscular", minWeeks: 1, maxWeeks: 3, probability: 0.25 },
        { name: "Lesión muscular", minWeeks: 2, maxWeeks: 4, probability: 0.20 },
        { name: "Rotura fibrilar", minWeeks: 3, maxWeeks: 6, probability: 0.10 },
        { name: "Esguince grave", minWeeks: 4, maxWeeks: 8, probability: 0.05 },
        { name: "Fractura menor", minWeeks: 6, maxWeeks: 10, probability: 0.03 },
        { name: "Lesión de ligamentos", minWeeks: 8, maxWeeks: 16, probability: 0.02 }
    ],
    BASE_INJURY_PROB: 0.005  // 0.5% por jugador por partido
};

// ============================================
// FUNCIONES DE TARJETAS
// ============================================

function initializePlayerCards(player) {
    if (!player.cards) {
        player.cards = {
            yellow: 0,
            red: 0,
            isSuspended: false,
            suspensionWeeks: 0
        };
    }
}

function generateMatchCards(lineup, mentality = 'balanced') {
    const yellowCards = [];
    const redCards = [];
    
    const mentalityMod = CARDS_CONFIG.MENTALITY_MODIFIERS[mentality] || { yellow: 1.0, red: 1.0 };
    
    lineup.forEach(player => {
        initializePlayerCards(player);
        
        const posMod = CARDS_CONFIG.POSITION_MODIFIERS[player.position] || { yellow: 1.0, red: 1.0 };
        
        // Probabilidad de amarilla
        const yellowProb = CARDS_CONFIG.BASE_YELLOW_CARD_PROB * mentalityMod.yellow * posMod.yellow;
        if (Math.random() < yellowProb) {
            const minute = 1 + Math.floor(Math.random() * 90);
            yellowCards.push({ player: player.name, position: player.position, minute });
            player.cards.yellow++;
            
            // Verificar suspensión por 5 amarillas
            if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION) {
                player.cards.isSuspended = true;
                player.cards.suspensionWeeks = 1;
            }
        }
        
        // Probabilidad de roja
        const redProb = CARDS_CONFIG.BASE_RED_CARD_PROB * mentalityMod.red * posMod.red;
        if (Math.random() < redProb) {
            const minute = 1 + Math.floor(Math.random() * 90);
            redCards.push({ player: player.name, position: player.position, minute });
            player.cards.red++;
            player.cards.isSuspended = true;
            player.cards.suspensionWeeks = CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS;
        }
    });
    
    return { yellowCards, redCards };
}

function updateWeeklySuspensions(squad, addNewsCallback) {
    squad.forEach(player => {
        initializePlayerCards(player);
        
        if (player.cards.isSuspended && player.cards.suspensionWeeks > 0) {
            player.cards.suspensionWeeks--;
            
            if (player.cards.suspensionWeeks === 0) {
                player.cards.isSuspended = false;
                
                // Resetear tarjetas amarillas al cumplir sanción
                if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION && player.cards.red === 0) {
                    player.cards.yellow = 0;
                }
                
                if (addNewsCallback) {
                    addNewsCallback(`✅ ${player.name} ha cumplido su sanción y está disponible`, 'info');
                }
            }
        }
    });
}

function canPlayerPlay(player) {
    initializePlayerCards(player);
    
    if (player.isInjured) {
        return { canPlay: false, reason: `Lesionado (${player.weeksOut} semanas)` };
    }
    
    if (player.cards.isSuspended) {
        return { canPlay: false, reason: `Sancionado (${player.cards.suspensionWeeks} partidos)` };
    }
    
    return { canPlay: true, reason: 'Disponible' };
}

function getPlayerStatus(player) {
    initializePlayerCards(player);
    
    if (player.isInjured) {
        return {
            status: 'injured',
            icon: '🏥',
            weeks: player.weeksOut,
            description: `Lesionado (${player.weeksOut} semanas)`
        };
    }
    
    if (player.cards.isSuspended) {
        const type = player.cards.red > 0 ? 'Roja' : '5 amarillas';
        return {
            status: 'suspended',
            icon: '🚫',
            weeks: player.cards.suspensionWeeks,
            description: `Sancionado por ${type} (${player.cards.suspensionWeeks} partidos)`
        };
    }
    
    if (player.cards.yellow === 4) {
        return {
            status: 'risk',
            icon: '⚠️',
            weeks: 0,
            description: 'En riesgo (4 amarillas)'
        };
    }
    
    return {
        status: 'available',
        icon: '✅',
        weeks: 0,
        description: 'Disponible'
    };
}

// ============================================
// FUNCIONES DE LESIONES
// ============================================

function calculateInjuryProbability(player, staff) {
    let probability = INJURY_CONFIG.BASE_INJURY_PROB;
    
    // Efecto del fisioterapeuta (reduce probabilidad)
    if (staff?.fisio) {
        const fisioEffect = 1.5 - (staff.fisio.level * 0.1); // Nivel 5 = 0.5x
        probability /= fisioEffect;
    }
    
    // Efecto del preparador físico
    if (staff?.entrenador) {
        const trainerEffect = 1.2 - (staff.entrenador.level * 0.04); // Nivel 5 = 0.8x
        probability /= trainerEffect;
    }
    
    // Modificadores del jugador
    if (player.form < 60) probability *= 1.5;
    if (player.age > 32) probability *= 1.3;
    if (player.AG && player.AG > 85) probability *= 1.2;
    
    return probability;
}

function selectInjuryType() {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const injury of INJURY_CONFIG.TYPES) {
        cumulative += injury.probability;
        if (roll < cumulative) {
            return injury;
        }
    }
    
    return INJURY_CONFIG.TYPES[0];
}

function calculateRecoveryTime(injuryType, staff) {
    let minWeeks = injuryType.minWeeks;
    let maxWeeks = injuryType.maxWeeks;
    
    // Efecto del médico (reduce tiempo de recuperación)
    if (staff?.medico) {
        const doctorEffect = 1.0 - (staff.medico.level * 0.1); // Nivel 5 = 50% reducción
        minWeeks = Math.max(1, Math.round(minWeeks * doctorEffect));
        maxWeeks = Math.max(minWeeks, Math.round(maxWeeks * doctorEffect));
    }
    
    return minWeeks + Math.floor(Math.random() * (maxWeeks - minWeeks + 1));
}

function generateInjury(player, staff, addNewsCallback) {
    const probability = calculateInjuryProbability(player, staff);
    
    if (Math.random() < probability) {
        const injuryType = selectInjuryType();
        const weeksOut = calculateRecoveryTime(injuryType, staff);
        
        player.isInjured = true;
        player.weeksOut = weeksOut;
        player.injuryType = injuryType.name;
        
        if (addNewsCallback) {
            addNewsCallback(
                `🏥 ${player.name} se ha lesionado (${injuryType.name}). Estará ${weeksOut} semanas fuera`,
                'warning'
            );
        }
        
        return true;
    }
    
    return false;
}

function updateWeeklyInjuries(squad, academy, addNewsCallback) {
    [...squad, ...academy].forEach(player => {
        if (player.isInjured && player.weeksOut > 0) {
            player.weeksOut--;
            
            if (player.weeksOut === 0) {
                player.isInjured = false;
                player.injuryType = null;
                
                if (addNewsCallback) {
                    addNewsCallback(`✅ ${player.name} se ha recuperado de su lesión`, 'info');
                }
            }
        }
    });
}

// ============================================
// INTERCEPTAR FUNCIONES DE gameLogic
// ============================================

// Guardar referencia a la función original
const originalSimulateFullWeek = window.gameLogic?.simulateFullWeek;

if (originalSimulateFullWeek) {
    // Sobrescribir simulateFullWeek
    window.gameLogic.simulateFullWeek = async function() {
        const state = window.gameLogic.getGameState();
        
        // Actualizar sanciones al inicio de la semana
        updateWeeklySuspensions(state.squad, window.gameLogic.addNews);
        
        // Actualizar lesiones
        updateWeeklyInjuries(state.squad, state.academy, window.gameLogic.addNews);
        
        // Llamar a la función original
        const result = await originalSimulateFullWeek.call(this);
        
        // Generar tarjetas si jugamos partido
        if (result.myMatch && !result.forcedLoss) {
            const cards = generateMatchCards(state.lineup, state.mentality);
            
            // Aplicar tarjetas
            if (cards.yellowCards.length > 0) {
                window.gameLogic.addNews(
                    `🟨 Tarjetas amarillas: ${cards.yellowCards.map(c => c.player).join(', ')}`,
                    'warning'
                );
            }
            
            if (cards.redCards.length > 0) {
                window.gameLogic.addNews(
                    `🟥 Tarjetas rojas: ${cards.redCards.map(c => c.player).join(', ')}`,
                    'error'
                );
            }
            
            // Generar lesiones durante el partido
            state.lineup.forEach(player => {
                generateInjury(player, state.staff, window.gameLogic.addNews);
            });
            
            // Actualizar estado
            window.gameLogic.updateGameState(state);
        }
        
        return result;
    };
    
    console.log('✅ simulateFullWeek interceptado');
}

// Interceptar validateLineup
const originalValidateLineup = window.gameLogic?.validateLineup;

if (originalValidateLineup) {
    window.gameLogic.validateLineup = function(lineup) {
        // Validación original
        const originalResult = originalValidateLineup.call(this, lineup);
        
        if (!originalResult.success) {
            return originalResult;
        }
        
        // Validar sanciones
        const suspendedPlayers = lineup.filter(p => {
            const status = canPlayerPlay(p);
            return !status.canPlay;
        });
        
        if (suspendedPlayers.length > 0) {
            return {
                success: false,
                message: `❌ Jugadores sancionados en alineación: ${suspendedPlayers.map(p => p.name).join(', ')}`
            };
        }
        
        return { success: true, message: 'Alineación válida' };
    };
    
    console.log('✅ validateLineup interceptado');
}

// Interceptar initSquad para inicializar tarjetas
const originalSelectTeam = window.gameLogic?.selectTeamWithInitialSquad;

if (originalSelectTeam) {
    window.gameLogic.selectTeamWithInitialSquad = async function(...args) {
        const result = await originalSelectTeam.apply(this, args);
        
        // Inicializar tarjetas en todos los jugadores
        const state = window.gameLogic.getGameState();
        state.squad.forEach(initializePlayerCards);
        state.academy.forEach(initializePlayerCards);
        window.gameLogic.updateGameState(state);
        
        return result;
    };
    
    console.log('✅ selectTeamWithInitialSquad interceptado');
}

// ============================================
// INYECTAR EN UI
// ============================================

// Añadir indicadores visuales a la tabla de plantilla
function enhanceSquadTable() {
    const interval = setInterval(() => {
        const squadTable = document.querySelector('#squadList table');
        
        if (squadTable) {
            clearInterval(interval);
            
            const state = window.gameLogic?.getGameState();
            if (!state) return;
            
            // Añadir columna de estado si no existe
            const headerRow = squadTable.querySelector('thead tr');
            if (headerRow && !headerRow.querySelector('th.cards-status')) {
                const statusHeader = document.createElement('th');
                statusHeader.className = 'cards-status';
                statusHeader.textContent = 'ESTADO';
                headerRow.insertBefore(statusHeader, headerRow.children[9]);
            }
            
            // Añadir estado a cada fila
            const rows = squadTable.querySelectorAll('tbody tr');
            rows.forEach((row, index) => {
                if (state.squad[index]) {
                    const player = state.squad[index];
                    const status = getPlayerStatus(player);
                    
                    if (!row.querySelector('td.cards-status')) {
                        const statusCell = document.createElement('td');
                        statusCell.className = 'cards-status';
                        statusCell.innerHTML = `
                            <span title="${status.description}">
                                ${status.icon} ${status.weeks > 0 ? `(${status.weeks})` : ''}
                            </span>
                        `;
                        row.insertBefore(statusCell, row.children[9]);
                    }
                    
                    // Mostrar tarjetas
                    const cardsInfo = player.cards ? 
                        `${player.cards.yellow > 0 ? `🟨×${player.cards.yellow}` : ''} ${player.cards.red > 0 ? `🟥×${player.cards.red}` : ''}` : '';
                    
                    if (cardsInfo && !row.querySelector('td.player-cards')) {
                        const cardsCell = document.createElement('td');
                        cardsCell.className = 'player-cards';
                        cardsCell.innerHTML = cardsInfo;
                        row.appendChild(cardsCell);
                    }
                }
            });
        }
    }, 1000);
}

// Ejecutar mejoras de UI cuando se abra la página de plantilla
document.addEventListener('click', (e) => {
    if (e.target.textContent?.includes('Plantilla')) {
        setTimeout(enhanceSquadTable, 500);
    }
});

// ============================================
// CSS INYECTADO
// ============================================

const style = document.createElement('style');
style.textContent = `
.cards-status {
    font-size: 1.2em;
}

.player-cards {
    font-size: 0.9em;
    white-space: nowrap;
}

.lineup-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    z-index: 100;
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

.player-unavailable {
    opacity: 0.5;
    position: relative;
}

.player-unavailable::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    pointer-events: none;
}
`;
document.head.appendChild(style);

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================

window.CardsInjuriesSystem = {
    // Tarjetas
    initializePlayerCards,
    generateMatchCards,
    updateWeeklySuspensions,
    canPlayerPlay,
    getPlayerStatus,
    
    // Lesiones
    generateInjury,
    updateWeeklyInjuries,
    calculateInjuryProbability,
    
    // Config
    CARDS_CONFIG,
    INJURY_CONFIG
};

console.log('✅ Sistema de tarjetas y lesiones cargado completamente');
console.log('💡 Accesible vía window.CardsInjuriesSystem');
