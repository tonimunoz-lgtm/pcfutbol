// contractsInjector.js
(function contractsInjector() {
    const WAIT_INTERVAL = 500;
    const MAX_TRIES = 20;
    let tries = 0;

    // Esperar a que el juego y funciones estén listas
    const waitForGame = setInterval(() => {
        if (window.gameState && window.addNews && window.renderSquadList) {
            clearInterval(waitForGame);
            console.log('🧩 Contracts Injector cargado');
            initContractsSystem();
            hookEndOfSeason();
            hookFichajesView();
        }
        if (++tries > MAX_TRIES) clearInterval(waitForGame);
    }, WAIT_INTERVAL);

    // Inicializa datos de contratos y cedidos si no existen
    function initContractsSystem() {
        gameState.squad.forEach(p => {
            if (p.contractType === undefined) p.contractType = 'owned'; // 'owned' | 'loan'
            if (p.contractYears === undefined) p.contractYears = Math.floor(Math.random() * 4) + 1;
        });

        injectRenovarButton();
        notifyPendingRenewals();
    }

    // Inyecta botón "Renovar" en Fichajes (arriba de Cantera)
    // ---------------------------
// Inyecta botón "Renovar" en Fichajes
// ---------------------------
function injectRenovarButton() {
    let tries = 0;
    const maxTries = 40; // más intentos para esperar a que cargue la página

    const interval = setInterval(() => {
        // Buscamos el botón "Cantera" dentro de varias posibles secciones
        const canteraBtn = Array.from(document.querySelectorAll('button'))
            .find(b => /cantera/i.test(b.textContent));

        // Solo inyectamos si encontramos el botón y aún no existe nuestro botón
        if (canteraBtn && !document.getElementById('btn-renovar')) {
            const renovarBtn = document.createElement('button');
            renovarBtn.id = 'btn-renovar';
            renovarBtn.className = canteraBtn.className; // copia estilo del botón existente
            renovarBtn.textContent = '🔄 Renovar';
            renovarBtn.style.marginBottom = '5px';
            renovarBtn.onclick = () => {
                // Abrimos la página de renovación y cargamos los datos
                window.openPage('renewContracts');
                openRenovarView();
            };

            canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
            console.log('✅ Botón Renovar inyectado en Fichajes');
            clearInterval(interval);
            return;
        }

        tries++;
        if (tries >= maxTries) {
            clearInterval(interval);
            console.warn('⚠️ No se pudo encontrar el botón "Cantera" para inyectar "Renovar"');
        }
    }, 300); // revisamos cada 300ms
}

// ---------------------------
// Llamar a injectRenovarButton cuando se abra la página de Fichajes
// ---------------------------
if (window.openPage) {
    const originalOpenPage = window.openPage;
    window.openPage = function(pageId) {
        originalOpenPage(pageId);
        if (pageId === 'transfers') {
            setTimeout(injectRenovarButton, 300); // espera a que cargue la sección de Fichajes
        }
    };
}

    // ---------------------------
    // Abrir vista de Renovar
    // ---------------------------
    function openRenovarView() {
        const contentContainer = document.getElementById('renewContractsContent');
        if (!contentContainer) {
            console.error("Error: Elemento 'renewContractsContent' no encontrado.");
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

    // Avisos sobre jugadores pendientes de renovar
    function notifyPendingRenewals() {
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

    // Negociación de renovación
    function openRenewNegotiation(player) {
        const salary = Math.round(player.salary * 1.1);

        const years = prompt(
            `Negociar renovación con ${player.name}\nAños de contrato (1-5):`,
            player.contractYears
        );
        if (!years) return;

        const accepted = Math.random() < getRenewalChance(player, salary, years);

        if (accepted) {
            player.contractYears = Number(years);
            player.salary = salary;
            addNews(
                `✅ ${player.name} ha renovado su contrato por ${years} años.`,
                'success'
            );
        } else {
            addNews(
                `❌ ${player.name} ha rechazado la oferta de renovación.`,
                'error'
            );
        }

        openRenovarView(); // refrescar tabla después de negociación
    }

    // Probabilidad de aceptación de renovación
    function getRenewalChance(player, salary, years) {
        let chance = 0.5;
        if (salary >= player.salary * 1.1) chance += 0.2;
        if (years >= player.contractYears) chance += 0.1;
        if (player.age > 30) chance += 0.1;
        if (gameState.popularity > 70) chance += 0.1;
        return Math.min(chance, 0.9);
    }

    // Hook al final de temporada
    function hookEndOfSeason() {
        const originalEndSeason = window.endSeason;
        window.endSeason = function () {
            decrementContracts();
            if (originalEndSeason) originalEndSeason.apply(this, arguments);
        };
    }

    function decrementContracts() {
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

    // Hook para añadir jugadores libres al final de Fichajes
    function hookFichajesView() {
        const originalRenderFichajes = window.renderFichajes;
        if (!originalRenderFichajes) return;

        window.renderFichajes = function () {
            originalRenderFichajes.apply(this, arguments);

            const table = document.querySelector('#fichajes-table tbody');
            if (!table) return;

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
        const years = prompt(`Negociar contrato con ${player.name}\nAños de contrato (1-5):`, 1);
        if (!years) return;
        const salary = prompt(`Salario anual para ${player.name}?`, 100000);
        if (!salary) return;

        player.contractType = 'owned';
        player.contractYears = Number(years);
        player.salary = Number(salary);
        player.isFreeAgent = false;
        gameState.squad.push(player);

        addNews(`✅ Has fichado a ${player.name} por ${years} años.`, 'success');
        renderFichajes();
    }

    // ---------------------------
    // Integración con openPage
    // ---------------------------
    const originalOpenPage = window.openPage;
    window.openPage = function(pageId) {
        if (originalOpenPage) originalOpenPage(pageId);
        if (pageId === 'renewContracts') openRenovarView();
    };

})();
