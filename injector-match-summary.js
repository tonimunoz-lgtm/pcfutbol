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

    // ========================================
    // GENERAR GOLEADORES CON MINUTOS REALISTAS
    // ========================================

    // Obtener estado del juego para usar jugadores reales
    const _gameState = window.gameLogic ? window.gameLogic.getGameState() : null;
    const _myTeam = _gameState ? _gameState.team : null;

    // Jugadores de nuestro equipo aptos para marcar (excluir portero)
    const _getMyTeamScorers = () => {
        if (!_gameState || !_gameState.lineup || _gameState.lineup.length === 0) return null;
        return _gameState.lineup.filter(p => p && p.position !== 'POR').map(p => p.name);
    };

    // Jugadores del equipo rival desde localStorage (si fueron cargados en admin)
    const _getRivalScorers = (rivalName) => {
        try {
            const stored = localStorage.getItem('team_data_' + rivalName);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.squad && Array.isArray(data.squad) && data.squad.length > 0) {
                    return data.squad.filter(p => p.position !== 'POR').map(p => p.name);
                }
            }
        } catch(e) {}
        return null;
    };

    // Pool de nombres genéricos de respaldo
    const _genericNames = [
        'García', 'Martínez', 'López', 'Sánchez', 'González',
        'Pérez', 'Rodríguez', 'Fernández', 'Jiménez', 'Romero',
        'Torres', 'Varela', 'Moreno', 'Ruiz', 'Herrera',
        'Díaz', 'Ortiz', 'Castro', 'Vega', 'Molina'
    ];

    const generateGoalScorers = (team, numGoals, isHome) => {
        const scorers = [];
        const usedMinutes = new Set();

        // Determinar pool de nombres
        let namePool = null;
        if (team === _myTeam) {
            namePool = _getMyTeamScorers();
        } else {
            namePool = _getRivalScorers(team);
        }
        if (!namePool || namePool.length === 0) namePool = _genericNames;

        for (let i = 0; i < numGoals; i++) {
            let minute;
            do {
                minute = Math.floor(Math.random() * 90) + 1;
            } while (usedMinutes.has(minute));
            usedMinutes.add(minute);

            scorers.push({
                name: namePool[Math.floor(Math.random() * namePool.length)],
                minute: minute,
                team: team
            });
        }

        return scorers.sort((a, b) => a.minute - b.minute);
    };
    
    const homeScorers = generateGoalScorers(homeTeam, homeGoals, true);
    const awayScorers = generateGoalScorers(awayTeam, awayGoals, false);
    const allGoals = [...homeScorers, ...awayScorers].sort((a, b) => a.minute - b.minute);

    // ========================================
    // ESTADÍSTICAS REALISTAS
    // ========================================
    const totalGoals = homeGoals + awayGoals;
    const goalDifference = Math.abs(homeGoals - awayGoals);
    
    // Posesión: equipo con más goles tiene más posesión (con algo de aleatoriedad)
    let homePossession = 50;
    if (homeGoals > awayGoals) {
        homePossession = 52 + Math.floor(Math.random() * 15) + (goalDifference * 3);
    } else if (awayGoals > homeGoals) {
        homePossession = 35 + Math.floor(Math.random() * 10) - (goalDifference * 3);
    } else {
        homePossession = 45 + Math.floor(Math.random() * 10);
    }
    homePossession = Math.max(30, Math.min(70, homePossession));
    const awayPossession = 100 - homePossession;
    
    // Estadísticas basadas en posesión y goles
    const stats = {
        possession: [homePossession, awayPossession],
        shots: [
            Math.max(homeGoals * 2, Math.floor(Math.random() * 8) + 8),
            Math.max(awayGoals * 2, Math.floor(Math.random() * 8) + 8)
        ],
        shotsOnTarget: [
            homeGoals + Math.floor(Math.random() * 4) + 2,
            awayGoals + Math.floor(Math.random() * 4) + 2
        ],
        corners: [Math.floor(Math.random() * 8) + 2, Math.floor(Math.random() * 8) + 2],
        fouls: [Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 12) + 8],
        yellowCards: [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)],
        redCards: [Math.random() < 0.1 ? 1 : 0, Math.random() < 0.1 ? 1 : 0],
        offsides: [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)],
        passes: [
            Math.floor(homePossession * 5 + Math.random() * 100),
            Math.floor(awayPossession * 5 + Math.random() * 100)
        ],
        passAccuracy: [
            Math.floor(70 + Math.random() * 20),
            Math.floor(70 + Math.random() * 20)
        ],
        saves: [
            awayGoals > 0 ? Math.floor(Math.random() * 5) + 2 : 0,
            homeGoals > 0 ? Math.floor(Math.random() * 5) + 2 : 0
        ]
    };

    // ========================================
    // GENERAR TARJETAS CON JUGADORES
    // ========================================
    const generateCards = (team, numYellow, numRed) => {
        const cards = [];
        let namePool = team === _myTeam ? _getMyTeamScorers() : _getRivalScorers(team);
        if (!namePool || namePool.length === 0) namePool = _genericNames;
        
        for (let i = 0; i < numYellow; i++) {
            cards.push({
                type: 'yellow',
                player: namePool[Math.floor(Math.random() * namePool.length)],
                minute: Math.floor(Math.random() * 90) + 1,
                team: team
            });
        }
        
        for (let i = 0; i < numRed; i++) {
            cards.push({
                type: 'red',
                player: namePool[Math.floor(Math.random() * namePool.length)],
                minute: Math.floor(Math.random() * 90) + 1,
                team: team
            });
        }
        
        return cards;
    };
    
    const homeCards = generateCards(homeTeam, stats.yellowCards[0], stats.redCards[0]);
    const awayCards = generateCards(awayTeam, stats.yellowCards[1], stats.redCards[1]);
    const allCards = [...homeCards, ...awayCards].sort((a, b) => a.minute - b.minute);

    // ========================================
    // LESIONES (opcional, con baja probabilidad)
    // ========================================
    const injuries = [];
    if (Math.random() < 0.2) {
        const injuredPlayer = ['Savic', 'Hermoso', 'Llorente', 'Correa'][Math.floor(Math.random() * 4)];
        injuries.push({
            player: injuredPlayer,
            minute: Math.floor(Math.random() * 90) + 1,
            team: Math.random() < 0.5 ? homeTeam : awayTeam
        });
    }

    // ========================================
    // CREAR MODAL HTML
    // ========================================
    const modal = document.createElement('div');
    modal.id = 'matchSummaryModal';
    
    modal.innerHTML = `
        <div class="match-container">
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
            
            ${allGoals.length > 0 ? `
            <div class="goals-section">
                <h3>⚽ Goles</h3>
                <div class="goals-list">
                    ${allGoals.map(g => `
                        <div class="goal-item ${g.team === homeTeam ? 'home' : 'away'}">
                            <span class="goal-minute">${g.minute}'</span>
                            <span class="goal-scorer">${g.name}</span>
                            <span class="goal-team">(${g.team})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="possession-section">
                <h3>📊 Posesión</h3>
                <div class="possession-bars">
                    <div class="poss-row">
                        <span class="poss-label">${homeTeam}</span>
                        <div class="poss-bar">
                            <div class="poss-fill home" style="width: ${stats.possession[0]}%"></div>
                        </div>
                        <span class="poss-value">${stats.possession[0]}%</span>
                    </div>
                    <div class="poss-row">
                        <span class="poss-label">${awayTeam}</span>
                        <div class="poss-bar">
                            <div class="poss-fill away" style="width: ${stats.possession[1]}%"></div>
                        </div>
                        <span class="poss-value">${stats.possession[1]}%</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-section">
                <h3>📈 Estadísticas</h3>
                <table class="stats-table">
                    <tr>
                        <td class="stat-home">${stats.shots[0]}</td>
                        <td class="stat-name">Remates</td>
                        <td class="stat-away">${stats.shots[1]}</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.shotsOnTarget[0]}</td>
                        <td class="stat-name">A puerta</td>
                        <td class="stat-away">${stats.shotsOnTarget[1]}</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.possession[0]}%</td>
                        <td class="stat-name">Posesión</td>
                        <td class="stat-away">${stats.possession[1]}%</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.passes[0]}</td>
                        <td class="stat-name">Pases</td>
                        <td class="stat-away">${stats.passes[1]}</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.passAccuracy[0]}%</td>
                        <td class="stat-name">Precisión pases</td>
                        <td class="stat-away">${stats.passAccuracy[1]}%</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.corners[0]}</td>
                        <td class="stat-name">Corners</td>
                        <td class="stat-away">${stats.corners[1]}</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.offsides[0]}</td>
                        <td class="stat-name">Fueras de juego</td>
                        <td class="stat-away">${stats.offsides[1]}</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.fouls[0]}</td>
                        <td class="stat-name">Faltas</td>
                        <td class="stat-away">${stats.fouls[1]}</td>
                    </tr>
                    <tr>
                        <td class="stat-home">${stats.saves[0]}</td>
                        <td class="stat-name">Paradas portero</td>
                        <td class="stat-away">${stats.saves[1]}</td>
                    </tr>
                </table>
            </div>
            
            ${allCards.length > 0 ? `
            <div class="cards-section">
                <h3>🟨🟥 Tarjetas</h3>
                <div class="cards-list">
                    ${allCards.map(c => `
                        <div class="card-item ${c.team === homeTeam ? 'home' : 'away'}">
                            <span class="card-icon">${c.type === 'yellow' ? '🟨' : '🟥'}</span>
                            <span class="card-minute">${c.minute}'</span>
                            <span class="card-player">${c.player}</span>
                            <span class="card-team">(${c.team})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${injuries.length > 0 ? `
            <div class="injuries-section">
                <h3>🚑 Lesiones</h3>
                <div class="injuries-list">
                    ${injuries.map(inj => `
                        <div class="injury-item">
                            <span class="injury-minute">${inj.minute}'</span>
                            <span class="injury-player">${inj.player}</span>
                            <span class="injury-team">(${inj.team})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="match-footer">
                <button class="btn-continue" onclick="this.closest('#matchSummaryModal').remove()">
                    ✅ Continuar
                </button>
            </div>
        </div>
    `;
    
    // Añadir estilos inline (para no modificar style.css)
    const style = document.createElement('style');
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
        
        #matchSummaryModal .match-container {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 20px;
            padding: 30px;
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
        
        #matchSummaryModal .match-close {
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
        
        #matchSummaryModal .match-close:hover {
            background: rgba(255, 59, 48, 0.8);
            transform: rotate(90deg);
        }
        
        #matchSummaryModal .match-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        #matchSummaryModal .match-team {
            text-align: center;
        }
        
        #matchSummaryModal .team-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #fff;
            margin-bottom: 10px;
        }
        
        #matchSummaryModal .team-score {
            font-size: 3.5em;
            font-weight: bold;
            color: #4CAF50;
            text-shadow: 0 2px 10px rgba(76, 175, 80, 0.5);
        }
        
        #matchSummaryModal .match-separator {
            font-size: 2.5em;
            color: rgba(255, 255, 255, 0.3);
        }
        
        #matchSummaryModal h3 {
            color: #FFD700;
            margin: 25px 0 15px 0;
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        #matchSummaryModal .goals-list,
        #matchSummaryModal .cards-list,
        #matchSummaryModal .injuries-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        #matchSummaryModal .goal-item,
        #matchSummaryModal .card-item,
        #matchSummaryModal .injury-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 3px solid;
        }
        
        #matchSummaryModal .goal-item.home,
        #matchSummaryModal .card-item.home {
            border-color: #4CAF50;
        }
        
        #matchSummaryModal .goal-item.away,
        #matchSummaryModal .card-item.away {
            border-color: #FF5722;
        }
        
        #matchSummaryModal .goal-minute,
        #matchSummaryModal .card-minute,
        #matchSummaryModal .injury-minute {
            color: #FFD700;
            font-weight: bold;
            min-width: 35px;
        }
        
        #matchSummaryModal .goal-scorer,
        #matchSummaryModal .card-player,
        #matchSummaryModal .injury-player {
            color: white;
            font-weight: 600;
            flex: 1;
        }
        
        #matchSummaryModal .goal-team,
        #matchSummaryModal .card-team,
        #matchSummaryModal .injury-team {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.9em;
        }
        
        #matchSummaryModal .card-icon {
            font-size: 1.2em;
        }
        
        #matchSummaryModal .poss-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        #matchSummaryModal .poss-label {
            color: white;
            min-width: 120px;
            font-size: 0.95em;
        }
        
        #matchSummaryModal .poss-bar {
            flex: 1;
            height: 24px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        
        #matchSummaryModal .poss-fill {
            height: 100%;
            transition: width 1s ease-out;
        }
        
        #matchSummaryModal .poss-fill.home {
            background: linear-gradient(90deg, #4CAF50, #66BB6A);
        }
        
        #matchSummaryModal .poss-fill.away {
            background: linear-gradient(90deg, #FF5722, #FF7043);
        }
        
        #matchSummaryModal .poss-value {
            color: #FFD700;
            font-weight: bold;
            min-width: 45px;
            text-align: right;
        }
        
        #matchSummaryModal .stats-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        #matchSummaryModal .stats-table tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        #matchSummaryModal .stats-table td {
            padding: 12px 8px;
            color: white;
        }
        
        #matchSummaryModal .stat-name {
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9em;
        }
        
        #matchSummaryModal .stat-home,
        #matchSummaryModal .stat-away {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        #matchSummaryModal .stat-home {
            text-align: right;
            color: #4CAF50;
        }
        
        #matchSummaryModal .stat-away {
            text-align: left;
            color: #FF5722;
        }
        
        #matchSummaryModal .btn-continue {
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
        
        #matchSummaryModal .btn-continue:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.6);
        }
    `;
    
    document.head.appendChild(style);
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
