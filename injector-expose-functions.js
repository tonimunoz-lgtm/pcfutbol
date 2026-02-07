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
        
        // Refrescar UI
        if (window.ui && window.ui.refreshUI) {
            window.ui.refreshUI(state);
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
