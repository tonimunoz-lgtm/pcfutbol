// ============================================================
// injector-finances.js  v7
//
// BUGS CORREGIDOS vs v6:
//
// 1. REFORMAS: window.expandStadium/improveFacilities en index.html
//    NO devuelven el result (sin return). Solución: llamar directamente
//    a gameLogic.expandStadium() para obtener el resultado, y dejar
//    que la función original también se ejecute para el alert/refresh.
//
// 2. LOCAL/VISITANTE: state.week ya se incrementa DENTRO de
//    simulateFullWeek. Por eso hay que usar el calendario de la semana
//    jugada (weekBefore) con el estado ANTES de simular (stateBefore).
//    La proyección de PRÓXIMA jornada usa state.week + 1 DESPUÉS.
//
// 3. SLIDERS: el refresco del panel lee lastWeekFinance (inmutable,
//    guardado al simular) para la sección "Última jornada". Los sliders
//    solo actualizan la sección "Proyección" sin tocar lastWeekFinance.
//
// 4. DASHBOARD DOBLE CONTEO: el dashboard usa state.playerCompensations
//    que gameLogic ya incrementa en firePlayer. Nosotros NO incrementamos
//    ese campo, solo guardamos el detalle en seasonMovements.
//
// 5. DASHBOARD INGRESOS: se sincroniza con lastWeekFinance igual que
//    el panel de finanzas.
// ============================================================
(function () {
    'use strict';

    window._financesSuppressBalance = true;

    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const gl  = () => window.gameLogic;
    const gs  = () => gl() ? gl().getGameState() : null;

    function setText(id, text, color) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        if (color !== undefined) el.style.color = color;
    }

    // saveState: actualiza el estado interno (la flag suprime el balance extra)
    function saveState(updates) {
        if (gl()) gl().updateGameState(updates);
    }

    // ── Local / visitante ────────────────────────────────────────
    function isWeekHome(week, state) {
        if (!state || !state.seasonCalendar || !state.team) return true;
        const match = state.seasonCalendar
            .filter(m => m.week === week)
            .find(m => m.home === state.team || m.away === state.team);
        if (!match) return true; // pretemporada → tratar como local
        return match.home === state.team;
    }

    // Próximo partido: semana actual + 1 (tras simular, state.week ya es la nueva)
    function isNextMatchHome() {
        const state = gs();
        if (!state) return null;
        if (state.seasonType === 'preseason') return true;
        return isWeekHome(state.week + 1, state);
    }

    function computeAttendance(state, tp) {
        tp = tp !== undefined ? tp : (state.ticketPrice || 20);
        const raw = Math.floor(state.stadiumCapacity * (0.5 + state.popularity / 200 - tp / 100));
        return Math.max(0, Math.min(state.stadiumCapacity, raw));
    }

    // ── Registrar movimientos extraordinarios ───────────────────
    // SOLO guarda en seasonMovements[]. NO toca playerPurchases/
    // playerSalesIncome/playerCompensations (los gestiona gameLogic).
    function registerMovement(type, description, amount) {
        const state = gs();
        if (!state) return;
        const movements = state.seasonMovements || [];
        const dup = movements.some(m =>
            m.week === state.week && m.type === type &&
            m.description === description && m.amount === amount
        );
        if (dup) return;
        movements.push({ week: state.week, type, description, amount });
        const u = { seasonMovements: movements };
        if (type === 'renovation') {
            u.renovationExpenses = (state.renovationExpenses || 0) + Math.abs(amount);
        }
        saveState(u);
        console.log(`[Finances] Mov ${type}: ${description} ${fmt(amount)}€`);
    }
    window._financeRegisterMovement = registerMovement;

    // ── Aplicar balance semanal real ─────────────────────────────
    // weekBefore y stateBefore: capturados ANTES de que simulateFullWeek
    // incremente state.week y cambie el estado.
    function applyWeeklyBalance(weekBefore, stateBefore) {
        const state = gs();
        if (!state || !state.team) return;

        const home     = isWeekHome(weekBefore, stateBefore);
        const att      = computeAttendance(stateBefore);
        const ticketInc= home ? Math.floor(stateBefore.ticketPrice * att) : 0;
        const items    = Math.floor(stateBefore.fanbase * (stateBefore.popularity / 500) * (0.01 + Math.random() * 0.02));
        const merchInc = home ? items * stateBefore.merchandisingPrice : 0;
        const baseInc  = stateBefore.weeklyIncomeBase || 5000;
        const totalInc = ticketInc + merchInc + baseInc;

        // Gastos completos: salarios + staff + cuotas de prestamos + prima jugadores
        const salaries = (stateBefore.squad || []).reduce((s, p) => s + (p.salary || 0), 0);
        const staffSal = Object.values(stateBefore.staff || {}).filter(Boolean)
                               .reduce((s, x) => s + (x.salary || 0), 0);
        const loanPay  = stateBefore.fd_loanPayment || 0;  // cuotas prestamos (FinDeals)
        const bonusPay = stateBefore.fd_bonus       || 0;  // prima prometida (FinDeals)
        const totalExp = salaries + staffSal + loanPay + bonusPay;
        const net      = totalInc - totalExp;

        const lastWeek = {
            week: weekBefore, home, att: home ? att : 0, items: home ? items : 0,
            ticketInc, merchInc, baseInc, totalInc,
            totalExp, expSalaries: salaries, expStaff: staffSal,
            expLoans: loanPay, expBonus: bonusPay,
            net
        };

        saveState({ balance: state.balance + net, lastWeekFinance: lastWeek });
        console.log(`[Finances] Sem ${weekBefore} ${home?'LOCAL':'VISIT.'} -> +${fmt(totalInc)} -${fmt(totalExp)} (sal:${fmt(salaries)} staff:${fmt(staffSal)} loan:${fmt(loanPay)} bonus:${fmt(bonusPay)}) = ${fmt(net)}`);
    }

    // ── Cambio de temporada ──────────────────────────────────────
    let lastSeason = null;
    function checkSeasonChange() {
        const state = gs();
        if (!state || !state.currentSeason) return;
        if (lastSeason && lastSeason !== state.currentSeason) {
            saveState({ renovationExpenses: 0, seasonMovements: [], lastWeekFinance: null });
        }
        lastSeason = state.currentSeason;
    }

    // ============================================================
    // PARCHES sobre window.* (todos escribibles)
    // ============================================================

    // ── Avanzar semana ───────────────────────────────────────────
    function patchSimulateWeek() {
        if (typeof window.simulateWeek !== 'function') { setTimeout(patchSimulateWeek, 200); return; }
        const orig = window.simulateWeek;
        window.simulateWeek = async function (...args) {
            // Capturar estado y semana ANTES de simular
            const sb = gs();
            const wb = sb ? sb.week : 1;
            const result = await orig.apply(this, args);
            // Aplicar balance con los datos de la semana jugada
            applyWeeklyBalance(wb, sb);
            if (window._financeRefresh) window._financeRefresh();
            return result;
        };
        console.log('[Finances] simulateWeek ✓');
    }

    // ── Remodelaciones ───────────────────────────────────────────
    // FIX: window.expandStadium en index.html NO devuelve result.
    // Solución: llamar directamente a la función del módulo para
    // verificar éxito, Y TAMBIÉN llamar al wrapper original para
    // que se ejecuten el alert y refreshUI.
    function patchFacilities() {
        if (typeof window.expandStadium !== 'function') { setTimeout(patchFacilities, 200); return; }

        const origWindowExpand = window.expandStadium;
        window.expandStadium = function () {
            // Verificar si tenemos saldo suficiente antes (el módulo lo comprueba)
            const stateBefore = gs();
            // Llamar al wrapper original (hace alert + refreshUI pero no devuelve result)
            origWindowExpand.apply(this, arguments);
            // Detectar si la operación tuvo éxito comparando la capacidad
            const stateAfter = gs();
            if (stateAfter && stateBefore &&
                stateAfter.stadiumCapacity > stateBefore.stadiumCapacity) {
                registerMovement('renovation', 'Ampliacion estadio (+10.000 asientos)', -50000);
                if (window._financeRefresh) window._financeRefresh();
            }
        };

        const origWindowImprove = window.improveFacilities;
        window.improveFacilities = function () {
            const stateBefore = gs();
            origWindowImprove.apply(this, arguments);
            const stateAfter = gs();
            if (stateAfter && stateBefore &&
                (stateAfter.trainingLevel || 0) > (stateBefore.trainingLevel || 0)) {
                const lvl = stateAfter.trainingLevel || '?';
                registerMovement('renovation', `Mejora centro entrenamiento (nivel ${lvl})`, -30000);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
        console.log('[Finances] expandStadium / improveFacilities ✓');
    }

    // ── Despido jugadores ────────────────────────────────────────
    function patchFirePlayer() {
        if (typeof window.firePlayerConfirm !== 'function') { setTimeout(patchFirePlayer, 200); return; }
        const orig = window.firePlayerConfirm;
        window.firePlayerConfirm = function (playerName) {
            const sb = gs();
            orig.apply(this, arguments);
            const sa = gs();
            if (!sb || !sa) return;
            const fired = sb.squad.some(p => p.name === playerName) &&
                          !sa.squad.some(p => p.name === playerName);
            if (fired) {
                // gameLogic ya incrementó playerCompensations; solo guardamos el detalle
                const paid = (sa.playerCompensations || 0) - (sb.playerCompensations || 0);
                if (paid > 0) registerMovement('compensation', `Indemnizacion: ${playerName}`, -paid);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
        console.log('[Finances] firePlayerConfirm ✓');
    }

    // ── Contratación staff ───────────────────────────────────────
    function patchHireStaff() {
        if (typeof window.hireStaffConfirm !== 'function') { setTimeout(patchHireStaff, 200); return; }
        const orig = window.hireStaffConfirm;
        window.hireStaffConfirm = function (encodedCandidateJson) {
            const sb        = gs();
            const candidate = JSON.parse(decodeURIComponent(encodedCandidateJson));
            const prevStaff = sb ? sb.staff[candidate.role] : null;
            orig.apply(this, arguments);
            const sa = gs();
            if (!sa) return;
            const newStaff = sa.staff[candidate.role];
            if (newStaff && newStaff.name === candidate.name) {
                if (prevStaff) {
                    registerMovement('staff_compensation',
                        `Indem. staff: ${prevStaff.name} (${candidate.role})`, -(prevStaff.salary * 52));
                }
                registerMovement('staff_hire',
                    `Contratacion: ${candidate.name} (${candidate.role})`, -candidate.clausula);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
        console.log('[Finances] hireStaffConfirm ✓');
    }

    // ── Ventas ───────────────────────────────────────────────────
    function patchSellPlayer() {
        ['sellPlayer', 'sellPlayerConfirm'].forEach(fnName => {
            const tryPatch = () => {
                if (typeof window[fnName] !== 'function') { setTimeout(tryPatch, 200); return; }
                const orig = window[fnName];
                window[fnName] = function (name) {
                    const sb = gs();
                    orig.apply(this, arguments);
                    const sa = gs();
                    if (!sb || !sa) return;
                    const diff = (sa.playerSalesIncome || 0) - (sb.playerSalesIncome || 0);
                    if (diff > 0) {
                        registerMovement('sale', `Venta: ${name}`, diff);
                        if (window._financeRefresh) window._financeRefresh();
                    }
                };
            };
            tryPatch();
        });
        console.log('[Finances] sellPlayer ✓');
    }

    // ── Fichajes ─────────────────────────────────────────────────
    function patchTransfers() {
    // Sobreescribir SIEMPRE con setTimeout para ganar la race contra
    // el <script type="module"> de index.html que redefine submitTransferOffer
    const applyPatch = () => {
        const origT = window.submitTransferOffer;
        if (typeof origT !== 'function') { setTimeout(applyPatch, 200); return; }
        window.submitTransferOffer = function () {
            const sb = gs();
            const offerAmount = parseInt(document.getElementById('offerAmount')?.value || 0);
            origT.apply(this, arguments);
            const sa = gs();
            if (!sb || !sa) return;
            const diff = (sa.playerPurchases || 0) - (sb.playerPurchases || 0);
            if (diff > 0) {
                const newP = sa.squad.find(p => !sb.squad.some(q => q.name === p.name));
                registerMovement('purchase', `Fichaje: ${newP ? newP.name : 'Jugador'} (oferta: ${fmt(offerAmount)}€)`, -diff);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
    };
    setTimeout(applyPatch, 800); // después del módulo ES

    if (typeof window.submitLoanOffer === 'function') {
        const origL = window.submitLoanOffer;
        window.submitLoanOffer = function () {
            const sb = gs();
            origL.apply(this, arguments);
            const sa = gs();
            if (!sb || !sa) return;
            const newP = sa.squad.find(p =>
                !sb.squad.some(q => q.name === p.name) && p.contractType === 'loaned');
            if (newP) {
                registerMovement('purchase', `Cesion: ${newP.name}`, 0);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
    }
    console.log('[Finances] submitTransferOffer (con retry tardío) ✓');
}

    // ── Precios: no deben modificar lastWeekFinance ───────────────
    function patchPriceFunctions() {
        if (typeof window.setTicketPriceFromSlider !== 'function') { setTimeout(patchPriceFunctions, 200); return; }
        window.setTicketPriceFromSlider = function (value) {
            if (!gl()) return;
            gl().setTicketPrice(value);
            window.ui && window.ui.refreshUI && window.ui.refreshUI(gs());
            if (window._financeRefresh) window._financeRefresh();
        };
        window.setMerchandisingPriceFromSlider = function (value) {
            if (!gl()) return;
            gl().setMerchandisingPrice(value);
            window.ui && window.ui.refreshUI && window.ui.refreshUI(gs());
            if (window._financeRefresh) window._financeRefresh();
        };
        window.setTicketPriceFromInput = window.setTicketPriceFromSlider;
        window.setMerchandisingPriceFromInput = window.setMerchandisingPriceFromSlider;
        console.log('[Finances] priceFunctions ✓');
    }

    // ── Dashboard: sincronizar con lastWeekFinance ────────────────
    function patchDashboard() {
        const orig = window.updateDashboardStats;
        if (!orig) { setTimeout(patchDashboard, 300); return; }
        window.updateDashboardStats = function (state) {
            orig.call(this, state);
            if (!state) return;

            // Ingresos/gastos: mostrar la ÚLTIMA semana real (igual que el panel)
            const lw = state.lastWeekFinance;
            if (lw) {
                setText('dashIncome',   fmt(lw.totalInc) + '€', '#4CAF50');
                setText('dashExpenses', fmt(lw.totalExp) + '€', '#f44336');
                const wn = lw.net;
                const el = document.getElementById('dashWeekly');
                if (el) {
                    el.textContent = (wn >= 0 ? '+' : '') + fmt(wn) + '€';
                    el.className = `data-value ${wn < 0 ? 'negative' : ''}`;
                }
            }

            // Transferencias: usar acumulados de gameLogic (sin doble conteo)
            const p  = state.playerPurchases     || 0;
            const s  = state.playerSalesIncome   || 0;
            const c  = state.playerCompensations || 0;
            const tb = s - p - c;
            setText('dashPurchases',     fmt(p) + '€');
            setText('dashSales',         fmt(s) + '€');
            setText('dashCompensations', fmt(c) + '€');
            const tbEl = document.getElementById('dashTransferBalance');
            if (tbEl) {
                tbEl.textContent = (tb >= 0 ? '+' : '') + fmt(tb) + '€';
                tbEl.style.color = tb >= 0 ? '#4CAF50' : '#f44336';
            }
        };
        console.log('[Finances] patchDashboard ✓');
    }

    // ── Hook openPage ─────────────────────────────────────────────
    function hookOpenPage() {
        const orig = window.openPage;
        if (!orig) { setTimeout(hookOpenPage, 300); return; }
        window.openPage = function (pageId, ...args) {
            const r = orig.call(this, pageId, ...args);
            if (pageId === 'finance') setTimeout(refreshFinancePanel, 60);
            return r;
        };
    }

    // Sobreescribir updateFinanceDisplay varias veces para ganar timing race
    function ensureUpdateFD() { window.updateFinanceDisplay = refreshFinancePanel; }
    ensureUpdateFD();
    document.addEventListener('DOMContentLoaded', ensureUpdateFD);
    setTimeout(ensureUpdateFD, 100);
    setTimeout(ensureUpdateFD, 600);

    // ============================================================
    // PANEL HTML
    // ============================================================
    function buildFinancePanel() {
        const container = document.getElementById('finance');
        if (!container) { console.warn('[Finances] #finance no encontrado'); return; }
        container.innerHTML = `
        <div class="page-header">
            <h1>💼 Caja &amp; Finanzas</h1>
            <button class="page-close-btn" onclick="closePage('finance')">✖ CERRAR</button>
        </div>

        <!-- Balance -->
        <div class="data-box" style="text-align:center;padding:18px;margin-bottom:16px;">
            <div class="data-label">💰 Balance en Caja</div>
            <div id="fin_balance" style="font-size:2em;font-weight:bold;color:#fff;">0€</div>
        </div>

        <!-- ÚLTIMA JORNADA — datos reales ya aplicados al balance -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            📅 Última jornada jugada <span id="fin_lastLabel" style="font-weight:normal;font-size:.85em;color:#555;"></span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:.92em;">
            <tr><td style="padding:6px 4px;color:#aaa;">🎟️ Taquilla</td>
                <td style="text-align:right;" id="fin_lTicket">—</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_lTicketD">—</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">🛍️ Merchandising</td>
                <td style="text-align:right;" id="fin_lMerch">—</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_lMerchD">—</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">📺 Derechos TV / patrocinios</td>
                <td style="text-align:right;color:#4CAF50;" id="fin_lBase">—</td><td></td></tr>
            <tr style="border-top:1px solid #333;">
                <td style="padding:6px 4px;font-weight:bold;">Total ingresos reales</td>
                <td style="text-align:right;font-weight:bold;color:#4CAF50;" id="fin_lTotI">—</td><td></td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">💸 Salarios plantilla + staff</td>
                <td style="text-align:right;color:#f44336;" id="fin_lExp">—</td><td></td></tr>
            <tr id="fin_lLoanRow" style="display:none;"><td style="padding:6px 4px;color:#aaa;">🏦 Cuotas préstamos</td>
                <td style="text-align:right;color:#f44336;" id="fin_lLoanExp">—</td><td></td></tr>
            <tr id="fin_lBonusRow" style="display:none;"><td style="padding:6px 4px;color:#aaa;">💰 Prima jugadores</td>
                <td style="text-align:right;color:#f44336;" id="fin_lBonusExp">—</td><td></td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Resultado neto</td>
                <td style="text-align:right;font-weight:bold;" id="fin_lNet">—</td><td></td></tr>
        </table>

        <!-- GASTOS RECURRENTES -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            💸 Gastos recurrentes <span style="font-weight:normal;font-size:.85em;color:#555;">(semanal)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:.92em;">
            <tr><td style="padding:6px 4px;color:#aaa;">⚽ Salarios plantilla</td>
                <td style="text-align:right;color:#f44336;" id="fin_pSal">0€/sem</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_pCnt">—</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">👔 Salarios staff</td>
                <td style="text-align:right;color:#f44336;" id="fin_sSal">0€/sem</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_sCnt">—</td></tr>
            <tr id="fin_loanRow" style="display:none;"><td style="padding:6px 4px;color:#aaa;">🏦 Cuotas préstamos</td>
                <td style="text-align:right;color:#f44336;" id="fin_loanExp">0€/sem</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_loanCnt">—</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Total</td>
                <td style="text-align:right;font-weight:bold;color:#f44336;" id="fin_totExp">0€/sem</td><td></td></tr>
        </table>

        <!-- MERCADO -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            🔄 Mercado <span style="font-weight:normal;font-size:.85em;color:#555;">(temporada actual)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:.92em;">
            <tr><td style="padding:6px 4px;color:#aaa;">💸 Inversion en fichajes</td><td style="text-align:right;" id="fin_mPur">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">💰 Ingresos por ventas</td><td style="text-align:right;" id="fin_mSal">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">🚪 Indemnizaciones jugadores</td><td style="text-align:right;" id="fin_mCom">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">👔 Clausulas + indem. staff</td><td style="text-align:right;" id="fin_mStf">0€</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Balance de mercado</td>
                <td style="text-align:right;font-weight:bold;" id="fin_mBal">0€</td></tr>
        </table>

        <!-- REMODELACIONES -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            🏗️ Remodelaciones <span style="font-weight:normal;font-size:.85em;color:#555;">(temporada actual)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:.92em;">
            <tr><td style="padding:6px 4px;color:#aaa;">🏟️ Estadio</td>
                <td style="text-align:right;" id="fin_rSta">0€</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_rStaCap">—</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">🏋️ Centro entrenamiento</td>
                <td style="text-align:right;" id="fin_rTra">0€</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_rTraLvl">—</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Total</td>
                <td style="text-align:right;font-weight:bold;color:#f44336;" id="fin_rTot">0€</td><td></td></tr>
        </table>
        <div id="fin_rList" style="margin-bottom:22px;font-size:.85em;color:#555;font-style:italic;min-height:20px;">Sin remodelaciones esta temporada.</div>

        <!-- HISTORIAL -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">📋 Historial de movimientos</h2>
        <div id="fin_mList" style="max-height:260px;overflow-y:auto;background:rgba(0,0,0,.25);border-radius:8px;padding:10px;font-size:.84em;">
            <span style="color:#555;">Sin movimientos registrados esta temporada.</span>
        </div>`;
        console.log('[Finances] Panel construido ✓');
    }

    // _financePreviewProj eliminado (sección Proyección eliminada — los sliders están en Decisiones)

    // ============================================================
    // REFRESCO COMPLETO DEL PANEL
    // ============================================================
    function refreshFinancePanel() {
        if (!gl()) return;
        const state = gs();
        if (!state || !state.team) return;
        checkSeasonChange();

        // Balance — actualizar también header y dashboard para que coincidan siempre
        const bal = state.balance || 0;
        setText('fin_balance', fmt(bal) + '€', bal < 0 ? '#f44336' : '#4CAF50');

        // Sincronizar header "Dinero" y dashboard "Dinero en Caja" con el balance real
        const balFmt = fmt(bal) + '€';
        const balColor = bal < 0 ? '#f44336' : '#4CAF50';
        const balDispEl = document.getElementById('balanceDisplay');
        if (balDispEl) { balDispEl.textContent = balFmt; balDispEl.style.color = balColor; }
        const dashBalEl = document.getElementById('dashBalance');
        if (dashBalEl) { dashBalEl.textContent = balFmt; dashBalEl.style.color = balColor; }

        // ── Última jornada (datos fijos de lastWeekFinance) ──────
        const lw = state.lastWeekFinance;
        if (lw) {
            const locLabel = lw.home ? '🏟️ LOCAL' : '✈️ VISITANTE';
            setText('fin_lastLabel', `(Sem ${lw.week} — ${locLabel})`);
            setText('fin_lTicket', fmt(lw.ticketInc) + '€', lw.ticketInc > 0 ? '#4CAF50' : '#aaa');
            setText('fin_lTicketD', lw.home ? `— ${fmt(lw.att)} espectadores` : '— Partido visitante');
            setText('fin_lMerch',   fmt(lw.merchInc) + '€', lw.merchInc > 0 ? '#4CAF50' : '#aaa');
            setText('fin_lMerchD',  lw.home ? `— ${fmt(lw.items)} uds vendidas` : '— Partido visitante');
            setText('fin_lBase',    fmt(lw.baseInc) + '€', '#4CAF50');
            setText('fin_lTotI',    fmt(lw.totalInc) + '€', '#4CAF50');
            // Gastos desglosados
            const expSal = (lw.expSalaries || 0) + (lw.expStaff || 0);
            setText('fin_lExp',     fmt(expSal > 0 ? expSal : lw.totalExp) + '€', '#f44336');
            const lLoanRow = document.getElementById('fin_lLoanRow');
            if (lLoanRow) lLoanRow.style.display = (lw.expLoans || 0) > 0 ? '' : 'none';
            setText('fin_lLoanExp', fmt(lw.expLoans || 0) + '€', '#f44336');
            const lBonusRow = document.getElementById('fin_lBonusRow');
            if (lBonusRow) lBonusRow.style.display = (lw.expBonus || 0) > 0 ? '' : 'none';
            setText('fin_lBonusExp', fmt(lw.expBonus || 0) + '€', '#f44336');
            setText('fin_lNet',     (lw.net >= 0 ? '+' : '') + fmt(lw.net) + '€', lw.net >= 0 ? '#4CAF50' : '#f44336');
        } else {
            setText('fin_lastLabel', '(sin jornadas jugadas todavía)');
        }

        // ── Gastos recurrentes ───────────────────────────────────
        const pS     = state.squad.reduce((s, p) => s + (p.salary || 0), 0);
        const sArr   = Object.values(state.staff).filter(Boolean);
        const stS    = sArr.reduce((s, x) => s + (x.salary || 0), 0);
        const loanE  = state.fd_loanPayment || 0;
        const totE   = pS + stS + loanE;
        setText('fin_pSal',  fmt(pS)  + '€/sem', '#f44336');
        setText('fin_pCnt',  `— ${state.squad.length} jugadores`);
        setText('fin_sSal',  fmt(stS) + '€/sem', '#f44336');
        setText('fin_sCnt',  `— ${sArr.length} miembro${sArr.length !== 1 ? 's' : ''}`);
        // Cuotas préstamos
        const loanRow = document.getElementById('fin_loanRow');
        if (loanRow) loanRow.style.display = loanE > 0 ? '' : 'none';
        setText('fin_loanExp', fmt(loanE) + '€/sem', '#f44336');
        const fd = window.FinDeals ? null : null; // acceso via state
        const activeLoans = (state.fd_loans || []).filter(l => l.weeksLeft > 0);
        setText('fin_loanCnt', `— ${activeLoans.length} préstamo${activeLoans.length !== 1 ? 's' : ''}`);
        setText('fin_totExp', fmt(totE) + '€/sem', '#f44336');

        // ── Mercado (fuente: acumulados de gameLogic) ────────────
        const pur  = state.playerPurchases     || 0;
        const sal  = state.playerSalesIncome   || 0;
        const com  = state.playerCompensations || 0;
        const mvs  = state.seasonMovements || [];
        const stfC = mvs.filter(m => m.type === 'staff_hire' || m.type === 'staff_compensation')
                        .reduce((s, m) => s + Math.abs(m.amount), 0);
        const mBal = sal - pur - com - stfC;

        setText('fin_mPur', fmt(pur)  + '€', pur  > 0 ? '#f44336' : '#777');
        setText('fin_mSal', fmt(sal)  + '€', sal  > 0 ? '#4CAF50' : '#777');
        setText('fin_mCom', fmt(com)  + '€', com  > 0 ? '#f44336' : '#777');
        setText('fin_mStf', fmt(stfC) + '€', stfC > 0 ? '#f44336' : '#777');
        setText('fin_mBal', (mBal >= 0 ? '+' : '') + fmt(mBal) + '€', mBal >= 0 ? '#4CAF50' : '#f44336');

        // ── Remodelaciones ───────────────────────────────────────
        const rens = mvs.filter(m => m.type === 'renovation');
        // Detectar estadio: palabras clave del sistema antiguo Y nuevo injector de instalaciones
        const stadiumKeywords = /estadio|asiento|ampliar|iluminaci|pantalla|vip|restaurante|parking|tienda|c.sped|museo|seats|\[Estadio\]/i;
        // Detectar entrenamiento — también detecta el prefijo [Entrenamiento] del nuevo injector
        const trainingKeywords = /entrenamiento|centro|gimnasio|gym|m.dica|f.sio|piscina|nutrici|c.ntera|residencia|t.ctica|video|training|\[Entrenamiento\]/i;
        const sR   = rens.filter(m => stadiumKeywords.test(m.description)).reduce((s, m) => s + Math.abs(m.amount), 0);
        const tR   = rens.filter(m => !stadiumKeywords.test(m.description) && trainingKeywords.test(m.description)).reduce((s, m) => s + Math.abs(m.amount), 0);
        const toR  = rens.reduce((s, m) => s + Math.abs(m.amount), 0);

        setText('fin_rSta',   fmt(sR)  + '€', sR  > 0 ? '#f44336' : '#777');
        setText('fin_rStaCap',`Capacidad: ${fmt(state.stadiumCapacity)}`);
        setText('fin_rTra',   fmt(tR)  + '€', tR  > 0 ? '#f44336' : '#777');
        setText('fin_rTraLvl',`Nivel: ${state.trainingLevel || 1}`);
        setText('fin_rTot',   fmt(toR) + '€', toR > 0 ? '#f44336' : '#777');

        const rListEl = document.getElementById('fin_rList');
        if (rListEl) rListEl.innerHTML = rens.length === 0
            ? '<span style="color:#555;font-style:italic;">Sin remodelaciones esta temporada.</span>'
            : rens.map(r =>
                `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e1e1e;">
                    <span>Sem ${r.week} — ${r.description}</span>
                    <span style="color:#f44336;margin-left:16px;white-space:nowrap;">-${fmt(Math.abs(r.amount))}€</span>
                 </div>`).join('');

        // ── Historial ────────────────────────────────────────────
        const mListEl = document.getElementById('fin_mList');
        if (mListEl) {
            const all = mvs.filter(m => m.type !== 'renovation');
            const ic  = { purchase: '💸', sale: '💰', compensation: '🚪', staff_hire: '👔', staff_compensation: '🚫' };
            mListEl.innerHTML = all.length === 0
                ? '<span style="color:#555;">Sin movimientos registrados esta temporada.</span>'
                : [...all].reverse().map(m => {
                    const pos = m.amount > 0;
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1a1a1a;">
                        <span>${ic[m.type] || '•'} <span style="color:#888;">Sem ${m.week}</span> — ${m.description}</span>
                        <span style="font-weight:bold;color:${pos?'#4CAF50':'#f44336'};margin-left:12px;white-space:nowrap;">${pos?'+':''}${fmt(m.amount)}€</span>
                    </div>`;
                }).join('');
        }
    }

    window._financeRefresh      = refreshFinancePanel;
    window.updateFinanceDisplay = refreshFinancePanel;

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        if (!window.gameLogic) { setTimeout(init, 300); return; }
        buildFinancePanel();
        window.updateFinanceDisplay = refreshFinancePanel;
        patchSimulateWeek();
        patchFacilities();
        patchFirePlayer();
        patchHireStaff();
        patchSellPlayer();
        patchTransfers();
        patchPriceFunctions();
        patchDashboard();
        hookOpenPage();

        // Ocultar filas de finanzas del dashboard
    setTimeout(() => {
    ['dashIncome','dashExpenses','dashWeekly','dashPurchases','dashSales','dashCompensations','dashTransferBalance']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.closest('tr').style.display = 'none';
        });
    // Ocultar también el título "Estado Financiero" y "Balance Transferencias"
    document.querySelectorAll('#dashboard h2').forEach(h => {
        if (h.textContent.includes('Estado Financiero')) h.style.display = 'none';
    });
}, 500);
        
        console.log('[Finances] ✅ v7 listo.');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
