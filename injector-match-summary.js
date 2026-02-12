<script>
// Injector autónomo para mostrar resumen de partido
window.injectMatchSummary = function(myMatchResult) {
    if (!myMatchResult) return;

    const homeTeam = myMatchResult.home;
    const awayTeam = myMatchResult.away;
    const homeGoals = myMatchResult.homeGoals;
    const awayGoals = myMatchResult.awayGoals;

    // --- Timeline de goles ---
    const goalTimeline = [];
    if (homeGoals > 0 && window.gameState && window.gameState.lineup) {
        const squad = window.gameState.lineup.filter(p => p.isStarting);
        for (let i = 0; i < homeGoals; i++) {
            const scorer = squad[i % squad.length].name; // repartir goles entre tus jugadores
            const minute = Math.floor(Math.random() * 90) + 1;
            goalTimeline.push({ team: homeTeam, scorer, minute });
        }
    }
    // Goles del rival simulados si hay goles en contra
    for (let i = 0; i < awayGoals; i++) {
        const minute = Math.floor(Math.random() * 90) + 1;
        goalTimeline.push({ team: awayTeam, scorer: `Rival${i+1}`, minute });
    }

    // --- Estadísticas simuladas pero realistas ---
    const stats = {
        possession: [
            Math.floor(Math.random() * 50) + 40, // tu equipo 40-89%
            100 - (Math.floor(Math.random() * 50) + 40)
        ],
        shots: [Math.max(homeGoals, Math.floor(Math.random() * 15)), Math.max(awayGoals, Math.floor(Math.random() * 15))],
        shotsOnTarget: [Math.floor(homeGoals/2) + 1, Math.floor(awayGoals/2) + 1],
        corners: [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)],
        offsides: [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)],
        passes: [Math.floor(Math.random() * 400)+300, Math.floor(Math.random() * 400)+300],
        fouls: [Math.floor(Math.random() * 15), Math.floor(Math.random() * 15)],
        yellowCards: [Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)],
        redCards: [0, 0],
        tackles: [Math.floor(Math.random() * 60), Math.floor(Math.random() * 60)],
        ballRecovered: [Math.floor(Math.random() * 60), Math.floor(Math.random() * 60)],
        goalkeeperSaves: [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)],
        substitutions: window.gameState?.lineup?.filter(p => !p.isStarting).slice(0,2).map((p,i) => ({
            team: homeTeam,
            out: window.gameState.lineup[i].name,
            in: p.name,
            minute: 60 + i*15
        })) || []
    };

    // --- Crear modal ---
    const modal = document.createElement('div');
    modal.id = 'matchSummaryModal';
    modal.innerHTML = `
        <div class="overlay" onclick="document.getElementById('matchSummaryModal').remove()"></div>
        <div class="container">
            <button class="close-btn" onclick="document.getElementById('matchSummaryModal').remove()">✖</button>

            <div class="header">
                <div class="team"><div class="name">${homeTeam}</div><div class="score">${homeGoals}</div></div>
                <div class="vs">-</div>
                <div class="team"><div class="name">${awayTeam}</div><div class="score">${awayGoals}</div></div>
            </div>

            <div class="goal-timeline-container">
                <div class="line"></div>
                ${goalTimeline.map(g => `
                    <div class="goal-event ${g.team===homeTeam?'home-goal':'away-goal'}" style="top:${g.minute}%;"><div class="marker"></div><div class="detail"><span class="minute">${g.minute}'</span> <span class="scorer">${g.scorer}</span></div></div>
                `).join('')}
            </div>

            <div class="possession-bars">
                <div class="team-bar home-bar"><div class="label">${homeTeam}</div><div class="bar"><div style="width:0%;"></div></div><div class="percent">${stats.possession[0]}%</div></div>
                <div class="team-bar away-bar"><div class="label">${awayTeam}</div><div class="bar"><div style="width:0%;"></div></div><div class="percent">${stats.possession[1]}%</div></div>
            </div>

            <h3>Estadísticas</h3>
            <table class="stats-table">
                <tr><th>${homeTeam}</th><th>Estadística</th><th>${awayTeam}</th></tr>
                <tr><td>${stats.shots[0]}</td><td>Remates</td><td>${stats.shots[1]}</td></tr>
                <tr><td>${stats.shotsOnTarget[0]}</td><td>Remates a portería</td><td>${stats.shotsOnTarget[1]}</td></tr>
                <tr><td>${stats.corners[0]}</td><td>Corners</td><td>${stats.corners[1]}</td></tr>
                <tr><td>${stats.offsides[0]}</td><td>Fueras de juego</td><td>${stats.offsides[1]}</td></tr>
                <tr><td>${stats.passes[0]}</td><td>Pases</td><td>${stats.passes[1]}</td></tr>
                <tr><td>${stats.fouls[0]}</td><td>Faltas</td><td>${stats.fouls[1]}</td></tr>
                <tr><td>${stats.yellowCards[0]}</td><td>🟨 Tarjetas amarillas</td><td>${stats.yellowCards[1]}</td></tr>
                <tr><td>${stats.redCards[0]}</td><td>🟥 Tarjetas rojas</td><td>${stats.redCards[1]}</td></tr>
                <tr><td>${stats.tackles[0]}</td><td>Duelos ganados</td><td>${stats.tackles[1]}</td></tr>
                <tr><td>${stats.ballRecovered[0]}</td><td>Balones recuperados</td><td>${stats.ballRecovered[1]}</td></tr>
                <tr><td>${stats.goalkeeperSaves[0]}</td><td>Paradas portero</td><td>${stats.goalkeeperSaves[1]}</td></tr>
            </table>

            <h3>Cambios</h3>
            <div class="substitutions">${stats.substitutions.map(s => `<div class="sub-event"><span class="minute">${s.minute}'</span> ${s.out} → ${s.in} (${s.team})</div>`).join('')}</div>
        </div>
    `;
    document.body.appendChild(modal);

    // --- CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        #matchSummaryModal {position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;font-family:sans-serif;}
        #matchSummaryModal .overlay {position:absolute;top:0;left:0;width:100%;height:100%;background: rgba(0,0,0,0.6);}
        #matchSummaryModal .container {position: relative; max-width: 900px; margin:50px auto; background:#fff; border-radius:8px; padding:20px; overflow-y:auto; max-height:90vh;}
        #matchSummaryModal .close-btn {position:absolute; top:10px; right:10px; font-size:20px; background:none; border:none; cursor:pointer;}
        #matchSummaryModal .header {display:flex;justify-content:center;align-items:center;font-size:1.5em;font-weight:bold;margin-bottom:20px;}
        #matchSummaryModal .team {text-align:center;margin:0 20px;}
        #matchSummaryModal .score {font-size:2em;margin-top:5px;}
        #matchSummaryModal .vs {font-size:1.5em;margin:0 10px;}
        #matchSummaryModal .goal-timeline-container {position:relative;height:300px;margin:20px 0;}
        #matchSummaryModal .goal-timeline-container .line {position:absolute;left:50%;top:0;transform:translateX(-50%);width:2px;height:100%;background:#ccc;}
        #matchSummaryModal .goal-event {position:absolute;display:flex;align-items:center;gap:5px;}
        #matchSummaryModal .goal-event .marker {width:10px;height:10px;border-radius:50%;background:#c73446;}
        #matchSummaryModal .goal-event.away-goal .marker {background:#2196F3;}
        #matchSummaryModal .goal-event .detail {font-size:0.85em;}
        #matchSummaryModal .possession-bars {display:flex;justify-content:space-around;gap:20px;margin-bottom:20px;}
        #matchSummaryModal .team-bar {display:flex;flex-direction:column;align-items:center;width:40%;}
        #matchSummaryModal .team-bar .label {margin-bottom:5px;font-weight:bold;}
        #matchSummaryModal .team-bar .bar {width:100%;height:15px;background:#eee;border-radius:5px;overflow:hidden;margin-bottom:5px;}
        #matchSummaryModal .team-bar .bar div {height:100%;background:#c73446;transition: width 1s;}
        #matchSummaryModal .team-bar.away-bar .bar div {background:#2196F3;}
        #matchSummaryModal .team-bar .percent {font-size:0.8em;}
        #matchSummaryModal .stats-table {width:100%;border-collapse:collapse;font-size:0.9em;margin-top:10px;}
        #matchSummaryModal .stats-table th,#matchSummaryModal .stats-table td {border:1px solid #ccc;padding:5px;text-align:center;}
        #matchSummaryModal .stats-table th {background:#f0f0f0;}
        #matchSummaryModal .substitutions {display:flex;flex-direction:column;gap:5px;font-size:0.85em;margin-top:10px;}
        #matchSummaryModal .sub-event {display:flex;gap:5px;}
    `;
    document.head.appendChild(style);

    // --- Animación posesión ---
    setTimeout(() => {
        document.querySelector('#matchSummaryModal .home-bar .bar div').style.width = stats.possession[0] + '%';
        document.querySelector('#matchSummaryModal .away-bar .bar div').style.width = stats.possession[1] + '%';
    }, 50);
};
</script>
