/* GAEPP — Pruefstand: Bedienung und Tabellendarstellung.
   Neu am 22.08.2026, fuer das Tabellenwerkzeug (Budget/Rechnungen/Alle).

   Gemessen wird die Wirkung: gerenderte Hoehe, berechnete Farbe, Datenstand
   nach einem echten Klick, Tastendruck oder Rechtsklick — nicht die Klasse
   im Quelltext. Wo eine Erwartung eine Zahl nennt, ist sie aus vorrat.mjs
   oder aus dem geladenen Zustand der App selbst hergeleitet, nirgends
   abgeschrieben.

   Port 8102. Fahren: node bedienung.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { daten, STICHMONAT } from './vorrat.mjs';

const PORT = 8102;
const ARBEITSJAHR = parseInt(STICHMONAT.slice(0, 4), 10);   /* 2026 — hergeleitet, nicht getippt */

const { pruef, gleich, ende } = bilanzbuch('bedienung');

/* ---------------------------------------------------------------- Helfer */

/* Browserspeicher leeren und neu laden — jeder Aufruf von daten() im Server
   liefert denselben frischen Stand, weil vorrat.mjs seinen Id-Zaehler bei
   jedem Aufruf zuruecksetzt. So faengt jeder Abschnitt unverfaelscht an. */
async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  /* S ist ein "const" auf oberster Ebene eines klassischen Scripts — das haengt
     NICHT an window, ist im Skript-Scope aber sichtbar. Darum bare "S", nicht
     "window.S" (das waere immer undefined und der Wartepunkt liefe blind). */
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}

/* Die berechnete Farbe einer CSS-Variable — nicht der Hex-Text im Stylesheet,
   sondern das, was der Browser tatsaechlich als "color" berechnet, damit sich
   mit der Farbe einer echten Zelle vergleichen laesst (beide im selben
   rgb(...)-Format, ohne von Hand Hexwerte zu parsen). */
async function farbeVar(seite, name) {
  return seite.evaluate((v) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(' + v + ')';
    document.body.appendChild(probe);
    const wert = getComputedStyle(probe).color;
    probe.remove();
    return wert;
  }, name);
}
async function farbeVon(seite, selektor) {
  return seite.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).color : null;
  }, selektor);
}

async function hoehen(seite, selektor) {
  return seite.evaluate((sel) => Array.from(document.querySelectorAll(sel))
    .map(el => Math.round(el.getBoundingClientRect().height)), selektor);
}

/* Id einer Position ueber Jahr/Block-/Positionsname finden — gelesen aus dem
   laufenden Zustand S, nicht erraten oder aus vorrat.mjs abgeschrieben. */
async function posId(seite, jahr, blockName, posName) {
  return seite.evaluate(([jahr, blockName, posName]) => {
    const b = (S.daten[jahr] || []).find(x => x.name === blockName);
    if (!b) return null;
    if (b.art === 'schulden') {
      for (const g of (b.gruppen || [])) {
        const p = (g.pos || []).find(x => x.name === posName);
        if (p) return { pid: p.id, bid: b.id, gid: g.id };
      }
      return null;
    }
    const p = (b.pos || []).find(x => x.name === posName);
    return p ? { pid: p.id, bid: b.id } : null;
  }, [jahr, blockName, posName]);
}
async function blockId(seite, jahr, name) {
  return seite.evaluate(([jahr, name]) => {
    const b = (S.daten[jahr] || []).find(x => x.name === name);
    return b ? b.id : null;
  }, [jahr, name]);
}

async function anzahlSpan(seite, cls, id) {
  return seite.evaluate(([cls, id]) => {
    const tr = document.querySelector('tr.' + cls + '[data-k="' + id + '"]');
    if (!tr) return undefined;                 /* Zeile fehlt ganz */
    const sp = tr.querySelector('.anzahl');
    return sp ? sp.textContent : null;          /* null = Zeile da, kein Zaehler (aufgeklappt) */
  }, [cls, id]);
}
async function kinderZahl(seite, id) {
  return seite.evaluate((id) => document.querySelectorAll('tr[data-p="' + id + '"]').length, id);
}
async function klappe(seite, cls, id) {
  await seite.locator('tr.' + cls + '[data-k="' + id + '"] button.klapper').click();
  await bisRuhe(seite);
}
async function aktivesFeld(seite) {
  return seite.evaluate(() => {
    const el = document.activeElement;
    if (!el || !el.dataset) return null;
    return { z: el.dataset.z ?? null, m: el.dataset.m ?? null, tag: el.tagName, klasse: el.className };
  });
}
/* Formatierung wie in index.html: Apostroph als Tausendertrenner, U+2212 als
   Minus, null bleibt leer (Hausregel: Betraege stehen so, nirgends anders). */
function fmt(n) {
  const r = Math.round(n || 0);
  if (r === 0) return '';
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   1. Zeilenhoehe — Kategorie-, Gruppen- und Summenzeilen wie die Saldozeilen
   ==================================================================== */
console.log('\n1. Zeilenhoehe — tr.kopf, tr.gkopf, tr.summe wie tr.saldo');
await frisch(seite);   /* frischer Stand: S.auf = [] — von selbst "zugeklappt" */

const vbId = await blockId(seite, ARBEITSJAHR, 'Verbindlichkeiten');
pruef('Block "Verbindlichkeiten" gefunden (Voraussetzung fuer Gruppenzeilen)', !!vbId, vbId);
if (vbId) await klappe(seite, 'kopf', vbId);   /* zeigt die drei Gruppenkoepfe, selbst noch zugeklappt */

/* "Ausgaben zusammen" traegt zugleich die Klassen summe UND kopf (starke
   Summenzeile) — fuer die reinen Kategoriezeilen wird sie herausgefiltert,
   sie zaehlt unten als Summenzeile mit, nicht doppelt als beides. */
const zu = {
  saldo: await hoehen(seite, 'tr.saldo'),
  kopf:  await hoehen(seite, 'tbody tr.kopf:not(.summe)'),
  gkopf: await hoehen(seite, 'tbody tr.gkopf'),
  summe: await hoehen(seite, 'tbody tr.summe'),
};
pruef('zwei Saldozeilen gefunden', zu.saldo.length === 2, zu.saldo.length);
pruef('sieben Kategoriezeilen gefunden (sechs Bloecke + Verbindlichkeiten)', zu.kopf.length === 7, zu.kopf.length);
pruef('drei Gruppenzeilen gefunden (Steuerverwaltung, Privat, Firmen)', zu.gkopf.length === 3, zu.gkopf.length);
pruef('zwei Summenzeilen gefunden (Rechnungen, Ausgaben zusammen)', zu.summe.length === 2, zu.summe.length);

const referenz = zu.saldo[0];
pruef('die beiden Saldozeilen sind selbst gleich hoch (Toleranz 1px, Rundung)',
  Math.abs(zu.saldo[0] - zu.saldo[1]) <= 1, zu.saldo.join(' / '));

const vergleiche = (label, liste) => {
  liste.forEach((h, i) => pruef(label + ' #' + (i + 1) + ' = ' + h + 'px, Saldozeile = ' + referenz + 'px (Toleranz 1px)',
    Math.abs(h - referenz) <= 1, h));
};
console.log('  -- zugeklappt --');
vergleiche('tr.kopf', zu.kopf);
vergleiche('tr.gkopf', zu.gkopf);
vergleiche('tr.summe', zu.summe);

/* Aufgeklappt: alle Bloecke und Gruppen des Arbeitsjahrgangs oeffnen — das
   Ergebnis von "Alles aufklappen", hier direkt gesetzt, weil hier nicht die
   Klapp-Mechanik selbst geprueft wird (das leistet Abschnitt 2), sondern nur
   die Zeilenhoehe im geoeffneten Zustand. */
await seite.evaluate((jahr) => {
  const ids = [];
  (S.daten[jahr] || []).forEach(b => { ids.push(b.id);
    if (b.art === 'schulden') (b.gruppen || []).forEach(g => ids.push(g.id)); });
  S.auf = ids; neu();
}, ARBEITSJAHR);
await bisRuhe(seite);

const auf = {
  saldo: await hoehen(seite, 'tr.saldo'),
  kopf:  await hoehen(seite, 'tbody tr.kopf:not(.summe)'),
  gkopf: await hoehen(seite, 'tbody tr.gkopf'),
  summe: await hoehen(seite, 'tbody tr.summe'),
};
console.log('  -- aufgeklappt --');
pruef('weiterhin sieben Kategoriezeilen', auf.kopf.length === 7, auf.kopf.length);
pruef('weiterhin drei Gruppenzeilen', auf.gkopf.length === 3, auf.gkopf.length);
pruef('weiterhin zwei Summenzeilen', auf.summe.length === 2, auf.summe.length);
const referenzAuf = auf.saldo[0];
pruef('Saldozeilen bleiben gleich hoch, offen wie zugeklappt (Toleranz 1px)',
  Math.abs(referenzAuf - referenz) <= 1, referenzAuf + ' vs ' + referenz);
vergleiche('tr.kopf (aufgeklappt)', auf.kopf);
vergleiche('tr.gkopf (aufgeklappt)', auf.gkopf);
vergleiche('tr.summe (aufgeklappt)', auf.summe);

/* Gegenprobe: dieselbe CSS-Regel gilt tabellenuebergreifend — Kopf- und
   Summenzeilen der Rechnungstafel (Rechnungssteller, Total/offen/bezahlt)
   sollten dieselbe Hoehe tragen, obwohl dort keine eigene Saldozeile steht. */
await seite.locator('button[data-geh-ansicht="rechnung"]').click();
await bisRuhe(seite);
/* Seit dem Excel-Layout traegt nur «Total» einen Balken (tr.summe); «davon offen»
   und «davon bezahlt» stehen als helle Zeilen mit derselben Hoehe (tr.hoch). */
const rech = { kopf: await hoehen(seite, 'tbody tr.kopf:not(.summe)'),
               summe: await hoehen(seite, 'tbody tr.summe, tbody tr.hoch') };
pruef('Rechnungstafel: drei Rechnungssteller-Zeilen gefunden', rech.kopf.length === 3, rech.kopf.length);
pruef('Rechnungstafel: Summenzeilen gefunden (Total/offen/bezahlt)', rech.summe.length === 3, rech.summe.length);
vergleiche('Rechnungstafel tr.kopf', rech.kopf);
vergleiche('Rechnungstafel tr.summe', rech.summe);

/* ====================================================================
   2. Der Zaehler — span.anzahl neben einem zugeklappten Sektionskopf
   ==================================================================== */
console.log('\n2. Der Zaehler neben einem zugeklappten Sektionskopf');
await frisch(seite);

const struktur = await seite.evaluate((jahr) => {
  const bl = S.daten[jahr] || [];
  const bloecke = bl.filter(x => x.art !== 'schulden').map(x => ({ id: x.id, name: x.name, n: (x.pos || []).length }));
  const schuld = bl.find(x => x.art === 'schulden');
  const gruppen = schuld ? (schuld.gruppen || []).map(g => ({ id: g.id, name: g.name, n: (g.pos || []).length })) : [];
  const schuldKopf = schuld ? { id: schuld.id, name: schuld.name, n: (schuld.gruppen || []).length } : null;
  const steller = (S.rechnungen[jahr] || []).map(g => ({ id: g.id, name: g.name, n: (g.rechnungen || []).length }));
  return { bloecke, gruppen, schuldKopf, steller };
}, ARBEITSJAHR);

const forbiddenRegex = /Position|Gl(ä|a)ubiger|Rechnung/i;

async function pruefeZaehler(cls, eintrag) {
  const text = await anzahlSpan(seite, cls, eintrag.id);
  pruef('"' + eintrag.name + '" zugeklappt: Zaehler zeigt genau "' + eintrag.n + '"',
    text === String(eintrag.n), text);
  pruef('"' + eintrag.name + '": Zaehlertext ist NUR die Zahl (kein Label)',
    text != null && /^\d+$/.test(text) && !forbiddenRegex.test(text), text);
  await klappe(seite, cls, eintrag.id);
  const n = await kinderZahl(seite, eintrag.id);
  pruef('"' + eintrag.name + '" aufgeklappt: ' + eintrag.n + ' Kindzeile(n) gezaehlt', n === eintrag.n, n);
  const nachText = await anzahlSpan(seite, cls, eintrag.id);
  pruef('"' + eintrag.name + '" aufgeklappt: kein Zaehler mehr da', nachText === null, nachText);
}

pruef('sechs einfache Bloecke gefunden', struktur.bloecke.length === 6, struktur.bloecke.length);
for (const eintrag of struktur.bloecke) await pruefeZaehler('kopf', eintrag);

pruef('Block "Verbindlichkeiten" gefunden', !!struktur.schuldKopf, struktur.schuldKopf);
if (struktur.schuldKopf) await pruefeZaehler('kopf', struktur.schuldKopf);   /* oeffnet ihn zugleich */

pruef('drei Schuldgruppen gefunden', struktur.gruppen.length === 3, struktur.gruppen.length);
for (const g of struktur.gruppen) await pruefeZaehler('gkopf', g);   /* enthaelt auch den Randfall 0 (falls vorhanden) */

await seite.locator('button[data-geh-ansicht="rechnung"]').click();
await bisRuhe(seite);
pruef('drei Rechnungssteller gefunden', struktur.steller.length === 3, struktur.steller.length);
for (const g of struktur.steller) await pruefeZaehler('kopf', g);   /* "nordmann" deckt den Randfall 0 ab */

/* ====================================================================
   3. Pfeil rauf und runter im Budget
   ==================================================================== */
console.log('\n3. Pfeil rauf und runter');
await frisch(seite);
await seite.evaluate((jahr) => {   /* alles aufklappen, damit alle Positionszeilen sichtbar sind */
  const ids = [];
  (S.daten[jahr] || []).forEach(b => { ids.push(b.id);
    if (b.art === 'schulden') (b.gruppen || []).forEach(g => ids.push(g.id)); });
  S.auf = ids; neu();
}, ARBEITSJAHR);
await bisRuhe(seite);

/* Die tatsaechliche Reihenfolge der Felder in Spalte "Januar" (data-m="0") —
   gemessen am gerenderten Bild, nicht der App-Logik nachgebaut. Dazwischen
   liegen mehrere Kopf-/Gruppenkoepfe ganz ohne Feld — das ist die Probe fuers
   Ueberspringen. */
const domOrder = await seite.evaluate(() =>
  Array.from(document.querySelectorAll('#blatt .zelle[data-z][data-m="0"]')).map(el => el.dataset.z));
const erwarteteAnzahl = await seite.evaluate((jahr) => {
  let n = 0;
  (S.daten[jahr] || []).forEach(b => {
    if (b.art === 'schulden') (b.gruppen || []).forEach(g => n += (g.pos || []).length);
    else n += (b.pos || []).length;
  });
  return n;
}, ARBEITSJAHR);
const gesamtZeilen = await seite.evaluate(() => document.querySelectorAll('#blatt table tr').length);
gleich('Felder in Spalte Januar = Summe aller Positionen ueber alle Bloecke/Gruppen',
  domOrder.length, erwarteteAnzahl);
pruef('mehr Tabellenzeilen als Felder in der Spalte — es gibt also Kopf-/Summenzeilen zu ueberspringen',
  gesamtZeilen > domOrder.length, gesamtZeilen + ' Zeilen, ' + domOrder.length + ' Felder');

/* Spaltentreue: nacheinander Pfeil runter von Feld zu Feld, bis zum Ende. */
await seite.locator('.zelle[data-z="' + domOrder[0] + '"][data-m="0"]').click();
let alleRichtig = true, ersterFehler = null;
for (let i = 0; i < domOrder.length - 1; i++) {
  await seite.keyboard.press('ArrowDown');
  await bisRuhe(seite);
  const akt = await aktivesFeld(seite);
  const ok = akt && akt.z === domOrder[i + 1] && akt.m === '0';
  if (!ok && alleRichtig) { alleRichtig = false; ersterFehler = 'Schritt ' + (i + 1) + ': erwartet ' + domOrder[i + 1] + ', bekommen ' + JSON.stringify(akt); }
}
pruef('Pfeil runter wandert durch alle ' + domOrder.length + ' Felder der Spalte, in genau dieser Reihenfolge, Spalte bleibt "0"',
  alleRichtig, ersterFehler);

/* Am unteren Ende: keine Ausnahme, Fokus bleibt stehen. */
const fehlerVorher1 = fehler.length;
await seite.keyboard.press('ArrowDown');
await bisRuhe(seite);
const amEnde = await aktivesFeld(seite);
pruef('am unteren Ende: Fokus bleibt auf dem letzten Feld', amEnde && amEnde.z === domOrder[domOrder.length - 1], amEnde);
pruef('am unteren Ende: kein JavaScript-Fehler ausgeloest', fehler.length === fehlerVorher1, fehler.slice(fehlerVorher1));

/* Am oberen Ende, dieselbe Probe. */
await seite.locator('.zelle[data-z="' + domOrder[0] + '"][data-m="0"]').click();
const fehlerVorher2 = fehler.length;
await seite.keyboard.press('ArrowUp');
await bisRuhe(seite);
const amAnfang = await aktivesFeld(seite);
pruef('am oberen Ende: Fokus bleibt auf dem ersten Feld', amAnfang && amAnfang.z === domOrder[0], amAnfang);
pruef('am oberen Ende: kein JavaScript-Fehler ausgeloest', fehler.length === fehlerVorher2, fehler.slice(fehlerVorher2));

/* Pfeil rauf, Gegenrichtung: vom letzten zum vorletzten Feld. */
await seite.locator('.zelle[data-z="' + domOrder[domOrder.length - 1] + '"][data-m="0"]').click();
await seite.keyboard.press('ArrowUp');
await bisRuhe(seite);
const rauf = await aktivesFeld(seite);
pruef('Pfeil rauf springt zum vorletzten Feld derselben Spalte',
  rauf && rauf.z === domOrder[domOrder.length - 2] && rauf.m === '0', rauf);

/* Getippter Wert wird beim Sprung uebernommen. */
const nettolohn = await posId(seite, ARBEITSJAHR, 'Einkommen', 'Nettolohn');
pruef('Position "Nettolohn" gefunden', !!nettolohn, nettolohn);
if (nettolohn) {
  const sel = '.zelle[data-z="' + nettolohn.pid + '"][data-m="0"]';
  await seite.locator(sel).click();
  await seite.locator(sel).fill('9999');
  await seite.keyboard.press('ArrowDown');
  await bisRuhe(seite);
  const wert = await seite.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
  gleich('getippter Wert 9999 steht nach dem Sprung als "' + fmt(9999) + '" in der Zelle', wert, fmt(9999));
}

/* Auswahlfeld "Stand": die Pfeile gehoeren der Auswahl, nicht dem Sprung. */
await seite.locator('button[data-geh-ansicht="rechnung"]').click();
await bisRuhe(seite);
/* Rechnungssteller-Zeilen stehen zugeklappt da — erst oeffnen, dann sind
   ihre Rechnungen (und damit die Auswahlfelder "Stand") ueberhaupt im Bild. */
const ersterSteller = await seite.evaluate((jahr) => {
  const g = (S.rechnungen[jahr] || []).find(x => (x.rechnungen || []).length > 0);
  return g ? g.id : null;
}, ARBEITSJAHR);
pruef('ein Rechnungssteller mit mindestens einer Rechnung gefunden', !!ersterSteller, ersterSteller);
if (ersterSteller) await klappe(seite, 'kopf', ersterSteller);
const standSel = 'select.stand';
const standDa = await seite.locator(standSel).count();
pruef('mindestens ein Auswahlfeld "Stand" gefunden', standDa > 0, standDa);
if (standDa > 0) {
  await seite.locator(standSel).first().click();
  const fehlerVorher3 = fehler.length;
  await seite.keyboard.press('ArrowDown');
  await bisRuhe(seite);
  const nachPfeil = await seite.evaluate(() => { const el = document.activeElement;
    return el ? { tag: el.tagName, klasse: el.className } : null; });
  pruef('im Auswahlfeld "Stand" bleibt der Fokus auf der Auswahl (Pfeile werden nicht abgefangen)',
    nachPfeil && nachPfeil.tag === 'SELECT' && /\bstand\b/.test(nachPfeil.klasse), nachPfeil);
  pruef('kein JavaScript-Fehler im Auswahlfeld', fehler.length === fehlerVorher3, fehler.slice(fehlerVorher3));
}

/* Gegenprobe: Tab springt weiterhin waagrecht in der Zeile. */
await seite.locator('button[data-geh-ansicht="budget"]').click();
await bisRuhe(seite);
const strom = await posId(seite, ARBEITSJAHR, 'Fixkosten', 'Strom');
pruef('Position "Strom" gefunden', !!strom, strom);
if (strom) {
  await seite.locator('.zelle[data-z="' + strom.pid + '"][data-m="0"]').click();
  await seite.keyboard.press('Tab');
  await bisRuhe(seite);
  const nachTab = await aktivesFeld(seite);
  pruef('Tab bleibt in derselben Zeile und springt eine Spalte weiter (Januar -> Februar)',
    nachTab && nachTab.z === strom.pid && nachTab.m === '1', nachTab);
}

/* ====================================================================
   4. Rechtsklick im Budget
   ==================================================================== */
console.log('\n4. Rechtsklick im Budget — Monat abhaken, Kopf wird gruen, Ruecknahme');
await frisch(seite);
const gruen = await farbeVar(seite, '--gruen');
/* Seit dem Excel-Layout tragen Kopf- und Gruppenzeilen einen dunklen Balken.
   Ein abgehakter Kopf zeigt dort das helle Gruen (--gruenbalken), nicht das
   dunkle der Datenzeilen — sonst waere er auf dem Balken nicht zu lesen. */
const gruenBalken = await farbeVar(seite, '--gruenbalken');

const miete = await posId(seite, ARBEITSJAHR, 'Fixkosten', 'Miete');
const strom2 = await posId(seite, ARBEITSJAHR, 'Fixkosten', 'Strom');
const versich = await posId(seite, ARBEITSJAHR, 'Fixkosten', 'Versicherung');
pruef('alle drei Positionen unter "Fixkosten" gefunden', !!(miete && strom2 && versich),
  { miete: !!miete, strom: !!strom2, versicherung: !!versich });

if (miete && strom2 && versich) {
  const zSel = (id, m) => '.zelle[data-z="' + id + '"][data-m="' + m + '"]';
  const kopfZelleSel = (m) => 'tr.kopf[data-k="' + miete.bid + '"] td:nth-child(' + (m + 3) + ')';
  /* Spalte m -> td-Index: 1 Name, 2 Basis, dann Monate ab 3 (1-basiert), also m+3. */

  /* "Fixkosten" ist frisch geladen zugeklappt — erst oeffnen, sonst gibt es
     die Positionszeilen (und ihre Zellen) im Bild noch gar nicht. */
  await klappe(seite, 'kopf', miete.bid);

  await seite.locator(zSel(miete.pid, 0)).click({ button: 'right' });
  await bisRuhe(seite);
  let abgehaktMiete = await seite.evaluate((s) => document.querySelector(s).closest('td').className, zSel(miete.pid, 0));
  pruef('Rechtsklick auf Miete/Januar: Zelle traegt Klasse "abgehakt"', /\babgehakt\b/.test(abgehaktMiete), abgehaktMiete);
  let farbeMiete = await farbeVon(seite, zSel(miete.pid, 0));
  pruef('Miete/Januar zeigt die berechnete Gruenfarbe', farbeMiete === gruen, farbeMiete + ' vs ' + gruen);
  let farbeKopf = await farbeVon(seite, kopfZelleSel(0));
  pruef('Fixkosten-Kopf/Januar ist noch NICHT gruen (Strom und Versicherung fehlen noch)', farbeKopf !== gruenBalken, farbeKopf);

  await seite.locator(zSel(strom2.pid, 0)).click({ button: 'right' });
  await bisRuhe(seite);
  farbeKopf = await farbeVon(seite, kopfZelleSel(0));
  pruef('nach Strom/Januar: Fixkosten-Kopf/Januar immer noch nicht gruen (Versicherung fehlt)', farbeKopf !== gruenBalken, farbeKopf);

  await seite.locator(zSel(versich.pid, 0)).click({ button: 'right' });
  await bisRuhe(seite);
  farbeKopf = await farbeVon(seite, kopfZelleSel(0));
  pruef('nach Versicherung/Januar: Fixkosten-Kopf/Januar ist jetzt gruen (alle drei Werte abgehakt)',
    farbeKopf === gruenBalken, farbeKopf + ' vs ' + gruenBalken);

  /* Ein anderer Monat bleibt unberuehrt. */
  const farbeFeb = await farbeVon(seite, zSel(miete.pid, 1));
  pruef('Miete/Februar bleibt unberuehrt (nicht gruen)', farbeFeb !== gruen, farbeFeb);

  /* Ruecknahme: Rechtsklick auf Miete/Januar hebt den Haken wieder auf. */
  await seite.locator(zSel(miete.pid, 0)).click({ button: 'right' });
  await bisRuhe(seite);
  abgehaktMiete = await seite.evaluate((s) => document.querySelector(s).closest('td').className, zSel(miete.pid, 0));
  pruef('erneuter Rechtsklick auf Miete/Januar: "abgehakt" ist wieder weg', !/\babgehakt\b/.test(abgehaktMiete), abgehaktMiete);
  farbeKopf = await farbeVon(seite, kopfZelleSel(0));
  pruef('Fixkosten-Kopf/Januar ist wieder nicht gruen, sobald ein Wert fehlt', farbeKopf !== gruenBalken, farbeKopf);
}

/* ====================================================================
   5. Rechtsklick in den Rechnungen
   ==================================================================== */
console.log('\n5. Rechtsklick in den Rechnungen — Monat, Rundum-Stand, Betrag');
await frisch(seite);
await seite.locator('button[data-geh-ansicht="rechnung"]').click();
await bisRuhe(seite);
const gruen2 = await farbeVar(seite, '--gruen');

/* Der Steller ("Öchsli Zahnpraxis", id r-oechsli in vorrat.mjs) steht frisch
   geladen zugeklappt da — erst oeffnen, dann sind seine Rechnungen im Bild. */
await klappe(seite, 'kopf', 'r-oechsli');

/* r-oe-2 ("Behandlung", Oechsli): 900, verteilt auf Mai/Juni/Juli (m=4,5,6). */
const rId = 'r-oe-2';
const mSel = (m) => 'input[data-rm="' + rId + '"][data-m="' + m + '"]';
const standSelR = 'select.stand[data-r="' + rId + '"]';
const daR = await seite.locator(mSel(4)).count();
pruef('Rechnung "r-oe-2" (Behandlung) mit Monatszellen gefunden', daR > 0, daR);

if (daR > 0) {
  const abgehakt = async (m) => /\babgehakt\b/.test(
    await seite.evaluate((s) => document.querySelector(s).closest('td').className, mSel(m)));
  const standWert = async () => seite.evaluate((s) => document.querySelector(s).value, standSelR);

  /* Ein einzelner Monat abhaken: Zelle gruen, Stand bleibt Offen. */
  await seite.locator(mSel(4)).click({ button: 'right' });   /* Mai */
  await bisRuhe(seite);
  pruef('Mai (r-oe-2) ist nach Rechtsklick abgehakt', await abgehakt(4));
  pruef('Farbe Mai (r-oe-2) ist gruen', (await farbeVon(seite, mSel(4))) === gruen2);
  gleich('Stand bleibt "Offen", solange nicht alle Monate abgehakt sind', await standWert(), 'Offen');
  pruef('Juni (r-oe-2) ist noch nicht abgehakt', !(await abgehakt(5)));

  /* Alle Monate mit Wert abhaken: Stand springt auf Bezahlt. */
  await seite.locator(mSel(5)).click({ button: 'right' });   /* Juni */
  await bisRuhe(seite);
  await seite.locator(mSel(6)).click({ button: 'right' });   /* Juli */
  await bisRuhe(seite);
  gleich('nach dem letzten Haken springt der Stand auf "Bezahlt"', await standWert(), 'Bezahlt');
  const standFarbe = await farbeVon(seite, standSelR);
  pruef('das Auswahlfeld "Stand" zeigt jetzt die berechnete Gruenfarbe', standFarbe === gruen2, standFarbe + ' vs ' + gruen2);

  /* Einen Haken zurueeknehmen: Stand faellt zurueck auf Offen; die anderen
     eigenen Haken bleiben unberuehrt stehen. */
  await seite.locator(mSel(5)).click({ button: 'right' });   /* Juni zurueck */
  await bisRuhe(seite);
  gleich('ein zurueckgenommener Haken setzt den Stand zurueck auf "Offen"', await standWert(), 'Offen');
  pruef('Juni ist wieder nicht abgehakt', !(await abgehakt(5)));
  pruef('Mai bleibt trotzdem abgehakt (eigener Haken, unberuehrt)', await abgehakt(4));
  pruef('Juli bleibt trotzdem abgehakt (eigener Haken, unberuehrt)', await abgehakt(6));

  /* Rechtsklick auf den Betrag schaltet die ganze Rechnung um — jetzt auf
     Bezahlt, was auch Juni (ohne eigenen Haken) gruen zeigt (Stand-Fallback). */
  const betragSel = 'input[data-bez="' + rId + '"]';
  await seite.locator(betragSel).click({ button: 'right' });
  await bisRuhe(seite);
  gleich('Rechtsklick auf den Betrag setzt den Stand auf "Bezahlt"', await standWert(), 'Bezahlt');
  pruef('Juni zeigt jetzt trotzdem abgehakt (weil die ganze Rechnung bezahlt ist)', await abgehakt(5));
  pruef('Mai zeigt abgehakt', await abgehakt(4));
  pruef('Juli zeigt abgehakt', await abgehakt(6));

  /* Zurueckschalten auf Offen ueber den Betrag: die Monatshaken verschwinden. */
  await seite.locator(betragSel).click({ button: 'right' });
  await bisRuhe(seite);
  gleich('erneuter Rechtsklick auf den Betrag setzt den Stand zurueck auf "Offen"', await standWert(), 'Offen');
  pruef('Mai ist NICHT mehr abgehakt (Monatshaken wurden beim Zurueckschalten geloescht)', !(await abgehakt(4)));
  pruef('Juni ist NICHT mehr abgehakt', !(await abgehakt(5)));
  pruef('Juli ist NICHT mehr abgehakt', !(await abgehakt(6)));
}

/* ====================================================================
   6. Rechnungen: Ansicht "Alle"
   ==================================================================== */
console.log('\n6. Rechnungen — Ansicht "Alle"');
await frisch(seite);

/* Unabhaengige Herleitung der erwarteten Zahlen aus dem Datenvorrat selbst,
   nicht aus index.html abgeschrieben. */
function erwarteteAlleRechnungen() {
  const d = daten();
  const js = d.jahre.slice().sort((a, b) => a - b);
  const namen = [];
  js.forEach(j => (d.rechnungen[j] || []).forEach(g => { if (namen.indexOf(g.name) < 0) namen.push(g.name); }));
  namen.sort((a, c) => String(a).localeCompare(String(c), 'de-CH', { sensitivity: 'base', numeric: true }));
  const betragVon = (j, name, filter) => (d.rechnungen[j] || [])
    .filter(g => g.name === name)
    .reduce((s, g) => s + (g.rechnungen || []).filter(r => !filter || filter(r))
      .reduce((t, r) => t + (r.betrag || 0), 0), 0);
  const zeile = (filter) => js.map(j => namen.reduce((s, n) => s + betragVon(j, n, filter), 0));
  return {
    jahre: js, namen,
    proSteller: namen.map(n => js.map(j => betragVon(j, n))),
    zusammen: zeile(null),
    offen: zeile(r => r.stand !== 'Bezahlt'),
    bezahlt: zeile(r => r.stand === 'Bezahlt'),
    /* Was im Budget als Zeile «Rechnungen» steht: die auf Monate verteilte Summe.
       Sie ist etwas anderes als die Summe der Rechnungsbetraege — genau deshalb
       steht sie in der Jahresansicht mit eigenem Namen darunter. */
    verteilt: js.map(j => (d.rechnungen[j] || []).reduce((s, g) =>
      s + (g.rechnungen || []).reduce((t, r) =>
        t + (r.reihe || []).reduce((a, x) => a + (x || 0), 0), 0), 0)),
  };
}
const erw = erwarteteAlleRechnungen();
gleich('alphabetische Reihenfolge mit korrekter Umlautsortierung',
  erw.namen.join(' | '), ['Ärnst AG', 'nordmann', 'Öchsli Zahnpraxis'].join(' | '));

await seite.locator('button[data-geh-alle]').click();
await bisRuhe(seite);
pruef('Umschaltung Budget/Rechnungen steht in der Leiste, auch in der Ansicht "Alle"',
  await seite.locator('button[data-geh-ansicht="rechnung"]').count() > 0);
await seite.locator('button[data-geh-ansicht="rechnung"]').click();
await bisRuhe(seite);

const bild = await seite.evaluate(() => {
  const kopf = Array.from(document.querySelectorAll('#blatt table thead th')).map(th => th.textContent.trim());
  const zeilen = Array.from(document.querySelectorAll('#blatt table tbody tr'))
    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
  return { kopf, zeilen };
});
pruef('Kopfzeile nennt ein Jahr je Spalte plus Total', bild.kopf.length === erw.jahre.length + 2, bild.kopf.join(' | '));
gleich('Jahresspalten stimmen mit den geladenen Jahrgaengen ueberein',
  bild.kopf.slice(1, -1).join(','), erw.jahre.join(','));

pruef('so viele Zeilen wie Steller plus vier Summenzeilen',
  bild.zeilen.length === erw.namen.length + 4, bild.zeilen.length);

erw.namen.forEach((name, i) => {
  const zeile = bild.zeilen[i];
  pruef('Zeile ' + (i + 1) + ' ist "' + name + '" (Alphabet/Umlaut)', zeile && zeile[0] === name, zeile && zeile[0]);
  if (zeile) {
    const erwartet = erw.proSteller[i].map(fmt).concat([fmt(erw.proSteller[i].reduce((s, x) => s + x, 0))]);
    gleich('Zahlen der Zeile "' + name + '"', zeile.slice(1).join(' | '), erwartet.join(' | '));
  }
});
const summenNamen = ['Rechnungsbeträge zusammen', 'davon offen', 'davon bezahlt',
                     'auf Monate verteilt'];
const summenWerte = [erw.zusammen, erw.offen, erw.bezahlt, erw.verteilt];
summenNamen.forEach((name, i) => {
  const zeile = bild.zeilen[erw.namen.length + i];
  pruef('Summenzeile "' + name + '" steht an der richtigen Stelle', zeile && zeile[0] === name, zeile && zeile[0]);
  if (zeile) {
    const werte = summenWerte[i];
    const erwartet = werte.map(fmt).concat([fmt(werte.reduce((s, x) => s + x, 0))]);
    gleich('Zahlen der Summenzeile "' + name + '"', zeile.slice(1).join(' | '), erwartet.join(' | '));
  }
});

/* Die Umschaltung wirkt: zurueck auf Budget bleibt die Ansicht "Alle". */
await seite.locator('button[data-geh-ansicht="budget"]').click();
await bisRuhe(seite);
const zurueck = await seite.evaluate(() => ({
  nochAlle: /\ban\b/.test(document.querySelector('[data-geh-alle]').className),
  eckeText: (document.querySelector('#blatt table thead th.ecke') || {}).textContent,
}));
pruef('nach Umschalten auf Budget bleibt "Alle" markiert', zurueck.nochAlle, zurueck);
pruef('die Tafel zeigt jetzt die Budget-Uebersicht (nicht mehr "Rechnungen")',
  zurueck.eckeText && !/Rechnungen/.test(zurueck.eckeText), zurueck.eckeText);

/* ====================================================================
   7. Zeile einfuegen, loeschen, Jahr anlegen — kurze Gegenprobe
   ==================================================================== */
console.log('\n7. Zeile einfuegen/loeschen, Jahr anlegen/loeschen — Gegenprobe');
await frisch(seite);

const fixId = await blockId(seite, ARBEITSJAHR, 'Fixkosten');
pruef('Block "Fixkosten" gefunden', !!fixId, fixId);
if (fixId) {
  /* "Fixkosten" ist frisch geladen zugeklappt: die Kinderzeilen sind dann gar
     nicht im DOM, DOM-Zaehlen vor dem Oeffnen wuerde also 0 ergeben statt der
     wahren Anzahl. Der Ausgangsstand kommt deshalb direkt aus S.daten. */
  const vorher = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []).find(x => x.name === 'Fixkosten');
    return (b.pos || []).length;
  }, ARBEITSJAHR);
  await seite.locator('tr.kopf[data-k="' + fixId + '"]').hover();
  await seite.locator('[data-neu-pos="' + fixId + '"]').click();
  await bisRuhe(seite);
  const nachher = await kinderZahl(seite, fixId);
  gleich('"+" fuegt genau eine Zeile unter "Fixkosten" ein', nachher, vorher + 1);
  const neuName = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []).find(x => x.name === 'Fixkosten');
    const p = (b.pos || [])[b.pos.length - 1];
    return { id: p.id, name: p.name };
  }, ARBEITSJAHR);
  gleich('die neue Zeile heisst "Neue Zeile"', neuName.name, 'Neue Zeile');

  await seite.locator('tr[data-id="' + neuName.id + '"]').hover();
  await seite.locator('[data-weg="' + neuName.id + '"]').click();
  await bisRuhe(seite);
  const nachLoeschen = await kinderZahl(seite, fixId);
  gleich('"×" loescht die Zeile wieder — zurueck auf den Ausgangsstand', nachLoeschen, vorher);
}

const jahreVorher = await seite.evaluate(() => S.jahre.slice().sort((a, b) => a - b));
const erwartetesNeuesJahr = Math.max.apply(null, jahreVorher) + 1;
await seite.locator('button[data-neu-jahr="1"]').click();
await bisRuhe(seite);
const vorschlag = await seite.evaluate(() => S.neu ? S.neu.jahr : null);
gleich('Dialog "Neues Jahr" schlaegt das Folgejahr vor', vorschlag, erwartetesNeuesJahr);
await seite.locator('button[data-neu-an="1"]').click();
await bisRuhe(seite);
const nachAnlegen = await seite.evaluate(() => ({
  jahre: S.jahre.slice().sort((a, b) => a - b), jahr: S.jahr, ansicht: S.ansicht }));
gleich('das neue Jahr steht in der Jahresliste', nachAnlegen.jahre.join(','),
  jahreVorher.concat([erwartetesNeuesJahr]).join(','));
gleich('die App zeigt danach das neue Jahr', nachAnlegen.jahr, erwartetesNeuesJahr);
const knopfDa = await seite.locator('button[data-geh-jahr="' + erwartetesNeuesJahr + '"]').count();
pruef('ein Jahresknopf fuer ' + erwartetesNeuesJahr + ' steht in der Leiste', knopfDa > 0, knopfDa);

await seite.locator('button[data-weg-jahr="1"]').click();
await bisRuhe(seite);
await seite.locator('button[data-weg-jahr-an="1"]').click();
await bisRuhe(seite);
const nachLoeschenJahr = await seite.evaluate(() => S.jahre.slice().sort((a, b) => a - b));
gleich('"−" loescht das Jahr wieder — zurueck auf den Ausgangsstand', nachLoeschenJahr.join(','), jahreVorher.join(','));
const knopfWeg = await seite.locator('button[data-geh-jahr="' + erwartetesNeuesJahr + '"]').count();
pruef('der Jahresknopf fuer ' + erwartetesNeuesJahr + ' ist wieder weg', knopfWeg === 0, knopfWeg);

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
