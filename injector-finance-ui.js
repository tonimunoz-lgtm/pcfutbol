// ============================================================
// injector-finance-ui.js  v1.0
// Rediseño visual completo del panel Caja & Finanzas
// Mantiene todos los IDs originales para compatibilidad total
// ============================================================

(function () {
    'use strict';

    // Esperar a que injector-finances construya el panel, luego rediseñar
    function waitAndRestyle() {
        const container = document.getElementById('finance');
        if (!container || !document.getElementById('fin_balance')) {
            setTimeout(waitAndRestyle, 300);
            return;
        }
        if (container._uiPatched) return;
        container._uiPatched = true;
        injectStyles();
        reshapeHTML(container);
        console.log('[FinanceUI] ✅ Panel rediseñado');
    }

    // ── CSS global ────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('fin-ui-styles')) return;
        const s = document.createElement('style');
        s.id = 'fin-ui-styles';
        s.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        #finance {
            background: #0a0a0f !important;
            font-family: 'Rajdhani', sans-serif !important;
            padding: 0 !important;
            color: #e0e0e0 !important;
        }

        /* Header */
        .fin-header {
            background: linear-gradient(135deg, #0d0d1a 0%, #111128 100%);
            border-bottom: 1px solid rgba(212,175,55,.25);
            padding: 18px 22px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .fin-header h1 {
            font-family: 'Rajdhani', sans-serif !important;
            font-size: 1.3em !important;
            font-weight: 700 !important;
            letter-spacing: 3px !important;
            text-transform: uppercase !important;
            color: #D4AF37 !important;
            margin: 0 !important;
        }

        /* Balance hero */
        .fin-balance-hero {
            background: linear-gradient(135deg, #0d1117 0%, #0f1520 100%);
            border-bottom: 1px solid rgba(212,175,55,.15);
            padding: 28px 22px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .fin-balance-hero::before {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 160px; height: 160px;
            background: radial-gradient(circle, rgba(212,175,55,.08) 0%, transparent 70%);
            border-radius: 50%;
        }
        .fin-balance-label {
            font-size: .75em;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 6px;
        }
        .fin-balance-amount {
            font-family: 'JetBrains Mono', monospace;
            font-size: 2.6em;
            font-weight: 500;
            letter-spacing: -1px;
            line-height: 1;
        }
        .fin-balance-amount.positive { color: #4ade80; }
        .fin-balance-amount.negative { color: #f87171; }

        /* Tabs */
        .fin-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255,255,255,.06);
            background: #0a0a0f;
            position: sticky;
            top: 57px;
            z-index: 9;
            overflow-x: auto;
            scrollbar-width: none;
        }
        .fin-tabs::-webkit-scrollbar { display: none; }
        .fin-tab {
            flex-shrink: 0;
            padding: 11px 18px;
            font-family: 'Rajdhani', sans-serif;
            font-size: .82em;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #555;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all .2s;
            white-space: nowrap;
            background: none;
            border-top: none;
            border-left: none;
            border-right: none;
        }
        .fin-tab:hover { color: #aaa; }
        .fin-tab.active {
            color: #D4AF37;
            border-bottom-color: #D4AF37;
        }

        /* Panels */
        .fin-panel { display: none; padding: 18px 22px 30px; }
        .fin-panel.active { display: block; }

        /* Section headers */
        .fin-section-title {
            font-size: .72em;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #444;
            margin: 24px 0 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .fin-section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,.05);
        }

        /* Cards grid */
        .fin-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 14px;
        }
        .fin-cards.triple { grid-template-columns: 1fr 1fr 1fr; }
        .fin-card {
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.06);
            border-radius: 10px;
            padding: 14px 14px 12px;
            transition: border-color .2s;
        }
        .fin-card:hover { border-color: rgba(212,175,55,.2); }
        .fin-card-label {
            font-size: .72em;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #555;
            margin-bottom: 6px;
        }
        .fin-card-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.15em;
            font-weight: 500;
            color: #e0e0e0;
        }
        .fin-card-value.green { color: #4ade80; }
        .fin-card-value.red   { color: #f87171; }
        .fin-card-value.gold  { color: #D4AF37; }
        .fin-card-sub {
            font-size: .72em;
            color: #444;
            margin-top: 3px;
        }

        /* Net result card (full width) */
        .fin-net-card {
            background: rgba(255,255,255,.03);
            border-radius: 10px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid rgba(255,255,255,.06);
            margin-bottom: 14px;
        }
        .fin-net-card.green { border-color: rgba(74,222,128,.2); background: rgba(74,222,128,.04); }
        .fin-net-card.red   { border-color: rgba(248,113,113,.2); background: rgba(248,113,113,.04); }
        .fin-net-label { font-size: .8em; letter-spacing: 2px; text-transform: uppercase; color: #666; }
        .fin-net-value { font-family: 'JetBrains Mono', monospace; font-size: 1.4em; font-weight: 500; }

        /* Expense rows */
        .fin-expense-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,.04);
            font-size: .92em;
        }
        .fin-expense-row:last-child { border-bottom: none; }
        .fin-expense-name { color: #888; display: flex; align-items: center; gap: 8px; }
        .fin-expense-val  { font-family: 'JetBrains Mono', monospace; font-size: .9em; }
        .fin-expense-sub  { color: #444; font-size: .78em; margin-top: 2px; }

        /* Total row */
        .fin-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 13px 16px;
            background: rgba(248,113,113,.06);
            border: 1px solid rgba(248,113,113,.15);
            border-radius: 8px;
            margin-top: 8px;
        }
        .fin-total-row .fin-total-label {
            font-size: .75em;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #888;
        }
        .fin-total-row .fin-total-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.1em;
            color: #f87171;
            font-weight: 500;
        }

        /* Sliders */
        .fin-slider-wrap {
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.06);
            border-radius: 10px;
            padding: 14px 16px;
        }
        .fin-slider-label {
            font-size: .78em;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .fin-slider-label strong { color: #D4AF37; font-family: 'JetBrains Mono', monospace; }
        input[type=range].fin-slider {
            width: 100%;
            -webkit-appearance: none;
            height: 3px;
            background: rgba(255,255,255,.1);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
        }
        input[type=range].fin-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px; height: 14px;
            border-radius: 50%;
            background: #D4AF37;
            cursor: pointer;
            box-shadow: 0 0 6px rgba(212,175,55,.5);
        }

        /* Movement list */
        .fin-movement {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,.04);
            font-size: .85em;
        }
        .fin-movement:last-child { border-bottom: none; }
        .fin-movement-desc { color: #777; }
        .fin-movement-week { color: #444; font-size: .8em; }

        /* Away warning */
        .fin-away-badge {
            background: rgba(245,166,35,.08);
            border: 1px solid rgba(245,166,35,.2);
            border-radius: 8px;
            padding: 8px 14px;
            font-size: .82em;
            color: #f5a623;
            margin-bottom: 14px;
            display: none;
        }

        /* Mini sparkline */
        .fin-sparkline {
            width: 100%;
            height: 40px;
            margin-top: 8px;
            opacity: .6;
        }

        /* Market balance card */
        .fin-market-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
        }
        .fin-market-item {
            background: rgba(255,255,255,.02);
            border-radius: 8px;
            padding: 10px 12px;
            border: 1px solid rgba(255,255,255,.04);
        }
        .fin-market-item .lbl { font-size: .7em; letter-spacing: 1.5px; text-transform: uppercase; color: #444; margin-bottom: 4px; }
        .fin-market-item .val { font-family: 'JetBrains Mono', monospace; font-size: .95em; }

        /* Close button */
        #finance .page-close-btn {
            background: rgba(255,255,255,.06) !important;
            border: 1px solid rgba(255,255,255,.1) !important;
            color: #888 !important;
            border-radius: 6px !important;
            padding: 6px 14px !important;
            font-size: .8em !important;
            letter-spacing: 1px !important;
            cursor: pointer !important;
            transition: all .2s !important;
        }
        #finance .page-close-btn:hover {
            background: rgba(255,255,255,.1) !important;
            color: #ccc !important;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Restructurar el HTML ──────────────────────────────────────
    function reshapeHTML(container) {
        // Guardar referencias a los elementos con IDs que finances.js usa
        // Los clonaremos dentro de la nueva estructura

        container.innerHTML = `
        <!-- HEADER -->
        <div class="fin-header">
            <h1>📊 Caja &amp; Finanzas</h1>
            <button class="page-close-btn" onclick="closePage('finance')">✖ CERRAR</button>
        </div>

        <!-- BALANCE HERO -->
        <div class="fin-balance-hero">
            <div class="fin-balance-label">Balance en caja</div>
            <div id="fin_balance" class="fin-balance-amount positive">0€</div>
        </div>

        <!-- TABS -->
        <div class="fin-tabs">
            <button class="fin-tab active" onclick="window._finTab('semana')">📅 Semana</button>
            <button class="fin-tab" onclick="window._finTab('gastos')">💸 Gastos</button>
            <button class="fin-tab" onclick="window._finTab('mercado')">🔄 Mercado</button>
            <button class="fin-tab" onclick="window._finTab('historial')">📋 Historial</button>
        </div>

        <!-- TAB: SEMANA -->
        <div class="fin-panel active" id="fin-tab-semana">

            <!-- Última jornada -->
            <div class="fin-section-title">📅 Última jornada <span id="fin_lastLabel" style="color:#555;font-size:1em;letter-spacing:0;text-transform:none;font-weight:400;"></span></div>
            <div class="fin-cards">
                <div class="fin-card">
                    <div class="fin-card-label">🎟️ Taquilla</div>
                    <div id="fin_lTicket" class="fin-card-value">—</div>
                    <div id="fin_lTicketD" class="fin-card-sub">—</div>
                </div>
                <div class="fin-card">
                    <div class="fin-card-label">🛍️ Merchandising</div>
                    <div id="fin_lMerch" class="fin-card-value">—</div>
                    <div id="fin_lMerchD" class="fin-card-sub">—</div>
                </div>
            </div>
            <div class="fin-card" style="margin-bottom:10px;">
                <div class="fin-card-label">📺 Derechos TV &amp; Patrocinios</div>
                <div id="fin_lBase" class="fin-card-value green">—</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <div class="fin-net-card green" style="margin-bottom:0;">
                    <div>
                        <div class="fin-net-label">Total ingresos</div>
                        <div id="fin_lTotI" class="fin-net-value" style="color:#4ade80;">—</div>
                    </div>
                    <span style="font-size:1.8em;opacity:.3;">↑</span>
                </div>
                <div class="fin-net-card red" style="margin-bottom:0;">
                    <div>
                        <div class="fin-net-label">Gastos</div>
                        <div id="fin_lExp" class="fin-net-value" style="color:#f87171;">—</div>
                    </div>
                    <span style="font-size:1.8em;opacity:.3;">↓</span>
                </div>
            </div>
            <div class="fin-net-card" id="fin-net-wrapper">
                <div>
                    <div class="fin-net-label">Resultado neto</div>
                    <div id="fin_lNet" class="fin-net-value">—</div>
                </div>
                <span style="font-size:2em;opacity:.25;" id="fin-net-arrow">◈</span>
            </div>

            <!-- Proyección -->
            <div class="fin-section-title">🔮 Proyección próx. jornada <span id="fin_nextLabel" style="color:#555;font-size:1em;letter-spacing:0;text-transform:none;font-weight:400;margin-left:4px;"></span></div>
            <div id="fin_awayWarning" class="fin-away-badge">
                ✈️ Partido visitante — sin ingresos de taquilla ni merchandising
            </div>
            <div class="fin-cards" style="margin-bottom:10px;">
                <div class="fin-card">
                    <div class="fin-card-label">🎟️ Taquilla est.</div>
                    <div id="fin_pTicket" class="fin-card-value">0€</div>
                    <div id="fin_pTicketD" class="fin-card-sub">—</div>
                </div>
                <div class="fin-card">
                    <div class="fin-card-label">🛍️ Merch est.</div>
                    <div id="fin_pMerch" class="fin-card-value">0€</div>
                    <div id="fin_pMerchD" class="fin-card-sub">—</div>
                </div>
            </div>
            <div class="fin-card" style="margin-bottom:10px;">
                <div class="fin-card-label">📺 TV &amp; Patrocinios</div>
                <div id="fin_pBase" class="fin-card-value green">0€</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <div class="fin-net-card green" style="margin-bottom:0;">
                    <div>
                        <div class="fin-net-label">Total est.</div>
                        <div id="fin_pTotI" class="fin-net-value" style="color:#4ade80;">0€</div>
                    </div>
                    <span style="font-size:1.8em;opacity:.3;">↑</span>
                </div>
                <div class="fin-net-card red" style="margin-bottom:0;">
                    <div>
                        <div class="fin-net-label">Gastos rec.</div>
                        <div id="fin_pExp" class="fin-net-value" style="color:#f87171;">0€</div>
                    </div>
                    <span style="font-size:1.8em;opacity:.3;">↓</span>
                </div>
            </div>
            <div class="fin-net-card" id="fin-proj-net-wrapper">
                <div>
                    <div class="fin-net-label">Resultado estimado</div>
                    <div id="fin_pNet" class="fin-net-value">0€</div>
                </div>
                <span style="font-size:2em;opacity:.25;">◈</span>
            </div>

            <!-- Sliders -->
            <div class="fin-section-title">🎛️ Precios</div>
            <div class="fin-cards">
                <div class="fin-slider-wrap">
                    <div class="fin-slider-label">
                        <span>Entrada</span>
                        <strong id="fin_tpVal">20€</strong>
                    </div>
                    <input type="range" id="fin_tpSlider" min="5" max="100" value="20" class="fin-slider"
                        oninput="document.getElementById('fin_tpVal').textContent=this.value+'€';window._financePreviewProj('ticket',this.value);"
                        onchange="window.setTicketPriceFromSlider&&window.setTicketPriceFromSlider(this.value);">
                    <div style="display:flex;justify-content:space-between;font-size:.7em;color:#333;margin-top:4px;">
                        <span>5€</span><span>100€</span>
                    </div>
                </div>
                <div class="fin-slider-wrap">
                    <div class="fin-slider-label">
                        <span>Merch</span>
                        <strong id="fin_mpVal">10€</strong>
                    </div>
                    <input type="range" id="fin_mpSlider" min="1" max="50" value="10" class="fin-slider"
                        oninput="document.getElementById('fin_mpVal').textContent=this.value+'€';window._financePreviewProj('merch',this.value);"
                        onchange="window.setMerchandisingPriceFromSlider&&window.setMerchandisingPriceFromSlider(this.value);">
                    <div style="display:flex;justify-content:space-between;font-size:.7em;color:#333;margin-top:4px;">
                        <span>1€</span><span>50€</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB: GASTOS -->
        <div class="fin-panel" id="fin-tab-gastos">
            <div class="fin-section-title">💸 Gastos recurrentes semanales</div>
            <div id="fin-gastos-list">
                <div class="fin-expense-row">
                    <div>
                        <div class="fin-expense-name">⚽ Salarios plantilla</div>
                        <div class="fin-expense-sub" id="fin_pCnt">—</div>
                    </div>
                    <div id="fin_pSal" class="fin-expense-val red">0€/sem</div>
                </div>
                <div class="fin-expense-row">
                    <div>
                        <div class="fin-expense-name">👔 Salarios staff</div>
                        <div class="fin-expense-sub" id="fin_sCnt">—</div>
                    </div>
                    <div id="fin_sSal" class="fin-expense-val red">0€/sem</div>
                </div>
                <!-- Las filas de cuotas y prima se insertan aquí dinámicamente -->
            </div>
            <div class="fin-total-row" style="margin-top:16px;">
                <span class="fin-total-label">Total semanal</span>
                <span id="fin_totExp" class="fin-total-val">0€/sem</span>
            </div>

            <div class="fin-section-title" style="margin-top:28px;">🏗️ Inversiones temporada</div>
            <div class="fin-expense-row">
                <div>
                    <div class="fin-expense-name">🏟️ Estadio</div>
                    <div class="fin-expense-sub" id="fin_rStaCap">—</div>
                </div>
                <div id="fin_rSta" class="fin-expense-val red">0€</div>
            </div>
            <div class="fin-expense-row">
                <div>
                    <div class="fin-expense-name">🏋️ Centro entrenamiento</div>
                    <div class="fin-expense-sub" id="fin_rTraLvl">—</div>
                </div>
                <div id="fin_rTra" class="fin-expense-val red">0€</div>
            </div>
            <div class="fin-total-row" style="margin-top:10px;">
                <span class="fin-total-label">Total inversiones</span>
                <span id="fin_rTot" class="fin-total-val">0€</span>
            </div>
            <div id="fin_rList" style="margin-top:12px;font-size:.82em;color:#444;font-style:italic;"></div>
        </div>

        <!-- TAB: MERCADO -->
        <div class="fin-panel" id="fin-tab-mercado">
            <div class="fin-section-title">🔄 Balance de mercado — temporada</div>
            <div class="fin-market-grid">
                <div class="fin-market-item">
                    <div class="lbl">💸 Fichajes</div>
                    <div id="fin_mPur" class="val" style="color:#f87171;">0€</div>
                </div>
                <div class="fin-market-item">
                    <div class="lbl">💰 Ventas</div>
                    <div id="fin_mSal" class="val" style="color:#4ade80;">0€</div>
                </div>
                <div class="fin-market-item">
                    <div class="lbl">🚪 Indem. jugadores</div>
                    <div id="fin_mCom" class="val" style="color:#f87171;">0€</div>
                </div>
                <div class="fin-market-item">
                    <div class="lbl">👔 Cláus. + indem. staff</div>
                    <div id="fin_mStf" class="val" style="color:#f87171;">0€</div>
                </div>
            </div>
            <div class="fin-net-card" id="fin-mbal-wrapper" style="margin-top:8px;">
                <div>
                    <div class="fin-net-label">Balance neto de mercado</div>
                    <div id="fin_mBal" class="fin-net-value">0€</div>
                </div>
                <span style="font-size:2em;opacity:.2;">⇄</span>
            </div>
        </div>

        <!-- TAB: HISTORIAL -->
        <div class="fin-panel" id="fin-tab-historial">
            <div class="fin-section-title">📋 Movimientos de temporada</div>
            <div id="fin_mList" style="font-size:.87em;">
                <span style="color:#333;">Sin movimientos registrados esta temporada.</span>
            </div>
        </div>
        `;

        // Aplicar colores dinámicos al net
        patchNetColorUpdates();
    }

    // ── Tab switcher ──────────────────────────────────────────────
    window._finTab = function(tab) {
        document.querySelectorAll('.fin-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('active'));
        const panel = document.getElementById('fin-tab-' + tab);
        if (panel) panel.classList.add('active');
        const tabs = document.querySelectorAll('.fin-tab');
        const labels = ['semana','gastos','mercado','historial'];
        tabs.forEach((t, i) => { if (labels[i] === tab) t.classList.add('active'); });
    };

    // ── Actualizar colores del net result automáticamente ─────────
    function patchNetColorUpdates() {
        // Observar cambios en fin_lNet y fin_pNet para aplicar clase
        const observe = (id, wrapperId) => {
            const el = document.getElementById(id);
            const wrapper = document.getElementById(wrapperId);
            if (!el || !wrapper) return;
            const mo = new MutationObserver(() => {
                const txt = el.textContent || '';
                const isPos = txt.startsWith('+') || (!txt.startsWith('-') && txt !== '—' && txt !== '0€');
                const isNeg = txt.startsWith('-');
                wrapper.className = 'fin-net-card' + (isPos ? ' green' : isNeg ? ' red' : '');
                el.style.color = isPos ? '#4ade80' : isNeg ? '#f87171' : '#e0e0e0';
            });
            mo.observe(el, { childList: true, characterData: true, subtree: true });
        };
        observe('fin_lNet', 'fin-net-wrapper');
        observe('fin_pNet', 'fin-proj-net-wrapper');
        observe('fin_mBal', 'fin-mbal-wrapper');
    }

    // ── Hook openPage para re-aplicar si el panel se reconstruye ──
    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        const orig = window.openPage;
        window.openPage = function(page, ...args) {
            orig.call(this, page, ...args);
            if (page === 'finance') {
                setTimeout(() => {
                    const c = document.getElementById('finance');
                    if (c) {
                        delete c._uiPatched;
                        injectStyles();
                        reshapeHTML(c);
                    }
                }, 80);
            }
        };
    }

    // ── INIT ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }
        hookOpenPage();
        setTimeout(waitAndRestyle, 800);
        console.log('[FinanceUI] ✅ v1.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();
