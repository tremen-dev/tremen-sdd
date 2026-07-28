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
  if (v.startsWith('{') && v.endsWith('}')) {
    const obj = {};
    for (const pair of v.slice(1, -1).split(',')) {
      const i = pair.indexOf(':');
      if (i === -1) continue;
      obj[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
    return obj;
  }
  return v;
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
  return '{' + Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ') + '}';
}
