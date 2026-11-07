// injector-match-summary.js - Resumen profesional de partido con estadísticas completas

window.injectMatchSummary = function(matchResult) {
    console.log('📊 injectMatchSummary llamado con:', matchResult);
    
    if (!matchResult) {
        console.error('❌ matchResult es null o undefined');
        return;
    }

    const homeTeam = matchResult.home;
    const awayTeam = matchResult.away;
    const homeGoals = matchResult.homeGoals;
    const awayGoals = matchResult.awayGoals;

    console.log(`⚽ Partido: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`);

    const allGoals = (matchResult.goals || []).slice().sort((a,b)=>a.minute-b.minute);
    const allCards = (matchResult.cards || []).slice().sort((a,b)=>a.minute-b.minute);
    const injuries = matchResult.injuries || [];
    const substitutions = matchResult.substitutions || [];
    const stats = matchResult.stats || Object.fromEntries(['possession','shots','shotsOnTarget','corners','fouls','yellowCards','redCards','offsides','passes','passAccuracy','saves'].map(k=>[k,['—','—']]));
    // ========================================
    // CREAR MODAL HTML
    // ========================================
    const modal = document.createElement('div');
    modal.id = 'matchSummaryModal';
    
    modal.innerHTML = `
        <div class="match-container pcf-summary-view">
            <button class="match-close" onclick="this.parentElement.parentElement.remove()">✖</button>
            
            <div class="match-header">
                <div class="match-team home">
                    <div class="team-name">${homeTeam}</div>
                    <div class="team-score">${homeGoals}</div>
                </div>
                <div class="match-separator">-</div>
                <div class="match-team away">
                    <div class="team-score">${awayGoals}</div>
                    <div class="team-name">${awayTeam}</div>
                </div>
            </div>
            
            ${(window.pcfRivalries?.of(homeTeam, awayTeam)) ? `<div style="text-align:center;color:#ffb300;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px">🔥 ${window.pcfRivalries.of(homeTeam, awayTeam).name}</div>` : ''}
            <div class="ms-compact">
                <div class="ms-block ms-goals">
                    <h3>⚽ Goles</h3>
                    <div class="ms-two">
                        <div class="ms-col home">${allGoals.filter(g => g.team === homeTeam).map(g => `<div class="ms-ev"><span class="ms-min">${g.minute}'</span> ${g.name}</div>`).join('') || '<div class="ms-none">—</div>'}</div>
                        <div class="ms-col away">${allGoals.filter(g => g.team !== homeTeam).map(g => `<div class="ms-ev">${g.name} <span class="ms-min">${g.minute}'</span></div>`).join('') || '<div class="ms-none">—</div>'}</div>
                    </div>
                </div>
                ${allCards.length > 0 ? `
                <div class="ms-block ms-cards">
                    <h3>🟨🟥 Tarjetas</h3>
                    <div class="ms-two">
                        <div class="ms-col home">${allCards.filter(c => c.team === homeTeam).map(c => `<div class="ms-ev">${c.type === 'yellow' ? '🟨' : '🟥'} <span class="ms-min">${c.minute}'</span> ${c.player}</div>`).join('') || '<div class="ms-none">—</div>'}</div>
                        <div class="ms-col away">${allCards.filter(c => c.team !== homeTeam).map(c => `<div class="ms-ev">${c.player} <span class="ms-min">${c.minute}'</span> ${c.type === 'yellow' ? '🟨' : '🟥'}</div>`).join('') || '<div class="ms-none">—</div>'}</div>
                    </div>
                </div>` : ''}
                ${injuries.length > 0 ? `
                <div class="ms-block ms-injuries">
                    <h3>🚑 Lesiones</h3>
                    <div class="ms-two">
                        <div class="ms-col home">${injuries.filter(x => x.team === homeTeam).map(x => `<div class="ms-ev"><span class="ms-min">${x.minute}'</span> ${x.player}</div>`).join('') || '<div class="ms-ev ms-none">—</div>'}</div>
                        <div class="ms-col away">${injuries.filter(x => x.team !== homeTeam).map(x => `<div class="ms-ev">${x.player} <span class="ms-min">${x.minute}'</span></div>`).join('') || '<div class="ms-ev ms-none">—</div>'}</div>
                    </div>
                </div>` : ''}
                <div class="ms-block ms-poss-block">
                    <h3>📊 Posesión</h3>
                    <div class="ms-poss"><span>${stats.possession[0]}%</span>
                        <div class="ms-poss-bar"><div style="width:${stats.possession[0]}%"></div></div>
                        <span>${stats.possession[1]}%</span></div>
                </div>
                <div class="ms-block ms-stats-block">
                    <h3>📈 Estadísticas</h3>
                    <div class="ms-stats">
                        ${[['Remates', stats.shots], ['A puerta', stats.shotsOnTarget], ['Pases', stats.passes],
                           ['Precisión pases', stats.passAccuracy.map(v => v + '%')], ['Córners', stats.corners],
                           ['Fueras de juego', stats.offsides], ['Faltas', stats.fouls], ['Paradas', stats.saves]]
                          .map(([n, v]) => `<div class="ms-stat"><b>${v[0]}</b><span>${n}</span><b>${v[1]}</b></div>`).join('')}
                    </div>
                </div>
            </div>
            
            
            <div class="match-footer">
                <button class="btn-continue" onclick="this.closest('#matchSummaryModal').remove()">
                    ✅ Continuar
                </button>
            </div>
        </div>
    `;
    
    if (substitutions.length) {
        const list = document.createElement('div'); list.className = 'ms-block';
        const title = document.createElement('h3'); title.textContent = 'Sustituciones'; list.appendChild(title);
        for (const change of substitutions) {
            const row = document.createElement('div'); row.textContent = `${change.minute}' · ${change.team}: ${change.on} por ${change.off} (${change.reason})`; list.appendChild(row);
        }
        modal.querySelector('.match-container').appendChild(list);
    }
    ensureSummaryStyles();
    document.body.appendChild(modal);
    console.log('✅ Modal profesional añadido al DOM');
    
    // Auto-cerrar después de 15 segundos
    setTimeout(() => {
        const existingModal = document.getElementById('matchSummaryModal');
        if (existingModal) {
            existingModal.remove();
            console.log('⏱️ Modal cerrado automáticamente');
        }
    }, 30000);
};

console.log('✅ injector-match-summary.js PROFESIONAL cargado');


// Estilos del resumen (también los usa la página Resultados): una sola vez, al cargar
function ensureSummaryStyles() {
    if (document.getElementById('pcfMatchSummaryStyles')) return;
    const style = document.createElement('style');
    style.id = 'pcfMatchSummaryStyles';
    style.innerHTML = `
        #matchSummaryModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        :is(#matchSummaryModal, #last-result-content) .match-container {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 20px;
            padding: 20px 24px;
            max-width: 700px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            animation: slideIn 0.3s ease-out;
            position: relative;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-30px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        :is(#matchSummaryModal, #last-result-content) .match-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.2s;
        }
        
        :is(#matchSummaryModal, #last-result-content) .match-close:hover {
            background: rgba(255, 59, 48, 0.8);
            transform: rotate(90deg);
        }
        
        :is(#matchSummaryModal, #last-result-content) .match-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        :is(#matchSummaryModal, #last-result-content) .match-team {
            text-align: center;
        }
        
        :is(#matchSummaryModal, #last-result-content) .team-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #fff;
            margin-bottom: 10px;
        }
        
        :is(#matchSummaryModal, #last-result-content) .team-score {
            font-size: 3.5em;
            font-weight: bold;
            color: #4CAF50;
            text-shadow: 0 2px 10px rgba(76, 175, 80, 0.5);
        }
        
        :is(#matchSummaryModal, #last-result-content) .match-separator {
            font-size: 2.5em;
            color: rgba(255, 255, 255, 0.3);
        }
        
        :is(#matchSummaryModal, #last-result-content) h3 {
            color: #FFD700;
            margin: 25px 0 15px 0;
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goals-list,
        :is(#matchSummaryModal, #last-result-content) .cards-list,
        :is(#matchSummaryModal, #last-result-content) .injuries-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goal-item,
        :is(#matchSummaryModal, #last-result-content) .card-item,
        :is(#matchSummaryModal, #last-result-content) .injury-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 3px solid;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goal-item.home,
        :is(#matchSummaryModal, #last-result-content) .card-item.home {
            border-color: #4CAF50;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goal-item.away,
        :is(#matchSummaryModal, #last-result-content) .card-item.away {
            border-color: #FF5722;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goal-minute,
        :is(#matchSummaryModal, #last-result-content) .card-minute,
        :is(#matchSummaryModal, #last-result-content) .injury-minute {
            color: #FFD700;
            font-weight: bold;
            min-width: 35px;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goal-scorer,
        :is(#matchSummaryModal, #last-result-content) .card-player,
        :is(#matchSummaryModal, #last-result-content) .injury-player {
            color: white;
            font-weight: 600;
            flex: 1;
        }
        
        :is(#matchSummaryModal, #last-result-content) .goal-team,
        :is(#matchSummaryModal, #last-result-content) .card-team,
        :is(#matchSummaryModal, #last-result-content) .injury-team {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.9em;
        }
        
        :is(#matchSummaryModal, #last-result-content) .card-icon {
            font-size: 1.2em;
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-label {
            color: white;
            min-width: 120px;
            font-size: 0.95em;
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-bar {
            flex: 1;
            height: 24px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-fill {
            height: 100%;
            transition: width 1s ease-out;
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-fill.home {
            background: linear-gradient(90deg, #4CAF50, #66BB6A);
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-fill.away {
            background: linear-gradient(90deg, #FF5722, #FF7043);
        }
        
        :is(#matchSummaryModal, #last-result-content) .poss-value {
            color: #FFD700;
            font-weight: bold;
            min-width: 45px;
            text-align: right;
        }
        
        :is(#matchSummaryModal, #last-result-content) .ms-compact { display:flex; flex-direction:column; gap:10px; }
        :is(#matchSummaryModal, #last-result-content) .ms-block h3 { margin:0 0 6px; font-size:.82rem; text-align:center; }
        :is(#matchSummaryModal, #last-result-content) .ms-two { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        :is(#matchSummaryModal, #last-result-content) .ms-col { display:flex; flex-direction:column; gap:3px; }
        :is(#matchSummaryModal, #last-result-content) .ms-col.home { border-left:3px solid #4CAF50; padding-left:8px; text-align:left; align-items:flex-start; }
        :is(#matchSummaryModal, #last-result-content) .ms-col.away { border-right:3px solid #e53935; padding-right:8px; text-align:right; align-items:flex-end; }
        :is(#matchSummaryModal, #last-result-content) .ms-ev { font-size:.85rem; line-height:1.3; }
        :is(#matchSummaryModal, #last-result-content) .ms-min { color:#FFD700; font-weight:800; }
        :is(#matchSummaryModal, #last-result-content) .ms-none { opacity:.45; font-size:.85rem; }
        :is(#matchSummaryModal, #last-result-content) .ms-poss { display:grid; grid-template-columns:42px 1fr 42px; align-items:center; gap:8px; font-weight:800; font-size:.85rem; }
        :is(#matchSummaryModal, #last-result-content) .ms-poss span:last-child { text-align:right; }
        :is(#matchSummaryModal, #last-result-content) .ms-poss-bar { height:10px; border-radius:5px; background:#e53935; overflow:hidden; }
        :is(#matchSummaryModal, #last-result-content) .ms-poss-bar div { height:100%; background:#4CAF50; }
        :is(#matchSummaryModal, #last-result-content) .ms-stats { display:grid; grid-template-columns:1fr 1fr; gap:4px 14px; }
        :is(#matchSummaryModal, #last-result-content) .ms-stat { display:grid; grid-template-columns:38px 1fr 38px; align-items:center; font-size:.8rem; padding:3px 6px;
            background:rgba(255,255,255,.05); border-radius:3px; }
        :is(#matchSummaryModal, #last-result-content) .ms-stat span { text-align:center; opacity:.85; }
        :is(#matchSummaryModal, #last-result-content) .ms-stat b:last-child { text-align:right; }
        :is(#matchSummaryModal, #last-result-content) .stats-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        :is(#matchSummaryModal, #last-result-content) .stats-table tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        :is(#matchSummaryModal, #last-result-content) .stats-table td {
            padding: 12px 8px;
            color: white;
        }
        
        :is(#matchSummaryModal, #last-result-content) .stat-name {
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9em;
        }
        
        :is(#matchSummaryModal, #last-result-content) .stat-home,
        :is(#matchSummaryModal, #last-result-content) .stat-away {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        :is(#matchSummaryModal, #last-result-content) .stat-home {
            text-align: right;
            color: #4CAF50;
        }
        
        :is(#matchSummaryModal, #last-result-content) .stat-away {
            text-align: left;
            color: #FF5722;
        }
        
        :is(#matchSummaryModal, #last-result-content) .btn-continue {
            background: linear-gradient(135deg, #4CAF50, #66BB6A);
            color: white;
            border: none;
            padding: 12px 40px;
            border-radius: 25px;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
            width: 100%;
            margin-top: 20px;
        }
        
        :is(#matchSummaryModal, #last-result-content) .btn-continue:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.6);
        }
    `;
    document.head.appendChild(style);
}
if (document.head) ensureSummaryStyles(); else document.addEventListener('DOMContentLoaded', ensureSummaryStyles);
