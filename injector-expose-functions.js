// injector-expose-functions.js
// Este injector expone las funciones del módulo ES6 al scope global
// para que puedan ser llamadas desde onclick en el HTML

(function() {
    console.log('🔗 Function Exposure Injector cargando...');

    // Esperar a que los módulos estén cargados
    function waitForModules() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.gameLogic && window.ui) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout de seguridad
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.gameLogic || !window.ui) {
                    console.error('❌ Módulos no cargados después de 10 segundos');
                }
                resolve();
            }, 10000);
        });
    }

    // Función principal de exposición
    async function exposeGameFunctions() {
        await waitForModules();

        if (!window.gameLogic) {
            console.error('❌ gameLogic no disponible');
            return;
        }

        console.log('📤 Exponiendo funciones del juego...');

        // ============================================
        // PRIMERO: FUNCIONES AUXILIARES Y DE UTILIDAD
        // ============================================

        // Función para popular el select de intercambio de jugadores
        window.populatePlayerExchangeSelect = function() {
            const select = document.getElementById('playerExchangeSelect');
            if (!select) return;
            
            select.innerHTML = '';
            const state = window.gameLogic.getGameState();
            state.squad.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                option.textContent = `${p.name} (OVR: ${p.overall}) - VAL: ${p.value.toLocaleString('es-ES')}€`;
                select.appendChild(option);
            });
        };

        // ============================================
        // SEGUNDO: FUNCIONES DE NEGOCIACIÓN
        // ============================================

        window.updateNegotiationModal = function() {
            const state = window.gameLogic.getGameState();
            const player = state.negotiatingPlayer;

            if (!player) {
                if (window.closeModal) {
                    window.closeModal('negotiation');
                }
                return;
            }

            document.getElementById('negotiationPlayerName').textContent = player.name;
            document.getElementById('negotiationPlayerNameStep1').textContent = player.name;
            document.getElementById('negotiationPlayerClub').textContent = player.club;
            document.getElementById('negotiationPlayerClubStep2').textContent = player.club;
            document.getElementById('negotiationPlayerPosition').textContent = player.position;
            document.getElementById('negotiationPlayerAge').textContent = player.age;
            document.getElementById('negotiationPlayerOverall').textContent = player.overall;
            document.getElementById('negotiationPlayerPotential').textContent = player.potential;
            document.getElementById('negotiationPlayerCurrentSalary').textContent = player.salary.toLocaleString('es-ES');
            document.getElementById('negotiationPlayerValue').textContent = player.value.toLocaleString('es-ES');

            const askingPriceElem = document.getElementById('negotiationPlayerAskingPrice');
            const loanInfoElem = document.getElementById('negotiationPlayerLoanInfo');
            if (player.transferListed) {
                askingPriceElem.style.display = 'block';
                document.getElementById('negotiationPlayerAskingPriceValue').textContent = player.askingPrice.toLocaleString('es-ES');
                loanInfoElem.style.display = 'none';
            } else if (player.loanListed) {
                askingPriceElem.style.display = 'none';
                loanInfoElem.style.display = 'block';
                document.getElementById('negotiationPlayerLoanContribution').textContent = (player.loanWageContribution || 0).toLocaleString('es-ES');
            } else {
                askingPriceElem.style.display = 'none';
                loanInfoElem.style.display = 'none';
            }

            document.getElementById('negotiationStep1').style.display = 'none';
            document.getElementById('negotiationStep2').style.display = 'none';

            if (state.negotiationStep === 1) {
                document.getElementById('negotiationStep1').style.display = 'block';
                document.getElementById('offeredSalary').value = player.salary;
                document.getElementById('offeredBonus').checked = false;
                document.getElementById('offeredCar').checked = false;
                document.getElementById('offeredHouse').checked = false;
                document.getElementById('offeredMerchPercent').checked = false;
                document.getElementById('offeredTicketPercent').checked = false;

            } else if (state.negotiationStep === 2) {
                document.getElementById('negotiationStep2').style.display = 'block';

                const negotiationLoanOffer = document.getElementById('negotiationLoanOffer');
                const negotiationTransferOffer = document.getElementById('negotiationTransferOffer');

                negotiationLoanOffer.style.display = 'none';
                negotiationTransferOffer.style.display = 'none';

                document.getElementById('negotiationClubMessage').textContent = `Estás a punto de hacer una oferta a ${player.club} por ${player.name}.`;

                if (player.loanListed) {
                    negotiationLoanOffer.style.display = 'block';
                    document.getElementById('loanPlayerSalaryExample').textContent = player.salary.toLocaleString('es-ES');
                    document.getElementById('loanClubContributionInfo').textContent = (player.loanWageContribution || 0).toLocaleString('es-ES');
                    document.getElementById('loanWageContribution').value = 50;
                    document.getElementById('loanWageContributionValue').textContent = '50%';
                } else if (player.transferListed) {
                    negotiationTransferOffer.style.display = 'block';
                    document.getElementById('offerAmount').value = player.askingPrice;
                    window.populatePlayerExchangeSelect();
                }
            }
        };

        window.endNegotiationUI = function(success) {
            window.gameLogic.endNegotiation(success);
            if (window.closeModal) {
                window.closeModal('negotiation');
            }
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
        };

        window.submitPlayerOffer = function() {
            const offeredSalary = parseInt(document.getElementById('offeredSalary').value);
            const offeredBonus = document.getElementById('offeredBonus').checked;
            const offeredCar = document.getElementById('offeredCar').checked;
            const offeredHouse = document.getElementById('offeredHouse').checked;
            const offeredMerchPercent = document.getElementById('offeredMerchPercent').checked;
            const offeredTicketPercent = document.getElementById('offeredTicketPercent').checked;

            const result = window.gameLogic.offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent);
            alert(result.message);
            if (result.success) {
                window.updateNegotiationModal();
            } else {
                if (result.message && result.message.includes('No está interesado')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.submitLoanOffer = function() {
            const loanWageContribution = parseInt(document.getElementById('loanWageContribution').value);
            const result = window.gameLogic.offerToClub(loanWageContribution, [], true);
            alert(result.message);
            if (result.success) {
                window.endNegotiationUI(true);
            } else {
                if (result.message && result.message.includes('rechazado tu oferta de cesión')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.submitTransferOffer = function() {
            const offerAmount = parseInt(document.getElementById('offerAmount').value);
            const playerExchangeSelect = document.getElementById('playerExchangeSelect');
            const selectedPlayers = Array.from(playerExchangeSelect.selectedOptions).map(option => option.value);

            const result = window.gameLogic.offerToClub(offerAmount, selectedPlayers, false);
            alert(result.message);
            if (result.success) {
                window.endNegotiationUI(true);
            } else {
                if (result.message && result.message.includes('rechazado tu oferta')) {
                    window.endNegotiationUI(false);
                }
            }
        };

        window.startNegotiationUI = function(encodedPlayerJson) {
            const player = JSON.parse(decodeURIComponent(encodedPlayerJson));
            const result = window.gameLogic.startNegotiation(player);
            if (result.success) {
                window.updateNegotiationModal();
                window.openModal('negotiation');
            } else {
                alert('Error: ' + result.message);
            }
        };

        // ============================================
        // TERCERO: FUNCIONES DE ENTRENAMIENTO
        // ============================================

        window.setPlayerTrainingFocusUI = function(playerIndex, playerName) {
            const state = window.gameLogic.getGameState();
            const player = state.squad[playerIndex];

            if (!player) {
                alert('Jugador no encontrado');
                return;
            }

            const ATTRIBUTES = window.ATTRIBUTES || ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];

            document.getElementById('trainingPlayerName').textContent = playerName;
            document.getElementById('trainingPlayerNameInfo').textContent = playerName;
            document.getElementById('trainingPlayerPosition').textContent = player.position;
            document.getElementById('trainingPlayerOverall').textContent = player.overall;
            document.getElementById('trainingPlayerPotential').textContent = player.potential;

            const attributesList = document.getElementById('trainingPlayerAttributes');
            attributesList.innerHTML = '';
            ATTRIBUTES.forEach(attr => {
                attributesList.innerHTML += `<li style="display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(233, 69, 96, 0.3); padding: 5px; border-radius: 3px;"><strong>${attr}:</strong> ${player[attr] || 0}</li>`;
            });

            const attributeRadioButtons = document.getElementById('attributeRadioButtons');
            attributeRadioButtons.innerHTML = '';
            ATTRIBUTES.forEach(attr => {
                const checked = (state.trainingFocus && state.trainingFocus.playerIndex === playerIndex && state.trainingFocus.attribute === attr) ? 'checked' : '';
                attributeRadioButtons.innerHTML += `
                    <div>
                        <input type="radio" id="attr_${attr}" name="trainingAttribute" value="${attr}" ${checked}>
                        <label for="attr_${attr}">${attr}</label>
                    </div>
                `;
            });

            // Advertencias de staff
            if (!state.staff.entrenador) {
                document.getElementById('trainingStaffWarning').style.display = 'block';
            } else {
                document.getElementById('trainingStaffWarning').style.display = 'none';
            }

            if (player.position === 'POR' && !state.staff.entrenadorPorteros) {
                document.getElementById('trainingGkStaffWarning').style.display = 'block';
            } else {
                document.getElementById('trainingGkStaffWarning').style.display = 'none';
            }

            // Guardar el índice para submitTrainingFocus
            window.currentTrainingPlayerIndex = playerIndex;

            window.openModal('training');
        };

        window.submitTrainingFocus = function() {
            const selectedAttribute = document.querySelector('input[name="trainingAttribute"]:checked')?.value;
            if (!selectedAttribute) {
                alert('Por favor, selecciona un atributo para entrenar.');
                return;
            }

            const playerIndex = window.currentTrainingPlayerIndex;
            if (playerIndex === undefined || playerIndex === -1) {
                alert('Error: No se ha seleccionado un jugador válido.');
                return;
            }

            const result = window.gameLogic.setTrainingFocus(playerIndex, selectedAttribute);
            alert(result.message);
            if (result.success && window.closeModal) {
                window.closeModal('training');
            }
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
        };

        // ============================================
        // CUARTO: FUNCIONES DE PLANTILLA Y CANTERA
        // ============================================

        window.sellPlayer = function(playerName) {
            if (confirm(`¿Estás seguro de que quieres vender a ${playerName}?`)) {
                const result = window.gameLogic.sellPlayer(playerName);
                alert(result.message);
                if (result.success && window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(window.gameLogic.getGameState());
                }
            }
        };

        window.sellPlayerConfirm = function(name) {
            if (confirm(`¿Estás seguro de que quieres vender a ${name}?`)) {
                const result = window.gameLogic.sellPlayer(name);
                alert(result.message);
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(window.gameLogic.getGameState());
                }
            }
        };

        window.promoteYoungster = function(playerName) {
            window.promoteConfirm(playerName);
        };

        window.promoteConfirm = function(name) {
            if (confirm(`¿Ascender a ${name} a la primera plantilla?`)) {
                const result = window.gameLogic.promoteYoungster(name);
                alert(result.message);
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(window.gameLogic.getGameState());
                }
            }
        };

        window.fichYoungsterConfirm = function(encodedYoungsterJson) {
            const youngster = JSON.parse(decodeURIComponent(encodedYoungsterJson));
            const result = window.gameLogic.signYoungster(youngster);
            alert(result.message);
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
            if (result.success && window.closeModal) {
                window.closeModal('signYoungster');
            }
        };

        window.negotiatePlayer = function(playerName) {
            alert(`La funcionalidad "Negociar" para jugadores de tu plantilla no está implementada todavía. Esto sería para renovaciones, subidas de sueldo, etc.`);
            console.log(`Intentando negociar con ${playerName}`);
        };

        // AHORA SÍ: Abrir modal de entrenamiento (que ya tiene setPlayerTrainingFocusUI definida)
        window.openTrainingModal = function(playerIndex, playerName) {
            window.setPlayerTrainingFocusUI(playerIndex, playerName);
        };

        console.log('✅ Funciones del juego expuestas globalmente');
        console.log('   ✓ sellPlayer');
        console.log('   ✓ openTrainingModal');
        console.log('   ✓ promoteYoungster');
        console.log('   ✓ negotiatePlayer');
        console.log('   ✓ startNegotiationUI');
        console.log('   ✓ submitPlayerOffer');
        console.log('   ✓ submitLoanOffer');
        console.log('   ✓ submitTransferOffer');
        console.log('   ✓ endNegotiationUI');
        console.log('   ✓ setPlayerTrainingFocusUI');
        console.log('   ✓ submitTrainingFocus');
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', exposeGameFunctions);
    } else {
        // DOM ya está listo
        exposeGameFunctions();
    }

    console.log('✅ Function Exposure Injector cargado correctamente');
})();

// Funciones adicionales para completar la funcionalidad de iconos

// Función para despedir/rescindir contrato de un jugador
window.firePlayerConfirm = function(playerName) {
    const state = window.gameLogic.getGameState();
    const player = state.squad.find(p => p.name === playerName);
    
    if (!player) {
        alert('Jugador no encontrado');
        return;
    }
    
    if (player.contractType !== 'owned') {
        alert('Solo puedes despedir jugadores en propiedad. Los cedidos volverán a su club al finalizar la cesión.');
        return;
    }
    
    // Calcular indemnización (20% del valor del jugador)
    const compensation = Math.round(player.value * 0.2);
    
    const confirmed = confirm(
        `¿Estás seguro de que quieres despedir a ${playerName}?\n\n` +
        `Tendrás que pagar una indemnización de ${compensation.toLocaleString('es-ES')}€\n` +
        `(20% del valor de mercado del jugador)\n\n` +
        `Esta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;
    
    // Verificar si hay suficiente dinero
    if (state.balance < compensation) {
        alert(`No tienes suficiente dinero para pagar la indemnización de ${compensation.toLocaleString('es-ES')}€`);
        return;
    }
    
    // Realizar el despido
    const playerIndex = state.squad.findIndex(p => p.name === playerName);
    if (playerIndex !== -1) {
        state.squad.splice(playerIndex, 1);
        state.balance -= compensation;
        // ✅ REGISTRAR INDEMNIZACIÓN
if (!state.playerCompensations) state.playerCompensations = 0;
state.playerCompensations += compensation;
        
        if (window.gameLogic.addNews) {
            window.gameLogic.addNews(
                `🚫 Has despedido a ${playerName}. Indemnización pagada: ${compensation.toLocaleString('es-ES')}€`,
                'warning'
            );
        }
        
        alert(`${playerName} ha sido despedido del club.\nIndemnización pagada: ${compensation.toLocaleString('es-ES')}€`);
        
        // Actualizar alineación si el jugador estaba en ella
        if (state.lineup.some(p => p && p.name === playerName)) {
            const newLineup = state.lineup.filter(p => p && p.name !== playerName);
            window.gameLogic.setLineup(newLineup);
        }
        
       // ✅ Refrescar UI con estado ACTUALIZADO
if (window.ui && window.ui.refreshUI) {
    window.gameLogic.updateGameState(state);  // ✅ Guardar cambios primero
    const updatedState = window.gameLogic.getGameState();  // ✅ Obtener estado actualizado
    window.ui.refreshUI(updatedState);  // ✅ Refrescar con estado nuevo
}
    }
};

// Función para abrir interfaz de venta (conecta con el sistema existente)
window.openSellPlayerUI = function(playerIndex) {
    const state = window.gameLogic.getGameState();
    const player = state.squad[playerIndex];
    
    if (!player) {
        alert('Jugador no encontrado');
        return;
    }
    
    if (player.contractType !== 'owned') {
        alert('Solo puedes vender jugadores en propiedad');
        return;
    }
    
    // Calcular precio sugerido (valor de mercado)
    const suggestedPrice = player.value;
    const minPrice = Math.round(player.value * 0.7); // 70% del valor
    
    const priceInput = prompt(
        `Poner a ${player.name} en el mercado de transferencias\n\n` +
        `Valor de mercado: ${suggestedPrice.toLocaleString('es-ES')}€\n` +
        `Precio mínimo recomendado: ${minPrice.toLocaleString('es-ES')}€\n\n` +
        `Introduce el precio de venta:`,
        suggestedPrice
    );
    
    if (!priceInput) return;
    
    const price = parseInt(priceInput);
    
    if (isNaN(price) || price < 0) {
        alert('Precio inválido');
        return;
    }
    
    if (price < minPrice) {
        const confirmLowPrice = confirm(
            `El precio introducido (${price.toLocaleString('es-ES')}€) está por debajo del mínimo recomendado.\n\n` +
            `¿Estás seguro de vender por este precio?`
        );
        if (!confirmLowPrice) return;
    }
    
    // Marcar jugador como transferible
    player.transferListed = true;
    player.askingPrice = price;
    
    if (window.gameLogic.addNews) {
        window.gameLogic.addNews(
            `💰 ${player.name} ha sido puesto en el mercado por ${price.toLocaleString('es-ES')}€`,
            'info'
        );
    }
    
    alert(`${player.name} ha sido puesto en el mercado de transferencias por ${price.toLocaleString('es-ES')}€`);
    
    // Refrescar UI
    if (window.ui && window.ui.refreshUI) {
        window.ui.refreshUI(state);
    }
};

// ========================================
// SISTEMA DE VENTAS MEJORADO
// ========================================

let currentSellPlayerIndex = -1;
let currentOffer = null;

// Abrir modal de venta
window.openSellPlayerModal = function(playerIndex) {
    const state = window.gameLogic.getGameState();
    const sorted = [...state.squad].sort((a, b) => b.overall - a.overall);
    const player = sorted[playerIndex];
    
    if (!player) {
        alert('Jugador no encontrado');
        return;
    }
    
    if (player.contractType !== 'owned') {
        alert('Solo puedes vender jugadores en propiedad (no cedidos)');
        return;
    }
    
    currentSellPlayerIndex = playerIndex;
    
    // Rellenar información
    document.getElementById('sellPlayerName').textContent = player.name;
    document.getElementById('sellPlayerPosition').textContent = player.position;
    document.getElementById('sellPlayerAge').textContent = player.age;
    document.getElementById('sellPlayerOverall').textContent = player.overall;
    document.getElementById('sellPlayerValue').textContent = player.value.toLocaleString('es-ES');
    document.getElementById('sellPlayerClause').textContent = (player.releaseClause || 0).toLocaleString('es-ES');
    document.getElementById('sellPlayerCurrentSalary').textContent = player.salary.toLocaleString('es-ES');
    
    // Precio recomendado (70% del valor)
    const minPrice = Math.round(player.value * 0.7);
    document.getElementById('sellMinPrice').textContent = minPrice.toLocaleString('es-ES');
    document.getElementById('sellTransferPrice').value = player.value;
    
    // Mostrar modal
    window.openModal('sellPlayer');
};

// Actualizar tipo de operación
window.updateSellOperationType = function() {
    const type = document.getElementById('sellOperationType').value;
    
    if (type === 'transfer') {
        document.getElementById('sellTransferOptions').style.display = 'block';
        document.getElementById('sellLoanOptions').style.display = 'none';
    } else {
        document.getElementById('sellTransferOptions').style.display = 'none';
        document.getElementById('sellLoanOptions').style.display = 'block';
        window.updateLoanCostPreview();
    }
};

// Actualizar preview de costes de cesión
window.updateLoanCostPreview = function() {
    const state = window.gameLogic.getGameState();
    const sorted = [...state.squad].sort((a, b) => b.overall - a.overall);
    const player = sorted[currentSellPlayerIndex];
    
    if (!player) return;
    
    const wagePercent = parseInt(document.getElementById('sellLoanWagePercent').value) || 0;
    const ourCost = Math.round(player.salary * (wagePercent / 100));
    const theirCost = player.salary - ourCost;
    
    document.getElementById('sellLoanOurCost').textContent = ourCost.toLocaleString('es-ES');
    document.getElementById('sellLoanTheirCost').textContent = theirCost.toLocaleString('es-ES');
};

// Actualizar en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    const loanSlider = document.getElementById('sellLoanWagePercent');
    if (loanSlider) {
        loanSlider.addEventListener('input', window.updateLoanCostPreview);
    }
});

// Confirmar poner en venta
window.confirmListPlayer = function() {
    const state = window.gameLogic.getGameState();
    const sorted = [...state.squad].sort((a, b) => b.overall - a.overall);
    const player = sorted[currentSellPlayerIndex];
    
    if (!player) {
        alert('Error: Jugador no encontrado');
        return;
    }
    
    const operationType = document.getElementById('sellOperationType').value;
    
    if (operationType === 'transfer') {
        const price = parseInt(document.getElementById('sellTransferPrice').value);
        
        if (!price || price <= 0) {
            alert('Introduce un precio válido');
            return;
        }
        
        // Marcar jugador como en venta
        player.transferListed = true;
        player.loanListed = false;
        player.askingPrice = price;
        player.weeksOnMarket = 0; // ✅ Inicializar contador
        
        window.gameLogic.addNews(
            `💰 Has puesto a ${player.name} en venta por ${price.toLocaleString('es-ES')}€`,
            'info'
        );
        
        alert(`${player.name} ha sido puesto en venta por ${price.toLocaleString('es-ES')}€`);
        
    } else {
        // Cesión
        const wagePercent = parseInt(document.getElementById('sellLoanWagePercent').value);
        
        player.transferListed = false;
        player.loanListed = true;
        player.loanWageContribution = Math.round(player.salary * ((100 - wagePercent) / 100));
        player.weeksOnMarket = 0; // ✅ Inicializar contador
        
        window.gameLogic.addNews(
            `🔄 Has puesto a ${player.name} disponible para cesión (asumes ${wagePercent}% salario)`,
            'info'
        );
        
        alert(`${player.name} ha sido puesto disponible para cesión`);
    }
    
    // ✅ GUARDAR CAMBIOS - ESTO ES LO QUE FALTABA
    window.gameLogic.updateGameState(state);
    window.gameLogic.saveToLocalStorage();
    
    window.closeModal('sellPlayer');
    
    // ✅ Refrescar con estado actualizado
    const updatedState = window.gameLogic.getGameState();
    window.ui.refreshUI(updatedState);
    
    // Programar generación de oferta
    setTimeout(() => {
        if (window.gameLogic && window.gameLogic.generateOfferForPlayer) {
            // Si está en gameLogic, no tiene window.
            console.log('⚠️ generateOfferForPlayer está en gameLogic, no en window');
        }
    }, 5000);
};

// Generar oferta de IA
window.generateOfferForPlayer = function(player) {
    if (!player.transferListed && !player.loanListed) return;
    
    // 30% de probabilidad de oferta
    if (Math.random() > 0.3) return;
    
    const state = window.gameLogic.getGameState();
    const allTeams = [
        ...window.TEAMS_DATA.primera,
        ...window.TEAMS_DATA.segunda,
        ...window.TEAMS_DATA.rfef_grupo1,
        ...window.TEAMS_DATA.rfef_grupo2
    ].filter(t => t !== state.team);
    
    const buyerTeam = allTeams[Math.floor(Math.random() * allTeams.length)];
    
    if (player.transferListed) {
        // Oferta de compra (70%-110% del precio solicitado)
        const offerMultiplier = 0.7 + Math.random() * 0.4;
        const offerAmount = Math.round(player.askingPrice * offerMultiplier);
        
        currentOffer = {
            player: player,
            playerIndex: state.squad.findIndex(p => p.name === player.name), // ✅ CAMBIO AQUÍ
            buyerTeam: buyerTeam,
            type: 'transfer',
            amount: offerAmount,
            askingPrice: player.askingPrice
        };
        
        // Mostrar oferta
        document.getElementById('offerBuyerTeam').textContent = buyerTeam;
        document.getElementById('offerPlayerName').textContent = player.name;
        document.getElementById('offerType').textContent = '💼 Traspaso Definitivo';
        document.getElementById('offerAmount').textContent = offerAmount.toLocaleString('es-ES') + '€';
        document.getElementById('offerAsking').textContent = player.askingPrice.toLocaleString('es-ES') + '€';
        
        window.gameLogic.addNews(
            `📨 ¡Oferta recibida! ${buyerTeam} ofrece ${offerAmount.toLocaleString('es-ES')}€ por ${player.name}`,
            'info'
        );
        
        window.openModal('offerReceived');
        
    } else if (player.loanListed) {
        // Oferta de cesión
        const wagePercentTheyPay = 30 + Math.floor(Math.random() * 40); // 30%-70%
        
        currentOffer = {
            player: player,
            playerIndex: state.squad.findIndex(p => p.name === player.name), // ✅ CAMBIO AQUÍ
            buyerTeam: buyerTeam,
            type: 'loan',
            wagePercent: wagePercentTheyPay
        };
        
        document.getElementById('offerBuyerTeam').textContent = buyerTeam;
        document.getElementById('offerPlayerName').textContent = player.name;
        document.getElementById('offerType').textContent = '🔄 Cesión (1 año)';
        document.getElementById('offerAmount').textContent = `Asumen ${wagePercentTheyPay}% del salario`;
        document.getElementById('offerAsking').textContent = 'Cesión';
        
        window.gameLogic.addNews(
            `📨 ¡Oferta de cesión! ${buyerTeam} quiere ceder a ${player.name} (asumen ${wagePercentTheyPay}% salario)`,
            'info'
        );
        
        window.openModal('offerReceived');
    }
};

// Aceptar oferta
window.acceptOffer = function() {
    if (!currentOffer) return;
    
    const state = window.gameLogic.getGameState();
    const player = currentOffer.player;
    
    if (currentOffer.type === 'transfer') {
        // Venta definitiva
        const income = currentOffer.amount;
        state.balance += income;
        
        // Eliminar jugador
        state.squad.splice(currentOffer.playerIndex, 1);
        
        // Registrar en finanzas
        if (!state.playerSalesIncome) state.playerSalesIncome = 0;
        state.playerSalesIncome += income;
        
        window.gameLogic.addNews(
            `✅ ¡Venta cerrada! Has vendido a ${player.name} al ${currentOffer.buyerTeam} por ${income.toLocaleString('es-ES')}€`,
            'success'
        );
        
        alert(`¡Venta exitosa!\n\n${player.name} → ${currentOffer.buyerTeam}\nIngreso: ${income.toLocaleString('es-ES')}€`);
        
    } else if (currentOffer.type === 'loan') {
    // Cesión - Modificar jugador DIRECTAMENTE en squad
    const squadPlayer = state.squad[currentOffer.playerIndex]; // ✅ Obtener del squad
    
    if (squadPlayer) {
        const newSalary = Math.round(squadPlayer.salary * ((100 - currentOffer.wagePercent) / 100));
        
        squadPlayer.contractType = 'loaned_out'; // ✅ Cedido a otro equipo
        squadPlayer.originalSalary = squadPlayer.salary;
        squadPlayer.salary = newSalary;
        squadPlayer.loanedTo = currentOffer.buyerTeam; // ✅ Guardar equipo destino
        squadPlayer.contractYears = 1;
        
        window.gameLogic.addNews(
            `✅ ¡Cesión cerrada! Has cedido a ${squadPlayer.name} al ${currentOffer.buyerTeam} (pagan ${currentOffer.wagePercent}% salario)`,
            'success'
        );
        
        alert(`¡Cesión exitosa!\n\n${squadPlayer.name} → ${currentOffer.buyerTeam}\nAhorro salarial: ${(squadPlayer.originalSalary - newSalary).toLocaleString('es-ES')}€/sem`);
    }
}

    // ✅ GUARDAR CAMBIOS - ESTO ES LO QUE FALTABA
    window.gameLogic.updateGameState(state);
    window.gameLogic.saveToLocalStorage();
    
    window.closeModal('offerReceived');
    // ✅ Refrescar con estado ACTUALIZADO
    const updatedState = window.gameLogic.getGameState();
    window.ui.refreshUI(updatedState);
    currentOffer = null;
};

// Rechazar oferta
window.rejectOffer = function() {
    if (!currentOffer) return;
    
    window.gameLogic.addNews(
        `❌ Has rechazado la oferta de ${currentOffer.buyerTeam} por ${currentOffer.player.name}`,
        'info'
    );
    
    alert(`Oferta rechazada. ${currentOffer.player.name} seguirá en venta.`);
    
    window.closeModal('offerReceived');
    currentOffer = null;
};

// Contraoferta
window.counterOffer = function() {
    if (!currentOffer) return;
    
    if (currentOffer.type === 'transfer') {
        const newPrice = prompt(
            `Oferta actual: ${currentOffer.amount.toLocaleString('es-ES')}€\n` +
            `Tu precio: ${currentOffer.askingPrice.toLocaleString('es-ES')}€\n\n` +
            `Introduce tu contraoferta:`,
            currentOffer.askingPrice
        );
        
        if (newPrice && parseInt(newPrice) > 0) {
            // 50% de aceptación si es razonable
            if (Math.random() < 0.5 && parseInt(newPrice) <= currentOffer.askingPrice * 1.2) {
                currentOffer.amount = parseInt(newPrice);
                alert(`${currentOffer.buyerTeam} ha aceptado tu contraoferta de ${parseInt(newPrice).toLocaleString('es-ES')}€`);
                window.acceptOffer();
            } else {
                alert(`${currentOffer.buyerTeam} ha rechazado tu contraoferta`);
                window.closeModal('offerReceived');
                currentOffer = null;
            }
        }
    }
};

// ✅ AÑADIR

window.firePlayerConfirm = async function(playerName) {
    const state = window.gameLogic.getGameState();
    const player = state.squad.find(p => p.name === playerName);
    
    if (!player) {
        alert('Jugador no encontrado');
        return;
    }
    
    const compensation = player.salary * player.contractYears * 52;
    
    const fireMsg =
        `¿Seguro que quieres despedir a ${playerName}?\n\n` +
        `Años restantes: ${player.contractYears}\n` +
        `Salario semanal: ${player.salary.toLocaleString('es-ES')}€\n` +
        `Indemnización total: ${compensation.toLocaleString('es-ES')}€\n\n` +
        `⚠️ Esta acción no se puede deshacer.`;
    const confirmed = window.pcfConfirm
        ? await window.pcfConfirm('Despedir jugador', fireMsg, { okLabel: 'Despedir', danger: true })
        : confirm(fireMsg);
    
    if (!confirmed) return;
    
    const result = window.gameLogic.firePlayer(playerName);
    
    if (result.success) {
        (window.pcfNotify ? (m => window.pcfNotify('Jugador despedido', m)) : alert)(`${playerName} ha sido despedido.\n\nIndemnización pagada: ${result.compensation.toLocaleString('es-ES')}€`);
        
        // Actualizar alineación si estaba en ella
        if (state.lineup.some(p => p && p.name === playerName)) {
            const newLineup = state.lineup.filter(p => p && p.name !== playerName);
            window.gameLogic.setLineup(newLineup);
        }
        
        window.ui.refreshUI(state);
    } else {
        alert(result.message);
    }
};

// ========================================
// SISTEMA DE RENOVACIONES
// ========================================

let currentRenewalPlayerIndex = -1;

window.openRenewalModal = function(playerIndex) {
    const state = window.gameLogic.getGameState();
    const player = state.squad[playerIndex];
    
    if (!player) {
        alert('Jugador no encontrado');
        return;
    }
    
    if (player.contractType !== 'owned') {
        alert('Solo puedes renovar jugadores en propiedad');
        return;
    }
    
    currentRenewalPlayerIndex = playerIndex;
    
    // Rellenar información
    document.getElementById('renewalPlayerName').textContent = player.name;
    document.getElementById('renewalPlayerPosition').textContent = player.position;
    document.getElementById('renewalPlayerAge').textContent = player.age;
    document.getElementById('renewalPlayerOverall').textContent = player.overall;
    
    document.getElementById('renewalCurrentYears').textContent = player.contractYears + (player.contractYears === 1 ? ' año' : ' años');
    document.getElementById('renewalCurrentSalary').textContent = player.salary.toLocaleString('es-ES') + '€/sem';
    document.getElementById('renewalCurrentClause').textContent = (player.releaseClause || 0).toLocaleString('es-ES') + '€';
    
    // Sugerir valores
    const suggestedSalary = Math.round(player.salary * 1.1); // +10%
    const suggestedClause = Math.round(player.releaseClause * 1.2); // +20%
    
    document.getElementById('renewalNewSalary').value = suggestedSalary;
    document.getElementById('renewalNewClause').value = suggestedClause;
    
    // Listener para avisar de salario bajo
    document.getElementById('renewalNewSalary').addEventListener('input', function() {
        const newSalary = parseInt(this.value);
        const warning = document.getElementById('renewalSalaryWarning');
        
        if (newSalary < player.salary) {
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    });
    
    window.openModal('renewal');
};

window.submitRenewalOffer = function() {
    const state = window.gameLogic.getGameState();
    const player = state.squad[currentRenewalPlayerIndex];
    
    if (!player) {
        alert('Error: Jugador no encontrado');
        return;
    }
    
    const newYears = parseInt(document.getElementById('renewalNewYears').value);
    const newSalary = parseInt(document.getElementById('renewalNewSalary').value);
    const newClause = parseInt(document.getElementById('renewalNewClause').value);
    const hasBonus = document.getElementById('renewalBonus').checked;
    const hasCar = document.getElementById('renewalCar').checked;
    const hasHouse = document.getElementById('renewalHouse').checked;
    
    if (!newSalary || newSalary <= 0 || !newClause || newClause <= 0) {
        alert('Introduce valores válidos');
        return;
    }
    
    // Calcular probabilidad de aceptación
    let acceptanceChance = 0.5;
    
    // Factor salario
    const salaryRatio = newSalary / player.salary;
    if (salaryRatio >= 1.2) acceptanceChance += 0.3;
    else if (salaryRatio >= 1.1) acceptanceChance += 0.2;
    else if (salaryRatio >= 1.0) acceptanceChance += 0.1;
    else if (salaryRatio < 0.9) acceptanceChance -= 0.3;
    
    // Factor años
    if (newYears >= 4) acceptanceChance += 0.1;
    else if (newYears <= 2) acceptanceChance -= 0.1;
    
    // Incentivos
    if (hasBonus) acceptanceChance += 0.1;
    if (hasCar) acceptanceChance += 0.05;
    if (hasHouse) acceptanceChance += 0.05;
    
    // Factor edad
    if (player.age > 30 && newYears >= 3) acceptanceChance += 0.1;
    
    // Urgencia (si le queda poco contrato, más probable que acepte)
    if (player.contractYears <= 1) acceptanceChance += 0.15;
    
    // Efecto secretario
    // Secretario: de +0 (nivel 1) a +0,15 (nivel 5)
    const secretaryEffect = window.pcfEconomy ? window.pcfEconomy.secretaryBonus(state) : 0;
    acceptanceChance += secretaryEffect;
    
    // Limitar entre 0 y 1
    acceptanceChance = Math.max(0, Math.min(1, acceptanceChance));
    
    // Registrar oferta
    window.gameLogic.addNews(
        `📝 Has enviado oferta de renovación a ${player.name}: ${newYears} años, ${newSalary.toLocaleString('es-ES')}€/sem`,
        'info'
    );
    
    window.closeModal('renewal');
    
    // Simular respuesta (después de 3 segundos)
    setTimeout(() => {
        const accepted = Math.random() < acceptanceChance;
        
        if (accepted) {
            // ACEPTADA
            player.contractYears = newYears;
            player.salary = newSalary;
            player.releaseClause = newClause;
            
            window.gameLogic.addNews(
                `✅ ¡Renovación exitosa! ${player.name} ha firmado por ${newYears} años`,
                'success'
            );
            
            alert(`¡${player.name} ha aceptado la renovación!\n\nNuevo contrato: ${newYears} años\nSalario: ${newSalary.toLocaleString('es-ES')}€/sem`);
            
        } else {
            // RECHAZADA
            window.gameLogic.addNews(
                `❌ ${player.name} ha rechazado tu oferta de renovación. Necesita mejores condiciones.`,
                'warning'
            );
            
            alert(`${player.name} ha rechazado la oferta.\n\nIntenta mejorar las condiciones o espera a que esté más cerca del final de su contrato.`);
        }
        
        window.ui.refreshUI(state);
    }, 3000);
    
    alert('Oferta enviada. Esperando respuesta del jugador...');
};

// ========================================
// PAGAR CLÁUSULA DE RESCISIÓN
// ========================================

window.payReleaseClause = function(encodedPlayerJson) {
    const player = JSON.parse(decodeURIComponent(encodedPlayerJson));
    const state = window.gameLogic.getGameState();
    
    const clause = player.releaseClause || player.value * 3;
    
    const confirmed = confirm(
        `¿Pagar la cláusula de rescisión de ${player.name}?\n\n` +
        `Cláusula: ${clause.toLocaleString('es-ES')}€\n\n` +
        `⚠️ Si pagas la cláusula, el ${player.club} no puede negarse.\n` +
        `Solo necesitarás convencer al jugador.`
    );
    
    if (!confirmed) return;
    
    if (state.balance < clause) {
        alert(`No tienes suficiente dinero.\n\nNecesitas: ${clause.toLocaleString('es-ES')}€\nTienes: ${state.balance.toLocaleString('es-ES')}€`);
        return;
    }
    
    // Pagar cláusula
    state.balance -= clause;
    
    // Registrar gasto
    if (!state.playerPurchases) state.playerPurchases = 0;
    state.playerPurchases += clause;
    
    window.gameLogic.addNews(
        `💰 Has pagado la cláusula de ${player.name} por ${clause.toLocaleString('es-ES')}€. Ahora negocia con él.`,
        'info'
    );
    
    // Iniciar negociación solo con jugador (saltar fase de club)
    player.clausePaid = true;
    player.askingPrice = 0; // Ya pagamos
    window.startNegotiationUI(encodeURIComponent(JSON.stringify(player)));
    
    alert(`¡Cláusula pagada!\n\nAhora debes negociar las condiciones personales con ${player.name}`);
};

window.removeFromMarket = function(playerIndex) {
    const state = window.gameLogic.getGameState();
    const sorted = [...state.squad].sort((a, b) => b.overall - a.overall);
    const player = sorted[playerIndex];
    
    if (!player) {
        alert('Jugador no encontrado');
        return;
    }
    
    const wasForSale = player.transferListed;
    const wasForLoan = player.loanListed;
    
    player.transferListed = false;
    player.loanListed = false;
    player.askingPrice = undefined;
    player.loanWageContribution = undefined;
    player.weeksOnMarket = 0;
    
    const message = wasForSale ? 
        `${player.name} retirado del mercado de transferencias` :
        `${player.name} ya no está disponible para cesión`;
    
    window.gameLogic.addNews(`🔙 ${message}`, 'info');
    alert(message);
    
    window.gameLogic.updateGameState(state);
    window.ui.refreshUI(state);
};
