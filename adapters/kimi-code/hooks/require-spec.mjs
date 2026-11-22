#!/usr/bin/env node
// Gate PreToolUse (L1) para Kimi Code: no se edita código vigilado sin rama
// ft/SPEC-NNN-slug y spec en 'aprobada'/'en-progreso'. FAIL-OPEN ante un fallo
// interno; con un .sdd.json ilegible DENIEGA salvo el propio fichero (ADR-017). Válvula:
// SDD_SKIP_GATE=1. La DECISIÓN require-spec (rama + spec + estado) NO vive aquí:
// es fuente única en core/lib/require-spec.mjs y se COMPARTE con Claude y con el
// pre-commit L2 (RN-01, ADR-002). Este entrypoint solo hace SHIM del payload de
// Kimi e invoca esa lógica; no reimplementa el parseo de rama ni de estado.
import { execSync } from 'node:child_process';
import { readPayload, readConfig, normaliza, esRutaVigilada, deny, allow, esSddJsonDe, mensajeSddJsonIlegible } from './_comun.mjs';
import { evaluarRequireSpec } from '../core/lib/require-spec.mjs';

try {
  if (process.env.SDD_SKIP_GATE === '1') allow();
  const payload = readPayload();
  const { cwd, filePath } = normaliza(payload);
  const lectura = readConfig(cwd);
  if (lectura.estado === 'ausente') allow(); // proyecto sin tremen-sdd (ADR-015)
  if (!filePath) allow();
  if (lectura.estado === 'ilegible') {
    if (esSddJsonDe(cwd, filePath)) allow(); // para poder arreglarlo
    deny(mensajeSddJsonIlegible(lectura));
  }
  const cfg = lectura.config;
  if (cfg.gates?.requireSpec === false) allow();
  if (!esRutaVigilada(cfg, cwd, filePath)) allow();
  const rama = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  const { permitido, motivo } = evaluarRequireSpec({ rama, cwd });
  if (!permitido) deny(motivo);
  allow();
} catch { allow(); } // fail-open
