// injector-firebase-sync.js
(function() {
    console.log('🔥 Firebase Sync Injector cargando...');

    // Verificar si Firebase está disponible
    const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;

    // Función para cargar datos de un equipo (intenta Firebase primero, luego localStorage)
    window.getTeamData = async function(teamName) {
        console.log(`📥 Cargando datos para ${teamName}...`);
        
        // Si Firebase está habilitado, intentar cargar desde Firebase primero
        if (isFirebaseEnabled && typeof window.getTeamDataFromFirebase === 'function') {
            const firebaseResult = await window.getTeamDataFromFirebase(teamName);
            if (firebaseResult.success && firebaseResult.data) {
                console.log(`✅ Datos cargados desde Firebase para ${teamName}`);
                // Guardar en localStorage como caché
                localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));
                return firebaseResult.data;
            }
        }
        
        // Si no está en Firebase o Firebase está deshabilitado, intentar localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);
            const data = JSON.parse(localData);
            
            // Si Firebase está habilitado, subir a Firebase para sincronizar
            if (isFirebaseEnabled && typeof window.saveTeamDataToFirebase === 'function') {
                await window.saveTeamDataToFirebase(teamName, data);
            }
            
            return data;
        }
        
        // No hay datos guardados, devolver valores por defecto
        console.log(`⚠️ No hay datos guardados para ${teamName}, usando valores por defecto`);
        return {
            logo: null,
            stadiumImage: null,
            stadiumCapacity: 10000,
            initialBudget: 5000000,
            stadiumName: 'Estadio Municipal'
        };
    };

    // Función para guardar datos de un equipo (guarda en Firebase y localStorage)
    window.saveTeamData = async function(teamName, teamData) {
        console.log(`💾 Guardando datos para ${teamName}...`);
        
        // Guardar en localStorage siempre (como caché/fallback)
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        console.log(`✅ Datos guardados en localStorage para ${teamName}`);
        
        // Si Firebase está habilitado, intentar guardar también en Firebase
        if (isFirebaseEnabled && typeof window.saveTeamDataToFirebase === 'function') {
            const firebaseResult = await window.saveTeamDataToFirebase(teamName, teamData);
            
            if (firebaseResult.success) {
                console.log(`✅ Datos guardados en Firebase para ${teamName}`);
                return { success: true };
            } else {
                console.error(`❌ Error guardando en Firebase:`, firebaseResult.error);
                return { success: false, error: firebaseResult.error };
            }
        }
        
        // Si Firebase no está habilitado, devolver éxito de localStorage
        return { success: true, message: 'Datos guardados en localStorage (Firebase deshabilitado)' };
    };

    // Función para cargar todos los datos (útil para exportar)
    window.getAllTeamsData = async function() {
        console.log(`📥 Cargando todos los datos de equipos...`);
        
        // Si Firebase está habilitado, intentar cargar desde Firebase primero
        if (isFirebaseEnabled && typeof window.getAllTeamsDataFromFirebase === 'function') {
            const firebaseResult = await window.getAllTeamsDataFromFirebase();
            if (firebaseResult.success) {
                console.log(`✅ Datos de todos los equipos cargados desde Firebase`);
                
                // Guardar en localStorage como caché
                Object.keys(firebaseResult.data).forEach(teamName => {
                    localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data[teamName]));
                });
                
                return firebaseResult.data;
            }
        }
        
        // Si Firebase falla o está deshabilitado, cargar desde localStorage
        console.log(`📦 Cargando desde localStorage...`);
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
        
        console.log(`✅ ${Object.keys(allData).length} equipos cargados desde localStorage`);
        return allData;
    };

    // Pre-cargar datos al iniciar (solo si Firebase está habilitado)
    if (isFirebaseEnabled) {
        window.addEventListener('DOMContentLoaded', async () => {
            console.log('🔥 Precargando datos de equipos desde Firebase...');
            if (typeof window.getAllTeamsDataFromFirebase === 'function') {
                const allData = await window.getAllTeamsDataFromFirebase();
                if (allData.success) {
                    console.log(`✅ ${Object.keys(allData.data).length} equipos precargados desde Firebase`);
                }
            }
        });
    }

    console.log('✓ Firebase Sync Injector cargado correctamente');
})();
