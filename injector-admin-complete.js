// injector-admin-complete.js (con gestión de plantillas)
(function() {
    // ⚙️ CONFIGURACIÓN DE ADMINISTRADORES
    const ADMIN_EMAILS = [
        'tonaco92@gmail.com'
    ];

    const DIVISIONS = {
        'primera': 'Primera División',
        'segunda': 'Segunda División',
        'rfef_grupo1': 'Primera RFEF Grupo 1',
        'rfef_grupo2': 'Primera RFEF Grupo 2'
    };

    const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MCD', 'MP', 'EXT', 'DC', 'SD'];
    const ATTRIBUTES = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];

    // Función para verificar si el usuario actual es administrador
    function isUserAdmin() {
        if (window.currentUser && window.currentUser.email) {
            return ADMIN_EMAILS.includes(window.currentUser.email);
        }
        
        const auth = window.firebaseAuth;
        if (auth && auth.currentUser && auth.currentUser.email) {
            return ADMIN_EMAILS.includes(auth.currentUser.email);
        }
        
        return false;
    }

    // Función para convertir imagen a Base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Calcular overall automáticamente
    function calculateOverall(player) {
        const attrs = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
        let sum = 0;
        let count = 0;
        attrs.forEach(attr => {
            if (player[attr] !== undefined && player[attr] !== null && player[attr] !== '') {
                sum += parseInt(player[attr]) || 0;
                count++;
            }
        });
        return count > 0 ? Math.round(sum / count) : 0;
    }

    window.openAdminPanel = function() {
        if (!isUserAdmin()) {
            alert('❌ No tienes permisos de administrador');
            return;
        }

        if (!window.gameLogic) {
            alert('El juego aún no está cargado completamente');
            return;
        }

        if (!document.getElementById('adminModal')) {
            const modal = document.createElement('div');
            modal.id = 'adminModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <<div class="modal-content" style="max-width: 1200px; width: 95vw; max-height: 90vh; overflow-y: auto; overflow-x: hidden;">
                    <span class="modal-close" onclick="document.getElementById('adminModal').classList.remove('active')">&times;</span>
                    <h1 style="color: #e94560;">🔧 Panel de Administración</h1>
                    
                    <!-- Tabs -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e94560;">
                        <button id="tabTeamData" class="admin-tab active" onclick="window.adminBackend.switchTab('teamData')">
                            🏟️ Datos del Equipo
                        </button>
                        <button id="tabSquad" class="admin-tab" onclick="window.adminBackend.switchTab('squad')">
                            👥 Plantilla
                        </button>
                        <button id="tabUsers" class="admin-tab" onclick="window.adminBackend.switchTab('users')">
                            🧑‍💼 Usuarios
                        </button>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2>Seleccionar Equipo</h2>
                        <label>División:</label>
                        <select id="adminDivisionSelect" onchange="window.adminBackend.loadTeamsFromDivision()" style="margin-bottom: 10px;">
                            <option value="">-- Selecciona una división --</option>
                            <option value="primera">Primera División</option>
                            <option value="segunda">Segunda División</option>
                            <option value="rfef_grupo1">Primera RFEF Grupo 1</option>
                            <option value="rfef_grupo2">Primera RFEF Grupo 2</option>
                        </select>
                        
                        <label>Equipo:</label>
                        <select id="adminTeamSelect" onchange="window.adminBackend.loadTeamData()">
                            <option value="">-- Selecciona un equipo --</option>
                        </select>
                    </div>

                    <!-- TAB: Datos del Equipo -->
                    <div id="tabContentTeamData" class="tab-content" style="display: block;">
                        <div id="adminTeamDataContainer" style="display: none;">
                            <h2>Datos del Equipo: <span id="adminCurrentTeamName"></span></h2>
                            
                            <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                                <h3>🏟️ Estadio</h3>
                                <div style="margin-bottom: 10px;">
                                    <label>Nombre del estadio:</label>
                                    <input id="adminStadiumName" type="text" placeholder="Ej: Santiago Bernabéu">
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label>Capacidad:</label>
                                    <input id="adminStadiumCapacity" type="number" step="1000" min="1000">
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label>Foto del estadio (.png/.jpg - máx 500KB):</label>
                                    <input id="adminStadiumImage" type="file" accept="image/png,image/jpeg">
                                    <small style="display: block; color: #999; margin-top: 5px;">Se guardará como Base64 en Firestore</small>
                                    <div id="adminStadiumPreview" style="margin-top: 10px;"></div>
                                </div>
                            </div>

                            <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                                <h3>🛡️ Escudo</h3>
                                <div style="margin-bottom: 10px;">
                                    <label>Escudo del equipo (.png/.jpg - máx 200KB):</label>
                                    <input id="adminTeamLogo" type="file" accept="image/png,image/jpeg">
                                    <small style="display: block; color: #999; margin-top: 5px;">Se guardará como Base64 en Firestore</small>
                                    <div id="adminLogoPreview" style="margin-top: 10px;"></div>
                                </div>
                            </div>

                            <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                                <h3>💰 Presupuesto Inicial</h3>
                                <div style="margin-bottom: 10px;">
                                    <label>Presupuesto inicial (€):</label>
                                    <input id="adminInitialBudget" type="number" step="1000000" min="0">
                                    <small style="display: block; color: #999; margin-top: 5px;">Este será el presupuesto al iniciar con este equipo</small>
                                </div>
                            </div>

                            <div style="margin-top: 20px;">
                                <button class="btn" onclick="window.adminBackend.saveTeamData()">💾 Guardar Datos del Equipo</button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: Plantilla -->
                    <div id="tabContentSquad" class="tab-content" style="display: none;">
                        <div id="adminSquadContainer" style="display: none;">
                            <h2>Plantilla de: <span id="adminSquadTeamName"></span></h2>
                            
                            <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                                <h3>⚽ Gestión de Jugadores</h3>
                                <p style="color: #999;">Define la plantilla real del equipo. Si no defines jugadores, se generarán aleatoriamente.</p>
                                
                                <div style="margin-bottom: 20px;">
                                    <button class="btn" onclick="window.adminBackend.addPlayer()" style="background: #00aa00;">
                                        ➕ Añadir Jugador
                                    </button>
                                    <button class="btn" onclick="window.adminBackend.importSquadJSON()" style="background: #0088cc;">
                                        📥 Importar JSON
                                    </button>
                                    <button class="btn" onclick="window.adminBackend.exportSquadJSON()" style="background: #ff9500;">
                                        📤 Exportar JSON
                                    </button>
                                    <input type="file" id="squadImportFile" accept=".json" style="display: none;" onchange="window.adminBackend.handleSquadImport(event)">
                                </div>

                                <div id="playersListContainer" style="max-height: 500px; overflow-y: auto;">
                                    <!-- Aquí se renderizarán los jugadores -->
                                </div>
                            </div>

                            <div style="margin-top: 20px;">
                                <button class="btn" onclick="window.adminBackend.saveSquadData()">💾 Guardar Plantilla</button>
                                <button class="btn" style="background: #c73446;" onclick="window.adminBackend.clearSquad()">🗑️ Limpiar Plantilla (volver a aleatorio)</button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: Usuarios -->
                    <div id="tabContentUsers" class="tab-content" style="display: none;">
                        <h2 style="color:#e94560;">🧑‍💼 Gestión de Usuarios</h2>
                        <p style="color:#999;margin-bottom:15px;">Usuarios registrados en la aplicación.</p>

                        <div style="margin-bottom:15px;">
                            <button class="btn" onclick="window.adminBackend.loadUsers()" style="background:#0088cc;">
                                🔄 Recargar lista
                            </button>
                            <button class="btn" onclick="window.adminBackend.migrateUsers()" style="background:#7b2fbe;">
                                🔀 Migrar usuarios existentes
                            </button>
                            <p style="color:#666;font-size:.8em;margin-top:6px;">
                                "Migrar" busca en las partidas guardadas y crea los perfiles de usuarios que se registraron antes de este sistema.
                            </p>
                        </div>

                        <div style="overflow-x:auto;">
                            <table id="adminUsersTable" style="width:100%;border-collapse:collapse;font-size:.88em;">
                                <thead>
                                    <tr style="border-bottom:2px solid #e94560;color:#e94560;">
                                        <th style="padding:8px;text-align:left;">Nombre</th>
                                        <th style="padding:8px;text-align:left;">Email</th>
                                        <th style="padding:8px;text-align:left;">Registro</th>
                                        <th style="padding:8px;text-align:center;">Estado</th>
                                        <th style="padding:8px;text-align:center;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="adminUsersTbody">
                                    <tr><td colspan="5" style="text-align:center;padding:20px;color:#666;">Pulsa "Recargar lista" para cargar usuarios</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e94560;">
                        <h3>📦 Importar/Exportar Todo</h3>
                        <button class="btn" style="background: #ff9500;" onclick="window.adminBackend.exportAllData()">📦 Exportar Todos los Datos</button>
                        <button class="btn" style="background: #00aa00;" onclick="document.getElementById('adminImportFile').click()">📥 Importar Datos</button>
                        <input type="file" id="adminImportFile" accept=".json" style="display: none;" onchange="window.adminBackend.importAllData(event)">
                    </div>

                    <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="document.getElementById('adminModal').classList.remove('active')">Cerrar</button>
                </div>
                
                 <style>
                    .admin-tab {
                        flex: 1;
                        padding: 12px;
                        border: none;
                        background: rgba(233, 69, 96, 0.3);
                        color: white;
                        cursor: pointer;
                        border-radius: 5px 5px 0 0;
                        transition: all 0.3s;
                    }
                    .admin-tab.active {
                        background: #e94560;
                    }
                    .admin-tab:hover {
                        opacity: 0.8;
                    }
                    .player-card {
                        background: rgba(255, 255, 255, 0.05);
                        padding: 15px;
                        margin-bottom: 10px;
                        border-radius: 5px;
                        border: 1px solid rgba(233, 69, 96, 0.3);
                    }
                    .player-card-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .player-inputs {
                        display: grid;
                        grid-template-columns: 110px 60px 55px;
                        gap: 5px;
                        margin-bottom: 10px;
                    }
                    .player-attributes {
                        display: grid;
                        grid-template-columns: repeat(9, 40px);
                        gap: 5px;
                    }
                    .attr-input {
                        width: 100%;
                        min-width: 20px; /* asegura que el input no se colapse */
                        padding: 5px;
                        text-align: center;
                    }
                </style>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('adminModal').classList.add('active');
    };

    window.adminBackend = {
        currentTeam: null,
        currentDivision: null,
        currentTab: 'teamData',
        squadPlayers: [],

        switchTab: function(tab) {
            // Ocultar todos
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
            // Mostrar el seleccionado
            const content = document.getElementById('tabContent' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (content) content.style.display = 'block';
            const tabBtn = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (tabBtn) tabBtn.classList.add('active');
            // Cargar usuarios automáticamente al abrir el tab
            if (tab === 'users') window.adminBackend.loadUsers();
        },

        loadTeamsFromDivision: function() {
            const divisionKey = document.getElementById('adminDivisionSelect').value;
            const teamSelect = document.getElementById('adminTeamSelect');
            
            if (!divisionKey) {
                teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>';
                document.getElementById('adminTeamDataContainer').style.display = 'none';
                document.getElementById('adminSquadContainer').style.display = 'none';
                return;
            }

            this.currentDivision = divisionKey;
            const teams = window.TEAMS_DATA[divisionKey] || [];
            
            teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>' + 
                teams.map(team => `<option value="${team}">${team}</option>`).join('');
            
            document.getElementById('adminTeamDataContainer').style.display = 'none';
            document.getElementById('adminSquadContainer').style.display = 'none';
        },

        loadTeamData: async function() {
            const teamName = document.getElementById('adminTeamSelect').value;
            if (!teamName) {
                document.getElementById('adminTeamDataContainer').style.display = 'none';
                document.getElementById('adminSquadContainer').style.display = 'none';
                return;
            }

            this.currentTeam = teamName;
            document.getElementById('adminCurrentTeamName').textContent = teamName;
            document.getElementById('adminSquadTeamName').textContent = teamName;
            document.getElementById('adminTeamDataContainer').style.display = 'block';
            document.getElementById('adminSquadContainer').style.display = 'block';

            // Cargar datos del equipo
            const teamData = await window.getTeamData(teamName);

            // Rellenar formulario de datos del equipo
            document.getElementById('adminStadiumName').value = teamData.stadiumName || '';
            document.getElementById('adminStadiumCapacity').value = teamData.stadiumCapacity || 10000;
            document.getElementById('adminInitialBudget').value = teamData.initialBudget || 5000000;

            // Mostrar previews
            if (teamData.logo) {
                document.getElementById('adminLogoPreview').innerHTML = 
                    `<img src="${teamData.logo}" style="max-width: 100px; max-height: 100px; border: 2px solid #e94560; border-radius: 5px;">`;
            } else {
                document.getElementById('adminLogoPreview').innerHTML = '<p style="color: #999;">No hay escudo cargado</p>';
            }

            if (teamData.stadiumImage) {
                document.getElementById('adminStadiumPreview').innerHTML = 
                    `<img src="${teamData.stadiumImage}" style="max-width: 200px; max-height: 150px; border: 2px solid #e94560; border-radius: 5px;">`;
            } else {
                document.getElementById('adminStadiumPreview').innerHTML = '<p style="color: #999;">No hay foto del estadio</p>';
            }

            // Cargar plantilla
            this.squadPlayers = teamData.squad || [];
            this.renderSquadList();
        },

        renderSquadList: function() {
            const container = document.getElementById('playersListContainer');
            
            if (this.squadPlayers.length === 0) {
                container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay jugadores definidos. Se generarán aleatoriamente al iniciar el juego.</p>';
                return;
            }

            container.innerHTML = this.squadPlayers.map((player, index) => `
                <div class="player-card">
                    <div class="player-card-header">
                        <strong style="color: #e94560;">#${index + 1} - OVR: ${player.overall || calculateOverall(player)}</strong>
                        <button class="btn" style="background: #c73446; padding: 2px 6px;" onclick="window.adminBackend.removePlayer(${index})">🗑️</button>
                    </div>
                    
                    <!-- Datos básicos -->
                    <div class="player-inputs">
                        <input type="text" placeholder="Nombre" value="${player.name || ''}" onchange="window.adminBackend.updatePlayer(${index}, 'name', this.value)">
                        <select onchange="window.adminBackend.updatePlayer(${index}, 'position', this.value)">
                            ${POSITIONS.map(pos => `<option value="${pos}" ${player.position === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                        </select>
                        <input type="number" placeholder="Edad" value="${player.age || 25}" min="16" max="40" onchange="window.adminBackend.updatePlayer(${index}, 'age', parseInt(this.value))">
                    </div>
                    
                    <!-- Datos de contrato -->
                    <div style="margin: 10px 0; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                        <small style="color: #999; display: block; margin-bottom: 5px;">📝 Contrato:</small>
                        <div style="display: grid; grid-template-columns: 1fr 40px 60px 1fr; gap: 5px;">
                            <div>
                                <small style="color: #e94560;">Tipo</small>
                                <select style="width: 100%; padding: 5px;" onchange="window.adminBackend.updatePlayer(${index}, 'contractType', this.value)">
                                    <option value="owned" ${(player.contractType || 'owned') === 'owned' ? 'selected' : ''}>Propiedad</option>
                                    <option value="loaned" ${player.contractType === 'loaned' ? 'selected' : ''}>Cedido</option>
                                </select>
                            </div>
                            <div>
                                <small style="color: #e94560;">Años</small>
                                <input type="number" style="width: 100%; padding: 5px;" min="0" max="10" value="${player.contractYears || 3}" onchange="window.adminBackend.updatePlayer(${index}, 'contractYears', parseInt(this.value))">
                            </div>
                            <div>
                                <small style="color: #e94560;">Salario/m</small>
                                <input type="number" style="width: 100%; padding: 5px;" min="0" step="100" value="${player.salary || 1000}" onchange="window.adminBackend.updatePlayer(${index}, 'salary', parseInt(this.value))">
                            </div>
                            <div>
                                <small style="color: #e94560;">Cláusula </small>
                                <input type="number" style="width: 100%; padding: 5px;" min="0" step="10000" value="${player.releaseClause || 0}" onchange="window.adminBackend.updatePlayer(${index}, 'releaseClause', parseInt(this.value))">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Atributos -->
                   
                    <div class="player-attributes">
                        ${ATTRIBUTES.map(attr => `
                            <div>
                                <small style="color: #e94560;">${attr}</small>
                                <input type="number" class="attr-input" min="1" max="99" value="${player[attr] || 50}" onchange="window.adminBackend.updatePlayerAttr(${index}, '${attr}', parseInt(this.value))">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        },

        addPlayer: function() {
            const newPlayer = {
                name: 'Nuevo Jugador',
                position: 'MC',
                age: 25,
                EN: 50, VE: 50, RE: 50, AG: 50, CA: 50, EF: 50, MO: 50, AT: 50, DF: 50,
                contractType: 'owned',
                contractYears: 3,
                salary: 1000,
                releaseClause: 100000
            };
            this.squadPlayers.push(newPlayer);
            this.renderSquadList();
        },

        removePlayer: function(index) {
            if (confirm('¿Eliminar este jugador?')) {
                this.squadPlayers.splice(index, 1);
                this.renderSquadList();
            }
        },

        updatePlayer: function(index, field, value) {
            this.squadPlayers[index][field] = value;
            this.renderSquadList();
        },

        updatePlayerAttr: function(index, attr, value) {
            this.squadPlayers[index][attr] = Math.min(99, Math.max(1, value));
            this.squadPlayers[index].overall = calculateOverall(this.squadPlayers[index]);
            this.renderSquadList();
        },

        clearSquad: function() {
            if (confirm('¿Eliminar toda la plantilla? El equipo generará jugadores aleatorios.')) {
                this.squadPlayers = [];
                this.renderSquadList();
            }
        },

        exportSquadJSON: function() {
            if (this.squadPlayers.length === 0) {
                alert('No hay jugadores para exportar');
                return;
            }

            const dataStr = JSON.stringify(this.squadPlayers, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentTeam}_plantilla.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        },

        importSquadJSON: function() {
            document.getElementById('squadImportFile').click();
        },

        handleSquadImport: function(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (!Array.isArray(imported)) {
                        alert('❌ El archivo debe contener un array de jugadores');
                        return;
                    }
                    
                    this.squadPlayers = imported;
                    this.renderSquadList();
                    alert(`✅ Plantilla importada: ${imported.length} jugadores`);
                } catch (error) {
                    alert('❌ Error al importar: ' + error.message);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        saveTeamData: async function() {
            if (!this.currentTeam) {
                alert('Selecciona un equipo primero');
                return;
            }

            const logoFile = document.getElementById('adminTeamLogo').files[0];
            const stadiumFile = document.getElementById('adminStadiumImage').files[0];

            const teamData = {
                stadiumName: document.getElementById('adminStadiumName').value || 'Estadio Municipal',
                stadiumCapacity: parseInt(document.getElementById('adminStadiumCapacity').value) || 10000,
                initialBudget: parseInt(document.getElementById('adminInitialBudget').value) || 5000000
            };

            // Cargar datos existentes
            const existingData = await window.getTeamData(this.currentTeam);
            teamData.logo = existingData.logo || null;
            teamData.stadiumImage = existingData.stadiumImage || null;
            teamData.squad = existingData.squad || [];

            try {
                if (logoFile) {
                    if (logoFile.size > 200 * 1024) {
                        alert('⚠️ El escudo es demasiado grande. Máximo 200KB.');
                        return;
                    }
                    teamData.logo = await fileToBase64(logoFile);
                }

                if (stadiumFile) {
                    if (stadiumFile.size > 500 * 1024) {
                        alert('⚠️ La imagen del estadio es demasiado grande. Máximo 500KB.');
                        return;
                    }
                    teamData.stadiumImage = await fileToBase64(stadiumFile);
                }

                const saveResult = await window.saveTeamDataToFirebase(this.currentTeam, teamData);
                
                if (saveResult.success) {
                    alert(`✅ Datos del equipo guardados`);
                    await this.loadTeamData();
                } else {
                    alert(`❌ Error: ${saveResult.error}`);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        },

        saveSquadData: async function() {
            if (!this.currentTeam) {
                alert('Selecciona un equipo primero');
                return;
            }

            try {
                const existingData = await window.getTeamData(this.currentTeam);
                existingData.squad = this.squadPlayers;

                const saveResult = await window.saveTeamDataToFirebase(this.currentTeam, existingData);
                
                if (saveResult.success) {
                    alert(`✅ Plantilla guardada: ${this.squadPlayers.length} jugadores`);
                } else {
                    alert(`❌ Error: ${saveResult.error}`);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        },

        exportAllData: async function() {
            const allData = await window.getAllTeamsData();
            const dataStr = JSON.stringify(allData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `pcfutbol_data_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        },

        importAllData: async function(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const promises = Object.keys(data).map(teamName => 
                        window.saveTeamDataToFirebase(teamName, data[teamName])
                    );
                    await Promise.all(promises);
                    alert(`✅ Importados ${Object.keys(data).length} equipos`);
                    if (this.currentTeam) await this.loadTeamData();
                } catch (error) {
                    alert('❌ Error: ' + error.message);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        // ── Gestión de Usuarios ──────────────────────────────────
        loadUsers: async function() {
            const tbody = document.getElementById('adminUsersTbody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">⏳ Cargando usuarios...</td></tr>';

            try {
                const { getFirestore, collection, getDocs } =
                    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const firestore = getFirestore();
                const snap = await getDocs(collection(firestore, 'game_users'));

                if (snap.empty) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#666;">No hay usuarios registrados aún</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                snap.forEach(doc => {
                    const d = doc.data();
                    const suspended = d.suspended || false;
                    const createdAt = d.createdAt?.toDate?.()?.toLocaleDateString('es-ES') || '-';
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #2a2a2a';
                    tr.innerHTML = `
                        <td style="padding:8px;">${d.name || '-'}</td>
                        <td style="padding:8px;color:#aaa;">${d.email || doc.id}</td>
                        <td style="padding:8px;color:#666;font-size:.82em;">${createdAt}</td>
                        <td style="padding:8px;text-align:center;">
                            <span style="padding:3px 8px;border-radius:10px;font-size:.8em;
                                background:${suspended ? 'rgba(200,40,40,.3)' : 'rgba(50,200,50,.2)'};
                                color:${suspended ? '#ff6666' : '#66ff88'};">
                                ${suspended ? '🔴 Suspendido' : '🟢 Activo'}
                            </span>
                        </td>
                        <td style="padding:8px;text-align:center;white-space:nowrap;">
                            <button onclick="window.adminBackend.toggleSuspend('${doc.id}', ${suspended})"
                                style="margin:2px;padding:4px 10px;border:none;border-radius:5px;cursor:pointer;
                                       background:${suspended ? '#2196F3' : '#ff9500'};color:#fff;font-size:.8em;">
                                ${suspended ? '✅ Reactivar' : '⏸ Suspender'}
                            </button>
                            <button onclick="window.adminBackend.resetUserPassword('${doc.id}', '${d.email || ''}')"
                                style="margin:2px;padding:4px 10px;border:none;border-radius:5px;cursor:pointer;
                                       background:#555;color:#fff;font-size:.8em;">
                                🔑 Reset PW
                            </button>
                            <button onclick="window.adminBackend.deleteUser('${doc.id}', '${d.email || ''}')"
                                style="margin:2px;padding:4px 10px;border:none;border-radius:5px;cursor:pointer;
                                       background:#c73446;color:#fff;font-size:.8em;">
                                🗑 Eliminar
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                console.error('Error cargando usuarios:', err);
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#f66;">❌ Error: ${err.message}</td></tr>`;
            }
        },

        toggleSuspend: async function(uid, currentlySuspended) {
            try {
                const { getFirestore, doc, updateDoc } =
                    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const firestore = getFirestore();
                await updateDoc(doc(firestore, 'game_users', uid), { suspended: !currentlySuspended });
                alert(currentlySuspended ? '✅ Usuario reactivado' : '⏸ Usuario suspendido');
                this.loadUsers();
            } catch (err) {
                alert('❌ Error: ' + err.message);
            }
        },

        resetUserPassword: async function(uid, email) {
            if (!email) return alert('No hay email asociado a este usuario');
            if (!confirm(`¿Enviar email de recuperación de contraseña a ${email}?`)) return;
            try {
                const { sendPasswordResetEmail } =
                    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                await sendPasswordResetEmail(window.firebaseAuth, email);
                alert(`✅ Email de recuperación enviado a ${email}`);
            } catch (err) {
                alert('❌ Error: ' + err.message);
            }
        },

        deleteUser: async function(uid, email) {
            if (!confirm(`¿Eliminar usuario ${email}? Esta acción no se puede deshacer.`)) return;
            try {
                const { getFirestore, doc, deleteDoc } =
                    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const firestore = getFirestore();
                await deleteDoc(doc(firestore, 'game_users', uid));
                alert('✅ Usuario eliminado');
                this.loadUsers();
            } catch (err) {
                alert('❌ Error: ' + err.message);
            }
        },

        // Migrar usuarios existentes desde la colección 'users' (partidas guardadas)
        migrateUsers: async function() {
            if (!confirm('Esto buscará todos los usuarios con partidas guardadas y creará su perfil en game_users si no existe. ¿Continuar?')) return;

            const tbody = document.getElementById('adminUsersTbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">⏳ Migrando usuarios...</td></tr>';

            try {
                const { getFirestore, collection, getDocs, doc, getDoc, setDoc, serverTimestamp } =
                    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const firestore = getFirestore();

                // Leer todos los documentos de 'users' (cada uno es un uid)
                const usersSnap = await getDocs(collection(firestore, 'users'));

                let migrated = 0;
                let skipped = 0;

                for (const userDoc of usersSnap.docs) {
                    const uid = userDoc.id;

                    // Comprobar si ya existe en game_users
                    const existing = await getDoc(doc(firestore, 'game_users', uid));
                    if (existing.exists()) { skipped++; continue; }

                    // Intentar obtener el email desde las partidas guardadas
                    let email = null;
                    let name = null;
                    try {
                        const gamesSnap = await getDocs(collection(firestore, 'users', uid, 'saved_games'));
                        if (!gamesSnap.empty) {
                            // El email lo sacamos del currentUser si coincide, o dejamos el uid
                            const firstGame = gamesSnap.docs[0].data();
                            name = firstGame.team ? `Jugador (${firstGame.team})` : null;
                        }
                    } catch(e) {}

                    // Si el uid coincide con el usuario actual logueado, podemos sacar su email
                    if (window.firebaseAuth?.currentUser?.uid === uid) {
                        email = window.firebaseAuth.currentUser.email;
                        name = window.firebaseAuth.currentUser.displayName || name;
                    }

                    // Crear documento en game_users
                    await setDoc(doc(firestore, 'game_users', uid), {
                        email: email || `uid:${uid}`,
                        name: name || uid.substring(0, 8) + '...',
                        suspended: false,
                        migrated: true,
                        createdAt: serverTimestamp()
                    });
                    migrated++;
                }

                alert(`✅ Migración completada.\n• Migrados: ${migrated}\n• Ya existían: ${skipped}\n\nNota: los emails pueden aparecer como "uid:xxxx" si el usuario no ha iniciado sesión desde este dispositivo. Se actualizarán automáticamente en el próximo login.`);
                this.loadUsers();

            } catch (err) {
                console.error('Error en migración:', err);
                alert('❌ Error durante la migración: ' + err.message);
            }
        }
    };

    // Auto-activar panel de admin
    window.addEventListener('DOMContentLoaded', () => {
        if (window.authReadyPromise) {
            window.authReadyPromise.then(() => {
                setTimeout(() => {
                    if (isUserAdmin()) {
                        const headerInfo = document.querySelector('.header-info');
                        if (headerInfo && !document.getElementById('adminButton')) {
                            const adminBtn = document.createElement('button');
                            adminBtn.id = 'adminButton';
                            adminBtn.className = 'btn btn-sm';
                            adminBtn.innerHTML = '⚙️ Admin';
                            adminBtn.onclick = () => window.openAdminPanel();
                            adminBtn.style.background = '#ff9500';
                            headerInfo.appendChild(adminBtn);
                            console.log('✅ Botón de administrador añadido');
                        }
                    }
                }, 1000);
            });
        }
    });
})();
