// contracts-system-complete.js
// Sistema completo de gestión de contratos para PC Fútbol Manager

(function() {
    'use strict';
    
    console.log('📝 Sistema de Contratos: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN Y CONSTANTES
    // ===========================================
    
    const CONTRACT_CONFIG = {
        // Duración mínima y máxima de contratos
        MIN_CONTRACT_YEARS: 1,
        MAX_CONTRACT_YEARS: 5,
        
        // Semanas de aviso para renovación
        RENEWAL_WARNING_WEEKS: 26, // 6 meses antes
        URGENT_RENEWAL_WEEKS: 13,  // 3 meses antes
        
        // Multiplicadores de salario por división
        SALARY_MULTIPLIERS: {
            primera: { min: 2000, max: 50000, avgMultiplier: 1.0 },
            segunda: { min: 1000, max: 15000, avgMultiplier: 0.6 },
            rfef_grupo1: { min: 500, max: 5000, avgMultiplier: 0.3 },
            rfef_grupo2: { min: 500, max: 5000, avgMultiplier: 0.3 }
        },
        
        // Cláusulas de rescisión por calidad
        RELEASE_CLAUSE_MULTIPLIER: {
            low: 10,      // Overall < 65
            medium: 20,   // Overall 65-75
            high: 40,     // Overall 76-85
            elite: 100    // Overall > 85
        }
    };

    // ===========================================
    // FUNCIONES DE CÁLCULO
    // ===========================================
    
    /**
     * Calcula el salario base de un jugador según su calidad y división
     */
    function calculatePlayerSalary(player, division) {
        const overall = calculateOverall(player);
        const divisionConfig = CONTRACT_CONFIG.SALARY_MULTIPLIERS[division] || 
                              CONTRACT_CONFIG.SALARY_MULTIPLIERS.segunda;
        
        // Fórmula: salario base según overall + bonificaciones
        let baseSalary = divisionConfig.min + 
                        ((overall - 50) / 50) * (divisionConfig.max - divisionConfig.min);
        
        // Ajustes por edad
        if (player.age < 23) baseSalary *= 0.7;  // Jóvenes cobran menos
        if (player.age > 32) baseSalary *= 0.8;  // Veteranos también
        if (player.age >= 23 && player.age <= 28) baseSalary *= 1.2; // Prime
        
        // Redondear a múltiplos de 100
        return Math.round(baseSalary / 100) * 100;
    }
    
    /**
     * Calcula la cláusula de rescisión
     */
    function calculateReleaseClause(player, salary) {
        const overall = calculateOverall(player);
        let multiplier;
        
        if (overall < 65) multiplier = CONTRACT_CONFIG.RELEASE_CLAUSE_MULTIPLIER.low;
        else if (overall < 76) multiplier = CONTRACT_CONFIG.RELEASE_CLAUSE_MULTIPLIER.medium;
        else if (overall < 86) multiplier = CONTRACT_CONFIG.RELEASE_CLAUSE_MULTIPLIER.high;
        else multiplier = CONTRACT_CONFIG.RELEASE_CLAUSE_MULTIPLIER.elite;
        
        // Cláusula = Salario Semanal * Multiplicador * 52 semanas
        return Math.round(salary * multiplier * 52);
    }
    
    /**
     * Calcula la probabilidad de que el jugador acepte una renovación
     */
    function calculateRenewalAcceptance(player, offerYears, offerSalary, teamStatus) {
        const currentSalary = player.salary || calculatePlayerSalary(player, teamStatus.division);
        let acceptance = 0.5; // Base 50%
        
        // Factor salario (muy importante)
        const salaryIncrease = (offerSalary - currentSalary) / currentSalary;
        if (salaryIncrease >= 0.3) acceptance += 0.30;        // +30% o más = +30%
        else if (salaryIncrease >= 0.15) acceptance += 0.20;  // +15% = +20%
        else if (salaryIncrease >= 0.05) acceptance += 0.10;  // +5% = +10%
        else if (salaryIncrease < 0) acceptance -= 0.40;      // Reducción = -40%
        
        // Factor años de contrato
        const currentYears = player.contractYears || 2;
        if (offerYears >= currentYears) acceptance += 0.10;
        if (offerYears < currentYears) acceptance -= 0.10;
        
        // Factor edad
        if (player.age > 32 && offerYears >= 2) acceptance += 0.15; // Veteranos agradecen estabilidad
        if (player.age < 23 && offerYears > 3) acceptance -= 0.10;  // Jóvenes quieren flexibilidad
        
        // Factor rendimiento del equipo
        if (teamStatus.position <= 3) acceptance += 0.15;      // Equipo en Champions
        else if (teamStatus.position >= 18) acceptance -= 0.15; // Equipo en descenso
        
        // Factor popularidad
        const popBonus = (teamStatus.popularity - 50) / 100;
        acceptance += popBonus;
        
        // Factor lealtad (años en el club)
        if (player.yearsInClub >= 5) acceptance += 0.10;
        if (player.yearsInClub >= 10) acceptance += 0.15;
        
        // Limitar entre 0.05 y 0.95
        return Math.max(0.05, Math.min(0.95, acceptance));
    }

    // ===========================================
    // INICIALIZACIÓN DE CONTRATOS
    // ===========================================
    
    /**
     * Inicializa campos de contrato en jugadores existentes
     */
    function initializePlayerContracts(squad, division) {
        if (!Array.isArray(squad)) {
            console.warn('Squad no es un array válido');
            return squad;
        }
        
        squad.forEach(player => {
            // Tipo de contrato
            if (!player.contractType) {
                player.contractType = 'owned';
            }
            
            // Años de contrato
            if (player.contractYears === undefined || player.contractYears === null) {
                // Distribuir aleatoriamente pero realista
                const random = Math.random();
                if (random < 0.15) player.contractYears = 1;
                else if (random < 0.35) player.contractYears = 2;
                else if (random < 0.65) player.contractYears = 3;
                else if (random < 0.85) player.contractYears = 4;
                else player.contractYears = 5;
            }
            
            // Semanas de contrato (más preciso)
            if (!player.contractWeeks) {
                player.contractWeeks = player.contractYears * 52;
            }
            
            // Salario
            if (!player.salary) {
                player.salary = calculatePlayerSalary(player, division);
            }
            
            // Cláusula de rescisión
            if (!player.releaseClause) {
                player.releaseClause = calculateReleaseClause(player, player.salary);
            }
            
            // Años en el club
            if (!player.yearsInClub) {
                player.yearsInClub = Math.floor(Math.random() * player.contractYears);
            }
            
            // Fecha de inicio del contrato
            if (!player.contractStartDate) {
                player.contractStartDate = Date.now() - (player.yearsInClub * 365 * 24 * 60 * 60 * 1000);
            }
        });
        
        return squad;
    }

    // ===========================================
    // GESTIÓN SEMANAL DE CONTRATOS
    // ===========================================
    
    /**
     * Procesa contratos al avanzar una semana
     */
    function processWeeklyContracts(gameState) {
        if (!gameState || !gameState.squad) {
            console.warn('GameState inválido para procesar contratos');
            return;
        }
        
        const playersToRemove = [];
        const renewalWarnings = [];
        const urgentRenewals = [];
        
        gameState.squad.forEach((player, index) => {
            // Decrementar semanas de contrato
            if (player.contractType === 'owned' && player.contractWeeks > 0) {
                player.contractWeeks--;
                
                // Actualizar años (visual)
                player.contractYears = Math.ceil(player.contractWeeks / 52);
                
                // Avisos de renovación
                if (player.contractWeeks === CONTRACT_CONFIG.RENEWAL_WARNING_WEEKS) {
                    renewalWarnings.push(player.name);
                } else if (player.contractWeeks === CONTRACT_CONFIG.URGENT_RENEWAL_WEEKS) {
                    urgentRenewals.push(player.name);
                }
                
                // Contrato expirado
                if (player.contractWeeks <= 0) {
                    player.contractType = 'free_agent';
                    playersToRemove.push(index);
                    
                    if (window.addNews) {
                        addNews(
                            `⚠️ ${player.name} ha finalizado su contrato y queda libre.`,
                            'warning'
                        );
                    }
                }
            }
            
            // Procesar cesiones
            if (player.contractType === 'loan') {
                if (!player.loanWeeksRemaining) {
                    player.loanWeeksRemaining = 52; // 1 año por defecto
                }
                
                player.loanWeeksRemaining--;
                
                if (player.loanWeeksRemaining <= 0) {
                    // Fin de cesión - el jugador vuelve a su club
                    player.contractType = 'owned';
                    playersToRemove.push(index);
                    
                    if (window.addNews) {
                        addNews(
                            `🔄 ${player.name} ha finalizado su cesión y vuelve a su club.`,
                            'info'
                        );
                    }
                }
            }
        });
        
        // Eliminar jugadores que terminaron contrato/cesión
        for (let i = playersToRemove.length - 1; i >= 0; i--) {
            gameState.squad.splice(playersToRemove[i], 1);
        }
        
        // Notificaciones
        if (renewalWarnings.length > 0 && window.addNews) {
            addNews(
                `📋 ${renewalWarnings.length} jugador(es) tienen contrato por menos de 6 meses: ${renewalWarnings.slice(0, 3).join(', ')}`,
                'info'
            );
        }
        
        if (urgentRenewals.length > 0 && window.addNews) {
            addNews(
                `⚠️ URGENTE: ${urgentRenewals.length} jugador(es) terminan contrato en 3 meses: ${urgentRenewals.slice(0, 3).join(', ')}`,
                'warning'
            );
        }
    }

    // ===========================================
    // INTERFAZ DE RENOVACIÓN
    // ===========================================
    
    /**
     * Abre la interfaz de renovación para un jugador
     */
    function openRenewalNegotiation(player, gameState) {
        if (!player || player.contractType !== 'owned') {
            alert('Este jugador no puede ser renovado');
            return;
        }
        
        const currentSalary = player.salary;
        const suggestedSalary = Math.round(currentSalary * 1.10); // Sugerir +10%
        const minSalary = Math.round(currentSalary * 0.95);      // Mínimo aceptable
        const maxSalary = Math.round(currentSalary * 1.50);      // Máximo razonable
        
        // Crear modal de renovación
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '10000';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>🤝 Negociación de Renovación</h2>
                <h3>${player.name}</h3>
                
                <div style="background: rgba(233,69,96,0.1); padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Contrato Actual:</strong></p>
                    <p>📅 ${player.contractYears} año(s) restante(s)</p>
                    <p>💰 Salario: €${currentSalary.toLocaleString()}/semana</p>
                    <p>🎯 Overall: ${calculateOverall(player)}</p>
                    <p>👤 Edad: ${player.age} años</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">
                        <strong>Años de Contrato:</strong>
                        <input type="range" id="renewalYears" min="1" max="5" value="3" 
                               style="width: 100%; margin-top: 5px;">
                        <span id="yearsDisplay">3 años</span>
                    </label>
                    
                    <label style="display: block; margin-top: 20px;">
                        <strong>Salario Semanal: €<span id="salaryDisplay">${suggestedSalary.toLocaleString()}</span></strong>
                        <input type="range" id="renewalSalary" 
                               min="${minSalary}" max="${maxSalary}" value="${suggestedSalary}" step="100"
                               style="width: 100%; margin-top: 5px;">
                        <small style="color: #999;">Rango: €${minSalary.toLocaleString()} - €${maxSalary.toLocaleString()}</small>
                    </label>
                </div>
                
                <div id="probabilityIndicator" style="margin: 20px 0; padding: 10px; border-radius: 5px; background: rgba(0,255,0,0.1);">
                    <strong>Probabilidad de aceptación:</strong> <span id="probText">75%</span>
                    <div style="background: #333; height: 20px; border-radius: 10px; margin-top: 5px; overflow: hidden;">
                        <div id="probBar" style="background: linear-gradient(90deg, #00ff00, #00aa00); height: 100%; width: 75%; transition: all 0.3s;"></div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn" id="offerRenewalBtn" style="flex: 1;">
                        ✅ Ofrecer Renovación
                    </button>
                    <button class="btn" style="flex: 1; background: #666;" onclick="this.closest('.modal').remove()">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const yearsInput = modal.querySelector('#renewalYears');
        const salaryInput = modal.querySelector('#renewalSalary');
        const yearsDisplay = modal.querySelector('#yearsDisplay');
        const salaryDisplay = modal.querySelector('#salaryDisplay');
        const probText = modal.querySelector('#probText');
        const probBar = modal.querySelector('#probBar');
        const probIndicator = modal.querySelector('#probabilityIndicator');
        
        function updateProbability() {
            const years = parseInt(yearsInput.value);
            const salary = parseInt(salaryInput.value);
            
            const teamStatus = {
                division: gameState.division,
                position: getTeamPosition(gameState),
                popularity: gameState.popularity || 50
            };
            
            const probability = calculateRenewalAcceptance(player, years, salary, teamStatus);
            const probPercent = Math.round(probability * 100);
            
            yearsDisplay.textContent = `${years} año${years > 1 ? 's' : ''}`;
            salaryDisplay.textContent = salary.toLocaleString();
            probText.textContent = `${probPercent}%`;
            probBar.style.width = `${probPercent}%`;
            
            // Cambiar color según probabilidad
            if (probPercent >= 70) {
                probBar.style.background = 'linear-gradient(90deg, #00ff00, #00aa00)';
                probIndicator.style.background = 'rgba(0,255,0,0.1)';
            } else if (probPercent >= 40) {
                probBar.style.background = 'linear-gradient(90deg, #ffaa00, #ff8800)';
                probIndicator.style.background = 'rgba(255,170,0,0.1)';
            } else {
                probBar.style.background = 'linear-gradient(90deg, #ff0000, #cc0000)';
                probIndicator.style.background = 'rgba(255,0,0,0.1)';
            }
        }
        
        yearsInput.addEventListener('input', updateProbability);
        salaryInput.addEventListener('input', updateProbability);
        updateProbability(); // Initial update
        
        // Botón de oferta
        modal.querySelector('#offerRenewalBtn').onclick = function() {
            const years = parseInt(yearsInput.value);
            const salary = parseInt(salaryInput.value);
            
            const teamStatus = {
                division: gameState.division,
                position: getTeamPosition(gameState),
                popularity: gameState.popularity || 50
            };
            
            const probability = calculateRenewalAcceptance(player, years, salary, teamStatus);
            const accepted = Math.random() < probability;
            
            if (accepted) {
                // Renovación aceptada
                player.contractYears = years;
                player.contractWeeks = years * 52;
                player.salary = salary;
                player.releaseClause = calculateReleaseClause(player, salary);
                
                // Guardar cambios
                if (window.gameLogic) {
                    window.gameLogic.updateGameState(gameState);
                }
                
                // Notificar
                if (window.addNews) {
                    addNews(
                        `✅ ¡${player.name} ha aceptado la renovación! ${years} años por €${salary.toLocaleString()}/semana`,
                        'success'
                    );
                }
                
                alert(`¡Excelente! ${player.name} ha aceptado la renovación.\n\n` +
                      `📅 Duración: ${years} años\n` +
                      `💰 Salario: €${salary.toLocaleString()}/semana\n` +
                      `🎯 Cláusula: €${player.releaseClause.toLocaleString()}`);
                
                modal.remove();
                
                // Refrescar UI si existe
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(gameState);
                }
            } else {
                // Renovación rechazada
                if (window.addNews) {
                    addNews(
                        `❌ ${player.name} ha rechazado la oferta de renovación.`,
                        'error'
                    );
                }
                
                alert(`${player.name} ha rechazado tu oferta.\n\n` +
                      `Quizás deberías:\n` +
                      `• Ofrecer un salario más alto\n` +
                      `• Aumentar los años de contrato\n` +
                      `• Mejorar la clasificación del equipo`);
            }
        };
    }

    // ===========================================
    // VISTA DE CONTRATOS
    // ===========================================
    
    /**
     * Abre la vista completa de gestión de contratos
     */
    function openContractsView(gameState) {

    if (!gameState || !gameState.squad) {
        console.error('GameState inválido');
        return;
    }

    openPage('contractsPage');
    renderContractsTable(gameState);

    document.getElementById('filterExpiring').onchange = () => {
        renderContractsTable(gameState);
    };
}

    
    /**
     * Renderiza la tabla de contratos
     */
    function renderContractsTable(gameState) {
        const tbody = document.getElementById('contractsTableBody');
        const filterExpiring = document.getElementById('filterExpiring').checked;
        
        if (!tbody || !gameState.squad) return;
        
        let players = gameState.squad.filter(p => p.contractType === 'owned');
        
        if (filterExpiring) {
            players = players.filter(p => p.contractYears <= 1);
        }
        
        // Ordenar por años restantes (menos a más)
        players.sort((a, b) => (a.contractWeeks || 0) - (b.contractWeeks || 0));
        
        // Calcular estadísticas
        document.getElementById('totalPlayers').textContent = gameState.squad.length;
        document.getElementById('expiringContracts').textContent = 
            gameState.squad.filter(p => p.contractType === 'owned' && p.contractYears <= 1).length;
        
        const totalSalaries = gameState.squad.reduce((sum, p) => sum + (p.salary || 0), 0);
        document.getElementById('totalSalaries').textContent = `€${totalSalaries.toLocaleString()}`;
        
        // Renderizar filas
        tbody.innerHTML = players.map(player => {
            const overall = calculateOverall(player);
            const isExpiring = player.contractYears <= 1;
            const rowClass = isExpiring ? 'style="background: rgba(255,0,0,0.1);"' : '';
            
            return `
                <tr ${rowClass} data-player-id="${player.id || player.name}">
                    <td style="padding: 10px;">${player.name}</td>
                    <td style="padding: 10px;">${player.position}</td>
                    <td style="padding: 10px; text-align: center;">
                        <span style="background: ${getOverallColor(overall)}; padding: 3px 8px; border-radius: 3px; font-weight: bold;">
                            ${overall}
                        </span>
                    </td>
                    <td style="padding: 10px;">${getContractTypeLabel(player.contractType)}</td>
                    <td style="padding: 10px; text-align: center; ${isExpiring ? 'color: #ff0000; font-weight: bold;' : ''}">
                        ${player.contractYears || 0} año${player.contractYears !== 1 ? 's' : ''}
                    </td>
                    <td style="padding: 10px; text-align: right;">€${(player.salary || 0).toLocaleString()}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button class="btn btn-sm" onclick="window.openRenewalNegotiation('${player.id || player.name}')">
                            🤝 Renovar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ===========================================
    // FUNCIONES AUXILIARES
    // ===========================================
    
    function calculateOverall(player) {
        if (player.overall !== undefined) return player.overall;
        
        const attrs = ATTRIBUTES || ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
        let sum = 0;
        attrs.forEach(attr => {
            sum += player[attr] || 50;
        });
        return Math.round(sum / attrs.length);
    }
    
    function getOverallColor(overall) {
        if (overall >= 85) return '#00ff00';
        if (overall >= 75) return '#88ff00';
        if (overall >= 65) return '#ffaa00';
        if (overall >= 55) return '#ff8800';
        return '#ff4444';
    }
    
    function getContractTypeLabel(type) {
        const labels = {
            'owned': '✅ Propiedad',
            'loan': '🔄 Cedido',
            'loan_out': '↗️ Cedido fuera',
            'free_agent': '🆓 Libre'
        };
        return labels[type] || type;
    }
    
    function getTeamPosition(gameState) {
        if (!gameState.standings || !gameState.team) return 10;
        
        const standings = Object.entries(gameState.standings)
            .sort((a, b) => b[1].pts - a[1].pts);
        
        const pos = standings.findIndex(([team]) => team === gameState.team);
        return pos >= 0 ? pos + 1 : 10;
    }

    // ===========================================
    // INTEGRACIÓN CON FIREBASE
    // ===========================================
    
    async function saveContractsToFirebase(userId, gameId, contracts) {
        if (!window.firebaseDB || !userId || !gameId) {
            console.warn('Firebase no disponible para guardar contratos');
            return { success: false };
        }
        
        try {
            const docRef = window.firebaseDB
                .collection('users').doc(userId)
                .collection('saved_games').doc(gameId);
            
            await docRef.set({
                contracts: contracts,
                lastUpdated: Date.now()
            }, { merge: true });
            
            return { success: true };
        } catch (error) {
            console.error('Error guardando contratos:', error);
            return { success: false, error: error.message };
        }
    }

    // ===========================================
// EXPORTAR FUNCIONES GLOBALES
// ===========================================

window.ContractsSystem = {
    initialize: initializePlayerContracts,
    processWeekly: processWeeklyContracts,
    openRenewal: openRenewalNegotiation,
    openRenewalUI: openContractsView,  // ← AÑADIDO PARA COMPATIBILIDAD
    openView: openContractsView,
    calculateSalary: calculatePlayerSalary,
    calculateClause: calculateReleaseClause
};

// Alias para compatibilidad con diferentes partes del código
window.openRenewalNegotiation = function(playerIdOrName) {
    const gameState = window.gameLogic ? window.gameLogic.getGameState() : window.gameState;
    if (!gameState) return;
    
    const player = gameState.squad.find(p => 
        (p.id && p.id === playerIdOrName) || p.name === playerIdOrName
    );
    
    if (player) {
        openRenewalNegotiation(player, gameState);
    }
};

// 🆕 ALIAS GLOBAL PARA ABRIR LA UI DE RENOVACIONES (DESDE EL BOTÓN)
window.openRenewalUI = function(gameState) {
    console.log('🔍 openRenewalUI llamado con gameState:', !!gameState);
    
    // Si no se pasa gameState, obtenerlo
    if (!gameState) {
        gameState = window.gameLogic ? window.gameLogic.getGameState() : window.gameState;
    }
    
    if (!gameState) {
        console.error('❌ No se pudo obtener gameState');
        alert('Error: No se pudo cargar el estado del juego');
        return;
    }
    
    // Llamar a la función que muestra la vista de contratos
    if (typeof openContractsView === 'function') {
        console.log('✅ Llamando a openContractsView');
        openContractsView(gameState);
    } else {
        console.error('❌ openContractsView no está definido');
        alert('Error: La función de renovaciones no está disponible');
    }
};

console.log('✅ Sistema de Contratos: Cargado correctamente');
console.log('✅ Función openRenewalUI expuesta globalmente');

// ===========================================
// HOOK PARA openPage
// ===========================================

const originalOpenPage = window.openPage;

window.openPage = function(pageId) {

    if (originalOpenPage) originalOpenPage(pageId);

    if (pageId === 'contractsPage') {

        const gameState = window.gameLogic
            ? window.gameLogic.getGameState()
            : window.gameState;

        if (gameState) {
            renderContractsTable(gameState);
        }
    }
};

    
})();
