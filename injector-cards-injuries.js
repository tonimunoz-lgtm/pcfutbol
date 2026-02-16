// injector-cards-injuries.js
// Sistema de tarjetas y lesiones - VERSIÓN MINIMALISTA
// Solo añade funcionalidad, no modifica UI existente

console.log('🎴 Sistema de tarjetas y lesiones iniciando...');

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

// ============================================
// HOOK DIRECTO EN window.simulateWeek
// ============================================

let isHooked = false;

function hookSimulateWeek() {
    if (isHooked) return;
    
    // Buscar la función simulateWeek en window
    const originalSimulate = window.simulateWeek;
    
    if (!originalSimulate) {
        console.log('⏳ Esperando a que simulateWeek esté disponible...');
        setTimeout(hookSimulateWeek, 500);
        return;
    }
    
    isHooked = true;
    console.log('✅ Hook aplicado a simulateWeek');
    
    window.simulateWeek = async function() {
        console.log('🎴 [PRE-SIMULACIÓN] Actualizando sanciones...');
        
        const state = window.gameLogic?.getGameState();
        if (state) {
            // Actualizar sanciones antes de simular
            const recovered = updateWeeklySuspensions(state.squad);
            
            if (recovered.length > 0) {
                window.gameLogic.addNews(
                    `✅ Sanciones cumplidas: ${recovered.join(', ')}`,
                    'info'
                );
            }
            
            window.gameLogic.updateGameState(state);
        }
        
        // Ejecutar simulación original
        await originalSimulate();
        
        console.log('🎴 [POST-SIMULACIÓN] Generando tarjetas y lesiones...');
        
        const newState = window.gameLogic?.getGameState();
        if (newState && newState.lineup) {
            // Generar tarjetas
            const cards = generateMatchCards(newState.lineup, newState.mentality);
            
            if (cards.yellowCards.length > 0) {
                window.gameLogic.addNews(
                    `🟨 Tarjetas amarillas: ${cards.yellowCards.join(', ')}`,
                    'warning'
                );
                console.log(`🟨 ${cards.yellowCards.length} amarillas`);
            }
            
            if (cards.redCards.length > 0) {
                window.gameLogic.addNews(
                    `🟥 Tarjetas rojas: ${cards.redCards.join(', ')}`,
                    'error'
                );
                console.log(`🟥 ${cards.redCards.length} rojas`);
            }
            
            // Generar lesiones
            const injuries = generateInjuries(newState.lineup, newState.staff);
            
            if (injuries.length > 0) {
                injuries.forEach(inj => {
                    window.gameLogic.addNews(
                        `🏥 ${inj.name} lesionado (${inj.weeks} semanas)`,
                        'warning'
                    );
                });
                console.log(`🏥 ${injuries.length} lesiones`);
            }
            
            window.gameLogic.updateGameState(newState);
            window.gameLogic.saveToLocalStorage();
            
            console.log('✅ Tarjetas y lesiones aplicadas correctamente');
        }
    };
}

// Intentar aplicar hook cada 500ms hasta que funcione
setTimeout(hookSimulateWeek, 1000);
setTimeout(hookSimulateWeek, 2000);
setTimeout(hookSimulateWeek, 3000);

// ============================================
// INICIALIZAR TARJETAS AL CARGAR
// ============================================

setTimeout(() => {
    const state = window.gameLogic?.getGameState();
    if (state?.squad) {
        state.squad.forEach(initializePlayerCards);
        state.academy?.forEach(initializePlayerCards);
        window.gameLogic.updateGameState(state);
        console.log('✅ Sistema de tarjetas inicializado en ' + state.squad.length + ' jugadores');
    }
}, 2000);

// ============================================
// EXPONER GLOBALMENTE (para debugging)
// ============================================

window.CardsInjuriesSystem = {
    initializePlayerCards,
    generateMatchCards,
    updateWeeklySuspensions,
    generateInjuries,
    CARDS_CONFIG,
    INJURY_CONFIG,
    
    // Función de test
    test: function() {
        const state = window.gameLogic?.getGameState();
        if (!state) {
            console.error('❌ gameLogic no disponible');
            return;
        }
        
        console.log('🧪 Generando tarjetas de prueba...');
        const cards = generateMatchCards(state.lineup, state.mentality);
        console.log('Amarillas:', cards.yellowCards);
        console.log('Rojas:', cards.redCards);
        
        console.log('🧪 Generando lesiones de prueba...');
        const injuries = generateInjuries(state.lineup, state.staff);
        console.log('Lesiones:', injuries);
    }
};

console.log('✅ Sistema de tarjetas y lesiones cargado');
console.log('💡 Para probar: CardsInjuriesSystem.test()');
