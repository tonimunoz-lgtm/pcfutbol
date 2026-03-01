// ============================================================
// injector-renewals-delay.js
//
// MEJORA: Las renovaciones de contrato ya no son instantáneas.
// El jugador responde en 1-2 jornadas (simulando negociación real).
//
// Cómo funciona:
// 1. Cuando envías una oferta de renovación, se guarda en
//    gameState.pendingRenewals[] con la jornada de respuesta.
// 2. Cada vez que se simula una jornada, se procesan las
//    renovaciones pendientes cuya semana de respuesta ha llegado.
// 3. La respuesta llega como noticia en el newsFeed.
// ============================================================

(function () {
    'use strict';
    console.log('📝 injector-renewals-delay cargando...');

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

    // Acceder directamente al gameState interno (para mutarlo)
    // lo hacemos via updateGameState
    function updateState(fn) {
        const state = gs();
        if (!state) return;
        fn(state);
        window.gameLogic?.updateGameState?.(state);
    }

    // ─────────────────────────────────────────────────────────────
    // CALCULAR PROBABILIDAD DE ACEPTACIÓN (igual que el original)
    // ─────────────────────────────────────────────────────────────

    function calcAcceptance(player, offer, state) {
        let prob = 0.5;

        const salaryRatio = offer.newSalary / player.salary;
        if (salaryRatio >= 1.2) prob += 0.3;
        else if (salaryRatio >= 1.1) prob += 0.2;
        else if (salaryRatio >= 1.0) prob += 0.1;
        else if (salaryRatio < 0.9) prob -= 0.3;

        if (offer.newYears >= 4) prob += 0.1;
        else if (offer.newYears <= 2) prob -= 0.1;

        if (offer.hasBonus) prob += 0.1;
        if (offer.hasCar)   prob += 0.05;
        if (offer.hasHouse) prob += 0.05;

        if (player.age > 30 && offer.newYears >= 3) prob += 0.1;
        if (player.contractYears <= 1) prob += 0.15;

        const secretaryEffect = state.staff?.secretario
            ? (window.STAFF_LEVEL_EFFECTS?.[state.staff.secretario.level]?.negotiation || 0.1)
            : 0;
        prob += secretaryEffect;

        return Math.max(0, Math.min(1, prob));
    }

    // ─────────────────────────────────────────────────────────────
    // PROCESAR RENOVACIONES PENDIENTES
    // Se llama desde el hook de simulateWeek
    // ─────────────────────────────────────────────────────────────

    function processPendingRenewals(currentWeek) {
        const state = gs();
        if (!state) return;

        const pending = state.pendingRenewals || [];
        if (pending.length === 0) return;

        const toProcess = pending.filter(r => r.responseWeek <= currentWeek);
        const remaining = pending.filter(r => r.responseWeek > currentWeek);

        toProcess.forEach(renewal => {
            // Buscar al jugador en la plantilla actual
            const player = state.squad.find(p => p.name === renewal.playerName);

            if (!player) {
                // Jugador ya no está (fue vendido, etc.)
                news(`ℹ️ ${renewal.playerName} ya no está en la plantilla. Oferta de renovación cancelada.`, 'info');
                return;
            }

            const prob = calcAcceptance(player, renewal, state);
            const accepted = Math.random() < prob;

            if (accepted) {
                player.contractYears = renewal.newYears;
                player.salary = renewal.newSalary;
                player.releaseClause = renewal.newClause;

                // Coste de renovación (bono de firma si se ofreció)
                if (renewal.hasBonus) {
                    const signingBonus = Math.round(renewal.newSalary * 10);
                    state.balance -= signingBonus;
                    news(`💰 Prima de firma de ${renewal.playerName}: ${signingBonus.toLocaleString('es-ES')}€`, 'info');
                }

                news(
                    `✅ ¡${renewal.playerName} ha aceptado la renovación! Firmó por ${renewal.newYears} años a ${renewal.newSalary.toLocaleString('es-ES')}€/sem`,
                    'success'
                );

                // Toast no-bloqueante en lugar de alert
                showToast(`✅ ${renewal.playerName} ha renovado su contrato por ${renewal.newYears} años`, 'success');

            } else {
                news(
                    `❌ ${renewal.playerName} ha rechazado la oferta de renovación. Necesita mejores condiciones.`,
                    'warning'
                );
                showToast(`❌ ${renewal.playerName} rechazó la renovación`, 'error');
            }
        });

        // Actualizar el estado con las renovaciones procesadas eliminadas
        state.pendingRenewals = remaining;
        window.gameLogic?.updateGameState?.(state);
        refreshUI();
    }

    // ─────────────────────────────────────────────────────────────
    // TOAST NO-BLOQUEANTE (reemplaza alert())
    // ─────────────────────────────────────────────────────────────

    function showToast(message, type) {
        // Crear contenedor si no existe
        let container = document.getElementById('renewal-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'renewal-toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 320px;
            `;
            document.body.appendChild(container);
        }

        const colors = {
            success: { bg: '#1a3a1a', border: '#4CAF50', icon: '✅' },
            error:   { bg: '#3a1a1a', border: '#f44336', icon: '❌' },
            info:    { bg: '#1a2a3a', border: '#2196F3', icon: 'ℹ️' },
            warning: { bg: '#3a2a1a', border: '#FF9800', icon: '⚠️' },
        };
        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${c.bg};
            border: 1px solid ${c.border};
            border-left: 4px solid ${c.border};
            color: #fff;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 0.9em;
            line-height: 1.4;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            animation: toastIn 0.3s ease;
            cursor: pointer;
        `;
        toast.innerHTML = `${c.icon} ${message}`;
        toast.onclick = () => toast.remove();

        // CSS animation
        if (!document.getElementById('toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(30px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes toastOut {
                    from { opacity: 1; transform: translateX(0); }
                    to   { opacity: 0; transform: translateX(30px); }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(toast);

        // Auto-dismiss después de 5 segundos
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Exponer showToast globalmente para que otros injectors puedan usarlo
    window.showToast = showToast;

    // ─────────────────────────────────────────────────────────────
    // PARCHEAR submitRenewalOffer — guardar en cola en lugar de resolver
    // ─────────────────────────────────────────────────────────────

    function patchSubmitRenewal() {
        // submitRenewalOffer está definida en injector-expose-functions.js
        // Esperamos a que esté disponible
        if (typeof window.submitRenewalOffer !== 'function') {
            setTimeout(patchSubmitRenewal, 300);
            return;
        }

        // Guardar la original (por si acaso)
        window._originalSubmitRenewalOffer = window.submitRenewalOffer;

        window.submitRenewalOffer = function () {
            const state = gs();
            if (!state) return;

            // Leer índice del jugador desde el scope original
            // El índice lo guarda la función openRenewalModal en currentRenewalPlayerIndex
            // Necesitamos acceder a él. Está como variable del módulo, pero podemos
            // leerlo desde el DOM (el modal tiene el nombre del jugador visible)
            const playerName = document.getElementById('renewalPlayerName')?.textContent;
            if (!playerName) {
                console.warn('No se pudo obtener el nombre del jugador para renovación');
                window._originalSubmitRenewalOffer?.();
                return;
            }

            const player = state.squad.find(p => p.name === playerName);
            if (!player) {
                window._originalSubmitRenewalOffer?.();
                return;
            }

            const newYears  = parseInt(document.getElementById('renewalNewYears')?.value || '3');
            const newSalary = parseInt(document.getElementById('renewalNewSalary')?.value || '0');
            const newClause = parseInt(document.getElementById('renewalNewClause')?.value || '0');
            const hasBonus  = document.getElementById('renewalBonus')?.checked || false;
            const hasCar    = document.getElementById('renewalCar')?.checked || false;
            const hasHouse  = document.getElementById('renewalHouse')?.checked || false;

            if (!newSalary || newSalary <= 0 || !newClause || newClause <= 0) {
                alert('Introduce valores válidos para salario y cláusula');
                return;
            }

            // Calcular semana de respuesta: entre 1 y 2 jornadas después
            const delay = Math.random() < 0.5 ? 1 : 2;
            const responseWeek = state.week + delay;

            // Guardar en cola
            const renewal = {
                playerName: player.name,
                newYears,
                newSalary,
                newClause,
                hasBonus,
                hasCar,
                hasHouse,
                responseWeek,
                offeredWeek: state.week
            };

            updateState(s => {
                if (!s.pendingRenewals) s.pendingRenewals = [];
                // Evitar duplicados del mismo jugador
                s.pendingRenewals = s.pendingRenewals.filter(r => r.playerName !== player.name);
                s.pendingRenewals.push(renewal);
            });

            // Noticia y feedback
            news(
                `📝 Oferta de renovación enviada a ${player.name}: ${newYears} años, ${newSalary.toLocaleString('es-ES')}€/sem. Responderá en ${delay} jornada${delay > 1 ? 's' : ''}.`,
                'info'
            );

            window.closeModal?.('renewal');
            refreshUI();

            showToast(
                `📬 Oferta enviada a ${player.name}. Respuesta en ${delay} jornada${delay > 1 ? 's' : ''}.`,
                'info'
            );
        };

        console.log('✅ submitRenewalOffer parcheado con delay de jornadas');
    }

    // ─────────────────────────────────────────────────────────────
    // HOOK simulateWeek — procesar renovaciones pendientes
    // ─────────────────────────────────────────────────────────────

    function hookSimulateWeek() {
        const orig = window.simulateWeek;
        if (!orig || window._renewalDelayHooked) {
            if (!orig) { setTimeout(hookSimulateWeek, 400); return; }
            return;
        }
        window._renewalDelayHooked = true;

        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);
            // Procesar después de simular (ya se incrementó state.week)
            const state = gs();
            if (state) {
                processPendingRenewals(state.week);
            }
            return result;
        };

        console.log('✅ Hook simulateWeek para renovaciones con delay activo');
    }

    // ─────────────────────────────────────────────────────────────
    // PANEL DE RENOVACIONES PENDIENTES en la página de negociaciones
    // Muestra un resumen de las ofertas en curso
    // ─────────────────────────────────────────────────────────────

    function renderPendingRenewalsPanel() {
        const state = gs();
        if (!state) return;

        const pending = state.pendingRenewals || [];
        const container = document.getElementById('negotiationsSquadList');
        if (!container) return;

        if (pending.length === 0) return;

        let html = `
            <div style="
                background: rgba(33, 150, 243, 0.1);
                border: 1px solid #2196F3;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            ">
                <h3 style="color: #2196F3; margin: 0 0 10px 0;">⏳ Ofertas Pendientes de Respuesta</h3>
        `;

        pending.forEach(r => {
            const weeksLeft = r.responseWeek - state.week;
            html += `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    font-size: 0.9em;
                ">
                    <span>📝 <strong>${r.playerName}</strong> — ${r.newYears} años, ${r.newSalary.toLocaleString('es-ES')}€/sem</span>
                    <span style="color: #FF9800;">
                        ${weeksLeft <= 0 ? '🔔 Responde esta jornada' : `⏰ Responde en ${weeksLeft} jornada${weeksLeft > 1 ? 's' : ''}`}
                    </span>
                </div>
            `;
        });

        html += `</div>`;

        // Insertar al principio del contenedor
        container.insertAdjacentHTML('afterbegin', html);
    }

    // Hookear openPage para mostrar el panel cuando se entra en negociaciones
    function hookOpenPage() {
        const origOpen = window.openPage;
        if (!origOpen || window._renewalOpenPageHooked) {
            if (!origOpen) { setTimeout(hookOpenPage, 400); return; }
            return;
        }
        window._renewalOpenPageHooked = true;

        window.openPage = function (pageId, ...args) {
            origOpen.call(this, pageId, ...args);
            if (pageId === 'negotiations') {
                setTimeout(renderPendingRenewalsPanel, 100);
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────

    function waitAndInit() {
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (window.gameLogic && window.simulateWeek && window.submitRenewalOffer) {
                clearInterval(interval);
                patchSubmitRenewal();
                hookSimulateWeek();
                hookOpenPage();
                console.log('✅ injector-renewals-delay listo');
            } else if (window.gameLogic && window.simulateWeek) {
                // simulateWeek disponible pero submitRenewalOffer todavía no
                hookSimulateWeek();
                patchSubmitRenewal(); // seguirá esperando internamente
                hookOpenPage();
                clearInterval(interval);
            }
            if (tries > 100) {
                clearInterval(interval);
                console.warn('⚠️ injector-renewals-delay: timeout esperando módulos');
            }
        }, 200);
    }

    waitAndInit();

})();
