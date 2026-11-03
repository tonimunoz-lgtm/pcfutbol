// ============================================================
// injector-intro.js — Intro de PC Fútbol Manager
// Se carga justo al abrir <body> para tapar la pantalla principal desde el
// primer instante.
//   1. Estadio de noche: se encienden las torres de focos, flashes en la grada.
//   2. El campo se dibuja en perspectiva y entra el balón rodando.
//   3. Título cromado "PC FÚTBOL" + "MANAGER" dorado + temporada.
//   4. Marcador corrido con los equipos de Primera.
//   5. "PULSA UNA TECLA PARA EMPEZAR" (silbato + grada, generados con Web Audio).
//   6. El logo sube y el estadio queda de fondo de login / bienvenida
//      ("Conectando con el vestuario…" mientras Firebase responde) hasta que
//      empiezas o cargas una partida.
// Saltar intro · versión corta si ya se vio en esta sesión · respeta
// "reducir movimiento" del sistema.
// ============================================================
(function () {
    'use strict';
    if (window.__pcfIntro) return;
    window.__pcfIntro = true;

    const SEEN_KEY = 'pcf_intro_seen';
    const SOUND_KEY = 'pcf_intro_sound';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quick = sessionStorage.getItem(SEEN_KEY) === '1';
    const T = quick || reduced ? 0.25 : 1;              // factor de tiempo

    const css = `
    #pcfIntro{position:fixed;inset:0;z-index:200000;overflow:hidden;background:#01040c;color:#fff;
        font-family:'Saira Condensed','Arial Narrow',Arial,sans-serif;cursor:pointer;user-select:none;
        transition:opacity .7s ease}
    #pcfIntro.pcfi--backdrop{z-index:190;cursor:default}
    #pcfIntro.pcfi--out{opacity:0;pointer-events:none}
    .pcfi-sky{position:absolute;inset:0;background:
        radial-gradient(ellipse 80% 55% at 50% 38%,rgba(40,90,170,.55),transparent 70%),
        radial-gradient(ellipse 120% 80% at 50% 110%,#06240f 0%,#020a05 45%,transparent 70%),
        linear-gradient(180deg,#01040c 0%,#06142e 55%,#020a05 100%)}
    /* Torres de focos */
    .pcfi-tower{position:absolute;top:6%;width:9vw;max-width:120px;min-width:56px;aspect-ratio:3/2;
        background:repeating-linear-gradient(90deg,#1b2130 0 2px,transparent 2px 18%),#0b0f18;border:2px solid #1b2130;border-radius:3px;
        opacity:.25;transition:opacity .25s}
    .pcfi-tower::before{content:'';position:absolute;inset:8%;background:radial-gradient(circle,#fff 0 28%,transparent 32%) 0 0/25% 33%;opacity:0;transition:opacity .15s}
    .pcfi-tower::after{content:'';position:absolute;left:50%;top:60%;width:240%;height:520%;transform:translateX(-50%) rotate(var(--rot,0deg));transform-origin:top center;
        background:linear-gradient(180deg,rgba(235,245,255,.55),rgba(190,215,255,.12) 55%,transparent 85%);
        clip-path:polygon(42% 0,58% 0,100% 100%,0 100%);filter:blur(6px);opacity:0;transition:opacity .35s;mix-blend-mode:screen}
    .pcfi-tower.on{opacity:1}.pcfi-tower.on::before{opacity:1}.pcfi-tower.on::after{opacity:1}
    .pcfi-tower.flick{animation:pcfiFlick .5s steps(2) 2}
    @keyframes pcfiFlick{50%{opacity:.3}}
    .t1{left:4%;--rot:28deg}.t2{left:26%;--rot:10deg;top:2%}.t3{right:26%;--rot:-10deg;top:2%}.t4{right:4%;--rot:-28deg}
    /* Grada y flashes */
    .pcfi-stands{position:absolute;left:0;right:0;top:34%;height:22%;
        background:radial-gradient(circle,rgba(160,180,220,.22) 1px,transparent 1.6px) 0 0/7px 7px,
                   linear-gradient(180deg,rgba(10,20,40,0) 0%,rgba(10,20,40,.9) 100%);
        mask-image:linear-gradient(180deg,transparent,#000 35%);opacity:0;transition:opacity 1s}
    .pcfi-stands.on{opacity:1}
    .pcfi-flash{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 8px 3px #fff;animation:pcfiFlash .35s ease-out forwards}
    @keyframes pcfiFlash{from{opacity:1;transform:scale(1.4)}to{opacity:0;transform:scale(.4)}}
    /* Campo en perspectiva */
    .pcfi-pitchwrap{position:absolute;left:50%;bottom:-6%;width:120vw;max-width:1500px;transform:translateX(-50%);perspective:700px}
    .pcfi-pitch{display:block;width:100%;transform:rotateX(62deg);transform-origin:50% 100%;
        background:repeating-linear-gradient(90deg,#0f5a22 0 8.33%,#0c4e1d 8.33% 16.66%);border-radius:4px;
        box-shadow:0 0 120px rgba(80,200,120,.25);opacity:0;transition:opacity 1s}
    .pcfi-pitch.on{opacity:1}
    .pcfi-pitch path,.pcfi-pitch circle,.pcfi-pitch rect,.pcfi-pitch line{fill:none;stroke:rgba(255,255,255,.85);stroke-width:3;stroke-dasharray:var(--len,2000);stroke-dashoffset:var(--len,2000)}
    .pcfi-pitch.draw path,.pcfi-pitch.draw circle,.pcfi-pitch.draw rect,.pcfi-pitch.draw line{animation:pcfiDraw calc(1.4s * var(--t)) ease-out forwards}
    @keyframes pcfiDraw{to{stroke-dashoffset:0}}
    /* Balón */
    .pcfi-ball{position:absolute;left:-10%;bottom:16%;width:clamp(36px,5vw,64px);aspect-ratio:1;opacity:0}
    .pcfi-ball.roll{animation:pcfiRoll calc(1.1s * var(--t)) cubic-bezier(.2,.7,.25,1) forwards}
    .pcfi-ball svg{width:100%;height:100%;animation:pcfiSpin calc(1.1s * var(--t)) cubic-bezier(.2,.7,.25,1) forwards;filter:drop-shadow(0 8px 6px rgba(0,0,0,.6))}
    @keyframes pcfiRoll{0%{left:-10%;opacity:1}100%{left:calc(50% - clamp(18px,2.5vw,32px));opacity:1}}
    @keyframes pcfiSpin{to{transform:rotate(900deg)}}
    /* Título */
    .pcfi-title{position:absolute;left:0;right:0;top:20%;text-align:center;transition:transform .9s cubic-bezier(.6,0,.2,1),top .9s cubic-bezier(.6,0,.2,1)}
    .pcfi-t1{display:inline-block;font-weight:900;font-size:clamp(48px,11vw,170px);line-height:.9;letter-spacing:.02em;font-style:italic;
        background:linear-gradient(100deg,#ffffff 0%,#c9d6ea 38%,#5f7394 48%,#ffffff 52%,#aebdd6 62%,#ffffff 100%);background-size:250% 100%;
        -webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);
        filter:drop-shadow(0 3px 0 #0b2550) drop-shadow(0 6px 0 #071733) drop-shadow(0 14px 18px rgba(0,0,0,.7));
        opacity:0;transform:scale(2.6);filter:blur(12px)}
    .pcfi-t1.in{animation:pcfiSlam calc(.55s * var(--t)) cubic-bezier(.2,1.4,.4,1) forwards,pcfiShine 3.2s 1.2s ease-in-out infinite}
    @keyframes pcfiSlam{0%{opacity:0;transform:scale(2.6);filter:blur(12px)}100%{opacity:1;transform:scale(1);
        filter:drop-shadow(0 3px 0 #0b2550) drop-shadow(0 6px 0 #071733) drop-shadow(0 14px 18px rgba(0,0,0,.7))}}
    @keyframes pcfiShine{0%,60%{background-position:100% 0}100%{background-position:-60% 0}}
    .pcfi-t2{display:block;margin-top:.15em;font-weight:900;font-size:clamp(22px,4.4vw,66px);letter-spacing:.42em;padding-left:.42em;
        background:linear-gradient(180deg,#fff3c4 0%,#ffd24a 45%,#c98a00 55%,#ffe58a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
        filter:drop-shadow(0 3px 0 #5a3a00) drop-shadow(0 8px 12px rgba(0,0,0,.7));opacity:0;transform:translateY(20px)}
    .pcfi-t2.in{transition:opacity .5s,transform .5s cubic-bezier(.2,1.2,.4,1);opacity:1;transform:none}
    .pcfi-t3{margin-top:.9em;font-size:clamp(12px,1.5vw,20px);letter-spacing:.35em;color:#cfe0ff;text-transform:uppercase;opacity:0;transition:opacity .8s}
    .pcfi-t3.in{opacity:.9}
    .pcfi-t3 b{color:#ffd24a}
    /* Marcador corrido */
    .pcfi-ticker{position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(180deg,#14396f,#071733);
        border-top:2px solid #ffd24a;box-shadow:0 -6px 20px rgba(0,0,0,.6);overflow:hidden;opacity:0;transform:translateY(100%);transition:all .6s}
    .pcfi-ticker.in{opacity:1;transform:none}
    .pcfi-track{display:flex;gap:34px;align-items:center;height:100%;white-space:nowrap;width:max-content;animation:pcfiTick 60s linear infinite;padding-left:100vw}
    .pcfi-team{display:flex;gap:8px;align-items:center;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:15px;color:#e6eefb}
    .pcfi-team img,.pcfi-team i{width:26px;height:26px;object-fit:contain}
    .pcfi-team i{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#2a5aa0;border:1px solid #7aa0d4;font-style:normal;font-size:10px;font-weight:800}
    .pcfi-tag{color:#ffd24a;font-weight:800;letter-spacing:.12em}
    @keyframes pcfiTick{to{transform:translateX(-100%)}}
    /* Pulsa para empezar */
    .pcfi-press{position:absolute;left:0;right:0;bottom:78px;text-align:center;font-weight:800;letter-spacing:.3em;font-size:clamp(14px,1.7vw,22px);
        color:#fff;text-shadow:0 0 12px rgba(255,210,74,.8),0 2px 0 #000;opacity:0}
    .pcfi-press.in{animation:pcfiBlink 1.1s steps(1) infinite}
    @keyframes pcfiBlink{0%{opacity:1}55%{opacity:0}}
    .pcfi-status{position:absolute;left:0;right:0;top:46%;text-align:center;letter-spacing:.25em;text-transform:uppercase;font-size:14px;color:#cfe0ff;opacity:0;transition:opacity .4s}
    .pcfi-status.in{opacity:.9}
    .pcfi-status::before{content:'';display:inline-block;width:12px;height:12px;border:2px solid #ffd24a;border-top-color:transparent;border-radius:50%;margin-right:10px;vertical-align:-1px;animation:pcfiSpin 1s linear infinite}
    .pcfi-btn{position:absolute;top:14px;background:rgba(6,20,46,.6);border:1px solid rgba(122,160,212,.6);color:#e6eefb;border-radius:3px;
        padding:6px 12px;font:600 12px/1 'Saira Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;z-index:2}
    .pcfi-btn:hover{border-color:#ffd24a;color:#fff}
    .pcfi-skip{right:14px}.pcfi-sound{left:14px}
    .pcfi-whiteflash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
    .pcfi-whiteflash.go{animation:pcfiWF .6s ease-out}
    @keyframes pcfiWF{0%{opacity:.85}100%{opacity:0}}
    /* Fondo de la bienvenida */
    #pcfIntro.pcfi--backdrop .pcfi-title{top:3%;transform:scale(.5);transform-origin:50% 0}
    #pcfIntro.pcfi--backdrop .pcfi-press,#pcfIntro.pcfi--backdrop .pcfi-skip{display:none}
    #pcfIntro.pcfi--backdrop .pcfi-sky::after{content:'';position:absolute;inset:0;background:rgba(1,4,12,.35)}
    #pcfIntro.pcfi--backdrop .pcfi-ball{opacity:.0;transition:opacity .4s}
    /* Con el estadio de fondo, las ventanas de arranque no oscurecen tanto */
    body.pcfi-has-backdrop #loginModal, body.pcfi-has-backdrop #gameSelectionModal, body.pcfi-has-backdrop #gameModeModal,
    body.pcfi-has-backdrop #selectTeamModal, body.pcfi-has-backdrop #savedGamesModal { background: rgba(1,4,12,.18) !important; }
    body.pcfi-has-backdrop #loginModal > *, body.pcfi-has-backdrop #gameSelectionModal > * { margin-top: 13vh; }
    @media (max-width:640px){.pcfi-tower{top:4%}.pcfi-title{top:24%}}
    `;

    const pitchSVG = `
    <svg class="pcfi-pitch" viewBox="0 0 1050 680" preserveAspectRatio="none">
        <rect x="20" y="20" width="1010" height="640" style="--len:3300"/>
        <line x1="525" y1="20" x2="525" y2="660" style="--len:640"/>
        <circle cx="525" cy="340" r="92" style="--len:580"/>
        <rect x="20" y="158" width="165" height="364" style="--len:1060"/>
        <rect x="865" y="158" width="165" height="364" style="--len:1060"/>
        <rect x="20" y="248" width="55" height="184" style="--len:480"/>
        <rect x="975" y="248" width="55" height="184" style="--len:480"/>
        <path d="M185 282 A92 92 0 0 1 185 398" style="--len:150"/>
        <path d="M865 282 A92 92 0 0 0 865 398" style="--len:150"/>
    </svg>`;
    const ballSVG = `
    <svg viewBox="0 0 100 100"><defs><radialGradient id="pcfiBallG" cx="35%" cy="30%" r="75%">
        <stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#dfe6ef"/><stop offset="1" stop-color="#8b98aa"/></radialGradient></defs>
        <circle cx="50" cy="50" r="47" fill="url(#pcfiBallG)" stroke="#2a2f38" stroke-width="2"/>
        <polygon points="50,30 66,42 60,61 40,61 34,42" fill="#1c2230"/>
        <path d="M50 30 L50 4 M66 42 L91 34 M60 61 L76 84 M40 61 L24 84 M34 42 L9 34" stroke="#1c2230" stroke-width="3"/>
        <polygon points="50,4 62,8 50,14 38,8" fill="#1c2230"/><polygon points="91,34 95,48 86,46 84,36" fill="#1c2230"/>
        <polygon points="9,34 16,36 14,46 5,48" fill="#1c2230"/><polygon points="76,84 66,92 64,84 72,78" fill="#1c2230"/>
        <polygon points="24,84 28,78 36,84 34,92" fill="#1c2230"/></svg>`;

    const root = document.createElement('div');
    root.id = 'pcfIntro';
    root.style.setProperty('--t', T);
    root.innerHTML = `<style>${css}</style>
        <div class="pcfi-sky"></div>
        <div class="pcfi-tower t1"></div><div class="pcfi-tower t2"></div><div class="pcfi-tower t3"></div><div class="pcfi-tower t4"></div>
        <div class="pcfi-stands"></div>
        <div class="pcfi-pitchwrap">${pitchSVG}</div>
        <div class="pcfi-ball">${ballSVG}</div>
        <div class="pcfi-title">
            <div class="pcfi-t1">PC FÚTBOL</div>
            <span class="pcfi-t2">MANAGER</span>
            <div class="pcfi-t3">Temporada <b>2026/27</b> · Primera · Segunda · Primera RFEF</div>
        </div>
        <div class="pcfi-status">Conectando con el vestuario…</div>
        <div class="pcfi-press">PULSA UNA TECLA PARA EMPEZAR</div>
        <div class="pcfi-ticker"><div class="pcfi-track"></div></div>
        <button class="pcfi-btn pcfi-sound" type="button" title="Sonido de la intro"></button>
        <button class="pcfi-btn pcfi-skip" type="button">Saltar intro ▸</button>
        <div class="pcfi-whiteflash"></div>`;
    (document.body || document.documentElement).appendChild(root);

    const $ = s => root.querySelector(s);
    const later = (ms, fn) => setTimeout(fn, ms * T);
    let phase = 'intro';     // intro → ready → backdrop → out
    const timers = [];
    const at = (ms, fn) => timers.push(later(ms, fn));

    // ── Sonido (Web Audio, sin ficheros) ─────────────────────────
    let soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
    const soundBtn = $('.pcfi-sound');
    const paintSound = () => { soundBtn.textContent = soundOn ? '🔊 Sonido' : '🔇 Sonido'; };
    paintSound();
    soundBtn.addEventListener('click', e => {
        e.stopPropagation();
        soundOn = !soundOn;
        localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
        paintSound();
    });
    function playKickoff() {
        if (!soundOn) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = new AC();
            const now = ctx.currentTime;
            // Silbato: dos pitidos con vibrato
            [[0, .28], [.36, .62]].forEach(([s, e]) => {
                const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
                o.type = 'square'; o.frequency.value = 2850;
                lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency);
                g.gain.setValueAtTime(0, now + s); g.gain.linearRampToValueAtTime(.07, now + s + .02);
                g.gain.setValueAtTime(.07, now + e - .04); g.gain.linearRampToValueAtTime(0, now + e);
                const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2900; bp.Q.value = 6;
                o.connect(bp); bp.connect(g); g.connect(ctx.destination);
                o.start(now + s); lfo.start(now + s); o.stop(now + e + .05); lfo.stop(now + e + .05);
            });
            // Grada: ruido filtrado que crece y se apaga
            const len = 3.2, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900));
            const src = ctx.createBufferSource(); src.buffer = buf;
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
            const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + .5); g.gain.linearRampToValueAtTime(.16, now + 1.2); g.gain.linearRampToValueAtTime(0, now + .5 + len);
            src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ctx.destination);
            src.start(now + .5);
            setTimeout(() => ctx.close && ctx.close(), (len + 1) * 1000);
        } catch (e) { /* sin audio */ }
    }

    // ── Flashes de la grada ──────────────────────────────────────
    let flashTimer = null;
    function startFlashes() {
        const stands = $('.pcfi-stands');
        flashTimer = setInterval(() => {
            if (phase === 'out') return;
            for (let i = 0; i < 2; i++) {
                const f = document.createElement('div');
                f.className = 'pcfi-flash';
                f.style.left = (Math.random() * 100) + '%';
                f.style.top = (20 + Math.random() * 70) + '%';
                stands.appendChild(f);
                setTimeout(() => f.remove(), 400);
            }
        }, 180);
    }

    // ── Marcador corrido con los equipos ─────────────────────────
    function buildTicker() {
        const track = $('.pcfi-track');
        const teams = (window.TEAMS_DATA && window.TEAMS_DATA.primera) || [
            'Real Madrid CF', 'FC Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal CF', 'Real Betis Balompié',
            'Real Sociedad', 'Valencia CF', 'Celta de Vigo', 'Sevilla FC', 'CA Osasuna', 'Getafe CF', 'Rayo Vallecano',
            'RCD Espanyol', 'Deportivo Alavés', 'Elche CF', 'Levante UD', 'Racing de Santander', 'Deportivo de La Coruña', 'Málaga CF'];
        const file = { 'FC Barcelona': 'escudobarcelona', 'Athletic Club': 'escudoatletic', 'Atlético de Madrid': 'escudoatletico', 'Deportivo Alavés': 'escudoalaves' };
        const logoOf = t => {
            try { const d = JSON.parse(localStorage.getItem('team_data_' + t) || 'null'); if (d && d.logo) return d.logo; } catch (e) { /* */ }
            return file[t] ? `assets/escudos/${file[t]}.png` : null;
        };
        const initials = t => t.replace(/^(FC|CF|CA|RCD|UD|SD|CD|RC|Real|Club)\s+/i, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const one = teams.map(t => {
            const l = logoOf(t);
            return `<span class="pcfi-team">${l ? `<img src="${l}" alt="">` : `<i>${initials(t)}</i>`}${t}</span>`;
        }).join('');
        track.innerHTML = `<span class="pcfi-tag">⚽ PRIMERA DIVISIÓN 2026/27</span>${one}<span class="pcfi-tag">⚽ ¡QUE EMPIECE LA TEMPORADA!</span>${one}`;
    }

    // ── Escena ───────────────────────────────────────────────────
    function play() {
        const towers = [...root.querySelectorAll('.pcfi-tower')];
        towers.forEach((tw, i) => at(250 + i * 280, () => { tw.classList.add('on', 'flick'); }));
        at(900, () => { $('.pcfi-stands').classList.add('on'); startFlashes(); });
        at(1300, () => { $('.pcfi-pitch').classList.add('on', 'draw'); });
        at(2400, () => { $('.pcfi-ball').classList.add('roll'); });
        at(3300, () => { $('.pcfi-t1').classList.add('in'); });
        at(3750, () => { $('.pcfi-t2').classList.add('in'); });
        at(4200, () => { $('.pcfi-t3').classList.add('in'); });
        at(4500, () => { buildTicker(); $('.pcfi-ticker').classList.add('in'); });
        at(5100, ready);
    }
    function ready() {
        if (phase !== 'intro') return;
        phase = 'ready';
        $('.pcfi-press').classList.add('in');
    }
    function skipToReady() {
        timers.forEach(clearTimeout);
        root.querySelectorAll('.pcfi-tower').forEach(t => t.classList.add('on'));
        $('.pcfi-stands').classList.add('on'); if (!flashTimer) startFlashes();
        $('.pcfi-pitch').classList.add('on'); root.style.setProperty('--t', 0.01); $('.pcfi-pitch').classList.add('draw');
        $('.pcfi-ball').classList.add('roll');
        ['.pcfi-t1', '.pcfi-t2', '.pcfi-t3'].forEach(s => $(s).classList.add('in'));
        if (!$('.pcfi-track').children.length) buildTicker();
        $('.pcfi-ticker').classList.add('in');
        phase = 'intro'; ready();
    }

    // ── Pasar a fondo de la bienvenida ───────────────────────────
    function start() {
        if (phase === 'intro') { skipToReady(); return; }   // primer toque: saltar a la portada completa
        if (phase !== 'ready') return;
        phase = 'backdrop';
        sessionStorage.setItem(SEEN_KEY, '1');
        playKickoff();
        $('.pcfi-whiteflash').classList.add('go');
        root.classList.add('pcfi--backdrop');
        document.body.classList.add('pcfi-has-backdrop');
        watchForGame();
    }
    $('.pcfi-skip').addEventListener('click', e => { e.stopPropagation(); skipToReady(); });
    root.addEventListener('click', start);
    const onKey = e => { if (phase === 'intro' || phase === 'ready') { e.preventDefault(); start(); } };
    window.addEventListener('keydown', onKey);

    // Ventanas que se muestran sobre el estadio (login, bienvenida, elegir equipo…)
    const MODAL_IDS = ['loginModal', 'gameSelectionModal', 'gameModeModal', 'selectTeamModal', 'savedGamesModal',
        'pmInitialModal', 'pmOfferModal', 'pmWaitingModal', 'pmFiredModal'];
    function anyStartModalOpen() {
        return MODAL_IDS.some(id => {
            const m = document.getElementById(id);
            if (!m) return false;
            if (m.classList.contains('active')) return true;
            const d = m.style.display;
            if (d && d !== 'none') return true;
            // Ventanas de la carrera: se crean al abrirse y se borran al cerrarse
            return id.startsWith('pm') && getComputedStyle(m).display !== 'none';
        });
    }
    function gameStarted() {
        try { const s = window.gameLogic && window.gameLogic.getGameState(); return !!(s && s.team); } catch (e) { return false; }
    }
    function watchForGame() {
        const status = $('.pcfi-status');
        let idleSince = null;
        const iv = setInterval(() => {
            const modal = anyStartModalOpen();
            const started = gameStarted();
            if (started && !modal) {
                clearInterval(iv);
                finish();
                return;
            }
            // Sin ventana abierta ni partida (p. ej. cerraste "Cargar partida" sin partidas):
            // tras un momento, volver a mostrar las opciones en lugar de quedarse esperando
            if (!modal && !started) {
                idleSince = idleSince || Date.now();
                const user = window.currentUser;
                if (Date.now() - idleSince > 900) {
                    if (user && typeof window.showGameSelectionModal === 'function') {
                        window.showGameSelectionModal();
                        idleSince = null;
                    } else if (user === null && document.getElementById('loginModal')) {
                        document.getElementById('loginModal').classList.add('active');
                        idleSince = null;
                    }
                }
            } else {
                idleSince = null;
            }
            // "Conectando…" solo mientras se comprueba la sesión
            status.classList.toggle('in', !modal && !started && window.currentUser === undefined);
        }, 300);
    }
    function finish() {
        if (phase === 'out') return;
        phase = 'out';
        window.removeEventListener('keydown', onKey);
        root.classList.add('pcfi--out');
        document.body.classList.remove('pcfi-has-backdrop');
        setTimeout(() => { clearInterval(flashTimer); root.remove(); }, 800);
    }
    window.pcfIntro = { skip: skipToReady, start, finish };

    if (reduced) skipToReady(); else play();
})();
