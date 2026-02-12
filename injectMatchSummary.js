function injectMatchSummary(matchResult) {
    // --- Datos simulados para ejemplo (puedes reemplazar con datos reales) ---
    const homeTeam = matchResult.home;
    const awayTeam = matchResult.away;
    const homeGoals = matchResult.homeGoals;
    const awayGoals = matchResult.awayGoals;

    const goalTimeline = [
        { team: homeTeam, minute: 6, scorer: 'Eric García', type: 'p.p.' },
        { team: homeTeam, minute: 14, scorer: 'Griezmann' },
        { team: homeTeam, minute: 33, scorer: 'Lookman' },
    ];

    const stats = {
        possession: [47, 53],
        shots: [13, 12],
        shotsOnTarget: [3, 6],
        corners: [4, 4],
        offsides: [2, 4],
        passes: [374, 425],
        fouls: [12, 18],
        yellowCards: [1, 3],
        redCards: [0, 0],
        tackles: [52, 48],
        ballRecovered: [48, 59],
        goalkeeperSaves: [5, 3],
    };

    // --- Crear modal ---
    const modal = document.createElement('div');
    modal.id = 'matchSummaryModal';
    modal.innerHTML = `
        <div class="match-summary-overlay" onclick="document.getElementById('matchSummaryModal').remove()"></div>
        <div class="match-summary-container">
            <button class="close-btn" onclick="document.getElementById('matchSummaryModal').remove()">✖</button>
            <div class="match-header">
                <div class="team-score">
                    <div class="team-name">${homeTeam}</div>
                    <div class="score">${homeGoals}</div>
                </div>
                <div class="team-score">
                    <div class="team-name">${awayTeam}</div>
                    <div class="score">${awayGoals}</div>
                </div>
            </div>

            <div class="goal-timeline">
                ${goalTimeline.map(g => `
                    <div class="goal-event ${g.team === homeTeam ? 'home-goal' : 'away-goal'}">
                        <span class="minute">(${g.minute}')</span>
                        ${g.type ? `<span class="type">(${g.type})</span>` : ''}
                        <span class="scorer">${g.scorer}</span>
                    </div>
                `).join('')}
            </div>

            <h3>Estadísticas generales</h3>
            <table class="stats-table">
                <tr>
                    <th>${homeTeam}</th><th>Estadística</th><th>${awayTeam}</th>
                </tr>
                <tr><td>${stats.possession[0]}%</td><td>Posesión</td><td>${stats.possession[1]}%</td></tr>
                <tr><td>${stats.shots[0]}</td><td>Remates</td><td>${stats.shots[1]}</td></tr>
                <tr><td>${stats.shotsOnTarget[0]}</td><td>Remates a portería</td><td>${stats.shotsOnTarget[1]}</td></tr>
                <tr><td>${stats.corners[0]}</td><td>Corners</td><td>${stats.corners[1]}</td></tr>
                <tr><td>${stats.offsides[0]}</td><td>Fueras de juego</td><td>${stats.offsides[1]}</td></tr>
                <tr><td>${stats.passes[0]}</td><td>Pases</td><td>${stats.passes[1]}</td></tr>
                <tr><td>${stats.fouls[0]}</td><td>Faltas</td><td>${stats.fouls[1]}</td></tr>
                <tr><td>${stats.yellowCards[0]}</td><td>Tarjetas amarillas</td><td>${stats.yellowCards[1]}</td></tr>
                <tr><td>${stats.redCards[0]}</td><td>Tarjetas rojas</td><td>${stats.redCards[1]}</td></tr>
                <tr><td>${stats.tackles[0]}</td><td>Duelos ganados</td><td>${stats.tackles[1]}</td></tr>
                <tr><td>${stats.ballRecovered[0]}</td><td>Balones recuperados</td><td>${stats.ballRecovered[1]}</td></tr>
                <tr><td>${stats.goalkeeperSaves[0]}</td><td>Paradas portero</td><td>${stats.goalkeeperSaves[1]}</td></tr>
            </table>
        </div>
    `;

    document.body.appendChild(modal);

    // --- CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        #matchSummaryModal { position: fixed; top:0; left:0; width:100%; height:100%; z-index:10000; }
        .match-summary-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); }
        .match-summary-container { position: relative; max-width: 800px; margin: 50px auto; background: #fff; border-radius: 8px; padding: 20px; overflow-y: auto; max-height: 90vh; font-family: sans-serif; }
        .close-btn { position:absolute; top:10px; right:10px; font-size: 20px; background:none; border:none; cursor:pointer; }
        .match-header { display: flex; justify-content: space-around; font-size: 1.5em; font-weight:bold; margin-bottom: 20px; }
        .team-score { text-align:center; }
        .score { font-size: 2em; margin-top: 5px; }
        .goal-timeline { margin-bottom: 20px; }
        .goal-event { margin: 5px 0; }
        .goal-event.home-goal { color: #c73446; }
        .goal-event.away-goal { color: #2196F3; }
        .stats-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top:10px; }
        .stats-table th, .stats-table td { border: 1px solid #ccc; padding: 5px; text-align:center; }
        .stats-table th { background:#f0f0f0; }
    `;
    document.head.appendChild(style);
}
