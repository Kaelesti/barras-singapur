'use strict';
/* =========================================================
   Barras Singapur · PWA educativa (1° a 5° básico)
   Método Singapur con enfoque CPA:
     C · Concreto   → objetos manipulables (fichas, bandejas, tiras)
     P · Pictórico  → modelo de barras interactivo
     A · Abstracto  → operaciones con números
   Vanilla JS (ES2020+). Sin dependencias ni proceso de build.
   ========================================================= */

/* ---------------------------------------------------------
   1. Utilidades
   --------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);

/** Crea un elemento: h('button', {class:'x', onclick}, 'texto', otroNodo) */
function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (tag === 'button') n.type = 'button';
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : String(kid));
  }
  return n;
}

/** Formato chileno de miles: 23000 → "23.000" */
const fmt = n => {
  const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + s;
};
const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const pct = f => (f * 100).toFixed(3) + '%';
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const escapeHTML = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Texto del problema con fracciones apiladas (3/5 → ³⁄₅ visual) */
const richText = s => escapeHTML(s).replace(/(\d+)\/(\d+)/g,
  '<span class="frac" role="img" aria-label="$1 de $2"><span class="num">$1</span><span class="den">$2</span></span>');

const PRAISE = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Así se hace!', '¡Bien pensado!'];
const TRY_AGAIN = ['Todavía no. Mira de nuevo el modelo.', 'Casi. Revisa tu cálculo.', 'No es ese número. ¡Inténtalo otra vez!'];

/* ---------------------------------------------------------
   2. Niveles
   --------------------------------------------------------- */
const LEVELS = [
  {
    id: 1, name: 'Nivel 1', grade: '1° – 2° básico', topic: 'Modelo parte-todo · Suma y resta',
    intro: 'Dos o más partes forman un todo. Si conoces las partes, las juntas (sumas). Si conoces el todo y una parte, buscas la otra parte (restas).',
    tip: 'Para el adulto: pregunte siempre «¿esto es una parte o es el todo?» antes de calcular.'
  },
  {
    id: 2, name: 'Nivel 2', grade: '3° básico', topic: 'Grupos iguales · Multiplicación y división',
    intro: 'Multiplicar es repetir grupos del mismo tamaño. Dividir es repartir un total en grupos iguales o averiguar cuántos grupos caben.',
    tip: 'Para el adulto: al construir la barra, lea en voz alta la suma repetida (6, 12, 18, 24…).'
  },
  {
    id: 3, name: 'Nivel 3', grade: '4° básico', topic: 'Comparación multiplicativa · «veces más que»',
    intro: 'Una barra puede ser «el doble», «el triple» o «4 veces» otra. La clave es encontrar cuánto vale 1 unidad y usarla para todo lo demás.',
    tip: 'Para el adulto: insista en dibujar unidades del mismo largo; ahí está el razonamiento.'
  },
  {
    id: 4, name: 'Nivel 4', grade: '5° básico', topic: 'Fracciones · Problemas de varias etapas',
    intro: 'El denominador dice en cuántas partes iguales se divide la barra. Si sabes cuánto valen algunas partes, encuentras 1 parte y luego el total.',
    tip: 'Para el adulto: el paso «¿cuánto vale 1 parte?» es el corazón del método; no lo salten.'
  }
];

/* ---------------------------------------------------------
   3. Banco de problemas
   ---------------------------------------------------------
   Cada problema define:
   · concrete: fase concreta
       mode 'fill'  → completar fichas (layout 'frames' | 'trays', order 'roundrobin' para repartir)
       mode 'group' → formar grupos de un tamaño fijo
       mode 'mark'  → marcar / tachar fichas o partes de una tira
   · bars: barras del modelo. Cada segmento tiene units (largo relativo),
           value (dato conocido) o id (incógnita). build = barra que se construye tocando.
   · brackets: llaves sobre (top) o bajo (bottom) una barra, en unidades.
   · brace: llave vertical a la derecha que abarca todas las barras.
   · steps: pasos guiados de la fase pictórica.
   · equations: líneas de la fase abstracta. {op} = signo por elegir, {n} = número por escribir.
   --------------------------------------------------------- */
const PROBLEMS = [
  /* ===================== NIVEL 1 ===================== */
  {
    id: 'n1-calcomanias', level: 1, title: 'Las calcomanías de Ana',
    text: 'Ana tiene 5 calcomanías. Su abuela le regala algunas más y ahora tiene 12. ¿Cuántas calcomanías le regaló su abuela?',
    concrete: {
      mode: 'fill', layout: 'frames', icon: '⭐',
      groups: [{ count: 5, given: true, label: 'Tenía' }, { count: 7, label: 'Regalo' }],
      prompt: 'Ana ya tiene 5 ⭐. Toca los espacios vacíos hasta llegar a 12 y cuenta cuántas agregas.',
      done: '¡Agregaste 7 calcomanías! 5 y 7 forman 12.'
    },
    bars: [{ label: 'Calcomanías de Ana', segments: [
      { units: 5, value: 5, cap: 'tenía' },
      { units: 7, id: 'regalo', cap: 'regalo', tone: 'a' }
    ] }],
    brackets: [{ bar: 0, from: 0, to: 12, pos: 'top', value: 12, cap: 'ahora tiene' }],
    steps: [{
      type: 'num', target: 'regalo',
      locate: 'Toca en la barra la parte que representa lo que le regaló la abuela.',
      prompt: 'El todo es 12 y una parte es 5. ¿Cuánto vale la otra parte?',
      answer: 7, hint: 'Piensa: 5 + ? = 12. También puedes calcular 12 − 5.',
      errors: { 17: 'Sumaste 12 + 5, pero 12 ya es el total. Buscamos una parte: debe ser menor que 12.' }
    }],
    equations: [[12, { op: '−' }, 5, '=', { n: 7 }]],
    answerText: 'La abuela le regaló 7 calcomanías.'
  },
  {
    id: 'n1-patos', level: 1, title: 'Patos en el estanque',
    text: 'En el estanque hay 8 patos. Llegan 6 patos más. ¿Cuántos patos hay ahora en el estanque?',
    concrete: {
      mode: 'fill', layout: 'frames', icon: '🦆',
      groups: [{ count: 8, given: true, label: 'Había' }, { count: 6, label: 'Llegan' }],
      prompt: 'Hay 8 🦆. Toca los espacios para que lleguen 6 patos más. Fíjate cuándo se llena la primera decena.',
      done: '8 patos y 6 patos son 14 patos: una decena y 4 más.'
    },
    bars: [{ label: 'Patos', segments: [
      { units: 8, value: 8, cap: 'había' },
      { units: 6, value: 6, cap: 'llegan', tone: 'a' }
    ] }],
    brackets: [{ id: 'total', bar: 0, from: 0, to: 14, pos: 'top', cap: 'en total' }],
    steps: [{
      type: 'num', target: 'total',
      locate: 'Toca la parte del modelo que muestra cuántos patos hay en total.',
      prompt: 'Conocemos las dos partes: 8 y 6. ¿Cuánto es el todo?',
      answer: 14, hint: 'Junta las partes: 8 + 2 = 10, y 10 + 4 = 14.',
      errors: { 2: 'Restaste. Si conocemos las partes y buscamos el todo, las juntamos (sumamos).' }
    }],
    equations: [[8, { op: '+' }, 6, '=', { n: 14 }]],
    answerText: 'Ahora hay 14 patos en el estanque.'
  },
  {
    id: 'n1-globos', level: 1, title: 'Los globos de Pedro',
    text: 'Pedro tenía 15 globos. Se le volaron 9. ¿Cuántos globos le quedan?',
    concrete: {
      mode: 'mark', layout: 'frames', icon: '🎈', total: 15,
      marks: [{ count: 9, label: 'Se volaron' }],
      prompt: 'Pedro tiene 15 🎈. Toca 9 globos para que se vuelen.',
      done: 'Se volaron 9 globos y quedaron 6.'
    },
    bars: [{ label: 'Globos de Pedro', segments: [
      { units: 9, value: 9, cap: 'se volaron', tone: 'muted' },
      { units: 6, id: 'quedan', cap: 'le quedan' }
    ] }],
    brackets: [{ bar: 0, from: 0, to: 15, pos: 'top', value: 15, cap: 'tenía' }],
    steps: [{
      type: 'num', target: 'quedan',
      locate: 'Toca la parte que muestra los globos que le quedan.',
      prompt: 'El todo es 15 y la parte que se voló es 9. ¿Cuántos globos quedan?',
      answer: 6, hint: 'Calcula 15 − 9. O piensa: 9 + ? = 15.',
      errors: { 24: 'Sumaste. Si se volaron globos, quedan menos de 15.' }
    }],
    equations: [[15, { op: '−' }, 9, '=', { n: 6 }]],
    answerText: 'A Pedro le quedan 6 globos.'
  },
  {
    id: 'n1-paginas', level: 1, title: 'Las páginas de Martina',
    text: 'Martina leyó 7 páginas el lunes, 5 el martes y 8 el miércoles. ¿Cuántas páginas leyó en total?',
    concrete: {
      mode: 'fill', layout: 'frames', icon: '📄',
      groups: [{ count: 7, label: 'Lunes' }, { count: 5, label: 'Martes' }, { count: 8, label: 'Miércoles' }],
      prompt: 'Toca los espacios de cada color: azul el lunes (7), naranjo el martes (5) y verde el miércoles (8).',
      done: '7 + 5 + 8 = 20 páginas. ¡Dos decenas completas!'
    },
    bars: [{ label: 'Páginas leídas', segments: [
      { units: 7, value: 7, cap: 'lunes' },
      { units: 5, value: 5, cap: 'martes', tone: 'a' },
      { units: 8, value: 8, cap: 'miércoles', tone: 'b' }
    ] }],
    brackets: [{ id: 'total', bar: 0, from: 0, to: 20, pos: 'top', cap: 'en total' }],
    steps: [{
      type: 'num', target: 'total',
      locate: 'Toca la parte del modelo que representa el total de páginas.',
      prompt: 'Hay tres partes: 7, 5 y 8. ¿Cuánto es el todo?',
      answer: 20, hint: 'Primero 7 + 5 = 12. Luego 12 + 8.'
    }],
    equations: [[7, { op: '+' }, 5, '+', 8, '=', { n: 20 }]],
    answerText: 'Martina leyó 20 páginas en total.'
  },

  /* ===================== NIVEL 2 ===================== */
  {
    id: 'n2-rosquillas', level: 2, title: 'Rosquillas en bandejas',
    text: 'En la panadería hay 24 rosquillas. Se ponen en bandejas de 6 rosquillas cada una. ¿Cuántas bandejas se necesitan?',
    concrete: {
      mode: 'group', icon: '🍩', total: 24, size: 6, label: 'bandeja',
      prompt: 'Toca una rosquilla suelta para formar una bandeja de 6. Sigue hasta que no queden sueltas.',
      done: 'Formaste 4 bandejas de 6 rosquillas. En 24 caben 4 grupos de 6.'
    },
    bars: [{ label: 'Rosquillas', build: { count: 4, value: 6 } }],
    brackets: [
      { bar: 0, from: 0, to: 4, pos: 'top', value: 24, cap: 'en total' },
      { id: 'bandejas', bar: 0, from: 0, to: 4, pos: 'bottom', plain: true, suffix: ' bandejas', cap: '¿cuántas?' }
    ],
    steps: [
      { type: 'build', bar: 0, prompt: 'Toca la parte punteada de la barra para poner bandejas de 6 hasta completar 24. Mira la suma repetida.' },
      {
        type: 'num', target: 'bandejas', plain: true,
        locate: 'Toca la llave de abajo: la que pregunta por las bandejas.',
        prompt: '¿Cuántas bandejas de 6 caben en 24?',
        answer: 4, hint: 'Cuenta los bloques de la barra: 6, 12, 18, 24.',
        errors: { 144: 'Multiplicaste 24 × 6. Estamos formando grupos con las 24, así que el resultado es menor que 24.', 18: 'Restaste solo una bandeja. Cuenta cuántos grupos de 6 caben.' }
      }
    ],
    equations: [[24, { op: '÷' }, 6, '=', { n: 4 }]],
    answerText: 'Se necesitan 4 bandejas.'
  },
  {
    id: 'n2-lapices', level: 2, title: 'Cajas de lápices',
    text: 'Hay 5 cajas con 8 lápices cada una. ¿Cuántos lápices hay en total?',
    concrete: {
      mode: 'fill', layout: 'trays', icon: '✏️',
      groups: rep(5, i => ({ count: 8, label: `Caja ${i + 1}` })),
      prompt: 'Toca cada caja para llenarla con 8 lápices. Cuenta de 8 en 8.',
      done: '5 cajas de 8 lápices son 40 lápices: 8, 16, 24, 32, 40.'
    },
    bars: [{ label: 'Lápices', build: { count: 5, value: 8 } }],
    brackets: [{ id: 'total', bar: 0, from: 0, to: 5, pos: 'top', cap: 'en total' }],
    steps: [
      { type: 'build', bar: 0, prompt: 'Toca la parte punteada para agregar una caja de 8 cada vez.' },
      {
        type: 'num', target: 'total',
        locate: 'Toca la llave que representa el total de lápices.',
        prompt: 'Son 5 grupos de 8. ¿Cuántos lápices hay en total?',
        answer: 40, hint: '8 + 8 + 8 + 8 + 8, que es lo mismo que 5 × 8.',
        errors: { 13: 'Sumaste 5 + 8. Pero son 5 grupos de 8: hay que repetir el 8 cinco veces.' }
      }
    ],
    equations: [[5, { op: '×' }, 8, '=', { n: 40 }]],
    answerText: 'Hay 40 lápices en total.'
  },
  {
    id: 'n2-laminas', level: 2, title: 'Repartir láminas',
    text: 'Diego reparte 18 láminas entre 3 amigos en partes iguales. ¿Cuántas láminas recibe cada amigo?',
    concrete: {
      mode: 'fill', layout: 'trays', order: 'roundrobin', icon: '🃏',
      groups: rep(3, i => ({ count: 6, label: `Amigo ${i + 1}` })),
      prompt: 'Toca «Repartir 1» para dar una lámina a cada amigo, por turnos, hasta que no quede ninguna.',
      done: 'Cada amigo recibió 6 láminas. 18 repartido en 3 es 6.'
    },
    bars: [{ label: 'Láminas', segments: rep(3, i => ({ units: 1, id: 'cada', cap: `amigo ${i + 1}` })) }],
    brackets: [{ bar: 0, from: 0, to: 3, pos: 'top', value: 18, cap: 'en total' }],
    steps: [{
      type: 'num', target: 'cada',
      locate: 'Toca una de las partes que representa lo que recibe un amigo.',
      prompt: 'El todo, 18, se divide en 3 partes iguales. ¿Cuánto vale cada parte?',
      answer: 6, hint: '¿Qué número sumado 3 veces da 18? ? + ? + ? = 18.',
      errors: { 54: 'Multiplicaste. Al repartir, cada parte es menor que el total.', 15: 'Restaste 18 − 3. Pero no quitamos 3: repartimos entre 3.' }
    }],
    equations: [[18, { op: '÷' }, 3, '=', { n: 6 }]],
    answerText: 'Cada amigo recibe 6 láminas.'
  },
  {
    id: 'n2-sillas', level: 2, title: 'Sillas del auditorio',
    text: 'En el auditorio hay 7 filas con 4 sillas en cada fila. ¿Cuántas sillas hay?',
    concrete: {
      mode: 'fill', layout: 'trays', icon: '🪑',
      groups: rep(7, i => ({ count: 4, label: `Fila ${i + 1}` })),
      prompt: 'Toca cada fila para poner sus 4 sillas. Es una matriz: filas iguales.',
      done: '7 filas de 4 sillas: 4, 8, 12, 16, 20, 24, 28.'
    },
    bars: [{ label: 'Sillas', build: { count: 7, value: 4 } }],
    brackets: [{ id: 'total', bar: 0, from: 0, to: 7, pos: 'top', cap: 'en total' }],
    steps: [
      { type: 'build', bar: 0, prompt: 'Toca la parte punteada para agregar una fila de 4 sillas cada vez.' },
      {
        type: 'num', target: 'total',
        locate: 'Toca la llave que representa todas las sillas.',
        prompt: 'Son 7 grupos de 4. ¿Cuántas sillas hay?',
        answer: 28, hint: 'Usa dobles: 7 × 2 = 14, y el doble de 14 es 28.',
        errors: { 11: 'Sumaste 7 + 4. Son 7 filas, cada una con 4 sillas.' }
      }
    ],
    equations: [[7, { op: '×' }, 4, '=', { n: 28 }]],
    answerText: 'Hay 28 sillas en el auditorio.'
  },

  /* ===================== NIVEL 3 ===================== */
  {
    id: 'n3-ahorros', level: 3, title: 'Los ahorros de Lucas y Sofía', prefix: '$',
    text: 'Lucas ahorró $7.000. Sofía ahorró el triple de lo que ahorró Lucas, más $2.000. ¿Cuánto dinero ahorró Sofía?',
    concrete: {
      mode: 'fill', layout: 'trays', icon: '💵', note: 'Cada 💵 vale $1.000.', countLabel: 'Billetes de Sofía',
      groups: [
        { count: 7, given: true, label: 'Lucas', row: 'Lucas', tone: 0 },
        { count: 7, label: '1 vez', row: 'Sofía', tone: 1 },
        { count: 7, label: '2 veces', row: 'Sofía', tone: 1 },
        { count: 7, label: '3 veces', row: 'Sofía', tone: 1 },
        { count: 2, label: 'más $2.000', row: 'Sofía', tone: 2 }
      ],
      prompt: 'Lucas tiene 7 billetes. Toca las bandejas de Sofía: 3 veces lo de Lucas y luego 2 billetes más.',
      done: 'Sofía tiene 7 + 7 + 7 + 2 = 23 billetes de $1.000.'
    },
    bars: [
      { label: 'Lucas', segments: [{ units: 1, value: 7000 }] },
      { label: 'Sofía', segments: [
        { units: 1, id: 'u', cap: '1 vez', tone: 'a' },
        { units: 1, id: 'u', cap: '2 veces', tone: 'a' },
        { units: 1, id: 'u', cap: '3 veces', tone: 'a' },
        { units: 0.65, value: 2000, cap: 'más', tone: 'b' }
      ] }
    ],
    brackets: [
      { id: 'triple', bar: 1, from: 0, to: 3, pos: 'bottom', cap: 'el triple' },
      { id: 'sofia', bar: 1, from: 0, to: 3.65, pos: 'top', cap: 'Sofía en total' }
    ],
    steps: [
      {
        type: 'num', target: 'u',
        locate: 'Toca una de las 3 unidades iguales de Sofía.',
        prompt: 'Cada unidad de Sofía mide lo mismo que la barra de Lucas. ¿Cuánto vale una unidad?',
        answer: 7000, hint: 'Compara el largo: una unidad de Sofía es igual a la barra de Lucas.'
      },
      {
        type: 'num', target: 'triple',
        locate: 'Toca la llave que agrupa las 3 unidades (el triple).',
        prompt: '¿Cuánto valen las 3 unidades juntas?',
        answer: 21000, hint: '3 × $7.000. Si 3 × 7 = 21, entonces 3 × 7.000 = 21.000.',
        errors: { 14000: 'Ese es el doble (2 veces). El triple son 3 veces.' }
      },
      {
        type: 'num', target: 'sofia',
        locate: 'Toca la llave que muestra todo lo que ahorró Sofía.',
        prompt: 'Al triple le sumamos $2.000. ¿Cuánto ahorró Sofía?',
        answer: 23000, hint: '$21.000 + $2.000.',
        errors: { 21000: 'Te faltó sumar los $2.000 extra.', 27000: 'Calculaste 3 × $9.000. Los $2.000 se suman una sola vez, al final.' }
      }
    ],
    equations: [
      [3, { op: '×' }, 7000, '=', { n: 21000 }],
      [21000, { op: '+' }, 2000, '=', { n: 23000 }]
    ],
    answerText: 'Sofía ahorró $23.000.'
  },
  {
    id: 'n3-cuerdas', level: 3, title: 'Cuerda roja y cuerda azul', suffix: ' m',
    text: 'Una cuerda roja mide 4 metros. La cuerda azul mide 5 veces lo que mide la roja. ¿Cuánto mide la azul? ¿Cuántos metros más larga es que la roja?',
    concrete: {
      mode: 'fill', layout: 'trays', icon: '📏', note: 'Cada 📏 es 1 metro.', countLabel: 'Metros de la azul',
      groups: [
        { count: 4, given: true, label: 'Roja', row: 'Cuerda roja', tone: 4 },
        ...rep(5, i => ({ count: 4, label: `${i + 1} vez`, row: 'Cuerda azul', tone: 0 }))
      ],
      prompt: 'La roja mide 4 metros. Toca las 5 bandejas de la azul: cada una es igual a la roja.',
      done: 'La azul mide 4, 8, 12, 16, 20 metros: 5 veces 4.'
    },
    bars: [
      { label: 'Roja', segments: [{ units: 1, value: 4, tone: 'r' }] },
      { label: 'Azul', segments: rep(5, () => ({ units: 1, value: 4 })) }
    ],
    brackets: [
      { id: 'azul', bar: 1, from: 0, to: 5, pos: 'top', cap: 'cuerda azul' },
      { id: 'dif', bar: 1, from: 1, to: 5, pos: 'bottom', cap: 'más larga que la roja' }
    ],
    steps: [
      {
        type: 'num', target: 'azul',
        locate: 'Toca la llave que muestra el largo total de la cuerda azul.',
        prompt: 'La azul tiene 5 unidades de 4 m. ¿Cuánto mide?',
        answer: 20, hint: '4 + 4 + 4 + 4 + 4, o 5 × 4.',
        errors: { 9: 'Sumaste 5 + 4. Son 5 veces 4 metros.' }
      },
      {
        type: 'num', target: 'dif',
        locate: 'Toca la llave que muestra cuánto más larga es la azul que la roja.',
        prompt: 'La diferencia son las 4 unidades que la roja no tiene. ¿Cuántos metros son?',
        answer: 16, hint: '20 − 4, o bien 4 × 4.',
        errors: { 20: 'Ese es el largo total de la azul. Buscamos solo la diferencia con la roja.', 24: 'Sumaste. La diferencia se calcula restando.' }
      }
    ],
    equations: [
      [5, { op: '×' }, 4, '=', { n: 20 }],
      [20, { op: '−' }, 4, '=', { n: 16 }]
    ],
    answerText: 'La cuerda azul mide 20 m y es 16 m más larga que la roja.'
  },
  {
    id: 'n3-cartas', level: 3, title: 'Las cartas de Mateo e Ignacio',
    text: 'Mateo tiene 36 cartas. Eso es 4 veces la cantidad de cartas que tiene Ignacio. ¿Cuántas cartas tiene Ignacio?',
    concrete: {
      mode: 'fill', layout: 'trays', order: 'roundrobin', icon: '🎴',
      groups: rep(4, i => ({ count: 9, label: `Parte ${i + 1}`, row: 'Cartas de Mateo en 4 partes iguales' })),
      prompt: 'Reparte las 36 cartas de Mateo en 4 partes iguales. Una parte es lo que tiene Ignacio.',
      done: 'Cada parte tiene 9 cartas, así que Ignacio tiene 9.'
    },
    bars: [
      { label: 'Ignacio', segments: [{ units: 1, id: 'u', cap: 'Ignacio', tone: 'a' }] },
      { label: 'Mateo', segments: rep(4, () => ({ units: 1, id: 'u' })) }
    ],
    brackets: [{ bar: 1, from: 0, to: 4, pos: 'top', value: 36, cap: 'Mateo' }],
    steps: [{
      type: 'num', target: 'u',
      locate: 'Toca la barra de Ignacio: mide lo mismo que 1 unidad de Mateo.',
      prompt: 'Las 4 unidades de Mateo suman 36. ¿Cuánto vale 1 unidad?',
      answer: 9, hint: '¿Qué número por 4 da 36? Es 36 ÷ 4.',
      errors: { 144: 'Multiplicaste. Ignacio tiene menos cartas que Mateo.', 32: 'Restaste 36 − 4. «4 veces» significa dividir en 4 partes iguales.' }
    }],
    equations: [[36, { op: '÷' }, 4, '=', { n: 9 }]],
    answerText: 'Ignacio tiene 9 cartas.'
  },
  {
    id: 'n3-doble', level: 3, title: 'El doble de dinero', prefix: '$',
    text: 'Camila tiene el doble de dinero que Tomás. Entre los dos tienen $15.000. ¿Cuánto dinero tiene cada uno?',
    concrete: {
      mode: 'fill', layout: 'trays', order: 'roundrobin', icon: '💵', note: 'Cada 💵 vale $1.000.',
      groups: [
        { count: 5, label: 'Tomás', row: 'Tomás', tone: 1 },
        { count: 5, label: 'Parte 1', row: 'Camila', tone: 2 },
        { count: 5, label: 'Parte 2', row: 'Camila', tone: 2 }
      ],
      prompt: 'Hay 15 billetes de $1.000. Repártelos en 3 partes iguales: 1 parte para Tomás y 2 para Camila.',
      done: 'Cada parte tiene 5 billetes: Tomás $5.000 y Camila $10.000.'
    },
    bars: [
      { label: 'Tomás', segments: [{ units: 1, id: 'u', tone: 'a' }] },
      { label: 'Camila', segments: [{ units: 1, id: 'u', tone: 'b' }, { units: 1, id: 'u', tone: 'b' }] }
    ],
    brackets: [{ id: 'camila', bar: 1, from: 0, to: 2, pos: 'top', cap: 'Camila' }],
    brace: { value: 15000, cap: 'entre los dos' },
    steps: [
      {
        type: 'num', target: null, plain: true,
        prompt: 'Cuenta las unidades iguales de las dos barras. ¿Cuántas unidades hay en total?',
        answer: 3, hint: 'Tomás tiene 1 unidad y Camila tiene 2.',
        errors: { 2: 'Esas son solo las de Camila. Cuenta también la de Tomás.' }
      },
      {
        type: 'num', target: 'u',
        locate: 'Toca la barra de Tomás (1 unidad).',
        prompt: '3 unidades valen $15.000. ¿Cuánto vale 1 unidad?',
        answer: 5000, hint: '$15.000 ÷ 3. Piensa: 15 ÷ 3 = 5.',
        errors: { 7500: 'Dividiste en 2. Pero hay 3 unidades en total.' }
      },
      {
        type: 'num', target: 'camila',
        locate: 'Toca la llave que muestra el dinero de Camila.',
        prompt: 'Camila tiene 2 unidades. ¿Cuánto dinero tiene?',
        answer: 10000, hint: '2 × $5.000.'
      }
    ],
    equations: [
      [15000, { op: '÷' }, 3, '=', { n: 5000 }],
      [2, { op: '×' }, 5000, '=', { n: 10000 }]
    ],
    answerText: 'Tomás tiene $5.000 y Camila tiene $10.000.'
  },

  /* ===================== NIVEL 4 ===================== */
  {
    id: 'n4-esteban', level: 4, title: 'El dinero de Esteban', prefix: '$',
    text: 'Esteban gastó 3/5 de su dinero en un regalo y le quedaron $12.000. ¿Cuánto dinero tenía al principio?',
    concrete: {
      mode: 'mark', layout: 'strip', total: 5,
      marks: [{ count: 3, label: 'Gastó', tone: 'muted' }],
      prompt: 'Esta tira es todo el dinero de Esteban, dividido en 5 partes iguales (quintos). Toca 3 partes para marcar lo que gastó.',
      done: 'Gastó 3 de 5 partes y le quedaron 2 partes. ¡Esas 2 partes valen $12.000!'
    },
    bars: [{ label: 'Dinero de Esteban', segments: [
      ...rep(3, () => ({ units: 1, id: 'u', cap: 'gastó', tone: 'muted' })),
      ...rep(2, () => ({ units: 1, id: 'u', cap: 'quedó' }))
    ] }],
    brackets: [
      { id: 'total', bar: 0, from: 0, to: 5, pos: 'top', cap: 'al principio' },
      { id: 'gasto', bar: 0, from: 0, to: 3, pos: 'bottom', cap: 'gastó' },
      { bar: 0, from: 3, to: 5, pos: 'bottom', value: 12000, cap: 'le quedó' }
    ],
    steps: [
      {
        type: 'num', target: 'u',
        locate: 'Toca una de las 2 partes que le quedaron.',
        prompt: '2 partes valen $12.000. ¿Cuánto vale 1 parte (1/5)?',
        answer: 6000, hint: '$12.000 ÷ 2.',
        errors: { 24000: 'Multiplicaste. Una parte vale menos que las dos juntas.', 4000: 'Dividiste en 3. Pero los $12.000 son las 2 partes que quedaron.' }
      },
      {
        type: 'num', target: 'total',
        locate: 'Toca la llave que muestra todo el dinero que tenía.',
        prompt: 'El total son 5 partes de $6.000. ¿Cuánto tenía al principio?',
        answer: 30000, hint: '5 × $6.000.',
        errors: { 18000: 'Eso es lo que gastó (3 partes). El total son las 5 partes.' }
      },
      {
        type: 'num', target: 'gasto',
        locate: 'Toca la llave de lo que gastó.',
        prompt: 'Comprueba: ¿cuánto gastó en el regalo?',
        answer: 18000, hint: '3 × $6.000, o bien $30.000 − $12.000.'
      }
    ],
    equations: [
      [12000, { op: '÷' }, 2, '=', { n: 6000 }],
      [5, { op: '×' }, 6000, '=', { n: 30000 }]
    ],
    answerText: 'Esteban tenía $30.000 al principio.'
  },
  {
    id: 'n4-futbol', level: 4, title: 'Fútbol en el curso',
    text: 'En un curso hay 32 estudiantes. 3/8 del curso practica fútbol. ¿Cuántos estudiantes practican fútbol?',
    concrete: {
      mode: 'fill', layout: 'trays', order: 'roundrobin', icon: '🧒',
      groups: rep(8, i => ({ count: 4, label: `1/8 · ${i + 1}`, row: 'El curso en 8 partes iguales (octavos)', tone: i < 3 ? 2 : 0 })),
      prompt: 'Reparte a los 32 estudiantes en 8 grupos iguales. Los 3 grupos verdes practican fútbol.',
      done: 'Cada octavo tiene 4 estudiantes. 3 octavos son 4 + 4 + 4 = 12.'
    },
    bars: [{ label: 'Curso', segments: rep(8, i => i < 3
      ? { units: 1, id: 'u', cap: 'fútbol', tone: 'b' }
      : { units: 1, id: 'u' }) }],
    brackets: [
      { bar: 0, from: 0, to: 8, pos: 'top', value: 32, plain: true, cap: 'todo el curso' },
      { id: 'futbol', bar: 0, from: 0, to: 3, pos: 'bottom', cap: 'fútbol' }
    ],
    steps: [
      {
        type: 'num', target: 'u',
        locate: 'Toca una de las 8 partes iguales.',
        prompt: '32 estudiantes en 8 partes iguales. ¿Cuántos hay en 1/8?',
        answer: 4, hint: '32 ÷ 8. ¿Qué número por 8 da 32?',
        errors: { 24: 'Restaste 32 − 8. Hay que dividir en 8 partes.', 256: 'Multiplicaste; cada parte es más pequeña que 32.' }
      },
      {
        type: 'num', target: 'futbol',
        locate: 'Toca la llave que muestra a quienes practican fútbol.',
        prompt: 'Fútbol son 3 partes de 4. ¿Cuántos estudiantes son?',
        answer: 12, hint: '3 × 4.'
      }
    ],
    equations: [
      [32, { op: '÷' }, 8, '=', { n: 4 }],
      [3, { op: '×' }, 4, '=', { n: 12 }]
    ],
    answerText: '12 estudiantes practican fútbol.'
  },
  {
    id: 'n4-valentina', level: 4, title: 'Las compras de Valentina', prefix: '$',
    text: 'Valentina tenía $24.000. Gastó 1/4 en un libro y luego gastó 1/2 de lo que le quedaba en una polera. ¿Cuánto dinero le queda?',
    concrete: {
      mode: 'mark', layout: 'strip', total: 4,
      marks: [{ count: 1, label: 'Libro', tone: 'muted' }],
      prompt: 'La tira es todo el dinero, dividido en 4 cuartos. Toca 1 cuarto para pagar el libro.',
      done: 'Le quedan 3 cuartos. ¡Ojo! La polera es la mitad de esos 3 cuartos, no de todo el dinero.'
    },
    bars: [
      { label: 'Al inicio', segments: [
        { units: 1, id: 'u', cap: 'libro', tone: 'muted' },
        { units: 1, id: 'u' }, { units: 1, id: 'u' }, { units: 1, id: 'u' }
      ] },
      { label: 'Después del libro', offset: 1, segments: [
        { units: 1.5, id: 'polera', cap: 'polera', tone: 'muted' },
        { units: 1.5, id: 'queda', cap: 'le queda', tone: 'b' }
      ] }
    ],
    brackets: [
      { bar: 0, from: 0, to: 4, pos: 'top', value: 24000, cap: 'tenía' },
      { id: 'resto', bar: 0, from: 1, to: 4, pos: 'bottom', cap: 'le quedó' }
    ],
    steps: [
      {
        type: 'num', target: 'u',
        locate: 'Toca la parte del libro (1/4).',
        prompt: '$24.000 en 4 partes iguales. ¿Cuánto costó el libro?',
        answer: 6000, hint: '$24.000 ÷ 4.',
        errors: { 12000: 'Dividiste en 2. El libro es 1/4: divide en 4.' }
      },
      {
        type: 'num', target: 'resto',
        locate: 'Toca la llave de lo que le quedó después del libro.',
        prompt: 'Le quedaron 3 partes. ¿Cuánto dinero es?',
        answer: 18000, hint: '$24.000 − $6.000, o 3 × $6.000.'
      },
      {
        type: 'num', target: 'queda', reveal: { polera: 9000 },
        locate: 'En la segunda barra, toca la parte que le queda al final.',
        prompt: 'La polera costó la mitad de $18.000. ¿Cuánto le queda?',
        answer: 9000, hint: '$18.000 ÷ 2.',
        errors: { 12000: 'Calculaste la mitad de $24.000. La polera es la mitad de lo que le QUEDABA ($18.000).', 18000: 'Ese es el dinero antes de comprar la polera.' }
      }
    ],
    equations: [
      [24000, { op: '÷' }, 4, '=', { n: 6000 }],
      [24000, { op: '−' }, 6000, '=', { n: 18000 }],
      [18000, { op: '÷' }, 2, '=', { n: 9000 }]
    ],
    answerText: 'A Valentina le quedan $9.000.'
  },
  {
    id: 'n4-rocio', level: 4, title: 'El libro de Rocío',
    text: 'Rocío leyó 2/7 de un libro el lunes y 3/7 el martes. Le faltan 60 páginas para terminarlo. ¿Cuántas páginas tiene el libro?',
    concrete: {
      mode: 'mark', layout: 'strip', total: 7,
      marks: [{ count: 2, label: 'Lunes', tone: 'a' }, { count: 3, label: 'Martes', tone: 'b' }],
      prompt: 'La tira es el libro completo en 7 partes (séptimos). Toca 2 partes para el lunes y luego 3 para el martes.',
      done: 'Leyó 5 de 7 partes. Le faltan 2 partes, ¡y esas son 60 páginas!'
    },
    bars: [{ label: 'Libro', segments: [
      ...rep(2, () => ({ units: 1, id: 'u', cap: 'lunes', tone: 'a' })),
      ...rep(3, () => ({ units: 1, id: 'u', cap: 'martes', tone: 'b' })),
      ...rep(2, () => ({ units: 1, id: 'u', cap: 'falta' }))
    ] }],
    brackets: [
      { id: 'total', bar: 0, from: 0, to: 7, pos: 'top', cap: 'libro completo' },
      { bar: 0, from: 5, to: 7, pos: 'bottom', value: 60, cap: 'faltan' }
    ],
    steps: [
      {
        type: 'num', target: null, plain: true,
        prompt: '¿Cuántas partes (séptimos) le faltan por leer?',
        answer: 2, hint: 'El libro tiene 7 partes y ya leyó 2 + 3.'
      },
      {
        type: 'num', target: 'u',
        locate: 'Toca una de las partes que le faltan.',
        prompt: '2 partes son 60 páginas. ¿Cuántas páginas hay en 1/7?',
        answer: 30, hint: '60 ÷ 2.',
        errors: { 120: 'Multiplicaste. Una parte tiene menos páginas que dos.' }
      },
      {
        type: 'num', target: 'total',
        locate: 'Toca la llave del libro completo.',
        prompt: 'El libro tiene 7 partes de 30 páginas. ¿Cuántas páginas tiene?',
        answer: 210, hint: '7 × 30. Si 7 × 3 = 21, entonces 7 × 30 = 210.',
        errors: { 150: 'Eso es solo lo que leyó (5 partes). El libro completo son 7 partes.' }
      }
    ],
    equations: [
      [7, { op: '−' }, 5, '=', { n: 2 }],
      [60, { op: '÷' }, 2, '=', { n: 30 }],
      [7, { op: '×' }, 30, '=', { n: 210 }]
    ],
    answerText: 'El libro tiene 210 páginas.'
  }
];

const byLevel = lv => PROBLEMS.filter(p => p.level === lv);

/* ---------------------------------------------------------
   4. Estado y progreso (localStorage, protegido con try/catch)
   --------------------------------------------------------- */
const STORE_KEY = 'barras-singapur-v1';
const store = {
  load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } },
  save(d) { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch { /* sin almacenamiento */ } }
};
const progress = Object.assign({ done: {}, last: null }, store.load());

const state = {
  level: 1, idx: 0, phase: 'C',
  c: null,              // estado de la fase concreta
  p: null,              // estado de la fase pictórica
  a: null,              // estado de la fase abstracta
  input: '',            // número que se está escribiendo
  kpMode: null,         // 'num' | 'op' | null
  kpCtx: null
};

const current = () => byLevel(state.level)[state.idx];
const currentStep = () => current().steps[state.p.step];

function markDone(phase) {
  const id = current().id;
  if (!progress.done[id]) progress.done[id] = {};
  progress.done[id][phase] = true;
  progress.last = { level: state.level, idx: state.idx };
  store.save(progress);
  renderStars();
  renderLevelNav();
  renderPicker();
  refreshTabs();
}

/* ---------------------------------------------------------
   5. Referencias al DOM
   --------------------------------------------------------- */
const dom = {
  stars: $('#starCount'),
  levelNav: $('#levelNav'),
  levelIntro: $('#levelIntro'),
  picker: $('#problemPicker'),
  card: $('#problemCard'),
  title: $('#problemTitle'),
  text: $('#problemText'),
  speak: $('#speakBtn'),
  tabs: $('#cpaTabs'),
  phases: { C: $('#phaseC'), P: $('#phaseP'), A: $('#phaseA') },
  concrete: $('#concreteArea'),
  bars: $('#barModel'),
  barsMini: $('#barModelMini'),
  eq: $('#equationArea'),
  coach: $('#coach'),
  coachSpeak: $('#coachSpeak'),
  panel: $('#answerPanel'),
  display: $('#answerDisplay'),
  keypad: $('#keypad'),
  ops: $('#opPad'),
  next: $('#nextBtn'),
  reset: $('#resetBtn'),
  install: $('#installBtn'),
  toast: $('#toast')
};

/* ---------------------------------------------------------
   6. Navegación: niveles, problemas y fases
   --------------------------------------------------------- */
function renderStars() {
  const solved = PROBLEMS.filter(p => progress.done[p.id]?.A).length;
  dom.stars.textContent = `⭐ ${solved}/${PROBLEMS.length}`;
}

function renderLevelNav() {
  dom.levelNav.replaceChildren(...LEVELS.map(L => {
    const list = byLevel(L.id);
    const solved = list.filter(p => progress.done[p.id]?.A).length;
    const active = L.id === state.level;
    return h('button', {
      class: 'level-chip' + (active ? ' active' : ''),
      'aria-current': active ? 'true' : null,
      onclick: () => loadProblem(L.id, 0, true)
    },
      h('span', { class: 'lc-name' }, L.name),
      h('span', { class: 'lc-grade' }, L.grade),
      h('span', { class: 'lc-prog' }, `${solved}/${list.length} ⭐`));
  }));
}

function renderLevelIntro() {
  const L = LEVELS[state.level - 1];
  dom.levelIntro.replaceChildren(
    h('h2', null, L.topic),
    h('p', null, L.intro),
    h('p', { class: 'tip' }, L.tip));
}

function renderPicker() {
  const list = byLevel(state.level);
  dom.picker.replaceChildren(
    h('span', { class: 'picker-label' }, 'Problemas:'),
    ...list.map((p, i) => h('button', {
      class: 'pick' + (i === state.idx ? ' active' : '') + (progress.done[p.id]?.A ? ' done' : ''),
      'aria-label': `Problema ${i + 1}: ${p.title}`,
      'aria-current': i === state.idx ? 'true' : null,
      onclick: () => loadProblem(state.level, i, true)
    }, String(i + 1))));
}

function loadProblem(level, idx, scroll = false) {
  state.level = level;
  state.idx = idx;
  const pb = current();
  state.c = initConcrete(pb.concrete);
  state.p = { step: 0, located: false, locateMiss: 0, attempts: 0, solved: {}, built: {} };
  state.a = { blank: 0, attempts: 0, filled: {}, done: false };
  progress.last = { level, idx };
  store.save(progress);

  renderLevelNav();
  renderLevelIntro();
  renderPicker();
  dom.title.textContent = pb.title;
  dom.text.innerHTML = richText(pb.text);
  setPhase('C');
  if (scroll) scrollToCard();
}

function scrollToCard() {
  const r = dom.card.getBoundingClientRect();
  if (r.top < 60 || r.top > window.innerHeight * 0.6) {
    dom.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function refreshTabs() {
  const done = progress.done[current().id] || {};
  dom.tabs.querySelectorAll('[data-phase]').forEach(b => {
    const ph = b.dataset.phase;
    b.classList.toggle('active', ph === state.phase);
    b.classList.toggle('done', !!done[ph]);
    b.setAttribute('aria-selected', String(ph === state.phase));
  });
}

function setPhase(ph) {
  state.phase = ph;
  for (const [k, sec] of Object.entries(dom.phases)) sec.hidden = k !== ph;
  refreshTabs();
  hideNext();
  state.input = '';
  if (ph === 'C') enterConcrete();
  else if (ph === 'P') enterPictorial();
  else enterAbstract();
}

function showNext(label, fn) {
  dom.next.textContent = label;
  dom.next.onclick = fn;
  dom.next.hidden = false;
}
function hideNext() { dom.next.hidden = true; dom.next.onclick = null; }

function coach(msg, tone = 'info') {
  dom.coach.textContent = msg;
  dom.coach.className = 'coach ' + tone;
}

let toastTimer = 0;
function toast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2600);
}

function celebrate() {
  toast('⭐ ¡Problema resuelto!');
  const pieces = ['⭐', '🎉', '✨', '🟦', '🟧', '🟩'];
  for (let i = 0; i < 16; i++) {
    const c = h('span', { class: 'confetti', 'aria-hidden': 'true', style: { left: `${Math.random() * 96}vw`, animationDelay: `${Math.random() * 0.5}s` } }, pick(pieces));
    document.body.append(c);
    setTimeout(() => c.remove(), 2400);
  }
}

/* ---------------------------------------------------------
   7. FASE CONCRETA
   --------------------------------------------------------- */
function initConcrete(cfg) {
  const c = { done: false };
  if (cfg.mode === 'fill') {
    c.tokens = cfg.groups.flatMap((g, gi) => rep(g.count, () => ({ g: gi, on: !!g.given })));
    c.dealt = 0;
  } else if (cfg.mode === 'group') {
    c.loose = cfg.total;
    c.trays = 0;
  } else if (cfg.mode === 'mark') {
    c.marks = new Array(cfg.total).fill(-1);
  }
  return c;
}

function enterConcrete() {
  hideKeypad();
  const cfg = current().concrete;
  renderConcrete();
  if (state.c.done) {
    coach(cfg.done, 'ok');
    showNext('Siguiente: Pictórico →', goToPictorial);
  } else {
    coach(cfg.prompt);
  }
}

function goToPictorial() { setPhase('P'); scrollToCard(); }

function isConcreteDone(cfg, c) {
  if (cfg.mode === 'fill') return c.tokens.every(t => t.on);
  if (cfg.mode === 'group') return c.loose === 0;
  if (cfg.mode === 'mark') return currentMarkGroup(cfg, c) < 0;
  return false;
}

function afterConcreteChange() {
  const cfg = current().concrete, c = state.c;
  if (!c.done && isConcreteDone(cfg, c)) {
    c.done = true;
    renderConcrete();
    markDone('C');
    coach(cfg.done, 'ok');
    showNext('Siguiente: Pictórico →', goToPictorial);
    return;
  }
  renderConcrete();
}

function toneOf(cfg, gi) {
  const g = cfg.groups[gi];
  if (g.tone != null) return g.tone;
  if (cfg.layout === 'frames') return gi % 5;
  return 0;
}

function renderConcrete() {
  const cfg = current().concrete, c = state.c;
  const wrap = h('div', { class: 'cq' });
  if (cfg.note) wrap.append(h('p', { class: 'cq-note' }, cfg.note));
  if (cfg.mode === 'fill') wrap.append(cfg.layout === 'frames' ? fillFrames(cfg, c) : fillTrays(cfg, c));
  else if (cfg.mode === 'group') wrap.append(groupView(cfg, c));
  else if (cfg.mode === 'mark') wrap.append(markView(cfg, c));
  wrap.append(h('p', { class: 'cq-status', 'aria-live': 'polite' }, concreteStatus(cfg, c)));
  dom.concrete.replaceChildren(wrap);
}

/** Marcos de 10 (ten frames): refuerzan la estrategia de «formar la decena» */
function framesOf(n, makeToken) {
  const box = h('div', { class: 'frames' });
  for (let start = 0; start < n; start += 10) {
    const frame = h('div', { class: 'frame' });
    for (let i = start; i < start + 10; i++) {
      frame.append(i < n ? makeToken(i) : h('span', { class: 'token ghost', 'aria-hidden': 'true' }));
    }
    box.append(frame);
  }
  return box;
}

function fillFrames(cfg, c) {
  return framesOf(c.tokens.length, i => {
    const t = c.tokens[i], g = cfg.groups[t.g];
    return h('button', {
      class: `token g${toneOf(cfg, t.g)}${t.on ? ' on' : ''}`,
      'aria-label': `${g.label}: ${t.on ? 'lleno' : 'vacío'}`,
      disabled: g.given || c.done ? true : null,
      onclick: () => { t.on = !t.on; afterConcreteChange(); }
    }, t.on ? cfg.icon : '');
  });
}

function fillTrays(cfg, c) {
  const rows = [];
  cfg.groups.forEach((g, gi) => {
    const key = g.row || '';
    let r = rows.find(x => x.key === key);
    if (!r) rows.push(r = { key, items: [] });
    r.items.push(gi);
  });

  const box = h('div', { class: 'tray-rows' });
  if (cfg.order === 'roundrobin') box.append(dealControls(cfg, c));

  for (const r of rows) {
    const row = h('div', { class: 'tray-row' });
    if (r.key) row.append(h('div', { class: 'tray-row-label' }, r.key));
    const list = h('div', { class: 'tray-list' });
    for (const gi of r.items) {
      const g = cfg.groups[gi];
      const toks = c.tokens.filter(t => t.g === gi);
      const n = toks.filter(t => t.on).length;
      const full = n === g.count;
      const tone = toneOf(cfg, gi);
      const tokensEl = h('div', { class: 'tray-tokens' },
        toks.map(t => h('span', { class: `token sm g${tone}${t.on ? ' on' : ''}`, 'aria-hidden': 'true' }, t.on ? cfg.icon : '')));
      const label = h('span', { class: 'tray-label' }, g.label + (cfg.order === 'roundrobin' ? ` · ${n}` : ''));
      const tappable = cfg.order !== 'roundrobin' && !g.given;
      const tray = tappable
        ? h('button', {
          class: 'tray tap' + (full ? ' full' : ''),
          'aria-label': `${g.label}: ${full ? 'llena' : 'vacía'}. Toca para ${full ? 'vaciar' : 'llenar'}.`,
          disabled: c.done ? true : null,
          onclick: () => { toks.forEach(t => { t.on = !full; }); afterConcreteChange(); }
        }, label, tokensEl)
        : h('div', { class: 'tray' + (g.given ? ' given' : full ? ' full' : '') }, label, tokensEl);
      list.append(tray);
    }
    row.append(list);
    box.append(row);
  }
  return box;
}

function dealControls(cfg, c) {
  const remaining = c.tokens.filter(t => !t.on).length;
  const nGroups = cfg.groups.filter(g => !g.given).length;
  return h('div', { class: 'deal' },
    h('div', { class: 'pile' }, `${cfg.icon} × ${remaining} `, h('small', null, 'por repartir')),
    h('button', { class: 'btn', disabled: !remaining || null, onclick: () => { dealOne(cfg, c); afterConcreteChange(); } }, 'Repartir 1'),
    h('button', { class: 'btn ghost', disabled: !remaining || null, onclick: () => { for (let i = 0; i < nGroups; i++) dealOne(cfg, c); afterConcreteChange(); } }, 'Una vuelta'));
}

/** Reparte una ficha al siguiente grupo, por turnos (uno para ti, uno para ti…) */
function dealOne(cfg, c) {
  const gs = cfg.groups.map((_, i) => i).filter(i => !cfg.groups[i].given);
  for (let k = 0; k < gs.length; k++) {
    const pos = (c.dealt + k) % gs.length;
    const t = c.tokens.find(x => x.g === gs[pos] && !x.on);
    if (t) { t.on = true; c.dealt = (pos + 1) % gs.length; return true; }
  }
  return false;
}

function groupView(cfg, c) {
  const makeTray = () => {
    if (c.loose >= cfg.size) { c.loose -= cfg.size; c.trays++; }
    afterConcreteChange();
  };
  return h('div', { class: 'group-mode' },
    h('p', { class: 'zone-label' }, 'Sueltas'),
    h('div', { class: 'loose' }, rep(c.loose, () => h('button', {
      class: 'token on g0', 'aria-label': `${cfg.icon} suelta: toca para formar una ${cfg.label}`,
      disabled: c.done || null, onclick: makeTray
    }, cfg.icon))),
    h('div', null, h('button', { class: 'btn', disabled: c.loose < cfg.size || null, onclick: makeTray }, `Formar una ${cfg.label} de ${cfg.size}`)),
    c.trays ? h('p', { class: 'zone-label' }, `${capitalize(cfg.label)}s`) : null,
    h('div', { class: 'tray-list' }, rep(c.trays, i => h('div', { class: 'tray full' },
      h('span', { class: 'tray-label' }, `${capitalize(cfg.label)} ${i + 1}`),
      h('div', { class: 'tray-tokens' }, rep(cfg.size, () => h('span', { class: 'token sm on g1', 'aria-hidden': 'true' }, cfg.icon)))))));
}

function currentMarkGroup(cfg, c) {
  return cfg.marks.findIndex((m, mi) => c.marks.filter(x => x === mi).length < m.count);
}

function markView(cfg, c) {
  const make = i => {
    const m = c.marks[i];
    const strip = cfg.layout === 'strip';
    const mk = m >= 0 ? cfg.marks[m] : null;
    const cls = ['token'];
    if (strip) cls.push('piece');
    if (mk) cls.push('marked', `mt-${mk.tone || 'a'}`);
    else cls.push('on', 'g0');
    const content = strip
      ? [h('span', { html: `<span class="frac"><span class="num">1</span><span class="den">${cfg.total}</span></span>` }), mk ? h('span', { class: 'pc-label' }, mk.label) : null]
      : [cfg.icon];
    return h('button', {
      class: cls.join(' '),
      'aria-label': mk ? `${mk.label}. Toca para desmarcar.` : 'Sin marcar. Toca para marcar.',
      disabled: c.done || null,
      onclick: () => {
        if (m >= 0) c.marks[i] = -1;
        else {
          const g = currentMarkGroup(cfg, c);
          if (g < 0) { coach('Ya marcaste todas las que pide el problema.', 'warn'); return; }
          c.marks[i] = g;
        }
        afterConcreteChange();
      }
    }, content);
  };
  if (cfg.layout === 'strip') return h('div', { class: 'strip' }, rep(cfg.total, make));
  return framesOf(cfg.total, make);
}

function concreteStatus(cfg, c) {
  if (cfg.mode === 'fill') {
    if (cfg.layout === 'frames') {
      return cfg.groups.map((g, gi) => `${g.label}: ${c.tokens.filter(t => t.g === gi && t.on).length}`).join(' · ');
    }
    if (cfg.order === 'roundrobin') {
      const left = c.tokens.filter(t => !t.on).length;
      return left ? `Quedan ${left} por repartir.` : `¡Listo! Cada grupo tiene ${cfg.groups[0].count}.`;
    }
    const filled = cfg.groups.filter((g, gi) => !g.given && c.tokens.filter(t => t.g === gi).every(t => t.on));
    if (!filled.length) return 'Toca una bandeja para llenarla.';
    let acc = 0;
    return `${cfg.countLabel || 'Cuenta'}: ` + filled.map(g => fmt(acc += g.count)).join(' → ');
  }
  if (cfg.mode === 'group') return `${capitalize(cfg.label)}s: ${c.trays} · Sueltas: ${c.loose}`;
  if (cfg.mode === 'mark') {
    const parts = cfg.marks.map((m, mi) => `${m.label}: ${c.marks.filter(x => x === mi).length}`);
    parts.push(`Sin marcar: ${c.marks.filter(x => x < 0).length}`);
    return parts.join(' · ');
  }
  return '';
}

/* ---------------------------------------------------------
   8. FASE PICTÓRICA · MODELO DE BARRAS
   --------------------------------------------------------- */
function laneUnits(b) {
  return b.build ? b.build.count * (b.build.units || 1) : b.segments.reduce((s, x) => s + x.units, 0);
}

function valueText(v, item) {
  const pb = current();
  const core = item.plain ? fmt(v) : (pb.prefix || '') + fmt(v) + (pb.suffix || '');
  return core + (item.suffix || '');
}

/** Nodo de un segmento, una llave o la llave vertical */
function itemNode(kind, item, ctx) {
  const { readonly, step } = ctx;
  const P = state.p;
  const val = item.value != null ? item.value : (item.id != null ? P.solved[item.id] : undefined);
  const known = val != null;
  const isTarget = !readonly && step && step.type === 'num' && item.id != null && item.id === step.target;

  const cls = [kind];
  if (kind === 'seg') cls.push('tone-' + (item.tone || 'n'));
  if (kind === 'brk') cls.push(item.pos === 'bottom' ? 'bottom' : 'top');
  if (!known) cls.push('unknown');
  if (isTarget && P.located) cls.push('is-selected');
  else if (isTarget && P.locateMiss >= 2) cls.push('is-active');

  const text = known ? valueText(val, item) : '?' + (item.suffix || '');
  const name = item.cap || '';
  const attrs = {
    class: cls.join(' '),
    dataset: { tap: kind, id: item.id != null ? item.id : '', name },
    'aria-label': `${name ? name + ': ' : ''}${known ? text : 'valor desconocido'}`
  };
  if (kind === 'seg') attrs.style = { flexGrow: String(item.units) };
  return h(readonly ? 'div' : 'button', attrs,
    h('span', { class: 'lbl' },
      h('span', { class: kind + '-val' }, text),
      name ? h('span', { class: kind + '-cap' }, name) : null));
}

function trackNode(b, bi, readonly, step) {
  const track = h('div', { class: 'bm-track' });
  if (b.build) {
    const B = b.build, u = B.units || 1;
    const built = state.p.built[bi] || 0;
    for (let i = 0; i < built; i++) {
      track.append(itemNode('seg', { units: u, value: B.value, tone: B.tone, plain: true }, { readonly, step }));
    }
    if (built < B.count) {
      const can = !readonly && step && step.type === 'build' && step.bar === bi;
      track.append(h(readonly ? 'div' : 'button', {
        class: 'seg ghost' + (can ? ' can-build is-active' : ''),
        style: { flexGrow: String((B.count - built) * u) },
        dataset: { tap: 'build', bar: String(bi) },
        'aria-label': `Agregar un grupo de ${B.value} a la barra`
      }, h('span', { class: 'lbl' }, h('span', { class: 'seg-val' }, can ? '+ toca' : ''))));
    }
  } else {
    b.segments.forEach(s => track.append(itemNode('seg', s, { readonly, step })));
  }
  return track;
}

function skipNode(b, bi) {
  const built = state.p.built[bi] || 0;
  const v = b.build.value;
  const text = built ? `${rep(built, () => fmt(v)).join(' + ')} = ${fmt(built * v)}` : 'Suma repetida: …';
  return h('p', { class: 'skip', 'aria-live': 'polite' }, text);
}

function renderBars(container, readonly = false) {
  const pb = current();
  const step = readonly ? null : currentStep();
  const max = Math.max(...pb.bars.map(b => (b.offset || 0) + laneUnits(b)));
  const grid = h('div', { class: 'bm-grid' + (readonly ? ' mini' : '') });

  pb.bars.forEach((b, bi) => {
    const U = laneUnits(b);
    const lane = h('div', { class: 'bm-lane', style: { width: pct(U / max), marginLeft: pct((b.offset || 0) / max) } });
    const brs = (pb.brackets || []).filter(x => x.bar === bi);
    const zone = pos => {
      const list = brs.filter(x => (x.pos === 'bottom') === (pos === 'bottom'));
      if (!list.length) return null;
      return h('div', { class: 'bm-brk-zone ' + pos }, list.map(x => {
        const n = itemNode('brk', x, { readonly, step });
        n.style.left = pct(x.from / U);
        n.style.width = pct((x.to - x.from) / U);
        return n;
      }));
    };
    [zone('top'), trackNode(b, bi, readonly, step), zone('bottom'), b.build ? skipNode(b, bi) : null]
      .forEach(n => { if (n) lane.append(n); });
    grid.append(h('div', { class: 'bm-cell', style: { gridRow: String(bi + 1) } },
      h('div', { class: 'bm-label' }, b.label), lane));
  });

  if (pb.brace) {
    grid.append(h('div', { class: 'bm-brace-cell', style: { gridRow: `1 / span ${pb.bars.length}` } },
      itemNode('brace', pb.brace, { readonly, step })));
  }
  container.replaceChildren(grid);
}

function enterPictorial() {
  startStep();
}

/** Activa el paso actual de la fase pictórica */
function startStep(prefix = '') {
  const P = state.p;
  const step = currentStep();
  P.attempts = 0;
  P.locateMiss = 0;
  state.input = '';

  if (!step) {
    renderBars(dom.bars);
    hideKeypad();
    markDone('P');
    coach(prefix + '¡Modelo de barras completo! Ahora escribe las operaciones con números.', 'ok');
    showNext('Siguiente: Abstracto →', () => { setPhase('A'); scrollToCard(); });
    return;
  }
  if (step.type === 'build') {
    renderBars(dom.bars);
    hideKeypad();
    coach(prefix + step.prompt);
    return;
  }
  if (step.target && step.locate && !P.located) {
    renderBars(dom.bars);
    hideKeypad();
    coach(prefix + step.locate);
    return;
  }
  P.located = true;
  renderBars(dom.bars);
  coach(prefix + step.prompt);
  showKeypad('num', step);
}

function onBarTap(node) {
  const P = state.p, step = currentStep();
  if (!step) return;

  if (step.type === 'build') {
    if (node.dataset.tap === 'build' && Number(node.dataset.bar) === step.bar) {
      P.built[step.bar] = (P.built[step.bar] || 0) + 1;
      const b = current().bars[step.bar];
      if (P.built[step.bar] >= b.build.count) {
        P.step++;
        P.located = false;
        startStep('¡Barra completa! ');
      } else {
        renderBars(dom.bars);
      }
    } else {
      coach('Toca la parte punteada de la barra para agregar un grupo.', 'warn');
    }
    return;
  }

  if (!step.target) { flash(dom.display); return; }

  const id = node.dataset.id || '';
  const name = node.dataset.name || '';
  if (!P.located) {
    if (id === step.target) {
      P.located = true;
      renderBars(dom.bars);
      coach('¡Esa es! ' + step.prompt);
      showKeypad('num', step);
    } else {
      P.locateMiss++;
      coach((name ? `Esa parte representa «${name}». ` : 'Esa no es. ') + step.locate, 'warn');
      if (P.locateMiss >= 2) renderBars(dom.bars); // ilumina la parte correcta como pista
    }
  } else if (id === step.target) {
    flash(dom.display);
  }
}

function checkPictorial(v) {
  const P = state.p, step = currentStep();
  if (!step || step.type !== 'num') return;
  if (v === step.answer) {
    if (step.target) P.solved[step.target] = v;
    if (step.reveal) Object.assign(P.solved, step.reveal);
    P.step++;
    P.located = false;
    startStep(pick(PRAISE) + ' ');
  } else {
    P.attempts++;
    let msg = (step.errors && step.errors[v]) || pick(TRY_AGAIN);
    if (P.attempts >= 2 && step.hint) msg += ' Pista: ' + step.hint;
    if (P.attempts >= 4) msg += ` La respuesta es ${step.plain ? fmt(step.answer) : valueText(step.answer, {})}. Escríbela para seguir.`;
    wrongFeedback(msg);
  }
}

/* ---------------------------------------------------------
   9. FASE ABSTRACTA · ECUACIONES
   --------------------------------------------------------- */
const OP_HINT = {
  '+': 'Sumamos cuando juntamos partes para formar el todo.',
  '−': 'Restamos cuando conocemos el todo y una parte, o cuando comparamos.',
  '×': 'Multiplicamos cuando repetimos grupos iguales.',
  '÷': 'Dividimos cuando repartimos o buscamos el valor de 1 unidad.'
};

function blankList(pb) {
  const out = [];
  pb.equations.forEach((line, li) => line.forEach((tok, ti) => {
    if (tok && typeof tok === 'object') out.push({ li, ti, tok, key: `${li}-${ti}` });
  }));
  return out;
}

function enterAbstract() {
  renderBars(dom.barsMini, true);
  startBlank('Ahora sin dibujos: completa las operaciones. ');
}

function renderEquations() {
  const pb = current(), A = state.a;
  const blanks = blankList(pb);
  const active = blanks[A.blank];
  const lines = pb.equations.map((line, li) => h('div', { class: 'eq-line' }, line.map((tok, ti) => {
    if (typeof tok === 'number') return h('span', { class: 'eq-num' }, fmt(tok));
    if (typeof tok === 'string') return h('span', { class: 'eq-sym' }, tok);
    const key = `${li}-${ti}`;
    const val = A.filled[key];
    const isActive = !A.done && active && active.key === key;
    let shown = '?';
    if (val != null) shown = tok.op ? val : fmt(val);
    else if (isActive && !tok.op && state.input) shown = fmt(Number(state.input));
    return h('button', {
      class: `eq-blank${tok.op ? ' op' : ''}${val != null ? ' filled' : ''}${isActive ? ' active' : ''}`,
      'aria-label': val != null ? `Respuesta: ${shown}` : (tok.op ? 'Signo por elegir' : 'Número por escribir'),
      onclick: () => { if (isActive) flash(tok.op ? dom.ops : dom.display); }
    }, shown);
  })));
  dom.eq.replaceChildren(...lines, A.done ? h('p', { class: 'answer-text' }, '✅ ' + pb.answerText) : null);
}

function startBlank(prefix = '') {
  const pb = current(), A = state.a;
  const b = blankList(pb)[A.blank];
  A.attempts = 0;
  state.input = '';

  if (!b) {
    hideKeypad();
    const first = !A.done;
    A.done = true;
    renderEquations();
    coach(prefix + pb.answerText, 'ok');
    if (first) { markDone('A'); celebrate(); }
    showNext(nextProblemLabel(), goNextProblem);
    return;
  }
  renderEquations();
  if (b.tok.op) {
    showKeypad('op');
    coach(prefix + '¿Qué signo va en el recuadro? Mira el modelo: ¿juntamos, quitamos, repetimos o repartimos?');
  } else {
    showKeypad('num', { plain: true });
    coach(prefix + 'Calcula y escribe el número que falta.');
  }
}

function lineExpression(pb, A, li) {
  const line = pb.equations[li];
  const eq = line.indexOf('=');
  const parts = line.slice(0, eq).map((tok, ti) => {
    if (typeof tok === 'number') return fmt(tok);
    if (typeof tok === 'string') return tok;
    const v = A.filled[`${li}-${ti}`];
    return v != null ? (tok.op ? v : fmt(v)) : '?';
  });
  return parts.join(' ');
}

function checkAbstractNum(v) {
  const pb = current(), A = state.a;
  const b = blankList(pb)[A.blank];
  if (!b || b.tok.op) return;
  if (v === b.tok.n) {
    A.filled[b.key] = v;
    A.blank++;
    startBlank(pick(PRAISE) + ' ');
  } else {
    A.attempts++;
    let msg = pick(TRY_AGAIN);
    if (A.attempts >= 2) msg += ` Pista: calcula ${lineExpression(pb, A, b.li)}. Puedes mirar el modelo de arriba.`;
    if (A.attempts >= 4) msg += ` La respuesta es ${fmt(b.tok.n)}.`;
    wrongFeedback(msg);
  }
}

function chooseOp(op) {
  const pb = current(), A = state.a;
  const b = blankList(pb)[A.blank];
  if (!b || !b.tok.op) return;
  if (op === b.tok.op) {
    A.filled[b.key] = op;
    A.blank++;
    startBlank(pick(PRAISE) + ' ');
  } else {
    A.attempts++;
    let msg = A.attempts === 1
      ? `Con «${op}» no llegamos al resultado del modelo. ¿Juntamos, quitamos, repetimos grupos o repartimos?`
      : OP_HINT[b.tok.op];
    if (A.attempts >= 3) msg += ` El signo es «${b.tok.op}».`;
    coach(msg, 'warn');
    flash(dom.ops);
  }
}

function nextProblemLabel() {
  const list = byLevel(state.level);
  if (state.idx + 1 < list.length) return 'Siguiente problema →';
  if (state.level < LEVELS.length) return `Ir al nivel ${state.level + 1} →`;
  return 'Volver al nivel 1';
}

function goNextProblem() {
  const list = byLevel(state.level);
  if (state.idx + 1 < list.length) return loadProblem(state.level, state.idx + 1, true);
  if (state.level < LEVELS.length) {
    toast(`🎉 ¡Terminaste el nivel ${state.level}!`);
    return loadProblem(state.level + 1, 0, true);
  }
  toast('🏆 ¡Completaste todos los niveles!');
  loadProblem(1, 0, true);
}

/* ---------------------------------------------------------
   10. Teclado numérico y de signos
   --------------------------------------------------------- */
function showKeypad(mode, ctx = null) {
  state.kpMode = mode;
  state.kpCtx = ctx;
  dom.panel.hidden = false;
  dom.keypad.hidden = mode !== 'num';
  dom.display.hidden = mode !== 'num';
  dom.ops.hidden = mode !== 'op';
  updateDisplay();
}

function hideKeypad() {
  state.kpMode = null;
  dom.panel.hidden = true;
}

function updateDisplay() {
  if (state.kpMode !== 'num') return;
  const pb = current();
  const ctx = state.kpCtx || {};
  const v = state.input ? fmt(Number(state.input)) : '';
  const pre = ctx.plain ? '' : (pb.prefix || '');
  const suf = ctx.plain ? '' : (pb.suffix || '');
  dom.display.textContent = v ? pre + v + suf : '?';
  dom.display.classList.toggle('empty', !v);
  if (state.phase === 'A') renderEquations();
}

function pressKey(k) {
  if (state.kpMode !== 'num') return;
  if (k === 'ok') return submitNumber();
  if (k === 'back') state.input = state.input.slice(0, -1);
  else if (/^\d$/.test(k) && state.input.length < 7) state.input = (state.input === '0' ? '' : state.input) + k;
  updateDisplay();
}

function submitNumber() {
  if (!state.input) { flash(dom.display); coach('Primero escribe un número con el teclado.', 'warn'); return; }
  const v = parseInt(state.input, 10);
  if (state.phase === 'P') checkPictorial(v);
  else if (state.phase === 'A') checkAbstractNum(v);
}

function wrongFeedback(msg) {
  coach(msg, 'warn');
  state.input = '';
  updateDisplay();
  dom.display.classList.remove('shake');
  void dom.display.offsetWidth; // reinicia la animación
  dom.display.classList.add('shake');
}

function flash(node) {
  node.classList.remove('flash');
  void node.offsetWidth;
  node.classList.add('flash');
}

/* ---------------------------------------------------------
   11. Lectura en voz alta (Web Speech API, funciona sin conexión en la mayoría de equipos)
   --------------------------------------------------------- */
const FRAC_WORDS = {
  2: ['medio', 'medios'], 3: ['tercio', 'tercios'], 4: ['cuarto', 'cuartos'], 5: ['quinto', 'quintos'],
  6: ['sexto', 'sextos'], 7: ['séptimo', 'séptimos'], 8: ['octavo', 'octavos'], 9: ['noveno', 'novenos'], 10: ['décimo', 'décimos']
};

function toSpeech(s) {
  return s
    .replace(/\$\s?([\d.]+)/g, (_, n) => `${n.replace(/\./g, '')} pesos`)
    .replace(/(\d+)\/(\d+)/g, (_, a, b) => {
      const w = FRAC_WORDS[b];
      if (!w) return `${a} de ${b}`;
      return a === '1' ? `un ${w[0]}` : `${a} ${w[1]}`;
    })
    .replace(/(\d)\.(\d{3})/g, '$1$2')
    .replace(/−/g, ' menos ').replace(/×/g, ' por ').replace(/÷/g, ' dividido en ');
}

function speak(text) {
  if (!('speechSynthesis' in window)) { toast('Este navegador no puede leer en voz alta.'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toSpeech(text));
  u.lang = 'es-CL';
  u.rate = 0.92;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang === 'es-CL') || voices.find(v => /^es[-_]/i.test(v.lang) || v.lang === 'es');
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

/* ---------------------------------------------------------
   12. Eventos
   --------------------------------------------------------- */
dom.tabs.addEventListener('click', e => {
  const b = e.target.closest('[data-phase]');
  if (b && b.dataset.phase !== state.phase) setPhase(b.dataset.phase);
});

dom.bars.addEventListener('click', e => {
  const node = e.target.closest('[data-tap]');
  if (node) onBarTap(node);
});

dom.keypad.addEventListener('click', e => {
  const k = e.target.closest('[data-key]');
  if (k) pressKey(k.dataset.key);
});

dom.ops.addEventListener('click', e => {
  const b = e.target.closest('[data-op]');
  if (b) chooseOp(b.dataset.op);
});

dom.reset.addEventListener('click', () => {
  const pb = current();
  if (state.phase === 'C') state.c = initConcrete(pb.concrete);
  else if (state.phase === 'P') state.p = { step: 0, located: false, locateMiss: 0, attempts: 0, solved: {}, built: {} };
  else state.a = { blank: 0, attempts: 0, filled: {}, done: false };
  setPhase(state.phase);
});

dom.speak.addEventListener('click', () => speak(current().text));
dom.coachSpeak.addEventListener('click', () => speak(dom.coach.textContent));

document.addEventListener('keydown', e => {
  if (dom.panel.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (state.kpMode === 'num') {
    if (/^\d$/.test(e.key)) { pressKey(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { pressKey('back'); e.preventDefault(); }
    else if (e.key === 'Enter') { pressKey('ok'); e.preventDefault(); }
  } else if (state.kpMode === 'op') {
    const map = { '+': '+', '-': '−', '*': '×', x: '×', X: '×', '/': '÷', ':': '÷' };
    if (map[e.key]) { chooseOp(map[e.key]); e.preventDefault(); }
  }
});

/* ---------------------------------------------------------
   13. PWA: instalación y Service Worker
   --------------------------------------------------------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  dom.install.hidden = false;
});
dom.install.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch { /* ignorado */ }
  deferredPrompt = null;
  dom.install.hidden = true;
});
window.addEventListener('appinstalled', () => { dom.install.hidden = true; toast('¡App instalada!'); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service Worker no registrado:', err));
  });
}

/* ---------------------------------------------------------
   14. Inicio
   --------------------------------------------------------- */
(function init() {
  renderStars();
  const last = progress.last;
  const valid = last && LEVELS.some(L => L.id === last.level) && byLevel(last.level)[last.idx];
  loadProblem(valid ? last.level : 1, valid ? last.idx : 0);
})();
