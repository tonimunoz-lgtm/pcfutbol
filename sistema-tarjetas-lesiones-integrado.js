// ==================================================
// SISTEMA COMPLETO DE TARJETAS Y LESIONES - TODO EN UNO
// ==================================================
// Este archivo se debe pegar AL FINAL de gameLogic.js
// O cargar como script independiente ANTES de ui.js

(function() {
    'use strict';
    
    console.log('⚽ Sistema Integrado Tarjetas/Lesiones: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN
    // ===========================================
    
    const CARDS_CONFIG = {
        PROBABILITIES: {
            POR: { yellow: 0.05, red: 0.001 },
            DFC: { yellow: 0.25, red: 0.020 },
            LI:  { yellow: 0.20, red: 0.015 },
            LD:  { yellow: 0.20, red: 0.015 },
            MC:  { yellow: 0.15, red: 0.010 },
            MCO: { yellow: 0.12, red: 0.008 },
            MD:  { yellow: 0.12, red: 0.008 },
            MI:  { yellow: 0.12, red: 0.008 },
            EXT: { yellow: 0.10, red: 0.005 },
            DC:  { yellow: 0.15, red: 0.010 }
        },
        YELLOW_RESET_WEEK: 19
    };

    const INJURIES_CONFIG = {
        BASE_PROBABILITY: 0.008,
        SEVERITY: {
            leve: { prob: 0.60, weeks: { min: 1, max: 2 }, label: 'Leve', icon: '🟡' },
            moderada: { prob: 0.30, weeks: { min: 3, max: 6 }, label: 'Moderada', icon: '🟠' },
            grave: { prob: 0.09, weeks: { min: 7, max: 16 }, label: 'Grave', icon: '🔴' },
            muy_grave: { prob: 0.01, weeks: { min: 17, max: 30 }, label: 'Muy Grave', icon: '⚫' }
        },
        TYPES: [
            'Esguince de tobillo', 'Rotura de ligamentos', 'Lesión muscular',
            'Fractura de peroné', 'Rotura de menisco', 'Distensión en isquiotibiales',
            'Lesión en rodilla', 'Tendinitis', 'Contusión', 'Fractura de clavícula'
        ]
    };

    // ===========================================
    // FUNCIONES CORE
    // ===========================================
    
    function initializePlayer(player) {
        if (!player) return;
        player.yellowCards = player.yellowCards ?? 0;
        player.redCards = player.redCards ?? 0;
        player.isSuspended = player.isSuspended ?? false;
        player.suspensionWeeks = player.suspensionWeeks ?? 0;
        player.isInjured = player.isInjured ?? false;
        player.weeksOut = player.weeksOut ?? 0;
        player.injuryType = player.injuryType ?? null;
        player.injurySeverity = player.injurySeverity ?? null;
        player.minutesPlayed = player.minutesPlayed ?? 0;
    }
    
    function simulatePlayerCards(player, intensity = 1.0) {
        if (!player || player.isInjured || player.isSuspended) return null;
        
        const baseProbs = CARDS_CONFIG.PROBABILITIES[player.position] || 
                         CARDS_CONFIG.PROBABILITIES.MC;
        
        const yellowProb = baseProbs.yellow * intensity;
        const redProb = baseProbs.red * intensity;
        
        const result = { yellow: false, red: false, suspension: 0 };
        
        // Tarjeta roja directa
        if (Math.random() < redProb) {
            result.red = true;
            player.redCards++;
            
            const severity = Math.random();
            if (severity < 0.6) result.suspension = 1;
            else if (severity < 0.9) result.suspension = 2;
            else result.suspension = 3;
            
            player.isSuspended = true;
            player.suspensionWeeks = result.suspension;
            return result;
        }
        
        // Tarjeta amarilla
        if (Math.random() < yellowProb) {
            result.yellow = true;
            player.yellowCards++;
            
            // Sanción por acumulación
            const yellows = player.yellowCards;
            if (yellows === 5 || yellows === 10 || yellows === 15 || yellows === 20) {
                result.suspension = Math.ceil(yellows / 5);
                player.isSuspended = true;
                player.suspensionWeeks = result.suspension;
            }
        }
        
        return result;
    }
    
    function simulatePlayerInjury(player, gameState) {
        if (!player || player.isInjured) return null;
        
        let probability = INJURIES_CONFIG.BASE_PROBABILITY;
        
        // Factor edad
        if (player.age > 30) {
            probability *= (1 + ((player.age - 30) * 0.02));
        }
        
        // Factor fatiga
        const recentMinutes = player.minutesPlayed || 0;
        if (recentMinutes >= 270) probability *= 1.5;
        else if (recentMinutes >= 180) probability *= 1.2;
        
        // Factor médico
        if (gameState?.staff?.medico) {
            const medicoLevel = gameState.staff.medico.level || 3;
            const multipliers = { 1: 1.5, 2: 1.25, 3: 1.0, 4: 0.75, 5: 0.5 };
            probability *= multipliers[medicoLevel] || 1.0;
        } else {
            probability *= 1.5;
        }
        
        if (Math.random() < probability) {
            const rand = Math.random();
            let cumulative = 0;
            
            for (const [severity, config] of Object.entries(INJURIES_CONFIG.SEVERITY)) {
                cumulative += config.prob;
                if (rand < cumulative) {
                    const weeks = Math.floor(
                        Math.random() * (config.weeks.max - config.weeks.min + 1)
                    ) + config.weeks.min;
                    
                    const injuryType = INJURIES_CONFIG.TYPES[
                        Math.floor(Math.random() * INJURIES_CONFIG.TYPES.length)
                    ];
                    
                    player.isInjured = true;
                    player.weeksOut = weeks;
                    player.injuryType = injuryType;
                    player.injurySeverity = severity;
                    
                    return {
                        player: player.name,
                        type: injuryType,
                        severity: config.label,
                        icon: config.icon,
                        weeks: weeks
                    };
                }
            }
        }
        
        return null;
    }
    
    function processWeeklySuspensions(squad, currentWeek, addNewsFunc) {
        if (!Array.isArray(squad)) return;
        
        squad.forEach(player => {
            if (player.isSuspended && player.suspensionWeeks > 0) {
                player.suspensionWeeks--;
                
                if (player.suspensionWeeks <= 0) {
                    player.isSuspended = false;
                    player.suspensionWeeks = 0;
                    
                    if (addNewsFunc) {
                        addNewsFunc(
                            `✅ ${player.name} ha cumplido su sanción y ya puede jugar.`,
                            'success'
                        );
                    }
                }
            }
        });
        
        // Reset amarillas en jornada 19
        if (currentWeek === CARDS_CONFIG.YELLOW_RESET_WEEK) {
            squad.forEach(player => {
                if (player.yellowCards > 0) {
                    player.yellowCards = 0;
                }
            });
            
            if (addNewsFunc) {
                addNewsFunc(
                    `📋 Las tarjetas amarillas han sido borradas por la liga.`,
                    'info'
                );
            }
        }
    }
    
    function processWeeklyRecoveries(squad, gameState, addNewsFunc) {
        if (!Array.isArray(squad)) return;
        
        const recovered = [];
        
        squad.forEach(player => {
            if (player.isInjured && player.weeksOut > 0) {
                let recoverySpeed = 1;
                
                if (gameState?.staff?.fisio) {
                    const fisioLevel = gameState.staff.fisio.level || 3;
                    recoverySpeed = 0.5 + (fisioLevel * 0.25);
                }
                
                player.weeksOut -= recoverySpeed;
                
                if (player.weeksOut <= 0) {
                    player.isInjured = false;
                    player.weeksOut = 0;
                    player.injuryType = null;
                    player.injurySeverity = null;
                    
                    recovered.push(player.name);
                }
            }
        });
        
        if (recovered.length > 0 && addNewsFunc) {
            recovered.forEach(name => {
                addNewsFunc(`💚 ¡${name} se ha recuperado de su lesión!`, 'success');
            });
        }
    }

    // ===========================================
    // HOOKS EN GAMELOGIC
    // ===========================================
    
    function installHooks() {
        // Hook en simulateMatch
        if (window.gameLogic?.simulateMatch) {
            const originalSimulateMatch = window.gameLogic.simulateMatch;
            
            window.gameLogic.simulateMatch = function(...args) {
                const result = originalSimulateMatch.apply(this, args);
                const gameState = window.gameLogic.getGameState();
                const lineup = gameState.lineup || [];
                
                const matchCards = [];
                const matchInjuries = [];
                
                lineup.forEach(player => {
                    if (!player) return;
                    
                    const cardResult = simulatePlayerCards(player, 1.0);
                    if (cardResult && (cardResult.yellow || cardResult.red)) {
                        matchCards.push({
                            player: player.name,
                            yellow: cardResult.yellow,
                            red: cardResult.red,
                            suspension: cardResult.suspension
                        });
                        
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
                    
                    const injuryResult = simulatePlayerInjury(player, gameState);
                    if (injuryResult) {
                        matchInjuries.push(injuryResult);
                        
                        if (window.gameLogic.addNews) {
                            window.gameLogic.addNews(
                                `${injuryResult.icon} ${player.name} se ha lesionado: ${injuryResult.type} (${injuryResult.weeks} semana${injuryResult.weeks > 1 ? 's' : ''})`,
                                'error'
                            );
                        }
                    }
                    
                    player.minutesPlayed = (player.minutesPlayed || 0) + 90;
                });
                
                if (result && (matchCards.length > 0 || matchInjuries.length > 0)) {
                    result.cardsAndInjuries = {
                        cards: matchCards,
                        injuries: matchInjuries
                    };
                }
                
                return result;
            };
            
            console.log('✅ Hook simulateMatch instalado');
        }
        
        // Hook en simulateFullWeek
        if (window.gameLogic?.simulateFullWeek) {
            const originalSimulateFullWeek = window.gameLogic.simulateFullWeek;
            
            window.gameLogic.simulateFullWeek = async function(...args) {
                const gameState = window.gameLogic.getGameState();
                
                if (gameState.squad) {
                    processWeeklySuspensions(gameState.squad, gameState.week, window.gameLogic.addNews);
                }
                
                const result = await originalSimulateFullWeek.apply(this, args);
                
                const updatedState = window.gameLogic.getGameState();
                if (updatedState.squad) {
                    processWeeklyRecoveries(updatedState.squad, updatedState, window.gameLogic.addNews);
                    
                    // Reset minutos
                    updatedState.squad.forEach(p => p.minutesPlayed = 0);
                }
                
                return result;
            };
            
            console.log('✅ Hook simulateFullWeek instalado');
        }
        
        // Hook en validateLineup
        if (window.gameLogic?.validateLineup) {
            const originalValidateLineup = window.gameLogic.validateLineup;
            
            window.gameLogic.validateLineup = function(lineup) {
                const result = originalValidateLineup.call(this, lineup);
                
                if (!result.success) return result;
                
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
            
            console.log('✅ Hook validateLineup instalado');
        }
    }

    // ===========================================
    // INICIALIZACIÓN
    // ===========================================
    
    function init() {
        // Esperar a que gameLogic esté disponible
        const checkInterval = setInterval(() => {
            if (window.gameLogic) {
                clearInterval(checkInterval);
                
                installHooks();
                
                // Inicializar jugadores existentes
                const gameState = window.gameLogic.getGameState?.();
                if (gameState) {
                    if (gameState.squad) {
                        gameState.squad.forEach(initializePlayer);
                    }
                    if (gameState.academy) {
                        gameState.academy.forEach(initializePlayer);
                    }
                }
                
                console.log('✅ Sistema Integrado Tarjetas/Lesiones: ACTIVO');
            }
        }, 100);
        
        // Timeout de seguridad
        setTimeout(() => clearInterval(checkInterval), 5000);
    }

    // Ejecutar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Exportar para uso externo
    window.CardsInjuriesSystem = {
        initializePlayer,
        simulatePlayerCards,
        simulatePlayerInjury,
        processWeeklySuspensions,
        processWeeklyRecoveries,
        CONFIG: { CARDS: CARDS_CONFIG, INJURIES: INJURIES_CONFIG }
    };
    
})();
