// injector-cards-injuries.js
// Sistema completo de tarjetas, sanciones y lesiones mejoradas
// Versión FINAL: Integración real con simulateWeekButton

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
    BASE_INJURY_PROB: 0.08  // Aumentado a 8% para que se vean más
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
// INTERCEPTAR EL BOTÓN DE SIMULAR
// ============================================

function hookSimulateButton() {
    const simulateBtn = document.getElementById('simulateWeekButton');
    
    if (!simulateBtn) {
        console.warn('⚠️ Botón simulateWeekButton no encontrado, reintentando...');
        setTimeout(hookSimulateButton, 1000);
        return;
    }
    
    console.log('✅ Botón simulateWeekButton encontrado, aplicando hooks...');
    
    // Clonar el botón para eliminar todos los event listeners
    const newBtn = simulateBtn.cloneNode(true);
    simulateBtn.parentNode.replaceChild(newBtn, simulateBtn);
    
    // Añadir nuestro propio handler
    newBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎮 Simulación interceptada por sistema de tarjetas/lesiones');
        
        const state = window.gameLogic?.getGameState();
        if (!state) {
            console.error('❌ gameLogic no disponible');
            return;
        }
        
        // ===== PRE-SIMULACIÓN: Actualizar sanciones y lesiones =====
        console.log('⏳ PRE-SIMULACIÓN: Actualizando sanciones y lesiones...');
        updateWeeklySuspensions(state.squad, window.gameLogic.addNews);
        updateWeeklyInjuries(state.squad, state.academy, window.gameLogic.addNews);
        window.gameLogic.updateGameState(state);
        
        // ===== SIMULAR SEMANA ORIGINAL =====
        console.log('⚽ Ejecutando simulación original...');
        newBtn.disabled = true;
        
        try {
            const result = await window.gameLogic.simulateFullWeek();
            
            // ===== POST-SIMULACIÓN: Generar tarjetas y lesiones =====
            if (result.myMatch && !result.forcedLoss) {
                console.log('🎴 POST-SIMULACIÓN: Generando tarjetas y lesiones del partido...');
                
                const currentState = window.gameLogic.getGameState();
                const cards = generateMatchCards(currentState.lineup, currentState.mentality);
                
                console.log(`📊 Tarjetas generadas: ${cards.yellowCards.length} amarillas, ${cards.redCards.length} rojas`);
                
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
                currentState.lineup.forEach(player => {
                    if (generateInjury(player, currentState.staff, window.gameLogic.addNews)) {
                        injuryCount++;
                    }
                });
                
                console.log(`🏥 Lesiones generadas: ${injuryCount}`);
                
                window.gameLogic.updateGameState(currentState);
                window.gameLogic.saveToLocalStorage();
            }
            
            // Refrescar UI
            if (window.ui?.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
            
        } catch (error) {
            console.error('❌ Error en simulación:', error);
        } finally {
            newBtn.disabled = false;
        }
    });
    
    console.log('✅ Sistema de tarjetas/lesiones conectado al botón de simular');
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookSimulateButton);
} else {
    hookSimulateButton();
}

// ============================================
// VALIDACIÓN DE ALINEACIÓN
// ============================================

const originalSaveLineup = window.saveLineup;
if (originalSaveLineup) {
    window.saveLineup = function() {
        const state = window.gameLogic?.getGameState();
        if (!state) return originalSaveLineup();
        
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
    console.log('✅ Validación de sanciones en alineación activada');
}

// ============================================
// INICIALIZAR TARJETAS EN NUEVO JUEGO
// ============================================

document.addEventListener('click', function(e) {
    if (e.target.textContent?.includes('Empezar')) {
        setTimeout(() => {
            const state = window.gameLogic?.getGameState();
            if (state?.squad) {
                state.squad.forEach(initializePlayerCards);
                state.academy?.forEach(initializePlayerCards);
                window.gameLogic.updateGameState(state);
                console.log('✅ Tarjetas inicializadas en nuevo juego');
            }
        }, 2000);
    }
});

// ============================================
// MEJORAS DE UI
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
            
            // Buscar la celda de TARJETAS (debe existir ya en el HTML)
            const cardsCells = row.querySelectorAll('td');
            const cardsCell = cardsCells[cardsCells.length - 1]; // Última columna
            
            if (cardsCell) {
                const status = getPlayerStatus(player);
                const cardsInfo = player.cards ? 
                    `${player.cards.yellow > 0 ? `🟨${player.cards.yellow}` : ''} ${player.cards.red > 0 ? `🟥${player.cards.red}` : ''}`.trim() : '';
                
                cardsCell.innerHTML = `
                    <span title="${status.description}" style="font-size: 1.2em;">
                        ${status.icon}
                    </span>
                    ${cardsInfo ? `<br><small>${cardsInfo}</small>` : ''}
                `;
            }
        }
    });
}

// Observer para actualizar UI cuando cambie
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

console.log('✅ Sistema de tarjetas y lesiones cargado');
console.log('💡 Esperando a interceptar botón de simular...');
