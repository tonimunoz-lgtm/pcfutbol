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

    // Mismas posiciones que el juego (config.js)
    const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MC', 'MCO', 'MD', 'MI', 'EXT', 'DC'];
    const ATTRIBUTES = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
    // Posiciones que se usaban antes en el Admin o en JSON externos → equivalente del juego
    const POSITION_ALIASES = {
        GK: 'POR', PT: 'POR', CB: 'DFC', DF: 'DFC', LB: 'LI', LWB: 'LI', RB: 'LD', RWB: 'LD',
        MCD: 'MC', CDM: 'MC', DM: 'MC', CM: 'MC', MP: 'MCO', CAM: 'MCO', AM: 'MCO',
        LM: 'MI', RM: 'MD', LW: 'EXT', RW: 'EXT', EI: 'EXT', ED: 'EXT',
        SD: 'DC', ST: 'DC', CF: 'DC', DEL: 'DC'
    };
    const POSITION_WEIGHTS = {
        POR: { EN: .1, VE: .1, RE: .1, AG: .1, CA: .2, EF: .1, MO: .1, AT: .05, DF: .15 },
        DFC: { EN: .2, VE: .1, RE: .15, AG: .1, CA: .15, EF: .1, MO: .1, AT: .05, DF: .15 },
        LI:  { EN: .15, VE: .15, RE: .2, AG: .1, CA: .05, EF: .05, MO: .1, AT: .1, DF: .1 },
        LD:  { EN: .15, VE: .15, RE: .2, AG: .1, CA: .05, EF: .05, MO: .1, AT: .1, DF: .1 },
        MC:  { EN: .1, VE: .1, RE: .2, AG: .1, CA: .1, EF: .1, MO: .1, AT: .1, DF: .1 },
        MCO: { EN: .05, VE: .15, RE: .15, AG: .15, CA: .1, EF: .15, MO: .1, AT: .15, DF: .05 },
        MD:  { EN: .05, VE: .2, RE: .15, AG: .15, CA: .05, EF: .1, MO: .1, AT: .15, DF: .05 },
        MI:  { EN: .05, VE: .2, RE: .15, AG: .15, CA: .05, EF: .1, MO: .1, AT: .15, DF: .05 },
        EXT: { EN: .05, VE: .2, RE: .15, AG: .15, CA: .05, EF: .15, MO: .1, AT: .15, DF: .05 },
        DC:  { EN: .05, VE: .15, RE: .1, AG: .1, CA: .15, EF: .2, MO: .1, AT: .15, DF: 0 }
    };

    // ── Utilidades ──────────────────────────────────────────────
    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function leagueKeys() {
        return window.pcfLeagues ? window.pcfLeagues.keys() : Object.keys(window.TEAMS_DATA || {});
    }
    function leagueName(k) {
        return window.pcfLeagues ? window.pcfLeagues.name(k) : (DIVISIONS[k] || k);
    }
    function leagueTeams(k) {
        return (window.pcfLeagues ? window.pcfLeagues.teams(k) : (window.TEAMS_DATA?.[k] || [])).filter(Boolean);
    }
    function squadSizeCached(team) {
        try { const d = JSON.parse(localStorage.getItem(`team_data_${team}`) || 'null'); return (d && d.squad && d.squad.length) || 0; }
        catch (e) { return 0; }
    }
    function toast(msg) {
        const status = document.getElementById('adminDivisionImportStatus');
        if (status && window.adminBackend && window.adminBackend.currentTab === 'leagues') status.textContent = msg;
        else console.log(msg);
    }
    function downloadJSON(obj, filename) {
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function weightedOverall(p) {
        const w = POSITION_WEIGHTS[p.position];
        if (!w) return calculateOverall(p);
        let sum = 0, tw = 0;
        for (const a in w) { sum += (parseInt(p[a]) || 0) * w[a]; tw += w[a]; }
        return tw ? Math.round(sum / tw) : 0;
    }
    // Deja un jugador con todos los campos que espera el juego
    function normalizePlayer(raw) {
        const p = { ...(raw || {}) };
        p.name = String(p.name || 'Jugador').trim();
        let pos = String(p.position || 'MC').toUpperCase().trim();
        if (!POSITIONS.includes(pos)) pos = POSITION_ALIASES[pos] || 'MC';
        p.position = pos;
        p.age = Math.min(45, Math.max(15, parseInt(p.age) || 25));
        ATTRIBUTES.forEach(a => { p[a] = Math.min(99, Math.max(1, parseInt(p[a]) || 50)); });
        p.foot = p.foot || 'Diestro';
        p.contractType = p.contractType === 'loaned' ? 'loaned' : 'owned';
        p.contractYears = Math.min(10, Math.max(0, parseInt(p.contractYears ?? 3) || 0)) || (p.contractType === 'loaned' ? 1 : 3);
        p.salary = Math.max(0, parseInt(p.salary) || 1000);
        p.releaseClause = Math.max(0, parseInt(p.releaseClause) || 0);
        p.isInjured = !!p.isInjured; p.weeksOut = parseInt(p.weeksOut) || 0;
        p.isSuspended = !!p.isSuspended; p.suspensionWeeks = parseInt(p.suspensionWeeks) || 0;
        p.yellowCards = parseInt(p.yellowCards) || 0; p.redCards = parseInt(p.redCards) || 0;
        p.overall = weightedOverall(p);
        return p;
    }
    // Copia los datos de un equipo a otro nombre y borra el documento antiguo
    async function moveTeamData(oldName, newName) {
        const r = window.getTeamDataFromFirebase ? await window.getTeamDataFromFirebase(oldName) : null;
        const data = r && r.data;
        if (data) {
            const res = await window.saveTeamDataToFirebase(newName, data);
            if (res && res.success === false) throw new Error(res.error || 'no se pudo guardar con el nuevo nombre');
            try {
                const { getFirestore, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                await deleteDoc(doc(getFirestore(), 'teams_data', oldName));
            } catch (e) { console.warn('No se pudo borrar el documento antiguo:', e); }
        }
        localStorage.removeItem(`team_data_${oldName}`);
    }

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
                <div class="modal-content admin-modal-content" style="max-width: 1200px; width: 95vw; max-height: 90vh; overflow-y: auto; overflow-x: hidden;">
                    <span class="modal-close" onclick="document.getElementById('adminModal').classList.remove('active')">&times;</span>
                    <h1>🔧 Panel de Administración</h1>

                    <!-- Tabs -->
                    <div class="admin-tabs">
                        <button id="tabTeamData" class="admin-tab active" onclick="window.adminBackend.switchTab('teamData')">🏟️ Datos del Equipo</button>
                        <button id="tabSquad" class="admin-tab" onclick="window.adminBackend.switchTab('squad')">👥 Plantilla</button>
                        <button id="tabLeagues" class="admin-tab" onclick="window.adminBackend.switchTab('leagues')">🏆 Ligas y Equipos</button>
                        <button id="tabUsers" class="admin-tab" onclick="window.adminBackend.switchTab('users')">🧑‍💼 Usuarios</button>
                    </div>

                    <div id="adminTeamSelector" class="admin-box">
                        <div class="admin-row">
                            <label>División
                                <select id="adminDivisionSelect" onchange="window.adminBackend.loadTeamsFromDivision()">
                                    <option value="">-- Selecciona una división --</option>
                                </select>
                            </label>
                            <label id="adminTeamSelectLabel">Equipo
                                <select id="adminTeamSelect" onchange="window.adminBackend.loadTeamData()">
                                    <option value="">-- Selecciona un equipo --</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <!-- TAB: Datos del Equipo -->
                    <div id="tabContentTeamData" class="tab-content" style="display: block;">
                        <div id="adminTeamDataContainer" style="display: none;">
                            <h2>Datos del Equipo: <span id="adminCurrentTeamName"></span></h2>

                            <div class="admin-box">
                                <h3>🏟️ Estadio</h3>
                                <label>Nombre del estadio:</label>
                                <input id="adminStadiumName" type="text" placeholder="Ej: Santiago Bernabéu">
                                <label>Capacidad:</label>
                                <input id="adminStadiumCapacity" type="number" step="1000" min="1000">
                                <label>Foto del estadio (.png/.jpg - máx 500KB):</label>
                                <input id="adminStadiumImage" type="file" accept="image/png,image/jpeg">
                                <small class="admin-muted">Se guardará como Base64 en Firestore</small>
                                <div id="adminStadiumPreview" style="margin-top: 10px;"></div>
                            </div>

                            <div class="admin-box">
                                <h3>🛡️ Escudo</h3>
                                <label>Escudo del equipo (.png/.jpg - máx 200KB):</label>
                                <input id="adminTeamLogo" type="file" accept="image/png,image/jpeg">
                                <small class="admin-muted">Se le quita el fondo blanco automáticamente y se guarda como Base64 en Firestore</small>
                                <div id="adminLogoPreview" style="margin-top: 10px;"></div>
                            </div>

                            <div class="admin-box">
                                <h3>💰 Presupuesto Inicial</h3>
                                <label>Presupuesto inicial (€):</label>
                                <input id="adminInitialBudget" type="number" step="1000000" min="0">
                                <small class="admin-muted">Será el dinero disponible al empezar una partida con este equipo</small>
                            </div>

                            <button class="btn" onclick="window.adminBackend.saveTeamData()">💾 Guardar Datos del Equipo</button>
                        </div>
                        <p id="adminTeamDataEmpty" class="admin-muted">Selecciona una división y un equipo para editar sus datos.</p>
                    </div>

                    <!-- TAB: Plantilla -->
                    <div id="tabContentSquad" class="tab-content" style="display: none;">
                        <div id="adminSquadContainer" style="display: none;">
                            <h2>Plantilla de: <span id="adminSquadTeamName"></span></h2>

                            <details class="admin-help">
                                <summary>ℹ️ ¿Qué hacen Importar / Exportar JSON de la plantilla?</summary>
                                <p><b>Exportar JSON</b> descarga la plantilla de <b>este equipo</b> como un archivo <code>.json</code> (una lista de jugadores). Sirve para hacer una copia o editarla con calma fuera del juego.</p>
                                <p><b>Importar JSON</b> carga un archivo de ese mismo formato y <b>sustituye la lista</b> que ves en pantalla. No se guarda hasta que pulses <b>💾 Guardar Plantilla</b>.</p>
                                <p>Formato: una lista de jugadores. Campos mínimos: <code>name</code>, <code>position</code> (POR, DFC, LI, LD, MC, MCO, MD, MI, EXT, DC) y <code>age</code>. Opcionales: <code>EN VE RE AG CA EF MO AT DF</code> (1-99), <code>foot</code>, <code>contractType</code> (owned / loaned), <code>contractYears</code>, <code>salary</code> (semanal), <code>releaseClause</code>. Lo que falte se rellena con valores por defecto.</p>
                                <p>Para cargar <b>todos los equipos de una división a la vez</b> usa la pestaña <b>🏆 Ligas y Equipos</b>.</p>
                            </details>

                            <div class="admin-box">
                                <div class="admin-actions">
                                    <button class="btn admin-btn-green" onclick="window.adminBackend.addPlayer()">➕ Añadir Jugador</button>
                                    <button class="btn admin-btn-blue" onclick="window.adminBackend.importSquadJSON()">📥 Importar JSON</button>
                                    <button class="btn admin-btn-orange" onclick="window.adminBackend.exportSquadJSON()">📤 Exportar JSON</button>
                                    <input type="file" id="squadImportFile" accept=".json" style="display: none;" onchange="window.adminBackend.handleSquadImport(event)">
                                </div>
                                <div id="playersListContainer" style="max-height: 500px; overflow-y: auto;"></div>
                            </div>

                            <div class="admin-actions">
                                <button class="btn" onclick="window.adminBackend.saveSquadData()">💾 Guardar Plantilla</button>
                                <button class="btn admin-btn-red" onclick="window.adminBackend.clearSquad()">🗑️ Limpiar Plantilla (volver a aleatorio)</button>
                            </div>
                        </div>
                        <p id="adminSquadEmpty" class="admin-muted">Selecciona una división y un equipo para editar su plantilla.</p>
                    </div>

                    <!-- TAB: Ligas y Equipos -->
                    <div id="tabContentLeagues" class="tab-content" style="display: none;">
                        <details class="admin-help" open>
                            <summary>ℹ️ Cómo funciona esta pestaña</summary>
                            <p>Aquí decides <b>qué equipos juegan en cada división</b> y cómo se llama cada división. Los cambios se guardan en Firebase y los ve todo el mundo al empezar una <b>partida nueva</b> o una <b>temporada nueva</b>; las partidas ya empezadas mantienen su liga actual.</p>
                            <p>Selecciona una división arriba. Para cada equipo puedes: <b>✏️ Renombrar</b> (sus datos, escudo y plantilla pasan al nuevo nombre), <b>Mover</b> a otra división, <b>🗑️ Quitar</b> de la división (sus datos no se borran) o <b>⚙️ Editar</b> sus datos y plantilla.</p>
                            <p>Las divisiones internas (<code>primera</code>, <code>segunda</code>, <code>rfef_grupo1</code>…) son fijas porque el juego las usa para ascensos y descensos; sí puedes cambiar el <b>nombre que se muestra</b>.</p>
                        </details>

                        <div id="adminLeagueEmpty" class="admin-muted">Selecciona una división arriba para ver y editar sus equipos.</div>

                        <div id="adminLeagueBox" class="admin-box" style="display:none;">
                            <h3>Nombre de la división <small class="admin-muted">(clave interna: <code id="adminDivisionKey"></code>)</small></h3>
                            <div class="admin-row">
                                <input id="adminDivisionName" type="text">
                                <button class="btn" onclick="window.adminBackend.renameDivision()">💾 Guardar nombre</button>
                            </div>

                            <h3 style="margin-top:16px;">Equipos (<span id="adminLeagueCount">0</span>)</h3>
                            <div id="adminLeagueWarning" class="admin-warning" style="display:none;"></div>
                            <div id="adminLeagueTeams" class="admin-team-list"></div>

                            <div class="admin-row" style="margin-top:12px;">
                                <input id="adminNewTeamName" type="text" placeholder="Nombre del equipo a añadir"
                                       onkeydown="if(event.key==='Enter') window.adminBackend.addTeamToDivision()">
                                <button class="btn admin-btn-green" onclick="window.adminBackend.addTeamToDivision()">➕ Añadir equipo</button>
                            </div>
                        </div>

                        <div class="admin-box">
                            <h3>📦 Importar una división completa (JSON)</h3>
                            <details class="admin-help">
                                <summary>ℹ️ Qué hace y qué formato tiene</summary>
                                <p>Carga de golpe <b>todos los equipos de una división</b>: qué equipos la forman, sus datos (estadio, aforo, presupuesto) y, si vienen, sus plantillas. Antes de aplicar nada te enseña un resumen y te pide confirmación.</p>
                                <ul>
                                    <li><code>"mode": "replace"</code> → la división queda <b>exactamente</b> con los equipos del archivo. Los que ya no estén se quitan de la división (sus datos no se borran).</li>
                                    <li><code>"mode": "merge"</code> → solo añade o actualiza equipos; no quita ninguno.</li>
                                    <li>Si un equipo del archivo estaba en otra división, <b>se mueve</b> a esta.</li>
                                    <li>Si un equipo trae <code>squad</code>, su plantilla se sustituye. Si no lo trae, se conserva la que tuviera (o se genera aleatoria).</li>
                                    <li>Escudo y foto del estadio se conservan salvo que el archivo traiga <code>logo</code> / <code>stadiumImage</code>.</li>
                                </ul>
                                <pre class="admin-code">{
  "format": "pcfutbol-division",
  "division": "primera",
  "divisionName": "Primera División",
  "mode": "replace",
  "teams": [
    { "name": "FC Barcelona", "stadiumName": "Spotify Camp Nou",
      "stadiumCapacity": 105000, "initialBudget": 60000000,
      "squad": [ { "name": "Pedri", "position": "MC", "age": 23, "EN": 85, "...": "..." } ] }
  ]
}</pre>
                            </details>
                            <div class="admin-actions">
                                <button class="btn admin-btn-blue" onclick="document.getElementById('divisionImportFile').click()">📥 Importar JSON de división</button>
                                <button class="btn admin-btn-orange" onclick="window.adminBackend.exportDivisionJSON()">📤 Exportar división seleccionada</button>
                                <button class="btn" onclick="window.adminBackend.downloadDivisionTemplate()">📄 Descargar ejemplo</button>
                                <button class="btn admin-btn-red" onclick="window.adminBackend.resetLeagues()">↩️ Restaurar ligas originales</button>
                                <input type="file" id="divisionImportFile" accept=".json" style="display:none;" onchange="window.adminBackend.handleDivisionImport(event)">
                            </div>
                            <div id="adminDivisionImportStatus" class="admin-status"></div>
                        </div>
                    </div>

                    <!-- TAB: Usuarios -->
                    <div id="tabContentUsers" class="tab-content" style="display: none;">
                        <h2>🧑‍💼 Gestión de Usuarios</h2>
                        <p class="admin-muted" style="margin-bottom:15px;">Usuarios registrados en la aplicación.</p>

                        <div style="margin-bottom:15px;">
                            <button class="btn admin-btn-blue" onclick="window.adminBackend.loadUsers()">🔄 Recargar lista</button>
                            <button class="btn" style="background:#7b2fbe;" onclick="window.adminBackend.migrateUsers()">🔀 Migrar usuarios existentes</button>
                            <p class="admin-muted" style="font-size:.8em;margin-top:6px;">
                                "Migrar" busca en las partidas guardadas y crea los perfiles de usuarios que se registraron antes de este sistema.
                            </p>
                        </div>

                        <div style="overflow-x:auto;">
                            <table id="adminUsersTable" style="width:100%;border-collapse:collapse;font-size:.88em;">
                                <thead>
                                    <tr>
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

                    <div class="admin-box" style="margin-top: 24px;">
                        <h3>📦 Importar / Exportar Todo y Mercado</h3>
                        <div class="admin-actions">
                            <button class="btn admin-btn-orange" onclick="window.adminBackend.exportAllData()">📦 Exportar Todos los Datos</button>
                            <button class="btn admin-btn-green" onclick="document.getElementById('adminImportFile').click()">📥 Importar Datos</button>
                            <input type="file" id="adminImportFile" accept=".json" style="display: none;" onchange="window.adminBackend.importAllData(event)">
                        </div>
                        <details class="admin-help">
                            <summary>ℹ️ ¿Qué hace cada botón?</summary>
                            <p><b>📦 Exportar Todos los Datos</b> descarga un único archivo <code>pcfutbol_data_FECHA.json</code> con <b>todo lo que hay en la base de datos</b>: cada equipo (estadio, aforo, presupuesto, escudo, foto del estadio y plantilla) y la estructura de ligas. Es tu <b>copia de seguridad</b> completa.</p>
                            <p><b>📥 Importar Datos</b> lee un archivo generado con el botón anterior y <b>sobrescribe</b> en la base de datos cada equipo que aparezca en él (los que no aparezcan no se tocan). Si el archivo incluye la estructura de ligas, también la restaura. No sirve para el JSON de plantilla de un equipo ni para el de una división: cada uno tiene su botón.</p>
                            <p><b>🔄 Sync Mercado Fichajes</b> recorre todos los equipos que tienen <b>plantilla real guardada</b> y pone <b>2 jugadores al azar de cada uno</b> en el mercado de fichajes compartido, sustituyendo los que ese equipo tuviera antes. Úsalo después de importar o cambiar plantillas para que el mercado muestre los jugadores nuevos. (También se hace solo al guardar la plantilla de un equipo y al cargar el juego.)</p>
                        </details>
                    </div>

                    <div class="admin-box" style="margin-top: 24px;">
                        <h3>💾 Almacenamiento y optimización</h3>
                        <p class="admin-muted">Los escudos y las fotos de estadio se guardan como texto dentro de la base de datos y el navegador copia cada equipo en su memoria local (límite ≈ 5 MB). Si pesan mucho, esa copia falla y los guardados dan error de «cuota excedida».</p>
                        <div class="admin-actions">
                            <button class="btn" onclick="window.pcfStorageTools.showReport()">📊 Ver uso</button>
                            <button class="btn admin-btn-orange" onclick="window.pcfStorageTools.purgeBrowser()">🧹 Vaciar caché del navegador</button>
                            <button class="btn admin-btn-green" onclick="window.pcfStorageTools.optimizeAll()">🗜️ Optimizar escudos y fotos</button>
                        </div>
                        <div id="pcfStorageOut" style="margin-top:10px;font-size:.88rem;line-height:1.5"></div>
                    </div>

                    <button class="btn admin-btn-red" style="margin-top: 20px;" onclick="document.getElementById('adminModal').classList.remove('active')">Cerrar</button>
                </div>

                <style>
                    #adminModal h1 { margin-bottom: 14px; }
                    #adminModal label { display: block; margin: 8px 0 4px; }
                    #adminModal .admin-row label { margin: 0; flex: 1; min-width: 200px; }
                    #adminModal .admin-row label select { display: block; width: 100%; min-width: 260px; margin-top: 4px; }
                    #adminModal .admin-row > input[type="text"] { flex: 1 1 320px; min-width: 220px; width: auto; }
                    .admin-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
                    .admin-tab { flex: 1; min-width: 140px; padding: 10px 12px; cursor: pointer; }
                    .admin-tab.active { filter: brightness(1.25); outline: 2px solid var(--pcf-gold, #ffd24a); }
                    .admin-box { background: rgba(255,255,255,.05); border: 1px solid rgba(122,160,212,.35); border-radius: 4px; padding: 14px; margin-bottom: 16px; }
                    .admin-box h3 { margin-top: 0; }
                    .admin-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
                    .admin-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
                    .admin-muted { color: #9fb3d1; }
                    .admin-help { background: rgba(255,210,74,.08); border: 1px solid rgba(255,210,74,.35); border-radius: 4px; padding: 8px 12px; margin: 8px 0 14px; }
                    .admin-help summary { cursor: pointer; font-weight: 700; color: var(--pcf-gold, #ffd24a); }
                    .admin-help p, .admin-help li { margin: 8px 0; line-height: 1.45; color: #dbe6f6; }
                    .admin-help ul { padding-left: 20px; }
                    .admin-help code, .admin-box code { background: rgba(0,0,0,.35); padding: 1px 5px; border-radius: 3px; }
                    .admin-code { background: rgba(0,0,0,.45); padding: 10px; border-radius: 4px; overflow-x: auto; font-size: .8em; color: #cfe0ff; white-space: pre; }
                    .admin-warning { background: rgba(255,160,0,.15); border: 1px solid rgba(255,160,0,.5); padding: 8px 10px; border-radius: 4px; margin-bottom: 10px; color: #ffd9a0; }
                    .admin-status { white-space: pre-line; font-size: .9em; color: #cfe0ff; }
                    .admin-team-list { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow-y: auto; }
                    .admin-team-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 8px; background: rgba(0,0,0,.25); border: 1px solid rgba(122,160,212,.25); border-radius: 3px; }
                    .admin-team-row .team-name { flex: 1 1 220px; font-weight: 700; }
                    .admin-team-row .team-badge { font-size: .75em; padding: 2px 6px; border-radius: 10px; background: rgba(255,255,255,.1); color: #bcd; }
                    .admin-team-row .team-badge.real { background: rgba(80,200,120,.2); color: #9ef0b8; }
                    .admin-team-row select { min-height: 28px; padding: 2px 6px; font-size: .8em; }
                    .admin-btn-green { background: linear-gradient(180deg,#b6d79b 0%,#6f9a4e 46%,#4b7434 54%,#26451c 100%) !important; }
                    .admin-btn-blue  { background: linear-gradient(180deg,#9cbce6 0%,#4f77b0 46%,#2f5384 54%,#14315c 100%) !important; }
                    .admin-btn-orange{ background: linear-gradient(180deg,#ffd59a 0%,#f0a33a 46%,#cf7a0e 54%,#7d4500 100%) !important; }
                    .admin-btn-red   { background: linear-gradient(180deg,#e0a3a3 0%,#a85252 46%,#7c2323 54%,#3f0e0e 100%) !important; }
                    .player-card { background: rgba(255,255,255,.05); padding: 15px; margin-bottom: 10px; border-radius: 5px; border: 1px solid rgba(122,160,212,.3); }
                    .player-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .player-inputs { display: grid; grid-template-columns: minmax(140px, 1fr) 80px 70px; gap: 5px; margin-bottom: 10px; }
                    .player-attributes { display: grid; grid-template-columns: repeat(9, minmax(44px, 1fr)); gap: 5px; }
                    .attr-input { width: 100%; min-width: 20px; padding: 5px; text-align: center; }
                </style>
            `;
            document.body.appendChild(modal);
        }

        window.adminBackend.populateDivisionSelect();
        document.getElementById('adminModal').classList.add('active');
    };

    window.adminBackend = {
        currentTeam: null,
        currentDivision: null,
        currentTab: 'teamData',
        squadPlayers: [],

        switchTab: function(tab) {
            document.querySelectorAll('#adminModal .tab-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('#adminModal .admin-tab').forEach(el => el.classList.remove('active'));
            const cap = tab.charAt(0).toUpperCase() + tab.slice(1);
            const content = document.getElementById('tabContent' + cap);
            if (content) content.style.display = 'block';
            const tabBtn = document.getElementById('tab' + cap);
            if (tabBtn) tabBtn.classList.add('active');
            this.currentTab = tab;
            // El selector de división/equipo no aplica a Usuarios; en Ligas solo hace falta la división
            const selector = document.getElementById('adminTeamSelector');
            if (selector) selector.style.display = tab === 'users' ? 'none' : 'block';
            const teamLbl = document.getElementById('adminTeamSelectLabel');
            if (teamLbl) teamLbl.style.display = tab === 'leagues' ? 'none' : '';
            if (tab === 'users') window.adminBackend.loadUsers();
            if (tab === 'leagues') this.renderLeagueEditor();
        },

        // ── Selectores ───────────────────────────────────────────
        populateDivisionSelect: function() {
            const sel = document.getElementById('adminDivisionSelect');
            if (!sel) return;
            const prev = sel.value || this.currentDivision || '';
            sel.innerHTML = '<option value="">-- Selecciona una división --</option>' +
                leagueKeys().map(k => `<option value="${esc(k)}">${esc(leagueName(k))} (${leagueTeams(k).length})</option>`).join('');
            if (prev && leagueKeys().includes(prev)) sel.value = prev;
        },

        loadTeamsFromDivision: function() {
            const divisionKey = document.getElementById('adminDivisionSelect').value;
            const teamSelect = document.getElementById('adminTeamSelect');
            this.currentDivision = divisionKey || null;
            this.currentTeam = null;

            const teams = divisionKey ? leagueTeams(divisionKey) : [];
            teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>' +
                teams.map(team => `<option value="${esc(team)}">${esc(team)}</option>`).join('');

            this.showTeamPanels(false);
            this.renderLeagueEditor();
        },

        showTeamPanels: function(show) {
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v; };
            set('adminTeamDataContainer', show ? 'block' : 'none');
            set('adminSquadContainer', show ? 'block' : 'none');
            set('adminTeamDataEmpty', show ? 'none' : 'block');
            set('adminSquadEmpty', show ? 'none' : 'block');
        },

        loadTeamData: async function() {
            const teamName = document.getElementById('adminTeamSelect').value;
            if (!teamName) { this.currentTeam = null; this.showTeamPanels(false); return; }

            this.currentTeam = teamName;
            document.getElementById('adminCurrentTeamName').textContent = teamName;
            document.getElementById('adminSquadTeamName').textContent = teamName;
            this.showTeamPanels(true);

            const teamData = await window.getTeamData(teamName);

            document.getElementById('adminStadiumName').value = teamData.stadiumName || '';
            document.getElementById('adminStadiumCapacity').value = teamData.stadiumCapacity || 10000;
            document.getElementById('adminInitialBudget').value = teamData.initialBudget || 5000000;
            document.getElementById('adminTeamLogo').value = '';
            document.getElementById('adminStadiumImage').value = '';

            document.getElementById('adminLogoPreview').innerHTML = teamData.logo
                ? `<img src="${teamData.logo}" style="max-width: 100px; max-height: 100px;">`
                : '<p class="admin-muted">No hay escudo cargado</p>';
            document.getElementById('adminStadiumPreview').innerHTML = teamData.stadiumImage
                ? `<img src="${teamData.stadiumImage}" style="max-width: 200px; max-height: 150px; border-radius: 4px;">`
                : '<p class="admin-muted">No hay foto del estadio</p>';

            this.squadPlayers = (teamData.squad || []).map(normalizePlayer);
            this.renderSquadList();
        },

        // Abre un equipo concreto en la pestaña indicada
        openTeam: async function(teamName, tab) {
            const div = window.pcfLeagues ? window.pcfLeagues.findDivision(teamName) : this.currentDivision;
            if (div) {
                document.getElementById('adminDivisionSelect').value = div;
                this.loadTeamsFromDivision();
            }
            document.getElementById('adminTeamSelect').value = teamName;
            this.switchTab(tab || 'teamData');
            await this.loadTeamData();
        },

        // ── Ligas y equipos ──────────────────────────────────────
        renderLeagueEditor: function() {
            const box = document.getElementById('adminLeagueBox');
            const empty = document.getElementById('adminLeagueEmpty');
            if (!box) return;
            const key = this.currentDivision;
            if (!key) { box.style.display = 'none'; empty.style.display = 'block'; return; }
            box.style.display = 'block'; empty.style.display = 'none';

            document.getElementById('adminDivisionKey').textContent = key;
            document.getElementById('adminDivisionName').value = leagueName(key);

            const teams = leagueTeams(key);
            document.getElementById('adminLeagueCount').textContent = teams.length;
            const warn = document.getElementById('adminLeagueWarning');
            const msgs = [];
            if (teams.length < 2) msgs.push('Una liga necesita al menos 2 equipos.');
            if (teams.length % 2 !== 0) msgs.push('Hay un número impar de equipos: cada jornada descansará uno.');
            warn.style.display = msgs.length ? 'block' : 'none';
            warn.textContent = '⚠️ ' + msgs.join(' ');

            const others = leagueKeys().filter(k => k !== key);
            document.getElementById('adminLeagueTeams').innerHTML = teams.map((t, i) => {
                const n = squadSizeCached(t);
                const badge = n > 0
                    ? `<span class="team-badge real">plantilla real · ${n}</span>`
                    : `<span class="team-badge">plantilla aleatoria</span>`;
                return `
                <div class="admin-team-row">
                    <span class="team-name">${i + 1}. ${esc(t)}</span>${badge}
                    <button class="btn btn-sm" title="Editar datos y plantilla" onclick="window.adminBackend.openTeam(decodeURIComponent('${encodeURIComponent(t)}'), 'teamData')">⚙️ Editar</button>
                    <button class="btn btn-sm" onclick="window.adminBackend.renameTeam(decodeURIComponent('${encodeURIComponent(t)}'))">✏️ Renombrar</button>
                    <select title="Mover a otra división" onchange="window.adminBackend.moveTeam(decodeURIComponent('${encodeURIComponent(t)}'), this.value); this.value='';">
                        <option value="">Mover a…</option>
                        ${others.map(k => `<option value="${esc(k)}">${esc(leagueName(k))}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm admin-btn-red" onclick="window.adminBackend.removeTeamFromDivision(decodeURIComponent('${encodeURIComponent(t)}'))">🗑️ Quitar</button>
                </div>`;
            }).join('') || '<p class="admin-muted">Esta división no tiene equipos.</p>';
        },

        afterLeaguesChange: function() {
            this.populateDivisionSelect();
            const keepTeam = this.currentTeam;
            const sel = document.getElementById('adminTeamSelect');
            if (this.currentDivision) {
                const teams = leagueTeams(this.currentDivision);
                sel.innerHTML = '<option value="">-- Selecciona un equipo --</option>' +
                    teams.map(team => `<option value="${esc(team)}">${esc(team)}</option>`).join('');
                if (keepTeam && teams.includes(keepTeam)) sel.value = keepTeam;
                else { this.currentTeam = null; this.showTeamPanels(false); }
            }
            this.renderLeagueEditor();
        },

        saveLeagues: async function(cfg, okMsg) {
            const r = await window.pcfLeagues.save(cfg);
            this.afterLeaguesChange();
            if (!r.success) alert('⚠️ Cambios aplicados en este navegador, pero no se pudieron guardar en Firebase: ' + r.error);
            else if (okMsg) toast(okMsg);
            return r;
        },

        renameDivision: async function() {
            const key = this.currentDivision; if (!key) return;
            const name = document.getElementById('adminDivisionName').value.trim();
            if (!name) return alert('El nombre no puede estar vacío');
            const cfg = window.pcfLeagues.get();
            cfg.divisions[key].name = name;
            await this.saveLeagues(cfg, `✅ División renombrada a "${name}"`);
        },

        addTeamToDivision: async function() {
            const key = this.currentDivision; if (!key) return alert('Selecciona una división');
            const input = document.getElementById('adminNewTeamName');
            const name = input.value.trim();
            if (!name) return;
            const cfg = window.pcfLeagues.get();
            const from = Object.keys(cfg.divisions).find(k => cfg.divisions[k].teams.includes(name));
            if (from === key) return alert('Ese equipo ya está en esta división');
            if (from && !await window.pcfConfirmText(`"${name}" está ahora en ${cfg.divisions[from].name}. ¿Moverlo a ${cfg.divisions[key].name}?`)) return;
            if (from) cfg.divisions[from].teams = cfg.divisions[from].teams.filter(t => t !== name);
            cfg.divisions[key].teams.push(name);
            input.value = '';
            await this.saveLeagues(cfg, `✅ ${name} añadido a ${cfg.divisions[key].name}`);
        },

        removeTeamFromDivision: async function(team) {
            const key = this.currentDivision; if (!key) return;
            if (!await window.pcfConfirmText(`¿Quitar "${team}" de ${leagueName(key)}?\n\nSus datos (escudo, estadio, plantilla) NO se borran: podrás volver a añadirlo cuando quieras.`)) return;
            const cfg = window.pcfLeagues.get();
            cfg.divisions[key].teams = cfg.divisions[key].teams.filter(t => t !== team);
            await this.saveLeagues(cfg, `✅ ${team} quitado de ${cfg.divisions[key].name}`);
        },

        moveTeam: async function(team, toKey) {
            if (!toKey) return;
            const cfg = window.pcfLeagues.get();
            Object.values(cfg.divisions).forEach(d => { d.teams = d.teams.filter(t => t !== team); });
            cfg.divisions[toKey].teams.push(team);
            await this.saveLeagues(cfg, `✅ ${team} movido a ${cfg.divisions[toKey].name}`);
        },

        renameTeam: async function(oldName) {
            const newName = (await window.pcfPrompt(`Nuevo nombre para "${oldName}":`, oldName) || '').trim();
            if (!newName || newName === oldName) return;
            if (window.pcfLeagues.allTeams().includes(newName)) return alert(`Ya existe un equipo llamado "${newName}"`);
            if (!await window.pcfConfirmText(`Renombrar "${oldName}" → "${newName}".\n\nSus datos (escudo, estadio, plantilla) pasarán al nuevo nombre. Las partidas guardadas que ya usen "${oldName}" lo seguirán mostrando con el nombre antiguo.`)) return;
            try {
                await moveTeamData(oldName, newName);
                const cfg = window.pcfLeagues.get();
                Object.values(cfg.divisions).forEach(d => { d.teams = d.teams.map(t => t === oldName ? newName : t); });
                if (this.currentTeam === oldName) this.currentTeam = newName;
                await this.saveLeagues(cfg, `✅ Equipo renombrado a "${newName}"`);
            } catch (e) {
                alert('❌ Error al renombrar: ' + e.message);
            }
        },

        resetLeagues: async function() {
            if (!await window.pcfConfirmText('¿Restaurar las ligas originales del juego (las de config.js)?\n\nSe deshacen todos los cambios de equipos por división y nombres de división. Los datos y plantillas de los equipos NO se borran.')) return;
            await this.saveLeagues(window.pcfLeagues.getDefaults(), '✅ Ligas restauradas');
        },

        // ── Importar / exportar división ─────────────────────────
        downloadDivisionTemplate: function() {
            const sample = {
                format: 'pcfutbol-division', version: 1,
                division: this.currentDivision || 'primera',
                divisionName: leagueName(this.currentDivision || 'primera'),
                season: '2026/27', mode: 'replace',
                teams: [{
                    name: 'Equipo de ejemplo CF', stadiumName: 'Estadio Municipal',
                    stadiumCapacity: 20000, initialBudget: 10000000,
                    squad: [{ name: 'Jugador Ejemplo', position: 'DC', age: 25, foot: 'Diestro',
                        EN: 70, VE: 75, RE: 72, AG: 74, CA: 73, EF: 76, MO: 70, AT: 75, DF: 40,
                        contractType: 'owned', contractYears: 3, salary: 20000, releaseClause: 10000000 }]
                }]
            };
            downloadJSON(sample, 'ejemplo_division.json');
        },

        exportDivisionJSON: async function() {
            const key = this.currentDivision;
            if (!key) return alert('Selecciona primero una división');
            const withImages = await window.pcfConfirmText('¿Incluir escudos y fotos de estadio?\n\nAceptar = sí (archivo mucho más grande)\nCancelar = no (más fácil de editar)');
            const status = document.getElementById('adminDivisionImportStatus');
            status.textContent = '⏳ Preparando exportación…';
            const teams = [];
            for (const name of leagueTeams(key)) {
                const r = window.getTeamDataFromFirebase ? await window.getTeamDataFromFirebase(name) : null;
                const d = (r && r.data) || {};
                const t = { name, stadiumName: d.stadiumName, stadiumCapacity: d.stadiumCapacity, initialBudget: d.initialBudget };
                if (d.squad && d.squad.length) t.squad = d.squad;
                if (withImages) { if (d.logo) t.logo = d.logo; if (d.stadiumImage) t.stadiumImage = d.stadiumImage; }
                teams.push(t);
            }
            downloadJSON({ format: 'pcfutbol-division', version: 1, division: key, divisionName: leagueName(key),
                exportedAt: new Date().toISOString(), mode: 'replace', teams }, `division_${key}.json`);
            status.textContent = `✅ Exportados ${teams.length} equipos de ${leagueName(key)}`;
        },

        handleDivisionImport: function(event) {
            const file = event.target.files[0];
            event.target.value = '';
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                let data;
                try { data = JSON.parse(e.target.result); }
                catch (err) { return alert('❌ El archivo no es un JSON válido: ' + err.message); }
                this.importDivision(data);
            };
            reader.readAsText(file);
        },

        importDivision: async function(data) {
            const status = document.getElementById('adminDivisionImportStatus');
            if (Array.isArray(data)) data = { teams: data };
            if (!data || !Array.isArray(data.teams)) {
                return alert('❌ Formato no reconocido. El archivo debe tener una lista "teams" (descarga el ejemplo para ver el formato).');
            }
            const key = data.division || this.currentDivision;
            if (!key) return alert('❌ El archivo no indica "division" y no hay ninguna división seleccionada.');
            if (!leagueKeys().includes(key)) {
                return alert(`❌ La división "${key}" no existe. Válidas: ${leagueKeys().join(', ')}`);
            }
            const mode = data.mode === 'merge' ? 'merge' : 'replace';
            const teams = data.teams.filter(t => t && String(t.name || '').trim());
            const names = [...new Set(teams.map(t => String(t.name).trim()))];
            if (!names.length) return alert('❌ El archivo no contiene equipos con nombre.');

            const cfg = window.pcfLeagues.get();
            const divName = data.divisionName || cfg.divisions[key].name;
            const currentTeams = cfg.divisions[key].teams;
            const moved = [];
            names.forEach(n => {
                const from = Object.keys(cfg.divisions).find(k => k !== key && cfg.divisions[k].teams.includes(n));
                if (from) moved.push(`${n} (desde ${cfg.divisions[from].name})`);
            });
            const added = names.filter(n => !currentTeams.includes(n) && !moved.some(m => m.startsWith(n + ' (')));
            const removed = mode === 'replace' ? currentTeams.filter(t => !names.includes(t)) : [];
            const withSquad = teams.filter(t => Array.isArray(t.squad) && t.squad.length);
            const totalPlayers = withSquad.reduce((s, t) => s + t.squad.length, 0);

            const summary =
                `División: ${divName} (${key})\nModo: ${mode === 'replace' ? 'REEMPLAZAR equipos de la división' : 'AÑADIR / ACTUALIZAR'}\n` +
                `Equipos en el archivo: ${names.length}\n` +
                `Con plantilla: ${withSquad.length} equipos · ${totalPlayers} jugadores\n` +
                (added.length ? `\n➕ Nuevos en la división (${added.length}): ${added.join(', ')}` : '') +
                (moved.length ? `\n↕ Se mueven aquí (${moved.length}): ${moved.join(', ')}` : '') +
                (removed.length ? `\n➖ Salen de la división (${removed.length}): ${removed.join(', ')}\n   (sus datos no se borran; quedan sin división hasta que los añadas a otra)` : '');
            if (!await window.pcfConfirmText(summary + '\n\n¿Aplicar la importación?')) return;

            status.textContent = '⏳ Importando…';
            let ok = 0; const errors = [];
            for (let i = 0; i < teams.length; i++) {
                const t = teams[i];
                const name = String(t.name).trim();
                status.textContent = `⏳ Guardando ${i + 1}/${teams.length}: ${name}`;
                try {
                    const r = window.getTeamDataFromFirebase ? await window.getTeamDataFromFirebase(name) : null;
                    const existing = (r && r.data) || {};
                    const merged = { ...existing };
                    if (t.stadiumName) merged.stadiumName = String(t.stadiumName);
                    if (t.stadiumCapacity) merged.stadiumCapacity = parseInt(t.stadiumCapacity) || merged.stadiumCapacity || 10000;
                    if (t.initialBudget != null) merged.initialBudget = parseInt(t.initialBudget) || 0;
                    if (t.logo) merged.logo = window.cleanCrestDataURL ? await window.cleanCrestDataURL(t.logo) : t.logo;
                    if (t.stadiumImage) merged.stadiumImage = t.stadiumImage;
                    if (Array.isArray(t.squad)) merged.squad = t.squad.map(normalizePlayer);
                    ['logo', 'stadiumImage'].forEach(k => { if (merged[k] === undefined) merged[k] = null; });
                    if (!merged.stadiumName) merged.stadiumName = 'Estadio Municipal';
                    if (!merged.stadiumCapacity) merged.stadiumCapacity = 10000;
                    if (merged.initialBudget == null) merged.initialBudget = 5000000;
                    if (!merged.squad) merged.squad = [];
                    const res = await window.saveTeamDataToFirebase(name, merged);
                    if (res && res.success === false) throw new Error(res.error || 'error al guardar');
                    ok++;
                } catch (err) {
                    errors.push(`${name}: ${err.message}`);
                }
            }

            // Estructura de ligas
            Object.keys(cfg.divisions).forEach(k => {
                if (k !== key) cfg.divisions[k].teams = cfg.divisions[k].teams.filter(t => !names.includes(t));
            });
            cfg.divisions[key].teams = mode === 'replace' ? names : [...new Set([...currentTeams, ...names])];
            cfg.divisions[key].name = divName;
            this.currentDivision = key;
            document.getElementById('adminDivisionSelect').value = key;
            const lr = await this.saveLeagues(cfg);

            status.textContent =
                `✅ Importación terminada: ${ok}/${teams.length} equipos guardados en ${divName}.` +
                (withSquad.length ? `\n👥 ${totalPlayers} jugadores cargados. Pulsa "🔄 Sync Mercado Fichajes" para llevarlos al mercado.` : '') +
                (lr && lr.success ? '' : '\n⚠️ La estructura de ligas solo se guardó en este navegador.') +
                (errors.length ? `\n❌ Errores:\n${errors.join('\n')}` : '');
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
                        <strong style="color: #e94560;">#${index + 1} · ${esc(player.name || '')} · ${player.position} · OVR ${player.overall || weightedOverall(player)}</strong>
                        <button class="btn" style="background: #c73446; padding: 2px 6px;" onclick="window.adminBackend.removePlayer(${index})">🗑️</button>
                    </div>
                    
                    <!-- Datos básicos -->
                    <div class="player-inputs">
                        <input type="text" placeholder="Nombre" value="${esc(player.name || '')}" onchange="window.adminBackend.updatePlayer(${index}, 'name', this.value)">
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

        removePlayer: async function(index) {
            if (await window.pcfConfirmText('¿Eliminar este jugador?')) {
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
            this.squadPlayers[index].overall = weightedOverall(this.squadPlayers[index]);
            this.renderSquadList();
        },

        clearSquad: async function() {
            if (await window.pcfConfirmText('¿Eliminar toda la plantilla? El equipo generará jugadores aleatorios.')) {
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
                    let imported = JSON.parse(e.target.result);
                    // Se acepta una lista de jugadores o un objeto con "squad"
                    if (!Array.isArray(imported) && imported && Array.isArray(imported.squad)) imported = imported.squad;
                    if (!Array.isArray(imported)) {
                        alert('❌ El archivo debe contener una lista de jugadores. Para importar una división completa usa la pestaña 🏆 Ligas y Equipos.');
                        return;
                    }
                    
                    this.squadPlayers = imported.map(normalizePlayer);
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
                    if (logoFile.size > 3 * 1024 * 1024) {
                        alert('⚠️ El escudo es demasiado grande. Máximo 3 MB (se reducirá solo).');
                        return;
                    }
                    teamData.logo = await fileToBase64(logoFile);
                    // Quitar fondo blanco y recortar el escudo antes de guardarlo
                    if (window.cleanCrestDataURL) {
                        teamData.logo = await window.cleanCrestDataURL(teamData.logo);
                    }
                    // Reducir a 160 px: pesa unos pocos KB en lugar de cientos
                    if (window.pcfStorageTools) teamData.logo = await window.pcfStorageTools.compress(teamData.logo, { max: 160, type: 'image/webp', q: 0.85 });
                }

                if (stadiumFile) {
                    if (stadiumFile.size > 6 * 1024 * 1024) {
                        alert('⚠️ La imagen del estadio es demasiado grande. Máximo 6 MB (se reducirá sola).');
                        return;
                    }
                    teamData.stadiumImage = await fileToBase64(stadiumFile);
                    // Reducir a 800 px en JPEG: unas decenas de KB
                    if (window.pcfStorageTools) teamData.stadiumImage = await window.pcfStorageTools.compress(teamData.stadiumImage, { max: 800, type: 'image/jpeg', q: 0.78, flatten: true });
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
                    const leaguesDoc = window.pcfLeagues && data[window.pcfLeagues.DOC_ID];
                    if (leaguesDoc) await this.saveLeagues(leaguesDoc);
                    const nTeams = Object.keys(data).filter(k => !(window.pcfLeagues && window.pcfLeagues.isLeaguesDoc(k))).length;
                    alert(`✅ Importados ${nTeams} equipos` + (leaguesDoc ? ' y la estructura de ligas' : ''));
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
            if (!await window.pcfConfirmText(`¿Enviar email de recuperación de contraseña a ${email}?`)) return;
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
            if (!await window.pcfConfirmText(`¿Eliminar usuario ${email}?\n\nSe borrarán:\n• Su perfil de game_users\n• Todas sus partidas guardadas\n• Sus datos de usuario\n\nEsta acción NO se puede deshacer.`)) return;
            try {
                const { getFirestore, doc, deleteDoc, collection, getDocs } =
                    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const firestore = getFirestore();

                // 1. Borrar partidas guardadas
                try {
                    const savedGamesSnap = await getDocs(collection(firestore, 'users', uid, 'saved_games'));
                    const deleteGames = savedGamesSnap.docs.map(d => deleteDoc(d.ref));
                    await Promise.all(deleteGames);
                    console.log(`🗑 ${savedGamesSnap.size} partidas borradas para ${email}`);
                } catch(e) {
                    console.warn('No se pudieron borrar partidas:', e);
                }

                // 2. Borrar carreras promanager
                try {
                    const proSnap = await getDocs(collection(firestore, 'users', uid, 'promanager_career'));
                    const deletePro = proSnap.docs.map(d => deleteDoc(d.ref));
                    await Promise.all(deletePro);
                } catch(e) {}

                // 3. Borrar documento raíz del usuario en 'users'
                try {
                    await deleteDoc(doc(firestore, 'users', uid));
                } catch(e) {}

                // 4. Borrar perfil en game_users
                await deleteDoc(doc(firestore, 'game_users', uid));

                alert(`✅ Usuario ${email} eliminado completamente.\n\nNota: la cuenta de Firebase Auth sigue activa (requiere Admin SDK para eliminarla desde servidor). El usuario no podrá acceder al juego pero técnicamente podría registrarse de nuevo con el mismo email.`);
                this.loadUsers();
            } catch (err) {
                alert('❌ Error: ' + err.message);
            }
        },

        // Migrar usuarios existentes desde la colección 'users' (partidas guardadas)
        migrateUsers: async function() {
            if (!await window.pcfConfirmText('Esto buscará todos los usuarios con partidas guardadas y creará su perfil en game_users si no existe. ¿Continuar?')) return;

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
                            adminBtn.innerHTML = '<img class="pcf-ui-icon" src="assets/iconos/ui/boton-admin.webp" alt="" aria-hidden="true">Admin';
                            adminBtn.onclick = () => window.openAdminPanel();
                            // Estilo en pcf6-theme.css (#adminButton)
                            const logoutBtn = document.getElementById('logoutButton');
                            if (logoutBtn) headerInfo.insertBefore(adminBtn, logoutBtn);
                            else headerInfo.appendChild(adminBtn);
                            console.log('✅ Botón de administrador añadido');
                        }
                    }
                }, 1000);
            });
        }
    });
})();
