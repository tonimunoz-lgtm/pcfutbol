// injector-match-summary.js
(function() {
    console.log('⚽ Match Summary Injector cargando...');

    window.injectMatchSummary = function(matchResult) {
        if (!matchResult) return;

        const homeTeam = matchResult.homeTeam;
        const awayTeam = matchResult.awayTeam;
        const homeGoals = matchResult.homeGoals;
        const awayGoals = matchResult.awayGoals;

        const goalTimeline = matchResult.goalTimeline || [];
        const substitutions = matchResult.substitutions || [];
        const cards = matchResult.cards || [];
        const stats = matchResult.stats || {
            possession: [50,50],
            shots: [0,0],
            shotsOnTarget: [0,0],
            corners: [0,0],
            offsides: [0,0],
            passes: [0,0],
            fouls: [0,0],
            yellowCards: [0,0],
            redCards: [0,0],
            tackles: [0,0],
            ballRecovered: [0,0],
            goalkeeperSaves: [0,0]
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

                ${substitutions.length ? `<h3>Cambios</h3>
                <ul class="substitutions">
                    ${substitutions.map(s => `<li>${s.minute}' - ${s.out} → ${s.in}</li>`).join('')}
                </ul>` : ''}

                ${cards.length ? `<h3>Tarjetas</h3>
                <ul class="cards">
                    ${cards.map(c => `<li>${c.minute}' - ${c.player} (${c.type})</li>`).join('')}
                </ul>` : ''}

                <h3>Estadísticas generales</h3>
                <table class="stats-table">
                    <tr><th>${homeTeam}</th><th>Estadística</th><th>${awayTeam}</th></tr>
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
            .match-summary-container { position: relative; max-width: 900px; margin: 50px auto; background: #fff; border-radius: 8px; padding: 20px; overflow-y: auto; max-height: 90vh; font-family: sans-serif; }
            .close-btn { position:absolute; top:10px; right:10px; font-size: 20px; background:none; border:none; cursor:pointer; }
            .match-header { display: flex; justify-content: space-around; font-size: 1.5em; font-weight:bold; margin-bottom: 20px; }
            .team-score { text-align:center; }
            .score { font-size: 2em; margin-top: 5px; }
            .goal-timeline { margin-bottom: 20px; max-height: 200px; overflow-y:auto; }
            .goal-event { margin: 5px 0; }
            .goal-event.home-goal { color: #c73446; }
            .goal-event.away-goal { color: #2196F3; }
            .stats-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top:10px; }
            .stats-table th, .stats-table td { border: 1px solid #ccc; padding: 5px; text-align:center; }
            .stats-table th { background:#f0f0f0; }
            .substitutions, .cards { list-style:none; padding-left:0; margin:10px 0; }
            .substitutions li, .cards li { padding:2px 0; }
        `;
        document.head.appendChild(style);
    };

    console.log('✅ Match Summary Injector cargado');
})();
