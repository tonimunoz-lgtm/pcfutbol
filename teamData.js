// teamData.js - Base de datos de equipos con datos reales
const TEAM_DATA = {
    // Primera División
    'Real Madrid': {
        logo: null, // Se cargará desde localStorage o se subirá
        stadiumImage: null,
        stadiumCapacity: 81044,
        initialBudget: 80000000,
        stadiumName: 'Santiago Bernabéu'
    },
    'FC Barcelona': {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 99354,
        initialBudget: 75000000,
        stadiumName: 'Spotify Camp Nou'
    },
    'Atlético Madrid': {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 70460,
        initialBudget: 50000000,
        stadiumName: 'Cívitas Metropolitano'
    },
    // ... Añade más equipos según necesites
};

// Función para obtener datos del equipo (con fallback a localStorage)
function getTeamData(teamName) {
    const storedData = localStorage.getItem(`team_data_${teamName}`);
    if (storedData) {
        return JSON.parse(storedData);
    }
    return TEAM_CUSTOM_DATA[teamName] || {
        logo: null,
        stadiumImage: null,
        stadiumCapacity: 10000,
        initialBudget: 5000000,
        stadiumName: 'Estadio Municipal'
    };
}

// Función para guardar datos del equipo
function saveTeamData(teamName, data) {
    localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));
}

// Función para cargar todos los datos de equipos desde localStorage
function loadAllTeamData() {
    const allData = {};
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('team_data_')) {
            const teamName = key.replace('team_data_', '');
            allData[teamName] = JSON.parse(localStorage.getItem(key));
        }
    });
    return allData;
}

export { TEAM_CUSTOM_DATA, getTeamData, saveTeamData, loadAllTeamData };
