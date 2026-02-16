// injuries-system.js - Sistema mejorado de lesiones

/**
 * SISTEMA DE LESIONES MEJORADO
 * 
 * Características:
 * - Probabilidad de lesión influenciada por fisioterapeuta y preparador físico
 * - Tiempo de recuperación reducido por médico de mayor nivel
 * - Diferentes tipos de lesiones con duraciones variables
 * - Contador de semanas que se reduce automáticamente
 * - Integración con noticias
 */

import { BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS, STAFF_LEVEL_EFFECTS } from './config.js';

// Tipos de lesiones
const INJURY_TYPES = [
    { name: 'Esguince leve', minWeeks: 1, maxWeeks: 2, probability: 0.35 },
    { name: 'Contusión', minWeeks: 1, maxWeeks: 3, probability: 0.25 },
    { name: 'Sobrecarga muscular', minWeeks: 2, maxWeeks: 4, probability: 0.20 },
    { name: 'Desgarro muscular', minWeeks: 3, maxWeeks: 6, probability: 0.10 },
    { name: 'Esguince grave', minWeeks: 4, maxWeeks: 8, probability: 0.06 },
    { name: 'Rotura fibrilar', minWeeks: 5, maxWeeks: 10, probability: 0.03 },
    { name: 'Lesión de ligamentos', minWeeks: 8, maxWeeks: 16, probability: 0.01 }
];

/**
 * Inicializa las propiedades de lesión en un jugador
 */
export function initializePlayerInjury(player) {
    if (!player.isInjured) player.isInjured = false;
    if (!player.weeksOut) player.weeksOut = 0;
    if (!player.injuryType) player.injuryType = null;
    if (!player.initialWeeksOut) player.initialWeeksOut = 0;
    return player;
}

/**
 * Calcula la probabilidad de lesión considerando el staff
 * @param {Object} player - Jugador
 * @param {Object} staff - Staff del equipo
 * @returns {number} - Probabilidad de lesión
 */
export function calculateInjuryProbability(player, staff) {
    let injuryProb = BASE_INJURY_PROB_PER_MATCH;
    
    // Efecto del fisioterapeuta (reduce probabilidad de lesión)
    if (staff.fisio) {
        const fisioLevel = staff.fisio.level;
        const fisioEffect = STAFF_LEVEL_EFFECTS[fisioLevel]?.injuryProb || 1;
        injuryProb /= fisioEffect;
    }
    
    // Efecto del preparador físico (reduce probabilidad de lesión)
    if (staff.entrenador) {
        const entrenadorLevel = staff.entrenador.level;
        const entrenadorEffect = STAFF_LEVEL_EFFECTS[entrenadorLevel]?.injuryProb || 1;
        injuryProb /= (entrenadorEffect * 0.8); // Menor efecto que el fisio
    }
    
    // Modificadores del jugador
    
    // Forma física baja aumenta riesgo
    if (player.form < 60) {
        injuryProb *= 1.5;
    }
    
    // Jugadores muy ágiles tienen mayor riesgo
    if (player.AG > 85) {
        injuryProb *= 1.2;
    }
    
    // Jugadores mayores tienen mayor riesgo
    if (player.age > 32) {
        injuryProb *= 1.3;
    } else if (player.age > 28) {
        injuryProb *= 1.15;
    }
    
    // Jugadores muy jóvenes tienen menor riesgo
    if (player.age < 22) {
        injuryProb *= 0.85;
    }
    
    return injuryProb;
}

/**
 * Selecciona un tipo de lesión basado en probabilidades
 * @returns {Object} - Tipo de lesión seleccionado
 */
function selectInjuryType() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const injury of INJURY_TYPES) {
        cumulative += injury.probability;
        if (random <= cumulative) {
            return injury;
        }
    }
    
    // Fallback a la lesión más común
    return INJURY_TYPES[0];
}

/**
 * Calcula el tiempo de recuperación considerando el médico
 * @param {Object} injuryType - Tipo de lesión
 * @param {Object} staff - Staff del equipo
 * @returns {number} - Semanas de recuperación
 */
export function calculateRecoveryTime(injuryType, staff) {
    let recoveryMin = injuryType.minWeeks;
    let recoveryMax = injuryType.maxWeeks;
    
    // Efecto del médico (reduce tiempo de recuperación)
    if (staff.medico) {
        const medicoLevel = staff.medico.level;
        const medicoEffect = STAFF_LEVEL_EFFECTS[medicoLevel]?.recoveryTime || 1;
        
        recoveryMin = Math.max(1, Math.round(recoveryMin / medicoEffect));
        recoveryMax = Math.max(1, Math.round(recoveryMax / medicoEffect));
    }
    
    // Calcular semanas aleatorias dentro del rango
    const weeksOut = Math.max(1, Math.round(
        Math.random() * (recoveryMax - recoveryMin) + recoveryMin
    ));
    
    return weeksOut;
}

/**
 * Genera una lesión para un jugador
 * @param {Object} player - Jugador
 * @param {Object} staff - Staff del equipo
 * @param {Function} addNewsCallback - Función para añadir noticias
 * @returns {boolean} - true si se generó lesión
 */
export function generateInjury(player, staff, addNewsCallback) {
    initializePlayerInjury(player);
    
    const injuryProb = calculateInjuryProbability(player, staff);
    
    if (Math.random() < injuryProb) {
        const injuryType = selectInjuryType();
        const weeksOut = calculateRecoveryTime(injuryType, staff);
        
        player.isInjured = true;
        player.weeksOut = weeksOut;
        player.initialWeeksOut = weeksOut;
        player.injuryType = injuryType.name;
        
        // Generar noticia
        if (addNewsCallback) {
            let newsMessage = `🏥 ¡${player.name} se ha lesionado! ${injuryType.name}. `;
            newsMessage += `Estará de baja ${weeksOut} ${weeksOut === 1 ? 'semana' : 'semanas'}.`;
            
            // Añadir info sobre el staff médico
            if (staff.medico) {
                newsMessage += ` El médico de nivel ${staff.medico.level} trabajará en su recuperación.`;
            } else {
                newsMessage += ` ⚠️ Sin médico, la recuperación podría ser más lenta.`;
            }
            
            addNewsCallback(newsMessage, 'warning');
        }
        
        return true;
    }
    
    return false;
}

/**
 * Actualiza las lesiones de todos los jugadores (llamar cada semana)
 * @param {Array} squad - Plantilla del equipo
 * @param {Array} academy - Cantera del equipo
 * @param {Function} addNewsCallback - Función para añadir noticias
 */
export function updateWeeklyInjuries(squad, academy, addNewsCallback) {
    // Procesar plantilla
    squad.forEach(player => {
        initializePlayerInjury(player);
        
        if (player.isInjured && player.weeksOut > 0) {
            player.weeksOut--;
            
            // Si se recupera
            if (player.weeksOut <= 0) {
                player.isInjured = false;
                player.weeksOut = 0;
                const recoveredFrom = player.injuryType || 'lesión';
                player.injuryType = null;
                player.initialWeeksOut = 0;
                
                if (addNewsCallback) {
                    addNewsCallback(
                        `✅ ¡${player.name} se ha recuperado de su ${recoveredFrom} y vuelve a estar disponible!`,
                        'success'
                    );
                }
            }
        }
    });
    
    // Procesar cantera
    if (academy) {
        academy.forEach(youngster => {
            initializePlayerInjury(youngster);
            
            if (youngster.isInjured && youngster.weeksOut > 0) {
                youngster.weeksOut--;
                
                if (youngster.weeksOut <= 0) {
                    youngster.isInjured = false;
                    youngster.weeksOut = 0;
                    const recoveredFrom = youngster.injuryType || 'lesión';
                    youngster.injuryType = null;
                    youngster.initialWeeksOut = 0;
                    
                    if (addNewsCallback) {
                        addNewsCallback(
                            `✅ ¡${youngster.name} (cantera) se ha recuperado de su ${recoveredFrom}!`,
                            'info'
                        );
                    }
                }
            }
        });
    }
}

/**
 * Obtiene estadísticas de lesiones del equipo
 * @param {Array} squad - Plantilla
 * @returns {Object} - Estadísticas
 */
export function getTeamInjuryStats(squad) {
    let totalInjured = 0;
    let totalWeeksOut = 0;
    let longestInjury = 0;
    let injuredPlayers = [];
    
    squad.forEach(player => {
        initializePlayerInjury(player);
        
        if (player.isInjured && player.weeksOut > 0) {
            totalInjured++;
            totalWeeksOut += player.weeksOut;
            
            if (player.weeksOut > longestInjury) {
                longestInjury = player.weeksOut;
            }
            
            injuredPlayers.push({
                name: player.name,
                position: player.position,
                injuryType: player.injuryType,
                weeksOut: player.weeksOut
            });
        }
    });
    
    return {
        totalInjured,
        totalWeeksOut,
        longestInjury,
        injuredPlayers,
        injuryRate: squad.length > 0 ? ((totalInjured / squad.length) * 100).toFixed(1) : 0
    };
}

/**
 * Genera un informe médico completo
 * @param {Array} squad - Plantilla
 * @param {Object} staff - Staff del equipo
 * @returns {string} - Informe HTML
 */
export function generateMedicalReport(squad, staff) {
    const stats = getTeamInjuryStats(squad);
    
    let report = '<div class="medical-report">';
    report += '<h3>📋 Informe Médico</h3>';
    
    // Resumen
    report += '<div class="stats-summary">';
    report += `<p><strong>Lesionados:</strong> ${stats.totalInjured} jugadores (${stats.injuryRate}%)</p>`;
    
    if (staff.medico) {
        report += `<p><strong>Médico:</strong> Nivel ${staff.medico.level} (${staff.medico.name})</p>`;
    } else {
        report += `<p class="warning"><strong>⚠️ Sin médico contratado</strong></p>`;
    }
    
    if (staff.fisio) {
        report += `<p><strong>Fisioterapeuta:</strong> Nivel ${staff.fisio.level} (${staff.fisio.name})</p>`;
    }
    
    report += '</div>';
    
    // Lista de lesionados
    if (stats.injuredPlayers.length > 0) {
        report += '<div class="injured-list">';
        report += '<h4>🏥 Jugadores Lesionados:</h4>';
        report += '<ul>';
        
        stats.injuredPlayers.forEach(player => {
            report += `<li><strong>${player.name}</strong> (${player.position}) - `;
            report += `${player.injuryType} - ${player.weeksOut} semanas</li>`;
        });
        
        report += '</ul></div>';
    } else {
        report += '<p class="success">✅ No hay lesionados actualmente</p>';
    }
    
    report += '</div>';
    
    return report;
}

export default {
    INJURY_TYPES,
    initializePlayerInjury,
    calculateInjuryProbability,
    calculateRecoveryTime,
    generateInjury,
    updateWeeklyInjuries,
    getTeamInjuryStats,
    generateMedicalReport
};
