// contractsInjector.js
(function contractsInjector() {
    const WAIT_INTERVAL = 200;
    const MAX_TRIES = 50;

    console.log('🧩 Contracts Injector cargando...');

    // ---------------------------
    // Espera a que gameState y squad estén cargados
    // ---------------------------
    function waitForSquad(callback) {
        let tries = 0;
        const interval = setInterval(() => {
            if (window.gameState && gameState.squad && gameState.squad.length > 0) {
                clearInterval(interval);
                callback();
            }
            if (++tries > MAX_TRIES) clearInterval(interval);
        }, WAIT_INTERVAL);
    }

    // ---------------------------
    // Inyección del botón Renovar
    // ---------------------------
    function injectRenovarButton() {
        const quadrant = document.querySelector('.bottom-left');
        if (!quadrant) return;

        const observer = new MutationObserver(() => {
            const canteraBtn = Array.from(quadrant.querySelectorAll('button'))
                .find(b => b.textContent.toLowerCase().includes('cantera'));

            if (canteraBtn && !document.getElementById('btn-renovar')) {
                const renovarBtn = document.createElement('button');
                renovarBtn.id = 'btn-renovar';
                renovarBtn.className = canteraBtn.className;
                renovarBtn.textContent = '🔄 Renovar';
                renovarBtn.style.marginBottom = '5px';
                renovarBtn.onclick = openRenovarView;

                canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
                console.log('✅ Botón Renovar inyectado correctamente');

                observer.disconnect();
            }
        });

        observer.observe(quadrant, { childList: true, subtree: true });
    }

    // ---------------------------
    // Inicializa contratos para cada jugador
    // ---------------------------
    function initContractsSystem() {
        gameState.squad.forEach(p => {
            if (p.contractType === undefined) p.contractType = 'owned'; // 'owned' | 'loan'
            if (p.contractYears === undefined) p.contractYears = Math.floor(Math.random() * 4) + 1;
        });

        injectRenovarButton();
        notifyPendingRenewals();
    }

    // ---------------------------
    // Notificaciones de contratos a punto de expirar
    // ---------------------------
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

    // ---------------------------
    // Abrir vista de Renovar
    // ---------------------------
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

    // ---------------------------
    // Negociación de renovación
    // ---------------------------
    function openRenewNegotiation(player) {
        const years = prompt(
            `Negociar renovación con ${player.name}\nAños de contrato (1-5):`,
            player.contractYears
        );
        if (!years) return;

        const salary = Math.round(player.salary * 1.1); // incremento simple
        const accepted = Math.random() < getRenewalChance(player, salary, years);

        if (accepted) {
            player.contractYears = Number(years);
            player.salary = salary;
            addNews(`✅ ${player.name} ha renovado su contrato por ${years} años.`, 'success');
        } else {
            addNews(`❌ ${player.name} ha rechazado la oferta de renovación.`, 'error');
        }

        openRenovarView(); // refresca la tabla
    }

    function getRenewalChance(player, salary, years) {
        let chance = 0.5;
        if (salary >= player.salary * 1.1) chance += 0.2;
        if (years >= player.contractYears) chance += 0.1;
        if (player.age > 30) chance += 0.1;
        if (gameState.popularity > 70) chance += 0.1;
        return Math.min(chance, 0.9);
    }

    // ---------------------------
    // Hook al final de temporada
    // ---------------------------
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

    // ---------------------------
    // Inicialización completa
    // ---------------------------
    waitForSquad(() => {
        console.log('🧩 Contracts Injector inicializando sistema de contratos...');
        initContractsSystem();
        hookEndOfSeason();
    });

})();
