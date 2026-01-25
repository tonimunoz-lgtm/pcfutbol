// gameLogic.js - Lógica central del juego  
  
import { TEAMS_DATA } from './config.js';  
// Importamos las nuevas funciones del market  
import { getPlayerMarket, getYoungsterMarket, initPlayerDatabase, initYoungsterDatabase } from './players.js';  
  
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
        secretario: null // El secretario técnico será clave en negociaciones  
    },  
    balance: 50000,  
    weeklyIncomeBase: 5000,  
    weeklyIncome: 0,  
    weeklyExpenses: 0,  
    formation: '442',  
    mentality: 'balanced',  
    trainingLevel: 1,  
    matchHistory: [],  
    popularity: 50,  
    fanbase: 10000,  
    merchandisingPrice: 10,  
    merchandisingItemsSold: 0,  
    // Estado de negociación activa  
    negotiatingPlayer: null, // El jugador con el que se está negociando  
    negotiationStep: 0,      // 0: Ninguna, 1: Con Jugador, 2: Con Club  
    playerOffer: null,       // Detalles de la oferta al jugador  
    clubOffer: null,         // Detalles de la oferta al club  
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
        position: positions[Math.floor(Math.random() * positions.length)], // Posición aleatoria  
        salary: Math.floor(1000 + Math.random() * 3000),  
        value: Math.floor(5000 + Math.random() * 15000), // Valor inicial  
        club: gameState.team, // Su club es el nuestro  
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
            salary: Math.floor(200 + Math.random() * 500), // Salario para juveniles  
            value: Math.floor(1000 + Math.random() * 5000),  
            club: gameState.team, // Su club es el nuestro (cantera)  
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
  
    const divisionTeams = TEAMS_DATA[divisionType.toLowerCase()];  
    gameState.standings = initStandings(divisionTeams);  
  
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
  
    updateWeeklyFinancials();  
}  
  
// --------------------------------------------  
// Gestión de jugadores  
function signPlayer(player) {  
    if (gameState.squad.length >= 25) {  
        return { success: false, message: 'La plantilla está completa (25 jugadores max).' };  
    }  
    // No verificamos balance aquí porque ya se debería haber hecho en la negociación  
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
    gameState.academy.push({ ...youngster, club: gameState.team }); // Asignar al club  
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
        position: youngster.position || 'MC', // Si no tiene posición, le damos una  
        salary: Math.floor(1500 + Math.random() * 1000),  
        value: youngster.value || Math.floor(youngster.overall * 5000),  
        club: gameState.team,  
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
// Negociaciones (NUEVO)  
// --------------------------------------------  
  
function startNegotiation(player) {  
    // Reiniciar cualquier negociación previa  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
  
    gameState.negotiatingPlayer = player;  
    gameState.negotiationStep = 1; // Iniciar con el jugador  
  
    return { success: true, message: `Iniciando negociación con ${player.name}.` };  
}  
  
function offerToPlayer(offeredSalary, offeredBonus, offeredCar, offeredHouse, offeredMerchPercent, offeredTicketPercent) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    let acceptanceChance = 0.5; // Base de aceptación del jugador  
  
    // Impacto del salario (cuanto más cerca de su expectativa/valor, mejor)  
    const salaryFactor = offeredSalary / player.salary;  
    if (salaryFactor > 1.5) acceptanceChance += 0.3; // Mucho más de lo que pide  
    else if (salaryFactor > 1.2) acceptanceChance += 0.15;  
    else if (salaryFactor < 0.8) acceptanceChance -= 0.2; // Muy por debajo  
  
    // Incentivos: cada incentivo aumenta un poco la probabilidad  
    if (offeredBonus) acceptanceChance += 0.05;  
    if (offeredCar) acceptanceChance += 0.05;  
    if (offeredHouse) acceptanceChance += 0.05;  
    if (offeredMerchPercent) acceptanceChance += 0.03;  
    if (offeredTicketPercent) acceptanceChance += 0.03;  
  
    // Fama del jugador vs nuestro club  
    if (player.overall > 80 && gameState.popularity < 60) acceptanceChance -= 0.1;  
  
    // Si es cedible, es más fácil que acepte su salario base  
    if (player.loanListed && offeredSalary >= player.salary) acceptanceChance += 0.2;  
  
    // Roll the dice  
    const roll = Math.random();  
    const secretaryEffect = gameState.staff.secretario ? 0.1 : 0; // El secretario mejora un poco la negociación  
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
        gameState.negotiationStep = 2; // Pasar a negociar con el club  
        return { success: true, message: `${player.name} ha aceptado tu oferta personal. Ahora a negociar con su club, el ${player.club}.` };  
    } else {  
        // El jugador puede pedir más o simplemente rechazar  
        if (roll > 0.8) { // Rechazo total  
            endNegotiation();  
            return { success: false, message: `${player.name} ha rechazado tu oferta. No está interesado en venir.` };  
        } else { // Pide un poco más  
            return { success: false, message: `${player.name} encuentra tu oferta insuficiente. Podrías subir el salario o añadir más incentivos.` };  
        }  
    }  
}  
  
function offerToClub(offerAmount, playerExchange = [], isLoan = false) {  
    const player = gameState.negotiatingPlayer;  
    if (!player) return { success: false, message: 'No hay un jugador en negociación activa.' };  
  
    if (player.loanListed && isLoan) { // Es una cesión  
        // Aquí la oferta es cuánto de su salario nos hacemos cargo  
        const myWageContribution = offerAmount; // offerAmount es el porcentaje de salario  
        if (myWageContribution < 0 || myWageContribution > 100) {  
             return { success: false, message: 'La contribución salarial debe ser un porcentaje entre 0 y 100.' };  
        }  
  
        const actualWageToPay = player.salary * (myWageContribution / 100);  
        // Si el club original ya contribuye, sumamos  
        const finalWageForUs = actualWageToPay - player.loanWageContribution;  
  
        // El club acepta si la contribución es razonable (por encima de un mínimo)  
        let acceptanceChance = 0.5;  
        if (myWageContribution >= 80) acceptanceChance += 0.3;  
        else if (myWageContribution >= 50) acceptanceChance += 0.1;  
        else if (myWageContribution < 30) acceptanceChance -= 0.2;  
  
        const roll = Math.random();  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            gameState.clubOffer = { type: 'loan', wageContribution: myWageContribution, finalWageForUs };  
            endNegotiation(true); // Terminar negociación, fichaje exitoso  
            // Añadir al jugador a la plantilla  
            const newPlayer = {  
                ...player,  
                salary: finalWageForUs, // Nuestro club solo paga esta parte del salario  
                loan: true, // Marcar como cedido  
                club: gameState.team // Ahora está en nuestro club  
            };  
            return signPlayer(newPlayer); // Usa signPlayer para añadirlo  
        } else {  
            endNegotiation();  
            return { success: false, message: `El ${player.club} ha rechazado tu oferta de cesión. Quieren que te hagas cargo de más salario.` };  
        }  
  
    } else { // Es un traspaso  
        const playerAskingPrice = player.askingPrice; // Precio que pide el club  
  
        let acceptanceChance = 0.5;  
        // La oferta debe ser razonable  
        const offerFactor = offerAmount / playerAskingPrice;  
        if (offerFactor >= 1) acceptanceChance += 0.3; // Ofrece lo que pide o más  
        else if (offerFactor >= 0.8) acceptanceChance += 0.1;  
        else if (offerFactor < 0.6) acceptanceChance -= 0.3; // Muy por debajo  
  
        // Intercambio de jugadores (simplificado: aumenta la chance)  
        if (playerExchange.length > 0) {  
            const totalExchangeValue = playerExchange.reduce((sum, pName) => {  
                const p = gameState.squad.find(s => s.name === pName);  
                return sum + (p ? p.value : 0);  
            }, 0);  
            acceptanceChance += (totalExchangeValue / player.value) * 0.1; // 10% del valor del jugador a intercambiar  
        }  
  
        const roll = Math.random();  
        const secretaryEffect = gameState.staff.secretario ? 0.1 : 0; // El secretario mejora un poco la negociación  
        acceptanceChance += secretaryEffect;  
  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            if (gameState.balance < offerAmount) {  
                endNegotiation();  
                return { success: false, message: 'No tienes suficiente dinero para esta oferta.' };  
            }  
            gameState.balance -= offerAmount; // Pagar el traspaso  
            playerExchange.forEach(pName => {  
                const index = gameState.squad.findIndex(p => p.name === pName);  
                if (index !== -1) {  
                    gameState.squad.splice(index, 1); // Quitar jugador de nuestra plantilla  
                    // Opcional: añadirlo al club de origen  
                }  
            });  
  
            // Añadir el jugador a la plantilla  
            const newPlayer = {  
                ...player,  
                salary: gameState.playerOffer.salary, // Con el salario acordado  
                loan: false,  
                club: gameState.team // Ahora está en nuestro club  
            };  
            endNegotiation(true); // Terminar negociación, fichaje exitoso  
            return signPlayer(newPlayer); // Usa signPlayer para añadirlo  
        } else {  
            // El club puede pedir más o rechazar  
            if (roll > 0.8) {  
                endNegotiation();  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. No quieren vender a ${player.name}.` };  
            } else {  
                return { success: false, message: `El ${player.club} ha rechazenado tu oferta. Podrías mejorarla o añadir algún jugador.` };  
            }  
        }  
    }  
}  
  
function endNegotiation(success = false) {  
    const player = gameState.negotiatingPlayer;  
    if (success) {  
        // Si fue exitoso, el jugador ya se añadió en offerToClub  
        console.log(`Negociación con ${player.name} finalizada con éxito.`);  
    } else {  
        console.log(`Negociación con ${player.name} finalizada sin éxito.`);  
    }  
  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
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
  
    // Actualización de experiencia por partidos jugados (PCF7 style)  
    gameState.squad.forEach(p => {  
        if (Math.random() < 0.7) { // El jugador participa  
            p.matches++;  
            if (p.matches % 5 === 0 && p.overall < p.potential) p.overall++; // +1 por cada 5 partidos  
            if (p.matches % 10 === 0 && p.overall < p.potential) p.overall++; // Otro +1 por cada 10 partidos  
            if (p.matches % 20 === 0 && p.overall < p.potential) p.overall++; // Otro +1 por cada 20 partidos  
        }  
    });  
  
    gameState.academy.forEach(y => {  
        if (Math.random() < 0.3) {  
            y.matches++;  
            if (y.matches % 5 === 0 && y.overall < y.potential) y.overall++;  
            if (y.matches % 10 === 0 && y.overall < y.potential) y.overall++;  
            if (y.matches % 20 === 0 && y.overall < y.potential) y.overall++;  
        }  
    });  
  
  
    gameState.matchHistory.push({  
        week: gameState.week,  
        home: homeTeamName,  
        away: awayTeamName,  
        score: `${homeGoals}-${awayGoals}`  
    });  
  
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
  
function simulateFullWeek() {  
    const teams = Object.keys(gameState.standings);  
    const myTeam = gameState.team;  
  
    const teamsCopy = [...teams];  
    const matchesThisWeek = [];  
  
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
    const playerSalaries = gameState.squad.reduce((sum, p) => sum + p.salary, 0);  
    const staffSalaries = Object.values(gameState.staff).filter(s => s !== null).length * 500;  
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
    // También reiniciamos la base de datos de jugadores del market  
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
    hireStaff,  
    setTicketPrice,  
    setMerchandisingPrice,  
    saveToLocalStorage,  
    loadFromLocalStorage,  
    resetGame,  
    initStandings,  
    // Nuevos exports para el mercado y negociación  
    getPlayerMarket,  
    getYoungsterMarket,  
    startNegotiation,  
    offerToPlayer,  
    offerToClub,  
    endNegotiation  
};  
