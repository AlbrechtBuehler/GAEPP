/* GAEPP — Pruefstand: das gemeinsame Handwerkszeug.
   Ein echter Webserver, ein echter Origin, ein echter Browser — der localStorage
   eines file-Origins wird beim Neuladen verworfen, und wer Persistenz prueft,
   braucht einen echten Origin.

   Die Startdatei wird NICHT aus dem Repo gelesen, sondern aus vorrat.mjs
   erzeugt: Im oeffentlichen Repo darf keine Datendatei liegen (A-78/A-79). */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { daten } from './vorrat.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
export const WURZEL = join(hier, '..');

const typ = p => p.endsWith('.html') ? 'text/html; charset=utf-8'
  : p.endsWith('.json') ? 'application/json; charset=utf-8'
  : p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript' : 'text/plain; charset=utf-8';

export async function serve(port) {
  const server = createServer(async (q, a) => {
    const pfad = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    if (pfad === 'gaepp-daten.json') {
      a.writeHead(200, { 'Content-Type': typ(pfad) });
      return a.end(JSON.stringify(daten()));
    }
    /* Erst lesen, dann antworten — sonst stehen die Kopfzeilen schon, wenn das
       Lesen misslingt, und der Server bricht mit ERR_HTTP_HEADERS_SENT ab. */
    let inhalt;
    try { inhalt = await readFile(join(WURZEL, pfad)); }
    catch { a.writeHead(404); return a.end('nicht da'); }
    a.writeHead(200, { 'Content-Type': typ(pfad) });
    a.end(inhalt);
  });
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  return server;
}

/* Ein gestellter Tag statt des Kalenders — sonst wird ein Lauf am 1. September
   von selbst rot, ohne dass sich etwas geaendert haette. */
export async function browser(port, ort) {
  /* GAEPP_CHROME erlaubt einen bereits vorhandenen Chromium. Ohne die Variable
     nimmt Playwright seinen eigenen — so laeuft der Lauf auf jedem Rechner. */
  const wie = process.env.GAEPP_CHROME
    ? { executablePath: process.env.GAEPP_CHROME, args: ['--no-sandbox'] } : {};
  const b = await chromium.launch(wie);
  const kontext = await b.newContext({ viewport: { width: 1440, height: 900 },
    locale: 'de-CH', timezoneId: 'Europe/Zurich' });
  const seite = await kontext.newPage();
  const fehler = [];
  seite.on('pageerror', e => fehler.push(String(e)));
  /* Nicht geladene Schriften und ein fehlendes Favicon sind kein Fehler der App —
     der Prueflauf hat kein Netz. Alles andere zaehlt. */
  const belanglos = t => /Failed to load resource|favicon|fonts\.g/i.test(t);
  seite.on('console', m => { if (m.type() === 'error' && !belanglos(m.text()))
    fehler.push('console: ' + m.text()); });
  await seite.goto('http://127.0.0.1:' + port + '/' + (ort || 'index.html'));
  await seite.waitForFunction(() => document.querySelectorAll('table').length > 0,
    null, { timeout: 8000 });
  return { b, kontext, seite, fehler };
}

/* Der Zustand der laufenden App, gelesen statt geraten. */
export const zustand = (seite, ausdruck) => seite.evaluate('(' + ausdruck + ')');

/* Warten, bis GAEPP neu gezeichnet hat. Jede Bedienung zeichnet das Blatt neu;
   ein fester Zeitwert waere geraten — deshalb auf eine Bedingung warten. */
export const bisRuhe = (seite) => seite.waitForTimeout(60);

export function bilanzbuch(name) {
  let gut = 0, schlecht = 0;
  const pruef = (was, ok, ist) => {
    if (ok) { gut++; console.log('  gruen  ' + was); }
    else { schlecht++; console.log('  ROT    ' + was + (ist !== undefined ? '  ->  ' + ist : '')); }
  };
  const gleich = (was, ist, soll) => pruef(was + '  (' + soll + ')', ist === soll, ist);
  const ende = (fehler) => {
    (fehler || []).forEach(f => { schlecht++; console.log('  ROT    JavaScript-Fehler: ' + f); });
    console.log('\n  ' + gut + ' gruen, ' + schlecht + ' rot');
    console.log('BILANZ ' + name + ' ' + gut + ' ' + schlecht);
    process.exit(schlecht ? 1 : 0);
  };
  return { pruef, gleich, ende };
}
