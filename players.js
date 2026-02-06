// players.js - Base de datos de jugadores profesionales y cantera  


import { ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS, STAFF_LEVEL_EFFECTS, TEAMS_DATA } from './config.js';  
  
// Combinar todos los equipos de TEAMS_DATA para la generación de jugadores de la IA  
const ALL_AI_CLUBS = [  
    ...TEAMS_DATA.primera,  
    ...TEAMS_DATA.segunda,  
    ...TEAMS_DATA.rfef_grupo1, // Ahora usa los grupos separados  
    ...TEAMS_DATA.rfef_grupo2  // Ahora usa los grupos separados  
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
        // Fallback si la posición del jugador no tiene pesos definidos, promediar todos los atributos.  
        // Esto es útil si se permiten posiciones no estándar o si un jugador se alinea en una posición "no natural".  
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
    
    for (const attr of ATTRIBUTES) {  
        const weight = weights[attr] || 0;  
        overallSum += (player[attr] || 0) * weight;  
        totalWeight += weight;  
    }  
    
    if (totalWeight === 0) {  
        // Si no hay pesos definidos o son cero, usar el promedio simple.  
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
  // Algunos jugadores de otros equipos para el mercado inicial  
  { name: 'Rodri Hernández', position: 'MC', age: 27, salary: 12000, value: 150000, club: 'Man City', EN: 85, VE: 75, RE: 90, AG: 80, CA: 85, EF: 80, MO: 90, AT: 80, DF: 90, foot: 'Diestro' },  
  { name: 'Jude Bellingham', position: 'MCO', age: 21, salary: 10000, value: 120000, club: 'Real Madrid', EN: 75, VE: 85, RE: 85, AG: 88, CA: 85, EF: 88, MO: 90, AT: 90, DF: 70, foot: 'Diestro' },  
  { name: 'Erling Haaland', position: 'DC', age: 24, salary: 18000, value: 200000, club: 'Man City', EN: 60, VE: 90, RE: 80, AG: 80, CA: 90, EF: 95, MO: 90, AT: 93, DF: 40, foot: 'Zurdo' },  
  { name: 'Kylian Mbappé', position: 'EXT', age: 25, salary: 16000, value: 190000, club: 'PSG', EN: 65, VE: 97, RE: 88, AG: 92, CA: 80, EF: 92, MO: 90, AT: 95, DF: 55, foot: 'Diestro' },  
];  
  
const YOUNGSTERS_BASE = [  
  { name: 'Gavi', position: 'MC', age: 19, salary: 1000, value: 50000, club: 'FC Barcelona', EN: 65, VE: 70, RE: 75, AG: 78, CA: 68, EF: 70, MO: 75, AT: 72, DF: 65, foot: 'Diestro', potential: 92 },  
  { name: 'Lamine Yamal', position: 'EXT', age: 17, salary: 800, value: 40000, club: 'FC Barcelona', EN: 55, VE: 85, RE: 70, AG: 70, CA: 65, EF: 75, MO: 70, AT: 78, DF: 50, foot: 'Zurdo', potential: 94 },  
  { name: 'Endrick', position: 'DC', age: 18, salary: 900, value: 45000, club: 'Real Madrid', EN: 50, VE: 80, RE: 65, AG: 70, CA: 70, EF: 80, MO: 70, AT: 82, DF: 40, foot: 'Zurdo', potential: 93 },  
  { name: 'Arda Güler', position: 'MCO', age: 19, salary: 700, value: 35000, club: 'Real Madrid', EN: 45, VE: 70, RE: 60, AG: 68, CA: 75, EF: 70, MO: 65, AT: 70, DF: 45, foot: 'Zurdo', potential: 90 },  
];  
  
  
let ALL_AVAILABLE_PLAYERS = [];  
let ALL_AVAILABLE_YOUNGSTERS = [];  
  
function generateRandomPlayer(minOverallTarget, maxOverallTarget) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 18 + Math.floor(Math.random() * 15); // 18 a 32 años  
    const club = ALL_AI_CLUBS[Math.floor(Math.random() * ALL_AI_CLUBS.length)]; // Usar ALL_AI_CLUBS  
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
  
    player.transferListed = Math.random() < 0.3;  
    player.loanListed = Math.random() < 0.2 && age < 25;  
    player.askingPrice = player.value + Math.floor(Math.random() * player.value * 0.5);  
    player.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.5 * player.salary) : 0;  
  
    return player;  
}  
  
  
function generateRandomYoungster(minOverallTarget, maxOverallTarget, isStar = false) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 16 + Math.floor(Math.random() * 3);  
    const club = ALL_AI_CLUBS[Math.floor(Math.random() * ALL_AI_CLUBS.length)]; // Usar ALL_AI_CLUBS  
    const foot = generateRandomFoot();  
  
    const youngster = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: club,  
        foot: foot,  
        matches: 0,  
        form: 70 + Math.floor(Math.random() * 10),  
        isInjured: false,  
        weeksOut: 0,  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 10), Math.min(100, maxOverallTarget + 5))  
    };  
  
    youngster.overall = calculateOverall(youngster);  
    youngster.potential = youngster.overall + Math.floor(Math.random() * (95 - youngster.overall));  
  
    if (isStar) {  
        youngster.potential = Math.min(100, youngster.potential + 10 + Math.floor(Math.random() * 10));  
        youngster.overall = Math.min(90, youngster.overall + 5 + Math.floor(Math.random() * 5));  
    }  
  
    youngster.salary = Math.floor(youngster.overall * 50 + Math.random() * 200);  
    youngster.value = Math.floor(youngster.overall * 1000 + youngster.potential * 500 + youngster.salary * 5);  
    youngster.cost = youngster.value;  
  
    return youngster;  
}  
  
  
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
        if (!fullPlayer.potential) fullPlayer.potential = fullPlayer.overall + Math.floor(Math.random() * (100 - fullPlayer.overall));  
  
        fullPlayer.transferListed = Math.random() < 0.1;  
        fullPlayer.loanListed = Math.random() < 0.05 && fullPlayer.age < 25;  
        fullPlayer.askingPrice = fullPlayer.value + Math.floor(Math.random() * fullPlayer.value * 0.2);  
        fullPlayer.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * fullPlayer.salary) : 0;  
  
        ALL_AVAILABLE_PLAYERS.push(fullPlayer);  
    });  
  
    for (let i = 0; i < 200; i++) {  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(65, 85));  
    }  
    for (let i = 0; i < 300; i++) {  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(45, 65));  
    }  
    return ALL_AVAILABLE_PLAYERS; // Devuelve la lista completa por si se usa en generateInitialSquad  
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
  
        ALL_AVAILABLE_YOUNGSTERS.push(fullYoungster);  
    });  
  
    for (let i = 0; i < 40; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(40, 60));  
    }  
    for (let i = 0; i < 10; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(50, 70, true));  
    }  
}  

// Añadir a players.js

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

// Equipos de élite (Primera División)
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
        overall_range: { min: 76, max: 90 },
        budget_multiplier: 3.5,
        min_starters: 11,
        starter_overall: 80
    },
    'Athletic Club': {
        overall_range: { min: 72, max: 85 },
        budget_multiplier: 2.5,
        min_starters: 11,
        starter_overall: 76
    },
    'Real Sociedad': {
        overall_range: { min: 72, max: 85 },
        budget_multiplier: 2.5,
        min_starters: 11,
        starter_overall: 76
    },
    'Villarreal CF': {
        overall_range: { min: 72, max: 85 },
        budget_multiplier: 2.5,
        min_starters: 11,
        starter_overall: 76
    },
    'Sevilla FC': {
        overall_range: { min: 72, max: 85 },
        budget_multiplier: 2.5,
        min_starters: 11,
        starter_overall: 76
    },
    'Valencia CF': {
        overall_range: { min: 72, max: 85 },
        budget_multiplier: 2.5,
        min_starters: 11,
        starter_overall: 76
    },
    'Real Betis': {
        overall_range: { min: 70, max: 82 },
        budget_multiplier: 2.0,
        min_starters: 11,
        starter_overall: 74
    }
};

/**
 * Genera una plantilla realista según división y equipo
 */
function generateRealisticSquad(teamName, division) {
    // Determinar si es equipo de élite
    const isElite = ELITE_TEAMS[teamName] !== undefined;
    const config = isElite ? ELITE_TEAMS[teamName] : DIVISION_QUALITY[division];
    
    const squad = [];
    const squadSize = Math.floor(
        Math.random() * (config.squad_size.max - config.squad_size.min + 1)
    ) + config.squad_size.min;
    
    // Distribución de posiciones
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
        'DC': Math.max(2, squadSize - 26)  // Resto son delanteros
    };
    
    // Generar jugadores por posición
    for (const [position, count] of Object.entries(positionDistribution)) {
        for (let i = 0; i < count; i++) {
            const isStarter = i === 0; // Primero de cada posición es titular
            
            let targetOverall;
            if (isStarter) {
                targetOverall = config.starter_overall || config.overall_range.min + 5;
            } else {
                targetOverall = config.bench_min || config.overall_range.min;
            }
            
            // Variación aleatoria
            targetOverall += Math.floor(Math.random() * 5) - 2;
            
            // Limitar al rango de la división
            targetOverall = Math.max(config.overall_range.min, 
                                    Math.min(config.overall_range.max, targetOverall));
            
            const player = generatePlayerWithTargetOverall(position, targetOverall, teamName);
            squad.push(player);
        }
    }
    
    return squad;
}

/**
 * Genera un jugador con un overall objetivo
 */
function generatePlayerWithTargetOverall(position, targetOverall, teamName) {
    const player = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: generateRandomName(),
        age: 18 + Math.floor(Math.random() * 17), // 18-34 años
        nationality: 'España',
        position: position,
        foot: Math.random() < 0.7 ? 'Derecho' : 'Zurdo',
        currentTeam: teamName
    };
    
    // Generar atributos para alcanzar el overall objetivo
    const weights = POSITION_ATTRIBUTE_WEIGHTS[position];
    const attributes = {};
    
    // Primera pasada: valores aleatorios
    for (const attr in weights) {
        attributes[attr] = 40 + Math.floor(Math.random() * 40); // 40-80
    }
    
    // Segunda pasada: ajustar para alcanzar overall objetivo
    let currentOverall = calculateOverallFromAttributes(attributes, weights);
    const diff = targetOverall - currentOverall;
    
    // Distribuir la diferencia proporcionalmente según los pesos
    for (const attr in weights) {
        const adjustment = diff * weights[attr];
        attributes[attr] = Math.max(30, Math.min(99, attributes[attr] + adjustment));
    }
    
    // Asignar atributos al jugador
    Object.assign(player, attributes);
    
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

// Exportar
window.generateRealisticSquad = generateRealisticSquad;



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
    if (filters.transferListed) {  
        filteredPlayers = filteredPlayers.filter(p => p.transferListed);  
    }  
    if (filters.loanListed) {  
        filteredPlayers = filteredPlayers.filter(p => p.loanListed);  
    }  
  
    let finalPlayers = [...filteredPlayers];  
    if (scoutLevel > 0) {  
        const scoutEffectMultiplier = STAFF_LEVEL_EFFECTS[scoutLevel]?.scoutQuality || 1;  
        // La probabilidad de encontrar nuevos jugadores debería ser inversamente proporcional al número ya encontrados  
        const currentFound = finalPlayers.length;  
        let dynamicScoutChance = 0.1 * scoutEffectMultiplier * (1 - (currentFound / 200)); // Disminuye si ya hay muchos  
        dynamicScoutChance = Math.max(0.01, dynamicScoutChance); // Mínimo 1% de oportunidad  
  
        if (Math.random() < dynamicScoutChance) {  
            const potentialFinds = ALL_AVAILABLE_PLAYERS.filter(p =>  
                !finalPlayers.some(fp => fp.name === p.name) &&  
                p.overall > (60 + scoutLevel * 5) &&  
                (p.transferListed || p.loanListed || Math.random() < 0.1 * scoutEffectMultiplier)  
            );  
            if (potentialFinds.length > 0) {  
                potentialFinds.sort((a,b) => b.overall - a.overall);  
                finalPlayers.push(...potentialFinds.slice(0, Math.min(3, potentialFinds.length)));  
            }  
        }  
    }  
  
    return finalPlayers  
        .sort((a, b) => b.overall - a.overall)  
        .slice(0, 50);  
}  
  
  
function getYoungsterMarket(filters = {}, scoutLevel = 0) {  
    let filteredYoungsters = [...ALL_AVAILABLE_YOUNGSTERS];  
  
    if (filters.minOverall) {  
        filteredYoungsters = filteredYoungsters.filter(p => p.overall >= filters.minOverall);  
    }  
    if (filters.maxAge) {  
        filteredYoungsters = filteredYoungsters.filter(p => p.age <= filters.maxAge);  
    }  
    if (filters.searchName) {  
        const searchTerm = filters.searchName.toLowerCase();  
        filteredYoungsters = filteredYoungsters.filter(p => p.name.toLowerCase().includes(searchTerm));  
    }  
    if (filters.minPotential) {  
        filteredYoungsters = filteredYoungsters.filter(p => p.potential >= filters.minPotential);  
    }  
  
    let finalYoungsters = [...filteredYoungsters];  
    if (scoutLevel > 0) {  
        const scoutEffectMultiplier = STAFF_LEVEL_EFFECTS[scoutLevel]?.scoutQuality || 1;  
        const currentFound = finalYoungsters.length;  
        let dynamicScoutChance = 0.2 * scoutEffectMultiplier * (1 - (currentFound / 50)); // Disminuye si ya hay muchos  
        dynamicScoutChance = Math.max(0.02, dynamicScoutChance); // Mínimo 2% de oportunidad  
  
        if (Math.random() < dynamicScoutChance) {  
            const potentialFinds = ALL_AVAILABLE_YOUNGSTERS.filter(y =>  
                !finalYoungsters.some(fy => fy.name === y.name) &&  
                y.potential > (70 + scoutLevel * 5)  
            );  
            if (potentialFinds.length > 0) {  
                potentialFinds.sort((a,b) => b.potential - a.potential);  
                finalYoungsters.push(...potentialFinds.slice(0, Math.min(5, potentialFinds.length)));  
            }  
        }  
    }  
  
    return finalYoungsters  
        .sort((a, b) => b.potential - a.potential)  
        .slice(0, 30);  
}  
  
initPlayerDatabase();  
initYoungsterDatabase();  
  
  
export {  
    ALL_AVAILABLE_PLAYERS,  
    ALL_AVAILABLE_YOUNGSTERS,  
    getPlayerMarket,  
    getYoungsterMarket,  
    initPlayerDatabase,  
    initYoungsterDatabase,  
    generateRandomName // Exportar para gameLogic.js  
};  
