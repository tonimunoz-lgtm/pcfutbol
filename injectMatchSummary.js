function injectMatchSummary(myMatch) {
    if (!myMatch) return;

    // Generamos estadísticas simuladas
    const stats = {
        possession: {
            home: 40 + Math.floor(Math.random() * 21), // 40-60%
            away: 0 // se calcula abajo
        },
        shots: {
            home: 5 + Math.floor(Math.random() * 10),
            away: 5 + Math.floor(Math.random() * 10)
        },
        shotsOnTarget: {
            home: 2 + Math.floor(Math.random() * 5),
            away: 2 + Math.floor(Math.random() * 5)
        },
        corners: {
            home: Math.floor(Math.random() * 6),
            away: Math.floor(Math.random() * 6)
        },
        offsides: {
            home: Math.floor(Math.random() * 5),
            away: Math.floor(Math.random() * 5)
        },
        passes: {
            home: 300 + Math.floor(Math.random() * 150),
            away: 300 + Math.floor(Math.random() * 150)
        },
        fouls: {
            home: Math.floor(Math.random() * 20),
            away: Math.floor(Math.random() * 20)
        },
        yellowCards: {
            home: Math.floor(Math.random() * 3),
            away: Math.floor(Math.random() * 3)
        },
        redCards: {
            home: Math.floor(Math.random() * 1),
            away: Math.floor(Math.random() * 1)
        },
        saves: {
            home: Math.floor(Math.random() * 6),
            away: Math.floor(Math.random() * 6)
        },
        duelsWon: {
            home: 40 + Math.floor(Math.random() * 20),
            away: 40 + Math.floor(Math.random() * 20)
        }
    };

    stats.possession.away = 100 - stats.possession.home;

    // Generar goleadores de manera random para simular timeline
    const scorers = [];
    for (let i = 0; i < myMatch.homeGoals; i++) {
        scorers.push({ team: myMatch.home, minute: Math.floor(Math.random() * 90) + 1, player: `Jugador H${i + 1}` });
    }
    for (let i = 0; i < myMatch.awayGoals; i++) {
        scorers.push({ team: myMatch.away, minute: Math.floor(Math.random() * 90) + 1, player: `Jugador A${i + 1}` });
    }

    // Ordenar goles por minuto
    scorers.sort((a, b) => a.minute - b.minute);

    // Render modal
    renderMatchSummaryModal({ 
        ...myMatch, 
        scorers,
        stats
    });
}
