// contractsInjector.js
(function contractsInjector() {
    const WAIT_INTERVAL = 500;
    const MAX_TRIES = 20;
    let tries = 0;

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
    // Inyecta botón "Renovar" en Fichajes (arriba de Cantera)
function injectRenovarButton() {
    let tries = 0;
    const maxTries = 20;

    const interval = setInterval(() => {
        // Buscamos el botón "Cantera" dentro del cuadrante de Fichajes
        const canteraBtn = Array.from(document.querySelectorAll('.bottom-left button'))
            .find(b => b.textContent.toLowerCase().includes('cantera'));

        if (canteraBtn && !document.getElementById('btn-renovar')) {
            const renovarBtn = document.createElement('button');
            renovarBtn.id = 'btn-renovar';
            renovarBtn.className = canteraBtn.className;
            renovarBtn.textContent = '🔄 Renovar';
            renovarBtn.style.marginBottom = '5px';
            renovarBtn.onclick = openRenovarView;

            canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
            console.log('✅ Botón Renovar inyectado en Fichajes');
            clearInterval(interval);
        }

        tries++;
        if (tries >= maxTries) clearInterval(interval);
    }, 500);
}


    // Renderiza la vista de Renovar (tabla propia)
    function openRenovarView() {
        const container = document.getElementById('main-content') || document.body;
        container.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Jugador</th>
                    <th>Pos</th>
                    <th>Contrato</th>
                    <th>Años</th>
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
                <td>${player.contractType === 'loan' ? 1 : player.contractYears}</td>
                <td>
                    <button class="btn btn-sm btn-success">Negociar</button>
                </td>
            `;
            tr.querySelector('button').onclick = () => openRenewNegotiation(player);
            tbody.appendChild(tr);
        });

        container.appendChild(table);
    }

    // Avisos del DT sobre jugadores pendientes de renovar
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

    // Abrir ventana de negociación de renovación
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

    // Al final de temporada, decrementa años de contrato y libera jugadores
    function decrementContracts() {
        const freedPlayers = [];
        gameState.squad.forEach(player => {
            if (player.contractType === 'loan') {
                // Cedidos vuelven al club propietario
                player.contractType = 'owned';
                player.contractYears = 1;
            } else {
                player.contractYears--;
                if (player.contractYears <= 0) {
                    freedPlayers.push(player);
                }
            }
        });

        if (freedPlayers.length > 0) {
            freedPlayers.forEach(p => {
                // Marcarlos como libres para el mercado de fichajes
                p.isFreeAgent = true;
                gameState.squad = gameState.squad.filter(pl => pl !== p);
            });
            addNews(
                `[Mercado] ${freedPlayers.length} jugadores han quedado libres al terminar su contrato.`,
                'info'
            );
        }

        // Avisar al DT sobre contratos próximos a vencer
        notifyPendingRenewals();
    }

    // Hook para inyectar los jugadores libres en la sección de Fichajes
    function hookFichajesView() {
        const originalRenderFichajes = window.renderFichajes;
        if (!originalRenderFichajes) return;

        window.renderFichajes = function () {
            originalRenderFichajes.apply(this, arguments);

            // Añadir jugadores libres al final de la tabla de fichajes
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

    // Negociación de fichaje de jugador libre
    function openSignContract(player) {
        const years = prompt(`Negociar contrato con ${player.name}\nAños de contrato (1-5):`, 1);
        if (!years) return;

        const salary = prompt(`Salario anual para ${player.name}?`, 100000);
        if (!salary) return;

        // Añadir jugador al equipo si acepta
        player.contractType = 'owned';
        player.contractYears = Number(years);
        player.salary = Number(salary);
        player.isFreeAgent = false;
        gameState.squad.push(player);

        addNews(`✅ Has fichado a ${player.name} por ${years} años.`, 'success');
        renderFichajes(); // refresca la tabla
    }
})();
