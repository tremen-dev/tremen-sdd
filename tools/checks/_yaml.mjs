// Parser YAML MÍNIMO para validar los agentes de Kimi Code en los checks y tests.
// Node no trae YAML y el núcleo del repo no admite dependencias externas
// (nucleo-aislado). Este loader NO es YAML general: cubre exactamente el subset
// que usan los agentes Kimi de tremen-sdd —mapas anidados por indentación de 2
// espacios, secuencias de escalares (`- item`) y escalares con o sin comillas—.
// Si un fichero usa algo fuera de ese subset, es un error de forma del adaptador
// y el parser debe fallar en vez de adivinar.

function desescala(v) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// Convierte el texto en una lista de líneas significativas {indent, texto},
// descartando blancos y comentarios de línea completa.
function lineasSignificativas(texto) {
  const out = [];
  const crudas = texto.split(/\r?\n/);
  for (let i = 0; i < crudas.length; i++) {
    const linea = crudas[i];
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    const indent = linea.length - linea.trimStart().length;
    out.push({ indent, texto: linea.trim(), n: i + 1 });
  }
  return out;
}

// Parsea el bloque cuyas líneas están en `lineas[pos..]` con sangría === indent.
// Devuelve [valor, siguientePos]. Un bloque es mapa (claves `k:`) o secuencia
// (ítems `- `); mezclarlos al mismo nivel es error.
function parseBloque(lineas, pos, indent) {
  if (lineas[pos].texto.startsWith('- ') || lineas[pos].texto === '-') {
    const arr = [];
    while (pos < lineas.length && lineas[pos].indent === indent && lineas[pos].texto.startsWith('-')) {
      arr.push(desescala(lineas[pos].texto.replace(/^-\s*/, '')));
      pos++;
    }
    return [arr, pos];
  }

  const obj = {};
  while (pos < lineas.length && lineas[pos].indent === indent) {
    const { texto, n } = lineas[pos];
    const kv = texto.match(/^([\w][\w.-]*):\s*(.*)$/);
    if (!kv) throw new Error(`YAML inválido en la línea ${n}: se esperaba 'clave:' o '- item' con sangría ${indent}, y llegó "${texto}".`);
    const [, clave, valor] = kv;
    if (valor !== '') {
      obj[clave] = desescala(valor);
      pos++;
    } else {
      const hijo = pos + 1;
      if (hijo >= lineas.length || lineas[hijo].indent <= indent) {
        obj[clave] = null; // clave sin bloque hijo
        pos++;
      } else {
        const [valorHijo, sig] = parseBloque(lineas, hijo, lineas[hijo].indent);
        obj[clave] = valorHijo;
        pos = sig;
      }
    }
  }
  return [obj, pos];
}

export function parseYamlKimi(texto) {
  const lineas = lineasSignificativas(texto);
  if (!lineas.length) return {};
  if (lineas[0].indent !== 0) {
    throw new Error(`YAML inválido: la primera línea significativa "${lineas[0].texto}" no está al margen izquierdo.`);
  }
  const [valor] = parseBloque(lineas, 0, 0);
  return valor;
}
