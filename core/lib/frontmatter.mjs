// Frontmatter YAML restringido: escalares string, listas planas y listas de
// objetos inline {k: v}. Suficiente para los artefactos tremen-sdd; no es YAML general.

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let currentKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const listItem = raw.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      data[currentKey].push(parseValue(listItem[1]));
      continue;
    }
    const kv = raw.match(/^([\w][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      data[key] = [];
      currentKey = key;
    } else {
      data[key] = parseValue(value);
      currentKey = null;
    }
  }
  return { data, body: text.slice(m[0].length) };
}

function parseValue(v) {
  v = v.trim();
  if (v.startsWith('{') && v.endsWith('}')) return parseInline(v.slice(1, -1));
  return v;
}

// Pares `clave: valor` de un objeto inline, separados por comas fuera de comillas
// (SPEC-031). Un valor puede ir entre comillas dobles (escapes \" y \\) o simples
// ('' es un apóstrofo). Sin comillas, el valor llega hasta la siguiente coma,
// como siempre. Unas comillas sin cerrar, o con texto detrás antes de la coma, se
// leen como valor sin comillas: el mismo resultado que antes del fix.
function parseInline(s) {
  const obj = {};
  let i = 0;
  while (i < s.length) {
    const colon = s.indexOf(':', i);
    const comma = s.indexOf(',', i);
    if (colon === -1 || (comma !== -1 && comma < colon)) {
      if (comma === -1) break;
      i = comma + 1; // par sin clave: se ignora, como antes
      continue;
    }
    const key = s.slice(i, colon).trim();
    let j = colon + 1;
    while (j < s.length && s[j] === ' ') j++;
    const quoted = readQuoted(s, j);
    if (quoted) {
      obj[key] = quoted.value;
      i = quoted.end + 1;
    } else {
      const end = s.indexOf(',', j);
      obj[key] = s.slice(j, end === -1 ? s.length : end).trim();
      i = end === -1 ? s.length : end + 1;
    }
  }
  return obj;
}

// Lee un valor entrecomillado que empieza en `start`. Devuelve { value, end }
// (end: índice de la coma que lo cierra, o s.length) o null si no lo es.
function readQuoted(s, start) {
  const q = s[start];
  if (q !== '"' && q !== "'") return null;
  let value = '';
  let k = start + 1;
  for (;;) {
    if (k >= s.length) return null;
    const c = s[k];
    if (q === '"' && c === '\\' && (s[k + 1] === '"' || s[k + 1] === '\\')) {
      value += s[k + 1];
      k += 2;
    } else if (c === q && q === "'" && s[k + 1] === "'") {
      value += "'";
      k += 2;
    } else if (c === q) {
      k++;
      break;
    } else {
      value += c;
      k++;
    }
  }
  while (k < s.length && s[k] === ' ') k++;
  if (k < s.length && s[k] !== ',') return null;
  return { value, end: k };
}

export function stringifyFrontmatter(data, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${typeof item === 'object' ? inline(item) : item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n') + body;
}

function inline(obj) {
  return '{' + Object.entries(obj).map(([k, v]) => `${k}: ${inlineValue(v)}`).join(', ') + '}';
}

// Entrecomilla solo lo que no sobreviviría a parseInline sin comillas (SPEC-031
// CA-2); el resto se escribe tal cual, como siempre.
function inlineValue(v) {
  if (typeof v !== 'string') return v;
  if (!/[,:{}"]/.test(v) && !v.startsWith("'") && !/^\s|\s$/.test(v)) return v;
  return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
