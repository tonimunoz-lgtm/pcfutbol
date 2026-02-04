// contractsInjector.js
(function contractsInjector() {
    const WAIT_INTERVAL = 500;
    const MAX_TRIES = 30;
    let tries = 0;

    const waitForGame = setInterval(() => {
        const squad = window.gameLogic?.getMySquad?.();
        if (squad && window.addNews) {
            clearInterval(waitForGame);
            console.log('🧩 Contracts Injector cargado');
            initContractsSystem();
            injectRenovarButton();
            checkPendingRenewals();
        }

        if (++tries > MAX_TRIES) clearInterval(waitForGame);
    }, WAIT_INTERVAL);

    // =======================================
    // Inicializa contratos si no existen
    // =======================================
    function initContractsSystem() {
        const squad = window.gameLogic.getMySquad();
        squad.forEach(p => {
            if (!p.contractType) p.contractType = 'owned'; // 'owned' o 'loan'
            if (!p.contractYears) p.contractYears = Math.floor(Math.random() * 4) + 1;
        });
    }

    // =======================================
    // Inyecta botón "Renovar" sobre Cantera
    // =======================================
  (function contractsInjector() {
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
                renovarBtn.onclick = () => {
                    console.log('Botón Renovar pulsado');
                    openRenovarView();
                };

                canteraBtn.parentNode.insertBefore(renovarBtn, canteraBtn);
                console.log('✅ Botón Renovar inyectado correctamente');
                observer.disconnect();
            }
        });

        observer.observe(quadrant, { childList: true, subtree: true });
    }

    function waitForSquad() {
        const interval = setInterval(() => {
            if (window.gameState && gameState.squad && gameState.squad.length > 0) {
                clearInterval(interval);
                injectRenovarButton();
            }
        }, 200);
    }

    waitForSquad();

    // Función de ejemplo: abre la vista de renovación
    function openRenovarView() {
        alert('¡Aquí irá la tabla de renovar contratos!');
    }
})();



    // =======================================
    // Crear página Renovar estilo Plantilla
    // =======================================
    function openRenovarView() {
        let renovarPage = document.getElementById('renovar');
        if (!renovarPage) {
            renovarPage = document.createElement('div');
            renovarPage.id = 'renovar';
            renovarPage.className = 'page';
            renovarPage.style.display = 'block';

            renovarPage.innerHTML = `
                <div class="page-header">
                    <h1>🔄 Renovación de Contratos</h1>
                    <button class="page-close-btn" onclick="closePage('renovar')">✖ CERRAR</button>
                </div>
                <div id="renovarContainer" style="max-height: 500px; overflow-y: auto; margin-top: 20px;">
                    <table class="table table-striped" id="renovarTable">
                        <thead>
                            <tr>
                                <th>Jugador</th>
                                <th>Posición</th>
                                <th>Contrato</th>
                                <th>Años</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            `;
            document.body.appendChild(renovarPage);
        }

        // Ocultar otras páginas
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        renovarPage.style.display = 'block';
        renderRenovarTable();
    }

    // =======================================
    // Renderiza tabla estilo Plantilla
    // =======================================
    function renderRenovarTable() {
        const tbody = document.querySelector('#renovarTable tbody');
        tbody.innerHTML = '';

        const squad = window.gameLogic.getMySquad();
        squad.forEach(player => {
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

            tr.querySelector('button').onclick = () => startRenewal(player.id);
            tbody.appendChild(tr);
        });
    }

    // =======================================
    // Negociación estilo fichajes
    // =======================================
    window.startRenewal = function(playerId) {
        const player = window.gameLogic.getPlayerById(playerId);
        if (!player) return;

        let years = prompt(`Negociar renovación con ${player.name}\nAños de contrato (1-5):`, player.contractYears);
        if (!years) return;
        years = Number(years);

        let type = prompt(`Tipo de contrato:\n- Propiedad\n- Cedido`, player.contractType === 'loan' ? 'Cedido' : 'Propiedad');
        if (!type) return;
        type = type.toLowerCase() === 'cedido' ? 'loan' : 'owned';

        let salary = prompt(`Salario semanal para ${player.name}?`, player.salary || 100000);
        if (!salary) return;
        salary = Number(salary);

        const accepted = Math.random() < renewalChance(player, salary, years);

        if (accepted) {
            player.contractType = type;
            player.contractYears = type === 'loan' ? 1 : years;
            player.salary = salary;
            window.addNews(`✅ ${player.name} ha renovado (${type === 'loan' ? 'Cedido' : 'Propiedad'}) por ${player.contractYears} años.`, 'success');
        } else {
            window.addNews(`❌ ${player.name} ha rechazado la oferta de renovación.`, 'error');
        }

        renderRenovarTable();
    }

    // =======================================
    // Probabilidad de aceptación
    // =======================================
    function renewalChance(player, salary, years) {
        let chance = 0.5;
        if (salary >= (player.salary || 100000) * 1.1) chance += 0.2;
        if (years >= (player.contractYears || 1)) chance += 0.1;
        if (player.age > 30) chance += 0.1;
        if (window.gameLogic.getPopularity?.() > 70) chance += 0.1;
        return Math.min(chance, 0.9);
    }

    // =======================================
    // Avisos DT contratos pendientes
    // =======================================
    function checkPendingRenewals() {
        const squad = window.gameLogic.getMySquad();
        const pending = squad.filter(p => p.contractType === 'owned' && p.contractYears === 1);
        pending.forEach(p => {
            window.addNews(`⚠️ ${p.name} tiene contrato a punto de expirar.`, 'warning');
        });
    }
})();
