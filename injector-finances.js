// ============================================================
// injector-finances.js
// Sistema de finanzas completo para PC Fútbol Manager
// ============================================================
(function () {
    'use strict';

    // ============================================================
    // 1. PARCHE: updateWeeklyFinancials — solo CALCULA, no descuenta
    //    El descuento real ocurre solo al avanzar semana (ver parche 2)
    // ============================================================
    function patchUpdateWeeklyFinancials() {
        const gl = window.gameLogic;
        if (!gl || !gl.updateWeeklyFinancials) {
            console.warn('[Finances] gameLogic.updateWeeklyFinancials no disponible aún, reintentando...');
            setTimeout(patchUpdateWeeklyFinancials, 500);
            return;
        }

        gl.updateWeeklyFinancials = function () {
            const state = gl.getGameState();

            const playerSalaries = state.squad.reduce((sum, p) => sum + (p.salary || 0), 0);
            const staffSalaries = Object.values(state.staff).reduce((sum, s) => sum + (s?.salary || 0), 0);

            let attendance = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (state.ticketPrice / 100)));
            attendance = Math.max(0, Math.min(state.stadiumCapacity, attendance));

            const merchandisingItemsSold = Math.floor(state.fanbase * (state.popularity / 500) * (0.01 + 0.01));
            const merchandisingRevenue = merchandisingItemsSold * state.merchandisingPrice;

            const weeklyIncome = (state.weeklyIncomeBase || 5000) +
                Math.floor(state.ticketPrice * attendance) +
                merchandisingRevenue;

            const weeklyExpenses = playerSalaries + staffSalaries;

            // Solo actualiza las cifras informativas, SIN tocar el balance
            const patch = {
                weeklyIncome,
                weeklyExpenses,
                merchandisingItemsSold,
                merchandisingRevenue
            };
            Object.assign(window._gameStateInternal || {}, patch);

            // Actualizar internamente vía updateGameState sin doble descuento
            if (gl._rawUpdateState) {
                gl._rawUpdateState(patch);
            } else {
                // fallback: actualizar directamente si hay acceso
                try {
                    const s = gl.getGameState();
                    Object.assign(s, patch);
                } catch (e) {}
            }
        };

        console.log('[Finances] updateWeeklyFinancials parcheada — solo calcula, no descuenta.');
    }

    // ============================================================
    // 2. PARCHE: avanzar semana — descuenta balance UNA VEZ
    //    Interceptamos playMatch / advanceWeek
    // ============================================================
    function patchAdvanceWeek() {
        const gl = window.gameLogic;
        if (!gl) return;

        ['playMatch', 'advancePreseasonWeek', 'advanceWeek'].forEach(fnName => {
            const original = gl[fnName];
            if (!original) return;

            gl[fnName] = function (...args) {
                const result = original.apply(this, args);

                // Tras avanzar semana, aplicar ingresos y gastos UNA VEZ al balance
                try {
                    const s = gl.getGameState();
                    const weeklyNet = (s.weeklyIncome || 0) - (s.weeklyExpenses || 0);
                    if (s.team && weeklyNet !== 0) {
                        const newBalance = (s.balance || 0) + weeklyNet;
                        // Registrar en histórico semanal
                        if (!s.weeklyFinancialHistory) s.weeklyFinancialHistory = [];
                        s.weeklyFinancialHistory.push({
                            week: s.week,
                            income: s.weeklyIncome,
                            expenses: s.weeklyExpenses,
                            net: weeklyNet
                        });
                        gl.updateGameState({ balance: newBalance, weeklyFinancialHistory: s.weeklyFinancialHistory });
                    }
                } catch (e) {
                    console.warn('[Finances] Error al aplicar balance semanal:', e);
                }

                return result;
            };
        });

        console.log('[Finances] Avance de semana parcheado — balance se aplica una sola vez.');
    }

    // ============================================================
    // 3. PARCHE: Registrar TODOS los movimientos extraordinarios
    // ============================================================
    function patchTransactions() {
        const gl = window.gameLogic;
        if (!gl) return;

        // Helper: añadir movimiento al historial de la temporada
        function registerMovement(type, description, amount) {
            const s = gl.getGameState();
            if (!s.seasonMovements) s.seasonMovements = [];
            s.seasonMovements.push({
                week: s.week,
                type,        // 'purchase' | 'sale' | 'compensation' | 'renovation' | 'staff_hire' | 'staff_compensation'
                description,
                amount       // positivo = ingreso, negativo = gasto
            });

            // Actualizar acumulados de temporada
            const updates = { seasonMovements: s.seasonMovements };

            if (type === 'purchase' || type === 'staff_hire') {
                updates.playerPurchases = (s.playerPurchases || 0) + Math.abs(amount);
            }
            if (type === 'sale') {
                updates.playerSalesIncome = (s.playerSalesIncome || 0) + Math.abs(amount);
            }
            if (type === 'compensation' || type === 'staff_compensation') {
                updates.playerCompensations = (s.playerCompensations || 0) + Math.abs(amount);
            }
            if (type === 'renovation') {
                updates.renovationExpenses = (s.renovationExpenses || 0) + Math.abs(amount);
            }

            gl.updateGameState(updates);
        }

        window._financeRegisterMovement = registerMovement;

        // --- Parche: hireStaffFromCandidates ---
        const origHireStaff = gl.hireStaffFromCandidates;
        if (origHireStaff) {
            gl.hireStaffFromCandidates = function (candidate) {
                const sBefore = gl.getGameState();
                const existingStaff = sBefore.staff[candidate.role];

                const result = origHireStaff.call(this, candidate);

                if (result && result.success) {
                    // Indemnización del staff despedido
                    if (existingStaff) {
                        const indemnization = existingStaff.salary * 52;
                        registerMovement('staff_compensation',
                            `Indemnización: ${existingStaff.name} (${existingStaff.role})`,
                            -indemnization);
                    }
                    // Cláusula / coste de contratación
                    registerMovement('staff_hire',
                        `Contratación staff: ${candidate.name} (${candidate.role})`,
                        -candidate.clausula);
                }
                return result;
            };
        }

        // --- Parche: expandStadium ---
        const origExpand = gl.expandStadium;
        if (origExpand) {
            gl.expandStadium = function (cost = 50000, capacityIncrease = 10000) {
                const result = origExpand.call(this, cost, capacityIncrease);
                if (result && result.success) {
                    registerMovement('renovation',
                        `Ampliación estadio (+${capacityIncrease.toLocaleString('es-ES')} asientos)`,
                        -cost);
                }
                return result;
            };
        }

        // --- Parche: improveFacilities ---
        const origImprove = gl.improveFacilities;
        if (origImprove) {
            gl.improveFacilities = function (cost = 30000, trainingLevelIncrease = 1) {
                const result = origImprove.call(this, cost, trainingLevelIncrease);
                if (result && result.success) {
                    registerMovement('renovation',
                        `Mejora centro de entrenamiento (nivel +${trainingLevelIncrease})`,
                        -cost);
                }
                return result;
            };
        }

        console.log('[Finances] Transacciones extraordinarias registradas.');
    }

    // ============================================================
    // 4. PARCHE: setupNewSeason — resetear acumulados de temporada
    // ============================================================
    function patchNewSeason() {
        const gl = window.gameLogic;
        if (!gl || !gl.setupNewSeason) return;

        const origSetup = gl.setupNewSeason;
        gl.setupNewSeason = function (...args) {
            const result = origSetup.apply(this, args);

            // Resetear acumulados (el balance se MANTIENE)
            gl.updateGameState({
                playerPurchases: 0,
                playerSalesIncome: 0,
                playerCompensations: 0,
                renovationExpenses: 0,
                seasonMovements: [],
                weeklyFinancialHistory: []
            });

            console.log('[Finances] Acumulados de temporada reseteados para nueva temporada.');
            return result;
        };
    }

    // ============================================================
    // 5. UI: Panel de Finanzas completo en la página #finance
    // ============================================================
    function buildFinancePanel() {
        const container = document.getElementById('finance');
        if (!container) {
            console.warn('[Finances] Elemento #finance no encontrado.');
            return;
        }

        container.innerHTML = `
        <div class="page-header">
            <h1>💼 Caja & Finanzas</h1>
            <button class="page-close-btn" onclick="closePage('finance')">✖ CERRAR</button>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- BLOQUE SUPERIOR: Balance y flujo semanal   -->
        <!-- ═══════════════════════════════════════════ -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px;">
            <div class="data-box" style="text-align:center;">
                <div class="data-label">💰 Balance en Caja</div>
                <div class="data-value" id="fin_balance" style="font-size:1.4em; font-weight:bold;">0€</div>
            </div>
            <div class="data-box" style="text-align:center;">
                <div class="data-label">📈 Ingresos/semana</div>
                <div class="data-value" id="fin_weeklyIncome" style="color:#4CAF50;">0€</div>
            </div>
            <div class="data-box" style="text-align:center;">
                <div class="data-label">📉 Gastos/semana</div>
                <div class="data-value" id="fin_weeklyExpenses" style="color:#f44336;">0€</div>
            </div>
        </div>

        <!-- Resultado semanal -->
        <div style="text-align:center; margin-bottom:20px; padding:10px; background:rgba(255,255,255,0.04); border-radius:8px;">
            <span style="color:#aaa; font-size:0.9em;">Resultado semanal estimado: </span>
            <span id="fin_weeklyResult" style="font-weight:bold; font-size:1.1em;">0€</span>
        </div>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- INGRESOS RECURRENTES                               -->
        <!-- ═══════════════════════════════════════════════════ -->
        <h2 style="border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:10px;">📊 Ingresos recurrentes (semanal)</h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🎟️ Taquilla</td>
                <td style="text-align:right; color:#4CAF50;" id="fin_ticketIncome">0€</td>
                <td style="padding-left:16px; color:#777; font-size:0.82em;" id="fin_ticketDetail">— 0 espectadores × 0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🛍️ Merchandising</td>
                <td style="text-align:right; color:#4CAF50;" id="fin_merchIncome">0€</td>
                <td style="padding-left:16px; color:#777; font-size:0.82em;" id="fin_merchDetail">— 0 uds × 0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">📺 Derechos / Otros</td>
                <td style="text-align:right; color:#4CAF50;" id="fin_baseIncome">0€</td>
                <td></td>
            </tr>
            <tr style="border-top:1px solid #333;">
                <td style="padding:8px 4px; font-weight:bold;">Total ingresos</td>
                <td style="text-align:right; font-weight:bold; color:#4CAF50;" id="fin_totalIncome">0€</td>
                <td></td>
            </tr>
        </table>

        <!-- Controles de precio (compactos) -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:22px;">
            <div style="background:rgba(255,255,255,0.04); padding:10px; border-radius:8px;">
                <div style="font-size:0.85em; color:#aaa; margin-bottom:6px;">Precio Entrada: <strong id="fin_ticketPriceVal">0€</strong></div>
                <input type="range" id="fin_ticketSlider" min="5" max="100" value="20"
                    style="width:100%;"
                    oninput="document.getElementById('fin_ticketPriceVal').textContent=this.value+'€'"
                    onchange="window.setTicketPriceFromSlider && window.setTicketPriceFromSlider(this.value); window._financeRefresh && window._financeRefresh();">
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:10px; border-radius:8px;">
                <div style="font-size:0.85em; color:#aaa; margin-bottom:6px;">Precio Merch: <strong id="fin_merchPriceVal">0€</strong></div>
                <input type="range" id="fin_merchSlider" min="1" max="50" value="10"
                    style="width:100%;"
                    oninput="document.getElementById('fin_merchPriceVal').textContent=this.value+'€'"
                    onchange="window.setMerchandisingPriceFromSlider && window.setMerchandisingPriceFromSlider(this.value); window._financeRefresh && window._financeRefresh();">
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- GASTOS RECURRENTES (salarios)                      -->
        <!-- ═══════════════════════════════════════════════════ -->
        <h2 style="border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:10px;">💸 Gastos recurrentes (semanal)</h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">⚽ Salarios plantilla</td>
                <td style="text-align:right; color:#f44336;" id="fin_playerSalaries">0€</td>
                <td style="padding-left:16px; color:#777; font-size:0.82em;" id="fin_playerCount">— 0 jugadores</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">👔 Salarios staff técnico</td>
                <td style="text-align:right; color:#f44336;" id="fin_staffSalaries">0€</td>
                <td style="padding-left:16px; color:#777; font-size:0.82em;" id="fin_staffCount">— 0 miembros</td>
            </tr>
            <tr style="border-top:1px solid #333;">
                <td style="padding:8px 4px; font-weight:bold;">Total gastos recurrentes</td>
                <td style="text-align:right; font-weight:bold; color:#f44336;" id="fin_totalExpenses">0€</td>
                <td></td>
            </tr>
        </table>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- OPERACIONES DE MERCADO (temporada)                 -->
        <!-- ═══════════════════════════════════════════════════ -->
        <h2 style="border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:10px;">🔄 Mercado de fichajes <span style="font-size:0.7em; color:#666;">(temporada actual)</span></h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">💸 Inversión en fichajes</td>
                <td style="text-align:right; color:#f44336;" id="fin_purchases">0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">💰 Ingresos por ventas</td>
                <td style="text-align:right; color:#4CAF50;" id="fin_sales">0€</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🚪 Indemnizaciones pagadas</td>
                <td style="text-align:right; color:#f44336;" id="fin_compensations">0€</td>
            </tr>
            <tr style="border-top:1px solid #333;">
                <td style="padding:8px 4px; font-weight:bold;">Balance de mercado</td>
                <td style="text-align:right; font-weight:bold;" id="fin_transferBalance">0€</td>
            </tr>
        </table>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- REMODELACIONES (temporada)                         -->
        <!-- ═══════════════════════════════════════════════════ -->
        <h2 style="border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:10px;">🏗️ Remodelaciones <span style="font-size:0.7em; color:#666;">(temporada actual)</span></h2>
        <div id="fin_renovationsList" style="margin-bottom:10px; min-height:30px; color:#777; font-size:0.9em; font-style:italic;">
            Sin remodelaciones esta temporada.
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:22px;">
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🏟️ Estadio</td>
                <td style="text-align:right; color:#f44336;" id="fin_stadiumRenovation">0€</td>
                <td style="padding-left:16px; color:#777; font-size:0.82em;" id="fin_stadiumCapacity">Cap: 0</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🏋️ Centro de entrenamiento</td>
                <td style="text-align:right; color:#f44336;" id="fin_trainingRenovation">0€</td>
                <td style="padding-left:16px; color:#777; font-size:0.82em;" id="fin_trainingLevel">Nivel: 1</td>
            </tr>
            <tr style="border-top:1px solid #333;">
                <td style="padding:8px 4px; font-weight:bold;">Total remodelaciones</td>
                <td style="text-align:right; font-weight:bold; color:#f44336;" id="fin_totalRenovations">0€</td>
                <td></td>
            </tr>
        </table>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- HISTORIAL DE MOVIMIENTOS                          -->
        <!-- ═══════════════════════════════════════════════════ -->
        <h2 style="border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:10px;">📋 Historial de movimientos</h2>
        <div id="fin_movementsList" style="max-height:240px; overflow-y:auto; background:rgba(0,0,0,0.2); border-radius:8px; padding:10px; font-size:0.85em;">
            <span style="color:#666;">Sin movimientos registrados esta temporada.</span>
        </div>
        `;

        console.log('[Finances] Panel de finanzas construido.');
    }

    // ============================================================
    // 6. UI: función de refresco del panel
    // ============================================================
    function setupRefresh() {
        function refreshFinancePanel() {
            if (!window.gameLogic) return;
            const state = window.gameLogic.getGameState();
            if (!state || !state.team) return;

            // --- Bloque superior ---
            const balance = state.balance || 0;
            setText('fin_balance', fmt(balance) + '€', balance < 0 ? '#f44336' : '#fff');

            const wi = state.weeklyIncome || 0;
            const we = state.weeklyExpenses || 0;
            const weeklyNet = wi - we;
            setText('fin_weeklyIncome', fmt(wi) + '€', '#4CAF50');
            setText('fin_weeklyExpenses', fmt(we) + '€', '#f44336');
            setText('fin_weeklyResult',
                (weeklyNet >= 0 ? '+' : '') + fmt(weeklyNet) + '€',
                weeklyNet >= 0 ? '#4CAF50' : '#f44336');

            // --- Ingresos recurrentes ---
            let attendance = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (state.ticketPrice / 100)));
            attendance = Math.max(0, Math.min(state.stadiumCapacity, attendance));
            const ticketIncome = Math.floor(state.ticketPrice * attendance);
            const merchRevenue = state.merchandisingRevenue || 0;
            const baseIncome = state.weeklyIncomeBase || 5000;

            setText('fin_ticketIncome', fmt(ticketIncome) + '€', '#4CAF50');
            setText('fin_ticketDetail', `— ${fmt(attendance)} espectadores × ${state.ticketPrice}€`);
            setText('fin_merchIncome', fmt(merchRevenue) + '€', '#4CAF50');
            setText('fin_merchDetail', `— ${fmt(state.merchandisingItemsSold || 0)} uds × ${state.merchandisingPrice}€`);
            setText('fin_baseIncome', fmt(baseIncome) + '€', '#4CAF50');
            setText('fin_totalIncome', fmt(wi) + '€', '#4CAF50');

            // Sliders de precio
            const ts = document.getElementById('fin_ticketSlider');
            if (ts) { ts.value = state.ticketPrice; document.getElementById('fin_ticketPriceVal').textContent = state.ticketPrice + '€'; }
            const ms = document.getElementById('fin_merchSlider');
            if (ms) { ms.value = state.merchandisingPrice; document.getElementById('fin_merchPriceVal').textContent = state.merchandisingPrice + '€'; }

            // --- Gastos recurrentes ---
            const playerSalaries = state.squad.reduce((sum, p) => sum + (p.salary || 0), 0);
            const staffActive = Object.values(state.staff).filter(s => s);
            const staffSalaries = staffActive.reduce((sum, s) => sum + (s?.salary || 0), 0);

            setText('fin_playerSalaries', fmt(playerSalaries) + '€/sem', '#f44336');
            setText('fin_playerCount', `— ${state.squad.length} jugadores`);
            setText('fin_staffSalaries', fmt(staffSalaries) + '€/sem', '#f44336');
            setText('fin_staffCount', `— ${staffActive.length} miembros del staff`);
            setText('fin_totalExpenses', fmt(we) + '€/sem', '#f44336');

            // --- Mercado ---
            const purchases = state.playerPurchases || 0;
            const sales = state.playerSalesIncome || 0;
            const compensations = state.playerCompensations || 0;
            const transferBal = sales - purchases - compensations;

            setText('fin_purchases', fmt(purchases) + '€', '#f44336');
            setText('fin_sales', fmt(sales) + '€', '#4CAF50');
            setText('fin_compensations', fmt(compensations) + '€', '#f44336');
            setText('fin_transferBalance',
                (transferBal >= 0 ? '+' : '') + fmt(transferBal) + '€',
                transferBal >= 0 ? '#4CAF50' : '#f44336');

            // --- Remodelaciones ---
            const movements = state.seasonMovements || [];
            const renovations = movements.filter(m => m.type === 'renovation');
            const stadiumRenovCost = renovations
                .filter(m => m.description.toLowerCase().includes('estadio'))
                .reduce((sum, m) => sum + Math.abs(m.amount), 0);
            const trainingRenovCost = renovations
                .filter(m => m.description.toLowerCase().includes('entrenamiento'))
                .reduce((sum, m) => sum + Math.abs(m.amount), 0);
            const totalRenovations = state.renovationExpenses || 0;

            setText('fin_stadiumRenovation', fmt(stadiumRenovCost) + '€', stadiumRenovCost > 0 ? '#f44336' : '#777');
            setText('fin_stadiumCapacity', `Cap: ${fmt(state.stadiumCapacity)}`);
            setText('fin_trainingRenovation', fmt(trainingRenovCost) + '€', trainingRenovCost > 0 ? '#f44336' : '#777');
            setText('fin_trainingLevel', `Nivel: ${state.trainingLevel || 1}`);
            setText('fin_totalRenovations', fmt(totalRenovations) + '€', totalRenovations > 0 ? '#f44336' : '#777');

            // Lista de remodelaciones
            const renovList = document.getElementById('fin_renovationsList');
            if (renovList) {
                if (renovations.length === 0) {
                    renovList.innerHTML = '<span style="color:#666; font-style:italic;">Sin remodelaciones esta temporada.</span>';
                } else {
                    renovList.innerHTML = renovations.map(r =>
                        `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #222;">
                            <span>Sem ${r.week} — ${r.description}</span>
                            <span style="color:#f44336; margin-left:12px;">-${fmt(Math.abs(r.amount))}€</span>
                        </div>`
                    ).join('');
                }
            }

            // --- Historial de movimientos ---
            const movEl = document.getElementById('fin_movementsList');
            if (movEl) {
                const nonRenov = movements.filter(m => m.type !== 'renovation');
                if (nonRenov.length === 0) {
                    movEl.innerHTML = '<span style="color:#666;">Sin movimientos registrados esta temporada.</span>';
                } else {
                    const icons = {
                        purchase: '💸', sale: '💰', compensation: '🚪',
                        staff_hire: '👔', staff_compensation: '🚫', renovation: '🏗️'
                    };
                    movEl.innerHTML = [...nonRenov].reverse().map(m => {
                        const isPositive = m.amount > 0;
                        return `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #1a1a1a;">
                            <span>${icons[m.type] || '•'} <span style="color:#ccc;">Sem ${m.week}</span> — ${m.description}</span>
                            <span style="font-weight:bold; color:${isPositive ? '#4CAF50' : '#f44336'}; margin-left:12px; white-space:nowrap;">
                                ${isPositive ? '+' : ''}${fmt(m.amount)}€
                            </span>
                        </div>`;
                    }).join('');
                }
            }
        }

        function setText(id, text, color) {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = text;
            if (color) el.style.color = color;
        }

        function fmt(n) {
            return Math.round(n).toLocaleString('es-ES');
        }

        window._financeRefresh = refreshFinancePanel;
        window.updateFinanceDisplay = refreshFinancePanel;

        console.log('[Finances] Función de refresco configurada.');
    }

    // ============================================================
    // 7. PARCHE: Dashboard — resumen simplificado
    // ============================================================
    function patchDashboard() {
        // Guardar la función original de dashboard
        const origUpdate = window.updateDashboardStats;
        if (!origUpdate) return;

        window.updateDashboardStats = function (state) {
            origUpdate.call(this, state);

            // Actualizar los campos de transferencias del dashboard
            const purchases = state.playerPurchases || 0;
            const sales = state.playerSalesIncome || 0;
            const compensations = state.playerCompensations || 0;
            const transferBalance = sales - purchases - compensations;

            const els = {
                dashPurchases: purchases.toLocaleString('es-ES') + '€',
                dashSales: sales.toLocaleString('es-ES') + '€',
                dashCompensations: compensations.toLocaleString('es-ES') + '€',
            };

            Object.entries(els).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            });

            const tbEl = document.getElementById('dashTransferBalance');
            if (tbEl) {
                tbEl.textContent = (transferBalance >= 0 ? '+' : '') + transferBalance.toLocaleString('es-ES') + '€';
                tbEl.style.color = transferBalance >= 0 ? '#4CAF50' : '#f44336';
            }
        };
    }

    // ============================================================
    // 8. Refrescar panel al abrir la página de finanzas
    // ============================================================
    function hookPageOpen() {
        const origOpenPage = window.openPage;
        if (!origOpenPage) {
            // openPage puede no estar aún, reintentar
            setTimeout(hookPageOpen, 400);
            return;
        }
        window.openPage = function (pageId, ...args) {
            const result = origOpenPage.call(this, pageId, ...args);
            if (pageId === 'finance' && window._financeRefresh) {
                setTimeout(window._financeRefresh, 50);
            }
            return result;
        };
        console.log('[Finances] Hook openPage configurado.');
    }

    // ============================================================
    // INIT: esperar a que el DOM y gameLogic estén listos
    // ============================================================
    function init() {
        if (!window.gameLogic) {
            setTimeout(init, 300);
            return;
        }

        buildFinancePanel();
        setupRefresh();
        patchTransactions();
        patchNewSeason();
        patchDashboard();
        hookPageOpen();

        // El parche de updateWeeklyFinancials es delicado —
        // lo dejamos comentado hasta confirmar que el bug de doble descuento
        // existe en tu versión exacta. Descomenta si lo confirmas:
        // patchUpdateWeeklyFinancials();
        // patchAdvanceWeek();

        console.log('[Finances] ✅ injector-finances.js cargado correctamente.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
