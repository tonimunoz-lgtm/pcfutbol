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
                console.log('✅ Botón Renovar inyectado');
            }
        });

        observer.observe(quadrant, { childList: true, subtree: true });
    }

    // =======================================
    // Crear y mostrar vista Renovar
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
                <div id="renovarList" style="margin-top: 20px;"></div>
            `;
            document.body.appendChild(renovarPage);
        }

        // Mostrar solo esta página
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        renovarPage.style.display = 'block';
        renderRenovarList();
    }

    // =======================================
    // Renderizar lista de jugadores
    // =======================================
    function renderRenovarList() {
        const renovarList = document.getElementById('renovarList');
        renovarList.innerHTML = '';

        const squad = window.gameLogic.getMySquad();
        squad.forEach(player => {
            const tr = document.createElement('div');
            tr.style.display = 'flex';
            tr.style.justifyContent = 'space-between';
            tr.style.alignItems = 'center';
            tr.style.borderBottom = '1px solid #ccc';
            tr.style.padding = '5px 0';

            tr.innerHTML = `
                <div style="flex:1"><strong>${player.name}</strong> (${player.position})</div>
                <div style="width:100px; text-align:center;">${player.contractType === 'loan' ? 'Cedido' : 'Propiedad'}</div>
                <div style="width:50px; text-align:center;">${player.contractType === 'loan' ? 1 : player.contractYears}</div>
                <div style="width:150px; text-align:center;">
                    <button class="btn btn-sm" onclick="startRenewal(${player.id})">Negociar</button>
                </div>
            `;

            renovarList.appendChild(tr);
        });
    }

    // =======================================
    // Función de negociación extendida
    // =======================================
    window.startRenewal = function(playerId) {
        const player = window.gameLogic.getPlayerById(playerId);
        if (!player) return;

        // 1️⃣ Elegir años de contrato
        let years = prompt(`Negociar renovación con ${player.name}\nAños de contrato (1-5):`, player.contractYears);
        if (!years) return;
        years = Number(years);

        // 2️⃣ Elegir tipo de contrato
        let type = prompt(`Tipo de contrato:\n- Propiedad\n- Cedido`, player.contractType === 'loan' ? 'Cedido' : 'Propiedad');
        if (!type) return;
        type = type.toLowerCase() === 'cedido' ? 'loan' : 'owned';

        // 3️⃣ Oferta de salario
        let salary = prompt(`Salario semanal para ${player.name}?`, player.salary || 100000);
        if (!salary) return;
        salary = Number(salary);

        // 4️⃣ Probabilidad de aceptación
        const accepted = Math.random() < renewalChance(player, salary, years);

        if (accepted) {
            player.contractType = type;
            player.contractYears = type === 'loan' ? 1 : years;
            player.salary = salary;
            window.addNews(`✅ ${player.name} ha renovado su contrato (${type === 'loan' ? 'Cedido' : 'Propiedad'}) por ${player.contractYears} años.`, 'success');
        } else {
            window.addNews(`❌ ${player.name} ha rechazado la oferta de renovación.`, 'error');
        }

        renderRenovarList();
    }

    // =======================================
    // Cálculo de chance de aceptación
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
    // Avisar al DT sobre contratos pendientes
    // =======================================
    function checkPendingRenewals() {
        const squad = window.gameLogic.getMySquad();
        const pending = squad.filter(p => p.contractType === 'owned' && p.contractYears === 1);
        pending.forEach(p => {
            window.addNews(`⚠️ ${p.name} tiene contrato a punto de expirar.`, 'warning');
        });
    }
})();
