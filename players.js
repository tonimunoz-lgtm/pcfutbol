// players.js - Base de datos de jugadores profesionales y cantera  
// ✅ MODIFICADO: Añadidos campos contractType, contractYears y releaseClause

import { ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS, STAFF_LEVEL_EFFECTS, TEAMS_DATA } from './config.js';  
  
// Combinar todos los equipos de TEAMS_DATA para la generación de jugadores de la IA  
const ALL_AI_CLUBS = [  
    ...TEAMS_DATA.primera,  
    ...TEAMS_DATA.segunda,  
    ...TEAMS_DATA.rfef_grupo1,
    ...TEAMS_DATA.rfef_grupo2  
];  
  
const PLAYER_FIRST_NAMES = [  
    "Juan", "Pedro", "Pablo", "Alberto", "Manuel", "Sergio", "Daniel", "Carlos", "Luis", "Francisco",  
    "Javier", "David", "José", "Antonio", "Fernando", "Gonzalo", "Diego", "Miguel", "Álvaro", "Adrián",  
    "Iván", "Jorge", "Raúl", "Ricardo", "Roberto", "Rubén", "Santiago", "Saúl", "Sebastián", "Vicente",  
    "Marco", "Alejandro", "Gabriel", "Mario", "Ángel", "Héctor", "Óscar", "Lucas", "Hugo", "Bruno",  
    "Guillermo", "Ignacio", "Enrique", "Emilio", "Arturo", "Ramón", "César", "Israel", "Joaquín", "Rafael"  
];  
  
const PLAYER_LAST_NAMES = [  
    "García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín",  
    "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutierrez",  
    "Navarro", "Torres", "Ramírez", "Serrano", "Molina", "Ortiz", "Delgado", "Castro", "Rubio", "Marín",  
    "Domínguez", "Reyes", "Vázquez", "Cordero", "Cruz", "Guerrero", "Paredes", "Fuentes", "Flores", "Benítez"  
];  
  
function generateRandomName() {  
    const firstName = PLAYER_FIRST_NAMES[Math.floor(Math.random() * PLAYER_FIRST_NAMES.length)];  
    const lastName1 = PLAYER_LAST_NAMES[Math.floor(Math.random() * PLAYER_LAST_NAMES.length)];  
    let lastName2Initial = '';  
    do {  
        lastName2Initial = PLAYER_LAST_NAMES[Math.floor(Math.random() * PLAYER_LAST_NAMES.length)][0];  
    } while (lastName2Initial.toLowerCase() === lastName1[0].toLowerCase());  
        
    return `${firstName} ${lastName1} ${lastName2Initial}.`;  
}  
  
export function calculateOverall(player) {  
    const weights = POSITION_ATTRIBUTE_WEIGHTS[player.position];  
    if (!weights) {  
        let overallSum = 0;  
        let count = 0;  
        for (const attr of ATTRIBUTES) {  
            if (player[attr] !== undefined) {  
                overallSum += player[attr];  
                count++;  
            }  
        }  
        return count > 0 ? Math.round(overallSum / count) : 0;  
    }  
    
    let overallSum = 0;  
    let totalWeight = 0;  
    for (const attr in weights) {  
        if (player[attr] !== undefined) {  
            overallSum += player[attr] * weights[attr];  
            totalWeight += weights[attr];  
        }  
    }  
    
    if (totalWeight === 0) {  
        let simpleOverallSum = 0;  
        let count = 0;  
        for (const attr of ATTRIBUTES) {  
            if (player[attr] !== undefined) {  
                simpleOverallSum += player[attr];  
                count++;  
            }  
        }  
        return count > 0 ? Math.round(simpleOverallSum / count) : 0;  
    }  
    
    return Math.round(overallSum / totalWeight);  
}  

// ✅ NUEVA FUNCIÓN: Calcular cláusula de rescisión basada en valor
function calculateReleaseClause(player) {
    // Fórmula: Entre 2x y 5x el valor del jugador
    // Jugadores jóvenes y con alto potencial tienen cláusulas más altas
    let multiplier = 2 + Math.random() * 3; // 2x a 5x
    
    if (player.age < 25) multiplier += 0.5;
    if (player.potential && player.potential > 80) multiplier += 1;
    if (player.overall > 80) multiplier += 1;
    
    const baseClause = Math.round(player.value * multiplier);
    // Redondear a múltiplos de 10.000
    return Math.round(baseClause / 10000) * 10000;
}

// ✅ NUEVA FUNCIÓN: Asignar tipo de contrato aleatorio
function assignContractType() {
    // 80% contratados, 20% cedidos
    return Math.random() < 0.8 ? 'owned' : 'loaned';
}

// ✅ NUEVA FUNCIÓN: Asignar duración de contrato
function assignContractYears(contractType, age) {
    if (contractType === 'loaned') {
        return 1; // Cedidos siempre 1 año
    }
    
    // Contratados: 1-5 años según edad
    if (age < 23) return 3 + Math.floor(Math.random() * 3); // 3-5 años para jóvenes
    if (age < 30) return 2 + Math.floor(Math.random() * 3); // 2-4 años
    return 1 + Math.floor(Math.random() * 2); // 1-2 años para veteranos
}
  
function generateRandomAttributes(minVal, maxVal) {  
    const attrs = {};  
    for (const attr of ATTRIBUTES) {  
        attrs[attr] = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));  
    }  
    return attrs;  
}  
  
function generateRandomFoot() {  
    const feet = ['Diestro', 'Zurdo', 'Ambidiestro'];  
    return feet[Math.floor(Math.random() * feet.length)];  
}  

// ✅ MODIFICADO: Base de jugadores de élite con nuevos campos
const ELITE_PLAYERS_BASE = [  
  { name: 'Griezmann', position: 'DC', age: 33, salary: 15000, value: 180000, club: 'Atlético Madrid', EN: 70, VE: 85, RE: 80, AG: 85, CA: 80, EF: 90, MO: 88, AT: 90, DF: 60, foot: 'Zurdo' },  
  { name: 'Koke', position: 'MC', age: 32, salary: 12000, value: 150000, club: 'Atlético Madrid', EN: 80, VE: 70, RE: 88, AG: 80, CA: 80, EF: 85, MO: 85, AT: 80, DF: 80, foot: 'Diestro' },  
  { name: 'Oblak', position: 'POR', age: 31, salary: 10000, value: 120000, club: 'Atlético Madrid', EN: 90, VE: 60, RE: 70, AG: 80, CA: 95, EF: 85, MO: 88, AT: 40, DF: 95, foot: 'Diestro' },  
  { name: 'Nahuel Molina', position: 'LD', age: 26, salary: 8000, value: 90000, club: 'Atlético Madrid', EN: 80, VE: 85, RE: 85, AG: 75, CA: 70, EF: 70, MO: 80, AT: 75, DF: 80, foot: 'Diestro' },  
  { name: 'José Giménez', position: 'DFC', age: 29, salary: 9000, value: 100000, club: 'Atlético Madrid', EN: 90, VE: 70, RE: 85, AG: 90, CA: 85, EF: 75, MO: 85, AT: 50, DF: 90, foot: 'Diestro' },  
  { name: 'Axel Witsel', position: 'MC', age: 35, salary: 6000, value: 30000, club: 'Atlético Madrid', EN: 80, VE: 65, RE: 80, AG: 70, CA: 75, EF: 70, MO: 75, AT: 65, DF: 75, foot: 'Diestro' },  
  { name: 'Samuel Lino', position: 'EXT', age: 24, salary: 7000, value: 80000, club: 'Atlético Madrid', EN: 60, VE: 88, RE: 80, AG: 82, CA: 70, EF: 80, MO: 80, AT: 85, DF: 50, foot: 'Diestro' },  
  { name: 'Álvaro Morata', position: 'DC', age: 31, salary: 10000, value: 100000, club: 'Atlético Madrid', EN: 60, VE: 80, RE: 75, AG: 70, CA: 80, EF: 85, MO: 82, AT: 85, DF: 40, foot: 'Diestro' },  
  { name: 'Reinildo Mandava', position: 'LI', age: 30, salary: 6500, value: 50000, club: 'Atlético Madrid', EN: 85, VE: 78, RE: 80, AG: 80, CA: 70, EF: 70, MO: 78, AT: 50, DF: 85, foot: 'Zurdo' },  
  { name: 'Marcos Llorente', position: 'MD', age: 29, salary: 9000, value: 95000, club: 'Atlético Madrid', EN: 75, VE: 85, RE: 90, AG: 80, CA: 75, EF: 75, MO: 85, AT: 80, DF: 70, foot: 'Diestro' },  
  { name: 'Pablo Barrios', position: 'MC', age: 21, salary: 3000, value: 40000, club: 'Atlético Madrid', EN: 70, VE: 78, RE: 80, AG: 75, CA: 70, EF: 75, MO: 78, AT: 75, DF: 70, foot: 'Diestro' },  
  { name: 'Rodri Hernández', position: 'MC', age: 27, salary: 12000, value: 150000, club: 'Man City', EN: 85, VE: 75, RE: 90, AG: 80, CA: 85, EF: 80, MO: 90, AT: 80, DF: 90, foot: 'Diestro' },  
  { name: 'Jude Bellingham', position: 'MCO', age: 21, salary: 10000, value: 120000, club: 'Real Madrid', EN: 75, VE: 85, RE: 85, AG: 88, CA: 85, EF: 88, MO: 90, AT: 90, DF: 70, foot: 'Diestro' },  
  { name: 'Erling Haaland', position: 'DC', age: 24, salary: 18000, value: 200000, club: 'Man City', EN: 60, VE: 90, RE: 80, AG: 80, CA: 90, EF: 95, MO: 90, AT: 93, DF: 40, foot: 'Zurdo' },  
  { name: 'Kylian Mbappé', position: 'EXT', age: 25, salary: 16000, value: 190000, club: 'PSG', EN: 65, VE: 97, RE: 88, AG: 92, CA: 80, EF: 92, MO: 90, AT: 95, DF: 55, foot: 'Diestro' },  
];  

// ✅ MODIFICADO: Base de jóvenes con nuevos campos
const YOUNGSTERS_BASE = [  
  { name: 'Gavi', position: 'MC', age: 19, salary: 1000, value: 50000, club: 'FC Barcelona', EN: 65, VE: 70, RE: 75, AG: 78, CA: 68, EF: 70, MO: 75, AT: 72, DF: 65, foot: 'Diestro', potential: 92 },  
  { name: 'Lamine Yamal', position: 'EXT', age: 17, salary: 800, value: 40000, club: 'FC Barcelona', EN: 55, VE: 85, RE: 70, AG: 70, CA: 65, EF: 75, MO: 70, AT: 78, DF: 50, foot: 'Zurdo', potential: 94 },  
  { name: 'Endrick', position: 'DC', age: 18, salary: 900, value: 45000, club: 'Real Madrid', EN: 50, VE: 80, RE: 65, AG: 70, CA: 70, EF: 80, MO: 70, AT: 82, DF: 40, foot: 'Zurdo', potential: 93 },  
  { name: 'Arda Güler', position: 'MCO', age: 19, salary: 700, value: 35000, club: 'Real Madrid', EN: 45, VE: 70, RE: 60, AG: 68, CA: 75, EF: 70, MO: 65, AT: 70, DF: 45, foot: 'Zurdo', potential: 90 },  
];  
  
let ALL_AVAILABLE_PLAYERS = [];  
let ALL_AVAILABLE_YOUNGSTERS = [];  

// ✅ MODIFICADO: Generar jugador aleatorio con nuevos campos de contrato
function generateRandomPlayer(minOverallTarget, maxOverallTarget) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 18 + Math.floor(Math.random() * 15);
    const club = ALL_AI_CLUBS[Math.floor(Math.random() * ALL_AI_CLUBS.length)];
    const foot = generateRandomFoot();  
  
    const player = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: club,  
        foot: foot,  
        matches: 0,  
        form: 75 + Math.floor(Math.random() * 10),  
        isInjured: false,  
        weeksOut: 0,  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 20), Math.min(100, maxOverallTarget + 10))  
    };  
  
    player.overall = calculateOverall(player);  
    player.potential = player.overall + Math.floor(Math.random() * (100 - player.overall));  
  
    player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000);  
    player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5);  

    // ✅ NUEVOS CAMPOS DE CONTRATO
    player.contractType = assignContractType(); // 'owned' o 'loaned'
    player.contractYears = assignContractYears(player.contractType, age);
    player.releaseClause = calculateReleaseClause(player);
  
    player.transferListed = Math.random() < 0.3;  
    player.loanListed = Math.random() < 0.2 && age < 25;  
    player.askingPrice = player.value + Math.floor(Math.random() * player.value * 0.5);  
    player.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * player.salary) : 0;  
  
    return player;
}  

// ✅ MODIFICADO: Generar joven con nuevos campos
function generateRandomYoungster(minOverallTarget, maxOverallTarget, highPotential = false) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 16 + Math.floor(Math.random() * 5); // 16-20 años  
  
    const player = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: 'Libre',  
        foot: generateRandomFoot(),  
        matches: 0,  
        form: 60 + Math.floor(Math.random() * 20),  
        isInjured: false,  
        weeksOut: 0,  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 10), Math.min(99, maxOverallTarget + 10))  
    };  
  
    player.overall = calculateOverall(player);  
    player.potential = highPotential  
        ? Math.min(99, player.overall + 15 + Math.floor(Math.random() * 15))  
        : player.overall + Math.floor(Math.random() * (90 - player.overall) * 0.5);  
  
    player.salary = Math.floor(player.overall * 30 + Math.random() * 200);  
    player.value = Math.floor(player.overall * 500 + player.potential * 800);  
    player.cost = Math.floor(player.value * (0.5 + Math.random() * 0.5));  

    // ✅ NUEVOS CAMPOS DE CONTRATO (jóvenes sin contrato inicial)
    player.contractType = 'free_agent';
    player.contractYears = 0;
    player.releaseClause = 0;
  
    return player;  
}  

// ✅ MODIFICADO: Inicializar base de datos con nuevos campos
function initPlayerDatabase() {  
    ALL_AVAILABLE_PLAYERS = [];  
    ELITE_PLAYERS_BASE.forEach(p => {  
        const fullPlayer = {  
            ...p,  
            matches: 0,  
            form: 80 + Math.floor(Math.random() * 10),  
            isInjured: false,  
            weeksOut: 0  
        };  
        if (!fullPlayer.overall) fullPlayer.overall = calculateOverall(fullPlayer);  
        if (!fullPlayer.potential) fullPlayer.potential = fullPlayer.overall + Math.floor(Math.random() * (95 - fullPlayer.overall));  
        if (!fullPlayer.askingPrice) fullPlayer.askingPrice = fullPlayer.value + Math.floor(Math.random() * fullPlayer.value * 0.5);  
        if (!fullPlayer.loanListed) fullPlayer.loanListed = false;  
        if (!fullPlayer.loanWageContribution) fullPlayer.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * fullPlayer.salary) : 0;  

        // ✅ ASIGNAR NUEVOS CAMPOS A JUGADORES DE ÉLITE
        fullPlayer.contractType = assignContractType();
        fullPlayer.contractYears = assignContractYears(fullPlayer.contractType, fullPlayer.age);
        fullPlayer.releaseClause = calculateReleaseClause(fullPlayer);
  
        ALL_AVAILABLE_PLAYERS.push(fullPlayer);  
    });  
  
    // Generar 500 jugadores aleatorios
    for (let i = 0; i < 200; i++) {  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(65, 85));  
    }  
    for (let i = 0; i < 300; i++) {  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(45, 65));  
    }  
    return ALL_AVAILABLE_PLAYERS;
}  
  
function initYoungsterDatabase() {  
    ALL_AVAILABLE_YOUNGSTERS = [];  
    YOUNGSTERS_BASE.forEach(y => {  
        const fullYoungster = {  
            ...y,  
            matches: 0,  
            form: 70 + Math.floor(Math.random() * 10),  
            isInjured: false,  
            weeksOut: 0  
        };  
        if (!fullYoungster.overall) fullYoungster.overall = calculateOverall(fullYoungster);  
        if (!fullYoungster.potential) fullYoungster.potential = fullYoungster.overall + Math.floor(Math.random() * (95 - fullYoungster.overall));  
        if (!fullYoungster.cost) fullYoungster.cost = fullYoungster.value;  

        // ✅ ASIGNAR NUEVOS CAMPOS A JÓVENES
        fullYoungster.contractType = 'free_agent';
        fullYoungster.contractYears = 0;
        fullYoungster.releaseClause = 0;
  
        ALL_AVAILABLE_YOUNGSTERS.push(fullYoungster);  
    });  
  
    for (let i = 0; i < 40; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(40, 60));  
    }  
    for (let i = 0; i < 10; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(50, 70, true));  
    }  
}  

// Configuración de calidad por división (resto del código igual...)
const DIVISION_QUALITY = {
    primera: {
        overall_range: { min: 70, max: 95 },
        starter_min: 75,
        bench_min: 70,
        youth_max: 72,
        squad_size: { min: 22, max: 28 },
        salaryMultiplier: 1.5
    },
    segunda: {
        overall_range: { min: 60, max: 80 },
        starter_min: 65,
        bench_min: 60,
        youth_max: 62,
        squad_size: { min: 20, max: 26 },
        salaryMultiplier: 1.0
    },
    rfef_grupo1: {
        overall_range: { min: 50, max: 70 },
        starter_min: 55,
        bench_min: 50,
        youth_max: 52,
        squad_size: { min: 18, max: 24 },
        salaryMultiplier: 0.5
    },
    rfef_grupo2: {
        overall_range: { min: 50, max: 70 },
        starter_min: 55,
        bench_min: 50,
        youth_max: 52,
        squad_size: { min: 18, max: 24 },
        salaryMultiplier: 0.5
    }
};

const ELITE_TEAMS = {
    'Real Madrid': {
        overall_range: { min: 80, max: 95 },
        budget_multiplier: 5.0,
        min_starters: 11,
        starter_overall: 85
    },
    'FC Barcelona': {
        overall_range: { min: 78, max: 94 },
        budget_multiplier: 4.5,
        min_starters: 11,
        starter_overall: 83
    },
    'Atlético Madrid': {
        overall_range: { min: 75, max: 90 },
        budget_multiplier: 3.5,
        min_starters: 11,
        starter_overall: 80
    },
    'Sevilla': {
        overall_range: { min: 72, max: 86 },
        budget_multiplier: 2.5,
        min_starters: 11,
        starter_overall: 76
    }
};

// ✅ MODIFICADO: generateRealisticSquad con nuevos campos
export function generateRealisticSquad(teamName, division) {
    const config = ELITE_TEAMS[teamName] ? ELITE_TEAMS[teamName] : DIVISION_QUALITY[division];
    
    const squad = [];
    const squadSize = Math.floor(
        Math.random() * (config.squad_size.max - config.squad_size.min + 1)
    ) + config.squad_size.min;
    
    const positionDistribution = {
        'POR': 3,
        'DFC': 5,
        'LI': 2,
        'LD': 2,
        'MC': 5,
        'MCO': 2,
        'MD': 2,
        'MI': 2,
        'EXT': 3,
        'DC': Math.max(2, squadSize - 26)
    };
    
    for (const [position, count] of Object.entries(positionDistribution)) {
        for (let i = 0; i < count; i++) {
            const isStarter = i === 0;
            
            let targetOverall;
            if (isStarter) {
                targetOverall = config.starter_overall || config.overall_range.min + 5;
            } else {
                targetOverall = config.bench_min || config.overall_range.min;
            }
            
            targetOverall += Math.floor(Math.random() * 5) - 2;
            targetOverall = Math.max(config.overall_range.min, 
                                    Math.min(config.overall_range.max, targetOverall));
            
            const player = generatePlayerWithTargetOverall(position, targetOverall, teamName);
            squad.push(player);
        }
    }
    
    return squad;
}

// ✅ MODIFICADO: generatePlayerWithTargetOverall con nuevos campos
function generatePlayerWithTargetOverall(position, targetOverall, teamName) {
    const age = 18 + Math.floor(Math.random() * 17);
    
    const player = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: generateRandomName(),
        age: age,
        nationality: 'España',
        position: position,
        foot: Math.random() < 0.7 ? 'Diestro' : 'Zurdo',
        currentTeam: teamName,
        matches: 0,
        form: 75 + Math.floor(Math.random() * 15),
        isInjured: false,
        weeksOut: 0
    };
    
    const weights = POSITION_ATTRIBUTE_WEIGHTS[position];
    const attributes = {};
    
    for (const attr in weights) {
        attributes[attr] = 40 + Math.floor(Math.random() * 40);
    }
    
    let currentOverall = calculateOverallFromAttributes(attributes, weights);
    const diff = targetOverall - currentOverall;
    
    for (const attr in weights) {
        const adjustment = diff * weights[attr];
        attributes[attr] = Math.max(30, Math.min(99, attributes[attr] + adjustment));
    }
    
    Object.assign(player, attributes);
    player.overall = calculateOverall(player);
    player.potential = Math.min(99, player.overall + Math.floor(Math.random() * 15));
    player.salary = Math.floor(player.overall * 100 + player.age * 50);
    player.value = Math.floor(player.overall * 2000 + player.potential * 500);

    // ✅ ASIGNAR NUEVOS CAMPOS DE CONTRATO
    player.contractType = assignContractType();
    player.contractYears = assignContractYears(player.contractType, age);
    player.releaseClause = calculateReleaseClause(player);
    
    return player;
}

function calculateOverallFromAttributes(attributes, weights) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const attr in weights) {
        weightedSum += (attributes[attr] || 50) * weights[attr];
        totalWeight += weights[attr];
    }
    
    return Math.round(weightedSum / totalWeight);
}

// Funciones de mercado (resto igual...)
function getPlayerMarket(filters = {}, scoutLevel = 0) {  
    let filteredPlayers = [...ALL_AVAILABLE_PLAYERS];  
  
    if (filters.position && filters.position !== 'ALL') {  
        filteredPlayers = filteredPlayers.filter(p => p.position === filters.position);  
    }  
    if (filters.minOverall) {  
        filteredPlayers = filteredPlayers.filter(p => p.overall >= filters.minOverall);  
    }  
    if (filters.maxAge) {  
        filteredPlayers = filteredPlayers.filter(p => p.age <= filters.maxAge);  
    }  
    if (filters.searchName) {  
        const searchTerm = filters.searchName.toLowerCase();  
        filteredPlayers = filteredPlayers.filter(p => p.name.toLowerCase().includes(searchTerm));  
    }  
  
    const revealCount = Math.min(filteredPlayers.length, 30 + scoutLevel * 10);  
    return filteredPlayers.slice(0, revealCount);  
}  
  
function getYoungsterMarket(filters = {}) {  
    let filteredYoungsters = [...ALL_AVAILABLE_YOUNGSTERS];  
  
    if (filters.position && filters.position !== 'ALL') {  
        filteredYoungsters = filteredYoungsters.filter(y => y.position === filters.position);  
    }  
    if (filters.maxCost) {  
        filteredYoungsters = filteredYoungsters.filter(y => y.cost <= filters.maxCost);  
    }  
  
    return filteredYoungsters.slice(0, Math.min(filteredYoungsters.length, 20));  
}  
  
export {  
    initPlayerDatabase,  
    initYoungsterDatabase,  
    getPlayerMarket,  
    getYoungsterMarket,  
    generateRandomName,
    calculateReleaseClause,
    assignContractType,
    assignContractYears
};
