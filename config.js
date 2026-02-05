// ==========================================
// CONFIGURACIÓN DE FIREBASE (Solo config, no exports)
// ==========================================

const firebaseConfigData = {
    enabled: true, // ⚠️ true = Firebase habilitado, false = solo localStorage
    apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",
    authDomain: "cuentacuentos-57631.firebaseapp.com",
    projectId: "cuentacuentos-57631",
    storageBucket: "cuentacuentos-57631.firebasestorage.app",
    messagingSenderId: "654911737232",
    appId: "1:654911737232:web:e87ecaea12351dd3d5b715"
};

// Exponer globalmente (no como export de módulo)
window.firebaseConfigData = firebaseConfigData;

console.log(firebaseConfigData.enabled ? '✅ Firebase HABILITADO' : '⚠️ Firebase DESHABILITADO');
  
const TEAMS_DATA = {  
    primera: [ // Primera División (20 equipos) - Basado en 23/24  
        'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Sevilla FC', 'Real Betis',
        'Real Sociedad', 'Villarreal CF', 'Athletic Club', 'Valencia CF', 'CA Osasuna',
        'RC Celta de Vigo', 'Rayo Vallecano', 'Deportivo Alavés', 'RCD Espanyol', 'Elche CF',
        'Getafe CF', 'RCD Mallorca', 'Levante UD', 'Real Oviedo', 'Girona FC'  
    ],  
    segunda: [ // Segunda División (22 equipos) - Basado en 23/24  
        'Albacete Balompié', 'UD Almería', 'FC Andorra', 'Burgos CF', 'Cádiz CF',
        'CD Castellón', 'Córdoba CF', 'Cultural y Deportiva Leonesa', 'Deportivo de La Coruña',
        'SD Eibar', 'Granada CF', 'SD Huesca', 'CD Leganés', 'UD Las Palmas', 'Málaga CF', 'CD Mirandés',
        'Racing de Santander', 'Real Sociedad B', 'Real Valladolid', 'Real Zaragoza', 'Sporting de Gijón', 'AD Ceuta FC'  
    ],  
    rfef_grupo1: [ // Primera RFEF Grupo 1 (20 equipos) - Basado en 23/24  
        'AD Ceuta FC', 'Albacete Balompié', 'Burgos CF', 'Cádiz CF', 'CD Castellón',
        'CD Leganés', 'CD Mirandés', 'Córdoba CF', 'Cultural y Deportiva Leonesa', 'FC Andorra',
        'Granada CF', 'Málaga CF', 'Racing de Santander', 'Real Sociedad B', 'RC Deportivo', 'Real Sporting',
        'Real Valladolid CF', 'Real Zaragoza', 'SD Eibar', 'SD Huesca', 'UD Almería', 'UD Las Palmas'  
    ],  
    rfef_grupo2: [ // Primera RFEF Grupo 2 (20 equipos) - Basado en 23/24  
        'CE Sabadell FC', 'Atlético Madrileño (Atlético de Madrid B)', 'CD Eldense', 'CE Europa',
        'Algeciras CF', 'Antequera CF', 'Real Murcia CF', 'Hércules CF', 'Villarreal CF B', 
        'CD Teruel', 'UD Ibiza', 'SD Tarazona', 'Gimnàstic de Tarragona', 'AD Alcorcón', 'FC Cartagena',
        'Betis Deportivo Balompié', 'Atlético Sanluqueño CF', 'Marbella FC', 'Juventud Torremolinos CF', 'Sevilla Atlético'  
    ]  
};  
  
const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MD', 'MI', 'EXT', 'DC'];  
  
const ATTRIBUTES = [  
    'EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'  
];  
  
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
  
// Layouts visuales para la alineación en el campo (x, y son coordenadas relativas en una cuadrícula virtual 5x9)  
// El campo tiene 5 columnas (0 a 4) y 9 filas (0 a 8)  
// Las coordenadas se han ajustado para centrar mejor las líneas de jugadores.  
const FORMATIONS = {  
    '433': {  
        name: '4-3-3',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 }, // Portero  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 }, // Defensas  
            { pos: 'MC', x: 1, y: 4 }, { pos: 'MCO', x: 2, y: 4 }, { pos: 'MC', x: 3, y: 4 }, // Medios  
            { pos: 'EXT', x: 0, y: 6 }, { pos: 'DC', x: 2, y: 6 }, { pos: 'EXT', x: 4, y: 6 } // Delanteros  
        ]  
    },  
    '442': {  
        name: '4-4-2',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 1, y: 6 }, { pos: 'DC', x: 3, y: 6 }  
        ]  
    },  
    '352': {  
        name: '3-5-2',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 2, y: 2 }, { pos: 'DFC', x: 3, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MCO', x: 2, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 1, y: 6 }, { pos: 'DC', x: 3, y: 6 }  
        ]  
    },  
    '541': {  
        name: '5-4-1',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 2, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 2, y: 6 }  
        ]  
    },  
    '451': {  
        name: '4-5-1',  
        layout: [  
            { pos: 'POR', x: 2, y: 0 },  
            { pos: 'LI', x: 0, y: 2 }, { pos: 'DFC', x: 1, y: 2 }, { pos: 'DFC', x: 3, y: 2 }, { pos: 'LD', x: 4, y: 2 },  
            { pos: 'MI', x: 0, y: 4 }, { pos: 'MC', x: 1, y: 4 }, { pos: 'MCO', x: 2, y: 4 }, { pos: 'MC', x: 3, y: 4 }, { pos: 'MD', x: 4, y: 4 },  
            { pos: 'DC', x: 2, y: 6 }  
        ]  
    }  
};  
  
const DIVISION_MULTIPLIERS = {  
    primera: 1.5,  
    segunda: 1.0,  
    rfef_grupo1: 0.7, // Se usa para la generación de staff si el equipo está en esta división  
    rfef_grupo2: 0.7  // Se usa para la generación de staff si el equipo está en esta división  
};  
  
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
  
const STAFF_LEVEL_EFFECTS = {  
    1: { training: 0.5, injuryProb: 1.5, recoveryTime: 1.5, scoutQuality: 0.5, negotiation: 0.5 },  
    2: { training: 0.75, injuryProb: 1.25, recoveryTime: 1.25, scoutQuality: 0.75, negotiation: 0.75 },  
    3: { training: 1.0, injuryProb: 1.0, recoveryTime: 1.0, scoutQuality: 1.0, negotiation: 1.0 },  
    4: { training: 1.25, injuryProb: 0.75, recoveryTime: 0.75, scoutQuality: 1.25, negotiation: 1.25 },  
    5: { training: 1.5, injuryProb: 0.5, recoveryTime: 0.5, scoutQuality: 1.5, negotiation: 1.5 }  
};  
  
const BASE_INJURY_PROB_PER_MATCH = 0.005;  
const BASE_RECOVERY_TIME_WEEKS = { min: 3, max: 10 };  
  
// ELIMINADA: const SEASON_WEEKS = 38; // El número de semanas de la temporada ahora se calculará dinámicamente.  
const PRESEASON_WEEKS = 4; // Número de semanas de pretemporada, esto se mantiene fijo.  
  
const PROMOTION_RELEGATION = {  
    primera: {  
        relegate: 3  
    },  
    segunda: {  
        promote: 3, // 2 directos, 1 playoff (simulado como 3 directos para simplificar)  
        relegate: 4  
    },  
    rfef_grupo1: { // Por ejemplo, los 2 primeros de cada grupo ascienden a Segunda  
        promote: 2,  
        relegate: 4 // Los últimos 4 de cada grupo descienden a Tercera RFEF (no implementado en el juego)  
    },  
    rfef_grupo2: {  
        promote: 2,  
        relegate: 4  
    }  
};  
  
export {      
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
    // ELIMINADA: SEASON_WEEKS, // Ya no se exporta una constante fija  
    PRESEASON_WEEKS,  
    PROMOTION_RELEGATION  
};  
