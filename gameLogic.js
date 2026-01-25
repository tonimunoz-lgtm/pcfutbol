// gameLogic.js - Lógica central del juego

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
    weeklyExpenses: 0
};

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
        overall: 50 + Math.floor(Math.random() * 50),
        potential: 60 + Math.floor(Math.random() * 40),
        position: pos,
        salary: Math.floor(3000 + Math.random() * 7000),
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
            overall: 40 + Math.floor(Math.random() * 20),
            potential: 60 + Math.floor(Math.random() * 40),
            matches: 0
        });
    }
    return academy;
}

// Selección de equipo inicial
function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
    gameState.team = teamName;
    gameState.division = divisionType;
    gameState.squad = generateInitialSquad();
    gameState.academy = generateInitialAcademy();
    gameState.standings = initStandings([teamName, "Rival A", "Rival B", "Rival C", "Rival D"]);
    updateWeeklyFinancials();
}

// --------------------------------------------
// Gestión de jugadores
function signPlayer(player) {
    if (gameState.squad.length >= 16) return false;
    if (gameState.balance < player.cost) return false;

    gameState.balance -= player.cost;
    gameState.squad.push(player);
    updateWeeklyFinancials();
    return true;
}

function signYoungster(youngster) {
    if (gameState.balance < youngster.cost) return false;
    gameState.balance -= youngster.cost;
    gameState.academy.push(youngster);
    updateWeeklyFinancials();
    return true;
}

function promoteYoungster(name) {
    const index = gameState.academy.findIndex(y => y.name === name);
    if (index === -1) return false;
    const player = gameState.academy.splice(index, 1)[0];
    gameState.squad.push(player);
    return true;
}

function sellPlayer(name) {
    const index = gameState.squad.findIndex(p => p.name === name);
    if (index === -1) return false;
    const player = gameState.squad.splice(index, 1)[0];

    // Venta moderada estilo PCF7
    const salePrice = player.overall * 2000 + (player.matches * 500);
    gameState.balance += salePrice;
    updateWeeklyFinancials();
    return true;
}

// --------------------------------------------
// Simulación de partidos
function playMatch(homeTeam, awayTeam) {
    const homeGoals = Math.floor(Math.random() * 4);
    const awayGoals = Math.floor(Math.random() * 4);

    const updateStats = (team, gf, gc) => {
        const s = gameState.standings[team];
        s.pj++;
        s.gf += gf;
        s.gc += gc;
        if (gf > gc) { s.g++; s.pts += 3; }
        else if (gf === gc) { s.e++; s.pts += 1; }
        else s.p++;
    };

    updateStats(homeTeam, homeGoals, awayGoals);
    updateStats(awayTeam, awayGoals, homeGoals);

    // Contabilizar minutos a juveniles
    gameState.squad.forEach(p => { if (Math.random() < 0.7) p.matches++; });
    gameState.academy.forEach(y => { if (Math.random() < 0.5) y.matches++; });
}

// Simulación completa de la jornada
function simulateFullWeek() {
    const teams = Object.keys(gameState.standings);
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            playMatch(teams[i], teams[j]);
        }
    }
    gameState.week++;
    updateWeeklyFinancials();
}

// --------------------------------------------
// Finanzas y estadios
function updateWeeklyFinancials() {
    // Gastos semanales: salarios de jugadores
    gameState.weeklyExpenses = gameState.squad.reduce((sum, p) => sum + p.salary, 0);

    // Ingresos semanales: base + entradas + merchandising
    gameState.weeklyIncome = gameState.weeklyIncomeBase + 
                             Math.floor(gameState.ticketPrice * gameState.stadiumCapacity / 100) +
                             gameState.merchandisingRevenue;

    // Balance total
    gameState.balance = gameState.balance + gameState.weeklyIncome - gameState.weeklyExpenses;
}

function expandStadium(amount) {
    gameState.stadiumCapacity += amount;
    updateWeeklyFinancials();
}

function improveFacilities(amount) {
    gameState.merchandisingRevenue += amount;
    updateWeeklyFinancials();
}

function hireStaff(role, name) {
    gameState.staff[role] = name;
}

// --------------------------------------------
// Guardado y carga
function saveToLocalStorage() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        Object.assign(gameState, JSON.parse(saved));
    }
}

// --------------------------------------------
// Obtener estado del juego
function getGameState() {
    return gameState;
}

// Export
export {
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
    saveToLocalStorage,
    loadFromLocalStorage,
    getGameState
};
