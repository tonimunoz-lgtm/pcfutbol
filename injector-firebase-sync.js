// injector-firebase-sync.js
import { 
    saveTeamDataToFirebase, 
    getTeamDataFromFirebase,
    getAllTeamsDataFromFirebase 
} from './firebase-config.js';

(function() {
    console.log('🔥 Firebase Sync Injector cargando...');

    // Función para cargar datos de un equipo (intenta Firebase primero, luego localStorage)
    window.getTeamData = async function(teamName) {
        console.log(`📥 Cargando datos para ${teamName}...`);
        
        // Intentar cargar desde Firebase primero
        const firebaseResult = await getTeamDataFromFirebase(teamName);
        if (firebaseResult.success && firebaseResult.data) {
            console.log(`✅ Datos cargados desde Firebase para ${teamName}`);
            // Guardar en localStorage como caché
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));
            return firebaseResult.data;
        }
        
        // Si no está en Firebase, intentar localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);
            const data = JSON.parse(localData);
            // Subir a Firebase para sincronizar
            await saveTeamDataToFirebase(teamName, data);
            return data;
        }
        
        // No hay datos guardados
        console.log(`⚠️ No hay datos guardados para ${teamName}`);
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
        
        // Guardar en Firebase
        const firebaseResult = await saveTeamDataToFirebase(teamName, teamData);
        
        // Guardar en localStorage como caché
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        
        if (firebaseResult.success) {
            console.log(`✅ Datos guardados correctamente para ${teamName}`);
            return { success: true };
        } else {
            console.error(`❌ Error guardando en Firebase:`, firebaseResult.error);
            return { success: false, error: firebaseResult.error };
        }
    };

    // Función para cargar todos los datos (útil para exportar)
    window.getAllTeamsData = async function() {
        console.log(`📥 Cargando todos los datos de equipos...`);
        
        const firebaseResult = await getAllTeamsDataFromFirebase();
        if (firebaseResult.success) {
            console.log(`✅ Datos de todos los equipos cargados desde Firebase`);
            
            // Guardar en localStorage como caché
            Object.keys(firebaseResult.data).forEach(teamName => {
                localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data[teamName]));
            });
            
            return firebaseResult.data;
        }
        
        // Si falla Firebase, intentar localStorage
        console.log(`⚠️ Cargando desde localStorage como fallback...`);
        const allData = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('team_data_')) {
                const teamName = key.replace('team_data_', '');
                allData[teamName] = JSON.parse(localStorage.getItem(key));
            }
        });
        return allData;
    };

    // Pre-cargar datos al iniciar
    window.addEventListener('DOMContentLoaded', async () => {
        console.log('🔥 Precargando datos de equipos desde Firebase...');
        const allData = await getAllTeamsDataFromFirebase();
        if (allData.success) {
            console.log(`✅ ${Object.keys(allData.data).length} equipos precargados`);
        }
    });

    console.log('✓ Firebase Sync Injector cargado');
})();
