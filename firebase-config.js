
// firebase-config.js  
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';  
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';  
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

  
// ConfiguraciÃ³n directa de Firebase  
const firebaseConfig = {  
    enabled: true, // âš ï¸ true = Firebase habilitado, false = solo localStorage  
    apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",  
    authDomain: "cuentacuentos-57631.firebaseapp.com",  
    projectId: "cuentacuentos-57631",  
    storageBucket: "cuentacuentos-57631.firebasestorage.app",  
    messagingSenderId: "654911737232",  
    appId: "1:654911737232:web:e87ecaea12351dd3d5b715"  
};  
  
let app = null;  
let db = null;  
let auth = null;  
let currentUserId = null;  
let authReady = false;  
  
// Promise para esperar a que la autenticaciÃ³n estÃ© lista  
let resolveAuthReady;  
const authReadyPromise = new Promise((resolve) => {  
    resolveAuthReady = resolve; // Captura la funciÃ³n de resoluciÃ³n  
});  
window.authReadyPromise = authReadyPromise; // Exponer globalmente  
  
// Inicializar Firebase  
if (firebaseConfig.enabled) {  
    try {  
        console.log('ðŸ”¥ Inicializando Firebase...');  
        app = initializeApp(firebaseConfig);  
        db = getFirestore(app);  
        auth = getAuth(app);  
  
        // Exponer globalmente  
        window.firebaseApp = app;  
        window.firebaseDB = db;  
        window.firebaseAuth = auth;  
        window.firebaseConfig = firebaseConfig; // Exponer la configuraciÃ³n completa  
  
       /* // AutenticaciÃ³n anÃ³nima INMEDIATA  
        signInAnonymously(auth)  
            .then(() => {  
                console.log('âœ… AutenticaciÃ³n anÃ³nima iniciada');  
            })  
            .catch(error => {  
                console.error('âŒ Error en autenticaciÃ³n anÃ³nima:', error); // Este es el error auth/admin-restricted-operation  
                // Si la autenticaciÃ³n anÃ³nima falla al inicio, resolvemos la promesa para no bloquear  
                if (resolveAuthReady) {  
                    resolveAuthReady(null);  
                    resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
            });  */
  
        // Listener de cambios de autenticaciÃ³n  
        onAuthStateChanged(auth, (user) => {  
            if (user) {  
                currentUserId = user.uid;  
                window.currentUserId = user.uid;  
                authReady = true;  
                console.log('âœ… Usuario autenticado con UID:', user.uid, 'Email:', user.email || 'sin email'); 
                // Resolver la promesa de autenticaciÃ³n lista  
                if (resolveAuthReady) { // Asegurarse de que resolveAuthReady ha sido asignado  
                   resolveAuthReady(user.uid);  
                   resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
                // Habilitar botÃ³n de guardar si existe (se manejarÃ¡ en injector-firebase-sync.js tambiÃ©n)  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.disabled = false;  
                    saveBtn.style.opacity = '1';  
                }  
            } else {  
                currentUserId = null;  
                window.currentUserId = null;  
                authReady = false;  
                console.log('âš ï¸ Usuario no autenticado');  
                // Deshabilitar botÃ³n de guardar si existe (se manejarÃ¡ en injector-firebase-sync.js tambiÃ©n)  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.disabled = true;  
                    saveBtn.style.opacity = '0.5';  
                }  
                // Si no hay usuario y la promesa no se ha resuelto, resuÃ©lvela con null  
                if (resolveAuthReady) { // Asegurarse de que resolveAuthReady ha sido asignado  
                    resolveAuthReady(null);  
                    resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
            }  
        });  
        console.log('âœ… Firebase inicializado correctamente');  
    } catch (error) {  
        console.error('âŒ Error inicializando Firebase:', error);  
        window.firebaseConfig = { enabled: false }; // Deshabilitar si hay error  
        // Si Firebase falla al inicializar, resuelve la promesa para no bloquear  
        if (resolveAuthReady) {  
            resolveAuthReady(null);  
            resolveAuthReady = null;  
        }  
    }  
} else {  
    console.log('âš ï¸ Firebase deshabilitado en la configuraciÃ³n');  
    window.firebaseConfig = { enabled: false }; // Asegurarse de que estÃ© deshabilitado globalmente  
    // Si Firebase estÃ¡ deshabilitado, resuelve la promesa para no bloquear  
    if (resolveAuthReady) {  
        resolveAuthReady(null);  
        resolveAuthReady = null;  
    }  
}  

const storage = getStorage(app);
window.firebaseStorage = storage;

// FunciÃ³n para subir imÃ¡genes
async function uploadImage(file, path) {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return { success: true, url };
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        return { success: false, error: error.message };
    }
}

window.uploadImageToFirebase = uploadImage;

// ==========================================  
// FUNCIONES PARA DATOS DE EQUIPOS (GLOBALES)  
// ==========================================  
  
async function saveTeamDataToFirebase(teamName, teamData) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, guardando solo en localStorage');  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n para saveTeamDataToFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return { success: false, error: 'No se pudo autenticar para guardar datos de equipo' };  
        }  
    }  
      
    try {  
        console.log(`ðŸ“¤ Guardando datos de equipo en Firebase: ${teamName}...`);  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await setDoc(doc(db, 'teams_data', teamName), teamData);  
        console.log(`âœ… Datos del equipo ${teamName} guardados en Firebase`);  
        // TambiÃ©n guardar en localStorage como cachÃ©  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: true };  
    } catch (error) {  
        console.error('âŒ Error guardando en Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: error.message };  
    }  
}  
  
async function getTeamDataFromFirebase(teamName) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, cargando desde localStorage');  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            return { success: true, data: JSON.parse(localData) };  
        }  
        return { success: false, data: null };  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n para getTeamDataFromFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return { success: false, error: 'No se pudo autenticar para cargar datos de equipo' };  
        }  
    }  
  
    try {  
        console.log(`ðŸ“¥ Cargando desde Firebase: ${teamName}...`);  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const docRef = doc(db, 'teams_data', teamName);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            console.log(`âœ… Datos del equipo ${teamName} cargados desde Firebase`);  
            const data = docSnap.data();  
            // Guardar en localStorage como cachÃ©  
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));  
            return { success: true, data: data };  
        } else {  
            console.log(`âš ï¸ No hay datos en Firebase para ${teamName}, buscando en localStorage`);  
            const localData = localStorage.getItem(`team_data_${teamName}`);  
            if (localData) {  
                const data = JSON.parse(localData);  
                // Subir a Firebase para sincronizaciÃ³n  
                console.log(`ðŸ“¤ Subiendo datos locales de ${teamName} a Firebase...`);  
                // AsegÃºrate de usar el db inicializado  
                await setDoc(doc(db, 'teams_data', teamName), data);  
                return { success: true, data: data };  
            }  
            return { success: false, data: null };  
        }  
    } catch (error) {  
        console.error('âŒ Error cargando desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            return { success: true, data: JSON.parse(localData) };  
        }  
        return { success: false, error: error.message };  
    }  
}  
  
async function getAllTeamsDataFromFirebase() {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, cargando desde localStorage');  
        const allData = {};  
        Object.keys(localStorage).forEach(key => {  
            if (key.startsWith('team_data_')) {  
                const teamName = key.replace('team_data_', '');  
                try {  
                    allData[teamName] = JSON.parse(localStorage.getItem(key));  
                } catch (error) {  
                    console.error(`Error parseando datos de ${teamName}:`, error);  
                }  
            }  
        });  
        return { success: true, data: allData };  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n para getAllTeamsDataFromFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return { success: false, error: 'No se pudo autenticar para cargar todos los datos de equipo' };  
        }  
    }  
  
    try {  
        console.log('ðŸ“¥ Cargando todos los equipos desde Firebase...');  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const querySnapshot = await getDocs(collection(db, 'teams_data'));  
        const allData = {};  
        querySnapshot.forEach((doc) => {  
            allData[doc.id] = doc.data();  
            // Guardar en localStorage como cachÃ©  
            localStorage.setItem(`team_data_${doc.id}`, JSON.stringify(doc.data()));  
        });  
        console.log(`âœ… ${Object.keys(allData).length} equipos cargados desde Firebase`);  
        return { success: true, data: allData };  
    } catch (error) {  
        console.error('âŒ Error cargando todos los equipos:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
// ==========================================  
// FUNCIONES PARA PARTIDAS GUARDADAS (POR USUARIO)  
// ==========================================  
  
async function saveGameToCloud(userId, gameId, gameName, gameState) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, guardando localmente');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        localGames[gameId] = { id: gameId, name: gameName,  
            team: gameState.team, week: gameState.week, lastSaved: Date.now(), gameState: gameState };  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n antes de guardar partida...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
  
    // Validar userId y gameId despuÃ©s de esperar autenticaciÃ³n  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string') {  
        console.error('âŒ Error: userId es invÃ¡lido:', finalUserId);  
        return { success: false, error: 'Usuario no autenticado o ID de usuario invÃ¡lido' };  
    }  
    if (!gameId || typeof gameId !== 'string') {  
        console.error('âŒ Error: gameId es invÃ¡lido:', gameId);  
        return { success: false, error: 'ID de partida invÃ¡lido' };  
    }  
  
    try {  
        console.log(`ðŸ“¤ Guardando partida ${gameId} en Firebase para usuario ${finalUserId}...`);  
        const gameData = {  
            id: gameId,  
            name: gameName,  
            team: gameState.team,  
            week: gameState.week,  
            division: gameState.division,  
            lastSaved: Date.now(),  
            gameState: gameState  
        };  
        // AsegÃºrate de que db estÃ© definido y no sea null/undefined aquÃ­  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await setDoc(doc(db, 'users', finalUserId, 'saved_games', gameId), gameData);  
        console.log(`âœ… Partida ${gameId} guardada en Firebase`);  
        // TambiÃ©n guardar localmente como backup  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        localGames[gameId] = gameData;  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        console.error('âŒ Error guardando partida en Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
async function loadUserSavedGames(userId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, cargando juegos locales');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        return Object.values(localGames);  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n para loadUserSavedGames...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return [];  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string') {  
        console.error('âŒ Error: userId es invÃ¡lido para cargar partidas');  
        return [];  
    }  
  
    try {  
        console.log(`ðŸ“¥ Cargando partidas guardadas desde Firebase para usuario ${finalUserId}...`);  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const querySnapshot = await getDocs(collection(db, 'users', finalUserId, 'saved_games'));  
        const games = [];  
        querySnapshot.forEach((doc) => {  
            games.push(doc.data());  
        });  
        console.log(`âœ… ${games.length} partidas cargadas desde Firebase`);  
        // Guardar en localStorage como cachÃ©  
        const localGames = {};  
        games.forEach(game => { localGames[game.id] = game; });  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return games;  
    } catch (error) {  
        console.error('âŒ Error cargando partidas desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        return Object.values(localGames);  
    }  
}  
  
async function loadGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, cargando desde localStorage');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        if (localGames[gameId]) {  
            return { success: true, data: localGames[gameId] };  
        }  
        return { success: false, message: 'Partida no encontrada' };  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n para loadGameFromCloud...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return { success: false, message: 'No se pudo autenticar' };  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string' || !gameId || typeof gameId !== 'string') {  
        console.error('âŒ Error: userId o gameId son invÃ¡lidos para cargar partida');  
        return { success: false, message: 'ParÃ¡metros invÃ¡lidos' };  
    }  
  
    try {  
        console.log(`ðŸ“¥ Cargando partida ${gameId} desde Firebase para usuario ${finalUserId}...`);  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const docRef = doc(db, 'users', finalUserId, 'saved_games', gameId);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            const gameData = docSnap.data();  
            console.log(`âœ… Partida ${gameId} cargada desde Firebase`);  
            return { success: true, data: gameData };  
        } else {  
            console.log('âš ï¸ Partida no encontrada en Firebase');  
            return { success: false, message: 'Partida no encontrada en Firebase' };  
        }  
    } catch (error) {  
        console.error('âŒ Error cargando partida desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
async function deleteGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('âš ï¸ Firebase no disponible, eliminando localmente');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: true };  
    }  
  
    // Esperar a que la autenticaciÃ³n estÃ© lista antes de operar  
    if (!authReady) {  
        console.log('â³ Esperando autenticaciÃ³n para deleteGameFromCloud...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('âŒ Error esperando autenticaciÃ³n:', error);  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string' || !gameId || typeof gameId !== 'string') {  
        console.error('âŒ Error: userId o gameId son invÃ¡lidos para eliminar partida');  
        return { success: false, error: 'ParÃ¡metros invÃ¡lidos' };  
    }  
  
    try {  
        console.log(`ðŸ—‘ï¸ Eliminando partida ${gameId} de Firebase para usuario ${finalUserId}...`);  
        if (!db) { // AÃ±adir esta validaciÃ³n  
            console.error('âŒ Firestore DB no estÃ¡ inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await deleteDoc(doc(db, 'users', finalUserId, 'saved_games', gameId));  
        console.log(`âœ… Partida ${gameId} eliminada de Firebase`);  
        // TambiÃ©n eliminar localmente  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        console.error('âŒ Error eliminando partida de Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
// ==========================================
// MERCADO DE FICHAJES (transfer_market)
// ==========================================

/**
 * Sincroniza el mercado de fichajes de un equipo.
 * Coge entre 2 y 4 jugadores aleatorios de la plantilla del equipo
 * que NO estén ya en el mercado y los marca como disponibles.
 * Se llama cuando el admin guarda una plantilla.
 */
async function syncTeamToTransferMarket(teamName, squadPlayers) {
    if (!firebaseConfig.enabled || !db) return { success: false, error: 'Firebase no disponible' };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }

    try {
        // Leer entradas actuales del mercado para este equipo
        const marketRef = doc(db, 'transfer_market', teamName);
        const marketSnap = await getDoc(marketRef);
        const existingMarket = marketSnap.exists() ? (marketSnap.data().players || []) : [];

        // Nombres ya en mercado (para no duplicar)
        const namesInMarket = new Set(existingMarket.map(p => p.name));

        // Jugadores candidatos: no están ya en mercado
        const candidates = squadPlayers.filter(p => p.name && !namesInMarket.has(p.name));

        if (candidates.length === 0) {
            console.log(`ℹ️ ${teamName}: todos los jugadores ya están en el mercado o plantilla vacía`);
            return { success: true, added: 0 };
        }

        // Elegir entre 2 y 4 jugadores aleatorios de los candidatos
        const shuffled = candidates.sort(() => Math.random() - 0.5);
        const toAdd = shuffled.slice(0, Math.min(4, Math.max(2, Math.floor(candidates.length * 0.15))));

        // Preparar objetos de mercado
        const newEntries = toAdd.map(p => ({
            ...p,
            club: teamName,
            originalTeam: teamName,
            transferListed: true,
            loanListed: p.age < 26 ? Math.random() < 0.4 : false,
            addedToMarketAt: Date.now()
        }));

        const updatedMarket = [...existingMarket, ...newEntries];

        await setDoc(marketRef, {
            teamName,
            players: updatedMarket,
            lastUpdated: Date.now()
        });

        console.log(`✅ Mercado sync ${teamName}: +${newEntries.length} jugadores`);
        return { success: true, added: newEntries.length };
    } catch (error) {
        console.error('❌ Error sincronizando mercado:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene todos los jugadores disponibles en el mercado de fichajes.
 * Excluye los jugadores que ya están en la plantilla del usuario (por nombre+equipo origen).
 */
async function getTransferMarket(mySquadNames = []) {
    if (!firebaseConfig.enabled || !db) {
        // Fallback: localStorage
        const cached = localStorage.getItem('transfer_market_cache');
        return cached ? JSON.parse(cached) : [];
    }
    if (!authReady) { try { await authReadyPromise; } catch(e) { return []; } }

    try {
        const querySnapshot = await getDocs(collection(db, 'transfer_market'));
        const allPlayers = [];
        const mySquadSet = new Set(mySquadNames.map(n => n.toLowerCase()));

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.players && Array.isArray(data.players)) {
                data.players.forEach(p => {
                    // Excluir si ya está en mi plantilla
                    if (!mySquadSet.has((p.name || '').toLowerCase())) {
                        allPlayers.push(p);
                    }
                });
            }
        });

        // Cache local
        localStorage.setItem('transfer_market_cache', JSON.stringify(allPlayers));
        console.log(`✅ Mercado cargado: ${allPlayers.length} jugadores disponibles`);
        return allPlayers;
    } catch (error) {
        console.error('❌ Error cargando mercado:', error);
        const cached = localStorage.getItem('transfer_market_cache');
        return cached ? JSON.parse(cached) : [];
    }
}

/**
 * Elimina un jugador del mercado de fichajes cuando es fichado.
 * También actualiza la plantilla del equipo vendedor en Firestore
 * para reflejar que ese jugador ya no pertenece al equipo.
 */
async function removePlayerFromMarket(playerName, originalTeam) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }

    try {
        // 1. Eliminar del mercado
        const marketRef = doc(db, 'transfer_market', originalTeam);
        const marketSnap = await getDoc(marketRef);

        if (marketSnap.exists()) {
            const data = marketSnap.data();
            const updatedPlayers = (data.players || []).filter(p => p.name !== playerName);
            await setDoc(marketRef, { ...data, players: updatedPlayers, lastUpdated: Date.now() });
        }

        // 2. Marcar jugador como transferido en la plantilla del equipo origen
        const teamRef = doc(db, 'teams_data', originalTeam);
        const teamSnap = await getDoc(teamRef);

        if (teamSnap.exists()) {
            const teamData = teamSnap.data();
            if (teamData.squad && Array.isArray(teamData.squad)) {
                // Eliminar de la plantilla del equipo vendedor
                teamData.squad = teamData.squad.filter(p => p.name !== playerName);
                await setDoc(teamRef, teamData);
                // Actualizar cache local
                localStorage.setItem(`team_data_${originalTeam}`, JSON.stringify(teamData));
            }
        }

        console.log(`✅ ${playerName} eliminado del mercado y de la plantilla de ${originalTeam}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando del mercado:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Añade un jugador al mercado cuando el usuario lo pone a la venta o cedible.
 */
async function addPlayerToMarket(player, teamName) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }

    try {
        const marketRef = doc(db, 'transfer_market', teamName);
        const marketSnap = await getDoc(marketRef);
        const existing = marketSnap.exists() ? (marketSnap.data().players || []) : [];

        // Evitar duplicados
        if (existing.some(p => p.name === player.name)) {
            return { success: true, alreadyExists: true };
        }

        const entry = {
            ...player,
            club: teamName,
            originalTeam: teamName,
            addedToMarketAt: Date.now()
        };

        await setDoc(marketRef, {
            teamName,
            players: [...existing, entry],
            lastUpdated: Date.now()
        });

        console.log(`✅ ${player.name} añadido al mercado desde ${teamName}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error añadiendo al mercado:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Retira un jugador del mercado (cuando el usuario cancela la venta).
 */
async function removePlayerFromMarketByUser(playerName, teamName) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }

    try {
        const marketRef = doc(db, 'transfer_market', teamName);
        const marketSnap = await getDoc(marketRef);
        if (!marketSnap.exists()) return { success: true };

        const data = marketSnap.data();
        const updated = (data.players || []).filter(p => p.name !== playerName);
        await setDoc(marketRef, { ...data, players: updated, lastUpdated: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Devuelve un jugador cedido a su equipo de origen al final de temporada.
 * Vuelve a añadirlo a la plantilla del equipo origen en Firestore.
 */
async function returnLoanedPlayerToOrigin(player) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    const originTeam = player.originalTeam || player.loanOriginTeam || player.club;
    if (!originTeam) return { success: false, error: 'Sin equipo de origen' };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }

    try {
        const teamRef = doc(db, 'teams_data', originTeam);
        const teamSnap = await getDoc(teamRef);

        if (teamSnap.exists()) {
            const teamData = teamSnap.data();
            if (!teamData.squad) teamData.squad = [];

            // Solo añadir si no está ya
            if (!teamData.squad.some(p => p.name === player.name)) {
                const returnedPlayer = {
                    name: player.name,
                    position: player.position,
                    age: player.age,
                    EN: player.EN, VE: player.VE, RE: player.RE, AG: player.AG,
                    CA: player.CA, EF: player.EF, MO: player.MO, AT: player.AT, DF: player.DF,
                    overall: player.overall,
                    potential: player.potential,
                    salary: player.salary,
                    value: player.value,
                    foot: player.foot,
                    contractType: 'owned',
                    contractYears: 2 + Math.floor(Math.random() * 2),
                    releaseClause: player.releaseClause || 0,
                    nationality: player.nationality || 'España'
                };
                teamData.squad.push(returnedPlayer);
                await setDoc(teamRef, teamData);
                localStorage.setItem(`team_data_${originTeam}`, JSON.stringify(teamData));
            }
        }

        console.log(`✅ ${player.name} devuelto a ${originTeam}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error devolviendo cedido:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================  
// EXPORTAR FUNCIONES GLOBALMENTE  
// ==========================================  
window.saveTeamDataToFirebase = saveTeamDataToFirebase;  
window.getTeamDataFromFirebase = getTeamDataFromFirebase;  
window.getAllTeamsDataFromFirebase = getAllTeamsDataFromFirebase;  
window.saveGameToCloud = saveGameToCloud;  
window.loadUserSavedGames = loadUserSavedGames;  
window.loadGameFromCloud = loadGameFromCloud;  
window.deleteGameFromCloud = deleteGameFromCloud;
window.syncTeamToTransferMarket = syncTeamToTransferMarket;
window.getTransferMarket = getTransferMarket;
window.removePlayerFromMarket = removePlayerFromMarket;
window.addPlayerToMarket = addPlayerToMarket;
window.removePlayerFromMarketByUser = removePlayerFromMarketByUser;
window.returnLoanedPlayerToOrigin = returnLoanedPlayerToOrigin;
  
// Exportar como módulos ES6  
export {  
    app,  
    auth,  
    db,   
    onAuthStateChanged,  
    saveTeamDataToFirebase,  
    getTeamDataFromFirebase,  
    getAllTeamsDataFromFirebase,  
    saveGameToCloud,  
    loadUserSavedGames,  
    loadGameFromCloud,  
    deleteGameFromCloud,  
    authReadyPromise,  
    firebaseConfig, // Exportar firebaseConfig también
    syncTeamToTransferMarket,
    getTransferMarket,
    removePlayerFromMarket,
    addPlayerToMarket,
    removePlayerFromMarketByUser,
    returnLoanedPlayerToOrigin
};  
