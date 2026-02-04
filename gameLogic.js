// gameLogic.js - Lógica central del juego  
import {  
    TEAMS_DATA, ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS,  
    STAFF_ROLES, STAFF_LEVEL_EFFECTS, DIVISION_MULTIPLIERS,  
    BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS,  
    FORMATIONS, PRESEASON_WEEKS, PROMOTION_RELEGATION  
} from './config.js';  
import { getPlayerMarket as getPlayerMarketData, getYoungsterMarket as getYoungsterMarketData, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall, generateRandomName } from './players.js';  
import { getTeamData, saveTeamData } from './teamData.js';


// Estado global del juego  
const gameState = {  
    team: null, 
    teamLogo: null,
    stadiumImage: null,
    stadiumName: 'Estadio',
    week: 1,  
    division: 'Primera',
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
    seasonCalendar: [],
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
    if (type !== 'system' && !read) {
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
  
function generateLeagueCalendar(teams) {  
    const numTeams = teams.length;  
    if (numTeams < 2) return [];  
  
    let schedule = [];  
    let tempTeams = [...teams];  
  
    if (numTeams % 2 !== 0) {  
        tempTeams.push("BYE");  
    }  
    const numActualTeams = tempTeams.length;  
    const numRounds = numActualTeams - 1;
  
    for (let round = 0; round < numRounds; round++) {  
        for (let i = 0; i < numActualTeams / 2; i++) {  
            const homeTeam = tempTeams[i];  
            const awayTeam = tempTeams[numActualTeams - 1 - i];  
  
            if (homeTeam !== "BYE" && awayTeam !== "BYE") {  
                schedule.push({ home: homeTeam, away: awayTeam, week: round + 1, homeGoals: null, awayGoals: null });  
            }  
        }  
  
        const lastTeam = tempTeams.pop();  
        tempTeams.splice(1, 0, lastTeam);  
    }  
  
    const secondHalfSchedule = schedule.map(match => ({  
        home: match.away,  
        away: match.home,  
        week: match.week + numRounds,
        homeGoals: null,  
        awayGoals: null  
    }));  
  
    const fullSchedule = [...schedule, ...secondHalfSchedule];  
    fullSchedule.sort((a, b) => a.week - b.week);
  
    return fullSchedule;  
}  
  
  
function generateInitialSquad() {  
    const squad = [];  
    const allAvailablePlayers = initPlayerDatabase();
  
    const elitePlayersNames = ['Griezmann', 'Koke', 'Oblak', 'Nahuel Molina', 'José Giménez', 'Samuel Lino', 'Álvaro Morata', 'Reinildo Mandava', 'Marcos Llorente', 'Pablo Barrios', 'Axel Witsel'];  
    if (gameState.team === 'Atlético Madrid') {  
        elitePlayersNames.forEach(name => {  
            const p = allAvailablePlayers.find(ep => ep.name === name);  
            if (p && !squad.some(s => s.name === p.name)) {
                squad.push({ 
                    ...p, 
                    club: gameState.team, 
                    isInjured: false, 
                    weeksOut: 0, 
                    matches: 0, 
                    form: 70 + Math.floor(Math.random() * 20),
                    // 🆕 CAMPOS DE TARJETAS
                    yellowCards: 0,
                    redCards: 0,
                    isSuspended: false,
                    suspensionWeeks: 0
                });  
            }  
        });  
    }  
  
    while (squad.length < 18) {
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
        const player = {  
            name: generateRandomName(),  
            age: 18 + Math.floor(Math.random() * 10),  
            position: pos,  
            foot: Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro'),  
            matches: 0,  
            form: 60 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,
            // 🆕 CAMPOS DE TARJETAS
            yellowCards: 0,
            redCards: 0,
            isSuspended: false,
            suspensionWeeks: 0,
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 40 + Math.floor(Math.random() * 30);
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000);  
        player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5);  
        squad.push({ ...player, club: gameState.team });  
    }  
  
    squad.sort((a,b) => b.overall - a.overall);  
    gameState.lineup = squad.slice(0, 11);
    return squad;  
}  
  
function generateInitialAcademy() {  
    const academy = [];  
    for (let i = 0; i < 5; i++) {  
        const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
        const player = {  
            name: generateRandomName(),  
            age: 16 + Math.floor(Math.random() * 2),  
            position: pos,  
            foot: Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro'),  
            matches: 0,  
            form: 50 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,
            // 🆕 CAMPOS DE TARJETAS (cantera también)
            yellowCards: 0,
            redCards: 0,
            isSuspended: false,
            suspensionWeeks: 0,
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
        
        // 🆕 RESETEAR TARJETAS AL INICIO DE TEMPORADA
        p.yellowCards = 0;
        p.redCards = 0;
        p.isSuspended = false;
        p.suspensionWeeks = 0;

        const stage = getAgeStage(p.age);

        if (stage === 'decline_soft' || stage === 'decline_hard') {
            const physicalAttrs = ['VE', 'AG', 'RE'];
            physicalAttrs.forEach(attr => {
                if (p[attr] > 40 && Math.random() < (stage === 'decline_hard' ? 0.8 : 0.5)) {
                    p[attr]--;
                }
            });
        }

        if (stage === 'decline_hard') {
            ['VI', 'PA', 'CO'].forEach(attr => {
                if (p[attr] > 50 && Math.random() < 0.2) {
                    p[attr]--;
                }
            });
        }

        p.overall = calculatePlayerOverall(p);

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
        // 🆕 RESETEAR TARJETAS CANTERA
        p.yellowCards = 0;
        p.redCards = 0;
        p.isSuspended = false;
        p.suspensionWeeks = 0;
    });  
  
    const availablePlayers = gameState.squad
        .filter(p => !p.isInjured && !p.isSuspended) // 🆕 TAMBIÉN FILTRAR SANCIONADOS
        .sort((a, b) => b.overall - a.overall);  

    setLineup(availablePlayers.slice(0, 11));  
}
 
  
async function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
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

    gameState.squad = generateInitialSquad();
    gameState.academy = generateInitialAcademy();

    if (window.getTeamData) {
        const teamData = await window.getTeamData(teamName);

        gameState.teamLogo = teamData.logo || null;
        gameState.stadiumImage = teamData.stadiumImage || null;
        gameState.stadiumName = teamData.stadiumName || (teamName + ' Stadium');
        gameState.stadiumCapacity = teamData.stadiumCapacity || 10000;
        gameState.balance = teamData.initialBudget || gameState.balance;
    }

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
    // 🆕 INICIALIZAR TARJETAS EN NUEVOS FICHAJES
    newPlayer.yellowCards = newPlayer.yellowCards || 0;
    newPlayer.redCards = newPlayer.redCards || 0;
    newPlayer.isSuspended = newPlayer.isSuspended || false;
    newPlayer.suspensionWeeks = newPlayer.suspensionWeeks || 0;
  
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
    // 🆕 INICIALIZAR TARJETAS
    newYoungster.yellowCards = 0;
    newYoungster.redCards = 0;
    newYoungster.isSuspended = false;
    newYoungster.suspensionWeeks = 0;
  
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
    // 🆕 MANTENER TARJETAS AL ASCENDER
    promotedPlayer.yellowCards = promotedPlayer.yellowCards || 0;
    promotedPlayer.redCards = promotedPlayer.redCards || 0;
    promotedPlayer.isSuspended = promotedPlayer.isSuspended || false;
    promotedPlayer.suspensionWeeks = promotedPlayer.suspensionWeeks || 0;
  
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
        gameState.negotiationStep = 2;  
        return { success: true, message: `${player.name} ha aceptado tu oferta personal. Ahora a negociar con su club, el ${player.club}.` };  
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
  
  
const calculateTeamEffectiveOverall = (teamSquad) => {  
    const availablePlayers = teamSquad.filter(p => !p.isInjured);  
    if (availablePlayers.length === 0) return 40;  
    return availablePlayers.reduce((sum, p) => sum + p.overall, 0) / availablePlayers.length;  
};  
  
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

// 🆕 FUNCIÓN PARA GENERAR TARJETAS
function generateCards(player) {
    const baseCardProb = 0.18; // 18% probabilidad base de tarjeta
    let cardProb = baseCardProb;
    
    // Jugadores más agresivos (bajo DF, alto AT) tienen más probabilidad
    if (player.DF < 60) cardProb *= 1.3;
    if (player.AT > 80) cardProb *= 1.2;
    
    // Mentalidad ofensiva = más tarjetas
    if (gameState.mentality === 'offensive') cardProb *= 1.15;
    
    if (Math.random() < cardProb) {
        const isRed = Math.random() < 0.08; // 8% de que sea roja directa
        
        if (isRed) {
            player.redCards++;
            player.isSuspended = true;
            player.suspensionWeeks = 1; // 1 partido de sanción por roja
            addNews(`🟥 ¡${player.name} ha visto tarjeta ROJA! Sancionado 1 partido.`, 'error');
            return 'red';
        } else {
            player.yellowCards++;
            addNews(`🟨 ${player.name} ha visto tarjeta amarilla.`, 'warning');
            
            // Ciclo de 5 amarillas = sanción
            if (player.yellowCards >= 5) {
                player.isSuspended = true;
                player.suspensionWeeks = 1;
                player.yellowCards = 0; // Reset tras sanción
                addNews(`⚠️ ${player.name} sancionado por acumulación de 5 amarillas. Descansa 1 partido.`, 'warning');
                return 'yellow-suspension';
            }
            return 'yellow';
        }
    }
    return null;
}
  
function calculateMatchOutcome({ teamOverall, opponentOverall, mentality = 'balanced', isHome = true, teamForm = 75, opponentForm = 75 }) {
    let teamFactor = teamOverall / 100 * (teamForm / 100);
    let opponentFactor = opponentOverall / 100 * (opponentForm / 100);

    if (isHome) teamFactor *= 1.1;
    else opponentFactor *= 1.1;

    switch (mentality) {
        case 'offensive':
            teamFactor *= 1.15;
            opponentFactor *= 0.9;
            break;
        case 'defensive':
            teamFactor *= 0.9;
            opponentFactor *= 1.1;
            break;
        case 'balanced':
        default:
            break;
    }

    const randomModTeam = (Math.random() - 0.5) * 0.2;
    const randomModOpp = (Math.random() - 0.5) * 0.2;

    teamFactor += randomModTeam;
    opponentFactor += randomModOpp;

    teamFactor = Math.max(0.1, teamFactor);
    opponentFactor = Math.max(0.1, opponentFactor);

    const teamGoals = Math.round(teamFactor * (Math.random() * 4 + 1));
    const opponentGoals = Math.round(opponentFactor * (Math.random() * 4 + 1));

    return {
        teamGoals: Math.max(0, teamGoals),
        opponentGoals: Math.max(0, opponentGoals)
    };
}


  
function playMatch(homeTeamName, awayTeamName) {
    let homeTeamOverall = 70 + Math.floor(Math.random() * 20);
    let awayTeamOverall = 70 + Math.floor(Math.random() * 20);

    let homeForm = 75;
    let awayForm = 75;
    let homeMentality = 'balanced';
    let awayMentality = 'balanced';

    if (homeTeamName === gameState.team) {
        homeTeamOverall = calculateTeamEffectiveOverall(gameState.lineup);
        homeMentality = gameState.mentality;
    }
    if (awayTeamName === gameState.team) {
        awayTeamOverall = calculateTeamEffectiveOverall(gameState.lineup);
        awayMentality = gameState.mentality;
    }

    const { teamGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchOutcome({
        teamOverall: homeTeamOverall,
        opponentOverall: awayTeamOverall,
        mentality: homeMentality,
        isHome: true,
        teamForm: homeForm,
        opponentForm: awayForm
    });

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
    updateStats(homeTeamName, homeGoals, awayGoals);
    updateStats(awayTeamName, awayGoals, homeGoals);

    // 🆕 GENERAR TARJETAS Y LESIONES PARA MI EQUIPO
    if (homeTeamName === gameState.team || awayTeamName === gameState.team) {
        gameState.lineup.forEach(player => {
            if (player && !player.isInjured) {
                // Generar tarjetas
                generateCards(player);
                // 🔧 GENERAR LESIONES
                generateInjury(player);
            }
        });
        
        addNews(`Partido: ${homeTeamName} ${homeGoals} - ${awayGoals} ${awayTeamName}`, 'info');
    }

    return { homeTeam: homeTeamName, awayTeam: awayTeamName, homeGoals, awayGoals };
}


  
function secondCoachAdvice() {  
    if (!gameState.staff.segundoEntrenador) return;  
  
    const currentLineup = gameState.lineup;  
    const availableSquad = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
  
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
  
    // 🆕 AVISOS SOBRE TARJETAS Y SANCIONES
    const playersWithYellows = gameState.squad.filter(p => p.yellowCards >= 4);
    if (playersWithYellows.length > 0) {
        playersWithYellows.forEach(p => {
            addNews(`[Segundo Entrenador - ATENCIÓN] ${p.name} tiene ${p.yellowCards} amarillas. ¡Una más y será sancionado!`, 'warning');
        });
    }
    
    const suspendedPlayers = currentLineup.filter(p => p.isSuspended);
    if (suspendedPlayers.length > 0) {
        suspendedPlayers.forEach(p => {
            addNews(`[Segundo Entrenador - CRÍTICO] ¡${p.name} está SANCIONADO y no puede jugar! Retíralo de la alineación.`, 'error');
        });
    }
    
    const lineupValidation = validateLineup(currentLineup);  
    if (!lineupValidation.success) {
        addNews(`[Segundo Entrenador - ALINEACIÓN CRÍTICA] Tu alineación es INVÁLIDA: ${lineupValidation.message}. Por favor, corrígela.`, 'error');  
    }  
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
  
    if (currentDivision.includes('rfef')) {
        const numPromote = promoReleConfig.promote;  
        const teamsInMyGroup = gameState.leagueTeams;  
        const sortedMyGroup = teams.filter(([teamName]) => teamsInMyGroup.includes(teamName));  
        const myTeamRankInGroup = sortedMyGroup.findIndex(([name]) => name === gameState.team) + 1;  
  
        if (myTeamRankInGroup <= numPromote) {  
            seasonSummary += `¡Has ascendido a Segunda División! Felicidades.\n`;  
            nextDivisionKey = 'segunda';  
        } else if (myTeamRankInGroup > (teamsInMyGroup.length - promoReleConfig.relegate)) {  
            seasonSummary += `¡Has descendido a Tercera RFEF! Es hora de reconstruir.\n`;  
            nextDivisionKey = 'rfef_grupo1';
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
  
function simulateFullWeek() {
    let myMatchResult = null;
    let forcedLoss = false;

    // 🔹 SEMANA DE PRETEMPORADA
    if (gameState.seasonType === 'preseason') {
        handlePreseasonWeek();
        gameState.week++;
        updateWeeklyFinancials();
        if (gameState.week > PRESEASON_WEEKS) {
            gameState.seasonType = 'regular';
            gameState.week = 1;
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${gameState.division}!`, 'success');
        }
        return { myMatch: null, forcedLoss: false };
    }

    // 🔹 VALIDACIÓN DE ALINEACIÓN ANTES DE SIMULAR
    const preSimLineupValidation = validateLineup(gameState.lineup);
    if (!preSimLineupValidation.success) {
        addNews(`[ALINEACIÓN INVÁLIDA] ${preSimLineupValidation.message}`, 'error');

        // ❌ Detener la simulación: no avanzar semana ni jugar partidos
        return { myMatch: null, forcedLoss: false, error: true, message: 'Corrige la alineación antes de jugar la jornada.' };
    }

    // 🔹 A partir de aquí, la alineación es válida, se puede simular la jornada
    applyWeeklyTraining();

    // 🔹 Reducir sanciones y lesiones del primer equipo
    gameState.squad.forEach(p => {
        if (p.isInjured) {
            p.weeksOut--;
            if (p.weeksOut <= 0) {
                p.isInjured = false;
                p.weeksOut = 0;
                addNews(`¡${p.name} se ha recuperado de su lesión!`, 'info');
            }
        }
        if (p.isSuspended) {
            p.suspensionWeeks--;
            if (p.suspensionWeeks <= 0) {
                p.isSuspended = false;
                p.suspensionWeeks = 0;
                addNews(`✅ ${p.name} ha cumplido su sanción y puede volver a jugar.`, 'success');
            }
        }
    });

    // 🔹 Reducir sanciones y lesiones de la cantera
    gameState.academy.forEach(y => {
        if (y.isInjured) {
            y.weeksOut--;
            if (y.weeksOut <= 0) {
                y.isInjured = false;
                y.weeksOut = 0;
                addNews(`¡${y.name} (cantera) se ha recuperado de su lesión!`, 'info');
            }
        }
        if (y.isSuspended) {
            y.suspensionWeeks--;
            if (y.suspensionWeeks <= 0) {
                y.isSuspended = false;
                y.suspensionWeeks = 0;
            }
        }
    });

    // 🔹 Consejo del segundo entrenador
    secondCoachAdvice();

    // 🔹 Mensajes de la directiva cada 4 semanas
    if (gameState.week % 4 === 0) {
        boardMessages();
    }

    // 🔹 Simulación de partidos de la semana
    const currentWeekMatches = gameState.seasonCalendar.filter(match => match.week === gameState.week);
    console.log(`📅 Jornada ${gameState.week}: ${currentWeekMatches.length} partidos programados`);

    let myTeamMatch = currentWeekMatches.find(match =>
        match.home === gameState.team || match.away === gameState.team
    );

    if (myTeamMatch) {
        // ✅ Simular solo si la alineación es válida (ya lo es)
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

    // 🔹 Simular partidos de otros equipos
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

    // 🔹 Avanzar semana y actualizar finanzas
    gameState.week++;
    updateWeeklyFinancials();

    // 🔹 Alertas del segundo entrenador por mala economía
    if (gameState.staff.segundoEntrenador &&
        (gameState.weeklyIncome - gameState.weeklyExpenses < -10000) &&
        gameState.balance < 0) {
        addNews(`[Segundo Entrenador - ¡CRISIS!] Nuestros números están muy mal. Si esto continúa, la directiva podría tomar medidas drásticas.`, 'error');
    }

    // 🔹 Despido por balance negativo
    if (gameState.balance < -100000 && gameState.week > 10) {
        addNews(`¡Has sido despedido! La directiva ha perdido la confianza debido a la pésima gestión económica.`, 'error');
        alert("¡GAME OVER! Has sido despedido por la directiva.");
        resetGame();
        return { myMatch: myMatchResult, forcedLoss: forcedLoss, gameOver: true };
    }

    // 🔹 Fin de temporada
    if (gameState.week > gameState.maxSeasonWeeks) {
        endSeason();
    }

    return { myMatch: myMatchResult, forcedLoss: forcedLoss };
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
  
    if (gameState.team) {  
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
        const level = 1 + Math.floor(Math.random() * 5);
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
    if (newLineup.length > 11) {  
        console.warn("Intentando establecer una alineación con más de 11 jugadores. Se truncará.");  
        newLineup = newLineup.slice(0, 11);  
    }  
          
    if (newLineup.length < 11) {  
        const availableSquadPlayers = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
        const currentLineupNames = new Set(newLineup.map(p => p.name));  
        const playersToFill = availableSquadPlayers  
                                .filter(p => !currentLineupNames.has(p.name))  
                                .sort((a,b) => b.overall - a.overall)  
                                .slice(0, 11 - newLineup.length);  
              
        gameState.lineup = [...newLineup, ...playersToFill];  
        if (gameState.lineup.length > 11) {  
            gameState.lineup = gameState.lineup.slice(0, 11);  
        }  
    } else {  
        gameState.lineup = newLineup;  
    }  
  
    const validPlayers = gameState.lineup.every(p => gameState.squad.some(s => s.name === p.name));  
    if (!validPlayers) {  
        console.warn("Jugadores en la alineación no encontrados en la plantilla. Reconstruyendo alineación.");  
        const currentSquadNames = new Set(gameState.squad.map(p => p.name));  
        const filteredLineup = gameState.lineup.filter(p => currentSquadNames.has(p.name));  
        gameState.lineup = filteredLineup;  
        if (gameState.lineup.length < 11) {  
            const availableSquadPlayers = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
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
  
    const availablePlayers = gameState.squad.filter(p => !p.isInjured && !p.isSuspended); // 🆕 FILTRAR SANCIONADOS
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
            // 🆕 VALIDAR SANCIONES
            if (fullPlayer && fullPlayer.isSuspended) {
                return { success: false, message: `¡Error! ${player.name} está SANCIONADO y no puede jugar.` };
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
    localStorage.setItem('pcfutbol-save', JSON.stringify(gameState));  
    return { success: true, message: 'Partida guardada en el dispositivo.' };  
}  
  
function loadFromLocalStorage() {  
    const saved = localStorage.getItem('pcfutbol-save');  
    if (saved) {  
        const loadedState = JSON.parse(saved);  
        Object.assign(gameState, loadedState);  
        Object.keys(STAFF_ROLES).forEach(role => {  
            if (gameState.staff[role] === undefined) gameState.staff[role] = null;  
        });  
        if (!gameState.newsFeed) gameState.newsFeed = [];  
        if (!gameState.unreadNewsCount) gameState.unreadNewsCount = 0;  
        if (!gameState.trainingFocus) gameState.trainingFocus = { playerIndex: -1, attribute: null };  
        
        // 🆕 MIGRACIÓN: Añadir campos de tarjetas a partidas antiguas
        gameState.squad.forEach(p => {
            if (p.yellowCards === undefined) p.yellowCards = 0;
            if (p.redCards === undefined) p.redCards = 0;
            if (p.isSuspended === undefined) p.isSuspended = false;
            if (p.suspensionWeeks === undefined) p.suspensionWeeks = 0;
        });
        
        gameState.academy.forEach(y => {
            if (y.yellowCards === undefined) y.yellowCards = 0;
            if (y.redCards === undefined) y.redCards = 0;
            if (y.isSuspended === undefined) y.isSuspended = false;
            if (y.suspensionWeeks === undefined) y.suspensionWeeks = 0;
        });
              
        if (!gameState.lineup || gameState.lineup.length === 0) {  
            gameState.lineup = gameState.squad.slice(0, 11);  
        } else if (gameState.lineup.length < 11) {  
            setLineup(gameState.lineup);
        }  
              
        if (!gameState.currentSeason) gameState.currentSeason = '2025/2026';  
        if (!gameState.seasonType) gameState.seasonType = 'preseason';  
        if (!gameState.leagueTeams || gameState.leagueTeams.length === 0) {  
            const divisionKey = gameState.division;  
            let teamsInDivision = TEAMS_DATA[divisionKey];  
            if (!teamsInDivision) {
                console.warn(`División "${divisionKey}" no encontrada al cargar. Usando 'primera' por defecto.`);  
                teamsInDivision = TEAMS_DATA.primera;  
                gameState.division = 'primera';
            }  
      
            if (!teamsInDivision.includes(gameState.team)) {  
                teamsInDivision.push(gameState.team);  
            }  
            gameState.leagueTeams = teamsInDivision;  
        }  
        if (!gameState.seasonCalendar || gameState.seasonCalendar.length === 0) {  
            console.log("Generando calendario al cargar partida.");  
            gameState.seasonCalendar = generateLeagueCalendar(gameState.leagueTeams);  
        }  
        if (!gameState.maxSeasonWeeks || gameState.maxSeasonWeeks === 0) {  
            gameState.maxSeasonWeeks = gameState.leagueTeams.length * 2 - 2;  
        }  
    
        if (!gameState.nextOpponent) gameState.nextOpponent = null;  
        if (!gameState.nextOpponent && gameState.seasonCalendar.length > 0 && gameState.week <= gameState.maxSeasonWeeks) {  
            const matchesForCurrentWeek = gameState.seasonCalendar.filter(match => match.week === gameState.week);  
            const myMatch = matchesForCurrentWeek.find(match => match.home === gameState.team || match.away === gameState.team);  
            if (myMatch) {  
                gameState.nextOpponent = (myMatch.home === gameState.team) ? myMatch.away : myMatch.home;  
            } else {  
                gameState.nextOpponent = "No hay oponente";
            }  
        }  
            
        updateWeeklyFinancials();  
        return { success: true, message: 'Partida cargada.' };  
    }  
    return { success: false, message: 'No hay partida guardada en el dispositivo.' };  
}  
  
function resetGame() {  
    localStorage.removeItem('pcfutbol-save');  
    initPlayerDatabase();  
    initYoungsterDatabase();  
    window.location.reload();  
}  
  
function getSeasonCalendar() {  
    return gameState.seasonCalendar;  
}  
      
export {  
    getGameState,  
    updateGameState,  
    selectTeamWithInitialSquad,  
    simulateFullWeek,  
    playMatch,  
    signPlayer,  
    signYoungster,  
    promoteYoungster,  
    sellPlayer,  
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
    // 🆕 EXPORTAR LAS FUNCIONES CRÍTICAS
    generateCards,
    generateInjury
};  

if (typeof window !== 'undefined') {
    window.gameLogic = {
        getGameState,
        updateGameState,
        selectTeamWithInitialSquad,
        simulateFullWeek,
        playMatch,
        validateLineup,
        setLineup,
        getLineup,
        getReservePlayers,
        addNews,
        markNewsAsRead,
        // 🆕 EXPONER TAMBIÉN EN WINDOW
        generateCards,
        generateInjury
    };
}
function getAgeModifier(age) {
    if (age <= 20) return 1.5;
    if (age <= 24) return 1.2;
    if (age <= 27) return 1.0;
    if (age <= 30) return 0.7;
    if (age <= 33) return 0.3;
    return -0.5;
}
