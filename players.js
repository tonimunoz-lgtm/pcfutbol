// players.js - Base de datos de jugadores profesionales y cantera  
  
// Lista de clubes de ejemplo (de todas las divisiones para la IA)  
const AI_CLUBS = [  
    'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Athletic Club', 'Villarreal CF',  
    'Real Sociedad', 'Real Betis', 'Valencia CF', 'Girona FC', 'Real Mallorca',  
    'Las Palmas', 'Rayo Vallecano', 'Sevilla FC', 'Osasuna', 'Celta de Vigo',  
    'Real Oviedo', 'RCD Español', 'Real Valladolid', 'Levante UD', 'Real Elche CF',  
    'Albacete', 'Andorra', 'Alcorcón', 'Eibar', 'Huesca', 'Ferrol', 'Tenerife', 'Sabadell', 'Mirandés', 'Burgos',  
    'Lugo', 'Córdoba', 'Ibiza', 'Alcoyano', 'Real Unión', 'Zaragoza', 'Lleida', 'Málaga', 'Cádiz', 'Ponferradina',  
    'AD Alcalá', 'Cerdanyola', 'Talavera', 'Fuenlabrada', 'Alcalá', 'Getafe B', 'Torrejón', 'Alcorcón B', 'Móstoles', 'Cieza',  
    'Mérida', 'Utrera', 'Coria', 'Extremadura', 'Villanovense', 'Córdoba B', 'Linares', 'San Roque', 'Poli Ejido', 'Jaén'  
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
  
  
// Jugadores de élite (referencia para generar otros)  
const ELITE_PLAYERS_BASE = [  
  { name: 'Vinicius Jr', position: 'EXT', age: 24, overall: 92, potential: 95, salary: 15000, value: 180000, club: 'Real Madrid' },  
  { name: 'Rodri', position: 'MED', age: 27, overall: 91, potential: 92, salary: 12000, value: 150000, club: 'Man City' },  
  { name: 'Bellingham', position: 'MED', age: 21, overall: 88, potential: 94, salary: 10000, value: 120000, club: 'Real Madrid' },  
  { name: 'Haaland', position: 'DEL', age: 24, overall: 90, potential: 96, salary: 18000, value: 200000, club: 'Man City' },  
  { name: 'Mbappé', position: 'EXT', age: 25, overall: 91, potential: 97, salary: 16000, value: 190000, club: 'PSG' },  
  { name: 'Koundé', position: 'DEF', age: 25, overall: 84, potential: 88, salary: 8000, value: 100000, club: 'FC Barcelona' },  
  { name: 'Pedri', position: 'MED', age: 21, overall: 85, potential: 93, salary: 7000, value: 100000, club: 'FC Barcelona' },  
  { name: 'Gavi', position: 'MED', age: 20, overall: 81, potential: 92, salary: 6000, value: 80000, club: 'FC Barcelona' },  
  { name: 'Osimhen', position: 'DEL', age: 25, overall: 86, potential: 90, salary: 11000, value: 130000, club: 'Napoli' },  
  { name: 'Vlahovic', position: 'DEL', age: 24, overall: 84, potential: 88, salary: 10000, value: 120000, club: 'Juventus' },  
];  
  
const YOUNGSTERS_BASE = [  
  { name: 'Gavi Paéz', age: 19, overall: 75, potential: 92, salary: 1000, value: 50000, club: 'FC Barcelona' },  
  { name: 'Casadó', age: 18, overall: 72, potential: 88, salary: 800, value: 40000, club: 'FC Barcelona' },  
  { name: 'Ethan Ampadu', age: 21, overall: 76, potential: 86, salary: 1200, value: 55000, club: 'Leeds' },  
  { name: 'Alejandro Balde', age: 19, overall: 74, potential: 85, salary: 900, value: 45000, club: 'FC Barcelona' },  
  { name: 'Ansu Fati', age: 21, overall: 77, potential: 87, salary: 1500, value: 60000, club: 'Brighton' },  
  { name: 'Pablo Barrios', age: 20, overall: 73, potential: 84, salary: 850, value: 42000, club: 'Atlético Madrid' },  
  { name: 'Florian Wirtz', position: 'MED', age: 21, overall: 84, potential: 93, salary: 4000, value: 100000, club: 'Leverkusen' },  
  { name: 'Nico Williams', position: 'EXT', age: 22, overall: 82, potential: 89, salary: 3500, value: 95000, club: 'Athletic Club' },  
];  
  
// Función para generar un jugador aleatorio más genérico  
function generateRandomPlayer(minOverall, maxOverall) {  
    const positions = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MD', 'MI', 'EXT', 'DC'];  
    const age = 18 + Math.floor(Math.random() * 15); // 18 a 32 años  
    const overall = minOverall + Math.floor(Math.random() * (maxOverall - minOverall));  
    const potential = overall + Math.floor(Math.random() * (100 - overall)); // Potencial siempre mayor o igual al overall  
    const salary = Math.floor(500 + Math.random() * 10000); // 500 a 10500  
    const value = Math.floor(overall * 1000 + potential * 500 + salary * 5); // Valor de mercado  
    const club = AI_CLUBS[Math.floor(Math.random() * AI_CLUBS.length)];  
    const position = positions[Math.floor(Math.random() * positions.length)];  
  
    return {  
        name: generateRandomName(),  
        position: position,  
        age: age,  
        overall: overall,  
        potential: potential,  
        salary: salary,  
        value: value,  
        club: club,  
        matches: 0,  
        // Estado inicial de un jugador para el mercado  
        transferListed: Math.random() < 0.3, // 30% de posibilidades de estar transferible  
        loanListed: Math.random() < 0.2 && age < 25, // 20% de cesión, solo jóvenes  
        askingPrice: value + Math.floor(Math.random() * value * 0.5), // Precio que pide el club (entre 1x y 1.5x el valor)  
        loanWageContribution: Math.random() < 0.5 ? Math.floor(Math.random() * 0.5 * salary) : 0 // Cuánto contribuye el club de origen al salario en cesión  
    };  
}  
  
  
// Base de datos completa de jugadores generados  
let ALL_AVAILABLE_PLAYERS = [];  
  
// Inicializa la base de datos de jugadores con una mezcla de élite y generados  
function initPlayerDatabase() {  
    ALL_AVAILABLE_PLAYERS = [];  
    // Añadir los jugadores de élite como referencia  
    ELITE_PLAYERS_BASE.forEach(p => ALL_AVAILABLE_PLAYERS.push({  
        ...p,  
        potential: p.potential || p.overall + Math.floor(Math.random() * (100 - p.overall)),  
        matches: 0,  
        transferListed: Math.random() < 0.1, // Baja probabilidad de transferibles  
        loanListed: Math.random() < 0.05 && p.age < 25,  
        askingPrice: p.value + Math.floor(Math.random() * p.value * 0.2),  
        loanWageContribution: Math.random() < 0.5 ? Math.floor(Math.random() * 0.3 * p.salary) : 0  
    }));  
  
    // Generar una gran cantidad de jugadores aleatorios de diferentes niveles  
    for (let i = 0; i < 200; i++) { // Jugadores de nivel medio-alto  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(65, 85));  
    }  
    for (let i = 0; i < 300; i++) { // Jugadores de nivel medio-bajo  
        ALL_AVAILABLE_PLAYERS.push(generateRandomPlayer(45, 65));  
    }  
}  
  
// Generar jóvenes de cantera con nombres aleatorios y clubes específicos  
let ALL_AVAILABLE_YOUNGSTERS = [];  
  
function initYoungsterDatabase() {  
    ALL_AVAILABLE_YOUNGSTERS = [];  
    YOUNGSTERS_BASE.forEach(y => ALL_AVAILABLE_YOUNGSTERS.push({  
        ...y,  
        matches: 0,  
        cost: y.value // El costo inicial para jóvenes es su valor  
    }));  
  
    // Generar más jóvenes talentos aleatorios  
    for (let i = 0; i < 50; i++) {  
        const age = 16 + Math.floor(Math.random() * 3); // 16-18 años  
        const overall = 40 + Math.floor(Math.random() * 20); // 40-60  
        const potential = overall + Math.floor(Math.random() * (95 - overall)); // Potencial alto  
        const salary = Math.floor(200 + Math.random() * 800); // Salario bajo  
        const value = Math.floor(overall * 500 + potential * 300 + salary * 2);  
        const club = AI_CLUBS[Math.floor(Math.random() * AI_CLUBS.length)];  
  
        ALL_AVAILABLE_YOUNGSTERS.push({  
            name: generateRandomName(),  
            age: age,  
            overall: overall,  
            potential: potential,  
            salary: salary,  
            value: value,  
            cost: value, // Para canteranos, el coste inicial es el valor  
            club: club,  
            matches: 0  
        });  
    }  
}  
  
  
// --- Funciones para el mercado (usan ALL_AVAILABLE_PLAYERS) ---  
function getPlayerMarket(filters = {}) {  
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
  
    // Devolver un número razonable de jugadores, ordenados por overall  
    return filteredPlayers  
        .sort((a, b) => b.overall - a.overall)  
        .slice(0, 50); // Limitar a 50 jugadores en el mercado para no sobrecargar  
}  
  
  
function getYoungsterMarket(filters = {}) {  
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
  
    return filteredYoungsters  
        .sort((a, b) => b.potential - a.potential)  
        .slice(0, 30); // Limitar a 30 jóvenes en el mercado  
}  
  
// Inicializa las bases de datos al cargar el módulo  
initPlayerDatabase();  
initYoungsterDatabase();  
  
  
export {  
    ALL_AVAILABLE_PLAYERS, // Para referencia, aunque es mejor usar getPlayerMarket  
    ALL_AVAILABLE_YOUNGSTERS, // Para referencia, aunque es mejor usar getYoungsterMarket  
    getPlayerMarket,  
    getYoungsterMarket,  
    initPlayerDatabase, // Exportar para poder reiniciarla si es necesario  
    initYoungsterDatabase  
};  
