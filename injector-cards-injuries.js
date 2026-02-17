// injector-cards-injuries.js
// Sistema de tarjetas y lesiones - VERSIÓN ULTRA-SIMPLE
// Solo añade noticias, NO modifica UI

console.log('🎴 Sistema de tarjetas y lesiones (versión simple)...');

// ============================================
// CONFIGURACIÓN
// ============================================

const CARDS_CONFIG = {
    BASE_YELLOW_CARD_PROB: 0.25,
    BASE_RED_CARD_PROB: 0.03,
    YELLOW_CARDS_FOR_SUSPENSION: 5,
    RED_CARD_SUSPENSION_WEEKS: 2
};

const INJURY_CONFIG = {
    BASE_INJURY_PROB: 0.12
};

// Variable para evitar ejecución múltiple
let alreadyProcessedThisWeek = false;
let lastProcessedWeek = 0;

// ============================================
// FUNCIONES PRINCIPALES
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
    
    lineup.forEach(player => {
        initializePlayerCards(player);
        
        // Tarjetas amarillas
        if (Math.random() < CARDS_CONFIG.BASE_YELLOW_CARD_PROB) {
            yellowCards.push(player.name);
            player.cards.yellow++;
            
            if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION) {
                player.cards.isSuspended = true;
                player.cards.suspensionWeeks = 1;
            }
        }
        
        // Tarjetas rojas
        if (Math.random() < CARDS_CONFIG.BASE_RED_CARD_PROB) {
            redCards.push(player.name);
            player.cards.red++;
            player.cards.isSuspended = true;
            player.cards.suspensionWeeks = CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS;
        }
    });
    
    return { yellowCards, redCards };
}

function updateWeeklySuspensions(squad) {
    let recovered = [];
    
    squad.forEach(player => {
        initializePlayerCards(player);
        
        if (player.cards.isSuspended && player.cards.suspensionWeeks > 0) {
            player.cards.suspensionWeeks--;
            
            if (player.cards.suspensionWeeks === 0) {
                player.cards.isSuspended = false;
                
                if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION && player.cards.red === 0) {
                    player.cards.yellow = 0;
                }
                
                recovered.push(player.name);
            }
        }
    });
    
    return recovered;
}

function generateInjuries(lineup, staff) {
    let injured = [];
    
    lineup.forEach(player => {
        let probability = INJURY_CONFIG.BASE_INJURY_PROB;
        
        if (staff?.fisio) probability /= (1.5 - (staff.fisio.level * 0.1));
        if (player.form < 60) probability *= 1.5;
        if (player.age > 32) probability *= 1.3;
        
        if (Math.random() < probability) {
            const weeksOut = 1 + Math.floor(Math.random() * 3);
            player.isInjured = true;
            player.weeksOut = weeksOut;
            injured.push({ name: player.name, weeks: weeksOut });
        }
    });
    
    return injured;
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

// ============================================
// HOOK SEGURO EN SIMULACIÓN
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
        
        // Resetear flag si es una nueva semana
        if (state && state.week !== lastProcessedWeek) {
            alreadyProcessedThisWeek = false;
            lastProcessedWeek = state.week;
        }
        
        // PRE-SIMULACIÓN
        if (state && !alreadyProcessedThisWeek) {
            console.log('🎴 [PRE] Actualizando sanciones semana', state.week);
            
            const recovered = updateWeeklySuspensions(state.squad);
            
            if (recovered.length > 0) {
                recovered.forEach(name => {
                    window.gameLogic.addNews(`✅ ${name} ha cumplido su sanción`, 'info');
                });
            }
            
            window.gameLogic.updateGameState(state);
        }
        
        // Ejecutar simulación original
        await originalSimulate();
        
        // POST-SIMULACIÓN - SOLO UNA VEZ
        const newState = window.gameLogic?.getGameState();
        if (newState && newState.lineup && !alreadyProcessedThisWeek) {
            alreadyProcessedThisWeek = true;
            
            console.log('🎴 [POST] Generando tarjetas/lesiones para TU EQUIPO');
            
            // Generar tarjetas SOLO para tu lineup
            const cards = generateMatchCards(newState.lineup, newState.mentality);
            
            if (cards.yellowCards.length > 0) {
                cards.yellowCards.forEach(name => {
                    window.gameLogic.addNews(`🟨 Tarjeta amarilla para ${name}`, 'warning');
                });
                console.log(`🟨 ${cards.yellowCards.length} amarillas:`, cards.yellowCards);
            }
            
            if (cards.redCards.length > 0) {
                cards.redCards.forEach(name => {
                    window.gameLogic.addNews(`🟥 Tarjeta roja para ${name} - Sancionado 2 partidos`, 'error');
                });
                console.log(`🟥 ${cards.redCards.length} rojas:`, cards.redCards);
            }
            
            // Detectar suspensiones por 5 amarillas
            newState.lineup.forEach(player => {
                initializePlayerCards(player);
                if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION && 
                    player.cards.isSuspended && 
                    player.cards.red === 0) {
                    window.gameLogic.addNews(`⚠️ ${player.name} acumula 5 amarillas - Sancionado 1 partido`, 'warning');
                }
            });
            
            // Generar lesiones
            const injuries = generateInjuries(newState.lineup, newState.staff);
            
            if (injuries.length > 0) {
                injuries.forEach(inj => {
                    window.gameLogic.addNews(`🏥 ${inj.name} lesionado - ${inj.weeks} semanas de baja`, 'warning');
                });
                console.log(`🏥 ${injuries.length} lesiones:`, injuries);
            }
            
            window.gameLogic.updateGameState(newState);
            window.gameLogic.saveToLocalStorage();
            
            console.log('✅ Tarjetas y lesiones aplicadas (solo a tu equipo)');
        }
    };
}

setTimeout(hookSimulateWeek, 1000);
setTimeout(hookSimulateWeek, 2000);

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
                return p.cards.isSuspended;
            });
            
            if (suspendedPlayers.length > 0) {
                alert(`❌ No puedes alinear jugadores sancionados:\n\n${suspendedPlayers.map(p => 
                    `${p.name} (${p.cards.red > 0 ? 'Roja' : '5 amarillas'} - ${p.cards.suspensionWeeks} partidos)`
                ).join('\n')}`);
                return;
            }
            
            return originalSaveLineup();
        };
        console.log('✅ Validación de alineación activada');
    }
}, 2000);

// ============================================
// INICIALIZAR AL CARGAR
// ============================================

setTimeout(() => {
    const state = window.gameLogic?.getGameState();
    if (state?.squad) {
        state.squad.forEach(initializePlayerCards);
        state.academy?.forEach(initializePlayerCards);
        window.gameLogic.updateGameState(state);
        lastProcessedWeek = state.week;
        console.log('✅ Sistema inicializado en semana', state.week);
    }
}, 2000);

// ============================================
// EXPONER PARA DEBUGGING
// ============================================

window.CardsInjuriesSystem = {
    initializePlayerCards,
    canPlayerPlay,
    
    // Ver estado de jugadores
    showStatus: function() {
        const state = window.gameLogic?.getGameState();
        if (!state) return;
        
        console.log('=== ESTADO DE JUGADORES ===');
        state.squad.forEach(p => {
            initializePlayerCards(p);
            if (p.cards.yellow > 0 || p.cards.red > 0 || p.isInjured || p.cards.isSuspended) {
                console.log(`${p.name}:`, {
                    amarillas: p.cards.yellow,
                    rojas: p.cards.red,
                    sancionado: p.cards.isSuspended,
                    semanasSancion: p.cards.suspensionWeeks,
                    lesionado: p.isInjured,
                    semanasLesion: p.weeksOut
                });
            }
        });
    }
};

console.log('✅ Sistema cargado (SOLO afecta a tu equipo)');
console.log('💡 Para ver estado: CardsInjuriesSystem.showStatus()');
