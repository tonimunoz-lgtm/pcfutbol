import { DIVISION_MULTIPLIERS } from './config.js';

// Estado global
let gameState = {
    team: null,
    division: null,
    balance: 100000,
    week: 1,
    squad: [],
    academy: [],
    standings: {},
    matchHistory: [],
    gameMode: null,
    formation: '433',
    mentality: 'balanced',
    stadiumCapacity: 50000,
    trainingLevel: 3,
    weeklyIncome: 10500,
    weeklyExpenses: 8000,
    userId: null,
    staff: {
        medico: true,
        entrenador: true,
        analista: false,
        scout: true,
        secretario: true
    },
    merchandisingRevenue: 500,
    ticketPrice: 50
};

// -----------------------------
// INICIALIZAR CLASIFICACIÓN
// -----------------------------
function initStandings(teamsArray) {
    const standings = {};
    teamsArray.forEach(team => {
        standings[team] = { 
            pts: 0, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, nextMatchRival: null
        };
    });
    return standings;
}

// -----------------------------
// SELECCIONAR EQUIPO / PLANTILLA
// -----------------------------
function selectTeamWithInitialSquad(teamName, divisionType, gameMode) {
    gameState.team = teamName;
    gameState.division = divisionType;
    gameState.gameMode = gameMode;
    gameState.balance = gameMode === 'promanager' ? 50000 : 100000;
    gameState.week = 1;
    gameState.squad = generateInitialSquad(divisionType);
    gameState.academy = generateInitialAcademy();
    gameState.matchHistory = [];

    const salaryTotal = gameState.squad.reduce((sum, p) => sum + p.salary, 0);
    gameState.weeklyExpenses = salaryTotal + 3000; // Salarios + staff

    return gameState;
}

// -----------------------------
// GENERAR PLANTILLA / CANTERA
// -----------------------------
function generateInitialSquad(division) {
    const baseLevel = division === 'primera' ? 78 : division === 'segunda' ? 70 : 65;
    const positions = ['POR','POR','DEF','DEF','DEF','DEF','CED','CED','MED','MED','EXT','EXT','DEL','DEL','DEL','DEF','MED','EXT'];
    const playerNames = {
        'POR': ['García','Martínez','Pérez','López'],
        'DEF': ['Gómez','Hernández','Jiménez','Sánchez','Rodríguez','Fernández'],
        'CED': ['Castro','Díaz','Moreno','Ruiz'],
        'MED': ['Silva','Costa','Mendes','Ribeiro','Santos'],
        'EXT': ['Alves','Oliveira','Rojas','Vargas'],
        'DEL': ['Torres','Flores','Ramírez','Domínguez']
    };
    const squad = [];
    positions.forEach((pos, idx) => {
        const names = playerNames[pos];
        const name = names[Math.floor(Math.random() * names.length)] + ' ' + (idx + 1);
        const variation = (Math.random() - 0.5) * 10;
        squad.push({
            name,
            position: pos,
            age: 20 + Math.floor(Math.random() * 15),
            overall: Math.max(50, Math.min(99, baseLevel + variation)),
            salary: 3000 + Math.random() * 7000,
            goals: 0,
            assists: 0,
            matches: 0,
            joinDate: 1
        });
    });
    return squad;
}

function generateInitialAcademy() {
    const youngsters = [];
    const youngNames = ['Pérez Jr','García Jr','López Jr','Martínez Jr','Sánchez Jr'];
    youngNames.forEach(name => {
        youngsters.push({
            name,
            age: 17 + Math.floor(Math.random() * 3),
            overall: 55 + Math.floor(Math.random() * 15),
            potential: 75 + Math.floor(Math.random() * 15),
            salary: 300,
            matches: 0,
            joinDate: 1
        });
    });
    return youngsters;
}

// -----------------------------
// FICHAR / CEDER JUGADOR
// -----------------------------
function signPlayer(name, overall, salary, position, age, cost, loan) {
    if (gameState.balance < (loan ? 0 : cost)) return { success: false, message: 'Dinero insuficiente' };
    if (gameState.squad.length >= 25) return { success: false, message: 'Plantilla completa (máx. 25)' };

    const newPlayer = { name, position, age, overall, salary, goals:0, assists:0, matches:0, joinDate:gameState.week, onLoan:loan||false };
    gameState.squad.push(newPlayer);

    if (!loan) gameState.balance -= cost;
    gameState.weeklyExpenses += salary;

    return { success: true, message: `${name} fichado ${loan?'en préstamo':'exitosamente'}` };
}

function signYoungster(name, age, overall, potential, cost) {
    if (gameState.balance < cost) return { success: false, message: 'Dinero insuficiente' };

    const newYoungster = { name, age, overall, potential, salary:300, matches:0, joinDate:gameState.week };
    gameState.academy.push(newYoungster);
    gameState.balance -= cost;
    gameState.weeklyExpenses += 300;

    return { success: true, message: `${name} contratado en cantera` };
}

function promoteYoungster(name) {
    const youngster = gameState.academy.find(y => y.name === name);
    if (!youngster) return { success:false, message:'Joven no encontrado' };
    if (gameState.squad.length >= 25) return { success:false, message:'Plantilla completa' };

    let levelIncrease = 0;
    if (youngster.matches >= 20) levelIncrease = 3;
    else if (youngster.matches >= 10) levelIncrease = 2;
    else if (youngster.matches >= 5) levelIncrease = 1;

    const promoted = { 
        name: youngster.name,
        position: 'DEL',
        age: youngster.age,
        overall: Math.min(youngster.potential, youngster.overall + levelIncrease),
        salary: 1500,
        goals: 0,
        assists: 0,
        matches: youngster.matches,
        joinDate: gameState.week
    };

    gameState.squad.push(promoted);
    gameState.academy = gameState.academy.filter(y=>y.name!==name);
    gameState.weeklyExpenses += 1500;

    return { success:true, message:`${name} ascendido a primer equipo (Nivel +${levelIncrease})` };
}

// -----------------------------
// VENDER JUGADOR
// -----------------------------
function sellPlayer(name) {
    const player = gameState.squad.find(p=>p.name===name);
    if(!player) return { success:false, message:'Jugador no encontrado' };

    const salePrice = Math.floor(player.overall*2000 + player.matches*500);
    gameState.balance += salePrice;
    gameState.squad = gameState.squad.filter(p=>p.name!==name);
    gameState.weeklyExpenses -= player.salary;

    return { success:true, message:`${name} vendido por ${salePrice}€`, salePrice };
}

// -----------------------------
// SIMULAR PARTIDO
// -----------------------------
function playMatch() {
    const rivals = Object.keys(gameState.standings).filter(t=>t!==gameState.team);
    const rival = rivals[Math.floor(Math.random()*rivals.length)];

    const myLevel = gameState.squad.reduce((sum,p)=>sum+p.overall,0)/gameState.squad.length || 70;
    const rivalLevel = 70; // nivel base para rival

    let myGoals = Math.floor(Math.random()*4 + myLevel/85);
    let rivalGoals = Math.floor(Math.random()*4 + rivalLevel/85);

    if(gameState.mentality==='offensive') myGoals += 1.5;
    if(gameState.mentality==='defensive') rivalGoals = Math.max(0, rivalGoals-1);

    myGoals = Math.floor(myGoals);
    rivalGoals = Math.floor(rivalGoals);

    // Actualizar stats
    gameState.standings[gameState.team].pj++;
    gameState.standings[rival].pj++;
    gameState.standings[gameState.team].gf += myGoals;
    gameState.standings[gameState.team].gc += rivalGoals;
    gameState.standings[rival].gf += rivalGoals;
    gameState.standings[rival].gc += myGoals;

    if(myGoals>rivalGoals){
        gameState.standings[gameState.team].pts +=3;
        gameState.standings[gameState.team].g++;
        gameState.standings[rival].p++;
    } else if(myGoals<rivalGoals){
        gameState.standings[rival].pts +=3;
        gameState.standings[rival].g++;
        gameState.standings[gameState.team].p++;
    } else {
        gameState.standings[gameState.team].pts++;
        gameState.standings[gameState.team].e++;
        gameState.standings[rival].pts++;
        gameState.standings[rival].e++;
    }

    // Progreso cantera
    gameState.academy.forEach(y=>{ if(Math.random()>0.5)y.matches++; });

    gameState.matchHistory.push({
        week: gameState.week,
        home: gameState.team,
        away: rival,
        score:`${myGoals}-${rivalGoals}`,
        result: myGoals>rivalGoals?'W':myGoals<rivalGoals?'L':'D'
    });

    gameState.week++;
    gameState.balance += 3000;

    return { home: gameState.team, away: rival, homeGoals: myGoals, awayGoals: rivalGoals };
}

// -----------------------------
// SIMULAR JORNADA COMPLETA
// -----------------------------
function simulateFullWeek() {
    const teams = Object.keys(gameState.standings);
    const played = new Set();

    for(let i=0;i<teams.length;i++){
        for(let j=i+1;j<teams.length;j++){
            if(!played.has(teams[i]) && !played.has(teams[j])){
                const goals1 = Math.floor(Math.random()*5);
                const goals2 = Math.floor(Math.random()*5);

                gameState.standings[teams[i]].pj++;
                gameState.standings[teams[j]].pj++;
                gameState.standings[teams[i]].gf += goals1;
                gameState.standings[teams[i]].gc += goals2;
                gameState.standings[teams[j]].gf += goals2;
                gameState.standings[teams[j]].gc += goals1;

                if(goals1>goals2){
                    gameState.standings[teams[i]].pts+=3;
                    gameState.standings[teams[i]].g++;
                    gameState.standings[teams[j]].p++;
                } else if(goals1<goals2){
                    gameState.standings[teams[j]].pts+=3;
                    gameState.standings[teams[j]].g++;
                    gameState.standings[teams[i]].p++;
                } else {
                    gameState.standings[teams[i]].pts++;
                    gameState.standings[teams[i]].e++;
                    gameState.standings[teams[j]].pts++;
                    gameState.standings[teams[j]].e++;
                }

                played.add(teams[i]);
                played.add(teams[j]);
            }
        }
    }
}

// -----------------------------
// ESTADIO / INSTALACIONES / STAFF
// -----------------------------
function expandStadium() {
    if(gameState.balance<50000) return { success:false, message:'Dinero insuficiente' };
    gameState.balance -= 50000;
    gameState.stadiumCapacity += 10000;
    gameState.weeklyIncome += 500;
    return { success:true, message:`Estadio expandido a ${gameState.stadiumCapacity} espectadores` };
}

function improveFacilities() {
    if(gameState.balance<30000) return { success:false, message:'Dinero insuficiente' };
    gameState.balance -= 30000;
    gameState.trainingLevel++;
    return { success:true, message:`Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}` };
}

function hireStaff(position) {
    const costs = { analista:4000, scout:3000, medico:5000, entrenador:3000 };
    const cost = costs[position]||0;
    if(gameState.balance<cost) return { success:false, message:'Dinero insuficiente' };
    gameState.balance -= cost;
    gameState.staff[position] = true;
    gameState.weeklyExpenses += 500;
    return { success:true, message:'Personal contratado' };
}

// -----------------------------
// BALANCE SEMANAL
// -----------------------------
function updateWeeklyBalance() {
    const ticketRevenue = gameState.stadiumCapacity * gameState.ticketPrice * 0.2; // asistencia ~20%
    const merchandising = gameState.merchandisingRevenue;
    const income = gameState.weeklyIncome + ticketRevenue + merchandising;
    const expenses = gameState.weeklyExpenses;
    const balance = income - expenses;
    return { weeklyIncome: income, weeklyExpenses: expenses, weeklyBalance: balance };
}

// -----------------------------
// LOCALSTORAGE
// -----------------------------
function saveToLocalStorage() {
    try{
        localStorage.setItem('pcfutbol-save', JSON.stringify(gameState));
        return { success:true, message:'Partida guardada en dispositivo' };
    } catch(e){
        return { success:false, message:'Error al guardar' };
    }
}

function loadFromLocalStorage() {
    try{
        const saved = localStorage.getItem('pcfutbol-save');
        if(saved){ gameState=JSON.parse(saved); return { success:true, message:'Partida cargada' }; }
        return { success:false, message:'No hay partida guardada' };
    } catch(e){
        return { success:false, message:'Error al cargar' };
    }
}

// -----------------------------
// ESTADO
// -----------------------------
function getGameState(){ return gameState; }
function updateGameState(updates){ gameState={...gameState,...updates}; return gameState; }

export {
    gameState, initStandings, selectTeamWithInitialSquad, generateInitialSquad, generateInitialAcademy,
    signPlayer, signYoungster, promoteYoungster, sellPlayer, playMatch, simulateFullWeek,
    expandStadium, improveFacilities, hireStaff, saveToLocalStorage, loadFromLocalStorage,
    getGameState, updateGameState, updateWeeklyBalance
};
