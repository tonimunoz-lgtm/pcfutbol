// ============================================================
// injector-finances.js  v2
// Sistema de finanzas completo — PC Fútbol Manager
// ============================================================
(function () {
    'use strict';

    // ============================================================
    // UTILIDADES
    // ============================================================
    function fmt(n) {
        return Math.round(n || 0).toLocaleString('es-ES');
    }
    function setText(id, text, color) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        if (color !== undefined) el.style.color = color;
    }
    function gl() { return window.gameLogic; }
    function gs() { return gl() && gl().getGameState(); }

    // ============================================================
    // REGISTRO DE MOVIMIENTOS EXTRAORDINARIOS
    // ============================================================
    function registerMovement(type, description, amount) {
        const state = gs();
        if (!state) return;
        const movements = state.seasonMovements || [];
        movements.push({ week: state.week, type, description, amount });

        const updates = { seasonMovements: movements };

        if (type === 'purchase' || type === 'staff_hire') {
            updates.playerPurchases = (state.playerPurchases || 0) + Math.abs(amount);
        }
        if (type === 'sale') {
            updates.playerSalesIncome = (state.playerSalesIncome || 0) + Math.abs(amount);
        }
        if (type === 'compensation' || type === 'staff_compensation') {
            updates.playerCompensations = (state.playerCompensations || 0) + Math.abs(amount);
        }
        if (type === 'renovation') {
            updates.renovationExpenses = (state.renovationExpenses || 0) + Math.abs(amount);
        }

        gl().updateGameState(updates);
    }

    window._financeRegisterMovement = registerMovement;

    // ============================================================
    // INTERCEPTAR window.expandStadium y window.improveFacilities
    // Estos ya son funciones window definidas en index.html.
    // Las parcheamos para registrar el movimiento en el historial.
    // ============================================================
    function patchFacilities() {
        if (typeof window.expandStadium !== 'function') {
            setTimeout(patchFacilities, 200);
            return;
        }

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
                const lvl = (gs() || {}).trainingLevel || '?';
                registerMovement('renovation', `Mejora centro de entrenamiento (nivel ${lvl})`, -30000);
                if (window._financeRefresh) window._financeRefresh();
            }
            return result;
        };

        console.log('[Finances] Remodelaciones parcheadas.');
    }

    // ============================================================
    // INTERCEPTAR window.hireStaffConfirm
    // ============================================================
    function patchHireStaff() {
        if (typeof window.hireStaffConfirm !== 'function') {
            setTimeout(patchHireStaff, 200);
            return;
        }

        const origHire = window.hireStaffConfirm;
        window.hireStaffConfirm = function (encodedCandidateJson) {
            const stateBefore = gs();
            const candidate = JSON.parse(decodeURIComponent(encodedCandidateJson));
            const existingStaff = stateBefore ? stateBefore.staff[candidate.role] : null;

            origHire.apply(this, arguments);

            const stateAfter = gs();
            if (!stateAfter) return;
            const newStaff = stateAfter.staff[candidate.role];

            if (newStaff && newStaff.name === candidate.name) {
                if (existingStaff) {
                    const ind = existingStaff.salary * 52;
                    registerMovement('staff_compensation',
                        `Indemnizacion staff: ${existingStaff.name} (${candidate.role})`, -ind);
                }
                registerMovement('staff_hire',
                    `Contratacion staff: ${candidate.name} (${candidate.role})`, -candidate.clausula);
            }

            if (window._financeRefresh) window._financeRefresh();
        };

        console.log('[Finances] hireStaffConfirm parcheado.');
    }

    // ============================================================
    // DETECTAR LOCAL / VISITANTE
    // ============================================================
    function isNextMatchHome() {
        const state = gs();
        if (!state || !state.seasonCalendar || !state.team) return null;
        const nextWeek = state.week + 1;
        const matches = state.seasonCalendar.filter(m => m.week === nextWeek);
        const myMatch = matches.find(m => m.home === state.team || m.away === state.team);
        if (!myMatch) return null;
        return myMatch.home === state.team;
    }

    // ============================================================
    // DETECTAR CAMBIO DE TEMPORADA Y RESETEAR ACUMULADOS
    // ============================================================
    let lastSeason = null;
    function checkSeasonChange() {
        const state = gs();
        if (!state || !state.currentSeason) return;
        if (lastSeason && lastSeason !== state.currentSeason) {
            gl().updateGameState({
                playerPurchases: 0,
                playerSalesIncome: 0,
                playerCompensations: 0,
                renovationExpenses: 0,
                seasonMovements: [],
                weeklyFinancialHistory: []
            });
            console.log('[Finances] Nueva temporada — acumulados reseteados.');
        }
        lastSeason = state.currentSeason;
    }

    // ============================================================
    // CONSTRUIR PANEL HTML
    // ============================================================
    function buildFinancePanel() {
        const container = document.getElementById('finance');
        if (!container) { console.warn('[Finances] #finance no encontrado.'); return; }

        container.innerHTML = `
        <div class="page-header">
            <h1>💼 Caja &amp; Finanzas</h1>
            <button class="page-close-btn" onclick="closePage('finance')">✖ CERRAR</button>
        </div>

        <!-- RESUMEN SUPERIOR -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px;">
            <div class="data-box" style="text-align:center; padding:14px;">
                <div class="data-label">💰 Balance en Caja</div>
                <div class="data-value" id="fin_balance" style="font-size:1.5em; font-weight:bold;">0€</div>
            </div>
            <div class="data-box" style="text-align:center; padding:14px;">
                <div class="data-label">📈 Ingresos estimados/jornada</div>
                <div class="data-value" id="fin_weeklyIncome" style="color:#4CAF50; font-size:1.2em;">0€</div>
                <div id="fin_homeAwayBadge" style="font-size:0.75em; margin-top:4px; color:#aaa;"></div>
            </div>
            <div class="data-box" style="text-align:center; padding:14px;">
                <div class="data-label">📉 Gastos recurrentes/sem</div>
                <div class="data-value" id="fin_weeklyExpenses" style="color:#f44336; font-size:1.2em;">0€</div>
            </div>
        </div>
        <div style="text-align:center; margin-bottom:22px; padding:8px 16px; background:rgba(255,255,255,0.04); border-radius:8px;">
            <span style="color:#aaa; font-size:0.9em;">Resultado estimado próxima jornada: </span>
            <span id="fin_weeklyResult" style="font-weight:bold; font-size:1.15em;">0€</span>
        </div>

        <!-- INGRESOS RECURRENTES -->
        <h2 style="border-bottom:1px solid #2a2a2a; padding-bottom:6px; margin-bottom:10px; font-size:1em; color:#ccc; text-transform:uppercase; letter-spacing:1px;">
            📊 Ingresos recurrentes <span style="font-weight:normal; font-size:0.85em; color:#555;">(proyección próxima jornada)</span>
        </h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:0.92em;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🎟️ Taquilla</td>
                <td style="text-align:right; min-width:90px;" id="fin_ticketIncome">0€</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_ticketDetail">—</td>
            </tr>
            <tr id="fin_awayWarningRow" style="display:none;">
                <td colspan="3" style="padding:4px 4px 4px 16px; color:#f5a623; font-size:0.82em;">
                    ✈️ Partido visitante — sin ingresos de taquilla ni merchandising en campo rival
                </td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🛍️ Merchandising</td>
                <td style="text-align:right;" id="fin_merchIncome">0€</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_merchDetail">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">📺 Derechos TV / patrocinios</td>
                <td style="text-align:right; color:#4CAF50;" id="fin_baseIncome">0€</td>
                <td></td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px; font-weight:bold;">Total ingresos estimados</td>
                <td style="text-align:right; font-weight:bold; color:#4CAF50;" id="fin_totalIncomeRow">0€</td>
                <td></td>
            </tr>
        </table>

        <!-- Controles precio -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:12px 0 22px;">
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:8px;">
                <div style="font-size:0.85em; color:#aaa; margin-bottom:6px;">
                    Precio Entrada: <strong id="fin_ticketPriceVal">0€</strong>
                    <span style="color:#555; font-size:0.78em;"> — efecto desde próxima jornada</span>
                </div>
                <input type="range" id="fin_ticketSlider" min="5" max="100" value="20"
                    style="width:100%; cursor:pointer;"
                    oninput="document.getElementById('fin_ticketPriceVal').textContent=this.value+'€'; window._financePreviewPrice('ticket',this.value);"
                    onchange="window.setTicketPriceFromSlider && window.setTicketPriceFromSlider(this.value);">
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:8px;">
                <div style="font-size:0.85em; color:#aaa; margin-bottom:6px;">
                    Precio Merch: <strong id="fin_merchPriceVal">0€</strong>
                    <span style="color:#555; font-size:0.78em;"> — efecto desde próxima jornada</span>
                </div>
                <input type="range" id="fin_merchSlider" min="1" max="50" value="10"
                    style="width:100%; cursor:pointer;"
                    oninput="document.getElementById('fin_merchPriceVal').textContent=this.value+'€'; window._financePreviewPrice('merch',this.value);"
                    onchange="window.setMerchandisingPriceFromSlider && window.setMerchandisingPriceFromSlider(this.value);">
            </div>
        </div>

        <!-- GASTOS RECURRENTES -->
        <h2 style="border-bottom:1px solid #2a2a2a; padding-bottom:6px; margin-bottom:10px; font-size:1em; color:#ccc; text-transform:uppercase; letter-spacing:1px;">
            💸 Gastos recurrentes <span style="font-weight:normal; font-size:0.85em; color:#555;">(semanal)</span>
        </h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:22px; font-size:0.92em;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">⚽ Salarios plantilla</td>
                <td style="text-align:right; color:#f44336;" id="fin_playerSalaries">0€/sem</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_playerCount">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">👔 Salarios staff técnico</td>
                <td style="text-align:right; color:#f44336;" id="fin_staffSalaries">0€/sem</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_staffCount">—</td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px; font-weight:bold;">Total gastos recurrentes</td>
                <td style="text-align:right; font-weight:bold; color:#f44336;" id="fin_totalExpensesRow">0€/sem</td>
                <td></td>
            </tr>
        </table>

        <!-- MERCADO DE FICHAJES -->
        <h2 style="border-bottom:1px solid #2a2a2a; padding-bottom:6px; margin-bottom:10px; font-size:1em; color:#ccc; text-transform:uppercase; letter-spacing:1px;">
            🔄 Mercado de fichajes <span style="font-weight:normal; font-size:0.85em; color:#555;">(temporada actual)</span>
        </h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:22px; font-size:0.92em;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">💸 Inversion en fichajes</td>
                <td style="text-align:right;" id="fin_purchases">0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">👔 Contratacion staff (clausulas)</td>
                <td style="text-align:right;" id="fin_staffHireCost">0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">💰 Ingresos por ventas de jugadores</td>
                <td style="text-align:right;" id="fin_sales">0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🚪 Indemnizaciones jugadores</td>
                <td style="text-align:right;" id="fin_compensations">0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🚫 Indemnizaciones staff</td>
                <td style="text-align:right;" id="fin_staffCompensations">0€</td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px; font-weight:bold;">Balance de mercado</td>
                <td style="text-align:right; font-weight:bold;" id="fin_transferBalance">0€</td>
            </tr>
        </table>

        <!-- REMODELACIONES -->
        <h2 style="border-bottom:1px solid #2a2a2a; padding-bottom:6px; margin-bottom:10px; font-size:1em; color:#ccc; text-transform:uppercase; letter-spacing:1px;">
            🏗️ Remodelaciones <span style="font-weight:normal; font-size:0.85em; color:#555;">(temporada actual)</span>
        </h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:0.92em;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🏟️ Ampliaciones de estadio</td>
                <td style="text-align:right;" id="fin_stadiumRenov">0€</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_stadiumCap">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🏋️ Mejoras centro entrenamiento</td>
                <td style="text-align:right;" id="fin_trainingRenov">0€</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_trainingLvl">—</td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px; font-weight:bold;">Total remodelaciones</td>
                <td style="text-align:right; font-weight:bold; color:#f44336;" id="fin_totalRenov">0€</td>
                <td></td>
            </tr>
        </table>
        <div id="fin_renovList" style="margin-bottom:22px; font-size:0.85em; color:#555; font-style:italic;">
            Sin remodelaciones esta temporada.
        </div>

        <!-- HISTORIAL -->
        <h2 style="border-bottom:1px solid #2a2a2a; padding-bottom:6px; margin-bottom:10px; font-size:1em; color:#ccc; text-transform:uppercase; letter-spacing:1px;">
            📋 Historial de movimientos
        </h2>
        <div id="fin_movList" style="max-height:260px; overflow-y:auto; background:rgba(0,0,0,0.25); border-radius:8px; padding:10px; font-size:0.84em;">
            <span style="color:#555;">Sin movimientos registrados esta temporada.</span>
        </div>
        `;

        console.log('[Finances] Panel construido.');
    }

    // ============================================================
    // PREVISUALIZAR precio al mover slider (sin aplicar al balance)
    // ============================================================
    window._financePreviewPrice = function (type, value) {
        const state = gs();
        if (!state) return;
        value = parseInt(value);
        const isHome = isNextMatchHome();

        if (type === 'ticket') {
            let att = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (value / 100)));
            att = Math.max(0, Math.min(state.stadiumCapacity, att));
            if (isHome === false) {
                setText('fin_ticketIncome', '0€', '#aaa');
                setText('fin_ticketDetail', '— Partido visitante');
            } else {
                setText('fin_ticketIncome', fmt(Math.floor(value * att)) + '€', '#4CAF50');
                setText('fin_ticketDetail', `— ${fmt(att)} espectadores estimados x ${value}€`);
            }
        }
        if (type === 'merch') {
            const items = Math.floor(state.fanbase * (state.popularity / 500) * 0.015);
            if (isHome === false) {
                setText('fin_merchIncome', '0€', '#aaa');
                setText('fin_merchDetail', '— Partido visitante');
            } else {
                setText('fin_merchIncome', fmt(items * value) + '€', '#4CAF50');
                setText('fin_merchDetail', `— ${fmt(items)} uds estimadas x ${value}€`);
            }
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

        // Balance
        const balance = state.balance || 0;
        setText('fin_balance', fmt(balance) + '€', balance < 0 ? '#f44336' : '#fff');

        // Local/visitante
        const isHome = isNextMatchHome();
        setText('fin_homeAwayBadge',
            isHome === true ? '🏟️ Proxima jornada: LOCAL' :
            isHome === false ? '✈️ Proxima jornada: VISITANTE' : '—',
            isHome === true ? '#4CAF50' : isHome === false ? '#f5a623' : '#666');

        const awayRow = document.getElementById('fin_awayWarningRow');
        if (awayRow) awayRow.style.display = isHome === false ? '' : 'none';

        // Calcular ingresos estimados
        const ticketPrice = state.ticketPrice || 20;
        const merchPrice = state.merchandisingPrice || 10;
        let attendance = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (ticketPrice / 100)));
        attendance = Math.max(0, Math.min(state.stadiumCapacity, attendance));
        const ticketIncome = isHome === false ? 0 : Math.floor(ticketPrice * attendance);
        const items = Math.floor(state.fanbase * (state.popularity / 500) * 0.015);
        const merchIncome = isHome === false ? 0 : items * merchPrice;
        const baseIncome = state.weeklyIncomeBase || 5000;
        const totalIncome = ticketIncome + merchIncome + baseIncome;

        // Gastos recurrentes
        const playerSalaries = state.squad.reduce((sum, p) => sum + (p.salary || 0), 0);
        const staffActive = Object.values(state.staff).filter(Boolean);
        const staffSalaries = staffActive.reduce((sum, s) => sum + (s.salary || 0), 0);
        const totalExpenses = playerSalaries + staffSalaries;

        const weeklyNet = totalIncome - totalExpenses;

        setText('fin_weeklyIncome', fmt(totalIncome) + '€', '#4CAF50');
        setText('fin_weeklyExpenses', fmt(totalExpenses) + '€', '#f44336');
        setText('fin_weeklyResult',
            (weeklyNet >= 0 ? '+' : '') + fmt(weeklyNet) + '€',
            weeklyNet >= 0 ? '#4CAF50' : '#f44336');

        // Ingresos detalle
        setText('fin_ticketIncome', fmt(ticketIncome) + '€', isHome === false ? '#aaa' : '#4CAF50');
        setText('fin_ticketDetail', isHome === false ? '— Partido visitante' : `— ${fmt(attendance)} espectadores estimados x ${ticketPrice}€`);
        setText('fin_merchIncome', fmt(merchIncome) + '€', isHome === false ? '#aaa' : '#4CAF50');
        setText('fin_merchDetail', isHome === false ? '— Partido visitante' : `— ${fmt(items)} uds estimadas x ${merchPrice}€`);
        setText('fin_baseIncome', fmt(baseIncome) + '€', '#4CAF50');
        setText('fin_totalIncomeRow', fmt(totalIncome) + '€', '#4CAF50');

        // Sliders
        const ts = document.getElementById('fin_ticketSlider');
        if (ts) { ts.value = ticketPrice; setText('fin_ticketPriceVal', ticketPrice + '€'); }
        const ms = document.getElementById('fin_merchSlider');
        if (ms) { ms.value = merchPrice; setText('fin_merchPriceVal', merchPrice + '€'); }

        // Gastos detalle
        setText('fin_playerSalaries', fmt(playerSalaries) + '€/sem', '#f44336');
        setText('fin_playerCount', `— ${state.squad.length} jugadores`);
        setText('fin_staffSalaries', fmt(staffSalaries) + '€/sem', '#f44336');
        setText('fin_staffCount', `— ${staffActive.length} miembro${staffActive.length !== 1 ? 's' : ''} del staff`);
        setText('fin_totalExpensesRow', fmt(totalExpenses) + '€/sem', '#f44336');

        // Mercado
        const movements = state.seasonMovements || [];
        const purchases = state.playerPurchases || 0;
        const sales = state.playerSalesIncome || 0;
        const compensations = state.playerCompensations || 0;
        const staffHireCost = movements.filter(m => m.type === 'staff_hire').reduce((s, m) => s + Math.abs(m.amount), 0);
        const staffCompCost = movements.filter(m => m.type === 'staff_compensation').reduce((s, m) => s + Math.abs(m.amount), 0);
        const transferBal = sales - purchases - compensations - staffHireCost - staffCompCost;

        setText('fin_purchases', fmt(purchases) + '€', purchases > 0 ? '#f44336' : '#777');
        setText('fin_staffHireCost', fmt(staffHireCost) + '€', staffHireCost > 0 ? '#f44336' : '#777');
        setText('fin_sales', fmt(sales) + '€', sales > 0 ? '#4CAF50' : '#777');
        setText('fin_compensations', fmt(compensations) + '€', compensations > 0 ? '#f44336' : '#777');
        setText('fin_staffCompensations', fmt(staffCompCost) + '€', staffCompCost > 0 ? '#f44336' : '#777');
        setText('fin_transferBalance',
            (transferBal >= 0 ? '+' : '') + fmt(transferBal) + '€',
            transferBal >= 0 ? '#4CAF50' : '#f44336');

        // Remodelaciones
        const renovations = movements.filter(m => m.type === 'renovation');
        const stadiumRenov = renovations.filter(m => m.description.toLowerCase().includes('estadio') || m.description.toLowerCase().includes('asiento')).reduce((s, m) => s + Math.abs(m.amount), 0);
        const trainingRenov = renovations.filter(m => m.description.toLowerCase().includes('entrenamiento')).reduce((s, m) => s + Math.abs(m.amount), 0);
        const totalRenov = state.renovationExpenses || 0;

        setText('fin_stadiumRenov', fmt(stadiumRenov) + '€', stadiumRenov > 0 ? '#f44336' : '#777');
        setText('fin_stadiumCap', `Capacidad actual: ${fmt(state.stadiumCapacity)}`);
        setText('fin_trainingRenov', fmt(trainingRenov) + '€', trainingRenov > 0 ? '#f44336' : '#777');
        setText('fin_trainingLvl', `Nivel actual: ${state.trainingLevel || 1}`);
        setText('fin_totalRenov', fmt(totalRenov) + '€', totalRenov > 0 ? '#f44336' : '#777');

        const renovEl = document.getElementById('fin_renovList');
        if (renovEl) {
            renovEl.innerHTML = renovations.length === 0
                ? '<span style="color:#555; font-style:italic;">Sin remodelaciones esta temporada.</span>'
                : renovations.map(r =>
                    `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #1e1e1e;">
                        <span>Sem ${r.week} — ${r.description}</span>
                        <span style="color:#f44336; margin-left:16px; white-space:nowrap;">-${fmt(Math.abs(r.amount))}€</span>
                    </div>`).join('');
        }

        // Historial
        const movEl = document.getElementById('fin_movList');
        if (movEl) {
            const nonRenov = movements.filter(m => m.type !== 'renovation');
            if (nonRenov.length === 0) {
                movEl.innerHTML = '<span style="color:#555;">Sin movimientos registrados esta temporada.</span>';
            } else {
                const icons = { purchase: '💸', sale: '💰', compensation: '🚪', staff_hire: '👔', staff_compensation: '🚫' };
                movEl.innerHTML = [...nonRenov].reverse().map(m => {
                    const pos = m.amount > 0;
                    return `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #1a1a1a;">
                        <span>${icons[m.type] || '•'} <span style="color:#888;">Sem ${m.week}</span> — ${m.description}</span>
                        <span style="font-weight:bold; color:${pos ? '#4CAF50' : '#f44336'}; margin-left:12px; white-space:nowrap;">
                            ${pos ? '+' : ''}${fmt(m.amount)}€
                        </span>
                    </div>`;
                }).join('');
            }
        }
    }

    window._financeRefresh = refreshFinancePanel;
    window.updateFinanceDisplay = refreshFinancePanel;

    // ============================================================
    // PATCH DASHBOARD
    // ============================================================
    function patchDashboard() {
        const orig = window.updateDashboardStats;
        if (!orig) return;
        window.updateDashboardStats = function (state) {
            orig.call(this, state);
            if (!state) return;
            const p = state.playerPurchases || 0;
            const s = state.playerSalesIncome || 0;
            const c = state.playerCompensations || 0;
            const tb = s - p - c;
            [['dashPurchases', fmt(p) + '€'], ['dashSales', fmt(s) + '€'], ['dashCompensations', fmt(c) + '€']]
                .forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
            const tbEl = document.getElementById('dashTransferBalance');
            if (tbEl) { tbEl.textContent = (tb >= 0 ? '+' : '') + fmt(tb) + '€'; tbEl.style.color = tb >= 0 ? '#4CAF50' : '#f44336'; }
        };
    }

    // ============================================================
    // HOOK openPage
    // ============================================================
    function hookOpenPage() {
        const orig = window.openPage;
        if (!orig) { setTimeout(hookOpenPage, 300); return; }
        window.openPage = function (pageId, ...args) {
            const r = orig.call(this, pageId, ...args);
            if (pageId === 'finance') setTimeout(refreshFinancePanel, 60);
            return r;
        };
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        if (!window.gameLogic) { setTimeout(init, 300); return; }
        buildFinancePanel();
        patchFacilities();
        patchHireStaff();
        patchDashboard();
        hookOpenPage();
        console.log('[Finances] ✅ injector-finances.js v2 listo.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
