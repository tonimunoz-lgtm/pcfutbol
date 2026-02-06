// european-competitions-system.js
// Sistema completo de Champions League y Europa League

(function() {
    'use strict';
    
    console.log('🌍 Sistema de Competiciones Europeas: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN
    // ===========================================
    
    const EUROPEAN_CONFIG = {
        // Champions League
        CHAMPIONS: {
            name: 'UEFA Champions League',
            teams: 32,
            groups: 8,
            teamsPerGroup: 4,
            groupStageWeeks: [2, 4, 6, 9, 11, 13],
            knockoutRounds: {
                ROUND_16: { name: 'Octavos', weeks: [17, 18], twoLegs: true },
                QUARTERS: { name: 'Cuartos', weeks: [23, 24], twoLegs: true },
                SEMIS: { name: 'Semifinales', weeks: [29, 30], twoLegs: true },
                FINAL: { name: 'Final', week: 36, neutral: true, venue: 'Wembley Stadium' }
            },
            prizes: {
                groupStage: 15000000,
                groupWin: 2800000,
                groupDraw: 930000,
                round16: 9600000,
                quarters: 10600000,
                semis: 12500000,
                runnerUp: 15500000,
                winner: 20000000
            },
            qualifiedPositions: [1, 2, 3, 4] // Posiciones de liga que clasifican
        },
        
        // Europa League
        EUROPA: {
            name: 'UEFA Europa League',
            teams: 32,
            groups: 8,
            teamsPerGroup: 4,
            groupStageWeeks: [3, 5, 7, 10, 12, 14],
            knockoutRounds: {
                ROUND_32: { name: 'Dieciseisavos', weeks: [19, 20], twoLegs: true },
                ROUND_16: { name: 'Octavos', weeks: [25, 26], twoLegs: true },
                QUARTERS: { name: 'Cuartos', weeks: [31, 32], twoLegs: true },
                SEMIS: { name: 'Semifinales', weeks: [33, 34], twoLegs: true },
                FINAL: { name: 'Final', week: 37, neutral: true, venue: 'Puskás Aréna' }
            },
            prizes: {
                groupStage: 3630000,
                groupWin: 630000,
                groupDraw: 210000,
                round32: 500000,
                round16: 1200000,
                quarters: 1800000,
                semis: 2800000,
                runnerUp: 4600000,
                winner: 8600000
            },
            qualifiedPositions: [5, 6] // Posiciones de liga que clasifican
        },
        
        // Conference League (opcional)
        CONFERENCE: {
            name: 'UEFA Conference League',
            qualifiedPositions: [7]
        }
    };

    // ===========================================
    // EQUIPOS EUROPEOS FICTICIOS
    // ===========================================
    
    const EUROPEAN_TEAMS = {
        england: [
            'Manchester City', 'Liverpool FC', 'Chelsea FC', 'Arsenal FC',
            'Manchester United', 'Tottenham', 'Newcastle', 'Aston Villa'
        ],
        germany: [
            'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
            'Union Berlin', 'Eintracht Frankfurt'
        ],
        italy: [
            'Inter Milan', 'AC Milan', 'Juventus', 'Napoli',
            'AS Roma', 'Lazio', 'Atalanta'
        ],
        france: [
            'PSG', 'Olympique Marseille', 'Monaco', 'Lyon',
            'Lille', 'Nice'
        ],
        portugal: [
            'Benfica', 'FC Porto', 'Sporting CP', 'Braga'
        ],
        netherlands: [
            'Ajax', 'PSV', 'Feyenoord', 'AZ Alkmaar'
        ],
        other: [
            'Celtic', 'Rangers', 'Shakhtar', 'Dynamo Kyiv',
            'Copenhagen', 'Red Star', 'Galatasaray', 'Fenerbahce'
        ]
    };

    // ===========================================
    // INICIALIZACIÓN
    // ===========================================
    
    /**
     * Inicializa Champions League
     */
    function initializeChampions(season, spanishTeams) {
        console.log(`🏆 Inicializando Champions League ${season}`);
        
        const champions = {
            season: season,
            competition: 'Champions League',
            phase: 'group',
            groups: {},
            qualified: {},
            matches: {},
            eliminated: [],
            champion: null,
            prizes: {}
        };
        
        // Generar grupos
        const allTeams = generateChampionsTeams(spanishTeams);
        champions.groups = generateGroups(allTeams, EUROPEAN_CONFIG.CHAMPIONS.groups);
        
        // Generar calendario de fase de grupos
        champions.matches.groupStage = generateGroupStageMatches(
            champions.groups,
            EUROPEAN_CONFIG.CHAMPIONS.groupStageWeeks
        );
        
        return champions;
    }
    
    /**
     * Inicializa Europa League
     */
    function initializeEuropa(season, spanishTeams) {
        console.log(`🏆 Inicializando Europa League ${season}`);
        
        const europa = {
            season: season,
            competition: 'Europa League',
            phase: 'group',
            groups: {},
            qualified: {},
            matches: {},
            eliminated: [],
            champion: null,
            prizes: {}
        };
        
        // Generar grupos
        const allTeams = generateEuropaTeams(spanishTeams);
        europa.groups = generateGroups(allTeams, EUROPEAN_CONFIG.EUROPA.groups);
        
        // Generar calendario de fase de grupos
        europa.matches.groupStage = generateGroupStageMatches(
            europa.groups,
            EUROPEAN_CONFIG.EUROPA.groupStageWeeks
        );
        
        return europa;
    }
    
    /**
     * Genera equipos participantes en Champions
     */
    function generateChampionsTeams(spanishTeams) {
        const teams = [...spanishTeams]; // 4 equipos españoles
        
        // Añadir equipos de otras ligas
        const leagueTeams = [
            ...EUROPEAN_TEAMS.england.slice(0, 4),
            ...EUROPEAN_TEAMS.germany.slice(0, 4),
            ...EUROPEAN_TEAMS.italy.slice(0, 4),
            ...EUROPEAN_TEAMS.france.slice(0, 3),
            ...EUROPEAN_TEAMS.portugal.slice(0, 2),
            ...EUROPEAN_TEAMS.netherlands.slice(0, 2),
            ...EUROPEAN_TEAMS.other.slice(0, 9)
        ];
        
        leagueTeams.forEach(teamName => {
            teams.push({
                name: teamName,
                country: getCountryFromTeam(teamName),
                overall: 75 + Math.floor(Math.random() * 15),
                coefficient: Math.random() * 100
            });
        });
        
        return teams.slice(0, EUROPEAN_CONFIG.CHAMPIONS.teams);
    }
    
    /**
     * Genera equipos participantes en Europa League
     */
    function generateEuropaTeams(spanishTeams) {
        const teams = [...spanishTeams]; // 2 equipos españoles
        
        // Añadir equipos de otras ligas
        const leagueTeams = [
            ...EUROPEAN_TEAMS.england.slice(4, 7),
            ...EUROPEAN_TEAMS.germany.slice(4, 6),
            ...EUROPEAN_TEAMS.italy.slice(4, 7),
            ...EUROPEAN_TEAMS.france.slice(3, 6),
            ...EUROPEAN_TEAMS.portugal.slice(2, 4),
            ...EUROPEAN_TEAMS.netherlands.slice(2, 4),
            ...EUROPEAN_TEAMS.other.slice(9, 20)
        ];
        
        leagueTeams.forEach(teamName => {
            teams.push({
                name: teamName,
                country: getCountryFromTeam(teamName),
                overall: 65 + Math.floor(Math.random() * 15),
                coefficient: Math.random() * 80
            });
        });
        
        return teams.slice(0, EUROPEAN_CONFIG.EUROPA.teams);
    }
    
    /**
     * Obtiene el país de un equipo
     */
    function getCountryFromTeam(teamName) {
        for (const [country, teams] of Object.entries(EUROPEAN_TEAMS)) {
            if (teams.includes(teamName)) {
                return country;
            }
        }
        return 'other';
    }

    // ===========================================
    // FASE DE GRUPOS
    // ===========================================
    
    /**
     * Genera los grupos
     */
    function generateGroups(teams, numGroups) {
        const groups = {};
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const teamsPerGroup = teams.length / numGroups;
        
        // Ordenar equipos por coeficiente (bombo)
        const sortedTeams = [...teams].sort((a, b) => b.coefficient - a.coefficient);
        
        // Distribuir en grupos
        for (let i = 0; i < numGroups; i++) {
            const groupName = groupNames[i];
            groups[groupName] = {
                name: groupName,
                teams: [],
                standings: {}
            };
        }
        
        // Distribuir equipos (uno de cada bombo a cada grupo)
        for (let bombo = 0; bombo < teamsPerGroup; bombo++) {
            for (let grupo = 0; grupo < numGroups; grupo++) {
                const teamIndex = bombo * numGroups + grupo;
                if (teamIndex < sortedTeams.length) {
                    const team = sortedTeams[teamIndex];
                    groups[groupNames[grupo]].teams.push(team);
                    
                    // Inicializar clasificación
                    groups[groupNames[grupo]].standings[team.name] = {
                        pj: 0, g: 0, e: 0, p: 0,
                        gf: 0, gc: 0, dg: 0, pts: 0
                    };
                }
            }
        }
        
        return groups;
    }
    
    /**
     * Genera partidos de fase de grupos
     */
    function generateGroupStageMatches(groups, weeks) {
        const allMatches = [];
        
        Object.entries(groups).forEach(([groupName, group]) => {
            const teams = group.teams;
            const groupMatches = generateRoundRobinForGroup(teams, groupName);
            
            // Asignar semanas
            groupMatches.forEach((match, index) => {
                match.week = weeks[index % weeks.length];
                match.competition = group.teams[0].competition || 'Champions League';
                match.group = groupName;
            });
            
            allMatches.push(...groupMatches);
        });
        
        return allMatches;
    }
    
    /**
     * Genera todos contra todos para un grupo
     */
    function generateRoundRobinForGroup(teams, groupName) {
        const matches = [];
        const n = teams.length;
        
        // Ida
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                matches.push({
                    home: teams[i].name,
                    away: teams[j].name,
                    homeTeam: teams[i],
                    awayTeam: teams[j],
                    played: false,
                    result: null
                });
            }
        }
        
        // Vuelta
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                matches.push({
                    home: teams[j].name,
                    away: teams[i].name,
                    homeTeam: teams[j],
                    awayTeam: teams[i],
                    played: false,
                    result: null
                });
            }
        }
        
        return matches;
    }
    
    /**
     * Simula un partido de fase de grupos
     */
    function simulateGroupMatch(match, standings) {
        const homeOverall = match.homeTeam.overall || 70;
        const awayOverall = match.awayTeam.overall || 70;
        
        // Ventaja de campo
        const homePower = homeOverall + 3;
        const awayPower = awayOverall;
        
        // Generar resultado
        const homeGoals = Math.max(0, Math.floor((Math.random() * homePower) / 20));
        const awayGoals = Math.max(0, Math.floor((Math.random() * awayPower) / 20));
        
        match.result = { homeGoals, awayGoals };
        match.played = true;
        
        // Actualizar clasificación
        updateGroupStandings(match, standings);
        
        return match.result;
    }
    
    /**
     * Actualiza la clasificación del grupo
     */
    function updateGroupStandings(match, standings) {
        const homeStats = standings[match.home];
        const awayStats = standings[match.away];
        
        if (!homeStats || !awayStats) return;
        
        const homeGoals = match.result.homeGoals;
        const awayGoals = match.result.awayGoals;
        
        // Actualizar estadísticas
        homeStats.pj++;
        awayStats.pj++;
        homeStats.gf += homeGoals;
        homeStats.gc += awayGoals;
        awayStats.gf += awayGoals;
        awayStats.gc += homeGoals;
        
        if (homeGoals > awayGoals) {
            homeStats.g++;
            homeStats.pts += 3;
            awayStats.p++;
        } else if (awayGoals > homeGoals) {
            awayStats.g++;
            awayStats.pts += 3;
            homeStats.p++;
        } else {
            homeStats.e++;
            awayStats.e++;
            homeStats.pts++;
            awayStats.pts++;
        }
        
        homeStats.dg = homeStats.gf - homeStats.gc;
        awayStats.dg = awayStats.gf - awayStats.gc;
    }
    
    /**
     * Obtiene los clasificados de los grupos
     */
    function getGroupQualified(groups) {
        const qualified = [];
        
        Object.entries(groups).forEach(([groupName, group]) => {
            const standings = Object.entries(group.standings)
                .map(([team, stats]) => ({ team, ...stats }))
                .sort((a, b) => {
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    if (b.dg !== a.dg) return b.dg - a.dg;
                    return b.gf - a.gf;
                });
            
            // Primero y segundo clasifican
            if (standings.length >= 2) {
                qualified.push({
                    name: standings[0].team,
                    group: groupName,
                    position: 1
                });
                qualified.push({
                    name: standings[1].team,
                    group: groupName,
                    position: 2
                });
            }
        });
        
        return qualified;
    }

    // ===========================================
    // FASE ELIMINATORIA
    // ===========================================
    
    /**
     * Genera eliminatorias
     */
    function generateKnockoutRound(qualified, roundKey, config) {
        const matches = [];
        const shuffled = shuffleArray([...qualified]);
        
        for (let i = 0; i < shuffled.length; i += 2) {
            const team1 = shuffled[i];
            const team2 = shuffled[i + 1];
            
            if (!team1 || !team2) continue;
            
            // Partido de ida
            const firstLeg = {
                round: roundKey,
                week: config.weeks[0],
                home: team1.name,
                away: team2.name,
                homeTeam: team1,
                awayTeam: team2,
                played: false,
                result: null,
                isFirstLeg: true
            };
            
            // Partido de vuelta
            const secondLeg = {
                round: roundKey,
                week: config.weeks[1],
                home: team2.name,
                away: team1.name,
                homeTeam: team2,
                awayTeam: team1,
                played: false,
                result: null,
                isFirstLeg: false,
                firstLegId: matches.length
            };
            
            matches.push(firstLeg, secondLeg);
        }
        
        return matches;
    }
    
    /**
     * Simula un partido de eliminatoria
     */
    function simulateKnockoutMatch(match) {
        const homeOverall = match.homeTeam.overall || 70;
        const awayOverall = match.awayTeam.overall || 70;
        
        const homePower = homeOverall + (match.neutral ? 0 : 3);
        const awayPower = awayOverall;
        
        let homeGoals = Math.max(0, Math.floor((Math.random() * homePower) / 18));
        let awayGoals = Math.max(0, Math.floor((Math.random() * awayPower) / 18));
        
        const result = { homeGoals, awayGoals, extraTime: false, penalties: false };
        
        // En partido de vuelta o final, puede haber prórroga
        if (!match.isFirstLeg || match.neutral) {
            // Determinar si hay prórroga (solo si es necesario)
            if (needsExtraTime(match, result)) {
                result.extraTime = true;
                homeGoals += Math.floor(Math.random() * 2);
                awayGoals += Math.floor(Math.random() * 2);
                result.homeGoals = homeGoals;
                result.awayGoals = awayGoals;
                
                // Si sigue empate, penaltis
                if (stillTied(match, result)) {
                    result.penalties = true;
                    result.penaltiesHome = 3 + Math.floor(Math.random() * 3);
                    result.penaltiesAway = 3 + Math.floor(Math.random() * 3);
                    
                    while (result.penaltiesHome === result.penaltiesAway) {
                        result.penaltiesHome = 3 + Math.floor(Math.random() * 3);
                        result.penaltiesAway = 3 + Math.floor(Math.random() * 3);
                    }
                }
            }
        }
        
        match.result = result;
        match.played = true;
        
        return result;
    }
    
    /**
     * Verifica si se necesita prórroga
     */
    function needsExtraTime(match, result) {
        if (match.neutral) {
            return result.homeGoals === result.awayGoals;
        }
        
        if (match.isFirstLeg) return false;
        
        // Buscar partido de ida
        // Por simplicidad, asumimos que está empate en agregado
        return Math.random() < 0.3; // 30% probabilidad de prórroga
    }
    
    /**
     * Verifica si sigue empate después de prórroga
     */
    function stillTied(match, result) {
        if (match.neutral) {
            return result.homeGoals === result.awayGoals;
        }
        
        // Simplificado: 50% probabilidad de penaltis
        return Math.random() < 0.5;
    }
    
    /**
     * Mezcla array aleatoriamente
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
    // PREMIOS
    // ===========================================
    
    /**
     * Otorga premio europeo
     */
    function awardEuropeanPrize(team, achievement, competition) {
        const config = competition === 'Champions' ? 
                      EUROPEAN_CONFIG.CHAMPIONS : 
                      EUROPEAN_CONFIG.EUROPA;
        
        const prize = config.prizes[achievement];
        
        if (prize && window.gameState && window.gameState.team === team) {
            window.gameState.balance += prize;
            
            if (window.addNews) {
                addNews(
                    `💰 Has ganado €${prize.toLocaleString()} en ${config.name}!`,
                    'success'
                );
            }
        }
    }

    // ===========================================
    // INTERFAZ DE USUARIO
    // ===========================================
    
    /**
     * Abre vista de competición europea
     */
    function openEuropeanView(competition) {
        const config = competition.competition === 'Champions League' ? 
                      EUROPEAN_CONFIG.CHAMPIONS : 
                      EUROPEAN_CONFIG.EUROPA;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '10000';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
                <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h1>🌍 ${config.name} ${competition.season}</h1>
                
                <div style="margin: 20px 0;">
                    <h2>Fase: ${competition.phase === 'group' ? 'Grupos' : 'Eliminatorias'}</h2>
                </div>
                
                <div id="europeanContent"></div>
                
                <button class="btn" style="margin-top: 20px;" onclick="this.closest('.modal').remove()">
                    Cerrar
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Renderizar contenido
        const content = modal.querySelector('#europeanContent');
        if (competition.phase === 'group') {
            renderGroupStage(competition, content);
        } else {
            renderKnockoutStage(competition, content);
        }
    }
    
    /**
     * Renderiza fase de grupos
     */
    function renderGroupStage(competition, container) {
        const html = Object.entries(competition.groups).map(([groupName, group]) => {
            const standings = Object.entries(group.standings)
                .map(([team, stats]) => ({ team, ...stats }))
                .sort((a, b) => {
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    if (b.dg !== a.dg) return b.dg - a.dg;
                    return b.gf - a.gf;
                });
            
            const standingsHtml = standings.map((team, index) => {
                const qualified = index < 2;
                return `
                    <tr style="background: ${qualified ? 'rgba(0,255,0,0.1)' : 'transparent'};">
                        <td style="padding: 8px;">${index + 1}</td>
                        <td style="padding: 8px;"><strong>${team.team}</strong></td>
                        <td style="padding: 8px; text-align: center;">${team.pj}</td>
                        <td style="padding: 8px; text-align: center;">${team.g}</td>
                        <td style="padding: 8px; text-align: center;">${team.e}</td>
                        <td style="padding: 8px; text-align: center;">${team.p}</td>
                        <td style="padding: 8px; text-align: center;">${team.gf}</td>
                        <td style="padding: 8px; text-align: center;">${team.gc}</td>
                        <td style="padding: 8px; text-align: center;">${team.dg}</td>
                        <td style="padding: 8px; text-align: center;"><strong>${team.pts}</strong></td>
                    </tr>
                `;
            }).join('');
            
            return `
                <div style="margin: 20px 0;">
                    <h3>Grupo ${groupName}</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: rgba(233,69,96,0.2);">
                                <th style="padding: 8px;">#</th>
                                <th style="padding: 8px;">Equipo</th>
                                <th style="padding: 8px;">PJ</th>
                                <th style="padding: 8px;">G</th>
                                <th style="padding: 8px;">E</th>
                                <th style="padding: 8px;">P</th>
                                <th style="padding: 8px;">GF</th>
                                <th style="padding: 8px;">GC</th>
                                <th style="padding: 8px;">DG</th>
                                <th style="padding: 8px;">PTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standingsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * Renderiza fase eliminatoria
     */
    function renderKnockoutStage(competition, container) {
        container.innerHTML = '<p style="color: #999;">Fase eliminatoria en desarrollo...</p>';
    }

    // ===========================================
    // EXPORTAR FUNCIONES GLOBALES
    // ===========================================
    
    window.EuropeanCompetitions = {
        // Inicialización
        initializeChampions,
        initializeEuropa,
        
        // Simulación
        simulateGroupMatch,
        simulateKnockoutMatch,
        
        // Gestión
        getGroupQualified,
        generateKnockoutRound,
        
        // Premios
        awardPrize: awardEuropeanPrize,
        
        // UI
        openView: openEuropeanView,
        
        // Configuración
        CONFIG: EUROPEAN_CONFIG
    };
    
    console.log('✅ Sistema de Competiciones Europeas: Cargado correctamente');
    
})();
