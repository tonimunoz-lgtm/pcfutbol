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
    // Helper seguro: carga o crea documento en Firebase
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
    // Función principal: obtener datos de un equipo
    // =============================
    window.getTeamData = async function(teamName) {
        console.log(`📥 Cargando datos para ${teamName}...`);

        // Intentar Firebase primero
        const firebaseResult = await getTeamDataFromFirebaseSafe(teamName);
        if (firebaseResult.success && firebaseResult.data) {
            console.log(`✅ Datos cargados desde Firebase para ${teamName}`);
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));
            return firebaseResult.data;
        }

        // Fallback a localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);
            return JSON.parse(localData);
        }

        // Último recurso: datos por defecto
        console.log(`⚠️ No hay datos en Firebase ni en localStorage para ${teamName}, usando valores por defecto`);
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(defaultTeamData));
        return defaultTeamData;
    };

    // =============================
    // Función para guardar datos de un equipo
    // =============================
    window.saveTeamData = async function(teamName, teamData) {
        console.log(`💾 Guardando datos para ${teamName}...`);

        // Guardar en localStorage siempre
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        console.log(`✅ Datos guardados en localStorage para ${teamName}`);

        // Guardar en Firebase si está habilitado
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
    // Precargar todos los equipos al iniciar
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

    console.log('✓ Firebase Sync Injector cargado correctamente');
})();
