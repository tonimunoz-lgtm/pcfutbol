// ============================================================
// injector-finances.js  v5
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

    function saveState(updates) {
        if (gl()) gl().updateGameState(updates);
    }

    // ── Registrar movimiento ────────────────────────────────────
    function registerMovement(type, description, amount) {
        const state = gs();
        if (!state) return;
        const movements = state.seasonMovements || [];
        movements.push({ week: state.week, type, description, amount });
        const u = { seasonMovements: movements };
        if (type === 'purchase' || type === 'staff_hire')
            u.playerPurchases = (state.playerPurchases || 0) + Math.abs(amount);
        if (type === 'sale')
            u.playerSalesIncome = (state.playerSalesIncome || 0) + Math.abs(amount);
        if (type === 'compensation' || type === 'staff_compensation')
            u.playerCompensations = (state.playerCompensations || 0) + Math.abs(amount);
        if (type === 'renovation')
            u.renovationExpenses = (state.renovationExpenses || 0) + Math.abs(amount);
        saveState(u);
    }
    window._financeRegisterMovement = registerMovement;

    // ── Local/visitante ─────────────────────────────────────────
    function isWeekHome(week, state) {
        if (!state || !state.seasonCalendar || !state.team) return true;
        const match = state.seasonCalendar
            .filter(m => m.week === week)
            .find(m => m.home === state.team || m.away === state.team);
        if (!match) return true;
        return match.home === state.team;
    }
    function isNextMatchHome() {
        const state = gs();
        if (!state) return null;
        const nw = state.seasonType === 'preseason' ? state.week : state.week + 1;
        return isWeekHome(nw, state);
    }
    function computeAttendance(state) {
        const raw = Math.floor(
            state.stadiumCapacity * (0.5 + state.popularity / 200 - state.ticketPrice / 100)
        );
        return Math.max(0, Math.min(state.stadiumCapacity, raw));
    }

    // ── Aplicar balance semanal ─────────────────────────────────
    function applyWeeklyBalance(weekBefore, stateBefore) {
        const state = gs();
        if (!state || !state.team) return;
        const home       = isWeekHome(weekBefore, stateBefore);
        const att        = computeAttendance(state);
        const ticketInc  = home ? Math.floor(state.ticketPrice * att) : 0;
        const items      = Math.floor(state.fanbase * (state.popularity / 500) * (0.01 + Math.random() * 0.02));
        const merchInc   = home ? items * state.merchandisingPrice : 0;
        const baseInc    = state.weeklyIncomeBase || 5000;
        const totalInc   = ticketInc + merchInc + baseInc;
        const totalExp   = state.weeklyExpenses || 0;
        const net        = totalInc - totalExp;
        const hist       = state.weeklyFinancialHistory || [];
        hist.push({ week: weekBefore, income: totalInc, expenses: totalExp, net, home });
        saveState({ balance: state.balance + net, weeklyFinancialHistory: hist });
        console.log(`[Finances] Sem ${weekBefore} ${home ? 'LOCAL' : 'VISITANTE'} → +${fmt(totalInc)} -${fmt(totalExp)} = ${fmt(net)}€`);
    }

    // ── Cambio de temporada ─────────────────────────────────────
    let lastSeason = null;
    function checkSeasonChange() {
        const state = gs();
        if (!state || !state.currentSeason) return;
        if (lastSeason && lastSeason !== state.currentSeason) {
            saveState({
                playerPurchases: 0, playerSalesIncome: 0,
                playerCompensations: 0, renovationExpenses: 0,
                seasonMovements: [], weeklyFinancialHistory: []
            });
        }
        lastSeason = state.currentSeason;
    }

    // ============================================================
    // PARCHES — todos sobre window.* (escribibles)
    // Se llaman con retry porque los injectors se cargan en orden
    // y algunos wrappers los define injector-expose-functions.js
    // ============================================================

    function patchSimulateWeek() {
        if (typeof window.simulateWeek !== 'function') { setTimeout(patchSimulateWeek, 200); return; }
        const orig = window.simulateWeek;
        window.simulateWeek = async function (...args) {
            const sb = gs(); const wb = sb ? sb.week : 1;
            const result = await orig.apply(this, args);
            applyWeeklyBalance(wb, sb);
            if (window._financeRefresh) window._financeRefresh();
            return result;
        };
        console.log('[Finances] simulateWeek ✓');
    }

    function patchFacilities() {
        if (typeof window.expandStadium !== 'function') { setTimeout(patchFacilities, 200); return; }
        const origExpand = window.expandStadium;
        window.expandStadium = function () {
            const result = origExpand.apply(this, arguments);
            if (result && result.success) {
                registerMovement('renovation', 'Ampliacion estadio (+10.000 asientos)', -50000);
                if (window._financeRefresh) window._financeRefresh();
            }
            return result;
        };
        const origImprove = window.improveFacilities;
        window.improveFacilities = function () {
            const result = origImprove.apply(this, arguments);
            if (result && result.success) {
                registerMovement('renovation', `Mejora centro entrenamiento (nivel ${(gs()||{}).trainingLevel||'?'})`, -30000);
                if (window._financeRefresh) window._financeRefresh();
            }
            return result;
        };
        console.log('[Finances] expandStadium / improveFacilities ✓');
    }

    function patchFirePlayer() {
        if (typeof window.firePlayerConfirm !== 'function') { setTimeout(patchFirePlayer, 200); return; }
        const orig = window.firePlayerConfirm;
        window.firePlayerConfirm = function (playerName) {
            const sb = gs();
            orig.apply(this, arguments);
            const sa = gs();
            if (!sb || !sa) return;
            if (sb.squad.some(p => p.name === playerName) && !sa.squad.some(p => p.name === playerName)) {
                const paid = (sa.playerCompensations || 0) - (sb.playerCompensations || 0);
                if (paid > 0) registerMovement('compensation', `Indemnizacion jugador: ${playerName}`, -paid);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
        console.log('[Finances] firePlayerConfirm ✓');
    }

    function patchHireStaff() {
        if (typeof window.hireStaffConfirm !== 'function') { setTimeout(patchHireStaff, 200); return; }
        const orig = window.hireStaffConfirm;
        window.hireStaffConfirm = function (encodedCandidateJson) {
            const sb = gs();
            const candidate = JSON.parse(decodeURIComponent(encodedCandidateJson));
            const prevStaff = sb ? sb.staff[candidate.role] : null;
            orig.apply(this, arguments);
            const sa = gs();
            if (!sa) return;
            const newStaff = sa.staff[candidate.role];
            if (newStaff && newStaff.name === candidate.name) {
                if (prevStaff) registerMovement('staff_compensation', `Indemnizacion staff: ${prevStaff.name}`, -(prevStaff.salary * 52));
                registerMovement('staff_hire', `Contratacion staff: ${candidate.name} (${candidate.role})`, -candidate.clausula);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
        console.log('[Finances] hireStaffConfirm ✓');
    }

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
                console.log(`[Finances] ${fnName} ✓`);
            };
            tryPatch();
        });
    }

    function patchTransfers() {
        if (typeof window.submitTransferOffer !== 'function') { setTimeout(patchTransfers, 200); return; }
        const origTransfer = window.submitTransferOffer;
        window.submitTransferOffer = function () {
            const sb = gs();
            origTransfer.apply(this, arguments);
            const sa = gs();
            if (!sb || !sa) return;
            const diff = (sa.playerPurchases || 0) - (sb.playerPurchases || 0);
            if (diff > 0) {
                const newP = sa.squad.find(p => !sb.squad.some(q => q.name === p.name));
                registerMovement('purchase', `Fichaje: ${newP ? newP.name : 'Jugador'}`, -diff);
                if (window._financeRefresh) window._financeRefresh();
            }
        };
        if (typeof window.submitLoanOffer === 'function') {
            const origLoan = window.submitLoanOffer;
            window.submitLoanOffer = function () {
                const sb = gs();
                origLoan.apply(this, arguments);
                const sa = gs();
                if (!sb || !sa) return;
                const newP = sa.squad.find(p => !sb.squad.some(q => q.name === p.name) && p.contractType === 'loaned');
                if (newP) { registerMovement('purchase', `Cesion: ${newP.name}`, 0); if (window._financeRefresh) window._financeRefresh(); }
            };
        }
        console.log('[Finances] submitTransferOffer / submitLoanOffer ✓');
    }

    // ── Sobreescribir funciones de precio para que no llamen a la función original ──
    // setTicketPriceFromSlider y setMerchandisingPriceFromSlider de index.html llaman
    // window.updateFinanceDisplay que puede apuntar a la versión antigua.
    // Las reemplazamos para que llamen a nuestro refresco.
    function patchPriceFunctions() {
        if (typeof window.setTicketPriceFromSlider !== 'function') { setTimeout(patchPriceFunctions, 200); return; }

        window.setTicketPriceFromSlider = function (value) {
            if (!gl()) return;
            const result = gl().setTicketPrice(value);
            if (result && result.success) {
                window.ui && window.ui.refreshUI && window.ui.refreshUI(gs());
                if (window._financeRefresh) window._financeRefresh();
            }
        };

        window.setMerchandisingPriceFromSlider = function (value) {
            if (!gl()) return;
            const result = gl().setMerchandisingPrice(value);
            if (result && result.success) {
                window.ui && window.ui.refreshUI && window.ui.refreshUI(gs());
                if (window._financeRefresh) window._financeRefresh();
            }
        };

        // También los inputs de texto (por si se usan)
        window.setTicketPriceFromInput = function () {
            const input = document.getElementById('ticketPriceInput') || document.getElementById('fin_ticketSlider');
            if (!input || !gl()) return;
            const result = gl().setTicketPrice(input.value);
            if (result && result.success) {
                window.ui && window.ui.refreshUI && window.ui.refreshUI(gs());
                if (window._financeRefresh) window._financeRefresh();
            }
        };

        window.setMerchandisingPriceFromInput = function () {
            const input = document.getElementById('merchandisingPriceInput') || document.getElementById('fin_merchSlider');
            if (!input || !gl()) return;
            const result = gl().setMerchandisingPrice(input.value);
            if (result && result.success) {
                window.ui && window.ui.refreshUI && window.ui.refreshUI(gs());
                if (window._financeRefresh) window._financeRefresh();
            }
        };

        console.log('[Finances] setTicketPriceFromSlider / setMerchandisingPriceFromSlider ✓');
    }

    // ── Dashboard ────────────────────────────────────────────────
    function patchDashboard() {
        const orig = window.updateDashboardStats;
        if (!orig) return;
        window.updateDashboardStats = function (state) {
            orig.call(this, state);
            if (!state) return;
            const mvs = state.seasonMovements || [];
            const sum = t => mvs.filter(m => m.type === t).reduce((s, m) => s + Math.abs(m.amount), 0);
            const p  = sum('purchase');
            const sa = sum('sale');
            const c  = sum('compensation') + sum('staff_compensation');
            const tb = sa - p - c;
            [['dashPurchases', fmt(p) + '€'], ['dashSales', fmt(sa) + '€'], ['dashCompensations', fmt(c) + '€']]
                .forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.textContent = v; });
            const tbEl = document.getElementById('dashTransferBalance');
            if (tbEl) { tbEl.textContent = (tb >= 0 ? '+' : '') + fmt(tb) + '€'; tbEl.style.color = tb >= 0 ? '#4CAF50' : '#f44336'; }
        };
    }

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
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
            <div class="data-box" style="text-align:center;padding:14px;">
                <div class="data-label">💰 Balance en Caja</div>
                <div class="data-value" id="fin_balance" style="font-size:1.5em;font-weight:bold;">0€</div>
            </div>
            <div class="data-box" style="text-align:center;padding:14px;">
                <div class="data-label">📈 Ingresos estimados/jornada</div>
                <div class="data-value" id="fin_weeklyIncome" style="color:#4CAF50;font-size:1.2em;">0€</div>
                <div id="fin_homeAwayBadge" style="font-size:.75em;margin-top:4px;color:#aaa;"></div>
            </div>
            <div class="data-box" style="text-align:center;padding:14px;">
                <div class="data-label">📉 Gastos recurrentes/sem</div>
                <div class="data-value" id="fin_weeklyExpenses" style="color:#f44336;font-size:1.2em;">0€</div>
            </div>
        </div>
        <div style="text-align:center;margin-bottom:22px;padding:8px 16px;background:rgba(255,255,255,.04);border-radius:8px;">
            <span style="color:#aaa;font-size:.9em;">Resultado estimado próxima jornada: </span>
            <span id="fin_weeklyResult" style="font-weight:bold;font-size:1.15em;">0€</span>
        </div>

        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            📊 Ingresos <span style="font-weight:normal;font-size:.85em;color:#555;">(proyección próxima jornada)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:.92em;">
            <tr>
                <td style="padding:6px 4px;color:#aaa;">🎟️ Taquilla</td>
                <td style="text-align:right;min-width:90px;" id="fin_ticketIncome">0€</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_ticketDetail">—</td>
            </tr>
            <tr id="fin_awayWarningRow" style="display:none;">
                <td colspan="3" style="padding:4px 4px 4px 16px;color:#f5a623;font-size:.82em;">
                    ✈️ Partido visitante — sin taquilla ni merchandising en campo rival
                </td>
            </tr>
            <tr>
                <td style="padding:6px 4px;color:#aaa;">🛍️ Merchandising</td>
                <td style="text-align:right;" id="fin_merchIncome">0€</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_merchDetail">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px;color:#aaa;">📺 Derechos TV / patrocinios</td>
                <td style="text-align:right;color:#4CAF50;" id="fin_baseIncome">0€</td>
                <td></td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Total ingresos estimados</td>
                <td style="text-align:right;font-weight:bold;color:#4CAF50;" id="fin_totalIncomeRow">0€</td>
                <td></td>
            </tr>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0 22px;">
            <div style="background:rgba(255,255,255,.04);padding:12px;border-radius:8px;">
                <div style="font-size:.85em;color:#aaa;margin-bottom:6px;">Precio Entrada: <strong id="fin_ticketPriceVal">0€</strong> <span style="color:#555;font-size:.78em;">— desde próx. jornada local</span></div>
                <input type="range" id="fin_ticketSlider" min="5" max="100" value="20" style="width:100%;cursor:pointer;"
                    oninput="document.getElementById('fin_ticketPriceVal').textContent=this.value+'€';window._financePreviewPrice('ticket',this.value);"
                    onchange="window.setTicketPriceFromSlider&&window.setTicketPriceFromSlider(this.value);">
            </div>
            <div style="background:rgba(255,255,255,.04);padding:12px;border-radius:8px;">
                <div style="font-size:.85em;color:#aaa;margin-bottom:6px;">Precio Merch: <strong id="fin_merchPriceVal">0€</strong> <span style="color:#555;font-size:.78em;">— desde próx. jornada local</span></div>
                <input type="range" id="fin_merchSlider" min="1" max="50" value="10" style="width:100%;cursor:pointer;"
                    oninput="document.getElementById('fin_merchPriceVal').textContent=this.value+'€';window._financePreviewPrice('merch',this.value);"
                    onchange="window.setMerchandisingPriceFromSlider&&window.setMerchandisingPriceFromSlider(this.value);">
            </div>
        </div>

        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            💸 Gastos recurrentes <span style="font-weight:normal;font-size:.85em;color:#555;">(semanal)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:.92em;">
            <tr>
                <td style="padding:6px 4px;color:#aaa;">⚽ Salarios plantilla</td>
                <td style="text-align:right;color:#f44336;" id="fin_playerSalaries">0€/sem</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_playerCount">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px;color:#aaa;">👔 Salarios staff</td>
                <td style="text-align:right;color:#f44336;" id="fin_staffSalaries">0€/sem</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_staffCount">—</td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Total</td>
                <td style="text-align:right;font-weight:bold;color:#f44336;" id="fin_totalExpensesRow">0€/sem</td>
                <td></td>
            </tr>
        </table>

        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            🔄 Mercado <span style="font-weight:normal;font-size:.85em;color:#555;">(temporada actual)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:.92em;">
            <tr><td style="padding:6px 4px;color:#aaa;">💸 Inversion en fichajes</td><td style="text-align:right;" id="fin_purchases">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">👔 Contratacion staff (clausulas)</td><td style="text-align:right;" id="fin_staffHireCost">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">💰 Ingresos por ventas</td><td style="text-align:right;" id="fin_sales">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">🚪 Indemnizaciones jugadores</td><td style="text-align:right;" id="fin_compensations">0€</td></tr>
            <tr><td style="padding:6px 4px;color:#aaa;">🚫 Indemnizaciones staff</td><td style="text-align:right;" id="fin_staffCompensations">0€</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Balance de mercado</td>
                <td style="text-align:right;font-weight:bold;" id="fin_transferBalance">0€</td>
            </tr>
        </table>

        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            🏗️ Remodelaciones <span style="font-weight:normal;font-size:.85em;color:#555;">(temporada actual)</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:.92em;">
            <tr>
                <td style="padding:6px 4px;color:#aaa;">🏟️ Estadio</td>
                <td style="text-align:right;" id="fin_stadiumRenov">0€</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_stadiumCap">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px;color:#aaa;">🏋️ Centro entrenamiento</td>
                <td style="text-align:right;" id="fin_trainingRenov">0€</td>
                <td style="padding-left:14px;color:#666;font-size:.82em;" id="fin_trainingLvl">—</td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px;font-weight:bold;">Total</td>
                <td style="text-align:right;font-weight:bold;color:#f44336;" id="fin_totalRenov">0€</td>
                <td></td>
            </tr>
        </table>
        <div id="fin_renovList" style="margin-bottom:22px;font-size:.85em;color:#555;font-style:italic;min-height:20px;">Sin remodelaciones esta temporada.</div>

        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">📋 Historial de movimientos</h2>
        <div id="fin_movList" style="max-height:260px;overflow-y:auto;background:rgba(0,0,0,.25);border-radius:8px;padding:10px;font-size:.84em;">
            <span style="color:#555;">Sin movimientos registrados esta temporada.</span>
        </div>`;
        console.log('[Finances] Panel construido ✓');
    }

    // ── Preview slider ───────────────────────────────────────────
    window._financePreviewPrice = function (type, value) {
        const state = gs();
        if (!state) return;
        value = parseInt(value);
        const home = isNextMatchHome();
        if (type === 'ticket') {
            if (home === false) { setText('fin_ticketIncome','0€','#aaa'); setText('fin_ticketDetail','— Partido visitante'); return; }
            const att = Math.max(0, Math.min(state.stadiumCapacity, Math.floor(state.stadiumCapacity*(0.5+state.popularity/200-value/100))));
            setText('fin_ticketIncome', fmt(Math.floor(value*att))+'€','#4CAF50');
            setText('fin_ticketDetail',`— ${fmt(att)} espectadores x ${value}€`);
        }
        if (type === 'merch') {
            if (home === false) { setText('fin_merchIncome','0€','#aaa'); setText('fin_merchDetail','— Partido visitante'); return; }
            const items = Math.floor(state.fanbase*(state.popularity/500)*0.015);
            setText('fin_merchIncome', fmt(items*value)+'€','#4CAF50');
            setText('fin_merchDetail',`— ${fmt(items)} uds x ${value}€`);
        }
    };

    // ============================================================
    // REFRESCO COMPLETO DEL PANEL
    // ============================================================
    function refreshFinancePanel() {
        if (!gl()) return;
        const state = gs();
        if (!state || !state.team) return;
        checkSeasonChange();

        const balance = state.balance || 0;
        setText('fin_balance', fmt(balance)+'€', balance<0?'#f44336':'#fff');

        const home = isNextMatchHome();
        setText('fin_homeAwayBadge',
            home===true?'🏟️ Proxima jornada: LOCAL':home===false?'✈️ Proxima jornada: VISITANTE':'—',
            home===true?'#4CAF50':home===false?'#f5a623':'#666');
        const awRow = document.getElementById('fin_awayWarningRow');
        if (awRow) awRow.style.display = home===false?'':'none';

        const tp  = state.ticketPrice||20, mp = state.merchandisingPrice||10;
        const att = computeAttendance(state);
        const tI  = home===false?0:Math.floor(tp*att);
        const its = Math.floor(state.fanbase*(state.popularity/500)*0.015);
        const mI  = home===false?0:its*mp;
        const bI  = state.weeklyIncomeBase||5000;
        const totI= tI+mI+bI;
        const pS  = state.squad.reduce((s,p)=>s+(p.salary||0),0);
        const sArr= Object.values(state.staff).filter(Boolean);
        const stS = sArr.reduce((s,x)=>s+(x.salary||0),0);
        const totE= pS+stS;
        const net = totI-totE;

        setText('fin_weeklyIncome',  fmt(totI)+'€','#4CAF50');
        setText('fin_weeklyExpenses',fmt(totE)+'€','#f44336');
        setText('fin_weeklyResult',  (net>=0?'+':'')+fmt(net)+'€',net>=0?'#4CAF50':'#f44336');
        setText('fin_ticketIncome',  fmt(tI)+'€', home===false?'#aaa':'#4CAF50');
        setText('fin_ticketDetail',  home===false?'— Partido visitante':`— ${fmt(att)} espectadores x ${tp}€`);
        setText('fin_merchIncome',   fmt(mI)+'€', home===false?'#aaa':'#4CAF50');
        setText('fin_merchDetail',   home===false?'— Partido visitante':`— ${fmt(its)} uds x ${mp}€`);
        setText('fin_baseIncome',    fmt(bI)+'€','#4CAF50');
        setText('fin_totalIncomeRow',fmt(totI)+'€','#4CAF50');

        const ts=document.getElementById('fin_ticketSlider'); if(ts){ts.value=tp;setText('fin_ticketPriceVal',tp+'€');}
        const ms=document.getElementById('fin_merchSlider');  if(ms){ms.value=mp;setText('fin_merchPriceVal', mp+'€');}

        setText('fin_playerSalaries',fmt(pS)+'€/sem','#f44336');
        setText('fin_playerCount',   `— ${state.squad.length} jugadores`);
        setText('fin_staffSalaries', fmt(stS)+'€/sem','#f44336');
        setText('fin_staffCount',    `— ${sArr.length} miembro${sArr.length!==1?'s':''}`);
        setText('fin_totalExpensesRow',fmt(totE)+'€/sem','#f44336');

        const mvs=state.seasonMovements||[];
        const sum=t=>mvs.filter(m=>m.type===t).reduce((s,m)=>s+Math.abs(m.amount),0);
        const pur=sum('purchase'),shc=sum('staff_hire'),sal=sum('sale'),com=sum('compensation'),sco=sum('staff_compensation');
        const tb=sal-pur-shc-com-sco;
        setText('fin_purchases',        fmt(pur)+'€',pur>0?'#f44336':'#777');
        setText('fin_staffHireCost',    fmt(shc)+'€',shc>0?'#f44336':'#777');
        setText('fin_sales',            fmt(sal)+'€',sal>0?'#4CAF50':'#777');
        setText('fin_compensations',    fmt(com)+'€',com>0?'#f44336':'#777');
        setText('fin_staffCompensations',fmt(sco)+'€',sco>0?'#f44336':'#777');
        setText('fin_transferBalance',  (tb>=0?'+':'')+fmt(tb)+'€',tb>=0?'#4CAF50':'#f44336');

        const rens=mvs.filter(m=>m.type==='renovation');
        const sR=rens.filter(m=>/estadio|asiento/i.test(m.description)).reduce((s,m)=>s+Math.abs(m.amount),0);
        const tR=rens.filter(m=>/entrenamiento/i.test(m.description)).reduce((s,m)=>s+Math.abs(m.amount),0);
        const toR=rens.reduce((s,m)=>s+Math.abs(m.amount),0);
        setText('fin_stadiumRenov', fmt(sR)+'€', sR>0?'#f44336':'#777');
        setText('fin_stadiumCap',   `Capacidad: ${fmt(state.stadiumCapacity)}`);
        setText('fin_trainingRenov',fmt(tR)+'€', tR>0?'#f44336':'#777');
        setText('fin_trainingLvl',  `Nivel: ${state.trainingLevel||1}`);
        setText('fin_totalRenov',   fmt(toR)+'€',toR>0?'#f44336':'#777');

        const renovEl=document.getElementById('fin_renovList');
        if(renovEl) renovEl.innerHTML=rens.length===0
            ?'<span style="color:#555;font-style:italic;">Sin remodelaciones esta temporada.</span>'
            :rens.map(r=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e1e1e;">
                <span>Sem ${r.week} — ${r.description}</span>
                <span style="color:#f44336;margin-left:16px;white-space:nowrap;">-${fmt(Math.abs(r.amount))}€</span></div>`).join('');

        const movEl=document.getElementById('fin_movList');
        if(movEl){
            const nR=mvs.filter(m=>m.type!=='renovation');
            const ic={purchase:'💸',sale:'💰',compensation:'🚪',staff_hire:'👔',staff_compensation:'🚫'};
            movEl.innerHTML=nR.length===0
                ?'<span style="color:#555;">Sin movimientos registrados esta temporada.</span>'
                :[...nR].reverse().map(m=>{const pos=m.amount>0;return`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1a1a1a;">
                    <span>${ic[m.type]||'•'} <span style="color:#888;">Sem ${m.week}</span> — ${m.description}</span>
                    <span style="font-weight:bold;color:${pos?'#4CAF50':'#f44336'};margin-left:12px;white-space:nowrap;">${pos?'+':''}${fmt(m.amount)}€</span></div>`;}).join('');
        }
    }

    // Sobreescribir updateFinanceDisplay de index.html
    window._financeRefresh  = refreshFinancePanel;
    window.updateFinanceDisplay = refreshFinancePanel;

    // También sobreescribir DESPUÉS de que el módulo pueda haberla pisado
    document.addEventListener('DOMContentLoaded', () => {
        window.updateFinanceDisplay = refreshFinancePanel;
    });
    // Y una vez más con un pequeño delay por si acaso
    setTimeout(() => { window.updateFinanceDisplay = refreshFinancePanel; }, 100);
    setTimeout(() => { window.updateFinanceDisplay = refreshFinancePanel; }, 500);

    // ── Hook openPage ────────────────────────────────────────────
    function hookOpenPage() {
        const orig = window.openPage;
        if (!orig) { setTimeout(hookOpenPage, 300); return; }
        window.openPage = function (pageId, ...args) {
            const r = orig.call(this, pageId, ...args);
            if (pageId === 'finance') setTimeout(refreshFinancePanel, 60);
            return r;
        };
        console.log('[Finances] openPage hooked ✓');
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        if (!window.gameLogic) { setTimeout(init, 300); return; }

        buildFinancePanel();

        // Asegurar que updateFinanceDisplay apunta a nuestra versión
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

        console.log('[Finances] ✅ v5 cargado. _financesSuppressBalance = true');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
