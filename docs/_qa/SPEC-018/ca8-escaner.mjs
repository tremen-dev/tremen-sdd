import fs from 'node:fs';
const files = ['README.md', 'FOUNDATION.md',
  ...fs.readdirSync('docs/fundacion').filter(f => f.endsWith('.md')).map(f => 'docs/fundacion/' + f)];
const SUST = 'adaptador|adaptadores|check|checks|rol|roles|papel|papeles|regla|reglas|hook|hooks|harness|harnesses';
const CARD = 'dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|2|3|4|5|6|7|8|9|10|11|12';
const enmascara = (s) => s
  .replace(/\b(?:RN|ADR|SPEC|EPIC|TASK|CA|CE|F-SPEC|L|D)-?\d+(?:-\d+)*/g, (m) => ' '.repeat(m.length))
  .replace(/\bv?\d+\.\d+(?:\.\d+)?\b/g, (m) => ' '.repeat(m.length));
const RE = new RegExp(`\\b(?:\\*\\*)?(${CARD})(?:\\*\\*)?\\s+(?:[\\wáéíóúñ]+\\s+){0,2}(${SUST})\\b`, 'gi');
let n = 0;
for (const f of files) {
  const bruto = fs.readFileSync(f, 'utf8');
  const txt = enmascara(bruto);
  const plano = txt.replace(/\n/g, ' ');
  for (const m of plano.matchAll(RE)) {
    const linea = txt.slice(0, m.index).split('\n').length;
    n++;
    console.log(String(n).padStart(2), `${f}:${linea}`, '::', m[0].replace(/\s+/g, ' '));
  }
}
console.log('TOTAL pares cardinal+sustantivo =', n);
