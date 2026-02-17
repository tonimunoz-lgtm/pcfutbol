// injector-cards-injuries.js
// Versión híbrida - Combina lo mejor de ambos sistemas

console.log('🎴 Sistema de tarjetas y lesiones (versión híbrida)...');

// ============================================
// CONFIGURACIÓN
// ============================================

const CARDS_CONFIG = {
    PROBABILITIES: {
        POR: { yellow: 0.05, red: 0.001 },
        DFC: { yellow: 0.25, red: 0.020 },
        LI:  { yellow: 0.20, red: 0.015 },
        LD:  { yellow: 0.20, red: 0.015 },
        MC:  { yellow: 0.15, red: 0.010 },
        MCO: { yellow: 0.12, red: 0.008 },
        MCD: { yellow: 0.18, red: 0.012 },
        MD:  { yellow: 0.12, red: 0.008 },
        MI:  { yellow: 0.12, red: 0.008 },
        EXT: { yellow: 0.10, red: 0.005 },
        DC:  { yellow: 0.15, red: 0.010 }
    },
    YELLOW_FOR_SUSPENSION: 5,
    RED_SUSPENSION_WEEKS: 2,
    YELLOW_RESET_WEEK: 19
};

const INJURIES_CONFIG = {
    BASE_PROBABILITY: 0.08,
    TYPES: [
        'Esguince de tobillo',
        'Lesión muscular',
        'Rotura de ligamentos',
        'Contusión',
        'Tendinitis'
    ]
};

// Control de ejecución
let alreadyProcessedThisWeek = false;
let lastProcessedWeek = 0;

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

function initializePlayerCards(player) {
    if (!player.yellowCards) player.yellowCards = 0;
    if (!player.redCards) player.redCards = 0;
    if (!player.isSuspended) player.isSuspended = false;
    if (!player.suspensionWeeks) player.suspensionWeeks = 0;
}

function simulateMatchCards(player) {
    if (!player || player.isInjured || player.isSuspended) return null;
    
    initializePlayerCards(player);
    
    const baseProbs = CARDS_CONFIG.PROBABILITIES[player.position] || CARDS_CONFIG.PROBABILITIES.MC;
    const result = { yellow: false, red: false, suspension: 0, player: player.name };
    
    // Roja directa
    if (Math.random() < baseProbs.red) {
        result.red = true;
        player.redCards++;
        result.suspension = CARDS_CONFIG.RED_SUSPENSION_WEEKS;
        player.isSuspended = true;
        player.suspensionWeeks = CARDS_CONFIG.RED_SUSPENSION_WEEKS;
        return result;
    }
    
    // Amarilla
    if (Math.random() < baseProbs.yellow) {
        result.yellow = true;
        player.yellowCards++;
        
        // Sanción por 5 amarillas
        if (player.yellowCards >= CARDS_CONFIG.YELLOW_FOR_SUSPENSION) {
            result.suspension = 1;
            player.isSuspended = true;
            player.suspensionWeeks = 1;
        }
        
        return result;
    }
    
    return null;
}

function simulateMatchInjuries(player, staff) {
    if (!player || player.isInjured) return null;
    
    let probability = INJURIES_CONFIG.BASE_PROBABILITY;
    
    // Factores
    if (staff?.fisio) probability /= (1.5 - (staff.fisio.level * 0.1));
    if (player.age > 30) probability *= (1 + ((player.age - 30) * 0.02));
    if (player.form < 60) probability *= 1.5;
    
    if (Math.random() < probability) {
        const weeks = 1 + Math.floor(Math.random() * 3);
        const injuryType = INJURIES_CONFIG.TYPES[Math.floor(Math.random() * INJURIES_CONFIG.TYPES.length)];
        
        player.isInjured = true;
        player.weeksOut = weeks;
        player.injuryType = injuryType;
        
        return {
            player: player.name,
            type: injuryType,
            weeks: weeks
        };
    }
    
    return null;
}

function processWeeklySuspensions(squad) {
    let recovered = [];
    
    squad.forEach(player => {
        initializePlayerCards(player);
        
        if (player.isSuspended && player.suspensionWeeks > 0) {
            player.suspensionWeeks--;
            
            if (player.suspensionWeeks <= 0) {
                player.isSuspended = false;
                player.suspensionWeeks = 0;
                
                // Reset amarillas si fue por acumulación
                if (player.yellowCards >= CARDS_CONFIG.YELLOW_FOR_SUSPENSION && player.redCards === 0) {
                    player.yellowCards = 0;
                }
                
                recovered.push(player.name);
            }
        }
    });
    
    return recovered;
}

function processWeeklyRecoveries(squad) {
    let recovered = [];
    
    squad.forEach(player => {
        if (player.isInjured && player.weeksOut > 0) {
            player.weeksOut--;
            
            if (player.weeksOut <= 0) {
                player.isInjured = false;
                player.weeksOut = 0;
                player.injuryType = null;
                recovered.push(player.name);
            }
        }
    });
    
    return recovered;
}

// ============================================
// HOOK EN SIMULACIÓN
// ============================================

let isHooked = false;

function hookSimulateWeek() {
    if (isHooked) return;
    
    const originalSimulate = window.simulateWeek;
    
    if (!originalSimulate) {
        setTimeout(hookSimulateWeek, 500);
        return;
    }
    
    isHooked = true;
    console.log('✅ Hook aplicado a simulateWeek');
    
    window.simulateWeek = async function() {
        const state = window.gameLogic?.getGameState();
        
        // Nueva semana
        if (state && state.week !== lastProcessedWeek) {
            alreadyProcessedThisWeek = false;
            lastProcessedWeek = state.week;
        }
        
        // PRE-SIMULACIÓN
        if (state && !alreadyProcessedThisWeek) {
            console.log('🎴 [PRE] Semana', state.week);
            
            // Recuperaciones de sanciones
            const recoveredSuspensions = processWeeklySuspensions(state.squad);
            recoveredSuspensions.forEach(name => {
                window.gameLogic.addNews(`✅ ${name} cumplió su sanción`, 'info');
            });
            
            // Recuperaciones de lesiones
            const recoveredInjuries = processWeeklyRecoveries(state.squad);
            recoveredInjuries.forEach(name => {
                window.gameLogic.addNews(`💚 ${name} se recuperó de su lesión`, 'success');
            });
            
            window.gameLogic.updateGameState(state);
        }
        
        // SIMULAR ORIGINAL
        await originalSimulate();
        
        // POST-SIMULACIÓN
        const newState = window.gameLogic?.getGameState();
        if (newState && newState.lineup && !alreadyProcessedThisWeek) {
            alreadyProcessedThisWeek = true;
            
            console.log('🎴 [POST] Generando tarjetas/lesiones');
            
            const matchCards = [];
            const matchInjuries = [];
            
            // Procesar cada jugador de la alineación
            newState.lineup.forEach(player => {
                if (!player) return;
                
                // Tarjetas
                const cardResult = simulateMatchCards(player);
                if (cardResult) {
                    matchCards.push(cardResult);
                    
                    if (cardResult.red) {
                        window.gameLogic.addNews(
                            `🟥 Tarjeta roja para ${player.name} - Sancionado ${cardResult.suspension} partidos`,
                            'error'
                        );
                    } else if (cardResult.yellow) {
                        window.gameLogic.addNews(
                            `🟨 Tarjeta amarilla para ${player.name}${cardResult.suspension > 0 ? ` - Sancionado por 5 amarillas` : ''}`,
                            'warning'
                        );
                    }
                }
                
                // Lesiones
                const injuryResult = simulateMatchInjuries(player, newState.staff);
                if (injuryResult) {
                    matchInjuries.push(injuryResult);
                    window.gameLogic.addNews(
                        `🏥 ${player.name} lesionado (${injuryResult.type}) - ${injuryResult.weeks} semanas`,
                        'warning'
                    );
                }
            });
            
            // Guardar datos del partido para el modal
            if (matchCards.length > 0 || matchInjuries.length > 0) {
                window.lastMatchCardsAndInjuries = {
                    cards: matchCards,
                    injuries: matchInjuries
                };
            }
            
            window.gameLogic.updateGameState(newState);
            window.gameLogic.saveToLocalStorage();
            
            console.log(`✅ Aplicado: ${matchCards.length} tarjetas, ${matchInjuries.length} lesiones`);
        }
    };
}

setTimeout(hookSimulateWeek, 1000);
setTimeout(hookSimulateWeek, 2000);

// ============================================
// INTEGRACIÓN CON MODAL DE RESULTADOS
// ============================================

// Modificar el injector del modal para usar datos reales
setTimeout(() => {
    if (window.injectMatchSummary) {
        const originalInject = window.injectMatchSummary;
        
        window.injectMatchSummary = function(matchResult) {
            // Llamar al original
            originalInject(matchResult);
            
            // Reemplazar tarjetas/lesiones con datos reales
            if (window.lastMatchCardsAndInjuries) {
                const modal = document.getElementById('matchSummaryModal');
                if (!modal) return;
                
                const data = window.lastMatchCardsAndInjuries;
                
                // Reemplazar sección de tarjetas
                const cardsSection = modal.querySelector('.cards-section');
                if (cardsSection && data.cards.length > 0) {
                    cardsSection.innerHTML = `
                        <h3>🟨🟥 Tarjetas</h3>
                        <div class="cards-list">
                            ${data.cards.map(card => `
                                <div class="card-item home">
                                    <span class="card-icon">${card.red ? '🟥' : '🟨'}</span>
                                    <span class="card-player">${card.player}</span>
                                    ${card.suspension > 0 ? `<span class="card-team">(Sanción: ${card.suspension} partidos)</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // Añadir sección de lesiones si hay
                if (data.injuries.length > 0) {
                    const injuriesHTML = `
                        <div class="injuries-section">
                            <h3>🚑 Lesiones</h3>
                            <div class="injuries-list">
                                ${data.injuries.map(inj => `
                                    <div class="injury-item">
                                        <span class="injury-player">${inj.player}</span>
                                        <span class="injury-team">${inj.type} (${inj.weeks} semanas)</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    
                    cardsSection.insertAdjacentHTML('afterend', injuriesHTML);
                }
                
                // Limpiar datos
                delete window.lastMatchCardsAndInjuries;
            }
        };
        
        console.log('✅ Modal de resultados integrado con sistema de tarjetas/lesiones');
    }
}, 3000);

// ============================================
// VALIDACIÓN DE ALINEACIÓN
// ============================================

setTimeout(() => {
    const originalSaveLineup = window.saveLineup;
    if (originalSaveLineup) {
        window.saveLineup = function() {
            const state = window.gameLogic?.getGameState();
            if (!state) return originalSaveLineup();
            
            const suspendedPlayers = state.lineup.filter(p => {
                initializePlayerCards(p);
                return p.isSuspended;
            });
            
            if (suspendedPlayers.length > 0) {
                alert(`❌ Jugadores sancionados en alineación:\n\n${suspendedPlayers.map(p => 
                    `${p.name} (${p.redCards > 0 ? 'Roja' : '5 amarillas'} - ${p.suspensionWeeks} partidos)`
                ).join('\n')}`);
                return;
            }
            
            return originalSaveLineup();
        };
        console.log('✅ Validación de alineación activada');
    }
}, 2000);

// ============================================
// INICIALIZAR
// ============================================

setTimeout(() => {
    const state = window.gameLogic?.getGameState();
    if (state?.squad) {
        state.squad.forEach(initializePlayerCards);
        state.academy?.forEach(initializePlayerCards);
        window.gameLogic.updateGameState(state);
        lastProcessedWeek = state.week;
        console.log('✅ Sistema inicializado');
    }
}, 2000);

// ============================================
// EXPONER GLOBALMENTE
// ============================================

window.CardsInjuriesSystem = {
    initializeCards: initializePlayerCards,
    simulateCards: simulateMatchCards,
    simulateInjuries: simulateMatchInjuries,
    processWeeklySuspensions,
    processWeeklyRecoveries,
    
    // Ver estado
    showStatus: function() {
        const state = window.gameLogic?.getGameState();
        if (!state) return;
        
        console.log('=== ESTADO ===');
        state.squad.forEach(p => {
            initializePlayerCards(p);
            if (p.yellowCards > 0 || p.redCards > 0 || p.isInjured || p.isSuspended) {
                console.log(`${p.name}:`, {
                    amarillas: p.yellowCards,
                    rojas: p.redCards,
                    sancionado: p.isSuspended,
                    semanasSancion: p.suspensionWeeks,
                    lesionado: p.isInjured,
                    semanasLesion: p.weeksOut
                });
            }
        });
    }
};

console.log('✅ Sistema cargado (versión híbrida)');
console.log('💡 Ver estado: CardsInjuriesSystem.showStatus()');
