// injector-cards-injuries.js
// Sistema completo de tarjetas, sanciones y lesiones mejoradas
// Versión 3: Usando Proxy para evitar problemas con módulos read-only

console.log('🎴 Cargando sistema de tarjetas y lesiones mejorado...');

// ============================================
// CONFIGURACIÓN
// ============================================

const CARDS_CONFIG = {
    BASE_YELLOW_CARD_PROB: 0.15,
    BASE_RED_CARD_PROB: 0.01,
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
    BASE_INJURY_PROB: 0.005
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

// ============================================
// FUNCIONES DE LESIONES
// ============================================

function calculateInjuryProbability(player, staff) {
    let probability = INJURY_CONFIG.BASE_INJURY_PROB;
    
    if (staff?.fisio) {
        const fisioEffect = 1.5 - (staff.fisio.level * 0.1);
        probability /= fisioEffect;
    }
    
    if (staff?.entrenador) {
        const trainerEffect = 1.2 - (staff.entrenador.level * 0.04);
        probability /= trainerEffect;
    }
    
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
    
    if (staff?.medico) {
        const doctorEffect = 1.0 - (staff.medico.level * 0.1);
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
// HOOK MEDIANTE EVENTO PERSONALIZADO
// ============================================

// En lugar de modificar funciones directamente, usamos eventos

// Hook para cuando se simula una semana
document.addEventListener('beforeWeekSimulation', function(e) {
    const state = window.gameLogic?.getGameState();
    if (!state) return;
    
    updateWeeklySuspensions(state.squad, window.gameLogic.addNews);
    updateWeeklyInjuries(state.squad, state.academy, window.gameLogic.addNews);
    window.gameLogic.updateGameState(state);
});

document.addEventListener('afterWeekSimulation', function(e) {
    const result = e.detail;
    if (!result || result.forcedLoss) return;
    
    const state = window.gameLogic?.getGameState();
    if (!state) return;
    
    if (result.myMatch) {
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
        
        state.lineup.forEach(player => {
            generateInjury(player, state.staff, window.gameLogic.addNews);
        });
        
        window.gameLogic.updateGameState(state);
    }
});

// Interceptar clics en el botón de simular
document.addEventListener('click', async function(e) {
    const simulateBtn = document.getElementById('simulateWeekButton');
    if (e.target === simulateBtn) {
        // Disparar evento antes de la simulación
        document.dispatchEvent(new CustomEvent('beforeWeekSimulation'));
        
        // Esperar a que termine la simulación
        setTimeout(() => {
            const state = window.gameLogic?.getGameState();
            document.dispatchEvent(new CustomEvent('afterWeekSimulation', { 
                detail: { myMatch: true } // Simplificado
            }));
        }, 1000);
    }
});

// Inicializar tarjetas cuando se crea un nuevo juego
document.addEventListener('click', function(e) {
    if (e.target.textContent?.includes('Nuevo Juego') || e.target.textContent?.includes('Empezar')) {
        setTimeout(() => {
            const state = window.gameLogic?.getGameState();
            if (state) {
                state.squad.forEach(initializePlayerCards);
                state.academy?.forEach(initializePlayerCards);
                window.gameLogic.updateGameState(state);
                console.log('✅ Tarjetas inicializadas en nuevo juego');
            }
        }, 2000);
    }
});

// Mejorar validación de alineación
const originalSaveLineup = window.saveLineup;
if (originalSaveLineup) {
    window.saveLineup = function() {
        const state = window.gameLogic?.getGameState();
        if (!state) return originalSaveLineup();
        
        // Validar sanciones
        const suspendedPlayers = state.lineup.filter(p => {
            const status = canPlayerPlay(p);
            return !status.canPlay;
        });
        
        if (suspendedPlayers.length > 0) {
            alert(`❌ No puedes alinear jugadores sancionados: ${suspendedPlayers.map(p => p.name).join(', ')}`);
            return;
        }
        
        return originalSaveLineup();
    };
    console.log('✅ saveLineup mejorado con validación de sanciones');
}

// ============================================
// MEJORAS DE UI
// ============================================

function enhanceSquadTable() {
    const squadTable = document.querySelector('#squadList table');
    if (!squadTable) return;
    
    const state = window.gameLogic?.getGameState();
    if (!state) return;
    
    const headerRow = squadTable.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('th.cards-status')) {
        const statusHeader = document.createElement('th');
        statusHeader.className = 'cards-status';
        statusHeader.textContent = 'TARJETAS';
        headerRow.appendChild(statusHeader);
    }
    
    const rows = squadTable.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        if (state.squad[index]) {
            const player = state.squad[index];
            initializePlayerCards(player);
            
            if (!row.querySelector('td.cards-status')) {
                const statusCell = document.createElement('td');
                statusCell.className = 'cards-status';
                
                const status = getPlayerStatus(player);
                const cardsInfo = player.cards ? 
                    `${player.cards.yellow > 0 ? `🟨${player.cards.yellow}` : ''} ${player.cards.red > 0 ? `🟥${player.cards.red}` : ''}`.trim() : '';
                
                statusCell.innerHTML = `
                    <span title="${status.description}" style="font-size: 1.2em;">
                        ${status.icon}
                    </span>
                    ${cardsInfo ? `<br><small>${cardsInfo}</small>` : ''}
                `;
                row.appendChild(statusCell);
            }
        }
    });
}

const observer = new MutationObserver(() => {
    if (document.querySelector('#squadList table')) {
        enhanceSquadTable();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener('click', (e) => {
    if (e.target.textContent?.includes('Plantilla')) {
        setTimeout(enhanceSquadTable, 500);
    }
});

// ============================================
// CSS
// ============================================

const style = document.createElement('style');
style.textContent = `
.cards-status {
    font-size: 1em;
    text-align: center;
}

.cards-status small {
    font-size: 0.8em;
    color: #666;
    white-space: nowrap;
}
`;
document.head.appendChild(style);

// ============================================
// EXPONER GLOBALMENTE
// ============================================

window.CardsInjuriesSystem = {
    initializePlayerCards,
    generateMatchCards,
    updateWeeklySuspensions,
    canPlayerPlay,
    getPlayerStatus,
    generateInjury,
    updateWeeklyInjuries,
    CARDS_CONFIG,
    INJURY_CONFIG
};

console.log('✅ Sistema de tarjetas y lesiones cargado (sin modificar módulos)');
console.log('💡 Sistema funciona mediante eventos y hooks no invasivos');
console.log('💡 Accesible vía window.CardsInjuriesSystem');
