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

    // Función para cargar datos de un equipo
    window.getTeamData = async function(teamName) {
        console.log(`📥 Cargando datos para ${teamName}...`);

        // Validar Firebase y autenticación
        if (isFirebaseEnabled && typeof window.getTeamDataFromFirebase === 'function') {
            try {
                const user = window.firebaseAuth?.currentUser;
                if (!user) {
                    console.warn('⚠️ Usuario no autenticado, usando localStorage como fallback');
                } else {
                    const firebaseResult = await window.getTeamDataFromFirebase(teamName);

                    if (firebaseResult.success) {
                        if (firebaseResult.data) {
                            console.log(`✅ Datos cargados desde Firebase para ${teamName}`);
                            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));
                            return firebaseResult.data;
                        } else {
                            console.log(`⚠️ Documento no encontrado en Firebase, creando datos por defecto para ${teamName}`);
                            await window.saveTeamDataToFirebase(teamName, defaultTeamData);
                            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(defaultTeamData));
                            return defaultTeamData;
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error accediendo a Firebase, usando localStorage como fallback', error);
            }
        }

        // Fallback a localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);
            return JSON.parse(localData);
        }

        // Último recurso: datos por defecto
        console.log(`⚠️ No hay datos en Firebase ni localStorage, usando valores por defecto`);
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(defaultTeamData));
        return defaultTeamData;
    };

    // Función para guardar datos de un equipo
    window.saveTeamData = async function(teamName, teamData) {
        console.log(`💾 Guardando datos para ${teamName}...`);

        // Guardar siempre en localStorage
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        console.log(`✅ Datos guardados en localStorage para ${teamName}`);

        if (isFirebaseEnabled && typeof window.saveTeamDataToFirebase === 'function') {
            try {
                const user = window.firebaseAuth?.currentUser;
                if (!user) {
                    console.warn('⚠️ Usuario no autenticado, datos guardados solo en localStorage');
                    return { success: false, message: 'Usuario no autenticado, guardado en localStorage' };
                }

                const firebaseResult = await window.saveTeamDataToFirebase(teamName, teamData);
                if (firebaseResult.success) {
                    console.log(`✅ Datos guardados en Firebase para ${teamName}`);
                    return { success: true };
                } else {
                    console.warn(`⚠️ Error guardando en Firebase, usando localStorage:`, firebaseResult.error);
                    return { success: false, error: firebaseResult.error };
                }
            } catch (error) {
                console.warn('⚠️ Error guardando en Firebase, usando localStorage', error);
                return { success: false, error };
            }
        }

        return { success: true, message: 'Datos guardados en localStorage (Firebase deshabilitado)' };
    };

    // Precargar todos los equipos al iniciar
    if (isFirebaseEnabled) {
        window.addEventListener('DOMContentLoaded', async () => {
            console.log('🔥 Precargando datos de equipos desde Firebase...');
            if (typeof window.getAllTeamsDataFromFirebase === 'function') {
                try {
                    const allData = await window.getAllTeamsDataFromFirebase();
                    if (allData.success) {
                        Object.keys(allData.data).forEach(teamName => {
                            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(allData.data[teamName]));
                        });
                        console.log(`✅ ${Object.keys(allData.data).length} equipos precargados desde Firebase`);
                    }
                } catch (error) {
                    console.warn('⚠️ Error precargando datos de Firebase, usando localStorage como fallback', error);
                }
            }
        });
    }

    console.log('✓ Firebase Sync Injector cargado correctamente');
})();
