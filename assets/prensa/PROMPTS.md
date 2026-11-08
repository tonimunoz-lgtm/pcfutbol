# Imágenes de las portadas de prensa (opcionales)

El juego ya funciona sin ellas (usa un degradado con un emoji). Para activarlas, genera cada imagen y guárdala en
`assets/prensa/` con **exactamente** este nombre, formato WebP, **1280×640 px** (proporción 2:1, el sujeto centrado
porque se recorta en móvil). Sin texto, sin escudos reales, sin logotipos ni caras de personas reales.

Estilo común (añádelo a todos los prompts):
> vintage newspaper press photograph, slightly grainy black-and-white with warm sepia tint, halftone print texture, dramatic stadium lighting, wide cinematic composition, subject centered, no text, no logos, no real club crests, generic anonymous players in plain colored kits

| Archivo | Prompt (en inglés para la IA de imágenes) |
|---|---|
| `copa.webp` | Football players in plain red and white kits lifting a large silver cup on a podium at night, confetti in the air, crowd in the background |
| `liga.webp` | Football team celebrating on the pitch holding a golden league trophy, players hugging, fans waving flags in the stands |
| `ascenso.webp` | Football players and fans celebrating a promotion on the pitch after the final whistle, fans invading the field, arms raised, smoke flares, joyful mood |
| `champions.webp` | Team lifting a huge silver European trophy with big ears under stadium floodlights, fireworks and confetti, night final atmosphere |
| `europaLeague.webp` | Players lifting an orange-lit European trophy on a stage at night, fireworks and confetti, fans cheering in the stands |
| `conferenceLague.webp` | Players celebrating with a green-lit European trophy at a stadium at night, scarves held up by supporters, confetti |
| `premio.webp` | Football manager in a suit holding a small golden award on a stage, applauding club executives in the background, warm indoor lighting (anonymous, face not clearly visible) |

## Derbis
| Archivo | Prompt (en inglés para la IA de imágenes; añade el estilo común de arriba) |
|---|---|
| `derbi.webp` | two groups of anonymous football fans in opposite-colored scarves facing each other across a packed stadium stand, flares and smoke, intense derby atmosphere, wide composition, subject centered |

La misma imagen se usa para victoria, empate y derrota. Se publica una portada en cualquier resultado de un **gran derbi** (nivel 2) y solo en las victorias de los derbis menores (nivel 1).

## Leyendas, dorsales y despedidas
Misma medida (1280×640, WebP) y mismo estilo base de arriba. Se añade a cada prompt lo siguiente:

| Archivo | Prompt (añade el estilo común) |
|---|---|
| `leyenda_club.webp` | veteran football player in a plain kit saluting a packed stadium from the center circle, face not visible, confetti falling, fans holding scarves, emotional farewell atmosphere |
| `dorsal_retirado.webp` | a plain football shirt with a large number on the back framed and lit on a stadium wall, dramatic spotlight, empty tunnel behind |
| `leyenda_liga.webp` | veteran footballer leaving the pitch applauded by both sets of fans, a guard of honor of players from both teams lining the field, camera flashes, face not visible |
| `despedida.webp` | player leaving the training ground with a sports bag, fans waiting at the gate with blank banners, melancholic evening light |

`leyenda_liga.webp` también se usa para los **hijos de la cantera** (jugadores formados en tu club que se retiran en otro).
El banner del museo va en `assets/museo/banner.webp` (ver `assets/museo/LEEME.md`).
