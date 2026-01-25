// gameLogic.js - Lógica principal del juego

import { db } from './config.js';
import { ref, set, get, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Estado global del juego
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
  }
};

// INICIALIZAR CLASIFICACIÓN
function initStandings(teamsArray) {
  const standings = {};
  teamsArray.forEach(team => {
    standings[team] = { pts: 0, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
  });
  return standings;
}

// SELECCIONAR EQUIPO
function selectTeam(teamName, divisionType, gameMode) {
  gameState.team = teamName;
  gameState.division = divisionType;
  gameState.gameMode = gameMode;
  gameState.balance = gameMode === 'promanager' ? 50000 : 100000;
  gameState.week = 1;
  gameState.squad = [];
  gameState.academy = [];
  gameState.matchHistory = [];
  
  return gameState;
}

// FICHAR JUGADOR
function signPlayer(player) {
  if (gameState.balance < player.cost) {
    return { success: false, message: 'Dinero insuficiente' };
  }
  if (gameState.squad.length >= 25) {
    return { success: false, message: 'Plantilla completa (máx. 25)' };
  }
  
  const newPlayer = {
    name: player.name,
    position: player.position,
    age: player.age,
    overall: player.overall,
    salary: player.salary,
    goals: 0,
    assists: 0,
    matches: 0,
    joinDate: gameState.week
  };
  
  gameState.squad.push(newPlayer);
  gameState.balance -= player.cost;
  gameState.weeklyExpenses += player.salary;
  
  return { success: true, message: `${player.name} fichado exitosamente`, player: newPlayer };
}

// FICHAR JOVEN
function signYoungster(youngster) {
  if (gameState.balance < youngster.cost) {
    return { success: false, message: 'Dinero insuficiente' };
  }
  
  const newYoungster = {
    name: youngster.name,
    age: youngster.age,
    overall: youngster.overall,
    potential: youngster.potential,
    salary: 300,
    matches: 0,
    joinDate: gameState.week
  };
  
  gameState.academy.push(newYoungster);
  gameState.balance -= youngster.cost;
  gameState.weeklyExpenses += 300;
  
  return { success: true, message: `${youngster.name} contratado en cantera` };
}

// ASCENDER JOVEN A PRIMER EQUIPO
function promoteYoungster(name) {
  const youngster = gameState.academy.find(y => y.name === name);
  if (!youngster) return { success: false, message: 'Joven no encontrado' };
  if (gameState.squad.length >= 25) return { success: false, message: 'Plantilla completa' };
  
  const promoted = {
    name: youngster.name,
    position: 'DEL',
    age: youngster.age,
    overall: youngster.overall,
    salary: 1500,
    goals: 0,
    assists: 0,
    matches: youngster.matches,
    joinDate: gameState.week
  };
  
  gameState.squad.push(promoted);
  gameState.academy = gameState.academy.filter(y => y.name !== name);
  gameState.weeklyExpenses += 1500;
  
  return { success: true, message: `${name} ascendido a primer equipo` };
}

// VENDER JUGADOR
function sellPlayer(name) {
  const player = gameState.squad.find(p => p.name === name);
  if (!player) return { success: false, message: 'Jugador no encontrado' };
  
  const salePrice = player.overall * 5000 + (player.matches * 1000);
  gameState.balance += salePrice;
  gameState.squad = gameState.squad.filter(p => p.name !== name);
  gameState.weeklyExpenses -= player.salary;
  
  return { success: true, message: `${name} vendido por ${salePrice}€`, salePrice };
}

// SIMULAR PARTIDO
function playMatch() {
  const rivals = Object.keys(gameState.standings).filter(t => t !== gameState.team);
  const rival = rivals[Math.floor(Math.random() * rivals.length)];
  
  // Modificador por formación y mentalidad
  let myGoals = Math.floor(Math.random() * 5);
  let rivalGoals = Math.floor(Math.random() * 5);
  
  if (gameState.mentality === 'offensive') myGoals += 1;
  if (gameState.mentality === 'defensive') rivalGoals -= 1;
  
  // Actualizar estadísticas
  gameState.standings[gameState.team].pj++;
  gameState.standings[rival].pj++;
  gameState.standings[gameState.team].gf += Math.max(0, myGoals);
  gameState.standings[gameState.team].gc += Math.max(0, rivalGoals);
  gameState.standings[rival].gf += Math.max(0, rivalGoals);
  gameState.standings[rival].gc += Math.max(0, myGoals);
  
  if (myGoals > rivalGoals) {
    gameState.standings[gameState.team].pts += 3;
    gameState.standings[gameState.team].g++;
    gameState.standings[rival].p++;
  } else if (myGoals < rivalGoals) {
    gameState.standings[rival].pts += 3;
    gameState.standings[rival].g++;
    gameState.standings[gameState.team].p++;
  } else {
    gameState.standings[gameState.team].pts += 1;
    gameState.standings[gameState.team].e++;
    gameState.standings[rival].pts += 1;
    gameState.standings[rival].e++;
  }
  
  gameState.matchHistory.push({
    week: gameState.week,
    home: gameState.team,
    away: rival,
    score: `${Math.max(0, myGoals)}-${Math.max(0, rivalGoals)}`
  });
  
  gameState.week++;
  gameState.balance += 3000; // Ingresos por partido
  
  return { 
    home: gameState.team, 
    away: rival, 
    homeGoals: Math.max(0, myGoals), 
    awayGoals: Math.max(0, rivalGoals) 
  };
}

// EXPANDIR ESTADIO
function expandStadium() {
  if (gameState.balance < 50000) {
    return { success: false, message: 'Dinero insuficiente' };
  }
  
  gameState.balance -= 50000;
  gameState.stadiumCapacity += 10000;
  gameState.weeklyIncome += 500;
  
  return { success: true, message: `Estadio expandido a ${gameState.stadiumCapacity} espectadores` };
}

// MEJORAR INSTALACIONES
function improveFacilities() {
  if (gameState.balance < 30000) {
    return { success: false, message: 'Dinero insuficiente' };
  }
  
  gameState.balance -= 30000;
  gameState.trainingLevel++;
  
  return { success: true, message: `Centro de entrenamiento mejorado a nivel ${gameState.trainingLevel}` };
}

// CONTRATAR STAFF
function hireStaff(position) {
  const costs = { analista: 4000, scout: 3000, medico: 5000, entrenador: 3000 };
  const cost = costs[position] || 0;
  
  if (gameState.balance < cost) {
    return { success: false, message: 'Dinero insuficiente' };
  }
  
  gameState.balance -= cost;
  gameState.staff[position] = true;
  gameState.weeklyExpenses += 500;
  
  return { success: true, message: 'Personal contratado' };
}

// GUARDAR EN FIREBASE
async function saveToFirebase(userId) {
  try {
    gameState.userId = userId;
    const saveRef = ref(db, `saves/${userId}/current`);
    await set(saveRef, gameState);
    return { success: true, message: 'Partida guardada en la nube' };
  } catch (error) {
    console.error('Error guardando:', error);
    return { success: false, message: 'Error al guardar' };
  }
}

// CARGAR DE FIREBASE
async function loadFromFirebase(userId) {
  try {
    const saveRef = ref(db, `saves/${userId}/current`);
    const snapshot = await get(saveRef);
    if (snapshot.exists()) {
      gameState = snapshot.val();
      return { success: true, message: 'Partida cargada desde la nube' };
    }
    return { success: false, message: 'No hay partida guardada' };
  } catch (error) {
    console.error('Error cargando:', error);
    return { success: false, message: 'Error al cargar' };
  }
}

// OBTENER ESTADO DEL JUEGO
function getGameState() {
  return gameState;
}

// ACTUALIZAR ESTADO
function updateGameState(updates) {
  gameState = { ...gameState, ...updates };
  return gameState;
}

export { 
  gameState, 
  initStandings, 
  selectTeam, 
  signPlayer, 
  signYoungster, 
  promoteYoungster, 
  sellPlayer, 
  playMatch,
  expandStadium,
  improveFacilities,
  hireStaff,
  saveToFirebase,
  loadFromFirebase,
  getGameState,
  updateGameState
};
