/* GAEPP — Pruefstand: die Ausgabe.
   Drei Wege fuehren aus dem Werkzeug hinaus — die HTML-Datei, die CSV-Dateien
   und das Papier. Alle drei sind Endprodukte: was hier falsch ist, faellt
   niemandem mehr auf, weil niemand mehr hinschaut. Deshalb wird nicht der
   Quelltext des Exports gelesen, sondern die gesicherte Datei in einer zweiten
   Seite GEOEFFNET und dort gemessen — sichtbarer Text, berechnete Farben,
   wirkliche Klicks. Gemessen wird gegen den Pruefvorrat und gegen die laufende
   App, nie gegen ein Vorkommen im CSS-Text.

   23.08.2026 — die dritte Kopfzeile des Fensters ist gestrichen (Blatttitel
   links, Legende rechts), und mit ihr die Klasse .kopf3. Die Zeile «die
   Fensterleiste ist weg» fragte nach ihr und lief ins Leere; sie ist
   nachgezogen. Der Druck selbst ist davon unberuehrt — er hat immer seinen
   eigenen Kopf getragen. Damit eine Streichung im Fenster den Papierkopf nicht
   stillschweigend mitnimmt, wird dieser jetzt ausdruecklich gelesen:
   Wortmarke, Blatttitel, Stichmonat, gestellter Tag und gelesene Version. */

import { createServer } from 'http';
import { mkdtempSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { serve, browser, bisRuhe, bilanzbuch, WURZEL } from './hilfe.mjs';
import { daten, STICHMONAT, JAHRE } from './vorrat.mjs';

const PORT = 8733;
/* Ein zweiter, winziger Server nur fuer die gesicherte Datei. Sie darf nicht ins
   Repo gelegt werden (A-78), und ein file://-Origin laesst sich nicht abriegeln:
   route() greift dort nicht. Also bekommt das temporaere Verzeichnis einen
   eigenen Origin auf 127.0.0.1 — dann ist «alles ausser 127.0.0.1 abwuergen»
   eine Aussage ueber die Datei und nicht ueber den Prueflauf. */
const PORT_DATEI = 8743;

/* Ein gestellter Tag fuer den Kopf des Papiers. Er traegt «gedruckt am» aus dem
   Kalender des Rechners; ein Lauf, der den echten Tag erwartet, waere morgen
   rot. Der Tag wird darum in der Seite gestellt und danach zurueckgegeben.
   (Die Exportdatei weiter unten laeuft in einer zweiten Seite, deren Kalender
   dieser Lauf nicht stellt — dort wird die FORM der Zeile geprueft; das steht
   an jener Stelle als Kommentar.) */
const TAG      = { j: 2027, m: 3, t: 14 };
const zwei     = n => (n < 10 ? '0' : '') + n;
const TAG_TEXT = zwei(TAG.t) + '.' + zwei(TAG.m) + '.' + TAG.j;
const TAG_ISO  = TAG.j + '-' + zwei(TAG.m) + '-' + zwei(TAG.t) + 'T10:00:00';

/* Die Version fuehrt der Quelltext. Sie wird GELESEN, nicht abgeschrieben —
   sonst veraltet der Lauf beim naechsten Sprung, ohne dass es auffaellt. */
const VERSION = /const VERSION = '([^']+)'/
  .exec(readFileSync(join(WURZEL, 'index.html'), 'utf8'))[1];

const server = await serve(PORT);
const { b, kontext, seite, fehler } = await browser(PORT);
const { pruef, gleich, ende } = bilanzbuch('ausgabe');

const tmp = mkdtempSync(join(tmpdir(), 'gaepp-ausgabe-'));
const dateiServer = createServer((q, a) => {
  const p = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '');
  let inhalt; try { inhalt = readFileSync(join(tmp, p)); }
  catch { a.writeHead(404); return a.end('nicht da'); }
  a.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8'
    : 'text/plain; charset=utf-8' });
  a.end(inhalt);
});
await new Promise(r => dateiServer.listen(PORT_DATEI, '127.0.0.1', r));

/* ---------------------------------------------------------- Handgriffe --- */

/* Das Quadrat oben rechts oeffnet das Fenster. */
const fensterAuf = async () => { await seite.click('[data-exp]'); await bisRuhe(seite); };

/* Ein Haken wird gesetzt, indem man ihn anschaut und nur dann klickt, wenn er
   falsch steht — sonst haengt der Lauf an der Vorgabe des Werkzeugs. */
async function hakenAuf(was, soll) {
  const wahl = '[data-exp-' + was + ']';
  const ist = await seite.$eval(wahl, e => e.classList.contains('an'));
  if (ist !== soll) { await seite.click(wahl); await bisRuhe(seite); }
  return seite.$eval(wahl, e => e.classList.contains('an'));
}

/* Der Export laeuft ueber den Download-Weg des Browsers. Gewartet wird auf die
   erwartete Zahl von Dateien, nicht auf eine Zeitspanne. */
async function faengtAb(tat, anzahl) {
  const eingang = [];
  const horch = d => eingang.push(d);
  seite.on('download', horch);
  await tat();
  const bis = Date.now() + 15000;
  while (eingang.length < anzahl && Date.now() < bis) await seite.waitForTimeout(60);
  seite.off('download', horch);
  const raus = [];
  for (const d of eingang) {
    const name = d.suggestedFilename();
    const pfad = join(tmp, name);
    await d.saveAs(pfad);
    raus.push({ name, pfad, text: readFileSync(pfad, 'utf8'), bytes: statSync(pfad).size });
  }
  return raus;
}

/* Eine Farbe ist hell oder dunkel — gemessen an ihrer Helligkeit, nicht an
   ihrer Schreibweise. So bleibt die Pruefung richtig, wenn jemand den Ton
   um eine Nuance verschiebt. */
function helligkeit(rgb) {
  const m = String(rgb).match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return null;
  const [r, g, bl] = m.slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
}

/* Alle Betraege des Pruefvorrats, die gross genug sind, um kein Zufall zu sein:
   vierstellig aufwaerts und keine Jahreszahl. Nach genau diesen Zahlen wird in
   den Kommentaren der Exportdatei gesucht (der Fall U-79). */
function vorratsBetraege() {
  const d = daten(), menge = new Set();
  const nimm = v => { const n = Math.abs(Math.round(v || 0));
    if (n >= 1000 && !(n >= 1900 && n <= 2100)) menge.add(String(n)); };
  Object.keys(d.daten).forEach(j => d.daten[j].forEach(bl => {
    (bl.pos || []).forEach(p => { nimm(p.basis); (p.reihe || []).forEach(nimm); });
    (bl.gruppen || []).forEach(g => (g.pos || []).forEach(p => {
      nimm(p.basis); (p.reihe || []).forEach(nimm); }));
  }));
  Object.keys(d.rechnungen).forEach(j => (d.rechnungen[j] || []).forEach(g =>
    (g.rechnungen || []).forEach(r => { nimm(r.betrag); (r.reihe || []).forEach(nimm); })));
  return [...menge];
}
const kommentare = text => [...text.matchAll(/\/\*[\s\S]*?\*\//g)].map(m => m[0])
  .concat([...text.matchAll(/<!--[\s\S]*?-->/g)].map(m => m[0]));
const findeBetrag = (stellen, betraege) => {
  for (const st of stellen) for (const z of betraege)
    if (new RegExp('(?<![\\d\'’.,])' + z + '(?![\\d\'’.,])').test(st)) return z + ' in: ' + st.slice(0, 70);
  return null;
};

/* Ein Blick in die geladene Exportdatei. Immer nur auf die SICHTBARE Ansicht —
   eine ausgeblendete Ansicht traegt zwar denselben Text, aber niemand liest ihn. */
const sichtIn = s => s.evaluate(() => {
  const v = [...document.querySelectorAll('[data-view]')].filter(x => x.style.display !== 'none');
  return v.map(x => x.id);
});

/* ======================================================== 1. HTML-Export === */
console.log('\nHTML-Export — eine Datei, alle Jahrgaenge, bedienbar');

await fensterAuf();
await seite.click('[data-exp-wahl="alle"]'); await bisRuhe(seite);
const hRech = await hakenAuf('rech', true);
const hUeb  = await hakenAuf('ueb', true);
const hNavi = await hakenAuf('navi', true);
pruef('Fenster steht: Rechnungen, Jahresuebersicht und Navigation sind gewaehlt',
  hRech && hUeb && hNavi, [hRech, hUeb, hNavi].join('/'));
const gewaehlt = await seite.$$eval('[data-exp-jahr]',
  ns => ns.filter(n => n.classList.contains('an')).map(n => n.textContent.trim()));
gleich('gewaehlte Jahrgaenge', gewaehlt.join(','), JAHRE.join(','));

const htmlDatei = await faengtAb(() => seite.click('[data-exp-html]'), 1);
pruef('der Export liefert genau EINE HTML-Datei', htmlDatei.length === 1, htmlDatei.length);
const exp = htmlDatei[0] || { text: '', name: '', bytes: 0 };
pruef('die Datei traegt Inhalt', exp.bytes > 10000, exp.bytes);
pruef('der Dateiname nennt alle gewaehlten Jahrgaenge',
  exp.name === 'GAEPP-' + JAHRE.join('-') + '.html', exp.name);

/* --- Die Datei wird geoeffnet, nicht gelesen. --- */
const s2 = await kontext.newPage();
const fehlerExport = [];
s2.on('pageerror', e => fehlerExport.push('Exportdatei: ' + String(e)));
await s2.goto('http://127.0.0.1:' + PORT_DATEI + '/' + exp.name);
await s2.waitForFunction(() => document.querySelectorAll('[data-view] table').length > 0, null, { timeout: 8000 });

const ansichtIds = await s2.$$eval('[data-view]', vs => vs.map(v => v.id));
const sollIds = JAHRE.map(j => 'v-' + j + '-budget')
  .concat(JAHRE.map(j => 'v-' + j + '-rechnung'))
  .concat(['v-alle-budget', 'v-alle-rechnung']);
gleich('je Jahrgang und Ansicht genau ein [data-view]',
  ansichtIds.slice().sort().join(' '), sollIds.slice().sort().join(' '));
pruef('Gegenprobe: so viele Ansichtsknoten hat die Pruefung angesehen',
  ansichtIds.length === sollIds.length, ansichtIds.length + ' von ' + sollIds.length);
gleich('genau eine Ansicht ist sichtbar', (await sichtIn(s2)).length, 1);

/* --- Navigation: Jahrgang --- */
await s2.click('[data-view]:not([style*="none"]) [data-geh-jahr="' + JAHRE[0] + '"]');
await s2.waitForTimeout(80);
gleich('ein Klick auf einen Jahrgang wechselt die sichtbare Ansicht',
  (await sichtIn(s2)).join(','), 'v-' + JAHRE[0] + '-budget');

/* --- Navigation: Ansichtswort --- */
await s2.click('[data-view]:not([style*="none"]) [data-geh-ansicht="rechnung"]');
await s2.waitForTimeout(80);
gleich('ein Klick auf ein Ansichtswort wechselt die sichtbare Ansicht',
  (await sichtIn(s2)).join(','), 'v-' + JAHRE[0] + '-rechnung');

/* Zurueck auf den Stichjahrgang: dort steht ein volles Blatt, an dem sich
   Klappen ueberhaupt messen laesst. Der Jahrgangswechsel behaelt dabei, worauf
   man gerade schaut — wer in den Rechnungen steht, bleibt dort. Genau das wird
   hier mitgemessen, weil es im Werkzeug ebenso ist. */
const STICHJ = parseInt(STICHMONAT.slice(0, 4), 10);
await s2.click('[data-view]:not([style*="none"]) [data-geh-jahr="' + STICHJ + '"]');
await s2.waitForTimeout(80);
gleich('der Jahrgangswechsel behaelt die Ansicht', (await sichtIn(s2)).join(','),
  'v-' + STICHJ + '-rechnung');
await s2.click('[data-view]:not([style*="none"]) [data-geh-ansicht="budget"]');
await s2.waitForTimeout(80);
gleich('zurueck auf das Budget des Stichjahrgangs', (await sichtIn(s2)).join(','),
  'v-' + STICHJ + '-budget');

/* --- Klappen --- */
const zeilenZahl = () => s2.evaluate(() => {
  const v = [...document.querySelectorAll('[data-view]')].find(x => x.style.display !== 'none');
  return [...v.querySelectorAll('tbody tr')].filter(t => t.style.display !== 'none').length; });
const vorKlapp = await zeilenZahl();
await s2.click('[data-view]:not([style*="none"]) [data-klapp-ex]');
await s2.waitForTimeout(80);
const nachZu = await zeilenZahl();
pruef('ein Klick auf den Klappknopf blendet Zeilen aus', nachZu < vorKlapp,
  vorKlapp + ' -> ' + nachZu);
await s2.click('[data-view]:not([style*="none"]) [data-klapp-ex]');
await s2.waitForTimeout(80);
gleich('der zweite Klick holt sie zurueck', await zeilenZahl(), vorKlapp);

/* --- Alles zuklappen --- */
const vorAlle = await zeilenZahl();
const beschriftungVor = await s2.$eval('[data-view]:not([style*="none"]) [data-alle-um]',
  e => e.textContent.trim());
await s2.click('[data-view]:not([style*="none"]) [data-alle-um]');
await s2.waitForTimeout(80);
const nachAlle = await zeilenZahl();
const kinderNoch = await s2.evaluate(() => {
  const v = [...document.querySelectorAll('[data-view]')].find(x => x.style.display !== 'none');
  return [...v.querySelectorAll('tr[data-p]:not([data-p=""])')].filter(t => t.style.display !== 'none').length; });
pruef('«Alles zuklappen» laesst keine untergeordnete Zeile stehen', kinderNoch === 0, kinderNoch);
pruef('«Alles zuklappen» verkuerzt das Blatt', nachAlle < vorAlle, vorAlle + ' -> ' + nachAlle);
const beschriftungNach = await s2.$eval('[data-view]:not([style*="none"]) [data-alle-um]',
  e => e.textContent.trim());
gleich('der Knopf heisst danach anders', beschriftungVor + ' -> ' + beschriftungNach,
  'Alles zuklappen -> Alles aufklappen');
await s2.click('[data-view]:not([style*="none"]) [data-alle-um]');
await s2.waitForTimeout(80);

/* --- Nichts laesst sich aendern --- */
const bedienbar = await s2.evaluate(() => ({
  eingaben: document.querySelectorAll('input, select, textarea').length,
  knoten: document.querySelectorAll('*').length }));
gleich('kein input, select oder textarea in der Datei', bedienbar.eingaben, 0);
pruef('Gegenprobe: so viele Knoten hat die Pruefung durchsucht',
  bedienbar.knoten > 1000, bedienbar.knoten);

/* --- Kopfzeile --- */
const kopf = await s2.evaluate(() => {
  const v = [...document.querySelectorAll('[data-view]')].find(x => x.style.display !== 'none');
  const k = v.querySelector('.expkopf');
  const t = s => { const e = k.querySelector(s); return e ? e.textContent.trim() : null; };
  return { wort: t('.dkWort'), titel: t('.dkTitel'), stich: t('.dkStich'), rechts: t('.dkRechts'),
    hoch: Math.round(k.getBoundingClientRect().height) };
});
gleich('Kopf: Wortmarke', kopf.wort, 'GÄPP');
gleich('Kopf: Blatttitel', kopf.titel, 'Budget ' + STICHJ);
gleich('Kopf: Stichmonat', kopf.stich,
  'Stichmonat ' + STICHMONAT.slice(5, 7) + ' · ' + STICHMONAT.slice(0, 4));
/* Zweistellig heisst: Tag und Monat tragen immer zwei Ziffern. Der Lauf kann den
   Kalender des Browsers nicht stellen — faellt er auf einen einstelligen Tag,
   pruefte dieselbe Zeile mehr. Gemessen wird deshalb die Form der Zeile. */
const stempel = /^exportiert (\d{2})\.(\d{2})\.(\d{4}) · GÄPP V (\d+\.\d+\.\d+)$/.exec(kopf.rechts || '');
pruef('Kopf rechts: «exportiert TT.MM.JJJJ · GÄPP V x.y.z», Datum zweistellig',
  !!stempel, kopf.rechts);
pruef('Kopf ist sichtbar', kopf.hoch > 0, kopf.hoch);

/* --- Fusszeile --- */
const fuss = await s2.evaluate(() => {
  const v = [...document.querySelectorAll('[data-view]')].find(x => x.style.display !== 'none');
  const f = v.querySelector('.expfuss');
  return { teile: [...f.querySelectorAll('span')].map(s => s.textContent.trim()),
    hoch: Math.round(f.getBoundingClientRect().height) };
});
pruef('Fuss: «Beträge in CHF, ohne Rappen»', fuss.teile.indexOf('Beträge in CHF, ohne Rappen') >= 0,
  fuss.teile.join(' | '));
pruef('Fuss: «halbfett = abgehakt»',
  fuss.teile.some(t => /^halbfett\s*=\s*abgehakt$/.test(t)), fuss.teile.join(' | '));
pruef('Fuss: der Anspruch', fuss.teile.indexOf('Passend | Präzise | Praktisch') >= 0,
  fuss.teile.join(' | '));
pruef('Fuss ist sichtbar', fuss.hoch > 0, fuss.hoch);

/* --- Die Zahlen der Datei sind die Zahlen der App --- */
const zellenAus = (s, wahl) => s.evaluate(sel => {
  const wurzel = sel ? [...document.querySelectorAll('[data-view]')].find(x => x.id === sel)
                     : document;
  const out = {};
  wurzel.querySelectorAll('tr.kat').forEach(tr => {
    out[tr.getAttribute('data-id')] =
      [...tr.querySelectorAll('td.c-mon, td.c-jahr')].map(td => td.textContent.trim()); });
  const s2z = wurzel.querySelector('tr.saldo');
  if (s2z) out['#saldo'] = [...s2z.querySelectorAll('td.c-mon, td.c-jahr')].map(td => td.textContent.trim());
  return out;
}, wahl);
const appZ = await zellenAus(seite, null);
const expZ = await zellenAus(s2, 'v-' + STICHJ + '-budget');
const schluessel = Object.keys(appZ).sort();
let verglichen = 0, ungleich = null;
schluessel.forEach(k => {
  const a = appZ[k] || [], e = expZ[k] || [];
  a.forEach((v, i) => { verglichen++;
    if (v !== e[i] && ungleich === null) ungleich = k + '[' + i + ']: App «' + v + '» Export «' + e[i] + '»'; });
});
pruef('die Zahlen im Blatt stimmen mit denen der App ueberein', ungleich === null, ungleich);
pruef('Gegenprobe: so viele Zellen hat die Pruefung verglichen',
  verglichen >= 90 && schluessel.length >= 7, verglichen + ' Zellen in ' + schluessel.length + ' Zeilen');

/* --- Kein Vorratsbetrag im Quelltextkommentar (der Fall U-79) --- */
const betraege = vorratsBetraege();
const stellen = kommentare(exp.text);
const fund = findeBetrag(stellen, betraege);
pruef('kein Betrag aus dem Pruefvorrat in einem Quelltextkommentar des Exports',
  fund === null, fund);
pruef('Gegenprobe: so viele Kommentare und so viele Betraege hat die Pruefung angesehen',
  stellen.length > 20 && betraege.length > 10,
  stellen.length + ' Kommentare, ' + betraege.length + ' Betraege');
pruef('Gegenprobe: der Sucher findet einen Betrag, wenn einer dasteht',
  findeBetrag(['/* Anfangsstand: ' + betraege[0] + ' */'], betraege) !== null);

/* --- Die Schrift steckt in der Datei --- */
pruef('kein Verweis auf fonts.googleapis.com', !/fonts\.googleapis\.com/.test(exp.text));
pruef('kein <link> in der Datei', !/<link\b/i.test(exp.text));
pruef('ein @font-face mit data:-Quelle',
  /@font-face\s*\{[^}]*src\s*:\s*url\(\s*data:/.test(exp.text));

/* ============================================== 2. HTML-Export ohne Navi === */
console.log('\nHTML-Export — ohne den Haken «Navigation»');
await fensterAuf();
await seite.click('[data-exp-wahl="alle"]'); await bisRuhe(seite);
await hakenAuf('navi', false);
const ohneNavi = await faengtAb(() => seite.click('[data-exp-html]'), 1);
pruef('auch ohne Navigation kommt genau eine Datei', ohneNavi.length === 1, ohneNavi.length);
const s2b = await kontext.newPage();
s2b.on('pageerror', e => fehlerExport.push('Exportdatei ohne Navi: ' + String(e)));
await s2b.goto('http://127.0.0.1:' + PORT_DATEI + '/' + ohneNavi[0].name);
await s2b.waitForFunction(() => document.querySelectorAll('[data-view] table').length > 0, null, { timeout: 8000 });
const ohne = await s2b.evaluate(() => ({
  navizeilen: document.querySelectorAll('.expnav').length,
  ziele: document.querySelectorAll('[data-ziel]').length,
  alleUm: document.querySelectorAll('[data-alle-um]').length,
  ansichten: document.querySelectorAll('[data-view]').length,
  zeilen: document.querySelectorAll('tbody tr').length }));
gleich('ohne den Haken gibt es keine Navigationszeile', ohne.navizeilen, 0);
gleich('ohne den Haken gibt es keinen Sprungknopf', ohne.ziele, 0);
gleich('ohne den Haken gibt es kein «Alles zuklappen»', ohne.alleUm, 0);
pruef('Gegenprobe: das Blatt steht trotzdem da',
  ohne.ansichten === sollIds.length && ohne.zeilen > 100,
  ohne.ansichten + ' Ansichten, ' + ohne.zeilen + ' Zeilen');
await s2b.close();

/* ==================================================== 3. Offline dasselbe == */
console.log('\nHTML-Export — offline');
const kontextOff = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-CH' });
const draussen = [];
await kontextOff.route('**/*', r => {
  const u = r.request().url();
  if (u.indexOf('http://127.0.0.1:') === 0 || u.indexOf('data:') === 0) return r.continue();
  draussen.push(u); return r.abort();
});
const s3 = await kontextOff.newPage();
s3.on('pageerror', e => fehlerExport.push('Exportdatei offline: ' + String(e)));
await s3.goto('http://127.0.0.1:' + PORT_DATEI + '/' + exp.name);
await s3.waitForFunction(() => document.querySelectorAll('[data-view] table').length > 0, null, { timeout: 8000 });
const off = await s3.evaluate(() => document.fonts.ready.then(() => {
  const v = [...document.querySelectorAll('[data-view]')].find(x => x.style.display !== 'none');
  const zelle = v.querySelector('tr.kat td.c-name');
  return { familie: getComputedStyle(document.body).fontFamily,
    familieZelle: getComputedStyle(zelle).fontFamily,
    geladen: document.fonts.check('300 14px Jost') && document.fonts.check('500 14px Jost'),
    flaechen: document.fonts.size,
    zeilen: document.querySelectorAll('tbody tr').length };
}));
gleich('offline wurde keine Anfrage nach aussen abgewuergt', draussen.length, 0);
pruef('offline ist die Schriftfamilie Jost', /^Jost\b/.test(off.familie), off.familie);
pruef('offline ist die Schriftfamilie auch in der Tabelle Jost', /Jost/.test(off.familieZelle),
  off.familieZelle);
pruef('offline ist die eingebettete Schrift wirklich geladen', off.geladen === true,
  off.geladen + ' bei ' + off.flaechen + ' Schnitten');
pruef('Gegenprobe: offline steht dasselbe Blatt da', off.zeilen > 100, off.zeilen);
await s3.close(); await kontextOff.close();

/* ============================================================== 4. CSV ===== */
console.log('\nCSV — je Jahrgang eine Datei, gemacht fuer Excel');
await fensterAuf();
await seite.click('[data-exp-wahl="alle"]'); await bisRuhe(seite);
await hakenAuf('rech', true);
const csv = await faengtAb(() => seite.click('[data-exp-csv]'), JAHRE.length);
gleich('eine Datei je gewaehltem Jahrgang', csv.length, JAHRE.length);
gleich('die Dateien heissen nach ihrem Jahrgang',
  csv.map(c => c.name).sort().join(' '),
  JAHRE.map(j => 'GAEPP-' + j + '.csv').sort().join(' '));

const eine = csv.find(c => c.name === 'GAEPP-' + STICHJ + '.csv') || csv[0] || { text: '' };
pruef('BOM am Anfang', eine.text.charCodeAt(0) === 0xFEFF,
  '0x' + eine.text.charCodeAt(0).toString(16));
pruef('CRLF als Zeilenende', eine.text.indexOf('\r\n') > 0);
pruef('kein einzelnes LF ohne CR', !/[^\r]\n/.test(eine.text),
  (eine.text.match(/[^\r]\n/g) || []).length + ' Stellen');
const zeilen = eine.text.replace(/^﻿/, '').split('\r\n');
const kopfZeile = zeilen.find(z => z.indexOf('Ebene;') === 0) || '';
const felder = kopfZeile.split(';');
pruef('Semikolon trennt die Spalten', felder.length > 14, felder.length + ' Spalten');
gleich('Ziffernmonate 01…12 als Spaltenkoepfe', felder.slice(3, 15).join(','),
  ['01','02','03','04','05','06','07','08','09','10','11','12'].join(','));
pruef('die Spalte «Erledigt» ist da', felder.indexOf('Erledigt') >= 0, kopfZeile);
pruef('die Spalte «Korrektur» ist da', felder.indexOf('Korrektur') >= 0, kopfZeile);
/* Ohne Tausendertrennung, damit Excel die Spalte als Zahl liest und rechnet. */
const apostroph = (eine.text.match(/\d[’']\d{3}/g) || []);
gleich('keine Tausendertrennung in den Betraegen', apostroph.length, 0);
const alleFelder = zeilen.join(';').split(';');
const grosseZahlen = alleFelder.filter(f => /^-?\d{4,}$/.test(f.trim()));
pruef('Gegenprobe: es stehen ueberhaupt vierstellige Betraege drin',
  grosseZahlen.length > 5, grosseZahlen.length + ' von ' + alleFelder.length + ' Feldern');
let csvBytes = 0, csvZeilen = 0;
csv.forEach(c => { csvBytes += c.bytes; csvZeilen += c.text.split('\r\n').length; });
pruef('Gegenprobe: so viele Dateien und Zeilen hat die Pruefung angesehen',
  csv.length === JAHRE.length && csvZeilen > 100,
  csv.length + ' Dateien, ' + csvZeilen + ' Zeilen, ' + csvBytes + ' Bytes');

/* ============================================================ 5. Druck ===== */
console.log('\nDruck — das Papier');
/* Alles aufgeklappt: nur dann traegt das Blatt genug Zeilen, dass sich Umbruch
   und Seitenzahl ueberhaupt messen lassen. */
await seite.keyboard.press('z');
await seite.waitForTimeout(200);
await seite.emulateMedia({ media: 'print' });
await seite.waitForTimeout(200);

const papier = await seite.evaluate(() => {
  const cs = el => el ? getComputedStyle(el) : null;
  const hoch = s => { const e = document.querySelector(s);
    return e ? Math.round(e.getBoundingClientRect().height) : -1; };
  const aus = s => { const e = document.querySelector(s);
    return e ? cs(e).display === 'none' : null; };
  const th = document.querySelector('thead tr:first-child th.c-name');
  const sal = document.querySelector('tr.saldo td.c-name');
  const kats = [...document.querySelectorAll('tr.kat')];
  const grps = [...document.querySelectorAll('tr.grp')];
  return {
    grund: cs(document.body).backgroundColor,
    tinte: cs(document.body).color,
    posTinte: cs(document.querySelector('tr.pos td.c-name')).color,
    druckkopf: hoch('.druckkopf'), druckfuss: hoch('.druckfuss'),
    kopf1: aus('.kopf1'), kopf2: aus('.kopf2'),
    band: aus('.band'), fenstermarke: aus('.fusszeile'),
    leiste: hoch('#leiste'),
    abstand: (th && sal) ? Math.round(sal.getBoundingClientRect().top - th.getBoundingClientRect().bottom) : null,
    katBruch: kats.map(t => cs(t).breakInside), katN: kats.length,
    grpBruch: grps.map(t => cs(t).breakInside), grpN: grps.length,
    zeilen: document.querySelectorAll('tbody tr').length
  };
});
const hGrund = helligkeit(papier.grund), hTinte = helligkeit(papier.tinte);
pruef('auf Papier ist der Grund hell', hGrund !== null && hGrund > 0.9,
  papier.grund + ' (Helligkeit ' + (hGrund === null ? '?' : hGrund.toFixed(2)) + ')');
pruef('auf Papier ist die Tinte dunkel', hTinte !== null && hTinte < 0.25,
  papier.tinte + ' (Helligkeit ' + (hTinte === null ? '?' : hTinte.toFixed(2)) + ')');
pruef('auch die Positionszeile schreibt dunkel',
  helligkeit(papier.posTinte) < 0.25, papier.posTinte);
pruef('der Kopf des Papiers ist sichtbar', papier.druckkopf > 0, papier.druckkopf);
pruef('der Fuss des Papiers ist sichtbar', papier.druckfuss > 0, papier.druckfuss);
/* NACHGEZOGEN am 23.08.2026. Diese Zeile fragte auch nach .kopf3 — der dritten
   Kopfzeile mit Blatttitel und Legende. Die ist am Bildschirm gestrichen, samt
   ihrem Traeger #blattkopf; die Frage nach ihr lief ins Leere und machte die
   Zeile rot, obwohl am Druck nichts falsch war. Geprueft wird jetzt, was es
   gibt: die beiden verbliebenen Kopfzeilen sind auf Papier ausgeblendet, und
   ihr Traeger #leiste misst keine Hoehe. */
pruef('die Fensterleiste ist weg',
  papier.kopf1 === true && papier.kopf2 === true && papier.leiste === 0,
  [papier.kopf1, papier.kopf2, papier.leiste].join('/'));
pruef('das Kennzahlenband ist weg', papier.band === true, papier.band);
pruef('die Fusszeile des Fensters ist weg', papier.fenstermarke === true, papier.fenstermarke);

/* --- Der eigene Kopf des Papiers ------------------------------------------
   ERGAENZT am 23.08.2026. Bisher stand hier nur, dass der Druckkopf eine Hoehe
   hat. Das reichte, solange niemand an den Kopfzeilen ruehrte. Mit der
   gestrichenen dritten Bildschirmzeile ist das anders: eine Streichung im
   Fenster kann den Papierkopf stillschweigend mitnehmen, und auf dem Papier
   faellt es niemandem mehr auf — das Blatt liegt dann ohne Titel im Ordner.
   Der Druck traegt seinen eigenen Kopf, unabhaengig vom Fenster: Wortmarke,
   Blatttitel, Stichmonat, Tag und Version. Genau das wird jetzt gelesen. */
await seite.evaluate(iso => {
  const fest = new Date(iso).getTime(), Echt = Date;
  function Gestellt(...a) { return a.length ? new Echt(...a) : new Echt(fest); }
  Gestellt.now = () => fest; Gestellt.parse = Echt.parse; Gestellt.UTC = Echt.UTC;
  Gestellt.prototype = Echt.prototype;
  window.__echterKalender = Echt; window.Date = Gestellt;
  zeichne();
}, TAG_ISO);
await seite.waitForTimeout(200);
const papierKopf = await seite.evaluate(() => {
  const k = document.querySelector('#druckkopf');
  if (!k) return null;
  const t = w => { const e = k.querySelector(w); return e ? e.textContent.trim() : null; };
  const wort = e => (e.textContent || '').trim();
  return { wort: t('.dkWort'), titel: t('.dkTitel'), stich: t('.dkStich'), rechts: t('.dkRechts'),
    teile: k.children.length, sichtbar: getComputedStyle(k).display,
    jgHell: [...document.querySelectorAll('.jg.an')].map(wort).join(' '),
    ansHell: [...document.querySelectorAll('.ans.an')].map(wort).join(' ') };
});
pruef('der Kopf des Papiers ist ueberhaupt da', papierKopf !== null);
gleich('Papierkopf: die Wortmarke', papierKopf && papierKopf.wort, 'GÄPP');
gleich('Papierkopf: der Blatttitel', papierKopf && papierKopf.titel, 'Budget ' + STICHJ);
gleich('Papierkopf: der Stichmonat aus dem Datenstand', papierKopf && papierKopf.stich,
  'Stichmonat ' + STICHMONAT.slice(5, 7) + ' · ' + STICHMONAT.slice(0, 4));
gleich('Papierkopf: gestellter Tag und gelesene Version', papierKopf && papierKopf.rechts,
  'gedruckt ' + TAG_TEXT + ' · GÄPP V ' + VERSION);
gleich('Papierkopf: vier Teile, mehr steht dort nicht', papierKopf && papierKopf.teile, 4);
gleich('Papierkopf: er steht als Zeile da', papierKopf && papierKopf.sichtbar, 'flex');
/* Gegenprobe: der gestellte Tag ist wirklich gestellt und nicht zufaellig heute. */
pruef('Gegenprobe: der gestellte Tag ist nicht der heutige',
  TAG_TEXT !== new Date().toLocaleDateString('de-CH'), TAG_TEXT);
/* Gegenprobe zum Blatttitel: das Fenster zeigt wirklich dieses Blatt. Seit die
   dritte Kopfzeile gestrichen ist, steht die Auskunft dort hell im Jahrgang
   und im Ansichtswort — der Papierkopf sagt dasselbe, nur ausgeschrieben.
   Stimmten die beiden nicht ueberein, waere der Titel oben zwar vorhanden,
   aber falsch, und die Pruefung darueber ein Zufallstreffer. */
gleich('Gegenprobe: das Fenster fuehrt denselben Jahrgang hell',
  papierKopf && papierKopf.jgHell, String(STICHJ));
gleich('Gegenprobe: das Fenster fuehrt dieselbe Ansicht hell',
  papierKopf && papierKopf.ansHell, 'Budget');
await seite.evaluate(() => { window.Date = window.__echterKalender; zeichne(); });
pruef('der Kalender ist wieder der echte',
  await seite.evaluate(() => Date === window.__echterKalender));
await seite.waitForTimeout(100);
gleich('die Saldozeile steht direkt unter dem Kopf (Abstand in px)', papier.abstand, 0);
pruef('jede Kategoriezeile traegt break-inside: avoid',
  papier.katN > 0 && papier.katBruch.every(v => v === 'avoid'),
  papier.katBruch.join(','));
pruef('jede Gruppenzeile traegt break-inside: avoid',
  papier.grpN > 0 && papier.grpBruch.every(v => v === 'avoid'),
  papier.grpBruch.join(','));
pruef('Gegenprobe: so viele Kategorie- und Gruppenzeilen hat die Pruefung angesehen',
  papier.katN >= 7 && papier.grpN >= 3,
  papier.katN + ' Kategorien, ' + papier.grpN + ' Gruppen, ' + papier.zeilen + ' Zeilen');

const pdfPfad = join(tmp, 'druck.pdf');
await seite.pdf({ path: pdfPfad, printBackground: true, preferCSSPageSize: true });
const pdfBytes = statSync(pdfPfad).size;
pruef('das PDF hat mehr als null Bytes', pdfBytes > 0, pdfBytes);
const pdfRoh = readFileSync(pdfPfad, 'latin1');
const zaehler = /\/Count\s+(\d+)/.exec(pdfRoh);
const seitenZahl = zaehler ? parseInt(zaehler[1], 10) : 0;
pruef('das PDF ergibt aufgeklappt mehr als eine Seite', seitenZahl > 1, seitenZahl + ' Seiten');

/* --------------------------------------------------------------- Schluss -- */
await s2.close();
await b.close();
server.close(); dateiServer.close();
ende(fehler.concat(fehlerExport));
