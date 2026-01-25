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
  
const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MD', 'MI', 'EXT', 'DC'];  
  
const ATTRIBUTES = [  
    'EN', // Entradas / Entradas (defensa)  
    'VE', // Velocidad  
    'RE', // Resistencia  
    'AG', // Agresividad / Agilidad (depende de la posición)  
    'CA', // Cabeza / Capacidad (depende de la posición)  
    'EF', // Efectividad / Fuerza (depende de la posición)  
    'MO', // Moral / Condición Física (renombrado a form para evitar confusión con el atributo MO)  
    'AT', // Ataque  
    'DF'  // Defensa  
];  
  
// Pesos para calcular el overall según la posición  
const POSITION_ATTRIBUTE_WEIGHTS = {  
    'POR': { EN: 0.1, VE: 0.1, RE: 0.1, AG: 0.1, CA: 0.2, EF: 0.1, MO: 0.1, AT: 0.05, DF: 0.15 },  
    'DFC': { EN: 0.2, VE: 0.1, RE: 0.15, AG: 0.1, CA: 0.15, EF: 0.1, MO: 0.1, AT: 0.05, DF: 0.15 },  
    'LI': { EN: 0.15, VE: 0.15, RE: 0.2, AG: 0.1, CA: 0.05, EF: 0.05, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'LD': { EN: 0.15, VE: 0.15, RE: 0.2, AG: 0.1, CA: 0.05, EF: 0.05, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'MC': { EN: 0.1, VE: 0.1, RE: 0.2, AG: 0.1, CA: 0.1, EF: 0.1, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'MCO': { EN: 0.05, VE: 0.15, RE: 0.15, AG: 0.15, CA: 0.1, EF: 0.15, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'MD': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.1, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'MI': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.1, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'EXT': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.15, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'DC': { EN: 0.05, VE: 0.15, RE: 0.1, AG: 0.1, CA: 0.15, EF: 0.2, MO: 0.1, AT: 0.15, DF: 0.0 },  
};  
  
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
  
// --- Configuración del STAFF ---  
const STAFF_ROLES = {  
    medico: { displayName: 'Médico', minSalary: 800, maxSalary: 2500, baseEffect: 0.5 }, // Afecta recuperación de lesiones  
    entrenador: { displayName: 'Entrenador Físico', minSalary: 700, maxSalary: 2000, baseEffect: 0.4 }, // Afecta entrenamiento de atributos (no porteros)  
    entrenadorPorteros: { displayName: 'Entrenador de Porteros', minSalary: 600, maxSalary: 1800, baseEffect: 0.4 }, // Afecta entrenamiento de porteros  
    fisio: { displayName: 'Fisioterapeuta', minSalary: 750, maxSalary: 2200, baseEffect: 0.5 }, // Afecta probabilidad de lesión  
    analista: { displayName: 'Analista de Vídeo', minSalary: 600, maxSalary: 1500, baseEffect: 0.05 }, // Pequeños boosts en partidos  
    scout: { displayName: 'Ojeador', minSalary: 700, maxSalary: 2000, baseEffect: 0.05 }, // Afecta calidad de jugadores en el mercado  
    segundoEntrenador: { displayName: 'Segundo Entrenador', minSalary: 1000, maxSalary: 3000, baseEffect: 0.0 } // Genera consejos y noticias  
};  
  
// Multiplicadores de efecto del staff por nivel (1-5)  
const STAFF_LEVEL_EFFECTS = {  
    1: { training: 0.5, injuryProb: 1.5, recoveryTime: 1.5, scoutQuality: 0.5 },  
    2: { training: 0.75, injuryProb: 1.25, recoveryTime: 1.25, scoutQuality: 0.75 },  
    3: { training: 1.0, injuryProb: 1.0, recoveryTime: 1.0, scoutQuality: 1.0 }, // Base  
    4: { training: 1.25, injuryProb: 0.75, recoveryTime: 0.75, scoutQuality: 1.25 },  
    5: { training: 1.5, injuryProb: 0.5, recoveryTime: 0.5, scoutQuality: 1.5 }  
};  
  
// --- Configuración de Lesiones ---  
const BASE_INJURY_PROB_PER_MATCH = 0.05; // 5% de probabilidad base por jugador por partido  
const BASE_RECOVERY_TIME_WEEKS = { min: 2, max: 8 }; // Tiempo base de recuperación en semanas  
  
export {  
    firebaseAvailable,  
    db,  
    auth,  
    TEAMS_DATA,  
    POSITIONS,  
    ATTRIBUTES,  
    POSITION_ATTRIBUTE_WEIGHTS,  
    FORMATIONS,  
    DIVISION_MULTIPLIERS,  
    STAFF_ROLES,         // Exportar roles y configuración de staff  
    STAFF_LEVEL_EFFECTS, // Exportar efectos de nivel de staff  
    BASE_INJURY_PROB_PER_MATCH, // Exportar configuración de lesiones  
    BASE_RECOVERY_TIME_WEEKS  
};  
