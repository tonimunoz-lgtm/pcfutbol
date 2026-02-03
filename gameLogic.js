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
  
// NEW: Función para generar el calendario de la liga (Round-robin)  
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
}  
  
  
function generateInitialSquad() {  
    const squad = [];  
    const allAvailablePlayers = initPlayerDatabase(); // Obtener la lista completa de jugadores generados  
  
    // Intentar añadir jugadores específicos del Atlético de Madrid si ese es el equipo  
    // Esto se haría idealmente después de seleccionar el equipo, pero para el ejemplo inicial  
    // si el equipo elegido es "Atlético Madrid", podemos hacer una simulación aquí.  
    const elitePlayersNames = ['Griezmann', 'Koke', 'Oblak', 'Nahuel Molina', 'José Giménez', 'Samuel Lino', 'Álvaro Morata', 'Reinildo Mandava', 'Marcos Llorente', 'Pablo Barrios', 'Axel Witsel'];  
    if (gameState.team === 'Atlético Madrid') {  
        elitePlayersNames.forEach(name => {  
            const p = allAvailablePlayers.find(ep => ep.name === name);  
            if (p && !squad.some(s => s.name === p.name)) { // Evitar duplicados  
                squad.push({ ...p, club: gameState.team, isInjured: false, weeksOut: 0, matches: 0, form: 70 + Math.floor(Math.random() * 20) });  
            }  
        });  
    }  
  
    // Rellenar hasta 18 jugadores con jugadores aleatorios si es necesario  
    while (squad.length < 18) { // 11 titulares + 7 suplentes para empezar  
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
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 40 + Math.floor(Math.random() * 30); // Atributos entre 40 y 70  
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
    gameState.lineup = squad.slice(0, 11); // Los 11 mejores por defecto  
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
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 30 + Math.floor(Math.random() * 20); // Atributos entre 30 y 50  
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
  
function setupNewSeason(prevSeasonDivision, nextDivisionKey) {  
    const nextSeasonYear = parseInt(gameState.currentSeason.split('/')[0]) + 1;  
    const newSeasonName = `${nextSeasonYear}/${nextSeasonYear + 1}`;  
  
    gameState.week = 1;  
    gameState.matchHistory = []; // Limpiar historial de partidos  
    gameState.standings = {}; // Reiniciar clasificación  
    gameState.newsFeed = []; // Limpiar noticias  
    gameState.unreadNewsCount = 0;  
    gameState.seasonType = 'preseason';  
    gameState.currentSeason = newSeasonName;  
    gameState.division = nextDivisionKey; // Usar la clave exacta de la división  
  
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
  
    // NEW: Generar el calendario para la nueva temporada  
    gameState.seasonCalendar = generateLeagueCalendar(teamsInNewDivision);  
    gameState.maxSeasonWeeks = teamsInNewDivision.length * 2 - 2; // Actualizar el máximo de semanas  
  
    addNews(`¡Comienza la ${newSeasonName} en ${gameState.division}! Es tiempo de pretemporada.`, 'success');  
    initPlayerDatabase();  
    initYoungsterDatabase();  
          
    gameState.squad.forEach(p => {       
        p.age++;       
        p.matches = 0;       
        p.form = 70 + Math.floor(Math.random()*20);       
        p.isInjured = false;       
        p.weeksOut = 0;      
        if (p.age > 35 && Math.random() < 0.2) {      
            addNews(`${p.name} se ha retirado del fútbol.`, 'info');      
            gameState.squad = gameState.squad.filter(player => player.name !== p.name);      
        }      
    });      
    gameState.academy.forEach(p => {       
        p.age++;       
        p.matches = 0;       
        p.form = 60 + Math.floor(Math.random()*20);       
        p.isInjured = false;       
        p.weeksOut = 0;       
    });      
  
    // Reestablecer alineación por defecto con los mejores jugadores aptos  
    const availablePlayers = gameState.squad.filter(p => !p.isInjured).sort((a,b) => b.overall - a.overall);  
    setLineup(availablePlayers.slice(0, 11)); // Usa setLineup para asegurar 11 jugadores  
}  
  
async function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
    gameState.team = teamName;
    gameState.division = divisionType;
    gameState.gameMode = gameMode;
    gameState.currentSeason = '2025/2026';
    gameState.seasonType = 'preseason';

    gameState.squad = generateInitialSquad();
    gameState.academy = generateInitialAcademy();

    // *** CARGAR DATOS PERSONALIZADOS DEL EQUIPO DESDE FIREBASE ***
    if (window.getTeamData) {
        const teamData = await window.getTeamData(teamName);
        
        gameState.teamLogo = teamData.logo || null;
        gameState.stadiumImage = teamData.stadiumImage || null;
        gameState.stadiumName = teamData.stadiumName || teamName + ' Stadium';
        gameState.stadiumCapacity = teamData.stadiumCapacity || 10000;
        
        console.log('✅ Datos del equipo cargados:', {
            logo: !!teamData.logo,
            stadiumImage: !!teamData.stadiumImage,
            stadiumName: teamData.stadiumName,
            capacity: teamData.stadiumCapacity
        });

        // *** ESTABLECER PRESUPUESTO INICIAL ***
        // CORREGIR: Usar teamData.initialBudget directamente
        if (teamData.initialBudget) {
            gameState.balance = teamData.initialBudget;
        } else {
            // Valores por defecto según división
            if (divisionType === 'primera') {
                gameState.balance = 50000000;
                gameState.popularity = 65;
                gameState.fanbase = 25000;
                gameState.ticketPrice = 30;
            } else if (divisionType === 'segunda') {
                gameState.balance = 20000000;
                gameState.popularity = 50;
                gameState.fanbase = 10000;
                gameState.ticketPrice = 20;
            } else {
                gameState.balance = 5000000;
                gameState.popularity = 35;
                gameState.fanbase = 5000;
                gameState.ticketPrice = 15;
            }
        }
    } else {
        console.log(`⚠️ No hay datos personalizados para ${teamName}, usando valores por defecto`);
        gameState.teamLogo = null;
        gameState.stadiumImage = null;
        gameState.stadiumName = teamName + ' Stadium';
        gameState.stadiumCapacity = 10000;
        
        // Valores por defecto según división
        if (divisionType === 'primera') {
            gameState.balance = 50000000;
            gameState.popularity = 65;
            gameState.fanbase = 25000;
            gameState.ticketPrice = 30;
        } else if (divisionType === 'segunda') {
            gameState.balance = 20000000;
            gameState.popularity = 50;
            gameState.fanbase = 10000;
            gameState.ticketPrice = 20;
        } else {
            gameState.balance = 5000000;
            gameState.popularity = 35;
            gameState.fanbase = 5000;
            gameState.ticketPrice = 15;
        }
    }

    let teamsInDivision = TEAMS_DATA[divisionType];
    if (!teamsInDivision) {
        console.error(`División no encontrada en TEAMS_DATA: ${divisionType}. Usando Primera por defecto.`);
        teamsInDivision = TEAMS_DATA.primera;
        gameState.division = 'primera';
    }

    if (!teamsInDivision.includes(gameState.team)) {
        teamsInDivision.push(gameState.team);
    }
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
  
function calculateMatchOutcome(teamOverall, opponentOverall, mentality) {  
    let teamFactor = teamOverall / 100;  
    let opponentFactor = opponentOverall / 100;  
  
    if (mentality === 'offensive') {  
        teamFactor *= 1.1;  
        opponentFactor *= 0.9;  
    } else if (mentality === 'defensive') {  
        teamFactor *= 0.9;  
        opponentFactor *= 1.1;  
    }  
  
    teamFactor += (Math.random() - 0.5) * 0.2;  
    opponentFactor += (Math.random() - 0.5) * 0.2;  
  
    teamFactor = Math.max(0.1, teamFactor);  
    opponentFactor = Math.max(0.1, opponentFactor);  
  
    const teamGoals = Math.round(teamFactor * (Math.random() * 3 + 1));  
    const opponentGoals = Math.round(opponentFactor * (Math.random() * 3 + 1));  
  
    return { teamGoals: Math.max(0, teamGoals), opponentGoals: Math.max(0, opponentGoals) };  
}  
  
function playMatch(homeTeamName, awayTeamName) {  
    let homeTeamOverall = 70 + Math.floor(Math.random() * 20);  
    let awayTeamOverall = 70 + Math.floor(Math.random() * 20);  
    let teamMentality = 'balanced';  
  
    let myTeamSquadForMatch = [];  
    if (homeTeamName === gameState.team || awayTeamName === gameState.team) {  
        myTeamSquadForMatch = gameState.lineup;  
    }  
  
    if (homeTeamName === gameState.team) {  
        homeTeamOverall = calculateTeamEffectiveOverall(myTeamSquadForMatch);  
        teamMentality = gameState.mentality;  
    } else if (awayTeamName === gameState.team) {  
        awayTeamOverall = calculateTeamEffectiveOverall(myTeamSquadForMatch);  
        teamMentality = gameState.mentality;  
    }  
  
    const { teamGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchOutcome(homeTeamOverall, awayTeamOverall, teamMentality);  
  
    const updateStats = (team, gf, gc) => {  
        const s = gameState.standings[team];  
        if (s) { // Asegurarse de que el equipo exista en la clasificación  
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
  
    const playersInvolved = (homeTeamName === gameState.team || awayTeamName === gameState.team) ? myTeamSquadForMatch : [];  
  
    playersInvolved.forEach(pInvolved => {  
        const p = gameState.squad.find(s => s.name === pInvolved.name);  
        if (!p) return;  
  
        if (!p.isInjured) {  
            p.matches++;  
            generateInjury(p);  
  
            p.form = Math.min(100, Math.max(50, p.form + (Math.random() > 0.5 ? 1 : -1)));  
            const myResult = (homeGoals > awayGoals && homeTeamName === gameState.team) || (awayGoals > homeGoals && awayTeamName === gameState.team);  
            const draw = (homeGoals === awayGoals);  
            if (myResult) p.form = Math.min(100, p.form + 2);  
            else if (draw) p.form = Math.min(100, p.form + 1);  
            else p.form = Math.max(0, p.form - 2);  
  
            if (p.overall < p.potential) {  
                if (p.matches % 5 === 0) p.overall = Math.min(p.potential, p.overall + 1);  
                if (p.matches % 10 === 0) p.overall = Math.min(p.potential, p.overall + 1);  
                if (p.matches % 20 === 0) p.overall = Math.min(p.potential, p.overall + 1);  
            }  
        }  
    });  
  
    gameState.squad.forEach(p => {  
        if (!playersInvolved.some(pi => pi.name === p.name) && !p.isInjured) {  
            p.form = Math.min(100, Math.max(50, p.form + (Math.random() > 0.7 ? 1 : -1)));  
        }  
    });  
    gameState.academy.forEach(y => {  
        if (!y.isInjured) {  
             y.form = Math.min(100, Math.max(50, y.form + (Math.random() > 0.8 ? 1 : -1)));  
        }  
    });  
  
    gameState.matchHistory.push({  
        week: gameState.week,  
        home: homeTeamName,  
        away: awayTeamName,  
        score: `${homeGoals}-${awayGoals}`  
    });  
  
    if (homeTeamName === gameState.team || awayTeamName === gameState.team) {  
        const myResult = (homeGoals > awayGoals && homeTeamName === gameState.team) || (awayGoals > homeGoals && awayTeamName === gameState.team);  
        const draw = (homeGoals === awayGoals);  
        if (myResult) {  
            gameState.popularity = Math.min(100, gameState.popularity + 3 + Math.floor(Math.random() * 2));  
            gameState.fanbase = Math.min(1000000, gameState.fanbase + 500 + Math.floor(Math.random() * 500));  
        } else if (draw) {  
            gameState.popularity = Math.max(0, gameState.popularity + 1);  
            gameState.fanbase = Math.min(1000000, gameState.fanbase + 100 + Math.floor(Math.random() * 100));  
        } else {  
            gameState.popularity = Math.max(0, gameState.popularity - 2 - Math.floor(Math.random() * 2));  
            gameState.fanbase = Math.max(0, gameState.fanbase - 200 - Math.floor(Math.random() * 200));  
        }  
    }  
  
    return { homeTeam: homeTeamName, awayTeam: awayTeamName, homeGoals, awayGoals };  
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
  
function simulateFullWeek() {  
    let myMatchResult = null; // Para almacenar el resultado de nuestro partido  
    let forcedLoss = false;  
  
    if (gameState.seasonType === 'preseason') {  
        handlePreseasonWeek();  
        gameState.week++;  
        updateWeeklyFinancials();  
        if (gameState.week > PRESEASON_WEEKS) {  
            gameState.seasonType = 'regular';  
            gameState.week = 1;  
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${gameState.division}!`, 'success');  
        }  
        return { myMatch: null, forcedLoss: false }; // En pretemporada no hay resultados de liga  
    }  
  
    // Guardar el estado de la alineación ANTES de la simulación de partidos  
    const preSimLineupValidation = validateLineup(gameState.lineup);  
  
    applyWeeklyTraining();  
  
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
  
    secondCoachAdvice(); // Las advertencias del segundo entrenador se añaden al newsFeed, pero no bloquean la simulación aquí  
  
    if (gameState.week % 4 === 0) {  
        boardMessages();  
    }  
        
    // Obtener los partidos de la jornada actual de nuestro calendario  
    // Corrección: Filtrar directamente del seasonCalendar (que ya es un array plano de partidos)  
    const currentWeekMatches = gameState.seasonCalendar.filter(match => match.week === gameState.week);  
  
    // Simular el partido de nuestro equipo primero  
    let myTeamMatch = currentWeekMatches.find(match => match.home === gameState.team || match.away === gameState.team);  
  
    if (myTeamMatch) {  
        if (!preSimLineupValidation.success) { // Si la alineación era inválida, forzar derrota 0-3  
            addNews(`[SISTEMA - ALINEACIÓN INVÁLIDA] Tu equipo perdió 0-3 por alineación indebida.`, 'error');  
                
            let homeGoals = 0;  
            let awayGoals = 0;  
  
            if (myTeamMatch.home === gameState.team) {  
                awayGoals = 3; // Nosotros somos locales, el rival gana 0-3  
            } else {  
                homeGoals = 3; // Nosotros somos visitantes, el rival gana 3-0  
            }  
  
            // Actualizar manualmente las estadísticas de la liga para nuestro equipo y el oponente  
            const ourStats = gameState.standings[gameState.team];  
            const opponentName = (myTeamMatch.home === gameState.team) ? myTeamMatch.away : myTeamMatch.home;  
            const opponentStats = gameState.standings[opponentName];  
  
            if(ourStats) {  
                ourStats.pj++;  
                ourStats.p++;  
                ourStats.gf += (myTeamMatch.home === gameState.team ? 0 : 3); // Si somos locales, metemos 0; si visitantes, metemos 0 y el rival 3  
                ourStats.gc += (myTeamMatch.home === gameState.team ? 3 : 0); // Si somos locales, encajamos 3; si visitantes, encajamos 3 y el rival 0  
            }  
            if(opponentStats) {  
                opponentStats.pj++;  
                opponentStats.g++;  
                opponentStats.gf += (myTeamMatch.home === gameState.team ? 3 : 0); // Si somos locales, rival mete 3; si visitantes, rival mete 3  
                opponentStats.gc += (myTeamMatch.home === gameState.team ? 0 : 3); // Si somos locales, rival encaja 0; si visitantes, rival encaja 0  
                opponentStats.pts += 3;  
            }  
                
            gameState.matchHistory.push({  
                week: gameState.week,  
                home: myTeamMatch.home,  
                away: myTeamMatch.away,  
                score: `${homeGoals}-${awayGoals}` // Usar los goles forzados para el historial  
            });  
                
            myMatchResult = {  
                home: myTeamMatch.home,  
                away: myTeamMatch.away,  
                homeGoals: homeGoals,  
                awayGoals: awayGoals,  
                score: `${homeGoals}-${awayGoals}`,  
            };  
            forcedLoss = true;  
  
            gameState.popularity = Math.max(0, gameState.popularity - 5); // Penalización por alineación indebida  
            gameState.fanbase = Math.max(0, gameState.fanbase - 500);  
  
        } else { // Si la alineación es válida, jugar el partido normalmente  
            const result = playMatch(myTeamMatch.home, myTeamMatch.away);  
            myMatchResult = {  
                home: result.homeTeam,  
                away: result.awayTeam,  
                homeGoals: result.homeGoals,  
                awayGoals: result.awayGoals,  
                score: `${result.homeGoals}-${result.awayGoals}`,  
            };  
        }  
    }  
  
  
    // Simular el resto de partidos de la jornada  
    currentWeekMatches.filter(match => match !== myTeamMatch).forEach(match => {  
        // Solo jugar partidos que no hayan sido ya jugados por nuestro equipo  
        const alreadyPlayed = gameState.matchHistory.some(mh =>  
            mh.week === gameState.week &&  
            ((mh.home === match.home && mh.away === match.away) || (mh.home === match.away && mh.away === match.home))  
        );  
        if (!alreadyPlayed) {  
            playMatch(match.home, match.away);  
        }  
    });  
  
    gameState.week++;  
    updateWeeklyFinancials();  
  
    if (gameState.staff.segundoEntrenador && (gameState.weeklyIncome - gameState.weeklyExpenses < -10000) && gameState.balance < 0) {  
        addNews(`[Segundo Entrenador - ¡CRISIS!] Nuestros números están muy mal. Si esto continúa, la directiva podría tomar medidas drásticas.`, 'error');  
    }  
  
    if (gameState.balance < -100000 && gameState.week > 10) {  
        addNews(`¡Has sido despedido! La directiva ha perdido la confianza debido a la pésima gestión económica.`, 'error');  
        alert("¡GAME OVER! Has sido despedido por la directiva.");  
        resetGame();  
        return { myMatch: myMatchResult, forcedLoss: forcedLoss, gameOver: true };  
    }  
  
    // Usar gameState.maxSeasonWeeks en lugar de SEASON_WEEKS  
    if (gameState.week > gameState.maxSeasonWeeks) {  
        endSeason();  
    }  
        
    // NEW: Devolver el resultado de nuestro partido  
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
              
        gameState.lineup = [...newLineUp, ...playersToFill];  
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
  
    const availablePlayers = gameState.squad.filter(p => !p.isInjured);  
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
              
        // Si no hay alineación o está incompleta, rellenar      
        if (!gameState.lineup || gameState.lineup.length === 0) {  
            gameState.lineup = gameState.squad.slice(0, 11);  
        } else if (gameState.lineup.length < 11) {  
            setLineup(gameState.lineup); // setLineup ya rellena automáticamente      
        }  
              
        if (!gameState.currentSeason) gameState.currentSeason = '2025/2026';  
        if (!gameState.seasonType) gameState.seasonType = 'preseason';  
        if (!gameState.leagueTeams || gameState.leagueTeams.length === 0) {  
            // Reconstruir leagueTeams basado en la división actual para evitar errores      
            const divisionKey = gameState.division;  
            let teamsInDivision = TEAMS_DATA[divisionKey];  
            if (!teamsInDivision) { // Fallback si la división es desconocida (old saves or malformed data)  
                console.warn(`División "${divisionKey}" no encontrada al cargar. Usando 'primera' por defecto.`);  
                teamsInDivision = TEAMS_DATA.primera;  
                gameState.division = 'primera'; // Forzar a una división conocida  
            }  
      
            if (!teamsInDivision.includes(gameState.team)) {  
                teamsInDivision.push(gameState.team);  
            }  
            gameState.leagueTeams = teamsInDivision;  
        }  
        // NEW: Generar calendario si no existe o se cargó vacío  
        if (!gameState.seasonCalendar || gameState.seasonCalendar.length === 0) {  
            console.log("Generando calendario al cargar partida.");  
            gameState.seasonCalendar = generateLeagueCalendar(gameState.leagueTeams);  
        }  
        // NEW: Asegurar que maxSeasonWeeks esté definido  
        if (!gameState.maxSeasonWeeks || gameState.maxSeasonWeeks === 0) {  
            gameState.maxSeasonWeeks = gameState.leagueTeams.length * 2 - 2;  
        }  
    
        if (!gameState.nextOpponent) gameState.nextOpponent = null;  
        // NEW: Recalcular nextOpponent si la partida se cargó sin él (o con uno desactualizado)  
        if (!gameState.nextOpponent && gameState.seasonCalendar.length > 0 && gameState.week <= gameState.maxSeasonWeeks) {  
            const matchesForCurrentWeek = gameState.seasonCalendar.filter(match => match.week === gameState.week);  
            const myMatch = matchesForCurrentWeek.find(match => match.home === gameState.team || match.away === gameState.team);  
            if (myMatch) {  
                gameState.nextOpponent = (myMatch.home === gameState.team) ? myMatch.away : myMatch.home;  
            } else {  
                gameState.nextOpponent = "No hay oponente"; // Por si no hay partido para nuestra semana  
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
  
// NEW: Función para obtener el calendario completo  
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
    // NEW EXPORTS  
    generateLeagueCalendar,  
    getSeasonCalendar  
};  
// Al final de gameLogic.js, añadir:
// Exponer funciones globalmente para injectors
if (typeof window !== 'undefined') {
    window.gameLogic = {
        getGameState,
        updateGameState,
        selectTeamWithInitialSquad,
        // ... otras funciones que necesites exponer
    };
}
