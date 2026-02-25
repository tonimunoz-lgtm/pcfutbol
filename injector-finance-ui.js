// injector-finance-ui.js  v4.0
// Usa el sistema de diseño nativo del juego: data-box, colores FFD700/5588FF/8BC34A
(function () {
'use strict';
const gl  = () => window.gameLogic;
const gs  = () => gl()?.getGameState();
const fmt = n  => Math.round(n||0).toLocaleString('es-ES');

const CSS = `
#finance { padding: 0 !important; }

/* HERO BALANCE */
.fi-hero {
  padding: 24px 30px 20px;
  background: linear-gradient(135deg, rgba(58,102,176,.25) 0%, rgba(0,0,0,.4) 100%);
  border-bottom: 2px solid #5588FF;
  text-align: center;
  position: relative;
}
.fi-hero-label {
  font-size:.78em; letter-spacing:4px; text-transform:uppercase;
  color:#5588FF; font-weight:bold; margin-bottom:8px;
}
#fin_balance {
  font-size:3.8em !important; font-weight:bold !important;
  color:#FFD700 !important;
  text-shadow:0 0 30px rgba(255,215,0,.6), 0 2px 6px rgba(0,0,0,.8) !important;
  line-height:1 !important;
}
#fin_balance.neg { color:#FF4444 !important; text-shadow:0 0 30px rgba(255,68,68,.6), 0 2px 6px rgba(0,0,0,.8) !important; }
.fi-hero-sub { font-size:.82em; color:#3A5A8A; margin-top:6px; letter-spacing:1px; }

/* 3 KPI boxes bajo el balance */
.fi-kpis {
  display:grid; grid-template-columns:1fr 1fr 1fr;
  gap:0; border-bottom:2px solid #1E3060;
}
.fi-kpi {
  text-align:center; padding:14px 10px;
  border-right:1px solid #1E3060;
  background:rgba(58,102,176,.08);
}
.fi-kpi:last-child { border-right:none; }
.fi-kpi-label {
  font-size:.65em; letter-spacing:2px; text-transform:uppercase;
  color:#4A6A9A; font-weight:bold; margin-bottom:5px;
}
.fi-kpi-val { font-size:1.25em; font-weight:bold; }

/* TABS */
.fi-tabs {
  display:flex; overflow-x:auto; scrollbar-width:none;
  background:rgba(0,0,0,.5); border-bottom:2px solid #1A3060;
  position:sticky; top:0; z-index:20;
}
.fi-tabs::-webkit-scrollbar { display:none; }
.fi-tab {
  flex-shrink:0; padding:13px 22px;
  font-size:.82em; font-weight:bold; letter-spacing:2px; text-transform:uppercase;
  color:#3A5A8A; cursor:pointer; border:none; background:none;
  border-bottom:3px solid transparent; transition:all .2s; white-space:nowrap;
}
.fi-tab:hover { color:#88AADD; }
.fi-tab.active { color:#FFD700; border-bottom-color:#FFD700; background:rgba(255,215,0,.04); }

/* PANELS */
.fi-panel { display:none; padding:24px 30px 40px; }
.fi-panel.active { display:block; }

/* SECTION HEADER — usa el mismo estilo que h2 del juego pero más visual */
.fi-sec {
  font-size:.8em; font-weight:bold; letter-spacing:3px; text-transform:uppercase;
  color:#FFD700; background:rgba(58,102,176,.15);
  border:1px solid #2A4A8A; border-left:4px solid #5588FF;
  padding:9px 16px; margin:24px 0 14px; border-radius:3px;
  text-shadow:0 0 8px rgba(255,215,0,.3);
}
.fi-sec:first-child { margin-top:0; }

/* DATA BOXES GRID — mismo sistema que .data-grid/.data-box del juego */
.fi-grid { display:grid; gap:12px; margin-bottom:14px; }
.fi-grid.g2 { grid-template-columns:1fr 1fr; }
.fi-grid.g3 { grid-template-columns:1fr 1fr 1fr; }
.fi-box {
  background:rgba(58,102,176,.2); border:1px solid #5588FF;
  padding:16px; border-radius:3px; text-align:center;
  box-shadow:inset 0 0 10px rgba(0,0,0,.4);
  transition:border-color .2s, box-shadow .2s;
}
.fi-box:hover { border-color:#FFD700; box-shadow:inset 0 0 10px rgba(0,0,0,.4), 0 0 8px rgba(255,215,0,.15); }
.fi-box-label { color:#BBB; font-size:.78em; margin-bottom:7px; letter-spacing:1px; }
.fi-box-val { font-size:1.7em; font-weight:bold; }
.fi-box-val.green { color:#8BC34A; text-shadow:0 0 8px rgba(139,195,74,.3); }
.fi-box-val.red   { color:#FF4444; text-shadow:0 0 8px rgba(255,68,68,.3); }
.fi-box-val.gold  { color:#FFD700; text-shadow:0 0 8px rgba(255,215,0,.3); }
.fi-box-val.blue  { color:#5588FF; }
.fi-box-sub { font-size:.73em; color:#4A6A9A; margin-top:4px; }

/* RESULTADO NETO — banner llamativo */
.fi-net {
  display:flex; justify-content:space-between; align-items:center;
  padding:18px 22px; border-radius:5px; margin-bottom:14px;
  border:1px solid #2A4A8A; background:rgba(0,0,0,.3);
}
.fi-net.green { border-color:#2E7D32; background:rgba(46,125,50,.12); border-left:5px solid #8BC34A; }
.fi-net.red   { border-color:#B71C1C; background:rgba(183,28,28,.12); border-left:5px solid #FF4444; }
.fi-net-left .fi-net-label {
  font-size:.7em; letter-spacing:3px; text-transform:uppercase;
  color:#4A6A9A; font-weight:bold; margin-bottom:6px;
}
.fi-net-val { font-size:2.2em; font-weight:bold; }
.fi-net-val.green { color:#8BC34A; text-shadow:0 0 12px rgba(139,195,74,.4); }
.fi-net-val.red   { color:#FF4444; text-shadow:0 0 12px rgba(255,68,68,.4); }
.fi-net-badge {
  font-size:2.8em; font-weight:bold; letter-spacing:-2px;
  opacity:.12; color:#5588FF;
}

/* ROWS (gastos) */
.fi-rows {
  background:rgba(0,0,0,.3); border:1px solid #2A4488; border-radius:3px;
  overflow:hidden; margin-bottom:12px;
}
.fi-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:13px 18px; border-bottom:1px solid rgba(42,68,136,.5);
  transition:background .15s;
}
.fi-row:last-child { border-bottom:none; }
.fi-row:hover { background:rgba(85,136,255,.06); }
.fi-row-name { font-size:.95em; font-weight:bold; color:#C0C8D8; }
.fi-row-sub  { font-size:.72em; color:#3A4A6A; margin-top:2px; }
.fi-row-val  { font-size:1.05em; font-weight:bold; }
.fi-row-val.red   { color:#FF6666; }
.fi-row-val.green { color:#8BC34A; }
.fi-row-val.gold  { color:#FFD700; }

/* TOTAL */
.fi-total {
  display:flex; justify-content:space-between; align-items:center;
  padding:15px 20px; margin-bottom:14px;
  background:rgba(183,28,28,.1); border:1px solid #6A1818;
  border-left:4px solid #FF4444; border-radius:3px;
}
.fi-total-label { font-size:.72em; letter-spacing:3px; text-transform:uppercase; color:#8A3A3A; font-weight:bold; }
.fi-total-val   { font-size:1.5em; font-weight:bold; color:#FF6666; }

/* SLIDERS */
.fi-sliders { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fi-slider {
  background:rgba(58,102,176,.15); border:1px solid #2A4A8A;
  border-radius:3px; padding:16px;
}
.fi-slider-top {
  display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;
}
.fi-slider-top span { font-size:.75em; letter-spacing:2px; text-transform:uppercase; color:#4A6A9A; font-weight:bold; }
.fi-slider-top strong { font-size:1.2em; font-weight:bold; color:#FFD700; }
input[type=range].fi-range {
  width:100%; -webkit-appearance:none; height:5px;
  background:rgba(58,102,176,.3); border-radius:3px; outline:none; cursor:pointer;
}
input[type=range].fi-range::-webkit-slider-thumb {
  -webkit-appearance:none; width:18px; height:18px; border-radius:50%;
  background:#FFD700; box-shadow:0 0 10px rgba(255,215,0,.7), 0 2px 4px rgba(0,0,0,.5);
  cursor:pointer; transition:transform .15s;
}
input[type=range].fi-range::-webkit-slider-thumb:hover { transform:scale(1.25); }
.fi-range-limits { display:flex; justify-content:space-between; font-size:.68em; color:#2A3A5A; margin-top:5px; }

/* AWAY WARNING */
.fi-away {
  background:rgba(255,152,0,.08); border:1px solid rgba(255,152,0,.3);
  border-radius:3px; padding:10px 16px; font-size:.85em; color:#FFA726;
  margin-bottom:14px; display:none;
}

/* MERCADO */
.fi-mkt { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
.fi-mkt-card {
  background:rgba(58,102,176,.15); border:1px solid #2A4A8A;
  border-radius:3px; padding:14px 16px;
}
.fi-mkt-card .lbl { font-size:.7em; letter-spacing:2px; text-transform:uppercase; color:#3A5A8A; font-weight:bold; margin-bottom:7px; }
.fi-mkt-card .val { font-size:1.3em; font-weight:bold; }

/* HISTORIAL */
.fi-hist-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:11px 18px; border-bottom:1px solid rgba(42,68,136,.4);
  transition:background .15s;
}
.fi-hist-row:hover { background:rgba(85,136,255,.05); }
.fi-hist-desc { font-size:.88em; color:#8A9AB8; }
.fi-hist-week { font-size:.72em; color:#2A3A5A; margin-top:2px; }
.fi-hist-amt  { font-size:.95em; font-weight:bold; white-space:nowrap; flex-shrink:0; }

/* CLOSE BTN */
#finance .fi-close { background:#920300 !important; color:#FFF !important; border:1px solid #C70000 !important;
  padding:8px 16px !important; border-radius:3px !important; cursor:pointer !important;
  font-weight:bold !important; text-transform:uppercase !important; transition:all .2s !important; }
#finance .fi-close:hover { background:#D30000 !important; border-color:#FFD700 !important; }
`;

function buildHTML() { return `
<style id="fi-css4">${CSS}</style>

<div class="page-header" style="padding:16px 30px 14px;margin-bottom:0;position:sticky;top:0;z-index:30;background:rgba(0,0,0,.95);backdrop-filter:blur(8px);">
  <h1 style="margin-bottom:0;padding-bottom:0;border:none;font-size:1.6em;">💰 CAJA &amp; FINANZAS</h1>
  <button class="fi-close" onclick="closePage('finance')">✖ CERRAR</button>
</div>

<div class="fi-hero">
  <div class="fi-hero-label">Balance en caja</div>
  <div id="fin_balance">0€</div>
  <div class="fi-hero-sub" id="fi-sub"></div>
</div>

<div class="fi-kpis">
  <div class="fi-kpi"><div class="fi-kpi-label">⬆ Ingresos sem.</div><div class="fi-kpi-val" style="color:#8BC34A;" id="fi-k-inc">—</div></div>
  <div class="fi-kpi"><div class="fi-kpi-label">⬇ Gastos sem.</div><div class="fi-kpi-val" style="color:#FF4444;" id="fi-k-exp">—</div></div>
  <div class="fi-kpi"><div class="fi-kpi-label">◈ Neto sem.</div><div class="fi-kpi-val" id="fi-k-net">—</div></div>
</div>

<div class="fi-tabs">
  <button class="fi-tab active" onclick="window._fiTab('semana')">📅 Semana</button>
  <button class="fi-tab"        onclick="window._fiTab('gastos')">💸 Gastos</button>
  <button class="fi-tab"        onclick="window._fiTab('mercado')">🔄 Mercado</button>
  <button class="fi-tab"        onclick="window._fiTab('historial')">📋 Historial</button>
</div>

<!-- TAB SEMANA -->
<div class="fi-panel active" id="fi-p-semana">
  <div class="fi-sec">📅 Última jornada — <span id="fin_lastLabel" style="color:#88AAFF;text-transform:none;letter-spacing:0;font-weight:normal;font-size:1.1em;"></span></div>
  <div class="fi-grid g3" style="margin-bottom:12px;">
    <div class="fi-box"><div class="fi-box-label">🎟️ Taquilla</div><div id="fin_lTicket" class="fi-box-val green">—</div><div id="fin_lTicketD" class="fi-box-sub">—</div></div>
    <div class="fi-box"><div class="fi-box-label">🛍️ Merch</div><div id="fin_lMerch" class="fi-box-val green">—</div><div id="fin_lMerchD" class="fi-box-sub">—</div></div>
    <div class="fi-box"><div class="fi-box-label">📺 TV &amp; Patrocinios</div><div id="fin_lBase" class="fi-box-val gold">—</div></div>
  </div>
  <div class="fi-grid g2" style="margin-bottom:12px;">
    <div class="fi-net green" style="margin-bottom:0;"><div class="fi-net-left"><div class="fi-net-label">Total ingresos</div><div id="fin_lTotI" class="fi-net-val green" style="font-size:1.7em;">—</div></div><div class="fi-net-badge">IN</div></div>
    <div class="fi-net red"   style="margin-bottom:0;"><div class="fi-net-left"><div class="fi-net-label">Gastos pagados</div><div id="fin_lExp"  class="fi-net-val red"   style="font-size:1.7em;">—</div></div><div class="fi-net-badge">OUT</div></div>
  </div>
  <div class="fi-net" id="fi-lnet-wrap"><div class="fi-net-left"><div class="fi-net-label">Resultado neto jornada</div><div id="fin_lNet" class="fi-net-val">—</div></div><div class="fi-net-badge">NET</div></div>

  <div class="fi-sec" style="margin-top:22px;">🔮 Proyección próxima jornada — <span id="fin_nextLabel" style="color:#FFA726;text-transform:none;letter-spacing:0;font-weight:normal;font-size:1.1em;"></span></div>
  <div id="fin_awayWarning" class="fi-away">✈️ Partido visitante — sin ingresos de taquilla ni merchandising</div>
  <div class="fi-grid g3" style="margin-bottom:12px;">
    <div class="fi-box"><div class="fi-box-label">🎟️ Taquilla est.</div><div id="fin_pTicket" class="fi-box-val green">0€</div><div id="fin_pTicketD" class="fi-box-sub">—</div></div>
    <div class="fi-box"><div class="fi-box-label">🛍️ Merch est.</div><div id="fin_pMerch" class="fi-box-val green">0€</div><div id="fin_pMerchD" class="fi-box-sub">—</div></div>
    <div class="fi-box"><div class="fi-box-label">📺 TV &amp; Patrocinios</div><div id="fin_pBase" class="fi-box-val gold">0€</div></div>
  </div>
  <div class="fi-grid g2" style="margin-bottom:12px;">
    <div class="fi-net green" style="margin-bottom:0;"><div class="fi-net-left"><div class="fi-net-label">Total ingresos est.</div><div id="fin_pTotI" class="fi-net-val green" style="font-size:1.7em;">0€</div></div><div class="fi-net-badge">IN</div></div>
    <div class="fi-net red"   style="margin-bottom:0;"><div class="fi-net-left"><div class="fi-net-label">Gastos recurrentes</div><div id="fin_pExp"  class="fi-net-val red"   style="font-size:1.7em;">0€</div></div><div class="fi-net-badge">OUT</div></div>
  </div>
  <div class="fi-net" id="fi-pnet-wrap"><div class="fi-net-left"><div class="fi-net-label">Resultado estimado</div><div id="fin_pNet" class="fi-net-val">0€</div></div><div class="fi-net-badge">EST</div></div>

  <div class="fi-sec" style="margin-top:22px;">🎛️ Ajuste de precios</div>
  <div class="fi-sliders">
    <div class="fi-slider">
      <div class="fi-slider-top"><span>Precio entrada</span><strong id="fin_tpVal">20€</strong></div>
      <input type="range" id="fin_tpSlider" min="5" max="100" value="20" class="fi-range"
        oninput="document.getElementById('fin_tpVal').textContent=this.value+'€';window._financePreviewProj('ticket',this.value);"
        onchange="window.setTicketPriceFromSlider&&window.setTicketPriceFromSlider(this.value);">
      <div class="fi-range-limits"><span>5€</span><span>100€</span></div>
    </div>
    <div class="fi-slider">
      <div class="fi-slider-top"><span>Precio merchandising</span><strong id="fin_mpVal">10€</strong></div>
      <input type="range" id="fin_mpSlider" min="1" max="50" value="10" class="fi-range"
        oninput="document.getElementById('fin_mpVal').textContent=this.value+'€';window._financePreviewProj('merch',this.value);"
        onchange="window.setMerchandisingPriceFromSlider&&window.setMerchandisingPriceFromSlider(this.value);">
      <div class="fi-range-limits"><span>1€</span><span>50€</span></div>
    </div>
  </div>
</div>

<!-- TAB GASTOS -->
<div class="fi-panel" id="fi-p-gastos">
  <div class="fi-sec">💸 Gastos recurrentes semanales</div>
  <div class="fi-rows" id="fi-gastos-rows">
    <div class="fi-row"><div><div class="fi-row-name">⚽ Salarios plantilla</div><div class="fi-row-sub" id="fin_pCnt">—</div></div><div id="fin_pSal" class="fi-row-val red">0€/sem</div></div>
    <div class="fi-row"><div><div class="fi-row-name">👔 Salarios staff</div><div class="fi-row-sub" id="fin_sCnt">—</div></div><div id="fin_sSal" class="fi-row-val red">0€/sem</div></div>
  </div>
  <div class="fi-total"><span class="fi-total-label">Total semanal</span><span id="fin_totExp" class="fi-total-val">0€/sem</span></div>
  <div class="fi-sec">🏗️ Inversiones en instalaciones</div>
  <div class="fi-rows">
    <div class="fi-row"><div><div class="fi-row-name">🏟️ Estadio</div><div class="fi-row-sub" id="fin_rStaCap">—</div></div><div id="fin_rSta" class="fi-row-val red">0€</div></div>
    <div class="fi-row"><div><div class="fi-row-name">🏋️ Centro entrenamiento</div><div class="fi-row-sub" id="fin_rTraLvl">—</div></div><div id="fin_rTra" class="fi-row-val red">0€</div></div>
  </div>
  <div class="fi-total"><span class="fi-total-label">Total inversiones temporada</span><span id="fin_rTot" class="fi-total-val">0€</span></div>
  <div id="fin_rList" style="margin-top:10px;"></div>
</div>

<!-- TAB MERCADO -->
<div class="fi-panel" id="fi-p-mercado">
  <div class="fi-sec">🔄 Balance de mercado — temporada actual</div>
  <div class="fi-mkt">
    <div class="fi-mkt-card"><div class="lbl">💸 Inversión fichajes</div><div id="fin_mPur" class="val" style="color:#FF6666;">0€</div></div>
    <div class="fi-mkt-card"><div class="lbl">💰 Ingresos ventas</div><div id="fin_mSal" class="val" style="color:#8BC34A;">0€</div></div>
    <div class="fi-mkt-card"><div class="lbl">🚪 Indemnizaciones</div><div id="fin_mCom" class="val" style="color:#FF6666;">0€</div></div>
    <div class="fi-mkt-card"><div class="lbl">👔 Cláusulas staff</div><div id="fin_mStf" class="val" style="color:#FF6666;">0€</div></div>
  </div>
  <div class="fi-net" id="fi-mbal-wrap"><div class="fi-net-left"><div class="fi-net-label">Balance neto de mercado</div><div id="fin_mBal" class="fi-net-val">0€</div></div><div class="fi-net-badge">MKT</div></div>
</div>

<!-- TAB HISTORIAL -->
<div class="fi-panel" id="fi-p-historial">
  <div class="fi-sec">📋 Movimientos de temporada</div>
  <div class="fi-rows" id="fin_mList"><div style="color:#2A3A5A;padding:20px;text-align:center;font-style:italic;">Sin movimientos registrados esta temporada.</div></div>
</div>
`; }

function setText(id,txt,col){const e=document.getElementById(id);if(!e)return;e.textContent=txt;if(col)e.style.color=col;}
function setNet(wid,vid){const t=document.getElementById(vid)?.textContent||'';const w=document.getElementById(wid);if(!w)return;const p=t.startsWith('+'),n=t.startsWith('-');w.className='fi-net '+(p?'green':n?'red':'');const v=document.getElementById(vid);if(v)v.className='fi-net-val '+(p?'green':n?'red':'');}

window._fiTab=function(tab){const tabs=['semana','gastos','mercado','historial'];document.querySelectorAll('.fi-panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.fi-tab').forEach((t,i)=>t.classList.toggle('active',tabs[i]===tab));const p=document.getElementById('fi-p-'+tab);if(p)p.classList.add('active');};

function buildFinancePanelNew(){const c=document.getElementById('finance');if(!c)return;c.innerHTML=buildHTML();}

function refreshFinancePanelNew(){
  if(!gl())return;const s=gs();if(!s?.team)return;
  const bal=s.balance||0;
  const be=document.getElementById('fin_balance');
  if(be){be.textContent=fmt(bal)+'€';be.className=bal<0?'neg':'';}
  const sub=document.getElementById('fi-sub');
  if(sub)sub.textContent=`${s.team}  ·  Temporada ${s.currentSeason||'—'}  ·  Semana ${s.week||1}`;

  const lw=s.lastWeekFinance;
  if(lw){
    setText('fin_lastLabel',`Semana ${lw.week} — ${lw.home?'🏟️ Local':'✈️ Visitante'}`);
    setText('fin_lTicket',fmt(lw.ticketInc)+'€',lw.ticketInc>0?'#8BC34A':'#3A5A7A');
    setText('fin_lTicketD',lw.home?`${fmt(lw.att)} espectadores`:'Partido visitante');
    setText('fin_lMerch',fmt(lw.merchInc)+'€',lw.merchInc>0?'#8BC34A':'#3A5A7A');
    setText('fin_lMerchD',lw.home?`${fmt(lw.items)} unidades`:'Partido visitante');
    setText('fin_lBase',fmt(lw.baseInc)+'€');
    setText('fin_lTotI',fmt(lw.totalInc)+'€');
    setText('fin_lExp',fmt(lw.totalExp)+'€');
    const net=lw.net||0;
    setText('fin_lNet',(net>=0?'+':'')+fmt(net)+'€');
    setNet('fi-lnet-wrap','fin_lNet');
    setText('fi-k-inc',fmt(lw.totalInc)+'€');
    setText('fi-k-exp',fmt(lw.totalExp)+'€');
    const kn=document.getElementById('fi-k-net');
    if(kn){kn.textContent=(net>=0?'+':'')+fmt(net)+'€';kn.style.color=net>=0?'#8BC34A':'#FF4444';}
  } else setText('fin_lastLabel','sin jornadas jugadas todavía');

  const tp=s.ticketPrice||20,mp=s.merchandisingPrice||10;
  const cap=s.stadiumCapacity||5000,pop=(s.popularity||50)/100;
  const att=Math.max(0,Math.min(cap,Math.round(cap*pop*Math.max(.3,1-(tp-20)/150))));
  const its=Math.floor((s.fanbase||1000)*((s.popularity||50)/500)*0.015);
  const isAway=(()=>{try{const nxt=(s.schedule||[]).find(m=>!m.played);if(!nxt)return null;return!(nxt.home===true||nxt.homeTeam===s.team);}catch(e){return null;}})();
  const tI=isAway?0:Math.floor(tp*att),mI=isAway?0:its*mp,bI=s.weeklyIncomeBase||5000;
  const projI=tI+mI+bI;
  const pS=(s.squad||[]).reduce((a,p)=>a+(p.salary||0),0);
  const sArr=Object.values(s.staff||{}).filter(Boolean);
  const stS=sArr.reduce((a,x)=>a+(x.salary||0),0);
  const loanP=s.fd_loanPayment||0;
  const totE=pS+stS+loanP;
  const projN=projI-totE;

  setText('fin_nextLabel',isAway===false?'🏟️ Local':isAway===true?'✈️ Visitante':'—');
  const aw=document.getElementById('fin_awayWarning');if(aw)aw.style.display=isAway?'':'none';
  setText('fin_pTicket',fmt(tI)+'€',isAway?'#3A5A7A':'#8BC34A');
  setText('fin_pTicketD',isAway?'Partido visitante':`${fmt(att)} espect. × ${tp}€`);
  setText('fin_pMerch',fmt(mI)+'€',isAway?'#3A5A7A':'#8BC34A');
  setText('fin_pMerchD',isAway?'Partido visitante':`${fmt(its)} uds × ${mp}€`);
  setText('fin_pBase',fmt(bI)+'€');
  setText('fin_pTotI',fmt(projI)+'€');
  setText('fin_pExp',fmt(totE)+'€');
  setText('fin_pNet',(projN>=0?'+':'')+fmt(projN)+'€');
  setNet('fi-pnet-wrap','fin_pNet');

  const tpS=document.getElementById('fin_tpSlider');if(tpS){tpS.value=tp;setText('fin_tpVal',tp+'€');}
  const mpS=document.getElementById('fin_mpSlider');if(mpS){mpS.value=mp;setText('fin_mpVal',mp+'€');}

  setText('fin_pSal',fmt(pS)+'€/sem');setText('fin_pCnt',`${s.squad?.length||0} jugadores`);
  setText('fin_sSal',fmt(stS)+'€/sem');setText('fin_sCnt',`${sArr.length} miembro${sArr.length!==1?'s':''}`);
  setText('fin_totExp',fmt(totE)+'€/sem');
  injectExtraRows(pS,stS);

  const pur=s.playerPurchases||0,sal=s.playerSalesIncome||0,com=s.playerCompensations||0;
  const mvs=s.seasonMovements||[];
  const stfC=mvs.filter(m=>m.type==='staff_hire'||m.type==='staff_compensation').reduce((a,m)=>a+Math.abs(m.amount),0);
  const mBal=sal-pur-com-stfC;
  setText('fin_mPur',fmt(pur)+'€',pur>0?'#FF6666':'#3A5A7A');
  setText('fin_mSal',fmt(sal)+'€',sal>0?'#8BC34A':'#3A5A7A');
  setText('fin_mCom',fmt(com)+'€',com>0?'#FF6666':'#3A5A7A');
  setText('fin_mStf',fmt(stfC)+'€',stfC>0?'#FF6666':'#3A5A7A');
  setText('fin_mBal',(mBal>=0?'+':'')+fmt(mBal)+'€');
  setNet('fi-mbal-wrap','fin_mBal');

  const rens=mvs.filter(m=>m.type==='renovation');
  const sR=rens.filter(m=>/estadio|asiento/i.test(m.description)).reduce((a,m)=>a+Math.abs(m.amount),0);
  const tR=rens.filter(m=>/entrenamiento/i.test(m.description)).reduce((a,m)=>a+Math.abs(m.amount),0);
  const toR=rens.reduce((a,m)=>a+Math.abs(m.amount),0);
  setText('fin_rSta',fmt(sR)+'€',sR>0?'#FF6666':'#3A5A7A');setText('fin_rStaCap',`Capacidad: ${fmt(s.stadiumCapacity||0)}`);
  setText('fin_rTra',fmt(tR)+'€',tR>0?'#FF6666':'#3A5A7A');setText('fin_rTraLvl',`Nivel: ${s.trainingLevel||1}`);
  setText('fin_rTot',fmt(toR)+'€',toR>0?'#FF6666':'#3A5A7A');
  const rLE=document.getElementById('fin_rList');
  if(rLE)rLE.innerHTML=rens.length===0?'<div style="color:#2A3A5A;padding:10px 0;font-style:italic;">Sin inversiones esta temporada.</div>':
    '<div class="fi-rows">'+rens.map(r=>`<div class="fi-row"><div class="fi-row-name" style="font-size:.88em;">Sem ${r.week} — ${r.description}</div><div class="fi-row-val red">-${fmt(Math.abs(r.amount))}€</div></div>`).join('')+'</div>';

  const mLE=document.getElementById('fin_mList');
  if(mLE){const all=mvs.filter(m=>m.type!=='renovation');const ic={purchase:'💸',sale:'💰',compensation:'🚪',staff_hire:'👔',staff_compensation:'🚫'};
    mLE.innerHTML=all.length===0?'<div style="color:#2A3A5A;padding:20px;text-align:center;font-style:italic;">Sin movimientos registrados.</div>':
      all.length>0?[...all].reverse().map(m=>{const pos=m.amount>0;return`<div class="fi-hist-row"><div><div class="fi-hist-desc">${ic[m.type]||'•'} ${m.description}</div><div class="fi-hist-week">Semana ${m.week}</div></div><div class="fi-hist-amt" style="color:${pos?'#8BC34A':'#FF6666'}">${pos?'+':''}${fmt(m.amount)}€</div></div>`;}).join(''):'';
  }
}

function injectExtraRows(pS,stS){
  const rows=document.getElementById('fi-gastos-rows');if(!rows)return;
  rows.querySelectorAll('.fi-extra').forEach(r=>r.remove());
  const s=gs();if(!s)return;
  const loanPay=s.fd_loanPayment||0,bonus=s.fd_bonus||0;
  const loans=(s.fd_loans||[]).filter(l=>l.weeksLeft>0);
  if(loanPay>0){const r=document.createElement('div');r.className='fi-row fi-extra';
    r.innerHTML=`<div><div class="fi-row-name">🏦 Cuotas préstamos</div><div class="fi-row-sub">${loans.length} préstamo${loans.length!==1?'s':''} activo${loans.length!==1?'s':''}</div></div><div class="fi-row-val red">${fmt(loanPay)}€/sem</div>`;rows.appendChild(r);}
  if(bonus>0){const r=document.createElement('div');r.className='fi-row fi-extra';
    r.innerHTML=`<div><div class="fi-row-name">💰 Prima jugadores</div><div class="fi-row-sub">Próximo partido — ya descontada del balance</div></div><div class="fi-row-val gold">${fmt(bonus)}€</div>`;rows.appendChild(r);}
  setText('fin_totExp',fmt(pS+stS+loanPay)+'€/sem');
}

function patch(){
  const iv=setInterval(()=>{
    if(typeof window._financeRefresh!=='function')return;
    clearInterval(iv);
    window._financeRefresh=refreshFinancePanelNew;
    window.updateFinanceDisplay=refreshFinancePanelNew;
    if(!window._fiHooked){window._fiHooked=true;
      const orig=window.openPage;
      if(orig)window.openPage=function(page,...args){orig.call(this,page,...args);
        if(page==='finance'){buildFinancePanelNew();setTimeout(refreshFinancePanelNew,50);}
      };
    }
    const c=document.getElementById('finance');
    if(c&&c.classList.contains('active')){buildFinancePanelNew();setTimeout(refreshFinancePanelNew,50);}
    console.log('[FinanceUI v4] ✅');
  },200);
}

function init(){if(!window.gameLogic){setTimeout(init,400);return;}patch();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
