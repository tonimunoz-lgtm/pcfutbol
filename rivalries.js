// ============================================================
// rivalries.js — derbis y rivalidades históricas
// level 2 = gran derbi · level 1 = rivalidad menor. Los nombres deben coincidir con los del juego/Admin.
// Para añadir o corregir pares: edita RIVALRIES o define window.PCF_RIVALRIES = [{ a, b, name, level }] antes de cargar.
// Efectos (ver match-engine.js, weekly-ledger.js e injector-derbies.js): más faltas y tarjetas, menos ventaja del favorito,
// más taquilla y merchandising, más peso del resultado en la afición, la directiva y el vestuario.
// ============================================================
export const RIVALRIES = [
    { a: 'Real Madrid CF', b: 'FC Barcelona', name: 'El Clásico', level: 2 },
    { a: 'Real Madrid CF', b: 'Atlético de Madrid', name: 'Derbi madrileño', level: 2 },
    { a: 'Atlético de Madrid', b: 'Rayo Vallecano', name: 'Derbi madrileño', level: 1 },
    { a: 'Getafe CF', b: 'Rayo Vallecano', name: 'Derbi del sur de Madrid', level: 1 },
    { a: 'Getafe CF', b: 'Atlético de Madrid', name: 'Derbi madrileño', level: 1 },
    { a: 'Sevilla FC', b: 'Real Betis Balompié', name: 'Gran derbi sevillano', level: 2 },
    { a: 'Cádiz CF', b: 'Sevilla FC', name: 'Derbi andaluz', level: 1 },
    { a: 'Cádiz CF', b: 'Real Betis Balompié', name: 'Derbi andaluz', level: 1 },
    { a: 'Málaga CF', b: 'UD Almería', name: 'Derbi andaluz', level: 1 },
    { a: 'Athletic Club', b: 'Real Sociedad', name: 'Derbi vasco', level: 2 },
    { a: 'Athletic Club', b: 'Deportivo Alavés', name: 'Derbi vasco', level: 1 },
    { a: 'Real Sociedad', b: 'Deportivo Alavés', name: 'Derbi vasco', level: 1 },
    { a: 'Athletic Club', b: 'CA Osasuna', name: 'Derbi norteño', level: 1 },
    { a: 'Real Sociedad', b: 'CA Osasuna', name: 'Derbi norteño', level: 1 },
    { a: 'FC Barcelona', b: 'RCD Espanyol', name: 'Derbi barcelonés', level: 2 },
    { a: 'Girona FC', b: 'RCD Espanyol', name: 'Derbi catalán', level: 1 },
    { a: 'Girona FC', b: 'FC Barcelona', name: 'Derbi catalán', level: 1 },
    { a: 'CE Sabadell FC', b: 'CE Europa', name: 'Derbi catalán', level: 1 },
    { a: 'Valencia CF', b: 'Levante UD', name: 'Derbi valenciano', level: 2 },
    { a: 'Valencia CF', b: 'Villarreal CF', name: 'Derbi de la Comunitat', level: 1 },
    { a: 'Elche CF', b: 'Levante UD', name: 'Derbi de la Comunitat', level: 1 },
    { a: 'Elche CF', b: 'Valencia CF', name: 'Derbi de la Comunitat', level: 1 },
    { a: 'Celta de Vigo', b: 'Deportivo de La Coruña', name: 'Derbi gallego', level: 2 },
    { a: 'Celta de Vigo', b: 'Racing Club de Ferrol', name: 'Derbi gallego', level: 1 },
    { a: 'Deportivo de La Coruña', b: 'Racing Club de Ferrol', name: 'Derbi gallego', level: 1 },
    { a: 'Real Oviedo', b: 'Sporting de Gijón', name: 'Derbi asturiano', level: 2 },
    { a: 'UD Las Palmas', b: 'CD Tenerife', name: 'Derbi canario', level: 2 },
    { a: 'Real Zaragoza', b: 'SD Huesca', name: 'Derbi aragonés', level: 1 },
    { a: 'Real Valladolid', b: 'Burgos CF', name: 'Derbi castellano', level: 1 }
];

const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(cf|fc|ud|cd|rc|rcd|ca|sd|ce|club|de|del|la|el|balompie)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
let cache = null, cacheLen = -1;
function table() {
    const extra = (typeof window !== 'undefined' && Array.isArray(window.PCF_RIVALRIES)) ? window.PCF_RIVALRIES : [];
    if (cache && cacheLen === extra.length) return cache;
    const m = new Map();
    for (const r of [...RIVALRIES, ...extra]) { m.set(`${r.a}|${r.b}`, r); m.set(`${r.b}|${r.a}`, r); m.set(`${norm(r.a)}|${norm(r.b)}`, r); m.set(`${norm(r.b)}|${norm(r.a)}`, r); }
    cache = m; cacheLen = extra.length; return m;
}
// Devuelve { name, level } si los dos equipos son rivales; si no, null.
export function rivalryOf(x, y) {
    if (!x || !y || x === y) return null;
    const t = table();
    return t.get(`${x}|${y}`) || t.get(`${norm(x)}|${norm(y)}`) || null;
}
// Rivales de un equipo: [{ rival, name, level }]
export function rivalsOf(team) {
    const n = norm(team), out = [];
    for (const r of [...RIVALRIES, ...((typeof window !== 'undefined' && Array.isArray(window.PCF_RIVALRIES)) ? window.PCF_RIVALRIES : [])]) {
        if (r.a === team || norm(r.a) === n) out.push({ rival: r.b, name: r.name, level: r.level });
        else if (r.b === team || norm(r.b) === n) out.push({ rival: r.a, name: r.name, level: r.level });
    }
    return out;
}
