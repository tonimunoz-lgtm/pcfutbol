// injector-firebase-sync.js
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
    // HELPER SEGURO: Cargar o crear documento de equipo en Firebase
    // =============================
    async function getTeamDataFromFirebaseSafe(teamName) {
        if (!isFirebaseEnabled || !window.firebaseDB) return { success: false, data: null };

        try {
            const user = window.firebaseAuth?.currentUser;
            if (!user) {
                console.warn('⚠️ Usuario no autenticado, no se puede acceder a Firebase');
                return { success: false, data: null };
            }

            const docRef = doc(window.firebaseDB, 'teams_data', teamName);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { success: true, data: docSnap.data() };
            } else {
                console.log(`⚠️ Documento "${teamName}" no encontrado en Firebase, creando por defecto...`);
                await setDoc(docRef, defaultTeamData);
                return { success: true, data: defaultTeamData };
            }
        } catch (error) {
            console.error('❌ Error accediendo a Firebase:', error);
            return { success: false, data: null, error };
        }
    }

    // =============================
    // EQUIPOS: Obtener datos de un equipo
    // =============================
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

    // =============================
    // EQUIPOS: Guardar datos de un equipo
    // =============================
    window.saveTeamData = async function(teamName, teamData) {
        console.log(`💾 Guardando datos para ${teamName}...`);

        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        console.log(`✅ Datos guardados en localStorage para ${teamName}`);

        if (isFirebaseEnabled && window.firebaseDB) {
            try {
                const user = window.firebaseAuth?.currentUser;
                if (!user) {
                    console.warn('⚠️ Usuario no autenticado, datos guardados solo en localStorage');
                    return { success: false, message: 'Usuario no autenticado, guardado en localStorage' };
                }

                const docRef = doc(window.firebaseDB, 'teams_data', teamName);
                await setDoc(docRef, teamData);
                console.log(`✅ Datos guardados en Firebase para ${teamName}`);
                return { success: true };
            } catch (error) {
                console.warn('⚠️ Error guardando en Firebase, usando localStorage', error);
                return { success: false, error };
            }
        }

        return { success: true, message: 'Datos guardados en localStorage (Firebase deshabilitado)' };
    };

    // =============================
    // PRECARGAR TODOS LOS EQUIPOS
    // =============================
    if (isFirebaseEnabled && window.firebaseDB) {
        window.addEventListener('DOMContentLoaded', async () => {
            console.log('🔥 Precargando datos de equipos desde Firebase...');
            try {
                const collectionRef = collection(window.firebaseDB, 'teams_data');
                const querySnapshot = await getDocs(collectionRef);

                querySnapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    localStorage.setItem(`team_data_${docSnap.id}`, JSON.stringify(data));
                });

                console.log(`✅ ${querySnapshot.size} equipos precargados desde Firebase`);
            } catch (error) {
                console.warn('⚠️ Error precargando datos desde Firebase, usando localStorage como fallback', error);
            }
        });
    }

    // =============================
    // PARTIDAS: Guardar partida en Firebase
    // =============================
    async function saveGameToCloud(userId, gameId, gameName, gameState) {
        if (!window.firebaseConfig?.enabled || !window.firebaseDB) {
            console.warn('⚠️ Firebase no disponible, guardando solo en localStorage');
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            localGames[gameId] = { id: gameId, name: gameName, team: gameState.team, week: gameState.week, lastSaved: Date.now(), gameState };
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
            return { success: false, error: 'Firebase no disponible' };
        }

        const user = window.firebaseAuth?.currentUser;
        if (!user) {
            console.warn('⚠️ Usuario no autenticado, guardando solo en localStorage');
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            localGames[gameId] = { id: gameId, name: gameName, team: gameState.team, week: gameState.week, lastSaved: Date.now(), gameState };
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
            return { success: false, error: 'Usuario no autenticado' };
        }

        const gameData = { id: gameId, name: gameName, team: gameState.team, week: gameState.week, division: gameState.division || null, lastSaved: Date.now(), gameState };

        try {
            const docRef = doc(window.firebaseDB, 'users', userId, 'saved_games', gameId);
            await setDoc(docRef, gameData);
            console.log(`✅ Partida ${gameId} guardada en Firebase`);

            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            localGames[gameId] = gameData;
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));

            return { success: true };
        } catch (error) {
            console.error('❌ Error guardando partida en Firebase:', error);
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            localGames[gameId] = gameData;
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
            return { success: false, error: error.message };
        }
    }

    // =============================
    // PARTIDAS: Cargar todas las partidas de un usuario
    // =============================
    async function loadUserSavedGames(userId) {
        if (!window.firebaseConfig?.enabled || !window.firebaseDB) {
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            return Object.values(localGames);
        }

        const user = window.firebaseAuth?.currentUser;
        if (!user) {
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            return Object.values(localGames);
        }

        try {
            const querySnapshot = await getDocs(collection(window.firebaseDB, 'users', userId, 'saved_games'));
            const games = [];
            querySnapshot.forEach(docSnap => { games.push(docSnap.data()); });

            const localGames = {};
            games.forEach(game => { localGames[game.id] = game; });
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));

            console.log(`✅ ${games.length} partidas cargadas desde Firebase`);
            return games;
        } catch (error) {
            console.error('❌ Error cargando partidas desde Firebase:', error);
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            return Object.values(localGames);
        }
    }

    // =============================
    // PARTIDAS: Cargar una partida concreta
    // =============================
    async function loadGameFromCloud(userId, gameId) {
        const user = window.firebaseAuth?.currentUser;
        if (!window.firebaseConfig?.enabled || !window.firebaseDB || !user) {
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            if (localGames[gameId]) {
                if (window.gameLogic) window.gameLogic.updateGameState(localGames[gameId].gameState);
                return { success: true, data: localGames[gameId] };
            }
            return { success: false, message: 'Partida no encontrada' };
        }

        try {
            const docRef = doc(window.firebaseDB, 'users', userId, 'saved_games', gameId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const gameData = docSnap.data();
                if (window.gameLogic) window.gameLogic.updateGameState(gameData.gameState);

                const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
                localGames[gameId] = gameData;
                localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));

                return { success: true, data: gameData };
            }
            return { success: false, message: 'Partida no encontrada en Firebase' };
        } catch (error) {
            console.error('❌ Error cargando partida desde Firebase:', error);
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            return localGames[gameId] ? { success: true, data: localGames[gameId] } : { success: false, message: 'Partida no encontrada' };
        }
    }

    // =============================
    // PARTIDAS: Eliminar una partida
    // =============================
    async function deleteGameFromCloud(userId, gameId) {
        const user = window.firebaseAuth?.currentUser;
        if (!window.firebaseConfig?.enabled || !window.firebaseDB || !user) {
            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            delete localGames[gameId];
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
            return { success: true };
        }

        try {
            const docRef = doc(window.firebaseDB, 'users', userId, 'saved_games', gameId);
            await deleteDoc(docRef);

            const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
            delete localGames[gameId];
            localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));

            return { success: true };
        } catch (error) {
            console.error('❌ Error eliminando partida de Firebase:', error);
            return { success: false, error: error.message };
        }
    }

    // =============================
    // EXPORTAR FUNCIONES DE PARTIDAS GLOBALMENTE
    // =============================
    window.saveGameToCloud = saveGameToCloud;
    window.loadUserSavedGames = loadUserSavedGames;
    window.loadGameFromCloud = loadGameFromCloud;
    window.deleteGameFromCloud = deleteGameFromCloud;

    console.log('✓ Firebase Sync Injector cargado correctamente');
})();
