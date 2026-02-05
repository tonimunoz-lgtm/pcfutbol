// contractsInjector.js - CORREGIDO para inyectar botón en Fichajes
(function contractsInjector() {
    const WAIT_INTERVAL = 200; 
    const MAX_TRIES = 50;      
    let tries = 0;

    function initContractsSystem() {
        console.log("🚀 Contracts Injector: Inicializando sistema de contratos...");

        if (window.gameState && window.gameState.squad) {
            gameState.squad.forEach(p => {
                if (p.contractType === undefined) p.contractType = 'owned'; 
                if (p.contractYears === undefined) p.contractYears = Math.floor(Math.random() * 4) + 1;
            });
        }

        // Inyectar el botón de Renovar
        setTimeout(() => injectRenovarButton(), 100);

        if (window.addNews) {
            notifyPendingRenewals();
        }

        hookEndOfSeason();
        hookFichajesView();

        console.log("✅ Contracts Injector: Sistema de contratos inicializado.");
    }

    const waitForGame = setInterval(() => {
        if (window.gameState && window.addNews && window.renderSquadList && window.openPage) {
            clearInterval(waitForGame);
            initContractsSystem();

            const originalOpenPage = window.openPage;
            window.openPage = function(pageId) {
                originalOpenPage(pageId);
                if (pageId === 'renewContracts') {
                    setTimeout(openRenovarView, 50);
                }
                if (pageId === 'transfers') {
                    // Re-inyectar el botón cuando se abre la página de fichajes
                    setTimeout(injectRenovarButton, 200); 
                }
                if (pageId === 'transfers' || pageId === 'squad' || pageId === 'tactics') {
                    setTimeout(initContractsSystem, 50);
                }
            };
        }

        if (++tries > MAX_TRIES) {
            clearInterval(waitForGame);
            console.error("❌ Contracts Injector: No se pudo inicializar el sistema después de múltiples intentos.");
        }
    }, WAIT_INTERVAL);

    // Inyecta botón "Renovar" en la sección Fichajes del menú principal
    function injectRenovarButton() {
        // Buscar en el cuadrante inferior izquierdo (bottom-left)
        const fichajesQuadrant = document.querySelector('.quadrant.bottom-left');
        
        if (!fichajesQuadrant) {
            console.warn('⚠️ No se encontró el cuadrante de Fichajes');
            return;
        }

        // Verificar si el botón ya existe
        if (document.getElementById('btn-renovar-contracts')) {
            console.log('ℹ️ Botón Renovar ya existe');
            return;
        }

        // Buscar el botón de Cantera
        const canteraBtn = Array.from(fichajesQuadrant.querySelectorAll('button'))
            .find(b => b.textContent && /cantera/i.test(b.textContent));

        if (canteraBtn) {
            const renovarBtn = document.createElement('button');
            renovarBtn.id = 'btn-renovar-contracts';
            renovarBtn.className = 'menu-button orange-button';
            renovarBtn.textContent = '💰 Renovar Contratos';
            renovarBtn.onclick = () => {
                window.openPage('renewContracts');
            };

            // Insertar antes del botón de Cantera
            canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
            console.log('✅ Botón Renovar Contratos inyectado correctamente');
        } else {
            console.warn('⚠️ No se encontró el botón de Cantera para inyectar Renovar');
        }
    }

    // Abrir vista de Renovar
    function openRenovarView() {
        let contentContainer = document.getElementById('renewContractsContent');
        
        if (!contentContainer) {
            console.error("❌ Error: Elemento 'renewContractsContent' no encontrado.");
            return;
        }

        contentContainer.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Jugador</th>
                    <th>Pos</th>
                    <th>Contrato</th>
                    <th>Años</th>
                    <th>Salario</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        if (!window.gameState || !window.gameState.squad) {
            console.warn("⚠️ Contracts Injector: gameState o gameState.squad no disponibles.");
            contentContainer.innerHTML = '<p>No hay jugadores para renovar en este momento.</p>';
            return;
        }

        gameState.squad.forEach(player => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${player.name}</td>
                <td>${player.position}</td>
                <td>${player.contractType === 'loan' ? 'Cedido' : 'Propiedad'}</td>
                <td>${player.contractType === 'loan' ? '1 (Cesión)' : player.contractYears}</td>
                <td>${player.salary ? player.salary.toLocaleString('es-ES') : 'N/A'}€/sem</td>
                <td>
                    <button class="btn btn-sm btn-success" ${player.contractType === 'loan' ? 'disabled' : ''}>Negociar</button>
                </td>
            `;
            if (player.contractType === 'loan') {
                tr.querySelector('button').setAttribute('title', 'No se puede renovar a un jugador cedido');
            } else {
                tr.querySelector('button').onclick = () => openRenewNegotiation(player);
            }
            tbody.appendChild(tr);
        });

        contentContainer.appendChild(table);
    }

    function notifyPendingRenewals() {
        if (!window.gameState || !window.gameState.squad || !window.addNews) return;

        const pending = gameState.squad.filter(
            p => p.contractType === 'owned' && p.contractYears === 1
        );

        if (pending.length > 0) {
            addNews(
                `[Director Técnico] Hay ${pending.length} jugadores con contrato a punto de expirar.`, 
                'warning'
            );
        }
    }

    function openRenewNegotiation(player) {
        const salary = Math.round(player.salary * 1.1);

        const years = prompt(
            `Negociar renovación con ${player.name}\n\nAños de contrato (1-5):`,
            player.contractYears
        );
        if (!years || isNaN(years) || years < 1 || years > 5) return; 

        const accepted = Math.random() < getRenewalChance(player, salary, years);

        if (accepted) {
            player.contractYears = Number(years);
            player.salary = salary;
            if (window.addNews) {
                addNews(
                    `✅ ${player.name} ha renovado su contrato por ${years} años.`, 
                    'success'
                );
            }
        } else {
            if (window.addNews) {
                addNews(
                    `❌ ${player.name} ha rechazado la oferta de renovación.`, 
                    'error'
                );
            }
        }

        openRenovarView(); 
    }

    function getRenewalChance(player, salary, years) {
        let chance = 0.5;
        if (salary >= player.salary * 1.1) chance += 0.2;
        if (years >= player.contractYears) chance += 0.1;
        if (player.age > 30) chance -= 0.1; 
        if (gameState.popularity > 70) chance += 0.1;
        return Math.min(Math.max(chance, 0.1), 0.9); 
    }

    function hookEndOfSeason() {
        const originalEndSeason = window.endSeason;
        window.endSeason = function () {
            decrementContracts();
            if (originalEndSeason) originalEndSeason.apply(this, arguments);
        };
    }

    function decrementContracts() {
        if (!window.gameState || !window.gameState.squad || !window.addNews) return;

        const freedPlayers = [];
        gameState.squad.forEach(player => {
            if (player.contractType === 'loan') {
                player.contractType = 'owned';
                player.contractYears = 1; 
            } else {
                player.contractYears--;
                if (player.contractYears <= 0) freedPlayers.push(player);
            }
        });

        if (freedPlayers.length > 0) {
            freedPlayers.forEach(p => {
                p.isFreeAgent = true;
                gameState.squad = gameState.squad.filter(pl => pl !== p);
            });
            addNews(
                `[Mercado] ${freedPlayers.length} jugadores han quedado libres al terminar su contrato.`, 
                'info'
            );
        }

        notifyPendingRenewals();
    }

    function hookFichajesView() {
        const originalRenderFichajes = window.renderFichajes;
        if (!originalRenderFichajes) return;

        window.renderFichajes = function () {
            originalRenderFichajes.apply(this, arguments);

            const table = document.querySelector('#fichajes-table tbody');
            if (!table) return;

            if (!gameState.freeAgents) {
                gameState.freeAgents = [];
            }

            const freeAgents = gameState.squad.concat(gameState.freeAgents || [])
                .filter(p => p.isFreeAgent);

            freeAgents.forEach(player => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${player.name}</td>
                    <td>${player.position}</td>
                    <td>${player.age}</td>
                    <td>
                        <button class="btn btn-sm btn-primary">Negociar</button>
                    </td>
                `;
                tr.querySelector('button').onclick = () => openSignContract(player);
                table.appendChild(tr);
            });
        };
    }

    function openSignContract(player) {
        const years = prompt(`Negociar contrato con ${player.name}\n\nAños de contrato (1-5):`, 1);
        if (!years || isNaN(years) || years < 1 || years > 5) return;
        const salary = prompt(`Salario anual para ${player.name}?`, 100000);
        if (!salary || isNaN(salary) || salary <= 0) return;

        player.contractType = 'owned';
        player.contractYears = Number(years);
        player.salary = Number(salary);
        player.isFreeAgent = false;

        if (!gameState.squad.some(p => p.name === player.name)) {
            gameState.squad.push(player);
        }
        
        if (gameState.freeAgents) {
            gameState.freeAgents = gameState.freeAgents.filter(p => p.name !== player.name);
        }
        
        if (window.addNews) {
            addNews(`✅ Has fichado a ${player.name} por ${years} años.`, 'success');
        }
        if (window.renderFichajes) {
            renderFichajes();
        }
    }

})();
