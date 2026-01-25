// players.js - Base de datos de jugadores profesionales y cantera  
  
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
        for (const attr of ATTRIBUTES) {  
            overallSum += (player[attr] || 0);  
        }  
        return Math.round(overallSum / ATTRIBUTES.length);  
    }  
  
    let overallSum = 0;  
    let totalWeight = 0;  
  
    for (const attr of ATTRIBUTES) {  
        const weight = weights[attr] || 0;  
        overallSum += (player[attr] || 0) * weight;  
        totalWeight += weight;  
    }  
  
    if (totalWeight === 0) {  
        let simpleOverallSum = 0;  
        for (const attr of ATTRIBUTES) {  
            simpleOverallSum += (player[attr] || 0);  
        }  
        return Math.round(simpleOverallSum / ATTRIBUTES.length);  
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
        if (Math.random() < (0.1 * scoutEffectMultiplier)) {  
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
        if (Math.random() < (0.2 * scoutEffectMultiplier)) {  
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
