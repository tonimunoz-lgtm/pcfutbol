// injector-transfer-market.js
// Mercado de fichajes con jugadores reales de Firestore.
// NO modifica ningun otro archivo. Se engancha desde fuera.

(function() {

    // =====================================================
    // ESTADO LOCAL
    // =====================================================
    let firestoreMarketPlayers = [];
    let _sellPlayerName = null; // Fix bug indice venta

    // =====================================================
    // ESPERAR A QUE EL JUEGO ESTE LISTO
    // =====================================================
    function waitForGame() {
        return new Promise(resolve => {
            const t = setInterval(() => {
                if (window.gameLogic && window.ui) { clearInterval(t); resolve(); }
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
                    if (!c.value)         c.value         = Math.floor((c.overall || 70) * 2000);
                    if (!c.salary)        c.salary        = Math.floor((c.overall || 70) * 100);
                    if (!c.askingPrice)   c.askingPrice   = Math.floor(c.value * (1 + Math.random() * 0.5));
                    if (!c.releaseClause) c.releaseClause = Math.floor(c.value * 3);
                    if (!c.potential)     c.potential     = Math.min(99, (c.overall || 70) + Math.floor(Math.random() * 10));
                    if (!c.foot)          c.foot          = Math.random() > 0.2 ? 'Diestro' : 'Zurdo';
                    if (!c.contractType)  c.contractType  = 'owned';
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
    // BUGFIX: el squad en ui.js se ordena por overall antes
    // de renderizar, pero confirmListPlayer busca por indice
    // en el squad SIN ordenar. Resultado: jugador equivocado.
    // Solucion: guardar nombre al abrir modal, buscar por nombre.
    // =====================================================
    function patchSellPlayerIndex() {
        // Interceptar openSellPlayerModal para capturar el nombre correcto
        const originalOpen = window.openSellPlayerModal;
        window.openSellPlayerModal = function(playerIndex) {
            const state = window.gameLogic.getGameState();
            // ui.js renderiza el squad ordenado por overall (sort((a,b)=>b.overall-a.overall))
            const sorted = [...(state.squad || [])].sort((a, b) => b.overall - a.overall);
            if (sorted[playerIndex]) {
                _sellPlayerName = sorted[playerIndex].name;
            }
            originalOpen(playerIndex);
        };

        // Reemplazar confirmListPlayer para buscar por nombre en vez de indice
        window.confirmListPlayer = function() {
            if (!_sellPlayerName) return;
            const state = window.gameLogic.getGameState();
            const player = state.squad.find(p => p.name === _sellPlayerName);
            if (!player) { alert('Jugador no encontrado'); return; }

            const operationType = document.getElementById('sellOperationType').value;

            if (operationType === 'transfer') {
                const price = parseInt(document.getElementById('sellTransferPrice').value);
                if (!price || price <= 0) { alert('Introduce un precio valido'); return; }
                player.transferListed = true;
                player.loanListed = false;
                player.askingPrice = price;
                player.weeksOnMarket = 0;
                window.gameLogic.addNews(
                    'Has puesto a ' + player.name + ' en venta por ' + price.toLocaleString('es-ES') + '\u20ac',
                    'info'
                );
                alert(player.name + ' ha sido puesto en venta por ' + price.toLocaleString('es-ES') + '\u20ac');
            } else {
                const wagePercent = parseInt(document.getElementById('sellLoanWagePercent').value) || 0;
                player.transferListed = false;
                player.loanListed = true;
                player.loanWageContribution = Math.round(player.salary * ((100 - wagePercent) / 100));
                player.weeksOnMarket = 0;
                window.gameLogic.addNews(
                    'Has puesto a ' + player.name + ' disponible para cesion (asumes ' + wagePercent + '% salario)',
                    'info'
                );
                alert(player.name + ' ha sido puesto disponible para cesion');
            }

            window.gameLogic.updateGameState(state);
            window.gameLogic.saveToLocalStorage();
            window.closeModal('sellPlayer');
            window.ui.refreshUI(window.gameLogic.getGameState());
            _sellPlayerName = null;
        };

        // Fix updateLoanCostPreview que tambien usaba el indice roto
        window.updateLoanCostPreview = function() {
            if (!_sellPlayerName) return;
            const state = window.gameLogic.getGameState();
            const player = state.squad.find(p => p.name === _sellPlayerName);
            if (!player) return;
            const wagePercent = parseInt(document.getElementById('sellLoanWagePercent').value) || 0;
            const ourCost = Math.round(player.salary * (wagePercent / 100));
            const theirCost = player.salary - ourCost;
            document.getElementById('sellLoanOurCost').textContent = ourCost.toLocaleString('es-ES');
            document.getElementById('sellLoanTheirCost').textContent = theirCost.toLocaleString('es-ES');
        };

        console.log('Bug indice venta corregido');
    }

    // =====================================================
    // INTERCEPCION: searchPlayersMarket
    // Mezcla: mis jugadores en venta + Firestore + generados
    // =====================================================
    function patchSearchPlayersMarket() {
        window.searchPlayersMarket = function() {
            const state = window.gameLogic.getGameState();
            const myNames = new Set((state.squad || []).map(p => p.name.toLowerCase()));

            const filters = {
                searchName:     document.getElementById('marketSearchName')?.value || '',
                position:       document.getElementById('marketPosition')?.value || 'ALL',
                minOverall:     parseInt(document.getElementById('marketMinOverall')?.value) || 0,
                maxAge:         parseInt(document.getElementById('marketMaxAge')?.value) || 100,
                transferListed: document.getElementById('marketTransferListed')?.checked || false,
                loanListed:     document.getElementById('marketLoanListed')?.checked || false,
            };

            // 1. Mis jugadores en venta/cesion
            const myListed = (state.squad || []).filter(p => p.transferListed || p.loanListed);

            // 2. Jugadores reales de Firestore (sin los mios)
            const firestoreFiltered = firestoreMarketPlayers.filter(p =>
                !myNames.has((p.name || '').toLowerCase())
            );

            // 3. Jugadores generados (sin duplicados)
            const firestoreNames = new Set(firestoreMarketPlayers.map(p => p.name.toLowerCase()));
            const myListedNames  = new Set(myListed.map(p => p.name.toLowerCase()));
            const scoutLevel = state.staff?.scout?.level || 0;
            const generated = window.gameLogic.getPlayerMarket({})
                .filter(p =>
                    !firestoreNames.has(p.name.toLowerCase()) &&
                    !myListedNames.has(p.name.toLowerCase()) &&
                    !myNames.has(p.name.toLowerCase())
                );

            let all = [...myListed, ...firestoreFiltered, ...generated];

            // Aplicar filtros
            if (filters.position && filters.position !== 'ALL')
                all = all.filter(p => p.position === filters.position);
            if (filters.minOverall)
                all = all.filter(p => (p.overall || 0) >= filters.minOverall);
            if (filters.maxAge && filters.maxAge < 100)
                all = all.filter(p => (p.age || 99) <= filters.maxAge);
            if (filters.searchName) {
                const s = filters.searchName.toLowerCase();
                all = all.filter(p => (p.name || '').toLowerCase().includes(s));
            }
            if (filters.transferListed) all = all.filter(p => p.transferListed === true);
            if (filters.loanListed)     all = all.filter(p => p.loanListed === true);

            all = all.slice(0, 30 + scoutLevel * 10);
            window.ui.renderPlayerMarketList(all);
        };
        console.log('searchPlayersMarket interceptado');
    }

    // =====================================================
    // AL FICHAR: eliminar del mercado Firestore
    // =====================================================
    function patchStartNegotiationUI() {
        const orig = window.startNegotiationUI;
        if (!orig) return;
        window.startNegotiationUI = function(encodedPlayerJson) {
            try { window._pendingSignPlayer = JSON.parse(decodeURIComponent(encodedPlayerJson)); } catch(e) {}
            orig(encodedPlayerJson);
        };
    }

    function patchAfterSign() {
        let lastSquadLength = 0;
        const originalRefreshUI = window.ui.refreshUI.bind(window.ui);
        window.ui.refreshUI = function(state) {
            const currentLength = (state?.squad || []).length;
            if (currentLength > lastSquadLength && window._pendingSignPlayer) {
                const signed = window._pendingSignPlayer;
                window._pendingSignPlayer = null;
                firestoreMarketPlayers = firestoreMarketPlayers.filter(p => p.name !== signed.name);
                if (window.removePlayerFromMarket && signed.originalTeam) {
                    window.removePlayerFromMarket(signed.name, signed.originalTeam)
                        .catch(e => console.warn('Error eliminando del mercado:', e));
                }
            }
            lastSquadLength = currentLength;
            originalRefreshUI(state);
        };
    }

    // =====================================================
    // ADMIN: sync al guardar + boton sync masivo
    // =====================================================
    function patchAdminSaveSquad() {
        if (!window.adminBackend) return;
        const originalSave = window.adminBackend.saveSquadData;
        window.adminBackend.saveSquadData = async function() {
            await originalSave.call(this);
            if (window.syncTeamToTransferMarket && this.currentTeam && this.squadPlayers?.length > 0) {
                window.syncTeamToTransferMarket(this.currentTeam, this.squadPlayers)
                    .then(r => { if (r?.added > 0) console.log('Sync mercado: +' + r.added); })
                    .catch(e => console.warn('Error sync:', e));
            }
        };
        console.log('Admin saveSquadData interceptado');
    }

    function addSyncButtonToAdmin() {
        const observer = new MutationObserver(() => {
            const modal = document.getElementById('adminModal');
            if (!modal || document.getElementById('syncMarketBtn')) return;
            const allH3 = modal.querySelectorAll('h3');
            allH3.forEach(h => {
                if ((h.textContent.includes('Importar') || h.textContent.includes('Exportar')) &&
                    !document.getElementById('syncMarketBtn')) {
                    const btn = document.createElement('button');
                    btn.id = 'syncMarketBtn';
                    btn.className = 'btn';
                    btn.style.background = '#e94560';
                    btn.style.marginTop = '10px';
                    btn.textContent = 'Sync Mercado Fichajes';
                    btn.onclick = syncAllTeamsToMarket;
                    h.parentElement.appendChild(btn);
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    async function syncAllTeamsToMarket(e) {
        // Esperar hasta 5s a que Firebase este disponible
        let tries = 0;
        while ((!window.syncTeamToTransferMarket || !window.getAllTeamsDataFromFirebase) && tries < 25) {
            await new Promise(r => setTimeout(r, 200));
            tries++;
        }
        if (!window.syncTeamToTransferMarket || !window.getAllTeamsDataFromFirebase) {
            alert('Firebase no disponible. Asegurate de estar autenticado.');
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
            await loadMarketFromFirestore();
        } catch(err) {
            alert('Error: ' + err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Sync Mercado Fichajes'; }
        }
    }

    // =====================================================
    // RECARGAR AL CARGAR PARTIDA
    // =====================================================
    function patchCloudLoad() {
        const orig = window.loadGameFromCloudUI;
        if (!orig) return;
        window.loadGameFromCloudUI = async function(gameId) {
            await orig(gameId);
            setTimeout(loadMarketFromFirestore, 1200);
        };
    }

    // =====================================================
    // RECARGAR AL ABRIR PAGINA DE FICHAJES
    // =====================================================
    function patchOpenPage() {
        const orig = window.openPage;
        if (!orig) return;
        window.openPage = function(pageId) {
            orig(pageId);
            if (pageId === 'transfers' && firestoreMarketPlayers.length === 0) {
                loadMarketFromFirestore().then(() => window.searchPlayersMarket());
            }
        };
    }

    // =====================================================
    // SYNC INICIAL: sincronizar todos los equipos con
    // plantilla real al cargar el juego por primera vez
    // =====================================================
    async function doInitialSync() {
        // Esperar a que Firebase este listo
        let tries = 0;
        while ((!window.syncTeamToTransferMarket || !window.getAllTeamsDataFromFirebase) && tries < 30) {
            await new Promise(r => setTimeout(r, 300));
            tries++;
        }
        if (!window.syncTeamToTransferMarket || !window.getAllTeamsDataFromFirebase) return;
        try {
            const result = await window.getAllTeamsDataFromFirebase();
            if (!result.success) return;
            const withSquad = Object.entries(result.data)
                .filter(([, data]) => data.squad && data.squad.length > 0);
            for (const [teamName, teamData] of withSquad) {
                await window.syncTeamToTransferMarket(teamName, teamData.squad);
            }
            console.log('Sync inicial: ' + withSquad.length + ' equipos sincronizados');
        } catch(e) {
            console.warn('Error en sync inicial:', e);
        }
    }

    // =====================================================
    // INIT
    // =====================================================
    async function init() {
        await waitForGame();

        patchSellPlayerIndex();
        patchSearchPlayersMarket();
        patchStartNegotiationUI();
        patchAfterSign();
        patchCloudLoad();
        patchOpenPage();

        setTimeout(() => {
            patchAdminSaveSquad();
            addSyncButtonToAdmin();
        }, 2000);

        await doInitialSync();
        await loadMarketFromFirestore();

        console.log('injector-transfer-market listo');
    }

    init();

})();
