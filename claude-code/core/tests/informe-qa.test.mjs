import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderReport } from '../scripts/informe-qa.mjs';

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ledger = path.join(dir, 'SPEC-001-alta.ledger.md');
  fs.writeFileSync(ledger, '---\nid: SPEC-001\ntipo: ledger\nepica: EPIC-001\n---\n# Ledger — SPEC-001\n\n## Veredicto del verificador\nGREEN (2026-07-09)\n');
  const qa = path.join(dir, '_qa', 'SPEC-001');
  fs.mkdirSync(qa, { recursive: true });
  fs.writeFileSync(path.join(qa, 'ca1-movil.png'), PNG_1PX);
  return ledger;
}

test('genera html autocontenido con la captura embebida', () => {
  const { html, out } = renderReport(fixture());
  assert.match(html, /<html/);
  assert.match(html, /data:image\/png;base64,/);
  assert.match(html, /ca1-movil/);
  assert.ok(out.endsWith(path.join('_qa', 'SPEC-001', 'informe.html')));
});

test('incluye el contenido del ledger (veredicto)', () => {
  const { html } = renderReport(fixture());
  assert.match(html, /GREEN \(2026-07-09\)/);
});

test('falla claro si no existe carpeta _qa', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ledger = path.join(dir, 'SPEC-002-x.ledger.md');
  fs.writeFileSync(ledger, '---\nid: SPEC-002\ntipo: ledger\n---\n# L\n');
  assert.throws(() => renderReport(ledger), /_qa/);
});

test('despacha .WEBM en mayúsculas como <video>, no como <img>', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-'));
  const ledger = path.join(dir, 'SPEC-003-clip.ledger.md');
  fs.writeFileSync(ledger, '---\nid: SPEC-003\ntipo: ledger\n---\n# L\n');
  const qa = path.join(dir, '_qa', 'SPEC-003');
  fs.mkdirSync(qa, { recursive: true });
  fs.writeFileSync(path.join(qa, 'demo.WEBM'), Buffer.from('dummy-video-bytes'));
  const { html } = renderReport(ledger);
  assert.match(html, /<video/);
  assert.match(html, /data:video\/webm;base64,/);
  assert.doesNotMatch(html, /<img[^>]*demo\.WEBM/);
});
