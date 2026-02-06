// ============================================
// CORRECCIÓN COMPLETA - VERSIÓN 2 CORREGIDA
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 [FIX V2 CORREGIDO] Iniciando correcciones completas...');

    // Esperar a que el juego esté completamente cargado
    function waitForGame() {
        if (!window.gameLogic || !window.ui || !window.gameState) {
            console.log('⏳ Esperando a que el juego se cargue...');
            setTimeout(waitForGame, 200);
            return;
        }
        
        console.log('✅ Juego detectado, aplicando correcciones...');
        setTimeout(applyAllFixes, 1000); // Esperar 1 segundo para que TODO esté listo
    }
    
    function applyAllFixes() {
        fixRenewalsPage();
        fixSquadDisplay();
        fixTransferSystem();
        interceptSimulateWeek();
        
        console.log('✅ [FIX V2 CORREGIDO] Todas las correcciones aplicadas');
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
                }, 150);
            }
            
            // Si es la página de plantilla, renderizarla con las nuevas columnas
            if (pageName === 'squad') {
                setTimeout(() => {
                    renderSquadPageFixed();
                }, 150);
            }
        };
        
        console.log('✅ Página de renovaciones corregida');
    }
    
    function renderRenewalsPageFixed() {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        if (!gameState || !gameState.squad) {
            console.error('❌ No hay gameState disponible en renovaciones');
            return;
        }
        
        // IMPORTANTE: Buscar el contenedor correcto que SÍ existe en tu HTML
        const contentContainer = document.getElementById('renewContractsContent');
        
        if (!contentContainer) {
            console.error('❌ No se encontró renewContractsContent');
            return;
        }
        
        // Limpiar
        contentContainer.innerHTML = '';
        
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
        
        // Renderizar jugadores
        gameState.squad.forEach((player) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            
            const contractType = player.contractType === 'loan' ? 'Cedido' : 'Propiedad';
            const contractColor = player.contractType === 'loan' ? '#4169E1' : '#00ff00';
            const years = player.contractType === 'loan' ? '1 (Cesión)' : (player.contractYears || 0);
            const canRenew = player.contractType !== 'loan';
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff; font-weight: bold;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractType}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${years} año${years !== 1 && years !== '1 (Cesión)' ? 's' : ''}</td>
                <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(player.salary || 0).toLocaleString('es-ES')}€/sem</td>
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
        
        contentContainer.appendChild(table);
        console.log(`✅ Renovaciones renderizadas: ${gameState.squad.length} jugadores`);
    }
    
    function openRenewalModal(player) {
        const modal = document.createElement('div');
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); align-items: center; justify-content: center; z-index: 10000;';
        
        const suggestedSalary = Math.round((player.salary || 1000) * 1.15);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 600px; width: 90%;">
                <h2 style="color: #e94560; margin-top: 0; border-bottom: 2px solid #e94560; padding-bottom: 15px;">💼 Renovar - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #00ff00;">📊 Info</h3>
                    <p style="margin: 5px 0;"><strong>Posición:</strong> ${player.position}</p>
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Contrato actual:</strong> ${player.contractYears} año(s)</p>
                    <p style="margin: 5px 0;"><strong>Salario actual:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/sem</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">⏰ Duración:</label>
                    <select id="renewYears" style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #fff; border: 2px solid #e94560; font-size: 1.1em;">
                        <option value="1">1 año</option>
                        <option value="2" selected>2 años</option>
                        <option value="3">3 años</option>
                        <option value="4">4 años</option>
                        <option value="5">5 años</option>
                    </select>
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">💰 Salario semanal:</label>
                    <input type="number" id="renewSalary" value="${suggestedSalary}" min="${Math.round((player.salary || 1000) * 0.8)}" step="100" 
                           style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; font-weight: bold;">
                    <small style="color: #aaa; display: block; margin-top: 5px;">Mínimo: ${Math.round((player.salary || 1000) * 0.8).toLocaleString('es-ES')}€ | Sugerido: ${suggestedSalary.toLocaleString('es-ES')}€</small>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button id="btnRenew" style="flex: 1; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ✅ Ofrecer
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
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
                window.addNews(`✅ ${player.name} renovó por ${years} años y ${salary.toLocaleString('es-ES')}€/sem`, 'success');
            }
            
            alert(`✅ ¡Renovación exitosa!\n\n${player.name}:\n${years} años × ${salary.toLocaleString('es-ES')}€/sem`);
            modal.remove();
            window.openPage('renewContracts');
        } else {
            alert(`❌ ${player.name} rechazó la oferta\n\nIntenta:\n• Más salario\n• Más años`);
        }
    }

    // ============================================
    // 2. CORREGIR VISUALIZACIÓN DE PLANTILLA
    // ============================================
    function fixSquadDisplay() {
        console.log('🔄 Corrigiendo visualización de plantilla...');
        
        // IMPORTANTE: Sobrescribir completamente renderSquadList para evitar duplicados
        const originalRenderSquadList = window.ui.renderSquadList;
        
        window.ui.renderSquadList = function(squad, teamName) {
            const container = document.getElementById('squadList');
            if (!container) {
                console.error('❌ No se encontró squadList');
                return;
            }
            
            // CRÍTICO: Limpiar TODO antes de renderizar
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
            
            squad.forEach((p, idx) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
                
                // Estado
                let status = '<span style="color: #00ff00; font-weight: bold;">✅ Apto</span>';
                if (p.isInjured) {
                    status = `<span style="color: #ff0000; font-weight: bold;">❌ Lesión (${p.weeksOut || 0}sem)</span>`;
                } else if (p.isSuspended) {
                    status = `<span style="color: #FFA500; font-weight: bold;">⛔ Sanción (${p.suspensionWeeks || 0})</span>`;
                }
                
                if (p.yellowCards > 0) {
                    status += ` <span style="background: #FFD700; color: #000; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟨 ${p.yellowCards}</span>`;
                }
                if (p.redCards > 0) {
                    status += ` <span style="background: #DC143C; color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 0.85em; font-weight: bold;">🟥 ${p.redCards}</span>`;
                }
                
                // Contrato
                const cType = p.contractType === 'loan' ? 'Cedido' : 'Propiedad';
                const cColor = p.contractType === 'loan' ? '#4169E1' : '#00ff00';
                
                // Duración
                let duration = '';
                if (p.contractType === 'loan') {
                    duration = '<span style="color: #4169E1; font-weight: bold;">1 (Cesión)</span>';
                } else {
                    const y = p.contractYears || 0;
                    const c = y <= 1 ? '#ff0000' : (y <= 2 ? '#FFA500' : '#00ff00');
                    duration = `<span style="color: ${c}; font-weight: bold;">${y} año${y !== 1 ? 's' : ''}</span>`;
                }
                
                tr.innerHTML = `
                    <td style="padding: 10px; color: #fff; font-weight: bold;">${p.name}</td>
                    <td style="padding: 10px; text-align: center; color: #fff;">${p.position}</td>
                    <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${p.overall || 65}</td>
                    <td style="padding: 10px; text-align: center;">${status}</td>
                    <td style="padding: 10px; text-align: center; color: ${cColor}; font-weight: bold;">${cType}</td>
                    <td style="padding: 10px; text-align: center;">${duration}</td>
                    <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(p.salary || 0).toLocaleString('es-ES')}€</td>
                    <td style="padding: 10px; text-align: center;">
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn-train" style="background: #4169E1; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Entrenar">💪</button>
                            <button class="btn-sell" style="background: #FFA500; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Vender/Ceder">💰</button>
                            <button class="btn-fire" style="background: #DC143C; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold;" title="Despedir">⚠️</button>
                        </div>
                    </td>
                `;
                
                tr.querySelector('.btn-train').onclick = () => {
                    if (window.openTrainingModal) window.openTrainingModal(idx);
                };
                tr.querySelector('.btn-sell').onclick = () => openTransferModal(p);
                tr.querySelector('.btn-fire').onclick = () => firePlayer(p);
                
                tbody.appendChild(tr);
            });
            
            container.appendChild(table);
            console.log(`✅ Plantilla renderizada: ${squad.length} jugadores`);
        };
        
        console.log('✅ renderSquadList sobrescrito completamente (sin duplicados)');
    }

    // ============================================
    // 3. SISTEMA DE TRANSFERENCIAS
    // ============================================
    function fixTransferSystem() {
        console.log('🔄 Instalando sistema de transferencias...');
        
        if (!window.transferMarket) {
            window.transferMarket = [];
        }
        
        // Sobrescribir sellPlayer
        window.sellPlayer = function(playerName) {
            const p = window.gameState.squad.find(x => x.name === playerName);
            if (p) openTransferModal(p);
        };
        
        console.log('✅ Sistema de transferencias instalado');
    }
    
    function openTransferModal(player) {
        const m = createModal();
        const price = Math.floor((player.overall || 65) * 2500);
        
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #e94560; margin: 0 0 20px 0; text-align: center;">💰 Transferir - ${player.name}</h2>
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/sem</p>
                    <p style="margin: 5px 0;"><strong>Valor:</strong> ${price.toLocaleString('es-ES')}€</p>
                </div>
                <button id="bs" style="width: 100%; padding: 15px; background: #FFA500; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">💵 Venta</button>
                <button id="bl" style="width: 100%; padding: 15px; background: #4169E1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">🔄 Cesión</button>
                <button id="bc" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        
        m.querySelector('#bs').onclick = () => { m.remove(); openSaleModal(player, price); };
        m.querySelector('#bl').onclick = () => { m.remove(); openLoanModal(player); };
        m.querySelector('#bc').onclick = () => m.remove();
    }
    
    function openSaleModal(player, price) {
        const m = createModal();
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #FFA500; margin: 0 0 20px 0;">💵 Vender - ${player.name}</h2>
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">Precio:</label>
                <input type="number" id="pr" value="${price}" min="1000" step="1000" style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; margin-bottom: 20px;">
                <button id="ok" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ Confirmar</button>
                <button id="cc" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        m.querySelector('#ok').onclick = () => { listForSale(player, parseInt(m.querySelector('#pr').value)); m.remove(); };
        m.querySelector('#cc').onclick = () => m.remove();
    }
    
    function openLoanModal(player) {
        const m = createModal();
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #4169E1; margin: 0 0 20px 0;">🔄 Ceder - ${player.name}</h2>
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">% salario que pagas:</label>
                <input type="range" id="sl" min="0" max="100" value="50" style="width: 100%; margin-bottom: 10px;">
                <div style="text-align: center; color: #00ff00; margin-bottom: 20px; font-size: 1.5em; font-weight: bold;"><span id="v">50</span>%</div>
                <button id="ok" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ Confirmar</button>
                <button id="cc" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        const sl = m.querySelector('#sl');
        const v = m.querySelector('#v');
        sl.oninput = () => v.textContent = sl.value;
        m.querySelector('#ok').onclick = () => { listForLoan(player, parseInt(sl.value)); m.remove(); };
        m.querySelector('#cc').onclick = () => m.remove();
    }
    
    function listForSale(player, price) {
        window.transferMarket.push({ player: {...player}, type: 'sale', price: price, listedWeek: window.gameState.week });
        if (window.addNews) window.addNews(`📢 ${player.name} en venta por ${price.toLocaleString('es-ES')}€`, 'info');
        alert(`✅ ${player.name} en venta`);
    }
    
    function listForLoan(player, wage) {
        window.transferMarket.push({ player: {...player}, type: 'loan', wagePercent: wage, listedWeek: window.gameState.week });
        if (window.addNews) window.addNews(`📢 ${player.name} en cesión (pagas ${wage}%)`, 'info');
        alert(`✅ ${player.name} en cesión`);
    }
    
    function firePlayer(player) {
        const comp = (player.salary || 1000) * (player.contractWeeks || 52);
        if (!confirm(`⚠️ DESPEDIR A ${player.name}\n\nIndemnización: ${comp.toLocaleString('es-ES')}€\n\n¿Confirmar?`)) return;
        if (window.gameState.balance < comp) { alert('❌ Sin dinero'); return; }
        window.gameState.balance -= comp;
        const idx = window.gameState.squad.findIndex(x => x.name === player.name);
        if (idx !== -1) window.gameState.squad.splice(idx, 1);
        if (window.addNews) window.addNews(`⚠️ ${player.name} despedido. Indemnización: ${comp.toLocaleString('es-ES')}€`, 'warning');
        alert(`✅ ${player.name} despedido`);
        window.openPage('squad');
    }

    // ============================================
    // 4. GENERAR OFERTAS SEMANALMENTE
    // ==========================================
    function interceptSimulateWeek() {
        const orig = window.simulateWeek;
        if (!orig) return;
        
        window.simulateWeek = function() {
            generateOffers();
            return orig.apply(this, arguments);
        };
        
        console.log('✅ simulateWeek interceptado');
    }
    
    function generateOffers() {
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        const teams = ['Real Madrid', 'Atlético', 'Barcelona', 'Sevilla', 'Valencia', 'Betis'];
        
        window.transferMarket.forEach((listing, idx) => {
            const weeks = window.gameState.week - listing.listedWeek;
            if (Math.random() < Math.min(0.3 + weeks * 0.1, 0.7)) {
                const club = teams[Math.floor(Math.random() * teams.length)];
                const offer = Math.floor(listing.price * (0.7 + Math.random() * 0.4));
                
                if (window.addNews) window.addNews(`📨 OFERTA: ${club} ofrece ${offer.toLocaleString('es-ES')}€ por ${listing.player.name}`, 'info');
                
                setTimeout(() => showOffer(listing, idx, club, offer), 500);
            }
        });
    }
    
    function showOffer(listing, idx, club, offer) {
        const m = createModal();
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #00ff00; margin: 0 0 20px 0; text-align: center;">📨 Oferta</h2>
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                    <p><strong>${club}</strong> quiere</p>
                    <p style="font-size: 1.3em; color: #00ff00; font-weight: bold;">${listing.player.name}</p>
                    <p style="font-size: 2em; color: #00ff00; font-weight: bold;">${offer.toLocaleString('es-ES')}€</p>
                    <p style="color: #aaa;">Pedías: ${listing.price.toLocaleString('es-ES')}€</p>
                </div>
                <button id="a" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ Aceptar</button>
                <button id="r" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">❌ Rechazar</button>
            </div>
        `;
        m.querySelector('#a').onclick = () => { accept(listing, idx, offer); m.remove(); };
        m.querySelector('#r').onclick = () => { if (window.addNews) window.addNews(`❌ Oferta rechazada`, 'info'); m.remove(); };
    }
    
    function accept(listing, idx, offer) {
        window.gameState.balance += offer;
        const pIdx = window.gameState.squad.findIndex(x => x.name === listing.player.name);
        if (pIdx !== -1) window.gameState.squad.splice(pIdx, 1);
        window.transferMarket.splice(idx, 1);
        if (window.addNews) window.addNews(`✅ ${listing.player.name} vendido por ${offer.toLocaleString('es-ES')}€!`, 'success');
        alert(`✅ Venta!\n${listing.player.name} vendido por ${offer.toLocaleString('es-ES')}€`);
        if (window.ui?.refreshUI) window.ui.refreshUI(window.gameState);
    }
    
    function createModal() {
        const m = document.createElement('div');
        m.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;z-index:10000;';
        document.body.appendChild(m);
        return m;
    }
    
    // Iniciar
    waitForGame();
    
})();
