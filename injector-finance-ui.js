// ============================================================
// injector-finance-ui.js  v3.0
// Dashboard financiero que respeta el estilo visual del juego:
// fondo azul oscuro, bordes azul brillante, dorado, bloques vivos
// ============================================================
(function () {
'use strict';

const gl  = () => window.gameLogic;
const gs  = () => gl()?.getGameState();
const fmt = n => Math.round(n || 0).toLocaleString('es-ES');

// ─────────────────────────────────────────────────────────────
// CSS — mismo lenguaje que el juego: azul, dorado, bordes neón
// ─────────────────────────────────────────────────────────────
const CSS = `
#finance {
  background: linear-gradient(180deg, #0e1e3a 0%, #081428 100%) !important;
  padding: 0 !important;
  font-family: Arial, sans-serif !important;
  color: #E0E0E0 !important;
}

/* HEADER */
.fi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: linear-gradient(90deg, #0F2040, #1A3E6F);
  border-bottom: 2px solid #5588FF;
  box-shadow: 0 3px 15px rgba(0,0,0,.6);
  position: sticky; top: 0; z-index: 30;
}
.fi-header h1 {
  font-size: 1.5em !important;
  font-weight: bold !important;
  color: #FFD700 !important;
  letter-spacing: 3px !important;
  text-transform: uppercase !important;
  margin: 0 !important;
  text-shadow: 0 0 12px rgba(255,215,0,.4) !important;
}

/* BALANCE HERO — el número más grande */
.fi-hero {
  padding: 22px 20px 18px;
  background: linear-gradient(135deg, #0a1830 0%, #0f2448 100%);
  border-bottom: 2px solid #1E4488;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.fi-hero-label {
  font-size: .78em;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #5588FF;
  margin-bottom: 6px;
  font-weight: bold;
}
#fin_balance {
  font-size: 3.4em !important;
  font-weight: bold !important;
  color: #FFD700 !important;
  text-shadow: 0 0 20px rgba(255,215,0,.5), 0 2px 4px rgba(0,0,0,.8) !important;
  line-height: 1 !important;
  letter-spacing: -1px !important;
}
#fin_balance.neg { color: #FF4444 !important; text-shadow: 0 0 20px rgba(255,68,68,.5) !important; }
.fi-hero-team {
  font-size: .82em;
  color: #4A6A9A;
  margin-top: 6px;
  letter-spacing: 1px;
}

/* KPI STRIP — 3 datos clave en una fila */
.fi-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-bottom: 1px solid #1E3060;
}
.fi-kpi {
  padding: 14px 16px;
  text-align: center;
  border-right: 1px solid #1E3060;
  background: rgba(0,0,0,.25);
}
.fi-kpi:last-child { border-right: none; }
.fi-kpi-label {
  font-size: .68em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #4A6A9A;
  font-weight: bold;
  margin-bottom: 5px;
}
.fi-kpi-val {
  font-size: 1.3em;
  font-weight: bold;
}
.fi-kpi-val.green { color: #4CAF50; text-shadow: 0 0 8px rgba(76,175,80,.4); }
.fi-kpi-val.red   { color: #FF4444; text-shadow: 0 0 8px rgba(255,68,68,.4); }
.fi-kpi-val.gold  { color: #FFD700; }
.fi-kpi-val.muted { color: #445; }

/* TABS */
.fi-tabs {
  display: flex;
  background: rgba(0,0,0,.4);
  border-bottom: 2px solid #1E3060;
  overflow-x: auto;
  scrollbar-width: none;
  position: sticky;
  top: 57px;
  z-index: 29;
}
.fi-tabs::-webkit-scrollbar { display: none; }
.fi-tab {
  flex-shrink: 0;
  padding: 12px 20px;
  font-size: .82em;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #4A6A9A;
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 3px solid transparent;
  transition: all .2s;
  white-space: nowrap;
}
.fi-tab:hover { color: #88AADD; }
.fi-tab.active {
  color: #FFD700;
  border-bottom-color: #FFD700;
  background: rgba(255,215,0,.05);
}

/* PANELS */
.fi-panel { display: none; padding: 20px; }
.fi-panel.active { display: block; }

/* SECTION TITLES */
.fi-sec {
  font-size: .75em;
  font-weight: bold;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #FFD700;
  background: rgba(0,0,0,.4);
  border: 1px solid #1E3A7A;
  border-left: 3px solid #5588FF;
  padding: 7px 14px;
  margin: 20px 0 12px;
  border-radius: 3px;
}
.fi-sec:first-child { margin-top: 0; }

/* CARD GRID — bloques de datos 2x2 o 3x3 */
.fi-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.fi-cards.triple { grid-template-columns: 1fr 1fr 1fr; }
.fi-card {
  background: linear-gradient(135deg, rgba(30,60,120,.5) 0%, rgba(10,20,50,.5) 100%);
  border: 1px solid #1E4488;
  border-radius: 6px;
  padding: 14px 16px;
  transition: border-color .2s, box-shadow .2s;
}
.fi-card:hover {
  border-color: #5588FF;
  box-shadow: 0 0 10px rgba(85,136,255,.2);
}
.fi-card-label {
  font-size: .72em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #4A6A9A;
  font-weight: bold;
  margin-bottom: 7px;
}
.fi-card-val {
  font-size: 1.4em;
  font-weight: bold;
  color: #E0E0E0;
}
.fi-card-val.green { color: #4CAF50; }
.fi-card-val.red   { color: #FF4444; }
.fi-card-val.gold  { color: #FFD700; }
.fi-card-sub {
  font-size: .75em;
  color: #4A5A7A;
  margin-top: 4px;
}

/* RESULT BANNER */
.fi-result {
  border-radius: 8px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border: 1px solid #1E3060;
  background: rgba(0,0,0,.3);
}
.fi-result.green {
  border-color: #2E7D32;
  background: linear-gradient(90deg, rgba(46,125,50,.15) 0%, rgba(0,0,0,.3) 100%);
  box-shadow: inset 2px 0 0 #4CAF50;
}
.fi-result.red {
  border-color: #B71C1C;
  background: linear-gradient(90deg, rgba(183,28,28,.15) 0%, rgba(0,0,0,.3) 100%);
  box-shadow: inset 2px 0 0 #FF4444;
}
.fi-result-label {
  font-size: .72em;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #4A6A9A;
  font-weight: bold;
  margin-bottom: 5px;
}
.fi-result-val {
  font-size: 1.9em;
  font-weight: bold;
  color: #E0E0E0;
}
.fi-result-val.green { color: #4CAF50; text-shadow: 0 0 10px rgba(76,175,80,.3); }
.fi-result-val.red   { color: #FF4444; text-shadow: 0 0 10px rgba(255,68,68,.3); }
.fi-result-badge {
  font-size: 2em;
  opacity: .15;
  font-weight: bold;
  letter-spacing: -2px;
}

/* ROW LIST (gastos) */
.fi-rows {
  background: rgba(0,0,0,.3);
  border: 1px solid #1E3060;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}
.fi-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(30,48,96,.6);
  transition: background .15s;
}
.fi-row:last-child { border-bottom: none; }
.fi-row:hover { background: rgba(85,136,255,.05); }
.fi-row-left { display: flex; flex-direction: column; gap: 2px; }
.fi-row-name { font-size: .95em; font-weight: bold; color: #C0C8D8; }
.fi-row-sub  { font-size: .73em; color: #3A4A6A; }
.fi-row-val  { font-size: 1em; font-weight: bold; }
.fi-row-val.red   { color: #FF6666; }
.fi-row-val.green { color: #4CAF50; }
.fi-row-val.gold  { color: #FFD700; }
.fi-row-val.muted { color: #334; }

/* TOTAL BAND */
.fi-total {
  background: rgba(183,28,28,.15);
  border: 1px solid #6A1A1A;
  border-radius: 6px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.fi-total-label {
  font-size: .78em;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #8A3A3A;
  font-weight: bold;
}
.fi-total-val {
  font-size: 1.4em;
  font-weight: bold;
  color: #FF6666;
}

/* AWAY WARNING */
.fi-away {
  background: rgba(255,152,0,.1);
  border: 1px solid rgba(255,152,0,.3);
  border-radius: 6px;
  padding: 10px 16px;
  font-size: .85em;
  color: #FFA726;
  margin-bottom: 14px;
  display: none;
}

/* SLIDERS */
.fi-sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fi-slider {
  background: linear-gradient(135deg, rgba(30,60,120,.4) 0%, rgba(10,20,50,.4) 100%);
  border: 1px solid #1E4488;
  border-radius: 6px;
  padding: 14px 16px;
}
.fi-slider-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.fi-slider-top span {
  font-size: .75em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #4A6A9A;
  font-weight: bold;
}
.fi-slider-top strong {
  font-size: 1.1em;
  font-weight: bold;
  color: #FFD700;
}
input[type=range].fi-range {
  width: 100%;
  -webkit-appearance: none;
  height: 5px;
  background: linear-gradient(90deg, #5588FF, #1E3060);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
input[type=range].fi-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #FFD700;
  box-shadow: 0 0 8px rgba(255,215,0,.6), 0 2px 4px rgba(0,0,0,.5);
  cursor: pointer;
  transition: transform .15s;
}
input[type=range].fi-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
.fi-range-limits {
  display: flex;
  justify-content: space-between;
  font-size: .68em;
  color: #2A3A5A;
  margin-top: 5px;
}

/* MARKET GRID */
.fi-mkt { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.fi-mkt-card {
  background: rgba(0,0,0,.3);
  border: 1px solid #1E3060;
  border-radius: 6px;
  padding: 14px;
}
.fi-mkt-card .lbl { font-size: .72em; letter-spacing: 2px; text-transform: uppercase; color: #3A5A8A; font-weight: bold; margin-bottom: 6px; }
.fi-mkt-card .val { font-size: 1.25em; font-weight: bold; }

/* HISTORY */
.fi-hist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 16px;
  border-bottom: 1px solid rgba(30,48,96,.5);
  gap: 12px;
  transition: background .15s;
}
.fi-hist-item:hover { background: rgba(85,136,255,.04); }
.fi-hist-desc { font-size: .88em; color: #8A9AB8; }
.fi-hist-week { font-size: .72em; color: #2A3A5A; margin-top: 2px; }
.fi-hist-amt  { font-size: .95em; font-weight: bold; white-space: nowrap; flex-shrink: 0; }

/* CLOSE BTN */
#finance .fi-close-btn {
  background: rgba(85,136,255,.15) !important;
  border: 1px solid #5588FF !important;
  color: #88AAFF !important;
  border-radius: 5px !important;
  padding: 8px 18px !important;
  font-size: .82em !important;
  letter-spacing: 2px !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  transition: all .2s !important;
}
#finance .fi-close-btn:hover {
  background: rgba(85,136,255,.3) !important;
  color: #FFD700 !important;
  border-color: #FFD700 !important;
}
`;

// ─────────────────────────────────────────────────────────────
// HTML
// ─────────────────────────────────────────────────────────────
function buildHTML() {
return `
<style id="fi-css">${CSS}</style>

<div class="fi-header">
  <h1>💰 CAJA &amp; FINANZAS</h1>
  <button class="fi-close-btn" onclick="closePage('finance')">✖ CERRAR</button>
</div>

<!-- BALANCE GRANDE -->
<div class="fi-hero">
  <div class="fi-hero-label">💰 Balance en caja</div>
  <div id="fin_balance">0€</div>
  <div class="fi-hero-team" id="fi-hero-sub"></div>
</div>

<!-- 3 KPIs de un vistazo -->
<div class="fi-kpis">
  <div class="fi-kpi">
    <div class="fi-kpi-label">⬆ Ingresos ult. sem.</div>
    <div class="fi-kpi-val green" id="fi-kpi-inc">—</div>
  </div>
  <div class="fi-kpi">
    <div class="fi-kpi-label">⬇ Gastos ult. sem.</div>
    <div class="fi-kpi-val red" id="fi-kpi-exp">—</div>
  </div>
  <div class="fi-kpi">
    <div class="fi-kpi-label">◈ Neto ult. sem.</div>
    <div class="fi-kpi-val gold" id="fi-kpi-net">—</div>
  </div>
</div>

<!-- TABS -->
<div class="fi-tabs">
  <button class="fi-tab active" onclick="window._fiTab('semana')">📅 Semana</button>
  <button class="fi-tab"        onclick="window._fiTab('gastos')">💸 Gastos</button>
  <button class="fi-tab"        onclick="window._fiTab('mercado')">🔄 Mercado</button>
  <button class="fi-tab"        onclick="window._fiTab('historial')">📋 Historial</button>
</div>

<!-- ═══════════════ TAB SEMANA ═══════════════ -->
<div class="fi-panel active" id="fi-p-semana">

  <div class="fi-sec">📅 Última jornada jugada — <span id="fin_lastLabel" style="color:#88AAFF;text-transform:none;letter-spacing:0;font-weight:normal;font-size:1.2em;"></span></div>

  <div class="fi-cards">
    <div class="fi-card">
      <div class="fi-card-label">🎟️ Taquilla</div>
      <div id="fin_lTicket" class="fi-card-val green">—</div>
      <div id="fin_lTicketD" class="fi-card-sub">—</div>
    </div>
    <div class="fi-card">
      <div class="fi-card-label">🛍️ Merchandising</div>
      <div id="fin_lMerch" class="fi-card-val green">—</div>
      <div id="fin_lMerchD" class="fi-card-sub">—</div>
    </div>
  </div>
  <div class="fi-card" style="margin-bottom:12px;">
    <div class="fi-card-label">📺 TV &amp; Patrocinios / ingresos base</div>
    <div id="fin_lBase" class="fi-card-val gold">—</div>
  </div>
  <div class="fi-cards" style="margin-bottom:12px;">
    <div class="fi-result green" style="margin-bottom:0;">
      <div>
        <div class="fi-result-label">Total ingresos</div>
        <div id="fin_lTotI" class="fi-result-val green" style="font-size:1.5em;">—</div>
      </div>
      <div class="fi-result-badge">IN</div>
    </div>
    <div class="fi-result red" style="margin-bottom:0;">
      <div>
        <div class="fi-result-label">Gastos pagados</div>
        <div id="fin_lExp" class="fi-result-val red" style="font-size:1.5em;">—</div>
      </div>
      <div class="fi-result-badge">OUT</div>
    </div>
  </div>
  <div class="fi-result" id="fi-lnet-wrap">
    <div>
      <div class="fi-result-label">Resultado neto jornada</div>
      <div id="fin_lNet" class="fi-result-val">—</div>
    </div>
    <div class="fi-result-badge">NET</div>
  </div>

  <div class="fi-sec" style="margin-top:22px;">🔮 Proyección próxima jornada — <span id="fin_nextLabel" style="color:#FFA726;text-transform:none;letter-spacing:0;font-weight:normal;font-size:1.2em;"></span></div>

  <div id="fin_awayWarning" class="fi-away">✈️ Partido visitante — sin ingresos de taquilla ni merchandising esta semana</div>

  <div class="fi-cards">
    <div class="fi-card">
      <div class="fi-card-label">🎟️ Taquilla estimada</div>
      <div id="fin_pTicket" class="fi-card-val green">0€</div>
      <div id="fin_pTicketD" class="fi-card-sub">—</div>
    </div>
    <div class="fi-card">
      <div class="fi-card-label">🛍️ Merch estimado</div>
      <div id="fin_pMerch" class="fi-card-val green">0€</div>
      <div id="fin_pMerchD" class="fi-card-sub">—</div>
    </div>
  </div>
  <div class="fi-card" style="margin-bottom:12px;">
    <div class="fi-card-label">📺 TV &amp; Patrocinios</div>
    <div id="fin_pBase" class="fi-card-val gold">0€</div>
  </div>
  <div class="fi-cards" style="margin-bottom:12px;">
    <div class="fi-result green" style="margin-bottom:0;">
      <div>
        <div class="fi-result-label">Total ingresos est.</div>
        <div id="fin_pTotI" class="fi-result-val green" style="font-size:1.5em;">0€</div>
      </div>
      <div class="fi-result-badge">IN</div>
    </div>
    <div class="fi-result red" style="margin-bottom:0;">
      <div>
        <div class="fi-result-label">Gastos recurrentes</div>
        <div id="fin_pExp" class="fi-result-val red" style="font-size:1.5em;">0€</div>
      </div>
      <div class="fi-result-badge">OUT</div>
    </div>
  </div>
  <div class="fi-result" id="fi-pnet-wrap">
    <div>
      <div class="fi-result-label">Resultado estimado</div>
      <div id="fin_pNet" class="fi-result-val">0€</div>
    </div>
    <div class="fi-result-badge">EST</div>
  </div>

  <div class="fi-sec" style="margin-top:22px;">🎛️ Ajuste de precios</div>
  <div class="fi-sliders">
    <div class="fi-slider">
      <div class="fi-slider-top">
        <span>Precio entrada</span>
        <strong id="fin_tpVal">20€</strong>
      </div>
      <input type="range" id="fin_tpSlider" min="5" max="100" value="20" class="fi-range"
        oninput="document.getElementById('fin_tpVal').textContent=this.value+'€';window._financePreviewProj('ticket',this.value);"
        onchange="window.setTicketPriceFromSlider&&window.setTicketPriceFromSlider(this.value);">
      <div class="fi-range-limits"><span>5€</span><span>100€</span></div>
    </div>
    <div class="fi-slider">
      <div class="fi-slider-top">
        <span>Precio merch</span>
        <strong id="fin_mpVal">10€</strong>
      </div>
      <input type="range" id="fin_mpSlider" min="1" max="50" value="10" class="fi-range"
        oninput="document.getElementById('fin_mpVal').textContent=this.value+'€';window._financePreviewProj('merch',this.value);"
        onchange="window.setMerchandisingPriceFromSlider&&window.setMerchandisingPriceFromSlider(this.value);">
      <div class="fi-range-limits"><span>1€</span><span>50€</span></div>
    </div>
  </div>
</div>

<!-- ═══════════════ TAB GASTOS ═══════════════ -->
<div class="fi-panel" id="fi-p-gastos">
  <div class="fi-sec">💸 Gastos recurrentes semanales</div>
  <div class="fi-rows" id="fi-gastos-rows">
    <div class="fi-row">
      <div class="fi-row-left">
        <div class="fi-row-name">⚽ Salarios plantilla</div>
        <div class="fi-row-sub" id="fin_pCnt">—</div>
      </div>
      <div id="fin_pSal" class="fi-row-val red">0€/sem</div>
    </div>
    <div class="fi-row">
      <div class="fi-row-left">
        <div class="fi-row-name">👔 Salarios staff</div>
        <div class="fi-row-sub" id="fin_sCnt">—</div>
      </div>
      <div id="fin_sSal" class="fi-row-val red">0€/sem</div>
    </div>
    <!-- cuotas y prima se añaden dinámicamente -->
  </div>
  <div class="fi-total">
    <span class="fi-total-label">Total semanal</span>
    <span id="fin_totExp" class="fi-total-val">0€/sem</span>
  </div>

  <div class="fi-sec">🏗️ Inversiones en instalaciones</div>
  <div class="fi-rows">
    <div class="fi-row">
      <div class="fi-row-left">
        <div class="fi-row-name">🏟️ Estadio</div>
        <div class="fi-row-sub" id="fin_rStaCap">—</div>
      </div>
      <div id="fin_rSta" class="fi-row-val red">0€</div>
    </div>
    <div class="fi-row">
      <div class="fi-row-left">
        <div class="fi-row-name">🏋️ Centro entrenamiento</div>
        <div class="fi-row-sub" id="fin_rTraLvl">—</div>
      </div>
      <div id="fin_rTra" class="fi-row-val red">0€</div>
    </div>
  </div>
  <div class="fi-total">
    <span class="fi-total-label">Total inversiones temporada</span>
    <span id="fin_rTot" class="fi-total-val">0€</span>
  </div>
  <div id="fin_rList" style="margin-top:10px;"></div>
</div>

<!-- ═══════════════ TAB MERCADO ═══════════════ -->
<div class="fi-panel" id="fi-p-mercado">
  <div class="fi-sec">🔄 Balance de mercado — temporada actual</div>
  <div class="fi-mkt">
    <div class="fi-mkt-card">
      <div class="lbl">💸 Inversión fichajes</div>
      <div id="fin_mPur" class="val" style="color:#FF6666;">0€</div>
    </div>
    <div class="fi-mkt-card">
      <div class="lbl">💰 Ingresos ventas</div>
      <div id="fin_mSal" class="val" style="color:#4CAF50;">0€</div>
    </div>
    <div class="fi-mkt-card">
      <div class="lbl">🚪 Indemnizaciones</div>
      <div id="fin_mCom" class="val" style="color:#FF6666;">0€</div>
    </div>
    <div class="fi-mkt-card">
      <div class="lbl">👔 Cláusulas staff</div>
      <div id="fin_mStf" class="val" style="color:#FF6666;">0€</div>
    </div>
  </div>
  <div class="fi-result" id="fi-mbal-wrap">
    <div>
      <div class="fi-result-label">Balance neto de mercado</div>
      <div id="fin_mBal" class="fi-result-val">0€</div>
    </div>
    <div class="fi-result-badge">MKT</div>
  </div>
</div>

<!-- ═══════════════ TAB HISTORIAL ═══════════════ -->
<div class="fi-panel" id="fi-p-historial">
  <div class="fi-sec">📋 Movimientos de temporada</div>
  <div id="fin_mList">
    <div style="color:#2A3A5A;padding:20px;text-align:center;font-style:italic;">Sin movimientos registrados esta temporada.</div>
  </div>
</div>
`;
}

// ─── helpers ─────────────────────────────────────────────────
function setText(id, text, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
}

function setResult(wrapperId, valId) {
    const txt  = document.getElementById(valId)?.textContent || '';
    const wrap = document.getElementById(wrapperId);
    if (!wrap) return;
    const pos = txt.startsWith('+');
    const neg = txt.startsWith('-');
    wrap.className = 'fi-result ' + (pos ? 'green' : neg ? 'red' : '');
    const valEl = document.getElementById(valId);
    if (valEl) valEl.className = 'fi-result-val ' + (pos ? 'green' : neg ? 'red' : '');
}

window._fiTab = function(tab) {
    const tabs  = ['semana','gastos','mercado','historial'];
    document.querySelectorAll('.fi-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.fi-tab').forEach((t,i) => t.classList.toggle('active', tabs[i]===tab));
    const p = document.getElementById('fi-p-' + tab);
    if (p) p.classList.add('active');
};

// ─── buildFinancePanel replacement ───────────────────────────
function buildFinancePanelNew() {
    const c = document.getElementById('finance');
    if (!c) return;
    c.innerHTML = buildHTML();
}

// ─── refreshFinancePanel replacement ─────────────────────────
function refreshFinancePanelNew() {
    if (!gl()) return;
    const s = gs();
    if (!s?.team) return;

    // Balance
    const bal = s.balance || 0;
    const balEl = document.getElementById('fin_balance');
    if (balEl) { balEl.textContent = fmt(bal) + '€'; balEl.className = bal < 0 ? 'neg' : ''; }
    const sub = document.getElementById('fi-hero-sub');
    if (sub) sub.textContent = `${s.team}  ·  Temporada ${s.currentSeason || '—'}  ·  Semana ${s.week || 1}`;

    // ── Última jornada ─────────────────────────────────────────
    const lw = s.lastWeekFinance;
    if (lw) {
        setText('fin_lastLabel', `Semana ${lw.week} — ${lw.home ? '🏟️ Local' : '✈️ Visitante'}`);
        setText('fin_lTicket',   fmt(lw.ticketInc) + '€', lw.ticketInc > 0 ? '#4CAF50' : '#3A5A7A');
        setText('fin_lTicketD',  lw.home ? `${fmt(lw.att)} espectadores` : 'Partido visitante');
        setText('fin_lMerch',    fmt(lw.merchInc)  + '€', lw.merchInc  > 0 ? '#4CAF50' : '#3A5A7A');
        setText('fin_lMerchD',   lw.home ? `${fmt(lw.items)} unidades` : 'Partido visitante');
        setText('fin_lBase',     fmt(lw.baseInc)   + '€');
        setText('fin_lTotI',     fmt(lw.totalInc)  + '€');
        setText('fin_lExp',      fmt(lw.totalExp)  + '€');
        const net = lw.net || 0;
        setText('fin_lNet', (net >= 0 ? '+' : '') + fmt(net) + '€');
        setResult('fi-lnet-wrap','fin_lNet');
        // KPIs
        setText('fi-kpi-inc', fmt(lw.totalInc) + '€');
        setText('fi-kpi-exp', fmt(lw.totalExp) + '€');
        const kpi = document.getElementById('fi-kpi-net');
        if (kpi) {
            kpi.textContent = (net >= 0 ? '+' : '') + fmt(net) + '€';
            kpi.className = 'fi-kpi-val ' + (net >= 0 ? 'green' : 'red');
        }
    } else {
        setText('fin_lastLabel','(sin jornadas jugadas todavía)');
    }

    // ── Proyección ─────────────────────────────────────────────
    const tp    = s.ticketPrice || 20;
    const mp    = s.merchandisingPrice || 10;
    const cap   = s.stadiumCapacity || 5000;
    const pop   = (s.popularity || 50) / 100;
    const att   = Math.max(0, Math.min(cap, Math.round(cap * pop * Math.max(.3, 1 - (tp-20)/150))));
    const its   = Math.floor((s.fanbase || 1000) * ((s.popularity||50)/500) * 0.015);
    const isAway = (() => {
        try {
            const sch = s.schedule || [];
            const nxt = sch.find(m => !m.played);
            if (!nxt) return null;
            return !(nxt.home === true || nxt.homeTeam === s.team);
        } catch(e) { return null; }
    })();
    const tI    = isAway ? 0 : Math.floor(tp * att);
    const mI    = isAway ? 0 : its * mp;
    const bI    = s.weeklyIncomeBase || 5000;
    const projI = tI + mI + bI;
    const pS    = (s.squad  || []).reduce((a,p) => a+(p.salary||0), 0);
    const sArr  = Object.values(s.staff || {}).filter(Boolean);
    const stS   = sArr.reduce((a,x) => a+(x.salary||0), 0);
    const loanP = s.fd_loanPayment || 0;
    const totE  = pS + stS + loanP;
    const projN = projI - totE;

    const nLabel = isAway === false ? '🏟️ Local' : isAway === true ? '✈️ Visitante' : '—';
    setText('fin_nextLabel', nLabel);
    const aw = document.getElementById('fin_awayWarning');
    if (aw) aw.style.display = isAway ? '' : 'none';

    setText('fin_pTicket',  fmt(tI)    + '€', isAway ? '#3A5A7A' : '#4CAF50');
    setText('fin_pTicketD', isAway ? 'Partido visitante' : `${fmt(att)} espectadores × ${tp}€`);
    setText('fin_pMerch',   fmt(mI)    + '€', isAway ? '#3A5A7A' : '#4CAF50');
    setText('fin_pMerchD',  isAway ? 'Partido visitante' : `${fmt(its)} uds × ${mp}€`);
    setText('fin_pBase',    fmt(bI)    + '€');
    setText('fin_pTotI',    fmt(projI) + '€');
    setText('fin_pExp',     fmt(totE)  + '€');
    setText('fin_pNet',     (projN >= 0 ? '+' : '') + fmt(projN) + '€');
    setResult('fi-pnet-wrap','fin_pNet');

    const tpSlider = document.getElementById('fin_tpSlider');
    if (tpSlider) { tpSlider.value = tp; setText('fin_tpVal', tp + '€'); }
    const mpSlider = document.getElementById('fin_mpSlider');
    if (mpSlider) { mpSlider.value = mp; setText('fin_mpVal', mp + '€'); }

    // ── Gastos recurrentes ──────────────────────────────────────
    setText('fin_pSal',  fmt(pS)  + '€/sem');
    setText('fin_pCnt',  `${s.squad?.length || 0} jugadores`);
    setText('fin_sSal',  fmt(stS) + '€/sem');
    setText('fin_sCnt',  `${sArr.length} miembro${sArr.length!==1?'s':''}`);
    setText('fin_totExp', fmt(totE) + '€/sem');
    injectExtraRows(pS, stS);

    // ── Mercado ─────────────────────────────────────────────────
    const pur  = s.playerPurchases     || 0;
    const sal  = s.playerSalesIncome   || 0;
    const com  = s.playerCompensations || 0;
    const mvs  = s.seasonMovements     || [];
    const stfC = mvs.filter(m=>m.type==='staff_hire'||m.type==='staff_compensation')
                    .reduce((a,m)=>a+Math.abs(m.amount),0);
    const mBal = sal - pur - com - stfC;
    setText('fin_mPur', fmt(pur)  + '€', pur  > 0 ? '#FF6666' : '#3A5A7A');
    setText('fin_mSal', fmt(sal)  + '€', sal  > 0 ? '#4CAF50' : '#3A5A7A');
    setText('fin_mCom', fmt(com)  + '€', com  > 0 ? '#FF6666' : '#3A5A7A');
    setText('fin_mStf', fmt(stfC) + '€', stfC > 0 ? '#FF6666' : '#3A5A7A');
    setText('fin_mBal', (mBal >= 0 ? '+' : '') + fmt(mBal) + '€');
    setResult('fi-mbal-wrap','fin_mBal');

    // ── Remodelaciones ──────────────────────────────────────────
    const rens = mvs.filter(m=>m.type==='renovation');
    const sR   = rens.filter(m=>/estadio|asiento/i.test(m.description)).reduce((a,m)=>a+Math.abs(m.amount),0);
    const tR   = rens.filter(m=>/entrenamiento/i.test(m.description)).reduce((a,m)=>a+Math.abs(m.amount),0);
    const toR  = rens.reduce((a,m)=>a+Math.abs(m.amount),0);
    setText('fin_rSta',   fmt(sR)  + '€', sR  > 0 ? '#FF6666' : '#3A5A7A');
    setText('fin_rStaCap',`Capacidad: ${fmt(s.stadiumCapacity||0)}`);
    setText('fin_rTra',   fmt(tR)  + '€', tR  > 0 ? '#FF6666' : '#3A5A7A');
    setText('fin_rTraLvl',`Nivel: ${s.trainingLevel||1}`);
    setText('fin_rTot',   fmt(toR) + '€', toR > 0 ? '#FF6666' : '#3A5A7A');
    const rListEl = document.getElementById('fin_rList');
    if (rListEl) rListEl.innerHTML = rens.length === 0
        ? '<div style="color:#2A3A5A;padding:10px 0;font-style:italic;">Sin inversiones esta temporada.</div>'
        : '<div class="fi-rows">' + rens.map(r =>
            `<div class="fi-row">
               <div class="fi-row-left">
                 <div class="fi-row-name" style="font-size:.88em;">Sem ${r.week} — ${r.description}</div>
               </div>
               <div class="fi-row-val red">-${fmt(Math.abs(r.amount))}€</div>
             </div>`).join('') + '</div>';

    // ── Historial ───────────────────────────────────────────────
    const mListEl = document.getElementById('fin_mList');
    if (mListEl) {
        const all = mvs.filter(m=>m.type!=='renovation');
        const ic  = {purchase:'💸',sale:'💰',compensation:'🚪',staff_hire:'👔',staff_compensation:'🚫'};
        mListEl.innerHTML = all.length === 0
            ? '<div style="color:#2A3A5A;padding:20px;text-align:center;font-style:italic;">Sin movimientos registrados.</div>'
            : '<div class="fi-rows">' + [...all].reverse().map(m => {
                const pos = m.amount > 0;
                return `<div class="fi-hist-item">
                    <div>
                      <div class="fi-hist-desc">${ic[m.type]||'•'} ${m.description}</div>
                      <div class="fi-hist-week">Semana ${m.week}</div>
                    </div>
                    <div class="fi-hist-amt" style="color:${pos?'#4CAF50':'#FF6666'}">
                      ${pos?'+':''}${fmt(m.amount)}€
                    </div>
                  </div>`;
            }).join('') + '</div>';
    }
}

// ─── Extra rows (préstamos + prima) ──────────────────────────
function injectExtraRows(pS, stS) {
    const rows = document.getElementById('fi-gastos-rows');
    if (!rows) return;
    rows.querySelectorAll('.fi-extra').forEach(r => r.remove());
    const s = gs();
    if (!s) return;
    const loanPay = s.fd_loanPayment || 0;
    const bonus   = s.fd_bonus       || 0;
    const loans   = (s.fd_loans||[]).filter(l=>l.weeksLeft>0);
    if (loanPay > 0) {
        const r = document.createElement('div');
        r.className = 'fi-row fi-extra';
        r.innerHTML = `
          <div class="fi-row-left">
            <div class="fi-row-name">🏦 Cuotas préstamos</div>
            <div class="fi-row-sub">${loans.length} préstamo${loans.length!==1?'s':''} activo${loans.length!==1?'s':''}</div>
          </div>
          <div class="fi-row-val red">${fmt(loanPay)}€/sem</div>`;
        rows.appendChild(r);
    }
    if (bonus > 0) {
        const r = document.createElement('div');
        r.className = 'fi-row fi-extra';
        r.innerHTML = `
          <div class="fi-row-left">
            <div class="fi-row-name">💰 Prima jugadores</div>
            <div class="fi-row-sub">Próximo partido — ya descontada del balance</div>
          </div>
          <div class="fi-row-val gold">${fmt(bonus)}€</div>`;
        rows.appendChild(r);
    }
    const realTot = pS + stS + loanPay;
    setText('fin_totExp', fmt(realTot) + '€/sem');
}

// ─── Parchear injector-finances ──────────────────────────────
function patch() {
    const check = setInterval(() => {
        if (typeof window._financeRefresh !== 'function') return;
        clearInterval(check);

        window._financeRefresh      = refreshFinancePanelNew;
        window.updateFinanceDisplay = refreshFinancePanelNew;

        if (!window._fiOpenHooked) {
            window._fiOpenHooked = true;
            const orig = window.openPage;
            if (orig) window.openPage = function(page, ...args) {
                orig.call(this, page, ...args);
                if (page === 'finance') {
                    buildFinancePanelNew();
                    setTimeout(refreshFinancePanelNew, 50);
                }
            };
        }

        // Si ya está el panel abierto, rediseñar
        const c = document.getElementById('finance');
        if (c && c.classList.contains('active')) {
            buildFinancePanelNew();
            setTimeout(refreshFinancePanelNew, 50);
        }
        console.log('[FinanceUI v3] ✅ Reemplazado');
    }, 200);
}

function init() {
    if (!window.gameLogic) { setTimeout(init, 400); return; }
    patch();
}

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
