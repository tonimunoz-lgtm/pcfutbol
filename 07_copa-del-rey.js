// copa-del-rey-system.js
// Sistema completo de Copa del Rey

(function() {
    'use strict';
    
    console.log('🏆 Sistema de Copa del Rey: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN
    // ===========================================
    
    const COPA_CONFIG = {
        // Estructura de la competición
        ROUNDS: {
            ROUND_128: { name: 'Primera Ronda', teams: 128, startWeek: 5 },
            ROUND_64: { name: 'Segunda Ronda', teams: 64, startWeek: 7 },
            ROUND_32: { name: 'Dieciseisavos', teams: 32, startWeek: 10 },
            ROUND_16: { name: 'Octavos', teams: 16, startWeek: 15, twoLegs: true },
            QUARTERS: { name: 'Cuartos', teams: 8, startWeek: 21, twoLegs: true },
            SEMIS: { name: 'Semifinales', teams: 4, startWeek: 28, twoLegs: true },
            FINAL: { name: 'Final', teams: 2, startWeek: 35, neutral: true }
        },
        
        // Reglas de emparejamiento
        PAIRING_RULES: {
            lowerCategoryPlaysHome: true,  // Equipo de menor categoría juega en casa
            randomDraw: true,              // Sorteo aleatorio
            noSeeding: true                // Sin cabezas de serie
        },
        
        // Premios económicos (en euros)
        PRIZES: {
            ROUND_128: 6000,
            ROUND_64: 12000,
            ROUND_32: 24000,
            ROUND_16: 48000,
            QUARTERS: 96000,
            SEMIS: 192000,
            RUNNER_UP: 480000,
            WINNER: 1200000
        },
        
        // Divisiones y sus equipos
        DIVISIONS: {
            primera: 20,
            segunda: 22,
            rfef_grupo1: 20,
            rfef_grupo2: 20,
            tercera: 46  // Simulado
        }
    };

    // ===========================================
    // GESTIÓN DE LA COMPETICIÓN
    // ===========================================
    
    /**
     * Inicializa la Copa del Rey para una temporada
     */
    function initializeCopa(season, allTeams) {
        console.log(`🏆 Inicializando Copa del Rey ${season}`);
        
        const copa = {
            season: season,
            currentRound: 'ROUND_128',
            eliminated: [],
            qualified: {},
            matches: {},
            prizes: {},
            champion: null,
            runnerUp: null
        };
        
        // Clasificar equipos por división
        const teamsByDivision = classifyTeamsByDivision(allTeams);
        
        // Generar primera ronda (equipos de 3ª y 4ª división)
        const firstRoundTeams = [
            ...teamsByDivision.tercera.slice(0, 64),
            ...generateFakeLowerDivisionTeams(64)
        ];
        
        copa.matches.ROUND_128 = generateRoundMatches(
            firstRoundTeams, 
            'ROUND_128', 
            COPA_CONFIG.ROUNDS.ROUND_128.startWeek
        );
        
        return copa;
    }
    
    /**
     * Clasifica equipos por división
     */
    function classifyTeamsByDivision(allTeams) {
        const classified = {
            primera: [],
            segunda: [],
            rfef_grupo1: [],
            rfef_grupo2: [],
            tercera: []
        };
        
        allTeams.forEach(team => {
            const division = team.division || 'tercera';
            if (classified[division]) {
                classified[division].push(team);
            } else {
                classified.tercera.push(team);
            }
        });
        
        return classified;
    }
    
    /**
     * Genera equipos ficticios de divisiones inferiores
     */
    function generateFakeLowerDivisionTeams(count) {
        const prefixes = ['CF', 'CD', 'UD', 'SD', 'AD'];
        const cities = [
            'Alcalá', 'Mérida', 'Talavera', 'Ponferrada', 'Zamora',
            'Palencia', 'Soria', 'Ávila', 'Cuenca', 'Guadalajara',
            'Teruel', 'Segovia', 'Cáceres', 'Badajoz', 'Toledo',
            'Salamanca', 'Valladolid', 'León', 'Burgos', 'Logroño'
        ];
        
        const teams = [];
        for (let i = 0; i < count; i++) {
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const city = cities[Math.floor(Math.random() * cities.length)];
            const suffix = Math.random() < 0.3 ? ` ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}` : '';
            
            teams.push({
                name: `${prefix} ${city}${suffix}`,
                division: 'tercera',
                overall: 45 + Math.floor(Math.random() * 10)
            });
        }
        
        return teams;
    }

    // ===========================================
    // GENERACIÓN DE EMPAREJAMIENTOS
    // ===========================================
    
    /**
     * Genera los partidos de una ronda
     */
    function generateRoundMatches(teams, roundKey, startWeek) {
        const matches = [];
        const shuffled = shuffleArray([...teams]);
        const roundConfig = COPA_CONFIG.ROUNDS[roundKey];
        
        for (let i = 0; i < shuffled.length; i += 2) {
            const team1 = shuffled[i];
            const team2 = shuffled[i + 1];
            
            if (!team1 || !team2) continue;
            
            // Determinar local/visitante según categoría
            const match = determineHomeAway(team1, team2, roundConfig);
            match.round = roundKey;
            match.week = startWeek;
            match.competition = 'Copa del Rey';
            match.played = false;
            match.result = null;
            
            // Si es ida y vuelta, crear partido de vuelta
            if (roundConfig.twoLegs) {
                match.isFirstLeg = true;
                const returnMatch = {
                    ...match,
                    home: match.away,
                    away: match.home,
                    week: startWeek + 1,
                    isFirstLeg: false,
                    firstLegId: matches.length
                };
                matches.push(match);
                matches.push(returnMatch);
                i++; // Saltar siguiente para evitar duplicado
            } else {
                matches.push(match);
            }
        }
        
        return matches;
    }
    
    /**
     * Determina quién juega en casa según la categoría
     */
    function determineHomeAway(team1, team2, roundConfig) {
        // En final, campo neutral
        if (roundConfig.neutral) {
            return {
                home: team1.name,
                away: team2.name,
                homeTeam: team1,
                awayTeam: team2,
                neutral: true,
                venue: 'Estadio de La Cartuja (Sevilla)'
            };
        }
        
        // Equipo de menor categoría juega en casa
        if (COPA_CONFIG.PAIRING_RULES.lowerCategoryPlaysHome) {
            const divisionPriority = {
                'tercera': 4,
                'rfef_grupo2': 3,
                'rfef_grupo1': 3,
                'segunda': 2,
                'primera': 1
            };
            
            const priority1 = divisionPriority[team1.division] || 4;
            const priority2 = divisionPriority[team2.division] || 4;
            
            if (priority1 > priority2) {
                // team1 es de menor categoría, juega en casa
                return {
                    home: team1.name,
                    away: team2.name,
                    homeTeam: team1,
                    awayTeam: team2
                };
            } else if (priority2 > priority1) {
                // team2 es de menor categoría, juega en casa
                return {
                    home: team2.name,
                    away: team1.name,
                    homeTeam: team2,
                    awayTeam: team1
                };
            }
        }
        
        // Misma categoría: sorteo aleatorio
        if (Math.random() < 0.5) {
            return {
                home: team1.name,
                away: team2.name,
                homeTeam: team1,
                awayTeam: team2
            };
        } else {
            return {
                home: team2.name,
                away: team1.name,
                homeTeam: team2,
                awayTeam: team1
            };
        }
    }
    
    /**
     * Mezcla aleatoriamente un array (Fisher-Yates)
     */
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ===========================================
    // SIMULACIÓN DE PARTIDOS
    // ===========================================
    
    /**
     * Simula un partido de Copa
     */
    function simulateCopaMatch(match) {
        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;
        
        // Calcular probabilidades basadas en overall
        const homeOverall = homeTeam.overall || calculateTeamOverall(homeTeam);
        const awayOverall = awayTeam.overall || calculateTeamOverall(awayTeam);
        
        // Ventaja de campo
        let homeAdvantage = match.neutral ? 0 : 5;
        
        const homePower = homeOverall + homeAdvantage;
        const awayPower = awayOverall;
        
        // Generar resultado
        const result = generateMatchResult(homePower, awayPower);
        
        match.result = result;
        match.played = true;
        
        return result;
    }
    
    /**
     * Genera el resultado de un partido
     */
    function generateMatchResult(homePower, awayPower) {
        const totalPower = homePower + awayPower;
        const homeWinProb = homePower / totalPower;
        
        // Generar goles
        let homeGoals = 0;
        let awayGoals = 0;
        
        // Probabilidad base de gol
        const homeGoalChance = (homePower / 100) * 0.6;
        const awayGoalChance = (awayPower / 100) * 0.6;
        
        // Simular minutos de partido
        for (let minute = 0; minute < 90; minute++) {
            if (Math.random() < homeGoalChance / 90) homeGoals++;
            if (Math.random() < awayGoalChance / 90) awayGoals++;
        }
        
        const result = {
            homeGoals,
            awayGoals,
            winner: null,
            penalties: false
        };
        
        // Si hay empate, puede haber prórroga y penaltis
        if (homeGoals === awayGoals) {
            // Prórroga (30 minutos)
            for (let minute = 0; minute < 30; minute++) {
                if (Math.random() < homeGoalChance / 180) homeGoals++;
                if (Math.random() < awayGoalChance / 180) awayGoals++;
            }
            
            result.homeGoals = homeGoals;
            result.awayGoals = awayGoals;
            result.extraTime = true;
            
            // Si sigue empate, penaltis
            if (homeGoals === awayGoals) {
                result.penalties = true;
                result.penaltiesHome = Math.floor(Math.random() * 3) + 3; // 3-5
                result.penaltiesAway = Math.floor(Math.random() * 3) + 3; // 3-5
                
                // Asegurar que haya ganador
                while (result.penaltiesHome === result.penaltiesAway) {
                    result.penaltiesHome = Math.floor(Math.random() * 3) + 3;
                    result.penaltiesAway = Math.floor(Math.random() * 3) + 3;
                }
                
                result.winner = result.penaltiesHome > result.penaltiesAway ? 'home' : 'away';
            } else {
                result.winner = homeGoals > awayGoals ? 'home' : 'away';
            }
        } else {
            result.winner = homeGoals > awayGoals ? 'home' : 'away';
        }
        
        return result;
    }
    
    /**
     * Calcula el overall de un equipo
     */
    function calculateTeamOverall(team) {
        if (team.overall) return team.overall;
        if (!team.squad || team.squad.length === 0) return 60;
        
        const squadOveralls = team.squad.map(p => calculatePlayerOverall(p));
        const avgOverall = squadOveralls.reduce((a, b) => a + b, 0) / squadOveralls.length;
        
        return Math.round(avgOverall);
    }
    
    /**
     * Calcula el overall de un jugador
     */
    function calculatePlayerOverall(player) {
        if (player.overall) return player.overall;
        
        const attrs = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
        let sum = 0;
        attrs.forEach(attr => {
            sum += player[attr] || 50;
        });
        
        return Math.round(sum / attrs.length);
    }

    // ===========================================
    // GESTIÓN DE ELIMINATORIAS IDA Y VUELTA
    // ===========================================
    
    /**
     * Determina el ganador de una eliminatoria a doble partido
     */
    function determineTwoLegWinner(firstLeg, secondLeg) {
        const homeFirstLeg = firstLeg.result.homeGoals;
        const awayFirstLeg = firstLeg.result.awayGoals;
        const homeSecondLeg = secondLeg.result.homeGoals;
        const awaySecondLeg = secondLeg.result.awayGoals;
        
        // Calcular agregado
        const team1Total = homeFirstLeg + awaySecondLeg;
        const team2Total = awayFirstLeg + homeSecondLeg;
        
        if (team1Total > team2Total) {
            return { winner: firstLeg.home, aggregate: `${team1Total}-${team2Total}` };
        } else if (team2Total > team1Total) {
            return { winner: firstLeg.away, aggregate: `${team2Total}-${team1Total}` };
        } else {
            // Empate en agregado: goles fuera
            const team1Away = awayFirstLeg;
            const team2Away = homeFirstLeg;
            
            if (team1Away > team2Away) {
                return { winner: firstLeg.home, aggregate: `${team1Total}-${team2Total}`, awayGoals: true };
            } else if (team2Away > team1Away) {
                return { winner: firstLeg.away, aggregate: `${team2Total}-${team1Total}`, awayGoals: true };
            } else {
                // Penaltis (simulado en el partido de vuelta)
                if (secondLeg.result.penalties) {
                    return { 
                        winner: secondLeg.result.winner === 'home' ? secondLeg.home : secondLeg.away,
                        aggregate: `${team1Total}-${team2Total}`,
                        penalties: true
                    };
                }
                
                // Si no hay penaltis simulados, decidir aleatoriamente
                return {
                    winner: Math.random() < 0.5 ? firstLeg.home : firstLeg.away,
                    aggregate: `${team1Total}-${team2Total}`,
                    penalties: true
                };
            }
        }
    }

    // ===========================================
    // AVANCE DE RONDAS
    // ===========================================
    
    /**
     * Avanza a la siguiente ronda
     */
    function advanceToNextRound(currentRound, copa) {
        const roundKeys = Object.keys(COPA_CONFIG.ROUNDS);
        const currentIndex = roundKeys.indexOf(currentRound);
        
        if (currentIndex === -1 || currentIndex === roundKeys.length - 1) {
            console.log('🏆 Copa del Rey finalizada');
            return null;
        }
        
        const nextRoundKey = roundKeys[currentIndex + 1];
        const nextRoundConfig = COPA_CONFIG.ROUNDS[nextRoundKey];
        
        // Obtener clasificados de la ronda actual
        const qualified = getQualifiedTeams(currentRound, copa);
        
        if (qualified.length !== nextRoundConfig.teams) {
            console.error(`Error: Se esperaban ${nextRoundConfig.teams} equipos, se obtuvieron ${qualified.length}`);
            return null;
        }
        
        // Generar partidos de la siguiente ronda
        copa.matches[nextRoundKey] = generateRoundMatches(
            qualified,
            nextRoundKey,
            nextRoundConfig.startWeek
        );
        
        copa.currentRound = nextRoundKey;
        
        console.log(`✅ Avanzando a ${nextRoundConfig.name} con ${qualified.length} equipos`);
        
        return nextRoundKey;
    }
    
    /**
     * Obtiene los equipos clasificados de una ronda
     */
    function getQualifiedTeams(roundKey, copa) {
        const matches = copa.matches[roundKey];
        if (!matches) return [];
        
        const roundConfig = COPA_CONFIG.ROUNDS[roundKey];
        const qualified = [];
        
        if (roundConfig.twoLegs) {
            // Eliminatoria a doble partido
            for (let i = 0; i < matches.length; i += 2) {
                const firstLeg = matches[i];
                const secondLeg = matches[i + 1];
                
                if (!firstLeg.played || !secondLeg.played) continue;
                
                const result = determineTwoLegWinner(firstLeg, secondLeg);
                qualified.push({
                    name: result.winner,
                    division: firstLeg.homeTeam.name === result.winner ? 
                             firstLeg.homeTeam.division : firstLeg.awayTeam.division,
                    overall: firstLeg.homeTeam.name === result.winner ? 
                            firstLeg.homeTeam.overall : firstLeg.awayTeam.overall
                });
            }
        } else {
            // Partido único
            matches.forEach(match => {
                if (!match.played) return;
                
                const winner = match.result.winner === 'home' ? match.home : match.away;
                const winnerTeam = match.result.winner === 'home' ? match.homeTeam : match.awayTeam;
                
                qualified.push({
                    name: winner,
                    division: winnerTeam.division,
                    overall: winnerTeam.overall
                });
            });
        }
        
        return qualified;
    }

    // ===========================================
    // PREMIO Y NOTIFICACIONES
    // ===========================================
    
    /**
     * Otorga premio económico por avanzar de ronda
     */
    function awardRoundPrize(team, roundKey) {
        const prize = COPA_CONFIG.PRIZES[roundKey];
        
        if (prize && window.gameState && window.gameState.team === team) {
            window.gameState.balance += prize;
            
            if (window.addNews) {
                const roundName = COPA_CONFIG.ROUNDS[roundKey].name;
                addNews(
                    `💰 ¡Has ganado €${prize.toLocaleString()} por pasar de ${roundName} en la Copa del Rey!`,
                    'success'
                );
            }
        }
    }
    
    /**
     * Genera noticia de resultado de Copa
     */
    function generateCopaNews(match, result) {
        if (!window.addNews) return;
        
        const roundName = COPA_CONFIG.ROUNDS[match.round].name;
        
        if (result.penalties) {
            addNews(
                `🏆 Copa del Rey - ${roundName}: ${match.home} ${result.homeGoals} (${result.penaltiesHome}p) - ${result.awayGoals} (${result.penaltiesAway}p) ${match.away}`,
                'info'
            );
        } else if (result.extraTime) {
            addNews(
                `🏆 Copa del Rey - ${roundName}: ${match.home} ${result.homeGoals} - ${result.awayGoals} ${match.away} (tras prórroga)`,
                'info'
            );
        } else {
            addNews(
                `🏆 Copa del Rey - ${roundName}: ${match.home} ${result.homeGoals} - ${result.awayGoals} ${match.away}`,
                'info'
            );
        }
    }

    // ===========================================
    // INTERFAZ DE USUARIO
    // ===========================================
    
    /**
     * Abre la vista de Copa del Rey
     */
    function openCopaView(copa) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '10000';
        
        const roundConfig = COPA_CONFIG.ROUNDS[copa.currentRound];
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h1>🏆 Copa del Rey ${copa.season}</h1>
                
                <div style="margin: 20px 0;">
                    <h2>Ronda Actual: ${roundConfig.name}</h2>
                    <p style="color: #999;">Semana ${roundConfig.startWeek}</p>
                </div>
                
                <div id="copaMatches" style="margin-top: 20px;"></div>
                
                <button class="btn" style="margin-top: 20px;" onclick="this.closest('.modal').remove()">
                    Cerrar
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Renderizar partidos
        renderCopaMatches(copa, modal.querySelector('#copaMatches'));
    }
    
    /**
     * Renderiza los partidos de Copa
     */
    function renderCopaMatches(copa, container) {
        const matches = copa.matches[copa.currentRound] || [];
        
        if (matches.length === 0) {
            container.innerHTML = '<p style="color: #999;">No hay partidos programados</p>';
            return;
        }
        
        const html = matches.map((match, index) => {
            const resultHtml = match.played ? 
                `<strong>${match.result.homeGoals} - ${match.result.awayGoals}</strong>
                 ${match.result.penalties ? ' (pen.)' : ''}
                 ${match.result.extraTime ? ' (pró.)' : ''}` :
                '<em>Por jugar</em>';
            
            const isUserMatch = window.gameState && 
                               (window.gameState.team === match.home || 
                                window.gameState.team === match.away);
            
            return `
                <div class="match-card" style="
                    background: ${isUserMatch ? 'rgba(233,69,96,0.1)' : 'rgba(255,255,255,0.05)'};
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 5px;
                    border-left: 3px solid ${isUserMatch ? '#e94560' : 'transparent'};
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <strong>${match.home}</strong>
                            ${match.neutral ? '(N)' : ''}
                        </div>
                        <div style="padding: 0 20px;">
                            ${resultHtml}
                        </div>
                        <div style="flex: 1; text-align: right;">
                            <strong>${match.away}</strong>
                        </div>
                    </div>
                    ${match.isFirstLeg ? '<small style="color: #999;">Partido de ida</small>' : ''}
                    ${match.isFirstLeg === false ? '<small style="color: #999;">Partido de vuelta</small>' : ''}
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    // ===========================================
    // INTEGRACIÓN CON EL JUEGO
    // ===========================================
    
    /**
     * Hook para integrar Copa en el avance semanal
     */
    function hookWeeklyAdvance() {
        if (!window.gameLogic || !window.gameLogic.advanceWeek) {
            console.warn('gameLogic.advanceWeek no disponible');
            return;
        }
        
        const originalAdvanceWeek = window.gameLogic.advanceWeek;
        
        window.gameLogic.advanceWeek = function() {
            // Llamar a la función original
            const result = originalAdvanceWeek.apply(this, arguments);
            
            // Procesar Copa del Rey
            if (window.gameState && window.gameState.copa) {
                processCopaDuringWeek(window.gameState);
            }
            
            return result;
        };
        
        console.log('✅ Hook de Copa del Rey instalado');
    }
    
    /**
     * Procesa Copa del Rey durante el avance semanal
     */
    function processCopaDuringWeek(gameState) {
        const copa = gameState.copa;
        if (!copa) return;
        
        const currentWeek = gameState.week;
        const currentRoundConfig = COPA_CONFIG.ROUNDS[copa.currentRound];
        
        // Verificar si hay partido de Copa esta semana
        const matches = copa.matches[copa.currentRound] || [];
        const weekMatches = matches.filter(m => m.week === currentWeek && !m.played);
        
        if (weekMatches.length > 0) {
            // Simular partidos de esta semana
            weekMatches.forEach(match => {
                const result = simulateCopaMatch(match);
                generateCopaNews(match, result);
            });
            
            // Verificar si la ronda ha terminado
            const allPlayed = matches.every(m => m.played);
            
            if (allPlayed) {
                // Avanzar a siguiente ronda
                const nextRound = advanceToNextRound(copa.currentRound, copa);
                
                if (nextRound) {
                    if (window.addNews) {
                        const nextRoundConfig = COPA_CONFIG.ROUNDS[nextRound];
                        addNews(
                            `🏆 Copa del Rey: ¡Clasificado para ${nextRoundConfig.name}!`,
                            'success'
                        );
                    }
                    
                    // Otorgar premio
                    awardRoundPrize(gameState.team, copa.currentRound);
                } else {
                    // Final terminada
                    if (copa.matches.FINAL && copa.matches.FINAL[0].played) {
                        const finalMatch = copa.matches.FINAL[0];
                        const winner = finalMatch.result.winner === 'home' ? 
                                      finalMatch.home : finalMatch.away;
                        
                        copa.champion = winner;
                        
                        if (winner === gameState.team) {
                            awardRoundPrize(gameState.team, 'WINNER');
                            
                            if (window.addNews) {
                                addNews(
                                    `🏆🎉 ¡¡¡CAMPEONES DE LA COPA DEL REY!!! Has ganado €${COPA_CONFIG.PRIZES.WINNER.toLocaleString()}`,
                                    'success'
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    // ===========================================
    // EXPORTAR FUNCIONES GLOBALES
    // ===========================================
    
    window.CopaDelRey = {
        // Inicialización
        initialize: initializeCopa,
        
        // Simulación
        simulateMatch: simulateCopaMatch,
        
        // Gestión
        advanceRound: advanceToNextRound,
        getQualified: getQualifiedTeams,
        
        // Premio
        awardPrize: awardRoundPrize,
        
        // UI
        openView: openCopaView,
        
        // Configuración
        CONFIG: COPA_CONFIG
    };
    
    // Instalar hooks
    function waitForGameLogicAndHook() {
    const maxAttempts = 50;
    let attempts = 0;

    const interval = setInterval(() => {
        if (window.gameLogic && typeof window.gameLogic.advanceWeek === 'function') {
            hookWeeklyAdvance();
            clearInterval(interval);
        }

        attempts++;
        if (attempts >= maxAttempts) {
            console.warn('❌ No se pudo instalar hook de Copa (gameLogic no disponible)');
            clearInterval(interval);
        }
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForGameLogicAndHook);
} else {
    waitForGameLogicAndHook();
}

    
    console.log('✅ Sistema de Copa del Rey: Cargado correctamente');
    
})();
