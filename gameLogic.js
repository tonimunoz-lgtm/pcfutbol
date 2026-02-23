// gameLogic.js - Lógica central del juego  

import {  
    TEAMS_DATA, ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS,  
    STAFF_ROLES, STAFF_LEVEL_EFFECTS, DIVISION_MULTIPLIERS,  
    BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS,  
    FORMATIONS, PRESEASON_WEEKS, PROMOTION_RELEGATION // Eliminado SEASON_WEEKS de aquí  
} from './config.js';  
import { getPlayerMarket as getPlayerMarketData, getYoungsterMarket as getYoungsterMarketData, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall, generateRandomName } from './players.js';  
import { getTeamData, saveTeamData } from './teamData.js';


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
        segundoEntrenador: null  
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
    currentSeason: '2025/2026',  
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
    Object.assign(gameState, newState);  
    updateWeeklyFinancials();  
}  
  
function addNews(message, type = 'info', read = false) {  
    gameState.newsFeed.unshift({ week: gameState.week, message: message, timestamp: Date.now(), type: type, read: read });  
    if (gameState.newsFeed.length > 20) {  
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
  
/*// NEW: Función para generar el calendario de la liga (Round-robin)  
function generateLeagueCalendar(teams) {  
    const numTeams = teams.length;  
    if (numTeams < 2) return [];  
  
    let schedule = [];  
    let tempTeams = [...teams];  
  
    // Si el número de equipos es impar, añade un "BYE" para la rotación  
    if (numTeams % 2 !== 0) {  
        tempTeams.push("BYE");  
    }  
    const numActualTeams = tempTeams.length;  
    const numRounds = numActualTeams - 1; // Cada equipo juega una vez contra todos  
  
    // Primera vuelta (ida)  
    for (let round = 0; round < numRounds; round++) {  
        for (let i = 0; i < numActualTeams / 2; i++) {  
            const homeTeam = tempTeams[i];  
            const awayTeam = tempTeams[numActualTeams - 1 - i];  
  
            if (homeTeam !== "BYE" && awayTeam !== "BYE") {  
                schedule.push({ home: homeTeam, away: awayTeam, week: round + 1, homeGoals: null, awayGoals: null });  
            }  
        }  
  
        // Rotar los equipos (mantener el primer equipo fijo)  
        const lastTeam = tempTeams.pop();  
        tempTeams.splice(1, 0, lastTeam);  
    }  
  
    // Segunda vuelta (vuelta)  
    // Crear una nueva lista de partidos para la segunda vuelta, invirtiendo local/visitante  
    const secondHalfSchedule = schedule.map(match => ({  
        home: match.away,  
        away: match.home,  
        week: match.week + numRounds, // Sumar numRounds para que las semanas sean consecutivas  
        homeGoals: null,  
        awayGoals: null  
    }));  
  
    // Combinar y ordenar por semana  
    const fullSchedule = [...schedule, ...secondHalfSchedule];  
    fullSchedule.sort((a, b) => a.week - b.week); // Ordenar por semana  
  
    return fullSchedule;  
}  */

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
    
    // 🔄 FALLBACK: GENERAR PLANTILLA ALEATORIA (código original)
    console.log(`⚙️ Generando plantilla aleatoria para ${gameState.team}`);
    
    const squad = [];  
    const allAvailablePlayers = initPlayerDatabase();
  
    const elitePlayersNames = ['Griezmann', 'Koke', 'Oblak', 'Nahuel Molina', 'José Giménez', 'Samuel Lino', 'Álvaro Morata', 'Reinildo Mandava', 'Marcos Llorente', 'Pablo Barrios', 'Axel Witsel'];  
    if (gameState.team === 'Atlético Madrid') {  
        elitePlayersNames.forEach(name => {  
            const p = allAvailablePlayers.find(ep => ep.name === name);  
            if (p && !squad.some(s => s.name === p.name)) {
                squad.push({ ...p, club: gameState.team, isInjured: false, weeksOut: 0, matches: 0, form: 70 + Math.floor(Math.random() * 20) });  
            }  
        });  
    }  
  
    // Rellenar hasta 18 jugadores
    while (squad.length < 18) {
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
        const age = 18 + Math.floor(Math.random() * 10);
        
        const player = {  
            name: generateRandomName(),  
            age: age,  
            position: pos,  
            foot: Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro'),  
            matches: 0,  
            form: 60 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,  
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 40 + Math.floor(Math.random() * 30);
                return acc;  
            }, {})  
        };  
        
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000);  
        player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5);
        
        // Campos de contrato
        player.contractType = Math.random() < 0.8 ? 'owned' : 'loaned';
        player.contractYears = player.contractType === 'loaned' ? 1 : 
                               age < 23 ? 3 + Math.floor(Math.random() * 3) : 
                               age < 30 ? 2 + Math.floor(Math.random() * 3) : 
                               1 + Math.floor(Math.random() * 2);
        
        // Calcular cláusula de rescisión
        let multiplier = 2.0;
        if (player.age < 25) multiplier += 0.5;
        if (player.potential > 80) multiplier += 1.0;
        if (player.overall > 80) multiplier += 1.0;
        const baseClause = Math.round(player.value * multiplier);
        player.releaseClause = Math.round(baseClause / 10000) * 10000;
        
        squad.push(player);  
    }  
  
    return squad;
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
  
    let teamsInNewDivision = TEAMS_DATA[nextDivisionKey];  
    if (!teamsInNewDivision) {  
        console.error(`División no encontrada en TEAMS_DATA: ${nextDivisionKey}. Usando Primera por defecto.`);  
        teamsInNewDivision = TEAMS_DATA.primera;  
        gameState.division = 'primera';  
    }  
  
    if (!teamsInNewDivision.includes(gameState.team)) {  
        teamsInNewDivision.push(gameState.team);  
    }  
    gameState.leagueTeams = teamsInNewDivision;  
    gameState.standings = initStandings(teamsInNewDivision);  
  
    gameState.seasonCalendar = generateLeagueCalendar(teamsInNewDivision);  
    gameState.maxSeasonWeeks = teamsInNewDivision.length * 2 - 2;  
  
    addNews(`¡Comienza la ${newSeasonName} en ${gameState.division}! Es tiempo de pretemporada.`, 'success');  
  
    initPlayerDatabase();  
    initYoungsterDatabase();  
  
    // ===== PRIMERA PLANTILLA =====
    gameState.squad = gameState.squad.filter(p => {
        p.age++;  
        p.matches = 0;  
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

        const stage = getAgeStage(p.age);

        // 🔻 Declive físico por edad
        if (stage === 'decline_soft' || stage === 'decline_hard') {
            const physicalAttrs = ['VE', 'AG', 'RE'];
            physicalAttrs.forEach(attr => {
                if (p[attr] > 40 && Math.random() < (stage === 'decline_hard' ? 0.8 : 0.5)) {
                    p[attr]--;
                }
            });
        }

        // 🔻 Declive mental MUY suave (solo mayores)
        if (stage === 'decline_hard') {
            ['VI', 'PA', 'CO'].forEach(attr => {
                if (p[attr] > 50 && Math.random() < 0.2) {
                    p[attr]--;
                }
            });
        }

        // 🔄 Recalcular overall tras cambios
        p.overall = calculatePlayerOverall(p);

        // 🛑 Retiro
        if (p.age >= 36 && Math.random() < 0.25) {
            addNews(`${p.name} se ha retirado del fútbol a los ${p.age} años.`, 'info');
            return false;
        }

        return true;
    });
  
    // ===== CANTERA =====
    gameState.academy.forEach(p => {  
        p.age++;  
        p.matches = 0;  
        p.form = 60 + Math.floor(Math.random() * 20);  
        p.isInjured = false;  
        p.weeksOut = 0;  
    });  
  
    // Reestablecer alineación
    const availablePlayers = gameState.squad
        .filter(p => !p.isInjured)
        .sort((a, b) => b.overall - a.overall);  

    setLineup(availablePlayers.slice(0, 11));  
}
 
  
// ✅ MODIFICAR selectTeamWithInitialSquad para usar await (línea 454-498)
async function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
    // 📄 RESET COMPLETO DEL ESTADO
    Object.assign(gameState, {
        team: teamName,
        division: divisionType,
        gameMode: gameMode,
        currentSeason: '2025/2026',
        seasonType: 'preseason',
        week: 1,
        matchHistory: [],
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

    // Cargar equipos y calendario
    let teamsInDivision = TEAMS_DATA[divisionType] || TEAMS_DATA.primera;
    if (!teamsInDivision.includes(teamName)) teamsInDivision.push(teamName);

    gameState.leagueTeams = teamsInDivision;
    gameState.standings = initStandings(teamsInDivision);
    gameState.seasonCalendar = generateLeagueCalendar(teamsInDivision);

    addNews(`¡Bienvenido al PC Fútbol Manager, temporada ${gameState.currentSeason}!`, 'info');
    updateWeeklyFinancials();
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
    if (newPlayer.loan === true) {
        newPlayer.contractType = 'loaned';
        newPlayer.contractYears = 1;
        newPlayer.loanListed = false;
        newPlayer.transferListed = false;
    }
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
    const player = gameState.squad.splice(index, 1)[0];  
  
    const salePrice = Math.floor(player.overall * 2000 + (player.matches * 500) * (1 + Math.random() * 0.5));  
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
  
    gameState.negotiatingPlayer = player;  
    gameState.negotiationStep = 1;  
  
    return { success: true, message: `Iniciando negociación con ${player.name}.` };  
}  
  
function offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    let acceptanceChance = 0.5;  
  
    const salaryFactor = offeredSalary / player.salary;  
    if (salaryFactor > 1.5) acceptanceChance += 0.3;  
    else if (salaryFactor > 1.2) acceptanceChance += 0.15;  
    else if (salaryFactor < 0.8) acceptanceChance -= 0.2;  
  
    if (offeredBonus) acceptanceChance += 0.05;  
    if (offeredCar) acceptanceChance += 0.05;  
    if (offeredHouse) acceptanceChance += 0.05;  
    if (offeredMerchPercent) acceptanceChance += 0.03;  
    if (offeredTicketPercent) acceptanceChance += 0.03;  
  
    if (player.overall > 80 && gameState.popularity < 60) acceptanceChance -= 0.1;  
    if (player.loanListed && offeredSalary >= player.salary) acceptanceChance += 0.2;  
  
    const roll = Math.random();  
    const secretaryEffect = gameState.staff.secretario ? (STAFF_LEVEL_EFFECTS[gameState.staff.secretario.level]?.negotiation || 0.1) : 0;  
    acceptanceChance += secretaryEffect;  
  
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
        if (roll > 0.8) {  
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
        const playerAskingPrice = player.askingPrice;  
  
        let acceptanceChance = 0.5;  
        const offerFactor = offerAmount / playerAskingPrice;  
        if (offerFactor >= 1) acceptanceChance += 0.3;  
        else if (offerFactor >= 0.8) acceptanceChance += 0.1;  
        else if (offerFactor < 0.6) acceptanceChance -= 0.3;  
  
        if (playerExchange.length > 0) {  
            const totalExchangeValue = playerExchange.reduce((sum, pName) => {  
                const p = gameState.squad.find(s => s.name === pName);  
                return sum + (p ? p.value : 0);  
            }, 0);  
            acceptanceChance += (totalExchangeValue / player.value) * 0.1;  
        }  
  
        const roll = Math.random();  
        const secretaryEffect = gameState.staff.secretario ? (STAFF_LEVEL_EFFECTS[gameState.staff.secretario.level]?.negotiation || 0.1) : 0;  
        acceptanceChance += secretaryEffect;  
  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            if (gameState.balance < offerAmount) {  
                endNegotiation();  
                return { success: false, message: 'No tienes suficiente dinero para esta oferta.', type: 'error' };  
            }  
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
            if (roll > 0.8) {  
                endNegotiation();  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. No quieren vender a ${player.name}.`, type: 'error' };  
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
    return getPlayerMarketData(filters, scoutLevel);  
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
    const divisionQuality = {
        primera: { min: 70, max: 88 },
        segunda: { min: 60, max: 75 },
        rfef_grupo1: { min: 50, max: 65 },
        rfef_grupo2: { min: 50, max: 65 }
    };
    
    const quality = divisionQuality[division] || { min: 55, max: 70 };
    const squad = [];
    
    for (let i = 0; i < 11; i++) {
        const overall = quality.min + Math.random() * (quality.max - quality.min);
        squad.push({
            name: `Jugador ${i+1}`,
            overall: Math.round(overall),
            form: 70 + Math.random() * 15,
            isInjured: false,
            position: ['POR', 'DFC', 'DFC', 'LI', 'LD', 'MC', 'MC', 'EXT', 'EXT', 'DC', 'MC'][i] || 'MC'
        });
    }
    
    return squad;
}


// ✅ MEJORA 2: Cálculo mejorado del overall del equipo
function calculateTeamEffectiveOverall(lineup, formation = '433') {
    if (!lineup || lineup.length === 0) return 40;
    
    const formationLayout = window.FORMATIONS?.[formation]?.layout || [];
    if (formationLayout.length === 0) {
        // Fallback: cálculo simple si no hay formación
        const availablePlayers = lineup.filter(p => !p.isInjured);
        if (availablePlayers.length === 0) return 40;
        return availablePlayers.reduce((sum, p) => sum + p.overall, 0) / availablePlayers.length;
    }
    
    let totalOverall = 0;
    let playerCount = 0;
    
    lineup.forEach((player, index) => {
        if (!player || player.isInjured) return;
        
        const tacticalPosition = formationLayout[index]?.pos;
        if (!tacticalPosition) return;
        
        // ⚠️ PENALIZACIÓN POR POSICIÓN INCORRECTA
        let positionPenalty = 1.0;
        
        if (player.position === tacticalPosition) {
            // ✅ Posición perfecta
            positionPenalty = 1.0;
        } else if (POSITION_COMPATIBILITY[tacticalPosition]?.includes(player.position)) {
            // ⚠️ Posición compatible (ej: DFC de LI)
            positionPenalty = 0.85; // -15%
        } else {
            // ❌ Posición totalmente incorrecta (ej: POR de DC)
            positionPenalty = 0.50; // -50%
        }
        
        const effectiveOverall = player.overall * positionPenalty;
        totalOverall += effectiveOverall;
        playerCount++;
    });
    
    return playerCount > 0 ? totalOverall / playerCount : 40;
}
  
function generateInjury(player) {  
    let injuryProb = BASE_INJURY_PROB_PER_MATCH;  
    let recoveryMin = BASE_RECOVERY_TIME_WEEKS.min;  
    let recoveryMax = BASE_RECOVERY_TIME_WEEKS.max;  
  
    if (gameState.staff.fisio) {  
        const fisioLevel = gameState.staff.fisio.level;  
        const fisioEffect = STAFF_LEVEL_EFFECTS[fisioLevel]?.injuryProb || 1;  
        injuryProb /= fisioEffect;  
    }  
  
    if (player.form < 60) injuryProb *= 1.5;  
    if (player.AG > 85) injuryProb *= 1.2;  
  
    if (Math.random() < injuryProb) {  
        player.isInjured = true;  
        if (gameState.staff.medico) {  
            const medicoLevel = gameState.staff.medico.level;  
            const medicoEffect = STAFF_LEVEL_EFFECTS[medicoLevel]?.recoveryTime || 1;  
            recoveryMin = Math.max(1, Math.round(recoveryMin / medicoEffect));  
            recoveryMax = Math.max(1, Math.round(recoveryMax / medicoEffect));  
        }  
        player.weeksOut = Math.max(1, Math.round(Math.random() * (recoveryMax - recoveryMin) + recoveryMin));  
  
        addNews(`¡${player.name} se ha lesionado! Estará de baja ${player.weeksOut} semanas.`, 'warning');  
        return true;  
    }  
    return false;  
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
    opponentForm = 75
}) {
    // Factores base
    let teamFactor = (teamOverall / 100) * (teamForm / 100);
    let opponentFactor = (opponentOverall / 100) * (opponentForm / 100);
    
    // Ventaja de local
    if (isHome) {
        teamFactor *= 1.12; // +12%
    } else {
        opponentFactor *= 1.12;
    }
    
    // Modificadores de formación
    const teamMods = getFormationModifiers(teamFormation, teamMentality);
    const oppMods = getFormationModifiers(opponentFormation, opponentMentality);
    
    // Aplicar bonus tácticos
    const teamAttack = teamFactor * teamMods.attackBonus;
    const teamDefense = teamFactor * teamMods.defenseBonus;
    const oppAttack = opponentFactor * oppMods.attackBonus;
    const oppDefense = opponentFactor * oppMods.defenseBonus;
    
    // Cálculo de goles (ataque propio vs defensa rival)
    let teamGoalChance = teamAttack / oppDefense;
    let oppGoalChance = oppAttack / teamDefense;
    
    // Aleatoriedad controlada (±15%)
    teamGoalChance *= (0.85 + Math.random() * 0.3);
    oppGoalChance *= (0.85 + Math.random() * 0.3);
    
    // Convertir a goles (más realista: 0-5 goles típicamente)
    const teamGoals = Math.min(7, Math.max(0, Math.round(teamGoalChance * 3)));
    const oppGoals = Math.min(7, Math.max(0, Math.round(oppGoalChance * 3)));
    
    return {
        teamGoals,
        opponentGoals: oppGoals
    };
}


  
// ✅ MEJORA 6: Función playMatch mejorada
async function playMatchImproved(homeTeamName, awayTeamName, gameState) {
    let homeSquad, awaySquad;
    let homeFormation = '433', awayFormation = '433';
    let homeMentality = 'balanced', awayMentality = 'balanced';
    
    // EQUIPO LOCAL
    if (homeTeamName === gameState.team) {
        homeSquad = gameState.lineup;
        homeFormation = gameState.formation || '433';
        homeMentality = gameState.mentality || 'balanced';
    } else {
        // ✅ Generar plantilla IA realista
        homeSquad = await generateAISquad(homeTeamName, gameState.division);
        homeFormation = ['433', '442', '541'][Math.floor(Math.random() * 3)];
        homeMentality = Math.random() > 0.7 ? 'offensive' : (Math.random() > 0.5 ? 'balanced' : 'defensive');
    }
    
    // EQUIPO VISITANTE
    if (awayTeamName === gameState.team) {
        awaySquad = gameState.lineup;
        awayFormation = gameState.formation || '433';
        awayMentality = gameState.mentality || 'balanced';
    } else {
        // ✅ Generar plantilla IA realista
        awaySquad = await generateAISquad(awayTeamName, gameState.division);
        awayFormation = ['433', '442', '541'][Math.floor(Math.random() * 3)];
        awayMentality = Math.random() > 0.7 ? 'offensive' : (Math.random() > 0.5 ? 'balanced' : 'defensive');
    }
    
    // ✅ Calcular overall REAL de cada equipo
    const homeOverall = calculateTeamEffectiveOverall(homeSquad, homeFormation);
    const awayOverall = calculateTeamEffectiveOverall(awaySquad, awayFormation);
    
    // Forma promedio de los jugadores
    const homeForm = homeSquad.reduce((sum, p) => sum + (p.form || 75), 0) / homeSquad.length;
    const awayForm = awaySquad.reduce((sum, p) => sum + (p.form || 75), 0) / awaySquad.length;
    
    // ✅ Calcular resultado con el motor mejorado
    const { teamGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchOutcomeImproved({
        teamOverall: homeOverall,
        opponentOverall: awayOverall,
        teamFormation: homeFormation,
        opponentFormation: awayFormation,
        teamMentality: homeMentality,
        opponentMentality: awayMentality,
        isHome: true,
        teamForm: homeForm,
        opponentForm: awayForm
    });
    
    console.log(`🏟️ ${homeTeamName} (${homeOverall.toFixed(1)} OVR, ${homeFormation}) ${homeGoals}-${awayGoals} ${awayTeamName} (${awayOverall.toFixed(1)} OVR, ${awayFormation})`);
    
    return {
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        homeGoals,
        awayGoals,
        homeOverall,
        awayOverall,
        homeFormation,
        awayFormation
    };
}

// ✅ Exportar funciones
if (typeof window !== 'undefined') {
    window.calculateTeamEffectiveOverallImproved = calculateTeamEffectiveOverall;
    window.playMatchImproved = playMatchImproved;
    window.calculateMatchOutcomeImproved = calculateMatchOutcomeImproved;
    window.generateAISquad = generateAISquad;
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
        
        gameState.lineup.forEach(player => {
            // Incrementar partidos jugados
            player.matches++;
            
            // Actualizar forma según resultado
            if (ourGoals > rivalGoals) {
                player.form = Math.min(99, player.form + Math.floor(Math.random() * 3));
            } else if (ourGoals < rivalGoals) {
                player.form = Math.max(40, player.form - Math.floor(Math.random() * 3));
            }
            
            // Generar posibles lesiones
            generateInjury(player);
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
        satisfaction += gameState.balance / 100000;  
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
  
function endSeason() {  
    const currentDivision = gameState.division;  
    const currentSeason = gameState.currentSeason;  
    const teams = Object.entries(gameState.standings).sort((a, b) => b[1].pts - a[1].pts);  
    const myTeamRank = teams.findIndex(([name]) => name === gameState.team) + 1;  
  
    let nextDivisionKey = currentDivision;  
  
    let seasonSummary = `¡Fin de la temporada ${currentSeason}!\n`;  
  
    const promoReleConfig = PROMOTION_RELEGATION[currentDivision];  
  
    if (currentDivision.includes('rfef')) { // Aplica tanto para rfef_grupo1 como rfef_grupo2  
        const numPromote = promoReleConfig.promote;  
        const teamsInMyGroup = gameState.leagueTeams;  
        const sortedMyGroup = teams.filter(([teamName]) => teamsInMyGroup.includes(teamName));  
        const myTeamRankInGroup = sortedMyGroup.findIndex(([name]) => name === gameState.team) + 1;  
  
        if (myTeamRankInGroup <= numPromote) {  
            seasonSummary += `¡Has ascendido a Segunda División! Felicidades.\n`;  
            nextDivisionKey = 'segunda';  
        } else if (myTeamRankInGroup > (teamsInMyGroup.length - promoReleConfig.relegate)) {  
            seasonSummary += `¡Has descendido a Tercera RFEF! Es hora de reconstruir.\n`;  
            nextDivisionKey = 'rfef_grupo1'; // Por ejemplo, volver al grupo 1 (o elegir aleatoriamente si hay más grupos)  
        }  
        else {  
            seasonSummary += `Tu equipo permanece en Primera RFEF.\n`;  
        }  
            
        const promotedTeams = sortedMyGroup.slice(0, numPromote);  
        seasonSummary += `Equipos que ascienden de tu grupo a Segunda: ${promotedTeams.map(t => t[0]).join(', ')}.\n`;  
        const relegatedTeams = sortedMyGroup.slice(-promoReleConfig.relegate);  
        seasonSummary += `Equipos que descienden de tu grupo a Tercera RFEF: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
    } else if (currentDivision === 'segunda') {  
        const numPromote = promoReleConfig.promote;  
        const promotedTeams = teams.slice(0, numPromote);  
        if (myTeamRank <= numPromote) {  
            seasonSummary += `¡Has ascendido a Primera División! ¡Un logro enorme!\n`;  
            nextDivisionKey = 'primera';  
        }  
  
        const numRelegate = promoReleConfig.relegate;  
        const relegatedTeams = teams.slice(-numRelegate);  
        if (myTeamRank > teams.length - numRelegate) {  
            seasonSummary += `¡Has descendido a Primera RFEF! Es hora de reconstruir.\n`;  
            nextDivisionKey = Math.random() < 0.5 ? 'rfef_grupo1' : 'rfef_grupo2';  
        } else if (myTeamRank > numPromote) {  
            seasonSummary += `Tu equipo permanece en Segunda División.\n`;  
        }  
        seasonSummary += `Equipos que ascienden a Primera: ${promotedTeams.map(t => t[0]).join(', ')}.\n`;  
        seasonSummary += `Equipos que descienden a Primera RFEF: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
  
    } else if (currentDivision === 'primera') {  
        const numRelegate = promoReleConfig.relegate;  
        const relegatedTeams = teams.slice(-numRelegate);  
        if (myTeamRank > teams.length - numRelegate) {  
            seasonSummary += `¡Has descendido a Segunda División! A trabajar para volver.\n`;  
            nextDivisionKey = 'segunda';  
        } else {  
            seasonSummary += `Tu equipo permanece en Primera División.\n`;  
        }  
        seasonSummary += `Equipos que descienden a Segunda: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
        const topPositions = [1, 2, 3, 4, 5, 6, 7];  
        if (topPositions.slice(0, 4).includes(myTeamRank)) {  
            seasonSummary += `¡Te has clasificado para la Champions League!\n`;  
        } else if (topPositions.slice(4, 6).includes(myTeamRank)) {  
            seasonSummary += `¡Te has clasificado para la Europa League!\n`;  
        } else if (topPositions.slice(6, 7).includes(myTeamRank)) {  
            seasonSummary += `¡Te has clasificado para la Conference League!\n`;  
        }  
    }  
  
    alert(seasonSummary);  
    addNews(seasonSummary, 'info');  
    setupNewSeason(currentDivision, nextDivisionKey);  
}  
  

/*function simulateFullWeek() {  
    let myMatchResult = null;
    let forcedLoss = false;  

    // ===== PRETEMPORADA =====
    if (gameState.seasonType === 'preseason') {  
        handlePreseasonWeek();  
        gameState.week++;  
        updateWeeklyFinancials();  

        // Comprobar si termina la pretemporada
        if (gameState.week > PRESEASON_WEEKS) {  
            gameState.seasonType = 'regular';
            gameState.week = 1;
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${gameState.division}!`, 'success');
        }

        // ===== ACTUALIZAR CÍRCULO CENTRAL CON PRÓXIMO PARTIDO =====
        let nextWeek, nextOpponent;
        if (gameState.seasonType === 'preseason') {
            nextWeek = gameState.week + 1 <= PRESEASON_WEEKS ? gameState.week + 1 : PRESEASON_WEEKS;
            nextOpponent = "Rival amistoso";
        } else {
            // Ya temporada regular
            nextWeek = 1; // primera jornada
            const nextWeekMatches = gameState.seasonCalendar.filter(match => match.week === nextWeek);
            const nextMatch = nextWeekMatches.find(match =>
                match.home === gameState.team || match.away === gameState.team
            );
            nextOpponent = nextMatch ? (nextMatch.home === gameState.team ? nextMatch.away : nextMatch.home) : "—";
        }

        window.renderNextMatchInfo({
            week: nextWeek,
            team: gameState.team,
            nextOpponent: nextOpponent
        });

        return { myMatch: null, forcedLoss: false };
    }  

    // ===== VALIDAR ALINEACIÓN =====
    const preSimLineupValidation = validateLineup(gameState.lineup);  
    applyWeeklyTraining();  

    // Reducir lesiones jugadores y cantera
    gameState.squad.forEach(p => {  
        if (p.isInjured) {  
            p.weeksOut--;  
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

    if (gameState.week % 4 === 0) {  
        boardMessages();  
    }  

    // ===== PARTIDOS DE LA JORNADA ACTUAL =====
    const currentWeekMatches = gameState.seasonCalendar.filter(match => match.week === gameState.week);  
    console.log(`📅 Jornada ${gameState.week}: ${currentWeekMatches.length} partidos programados`);

    let myTeamMatch = currentWeekMatches.find(match => 
        match.home === gameState.team || match.away === gameState.team
    );  

    // ===== SIMULAR PARTIDO DEL EQUIPO =====
    if (myTeamMatch) {  
        if (!preSimLineupValidation.success) {
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
                homeGoals: homeGoals,  
                awayGoals: awayGoals,  
                score: `${homeGoals}-${awayGoals}`,  
            };  
            forcedLoss = true;  

            gameState.popularity = Math.max(0, gameState.popularity - 5);
            gameState.fanbase = Math.max(0, gameState.fanbase - 500);  

        } else {
            const result = playMatch(myTeamMatch.home, myTeamMatch.away);
            myMatchResult = {  
                home: result.homeTeam,  
                away: result.awayTeam,  
                homeGoals: result.homeGoals,  
                awayGoals: result.awayGoals,  
                score: `${result.homeGoals}-${result.awayGoals}`,  
            };

            gameState.matchHistory.push({  
                week: gameState.week,  
                home: result.homeTeam,  
                away: result.awayTeam,  
                score: `${result.homeGoals}-${result.awayGoals}`
            });
        }  
    }  

    // ===== SIMULAR RESTO DE PARTIDOS =====
    currentWeekMatches
        .filter(match => match !== myTeamMatch)
        .forEach(match => {  
            const alreadyPlayed = gameState.matchHistory.some(mh =>  
                mh.week === gameState.week &&  
                mh.home === match.home && 
                mh.away === match.away
            );
            
            if (!alreadyPlayed) {  
                const result = playMatch(match.home, match.away);
                gameState.matchHistory.push({  
                    week: gameState.week,  
                    home: result.homeTeam,  
                    away: result.awayTeam,  
                    score: `${result.homeGoals}-${result.awayGoals}`
                });
                
                console.log(`⚽ ${result.homeTeam} ${result.homeGoals}-${result.awayGoals} ${result.awayTeam}`);
            }  
        });
    
    console.log(`✅ Jornada ${gameState.week} completada - ${gameState.matchHistory.filter(m => m.week === gameState.week).length} partidos jugados`);

    // ===== ACTUALIZAR CÍRCULO CENTRAL CON PRÓXIMO PARTIDO =====
    let nextWeek, nextOpponent;
    if (gameState.seasonType === 'preseason') {
        nextWeek = gameState.week + 1 <= PRESEASON_WEEKS ? gameState.week + 1 : PRESEASON_WEEKS;
        nextOpponent = "Rival amistoso";
    } else {
        nextWeek = gameState.week + 1;
        const nextWeekMatches = gameState.seasonCalendar.filter(match => match.week === nextWeek);
        const nextMatch = nextWeekMatches.find(match =>
            match.home === gameState.team || match.away === gameState.team
        );
        nextOpponent = nextMatch ? (nextMatch.home === gameState.team ? nextMatch.away : nextMatch.home) : "—";
    }
    window.renderNextMatchInfo({
        week: nextWeek,
        team: gameState.team,
        nextOpponent: nextOpponent
    });

    // ===== FIN DE JORNADA / FINANZAS / AI / SECRETARIO =====
    gameState.week++;  
    updateWeeklyFinancials();  
    generateAIOffers();  
    checkMarketRecommendations();  

    // ===== CRISIS ECONÓMICA =====
    if (gameState.staff.segundoEntrenador && 
        (gameState.weeklyIncome - gameState.weeklyExpenses < -10000) && 
        gameState.balance < 0) {  
        addNews(`[Segundo Entrenador - ¡CRISIS!] Nuestros números están muy mal. Si esto continúa, la directiva podría tomar medidas drásticas.`, 'error');  
    }  

    // ===== GAME OVER =====
    if (gameState.balance < -100000 && gameState.week > 10) {  
        addNews(`¡Has sido despedido! La directiva ha perdido la confianza debido a la pésima gestión económica.`, 'error');  
        alert("¡GAME OVER! Has sido despedido por la directiva.");  
        resetGame();  
        return { myMatch: myMatchResult, forcedLoss: forcedLoss, gameOver: true };  
    }  

    // ===== FIN DE TEMPORADA =====
    if (gameState.week > gameState.maxSeasonWeeks) {  
        endSeason();  
    }  
        
    return { myMatch: myMatchResult, forcedLoss: forcedLoss };  
}*/

async function simulateFullWeek() {  
    let myMatchResult = null;
    let forcedLoss = false;  

    // ===== PRETEMPORADA =====
    if (gameState.seasonType === 'preseason') {  
        handlePreseasonWeek();  
        gameState.week++;  
        updateWeeklyFinancials();  

        if (gameState.week > PRESEASON_WEEKS) {  
            gameState.seasonType = 'regular';  
            gameState.week = 1;  
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${gameState.division}!`, 'success');  
        }  

        window.updateNextMatchInfo();
        return { myMatch: null, forcedLoss: false };
    }  

    // ===== VALIDAR ALINEACIÓN =====
    const preSimLineupValidation = validateLineup(gameState.lineup);  
    applyWeeklyTraining();  

    // Reducir lesiones
    gameState.squad.forEach(p => {  
        if (p.isInjured) {  
            p.weeksOut--;  
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
        endSeason();
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
  
function generateStaffCandidates(role, forceNew = false) {  
    if (currentStaffCandidates[role] && !forceNew) {  
        return currentStaffCandidates[role];  
    }  
  
    const candidates = [];  
    const roleConfig = STAFF_ROLES[role];  
    const staffNames = ["Juan", "Pedro", "María", "Carlos", "Ana", "Luis", "Sofía", "Pablo", "Laura", "Diego", "Miguel", "Sergio", "Elena", "Ricardo", "Carmen", "Javier"];  
  
    const divisionForMultiplier = gameState.division.includes('rfef') ? 'rfef_grupo1' : gameState.division;  
    const divisionFactor = DIVISION_MULTIPLIERS[divisionForMultiplier] || 1;  
  
    for (let i = 0; i < 3; i++) {  
        const level = 1 + Math.floor(Math.random() * 5); // Nivel 1 a 5  
        const salary = Math.floor(roleConfig.minSalary + (roleConfig.maxSalary - roleConfig.minSalary) * (level / 5));  
        const name = staffNames[Math.floor(Math.random() * staffNames.length)] + " " + staffNames[Math.floor(Math.random() * staffNames.length)];  
  
        let clausula = Math.floor(roleConfig.baseClausula * level * roleConfig.levelCostMultiplier * divisionFactor * (0.8 + Math.random() * 0.4));  
  
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
    return candidates;  
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
    gameState.staff[candidate.role] = candidate;  
    currentStaffCandidates[candidate.role] = null;  
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
    // ✅ FILTRAR: solo jugadores propios (owned) que estén en venta/cesión
    const playersForSale = gameState.squad.filter(p => 
        (p.transferListed || p.loanListed) && 
        p.contractType === 'owned'
    );
    
    if (playersForSale.length === 0) return;
    
    playersForSale.forEach(player => {
        // Aumentar probabilidad según tiempo en mercado
        let offerChance = 0.7;
        
        if (player.weeksOnMarket >= 2) offerChance = 0.9; // 90% si lleva 2+ semanas
        if (player.weeksOnMarket >= 4) offerChance = 1.0; // 100% si lleva 4+ semanas
        
        if (Math.random() < offerChance) {
            generateOfferForPlayer(player);
        }
    });
}



// Generar oferta específica para un jugador
function generateOfferForPlayer(player) {
    // Seleccionar club oferente aleatorio
    const allClubs = [
        ...TEAMS_DATA.primera,
        ...TEAMS_DATA.segunda,
        ...TEAMS_DATA.rfef_grupo1,
        ...TEAMS_DATA.rfef_grupo2
    ].filter(club => club !== gameState.team);
    
    const offeringClub = allClubs[Math.floor(Math.random() * allClubs.length)];
    
    let offer = {};
    
    if (player.transferListed) {
        // Oferta de COMPRA
        // La IA ofrece entre 70% y 110% del precio solicitado
        const offerPercentage = 0.7 + Math.random() * 0.4; // 70% - 110%
        const offerAmount = Math.round(player.askingPrice * offerPercentage);
        
        offer = {
            type: 'transfer',
            player: player,
            club: offeringClub,
            amount: offerAmount,
            originalAskingPrice: player.askingPrice,
            timestamp: Date.now()
        };
        
        // Noticia
        addNews(
            `📨 ¡Oferta recibida! ${offeringClub} ofrece ${offerAmount.toLocaleString('es-ES')}€ por ${player.name} (pedías ${player.askingPrice.toLocaleString('es-ES')}€)`,
            offerAmount >= player.askingPrice ? 'success' : 'info'
        );
        
    } else if (player.loanListed) {
        // Oferta de CESIÓN
        // La IA asume entre 30% y 70% del salario
        const wagePercentage = 0.3 + Math.random() * 0.4; // 30% - 70%
        const wageContribution = Math.round(player.salary * wagePercentage);
        
        offer = {
            type: 'loan',
            player: player,
            club: offeringClub,
            wageContribution: wageContribution,
            totalSalary: player.salary,
            timestamp: Date.now()
        };
        
        // Noticia
        addNews(
            `📨 ¡Oferta de cesión! ${offeringClub} quiere ceder a ${player.name} y asumiría ${wageContribution.toLocaleString('es-ES')}€/sem de su salario (${Math.round(wagePercentage * 100)}%)`,
            'info'
        );
    }
    
    // Guardar oferta en el estado
    if (!gameState.pendingOffers) gameState.pendingOffers = [];
    gameState.pendingOffers.push(offer);
    
    // Abrir modal de ofertas
    showOffersModal();
}

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
    
    if (offer.type === 'transfer') {
        // Venta
        gameState.balance += offer.amount;
        gameState.playerSalesIncome = (gameState.playerSalesIncome || 0) + offer.amount;
        
        // Eliminar jugador de plantilla
        const playerIndex = gameState.squad.findIndex(p => p.name === offer.player.name);
        if (playerIndex !== -1) {
            gameState.squad.splice(playerIndex, 1);
        }
        
        addNews(
            `✅ ¡Venta cerrada! Has vendido a ${offer.player.name} al ${offer.club} por ${offer.amount.toLocaleString('es-ES')}€`,
            'success'
        );
        
    } else if (offer.type === 'loan') {
        // Cesión
        const player = gameState.squad.find(p => p.name === offer.player.name);
        if (player) {
            player.contractType = 'loaned_out';
            player.loanedTo = offer.club; // ✅ Corregido: loanedTo en lugar de loanedToClub
            player.originalSalary = player.salary;
            player.salary = player.salary - offer.wageContribution;
        }
        
        addNews(
            `✅ ¡Cesión cerrada! Has cedido a ${offer.player.name} al ${offer.club}. Asumen ${offer.wageContribution.toLocaleString('es-ES')}€/sem del salario`,
            'success'
        );
    }
    
    // Eliminar oferta
    gameState.pendingOffers.splice(offerIndex, 1);
    
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
    
    // 50% probabilidad de que acepten si es razonable
    const isReasonable = counter <= offer.amount * 1.2;
    const accepted = isReasonable && Math.random() < 0.5;
    
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
    getSeasonCalendar  
}; 

// ✅ Exponer funciones de ofertas globalmente
if (typeof window !== 'undefined') {
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

/*// ---------------------------------------------------
// FUNCIÓN PARA ACTUALIZAR EL CÍRCULO CENTRAL
// ---------------------------------------------------
window.renderNextMatchInfo = function(state) {
    if (!state) return;

    const dateEl = document.getElementById('nextMatchDate'); 
    const teamsEl = document.getElementById('nextMatchTeams');

    if (!dateEl || !teamsEl) return;

    let nextWeek = state.week;
    let nextOpponent = state.nextOpponent;

    // Si estamos en pretemporada, mostrar "Rival amistoso"
    if (gameState.seasonType === 'preseason') {
        nextOpponent = "Rival amistoso";
    }

    // Actualizar jornada y equipos
    dateEl.textContent = `Jornada ${nextWeek}`;
    teamsEl.textContent = `${state.team}\nvs\n${nextOpponent}`;
};

// ---------------------------------------------------
// FUNCIÓN AUXILIAR: calcular el próximo partido
// ---------------------------------------------------
window.updateNextMatchInfo = function() {
    let nextWeek = gameState.week; // siempre la próxima jornada a jugar
    let nextOpponent = "—";

    if (gameState.seasonType === 'preseason') {
        nextOpponent = "Rival amistoso";
    } else {
        const nextWeekMatches = gameState.seasonCalendar.filter(match => match.week === nextWeek);
        const nextMatch = nextWeekMatches.find(match => match.home === gameState.team || match.away === gameState.team);
        if (nextMatch) {
            nextOpponent = nextMatch.home === gameState.team ? nextMatch.away : nextMatch.home;
        }
    }

    window.renderNextMatchInfo({
        week: nextWeek,
        team: gameState.team,
        nextOpponent: nextOpponent
    });
};*/

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
