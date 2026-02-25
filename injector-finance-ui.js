
// ============================================================
// injector-finance-ui.js  v2.0
// Reemplaza buildFinancePanel + refreshFinancePanel con diseño
// de dashboard financiero profesional
// ============================================================
(function () {
'use strict';

const gl  = () => window.gameLogic;
const gs  = () => gl()?.getGameState();
const fmt = n => Math.round(n || 0).toLocaleString('es-ES');

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&family=Share+Tech+Mono&display=swap');

/* ── BASE ──────────────────────────────────────────────────── */
#finance {
  background: #080c14 !important;
  font-family: 'Barlow', sans-serif !important;
  color: #c8d0e0 !important;
  padding: 0 !important;
  min-height: 100vh;
}

/* ── HEADER ─────────────────────────────────────────────────── */
.fui-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  background: linear-gradient(180deg, #0d1220 0%, #080c14 100%);
  border-bottom: 1px solid rgba(100,180,255,.1);
  position: sticky; top: 0; z-index: 20;
}
.fui-header h1 {
  font-family: 'Barlow Condensed', sans-serif !important;
  font-size: 1.6em !important;
  font-weight: 800 !important;
  letter-spacing: 4px !important;
  text-transform: uppercase !important;
  color: #fff !important;
  margin: 0 !important;
}
.fui-header h1 span { color: #38bdf8; }
.fui-close {
  background: rgba(255,255,255,.07) !important;
  border: 1px solid rgba(255,255,255,.12) !important;
  color: #888 !important;
  border-radius: 8px !important;
  padding: 8px 18px !important;
  font-size: .85em !important;
  letter-spacing: 1px !important;
  cursor: pointer !important;
  font-family: 'Barlow Condensed', sans-serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  transition: all .2s !important;
}
.fui-close:hover { background: rgba(255,255,255,.14) !important; color: #eee !important; }

/* ── BALANCE HERO ───────────────────────────────────────────── */
.fui-hero {
  padding: 32px 24px 28px;
  background: linear-gradient(135deg, #0b1628 0%, #0d1a2e 100%);
  border-bottom: 1px solid rgba(56,189,248,.12);
  position: relative;
  overflow: hidden;
}
.fui-hero::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(56,189,248,.07) 0%, transparent 65%);
  border-radius: 50%;
  pointer-events: none;
}
.fui-hero::after {
  content: '€';
  position: absolute;
  right: 24px; bottom: -10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 8em;
  font-weight: 800;
  color: rgba(56,189,248,.04);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}
.fui-hero-label {
  font-size: .72em;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #38bdf8;
  margin-bottom: 8px;
  font-weight: 600;
}
#fin_balance {
  font-family: 'Share Tech Mono', monospace !important;
  font-size: 3.2em !important;
  font-weight: 400 !important;
  line-height: 1 !important;
  letter-spacing: -1px !important;
  color: #fff !important;
  margin-bottom: 4px !important;
}
#fin_balance.neg { color: #f87171 !important; }
.fui-hero-sub {
  font-size: .8em;
  color: #4a5568;
  letter-spacing: 1px;
}

/* ── KPI STRIP ──────────────────────────────────────────────── */
.fui-kpi-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.fui-kpi {
  padding: 16px 20px;
  border-right: 1px solid rgba(255,255,255,.05);
  position: relative;
}
.fui-kpi:last-child { border-right: none; }
.fui-kpi-label {
  font-size: .67em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #3a4a5e;
  margin-bottom: 5px;
  font-weight: 600;
}
.fui-kpi-value {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.25em;
  color: #e0e8f0;
}
.fui-kpi-value.up   { color: #4ade80; }
.fui-kpi-value.down { color: #f87171; }
.fui-kpi-value.gold { color: #fbbf24; }

/* ── TABS ───────────────────────────────────────────────────── */
.fui-tabs {
  display: flex;
  background: #0a0f1a;
  border-bottom: 1px solid rgba(255,255,255,.06);
  overflow-x: auto;
  scrollbar-width: none;
  position: sticky;
  top: 62px;
  z-index: 19;
}
.fui-tabs::-webkit-scrollbar { display: none; }
.fui-tab {
  flex-shrink: 0;
  padding: 14px 22px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: .9em;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #3a4a5e;
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 3px solid transparent;
  transition: all .2s;
  white-space: nowrap;
}
.fui-tab:hover { color: #7aa8cc; }
.fui-tab.active { color: #38bdf8; border-bottom-color: #38bdf8; }

/* ── TAB PANELS ─────────────────────────────────────────────── */
.fui-panel { display: none; padding: 24px; }
.fui-panel.active { display: block; }

/* ── SECTION HEADING ────────────────────────────────────────── */
.fui-sh {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: .75em;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #2a3a50;
  margin: 28px 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.fui-sh:first-child { margin-top: 0; }
.fui-sh::before { content: ''; display: block; width: 3px; height: 14px; background: #38bdf8; border-radius: 2px; }

/* ── STAT ROW ───────────────────────────────────────────────── */
.fui-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.fui-stat:last-child { border-bottom: none; }
.fui-stat-left { display: flex; flex-direction: column; gap: 2px; }
.fui-stat-name {
  font-size: 1em;
  font-weight: 500;
  color: #8a9ab0;
}
.fui-stat-detail { font-size: .78em; color: #2d3a4a; }
.fui-stat-val {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.1em;
  text-align: right;
}
.fui-stat-val.up    { color: #4ade80; }
.fui-stat-val.down  { color: #f87171; }
.fui-stat-val.gold  { color: #fbbf24; }
.fui-stat-val.muted { color: #3a4a5e; }

/* ── RESULT BANNER ──────────────────────────────────────────── */
.fui-result {
  margin: 14px 0;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
}
.fui-result.up {
  background: rgba(74,222,128,.06);
  border-color: rgba(74,222,128,.2);
}
.fui-result.down {
  background: rgba(248,113,113,.06);
  border-color: rgba(248,113,113,.2);
}
.fui-result.neutral {
  background: rgba(255,255,255,.03);
  border-color: rgba(255,255,255,.06);
}
.fui-result-label {
  font-size: .72em;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #4a5a6e;
  margin-bottom: 5px;
}
.fui-result-val {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.8em;
}
.fui-result-val.up   { color: #4ade80; }
.fui-result-val.down { color: #f87171; }

/* ── AWAY WARNING ───────────────────────────────────────────── */
.fui-away {
  background: rgba(251,191,36,.06);
  border: 1px solid rgba(251,191,36,.2);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: .88em;
  color: #fbbf24;
  margin-bottom: 18px;
  display: none;
}

/* ── SLIDERS ─────────────────────────────────────────────────── */
.fui-sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px; }
.fui-slider-card {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px;
  padding: 16px;
  transition: border-color .2s;
}
.fui-slider-card:hover { border-color: rgba(56,189,248,.2); }
.fui-slider-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.fui-slider-head span {
  font-size: .75em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #3a4a5e;
  font-weight: 600;
}
.fui-slider-head strong {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.1em;
  color: #38bdf8;
}
input[type=range].fui-range {
  width: 100%;
  -webkit-appearance: none;
  height: 4px;
  background: rgba(56,189,248,.15);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
input[type=range].fui-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px rgba(56,189,248,.5);
  cursor: pointer;
  transition: transform .15s;
}
input[type=range].fui-range::-webkit-slider-thumb:hover { transform: scale(1.2); }

/* ── EXPENSE BLOCK ──────────────────────────────────────────── */
.fui-expense-block {
  background: rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 12px;
  padding: 6px 16px;
  margin-bottom: 10px;
}
.fui-total-band {
  background: rgba(248,113,113,.08);
  border: 1px solid rgba(248,113,113,.2);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.fui-total-band .lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: .72em;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #6a3a3a;
  font-weight: 700;
}
.fui-total-band .val {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.3em;
  color: #f87171;
}

/* ── MARKET GRID ────────────────────────────────────────────── */
.fui-mkt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.fui-mkt-card {
  background: rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 12px;
  padding: 14px 16px;
}
.fui-mkt-card .lbl {
  font-size: .7em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #2d3a4a;
  margin-bottom: 6px;
  font-weight: 600;
}
.fui-mkt-card .val {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.2em;
}

/* ── MOVEMENT LIST ──────────────────────────────────────────── */
.fui-mov {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,.04);
  gap: 12px;
}
.fui-mov:last-child { border-bottom: none; }
.fui-mov-left { display: flex; flex-direction: column; gap: 3px; }
.fui-mov-desc { font-size: .92em; color: #8a9ab0; }
.fui-mov-week { font-size: .75em; color: #2d3a4a; }
.fui-mov-amt {
  font-family: 'Share Tech Mono', monospace;
  font-size: .95em;
  white-space: nowrap;
  flex-shrink: 0;
}
`;

// ─── HTML TEMPLATE ────────────────────────────────────────────
function buildHTML() {
return `
<style id="fui-css">${CSS}</style>

<div class="fui-header">
  <h1>📊 <span>CAJA</span> &amp; FINANZAS</h1>
  <button class="fui-close" onclick="closePage('finance')">✖ CERRAR</button>
</div>

<div class="fui-hero">
  <div class="fui-hero-label">Balance en caja</div>
  <div id="fin_balance">0€</div>
  <div class="fui-hero-sub" id="fui-hero-sub">Cargando...</div>
</div>

<div class="fui-kpi-strip">
  <div class="fui-kpi">
    <div class="fui-kpi-label">Ingresos sem.</div>
    <div class="fui-kpi-value up" id="fui-kpi-inc">—</div>
  </div>
  <div class="fui-kpi">
    <div class="fui-kpi-label">Gastos sem.</div>
    <div class="fui-kpi-value down" id="fui-kpi-exp">—</div>
  </div>
  <div class="fui-kpi">
    <div class="fui-kpi-label">Neto sem.</div>
    <div class="fui-kpi-value" id="fui-kpi-net">—</div>
  </div>
</div>

<div class="fui-tabs">
  <button class="fui-tab active" onclick="window._fuiTab('semana')">📅 Semana</button>
  <button class="fui-tab"        onclick="window._fuiTab('gastos')">💸 Gastos</button>
  <button class="fui-tab"        onclick="window._fuiTab('mercado')">🔄 Mercado</button>
  <button class="fui-tab"        onclick="window._fuiTab('historial')">📋 Historial</button>
</div>

<!-- ─── TAB SEMANA ───────────────────────────────────────── -->
<div class="fui-panel active" id="fui-p-semana">

  <div class="fui-sh">Última jornada <span id="fin_lastLabel" style="color:#38bdf8;font-size:1.1em;letter-spacing:1px;text-transform:none;font-family:'Barlow',sans-serif;font-weight:400;margin-left:6px;"></span></div>

  <div class="fui-expense-block">
    <div class="fui-stat">
      <div class="fui-stat-left">
        <div class="fui-stat-name">🎟️ Taquilla</div>
        <div class="fui-stat-detail" id="fin_lTicketD">—</div>
      </div>
      <div id="fin_lTicket" class="fui-stat-val up">—</div>
    </div>
    <div class="fui-stat">
      <div class="fui-stat-left">
        <div class="fui-stat-name">🛍️ Merchandising</div>
        <div class="fui-stat-detail" id="fin_lMerchD">—</div>
      </div>
      <div id="fin_lMerch" class="fui-stat-val up">—</div>
    </div>
    <div class="fui-stat">
      <div class="fui-stat-name">📺 TV &amp; Patrocinios</div>
      <div id="fin_lBase" class="fui-stat-val gold">—</div>
    </div>
    <div class="fui-stat" style="border-bottom:none;">
      <div class="fui-stat-name" style="color:#5a6a7e;">💸 Gastos pagados</div>
      <div id="fin_lExp" class="fui-stat-val down">—</div>
    </div>
  </div>

  <div class="fui-result neutral" id="fui-lnet-wrap">
    <div>
      <div class="fui-result-label">Resultado neto jornada</div>
      <div id="fin_lNet" class="fui-result-val">—</div>
    </div>
    <div style="font-size:2.5em;opacity:.15;font-family:'Barlow Condensed',sans-serif;font-weight:800;">NET</div>
  </div>

  <div class="fui-sh" style="margin-top:28px;">Proyección próxima jornada <span id="fin_nextLabel" style="color:#fbbf24;font-size:1em;letter-spacing:1px;text-transform:none;font-family:'Barlow',sans-serif;font-weight:400;margin-left:6px;"></span></div>

  <div id="fin_awayWarning" class="fui-away">✈️ Partido visitante — sin ingresos de taquilla ni merchandising</div>

  <div class="fui-expense-block">
    <div class="fui-stat">
      <div class="fui-stat-left">
        <div class="fui-stat-name">🎟️ Taquilla estimada</div>
        <div class="fui-stat-detail" id="fin_pTicketD">—</div>
      </div>
      <div id="fin_pTicket" class="fui-stat-val up">0€</div>
    </div>
    <div class="fui-stat">
      <div class="fui-stat-left">
        <div class="fui-stat-name">🛍️ Merch estimado</div>
        <div class="fui-stat-detail" id="fin_pMerchD">—</div>
      </div>
      <div id="fin_pMerch" class="fui-stat-val up">0€</div>
    </div>
    <div class="fui-stat" style="border-bottom:none;">
      <div class="fui-stat-name">📺 TV &amp; Patrocinios</div>
      <div id="fin_pBase" class="fui-stat-val gold">0€</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;">
    <div class="fui-result up" style="margin:0;padding:14px 16px;">
      <div>
        <div class="fui-result-label">Total ingresos</div>
        <div id="fin_pTotI" class="fui-result-val up" style="font-size:1.4em;">0€</div>
      </div>
    </div>
    <div class="fui-result down" style="margin:0;padding:14px 16px;">
      <div>
        <div class="fui-result-label">Total gastos</div>
        <div id="fin_pExp" class="fui-result-val down" style="font-size:1.4em;">0€</div>
      </div>
    </div>
  </div>

  <div class="fui-result neutral" id="fui-pnet-wrap">
    <div>
      <div class="fui-result-label">Resultado estimado</div>
      <div id="fin_pNet" class="fui-result-val">0€</div>
    </div>
    <div style="font-size:2.5em;opacity:.15;font-family:'Barlow Condensed',sans-serif;font-weight:800;">EST</div>
  </div>

  <div class="fui-sh" style="margin-top:28px;">Precios</div>
  <div class="fui-sliders">
    <div class="fui-slider-card">
      <div class="fui-slider-head">
        <span>Entrada</span>
        <strong id="fin_tpVal">20€</strong>
      </div>
      <input type="range" id="fin_tpSlider" min="5" max="100" value="20" class="fui-range"
        oninput="document.getElementById('fin_tpVal').textContent=this.value+'€';window._financePreviewProj('ticket',this.value);"
        onchange="window.setTicketPriceFromSlider&&window.setTicketPriceFromSlider(this.value);">
      <div style="display:flex;justify-content:space-between;font-size:.7em;color:#2d3a4a;margin-top:6px;"><span>5€</span><span>100€</span></div>
    </div>
    <div class="fui-slider-card">
      <div class="fui-slider-head">
        <span>Merchandising</span>
        <strong id="fin_mpVal">10€</strong>
      </div>
      <input type="range" id="fin_mpSlider" min="1" max="50" value="10" class="fui-range"
        oninput="document.getElementById('fin_mpVal').textContent=this.value+'€';window._financePreviewProj('merch',this.value);"
        onchange="window.setMerchandisingPriceFromSlider&&window.setMerchandisingPriceFromSlider(this.value);">
      <div style="display:flex;justify-content:space-between;font-size:.7em;color:#2d3a4a;margin-top:6px;"><span>1€</span><span>50€</span></div>
    </div>
  </div>
</div>

<!-- ─── TAB GASTOS ────────────────────────────────────────── -->
<div class="fui-panel" id="fui-p-gastos">
  <div class="fui-sh">Gastos recurrentes semanales</div>
  <div class="fui-expense-block" id="fui-gastos-block">
    <div class="fui-stat">
      <div class="fui-stat-left">
        <div class="fui-stat-name">⚽ Salarios plantilla</div>
        <div class="fui-stat-detail" id="fin_pCnt">—</div>
      </div>
      <div id="fin_pSal" class="fui-stat-val down">0€/sem</div>
    </div>
    <div class="fui-stat" style="border-bottom:none;">
      <div class="fui-stat-left">
        <div class="fui-stat-name">👔 Salarios staff</div>
        <div class="fui-stat-detail" id="fin_sCnt">—</div>
      </div>
      <div id="fin_sSal" class="fui-stat-val down">0€/sem</div>
    </div>
    <!-- cuotas y prima se inyectan aquí -->
  </div>
  <div class="fui-total-band">
    <span class="lbl">Total semanal</span>
    <span id="fin_totExp" class="val">0€/sem</span>
  </div>

  <div class="fui-sh" style="margin-top:28px;">Inversiones en instalaciones</div>
  <div class="fui-expense-block">
    <div class="fui-stat">
      <div class="fui-stat-left">
        <div class="fui-stat-name">🏟️ Estadio</div>
        <div class="fui-stat-detail" id="fin_rStaCap">—</div>
      </div>
      <div id="fin_rSta" class="fui-stat-val down">0€</div>
    </div>
    <div class="fui-stat" style="border-bottom:none;">
      <div class="fui-stat-left">
        <div class="fui-stat-name">🏋️ Centro entrenamiento</div>
        <div class="fui-stat-detail" id="fin_rTraLvl">—</div>
      </div>
      <div id="fin_rTra" class="fui-stat-val down">0€</div>
    </div>
  </div>
  <div class="fui-total-band">
    <span class="lbl">Total inversiones</span>
    <span id="fin_rTot" class="val">0€</span>
  </div>
  <div id="fin_rList" style="margin-top:14px;font-size:.85em;color:#2d3a4a;font-style:italic;"></div>
</div>

<!-- ─── TAB MERCADO ───────────────────────────────────────── -->
<div class="fui-panel" id="fui-p-mercado">
  <div class="fui-sh">Balance de mercado — temporada</div>
  <div class="fui-mkt-grid">
    <div class="fui-mkt-card">
      <div class="lbl">💸 Fichajes</div>
      <div id="fin_mPur" class="val" style="color:#f87171;">0€</div>
    </div>
    <div class="fui-mkt-card">
      <div class="lbl">💰 Ingresos ventas</div>
      <div id="fin_mSal" class="val" style="color:#4ade80;">0€</div>
    </div>
    <div class="fui-mkt-card">
      <div class="lbl">🚪 Indemnizaciones</div>
      <div id="fin_mCom" class="val" style="color:#f87171;">0€</div>
    </div>
    <div class="fui-mkt-card">
      <div class="lbl">👔 Cláusulas staff</div>
      <div id="fin_mStf" class="val" style="color:#f87171;">0€</div>
    </div>
  </div>
  <div class="fui-result neutral" id="fui-mbal-wrap">
    <div>
      <div class="fui-result-label">Balance neto de mercado</div>
      <div id="fin_mBal" class="fui-result-val">0€</div>
    </div>
    <div style="font-size:2.5em;opacity:.15;font-family:'Barlow Condensed',sans-serif;font-weight:800;">MKT</div>
  </div>
</div>

<!-- ─── TAB HISTORIAL ─────────────────────────────────────── -->
<div class="fui-panel" id="fui-p-historial">
  <div class="fui-sh">Movimientos de temporada</div>
  <div id="fin_mList">
    <span style="color:#2d3a4a;">Sin movimientos registrados esta temporada.</span>
  </div>
</div>
`;
}

// ─── setText helper ───────────────────────────────────────────
function setText(id, text, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
}

function setColor(id, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = el.className.replace(/\b(up|down|gold|muted)\b/g, '') + ' ' + cls;
}

// ─── Tab switcher ─────────────────────────────────────────────
window._fuiTab = function(tab) {
    document.querySelectorAll('.fui-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.fui-tab').forEach((t,i) => {
        const tabs = ['semana','gastos','mercado','historial'];
        t.classList.toggle('active', tabs[i] === tab);
    });
    const p = document.getElementById('fui-p-' + tab);
    if (p) p.classList.add('active');
};

// ─── updateNetCard: cambia clase del banner resultado ─────────
function updateNetCard(wrapperId, valId) {
    const val = document.getElementById(valId)?.textContent || '—';
    const wrap = document.getElementById(wrapperId);
    if (!wrap) return;
    const pos = val.startsWith('+') || (val !== '—' && !val.startsWith('-') && val !== '0€');
    const neg = val.startsWith('-');
    wrap.className = 'fui-result ' + (pos ? 'up' : neg ? 'down' : 'neutral');
    const valEl = document.getElementById(valId);
    if (valEl) valEl.className = 'fui-result-val ' + (pos ? 'up' : neg ? 'down' : '');
}

// ─── NEW buildFinancePanel ────────────────────────────────────
function buildFinancePanelNew() {
    const container = document.getElementById('finance');
    if (!container) return;
    container.innerHTML = buildHTML();
    console.log('[FinanceUI] Panel construido ✓');
}

// ─── NEW refreshFinancePanel ──────────────────────────────────
function refreshFinancePanelNew() {
    if (!gl()) return;
    const state = gs();
    if (!state || !state.team) return;

    // Balance
    const bal = state.balance || 0;
    const balEl = document.getElementById('fin_balance');
    if (balEl) {
        balEl.textContent = fmt(bal) + '€';
        balEl.className = bal < 0 ? 'neg' : '';
    }

    // Hero sub
    const sub = document.getElementById('fui-hero-sub');
    if (sub) sub.textContent = `${state.team} · Temporada ${state.currentSeason || '—'}`;

    // ── Última jornada ────────────────────────────────────────
    const lw = state.lastWeekFinance;
    if (lw) {
        const locLabel = lw.home ? '🏟️ Local' : '✈️ Visitante';
        setText('fin_lastLabel', `Semana ${lw.week} — ${locLabel}`);
        setText('fin_lTicket',   fmt(lw.ticketInc) + '€', lw.ticketInc > 0 ? '#4ade80' : '#3a4a5e');
        setText('fin_lTicketD',  lw.home ? `${fmt(lw.att)} espectadores` : 'Partido visitante');
        setText('fin_lMerch',    fmt(lw.merchInc)  + '€', lw.merchInc  > 0 ? '#4ade80' : '#3a4a5e');
        setText('fin_lMerchD',   lw.home ? `${fmt(lw.items)} unidades` : 'Partido visitante');
        setText('fin_lBase',     fmt(lw.baseInc)   + '€');
        setText('fin_lTotI',     fmt(lw.totalInc)  + '€');
        setText('fin_lExp',      fmt(lw.totalExp)  + '€');
        const net = lw.net;
        setText('fin_lNet', (net >= 0 ? '+' : '') + fmt(net) + '€');
        // KPI strip
        setText('fui-kpi-inc', fmt(lw.totalInc) + '€');
        setText('fui-kpi-exp', fmt(lw.totalExp) + '€');
        const kpiNet = document.getElementById('fui-kpi-net');
        if (kpiNet) {
            kpiNet.textContent = (net >= 0 ? '+' : '') + fmt(net) + '€';
            kpiNet.className = 'fui-kpi-value ' + (net >= 0 ? 'up' : 'down');
        }
        updateNetCard('fui-lnet-wrap', 'fin_lNet');
    } else {
        setText('fin_lastLabel', 'sin jornadas jugadas todavía');
    }

    // ── Proyección ────────────────────────────────────────────
    const isHome = (() => {
        try {
            const s = state;
            const jornada = s.week || 1;
            const schedule = s.schedule || [];
            const next = schedule.find(m => m.week === jornada + 1) || schedule.find(m => !m.played);
            if (!next) return null;
            return next.home === true || next.homeTeam === s.team;
        } catch(e) { return null; }
    })();
    const isAway = isHome === false;
    const tp   = state.ticketPrice || 20;
    const mp   = state.merchandisingPrice || 10;
    const cap  = state.stadiumCapacity || 5000;
    const pop  = (state.popularity || 50) / 100;
    const att  = Math.min(cap, Math.round(cap * pop * (1 - (tp - 20) / 200)));
    const tI   = isAway ? 0 : Math.max(0, Math.floor(tp * att));
    const its  = Math.floor((state.fanbase || 1000) * ((state.popularity || 50) / 500) * 0.015);
    const mI   = isAway ? 0 : its * mp;
    const bI   = state.weeklyIncomeBase || 5000;
    const projI = tI + mI + bI;
    const pS   = (state.squad || []).reduce((s, p) => s + (p.salary || 0), 0);
    const sArr = Object.values(state.staff || {}).filter(Boolean);
    const stS  = sArr.reduce((s, x) => s + (x.salary || 0), 0);
    // Incluir cuotas préstamos si FinDeals está activo
    const loanPay = state.fd_loanPayment || 0;
    const totE = pS + stS + loanPay;
    const projN = projI - totE;

    const nLabel = isHome === true ? '🏟️ Local' : isHome === false ? '✈️ Visitante' : '—';
    setText('fin_nextLabel', nLabel);

    const aw = document.getElementById('fin_awayWarning');
    if (aw) aw.style.display = isAway ? '' : 'none';

    setText('fin_pTicket',  fmt(tI)    + '€', isAway ? '#3a4a5e' : '#4ade80');
    setText('fin_pTicketD', isAway ? 'Partido visitante' : `${fmt(att)} espectadores × ${tp}€`);
    setText('fin_pMerch',   fmt(mI)    + '€', isAway ? '#3a4a5e' : '#4ade80');
    setText('fin_pMerchD',  isAway ? 'Partido visitante' : `${fmt(its)} uds × ${mp}€`);
    setText('fin_pBase',    fmt(bI)    + '€');
    setText('fin_pTotI',    fmt(projI) + '€');
    setText('fin_pExp',     fmt(totE)  + '€');
    setText('fin_pNet',     (projN >= 0 ? '+' : '') + fmt(projN) + '€');
    updateNetCard('fui-pnet-wrap', 'fin_pNet');

    const tpSlider = document.getElementById('fin_tpSlider');
    if (tpSlider) { tpSlider.value = tp; setText('fin_tpVal', tp + '€'); }
    const mpSlider = document.getElementById('fin_mpSlider');
    if (mpSlider) { mpSlider.value = mp; setText('fin_mpVal', mp + '€'); }

    // ── Gastos recurrentes ─────────────────────────────────────
    setText('fin_pSal',  fmt(pS)   + '€/sem');
    setText('fin_pCnt',  `${state.squad?.length || 0} jugadores`);
    setText('fin_sSal',  fmt(stS)  + '€/sem');
    setText('fin_sCnt',  `${sArr.length} miembro${sArr.length !== 1 ? 's' : ''}`);
    setText('fin_totExp', fmt(totE) + '€/sem');

    // Filas dinámicas de préstamos y prima (desde injector-financial-deals)
    injectExtraExpenseRows(pS, stS);

    // ── Mercado ───────────────────────────────────────────────
    const pur  = state.playerPurchases     || 0;
    const sal  = state.playerSalesIncome   || 0;
    const com  = state.playerCompensations || 0;
    const mvs  = state.seasonMovements     || [];
    const stfC = mvs.filter(m => m.type === 'staff_hire' || m.type === 'staff_compensation')
                    .reduce((s, m) => s + Math.abs(m.amount), 0);
    const mBal = sal - pur - com - stfC;

    setText('fin_mPur', fmt(pur)   + '€', pur   > 0 ? '#f87171' : '#3a4a5e');
    setText('fin_mSal', fmt(sal)   + '€', sal   > 0 ? '#4ade80' : '#3a4a5e');
    setText('fin_mCom', fmt(com)   + '€', com   > 0 ? '#f87171' : '#3a4a5e');
    setText('fin_mStf', fmt(stfC)  + '€', stfC  > 0 ? '#f87171' : '#3a4a5e');
    setText('fin_mBal', (mBal >= 0 ? '+' : '') + fmt(mBal) + '€');
    updateNetCard('fui-mbal-wrap', 'fin_mBal');

    // ── Remodelaciones ────────────────────────────────────────
    const rens = mvs.filter(m => m.type === 'renovation');
    const sR   = rens.filter(m => /estadio|asiento/i.test(m.description)).reduce((s,m) => s + Math.abs(m.amount), 0);
    const tR   = rens.filter(m => /entrenamiento/i.test(m.description)).reduce((s,m) => s + Math.abs(m.amount), 0);
    const toR  = rens.reduce((s,m) => s + Math.abs(m.amount), 0);

    setText('fin_rSta',    fmt(sR)  + '€', sR  > 0 ? '#f87171' : '#3a4a5e');
    setText('fin_rStaCap', `Capacidad: ${fmt(state.stadiumCapacity || 0)}`);
    setText('fin_rTra',    fmt(tR)  + '€', tR  > 0 ? '#f87171' : '#3a4a5e');
    setText('fin_rTraLvl', `Nivel: ${state.trainingLevel || 1}`);
    setText('fin_rTot',    fmt(toR) + '€', toR > 0 ? '#f87171' : '#3a4a5e');

    const rListEl = document.getElementById('fin_rList');
    if (rListEl) rListEl.innerHTML = rens.length === 0
        ? '<span style="color:#2d3a4a;font-style:italic;">Sin inversiones esta temporada.</span>'
        : rens.map(r =>
            `<div class="fui-stat">
               <div class="fui-stat-name" style="font-size:.9em;">Sem ${r.week} — ${r.description}</div>
               <div class="fui-stat-val down">-${fmt(Math.abs(r.amount))}€</div>
             </div>`).join('');

    // ── Historial ─────────────────────────────────────────────
    const mListEl = document.getElementById('fin_mList');
    if (mListEl) {
        const all = mvs.filter(m => m.type !== 'renovation');
        const ic  = { purchase:'💸', sale:'💰', compensation:'🚪', staff_hire:'👔', staff_compensation:'🚫' };
        mListEl.innerHTML = all.length === 0
            ? '<span style="color:#2d3a4a;">Sin movimientos registrados esta temporada.</span>'
            : [...all].reverse().map(m => {
                const pos = m.amount > 0;
                return `<div class="fui-mov">
                    <div class="fui-mov-left">
                      <div class="fui-mov-desc">${ic[m.type] || '•'} ${m.description}</div>
                      <div class="fui-mov-week">Semana ${m.week}</div>
                    </div>
                    <div class="fui-mov-amt" style="color:${pos?'#4ade80':'#f87171'}">
                      ${pos?'+':''}${fmt(m.amount)}€
                    </div>
                  </div>`;
            }).join('');
    }
}

// ─── Inyectar filas extra de préstamos y prima ────────────────
function injectExtraExpenseRows(salaries, staffSal) {
    const block = document.getElementById('fui-gastos-block');
    if (!block) return;
    const state = gs();
    if (!state) return;

    // Eliminar filas anteriores
    block.querySelectorAll('.fui-extra-row').forEach(r => r.remove());

    const loanPay = state.fd_loanPayment || 0;
    const bonus   = state.fd_bonus       || 0;
    const loans   = (state.fd_loans     || []).filter(l => l.weeksLeft > 0);

    if (loanPay > 0) {
        const row = document.createElement('div');
        row.className = 'fui-stat fui-extra-row';
        row.innerHTML = `
          <div class="fui-stat-left">
            <div class="fui-stat-name">🏦 Cuotas préstamos</div>
            <div class="fui-stat-detail">${loans.length} préstamo${loans.length!==1?'s':''} activo${loans.length!==1?'s':''}</div>
          </div>
          <div class="fui-stat-val down">${fmt(loanPay)}€/sem</div>`;
        block.appendChild(row);
    }

    if (bonus > 0) {
        const row = document.createElement('div');
        row.className = 'fui-stat fui-extra-row';
        row.style.borderBottom = 'none';
        row.innerHTML = `
          <div class="fui-stat-left">
            <div class="fui-stat-name">💰 Prima jugadores</div>
            <div class="fui-stat-detail">Próximo partido · ya descontada</div>
          </div>
          <div class="fui-stat-val" style="color:#fbbf24;">${fmt(bonus)}€</div>`;
        block.appendChild(row);
    }

    // Actualizar el total con cuotas incluidas
    const realTotal = salaries + staffSal + loanPay;
    const totEl = document.getElementById('fin_totExp');
    if (totEl) totEl.textContent = fmt(realTotal) + '€/sem';
}

// ─── Parchear funciones de injector-finances ─────────────────
function patchFinances() {
    // Esperar a que injector-finances.js haya ejecutado
    const check = setInterval(() => {
        if (typeof window._financeRefresh === 'function') {
            clearInterval(check);

            // Reemplazar las funciones en el scope global del IIFE de finances
            // Las exponemos globalmente ya que finances las exporta a window
            window._financeRefresh      = refreshFinancePanelNew;
            window.updateFinanceDisplay = refreshFinancePanelNew;

            // Hook openPage para reconstruir cuando se abre finance
            if (!window._fuiOpenHooked) {
                window._fuiOpenHooked = true;
                const orig = window.openPage;
                if (orig) {
                    window.openPage = function(page, ...args) {
                        orig.call(this, page, ...args);
                        if (page === 'finance') {
                            buildFinancePanelNew();
                            setTimeout(refreshFinancePanelNew, 60);
                        }
                    };
                }
            }

            // Si el panel ya está construido, rediseñarlo ya
            const container = document.getElementById('finance');
            if (container && document.getElementById('fin_balance')) {
                buildFinancePanelNew();
                setTimeout(refreshFinancePanelNew, 60);
            }

            console.log('[FinanceUI] ✅ Funciones reemplazadas');
        }
    }, 200);
}

// ─── INIT ─────────────────────────────────────────────────────
function init() {
    if (!window.gameLogic) { setTimeout(init, 400); return; }
    patchFinances();
}

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
