// players.js - Base de datos de jugadores profesionales y cantera  
  
// Importar ATRIBUTOS y POSITION_ATTRIBUTE_WEIGHTS  
import { ATTRIBUTES, POSITIONS, POSITION_ATTRIBUTE_WEIGHTS } from './config.js';  
  
// Lista de clubes de ejemplo (de todas las divisiones para la IA)  
const AI_CLUBS = [  
    'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Athletic Club', 'Villarreal CF',  
    'Real Sociedad', 'Real Betis', 'Valencia CF', 'Girona FC', 'Real Mallorca',  
    'Las Palmas', 'Rayo Vallecano', 'Sevilla FC', 'Osasuna', 'Celta de Vigo',  
    'Real Oviedo', 'RCD Español', 'Real Valladolid', 'Levante UD', 'Real Elche CF',  
    'Albacete', 'Andorra', 'Alcorcón', 'Eibar', 'Huesca', 'Ferrol', 'Tenerife', 'Sabadell', 'Mirandés', 'Burgos',  
    'Lugo', 'Córdoba', 'Ibiza', 'Alcoyano', 'Real Unión', 'Zaragoza', 'Lleida', 'Málaga', 'Cádiz', 'Ponferradina',  
    // Equipos de RFEF para la generación de jugadores (de config.js)  
    'RC Deportivo', 'FC Barcelona B', 'Real Madrid Castilla', 'Racing Ferrol', 'Celta B',  
    'Rayo Majadahonda', 'Cultural Leonesa', 'Real Unión', 'SD Logroñés', 'Unionistas Salamanca',  
    'Córdoba CF', 'AD Ceuta FC', 'CD Castellón', 'Alcoyano', 'Atlético Baleares',  
    'Linares Deportivo', 'UD Ibiza', 'CF Intercity', 'Antequera CF', 'Recreativo Granada',  
    'CD Numancia', 'UD Logroñés', 'San Fernando CD', 'UD Melilla', 'UE Cornellà', 'CF Fuenlabrada',  
    'Atlético Sanluqueño', 'Mérida AD', 'Algeciras CF', 'Real Murcia CF'  
];  
  
// Lista de nombres de jugadores para generar más variedad  
const PLAYER_NAMES = [  
    "Juan", "Pedro", "Pablo", "Alberto", "Manuel", "Sergio", "Daniel", "Carlos", "Luis", "Francisco",  
    "Javier", "David", "José", "Antonio", "Fernando", "Gonzalo", "Diego", "Miguel", "Álvaro", "Adrián",  
    "Iván", "Jorge", "Raúl", "Ricardo", "Roberto", "Rubén", "Santiago", "Saúl", "Sebastián", "Vicente"  
];  
  
const PLAYER_LAST_NAMES = [  
    "García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín",  
    "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutierrez"  
];  
  
// Genera un nombre aleatorio  
function generateRandomName() {  
    const firstName = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];  
    const lastName = PLAYER_LAST_NAMES[Math.floor(Math.random() * PLAYER_LAST_NAMES.length)];  
    return `${firstName} ${lastName}`;  
}  
  
// Función para calcular el Overall a partir de los atributos y la posición  
export function calculateOverall(player) {  
    const weights = POSITION_ATTRIBUTE_WEIGHTS[player.position];  
    if (!weights) {  
        // Fallback a un cálculo simple si no hay pesos específicos para la posición  
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
  
  
// Genera atributos base aleatorios para un jugador  
function generateRandomAttributes(minVal, maxVal) {  
    const attrs = {};  
    for (const attr of ATTRIBUTES) {  
        attrs[attr] = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));  
    }  
    return attrs;  
}  
  
// Genera una pierna dominante aleatoria  
function generateRandomFoot() {  
    const feet = ['Diestro', 'Zurdo', 'Ambidiestro'];  
    return feet[Math.floor(Math.random() * feet.length)];  
}  
  
// Jugadores de élite (referencia para generar otros) - Ahora con atributos  
const ELITE_PLAYERS_BASE = [  
  { name: 'Griezmann', position: 'DC', age: 33, salary: 15000, value: 180000, club: 'Atlético Madrid', EN: 70, VE: 85, RE: 80, AG: 85, CA: 80, EF: 90, MO: 88, AT: 90, DF: 60, foot: 'Zurdo' },  
  { name: 'Koke', position: 'MC', age: 32, salary: 12000, value: 150000, club: 'Atlético Madrid', EN: 80, VE: 70, RE: 88, AG: 80, CA: 80, EF: 85, MO: 85, AT: 80, DF: 80, foot: 'Diestro' },  
  { name: 'Oblak', position: 'POR', age: 31, salary: 10000, value: 120000, club: 'Atlético Madrid', EN: 90, VE: 60, RE: 70, AG: 80, CA: 95, EF: 85, MO: 88, AT: 40, DF: 95, foot: 'Diestro' },  
  { name: 'Filipe Luis', position: 'LI', age: 39, salary: 8000, value: 50000, club: 'Flamengo', EN: 75, VE: 70, RE: 75, AG: 70, CA: 70, EF: 65, MO: 70, AT: 60, DF: 75, foot: 'Zurdo' }, // Ejemplo de jugador veterano  
  { name: 'Rodri', position: 'MC', age: 27, salary: 12000, value: 150000, club: 'Man City', EN: 85, VE: 75, RE: 90, AG: 80, CA: 85, EF: 80, MO: 90, AT: 80, DF: 90, foot: 'Diestro' },  
  { name: 'Bellingham', position: 'MCO', age: 21, salary: 10000, value: 120000, club: 'Real Madrid', EN: 75, VE: 85, RE: 85, AG: 88, CA: 85, EF: 88, MO: 90, AT: 90, DF: 70, foot: 'Diestro' },  
  { name: 'Haaland', position: 'DC', age: 24, salary: 18000, value: 200000, club: 'Man City', EN: 60, VE: 90, RE: 80, AG: 80, CA: 90, EF: 95, MO: 90, AT: 93, DF: 40, foot: 'Zurdo' },  
  { name: 'Mbappé', position: 'EXT', age: 25, salary: 16000, value: 190000, club: 'PSG', EN: 65, VE: 97, RE: 88, AG: 92, CA: 80, EF: 92, MO: 90, AT: 95, DF: 55, foot: 'Diestro' },  
  { name: 'Koundé', position: 'DFC', age: 25, salary: 8000, value: 100000, club: 'FC Barcelona', EN: 88, VE: 80, RE: 85, AG: 78, CA: 80, EF: 75, MO: 85, AT: 50, DF: 90, foot: 'Diestro' },  
  { name: 'Pedri', position: 'MC', age: 21, salary: 7000, value: 100000, club: 'FC Barcelona', EN: 70, VE: 80, RE: 88, AG: 85, CA: 80, EF: 82, MO: 85, AT: 85, DF: 70, foot: 'Diestro' },  
  { name: 'Gavi', position: 'MC', age: 20, salary: 6000, value: 80000, club: 'FC Barcelona', EN: 75, VE: 78, RE: 85, AG: 88, CA: 75, EF: 78, MO: 82, AT: 80, DF: 75, foot: 'Diestro' },  
  { name: 'Osimhen', position: 'DC', age: 25, salary: 11000, value: 130000, club: 'Napoli', EN: 60, VE: 88, RE: 80, AG: 85, CA: 85, EF: 90, MO: 85, AT: 88, DF: 45, foot: 'Diestro' },  
  { name: 'Vlahovic', position: 'DC', age: 24, salary: 10000, value: 120000, club: 'Juventus', EN: 60, VE: 80, RE: 75, AG: 78, CA: 88, EF: 88, MO: 80, AT: 85, DF: 40, foot: 'Zurdo' },  
];  
  
const YOUNGSTERS_BASE = [  
  { name: 'Gavi Paéz', position: 'MC', age: 19, salary: 1000, value: 50000, club: 'FC Barcelona', EN: 65, VE: 70, RE: 75, AG: 78, CA: 68, EF: 70, MO: 75, AT: 72, DF: 65, foot: 'Diestro', potential: 92 },  
  { name: 'Casadó', position: 'MC', age: 18, salary: 800, value: 40000, club: 'FC Barcelona', EN: 60, VE: 65, RE: 70, AG: 70, CA: 65, EF: 68, MO: 70, AT: 65, DF: 60, foot: 'Diestro', potential: 88 },  
  { name: 'Ethan Ampadu', position: 'DFC', age: 21, salary: 1200, value: 55000, club: 'Leeds', EN: 70, VE: 68, RE: 72, AG: 70, CA: 70, EF: 68, MO: 75, AT: 60, DF: 75, foot: 'Diestro', potential: 86 },  
  { name: 'Alejandro Balde', position: 'LI', age: 19, salary: 900, value: 45000, club: 'FC Barcelona', EN: 60, VE: 75, RE: 70, AG: 72, CA: 60, EF: 65, MO: 70, AT: 68, DF: 70, foot: 'Zurdo', potential: 85 },  
  { name: 'Ansu Fati', position: 'EXT', age: 21, salary: 1500, value: 60000, club: 'Brighton', EN: 55, VE: 80, RE: 75, AG: 80, CA: 70, EF: 80, MO: 78, AT: 82, DF: 50, foot: 'Diestro', potential: 87 },  
];  
  
  
// Función para generar un jugador aleatorio más genérico (ahora con atributos)  
function generateRandomPlayer(minOverallTarget, maxOverallTarget) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 18 + Math.floor(Math.random() * 15); // 18 a 32 años  
    const club = AI_CLUBS[Math.floor(Math.random() * AI_CLUBS.length)];  
    const foot = generateRandomFoot();  
  
    const player = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: club,  
        foot: foot,  
        matches: 0,  
        form: 75 + Math.floor(Math.random() * 10), // Estado de forma inicial (75-85)  
        isInjured: false, // Por defecto no lesionado  
        weeksOut: 0, // Por defecto 0 semanas  
        // Atributos iniciales base  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 20), Math.min(100, maxOverallTarget + 10))  
    };  
  
    // Ajustar overall/potential después de generar atributos  
    player.overall = calculateOverall(player); // Recalcular overall con los nuevos atributos  
    player.potential = player.overall + Math.floor(Math.random() * (100 - player.overall)); // Potencial siempre mayor o igual al overall  
  
    player.salary = Math.floor(player.overall * 100 + player.age * 50 + Math.random() * 1000); // Salario basado en overall y edad  
    player.value = Math.floor(player.overall * 2000 + player.potential * 500 + player.salary * 5); // Valor de mercado  
  
    // Estado inicial de un jugador para el mercado  
    player.transferListed = Math.random() < 0.3; // 30% de posibilidades de estar transferible  
    player.loanListed = Math.random() < 0.2 && age < 25; // 20% de cesión, solo jóvenes  
    player.askingPrice = player.value + Math.floor(Math.random() * player.value * 0.5); // Precio que pide el club (entre 1x y 1.5x el valor)  
    player.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.5 * player.salary) : 0; // Cuánto contribuye el club de origen al salario en cesión  
  
    return player;  
}  
  
  
// Función para generar un joven talento (ahora con atributos y potencial)  
function generateRandomYoungster(minOverallTarget, maxOverallTarget, isStar = false) {  
    const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];  
    const age = 16 + Math.floor(Math.random() * 3); // 16-18 años  
    const club = AI_CLUBS[Math.floor(Math.random() * AI_CLUBS.length)];  
    const foot = generateRandomFoot();  
  
    const youngster = {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        club: club,  
        foot: foot,  
        matches: 0,  
        form: 70 + Math.floor(Math.random() * 10),  
        isInjured: false, // Por defecto no lesionado  
        weeksOut: 0, // Por defecto 0 semanas  
        ...generateRandomAttributes(Math.max(1, minOverallTarget - 10), Math.min(100, maxOverallTarget + 5))  
    };  
  
    youngster.overall = calculateOverall(youngster);  
    youngster.potential = youngster.overall + Math.floor(Math.random() * (95 - youngster.overall));  
  
    // Si es una estrella, boostear el potencial  
    if (isStar) {  
        youngster.potential = Math.min(100, youngster.potential + 10 + Math.floor(Math.random() * 10)); // +10 a +20 potencial  
        youngster.overall = Math.min(90, youngster.overall + 5 + Math.floor(Math.random() * 5)); // También un pequeño boost en overall inicial  
    }  
  
    youngster.salary = Math.floor(youngster.overall * 50 + Math.random() * 200); // Salario de juvenil  
    youngster.value = Math.floor(youngster.overall * 1000 + youngster.potential * 500 + youngster.salary * 5);  
    youngster.cost = youngster.value; // Para canteranos, el coste inicial es el valor  
  
    return youngster;  
}  
  
  
// Base de datos completa de jugadores generados  
let ALL_AVAILABLE_PLAYERS = [];  
  
function initPlayerDatabase() {  
    ALL_AVAILABLE_PLAYERS = [];  
    // Añadir los jugadores de élite como referencia  
    ELITE_PLAYERS_BASE.forEach(p => {  
        const fullPlayer = {  
            ...p,  
            matches: 0,  
            form: 80 + Math.floor(Math.random() * 10), // Estado de forma inicial para élite  
            isInjured: false,  
            weeksOut: 0  
        };  
        // overall y potential se calculan si no vienen ya calculados en ELITE_PLAYERS_BASE  
        if (!fullPlayer.overall) fullPlayer.overall = calculateOverall(fullPlayer);  
        if (!fullPlayer.potential) fullPlayer.potential = fullPlayer.overall + Math.floor(Math.random() * (100 - fullPlayer.overall));  
  
        fullPlayer.transferListed = Math.random() < 0.1;  
        fullPlayer.loanListed = Math.random() < 0.05 && fullPlayer.age < 25;  
        fullPlayer.askingPrice = fullPlayer.value + Math.floor(Math.random() * fullPlayer.value * 0.2);  
        fullPlayer.loanWageContribution = Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * fullPlayer.salary) : 0;  
  
        ALL_AVAILABLE_PLAYERS.push(fullPlayer);  
    });  
  
    // Generar una gran cantidad de jugadores aleatorios de diferentes niveles  
    for (let i = 0; i < 200; i++) { // Jugadores de nivel medio-alto  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(65, 85));  
    }  
    for (let i = 0; i < 300; i++) { // Jugadores de nivel medio-bajo  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(45, 65));  
    }  
}  
  
let ALL_AVAILABLE_YOUNGSTERS = [];  
  
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
  
    // Generar más jóvenes talentos aleatorios  
    for (let i = 0; i < 40; i++) {  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(40, 60)); // Juveniles normales  
    }  
    // Generar algunas estrellas juveniles  
    for (let i = 0; i < 10; i++) { // 10 juveniles estrella  
        ALL_AVAILABLE_YOUNGSTERS.push(generateRandomYoungster(50, 70, true)); // minOverallTarget, maxOverallTarget, isStar  
    }  
}  
  
  
// --- Funciones para el mercado (usan ALL_AVAILABLE_PLAYERS) ---  
// Estas son las que gameLogic.js importará y re-exportará  
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
  
    // --- Efecto del Scout ---  
    // Si el scout es bueno, se "descubren" jugadores de mejor calidad que no aparecían antes  
    let finalPlayers = [...filteredPlayers];  
    if (scoutLevel > 0) {  
        const scoutEffectMultiplier = STAFF_LEVEL_EFFECTS[scoutLevel]?.scoutQuality || 1;  
        // La calidad se refiere a la probabilidad de encontrar talentos o jugadores de alto overall  
        if (Math.random() < (0.1 * scoutEffectMultiplier)) { // Ejemplo: 10% * efecto_scout  
            const potentialFinds = ALL_AVAILABLE_PLAYERS.filter(p =>  
                !finalPlayers.some(fp => fp.name === p.name) && // Que no esté ya en la lista  
                p.overall > (60 + scoutLevel * 5) && // El scout descubre jugadores de mayor media  
                (p.transferListed || p.loanListed || Math.random() < 0.1 * scoutEffectMultiplier) // o los hace "visiblemente" transferibles  
            );  
            // Añadir un par de los mejores descubrimientos  
            if (potentialFinds.length > 0) {  
                potentialFinds.sort((a,b) => b.overall - a.overall);  
                finalPlayers.push(...potentialFinds.slice(0, Math.min(3, potentialFinds.length)));  
            }  
        }  
    }  
  
  
    // Devolver un número razonable de jugadores, ordenados por overall  
    return finalPlayers  
        .sort((a, b) => b.overall - a.overall)  
        .slice(0, 50); // Limitar a 50 jugadores en el mercado para no sobrecargar  
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
  
    // --- Efecto del Scout en juveniles ---  
    let finalYoungsters = [...filteredYoungsters];  
    if (scoutLevel > 0) {  
        const scoutEffectMultiplier = STAFF_LEVEL_EFFECTS[scoutLevel]?.scoutQuality || 1;  
        if (Math.random() < (0.2 * scoutEffectMultiplier)) { // Más probable encontrar buenos juveniles  
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
        .slice(0, 30); // Limitar a 30 jóvenes en el mercado  
}  
  
// Inicializa las bases de datos al cargar el módulo  
initPlayerDatabase();  
initYoungsterDatabase();  
  
  
export {  
    ALL_AVAILABLE_PLAYERS,  
    ALL_AVAILABLE_YOUNGSTERS,  
    getPlayerMarket,  
    getYoungsterMarket,  
    initPlayerDatabase,  
    initYoungsterDatabase  
};  
