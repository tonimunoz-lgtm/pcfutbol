// ============================================================
// injector-free-agents.js
//
// MEJORA: Jugadores con contrato expirado (contractYears = 0)
// ahora tienen consecuencias reales:
//
// 1. Al inicio de temporada, jugadores con 0 años de contrato
//    reciben una PRÓRROGA de 4 semanas para renovar.
// 2. Si no renuevan en ese plazo, abandonan el club como libres.
// 3. Hay una sección "Agentes Libres" en el mercado de fichajes
//    con jugadores disponibles sin coste de traspaso.
// 4. El sistema genera agentes libres de calidad variable
//    para que siempre haya opciones en el mercado.
// ============================================================

(function () {
    'use strict';
    console.log('🔓 injector-free-agents cargando...');

    const FREE_AGENTS_KEY = 'pcfutbol_free_agents';

    // ─────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────

    function gs() {
        return window.gameLogic?.getGameState?.();
    }

    function news(msg, type) {
        window.gameLogic?.addNews?.(msg, type || 'info');
    }

    function refreshUI() {
        const state = gs();
        if (state && window.ui?.refreshUI) window.ui.refreshUI(state);
    }

    function updateState(fn) {
        const state = gs();
        if (!state) return;
        fn(state);
        window.gameLogic?.updateGameState?.(state);
    }

    function showToast(msg, type) {
        window.showToast?.(msg, type);
    }

    // ─────────────────────────────────────────────────────────────
    // GESTIÓN DEL POOL DE AGENTES LIBRES
    // Guardado en gameState.freeAgentsPool para persistencia
    // ─────────────────────────────────────────────────────────────

    function getFreeAgents() {
        const state = gs();
        return state?.freeAgentsPool || [];
    }

    function saveFreeAgents(agents) {
        updateState(s => {
            s.freeAgentsPool = agents;
        });
    }

    // Posiciones disponibles
    const POSITIONS = ['POR', 'LD', 'LI', 'DFC', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

    // Nombres aleatorios para agentes libres generados
    const FIRSTNAMES = ['Marcos','Adrián','Pablo','Sergio','Javier','Carlos','Álvaro','Miguel','Roberto','Diego','Iván','Pedro','Luis','Antonio','Fernando','Raúl','David','Alejandro','Rubén','Jorge'];
    const LASTNAMES  = ['García','López','Martínez','Sánchez','Rodríguez','González','Fernández','Torres','Ramírez','Moreno','Jiménez','Ruiz','Díaz','Pérez','Herrero','Castro','Ramos','Flores','Cruz','Navarro'];

    function randomName() {
        const f = FIRSTNAMES[Math.floor(Math.random() * FIRSTNAMES.length)];
        const l = LASTNAMES[Math.floor(Math.random() * LASTNAMES.length)];
        return `${f} ${l}`;
    }

    function generateFreeAgent(overallMin, overallMax) {
        const overall = overallMin + Math.floor(Math.random() * (overallMax - overallMin));
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
        const age = 26 + Math.floor(Math.random() * 10); // 26-35 (por algo son libres)
        const salary = Math.round(overall * 25 + Math.random() * 150);

        return {
            id: `fa_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
            name: randomName(),
            position: pos,
            age,
            overall,
            potential: overall + Math.floor(Math.random() * 8),
            salary,
            value: Math.round(overall * 400 + Math.random() * 50000),
            releaseClause: 0,
            contractType: 'free_agent',
            contractYears: 0,
            club: 'Sin club',
            isFreeAgent: true,
            // Atributos básicos
            EN: 50 + Math.floor(Math.random() * 30),
            VE: 50 + Math.floor(Math.random() * 30),
            RE: 50 + Math.floor(Math.random() * 30),
            AG: 50 + Math.floor(Math.random() * 30),
            CA: 50 + Math.floor(Math.random() * 30),
            EF: 50 + Math.floor(Math.random() * 30),
            MO: 50 + Math.floor(Math.random() * 30),
            AT: 50 + Math.floor(Math.random() * 30),
            DF: 50 + Math.floor(Math.random() * 30),
            isInjured: false,
            weeksOut: 0,
            form: 70 + Math.floor(Math.random() * 15),
            matches: 0,
        };
    }

    function initFreeAgentsPool() {
        const state = gs();
        if (!state) return;
        if (state.freeAgentsPool && state.freeAgentsPool.length > 0) return;

        // Generar pool inicial
        const pool = [];
        for (let i = 0; i < 8;  i++) pool.push(generateFreeAgent(70, 82));
        for (let i = 0; i < 12; i++) pool.push(generateFreeAgent(58, 72));
        for (let i = 0; i < 10; i++) pool.push(generateFreeAgent(45, 60));

        saveFreeAgents(pool);
        console.log(`🔓 Pool inicial de ${pool.length} agentes libres generado`);
    }

    // ─────────────────────────────────────────────────────────────
    // PROCESAR JUGADORES CON CONTRATO EXPIRADO
    // Llamado desde hook de simulateWeek
    // ─────────────────────────────────────────────────────────────

    function processExpiredContracts() {
        const state = gs();
        if (!state || !state.squad) return;

        const currentWeek = state.week;

        state.squad.forEach(player => {
            if (player.contractType !== 'owned') return;
            if (player.contractYears > 0) return;

            // Tiene contrato a 0 años — iniciar prórroga si no tiene
            if (!player.expiryGracePeriod) {
                player.expiryGracePeriod = currentWeek + 4; // 4 jornadas de gracia
                news(
                    `⏳ El contrato de ${player.name} ha expirado. Tienes hasta la jornada ${player.expiryGracePeriod} para renovarlo, o se irá libre.`,
                    'warning'
                );
            }

            // Avisar si quedan 2 jornadas
            if (currentWeek === player.expiryGracePeriod - 2) {
                news(`🔴 ¡Urgente! A ${player.name} le quedan 2 jornadas antes de quedar libre. ¡Renueva ahora!`, 'error');
            }

            // ¿Se acabó el período de gracia?
            if (currentWeek >= player.expiryGracePeriod) {
                releasePlayerToFreeMarket(player, state);
            }
        });

        // Guardar cambios
        // Eliminar de plantilla los que pasaron al mercado libre (marcados con _shouldRemove)
        const released = state.squad.filter(p => p._shouldRemove);
        state.squad = state.squad.filter(p => !p._shouldRemove);

        // Añadir al pool de agentes libres
        if (released.length > 0) {
            const pool = state.freeAgentsPool || [];
            released.forEach(p => {
                delete p._shouldRemove;
                delete p.expiryGracePeriod;
                p.contractType = 'free_agent';
                p.contractYears = 0;
                p.club = 'Sin club';
                p.isFreeAgent = true;
                pool.push(p);
            });
            state.freeAgentsPool = pool;
            news(`📋 ${released.length} jugador${released.length > 1 ? 'es han' : ' ha'} sido añadido${released.length > 1 ? 's' : ''} al mercado de agentes libres.`, 'info');
        }

        window.gameLogic?.updateGameState?.(state);
        if (released.length > 0) refreshUI();
    }

    function releasePlayerToFreeMarket(player, state) {
        news(
            `🚪 ${player.name} ha abandonado el club como agente libre tras expirar su contrato.`,
            'error'
        );
        showToast(`🚪 ${player.name} se ha ido libre`, 'error');
        player._shouldRemove = true;

        // Eliminar de alineación si estaba
        if (state.lineup) {
            state.lineup = state.lineup.filter(p => p.name !== player.name);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // FICHAR AGENTE LIBRE (coste 0 de traspaso, solo salario)
    // ─────────────────────────────────────────────────────────────

    window.signFreeAgent = function (agentId) {
        const state = gs();
        if (!state) return;

        const pool = state.freeAgentsPool || [];
        const agentIdx = pool.findIndex(a => a.id === agentId);
        if (agentIdx === -1) {
            alert('Agente libre no encontrado');
            return;
        }

        const agent = pool[agentIdx];

        // Confirmar
        const confirmed = confirm(
            `¿Fichar a ${agent.name} como agente libre?\n\n` +
            `Posición: ${agent.position} | OVR: ${agent.overall} | Edad: ${agent.age}\n` +
            `Salario: ${agent.salary.toLocaleString('es-ES')}€/sem\n` +
            `Coste de traspaso: GRATIS\n\n` +
            `El jugador firmará un contrato de 2 años.`
        );

        if (!confirmed) return;

        // Añadir a plantilla
        const newPlayer = {
            ...agent,
            contractType: 'owned',
            contractYears: 2,
            club: state.team,
            isFreeAgent: false,
            expiryGracePeriod: undefined,
        };

        updateState(s => {
            s.squad.push(newPlayer);
            s.freeAgentsPool = pool.filter((_, i) => i !== agentIdx);
        });

        news(
            `✅ ¡${agent.name} fichado como agente libre! Firma por 2 años a ${agent.salary.toLocaleString('es-ES')}€/sem.`,
            'success'
        );

        showToast(`✅ ${agent.name} fichado como agente libre`, 'success');
        refreshUI();
        renderFreeAgentsPage(); // Refrescar la lista
    };

    // ─────────────────────────────────────────────────────────────
    // RENDERIZAR SECCIÓN DE AGENTES LIBRES
    // ─────────────────────────────────────────────────────────────

    function renderFreeAgentsPage() {
        const state = gs();
        if (!state) return;

        const pool = state.freeAgentsPool || [];
        const transfersPage = document.getElementById('transfers');
        if (!transfersPage) return;

        // Buscar o crear la sección de agentes libres
        let section = document.getElementById('free-agents-section');
        if (!section) {
            section = document.createElement('div');
            section.id = 'free-agents-section';
            transfersPage.appendChild(section);
        }

        if (pool.length === 0) {
            section.innerHTML = `
                <h2 style="color: #e94560; margin-top: 30px;">🔓 Agentes Libres</h2>
                <div class="alert alert-info">No hay agentes libres disponibles actualmente.</div>
            `;
            return;
        }

        const posFilter = document.getElementById('fa-pos-filter')?.value || 'ALL';
        const filtered = posFilter === 'ALL' ? pool : pool.filter(a => a.position === posFilter);
        const sorted = [...filtered].sort((a, b) => b.overall - a.overall);

        const positions = [...new Set(pool.map(a => a.position))].sort();

        section.innerHTML = `
            <h2 style="color: #e94560; margin-top: 30px;">🔓 Agentes Libres <span style="font-size:0.7em; color:#aaa;">(${pool.length} disponibles)</span></h2>
            <div class="alert alert-info" style="margin-bottom: 15px;">
                💡 Los agentes libres no tienen coste de traspaso. Solo pagas su salario desde el primer día.
            </div>

            <div style="margin-bottom: 15px;">
                <label style="color: #aaa; margin-right: 10px;">Filtrar por posición:</label>
                <select id="fa-pos-filter" onchange="window._renderFreeAgents()" style="padding: 5px 10px;">
                    <option value="ALL">Todas</option>
                    ${positions.map(p => `<option value="${p}" ${posFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="background: rgba(233,69,96,0.2); color: #e94560;">
                        <th style="padding: 8px; text-align: left;">Jugador</th>
                        <th style="padding: 8px; text-align: center;">Pos</th>
                        <th style="padding: 8px; text-align: center;">OVR</th>
                        <th style="padding: 8px; text-align: center;">Edad</th>
                        <th style="padding: 8px; text-align: right;">Salario/sem</th>
                        <th style="padding: 8px; text-align: center;">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(agent => `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                            <td style="padding: 8px;">
                                <strong>${agent.name}</strong>
                                ${agent.isFreeAgent === true && !agent.age ? '' : ''}
                            </td>
                            <td style="padding: 8px; text-align: center;">
                                <span style="
                                    background: #e94560;
                                    color: white;
                                    padding: 2px 8px;
                                    border-radius: 4px;
                                    font-size: 0.85em;
                                ">${agent.position}</span>
                            </td>
                            <td style="padding: 8px; text-align: center; font-weight: bold; color: ${agent.overall >= 75 ? '#4CAF50' : agent.overall >= 65 ? '#FF9800' : '#aaa'};">
                                ${agent.overall}
                            </td>
                            <td style="padding: 8px; text-align: center; color: ${agent.age > 32 ? '#FF9800' : '#ccc'};">${agent.age}</td>
                            <td style="padding: 8px; text-align: right; color: #4CAF50;">${agent.salary.toLocaleString('es-ES')}€</td>
                            <td style="padding: 8px; text-align: center;">
                                <button class="btn" style="background: #4CAF50; padding: 4px 12px; font-size: 0.85em;"
                                    onclick="window.signFreeAgent('${agent.id}')">
                                    ✅ Fichar Gratis
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    window._renderFreeAgents = renderFreeAgentsPage;

    // ─────────────────────────────────────────────────────────────
    // HOOK simulateWeek
    // ─────────────────────────────────────────────────────────────

    function hookSimulateWeek() {
        const orig = window.simulateWeek;
        if (!orig || window._freeAgentsHooked) {
            if (!orig) { setTimeout(hookSimulateWeek, 400); return; }
            return;
        }
        window._freeAgentsHooked = true;

        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);
            processExpiredContracts();
            return result;
        };

        console.log('✅ Hook simulateWeek para agentes libres activo');
    }

    // ─────────────────────────────────────────────────────────────
    // HOOK openPage — inyectar sección en mercado de fichajes
    // ─────────────────────────────────────────────────────────────

    function hookOpenPage() {
        const origOpen = window.openPage;
        if (!origOpen || window._freeAgentsOpenPageHooked) {
            if (!origOpen) { setTimeout(hookOpenPage, 400); return; }
            return;
        }
        window._freeAgentsOpenPageHooked = true;

        window.openPage = function (pageId, ...args) {
            origOpen.call(this, pageId, ...args);
            if (pageId === 'transfers') {
                setTimeout(renderFreeAgentsPage, 200);
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // TAMBIÉN: Mostrar contratos a 0 en panel de renovaciones
    // con alerta visual prominente
    // ─────────────────────────────────────────────────────────────

    function injectExpiryWarnings() {
        const state = gs();
        if (!state) return;

        const expiring = state.squad.filter(p =>
            p.contractType === 'owned' && (p.contractYears === 0 || p.contractYears === 1)
        );

        if (expiring.length === 0) return;

        // Badge en el botón de negociaciones del menú
        const negotiationsBtn = document.querySelector('[onclick*="negotiations"]');
        if (negotiationsBtn && expiring.some(p => p.contractYears === 0)) {
            if (!negotiationsBtn.querySelector('.expiry-badge')) {
                const badge = document.createElement('span');
                badge.className = 'expiry-badge';
                badge.style.cssText = `
                    background: #f44336;
                    color: white;
                    border-radius: 50%;
                    padding: 1px 5px;
                    font-size: 0.7em;
                    margin-left: 4px;
                    animation: pulse 1s infinite;
                `;
                badge.textContent = expiring.filter(p => p.contractYears === 0).length;
                negotiationsBtn.appendChild(badge);
            }
        }
    }

    // CSS para la animación del badge
    function injectStyles() {
        if (document.getElementById('fa-styles')) return;
        const style = document.createElement('style');
        style.id = 'fa-styles';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────

    function waitAndInit() {
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (window.gameLogic && window.simulateWeek) {
                clearInterval(interval);
                injectStyles();
                initFreeAgentsPool();
                hookSimulateWeek();
                hookOpenPage();
                injectExpiryWarnings();
                console.log('✅ injector-free-agents listo');
            }
            if (tries > 100) {
                clearInterval(interval);
                console.warn('⚠️ injector-free-agents: timeout');
            }
        }, 200);
    }

    // Actualizar badges cuando se refresca la UI
    const origRefreshUI = null;
    document.addEventListener('DOMContentLoaded', () => {
        waitAndInit();
    });

    // También intentar si el DOM ya cargó
    if (document.readyState !== 'loading') {
        waitAndInit();
    }

})();
