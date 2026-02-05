// contractsInjector.js - VERSIÓN CORREGIDA (SIN ERROR DE SINTAXIS)
(function contractsInjector() {
    console.log("🚀 Contracts Injector: Iniciando...");
    
    const WAIT_INTERVAL = 300; 
    const MAX_TRIES = 100;      
    let tries = 0;
    let systemInitialized = false;

    function initContractsSystem() {
        if (systemInitialized) {
            console.log("⚠️ Sistema de contratos ya inicializado");
            return;
        }

        console.log("🚀 Contracts Injector: Inicializando sistema de contratos...");

        // Inicializar campos de contratos en jugadores existentes
        if (window.gameState && window.gameState.squad) {
            gameState.squad.forEach(p => {
                if (p.contractType === undefined) p.contractType = 'owned'; 
                if (p.contractYears === undefined) p.contractYears = Math.floor(Math.random() * 4) + 1;
            });
            console.log(`✅ Inicializados contratos para ${gameState.squad.length} jugadores`);
        }

        // Inyectar el botón de Renovar
        setTimeout(() => injectRenovarButton(), 500);

        if (window.addNews) {
            notifyPendingRenewals();
        }

        hookEndOfSeason();
        hookOpenPage();

        systemInitialized = true;
        console.log("✅ Contracts Injector: Sistema de contratos inicializado correctamente.");
    }

    // Esperar a que todo esté listo
    const waitForGame = setInterval(() => {
        // Verificar que todas las dependencias estén disponibles
        const transfersPage = document.getElementById('transfers');
        const ready = window.gameState && 
                     window.addNews && 
                     window.openPage && 
                     transfersPage;

        if (ready) {
            clearInterval(waitForGame);
            console.log("✅ Dependencias del juego encontradas");
            initContractsSystem();
        } else {
            tries++;
            if (tries % 10 === 0) {
                console.log(`⏳ Esperando dependencias... (intento ${tries}/${MAX_TRIES})`);
            }
        }

        if (tries > MAX_TRIES) {
            clearInterval(waitForGame);
            console.error("❌ Contracts Injector: Timeout - No se encontraron las dependencias");
        }
    }, WAIT_INTERVAL);

    // Hook para interceptar openPage
    function hookOpenPage() {
        if (!window.openPage) {
            console.warn("⚠️ window.openPage no disponible para hook");
            return;
        }

        const originalOpenPage = window.openPage;
        window.openPage = function(pageId) {
            originalOpenPage(pageId);
            
            if (pageId === 'renewContracts') {
                setTimeout(openRenovarView, 100);
            }
            
            if (pageId === 'transfers') {
                setTimeout(injectRenovarButton, 200);
            }
        };
        console.log("✅ Hook de openPage instalado");
    }

    // Inyecta botón "Renovar" en la sección Fichajes
    function injectRenovarButton() {
        // Verificar si ya existe
        if (document.getElementById('btn-renovar-contracts')) {
            console.log("ℹ️ Botón Renovar ya existe");
            return;
        }

        // Buscar el cuadrante de Fichajes
        const fichajesQuadrant = document.querySelector('.quadrant.bottom-left');
        
        if (!fichajesQuadrant) {
            console.warn('⚠️ No se encontró el cuadrante de Fichajes (.quadrant.bottom-left)');
            return;
        }

        // Buscar el botón de Cantera
        const allButtons = fichajesQuadrant.querySelectorAll('button');
        let canteraBtn = null;
        
        for (let btn of allButtons) {
            if (btn.textContent && /cantera/i.test(btn.textContent)) {
                canteraBtn = btn;
                break;
            }
        }

        if (!canteraBtn) {
            console.warn('⚠️ No se encontró el botón de Cantera');
            return;
        }

        // Crear el botón de Renovar
        const renovarBtn = document.createElement('button');
        renovarBtn.id = 'btn-renovar-contracts';
        renovarBtn.className = 'menu-button orange-button';
        renovarBtn.textContent = '💰 Renovar Contratos';
        renovarBtn.onclick = () => {
            console.log("🖱️ Click en Renovar Contratos");
            window.openPage('renewContracts');
        };

        // Insertar antes del botón de Cantera
        canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
        console.log('✅ Botón "Renovar Contratos" inyectado correctamente');
    }

    // Abrir vista de Renovar
    function openRenovarView() {
        console.log("📄 Abriendo vista de renovaciones...");
        
        const contentContainer = document.getElementById('renewContractsContent');
        
        if (!contentContainer) {
            console.error("❌ Error: Elemento 'renewContractsContent' no encontrado.");
            alert("Error: No se puede mostrar la página de renovaciones. Contacta al desarrollador.");
            return;
        }

        contentContainer.innerHTML = '';

        if (!window.gameState || !window.gameState.squad) {
            console.warn("⚠️ gameState o squad no disponibles");
            contentContainer.innerHTML = '<p style="color: #fff; padding: 20px;">No hay jugadores para renovar en este momento.</p>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';
        table.innerHTML = `
            <thead>
                <tr style="background: rgba(233, 69, 96, 0.2); border-bottom: 2px solid #e94560;">
                    <th style="padding: 10px; text-align: left; color: #fff;">Jugador</th>
                    <th style="padding: 10px; text-align: left; color: #fff;">Pos</th>
                    <th style="padding: 10px; text-align: left; color: #fff;">Contrato</th>
                    <th style="padding: 10px; text-align: left; color: #fff;">Años</th>
                    <th style="padding: 10px; text-align: left; color: #fff;">Salario</th>
                    <th style="padding: 10px; text-align: center; color: #fff;">Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        gameState.squad.forEach(player => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
            tr.innerHTML = `
                <td style="padding: 10px; color: #fff;">${player.name}</td>
                <td style="padding: 10px; color: #fff;">${player.position}</td>
                <td style="padding: 10px; color: #fff;">${player.contractType === 'loan' ? 'Cedido' : 'Propiedad'}</td>
                <td style="padding: 10px; color: #fff;">${player.contractType === 'loan' ? '1 (Cesión)' : player.contractYears}</td>
                <td style="padding: 10px; color: #fff;">${player.salary ? player.salary.toLocaleString('es-ES') : 'N/A'}€/sem</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn btn-sm" style="background: #00ff00; color: #000; padding: 5px 15px; border: none; border-radius: 3px; cursor: pointer;" ${player.contractType === 'loan' ? 'disabled' : ''}>
                        Negociar
                    </button>
                </td>
            `;
            
            const btnNegociar = tr.querySelector('button');
            if (player.contractType === 'loan') {
                btnNegociar.style.opacity = '0.5';
                btnNegociar.style.cursor = 'not-allowed';
                btnNegociar.setAttribute('title', 'No se puede renovar a un jugador cedido');
            } else {
                btnNegociar.onclick = () => openRenewNegotiation(player);
            }
            
            tbody.appendChild(tr);
        });

        contentContainer.appendChild(table);
        console.log(`✅ Vista de renovaciones cargada con ${gameState.squad.length} jugadores`);
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
            console.log(`⚠️ ${pending.length} contratos por expirar`);
        }
    }

    function openRenewNegotiation(player) {
        const salary = Math.round(player.salary * 1.1);

        const years = prompt(
            `Negociar renovación con ${player.name}\n\nAños de contrato (1-5):`,
            player.contractYears
        );
        
        if (!years || isNaN(years) || years < 1 || years > 5) {
            console.log("❌ Renovación cancelada o años inválidos");
            return;
        }

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
            console.log(`✅ ${player.name} renovó por ${years} años`);
        } else {
            if (window.addNews) {
                addNews(
                    `❌ ${player.name} ha rechazado la oferta de renovación.`, 
                    'error'
                );
            }
            console.log(`❌ ${player.name} rechazó la renovación`);
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
        if (!window.endSeason) {
            console.warn("⚠️ window.endSeason no disponible para hook");
            return;
        }

        const originalEndSeason = window.endSeason;
        window.endSeason = function () {
            decrementContracts();
            if (originalEndSeason) originalEndSeason.apply(this, arguments);
        };
        console.log("✅ Hook de endSeason instalado");
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
            console.log(`ℹ️ ${freedPlayers.length} jugadores liberados`);
        }

        notifyPendingRenewals();
    }

})();
