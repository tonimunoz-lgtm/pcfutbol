// ============================================================
// injector-leagues.js
// Estructura de ligas editable desde el panel de Admin.
//
// - Guarda qué equipos hay en cada división y el nombre visible
//   de cada división en Firestore (colección teams_data, documento
//   especial "__leagues__") y en localStorage como copia.
// - Al arrancar, sustituye window.TEAMS_DATA por esa estructura, así
//   que la selección de equipo, los calendarios, ascensos/descensos
//   y ofertas usan los equipos que hayas definido en el Admin.
// - Las CLAVES de división (primera, segunda, rfef_grupo1...) no se
//   pueden cambiar porque la lógica del juego depende de ellas; sí su
//   nombre visible.
// ============================================================
(function () {
    'use strict';

    const DOC_ID = '__leagues__';
    const LS_KEY = 'pcf_leagues_config';

    const DEFAULT_NAMES = {
        primera: 'Primera División',
        segunda: 'Segunda División',
        rfef_grupo1: 'Primera RFEF Grupo 1',
        rfef_grupo2: 'Primera RFEF Grupo 2',
        promesas: '🌟 Liga Promesas'
    };
    // Orden en que se muestran las divisiones
    const ORDER = ['primera', 'segunda', 'rfef_grupo1', 'rfef_grupo2', 'promesas'];
    // Ids de las listas del modal "Selecciona tu equipo" (index.html)
    const SELECT_LIST_IDS = {
        primera: 'primeraList', segunda: 'segundaList',
        rfef_grupo1: 'rfef_grupo1List', rfef_grupo2: 'rfef_grupo2List',
        promesas: 'promasasList'
    };

    let defaults = null;   // copia de TEAMS_DATA original (config.js)
    let current = null;    // configuración aplicada

    const clone = (o) => JSON.parse(JSON.stringify(o));
    const uniq = (arr) => [...new Set((arr || []).map((t) => String(t || '').trim()).filter(Boolean))];

    function waitFor(cond, timeout = 20000) {
        return new Promise((resolve) => {
            const t0 = Date.now();
            (function check() {
                if (cond()) return resolve(true);
                if (Date.now() - t0 > timeout) return resolve(false);
                setTimeout(check, 150);
            })();
        });
    }

    function buildFromTeamsData() {
        const divisions = {};
        const keys = Object.keys(window.TEAMS_DATA || {});
        sortKeys(keys).forEach((k) => {
            divisions[k] = { name: DEFAULT_NAMES[k] || k, teams: uniq(window.TEAMS_DATA[k]) };
        });
        return { type: 'leagues', version: 1, updatedAt: null, divisions };
    }

    function sortKeys(keys) {
        return [...keys].sort((a, b) => {
            const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        });
    }

    function normalize(cfg) {
        const base = current ? clone(current) : buildFromTeamsData();
        if (!cfg || typeof cfg !== 'object' || !cfg.divisions) return base;
        Object.entries(cfg.divisions).forEach(([key, div]) => {
            if (!div) return;
            base.divisions[key] = {
                name: String(div.name || base.divisions[key]?.name || DEFAULT_NAMES[key] || key),
                teams: uniq(div.teams)
            };
        });
        base.updatedAt = cfg.updatedAt || base.updatedAt || null;
        return base;
    }

    // Aplica la configuración al juego (sin guardar)
    function apply(cfg) {
        if (!window.TEAMS_DATA) return;
        current = normalize(cfg);
        Object.entries(current.divisions).forEach(([key, div]) => {
            // Se asigna un array NUEVO: una partida en curso conserva su liga
            window.TEAMS_DATA[key] = [...div.teams];
        });
        updateSelectTeamTitles();
        document.dispatchEvent(new CustomEvent('pcf:leagues-changed', { detail: clone(current) }));
    }

    function updateSelectTeamTitles() {
        if (!current) return;
        Object.entries(SELECT_LIST_IDS).forEach(([key, id]) => {
            const list = document.getElementById(id);
            const h2 = list && list.previousElementSibling;
            if (h2 && h2.tagName === 'H2' && current.divisions[key]) {
                h2.textContent = current.divisions[key].name;
            }
        });
    }

    async function save(cfg) {
        const toSave = normalize(cfg || current);
        toSave.updatedAt = Date.now();
        apply(toSave);
        try { localStorage.setItem(LS_KEY, JSON.stringify(current)); } catch (e) { /* lleno */ }
        if (typeof window.saveTeamDataToFirebase === 'function') {
            const r = await window.saveTeamDataToFirebase(DOC_ID, clone(current));
            if (r && r.success === false) return { success: false, error: r.error || 'Error guardando en Firebase' };
        }
        return { success: true };
    }

    async function loadRemote() {
        if (typeof window.getTeamDataFromFirebase !== 'function') return null;
        try {
            if (window.authReadyPromise) await window.authReadyPromise;
            const r = await window.getTeamDataFromFirebase(DOC_ID);
            return r && r.success && r.data && r.data.divisions ? r.data : null;
        } catch (e) {
            return null;
        }
    }

    // ── API pública ──────────────────────────────────────────
    window.pcfLeagues = {
        DOC_ID,
        get: () => clone(current || buildFromTeamsData()),
        getDefaults: () => clone(defaults || buildFromTeamsData()),
        keys: () => sortKeys(Object.keys((current || buildFromTeamsData()).divisions)),
        name: (key) => (current?.divisions[key]?.name) || DEFAULT_NAMES[key] || key,
        teams: (key) => [...((current?.divisions[key]?.teams) || window.TEAMS_DATA?.[key] || [])],
        findDivision(team) {
            const cfg = current || buildFromTeamsData();
            return Object.keys(cfg.divisions).find((k) => cfg.divisions[k].teams.includes(team)) || null;
        },
        allTeams() {
            const cfg = current || buildFromTeamsData();
            return uniq(Object.values(cfg.divisions).flatMap((d) => d.teams));
        },
        apply,
        save,
        async reload() { const remote = await loadRemote(); if (remote) apply(remote); return this.get(); },
        async resetToDefaults() { return save(clone(defaults)); },
        isLeaguesDoc: (id) => id === DOC_ID
    };

    // ── Arranque ─────────────────────────────────────────────
    (async function init() {
        // TEAMS_DATA lo expone el <script type="module"> de index.html
        const ok = await waitFor(() => window.TEAMS_DATA && window.TEAMS_DATA.primera);
        if (!ok) { console.warn('[Leagues] TEAMS_DATA no disponible'); return; }
        // Liga Promesas la añade su propio injector: le damos un momento
        await waitFor(() => window.TEAMS_DATA.promesas, 3000);

        defaults = buildFromTeamsData();
        current = clone(defaults);

        // 1) Copia local: inmediata
        try {
            const local = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
            if (local && local.divisions) apply(local);
        } catch (e) { /* ignorar */ }

        // 2) Firestore: la fuente de verdad
        const remote = await loadRemote();
        if (remote) {
            apply(remote);
            try { localStorage.setItem(LS_KEY, JSON.stringify(current)); } catch (e) { /* ignorar */ }
            console.log('[Leagues] Estructura de ligas cargada desde Firebase ✓');
        }
    })();

    // El modal de selección de equipo se re-renderiza: mantener títulos
    document.addEventListener('click', () => setTimeout(updateSelectTeamTitles, 0), true);
})();
