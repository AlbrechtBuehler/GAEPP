/* GAEPP — Pruefstand: die Haerteprobe.

   Haelt zehn frisch behobene Befunde fest, jeder mit mindestens einer Pruefung,
   die ROT wuerde, wenn der Fehler zurueckkaeme:

     1.  Ziehen und Ablegen bewegt die Zeile wirklich (Griff, nicht die Zeile)
     2.  Die Zeile laesst sich auch mit der Tastatur verschieben (Pfeil am Griff)
     3.  Escape schliesst das oberste Fenster — fuer jedes der neun Fenster
     4.  Eine kaputte Datendatei legt GAEPP nicht still, dazu der Notausgang
     5.  «Uebertragen … auch in die Folgejahre» fasst keine fremde Zeile an
     6.  «Getilgt bisher» zaehlt keine Schuld mit, die noch nicht laeuft
     7.  Eine Quote ausserhalb von null bis hundert steht in der Warnfarbe
     8.  Eine negative Rate laesst die Schuld wachsen, auch bei Basis null
     9.  Mit dem Betrag faellt die Marke, in beiden Tafeln
     10. HTML-Export und der Dialog «Jahr loeschen» — Einzahl/Mehrzahl

   Gemessen wird durchgehend die Wirkung: der Datenstand nach einer echten
   Bedienung, der gerenderte Text, die tatsaechlich abgefeuerten Ereignisse —
   nicht der Quelltext. Erwartungswerte sind von Hand aus vorrat.mjs hergeleitet,
   nirgends aus einem Lauf dieser App abgeschrieben. Albrechts echte Zahlen und
   Namen kommen hier nicht vor — alle Positionen sind erfunden.

   Port 8106. Fahren: node haerte.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { daten as vorratDaten } from './vorrat.mjs';

const PORT = 8106;
const ARBEITSJAHR = 2026;
const { pruef, gleich, ende } = bilanzbuch('haerte');

/* ---------------------------------------------------------------- Helfer,
   eigene Kopien im Stil von hilfe.mjs/befunde.mjs — jede Datei im Pruefstand
   traegt ihre eigenen, es gibt bewusst keine gemeinsame Datei ausser
   hilfe.mjs/vorrat.mjs. */

function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).trim();
  if (s === '' || s === '—') return 0;
  const n = parseInt(s.replace(/'/g, '').replace(/−/g, '-'), 10);
  return isNaN(n) ? null : n;
}
/* Formatierung wie in index.html — fmt(n, immer). */
function fmt(n, immer) {
  const r = Math.round(n || 0);
  if (r === 0 && !immer) return '';
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

async function dbl(seite, sel) { await seite.locator(sel).first().dblclick(); await bisRuhe(seite); }
async function klick(seite, sel) { await seite.locator(sel).first().click(); await bisRuhe(seite); }
async function rklick(seite, sel) { await seite.locator(sel).first().click({ button: 'right' }); await bisRuhe(seite); }
async function tippe(seite, sel, wert) {
  const el = seite.locator(sel).first();
  await el.fill(String(wert));
  await el.dispatchEvent('change');
  await bisRuhe(seite);
}
async function zelleText(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const feld = el.matches('input,select') ? el : el.querySelector('input,select');
    return feld ? feld.value : el.textContent.trim();
  }, sel);
}
async function klasse(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s); return el ? el.className : null; }, sel);
}
async function vorhanden(seite, sel) { return seite.evaluate((s) => !!document.querySelector(s), sel); }
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
async function farbeVon(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).color : null; }, sel);
}
async function fokusPasstZu(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.activeElement;
    return !!(el && el.matches && el.matches(s));
  }, sel);
}
async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
async function gehJahr(seite, jahr) { await klick(seite, `[data-geh-jahr="${jahr}"]`); }
async function allesAuf(seite) { await klick(seite, '[data-alle-um]'); }
async function klappeById(seite, id) { await klick(seite, `button.klapper[data-klapp="${id}"]`); }

/* Datenzugriffe ueber S selbst — funktionieren unabhaengig davon, welches Jahr
   gerade im Blatt steht, und lesen den ECHTEN Datenstand, nicht den gerenderten
   Text (der nur fuer das aktuell gezeigte Jahr existiert). */
async function blockId(seite, jahr, name) {
  return seite.evaluate(([j, n]) => { const b = (S.daten[j] || []).find(x => x.name === n); return b ? b.id : null; }, [jahr, name]);
}
async function gruppeId(seite, jahr, gruppenName) {
  return seite.evaluate(([j, gn]) => {
    const b = (S.daten[j] || []).find(x => x.art === 'schulden');
    const g = b && (b.gruppen || []).find(x => x.name === gn);
    return g ? g.id : null;
  }, [jahr, gruppenName]);
}
async function blockPosId(seite, jahr, blockName, posName) {
  return seite.evaluate(([j, bn, pn]) => {
    const b = (S.daten[j] || []).find(x => x.name === bn);
    const p = b && (b.pos || []).find(x => x.name === pn);
    return p ? p.id : null;
  }, [jahr, blockName, posName]);
}
async function schuldPos(seite, jahr, name) {
  return seite.evaluate(([j, n]) => {
    const b = (S.daten[j] || []).find(x => x.art === 'schulden');
    if (!b) return null;
    for (const g of (b.gruppen || [])) {
      const p = (g.pos || []).find(x => x.name === n);
      if (p) return { id: p.id, key: p.key, gKey: g.key, basis: p.basis, reihe: p.reihe.slice() };
    }
    return null;
  }, [jahr, name]);
}
async function positionsNamen(seite, jahr, blockName) {
  return seite.evaluate(([j, bn]) => {
    const b = (S.daten[j] || []).find(x => x.name === bn);
    return b ? (b.pos || []).map(p => p.name) : null;
  }, [jahr, blockName]);
}
async function reiheVon(seite, jahr, blockName, posName) {
  return seite.evaluate(([j, bn, pn]) => {
    const b = (S.daten[j] || []).find(x => x.name === bn);
    const p = b && (b.pos || []).find(x => x.name === pn);
    return p ? p.reihe.slice() : null;
  }, [jahr, blockName, posName]);
}

/* Eine neue Zeile in einer gewoehnlichen Kategorie anlegen und benennen. */
async function neueBlockPos(seite, jahr, blockName, name) {
  await gehJahr(seite, jahr);
  const bid = await blockId(seite, jahr, blockName);
  await seite.locator(`tr[data-k="${bid}"]`).first().hover();
  await klick(seite, `[data-neu-pos="${bid}"]`);
  const pid = await seite.evaluate(([j, bn]) => {
    const b = (S.daten[j] || []).find(x => x.name === bn);
    const arr = b ? (b.pos || []) : [];
    return arr.length ? arr[arr.length - 1].id : null;
  }, [jahr, blockName]);
  if (pid) await tippe(seite, `input.namensfeld[data-p="${pid}"]`, name);
  return pid;
}
/* Eine neue Zeile in einer Schulden-Gruppe anlegen und benennen. */
async function neueSchuldPos(seite, jahr, gruppenName, name) {
  await gehJahr(seite, jahr);
  const gid = await gruppeId(seite, jahr, gruppenName);
  await seite.locator(`tr[data-k="${gid}"]`).first().hover();
  await klick(seite, `[data-neu-pos="${gid}"]`);
  const pid = await seite.evaluate(([j, gn]) => {
    const b = (S.daten[j] || []).find(x => x.art === 'schulden');
    const g = b && (b.gruppen || []).find(x => x.name === gn);
    const arr = g ? (g.pos || []) : [];
    return arr.length ? arr[arr.length - 1].id : null;
  }, [jahr, gruppenName]);
  if (pid) await tippe(seite, `input.namensfeld[data-p="${pid}"]`, name);
  return pid;
}

async function korrOeffnenBasis(seite, pid) { await dbl(seite, `td[data-kb="${pid}"]`); }
async function korrOeffnenRest(seite, pid) { await dbl(seite, `td[data-kr="${pid}"]`); }
async function korrEintragen(seite, { pid, art, richtung, betrag, notiz }) {
  if (art === 'basis') await korrOeffnenBasis(seite, pid); else await korrOeffnenRest(seite, pid);
  if (richtung === 'minus') await klick(seite, '[data-korr-richt="minus"]');
  await tippe(seite, '[data-korr-betrag]', betrag);
  if (notiz) await tippe(seite, '[data-korr-notiz]', notiz);
  await klick(seite, '[data-korr-add]');
}
async function korrSchliessen(seite) { await klick(seite, '[data-zu="korr"]'); }

const kachel = async (seite, label) => seite.evaluate((lbl) => {
  const s = Array.from(document.querySelectorAll('.band > span'))
    .find(x => x.querySelector('.k') && x.querySelector('.k').textContent.trim() === lbl);
  return s ? { v: s.querySelector('.v').textContent.trim(), m: s.querySelector('.m').textContent.trim(),
    vStyle: s.querySelector('.v').getAttribute('style') || '' } : null;
}, label);

/* Ziehen am Griff, mit einem gemeinsamen DataTransfer ueber dragstart, dragover
   und drop hinweg — echte Mausereignisse loesen HTML5-Drag in einem kopf-losen
   Chromium nicht zuverlaessig aus, deshalb werden die Ereignisse hier GESTELLT
   (dispatchEvent), nicht von einer echten Maus erzeugt. Ausdruecklich gezaehlt
   wird, ob «drop» ueberhaupt ankommt, und ob zwischen dragstart und dragover
   derselbe Knoten im Dokument bleibt (der eigentliche Fehler: ein Neuzeichnen
   waehrend des Ziehens loeschte den Griff, und Chromium brach den Zug ab). */
async function ziehen(seite, vonId, aufId) {
  return seite.evaluate(([von, auf]) => {
    let dropZahl = 0;
    const zaehler = () => { dropZahl++; };
    document.addEventListener('drop', zaehler);
    const g = document.querySelector('button.griff[data-griff="' + von + '"]');
    const zielTr = document.querySelector('tr[data-id="' + auf + '"]');
    if (!g || !zielTr) { document.removeEventListener('drop', zaehler); return { ok: false }; }
    const marke = 'haerte-' + Math.random();
    g.__haerteMarke = marke;
    const dt = new DataTransfer();
    const feuer = (el, typ) => el.dispatchEvent(new DragEvent(typ, { bubbles: true, cancelable: true, dataTransfer: dt }));
    feuer(g, 'dragstart');
    const g1 = document.querySelector('button.griff[data-griff="' + von + '"]');
    const nachDragstart = g1 === g && g1.__haerteMarke === marke;
    feuer(zielTr, 'dragover');
    const g2 = document.querySelector('button.griff[data-griff="' + von + '"]');
    const nachDragover = g2 === g && g2.__haerteMarke === marke;
    feuer(zielTr, 'drop');
    feuer(g, 'dragend');
    document.removeEventListener('drop', zaehler);
    return { ok: true, dropZahl, nachDragstart, nachDragover };
  }, [vonId, aufId]);
}

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   1. Ziehen und Ablegen bewegt die Zeile wirklich
   ====================================================================
   Fixkosten 2026 traegt in vorrat.mjs die Reihenfolge Miete, Strom,
   Versicherung. Versicherung an den Griff gefasst und auf Miete fallen
   gelassen -> verschiebe() spleisst Versicherung heraus und vor Miete
   hinein: Versicherung, Miete, Strom. */
console.log('\n1. Ziehen und Ablegen bewegt die Zeile wirklich (am Griff)');
await frisch(seite);
await gehJahr(seite, ARBEITSJAHR);
await klappeById(seite, await blockId(seite, ARBEITSJAHR, 'Fixkosten'));
await klappeById(seite, await blockId(seite, ARBEITSJAHR, 'Abonnements'));

const mieteId = await blockPosId(seite, ARBEITSJAHR, 'Fixkosten', 'Miete');
const versicherungId = await blockPosId(seite, ARBEITSJAHR, 'Fixkosten', 'Versicherung');
const mobilId = await blockPosId(seite, ARBEITSJAHR, 'Abonnements', 'Mobilfunk');
pruef('Zeilen Miete/Versicherung/Mobilfunk gefunden', !!mieteId && !!versicherungId && !!mobilId,
  { mieteId, versicherungId, mobilId });

if (mieteId && versicherungId) {
  const attr = await seite.evaluate((pid) => {
    const griff = document.querySelector('button.griff[data-griff="' + pid + '"]');
    const tr = document.querySelector('tr[data-id="' + pid + '"]');
    return { griffDraggable: griff ? griff.getAttribute('draggable') : null,
      trDraggable: tr ? tr.getAttribute('draggable') : null };
  }, mieteId);
  gleich('der Griff traegt draggable="true"', attr.griffDraggable, 'true');
  pruef('die Zeile selbst ist NICHT draggable (Text bleibt markierbar)', attr.trDraggable === null, attr);

  const vorOrdnung = await positionsNamen(seite, ARBEITSJAHR, 'Fixkosten');
  gleich('Ausgangsordnung Fixkosten', vorOrdnung.join(','), ['Miete', 'Strom', 'Versicherung'].join(','));

  const zug = await ziehen(seite, versicherungId, mieteId);
  pruef('Griff und Zielzeile im Dokument gefunden', zug.ok, zug);
  pruef('zwischen dragstart und dragover bleibt derselbe Knoten im Dokument (kein Neuzeichnen waehrend des Ziehens)',
    zug.nachDragstart && zug.nachDragover, zug);
  pruef('das drop-Ereignis kommt tatsaechlich an', zug.dropZahl === 1, zug);
  await bisRuhe(seite);

  const nachOrdnung = await positionsNamen(seite, ARBEITSJAHR, 'Fixkosten');
  gleich('Versicherung steht jetzt vor Miete und Strom (verschiebe() hat gewirkt)',
    nachOrdnung.join(','), ['Versicherung', 'Miete', 'Strom'].join(','));

  const zustandNachZug = await seite.evaluate(() => ({ zieht: S.zieht, ziel: S.ziel }));
  gleich('S.zieht ist nach dragend wieder leer', zustandNachZug.zieht, null);
  gleich('S.ziel ist nach dragend wieder leer', zustandNachZug.ziel, null);

  /* Gegenprobe: ueber die Gruppengrenze hinweg (Fixkosten -> Abonnements)
     bewegt sich nichts, in keiner der beiden Sektionen. */
  const vorFix = await positionsNamen(seite, ARBEITSJAHR, 'Fixkosten');
  const vorAbo = await positionsNamen(seite, ARBEITSJAHR, 'Abonnements');
  const zugQuer = await ziehen(seite, mieteId, mobilId);
  pruef('Gegenprobe: Griff und Zielzeile ueber die Grenze hinweg gefunden', zugQuer.ok, zugQuer);
  await bisRuhe(seite);
  const nachFix = await positionsNamen(seite, ARBEITSJAHR, 'Fixkosten');
  const nachAbo = await positionsNamen(seite, ARBEITSJAHR, 'Abonnements');
  gleich('Gegenprobe: Fixkosten unveraendert', nachFix.join(','), vorFix.join(','));
  gleich('Gegenprobe: Abonnements unveraendert', nachAbo.join(','), vorAbo.join(','));
}

/* ====================================================================
   2. Die Zeile laesst sich auch mit der Tastatur verschieben
   ====================================================================
   Abonnements 2026: Mobilfunk, Streaming. Griff von Mobilfunk fokussiert,
   Pfeil rauf tut nichts (schon oben), Pfeil runter vertauscht die beiden,
   der Fokus bleibt auf demselben Griff, ein weiterer Pfeil runter tut am
   unteren Ende wieder nichts. */
console.log('\n2. Die Zeile laesst sich auch mit der Tastatur verschieben (Pfeil am Griff)');
await frisch(seite);
await gehJahr(seite, ARBEITSJAHR);
await klappeById(seite, await blockId(seite, ARBEITSJAHR, 'Abonnements'));
const mobilId2 = await blockPosId(seite, ARBEITSJAHR, 'Abonnements', 'Mobilfunk');
const streamingId2 = await blockPosId(seite, ARBEITSJAHR, 'Abonnements', 'Streaming');
pruef('Zeilen Mobilfunk/Streaming gefunden', !!mobilId2 && !!streamingId2, { mobilId2, streamingId2 });

if (mobilId2 && streamingId2) {
  await seite.locator(`button.griff[data-griff="${mobilId2}"]`).first().focus();
  await seite.keyboard.press('ArrowUp');
  await bisRuhe(seite);
  gleich('Pfeil rauf am obersten Griff tut nichts', (await positionsNamen(seite, ARBEITSJAHR, 'Abonnements')).join(','),
    ['Mobilfunk', 'Streaming'].join(','));
  pruef('Fokus bleibt am Griff (nach dem wirkungslosen Pfeil rauf)',
    await fokusPasstZu(seite, `[data-griff="${mobilId2}"]`));

  await seite.keyboard.press('ArrowDown');
  await bisRuhe(seite);
  gleich('Pfeil runter vertauscht Mobilfunk und Streaming', (await positionsNamen(seite, ARBEITSJAHR, 'Abonnements')).join(','),
    ['Streaming', 'Mobilfunk'].join(','));
  pruef('der Fokus bleibt auf demselben Griff (derselben Zeile, jetzt an anderer Stelle)',
    await fokusPasstZu(seite, `[data-griff="${mobilId2}"]`));

  await seite.keyboard.press('ArrowDown');
  await bisRuhe(seite);
  gleich('Pfeil runter am untersten Griff tut nichts mehr', (await positionsNamen(seite, ARBEITSJAHR, 'Abonnements')).join(','),
    ['Streaming', 'Mobilfunk'].join(','));
}

/* ====================================================================
   3. Escape schliesst das oberste Fenster
   ====================================================================
   Fuer jedes der neun Fenster: oeffnen, Escape, Fenster weg und der
   zugehoerige Zustand in S wieder leer. Uebertragen zusaetzlich: der
   Fokus liegt danach wieder in der Zelle, aus der es geoeffnet wurde.
   Korrektur/Korrektur-Warnung als Sonderfall: Escape schliesst nur das
   OBERSTE Fenster (die Warnung), das Korrekturfenster bleibt offen — erst
   ein zweites Escape schliesst auch dieses. */
console.log('\n3. Escape schliesst das oberste Fenster');

console.log('  3a. Uebertragen — Escape schliesst es, der Fokus kehrt zur Zelle zurueck');
await frisch(seite);
await gehJahr(seite, ARBEITSJAHR);
await klappeById(seite, await blockId(seite, ARBEITSJAHR, 'Fixkosten'));
const mieteId3 = await blockPosId(seite, ARBEITSJAHR, 'Fixkosten', 'Miete');
const uebSel = `input.zelle[data-z="${mieteId3}"][data-m="0"]`;
await dbl(seite, uebSel);
pruef('Fenster «Uebertragen» offen', await vorhanden(seite, '[data-schleier="ueb"]'));
await seite.keyboard.press('Escape');
await bisRuhe(seite);
pruef('Escape schliesst «Uebertragen»', !(await vorhanden(seite, '[data-schleier="ueb"]')));
gleich('S.ueb ist wieder leer', await seite.evaluate(() => S.ueb), null);
pruef('der Fokus liegt wieder in der Zelle, aus der das Fenster geoeffnet wurde', await fokusPasstZu(seite, uebSel));

console.log('  3b. Basis (ausserhalb der Schulden) — Escape schliesst es, Fokus kehrt zurueck');
await frisch(seite);
await gehJahr(seite, ARBEITSJAHR);
await klappeById(seite, await blockId(seite, ARBEITSJAHR, 'Einkommen'));
const lohnId3 = await blockPosId(seite, ARBEITSJAHR, 'Einkommen', 'Nettolohn');
const basisSel = `input.zelle[data-b="${lohnId3}"]`;
await dbl(seite, basisSel);
pruef('Fenster «Basis» offen', await vorhanden(seite, '[data-schleier="basis"]'));
await seite.keyboard.press('Escape');
await bisRuhe(seite);
pruef('Escape schliesst «Basis»', !(await vorhanden(seite, '[data-schleier="basis"]')));
gleich('S.basis ist wieder leer', await seite.evaluate(() => S.basis), null);
pruef('der Fokus liegt wieder in der Basiszelle', await fokusPasstZu(seite, basisSel));

console.log('  3c. Korrektur und Korrektur-Warnung — Escape schliesst nur das oberste Fenster');
await frisch(seite);
await allesAuf(seite);
const darlehen27 = await schuldPos(seite, 2027, 'Darlehen Blumberg');
const darlehen26 = await schuldPos(seite, ARBEITSJAHR, 'Darlehen Blumberg');
pruef('Darlehen Blumberg 2026/2027 gefunden', !!darlehen27 && !!darlehen26, { darlehen27, darlehen26 });
if (darlehen27 && darlehen26) {
  await gehJahr(seite, 2027);
  await korrEintragen(seite, { pid: darlehen27.id, art: 'basis', richtung: 'plus', betrag: '500', notiz: 'Haerteprobe Warnung' });
  await korrSchliessen(seite);

  await gehJahr(seite, ARBEITSJAHR);
  await korrOeffnenBasis(seite, darlehen26.id);
  pruef('Fenster «Korrektur» offen', await vorhanden(seite, '[data-schleier="korr"]'));
  await tippe(seite, '[data-korr-betrag]', '300');
  await klick(seite, '[data-korr-add]');
  pruef('das Hinzufuegen loest die Warnung aus, das Korrekturfenster bleibt darunter bestehen',
    await vorhanden(seite, '[data-schleier="korrWarn"]') && await vorhanden(seite, '[data-schleier="korr"]'));

  await seite.keyboard.press('Escape');
  await bisRuhe(seite);
  pruef('erstes Escape schliesst nur die Warnung', !(await vorhanden(seite, '[data-schleier="korrWarn"]')));
  pruef('das Korrekturfenster steht noch offen', await vorhanden(seite, '[data-schleier="korr"]'));
  const listeNachAbbruch = await seite.evaluate(([j, gk, pk]) => {
    const b = (S.daten[j] || []).find(x => x.art === 'schulden');
    const g = b && (b.gruppen || []).find(x => x.key === gk);
    const p = g && (g.pos || []).find(x => x.key === pk);
    return p && p.korr && p.korr.basis ? p.korr.basis.length : 0;
  }, [ARBEITSJAHR, darlehen26.gKey, darlehen26.key]);
  gleich('die abgebrochene Korrektur (300) wurde NICHT eingetragen', listeNachAbbruch, 0);

  await seite.keyboard.press('Escape');
  await bisRuhe(seite);
  pruef('zweites Escape schliesst auch das Korrekturfenster', !(await vorhanden(seite, '[data-schleier="korr"]')));
  gleich('S.korr ist wieder leer', await seite.evaluate(() => S.korr), null);
  gleich('S.korrWarn ist wieder leer', await seite.evaluate(() => S.korrWarn), null);
}

console.log('  3d. Handbuch, Neues Jahr, Jahr loeschen, Sichern, Daten');
const einfacheFenster = [
  { name: 'Handbuch', oeffnen: ['[data-hb="1"]'], schleier: 'hb', feld: 'hb' },
  { name: 'Neues Jahr anlegen', oeffnen: ['[data-neu-jahr="1"]'], schleier: 'neu', feld: 'neu' },
  { name: 'Jahr loeschen', oeffnen: ['[data-weg-jahr="1"]'], schleier: 'wegJahr', feld: 'wegJahr' },
  { name: 'Sichern', oeffnen: ['[data-exp="1"]'], schleier: 'exp', feld: 'exp' },
  { name: 'Daten', oeffnen: ['[data-sync-auf="1"]'], schleier: 'sync', feld: 'syncAuf' }
];
for (const w of einfacheFenster) {
  await frisch(seite);
  for (const sel of w.oeffnen) await klick(seite, sel);
  pruef('Fenster «' + w.name + '» offen', await vorhanden(seite, `[data-schleier="${w.schleier}"]`));
  await seite.keyboard.press('Escape');
  await bisRuhe(seite);
  pruef('Escape schliesst «' + w.name + '»', !(await vorhanden(seite, `[data-schleier="${w.schleier}"]`)));
  const feldWert = await seite.evaluate((f) => S[f], w.feld);
  pruef('S.' + w.feld + ' ist wieder leer', !feldWert, feldWert);
}

/* ====================================================================
   4. Eine kaputte Datendatei legt GAEPP nicht still
   ====================================================================
   Eine gaepp-daten.json ueber die Route ausgeliefert, der bei einer
   Position (Miete 2026) die reihe fehlt und deren jahre einen unbrauchbaren
   Eintrag traegt. Erwartung: die App zeigt trotzdem eine Tabelle, der
   fehlende Wert wird zu zwoelf Nullen geheilt, kein JavaScript-Fehler.
   Danach: ein erzwungener Fehler beim Zeichnen loest den Notausgang aus,
   und die beiden Knoepfe dort fuehren wirklich zurueck. */
console.log('\n4. Eine kaputte Datendatei legt GAEPP nicht still, dazu der Notausgang');

function kaputteDatei() {
  const d = JSON.parse(JSON.stringify(vorratDaten()));
  const fix = d.daten[ARBEITSJAHR].find(b => b.key === 'fixkosten');
  const miete = fix.pos.find(p => p.key === 'miete');
  delete miete.reihe;
  d.jahre = d.jahre.concat(['unbrauchbar']);
  return d;
}
const kaputt = kaputteDatei();
await seite.route('**/gaepp-daten.json', route => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(kaputt)
}));
await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await seite.reload({ waitUntil: 'load' });
await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
await bisRuhe(seite);

pruef('die App zeigt trotzdem eine Tabelle', (await seite.locator('table').count()) > 0);
const geheiltesFeld = await reiheVon(seite, ARBEITSJAHR, 'Fixkosten', 'Miete');
pruef('die fehlende reihe wurde zu zwoelf Zahlen geheilt', Array.isArray(geheiltesFeld) && geheiltesFeld.length === 12, geheiltesFeld);
pruef('geheilt sind es zwoelf Nullen', geheiltesFeld && geheiltesFeld.every(x => x === 0), geheiltesFeld);
const jahreImStand = await seite.evaluate(() => S.jahre.slice());
pruef('der unbrauchbare Eintrag in jahre steht nicht im Datenstand', jahreImStand.indexOf('unbrauchbar') < 0, jahreImStand);
pruef('die uebrigen drei Jahrgaenge stehen weiterhin da', jahreImStand.join(',') === [2025, 2026, 2027].join(','), jahreImStand);

console.log('  4b. Notausgang: ein erzwungener Fehler beim Zeichnen');
/* Ein Merkzeichen direkt im Browserspeicher gesetzt (am Datenstand vorbei) —
   nicht aus der Route, aus der App. Bleibt es nach «Vergiss» stehen, wurde
   der Speicher NICHT wirklich geleert, sondern nur der alte (gecachte)
   Stand erneut gezeichnet. */
await seite.evaluate(() => {
  try {
    const roh = JSON.parse(localStorage.getItem('gaepp.tabelle.v1'));
    const fix = roh.daten[2026].find(b => b.key === 'fixkosten');
    const miete = fix.pos.find(p => p.key === 'miete');
    miete.name = 'GECACHTER-STAND-NICHT-GELOESCHT';
    localStorage.setItem('gaepp.tabelle.v1', JSON.stringify(roh));
  } catch (e) {}
});
await seite.evaluate(() => {
  window.budgetblatt = () => { throw new Error('Erzwungener Testfehler (haerte.mjs)'); };
  window.zeichne();
});
await bisRuhe(seite);
const notausgang = await seite.evaluate(() => {
  const leer = document.querySelector('#blatt .leer');
  if (!leer) return null;
  const laden = leer.querySelector('[data-laden]'), vergiss = leer.querySelector('[data-vergiss]');
  return { text: leer.textContent, hatLaden: !!laden, ladenText: laden ? laden.textContent.trim() : null,
    hatVergiss: !!vergiss, vergissText: vergiss ? vergiss.textContent.trim() : null };
});
pruef('der Notausgang zeigt sich (Datenstand laesst sich nicht anzeigen)', notausgang !== null, notausgang);
if (notausgang) {
  pruef('die Meldung nennt den erzwungenen Fehler', notausgang.text.includes('Erzwungener Testfehler'), notausgang);
  pruef('es gibt den Knopf «Andere Datei laden»', notausgang.hatLaden, notausgang);
  gleich('Beschriftung des Ladeknopfs', notausgang.ladenText, 'Andere Datei laden');
  pruef('es gibt den Knopf «Browserspeicher leeren und neu starten»', notausgang.hatVergiss, notausgang);
  gleich('Beschriftung des Vergiss-Knopfs', notausgang.vergissText, 'Browserspeicher leeren und neu starten');

  await seite.evaluate(() => { window.__ladenAufgerufen = false; window.dateiLaden = () => { window.__ladenAufgerufen = true; }; });
  await klick(seite, '[data-laden="1"]');
  pruef('«Andere Datei laden» ist wirklich an dateiLaden() angeschlossen',
    await seite.evaluate(() => window.__ladenAufgerufen));

  await seite.locator('[data-vergiss="1"]').first().click();
  await seite.waitForLoadState('load');
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
  pruef('nach «Browserspeicher leeren und neu starten» steht wieder eine echte Tabelle da — es gibt einen Weg zurueck',
    (await seite.locator('table').count()) > 0);
  const mieteName = await seite.evaluate(() => {
    const fix = (S.daten[2026] || []).find(b => b.key === 'fixkosten');
    const miete = fix && (fix.pos || []).find(p => p.key === 'miete');
    return miete ? miete.name : null;
  });
  gleich('der Browserspeicher wurde tatsaechlich geleert — der gecachte Merkzeichen-Name ist weg, es steht wieder «Miete» aus der Datei',
    mieteName, 'Miete');
}

await seite.unroute('**/gaepp-daten.json');
await frisch(seite);

/* ====================================================================
   5. «Uebertragen … auch in die Folgejahre» fasst keine fremde Zeile an
   ====================================================================
   «Sonderzahlung» wird in ZWEI verschiedenen Kategorien angelegt (Fixkosten
   und Lebenshaltung), je in 2026 und 2027 — zwei gleichnamige Zeilen mit
   demselben Schluessel, aber verschiedenem Kategorie-Schluessel. Uebertragen
   ab Januar 2026 mit gesetztem Haken darf nur Fixkosten treffen. */
console.log('\n5. «Uebertragen … auch in die Folgejahre» fasst keine fremde Zeile an');
await frisch(seite);

await neueBlockPos(seite, 2027, 'Fixkosten', 'Sonderzahlung');
const marke27Leb = await neueBlockPos(seite, 2027, 'Lebenshaltung', 'Sonderzahlung');
await tippe(seite, `input.zelle[data-z="${marke27Leb}"][data-m="2"]`, '999'); /* Merkwert: darf sich nicht aendern */
await neueBlockPos(seite, ARBEITSJAHR, 'Fixkosten', 'Sonderzahlung');
await neueBlockPos(seite, ARBEITSJAHR, 'Lebenshaltung', 'Sonderzahlung');

const fix26Id = await blockPosId(seite, ARBEITSJAHR, 'Fixkosten', 'Sonderzahlung');
const leb26Id = await blockPosId(seite, ARBEITSJAHR, 'Lebenshaltung', 'Sonderzahlung');
pruef('beide Zeilen 2026 gefunden', !!fix26Id && !!leb26Id, { fix26Id, leb26Id });
const leb26Vorher = await reiheVon(seite, ARBEITSJAHR, 'Lebenshaltung', 'Sonderzahlung');

if (fix26Id) {
  await gehJahr(seite, ARBEITSJAHR);
  await dbl(seite, `input.zelle[data-z="${fix26Id}"][data-m="0"]`);
  pruef('Fenster «Uebertragen» offen', await vorhanden(seite, '[data-schleier="ueb"]'));
  await tippe(seite, '[data-ueb-wert="1"]', '700');
  await klick(seite, '[data-ueb-folge="1"]');
  await klick(seite, '[data-ueb-an="1"]');
  await bisRuhe(seite);

  const fix26Reihe = await reiheVon(seite, ARBEITSJAHR, 'Fixkosten', 'Sonderzahlung');
  gleich('2026 Fixkosten «Sonderzahlung»: alle zwoelf Monate auf 700', fix26Reihe.join(','), new Array(12).fill(700).join(','));

  const fix27Reihe = await reiheVon(seite, 2027, 'Fixkosten', 'Sonderzahlung');
  gleich('2027 Fixkosten «Sonderzahlung» (Folgejahr, GLEICHE Kategorie): ebenfalls 700 in jedem Monat',
    fix27Reihe.join(','), new Array(12).fill(700).join(','));

  const leb26Nachher = await reiheVon(seite, ARBEITSJAHR, 'Lebenshaltung', 'Sonderzahlung');
  gleich('2026 Lebenshaltung «Sonderzahlung» (ANDERE Kategorie): unveraendert', leb26Nachher.join(','), leb26Vorher.join(','));

  const leb27Nachher = await reiheVon(seite, 2027, 'Lebenshaltung', 'Sonderzahlung');
  pruef('2027 Lebenshaltung «Sonderzahlung» (Folgejahr, ANDERE Kategorie): unangetastet — der Merkwert 999 im Maerz steht noch',
    leb27Nachher && leb27Nachher[2] === 999, leb27Nachher);
  gleich('2027 Lebenshaltung «Sonderzahlung»: sonst weiterhin alles bei null',
    leb27Nachher ? leb27Nachher.filter((_, i) => i !== 2).join(',') : null, new Array(11).fill(0).join(','));
}

/* ====================================================================
   6. «Getilgt bisher» zaehlt keine Schuld mit, die noch nicht laeuft
   ====================================================================
   Von Hand aus vorrat.mjs hergeleitet, Stichmonat August 2026 (acht
   Monatsraten gebucht):
     Steuerplan  12000 − 8×400 = 8800   Anfang 12000
     Darlehen     9000 − 8×250 = 7000   Anfang  9000
     Kredit       3600 − 8×300 = 1200   Anfang  3600
     Ratenkauf    1200 − 8×100 =  400   Anfang  1200
   Rest = 8800+7000+1200+400 = 17400, Anfang = 12000+9000+3600+1200 = 25800
   Getilgt = 25800−17400 = 8400, Quote = round(8400/25800*100) = 33 %.
   Eine neue Schuld «Rate Herbstwind» wird 2026 mit Basis 0 angelegt (im
   Geruest gefuehrt, aber noch nicht gestartet) und startet erst 2027 mit
   Basis 5000. Erwartung: Anfang/Getilgt/Rest bleiben EXAKT wie vorher —
   die kuenftige Schuld darf nicht rueckwirkend mitgezaehlt werden. */
console.log('\n6. «Getilgt bisher» zaehlt keine Schuld mit, die noch nicht laeuft');
await frisch(seite);
await allesAuf(seite);

const vorGetilgt = await kachel(seite, 'Getilgt bisher');
const vorRest = await kachel(seite, 'Restschuld heute');
pruef('Kacheln «Getilgt bisher» und «Restschuld heute» gefunden', vorGetilgt !== null && vorRest !== null, { vorGetilgt, vorRest });
if (vorGetilgt && vorRest) {
  gleich('Ausgangswert Getilgt bisher = 8400 (von Hand hergeleitet)', lies(vorGetilgt.v), 8400);
  gleich('Ausgangswert Restschuld heute = 17400 (von Hand hergeleitet)', lies(vorRest.v), 17400);
  const mVor = /^(-?\d+) % von ([\d']+) seit (\d+)$/.exec(vorGetilgt.m);
  pruef('Meta-Zeile nennt Quote, Anfangsstand und Startjahr', mVor !== null, vorGetilgt.m);
  if (mVor) { gleich('Ausgangs-Quote = 33 %', +mVor[1], 33); gleich('Ausgangs-Anfangsstand = 25800', lies(mVor[2]), 25800); }

  await neueSchuldPos(seite, ARBEITSJAHR, 'Schulden Firmen', 'Rate Herbstwind');
  await neueSchuldPos(seite, 2027, 'Schulden Firmen', 'Rate Herbstwind');
  const pos27 = await schuldPos(seite, 2027, 'Rate Herbstwind');
  pruef('«Rate Herbstwind» 2027 angelegt', !!pos27, pos27);
  if (pos27) {
    await gehJahr(seite, 2027);
    await tippe(seite, `input.zelle[data-b="${pos27.id}"]`, '5000');
    await dbl(seite, `input.zelle[data-z="${pos27.id}"][data-m="0"]`);
    await tippe(seite, '[data-ueb-wert="1"]', '500');
    await klick(seite, '[data-ueb-an="1"]');
    await bisRuhe(seite);
  }

  const nachGetilgt = await kachel(seite, 'Getilgt bisher');
  const nachRest = await kachel(seite, 'Restschuld heute');
  gleich('Getilgt bisher bleibt EXAKT bei 8400 — die kuenftige Schuld zaehlt nicht rueckwirkend', lies(nachGetilgt.v), 8400);
  gleich('Restschuld heute bleibt EXAKT bei 17400', lies(nachRest.v), 17400);
  gleich('Meta-Zeile unveraendert', nachGetilgt.m, vorGetilgt.m);
  const mNach = /^(-?\d+) % von ([\d']+) seit (\d+)$/.exec(nachGetilgt.m);
  if (mNach) {
    pruef('die Quote bleibt zwischen null und hundert', +mNach[1] >= 0 && +mNach[1] <= 100, mNach[1]);
    gleich('Anfang minus Getilgt ergibt die Restschuld (25800 − 8400 = 17400)', lies(mNach[2]) - lies(nachGetilgt.v), lies(nachRest.v));
  }
}

/* ====================================================================
   7. Eine Quote ausserhalb von null bis hundert steht in der Warnfarbe
   ====================================================================
   Stichmonat auf Dezember 2026 gesetzt (alle zwoelf Monatsraten gebucht):
     Steuerplan 12000−12×400=7200, Darlehen 9000−12×250=6000,
     Kredit 3600−12×300=0, Ratenkauf 1200−12×100=0 -> Rest = 13200,
     Anfang bleibt 25800, Getilgt = 12600, Quote = round(12600/25800*100)=49%.
   Eine Rest-Korrektur von −20000 auf Ratenkauf Zwyssig (Rest dort 0, am
   31.12. gebucht, zaehlt bei Stichmonat Dezember): neuer Rest gesamt
   13200−20000 = −6800. Getilgt = 25800−(−6800) = 32600.
   Quote = round(32600/25800*100) = round(126.357) = 126 % — ausserhalb. */
console.log('\n7. Eine Quote ausserhalb von null bis hundert steht in der Warnfarbe');
await frisch(seite);
await allesAuf(seite);
await seite.evaluate(() => { S.stichmonat = '2026-12'; zeichne(); });
await bisRuhe(seite);

const basis49 = await kachel(seite, 'Getilgt bisher');
pruef('Kachel «Getilgt bisher» gefunden (Stichmonat Dezember)', basis49 !== null, basis49);
if (basis49) {
  gleich('bei Dezember zunaechst 12600 (Quote 49 %, innerhalb null bis hundert)', lies(basis49.v), 12600);
  pruef('bei 49 % steht KEINE Warnfarbe im style-Attribut', !/--prot/.test(basis49.vStyle), basis49.vStyle);
}

const rate26 = await schuldPos(seite, ARBEITSJAHR, 'Ratenkauf Zwyssig');
pruef('«Ratenkauf Zwyssig» 2026 gefunden', !!rate26, rate26);
if (rate26) {
  await gehJahr(seite, ARBEITSJAHR);
  await korrEintragen(seite, { pid: rate26.id, art: 'rest', richtung: 'minus', betrag: '20000', notiz: 'Haerteprobe Quote' });
  await korrSchliessen(seite);

  const nach = await kachel(seite, 'Getilgt bisher');
  pruef('Kachel «Getilgt bisher» gefunden (nach der Korrektur)', nach !== null, nach);
  if (nach) {
    gleich('Getilgt bisher = 32600 (25800 − (−6800), von Hand hergeleitet)', lies(nach.v), 32600);
    pruef('die Quote steht jetzt in der Warnfarbe (style enthaelt --prot)', /--prot/.test(nach.vStyle), nach.vStyle);
    const rot = await farbeVar(seite, '--prot');
    const gemessen = await farbeVon(seite, '.band > span:nth-child(3) .v');
    gleich('die tatsaechlich berechnete Farbe ist --prot', gemessen, rot);
    gleich('die Meta-Zeile sagt, dass die Zahlen nicht aufgehen',
      nach.m, 'die Zahlen gehen nicht auf — 126 % von ' + fmt(25800, true));
  }

  /* Gegenprobe: Korrektur entfernen -> Quote und Farbe wieder normal. */
  await korrOeffnenRest(seite, rate26.id);
  await klick(seite, '.korrliste button.weg');
  await korrSchliessen(seite);
  const zurueck = await kachel(seite, 'Getilgt bisher');
  gleich('Gegenprobe: ohne die Korrektur steht wieder 12600 da', lies(zurueck.v), 12600);
  pruef('Gegenprobe: die Warnfarbe ist wieder weg', !/--prot/.test(zurueck.vStyle), zurueck.vStyle);
}

/* ====================================================================
   8. Eine negative Rate laesst die Schuld wachsen, auch bei Basis null
   ====================================================================
   nachRaten(basis, raten): ist raten negativ, gilt "basis − raten" ohne
   Kappung. Basis 0, Januar −3000 -> Rest = 0 − (−3000) = 3000.
   Gegenprobe mit Basis 1000 -> Rest = 1000 − (−3000) = 4000. */
console.log('\n8. Eine negative Rate laesst die Schuld wachsen, auch bei Basis null');
await frisch(seite);
await allesAuf(seite);
const kreditOstId = await neueSchuldPos(seite, ARBEITSJAHR, 'Schulden Privat', 'Kredit Ostwind');
pruef('«Kredit Ostwind» angelegt', !!kreditOstId, kreditOstId);
if (kreditOstId) {
  const jahrRestSel = `td[data-kr="${kreditOstId}"]`;
  const janSel = `input.zelle[data-z="${kreditOstId}"][data-m="0"]`;

  const basisAnfangs = await zelleText(seite, `input.zelle[data-b="${kreditOstId}"]`);
  gleich('Basis startet bei null (leeres Feld)', basisAnfangs, '');

  await tippe(seite, janSel, '-3000');
  gleich('Januar zeigt "−3\'000"', await zelleText(seite, janSel), fmt(-3000, true));
  gleich('Jahr/Rest bei Basis 0: 0 − (−3000) = 3000', lies(await zelleText(seite, jahrRestSel)), 3000);

  await tippe(seite, `input.zelle[data-b="${kreditOstId}"]`, '1000');
  gleich('Gegenprobe: Jahr/Rest bei Basis 1000: 1000 − (−3000) = 4000', lies(await zelleText(seite, jahrRestSel)), 4000);
}

/* ====================================================================
   9. Mit dem Betrag faellt die Marke, in beiden Tafeln
   ====================================================================
   Abgehakt -> Betrag auf 0 -> die Marke ist im Datenstand weg (nicht nur
   optisch). Danach ein neuer Betrag: die Zelle steht wieder OHNE Marke da. */
console.log('\n9. Mit dem Betrag faellt die Marke, in beiden Tafeln');

console.log('  9a. Budget-Tafel (Strom, April)');
await frisch(seite);
await klappeById(seite, await blockId(seite, ARBEITSJAHR, 'Fixkosten'));
const stromId = await blockPosId(seite, ARBEITSJAHR, 'Fixkosten', 'Strom');
pruef('Zeile «Strom» gefunden', !!stromId, stromId);
if (stromId) {
  const sel = `input.zelle[data-z="${stromId}"][data-m="3"]`; /* April, traegt 90 */
  await rklick(seite, sel);
  gleich('nach dem Rechtsklick: Klasse "zelle gruen"', await klasse(seite, sel), 'zelle gruen');
  const hakenGesetzt = await seite.evaluate((pid) => !!S.haken[pid + ':3'], stromId);
  pruef('die Marke steht im Datenstand', hakenGesetzt);

  await tippe(seite, sel, '0');
  gleich('mit dem Betrag auf 0: Klasse wieder "zelle"', await klasse(seite, sel), 'zelle');
  const hakenNachNull = await seite.evaluate((pid) => !!S.haken[pid + ':3'], stromId);
  pruef('die Marke ist im Datenstand WEG (nicht nur optisch)', !hakenNachNull, hakenNachNull);

  await tippe(seite, sel, '120');
  gleich('ein neuer Betrag: Klasse bleibt "zelle" (ohne Marke)', await klasse(seite, sel), 'zelle');
  const hakenNachNeu = await seite.evaluate((pid) => !!S.haken[pid + ':3'], stromId);
  pruef('die Marke kommt nicht von selbst zurueck', !hakenNachNeu, hakenNachNeu);
}

console.log('  9b. Rechnungen-Tafel (Behandlung, Mai — auf drei Monate verteilt)');
await frisch(seite);
await klick(seite, '[data-geh-ansicht="rechnung"]');
await klappeById(seite, 'r-oechsli');
const mSel = 'input.zelle[data-rm="r-oe-2"][data-m="4"]'; /* Mai, r-oe-2 traegt Mai/Jun/Jul je 300 */
await rklick(seite, mSel);
gleich('nach dem Rechtsklick: Klasse "zelle gruen"', await klasse(seite, mSel), 'zelle gruen');
const standNachHaken = await zelleText(seite, 'select.stand[data-r="r-oe-2"]');
gleich('nur ein Monat abgehakt: der Stand bleibt "Offen" (nicht alle Monate erledigt)', standNachHaken, 'Offen');
const hakenR = await seite.evaluate(() => !!S.haken['r-oe-2:4']);
pruef('die Marke steht im Datenstand', hakenR);

await tippe(seite, mSel, '0');
gleich('mit dem Betrag auf 0: Klasse wieder "zelle"', await klasse(seite, mSel), 'zelle');
const hakenRNachNull = await seite.evaluate(() => !!S.haken['r-oe-2:4']);
pruef('Rechnungen-Tafel: die Marke ist im Datenstand WEG', !hakenRNachNull, hakenRNachNull);

await tippe(seite, mSel, '350');
gleich('ein neuer Betrag: Klasse bleibt "zelle" (ohne Marke)', await klasse(seite, mSel), 'zelle');
const hakenRNachNeu = await seite.evaluate(() => !!S.haken['r-oe-2:4']);
pruef('Rechnungen-Tafel: die Marke kommt nicht von selbst zurueck', !hakenRNachNeu, hakenRNachNeu);

/* ====================================================================
   10. HTML-Export und der Dialog «Jahr loeschen» — Einzahl und Mehrzahl
   ====================================================================
   HTML-Export: die Ansicht «Alle» wird nur eingefroren, wenn MEHRERE
   Jahre gewaehlt sind (js.length > 1) — bei einem einzigen Jahrgang gibt
   es im Export keinen «Alle»-Knopf.
   Jahr loeschen: die Zahlwoerter (1 Budgetzeile/mehrere, 1 Rechnung/
   mehrere, rueckt/ruecken) stimmen mit der tatsaechlichen Anzahl ueberein,
   und der Warnsatz ueber einen nicht fuehrenden Vorjahrgang erscheint nur,
   wenn es ueberhaupt ein Vorjahr gibt. */
console.log('\n10. HTML-Export und «Jahr loeschen» — Einzahl und Mehrzahl');

console.log('  10a. HTML-Export: «Alle» nur bei mehreren gewaehlten Jahren');
await frisch(seite);
await gehJahr(seite, ARBEITSJAHR);
await seite.evaluate(() => { window.__export = null; window.gib = (name, text, typ) => { window.__export = { name, text, typ }; }; });

await klick(seite, '[data-exp="1"]');
const jahreEin = await seite.evaluate(() => S.exp.jahre.slice());
gleich('ein einzelner Jahrgang ist voreingestellt', jahreEin.join(','), String(ARBEITSJAHR));
await klick(seite, '[data-exp-html="1"]');
const exp1 = await seite.evaluate(() => window.__export);
pruef('HTML-Export (ein Jahrgang) erzeugt', exp1 !== null, exp1);
if (exp1) {
  const bild1 = await seite.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { alleKnopf: doc.querySelectorAll('[data-geh-alle]').length,
      alleAnsicht: !!doc.getElementById('v-alle-budget') };
  }, exp1.text);
  gleich('bei einem einzelnen Jahrgang: kein «Alle»-Knopf im Export', bild1.alleKnopf, 0);
  pruef('bei einem einzelnen Jahrgang: keine eingefrorene Ansicht «Alle»', !bild1.alleAnsicht, bild1);
}

await seite.evaluate(() => { window.__export = null; });
await klick(seite, '[data-exp="1"]');
await klick(seite, '[data-exp-jahr="2027"]');
const jahreZwei = await seite.evaluate(() => S.exp.jahre.slice().sort());
gleich('jetzt zwei Jahrgaenge gewaehlt', jahreZwei.join(','), [ARBEITSJAHR, 2027].join(','));
await klick(seite, '[data-exp-html="1"]');
const exp2 = await seite.evaluate(() => window.__export);
pruef('HTML-Export (zwei Jahrgaenge) erzeugt', exp2 !== null, exp2);
if (exp2) {
  const bild2 = await seite.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { alleKnopf: doc.querySelectorAll('[data-geh-alle]').length,
      alleAnsicht: !!doc.getElementById('v-alle-budget'),
      alleZielGesetzt: Array.from(doc.querySelectorAll('[data-geh-alle]')).every(b => !!b.getAttribute('data-ziel')) };
  }, exp2.text);
  pruef('bei zwei Jahrgaengen: der «Alle»-Knopf steht im Export', bild2.alleKnopf > 0, bild2);
  pruef('sein Ziel ist gesetzt (funktionierender Knopf, kein totes Element)', bild2.alleZielGesetzt, bild2);
  pruef('bei zwei Jahrgaengen: die eingefrorene Ansicht «Alle» existiert', bild2.alleAnsicht, bild2);
}

console.log('  10b. «Jahr loeschen» — Einzahl und Mehrzahl, dazu der Warnsatz');
await frisch(seite);
/* Ein zusaetzlicher Jahrgang 2028, damit 2026 zwei Folgejahre hat (Mehrzahl
   "ruecken") und 2027 genau eines (Einzahl "rueckt"). */
await klick(seite, '[data-neu-jahr="1"]');
await klick(seite, '[data-neu-an="1"]');
pruef('Jahrgang 2028 angelegt', (await seite.evaluate(() => S.jahre.slice())).indexOf(2028) >= 0,
  await seite.evaluate(() => S.jahre.slice()));

/* Fall: genau eine Budgetzeile, genau eine Rechnung, kein Folgejahr —
   direkt in S.daten/S.rechnungen eingesetzt (misst die Formulierung der
   Dialogfunktion selbst, ohne zehn Zeilen einzeln wegklicken zu muessen). */
await seite.evaluate(() => {
  S.daten[2028] = [{ id: 'htb', art: 'block', name: 'Testkategorie', key: 'testkategorie', vz: -1,
    pos: [{ id: 'htp', key: 'testzeile', name: 'Testzeile', basis: 0, reihe: new Array(12).fill(0) }] }];
  S.rechnungen[2028] = [{ id: 'htg', name: 'Test-Steller', rechnungen: [
    { id: 'htr', zweck: 'Testrechnung', datum: '', betrag: 0, reihe: new Array(12).fill(0), stand: 'Offen' }
  ] }];
  zeichne();
});
await gehJahr(seite, 2028);
await klick(seite, '[data-weg-jahr="1"]');
const text2028 = await zelleText(seite, 'div[data-schleier="wegJahr"] p');
pruef('Dialogtext (2028, Einzahl) gefunden', text2028 !== null, text2028);
if (text2028) {
  pruef('Einzahl: "geht 1 Budgetzeile" (nicht "gehen 1 Budgetzeilen")', text2028.includes('geht 1 Budgetzeile'), text2028);
  pruef('Einzahl: "1 Rechnung" (nicht "1 Rechnungen")', text2028.includes('1 Rechnung') && !text2028.includes('1 Rechnungen'), text2028);
  pruef('kein Folgejahr -> keine Erwaehnung von "rueckt"/"ruecken"',
    !/r(ü|ue)ckt|r(ü|ue)cken/.test(text2028), text2028);
}
await klick(seite, '[data-zu="wegJahr"]');

await gehJahr(seite, 2027);
await klick(seite, '[data-weg-jahr="1"]');
const text2027 = await zelleText(seite, 'div[data-schleier="wegJahr"] p:nth-of-type(1)');
const ganzerDialog2027 = await seite.evaluate(() =>
  Array.from(document.querySelectorAll('div[data-schleier="wegJahr"] p')).map(p => p.textContent).join('\n'));
const ground2027 = await seite.evaluate((j) => {
  const zeilen = (S.daten[j] || []).reduce((s, b) => s + (b.pos || []).length
    + (b.gruppen || []).reduce((a, g) => a + (g.pos || []).length, 0), 0);
  const rech = (S.rechnungen[j] || []).reduce((s, g) => s + (g.rechnungen || []).length, 0);
  return { zeilen, rech };
}, 2027);
pruef('Ground truth 2027 hat mehr als eine Budgetzeile (Mehrzahl-Vorbedingung)', ground2027.zeilen > 1, ground2027);
pruef('Dialogtext (2027) gefunden', text2027 !== null, text2027);
if (text2027) {
  const erwZeilen = ground2027.zeilen === 1 ? 'geht 1 Budgetzeile' : 'gehen ' + ground2027.zeilen + ' Budgetzeilen';
  const erwRech = ground2027.rech === 1 ? '1 Rechnung' : ground2027.rech + ' Rechnungen';
  pruef('Budgetzeilen-Formulierung passt zur echten Anzahl (' + ground2027.zeilen + ')', text2027.includes(erwZeilen), { text2027, erwZeilen });
  pruef('Rechnungen-Formulierung passt zur echten Anzahl (' + ground2027.rech + ')', text2027.includes(erwRech), { text2027, erwRech });
  pruef('genau ein Folgejahr (2028) -> Einzahl "rueckt nach"', ganzerDialog2027.includes('2028 rückt nach'), ganzerDialog2027);
  pruef('der Warnsatz nennt das letzte Vorjahr (2026), das die Schuld sonst nicht fuehrt', ganzerDialog2027.includes('Führt 2026'), ganzerDialog2027);
}
await klick(seite, '[data-zu="wegJahr"]');

await gehJahr(seite, ARBEITSJAHR);
await klick(seite, '[data-weg-jahr="1"]');
const ganzerDialog2026 = await seite.evaluate(() =>
  Array.from(document.querySelectorAll('div[data-schleier="wegJahr"] p')).map(p => p.textContent).join('\n'));
const ground2026 = await seite.evaluate((j) => {
  const zeilen = (S.daten[j] || []).reduce((s, b) => s + (b.pos || []).length
    + (b.gruppen || []).reduce((a, g) => a + (g.pos || []).length, 0), 0);
  const rech = (S.rechnungen[j] || []).reduce((s, g) => s + (g.rechnungen || []).length, 0);
  return { zeilen, rech };
}, ARBEITSJAHR);
const erwZeilen26 = ground2026.zeilen === 1 ? 'geht 1 Budgetzeile' : 'gehen ' + ground2026.zeilen + ' Budgetzeilen';
const erwRech26 = ground2026.rech === 1 ? '1 Rechnung' : ground2026.rech + ' Rechnungen';
pruef('2026: Budgetzeilen-Formulierung passt zur echten Anzahl (' + ground2026.zeilen + ')', ganzerDialog2026.includes(erwZeilen26), { ganzerDialog2026, erwZeilen26 });
pruef('2026: Rechnungen-Formulierung passt zur echten Anzahl (' + ground2026.rech + ')', ganzerDialog2026.includes(erwRech26), { ganzerDialog2026, erwRech26 });
pruef('zwei Folgejahre (2027, 2028) -> Mehrzahl "ruecken nach"', ganzerDialog2026.includes('2027 und 2028 rücken nach'), ganzerDialog2026);
pruef('der Warnsatz nennt das Vorjahr 2025', ganzerDialog2026.includes('Führt 2025'), ganzerDialog2026);
await klick(seite, '[data-zu="wegJahr"]');

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
