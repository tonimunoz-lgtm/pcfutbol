// injector-cards-injuries.js

// CSS para sancionados (sin tocar style.css)
(function(){
    var s = document.createElement('style');
    s.textContent = '.pitch-player.suspended{background:#7A4A00!important;border-color:#FF9800!important;cursor:not-allowed!important;opacity:0.8!important}.draggable-player.suspended{background:#7A4A00!important;border-color:#FF9800!important;cursor:not-allowed!important;opacity:0.8!important}';
    document.head.appendChild(s);
})();
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
    BASE_PROBABILITY: 0.018,
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
    
    // ENTRENADOR FÍSICO (rol 'entrenador'): -8 % de riesgo por nivel; sin él, +20 %
    const physical = staff?.entrenador || staff?.preparadorFisico;
    if (physical) {
        probability *= 1 - (physical.level || 1) * 0.08;
    } else {
        probability *= 1.2;
    }
    // FISIOTERAPEUTA: prevención, -5 % de riesgo por nivel
    if (staff?.fisio) {
        probability *= 1 - (staff.fisio.level || 1) * 0.05;
    }
    
    // Edad: solo penaliza a partir de 32
    if (player.age > 32) {
        const ageMultiplier = 1 + ((player.age - 32) * 0.025);
        probability *= ageMultiplier;
    }
    
    // Baja forma
    if (player.form < 60) {
        probability *= 1.2;
    }
    
    if (Math.random() < probability) {
        // 95% lesión leve (1-3 semanas), 5% lesión grave (4-8 semanas)
        let weeks;
        if (Math.random() < 0.05) {
            weeks = 4 + Math.floor(Math.random() * 5); // grave: 4-8 semanas
        } else {
            weeks = 1 + Math.floor(Math.random() * 3); // leve: 1-3 semanas
        }
        
        // MÉDICO: Reduce semanas de recuperación
        if (staff?.medico) {
            const level = staff.medico.level || 1;
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
                
                // Siempre resetear los contadores al cumplir la sanción
                player.yellowCards = 0;
                player.redCards = 0;
                
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
    console.log('✅ Hook aplicado con validación integrada');
    
    window.simulateWeek = async function() {
        // El segundo entrenador cubre bajas (lesión, sanción, venta...) antes de validar
        const pre = window.gameLogic?.getGameState();
        if (pre && pre.seasonType !== 'preseason' && typeof window.gameLogic.autoFixLineup === 'function') {
            window.gameLogic.autoFixLineup();
        }
        const state = window.gameLogic?.getGameState();
        
        // VALIDACIÓN ANTES DE SIMULAR (en pretemporada no hay partido oficial)
        if (state && state.lineup && state.seasonType !== 'preseason') {
            console.log('🔍 Validando alineación antes de simular...');
            
            const errors = [];
            
            // PRIMERO: Sincronizar lineup con squad para tener datos actualizados
            state.lineup.forEach((lineupPlayer) => {
                if (!lineupPlayer) return;
                
                const squadPlayer = state.squad.find(sp => sp.name === lineupPlayer.name);
                
                if (squadPlayer) {
                    initializePlayerCards(squadPlayer);
                    
                    lineupPlayer.isInjured = squadPlayer.isInjured || false;
                    lineupPlayer.weeksOut = squadPlayer.weeksOut || 0;
                    lineupPlayer.injuryType = squadPlayer.injuryType || null;
                    lineupPlayer.isSuspended = squadPlayer.isSuspended || false;
                    lineupPlayer.suspensionWeeks = squadPlayer.suspensionWeeks || 0;
                    lineupPlayer.yellowCards = squadPlayer.yellowCards || 0;
                    lineupPlayer.redCards = squadPlayer.redCards || 0;
                }
            });
            
            window.gameLogic.updateGameState(state);
            
            const validPlayers = state.lineup.filter(p => p !== null && p !== undefined);
            
            if (validPlayers.length !== 11) {
                errors.push(`⚠️ Necesitas exactamente 11 jugadores (tienes ${validPlayers.length})`);
            }
            
            const goalkeepers = validPlayers.filter(p => p.position === 'POR');
            
            if (goalkeepers.length === 0) {
                errors.push(`🧤 Falta el portero en la alineación`);
            } else if (goalkeepers.length > 1) {
                errors.push(`🧤 Solo puede haber 1 portero (tienes ${goalkeepers.length})`);
            }
            
            state.lineup.forEach((lineupPlayer) => {
                if (!lineupPlayer) return;
                
                const squadPlayer = state.squad.find(sp => sp.name === lineupPlayer.name);
                
                if (squadPlayer) {
                    console.log(`Validando ${squadPlayer.name}: isInjured=${squadPlayer.isInjured}, isSuspended=${squadPlayer.isSuspended}, YC=${squadPlayer.yellowCards}`);
                    
                    if (squadPlayer.isInjured) {
                        errors.push(`🏥 ${squadPlayer.name} está lesionado (${squadPlayer.weeksOut} semanas)`);
                    }
                    
                    if (squadPlayer.isSuspended) {
                        errors.push(`🚫 ${squadPlayer.name} está sancionado (${squadPlayer.suspensionWeeks} partidos)`);
                    }
                }
            });
            
            if (errors.length > 0) {
                alert(`❌ No puedes jugar con esta alineación:\n\n${errors.join('\n')}\n\n🔄 Por favor, corrige la alineación antes de continuar.`);
                console.error('❌ Validación de alineación fallida:', errors);
                
                const lineupButton = document.querySelector('.menu-item[onclick*="lineup"]');
                if (lineupButton && window.switchPage) {
                    window.switchPage('lineup', lineupButton);
                }
                
                return;
            }
            
            console.log('✅ Alineación válida, continuando con simulación...');
        }
        
        const previousGlobalWeek = globalWeekCounter;
        globalWeekCounter++;
        
        const isPreseason = state?.seasonType === 'preseason';
        
        console.log(`📅 Semana global ${globalWeekCounter} (anterior: ${previousGlobalWeek}, last processed: ${lastProcessedGlobalWeek}), Semana ${state?.week}, Pretemporada: ${isPreseason}`);
        
        // Las sanciones solo se cumplen en partidos oficiales
        if (state && !isPreseason && globalWeekCounter !== lastProcessedGlobalWeek) {
            console.log(`🔄 Procesando sanciones para semana global ${globalWeekCounter}`);
            
            const recoveredSuspensions = processWeeklySuspensions(state.squad);
            recoveredSuspensions.forEach(name => {
                const news = `✅ ${name} cumplió su sanción y vuelve a estar disponible`;
                window.gameLogic.addNews(news, 'info');
                console.log('📰', news);
            });
            
            lastProcessedGlobalWeek = globalWeekCounter;
            console.log(`✅ Semana ${globalWeekCounter} marcada como procesada`);
            
            window.gameLogic.updateGameState(state);
        } else {
            console.log(`⏭️ Saltando sanciones - ya procesadas para semana global ${globalWeekCounter}`);
        }
        
        await originalSimulate();
        
        const newState = window.gameLogic?.getGameState();
        
        if (newState && !isPreseason && globalWeekCounter === lastProcessedGlobalWeek) {
            console.log(`🎴 Generando tarjetas/lesiones para semana ${globalWeekCounter}`);
            
            const matchCards = [];
            const matchInjuries = [];
            
            if (!newState.lineup || newState.lineup.length === 0) {
                console.warn('⚠️ No hay alineación guardada');
                return;
            }
            
            console.log(`👥 Procesando alineación:`, newState.lineup.map(p => p?.name).filter(Boolean));
            
            const newsBeforeProcessing = newState.newsFeed.length;
            
            newState.lineup.forEach((lineupPlayer, idx) => {
                if (!lineupPlayer) return;
                
                const squadPlayer = newState.squad.find(sp => sp.name === lineupPlayer.name);
                
                if (!squadPlayer) {
                    console.warn(`⚠️ ${lineupPlayer.name} no encontrado en squad`);
                    return;
                }
                
                const cardResult = simulateMatchCards(squadPlayer);
                if (cardResult) {
                    cardResult.minute = Math.floor(Math.random() * 90) + 1;
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
                
                const injuryResult = simulateMatchInjuries(squadPlayer, newState.staff);
                if (injuryResult) {
                    injuryResult.minute = Math.floor(Math.random() * 90) + 1;
                    matchInjuries.push(injuryResult);
                    const newsText = `🏥 ${squadPlayer.name} se lesionó (${injuryResult.type}) - ${injuryResult.weeks} semanas`;
                    
                    window.gameLogic.addNews(newsText, 'warning');
                    console.log('📰 LESIÓN:', newsText);
                }
                
                lineupPlayer.yellowCards = squadPlayer.yellowCards;
                lineupPlayer.redCards = squadPlayer.redCards;
                lineupPlayer.isSuspended = squadPlayer.isSuspended;
                lineupPlayer.suspensionWeeks = squadPlayer.suspensionWeeks;
                lineupPlayer.isInjured = squadPlayer.isInjured;
                lineupPlayer.weeksOut = squadPlayer.weeksOut;
                lineupPlayer.injuryType = squadPlayer.injuryType;
            });
            
            window.lastMatchCardsAndInjuries = {
                cards: matchCards,
                injuries: matchInjuries,
                week: newState.week
            };
            
            window.gameLogic.updateGameState(newState);
            
            // AUTO-GUARDAR en Firebase después de cada jornada
            if (window.saveGameToCloud && window.currentUserId) {
                console.log('💾 Auto-guardando en Firebase...');
                
                function cleanForFirebase(obj) {
                    if (obj === null || obj === undefined) return null;
                    if (Array.isArray(obj)) return obj.map(cleanForFirebase);
                    if (typeof obj === 'object') {
                        const clean = {};
                        for (const k in obj) {
                            const v = obj[k];
                            if (v !== undefined) {
                                clean[k] = cleanForFirebase(v);
                            }
                        }
                        return clean;
                    }
                    return obj;
                }
                const cleanState = cleanForFirebase(newState);
                const gameId = cleanState.gameId || `autosave_${cleanState.team}`;
                if (!newState.gameId) {
                    newState.gameId = gameId;
                }
                
                const gameName = `[Auto] ${newState.team} - Jornada ${newState.week}`;
                
                window.saveGameToCloud(window.currentUserId, gameId, gameName, cleanState).then(result => {
                    if (result.success) {
                        console.log('✅ Partida auto-guardada en Firebase');
                    } else {
                        console.warn('⚠️ Error al auto-guardar:', result.error);
                    }
                }).catch(err => {
                    console.error('❌ Error en auto-guardado:', err);
                });
            } else {
                console.warn('⚠️ Auto-guardado no disponible - saveGameToCloud o currentUserId no encontrado');
            }
            
            const newsAfterProcessing = newState.newsFeed.length;
            const newsAdded = newsAfterProcessing - newsBeforeProcessing;
            console.log(`📰 Noticias añadidas: ${newsAdded} (antes: ${newsBeforeProcessing}, después: ${newsAfterProcessing})`);
            
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
            
            const errors = [];
            
            const validPlayers = state.lineup.filter(p => p !== null && p !== undefined);
            
            if (validPlayers.length !== 11) {
                errors.push(`⚠️ Necesitas exactamente 11 jugadores (tienes ${validPlayers.length})`);
            }
            
            const goalkeepers = validPlayers.filter(p => p.position === 'POR');
            
            if (goalkeepers.length === 0) {
                errors.push(`🧤 Falta el portero en la alineación`);
            } else if (goalkeepers.length > 1) {
                errors.push(`🧤 Solo puede haber 1 portero (tienes ${goalkeepers.length})`);
            }
            
            state.lineup.forEach((lineupPlayer, idx) => {
                if (!lineupPlayer) return;
                
                const squadPlayer = state.squad.find(sp => sp.name === lineupPlayer.name);
                
                if (squadPlayer) {
                    initializePlayerCards(squadPlayer);
                    
                    lineupPlayer.isInjured = squadPlayer.isInjured || false;
                    lineupPlayer.weeksOut = squadPlayer.weeksOut || 0;
                    lineupPlayer.injuryType = squadPlayer.injuryType || null;
                    lineupPlayer.isSuspended = squadPlayer.isSuspended || false;
                    lineupPlayer.suspensionWeeks = squadPlayer.suspensionWeeks || 0;
                    lineupPlayer.yellowCards = squadPlayer.yellowCards || 0;
                    lineupPlayer.redCards = squadPlayer.redCards || 0;
                    
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
                return false;
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
            
            setTimeout(() => {
                if (window.lastMatchCardsAndInjuries) {
                    const modal = document.getElementById('matchSummaryModal');
                    if (!modal) {
                        console.warn('⚠️ Modal no encontrado');
                        return;
                    }
                    
                    const data = window.lastMatchCardsAndInjuries;
                    console.log('✏️ Reemplazando con datos reales:', data);
                    
                    const oldCardsSections = modal.querySelectorAll('.cards-section, .injuries-section');
                    oldCardsSections.forEach(section => section.remove());
                    console.log(`🗑️ Eliminadas ${oldCardsSections.length} secciones antiguas`);
                    
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
                                                <span class="card-minute">${card.minute || '?'}'</span>
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
                                                <span class="injury-minute">${inj.minute || '?'}'</span>
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
            }, 300);
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
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        
        const nameCell = cells[1];
        if (!nameCell) return;
        
        const playerName = nameCell.textContent.trim();
        
        const player = state.squad.find(p => p.name === playerName);
        if (!player) {
            console.warn(`⚠️ Plantilla: "${playerName}" no encontrado en squad`);
            return;
        }
        
        initializePlayerCards(player);
        
        let estadoCell = cells.find(c => c.textContent.includes('Apto') || c.textContent.includes('Les.'));
        
        if (estadoCell) {
            const cellIndex = cells.indexOf(estadoCell);
            
            if (player.isSuspended) {
                estadoCell.innerHTML = `<span style="color:#FF9800;">🚫 Sancionado (${player.suspensionWeeks})</span>`;
            } else if (player.isInjured) {
                estadoCell.innerHTML = `<span style="color:#f33;">🏥 Les. (${player.weeksOut} sem)</span>`;
            } else {
                estadoCell.innerHTML = '<span style="color:#4CAF50;">✅ Apto</span>';
            }
            
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

// ============================================
// HOOK ALINEACION: BLOQUEAR SANCIONADOS
// ============================================

setTimeout(function() {

    var originalDrag = window.drag;
    if (originalDrag) {
        window.drag = function(ev, playerJson) {
            try {
                var player = JSON.parse(decodeURIComponent(playerJson));
                var st = window.gameLogic && window.gameLogic.getGameState();
                var sp = st && st.squad && st.squad.find(function(p) { return p.name === player.name; });
                if (sp && sp.isSuspended) {
                    ev.preventDefault();
                    alert(player.name + ' está sancionado (' + (sp.suspensionWeeks || 0) + ' jornada/s) y no puede ser alineado.');
                    return;
                }
            } catch(e) {}
            return originalDrag.call(this, ev, playerJson);
        };
        console.log('✅ Hook drag() sancionados aplicado');
    }

    var originalDrop = window.drop;
    if (originalDrop) {
        window.drop = function(ev, targetSlotId) {
            try {
                var st = window.gameLogic && window.gameLogic.getGameState();
            } catch(e) {}
            return originalDrop.call(this, ev, targetSlotId);
        };
    }

    var originalRender = window.renderLineupPageUI;
    if (originalRender) {
        window.renderLineupPageUI = function() {
            originalRender.call(this);
            setTimeout(function() {
                var st = window.gameLogic && window.gameLogic.getGameState();
                if (!st || !st.squad) return;

                var pitchPlayers = document.querySelectorAll('.pitch-player');
                pitchPlayers.forEach(function(div) {
                    var name = div.dataset && div.dataset.playername;
                    if (!name) {
                        var span = div.querySelector('span');
                        name = span ? span.textContent.trim() : null;
                    }
                    if (!name) return;
                    var p = st.squad.find(function(s) { return s.name === name; });
                    if (p && p.isSuspended) {
                        div.classList.add('suspended');
                        div.style.background = '#7A4A00';
                        div.style.borderColor = '#FF9800';
                        div.style.cursor = 'not-allowed';
                        div.style.opacity = '0.8';
                    }
                });

                var reservePlayers = document.querySelectorAll('.draggable-player');
                reservePlayers.forEach(function(div) {
                    var name = div.dataset && div.dataset.playername;
                    if (!name) {
                        name = div.textContent ? div.textContent.split('(')[0].trim() : null;
                    }
                    if (!name) return;
                    var p = st.squad.find(function(s) { return s.name === name; });
                    if (p && p.isSuspended) {
                        div.classList.add('suspended');
                        div.style.background = '#7A4A00';
                        div.style.borderColor = '#FF9800';
                        div.style.cursor = 'not-allowed';
                        div.style.opacity = '0.8';
                    }
                });

            }, 50);
        };
        console.log('✅ Hook renderLineupPageUI() sancionados aplicado');
    }

}, 3000);

console.log('✅ Sistema cargado (FINAL con contador global)');
