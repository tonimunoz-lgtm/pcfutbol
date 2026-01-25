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
    rfef: [ // Primera RFEF con dos grupos (ejemplos)  
        // Grupo 1  
        'RC Deportivo', 'FC Barcelona B', 'Real Madrid Castilla', 'Racing Ferrol', 'Celta B',  
        'Rayo Majadahonda', 'Cultural Leonesa', 'Real Unión', 'SD Logroñés', 'Unionistas Salamanca',  
        'Gimnàstic Tarragona', 'CE Sabadell FC', 'CD Castellón', 'UE Cornellà', 'UD Logroñés',  
        'Atlético Baleares', 'CD Alcoyano', 'CF Intercity', 'Eldense', 'La Nucía',  
        // Grupo 2 (para asegurar ~40 equipos en total en RFEF, luego se dividirán en 2 grupos)  
        'Recreativo Huelva', 'Málaga CF', 'Antequera CF', 'Algeciras CF', 'San Fernando CD',  
        'AD Mérida', 'Real Murcia CF', 'Atlético Sanluqueño', 'Linares Deportivo', 'CD Atlético Baleares',  
        'UD Ibiza', 'AD Ceuta FC', 'Córdoba CF', 'RC Recreativo de Huelva', 'CD Badajoz',  
        'Extremadura UD', 'Real Balompédica Linense', 'UD Melilla', 'CP Cacereño', 'UCAM Murcia CF'  
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
    'MO', // Moral / Condición Física (MO para diferenciar de 'form' que es semanal)  
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
  
// Layouts visuales para la alineación en el campo  
const FORMATIONS = {  
    '433': {  
        name: '4-3-3',  
        layout: [  
            { pos: 'POR', x: 1, y: 1 },  
            { pos: 'LI', x: 0, y: 3 }, { pos: 'DFC', x: 1, y: 3 }, { pos: 'DFC', x: 2, y: 3 }, { pos: 'LD', x: 3, y: 3 },  
            { pos: 'MC', x: 0, y: 5 }, { pos: 'MCO', x: 1, y: 5 }, { pos: 'MC', x: 2, y: 5 },  
            { pos: 'EXT', x: 0, y: 7 }, { pos: 'DC', x: 1, y: 7 }, { pos: 'EXT', x: 2, y: 7 }  
        ]  
    },  
    '442': {  
        name: '4-4-2',  
        layout: [  
            { pos: 'POR', x: 1, y: 1 },  
            { pos: 'LI', x: 0, y: 3 }, { pos: 'DFC', x: 1, y: 3 }, { pos: 'DFC', x: 2, y: 3 }, { pos: 'LD', x: 3, y: 3 },  
            { pos: 'MI', x: 0, y: 5 }, { pos: 'MC', x: 1, y: 5 }, { pos: 'MC', x: 2, y: 5 }, { pos: 'MD', x: 3, y: 5 },  
            { pos: 'DC', x: 1, y: 7 }, { pos: 'DC', x: 2, y: 7 }  
        ]  
    },  
    '352': {  
        name: '3-5-2',  
        layout: [  
            { pos: 'POR', x: 1, y: 1 },  
            { pos: 'DFC', x: 0, y: 3 }, { pos: 'DFC', x: 1, y: 3 }, { pos: 'DFC', x: 2, y: 3 },  
            { pos: 'MI', x: 0, y: 5 }, { pos: 'MC', x: 1, y: 5 }, { pos: 'MCO', x: 2, y: 5 }, { pos: 'MC', x: 3, y: 5 }, { pos: 'MD', x: 4, y: 5 },  
            { pos: 'DC', x: 1, y: 7 }, { pos: 'DC', x: 2, y: 7 }  
        ]  
    },  
    '541': {  
        name: '5-4-1',  
        layout: [  
            { pos: 'POR', x: 1, y: 1 },  
            { pos: 'LI', x: 0, y: 3 }, { pos: 'DFC', x: 1, y: 3 }, { pos: 'DFC', x: 2, y: 3 }, { pos: 'DFC', x: 3, y: 3 }, { pos: 'LD', x: 4, y: 3 },  
            { pos: 'MI', x: 0, y: 5 }, { pos: 'MC', x: 1, y: 5 }, { pos: 'MC', x: 2, y: 5 }, { pos: 'MD', x: 3, y: 5 },  
            { pos: 'DC', x: 1, y: 7 }  
        ]  
    },  
    '451': {  
        name: '4-5-1',  
        layout: [  
            { pos: 'POR', x: 1, y: 1 },  
            { pos: 'LI', x: 0, y: 3 }, { pos: 'DFC', x: 1, y: 3 }, { pos: 'DFC', x: 2, y: 3 }, { pos: 'LD', x: 3, y: 3 },  
            { pos: 'MI', x: 0, y: 5 }, { pos: 'MC', x: 1, y: 5 }, { pos: 'MCO', x: 2, y: 5 }, { pos: 'MC', x: 3, y: 5 }, { pos: 'MD', x: 4, y: 5 },  
            { pos: 'DC', x: 1, y: 7 }  
        ]  
    }  
};  
  
  
const DIVISION_MULTIPLIERS = {  
    primera: 1.5, // Mayor presupuesto/valor de staff  
    segunda: 1.0,  
    rfef: 0.7 // Menor presupuesto/valor de staff  
};  
  
// --- Configuración del STAFF ---  
const STAFF_ROLES = {  
    medico: { displayName: 'Médico', minSalary: 800, maxSalary: 2500, baseClausula: 5000, levelCostMultiplier: 1.5 },  
    entrenador: { displayName: 'Entrenador Físico', minSalary: 700, maxSalary: 2000, baseClausula: 4000, levelCostMultiplier: 1.5 },  
    entrenadorPorteros: { displayName: 'Entrenador de Porteros', minSalary: 600, maxSalary: 1800, baseClausula: 3500, levelCostMultiplier: 1.5 },  
    fisio: { displayName: 'Fisioterapeuta', minSalary: 750, maxSalary: 2200, baseClausula: 4500, levelCostMultiplier: 1.5 },  
    analista: { displayName: 'Analista de Vídeo', minSalary: 600, maxSalary: 1500, baseClausula: 3000, levelCostMultiplier: 1.5 },  
    scout: { displayName: 'Ojeador', minSalary: 700, maxSalary: 2000, baseClausula: 4000, levelCostMultiplier: 1.5 },  
    secretario: { displayName: 'Secretario Técnico', minSalary: 1000, maxSalary: 3000, baseClausula: 6000, levelCostMultiplier: 1.5 },  
    segundoEntrenador: { displayName: 'Segundo Entrenador', minSalary: 1000, maxSalary: 3000, baseClausula: 7000, levelCostMultiplier: 1.5 }  
};  
  
// Multiplicadores de efecto del staff por nivel (1-5)  
const STAFF_LEVEL_EFFECTS = {  
    1: { training: 0.5, injuryProb: 1.5, recoveryTime: 1.5, scoutQuality: 0.5, negotiation: 0.5 },  
    2: { training: 0.75, injuryProb: 1.25, recoveryTime: 1.25, scoutQuality: 0.75, negotiation: 0.75 },  
    3: { training: 1.0, injuryProb: 1.0, recoveryTime: 1.0, scoutQuality: 1.0, negotiation: 1.0 }, // Base  
    4: { training: 1.25, injuryProb: 0.75, recoveryTime: 0.75, scoutQuality: 1.25, negotiation: 1.25 },  
    5: { training: 1.5, injuryProb: 0.5, recoveryTime: 0.5, scoutQuality: 1.5, negotiation: 1.5 }  
};  
  
// --- Configuración de Lesiones ---  
// Probabilidad base de lesión por partido jugado por un jugador  
const BASE_INJURY_PROB_PER_MATCH = 0.005; // 0.5% de probabilidad base  
// Rango de tiempo de recuperación en semanas si no hay fisio/médico bueno  
const BASE_RECOVERY_TIME_WEEKS = { min: 3, max: 10 }; // Ajustado para ser más realista  
  
// --- Configuración de Temporada ---  
const SEASON_WEEKS = 38; // 38 jornadas de liga  
const PRESEASON_WEEKS = 4; // 4 semanas de pretemporada  
const CUP_WEEKS = 6; // Semanas reservadas para la Copa del Rey, etc.  
const EUROPEAN_WEEKS = 10; // Semanas para competiciones europeas (solapadas con liga)  
  
// Configuración de ascensos y descensos  
const PROMOTION_RELEGATION = {  
    primera: {  
        relegate: 3 // 3 descienden a Segunda  
    },  
    segunda: {  
        promote: 3, // 3 ascienden a Primera (2 directos, 1 playoff)  
        relegate: 4 // 4 descienden a Primera RFEF  
    },  
    rfef: {  
        promote: 4, // 4 ascienden a Segunda (2 directos, 2 playoff)  
        relegate: 0 // La especificación dice que no hay descensos en RFEF  
    }  
};  
  
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
    STAFF_ROLES,  
    STAFF_LEVEL_EFFECTS,  
    BASE_INJURY_PROB_PER_MATCH,  
    BASE_RECOVERY_TIME_WEEKS,  
    SEASON_WEEKS,           // Nuevo  
    PRESEASON_WEEKS,        // Nuevo  
    PROMOTION_RELEGATION    // Nuevo  
};  
