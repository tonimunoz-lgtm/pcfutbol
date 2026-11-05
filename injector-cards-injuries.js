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

// Match cards, injuries and serving bans are handled by match-engine.js and gameLogic.js.

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
        const pre = window.gameLogic?.getViewState();
        if (pre && pre.seasonType !== 'preseason' && typeof window.gameLogic.autoFixLineup === 'function' && (pre.seasonType==='playoff'||pre.seasonCalendar?.some(m=>m.week===pre.week&&(m.home===pre.team||m.away===pre.team)))) {
            window.gameLogic.autoFixLineup();
        }
        const state = window.gameLogic?.getViewState();
        
        // VALIDACIÓN ANTES DE SIMULAR (en pretemporada no hay partido oficial)
        if (state && state.lineup && state.seasonType !== 'preseason' && (state.seasonType==='playoff'||state.seasonCalendar?.some(m=>m.week===state.week&&(m.home===state.team||m.away===state.team)))) {
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
        
        return await originalSimulate.apply(this, arguments);
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
            const state = window.gameLogic?.getViewState();
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
// UI PLANTILLA
// ============================================

function enhanceSquadTable() {
    const table = document.querySelector('#squadList table');
    if (!table) return;
    
    const state = window.gameLogic?.getViewState();
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
    const state = window.gameLogic?.getViewState();
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
        const state = window.gameLogic?.getViewState();
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
                var st = window.gameLogic && window.gameLogic.getViewState();
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
                var st = window.gameLogic && window.gameLogic.getViewState();
            } catch(e) {}
            return originalDrop.call(this, ev, targetSlotId);
        };
    }

    var originalRender = window.renderLineupPageUI;
    if (originalRender) {
        window.renderLineupPageUI = function() {
            originalRender.call(this);
            setTimeout(function() {
                var st = window.gameLogic && window.gameLogic.getViewState();
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
