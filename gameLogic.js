// gameLogic.js - Lógica central del juego  

import {  
    TEAMS_DATA, ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS,  
    STAFF_ROLES, STAFF_LEVEL_EFFECTS, DIVISION_MULTIPLIERS,  
    BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS,  
    FORMATIONS, PRESEASON_WEEKS, PROMOTION_RELEGATION // Eliminado SEASON_WEEKS de aquí  
} from './config.js';  
import { getPlayerMarket as getPlayerMarketData, getYoungsterMarket as getYoungsterMarketData, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall, generateRandomName } from './players.js';  
import { getTeamData, saveTeamData } from './teamData.js';


// Primera temporada de una partida nueva
const FIRST_SEASON = '2026/2027';

// Estado global del juego  
const gameState = {  
    team: null, 
    teamLogo: null, // NUEVO
    stadiumImage: null, // NUEVO
    stadiumName: 'Estadio', // NUEVO
    playerPurchases: 0,      // ✅ AÑADIR
    playerSalesIncome: 0,    // ✅ AÑADIR
    playerCompensations: 0, 
    week: 1,  
    division: 'Primera', // La división actual del equipo del jugador (puede ser 'rfef_grupo1' etc.)  
    squad: [],  
    academy: [],  
    standings: {},  
    stadiumCapacity: 5000,  
    ticketPrice: 20,  
    merchandisingRevenue: 500,  
    staff: {  
        medico: null,  
        entrenador: null,  
        entrenadorPorteros: null,  
        fisio: null,  
        analista: null,  
        scout: null,  
        secretario: null,  
        segundoEntrenador: null,
        entrenadorJuveniles: null  
    },  
    balance: 50000,  
    weeklyIncomeBase: 5000,  
    weeklyIncome: 0,  
    weeklyExpenses: 0,  
    formation: '433',  
    lineup: [],  
    mentality: 'balanced',  
    trainingLevel: 1,  
    matchHistory: [],  
    popularity: 50,  
    fanbase: 10000,  
    merchandisingPrice: 10,  
    merchandisingItemsSold: 0,  
    negotiatingPlayer: null,  
    negotiationStep: 0,  
    playerOffer: null,  
    clubOffer: null,  
    trainingFocus: {  
        playerIndex: -1,  
        attribute: null  
    },  
    newsFeed: [],  
    unreadNewsCount: 0,  
    currentSeason: '2026/2027',  
    seasonType: 'preseason',  
    leagueTeams: [],  
    nextOpponent: null,  
    cupProgress: 0,  
    europeanProgress: 0,  
    // NEW: Para almacenar el calendario de la temporada  
    seasonCalendar: [],  
    // NEW: Máximo de semanas en la temporada (dinámico)  
    maxSeasonWeeks: 38  
};  
  
function getGameState() {  
    return JSON.parse(JSON.stringify(gameState));  
}  
  
function updateGameState(newState) {  
    // Muchos módulos toman una copia del estado, añaden noticias (que van al
    // estado real) y luego guardan la copia entera: sin esto, esas noticias se
    // perdían. Se conservan las noticias más nuevas que no traiga la copia.
    if (newState && Array.isArray(newState.newsFeed) && newState.newsFeed !== gameState.newsFeed) {
        const incomingMax = newState.newsFeed.reduce((m, n) => Math.max(m, n?.id || 0), 0);
        const incomingIds = new Set(newState.newsFeed.map(n => n?.id).filter(Boolean));
        const fresh = (gameState.newsFeed || []).filter(n => n?.id && n.id > incomingMax && !incomingIds.has(n.id));
        if (fresh.length) {
            newState = { ...newState, newsFeed: [...fresh, ...newState.newsFeed].slice(0, 40),
                unreadNewsCount: Math.max(newState.unreadNewsCount || 0, gameState.unreadNewsCount || 0) };
        }
    }
    Object.assign(gameState, newState);  
    updateWeeklyFinancials();  
}  

let newsSeq = Date.now();
  
function addNews(message, type = 'info', read = false) {  
    gameState.newsFeed.unshift({ id: ++newsSeq, week: gameState.week, message: message, timestamp: Date.now(), type: type, read: read });  
    if (gameState.newsFeed.length > 40) {  
        gameState.newsFeed.pop();  
    }  
    if (type !== 'system' && !read) { // Solo incrementar contador si no es una noticia del sistema  
        gameState.unreadNewsCount++;  
    }  
}  
  
function markNewsAsRead() {  
    gameState.unreadNewsCount = 0;  
}  
  
function initStandings(teamsArray) {  
    const standings = {};  
    teamsArray.forEach(team => {  
        standings[team] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };  
    });  
    return standings;  
}  
  


// Genera calendario de liga con alternancia más realista de casa/fuera
function generateLeagueCalendar(teams) {
    const numTeams = teams.length;
    if (numTeams < 2) return [];

    // Si número de equipos impar, añadimos "BYE"
    let tempTeams = [...teams];
    if (numTeams % 2 !== 0) tempTeams.push("BYE");

    const numRounds = tempTeams.length - 1;
    const schedule = [];
    const homeAwayTracker = {}; // trackeamos última localía de cada equipo

    tempTeams.forEach(t => homeAwayTracker[t] = null);

    for (let round = 0; round < numRounds; round++) {
        for (let i = 0; i < tempTeams.length / 2; i++) {
            let homeTeam = tempTeams[i];
            let awayTeam = tempTeams[tempTeams.length - 1 - i];

            if (homeTeam === "BYE" || awayTeam === "BYE") continue;

            // Evitar 2 partidos seguidos en casa o fuera
            if (homeAwayTracker[homeTeam] === 'home' && homeAwayTracker[awayTeam] === 'away') {
                [homeTeam, awayTeam] = [awayTeam, homeTeam];
            } else if (homeAwayTracker[homeTeam] === 'home' && homeAwayTracker[awayTeam] === 'home') {
                // si ambos jugaron en casa, invertir para balancear
                [homeTeam, awayTeam] = [awayTeam, homeTeam];
            }

            schedule.push({
                home: homeTeam,
                away: awayTeam,
                week: round + 1,
                homeGoals: null,
                awayGoals: null
            });

            // Actualizar tracker
            homeAwayTracker[homeTeam] = 'home';
            homeAwayTracker[awayTeam] = 'away';
        }

        // Rotación: primer equipo fijo
        const last = tempTeams.pop();
        tempTeams.splice(1, 0, last);
    }

    // Segunda vuelta: invertir local/visitante
    const secondHalf = schedule.map(match => ({
        ...match,
        home: match.away,
        away: match.home,
        week: match.week + numRounds
    }));

    return [...schedule, ...secondHalf].sort((a,b) => a.week - b.week);
}

  
async function generateInitialSquad() {
    console.log(`🔄 Generando plantilla inicial para ${gameState.team}...`);
    
    // 🔥 INTENTAR CARGAR PLANTILLA REAL DESDE FIRESTORE
    if (window.getTeamData) {
        try {
            const teamData = await window.getTeamData(gameState.team);
            
            if (teamData && teamData.squad && Array.isArray(teamData.squad) && teamData.squad.length > 0) {
                console.log(`✅ Cargando plantilla real de ${gameState.team}: ${teamData.squad.length} jugadores`);
                
                // Convertir jugadores básicos a jugadores completos
                const realSquad = teamData.squad.map(player => {
                    const completedPlayer = {
                        ...player,
                        club: gameState.team,
                        currentTeam: gameState.team,
                        matches: player.matches || 0,
                        form: player.form || (75 + Math.floor(Math.random() * 15)),
                        isInjured: player.isInjured || false,
                        weeksOut: player.weeksOut || 0,
                        isSuspended: player.isSuspended || false,
                        yellowCards: player.yellowCards || 0,
                        redCards: player.redCards || 0,
                        minutesPlayed: player.minutesPlayed || 0,
                        goals: player.goals || 0,
                        assists: player.assists || 0,
                        history: player.history || []
                    };
                    
                    // Calcular campos derivados
                    if (!completedPlayer.overall) {
                        completedPlayer.overall = calculatePlayerOverall(completedPlayer);
                    }
                    if (!completedPlayer.potential) {
                        completedPlayer.potential = Math.min(99, completedPlayer.overall + Math.floor(Math.random() * 10));
                    }
                    if (!completedPlayer.salary) {
                        completedPlayer.salary = Math.floor(completedPlayer.overall * 100 + completedPlayer.age * 50);
                    }
                    if (!completedPlayer.value) {
                        completedPlayer.value = Math.floor(completedPlayer.overall * 2000 + completedPlayer.potential * 500);
                    }
                    if (!completedPlayer.foot) {
                        completedPlayer.foot = Math.random() < 0.7 ? 'Diestro' : 'Zurdo';
                    }
                    
                    // Campos de contrato
                    if (!completedPlayer.contractType) {
                        completedPlayer.contractType = Math.random() < 0.8 ? 'owned' : 'loaned';
                    }
                    if (!completedPlayer.contractYears) {
                        const age = completedPlayer.age;
                        completedPlayer.contractYears = completedPlayer.contractType === 'loaned' ? 1 :
                            age < 23 ? 3 + Math.floor(Math.random() * 3) :
                            age < 30 ? 2 + Math.floor(Math.random() * 3) :
                            1 + Math.floor(Math.random() * 2);
                    }
                    if (!completedPlayer.releaseClause) {
                        let multiplier = 2.0;
                        if (completedPlayer.age < 25) multiplier += 0.5;
                        if (completedPlayer.potential > 80) multiplier += 1.0;
                        if (completedPlayer.overall > 80) multiplier += 1.0;
                        const baseClause = Math.round(completedPlayer.value * multiplier);
                        completedPlayer.releaseClause = Math.round(baseClause / 10000) * 10000;
                    }
                    
                    return completedPlayer;
                });
                
                console.log(`✅ Plantilla real cargada: ${realSquad.length} jugadores`);
                return realSquad;
            }
        } catch (error) {
            console.warn(`⚠️ No se pudo cargar plantilla real de ${gameState.team}:`, error);
        }
    }
    
    // 🔄 FALLBACK: plantilla generada del nivel de la división, con todas las
    // posiciones cubiertas (2 porteros) y sin jugadores cedidos
    console.log(`⚙️ Generando plantilla para ${gameState.team} (${gameState.division})`);
    return generateDivisionSquad(gameState.division);
}
  
function generateInitialAcademy() {  
    const academy = [];  
    for (let i = 0; i < 5; i++) {  
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
        const age = 16 + Math.floor(Math.random() * 2);
        
        const player = {  
            name: generateRandomName(),  
            age: age,  
            position: pos,  
            foot: Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro'),  
            matches: 0,  
            form: 50 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,  
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 30 + Math.floor(Math.random() * 20);
                return acc;  
            }, {})  
        };  
        
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 50 + Math.random() * 200);  
        player.value = Math.floor(player.overall * 1000 + player.potential * 500 + player.salary * 5);  
        player.cost = player.value;
        
        // ✅ AÑADIR CAMPOS DE CONTRATO PARA CANTERA
        player.contractType = 'owned';
        player.contractYears = 3 + Math.floor(Math.random() * 3); // 3-5 años para jóvenes
        
        let multiplier = 2.0;
        if (age < 25) multiplier += 0.5;
        if (player.potential > 80) multiplier += 1.0;
        const clause = Math.floor(player.value * multiplier);
        player.releaseClause = Math.round(clause / 10000) * 10000;
  
        academy.push({ ...player, club: gameState.team });  
    }  
    return academy;  
}

function getAgeStage(age) {
    if (age <= 20) return 'youth';
    if (age <= 24) return 'growth';
    if (age <= 27) return 'prime';
    if (age <= 30) return 'plateau';
    if (age <= 33) return 'decline_soft';
    return 'decline_hard';
}


function setupNewSeason(prevSeasonDivision, nextDivisionKey) {  
    const nextSeasonYear = parseInt(gameState.currentSeason.split('/')[0]) + 1;  
    const newSeasonName = `${nextSeasonYear}/${nextSeasonYear + 1}`;  
  
    gameState.week = 1;  
    gameState.matchHistory = [];  
    gameState.standings = {};  
    gameState.newsFeed = [];  
    gameState.unreadNewsCount = 0;  
    gameState.seasonType = 'preseason';  
    gameState.currentSeason = newSeasonName;  
    gameState.division = nextDivisionKey;  
  
    const leagues = gameState.leagues || buildLeaguesFromConfig();
    gameState.leagues = leagues;
    if (!Array.isArray(leagues[nextDivisionKey])) {
        console.error(`División no encontrada: ${nextDivisionKey}. Se mantiene ${prevSeasonDivision}.`);
        nextDivisionKey = prevSeasonDivision;
        gameState.division = nextDivisionKey;
    }
    if (!leagues[nextDivisionKey].includes(gameState.team)) {
        Object.keys(leagues).forEach(k => { leagues[k] = leagues[k].filter(t => t !== gameState.team); });
        leagues[nextDivisionKey].push(gameState.team);
    }
    const teamsInNewDivision = [...leagues[nextDivisionKey]];
    gameState.leagueTeams = teamsInNewDivision;
    gameState.standings = initStandings(teamsInNewDivision);

    gameState.seasonCalendar = generateLeagueCalendar(teamsInNewDivision);
    gameState.maxSeasonWeeks = seasonLength(gameState.seasonCalendar);

    addNews(`¡Comienza la ${newSeasonName} en ${divisionName(nextDivisionKey)}! Es tiempo de pretemporada.`, 'success');
  
    initPlayerDatabase();  
    initYoungsterDatabase();  
  
    // ===== PRIMERA PLANTILLA =====
    gameState.squad = gameState.squad.filter(p => {
        p.age++;  
        // Jugadores que cediste: vuelven al acabar la temporada de cesión
        if (p.contractType === 'loaned_out' && p.loanSeasonsLeft !== undefined) {
            p.loanSeasonsLeft--;
            if (p.loanSeasonsLeft <= 0) {
                const loanedClub = p.loanedTo || 'su club de cesión';
                p.contractType = 'owned';
                if (p.originalSalary) { p.salary = p.originalSalary; delete p.originalSalary; }
                delete p.loanedTo; delete p.loanSeasonsLeft;
                p.loanListed = false; p.transferListed = false;
                addNews(`🔄 ${p.name} vuelve tras su cesión al ${loanedClub}.`, 'info');
            }
        }
        p.form = 70 + Math.floor(Math.random() * 20);  
        p.isInjured = false;  
        p.weeksOut = 0; 

        // ========================================
    // ✅ NUEVO: REDUCIR AÑOS DE CONTRATO
    // ========================================
    if (p.contractYears !== undefined && p.contractYears > 0) {
        p.contractYears--;
        
        // Avisar si le queda 1 año
        if (p.contractYears === 1 && p.contractType === 'owned') {
            addNews(
                `⚠️ A ${p.name} le queda solo 1 año de contrato. Deberías renovarlo pronto.`, 
                'warning'
            );
        }
        
        // Avisar si el contrato ha expirado
        if (p.contractYears === 0) {
            if (p.contractType === 'owned') {
                addNews(
                    `🔴 ¡URGENTE! El contrato de ${p.name} ha expirado. Si no renuevas, se irá libre.`, 
                    'error'
                );
           } else if (p.contractType === 'loaned') {
                // Jugador cedido vuelve a su club
                addNews(
                    `🔄 ${p.name} ha regresado a su club de origen tras finalizar la cesión.`, 
                    'info'
                );
                return false; // ❌ ELIMINAR jugador cedido
            } else if (p.contractType === 'loaned_out') {
                // Jugador que YO cedí: vuelve a mi plantilla al inicio de temporada
                const loanedClub = p.loanedTo || 'su club de cesión';
                p.contractType = 'owned';
                if (p.originalSalary) {
                    p.salary = p.originalSalary;
                    delete p.originalSalary;
                }
                delete p.loanedTo;
                p.loanListed = false;
                p.transferListed = false;
                if (!p.contractYears || p.contractYears <= 0) p.contractYears = 1;
                addNews(`🔄 ${p.name} ha vuelto tras su cesión al ${loanedClub}.`, 'info');
                // NO return false — el jugador se queda en la plantilla
            }
        }
    }
    // ========================================

        // Progresión / declive anual según edad y minutos
        const change = seasonalDevelopment(p, gameState.maxSeasonWeeks || 38);
        if (change >= 3) addNews(`📈 ${p.name} ha dado un salto de calidad (+${change}, media ${p.overall}).`, 'success');
        else if (change <= -3) addNews(`📉 ${p.name} acusa la edad (${change}, media ${p.overall}).`, 'info');

        p.matches = 0;

        // Retirada: más probable cuanto mayor (34: 10 %, 35: 25 %, 36: 45 %, 37+: 70 %)
        const retireChance = p.age >= 37 ? 0.7 : p.age === 36 ? 0.45 : p.age === 35 ? 0.25 : p.age === 34 ? 0.1 : 0;
        if (p.contractType !== 'loaned' && Math.random() < retireChance) {
            addNews(`👋 ${p.name} se ha retirado del fútbol a los ${p.age} años.`, 'info');
            return false;
        }

        return true;
    });
  
    // ===== CANTERA =====
    // Con 20 años ya no es juvenil: sube si hay sitio y nivel, o deja el club
    gameState.academy = gameState.academy.filter(p => {
        p.age++;
        p.matches = 0;
        p.form = 60 + Math.floor(Math.random() * 20);
        p.isInjured = false;
        p.weeksOut = 0;
        if (p.age < 20) return true;
        const bestSquad = gameState.squad.filter(x => x.position === p.position).map(x => x.overall).sort((a, b) => b - a);
        const competitive = bestSquad.length < 3 || p.overall >= (bestSquad[2] || 0) - 6;
        if (competitive && gameState.squad.length < 25) {
            gameState.squad.push({ ...p, club: gameState.team, contractType: 'owned', contractYears: 3,
                salary: Math.max(p.salary || 0, expectedSalary(p, nextDivisionKey) * 0.5) });
            addNews(`🎓 ${p.name} (${p.position}, ${p.overall}) cumple 20 años y pasa al primer equipo.`, 'success');
        } else {
            addNews(`🎓 ${p.name} cumple 20 años y deja la cantera sin hueco en el primer equipo.`, 'info');
        }
        return false;
    });
  
    // Reestablecer alineación
    setLineup(pickBestXI(gameState.squad, gameState.formation || '433').filter(Boolean));
}
 
  
// ✅ MODIFICAR selectTeamWithInitialSquad para usar await (línea 454-498)
async function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
    // 📄 RESET COMPLETO DEL ESTADO
    Object.assign(gameState, {
        team: teamName,
        division: divisionType,
        gameMode: gameMode,
        currentSeason: FIRST_SEASON,
        seasonType: 'preseason',
        week: 1,
        matchHistory: [],
        leagues: null,
        lastSeasonSummary: null,
        standings: {},
        newsFeed: [],
        unreadNewsCount: 0,
        squad: [],
        academy: [],
        lineup: [],
        leagueTeams: [],
        seasonCalendar: []
    });

    // ⚠️ CAMBIO IMPORTANTE: Ahora con await
    gameState.squad = await generateInitialSquad();
    gameState.academy = generateInitialAcademy();

    // Cargar datos personalizados si existen
    if (window.getTeamData) {
        const teamData = await window.getTeamData(teamName);

        gameState.teamLogo = teamData.logo || null;
        gameState.stadiumImage = teamData.stadiumImage || null;
        gameState.stadiumName = teamData.stadiumName || (teamName + ' Stadium');
        gameState.stadiumCapacity = teamData.stadiumCapacity || 10000;
        gameState.balance = teamData.initialBudget || gameState.balance;
    }
    gameState.fanbase = Math.round(gameState.stadiumCapacity * (ECONOMY.fanbaseFactor[divisionType] ?? 0.8));
    gameState.popularity = 50;

    // Cargar equipos y calendario
    // Estructura de ligas propia de esta partida (copia de la configuración del Admin)
    gameState.leagues = buildLeaguesFromConfig();
    if (!gameState.leagues[divisionType]) gameState.leagues[divisionType] = [];
    Object.keys(gameState.leagues).forEach(k => {
        if (k !== divisionType) gameState.leagues[k] = gameState.leagues[k].filter(t => t !== teamName);
    });
    if (!gameState.leagues[divisionType].includes(teamName)) gameState.leagues[divisionType].push(teamName);
    const teamsInDivision = [...gameState.leagues[divisionType]];

    gameState.leagueTeams = teamsInDivision;
    gameState.standings = initStandings(teamsInDivision);
    gameState.seasonCalendar = generateLeagueCalendar(teamsInDivision);
    gameState.maxSeasonWeeks = seasonLength(gameState.seasonCalendar);

    // Alineación inicial automática: mejor once en la formación actual
    gameState.lineup = pickBestXI(gameState.squad, gameState.formation || '433').filter(Boolean);
    if (gameState.lineup.length < 11) setLineup(gameState.lineup);

    addNews(`¡Bienvenido al PC Fútbol Manager, temporada ${gameState.currentSeason}!`, 'info');
    updateWeeklyFinancials();
}


// ============================================================
// PLANTILLA Y ALINEACIÓN
// ============================================================
// La alineación apunta a los objetos de la plantilla (por nombre), para que
// lesiones, sanciones, partidos y forma no se pierdan en copias.
function syncLineupFromSquad() {
    const byName = new Map(gameState.squad.map(p => [p.name, p]));
    gameState.lineup = (gameState.lineup || []).map(p => (p && byName.get(p.name)) || null).filter(Boolean);
}

const isAvailable = p => p && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out';

// Convocatoria de urgencia: sube a un canterano o, si no hay, ficha a un
// jugador libre barato (contrato de 1 año) para poder completar el once.
function emergencyCallUp(position) {
    if (gameState.squad.length >= 25) return null;
    const pool = (gameState.academy || []).filter(y => isAvailable(y) && (!position || y.position === position))
        .sort((a, b) => (b.overall || 0) - (a.overall || 0));
    if (pool.length) {
        const y = pool[0];
        const res = promoteYoungster(y.name);
        if (res.success) {
            addNews(`🚑 Convocatoria de urgencia: ${y.name} (${y.position}) sube de la cantera por falta de jugadores.`, 'warning');
            return gameState.squad.find(p => p.name === y.name) || null;
        }
    }
    const division = gameState.division || 'segunda';
    const target = (SQUAD_QUALITY[division] || SQUAD_QUALITY.segunda).target - 8;
    const player = buildGeneratedPlayer(position || 'MC', target, 24 + Math.floor(Math.random() * 8), division);
    player.contractYears = 1;
    player.salary = Math.round(expectedSalary(player, division) * 0.5);
    gameState.squad.push(player);
    addNews(`🚑 Fichaje de urgencia: ${player.name} (${player.position}, ${player.overall}) llega libre por una temporada para cubrir bajas.`, 'warning');
    return player;
}

// Sustituye en el once a los lesionados, sancionados, cedidos o vendidos.
// Si no hay portero o no llega a 11, hace una convocatoria de urgencia.
function autoFixLineup({ announce = true } = {}) {
    syncLineupFromSquad();
    const layout = getFormationLayout(gameState.formation || '433');
    const changes = [];
    // Hueco por cada puesto
    const slots = layout.map((slot, i) => gameState.lineup[i] || null);
    slots.forEach((p, i) => {
        if (p && isAvailable(p)) return;
        const used = new Set(slots.filter(x => x && isAvailable(x)).map(x => x.name));
        const want = layout[i].pos;
        const pool = gameState.squad.filter(x => isAvailable(x) && !used.has(x.name))
            .sort((a, b) => (b.overall || 0) - (a.overall || 0));
        let cand = pool.find(x => x.position === want)
            || pool.find(x => want !== 'POR' && x.position !== 'POR' && (POSITION_COMPATIBILITY[want] || []).includes(x.position))
            || pool.find(x => (want === 'POR') === (x.position === 'POR'));
        if (!cand) cand = emergencyCallUp(want === 'POR' ? 'POR' : null);
        if (cand) {
            if (p) changes.push(`${cand.name} por ${p.name}`);
            slots[i] = cand;
        } else {
            slots[i] = null;
        }
    });
    gameState.lineup = slots.filter(Boolean);
    if (announce && changes.length) {
        addNews(`🔁 [Segundo Entrenador] Cambios en el once por bajas: ${changes.join(', ')}.`, 'info');
    }
    return changes;
}

// ── Plantillas generadas (equipos sin plantilla real) ──────────
const SQUAD_QUALITY = {
    primera: { target: 74 }, segunda: { target: 65 },
    rfef_grupo1: { target: 57 }, rfef_grupo2: { target: 57 }, promesas: { target: 50 }
};
const SQUAD_TEMPLATE = ['POR', 'POR', 'DFC', 'DFC', 'DFC', 'DFC', 'LI', 'LI', 'LD', 'LD',
    'MC', 'MC', 'MC', 'MC', 'MCO', 'MCO', 'EXT', 'EXT', 'EXT', 'DC', 'DC', 'DC'];
const ATTR_PROFILE = {
    POR: { VE: -12, AT: -40, DF: 3, CA: 3 }, DFC: { EN: 3, AT: -25, DF: 6, VE: -4 },
    LI: { VE: 4, RE: 3, AT: -6 }, LD: { VE: 4, RE: 3, AT: -6 }, MC: { RE: 3, CA: 2 },
    MCO: { EN: -6, AG: 3, AT: 2, DF: -18 }, MD: { VE: 4, DF: -18 }, MI: { VE: 4, DF: -18 },
    EXT: { EN: -8, VE: 5, AG: 4, AT: 3, DF: -25 }, DC: { EN: -6, EF: 4, AT: 4, DF: -35 }
};

function buildGeneratedPlayer(position, target, age, division) {
    const player = {
        name: generateRandomName(), age, position,
        foot: Math.random() < 0.75 ? 'Diestro' : 'Zurdo',
        matches: 0, form: 65 + Math.floor(Math.random() * 15), isInjured: false, weeksOut: 0,
        contractType: 'owned', contractYears: age < 23 ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3)
    };
    const profile = ATTR_PROFILE[position] || {};
    ATTRIBUTES.forEach(a => {
        player[a] = Math.max(15, Math.min(95, Math.round(target + (profile[a] || 0) + (Math.random() * 10 - 5))));
    });
    // Ajuste fino para que la media ponderada quede cerca del objetivo
    for (let i = 0; i < 25; i++) {
        const d = target - calculatePlayerOverall(player);
        if (Math.abs(d) < 1) break;
        ATTRIBUTES.forEach(a => { player[a] = Math.max(15, Math.min(95, player[a] + Math.sign(d))); });
    }
    player.overall = calculatePlayerOverall(player);
    const room = age <= 21 ? 6 + Math.floor(Math.random() * 12) : age <= 25 ? Math.floor(Math.random() * 8) : Math.floor(Math.random() * 3);
    player.potential = Math.min(95, player.overall + room);
    player.salary = expectedSalary(player, division);
    player.value = marketValue(player);
    player.releaseClause = roundMoney(player.value * 2.5);
    return player;
}

function generateDivisionSquad(division, club = gameState.team) {
    const base = (SQUAD_QUALITY[division] || SQUAD_QUALITY.segunda).target;
    return SQUAD_TEMPLATE.map((pos, i) => {
        const starter = i % 2 === 0 || pos === 'POR' && i === 0;
        const target = base + (starter ? 2 : -3) + Math.round(Math.random() * 6 - 3);
        const age = 18 + Math.floor(Math.random() * 15);
        return { ...buildGeneratedPlayer(pos, target, age, division), club };
    });
}

// ── Progresión anual (al empezar cada temporada) ───────────────
// Media objetivo de cambio por edad; los minutos y el preparador físico la modulan.
function seasonalDevelopment(p, seasonWeeks) {
    const age = p.age;
    let delta = age <= 20 ? 3 : age <= 23 ? 2 : age <= 26 ? 1 : age <= 29 ? 0 : age <= 31 ? -1 : age <= 33 ? -2 : -3;
    if (delta > 0) {
        const minutes = Math.min(1, (p.matches || 0) / Math.max(1, seasonWeeks * 0.6));
        const coach = gameState.staff.entrenador ? (STAFF_LEVEL_EFFECTS[gameState.staff.entrenador.level]?.training ?? 1) : 0.8;
        delta = delta * (0.5 + 0.7 * minutes) * coach + (Math.random() * 1.4 - 0.7);
        const room = Math.max(0, (p.potential || p.overall) - p.overall);
        delta = Math.min(delta, room);
    } else if (delta < 0) {
        delta = delta + (Math.random() * 1.2 - 0.6);
    }
    const steps = Math.round(delta * 9); // ~9 puntos de atributo por punto de media
    if (!steps) return 0;
    const attrs = delta < 0 ? ['VE', 'AG', 'RE', 'EN', 'VE', 'RE'] : ATTRIBUTES;
    for (let i = 0; i < Math.abs(steps); i++) {
        const a = attrs[Math.floor(Math.random() * attrs.length)];
        p[a] = Math.max(15, Math.min(99, (p[a] || 50) + Math.sign(steps)));
    }
    const before = p.overall;
    p.overall = calculatePlayerOverall(p);
    return p.overall - before;
}


// ============================================================
// ECONOMÍA: valor de mercado, salarios y secretario técnico
// Un único cálculo usado en fichajes, ventas, ofertas de la IA y cláusulas.
// Referencias (jugador de 26 años con 3 años de contrato):
//   media 60 → 0,3 M · 70 → 2 M · 75 → 5 M · 80 → 13 M · 85 → 35 M · 90 → 90 M
// ============================================================
const ECONOMY = {
    valueBase: 300000,
    valueGrowth: 1.21,
    minValue: 25000,
    // Lo máximo que puede pagar por un jugador un club de cada división
    maxSpend: { primera: 120000000, segunda: 8000000, rfef_grupo1: 1500000, rfef_grupo2: 1500000, promesas: 150000 },
    // Escala de sueldos del personal según división (multiplica config.js)
    staffSalaryScale: { primera: 8, segunda: 3, rfef_grupo1: 1.2, rfef_grupo2: 1.2, promesas: 0.8 },
    // Afición inicial = aforo × factor
    fanbaseFactor: { primera: 1.6, segunda: 1.0, rfef_grupo1: 0.6, rfef_grupo2: 0.6, promesas: 0.3 },
    offerLifetimeWeeks: 3,
    maxOffersPerPlayer: 3
};
const DIVISION_RANK = { primera: 0, segunda: 1, rfef_grupo1: 2, rfef_grupo2: 2, promesas: 3 };

function roundMoney(v) {
    const step = v >= 10000000 ? 500000 : v >= 1000000 ? 100000 : v >= 100000 ? 10000 : 1000;
    return Math.max(0, Math.round(v / step) * step);
}

function marketValue(p) {
    if (!p) return 0;
    const ovr = p.overall || calculatePlayerOverall(p) || 50;
    const age = p.age || 26;
    let v = ECONOMY.valueBase * Math.pow(ECONOMY.valueGrowth, ovr - 60);
    v *= age <= 21 ? 1.35 : age <= 24 ? 1.2 : age <= 27 ? 1.0 : age <= 29 ? 0.85 : age <= 31 ? 0.65 : age <= 33 ? 0.45 : 0.25;
    if (age <= 23 && p.potential > ovr) v *= Math.min(1.5, 1 + (p.potential - ovr) * 0.03);
    const years = p.contractYears;
    if (p.contractType === 'owned' || p.contractType === undefined) {
        v *= years === 0 ? 0.3 : years === 1 ? 0.7 : years === 2 ? 0.9 : 1;
    }
    return roundMoney(Math.max(ECONOMY.minValue, v));
}

// Salario semanal que un jugador espera según su nivel y la división del club
function expectedSalary(p, division) {
    const ovr = p.overall || calculatePlayerOverall(p) || 50;
    const divFactor = { primera: 1, segunda: 0.45, rfef_grupo1: 0.15, rfef_grupo2: 0.15, promesas: 0.05 }[division] ?? 0.5;
    return roundMoney(Math.max(300, 1000 * Math.pow(1.18, ovr - 60) * 0.8 * Math.max(divFactor, 0.05)));
}

// Bonus del secretario técnico en negociaciones: de +0 (nivel 1) a +0,15 (nivel 5).
// STAFF_LEVEL_EFFECTS[n].negotiation es un multiplicador (0,5–1,5), no un sumando.
function secretaryBonus(state = gameState) {
    const sec = state.staff && state.staff.secretario;
    if (!sec) return 0;
    const n = STAFF_LEVEL_EFFECTS[sec.level]?.negotiation ?? 1;
    return Math.max(0, (n - 0.5) * 0.15);
}

function teamDivision(team) {
    const leagues = gameState.leagues || {};
    return Object.keys(leagues).find(k => (leagues[k] || []).includes(team)) || null;
}

// Completa y normaliza precios de un jugador del mercado (no propio)
function normalizeMarketPlayer(p) {
    if (!p) return p;
    const c = { ...p };
    if (!c.overall) c.overall = calculatePlayerOverall(c);
    c.value = marketValue(c);
    if (!c.askingPrice || c.askingPrice < c.value * 0.8) c.askingPrice = roundMoney(c.value * (1.05 + Math.random() * 0.25));
    if (!c.salary) c.salary = expectedSalary(c, teamDivision(c.club) || 'segunda');
    if (!c.releaseClause || c.releaseClause < c.value) c.releaseClause = roundMoney(c.value * 2.5);
    return c;
}

// Sustituye en la alineación a un jugador que ya no está disponible por el
// mejor disponible para ese puesto (mismo puesto > compatible > cualquiera)
function replaceInLineup(playerName) {
    const idx = (gameState.lineup || []).findIndex(p => p && p.name === playerName);
    if (idx === -1) return;
    const slot = getFormationLayout(gameState.formation || '433')[idx];
    const inXI = new Set(gameState.lineup.filter(Boolean).map(p => p.name));
    const pool = gameState.squad
        .filter(p => !inXI.has(p.name) && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out')
        .sort((a, b) => (b.overall || 0) - (a.overall || 0));
    const want = slot ? slot.pos : null;
    const cand = pool.find(p => p.position === want)
        || pool.find(p => want !== 'POR' && p.position !== 'POR' && (POSITION_COMPATIBILITY[want] || []).includes(p.position))
        || pool.find(p => (want === 'POR') === (p.position === 'POR'))
        || pool[0];
    if (cand) gameState.lineup[idx] = cand;
    else gameState.lineup.splice(idx, 1);
}

function pickBuyerClub(value, playerOverall) {
    const leagues = gameState.leagues || buildLeaguesFromConfig();
    // Divisiones que pueden pagarlo, preferidas según el nivel del jugador
    const prefer = playerOverall >= 78 ? ['primera'] : playerOverall >= 70 ? ['primera', 'segunda']
        : playerOverall >= 62 ? ['segunda', 'rfef_grupo1', 'rfef_grupo2'] : ['rfef_grupo1', 'rfef_grupo2', 'promesas'];
    const affordable = prefer.filter(d => (ECONOMY.maxSpend[d] || 0) >= value && (leagues[d] || []).length);
    const fallback = Object.keys(ECONOMY.maxSpend).filter(d => ECONOMY.maxSpend[d] >= value && (leagues[d] || []).length);
    const divs = affordable.length ? affordable : fallback;
    if (!divs.length) return null;
    const div = divs[Math.floor(Math.random() * divs.length)];
    const clubs = leagues[div].filter(t => t !== gameState.team);
    if (!clubs.length) return null;
    return { club: clubs[Math.floor(Math.random() * clubs.length)], division: div };
}

  
function signPlayer(player) {  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'La plantilla está completa (25 jugadores max).' };  
    }  
    
    const newPlayer = { ...player };  
    
    ATTRIBUTES.forEach(attr => {  
        if (newPlayer[attr] === undefined) {  
            newPlayer[attr] = 50 + Math.floor(Math.random() * 30);  
        }  
    });  
    
    newPlayer.overall = calculatePlayerOverall(newPlayer);  
    newPlayer.form = 70 + Math.floor(Math.random() * 20);  
    newPlayer.matches = 0;  
    newPlayer.isInjured = false;  
    newPlayer.weeksOut = 0;  
    
    // ✅ PRESERVAR campos de contrato
    // Si viene de una cesión
    newPlayer.transferListed = false;
    newPlayer.loanListed = false;

    if (newPlayer.loan === true) {
        newPlayer.contractType = 'loaned';
        newPlayer.contractYears = 1;
    }
        
   // }
    // Si no tiene contractType, asignar
    else if (!newPlayer.contractType) {
        newPlayer.contractType = 'owned';
        newPlayer.contractYears = 3 + Math.floor(Math.random() * 3);
    }
    
    // Calcular cláusula si no tiene
    if (!newPlayer.releaseClause) {
        let multiplier = 2.0;
        if (newPlayer.age < 25) multiplier += 0.5;
        if (newPlayer.potential > 80) multiplier += 1.0;
        if (newPlayer.overall > 80) multiplier += 1.0;
        const clause = Math.floor(newPlayer.value * multiplier);
        newPlayer.releaseClause = Math.round(clause / 10000) * 10000;
    }
  
    gameState.squad.push(newPlayer);  
    updateWeeklyFinancials();  
    addNews(`¡${player.name} ha sido fichado!`, 'success');  
    return { success: true, message: `¡${player.name} ha sido fichado!` };  
}
  
function signYoungster(youngster) {  
    if (gameState.balance < youngster.cost) {  
        return { success: false, message: 'Dinero insuficiente para contratar a este joven.' };  
    }  
    if (gameState.academy.length >= 15) {  
        return { success: false, message: 'La cantera está completa (15 jóvenes max).' };  
    }  
  
    const newYoungster = { ...youngster, club: gameState.team };  
    newYoungster.overall = calculatePlayerOverall(newYoungster);  
    newYoungster.form = 60 + Math.floor(Math.random() * 20);  
    newYoungster.isInjured = false;  
    newYoungster.weeksOut = 0;  
  
    gameState.balance -= newYoungster.cost;  
    gameState.academy.push(newYoungster);  
    updateWeeklyFinancials();  
    addNews(`¡${youngster.name} se une a la cantera!`, 'info');  
    return { success: true, message: `${youngster.name} ha sido contratado para la cantera.` };  
}  
  
function promoteYoungster(name) {  
    const index = gameState.academy.findIndex(y => y.name === name);  
    if (index === -1) {  
        return { success: false, message: 'Joven no encontrado en la cantera.' };  
    }  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'No hay espacio en la primera plantilla.' };  
    }  
  
    const youngster = gameState.academy.splice(index, 1)[0];  
    const promotedPlayer = { ...youngster };  
    promotedPlayer.position = promotedPlayer.position || 'MC';  
    promotedPlayer.salary = Math.floor(promotedPlayer.overall * 150 + Math.random() * 1000);  
    promotedPlayer.value = Math.floor(promotedPlayer.overall * 2000 + promotedPlayer.potential * 500 + promotedPlayer.salary * 5);  
    promotedPlayer.club = gameState.team;  
    promotedPlayer.matches = 0;  
    promotedPlayer.isInjured = false;  
    promotedPlayer.weeksOut = 0;  

    // ✅ FIX: ASIGNAR CONTRATO CORRECTO
    promotedPlayer.contractType = 'owned';
    promotedPlayer.contractYears = 3; // 3 años fijos
    
    // Calcular cláusula
    let multiplier = 2.5; // Jóvenes = cláusula más alta
    if (promotedPlayer.potential > 80) multiplier += 1.0;
    const clause = Math.floor(promotedPlayer.value * multiplier);
    promotedPlayer.releaseClause = Math.round(clause / 10000) * 10000;
  
    
    gameState.squad.push(promotedPlayer);  
    updateWeeklyFinancials();  
    addNews(`¡${youngster.name} ha sido ascendido a la primera plantilla!`, 'info');  
    return { success: true, message: `${youngster.name} ha sido ascendido a la primera plantilla.` };  
}  
  
function sellPlayer(name) {  
    const index = gameState.squad.findIndex(p => p.name === name);  
    if (index === -1) {  
        return { success: false, message: 'Jugador no encontrado en la plantilla.' };  
    }  
    const player = gameState.squad[index];
    // Venta inmediata: se acepta la primera oferta, por debajo del valor (60 %)
    const salePrice = roundMoney(marketValue(player) * 0.6);
    replaceInLineup(player.name);
    gameState.squad.splice(index, 1);
    gameState.pendingOffers = (gameState.pendingOffers || []).filter(o => o.player?.name !== player.name);
    gameState.balance += salePrice; 
    // ✅ REGISTRAR INGRESO POR VENTA
if (!gameState.playerSalesIncome) gameState.playerSalesIncome = 0;
gameState.playerSalesIncome += salePrice;
    updateWeeklyFinancials();  
    addNews(`¡${player.name} ha sido vendido por ${salePrice.toLocaleString('es-ES')}€!`, 'info');  
    return { success: true, message: `${player.name} vendido por ${salePrice}€.` };  
}  
  
function startNegotiation(player) {  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
  
    gameState.negotiatingPlayer = player.isFreeAgent || player.clausePaid ? { ...player } : normalizeMarketPlayer(player);
    gameState.negotiationStep = 1;  
  
    return { success: true, message: `Iniciando negociación con ${player.name}.` };  
}  
  
function offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    let acceptanceChance = 0.5;  
  
    const refSalary = Math.max(player.salary || 0, expectedSalary(player, gameState.division)) || 1;
    const salaryFactor = offeredSalary / refSalary;  
    if (salaryFactor > 1.5) acceptanceChance += 0.4;  
    else if (salaryFactor > 1.2) acceptanceChance += 0.15;  
    else if (salaryFactor < 0.8) acceptanceChance -= 0.2;  
  
    if (offeredBonus) acceptanceChance += 0.05;  
    if (offeredCar) acceptanceChance += 0.05;  
    if (offeredHouse) acceptanceChance += 0.05;  
    if (offeredMerchPercent) acceptanceChance += 0.03;  
    if (offeredTicketPercent) acceptanceChance += 0.03;  
  
    if (player.overall > 80 && gameState.popularity < 60) acceptanceChance -= 0.1;  
    if (player.loanListed && offeredSalary >= player.salary) acceptanceChance += 0.2;  
    // Bajar de categoría cuesta: -0,2 por cada división por debajo de la suya
    const hisDiv = teamDivision(player.club);
    if (hisDiv && DIVISION_RANK[gameState.division] > DIVISION_RANK[hisDiv]) {
        acceptanceChance -= 0.2 * (DIVISION_RANK[gameState.division] - DIVISION_RANK[hisDiv]);
    }
    if (salaryFactor < 0.6) acceptanceChance = 0;
  
    const roll = Math.random();  
    acceptanceChance += acceptanceChance > 0 ? secretaryBonus() : 0;  
  
    const accepted = roll < acceptanceChance;  
  
    if (accepted) {  
        gameState.playerOffer = {  
            salary: offeredSalary,  
            bonus: offeredBonus,  
            car: offeredCar,  
            house: offeredHouse,  
            merchPercent: offeredMerchPercent,  
            ticketPercent: offeredTicketPercent  
        };  
        
        // ✅ VERIFICAR SI SE PAGÓ LA CLÁUSULA
        if (player.clausePaid === true) {
            // FICHAJE DIRECTO - Sin negociación con club
            const newPlayer = {  
                ...player,  
                salary: offeredSalary,  
                loan: false,  
                club: gameState.team,
                contractType: 'owned',
                contractYears: 3 + Math.floor(Math.random() * 3) // 3-5 años
            };
            
            endNegotiation(true);
            
            addNews(
                `✅ ¡Fichaje completado! ${player.name} llega tras pagar su cláusula de rescisión.`,
                'success'
            );
            
            return signPlayer(newPlayer);
        } else {
            // Continuar a negociación con club
            gameState.negotiationStep = 2;  
            return { success: true, message: `${player.name} ha aceptado tu oferta personal. Ahora a negociar con su club, el ${player.club}.` };
        }
    } else {  
        // Ruptura definitiva solo ante ofertas claramente bajas; si la oferta es
        // razonable, el jugador pide más y se puede volver a intentar
        if (salaryFactor < 0.8 && roll > 0.85) {  
            endNegotiation();  
            return { success: false, message: `${player.name} ha rechazado tu oferta. No está interesado en venir.`, type: 'error' };  
        } else {  
            return { success: false, message: `${player.name} encuentra tu oferta insuficiente. Podrías subir el salario o añadir más incentivos.` };  
        }  
    }  
}
  
function offerToClub(offerAmount, playerExchange = [], isLoan = false) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    const leaving = (playerExchange || []).length;
    if (gameState.squad.length - leaving + 1 > 25) {
        return { success: false, message: 'No tienes hueco en la plantilla (máximo 25). Vende o cede a alguien antes.', type: 'error' };
    }

    if (player.loanListed && isLoan) {  
        const myWageContribution = offerAmount;  
        if (myWageContribution < 0 || myWageContribution > 100) {  
             return { success: false, message: 'La contribución salarial debe ser un porcentaje entre 0 y 100.' };  
        }  
  
        const actualWageToPay = player.salary * (myWageContribution / 100);  
        const finalWageForUs = actualWageToPay - (player.loanWageContribution || 0);  
  
        let acceptanceChance = 0.5;  
        if (myWageContribution >= 80) acceptanceChance += 0.3;  
        else if (myWageContribution >= 50) acceptanceChance += 0.1;  
        else if (myWageContribution < 30) acceptanceChance -= 0.2;  
  
        const roll = Math.random();  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            gameState.clubOffer = { type: 'loan', wageContribution: myWageContribution, finalWageForUs };  
            endNegotiation(true);  
            const newPlayer = {  
                ...player,  
                salary: finalWageForUs,  
                loan: true,  
                club: gameState.team  
            };  
            return signPlayer(newPlayer);  
        } else {  
            endNegotiation();  
            return { success: false, message: `El ${player.club} ha rechazado tu oferta de cesión. Quieren que te hagas cargo de más salario.`, type: 'error' };  
        }  
  
    } else {  
        offerAmount = Math.max(0, Number(offerAmount) || 0);
        if (gameState.balance < offerAmount) {
            return { success: false, message: 'No tienes suficiente dinero para esta oferta.', type: 'error' };
        }
        const playerAskingPrice = player.askingPrice > 0 ? player.askingPrice : roundMoney(marketValue(player) * 1.1);

        // Los jugadores ofrecidos a cambio cuentan al 80 % de su valor
        const exchangeValue = (playerExchange || []).reduce((sum, pName) => {
            const p = gameState.squad.find(s => s.name === pName);
            return sum + (p ? marketValue(p) * 0.8 : 0);
        }, 0);
        const offerFactor = (offerAmount + exchangeValue) / playerAskingPrice;

        let acceptanceChance = offerFactor >= 1 ? 0.85 : offerFactor >= 0.9 ? 0.55 : offerFactor >= 0.8 ? 0.3 : offerFactor >= 0.7 ? 0.1 : 0;
        if (acceptanceChance > 0) acceptanceChance += secretaryBonus();

        const roll = Math.random();  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            gameState.balance -= offerAmount;
// ✅ REGISTRAR GASTO EN FICHAJES
if (!gameState.playerPurchases) gameState.playerPurchases = 0;
gameState.playerPurchases += offerAmount;
playerExchange.forEach(pName => {  
                const index = gameState.squad.findIndex(p => p.name === pName);  
                if (index !== -1) {  
                    gameState.squad.splice(index, 1);  
                }  
            });  
  
            const newPlayer = {  
                ...player,  
                salary: gameState.playerOffer.salary,  
                loan: false,  
                club: gameState.team  
            };  
            endNegotiation(true);  
            return signPlayer(newPlayer);  
        } else {  
            if (offerFactor < 0.6 || roll > 0.9) {  
                endNegotiation();  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. No quieren vender a ${player.name} por esa cantidad.`, type: 'error' };  
            } else {  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. Podrías mejorarla o añadir algún jugador.` };  
            }  
        }  
    }  
}  
  
function endNegotiation(success = false) {  
    if (!success && gameState.negotiatingPlayer) {  
        addNews(`Negociación por ${gameState.negotiatingPlayer.name} fracasada.`, 'error');  
    }  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
}  
  
function setTrainingFocus(playerIndex, attribute) {  
    if (playerIndex < 0 || playerIndex >= gameState.squad.length) {  
        return { success: false, message: 'Jugador no válido.' };  
    }  
    if (!ATTRIBUTES.includes(attribute)) {  
        return { success: false, message: 'Atributo no válido para entrenar.' };  
    }  
  
    gameState.trainingFocus = { playerIndex, attribute };  
    return { success: true, message: `Entrenamiento enfocado en ${attribute} para ${gameState.squad[playerIndex].name}.` };  
}  
  
function applyWeeklyTraining() {  
    if (gameState.trainingFocus.playerIndex === -1 || !gameState.trainingFocus.attribute) {  
        return { success: false, message: 'No hay un foco de entrenamiento establecido.' };  
    }  
  
    const player = gameState.squad[gameState.trainingFocus.playerIndex];  
    const attribute = gameState.trainingFocus.attribute;  
  
    if (!player) {
        // El índice ya no corresponde a ningún jugador (cambio de temporada/plantilla)
        gameState.trainingFocus = { playerIndex: -1, attribute: null };
        return { success: false, message: 'Jugador de entrenamiento ya no existe en la plantilla. Foco reiniciado.', type: 'system' };
    }

    if (player.isInjured) {  
        return { success: false, message: `${player.name} está lesionado y no puede entrenar.`, type: 'system' };  
    }  
  
    const currentAttrValue = player[attribute];  
    const potentialAttrValue = player.potential;  
  
    if (currentAttrValue >= potentialAttrValue) {  
        return { success: false, message: `${player.name} ya alcanzó su potencial máximo en ${attribute}.`, type: 'system' };  
    }  
  
    let improvementChance = 0.3;
    const ageModifier = getAgeModifier(player.age);

    improvementChance *= Math.max(0, ageModifier); 
    let improvementAmount = 1;  
  
    improvementChance += (gameState.trainingLevel * 0.02);  
  
    if (gameState.staff.entrenador) {  
        const coachLevel = gameState.staff.entrenador.level;  
        const coachEffect = STAFF_LEVEL_EFFECTS[coachLevel]?.training || 1;  
        improvementChance *= coachEffect;  
    }  
  
    if (player.position === 'POR' && ['EN', 'CA', 'DF'].includes(attribute) && gameState.staff.entrenadorPorteros) {  
        const gkCoachLevel = gameState.staff.entrenadorPorteros.level;  
        const gkCoachEffect = STAFF_LEVEL_EFFECTS[gkCoachLevel]?.training || 1;  
        improvementChance *= gkCoachEffect;  
    } else if (player.position === 'POR' && !gameState.staff.entrenadorPorteros) {  
        improvementChance *= 0.5;  
    }  
  
    if (currentAttrValue >= potentialAttrValue - 5) improvementChance *= 0.5;  
  
    let message = '';  
    if (Math.random() < improvementChance) {  
        player[attribute] = Math.min(100, currentAttrValue + improvementAmount);  
        player.overall = calculatePlayerOverall(player);  
        message = `${player.name} ha mejorado su ${attribute} a ${player[attribute]}! (OVR: ${player.overall})`;  
        addNews(`[Entrenamiento] ${message}`, 'system');  
        return { success: true, message: message };  
    } else {  
        message = `${player.name} no ha mostrado mejoras significativas en ${attribute} esta semana.`;  
        return { success: false, message: message, type: 'system' };  
    }  
}  
  
function getPlayerMarket(filters = {}) {  
    const scoutLevel = gameState.staff.scout?.level || 0;  
    return getPlayerMarketData(filters, scoutLevel).map(normalizeMarketPlayer);  
}  
  
function getYoungsterMarket(filters = {}) {  
    const scoutLevel = gameState.staff.scout?.level || 0;  
    return getYoungsterMarketData(filters, scoutLevel);  
}  
  
// ========================================
// ✅ MEJORA 1: Mapeo de posiciones compatibles
// ========================================
const POSITION_COMPATIBILITY = {
    'POR': ['POR'],
    'DFC': ['DFC', 'LD', 'LI'],
    'LI': ['LI', 'DFC', 'MI'],
    'LD': ['LD', 'DFC', 'MD'],
    'MC': ['MC', 'MCO', 'MCD', 'MD', 'MI'],
    'MCO': ['MCO', 'MC', 'EXT', 'DC'],
    'MCD': ['MCD', 'MC', 'DFC'],
    'MD': ['MD', 'LD', 'MC', 'EXT'],
    'MI': ['MI', 'LI', 'MC', 'EXT'],
    'EXT': ['EXT', 'MD', 'MI', 'MCO', 'DC'],
    'DC': ['DC', 'EXT', 'MCO']
};

// ========================================
// ✅ MEJORA 2: Bonus/penalización según formación
// ========================================
function getFormationModifiers(formation, mentality) {
    const modifiers = {
        attackBonus: 1.0,
        defenseBonus: 1.0,
        midfieldBonus: 1.0
    };
    
    // Ajustes por formación
    switch(formation) {
        case '433':
            modifiers.attackBonus = 1.05;
            modifiers.defenseBonus = 0.98;
            break;
        case '442':
            modifiers.attackBonus = 1.0;
            modifiers.defenseBonus = 1.0;
            modifiers.midfieldBonus = 1.05;
            break;
        case '352':
            modifiers.midfieldBonus = 1.1;
            modifiers.defenseBonus = 0.95;
            break;
        case '541':
            modifiers.defenseBonus = 1.15;
            modifiers.attackBonus = 0.85;
            break;
        case '451':
            modifiers.defenseBonus = 1.08;
            modifiers.attackBonus = 0.92;
            modifiers.midfieldBonus = 1.05;
            break;
    }
    
    // Ajustes por mentalidad
    switch(mentality) {
        case 'offensive':
            modifiers.attackBonus *= 1.15;
            modifiers.defenseBonus *= 0.90;
            break;
        case 'defensive':
            modifiers.defenseBonus *= 1.15;
            modifiers.attackBonus *= 0.85;
            break;
    }
    
    return modifiers;
}

// ========================================
// ✅ MEJORA 3: Generar plantilla IA realista
// ========================================
async function generateAISquad(teamName, division) {
    // Intentar cargar plantilla real desde Firestore
    if (window.getTeamData) {
        try {
            const teamData = await window.getTeamData(teamName);
            if (teamData && teamData.squad && teamData.squad.length > 0) {
                return teamData.squad.map(p => ({
                    ...p,
                    overall: p.overall || calculatePlayerOverall(p),
                    form: p.form || 75,
                    isInjured: p.isInjured || false
                }));
            }
        } catch (error) {
            console.warn(`No se pudo cargar plantilla de ${teamName}:`, error);
        }
    }
    
    // Fallback: generar según división
    // Sin plantilla real: plantilla generada con el mismo nivel por división
    // que la del usuario (antes 70-88 en Primera y 60-75 en Segunda)
    return generateDivisionSquad(division, teamName);
}


// ========================================
// MEJOR ONCE POR POSICIONES
// Elige, para cada puesto de la formación, al mejor jugador disponible:
// 1º de su posición exacta, 2º de una posición compatible, 3º cualquiera
// de campo (o cualquiera si falta portero). Devuelve 11 huecos en el
// mismo orden que el layout de la formación (null si no hay jugador).
// ========================================
function getFormationLayout(formation) {
    const all = (typeof window !== 'undefined' && window.FORMATIONS) || FORMATIONS;
    return (all[formation] || all['433'] || FORMATIONS['433']).layout;
}

function pickBestXI(squad, formation = '433') {
    const layout = getFormationLayout(formation);
    const ovr = p => p.overall || calculatePlayerOverall(p);
    const pool = (squad || [])
        .filter(p => p && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out')
        .sort((a, b) => ovr(b) - ovr(a));
    const used = new Set();
    const xi = new Array(layout.length).fill(null);
    const passes = [
        (slot, p) => p.position === slot,
        (slot, p) => slot !== 'POR' && p.position !== 'POR' && (POSITION_COMPATIBILITY[slot] || []).includes(p.position),
        (slot, p) => slot === 'POR' || p.position !== 'POR'
    ];
    for (const fits of passes) {
        layout.forEach((slot, i) => {
            if (xi[i]) return;
            const cand = pool.find(p => !used.has(p.name) && fits(slot.pos, p));
            if (cand) { xi[i] = cand; used.add(cand.name); }
        });
    }
    return xi;
}

// La IA elige la formación que mejor encaja con su plantilla
function chooseAIFormation(squad) {
    let best = '433', bestValue = -1;
    for (const f of ['433', '442', '451', '352', '541']) {
        const value = calculateTeamEffectiveOverall(pickBestXI(squad, f), f);
        if (value > bestValue) { bestValue = value; best = f; }
    }
    return best;
}

// Media efectiva del once: penaliza jugar fuera de posición y los huecos
function calculateTeamEffectiveOverall(lineup, formation = '433') {
    if (!lineup || lineup.length === 0) return 40;
    const layout = getFormationLayout(formation);
    let total = 0;
    layout.forEach((slot, index) => {
        const player = lineup[index];
        if (!player || player.isInjured) return; // hueco = 0 (jugar con 10 se nota)
        let factor = 0.5;
        if (player.position === slot.pos) factor = 1.0;
        else if ((POSITION_COMPATIBILITY[slot.pos] || []).includes(player.position)) factor = 0.85;
        total += (player.overall || calculatePlayerOverall(player)) * factor;
    });
    return total / layout.length;
}

// ========================================
// MOTOR DE GOLES (distribución de Poisson)
// Cada equipo tiene unos goles esperados según la diferencia de fuerza,
// la localía, la formación/mentalidad y los modificadores que añadan
// otros módulos (táctica, primas...). Calibrado a LaLiga: ~2,6 goles por
// partido; con equipos iguales ~45 % local, ~27 % empate, ~28 % visitante.
// ========================================
const MATCH_ENGINE = {
    baseHomeGoals: 1.36,
    baseAwayGoals: 1.06,
    strengthSlope: 0.40,   // sensibilidad por cada 10 puntos de media de diferencia
    maxGoals: 9
};

function poissonSample(lambda) {
    const limit = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > limit);
    return k - 1;
}

function formFactor(form) {
    const f = Math.max(0, Math.min(100, Number(form) || 75));
    return 0.9 + f / 750; // forma 75 → 1,00 · 99 → 1,03 · 50 → 0,97
}

function calculateMatchOutcomeImproved({
    teamOverall,
    opponentOverall,
    teamFormation = '433',
    opponentFormation = '433',
    teamMentality = 'balanced',
    opponentMentality = 'balanced',
    isHome = true,
    teamForm = 75,
    opponentForm = 75,
    teamAttackMod = 1,
    teamDefenseMod = 1,
    opponentAttackMod = 1,
    opponentDefenseMod = 1,
    neutral = false          // final en campo neutral: sin ventaja de local
}) {
    const teamStrength = (teamOverall || 50) * formFactor(teamForm);
    const oppStrength = (opponentOverall || 50) * formFactor(opponentForm);
    const diff = (teamStrength - oppStrength) / 10;

    const tm = getFormationModifiers(teamFormation, teamMentality);
    const om = getFormationModifiers(opponentFormation, opponentMentality);

    const neutralBase = (MATCH_ENGINE.baseHomeGoals + MATCH_ENGINE.baseAwayGoals) / 2;
    const teamBase = neutral ? neutralBase : (isHome ? MATCH_ENGINE.baseHomeGoals : MATCH_ENGINE.baseAwayGoals);
    const oppBase = neutral ? neutralBase : (isHome ? MATCH_ENGINE.baseAwayGoals : MATCH_ENGINE.baseHomeGoals);

    const clamp = x => Math.max(0.12, Math.min(5, x));
    const teamXG = clamp(teamBase * Math.exp(MATCH_ENGINE.strengthSlope * diff)
        * tm.attackBonus * teamAttackMod / (om.defenseBonus * opponentDefenseMod));
    const oppXG = clamp(oppBase * Math.exp(-MATCH_ENGINE.strengthSlope * diff)
        * om.attackBonus * opponentAttackMod / (tm.defenseBonus * teamDefenseMod));

    return {
        teamGoals: Math.min(MATCH_ENGINE.maxGoals, poissonSample(teamXG)),
        opponentGoals: Math.min(MATCH_ENGINE.maxGoals, poissonSample(oppXG)),
        teamXG: Math.round(teamXG * 100) / 100,
        opponentXG: Math.round(oppXG * 100) / 100
    };
}

// ========================================
// PARTIDO DE LIGA
// - La IA alinea su mejor once por posiciones con la formación que
//   mejor le encaja (antes alineaba los 11 primeros de la lista).
// - Las plantillas rivales se cargan una vez por temporada.
// - Se usan las versiones de window.* para que los módulos externos
//   (Táctica, Primas, Promesas) puedan modificar el partido de verdad.
// ========================================
const aiSquadCache = new Map();

async function getAISquadCached(teamName, division, season) {
    const key = `${season}|${division}|${teamName}`;
    if (!aiSquadCache.has(key)) {
        const gen = (typeof window !== 'undefined' && window.generateAISquad) || generateAISquad;
        aiSquadCache.set(key, gen(teamName, division));
    }
    try {
        return await aiSquadCache.get(key);
    } catch (e) {
        aiSquadCache.delete(key);
        return generateAISquad(teamName, division);
    }
}

async function buildSide(teamName, gameState) {
    if (teamName === gameState.team) {
        const formation = gameState.formation || '433';
        return {
            lineup: gameState.lineup,
            formation,
            mentality: gameState.mentality || 'balanced',
            isUser: true
        };
    }
    const squad = await getAISquadCached(teamName, gameState.division, gameState.currentSeason);
    const formation = chooseAIFormation(squad);
    const r = Math.random();
    return {
        lineup: pickBestXI(squad, formation),
        formation,
        mentality: r < 0.2 ? 'offensive' : (r < 0.8 ? 'balanced' : 'defensive'),
        isUser: false
    };
}

function averageForm(lineup) {
    const players = (lineup || []).filter(Boolean);
    if (!players.length) return 75;
    return players.reduce((sum, p) => sum + (p.form || 75), 0) / players.length;
}

async function playMatchImproved(homeTeamName, awayTeamName, gameState) {
    const home = await buildSide(homeTeamName, gameState);
    const away = await buildSide(awayTeamName, gameState);

    const homeOverall = calculateTeamEffectiveOverall(home.lineup, home.formation);
    const awayOverall = calculateTeamEffectiveOverall(away.lineup, away.formation);

    const outcomeFn = (typeof window !== 'undefined' && window.calculateMatchOutcomeImproved) || calculateMatchOutcomeImproved;
    const outcome = outcomeFn({
        teamOverall: homeOverall,
        opponentOverall: awayOverall,
        teamFormation: home.formation,
        opponentFormation: away.formation,
        teamMentality: home.mentality,
        opponentMentality: away.mentality,
        isHome: true,
        teamForm: averageForm(home.lineup),
        opponentForm: averageForm(away.lineup),
        // Para que los módulos externos sepan de qué lado está el usuario
        homeTeamName,
        awayTeamName,
        homeIsUser: home.isUser,
        awayIsUser: away.isUser
    });
    const homeGoals = outcome.teamGoals;
    const awayGoals = outcome.opponentGoals;

    console.log(`🏟️ ${homeTeamName} (${homeOverall.toFixed(1)}, ${home.formation}) ${homeGoals}-${awayGoals} ${awayTeamName} (${awayOverall.toFixed(1)}, ${away.formation})`);

    return {
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        homeGoals,
        awayGoals,
        homeOverall,
        awayOverall,
        homeFormation: home.formation,
        awayFormation: away.formation,
        homeXG: outcome.teamXG,
        awayXG: outcome.opponentXG
    };
}

// ✅ Exportar funciones
if (typeof window !== 'undefined') {
    window.calculateTeamEffectiveOverallImproved = calculateTeamEffectiveOverall;
    window.playMatchImproved = playMatchImproved;
    window.calculateMatchOutcomeImproved = calculateMatchOutcomeImproved;
    window.generateAISquad = generateAISquad;
    window.pickBestXI = pickBestXI;
    window.chooseAIFormation = chooseAIFormation;
    window.MATCH_ENGINE = MATCH_ENGINE;
}

console.log('✅ Motor de partidos mejorado cargado (Fase 1)');

  

// ========================================
// ✅ FUNCIÓN WRAPPER: Procesar partido completo
// ========================================
async function processMatch(homeTeam, awayTeam, gameState) {
    // 1️⃣ Simular partido con motor mejorado
    const result = await playMatchImproved(homeTeam, awayTeam, gameState);
    
    // 2️⃣ Actualizar clasificación
    const updateStandings = (team, gf, gc) => {
        const stats = gameState.standings[team];
        if (!stats) return;
        
        stats.pj++;
        stats.gf += gf;
        stats.gc += gc;
        
        if (gf > gc) {
            stats.g++;
            stats.pts += 3;
        } else if (gf === gc) {
            stats.e++;
            stats.pts += 1;
        } else {
            stats.p++;
        }
    };
    
    updateStandings(result.homeTeam, result.homeGoals, result.awayGoals);
    updateStandings(result.awayTeam, result.awayGoals, result.homeGoals);
    
    // 3️⃣ Procesar lesiones y forma (solo para nuestro equipo)
    if (homeTeam === gameState.team || awayTeam === gameState.team) {
        const ourSquad = (homeTeam === gameState.team) ? result.homeSquad : result.awaySquad;
        const ourGoals = (homeTeam === gameState.team) ? result.homeGoals : result.awayGoals;
        const rivalGoals = (homeTeam === gameState.team) ? result.awayGoals : result.homeGoals;
        
        // Se actualiza el jugador de la PLANTILLA (la alineación puede tener copias)
        syncLineupFromSquad();
        gameState.lineup.forEach(player => {
            if (!player) return;
            player.matches = (player.matches || 0) + 1;
            const form = player.form || 70;
            if (ourGoals > rivalGoals) player.form = Math.min(95, form + 1 + Math.floor(Math.random() * 3));
            else if (ourGoals < rivalGoals) player.form = Math.max(45, form - 1 - Math.floor(Math.random() * 3));
            else player.form = Math.max(45, Math.min(95, form + (form > 75 ? -1 : 1)));
        });
        // Los suplentes que no juegan vuelven poco a poco a su forma media
        const inXI = new Set(gameState.lineup.filter(Boolean).map(p => p.name));
        gameState.squad.forEach(p => {
            if (!inXI.has(p.name) && p.form !== undefined) p.form += p.form > 72 ? -1 : (p.form < 68 ? 1 : 0);
        });
        
        // Actualizar popularidad
        if (ourGoals > rivalGoals) {
            gameState.popularity = Math.min(100, gameState.popularity + 2);
            gameState.fanbase = Math.floor(gameState.fanbase * 1.01);
        } else if (ourGoals < rivalGoals) {
            gameState.popularity = Math.max(0, gameState.popularity - 1);
        }
    }
    
    return result;
}



function secondCoachAdvice() {  
    if (!gameState.staff.segundoEntrenador) return;  
  
    const currentLineup = gameState.lineup;  
    const availableSquad = gameState.squad.filter(p => !p.isInjured);  
  
    if (gameState.trainingFocus.playerIndex === -1 && Math.random() < 0.7) {  
        addNews(`[Segundo Entrenador] ¡No hemos fijado un foco de entrenamiento para esta semana!`, 'warning');  
    }  
  
    const lowFormLineupPlayers = currentLineup.filter(p => p.form < 65 && !p.isInjured);  
    if (lowFormLineupPlayers.length > 0 && Math.random() < 0.6) {  
        const p = lowFormLineupPlayers[Math.floor(Math.random() * lowFormLineupPlayers.length)];  
        addNews(`[Segundo Entrenador] ${p.name} (${p.overall}) tiene baja forma (${p.form}). ¿Debería salir en el once inicial?`, 'warning');  
    }  
  
    const promisingBenched = availableSquad.filter(p =>  
        !currentLineup.some(lp => lp.name === p.name) &&  
        p.age < 23 && p.potential > 80 && p.matches < (gameState.week * 0.5)  
    );  
    if (promisingBenched.length > 0 && Math.random() < 0.4) {  
        const p = promisingBenched[Math.floor(Math.random() * promisingBenched.length)];  
        addNews(`[Segundo Entrenador] ${p.name} (${p.overall}/${p.potential}) es un gran talento. Deberíamos darle más minutos para que crezca.`, 'info');  
    }  
  
    const criticalPositions = ['POR', 'DFC', 'MC', 'DC'];  
    for (const pos of criticalPositions) {  
        const availableInPosition = availableSquad.filter(p => p.position === pos).length;  
        if (pos === 'POR' && availableInPosition < 2) {  
            addNews(`[Segundo Entrenador] Solo tenemos ${availableInPosition} ${pos} apto. Deberíamos buscar refuerzos para la portería.`, 'warning');  
        } else if (pos !== 'POR' && availableInPosition < 3) {  
            addNews(`[Segundo Entrenador] Tenemos pocos ${pos} aptos (${availableInPosition}). Considera fichar.`, 'warning');  
        }  
    }  
  
    if (gameState.staff.scout && gameState.balance > 100000 && Math.random() < 0.3) {  
        const topPlayersInMarket = getPlayerMarketData({}, gameState.staff.scout.level)  
                                    .filter(p => p.overall > 80 && p.transferListed && !p.loanListed);  
        if (topPlayersInMarket.length > 0) {  
            const p = topPlayersInMarket[Math.floor(Math.random() * topPlayersInMarket.length)];  
            addNews(`[Segundo Entrenador] Nuestro ojeador ha encontrado a ${p.name} (${p.position}, OVR ${p.overall}) del ${p.club}. ¡Podría ser un gran fichaje!`, 'info');  
        }  
    }  
  
    // Comprobación de alineación por el segundo entrenador ANTES de la simulación  
    const lineupValidation = validateLineup(currentLineup);  
    if (!lineupValidation.success) {  
        // Noticia para el segundo entrenador que se muestra ANTES de simular la jornada  
        addNews(`[Segundo Entrenador - ALINEACIÓN CRÍTICA] Tu alineación es INVÁLIDA: ${lineupValidation.message}. Por favor, corrígela.`, 'error');  
    }  
    // NOTA: La decisión de bloquear la simulación se maneja en simulateWeek() en index.html  
}  
  
function boardMessages() {  
    let satisfaction = 0;  
    const teamStats = gameState.standings[gameState.team];  
    if (teamStats && teamStats.pj > 0) {  
        satisfaction += (teamStats.pts / teamStats.pj) - 2;  
        const weeklyCost = Math.max(1, gameState.weeklyExpenses || 1);
        satisfaction += Math.max(-2, Math.min(1, gameState.balance / (weeklyCost * 20) - 1)) * 0.5;  
        satisfaction += gameState.popularity / 10 - 5;  
  
        let message = '';  
        if (satisfaction < -2) {  
            message = `[Directiva] Esperábamos mejores resultados a estas alturas de la temporada y estamos preocupados. Hay que mejorar.`;  
            addNews(message, 'error');  
        } else if (satisfaction < 0) {  
            message = `[Directiva] No estamos del todo satisfechos con el progreso actual. Es necesario un empujón.`;  
            addNews(message, 'warning');  
        } else if (satisfaction > 2) {  
            message = `[Directiva] Felicitaciones por el buen desempeño del equipo y la excelente gestión. Sigan así.`;  
            addNews(message, 'success');  
        } else if (Math.random() < 0.1) {  
             message = `[Directiva] La estabilidad económica es clave para nuestro proyecto a largo plazo.`;  
             addNews(message, 'info');  
        }  
    }  
}  
  
// ============================================================
// TEMPORADAS: ESTRUCTURA DE LIGAS, ASCENSOS, DESCENSOS Y PLAYOFFS
// ------------------------------------------------------------
// La composición de cada división se guarda en la propia partida
// (gameState.leagues), así cada partida evoluciona por su cuenta y la
// configuración global del Admin (TEAMS_DATA) solo sirve de punto de
// partida para las partidas nuevas.
//
// Reglas (iguales para el usuario y para la IA):
//   Primera ........ bajan los 3 últimos a Segunda
//   Segunda ........ suben 1º y 2º; playoff 3º-6º (doble partido) → 1 plaza
//                    bajan los 4 últimos a Primera RFEF (repartidos entre grupos)
//   Primera RFEF ... sube el 1º de cada grupo; playoff cruzado 2º-5º de
//                    ambos grupos → 2 plazas; baja el último de cada grupo
//                    a Liga Promesas (si existe)
//   Liga Promesas .. el 1º sube al Grupo 2; playoff 2º-5º → 1 plaza al Grupo 1
// Desempate en todas las tablas: puntos, diferencia de goles, goles a favor.
// ============================================================
const DIVISION_DEFAULT_NAMES = {
    primera: 'Primera División', segunda: 'Segunda División',
    rfef_grupo1: 'Primera RFEF Grupo 1', rfef_grupo2: 'Primera RFEF Grupo 2',
    promesas: 'Liga Promesas'
};

function divisionName(key) {
    const fromLeagues = typeof window !== 'undefined' && window.pcfLeagues && window.pcfLeagues.name(key);
    return (fromLeagues && fromLeagues !== key ? fromLeagues : DIVISION_DEFAULT_NAMES[key]) || key;
}

function sortStandings(standings) {
    return Object.entries(standings || {}).sort((a, b) => {
        const A = a[1] || {}, B = b[1] || {};
        return (B.pts || 0) - (A.pts || 0)
            || ((B.gf || 0) - (B.gc || 0)) - ((A.gf || 0) - (A.gc || 0))
            || (B.gf || 0) - (A.gf || 0)
            || a[0].localeCompare(b[0]);
    });
}

function seasonLength(calendar) {
    return (calendar || []).reduce((max, m) => Math.max(max, m.week || 0), 0);
}

// Copia de la estructura global (Admin / config.js) sin duplicados
function buildLeaguesFromConfig() {
    const leagues = {};
    const seen = new Set();
    const keys = ['primera', 'segunda', 'rfef_grupo1', 'rfef_grupo2', 'promesas']
        .concat(Object.keys(TEAMS_DATA).filter(k => !['primera', 'segunda', 'rfef_grupo1', 'rfef_grupo2', 'promesas'].includes(k)));
    keys.forEach(key => {
        if (!Array.isArray(TEAMS_DATA[key])) return;
        leagues[key] = TEAMS_DATA[key].filter(t => t && !seen.has(t) && seen.add(t));
    });
    return leagues;
}

// Garantiza gameState.leagues coherente con la liga que se está jugando
// (las partidas guardadas antes de esta versión no la tienen)
function ensureLeagueStructure() {
    if (!gameState.leagues || typeof gameState.leagues !== 'object') {
        gameState.leagues = buildLeaguesFromConfig();
    }
    const div = gameState.division;
    if (div && Array.isArray(gameState.leagueTeams) && gameState.leagueTeams.length) {
        const current = new Set(gameState.leagueTeams);
        Object.keys(gameState.leagues).forEach(k => {
            if (k !== div) gameState.leagues[k] = gameState.leagues[k].filter(t => !current.has(t));
        });
        gameState.leagues[div] = [...gameState.leagueTeams];
    }
    return gameState.leagues;
}

// Simula una liga completa entre equipos de la IA (para las divisiones
// en las que no juega el usuario). Usa el mismo motor que los partidos.
async function simulateLeagueTable(teams, division, season) {
    const strength = {};
    for (const team of teams) {
        const squad = await getAISquadCached(team, division, season);
        const formation = chooseAIFormation(squad);
        strength[team] = {
            overall: calculateTeamEffectiveOverall(pickBestXI(squad, formation), formation),
            formation
        };
    }
    const standings = initStandings(teams);
    for (const m of generateLeagueCalendar(teams)) {
        const h = strength[m.home], a = strength[m.away];
        const r = calculateMatchOutcomeImproved({
            teamOverall: h.overall, opponentOverall: a.overall,
            teamFormation: h.formation, opponentFormation: a.formation, isHome: true
        });
        addResultToStandings(standings, m.home, m.away, r.teamGoals, r.opponentGoals);
    }
    return standings;
}

function addResultToStandings(standings, home, away, hg, ag) {
    const H = standings[home], A = standings[away];
    if (!H || !A) return;
    H.pj++; A.pj++;
    H.gf += hg; H.gc += ag; A.gf += ag; A.gc += hg;
    if (hg > ag) { H.g++; H.pts += 3; A.p++; }
    else if (hg < ag) { A.g++; A.pts += 3; H.p++; }
    else { H.e++; A.e++; H.pts++; A.pts++; }
}

// Eliminatoria a doble partido. teamA = mejor clasificado (juega la vuelta
// en casa y pasa si hay empate en el global, como en el playoff real).
async function playTwoLegTie(teamA, teamB, division) {
    const ctx = { ...gameState, division };
    const leg1 = await playMatchImproved(teamB, teamA, ctx);
    const leg2 = await playMatchImproved(teamA, teamB, ctx);
    const totalA = leg1.awayGoals + leg2.homeGoals;
    const totalB = leg1.homeGoals + leg2.awayGoals;
    return {
        teamA, teamB,
        leg1: { hg: leg1.homeGoals, ag: leg1.awayGoals },
        leg2: { hg: leg2.homeGoals, ag: leg2.awayGoals },
        totalA, totalB,
        winner: totalA >= totalB ? teamA : teamB
    };
}

// Playoff de 4 equipos ordenados por clasificación: 1º-4º y 2º-3º, final
async function playFourTeamPlayoff(seeds, division) {
    const [s1, s2, s3, s4] = seeds;
    if (!s4) return null;
    const sf1 = await playTwoLegTie(s1, s4, division);
    const sf2 = await playTwoLegTie(s2, s3, division);
    const rank = t => seeds.indexOf(t);
    const [fa, fb] = [sf1.winner, sf2.winner].sort((x, y) => rank(x) - rank(y));
    const final = await playTwoLegTie(fa, fb, division);
    return { seeds, sf1, sf2, final, winner: final.winner };
}

async function resolveSeasonEnd() {
    const season = gameState.currentSeason;
    const userDiv = gameState.division;
    const leagues = ensureLeagueStructure();

    // 1) Clasificaciones finales de todas las divisiones
    const tables = {};
    for (const [div, teams] of Object.entries(leagues)) {
        if (!Array.isArray(teams) || teams.length < 2) continue;
        const standings = div === userDiv ? gameState.standings : await simulateLeagueTable(teams, div, season);
        tables[div] = sortStandings(standings).map(([team, s]) => ({
            team, pts: s.pts || 0, gf: s.gf || 0, gc: s.gc || 0, g: s.g || 0, e: s.e || 0, p: s.p || 0
        }));
    }
    const order = div => (tables[div] || []).map(r => r.team);

    // 2) Ascensos, descensos y playoffs
    const moves = [];
    const playoffs = {};
    const move = (team, from, to, reason) => { if (team && to && (leagues[to] || to === 'rfef')) moves.push({ team, from, to, reason }); };

    const primera = order('primera'), segunda = order('segunda');
    const g1 = order('rfef_grupo1'), g2 = order('rfef_grupo2'), promesas = order('promesas');

    if (primera.length && segunda.length) {
        primera.slice(-3).forEach(t => move(t, 'primera', 'segunda', 'descenso'));
        segunda.slice(0, 2).forEach(t => move(t, 'segunda', 'primera', 'ascenso directo'));
        const po = await playFourTeamPlayoff(segunda.slice(2, 6), 'segunda');
        if (po) {
            playoffs.segunda = { ...po, direct: segunda.slice(0, 2) };
            move(po.winner, 'segunda', 'primera', 'ascenso por playoff');
        }
    }

    const rfefGroups = [['rfef_grupo1', g1], ['rfef_grupo2', g2]].filter(([, t]) => t.length);
    if (segunda.length && rfefGroups.length) {
        // Bajan 4 de Segunda (se reparten luego entre los grupos)
        segunda.slice(-4).forEach(t => move(t, 'segunda', 'rfef', 'descenso'));
        // Sube el campeón de cada grupo
        rfefGroups.forEach(([key, t]) => move(t[0], key, 'segunda', 'ascenso directo'));
        // Playoff cruzado 2º-5º: 2ºA-5ºB, 3ºA-4ºB, 2ºB-5ºA, 3ºB-4ºA; dos finales
        if (g1.length >= 5 && g2.length >= 5) {
            const r1 = [
                await playTwoLegTie(g1[1], g2[4], 'rfef_grupo1'),
                await playTwoLegTie(g1[2], g2[3], 'rfef_grupo1'),
                await playTwoLegTie(g2[1], g1[4], 'rfef_grupo2'),
                await playTwoLegTie(g2[2], g1[3], 'rfef_grupo2')
            ];
            const pos = t => (g1.includes(t) ? g1.indexOf(t) : g2.indexOf(t));
            const seed = (x, y) => (pos(x) <= pos(y) ? [x, y] : [y, x]);
            const finals = [
                await playTwoLegTie(...seed(r1[0].winner, r1[3].winner), 'rfef_grupo1'),
                await playTwoLegTie(...seed(r1[2].winner, r1[1].winner), 'rfef_grupo2')
            ];
            playoffs.rfef = { direct: rfefGroups.map(([, t]) => t[0]), round1: r1, finals, winners: finals.map(f => f.winner) };
            finals.forEach(f => move(f.winner, g1.includes(f.winner) ? 'rfef_grupo1' : 'rfef_grupo2', 'segunda', 'ascenso por playoff'));
        } else {
            // Grupos demasiado pequeños: sube también el 2º de cada grupo
            rfefGroups.forEach(([key, t]) => move(t[1], key, 'segunda', 'ascenso directo'));
        }
    }

    if (promesas.length && rfefGroups.length) {
        rfefGroups.forEach(([key, t]) => move(t[t.length - 1], key, 'promesas', 'descenso'));
        move(promesas[0], 'promesas', leagues.rfef_grupo2 ? 'rfef_grupo2' : 'rfef_grupo1', 'ascenso directo');
        const po = await playFourTeamPlayoff(promesas.slice(1, 5), 'promesas');
        if (po) {
            playoffs.promesas = { ...po, direct: [promesas[0]] };
            move(po.winner, 'promesas', leagues.rfef_grupo1 ? 'rfef_grupo1' : 'rfef_grupo2', 'ascenso por playoff');
        }
    }

    // 3) Aplicar movimientos (un equipo solo se mueve una vez)
    const moved = new Set();
    const finalMoves = moves.filter(m => !moved.has(m.team) && moved.add(m.team));
    finalMoves.forEach(m => { leagues[m.from] = (leagues[m.from] || []).filter(t => t !== m.team); });
    finalMoves.forEach(m => {
        let to = m.to;
        if (to === 'rfef') {
            // Al grupo con menos equipos (equilibra tamaños)
            const groups = rfefGroups.map(([k]) => k);
            to = groups.sort((a, b) => leagues[a].length - leagues[b].length)[0];
            m.to = to;
        }
        leagues[to].push(m.team);
    });

    const userMove = finalMoves.find(m => m.team === gameState.team);
    const userRow = (tables[userDiv] || []).findIndex(r => r.team === gameState.team) + 1;

    gameState.lastSeasonSummary = {
        season, userDivision: userDiv, userPosition: userRow,
        userMove: userMove || null,
        tables, playoffs, moves: finalMoves
    };
    return gameState.lastSeasonSummary;
}

function buildSeasonSummaryText(summary) {
    const { season, userDivision, userPosition, userMove, playoffs, moves } = summary;
    const lines = [`🏁 Fin de la temporada ${season}`, `${gameState.team}: ${userPosition}º en ${divisionName(userDivision)}.`];
    if (userMove) {
        const up = userMove.reason.startsWith('ascenso');
        lines.push(up ? `🎉 ¡Ascenso a ${divisionName(userMove.to)} (${userMove.reason})!`
                      : `⬇️ Descenso a ${divisionName(userMove.to)}.`);
    } else {
        lines.push(`Sigues en ${divisionName(userDivision)}.`);
    }
    const userPO = [playoffs.segunda, playoffs.promesas].find(p => p && p.seeds.includes(gameState.team));
    if (userPO) lines.push(userPO.winner === gameState.team ? '⭐ Has ganado el playoff de ascenso.' : '😞 Has caído en el playoff de ascenso.');
    if (playoffs.rfef && [...playoffs.rfef.round1.flatMap(t => [t.teamA, t.teamB])].includes(gameState.team) && !playoffs.rfef.winners.includes(gameState.team)) {
        lines.push('😞 Has caído en el playoff de ascenso.');
    }
    const byDest = {};
    moves.forEach(m => { (byDest[`${m.from}>${m.to}`] = byDest[`${m.from}>${m.to}`] || []).push(m.team); });
    const describe = (from, to) => {
        const teams = byDest[`${from}>${to}`];
        return teams && teams.length ? `${divisionName(from)} → ${divisionName(to)}: ${teams.join(', ')}` : null;
    };
    [['segunda', 'primera'], ['primera', 'segunda'], ['rfef_grupo1', 'segunda'], ['rfef_grupo2', 'segunda'],
     ['segunda', 'rfef_grupo1'], ['segunda', 'rfef_grupo2'], ['rfef_grupo1', 'promesas'], ['rfef_grupo2', 'promesas'],
     ['promesas', 'rfef_grupo1'], ['promesas', 'rfef_grupo2']].forEach(([f, t]) => {
        const d = describe(f, t); if (d) lines.push(d);
    });
    return lines.join('\n');
}

async function endSeason() {
    const currentDivision = gameState.division;
    let summary;
    try {
        summary = await resolveSeasonEnd();
    } catch (e) {
        console.error('Error resolviendo el fin de temporada:', e);
        summary = { season: gameState.currentSeason, userDivision: currentDivision, userPosition: 0, userMove: null, tables: {}, playoffs: {}, moves: [] };
    }

    const nextDivisionKey = summary.userMove ? summary.userMove.to : currentDivision;
    const text = buildSeasonSummaryText(summary);

    // Europa (solo informativo aquí; las competiciones las gestiona su módulo)
    if (currentDivision === 'primera' && !summary.userMove) {
        const pos = summary.userPosition;
        if (pos >= 1 && pos <= 5) summary.europe = 'Champions League';
        else if (pos >= 6 && pos <= 7) summary.europe = 'Europa League';
        else if (pos === 8) summary.europe = 'Conference League';
    }
    const fullText = summary.europe ? `${text}\n🌍 Clasificado para la ${summary.europe}.` : text;

    alert(fullText);
    setupNewSeason(currentDivision, nextDivisionKey);
    // El resumen se añade DESPUÉS de reiniciar las noticias de la nueva temporada
    fullText.split('\n').slice(1).reverse().forEach(line => addNews(line, summary.userMove && summary.userMove.reason.startsWith('ascenso') ? 'success' : 'info'));
    addNews(`🏁 Resumen de la temporada ${summary.season}`, 'info');
}



let simulationRunning = false;

async function simulateFullWeek() {
    if (simulationRunning) {
        console.warn('Ya hay una jornada simulándose; se ignora la petición repetida');
        return { myMatch: null, forcedLoss: false, ignored: true };
    }
    simulationRunning = true;
    try {
        return await simulateFullWeekInner();
    } finally {
        simulationRunning = false;
    }
}

async function simulateFullWeekInner() {  
    let myMatchResult = null;
    let forcedLoss = false;  

    // Partidas guardadas con la duración mal calculada (p. ej. Segunda a 38 jornadas)
    const realLength = seasonLength(gameState.seasonCalendar);
    if (realLength && gameState.maxSeasonWeeks !== realLength) gameState.maxSeasonWeeks = realLength;

    // ===== PRETEMPORADA =====
    if (gameState.seasonType === 'preseason') {  
        handlePreseasonWeek();  
        gameState.week++;  
        updateWeeklyFinancials();  

        if (gameState.week > PRESEASON_WEEKS) {  
            gameState.seasonType = 'regular';  
            gameState.week = 1;  
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${divisionName(gameState.division)}!`, 'success');  
        }  

        window.updateNextMatchInfo();
        return { myMatch: null, forcedLoss: false };
    }  

    // ===== VALIDAR ALINEACIÓN =====
    const preSimLineupValidation = validateLineup(gameState.lineup);  
    applyWeeklyTraining();  

    // Reducir lesiones (el fisioterapeuta puede recortar una semana más: 10 % por nivel)
    const fisioLevel = gameState.staff.fisio?.level || 0;
    gameState.squad.forEach(p => {  
        if (p.isInjured) {  
            p.weeksOut--;  
            if (fisioLevel && p.weeksOut > 0 && Math.random() < fisioLevel * 0.1) p.weeksOut--;
            if (p.weeksOut <= 0) {  
                p.isInjured = false;  
                p.weeksOut = 0;  
                addNews(`¡${p.name} se ha recuperado de su lesión!`, 'info');  
            }  
        }  
    });
    
    gameState.academy.forEach(y => {  
        if (y.isInjured) {  
            y.weeksOut--;  
            if (y.weeksOut <= 0) {  
                y.isInjured = false;  
                y.weeksOut = 0;  
                addNews(`¡${y.name} (cantera) se ha recuperado de su lesión!`, 'info');  
            }  
        }  
    });  

    secondCoachAdvice();
    if (gameState.week % 4 === 0) boardMessages();

    // ===== PARTIDOS DE LA JORNADA =====
    const currentWeekMatches = gameState.seasonCalendar.filter(
        match => match.week === gameState.week
    );

    let myTeamMatch = currentWeekMatches.find(
        match => match.home === gameState.team || match.away === gameState.team
    );
    // Si este partido ya se procesó (dos simulaciones casi a la vez), no repetirlo
    if (myTeamMatch && gameState.matchHistory.some(mh =>
        mh.week === gameState.week && mh.home === myTeamMatch.home && mh.away === myTeamMatch.away)) {
        console.warn('Partido del usuario ya procesado esta jornada; se ignora la repetición');
        myTeamMatch = null;
    }

    // ===== SIMULAR PARTIDO DEL EQUIPO =====
    if (myTeamMatch) {  
        if (!preSimLineupValidation.success) {
            // Alineación inválida
            addNews(`[SISTEMA - ALINEACIÓN INVÁLIDA] Tu equipo perdió 0-3 por alineación indebida.`, 'error');  

            let homeGoals = myTeamMatch.home === gameState.team ? 0 : 3;
            let awayGoals = myTeamMatch.home === gameState.team ? 3 : 0;

            const updateStats = (team, gf, gc) => {
                const s = gameState.standings[team];
                if (s) {
                    s.pj++;
                    s.gf += gf;
                    s.gc += gc;
                    if (gf > gc) { s.g++; s.pts += 3; }
                    else if (gf === gc) { s.e++; s.pts += 1; }
                    else s.p++;
                }
            };
            
            updateStats(myTeamMatch.home, homeGoals, awayGoals);
            updateStats(myTeamMatch.away, awayGoals, homeGoals);

            gameState.matchHistory.push({  
                week: gameState.week,  
                home: myTeamMatch.home,  
                away: myTeamMatch.away,  
                score: `${homeGoals}-${awayGoals}`
            });
            
            myMatchResult = { 
                home: myTeamMatch.home, 
                away: myTeamMatch.away, 
                homeGoals, 
                awayGoals, 
                score: `${homeGoals}-${awayGoals}` 
            };
            
            forcedLoss = true;  
            
        } else {
            // Simular partido normal
            const result = await processMatch(myTeamMatch.home, myTeamMatch.away, gameState);
            
            myMatchResult = { 
                home: result.homeTeam, 
                away: result.awayTeam, 
                homeGoals: result.homeGoals, 
                awayGoals: result.awayGoals, 
                score: `${result.homeGoals}-${result.awayGoals}` 
            };
            
            gameState.matchHistory.push({ 
                week: gameState.week, 
                home: result.homeTeam, 
                away: result.awayTeam, 
                score: `${result.homeGoals}-${result.awayGoals}` 
            });
        }
    } // ✅ FIN de if (myTeamMatch)

    // ✅ NUEVO: DISPARAR MODAL INMEDIATAMENTE
    if (myMatchResult) {
        // Esperar un momento para que se actualice la UI
        setTimeout(() => {
            if (window.injectMatchSummary) {
                console.log('🎯 Abriendo modal de resultado:', myMatchResult);
                window.injectMatchSummary(myMatchResult);
            } else {
                console.warn('⚠️ injectMatchSummary no está disponible');
            }
        }, 500);
    }
    
    // ===== SIMULAR RESTO DE PARTIDOS =====
    for (const match of currentWeekMatches.filter(m => m !== myTeamMatch)) {
        const alreadyPlayed = gameState.matchHistory.some(
            mh => mh.week === gameState.week && mh.home === match.home && mh.away === match.away
        );
        
        if (!alreadyPlayed) {
            const result = await processMatch(match.home, match.away, gameState);
            
            gameState.matchHistory.push({
                week: gameState.week,
                home: result.homeTeam,
                away: result.awayTeam,
                score: `${result.homeGoals}-${result.awayGoals}`
            });
            
            console.log(`⚽ ${result.homeTeam} ${result.homeGoals}-${result.awayGoals} ${result.awayTeam}`);
        }
    }

    // ===== ACTUALIZAR PRÓXIMO PARTIDO =====
    gameState.week++;
    window.updateNextMatchInfo();

    // ===== FINANZAS / OFERTAS =====
    updateWeeklyFinancials();  
    generateAIOffers();  
    checkMarketRecommendations();  

    // ===== CRISIS ECONÓMICA =====
    if (gameState.staff.segundoEntrenador && 
        (gameState.weeklyIncome - gameState.weeklyExpenses < -10000) && 
        gameState.balance < 0) {  
        addNews(`[Segundo Entrenador - ¡CRISIS!] Nuestros números están muy mal.`, 'error');  
    }  

    // ===== GAME OVER =====
    if (gameState.balance < -100000 && gameState.week > 10) {  
        addNews(`¡Has sido despedido!`, 'error');  
        alert("¡GAME OVER!");  
        resetGame();  
        return { myMatch: myMatchResult, forcedLoss, gameOver: true };  
    }  

    // ===== FIN DE TEMPORADA =====
    if (gameState.week > gameState.maxSeasonWeeks) {
        await endSeason();
    }
        
    return { myMatch: myMatchResult, forcedLoss };
}



  
function handlePreseasonWeek() {  
    addNews(`Semana ${gameState.week} de pretemporada.`, 'system');  
    if (Math.random() < 0.5) {  
        const currentDivisionTeams = gameState.leagueTeams;  
        const potentialOpponents = currentDivisionTeams.filter(t => t !== gameState.team);  
        if (potentialOpponents.length > 0) {  
            const opponent = potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];  
            gameState.nextOpponent = opponent;  
            if (gameState.staff.segundoEntrenador) {  
                addNews(`[Segundo Entrenador] Hemos recibido una invitación para un amistoso de pretemporada contra el ${opponent}.`, 'info');  
            } else {  
                addNews(`Invitación para amistoso de pretemporada contra el ${opponent}.`, 'info');  
            }  
        }  
    }  
}  
  
function updateWeeklyFinancials() {  
    const playerSalaries = gameState.squad.reduce((sum, p) => sum + p.salary, 0);  
    const staffSalaries = Object.values(gameState.staff).reduce((sum, s) => sum + (s?.salary || 0), 0);  
    gameState.weeklyExpenses = playerSalaries + staffSalaries;  
  
    let attendance = Math.floor(gameState.stadiumCapacity * (0.5 + (gameState.popularity / 200) - (gameState.ticketPrice / 100)));  
    attendance = Math.max(0, Math.min(gameState.stadiumCapacity, attendance));  
  
    gameState.merchandisingItemsSold = Math.floor(gameState.fanbase * (gameState.popularity / 500) * (0.01 + Math.random() * 0.02));  
    gameState.merchandisingRevenue = gameState.merchandisingItemsSold * gameState.merchandisingPrice;  
  
    gameState.weeklyIncome = gameState.weeklyIncomeBase +  
                             Math.floor(gameState.ticketPrice * attendance) +  
                             gameState.merchandisingRevenue;  
  
   if (gameState.team && !window._financesSuppressBalance) {
    gameState.balance = gameState.balance + gameState.weeklyIncome - gameState.weeklyExpenses;
}
}  
  
function expandStadium(cost = 50000, capacityIncrease = 10000) {  
    if (gameState.balance < cost) {  
        return { success: false, message: 'Dinero insuficiente para expandir el estadio.' };  
    }  
    gameState.balance -= cost;  
    gameState.stadiumCapacity += capacityIncrease;  
    gameState.weeklyIncomeBase += Math.floor(capacityIncrease / 20);  
    updateWeeklyFinancials();  
    addNews(`¡Estadio expandido a ${gameState.stadiumCapacity.toLocaleString('es-ES')} espectadores!`);  
    return { success: true, message: `¡Estadio expandido a ${gameState.stadiumCapacity} espectadores!` };  
}  
  
function improveFacilities(cost = 30000, trainingLevelIncrease = 1) {  
    if (gameState.balance < cost) {  
        return { success: false, message: 'Dinero insuficiente para mejorar las instalaciones.' };  
    }  
    gameState.balance -= cost;  
    gameState.trainingLevel = (gameState.trainingLevel || 0) + trainingLevelIncrease;  
    gameState.merchandisingRevenue += 200;  
    updateWeeklyFinancials();  
    addNews(`¡Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}!`);  
    return { success: true, message: `¡Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}!` };  
}  
  
let currentStaffCandidates = {};  
  
// Los candidatos se mantienen hasta la jornada siguiente (antes cambiaban en
// cada clic en "Contratar"). Se guardan en la partida para que sobrevivan a recargas.
function staffCandidatesKey() {
    return `${gameState.currentSeason}|${gameState.seasonType}|${gameState.week}`;
}

function generateStaffCandidates(role, forceNew = false) {  
    const cache = gameState.staffCandidates || (gameState.staffCandidates = {});
    if (cache[role] && cache[role].key === staffCandidatesKey() && Array.isArray(cache[role].list)) {
        return cache[role].list;
    }
  
    const candidates = [];  
    const roleConfig = STAFF_ROLES[role];  
    const staffNames = ["Juan", "Pedro", "María", "Carlos", "Ana", "Luis", "Sofía", "Pablo", "Laura", "Diego", "Miguel", "Sergio", "Elena", "Ricardo", "Carmen", "Javier"];  
  
    const divisionForMultiplier = gameState.division.includes('rfef') ? 'rfef_grupo1' : gameState.division;  
    const divisionFactor = DIVISION_MULTIPLIERS[divisionForMultiplier] || 1;  
  
    for (let i = 0; i < 3; i++) {  
        const level = 1 + Math.floor(Math.random() * 5); // Nivel 1 a 5  
        const salaryScale = ECONOMY.staffSalaryScale[gameState.division] ?? 1;
        const salary = Math.floor((roleConfig.minSalary + (roleConfig.maxSalary - roleConfig.minSalary) * (level / 5)) * salaryScale);  
        const name = staffNames[Math.floor(Math.random() * staffNames.length)] + " " + staffNames[Math.floor(Math.random() * staffNames.length)];  
  
        let clausula = Math.floor(roleConfig.baseClausula * level * roleConfig.levelCostMultiplier * divisionFactor * salaryScale * (0.8 + Math.random() * 0.4));  
  
        if (level === 1 && Math.random() < 0.5) {  
            clausula = 0;  
        } else if (level <= 2 && Math.random() < 0.2) {  
            clausula = 0;  
        } else {  
            clausula = Math.max(clausula, 1000);  
        }  
  
        candidates.push({ name: name, level: level, salary: Math.round(salary), role: role, displayName: roleConfig.displayName, clausula: Math.round(clausula) });  
    }  
    currentStaffCandidates[role] = candidates;  
    cache[role] = { key: staffCandidatesKey(), list: candidates };
    return candidates;  
}  

// Qué aporta cada empleado según su nivel (efectos reales del juego)
function staffEffectText(role, level) {
    const lv = Math.max(1, Math.min(5, level || 1));
    const eff = STAFF_LEVEL_EFFECTS[lv] || {};
    const pct = x => `${Math.round(x)} %`;
    switch (role) {
        case 'medico': return `Acorta las lesiones un ${pct(lv * 10)}.`;
        case 'fisio': return `Reduce el riesgo de lesión un ${pct(lv * 5)} y da un ${pct(lv * 10)} de probabilidad de recuperar a un lesionado una semana antes.`;
        case 'entrenador': return `Reduce el riesgo de lesión un ${pct(lv * 8)} (sin él, +20 %) y multiplica la progresión anual de los jóvenes ×${eff.training ?? 1} (sin él, ×0,8).`;
        case 'entrenadorPorteros': return `Mejora el entrenamiento de los porteros en EN, CA y DF (nivel ${lv}).`;
        case 'segundoEntrenador': return `Cubre automáticamente las bajas del once, avisa de alineaciones inválidas y de carencias en la plantilla. Con nivel alto, mejores sustitutos.`;
        case 'analista': return `Informe del próximo rival antes de cada partido: nivel 1 datos básicos; nivel ${lv >= 4 ? lv + ' formación y mentalidad recomendadas' : lv + ' datos de ataque y defensa'}.`;
        case 'scout': return `Muestra ${30 + lv * 10} jugadores en el mercado y encuentra promesas de media ${35 + lv * 5}-${50 + lv * 5}.`;
        case 'secretario': return `Mejora un ${pct(Math.max(0, ((eff.negotiation ?? 1) - 0.5) * 15))} la probabilidad de cerrar fichajes y renovaciones, y avisa de precios de venta excesivos.`;
        case 'entrenadorJuveniles': return `Hace progresar a los jugadores de la cantera cada semana (más rápido cuanto mayor el nivel).`;
        default: return '';
    }
}
  
function hireStaffFromCandidates(candidate) {  
    const existingStaff = gameState.staff[candidate.role];  
    let indemnization = 0;  
  
    if (existingStaff) {  
        indemnization = existingStaff.salary * 52;  
        if (gameState.balance < indemnization + candidate.clausula + candidate.salary) {  
            return { success: false, message: `Dinero insuficiente. Necesitas ${indemnization.toLocaleString('es-ES')}€ para indemnizar a ${existingStaff.name} y pagar al nuevo staff.`, type: 'error' };  
        }  
        gameState.balance -= indemnization;  
        addNews(`¡${existingStaff.name} (${existingStaff.displayName}) ha sido despedido con una indemnización de ${indemnization.toLocaleString('es-ES')}€!`, 'warning');  
    }  
  
    if (gameState.balance < candidate.clausula) {  
        return { success: false, message: `Dinero insuficiente para pagar la cláusula de ${candidate.clausula.toLocaleString('es-ES')}€.` };  
    }  
    if (gameState.balance < candidate.salary) {  
        return { success: false, message: `Dinero insuficiente para pagar el salario de ${candidate.salary.toLocaleString('es-ES')}€/sem.` };  
    }  
  
    gameState.balance -= candidate.clausula;
    // (La cláusula e indemnización del personal se registran en "Cláusulas + indem.
    // staff"; antes se sumaban también a "Inversión en fichajes" y el balance las contaba dos veces.)
    gameState.staff[candidate.role] = candidate;  
    currentStaffCandidates[candidate.role] = null;  
    if (gameState.staffCandidates?.[candidate.role]?.list) {
        gameState.staffCandidates[candidate.role].list = gameState.staffCandidates[candidate.role].list
            .filter(c => !(c.name === candidate.name && c.level === candidate.level));
    }
    updateWeeklyFinancials();  
    addNews(`¡${candidate.name} (${candidate.displayName}, Nivel ${candidate.level}) se une al staff! (Cláusula: ${candidate.clausula.toLocaleString('es-ES')}€)`, 'success');  
    return { success: true, message: `¡${candidate.displayName} ${candidate.name} contratado exitosamente!` };  
}  
  
function setTicketPrice(newPrice) {  
    newPrice = parseInt(newPrice);  
    if (isNaN(newPrice) || newPrice < 5 || newPrice > 100) {  
        return { success: false, message: 'El precio de la entrada debe ser un número entre 5 y 100.' };  
    }  
    gameState.ticketPrice = newPrice;  
    updateWeeklyFinancials();  
    return { success: true, message: `El precio de la entrada se ha establecido en ${newPrice}€.` };  
}  
  
function setMerchandisingPrice(newPrice) {  
    newPrice = parseInt(newPrice);  
    if (isNaN(newPrice) || newPrice < 1 || newPrice > 50) {  
        return { success: false, message: 'El precio del merchandising debe ser un número entre 1 y 50.' };  
    }  
    gameState.merchandisingPrice = newPrice;  
    updateWeeklyFinancials();  
    return { success: true, message: `El precio del merchandising se ha establecido en ${newPrice}€.` };  
}  
  
function getLineup() {  
    return [...gameState.lineup];  
}  
  
function getReservePlayers() {  
    const lineupNames = new Set(gameState.lineup.map(p => p.name));  
    return gameState.squad.filter(p => !lineupNames.has(p.name));  
}  
  
function setLineup(newLineup) {  
    // Asegurarse de que la nueva alineación no tenga más de 11 jugadores      
    if (newLineup.length > 11) {  
        // Esto no debería pasar con la lógica actual, pero es una salvaguarda      
        console.warn("Intentando establecer una alineación con más de 11 jugadores. Se truncará.");  
        newLineup = newLineup.slice(0, 11);  
    }  
          
    // Rellenar con los mejores jugadores disponibles de la plantilla si la nueva alineación es menor de 11      
    // Esto es importante para que siempre haya 11 en `gameState.lineup`      
    if (newLineup.length < 11) {  
        const availableSquadPlayers = gameState.squad.filter(p => !p.isInjured);  
        const currentLineupNames = new Set(newLineup.map(p => p.name));  
        const playersToFill = availableSquadPlayers  
                                .filter(p => !currentLineupNames.has(p.name))  
                                .sort((a,b) => b.overall - a.overall)  
                                .slice(0, 11 - newLineup.length);  
              
        gameState.lineup = [...newLineup, ...playersToFill];  
        // Asegurarse de que no hay más de 11 después de rellenar      
        if (gameState.lineup.length > 11) {  
            gameState.lineup = gameState.lineup.slice(0, 11);  
        }  
    } else {  
        gameState.lineup = newLineup;  
    }  
  
    // Asegurarse de que todos los jugadores en gameState.lineup existen en gameState.squad      
    const validPlayers = gameState.lineup.every(p => gameState.squad.some(s => s.name === p.name));  
    if (!validPlayers) {  
        // Si hay jugadores en la alineación que ya no están en la plantilla (ej. vendidos),      
        // limpiar y reconstruir la alineación      
        console.warn("Jugadores en la alineación no encontrados en la plantilla. Reconstruyendo alineación.");  
        const currentSquadNames = new Set(gameState.squad.map(p => p.name));  
        const filteredLineup = gameState.lineup.filter(p => currentSquadNames.has(p.name));  
        gameState.lineup = filteredLineup;  
        // Rellenar de nuevo si es necesario      
        if (gameState.lineup.length < 11) {  
            const availableSquadPlayers = gameState.squad.filter(p => !p.isInjured);  
            const currentFilteredLineupNames = new Set(filteredLineup.map(p => p.name));  
            const playersToFill = availableSquadPlayers  
                                    .filter(p => !currentFilteredLineupNames.has(p.name))  
                                    .sort((a,b) => b.overall - a.overall)  
                                    .slice(0, 11 - gameState.lineup.length);  
            gameState.lineup = [...gameState.lineup, ...playersToFill];  
        }  
    }  
      
    return { success: true, message: 'Alineación guardada correctamente.' };  
}  
  
function validateLineup(lineupToCheck) {  
    if (!Array.isArray(lineupToCheck) || lineupToCheck.length !== 11) {  
        return { success: false, message: 'La alineación debe contener exactamente 11 jugadores.' };  
    }  
  
    // ✅ Filtrar jugadores disponibles (no lesionados Y no cedidos OUT)
    const availablePlayers = gameState.squad.filter(p => 
        !p.isInjured && 
        p.contractType !== 'loaned_out'
    );
    const availablePlayerNames = new Set(availablePlayers.map(p => p.name));  
    const playerNamesInLineup = new Set();  
    let hasGK = false;  
    let numNonGkPlayers = 0;  
  
    for (const player of lineupToCheck) {  
        if (!player) {  
            return { success: false, message: '¡Error! Hay slots vacíos en la alineación. Debes rellenar los 11 puestos.' };  
        }  
        if (playerNamesInLineup.has(player.name)) {  
            return { success: false, message: `¡Error! El jugador ${player.name} está duplicado en la alineación.` };  
        }  
        playerNamesInLineup.add(player.name);  
  
        if (!availablePlayerNames.has(player.name)) {  
            const fullPlayer = gameState.squad.find(p => p.name === player.name);  
            if (fullPlayer && fullPlayer.isInjured) {  
                return { success: false, message: `¡Error! ${player.name} está lesionado y no puede jugar.` };  
            }
            // ✅ Verificar si está cedido OUT
            if (fullPlayer && fullPlayer.contractType === 'loaned_out') {
                return { success: false, message: `¡Error! ${player.name} está cedido al ${fullPlayer.loanedTo} y no puede jugar.` };
            }
            return { success: false, message: `¡Error! ${player.name} no está en la plantilla o no está apto.` };  
        }  
  
        if (player.position === 'POR') {  
            hasGK = true;  
        } else {  
            numNonGkPlayers++;  
        }  
    }  
  
    if (!hasGK) {  
        return { success: false, message: '¡Error! Necesitas al menos un portero en la alineación.' };  
    }  
        
    if (numNonGkPlayers !== 10) {  
        return { success: false, message: '¡Error! Debes alinear exactamente 1 portero y 10 jugadores de campo.' };  
    }  
  
    return { success: true, message: 'Alineación válida.' };  
} 
  
function saveToLocalStorage() {  
    // localStorage DESACTIVADO - usar Firebase
    console.log('🚫 saveToLocalStorage desactivado - usa Firebase');
    return { success: false, message: 'Usa Firebase para guardar partidas.' };  
}
  
function loadFromLocalStorage() {  
    // localStorage DESACTIVADO - retornar siempre false
    console.log('🚫 loadFromLocalStorage desactivado - usa Firebase');
    return { success: false, message: 'Usa Firebase para cargar partidas.' };  
}
  
function resetGame() {  
    localStorage.removeItem('pcfutbol-save');  
    initPlayerDatabase();  
    initYoungsterDatabase();  
    window.location.reload();  
}  
  
// NEW: Función para obtener el calendario completo  
function getSeasonCalendar() {  
    return gameState.seasonCalendar;  
}  

// ✅ AÑADIR EN gameLogic.js

function firePlayer(playerName) {
    const playerIndex = gameState.squad.findIndex(p => p.name === playerName);
    
    if (playerIndex === -1) {
        return { success: false, message: 'Jugador no encontrado.' };
    }
    
    const player = gameState.squad[playerIndex];
    
    // Solo se pueden despedir jugadores propios
    if (player.contractType !== 'owned') {
        return { success: false, message: 'Solo puedes despedir jugadores en propiedad.' };
    }
    
    // Calcular indemnización (salario × años restantes)
    const compensation = player.salary * player.contractYears * 52; // 52 semanas/año
    
    if (gameState.balance < compensation) {
        return { 
            success: false, 
            message: `No tienes suficiente dinero para pagar la indemnización de ${compensation.toLocaleString('es-ES')}€` 
        };
    }
    
    // Pagar indemnización
    gameState.balance -= compensation;
    
    // Registrar gasto
    if (!gameState.playerCompensations) gameState.playerCompensations = 0;
    gameState.playerCompensations += compensation;
    
    // Eliminar jugador
    gameState.squad.splice(playerIndex, 1);
    
    // Noticia
    addNews(
        `🚪 ${playerName} ha sido despedido del club. Indemnización pagada: ${compensation.toLocaleString('es-ES')}€`,
        'warning'
    );
    
    return { 
        success: true, 
        message: `${playerName} ha sido despedido. Indemnización: ${compensation.toLocaleString('es-ES')}€`,
        compensation: compensation
    };
}

// ========================================
// SISTEMA DE OFERTAS DE IA PARA VENTAS/CESIONES
// ========================================

// Función que se ejecuta cada semana para generar ofertas
function generateAIOffers() {
    const week = gameState.week;
    // Caducan las ofertas antiguas y las de jugadores que ya no están en venta
    gameState.pendingOffers = (gameState.pendingOffers || []).filter(o => {
        const p = gameState.squad.find(x => x.name === o.player?.name);
        if (!p || p.contractType !== 'owned') return false;
        if (o.type === 'transfer' && !p.transferListed) return false;
        if (o.type === 'loan' && !p.loanListed) return false;
        return o.season !== gameState.currentSeason || (week - (o.week ?? week)) < ECONOMY.offerLifetimeWeeks;
    });

    const playersForSale = gameState.squad.filter(p =>
        (p.transferListed || p.loanListed) && p.contractType === 'owned'
    );
    if (playersForSale.length === 0) return;

    let created = 0;
    playersForSale.forEach(player => {
        if (makeOfferForPlayer(player, { silent: true })) created++;
    });
    if (created) showOffersModal();
}

// Interés de la IA según lo razonable que sea el precio pedido.
// Devuelve la oferta creada o null.
function makeOfferForPlayer(player, { silent = false } = {}) {
    const offers = gameState.pendingOffers || (gameState.pendingOffers = []);
    if (offers.filter(o => o.player?.name === player.name).length >= ECONOMY.maxOffersPerPlayer) return null;

    const value = marketValue(player);
    let offer = null;

    if (player.transferListed) {
        const asking = player.askingPrice > 0 ? player.askingPrice : value;
        const ratio = asking / Math.max(1, value);
        let chance = ratio <= 1 ? 0.6 : ratio <= 1.3 ? 0.3 : ratio <= 1.6 ? 0.08 : 0;
        if ((player.weeksOnMarket || 0) >= 4 && ratio <= 1.3) chance += 0.15;
        if (Math.random() >= chance) {
            if (ratio > 1.6 && player.weeksOnMarket === 4) {
                addNews(`[Secretario Técnico] Nadie pregunta por ${player.name}: pides ${asking.toLocaleString('es-ES')}€ y su valor de mercado ronda ${value.toLocaleString('es-ES')}€.`, 'warning');
            }
            return null;
        }
        const buyer = pickBuyerClub(Math.min(asking, value), player.overall || 60);
        if (!buyer || offers.some(o => o.player?.name === player.name && o.club === buyer.club)) return null;

        // Nunca más de lo que piden ni más de lo que el club puede pagar
        const maxAmount = Math.min(ECONOMY.maxSpend[buyer.division], roundMoney(value * 1.15));
        const amount = roundMoney(Math.min(asking, maxAmount, value * (0.8 + Math.random() * 0.35)));
        if (amount <= 0) return null;
        offer = {
            type: 'transfer', player, club: buyer.club, amount,
            originalAskingPrice: asking, maxAmount: Math.min(maxAmount, Math.max(amount, asking)),
            week: gameState.week, season: gameState.currentSeason, timestamp: Date.now()
        };
        addNews(`📨 ¡Oferta recibida! ${buyer.club} ofrece ${amount.toLocaleString('es-ES')}€ por ${player.name} (pedías ${asking.toLocaleString('es-ES')}€)`,
            amount >= asking ? 'success' : 'info');
    } else if (player.loanListed) {
        if (Math.random() >= 0.4) return null;
        const buyer = pickBuyerClub(0, player.overall || 60);
        if (!buyer || offers.some(o => o.player?.name === player.name && o.club === buyer.club)) return null;
        const wagePercentage = 0.3 + Math.random() * 0.4;
        const wageContribution = Math.round(player.salary * wagePercentage);
        offer = {
            type: 'loan', player, club: buyer.club, wageContribution, totalSalary: player.salary,
            week: gameState.week, season: gameState.currentSeason, timestamp: Date.now()
        };
        addNews(`📨 ¡Oferta de cesión! ${buyer.club} quiere a ${player.name} cedido y asumiría ${wageContribution.toLocaleString('es-ES')}€/sem de su salario (${Math.round(wagePercentage * 100)}%)`, 'info');
    }
    if (!offer) return null;
    offers.push(offer);
    if (!silent) showOffersModal();
    return offer;
}

// Compatibilidad: nombre anterior
function generateOfferForPlayer(player) { return makeOfferForPlayer(player); }

// Mostrar modal con todas las ofertas pendientes
function showOffersModal() {
    const modal = document.getElementById('offersModal');
    if (!modal) {
        console.error('Modal de ofertas no encontrado');
        return;
    }
    
    renderOffersList();
    modal.classList.add('active');
}

// Renderizar lista de ofertas
function renderOffersList() {
    const list = document.getElementById('offersList');
    if (!list) return;
    
    if (!gameState.pendingOffers || gameState.pendingOffers.length === 0) {
        list.innerHTML = '<div class="alert alert-info">No hay ofertas pendientes</div>';
        return;
    }
    
    let html = '<h2>📨 Ofertas Recibidas</h2>';
    
    gameState.pendingOffers.forEach((offer, index) => {
        if (offer.type === 'transfer') {
            // Oferta de COMPRA
            const percentage = Math.round((offer.amount / offer.originalAskingPrice) * 100);
            const isGoodOffer = offer.amount >= offer.originalAskingPrice;
            
            html += `
                <div class="offer-card" style="
                    border: 2px solid ${isGoodOffer ? '#4CAF50' : '#FF9800'};
                    background: rgba(${isGoodOffer ? '76, 175, 80' : '255, 152, 0'}, 0.1);
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 5px;
                ">
                    <h3 style="color: #FFD700;">💰 Oferta de Compra</h3>
                    <p><strong>Jugador:</strong> ${offer.player.name} (${offer.player.position}, OVR ${offer.player.overall})</p>
                    <p><strong>Club:</strong> ${offer.club}</p>
                    <p><strong>Oferta:</strong> <span style="color: #4CAF50; font-size: 1.2em;">${offer.amount.toLocaleString('es-ES')}€</span></p>
                    <p><strong>Precio solicitado:</strong> ${offer.originalAskingPrice.toLocaleString('es-ES')}€ 
                       <span style="color: ${isGoodOffer ? '#4CAF50' : '#ff3333'};">(${percentage}%)</span>
                    </p>
                    
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn" style="background: #4CAF50;" onclick="window.acceptOffer(${index})">
                            ✅ Aceptar
                        </button>
                        <button class="btn" style="background: #2196F3;" onclick="window.counterOffer(${index})">
                            🔄 Contraoferta
                        </button>
                        <button class="btn" style="background: #c73446;" onclick="window.rejectOffer(${index})">
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            `;
        } else if (offer.type === 'loan') {
            // Oferta de CESIÓN
            const percentage = Math.round((offer.wageContribution / offer.totalSalary) * 100);
            const isGoodOffer = percentage >= 50;
            
            html += `
                <div class="offer-card" style="
                    border: 2px solid ${isGoodOffer ? '#2196F3' : '#FF9800'};
                    background: rgba(${isGoodOffer ? '33, 150, 243' : '255, 152, 0'}, 0.1);
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 5px;
                ">
                    <h3 style="color: #FFD700;">🔄 Oferta de Cesión</h3>
                    <p><strong>Jugador:</strong> ${offer.player.name} (${offer.player.position}, OVR ${offer.player.overall})</p>
                    <p><strong>Club:</strong> ${offer.club}</p>
                    <p><strong>Salario total:</strong> ${offer.totalSalary.toLocaleString('es-ES')}€/sem</p>
                    <p><strong>Asumen:</strong> <span style="color: #4CAF50; font-size: 1.2em;">${offer.wageContribution.toLocaleString('es-ES')}€/sem</span> 
                       <span style="color: ${isGoodOffer ? '#4CAF50' : '#ff3333'};">(${percentage}%)</span>
                    </p>
                    <p><strong>Tú pagas:</strong> <span style="color: #ff3333;">${(offer.totalSalary - offer.wageContribution).toLocaleString('es-ES')}€/sem</span></p>
                    
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn" style="background: #4CAF50;" onclick="window.acceptOffer(${index})">
                            ✅ Aceptar
                        </button>
                        <button class="btn" style="background: #c73446;" onclick="window.rejectOffer(${index})">
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    list.innerHTML = html;
}

// Aceptar oferta
// Aceptar oferta
function acceptOffer(offerIndex) {
    // ✅ VALIDAR
    if (!gameState.pendingOffers || !gameState.pendingOffers[offerIndex]) {
        console.error('❌ Oferta no encontrada:', offerIndex);
        alert('Error: Oferta no válida');
        return;
    }
    
    const offer = gameState.pendingOffers[offerIndex];
    const current = gameState.squad.find(p => p.name === offer.player?.name);
    if (!current || current.contractType !== 'owned') {
        gameState.pendingOffers.splice(offerIndex, 1);
        alert(`La oferta ya no es válida: ${offer.player?.name || 'el jugador'} no está disponible.`);
        renderOffersList();
        return;
    }
    // Las demás ofertas por el mismo jugador dejan de valer
    const otherOffers = gameState.pendingOffers.filter((o, i) => i !== offerIndex && o.player?.name !== current.name);

    if (offer.type === 'transfer') {
        // Venta
        gameState.balance += offer.amount;
        gameState.playerSalesIncome = (gameState.playerSalesIncome || 0) + offer.amount;
        
        // Eliminar jugador de plantilla (y de la alineación)
        replaceInLineup(current.name);
        gameState.squad = gameState.squad.filter(p => p.name !== current.name);
        
        addNews(
            `✅ ¡Venta cerrada! Has vendido a ${offer.player.name} al ${offer.club} por ${offer.amount.toLocaleString('es-ES')}€`,
            'success'
        );
        
    } else if (offer.type === 'loan') {
        // Cesión
        const player = current;
        replaceInLineup(player.name);
        player.contractType = 'loaned_out';
        player.loanedTo = offer.club;
        player.loanSeasonsLeft = 1;           // vuelve al terminar la temporada
        player.originalSalary = player.salary;
        player.salary = Math.max(0, player.salary - offer.wageContribution);
        player.transferListed = false;
        player.loanListed = false;
        
        addNews(
            `✅ ¡Cesión cerrada! Has cedido a ${offer.player.name} al ${offer.club}. Asumen ${offer.wageContribution.toLocaleString('es-ES')}€/sem del salario`,
            'success'
        );
    }
    
    // Eliminar esta oferta y las demás por el mismo jugador
    gameState.pendingOffers = otherOffers;
    
    // ✅ GUARDAR CAMBIOS
    updateWeeklyFinancials();
    saveToLocalStorage();
    
    // Actualizar modal
    if (gameState.pendingOffers.length === 0) {
        const modal = document.getElementById('offersModal');
        if (modal) modal.classList.remove('active');
    } else {
        renderOffersList();
    }
    
    // Refrescar UI
    if (window.ui && window.ui.refreshUI) {
        window.ui.refreshUI(gameState);
    }
}

// Rechazar oferta
function rejectOffer(offerIndex) {
    // ✅ VALIDAR
    if (!gameState.pendingOffers || !gameState.pendingOffers[offerIndex]) {
        console.error('❌ Oferta no encontrada:', offerIndex);
        alert('Error: Oferta no válida');
        return;
    }
    
    const offer = gameState.pendingOffers[offerIndex];
    
    addNews(
        `❌ Has rechazado la oferta de ${offer.club} por ${offer.player.name}`,
        'info'
    );
    
    // Eliminar oferta
    gameState.pendingOffers.splice(offerIndex, 1);
    
    // Actualizar modal
    if (gameState.pendingOffers.length === 0) {
        const modal = document.getElementById('offersModal');
        if (modal) modal.classList.remove('active');
    } else {
        renderOffersList();
    }
}

// Contraoferta (solo para ventas)
function counterOffer(offerIndex) {
    // ✅ VALIDAR
    if (!gameState.pendingOffers || !gameState.pendingOffers[offerIndex]) {
        console.error('❌ Oferta no encontrada:', offerIndex);
        alert('Error: Oferta no válida');
        return;
    }
    
    const offer = gameState.pendingOffers[offerIndex];
    
    const counterAmount = prompt(
        `Contraoferta para ${offer.player.name}\n\n` +
        `Oferta actual: ${offer.amount.toLocaleString('es-ES')}€\n` +
        `Tu precio: ${offer.originalAskingPrice.toLocaleString('es-ES')}€\n\n` +
        `¿Cuánto quieres pedir?`,
        offer.originalAskingPrice
    );
    
    if (!counterAmount) return;
    
    const counter = parseInt(counterAmount);
    if (isNaN(counter) || counter < 0) {
        alert('Cantidad inválida');
        return;
    }
    
    // Aceptan si no supera lo máximo que están dispuestos a pagar
    const maxAmount = offer.maxAmount || roundMoney(offer.amount * 1.1);
    const accepted = counter <= maxAmount && Math.random() < (counter <= offer.amount * 1.05 ? 0.9 : 0.6);
    
    if (accepted) {
        // Aceptan contraoferta
        offer.amount = counter;
        offer.originalAskingPrice = counter;
        
        addNews(
            `✅ ${offer.club} ha aceptado tu contraoferta de ${counter.toLocaleString('es-ES')}€ por ${offer.player.name}`,
            'success'
        );
        
        // Ejecutar venta automáticamente
        acceptOffer(offerIndex);
    } else {
        addNews(
            `❌ ${offer.club} ha rechazado tu contraoferta de ${counter.toLocaleString('es-ES')}€ por ${offer.player.name}`,
            'warning'
        );
        
        // Eliminar oferta
        gameState.pendingOffers.splice(offerIndex, 1);
        
        if (gameState.pendingOffers.length === 0) {
            const modal = document.getElementById('offersModal');
            if (modal) modal.classList.remove('active');
        } else {
            renderOffersList();
        }
    }
}

// Recomendaciones del secretario técnico
function checkMarketRecommendations() {
    const playersForSale = gameState.squad.filter(p => p.transferListed || p.loanListed);
    
    if (playersForSale.length === 0) return;
    
    // Si lleva 3+ semanas sin ofertas
    playersForSale.forEach(player => {
        if (!player.weeksOnMarket) player.weeksOnMarket = 0;
        player.weeksOnMarket++;
        
        if (player.weeksOnMarket >= 3 && gameState.staff.secretario) {
            const recommendation = Math.random();
            
            if (player.transferListed) {
                if (recommendation < 0.5) {
                    const newPrice = Math.round(player.askingPrice * 0.85);
                    addNews(
                        `[Secretario Técnico] ${player.name} lleva ${player.weeksOnMarket} semanas sin ofertas. Recomiendo bajar el precio a ${newPrice.toLocaleString('es-ES')}€`,
                        'warning'
                    );
                } else {
                    addNews(
                        `[Secretario Técnico] ${player.name} no recibe ofertas. Quizá deberías retirarlo del mercado y probarlo en la alineación`,
                        'info'
                    );
                }
            }
        }
    });
}

export {  
    getGameState,  
    updateGameState,  
    selectTeamWithInitialSquad,  
    simulateFullWeek,  
    playMatchImproved, 
    processMatch,
    signPlayer,  
    signYoungster,  
    promoteYoungster,  
    sellPlayer,  
    firePlayer,  // <-- ✅ AÑADE ESTA LÍNEA
    expandStadium,  
    improveFacilities,  
    generateStaffCandidates,  
    hireStaffFromCandidates,  
    setTicketPrice,  
    setMerchandisingPrice,  
    saveToLocalStorage,  
    loadFromLocalStorage,  
    resetGame,  
    initStandings,  
    getPlayerMarket,  
    getYoungsterMarket,  
    startNegotiation,  
    offerToPlayer,  
    offerToClub,  
    endNegotiation,  
    setTrainingFocus,  
    applyWeeklyTraining,  
    addNews,  
    markNewsAsRead,  
    getLineup,  
    getReservePlayers,  
    setLineup,  
    validateLineup,
    generateLeagueCalendar,  
    getSeasonCalendar,
    pickBestXI,
    autoFixLineup,
    sortStandings,
    divisionName
}; 

// ✅ Exponer funciones de ofertas globalmente
if (typeof window !== 'undefined') {
    window.sortStandings = sortStandings;
    window.STAFF_LEVEL_EFFECTS = STAFF_LEVEL_EFFECTS;
    window.pcfEconomy = {
        ECONOMY, marketValue, expectedSalary, secretaryBonus, normalizeMarketPlayer, roundMoney,
        makeOffer: (playerName) => {
            const p = gameState.squad.find(x => x.name === playerName);
            return p ? makeOfferForPlayer(p) : null;
        },
        replaceInLineup
    };
    window.autoFixLineup = autoFixLineup;
    // Para copas y competiciones: fuerza y plantilla reales de un equipo español
    window.pcfTeamStrength = async (team, division) => {
        const div = division || teamDivision(team) || 'segunda';
        const squad = await getAISquadCached(team, div, gameState.currentSeason);
        const formation = chooseAIFormation(squad);
        return calculateTeamEffectiveOverall(pickBestXI(squad, formation), formation);
    };
    window.pcfTeamSquad = async (team, division) => {
        const div = division || teamDivision(team) || 'segunda';
        return getAISquadCached(team, div, gameState.currentSeason);
    };
    window.pcfTeamDivision = teamDivision;
    window.staffEffectText = staffEffectText;
    window.divisionName = divisionName;
    window.acceptOffer = acceptOffer;
    window.rejectOffer = rejectOffer;
    window.counterOffer = counterOffer;
    
    // También exponer el gameLogic completo
    window.gameLogic = {
        getGameState,
        updateGameState,
        selectTeamWithInitialSquad,
        addNews,
        saveToLocalStorage,
        // ... resto de funciones que necesites
    };
}

function getAgeModifier(age) {
    if (age <= 20) return 1.5;        // Juvenil explota
    if (age <= 24) return 1.2;        // Crecimiento
    if (age <= 27) return 1.0;        // Normal
    if (age <= 30) return 0.7;        // Se ralentiza
    if (age <= 33) return 0.3;        // Casi estancado
    return -0.5;                      // Declive
}

// ---------------------------------------------------
// FUNCIÓN PARA ACTUALIZAR EL CÍRCULO CENTRAL
// ---------------------------------------------------
window.renderNextMatchInfo = function(state) {
    if (!state || !state.nextMatch) return;

    const dateEl = document.getElementById('nextMatchDate'); 
    const teamsEl = document.getElementById('nextMatchTeams');
    if (!dateEl || !teamsEl) return;

    // Actualizar jornada
    dateEl.textContent = `Jornada ${state.week}`;

    // Determinar orden de equipos según local/visitante
    let teamDisplay;
    if (state.nextMatch.home === state.team) {
        // Juega en casa
        teamDisplay = `${state.team}\nvs\n${state.nextMatch.away}`;
    } else {
        // Juega fuera
        teamDisplay = `${state.nextMatch.home}\nvs\n${state.team}`;
    }

    teamsEl.textContent = teamDisplay;
};

// ---------------------------------------------------
// ACTUALIZAR CÍRCULO CENTRAL CON PRÓXIMO PARTIDO
// ---------------------------------------------------
window.updateNextMatchInfo = function() {
    // Obtener el próximo partido según el estado
    let nextMatch = null;

    if (gameState.seasonType === 'preseason') {
        // Pretemporada: buscar partido de la semana actual o siguiente
        nextMatch = {
            week: gameState.week,
            home: "Amistoso",
            away: "Amistoso"
        };
    } else {
        // Temporada regular: partido de la próxima jornada
        const nextWeek = gameState.week; // el próximo partido es la jornada actual
        const nextWeekMatches = gameState.seasonCalendar.filter(
            match => match.week === nextWeek &&
                     (match.home === gameState.team || match.away === gameState.team)
        );
        if (nextWeekMatches.length > 0) {
            nextMatch = nextWeekMatches[0];
        }
    }

    // Elementos del HTML
    const dateEl = document.getElementById('nextMatchDate');
    const teamsEl = document.getElementById('nextMatchTeams');
    if (!dateEl || !teamsEl || !nextMatch) return;

    // Jornada
    dateEl.textContent = `Jornada ${nextMatch.week || '-'}`;

    // Determinar orden de equipos según si jugamos en casa o fuera
    let teamDisplay;
    if (nextMatch.home === gameState.team) {
        teamDisplay = `${gameState.team}\nvs\n${nextMatch.away}`;
    } else if (nextMatch.away === gameState.team) {
        teamDisplay = `${nextMatch.home}\nvs\n${gameState.team}`;
    } else {
        // En pretemporada o partido no definido
        teamDisplay = `${nextMatch.home}\nvs\n${nextMatch.away}`;
    }

    teamsEl.textContent = teamDisplay;
};


// ---------------------------------------------------
// LLAMAR AL CARGAR PÁGINA
// ---------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    window.updateNextMatchInfo();
});


// ---------------------------------------------------
// campo de tactica
// ---------------------------------------------------
function renderTactic() {
    const field = document.getElementById('tactic-field');
    const bench = document.getElementById('tactic-bench');

    if (!gameState.lineup || gameState.lineup.length === 0) return;

    field.innerHTML = '';
    bench.innerHTML = '<h3>Suplentes</h3>';

    const formation = gameState.formation || '433';
    const formationMap = {
        '433': [1, 4, 4, 3], // portero + defensa + medio + delantero
        '442': [1, 4, 4, 2],
        '352': [1, 3, 5, 2],
        '541': [1, 5, 4, 1],
        '451': [1, 4, 5, 1]
    };

    const columns = formationMap[formation] || [1, 4, 4, 3];

    // Construir array de jugadores por columna
    const playersByColumn = [];
    let lineupIndex = 0;
    columns.forEach(count => {
        playersByColumn.push(gameState.lineup.slice(lineupIndex, lineupIndex + count));
        lineupIndex += count;
    });

    const totalColumns = columns.length;

    // Dibujar jugadores por columna
    playersByColumn.forEach((columnPlayers, colIndex) => {
        const xPercent = (colIndex + 1) * (100 / (totalColumns + 1));
        const yStep = 100 / (columnPlayers.length + 1);

        columnPlayers.forEach((player, rowIndex) => {
            const yPercent = (rowIndex + 1) * yStep;

            const div = document.createElement('div');
            div.classList.add('player');
            // Destacar jugador en foco de entrenamiento
            if (gameState.trainingFocus.playerIndex === gameState.lineup.indexOf(player)) {
                div.classList.add('training-focus');
            }
            div.style.left = `calc(${xPercent}% )`;
            div.style.top = `calc(${yPercent}% )`;
            div.innerText = player.position;
            div.title = `${player.name} (OVR: ${player.overall})`;
            field.appendChild(div);
        });
    });

    // ------------------------------
    // Renderizar suplentes correctamente
    // ------------------------------
    const benchPlayers = gameState.squad.filter(
        p => !gameState.lineup.some(lp => lp.name === p.name) // filtra por nombre
    );

    benchPlayers.forEach(player => {
        const div = document.createElement('div');
        div.classList.add('bench-player');
        div.textContent = player.position;
        div.title = `${player.name} (OVR: ${player.overall})`;
        bench.appendChild(div);
    });
}



// Llamar cuando abras la página de tácticas
document.getElementById('formationSelect').addEventListener('change', () => {
    renderTactic();
});

// Conexión de selects de formación y mentalidad
window.updateFormation = () => {
    const sel = document.getElementById('formationSelect');
    gameState.formation = sel.value;
    renderTactic();
};

window.updateMentality = () => {
    const sel = document.getElementById('mentalitySelect');
    gameState.mentality = sel.value;
    // Opcional: actualizar colores de jugadores según mentalidad
};

function renderBench() {
    const benchDiv = document.getElementById('tactic-bench');

    // Limpia el contenido anterior (menos el título)
    benchDiv.innerHTML = '<h3>Suplentes</h3>';

    // Itera sobre los suplentes
    gameState.bench.forEach(player => {
        const playerEl = document.createElement('div');
        playerEl.className = 'bench-player';
        playerEl.textContent = player.name; // o icono / número
        benchDiv.appendChild(playerEl);
    });
}

window.updateFormation = () => {
    const sel = document.getElementById('formationSelect');
    gameState.formation = sel.value;
    renderTactic();
    renderBench(); // ✅ actualiza suplentes
};
