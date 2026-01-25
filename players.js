// players.js - Base de datos de jugadores profesionales y cantera

const PROFESSIONAL_PLAYERS = [
  { name: 'Vinicius Jr', position: 'EXT', age: 24, overall: 92, salary: 15000, cost: 180000 },
  { name: 'Rodri', position: 'MED', age: 27, overall: 91, salary: 12000, cost: 150000 },
  { name: 'Bellingham', position: 'MED', age: 21, overall: 88, salary: 10000, cost: 120000 },
  { name: 'Haaland', position: 'DEL', age: 24, overall: 90, salary: 18000, cost: 200000 },
  { name: 'Lewandowski', position: 'DEL', age: 36, overall: 86, salary: 14000, cost: 100000 },
  { name: 'Mbappé', position: 'EXT', age: 25, overall: 91, salary: 16000, cost: 190000 },
  { name: 'Koundé', position: 'DEF', age: 25, overall: 84, salary: 8000, cost: 100000 },
  { name: 'Martínez', position: 'DEF', age: 25, overall: 85, salary: 9000, cost: 110000 },
  { name: 'Alaba', position: 'DEF', age: 32, overall: 84, salary: 10000, cost: 90000 },
  { name: 'Pedri', position: 'MED', age: 21, overall: 85, salary: 7000, cost: 100000 },
  { name: 'Gavi', position: 'MED', age: 20, overall: 81, salary: 6000, cost: 80000 },
  { name: 'Osimhen', position: 'DEL', age: 25, overall: 86, salary: 11000, cost: 130000 },
  { name: 'Vlahovic', position: 'DEL', age: 24, overall: 84, salary: 10000, cost: 120000 },
  { name: 'Lautaro', position: 'DEL', age: 26, overall: 86, salary: 12000, cost: 140000 },
  { name: 'Grealish', position: 'EXT', age: 28, overall: 82, salary: 9000, cost: 110000 },
  { name: 'Saka', position: 'EXT', age: 23, overall: 83, salary: 8500, cost: 105000 },
  { name: 'Jude Bellingham', position: 'MED', age: 20, overall: 87, salary: 9500, cost: 115000 },
  { name: 'Florian Wirtz', position: 'EXT', age: 21, overall: 84, salary: 8000, cost: 100000 },
  { name: 'Nico Williams', position: 'EXT', age: 22, overall: 82, salary: 7500, cost: 95000 },
  { name: 'Vinícius Tobías', position: 'DEF', age: 23, overall: 79, salary: 6000, cost: 75000 }
];

const YOUNGSTERS = [
  { name: 'Gavi Paéz', age: 19, overall: 75, potential: 92, cost: 50000 },
  { name: 'Casadó', age: 18, overall: 72, potential: 88, cost: 40000 },
  { name: 'Ethan Ampadu', age: 21, overall: 76, potential: 86, cost: 55000 },
  { name: 'Alejandro Balde', age: 19, overall: 74, potential: 85, cost: 45000 },
  { name: 'Ansu Fati', age: 21, overall: 77, potential: 87, cost: 60000 },
  { name: 'Ferrán Torres', age: 23, overall: 80, potential: 86, cost: 65000 },
  { name: 'Pablo Barrios', age: 20, overall: 73, potential: 84, cost: 42000 },
  { name: 'Sergiño Dest', age: 23, overall: 78, potential: 85, cost: 58000 },
  { name: 'Jaume Costa', age: 22, overall: 76, potential: 83, cost: 50000 },
  { name: 'Alejandro Marques', age: 20, overall: 71, potential: 82, cost: 38000 }
];

// Función para obtener jugador aleatorio del mercado
function getRandomPlayer() {
  return {
    ...PROFESSIONAL_PLAYERS[Math.floor(Math.random() * PROFESSIONAL_PLAYERS.length)],
    loan: Math.random() > 0.7 // 30% en cesión
  };
}

// Función para obtener joven aleatorio
function getRandomYoungster() {
  return YOUNGSTERS[Math.floor(Math.random() * YOUNGSTERS.length)];
}

// Función para generar jugadores disponibles
function generateAvailablePlayers(count = 15) {
  const available = [];
  for (let i = 0; i < count; i++) {
    available.push(getRandomPlayer());
  }
  return available;
}

// Función para generar jóvenes disponibles
function generateAvailableYoungsters(count = 10) {
  const available = [];
  const used = new Set();
  while (available.length < count && available.length < YOUNGSTERS.length) {
    const idx = Math.floor(Math.random() * YOUNGSTERS.length);
    if (!used.has(idx)) {
      available.push({ ...YOUNGSTERS[idx] });
      used.add(idx);
    }
  }
  return available;
}

export { PROFESSIONAL_PLAYERS, YOUNGSTERS, getRandomPlayer, getRandomYoungster, generateAvailablePlayers, generateAvailableYoungsters };
