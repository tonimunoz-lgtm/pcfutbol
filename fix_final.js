// ============================================
// CORRECCIÓN COMPLETA - VERSIÓN 2
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 [FIX V2] Iniciando correcciones completas...');

    // Esperar a que el juego esté completamente cargado
    function waitForGame() {
        if (!window.gameLogic || !window.ui) {
            console.log('⏳ Esperando a que el juego se cargue...');
            setTimeout(waitForGame, 100);
            return;
        }
        
        console.log('✅ Juego detectado, aplicando correcciones...');
        applyAllFixes();
    }
    
    function applyAllFixes() {
        fixRenewalsPage();
        fixSquadDisplay();
        fixTransferSystem();
        interceptSimulateWeek();
        
        console.log('✅ [FIX V2] Todas las correcciones aplicadas');
    }

    // ============================================
    // 1. CORREGIR PÁGINA DE RENOVACIONES
    // ============================================
    function fixRenewalsPage() {
        console.log('🔄 Corrigiendo página de renovaciones...');
        
        // Interceptar openPage para renovaciones
        const originalOpenPage = window.openPage;
        
        window.openPage = function(pageName) {
            // Llamar a la función original
            if (originalOpenPage) {
                originalOpenPage.apply(this, arguments);
            }
            
            // Si es la página de renovaciones, renderizarla correctamente
            if (pageName === 'renewContracts') {
                setTimeout(() => {
                    renderRenewalsPageFixed();
                }, 100);
            }
            
            // Si es la página de plantilla, renderizarla con las nuevas columnas
            if (pageName === 'squad') {
                setTimeout(() => {
                    renderSquadPageFixed();
                }, 100);
            }
        };
        
        console.log('✅ Página de renovaciones corregida');
    }
    
    function renderRenewalsPageFixed() {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        if (!gameState || !gameState.squad) {
            console.error('❌ No hay gameState disponible');
            return;
        }
        
        // Buscar el contenedor
        const renewPage = document.getElementById('renewContracts');
        if (!renewPage) {
            console.error('❌ No se encontró página renewContracts');
            return;
        }
        
        // Buscar el contenedor de contenido
        let contentContainer = renewPage.querySelector('.page-content') || 
                              renewPage.querySelector('[data-content]');
        
        if (!contentContainer) {
            // Crear contenedor si no existe
            contentContainer = document.createElement('div');
            contentContainer.className = 'page-content';
            contentContainer.style.padding = '20px';
            renewPage.appendChild(contentContainer);
        }
        
        // Limpiar
        contentContainer.innerHTML = '';
        
        // Título
        const title = document.createElement('h2');
        title.textContent = '💼 Renovaciones de Contrato';
        title.style.color = '#00ff00';
        title.style.marginBottom = '20px';
        contentContainer.appendChild(title);
        
        // Crear tabla
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        table.innerHTML = `
            <thead>
                <tr style="background: rgba(233, 69, 96, 0.3);">
                    <th style="padding: 10px; text-align: left; color: #fff;">Jugador</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Pos</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Contrato</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Años</th>
                    <th style="padding: 10px; text-align: right; color: #fff;">Salario</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        // Renderizar jugadores
        gameState.squad.forEach((player, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            
            const contractType = player.contractType === 'loan' ? 'Cedido' : 'Propiedad';
            const years = player.contractType === 'loan' ? '1 (Cesión)' : (player.contractYears || 0);
            const canRenew = player.contractType !== 'loan';
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: ${player.contractType === 'loan' ? '#4169E1' : '#00ff00'};">${contractType}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${years}</td>
                <td style="padding: 10px; text-align: right; color: #fff;">${(player.salary || 0).toLocaleString('es-ES')}€</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn" style="background: ${canRenew ? '#00ff00' : '#666'}; color: #000; padding: 5px 15px; opacity: ${canRenew ? '1' : '0.5'};" 
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
        
        contentContainer.appendChild(table);
        
        console.log(`✅ Tabla de renovaciones renderizada con ${gameState.squad.length} jugadores`);
    }
    
    function openRenewalModal(player) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.8)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        
        const suggestedSalary = Math.round((player.salary || 1000) * 1.15);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #e94560; margin-top: 0;">💼 Renovar a ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Posición:</strong> ${player.position}</p>
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Contrato actual:</strong> ${player.contractYears} año(s)</p>
                    <p style="margin: 5px 0;"><strong>Salario actual:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/sem</p>
                </div>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; color: #fff;">Duración del contrato:</label>
                    <select id="renewYears" style="width: 100%; padding: 8px; border-radius: 5px; background: #1a1a2e; color: #fff; border: 1px solid #e94560;">
                        <option value="1">1 año</option>
                        <option value="2" selected>2 años</option>
                        <option value="3">3 años</option>
                        <option value="4">4 años</option>
                        <option value="5">5 años</option>
                    </select>
                </div>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; color: #fff;">Salario semanal:</label>
                    <input type="number" id="renewSalary" value="${suggestedSalary}" min="${Math.round((player.salary || 1000) * 0.8)}" step="100" 
                           style="width: 100%; padding: 8px; border-radius: 5px; background: #1a1a2e; color: #fff; border: 1px solid #e94560;">
                    <small style="color: #aaa;">Mínimo: ${Math.round((player.salary || 1000) * 0.8).toLocaleString('es-ES')}€</small>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnRenew" style="flex: 1; padding: 10px; background: #00ff00; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ Ofrecer Renovación
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 10px; background: #c73446; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#btnRenew').onclick = () => {
            const years = parseInt(modal.querySelector('#renewYears').value);
            const salary = parseInt(modal.querySelector('#renewSalary').value);
            processRenewal(player, years, salary, modal);
        };
        
        modal.querySelector('#btnCancel').onclick = () => {
            modal.remove();
        };
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
            player.contractType = 'owned';
            
            if (window.addNews) {
                window.addNews(
                    `✅ ¡${player.name} ha aceptado renovar por ${years} años y ${salary.toLocaleString('es-ES')}€/sem!`,
                    'success'
                );
            }
            
            alert(`¡Excelente! ${player.name} ha firmado la renovación.\n\n${years} años × ${salary.toLocaleString('es-ES')}€/semana`);
            
            modal.remove();
            
            // Refrescar
            if (window.openPage) {
                window.openPage('renewContracts');
            }
        } else {
            alert(`${player.name} ha rechazado tu oferta.\n\nIntenta:\n• Aumentar el salario\n• Ofrecer más años`);
        }
    }

    // ============================================
    // 2. CORREGIR VISUALIZACIÓN DE PLANTILLA
    // ============================================
    function fixSquadDisplay() {
        console.log('🔄 Corrigiendo visualización de plantilla...');
    }
    
    function renderSquadPageFixed() {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        if (!gameState || !gameState.squad) {
            console.error('❌ No hay gameState disponible');
            return;
        }
        
        const squadPage = document.getElementById('squad');
        if (!squadPage) {
            console.error('❌ No se encontró página squad');
            return;
        }
        
        // Buscar contenedor
        let contentContainer = squadPage.querySelector('.page-content') || 
                              squadPage.querySelector('[data-content]') ||
                              squadPage.querySelector('.squad-list');
        
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.className = 'page-content';
            contentContainer.style.padding = '20px';
            squadPage.appendChild(contentContainer);
        }
        
        // Limpiar
        contentContainer.innerHTML = '';
        
        // Crear tabla
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        table.innerHTML = `
            <thead>
                <tr style="background: rgba(233, 69, 96, 0.3);">
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
            let statusBadge = '<span style="color: #00ff00;">✅ Apto</span>';
            if (player.isInjured) {
                statusBadge = `<span style="color: #ff0000;">❌ Lesión (${player.weeksOut || 0}sem)</span>`;
            } else if (player.isSuspended) {
                statusBadge = `<span style="color: #FFA500;">⛔ Sanción (${player.suspensionWeeks || 0})</span>`;
            }
            
            if (player.yellowCards > 0) {
                statusBadge += ` <span style="background: #FFD700; color: #000; padding: 2px 5px; border-radius: 3px;">🟨${player.yellowCards}</span>`;
            }
            if (player.redCards > 0) {
                statusBadge += ` <span style="background: #DC143C; color: #fff; padding: 2px 5px; border-radius: 3px;">🟥${player.redCards}</span>`;
            }
            
            // Contrato
            const contractType = player.contractType === 'loan' ? 'Cedido' : 'Propiedad';
            const contractColor = player.contractType === 'loan' ? '#4169E1' : '#00ff00';
            
            // Duración
            let duration = '';
            if (player.contractType === 'loan') {
                duration = '<span style="color: #4169E1;">1 (Cesión)</span>';
            } else {
                const years = player.contractYears || 0;
                const color = years <= 1 ? '#ff0000' : (years <= 2 ? '#FFA500' : '#00ff00');
                duration = `<span style="color: ${color};">${years}</span>`;
            }
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.overall || 65}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractType}</td>
                <td style="padding: 10px; text-align: center;">${duration}</td>
                <td style="padding: 10px; text-align: right; color: #fff;">${(player.salary || 0).toLocaleString('es-ES')}€</td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn-train" style="background: #4169E1; color: #fff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">💪</button>
                        <button class="btn-sell" style="background: #FFA500; color: #fff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">💰</button>
                        <button class="btn-fire" style="background: #DC143C; color: #fff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">⚠️</button>
                    </div>
                </td>
            `;
            
            // Botones
            tr.querySelector('.btn-train').onclick = () => {
                if (window.openTrainingModal) {
                    window.openTrainingModal(index);
                }
            };
            
            tr.querySelector('.btn-sell').onclick = () => {
                openTransferModal(player);
            };
            
            tr.querySelector('.btn-fire').onclick = () => {
                firePlayer(player);
            };
            
            tbody.appendChild(tr);
        });
        
        contentContainer.appendChild(table);
        
        console.log(`✅ Plantilla renderizada con ${gameState.squad.length} jugadores`);
    }

    // ============================================
    // 3. SISTEMA DE TRANSFERENCIAS
    // ============================================
    function fixTransferSystem() {
        console.log('🔄 Instalando sistema de transferencias...');
        
        if (!window.transferMarket) {
            window.transferMarket = [];
        }
    }
    
    function openTransferModal(player) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.8)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        
        const suggestedPrice = Math.floor((player.overall || 65) * 2500 + (player.matches || 0) * 500);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #e94560; margin-top: 0;">💰 Transferir a ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/sem</p>
                    <p style="margin: 5px 0;"><strong>Valor sugerido:</strong> ${suggestedPrice.toLocaleString('es-ES')}€</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="btnSale" style="padding: 15px; background: #FFA500; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        💵 Poner en VENTA
                    </button>
                    <button id="btnLoan" style="padding: 15px; background: #4169E1; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        🔄 Poner en CESIÓN
                    </button>
                    <button id="btnCancel" style="padding: 10px; background: #666; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#btnSale').onclick = () => {
            modal.remove();
            openSaleModal(player, suggestedPrice);
        };
        
        modal.querySelector('#btnLoan').onclick = () => {
            modal.remove();
            openLoanModal(player);
        };
        
        modal.querySelector('#btnCancel').onclick = () => {
            modal.remove();
        };
    }
    
    function openSaleModal(player, suggestedPrice) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.8)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #FFA500; margin-top: 0;">💵 Vender a ${player.name}</h2>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; color: #fff;">Precio de venta:</label>
                    <input type="number" id="salePrice" value="${suggestedPrice}" min="1000" step="1000" 
                           style="width: 100%; padding: 8px; border-radius: 5px; background: #1a1a2e; color: #fff; border: 1px solid #e94560;">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnConfirm" style="flex: 1; padding: 10px; background: #00ff00; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ Poner en Venta
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 10px; background: #666; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#btnConfirm').onclick = () => {
            const price = parseInt(modal.querySelector('#salePrice').value);
            listPlayerForSale(player, price);
            modal.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => {
            modal.remove();
        };
    }
    
    function openLoanModal(player) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.8)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #4169E1; margin-top: 0;">🔄 Ceder a ${player.name}</h2>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; color: #fff;">% del salario que pagarás:</label>
                    <input type="range" id="wageSlider" min="0" max="100" value="50" 
                           style="width: 100%;">
                    <div style="text-align: center; color: #fff; margin-top: 5px;">
                        <span id="wageValue">50</span>%
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnConfirm" style="flex: 1; padding: 10px; background: #00ff00; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ Poner en Cesión
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 10px; background: #666; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const slider = modal.querySelector('#wageSlider');
        const valueDisplay = modal.querySelector('#wageValue');
        slider.oninput = () => {
            valueDisplay.textContent = slider.value;
        };
        
        modal.querySelector('#btnConfirm').onclick = () => {
            const wageContribution = parseInt(slider.value);
            listPlayerForLoan(player, wageContribution);
            modal.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => {
            modal.remove();
        };
    }
    
    function listPlayerForSale(player, price) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        window.transferMarket.push({
            player: { ...player },
            type: 'sale',
            price: price,
            sellingClub: gameState.team,
            listedWeek: gameState.week
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} puesto en venta por ${price.toLocaleString('es-ES')}€`, 'info');
        }
        
        alert(`${player.name} ha sido puesto en venta.\nRecibirás ofertas en las próximas semanas.`);
    }
    
    function listPlayerForLoan(player, wageContribution) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        window.transferMarket.push({
            player: { ...player },
            type: 'loan',
            wageContribution: wageContribution,
            sellingClub: gameState.team,
            listedWeek: gameState.week
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} puesto en cesión (pagas ${wageContribution}%)`, 'info');
        }
        
        alert(`${player.name} ha sido puesto en cesión.`);
    }
    
    function firePlayer(player) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        const confirmed = confirm(
            `⚠️ DESPEDIR A ${player.name}\n\n` +
            `Indemnización: ${compensation.toLocaleString('es-ES')}€\n` +
            `(${player.contractYears} años × ${(player.salary || 0).toLocaleString('es-ES')}€/sem)\n\n` +
            `¿Confirmar?`
        );
        
        if (confirmed) {
            if (gameState.balance < compensation) {
                alert('No tienes suficiente dinero.');
                return;
            }
            
            gameState.balance -= compensation;
            
            const index = gameState.squad.findIndex(p => p.name === player.name);
            if (index !== -1) {
                gameState.squad.splice(index, 1);
            }
            
            if (window.addNews) {
                window.addNews(`⚠️ ${player.name} despedido. Pagada indemnización de ${compensation.toLocaleString('es-ES')}€`, 'warning');
            }
            
            alert(`${player.name} ha sido despedido.`);
            
            if (window.openPage) {
                window.openPage('squad');
            }
        }
    }

    // ============================================
    // 4. GENERAR OFERTAS SEMANALMENTE
    // ============================================
    function interceptSimulateWeek() {
        const original = window.simulateWeek;
        
        if (!original) {
            console.warn('⚠️ No se encontró simulateWeek');
            return;
        }
        
        window.simulateWeek = function() {
            // Generar ofertas
            generateOffers();
            
            // Llamar a original
            return original.apply(this, arguments);
        };
        
        console.log('✅ simulateWeek interceptado para ofertas');
    }
    
    function generateOffers() {
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        window.transferMarket.forEach((listing, index) => {
            const weeksSince = gameState.week - listing.listedWeek;
            const chance = Math.min(0.3 + (weeksSince * 0.1), 0.7);
            
            if (Math.random() < chance) {
                generateOfferFor(listing, index);
            }
        });
    }
    
    function generateOfferFor(listing, listingIndex) {
        const teams = ['Real Madrid', 'Atlético', 'Sevilla', 'Valencia', 'Betis', 'Athletic', 'Villarreal'];
        const buyingClub = teams[Math.floor(Math.random() * teams.length)];
        
        if (listing.type === 'sale') {
            const offer = Math.floor(listing.price * (0.7 + Math.random() * 0.4));
            
            if (window.addNews) {
                window.addNews(`📨 OFERTA: ${buyingClub} ofrece ${offer.toLocaleString('es-ES')}€ por ${listing.player.name}`, 'info');
            }
            
            showOfferModal(listing, listingIndex, buyingClub, offer);
        }
    }
    
    function showOfferModal(listing, listingIndex, buyingClub, offerAmount) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.8)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #00ff00; margin-top: 0;">📨 Oferta Recibida</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <p><strong>${buyingClub}</strong> quiere fichar a <strong>${listing.player.name}</strong></p>
                    <p style="font-size: 1.5em; color: #00ff00; margin: 10px 0;">${offerAmount.toLocaleString('es-ES')}€</p>
                    <p style="color: #aaa;">Precio pedido: ${listing.price.toLocaleString('es-ES')}€</p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button id="btnAccept" style="flex: 1; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ Aceptar
                    </button>
                    <button id="btnReject" style="flex: 1; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ❌ Rechazar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#btnAccept').onclick = () => {
            acceptOffer(listing, listingIndex, offerAmount);
            modal.remove();
        };
        
        modal.querySelector('#btnReject').onclick = () => {
            modal.remove();
        };
    }
    
    function acceptOffer(listing, listingIndex, amount) {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        gameState.balance += amount;
        
        const index = gameState.squad.findIndex(p => p.name === listing.player.name);
        if (index !== -1) {
            gameState.squad.splice(index, 1);
        }
        
        window.transferMarket.splice(listingIndex, 1);
        
        if (window.addNews) {
            window.addNews(`✅ ¡${listing.player.name} vendido por ${amount.toLocaleString('es-ES')}€!`, 'success');
        }
        
        alert(`¡Venta completada!\n${listing.player.name} vendido por ${amount.toLocaleString('es-ES')}€`);
        
        if (window.ui && window.ui.refreshUI) {
            window.ui.refreshUI(gameState);
        }
    }

    // Iniciar
    waitForGame();
    
})();
