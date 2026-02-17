// injector-cards-injuries.js
// VERSIÓN DEFINITIVA - Arregla todos los problemas de sincronización

console.log('🎴 Sistema de tarjetas y lesiones (DEFINITIVO)...');

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
    RED_SUSPENSION_WEEKS: 2
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

let lastProcessedWeek = -1;

// ============================================
// FUNCIONES DE SINCRONIZACIÓN
// ============================================

// CRÍTICO: Sincronizar lineup con squad
function syncLineupWithSquad(state) {
    if (!state.lineup || !state.squad) return;
    
    state.lineup.forEach((lineupPlayer, index) => {
        if (!lineupPlayer) return;
        
        // Buscar el jugador en squad por nombre
        const squadPlayer = state.squad.find(sp => sp.name === lineupPlayer.name);
        
        if (squadPlayer) {
            // Copiar estado de squad a lineup
            lineupPlayer.yellowCards = squadPlayer.yellowCards || 0;
            lineupPlayer.redCards = squadPlayer.redCards || 0;
            lineupPlayer.isSuspended = squadPlayer.isSuspended || false;
            lineupPlayer.suspensionWeeks = squadPlayer.suspensionWeeks || 0;
            lineupPlayer.isInjured = squadPlayer.isInjured || false;
            lineupPlayer.weeksOut = squadPlayer.weeksOut || 0;
            lineupPlayer.injuryType = squadPlayer.injuryType || null;
        }
    });
}

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
    
    if (Math.random() < baseProbs.red) {
        result.red = true;
        player.redCards++;
        result.suspension = CARDS_CONFIG.RED_SUSPENSION_WEEKS;
        player.isSuspended = true;
        player.suspensionWeeks = CARDS_CONFIG.RED_SUSPENSION_WEEKS;
        return result;
    }
    
    if (Math.random() < baseProbs.yellow) {
        result.yellow = true;
        player.yellowCards++;
        
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
    console.log('✅ Hook aplicado');
    
    window.simulateWeek = async function() {
        const state = window.gameLogic?.getGameState();
        
        // SINCRONIZAR ANTES DE EMPEZAR
        syncLineupWithSquad(state);
        
        // PRE-SIMULACIÓN
        if (state && state.week !== lastProcessedWeek) {
            console.log(`🎴 Semana ${state.week}`);
            
            const recoveredSuspensions = processWeeklySuspensions(state.squad);
            recoveredSuspensions.forEach(name => {
                window.gameLogic.addNews(`✅ ${name} cumplió su sanción`, 'info');
            });
            
            const recoveredInjuries = processWeeklyRecoveries(state.squad);
            recoveredInjuries.forEach(name => {
                window.gameLogic.addNews(`💚 ${name} se recuperó`, 'success');
            });
            
            // SINCRONIZAR DESPUÉS DE RECUPERACIONES
            syncLineupWithSquad(state);
            
            window.gameLogic.updateGameState(state);
            window.gameLogic.saveToLocalStorage();
        }
        
        // SIMULAR
        await originalSimulate();
        
        // POST-SIMULACIÓN: Solo si NO es pretemporada y es nueva semana
        const newState = window.gameLogic?.getGameState();
        
        const isPreseason = newState.week <= 4; // Ajusta según tu juego
        
        if (newState && newState.week !== lastProcessedWeek && !isPreseason) {
            lastProcessedWeek = newState.week;
            
            console.log(`🎴 Generando tarjetas/lesiones`);
            
            const matchCards = [];
            const matchInjuries = [];
            
            // Procesar SOLO jugadores de squad que están en lineup
            newState.squad.forEach(player => {
                if (!player) return;
                
                const isInLineup = newState.lineup.some(lp => lp && lp.name === player.name);
                if (!isInLineup) return;
                
                // Tarjetas
                const cardResult = simulateMatchCards(player);
                if (cardResult) {
                    matchCards.push(cardResult);
                    
                    if (cardResult.red) {
                        window.gameLogic.addNews(
                            `🟥 ${player.name} vio roja - ${cardResult.suspension} partidos`,
                            'error'
                        );
                    } else if (cardResult.yellow) {
                        if (cardResult.suspension > 0) {
                            window.gameLogic.addNews(
                                `⚠️ ${player.name} 5 amarillas - 1 partido`,
                                'warning'
                            );
                        } else {
                            window.gameLogic.addNews(
                                `🟨 ${player.name} amarilla`,
                                'warning'
                            );
                        }
                    }
                }
                
                // Lesiones
                const injuryResult = simulateMatchInjuries(player, newState.staff);
                if (injuryResult) {
                    matchInjuries.push(injuryResult);
                    window.gameLogic.addNews(
                        `🏥 ${player.name} lesión (${injuryResult.type}) - ${injuryResult.weeks} sem`,
                        'warning'
                    );
                }
            });
            
            // Guardar para modal
            window.lastMatchCardsAndInjuries = {
                cards: matchCards,
                injuries: matchInjuries
            };
            
            // SINCRONIZAR DESPUÉS DE APLICAR TARJETAS/LESIONES
            syncLineupWithSquad(newState);
            
            window.gameLogic.updateGameState(newState);
            window.gameLogic.saveToLocalStorage();
            
            // Actualizar feed
            setTimeout(() => {
                const feed = document.getElementById('newsFeed');
                if (feed && newState.newsFeed) {
                    feed.innerHTML = newState.newsFeed.slice(0, 20).map(n => `
                        <div class="alert ${n.type === 'error' ? 'alert-error' : n.type === 'warning' ? 'alert-warning' : n.type === 'success' ? 'alert-success' : 'alert-info'}" style="font-size: 0.9em; margin-bottom: 5px;">
                            <strong>S${n.week}:</strong> ${n.message}
                        </div>
                    `).join('');
                }
            }, 500);
            
            console.log(`✅ ${matchCards.length} tarjetas, ${matchInjuries.length} lesiones`);
        }
    };
}

setTimeout(hookSimulateWeek, 1000);
setTimeout(hookSimulateWeek, 2000);

// ============================================
// HOOK EN SAVE LINEUP (para sincronizar)
// ============================================

setTimeout(() => {
    const originalSaveLineup = window.saveLineup;
    if (originalSaveLineup) {
        window.saveLineup = function() {
            const state = window.gameLogic?.getGameState();
            if (!state || !state.lineup) return originalSaveLineup();
            
            // SINCRONIZAR PRIMERO
            syncLineupWithSquad(state);
            
            // Validar lesionados
            const injured = state.lineup.filter(p => p && p.isInjured);
            if (injured.length > 0) {
                alert(`❌ Lesionados:\n\n${injured.map(p => `${p.name} (${p.weeksOut} sem)`).join('\n')}`);
                return false;
            }
            
            // Validar sancionados
            const suspended = state.lineup.filter(p => {
                if (!p) return false;
                initializePlayerCards(p);
                return p.isSuspended;
            });
            
            if (suspended.length > 0) {
                alert(`❌ Sancionados:\n\n${suspended.map(p => `${p.name} (${p.suspensionWeeks} partidos)`).join('\n')}`);
                return false;
            }
            
            return originalSaveLineup();
        };
        console.log('✅ Validación activada');
    }
}, 2000);

// ============================================
// MODAL
// ============================================

setTimeout(() => {
    if (window.injectMatchSummary) {
        const originalInject = window.injectMatchSummary;
        
        window.injectMatchSummary = function(matchResult) {
            originalInject(matchResult);
            
            if (window.lastMatchCardsAndInjuries) {
                const modal = document.getElementById('matchSummaryModal');
                if (!modal) return;
                
                const data = window.lastMatchCardsAndInjuries;
                
                const cardsSection = modal.querySelector('.cards-section');
                if (cardsSection && data.cards.length > 0) {
                    cardsSection.innerHTML = `
                        <h3>🟨🟥 Tarjetas</h3>
                        <div class="cards-list">
                            ${data.cards.map(card => `
                                <div class="card-item home">
                                    <span class="card-icon">${card.red ? '🟥' : '🟨'}</span>
                                    <span class="card-player">${card.player}</span>
                                    ${card.suspension > 0 ? `<span class="card-team">(${card.suspension} partidos)</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                if (data.injuries.length > 0) {
                    const injuriesHTML = `
                        <div class="injuries-section">
                            <h3>🚑 Lesiones</h3>
                            <div class="injuries-list">
                                ${data.injuries.map(inj => `
                                    <div class="injury-item">
                                        <span class="injury-player">${inj.player}</span>
                                        <span class="injury-team">${inj.type} (${inj.weeks} sem)</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    
                    cardsSection.insertAdjacentHTML('afterend', injuriesHTML);
                }
                
                delete window.lastMatchCardsAndInjuries;
            }
        };
        
        console.log('✅ Modal integrado');
    }
}, 3000);

// ============================================
// UI PLANTILLA
// ============================================

function enhanceSquadTable() {
    const table = document.querySelector('#squadList table');
    if (!table) return;
    
    const state = window.gameLogic?.getGameState();
    if (!state?.squad) return;
    
    console.log('🎨 Actualizando plantilla');
    
    // Header
    const headerRow = table.querySelector('thead tr');
    if (headerRow && !document.querySelector('th.tarjetas-header')) {
        const headers = Array.from(headerRow.querySelectorAll('th'));
        const estadoHeader = headers.find(h => h.textContent.includes('ESTADO'));
        
        if (estadoHeader) {
            const th = document.createElement('th');
            th.className = 'tarjetas-header';
            th.textContent = 'TARJETAS';
            estadoHeader.insertAdjacentElement('afterend', th);
        }
    }
    
    // Rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, i) => {
        const player = state.squad[i];
        if (!player) return;
        
        initializePlayerCards(player);
        
        const cells = Array.from(row.querySelectorAll('td'));
        let estadoCell = cells.find(c => c.textContent.includes('Apto') || c.textContent.includes('Les.'));
        
        if (estadoCell) {
            const cellIndex = cells.indexOf(estadoCell);
            
            // Estado
            if (player.isSuspended) {
                estadoCell.innerHTML = `<span style="color:#FF9800;">🚫 Sancionado (${player.suspensionWeeks})</span>`;
            } else if (player.isInjured) {
                estadoCell.innerHTML = `<span style="color:#f33;">🏥 Les. (${player.weeksOut} sem)</span>`;
            } else {
                estadoCell.innerHTML = '<span style="color:#4CAF50;">✅ Apto</span>';
            }
            
            // Tarjetas
            let tarjetasCell = cells[cellIndex + 1];
            if (!tarjetasCell?.classList.contains('tarjetas-cell')) {
                tarjetasCell = document.createElement('td');
                tarjetasCell.className = 'tarjetas-cell';
                tarjetasCell.style.textAlign = 'center';
                estadoCell.insertAdjacentElement('afterend', tarjetasCell);
            }
            
            const badges = [];
            if (player.yellowCards > 0) badges.push(`🟨×${player.yellowCards}`);
            if (player.redCards > 0) badges.push(`🟥×${player.redCards}`);
            
            tarjetasCell.innerHTML = badges.length > 0 ? badges.join(' ') : '-';
        }
    });
}

let lastUpdate = 0;
document.addEventListener('click', (e) => {
    if (e.target.textContent?.includes('Plantilla')) {
        const now = Date.now();
        if (now - lastUpdate < 1000) return;
        lastUpdate = now;
        setTimeout(enhanceSquadTable, 600);
    }
});

// ============================================
// INICIALIZAR
// ============================================

setTimeout(() => {
    const state = window.gameLogic?.getGameState();
    if (state?.squad) {
        state.squad.forEach(initializePlayerCards);
        state.academy?.forEach(initializePlayerCards);
        syncLineupWithSquad(state);
        window.gameLogic.updateGameState(state);
        lastProcessedWeek = state.week - 1;
        console.log('✅ Inicializado');
    }
}, 2000);

// ============================================
// EXPONER
// ============================================

window.CardsInjuriesSystem = {
    showStatus: function() {
        const state = window.gameLogic?.getGameState();
        if (!state?.squad) return console.error('❌ No hay datos');
        
        console.log(`=== SEMANA ${state.week} ===`);
        let found = 0;
        
        state.squad.forEach(p => {
            initializePlayerCards(p);
            if (p.yellowCards > 0 || p.redCards > 0 || p.isInjured || p.isSuspended) {
                console.log(`${p.name}:`, {
                    YC: p.yellowCards,
                    RC: p.redCards,
                    SUS: p.isSuspended,
                    SUSP_WKS: p.suspensionWeeks,
                    INJ: p.isInjured,
                    INJ_WKS: p.weeksOut
                });
                found++;
            }
        });
        
        console.log(found === 0 ? '✅ Sin incidencias' : `Total: ${found}`);
    },
    
    sync: function() {
        const state = window.gameLogic?.getGameState();
        if (state) {
            syncLineupWithSquad(state);
            window.gameLogic.updateGameState(state);
            console.log('✅ Sincronizado');
        }
    }
};

console.log('✅ Sistema cargado (DEFINITIVO con sync)');
