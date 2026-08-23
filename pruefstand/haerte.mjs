/* GAEPP — Pruefstand: die Haerteprobe.

   Zehn Fragen an die App, jede einmal falsch beantwortet. Der Umbau auf 3.0.0
   (Bauhaus, Tabellenwerkzeug) hat fast jeden Messpunkt verschoben — die FRAGEN
   sind dieselben geblieben, die Messstellen sind neu:

     1.  Ziehen und Ablegen bewegt die Zeile wirklich (Griff, nicht die Zeile)
     2.  Die Zeile laesst sich auch mit der Tastatur verschieben (Pfeil am Griff)
     3.  Escape schliesst das oberste Fenster — fuer jedes der neun Fenster
     4.  Eine kaputte Datendatei legt GAEPP nicht still, dazu der Notausgang
     5.  «Uebertragen … auch in die Folgejahre» fasst keine fremde Zeile an
     6.  «Getilgt bisher» zaehlt keine Schuld mit, die noch nicht laeuft
     7.  Eine Quote ausserhalb von null bis hundert wird als Befund gemeldet
     8.  Eine negative Rate laesst die Schuld wachsen, auch bei Basis null
     9.  Mit dem Betrag faellt die Marke, in beiden Tafeln
     10. HTML-Export und der Dialog «Jahr loeschen» — Einzahl/Mehrzahl

   Was sich beim Portieren geaendert hat, steht jeweils im Kopf des Abschnitts.
   Gestrichen wurde genau eine Teilpruefung (3b, Fokusrueckkehr) — mit Grund an
   Ort und Stelle. Dazugekommen sind: die Aufraeumliste des Notausgangs (4),
   der Haken am Rechtsklick samt dem Doppelklick, der ihn NICHT nebenbei
   schaltet (9c), «Schliessen» statt «Abbrechen» und die Rueckfrage vor dem
   Trennen (3e), die
   Schluesselsperre bei gleichnamigen Zeilen (5), die Kappung nach oben (8),
   ein aus der Datei geerbter Haken (9a) und die Zahlwoerter der Fusszeile (10c).

   Gemessen wird durchgehend die Wirkung: der Datenstand nach einer echten
   Bedienung, der gerenderte Text, die tatsaechlich abgefeuerten Ereignisse —
   nicht der Quelltext. Erwartungswerte sind von Hand aus vorrat.mjs
   hergeleitet, nirgends aus einem Lauf dieser App abgeschrieben. Albrechts
   Zahlen und Namen kommen hier nicht vor.

   Stand 23.08.2026: gruen. Abschnitt 9c ist an diesem Tag der geaenderten
   Bedienregel nachgezogen worden: der Haken liegt wieder allein auf dem
   RECHTSKLICK, der linke Klick gehoert ganz dem Eingeben. Die frueher dort
   roten Fragen («der zweite, getrennte Klick setzt die Marke») sind umgedreht,
   nicht gestrichen — samt der Gegenprobe, dass der Rechtsklick es sehr wohl
   tut, und samt dem Zeugen, dass die linken Klicks ueberhaupt ankommen. Der
   alte Befund, der 9c ueberhaupt erst hervorgebracht hat, wird unveraendert
   weiter bewacht: ein Doppelklick darf keine Marke hinterlassen und keine
   wegnehmen, im Budget wie in den Rechnungen. Der Umfang von 9c ist dabei
   gewachsen, nicht geschrumpft.

   Port 8745. Fahren: node haerte.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { daten as vorratDaten, STICHJAHR, STICHM, JAHRE } from './vorrat.mjs';

const PORT = 8745;
const JAHR = STICHJAHR;                 /* 2026 — aus dem Vorrat, nicht getippt */
const FOLGE = JAHRE[JAHRE.indexOf(JAHR) + 1];        /* 2027 */
const LETZT = JAHRE[JAHRE.length - 1];               /* 2029 */
const VORLETZT = JAHRE[JAHRE.length - 2];            /* 2028 */
const GETRENNT = 700;                   /* ms zwischen zwei Klicks, die keiner sein sollen */
const { pruef, gleich, ende } = bilanzbuch('haerte');

/* ---------------------------------------------------------------- Helfer,
   eigene Kopien im Stil von hilfe.mjs — jede Datei im Pruefstand traegt ihre
   eigenen, es gibt bewusst keine gemeinsame ausser hilfe.mjs/vorrat.mjs. */

function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).replace(/['’\s]/g, '').replace(/−/g, '-').trim();
  if (s === '' || s === '—') return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}
/* Formatierung wie in index.html — fmt(n, immer). S.nullen ist im Pruefstand
   nie gesetzt, deshalb genuegt die Fassung mit «immer». */
function fmt(n, immer) {
  const r = (n < 0 ? -1 : 1) * Math.round(Math.abs(n || 0));
  if (r === 0 && !immer) return '';
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

async function klick(seite, sel) { await seite.locator(sel).first().click(); await bisRuhe(seite); }
async function dbl(seite, sel) { await seite.locator(sel).first().dblclick(); await bisRuhe(seite); }
async function rklick(seite, sel) { await seite.locator(sel).first().click({ button: 'right' }); await bisRuhe(seite); }
/* Ein zweiter Klick, der als eigener Klick ankommen soll und nicht als Haelfte
   eines Doppelklicks. */
async function spaeter(seite, sel) { await seite.waitForTimeout(GETRENNT); await klick(seite, sel); }
async function taste(seite, k) { await seite.keyboard.press(k); await bisRuhe(seite); }
/* Tippen und den Wert uebernehmen lassen — «change» ist genau das, was das
   Verlassen der Zelle ausloest. Der Fokus bleibt dabei stehen; wo der Sprung
   gemessen wird, steht die Tabulatortaste im Lauf selbst. */
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
/* Die Erledigt-Marke sitzt seit 3.0.0 NICHT mehr am Eingabefeld («zelle gruen»),
   sondern als Klasse «hak» an der Zelle darum — halbfett statt gruen. Gemessen
   wird deshalb die Zelle, nicht das Feld. */
async function tdKlasse(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    const td = el.closest('td'); return td ? td.className : null;
  }, sel);
}
async function vorhanden(seite, sel) { return seite.evaluate((s) => !!document.querySelector(s), sel); }
async function anzahl(seite, sel) { return seite.evaluate((s) => document.querySelectorAll(s).length, sel); }
async function fokusPasstZu(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.activeElement;
    return !!(el && el.matches && el.matches(s));
  }, sel);
}
async function fokusHaengt(seite) {
  return seite.evaluate(() => {
    const el = document.activeElement;
    return !el || !el.isConnected;
  });
}
async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
async function gehJahr(seite, jahr) { await klick(seite, `[data-geh-jahr="${jahr}"]`); }
/* Aufklappen ueber den Klappknopf, aber nur wenn die Sektion wirklich zu ist —
   sonst schliesst der Griff, was er oeffnen soll. */
async function oeffne(seite, id) {
  const auf = await seite.evaluate((i) => S.auf.indexOf(i) >= 0, id);
  if (!auf) await klick(seite, `button.klapper[data-klapp="${id}"]`);
  return seite.evaluate((i) => S.auf.indexOf(i) >= 0, id);
}
/* Alles aufklappen. Der Knopf «[data-alle-um]» ist mit 3.0.0 aus der laufenden
   App verschwunden — die Taste «z» klappt zu bzw. auf. Sie schaltet um,
   deshalb wird gemessen und notfalls zweimal gedrueckt. */
async function allesAuf(seite) {
  await taste(seite, 'z');
  const offen = await seite.evaluate(() => S.auf.length);
  if (!offen) await taste(seite, 'z');
  return seite.evaluate(() => {
    const ids = [];
    S.jahre.forEach(j => (S.daten[j] || []).forEach(b => { ids.push(b.id);
      if (b.art === 'schulden') (b.gruppen || []).forEach(g => ids.push(g.id)); }));
    S.jahre.forEach(j => (S.rechnungen[j] || []).forEach(g => ids.push(g.id)));
    return ids.every(i => S.auf.indexOf(i) >= 0);
  });
}

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
async function blockPos(seite, jahr, blockName, posName) {
  return seite.evaluate(([j, bn, pn]) => {
    const b = (S.daten[j] || []).find(x => x.name === bn);
    const p = b && (b.pos || []).find(x => x.name === pn);
    return p ? { id: p.id, key: p.key, basis: p.basis, reihe: p.reihe.slice() } : null;
  }, [jahr, blockName, posName]);
}
async function blockPosId(seite, jahr, blockName, posName) {
  const p = await blockPos(seite, jahr, blockName, posName);
  return p ? p.id : null;
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
  const p = await blockPos(seite, jahr, blockName, posName);
  return p ? p.reihe : null;
}
async function hakenAn(seite, id, m) {
  return seite.evaluate(([i, mm]) => !!S.haken[i + ':' + mm], [id, m]);
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
/* Das Vorzeichen steht seit 3.0.0 IM Betrag — den Schalter «plus/minus»
   ([data-korr-richt]) gibt es nicht mehr. Ein Minus wird geschrieben. */
async function korrEintragen(seite, { pid, art, betrag, notiz }) {
  if (art === 'basis') await korrOeffnenBasis(seite, pid); else await korrOeffnenRest(seite, pid);
  await tippe(seite, '[data-korr-betrag]', betrag);
  if (notiz) await tippe(seite, '[data-korr-notiz]', notiz);
  await klick(seite, '[data-korr-add]');
}
async function korrSchliessen(seite) { await klick(seite, '[data-zu="korr"]'); }
async function korrListe(seite, jahr, gKey, pKey, art) {
  return seite.evaluate(([j, gk, pk, a]) => {
    const b = (S.daten[j] || []).find(x => x.art === 'schulden');
    const g = b && (b.gruppen || []).find(x => x.key === gk);
    const p = g && (g.pos || []).find(x => x.key === pk);
    return p && p.korr && p.korr[a] ? p.korr[a].map(x => ({ betrag: x.betrag, notiz: x.notiz })) : [];
  }, [jahr, gKey, pKey, art]);
}

/* Eine Kachel des Kennzahlenbands. Die Zahl steht in «.v», die Kurzzeile in
   «.m», der ganze Satz seit 3.0.0 im Titel der Kachel — dort, wo frueher eine
   Warnfarbe stand. */
const kachel = async (seite, label) => seite.evaluate((lbl) => {
  const s = Array.from(document.querySelectorAll('.band > span'))
    .find(x => x.querySelector('.k') && x.querySelector('.k').textContent.trim() === lbl);
  return s ? { v: s.querySelector('.v').textContent.trim(), m: s.querySelector('.m').textContent.trim(),
    titel: s.getAttribute('title') || '' } : null;
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
    /* Die Zielmarke wird waehrend des Ziehens von Hand gesetzt, ohne Neuzeichnen —
       sie ist der Beweis, dass die Anzeige mitgeht, ohne den Griff zu verlieren. */
    const zielMarke = document.querySelectorAll('tr.ziel').length;
    const zielRichtig = zielTr.classList.contains('ziel');
    feuer(zielTr, 'drop');
    feuer(g, 'dragend');
    document.removeEventListener('drop', zaehler);
    return { ok: true, dropZahl, nachDragstart, nachDragover, zielMarke, zielRichtig };
  }, [vonId, aufId]);
}

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   1. Ziehen und Ablegen bewegt die Zeile wirklich
   ====================================================================
   Portiert: die Zeilen heissen jetzt nach vorrat.mjs. Fixkosten JAHR traegt
   Miete | Nebenkosten, Krankenkasse, Mobile, Internet, Bahnabo, Steuern.
   «Mobile» an den Griff gefasst und auf «Miete | Nebenkosten» fallen gelassen
   -> verschiebe() spleisst Mobile heraus und vor Miete hinein.
   Gegenprobe: ueber die Sektionsgrenze (Fixkosten -> Abonnements) bewegt sich
   nichts. */
console.log('\n1. Ziehen und Ablegen bewegt die Zeile wirklich (am Griff)');
await frisch(seite);
await gehJahr(seite, JAHR);
const fixId1 = await blockId(seite, JAHR, 'Fixkosten');
const aboId1 = await blockId(seite, JAHR, 'Abonnements');
pruef('Sektion Fixkosten aufgeklappt', await oeffne(seite, fixId1));
pruef('Sektion Abonnements aufgeklappt', await oeffne(seite, aboId1));

const mieteId = await blockPosId(seite, JAHR, 'Fixkosten', 'Miete | Nebenkosten');
const mobileId = await blockPosId(seite, JAHR, 'Fixkosten', 'Mobile');
const zeitungId = await blockPosId(seite, JAHR, 'Abonnements', 'Zeitung');
pruef('Zeilen Miete/Mobile/Zeitung gefunden', !!mieteId && !!mobileId && !!zeitungId,
  { mieteId, mobileId, zeitungId });

if (mieteId && mobileId) {
  const attr = await seite.evaluate((pid) => {
    const griff = document.querySelector('button.griff[data-griff="' + pid + '"]');
    const tr = document.querySelector('tr[data-id="' + pid + '"]');
    return { griffDraggable: griff ? griff.getAttribute('draggable') : null,
      trDraggable: tr ? tr.getAttribute('draggable') : null };
  }, mieteId);
  gleich('der Griff traegt draggable="true"', attr.griffDraggable, 'true');
  pruef('die Zeile selbst ist NICHT draggable (Text bleibt markierbar)', attr.trDraggable === null, attr);

  const vorOrdnung = await positionsNamen(seite, JAHR, 'Fixkosten');
  gleich('Ausgangsordnung Fixkosten', vorOrdnung.join(','),
    ['Miete | Nebenkosten', 'Krankenkasse', 'Mobile', 'Internet', 'Bahnabo', 'Steuern'].join(','));

  const zug = await ziehen(seite, mobileId, mieteId);
  pruef('Griff und Zielzeile im Dokument gefunden', zug.ok, zug);
  pruef('zwischen dragstart und dragover bleibt derselbe Knoten im Dokument (kein Neuzeichnen waehrend des Ziehens)',
    zug.nachDragstart && zug.nachDragover, zug);
  pruef('das drop-Ereignis kommt tatsaechlich an', zug.dropZahl === 1, zug);
  pruef('waehrend des Ziehens ist genau EINE Zeile als Ziel markiert, und zwar die richtige',
    zug.zielMarke === 1 && zug.zielRichtig, zug);
  await bisRuhe(seite);

  const nachOrdnung = await positionsNamen(seite, JAHR, 'Fixkosten');
  gleich('Mobile steht jetzt zuoberst (verschiebe() hat gewirkt)', nachOrdnung.join(','),
    ['Mobile', 'Miete | Nebenkosten', 'Krankenkasse', 'Internet', 'Bahnabo', 'Steuern'].join(','));

  const zustandNachZug = await seite.evaluate(() => ({ zieht: S.zieht, ziel: S.ziel,
    marken: document.querySelectorAll('tr.ziel').length }));
  gleich('S.zieht ist nach dragend wieder leer', zustandNachZug.zieht, null);
  gleich('S.ziel ist nach dragend wieder leer', zustandNachZug.ziel, null);
  gleich('nach dem Zug steht keine Zielmarke mehr im Blatt', zustandNachZug.marken, 0);

  /* Gegenprobe: ueber die Sektionsgrenze hinweg (Fixkosten -> Abonnements)
     bewegt sich nichts, in keiner der beiden Sektionen. */
  const vorFix = await positionsNamen(seite, JAHR, 'Fixkosten');
  const vorAbo = await positionsNamen(seite, JAHR, 'Abonnements');
  const zugQuer = await ziehen(seite, mieteId, zeitungId);
  pruef('Gegenprobe: Griff und Zielzeile ueber die Grenze hinweg gefunden', zugQuer.ok, zugQuer);
  pruef('Gegenprobe: ueber die Grenze wird keine Zielmarke gesetzt', zugQuer.zielMarke === 0, zugQuer);
  await bisRuhe(seite);
  const nachFix = await positionsNamen(seite, JAHR, 'Fixkosten');
  const nachAbo = await positionsNamen(seite, JAHR, 'Abonnements');
  gleich('Gegenprobe: Fixkosten unveraendert', nachFix.join(','), vorFix.join(','));
  gleich('Gegenprobe: Abonnements unveraendert', nachAbo.join(','), vorAbo.join(','));
}

/* ====================================================================
   2. Die Zeile laesst sich auch mit der Tastatur verschieben
   ====================================================================
   Portiert auf Abonnements JAHR: Zeitung, Musik, Ablage. Griff von Zeitung
   fokussiert, Pfeil rauf tut nichts (schon oben), Pfeil runter vertauscht die
   ersten beiden, der Fokus bleibt auf demselben Griff. Am unteren Ende tut
   Pfeil runter wieder nichts, und die Nachbarsektion bleibt in beiden Faellen
   unberuehrt — verschoben wird nur innerhalb der eigenen Liste. */
console.log('\n2. Die Zeile laesst sich auch mit der Tastatur verschieben (Pfeil am Griff)');
await frisch(seite);
await gehJahr(seite, JAHR);
const aboId2 = await blockId(seite, JAHR, 'Abonnements');
const fixId2 = await blockId(seite, JAHR, 'Fixkosten');
pruef('Sektion Abonnements aufgeklappt', await oeffne(seite, aboId2));
pruef('Sektion Fixkosten aufgeklappt', await oeffne(seite, fixId2));
const zeitungId2 = await blockPosId(seite, JAHR, 'Abonnements', 'Zeitung');
const ablageId2 = await blockPosId(seite, JAHR, 'Abonnements', 'Ablage');
pruef('Zeilen Zeitung/Ablage gefunden', !!zeitungId2 && !!ablageId2, { zeitungId2, ablageId2 });

if (zeitungId2 && ablageId2) {
  const fixVor = (await positionsNamen(seite, JAHR, 'Fixkosten')).join(',');

  await seite.locator(`button.griff[data-griff="${zeitungId2}"]`).first().focus();
  await taste(seite, 'ArrowUp');
  gleich('Pfeil rauf am obersten Griff tut nichts', (await positionsNamen(seite, JAHR, 'Abonnements')).join(','),
    ['Zeitung', 'Musik', 'Ablage'].join(','));
  gleich('und er greift auch nicht in die Sektion darueber', (await positionsNamen(seite, JAHR, 'Fixkosten')).join(','), fixVor);
  pruef('Fokus bleibt am Griff (nach dem wirkungslosen Pfeil rauf)',
    await fokusPasstZu(seite, `[data-griff="${zeitungId2}"]`));

  await taste(seite, 'ArrowDown');
  gleich('Pfeil runter vertauscht Zeitung und Musik', (await positionsNamen(seite, JAHR, 'Abonnements')).join(','),
    ['Musik', 'Zeitung', 'Ablage'].join(','));
  pruef('der Fokus bleibt auf demselben Griff (derselben Zeile, jetzt an anderer Stelle)',
    await fokusPasstZu(seite, `[data-griff="${zeitungId2}"]`));

  await taste(seite, 'ArrowDown');
  gleich('noch ein Pfeil runter: Zeitung steht zuunterst', (await positionsNamen(seite, JAHR, 'Abonnements')).join(','),
    ['Musik', 'Ablage', 'Zeitung'].join(','));
  await taste(seite, 'ArrowDown');
  gleich('Pfeil runter am untersten Griff tut nichts mehr', (await positionsNamen(seite, JAHR, 'Abonnements')).join(','),
    ['Musik', 'Ablage', 'Zeitung'].join(','));
  gleich('und greift auch nicht in die Sektion darunter', (await positionsNamen(seite, JAHR, 'Fixkosten')).join(','), fixVor);
}

/* ====================================================================
   3. Escape schliesst das oberste Fenster
   ====================================================================
   Fuer jedes der neun Fenster: oeffnen, Escape, Fenster weg und der zugehoerige
   Zustand in S wieder leer. Portiert: die Basiszelle ausserhalb der Schulden
   traegt seit 3.0.0 kein Eingabefeld mehr (sie ist leer und wird per Doppelklick
   auf die ZELLE geoeffnet), das Korrekturfenster kennt keinen Vorzeichenschalter
   mehr, und «Abbrechen» heisst in zwei Fenstern «Schliessen». */
console.log('\n3. Escape schliesst das oberste Fenster');

console.log('  3a. Uebertragen — Escape schliesst es, der Fokus kehrt zur Zelle zurueck');
await frisch(seite);
await gehJahr(seite, JAHR);
const fixId3 = await blockId(seite, JAHR, 'Fixkosten');
await oeffne(seite, fixId3);
const mieteId3 = await blockPosId(seite, JAHR, 'Fixkosten', 'Miete | Nebenkosten');
const uebSel = `input.zelle[data-z="${mieteId3}"][data-m="0"]`;
const hakenVorDbl = await hakenAn(seite, mieteId3, 0);
pruef('Ausgangslage: der Januar dieser Zeile traegt aus der Datei einen Haken', hakenVorDbl);
await dbl(seite, uebSel);
pruef('Fenster «Uebertragen» offen', await vorhanden(seite, '[data-schleier="ueb"]'));
gleich('genau ein Fenster steht offen', await anzahl(seite, '.schleier'), 1);
/* Zwei schnelle Klicks sind ein Doppelklick — und der oeffnet das Fenster,
   statt nebenbei den Haken zu kippen. */
gleich('der Doppelklick hat den Haken NICHT nebenbei geschaltet', await hakenAn(seite, mieteId3, 0), hakenVorDbl);
await taste(seite, 'Escape');
pruef('Escape schliesst «Uebertragen»', !(await vorhanden(seite, '[data-schleier="ueb"]')));
gleich('S.ueb ist wieder leer', await seite.evaluate(() => S.ueb), null);
pruef('der Fokus liegt wieder in der Zelle, aus der das Fenster geoeffnet wurde', await fokusPasstZu(seite, uebSel));
gleich('und der Haken steht immer noch so da wie vorher', await hakenAn(seite, mieteId3, 0), hakenVorDbl);

console.log('  3b. Verteilen (Basis ausserhalb der Schulden) — Escape schliesst es');
/* GESTRICHEN: «der Fokus kehrt in die Basiszelle zurueck».
   Bis 2.0.0 trug die Basiszelle ausserhalb der Schulden ein Eingabefeld
   (input.zelle[data-b]); von dort wurde das Fenster geoeffnet, dorthin kehrte
   der Fokus zurueck. Seit 3.0.0 ist diese Zelle absichtlich LEER — die Basis
   ist dort eine Referenzzahl und kein Anfangsstand, geoeffnet wird per
   Doppelklick auf die Zelle selbst (td[data-bs]), und eine Tabellenzelle nimmt
   keinen Fokus. Es gibt also keine Zelle mehr, in die der Fokus zurueckkehren
   koennte; die Pruefung haette kein Gegenstueck in der App. An ihre Stelle
   tritt die Frage, die dahinter stand: bleibt die Bedienung nach dem Schliessen
   anschlussfaehig — liegt der Fokus also nicht auf einem Knoten, den es nicht
   mehr gibt? */
await frisch(seite);
await gehJahr(seite, JAHR);
const einkId3 = await blockId(seite, JAHR, 'Einkommen');
await oeffne(seite, einkId3);
const lohnId3 = await blockPosId(seite, JAHR, 'Einkommen', 'Lohn');
const basisSel = `td[data-bs="${lohnId3}"]`;
pruef('die Basiszelle ausserhalb der Schulden traegt kein Eingabefeld mehr',
  !(await vorhanden(seite, `input.zelle[data-b="${lohnId3}"]`)));
await dbl(seite, basisSel);
pruef('Fenster «Verteilen» offen', await vorhanden(seite, '[data-schleier="basis"]'));
gleich('genau ein Fenster steht offen', await anzahl(seite, '.schleier'), 1);
await taste(seite, 'Escape');
pruef('Escape schliesst «Verteilen»', !(await vorhanden(seite, '[data-schleier="basis"]')));
gleich('S.basis ist wieder leer', await seite.evaluate(() => S.basis), null);
pruef('der Fokus haengt danach nicht an einem Knoten, den es nicht mehr gibt', !(await fokusHaengt(seite)));
gleich('und die Zeile ist unveraendert geblieben (nichts verteilt)',
  (await reiheVon(seite, JAHR, 'Einkommen', 'Lohn')).join(','), new Array(12).fill(5320).join(','));

console.log('  3c. Korrektur und Korrektur-Warnung — Escape schliesst nur das oberste Fenster');
await frisch(seite);
pruef('alle Sektionen aufgeklappt (Taste z)', await allesAuf(seite));
const darlehenFolge = await schuldPos(seite, FOLGE, 'Darlehen Blumberg');
const darlehenJahr = await schuldPos(seite, JAHR, 'Darlehen Blumberg');
pruef('Darlehen Blumberg in beiden Jahrgaengen gefunden', !!darlehenFolge && !!darlehenJahr,
  { darlehenFolge, darlehenJahr });
if (darlehenFolge && darlehenJahr) {
  await gehJahr(seite, FOLGE);
  await korrEintragen(seite, { pid: darlehenFolge.id, art: 'basis', betrag: '500', notiz: 'Haerteprobe Warnung' });
  gleich('im Folgejahr steht jetzt eine Basiskorrektur',
    (await korrListe(seite, FOLGE, darlehenFolge.gKey, darlehenFolge.key, 'basis')).length, 1);
  await korrSchliessen(seite);

  await gehJahr(seite, JAHR);
  await korrOeffnenBasis(seite, darlehenJahr.id);
  pruef('Fenster «Korrektur» offen', await vorhanden(seite, '[data-schleier="korr"]'));
  await tippe(seite, '[data-korr-betrag]', '300');
  await klick(seite, '[data-korr-add]');
  pruef('das Hinzufuegen loest die Warnung aus, das Korrekturfenster bleibt darunter bestehen',
    await vorhanden(seite, '[data-schleier="korrWarn"]') && await vorhanden(seite, '[data-schleier="korr"]'));
  gleich('zwei Fenster stehen uebereinander', await anzahl(seite, '.schleier'), 2);

  await taste(seite, 'Escape');
  pruef('erstes Escape schliesst nur die Warnung', !(await vorhanden(seite, '[data-schleier="korrWarn"]')));
  pruef('das Korrekturfenster steht noch offen', await vorhanden(seite, '[data-schleier="korr"]'));
  gleich('die abgebrochene Korrektur (300) wurde NICHT eingetragen',
    (await korrListe(seite, JAHR, darlehenJahr.gKey, darlehenJahr.key, 'basis')).length, 0);
  gleich('und die Korrektur im Folgejahr steht unangetastet da',
    (await korrListe(seite, FOLGE, darlehenFolge.gKey, darlehenFolge.key, 'basis')).length, 1);

  await taste(seite, 'Escape');
  pruef('zweites Escape schliesst auch das Korrekturfenster', !(await vorhanden(seite, '[data-schleier="korr"]')));
  gleich('S.korr ist wieder leer', await seite.evaluate(() => S.korr), null);
  gleich('S.korrWarn ist wieder leer', await seite.evaluate(() => S.korrWarn), null);
}

console.log('  3d. Handbuch, Neuer Jahrgang, Jahr loeschen, Sichern, Datenkanal');
const einfacheFenster = [
  { name: 'Handbuch', oeffnen: '[data-hb="1"]', schleier: 'hb', feld: 'hb' },
  { name: 'Neuer Jahrgang', oeffnen: '[data-neu-jahr="1"]', schleier: 'neu', feld: 'neu' },
  { name: 'Jahr loeschen', oeffnen: '[data-weg-jahr="1"]', schleier: 'wegJahr', feld: 'wegJahr' },
  { name: 'Sichern', oeffnen: '[data-exp="1"]', schleier: 'exp', feld: 'exp' },
  { name: 'Datenkanal', oeffnen: '[data-sync-auf="1"]', schleier: 'sync', feld: 'syncAuf' }
];
for (const w of einfacheFenster) {
  await frisch(seite);
  await klick(seite, w.oeffnen);
  pruef('Fenster «' + w.name + '» offen', await vorhanden(seite, `[data-schleier="${w.schleier}"]`));
  gleich('«' + w.name + '»: genau ein Fenster steht offen', await anzahl(seite, '.schleier'), 1);
  await taste(seite, 'Escape');
  pruef('Escape schliesst «' + w.name + '»', !(await vorhanden(seite, `[data-schleier="${w.schleier}"]`)));
  const feldWert = await seite.evaluate((f) => S[f], w.feld);
  pruef('S.' + w.feld + ' ist wieder leer', !feldWert, feldWert);
}
/* Gegenprobe zur Liste: es sind neun Fenster und kein zehntes — ohne ein
   offenes Fenster steht kein Schleier im Blatt, und Escape richtet nichts an. */
await frisch(seite);
gleich('ohne offenes Fenster steht kein Schleier da', await anzahl(seite, '.schleier'), 0);
await taste(seite, 'Escape');
gleich('Escape ins Leere laesst das Blatt stehen', await anzahl(seite, 'table'), 1);

console.log('  3e. «Schliessen» statt «Abbrechen» — und die Rueckfrage vor dem Trennen');
/* Neu seit 3.0.0: in «Korrekturen» und «Datenkanal» wirkt jede Aenderung an
   einer bestehenden Zeile sofort — «Abbrechen» waere eine Zusage, die das
   Fenster nicht halten kann. Also heisst der Knopf dort «Schliessen». Geprueft
   wird beides: die Beschriftung UND dass die Aenderung das Schliessen
   ueberlebt. */
await frisch(seite);
await allesAuf(seite);
const kreditPos = await schuldPos(seite, JAHR, 'Kreditkasse Tremont');
pruef('«Kreditkasse Tremont» gefunden', !!kreditPos, kreditPos);
if (kreditPos) {
  await gehJahr(seite, JAHR);
  await korrEintragen(seite, { pid: kreditPos.id, art: 'rest', betrag: '-250', notiz: 'Haerteprobe Schliessen' });
  gleich('Beschriftung links unten im Korrekturfenster',
    (await zelleText(seite, 'div[data-schleier="korr"] .dfuss .ab')), 'Schliessen');
  const listeOffen = await korrListe(seite, JAHR, kreditPos.gKey, kreditPos.key, 'rest');
  gleich('die Zeile ist schon geschrieben, bevor das Fenster zugeht', listeOffen.length, 1);
  gleich('mit dem getippten Vorzeichen im Betrag', listeOffen[0] ? listeOffen[0].betrag : null, -250);
  await korrSchliessen(seite);
  pruef('«Schliessen» schliesst das Fenster', !(await vorhanden(seite, '[data-schleier="korr"]')));
  gleich('und die Zeile steht danach immer noch da',
    (await korrListe(seite, JAHR, kreditPos.gKey, kreditPos.key, 'rest')).length, 1);
}

await frisch(seite);
await klick(seite, '[data-sync-auf="1"]');
gleich('Beschriftung links unten im Datenkanal',
  (await zelleText(seite, 'div[data-schleier="sync"] .dfuss .ab')), 'Schliessen');
await tippe(seite, '[data-sc="repo"]', 'Pruefstand/haerte');
await tippe(seite, '[data-sc="token"]', 'nur-ein-pruefwert');
const confVor = await seite.evaluate(() => JSON.parse(localStorage.getItem('gaepp.tabelle.anbindung') || '{}'));
gleich('Adresse ist gesetzt', confVor.repo, 'Pruefstand/haerte');
await klick(seite, '[data-trennen]');
gleich('der erste Klick auf «Trennen» fragt nach',
  (await zelleText(seite, '[data-trennen]')), 'Wirklich trennen?');
const confFrage = await seite.evaluate(() => JSON.parse(localStorage.getItem('gaepp.tabelle.anbindung') || '{}'));
gleich('und laesst die Adresse dabei stehen', confFrage.repo, 'Pruefstand/haerte');
gleich('und den Schluessel auch', confFrage.token, 'nur-ein-pruefwert');
await klick(seite, '[data-trennen="ja"]');
const confNach = await seite.evaluate(() => JSON.parse(localStorage.getItem('gaepp.tabelle.anbindung') || '{}'));
gleich('erst der zweite Klick trennt: Adresse weg', confNach.repo, '');
gleich('erst der zweite Klick trennt: Schluessel weg', confNach.token, '');

/* ====================================================================
   4. Eine kaputte Datendatei legt GAEPP nicht still
   ====================================================================
   Eine gaepp-daten.json ueber die Route ausgeliefert, der bei einer Position
   (Miete | Nebenkosten JAHR) die reihe fehlt und deren jahre einen
   unbrauchbaren Eintrag traegt. Erwartung: die App zeigt trotzdem eine Tabelle,
   der fehlende Wert wird zu zwoelf Nullen geheilt, kein JavaScript-Fehler.
   Danach: ein erzwungener Fehler beim Zeichnen loest den Notausgang aus, und
   die beiden Knoepfe dort fuehren wirklich zurueck.
   Portiert: der Notausgang traegt jetzt die Klasse «leerraum» (nicht «leer»)
   und raeumt ausserdem Band, Druckkopf, Druckfuss und Dialoge — das wird hier
   zusaetzlich gemessen. Der Blattkopf stand bis zum 23.08.2026 mit auf dieser
   Liste; die dritte Kopfzeile ist seither gestrichen, und an seiner Stelle
   wird gemessen, dass es ihn gar nicht mehr gibt. */
console.log('\n4. Eine kaputte Datendatei legt GAEPP nicht still, dazu der Notausgang');

function kaputteDatei() {
  const d = JSON.parse(JSON.stringify(vorratDaten()));
  const fix = d.daten[JAHR].find(b => b.key === 'fixkosten');
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
const geheiltesFeld = await reiheVon(seite, JAHR, 'Fixkosten', 'Miete | Nebenkosten');
pruef('die fehlende reihe wurde zu zwoelf Zahlen geheilt', Array.isArray(geheiltesFeld) && geheiltesFeld.length === 12, geheiltesFeld);
pruef('geheilt sind es zwoelf Nullen', geheiltesFeld && geheiltesFeld.every(x => x === 0), geheiltesFeld);
const jahreImStand = await seite.evaluate(() => S.jahre.slice());
pruef('der unbrauchbare Eintrag in jahre steht nicht im Datenstand', jahreImStand.indexOf('unbrauchbar') < 0, jahreImStand);
gleich('die uebrigen Jahrgaenge stehen weiterhin da', jahreImStand.join(','), JAHRE.join(','));
/* Gegenprobe: eine Zeile, an der nichts kaputt war, ist unangetastet. */
gleich('die Nachbarzeile ist unveraendert durchgekommen',
  (await reiheVon(seite, JAHR, 'Fixkosten', 'Krankenkasse')).join(','), new Array(12).fill(489).join(','));

console.log('  4b. Notausgang: ein erzwungener Fehler beim Zeichnen');
/* Ein Merkzeichen direkt im Browserspeicher gesetzt (am Datenstand vorbei) —
   nicht aus der Route, aus der App. Bleibt es nach «Vergiss» stehen, wurde der
   Speicher NICHT wirklich geleert, sondern nur der alte (gecachte) Stand
   erneut gezeichnet. */
const MERKNAME = 'GECACHTER-STAND-NICHT-GELOESCHT';
await seite.evaluate(([j, mn]) => {
  try {
    const roh = JSON.parse(localStorage.getItem('gaepp.tabelle.v1'));
    const fix = roh.daten[j].find(b => b.key === 'fixkosten');
    const miete = fix.pos.find(p => p.key === 'miete');
    miete.name = mn;
    localStorage.setItem('gaepp.tabelle.v1', JSON.stringify(roh));
  } catch (e) {}
}, [JAHR, MERKNAME]);
await seite.evaluate(() => {
  window.budgetblatt = () => { throw new Error('Erzwungener Testfehler (haerte.mjs)'); };
  window.zeichne();
});
await bisRuhe(seite);
const notausgang = await seite.evaluate(() => {
  const leer = document.querySelector('#blatt .leerraum');
  if (!leer) return null;
  const laden = leer.querySelector('[data-laden]'), vergiss = leer.querySelector('[data-vergiss]');
  const leerId = id => { const el = document.getElementById(id); return el ? el.innerHTML.trim() : null; };
  return { text: leer.textContent, kopf: leer.querySelector('h2') ? leer.querySelector('h2').textContent : null,
    hatLaden: !!laden, ladenText: laden ? laden.textContent.trim() : null,
    hatVergiss: !!vergiss, vergissText: vergiss ? vergiss.textContent.trim() : null,
    band: leerId('band'), druckkopf: leerId('druckkopf'),
    druckfuss: leerId('druckfuss'), dialoge: leerId('dialoge'),
    /* GESTRICHEN am 23.08.2026: das Feld blattkopf. Die dritte Kopfzeile —
       Blatttitel links, Legende rechts — ist ersatzlos entfallen; die
       Aufraeumliste des Notausgangs fuehrt nur noch band, druckkopf, druckfuss
       und dialoge. Statt zu messen, ob ein Feld geraeumt ist, das es nicht
       gibt, wird gemessen, dass es das Feld wirklich nicht mehr gibt. */
    blattkopfDa: !!document.getElementById('blattkopf'),
    kopf3Da: document.querySelectorAll('.kopf3, .titel, .legende').length,
    /* Gegenprobe zur Aufraeumliste: die vier Bereiche, die geraeumt sein
       sollen, muss es ueberhaupt geben. Faellt einer von ihnen aus der App,
       liefert leerId() null statt '' und die Pruefung wird rot, statt still
       an einem verschwundenen Feld gruen zu bleiben. */
    bereicheDa: ['band', 'druckkopf', 'druckfuss', 'dialoge']
      .filter(id => !document.getElementById(id)).join(','),
    leiste: (document.getElementById('leiste') || {}).innerHTML,
    tabellen: document.querySelectorAll('table').length };
});
pruef('der Notausgang zeigt sich (Datenstand laesst sich nicht anzeigen)', notausgang !== null, notausgang);
if (notausgang) {
  gleich('die Ueberschrift sagt, was los ist', notausgang.kopf, 'Dieser Datenstand lässt sich nicht anzeigen.');
  pruef('die Meldung nennt den erzwungenen Fehler', notausgang.text.includes('Erzwungener Testfehler'), notausgang.text);
  pruef('es gibt den Knopf «Andere Datei laden»', notausgang.hatLaden, notausgang);
  gleich('Beschriftung des Ladeknopfs', notausgang.ladenText, 'Andere Datei laden');
  pruef('es gibt den Knopf «Browserspeicher leeren und neu starten»', notausgang.hatVergiss, notausgang);
  gleich('Beschriftung des Vergiss-Knopfs', notausgang.vergissText, 'Browserspeicher leeren und neu starten');
  /* Neu: der Notausgang raeumt alles weg, was auf einen Datenstand zeigt, den
     es nicht anzeigen kann. Bliebe eine dieser Stellen stehen, stuende neben
     der Fehlermeldung ein Kennzahlenband aus einer Rechnung, die nicht gilt. */
  gleich('alle vier Aufraeumbereiche sind ueberhaupt da (Gegenprobe)',
    notausgang.bereicheDa, '');
  gleich('das Kennzahlenband ist geraeumt', notausgang.band, '');
  /* Die Frage von frueher — bleibt neben der Fehlermeldung ein Rest der alten
     Anzeige stehen? — bleibt. Nur ist der Blattkopf nicht mehr geraeumt,
     sondern gar nicht mehr da. Genau das wird jetzt gemessen. */
  pruef('den Blattkopf gibt es gar nicht mehr — es bleibt nichts zu raeumen',
    notausgang.blattkopfDa === false, notausgang.blattkopfDa);
  gleich('auch .kopf3, .titel und .legende sind fort', notausgang.kopf3Da, 0);
  gleich('der Druckkopf ist geraeumt', notausgang.druckkopf, '');
  gleich('der Druckfuss ist geraeumt', notausgang.druckfuss, '');
  gleich('die Dialoge sind geraeumt', notausgang.dialoge, '');
  gleich('keine Tabelle steht mehr da', notausgang.tabellen, 0);
  pruef('die Leiste traegt nur noch die Wortmarke', /GÄPP/.test(notausgang.leiste || '')
    && !/data-geh-jahr/.test(notausgang.leiste || ''), notausgang.leiste);

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
  const mieteName = await seite.evaluate((j) => {
    const fix = (S.daten[j] || []).find(b => b.key === 'fixkosten');
    const miete = fix && (fix.pos || []).find(p => p.key === 'miete');
    return miete ? miete.name : null;
  }, JAHR);
  gleich('der Browserspeicher wurde tatsaechlich geleert — das Merkzeichen ist weg, es steht wieder der Name aus der Datei',
    mieteName, 'Miete | Nebenkosten');
}

await seite.unroute('**/gaepp-daten.json');
await frisch(seite);

/* ====================================================================
   5. «Uebertragen … auch in die Folgejahre» fasst keine fremde Zeile an
   ====================================================================
   Portiert. Seit 3.0.0 sperrt schluesselNachziehen() einen Schluessel, der im
   selben Jahrgang schon vergeben ist — zwei gleichnamige Zeilen in EINEM
   Jahrgang koennen also gar nicht mehr denselben Schluessel tragen. Die Falle
   bleibt aber ueber die Jahrgaenge hinweg offen, und genau dort wird gemessen:

     Folgejahr : «Sonderzahlung» in LEBENSHALTUNG   (Schluessel sonderzahlung)
     Folgejahr : «Ferienkasse»   in FIXKOSTEN       (Schluessel ferienkasse)
     Jahr      : «Sonderzahlung» in FIXKOSTEN       (Schluessel sonderzahlung)
     Jahr      : «Ferienkasse»   in FIXKOSTEN       (Schluessel ferienkasse)

   Uebertragen ab Januar mit gesetztem Haken muss «Ferienkasse» im Folgejahr
   treffen (gleiche Kategorie) und «Sonderzahlung» im Folgejahr in Ruhe lassen
   (gleicher Schluessel, ANDERE Kategorie). */
console.log('\n5. «Uebertragen … auch in die Folgejahre» fasst keine fremde Zeile an');
await frisch(seite);

const fLeb = await neueBlockPos(seite, FOLGE, 'Lebenshaltung', 'Sonderzahlung');
const fFer = await neueBlockPos(seite, FOLGE, 'Fixkosten', 'Ferienkasse');
await tippe(seite, `input.zelle[data-z="${fLeb}"][data-m="2"]`, '999');   /* Merkwert */
const jFix = await neueBlockPos(seite, JAHR, 'Fixkosten', 'Sonderzahlung');
const jFer = await neueBlockPos(seite, JAHR, 'Fixkosten', 'Ferienkasse');
const jLeb = await neueBlockPos(seite, JAHR, 'Lebenshaltung', 'Sonderzahlung');
pruef('alle fuenf Zeilen angelegt', !!fLeb && !!fFer && !!jFix && !!jFer && !!jLeb,
  { fLeb, fFer, jFix, jFer, jLeb });

/* Die Schluessel werden gelesen, nicht angenommen — an ihnen haengt der ganze
   Abschnitt. */
const schluesselVon = (jahr, pid) => seite.evaluate(([j, id]) => {
  for (const b of (S.daten[j] || [])) {
    const p = (b.pos || []).find(x => x.id === id);
    if (p) return p.key;
  }
  return null;
}, [jahr, pid]);
const schluessel = {
  jahrFix: await schluesselVon(JAHR, jFix),
  jahrFer: await schluesselVon(JAHR, jFer),
  jahrLeb: await schluesselVon(JAHR, jLeb),
  folgeLeb: await schluesselVon(FOLGE, fLeb),
  folgeFer: await schluesselVon(FOLGE, fFer)
};
gleich('die Zeile im Folgejahr traegt den Schluessel aus ihrem Namen', schluessel.folgeLeb, 'sonderzahlung');
gleich('die gleichnamige Zeile im Stichjahr traegt denselben Schluessel', schluessel.jahrFix, 'sonderzahlung');
gleich('«Ferienkasse» traegt in beiden Jahrgaengen denselben Schluessel', schluessel.jahrFer, schluessel.folgeFer);
gleich('und zwar den aus ihrem Namen', schluessel.jahrFer, 'ferienkasse');
pruef('die zweite gleichnamige Zeile im SELBEN Jahrgang bekommt ihn NICHT (Schluesselsperre)',
  schluessel.jahrLeb !== 'sonderzahlung', schluessel.jahrLeb);

const folgeLebVorher = await reiheVon(seite, FOLGE, 'Lebenshaltung', 'Sonderzahlung');
const jahrLebVorher = await reiheVon(seite, JAHR, 'Lebenshaltung', 'Sonderzahlung');
gleich('Merkwert im Folgejahr sitzt im dritten Monat', folgeLebVorher[2], 999);

/* a) Gleiche Kategorie, gleicher Schluessel -> das Folgejahr wird gesetzt. */
await gehJahr(seite, JAHR);
await dbl(seite, `input.zelle[data-z="${jFer}"][data-m="0"]`);
pruef('Fenster «Uebertragen» offen (Ferienkasse)', await vorhanden(seite, '[data-schleier="ueb"]'));
await tippe(seite, '[data-ueb-wert="1"]', '400');
await klick(seite, '[data-ueb-folge="1"]');
await klick(seite, '[data-ueb-an="1"]');
await bisRuhe(seite);
gleich('Stichjahr Fixkosten «Ferienkasse»: alle zwoelf Monate auf 400',
  (await reiheVon(seite, JAHR, 'Fixkosten', 'Ferienkasse')).join(','), new Array(12).fill(400).join(','));
gleich('Folgejahr Fixkosten «Ferienkasse» (GLEICHE Kategorie): ebenfalls 400 in jedem Monat',
  (await reiheVon(seite, FOLGE, 'Fixkosten', 'Ferienkasse')).join(','), new Array(12).fill(400).join(','));

/* b) Gleicher Schluessel, andere Kategorie -> das Folgejahr bleibt in Ruhe. */
await gehJahr(seite, JAHR);
await dbl(seite, `input.zelle[data-z="${jFix}"][data-m="0"]`);
pruef('Fenster «Uebertragen» offen (Sonderzahlung)', await vorhanden(seite, '[data-schleier="ueb"]'));
await tippe(seite, '[data-ueb-wert="1"]', '700');
await klick(seite, '[data-ueb-folge="1"]');
await klick(seite, '[data-ueb-an="1"]');
await bisRuhe(seite);
gleich('Stichjahr Fixkosten «Sonderzahlung»: alle zwoelf Monate auf 700',
  (await reiheVon(seite, JAHR, 'Fixkosten', 'Sonderzahlung')).join(','), new Array(12).fill(700).join(','));

const folgeLebNachher = await reiheVon(seite, FOLGE, 'Lebenshaltung', 'Sonderzahlung');
pruef('Folgejahr Lebenshaltung «Sonderzahlung» (gleicher Schluessel, ANDERE Kategorie): unangetastet — der Merkwert steht noch',
  folgeLebNachher && folgeLebNachher[2] === 999, folgeLebNachher);
gleich('Folgejahr Lebenshaltung «Sonderzahlung»: sonst weiterhin alles bei null',
  folgeLebNachher ? folgeLebNachher.filter((_, i) => i !== 2).join(',') : null, new Array(11).fill(0).join(','));
gleich('Stichjahr Lebenshaltung «Sonderzahlung» (andere Kategorie, anderer Schluessel): unveraendert',
  (await reiheVon(seite, JAHR, 'Lebenshaltung', 'Sonderzahlung')).join(','), jahrLebVorher.join(','));
gleich('Folgejahr Fixkosten «Ferienkasse» ist vom zweiten Uebertragen nicht noch einmal angefasst worden',
  (await reiheVon(seite, FOLGE, 'Fixkosten', 'Ferienkasse')).join(','), new Array(12).fill(400).join(','));

/* ====================================================================
   6. «Getilgt bisher» zaehlt keine Schuld mit, die noch nicht laeuft
   ====================================================================
   Von Hand aus vorrat.mjs hergeleitet, Stichmonat August 2026 — je Schuld der
   eigene Anfangsstand von 2024, davon die Raten der Jahre 2024, 2025 und der
   ersten acht Monate 2026 (32 Monate), Kappung bei null je Schuld:

     Steueramt Nord   24000 − 32×500 =  8000     Anfang 24000
     Steueramt Sued    7200 − 32×300 =     0     Anfang  7200   (nach 24 Raten durch)
     Darlehen Blumb.  18000 − 32×150 = 13200     Anfang 18000
     Kreditkasse Tr.   9600 − 32×120 =  5760     Anfang  9600
     Velohaus Kern     1800 − 32× 60 =     0     Anfang  1800   (nach 30 Raten durch)

   Rest   = 8000 + 0 + 13200 + 5760 + 0 = 26960
   Anfang = 24000 + 7200 + 18000 + 9600 + 1800 = 60600
   Getilgt = 60600 − 26960 = 33640, Quote = round(33640/60600×100) = 56 %.

   Eine neue Schuld «Rate Herbstwind» wird im Stichjahr mit Basis 0 angelegt (im
   Geruest gefuehrt, aber noch nicht gestartet) und startet erst im Folgejahr mit
   Basis 5000 und einer Rate. Erwartung: Anfang/Getilgt/Rest bleiben EXAKT wie
   vorher — die kuenftige Schuld darf nicht rueckwirkend mitgezaehlt werden.
   Portiert: die Quote steht in der Kurzzeile, der Anfangsstand im TITEL der
   Kachel (frueher standen beide in der Kurzzeile). */
console.log('\n6. «Getilgt bisher» zaehlt keine Schuld mit, die noch nicht laeuft');
await frisch(seite);
pruef('alle Sektionen aufgeklappt (Taste z)', await allesAuf(seite));
pruef('Gegenprobe: den Knopf [data-alle-um] gibt es in der laufenden App nicht mehr',
  !(await vorhanden(seite, '[data-alle-um]')));

const vorGetilgt = await kachel(seite, 'Getilgt bisher');
const vorRest = await kachel(seite, 'Restschuld heute');
pruef('Kacheln «Getilgt bisher» und «Restschuld heute» gefunden', vorGetilgt !== null && vorRest !== null, { vorGetilgt, vorRest });
if (vorGetilgt && vorRest) {
  gleich('Ausgangswert Getilgt bisher = 33640 (von Hand hergeleitet)', lies(vorGetilgt.v), 33640);
  gleich('Ausgangswert Restschuld heute = 26960 (von Hand hergeleitet)', lies(vorRest.v), 26960);
  gleich('die Kurzzeile nennt die Quote', vorGetilgt.m, '56 %');
  const mVor = /^von ([\d'’]+) seit (\d+)$/.exec(vorGetilgt.titel);
  pruef('der Titel nennt Anfangsstand und Startjahr', mVor !== null, vorGetilgt.titel);
  if (mVor) {
    gleich('Ausgangs-Anfangsstand = 60600', lies(mVor[1]), 60600);
    gleich('Startjahr ist der erste Jahrgang des Vorrats', +mVor[2], JAHRE[0]);
  }

  await neueSchuldPos(seite, JAHR, 'Schulden Firmen', 'Rate Herbstwind');
  await neueSchuldPos(seite, FOLGE, 'Schulden Firmen', 'Rate Herbstwind');
  const posFolge = await schuldPos(seite, FOLGE, 'Rate Herbstwind');
  const posJahr = await schuldPos(seite, JAHR, 'Rate Herbstwind');
  pruef('«Rate Herbstwind» in beiden Jahrgaengen angelegt', !!posFolge && !!posJahr, { posFolge, posJahr });
  if (posFolge && posJahr) {
    gleich('im Stichjahr steht sie mit Basis null da (Geruest, nicht gestartet)', posJahr.basis, 0);
    await gehJahr(seite, FOLGE);
    await tippe(seite, `input.zelle[data-b="${posFolge.id}"]`, '5000');
    await dbl(seite, `input.zelle[data-z="${posFolge.id}"][data-m="0"]`);
    await tippe(seite, '[data-ueb-wert="1"]', '500');
    await klick(seite, '[data-ueb-an="1"]');
    await bisRuhe(seite);
    const folgeNeu = await schuldPos(seite, FOLGE, 'Rate Herbstwind');
    gleich('im Folgejahr laeuft sie wirklich (Basis gesetzt)', folgeNeu.basis, 5000);
    gleich('und traegt zwoelf Raten', folgeNeu.reihe.join(','), new Array(12).fill(500).join(','));
  }

  await gehJahr(seite, JAHR);
  const nachGetilgt = await kachel(seite, 'Getilgt bisher');
  const nachRest = await kachel(seite, 'Restschuld heute');
  gleich('Getilgt bisher bleibt EXAKT bei 33640 — die kuenftige Schuld zaehlt nicht rueckwirkend', lies(nachGetilgt.v), 33640);
  gleich('Restschuld heute bleibt EXAKT bei 26960', lies(nachRest.v), 26960);
  gleich('Kurzzeile unveraendert', nachGetilgt.m, vorGetilgt.m);
  gleich('Titel unveraendert', nachGetilgt.titel, vorGetilgt.titel);
  const quote = parseInt(nachGetilgt.m, 10);
  pruef('die Quote bleibt zwischen null und hundert', quote >= 0 && quote <= 100, quote);
  const mNach = /^von ([\d'’]+) seit (\d+)$/.exec(nachGetilgt.titel);
  if (mNach) gleich('Anfang minus Getilgt ergibt die Restschuld', lies(mNach[1]) - lies(nachGetilgt.v), lies(nachRest.v));

  /* Gegenprobe: im Folgejahr, wo sie laeuft, zaehlt sie sehr wohl mit. */
  await seite.evaluate((j) => { S.stichmonat = j + '-12'; zeichne(); }, FOLGE);
  await bisRuhe(seite);
  const imFolgejahr = await kachel(seite, 'Getilgt bisher');
  const mFolge = /^von ([\d'’]+) seit (\d+)$/.exec(imFolgejahr.titel);
  pruef('Gegenprobe: verlegt man den Stichmonat ins Folgejahr, waechst der Anfangsstand um genau diese 5000',
    mFolge !== null && lies(mFolge[1]) === 60600 + 5000, { titel: imFolgejahr.titel });
}

/* ====================================================================
   7. Eine Quote ausserhalb von null bis hundert wird als Befund gemeldet
   ====================================================================
   Portiert. Bis 2.0.0 stand eine solche Quote in der Warnfarbe (--prot). Farben
   gibt es seit 3.0.0 nicht mehr — die Kachel SAGT es stattdessen: der Titel
   wechselt von «von … seit …» auf «Die Zahlen gehen nicht auf — … %», und die
   Kachel «Schuldenfrei» wechselt ihre Kurzzeile auf «der Plan geht nicht auf».
   Die Frage bleibt dieselbe: faellt eine unmoegliche Quote auf?

   Stichmonat auf Dezember gesetzt (alle zwoelf Monatsraten gebucht):
     Nord 12000−6000=6000, Sued 0, Blumberg 14400−1800=12600,
     Tremont 6720−1440=5280, Velo Kern 0  ->  Rest = 23880
     Anfang bleibt 60600, Getilgt = 36720, Quote = round(60.59) = 61 %.
   Eine Rest-Korrektur von −40000 auf Velohaus Kern (Rest dort 0, am 31.12.
   gebucht, zaehlt bei Stichmonat Dezember): neuer Rest 23880 − 40000 = −16120.
   Getilgt = 60600 − (−16120) = 76720.
   Quote = round(76720/60600×100) = round(126.57) = 127 % — ausserhalb. */
console.log('\n7. Eine Quote ausserhalb von null bis hundert wird als Befund gemeldet');
await frisch(seite);
await allesAuf(seite);
await seite.evaluate((j) => { S.stichmonat = j + '-12'; zeichne(); }, JAHR);
await bisRuhe(seite);

const basis61 = await kachel(seite, 'Getilgt bisher');
const frei61 = await kachel(seite, 'Schuldenfrei');
const rest61 = await kachel(seite, 'Restschuld heute');
pruef('Kacheln gefunden (Stichmonat Dezember)', basis61 !== null && frei61 !== null && rest61 !== null,
  { basis61, frei61, rest61 });
if (basis61) {
  gleich('bei Dezember zunaechst 36720', lies(basis61.v), 36720);
  gleich('Restschuld heute zunaechst 23880', lies(rest61.v), 23880);
  gleich('die Quote steht bei 61 %', basis61.m, '61 %');
  gleich('und der Titel rechnet sie nach, ohne zu klagen', basis61.titel,
    'von ' + fmt(60600, true) + ' seit ' + JAHRE[0]);
  pruef('«Schuldenfrei» meldet noch keinen unstimmigen Plan',
    frei61.m !== 'der Plan geht nicht auf', frei61.m);
}

const veloJahr = await schuldPos(seite, JAHR, 'Velohaus Kern');
pruef('«Velohaus Kern» im Stichjahr gefunden', !!veloJahr, veloJahr);
if (veloJahr) {
  await gehJahr(seite, JAHR);
  await korrEintragen(seite, { pid: veloJahr.id, art: 'rest', betrag: '-40000', notiz: 'Haerteprobe Quote' });
  await korrSchliessen(seite);

  const nach = await kachel(seite, 'Getilgt bisher');
  const freiNach = await kachel(seite, 'Schuldenfrei');
  const restNach = await kachel(seite, 'Restschuld heute');
  pruef('Kacheln gefunden (nach der Korrektur)', nach !== null && freiNach !== null && restNach !== null, { nach, freiNach, restNach });
  if (nach) {
    gleich('Getilgt bisher = 76720 (60600 − (−16120), von Hand hergeleitet)', lies(nach.v), 76720);
    gleich('die Kurzzeile zeigt die unmoegliche Quote', nach.m, '127 %');
    gleich('der Titel sagt, dass die Zahlen nicht aufgehen',
      nach.titel, 'Die Zahlen gehen nicht auf — 127 % von ' + fmt(60600, true));
    gleich('die Restschuld steht unter null', lies(restNach.v), -16120);
    gleich('und sagt auch, warum', restNach.titel, 'Unter null — eine Korrektur nimmt mehr weg, als da ist.');
    gleich('«Schuldenfrei» meldet den unstimmigen Plan', freiNach.m, 'der Plan geht nicht auf');
    gleich('und zeigt keinen Monat mehr an', freiNach.v, '—');
  }

  /* Gegenprobe: Korrektur entfernen -> Quote, Titel und Kurzzeile wieder normal. */
  await korrOeffnenRest(seite, veloJahr.id);
  await klick(seite, '.korrliste button.weg[data-korr-weg]');
  await korrSchliessen(seite);
  const zurueck = await kachel(seite, 'Getilgt bisher');
  const freiZurueck = await kachel(seite, 'Schuldenfrei');
  gleich('Gegenprobe: ohne die Korrektur steht wieder 36720 da', lies(zurueck.v), 36720);
  gleich('Gegenprobe: die Quote ist wieder im Rahmen', zurueck.m, '61 %');
  gleich('Gegenprobe: der Titel klagt nicht mehr', zurueck.titel,
    'von ' + fmt(60600, true) + ' seit ' + JAHRE[0]);
  pruef('Gegenprobe: «Schuldenfrei» meldet keinen unstimmigen Plan mehr',
    freiZurueck.m !== 'der Plan geht nicht auf', freiZurueck.m);
  gleich('Gegenprobe: die Korrekturliste ist leer',
    (await korrListe(seite, JAHR, veloJahr.gKey, veloJahr.key, 'rest')).length, 0);
}

/* ====================================================================
   8. Eine negative Rate laesst die Schuld wachsen, auch bei Basis null
   ====================================================================
   nachRaten(basis, raten): ist raten negativ, gilt «basis − raten» ohne
   Kappung. Basis 0, Januar −3000 -> Rest = 0 − (−3000) = 3000.
   Gegenprobe mit Basis 1000 -> Rest = 1000 − (−3000) = 4000.
   Dazu die Regel daneben, damit die Kappung nicht mitgestrichen wird: eine
   Rate, die groesser ist als die Schuld, tilgt nur bis null. */
console.log('\n8. Eine negative Rate laesst die Schuld wachsen, auch bei Basis null');
await frisch(seite);
await allesAuf(seite);
const ostId = await neueSchuldPos(seite, JAHR, 'Schulden Privat', 'Kredit Ostwind');
pruef('«Kredit Ostwind» angelegt', !!ostId, ostId);
if (ostId) {
  const jahrRestSel = `td[data-kr="${ostId}"]`;
  const basisSel8 = `input.zelle[data-b="${ostId}"]`;
  const janSel = `input.zelle[data-z="${ostId}"][data-m="0"]`;

  gleich('Basis startet bei null (leeres Feld)', await zelleText(seite, basisSel8), '');

  await tippe(seite, janSel, '-3000');
  gleich('Januar zeigt die negative Rate', await zelleText(seite, janSel), fmt(-3000, true));
  gleich('Jahr/Rest bei Basis 0: 0 − (−3000) = 3000', lies(await zelleText(seite, jahrRestSel)), 3000);

  await tippe(seite, basisSel8, '1000');
  gleich('Gegenprobe: Jahr/Rest bei Basis 1000: 1000 − (−3000) = 4000', lies(await zelleText(seite, jahrRestSel)), 4000);

  /* Die Regel nebenan: nach oben wird gekappt. */
  await tippe(seite, janSel, '5000');
  gleich('eine Rate groesser als die Schuld tilgt nur bis null, nicht ins Minus',
    lies(await zelleText(seite, jahrRestSel)), 0);
  await tippe(seite, janSel, '-3000');
  gleich('und zurueck: die negative Rate laesst sie wieder wachsen',
    lies(await zelleText(seite, jahrRestSel)), 4000);
}

/* ====================================================================
   9. Mit dem Betrag faellt die Marke, in beiden Tafeln
   ====================================================================
   Abgehakt -> Betrag auf 0 -> die Marke ist im Datenstand weg (nicht nur
   optisch). Danach ein neuer Betrag: die Zelle steht wieder OHNE Marke da.
   Portiert: die Marke steht seit 3.0.0 nicht mehr als Klasse «gruen» am
   Eingabefeld, sondern als Klasse «hak» an der Zelle darum — halbfett statt
   gruen. Gemessen wird die Zelle und der Datenstand. */
console.log('\n9. Mit dem Betrag faellt die Marke, in beiden Tafeln');

console.log('  9a. Budget-Tafel');
await frisch(seite);
await gehJahr(seite, JAHR);
const fixId9 = await blockId(seite, JAHR, 'Fixkosten');
await oeffne(seite, fixId9);
const bahnId = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const mieteId9 = await blockPosId(seite, JAHR, 'Fixkosten', 'Miete | Nebenkosten');
pruef('Zeilen «Bahnabo» und «Miete | Nebenkosten» gefunden', !!bahnId && !!mieteId9, { bahnId, mieteId9 });
if (bahnId) {
  const sel = `input.zelle[data-z="${bahnId}"][data-m="3"]`;   /* April, traegt 212 */
  pruef('Ausgangslage: hier steht noch keine Marke', !(await hakenAn(seite, bahnId, 3)));
  await rklick(seite, sel);
  gleich('nach dem Rechtsklick traegt die Zelle die Marke', await tdKlasse(seite, sel), 'c-mon hak');
  pruef('die Marke steht im Datenstand', await hakenAn(seite, bahnId, 3));

  await tippe(seite, sel, '0');
  gleich('mit dem Betrag auf 0 faellt die Marke von der Zelle', await tdKlasse(seite, sel), 'c-mon');
  pruef('die Marke ist im Datenstand WEG (nicht nur optisch)', !(await hakenAn(seite, bahnId, 3)));

  await tippe(seite, sel, '120');
  gleich('ein neuer Betrag: die Zelle bleibt ohne Marke', await tdKlasse(seite, sel), 'c-mon');
  pruef('die Marke kommt nicht von selbst zurueck', !(await hakenAn(seite, bahnId, 3)));
}
if (mieteId9) {
  /* Eine Marke, die aus der DATEI kommt und nicht aus einem Klick, faellt
     genauso — sonst haengt eine unsichtbare Marke an einer leeren Zelle. */
  const selM = `input.zelle[data-z="${mieteId9}"][data-m="3"]`;
  pruef('Ausgangslage: diese Marke kommt aus dem Vorrat, nicht aus einem Klick', await hakenAn(seite, mieteId9, 3));
  gleich('und die Zelle zeigt sie', await tdKlasse(seite, selM), 'c-mon hak');
  await tippe(seite, selM, '0');
  gleich('mit dem Betrag auf 0 faellt auch die geerbte Marke', await tdKlasse(seite, selM), 'c-mon');
  pruef('auch im Datenstand', !(await hakenAn(seite, mieteId9, 3)));
  /* Gegenprobe: die Nachbarmonate derselben Zeile behalten ihre Marke. */
  pruef('Gegenprobe: der Nachbarmonat behaelt seine Marke', await hakenAn(seite, mieteId9, 4));
}

console.log('  9b. Rechnungen-Tafel');
await frisch(seite);
await klick(seite, '[data-geh-ansicht="rechnung"]');
const stellerId = await seite.evaluate((j) => {
  const g = (S.rechnungen[j] || []).find(x => (x.rechnungen || []).some(r => r.zweck === 'Behandlung'));
  return g ? g.id : null;
}, JAHR);
const rechId = await seite.evaluate((j) => {
  for (const g of (S.rechnungen[j] || [])) {
    const r = (g.rechnungen || []).find(x => x.zweck === 'Behandlung');
    if (r) return r.id;
  }
  return null;
}, JAHR);
pruef('Rechnung «Behandlung» gefunden', !!stellerId && !!rechId, { stellerId, rechId });
if (stellerId && rechId) {
  pruef('Steller aufgeklappt', await oeffne(seite, stellerId));
  const mSel = `input.zelle[data-rm="${rechId}"][data-m="7"]`;  /* August, traegt 470 */
  const standSel = `select.standwahl[data-r="${rechId}"][data-f="stand"]`;
  gleich('Ausgangsstand der Rechnung', await zelleText(seite, standSel), 'Offen');
  await rklick(seite, mSel);
  gleich('nach dem Rechtsklick traegt die Zelle die Marke', await tdKlasse(seite, mSel), 'c-mon hak');
  gleich('nur ein Monat abgehakt: der Stand bleibt «Offen» (nicht alle Monate erledigt)',
    await zelleText(seite, standSel), 'Offen');
  pruef('die Marke steht im Datenstand', await hakenAn(seite, rechId, 7));

  await tippe(seite, mSel, '0');
  gleich('mit dem Betrag auf 0 faellt die Marke von der Zelle', await tdKlasse(seite, mSel), 'c-mon');
  pruef('Rechnungen-Tafel: die Marke ist im Datenstand WEG', !(await hakenAn(seite, rechId, 7)));

  await tippe(seite, mSel, '350');
  gleich('ein neuer Betrag: die Zelle bleibt ohne Marke', await tdKlasse(seite, mSel), 'c-mon');
  pruef('Rechnungen-Tafel: die Marke kommt nicht von selbst zurueck', !(await hakenAn(seite, rechId, 7)));
}

console.log('  9c. Der Haken am Rechtsklick — und der linke Klick, der ihn nie setzt');
/* Geaendert am 23.08.2026. Albrecht hat entschieden: der Haken («erledigt»,
   «bezahlt») liegt wieder ALLEIN auf dem Rechtsklick, wie in 2.0.0. Der linke
   Klick gehoert ganz dem Eingeben — er setzt nur den Cursor und NIE eine
   Marke: nicht beim ersten Klick, nicht beim zweiten, und auch nicht auf einer
   Zelle, die den Fokus schon hat. Der Rechtsklick wirkt dafuer sofort, schon
   beim ersten Mal, ohne Vorklick. Der Doppelklick oeffnet im Budget
   «Uebertragen»; er setzt keine Marke und nimmt auch keine zurueck — die
   frueher noetige Ruecknahme im Doppelklick ist ersatzlos entfallen.

   Bis zum 22.08.2026 stand hier die umgekehrte Frage: «der zweite, getrennte
   Klick setzt die Marke». Sie ist UMGEDREHT, nicht gestrichen. Und der Befund,
   um den es urspruenglich ging, wird weiter bewacht: damals kippte der erste
   Klick eines Doppelklicks die Erledigt-Marke, waehrend der zweite
   «Uebertragen» oeffnete — man fand danach eine Marke, die niemand gesetzt
   hatte. Der Weg dorthin ist heute ein anderer (der linke Klick schaltet gar
   nichts mehr), das Ergebnis muss dasselbe bleiben: ein Doppelklick darf keine
   Marke hinterlassen und keine wegnehmen, weder im Budget noch in den
   Rechnungen. Eine Regel, die neu ist, hat noch keine Narben — geprueft wird
   sie deshalb an derselben Stelle wie die alte.

   Zu jedem «keine Marke» gehoert die Gegenprobe mit dem Rechtsklick auf
   DIESELBE Zelle. Ohne sie waere «keine Marke» auch dann gruen, wenn die Zelle
   ueberhaupt nicht abhakbar ist — dann pruefte der Lauf nichts.
   Gemessen wird durchgehend die Wirkung: der Datenstand (S.haken) und die
   Zelle, die ihn zeigt — nicht, welches Ereignis woran haengt. */

/* Steller und Rechnung «Behandlung» im Datenstand. Dieselbe Frage wird in 9c
   an drei Stellen gestellt, deshalb hier einmal aufgeschrieben. */
const behandlung = (s) => s.evaluate((j) => {
  for (const g of (S.rechnungen[j] || [])) {
    const r = (g.rechnungen || []).find(x => x.zweck === 'Behandlung');
    if (r) return { steller: g.id, rech: r.id };
  }
  return null;
}, JAHR);

/* (1) Die Klickfolge selbst, Budget-Tafel: kein linker Klick setzt je eine
   Marke — und der Rechtsklick daneben setzt sie sehr wohl. */
await frisch(seite);
await gehJahr(seite, JAHR);
const fixId9c = await blockId(seite, JAHR, 'Fixkosten');
await oeffne(seite, fixId9c);
const bahnId9c = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const sel9c = `input.zelle[data-z="${bahnId9c}"][data-m="5"]`;   /* Juni, traegt einen Betrag */
pruef('Ausgangslage: keine Marke', !(await hakenAn(seite, bahnId9c, 5)));
await klick(seite, sel9c);
pruef('der erste Klick setzt nur den Cursor, keine Marke', !(await hakenAn(seite, bahnId9c, 5)));
pruef('der Fokus liegt jetzt in der Zelle', await fokusPasstZu(seite, sel9c));
gleich('und die Zelle bleibt ohne Marke', await tdKlasse(seite, sel9c), 'c-mon');
await spaeter(seite, sel9c);
pruef('auch der zweite, getrennte Klick setzt keine Marke — obwohl die Zelle den Fokus schon hatte',
  !(await hakenAn(seite, bahnId9c, 5)));
gleich('und die Zelle zeigt weiterhin keine', await tdKlasse(seite, sel9c), 'c-mon');
await spaeter(seite, sel9c);
pruef('und der dritte ebenso wenig — kein linker Klick setzt je eine Marke',
  !(await hakenAn(seite, bahnId9c, 5)));
/* Zeuge dafuer, dass die linken Klicks ueberhaupt ankommen: derselbe Klick, der
   keine Marke setzt, versetzt den Cursor sehr wohl. Ohne diesen Nachweis waere
   «keine Marke» auch dann gruen, wenn gar nicht geklickt wuerde. */
const nachbar9c = `input.zelle[data-z="${bahnId9c}"][data-m="6"]`;
await klick(seite, nachbar9c);
pruef('Zeuge: derselbe linke Klick versetzt den Cursor in die Nachbarzelle',
  await fokusPasstZu(seite, nachbar9c));
pruef('und setzt auch dort keine Marke', !(await hakenAn(seite, bahnId9c, 6)));
await klick(seite, sel9c);
pruef('und zurueck: der Cursor steht wieder in der Ausgangszelle',
  await fokusPasstZu(seite, sel9c));
/* Die Gegenprobe zur Ruhe: dieselbe Zelle IST abhakbar, nur eben rechts. */
await rklick(seite, sel9c);
pruef('Gegenprobe: der Rechtsklick auf dieselbe Zelle setzt die Marke sehr wohl',
  await hakenAn(seite, bahnId9c, 5));
gleich('und die Zelle zeigt sie', await tdKlasse(seite, sel9c), 'c-mon hak');
/* Und die Gegenrichtung: der linke Klick nimmt auch nichts weg. */
await klick(seite, sel9c);
pruef('ein linker Klick auf die abgehakte Zelle nimmt die Marke nicht weg',
  await hakenAn(seite, bahnId9c, 5));
await spaeter(seite, sel9c);
pruef('und ein zweiter, getrennter ebenso wenig', await hakenAn(seite, bahnId9c, 5));
gleich('die Zelle traegt sie unveraendert', await tdKlasse(seite, sel9c), 'c-mon hak');
await rklick(seite, sel9c);
pruef('Gegenprobe: erst der naechste Rechtsklick nimmt sie wieder weg',
  !(await hakenAn(seite, bahnId9c, 5)));
gleich('und die Zelle steht wieder ohne', await tdKlasse(seite, sel9c), 'c-mon');

/* (1b) Der Rechtsklick wirkt beim ERSTEN Mal — auf einer Zelle, die noch nie
   angeklickt wurde und den Fokus nicht hat. Frueher brauchte der Haken einen
   Vorklick; das ist mit dem 23.08.2026 weg. */
await frisch(seite);
await gehJahr(seite, JAHR);
await oeffne(seite, await blockId(seite, JAHR, 'Fixkosten'));
const bahnErst = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const selErst = `input.zelle[data-z="${bahnErst}"][data-m="4"]`;   /* Mai, traegt einen Betrag */
pruef('Ausgangslage: die Zelle hat den Fokus nicht und traegt keine Marke',
  !(await fokusPasstZu(seite, selErst)) && !(await hakenAn(seite, bahnErst, 4)));
await rklick(seite, selErst);
pruef('der Rechtsklick wirkt sofort, ohne Vorklick', await hakenAn(seite, bahnErst, 4));
gleich('und die Zelle zeigt die Marke', await tdKlasse(seite, selErst), 'c-mon hak');
pruef('Gegenprobe: der Nachbarmonat derselben Zeile bleibt unberuehrt',
  !(await hakenAn(seite, bahnErst, 3)));

/* (1c) Dieselbe Regel in der Rechnungen-Tafel. Dort haengt am Haken zusaetzlich
   der Stand der Rechnung — ein linker Klick darf auch den nicht bewegen. */
await frisch(seite);
await klick(seite, '[data-geh-ansicht="rechnung"]');
const bh1c = await behandlung(seite);
pruef('Rechnungen-Tafel: Steller und Rechnung «Behandlung» gefunden', !!bh1c, bh1c);
if (bh1c) {
  await oeffne(seite, bh1c.steller);
  const rSel1c = `input.zelle[data-rm="${bh1c.rech}"][data-m="7"]`;  /* August, traegt einen Betrag */
  const standSel1c = `select.standwahl[data-r="${bh1c.rech}"][data-f="stand"]`;
  pruef('Rechnungen-Tafel: Ausgangslage ohne Marke', !(await hakenAn(seite, bh1c.rech, 7)));
  await klick(seite, rSel1c);
  pruef('Rechnungen-Tafel: der erste Klick setzt nur den Cursor', !(await hakenAn(seite, bh1c.rech, 7)));
  pruef('Rechnungen-Tafel: der Fokus liegt in der Zelle', await fokusPasstZu(seite, rSel1c));
  await spaeter(seite, rSel1c);
  pruef('Rechnungen-Tafel: auch der zweite, getrennte Klick setzt keine Marke',
    !(await hakenAn(seite, bh1c.rech, 7)));
  gleich('Rechnungen-Tafel: die Zelle bleibt ohne Marke', await tdKlasse(seite, rSel1c), 'c-mon');
  gleich('Rechnungen-Tafel: und der Stand bleibt «Offen»', await zelleText(seite, standSel1c), 'Offen');
  /* Derselbe Zeuge wie im Budget: der Klick kommt an, er versetzt den Cursor. */
  const rNachbar1c = `input.zelle[data-rm="${bh1c.rech}"][data-m="8"]`;
  await klick(seite, rNachbar1c);
  pruef('Zeuge: der linke Klick versetzt den Cursor in die Nachbarzelle',
    await fokusPasstZu(seite, rNachbar1c));
  pruef('und setzt auch dort keine Marke', !(await hakenAn(seite, bh1c.rech, 8)));
  await klick(seite, rSel1c);
  await rklick(seite, rSel1c);
  pruef('Gegenprobe: der Rechtsklick setzt sie auch hier sehr wohl', await hakenAn(seite, bh1c.rech, 7));
  gleich('und die Zelle zeigt sie', await tdKlasse(seite, rSel1c), 'c-mon hak');
  await klick(seite, rSel1c);
  await spaeter(seite, rSel1c);
  pruef('Rechnungen-Tafel: linke Klicks nehmen die gesetzte Marke nicht weg',
    await hakenAn(seite, bh1c.rech, 7));
  gleich('Rechnungen-Tafel: die Zelle traegt sie unveraendert', await tdKlasse(seite, rSel1c), 'c-mon hak');
  await rklick(seite, rSel1c);
  pruef('Gegenprobe: der naechste Rechtsklick nimmt sie wieder weg',
    !(await hakenAn(seite, bh1c.rech, 7)));
}

/* (2) Doppelklick auf eine Zelle OHNE Fokus. */
await frisch(seite);
await gehJahr(seite, JAHR);
await oeffne(seite, await blockId(seite, JAHR, 'Fixkosten'));
const bahnOhne = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const selOhne = `input.zelle[data-z="${bahnOhne}"][data-m="5"]`;
const vorOhne = await hakenAn(seite, bahnOhne, 5);
await dbl(seite, selOhne);
pruef('ohne Fokus: zwei schnelle Klicks oeffnen «Uebertragen»', await vorhanden(seite, '[data-schleier="ueb"]'));
gleich('ohne Fokus: die Marke bleibt, wie sie war', await hakenAn(seite, bahnOhne, 5), vorOhne);
await taste(seite, 'Escape');

/* (3) Doppelklick auf eine Zelle MIT Fokus — dieselbe Lage, die GAEPP nach dem
   Schliessen von «Uebertragen» selbst herstellt: es legt den Fokus in dieselbe
   Zelle zurueck (dialogFokus). Genau hier lag der alte Befund. */
await frisch(seite);
await gehJahr(seite, JAHR);
await oeffne(seite, await blockId(seite, JAHR, 'Fixkosten'));
const bahnMit = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const selMit = `input.zelle[data-z="${bahnMit}"][data-m="5"]`;
await klick(seite, selMit);
const vorMit = await hakenAn(seite, bahnMit, 5);
pruef('Ausgangslage: die Zelle hat den Fokus und traegt keine Marke',
  (await fokusPasstZu(seite, selMit)) && !vorMit);
await dbl(seite, selMit);
pruef('mit Fokus: zwei schnelle Klicks oeffnen «Uebertragen»', await vorhanden(seite, '[data-schleier="ueb"]'));
gleich('mit Fokus: die Marke bleibt, wie sie war — der Doppelklick schaltet sie NICHT nebenbei',
  await hakenAn(seite, bahnMit, 5), vorMit);
await taste(seite, 'Escape');

/* (3b) Die Gegenrichtung, an einem frischen Stand gemessen, damit sie nicht am
   Ergebnis von (3) haengt: eine gesetzte Marke darf der Doppelklick ebenso
   wenig wegnehmen. Gesetzt wird sie mit dem Rechtsklick. */
await frisch(seite);
await gehJahr(seite, JAHR);
await oeffne(seite, await blockId(seite, JAHR, 'Fixkosten'));
const bahnGeg = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const selGeg = `input.zelle[data-z="${bahnGeg}"][data-m="5"]`;
await rklick(seite, selGeg);
/* Ob der Rechtsklick dabei auch den Fokus setzt, ist Browsersache — also wird
   nachgeschaut und nur bei Bedarf hineingeklickt. Der linke Klick ist dabei
   unbedenklich: er setzt seit dem 23.08.2026 nie eine Marke und nimmt auch
   keine weg (das steht in (1)). */
if (!(await fokusPasstZu(seite, selGeg))) await klick(seite, selGeg);
const vorGeg = await hakenAn(seite, bahnGeg, 5);
pruef('Ausgangslage: Marke gesetzt und Fokus in der Zelle',
  vorGeg && (await fokusPasstZu(seite, selGeg)), { vorGeg });
await dbl(seite, selGeg);
gleich('mit Fokus: der Doppelklick nimmt eine gesetzte Marke auch nicht weg',
  await hakenAn(seite, bahnGeg, 5), vorGeg);
await taste(seite, 'Escape');

/* (4) Dieselbe Frage in der Rechnungstafel. Dort gibt es fuer die Monatszelle
   gar keinen Doppelklickweg — umso weniger darf ein Doppelklick dort eine
   Rechnung als bezahlt markieren. */
await frisch(seite);
await klick(seite, '[data-geh-ansicht="rechnung"]');
const bh4 = await behandlung(seite);
if (bh4) {
  await oeffne(seite, bh4.steller);
  const rSel9c = `input.zelle[data-rm="${bh4.rech}"][data-m="7"]`;
  await klick(seite, rSel9c);
  const vorRech = await hakenAn(seite, bh4.rech, 7);
  pruef('Rechnungen-Tafel: Zelle hat den Fokus, keine Marke',
    (await fokusPasstZu(seite, rSel9c)) && !vorRech);
  await dbl(seite, rSel9c);
  pruef('Rechnungen-Tafel: der Doppelklick oeffnet dort kein Fenster',
    !(await vorhanden(seite, '.schleier')));
  gleich('Rechnungen-Tafel: und er schaltet die Marke nicht',
    await hakenAn(seite, bh4.rech, 7), vorRech);
}

/* (4b) Und die Gegenrichtung in den Rechnungen: eine gesetzte Marke darf der
   Doppelklick ebenso wenig wegnehmen. */
await frisch(seite);
await klick(seite, '[data-geh-ansicht="rechnung"]');
const bh4b = await behandlung(seite);
if (bh4b) {
  await oeffne(seite, bh4b.steller);
  const rSel4b = `input.zelle[data-rm="${bh4b.rech}"][data-m="7"]`;
  await rklick(seite, rSel4b);
  const vorRech4b = await hakenAn(seite, bh4b.rech, 7);
  pruef('Rechnungen-Tafel: Marke mit dem Rechtsklick gesetzt', vorRech4b);
  await dbl(seite, rSel4b);
  gleich('Rechnungen-Tafel: der Doppelklick nimmt sie nicht weg',
    await hakenAn(seite, bh4b.rech, 7), vorRech4b);
  pruef('Rechnungen-Tafel: und er oeffnet dort weiterhin kein Fenster',
    !(await vorhanden(seite, '.schleier')));
}

/* (5) Eine leere Zelle laesst sich gar nicht abhaken — weder links noch rechts.
   Eine unsichtbare Marke wuerde wirken, sobald dort wieder eine Zahl steht.
   Daneben zwei Gegenproben, damit «nicht abhakbar» nicht einfach «nichts
   passiert» heisst: die Nachbarzelle mit Betrag laesst sich abhaken, und
   sobald in der leeren Zelle wieder eine Zahl steht, greift der Rechtsklick
   auch dort. */
await frisch(seite);
await gehJahr(seite, JAHR);
await oeffne(seite, await blockId(seite, JAHR, 'Fixkosten'));
const bahnLeer = await blockPosId(seite, JAHR, 'Fixkosten', 'Bahnabo');
const leerSel = `input.zelle[data-z="${bahnLeer}"][data-m="6"]`;
await tippe(seite, leerSel, '0');
await klick(seite, leerSel);
await spaeter(seite, leerSel);
pruef('eine leere Zelle laesst sich nicht abhaken', !(await hakenAn(seite, bahnLeer, 6)));
await rklick(seite, leerSel);
pruef('auch nicht mit dem Rechtsklick', !(await hakenAn(seite, bahnLeer, 6)));
gleich('und sie zeigt keine Marke', await tdKlasse(seite, leerSel), 'c-mon');
const vollSel = `input.zelle[data-z="${bahnLeer}"][data-m="7"]`;
await rklick(seite, vollSel);
pruef('Gegenprobe: die Nachbarzelle mit Betrag laesst sich sehr wohl abhaken',
  await hakenAn(seite, bahnLeer, 7));
await tippe(seite, leerSel, '90');
await rklick(seite, leerSel);
pruef('Gegenprobe: mit einem Betrag greift der Rechtsklick auch dort',
  await hakenAn(seite, bahnLeer, 6));

/* ====================================================================
   10. HTML-Export und der Dialog «Jahr loeschen» — Einzahl und Mehrzahl
   ====================================================================
   HTML-Export: die Ansicht «Alle» wird nur eingefroren, wenn MEHRERE Jahre
   gewaehlt sind (js.length > 1) — bei einem einzigen Jahrgang gibt es im Export
   keinen «Alle»-Knopf.
   Jahr loeschen: die Zahlwoerter (1 Budgetzeile/mehrere, 1 Rechnung/mehrere,
   rueckt/ruecken) stimmen mit der tatsaechlichen Anzahl ueberein, und der
   Warnsatz ueber einen nicht fuehrenden Vorjahrgang erscheint nur, wenn es
   ueberhaupt ein Vorjahr gibt.
   Dazu neu: die Zahlwoerter der Fusszeile (Ein Jahrgang / Sechs Jahrgaenge). */
console.log('\n10. HTML-Export und «Jahr loeschen» — Einzahl und Mehrzahl');

console.log('  10a. HTML-Export: «Alle» nur bei mehreren gewaehlten Jahren');
await frisch(seite);
await gehJahr(seite, JAHR);
await seite.evaluate(() => { window.__export = null; window.gib = (name, text, typ) => { window.__export = { name, text, typ }; }; });

await klick(seite, '[data-exp="1"]');
const jahreEin = await seite.evaluate(() => S.exp.jahre.slice());
gleich('ein einzelner Jahrgang ist voreingestellt', jahreEin.join(','), String(JAHR));
await klick(seite, '[data-exp-html="1"]');
const exp1 = await seite.evaluate(() => window.__export);
pruef('HTML-Export (ein Jahrgang) erzeugt', exp1 !== null, exp1 && exp1.name);
if (exp1) {
  const bild1 = await seite.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { alleKnopf: doc.querySelectorAll('[data-geh-alle]').length,
      alleAnsicht: !!doc.getElementById('v-alle-budget'),
      sichten: doc.querySelectorAll('[data-view]').length,
      klapper: doc.querySelectorAll('[data-klapp-ex]').length,
      alleUm: doc.querySelectorAll('[data-alle-um]').length };
  }, exp1.text);
  gleich('bei einem einzelnen Jahrgang: kein «Alle»-Knopf im Export', bild1.alleKnopf, 0);
  pruef('bei einem einzelnen Jahrgang: keine eingefrorene Ansicht «Alle»', !bild1.alleAnsicht, bild1);
  gleich('zwei eingefrorene Ansichten (Budget und Rechnungen)', bild1.sichten, 2);
  /* Gegenprobe zur Taste «z»: was in der laufenden App die Taste macht, macht
     in der eingefrorenen Datei wieder ein Knopf — dort gibt es keine Tastatur. */
  pruef('in der exportierten Datei steht der Knopf «Alles zuklappen»', bild1.alleUm > 0, bild1);
  pruef('und die Klappknoepfe tragen dort ihren eigenen Namen', bild1.klapper > 0, bild1);
}

await seite.evaluate(() => { window.__export = null; });
await klick(seite, '[data-exp="1"]');
await klick(seite, `[data-exp-jahr="${FOLGE}"]`);
const jahreZwei = await seite.evaluate(() => S.exp.jahre.slice().sort());
gleich('jetzt zwei Jahrgaenge gewaehlt', jahreZwei.join(','), [JAHR, FOLGE].join(','));
await klick(seite, '[data-exp-html="1"]');
const exp2 = await seite.evaluate(() => window.__export);
pruef('HTML-Export (zwei Jahrgaenge) erzeugt', exp2 !== null, exp2 && exp2.name);
if (exp2) {
  const bild2 = await seite.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { alleKnopf: doc.querySelectorAll('[data-geh-alle]').length,
      alleAnsicht: !!doc.getElementById('v-alle-budget'),
      alleRech: !!doc.getElementById('v-alle-rechnung'),
      sichten: doc.querySelectorAll('[data-view]').length,
      alleZielGesetzt: Array.from(doc.querySelectorAll('[data-geh-alle]')).every(b => !!b.getAttribute('data-ziel')) };
  }, exp2.text);
  pruef('bei zwei Jahrgaengen: der «Alle»-Knopf steht im Export', bild2.alleKnopf > 0, bild2);
  pruef('sein Ziel ist gesetzt (funktionierender Knopf, kein totes Element)', bild2.alleZielGesetzt, bild2);
  pruef('bei zwei Jahrgaengen: die eingefrorene Ansicht «Alle» existiert', bild2.alleAnsicht, bild2);
  pruef('auch «Alle Jahre · Rechnungen»', bild2.alleRech, bild2);
  gleich('sechs eingefrorene Ansichten (zwei Jahrgaenge à zwei, dazu zweimal Alle)', bild2.sichten, 6);
}

console.log('  10b. «Jahr loeschen» — Einzahl und Mehrzahl, dazu der Warnsatz');
await frisch(seite);
/* Fall: genau eine Budgetzeile, genau eine Rechnung, kein Folgejahr — direkt in
   S.daten/S.rechnungen des letzten Jahrgangs eingesetzt (das misst die
   Formulierung der Dialogfunktion selbst, ohne ein ganzes Jahr wegzuklicken). */
await seite.evaluate((j) => {
  S.daten[j] = [{ id: 'htb', art: 'block', name: 'Testkategorie', key: 'testkategorie', vz: -1,
    pos: [{ id: 'htp', key: 'testzeile', name: 'Testzeile', basis: 0, reihe: new Array(12).fill(0) }] }];
  S.rechnungen[j] = [{ id: 'htg', name: 'Test-Steller', rechnungen: [
    { id: 'htr', zweck: 'Testrechnung', datum: '', betrag: 0, reihe: new Array(12).fill(0), stand: 'Offen' }
  ] }];
  zeichne();
}, LETZT);
await gehJahr(seite, LETZT);
await klick(seite, '[data-weg-jahr="1"]');
const textLetzt = await seite.evaluate(() =>
  Array.from(document.querySelectorAll('div[data-schleier="wegJahr"] p')).map(p => p.textContent).join('\n'));
pruef('Dialogtext (letzter Jahrgang, Einzahl) gefunden', !!textLetzt, textLetzt);
if (textLetzt) {
  pruef('Einzahl: "geht 1 Budgetzeile" (nicht "gehen 1 Budgetzeilen")', textLetzt.includes('geht 1 Budgetzeile'), textLetzt);
  pruef('Einzahl: "1 Rechnung" (nicht "1 Rechnungen")',
    textLetzt.includes('1 Rechnung') && !textLetzt.includes('1 Rechnungen'), textLetzt);
  pruef('kein Folgejahr -> keine Erwaehnung von "rueckt"/"ruecken"',
    !/r(ü|ue)ckt|r(ü|ue)cken/.test(textLetzt), textLetzt);
}
await klick(seite, '[data-zu="wegJahr"]');

/* Fall: genau ein Folgejahr -> Einzahl «rückt nach». */
const grund = async (j) => seite.evaluate((jj) => {
  const zeilen = (S.daten[jj] || []).reduce((s, b) => s + (b.pos || []).length
    + (b.gruppen || []).reduce((a, g) => a + (g.pos || []).length, 0), 0);
  const rech = (S.rechnungen[jj] || []).reduce((s, g) => s + (g.rechnungen || []).length, 0);
  return { zeilen, rech, folge: S.jahre.filter(x => x > jj).sort((a, b) => a - b),
    vorher: S.jahre.filter(x => x < jj).sort((a, b) => a - b) };
}, j);

for (const j of [VORLETZT, JAHR]) {
  await gehJahr(seite, j);
  await klick(seite, '[data-weg-jahr="1"]');
  const g = await grund(j);
  const text = await seite.evaluate(() =>
    Array.from(document.querySelectorAll('div[data-schleier="wegJahr"] p')).map(p => p.textContent).join('\n'));
  const erwZeilen = g.zeilen === 1 ? 'geht 1 Budgetzeile' : 'gehen ' + g.zeilen + ' Budgetzeilen';
  const erwRech = g.rech === 1 ? '1 Rechnung' : g.rech + ' Rechnungen';
  const erwFolge = g.folge.join(' und ') + (g.folge.length === 1 ? ' rückt' : ' rücken') + ' nach';
  pruef(j + ': Budgetzeilen-Formulierung passt zur echten Anzahl (' + g.zeilen + ')', text.includes(erwZeilen), { text, erwZeilen });
  pruef(j + ': Rechnungen-Formulierung passt zur echten Anzahl (' + g.rech + ')', text.includes(erwRech), { text, erwRech });
  pruef(j + ': ' + g.folge.length + ' Folgejahr(e) -> «' + erwFolge + '»', text.includes(erwFolge), { text, erwFolge });
  pruef(j + ': der Warnsatz nennt das letzte Vorjahr (' + g.vorher[g.vorher.length - 1] + ')',
    text.includes('Führt ' + g.vorher[g.vorher.length - 1]), text);
  await klick(seite, '[data-zu="wegJahr"]');
}

/* Gegenprobe zum Warnsatz: der erste Jahrgang hat kein Vorjahr — dort darf
   kein «Führt …» stehen, sondern «aus der Position selbst». */
await gehJahr(seite, JAHRE[0]);
await klick(seite, '[data-weg-jahr="1"]');
const textErst = await seite.evaluate(() =>
  Array.from(document.querySelectorAll('div[data-schleier="wegJahr"] p')).map(p => p.textContent).join('\n'));
pruef('erster Jahrgang: kein Warnsatz ueber ein Vorjahr', !/Führt \d{4}/.test(textErst), textErst);
pruef('stattdessen: der Anfangsstand kommt aus der Position selbst',
  textErst.includes('aus der Position selbst'), textErst);
await klick(seite, '[data-zu="wegJahr"]');

console.log('  10c. Fusszeile: Ein Jahrgang / Sechs Jahrgaenge');
const fussText = () => seite.evaluate(() => {
  const el = document.querySelector('#fusszeile .rechts');
  return el ? el.textContent : null;
});
await frisch(seite);
const zahlwort = ['kein', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht',
                  'neun', 'zehn', 'elf', 'zwölf'];
const gross = w => w.charAt(0).toUpperCase() + w.slice(1);
pruef('Fusszeile nennt die Jahrgaenge im Zahlwort und in der Mehrzahl',
  (await fussText()).startsWith(gross(zahlwort[JAHRE.length]) + ' Jahrgänge'), await fussText());

/* Bis auf einen Jahrgang alles loeschen — dann muss die Fusszeile in die
   Einzahl fallen und der «−» im Kopf verschwinden. */
for (let i = 0; i < JAHRE.length - 1; i++) {
  await klick(seite, '[data-weg-jahr="1"]');
  await klick(seite, '[data-weg-jahr-an="1"]');
}
const restJahre = await seite.evaluate(() => S.jahre.slice());
gleich('es ist genau ein Jahrgang uebrig', restJahre.length, 1);
pruef('Fusszeile faellt in die Einzahl', (await fussText()).startsWith('Ein Jahrgang'), await fussText());
pruef('und der Loeschknopf ist verschwunden — den letzten Jahrgang loescht niemand',
  !(await vorhanden(seite, '[data-weg-jahr]')));

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
