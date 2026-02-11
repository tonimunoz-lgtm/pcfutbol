// cards-injuries-system-complete.js
// Sistema completo de gestión de tarjetas y lesiones

(function() {
    'use strict';
    
    console.log('⚽ Sistema de Tarjetas y Lesiones: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN DE TARJETAS
    // ===========================================
    
    const CARDS_CONFIG = {
        // Probabilidades base por posición (por partido)
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
        
        // Reglas de sanciones
        SUSPENSION_RULES: {
            YELLOW_5: 1,    // 5 amarillas = 1 partido
            YELLOW_10: 2,   // 10 amarillas = 2 partidos
            YELLOW_15: 3,   // 15 amarillas = 3 partidos
            YELLOW_20: 4,   // 20 amarillas = 4 partidos
            RED_DIRECT: { min: 1, max: 3 },  // Roja directa
            RED_DOUBLE: 1   // Doble amarilla = 1 partido
        },
        
        // Reset de tarjetas
        YELLOW_RESET_WEEK: 19  // Las amarillas se borran en jornada 19
    };

    // ===========================================
    // CONFIGURACIÓN DE LESIONES
    // ===========================================
    
    const INJURIES_CONFIG = {
        // Probabilidad base por partido
        BASE_PROBABILITY: 0.008,  // 0.8% por partido
        
        // Distribución de gravedad
        SEVERITY: {
            leve: { 
                prob: 0.60, 
                weeks: { min: 1, max: 2 },
                label: 'Leve',
                icon: '🟡'
            },
            moderada: { 
                prob: 0.30, 
                weeks: { min: 3, max: 6 },
                label: 'Moderada',
                icon: '🟠'
            },
            grave: { 
                prob: 0.09, 
                weeks: { min: 7, max: 16 },
                label: 'Grave',
                icon: '🔴'
            },
            muy_grave: { 
                prob: 0.01, 
                weeks: { min: 17, max: 30 },
                label: 'Muy Grave',
                icon: '⚫'
            }
        },
        
        // Tipos de lesión
        TYPES: [
            'Esguince de tobillo',
            'Rotura de ligamentos',
            'Lesión muscular',
            'Fractura de peroné',
            'Rotura de menisco',
            'Distensión en isquiotibiales',
            'Lesión en rodilla',
            'Tendinitis',
            'Contusión',
            'Fractura de clavícula'
        ],
        
        // Factores que modifican probabilidad
        FACTORS: {
            AGE: {
                // Incremento por edad >30
                multiplier: 0.02  // +2% por cada año sobre 30
            },
            FATIGUE: {
                // Incremento por minutos jugados
                HIGH: { minutes: 270, multiplier: 1.5 },      // 3 partidos completos
                MEDIUM: { minutes: 180, multiplier: 1.2 },    // 2 partidos completos
                LOW: { minutes: 90, multiplier: 1.0 }
            },
            TRAINING: {
                // Modificador por intensidad de entrenamiento
                HIGH: 1.3,
                MEDIUM: 1.0,
                LOW: 0.8
            },
            MEDICAL_STAFF: {
                // Reducción por calidad del médico
                LEVEL_1: 1.5,  // Sin médico o malo
                LEVEL_2: 1.25,
                LEVEL_3: 1.0,  // Médico normal
                LEVEL_4: 0.75,
                LEVEL_5: 0.5   // Médico excelente
            }
        }
    };

    // ===========================================
    // SISTEMA DE TARJETAS
    // ===========================================
    
    /**
     * Inicializa los campos de tarjetas en jugadores
     */
    function initializePlayerCards(squad) {
        if (!Array.isArray(squad)) return squad;
        
        squad.forEach(player => {
            if (player.yellowCards === undefined) player.yellowCards = 0;
            if (player.redCards === undefined) player.redCards = 0;
            if (player.isSuspended === undefined) player.isSuspended = false;
            if (player.suspensionWeeks === undefined) player.suspensionWeeks = 0;
        });
        
        return squad;
    }
    
    /**
     * Simula tarjetas en un partido
     */
    function simulateMatchCards(player, matchIntensity = 1.0) {
        if (!player || player.isInjured || player.isSuspended) {
            return null;  // Jugador no puede recibir tarjetas
        }
        
        const baseProbs = CARDS_CONFIG.PROBABILITIES[player.position] || 
                         CARDS_CONFIG.PROBABILITIES.MC;
        
        let yellowProb = baseProbs.yellow * matchIntensity;
        let redProb = baseProbs.red * matchIntensity;
        
        // Ajustar por mentalidad del equipo
        if (window.gameState && window.gameState.mentality) {
            if (window.gameState.mentality === 'defensive') yellowProb *= 1.2;
            if (window.gameState.mentality === 'attacking') yellowProb *= 0.9;
        }
        
        const result = { yellow: false, red: false, suspension: 0 };
        
        // Simular roja directa (primero, es más raro)
        if (Math.random() < redProb) {
            result.red = true;
            player.redCards++;
            
            // Determinar sanción (1-3 partidos)
            const severity = Math.random();
            if (severity < 0.6) result.suspension = 1;
            else if (severity < 0.9) result.suspension = 2;
            else result.suspension = 3;
            
            player.isSuspended = true;
            player.suspensionWeeks = result.suspension;
            
            return result;
        }
        
        // Simular amarilla
        if (Math.random() < yellowProb) {
            result.yellow = true;
            player.yellowCards++;
            
            // Verificar si suma sanción por acumulación
            const yellows = player.yellowCards;
            
            if (yellows === 5 || yellows === 10 || yellows === 15 || yellows === 20) {
                const suspension = Math.ceil(yellows / 5);
                result.suspension = suspension;
                player.isSuspended = true;
                player.suspensionWeeks = suspension;
            }
            
            // Verificar doble amarilla en el mismo partido (muy raro)
            if (Math.random() < 0.05) {  // 5% de que sea doble amarilla
                result.red = true;
                player.redCards++;
                result.suspension = Math.max(result.suspension, 1);
                player.isSuspended = true;
                player.suspensionWeeks = Math.max(player.suspensionWeeks, 1);
            }
        }
        
        return result;
    }
    
    /**
     * Procesa sanciones semanalmente
     */
    function processWeeklySuspensions(squad, currentWeek) {
        if (!Array.isArray(squad)) return;
        
        squad.forEach(player => {
            if (player.isSuspended && player.suspensionWeeks > 0) {
                player.suspensionWeeks--;
                
                if (player.suspensionWeeks <= 0) {
                    player.isSuspended = false;
                    player.suspensionWeeks = 0;
                    
                    // Notificar que el jugador vuelve
                    if (window.addNews) {
                        addNews(
                            `✅ ${player.name} ha cumplido su sanción y ya puede jugar.`,
                            'success'
                        );
                    }
                }
            }
        });
        
        // Reset de amarillas en jornada especificada
        if (currentWeek === CARDS_CONFIG.YELLOW_RESET_WEEK) {
            squad.forEach(player => {
                if (player.yellowCards > 0) {
                    player.yellowCards = 0;
                }
            });
            
            if (window.addNews) {
                addNews(
                    `📋 Las tarjetas amarillas han sido borradas por la liga.`,
                    'info'
                );
            }
        }
    }

    // ===========================================
    // SISTEMA DE LESIONES
    // ===========================================
    
    /**
     * Inicializa los campos de lesiones en jugadores
     */
    function initializePlayerInjuries(squad) {
        if (!Array.isArray(squad)) return squad;
        
        squad.forEach(player => {
            if (player.isInjured === undefined) player.isInjured = false;
            if (player.weeksOut === undefined) player.weeksOut = 0;
            if (player.injuryType === undefined) player.injuryType = null;
            if (player.minutesPlayed === undefined) player.minutesPlayed = 0;
        });
        
        return squad;
    }
    
    /**
     * Calcula la probabilidad de lesión para un jugador
     */
    function calculateInjuryProbability(player, gameState) {
        let probability = INJURIES_CONFIG.BASE_PROBABILITY;
        
        // Factor edad
        if (player.age > 30) {
            const ageOver30 = player.age - 30;
            probability *= (1 + (ageOver30 * INJURIES_CONFIG.FACTORS.AGE.multiplier));
        }
        
        // Factor fatiga (minutos jugados recientes)
        const recentMinutes = player.minutesPlayed || 0;
        if (recentMinutes >= INJURIES_CONFIG.FACTORS.FATIGUE.HIGH.minutes) {
            probability *= INJURIES_CONFIG.FACTORS.FATIGUE.HIGH.multiplier;
        } else if (recentMinutes >= INJURIES_CONFIG.FACTORS.FATIGUE.MEDIUM.minutes) {
            probability *= INJURIES_CONFIG.FACTORS.FATIGUE.MEDIUM.multiplier;
        }
        
        // Factor calidad del staff médico
        if (gameState && gameState.staff && gameState.staff.medico) {
            const medicoLevel = gameState.staff.medico.level || 3;
            const multipliers = INJURIES_CONFIG.FACTORS.MEDICAL_STAFF;
            const key = `LEVEL_${medicoLevel}`;
            probability *= multipliers[key] || 1.0;
        } else {
            // Sin médico = mayor riesgo
            probability *= INJURIES_CONFIG.FACTORS.MEDICAL_STAFF.LEVEL_1;
        }
        
        // Factor entrenamiento
        if (gameState && gameState.trainingLevel) {
            const intensity = gameState.trainingLevel;
            if (intensity >= 4) probability *= INJURIES_CONFIG.FACTORS.TRAINING.HIGH;
            else if (intensity >= 2) probability *= INJURIES_CONFIG.FACTORS.TRAINING.MEDIUM;
            else probability *= INJURIES_CONFIG.FACTORS.TRAINING.LOW;
        }
        
        return probability;
    }
    
    /**
     * Determina la gravedad de una lesión
     */
    function determineInjurySeverity() {
        const rand = Math.random();
        let cumulative = 0;
        
        for (const [severity, config] of Object.entries(INJURIES_CONFIG.SEVERITY)) {
            cumulative += config.prob;
            if (rand < cumulative) {
                const weeks = Math.floor(
                    Math.random() * (config.weeks.max - config.weeks.min + 1)
                ) + config.weeks.min;
                
                return {
                    severity,
                    weeks,
                    label: config.label,
                    icon: config.icon
                };
            }
        }
        
        // Fallback (no debería llegar aquí)
        return {
            severity: 'leve',
            weeks: 1,
            label: 'Leve',
            icon: '🟡'
        };
    }
    
    /**
     * Simula posibles lesiones en un partido
     */
    function simulateMatchInjuries(player, gameState) {
        if (!player || player.isInjured) {
            return null;  // Jugador ya lesionado
        }
        
        const probability = calculateInjuryProbability(player, gameState);
        
        if (Math.random() < probability) {
            const severity = determineInjurySeverity();
            const injuryType = INJURIES_CONFIG.TYPES[
                Math.floor(Math.random() * INJURIES_CONFIG.TYPES.length)
            ];
            
            // Aplicar lesión
            player.isInjured = true;
            player.weeksOut = severity.weeks;
            player.injuryType = injuryType;
            player.injurySeverity = severity.severity;
            
            return {
                player: player.name,
                type: injuryType,
                severity: severity.label,
                icon: severity.icon,
                weeks: severity.weeks
            };
        }
        
        return null;
    }
    
    /**
     * Procesa recuperaciones semanalmente
     */
    function processWeeklyRecoveries(squad, gameState) {
        if (!Array.isArray(squad)) return;
        
        const recovered = [];
        
        squad.forEach(player => {
            if (player.isInjured && player.weeksOut > 0) {
                // Reducir tiempo de recuperación
                let recoverySpeed = 1;
                
                // El fisioterapeuta acelera la recuperación
                if (gameState && gameState.staff && gameState.staff.fisio) {
                    const fisioLevel = gameState.staff.fisio.level || 3;
                    // Nivel 5 = 50% más rápido, Nivel 1 = 50% más lento
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
        
        // Notificar recuperaciones
        if (recovered.length > 0 && window.addNews) {
            recovered.forEach(name => {
                addNews(
                    `💚 ¡${name} se ha recuperado de su lesión!`,
                    'success'
                );
            });
        }
    }
    
    /**
     * Resetea los minutos jugados (semanalmente)
     */
    function resetWeeklyMinutes(squad) {
        if (!Array.isArray(squad)) return;
        
        squad.forEach(player => {
            player.minutesPlayed = 0;
        });
    }

    // ===========================================
    // VISUALIZACIÓN
    // ===========================================
    
    /**
     * Renderiza los badges de estado del jugador
     */
    function renderPlayerStatusBadges(player) {
        let badges = '';
        
        // Lesión
        if (player.isInjured && player.weeksOut > 0) {
            const weeks = Math.ceil(player.weeksOut);
            const severity = player.injurySeverity || 'moderada';
            const icon = INJURIES_CONFIG.SEVERITY[severity]?.icon || '🟠';
            badges += `<span class="injured-badge">
                ${icon} ${player.injuryType || 'Lesión'} (${weeks} sem)
            </span>`;
        }
        
        // Sanción
        if (player.isSuspended && player.suspensionWeeks > 0) {
            badges += `<span class="suspended-badge">
                ⛔ SANCIÓN (${player.suspensionWeeks} partido${player.suspensionWeeks > 1 ? 's' : ''})
            </span>`;
        }
        
        // Tarjetas rojas
        if (player.redCards > 0) {
            badges += `<span class="red-card-badge">
                🟥 x${player.redCards}
            </span>`;
        }
        
        // Tarjetas amarillas
        if (player.yellowCards > 0) {
            const isWarning = player.yellowCards >= 4;
            badges += `<span class="${isWarning ? 'warning-badge' : 'yellow-card-badge'}">
                🟨 x${player.yellowCards}${isWarning ? ' ⚠️' : ''}
            </span>`;
        }
        
        return badges ? `<span class="player-status-indicator">${badges}</span>` : '';
    }
    
    /**
     * Aplica clases CSS según estado del jugador
     */
    function applyPlayerStatusClasses(element, player) {
        if (!element) return;
        
        // Remover clases anteriores
        element.classList.remove('injured', 'suspended', 'warning');
        
        // Aplicar nuevas clases
        if (player.isInjured) element.classList.add('injured');
        if (player.isSuspended) element.classList.add('suspended');
        if (player.yellowCards >= 4) element.classList.add('warning');
    }

    // ===========================================
    // INFORME POST-PARTIDO
    // ===========================================
    
    /**
     * Genera un informe de tarjetas y lesiones del partido
     */
    function generateMatchReport(homeTeam, awayTeam, homeCards, awayCards, homeInjuries, awayInjuries) {
        let report = '<div class="match-report-cards-injuries">';
        
        // Tarjetas
        if (homeCards.length > 0 || awayCards.length > 0) {
            report += '<h3>📋 Tarjetas</h3>';
            
            if (homeCards.length > 0) {
                report += `<p><strong>${homeTeam}:</strong></p><ul>`;
                homeCards.forEach(card => {
                    const cardIcon = card.red ? '🟥' : '🟨';
                    const suspension = card.suspension > 0 ? ` (${card.suspension} partido${card.suspension > 1 ? 's' : ''} de sanción)` : '';
                    report += `<li>${cardIcon} ${card.player}${suspension}</li>`;
                });
                report += '</ul>';
            }
            
            if (awayCards.length > 0) {
                report += `<p><strong>${awayTeam}:</strong></p><ul>`;
                awayCards.forEach(card => {
                    const cardIcon = card.red ? '🟥' : '🟨';
                    const suspension = card.suspension > 0 ? ` (${card.suspension} partido${card.suspension > 1 ? 's' : ''} de sanción)` : '';
                    report += `<li>${cardIcon} ${card.player}${suspension}</li>`;
                });
                report += '</ul>';
            }
        }
        
        // Lesiones
        if (homeInjuries.length > 0 || awayInjuries.length > 0) {
            report += '<h3>🏥 Lesiones</h3>';
            
            if (homeInjuries.length > 0) {
                report += `<p><strong>${homeTeam}:</strong></p><ul>`;
                homeInjuries.forEach(inj => {
                    report += `<li>${inj.icon} ${inj.player} - ${inj.type} (${inj.severity}, ${inj.weeks} semanas)</li>`;
                });
                report += '</ul>';
            }
            
            if (awayInjuries.length > 0) {
                report += `<p><strong>${awayTeam}:</strong></p><ul>`;
                awayInjuries.forEach(inj => {
                    report += `<li>${inj.icon} ${inj.player} - ${inj.type} (${inj.severity}, ${inj.weeks} semanas)</li>`;
                });
                report += '</ul>';
            }
        }
        
        report += '</div>';
        return report;
    }

    // ===========================================
    // INTEGRACIÓN CON EL JUEGO
    // ===========================================
    
    /**
     * Hook para simular tarjetas y lesiones en partidos
     */
    function hookMatchSimulation() {
        // Interceptar la función de simulación de partidos
        if (window.gameLogic && window.gameLogic.simulateMatch) {
            const originalSimulate = window.gameLogic.simulateMatch;
            
            window.gameLogic.simulateMatch = function(...args) {
                // Llamar a la simulación original
                const result = originalSimulate.apply(this, args);
                
                // Procesar tarjetas y lesiones para el equipo del jugador
                const gameState = window.gameLogic.getGameState();
                const lineup = gameState.lineup || [];
                
                const matchCards = [];
                const matchInjuries = [];
                
                lineup.forEach(player => {
                    if (!player) return;
                    
                    // Simular tarjetas
                    const cardResult = simulateMatchCards(player);
                    if (cardResult && (cardResult.yellow || cardResult.red)) {
                        matchCards.push({
                            player: player.name,
                            yellow: cardResult.yellow,
                            red: cardResult.red,
                            suspension: cardResult.suspension
                        });
                    }
                    
                    // Simular lesiones
                    const injuryResult = simulateMatchInjuries(player, gameState);
                    if (injuryResult) {
                        matchInjuries.push(injuryResult);
                    }
                    
                    // Actualizar minutos jugados
                    player.minutesPlayed = (player.minutesPlayed || 0) + 90;
                });
                
                // Agregar resultados al informe del partido
                if (result && (matchCards.length > 0 || matchInjuries.length > 0)) {
                    result.cardsAndInjuries = {
                        cards: matchCards,
                        injuries: matchInjuries
                    };
                }
                
                return result;
            };
            
            console.log('✅ Hook de simulación de partidos instalado');
        }
    }

    // ===========================================
    // EXPORTAR FUNCIONES GLOBALES
    // ===========================================
    
    window.CardsInjuriesSystem = {
        // Inicialización
        initializeCards: initializePlayerCards,
        initializeInjuries: initializePlayerInjuries,
        
        // Simulación
        simulateCards: simulateMatchCards,
        simulateInjuries: simulateMatchInjuries,
        
        // Procesamiento semanal
        processWeeklySuspensions,
        processWeeklyRecoveries,
        resetWeeklyMinutes,
        
        // Visualización
        renderStatusBadges: renderPlayerStatusBadges,
        applyStatusClasses: applyPlayerStatusClasses,
        generateMatchReport,
        
        // Configuración
        CONFIG: {
            CARDS: CARDS_CONFIG,
            INJURIES: INJURIES_CONFIG
        }
    };
    
    // Instalar hooks
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookMatchSimulation);
    } else {
        hookMatchSimulation();
    }
    
    console.log('✅ Sistema de Tarjetas y Lesiones: Cargado correctamente');
    
})();
