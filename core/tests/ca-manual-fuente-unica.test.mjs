import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// SPEC-030 CA-7.3 (ADR-020, Consecuencias): valida.mjs y estado.mjs usan el lector
// único; ninguno de los dos reconoce por su cuenta la marca [manual] ni las marcas
// de Estado del ledger.
const CORE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fuente = (rel) => fs.readFileSync(path.join(CORE, 'scripts', rel), 'utf8')
  .replace(/^\s*\/\/.*$/gm, ''); // los comentarios pueden nombrar el modelo; el código no lo reconoce

for (const script of ['valida.mjs', 'estado.mjs']) {
  test(`CA-7: ${script} importa el lector y no tiene reconocimiento propio de la marca ni de las marcas de Estado`, () => {
    const src = fuente(script);
    assert.match(src, /import \{[^}]*\} \w+ .\.\.\/lib\/ca-manual\.mjs./, 'importa el lector');
    assert.doesNotMatch(src, /\[manual\]|\\\[manual/, 'reconoce [manual] por su cuenta');
    assert.doesNotMatch(src, /CA-M|CA-\\d|CA-M\?/, 'reconoce ids de CA por su cuenta');
    for (const marca of ['✅', '⚠', '🚧', '❌', '⏳', "'n-a'", 'salvedad', 'confirmado', 'desviaci']) {
      assert.ok(!src.includes(marca), `${script} contiene «${marca}» fuera de comentarios`);
    }
  });
}
