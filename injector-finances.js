// ============================================================
// injector-finances.js  v3
// Sistema de finanzas completo — PC Fútbol Manager
//
// ESTRATEGIA:
// - gameLogic.js modificado: updateWeeklyFinancials() NO aplica
//   el balance si window._financesSuppressBalance === true.
// - Este injector activa esa flag SIEMPRE, y aplica el balance
//   semanal UNA SOLA VEZ interceptando window.simulateFullWeek.
// - Intercepta window.expandStadium, window.improveFacilities,
//   window.firePlayerConfirm, window.hireStaffConfirm
//   para registrar movimientos extraordinarios.
// ============================================================
(function () {
    'use strict';

    // ── ACTIVAR FLAG: bloquea el balance automático en updateWeeklyFinancials ──
    window._financesSuppressBalance = true;

    // ============================================================
    // UTILIDADES
    // ============================================================
    function fmt(n) { return Math.round(n || 0).toLocaleString('es-ES'); }

    function setText(id, text, color) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        if (color !== undefined) el.style.color = color;
    }

    function gl() { return window.gameLogic; }
    function gs() { return gl() ? gl().getGameState() : null; }

    // ============================================================
    // REGISTRO DE MOVIMIENTOS DE TEMPORADA
    // Se guardan en gameState.seasonMovements[]
    // NO llama a updateGameState para no disparar updateWeeklyFinancials.
    // En su lugar modifica el balance directamente vía getGameState+updateGameState
    // usando suppressBalance.
    // ============================================================
    function registerMovement(type, description, amount) {
        // amount: negativo = gasto, positivo = ingreso
        const state = gs();
        if (!state) return;

        const movements = state.seasonMovements || [];
        movements.push({ week: state.week, type, description, amount });

        // Actualizar acumuladores según tipo
        const updates = { seasonMovements: movements };
        if (type === 'purchase')            updates.playerPurchases    = (state.playerPurchases    || 0) + Math.abs(amount);
        if (type === 'sale')                updates.playerSalesIncome  = (state.playerSalesIncome  || 0) + Math.abs(amount);
        if (type === 'compensation')        updates.playerCompensations= (state.playerCompensations|| 0) + Math.abs(amount);
        if (type === 'staff_hire')          updates.playerPurchases    = (state.playerPurchases    || 0) + Math.abs(amount);
        if (type === 'staff_compensation')  updates.playerCompensations= (state.playerCompensations|| 0) + Math.abs(amount);
        if (type === 'renovation')          updates.renovationExpenses = (state.renovationExpenses || 0) + Math.abs(amount);

        // Guardar sin disparar balance (la flag ya está activa)
        gl().updateGameState(updates);
    }

    window._financeRegisterMovement = registerMovement;

    // ============================================================
    // APLICAR BALANCE SEMANAL — solo al avanzar semana
    // ============================================================
    function applyWeeklyBalance() {
        const state = gs();
        if (!state || !state.team) return;

        // Determinar si el partido de esta semana es en casa
        const isHome = isWeekHome(state.week, state);

        // Calcular ingresos reales de esta semana
        const ticketIncome = isHome
            ? Math.floor(state.ticketPrice * computeAttendance(state))
            : 0;

        const items = Math.floor(state.fanbase * (state.popularity / 500) * (0.01 + Math.random() * 0.02));
        const merchIncome = isHome ? items * state.merchandisingPrice : 0;
        const baseIncome  = state.weeklyIncomeBase || 5000;

        const totalIncome   = ticketIncome + merchIncome + baseIncome;
        const totalExpenses = state.weeklyExpenses || 0; // ya calculado por updateWeeklyFinancials

        const net = totalIncome - totalExpenses;

        // Aplicar al balance
        gl().updateGameState({ balance: state.balance + net });

        // Registrar en histórico semanal para auditoría
        const hist = state.weeklyFinancialHistory || [];
        hist.push({
            week: state.week,
            income: totalIncome,
            expenses: totalExpenses,
            net,
            isHome,
            ticketIncome,
            merchIncome,
            baseIncome
        });
        gl().updateGameState({ weeklyFinancialHistory: hist });

        console.log(`[Finances] Semana ${state.week} — Balance aplicado: ${fmt(net)}€ (${isHome ? 'LOCAL' : 'VISITANTE'})`);
    }

    // ============================================================
    // INTERCEPTAR simulateFullWeek para aplicar balance UNA VEZ
    // ============================================================
    function patchSimulateFullWeek() {
        const origFn = window.gameLogic && window.gameLogic.simulateFullWeek;
        if (!origFn) { setTimeout(patchSimulateFullWeek, 300); return; }

        window.gameLogic.simulateFullWeek = async function (...args) {
            const stateBefore = gs();
            const weekBefore  = stateBefore ? stateBefore.week : 0;

            const result = await origFn.apply(this, args);

            // Después de avanzar semana: aplicar balance real
            applyWeeklyBalance();

            // Refrescar panel si está abierto
            if (window._financeRefresh) window._financeRefresh();

            return result;
        };

        console.log('[Finances] simulateFullWeek parcheado — balance semanal controlado.');
    }

    // ============================================================
    // CALCULAR ASISTENCIA
    // ============================================================
    function computeAttendance(state) {
        let att = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (state.ticketPrice / 100)));
        return Math.max(0, Math.min(state.stadiumCapacity, att));
    }

    // ============================================================
    // DETECTAR LOCAL/VISITANTE
    // ============================================================
    function isWeekHome(week, state) {
        if (!state || !state.seasonCalendar || !state.team) return true; // asumir local si no hay dato
        const matches = state.seasonCalendar.filter(m => m.week === week);
        const myMatch = matches.find(m => m.home === state.team || m.away === state.team);
        if (!myMatch) return true; // pretemporada = local a efectos de caja
        return myMatch.home === state.team;
    }

    function isNextMatchHome() {
        const state = gs();
        if (!state) return null;
        const nextWeek = (state.seasonType === 'preseason') ? state.week : state.week + 1;
        return isWeekHome(nextWeek, state);
    }

    // ============================================================
    // INTERCEPTAR REMODELACIONES
    // ============================================================
    function patchFacilities() {
        if (typeof window.expandStadium !== 'function') { setTimeout(patchFacilities, 200); return; }

        const origExpand = window.expandStadium;
        window.expandStadium = function () {
            const balBefore = (gs() || {}).balance || 0;
            const result = origExpand.apply(this, arguments);
            if (result && result.success) {
                // El balance ya fue descontado dentro de gameLogic.expandStadium
                // pero updateWeeklyFinancials volvió a sumar weeklyIncome-weeklyExpenses.
                // Necesitamos REVERTIR ese cobro extra.
                const state = gs();
                const extraAdded = state.weeklyIncome - state.weeklyExpenses;
                // Corregir: quitar lo que updateWeeklyFinancials sumó indebidamente
                gl().updateGameState({ balance: state.balance - extraAdded });

                registerMovement('renovation', 'Ampliacion estadio (+10.000 asientos)', -50000);
                if (window._financeRefresh) window._financeRefresh();
            }
            return result;
        };

        const origImprove = window.improveFacilities;
        window.improveFacilities = function () {
            const result = origImprove.apply(this, arguments);
            if (result && result.success) {
                const state = gs();
                const extraAdded = state.weeklyIncome - state.weeklyExpenses;
                gl().updateGameState({ balance: state.balance - extraAdded });

                const lvl = (gs() || {}).trainingLevel || '?';
                registerMovement('renovation', `Mejora centro entrenamiento (nivel ${lvl})`, -30000);
                if (window._financeRefresh) window._financeRefresh();
            }
            return result;
        };

        console.log('[Finances] expandStadium e improveFacilities parcheados.');
    }

    // ============================================================
    // INTERCEPTAR DESPIDO DE JUGADORES
    // ============================================================
    function patchFirePlayer() {
        if (typeof window.firePlayerConfirm !== 'function') { setTimeout(patchFirePlayer, 200); return; }

        const origFire = window.firePlayerConfirm;
        window.firePlayerConfirm = function (playerName) {
            const stateBefore = gs();

            origFire.apply(this, arguments);

            const stateAfter = gs();
            if (!stateBefore || !stateAfter) return;

            // Detectar si el jugador fue despedido (ya no está en la plantilla)
            const wasFired = stateBefore.squad.some(p => p.name === playerName) &&
                             !stateAfter.squad.some(p => p.name === playerName);

            if (wasFired) {
                // El balance ya fue descontado por firePlayer internamente.
                // Pero updateWeeklyFinancials lo llamó y sumó el flujo semanal extra.
                // Revertir ese efecto extra (ahora los salarios son menores por el jugador despedido).
                const extraAdded = stateAfter.weeklyIncome - stateAfter.weeklyExpenses;
                gl().updateGameState({ balance: stateAfter.balance - extraAdded });

                // Calcular la indemnización real restando balances
                const balDiff = stateBefore.balance - stateAfter.balance - extraAdded;
                // balDiff debería ser la indemnización pagada + corrección del extra

                // Mejor: leerlo directamente del acumulador que ya updatea gameLogic
                const newCompensation = (stateAfter.playerCompensations || 0) - (stateBefore.playerCompensations || 0);
                if (newCompensation > 0) {
                    registerMovement('compensation',
                        `Indemnizacion jugador: ${playerName}`, -newCompensation);
                }

                if (window._financeRefresh) window._financeRefresh();
            }
        };

        console.log('[Finances] firePlayerConfirm parcheado.');
    }

    // ============================================================
    // INTERCEPTAR CONTRATACIÓN DE STAFF
    // ============================================================
    function patchHireStaff() {
        if (typeof window.hireStaffConfirm !== 'function') { setTimeout(patchHireStaff, 200); return; }

        const origHire = window.hireStaffConfirm;
        window.hireStaffConfirm = function (encodedCandidateJson) {
            const stateBefore = gs();
            const candidate   = JSON.parse(decodeURIComponent(encodedCandidateJson));
            const existingStaff = stateBefore ? stateBefore.staff[candidate.role] : null;

            origHire.apply(this, arguments);

            const stateAfter = gs();
            if (!stateAfter) return;

            const newStaff = stateAfter.staff[candidate.role];
            if (newStaff && newStaff.name === candidate.name) {
                // Revertir el balance extra añadido por updateWeeklyFinancials
                const extraAdded = stateAfter.weeklyIncome - stateAfter.weeklyExpenses;
                gl().updateGameState({ balance: stateAfter.balance - extraAdded });

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
    // INTERCEPTAR FICHAJES (negociación completada)
    // La negociación se cierra en offerToClub que llama signPlayer.
    // signPlayer llama updateWeeklyFinancials. Necesitamos detectar
    // cuándo se firma un jugador.
    // Estrategia: parchear window.endNegotiationUI que se llama al cerrar.
    // Mejor: monitorear el tamaño del squad antes/después de simulateFullWeek
    // NO — mejor interceptar los botones de negociación.
    // 
    // El flujo es: offerToClub → si accepted: balance -= offerAmount, playerPurchases += offerAmount, signPlayer()
    // signPlayer llama updateWeeklyFinancials → suma el flujo semanal extra.
    // Necesitamos interceptar DESPUÉS de que gameLogic.offerToClub tenga éxito.
    // offerToClub se llama directamente con gameLogic.offerToClub (no window.*).
    // 
    // Alternativa limpia: parchear window.gameLogic.offerToClub en el objeto window.
    // window.gameLogic ES el módulo ES, pero... ¿podemos añadir propiedades nuevas?
    // No — es sealed. Pero SÍ podemos reemplazar window.gameLogic como objeto.
    // ============================================================
    function patchTransferNegotiation() {
        // Los botones de negociación llaman gameLogic.offerToClub directamente
        // Interceptamos capturando el estado antes/después de cada click en el modal
        // Más robusto: monitorear playerPurchases en el estado y detectar cambios

        // Parchear via proxy en window.gameLogic si es posible
        // Si window.gameLogic es el módulo ES, no podemos. Pero podemos ver...
        const wgl = window.gameLogic;

        // Intentar añadir un getter/setter a offerToClub
        try {
            let origOfferToClub = wgl.offerToClub;
            if (origOfferToClub) {
                // Si el módulo permite defineProperty...
                Object.defineProperty(wgl, 'offerToClub', {
                    value: function (...args) {
                        const stateBefore = gs();
                        const result = origOfferToClub.apply(this, args);

                        if (result && result.success && result.message && result.message.includes('fichado')) {
                            const stateAfter = gs();
                            // Revertir el flujo semanal extra
                            const extraAdded = stateAfter.weeklyIncome - stateAfter.weeklyExpenses;
                            gl().updateGameState({ balance: stateAfter.balance - extraAdded });

                            // Registrar el fichaje
                            const purchaseDiff = (stateAfter.playerPurchases || 0) - (stateBefore.playerPurchases || 0);
                            if (purchaseDiff > 0) {
                                const newPlayer = stateAfter.squad.find(p =>
                                    !stateBefore.squad.some(q => q.name === p.name));
                                registerMovement('purchase',
                                    `Fichaje: ${newPlayer ? newPlayer.name : 'Jugador'}`, -purchaseDiff);
                            }
                            if (window._financeRefresh) window._financeRefresh();
                        }
                        return result;
                    },
                    configurable: true,
                    writable: true
                });
                console.log('[Finances] offerToClub parcheado via defineProperty.');
            }
        } catch (e) {
            console.warn('[Finances] No se pudo parchear offerToClub directamente:', e.message);
            // Alternativa: monitorear el estado periódicamente
            monitorPurchases();
        }
    }

    // ============================================================
    // MONITOREO DE COMPRAS (fallback si offerToClub no se puede parchear)
    // ============================================================
    let lastKnownPurchases = 0;
    let lastKnownSquadSize = 0;
    let lastKnownSales     = 0;

    function monitorPurchases() {
        setInterval(() => {
            const state = gs();
            if (!state || !state.team) return;

            const currentPurchases = state.playerPurchases || 0;
            const currentSales     = state.playerSalesIncome || 0;
            const currentSquadSize = state.squad ? state.squad.length : 0;

            // Compra detectada
            if (currentPurchases > lastKnownPurchases) {
                const diff = currentPurchases - lastKnownPurchases;
                // Buscar el nuevo jugador
                const movements = state.seasonMovements || [];
                const alreadyRegistered = movements.some(
                    m => m.type === 'purchase' && Math.abs(m.amount) === diff
                );
                if (!alreadyRegistered) {
                    const newPlayer = state.squad.find(p =>
                        !movements.some(m => m.description && m.description.includes(p.name))
                    );
                    registerMovement('purchase',
                        `Fichaje: ${newPlayer ? newPlayer.name : 'Jugador'}`, -diff);
                    // También revertir el balance extra
                    const extraAdded = state.weeklyIncome - state.weeklyExpenses;
                    if (Math.abs(extraAdded) < 100000) { // sanity check
                        gl().updateGameState({ balance: state.balance - extraAdded });
                    }
                }
                lastKnownPurchases = currentPurchases;
            }

            // Venta detectada (en ventas rápidas sin negociación)
            if (currentSales > lastKnownSales) {
                lastKnownSales = currentSales;
                // Las ventas las gestiona gameLogic correctamente,
                // solo necesitamos revertir el flujo semanal extra
                const extraAdded = state.weeklyIncome - state.weeklyExpenses;
                if (Math.abs(extraAdded) < 100000) {
                    gl().updateGameState({ balance: state.balance - extraAdded });
                }
            }

            lastKnownSquadSize = currentSquadSize;
        }, 800);
    }

    // ============================================================
    // INTERCEPTAR VENTAS DE JUGADORES (sellPlayer)
    // Se llaman via gameLogic.sellPlayer directamente en index.html
    // ============================================================
    function patchSellPlayer() {
        const wgl = window.gameLogic;
        if (!wgl || !wgl.sellPlayer) { setTimeout(patchSellPlayer, 300); return; }

        try {
            const orig = wgl.sellPlayer;
            Object.defineProperty(wgl, 'sellPlayer', {
                value: function (name) {
                    const stateBefore = gs();
                    const result = orig.apply(this, arguments);
                    if (result && result.success) {
                        const stateAfter = gs();
                        // Revertir flujo semanal extra de updateWeeklyFinancials
                        const extraAdded = stateAfter.weeklyIncome - stateAfter.weeklyExpenses;
                        gl().updateGameState({ balance: stateAfter.balance - extraAdded });

                        const saleDiff = (stateAfter.playerSalesIncome || 0) - (stateBefore.playerSalesIncome || 0);
                        if (saleDiff > 0) {
                            registerMovement('sale', `Venta: ${name}`, saleDiff);
                        }
                        if (window._financeRefresh) window._financeRefresh();
                    }
                    return result;
                },
                configurable: true,
                writable: true
            });
            console.log('[Finances] sellPlayer parcheado.');
        } catch (e) {
            console.warn('[Finances] No se pudo parchear sellPlayer:', e.message);
        }
    }

    // ============================================================
    // DETECTAR CAMBIO DE TEMPORADA
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
                    ✈️ Partido visitante — sin taquilla ni merchandising en campo rival
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

        <!-- Sliders de precio -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:12px 0 22px;">
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:8px;">
                <div style="font-size:0.85em; color:#aaa; margin-bottom:6px;">
                    Precio Entrada: <strong id="fin_ticketPriceVal">0€</strong>
                    <span style="color:#555; font-size:0.78em;"> — desde próxima jornada</span>
                </div>
                <input type="range" id="fin_ticketSlider" min="5" max="100" value="20"
                    style="width:100%; cursor:pointer;"
                    oninput="document.getElementById('fin_ticketPriceVal').textContent=this.value+'€'; window._financePreviewPrice('ticket',this.value);"
                    onchange="window.setTicketPriceFromSlider && window.setTicketPriceFromSlider(this.value);">
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:8px;">
                <div style="font-size:0.85em; color:#aaa; margin-bottom:6px;">
                    Precio Merch: <strong id="fin_merchPriceVal">0€</strong>
                    <span style="color:#555; font-size:0.78em;"> — desde próxima jornada</span>
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
            🔄 Mercado <span style="font-weight:normal; font-size:0.85em; color:#555;">(temporada actual)</span>
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
                <td style="padding:6px 4px; color:#aaa;">💰 Ingresos por ventas</td>
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
                <td style="padding:6px 4px; color:#aaa;">🏟️ Ampliaciones estadio</td>
                <td style="text-align:right;" id="fin_stadiumRenov">0€</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_stadiumCap">—</td>
            </tr>
            <tr>
                <td style="padding:6px 4px; color:#aaa;">🏋️ Centro entrenamiento</td>
                <td style="text-align:right;" id="fin_trainingRenov">0€</td>
                <td style="padding-left:14px; color:#666; font-size:0.82em;" id="fin_trainingLvl">—</td>
            </tr>
            <tr style="border-top:1px solid #2a2a2a;">
                <td style="padding:8px 4px; font-weight:bold;">Total remodelaciones</td>
                <td style="text-align:right; font-weight:bold; color:#f44336;" id="fin_totalRenov">0€</td>
                <td></td>
            </tr>
        </table>
        <div id="fin_renovList" style="margin-bottom:22px; font-size:0.85em; color:#555; font-style:italic; min-height:20px;">
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
    // PREVIEW DE PRECIO (solo visual, sin tocar el balance)
    // ============================================================
    window._financePreviewPrice = function (type, value) {
        const state = gs();
        if (!state) return;
        value = parseInt(value);
        const isHome = isNextMatchHome();

        if (type === 'ticket') {
            if (isHome === false) {
                setText('fin_ticketIncome', '0€', '#aaa');
                setText('fin_ticketDetail', '— Partido visitante');
            } else {
                let att = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (value / 100)));
                att = Math.max(0, Math.min(state.stadiumCapacity, att));
                setText('fin_ticketIncome', fmt(Math.floor(value * att)) + '€', '#4CAF50');
                setText('fin_ticketDetail', `— ${fmt(att)} espectadores x ${value}€`);
            }
        }
        if (type === 'merch') {
            if (isHome === false) {
                setText('fin_merchIncome', '0€', '#aaa');
                setText('fin_merchDetail', '— Partido visitante');
            } else {
                const items = Math.floor(state.fanbase * (state.popularity / 500) * 0.015);
                setText('fin_merchIncome', fmt(items * value) + '€', '#4CAF50');
                setText('fin_merchDetail', `— ${fmt(items)} uds x ${value}€`);
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

        // Local/Visitante próxima jornada
        const isHome = isNextMatchHome();
        setText('fin_homeAwayBadge',
            isHome === true  ? '🏟️ Proxima jornada: LOCAL' :
            isHome === false ? '✈️ Proxima jornada: VISITANTE' : '—',
            isHome === true  ? '#4CAF50' : isHome === false ? '#f5a623' : '#666');

        const awayRow = document.getElementById('fin_awayWarningRow');
        if (awayRow) awayRow.style.display = isHome === false ? '' : 'none';

        // Calcular proyección de ingresos
        const ticketPrice = state.ticketPrice || 20;
        const merchPrice  = state.merchandisingPrice || 10;
        const att = computeAttendance(state);
        const ticketIncome = isHome === false ? 0 : Math.floor(ticketPrice * att);
        const items        = Math.floor(state.fanbase * (state.popularity / 500) * 0.015);
        const merchIncome  = isHome === false ? 0 : items * merchPrice;
        const baseIncome   = state.weeklyIncomeBase || 5000;
        const totalIncome  = ticketIncome + merchIncome + baseIncome;

        // Gastos recurrentes
        const playerSalaries = state.squad.reduce((sum, p) => sum + (p.salary || 0), 0);
        const staffActive    = Object.values(state.staff).filter(Boolean);
        const staffSalaries  = staffActive.reduce((sum, s) => sum + (s.salary || 0), 0);
        const totalExpenses  = playerSalaries + staffSalaries;
        const weeklyNet      = totalIncome - totalExpenses;

        setText('fin_weeklyIncome',   fmt(totalIncome)   + '€', '#4CAF50');
        setText('fin_weeklyExpenses', fmt(totalExpenses) + '€', '#f44336');
        setText('fin_weeklyResult',
            (weeklyNet >= 0 ? '+' : '') + fmt(weeklyNet) + '€',
            weeklyNet >= 0 ? '#4CAF50' : '#f44336');

        // Ingresos detalle
        setText('fin_ticketIncome', fmt(ticketIncome) + '€', isHome === false ? '#aaa' : '#4CAF50');
        setText('fin_ticketDetail',
            isHome === false ? '— Partido visitante' : `— ${fmt(att)} espectadores x ${ticketPrice}€`);
        setText('fin_merchIncome',  fmt(merchIncome) + '€',  isHome === false ? '#aaa' : '#4CAF50');
        setText('fin_merchDetail',
            isHome === false ? '— Partido visitante' : `— ${fmt(items)} uds x ${merchPrice}€`);
        setText('fin_baseIncome',      fmt(baseIncome)   + '€', '#4CAF50');
        setText('fin_totalIncomeRow',  fmt(totalIncome)  + '€', '#4CAF50');

        // Sliders
        const ts = document.getElementById('fin_ticketSlider');
        if (ts) { ts.value = ticketPrice; setText('fin_ticketPriceVal', ticketPrice + '€'); }
        const ms = document.getElementById('fin_merchSlider');
        if (ms) { ms.value = merchPrice;  setText('fin_merchPriceVal',  merchPrice  + '€'); }

        // Gastos detalle
        setText('fin_playerSalaries', fmt(playerSalaries) + '€/sem', '#f44336');
        setText('fin_playerCount',    `— ${state.squad.length} jugadores`);
        setText('fin_staffSalaries',  fmt(staffSalaries)  + '€/sem', '#f44336');
        setText('fin_staffCount',     `— ${staffActive.length} miembro${staffActive.length !== 1 ? 's' : ''}`);
        setText('fin_totalExpensesRow', fmt(totalExpenses) + '€/sem', '#f44336');

        // Mercado
        const movements    = state.seasonMovements || [];
        const purchases    = movements.filter(m => m.type === 'purchase').reduce((s, m) => s + Math.abs(m.amount), 0);
        const staffHireCost= movements.filter(m => m.type === 'staff_hire').reduce((s, m) => s + Math.abs(m.amount), 0);
        const sales        = movements.filter(m => m.type === 'sale').reduce((s, m) => s + Math.abs(m.amount), 0);
        const compensations= movements.filter(m => m.type === 'compensation').reduce((s, m) => s + Math.abs(m.amount), 0);
        const staffCompCost= movements.filter(m => m.type === 'staff_compensation').reduce((s, m) => s + Math.abs(m.amount), 0);
        const transferBal  = sales - purchases - staffHireCost - compensations - staffCompCost;

        setText('fin_purchases',        fmt(purchases)     + '€', purchases     > 0 ? '#f44336' : '#777');
        setText('fin_staffHireCost',    fmt(staffHireCost) + '€', staffHireCost > 0 ? '#f44336' : '#777');
        setText('fin_sales',            fmt(sales)         + '€', sales         > 0 ? '#4CAF50' : '#777');
        setText('fin_compensations',    fmt(compensations) + '€', compensations > 0 ? '#f44336' : '#777');
        setText('fin_staffCompensations',fmt(staffCompCost)+ '€', staffCompCost > 0 ? '#f44336' : '#777');
        setText('fin_transferBalance',
            (transferBal >= 0 ? '+' : '') + fmt(transferBal) + '€',
            transferBal >= 0 ? '#4CAF50' : '#f44336');

        // Remodelaciones
        const renovations   = movements.filter(m => m.type === 'renovation');
        const stadiumRenov  = renovations.filter(m => /estadio|asiento/i.test(m.description)).reduce((s, m) => s + Math.abs(m.amount), 0);
        const trainingRenov = renovations.filter(m => /entrenamiento/i.test(m.description)).reduce((s, m) => s + Math.abs(m.amount), 0);
        const totalRenov    = renovations.reduce((s, m) => s + Math.abs(m.amount), 0);

        setText('fin_stadiumRenov',  fmt(stadiumRenov)  + '€', stadiumRenov  > 0 ? '#f44336' : '#777');
        setText('fin_stadiumCap',    `Capacidad: ${fmt(state.stadiumCapacity)}`);
        setText('fin_trainingRenov', fmt(trainingRenov) + '€', trainingRenov > 0 ? '#f44336' : '#777');
        setText('fin_trainingLvl',   `Nivel: ${state.trainingLevel || 1}`);
        setText('fin_totalRenov',    fmt(totalRenov)    + '€', totalRenov    > 0 ? '#f44336' : '#777');

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
            const movements     = state.seasonMovements || [];
            const purchases     = movements.filter(m => m.type === 'purchase').reduce((s, m) => s + Math.abs(m.amount), 0);
            const sales         = movements.filter(m => m.type === 'sale').reduce((s, m) => s + Math.abs(m.amount), 0);
            const compensations = movements.filter(m => m.type === 'compensation' || m.type === 'staff_compensation').reduce((s, m) => s + Math.abs(m.amount), 0);
            const tb = sales - purchases - compensations;

            [['dashPurchases', fmt(purchases) + '€'], ['dashSales', fmt(sales) + '€'], ['dashCompensations', fmt(compensations) + '€']]
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
        patchFirePlayer();
        patchHireStaff();
        patchSellPlayer();
        patchTransferNegotiation();
        patchSimulateFullWeek();
        patchDashboard();
        hookOpenPage();

        console.log('[Finances] ✅ injector-finances.js v3 listo. Flag _financesSuppressBalance ACTIVA.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
