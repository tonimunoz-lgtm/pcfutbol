// injector-match-summary.js
window.injectMatchSummary = function(myMatchResult) {
    if (!myMatchResult) return;

    const homeTeam = myMatchResult.home;
    const awayTeam = myMatchResult.away;
    const homeGoals = myMatchResult.homeGoals;
    const awayGoals = myMatchResult.awayGoals;

    // Timeline de goles
    const goalTimeline = [];
    if (homeGoals > 0 && window.gameState && window.gameState.lineup) {
        const squad = window.gameState.lineup.filter(p => p.isStarting);
        for (let i = 0; i < homeGoals; i++) {
            const scorer = squad[i % squad.length].name;
            const minute = Math.floor(Math.random() * 90) + 1;
            goalTimeline.push({ team: homeTeam, scorer, minute });
        }
    }
    for (let i = 0; i < awayGoals; i++) {
        const minute = Math.floor(Math.random() * 90) + 1;
        goalTimeline.push({ team: awayTeam, scorer: `Rival${i+1}`, minute });
    }

    const stats = {
        possession: [Math.floor(Math.random()*50)+40, 100-(Math.floor(Math.random()*50)+40)],
        shots: [Math.max(homeGoals, Math.floor(Math.random()*15)), Math.max(awayGoals, Math.floor(Math.random()*15))],
        shotsOnTarget: [Math.floor(homeGoals/2)+1, Math.floor(awayGoals/2)+1],
        corners: [Math.floor(Math.random()*10), Math.floor(Math.random()*10)],
        offsides: [Math.floor(Math.random()*5), Math.floor(Math.random()*5)],
        passes: [Math.floor(Math.random()*400)+300, Math.floor(Math.random()*400)+300],
        fouls: [Math.floor(Math.random()*15), Math.floor(Math.random()*15)],
        yellowCards: [Math.floor(Math.random()*3), Math.floor(Math.random()*3)],
        redCards: [0,0],
        tackles: [Math.floor(Math.random()*60), Math.floor(Math.random()*60)],
        ballRecovered: [Math.floor(Math.random()*60), Math.floor(Math.random()*60)],
        goalkeeperSaves: [Math.floor(Math.random()*5), Math.floor(Math.random()*5)],
        substitutions: window.gameState?.lineup?.filter(p=>!p.isStarting).slice(0,2).map((p,i)=>({team:homeTeam,out:window.gameState.lineup[i].name,in:p.name,minute:60+i*15}))||[]
    };

    const modal = document.createElement('div');
    modal.id='matchSummaryModal';
    modal.innerHTML=`
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
                ${goalTimeline.map(g=>`<div class="goal-event ${g.team===homeTeam?'home-goal':'away-goal'}" style="top:${g.minute}%;"><div class="marker"></div><div class="detail"><span class="minute">${g.minute}'</span> <span class="scorer">${g.scorer}</span></div></div>`).join('')}
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
            <div class="substitutions">${stats.substitutions.map(s=>`<div class="sub-event"><span class="minute">${s.minute}'</span> ${s.out} → ${s.in} (${s.team})</div>`).join('')}</div>
        </div>
    `;
    document.body.appendChild(modal);

    const style=document.createElement('style');
    style.innerHTML=`/* aquí va todo el CSS que ya tenías */`;
    document.head.appendChild(style);

    setTimeout(()=>{
        document.querySelector('#matchSummaryModal .home-bar .bar div').style.width=stats.possession[0]+'%';
        document.querySelector('#matchSummaryModal .away-bar .bar div').style.width=stats.possession[1]+'%';
    },50);
};
</script>
