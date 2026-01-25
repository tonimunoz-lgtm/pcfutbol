// gameLogic.js - Lógica central del juego  
  
// Importar TEAMS_DATA al inicio del archivo para usar ES Modules  
import { TEAMS_DATA } from './config.js';  
  
// Estado global del juego  
const gameState = {  
    team: null,  
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
        analista: null,  
        scout: null,  
        secretario: null  
    },  
    balance: 50000,  
    weeklyIncomeBase: 5000,  
    weeklyIncome: 0,  
    weeklyExpenses: 0,  
    formation: '442',  
    mentality: 'balanced',  
    trainingLevel: 1,  
    matchHistory: [],  
    // Nuevas propiedades para la gestión comercial y popularidad  
    popularity: 50, // 0-100, influye en asistencia y merchandising  
    fanbase: 10000, // Número de seguidores, influye en merchandising base  
    merchandisingPrice: 10, // Precio promedio de un artículo de merchandising  
    merchandisingItemsSold: 0 // Para calcular ingresos  
};  
  
// --------------------------------------------  
// Métodos para interactuar con el estado global de forma controlada  
function getGameState() {  
    // Devuelve una copia del estado para evitar modificaciones directas inesperadas  
    return JSON.parse(JSON.stringify(gameState));  
}  
  
function updateGameState(newState) {  
    // Fusiona el nuevo estado con el estado existente  
    Object.assign(gameState, newState);  
    // Asegurarse de que los cálculos financieros se actualicen al cargar un estado o modificarlo  
    updateWeeklyFinancials(); // Recalcular siempre que el estado se actualice  
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
// Generación de plantilla inicial  
function generateInitialSquad() {  
    const positions = ['POR', 'DFC', 'DFC', 'DFC', 'LI', 'LD', 'MC', 'MC', 'MI', 'MD', 'DC'];  
    return positions.map((pos, idx) => ({  
        name: `Jugador ${idx + 1}`,  
        age: 18 + Math.floor(Math.random() * 10),  
        overall: 50 + Math.floor(Math.random() * 20),  
        potential: 60 + Math.floor(Math.random() * 30),  
        position: pos,  
        salary: Math.floor(1000 + Math.random() * 3000),  
        matches: 0  
    }));  
}  
  
// Generación cantera  
function generateInitialAcademy() {  
    const academy = [];  
    for (let i = 0; i < 5; i++) {  
        academy.push({  
            name: `Juvenil ${i + 1}`,  
            age: 16 + Math.floor(Math.random() * 2),  
            overall: 40 + Math.floor(Math.random() * 15),  
            potential: 60 + Math.floor(Math.random() * 30),  
            matches: 0  
        });  
    }  
    return academy;  
}  
  
// Selección de equipo inicial  
function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {  
    gameState.team = teamName;  
    gameState.division = divisionType;  
    gameState.gameMode = gameMode;  
    gameState.squad = generateInitialSquad();  
    gameState.academy = generateInitialAcademy();  
  
    // Inicializar standings con TODOS los equipos de la división  
    const divisionTeams = TEAMS_DATA[divisionType.toLowerCase()];  
    gameState.standings = initStandings(divisionTeams);  
  
    // Valores iniciales de popularidad y fanbase según la división  
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
  
  
    // Calcular las finanzas una vez que la plantilla ya está generada  
    updateWeeklyFinancials();  
}  
  
// --------------------------------------------  
// Gestión de jugadores  
function signPlayer(player) {  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'La plantilla está completa (25 jugadores max).' };  
    }  
    if (gameState.balance < player.cost) {  
        return { success: false, message: 'Dinero insuficiente para fichar a este jugador.' };  
    }  
  
    gameState.balance -= player.cost;  
    gameState.squad.push(player);  
    updateWeeklyFinancials();  
    return { success: true, message: `${player.name} ha sido fichado.` };  
}  
  
function signYoungster(youngster) {  
    if (gameState.balance < youngster.cost) {  
        return { success: false, message: 'Dinero insuficiente para contratar a este joven.' };  
    }  
    if (gameState.academy.length >= 15) {  
        return { success: false, message: 'La cantera está completa (15 jóvenes max).' };  
    }  
  
    gameState.balance -= youngster.cost;  
    gameState.academy.push(youngster);  
    updateWeeklyFinancials();  
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
    gameState.squad.push({  
        name: youngster.name,  
        age: youngster.age,  
        overall: youngster.overall,  
        potential: youngster.potential,  
        position: 'MC',  
        salary: Math.floor(1500 + Math.random() * 1000),  
        matches: 0  
    });  
    updateWeeklyFinancials();  
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
    return { success: true, message: `${player.name} vendido por ${salePrice}€.` };  
}  
  
// --------------------------------------------  
// Simulación de partidos  
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
  
    if (homeTeamName === gameState.team) {  
        homeTeamOverall = gameState.squad.reduce((sum, p) => sum + p.overall, 0) / gameState.squad.length;  
        teamMentality = gameState.mentality;  
    } else if (awayTeamName === gameState.team) {  
        awayTeamOverall = gameState.squad.reduce((sum, p) => sum + p.overall, 0) / gameState.squad.length;  
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
  
    gameState.squad.forEach(p => { if (Math.random() < 0.7) p.matches++; });  
    gameState.academy.forEach(y => {  
        if (Math.random() < 0.3) {  
            y.matches++;  
            if (y.matches % 10 === 0 && y.overall < y.potential) {  
                y.overall++;  
            }  
        }  
    });  
  
    gameState.matchHistory.push({  
        week: gameState.week,  
        home: homeTeamName,  
        away: awayTeamName,  
        score: `${homeGoals}-${awayGoals}`  
    });  
  
    // Actualizar popularidad y fanbase post-partido (solo para el equipo del jugador)  
    if (homeTeamName === gameState.team || awayTeamName === gameState.team) {  
        const myScore = (homeTeamName === gameState.team) ? homeGoals : awayGoals;  
        const opponentScore = (homeTeamName === gameState.team) ? awayGoals : homeGoals;  
  
        if (myScore > opponentScore) { // Victoria  
            gameState.popularity = Math.min(100, gameState.popularity + 3 + Math.floor(Math.random() * 2));  
            gameState.fanbase = Math.min(1000000, gameState.fanbase + 500 + Math.floor(Math.random() * 500));  
        } else if (myScore === opponentScore) { // Empate  
            gameState.popularity = Math.max(0, gameState.popularity + 1);  
            gameState.fanbase = Math.min(1000000, gameState.fanbase + 100 + Math.floor(Math.random() * 100));  
        } else { // Derrota  
            gameState.popularity = Math.max(0, gameState.popularity - 2 - Math.floor(Math.random() * 2));  
            gameState.fanbase = Math.max(0, gameState.fanbase - 200 - Math.floor(Math.random() * 200));  
        }  
    }  
  
    return { homeTeam: homeTeamName, awayTeam: awayTeamName, homeGoals, awayGoals };  
}  
  
// Simulación completa de la jornada  
function simulateFullWeek() {  
    const teams = Object.keys(gameState.standings);  
    const myTeam = gameState.team;  
  
    const teamsCopy = [...teams];  
    const matchesThisWeek = [];  
  
    // Priorizar el partido de mi equipo  
    let myTeamPlayed = false;  
    if (myTeam && teamsCopy.length > 1) {  
        const otherTeams = teamsCopy.filter(t => t !== myTeam);  
        const opponent = otherTeams[Math.floor(Math.random() * otherTeams.length)];  
  
        if (Math.random() < 0.5) {  
            matchesThisWeek.push({ home: myTeam, away: opponent });  
        } else {  
            matchesThisWeek.push({ home: opponent, away: myTeam });  
        }  
        myTeamPlayed = true;  
  
        const indexMyTeam = teamsCopy.indexOf(myTeam);  
        if (indexMyTeam > -1) teamsCopy.splice(indexMyTeam, 1);  
        const indexOpponent = teamsCopy.indexOf(opponent);  
        if (indexOpponent > -1) teamsCopy.splice(indexOpponent, 1);  
    }  
  
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
}  
  
// --------------------------------------------  
// Finanzas y estadios  
function updateWeeklyFinancials() {  
    // Gastos semanales: salarios de jugadores + staff  
    const playerSalaries = gameState.squad.reduce((sum, p) => sum + p.salary, 0);  
    const staffSalaries = Object.values(gameState.staff).filter(s => s !== null).length * 500;  
    gameState.weeklyExpenses = playerSalaries + staffSalaries;  
  
    // Ingresos semanales: base + entradas + merchandising  
    // Asistencia al estadio: influenciada por popularidad y precio de la entrada  
    let attendance = Math.floor(gameState.stadiumCapacity * (0.5 + (gameState.popularity / 200) - (gameState.ticketPrice / 100)));  
    attendance = Math.max(0, Math.min(gameState.stadiumCapacity, attendance)); // No más de la capacidad  
  
    // Ingresos por merchandising: influenciados por fanbase y popularidad  
    gameState.merchandisingItemsSold = Math.floor(gameState.fanbase * (gameState.popularity / 500) * (0.01 + Math.random() * 0.02)); // 1-2% de la fanbase  
    gameState.merchandisingRevenue = gameState.merchandisingItemsSold * gameState.merchandisingPrice;  
  
    gameState.weeklyIncome = gameState.weeklyIncomeBase +  
                             Math.floor(gameState.ticketPrice * attendance) +  
                             gameState.merchandisingRevenue;  
  
    // Balance total (solo si el juego ya ha iniciado y el team está seleccionado)  
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
    return { success: true, message: `¡Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}!` };  
}  
  
function hireStaff(role) {  
    if (gameState.staff[role] !== null && gameState.staff[role] !== undefined) {  
        return { success: false, message: `Ya tienes un ${role} contratado.` };  
    }  
    gameState.staff[role] = true;  
    updateWeeklyFinancials();  
    return { success: true, message: `¡${role} contratado exitosamente!` };  
}  
  
// Nueva función para cambiar el precio de las entradas  
function setTicketPrice(newPrice) {  
    newPrice = parseInt(newPrice);  
    if (isNaN(newPrice) || newPrice < 5 || newPrice > 100) {  
        return { success: false, message: 'El precio de la entrada debe ser un número entre 5 y 100.' };  
    }  
    gameState.ticketPrice = newPrice;  
    updateWeeklyFinancials();  
    return { success: true, message: `El precio de la entrada se ha establecido en ${newPrice}€.` };  
}  
  
// Nueva función para cambiar el precio del merchandising  
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
        updateWeeklyFinancials();  
        return { success: true, message: 'Partida cargada.' };  
    }  
    return { success: false, message: 'No hay partida guardada en el dispositivo.' };  
}  
  
function resetGame() {  
    localStorage.removeItem('pcfutbol-save');  
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
    hireStaff,  
    setTicketPrice, // Exportar nueva función  
    setMerchandisingPrice, // Exportar nueva función  
    saveToLocalStorage,  
    loadFromLocalStorage,  
    resetGame,  
    initStandings  
};  
