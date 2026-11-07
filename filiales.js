// ============================================================
// filiales.js — equipos filiales (primer equipo ↔ filial)
// Normativa: un filial no puede jugar en la misma categoría que su primer equipo ni por encima.
//   · Si el filial iba a ascender a la categoría de su primer equipo (o superior), no asciende y sube otro.
//   · Si el primer equipo desciende a la categoría del filial (o éste ya coincide), el filial desciende un escalón más.
// Para añadir pares: edita FILIAL_OF (filial → primer equipo, con los nombres EXACTOS del Admin), o define
// window.PCF_FILIALES = { 'Nombre filial': 'Nombre primer equipo' } antes de cargar la partida.
// Además se detectan solos los filiales cuyo nombre es el del primer equipo + « B», « C», « II», « (Promoció)», « (Filial)»,
// « Promoción», « Atlètic»… siempre que el primer equipo exista en el juego.
// ============================================================
export const FILIAL_OF = {
    'Real Sociedad B': 'Real Sociedad',
    'Athletic Club B': 'Athletic Club',
    'Bilbao Athletic': 'Athletic Club',
    'CA Osasuna B': 'CA Osasuna',
    'CA Osasuna Promesas': 'CA Osasuna',
    'RC Celta Fortuna': 'Celta de Vigo',
    'Celta Fortuna': 'Celta de Vigo',
    'Real Madrid Castilla': 'Real Madrid CF',
    'Atlético de Madrid B': 'Atlético de Madrid',
    'Villarreal CF B': 'Villarreal CF',
    'Betis Deportivo Balompié': 'Real Betis Balompié',
    'Betis Deportivo': 'Real Betis Balompié',
    'Sevilla Atlético': 'Sevilla FC',
    'FC Barcelona Atlètic': 'FC Barcelona',
    'Barça Atlètic': 'FC Barcelona',
    'FC Barcelona B': 'FC Barcelona',
    'Valencia Mestalla': 'Valencia CF',
    'Deportivo Fabril': 'Deportivo de La Coruña',
    'RCD Espanyol B': 'RCD Espanyol',
    'RCD Espanyol (Promoció)': 'RCD Espanyol',
    'RCD Espanyol Promoció': 'RCD Espanyol',
    'Espanyol B': 'RCD Espanyol',
    'Girona FC B': 'Girona FC',
    'Getafe CF B': 'Getafe CF',
    'Rayo Majadahonda': 'Rayo Vallecano',
    'Real Valladolid Promesas': 'Real Valladolid CF',
    'Levante Atlético': 'Levante UD',
    'Málaga CF B': 'Málaga CF',
    'Sporting de Gijón B': 'Sporting de Gijón',
    'Real Oviedo Vetusta': 'Real Oviedo',
    'Deportivo Alavés B': 'Deportivo Alavés',
    'RCD Mallorca B': 'RCD Mallorca',
    'Elche Ilicitano': 'Elche CF',
    'Cádiz Mirandilla': 'Cádiz CF',
    'UD Las Palmas Atlético': 'UD Las Palmas'
};

// Nivel de cada división (1 = la más alta)
export const TIER = { primera: 1, segunda: 2, rfef_grupo1: 3, rfef_grupo2: 3, rfef: 3, promesas: 4 };

const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(cf|fc|ud|cd|rc|rcd|ca|sd|ce|club|de|del|la|el)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Devuelve { filial: primerEquipo } solo para pares en los que ambos existen en la lista de equipos dada.
export function detectFilialPairs(teamNames, extra) {
    const custom = extra || (typeof window !== 'undefined' && window.PCF_FILIALES) || {};
    const set = new Set(teamNames);
    const byNorm = new Map(teamNames.map(t => [norm(t), t]));
    const pairs = {};
    for (const [f, p] of Object.entries({ ...FILIAL_OF, ...custom })) if (set.has(f) && set.has(p) && f !== p) pairs[f] = p;
    // Nombres tipo «Club B», «Club C», «Club II», «Club (Promoció)», «Club (Filial)», «Club Promoción», «Club Atlètic»…
    const SUFFIX = /^(.*?)\s*(?:\((?:promoci[oó]n?|filial|reservas?|juvenil|b|c|ii)\)|\s(?:B|C|II|promoci[oó]n?|filial|juvenil|amateur|atl[eè]tic))$/i;
    for (const t of teamNames) {
        if (pairs[t]) continue;
        const m = String(t).match(SUFFIX);
        if (!m || !m[1]) continue;
        const parent = byNorm.get(norm(m[1]));
        if (parent && parent !== t) pairs[t] = parent;
    }
    return pairs;
}
