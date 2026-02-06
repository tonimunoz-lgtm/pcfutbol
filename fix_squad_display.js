// ============================================
// CORRECCIÓN DE VISUALIZACIÓN DE PLANTILLA
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 Corrigiendo visualización de plantilla...');

    // Interceptar la función de renderizado de plantilla
    const originalRenderSquad = window.renderSquad || window.ui?.renderSquad;
    
    if (!originalRenderSquad) {
        console.warn('No se encontró función renderSquad original');
    }

    // Nueva función para renderizar la plantilla con columnas de contrato
    window.renderSquadWithContracts = function() {
        const gameState = window.gameState || window.gameLogic?.getGameState();
        
        if (!gameState || !gameState.squad) {
            console.error('No hay gameState o squad disponible');
            return;
        }
        
        const squadPage = document.getElementById('squad');
        if (!squadPage) {
            console.error('No se encontró la página squad');
            return;
        }
        
        // Buscar el contenedor de la plantilla
        let squadContainer = squadPage.querySelector('.squad-list') || 
                           squadPage.querySelector('#squadList') ||
                           squadPage.querySelector('[data-squad-list]');
        
        if (!squadContainer) {
            // Si no existe, crearlo
            squadContainer = document.createElement('div');
            squadContainer.className = 'squad-list';
            squadPage.appendChild(squadContainer);
        }
        
        // Limpiar contenedor
        squadContainer.innerHTML = '';
        
        // Crear tabla
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.className = 'squad-table';
        
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
        
        // Renderizar cada jugador
        gameState.squad.forEach((player, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            
            // Estado del jugador (lesión/sanción/apto)
            let statusBadge = '<span style="color: #00ff00;">✅ Apto</span>';
            if (player.isInjured) {
                statusBadge = `<span style="color: #ff0000;">❌ Lesión (${player.weeksOut}sem)</span>`;
            } else if (player.isSuspended) {
                statusBadge = `<span style="color: #FFA500;">⛔ Sanción (${player.suspensionWeeks})</span>`;
            }
            
            // Tarjetas
            if (player.yellowCards > 0) {
                statusBadge += ` <span style="background: #FFD700; color: #000; padding: 2px 5px; border-radius: 3px; font-size: 0.8em;">🟨 ${player.yellowCards}</span>`;
            }
            if (player.redCards > 0) {
                statusBadge += ` <span style="background: #DC143C; color: #fff; padding: 2px 5px; border-radius: 3px; font-size: 0.8em;">🟥 ${player.redCards}</span>`;
            }
            
            // Tipo de contrato
            const contractType = player.contractType === 'loan' ? 'Cedido' : 'Propiedad';
            const contractColor = player.contractType === 'loan' ? '#4169E1' : '#00ff00';
            
            // Duración del contrato
            let duration = '';
            if (player.contractType === 'loan') {
                duration = '1 año (Cesión)';
            } else {
                const years = player.contractYears || 0;
                const color = years <= 1 ? '#ff0000' : (years <= 2 ? '#FFA500' : '#00ff00');
                duration = `<span style="color: ${color};">${years} año${years !== 1 ? 's' : ''}</span>`;
            }
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff;">${player.name}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.position}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.age}</td>
                <td style="padding: 10px; text-align: center; color: #fff;">${player.overall || 65}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center;">
                    <span style="color: ${contractColor}; font-weight: bold;">${contractType}</span>
                </td>
                <td style="padding: 10px; text-align: center;">${duration}</td>
                <td style="padding: 10px; text-align: right; color: #fff;">${(player.salary || 0).toLocaleString('es-ES')}€/sem</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn btn-sm" style="background: #4169E1; margin: 2px; padding: 5px 10px;" 
                            onclick="window.openTrainingModal(${index})">
                        💪 Entrenar
                    </button>
                    <button class="btn btn-sm" style="background: #FFA500; margin: 2px; padding: 5px 10px;" 
                            onclick="window.listPlayerForTransfer('${player.name}')">
                        💰 Vender
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        squadContainer.appendChild(table);
        
        console.log('✅ Plantilla renderizada correctamente con contratos');
    };
    
    // Interceptar openPage para squad
    const originalOpenPage = window.openPage;
    if (originalOpenPage) {
        window.openPage = function(pageName) {
            const result = originalOpenPage.apply(this, arguments);
            
            if (pageName === 'squad') {
                // Esperar un momento para que la página se renderice
                setTimeout(() => {
                    window.renderSquadWithContracts();
                }, 100);
            }
            
            return result;
        };
    }

    console.log('✅ Sistema de visualización de plantilla corregido');
    
})();
