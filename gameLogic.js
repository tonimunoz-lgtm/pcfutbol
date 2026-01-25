// gameLogic.js - Lógica central del juego  
  
import {  
    TEAMS_DATA, ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS,  
    STAFF_ROLES, STAFF_LEVEL_EFFECTS,  
    BASE_INJURY_PROB_PER_MATCH, BASE_RECOVERY_TIME_WEEKS,  
    FORMATIONS, SEASON_WEEKS, PRESEASON_WEEKS, PROMOTION_RELEGATION // Importar nuevas constantes de temporada  
} from './config.js';  
import { getPlayerMarket as getPlayerMarketData, getYoungsterMarket as getYoungsterMarketData, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall } from './players.js';  
  
// Estado global del juego  
const gameState = {  
    team: null,  
    week: 1,  
    division: 'Primera', // La división actual del equipo del jugador  
    squad: [],  
    academy: [],  
    standings: {}, // Clasificación de la liga actual  
    stadiumCapacity: 5000,  
    ticketPrice: 20,  
    merchandisingRevenue: 500,  
    staff: {  
        medico: null, // { name: string, level: number, salary: number, clausula: number }  
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
    formation: '442',  
    lineup: [], // Los 11 jugadores iniciales  
    mentality: 'balanced',  
    trainingLevel: 1, // Nivel de instalaciones de entrenamiento  
    matchHistory: [], // Historial de partidos jugados  
    popularity: 50,  
    fanbase: 10000,  
    merchandisingPrice: 10,  
    merchandisingItemsSold: 0,  
    // Estado de negociación activa  
    negotiatingPlayer: null,  
    negotiationStep: 0,  
    playerOffer: null,  
    clubOffer: null,  
    // Atributos para el entrenamiento  
    trainingFocus: {  
        playerIndex: -1,  
        attribute: null  
    },  
    newsFeed: [], // Cola de mensajes para el dashboard  
    unreadNewsCount: 0, // Contador de noticias no leídas  
    // Nuevas propiedades para la temporada  
    currentSeason: '2025/2026', // Año actual de la temporada  
    seasonType: 'preseason', // 'preseason', 'regular', 'postseason'  
    leagueTeams: [], // Todos los equipos de la liga del jugador (incluido el nuestro)  
    nextOpponent: null, // El próximo rival para la UI del partido  
    // Competiciones (por implementar detalles)  
    cupProgress: 0, // 0-5 (rondas de copa)  
    europeanProgress: 0 // 0-5 (rondas europeas)  
};  
  
// --------------------------------------------  
// Métodos para interactuar con el estado global de forma controlada  
function getGameState() {  
    return JSON.parse(JSON.stringify(gameState));  
}  
  
function updateGameState(newState) {  
    Object.assign(gameState, newState);  
    updateWeeklyFinancials();  
}  
  
// Función para añadir noticias al feed  
function addNews(message, type = 'info') {  
    gameState.newsFeed.unshift({ week: gameState.week, message: message, timestamp: Date.now(), type: type });  
    if (gameState.newsFeed.length > 20) {  
        gameState.newsFeed.pop();  
    }  
    // Solo incrementar contador si no es una noticia del sistema (ej. entrenamiento exitoso)  
    if (type !== 'system') {  
        gameState.unreadNewsCount++;  
    }  
}  
  
function markNewsAsRead() {  
    gameState.unreadNewsCount = 0;  
}  
  
  
// --------------------------------------------  
// Inicialización de la clasificación  
function initStandings(teamsArray) {  
    const standings = {};  
    teamsArray.forEach(team => {  
        standings[team] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };  
    });  
    return standings;  
}  
  
// --------------------------------------------  
// Generación de plantilla inicial (ahora con atributos detallados)  
function generateInitialSquad() {  
    const positions = ['POR', 'DFC', 'DFC', 'LI', 'LD', 'MC', 'MC', 'MCO', 'EXT', 'EXT', 'DC', // 11 para titulares  
                       'POR', 'DFC', 'MC', 'DC', 'LI']; // 5 para suplentes (total 16)  
    const squad = positions.map((pos, idx) => {  
        const foot = Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro');  
        const player = {  
            name: `Jugador ${idx + 1}`,  
            age: 18 + Math.floor(Math.random() * 10),  
            position: positions[Math.floor(Math.random() * positions.length)], // Posición aleatoria  
            foot: foot,  
            matches: 0,  
            form: 70 + Math.floor(Math.random() * 20), // 70-90 de forma inicial  
            isInjured: false,  
            weeksOut: 0,  
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 40 + Math.floor(Math.random() * 40); // Atributos entre 40 y 80  
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000);  
        player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5);  
  
        return player;  
    });  
  
    // Inicializar la alineación con los 11 primeros  
    gameState.lineup = squad.slice(0, 11);  
    return squad;  
}  
  
// Generación cantera (ahora con atributos detallados)  
function generateInitialAcademy() {  
    const positions = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'EXT', 'DC'];  
    const academy = [];  
    for (let i = 0; i < 5; i++) {  
        const foot = Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro');  
        const player = {  
            name: `Juvenil ${i + 1}`,  
            age: 16 + Math.floor(Math.random() * 2),  
            position: positions[Math.floor(Math.random() * positions.length)], // Posición aleatoria  
            foot: foot,  
            matches: 0,  
            form: 60 + Math.floor(Math.random() * 20),  
            isInjured: false,  
            weeksOut: 0,  
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 30 + Math.floor(Math.random() * 30); // Atributos entre 30 y 60  
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 50 + Math.random() * 200);  
        player.value = Math.floor(player.overall * 1000 + player.potential * 500 + player.salary * 5);  
        player.cost = player.value;  
  
        academy.push(player);  
    }  
    return academy;  
}  
  
// Configura una nueva temporada  
function setupNewSeason(currentSeason, division) {  
    const nextSeasonYear = parseInt(currentSeason.split('/')[0]) + 1;  
    const newSeasonName = `${nextSeasonYear}/${nextSeasonYear + 1}`;  
  
    // Limpiar estado relevante de la temporada anterior  
    gameState.week = 1;  
    gameState.matchHistory = [];  
    gameState.standings = {};  
    gameState.newsFeed = [];  
    gameState.unreadNewsCount = 0;  
    gameState.seasonType = 'preseason'; // Iniciar siempre con pretemporada  
    gameState.currentSeason = newSeasonName;  
    gameState.division = division; // La nueva división del equipo  
  
    // Generar nuevos equipos para la liga según la división (ejemplo, se mejorará con ascensos/descensos)  
    const teamsInNewDivision = TEAMS_DATA[division.toLowerCase()];  
    // Asegurarse de que el equipo del jugador esté en la lista, si no, lo añade  
    if (!teamsInNewDivision.includes(gameState.team)) {  
        teamsInNewDivision.push(gameState.team);  
    }  
    gameState.leagueTeams = teamsInNewDivision;  
    gameState.standings = initStandings(teamsInNewDivision);  
  
    addNews(`¡Comienza la ${newSeasonName} en ${gameState.division}! Es tiempo de pretemporada.`);  
    // También generar nuevos jugadores en el mercado, rotar staff, etc.  
    initPlayerDatabase();  
    initYoungsterDatabase(); // Refrescar cantera del mercado  
    // Resetear stats de jugadores (partidos, forma, lesiones)  
    gameState.squad.forEach(p => { p.matches = 0; p.form = 70 + Math.floor(Math.random()*20); p.isInjured = false; p.weeksOut = 0; });  
    gameState.academy.forEach(p => { p.matches = 0; p.form = 60 + Math.floor(Math.random()*20); p.isInjured = false; p.weeksOut = 0; });  
}  
  
// Selección de equipo inicial (solo para el primer juego)  
function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {  
    gameState.team = teamName;  
    gameState.division = divisionType;  
    gameState.gameMode = gameMode;  
    gameState.currentSeason = '2025/2026';  
    gameState.seasonType = 'preseason';  
  
    // generateInitialSquad ya inicializa gameState.lineup  
    gameState.squad = generateInitialSquad();  
    gameState.academy = generateInitialAcademy();  
  
    const teamsInDivision = TEAMS_DATA[divisionType.toLowerCase()];  
    // Asegurarse de que el equipo del jugador esté en la lista, si no, lo añade  
    if (!teamsInDivision.includes(gameState.team)) {  
        teamsInDivision.push(gameState.team);  
    }  
    gameState.leagueTeams = teamsInDivision;  
    gameState.standings = initStandings(teamsInDivision);  
  
    if (divisionType === 'primera') {  
        gameState.popularity = 65;  
        gameState.fanbase = 25000;  
        gameState.stadiumCapacity = 15000;  
        gameState.ticketPrice = 30;  
    } else if (divisionType === 'segunda') {  
        gameState.popularity = 50;  
        gameState.fanbase = 10000;  
        gameState.stadiumCapacity = 8000;  
        gameState.ticketPrice = 20;  
    } else { // RFEF  
        gameState.popularity = 35;  
        gameState.fanbase = 5000;  
        gameState.stadiumCapacity = 5000;  
        gameState.ticketPrice = 15;  
    }  
  
    addNews(`¡Bienvenido al PC Fútbol Manager, temporada ${gameState.currentSeason}!`, 'info');  
    updateWeeklyFinancials();  
}  
  
// --------------------------------------------  
// Gestión de jugadores  
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
  
// --------------------------------------------  
// Negociaciones  
// --------------------------------------------  
  
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
  
// --------------------------------------------  
// Entrenamiento  
// --------------------------------------------  
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
  
  
// --------------------------------------------  
// Funciones del mercado para el SCOUT  
// --------------------------------------------  
function getPlayerMarket(filters = {}) {  
    let scoutLevel = gameState.staff.scout?.level || 0;  
    return getPlayerMarketData(filters, scoutLevel);  
}  
  
function getYoungsterMarket(filters = {}) {  
    let scoutLevel = gameState.staff.scout?.level || 0;  
    return getYoungsterMarketData(filters, scoutLevel);  
}  
  
  
// --------------------------------------------  
// Simulación de partidos  
// --------------------------------------------  
  
// Calcula el overall efectivo del equipo (jugadores no lesionados)  
const calculateTeamEffectiveOverall = (teamSquad) => {  
    const availablePlayers = teamSquad.filter(p => !p.isInjured);  
    if (availablePlayers.length === 0) return 40;  
    return availablePlayers.reduce((sum, p) => sum + p.overall, 0) / availablePlayers.length;  
};  
  
// Generación de lesiones  
function generateInjury(player) {  
    let injuryProb = BASE_INJURY_PROB_PER_MATCH;  
    let recoveryMin = BASE_RECOVERY_TIME_WEEKS.min;  
    let recoveryMax = BASE_RECOVERY_TIME_WEEKS.max;  
  
    if (gameState.staff.fisio) {  
        const fisioLevel = gameState.staff.fisio.level;  
        const fisioEffect = STAFF_LEVEL_EFFECTS[fisioLevel]?.injuryProb || 1;  
        injuryProb /= fisioEffect; // Menos probabilidad de lesión con mejor fisio (dividimos el prob)  
    }  
  
    // Un jugador con muy baja forma o muy alta agresividad podría tener más riesgo  
    if (player.form < 60) injuryProb *= 1.5;  
    if (player.AG > 85) injuryProb *= 1.2;  
  
    if (Math.random() < injuryProb) {  
        player.isInjured = true;  
        // Médico afecta el tiempo de recuperación  
        if (gameState.staff.medico) {  
            const medicoLevel = gameState.staff.medico.level;  
            const medicoEffect = STAFF_LEVEL_EFFECTS[medicoLevel]?.recoveryTime || 1;  
            recoveryMin /= medicoEffect;  
            recoveryMax /= medicoEffect;  
        }  
        player.weeksOut = Math.max(1, Math.round(Math.random() * (recoveryMax - recoveryMin) + recoveryMin));  
  
        addNews(`¡${player.name} se ha lesionado! Estará de baja ${player.weeksOut} semanas.`, 'warning');  
        return true;  
    }  
    return false;  
}  
  
function playMatch(homeTeamName, awayTeamName) {  
    let homeTeamOverall = 70 + Math.floor(Math.random() * 20);  
    let awayTeamOverall = 70 + Math.floor(Math.random() * 20);  
    let teamMentality = 'balanced';  
  
    // Usar la alineación para el cálculo del overall de nuestro equipo  
    let myTeamSquadForMatch = [];  
    if (homeTeamName === gameState.team || awayTeamName === gameState.team) {  
        const lineupValidation = validateLineup(gameState.lineup); // Re-validar por si acaso  
        if (!lineupValidation.success) { // Esto no debería pasar si el botón de simular lo comprueba  
            addNews(`[Segundo Entrenador - ALINEACIÓN] No se pudo jugar el partido. ${lineupValidation.message}`, 'error');  
            return { homeTeam: homeTeamName, awayTeam: awayTeamName, homeGoals: 0, awayGoals: 3 }; // Perdemos  
        }  
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
        s.pj++;  
        s.gf += gf;  
        s.gc += gc;  
        if (gf > gc) { s.g++; s.pts += 3; }  
        else if (gf === gc) { s.e++; s.pts += 1; }  
        else s.p++;  
    };  
  
    updateStats(homeTeamName, homeGoals, awayGoals);  
    updateStats(awayTeamName, awayGoals, homeGoals);  
  
    const playersInvolved = (homeTeamName === gameState.team || awayTeamName === gameState.team) ? myTeamSquadForMatch : [];  
  
    playersInvolved.forEach(pInvolved => {  
        const p = gameState.squad.find(s => s.name === pInvolved.name); // Asumimos que sólo juegan de la plantilla  
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
    gameState.academy.forEach(y => { // Los juveniles no participan en partidos de primer equipo, solo cambia la forma  
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
  
// Lógica del Segundo Entrenador como mini-IA  
function secondCoachAdvice() {  
    if (!gameState.staff.segundoEntrenador) return;  
  
    const currentLineup = gameState.lineup;  
    const availableSquad = gameState.squad.filter(p => !p.isInjured);  
  
    // 1. Advertencia si no hay foco de entrenamiento  
    if (gameState.trainingFocus.playerIndex === -1 && Math.random() < 0.7) {  
        addNews(`[Segundo Entrenador] ¡No hemos fijado un foco de entrenamiento para esta semana!`, 'warning');  
    }  
  
    // 2. Jugadores con baja forma en la alineación  
    const lowFormLineupPlayers = currentLineup.filter(p => p.form < 65 && !p.isInjured);  
    if (lowFormLineupPlayers.length > 0 && Math.random() < 0.6) {  
        const p = lowFormLineupPlayers[Math.floor(Math.random() * lowFormLineupPlayers.length)];  
        addNews(`[Segundo Entrenador] ${p.name} (${p.overall}) tiene baja forma (${p.form}). Quizás necesite descanso.`, 'warning');  
    }  
  
    // 3. Jugadores con alto potencial que no juegan mucho  
    const promisingBenched = availableSquad.filter(p =>  
        !currentLineup.some(lp => lp.name === p.name) &&  
        p.age < 23 && p.potential > 80 && p.matches < (gameState.week * 0.5)  
    );  
    if (promisingBenched.length > 0 && Math.random() < 0.4) {  
        const p = promisingBenched[Math.floor(Math.random() * promisingBenched.length)];  
        addNews(`[Segundo Entrenador] ${p.name} (${p.overall}/${p.potential}) es un gran talento. Deberíamos darle más minutos para que crezca.`, 'info');  
    }  
  
    // 4. Advertencia sobre desequilibrio de plantilla (ej. pocos DFC disponibles)  
    const criticalPositions = ['POR', 'DFC', 'MC', 'DC'];  
    for (const pos of criticalPositions) {  
        const availableInPosition = availableSquad.filter(p => p.position === pos).length;  
        if (pos === 'POR' && availableInPosition < 2) {  
            addNews(`[Segundo Entrenador] Solo tenemos ${availableInPosition} ${pos} apto. Deberíamos buscar refuerzos para la portería.`, 'warning');  
        } else if (pos !== 'POR' && availableInPosition < 3) {  
            addNews(`[Segundo Entrenador] Tenemos pocos ${pos} aptos (${availableInPosition}). Considera fichar.`, 'warning');  
        }  
    }  
  
    // 5. Recomendaciones de fichajes (si hay scout y dinero)  
    if (gameState.staff.scout && gameState.balance > 100000 && Math.random() < 0.3) {  
        const topPlayersInMarket = getPlayerMarketData({}, gameState.staff.scout.level)  
                                    .filter(p => p.overall > 80 && p.transferListed && !p.loanListed);  
        if (topPlayersInMarket.length > 0) {  
            const p = topPlayersInMarket[Math.floor(Math.random() * topPlayersInMarket.length)];  
            addNews(`[Segundo Entrenador] Nuestro ojeador ha encontrado a ${p.name} (${p.position}, OVR ${p.overall}) del ${p.club}. ¡Podría ser un gran fichaje!`, 'info');  
        }  
    }  
  
    // 6. Validación de la alineación y sugerencias (antes del partido)  
    const lineupValidation = validateLineup(currentLineup);  
    if (!lineupValidation.success) {  
        addNews(`[Segundo Entrenador - ALINEACIÓN] Tu alineación es inválida: ${lineupValidation.message}`, 'error');  
    } else {  
        // Consejos si hay jugadores fuera de posición  
        currentLineup.forEach(p => {  
            const currentFormationLayout = FORMATIONS[gameState.formation].layout;  
            const positionInLayout = currentFormationLayout[currentLineup.indexOf(p)].pos;  
            if (p.position !== positionInLayout && Math.random() < 0.3) {  
                addNews(`[Segundo Entrenador - ALINEACIÓN] ${p.name} es un ${p.position} natural, pero está alineado como ${positionInLayout}. Sugiero revisar su posición.`, 'info');  
            }  
        });  
    }  
}  
  
// Mensajes de la Directiva  
function boardMessages() {  
    let satisfaction = 0;  
    const teamStats = gameState.standings[gameState.team];  
    if (teamStats) {  
        // Puntos por jornada, comparado con un ideal (ej. 2 puntos/jornada)  
        satisfaction += (teamStats.pts / teamStats.pj) - 2;  
        satisfaction += gameState.balance / 50000;  
        satisfaction += gameState.popularity / 10 - 5; // Base 50% de popularidad  
  
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
  
// --- Gestión de Temporadas ---  
function endSeason() {  
    const currentDivision = gameState.division;  
    const currentSeason = gameState.currentSeason;  
    const teams = Object.entries(gameState.standings).sort((a, b) => b[1].pts - a[1].pts);  
    const myTeamRank = teams.findIndex(([name]) => name === gameState.team);  
  
    let nextDivision = currentDivision;  
    let seasonSummary = `¡Fin de la temporada ${currentSeason}!\n`;  
  
    if (currentDivision === 'rfef') {  
        // Ascensos desde RFEF  
        const numPromote = PROMOTION_RELEGATION.rfef.promote;  
        const promotedTeams = teams.slice(0, numPromote);  
        if (promotedTeams.some(([name]) => name === gameState.team)) {  
            seasonSummary += `¡Has ascendido a Segunda División! Felicidades.\n`;  
            nextDivision = 'segunda';  
        } else {  
            seasonSummary += `Tu equipo permanece en Primera RFEF.\n`;  
        }  
        seasonSummary += `Equipos que ascienden a Segunda: ${promotedTeams.map(t => t[0]).join(', ')}.\n`;  
  
    } else if (currentDivision === 'segunda') {  
        // Ascensos a Primera, descensos a RFEF  
        const numPromote = PROMOTION_RELEGATION.segunda.promote;  
        const promotedTeams = teams.slice(0, numPromote);  
        if (promotedTeams.some(([name]) => name === gameState.team)) {  
            seasonSummary += `¡Has ascendido a Primera División! ¡Un logro enorme!\n`;  
            nextDivision = 'primera';  
        }  
  
        const numRelegate = PROMOTION_RELEGATION.segunda.relegate;  
        const relegatedTeams = teams.slice(-numRelegate);  
        if (relegatedTeams.some(([name]) => name === gameState.team)) {  
            seasonSummary += `¡Has descendido a Primera RFEF! Es hora de reconstruir.\n`;  
            nextDivision = 'rfef';  
        } else if (!promotedTeams.some(([name]) => name === gameState.team)) {  
            seasonSummary += `Tu equipo permanece en Segunda División.\n`;  
        }  
        seasonSummary += `Equipos que ascienden a Primera: ${promotedTeams.map(t => t[0]).join(', ')}.\n`;  
        seasonSummary += `Equipos que descienden a Primera RFEF: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
  
    } else if (currentDivision === 'primera') {  
        // Descensos a Segunda  
        const numRelegate = PROMOTION_RELEGATION.primera.relegate;  
        const relegatedTeams = teams.slice(-numRelegate);  
        if (relegatedTeams.some(([name]) => name === gameState.team)) {  
            seasonSummary += `¡Has descendido a Segunda División! A trabajar para volver.\n`;  
            nextDivision = 'segunda';  
        } else {  
            seasonSummary += `Tu equipo permanece en Primera División.\n`;  
        }  
        seasonSummary += `Equipos que descienden a Segunda: ${relegatedTeams.map(t => t[0]).join(', ')}.\n`;  
  
        // Competiciones europeas (simplificado)  
        const top4 = teams.slice(0, 4);  
        if (top4.some(([name]) => name === gameState.team)) {  
            seasonSummary += `¡Te has clasificado para la Champions League!\n`;  
        } else if (teams.slice(4, 7).some(([name]) => name === gameState.team)) {  
            seasonSummary += `¡Te has clasificado para la Europa League!\n`;  
        }  
    }  
  
    alert(seasonSummary); // Mostrar resumen al usuario  
    addNews(seasonSummary, 'info'); // Añadir al feed de noticias  
    setupNewSeason(currentSeason, nextDivision); // Iniciar la nueva temporada  
}  
  
  
function simulateFullWeek() {  
    // Si estamos en pretemporada, gestionarla  
    if (gameState.seasonType === 'preseason') {  
        handlePreseasonWeek();  
        gameState.week++;  
        updateWeeklyFinancials();  
        if (gameState.week > PRESEASON_WEEKS) {  
            gameState.seasonType = 'regular';  
            gameState.week = 1; // La primera jornada de liga es la semana 1  
            addNews(`¡Comienza la temporada regular ${gameState.currentSeason} en ${gameState.division}!`, 'info');  
        }  
        return; // No hay partidos de liga ni eventos de temporada en pretemporada  
    }  
  
  
    // Validaciones y eventos semanales para temporada regular  
    // 1. Aplicar entrenamiento  
    const trainingResult = applyWeeklyTraining();  
    if (!trainingResult.success && trainingResult.message !== 'No hay un foco de entrenamiento establecido.') {  
        addNews(`[Entrenamiento Fallido] ${trainingResult.message}`, 'system');  
    }  
  
    // 2. Recuperación de lesiones  
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
  
    // 3. Consejos del segundo entrenador  
    secondCoachAdvice();  
  
    // 4. Mensajes de la directiva (cada 4 semanas, por ejemplo)  
    if (gameState.week % 4 === 0) {  
        boardMessages();  
    }  
  
    // 5. Simulación de partidos  
    const teams = Object.keys(gameState.standings);  
    const myTeam = gameState.team;  
  
    const teamsCopy = [...teams];  
    const matchesThisWeek = [];  
  
    // Lógica para asignar los partidos de la jornada  
    // Por simplicidad, aquí asignamos un oponente aleatorio  
    let myNextOpponent = null;  
    if (myTeam && teamsCopy.length > 1) {  
        const otherTeams = teamsCopy.filter(t => t !== myTeam);  
        myNextOpponent = otherTeams[Math.floor(Math.random() * otherTeams.length)];  
        // Asegurarse de que mi equipo juegue  
        if (Math.random() < 0.5) {  
            matchesThisWeek.push({ home: myTeam, away: myNextOpponent });  
        } else {  
            matchesThisWeek.push({ home: myNextOpponent, away: myTeam });  
        }  
        const indexMyTeam = teamsCopy.indexOf(myTeam);  
        if (indexMyTeam > -1) teamsCopy.splice(indexMyTeam, 1);  
        const indexOpponent = teamsCopy.indexOf(myNextOpponent);  
        if (indexOpponent > -1) teamsCopy.splice(indexOpponent, 1);  
    }  
    gameState.nextOpponent = myNextOpponent; // Guardar el oponente para mostrar en la UI  
  
    while (teamsCopy.length >= 2) {  
        const team1Index = Math.floor(Math.random() * teamsCopy.length);  
        const team1 = teamsCopy.splice(team1Index, 1)[0];  
  
        const team2Index = Math.floor(Math.random() * teamsCopy.length);  
        const team2 = teamsCopy.splice(team2Index, 1)[0];  
  
        if (Math.random() < 0.5) {  
            matchesThisWeek.push({ home: team1, away: team2 });  
        } else {  
            matchesThisWeek.push({ home: team2, away: team1 });  
        }  
    }  
  
    matchesThisWeek.forEach(match => {  
        playMatch(match.home, match.away);  
    });  
  
    gameState.week++;  
    updateWeeklyFinancials();  
  
    // Comprobación de bancarrota para el segundo entrenador (si lo hay)  
    if (gameState.staff.segundoEntrenador && (gameState.weeklyIncome - gameState.weeklyExpenses < -10000) && gameState.balance < 0) {  
        addNews(`[Segundo Entrenador - ¡CRISIS!] Nuestros números están muy mal. Si esto continúa, la directiva podría tomar medidas drásticas.`, 'error');  
    }  
  
    // Comprobación de despido (muy básico por ahora)  
    if (gameState.balance < -100000 && gameState.week > 10) {  
        addNews(`¡Has sido despedido! La directiva ha perdido la confianza debido a la pésima gestión económica.`, 'error');  
        alert("¡GAME OVER! Has sido despedido por la directiva.");  
        resetGame();  
    }  
  
    // Comprobar fin de temporada  
    if (gameState.week > SEASON_WEEKS) {  
        endSeason();  
    }  
}  
  
// Lógica para pretemporada  
function handlePreseasonWeek() {  
    addNews(`Semana ${gameState.week} de pretemporada. Busca amistosos o torneos.`, 'info');  
    // Ejemplo: ofrecer un amistoso aleatorio  
    if (Math.random() < 0.5 && gameState.staff.segundoEntrenador) {  
        const opponent = gameState.leagueTeams.filter(t => t !== gameState.team)[Math.floor(Math.random() * (gameState.leagueTeams.length - 1))];  
        addNews(`[Segundo Entrenador] Hemos recibido una invitación para un amistoso contra el ${opponent}.`, 'info');  
        // Aquí se podría añadir un modal para aceptar/rechazar el amistoso  
    }  
}  
  
// --------------------------------------------  
// Finanzas y estadios  
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
  
// Genera 3 candidatos aleatorios para un rol de staff (ahora con cláusulas y rotación)  
let currentStaffCandidates = {}; // Cache de candidatos para que no cambien cada vez que se abre el modal  
  
function generateStaffCandidates(role, forceNew = false) {  
    // Si ya tenemos candidatos y no forzamos nuevos, devolver los actuales  
    if (currentStaffCandidates[role] && !forceNew) {  
        return currentStaffCandidates[role];  
    }  
  
    const candidates = [];  
    const roleConfig = STAFF_ROLES[role];  
    const staffNames = ["Juan", "Pedro", "María", "Carlos", "Ana", "Luis", "Sofía", "Pablo", "Laura", "Diego", "Miguel", "Sergio", "Elena", "Ricardo", "Carmen", "Javier"];  
  
    let divisionFactor = DIVISION_MULTIPLIERS[gameState.division.toLowerCase()] || 1;  
  
    for (let i = 0; i < 3; i++) {  
        const level = 1 + Math.floor(Math.random() * 5); // Nivel 1 a 5  
        const salary = Math.floor(roleConfig.minSalary + (roleConfig.maxSalary - roleConfig.minSalary) * (level / 5)) * divisionFactor;  
        const name = staffNames[Math.floor(Math.random() * staffNames.length)] + " " + staffNames[Math.floor(Math.random() * staffNames.length)];  
  
        let clausula = Math.floor(roleConfig.baseClausula * level * roleConfig.levelCostMultiplier * divisionFactor * (0.8 + Math.random() * 0.4));  
  
        // Los de nivel 1 tienen 50% de probabilidad de ser libres  
        if (level === 1 && Math.random() < 0.5) {  
            clausula = 0;  
        } else if (level <= 2 && Math.random() < 0.2) {  
            clausula = 0;  
        } else {  
            clausula = Math.max(clausula, 1000);  
        }  
  
        candidates.push({ name: name, level: level, salary: salary, role: role, displayName: roleConfig.displayName, clausula: Math.round(clausula) });  
    }  
    currentStaffCandidates[role] = candidates; // Guardar en caché  
    return candidates;  
}  
  
// Contrata staff del modal de candidatos  
function hireStaffFromCandidates(candidate) {  
    const existingStaff = gameState.staff[candidate.role];  
    let indemnization = 0;  
  
    if (existingStaff) {  
        // Calcular indemnización: salario de un año  
        indemnization = existingStaff.salary * 52;  
        if (gameState.balance < indemnization + candidate.clausula + candidate.salary) { // balance para indemnizar, cláusula y salario inicial  
            return { success: false, message: `Dinero insuficiente. Necesitas ${indemnization.toLocaleString('es-ES')}€ para indemnizar a ${existingStaff.name} y pagar al nuevo staff.` };  
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
    // Vaciar los candidatos para este rol (simula que los demás firman con otros)  
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
  
// --------------------------------------------  
// Gestión de Alineación (NUEVO)  
// --------------------------------------------  
function getLineup() {  
    return gameState.lineup;  
}  
  
function getReservePlayers() {  
    // Jugadores de la plantilla que no están en la alineación y no están lesionados  
    const lineupNames = new Set(gameState.lineup.map(p => p.name));  
    return gameState.squad.filter(p => !lineupNames.has(p.name));  
}  
  
function setLineup(newLineup) {  
    if (!Array.isArray(newLineup) || newLineup.length !== 11) {  
        return { success: false, message: 'La alineación debe contener exactamente 11 jugadores.' };  
    }  
  
    // Asegurarse de que los jugadores existen en la plantilla  
    const validPlayers = newLineup.every(p => gameState.squad.some(s => s.name === p.name));  
    if (!validPlayers) {  
        return { success: false, message: 'Algunos jugadores en la alineación no pertenecen a tu plantilla.' };  
    }  
  
    gameState.lineup = newLineup;  
    return { success: true, message: 'Alineación guardada correctamente.' };  
}  
  
function validateLineup(lineupToCheck) {  
    if (!Array.isArray(lineupToCheck) || lineupToCheck.length !== 11) {  
        return { success: false, message: 'La alineación debe contener exactamente 11 jugadores.' };  
    }  
  
    const availablePlayers = gameState.squad.filter(p => !p.isInjured);  
    const availablePlayerNames = new Set(availablePlayers.map(p => p.name));  
  
    let hasGK = false;  
    let numPlayers = 0;  
    const positionCounts = {};  
  
    for (const player of lineupToCheck) {  
        // Verificar si el jugador existe y está apto  
        if (!availablePlayerNames.has(player.name)) {  
            const fullPlayer = gameState.squad.find(p => p.name === player.name);  
            if (fullPlayer && fullPlayer.isInjured) {  
                return { success: false, message: `¡Error! ${player.name} está lesionado y no puede jugar.` };  
            }  
            return { success: false, message: `¡Error! ${player.name} no está en la plantilla o no está apto.` };  
        }  
  
        // Contar posiciones  
        if (player.position === 'POR') {  
            hasGK = true;  
        }  
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;  
        numPlayers++;  
    }  
  
    if (!hasGK) {  
        return { success: false, message: '¡Error! Necesitas al menos un portero en la alineación.' };  
    }  
    if (numPlayers !== 11) {  
        return { success: false, message: `¡Error! Se necesitan 11 jugadores, pero tienes ${numPlayers}.` };  
    }  
  
    // Validaciones de formación simplificadas (ej. no más de 5 DFC, no menos de 3 defensas, etc.)  
    const numDefenders = (positionCounts['DFC'] || 0) + (positionCounts['LI'] || 0) + (positionCounts['LD'] || 0);  
    const numMidfielders = (positionCounts['MC'] || 0) + (positionCounts['MCO'] || 0) + (positionCounts['MD'] || 0) + (positionCounts['MI'] || 0);  
    const numForwards = (positionCounts['EXT'] || 0) + (positionCounts['DC'] || 0);  
  
    if (numDefenders < 3) return { success: false, message: '¡Error! Necesitas al menos 3 defensas (DFC, LI, LD).' };  
    if (numMidfielders < 2) return { success: false, message: '¡Error! Necesitas al menos 2 centrocampistas.' };  
    if (numForwards < 1) return { success: false, message: '¡Error! Necesitas al menos 1 delantero.' };  
  
    return { success: true, message: 'Alineación válida.' };  
}  
  
  
// --------------------------------------------  
// Guardado y carga  
function saveToLocalStorage() {  
    localStorage.setItem('pcfutbol-save', JSON.stringify(gameState));  
    return { success: true, message: 'Partida guardada en el dispositivo.' };  
}  
  
function loadFromLocalStorage() {  
    const saved = localStorage.getItem('pcfutbol-save');  
    if (saved) {  
        const loadedState = JSON.parse(saved);  
        Object.assign(gameState, loadedState);  
        // Asegurarse de que los nuevos campos de staff estén inicializados a null si no existían en el save  
        Object.keys(STAFF_ROLES).forEach(role => {  
            if (gameState.staff[role] === undefined) gameState.staff[role] = null;  
        });  
        if (!gameState.newsFeed) gameState.newsFeed = [];  
        if (!gameState.unreadNewsCount) gameState.unreadNewsCount = 0;  
        if (!gameState.trainingFocus) gameState.trainingFocus = { playerIndex: -1, attribute: null };  
        if (!gameState.lineup) gameState.lineup = gameState.squad.slice(0, 11);  
        if (!gameState.currentSeason) gameState.currentSeason = '2025/2026';  
        if (!gameState.seasonType) gameState.seasonType = 'preseason';  
        if (!gameState.leagueTeams || gameState.leagueTeams.length === 0) {  
             gameState.leagueTeams = TEAMS_DATA[gameState.division.toLowerCase()];  
             if (!gameState.leagueTeams.includes(gameState.team)) {  
                gameState.leagueTeams.push(gameState.team);  
             }  
        }  
        if (!gameState.nextOpponent) gameState.nextOpponent = null;  
  
  
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
  
// Exportamos explícitamente las funciones que otros módulos necesitan  
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
    endSeason // Exportar endSeason si queremos llamarla manualmente en tests  
};  
