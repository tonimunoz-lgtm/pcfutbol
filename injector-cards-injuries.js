// injector-cards-injuries.js
// VERSIÓN FINAL - Arregla TODOS los problemas

console.log('🎴 Sistema de tarjetas y lesiones (FINAL)...');

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

// Contador GLOBAL de semanas (nunca se resetea)
let globalWeekCounter = 0;
let lastProcessedGlobalWeek = -1;

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
    
    // PREPARADOR FÍSICO: Reduce probabilidad de lesión
    if (staff?.preparadorFisico) {
        const level = staff.preparadorFisico.level || 1;
        // Sin preparador = 100% probabilidad base
        // Nivel 1 = 90% probabilidad
        // Nivel 5 = 50% probabilidad
        const reduction = 1 - (level * 0.1);
        probability *= reduction;
        console.log(`💪 Prep.Físico nivel ${level}: ${(reduction * 100).toFixed(0)}% probabilidad`);
    } else {
        // Sin preparador físico = +50% probabilidad
        probability *= 1.5;
        console.log('⚠️ Sin preparador físico: +50% probabilidad lesión');
    }
    
    // Factores adicionales
    if (player.age > 30) {
        const ageMultiplier = 1 + ((player.age - 30) * 0.02);
        probability *= ageMultiplier;
    }
    
    if (player.form < 60) {
        probability *= 1.3;
    }
    
    if (Math.random() < probability) {
        // Determinar semanas base (1-4)
        let weeks = 1 + Math.floor(Math.random() * 4);
        
        // MÉDICO: Reduce semanas de recuperación
        if (staff?.medico) {
            const level = staff.medico.level || 1;
            // Sin médico = semanas completas
            // Nivel 1 = -10% semanas
            // Nivel 5 = -50% semanas (máximo)
            const reduction = level * 0.1;
            const oldWeeks = weeks;
            weeks = Math.max(1, Math.ceil(weeks * (1 - reduction)));
            console.log(`🏥 Médico nivel ${level}: ${oldWeeks} → ${weeks} semanas (-${(reduction * 100).toFixed(0)}%)`);
        } else {
            console.log('⚠️ Sin médico: semanas sin reducción');
        }
        
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
        // Incrementar contador global
        globalWeekCounter++;
        
        const state = window.gameLogic?.getGameState();
        const isPreseason = globalWeekCounter <= 4;
        
        console.log(`📅 Semana global ${globalWeekCounter} (Semana ${state?.week}), Pretemporada: ${isPreseason}`);
        
        // PRE-SIMULACIÓN
        if (state && globalWeekCounter !== lastProcessedGlobalWeek) {
            const recoveredSuspensions = processWeeklySuspensions(state.squad);
            recoveredSuspensions.forEach(name => {
                const news = `✅ ${name} cumplió su sanción`;
                window.gameLogic.addNews(news, 'info');
                console.log('📰', news);
            });
            
            const recoveredInjuries = processWeeklyRecoveries(state.squad);
            recoveredInjuries.forEach(name => {
                const news = `💚 ${name} se recuperó de su lesión`;
                window.gameLogic.addNews(news, 'success');
                console.log('📰', news);
            });
            
            window.gameLogic.updateGameState(state);
            window.gameLogic.saveToLocalStorage();
        }
        
        // SIMULAR
        await originalSimulate();
        
        // POST-SIMULACIÓN: Solo si NO es pretemporada
        const newState = window.gameLogic?.getGameState();
        
        if (newState && globalWeekCounter !== lastProcessedGlobalWeek && !isPreseason) {
            lastProcessedGlobalWeek = globalWeekCounter;
            
            console.log(`🎴 Generando tarjetas/lesiones`);
            
            const matchCards = [];
            const matchInjuries = [];
            
            // CRÍTICO: Procesar SOLO la alineación actual
            if (!newState.lineup || newState.lineup.length === 0) {
                console.warn('⚠️ No hay alineación guardada');
                return;
            }
            
            console.log(`👥 Procesando alineación:`, newState.lineup.map(p => p?.name).filter(Boolean));
            
            // CRÍTICO: Guardar estado actual de newsFeed
            const newsBeforeProcessing = newState.newsFeed.length;
            
            // Procesar cada jugador de la LINEUP
            newState.lineup.forEach((lineupPlayer, idx) => {
                if (!lineupPlayer) return;
                
                // Buscar el MISMO jugador en squad por nombre
                const squadPlayer = newState.squad.find(sp => sp.name === lineupPlayer.name);
                
                if (!squadPlayer) {
                    console.warn(`⚠️ ${lineupPlayer.name} no encontrado en squad`);
                    return;
                }
                
                // Trabajar SOLO con squadPlayer (fuente de verdad)
                
                // Tarjetas
                const cardResult = simulateMatchCards(squadPlayer);
                if (cardResult) {
                    matchCards.push(cardResult);
                    
                    let newsText;
                    if (cardResult.red) {
                        newsText = `🟥 ${squadPlayer.name} vio tarjeta roja - Sancionado ${cardResult.suspension} partidos`;
                    } else if (cardResult.suspension > 0) {
                        newsText = `⚠️ ${squadPlayer.name} acumula 5 amarillas - Sancionado 1 partido`;
                    } else {
                        newsText = `🟨 ${squadPlayer.name} vio tarjeta amarilla`;
                    }
                    
                    window.gameLogic.addNews(newsText, cardResult.red ? 'error' : 'warning');
                    console.log('📰 TARJETA:', newsText);
                }
                
                // Lesiones
                const injuryResult = simulateMatchInjuries(squadPlayer, newState.staff);
                if (injuryResult) {
                    matchInjuries.push(injuryResult);
                    const newsText = `🏥 ${squadPlayer.name} se lesionó (${injuryResult.type}) - ${injuryResult.weeks} semanas`;
                    window.gameLogic.addNews(newsText, 'warning');
                    console.log('📰 LESIÓN:', newsText);
                }
                
                // CRÍTICO: Copiar cambios a lineup
                lineupPlayer.yellowCards = squadPlayer.yellowCards;
                lineupPlayer.redCards = squadPlayer.redCards;
                lineupPlayer.isSuspended = squadPlayer.isSuspended;
                lineupPlayer.suspensionWeeks = squadPlayer.suspensionWeeks;
                lineupPlayer.isInjured = squadPlayer.isInjured;
                lineupPlayer.weeksOut = squadPlayer.weeksOut;
                lineupPlayer.injuryType = squadPlayer.injuryType;
            });
            
            // Guardar para modal
            window.lastMatchCardsAndInjuries = {
                cards: matchCards,
                injuries: matchInjuries,
                week: newState.week
            };
            
            window.gameLogic.updateGameState(newState);
            window.gameLogic.saveToLocalStorage();
            
            // Verificar que las noticias se guardaron
            const newsAfterProcessing = newState.newsFeed.length;
            const newsAdded = newsAfterProcessing - newsBeforeProcessing;
            console.log(`📰 Noticias añadidas: ${newsAdded} (antes: ${newsBeforeProcessing}, después: ${newsAfterProcessing})`);
            
            // FORZAR ACTUALIZACIÓN DEL FEED
            setTimeout(() => {
                const feed = document.getElementById('newsFeed');
                const currentState = window.gameLogic.getGameState();
                
                if (feed && currentState.newsFeed && currentState.newsFeed.length > 0) {
                    console.log(`🔄 Actualizando feed con ${currentState.newsFeed.length} noticias`);
                    
                    feed.innerHTML = currentState.newsFeed.slice(0, 20).map(n => `
                        <div class="alert ${n.type === 'error' ? 'alert-error' : n.type === 'warning' ? 'alert-warning' : n.type === 'success' ? 'alert-success' : 'alert-info'}" style="font-size: 0.9em; margin-bottom: 5px;">
                            <strong>S${n.week}:</strong> ${n.message}
                        </div>
                    `).join('');
                    console.log('✅ Feed actualizado en DOM');
                } else {
                    console.warn('⚠️ Feed no encontrado o sin noticias');
                }
            }, 800);
            
            console.log(`✅ ${matchCards.length} tarjetas, ${matchInjuries.length} lesiones`);
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
            if (!state || !state.lineup) return originalSaveLineup();
            
            console.log('🔍 Validando alineación...');
            
            // SINCRONIZAR lineup con squad ANTES de validar
            const errors = [];
            
            state.lineup.forEach((lineupPlayer, idx) => {
                if (!lineupPlayer) return;
                
                // Buscar en squad
                const squadPlayer = state.squad.find(sp => sp.name === lineupPlayer.name);
                
                if (squadPlayer) {
                    // Copiar estado actual del squad al lineup
                    lineupPlayer.isInjured = squadPlayer.isInjured;
                    lineupPlayer.weeksOut = squadPlayer.weeksOut;
                    lineupPlayer.injuryType = squadPlayer.injuryType;
                    lineupPlayer.isSuspended = squadPlayer.isSuspended;
                    lineupPlayer.suspensionWeeks = squadPlayer.suspensionWeeks;
                    lineupPlayer.yellowCards = squadPlayer.yellowCards;
                    lineupPlayer.redCards = squadPlayer.redCards;
                    
                    // Validar
                    if (squadPlayer.isInjured) {
                        errors.push(`🏥 ${squadPlayer.name} está lesionado (${squadPlayer.weeksOut} sem)`);
                    }
                    
                    if (squadPlayer.isSuspended) {
                        errors.push(`🚫 ${squadPlayer.name} está sancionado (${squadPlayer.suspensionWeeks} partidos)`);
                    }
                }
            });
            
            if (errors.length > 0) {
                alert(`❌ No puedes guardar esta alineación:\n\n${errors.join('\n')}`);
                console.error('❌ Validación fallida:', errors);
                return false; // BLOQUEAR
            }
            
            console.log('✅ Validación OK');
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
            console.log('🎬 Modal llamado');
            
            originalInject(matchResult);
            
            // Esperar más tiempo para que el DOM se genere completamente
            setTimeout(() => {
                if (window.lastMatchCardsAndInjuries) {
                    const modal = document.getElementById('matchSummaryModal');
                    if (!modal) {
                        console.warn('⚠️ Modal no encontrado');
                        return;
                    }
                    
                    const data = window.lastMatchCardsAndInjuries;
                    console.log('✏️ Reemplazando con datos reales:', data);
                    
                    // Buscar TODAS las secciones de tarjetas y lesiones para eliminarlas
                    const oldCardsSections = modal.querySelectorAll('.cards-section, .injuries-section');
                    oldCardsSections.forEach(section => section.remove());
                    console.log(`🗑️ Eliminadas ${oldCardsSections.length} secciones antiguas`);
                    
                    // Crear nuevas secciones SOLO con datos reales
                    const statsSection = modal.querySelector('.stats-section');
                    if (statsSection) {
                        if (data.cards.length > 0) {
                            const cardsHTML = `
                                <div class="cards-section">
                                    <h3>🟨🟥 Tarjetas (TU EQUIPO)</h3>
                                    <div class="cards-list">
                                        ${data.cards.map(card => `
                                            <div class="card-item home">
                                                <span class="card-icon">${card.red ? '🟥' : '🟨'}</span>
                                                <span class="card-player">${card.player}</span>
                                                ${card.suspension > 0 ? `<span class="card-team">(Sanción: ${card.suspension} partidos)</span>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                            statsSection.insertAdjacentHTML('afterend', cardsHTML);
                            console.log('✅ Tarjetas añadidas:', data.cards.map(c => c.player));
                        }
                        
                        if (data.injuries.length > 0) {
                            const injuriesHTML = `
                                <div class="injuries-section">
                                    <h3>🚑 Lesiones (TU EQUIPO)</h3>
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
                            
                            const lastSection = modal.querySelector('.cards-section') || statsSection;
                            lastSection.insertAdjacentHTML('afterend', injuriesHTML);
                            console.log('✅ Lesiones añadidas:', data.injuries.map(i => i.player));
                        }
                    }
                    
                    delete window.lastMatchCardsAndInjuries;
                    console.log('🗑️ Datos limpiados');
                } else {
                    console.warn('⚠️ No hay datos guardados');
                }
            }, 300); // Aumentado de 100ms a 300ms
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
    rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        
        // El nombre está en la celda 1 (celda 0 es el número)
        const nameCell = cells[1];
        if (!nameCell) return;
        
        const playerName = nameCell.textContent.trim();
        
        // Buscar el jugador en squad por nombre
        const player = state.squad.find(p => p.name === playerName);
        if (!player) {
            console.warn(`⚠️ Plantilla: "${playerName}" no encontrado en squad`);
            return;
        }
        
        initializePlayerCards(player);
        
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
            
            console.log(`✓ ${playerName}: YC=${player.yellowCards}, RC=${player.redCards}, INJ=${player.isInjured}, SUS=${player.isSuspended}`);
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
        window.gameLogic.updateGameState(state);
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
        
        console.log(`=== SEMANA GLOBAL ${globalWeekCounter} (Semana ${state.week}) ===`);
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
    
    resetCounter: function() {
        globalWeekCounter = 0;
        lastProcessedGlobalWeek = -1;
        console.log('🔄 Contador reseteado');
    }
};

console.log('✅ Sistema cargado (FINAL con contador global)');
