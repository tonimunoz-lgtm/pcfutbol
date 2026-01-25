// config.js - Configuración Firebase y variables globales
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",
  authDomain: "cuentacuentos-57631.firebaseapp.com",
  projectId: "cuentacuentos-57631",
  storageBucket: "cuentacuentos-57631.firebasestorage.app",
  messagingSenderId: "654911737232",
  appId: "1:654911737232:web:e87ecaea12351dd3d5b715"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Autenticación anónima
signInAnonymously(auth).catch(error => {
  console.log("Error autenticación:", error);
});

// DATOS GLOBALES DEL JUEGO
const TEAMS_DATA = {
  primera: ['Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Athletic Club', 'Villarreal CF',
    'Real Sociedad', 'Real Betis', 'Valencia CF', 'Girona FC', 'Real Mallorca',
    'Las Palmas', 'Rayo Vallecano', 'Sevilla FC', 'Osasuna', 'Celta de Vigo',
    'Real Oviedo', 'RCD Español', 'Real Valladolid', 'Levante UD', 'Real Elche CF'],
  segunda: ['Albacete', 'Andorra', 'Alcorcón', 'Eibar', 'Huesca', 'Ferrol', 'Tenerife', 'Sabadell', 'Mirandés', 'Burgos',
    'Lugo', 'Córdoba', 'Ibiza', 'Alcoyano', 'Real Unión', 'Zaragoza', 'Lleida', 'Málaga', 'Cádiz', 'Ponferradina'],
  rfef1: ['AD Alcalá', 'Cerdanyola', 'Talavera', 'Fuenlabrada', 'Alcalá', 'Getafe B', 'Torrejón', 'Alcorcón B', 'Móstoles', 'Cieza'],
  rfef2: ['Mérida', 'Utrera', 'Coria', 'Extremadura', 'Villanovense', 'Córdoba B', 'Linares', 'San Roque', 'Poli Ejido', 'Jaén']
};

const PLAYER_NAMES = ['Vinicius', 'Rodri', 'Bellingham', 'Haaland', 'Lewandowski', 'Mbappé', 'Koundé', 'Martínez', 'Alaba', 'Pedri', 'Gavi', 'Osimhen', 'Vlahovic', 'Lautaro', 'Grealish'];

const YOUNGSTER_NAMES = ['Gavi', 'Casadó', 'Vinícius Jr', 'Tombás', 'Marín', 'Segurola', 'Araujo', 'Vidal', 'Hernández', 'Ruiz'];

const POSITIONS = ['POR', 'DEF', 'CED', 'MED', 'EXT', 'DEL'];

const FORMATIONS = {
  '433': { name: '4-3-3', type: 'Equilibrada' },
  '442': { name: '4-4-2', type: 'Clásica' },
  '352': { name: '3-5-2', type: 'Ofensiva' },
  '541': { name: '5-4-1', type: 'Defensiva' },
  '451': { name: '4-5-1', type: 'Mixta' }
};

export { app, db, auth, TEAMS_DATA, PLAYER_NAMES, YOUNGSTER_NAMES, POSITIONS, FORMATIONS };
