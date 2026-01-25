// config.js - Configuración y datos globales  
  
let firebaseAvailable = false;  
let db = null;  
let auth = null;  
  
// Intentar cargar Firebase (opcional)  
try {  
    // Si quieres usar Firebase en el futuro, descomenta esto y añade los módulos  
    // import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";  
    // import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";  
    // import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";  
  
    // Configuración Firebase (por si lo necesitas después)  
    const firebaseConfig = {  
        apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",  
        authDomain: "cuentacuentos-57631.firebaseapp.com",  
        projectId: "cuentacuentos-57631",  
        storageBucket: "cuentacuentos-57631.firebasestorage.app",  
        messagingSenderId: "654911737232",  
        appId: "1:654911737232:web:e87ecaea12351dd3d5b715"  
    };  
  
    console.log('Firebase disponible pero deshabilitado (usar localStorage)');  
} catch (e) {  
    console.log('Firebase no disponible, usando almacenamiento local');  
}  
  
// DATOS DE EQUIPOS POR DIVISIÓN  
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
  
const POSITIONS = ['POR', 'DEF', 'CED', 'MED', 'EXT', 'DEL'];  
  
const FORMATIONS = {  
    '433': { name: '4-3-3', type: 'Equilibrada' },  
    '442': { name: '4-4-2', type: 'Clásica' },  
    '352': { name: '3-5-2', type: 'Ofensiva' },  
    '541': { name: '5-4-1', type: 'Defensiva' },  
    '451': { name: '4-5-1', type: 'Mixta' }  
};  
  
// Estadísticas iniciales de jugadores por división (para variarlas)  
const DIVISION_MULTIPLIERS = {  
    primera: 1.2,    // Los jugadores de Primera son mejores  
    segunda: 1.0,    // Línea base  
    rfef: 0.85       // Los de RFEF son más jóvenes/peores  
};  
  
// Exportar todas las constantes (ES Module style)  
export {  
    firebaseAvailable,  
    db,  
    auth,  
    TEAMS_DATA,  
    POSITIONS,  
    FORMATIONS,  
    DIVISION_MULTIPLIERS  
};  
