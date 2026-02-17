// injector-cards-injuries.js
// Sistema COMPLETO de tarjetas y lesiones - VERSIÓN FUNCIONAL

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
        console.log('🎴 [PRE-SIMULACIÓN] Actualizando sanciones...');
        
        const state = window.gameLogic?.getGameState();
        if (state) {
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
        
        console.log('🎴 [POST-SIMULACIÓN] Generando tarjetas y lesiones...');
        
        const newState = window.gameLogic?.getGameState();
        if (newState && newState.lineup) {
            // Generar tarjetas
            const cards = generateMatchCards(newState.lineup, newState.mentality);
            
            if (cards.yellowCards.length > 0) {
                cards.yellowCards.forEach(name => {
                    window.gameLogic.addNews(`🟨 Tarjeta amarilla para ${name}`, 'warning');
                });
                console.log(`🟨 ${cards.yellowCards.length} amarillas: ${cards.yellowCards.join(', ')}`);
            }
            
            if (cards.redCards.length > 0) {
                cards.redCards.forEach(name => {
                    window.gameLogic.addNews(`🟥 Tarjeta roja para ${name} - Sancionado ${CARDS_CONFIG.RED_CARD_SUSPENSION_WEEKS} partidos`, 'error');
                });
                console.log(`🟥 ${cards.redCards.length} rojas: ${cards.redCards.join(', ')}`);
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
                console.log(`🏥 ${injuries.length} lesiones`);
            }
            
            window.gameLogic.updateGameState(newState);
            window.gameLogic.saveToLocalStorage();
            
            // Forzar actualización de noticias
            const newsFeedElem = document.getElementById('newsFeed');
            if (newsFeedElem && newState.newsFeed) {
                newsFeedElem.innerHTML = newState.newsFeed.slice(0, 10).map(news => `
                    <div class="alert ${news.type === 'error' ? 'alert-error' : news.type === 'warning' ? 'alert-warning' : news.type === 'success' ? 'alert-success' : 'alert-info'}" style="font-size: 0.9em; margin-bottom: 5px;">
                        <strong>Semana ${news.week}:</strong> ${news.message}
                    </div>
                `).join('');
                console.log('✅ Feed de noticias actualizado');
            }
            
            console.log('✅ Tarjetas y lesiones aplicadas correctamente');
        }
    };
}

setTimeout(hookSimulateWeek, 1000);
setTimeout(hookSimulateWeek, 2000);
setTimeout(hookSimulateWeek, 3000);

// ============================================
// VALIDACIÓN DE ALINEACIÓN
// ============================================

const originalSaveLineup = window.saveLineup;
if (originalSaveLineup) {
    window.saveLineup = function() {
        const state = window.gameLogic?.getGameState();
        if (!state) return originalSaveLineup();
        
        // Validar jugadores sancionados
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
    console.log('✅ Validación de sanciones en alineación activada');
}

// ============================================
// MEJORAR UI DE PLANTILLA - AÑADIR COLUMNAS
// ============================================

function enhanceSquadTable() {
    const squadTable = document.querySelector('#squadList table');
    if (!squadTable) return;
    
    const state = window.gameLogic?.getGameState();
    if (!state) return;
    
    // Añadir cabeceras si no existen
    const headerRow = squadTable.querySelector('thead tr');
    if (headerRow) {
        // Buscar columna ESTADO y añadir TARJETAS después
        const headers = Array.from(headerRow.querySelectorAll('th'));
        const estadoIndex = headers.findIndex(h => h.textContent.includes('ESTADO'));
        
        if (estadoIndex !== -1 && !headers.some(h => h.textContent.includes('TARJETAS'))) {
            const tarjetasHeader = document.createElement('th');
            tarjetasHeader.textContent = 'TARJETAS';
            headers[estadoIndex].insertAdjacentElement('afterend', tarjetasHeader);
        }
    }
    
    // Actualizar filas
    const rows = squadTable.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        if (state.squad[index]) {
            const player = state.squad[index];
            initializePlayerCards(player);
            
            const cells = Array.from(row.querySelectorAll('td'));
            
            // Actualizar columna ESTADO
            const estadoIndex = cells.findIndex(c => c.textContent.includes('Apto') || c.textContent.includes('Les'));
            if (estadoIndex !== -1) {
                const estadoCell = cells[estadoIndex];
                
                if (player.cards.isSuspended) {
                    const type = player.cards.red > 0 ? 'Roja' : '5 amarillas';
                    estadoCell.innerHTML = `<span style="color: #ff9800;">🚫 Sancionado (${type}, ${player.cards.suspensionWeeks} partidos)</span>`;
                } else if (player.isInjured) {
                    estadoCell.innerHTML = `<span style="color: #ff3333;">🏥 Les. (${player.weeksOut} sem)</span>`;
                } else {
                    estadoCell.innerHTML = '<span style="color: #4CAF50;">✅ Apto</span>';
                }
                
                // Añadir o actualizar columna de tarjetas
                let tarjetasCell = cells[estadoIndex + 1];
                if (!tarjetasCell || tarjetasCell.querySelector('button, a')) {
                    // Si la siguiente celda tiene botones, crear nueva
                    tarjetasCell = document.createElement('td');
                    tarjetasCell.style.textAlign = 'center';
                    estadoCell.insertAdjacentElement('afterend', tarjetasCell);
                }
                
                // Mostrar tarjetas
                const tarjetasHTML = [];
                if (player.cards.yellow > 0) {
                    tarjetasHTML.push(`<span style="font-size: 1.2em;" title="${player.cards.yellow} amarillas">🟨 ×${player.cards.yellow}</span>`);
                }
                if (player.cards.red > 0) {
                    tarjetasHTML.push(`<span style="font-size: 1.2em;" title="${player.cards.red} rojas">🟥 ×${player.cards.red}</span>`);
                }
                
                tarjetasCell.innerHTML = tarjetasHTML.length > 0 ? tarjetasHTML.join(' ') : '-';
            }
        }
    });
}

// Observer para actualizar cuando cambie la tabla
const observer = new MutationObserver(() => {
    if (document.querySelector('#squadList table')) {
        setTimeout(enhanceSquadTable, 100);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Actualizar cuando se abra plantilla
document.addEventListener('click', (e) => {
    if (e.target.textContent?.includes('Plantilla')) {
        setTimeout(enhanceSquadTable, 500);
    }
});

// ============================================
// INICIALIZAR AL CARGAR
// ============================================

setTimeout(() => {
    const state = window.gameLogic?.getGameState();
    if (state?.squad) {
        state.squad.forEach(initializePlayerCards);
        state.academy?.forEach(initializePlayerCards);
        window.gameLogic.updateGameState(state);
        console.log('✅ Sistema inicializado en ' + state.squad.length + ' jugadores');
    }
}, 2000);

// ============================================
// EXPONER GLOBALMENTE
// ============================================

window.CardsInjuriesSystem = {
    initializePlayerCards,
    generateMatchCards,
    updateWeeklySuspensions,
    generateInjuries,
    canPlayerPlay,
    CARDS_CONFIG,
    INJURY_CONFIG
};

console.log('✅ Sistema de tarjetas y lesiones cargado');
