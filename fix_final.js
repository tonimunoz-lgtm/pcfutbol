// ============================================
// FIX ULTIMATE - Se ejecuta DESPUÉS del juego
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 [FIX ULTIMATE] Esperando carga completa del juego...');
    
    // Esperar 3 segundos para asegurar que TODO esté cargado
    setTimeout(function() {
        if (!window.gameState) {
            console.error('❌ gameState no disponible después de 3 segundos');
            return;
        }
        
        console.log('✅ Juego completamente cargado, aplicando parches...');
        applyPatches();
    }, 3000);
    
    function applyPatches() {
        // 1. Parchear openRenewalUI para añadir botón cerrar
        patchRenewalsPage();
        
        // 2. Parchear renderSquadList para añadir columnas
        patchSquadPage();
        
        // 3. Sobrescribir sellPlayer
        patchSellPlayer();
        
        // 4. Añadir sistema de ofertas
        patchSimulateWeek();
        
        // 5. Inicializar mercado
        if (!window.transferMarket) {
            window.transferMarket = [];
        }
        
        console.log('✅ [FIX ULTIMATE] Todos los parches aplicados');
    }
    
    // ==========================================
    // PARCHEAR RENOVACIONES
    // ==========================================
    function patchRenewalsPage() {
        const original = window.openRenewalUI || window.ContractsSystem?.openRenewalUI;
        
        if (!original) {
            console.warn('⚠️ No se encontró openRenewalUI');
            return;
        }
        
        // Sobrescribir
        const newFunc = function(gameState) {
            // Llamar a la función original
            original.call(this, gameState);
            
            // Esperar a que se renderice y luego añadir nuestras mejoras
            setTimeout(() => {
                enhanceRenewalsPage();
            }, 200);
        };
        
        if (window.openRenewalUI) {
            window.openRenewalUI = newFunc;
        }
        if (window.ContractsSystem?.openRenewalUI) {
            window.ContractsSystem.openRenewalUI = newFunc;
        }
        
        console.log('✅ Renovaciones parcheadas');
    }
    
    function enhanceRenewalsPage() {
        const renewPage = document.getElementById('renewContracts');
        if (!renewPage) return;
        
        // Verificar si ya tiene botón cerrar
        if (renewPage.querySelector('.page-close-btn')) return;
        
        // Buscar el header
        let header = renewPage.querySelector('.page-header');
        if (!header) {
            header = renewPage.querySelector('h1');
            if (header) {
                const newHeader = document.createElement('div');
                newHeader.className = 'page-header';
                header.parentNode.insertBefore(newHeader, header);
                newHeader.appendChild(header);
                header = newHeader;
            }
        }
        
        if (header && !header.querySelector('.page-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'page-close-btn';
            closeBtn.textContent = '✖ CERRAR';
            closeBtn.onclick = () => window.closePage('renewContracts');
            closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; padding: 10px 20px; background: #c73446; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
            header.appendChild(closeBtn);
            console.log('✅ Botón cerrar añadido a renovaciones');
        }
    }
    
    // ==========================================
    // PARCHEAR PLANTILLA
    // ==========================================
    function patchSquadPage() {
        const original = window.ui?.renderSquadList;
        
        if (!original) {
            console.warn('⚠️ No se encontró renderSquadList');
            return;
        }
        
        window.ui.renderSquadList = function(squad, teamName) {
            const container = document.getElementById('squadList');
            if (!container) {
                return original.call(this, squad, teamName);
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
            
            squad.forEach((p, i) => {
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
                const contractType = p.contractType === 'loan' ? 'Cedido' : 'Propiedad';
                const contractColor = p.contractType === 'loan' ? '#4169E1' : '#00ff00';
                
                // Duración
                let duration = '';
                if (p.contractType === 'loan') {
                    duration = '<span style="color: #4169E1; font-weight: bold;">1 (Cesión)</span>';
                } else {
                    const years = p.contractYears || 0;
                    const color = years <= 1 ? '#ff0000' : (years <= 2 ? '#FFA500' : '#00ff00');
                    duration = `<span style="color: ${color}; font-weight: bold;">${years}</span>`;
                }
                
                tr.innerHTML = `
                    <td style="padding: 10px; color: #fff; font-weight: bold;">${p.name}</td>
                    <td style="padding: 10px; text-align: center; color: #fff;">${p.position}</td>
                    <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${p.overall || 65}</td>
                    <td style="padding: 10px; text-align: center;">${status}</td>
                    <td style="padding: 10px; text-align: center; color: ${contractColor}; font-weight: bold;">${contractType}</td>
                    <td style="padding: 10px; text-align: center;">${duration}</td>
                    <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(p.salary || 0).toLocaleString('es-ES')}€</td>
                    <td style="padding: 10px; text-align: center;">
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn-train" style="background: #4169E1; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">💪</button>
                            <button class="btn-sell" style="background: #FFA500; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">💰</button>
                            <button class="btn-fire" style="background: #DC143C; color: #fff; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">⚠️</button>
                        </div>
                    </td>
                `;
                
                tr.querySelector('.btn-train').onclick = () => {
                    if (window.openTrainingModal) window.openTrainingModal(i);
                };
                
                tr.querySelector('.btn-sell').onclick = () => openTransferModal(p);
                tr.querySelector('.btn-fire').onclick = () => firePlayer(p);
                
                tbody.appendChild(tr);
            });
            
            container.appendChild(table);
        };
        
        console.log('✅ Plantilla parcheada');
    }
    
    // ==========================================
    // PARCHEAR VENTA
    // ==========================================
    function patchSellPlayer() {
        window.sellPlayer = function(playerName) {
            const player = window.gameState.squad.find(p => p.name === playerName);
            if (player) openTransferModal(player);
        };
        
        console.log('✅ sellPlayer parcheado');
    }
    
    function openTransferModal(player) {
        const modal = createModal();
        const price = Math.floor((player.overall || 65) * 2500);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #e94560; margin: 0 0 20px 0;">💰 Transferir - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/sem</p>
                    <p style="margin: 5px 0;"><strong>Valor sugerido:</strong> ${price.toLocaleString('es-ES')}€</p>
                </div>
                
                <button id="btnSale" style="width: 100%; padding: 15px; background: #FFA500; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">
                    💵 Poner en VENTA
                </button>
                <button id="btnLoan" style="width: 100%; padding: 15px; background: #4169E1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">
                    🔄 Poner en CESIÓN
                </button>
                <button id="btnCancel" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    Cancelar
                </button>
            </div>
        `;
        
        modal.querySelector('#btnSale').onclick = () => {
            modal.remove();
            const m2 = createModal();
            m2.innerHTML = `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                    <h2 style="color: #FFA500; margin: 0 0 20px 0;">💵 Vender - ${player.name}</h2>
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">Precio:</label>
                    <input type="number" id="price" value="${price}" min="1000" step="1000" 
                           style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; margin-bottom: 20px;">
                    <button id="ok" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">✅ Confirmar</button>
                    <button id="cancel" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                </div>
            `;
            m2.querySelector('#ok').onclick = () => {
                const p = parseInt(m2.querySelector('#price').value);
                window.transferMarket.push({player: {...player}, type: 'sale', price: p, listedWeek: window.gameState.week});
                if (window.addNews) window.addNews(`📢 ${player.name} en venta por ${p.toLocaleString('es-ES')}€`, 'info');
                alert(`✅ ${player.name} en venta`);
                m2.remove();
            };
            m2.querySelector('#cancel').onclick = () => m2.remove();
        };
        
        modal.querySelector('#btnLoan').onclick = () => {
            modal.remove();
            const m2 = createModal();
            m2.innerHTML = `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                    <h2 style="color: #4169E1; margin: 0 0 20px 0;">🔄 Ceder - ${player.name}</h2>
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">% salario que pagas:</label>
                    <input type="range" id="wage" min="0" max="100" value="50" style="width: 100%; margin-bottom: 10px;">
                    <div style="text-align: center; color: #00ff00; margin-bottom: 20px; font-size: 1.5em; font-weight: bold;">
                        <span id="val">50</span>%
                    </div>
                    <button id="ok" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">✅ Confirmar</button>
                    <button id="cancel" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                </div>
            `;
            const slider = m2.querySelector('#wage');
            const val = m2.querySelector('#val');
            slider.oninput = () => val.textContent = slider.value;
            m2.querySelector('#ok').onclick = () => {
                const w = parseInt(slider.value);
                window.transferMarket.push({player: {...player}, type: 'loan', wagePercent: w, listedWeek: window.gameState.week});
                if (window.addNews) window.addNews(`📢 ${player.name} en cesión (pagas ${w}%)`, 'info');
                alert(`✅ ${player.name} en cesión`);
                m2.remove();
            };
            m2.querySelector('#cancel').onclick = () => m2.remove();
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    function firePlayer(player) {
        const comp = (player.salary || 1000) * (player.contractWeeks || 52);
        if (!confirm(`⚠️ DESPEDIR A ${player.name}\n\nIndemnización: ${comp.toLocaleString('es-ES')}€\n\n¿Confirmar?`)) return;
        if (window.gameState.balance < comp) {
            alert('❌ No tienes dinero suficiente');
            return;
        }
        window.gameState.balance -= comp;
        const idx = window.gameState.squad.findIndex(p => p.name === player.name);
        if (idx !== -1) window.gameState.squad.splice(idx, 1);
        if (window.addNews) window.addNews(`⚠️ ${player.name} despedido. Indemnización: ${comp.toLocaleString('es-ES')}€`, 'warning');
        alert(`✅ ${player.name} despedido`);
        window.openPage('squad');
    }
    
    // ==========================================
    // OFERTAS
    // ==========================================
    function patchSimulateWeek() {
        const original = window.simulateWeek;
        if (!original) return;
        
        window.simulateWeek = function() {
            generateOffers();
            return original.apply(this, arguments);
        };
        
        console.log('✅ simulateWeek parcheado');
    }
    
    function generateOffers() {
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        const teams = ['Real Madrid', 'Atlético', 'Sevilla', 'Valencia'];
        
        window.transferMarket.forEach((listing, idx) => {
            const weeks = window.gameState.week - listing.listedWeek;
            if (Math.random() < Math.min(0.3 + weeks * 0.1, 0.7)) {
                const club = teams[Math.floor(Math.random() * teams.length)];
                const offer = Math.floor(listing.price * (0.7 + Math.random() * 0.4));
                
                if (window.addNews) {
                    window.addNews(`📨 OFERTA: ${club} ofrece ${offer.toLocaleString('es-ES')}€ por ${listing.player.name}`, 'info');
                }
                
                const m = createModal();
                m.innerHTML = `
                    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                        <h2 style="color: #00ff00; margin: 0 0 20px 0;">📨 Oferta Recibida</h2>
                        <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                            <p><strong>${club}</strong> quiere fichar a</p>
                            <p style="font-size: 1.3em; color: #00ff00; font-weight: bold; margin: 10px 0;">${listing.player.name}</p>
                            <p style="font-size: 1.8em; color: #00ff00; font-weight: bold;">${offer.toLocaleString('es-ES')}€</p>
                            <p style="color: #aaa;">Pediste: ${listing.price.toLocaleString('es-ES')}€</p>
                        </div>
                        <button id="accept" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">✅ Aceptar</button>
                        <button id="reject" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">❌ Rechazar</button>
                    </div>
                `;
                m.querySelector('#accept').onclick = () => {
                    window.gameState.balance += offer;
                    const pIdx = window.gameState.squad.findIndex(p => p.name === listing.player.name);
                    if (pIdx !== -1) window.gameState.squad.splice(pIdx, 1);
                    window.transferMarket.splice(idx, 1);
                    if (window.addNews) window.addNews(`✅ ${listing.player.name} vendido por ${offer.toLocaleString('es-ES')}€!`, 'success');
                    alert(`✅ Venta completada!\n\n${listing.player.name} vendido por ${offer.toLocaleString('es-ES')}€`);
                    m.remove();
                    if (window.ui?.refreshUI) window.ui.refreshUI(window.gameState);
                };
                m.querySelector('#reject').onclick = () => m.remove();
            }
        });
    }
    
    // ==========================================
    // UTILIDADES
    // ==========================================
    function createModal() {
        const m = document.createElement('div');
        m.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;z-index:10000;';
        document.body.appendChild(m);
        return m;
    }
    
})();
