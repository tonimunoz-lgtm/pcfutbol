// ============================================================
// injector-urgent-panel.js
//
// MEJORA: Panel de "Acciones Urgentes" en el Dashboard.
// Muestra de forma clara y priorizada todo lo que requiere
// atención inmediata del manager:
//
// - Contratos a punto de expirar (0 o 1 año)
// - Jugadores lesionados de larga duración
// - Ofertas de renovación pendientes de respuesta
// - Jugadores en mercado sin ofertas (> 3 semanas)
// - Saldo negativo o muy bajo
// - Obras de instalaciones próximas a terminar
// - Advertencias del consejo
// ============================================================

(function () {
    'use strict';
    console.log('🚨 injector-urgent-panel cargando...');

    // ─────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────

    function gs() {
        return window.gameLogic?.getGameState?.();
    }

    // ─────────────────────────────────────────────────────────────
    // RECOPILAR ALERTAS URGENTES
    // ─────────────────────────────────────────────────────────────

    function collectAlerts() {
        const state = gs();
        if (!state) return [];

        const alerts = [];

        // ── 1. Contratos a 0 años (crítico) ─────────────────────
        const expired = (state.squad || []).filter(p =>
            p.contractType === 'owned' && p.contractYears === 0
        );
        expired.forEach(p => {
            const grace = p.expiryGracePeriod;
            const weeksLeft = grace ? grace - state.week : '?';
            alerts.push({
                priority: 1,
                type: 'contract_expired',
                icon: '🔴',
                title: `Contrato expirado: ${p.name}`,
                desc: grace
                    ? `Quedan ${weeksLeft > 0 ? weeksLeft : '¡0!'} jornadas para renovar o se irá libre`
                    : 'Renueva ahora o se irá libre próximamente',
                color: '#f44336',
                action: `openPage('negotiations')`,
                actionLabel: 'Renovar',
            });
        });

        // ── 2. Contratos a 1 año (advertencia) ──────────────────
        const nearExpiry = (state.squad || []).filter(p =>
            p.contractType === 'owned' && p.contractYears === 1
        );
        nearExpiry.forEach(p => {
            alerts.push({
                priority: 2,
                type: 'contract_near',
                icon: '🟠',
                title: `Contrato acaba pronto: ${p.name}`,
                desc: `Solo queda 1 año de contrato. Considera renovar.`,
                color: '#FF9800',
                action: `openPage('negotiations')`,
                actionLabel: 'Renovar',
            });
        });

        // ── 3. Renovaciones pendientes de respuesta ──────────────
        const pendingRenewals = state.pendingRenewals || [];
        pendingRenewals.forEach(r => {
            const weeksLeft = r.responseWeek - state.week;
            alerts.push({
                priority: 2,
                type: 'renewal_pending',
                icon: '⏳',
                title: `Esperando respuesta: ${r.playerName}`,
                desc: weeksLeft <= 0
                    ? '¡Responderá esta jornada!'
                    : `Responderá en ${weeksLeft} jornada${weeksLeft > 1 ? 's' : ''}`,
                color: '#2196F3',
                action: null,
                actionLabel: null,
            });
        });

        // ── 4. Lesionados de larga duración ─────────────────────
        const longInjuries = (state.squad || []).filter(p =>
            p.isInjured && p.weeksOut >= 3
        );
        longInjuries.forEach(p => {
            alerts.push({
                priority: 3,
                type: 'injury_long',
                icon: '🏥',
                title: `Lesión grave: ${p.name}`,
                desc: `${p.weeksOut} semanas de baja${p.injuryType ? ` (${p.injuryType})` : ''}`,
                color: '#9C27B0',
                action: `openPage('squad')`,
                actionLabel: 'Ver plantilla',
            });
        });

        // ── 5. Saldo bajo o negativo ─────────────────────────────
        if (state.balance < 0) {
            alerts.push({
                priority: 1,
                type: 'balance_negative',
                icon: '💸',
                title: '¡Saldo negativo!',
                desc: `Balance: ${state.balance.toLocaleString('es-ES')}€. Riesgo de problemas financieros.`,
                color: '#f44336',
                action: `openPage('finances')`,
                actionLabel: 'Ver finanzas',
            });
        } else if (state.balance < (state.weeklyExpenses || 0) * 4) {
            alerts.push({
                priority: 2,
                type: 'balance_low',
                icon: '⚠️',
                title: 'Saldo muy bajo',
                desc: `Solo tienes dinero para ~${Math.floor(state.balance / (state.weeklyExpenses || 1))} semanas de gastos`,
                color: '#FF9800',
                action: `openPage('finances')`,
                actionLabel: 'Ver finanzas',
            });
        }

        // ── 6. Jugadores en mercado sin ofertas ──────────────────
        const stuckOnMarket = (state.squad || []).filter(p =>
            (p.transferListed || p.loanListed) && (p.weeksOnMarket || 0) >= 4
        );
        stuckOnMarket.forEach(p => {
            alerts.push({
                priority: 3,
                type: 'market_stuck',
                icon: '📭',
                title: `Sin ofertas: ${p.name}`,
                desc: `Lleva ${p.weeksOnMarket} semanas en el mercado sin interesados. Considera bajar el precio.`,
                color: '#607D8B',
                action: `openPage('squad')`,
                actionLabel: 'Ver plantilla',
            });
        });

        // ── 7. Obras próximas a terminar ─────────────────────────
        try {
            const facData = JSON.parse(localStorage.getItem('pcfutbol_facilities') || '{}');
            (facData.construction || []).forEach(item => {
                if (item.weeksLeft <= 3) {
                    alerts.push({
                        priority: 3,
                        type: 'construction_near',
                        icon: '🏗️',
                        title: `Obra a punto de terminar: ${item.name}`,
                        desc: `Faltan ${item.weeksLeft} semana${item.weeksLeft !== 1 ? 's' : ''} para completarse`,
                        color: '#795548',
                        action: `openPage('facilities')`,
                        actionLabel: 'Ver instalaciones',
                    });
                }
            });
        } catch(e) { /* ignorar si no hay datos */ }

        // ── 8. Plantilla muy justa (< 14 jugadores disponibles) ──
        const available = (state.squad || []).filter(p =>
            !p.isInjured && p.contractType !== 'loaned_out'
        );
        if (available.length < 14) {
            alerts.push({
                priority: 2,
                type: 'squad_thin',
                icon: '👥',
                title: 'Plantilla escasa',
                desc: `Solo ${available.length} jugadores disponibles. Considera fichar.`,
                color: '#FF9800',
                action: `openPage('transfers')`,
                actionLabel: 'Mercado',
            });
        }

        // Ordenar por prioridad
        alerts.sort((a, b) => a.priority - b.priority);

        return alerts;
    }

    // ─────────────────────────────────────────────────────────────
    // RENDERIZAR EL PANEL
    // ─────────────────────────────────────────────────────────────

    function renderUrgentPanel() {
        const alerts = collectAlerts();

        let container = document.getElementById('urgent-panel');
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = `
                <div style="
                    background: rgba(76, 175, 80, 0.1);
                    border: 1px solid #4CAF50;
                    border-radius: 8px;
                    padding: 12px 16px;
                    color: #4CAF50;
                    font-size: 0.9em;
                ">
                    ✅ Todo en orden — no hay acciones urgentes pendientes
                </div>
            `;
            return;
        }

        const criticals = alerts.filter(a => a.priority === 1);
        const warnings  = alerts.filter(a => a.priority === 2);
        const infos     = alerts.filter(a => a.priority === 3);

        function renderAlert(a) {
            return `
                <div style="
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 10px 12px;
                    border-left: 3px solid ${a.color};
                    background: ${a.color}18;
                    border-radius: 0 6px 6px 0;
                    margin-bottom: 6px;
                ">
                    <span style="font-size: 1.1em; flex-shrink: 0;">${a.icon}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: bold; color: ${a.color}; font-size: 0.9em;">${a.title}</div>
                        <div style="color: #bbb; font-size: 0.8em; margin-top: 2px;">${a.desc}</div>
                    </div>
                    ${a.action ? `
                        <button onclick="${a.action}" style="
                            background: ${a.color};
                            color: white;
                            border: none;
                            padding: 4px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8em;
                            white-space: nowrap;
                            flex-shrink: 0;
                        ">${a.actionLabel}</button>
                    ` : ''}
                </div>
            `;
        }

        let html = '';

        if (criticals.length > 0) {
            html += `<div style="font-size: 0.75em; color: #f44336; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">🚨 Crítico</div>`;
            html += criticals.map(renderAlert).join('');
        }

        if (warnings.length > 0) {
            html += `<div style="font-size: 0.75em; color: #FF9800; font-weight: bold; margin: 8px 0 6px; text-transform: uppercase; letter-spacing: 1px;">⚠️ Advertencias</div>`;
            html += warnings.map(renderAlert).join('');
        }

        if (infos.length > 0) {
            html += `<div style="font-size: 0.75em; color: #607D8B; font-weight: bold; margin: 8px 0 6px; text-transform: uppercase; letter-spacing: 1px;">ℹ️ Info</div>`;
            html += infos.map(renderAlert).join('');
        }

        container.innerHTML = html;

        // Actualizar badge del menú dashboard
        // Badge gestionado por ui.js (unreadNewsCount) — no duplicar aquí
    }

    // ─────────────────────────────────────────────────────────────
    // INYECTAR EL CONTENEDOR EN EL DASHBOARD
    // ─────────────────────────────────────────────────────────────

    function injectPanelContainer() {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;
        if (document.getElementById('urgent-panel')) return; // ya existe

        // Buscar dónde insertarlo (antes del newsFeed)
        const newsFeed = document.getElementById('newsFeed');
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 20px;';
        wrapper.innerHTML = `
            <h2 style="color: #e94560; margin-bottom: 10px; font-size: 1em; display: flex; align-items: center; gap: 8px;">
                🚨 Acciones Urgentes
                <span id="urgent-count" style="
                    background: #e94560;
                    color: white;
                    border-radius: 10px;
                    padding: 1px 8px;
                    font-size: 0.8em;
                "></span>
            </h2>
            <div id="urgent-panel"></div>
        `;

        if (newsFeed && newsFeed.parentNode) {
            newsFeed.parentNode.insertBefore(wrapper, newsFeed);
        } else {
            dashboard.appendChild(wrapper);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HOOKS
    // ─────────────────────────────────────────────────────────────

    // NOTA: window.ui es un módulo ES6 con propiedades readonly.
    // No se puede parchear window.ui.refreshUI directamente.
    // En su lugar, usamos MutationObserver sobre el newsFeed:
    // cada vez que el DOM del newsFeed cambia (lo hace refreshUI),
    // re-renderizamos el panel urgente.

    // ─────────────────────────────────────────────────────────────
    // BADGE DE NOTICIAS EN EL BOTÓN "NOTICIAS"
    // ui.js busca 'switchPage' pero el botón usa 'openPage' →
    // el selector de ui.js nunca encuentra el botón.
    // Lo gestionamos aquí con el selector correcto.
    // ─────────────────────────────────────────────────────────────

    function getNoticiasBtn() {
        // Selector exacto del botón en index.html
        return document.querySelector('button[onclick="openPage('dashboard')"]');
    }

    function updateNewsBadge() {
        const state = gs();
        const btn = getNoticiasBtn();
        if (!btn) return;

        const count = state?.unreadNewsCount || 0;

        // Limpiar badge anterior
        const old = btn.querySelector('.news-badge');
        if (old) old.remove();

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'news-badge';
            badge.style.cssText = `
                background: #ff3333;
                color: white;
                border-radius: 50%;
                padding: 1px 6px;
                font-size: 0.72em;
                margin-left: 5px;
                font-weight: bold;
                vertical-align: middle;
                display: inline-block;
                min-width: 18px;
                text-align: center;
                line-height: 18px;
            `;
            badge.textContent = count > 99 ? '99+' : count;
            btn.appendChild(badge);
        }
        // Si count === 0 no añadimos nada → el badge desaparece
    }

    // Limpiar badge al abrir dashboard (markNewsAsRead ya se llama en openPage)
    function clearNewsBadge() {
        const btn = getNoticiasBtn();
        if (!btn) return;
        const badge = btn.querySelector('.news-badge');
        if (badge) badge.remove();
    }

    function hookRefreshUI() {
        if (window._urgentPanelRefreshHooked) return;

        const newsFeed = document.getElementById('newsFeed');
        if (!newsFeed) {
            // Reintentar si el DOM no está listo
            setTimeout(hookRefreshUI, 500);
            return;
        }

        window._urgentPanelRefreshHooked = true;

        const observer = new MutationObserver(() => {
            // Actualizar badge siempre (hay noticias nuevas aunque el dashboard no esté abierto)
            setTimeout(updateNewsBadge, 50);

            // Solo actualizar el panel urgente si el dashboard está visible
            const dashboard = document.getElementById('dashboard');
            if (dashboard && dashboard.classList.contains('active')) {
                setTimeout(renderUrgentPanel, 50);
            }
        });

        observer.observe(newsFeed, { childList: true, subtree: true });
        console.log('✅ MutationObserver en newsFeed para urgent-panel');
    }

    function hookOpenPage() {
        const origOpen = window.openPage;
        if (!origOpen || window._urgentOpenPageHooked) {
            if (!origOpen) { setTimeout(hookOpenPage, 400); return; }
            return;
        }
        window._urgentOpenPageHooked = true;

        window.openPage = function (pageId, ...args) {
            origOpen.call(this, pageId, ...args);
            if (pageId === 'dashboard') {
                clearNewsBadge();  // Limpiar badge al leer noticias
                setTimeout(() => {
                    injectPanelContainer();
                    renderUrgentPanel();
                }, 150);
            }
        };
    }

    function hookSimulateWeek() {
        const orig = window.simulateWeek;
        if (!orig || window._urgentSimHooked) {
            if (!orig) { setTimeout(hookSimulateWeek, 400); return; }
            return;
        }
        window._urgentSimHooked = true;

        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);
            setTimeout(renderUrgentPanel, 200);
            setTimeout(updateNewsBadge, 300);  // Actualizar badge con nuevas noticias
            return result;
        };
    }

    // ─────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────

    function waitAndInit() {
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (window.gameLogic && window.simulateWeek && window.ui) {
                clearInterval(interval);
                hookOpenPage();
                hookSimulateWeek();
                hookRefreshUI();
                // Intentar renderizar si ya estamos en dashboard
                setTimeout(() => {
                    injectPanelContainer();
                    renderUrgentPanel();
                    updateNewsBadge();  // Badge inicial al arrancar
                }, 500);
                console.log('✅ injector-urgent-panel listo');
            }
            if (tries > 100) {
                clearInterval(interval);
                console.warn('⚠️ injector-urgent-panel: timeout');
            }
        }, 200);
    }

    if (document.readyState !== 'loading') {
        waitAndInit();
    } else {
        document.addEventListener('DOMContentLoaded', waitAndInit);
    }

})();
