// gameLogic.js - Lógica central del juego  

import {  
    TEAMS_DATA, ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS,  
    STAFF_ROLES, STAFF_LEVEL_EFFECTS, DIVISION_MULTIPLIERS,  
    BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS,  
    FORMATIONS, PRESEASON_WEEKS, PROMOTION_RELEGATION // Eliminado SEASON_WEEKS de aquí  
} from './config.js';  
import { getPlayerMarket as getPlayerMarketData, getYoungsterMarket as getYoungsterMarketData, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall, generateRandomName } from './players.js';  
import { getTeamData, saveTeamData } from './teamData.js';


import { simulateFootballMatch, syntheticLineup } from './match-engine.js';
import { CLUB_FIELDS, assignPlayerIds, locatePlayer, moveWorldPlayer, returnWorldLoans, assertWorldOwnership, buildBoardObjectives, evaluateBoardObjectives, retirementProbability } from './world-model.js';

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

// Copia del estado inicial: cada partida nueva parte de aquí (sin restos de la anterior)
const INITIAL_GAME_STATE = JSON.parse(JSON.stringify(gameState));
let stateGeneration=0;
  
function getGameState() {
    captureWorldClub();
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
    if(newState?.world && gameState.world && newState.world.revision < gameState.world.revision) newState={...newState,world:gameState.world};
    Object.assign(gameState, newState);
    captureWorldClub();  
    updateWeeklyFinancials();  
}  

function replaceGameState(saved) {
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.squad) ||
        !Number.isInteger(saved.week) || saved.week < 1) throw new Error('Partida guardada inválida.');
    const restored = JSON.parse(JSON.stringify(saved));
    stateGeneration++;
    Object.keys(gameState).forEach(k => delete gameState[k]);
    Object.assign(gameState, JSON.parse(JSON.stringify(INITIAL_GAME_STATE)), restored);
    // Null explicitly means "no saved competition"; never borrow another career's browser data.
    if (!Object.hasOwn(restored, 'competitions')) gameState.competitions = null;
    if (!Object.hasOwn(restored, 'competitionPlayoff')) gameState.competitionPlayoff = null;
    if (!Object.hasOwn(restored, 'cupData')) gameState.cupData = {};
    aiSquadCache.clear();
    worldTask=null;
    captureWorldClub();
    newsSeq = Math.max(newsSeq, ...(gameState.newsFeed || []).map(n => Number(n.id) || 0));
    updateWeeklyFinancials();
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('pcf:state-replaced'));
    }
    return getGameState();
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
                        completedPlayer.potential = estimatePotential(completedPlayer);
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
                if (realSquad.length < 20) {
                    const completed = topUpSquad(realSquad, gameState.division, gameState.team, 20);
                    addNews(`[Secretario Técnico] Tu plantilla solo tenía ${realSquad.length} jugador(es) inscritos: hemos incorporado ${completed.length - realSquad.length} jugadores para completarla.`, 'info');
                    return completed;
                }
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
    (gameState.squad || []).forEach(p => { p.goals=0;p.cupGoals=0;p.assists=0;p.minutes=0;p.keeperMinutes=0;p.goalsConceded=0;p.leagueKeeperMinutes=0;p.leagueGoalsConceded=0; });      // los goles del Pichichi se cuentan por temporada  
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
        p.weeksOut=Math.max(0,(p.weeksOut||0)-(window.PCF_OFFSEASON_WEEKS||8));
        p.isInjured=p.weeksOut>0;
        if(!p.isInjured)p.injuryType=null;
        p.condition=Math.min(100,(p.condition??100)+15*(window.PCF_OFFSEASON_WEEKS||8)); 

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
        p.ovrSeasonStart = p.overall;

        // Retirada: más probable cuanto mayor (34: 10 %, 35: 25 %, 36: 45 %, 37+: 70 %)
        const retireChance = retirementProbability(p.age,p.position);
        if (p.contractType !== 'loaned' && Math.random() < retireChance) {
            if(gameState.world)gameState.world.retired=(gameState.world.retired||[]).concat({id:p.id,name:p.name,club:gameState.team,season:gameState.currentSeason,career:p.career||[]}).slice(-300);
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
        p.weeksOut=Math.max(0,(p.weeksOut||0)-(window.PCF_OFFSEASON_WEEKS||8));
        p.isInjured=p.weeksOut>0;
        if (p.age < 20) return true;
        const bestSquad = gameState.squad.filter(x => x.position === p.position).map(x => x.overall).sort((a, b) => b - a);
        const competitive = bestSquad.length < 3 || p.overall >= (bestSquad[2] || 0) - 6;
        if (competitive && gameState.squad.length < 25) {
            gameState.squad.push({ ...p, club: gameState.team, contractType: 'owned', contractYears: 3,
                salary: Math.max(p.salary || 0, expectedSalary(p, nextDivisionKey) * 0.5) });
            addNews(`🎓 ${p.name} (${p.position}, ${p.overall}) cumple 20 años y pasa al primer equipo.`, 'success');
        } else {
            registerWorldFreeAgent(p);
            addNews(`🎓 ${p.name} cumple 20 años y deja la cantera sin hueco en el primer equipo.`, 'info');
        }
        return false;
    });
  
    // Reestablecer alineación
    setLineup(pickBestXI(gameState.squad, gameState.formation || '433').filter(Boolean));
}
 
  
// ✅ MODIFICAR selectTeamWithInitialSquad para usar await (línea 454-498)
async function selectTeamWithInitialSquad(teamName, divisionType, gameMode, options = {}) {
    if(options.keepTime && gameState.team) return await switchPersistentClub(teamName,divisionType,gameMode);
    const previousState=getGameState();
    stateGeneration++;worldTask=null;
    // Cambio de club en plena carrera: se conserva la temporada, la jornada y las ligas
    const snap = options.keepTime ? {
        currentSeason: gameState.currentSeason, seasonType: gameState.seasonType, week: gameState.week,
        leagues: gameState.leagues ? JSON.parse(JSON.stringify(gameState.leagues)) : null,
        lastSeasonSummary: gameState.lastSeasonSummary, news: (gameState.newsFeed || []).slice(0, 12),
        previousTeam: gameState.team, previousDivision: gameState.division,
        standings: JSON.parse(JSON.stringify(gameState.standings)),
        calendar: gameState.seasonCalendar, history: gameState.matchHistory, aiSquads: gameState.aiSquads
    } : null;
    // Partida nueva: el estado vuelve al inicial (personal, instalaciones, préstamos,
    // ofertas, datos de otros módulos...). Solo se conservan los agentes libres del mercado.
    const keepFreeAgents = null;
    aiSquadCache.clear();
    Object.keys(gameState).forEach(k => { delete gameState[k]; });
    Object.assign(gameState, JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
    if (Array.isArray(keepFreeAgents)) gameState.freeAgentsPool = keepFreeAgents;
    // 📄 RESET COMPLETO DEL ESTADO
    Object.assign(gameState, {
        team: teamName,
        division: divisionType,
        gameMode: gameMode,
        competitions: null, competitionPlayoff: null, cupData: {}, financePostings: {},
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
    gameState.ticketPrice = Math.max(1, Math.round(ticketRefPrice(gameState)));
    gameState.merchandisingPrice = 10;

    // Cargar equipos y calendario
    // Estructura de ligas propia de esta partida (copia de la configuración del Admin)
    gameState.leagues = (snap && snap.leagues) ? snap.leagues : buildLeaguesFromConfig();
    if (snap) {
        gameState.currentSeason = snap.currentSeason;
        gameState.seasonType = snap.seasonType;
        gameState.week = snap.week;
        gameState.lastSeasonSummary = snap.lastSeasonSummary;
        gameState.newsFeed = snap.news;
        gameState.aiSquads = snap.aiSquads || {};
    }
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
    // Mitad de temporada: la nueva liga lleva jugadas las jornadas anteriores
    if (snap && snap.previousDivision === divisionType) {
        gameState.standings = snap.standings;
        gameState.seasonCalendar = snap.calendar;
        gameState.matchHistory = snap.history;
    } else if (snap && snap.seasonType === 'regular' && snap.week > 1) {
        const played = [];
        gameState.standings = await simulateLeagueTable(teamsInDivision, divisionType, gameState.currentSeason, snap.week, played);
        gameState.matchHistory = played;
    }

    // Alineación inicial automática: mejor once en la formación actual
    gameState.lineup = pickBestXI(gameState.squad, gameState.formation || '433').filter(Boolean);
    if (gameState.lineup.length < 11) setLineup(gameState.lineup);

    if (snap) addNews(`🎯 Nuevo club: ${teamName}. Retomas la temporada ${gameState.currentSeason} en la jornada ${gameState.week}.`, 'info');
    else addNews(`¡Bienvenido al PC Fútbol Manager, temporada ${gameState.currentSeason}!`, 'info');
    gameState.boardConfidence = 65; gameState.boardWarn = 0; gameState.boardTargetSeason = null;
    await ensureWorld();
    const accepted=await computeBoardTarget(true);
    if(accepted===false){replaceGameState(previousState);return {success:false,cancelled:true};}
    captureWorldClub();updateWeeklyFinancials();return {success:true};
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
    const room = age <= 17 ? 12 + Math.floor(Math.random() * 24) : age <= 21 ? 6 + Math.floor(Math.random() * 12) : age <= 25 ? Math.floor(Math.random() * 8) : Math.floor(Math.random() * 3);
    player.potential = Math.min(95, player.overall + room);
    player.salary = expectedSalary(player, division);
    player.value = marketValue(player);
    player.releaseClause = roundMoney(player.value * 2.5);
    return player;
}

// Completa una plantilla incompleta (equipos de un JSON con pocos jugadores): cubre
// primero las posiciones imprescindibles y genera jugadores del nivel del propio equipo.
function topUpSquad(squad, division, club, min = 20) {
    const out = Array.isArray(squad) ? [...squad] : [];
    if (out.length >= min) return out;
    const q = (SQUAD_QUALITY[division] || SQUAD_QUALITY.segunda).target;
    const avg = out.length ? Math.round(out.reduce((t, p) => t + (p.overall || q), 0) / out.length) : q;
    const target = Math.max(q - 8, Math.min(avg, q + 6));
    const need = {}, have = {};
    SQUAD_TEMPLATE.forEach(pos => { need[pos] = (need[pos] || 0) + 1; });
    out.forEach(p => { have[p.position] = (have[p.position] || 0) + 1; });
    const missing = [];
    Object.keys(need).forEach(pos => { for (let i = have[pos] || 0; i < need[pos]; i++) missing.push(pos); });
    missing.sort((a, b) => (a === 'POR' ? -1 : 0) - (b === 'POR' ? -1 : 0));
    const extras = ['MC', 'DFC', 'EXT', 'DC', 'LD', 'LI', 'MCO'];
    let k = 0;
    while (out.length < min) {
        const pos = missing.length ? missing.shift() : extras[k++ % extras.length];
        const pl = buildGeneratedPlayer(pos, target + Math.round(Math.random() * 6 - 4), division === 'promesas' ? 14 + Math.floor(Math.random() * 4) : 18 + Math.floor(Math.random() * 14), division);
        pl.club = club;
        out.push(pl);
    }
    return out;
}

function generateDivisionSquad(division, club = gameState.team) {
    const base = (SQUAD_QUALITY[division] || SQUAD_QUALITY.segunda).target;
    return SQUAD_TEMPLATE.map((pos, i) => {
        const starter = i % 2 === 0 || pos === 'POR' && i === 0;
        const target = base + (starter ? 2 : -3) + Math.round(Math.random() * 6 - 3);
        const age = division === 'promesas' ? 14 + Math.floor(Math.random() * 4) : 18 + Math.floor(Math.random() * 15);
        return { ...buildGeneratedPlayer(pos, target, age, division), club };
    });
}

// ── Progresión anual (al empezar cada temporada) ───────────────
// Media objetivo de cambio por edad; los minutos y el preparador físico la modulan.
// Puntos de media que gana al año un jugador joven, según su edad exacta.
// Un chaval de 14-15 años crece mucho más que uno de 20.
function youthGrowthBase(age) {
    return age <= 14 ? 8 : age === 15 ? 7.5 : age === 16 ? 6.5 : age === 17 ? 5.5 : age === 18 ? 4.5 : age === 19 ? 3.8 : 3;
}
// Potencial estimado para jugadores importados que no lo traen: un chaval de 14 años
// tiene mucho más margen que uno de 24. Varía de un jugador a otro (según su nombre)
// y es siempre el mismo para el mismo jugador.
function nameHash01(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function estimatePotential(p) {
    const ovr = p.overall || 50, age = p.age || 25;
    const h = nameHash01((p.name || '') + 'pot');
    const base = age <= 21 ? Math.max(4, (22 - age) * 4) : age <= 25 ? (26 - age) * 1.5 : 0;
    return Math.min(95, ovr + Math.round(base * (0.4 + 0.9 * h) + (age <= 25 ? 0 : h * 2)));
}
function ensurePotential(p) {
    if (p && p.potential === undefined) p.potential = estimatePotential(p);
    return p;
}
// Mejora semanal de los jóvenes (< 20 años): pequeños avances visibles durante la temporada
function weeklyYouthGrowth() {
    const coach = gameState.staff && gameState.staff.entrenador ? (STAFF_LEVEL_EFFECTS[gameState.staff.entrenador.level]?.training ?? 1) : 0.85;
    let risers = 0;
    (gameState.squad || []).forEach(p => {
        if (!p) return;
        if (p.ovrSeasonStart === undefined) p.ovrSeasonStart = p.overall;
        if ((p.age || 30) > 19 || p.isInjured || p.contractType === 'loaned_out') return;
        ensurePotential(p);
        if ((p.overall || 0) >= (p.potential || 0)) return;
        const chance = (p.age <= 16 ? 0.55 : p.age === 17 ? 0.5 : p.age === 18 ? 0.42 : 0.34) * coach;
        if (Math.random() > chance) return;
        const a = ATTRIBUTES[Math.floor(Math.random() * ATTRIBUTES.length)];
        const before = p.overall;
        p[a] = Math.min(99, (p[a] || 50) + 1);
        p.overall = calculatePlayerOverall(p);
        if (p.overall > before) risers++;
    });
    return risers;
}

function seasonalDevelopment(p, seasonWeeks, clubContext=gameState) {
    const age = p.age;
    ensurePotential(p);
    let delta = age <= 20 ? youthGrowthBase(age) : age <= 23 ? 2 : age <= 26 ? 1 : age <= 29 ? 0 : age <= 31 ? -1 : age <= 33 ? -2 : -3;
    if (delta > 0) {
        let minutes = Math.min(1, (p.matches || 0) / Math.max(1, seasonWeeks * 0.6));
        // En la liga de cantera todos los chavales entrenan y compiten: los minutos no frenan su crecimiento
        if (clubContext.division === 'promesas' && age <= 19) minutes = Math.max(minutes, 0.85);
        const coach = clubContext.staff?.entrenador ? (STAFF_LEVEL_EFFECTS[clubContext.staff.entrenador.level]?.training ?? 1) : 0.8;
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
    const clubs = leagues[div].filter(t => t !== gameState.team && (!gameState.world || (gameState.world.clubs[t]?.balance>=value && gameState.world.clubs[t]?.squad.length<25)));
    if (!clubs.length) return null;
    return { club: clubs[Math.floor(Math.random() * clubs.length)], division: div };
}

  
// Un jugador recién llegado no se puede vender hasta pasadas 10 jornadas
const MIN_WEEKS_BEFORE_SALE = 10;
function markJoined(p) {
    p.joinedSeason = gameState.currentSeason;
    p.joinedPhase = gameState.seasonType;
    p.joinedWeek = gameState.week;
    return p;
}
function weeksSinceJoined(p) {
    if (!p || !p.joinedSeason) return Infinity;
    if (p.joinedSeason !== gameState.currentSeason) return Infinity;
    const pre = PRESEASON_WEEKS || 4;
    const abs = (phase, w) => (phase === 'preseason' ? w : pre + w);
    return abs(gameState.seasonType, gameState.week) - abs(p.joinedPhase, p.joinedWeek);
}
function canSellPlayer(p) {
    const w = weeksSinceJoined(p);
    if (w >= MIN_WEEKS_BEFORE_SALE) return { ok: true };
    const left = MIN_WEEKS_BEFORE_SALE - w;
    return { ok: false, message: `${p.name} acaba de llegar al club: no puedes ponerlo a la venta hasta dentro de ${left} jornada(s).` };
}

function signPlayer(player) {  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'La plantilla está completa (25 jugadores max).' };  
    }  
    
    const newPlayer = { ...player };
    newPlayer.value = Math.max(1000, Number(newPlayer.value) || marketValue(newPlayer));
    if (!newPlayer.loan) newPlayer.salary = Math.max(100, Number(newPlayer.salary) || expectedSalary(newPlayer, gameState.division));  
    
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
        newPlayer.releaseClause = Math.max(10000, Math.round(clause / 10000) * 10000);
    }
  
    markJoined(newPlayer);
    const w=gameState.world,origin=w&&locatePlayer(w,newPlayer);
    if(origin){
        if(origin.club===gameState.team)return {success:false,message:'El jugador ya pertenece a tu plantilla.'};
        const moved=worldMove({id:origin.player.id,from:origin.club,to:gameState.team,fee:Number(newPlayer.transferFee)||0,
            salary:newPlayer.salary,alreadyPaid:true,loan:!!newPlayer.loan,wagePercent:newPlayer.loanWagePercent??100});
        if(!moved.success){
            if(newPlayer.transferFee){gameState.balance+=newPlayer.transferFee;gameState.playerPurchases=Math.max(0,(gameState.playerPurchases||0)-newPlayer.transferFee);}
            return moved;
        }
        const id=moved.player.id;Object.assign(moved.player,newPlayer,{id,club:gameState.team});
        if(!newPlayer.loan){moved.player.contractType='owned';moved.player.contractYears=3;delete moved.player.loanOwner;}
    }else{
        if(w)assignPlayerIds(w,[newPlayer],gameState.team);
        gameState.squad.push(newPlayer);
    }
    captureWorldClub();  
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
    const player=gameState.squad.find(p=>p.name===name);
    if(!player)return {success:false,message:'Jugador no encontrado.'};
    if(player.contractType!=='owned')return {success:false,message:'Solo puedes vender jugadores en propiedad.'};
    const allowed=canSellPlayer(player);if(!allowed.ok)return {success:false,message:allowed.message};
    const fee=roundMoney(marketValue(player)*.6),buyer=pickBuyerClub(fee,player.overall);
    if(!buyer)return {success:false,message:'No hay un comprador con presupuesto suficiente.'};
    replaceInLineup(name);
    const moved=worldMove({id:player.id,from:gameState.team,to:buyer.club,fee,salary:expectedSalary(player,buyer.division)});
    if(!moved.success)return moved;
    gameState.pendingOffers=(gameState.pendingOffers||[]).filter(o=>o.player?.id!==player.id&&o.player?.name!==name);
    gameState.playerSalesIncome=(gameState.playerSalesIncome||0)+fee;
    updateWeeklyFinancials();addNews(`💰 ${name} vendido al ${buyer.club} por ${fee.toLocaleString('es-ES')}€.`, 'success');
    return {success:true,message:`${name} vendido por ${fee.toLocaleString('es-ES')}€.`};
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
  
    offeredSalary = Number(offeredSalary);
    offeredMerchPercent = Math.max(0, Math.min(100, Number(offeredMerchPercent) || 0));
    offeredTicketPercent = Math.max(0, Math.min(100, Number(offeredTicketPercent) || 0));
    if (!Number.isFinite(offeredSalary) || offeredSalary <= 0) return { success: false, message: 'Indica un salario semanal positivo.' };
    let acceptanceChance = 0.5;

    const refSalary = Math.max(player.salary || 0, expectedSalary(player, gameState.division)) || 1;
    const extraPay = (Number(offeredCar) || 0) + (Number(offeredHouse) || 0)
        + computeMerch(gameState).revenue * offeredMerchPercent / 100 / 2
        + computeAttendance(gameState) * gameState.ticketPrice * offeredTicketPercent / 100 / 2;
    const salaryFactor = (offeredSalary + extraPay) / refSalary;  
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
            // FICHAJE DIRECTO - Sin negociación con club. La cláusula se cobra ahora.
            const clause = Number(player.clauseAmount) || 0;
            if (clause > 0) {
                if (gameState.balance < clause) {
                    return { success: false, message: `El jugador acepta, pero ya no tienes ${clause.toLocaleString('es-ES')}€ para pagar su cláusula.`, type: 'error' };
                }
                gameState.balance -= clause;
                gameState.playerPurchases = (gameState.playerPurchases || 0) + clause;
                if (typeof window !== 'undefined' && window._financeRegisterMovement) {
                    window._financeRegisterMovement('purchase', `Cláusula de rescisión: ${player.name}`, -clause);
                }
            }
            const newPlayer = {  
                ...player, ...gameState.playerOffer,
                salary: offeredSalary, sourceClub: player.club, transferFee: clause,
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
  
    if(gameState.world){
        const source=locatePlayer(gameState.world,player);
        if(!source || source.club===gameState.team)return {success:false,message:'El jugador ya no está disponible en el club vendedor.'};
        const names=[...new Set(playerExchange||[])];
        if(names.length!==(playerExchange||[]).length || names.some(name=>{const p=gameState.squad.find(p=>p.name===name);return !p||p.contractType!=='owned'||!canSellPlayer(p).ok;}))return {success:false,message:'Hay jugadores no disponibles en el intercambio.'};
        if(gameState.world.clubs[source.club].squad.length-1+names.length>25)return {success:false,message:'El club vendedor no dispone de fichas para el intercambio.'};
    }
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
        const finalWageForUs = Math.max(0, actualWageToPay);  
  
        let acceptanceChance = 0.5;  
        if (myWageContribution >= 80) acceptanceChance += 0.3;  
        else if (myWageContribution >= 50) acceptanceChance += 0.1;  
        else if (myWageContribution < 30) acceptanceChance -= 0.2;  
  
        const roll = Math.random();  
        const accepted = myWageContribution === 100 || roll < acceptanceChance;  
  
        if (accepted) {  
            gameState.clubOffer = { type: 'loan', wageContribution: myWageContribution, finalWageForUs };  
            endNegotiation(true);  
            const newPlayer = {  
                ...player,  
                salary: finalWageForUs, sourceClub: player.club, loanWagePercent: myWageContribution,
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
                const p=gameState.squad.find(p=>p.name===pName);
                if(p&&gameState.world){replaceInLineup(pName);worldMove({id:p.id,from:gameState.team,to:player.club,fee:0});}
                else {const index=gameState.squad.findIndex(p=>p.name===pName);if(index>=0)gameState.squad.splice(index,1);}
            });
  
            const newPlayer = {  
                ...player, ...gameState.playerOffer,
                salary: gameState.playerOffer.salary, sourceClub: player.club, transferFee: offerAmount,
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
    const live=marketFromWorld(filters);if(live)return live;
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
                const real = teamData.squad.map(p => ({
                    ...p,
                    overall: p.overall || calculatePlayerOverall(p),
                    form: p.form || 75,
                    isInjured: p.isInjured || false
                }));
                return real.length < 18 ? topUpSquad(real, division, teamName, 20) : real;
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
    const ovr = p => (p.overall || calculatePlayerOverall(p)) * (.62 + .38 * Math.max(1,Math.min(100,p.condition ?? 100))/100);
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
        if (!player || player.isInjured || player.isSuspended) return; // hueco = 0 (jugar con 10 se nota)
        let factor = 0.5;
        if (player.position === slot.pos) factor = 1.0;
        else if ((POSITION_COMPATIBILITY[slot.pos] || []).includes(player.position)) factor = 0.85;
        total += (player.overall || calculatePlayerOverall(player)) * factor * (.62 + .38 * Math.max(1,Math.min(100,player.condition ?? 100))/100);
    });
    return total / layout.length;
}

// Common interval engine: real attempts, line strengths, fatigue and ordered events.
const MATCH_ENGINE = { version: 2, intervalMinutes: 1, maxSubstitutions: 5, previewSamples: 160 };

function calculateMatchOutcomeImproved(params) {
    return simulateFootballMatch(params);
}

// ========================================
// PARTIDO DE LIGA
// - La IA alinea su mejor once por posiciones con la formación que
//   mejor le encaja (antes alineaba los 11 primeros de la lista).
// - Las plantillas rivales se cargan una vez por temporada.
// - Se usan las versiones de window.* para que los módulos externos
//   (Táctica, Primas, Promesas) puedan modificar el partido de verdad.
// ========================================
let worldTask = null;
function worldSeasonWeeks(){return Math.max(seasonLength(gameState.seasonCalendar),...Object.values(gameState.world?.divisions||{}).map(d=>seasonLength(d.calendar)));}
function captureWorldClub() {
    const w=gameState.world,c=w?.clubs?.[gameState.team];if(!c)return;
    assignPlayerIds(w,gameState.squad,gameState.team);assignPlayerIds(w,gameState.academy||[],gameState.team);
    c.squad=gameState.squad;c.balance=Number(gameState.balance)||0;c.division=gameState.division;
    c.snapshot=c.snapshot||{};
    for(const key of Object.keys(gameState))if(CLUB_FIELDS.includes(key)||/^(fd_|fac_|board)/.test(key)){
        if(key!=='balance')c.snapshot[key]=gameState[key];
    }
    const d=w.divisions[gameState.division];
    if(d && d.season===gameState.currentSeason){
        d.standings=gameState.standings;d.calendar=gameState.seasonCalendar;
        d.history=(gameState.matchHistory||[]).filter(m=>!m.playoff).map(m=>({week:m.week,home:m.home,away:m.away,score:m.score}));
        d.lastWeek=Math.max(0,...d.history.map(m=>m.week||0));
    }
    gameState.loanSalaryExpense=(w.loans||[]).filter(l=>l.owner===gameState.team).reduce((n,l)=>n+l.ownerCost,0);
}
async function ensureWorld() {
    if(gameState.world?.version===1){captureWorldClub();return gameState.world;}
    if(worldTask)return worldTask;
    const team=gameState.team,season=gameState.currentSeason,generation=stateGeneration;
    if(!team)return null;
    worldTask=(async()=>{
        const leagues=ensureLeagueStructure();
        const w={version:1,season,revision:1,nextPlayerId:1,nextTransferId:1,clubs:{},divisions:{},loans:[],transfers:[],marketTicks:{},seasons:[],statistics:{}};
        for(const [div,names] of Object.entries(leagues)){
            for(const name of names){
                let squad=name===team?gameState.squad:gameState.aiSquads?.[`${season}|${div}|${name}`];
                if(!squad)squad=ageAISquad(await generateAISquad(name,div),seasonIndex(season));
                const td=await getTeamData(name);
                const snapshot=name===team?{}:{academy:[],staff:{},formation:'433',mentality:'balanced',trainingLevel:1,
                    stadiumCapacity:td.stadiumCapacity||10000,stadiumName:td.stadiumName||name+' Stadium',teamLogo:td.logo||null,
                    fanbase:Math.round((td.stadiumCapacity||10000)*(ECONOMY.fanbaseFactor[div]||.8)),popularity:50,
                    ticketPrice:TICKET_REF[div]||12,merchandisingPrice:10,weeklyIncomeBase:{primera:80000,segunda:20000,rfef_grupo1:5000,rfef_grupo2:5000,promesas:1000}[div]||5000};
                if(name!==team)for(let k=0;k<6;k++){
                    const pos=SQUAD_TEMPLATE[(k*3+2)%SQUAD_TEMPLATE.length];
                    const p=buildGeneratedPlayer(pos,(SQUAD_QUALITY[div]?.target||55)-12,16+k%3,div);p.potential=estimatePotential(p);snapshot.academy.push(p);
                }
                w.clubs[name]={id:`c_${Object.keys(w.clubs).length+1}`,name,division:div,squad,balance:name===team?gameState.balance:(td.initialBudget||500000),snapshot,financeTicks:{}};
            }
            w.divisions[div]={season,teams:[...names],calendar:div===gameState.division?gameState.seasonCalendar:generateLeagueCalendar(names),
                standings:div===gameState.division?gameState.standings:initStandings(names),
                history:div===gameState.division?(gameState.matchHistory||[]).filter(m=>!m.playoff).map(m=>({week:m.week,home:m.home,away:m.away,score:m.score})):[],lastWeek:0};
        }
        const seen=new Set();
        for(const c of Object.values(w.clubs)){
            for(const collection of [c.squad,c.name===team?gameState.academy||[]:c.snapshot.academy||[]]){
                for(const p of collection){if(!p.id||!String(p.id).startsWith('p_')||seen.has(p.id))p.id=`p_${w.nextPlayerId++}`;w.nextPlayerId=Math.max(w.nextPlayerId,Number(String(p.id).slice(2))+1||1);seen.add(p.id);}
                assignPlayerIds(w,collection,c.name);
            }
        }
        for(const p of gameState.freeAgentsPool||[]){if(!p.id||seen.has(p.id))p.id=`p_${w.nextPlayerId++}`;seen.add(p.id);const n=Number(String(p.id).slice(2));if(String(p.id).startsWith('p_')&&Number.isFinite(n))w.nextPlayerId=Math.max(w.nextPlayerId,n+1);}
        while(seen.has(`p_${w.nextPlayerId}`))w.nextPlayerId++;
        if(gameState.team!==team||gameState.currentSeason!==season||stateGeneration!==generation)return null;
        gameState.world=w;gameState.maxSeasonWeeks=worldSeasonWeeks();delete gameState.aiSquads;aiSquadCache.clear();captureWorldClub();
        if(gameState.seasonType!=='preseason'&&gameState.week>1){
            await advanceWorldLeagues(gameState.week-1);w.migratedAtWeek=gameState.week;
            addNews('🌍 Mundo persistente preparado. Se conservan tus resultados; las ligas sin historial guardado se han reconstruido una sola vez.','info');
        }
        return w;
    })();
    try{return await worldTask;}finally{worldTask=null;}
}
async function switchPersistentClub(name,division,mode) {
    await ensureWorld();captureWorldClub();const before=getGameState(),w=gameState.world,c=w.clubs[name];
    if(!c)return {success:false,cancelled:true,message:'El equipo no pertenece al mundo de esta partida.'};
    const globalState={world:w,leagues:gameState.leagues,currentSeason:gameState.currentSeason,seasonType:gameState.seasonType,week:gameState.week,
        gameId:gameState.gameId,gameMode:mode,freeAgentsPool:gameState.freeAgentsPool||[],lastSeasonSummary:gameState.lastSeasonSummary,newsFeed:gameState.newsFeed||[],unreadNewsCount:gameState.unreadNewsCount||0};
    Object.keys(gameState).forEach(k=>delete gameState[k]);
    Object.assign(gameState,JSON.parse(JSON.stringify(INITIAL_GAME_STATE)),c.snapshot||{},globalState,{team:name,division:c.division,squad:c.squad,balance:c.balance});
    const d=w.divisions[c.division];gameState.leagueTeams=d.teams;gameState.standings=d.standings;gameState.seasonCalendar=d.calendar;
    gameState.matchHistory=d.history.map(m=>({...m}));gameState.maxSeasonWeeks=worldSeasonWeeks();
    gameState.formation=gameState.formation||'433';
    const inherited=(gameState.lineup||[]).map(p=>c.squad.find(q=>q.id===p?.id||q.name===p?.name)).filter(Boolean);
    gameState.lineup=inherited.length===11?inherited:pickBestXI(c.squad,gameState.formation);
    if(!c.snapshot?.competitions && gameState.seasonType==='regular' && gameState.week>1){
        gameState.competitions={team:name,season:gameState.currentSeason,division:c.division,copaQualified:false,copaPhase:null,copaResults:[],europeanComp:null,europeanPhase:null,europeanResults:[],historyUnavailable:true};
        gameState.cupData={};
    }
    captureWorldClub();
    gameState.boardTargetSeason=null;gameState.boardConfidence=65;
    const accepted=await computeBoardTarget(true);
    if(accepted===false){replaceGameState(before);return {success:false,cancelled:true};}
    captureWorldClub();
    if(typeof window.dispatchEvent==='function' && typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('pcf:state-replaced'));
    if(gameState.competitions?.historyUnavailable)addNews('El historial previo de copas de este club no está registrado; no se inventan resultados ni se generan rondas atrasadas.','info');
    addNews(`🎯 Te incorporas al ${name} en ${gameState.currentSeason}, jornada ${gameState.week}, con su plantilla y economía actuales.`,'info');
    updateWeeklyFinancials();return {success:true};
}
async function advanceWorldLeagues(upToWeek) {
    const w=gameState.world;if(!w)return;captureWorldClub();
    for(const [div,d] of Object.entries(w.divisions)){
        if(div===gameState.division)continue;
        const target=Math.min(Number.isFinite(upToWeek)?upToWeek:seasonLength(d.calendar),seasonLength(d.calendar));
        for(let week=d.lastWeek+1;week<=target;week++){
            for(const match of d.calendar.filter(m=>m.week===week)){
                if(d.history.some(h=>h.week===week&&h.home===match.home&&h.away===match.away))continue;
                const context={...gameState,team:null,division:div,week,seasonType:'regular',standings:d.standings};
                const r=await processMatch(match.home,match.away,context);
                d.history.push({week,home:match.home,away:match.away,score:`${r.homeGoals}-${r.awayGoals}`});
            }
            d.lastWeek=week;
        }
    }
    w.revision++;
}
function closeWorldClubFinances(week,phase) {
    const w=gameState.world;if(!w)return;captureWorldClub();
    for(const c of Object.values(w.clubs)){
        if(c.name===gameState.team)continue;
        const key=`${w.season}|${phase}|${week}`;if(c.financeTicks[key])continue;
        if(phase!=='summer')recoverMatchFitness(c.squad,{...gameState,week,seasonType:phase},false);
        const wages=c.squad.reduce((n,p)=>n+(p.salary||0),0)+(w.loans||[]).filter(l=>l.owner===c.name).reduce((n,l)=>n+l.ownerCost,0)+Object.values(c.snapshot.staff||{}).reduce((n,p)=>n+(p?.salary||0),0);
        const d=w.divisions[c.division],home=phase==='regular'&&d?.calendar.some(m=>m.week===week&&m.home===c.name);
        const s={...c.snapshot,division:c.division};
        const gate=home?Math.floor(computeAttendance(s)*(s.ticketPrice||12)):0;
        const merch=home?computeMerch(s).revenue:0;
        const bank=(s.fd_loans||[]).filter(l=>l.weeksLeft>0).reduce((n,l)=>n+(l.weeklyPayment||0),0);
        const benefits=window.pcfEconomy?.benefits?.({squad:c.squad},gate,merch)?.total||0;
        c.balance+=(s.weeklyIncomeBase||5000)+gate+merch-wages-bank-benefits;
        c.snapshot.fd_loans=(c.snapshot.fd_loans||[]).map(l=>({...l,weeksLeft:Math.max(0,l.weeksLeft-1)}));
        c.snapshot.fd_loanPayment=c.snapshot.fd_loans.filter(l=>l.weeksLeft>0).reduce((n,l)=>n+(l.weeklyPayment||0),0);
        const work=c.snapshot.fac_construction||[];
        c.snapshot.fac_construction=work.filter(item=>{
            item.weeksLeft--;if(item.weeksLeft>0)return true;
            const fx=item.effects||{};
            if(fx.capacityAdd)c.snapshot.stadiumCapacity=(c.snapshot.stadiumCapacity||10000)+fx.capacityAdd;
            if(fx.trainingBonus)c.snapshot.trainingLevel=(c.snapshot.trainingLevel||1)+fx.trainingBonus;
            if(fx.popularityBonus)c.snapshot.popularity=Math.min(100,(c.snapshot.popularity||50)+fx.popularityBonus);
            if(fx.fanbaseBonus)c.snapshot.fanbase=Math.floor((c.snapshot.fanbase||10000)*(1+fx.fanbaseBonus));
            if(fx.incomeWeeklyBonus){c.snapshot.fd_baseOrig=(c.snapshot.fd_baseOrig??c.snapshot.weeklyIncomeBase??5000)+fx.incomeWeeklyBonus;c.snapshot.weeklyIncomeBase=(c.snapshot.weeklyIncomeBase||5000)+fx.incomeWeeklyBonus;}
            if(fx.injuryReduction)c.snapshot.fac_injuryReduction=Math.min(.6,(c.snapshot.fac_injuryReduction||0)+fx.injuryReduction);
            const key=item.category==='stadium'?'fac_stadiumDone':'fac_trainingDone';c.snapshot[key]=[...new Set([...(c.snapshot[key]||[]),item.id])];
            return false;
        });
        const coach=c.snapshot.staff?.entrenadorJuveniles;
        if(coach)for(const p of c.snapshot.academy||[]){
            if(!p.isInjured && p.overall<(p.potential||p.overall) && Math.random()<coach.level*.025){const a=ATTRIBUTES[Math.floor(Math.random()*ATTRIBUTES.length)];p[a]=Math.min(99,(p[a]||40)+1);p.overall=calculatePlayerOverall(p);}
        }
        c.financeTicks[key]=true;
    }
    w.revision++;
}
function worldMove(options) {
    const w=gameState.world;if(!w)return {success:false,message:'El mundo de la partida todavía se está preparando.'};
    captureWorldClub();const result=moveWorldPlayer(w,{...options,season:gameState.currentSeason,week:gameState.week,phase:gameState.seasonType});
    if(result.success){
        const own=w.clubs[gameState.team];gameState.squad=own.squad;gameState.balance=own.balance;captureWorldClub();
    }
    return result;
}
function runWorldMarket() {
    const w=gameState.world;if(!w)return [];
    const week=gameState.week,phase=gameState.seasonType;
    const tick=`${w.season}|${phase}|${week}`;if(w.marketTicks[tick])return [];
    w.marketTicks[tick]=true;
    const midpoint=Math.floor((gameState.maxSeasonWeeks||38)/2);
    if(!(phase==='preseason'||phase==='regular'&&(week<=2||Math.abs(week-midpoint)<=2)))return [];
    const emitted=[];
    for(const buyer of Object.values(w.clubs)){
        if(buyer.name===gameState.team||emitted.length>=6||Math.random()>.16||buyer.squad.length>=25)continue;
        const wages=buyer.squad.reduce((n,p)=>n+(p.salary||0),0),reserve=wages*26;
        const starters=pickBestXI(buyer.squad,chooseAIFormation(buyer.squad));
        const weakest=starters.filter(Boolean).sort((a,b)=>(a.overall||0)-(b.overall||0))[0];if(!weakest)continue;
        const candidates=[];
        for(const seller of Object.values(w.clubs)){
            if(seller===buyer||seller.name===gameState.team||seller.squad.length<=18)continue;
            if(Math.abs((DIVISION_RANK[buyer.division]||0)-(DIVISION_RANK[seller.division]||0))>1)continue;
            for(const p of seller.squad){
                if(p.contractType!=='owned'||p.position!==weakest.position||p.isInjured||p.age>32||p.overall<weakest.overall+2||p.overall>weakest.overall+10)continue;
                if(!p.transferListed&&seller.squad.filter(q=>q.position===p.position).length<3)continue;
                const fee=roundMoney(marketValue(p)*1.05),salary=expectedSalary(p,buyer.division);
                if(buyer.balance-fee<reserve+salary*26||fee>Math.max(10000,buyer.balance*.20))continue;
                candidates.push({seller,p,fee,salary});
            }
        }
        candidates.sort((a,b)=>a.fee-b.fee);const deal=candidates[0];
        if(deal){const r=worldMove({id:deal.p.id,from:deal.seller.name,to:buyer.name,fee:deal.fee,salary:deal.salary});if(r.success)emitted.push(r.movement);}
        else{
            const p=buyer.squad.find(p=>p.contractType==='owned'&&p.contractYears<=1&&p.age<=32);
            if(p&&buyer.balance>reserve){p.contractYears=3;p.salary=Math.max(p.salary||100,expectedSalary(p,buyer.division));
                const m={id:`t_${w.nextTransferId++}`,type:'renewal',playerId:p.id,name:p.name,from:buyer.name,to:buyer.name,fee:0,season:w.season,week,phase};w.transfers.push(m);emitted.push(m);}
        }
    }
    if(w.transfers.length>500)w.transfers=w.transfers.slice(-500);
    for(const m of emitted.slice(0,3))addNews(m.type==='renewal'?`📋 ${m.to} renueva a ${m.name} por 3 temporadas.`:`🔄 ${m.to} ficha a ${m.name} del ${m.from} por ${m.fee.toLocaleString('es-ES')}€.`, 'info');
    w.revision++;return emitted;
}
function marketFromWorld(filters={}) {
    const w=gameState.world;if(!w)return null;
    const players=Object.values(w.clubs).filter(c=>c.name!==gameState.team).flatMap(c=>c.squad.filter(p=>p.contractType==='owned').map(p=>({...p,sourceClub:c.name,originalTeam:c.name,value:marketValue(p),askingPrice:p.askingPrice||roundMoney(marketValue(p)*1.1)})));
    return players.filter(p=>(!(filters.name||filters.searchName)||p.name.toLowerCase().includes((filters.name||filters.searchName).toLowerCase()))&&
        (!filters.position||filters.position==='ALL'||p.position===filters.position)&&(!filters.minOverall||p.overall>=Number(filters.minOverall))&&(!filters.maxAge||p.age<=Number(filters.maxAge))&&
        (!filters.transferListed||p.transferListed)&&(!filters.loanListed||p.loanListed));
}
function registerWorldFreeAgent(player) {
    const w=gameState.world;
    if(w&&!player.id)player.id=`p_${w.nextPlayerId++}`;
    player.club='Libre';player.isFreeAgent=true;player.contractType='free';player.contractYears=0;
    player.transferListed=false;player.loanListed=false;player.releaseClause=0;
    delete player.loan;delete player.loanOwner;
    gameState.freeAgentsPool=gameState.freeAgentsPool||[];
    if(!gameState.freeAgentsPool.some(p=>p.id&&p.id===player.id))gameState.freeAgentsPool.push(player);
}
function appendWorldCareer(player,season,club) {
    const w=gameState.world,entries=[];
    for(const [division,players] of Object.entries(w?.statistics||{})){
        const record=players[player.id];if(!record)continue;
        for(const [club,data] of Object.entries(record.byClub||{}))entries.push({season,club,division,...data});
    }
    if(!entries.length)entries.push({season,club,goals:player.goals||0,matches:player.matches||0,minutes:player.minutes||0});
    player.career=[...(player.career||[]),...entries].slice(-12);
}
function rollWorldSeason(summary) {
    const w=gameState.world;if(!w)return;
    for(let week=1;week<(window.PCF_OFFSEASON_WEEKS||8);week++)closeWorldClubFinances(week,'summer');
    w.seasons.push({season:summary.season,tables:summary.tables,moves:summary.moves,transfers:w.transfers.filter(m=>m.season===summary.season),statistics:w.statistics});
    if(w.seasons.length>6)w.seasons.shift();
    for(const [div,names] of Object.entries(gameState.leagues))for(const name of names){const c=w.clubs[name];if(c)c.division=div;}
    for(const c of Object.values(w.clubs)){
        if(c.name===gameState.team){c.squad=gameState.squad;continue;}
        const previousGames=w.divisions[c.division]?.standings[c.name]?.pj||38;
        const survivors=[];
        for(const p of c.squad){
            appendWorldCareer(p,summary.season,c.name);
            p.age=(p.age||25)+1;
            if(Math.random()<retirementProbability(p.age,p.position)){w.retired=(w.retired||[]).concat({id:p.id,name:p.name,club:c.name,season:summary.season}).slice(-300);continue;}
            seasonalDevelopment(p,previousGames,{division:c.division,staff:c.snapshot.staff||{}});
            p.contractYears=Math.max(0,(p.contractYears||1)-1);
            if(p.contractYears===0){
                if(p.age<=32&&c.balance>Math.max(10000,(p.salary||100)*26)){p.contractYears=3;p.salary=expectedSalary(p,c.division);w.transfers.push({id:`t_${w.nextTransferId++}`,type:'renewal',playerId:p.id,name:p.name,from:c.name,to:c.name,fee:0,season:gameState.currentSeason,week:1,phase:'preseason'});}
                else{registerWorldFreeAgent(p);continue;}
            }
            p.matches=0;p.goals=0;p.cupGoals=0;p.minutes=0;p.assists=0;p.keeperMinutes=0;p.goalsConceded=0;p.leagueKeeperMinutes=0;p.leagueGoalsConceded=0;p.leagueKeeperMinutes=0;p.leagueGoalsConceded=0;
            p.condition=100;p.weeksOut=Math.max(0,(p.weeksOut||0)-8);p.isInjured=p.weeksOut>0;delete p._fitnessTick;survivors.push(p);
        }
        c.squad=survivors;
        const academy=c.snapshot.academy||[];
        for(const p of academy){p.age++;if(p.overall<(p.potential||p.overall)){for(const a of ATTRIBUTES)p[a]=Math.min(99,(p[a]||40)+1);p.overall=Math.min(p.potential,calculatePlayerOverall(p));}}
        c.snapshot.academy=academy.filter(p=>{if(p.age<20)return true;if(c.squad.length<25){p.contractType='owned';p.contractYears=3;c.squad.push(p);}else registerWorldFreeAgent(p);return false;});
        while(c.squad.length<20){const count=pos=>c.squad.filter(p=>p.position===pos).length;const pos=SQUAD_TEMPLATE.find(pos=>count(pos)<SQUAD_TEMPLATE.filter(x=>x===pos).length)||'MC';
            const p=buildGeneratedPlayer(pos,(SQUAD_QUALITY[c.division]?.target||55)-4,18+Math.floor(Math.random()*3),c.division);assignPlayerIds(w,[p],c.name);c.squad.push(p);}
        while(c.snapshot.academy.length<6){const p=buildGeneratedPlayer(SQUAD_TEMPLATE[Math.floor(Math.random()*SQUAD_TEMPLATE.length)],(SQUAD_QUALITY[c.division]?.target||55)-14,16,c.division);assignPlayerIds(w,[p],c.name);c.snapshot.academy.push(p);}
        c.financeTicks={};
        for(const k of ['fd_sponsor','fd_tv'])if(c.snapshot[k]?.active){const d=c.snapshot[k];d.yearsLeft=Math.max(0,(d.yearsLeft||1)-1);d.active=d.yearsLeft>0;}
        c.snapshot.weeklyIncomeBase=(c.snapshot.fd_baseOrig??c.snapshot.weeklyIncomeBase??5000)+
            (c.snapshot.fd_sponsor?.active?Math.round(c.snapshot.fd_sponsor.annualAmount/38):0)+(c.snapshot.fd_tv?.active?Math.round(c.snapshot.fd_tv.annualAmount/38):0);
        Object.assign(c.snapshot,{seasonMovements:[],playerPurchases:0,playerSalesIncome:0,playerCompensations:0,lastWeekFinance:null,financePostings:{},pendingOffers:[],pendingRenewals:[],competitions:null,cupData:{},boardTargetSeason:null});
    }
    w.transfers=w.transfers.slice(-500);w.season=gameState.currentSeason;w.divisions={};w.marketTicks={};w.statistics={};
    for(const [div,teams] of Object.entries(gameState.leagues))w.divisions[div]={season:w.season,teams:[...teams],calendar:div===gameState.division?gameState.seasonCalendar:generateLeagueCalendar(teams),standings:div===gameState.division?gameState.standings:initStandings(teams),history:[],lastWeek:0};
    gameState.maxSeasonWeeks=worldSeasonWeeks();captureWorldClub();w.revision++;assertWorldOwnership(w,gameState.freeAgentsPool||[]);
}

const aiSquadCache = new Map();

// Las plantillas reales del Admin son de la temporada inicial: con los años de
// partida, sus jugadores envejecen, progresan o declinan y se retiran
function seasonIndex(season) {
    const y = parseInt(String(season || FIRST_SEASON).split('/')[0], 10);
    const y0 = parseInt(FIRST_SEASON.split('/')[0], 10);
    return Math.max(0, (isNaN(y) ? y0 : y) - y0);
}
function ageAISquad(squad, years) {
    if (!years || !Array.isArray(squad)) return squad;
    const yearly = age => age <= 20 ? youthGrowthBase(age) : age <= 23 ? 2 : age <= 26 ? 1 : age <= 29 ? 0 : age <= 31 ? -1 : age <= 33 ? -2 : -3;
    return squad.map(p => {
        const q = { ...p };
        if (q.potential === undefined) q.potential = estimatePotential(q);
        let delta = 0;
        for (let k = 0; k < years; k++) delta += yearly((p.age || 25) + k);
        q.age = (p.age || 25) + years;
        q.goals = 0;
        if (delta > 0 && q.potential) delta = Math.min(delta, Math.max(0, q.potential - (q.overall || 60)));
        if (delta) {
            ATTRIBUTES.forEach(a => { if (q[a] !== undefined) q[a] = Math.max(15, Math.min(99, q[a] + delta)); });
            q.overall = Math.max(30, Math.min(99, (q.overall || 60) + delta));
        }
        return q;
    }).filter(q => q.age < 37);
}

async function getAISquadCached(teamName, division, season) {
    const club=gameState.world?.season===season && gameState.world.clubs[teamName];
    if(club)return teamName===gameState.team?gameState.squad:club.squad;
    const key = `${season}|${division}|${teamName}`;
    gameState.aiSquads = gameState.aiSquads || {};
    if (gameState.aiSquads[key]) return gameState.aiSquads[key];
    if (!aiSquadCache.has(key)) {
        const gen = (typeof window !== 'undefined' && window.generateAISquad) || generateAISquad;
        const years = seasonIndex(season);
        aiSquadCache.set(key, Promise.resolve(gen(teamName, division)).then(sq => {
            let aged = ageAISquad(sq, years);
            // Si las retiradas dejan la plantilla corta, sube gente joven del club
            if (Array.isArray(aged) && aged.length < 18) {
                aged = aged.concat(generateDivisionSquad(division, teamName).filter(p => p.age <= 21).slice(0, 18 - aged.length));
            }
            return aged;
        }));
    }
    try {
        const squad = await aiSquadCache.get(key);
        gameState.aiSquads[key] = squad;
        return squad;
    } catch (e) {
        aiSquadCache.delete(key);
        return generateAISquad(teamName, division);
    }
}

function recoverMatchFitness(squad, state, user) {
    const tick = `${state.currentSeason}|${state.seasonType}|${state.week}` +
        (state.seasonType === 'playoff' ? `|${(state.matchHistory || []).length}` : '');
    for (const p of squad) {
        if (p._fitnessTick && p._fitnessTick !== tick) {
            p.condition = Math.min(100, (p.condition ?? 100) + 15);
            if (!user && p.isInjured && p.weeksOut > 0) {
                p.weeksOut--; if (!p.weeksOut) { p.isInjured = false; p.injuryType = null; }
            }
        }
        p._fitnessTick = tick;
    }
}
function selectMatchBench(squad, lineup) {
    const used=new Set(lineup.filter(Boolean).map(p=>p.name));
    return squad.filter(p=>isAvailable(p)&&!used.has(p.name)).sort((a,b)=>(b.position==='POR')-(a.position==='POR')||
        (b.overall||0)*(.62+.38*(b.condition??100)/100)-(a.overall||0)*(.62+.38*(a.condition??100)/100)).slice(0,9);
}
function matchInjuryRisk(state) {
    return Math.max(.5,1-(state.staff?.fisio?.level||0)*.04-(state.staff?.entrenador?.level||0)*.03-((state.fac_injuryReduction||0)>1?(state.fac_injuryReduction||0)/100:(state.fac_injuryReduction||0)));
}
function sideFromSquad(squad, state, isUser) {
    recoverMatchFitness(squad, state, isUser);
    const formation = isUser ? state.formation || '433' : chooseAIFormation(squad);
    const lineup = isUser ? (state.lineup || []).map(p => p && (squad.find(q => q.name === p.name) || null)) : pickBestXI(squad, formation);
    const used = new Set(lineup.filter(Boolean).map(p => p.name));
    return { squad, lineup, bench: selectMatchBench(squad,lineup),
        formation, mentality: isUser ? state.mentality || 'balanced' : 'balanced', isUser };
}
async function buildSide(teamName, state) {
    const isUser = teamName === state.team;
    const squad = isUser ? state.squad : await getAISquadCached(teamName, state.division, state.currentSeason);
    return sideFromSquad(squad, state, isUser);
}

function averageForm(lineup) {
    const players = (lineup || []).filter(Boolean);
    if (!players.length) return 75;
    return players.reduce((sum, p) => sum + (p.form || 75), 0) / players.length;
}

function matchParameters(home, away, homeName, awayName, state, options = {}) {
    return {
        teamName: homeName, opponentName: awayName, homeTeamName: homeName, awayTeamName: awayName,
        teamLineup: home.lineup, opponentLineup: away.lineup, teamBench: home.bench, opponentBench: away.bench,
        teamFormation: home.formation, opponentFormation: away.formation,
        teamMentality: home.mentality, opponentMentality: away.mentality,
        teamForm: averageForm(home.lineup), opponentForm: averageForm(away.lineup),
        teamPlan: home.isUser ? state.matchPlan || 'hold' : 'react', opponentPlan: away.isUser ? state.matchPlan || 'hold' : 'react',
        teamAutoSubs: home.isUser ? state.autoSubstitutions !== false : true,
        opponentAutoSubs: away.isUser ? state.autoSubstitutions !== false : true,
        teamInjuryRisk: home.isUser ? matchInjuryRisk(state) : matchInjuryRisk(state.world?.clubs[homeName]?.snapshot||{}),
        opponentInjuryRisk: away.isUser ? matchInjuryRisk(state) : matchInjuryRisk(state.world?.clubs[awayName]?.snapshot||{}),
        homeIsUser: home.isUser, awayIsUser: away.isUser,
        isHome: options.isHome !== false, neutral: !!options.neutral
    };
}
function resolveFootballKnockout(params, first, aggregate = [0,0]) {
    let outcome = first, extraTime = null, penalties = null;
    if (aggregate[0] + outcome.teamGoals === aggregate[1] + outcome.opponentGoals) {
        outcome = ((typeof window !== 'undefined' && window.calculateMatchOutcomeImproved) || calculateMatchOutcomeImproved)({
            ...params, resume: first.matchState, duration: 30
        });
        extraTime = { home: outcome.teamGoals - first.teamGoals, away: outcome.opponentGoals - first.opponentGoals };
        if (aggregate[0] + outcome.teamGoals === aggregate[1] + outcome.opponentGoals) {
            let h=0,a=0;
            const players = outcome.matchState.sides.map(s => s.active.filter(Boolean));
            const kick = (i, n) => {
                const pool=players[i],p=pool.length?pool[n%pool.length]:null;
                const keeper=outcome.finalLines[1-i].keeper;
                const chance=Math.max(.55,Math.min(.90,.76+((p?.EF||60)-keeper)*.0018));
                return Math.random()<chance?1:0;
            };
            for(let n=0;n<5;n++){h+=kick(0,n);a+=kick(1,n);}
            let n=5;while(h===a && n<100){h+=kick(0,n);a+=kick(1,n);n++;}
            // A tie cannot advance: continue with one final independent draw if needed.
            if(h===a){if(Math.random()<.5)h++;else a++;}
            penalties={home:h,away:a};
        }
    }
    return { outcome, extraTime, penalties };
}
function applyFootballOutcome(outcome, home, away, homeName, awayName, state, competition='league') {
    const sides=[home,away],names=[homeName,awayName];
    sides.forEach((side,i)=>{
        const played=new Set(outcome.players[i].filter(p=>p.minutes>0).map(p=>p.name));
        for(const p of side.squad){
            if(p.isSuspended && !played.has(p.name) && p.suspensionWeeks>0){
                p.suspensionWeeks--;if(!p.suspensionWeeks)p.isSuspended=false;
            }
        }
        for(const record of outcome.players[i]){
            const p=side.squad.find(p=>p.name===record.name);if(!p)continue;
            p.condition=record.condition;
            if(record.minutes>0 || record.entered){
                if(competition==='league'&&state.world&&p.id){
                    const division=side.isUser?state.division:(state.world.clubs[names[i]]?.division||state.division);
                    state.world.statistics=state.world.statistics||{};
                    const rows=state.world.statistics[division]=state.world.statistics[division]||{};
                    const st=rows[p.id]=rows[p.id]||{id:p.id,name:p.name,goals:0,matches:0,minutes:0,keeperMinutes:0,conceded:0,clubs:[]};
                    st.goals+=record.goals;st.matches++;st.minutes+=record.minutes;
                    st.byClub=st.byClub||{};const detail=st.byClub[names[i]]=st.byClub[names[i]]||{goals:0,matches:0,minutes:0};
                    detail.goals+=record.goals;detail.matches++;detail.minutes+=record.minutes;
                    if(!st.clubs.includes(names[i]))st.clubs.push(names[i]);
                    if(record.position==='POR'){st.keeperMinutes+=record.minutes;st.conceded+=record.conceded;if(record.minutes>=60)st.keeperQualifyingMatches=(st.keeperQualifyingMatches||0)+1;}
                }
                p.minutes=(p.minutes||0)+record.minutes;
                p.matches=(p.matches||0)+(competition==='league'?1:0);
                const key=competition==='league'?'goals':'cupGoals';p[key]=(p[key]||0)+record.goals;
                p.assists=(p.assists||0)+record.assists;
                if(record.position==='POR'){
                    p.keeperMinutes=(p.keeperMinutes||0)+record.minutes;
                    if(competition==='league'){p.leagueKeeperMinutes=(p.leagueKeeperMinutes||0)+record.minutes;p.leagueGoalsConceded=(p.leagueGoalsConceded||0)+record.conceded;}
                    p.goalsConceded=(p.goalsConceded||0)+record.conceded;
                }
            }
        }
        for(const card of outcome.cards.filter(e=>e.team===names[i])){
            const p=side.squad.find(p=>p.name===card.player);if(!p)continue;
            if(card.type==='yellow'){
                p.yellowCards=(p.yellowCards||0)+1;
                p._yellowCycle=(p._yellowCycle??((p.yellowCards-1)%5))+1;
                if(p._yellowCycle>=5){p._yellowCycle=0;p.isSuspended=true;p.suspensionWeeks=Math.max(p.suspensionWeeks||0,1);}
            }else{p.redCards=(p.redCards||0)+1;p.isSuspended=true;p.suspensionWeeks=Math.max(p.suspensionWeeks||0,2);}
            if(side.isUser)addNews(`${card.type==='red'?'🟥':'🟨'} ${p.name} (${card.minute}')${p.isSuspended?' — sancionado '+p.suspensionWeeks+' partido(s)':''}`,card.type==='red'?'error':'warning');
        }
        for(const injury of outcome.injuries.filter(e=>e.team===names[i])){
            const p=side.squad.find(p=>p.name===injury.player);if(!p)continue;
            p.isInjured=true;p.weeksOut=injury.weeks;p.injuryType=injury.injuryType;
            if(side.isUser)addNews(`🏥 ${p.name}: ${injury.injuryType}, ${injury.weeks} semanas`, 'warning');
        }
    });
}
async function playMatchImproved(homeName, awayName, state, options = {}) {
    const home=await buildSide(homeName,state),away=await buildSide(awayName,state);
    const homeOverall=calculateTeamEffectiveOverall(home.lineup,home.formation),awayOverall=calculateTeamEffectiveOverall(away.lineup,away.formation);
    const params=matchParameters(home,away,homeName,awayName,state,options);
    const engine=(typeof window!=='undefined'&&window.calculateMatchOutcomeImproved)||calculateMatchOutcomeImproved;
    const first=engine(params);
    const resolved=options.knockout?resolveFootballKnockout(params,first,options.aggregate):{outcome:first,extraTime:null,penalties:null};
    const o=resolved.outcome;
    applyFootballOutcome(o,home,away,homeName,awayName,state,options.competition||'league');
    return {homeTeam:homeName,awayTeam:awayName,homeGoals:o.teamGoals,awayGoals:o.opponentGoals,homeOverall,awayOverall,
        homeFormation:home.formation,awayFormation:away.formation,homeXG:o.teamXG,awayXG:o.opponentXG,
        goals:o.goals,cards:o.cards,injuries:o.injuries,substitutions:o.substitutions,timeline:o.timeline,stats:o.stats,playerStats:o.players,
        initialLines:o.initialLines,finalLines:o.finalLines,extraTime:resolved.extraTime,penalties:resolved.penalties,engineVersion:2};
}
async function playCupFootballMatch(match) {
    const state=gameState,me=state.team;
    const validation=validateLineup(state.lineup);
    if(!validation.success)throw new Error(validation.message);
    let opponentSquad;
    const division=teamDivision(match.opponent);
    if(division)opponentSquad=await getAISquadCached(match.opponent,division,state.currentSeason);
    else{
        state.foreignSquads=state.foreignSquads||{};
        const key=`${state.currentSeason}|${match.opponent}`;
        if(!state.foreignSquads[key]){
            const xi=syntheticLineup(match.oppRating||75,match.opponent);
            state.foreignSquads[key]=xi.concat(xi.slice(0,9).map(p=>({...p,name:p.name+' suplente'})));
        }
        opponentSquad=state.foreignSquads[key];
    }
    const own=sideFromSquad(state.squad,state,true),opp=sideFromSquad(opponentSquad,state,false);
    const params=matchParameters(own,opp,me,match.opponent,state,{isHome:match.isHome,neutral:match.neutral});
    const engine=window.calculateMatchOutcomeImproved||calculateMatchOutcomeImproved;
    const first=engine(params),agg=match.aggregate||{my:0,opp:0};
    const resolved=match.decidesTie?resolveFootballKnockout(params,first,[agg.my,agg.opp]):{outcome:first,extraTime:null,penalties:null};
    const o=resolved.outcome;
    applyFootballOutcome(o,own,opp,me,match.opponent,state,'cup');
    return {myGoals:o.teamGoals,oppGoals:o.opponentGoals,myXG:o.teamXG,oppXG:o.opponentXG,
        win:o.teamGoals>o.opponentGoals,draw:o.teamGoals===o.opponentGoals,loss:o.teamGoals<o.opponentGoals,
        myTeam:me,opponent:match.opponent,isHome:match.isHome,neutral:!!match.neutral,
        qualified:match.decidesTie?(resolved.penalties?resolved.penalties.home>resolved.penalties.away:agg.my+o.teamGoals>agg.opp+o.opponentGoals):undefined,
        extraTime:resolved.extraTime?{my:resolved.extraTime.home,opp:resolved.extraTime.away}:null,
        penalties:resolved.penalties?{my:resolved.penalties.home,opp:resolved.penalties.away}:null,
        goals:o.goals,cards:o.cards,injuries:o.injuries,substitutions:o.substitutions,timeline:o.timeline,stats:o.stats,playerStats:o.players,engineVersion:2};
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
    window.getAISquadCached = getAISquadCached;
    window.averageMatchForm = averageForm;
    window.playCupFootballMatch = playCupFootballMatch;
    window.selectMatchBench = selectMatchBench;
    window.matchInjuryRisk = matchInjuryRisk;
    window.projectMatchFitness = (squad,state,user=false) => {
        const projected=JSON.parse(JSON.stringify(squad));recoverMatchFitness(projected,state,user);return projected;
    };
}

console.log('✅ Motor de partidos por intervalos cargado (Etapa 2)');

  

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
        const playedNames=new Set((result.playerStats?.[homeTeam===gameState.team?0:1]||[]).filter(p=>p.minutes>0||p.entered).map(p=>p.name));
        gameState.squad.filter(p=>playedNames.has(p.name)).forEach(player => {
            // Appearances and minutes are recorded by the common match engine.
            const form = player.form || 70;
            if (ourGoals > rivalGoals) player.form = Math.min(95, form + 1 + Math.floor(Math.random() * 3));
            else if (ourGoals < rivalGoals) player.form = Math.max(45, form - 1 - Math.floor(Math.random() * 3));
            else player.form = Math.max(45, Math.min(95, form + (form > 75 ? -1 : 1)));
            player._baseForm=player.form;
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
  
// ── Confianza de la directiva (0-100) ───────────────────────────
// Se mueve cada jornada según: posición frente al objetivo de la temporada
// (que sale de la fuerza real de la plantilla), forma de los últimos 5 partidos
// y dinero en caja. Avisa antes de llegar al despido y solo felicita si de verdad
// se cumple el objetivo. En el modo carrera, el despido depende de este valor.
async function computeBoardTarget(joining=false) {
    const teams = (gameState.leagueTeams && gameState.leagueTeams.length) ? gameState.leagueTeams : Object.keys(gameState.standings || {});
    const ratings = [];
    for (const t of teams) {
        let squad, f;
        if (t === gameState.team) { f = gameState.formation || '433'; squad = gameState.squad; }
        else { squad = await getAISquadCached(t, gameState.division, gameState.currentSeason); f = chooseAIFormation(squad); }
        ratings.push([t, calculateTeamEffectiveOverall(pickBestXI(squad, f), f)]);
    }
    ratings.sort((a, b) => b[1] - a[1]);
    const rank = Math.max(1, ratings.findIndex(r => r[0] === gameState.team) + 1);
    // Previous season: la confianza se enfría hacia 60
    gameState.boardConfidence = Math.round(((gameState.boardConfidence ?? 65) * 0.5 + 30) * 10) / 10;
    gameState.boardWarn = 0;
    gameState.boardTarget = Math.min(teams.length, Math.max(1, rank));
    gameState.boardTargetSeason = gameState.currentSeason;
    gameState.boardLastPraise = -99;
    gameState.boardObjectives=buildBoardObjectives(gameState,rank,teams.length);
    gameState.boardTarget=gameState.boardObjectives.leagueTarget;
    if (window.negotiateBoardObjective) {
        const accepted=await window.negotiateBoardObjective(gameState,rank,teams.length,{joining});
        if(accepted===false)return false;
    }
    gameState.boardObjectives.leagueTarget=gameState.boardTarget;
    addNews(`[Directiva] Objetivo de la temporada: terminar ${gameState.boardTarget === 1 ? 'campeón' : `en el puesto ${gameState.boardTarget}º o mejor`} (tu plantilla es la ${rank}ª de ${teams.length} por nivel).`, 'info');
    return true;
}

async function boardUpdate() {
    if (gameState.seasonType !== 'regular') return;
    const me = gameState.team, st = gameState.standings && gameState.standings[me];
    if (!st || st.pj < 3) return;
    if (gameState.boardTargetSeason !== gameState.currentSeason) await computeBoardTarget();

    const sorted = sortStandings(gameState.standings), n = sorted.length;
    const pos = sorted.findIndex(([t]) => t === me) + 1;
    const target = gameState.boardTarget || Math.ceil(n / 2);

    const mine = (gameState.matchHistory || []).filter(m => !m.playoff && (m.home === me || m.away === me)).slice(-5);
    let pts5 = 0;
    mine.forEach(m => {
        const [hg, ag] = String(m.score || '0-0').split('-').map(Number);
        const my = m.home === me ? hg : ag, op = m.home === me ? ag : hg;
        pts5 += my > op ? 3 : my === op ? 1 : 0;
    });
    const games5 = Math.max(1, mine.length);
    let delta = Math.max(-3, Math.min(3, (target - pos) / n * 14));       // posición vs objetivo
    delta += (pts5 / (games5 * 3) - 0.45) * 9;                              // forma reciente
    if (gameState.balance < 0) {                                            // números rojos
        delta -= 1.5;
        const weekly = Math.max(1, gameState.weeklyExpenses || 1);
        if (-gameState.balance > weekly * 8) delta -= 2.5;                   // deuda de más de 8 jornadas de gastos
    }
    const secondaryKey=`${gameState.currentSeason}|${Math.floor(gameState.week/4)}`;
    if(gameState.week%4===0 && gameState.boardSecondaryLastKey!==secondaryKey){
        const goals=evaluateBoardObjectives(gameState).filter(g=>g.key!=='league');
        const met=goals.filter(g=>g.met).length;
        if(goals.length)delta+=Math.max(-1,Math.min(1,(met/goals.length-.5)*2));
        gameState.boardSecondaryLastKey=secondaryKey;
    }
    const before = gameState.boardConfidence ?? 65;
    const conf = Math.max(0, Math.min(100, before + Math.max(-6, Math.min(4, delta))));
    gameState.boardConfidence = Math.round(conf * 10) / 10;

    const where = `vas ${pos}º y el objetivo es el ${target}º`;
    if (conf < 30 && (gameState.boardWarn || 0) < 2) {
        gameState.boardWarn = 2;
        addNews(`🔴 [Directiva] ÚLTIMO AVISO: ${where}, con ${pts5} puntos de los últimos ${games5 * 3}. Si no cambia la dinámica de inmediato, tomaremos decisiones.`, 'error');
    } else if (conf < 45 && (gameState.boardWarn || 0) < 1) {
        gameState.boardWarn = 1;
        addNews(`⚠️ [Directiva] PRIMER AVISO: ${where}. La directiva pierde la confianza en el rumbo del equipo.`, 'warning');
    } else if (conf >= 55 && (gameState.boardWarn || 0) > 0) {
        gameState.boardWarn = 0;
        addNews(`[Directiva] Vemos una mejora en el equipo y recuperas parte de nuestra confianza (${where}).`, 'success');
    } else if (conf >= 75 && pos <= target && gameState.week - (gameState.boardLastPraise ?? -99) >= 6) {
        gameState.boardLastPraise = gameState.week;
        addNews(`[Directiva] Felicitaciones: ${pos}º en la tabla, por encima del objetivo (${target}º). Sigan así.`, 'success');
    } else if (gameState.week % 6 === 0 && conf >= 45 && conf < 75) {
        addNews(`[Directiva] Seguimiento: ${where}. ${pos <= target ? 'Cumplís lo esperado.' : 'Esperamos más.'}`, pos <= target ? 'info' : 'warning');
    }
}
function boardMessages() { return boardUpdate(); }

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
async function simulateLeagueTable(teams, division, season, upToWeek = Infinity, played = null) {
    const saved=gameState.world?.season===season && gameState.world.divisions[division];
    if(saved){
        await advanceWorldLeagues(Number.isFinite(upToWeek)?upToWeek-1:Infinity);
        if(played)played.push(...saved.history.map(m=>({...m})));
        return saved.standings;
    }
    const strength = {};
    for (const team of teams) {
        const squad = await getAISquadCached(team, division, season);
        const formation = chooseAIFormation(squad);
        strength[team] = {
            overall: calculateTeamEffectiveOverall(pickBestXI(squad, formation), formation),
            formation, squad, lineup: pickBestXI(squad, formation)
        };
    }
    const standings = initStandings(teams);
    for (const m of generateLeagueCalendar(teams)) {
        if (m.week >= upToWeek) continue;           // solo las jornadas ya jugadas
        const h = strength[m.home], a = strength[m.away];
        const r = calculateMatchOutcomeImproved({
            teamOverall: h.overall, opponentOverall: a.overall,
            teamLineup:h.lineup, opponentLineup:a.lineup, teamName:m.home, opponentName:m.away,
            teamFormation: h.formation, opponentFormation: a.formation, isHome: true
        });
        addResultToStandings(standings, m.home, m.away, r.teamGoals, r.opponentGoals);
        if (played) played.push({ week: m.week, home: m.home, away: m.away, score: `${r.teamGoals}-${r.opponentGoals}`, homeGoals: r.teamGoals, awayGoals: r.opponentGoals });
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

async function resolveSeasonEnd(pre = null) {
    const season = gameState.currentSeason;
    const userDiv = gameState.division;
    const leagues = ensureLeagueStructure();

    // 1) Clasificaciones finales de todas las divisiones
    const tables = pre && pre.tables ? pre.tables : {};
    for (const [div, teams] of Object.entries(leagues)) {
        if (pre && pre.tables) break;
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
        const po = pre?.playoffs?.segunda || await playFourTeamPlayoff(segunda.slice(2, 6), 'segunda');
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
        if (pre?.playoffs?.rfef) {
            playoffs.rfef = pre.playoffs.rfef;
            pre.playoffs.rfef.finals.forEach(f => move(f.winner, g1.includes(f.winner) ? 'rfef_grupo1' : 'rfef_grupo2', 'segunda', 'ascenso por playoff'));
        } else if (g1.length >= 5 && g2.length >= 5) {
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
        const po = pre?.playoffs?.promesas || await playFourTeamPlayoff(promesas.slice(1, 5), 'promesas');
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

// ============================================================
// PLAYOFF JUGABLE
// Si tu equipo se clasifica, el playoff no se resuelve solo: la temporada
// entra en fase 'playoff' y cada "Seguir" juega uno de tus partidos (ida y
// vuelta, con prórroga y penaltis) con las ventanas de copa (anuncio con
// primas y resultado). Las eliminatorias de los demás se simulan.
// Al terminar, se cierra la temporada con tu resultado real.
// ============================================================
async function computeSeasonTables() {
    const season = gameState.currentSeason;
    const userDiv = gameState.division;
    const leagues = ensureLeagueStructure();
    const tables = {};
    for (const [div, teams] of Object.entries(leagues)) {
        if (!Array.isArray(teams) || teams.length < 2) continue;
        const standings = div === userDiv ? gameState.standings : await simulateLeagueTable(teams, div, season);
        tables[div] = sortStandings(standings).map(([team, s]) => ({
            team, pts: s.pts || 0, gf: s.gf || 0, gc: s.gc || 0, g: s.g || 0, e: s.e || 0, p: s.p || 0
        }));
    }
    return tables;
}

// La eliminatoria del usuario se guarda como (lista, posición): el estado se copia
// entre semanas y una referencia directa dejaría de apuntar a la misma eliminatoria
function userTie(run) {
    if (!run || !run.curList) return null;
    const list = run[run.curList];
    return Array.isArray(list) ? list[run.curIdx] : list;
}
function setUserTie(run, listName) {
    const me = gameState.team;
    const list = run[listName];
    if (Array.isArray(list)) {
        const idx = list.findIndex(t => t.teamA === me || t.teamB === me);
        run.curList = idx >= 0 ? listName : null; run.curIdx = idx;
    } else {
        run.curList = list && (list.teamA === me || list.teamB === me) ? listName : null; run.curIdx = 0;
    }
    return userTie(run);
}

function seedTie(a, b, order) {
    return order.indexOf(a) <= order.indexOf(b) ? { teamA: a, teamB: b, legs: [] } : { teamA: b, teamB: a, legs: [] };
}

async function maybeStartUserPlayoff() {
    const me = gameState.team, div = gameState.division;
    const tables = await computeSeasonTables();
    const names = d => (tables[d] || []).map(r => r.team);
    let run = null;
    if (div === 'segunda' || div === 'promesas') {
        const order = names(div);
        const seeds = div === 'segunda' ? order.slice(2, 6) : order.slice(1, 5);
        if (seeds.length === 4 && seeds.includes(me)) {
            const sf = [{ teamA: seeds[0], teamB: seeds[3], legs: [] }, { teamA: seeds[1], teamB: seeds[2], legs: [] }];
            run = { kind: 'four', division: div, seeds, sf, stage: 'sf' };
        }
    } else if (div === 'rfef_grupo1' || div === 'rfef_grupo2') {
        const g1 = names('rfef_grupo1'), g2 = names('rfef_grupo2');
        const inPO = (div === 'rfef_grupo1' ? g1 : g2).slice(1, 5).includes(me);
        if (inPO && g1.length >= 5 && g2.length >= 5) {
            const r1 = [{ teamA: g1[1], teamB: g2[4], legs: [] }, { teamA: g1[2], teamB: g2[3], legs: [] },
                        { teamA: g2[1], teamB: g1[4], legs: [] }, { teamA: g2[2], teamB: g1[3], legs: [] }];
            run = { kind: 'rfef', division: div, g1, g2, r1, stage: 'r1' };
        }
    }
    if (!run) return false;
    run.tables = tables;
    const first = setUserTie(run, run.sf ? 'sf' : 'r1');
    run.done = false;
    gameState.playoffRun = run;
    gameState.seasonType = 'playoff';
    const rival = first.teamA === me ? first.teamB : first.teamA;
    addNews(`⬆️ ¡Te has clasificado para el playoff de ascenso! Primer rival: ${rival} (ida y vuelta).`, 'success');
    alert(`⬆️ ¡Playoff de ascenso!\n\nHas terminado la liga en puesto de playoff. Ahora juegas las eliminatorias a ida y vuelta: el primer rival es ${rival}.\n\nPulsa «Seguir» para jugar cada partido. Puedes ofrecer primas antes de cada uno.`);
    showPlayoffNext();
    return true;
}

function playoffStageName(run, legNo) {
    const leg = legNo === 0 ? 'ida' : 'vuelta';
    if (run.kind === 'rfef') return run.stage === 'r1' ? `Playoff — Eliminatoria (${leg})` : `Playoff — Final (${leg})`;
    return run.stage === 'sf' ? `Playoff — Semifinal (${leg})` : `Playoff — Final (${leg})`;
}

function showPlayoffNext() {
    const run = gameState.playoffRun;
    const t = userTie(run);
    if (!run || run.done || !t) return;
    const legNo = t.legs.length;
    const home = legNo === 0 ? t.teamB : t.teamA, away = legNo === 0 ? t.teamA : t.teamB;
    const dateEl = typeof document !== 'undefined' && document.getElementById('nextMatchDate');
    const teamsEl = typeof document !== 'undefined' && document.getElementById('nextMatchTeams');
    if (dateEl) dateEl.textContent = playoffStageName(run, legNo);
    if (teamsEl) teamsEl.textContent = `${home}\nvs\n${away}`;
}

function penaltiesShootout() {
    let a = 0, b = 0, i = 0;
    for (; i < 5; i++) { if (Math.random() < 0.76) a++; if (Math.random() < 0.76) b++; }
    while (a === b && i < 30) { if (Math.random() < 0.76) a++; if (Math.random() < 0.76) b++; i++; }
    return { a, b };
}

// Convierte una eliminatoria jugada al formato de playTwoLegTie
function tieResult(t) {
    const [l1, l2] = t.legs;           // l1: en casa de teamB · l2: en casa de teamA
    return {
        teamA: t.teamA, teamB: t.teamB,
        leg1: { hg: l1.hg, ag: l1.ag }, leg2: { hg: l2.hg, ag: l2.ag },
        totalA: l1.ag + l2.hg, totalB: l1.hg + l2.ag,
        winner: t.winner, penalties: t.penalties || null
    };
}

async function playoffStep() {
    const run = gameState.playoffRun;
    if (!run || run.done) return;
    syncLineupFromSquad();
    autoFixLineup();
    const me = gameState.team;
    const t = userTie(run);
    if (!t) return;
    const legNo = t.legs.length;
    const home = legNo === 0 ? t.teamB : t.teamA, away = legNo === 0 ? t.teamA : t.teamB;
    const isHome = home === me;
    const opponent = isHome ? away : home;
    const match = { type: 'playoff', phase: playoffStageName(run, legNo), opponent, isHome, isPlayoff: true, neutral: false,
                    id: `po_${run.stage}_${legNo + 1}` };
    if (typeof window !== 'undefined') {
        try { if (window.prepareMatch) await window.prepareMatch(match); } catch (e) { /* sin datos del rival */ }
        match.neutral = false; match.isPlayoff = true;
        if (window.showAnnouncementModal) await window.showAnnouncementModal(match);
    }

    const firstLeg = legNo === 1 ? t.legs[0] : null;
    const r = await playMatchImproved(home, away, gameState, {
        knockout: legNo === 1, aggregate: firstLeg ? [firstLeg.ag, firstLeg.hg] : [0,0], competition: 'playoff'
    });
    const hg=r.homeGoals,ag=r.awayGoals,extraTime=r.extraTime,penalties=r.penalties;
    let processed={advances:null,isLeg:true};
    if(legNo===1){
        const totA=firstLeg.ag+hg,totB=firstLeg.hg+ag;
        if(penalties)t.penalties=penalties;
        t.winner=penalties?(penalties.home>penalties.away?t.teamA:t.teamB):(totA>totB?t.teamA:t.teamB);
        const myTot=t.teamA===me?totA:totB,opTot=t.teamA===me?totB:totA;
        processed={advances:t.winner===me,global:`${myTot}-${opTot}`};
    }
    t.legs.push({ hg, ag, home });

    const myG = isHome ? hg : ag, opG = isHome ? ag : hg;
    gameState.matchHistory.push({ week: gameState.week, home, away, score: `${hg}-${ag}`, playoff: true, goals:r.goals,cards:r.cards,injuries:r.injuries,stats:r.stats,substitutions:r.substitutions,timeline:r.timeline });
    addNews(`⬆️ ${match.phase}: ${home} ${hg}-${ag} ${away}${penalties ? ` (penaltis ${penalties.home}-${penalties.away})` : extraTime ? ' (tras la prórroga)' : ''}`, myG > opG ? 'success' : myG < opG ? 'error' : 'info');

    try { if (typeof window !== 'undefined') window.PCFPrizes?.onGate?.(match); } catch (e) { /* */ }
    if (typeof window !== 'undefined' && window.showResultModal) {
        const result = { myGoals: myG, oppGoals: opG, win: myG > opG, draw: myG === opG, loss: myG < opG,
            myTeam: me, opponent, isHome, neutral: false,
            goals:r.goals,cards:r.cards,injuries:r.injuries,substitutions:r.substitutions,timeline:r.timeline,
            stats:isHome?r.stats:Object.fromEntries(Object.entries(r.stats).map(([k,v])=>[k,[v[1],v[0]]])),
            extraTime: extraTime ? { my: isHome ? extraTime.home : extraTime.away, opp: isHome ? extraTime.away : extraTime.home } : null,
            penalties: penalties ? { my: isHome ? penalties.home : penalties.away, opp: isHome ? penalties.away : penalties.home } : null,
            qualified: processed.advances };
        await window.showResultModal(match, result, processed);
    }

    if (legNo === 1) await advancePlayoff();
    showPlayoffNext();
}

async function advancePlayoff() {
    const run = gameState.playoffRun, me = gameState.team;
    const div = run.division;
    const finish = async () => {
        run.done = true;
        run.curList = null;
        gameState.seasonType = 'regular';
        await endSeason();
    };
    if (run.kind === 'four') {
        if (run.stage === 'sf') {
            // Tu semifinal ya jugada; la otra se simula ahora
            run.sfResults = [];
            for (const tie of run.sf) run.sfResults.push(tie.legs.length === 2 ? tieResult(tie) : await playTwoLegTie(tie.teamA, tie.teamB, div));
            run.sfResults.forEach((res, i) => { run.sf[i].winner = res.winner; });
            const [fa, fb] = [run.sfResults[0].winner, run.sfResults[1].winner].sort((x, y) => run.seeds.indexOf(x) - run.seeds.indexOf(y));
            run.final = { teamA: fa, teamB: fb, legs: [] };
            if (fa === me || fb === me) {
                run.stage = 'final';
                setUserTie(run, 'final');
                addNews(`⬆️ ¡A la final del playoff! Rival: ${fa === me ? fb : fa}.`, 'success');
                return;
            }
            run.finalResult = await playTwoLegTie(fa, fb, div);
        } else {
            run.finalResult = tieResult(run.final);
        }
        run.results = { [div === 'segunda' ? 'segunda' : 'promesas']: {
            seeds: run.seeds, sf1: run.sfResults[0], sf2: run.sfResults[1], final: run.finalResult, winner: run.finalResult.winner } };
        return finish();
    }
    // Primera RFEF: cruces entre grupos y dos finales
    if (run.stage === 'r1') {
        run.r1Results = [];
        for (const tie of run.r1) {
            run.r1Results.push(tie.legs.length === 2 ? tieResult(tie) : await playTwoLegTie(tie.teamA, tie.teamB, div));
        }
        const pos = t => (run.g1.includes(t) ? run.g1.indexOf(t) : run.g2.indexOf(t));
        const seed = (x, y) => (pos(x) <= pos(y) ? [x, y] : [y, x]);
        const w = run.r1Results.map(r => r.winner);
        run.finals = [seed(w[0], w[3]), seed(w[2], w[1])].map(([a, b]) => ({ teamA: a, teamB: b, legs: [] }));
        const mine = run.finals.find(f => f.teamA === me || f.teamB === me);
        if (mine) {
            run.stage = 'final';
            setUserTie(run, 'finals');
            addNews(`⬆️ ¡A la final del playoff! Rival: ${mine.teamA === me ? mine.teamB : mine.teamA}.`, 'success');
            return;
        }
        run.finalResults = [];
        for (const f of run.finals) run.finalResults.push(await playTwoLegTie(f.teamA, f.teamB, div));
    } else {
        run.finalResults = [];
        for (const f of run.finals) run.finalResults.push(f.legs.length === 2 ? tieResult(f) : await playTwoLegTie(f.teamA, f.teamB, div));
    }
    run.results = { rfef: { direct: [run.g1[0], run.g2[0]], round1: run.r1Results, finals: run.finalResults, winners: run.finalResults.map(f => f.winner) } };
    return finish();
}

async function endSeason() {
    const currentDivision = gameState.division;
    // ¿Juega tu equipo un playoff? Entonces la temporada sigue en fase 'playoff'
    const pr = gameState.playoffRun;
    if (!pr) {
        try { if (await maybeStartUserPlayoff()) return; } catch (e) { console.error('Playoff:', e); }
    }
    let summary;
    try {
        const pre = pr && pr.done ? { tables: pr.tables, playoffs: pr.results } : null;
        gameState.playoffRun = null;
        summary = await resolveSeasonEnd(pre);
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

    // Gala de fin de temporada (si el módulo está cargado); si no, el aviso de siempre
    if (typeof window !== 'undefined' && typeof window.showSeasonGala === 'function') {
        try { await window.showSeasonGala(summary, fullText); } catch (e) { console.error('Gala:', e); alert(fullText); }
    } else {
        alert(fullText);
    }
    captureWorldClub();
    if(gameState.world){
        returnWorldLoans(gameState.world);
        gameState.squad=gameState.world.clubs[gameState.team].squad;
        for(const p of gameState.squad)appendWorldCareer(p,summary.season,gameState.team);
    }
    setupNewSeason(currentDivision, nextDivisionKey);
    rollWorldSeason(summary);
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
    await ensureWorld();
    recoverMatchFitness(gameState.squad,gameState,true);  
    // Partidas empezadas con la estimación antigua: los menores de 20 con potencial ridículo se corrigen una vez
    if (!gameState.potentialFixed && Array.isArray(gameState.squad)) {
        let fixed = 0;
        gameState.squad.forEach(p => {
            if (p && (p.age || 30) <= 19) {
                const est = estimatePotential(p);
                if ((p.potential || 0) < est && (p.potential || 0) - (p.overall || 0) < (est - (p.overall || 0)) * 0.6) { p.potential = est; fixed++; }
            }
        });
        gameState.potentialFixed = true;
        if (fixed) addNews(`[Secretario Técnico] Hemos revisado el potencial de ${fixed} jóvenes de la plantilla: tienen más margen de mejora del que se estimó.`, 'info');
    }
    // Partidas antiguas con plantilla incompleta: se completa una sola vez
    if ((gameState.squad || []).length < 16 && !gameState.squadToppedUp && gameState.seasonType !== 'playoff') {
        const before = gameState.squad.length;
        gameState.squad = topUpSquad(gameState.squad, gameState.division, gameState.team, 20);
        gameState.squadToppedUp = true;
        addNews(`[Secretario Técnico] La plantilla era demasiado corta (${before} jugadores): hemos incorporado ${gameState.squad.length - before} para poder competir.`, 'warning');
        gameState.lineup = pickBestXI(gameState.squad, gameState.formation || '433').filter(Boolean);
    }
    // Fase de playoff: cada semana se juega un partido de tu eliminatoria
    if (gameState.seasonType === 'playoff') {
        await playoffStep();
        return { myMatch: null, forcedLoss: false, playoff: true };
    }
    let myMatchResult = null;
    let forcedLoss = false;  

    // Partidas guardadas con la duración mal calculada (p. ej. Segunda a 38 jornadas)
    const realLength = worldSeasonWeeks();
    if (realLength && gameState.maxSeasonWeeks !== realLength) gameState.maxSeasonWeeks = realLength;

    // ===== PRETEMPORADA =====
    if (gameState.seasonType === 'preseason') {  
        handlePreseasonWeek();
        closeWorldClubFinances(gameState.week,'preseason');runWorldMarket();  
        gameState.week++;  
        updateWeeklyFinancials();  

        if (gameState.week > PRESEASON_WEEKS) {  
            gameState.seasonType = 'regular';  
            gameState.week = 1;
            if (gameState.boardTargetSeason !== gameState.currentSeason) await computeBoardTarget();
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
    await boardUpdate();

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
                goals: result.goals || [], cards: result.cards || [], injuries: result.injuries || [],
                stats: result.stats, substitutions: result.substitutions || [], timeline: result.timeline || [], engineVersion: result.engineVersion,
                home: result.homeTeam, 
                away: result.awayTeam, 
                homeGoals: result.homeGoals, 
                awayGoals: result.awayGoals, 
                score: `${result.homeGoals}-${result.awayGoals}` 
            };
            
            gameState.matchHistory.push({ 
                week: gameState.week, 
                goals: result.goals || [], cards: result.cards || [], injuries: result.injuries || [],
                stats: result.stats, substitutions: result.substitutions || [], timeline: result.timeline || [], engineVersion: result.engineVersion,
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

    // Close every league on the same world date; these fixtures are never re-simulated.
    captureWorldClub();await advanceWorldLeagues(gameState.week);
    closeWorldClubFinances(gameState.week,'regular');runWorldMarket();
    // ===== ACTUALIZAR PRÓXIMO PARTIDO =====
    gameState.week++;
    window.updateNextMatchInfo();

    weeklyYouthGrowth();

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

    // ===== DEUDA: ya no hay "game over" que borre la partida =====
    // La deuda erosiona la confianza de la directiva (ver boardUpdate); en el modo
    // carrera eso puede acabar en despido, siempre tras avisos y con motivo.
    if (gameState.balance < 0 && gameState.week % 4 === 0) {
        const debt = Math.abs(gameState.balance);
        addNews(`[Directiva] El club está en números rojos (${debt.toLocaleString('es-ES')}€). Hay que recuperar el equilibrio económico cuanto antes: vender jugadores o reducir gastos.`, 'error');
    }

    // ===== FIN DE TEMPORADA =====
    // Si quedan partidos de copa o de Europa, la temporada sigue hasta jugarlos
    if (gameState.week > gameState.maxSeasonWeeks) {
        const pendingCups = (typeof window !== 'undefined' && window.CupMatches?.pendingCount?.()) || 0;
        if (pendingCups > 0) {
            if (!gameState.cupsPendingNotified) {
                addNews(`🏁 Liga terminada. Quedan ${pendingCups} partido(s) de copa o competición europea: la temporada se cierra al jugarlos.`, 'info');
                gameState.cupsPendingNotified = true;
            }
        } else {
            gameState.cupsPendingNotified = false;
            await endSeason();
        }
    }
        
    return { myMatch: myMatchResult, forcedLoss };
}



  
function handlePreseasonWeek() {
    for(const p of gameState.squad){p.condition=Math.min(100,(p.condition??100)+15);if(p.isInjured){p.weeksOut=Math.max(0,(p.weeksOut||0)-1);if(!p.weeksOut){p.isInjured=false;p.injuryType=null;}}}  
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
  
// ── Demanda de entradas y merchandising ─────────────────────────
// Precio "justo" de la entrada por división (y sube con la popularidad del club).
const TICKET_REF = { primera: 35, segunda: 20, rfef_grupo1: 12, rfef_grupo2: 12, promesas: 2 };
// Afluencia máxima realista por categoría (a popularidad 50) y sensibilidad al precio: en ligas pequeñas
// la gente deja de ir enseguida si el precio es alto, y en Promesas (niños de 14-15 años) solo van familias.
const DEMAND_CAP = { promesas: 450, rfef_grupo1: 8000, rfef_grupo2: 8000, segunda: 45000 };
const PRICE_EXP = { promesas: 2.4, rfef_grupo1: 1.6, rfef_grupo2: 1.6, segunda: 1.4 };
// Merchandising neto semanal de un club de 100.000 fans con popularidad 50, a su precio óptimo.
const MERCH_BASE = { primera: 600000, segunda: 60000, rfef_grupo1: 15000, rfef_grupo2: 15000, promesas: 3000 };
const MERCH_UNIT_COST = 5;      // coste por artículo: el margen es (precio − 5)

function ticketRefPrice(state) {
    const base = TICKET_REF[state.division] ?? 20;
    return base * (0.7 + (state.popularity ?? 50) / 100 * 0.6);
}
// Asistencia: interés de la afición (según fans y popularidad) × efecto del precio frente al de referencia
function computeAttendance(state, price) {
    const tp = Math.max(1, price !== undefined ? price : (state.ticketPrice || 20));
    const pop = state.popularity ?? 50;
    const interest = (state.fanbase || 0) * (0.30 + 0.60 * pop / 100);
    const priceEffect = Math.min(1.4, Math.pow(ticketRefPrice(state) / tp, PRICE_EXP[state.division] ?? 1.3));
    let att = Math.floor(interest * priceEffect);
    const cap = DEMAND_CAP[state.division];
    if (cap) att = Math.min(att, Math.round(cap * (0.5 + pop / 100)));
    return Math.max(0, Math.min(state.stadiumCapacity || 0, att));
}
// Merchandising: ingresos netos de la semana (solo se cobran en jornadas en casa)
function computeMerch(state, price) {
    const p = Math.max(1, price !== undefined ? price : (state.merchandisingPrice || 10));
    // Crece más que proporcionalmente con la afición: los grandes venden mucho más que los pequeños
    const base = (MERCH_BASE[state.division] ?? 15000) * Math.pow((state.fanbase || 0) / 100000, 1.7) * Math.pow((state.popularity ?? 50) / 50, 1.2);
    const priceFactor = Math.pow(10 / p, 2) * Math.max(0, p - MERCH_UNIT_COST) / 5;
    const revenue = Math.floor(base * priceFactor);
    return { revenue, items: Math.round(revenue / Math.max(1, p - MERCH_UNIT_COST)) };
}

function updateWeeklyFinancials() {  
    const playerSalaries = gameState.squad.reduce((sum, p) => sum + (p.salary||0), 0)+(gameState.loanSalaryExpense||0);  
    const staffSalaries = Object.values(gameState.staff).reduce((sum, s) => sum + (s?.salary || 0), 0);  
    gameState.weeklyExpenses = playerSalaries + staffSalaries;  
  
    const attendance = computeAttendance(gameState);
    const merch = computeMerch(gameState);
    gameState.merchandisingItemsSold = merch.items;
    gameState.merchandisingRevenue = merch.revenue;
  
    gameState.weeklyIncome = gameState.weeklyIncomeBase +  
                             Math.floor(gameState.ticketPrice * attendance) +  
                             gameState.merchandisingRevenue;  
  
    // Projection only. Actual cash is posted once by the weekly ledger.
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
        const availableSquadPlayers = gameState.squad.filter(isAvailable);  
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
            const availableSquadPlayers = gameState.squad.filter(isAvailable);  
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
        !p.isInjured && !p.isSuspended &&
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
            if (fullPlayer && fullPlayer.isSuspended) return { success: false, message: `¡Error! ${player.name} está sancionado y no puede jugar.` };
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
    player.club='Libre';player.contractType='free';player.isFreeAgent=true;player.transferListed=false;player.loanListed=false;
    (gameState.freeAgentsPool=gameState.freeAgentsPool||[]).push(player);captureWorldClub();
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

    const loan=offer.type==='loan';
    const percentage=loan?Math.round((offer.wageContribution||0)/Math.max(1,current.salary||1)*100):100;
    const moved=worldMove({id:current.id,from:gameState.team,to:offer.club,fee:loan?0:offer.amount,
        salary:expectedSalary(current,teamDivision(offer.club)),loan,wagePercent:percentage});
    if(!moved.success){alert(moved.message);return;}
    replaceInLineup(current.name);
    if(!loan)gameState.playerSalesIncome=(gameState.playerSalesIncome||0)+offer.amount;
    addNews(loan?`🔄 ${current.name} cedido al ${offer.club}; asume el ${percentage}% del salario.`:
        `💰 ${current.name} vendido al ${offer.club} por ${offer.amount.toLocaleString('es-ES')}€.`, 'success');

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
async function counterOffer(offerIndex) {
    // ✅ VALIDAR
    if (!gameState.pendingOffers || !gameState.pendingOffers[offerIndex]) {
        console.error('❌ Oferta no encontrada:', offerIndex);
        alert('Error: Oferta no válida');
        return;
    }
    
    const offer = gameState.pendingOffers[offerIndex];
    
    const counterAmount = await window.pcfPrompt(
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
    updateGameState, replaceGameState,  
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
    window.pcfWorld = {
        ensure:ensureWorld,
        getClub:name=>{captureWorldClub();return JSON.parse(JSON.stringify(gameState.world?.clubs[name]||null));},
        getTransfers:()=>JSON.parse(JSON.stringify(gameState.world?.transfers||[])),
        getTables:()=>JSON.parse(JSON.stringify(gameState.world?.divisions||{})),
        getObjectives:()=>evaluateBoardObjectives(gameState),
        getAwards:(division,season)=>{
            const w=gameState.world;if(!w)return null;
            const statistics=!season||season===w.season?w.statistics:w.seasons.find(s=>s.season===season)?.statistics;
            if(!statistics)return null;
            const table=(!season||season===w.season)?w.divisions[division]?.standings:null;
            const past=season&&season!==w.season?w.seasons.find(s=>s.season===season)?.tables?.[division]:null;
            const leagueGames=table?Math.max(0,...Object.values(table).map(r=>r.pj||0)):Math.max(0,...(past||[]).map(r=>(r.g||0)+(r.e||0)+(r.p||0)));
            const qualifying=Math.max(1,Math.min(28,Math.floor(leagueGames*.75)));
            const rows=Object.values(statistics[division]||{}).map(r=>({...r,team:r.clubs.join(' / '),mine:r.clubs.includes(gameState.team),pj:r.matches,gc:r.conceded,ratio:r.keeperMinutes?r.conceded/(r.keeperMinutes/90):0}));
            return {pichichi:rows.filter(r=>r.goals>0).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name)).slice(0,5),
                zamora:rows.filter(r=>(r.keeperQualifyingMatches||0)>=qualifying).sort((a,b)=>a.ratio-b.ratio||b.keeperMinutes-a.keeperMinutes).slice(0,5)};
        },
        advance:advanceWorldLeagues,market:runWorldMarket,move:worldMove,
        assert:()=>assertWorldOwnership(gameState.world,gameState.freeAgentsPool||[])
    };
    window.pcfEconomy = {
        ECONOMY, marketValue, expectedSalary, secretaryBonus, normalizeMarketPlayer, roundMoney,
        benefits: (state, ticket = 0, merch = 0) => {
            const result = { house: 0, car: 0, tickets: 0, merch: 0 };
            for (const p of state.squad || []) {
                if (p.contractType === 'loaned_out') continue;
                result.house += typeof p.house === 'number' ? p.house : (p.house ? 250 : 0);
                result.car += typeof p.car === 'number' ? p.car : (p.car ? 100 : 0);
                result.tickets += ticket * Math.max(0, Math.min(100, Number(p.ticketPercent) || 0)) / 100;
                result.merch += merch * Math.max(0, Math.min(100, Number(p.merchPercent) || 0)) / 100;
            }
            Object.keys(result).forEach(k => result[k] = Math.round(result[k]));
            result.total = result.house + result.car + result.tickets + result.merch;
            return result;
        },
        makeOffer: (playerName) => {
            const p = gameState.squad.find(x => x.name === playerName);
            return p ? makeOfferForPlayer(p) : null;
        },
        replaceInLineup,
        attendance: (st, price) => computeAttendance(st || gameState, price),
        merch: (st, price) => computeMerch(st || gameState, price),
        ticketRef: (st) => ticketRefPrice(st || gameState),
        markJoined: (p) => markJoined(p),
        canSell: (p) => canSellPlayer(p)
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
        updateGameState, replaceGameState,
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
    if (gameState.seasonType === 'playoff') { showPlayoffNext(); return; }
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
