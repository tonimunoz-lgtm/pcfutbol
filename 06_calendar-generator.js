// calendar-generator-improved.js
// Generador de calendarios con alternancia local/visitante

(function() {
    'use strict';
    
    console.log('📅 Generador de Calendarios: Iniciando...');

    // ===========================================
    // CONFIGURACIÓN
    // ===========================================
    
    const CALENDAR_CONFIG = {
        // Restricciones
        MAX_CONSECUTIVE_HOME: 2,      // Máximo 2 partidos seguidos en casa
        MAX_CONSECUTIVE_AWAY: 2,      // Máximo 2 partidos seguidos fuera
        DERBY_MIN_SEPARATION: 10,     // Mínimo 10 jornadas entre derbis
        
        // Semanas especiales
        WINTER_BREAK: { start: 24, end: 25 },  // Parón invernal
        INTERNATIONAL_BREAKS: [8, 16, 27, 34], // Parón de selecciones
        
        // Competiciones
        CHAMPIONS_WEEKS: [2, 4, 6, 9, 11, 13],  // Jornadas de Champions
        EUROPA_WEEKS: [3, 5, 7, 10, 12, 14],     // Jornadas de Europa League
        COPA_WEEKS: [7, 15, 21, 28, 33]          // Jornadas de Copa del Rey
    };

    // ===========================================
    // ALGORITMO DE GENERACIÓN
    // ===========================================
    
    /**
     * Genera un calendario de liga completo
     */
    function generateLeagueCalendar(teams, userTeam) {
        console.log(`Generando calendario para ${teams.length} equipos`);
        
        const numTeams = teams.length;
        if (numTeams % 2 !== 0) {
            console.error('El número de equipos debe ser par');
            return null;
        }
        
        const numRounds = numTeams - 1;
        const matchesPerRound = numTeams / 2;
        
        // Algoritmo Round-Robin con alternancia mejorada
        const firstHalf = generateRoundRobin(teams, userTeam);
        const secondHalf = invertHomeAway(firstHalf);
        
        return [...firstHalf, ...secondHalf];
    }
    
    /**
     * Algoritmo Round-Robin mejorado
     */
    function generateRoundRobin(teams, userTeam) {
        const numTeams = teams.length;
        const numRounds = numTeams - 1;
        const rounds = [];
        
        // Crear copia de equipos para rotar
        const teamsList = [...teams];
        
        // Clasificar equipos por proximidad geográfica (simplificado)
        const teamsByRegion = classifyTeamsByRegion(teamsList);
        
        for (let round = 0; round < numRounds; round++) {
            const roundMatches = [];
            
            for (let i = 0; i < numTeams / 2; i++) {
                const home = teamsList[i];
                const away = teamsList[numTeams - 1 - i];
                
                if (home && away && home !== away) {
                    // Determinar local/visitante con preferencia de alternancia
                    let isHomeMatch = shouldBeHomeMatch(home, userTeam, round, rounds);
                    
                    roundMatches.push({
                        week: round + 1,
                        home: isHomeMatch ? home : away,
                        away: isHomeMatch ? away : home,
                        competition: 'Liga'
                    });
                }
            }
            
            rounds.push(roundMatches);
            
            // Rotar equipos (algoritmo Round-Robin estándar)
            rotateTeams(teamsList);
        }
        
        // Optimizar calendario para minimizar viajes consecutivos
        return optimizeCalendar(rounds, userTeam);
    }
    
    /**
     * Determina si un partido debería ser en casa
     */
    function shouldBeHomeMatch(team, userTeam, currentRound, previousRounds) {
        if (team !== userTeam) {
            // Para equipos rivales, alternar aleatoriamente
            return Math.random() < 0.5;
        }
        
        // Para el equipo del usuario, aplicar reglas estrictas
        const recentMatches = getRecentMatches(userTeam, previousRounds, 3);
        const homeCount = recentMatches.filter(m => m.isHome).length;
        const awayCount = recentMatches.filter(m => !m.isHome).length;
        
        // Evitar más de 2 seguidos
        if (homeCount >= CALENDAR_CONFIG.MAX_CONSECUTIVE_HOME) return false;
        if (awayCount >= CALENDAR_CONFIG.MAX_CONSECUTIVE_AWAY) return true;
        
        // Tender hacia el equilibrio
        if (homeCount > awayCount) return false;
        if (awayCount > homeCount) return true;
        
        // Si están equilibrados, alternar
        if (recentMatches.length > 0) {
            return !recentMatches[recentMatches.length - 1].isHome;
        }
        
        return currentRound % 2 === 0;
    }
    
    /**
     * Obtiene partidos recientes del equipo
     */
    function getRecentMatches(team, rounds, count) {
        const matches = [];
        
        for (let i = rounds.length - 1; i >= 0 && matches.length < count; i--) {
            const round = rounds[i];
            const teamMatch = round.find(m => m.home === team || m.away === team);
            
            if (teamMatch) {
                matches.push({
                    isHome: teamMatch.home === team,
                    opponent: teamMatch.home === team ? teamMatch.away : teamMatch.home
                });
            }
        }
        
        return matches.reverse();
    }
    
    /**
     * Rota equipos para el algoritmo Round-Robin
     */
    function rotateTeams(teams) {
        // El primer equipo se mantiene fijo, los demás rotan
        const fixed = teams[0];
        const rotating = teams.slice(1);
        
        // Rotar: último pasa a primero
        const last = rotating.pop();
        rotating.unshift(last);
        
        teams.splice(1, rotating.length, ...rotating);
    }
    
    /**
     * Invierte local/visitante para la segunda vuelta
     */
    function invertHomeAway(firstHalf) {
        return firstHalf.map((round, roundIndex) => {
            return round.map(match => ({
                week: roundIndex + firstHalf.length + 1,
                home: match.away,
                away: match.home,
                competition: 'Liga'
            }));
        });
    }
    
    /**
     * Optimiza el calendario para minimizar viajes consecutivos
     */
    function optimizeCalendar(rounds, userTeam) {
        // Intercambiar partidos dentro de jornadas para mejorar alternancia
        const optimized = JSON.parse(JSON.stringify(rounds));
        
        for (let i = 0; i < optimized.length - 1; i++) {
            const currentRound = optimized[i];
            const nextRound = optimized[i + 1];
            
            const currentTeamMatch = currentRound.find(m => 
                m.home === userTeam || m.away === userTeam
            );
            const nextTeamMatch = nextRound.find(m => 
                m.home === userTeam || m.away === userTeam
            );
            
            if (!currentTeamMatch || !nextTeamMatch) continue;
            
            const currentIsHome = currentTeamMatch.home === userTeam;
            const nextIsHome = nextTeamMatch.home === userTeam;
            
            // Si hay 2 consecutivos del mismo tipo, intentar intercambiar
            if (currentIsHome === nextIsHome && i < optimized.length - 2) {
                const futureRound = optimized[i + 2];
                const futureTeamMatch = futureRound?.find(m => 
                    m.home === userTeam || m.away === userTeam
                );
                
                if (futureTeamMatch) {
                    const futureIsHome = futureTeamMatch.home === userTeam;
                    
                    // Intercambiar si mejora la alternancia
                    if (futureIsHome !== nextIsHome) {
                        [nextRound[nextRound.indexOf(nextTeamMatch)], 
                         futureRound[futureRound.indexOf(futureTeamMatch)]] = 
                        [futureTeamMatch, nextTeamMatch];
                        
                        // Actualizar números de semana
                        nextTeamMatch.week = i + 2;
                        futureTeamMatch.week = i + 3;
                    }
                }
            }
        }
        
        return optimized;
    }

    // ===========================================
    // CLASIFICACIÓN GEOGRÁFICA
    // ===========================================
    
    /**
     * Clasifica equipos por región para optimizar viajes
     */
    function classifyTeamsByRegion(teams) {
        const regions = {
            madrid: [],
            cataluña: [],
            andalucía: [],
            valencia: [],
            norte: [],
            otros: []
        };
        
        teams.forEach(team => {
            const teamLower = team.toLowerCase();
            
            if (teamLower.includes('madrid') || teamLower.includes('getafe') || 
                teamLower.includes('rayo') || teamLower.includes('leganés')) {
                regions.madrid.push(team);
            } else if (teamLower.includes('barcelona') || teamLower.includes('español') || 
                       teamLower.includes('girona')) {
                regions.cataluña.push(team);
            } else if (teamLower.includes('sevilla') || teamLower.includes('betis') || 
                       teamLower.includes('cádiz') || teamLower.includes('granada') || 
                       teamLower.includes('málaga')) {
                regions.andalucía.push(team);
            } else if (teamLower.includes('valencia') || teamLower.includes('villarreal') || 
                       teamLower.includes('levante')) {
                regions.valencia.push(team);
            } else if (teamLower.includes('athletic') || teamLower.includes('real sociedad') || 
                       teamLower.includes('osasuna') || teamLower.includes('alavés')) {
                regions.norte.push(team);
            } else {
                regions.otros.push(team);
            }
        });
        
        return regions;
    }

    // ===========================================
    // INTEGRACIÓN CON COPA Y COMPETICIONES EUROPEAS
    // ===========================================
    
    /**
     * Integra partidos de Copa del Rey en el calendario
     */
    function integrateCopaDelRey(calendar, copaMatches) {
        if (!copaMatches || copaMatches.length === 0) return calendar;
        
        const integratedCalendar = [...calendar];
        
        CALENDAR_CONFIG.COPA_WEEKS.forEach((week, index) => {
            if (copaMatches[index]) {
                // Insertar partido de Copa en la semana correspondiente
                integratedCalendar[week - 1] = integratedCalendar[week - 1] || [];
                integratedCalendar[week - 1].push({
                    week: week,
                    home: copaMatches[index].home,
                    away: copaMatches[index].away,
                    competition: 'Copa del Rey',
                    round: copaMatches[index].round,
                    isCup: true
                });
            }
        });
        
        return integratedCalendar;
    }
    
    /**
     * Integra partidos de Champions/Europa League
     */
    function integrateEuropeanCompetition(calendar, europeanMatches, competition) {
        if (!europeanMatches || europeanMatches.length === 0) return calendar;
        
        const integratedCalendar = [...calendar];
        const weeks = competition === 'Champions' ? 
                     CALENDAR_CONFIG.CHAMPIONS_WEEKS : 
                     CALENDAR_CONFIG.EUROPA_WEEKS;
        
        weeks.forEach((week, index) => {
            if (europeanMatches[index]) {
                integratedCalendar[week - 1] = integratedCalendar[week - 1] || [];
                integratedCalendar[week - 1].push({
                    week: week,
                    home: europeanMatches[index].home,
                    away: europeanMatches[index].away,
                    competition: competition,
                    isEuropean: true
                });
            }
        });
        
        return integratedCalendar;
    }

    // ===========================================
    // VISUALIZACIÓN Y UTILIDADES
    // ===========================================
    
    /**
     * Formatea el calendario para mostrar
     */
    function formatCalendar(calendar, userTeam) {
        return calendar.map((round, index) => {
            const roundMatches = Array.isArray(round) ? round : [round];
            
            return {
                week: index + 1,
                matches: roundMatches.map(match => {
                    const isUserMatch = match.home === userTeam || match.away === userTeam;
                    const location = match.home === userTeam ? 'LOCAL' : 
                                   match.away === userTeam ? 'VISITANTE' : 'N/A';
                    const opponent = match.home === userTeam ? match.away : match.home;
                    
                    return {
                        ...match,
                        isUserMatch,
                        location,
                        opponent: isUserMatch ? opponent : null
                    };
                })
            };
        });
    }
    
    /**
     * Valida el calendario generado
     */
    function validateCalendar(calendar, userTeam) {
        const errors = [];
        let consecutiveHome = 0;
        let consecutiveAway = 0;
        
        calendar.forEach((round, index) => {
            const matches = Array.isArray(round) ? round : [round];
            const userMatch = matches.find(m => m.home === userTeam || m.away === userTeam);
            
            if (userMatch) {
                const isHome = userMatch.home === userTeam;
                
                if (isHome) {
                    consecutiveHome++;
                    consecutiveAway = 0;
                    
                    if (consecutiveHome > CALENDAR_CONFIG.MAX_CONSECUTIVE_HOME) {
                        errors.push(`Jornada ${index + 1}: Más de ${CALENDAR_CONFIG.MAX_CONSECUTIVE_HOME} partidos consecutivos en casa`);
                    }
                } else {
                    consecutiveAway++;
                    consecutiveHome = 0;
                    
                    if (consecutiveAway > CALENDAR_CONFIG.MAX_CONSECUTIVE_AWAY) {
                        errors.push(`Jornada ${index + 1}: Más de ${CALENDAR_CONFIG.MAX_CONSECUTIVE_AWAY} partidos consecutivos fuera`);
                    }
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Genera estadísticas del calendario
     */
    function getCalendarStats(calendar, userTeam) {
        let homeGames = 0;
        let awayGames = 0;
        const longestHomeStreak = { length: 0, startWeek: 0 };
        const longestAwayStreak = { length: 0, startWeek: 0 };
        
        let currentHomeStreak = 0;
        let currentAwayStreak = 0;
        let currentStreakStart = 0;
        
        calendar.forEach((round, index) => {
            const matches = Array.isArray(round) ? round : [round];
            const userMatch = matches.find(m => m.home === userTeam || m.away === userTeam);
            
            if (userMatch) {
                const isHome = userMatch.home === userTeam;
                
                if (isHome) {
                    homeGames++;
                    currentHomeStreak++;
                    currentAwayStreak = 0;
                    
                    if (currentHomeStreak === 1) currentStreakStart = index + 1;
                    if (currentHomeStreak > longestHomeStreak.length) {
                        longestHomeStreak.length = currentHomeStreak;
                        longestHomeStreak.startWeek = currentStreakStart;
                    }
                } else {
                    awayGames++;
                    currentAwayStreak++;
                    currentHomeStreak = 0;
                    
                    if (currentAwayStreak === 1) currentStreakStart = index + 1;
                    if (currentAwayStreak > longestAwayStreak.length) {
                        longestAwayStreak.length = currentAwayStreak;
                        longestAwayStreak.startWeek = currentStreakStart;
                    }
                }
            }
        });
        
        return {
            totalGames: homeGames + awayGames,
            homeGames,
            awayGames,
            homePercentage: (homeGames / (homeGames + awayGames) * 100).toFixed(1),
            longestHomeStreak,
            longestAwayStreak
        };
    }

    // ===========================================
    // EXPORTAR FUNCIONES GLOBALES
    // ===========================================
    
    window.CalendarGenerator = {
        // Generación
        generateLeague: generateLeagueCalendar,
        
        // Integración
        integrateCopa: integrateCopaDelRey,
        integrateEuropean: integrateEuropeanCompetition,
        
        // Utilidades
        format: formatCalendar,
        validate: validateCalendar,
        getStats: getCalendarStats,
        
        // Configuración
        CONFIG: CALENDAR_CONFIG
    };
    
    console.log('✅ Generador de Calendarios: Cargado correctamente');
    
})();
