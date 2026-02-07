// ============================================================================
// 06_renewals_manager.js
// Sistema de Renovaciones Integrado con TransferContractsSystem
// ============================================================================

(function() {
    'use strict';
    
    console.log('📝 Sistema de Renovaciones: Iniciando...');
    
    // ============================================================================
    // RENDERIZAR PÁGINA DE RENOVACIONES
    // ============================================================================
    
    function renderRenewalsPage(gameState) {
        const container = document.getElementById('renewContractsContent');
        if (!container) {
            console.error('❌ No se encontró #renewContractsContent');
            return;
        }
        
        container.innerHTML = '';
        
        if (!gameState || !gameState.squad || gameState.squad.length === 0) {
            container.innerHTML = '<p style="color: #fff; text-align: center; padding: 20px;">No hay jugadores en la plantilla</p>';
            return;
        }
        
        // Filtrar solo jugadores propios (no cedidos)
        const ownedPlayers = gameState.squad.filter(p => 
            p.contractType === 'owned' || !p.contractType
        );
        
        if (ownedPlayers.length === 0) {
            container.innerHTML = '<p style="color: #fff; text-align: center; padding: 20px;">No hay jugadores con contratos renovables</p>';
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
                    <th style="padding: 10px; text-align: center; color: #fff;">Contrato</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Duración</th>
                    <th style="padding: 10px; text-align: right; color: #fff;">Salario</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Acción</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        ownedPlayers.forEach(player => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            tr.style.transition = 'background 0.2s';
            tr.onmouseenter = () => tr.style.background = 'rgba(233, 69, 96, 0.1)';
            tr.onmouseleave = () => tr.style.background = 'transparent';
            
            // Duración con color
            const years = player.contractYears || 0;
            let durationColor = '#00ff00';
            if (years <= 1) durationColor = '#ff0000';
            else if (years <= 2) durationColor = '#FFA500';
            
            // Estado del contrato
            let contractStatus = 'Propiedad';
            let statusColor = '#00ff00';
            
            if (player.contractType === 'free_agent') {
                contractStatus = '⚠️ Agente Libre';
                statusColor = '#ff0000';
            }
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff; font-weight: bold;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.age}</td>
                <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${player.overall || 65}</td>
                <td style="padding: 10px; text-align: center; color: ${statusColor}; font-weight: bold;">${contractStatus}</td>
                <td style="padding: 10px; text-align: center; color: ${durationColor}; font-weight: bold;">${years} año${years !== 1 ? 's' : ''}</td>
                <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(player.salary || 0).toLocaleString('es-ES')}€/sem</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-renew" style="background: #00ff00; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                            onmouseover="this.style.background='#00dd00'" onmouseout="this.style.background='#00ff00'">
                        🤝 Negociar
                    </button>
                </td>
            `;
            
            const btnRenew = tr.querySelector('.btn-renew');
            btnRenew.onclick = () => openRenewalModal(player, gameState);
            
            tbody.appendChild(tr);
        });
        
        container.appendChild(table);
        console.log(`✅ Renovaciones renderizadas: ${ownedPlayers.length} jugadores`);
    }
    
    // ============================================================================
    // MODAL DE RENOVACIÓN
    // ============================================================================
    
    function openRenewalModal(player, gameState) {
        const modal = document.createElement('div');
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); align-items: center; justify-content: center; z-index: 10000;';
        
        const suggestedSalary = Math.round((player.salary || 1000) * 1.15);
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 600px; width: 90%;">
                <h2 style="color: #e94560; margin-top: 0; border-bottom: 2px solid #e94560; padding-bottom: 15px;">💼 Renovar Contrato - ${player.name}</h2>
                
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #00ff00;">📊 Información Actual</h3>
                    <p style="margin: 5px 0;"><strong>Posición:</strong> ${player.position}</p>
                    <p style="margin: 5px 0;"><strong>Edad:</strong> ${player.age} años</p>
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${player.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Contrato actual:</strong> ${player.contractYears || 0} año(s)</p>
                    <p style="margin: 5px 0;"><strong>Salario actual:</strong> ${(player.salary || 0).toLocaleString('es-ES')}€/semana</p>
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
                    <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">💰 Salario semanal:</label>
                    <input type="number" id="renewSalary" value="${suggestedSalary}" min="${Math.round((player.salary || 1000) * 0.8)}" step="100" 
                           style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; font-weight: bold;">
                    <small style="color: #aaa; display: block; margin-top: 5px;">
                        Mínimo: ${Math.round((player.salary || 1000) * 0.8).toLocaleString('es-ES')}€ | 
                        Sugerido: ${suggestedSalary.toLocaleString('es-ES')}€
                    </small>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #aaa; font-size: 0.9em;">
                        💡 <strong>Consejo:</strong> Los jugadores aceptan más fácilmente si ofreces:
                    </p>
                    <ul style="color: #aaa; font-size: 0.9em; margin: 10px 0 0 20px;">
                        <li>Salario 15-20% superior al actual</li>
                        <li>Contratos largos (4-5 años)</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button id="btnOffer" style="flex: 1; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ✅ Ofrecer Renovación
                    </button>
                    <button id="btnCancel" style="flex: 1; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#btnOffer').onclick = () => {
            const years = parseInt(modal.querySelector('#renewYears').value);
            const salary = parseInt(modal.querySelector('#renewSalary').value);
            
            processRenewal(player, years, salary, gameState, modal);
        };
        
        modal.querySelector('#btnCancel').onclick = () => modal.remove();
    }
    
    // ============================================================================
    // PROCESAR RENOVACIÓN
    // ============================================================================
    
    function processRenewal(player, years, salary, gameState, modal) {
        if (!window.TransferContractsSystem) {
            alert('❌ Sistema de contratos no disponible');
            modal.remove();
            return;
        }
        
        const result = window.TransferContractsSystem.renewContract(player, years, salary, gameState);
        
        if (result.success) {
            modal.remove();
            
            // Mostrar resultado
            alert(`✅ ¡Renovación exitosa!\n\n${player.name} aceptó:\n${years} años × ${salary.toLocaleString('es-ES')}€/semana`);
            
            // Refrescar página de renovaciones
            if (window.openPage) {
                setTimeout(() => window.openPage('renewContracts'), 100);
            }
        } else {
            // Jugador rechazó
            const retry = confirm(
                `❌ ${result.message}\n\n¿Quieres intentar con otra oferta?`
            );
            
            if (!retry) {
                modal.remove();
            }
            // Si dice que sí, el modal queda abierto para ajustar la oferta
        }
    }
    
    // ============================================================================
    // INTEGRACIÓN CON openPage
    // ============================================================================
    
    function integrateWithOpenPage() {
        if (!window.openPage) {
            setTimeout(integrateWithOpenPage, 500);
            return;
        }
        
        const originalOpenPage = window.openPage;
        
        window.openPage = function(pageId) {
            // Llamar original
            originalOpenPage.apply(this, arguments);
            
            // Si es renovaciones, renderizar
            if (pageId === 'renewContracts') {
                setTimeout(() => {
                    const gameState = window.gameLogic?.getGameState();
                    if (gameState) {
                        renderRenewalsPage(gameState);
                    }
                }, 100);
            }
        };
        
        console.log('✅ Sistema de Renovaciones integrado con openPage');
    }
    
    // Iniciar integración
    setTimeout(integrateWithOpenPage, 1000);
    
    // ============================================================================
    // EXPONER FUNCIONES
    // ============================================================================
    
    window.RenewalsManager = {
        renderRenewalsPage
    };
    
    // Alias para compatibilidad con código antiguo
    window.renderContractsTable = function() {
        const gameState = window.gameLogic?.getGameState();
        if (gameState) {
            renderRenewalsPage(gameState);
        }
    };
    
    console.log('✅ Sistema de Renovaciones: Cargado correctamente');
    
})();
