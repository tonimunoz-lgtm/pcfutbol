// config.js - Configuración y datos globales  
  
let firebaseAvailable = false;  
let db = null;  
let auth = null;  
  
try {  
    console.log('Firebase disponible pero deshabilitado (usar localStorage)');  
} catch (e) {  
    console.log('Firebase no disponible, usando almacenamiento local');  
}  
  
const TEAMS_DATA = {  
    primera: [  
        'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Athletic Club', 'Villarreal CF',  
        'Real Sociedad', 'Real Betis', 'Valencia CF', 'Girona FC', 'Real Mallorca',  
        'Las Palmas', 'Rayo Vallecano', 'Sevilla FC', 'Osasuna', 'Celta de Vigo',  
        'Real Oviedo', 'RCD Español', 'Real Valladolid', 'Levante UD', 'Real Elche CF'  
    ],  
    segunda: [  
        'Albacete', 'Andorra', 'Alcorcón', 'Eibar', 'Huesca', 'Ferrol', 'Tenerife', 'Sabadell', 'Mirandés', 'Burgos',  
        'Lugo', 'Córdoba', 'Ibiza', 'Alcoyano', 'Real Unión', 'Zaragoza', 'Lleida', 'Málaga', 'Cádiz', 'Ponferradina'  
    ],  
    rfef: [  
        'AD Alcalá', 'Cerdanyola', 'Talavera', 'Fuenlabrada', 'Alcalá', 'Getafe B', 'Torrejón', 'Alcorcón B', 'Móstoles', 'Cieza',  
        'Mérida', 'Utrera', 'Coria', 'Extremadura', 'Villanovense', 'Córdoba B', 'Linares', 'San Roque', 'Poli Ejido', 'Jaén'  
    ]  
};  
  
// POSITIONS ahora incluye más variedad y es coherente con generateRandomPlayer  
const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MD', 'MI', 'EXT', 'DC'];  
  
const FORMATIONS = {  
    '433': { name: '4-3-3', type: 'Equilibrada' },  
    '442': { name: '4-4-2', type: 'Clásica' },  
    '352': { name: '3-5-2', type: 'Ofensiva' },  
    '541': { name: '5-4-1', type: 'Defensiva' },  
    '451': { name: '4-5-1', type: 'Mixta' }  
};  
  
const DIVISION_MULTIPLIERS = {  
    primera: 1.2,  
    segunda: 1.0,  
    rfef: 0.85  
};  
  
export {  
    firebaseAvailable,  
    db,  
    auth,  
    TEAMS_DATA,  
    POSITIONS, // Exportar POSITIONS  
    FORMATIONS,  
    DIVISION_MULTIPLIERS  
};  
