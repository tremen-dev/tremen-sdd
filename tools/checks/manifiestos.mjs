#!/usr/bin/env node
// CA-8 (a): los manifiestos del artefacto construido son válidos y descubribles.
//  - .claude-plugin/marketplace.json (raíz) es válido y su source resuelve a
//    dist/<harness>/, que contiene un .claude-plugin/plugin.json válido;
//  - plugin.json tiene agents que resuelven a ficheros existentes;
//  - hooks.json es válido; skills/, commands/, hooks/ existen (auto-discovery).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './_util.mjs';
import { parseYamlKimi } from './_yaml.mjs';
import { esEntrypoint } from '../../core/lib/entrypoint.mjs';

const leeJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// Roles del pipeline Kimi (mapa subagents del raíz). El raíz ES el orquestador.
const ROLES_KIMI = ['sdd-producto', 'sdd-arquitecto', 'sdd-implementador', 'sdd-verificador', 'sdd-documentalista', 'sdd-como-vamos'];
const READONLY_KIMI = ['sdd-verificador', 'sdd-como-vamos'];
const TOOLS_ESCRITURA = ['Write', 'Edit'];

export function checkManifiestos(repoRoot = REPO_ROOT, harness = 'claude-code') {
  // Kimi no usa marketplace/plugin.json/hooks.json: su manifiesto son los agentes
  // YAML (raíz + subagentes) y el fragmento [[hooks]]. Ruta de validación propia.
  if (harness === 'kimi-code') return checkManifiestosKimi(path.join(repoRoot, 'dist', harness));

  const errores = [];
  const distDir = path.join(repoRoot, 'dist', harness);

  // marketplace.json en la raíz
  const mkPath = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
  let mk;
  try { mk = leeJson(mkPath); } catch { errores.push('.claude-plugin/marketplace.json inválido o ausente'); }
  if (mk) {
    const plugin = (mk.plugins ?? []).find((p) => (p.source ?? '').replace(/\/$/, '') === `./dist/${harness}`);
    if (!plugin) errores.push(`marketplace.json no tiene un plugin con source "./dist/${harness}"`);
    else {
      const src = path.join(repoRoot, plugin.source);
      if (!fs.existsSync(path.join(src, '.claude-plugin', 'plugin.json'))) {
        errores.push(`el source ${plugin.source} no resuelve a un plugin (falta .claude-plugin/plugin.json). ¿Falta el build?`);
      }
    }
  }

  // plugin.json del artefacto
  const plgPath = path.join(distDir, '.claude-plugin', 'plugin.json');
  let plg;
  try { plg = leeJson(plgPath); } catch { errores.push(`falta o es inválido ${path.relative(repoRoot, plgPath)} (¿falta el build?)`); }
  if (plg) {
    if (!Array.isArray(plg.agents) || plg.agents.length === 0) errores.push('plugin.json sin array agents');
    for (const a of plg.agents ?? []) {
      if (!fs.existsSync(path.join(distDir, a))) errores.push(`plugin.json: agent no existe en el artefacto: ${a}`);
    }
  }

  // hooks.json válido + dirs de auto-discovery
  const hooksJson = path.join(distDir, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksJson)) { try { leeJson(hooksJson); } catch { errores.push('hooks/hooks.json inválido'); } }
  else errores.push('falta hooks/hooks.json en el artefacto');
  for (const d of ['skills', 'commands', 'hooks']) {
    if (!fs.existsSync(path.join(distDir, d))) errores.push(`falta ${d}/ en el artefacto (auto-discovery)`);
  }

  return { ok: errores.length === 0, errores };
}

// CA-11: valida los agentes YAML de Kimi (raíz + subagentes), su mapa subagents y
// los allowed_tools explícitos por rol (escritura para el implementador, read-only
// para verificador y como-vamos), más el fragmento [[hooks]].
export function checkManifiestosKimi(distDir) {
  const errores = [];
  if (!fs.existsSync(distDir)) { errores.push('falta dist/kimi-code (¿falta el build?)'); return { ok: false, errores }; }

  // Fragmento [[hooks]] con los dos hooks del adaptador.
  const toml = path.join(distDir, 'hooks', 'hooks.toml');
  if (!fs.existsSync(toml)) errores.push('falta hooks/hooks.toml en el artefacto');
  else {
    const s = fs.readFileSync(toml, 'utf8');
    for (const h of ['require-spec.mjs', 'protege-verdad.mjs']) {
      if (!s.includes(h)) errores.push(`hooks.toml no referencia el hook ${h}`);
    }
  }

  // Agente RAÍZ = orquestador, con el mapa subagents completo.
  const raizPath = path.join(distDir, 'agents', 'sdd-orquestador.yaml');
  let raiz;
  try { raiz = parseYamlKimi(fs.readFileSync(raizPath, 'utf8')); } catch (e) { errores.push(`raíz sdd-orquestador.yaml inválido: ${e.message}`); }
  if (raiz) {
    if (!raiz.version) errores.push('el raíz no declara version');
    if (raiz.agent?.name !== 'sdd-orquestador') errores.push('el raíz agent.name != sdd-orquestador');
    if (!raiz.system_prompt_path) errores.push('el raíz no declara system_prompt_path');
    const subs = raiz.subagents ?? {};
    for (const rol of ROLES_KIMI) {
      if (!subs[rol]) { errores.push(`el mapa subagents del raíz no declara ${rol}`); continue; }
      const p = subs[rol].path;
      if (!p) { errores.push(`subagents.${rol} sin path`); continue; }
      if (!fs.existsSync(path.resolve(path.dirname(raizPath), p))) errores.push(`subagents.${rol}: path no existe en el artefacto: ${p}`);
    }
  }

  // Subagentes: YAML válido, extend: default, system prompt, allowed_tools por rol.
  for (const rol of ROLES_KIMI) {
    const fp = path.join(distDir, 'agents', `${rol}.yaml`);
    if (!fs.existsSync(fp)) { errores.push(`falta agents/${rol}.yaml`); continue; }
    let doc;
    try { doc = parseYamlKimi(fs.readFileSync(fp, 'utf8')); } catch (e) { errores.push(`${rol}.yaml inválido: ${e.message}`); continue; }
    if (!doc.version) errores.push(`${rol}: sin version`);
    if (doc.agent?.name !== rol) errores.push(`${rol}: agent.name != ${rol}`);
    if (!doc.system_prompt_path) errores.push(`${rol}: sin system_prompt_path`);
    if (doc.extend !== 'default') errores.push(`${rol}: falta 'extend: default'`);
    const tools = doc.allowed_tools;
    if (!Array.isArray(tools) || tools.length === 0) {
      errores.push(`${rol}: allowed_tools ausente o vacío (herencia implícita prohibida — CA-11c)`);
    } else if (READONLY_KIMI.includes(rol)) {
      const escritura = tools.filter((t) => TOOLS_ESCRITURA.includes(t));
      if (escritura.length) errores.push(`${rol}: debe ser read-only y declara herramientas de escritura (${escritura.join(', ')})`);
    }
  }

  return { ok: errores.length === 0, errores };
}

if (esEntrypoint(import.meta.url, process.argv[1])) {
  const { ok, errores } = checkManifiestos(REPO_ROOT, process.argv[2] || 'claude-code');
  if (!ok) { console.error('[manifiestos] FALLA:\n' + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  console.log('[manifiestos] OK: manifiestos válidos y artefacto descubrible.');
}
