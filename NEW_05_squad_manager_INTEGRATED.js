// ============================================================================
// 05_squad_manager_INTEGRATED.js
// Gestor de Plantilla con Renderizado Mejorado
// ============================================================================

(function() {
    'use strict';
    
    console.log('👥 Gestor de Plantilla: Iniciando...');
    
    // ============================================================================
    // RENDERIZADO DE PLANTILLA
    // ============================================================================
    
    function renderSquadList(squad, teamName, gameState) {
        const container = document.getElementById('squadList');
        if (!container) {
            console.error('❌ No se encontró #squadList');
            return;
        }
        
        // LIMPIAR COMPLETAMENTE
        container.innerHTML = '';
        
        if (!squad || squad.length === 0) {
            container.innerHTML = '<p style="color: #fff; text-align: center; padding: 20px;">No hay jugadores en la plantilla</p>';
            return;
        }
        
        // Crear tabla
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '10px';
        
        table.innerHTML = `
            <thead>
                <tr style="background: rgba(233, 69, 96, 0.3); border-bottom: 2px solid #e94560;">
                    <th style="padding: 10px; text-align: left; color: #fff;">Jugador</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Pos</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Edad</th>
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
        
        squad.forEach((player, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            tr.style.transition = 'background 0.2s';
            tr.onmouseenter = () => tr.style.background = 'rgba(233, 69, 96, 0.1)';
            tr.onmouseleave = () => tr.style.background = 'transparent';
            
            // === ESTADO ===
            let statusHTML = '<span style="color: #00ff00; font-weight: bold;">✅ Apto</span>';
            if (player.isInjured) {
                statusHTML = `<span style="color: #ff0000; font-weight: bold;">❌ Lesión (${player.weeksOut || 0}sem)</span>`;
            } else if (player.isSuspended) {
                statusHTML = `<span style="color: #FFA500; font-weight: bold;">⛔ Sanción (${player.suspensionWeeks || 0})</span>`;
            }
            
            // Tarjetas
            if (player.yellowCards > 0) {
                statusHTML += ` <span style="background: #FFD700; color: #000; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟨${player.yellowCards}</span>`;
            }
            if (player.redCards > 0) {
                statusHTML += ` <span style="background: #DC143C; color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟥${player.redCards}</span>`;
            }
            
            // === TIPO DE CONTRATO ===
            let contractTypeHTML = '';
            let contractColor = '';
            
            if (player.contractType === 'loan') {
                contractTypeHTML = 'Cedido (Entrada)';
                contractColor = '#4169E1';
            } else if (player.contractType === 'loaned_out') {
                contractTypeHTML = `Cedido → ${player.loanedTo || '?'}`;
                contractColor = '#9370DB';
            } else if (player.contractType === 'free_agent') {
                contractTypeHTML = 'Agente Libre';
                contractColor = '#FFA500';
            } else {
                contractTypeHTML = 'Propiedad';
                contractColor = '#00ff00';
            }
            
            // === DURACIÓN ===
            let durationHTML = '';
            if (player.contractType === 'loan') {
                durationHTML = '<span style="color: #4169E1; font-weight: bold;">1 (Cesión)</span>';
            } else if (player.contractType === 'loaned_out') {
                const weeksRemaining = (player.loanEndWeek || 0) - (gameState?.week || 0);
                durationHTML = `<span style="color: #9370DB; font-weight: bold;">${Math.ceil(weeksRemaining / 4)} meses</span>`;
            } else if (player.contractType === 'free_agent') {
                durationHTML = '<span style="color: #FFA500; font-weight: bold;">Expirado</span>';
            } else {
                const years = player.contractYears || 0;
                let color = '#00ff00';
                if (years <= 1) color = '#ff0000';
                else if (years <= 2) color = '#FFA500';
                
                durationHTML = `<span style="color: ${color}; font-weight: bold;">${years} año${years !== 1 ? 's' : ''}</span>`;
            }
            
            // === BOTONES ===
            // Los jugadores cedidos fuera no tienen acciones disponibles
            const isLoanedOut = player.contractType === 'loaned_out';
            const actionsHTML = isLoanedOut ? 
                '<span style="color: #aaa; font-size: 0.9em;">En cesión</span>' :
                `<div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-train" style="background: #4169E1; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;" 
                            onmouseover="this.style.background='#5179f1'" onmouseout="this.style.background='#4169E1'"
                            title="Entrenar">💪</button>
                    <button class="btn-sell" style="background: #FFA500; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                            onmouseover="this.style.background='#ffb520'" onmouseout="this.style.background='#FFA500'"
                            title="Vender/Ceder">💰</button>
                    <button class="btn-fire" style="background: #DC143C; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                            onmouseover="this.style.background='#ec244c'" onmouseout="this.style.background='#DC143C'"
                            title="Despedir">⚠️</button>
                </div>`;
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff; font-weight: bold;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.age}</td>
                <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${player.overall || 65}</td>
                <td style="padding: 10px; text-align: center;">${statusHTML}</td>
                <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractTypeHTML}</td>
                <td style="padding: 10px; text-align: center;">${durationHTML}</td>
                <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(player.salary || 0).toLocaleString('es-ES')}€/sem</td>
                <td style="padding: 10px; text-align: center;">${actionsHTML}</td>
            `;
            
            if (!isLoanedOut) {
                // Event listeners
                const btnTrain = tr.querySelector('.btn-train');
                const btnSell = tr.querySelector('.btn-sell');
                const btnFire = tr.querySelector('.btn-fire');
                
                if (btnTrain) {
                    btnTrain.onclick = () => {
                        if (window.openTrainingModal) {
                            window.openTrainingModal(index);
                        }
                    };
                }
                
                if (btnSell) {
                    btnSell.onclick = () => {
                        openTransferModal(player, gameState);
                    };
                }
                
                if (btnFire) {
                    btnFire.onclick = () => {
                        firePlayerWithConfirmation(player, gameState);
                    };
                }
            }
            
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
        console.log(`✅ Plantilla renderizada: ${squad.length} jugadores`);
    }
    
    // ============================================================================
    // MODALES
    // ============================================================================
    
    function openTransferModal(player, gameState) {
        const modal = createModal();
        const suggestedPrice = Math.floor((player.overall || 65) * 2500);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 style="color: #e94560; margin: 0 0 20px 0; text-align: center;">💰 Transferir - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Posición:</strong> ${player.position}</p>
                    <p style="margin: 5px 0;"><strong>Edad:</strong> ${player.age} años</p>
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario actual:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/semana</p>
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
        
        modal.querySelector('#btnSale').onclick = () => {
            modal.remove();
            openSaleModal(player, suggestedPrice, gameState);
        };
        
        modal.querySelector('#btnLoan').onclick = () => {
            modal.remove();
            openLoanModal(player, gameState);
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function openSaleModal(player, suggestedPrice, gameState) {
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
            
            if (window.TransferContractsSystem) {
                const result = window.TransferContractsSystem.listPlayerForSale(player, price, gameState);
                
                if (result.success) {
                    alert(result.message);
                    modal.remove();
                    
                    // Refrescar plantilla
                    if (window.openPage) {
                        setTimeout(() => window.openPage('squad'), 100);
                    }
                } else {
                    alert('❌ ' + result.message);
                }
            } else {
                alert('❌ Sistema de transferencias no disponible');
            }
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function openLoanModal(player, gameState) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #4169E1; margin: 0 0 20px 0; text-align: center;">🔄 Ceder - ${player.name}</h2>
                
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">% del salario que pagarás:</label>
                <input type="range" id="wageSlider" min="0" max="100" value="50" style="width: 100%; margin-bottom: 10px;">
                <div style="text-align: center; color: #00ff00; margin-bottom: 20px; font-size: 1.5em; font-weight: bold;">
                    <span id="wageValue">50</span>%
                </div>
                
                <p style="color: #aaa; font-size: 0.9em; margin-bottom: 20px;">
                    El jugador volverá a tu plantilla después de 1 año (52 semanas)
                </p>
                
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
            
            if (window.TransferContractsSystem) {
                const result = window.TransferContractsSystem.listPlayerForLoan(player, wagePercent, gameState);
                
                if (result.success) {
                    alert(result.message);
                    modal.remove();
                    
                    // Refrescar plantilla
                    if (window.openPage) {
                        setTimeout(() => window.openPage('squad'), 100);
                    }
                } else {
                    alert('❌ ' + result.message);
                }
            } else {
                alert('❌ Sistema de transferencias no disponible');
            }
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function firePlayerWithConfirmation(player, gameState) {
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        const confirmed = confirm(
            `⚠️ DESPEDIR A ${player.name}\n\n` +
            `Indemnización a pagar: ${compensation.toLocaleString('es-ES')}€\n` +
            `Tu saldo actual: ${(gameState?.balance || 0).toLocaleString('es-ES')}€\n\n` +
            `¿Estás seguro?`
        );
        
        if (!confirmed) return;
        
        if (window.TransferContractsSystem) {
            const result = window.TransferContractsSystem.firePlayer(player, gameState);
            
            if (result.success) {
                alert(result.message);
                
                // Refrescar plantilla
                if (window.openPage) {
                    setTimeout(() => window.openPage('squad'), 100);
                }
            } else {
                alert('❌ ' + result.message);
            }
        } else {
            alert('❌ Sistema de transferencias no disponible');
        }
    }
    
    // ============================================================================
    // UTILIDADES
    // ============================================================================
    
    function createModal() {
        const modal = document.createElement('div');
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s;';
        document.body.appendChild(modal);
        return modal;
    }
    
    // ============================================================================
    // INTEGRACIÓN CON UI EXISTENTE
    // ============================================================================
    
    // Sobrescribir renderSquadList cuando esté disponible
    function integrateWithUI() {
        if (window.ui && window.ui.renderSquadList) {
            // Guardar referencia al gameState
            const originalRender = window.ui.renderSquadList;
            
            // Intentar sobrescribir con Object.defineProperty
            try {
                Object.defineProperty(window.ui, 'renderSquadList', {
                    value: function(squad, teamName) {
                        const gameState = window.gameLogic?.getGameState();
                        renderSquadList(squad, teamName, gameState);
                    },
                    writable: true,
                    configurable: true
                });
                console.log('✅ renderSquadList sobrescrito con Object.defineProperty');
            } catch (e) {
                // Si falla, interceptar openPage como fallback
                console.warn('⚠️ No se pudo sobrescribir renderSquadList, usando fallback');
                interceptOpenPage();
            }
        } else {
            // Esperar y reintentar
            setTimeout(integrateWithUI, 500);
        }
    }
    
    function interceptOpenPage() {
        if (!window.openPage) {
            setTimeout(interceptOpenPage, 500);
            return;
        }
        
        const originalOpenPage = window.openPage;
        
        window.openPage = function(pageId) {
            // Llamar original
            originalOpenPage.apply(this, arguments);
            
            // Si es plantilla, renderizar nuestra versión
            if (pageId === 'squad') {
                setTimeout(() => {
                    const gameState = window.gameLogic?.getGameState();
                    if (gameState && gameState.squad) {
                        renderSquadList(gameState.squad, gameState.team, gameState);
                    }
                }, 200);
            }
        };
        
        console.log('✅ openPage interceptado para plantilla');
    }
    
    // Iniciar integración
    setTimeout(integrateWithUI, 1000);
    
    // ============================================================================
    // EXPONER FUNCIONES
    // ============================================================================
    
    window.SquadManager = {
        renderSquadList
    };
    
    console.log('✅ Gestor de Plantilla: Cargado correctamente');
    
})();
