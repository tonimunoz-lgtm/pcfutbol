// ============================================================
// league-calendar.js — calendario de liga a doble vuelta sin rachas de 3 partidos seguidos en casa o fuera.
// Construcción clásica de Berger (método del círculo con un equipo fijo):
//   · Emparejamientos: cada jornada r enfrenta al equipo r con el fijo y a (r+k) con (r-k) para el resto.
//   · Localía: el equipo fijo alterna jornada a jornada; en el resto de parejas el local alterna con k.
//     Así cada equipo tiene como mucho una «rotura» (2 seguidos) cada par de jornadas y nunca 3 seguidos.
//   · Segunda vuelta: la primera con la localía invertida, empezando por la jornada 2 y cerrando con la 1
//     (así el cruce entre vueltas tampoco genera rachas de 3).
// El orden de los equipos se baraja para que cada temporada sea distinta. Con número impar se añade un «descanso».
// Sin dependencias del navegador: se puede probar en Node.
// ============================================================
export function generateLeagueCalendar(teams, rng = Math.random) {
    const numTeams = teams.length;
    if (numTeams < 2) return [];
    const slots = [...teams];
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    if (numTeams % 2 !== 0) slots.push('BYE');
    const n = slots.length, m = n - 1;           // m equipos rotatorios (impar) + 1 fijo (el último)
    const fixed = slots[m];

    const first = [];                            // primera vuelta: first[r] = [{ home, away }]
    for (let r = 0; r < m; r++) {
        const list = [];
        const fixedHome = r % 2 === 0;
        list.push(fixedHome ? { home: fixed, away: slots[r] } : { home: slots[r], away: fixed });
        for (let k = 1; k < n / 2; k++) {
            const a = slots[(r + k) % m], b = slots[(r - k + m) % m];
            list.push(k % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
        }
        first.push(list.filter(x => x.home !== 'BYE' && x.away !== 'BYE'));
    }
    const out = [];
    first.forEach((list, r) => list.forEach(x => out.push({ home: x.home, away: x.away, week: r + 1, homeGoals: null, awayGoals: null })));
    for (let r = 0; r < m; r++) {                // segunda vuelta: jornadas 2,3,…,m,1 con la localía invertida
        const src = first[(r + 1) % m];
        src.forEach(x => out.push({ home: x.away, away: x.home, week: m + r + 1, homeGoals: null, awayGoals: null }));
    }
    return out.sort((a, b) => a.week - b.week);
}
