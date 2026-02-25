// injector-finance-ui.js  v5.0  — Diseño CLARO, moderno, profesional
(function () {
'use strict';
const gl  = () => window.gameLogic;
const gs  = () => gl()?.getGameState();
const fmt = n  => Math.round(n||0).toLocaleString('es-ES');

const CSS = `
/* ── FONDO CLARO — sobreescribe .page oscuro ── */
#finance.page {
  background: #f0f4ff !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  color: #1a2340 !important;
  padding: 0 !important;
}
#finance * { text-shadow: none !important; }

/* ── HEADER ── */
.fi5-header {
  background: linear-gradient(135deg, #1a3a8f 0%, #2563eb 100%);
  padding: 16px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 20px rgba(37,99,235,.4);
}
.fi5-header h1 {
  font-size: 1.6em !important;
  font-weight: 800 !important;
  color: #fff !important;
  letter-spacing: 2px !important;
  text-transform: uppercase !important;
  margin: 0 !important;
}
.fi5-header h1 span { color: #fbbf24; }
.fi5-close {
  background: rgba(255,255,255,.15) !important;
  border: 2px solid rgba(255,255,255,.4) !important;
  color: #fff !important;
  border-radius: 8px !important;
  padding: 8px 20px !important;
  font-weight: 800 !important;
  font-size: .85em !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  transition: all .2s !important;
}
.fi5-close:hover { background: rgba(255,255,255,.3) !important; border-color: #fbbf24 !important; color: #fbbf24 !important; }

/* ── BALANCE HERO ── */
.fi5-hero {
  background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%);
  padding: 32px 28px 28px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.fi5-hero::before {
  content: '';
  position: absolute;
  top: -80px; right: -80px;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(255,255,255,.08) 0%, transparent 65%);
  border-radius: 50%;
  pointer-events: none;
}
.fi5-hero::after {
  content: '€';
  position: absolute;
  right: 20px; bottom: -15px;
  font-size: 10em;
  font-weight: 900;
  color: rgba(255,255,255,.04);
  line-height: 1;
  pointer-events: none;
}
.fi5-hero-label {
  font-size: .75em;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(255,255,255,.6);
  font-weight: 700;
  margin-bottom: 8px;
}
#fin_balance {
  font-size: 4em !important;
  font-weight: 900 !important;
  color: #fbbf24 !important;
  line-height: 1 !important;
  filter: drop-shadow(0 2px 12px rgba(251,191,36,.5));
}
#fin_balance.neg { color: #fca5a5 !important; }
.fi5-hero-sub { font-size: .82em; color: rgba(255,255,255,.45); margin-top: 8px; }

/* ── KPI STRIP ── */
.fi5-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background: #fff;
  border-bottom: 2px solid #e8eeff;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
}
.fi5-kpi {
  padding: 18px 16px;
  text-align: center;
  border-right: 1px solid #e8eeff;
  transition: background .2s;
}
.fi5-kpi:last-child { border-right: none; }
.fi5-kpi:hover { background: #f5f8ff; }
.fi5-kpi-label {
  font-size: .68em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 700;
  margin-bottom: 6px;
}
.fi5-kpi-val { font-size: 1.5em; font-weight: 800; }
.fi5-kpi-val.up   { color: #16a34a; }
.fi5-kpi-val.down { color: #dc2626; }
.fi5-kpi-val.gold { color: #d97706; }

/* ── TABS ── */
.fi5-tabs {
  display: flex;
  background: #fff;
  border-bottom: 2px solid #e2e8f0;
  overflow-x: auto;
  scrollbar-width: none;
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}
.fi5-tabs::-webkit-scrollbar { display: none; }
.fi5-tab {
  flex-shrink: 0;
  padding: 14px 24px;
  font-size: .85em;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #94a3b8;
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 3px solid transparent;
  transition: all .2s;
  white-space: nowrap;
}
.fi5-tab:hover { color: #3b82f6; }
.fi5-tab.active { color: #1d4ed8; border-bottom-color: #1d4ed8; background: #f0f6ff; }

/* ── PANELS ── */
.fi5-panel { display: none; padding: 24px 28px 50px; }
.fi5-panel.active { display: block; }

/* ── SECTION TITLE ── */
.fi5-sec {
  font-size: .72em;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #1d4ed8;
  margin: 28px 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.fi5-sec:first-child { margin-top: 0; }
.fi5-sec::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, #bfdbfe, transparent); border-radius: 2px; }

/* ── STAT CARDS GRID ── */
.fi5-grid { display: grid; gap: 14px; margin-bottom: 16px; }
.fi5-grid.g2 { grid-template-columns: 1fr 1fr; }
.fi5-grid.g3 { grid-template-columns: 1fr 1fr 1fr; }

.fi5-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.05);
  border: 1px solid #e8eeff;
  transition: transform .15s, box-shadow .15s;
}
.fi5-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.1); }
.fi5-card-label {
  font-size: .72em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 700;
  margin-bottom: 8px;
}
.fi5-card-val { font-size: 1.7em; font-weight: 800; color: #1e293b; }
.fi5-card-val.up   { color: #16a34a; }
.fi5-card-val.down { color: #dc2626; }
.fi5-card-val.gold { color: #d97706; }
.fi5-card-sub { font-size: .75em; color: #94a3b8; margin-top: 4px; }
.fi5-card-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2em;
  margin-bottom: 10px;
}
.fi5-card-icon.green { background: #dcfce7; }
.fi5-card-icon.red   { background: #fee2e2; }
.fi5-card-icon.gold  { background: #fef9c3; }
.fi5-card-icon.blue  { background: #dbeafe; }

/* ── RESULT BANNER ── */
.fi5-result {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,.07);
  border: 2px solid #e8eeff;
}
.fi5-result.up   { border-color: #86efac; background: linear-gradient(135deg, #f0fdf4, #fff); }
.fi5-result.down { border-color: #fca5a5; background: linear-gradient(135deg, #fff5f5, #fff); }
.fi5-result-label {
  font-size: .72em; letter-spacing: 3px; text-transform: uppercase;
  color: #94a3b8; font-weight: 700; margin-bottom: 6px;
}
.fi5-result-val { font-size: 2.2em; font-weight: 900; color: #1e293b; }
.fi5-result-val.up   { color: #16a34a; }
.fi5-result-val.down { color: #dc2626; }
.fi5-result-badge {
  font-size: 3em; font-weight: 900; color: #e2e8f0;
  letter-spacing: -3px; line-height: 1;
}
.fi5-result.up   .fi5-result-badge { color: #bbf7d0; }
.fi5-result.down .fi5-result-badge { color: #fecaca; }

/* ── EXPENSE LIST ── */
.fi5-list {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  border: 1px solid #e8eeff;
  margin-bottom: 14px;
}
.fi5-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  transition: background .15s;
}
.fi5-row:last-child { border-bottom: none; }
.fi5-row:hover { background: #f8faff; }
.fi5-row-label { font-size: .95em; font-weight: 600; color: #374151; }
.fi5-row-sub   { font-size: .75em; color: #94a3b8; margin-top: 2px; }
.fi5-row-val   { font-size: 1.05em; font-weight: 700; }
.fi5-row-val.red  { color: #dc2626; }
.fi5-row-val.gold { color: #d97706; }

/* ── TOTAL BAND ── */
.fi5-total {
  background: linear-gradient(135deg, #fef2f2, #fff5f5);
  border: 2px solid #fca5a5;
  border-radius: 12px;
  padding: 16px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.fi5-total-label { font-size: .75em; letter-spacing: 3px; text-transform: uppercase; color: #ef4444; font-weight: 700; }
.fi5-total-val   { font-size: 1.6em; font-weight: 900; color: #dc2626; }

/* ── AWAY WARNING ── */
.fi5-away {
  background: #fffbeb;
  border: 2px solid #fde68a;
  border-radius: 10px;
  padding: 12px 18px;
  font-size: .9em;
  color: #92400e;
  margin-bottom: 16px;
  display: none;
  font-weight: 600;
}

/* ── SLIDERS ── */
.fi5-sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.fi5-slider {
  background: #fff;
  border: 1px solid #e8eeff;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
}
.fi5-slider-top {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
}
.fi5-slider-top span { font-size: .78em; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
.fi5-slider-top strong { font-size: 1.3em; font-weight: 900; color: #1d4ed8; }
input[type=range].fi5-range {
  width: 100%; -webkit-appearance: none; height: 6px;
  background: #dbeafe; border-radius: 3px; outline: none; cursor: pointer;
}
input[type=range].fi5-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
  background: #1d4ed8; box-shadow: 0 2px 8px rgba(29,78,216,.5);
  cursor: pointer; transition: transform .15s;
}
input[type=range].fi5-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
.fi5-range-limits { display: flex; justify-content: space-between; font-size: .7em; color: #cbd5e1; margin-top: 6px; }

/* ── MARKET ── */
.fi5-mkt { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.fi5-mkt-card {
  background: #fff; border-radius: 12px; padding: 16px 18px;
  border: 1px solid #e8eeff; box-shadow: 0 2px 8px rgba(0,0,0,.05);
}
.fi5-mkt-card .lbl { font-size: .7em; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 7px; }
.fi5-mkt-card .val { font-size: 1.35em; font-weight: 800; }

/* ── HISTORY ── */
.fi5-hist {
  background: #fff; border-radius: 14px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.06); border: 1px solid #e8eeff;
}
.fi5-hist-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 13px 20px; border-bottom: 1px solid #f1f5f9; transition: background .15s;
}
.fi5-hist-row:hover { background: #f8faff; }
.fi5-hist-desc { font-size: .9em; color: #475569; font-weight: 500; }
.fi5-hist-week { font-size: .74em; color: #94a3b8; margin-top: 2px; }
.fi5-hist-amt  { font-size: 1em; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
`;

function buildHTML() { return `
<style id="fi5-css">${CSS}</style>

<div class="fi5-header">
  <h1>💰 CAJA <span>&amp;</span> FINANZAS</h1>
  <button class="fi5-close" onclick="closePage('finance')">✖ CERRAR</button>
</div>

<div class="fi5-hero">
  <div class="fi5-hero-label">Balance en caja</div>
  <div id="fin_balance">0€</div>
  <div class="fi5-hero-sub" id="fi5-sub">Cargando...</div>
</div>

<div class="fi5-kpis">
  <div class="fi5-kpi"><div class="fi5-kpi-label">⬆ Ingresos sem.</div><div class="fi5-kpi-val up" id="fi5-ki">—</div></div>
  <div class="fi5-kpi"><div class="fi5-kpi-label">⬇ Gastos sem.</div><div class="fi5-kpi-val down" id="fi5-ke">—</div></div>
  <div class="fi5-kpi"><div class="fi5-kpi-label">◈ Neto sem.</div><div class="fi5-kpi-val gold" id="fi5-kn">—</div></div>
</div>

<div class="fi5-tabs">
  <button class="fi5-tab active" onclick="window._fi5tab('semana')">📅 Semana</button>
  <button class="fi5-tab"        onclick="window._fi5tab('gastos')">💸 Gastos</button>
  <button class="fi5-tab"        onclick="window._fi5tab('mercado')">🔄 Mercado</button>
  <button class="fi5-tab"        onclick="window._fi5tab('historial')">📋 Historial</button>
</div>

<!-- SEMANA -->
<div class="fi5-panel active" id="fi5-p-semana">
  <div class="fi5-sec">Última jornada — <span id="fin_lastLabel" style="font-size:1.1em;letter-spacing:0;text-transform:none;font-weight:600;color:#3b82f6;"></span></div>
  <div class="fi5-grid g3">
    <div class="fi5-card"><div class="fi5-card-icon green">🎟️</div><div class="fi5-card-label">Taquilla</div><div id="fin_lTicket" class="fi5-card-val up">—</div><div id="fin_lTicketD" class="fi5-card-sub">—</div></div>
    <div class="fi5-card"><div class="fi5-card-icon green">🛍️</div><div class="fi5-card-label">Merchandising</div><div id="fin_lMerch" class="fi5-card-val up">—</div><div id="fin_lMerchD" class="fi5-card-sub">—</div></div>
    <div class="fi5-card"><div class="fi5-card-icon gold">📺</div><div class="fi5-card-label">TV &amp; Patrocinios</div><div id="fin_lBase" class="fi5-card-val gold">—</div></div>
  </div>
  <div class="fi5-grid g2">
    <div class="fi5-result up" style="margin-bottom:0;"><div><div class="fi5-result-label">Total ingresos</div><div id="fin_lTotI" class="fi5-result-val up" style="font-size:1.8em;">—</div></div><div class="fi5-result-badge">IN</div></div>
    <div class="fi5-result down" style="margin-bottom:0;"><div><div class="fi5-result-label">Gastos pagados</div><div id="fin_lExp" class="fi5-result-val down" style="font-size:1.8em;">—</div></div><div class="fi5-result-badge">OUT</div></div>
  </div>
  <div style="margin-top:14px;" class="fi5-result" id="fi5-lnet"><div><div class="fi5-result-label">Resultado neto jornada</div><div id="fin_lNet" class="fi5-result-val">—</div></div><div class="fi5-result-badge">NET</div></div>

  <div class="fi5-sec" style="margin-top:28px;">Proyección próxima jornada — <span id="fin_nextLabel" style="font-size:1.1em;letter-spacing:0;text-transform:none;font-weight:600;color:#f59e0b;"></span></div>
  <div id="fin_awayWarning" class="fi5-away">✈️ Partido visitante — sin ingresos de taquilla ni merchandising esta jornada</div>
  <div class="fi5-grid g3">
    <div class="fi5-card"><div class="fi5-card-icon green">🎟️</div><div class="fi5-card-label">Taquilla est.</div><div id="fin_pTicket" class="fi5-card-val up">0€</div><div id="fin_pTicketD" class="fi5-card-sub">—</div></div>
    <div class="fi5-card"><div class="fi5-card-icon green">🛍️</div><div class="fi5-card-label">Merch est.</div><div id="fin_pMerch" class="fi5-card-val up">0€</div><div id="fin_pMerchD" class="fi5-card-sub">—</div></div>
    <div class="fi5-card"><div class="fi5-card-icon gold">📺</div><div class="fi5-card-label">TV &amp; Patrocinios</div><div id="fin_pBase" class="fi5-card-val gold">0€</div></div>
  </div>
  <div class="fi5-grid g2">
    <div class="fi5-result up" style="margin-bottom:0;"><div><div class="fi5-result-label">Total ingresos est.</div><div id="fin_pTotI" class="fi5-result-val up" style="font-size:1.8em;">0€</div></div><div class="fi5-result-badge">IN</div></div>
    <div class="fi5-result down" style="margin-bottom:0;"><div><div class="fi5-result-label">Gastos recurrentes</div><div id="fin_pExp" class="fi5-result-val down" style="font-size:1.8em;">0€</div></div><div class="fi5-result-badge">OUT</div></div>
  </div>
  <div style="margin-top:14px;" class="fi5-result" id="fi5-pnet"><div><div class="fi5-result-label">Resultado estimado</div><div id="fin_pNet" class="fi5-result-val">0€</div></div><div class="fi5-result-badge">EST</div></div>

  <div class="fi5-sec" style="margin-top:28px;">🎛️ Ajuste de precios</div>
  <div class="fi5-sliders">
    <div class="fi5-slider">
      <div class="fi5-slider-top"><span>Precio entrada</span><strong id="fin_tpVal">20€</strong></div>
      <input type="range" id="fin_tpSlider" min="5" max="100" value="20" class="fi5-range"
        oninput="document.getElementById('fin_tpVal').textContent=this.value+'€';window._financePreviewProj('ticket',this.value);"
        onchange="window.setTicketPriceFromSlider&&window.setTicketPriceFromSlider(this.value);">
      <div class="fi5-range-limits"><span>5€</span><span>100€</span></div>
    </div>
    <div class="fi5-slider">
      <div class="fi5-slider-top"><span>Precio merchandising</span><strong id="fin_mpVal">10€</strong></div>
      <input type="range" id="fin_mpSlider" min="1" max="50" value="10" class="fi5-range"
        oninput="document.getElementById('fin_mpVal').textContent=this.value+'€';window._financePreviewProj('merch',this.value);"
        onchange="window.setMerchandisingPriceFromSlider&&window.setMerchandisingPriceFromSlider(this.value);">
      <div class="fi5-range-limits"><span>1€</span><span>50€</span></div>
    </div>
  </div>
</div>

<!-- GASTOS -->
<div class="fi5-panel" id="fi5-p-gastos">
  <div class="fi5-sec">💸 Gastos recurrentes semanales</div>
  <div class="fi5-list" id="fi5-glist">
    <div class="fi5-row"><div><div class="fi5-row-label">⚽ Salarios plantilla</div><div class="fi5-row-sub" id="fin_pCnt">—</div></div><div id="fin_pSal" class="fi5-row-val red">0€/sem</div></div>
    <div class="fi5-row"><div><div class="fi5-row-label">👔 Salarios staff</div><div class="fi5-row-sub" id="fin_sCnt">—</div></div><div id="fin_sSal" class="fi5-row-val red">0€/sem</div></div>
  </div>
  <div class="fi5-total"><span class="fi5-total-label">Total semanal</span><span id="fin_totExp" class="fi5-total-val">0€/sem</span></div>

  <div class="fi5-sec">🏗️ Inversiones en instalaciones</div>
  <div class="fi5-list">
    <div class="fi5-row"><div><div class="fi5-row-label">🏟️ Estadio</div><div class="fi5-row-sub" id="fin_rStaCap">—</div></div><div id="fin_rSta" class="fi5-row-val red">0€</div></div>
    <div class="fi5-row"><div><div class="fi5-row-label">🏋️ Centro entrenamiento</div><div class="fi5-row-sub" id="fin_rTraLvl">—</div></div><div id="fin_rTra" class="fi5-row-val red">0€</div></div>
  </div>
  <div class="fi5-total"><span class="fi5-total-label">Total inversiones temporada</span><span id="fin_rTot" class="fi5-total-val">0€</span></div>
  <div id="fin_rList" style="margin-top:8px;"></div>
</div>

<!-- MERCADO -->
<div class="fi5-panel" id="fi5-p-mercado">
  <div class="fi5-sec">🔄 Balance de mercado — temporada actual</div>
  <div class="fi5-mkt">
    <div class="fi5-mkt-card"><div class="lbl">💸 Inversión fichajes</div><div id="fin_mPur" class="val" style="color:#dc2626;">0€</div></div>
    <div class="fi5-mkt-card"><div class="lbl">💰 Ingresos ventas</div><div id="fin_mSal" class="val" style="color:#16a34a;">0€</div></div>
    <div class="fi5-mkt-card"><div class="lbl">🚪 Indemnizaciones</div><div id="fin_mCom" class="val" style="color:#dc2626;">0€</div></div>
    <div class="fi5-mkt-card"><div class="lbl">👔 Cláusulas staff</div><div id="fin_mStf" class="val" style="color:#dc2626;">0€</div></div>
  </div>
  <div class="fi5-result" id="fi5-mbal"><div><div class="fi5-result-label">Balance neto de mercado</div><div id="fin_mBal" class="fi5-result-val">0€</div></div><div class="fi5-result-badge">MKT</div></div>
</div>

<!-- HISTORIAL -->
<div class="fi5-panel" id="fi5-p-historial">
  <div class="fi5-sec">📋 Movimientos de temporada</div>
  <div class="fi5-hist" id="fin_mList"><div style="color:#94a3b8;padding:24px;text-align:center;font-style:italic;">Sin movimientos registrados esta temporada.</div></div>
</div>
`; }

// ── helpers ──────────────────────────────────────────────────
function setText(id,txt,col){const e=document.getElementById(id);if(!e)return;e.textContent=txt;if(col)e.style.color=col;}
function setRes(wid,vid){
  const t=document.getElementById(vid)?.textContent||'';
  const w=document.getElementById(wid);if(!w)return;
  const p=t.startsWith('+'),n=t.startsWith('-');
  w.className='fi5-result '+(p?'up':n?'down':'');
  const v=document.getElementById(vid);if(v)v.className='fi5-result-val '+(p?'up':n?'down':'');
}
window._fi5tab=function(tab){
  const ts=['semana','gastos','mercado','historial'];
  document.querySelectorAll('.fi5-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.fi5-tab').forEach((t,i)=>t.classList.toggle('active',ts[i]===tab));
  const p=document.getElementById('fi5-p-'+tab);if(p)p.classList.add('active');
};

// ── Build ─────────────────────────────────────────────────────
function build(){const c=document.getElementById('finance');if(!c)return;c.innerHTML=buildHTML();}

// ── Refresh ───────────────────────────────────────────────────
function refresh(){
  if(!gl())return;const s=gs();if(!s?.team)return;
  const bal=s.balance||0;
  const be=document.getElementById('fin_balance');
  if(be){be.textContent=fmt(bal)+'€';be.className=bal<0?'neg':'';}
  setText('fi5-sub',`${s.team}  ·  Temporada ${s.currentSeason||'—'}  ·  Jornada ${s.week||1}`);

  // Última jornada
  const lw=s.lastWeekFinance;
  if(lw){
    setText('fin_lastLabel',`Semana ${lw.week} — ${lw.home?'🏟️ Local':'✈️ Visitante'}`);
    setText('fin_lTicket',fmt(lw.ticketInc)+'€',lw.ticketInc>0?'#16a34a':'#94a3b8');
    setText('fin_lTicketD',lw.home?`${fmt(lw.att)} espectadores`:'Partido visitante');
    setText('fin_lMerch',fmt(lw.merchInc)+'€',lw.merchInc>0?'#16a34a':'#94a3b8');
    setText('fin_lMerchD',lw.home?`${fmt(lw.items)} unidades`:'Partido visitante');
    setText('fin_lBase',fmt(lw.baseInc)+'€');
    setText('fin_lTotI',fmt(lw.totalInc)+'€');
    setText('fin_lExp',fmt(lw.totalExp)+'€');
    const net=lw.net||0;
    setText('fin_lNet',(net>=0?'+':'')+fmt(net)+'€');
    setRes('fi5-lnet','fin_lNet');
    setText('fi5-ki',fmt(lw.totalInc)+'€');
    setText('fi5-ke',fmt(lw.totalExp)+'€');
    const kn=document.getElementById('fi5-kn');
    if(kn){kn.textContent=(net>=0?'+':'')+fmt(net)+'€';kn.className='fi5-kpi-val '+(net>=0?'up':'down');}
  } else setText('fin_lastLabel','sin jornadas jugadas todavía');

  // Proyección
  const tp=s.ticketPrice||20,mp=s.merchandisingPrice||10;
  const cap=s.stadiumCapacity||5000,pop=(s.popularity||50)/100;
  const att=Math.max(0,Math.min(cap,Math.round(cap*pop*Math.max(.3,1-(tp-20)/150))));
  const its=Math.floor((s.fanbase||1000)*((s.popularity||50)/500)*0.015);
  const isAway=(()=>{try{const n=(s.schedule||[]).find(m=>!m.played);if(!n)return null;return!(n.home===true||n.homeTeam===s.team);}catch(e){return null;}})();
  const tI=isAway?0:Math.floor(tp*att),mI=isAway?0:its*mp,bI=s.weeklyIncomeBase||5000;
  const projI=tI+mI+bI;
  const pS=(s.squad||[]).reduce((a,p)=>a+(p.salary||0),0);
  const sArr=Object.values(s.staff||{}).filter(Boolean);
  const stS=sArr.reduce((a,x)=>a+(x.salary||0),0);
  const loanP=s.fd_loanPayment||0;
  const totE=pS+stS+loanP,projN=projI-totE;

  setText('fin_nextLabel',isAway===false?'🏟️ Local':isAway===true?'✈️ Visitante':'—');
  const aw=document.getElementById('fin_awayWarning');if(aw)aw.style.display=isAway?'':'none';
  setText('fin_pTicket',fmt(tI)+'€',isAway?'#94a3b8':'#16a34a');
  setText('fin_pTicketD',isAway?'Partido visitante':`${fmt(att)} espect. × ${tp}€`);
  setText('fin_pMerch',fmt(mI)+'€',isAway?'#94a3b8':'#16a34a');
  setText('fin_pMerchD',isAway?'Partido visitante':`${fmt(its)} uds × ${mp}€`);
  setText('fin_pBase',fmt(bI)+'€');
  setText('fin_pTotI',fmt(projI)+'€');
  setText('fin_pExp',fmt(totE)+'€');
  setText('fin_pNet',(projN>=0?'+':'')+fmt(projN)+'€');
  setRes('fi5-pnet','fin_pNet');
  const tpS=document.getElementById('fin_tpSlider');if(tpS){tpS.value=tp;setText('fin_tpVal',tp+'€');}
  const mpS=document.getElementById('fin_mpSlider');if(mpS){mpS.value=mp;setText('fin_mpVal',mp+'€');}

  setText('fin_pSal',fmt(pS)+'€/sem');setText('fin_pCnt',`${s.squad?.length||0} jugadores`);
  setText('fin_sSal',fmt(stS)+'€/sem');setText('fin_sCnt',`${sArr.length} miembro${sArr.length!==1?'s':''}`);
  setText('fin_totExp',fmt(totE)+'€/sem');
  extraRows(pS,stS);

  const pur=s.playerPurchases||0,sal=s.playerSalesIncome||0,com=s.playerCompensations||0;
  const mvs=s.seasonMovements||[];
  const stfC=mvs.filter(m=>m.type==='staff_hire'||m.type==='staff_compensation').reduce((a,m)=>a+Math.abs(m.amount),0);
  const mBal=sal-pur-com-stfC;
  setText('fin_mPur',fmt(pur)+'€',pur>0?'#dc2626':'#94a3b8');
  setText('fin_mSal',fmt(sal)+'€',sal>0?'#16a34a':'#94a3b8');
  setText('fin_mCom',fmt(com)+'€',com>0?'#dc2626':'#94a3b8');
  setText('fin_mStf',fmt(stfC)+'€',stfC>0?'#dc2626':'#94a3b8');
  setText('fin_mBal',(mBal>=0?'+':'')+fmt(mBal)+'€');
  setRes('fi5-mbal','fin_mBal');

  const rens=mvs.filter(m=>m.type==='renovation');
  const sR=rens.filter(m=>/estadio|asiento/i.test(m.description)).reduce((a,m)=>a+Math.abs(m.amount),0);
  const tR=rens.filter(m=>/entrenamiento/i.test(m.description)).reduce((a,m)=>a+Math.abs(m.amount),0);
  const toR=rens.reduce((a,m)=>a+Math.abs(m.amount),0);
  setText('fin_rSta',fmt(sR)+'€',sR>0?'#dc2626':'#94a3b8');setText('fin_rStaCap',`Capacidad: ${fmt(s.stadiumCapacity||0)}`);
  setText('fin_rTra',fmt(tR)+'€',tR>0?'#dc2626':'#94a3b8');setText('fin_rTraLvl',`Nivel: ${s.trainingLevel||1}`);
  setText('fin_rTot',fmt(toR)+'€',toR>0?'#dc2626':'#94a3b8');
  const rLE=document.getElementById('fin_rList');
  if(rLE)rLE.innerHTML=rens.length===0?'<p style="color:#94a3b8;font-style:italic;padding:8px 0;">Sin inversiones esta temporada.</p>':
    '<div class="fi5-list">'+rens.map(r=>`<div class="fi5-row"><div class="fi5-row-label" style="font-size:.9em;">Sem ${r.week} — ${r.description}</div><div class="fi5-row-val red">-${fmt(Math.abs(r.amount))}€</div></div>`).join('')+'</div>';

  const mLE=document.getElementById('fin_mList');
  if(mLE){const all=mvs.filter(m=>m.type!=='renovation');const ic={purchase:'💸',sale:'💰',compensation:'🚪',staff_hire:'👔',staff_compensation:'🚫'};
    mLE.className='fi5-hist';
    mLE.innerHTML=all.length===0?'<div style="color:#94a3b8;padding:24px;text-align:center;font-style:italic;">Sin movimientos registrados esta temporada.</div>':
      [...all].reverse().map(m=>{const pos=m.amount>0;return`<div class="fi5-hist-row"><div><div class="fi5-hist-desc">${ic[m.type]||'•'} ${m.description}</div><div class="fi5-hist-week">Semana ${m.week}</div></div><div class="fi5-hist-amt" style="color:${pos?'#16a34a':'#dc2626'}">${pos?'+':''}${fmt(m.amount)}€</div></div>`;}).join('');}
}

function extraRows(pS,stS){
  const rows=document.getElementById('fi5-glist');if(!rows)return;
  rows.querySelectorAll('.fi5-extra').forEach(r=>r.remove());
  const s=gs();if(!s)return;
  const lp=s.fd_loanPayment||0,bon=s.fd_bonus||0;
  const lns=(s.fd_loans||[]).filter(l=>l.weeksLeft>0);
  if(lp>0){const r=document.createElement('div');r.className='fi5-row fi5-extra';
    r.innerHTML=`<div><div class="fi5-row-label">🏦 Cuotas préstamos</div><div class="fi5-row-sub">${lns.length} préstamo${lns.length!==1?'s':''} activo${lns.length!==1?'s':''}</div></div><div class="fi5-row-val red">${fmt(lp)}€/sem</div>`;rows.appendChild(r);}
  if(bon>0){const r=document.createElement('div');r.className='fi5-row fi5-extra';
    r.innerHTML=`<div><div class="fi5-row-label">💰 Prima jugadores</div><div class="fi5-row-sub">Próximo partido — ya descontada</div></div><div class="fi5-row-val gold">${fmt(bon)}€</div>`;rows.appendChild(r);}
  setText('fin_totExp',fmt(pS+stS+lp)+'€/sem');
}

function patch(){
  const iv=setInterval(()=>{
    if(typeof window._financeRefresh!=='function')return;
    clearInterval(iv);
    window._financeRefresh=refresh;
    window.updateFinanceDisplay=refresh;
    if(!window._fi5hooked){window._fi5hooked=true;
      const orig=window.openPage;
      if(orig)window.openPage=function(page,...args){orig.call(this,page,...args);
        if(page==='finance'){build();setTimeout(refresh,50);}
      };
    }
    const c=document.getElementById('finance');
    if(c&&c.classList.contains('active')){build();setTimeout(refresh,50);}
    console.log('[FinanceUI v5] ✅ Diseño claro');
  },200);
}
function init(){if(!window.gameLogic){setTimeout(init,400);return;}patch();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
