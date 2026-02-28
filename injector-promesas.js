// ============================================================
// injector-promesas.js  v1.0
//
// MÓDULO: Liga Promesas + Descensos Primera RFEF
//
// ESTRUCTURA:
//   - Liga Promesas: liga única de 20 equipos
//   - Primera RFEF G1 y G2: ahora con 1 descenso directo cada uno
//   - De Promesas: 1º sube directo a RFEF G2
//                 2º-5º → playoff → ganador sube a RFEF G1
//   - Admin: selector de división incluye Promesas
// ============================================================

(function () {
    'use strict';

    // ── Equipos Liga Promesas ──────────────────────────────────
    const PROMESAS_TEAMS = [
        'Sabadell Nord',
        'Pericos de Sant Cugat',
        'Sabadellenca',
        'Barberà',
        'OAR Gràcia',
        'Escola F. Sabadell',
        'Peña Blaugrana SC',
        'Castellar',
        'Marina',
        'Base Montcada',
        'Tibidabo Torre Romeu',
        'Rubí',
        'Junior',
        'Atlético Roureda',
        'Can Rull Rómulo Tronchoni',
        'Sant Cugat',
        'Matadepera',
        'FC Barcelona Prom',
        'Real Madrid Prom',
        'Español Prom'
    ];

    // ── Configuración de zonas para Promesas ──────────────────
    // Pos 1:   ascenso directo → RFEF G2
    // Pos 2-5: playoff ascenso → ganador va a RFEF G1
    // Pos 20:  (no hay descenso por ahora, liga nueva)
    const PROMESAS_COMP_CONFIG = {
        promoteAuto:    [1],
        promotePlayoff: [2, 3, 4, 5],
        relegate:       0
    };

    // ── Storage para playoff de Promesas ──────────────────────
    const PLAYOFF_PROMESAS_KEY = 'playoff_promesas_v1';
    const storeP = {
        get:   () => { try { return JSON.parse(localStorage.getItem(PLAYOFF_PROMESAS_KEY)); } catch(e) { return null; } },
        save:  (s) => { try { localStorage.setItem(PLAYOFF_PROMESAS_KEY, JSON.stringify(s)); } catch(e) {} },
        clear: () => localStorage.removeItem(PLAYOFF_PROMESAS_KEY)
    };

    // ── Helpers ───────────────────────────────────────────────
    function getState() { return window.gameLogic?.getGameState(); }

    function simMatch(ratingA, ratingB) {
        const diff = (ratingA - ratingB) / 100;
        const baseHome = 0.45 + diff * 0.5;
        const r = Math.random();
        const hg = Math.floor(Math.random() * 3) + (r < baseHome ? 1 : 0);
        const ag = Math.floor(Math.random() * 3) + (r >= baseHome ? 1 : 0);
        return { hg, ag };
    }

    function getMyRating() {
        const state = getState();
        if (!state) return 65;
        // Usar calculateTeamEffectiveOverall si está disponible (penalización por posición)
        if (window.calculateTeamEffectiveOverallImproved && state.lineup?.length >= 11) {
            return Math.round(window.calculateTeamEffectiveOverallImproved(
                state.lineup.slice(0,11), state.formation || '433'
            ));
        }
        // Fallback: media del once
        const lineup = (state.lineup || []).slice(0, 11);
        if (!lineup.length) return 65;
        const squad = state.squad || state.players || [];
        const sum = lineup.reduce((acc, p) => {
            const sp = squad.find(x => x.name === (p?.name || p));
            return acc + (sp?.overall || p?.overall || 65);
        }, 0);
        return sum / lineup.length;
    }

    // ── Ordenar standings ──────────────────────────────────────
    function sortSt(standings) {
        return Object.entries(standings || {}).sort((a, b) => {
            const dp = (b[1].pts || 0) - (a[1].pts || 0);
            if (dp !== 0) return dp;
            return ((b[1].gf || 0) - (b[1].gc || 0)) - ((a[1].gf || 0) - (a[1].gc || 0));
        });
    }

    // ============================================================
    // PASO 1: Registrar equipos de Promesas en TEAMS_DATA
    // ============================================================
    function registerPromasasTeams() {
        // Esperar a que window.TEAMS_DATA esté disponible
        if (!window.TEAMS_DATA) {
            setTimeout(registerPromasasTeams, 300);
            return;
        }
        if (!window.TEAMS_DATA.promesas) {
            window.TEAMS_DATA.promesas = PROMESAS_TEAMS;
            console.log('✅ Liga Promesas: equipos registrados en TEAMS_DATA');
        }
    }

    // ============================================================
    // PASO 2: Parchar COMPETITION_CONFIG de injector-competitions
    //         → añadir Promesas + activar descenso en RFEF
    // ============================================================
    function patchCompetitionConfig() {
        const _originalUpdateColors = window.updateStandingsColors;

        window.updateStandingsColorsPromesas = function () {
            const state = getState();
            if (!state?.standings) return;
            const division = state.division;

            const ZONE_COLORS = {
                champions:       { bg: 'rgba(30,90,200,0.25)',  border: '#1E5AC8' },
                europaLeague:    { bg: 'rgba(255,140,0,0.22)',  border: '#FF8C00' },
                conferenceLague: { bg: 'rgba(0,180,100,0.22)',  border: '#00B464' },
                promoteAuto:     { bg: 'rgba(50,200,50,0.25)',  border: '#32C832' },
                promotePlayoff:  { bg: 'rgba(180,150,0,0.22)',  border: '#B49600' },
                relegate:        { bg: 'rgba(200,40,40,0.25)',  border: '#C82828' }
            };

            if (division !== 'promesas' &&
                division !== 'rfef_grupo1' &&
                division !== 'rfef_grupo2') return;

            const total = Object.keys(state.standings).length;
            const rows = document.querySelectorAll('#standingsTable tr, .standings-table tbody tr');

            rows.forEach((row, idx) => {
                const pos = idx + 1;
                row.style.background  = '';
                row.style.borderLeft  = '';

                const apply = zone => {
                    row.style.background = ZONE_COLORS[zone].bg;
                    row.style.borderLeft = `4px solid ${ZONE_COLORS[zone].border}`;
                };

                if (division === 'promesas') {
                    if (pos === 1)                              apply('promoteAuto');
                    else if (pos >= 2 && pos <= 5)             apply('promotePlayoff');
                } else if (division === 'rfef_grupo1' || division === 'rfef_grupo2') {
                    if (pos === 1)                             apply('promoteAuto');
                    else if (pos >= 2 && pos <= 5)            apply('promotePlayoff');
                    else if (pos === total)                    apply('relegate');
                }

                if (row.classList.contains('my-team-row')) {
                    const currentBg = row.style.background;
                    if (currentBg && currentBg !== '') {
                        row.style.background = currentBg.replace(/[\d.]+\)$/, '0.45)');
                    } else {
                        row.style.background = 'rgba(233,69,96,0.22)';
                    }
                    row.style.borderLeft  = '4px solid #e94560';
                    row.style.borderRight = '3px solid rgba(233,69,96,0.6)';
                    row.style.fontWeight  = 'bold';
                    const nameCell = row.querySelector('.team-name, td:nth-child(2)');
                    if (nameCell && !nameCell.textContent.includes('⭐')) {
                        nameCell.innerHTML = '⭐ ' + nameCell.innerHTML;
                    }
                } else {
                    row.style.borderRight = '';
                    row.style.fontWeight  = '';
                }
            });

            addPromasasLegend(division, total);
        };

        console.log('✅ Liga Promesas: updateStandingsColorsPromesas registrado');
    }

    // ── Leyenda para Promesas / RFEF con descenso ─────────────
    function addPromasasLegend(division, total) {
        const page = document.getElementById('standings');
        if (!page) return;
        document.getElementById('promesas-legend')?.remove();

        const div = document.createElement('div');
        div.id = 'promesas-legend';
        div.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;font-size:.82em;';

        const items = [];

        if (division === 'promesas') {
            items.push({ bg:'rgba(50,200,50,0.25)',  border:'#32C832', text:'Pos 1: ⬆️ Ascenso directo → 1ª RFEF G2' });
            items.push({ bg:'rgba(180,150,0,0.22)', border:'#B49600', text:'Pos 2-5: ⭐ Playoff → ganador sube a 1ª RFEF G1' });
        } else {
            items.push({ bg:'rgba(50,200,50,0.25)',  border:'#32C832', text:'Pos 1: ⬆️ Ascenso directo a 2ª División' });
            items.push({ bg:'rgba(180,150,0,0.22)', border:'#B49600', text:'Pos 2-5: ⭐ Playoff de ascenso' });
            items.push({ bg:'rgba(200,40,40,0.25)', border:'#C82828', text:`Pos ${total}: ⬇️ Descenso a Liga Promesas` });
        }

        items.forEach(item => {
            const s = document.createElement('span');
            s.style.cssText = `background:${item.bg};border-left:3px solid ${item.border};padding:4px 10px;border-radius:4px;color:#fff;`;
            s.textContent = item.text;
            div.appendChild(s);
        });

        const tbl = page.querySelector('table');
        if (tbl) tbl.insertAdjacentElement('afterend', div);
        else page.appendChild(div);
    }

    // ============================================================
    // PASO 3: Hook a updateStandingsColors del sistema principal
    // ============================================================
    function hookStandingsColors() {
        if (!window.CompetitionsSystem) {
            setTimeout(hookStandingsColors, 500);
            return;
        }

        const origUpdateColors = window.CompetitionsSystem.updateColors;
        window.CompetitionsSystem.updateColors = function () {
            const state = getState();
            const div = state?.division;
            if (div === 'promesas' || div === 'rfef_grupo1' || div === 'rfef_grupo2') {
                window.updateStandingsColorsPromesas();
            } else {
                origUpdateColors?.();
            }
        };

        const origOpen = window.openPage;
        if (origOpen && !window._promasasOpenPageHooked) {
            window._promasasOpenPageHooked = true;
            window.openPage = function (pageId, ...args) {
                origOpen.call(this, pageId, ...args);
                if (pageId === 'standings') {
                    setTimeout(() => {
                        const div = getState()?.division;
                        if (div === 'promesas' || div === 'rfef_grupo1' || div === 'rfef_grupo2') {
                            window.updateStandingsColorsPromesas();
                        }
                    }, 350);
                }
            };
        }

        console.log('✅ Liga Promesas: hook de colores aplicado');
    }

    // ============================================================
    // PASO 4: Playoff de ascenso desde Promesas
    // ============================================================
    function initPromasasPlayoff(myTeam, sortedAll, season) {
        const p2 = sortedAll[1]?.[0];
        const p3 = sortedAll[2]?.[0];
        const p4 = sortedAll[3]?.[0];
        const p5 = sortedAll[4]?.[0];
        const inPlayoff = [p2, p3, p4, p5].includes(myTeam);

        const po = {
            type: 'promesas',
            season,
            myTeam,
            teams: { p2, p3, p4, p5 },
            sf1: { home: p2, away: p5, played: false },
            sf2: { home: p3, away: p4, played: false },
            final: null,
            winner: null,
            myResult: inPlayoff ? 'pending' : 'not_qualified',
            simulated: false,
            phase: inPlayoff ? 'sf' : 'done'
        };
        storeP.save(po);
        return po;
    }

    function runPromasasPlayoff(myTeam) {
        let po = storeP.get();
        if (!po || po.simulated) return po;

        const myR = getMyRating();
        const fakeR = () => 55 + Math.floor(Math.random() * 15);

        const sf1 = simMatchPO(po.sf1.home, po.sf1.away, myTeam, myR, fakeR);
        po.sf1 = { ...po.sf1, ...sf1, played: true };
        const sf1Winner = sf1.winner;

        const sf2 = simMatchPO(po.sf2.home, po.sf2.away, myTeam, myR, fakeR);
        po.sf2 = { ...po.sf2, ...sf2, played: true };
        const sf2Winner = sf2.winner;

        const finalMatch = simMatchPO(sf1Winner, sf2Winner, myTeam, myR, fakeR);
        po.final = { home: sf1Winner, away: sf2Winner, ...finalMatch, played: true };
        po.winner = finalMatch.winner;

        if (myTeam === po.winner) {
            po.myResult = 'promoted_playoff';
        } else if ([sf1Winner, sf2Winner].includes(myTeam)) {
            po.myResult = 'lost_final';
        } else if ([po.sf1.home, po.sf1.away, po.sf2.home, po.sf2.away].includes(myTeam)) {
            po.myResult = 'eliminated_sf';
        }

        po.simulated = true;
        po.phase = 'done';
        storeP.save(po);
        return po;
    }

    function simMatchPO(teamA, teamB, myTeam, myRating, fakeR) {
        const rA = teamA === myTeam ? myRating : fakeR();
        const rB = teamB === myTeam ? myRating : fakeR();
        const r = simMatch(rA, rB);
        const winner = r.hg > r.ag ? teamA : r.ag > r.hg ? teamB : teamA;
        return { hg: r.hg, ag: r.ag, winner };
    }

    // ============================================================
    // PASO 5: Hook fin de temporada
    // ============================================================
    function hookEndSeason() {
        if (!window.gameLogic || window._promasasEndSeasonHooked) return;
        window._promasasEndSeasonHooked = true;

        const origSimWeek = window.simulateWeek;
        if (!origSimWeek) { setTimeout(hookEndSeason, 800); return; }

        window.simulateWeek = async function () {
            const before = getState();
            const result = await origSimWeek.apply(this, arguments);
            const after = getState();

            if (before && after && before.currentSeason !== after.currentSeason) {
                handlePromasasSeasonEnd(before, after);
            } else if (after?.division === 'promesas' && after?.seasonType === 'regular') {
                setTimeout(() => window.updateStandingsColorsPromesas?.(), 100);

                const total = after.maxSeasonWeeks || 38;
                if (after.week === total - 1) {
                    const po = storeP.get();
                    if (po && !po.simulated) {
                        const res = runPromasasPlayoff(after.team);
                        notifyPromasasPlayoff(res);
                    }
                }
            }
            return result;
        };

        console.log('✅ Liga Promesas: hook de fin de temporada aplicado');
    }

    function handlePromasasSeasonEnd(before, after) {
        const div = before.division;
        const sorted = Object.entries(before.standings || {}).sort((a, b) => {
            const dp = (b[1].pts || 0) - (a[1].pts || 0);
            if (dp !== 0) return dp;
            return ((b[1].gf || 0) - (b[1].gc || 0)) - ((a[1].gf || 0) - (a[1].gc || 0));
        });
        const myPos = sorted.findIndex(([n]) => n === before.team) + 1;
        const total = sorted.length;

        if (div === 'promesas') {
            if (myPos === 1) {
                window.gameLogic?.addNews('🏆 ¡CAMPEÓN DE LIGA PROMESAS! ¡ASCIENDES A PRIMERA RFEF GRUPO 2!', 'success');
            }
            if (myPos >= 2 && myPos <= 5) {
                setTimeout(() => {
                    storeP.clear();
                    const po = initPromasasPlayoff(before.team, sorted, after.currentSeason);
                    window.gameLogic?.addNews(`⭐ ¡Clasificado para el playoff de ascenso desde Promesas! (${myPos}º)`, 'info');
                }, 500);
            }
        } else if (div === 'rfef_grupo1' || div === 'rfef_grupo2') {
            if (myPos === total) {
                window.gameLogic?.addNews('⬇️ HAS DESCENDIDO A LIGA PROMESAS. ¡A luchar para volver!', 'error');
            }
            const descendido = sorted[total - 1]?.[0];
            if (descendido && descendido !== before.team) {
                window.gameLogic?.addNews(`⬇️ ${descendido} desciende a Liga Promesas`, 'info');
            }
        }
    }

    function notifyPromasasPlayoff(po) {
        const gl = window.gameLogic;
        if (!gl) return;
        gl.addNews(`⬆️ SF Playoff: ${po.sf1.winner} y ${po.sf2.winner} pasan a la final`, 'info');
        if (po.winner) gl.addNews(`🏆 Final Playoff Promesas: ${po.winner} asciende a 1ª RFEF Grupo 1`, 'success');

        const msgs = {
            promoted_playoff: '🎉 ¡HAS ASCENDIDO VÍA PLAYOFF A PRIMERA RFEF GRUPO 1!',
            lost_final:       '😤 Eliminado en la FINAL del playoff. Permaneces en Promesas.',
            eliminated_sf:    '😞 Eliminado en semifinales del playoff. Permaneces en Promesas.'
        };
        if (msgs[po.myResult]) {
            gl.addNews(msgs[po.myResult], po.myResult === 'promoted_playoff' ? 'success' : 'error');
        }
    }

    // ============================================================
    // PASO 6: Render del Playoff en la UI
    // ============================================================
    function renderPromasasPlayoff() {
        const panel = document.getElementById('comp-playoff-panel');
        if (!panel) return;
        const state = getState();
        if (state?.division !== 'promesas') return;

        const po = storeP.get();
        if (!po) {
            panel.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,.5)">
                <div style="font-size:2em">⭐</div>
                <div style="margin-top:10px">No hay datos de playoff todavía. Se iniciará al final de temporada.</div>
            </div>`;
            return;
        }

        const myTeam = state.team;
        const fmt = (home, away, hg, ag, winner) => {
            const meH = home === myTeam, meA = away === myTeam;
            const winH = winner === home, winA = winner === away;
            return `<div class="po-match">
                <div class="pm-title">⚽ ${po.phase === 'done' ? 'Resultado' : 'Pendiente'}</div>
                <div class="po-row ${winH ? 'winner' : winA ? 'loser' : ''}">${home}${meH ? ' ⭐' : ''} <span>${hg ?? '-'}</span></div>
                <div class="po-row ${winA ? 'winner' : winH ? 'loser' : ''}">${away}${meA ? ' ⭐' : ''} <span>${ag ?? '-'}</span></div>
                ${winner ? `<div class="po-info">Pasa: <strong>${winner}</strong></div>` : ''}
            </div>`;
        };

        let html = `<div style="padding:8px 0">
            <div style="color:#B49600;font-size:.9em;font-weight:bold;margin-bottom:10px">
                ⭐ PLAYOFF ASCENSO — Liga Promesas → 1ª RFEF
            </div>
            <div style="color:rgba(255,255,255,.6);font-size:.82em;margin-bottom:12px">
                🥇 Ganador → Primera RFEF Grupo 1 &nbsp;|&nbsp; Campeón de liga → Primera RFEF Grupo 2
            </div>
            <div class="po-wrap">`;

        html += `<div style="color:#FFD700;font-size:.85em;font-weight:bold;margin-top:6px">Semifinales</div>`;
        html += fmt(po.sf1.home, po.sf1.away, po.sf1.hg, po.sf1.ag, po.sf1.played ? po.sf1.winner : null);
        html += fmt(po.sf2.home, po.sf2.away, po.sf2.hg, po.sf2.ag, po.sf2.played ? po.sf2.winner : null);

        if (po.final) {
            html += `<div style="color:#FFD700;font-size:.85em;font-weight:bold;margin-top:10px">Final</div>`;
            html += fmt(po.final.home, po.final.away, po.final.hg, po.final.ag, po.final.played ? po.final.winner : null);
        }

        if (po.myResult && po.myResult !== 'pending' && po.myResult !== 'not_qualified') {
            const banners = {
                promoted_playoff: { bg: 'rgba(50,200,50,.2)', border: '#32C832', icon: '🎉', text: '¡HAS ASCENDIDO VÍA PLAYOFF A PRIMERA RFEF GRUPO 1!' },
                lost_final:       { bg: 'rgba(255,150,0,.15)', border: '#FF8C00', icon: '😤', text: 'Eliminado en la FINAL. Permaneces en Promesas.' },
                eliminated_sf:    { bg: 'rgba(200,40,40,.15)', border: '#C82828', icon: '😞', text: 'Eliminado en Semifinales. Permaneces en Promesas.' }
            };
            const b = banners[po.myResult];
            if (b) {
                html += `<div class="result-banner" style="background:${b.bg};border-color:${b.border};border-radius:8px;padding:14px;text-align:center;margin-top:14px;border:2px solid ${b.border}">
                    <div style="font-size:1.5em">${b.icon}</div>
                    <div style="color:#fff;font-weight:bold;margin-top:4px">${b.text}</div>
                </div>`;
            }
        }

        html += `</div></div>`;
        panel.innerHTML = html;
    }

    // ============================================================
    // PASO 7: Inyectar tab "Playoff" en clasificación
    // ============================================================
    function injectPromasasUI() {
        const state = getState();
        if (state?.division !== 'promesas') return;

        const tabPlayoff = document.getElementById('ctab-playoff');
        if (!tabPlayoff) {
            const tabs = document.getElementById('comp-tabs');
            if (tabs) {
                const btn = document.createElement('button');
                btn.className = 'ctab';
                btn.id = 'ctab-playoff';
                btn.onclick = () => window.showCompTab('playoff');
                btn.textContent = '⭐ Playoff Ascenso';
                tabs.appendChild(btn);
            }
        }

        const origShowCompTab = window.showCompTab;
        if (origShowCompTab && !window._promasasShowTabHooked) {
            window._promasasShowTabHooked = true;
            window.showCompTab = function (tab) {
                origShowCompTab(tab);
                if (tab === 'playoff' && getState()?.division === 'promesas') {
                    setTimeout(renderPromasasPlayoff, 50);
                }
            };
        }
    }

    // ============================================================
    // PASO 8: Patch del panel Admin
    // ============================================================
    function patchAdminPanel() {
        const checkAdmin = setInterval(() => {
            const select = document.getElementById('adminDivisionSelect');
            if (!select) return;
            clearInterval(checkAdmin);

            if (!select.querySelector('option[value="promesas"]')) {
                const opt = document.createElement('option');
                opt.value = 'promesas';
                opt.textContent = '🌟 Liga Promesas';
                select.appendChild(opt);
                console.log('✅ Admin: opción Liga Promesas añadida');
            }
        }, 500);

        const observer = new MutationObserver(() => {
            const select = document.getElementById('adminDivisionSelect');
            if (select && !select.querySelector('option[value="promesas"]')) {
                const opt = document.createElement('option');
                opt.value = 'promesas';
                opt.textContent = '🌟 Liga Promesas';
                select.appendChild(opt);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ============================================================
    // PASO 9: Parchar PROMOTION_RELEGATION
    // ============================================================
    function patchPromotionRelegation() {
        if (typeof PROMOTION_RELEGATION === 'undefined' && !window.PROMOTION_RELEGATION) {
            setTimeout(patchPromotionRelegation, 300);
            return;
        }
        const pr = typeof PROMOTION_RELEGATION !== 'undefined' ? PROMOTION_RELEGATION : window.PROMOTION_RELEGATION;
        if (!pr) return;

        if (!pr.promesas) {
            pr.promesas = { promote: 1, relegate: 0 };
        }
        if (pr.rfef_grupo1) pr.rfef_grupo1.relegate = 1;
        if (pr.rfef_grupo2) pr.rfef_grupo2.relegate = 1;

        console.log('✅ Liga Promesas: PROMOTION_RELEGATION actualizado');
    }

    // ============================================================
    // PASO 10: patchTeamSelectionModal (no-op, ya en index.html)
    // ============================================================
    function patchTeamSelectionModal() {
        // Nada que hacer — ya está en index.html
    }

    // ============================================================
    // PASO 11: Título dinámico en clasificación
    // ============================================================
    function patchStandingsTitle() {
        const origOpen = window.openPage;
        if (!origOpen || window._promasasTitleHooked) return;
        window._promasasTitleHooked = true;

        window.openPage = function (pageId, ...args) {
            origOpen.call(this, pageId, ...args);
            if (pageId === 'standings') {
                setTimeout(() => {
                    const div = getState()?.division;
                    if (div === 'promesas') {
                        const titleEl = document.querySelector('#standings .page-header h1, #standings h1, #standings h2');
                        if (titleEl && !titleEl.textContent.includes('Promesas')) {
                            titleEl.textContent = '🌟 Liga Promesas';
                        }
                    }
                }, 400);
            }
        };
    }

    // ============================================================
    // PASO 12: Multiplier económico
    // ============================================================
    function patchDivisionMultipliers() {
        if (window.DIVISION_MULTIPLIERS && !window.DIVISION_MULTIPLIERS.promesas) {
            window.DIVISION_MULTIPLIERS.promesas = 0.3;
        }
        if (typeof DIVISION_MULTIPLIERS !== 'undefined' && !DIVISION_MULTIPLIERS.promesas) {
            DIVISION_MULTIPLIERS.promesas = 0.3;
        }
    }

    // ============================================================
    // PASO 13: Generación de jugadores sub-15 para Liga Promesas
    // ============================================================
    function patchPromasasSquadGeneration() {
        function tryPatch() {
            if (!window.generateRealisticSquad) {
                setTimeout(tryPatch, 600);
                return;
            }
            const orig = window.generateRealisticSquad;
            window.generateRealisticSquad = async function(teamName, division) {
                if (division !== 'promesas') return orig(teamName, division);
                return generatePromasasSquad(teamName);
            };
            console.log('✅ Promesas: generateRealisticSquad parchado para jugadores sub-15');
        }
        tryPatch();

        function patchMatchEngineQuality() {
            if (!window.generateAISquad) {
                setTimeout(patchMatchEngineQuality, 800);
                return;
            }
            const origAI = window.generateAISquad;
            window.generateAISquad = async function(teamName, division) {
                if (division !== 'promesas') return origAI(teamName, division);
                return generatePromasasSquad(teamName);
            };
            console.log('✅ Promesas: generateAISquad parchado para jugadores sub-15');
        }
        patchMatchEngineQuality();
    }

    function generatePromasasSquad(teamName) {
        const ATTRS = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
        const positions = [
            'POR', 'POR',
            'DFC', 'DFC', 'DFC',
            'MC', 'MC', 'MCO', 'MCO',
            'EXT', 'EXT',
            'DC', 'DC', 'DC'
        ];

        return positions.map(position => {
            const attrs = {};
            ATTRS.forEach(attr => {
                const base = 50 + Math.floor(Math.random() * 18);
                let bonus = 0;
                if (position === 'POR' && (attr === 'CA' || attr === 'DF')) bonus = Math.floor(Math.random() * 5);
                if ((position === 'DFC') && (attr === 'EN' || attr === 'DF')) bonus = Math.floor(Math.random() * 5);
                if ((position === 'DC') && (attr === 'AT' || attr === 'EF')) bonus = Math.floor(Math.random() * 5);
                if ((position === 'MCO' || position === 'MC') && (attr === 'RE' || attr === 'MO')) bonus = Math.floor(Math.random() * 4);
                if ((position === 'EXT') && (attr === 'VE' || attr === 'AG')) bonus = Math.floor(Math.random() * 5);
                attrs[attr] = Math.min(70, base + bonus);
            });

            let overall = 58;
            if (window.POSITION_ATTRIBUTE_WEIGHTS && window.POSITION_ATTRIBUTE_WEIGHTS[position]) {
                const weights = window.POSITION_ATTRIBUTE_WEIGHTS[position];
                let sum = 0, totalW = 0;
                for (const a in weights) {
                    sum += (attrs[a] || 55) * weights[a];
                    totalW += weights[a];
                }
                overall = Math.round(sum / totalW);
            } else {
                overall = Math.round(ATTRS.reduce((s, a) => s + (attrs[a] || 55), 0) / ATTRS.length);
            }

            const age = 13 + Math.floor(Math.random() * 3);
            const potential = Math.min(95, overall + 20 + Math.floor(Math.random() * 16));

            return {
                name: generatePromasasName(),
                position,
                age,
                foot: Math.random() < 0.82 ? 'Diestro' : 'Zurdo',
                ...attrs,
                overall,
                potential,
                salary: 100,
                value: 10000,
                contractType: 'owned',
                contractYears: 1,
                releaseClause: 10000,
                currentTeam: teamName,
                club: teamName,
                matches: 0,
                form: 65 + Math.floor(Math.random() * 15),
                isInjured: false,
                weeksOut: 0,
                isSuspended: false,
                yellowCards: 0,
                redCards: 0,
                minutesPlayed: 0,
                goals: 0,
                assists: 0,
                history: []
            };
        });
    }

    const NOMS_PROM = ['Biel','Pol','Arnau','Marc','Pau','Jan','Nil','Roc','Aleix','Ferran',
        'Oriol','Guillem','Adrià','Roger','Jordi','Miquel','Sergi','David','Alex','Hugo',
        'Mario','Iker','Maicol','Vicent','Teo','Jhonefer','Ibai','Luka','Dani','Toni',
        'Xavi','Gerard','Bernat','Eric','Àlex','Unai','Aitor','Nahuel','Joel','Mikel'];
    const COGN_PROM = ['Garcia','Martínez','López','Sánchez','Fernández','González','Rodríguez',
        'Pérez','Gómez','Puig','Serra','Vila','Mas','Vidal','Font','Soler','Molina','Roca',
        'Torres','Blanco','Romero','Ferrer','Bosch','Costa','Pons','Llopis','Reyes','Moreno',
        'Castro','Ruiz','Díaz','Muñoz','Navarro','Ortiz','Delgado','Jordà','Coll','Ibáñez'];

    function generatePromasasName() {
        const nom = NOMS_PROM[Math.floor(Math.random() * NOMS_PROM.length)];
        const cog1 = COGN_PROM[Math.floor(Math.random() * COGN_PROM.length)];
        const cog2initial = COGN_PROM[Math.floor(Math.random() * COGN_PROM.length)][0];
        return `${nom} ${cog1} ${cog2initial}.`;
    }


    function blockCopaForPromesas() {
        // Ocultar tabs de Copa y Europa en la UI de clasificación cuando estamos en promesas
        setTimeout(() => {
            if (getState()?.division === 'promesas') {
                document.getElementById('ctab-copa')?.remove();
                document.getElementById('ctab-europa')?.remove();
                document.getElementById('comp-copa-panel')?.remove();
                document.getElementById('comp-europa-panel')?.remove();
            }
        }, 2500);

        // También hookear openPage para repetirlo al navegar a clasificación
        const origOpen = window.openPage;
        if (origOpen && !window._promasasCopaBlocked) {
            window._promasasCopaBlocked = true;
            const wrappedOpen = window.openPage; // puede haber sido ya wrapeado por hookStandingsColors
            window.openPage = function(pageId, ...args) {
                wrappedOpen.call(this, pageId, ...args);
                if (pageId === 'standings' && getState()?.division === 'promesas') {
                    setTimeout(() => {
                        document.getElementById('ctab-copa')?.remove();
                        document.getElementById('ctab-europa')?.remove();
                        document.getElementById('comp-copa-panel')?.remove();
                        document.getElementById('comp-europa-panel')?.remove();
                    }, 500);
                }
            };
        }
    }

    // ============================================================
    // BOOTSTRAP
    // ============================================================
    function boot() {
        console.log('🌟 injector-promesas.js v1.0 arrancando...');

        registerPromasasTeams();
        patchCompetitionConfig();
        patchPromotionRelegation();
        patchDivisionMultipliers();
        patchPromasasSquadGeneration();
        patchTeamSelectionModal();
        patchAdminPanel();
        patchStandingsTitle();
    

        // Esperar a que el sistema de competiciones esté listo
        function waitForComps() {
            if (!window.CompetitionsSystem) {
                setTimeout(waitForComps, 600);
                return;
            }
            hookStandingsColors();
            console.log('✅ Promesas: hook de colores listo');
        }
        waitForComps();

        // Esperar a que gameLogic esté listo
        function waitForGameLogic() {
            if (!window.gameLogic) {
                setTimeout(waitForGameLogic, 800);
                return;
            }
            hookEndSeason();

            const state = getState();
            if (state?.division === 'promesas') {
                setTimeout(window.updateStandingsColorsPromesas, 500);
            }
        }
        waitForGameLogic();

        // Monitorear navegación a clasificación
        document.addEventListener('click', e => {
            const btn = e.target.closest('[onclick*="standings"],.nav-item,.bottom-nav-item');
            if (btn && btn.textContent?.toLowerCase().includes('clasif')) {
                setTimeout(() => {
                    const div = getState()?.division;
                    if (div === 'promesas' || div === 'rfef_grupo1' || div === 'rfef_grupo2') {
                        window.updateStandingsColorsPromesas?.();
                        injectPromasasUI();
                    }
                }, 400);
            }
        });

        // Exponer API pública
        window.PromasasSystem = {
            getPlayoff:     storeP.get,
            clearPlayoff:   storeP.clear,
            initPlayoff:    initPromasasPlayoff,
            runPlayoff:     runPromasasPlayoff,
            renderPlayoff:  renderPromasasPlayoff,
            updateColors:   window.updateStandingsColorsPromesas,
            teams:          PROMESAS_TEAMS
        };

        console.log('✅ injector-promesas.js v1.0 listo');
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 1500));
    } else {
        setTimeout(boot, 1500);
    }

})();
