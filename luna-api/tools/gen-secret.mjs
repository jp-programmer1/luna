#!/usr/bin/env node
// Genera un secreto (equivalente a `openssl rand -base64 48`) y lo guarda en luna-api/.env.
// Uso:
//   pnpm --filter luna-api secret                    → completa PREVIEW_SECRET si está vacío
//   pnpm --filter luna-api secret REVALIDATE_TOKEN   → otra variable
//   pnpm --filter luna-api secret PREVIEW_SECRET --force   → la reemplaza aunque tenga valor
//   pnpm --filter luna-api secret --print            → solo lo muestra, no toca nada
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const force = args.includes('--force');
const printOnly = args.includes('--print');
const name = args.find((a) => !a.startsWith('--')) ?? 'PREVIEW_SECRET';

if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
  console.error(`Nombre de variable inválido: ${name}`);
  process.exit(1);
}

const secret = randomBytes(48).toString('base64');
if (printOnly) {
  console.log(secret);
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
if (!existsSync(envPath)) {
  copyFileSync(join(root, '.env.example'), envPath);
  console.log('Creé luna-api/.env a partir de .env.example');
}

const lines = readFileSync(envPath, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith(`${name}=`));
const current = i === -1 ? '' : lines[i].slice(name.length + 1).trim();

if (current && !force) {
  console.log(`${name} ya tiene valor. Usá --force para reemplazarlo.`);
  process.exit(0);
}

if (i === -1) lines.push(`${name}=${secret}`);
else lines[i] = `${name}=${secret}`;
writeFileSync(envPath, lines.join('\n'));
console.log(`Listo: ${name} guardado en luna-api/.env`);
