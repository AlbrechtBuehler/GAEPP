/* GAEPP — Pruefstand: der Sammellauf.
   Ein Befehl, von hier aus:      node pruefstand/alles.mjs
   Er startet den Webserver selbst, faehrt jeden Lauf und rechnet die Bilanz nach.

   Regel 7 des Pruefstands: Ein neuer Lauf wird hier eingetragen, sonst zaehlt er nicht mit.
   Regel 8 (neu, 21.08.2026): Die Gesamtzahl wird NACHGERECHNET, nie fortgeschrieben.
     Sie steht in keinem Dokument als Konstante — sie steht hier unten im Ergebnis. */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..');
const PORT = 8099;

const LAEUFE = [
  { datei: 'huelle.mjs',   was: 'A-78 — keine Daten in der Huelle', browser: false },
  { datei: 'bau.mjs',      was: 'U-89 bis U-93 — Budgetzeile, Rechnungskarte, Nachziehen', browser: true },
  { datei: 'handbuch.mjs', was: 'U-94 — das Benutzerhandbuch', browser: true }
];

const typ = p => p.endsWith('.html') ? 'text/html; charset=utf-8'
           : p.endsWith('.js') ? 'text/javascript' : 'text/plain; charset=utf-8';

const server = createServer(async (q, a) => {
  try {
    const pfad = join(wurzel, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    a.writeHead(200, { 'Content-Type': typ(pfad) });
    a.end(await readFile(pfad));
  } catch { a.writeHead(404); a.end('nicht da'); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const fahre = (datei) => new Promise(fertig => {
  const k = spawn(process.execPath, [join(hier, datei), join(wurzel, 'index.html')], { stdio: ['ignore', 'pipe', 'inherit'] });
  let aus = '';
  k.stdout.on('data', d => { aus += d; process.stdout.write(d); });
  k.on('close', code => {
    const m = aus.match(/^BILANZ \S+ (\d+) (\d+)$/m);
    fertig(m ? { gut: +m[1], schlecht: +m[2] } : { gut: 0, schlecht: 0, kaputt: true, code });
  });
});

const bilanz = [];
for (const l of LAEUFE) {
  console.log('\n' + '='.repeat(62));
  console.log('  ' + l.datei + '   ·   ' + l.was);
  console.log('='.repeat(62));
  bilanz.push({ ...l, ...(await fahre(l.datei)) });
}
server.close();

const gut = bilanz.reduce((a, x) => a + x.gut, 0);
const schlecht = bilanz.reduce((a, x) => a + x.schlecht, 0);
const kaputt = bilanz.filter(x => x.kaputt);

console.log('\n' + '='.repeat(62));
console.log('  BILANZ');
console.log('='.repeat(62));
for (const b of bilanz) {
  console.log(`  ${b.datei.padEnd(14)} ${String(b.gut).padStart(4)} gruen  ${String(b.schlecht).padStart(3)} rot` +
              (b.kaputt ? '   ABGEBROCHEN (Code ' + b.code + ')' : ''));
}
console.log('  ' + '-'.repeat(58));
console.log(`  ${'zusammen'.padEnd(14)} ${String(gut).padStart(4)} gruen  ${String(schlecht).padStart(3)} rot`);
console.log('='.repeat(62));
console.log('  Diese Zahl ist nachgerechnet, nicht fortgeschrieben.');
process.exit(schlecht || kaputt.length ? 1 : 0);
