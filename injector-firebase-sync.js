// injector-firebase-sync.js
import { 
    signInAnonymously, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    getDocs, 
    doc, 
    setDoc, 
    collection, 
    getDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(function() {
    console.log('🔥 Firebase Sync Injector cargando...');

    const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;
    const defaultTeamData = {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 10000,
        initialBudget: 5000000,
        stadiumName: 'Estadio Municipal'
    };

    // =============================
    // AUTENTICACIÓN ANÓNIMA
    // =============================
    if (isFirebaseEnabled && window.firebaseAuth) {
        signInAnonymously(window.firebaseAuth)
            .then(() => console.log('✅ Usuario anónimo autenticado'))
            .catch(err => console.error('❌ Error autenticando anónimo:', err));
    }

    // =============================
    // ESPERAR A USUARIO ACTIVO
    // =============================
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
            console.log('Usuario activo:', user.uid);
            // Precargar todos los equipos desde Firebase
            if (isFirebaseEnabled && window.firebaseDB) {
                try {
                    const snapshot = await getDocs(collection(window.firebaseDB, 'teams_data'));
                    snapshot.forEach(docSnap => {
                        localStorage.setItem(`team_data_${docSnap.id}`, JSON.stringify(docSnap.data()));
                    });
                    console.log(`✅ ${snapshot.size} equipos precargados desde Firebase`);
                } catch (error) {
                    console.warn('⚠️ Error precargando equipos desde Firebase, usando localStorage como fallback', error);
                }
            }
        }
    });

    // =============================
    // FUNCIONES EQUIPOS
    // =============================
    async function getTeamDataFromFirebaseSafe(teamName) {
        if (!isFirebaseEnabled || !window.firebaseDB) return { success: false, data: null };
        try {
            const docRef = doc(window.firebaseDB, 'teams_data', teamName);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) return { success: true, data: docSnap.data() };
            await setDoc(docRef, defaultTeamData);
            return { success: true, data: defaultTeamData };
        } catch (error) {
            console.error('❌ Error accediendo a Firebase:', error);
            return { success: false, data: null };
        }
    }

    window.getTeamData = async function(teamName) {
        console.log(`📥 Cargando datos para ${teamName}...`);
        const firebaseResult = await getTeamDataFromFirebaseSafe(teamName);
        if (firebaseResult.success && firebaseResult.data) {
            console.log(`✅ Datos cargados desde Firebase para ${teamName}`);
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));
            return firebaseResult.data;
        }

        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);
            return JSON.parse(localData);
        }

        console.log(`⚠️ No hay datos en Firebase ni localStorage para ${teamName}, usando valores por defecto`);
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(defaultTeamData));
        return defaultTeamData;
    };

    window.saveTeamData = async function(teamName, teamData) {
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        console.log(`💾 Datos guardados en localStorage para ${teamName}`);

        if (isFirebaseEnabled && window.firebaseDB) {
            try {
                const user = window.firebaseAuth?.currentUser;
                if (!user) {
                    console.warn('⚠️ Usuario no autenticado, guardado solo en localStorage');
                    return { success: false };
                }
                const docRef = doc(window.firebaseDB, 'teams_data', teamName);
                await setDoc(docRef, teamData);
                console.log(`✅ Datos guardados en Firebase para ${teamName}`);
                return { success: true };
            } catch (error) {
                console.warn('⚠️ Error guardando en Firebase, usando localStorage como fallback', error);
                return { success: false, error };
            }
        }
        return { success: true, message: 'Guardado en localStorage (Firebase deshabilitado)' };
    };

    // =============================
    // FUNCIONES PARTIDAS
    // =============================
    async function saveGameToCloud(_, gameId, gameName, gameState) {
        const user = window.firebaseAuth?.currentUser;
        const userId = user?.uid;

        if (!userId || !window.firebaseDB) {
            console.warn('⚠️ Firebase no disponible o usuario no autenticado, guardando localmente');
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            localGames[gameId] = { id: gameId, name: gameName, gameState, lastSaved: Date.now() };
            localStorage.setItem('user_games', JSON.stringify(localGames));
            return { success: false, error: 'Firebase no disponible o usuario no autenticado' };
        }

        const gameData = { id: gameId, name: gameName, gameState, lastSaved: Date.now() };
        try {
            await setDoc(doc(window.firebaseDB, 'users', userId, 'saved_games', gameId), gameData);
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            localGames[gameId] = gameData;
            localStorage.setItem('user_games', JSON.stringify(localGames));
            console.log(`✅ Partida ${gameId} guardada en Firebase`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error guardando partida en Firebase:', error);
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            localGames[gameId] = gameData;
            localStorage.setItem('user_games', JSON.stringify(localGames));
            return { success: false, error: error.message };
        }
    }

    async function loadUserSavedGames(userId) {
        if (!userId || !window.firebaseDB) {
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            return Object.values(localGames);
        }

        try {
            const snapshot = await getDocs(collection(window.firebaseDB, 'users', userId, 'saved_games'));
            const games = [];
            snapshot.forEach(docSnap => games.push(docSnap.data()));

            const localGames = {};
            games.forEach(game => { localGames[game.id] = game; });
            localStorage.setItem('user_games', JSON.stringify(localGames));
            return games;
        } catch (error) {
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            return Object.values(localGames);
        }
    }

    async function loadGameFromCloud(userId, gameId) {
        if (!userId || !window.firebaseDB) {
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            return localGames[gameId] ? { success: true, data: localGames[gameId] } : { success: false, message: 'Partida no encontrada' };
        }

        try {
            const docSnap = await getDoc(doc(window.firebaseDB, 'users', userId, 'saved_games', gameId));
            if (!docSnap.exists()) return { success: false, message: 'Partida no encontrada' };
            const gameData = docSnap.data();
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            localGames[gameId] = gameData;
            localStorage.setItem('user_games', JSON.stringify(localGames));
            return { success: true, data: gameData };
        } catch (error) {
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            return localGames[gameId] ? { success: true, data: localGames[gameId] } : { success: false, message: 'Partida no encontrada' };
        }
    }

    async function deleteGameFromCloud(userId, gameId) {
        if (!userId || !window.firebaseDB) {
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            delete localGames[gameId];
            localStorage.setItem('user_games', JSON.stringify(localGames));
            return { success: true };
        }

        try {
            await deleteDoc(doc(window.firebaseDB, 'users', userId, 'saved_games', gameId));
            const localGames = JSON.parse(localStorage.getItem('user_games') || '{}');
            delete localGames[gameId];
            localStorage.setItem('user_games', JSON.stringify(localGames));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =============================
    // EXPORTAR FUNCIONES GLOBALMENTE
    // =============================
    window.saveGameToCloud = saveGameToCloud;
    window.loadUserSavedGames = loadUserSavedGames;
    window.loadGameFromCloud = loadGameFromCloud;
    window.deleteGameFromCloud = deleteGameFromCloud;

    window.getTeamDataFromFirebaseSafe = getTeamDataFromFirebaseSafe;

    console.log('✓ Firebase Sync Injector cargado correctamente');
})();
