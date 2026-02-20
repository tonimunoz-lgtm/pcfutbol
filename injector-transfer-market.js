// injector-transfer-market.js
// Mercado de fichajes con jugadores reales de Firestore.
// NO modifica ningun otro archivo. Se engancha desde fuera.

(function() {

    // =====================================================
    // ESTADO LOCAL
    // =====================================================
    let firestoreMarketPlayers = []; // Jugadores reales cargados de Firestore

    // =====================================================
    // ESPERAR A QUE EL JUEGO ESTE LISTO
    // =====================================================
    function waitForGame() {
        return new Promise(resolve => {
            const t = setInterval(() => {
                if (window.gameLogic && window.ui) {
                    clearInterval(t);
                    resolve();
                }
            }, 200);
            setTimeout(() => { clearInterval(t); resolve(); }, 15000);
        });
    }

    // =====================================================
    // CARGAR MERCADO DESDE FIRESTORE
    // =====================================================
    async function loadMarketFromFirestore() {
        if (!window.getTransferMarket) return;

        try {
            const state = window.gameLogic.getGameState();
            const myNames = new Set((state.squad || []).map(p => p.name.toLowerCase()));

            const players = await window.getTransferMarket([...myNames]);

            firestoreMarketPlayers = players
                .filter(p => !myNames.has((p.name || '').toLowerCase()))
                .map(p => {
                    const c = { ...p };
                    if (!c.value)        c.value        = Math.floor((c.overall || 70) * 2000);
                    if (!c.salary)       c.salary       = Math.floor((c.overall || 70) * 100);
                    if (!c.askingPrice)  c.askingPrice  = Math.floor(c.value * (1 + Math.random() * 0.5));
                    if (!c.releaseClause) c.releaseClause = Math.floor(c.value * 3);
                    if (!c.potential)    c.potential    = Math.min(99, (c.overall || 70) + Math.floor(Math.random() * 10));
                    if (!c.foot)         c.foot         = Math.random() > 0.2 ? 'Diestro' : 'Zurdo';
                    if (!c.contractType) c.contractType = 'owned';
                    if (!c.contractYears) c.contractYears = 2 + Math.floor(Math.random() * 3);
                    c.transferListed = true;
                    return c;
                });

            console.log('Mercado cargado: ' + firestoreMarketPlayers.length + ' jugadores de Firestore');
        } catch(e) {
            console.warn('Error cargando mercado Firestore:', e);
            firestoreMarketPlayers = [];
        }
    }

    // =====================================================
    // INTERCEPCION: searchPlayersMarket
    // Reemplazamos la funcion de index.html para mezclar
    // jugadores de Firestore + jugadores del usuario en venta
    // =====================================================
    function patchSearchPlayersMarket() {
        const originalSearch = window.searchPlayersMarket;

        window.searchPlayersMarket = function() {
            const state = window.gameLogic.getGameState();
            const myNames = new Set((state.squad || []).map(p => p.name.toLowerCase()));

            // Filtros del formulario
            const filters = {
                searchName:     document.getElementById('marketSearchName')?.value || '',
                position:       document.getElementById('marketPosition')?.value || 'ALL',
                minOverall:     parseInt(document.getElementById('marketMinOverall')?.value) || 0,
                maxAge:         parseInt(document.getElementById('marketMaxAge')?.value) || 100,
                transferListed: document.getElementById('marketTransferListed')?.checked || false,
                loanListed:     document.getElementById('marketLoanListed')?.checked || false,
            };

            // 1. Jugadores del usuario en venta/cesion
            const myListed = (state.squad || []).filter(p => p.transferListed || p.loanListed);

            // 2. Jugadores reales de Firestore (ya sin los mios)
            const firestoreFiltered = firestoreMarketPlayers.filter(p =>
                !myNames.has((p.name || '').toLowerCase())
            );

            // 3. Jugadores generados del mercado original (sin duplicados)
            const firestoreNames = new Set(firestoreMarketPlayers.map(p => p.name.toLowerCase()));
            const myListedNames  = new Set(myListed.map(p => p.name.toLowerCase()));
            const scoutLevel = state.staff?.scout?.level || 0;
            const originalPlayers = window.gameLogic.getPlayerMarket({}) // sin filtros aqui
                .filter(p =>
                    !firestoreNames.has(p.name.toLowerCase()) &&
                    !myListedNames.has(p.name.toLowerCase()) &&
                    !myNames.has(p.name.toLowerCase())
                );

            // Combinar: mis jugadores en venta primero, luego Firestore, luego generados
            let all = [...myListed, ...firestoreFiltered, ...originalPlayers];

            // Aplicar filtros
            if (filters.position && filters.position !== 'ALL') {
                all = all.filter(p => p.position === filters.position);
            }
            if (filters.minOverall) {
                all = all.filter(p => (p.overall || 0) >= filters.minOverall);
            }
            if (filters.maxAge && filters.maxAge < 100) {
                all = all.filter(p => (p.age || 99) <= filters.maxAge);
            }
            if (filters.searchName) {
                const s = filters.searchName.toLowerCase();
                all = all.filter(p => (p.name || '').toLowerCase().includes(s));
            }
            if (filters.transferListed) {
                all = all.filter(p => p.transferListed === true);
            }
            if (filters.loanListed) {
                all = all.filter(p => p.loanListed === true);
            }

            // Limitar segun nivel de ojeador
            const limit = 30 + scoutLevel * 10;
            all = all.slice(0, limit);

            window.ui.renderPlayerMarketList(all);
        };

        console.log('searchPlayersMarket interceptado por injector-transfer-market');
    }

    // =====================================================
    // INTERCEPCION: startNegotiationUI
    // Cuando se ficha un jugador, eliminarlo del mercado Firestore
    // =====================================================
    function patchStartNegotiationUI() {
        const originalStartNeg = window.startNegotiationUI;
        if (!originalStartNeg) return;

        window.startNegotiationUI = function(encodedPlayerJson) {
            // Guardar el jugador para saber su equipo origen al fichar
            try {
                const player = JSON.parse(decodeURIComponent(encodedPlayerJson));
                window._pendingSignPlayer = player;
            } catch(e) {}
            originalStartNeg(encodedPlayerJson);
        };
    }

    // =====================================================
    // INTERCEPCION: signPlayer resultado
    // Despues de fichar, eliminar del mercado Firestore
    // =====================================================
    function patchAfterSign() {
        // El signPlayer de gameLogic no tiene hook directo.
        // Lo que si tenemos es que despues de fichar se llama
        // window.ui.refreshUI. Interceptamos eso para detectar
        // si el squad crecio y eliminar al jugador del mercado.

        let lastSquadLength = 0;

        const originalRefreshUI = window.ui.refreshUI;
        window.ui.refreshUI = function(state) {
            const currentLength = (state?.squad || []).length;

            if (currentLength > lastSquadLength && window._pendingSignPlayer) {
                const signed = window._pendingSignPlayer;
                window._pendingSignPlayer = null;

                // Eliminar de la lista local
                firestoreMarketPlayers = firestoreMarketPlayers.filter(
                    p => p.name !== signed.name
                );

                // Eliminar de Firestore
                if (window.removePlayerFromMarket && signed.originalTeam) {
                    window.removePlayerFromMarket(signed.name, signed.originalTeam)
                        .catch(e => console.warn('Error eliminando del mercado Firestore:', e));
                }
            }

            lastSquadLength = currentLength;
            originalRefreshUI.call(window.ui, state);
        };
    }

    // =====================================================
    // SYNC AL GUARDAR PLANTILLA (admin)
    // Engancha en saveSquadData sin tocar el archivo admin
    // =====================================================
    function patchAdminSaveSquad() {
        if (!window.adminBackend) return;

        const originalSave = window.adminBackend.saveSquadData;
        window.adminBackend.saveSquadData = async function() {
            await originalSave.call(this);
            // Tras guardar, sincronizar con el mercado
            if (window.syncTeamToTransferMarket && this.currentTeam && this.squadPlayers?.length > 0) {
                window.syncTeamToTransferMarket(this.currentTeam, this.squadPlayers)
                    .then(r => { if (r?.added > 0) console.log('Sync mercado: +' + r.added + ' jugadores'); })
                    .catch(e => console.warn('Error sync mercado:', e));
            }
        };

        // Anadir boton Sync Mercado al panel admin si existe
        addSyncButtonToAdmin();

        console.log('Admin saveSquadData interceptado');
    }

    // =====================================================
    // BOTON "SYNC MERCADO FICHAJES" en el panel admin
    // =====================================================
    function addSyncButtonToAdmin() {
        // Esperar a que el modal se cree (se crea al abrir el panel)
        const observer = new MutationObserver(() => {
            const importExportDiv = document.querySelector('#adminModal h3');
            if (!importExportDiv) return;

            // Buscar la seccion de importar/exportar
            const allH3 = document.querySelectorAll('#adminModal h3');
            let targetDiv = null;
            allH3.forEach(h => {
                if (h.textContent.includes('Importar') || h.textContent.includes('Exportar')) {
                    targetDiv = h.parentElement;
                }
            });

            if (targetDiv && !document.getElementById('syncMarketBtn')) {
                const btn = document.createElement('button');
                btn.id = 'syncMarketBtn';
                btn.className = 'btn';
                btn.style.background = '#e94560';
                btn.textContent = '🔄 Sync Mercado Fichajes';
                btn.onclick = syncAllTeamsToMarket;
                targetDiv.appendChild(btn);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    async function syncAllTeamsToMarket(e) {
        if (!window.syncTeamToTransferMarket || !window.getAllTeamsDataFromFirebase) {
            alert('Firebase no disponible');
            return;
        }
        const btn = e?.target;
        if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando...'; }

        try {
            const result = await window.getAllTeamsDataFromFirebase();
            if (!result.success) { alert('Error: ' + (result.error || 'desconocido')); return; }

            const withSquad = Object.entries(result.data)
                .filter(([, data]) => data.squad && data.squad.length > 0);

            let totalAdded = 0;
            for (const [teamName, teamData] of withSquad) {
                const r = await window.syncTeamToTransferMarket(teamName, teamData.squad);
                if (r?.added) totalAdded += r.added;
            }

            alert('Mercado sincronizado: ' + withSquad.length + ' equipos, ' + totalAdded + ' jugadores nuevos');

            // Recargar mercado local
            await loadMarketFromFirestore();
        } catch(err) {
            alert('Error: ' + err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔄 Sync Mercado Fichajes'; }
        }
    }

    // =====================================================
    // RECARGAR MERCADO AL CARGAR PARTIDA
    // Engancha en loadGameFromCloudUI sin tocar el archivo
    // =====================================================
    function patchCloudLoad() {
        const originalLoad = window.loadGameFromCloudUI;
        if (!originalLoad) return;

        window.loadGameFromCloudUI = async function(gameId) {
            await originalLoad(gameId);
            setTimeout(async () => {
                await loadMarketFromFirestore();
            }, 1200);
        };
        console.log('loadGameFromCloudUI interceptado');
    }

    // =====================================================
    // RECARGAR AL ABRIR LA PAGINA DE FICHAJES
    // =====================================================
    function patchOpenPage() {
        const originalOpenPage = window.openPage;
        if (!originalOpenPage) return;

        window.openPage = function(pageId) {
            originalOpenPage(pageId);
            if (pageId === 'transfers') {
                // Si el mercado esta vacio, recargar
                if (firestoreMarketPlayers.length === 0) {
                    loadMarketFromFirestore().then(() => {
                        window.searchPlayersMarket();
                    });
                }
            }
        };
    }

    // =====================================================
    // INIT
    // =====================================================
    async function init() {
        await waitForGame();

        patchSearchPlayersMarket();
        patchStartNegotiationUI();
        patchAfterSign();
        patchCloudLoad();
        patchOpenPage();

        // Esperar a que el admin pueda estar cargado
        setTimeout(() => patchAdminSaveSquad(), 2000);

        // Cargar mercado inicial
        await loadMarketFromFirestore();

        console.log('injector-transfer-market listo');
    }

    init();

})();
