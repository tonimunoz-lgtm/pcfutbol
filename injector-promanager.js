// injector-promanager.js v3
// Sistema Promanager: ofertas de equipos, reputación en Firebase, despidos.
// v3: fix hook simulateWeek via callback global, fix nombre usuario, fix textos.

console.log('🎯 Injector Promanager cargando...');

(function () {
    'use strict';

    const DIVISION_RANK = { rfef_grupo2: 0, rfef_grupo1: 1, segunda: 2, primera: 3 };
    const DIVISION_LABELS = {
        rfef_grupo2: 'Primera RFEF Grupo 2',
        rfef_grupo1: 'Primera RFEF Grupo 1',
        segunda: 'Segunda División',
        primera: 'Primera División'
    };
    const DIVISION_REP_THRESHOLD = { rfef_grupo2: 0, rfef_grupo1: 15, segunda: 35, primera: 60 };

    let pmState = {
        active: false, sessionId: null, reputation: 0,
        gamesManaged: 0, wins: 0, draws: 0, losses: 0,
        currentTeam: null, currentDivision: null,
        lastOfferWeek: -99, firedThisSeason: false,
        consecutiveLosses: 0, weeklyPoints: [], unemployed: true,
        lastProcessedMatchKey: null  // evita procesar el mismo partido dos veces
    };

    // ── Nombre del usuario logueado ──
    function getManagerName() {
        if (window.currentUser) {
            return window.currentUser.name || window.currentUser.email || 'Manager';
        }
        try {
            var stored = localStorage.getItem('currentUser');
            if (stored) {
                var u = JSON.parse(stored);
                return u.name || u.email || 'Manager';
            }
        } catch(e) {}
        return 'Manager';
    }

    // ── Firebase ──
    async function waitForAuth() {
        if (window.authReadyPromise) await window.authReadyPromise;
        return window.currentUserId || null;
    }

    async function saveCareerToFirebase() {
        const uid = await waitForAuth();
        if (!uid || !window.firebaseDB) return;
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await setDoc(doc(window.firebaseDB, 'users', uid, 'promanager_career', pmState.sessionId), {
                ...pmState, updatedAt: Date.now()
            });
        } catch (e) { console.warn('⚠️ Promanager Firebase:', e.message); }
    }

    // ── Reputación ──
    function calcRepGain(result, division) {
        const m = { primera: 3, segunda: 2, rfef_grupo1: 1.5, rfef_grupo2: 1 }[division] || 1;
        return result === 'win' ? Math.round(3 * m) : result === 'draw' ? Math.round(1 * m) : Math.round(-1 * m);
    }
    function getRepLabel(rep) {
        if (rep < 10) return '⭐ Desconocido';
        if (rep < 25) return '⭐⭐ Prometedor';
        if (rep < 45) return '⭐⭐⭐ Competente';
        if (rep < 65) return '⭐⭐⭐⭐ Reconocido';
        return '⭐⭐⭐⭐⭐ Élite';
    }

    // ── Escudos ──
    async function getTeamLogo(teamName) {
        if (window.getTeamData) {
            try { const d = await window.getTeamData(teamName); if (d && d.logo) return d.logo; } catch(e) {}
        }
        try {
            const raw = localStorage.getItem('team_data_' + teamName);
            if (raw) { const d = JSON.parse(raw); if (d.logo) return d.logo; }
        } catch(e) {}
        return null;
    }

    function shieldHTML(logo, teamName, size) {
        size = size || 60;
        if (logo) return '<img src="' + logo + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;border-radius:6px;border:2px solid rgba(255,255,255,0.2);" alt="Escudo">';
        const ini = teamName.split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
        return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:6px;background:rgba(255,255,255,0.1);border:2px dashed rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size*0.35) + 'px;font-weight:bold;color:rgba(255,255,255,0.5);">' + ini + '</div>';
    }

    // ── Selección de equipos ──
    function getAllowedDivisions(rep) {
        return Object.entries(DIVISION_REP_THRESHOLD).filter(function(e){ return rep >= e[1]; }).map(function(e){ return e[0]; });
    }

    function pickOffers(allowedDivisions, excludeTeam, count) {
        count = count || 3;
        var all = window.TEAMS_DATA || {};
        var candidates = [];
        allowedDivisions.forEach(function(div) {
            (all[div] || []).forEach(function(t) {
                if (t && t !== excludeTeam) candidates.push({ team: t, division: div });
            });
        });
        candidates.sort(function(){ return Math.random() - 0.5; });
        return candidates.slice(0, Math.min(count, candidates.length));
    }

    function removeModal(id) { var el = document.getElementById(id); if (el) el.remove(); }

    // ── Modal inicial: 3 ofertas de empleo ──
    async function showInitialOfferModal(offers, onAccept) {
        removeModal('pmInitialModal');
        var logos = await Promise.all(offers.map(function(o){ return getTeamLogo(o.team); }));
        var managerName = getManagerName();

        var cardsHTML = offers.map(function(offer, i) {
            return '<div onclick="window._pmPick(' + i + ')" style="background:rgba(255,255,255,0.06);border:2px solid rgba(102,126,234,0.4);border-radius:14px;padding:22px 14px;cursor:pointer;text-align:center;flex:1;min-width:150px;max-width:200px;transition:all 0.2s;" onmouseover="this.style.borderColor=\'#667eea\';this.style.background=\'rgba(102,126,234,0.18)\';this.style.transform=\'translateY(-5px)\';this.style.boxShadow=\'0 8px 25px rgba(102,126,234,0.3)\'" onmouseout="this.style.borderColor=\'rgba(102,126,234,0.4)\';this.style.background=\'rgba(255,255,255,0.06)\';this.style.transform=\'translateY(0)\';this.style.boxShadow=\'none\'">'
                + '<div style="display:flex;justify-content:center;margin-bottom:12px;">' + shieldHTML(logos[i], offer.team, 62) + '</div>'
                + '<div style="font-weight:bold;font-size:0.92em;color:#fff;margin-bottom:6px;line-height:1.2;">' + offer.team + '</div>'
                + '<div style="font-size:0.74em;color:#f4c430;padding:3px 8px;background:rgba(244,196,48,0.1);border-radius:20px;display:inline-block;">' + DIVISION_LABELS[offer.division] + '</div>'
                + '<div style="margin-top:10px;font-size:0.72em;color:#aaa;">📋 Oferta recibida</div>'
                + '</div>';
        }).join('');

        var modal = document.createElement('div');
        modal.id = 'pmInitialModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;';
        modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);border:2px solid #667eea;border-radius:18px;padding:36px 24px;max-width:640px;width:95%;box-shadow:0 0 80px rgba(102,126,234,0.4);color:#fff;">'
            + '<div style="text-align:center;margin-bottom:6px;">'
            + '<div style="font-size:48px;margin-bottom:8px;">📬</div>'
            + '<h2 style="color:#667eea;margin:0 0 4px;font-size:1.45em;">Ofertas de empleo recibidas</h2>'
            + '<p style="color:#aaa;margin:0 0 4px;font-size:0.88em;">Hola, <strong style="color:#fff;">' + managerName + '</strong>. Estos clubs quieren contratarte como entrenador.</p>'
            + '<p style="color:#666;font-size:0.78em;margin:0 0 20px;">Sin historial previo, solo equipos de categorías inferiores están interesados.</p>'
            + '</div>'
            + '<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:20px;">' + cardsHTML + '</div>'
            + '<div style="background:rgba(102,126,234,0.1);border-radius:8px;padding:12px;font-size:0.79em;color:#ccc;text-align:center;">'
            + '💡 Haz clic en un club para aceptar su oferta. Gana partidos para subir tu reputación y recibir ofertas de equipos mejores.'
            + '</div></div>';
        document.body.appendChild(modal);

        window._pmPick = function(idx) {
            delete window._pmPick;
            removeModal('pmInitialModal');
            onAccept(offers[idx]);
        };
    }

    // ── Modal oferta espontánea ──
    async function showOfferModal(offer, onAccept, onReject) {
        removeModal('pmOfferModal');
        var logo = await getTeamLogo(offer.team);
        var modal = document.createElement('div');
        modal.id = 'pmOfferModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;';
        modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);border:2px solid #e94560;border-radius:16px;padding:34px 28px;max-width:420px;width:92%;box-shadow:0 0 60px rgba(233,69,96,0.4);text-align:center;color:#fff;">'
            + '<div style="font-size:42px;margin-bottom:6px;">📋</div>'
            + '<h2 style="color:#e94560;margin:0 0 4px;font-size:1.35em;">Nueva oferta de empleo</h2>'
            + '<p style="color:#888;font-size:0.8em;margin:0 0 18px;">Un club quiere contratarte como entrenador</p>'
            + '<div style="display:flex;align-items:center;gap:16px;background:rgba(255,255,255,0.07);border-radius:10px;padding:16px;margin-bottom:16px;text-align:left;">'
            + shieldHTML(logo, offer.team, 56)
            + '<div><div style="color:#aaa;font-size:0.78em;">CLUB INTERESADO</div>'
            + '<div style="font-size:1.08em;font-weight:bold;">' + offer.team + '</div>'
            + '<div style="color:#f4c430;font-size:0.83em;margin-top:4px;">' + (DIVISION_LABELS[offer.division] || offer.division) + '</div></div>'
            + '</div>'
            + '<div style="background:rgba(76,175,80,0.1);border-radius:8px;padding:9px;margin-bottom:18px;font-size:0.83em;">Tu reputación actual: <strong style="color:#4caf50;">' + getRepLabel(pmState.reputation) + ' (' + pmState.reputation + ' pts)</strong></div>'
            + '<p style="color:#ccc;font-size:0.86em;margin-bottom:20px;">¿Aceptas la oferta de <strong>' + offer.team + '</strong>?<br><small style="color:#666;">Puedes rechazar y seguir con tu equipo actual.</small></p>'
            + '<div style="display:flex;gap:12px;justify-content:center;">'
            + '<button id="pmOA" style="background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;border:none;border-radius:8px;padding:12px 26px;font-size:0.95em;font-weight:bold;cursor:pointer;">✅ Aceptar oferta</button>'
            + '<button id="pmOR" style="background:rgba(233,69,96,0.15);color:#e94560;border:1px solid #e94560;border-radius:8px;padding:12px 26px;font-size:0.95em;font-weight:bold;cursor:pointer;">❌ Rechazar</button>'
            + '</div></div>';
        document.body.appendChild(modal);
        document.getElementById('pmOA').onclick = function() { removeModal('pmOfferModal'); onAccept(offer); };
        document.getElementById('pmOR').onclick = function() { removeModal('pmOfferModal'); onReject(offer); };
    }

    // ── Modal despido ──
    function showFiredModal(onContinue) {
        removeModal('pmFiredModal');
        var modal = document.createElement('div');
        modal.id = 'pmFiredModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;';
        modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a0a0a,#2d0f0f);border:2px solid #e94560;border-radius:16px;padding:36px 28px;max-width:400px;width:92%;box-shadow:0 0 80px rgba(233,69,96,0.6);text-align:center;color:#fff;">'
            + '<div style="font-size:58px;margin-bottom:10px;">🚪</div>'
            + '<h2 style="color:#e94560;margin:0 0 8px;font-size:1.5em;">HAS SIDO DESPEDIDO</h2>'
            + '<p style="color:#aaa;margin:0 0 16px;font-size:0.9em;">La directiva ha decidido prescindir de tus servicios.</p>'
            + '<div style="background:rgba(233,69,96,0.1);border-radius:10px;padding:14px;margin-bottom:20px;">'
            + '<div style="color:#ccc;font-size:0.86em;">Reputación conservada:</div>'
            + '<div style="color:#f4c430;font-size:1.2em;font-weight:bold;margin-top:4px;">' + getRepLabel(pmState.reputation) + ' (' + pmState.reputation + ' pts)</div>'
            + '<div style="color:#888;font-size:0.76em;margin-top:6px;">Tu historial se mantiene para futuras ofertas</div>'
            + '</div>'
            + '<button id="pmFC" style="background:linear-gradient(135deg,#e94560,#c0392b);color:#fff;border:none;border-radius:8px;padding:14px 30px;font-size:1em;font-weight:bold;cursor:pointer;">🔍 Buscar nueva oferta</button>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('pmFC').onclick = function() { removeModal('pmFiredModal'); onContinue(); };
    }

    // ── Pantalla esperando oferta ──
    async function showWaitingScreen(offers) {
        removeModal('pmWaitingModal');
        if (offers && offers.length > 0) {
            var logos = await Promise.all(offers.map(function(o){ return getTeamLogo(o.team); }));
            var cardsHTML = offers.map(function(offer, i) {
                return '<div onclick="window._pmWP(' + i + ')" style="background:rgba(255,255,255,0.06);border:2px solid rgba(233,69,96,0.4);border-radius:12px;padding:18px 12px;cursor:pointer;text-align:center;flex:1;min-width:140px;max-width:180px;transition:all 0.2s;" onmouseover="this.style.borderColor=\'#e94560\';this.style.background=\'rgba(233,69,96,0.12)\';this.style.transform=\'translateY(-3px)\'" onmouseout="this.style.borderColor=\'rgba(233,69,96,0.4)\';this.style.background=\'rgba(255,255,255,0.06)\';this.style.transform=\'translateY(0)\'">'
                    + '<div style="display:flex;justify-content:center;margin-bottom:10px;">' + shieldHTML(logos[i], offer.team, 52) + '</div>'
                    + '<div style="font-weight:bold;font-size:0.88em;color:#fff;margin-bottom:5px;line-height:1.2;">' + offer.team + '</div>'
                    + '<div style="font-size:0.74em;color:#f4c430;">' + DIVISION_LABELS[offer.division] + '</div>'
                    + '<div style="margin-top:8px;font-size:0.7em;color:#aaa;">📋 Oferta recibida</div>'
                    + '</div>';
            }).join('');
            var modal = document.createElement('div');
            modal.id = 'pmWaitingModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:99998;font-family:inherit;';
            modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border:2px solid #e94560;border-radius:16px;padding:28px 22px;max-width:560px;width:95%;box-shadow:0 0 60px rgba(233,69,96,0.4);color:#fff;text-align:center;">'
                + '<div style="font-size:44px;margin-bottom:8px;">📬</div>'
                + '<h3 style="color:#e94560;margin:0 0 4px;">Ofertas de empleo recibidas</h3>'
                + '<p style="color:#aaa;font-size:0.83em;margin:0 0 20px;">Rep: <strong style="color:#4caf50;">' + getRepLabel(pmState.reputation) + ' (' + pmState.reputation + ' pts)</strong></p>'
                + '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' + cardsHTML + '</div>'
                + '</div>';
            document.body.appendChild(modal);
            window._pmWP = function(idx) { delete window._pmWP; removeModal('pmWaitingModal'); assignTeam(offers[idx]); };
        } else {
            var modal2 = document.createElement('div');
            modal2.id = 'pmWaitingModal';
            modal2.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:99998;font-family:inherit;';
            modal2.innerHTML = '<div style="text-align:center;color:#fff;max-width:360px;padding:40px;">'
                + '<div style="font-size:54px;margin-bottom:12px;">📭</div>'
                + '<h3 style="color:#f4c430;margin:0 0 10px;">Sin ofertas por ahora</h3>'
                + '<p style="color:#aaa;font-size:0.9em;">Ningún club ha contactado aún.</p>'
                + '<p style="color:#ccc;font-size:0.85em;">Tu reputación: <strong style="color:#4caf50;">' + getRepLabel(pmState.reputation) + ' (' + pmState.reputation + ' pts)</strong></p>'
                + '<button id="pmWT" style="margin-top:18px;background:linear-gradient(135deg,#e94560,#c0392b);color:#fff;border:none;border-radius:8px;padding:12px 26px;font-size:0.93em;font-weight:bold;cursor:pointer;">⏩ Esperar más tiempo</button>'
                + '</div>';
            document.body.appendChild(modal2);
            document.getElementById('pmWT').onclick = function() { removeModal('pmWaitingModal'); tryGenerateNewOffers(); };
        }
    }

    // ── Inicio modo Promanager ──
    async function startPromanagerMode() {
        pmState = {
            active: true, sessionId: 'pm_' + Date.now(), reputation: 0,
            gamesManaged: 0, wins: 0, draws: 0, losses: 0,
            currentTeam: null, currentDivision: null,
            lastOfferWeek: -99, firedThisSeason: false,
            consecutiveLosses: 0, weeklyPoints: [], unemployed: true,
            lastProcessedMatchKey: null
        };
        var tries = 0;
        while (!window.TEAMS_DATA && tries++ < 30) await new Promise(function(r){ setTimeout(r, 200); });
        var offers = pickOffers(['rfef_grupo2', 'rfef_grupo1'], null, 3);
        if (!offers.length) { alert('Error: no hay equipos disponibles.'); return; }
        await showInitialOfferModal(offers, function(accepted) { assignTeam(accepted); });
    }

    function assignTeam(offer) {
        pmState.currentTeam = offer.team;
        pmState.currentDivision = offer.division;
        pmState.unemployed = false;
        pmState.consecutiveLosses = 0;
        pmState.firedThisSeason = false;
        pmState.lastOfferWeek = -99;
        window.gameMode = 'promanager';

        if (window.gameLogic && window.gameLogic.selectTeamWithInitialSquad) {
            window.gameLogic.selectTeamWithInitialSquad(offer.team, offer.division, 'promanager');
            try { window.ui.refreshUI(window.gameLogic.getGameState()); } catch(e) {}
            ['selectTeam','gameMode'].forEach(function(m){ try { window.closeModal(m); } catch(e) {} });
            setTimeout(function() {
                var btn = document.querySelector('.menu-item[onclick*="dashboard"]');
                if (btn && window.switchPage) window.switchPage('dashboard', btn);
                else if (window.openPage) window.openPage('dashboard');
                updateRepBadge();
            }, 300);
        }
        saveCareerToFirebase();
        setTimeout(function() {
            if (window.gameLogic && window.gameLogic.addNews) {
                window.gameLogic.addNews('🎯 [Promanager] Contratado por ' + offer.team + ' (' + DIVISION_LABELS[offer.division] + '). ¡Demuestra tu valía!', 'info');
                try { window.ui.refreshUI(window.gameLogic.getGameState()); } catch(e) {}
            }
        }, 700);
    }

    // ── HOOK simulateWeek: estrategia robusta ──
    // En lugar de reemplazar window.simulateWeek (que otros injectors también reemplazan),
    // registramos un callback global window._pmAfterWeek que se llama desde el hook.
    // El hook se instala UNA SOLA VEZ cuando simulateWeek esté disponible,
    // y usa la propiedad _pmCB para no perder el callback aunque otro injector
    // vuelva a wrappear window.simulateWeek después.

    function installPmCallback() {
        // Este callback se llama desde el hook instalado en window.simulateWeek
        window._pmAfterWeek = async function() {
            if (!pmState.active || pmState.unemployed) return;
            await afterWeekPromanager();
        };
    }

    function hookSimulateWeek() {
        if (typeof window.simulateWeek !== 'function') return false;
        if (window.simulateWeek._pmHooked) return true;

        var original = window.simulateWeek;
        window.simulateWeek = async function() {
            if (pmState.active && pmState.unemployed) {
                tryGenerateNewOffers();
                return;
            }
            var result = await original.apply(this, arguments);
            // Llamar al callback promanager si existe
            if (typeof window._pmAfterWeek === 'function') {
                await window._pmAfterWeek();
            }
            return result;
        };
        window.simulateWeek._pmHooked = true;
        console.log('[Promanager] hook simulateWeek instalado ✓');
        return true;
    }

    async function afterWeekPromanager() {
        if (!window.gameLogic) return;
        var state = window.gameLogic.getGameState();
        var history = state.matchHistory;

        console.log('[Promanager] afterWeekPromanager - historial:', history ? history.length : 'null', 'semana:', state.week, 'tipo:', state.seasonType);

        if (!history || !history.length) {
            console.log('[Promanager] Sin historial todavía (pretemporada?)');
            return;
        }

        var myTeam = state.team;
        var result = null;
        var foundMatch = null;

        // Buscar el partido más reciente del equipo que NO hayamos procesado ya
        for (var i = history.length - 1; i >= 0; i--) {
            var match = history[i];
            if (!match || !match.score) continue;
            if (match.home === myTeam || match.away === myTeam) {
                // Clave única del partido
                var matchKey = match.home + '_' + match.away + '_' + match.score + '_' + (match.week || i);
                if (matchKey === pmState.lastProcessedMatchKey) {
                    console.log('[Promanager] Partido ya procesado, ignorando:', matchKey);
                    return;
                }
                var parts = match.score.split('-').map(Number);
                var gh = parts[0], ga = parts[1];
                if (match.home === myTeam) result = gh > ga ? 'win' : gh === ga ? 'draw' : 'loss';
                else result = ga > gh ? 'win' : gh === ga ? 'draw' : 'loss';
                foundMatch = match;
                pmState.lastProcessedMatchKey = matchKey;
                console.log('[Promanager] Partido encontrado:', match.home, match.score, match.away, '→', result);
                break;
            }
        }

        if (!result) {
            console.log('[Promanager] No se encontró partido nuevo del equipo en el historial');
            return;
        }

        var gain = calcRepGain(result, state.division);
        pmState.reputation = Math.max(0, Math.min(100, pmState.reputation + gain));
        pmState.gamesManaged++;
        pmState.weeklyPoints.push(result === 'win' ? 3 : result === 'draw' ? 1 : 0);
        if (result === 'win') { pmState.wins++; pmState.consecutiveLosses = 0; }
        else if (result === 'draw') { pmState.draws++; pmState.consecutiveLosses = 0; }
        else { pmState.losses++; pmState.consecutiveLosses++; }
        pmState.currentTeam = myTeam;
        pmState.currentDivision = state.division;

        console.log('[Promanager] Rep actualizada:', pmState.reputation, '| Partidos:', pmState.gamesManaged);
        updateRepBadge();
        await saveCareerToFirebase();

        // Despido
        if (!pmState.firedThisSeason && checkFiring()) {
            pmState.firedThisSeason = true;
            pmState.unemployed = true;
            pmState.reputation = Math.max(0, pmState.reputation - 5);
            await saveCareerToFirebase();
            setTimeout(function() { showFiredModal(function(){ tryGenerateNewOffers(); }); }, 600);
            return;
        }

        // Oferta espontánea
        var week = state.week || 1;
        if (week - pmState.lastOfferWeek >= 8 && checkOffer(state)) {
            pmState.lastOfferWeek = week;
            var allowed = getAllowedDivisions(pmState.reputation);
            var rank = DIVISION_RANK[state.division] || 0;
            var better = allowed.filter(function(d){ return (DIVISION_RANK[d] || 0) > rank; });
            var pool = better.length ? better : allowed;
            var offers = pickOffers(pool, myTeam, 1);
            if (offers.length) {
                setTimeout(function() {
                    showOfferModal(offers[0],
                        function(a) { assignTeam(a); },
                        function(r) {
                            if (window.gameLogic && window.gameLogic.addNews) {
                                window.gameLogic.addNews('📋 [Promanager] Rechazaste la oferta de ' + r.team + '.', 'info');
                                try { window.ui.refreshUI(window.gameLogic.getGameState()); } catch(e) {}
                            }
                        }
                    );
                }, 900);
            }
        }
    }

    function checkFiring() {
        if (pmState.consecutiveLosses >= 5) return true;
        var last10 = pmState.weeklyPoints.slice(-10);
        if (last10.length >= 10 && last10.reduce(function(a,b){return a+b;},0) < 8) return true;
        return false;
    }

    function checkOffer(state) {
        var rank = DIVISION_RANK[state.division] || 0;
        var allowed = getAllowedDivisions(pmState.reputation);
        var hasBetter = allowed.some(function(d){ return (DIVISION_RANK[d]||0) > rank; });
        var last5 = pmState.weeklyPoints.slice(-5).reduce(function(a,b){return a+b;},0);
        var prob = hasBetter ? 0.08 + (pmState.reputation/100)*0.15 + (last5/15)*0.1 : 0.03;
        return Math.random() < prob;
    }

    function tryGenerateNewOffers() {
        var allowed = getAllowedDivisions(pmState.reputation);
        var prob = 0.4 + (pmState.reputation / 100) * 0.4;
        if (Math.random() < prob) {
            var count = pmState.reputation >= 20 ? 3 : Math.random() < 0.5 ? 2 : 1;
            var offers = pickOffers(allowed, pmState.currentTeam, count);
            if (offers.length) { showWaitingScreen(offers); return; }
        }
        showWaitingScreen([]);
    }

    // ── Badge reputación ──
    function injectRepBadge() {
        if (document.getElementById('pmRepBadge')) return;
        var header = document.querySelector('.header-info');
        if (!header) return;
        var badge = document.createElement('div');
        badge.id = 'pmRepBadge';
        badge.className = 'info-box';
        badge.style.cssText = 'display:none;cursor:pointer;';
        badge.title = 'Tu reputación — haz clic para ver detalle';
        badge.innerHTML = '<span>Rep:</span><span id="pmRepVal" style="color:#f4c430;">0</span>';
        badge.onclick = function() { showRepSummary(); };
        header.appendChild(badge);
    }

    function updateRepBadge() {
        var badge = document.getElementById('pmRepBadge');
        var val = document.getElementById('pmRepVal');
        if (!badge || !val) return;
        if (pmState.active) {
            badge.style.display = '';
            val.textContent = pmState.reputation + 'pts ' + getRepLabel(pmState.reputation).split(' ')[0];
        } else {
            badge.style.display = 'none';
        }
    }

    function showRepSummary() {
        removeModal('pmRepModal');
        var wr = pmState.gamesManaged > 0 ? Math.round((pmState.wins / pmState.gamesManaged) * 100) : 0;
        var managerName = getManagerName();
        var modal = document.createElement('div');
        modal.id = 'pmRepModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99990;font-family:inherit;';
        modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border:2px solid #f4c430;border-radius:14px;padding:28px;max-width:360px;width:90%;text-align:center;color:#fff;">'
            + '<div style="font-size:42px;margin-bottom:6px;">📊</div>'
            + '<h3 style="color:#f4c430;margin:0 0 2px;">Carrera de ' + managerName + '</h3>'
            + '<div style="color:#888;font-size:0.78em;margin-bottom:10px;">Liga Promanager</div>'
            + '<div style="font-size:1.2em;margin-bottom:14px;">' + getRepLabel(pmState.reputation) + '</div>'
            + '<div style="background:rgba(255,255,255,0.07);border-radius:8px;padding:12px;text-align:left;font-size:0.86em;line-height:1.9;">'
            + '<div>🏟️ Equipo: <strong>' + (pmState.currentTeam||'-') + '</strong></div>'
            + '<div>📊 División: <strong>' + (DIVISION_LABELS[pmState.currentDivision]||'-') + '</strong></div>'
            + '<div>🔢 Reputación: <strong style="color:#f4c430;">' + pmState.reputation + ' pts</strong></div>'
            + '<div>🎮 Partidos: <strong>' + pmState.gamesManaged + '</strong></div>'
            + '<div>✅ V: <strong>' + pmState.wins + '</strong> &nbsp;🤝 E: <strong>' + pmState.draws + '</strong> &nbsp;❌ D: <strong>' + pmState.losses + '</strong></div>'
            + '<div>📈 % victorias: <strong>' + wr + '%</strong></div>'
            + '</div>'
            + '<button onclick="document.getElementById(\'pmRepModal\').remove()" style="margin-top:14px;background:rgba(244,196,48,0.15);color:#f4c430;border:1px solid #f4c430;border-radius:8px;padding:9px 22px;font-size:0.86em;cursor:pointer;">Cerrar</button>'
            + '</div>';
        document.body.appendChild(modal);
    }

    // ── Interceptar botón Promanager ──
    function interceptButton() {
        var orig = window.startGameMode;
        window.startGameMode = function(mode) {
            if (mode === 'promanager') {
                try { window.closeModal('gameMode'); } catch(e) {}
                startPromanagerMode();
            } else {
                pmState.active = false;
                updateRepBadge();
                if (orig) orig.call(this, mode);
            }
        };
    }

    // ── Init ──
    function init() {
        interceptButton();
        injectRepBadge();
        installPmCallback();

        // Instalar el hook con delay de 2.5s para garantizar que somos los ÚLTIMOS
        // en hookear simulateWeek (todos los otros injectors usan delays de 200-800ms)
        // Así nuestro hook queda encima de todos y siempre se ejecuta último.
        setTimeout(function() {
            if (!hookSimulateWeek()) {
                // Si no está disponible aún, reintentar
                var t = setInterval(function() {
                    if (hookSimulateWeek()) clearInterval(t);
                }, 500);
            }
        }, 2500);

        console.log('✅ Injector Promanager v3 listo');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else setTimeout(init, 150);

})();
