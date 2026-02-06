// ============================================
// FIX DEFINITIVO - Evento DOMContentLoaded + Delay
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 [FIX DEFINITIVO] Script cargado, esperando inicialización del juego...');
    
    // Esperar a que el DOM esté listo Y el juego inicializado
    window.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM cargado, esperando gameState...');
        waitForGameState();
    });
    
    // Si DOMContentLoaded ya pasó, intentar inmediatamente
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(waitForGameState, 0);
    }
    
    function waitForGameState() {
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkInterval = setInterval(function() {
            attempts++;
            
            // Verificar que TODOS los elementos necesarios estén disponibles
            if (window.gameState && 
                window.openPage && 
                window.ui && 
                window.ui.renderSquadList &&
                window.gameLogic) {
                
                clearInterval(checkInterval);
                console.log('✅ Todos los sistemas del juego detectados, aplicando parches...');
                setTimeout(applyPatches, 500); // Esperar medio segundo extra por seguridad
                
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Timeout: No se pudieron cargar los sistemas del juego');
                console.log('Debug - gameState:', !!window.gameState);
                console.log('Debug - openPage:', !!window.openPage);
                console.log('Debug - ui:', !!window.ui);
                console.log('Debug - renderSquadList:', !!window.ui?.renderSquadList);
                console.log('Debug - gameLogic:', !!window.gameLogic);
            }
        }, 100);
    }
    
    function applyPatches() {
        try {
            // 1. Parchear renovaciones (añadir botón cerrar)
            patchRenewalsPage();
            
            // 2. Parchear plantilla (reemplazar render completo)
            patchSquadPage();
            
            // 3. Sobrescribir sellPlayer
            patchSellPlayer();
            
            // 4. Sistema de ofertas
            patchSimulateWeek();
            
            // 5. Inicializar mercado
            if (!window.transferMarket) {
                window.transferMarket = [];
            }
            
            console.log('✅ [FIX DEFINITIVO] Todos los parches aplicados exitosamente');
        } catch (error) {
            console.error('❌ Error aplicando parches:', error);
        }
    }
    
    // ==========================================
    // PARCHEAR RENOVACIONES - AÑADIR BOTÓN CERRAR
    // ==========================================
    function patchRenewalsPage() {
        const originalOpenPage = window.openPage;
        
        window.openPage = function(pageId) {
            // Llamar a la función original
            originalOpenPage.apply(this, arguments);
            
            // Si es renovaciones, añadir botón cerrar
            if (pageId === 'renewContracts') {
                setTimeout(() => {
                    addCloseButtonToRenewals();
                }, 300);
            }
        };
        
        console.log('✅ openPage parcheado para renovaciones');
    }
    
    function addCloseButtonToRenewals() {
        const renewPage = document.getElementById('renewContracts');
        if (!renewPage) return;
        
        // Si ya tiene botón cerrar, salir
        if (renewPage.querySelector('.page-close-btn')) {
            console.log('ℹ️ Botón cerrar ya existe en renovaciones');
            return;
        }
        
        // Buscar el header
        let header = renewPage.querySelector('.page-header');
        
        if (!header) {
            // Crear header si no existe
            header = document.createElement('div');
            header.className = 'page-header';
            header.style.cssText = 'position: relative; padding: 20px; margin-bottom: 20px;';
            
            const h1 = renewPage.querySelector('h1');
            if (h1) {
                renewPage.insertBefore(header, h1);
                header.appendChild(h1);
            } else {
                renewPage.insertBefore(header, renewPage.firstChild);
            }
        }
        
        // Añadir botón cerrar
        const closeBtn = document.createElement('button');
        closeBtn.className = 'page-close-btn';
        closeBtn.textContent = '✖ CERRAR';
        closeBtn.onclick = () => window.closePage('renewContracts');
        closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; padding: 10px 20px; background: #c73446; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 1em;';
        
        header.appendChild(closeBtn);
        console.log('✅ Botón cerrar añadido a renovaciones');
    }
    
    // ==========================================
    // PARCHEAR PLANTILLA - REEMPLAZAR RENDER COMPLETO
    // ==========================================
    function patchSquadPage() {
        const originalRenderSquadList = window.ui.renderSquadList;
        
        window.ui.renderSquadList = function(squad, teamName) {
            const container = document.getElementById('squadList');
            if (!container) {
                console.error('❌ No se encontró squadList');
                return;
            }
            
            // LIMPIAR COMPLETAMENTE el contenedor (evita duplicados)
            container.innerHTML = '';
            
            // Crear tabla desde cero
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '10px';
            
            table.innerHTML = `
                <thead>
                    <tr style="background: rgba(233, 69, 96, 0.3); border-bottom: 2px solid #e94560;">
                        <th style="padding: 10px; text-align: left; color: #fff;">Jugador</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Pos</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Media</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Estado</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Contrato</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Duración</th>
                        <th style="padding: 10px; text-align: right; color: #fff;">Salario</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            
            squad.forEach((p, idx) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
                tr.style.transition = 'background 0.2s';
                tr.onmouseenter = () => tr.style.background = 'rgba(233, 69, 96, 0.1)';
                tr.onmouseleave = () => tr.style.background = 'transparent';
                
                // Estado del jugador
                let statusHTML = '<span style="color: #00ff00; font-weight: bold;">✅ Apto</span>';
                if (p.isInjured) {
                    statusHTML = `<span style="color: #ff0000; font-weight: bold;">❌ Lesión (${p.weeksOut || 0}sem)</span>`;
                } else if (p.isSuspended) {
                    statusHTML = `<span style="color: #FFA500; font-weight: bold;">⛔ Sanción (${p.suspensionWeeks || 0})</span>`;
                }
                
                if (p.yellowCards > 0) {
                    statusHTML += ` <span style="background: #FFD700; color: #000; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟨 ${p.yellowCards}</span>`;
                }
                if (p.redCards > 0) {
                    statusHTML += ` <span style="background: #DC143C; color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟥 ${p.redCards}</span>`;
                }
                
                // Tipo de contrato
                const contractType = p.contractType === 'loan' ? 'Cedido' : 'Propiedad';
                const contractColor = p.contractType === 'loan' ? '#4169E1' : '#00ff00';
                
                // Duración del contrato
                let durationHTML = '';
                if (p.contractType === 'loan') {
                    durationHTML = '<span style="color: #4169E1; font-weight: bold;">1 (Cesión)</span>';
                } else {
                    const years = p.contractYears || 0;
                    const color = years <= 1 ? '#ff0000' : (years <= 2 ? '#FFA500' : '#00ff00');
                    durationHTML = `<span style="color: ${color}; font-weight: bold;">${years} año${years !== 1 ? 's' : ''}</span>`;
                }
                
                tr.innerHTML = `
                    <td style="padding: 10px; color: #fff; font-weight: bold;">${p.name}</td>
                    <td style="padding: 10px; text-align: center; color: #fff;">${p.position}</td>
                    <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${p.overall || 65}</td>
                    <td style="padding: 10px; text-align: center;">${statusHTML}</td>
                    <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractType}</td>
                    <td style="padding: 10px; text-align: center;">${durationHTML}</td>
                    <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(p.salary || 0).toLocaleString('es-ES')}€</td>
                    <td style="padding: 10px; text-align: center;">
                        <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                            <button class="btn-train" style="background: #4169E1; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;" 
                                    onmouseover="this.style.background='#5179f1'" onmouseout="this.style.background='#4169E1'"
                                    title="Entrenar">💪</button>
                            <button class="btn-sell" style="background: #FFA500; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                                    onmouseover="this.style.background='#ffb520'" onmouseout="this.style.background='#FFA500'"
                                    title="Vender/Ceder">💰</button>
                            <button class="btn-fire" style="background: #DC143C; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                                    onmouseover="this.style.background='#ec244c'" onmouseout="this.style.background='#DC143C'"
                                    title="Despedir">⚠️</button>
                        </div>
                    </td>
                `;
                
                // Event listeners
                tr.querySelector('.btn-train').onclick = () => {
                    if (window.openTrainingModal) window.openTrainingModal(idx);
                };
                
                tr.querySelector('.btn-sell').onclick = () => openTransferModal(p);
                tr.querySelector('.btn-fire').onclick = () => firePlayer(p);
                
                tbody.appendChild(tr);
            });
            
            container.appendChild(table);
            console.log(`✅ Plantilla renderizada: ${squad.length} jugadores con nuevas columnas`);
        };
        
        console.log('✅ renderSquadList parcheado completamente');
    }
    
    // ==========================================
    // SOBRESCRIBIR SELLPLAYER
    // ==========================================
    function patchSellPlayer() {
        window.sellPlayer = function(playerName) {
            const player = window.gameState.squad.find(p => p.name === playerName);
            if (player) {
                openTransferModal(player);
            }
        };
        
        console.log('✅ sellPlayer parcheado');
    }
    
    // ==========================================
    // MODALES DE TRANSFERENCIA
    // ==========================================
    function openTransferModal(player) {
        const modal = createModal();
        const suggestedPrice = Math.floor((player.overall || 65) * 2500);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 style="color: #e94560; margin: 0 0 20px 0; text-align: center;">💰 Transferir - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/semana</p>
                    <p style="margin: 5px 0;"><strong>Valor sugerido:</strong> ${suggestedPrice.toLocaleString('es-ES')}€</p>
                </div>
                
                <button id="btnSale" style="width: 100%; padding: 15px; background: #FFA500; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px; transition: all 0.2s;">
                    💵 Poner en VENTA
                </button>
                <button id="btnLoan" style="width: 100%; padding: 15px; background: #4169E1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px; transition: all 0.2s;">
                    🔄 Poner en CESIÓN
                </button>
                <button id="btnCancel" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                    Cancelar
                </button>
            </div>
        `;
        
        // Hover effects
        const btnSale = modal.querySelector('#btnSale');
        btnSale.onmouseenter = () => btnSale.style.background = '#ffb520';
        btnSale.onmouseleave = () => btnSale.style.background = '#FFA500';
        
        const btnLoan = modal.querySelector('#btnLoan');
        btnLoan.onmouseenter = () => btnLoan.style.background = '#5179f1';
        btnLoan.onmouseleave = () => btnLoan.style.background = '#4169E1';
        
        // Actions
        btnSale.onclick = () => {
            modal.remove();
            openSaleModal(player, suggestedPrice);
        };
        
        btnLoan.onclick = () => {
            modal.remove();
            openLoanModal(player);
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function openSaleModal(player, suggestedPrice) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #FFA500; margin: 0 0 20px 0; text-align: center;">💵 Vender - ${player.name}</h2>
                
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">Precio de venta:</label>
                <input type="number" id="salePrice" value="${suggestedPrice}" min="1000" step="1000" 
                       style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; font-weight: bold; margin-bottom: 20px;">
                
                <button id="btnConfirm" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">
                    ✅ Poner a la Venta
                </button>
                <button id="btnCancel" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    Cancelar
                </button>
            </div>
        `;
        
        modal.querySelector('#btnConfirm').onclick = () => {
            const price = parseInt(modal.querySelector('#salePrice').value);
            listPlayerForSale(player, price);
            modal.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function openLoanModal(player) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #4169E1; margin: 0 0 20px 0; text-align: center;">🔄 Ceder - ${player.name}</h2>
                
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">% del salario que pagarás:</label>
                <input type="range" id="wageSlider" min="0" max="100" value="50" style="width: 100%; margin-bottom: 10px;">
                <div style="text-align: center; color: #00ff00; margin-bottom: 20px; font-size: 1.5em; font-weight: bold;">
                    <span id="wageValue">50</span>%
                </div>
                
                <button id="btnConfirm" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">
                    ✅ Poner en Cesión
                </button>
                <button id="btnCancel" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    Cancelar
                </button>
            </div>
        `;
        
        const slider = modal.querySelector('#wageSlider');
        const valueDisplay = modal.querySelector('#wageValue');
        slider.oninput = () => valueDisplay.textContent = slider.value;
        
        modal.querySelector('#btnConfirm').onclick = () => {
            const wagePercent = parseInt(slider.value);
            listPlayerForLoan(player, wagePercent);
            modal.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function listPlayerForSale(player, price) {
        window.transferMarket.push({
            player: {...player},
            type: 'sale',
            price: price,
            listedWeek: window.gameState.week
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} puesto en venta por ${price.toLocaleString('es-ES')}€`, 'info');
        }
        
        alert(`✅ ${player.name} ha sido puesto en venta\n\nRecibirás ofertas en las próximas semanas.`);
    }
    
    function listPlayerForLoan(player, wagePercent) {
        window.transferMarket.push({
            player: {...player},
            type: 'loan',
            wagePercent: wagePercent,
            listedWeek: window.gameState.week
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} puesto en cesión (pagas ${wagePercent}% del salario)`, 'info');
        }
        
        alert(`✅ ${player.name} ha sido puesto en cesión`);
    }
    
    function firePlayer(player) {
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        if (!confirm(`⚠️ DESPEDIR A ${player.name}\n\nIndemnización: ${compensation.toLocaleString('es-ES')}€\n\n¿Confirmar?`)) {
            return;
        }
        
        if (window.gameState.balance < compensation) {
            alert('❌ No tienes suficiente dinero para pagar la indemnización');
            return;
        }
        
        window.gameState.balance -= compensation;
        const idx = window.gameState.squad.findIndex(p => p.name === player.name);
        if (idx !== -1) window.gameState.squad.splice(idx, 1);
        
        if (window.addNews) {
            window.addNews(`⚠️ ${player.name} despedido. Indemnización pagada: ${compensation.toLocaleString('es-ES')}€`, 'warning');
        }
        
        alert(`✅ ${player.name} ha sido despedido`);
        window.openPage('squad');
    }
    
    // ==========================================
    // SISTEMA DE OFERTAS
    // ==========================================
    function patchSimulateWeek() {
        const original = window.simulateWeek;
        if (!original) {
            console.warn('⚠️ simulateWeek no encontrado');
            return;
        }
        
        window.simulateWeek = function() {
            // Generar ofertas ANTES de simular
            generateWeeklyOffers();
            
            // Llamar a la función original
            return original.apply(this, arguments);
        };
        
        console.log('✅ simulateWeek parcheado');
    }
    
    function generateWeeklyOffers() {
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        const teams = ['Real Madrid', 'Atlético de Madrid', 'FC Barcelona', 'Sevilla FC', 'Valencia CF', 'Real Betis', 'Athletic Club', 'Real Sociedad'];
        
        window.transferMarket.forEach((listing, idx) => {
            const weeksSinceListed = window.gameState.week - listing.listedWeek;
            const offerChance = Math.min(0.3 + (weeksSinceListed * 0.1), 0.7);
            
            if (Math.random() < offerChance) {
                const buyingClub = teams[Math.floor(Math.random() * teams.length)];
                const offerAmount = Math.floor(listing.price * (0.7 + Math.random() * 0.4));
                
                if (window.addNews) {
                    window.addNews(
                        `📨 OFERTA RECIBIDA: ${buyingClub} ofrece ${offerAmount.toLocaleString('es-ES')}€ por ${listing.player.name}`,
                        'info'
                    );
                }
                
                // Mostrar modal de oferta
                setTimeout(() => {
                    showOfferModal(listing, idx, buyingClub, offerAmount);
                }, 500);
            }
        });
    }
    
    function showOfferModal(listing, listingIndex, buyingClub, offerAmount) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 style="color: #00ff00; margin: 0 0 20px 0; text-align: center;">📨 Oferta Recibida</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                    <p style="font-size: 1.1em; margin-bottom: 10px;"><strong>${buyingClub}</strong> quiere fichar a</p>
                    <p style="font-size: 1.3em; color: #00ff00; font-weight: bold; margin: 10px 0;">${listing.player.name}</p>
                    <p style="font-size: 2em; color: #00ff00; font-weight: bold; margin: 15px 0;">${offerAmount.toLocaleString('es-ES')}€</p>
                    <p style="color: #aaa; font-size: 0.9em;">Precio pedido: ${listing.price.toLocaleString('es-ES')}€</p>
                </div>
                
                <button id="btnAccept" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">
                    ✅ Aceptar Oferta
                </button>
                <button id="btnReject" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                    ❌ Rechazar Oferta
                </button>
            </div>
        `;
        
        modal.querySelector('#btnAccept').onclick = () => {
            acceptOffer(listing, listingIndex, offerAmount);
            modal.remove();
        };
        
        modal.querySelector('#btnReject').onclick = () => {
            if (window.addNews) {
                window.addNews(`❌ Has rechazado la oferta de ${buyingClub} por ${listing.player.name}`, 'info');
            }
            modal.remove();
        };
    }
    
    function acceptOffer(listing, listingIndex, offerAmount) {
        // Añadir dinero
        window.gameState.balance += offerAmount;
        
        // Eliminar jugador de la plantilla
        const playerIndex = window.gameState.squad.findIndex(p => p.name === listing.player.name);
        if (playerIndex !== -1) {
            window.gameState.squad.splice(playerIndex, 1);
        }
        
        // Eliminar del mercado
        window.transferMarket.splice(listingIndex, 1);
        
        if (window.addNews) {
            window.addNews(
                `✅ ¡VENTA COMPLETADA! ${listing.player.name} vendido por ${offerAmount.toLocaleString('es-ES')}€`,
                'success'
            );
        }
        
        alert(`✅ ¡Venta completada!\n\n${listing.player.name} vendido por ${offerAmount.toLocaleString('es-ES')}€\n\nNuevo saldo: ${window.gameState.balance.toLocaleString('es-ES')}€`);
        
        // Refrescar UI
        if (window.ui && window.ui.refreshUI) {
            window.ui.refreshUI(window.gameState);
        }
    }
    
    // ==========================================
    // UTILIDADES
    // ==========================================
    function createModal() {
        const modal = document.createElement('div');
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s;';
        document.body.appendChild(modal);
        return modal;
    }
    
})();
