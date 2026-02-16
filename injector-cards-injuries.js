// injector-cards-injuries.js
// Sistema de tarjetas y lesiones - VERSIÓN SEGURA SIN BUCLES

console.log('🎴 Cargando sistema de tarjetas y lesiones (versión segura)...');

// ============================================
// CONFIGURACIÓN
// ============================================

const CARDS_CONFIG = {
    BASE_YELLOW_CARD_PROB: 0.20,
    BASE_RED_CARD_PROB: 0.02,
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
    BASE_INJURY_PROB: 0.10
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
        
        const yellowProb = CARDS_CONFIG.BASE_YELLOW_CARD_PROB * mentalityMod.yellow * posMod.yellow;
        if (Math.random() < yellowProb) {
            const minute = 1 + Math.floor(Math.random() * 90);
            yellowCards.push({ player: player.name, position: player.position, minute });
            player.cards.yellow++;
            
            if (player.cards.yellow >= CARDS_CONFIG.YELLOW_CARDS_FOR_SUSPENSION) {
                player.cards.isSuspended = true;
                player.cards.suspensionWeeks = 1;
            }
        }
        
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

function generateInjury(player, staff, addNewsCallback) {
    let probability = INJURY_CONFIG.BASE_INJURY_PROB;
    
    if (staff?.fisio) probability /= (1.5 - (staff.fisio.level * 0.1));
    if (staff?.entrenador) probability /= (1.2 - (staff.entrenador.level * 0.04));
    if (player.form < 60) probability *= 1.5;
    if (player.age > 32) probability *= 1.3;
    
    if (Math.random() < probability) {
        const weeksOut = 1 + Math.floor(Math.random() * 3);
        player.isInjured = true;
        player.weeksOut = weeksOut;
        player.injuryType = 'Lesión muscular';
        
        if (addNewsCallback) {
            addNewsCallback(`🏥 ${player.name} se ha lesionado. Estará ${weeksOut} semanas fuera`, 'warning');
        }
        return true;
    }
    return false;
}

// ============================================
// EXPONER FUNCIÓN GLOBAL PARA LLAMAR MANUALMENTE
// ============================================

window.applyCardsAndInjuries = function() {
    console.log('🎴 Aplicando tarjetas y lesiones al partido...');
    
    const state = window.gameLogic?.getGameState();
    if (!state) {
        console.error('❌ gameLogic no disponible');
        return;
    }
    
    // Actualizar sanciones
    updateWeeklySuspensions(state.squad, window.gameLogic.addNews);
    
    // Generar tarjetas del partido
    const cards = generateMatchCards(state.lineup, state.mentality);
    
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
    
    // Generar lesiones
    let injuryCount = 0;
    state.lineup.forEach(player => {
        if (generateInjury(player, state.staff, window.gameLogic.addNews)) {
            injuryCount++;
        }
    });
    
    window.gameLogic.updateGameState(state);
    window.gameLogic.saveToLocalStorage();
    
    console.log(`✅ Aplicado: ${cards.yellowCards.length} amarillas, ${cards.redCards.length} rojas, ${injuryCount} lesiones`);
};

// ============================================
// INICIALIZAR TARJETAS AL CARGAR
// ============================================

setTimeout(() => {
    const state = window.gameLogic?.getGameState();
    if (state?.squad) {
        state.squad.forEach(initializePlayerCards);
        state.academy?.forEach(initializePlayerCards);
        window.gameLogic.updateGameState(state);
        console.log('✅ Tarjetas inicializadas en todos los jugadores');
    }
}, 2000);

// ============================================
// MEJORAS DE UI EN PLANTILLA
// ============================================

function enhanceSquadTable() {
    const squadTable = document.querySelector('#squadList table');
    if (!squadTable) return;
    
    const state = window.gameLogic?.getGameState();
    if (!state) return;
    
    const rows = squadTable.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        if (state.squad[index]) {
            const player = state.squad[index];
            initializePlayerCards(player);
            
            const cells = row.querySelectorAll('td');
            const lastCell = cells[cells.length - 1];
            
            if (lastCell) {
                const status = getPlayerStatus(player);
                const cardsInfo = player.cards ? 
                    `${player.cards.yellow > 0 ? `🟨${player.cards.yellow}` : ''} ${player.cards.red > 0 ? `🟥${player.cards.red}` : ''}`.trim() : '';
                
                lastCell.innerHTML = `
                    <span title="${status.description}" style="font-size: 1.2em;">
                        ${status.icon}
                    </span>
                    ${cardsInfo ? `<br><small>${cardsInfo}</small>` : ''}
                `;
            }
        }
    });
}

document.addEventListener('click', (e) => {
    if (e.target.textContent?.includes('Plantilla')) {
        setTimeout(enhanceSquadTable, 500);
    }
});

// ============================================
// EXPONER SISTEMA GLOBALMENTE
// ============================================

window.CardsInjuriesSystem = {
    initializePlayerCards,
    generateMatchCards,
    updateWeeklySuspensions,
    canPlayerPlay,
    getPlayerStatus,
    generateInjury,
    applyCardsAndInjuries: window.applyCardsAndInjuries,
    CARDS_CONFIG,
    INJURY_CONFIG
};

console.log('✅ Sistema de tarjetas y lesiones cargado');
console.log('💡 Para aplicar después de simular, ejecuta en consola: applyCardsAndInjuries()');
