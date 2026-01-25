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
  
// Definición de atributos y sus pesos para el cálculo del overall  
// Estos son los atributos del PCF7 (EN, VE, RE, AG, CA, EF, MO, DEM) + AT (Ataque), DF (Defensa)  
// La media total es un promedio ponderado de estos atributos.  
const ATTRIBUTES = [  
    'EN', // Entradas / Entradas (defensa)  
    'VE', // Velocidad  
    'RE', // Resistencia  
    'AG', // Agresividad / Agilidad (depende de la posición)  
    'CA', // Cabeza / Capacidad (depende de la posición)  
    'EF', // Efectividad / Fuerza (depende de la posición)  
    'MO', // Moral / Condición Física  
    'AT', // Ataque (nueva)  
    'DF'  // Defensa (nueva)  
];  
  
// Pesos para calcular el overall según la posición  
// Esto es una simplificación, en PCF7 era más complejo.  
const POSITION_ATTRIBUTE_WEIGHTS = {  
    'POR': { EN: 0.1, VE: 0.1, RE: 0.1, AG: 0.1, CA: 0.2, EF: 0.1, MO: 0.1, AT: 0.05, DF: 0.15 }, // Cabeza y defensa importantes  
    'DFC': { EN: 0.2, VE: 0.1, RE: 0.15, AG: 0.1, CA: 0.15, EF: 0.1, MO: 0.1, AT: 0.05, DF: 0.15 }, // Entradas, defensa, cabeza  
    'LI': { EN: 0.15, VE: 0.15, RE: 0.2, AG: 0.1, CA: 0.05, EF: 0.05, MO: 0.1, AT: 0.1, DF: 0.1 }, // Velocidad, resistencia, entradas  
    'LD': { EN: 0.15, VE: 0.15, RE: 0.2, AG: 0.1, CA: 0.05, EF: 0.05, MO: 0.1, AT: 0.1, DF: 0.1 },  
    'MC': { EN: 0.1, VE: 0.1, RE: 0.2, AG: 0.1, CA: 0.1, EF: 0.1, MO: 0.1, AT: 0.1, DF: 0.1 }, // Resistencia, pase, equilibrio  
    'MCO': { EN: 0.05, VE: 0.15, RE: 0.15, AG: 0.15, CA: 0.1, EF: 0.15, MO: 0.1, AT: 0.15, DF: 0.05 }, // Ataque, efectividad, agilidad  
    'MD': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.1, MO: 0.1, AT: 0.15, DF: 0.05 }, // Velocidad, ataque, agilidad  
    'MI': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.1, MO: 0.1, AT: 0.15, DF: 0.05 },  
    'EXT': { EN: 0.05, VE: 0.2, RE: 0.15, AG: 0.15, CA: 0.05, EF: 0.15, MO: 0.1, AT: 0.15, DF: 0.05 }, // Velocidad, efectividad, ataque  
    'DC': { EN: 0.05, VE: 0.15, RE: 0.1, AG: 0.1, CA: 0.15, EF: 0.2, MO: 0.1, AT: 0.15, DF: 0.0 }, // Efectividad, cabeza, ataque  
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
  
export {  
    firebaseAvailable,  
    db,  
    auth,  
    TEAMS_DATA,  
    POSITIONS,  
    ATTRIBUTES, // Exportar atributos  
    POSITION_ATTRIBUTE_WEIGHTS, // Exportar pesos  
    FORMATIONS,  
    DIVISION_MULTIPLIERS  
};  
