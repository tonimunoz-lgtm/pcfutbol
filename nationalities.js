// nationalities.js — nacionalidades de jugadores y plantillas extranjeras con nombres inventados (sin red ni IA).
// Todo es determinista: la misma clave (equipo, temporada, jugador) produce siempre lo mismo.
export const NATIONS = {
    ES:{n:'España',f:'🇪🇸',p:'es'}, AR:{n:'Argentina',f:'🇦🇷',p:'es'}, UY:{n:'Uruguay',f:'🇺🇾',p:'es'}, CO:{n:'Colombia',f:'🇨🇴',p:'es'},
    MX:{n:'México',f:'🇲🇽',p:'es'}, CL:{n:'Chile',f:'🇨🇱',p:'es'}, PE:{n:'Perú',f:'🇵🇪',p:'es'}, EC:{n:'Ecuador',f:'🇪🇨',p:'es'},
    PY:{n:'Paraguay',f:'🇵🇾',p:'es'}, VE:{n:'Venezuela',f:'🇻🇪',p:'es'}, BR:{n:'Brasil',f:'🇧🇷',p:'br'}, PT:{n:'Portugal',f:'🇵🇹',p:'br'},
    FR:{n:'Francia',f:'🇫🇷',p:'fr'}, BE:{n:'Bélgica',f:'🇧🇪',p:'fr'}, CI:{n:'Costa de Marfil',f:'🇨🇮',p:'af'}, SN:{n:'Senegal',f:'🇸🇳',p:'af'},
    CM:{n:'Camerún',f:'🇨🇲',p:'af'}, NG:{n:'Nigeria',f:'🇳🇬',p:'af'}, GH:{n:'Ghana',f:'🇬🇭',p:'af'}, ML:{n:'Mali',f:'🇲🇱',p:'af'},
    MA:{n:'Marruecos',f:'🇲🇦',p:'ar'}, DZ:{n:'Argelia',f:'🇩🇿',p:'ar'}, IT:{n:'Italia',f:'🇮🇹',p:'it'},
    DE:{n:'Alemania',f:'🇩🇪',p:'de'}, AT:{n:'Austria',f:'🇦🇹',p:'de'}, CH:{n:'Suiza',f:'🇨🇭',p:'de'},
    EN:{n:'Inglaterra',f:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',p:'en'}, SC:{n:'Escocia',f:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',p:'en'}, WA:{n:'Gales',f:'🏴󠁧󠁢󠁷󠁬󠁳󠁿',p:'en'}, IE:{n:'Irlanda',f:'🇮🇪',p:'en'}, US:{n:'Estados Unidos',f:'🇺🇸',p:'en'},
    NL:{n:'Países Bajos',f:'🇳🇱',p:'nl'}, TR:{n:'Turquía',f:'🇹🇷',p:'tr'}, HR:{n:'Croacia',f:'🇭🇷',p:'sl'}, RS:{n:'Serbia',f:'🇷🇸',p:'sl'},
    PL:{n:'Polonia',f:'🇵🇱',p:'sl'}, CZ:{n:'Chequia',f:'🇨🇿',p:'sl'}, UA:{n:'Ucrania',f:'🇺🇦',p:'sl'}, GR:{n:'Grecia',f:'🇬🇷',p:'sl'},
    DK:{n:'Dinamarca',f:'🇩🇰',p:'nord'}, SE:{n:'Suecia',f:'🇸🇪',p:'nord'}, NO:{n:'Noruega',f:'🇳🇴',p:'nord'}, JP:{n:'Japón',f:'🇯🇵',p:'jp'}, KR:{n:'Corea del Sur',f:'🇰🇷',p:'jp'}
};
const NAME_POOLS = {
    es:{g:'Álvaro Iván Sergio Diego Marcos Hugo Joaquín Mateo Nicolás Rubén Adrián Gonzalo Emiliano Lucas Bruno Julián Facundo Matías Santiago Ramiro',
        s:'García Fernández Rodríguez López Martínez Sánchez Pérez Gómez Ruiz Díaz Moreno Torres Navarro Romero Vega Cabrera Molina Ortega Silva Acosta Herrera Medina Rojas Suárez Benítez Paredes'},
    br:{g:'João Pedro Rafael Thiago Lucas Gabriel Mateus Bruno Vinícius Caio Diogo Rúben Tiago Gustavo Leandro Felipe Renato',
        s:'Silva Santos Oliveira Souza Pereira Costa Rodrigues Almeida Nascimento Lima Araújo Ribeiro Carvalho Gomes Martins Rocha Barbosa Teixeira Moreira Cardoso'},
    fr:{g:'Lucas Hugo Théo Louis Antoine Maxime Julien Nicolas Romain Kévin Baptiste Corentin Quentin Yanis Mathis Rayan Clément',
        s:'Martin Bernard Dubois Moreau Laurent Girard Lefèvre Roux Fournier Mercier Blanc Faure Perrin Garnier Chevalier Lambert Rolland Dumont Leclerc Vidal'},
    af:{g:'Ibrahima Moussa Kwame Samuel Emmanuel Cheikh Mamadou Yaya Kofi Idrissa Seydou Victor Chukwu Amadou Wilfried Serge',
        s:'Diallo Traoré Konaté Camara Sow Ndiaye Mensah Okafor Eze Bamba Coulibaly Touré Keita Sarr Diop Fofana Adeyemi Asante Mbeki Nkosi'},
    ar:{g:'Youssef Amine Karim Hakim Yassine Omar Bilal Sofiane Nabil Rachid Mehdi Walid Ismaïl Zakaria',
        s:'Benali Haddad Amrani Bouzid Mansouri Belhadj Ziani Cherif Tahiri Berrada Ouali Slimani Bennani Idrissi Mokhtar Saidi'},
    it:{g:'Marco Luca Matteo Andrea Federico Davide Simone Alessio Riccardo Lorenzo Giacomo Nicolò Tommaso Gianluca Stefano',
        s:'Rossi Bianchi Romano Esposito Ricci Marino Greco Conti Colombo Ferri Galli Moretti Fontana Caruso Rinaldi Lombardi Costa Bruno Gentile Vitale'},
    de:{g:'Jonas Lukas Felix Moritz Niklas Tim Leon Florian Jan Kai Maximilian Fabian Tobias Sebastian Nico Matthias',
        s:'Müller Schmidt Wagner Becker Hofmann Krämer Neumann Brandt Weber Schulz Fischer Hahn Keller Lehmann Vogel Köhler Richter Winkler Lang Berger'},
    en:{g:'Jack Harry Oliver Callum Tom Ryan Connor Declan Kieran Mason Jordan Liam Ben Josh Reece Luke Alfie Sam',
        s:'Walker Foster Bennett Hughes Carter Fletcher Barnes Hayes Wood Mills Cooper Griffiths Parker Ellis Murray Harvey Webb Palmer Douglas Spencer'},
    nl:{g:'Daan Sem Luuk Milan Tim Jesse Bram Joey Stefan Rick Thijs Noah Ruben Sven Mats Teun',
        s:'de Jong,Bakker,Visser,Smit,Meijer,de Boer,Mulder,Bos,Vos,Dekker,Peters,Hendriks,van Dijk,Jansen,Kuipers,Brouwer,Willems,Koster,Veenstra'},
    tr:{g:'Emre Burak Mehmet Can Arda Kerem Oğuz Cenk Hakan Yusuf Barış Selim Onur Serkan Tolga Berkay',
        s:'Yılmaz Kaya Demir Şahin Çelik Yıldız Aydın Öztürk Arslan Doğan Kılıç Aslan Erdoğan Polat Güneş Korkmaz Kaplan Çetin Taş Bulut'},
    sl:{g:'Marko Luka Ivan Nikola Stefan Filip Dominik Jakub Bartosz Andrej Milan Tomáš Dario Petar Mateusz Dimitri',
        s:'Novak Horvat Kovač Petrov Ivanov Nagy Kowalski Jovanović Marković Babić Lewandowski Nowak Svoboda Dvořák Kovalenko Popović Papadopoulos Stoica Tadić Wiśniewski'},
    nord:{g:'Lars Mikkel Jonas Oskar Emil Erik Anders Magnus Henrik Kasper Viktor Mats Nils Sander Jens',
        s:'Jensen Nielsen Larsen Andersen Hansen Pedersen Johansson Lindberg Olsen Berg Haugen Dahl Karlsson Eriksson Holm Lund Sørensen Nyström'},
    jp:{g:'Takumi Haruto Kaito Ren Yuto Daichi Sota Kenji Hiroshi Min-jun Seung Jae Hyun Ji-sung',
        s:'Tanaka Suzuki Takahashi Watanabe Ito Yamamoto Nakamura Kobayashi Kato Kim Lee Park Choi Jung Kang Yoon Han Shin'}
};
for (const k in NAME_POOLS) { NAME_POOLS[k].g = NAME_POOLS[k].g.split(' '); NAME_POOLS[k].s = NAME_POOLS[k].s.split(NAME_POOLS[k].s.includes(',') ? ',' : ' '); }

export function hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0; return h >>> 0; }
export function seededRandom(key) { let s = hash(key) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const pickW = (rng, entries) => { let t = entries.reduce((a, [, w]) => a + w, 0), r = rng() * t; for (const [k, w] of entries) if ((r -= w) < 0) return k; return entries[0][0]; };

// Reparto de nacionalidades para jugadores sin dato (según la división donde juegan). Los datos reales del admin siempre mandan.
const MIX = {
    primera: [['ES',58],['AR',6],['FR',4],['BR',5],['UY',3],['CO',2],['PT',2],['MA',2],['EN',2],['DE',2],['IT',1],['NL',1],['BE',1],['MX',1],['SN',1],['CI',1],['NG',1],['HR',1],['RS',1],['CL',1],['JP',1],['US',1],['TR',1],['SE',1]],
    segunda: [['ES',74],['AR',5],['CO',3],['UY',2],['FR',2],['MA',2],['BR',2],['PT',2],['VE',1],['CI',1],['SN',1],['NG',1],['EN',1],['MX',1],['PE',1],['EC',1]],
    other:   [['ES',88],['AR',3],['MA',2],['CO',1],['FR',1],['UY',1],['SN',1],['CI',1],['VE',1]]
};
export function guessNationality(key, division) {
    const mix = MIX[division] || (division === 'primera' || division === 'segunda' ? MIX[division] : MIX.other);
    return pickW(seededRandom('nat|' + key), mix);
}
// Asigna nacionalidad si falta. No sobrescribe nunca un valor válido (p. ej. el del admin).
export function ensureNationality(p, division) {
    if (!p || (p.nationality && NATIONS[p.nationality])) return p;
    p.nationality = guessNationality((p.id ?? '') + '|' + p.name + '|' + p.age, division);
    p.nationalityGuessed = true;       // marca: fue una suposición automática (el admin puede corregirla)
    return p;
}
// Persona aleatoria coherente (nombre acorde a su país). spanishName() es el generador de nombres españoles/hispanos del juego.
export function randomPerson(division, spanishName, rng = Math.random) {
    const nationality = pickW(rng, MIX[division] || MIX.other);
    const name = NATIONS[nationality].p === 'es' ? spanishName() : foreignName(nationality, rng);
    return { name, nationality };
}
export const flagOf = p => (p && NATIONS[p.nationality]?.f) || '';
export const nationName = code => NATIONS[code]?.n || code || '';

export function foreignName(country, rng) {
    const pool = NAME_POOLS[NATIONS[country]?.p] || NAME_POOLS.sl;
    return pool.g[Math.floor(rng() * pool.g.length)] + ' ' + pool.s[Math.floor(rng() * pool.s.length)];
}
// País de un club extranjero a partir de su nombre; si no se reconoce se reparte de forma estable por Europa.
const CLUB_COUNTRY = [
    [/Liverpool|Arsenal|Manchester|Chelsea|Tottenham|Newcastle|Aston Villa|West Ham|Brighton|Everton/i,'EN'],
    [/Celtic|Rangers/i,'SC'], [/München|Bayern|Leverkusen|Frankfurt|Dortmund|Leipzig|Stuttgart|Wolfsburg|Freiburg|Hoffenheim/i,'DE'],
    [/Salzburg|Sturm|LASK/i,'AT'], [/Young Boys|Basilea|Basel|Lugano/i,'CH'],
    [/Inter|Milán|Milan|Atalanta|Juventus|Napoli|Roma|Lazio|Fiorentina|Bologna|Torino/i,'IT'],
    [/PSG|Paris|Monaco|Marsella|Lyon|Lens|Lille|Niza|Rennes|Brest/i,'FR'], [/Sporting CP|Benfica|Porto|Braga|Guimar/i,'PT'],
    [/PSV|Ajax|Feyenoord|AZ |Twente/i,'NL'], [/Anderlecht|Brujas|Club Brugge|Union Saint|Gent|Genk/i,'BE'],
    [/Galatasaray|Fenerbahçe|Beşiktaş|Basaksehir/i,'TR'], [/Dinamo Zagreb|Hajduk/i,'HR'], [/Estrella Roja|Partizan|Crvena/i,'RS'],
    [/Slavia|Sparta|Plzeň|Viktoria/i,'CZ'], [/Shakhtar|Dinamo Kiev|Kiev/i,'UA'], [/Olympiacos|PAOK|AEK|Panathinaikos/i,'GR'],
    [/Copenhague|Midtjylland|Brøndby/i,'DK'], [/Malmö|Elfsborg|Häcken/i,'SE'], [/Bodø|Molde|Brann|Rosenborg/i,'NO'], [/Legia|Lech|Raków/i,'PL']
];
const FALLBACK_COUNTRIES = ['EN','DE','IT','FR','PT','NL','BE','TR','HR','CZ','DK','SE','PL','GR','AT','CH'];
export function clubCountry(team) {
    for (const [re, c] of CLUB_COUNTRY) if (re.test(team)) return c;
    return FALLBACK_COUNTRIES[hash('club|' + team) % FALLBACK_COUNTRIES.length];
}
const BENCH_POS = ['POR','DFC','DFC','LI','LD','MC','MC','EXT','DC'];
// Plantilla de un equipo extranjero: 11 titulares + 9 suplentes con nombre y nacionalidad. Estable por (equipo, temporada).
export function foreignSquad(team, rating, startingXI, seasonKey = '') {
    const rng = seededRandom('fsq|' + team + '|' + seasonKey), home = clubCountry(team), used = new Set();
    const nat = () => rng() < 0.62 ? home : pickW(rng, MIX.primera.filter(([c]) => c !== home));
    const mk = (base, pos, delta, role) => {
        const country = nat(); let name, tries = 0;
        do { name = foreignName(country, rng); } while (used.has(name) && ++tries < 20);
        used.add(name);
        const clampN = v => Math.max(20, Math.min(95, Math.round(v + delta)));
        const p = { ...base, name, position: pos, nationality: country, id: 'f_' + hash(team + '|' + seasonKey + '|' + name).toString(36) };
        for (const a of ['AT','DF','EF','VE','AG','CA','RE','MO','EN']) if (a in p) p[a] = clampN(p[a]);
        p.overall = clampN(base.overall); p.role = role; return p;
    };
    const xi = startingXI.map((b, i) => mk(b, b.position, Math.round((rng() - 0.5) * 8), 'xi'));
    const bench = startingXI.slice(0, 9).map((b, i) => mk(b, BENCH_POS[i], -4 - Math.round(rng() * 3), 'bench'));
    return xi.concat(bench);
}
if (typeof window !== 'undefined') window.PCF_NATIONS = { NATIONS, flagOf, nationName, ensureNationality, guessNationality };
