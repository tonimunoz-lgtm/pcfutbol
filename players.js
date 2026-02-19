// players.js - Base de datos de jugadores profesionales y cantera  
// âœ… CORREGIDO: Campos contractType, contractYears y releaseClause
// âœ… NUEVO: Soporte para plantillas reales desde Firestore

import { ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS, STAFF_LEVEL_EFFECTS, TEAMS_DATA } from './config.js';  
  
// Combinar todos los equipos de TEAMS_DATA para la generaciÃ³n de jugadores de la IA  
const ALL_AI_CLUBS = [  
    ...TEAMS_DATA.primera,  
    ...TEAMS_DATA.segunda,  
    ...TEAMS_DATA.rfef_grupo1,
    ...TEAMS_DATA.rfef_grupo2  
];  
  
const PLAYER_FIRST_NAMES = [  
    "Juan", "Pedro", "Pablo", "Alberto", "Manuel", "Sergio", "Daniel", "Carlos", "Luis", "Francisco",  
    "Javier", "David", "JosÃ©", "Antonio", "Fernando", "Gonzalo", "Diego", "Miguel", "Ãlvaro", "AdriÃ¡n",  
    "IvÃ¡n", "Jorge", "RaÃºl", "Ricardo", "Roberto", "RubÃ©n", "Santiago", "SaÃºl", "SebastiÃ¡n", "Vicente",  
    "Marco", "Alejandro", "Gabriel", "Mario", "Ãngel", "HÃ©ctor", "Ã“scar", "Lucas", "Hugo", "Bruno",  
    "Guillermo", "Ignacio", "Enrique", "Emilio", "Arturo", "RamÃ³n", "CÃ©sar", "Israel", "JoaquÃ­n", "Rafael"  
];  
  
const PLAYER_LAST_NAMES = [  
    "GarcÃ­a", "FernÃ¡ndez", "GonzÃ¡lez", "RodrÃ­guez", "LÃ³pez", "MartÃ­nez", "SÃ¡nchez", "PÃ©rez", "GÃ³mez", "MartÃ­n",  
    "JimÃ©nez", "Ruiz", "HernÃ¡ndez", "DÃ­az", "Moreno", "MuÃ±oz", "Ãlvarez", "Romero", "Alonso", "Gutierrez",  
    "Navarro", "Torres", "RamÃ­rez", "Serrano", "Molina", "Ortiz", "Delgado", "Castro", "Rubio", "MarÃ­n",  
    "DomÃ­nguez", "Reyes", "VÃ¡zquez", "Cordero", "Cruz", "Guerrero", "Paredes", "Fuentes", "Flores", "BenÃ­tez"  
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

// âœ… FUNCIÃ“N: Calcular clÃ¡usula de rescisiÃ³n
function calculateReleaseClause(player) {
    let multiplier = 2.0;
    if (player.age < 25) multiplier += 0.5;
    if (player.potential && player.potential > 80) multiplier += 1.0;
    if (player.overall > 80) multiplier += 1.0;
    
    const baseClause = Math.round(player.value * multiplier);
    return Math.round(baseClause / 10000) * 10000;
}

// âœ… FUNCIÃ“N: Asignar tipo de contrato
function assignContractType() {
    return Math.random() < 0.8 ? 'owned' : 'loaned';
}

// âœ… FUNCIÃ“N: Asignar duraciÃ³n de contrato
function assignContractYears(contractType, age) {
    if (contractType === 'loaned') return 1;
    
    if (age < 23) return 3 + Math.floor(Math.random() * 3); // 3-5 aÃ±os
    if (age < 30) return 2 + Math.floor(Math.random() * 3); // 2-4 aÃ±os
    return 1 + Math.floor(Math.random() * 2); // 1-2 aÃ±os
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

// âœ… NUEVO: FunciÃ³n para cargar plantilla real de un equipo desde Firestore
async function loadTeamSquad(teamName) {
    if (window.getTeamData) {
        try {
            const teamData = await window.getTeamData(teamName);
            if (teamData && teamData.squad && Array.isArray(teamData.squad) && teamData.squad.length > 0) {
                console.log(`âœ… Cargando plantilla real de ${teamName}: ${teamData.squad.length} jugadores`);
                
                // Convertir jugadores bÃ¡sicos a jugadores completos con todos los campos necesarios
                return teamData.squad.map(player => {
                    const completedPlayer = {
                        ...player,
                        club: teamName,
                        currentTeam: teamName,
                        matches: player.matches || 0,
                        form: player.form || (75 + Math.floor(Math.random() * 15)),
                        isInjured: player.isInjured || false,
                        weeksOut: player.weeksOut || 0,
                        isSuspended: player.isSuspended || false,
                        yellowCards: player.yellowCards || 0,
                        redCards: player.redCards || 0,
                        minutesPlayed: player.minutesPlayed || 0,
                        goals: player.goals || 0,
                        assists: player.assists || 0,
                        history: player.history || []
                    };
                    
                    // Calcular overall si no existe
                    if (!completedPlayer.overall) {
                        completedPlayer.overall = calculateOverall(completedPlayer);
                    }
                    
                    // Calcular potential si no existe
                    if (!completedPlayer.potential) {
                        completedPlayer.potential = Math.min(99, completedPlayer.overall + Math.floor(Math.random() * 10));
                    }
                    
                    // Calcular salario si no existe
                    if (!completedPlayer.salary) {
                        completedPlayer.salary = Math.floor(completedPlayer.overall * 100 + completedPlayer.age * 50);
                    }
                    
                    // Calcular valor si no existe
                    if (!completedPlayer.value) {
                        completedPlayer.value = Math.floor(completedPlayer.overall * 2000 + completedPlayer.potential * 500);
                    }
                    
                    // Asignar pie si no existe
                    if (!completedPlayer.foot) {
                        completedPlayer.foot = generateRandomFoot();
                    }
                    
                    // Campos de contrato
                    if (!completedPlayer.contractType) {
                        completedPlayer.contractType = assignContractType();
                    }
                    if (!completedPlayer.contractYears) {
                        completedPlayer.contractYears = assignContractYears(completedPlayer.contractType, completedPlayer.age);
                    }
                    if (!completedPlayer.releaseClause) {
                        completedPlayer.releaseClause = calculateReleaseClause(completedPlayer);
                    }
                    
                    return completedPlayer;
                });
            }
        } catch (error) {
            console.warn(`âš ï¸ No se pudo cargar plantilla real de ${teamName}:`, error);
        }
    }
    return null;
}

// Base de jugadores de Ã©lite
const ELITE_PLAYERS_BASE = [  
  { name: 'Griezmann', position: 'DC', age: 33, salary: 15000, value: 180000, club: 'AtlÃ©tico Madrid', EN: 70, VE: 85, RE: 80, AG: 85, CA: 80, EF: 90, MO: 88, AT: 90, DF: 60, foot: 'Zurdo' },  
  { name: 'Koke', position: 'MC', age: 32, salary: 12000, value: 150000, club: 'AtlÃ©tico Madrid', EN: 80, VE: 70, RE: 88, AG: 80, CA: 80, EF: 85, MO: 85, AT: 80, DF: 80, foot: 'Diestro' },  
  { name: 'Oblak', position: 'POR', age: 31, salary: 10000, value: 120000, club: 'AtlÃ©tico Madrid', EN: 90, VE: 60, RE: 70, AG: 80, CA: 95, EF: 85, MO: 88, AT: 40, DF: 95, foot: 'Diestro' },  
  { name: 'Nahuel Molina', position: 'LD', age: 26, salary: 8000, value: 90000, club: 'AtlÃ©tico Madrid', EN: 80, VE: 85, RE: 85, AG: 75, CA: 70, EF: 70, MO: 80, AT: 75, DF: 80, foot: 'Diestro' },  
  { name: 'JosÃ© GimÃ©nez', position: 'DFC', age: 29, salary: 9000, value: 100000, club: 'AtlÃ©tico Madrid', EN: 90, VE: 70, RE: 85, AG: 90, CA: 85, EF: 75, MO: 85, AT: 50, DF: 90, foot: 'Diestro' },  
];  

// Base de jÃ³venes
const YOUNGSTERS_BASE = [  
  { name: 'Gavi', position: 'MC', age: 19, salary: 1000, value: 50000, club: 'FC Barcelona', EN: 65, VE: 70, RE: 75, AG: 78, CA: 68, EF: 70, MO: 75, AT: 72, DF: 65, foot: 'Diestro', potential: 92 },  
  { name: 'Lamine Yamal', position: 'EXT', age: 17, salary: 800, value: 40000, club: 'FC Barcelona', EN: 55, VE: 85, RE: 70, AG: 70, CA: 65, EF: 75, MO: 70, AT: 78, DF: 50, foot: 'Zurdo', potential: 94 },  
];  
  
let ALL_AVAILABLE_PLAYERS = [];  
let ALL_AVAILABLE_YOUNGSTERS = [];  

// âœ… CORREGIDO: Generar jugador aleatorio
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
  
    player.transferListed = Math.random() < 0.3;  
    player.loanListed = Math.random() < 0.2 && age < 25;  
    player.askingPrice = player.value + Math.floor(Math.random() * player.value * 0.5);  
    player.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * player.salary) : 0;  

    // âœ… CAMPOS DE CONTRATO
    player.contractType = assignContractType();
    player.contractYears = assignContractYears(player.contractType, age);
    player.releaseClause = calculateReleaseClause(player);
  
    return player;
}  

// âœ… CORREGIDO: Generar joven
function generateRandomYoungster(minOverallTarget, maxOverallTarget, highPotential = false) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 16 + Math.floor(Math.random() * 5);
  
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

    // âœ… JÃ“VENES = SIN CONTRATO (free agents)
    player.contractType = 'free_agent';
    player.contractYears = 0;
    player.releaseClause = 0;
  
    return player;  
}  

// âœ… CORREGIDO: Inicializar base de datos
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
        if (!fullPlayer.loanWageContribution) fullPlayer.loanWageContribution = 0;  

        // âœ… CAMPOS DE CONTRATO
        fullPlayer.contractType = assignContractType();
        fullPlayer.contractYears = assignContractYears(fullPlayer.contractType, fullPlayer.age);
        fullPlayer.releaseClause = calculateReleaseClause(fullPlayer);
  
        ALL_AVAILABLE_PLAYERS.push(fullPlayer);  
    });  
  
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

        // âœ… JÃ“VENES = FREE AGENTS
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

// ConfiguraciÃ³n de calidad por divisiÃ³n
const DIVISION_QUALITY = {
    primera: {
        overall_range: { min: 70, max: 95 },
        starter_min: 75,
        squad_size: { min: 22, max: 28 }
    },
    segunda: {
        overall_range: { min: 60, max: 80 },
        starter_min: 65,
        squad_size: { min: 20, max: 26 }
    },
    rfef_grupo1: {
        overall_range: { min: 50, max: 70 },
        starter_min: 55,
        squad_size: { min: 18, max: 24 }
    },
    rfef_grupo2: {
        overall_range: { min: 50, max: 70 },
        starter_min: 55,
        squad_size: { min: 18, max: 24 }
    }
};

// âœ… MODIFICADO: generateRealisticSquad con soporte para plantillas reales
export async function generateRealisticSquad(teamName, division) {
    // ðŸ”¥ PRIMERO: Intentar cargar plantilla real desde Firestore
    const realSquad = await loadTeamSquad(teamName);
    if (realSquad && realSquad.length > 0) {
        console.log(`âœ… Usando plantilla real de ${teamName} (${realSquad.length} jugadores)`);
        return realSquad;
    }
    
    // ðŸ”„ FALLBACK: Si no hay plantilla real, generar aleatoriamente
    console.log(`âš™ï¸ Generando plantilla aleatoria para ${teamName}`);
    
    const config = DIVISION_QUALITY[division];
    const squad = [];
    const squadSize = config.squad_size.min + Math.floor(Math.random() * (config.squad_size.max - config.squad_size.min + 1));
    
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
            let targetOverall = isStarter ? config.starter_min : config.overall_range.min;
            targetOverall += Math.floor(Math.random() * 5) - 2;
            targetOverall = Math.max(config.overall_range.min, Math.min(config.overall_range.max, targetOverall));
            
            const player = generatePlayerWithTargetOverall(position, targetOverall, teamName);
            squad.push(player);
        }
    }
    
    return squad;
}

// âœ… CORREGIDO: generatePlayerWithTargetOverall
function generatePlayerWithTargetOverall(position, targetOverall, teamName) {
    const age = 18 + Math.floor(Math.random() * 17);
    
    const player = {
        name: generateRandomName(),
        age: age,
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

    // âœ… CAMPOS DE CONTRATO
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

// ✅ MERCADO HÍBRIDO: jugadores reales de Firestore + generados de relleno
let FIRESTORE_MARKET_PLAYERS = [];
let MARKET_LOADED_FROM_FIRESTORE = false;

/**
 * Carga el mercado desde Firestore. Llamar al inicio del juego.
 */
async function loadMarketFromFirestore(mySquadNames = []) {
    if (window.getTransferMarket) {
        try {
            const firestorePlayers = await window.getTransferMarket(mySquadNames);
            FIRESTORE_MARKET_PLAYERS = firestorePlayers.map(p => {
                const completed = { ...p };
                if (!completed.overall) completed.overall = calculateOverall(completed);
                if (!completed.potential) completed.potential = Math.min(99, completed.overall + Math.floor(Math.random() * 10));
                if (!completed.salary) completed.salary = Math.floor(completed.overall * 100 + (completed.age || 25) * 50);
                if (!completed.value) completed.value = Math.floor(completed.overall * 2000 + completed.potential * 500);
                if (!completed.foot) completed.foot = generateRandomFoot();
                if (!completed.askingPrice) completed.askingPrice = Math.floor(completed.value * (1 + Math.random() * 0.5));
                if (!completed.contractType) completed.contractType = 'owned';
                if (!completed.contractYears) completed.contractYears = assignContractYears(completed.contractType, completed.age || 25);
                if (!completed.releaseClause) completed.releaseClause = calculateReleaseClause(completed);
                if (completed.loanListed === undefined) completed.loanListed = false;
                if (completed.loanWageContribution === undefined) completed.loanWageContribution = 0;
                completed.transferListed = true;
                return completed;
            });
            MARKET_LOADED_FROM_FIRESTORE = true;
            console.log('✅ Mercado de Firestore: ' + FIRESTORE_MARKET_PLAYERS.length + ' jugadores reales');
        } catch (error) {
            console.warn('⚠️ No se pudo cargar mercado de Firestore:', error);
            FIRESTORE_MARKET_PLAYERS = [];
        }
    }
    initPlayerDatabase();
}

/**
 * Elimina un jugador del mercado en memoria y en Firestore.
 */
function removeFromMarketByName(playerName, originalTeam) {
    FIRESTORE_MARKET_PLAYERS = FIRESTORE_MARKET_PLAYERS.filter(p => p.name !== playerName);
    ALL_AVAILABLE_PLAYERS = ALL_AVAILABLE_PLAYERS.filter(p => p.name !== playerName);
    if (originalTeam && window.removePlayerFromMarket) {
        window.removePlayerFromMarket(playerName, originalTeam).catch(err => {
            console.warn('⚠️ No se pudo eliminar del mercado Firestore:', err);
        });
    }
}

// Funciones de mercado
function getPlayerMarket(filters = {}, mySquadNames = []) {
    // Combinar reales (Firestore) + generados, sin duplicados por nombre
    const realNames = new Set(FIRESTORE_MARKET_PLAYERS.map(p => p.name.toLowerCase()));
    const generatedFiltered = ALL_AVAILABLE_PLAYERS.filter(p => !realNames.has(p.name.toLowerCase()));
    let allMarket = [...FIRESTORE_MARKET_PLAYERS, ...generatedFiltered];

    // Excluir los que ya están en mi plantilla
    const mySquadSet = new Set(mySquadNames.map(n => n.toLowerCase()));
    allMarket = allMarket.filter(p => !mySquadSet.has((p.name || '').toLowerCase()));

    let filteredPlayers = allMarket;

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
        filteredPlayers = filteredPlayers.filter(p => p.transferListed === true);
    }
    if (filters.loanListed) {
        filteredPlayers = filteredPlayers.filter(p => p.loanListed === true);
    }

    const scoutLevel = filters.scoutLevel || 0;
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

// Inicializar al cargar
initPlayerDatabase();
initYoungsterDatabase();
  
export {
    initPlayerDatabase,
    initYoungsterDatabase,
    getPlayerMarket,
    getYoungsterMarket,
    generateRandomName,
    calculateReleaseClause,
    assignContractType,
    assignContractYears,
    loadTeamSquad,
    loadMarketFromFirestore,
    removeFromMarketByName
};
