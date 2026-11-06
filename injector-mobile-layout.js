// Mobile presentation only. Uses the original controls and never writes gameState.
(function () {
    'use strict';
    const media = window.matchMedia('(max-width:767px), (max-height:500px) and (max-width:1100px)');
    const header = document.querySelector('.header');
    const row = document.querySelector('.main-center-row');
    if (!header || !row) return;
    const rowAnchor = document.createComment('desktop advance row');
    row.before(rowAnchor);
    const actions = document.createElement('div');
    actions.id = 'pcfMobileActions';
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Opciones de partida');
    actions.hidden = true;
    header.appendChild(actions);
    header.querySelectorAll(':scope > .header-info')[1]?.classList.add('pcf-header-stats');
    const controls = [['.load-btn','Cargar partida'],['.save-btn','Guardar partida'],['.exit-btn','Nueva partida']].map(([selector,label]) => {
        const button = row.querySelector(selector);
        if (!button) return null;
        const anchor = document.createComment('desktop '+selector);
        button.before(anchor);
        button.title = label;
        button.setAttribute('aria-label', label);
        return {button,anchor};
    }).filter(Boolean);
    const advance = row.querySelector('.simulate-btn');
    const advanceLabel = document.createElement('span');
    advanceLabel.className = 'pcf-advance-label';
    if (advance) {
        // Keep the existing icon and the original onclick (SimGuard observes it).
        [...advance.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => n.remove());
        advanceLabel.textContent = 'Seguir';
        advance.appendChild(advanceLabel);
    }
    let frame = 0, previousMode = null;
    function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
    function shortSeason(season) { return String(season || '').replace(/\b\d{2}(\d{2})\b/g,'$1'); }
    function money(value, compact) {
        const n = Number(value) || 0;
        const format = (v, digits) => v.toLocaleString('es-ES',{maximumFractionDigits:digits});
        if (!compact) return format(n,0)+'€';
        if (Math.abs(n) >= 1e9) return format(n/1e9,1)+' mil M€';
        if (Math.abs(n) >= 1e5) return format(n/1e6,1)+' M€';
        if (Math.abs(n) >= 1e3) return format(n/1e3,1)+' mil €';
        return format(n,0)+' €';
    }
    function nextAction(state) {
        if (!state?.team) return {label:'Seguir',date:'Próximo partido',teams:'Selecciona un equipo'};
        if (state.seasonType === 'preseason') return {label:'Avanzar semana',date:'Pretemporada · Semana '+state.week,teams:'Preparación de la temporada'};
        if (state.seasonType === 'playoff') return {label:'Jugar playoff'};
        const comp = state.competitions || {};
        const cal = window.CupMatches?.getCalendar?.() || state.cupData?.calendar || [];
        const pending = cal.find(m => !m.played && !m.eliminated && !m.locked && m.afterLigaWeek <= state.week &&
            (m.type === 'copa' ? !['eliminated','champion'].includes(comp.copaPhase)
                : !(m.isKnockout || m.isPlayoff) || comp.europeanPhase !== 'eliminated'));
        if (pending) {
            const names = {copa:'Copa del Rey',champions:'Champions League',europaLeague:'Europa League',conferenceLague:'Conference League'};
            return {label:pending.type==='copa'?'Jugar Copa':'Jugar Europa',date:names[pending.type] || 'Competición',
                teams:(pending.opponent || 'Rival por sortear')+' · '+(pending.isFinal?'Final':pending.isHome?'En casa':'Fuera')};
        }
        const match = (state.seasonCalendar || []).find(m => m.week === state.week && (m.home === state.team || m.away === state.team));
        if (match) return {label:'Jugar partido',date:'Liga · Jornada '+state.week,
            teams:(match.home === state.team ? match.away : match.home)+' · '+(match.home === state.team?'En casa':'Fuera')};
        return {label:'Avanzar semana',date:'Temporada '+shortSeason(state.currentSeason),teams:'Sin partido de liga pendiente'};
    }
    function wrapTables() {
        document.querySelectorAll('.quadrant .menu-button').forEach(button => {
            [...button.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).forEach(node => {
                const label = document.createElement('span');
                label.className = 'pcf-menu-label'; label.textContent = node.textContent.trim();
                node.replaceWith(label);
            });
        });
        if (media.matches) {
            document.querySelectorAll('.page table, .modal table').forEach(table => {
                if (table.parentElement?.classList.contains('pcf-table-scroll')) return;
                const wrap = document.createElement('div');
                wrap.className = 'pcf-table-scroll';
                wrap.tabIndex = 0;
                wrap.setAttribute('role','region');
                wrap.setAttribute('aria-label','Tabla: desliza para ver todas las columnas');
                table.before(wrap);
                wrap.appendChild(table);
            });
            document.querySelectorAll('section:has([data-action="counter"])').forEach(section => section.classList.add('pcf-mobile-board'));
        } else {
            document.querySelectorAll('.pcf-table-scroll').forEach(wrap => wrap.replaceWith(...wrap.childNodes));
            document.querySelectorAll('.pcf-mobile-board').forEach(section => section.classList.remove('pcf-mobile-board'));
        }
    }
    function sync() {
        frame = 0;
        const mobile = media.matches;
        if (mobile !== previousMode) {
            controls.forEach(({button,anchor}) => mobile ? actions.appendChild(button) : anchor.after(button));
            if (mobile) document.querySelector('.main-layout > .top-right')?.after(row);
            else rowAnchor.after(row);
            actions.hidden = !mobile;
            previousMode = mobile;
            if (!mobile) window.updateNextMatchInfo?.();
        }
        const state = window.gameLogic?.getViewState?.();
        if (state) {
            const week = document.getElementById('weekNo'), balance = document.getElementById('balanceDisplay');
            const season = String(state.currentSeason || '');
            text(week, mobile ? 'J'+state.week+' · '+shortSeason(season) : state.week+' ('+season+')');
            if (week) week.title = 'Jornada '+state.week+' · Temporada '+season;
            text(balance,money(state.balance,mobile));
            if (balance) { balance.title = money(state.balance,false); balance.setAttribute('aria-label','Dinero: '+money(state.balance,false)); }
            if (advance) {
                const next = mobile ? nextAction(state) : {label:'Seguir'};
                text(advanceLabel,next.label);
                advance.title = next.label;
                if (mobile && next.date) text(document.getElementById('nextMatchDate'),next.date);
                if (mobile && next.teams) text(document.getElementById('nextMatchTeams'),next.teams);
            }
        }
        document.querySelectorAll('#adminButton, #logoutButton').forEach(button => {
            if (!button.getAttribute('aria-label')) button.setAttribute('aria-label',button.id==='adminButton'?'Administración':'Cerrar sesión');
            if (!button.title) button.title=button.getAttribute('aria-label');
        });
        wrapTables();
        const height = Math.ceil(header.getBoundingClientRect().height)+'px';
        if (document.documentElement.style.getPropertyValue('--pcf-header-h') !== height)
            document.documentElement.style.setProperty('--pcf-header-h',height);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
    // Observe text/added components, not attributes (other skins also observe them).
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
    if (media.addEventListener) media.addEventListener('change',schedule); else media.addListener(schedule);
    window.addEventListener('resize',schedule);
    window.addEventListener('pcf:state-replaced',schedule);
    window.addEventListener('pcf:news-changed',schedule);
    if (typeof ResizeObserver === 'function') new ResizeObserver(schedule).observe(header);
    window.pcfMobileUI = {refresh:schedule};
    schedule();
})();
