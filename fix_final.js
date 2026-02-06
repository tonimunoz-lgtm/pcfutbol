// ============================================
// FIX DEFINITIVO - Se integra con el sistema existente
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 [FIX FINAL] Iniciando correcciones...');
    
    let retryCount = 0;
    const maxRetries = 50;
    
    function waitAndFix() {
        if (!window.gameLogic || !window.openPage || !window.gameState) {
            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(waitAndFix, 200);
            } else {
                console.error('❌ No se pudo cargar el juego después de múltiples intentos');
            }
            return;
        }
        
        console.log('✅ Juego cargado, aplicando correcciones...');
        applyFixes();
    }
    
    function applyFixes() {
        // 1. Interceptar openPage
        interceptOpenPage();
        
        // 2. Interceptar simulateWeek para ofertas
        interceptSimulateWeek();
        
        // 3. Inicializar mercado de transferencias
        if (!window.transferMarket) {
            window.transferMarket = [];
        }
        
        // 4. Sobrescribir función de venta
        overrideSellPlayer();
        
        console.log('✅ [FIX FINAL] Todas las correcciones aplicadas correctamente');
    }
    
    // ==========================================
    // INTERCEPTAR OPENPAGE
    // ==========================================
    function interceptOpenPage() {
        const originalOpenPage = window.openPage;
        
        window.openPage = function(pageId) {
            // Llamar a la función original
            originalOpenPage.apply(this, arguments);
            
            // Aplicar nuestras modificaciones
            setTimeout(() => {
                if (pageId === 'renewContracts') {
                    fixRenewalsPage();
                } else if (pageId === 'squad') {
                    fixSquadPage();
                }
            }, 150);
        };
        
        console.log('✅ openPage interceptado');
    }
    
    // ==========================================
    // CORREGIR PÁGINA DE RENOVACIONES
    // ==========================================
    function fixRenewalsPage() {
        const container = document.getElementById('renewContractsContent');
        if (!container) {
            console.error('❌ No se encontró renewContractsContent');
            return;
        }
        
        const gameState = window.gameState || window.gameLogic.getGameState();
        if (!gameState || !gameState.squad) {
            console.error('❌ No hay gameState disponible');
            return;
        }
        
        // Limpiar
        container.innerHTML = '';
        
        // Crear tabla
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';
        
        table.innerHTML = `
            <thead>
                <tr style="background: rgba(233, 69, 96, 0.3); border-bottom: 2px solid #e94560;">
                    <th style="padding: 10px; text-align: left; color: #fff;">Jugador</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Pos</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Contrato</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Duración</th>
                    <th style="padding: 10px; text-align: right; color: #fff;">Salario</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        gameState.squad.forEach((player) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            
            const contractType = player.contractType === 'loan' ? 'Cedido' : 'Propiedad';
            const contractColor = player.contractType === 'loan' ? '#4169E1' : '#00ff00';
            const years = player.contractType === 'loan' ? '1 (Cesión)' : (player.contractYears || 0);
            const canRenew = player.contractType !== 'loan';
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractType}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${years} año${years !== 1 && years !== '1 (Cesión)' ? 's' : ''}</td>
                <td style="padding: 10px; text-align: right; color: #fff;">${(player.salary || 0).toLocaleString('es-ES')}€/sem</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn" style="background: ${canRenew ? '#00ff00' : '#666'}; color: #000; padding: 8px 20px; border: none; border-radius: 5px; cursor: ${canRenew ? 'pointer' : 'not-allowed'}; opacity: ${canRenew ? '1' : '0.5'}; font-weight: bold;"
                            ${canRenew ? '' : 'disabled'}>
                        🤝 Negociar
                    </button>
                </td>
            `;
            
            const btn = tr.querySelector('button');
            if (canRenew) {
                btn.onclick = () => openRenewalModal(player);
            }
            
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
        console.log(`✅ Renovaciones renderizadas: ${gameState.squad.length} jugadores`);
    }
    
    function openRenewalModal(player) {
        const modal = createModal();
        const suggestedSalary = Math.round((player.salary || 1000) * 1.15);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h2 style="color: #e94560; margin-top: 0; border-bottom: 2px solid #e94560; padding-bottom: 15px;">💼 Renovar Contrato - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #00ff00;">📊 Información del Jugador</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <p style="margin: 5px 0;"><strong>Posición:</strong> ${player.position}</p>
                        <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                        <p style="margin: 5px 0;"><strong>Edad:</strong> ${player.age} años</p>
                        <p style="margin: 5px 0;"><strong>Contrato actual:</strong> ${player.contractYears} año(s)</p>
                    </div>
                    <p style="margin: 10px 0 5px 0;"><strong>Salario actual:</strong> <span style="color: #00ff00; font-size: 1.2em;">${(player.salary || 0).toLocaleString('es-ES')}€/semana</span></p>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">⏰ Duración del nuevo contrato:</label>
                    <select id="renewYears" style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #fff; border: 2px solid #e94560; font-size: 1.1em;">
                        <option value="1">1 año</option>
                        <option value="2" selected>2 años</option>
                        <option value="3">3 años</option>
                        <option value="4">4 años</option>
                        <option value="5">5 años</option>
                    </select>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">💰 Nuevo salario semanal:</label>
                    <input type="number" id="renewSalary" value="${suggestedSalary}" min="${Math.round((player.salary || 1000) * 0.8)}" step="100" 
                           style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; font-weight: bold;">
                    <small style="color: #aaa; display: block; margin-top: 5px;">💡 Mínimo aceptable: ${Math.round((player.salary || 1000) * 0.8).toLocaleString('es-ES')}€ | Sugerido: ${suggestedSalary.toLocaleString('es-ES')}€</small>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button id="btnRenew" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(0, 255, 0, 0.3);">
                        ✅ Ofrecer Renovación
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #c73446 0%, #a02030 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(199, 52, 70, 0.3);">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        modal.querySelector('#btnRenew').onclick = () => {
            const years = parseInt(modal.querySelector('#renewYears').value);
            const salary = parseInt(modal.querySelector('#renewSalary').value);
            processRenewal(player, years, salary, modal);
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function processRenewal(player, years, salary, modal) {
        const salaryRatio = salary / (player.salary || 1000);
        let acceptance = 0.5;
        
        if (salaryRatio >= 1.2) acceptance = 0.9;
        else if (salaryRatio >= 1.1) acceptance = 0.75;
        else if (salaryRatio >= 1.0) acceptance = 0.6;
        else if (salaryRatio >= 0.9) acceptance = 0.4;
        else acceptance = 0.2;
        
        if (years >= 4) acceptance += 0.1;
        
        const accepted = Math.random() < acceptance;
        
        if (accepted) {
            player.contractYears = years;
            player.contractWeeks = years * 52;
            player.salary = salary;
            
            if (window.addNews) {
                window.addNews(`✅ ¡${player.name} renovó por ${years} años y ${salary.toLocaleString('es-ES')}€/sem!`, 'success');
            }
            
            alert(`✅ ¡RENOVACIÓN EXITOSA!\n\n${player.name} ha firmado:\n📅 ${years} años\n💰 ${salary.toLocaleString('es-ES')}€/semana`);
            modal.remove();
            window.openPage('renewContracts');
        } else {
            alert(`❌ ${player.name} rechazó la oferta\n\n💡 Intenta:\n• Aumentar el salario\n• Ofrecer más años`);
        }
    }
    
    // ==========================================
    // CORREGIR PÁGINA DE PLANTILLA
    // ==========================================
    function fixSquadPage() {
        const container = document.getElementById('squadList');
        if (!container) {
            console.error('❌ No se encontró squadList');
            return;
        }
        
        const gameState = window.gameState || window.gameLogic.getGameState();
        if (!gameState || !gameState.squad) {
            console.error('❌ No hay gameState disponible');
            return;
        }
        
        container.innerHTML = '';
        
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
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
        
        gameState.squad.forEach((player, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            
            // Estado
            let statusBadge = '<span style="color: #00ff00; font-weight: bold;">✅ Apto</span>';
            if (player.isInjured) {
                statusBadge = `<span style="color: #ff0000; font-weight: bold;">❌ Lesión (${player.weeksOut || 0}sem)</span>`;
            } else if (player.isSuspended) {
                statusBadge = `<span style="color: #FFA500; font-weight: bold;">⛔ Sanción (${player.suspensionWeeks || 0})</span>`;
            }
            
            if (player.yellowCards > 0) {
                statusBadge += ` <span style="background: #FFD700; color: #000; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟨 ${player.yellowCards}</span>`;
            }
            if (player.redCards > 0) {
                statusBadge += ` <span style="background: #DC143C; color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟥 ${player.redCards}</span>`;
            }
            
            // Contrato
            const contractType = player.contractType === 'loan' ? 'Cedido' : 'Propiedad';
            const contractColor = player.contractType === 'loan' ? '#4169E1' : '#00ff00';
            
            // Duración
            let duration = '';
            if (player.contractType === 'loan') {
                duration = '<span style="color: #4169E1; font-weight: bold;">1 año (Cesión)</span>';
            } else {
                const years = player.contractYears || 0;
                const color = years <= 1 ? '#ff0000' : (years <= 2 ? '#FFA500' : '#00ff00');
                duration = `<span style="color: ${color}; font-weight: bold;">${years} año${years !== 1 ? 's' : ''}</span>`;
            }
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff; font-weight: bold;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${player.overall || 65}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractType}</td>
                <td style="padding: 10px; text-align: center;">${duration}</td>
                <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(player.salary || 0).toLocaleString('es-ES')}€</td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn-train" style="background: #4169E1; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Entrenar">💪</button>
                        <button class="btn-sell" style="background: #FFA500; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Vender/Ceder">💰</button>
                        <button class="btn-fire" style="background: #DC143C; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Despedir">⚠️</button>
                    </div>
                </td>
            `;
            
            tr.querySelector('.btn-train').onclick = () => {
                if (window.openTrainingModal) window.openTrainingModal(index);
            };
            
            tr.querySelector('.btn-sell').onclick = () => openTransferModal(player);
            tr.querySelector('.btn-fire').onclick = () => firePlayer(player);
            
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
        console.log(`✅ Plantilla renderizada: ${gameState.squad.length} jugadores`);
    }
    
    // ==========================================
    // SISTEMA DE TRANSFERENCIAS
    // ==========================================
    function openTransferModal(player) {
        const modal = createModal();
        const suggestedPrice = Math.floor((player.overall || 65) * 2500);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #e94560; margin-top: 0;">💰 Transferir - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/sem</p>
                    <p style="margin: 5px 0;"><strong>Valor sugerido:</strong> ${suggestedPrice.toLocaleString('es-ES')}€</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button id="btnSale" style="padding: 15px; background: #FFA500; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        💵 Poner en VENTA
                    </button>
                    <button id="btnLoan" style="padding: 15px; background: #4169E1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        🔄 Poner en CESIÓN
                    </button>
                    <button id="btnCancel" style="padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        modal.querySelector('#btnSale').onclick = () => {
            modal.remove();
            openSaleModal(player, suggestedPrice);
        };
        
        modal.querySelector('#btnLoan').onclick = () => {
            modal.remove();
            openLoanModal(player);
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function openSaleModal(player, suggestedPrice) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #FFA500; margin-top: 0;">💵 Vender - ${player.name}</h2>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">Precio de venta:</label>
                    <input type="number" id="salePrice" value="${suggestedPrice}" min="1000" step="1000" 
                           style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; font-weight: bold;">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnConfirm" style="flex: 1; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ✅ Confirmar
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 15px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        modal.querySelector('#btnConfirm').onclick = () => {
            const price = parseInt(modal.querySelector('#salePrice').value);
            listForSale(player, price);
            modal.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function openLoanModal(player) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #4169E1; margin-top: 0;">🔄 Ceder - ${player.name}</h2>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">% del salario que pagarás:</label>
                    <input type="range" id="wageSlider" min="0" max="100" value="50" style="width: 100%;">
                    <div style="text-align: center; color: #00ff00; margin-top: 10px; font-size: 1.5em; font-weight: bold;">
                        <span id="wageValue">50</span>%
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnConfirm" style="flex: 1; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ✅ Confirmar
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 15px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        const slider = modal.querySelector('#wageSlider');
        const valueDisplay = modal.querySelector('#wageValue');
        slider.oninput = () => valueDisplay.textContent = slider.value;
        
        modal.querySelector('#btnConfirm').onclick = () => {
            const wage = parseInt(slider.value);
            listForLoan(player, wage);
            modal.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function listForSale(player, price) {
        const gameState = window.gameState || window.gameLogic.getGameState();
        
        window.transferMarket.push({
            player: {...player},
            type: 'sale',
            price: price,
            listedWeek: gameState.week
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} en venta por ${price.toLocaleString('es-ES')}€`, 'info');
        }
        
        alert(`✅ ${player.name} puesto en venta\n\nRecibirás ofertas en las próximas semanas.`);
    }
    
    function listForLoan(player, wagePercent) {
        const gameState = window.gameState || window.gameLogic.getGameState();
        
        window.transferMarket.push({
            player: {...player},
            type: 'loan',
            wagePercent: wagePercent,
            listedWeek: gameState.week
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} en cesión (pagas ${wagePercent}%)`, 'info');
        }
        
        alert(`✅ ${player.name} puesto en cesión`);
    }
    
    function firePlayer(player) {
        const gameState = window.gameState || window.gameLogic.getGameState();
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        if (!confirm(`⚠️ DESPEDIR A ${player.name}\n\nIndemnización: ${compensation.toLocaleString('es-ES')}€\n\n¿Confirmar?`)) {
            return;
        }
        
        if (gameState.balance < compensation) {
            alert('❌ No tienes suficiente dinero');
            return;
        }
        
        gameState.balance -= compensation;
        const index = gameState.squad.findIndex(p => p.name === player.name);
        if (index !== -1) gameState.squad.splice(index, 1);
        
        if (window.addNews) {
            window.addNews(`⚠️ ${player.name} despedido. Pagada indemnización: ${compensation.toLocaleString('es-ES')}€`, 'warning');
        }
        
        alert(`✅ ${player.name} despedido`);
        window.openPage('squad');
    }
    
    // ==========================================
    // GENERAR OFERTAS
    // ==========================================
    function interceptSimulateWeek() {
        const original = window.simulateWeek;
        if (!original) return;
        
        window.simulateWeek = function() {
            generateOffers();
            return original.apply(this, arguments);
        };
        
        console.log('✅ simulateWeek interceptado');
    }
    
    function generateOffers() {
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        const gameState = window.gameState || window.gameLogic.getGameState();
        const teams = ['Real Madrid', 'Atlético', 'Sevilla', 'Valencia', 'Betis'];
        
        window.transferMarket.forEach((listing, index) => {
            const weeksSince = gameState.week - listing.listedWeek;
            if (Math.random() < Math.min(0.3 + weeksSince * 0.1, 0.7)) {
                const club = teams[Math.floor(Math.random() * teams.length)];
                const offer = Math.floor(listing.price * (0.7 + Math.random() * 0.4));
                
                if (window.addNews) {
                    window.addNews(`📨 OFERTA: ${club} ofrece ${offer.toLocaleString('es-ES')}€ por ${listing.player.name}`, 'info');
                }
                
                showOfferModal(listing, index, club, offer);
            }
        });
    }
    
    function showOfferModal(listing, index, club, offer) {
        const modal = createModal();
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #00ff00; margin-top: 0;">📨 Oferta Recibida</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 1.1em;"><strong>${club}</strong> quiere fichar a</p>
                    <p style="font-size: 1.3em; color: #00ff00; font-weight: bold; margin: 10px 0;">${listing.player.name}</p>
                    <p style="font-size: 1.8em; color: #00ff00; font-weight: bold; margin: 15px 0;">${offer.toLocaleString('es-ES')}€</p>
                    <p style="color: #aaa;">Precio pedido: ${listing.price.toLocaleString('es-ES')}€</p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button id="btnAccept" style="flex: 1; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ✅ Aceptar
                    </button>
                    <button id="btnReject" style="flex: 1; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ❌ Rechazar
                    </button>
                </div>
            </div>
        `;
        
        modal.querySelector('#btnAccept').onclick = () => {
            acceptOffer(listing, index, offer);
            modal.remove();
        };
        
        modal.querySelector('#btnReject').onclick = () => modal.remove();
    }
    
    function acceptOffer(listing, index, amount) {
        const gameState = window.gameState || window.gameLogic.getGameState();
        
        gameState.balance += amount;
        const playerIndex = gameState.squad.findIndex(p => p.name === listing.player.name);
        if (playerIndex !== -1) gameState.squad.splice(playerIndex, 1);
        
        window.transferMarket.splice(index, 1);
        
        if (window.addNews) {
            window.addNews(`✅ ${listing.player.name} vendido por ${amount.toLocaleString('es-ES')}€!`, 'success');
        }
        
        alert(`✅ ¡Venta completada!\n\n${listing.player.name} vendido por ${amount.toLocaleString('es-ES')}€`);
        
        if (window.ui && window.ui.refreshUI) {
            window.ui.refreshUI(gameState);
        }
    }
    
    // ==========================================
    // SOBRESCRIBIR SELLPLAYER
    // ==========================================
    function overrideSellPlayer() {
        window.sellPlayer = function(playerName) {
            const gameState = window.gameState || window.gameLogic.getGameState();
            const player = gameState.squad.find(p => p.name === playerName);
            if (player) openTransferModal(player);
        };
        
        console.log('✅ sellPlayer sobrescrito');
    }
    
    // ==========================================
    // UTILIDADES
    // ==========================================
    function createModal() {
        const modal = document.createElement('div');
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.85)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        document.body.appendChild(modal);
        return modal;
    }
    
    // Iniciar
    waitAndFix();
    
})();
