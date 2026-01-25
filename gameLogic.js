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
    weeklyExpenses: 0,  
    formation: '442', // Añadido  
    mentality: 'balanced', // Añadido  
    trainingLevel: 1, // Añadido para instalaciones  
    matchHistory: [] // Añadido para guardar resultados  
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
        overall: 50 + Math.floor(Math.random() * 20), // Ajustado para ser más realista para inicial  
        potential: 60 + Math.floor(Math.random() * 30),  
        position: pos,  
        salary: Math.floor(1000 + Math.random() * 3000), // Salario inicial más bajo  
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
    // Importamos TEAMS_DATA aquí para evitar problemas de dependencias circulares  
    // Si config.js depende de gameLogic.js, y gameLogic.js de config.js, hay un problema.  
    // La mejor forma es que gameLogic.js solo tenga dependencias unidireccionales (config -> gameLogic)  
    // Para simplificar y dado que config.js es un módulo simple, lo importamos aquí.  
    const { TEAMS_DATA } = require('./config');  
  
    gameState.team = teamName;  
    gameState.division = divisionType;  
    gameState.gameMode = gameMode; // Guardar el modo de juego  
    gameState.squad = generateInitialSquad();  
    gameState.academy = generateInitialAcademy();  
  
    // Inicializar standings con TODOS los equipos de la división  
    const divisionTeams = TEAMS_DATA[divisionType.toLowerCase()];  
    gameState.standings = initStandings(divisionTeams);  
  
    // Calcular las finanzas una vez que la plantilla ya está generada  
    updateWeeklyFinancials();  
}  
  
// --------------------------------------------  
// Gestión de jugadores  
function signPlayer(player) {  
    if (gameState.squad.length >= 25) { // Límite de plantilla  
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
    if (gameState.academy.length >= 15) { // Límite de cantera  
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
    // Asignar una posición y un salario base al ser ascendido  
    gameState.squad.push({  
        name: youngster.name,  
        age: youngster.age,  
        overall: youngster.overall,  
        potential: youngster.potential,  
        position: 'MC', // Posición por defecto, se puede refinar  
        salary: Math.floor(1500 + Math.random() * 1000), // Salario base al ascender  
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
  
    // Venta moderada estilo PCF7, basada en overall y partidos jugados  
    const salePrice = Math.floor(player.overall * 2000 + (player.matches * 500) * (1 + Math.random() * 0.5)); // Precio aleatorio  
    gameState.balance += salePrice;  
    updateWeeklyFinancials();  
    return { success: true, message: `${player.name} vendido por ${salePrice}€.` };  
}  
  
// --------------------------------------------  
// Simulación de partidos  
function calculateMatchOutcome(teamOverall, opponentOverall, mentality) {  
    let teamFactor = teamOverall / 100;  
    let opponentFactor = opponentOverall / 100;  
  
    // Ajustar factores por mentalidad  
    if (mentality === 'offensive') {  
        teamFactor *= 1.1;  
        opponentFactor *= 0.9;  
    } else if (mentality === 'defensive') {  
        teamFactor *= 0.9;  
        opponentFactor *= 1.1;  
    }  
  
    // Un poco de aleatoriedad  
    teamFactor += (Math.random() - 0.5) * 0.2;  
    opponentFactor += (Math.random() - 0.5) * 0.2;  
  
    teamFactor = Math.max(0.1, teamFactor);  
    opponentFactor = Math.max(0.1, opponentFactor);  
  
    // Más goles si el factor es alto  
    const teamGoals = Math.round(teamFactor * (Math.random() * 3 + 1)); // 1 a 4 goles base  
    const opponentGoals = Math.round(opponentFactor * (Math.random() * 3 + 1));  
  
    return { teamGoals: Math.max(0, teamGoals), opponentGoals: Math.max(0, opponentGoals) };  
}  
  
  
function playMatch(homeTeamName, awayTeamName) {  
    // Calculamos el overall del equipo del jugador (si es uno de los que juegan)  
    // Para los equipos de la IA, podemos simular un overall promedio o aleatorio  
    let homeTeamOverall = 70 + Math.floor(Math.random() * 20); // Default AI team  
    let awayTeamOverall = 70 + Math.floor(Math.random() * 20); // Default AI team  
    let teamMentality = 'balanced';  
  
    if (homeTeamName === gameState.team) {  
        homeTeamOverall = gameState.squad.reduce((sum, p) => sum + p.overall, 0) / gameState.squad.length;  
        teamMentality = gameState.mentality;  
    } else if (awayTeamName === gameState.team) {  
        awayTeamOverall = gameState.squad.reduce((sum, p) => sum + p.overall, 0) / gameState.squad.length;  
        teamMentality = gameState.mentality;  
    }  
  
  
    const { teamGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchOutcome(homeTeamOverall, awayTeamOverall, teamMentality);  
  
  
    // Actualizar estadísticas de la tabla  
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
  
    // Contabilizar minutos a jugadores de la plantilla  
    gameState.squad.forEach(p => { if (Math.random() < 0.7) p.matches++; });  
    gameState.academy.forEach(y => {  
        // Los juveniles también "juegan" y ganan experiencia indirecta  
        if (Math.random() < 0.3) { // Menos probabilidades para la cantera  
            y.matches++;  
            // Pequeña mejora de overall por partidos jugados (simulando entrenamiento)  
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
  
    return { homeTeam: homeTeamName, awayTeam: awayTeamName, homeGoals, awayGoals };  
}  
  
// Simulación completa de la jornada  
function simulateFullWeek() {  
    const teams = Object.keys(gameState.standings);  
    const myTeam = gameState.team;  
  
    // Lógica de emparejamiento simple para una jornada  
    const teamsCopy = [...teams];  
    const matchesThisWeek = [];  
  
    // Priorizar el partido de mi equipo  
    let myTeamPlayed = false;  
    if (myTeam && teamsCopy.length > 1) {  
        const otherTeams = teamsCopy.filter(t => t !== myTeam);  
        const opponent = otherTeams[Math.floor(Math.random() * otherTeams.length)];  
  
        if (Math.random() < 0.5) { // Mi equipo es local  
            matchesThisWeek.push({ home: myTeam, away: opponent });  
        } else { // Mi equipo es visitante  
            matchesThisWeek.push({ home: opponent, away: myTeam });  
        }  
        myTeamPlayed = true;  
  
        // Eliminar equipos que ya jugaron de la lista para emparejar  
        const indexMyTeam = teamsCopy.indexOf(myTeam);  
        if (indexMyTeam > -1) teamsCopy.splice(indexMyTeam, 1);  
        const indexOpponent = teamsCopy.indexOf(opponent);  
        if (indexOpponent > -1) teamsCopy.splice(indexOpponent, 1);  
    }  
  
    // Simular el resto de partidos aleatoriamente con los equipos restantes  
    // Esto es una simplificación, un algoritmo de calendario de liga es complejo.  
    // Solo asegura que cada equipo juegue un partido, no todos contra todos.  
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
  
    // Ejecutar todos los partidos de esta jornada  
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
    const staffSalaries = Object.values(gameState.staff).filter(s => s !== null).length * 500; // Salario base del staff  
    gameState.weeklyExpenses = playerSalaries + staffSalaries;  
  
    // Ingresos semanales: base + entradas + merchandising  
    gameState.weeklyIncome = gameState.weeklyIncomeBase +  
                             Math.floor(gameState.ticketPrice * gameState.stadiumCapacity * 0.7) + // 70% de ocupación por defecto  
                             gameState.merchandisingRevenue;  
  
    // Balance total (solo si el juego ya ha iniciado y el team está seleccionado)  
    if (gameState.team) { // Evita modificar balance antes de que el juego esté listo  
        gameState.balance = gameState.balance + gameState.weeklyIncome - gameState.weeklyExpenses;  
    }  
}  
  
function expandStadium(cost = 50000, capacityIncrease = 10000) {  
    if (gameState.balance < cost) {  
        return { success: false, message: 'Dinero insuficiente para expandir el estadio.' };  
    }  
    gameState.balance -= cost;  
    gameState.stadiumCapacity += capacityIncrease;  
    gameState.weeklyIncomeBase += Math.floor(capacityIncrease / 20); // Aumento base por capacidad  
    updateWeeklyFinancials();  
    return { success: true, message: `¡Estadio expandido a ${gameState.stadiumCapacity} espectadores!` };  
}  
  
function improveFacilities(cost = 30000, trainingLevelIncrease = 1) {  
    if (gameState.balance < cost) {  
        return { success: false, message: 'Dinero insuficiente para mejorar las instalaciones.' };  
    }  
    gameState.balance -= cost;  
    gameState.trainingLevel = (gameState.trainingLevel || 0) + trainingLevelIncrease; // Asegurar que trainingLevel existe  
    // Esto podría influir en el potencial de los jóvenes o en el rendimiento de los jugadores  
    gameState.merchandisingRevenue += 200; // Incremento de ingresos por instalaciones  
    updateWeeklyFinancials();  
    return { success: true, message: `¡Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}!` };  
}  
  
function hireStaff(role, costPerWeek = 500) { // Ejemplo de costo semanal  
    if (gameState.staff[role] !== null && gameState.staff[role] !== undefined) {  
        return { success: false, message: `Ya tienes un ${role} contratado.` };  
    }  
    // No hay costo inicial para simplificar, solo salario semanal  
    gameState.staff[role] = true; // Simplemente marcamos como contratado  
    updateWeeklyFinancials(); // Para recalcular gastos  
    return { success: true, message: `¡${role} contratado exitosamente!` };  
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
        // Usar Object.assign para fusionar el estado cargado con el estado actual  
        // Esto permite que nuevas propiedades del gameState por defecto no se pierdan.  
        Object.assign(gameState, loadedState);  
        updateWeeklyFinancials(); // Recalcular las finanzas después de cargar  
        return { success: true, message: 'Partida cargada.' };  
    }  
    return { success: false, message: 'No hay partida guardada en el dispositivo.' };  
}  
  
function resetGame() {  
    localStorage.removeItem('pcfutbol-save');  
    window.location.reload(); // Recargar la página para reiniciar todo el estado  
}  
  
// Exportamos explícitamente las funciones que otros módulos necesitan  
export {  
    getGameState,  
    updateGameState, // Añadido  
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
    resetGame // Añadido para la función de reset  
};  
  
// Para la importación de TEAMS_DATA en selectTeamWithInitialSquad,  
// necesitamos que config.js también use 'module.exports' o usar un patrón de inyección.  
// Aquí asumimos que config.js usará 'module.exports' para ser compatible con 'require'.  
// Si estás usando ES Modules completamente, cambia 'require' por 'import' y 'module.exports' por 'export default'.  
// Para este entorno de navegador con type="module" en index.html,  
// la importación de TEAMS_DATA puede ser problemática si config.js no es un ES Module válido.  
// La forma más limpia sería que gameLogic.js fuera un módulo ES, y que importara TEAMS_DATA con 'import'.  
