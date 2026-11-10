# Iconos del menú — prompts y nombres de fichero

El menú muestra los iconos **grandes y sobresaliendo** del botón o de la placa (≈ 40–75 px en pantalla). Para sustituirlos basta con
guardar cada imagen con **el nombre exacto** indicado (WebP con fondo transparente, 256×256 o 512×512). No hay que tocar código.

## Cómo conseguirlos con el menor trabajo
La IA no suele dar fondo transparente fiable ni un estilo idéntico si se pide icono a icono. Lo más seguro: **una hoja con todos los iconos
sobre fondo magenta liso** (así el estilo es coherente) y yo la corto, quito el fondo, la paso a WebP y pongo cada nombre.

### Hoja A — 16 iconos del menú (cuadrícula 4 × 4, 2048 × 2048)
```
A clean sprite sheet of 16 glossy 3D game-UI icons for a football manager game, arranged in a perfect 4x4 grid, each icon centered in its own
equal square cell and filling about 80% of the cell, with clear empty space between icons so none touch or overlap. Same art style for all:
polished mobile-game 3D cartoon rendering, rich saturated colors, soft top-left key light, strong specular highlights, a thin dark-navy outline,
slight 3/4 perspective. Each icon is ONE object, no characters' faces in detail, no text, no letters, no numbers, no logos, no frames, no buttons,
no labels, no shadows on the ground. Background: FLAT SOLID PURE MAGENTA (#FF00FF) everywhere, no gradient, no texture; do not use magenta or pink inside the icons.
Row 1: a folded newspaper with a blue header and a small photo; a golden trophy cup; a wall calendar with red top rings and a football on one day; a bar chart with orange, blue and green bars.
Row 2: a green tactical board with white player dots on a pitch; a clipboard with a tactics diagram; a magnifying glass over a blue-and-white jersey; a dumbbell with a stopwatch and two traffic cones.
Row 3: a player silhouette in a blue-and-white striped jersey with a green plus badge; a group of three players in blue jerseys; two hands in a firm handshake; a young player with a small green seedling and a football.
Row 4: a floodlit football stadium seen from above at an angle; a wooden judge's gavel; a stack of gold coins with a banknote; two business people in suits, one with a tie.
```

### Hoja B — 10 iconos de interfaz (cuadrícula 4 × 3, 2048 × 1536)
```
Same style, same rules, same magenta background, a sprite sheet of 10 icons in a 4x3 grid (last two cells empty), each centered and ~80% of its cell:
a newspaper with a small globe; a blue-and-white striped football jersey; a firm handshake with two circular arrows around it; an orange leather briefcase with a football badge;
a cloud with a down arrow; a floppy disk with a football; a game controller; a fast-forward double-arrow in a green circle; a metal gear; an open door with an exit arrow.
```

## Orden → nombre de fichero
| Hoja A (de izquierda a derecha, de arriba a abajo) | Fichero (`assets/iconos/`) | Pantalla |
|---|---|---|
| 1 periódico | `noticias.webp` | Noticias |
| 2 trofeo | `podio.webp` | Clasificación |
| 3 calendario | `calendario.webp` | Calendario |
| 4 gráfico de barras | `marcador.webp` | Resultados |
| 5 pizarra táctica | `alineacion.webp` | Alineación |
| 6 carpeta con táctica | `tactica.webp` | Táctica |
| 7 lupa sobre camiseta | `rival.webp` | Ver rival |
| 8 mancuerna | `entrenamiento.webp` | Entrenamiento |
| 9 jugador con «+» | `fichar.webp` | Fichar |
| 10 grupo de jugadores | `plantilla.webp` | Plantilla |
| 11 apretón de manos | `negociaciones.webp` | Negociaciones |
| 12 joven con brote | `cantera.webp` | Cantera |
| 13 estadio | `estadio.webp` | Estadio |
| 14 mazo de juez | `entradas.webp` | Decisiones |
| 15 monedas | `caja.webp` | Caja |
| 16 dos personas | `empleados.webp` | Empleados |

| Hoja B | Fichero (`assets/iconos/ui/`) | Dónde |
|---|---|---|
| 1 periódico con globo | `seccion-informacion.webp` | Placa «Información» |
| 2 camiseta | `seccion-equipo.webp` | Placa «Equipo» |
| 3 apretón con flechas | `seccion-fichajes.webp` | Placa «Fichajes» |
| 4 maletín | `seccion-gestion.webp` | Placa «Gestión» |
| 5 nube | `boton-cargar.webp` | Cargar juego |
| 6 disquete | `boton-guardar.webp` | Guardar |
| 7 mando | `boton-nuevo.webp` | Nuevo juego |
| 8 doble flecha | `boton-seguir.webp` | Seguir |
| 9 engranaje | `boton-admin.webp` | Admin |
| 10 puerta | `boton-salir.webp` | Salir |

Opcional (no existe en el juego todavía): un icono «Cesiones» (dos flechas verde y azul en sentido contrario) para un futuro acceso a cesiones.

## Si las generas una a una
Usa este mismo estilo para cada una (y pide **fondo transparente**, formato PNG, 1024 × 1024, objeto centrado ocupando el 85 %, sin sombra en el suelo):
`glossy 3D game-UI icon, polished mobile-game 3D cartoon rendering, rich saturated colors, soft top-left key light, strong specular highlights, thin dark-navy outline, slight 3/4 perspective, a single object centered, transparent background, no text — <OBJETO>`
