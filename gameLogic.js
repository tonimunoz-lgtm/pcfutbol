// gameLogic.js - Lógica central del juego  
  
import { TEAMS_DATA, ATTRIBUTES, POSITION_ATTRIBUTE_WEIGHTS } from './config.js';  
// Importamos las nuevas funciones del market  
import { getPlayerMarket, getYoungsterMarket, initPlayerDatabase, initYoungsterDatabase, calculateOverall as calculatePlayerOverall } from './players.js';  
  
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
        entrenador: null, // Entrenador para mejorar atributos  
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
    negotiatingPlayer: null,  
    negotiationStep: 0,  
    playerOffer: null,  
    clubOffer: null,  
    // Atributos para el entrenamiento  
    trainingFocus: {  
        playerIndex: -1, // Índice del jugador en la plantilla que se entrena  
        attribute: null // Atributo a mejorar  
    }  
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
// Generación de plantilla inicial (ahora con atributos detallados)  
function generateInitialSquad() {  
    const positions = ['POR', 'DFC', 'DFC', 'DFC', 'LI', 'LD', 'MC', 'MC', 'MI', 'MD', 'DC'];  
    return positions.map((pos, idx) => {  
        const foot = Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro');  
        const player = {  
            name: `Jugador ${idx + 1}`,  
            age: 18 + Math.floor(Math.random() * 10),  
            position: pos,  
            foot: foot,  
            matches: 0,  
            form: 70 + Math.floor(Math.random() * 20), // 70-90 de forma inicial  
            // Atributos aleatorios para jugadores iniciales  
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 40 + Math.floor(Math.random() * 40); // Atributos entre 40 y 80  
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall)); // Potencial siempre mayor  
        player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000); // Salario basado en overall y edad  
        player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5); // Valor de mercado  
  
        return player;  
    });  
}  
  
// Generación cantera (ahora con atributos detallados)  
function generateInitialAcademy() {  
    const academy = [];  
    for (let i = 0; i < 5; i++) {  
        const foot = Math.random() < 0.8 ? 'Diestro' : (Math.random() < 0.5 ? 'Zurdo' : 'Ambidiestro');  
        const player = {  
            name: `Juvenil ${i + 1}`,  
            age: 16 + Math.floor(Math.random() * 2),  
            position: 'MC', // Posición inicial genérica  
            foot: foot,  
            matches: 0,  
            form: 60 + Math.floor(Math.random() * 20),  
            // Atributos aleatorios para juveniles iniciales  
            ...ATTRIBUTES.reduce((acc, attr) => {  
                acc[attr] = 30 + Math.floor(Math.random() * 30); // Atributos entre 30 y 60  
                return acc;  
            }, {})  
        };  
        player.overall = calculatePlayerOverall(player);  
        player.potential = player.overall + Math.floor(Math.random() * (95 - player.overall));  
        player.salary = Math.floor(player.overall * 50 + Math.random() * 200); // Salario para juveniles  
        player.value = Math.floor(player.overall * 1000 + player.potential * 500 + player.salary * 5);  
        player.cost = player.value;  
  
        academy.push(player);  
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
    // Añadimos los atributos al jugador firmado si no los tiene (ej. de los generados aleatoriamente)  
    const newPlayer = { ...player };  
    ATTRIBUTES.forEach(attr => {  
        if (newPlayer[attr] === undefined) {  
            newPlayer[attr] = 50 + Math.floor(Math.random() * 30); // Atributo base por defecto  
        }  
    });  
    newPlayer.overall = calculatePlayerOverall(newPlayer); // Recalcular overall  
    newPlayer.form = 70 + Math.floor(Math.random() * 20); // Forma inicial  
    newPlayer.matches = 0; // Resetear partidos jugados al fichar  
  
    gameState.squad.push(newPlayer);  
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
  
    const newYoungster = { ...youngster, club: gameState.team };  
    newYoungster.overall = calculatePlayerOverall(newYoungster); // Asegurar overall calculado  
    newYoungster.form = 60 + Math.floor(Math.random() * 20); // Forma inicial  
  
    gameState.balance -= newYoungster.cost;  
    gameState.academy.push(newYoungster);  
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
    const promotedPlayer = { ...youngster };  
    promotedPlayer.position = promotedPlayer.position || 'MC';  
    promotedPlayer.salary = Math.floor(promotedPlayer.overall * 150 + Math.random() * 1000); // Salario acorde a su overall  
    promotedPlayer.value = Math.floor(promotedPlayer.overall * 2000 + promotedPlayer.potential * 500 + promotedPlayer.salary * 5);  
    promotedPlayer.club = gameState.team;  
    promotedPlayer.matches = 0; // Se resetean los partidos jugados en la cantera  
  
    gameState.squad.push(promotedPlayer);  
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
    const secretaryEffect = gameState.staff.secretario ? 0.1 : 0;  
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
            return { success: false, message: `${player.name} ha rechazado tu oferta. No está interesado en venir.` };  
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
        const finalWageForUs = actualWageToPay - (player.loanWageContribution || 0); // Si el club original contribuye  
  
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
            return { success: false, message: `El ${player.club} ha rechazado tu oferta de cesión. Quieren que te hagas cargo de más salario.` };  
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
        const secretaryEffect = gameState.staff.secretario ? 0.1 : 0;  
        acceptanceChance += secretaryEffect;  
  
        const accepted = roll < acceptanceChance;  
  
        if (accepted) {  
            if (gameState.balance < offerAmount) {  
                endNegotiation();  
                return { success: false, message: 'No tienes suficiente dinero para esta oferta.' };  
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
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. No quieren vender a ${player.name}.` };  
            } else {  
                return { success: false, message: `El ${player.club} ha rechazado tu oferta. Podrías mejorarla o añadir algún jugador.` };  
            }  
        }  
    }  
}  
  
function endNegotiation(success = false) {  
    console.log(`Negociación con ${gameState.negotiatingPlayer?.name || 'jugador desconocido'} finalizada ${success ? 'con éxito' : 'sin éxito'}.`);  
    gameState.negotiatingPlayer = null;  
    gameState.negotiationStep = 0;  
    gameState.playerOffer = null;  
    gameState.clubOffer = null;  
}  
  
// --------------------------------------------  
// Entrenamiento (NUEVO)  
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
    if (!gameState.staff.entrenador) {  
        return { success: false, message: 'No tienes un entrenador contratado para realizar entrenamientos.' };  
    }  
    if (gameState.trainingFocus.playerIndex === -1 || !gameState.trainingFocus.attribute) {  
        return { success: false, message: 'No hay un foco de entrenamiento establecido.' };  
    }  
  
    const player = gameState.squad[gameState.trainingFocus.playerIndex];  
    const attribute = gameState.trainingFocus.attribute;  
    const currentAttrValue = player[attribute];  
    const potentialAttrValue = player.potential; // El potencial del jugador limita el crecimiento de sus atributos  
  
    if (currentAttrValue >= potentialAttrValue) { // El atributo ya alcanzó su potencial máximo  
        return { success: false, message: `${player.name} ya alcanzó su potencial máximo en ${attribute}.` };  
    }  
  
    // Calcular mejora del atributo  
    let improvementChance = 0.3; // Base de mejora  
    let improvementAmount = 1;   // Cuánto mejora  
  
    // Influencia del nivel de instalaciones y entrenador  
    improvementChance += (gameState.trainingLevel * 0.05); // +5% por cada nivel de entrenamiento  
    // El atributo entrenador del staff afectaría aquí, por ahora solo si está contratado  
    if (gameState.staff.entrenador) improvementChance += 0.1;  
  
    // Reducir mejora si el atributo está cerca del potencial  
    if (currentAttrValue >= potentialAttrValue - 5) improvementChance *= 0.5;  
  
    if (Math.random() < improvementChance) {  
        player[attribute] = Math.min(100, currentAttrValue + improvementAmount);  
        player.overall = calculatePlayerOverall(player); // Recalcular overall  
        return { success: true, message: `${player.name} ha mejorado su ${attribute} a ${player[attribute]}!` };  
    } else {  
        return { success: false, message: `${player.name} no ha mostrado mejoras en ${attribute} esta semana.` };  
    }  
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
  
    // Para calcular el overall del equipo, usamos la media de overall de sus jugadores  
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
            // Actualizar la forma del jugador  
            p.form = Math.min(100, Math.max(50, p.form + (Math.random() > 0.5 ? 1 : -1))); // Pequeñas variaciones  
            if (homeTeamName === gameState.team || awayTeamName === gameState.team) {  
                const myResult = (homeGoals > awayGoals && homeTeamName === gameState.team) || (awayGoals > homeGoals && awayTeamName === gameState.team);  
                const draw = (homeGoals === awayGoals);  
                if (myResult) p.form = Math.min(100, p.form + 2); // Sube más la forma si ganamos  
                else if (draw) p.form = Math.min(100, p.form + 1);  
                else p.form = Math.max(0, p.form - 2); // Baja si perdemos  
            }  
  
            // Aumento de overall por partidos (basado en PCF7)  
            if (p.overall < p.potential) {  
                if (p.matches % 5 === 0) p.overall = Math.min(p.potential, p.overall + 1);  
                if (p.matches % 10 === 0) p.overall = Math.min(p.potential, p.overall + 1);  
                if (p.matches % 20 === 0) p.overall = Math.min(p.potential, p.overall + 1);  
            }  
        } else {  
            // Jugadores que no juegan también pueden variar su forma, pero menos  
            p.form = Math.min(100, Math.max(50, p.form + (Math.random() > 0.7 ? 1 : -1)));  
        }  
    });  
  
    gameState.academy.forEach(y => {  
        if (Math.random() < 0.3) {  
            y.matches++;  
            y.form = Math.min(100, Math.max(50, y.form + (Math.random() > 0.5 ? 1 : -1)));  
            if (y.overall < y.potential) {  
                if (y.matches % 5 === 0) y.overall = Math.min(y.potential, y.overall + 1);  
                if (y.matches % 10 === 0) y.overall = Math.min(y.potential, y.overall + 1);  
                if (y.matches % 20 === 0) y.overall = Math.min(y.potential, y.overall + 1);  
            }  
        } else {  
            y.form = Math.min(100, Math.max(50, y.form + (Math.random() > 0.7 ? 1 : -1)));  
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
    // Aplicar entrenamiento antes de los partidos de la semana  
    const trainingResult = applyWeeklyTraining();  
    if (trainingResult.success) {  
        console.log(`[Entrenamiento] ${trainingResult.message}`);  
    } else if (trainingResult.message !== 'No hay un foco de entrenamiento establecido.') {  
        console.log(`[Entrenamiento] ${trainingResult.message}`);  
    }  
  
  
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
    getPlayerMarket,  
    getYoungsterMarket,  
    startNegotiation,  
    offerToPlayer,  
    offerToClub,  
    endNegotiation,  
    setTrainingFocus, // Exportar las nuevas funciones de entrenamiento  
    applyWeeklyTraining  
};  
