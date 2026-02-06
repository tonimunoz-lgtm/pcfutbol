// ============================================
// SISTEMA COMPLETO DE CONTRATOS Y TRANSFERENCIAS
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 Iniciando corrección del sistema de contratos y transferencias...');

    // ============================================
    // 1. CORREGIR VISTA DE RENOVACIONES
    // ============================================
    
    // Sobrescribir la función openRenewNegotiation para que funcione correctamente
    window.openRenewNegotiation = function(player) {
        if (!player) {
            console.error('No se proporcionó jugador');
            return;
        }
        
        if (player.contractType === 'loan') {
            alert('No puedes renovar a un jugador cedido.');
            return;
        }
        
        const gameState = window.gameState || window.gameLogic?.getGameState();
        if (!gameState) {
            alert('Error: Estado del juego no disponible');
            return;
        }
        
        // Crear modal de renovación
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
                <h1>💼 Renovar Contrato - ${player.name}</h1>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3>Información del Jugador</h3>
                    <p><strong>Posición:</strong> ${player.position}</p>
                    <p><strong>Media:</strong> ${player.overall || 65}</p>
                    <p><strong>Contrato actual:</strong> ${player.contractYears} año(s)</p>
                    <p><strong>Salario actual:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/semana</p>
                </div>
                
                <div class="form-group">
                    <label for="renewYears">Duración del nuevo contrato (años):</label>
                    <select id="renewYears" class="form-control">
                        <option value="1">1 año</option>
                        <option value="2" selected>2 años</option>
                        <option value="3">3 años</option>
                        <option value="4">4 años</option>
                        <option value="5">5 años</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="renewSalary">Nuevo salario semanal (€):</label>
                    <input type="number" id="renewSalary" class="form-control" 
                           value="${Math.round((player.salary || 1000) * 1.15)}" 
                           min="${Math.round((player.salary || 1000) * 0.8)}" 
                           step="100">
                    <small style="color: #aaa;">Mínimo aceptable: ${Math.round((player.salary || 1000) * 0.8).toLocaleString('es-ES')}€</small>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn" style="background: #00ff00; color: #000; flex: 1;" 
                            onclick="window.submitRenewal('${player.name}')">
                        ✅ Ofrecer Renovación
                    </button>
                    <button class="btn" style="background: #c73446; flex: 1;" 
                            onclick="this.closest('.modal').remove()">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    };
    
    // Función para procesar la renovación
    window.submitRenewal = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        
        if (!player) {
            alert('Jugador no encontrado');
            return;
        }
        
        const years = parseInt(document.getElementById('renewYears').value);
        const salary = parseInt(document.getElementById('renewSalary').value);
        
        // Calcular probabilidad de aceptación
        const salaryRatio = salary / (player.salary || 1000);
        let acceptance = 0.5;
        
        if (salaryRatio >= 1.2) acceptance = 0.9;
        else if (salaryRatio >= 1.1) acceptance = 0.75;
        else if (salaryRatio >= 1.0) acceptance = 0.6;
        else if (salaryRatio >= 0.9) acceptance = 0.4;
        else acceptance = 0.2;
        
        // Bonus por años
        if (years >= 4) acceptance += 0.1;
        
        const accepted = Math.random() < acceptance;
        
        if (accepted) {
            player.contractYears = years;
            player.contractWeeks = years * 52;
            player.salary = salary;
            player.contractType = 'owned';
            
            if (window.addNews) {
                window.addNews(
                    `✅ ¡${player.name} ha aceptado la renovación! ${years} años por ${salary.toLocaleString('es-ES')}€/semana`,
                    'success'
                );
            }
            
            alert(`¡Excelente! ${player.name} ha firmado por ${years} años con un salario de ${salary.toLocaleString('es-ES')}€/semana.`);
            
            // Cerrar modal
            document.querySelector('.modal')?.remove();
            
            // Refrescar UI
            if (window.ui?.refreshUI) {
                window.ui.refreshUI(gameState);
            } else if (window.openPage) {
                window.openPage('renewContracts');
            }
        } else {
            alert(`${player.name} ha rechazado tu oferta.\n\nPrueba a:\n• Aumentar el salario\n• Ofrecer más años de contrato`);
        }
    };

    // ============================================
    // 2. SISTEMA DE VENTA Y CESIÓN
    // ============================================
    
    // Crear mercado de transferencias global
    if (!window.transferMarket) {
        window.transferMarket = [];
    }
    
    // Función mejorada para vender/ceder jugadores
    window.listPlayerForTransfer = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        
        if (!player) {
            alert('Jugador no encontrado');
            return;
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const suggestedPrice = Math.floor(player.overall * 2500 + (player.matches || 0) * 500);
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
                <h1>💰 Transferir - ${player.name}</h1>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p><strong>Posición:</strong> ${player.position}</p>
                    <p><strong>Media:</strong> ${player.overall || 65}</p>
                    <p><strong>Edad:</strong> ${player.age}</p>
                    <p><strong>Salario:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/semana</p>
                    <p><strong>Valor sugerido:</strong> ${suggestedPrice.toLocaleString('es-ES')}€</p>
                </div>
                
                <div style="display: flex; gap: 20px; margin: 20px 0;">
                    <button class="btn" style="flex: 1; background: #FFA500;" 
                            onclick="window.openSaleModal('${playerName}')">
                        💵 Poner en VENTA
                    </button>
                    <button class="btn" style="flex: 1; background: #4169E1;" 
                            onclick="window.openLoanModal('${playerName}')">
                        🔄 Poner en CESIÓN
                    </button>
                    <button class="btn" style="flex: 1; background: #DC143C;" 
                            onclick="window.terminateContract('${playerName}')">
                        ⚠️ DESPEDIR
                    </button>
                </div>
                
                <button class="btn" style="background: #666;" onclick="this.closest('.modal').remove()">
                    Cancelar
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    };
    
    // Modal de venta
    window.openSaleModal = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        const suggestedPrice = Math.floor(player.overall * 2500 + (player.matches || 0) * 500);
        
        document.querySelector('.modal-content').innerHTML = `
            <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
            <h1>💵 Poner en VENTA - ${player.name}</h1>
            
            <div class="form-group">
                <label for="salePrice">Precio de venta (€):</label>
                <input type="number" id="salePrice" class="form-control" 
                       value="${suggestedPrice}" min="1000" step="1000">
                <small style="color: #aaa;">Precio sugerido: ${suggestedPrice.toLocaleString('es-ES')}€</small>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="negotiable">
                    Precio negociable
                </label>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn" style="background: #00ff00; color: #000; flex: 1;" 
                        onclick="window.confirmSale('${playerName}')">
                    ✅ Poner a la Venta
                </button>
                <button class="btn" style="background: #666; flex: 1;" 
                        onclick="this.closest('.modal').remove()">
                    Cancelar
                </button>
            </div>
        `;
    };
    
    // Modal de cesión
    window.openLoanModal = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        
        document.querySelector('.modal-content').innerHTML = `
            <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
            <h1>🔄 Poner en CESIÓN - ${player.name}</h1>
            
            <div class="form-group">
                <label for="loanWageContribution">Porcentaje del salario que pagarás (%):</label>
                <input type="range" id="loanWageContribution" min="0" max="100" value="50" 
                       oninput="this.nextElementSibling.textContent = this.value + '%'">
                <span>50%</span>
                <small style="display: block; color: #aaa; margin-top: 5px;">
                    Salario actual: ${(player.salary || 0).toLocaleString('es-ES')}€/semana
                </small>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="buyOption">
                    Incluir opción de compra
                </label>
                <input type="number" id="buyPrice" placeholder="Precio de compra" 
                       style="margin-top: 10px; display: none;" class="form-control">
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn" style="background: #00ff00; color: #000; flex: 1;" 
                        onclick="window.confirmLoan('${playerName}')">
                    ✅ Poner en Cesión
                </button>
                <button class="btn" style="background: #666; flex: 1;" 
                        onclick="this.closest('.modal').remove()">
                    Cancelar
                </button>
            </div>
            
            <script>
                document.getElementById('buyOption').addEventListener('change', function() {
                    document.getElementById('buyPrice').style.display = this.checked ? 'block' : 'none';
                });
            </script>
        `;
    };
    
    // Confirmar venta
    window.confirmSale = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        const price = parseInt(document.getElementById('salePrice').value);
        const negotiable = document.getElementById('negotiable').checked;
        
        // Añadir al mercado
        window.transferMarket.push({
            player: { ...player },
            type: 'sale',
            price: price,
            negotiable: negotiable,
            sellingClub: gameState.team,
            listedWeek: gameState.week
        });
        
        if (window.addNews) {
            window.addNews(
                `📢 ${player.name} ha sido puesto en venta por ${price.toLocaleString('es-ES')}€`,
                'info'
            );
        }
        
        alert(`${player.name} ha sido puesto en venta. Recibirás ofertas en las próximas semanas.`);
        
        document.querySelector('.modal')?.remove();
    };
    
    // Confirmar cesión
    window.confirmLoan = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        const wageContribution = parseInt(document.getElementById('loanWageContribution').value);
        const buyOption = document.getElementById('buyOption').checked;
        const buyPrice = buyOption ? parseInt(document.getElementById('buyPrice').value || 0) : null;
        
        // Añadir al mercado
        window.transferMarket.push({
            player: { ...player },
            type: 'loan',
            wageContribution: wageContribution,
            buyOption: buyOption,
            buyPrice: buyPrice,
            sellingClub: gameState.team,
            listedWeek: gameState.week
        });
        
        if (window.addNews) {
            window.addNews(
                `📢 ${player.name} ha sido puesto en cesión (pagas ${wageContribution}% del salario)`,
                'info'
            );
        }
        
        alert(`${player.name} ha sido puesto en cesión. Recibirás ofertas en las próximas semanas.`);
        
        document.querySelector('.modal')?.remove();
    };
    
    // Despedir jugador
    window.terminateContract = function(playerName) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = gameState.squad.find(p => p.name === playerName);
        
        if (!player) return;
        
        // Calcular indemnización
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        const confirmed = confirm(
            `⚠️ DESPEDIR A ${player.name}\n\n` +
            `Tendrás que pagar una indemnización de:\n` +
            `${compensation.toLocaleString('es-ES')}€\n\n` +
            `(${player.contractYears} año(s) de contrato × ${(player.salary || 0).toLocaleString('es-ES')}€/semana)\n\n` +
            `¿Estás seguro?`
        );
        
        if (confirmed) {
            if (gameState.balance < compensation) {
                alert('No tienes suficiente dinero para pagar la indemnización.');
                return;
            }
            
            // Pagar indemnización
            gameState.balance -= compensation;
            
            // Eliminar jugador
            const index = gameState.squad.findIndex(p => p.name === playerName);
            gameState.squad.splice(index, 1);
            
            if (window.addNews) {
                window.addNews(
                    `⚠️ ${player.name} ha sido despedido. Indemnización: ${compensation.toLocaleString('es-ES')}€`,
                    'warning'
                );
            }
            
            alert(`${player.name} ha sido despedido.\nIndemnización pagada: ${compensation.toLocaleString('es-ES')}€`);
            
            document.querySelector('.modal')?.remove();
            
            // Refrescar UI
            if (window.ui?.refreshUI) {
                window.ui.refreshUI(gameState);
            }
        }
    };

    // ============================================
    // 3. IA DE OFERTAS
    // ============================================
    
    window.generateTransferOffers = function() {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        // Probabilidad de recibir oferta cada semana
        window.transferMarket.forEach((listing, index) => {
            const weeksSinceListed = gameState.week - listing.listedWeek;
            
            // Más probabilidad cuanto más tiempo lleva en el mercado
            const offerChance = Math.min(0.3 + (weeksSinceListed * 0.1), 0.8);
            
            if (Math.random() < offerChance) {
                generateOfferForListing(listing, index);
            }
        });
    };
    
    function generateOfferForListing(listing, listingIndex) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const player = listing.player;
        
        // Generar equipo interesado
        const interestedTeams = ['FC Barcelona', 'Real Madrid', 'Atlético Madrid', 'Valencia', 'Sevilla', 
                                  'Betis', 'Athletic', 'Real Sociedad', 'Villarreal', 'Getafe'];
        const buyingClub = interestedTeams[Math.floor(Math.random() * interestedTeams.length)];
        
        if (listing.type === 'sale') {
            // Generar oferta de compra (70-110% del precio pedido)
            const offerAmount = Math.floor(listing.price * (0.7 + Math.random() * 0.4));
            
            // Crear notificación de oferta
            if (window.addNews) {
                window.addNews(
                    `📨 OFERTA RECIBIDA: ${buyingClub} ofrece ${offerAmount.toLocaleString('es-ES')}€ por ${player.name}`,
                    'info'
                );
            }
            
            // Crear modal de decisión
            createOfferDecisionModal({
                type: 'sale',
                player: player,
                buyingClub: buyingClub,
                offerAmount: offerAmount,
                askingPrice: listing.price,
                listingIndex: listingIndex
            });
            
        } else if (listing.type === 'loan') {
            // Generar oferta de cesión
            const wageContribution = Math.floor(Math.random() * 50); // Equipo paga 0-50% adicional
            
            if (window.addNews) {
                window.addNews(
                    `📨 OFERTA DE CESIÓN: ${buyingClub} quiere ceder a ${player.name} (pagarían ${wageContribution}% del salario)`,
                    'info'
                );
            }
            
            createOfferDecisionModal({
                type: 'loan',
                player: player,
                buyingClub: buyingClub,
                wageContribution: wageContribution,
                yourContribution: listing.wageContribution,
                buyOption: listing.buyOption,
                buyPrice: listing.buyPrice,
                listingIndex: listingIndex
            });
        }
    }
    
    function createOfferDecisionModal(offer) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        if (offer.type === 'sale') {
            modal.innerHTML = `
                <div class="modal-content">
                    <h1>📨 Oferta de Compra Recibida</h1>
                    
                    <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3>${offer.buyingClub} quiere fichar a ${offer.player.name}</h3>
                        <p><strong>Oferta:</strong> ${offer.offerAmount.toLocaleString('es-ES')}€</p>
                        <p><strong>Precio pedido:</strong> ${offer.askingPrice.toLocaleString('es-ES')}€</p>
                        <p style="color: ${offer.offerAmount >= offer.askingPrice ? '#00ff00' : '#FFA500'};">
                            ${offer.offerAmount >= offer.askingPrice ? '✅ Oferta alcanza tu precio' : '⚠️ Oferta por debajo del precio'}
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" style="background: #00ff00; color: #000; flex: 1;" 
                                onclick="window.acceptTransferOffer(${offer.listingIndex}, 'sale', ${offer.offerAmount})">
                            ✅ Aceptar
                        </button>
                        <button class="btn" style="background: #FFA500; flex: 1;" 
                                onclick="window.counterOffer(${offer.listingIndex}, ${offer.offerAmount})">
                            💬 Contraoferta
                        </button>
                        <button class="btn" style="background: #c73446; flex: 1;" 
                                onclick="this.closest('.modal').remove()">
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <div class="modal-content">
                    <h1>📨 Oferta de Cesión Recibida</h1>
                    
                    <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3>${offer.buyingClub} quiere ceder a ${offer.player.name}</h3>
                        <p><strong>Ellos pagarían:</strong> ${offer.wageContribution}% del salario</p>
                        <p><strong>Tú pagarías:</strong> ${offer.yourContribution}% del salario</p>
                        ${offer.buyOption ? `<p><strong>Opción de compra:</strong> ${offer.buyPrice.toLocaleString('es-ES')}€</p>` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" style="background: #00ff00; color: #000; flex: 1;" 
                                onclick="window.acceptTransferOffer(${offer.listingIndex}, 'loan')">
                            ✅ Aceptar
                        </button>
                        <button class="btn" style="background: #c73446; flex: 1;" 
                                onclick="this.closest('.modal').remove()">
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    }
    
    // Aceptar oferta
    window.acceptTransferOffer = function(listingIndex, type, amount) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const listing = window.transferMarket[listingIndex];
        
        if (!listing) return;
        
        if (type === 'sale') {
            // Venta completada
            gameState.balance += amount;
            
            // Eliminar jugador de la plantilla
            const playerIndex = gameState.squad.findIndex(p => p.name === listing.player.name);
            if (playerIndex !== -1) {
                gameState.squad.splice(playerIndex, 1);
            }
            
            if (window.addNews) {
                window.addNews(
                    `✅ ¡${listing.player.name} vendido por ${amount.toLocaleString('es-ES')}€!`,
                    'success'
                );
            }
            
            alert(`¡Venta completada!\n${listing.player.name} vendido por ${amount.toLocaleString('es-ES')}€`);
            
        } else if (type === 'loan') {
            // Cesión completada
            const playerIndex = gameState.squad.findIndex(p => p.name === listing.player.name);
            if (playerIndex !== -1) {
                const player = gameState.squad[playerIndex];
                player.contractType = 'loan_out';
                player.loanWeeksRemaining = 52; // 1 año
                player.loanWageContribution = listing.wageContribution;
            }
            
            if (window.addNews) {
                window.addNews(
                    `✅ ${listing.player.name} cedido por 1 año (pagas ${listing.wageContribution}% del salario)`,
                    'success'
                );
            }
            
            alert(`¡Cesión completada!\n${listing.player.name} cedido por 1 año.`);
        }
        
        // Eliminar del mercado
        window.transferMarket.splice(listingIndex, 1);
        
        document.querySelector('.modal')?.remove();
        
        // Refrescar UI
        if (window.ui?.refreshUI) {
            window.ui.refreshUI(gameState);
        }
    };

    // ============================================
    // 4. INTEGRAR CON SIMULACIÓN SEMANAL
    // ============================================
    
    // Interceptar simulateWeek para generar ofertas
    const originalSimulateWeek = window.simulateWeek;
    if (originalSimulateWeek) {
        window.simulateWeek = function() {
            // Generar ofertas de transferencia
            if (window.generateTransferOffers) {
                window.generateTransferOffers();
            }
            
            // Llamar a la función original
            return originalSimulateWeek.apply(this, arguments);
        };
    }

    // ============================================
    // 5. SOBRESCRIBIR FUNCIÓN SELLPLAYER ANTIGUA
    // ============================================
    
    window.sellPlayer = function(playerName) {
        window.listPlayerForTransfer(playerName);
    };
    
    window.sellPlayerConfirm = function(playerName) {
        window.listPlayerForTransfer(playerName);
    };

    console.log('✅ Sistema de contratos y transferencias corregido');
    
})();
