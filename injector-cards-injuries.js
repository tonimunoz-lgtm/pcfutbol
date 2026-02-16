// injector-cards-injuries.js
// 🎯 INJECTOR COMPLETO: Integra el sistema de tarjetas y lesiones en el juego

(function() {
    'use strict';
    
    console.log('⚽ Injector Tarjetas y Lesiones: Iniciando...');

    // ===========================================
    // ESPERAR A QUE TODO ESTÉ CARGADO
    // ===========================================
    
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.gameLogic && 
                    window.CardsInjuriesSystem &&
                    window.renderSquadList) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    // ===========================================
    // HOOK: SIMULACIÓN DE PARTIDOS
    // ===========================================
    
    function hookMatchSimulation() {
        if (!window.gameLogic || !window.gameLogic.simulateMatch) {
            console.warn('⚠️ simulateMatch no encontrado');
            return;
        }

        const originalSimulateMatch = window.gameLogic.simulateMatch;
        
        window.gameLogic.simulateMatch = function(...args) {
            // Llamar a la simulación original
            const result = originalSimulateMatch.apply(this, args);
            
            // Obtener estado del juego
            const gameState = window.gameLogic.getGameState();
            const lineup = gameState.lineup || [];
            
            // Arrays para almacenar resultados
            const matchCards = [];
            const matchInjuries = [];
            
            // Simular tarjetas y lesiones para cada jugador en la alineación
            lineup.forEach(player => {
                if (!player) return;
                
                // 1. Simular tarjetas
                const cardResult = window.CardsInjuriesSystem.simulateCards(player, 1.0);
                if (cardResult && (cardResult.yellow || cardResult.red)) {
                    matchCards.push({
                        player: player.name,
                        yellow: cardResult.yellow,
                        red: cardResult.red,
                        suspension: cardResult.suspension
                    });
                    
                    // Notificar tarjetas importantes
                    if (cardResult.red && window.gameLogic.addNews) {
                        window.gameLogic.addNews(
                            `🟥 ${player.name} ha visto la tarjeta ROJA${cardResult.suspension > 0 ? ` (${cardResult.suspension} partido${cardResult.suspension > 1 ? 's' : ''} de sanción)` : ''}`,
                            'error'
                        );
                    } else if (cardResult.yellow && cardResult.suspension > 0 && window.gameLogic.addNews) {
                        window.gameLogic.addNews(
                            `🟨 ${player.name} vio amarilla y queda SANCIONADO ${cardResult.suspension} partido${cardResult.suspension > 1 ? 's' : ''} por acumulación`,
                            'warning'
                        );
                    }
                }
                
                // 2. Simular lesiones
                const injuryResult = window.CardsInjuriesSystem.simulateInjuries(player, gameState);
                if (injuryResult) {
                    matchInjuries.push(injuryResult);
                    
                    // Notificar lesión
                    if (window.gameLogic.addNews) {
                        window.gameLogic.addNews(
                            `${injuryResult.icon} ${player.name} se ha lesionado: ${injuryResult.type} (${injuryResult.weeks} semana${injuryResult.weeks > 1 ? 's' : ''})`,
                            'error'
                        );
                    }
                }
                
                // 3. Actualizar minutos jugados (para fatiga)
                player.minutesPlayed = (player.minutesPlayed || 0) + 90;
            });
            
            // Agregar datos al resultado del partido
            if (result && (matchCards.length > 0 || matchInjuries.length > 0)) {
                result.cardsAndInjuries = {
                    cards: matchCards,
                    injuries: matchInjuries
                };
            }
            
            return result;
        };
        
        console.log('✅ Hook de simulateMatch instalado');
    }

    // ===========================================
    // HOOK: SIMULACIÓN SEMANAL
    // ===========================================
    
    function hookWeeklySimulation() {
        if (!window.gameLogic || !window.gameLogic.simulateFullWeek) {
            console.warn('⚠️ simulateFullWeek no encontrado');
            return;
        }

        const originalSimulateFullWeek = window.gameLogic.simulateFullWeek;
        
        window.gameLogic.simulateFullWeek = async function(...args) {
            // Obtener estado actual
            const gameState = window.gameLogic.getGameState();
            
            // Procesar sanciones ANTES de simular la semana
            if (gameState.squad) {
                window.CardsInjuriesSystem.processWeeklySuspensions(
                    gameState.squad, 
                    gameState.week
                );
            }
            
            // Llamar a la simulación original
            const result = await originalSimulateFullWeek.apply(this, args);
            
            // Procesar recuperaciones DESPUÉS de simular
            const updatedState = window.gameLogic.getGameState();
            if (updatedState.squad) {
                window.CardsInjuriesSystem.processWeeklyRecoveries(
                    updatedState.squad,
                    updatedState
                );
                
                // Resetear minutos jugados semanalmente
                window.CardsInjuriesSystem.resetWeeklyMinutes(updatedState.squad);
            }
            
            return result;
        };
        
        console.log('✅ Hook de simulateFullWeek instalado');
    }

    // ===========================================
    // HOOK: RENDERIZADO DE PLANTILLA
    // ===========================================
    
    function hookSquadRendering() {
        if (!window.renderSquadList) {
            console.warn('⚠️ renderSquadList no encontrado');
            return;
        }

        const originalRenderSquadList = window.renderSquadList;
        
        window.renderSquadList = function(squad, currentTeam) {
            // Guardar referencia temporal
            const tempRenderSquadList = window.renderSquadList;
            window.renderSquadList = originalRenderSquadList;
            
            // Llamar al original
            const result = originalRenderSquadList.call(this, squad, currentTeam);
            
            // Restaurar el hook
            window.renderSquadList = tempRenderSquadList;
            
            // Ahora modificar el HTML generado para agregar tarjetas
            const list = document.getElementById('squadList');
            if (!list) return result;
            
            const table = list.querySelector('table tbody');
            if (!table) return result;
            
            const rows = table.querySelectorAll('tr');
            const sorted = squad.sort((a, b) => b.overall - a.overall);
            
            rows.forEach((row, index) => {
                const player = sorted[index];
                if (!player) return;
                
                // Encontrar la celda de ESTADO (índice 15 en tu tabla)
                const statusCell = row.cells[15];
                if (!statusCell) return;
                
                // Generar HTML completo del estado
                let statusHTML = [];
                
                // Lesión
                if (player.isInjured && player.weeksOut > 0) {
                    const weeks = Math.ceil(player.weeksOut);
                    const severity = player.injurySeverity || 'moderada';
                    const icon = {
                        leve: '🟡',
                        moderada: '🟠',
                        grave: '🔴',
                        muy_grave: '⚫'
                    }[severity] || '🟠';
                    
                    statusHTML.push(
                        `<span class="injured-badge">${icon} ${player.injuryType || 'Lesión'} (${weeks} sem)</span>`
                    );
                }
                
                // Sanción
                if (player.isSuspended && player.suspensionWeeks > 0) {
                    statusHTML.push(
                        `<span class="suspended-badge">⛔ SANCIÓN (${player.suspensionWeeks} partido${player.suspensionWeeks > 1 ? 's' : ''})</span>`
                    );
                }
                
                // Tarjetas amarillas
                if (player.yellowCards > 0) {
                    const warning = player.yellowCards >= 4 ? ' ⚠️' : '';
                    const badgeClass = player.yellowCards >= 4 ? 'warning-badge' : 'yellow-card-badge';
                    statusHTML.push(
                        `<span class="${badgeClass}">🟨 ${player.yellowCards}${warning}</span>`
                    );
                }
                
                // Tarjetas rojas
                if (player.redCards > 0) {
                    statusHTML.push(
                        `<span class="red-card-badge">🟥 ${player.redCards}</span>`
                    );
                }
                
                // Actualizar la celda
                if (statusHTML.length > 0) {
                    statusCell.innerHTML = `<div class="player-status-indicator">${statusHTML.join(' ')}</div>`;
                } else {
                    statusCell.innerHTML = '<span style="color: #4CAF50;">✅ Apto</span>';
                }
                
                // Aplicar clases CSS a la fila completa
                if (player.isInjured) row.classList.add('player-injured-row');
                if (player.isSuspended) row.classList.add('player-suspended-row');
            });
            
            return result;
        };
        
        console.log('✅ Hook de renderSquadList instalado');
    }

    // ===========================================
    // HOOK: RENDERIZADO DE ALINEACIÓN
    // ===========================================
    
    function hookLineupRendering() {
        // Este se ejecuta en cada render, así que usar MutationObserver
        const pitchContainer = document.getElementById('pitchContainer');
        const reservesList = document.getElementById('reservesList');
        
        if (!pitchContainer || !reservesList) {
            console.warn('⚠️ Elementos de alineación no encontrados');
            return;
        }
        
        const observer = new MutationObserver(() => {
            // Actualizar jugadores en el campo
            const pitchPlayers = pitchContainer.querySelectorAll('.pitch-player');
            pitchPlayers.forEach(playerDiv => {
                const playerName = playerDiv.dataset.playername;
                if (!playerName) return;
                
                const gameState = window.gameLogic?.getGameState();
                if (!gameState || !gameState.lineup) return;
                
                const player = gameState.lineup.find(p => p && p.name === playerName);
                if (!player) return;
                
                // Aplicar clases
                if (player.isInjured) playerDiv.classList.add('injured');
                if (player.isSuspended) playerDiv.classList.add('suspended');
                
                // Agregar badges si no existen
                if (!playerDiv.querySelector('.player-status-indicator')) {
                    const badges = window.CardsInjuriesSystem.renderStatusBadges(player);
                    if (badges) {
                        const span = playerDiv.querySelector('span:first-child');
                        if (span) {
                            span.innerHTML += badges;
                        }
                    }
                }
            });
            
            // Actualizar jugadores en reservas
            const reservePlayers = reservesList.querySelectorAll('.draggable-player');
            reservePlayers.forEach(playerDiv => {
                const playerName = playerDiv.dataset.playername;
                if (!playerName) return;
                
                const gameState = window.gameLogic?.getGameState();
                if (!gameState || !gameState.squad) return;
                
                const player = gameState.squad.find(p => p && p.name === playerName);
                if (!player) return;
                
                // Aplicar clases
                if (player.isInjured) playerDiv.classList.add('injured');
                if (player.isSuspended) playerDiv.classList.add('suspended');
            });
        });
        
        observer.observe(pitchContainer, { childList: true, subtree: true });
        observer.observe(reservesList, { childList: true, subtree: true });
        
        console.log('✅ Observer de alineación instalado');
    }

    // ===========================================
    // HOOK: VALIDACIÓN DE ALINEACIÓN
    // ===========================================
    
    function hookLineupValidation() {
        if (!window.gameLogic || !window.gameLogic.validateLineup) {
            console.warn('⚠️ validateLineup no encontrado');
            return;
        }

        const originalValidateLineup = window.gameLogic.validateLineup;
        
        window.gameLogic.validateLineup = function(lineup) {
            // Llamar a la validación original
            const result = originalValidateLineup.call(this, lineup);
            
            if (!result.success) return result;
            
            // Validación adicional: jugadores sancionados
            const suspendedPlayers = lineup.filter(p => 
                p && p.isSuspended && p.suspensionWeeks > 0
            );
            
            if (suspendedPlayers.length > 0) {
                return {
                    success: false,
                    message: `No puedes alinear jugadores sancionados: ${suspendedPlayers.map(p => p.name).join(', ')}`
                };
            }
            
            return result;
        };
        
        console.log('✅ Hook de validateLineup instalado');
    }

    // ===========================================
    // INICIALIZACIÓN DE JUGADORES
    // ===========================================
    
    function initializeExistingPlayers() {
        const gameState = window.gameLogic?.getGameState();
        if (!gameState) return;
        
        if (gameState.squad) {
            window.CardsInjuriesSystem.initializeCards(gameState.squad);
            window.CardsInjuriesSystem.initializeInjuries(gameState.squad);
        }
        
        if (gameState.academy) {
            window.CardsInjuriesSystem.initializeCards(gameState.academy);
            window.CardsInjuriesSystem.initializeInjuries(gameState.academy);
        }
        
        console.log('✅ Jugadores existentes inicializados');
    }

    // ===========================================
    // INICIALIZACIÓN PRINCIPAL
    // ===========================================
    
    async function init() {
        console.log('⏳ Esperando dependencias...');
        await waitForDependencies();
        console.log('✅ Dependencias cargadas');
        
        // Instalar todos los hooks
        hookMatchSimulation();
        hookWeeklySimulation();
        hookSquadRendering();
        hookLineupRendering();
        hookLineupValidation();
        
        // Inicializar jugadores existentes
        initializeExistingPlayers();
        
        console.log('✅ Injector de Tarjetas y Lesiones: Completamente cargado');
        
        // Exponer función de reinicialización (útil al cargar partida)
        window.reinitializeCardsInjuries = function() {
            initializeExistingPlayers();
            console.log('✅ Sistema de tarjetas/lesiones reinicializado');
        };
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
