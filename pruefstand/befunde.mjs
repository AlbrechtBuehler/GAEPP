/* GAEPP — Pruefstand: die vierzehn Befunde der unabhaengigen Nachkontrolle vom
   22.08.2026, dazu die zwei Punkte zum damaligen «Excel-Layout». Alle sechzehn
   waren in V 2.0.0 behoben. Dieser Lauf traegt dieselben sechzehn Fragen an den
   Neubau (V 3.0.0, Tabellenwerkzeug, Bauhaus) heran: Jede Frage bleibt, nur die
   Messpunkte sind neu. Ein Abschnitt wird rot, wenn der jeweilige Fehler
   zurueckgekommen ist.

   Was der Umbau an den Messpunkten geaendert hat — je Abschnitt vermerkt, hier
   das Grundsaetzliche:
     - «Alles zuklappen» ist kein Knopf mehr. In der App klappt die Taste z zu
       und auf, n schaltet die Nullen. Nur der HTML-Export traegt den Knopf noch.
     - Es gibt kein helles Schema mehr. Hell ist nur noch das Papier (@media
       print). Der Abschnitt 15 ist deshalb in seiner alten Form gegenstandslos
       und wird gestrichen — die Frage dahinter steht in neuer Form daneben.
     - Keine Akzentfarbe, keine Flaeche, kein Rot, kein Gruen. Rang entsteht aus
       Schriftgroesse und Gewicht; abgehakt heisst halbfett. Wo ein Befund frueher
       an einer Farbe oder an einer Klasse «gruen»/«unstimmig» gemessen wurde,
       misst er jetzt Gewicht, Titel oder die Zahl selbst.
     - Zeilenklassen heissen kat/grp/pos/sum/sumstark/saldo/zwischen/aufglied/
       stark17; die Monatsmarke sitzt als Klasse «hak» an der Zelle, nicht am
       Eingabefeld.
     - Seit dem 23.08.2026 hat der Kopf nur noch zwei Zeilen: die dritte, die
       den Blatttitel und die Legende trug, ist gestrichen. Wo dieser Lauf
       bisher am Blatttitel abgelesen hat, welcher Jahrgang und welche Ansicht
       dastehen, liest er jetzt den Ankerpunkt — den hellen Jahrgang .jg.an und
       das helle Ansichtswort .ans.an (siehe anker() weiter unten). Der Klick,
       der den Fokus aus einem Eingabefeld holt, geht nicht mehr auf den Titel,
       sondern auf die Wortmarke .wort. Die Fragen sind dieselben geblieben;
       nur die Messpunkte sind gewandert.

   Gemessen wird durchgehend die Wirkung: der gerenderte Text, das berechnete
   Gewicht, der Datenstand nach einer echten Bedienung — nicht der Quelltext.
   Jede Erwartung, die eine Zahl nennt, ist aus vorrat.mjs von Hand hergeleitet
   (die Rechnung steht je Abschnitt im Kommentar), keine stammt aus einem Lauf
   dieser App.

   Stand 23.08.2026, nach dem Wegfall der dritten Kopfzeile: 216 gruen, 0 rot.
   Das eine Rot, das dieser Lauf bis dahin trug, ist behoben und nicht etwa
   weggemessen worden: Abschnitt 14, zweite Haelfte — der Korrekturpunkt heisst
   im Neubau «korrmarke» statt «mkorr», und die Stelle in htmlSichern(), die ihm
   im Export den Doppelklick-Hinweis nimmt, war beim Umbenennen nicht
   mitgekommen. Sie ist jetzt mitgekommen; die Pruefung steht unveraendert da
   und ist von selbst gruen geworden.

   Port 8744. Fahren: node befunde.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { STICHJAHR, STICHM, JAHRE } from './vorrat.mjs';

const PORT = 8744;
const ARBEITSJAHR = STICHJAHR;                    /* der Jahrgang des Stichmonats */
const { pruef, gleich, ende } = bilanzbuch('befunde');

/* Spalte eines Jahrgangs in der Ansicht «Alle Jahre»: Name, dann je Jahrgang
   eine Spalte, zuletzt Total. */
const ALLE_SP = 1 + JAHRE.indexOf(ARBEITSJAHR);

/* ---------------------------------------------------------------- Helfer,
   dieselben Muster wie in rangordnung.mjs/bedienung.mjs/ausgabe.mjs — jede
   Datei im Pruefstand traegt ihre eigenen, gemeinsam ist nur hilfe.mjs und
   vorrat.mjs. */

/* Betraege stehen mit Apostroph als Tausendertrennung und U+2212 als Minus;
   eine leere Zelle oder ein Strich zaehlt als 0. */
function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).trim();
  if (s === '' || s === '—') return 0;
  const n = parseInt(s.replace(/'/g, '').replace(/−/g, '-'), 10);
  return isNaN(n) ? null : n;
}
/* Formatierung wie in index.html — fmt(n, immer). Hier immer mit «immer», damit
   die Erwartung nicht davon abhaengt, ob gerade Nullen gezeigt werden. */
function fmt(n) {
  const r = (n < 0 ? -1 : 1) * Math.round(Math.abs(n || 0));
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

async function dbl(seite, sel) { await seite.locator(sel).first().dblclick(); await bisRuhe(seite); }
async function klick(seite, sel) { await seite.locator(sel).first().click(); await bisRuhe(seite); }
async function rklick(seite, sel) { await seite.locator(sel).first().click({ button: 'right' }); await bisRuhe(seite); }
async function schwebe(seite, sel) { await seite.locator(sel).first().hover(); await bisRuhe(seite); }
async function tippe(seite, sel, wert) {
  const el = seite.locator(sel).first();
  await el.fill(String(wert));
  await el.dispatchEvent('change');
  await bisRuhe(seite);
}
/* Echtes Tippen mit echtem Enter — anders als tippe() (fill+change) fuer die
   Abschnitte, die die Bedienung selbst pruefen (5, 9). Ein Enter auf einem
   alleinstehenden <input> (kein <form> drumherum) loest in Chromium ein
   «change» aus, ohne das Feld zu verlassen; dass es das wirklich tut, prueft
   Abschnitt 5 als erste Aussage mit.
   Gefokussiert wird ohne Maus: ein Klick in eine Monatszelle, die den Fokus
   schon hat, setzt im Neubau den Haken — die Maus wuerde hier also nebenbei
   etwas anderes bedienen, als gemeint ist. */
async function tippeEnter(seite, sel, wert) {
  const el = seite.locator(sel).first();
  await el.focus();
  await el.press('Control+a');
  await el.pressSequentially(String(wert));
  await el.press('Enter');
  await bisRuhe(seite);
}
async function feldWert(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const feld = el.matches('input,select') ? el : el.querySelector('input,select');
    return feld ? feld.value : el.textContent.trim();
  }, sel);
}
async function text(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s);
    return el ? el.textContent.trim() : null; }, sel);
}
/* ------------------------------------------------------------ Ankerpunkt
   Woran dieser Lauf abliest, welcher Jahrgang und welche Ansicht dastehen.

   Bis zum 23.08.2026 war das der Blatttitel: eine dritte Kopfzeile sagte
   «Budget 2026» oder «Alle Jahre · Rechnungen», und die Abschnitte, die einen
   Wechsel pruefen, haben ihn gelesen. Diese Zeile ist gestrichen — ersatzlos,
   weil dieselbe Auskunft eine Zeile darueber schon steht. Der Messpunkt wandert
   deshalb dorthin, wo der Benutzer sie ohnehin liest:
     - der helle Jahrgang    .jg.an   — die Jahreszahl,
     - das helle Ansichtswort .ans.an — BUDGET / RECHNUNGEN / ALLE JAHRE.
   In «Alle Jahre» ist kein Jahrgang hell (es sind alle gemeint) und es sind
   zwei Woerter hell: «Alle Jahre» und der Zweig, auf den man schaut. Genau das
   soll Befund 16 ja pruefen — der neue Messpunkt sagt es sogar genauer als der
   alte Titel, weil er beides einzeln zeigt.

   Die Frage bleibt dieselbe, nur der Beleg ist ein anderer. Gelesen wird die
   Wirkung: der sichtbare Text samt der Versalschreibung, die aus der Gestaltung
   kommt (text-transform) — nicht der rohe Inhalt des Knopfes und nicht die
   Frage, ob eine Klasse gesetzt ist. Fehlt der helle Jahrgang, steht ein
   Strich; fehlte die ganze Kopfzeile, stuende «— · —», und das waere von
   «Alle Jahre» zu unterscheiden. Die Reihenfolge ist die des Blattes, von
   links nach rechts. */
async function anker(seite) {
  return seite.evaluate(() => {
    const sicht = (e) => {
      const t = (e.textContent || '').trim();
      const wie = getComputedStyle(e).textTransform;
      return wie === 'uppercase' ? t.toUpperCase()
           : wie === 'lowercase' ? t.toLowerCase() : t;
    };
    const jg = document.querySelector('.kopf2 .jg.an');
    const ans = [...document.querySelectorAll('.kopf2 .ans.an')].map(sicht);
    return (jg ? sicht(jg) : '—') + ' · ' + (ans.length ? ans.join(' · ') : '—');
  });
}
/* Die Gegenprobe zum Ankerpunkt: Wie viele Woerter stehen ueberhaupt da, und
   wie viele davon sind hell? Ohne sie liesse sich «genau eines ist hell» nicht
   von «es steht nur eines da» unterscheiden. */
async function ankerZahlen(seite) {
  return seite.evaluate(() => ({
    jahrgaenge: document.querySelectorAll('.kopf2 .jg').length,
    woerter:    document.querySelectorAll('.kopf2 .ans').length,
    hellJahr:   document.querySelectorAll('.kopf2 .jg.an').length,
    hellWort:   document.querySelectorAll('.kopf2 .ans.an').length
  }));
}

async function klasse(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s); return el ? el.className : null; }, sel);
}
async function titel(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s);
    return el ? el.getAttribute('title') : null; }, sel);
}
/* Die Klasse der Zelle (des <td>), in der ein Feld sitzt — dort sitzt im Neubau
   die Marke «hak». */
async function zellKlasse(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s);
    if (!el) return null; const td = el.closest('td'); return td ? td.className : null; }, sel);
}
const hak = k => /\bhak\b/.test(String(k || ''));

async function aktivesFeld(seite) {
  return seite.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const d = {};
    if (el.dataset) Object.keys(el.dataset).forEach(k => { d[k] = el.dataset[k]; });
    return { data: d, tag: el.tagName, klasse: el.className };
  });
}
async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
async function gehJahr(seite, jahr) { await klick(seite, `[data-geh-jahr="${jahr}"]`); }
async function gehAnsicht(seite, was) { await klick(seite, `[data-geh-ansicht="${was}"]`); }
async function gehAlle(seite) { await klick(seite, '[data-geh-alle="1"]'); }

/* «Alles aufklappen» ist im Neubau die Taste z — und die schaltet um. Zweimal
   gedrueckt waere alles wieder zu. Deshalb wird gemessen, ob ueberhaupt eine
   Positionszeile dasteht, und nur dann gedrueckt. Die Taste wirkt nicht,
   waehrend in einem Feld getippt wird — es braucht also einen Klick, der den
   Fokus aus dem Feld holt, ohne nebenbei etwas zu bedienen. Das war bis zum
   23.08.2026 der Blatttitel; seit die dritte Kopfzeile gestrichen ist, ist es
   die Wortmarke «GÄPP» in der ersten Kopfzeile: ein Wort ohne Knopf, ohne
   data-Merkmal und ohne Zelle darunter — der Klick nimmt den Fokus und
   schaltet nichts. */
async function allesAuf(seite) {
  for (let i = 0; i < 3; i++) {
    if (await seite.locator('#blatt tr.pos').count()) return true;
    await seite.locator('.wort').first().click();
    await seite.keyboard.press('z');
    await bisRuhe(seite);
  }
  return (await seite.locator('#blatt tr.pos').count()) > 0;
}
async function allesZu(seite) {
  for (let i = 0; i < 3; i++) {
    if (!(await seite.locator('#blatt tr.pos').count())) return true;
    await seite.locator('.wort').first().click();
    await seite.keyboard.press('z');
    await bisRuhe(seite);
  }
  return (await seite.locator('#blatt tr.pos').count()) === 0;
}

/* Zeile ueber ihren angezeigten Namen finden — nicht ueber eine mitgezaehlte
   Id. Mehr oder weniger als ein Treffer zaehlt als nicht gefunden. */
async function findeId(seite, name) {
  return seite.evaluate((naam) => {
    const treffer = Array.from(document.querySelectorAll('#blatt input.namensfeld'))
      .filter(e => e.value === naam);
    if (treffer.length !== 1) return null;
    const tr = treffer[0].closest('tr[data-id]');
    return tr ? tr.getAttribute('data-id') : null;
  }, name);
}
async function id(seite, jahr, name) {
  await gehJahr(seite, jahr);
  await allesAuf(seite);
  const x = await findeId(seite, name);
  pruef('Zeile gefunden: «' + name + '» ' + jahr, x !== null, x);
  return x;
}
async function blockId(seite, jahr, name) {
  return seite.evaluate(([jahr, name]) => {
    const b = (S.daten[jahr] || []).find(x => x.name === name);
    return b ? b.id : null;
  }, [jahr, name]);
}
async function klappeById(seite, id) {
  await seite.locator('button.klapper[data-klapp="' + id + '"]').first().click();
  await bisRuhe(seite);
}

/* -------------------------------------------------------- Korrekturdialog
   Neu: kein Schalter «plus/minus» mehr — das Vorzeichen steht im Betrag. Und
   keine Vorschau «Gerechnet / Korrektur / Ergebnis» mehr, sondern ein Fuss, der
   Basis und Rest so nennt, wie sie nach der Korrektur dastehen. Die Frage von
   Befund 2 bleibt dieselbe: Gerechnet plus Korrektur muss das Ergebnis sein —
   gemessen wird sie jetzt als Unterschied zwischen dem Fuss vor und nach dem
   Eintragen. */
async function korrOeffnenBasis(seite, pid) { await dbl(seite, `td[data-kb="${pid}"]`); }
async function korrOeffnenRest(seite, pid) { await dbl(seite, `td[data-kr="${pid}"]`); }
async function korrFuss(seite) {
  const t = await text(seite, '.korrfuss .ergebnis');
  const m = t && /Basis\s+(−?[\d']+)\s*·\s*Rest\s+(−?[\d']+)/.exec(t);
  return m ? { roh: t, basis: lies(m[1]), rest: lies(m[2]) } : { roh: t, basis: null, rest: null };
}
async function korrEintragen(seite, { pid, art, betrag, notiz }) {
  if (art === 'basis') await korrOeffnenBasis(seite, pid); else await korrOeffnenRest(seite, pid);
  const jetzt = await text(seite, '[data-korr-art="1"]');
  if ((art === 'basis' && jetzt !== 'Basis') || (art === 'rest' && jetzt !== 'Rest'))
    await klick(seite, '[data-korr-art="1"]');
  await tippe(seite, '[data-korr-betrag]', betrag);
  if (notiz) await tippe(seite, '[data-korr-notiz]', notiz);
  await klick(seite, '[data-korr-add]');
}
async function korrSchliessen(seite) { await klick(seite, '[data-zu="korr"]'); }

/* Eine Kachel des Kennzahlenbandes. Der erklaerende Satz steht im Titel der
   Kachel, nicht mehr in der Meta-Zeile — deshalb wird er mitgelesen. */
const kachel = async (seite, label) => seite.evaluate((lbl) => {
  const s = Array.from(document.querySelectorAll('.band > span'))
    .find(x => x.querySelector('.k') && x.querySelector('.k').textContent.trim() === lbl);
  if (!s) return null;
  return { v: s.querySelector('.v').textContent.trim(),
           m: s.querySelector('.m').textContent.trim(),
           t: s.getAttribute('title'),
           farbe: getComputedStyle(s.querySelector('.v')).color };
}, label);

/* Ein CSV-Feld, so wie index.html es schreibt (Semikolon getrennt, Anfuehrung
   verdoppelt bei Bedarf) — hier rueckwaerts zerlegt. */
function csvFelder(zeile) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (inQ) { if (c === '"') { if (zeile[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ';') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/* WCAG-Kontrast — eine oeffentliche Formel, unabhaengig von index.html
   nachgebaut, angewendet auf die vom Browser TATSAECHLICH berechneten Farben. */
function parseRgb(s) { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; }
function linKanal(c) { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
function luminanz([r, g, b]) { return 0.2126 * linKanal(r) + 0.7152 * linKanal(g) + 0.0722 * linKanal(b); }
function kontrast(rgb1, rgb2) {
  const l1 = luminanz(rgb1), l2 = luminanz(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* Sucht bunte Toene und meldet zugleich, wie viele Knoten und Farbwerte sie
   angesehen hat — sonst liesse sich «nichts gefunden» nicht von «nichts
   gesucht» unterscheiden. Ein Ton gilt als bunt, wenn seine Kanaele um mehr als
   10 auseinanderliegen; die ganze Palette des Entwurfs liegt darunter. */
const farbstich = (ziel) => ziel.evaluate(() => {
  const felder = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'outlineColor'];
  const treffer = []; let knoten = 0, werte = 0;
  document.querySelectorAll('*').forEach(e => {
    const c = getComputedStyle(e); knoten++;
    felder.forEach(p => {
      const v = c[p];
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(v || '');
      if (!m) return;
      if (m[4] !== undefined && +m[4] === 0) return;
      if (p.indexOf('border') === 0) {
        const s = p.replace('Color', '');
        if (parseFloat(c[s + 'Width']) === 0 || c[s + 'Style'] === 'none') return;
      }
      if (p === 'outlineColor' && (c.outlineStyle === 'none' || parseFloat(c.outlineWidth) === 0)) return;
      werte++;
      const r = +m[1], g = +m[2], bl = +m[3];
      if (Math.max(r, g, bl) - Math.min(r, g, bl) > 10)
        treffer.push(e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ')[0] + ' ' + p + ' ' + v);
    });
  });
  return { treffer, knoten, werte };
});

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, kontext, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   Befund 1 + 2 — Rest und Basis unter Null werden NICHT gekappt, und das
   Korrekturfenster rechnet auch dort auf: Gerechnet + Korrektur = Ergebnis.
   ====================================================================
   Von Hand aus vorrat.mjs hergeleitet. «Darlehen Blumberg» (Gruppe Schulden
   Privat) beginnt 2024 mit 18000 bei 150 im Monat:
     2024: 18000 − 1800 = 16200 -> Basis 2025
     2025: 16200 − 1800 = 14400 -> Basis 2026
     2026: 14400 − 1800 = 12600 -> Basis 2027
   Eine Reduktion von 13000 auf den Rest 2026 ist groesser als der Rest:
     Rest 2026 = 12600 − 13000 = −400, und DIESELBE Zahl ist Basis 2027.
   Gegenprobe in der Ansicht «Alle Jahre», Zeile «Restschuld am 31.12.»,
   Spalte 2026. Die Reste der fuenf Schulden 2026:
     Steueramt Nord  12000 − 6000 = 6000
     Steueramt Sued  (2025 auf null gelaufen)  0
     Blumberg        12600 − 13000 = −400
     Kreditkasse Tremont 6720 − 1440 = 5280
     Velohaus Kern   360 − 720, klemmt bei 0
   zusammen 10880. Wuerde die Reduktion still auf 0 gekappt, stuenden dort
   11280 — die beiden Zahlen sind gerade deshalb verschieden gewaehlt. */
console.log('\n1+2. Rest und Basis unter Null werden nicht gekappt; das Korrekturfenster rechnet auf');
await frisch(seite);

const pidDarlehen26 = await id(seite, ARBEITSJAHR, 'Darlehen Blumberg');
if (pidDarlehen26) {
  const restVor = await text(seite, `td[data-kr="${pidDarlehen26}"]`);
  gleich('Darlehen 2026, Rest vor der Korrektur', lies(restVor), 12600);

  /* Befund 2 — das Fenster geht auf und nennt den gerechneten Stand. */
  await korrOeffnenRest(seite, pidDarlehen26);
  const offenDa = await seite.locator('[data-schleier="korr"]').count();
  pruef('Doppelklick auf «Jahr / Rest» oeffnet das Korrekturfenster', offenDa === 1, offenDa);
  const vorher = await korrFuss(seite);
  pruef('das Fenster nennt Basis und Rest', vorher.basis !== null && vorher.rest !== null, vorher.roh);
  gleich('Gerechnet: Rest vor der Korrektur', vorher.rest, 12600);
  gleich('Gerechnet: Basis vor der Korrektur', vorher.basis, 14400);

  await tippe(seite, '[data-korr-betrag]', '-13000');
  await tippe(seite, '[data-korr-notiz]', 'Testkorrektur ueber den Rest hinaus');
  await klick(seite, '[data-korr-add]');

  const nachher = await korrFuss(seite);
  gleich('Ergebnis: Rest nach der Korrektur, ungekappt', nachher.rest, -400);
  gleich('Gerechnet + Korrektur = Ergebnis, auch unter Null',
    vorher.rest + (-13000), nachher.rest);
  gleich('die Korrektur am Rest laesst die Basis unberuehrt', nachher.basis, 14400);
  const zeileBetrag = await feldWert(seite, '.korrliste .korrzeile:not(.leer) input.betrag');
  gleich('die eingetragene Zeile traegt den Betrag mit Vorzeichen', zeileBetrag, fmt(-13000));
  const zeileWirkt = await text(seite, '.korrliste .korrzeile:not(.leer) .wirkt');
  gleich('und sie steht als Restkorrektur da', zeileWirkt, 'Rest');
  await korrSchliessen(seite);

  /* Befund 1 — Rest 2026 und Basis 2027 zeigen dieselbe negative Zahl. */
  const restNach = await text(seite, `td[data-kr="${pidDarlehen26}"]`);
  gleich('Darlehen 2026, Rest NICHT auf 0 gekappt', lies(restNach), -400);
  /* Die Klasse «unstimmig» und die Warnfarbe gibt es nicht mehr — Farbe traegt
     im Neubau keine Bedeutung. Den Befund traegt jetzt der Titel der Zelle. */
  const restTitel = await titel(seite, `td[data-kr="${pidDarlehen26}"]`);
  pruef('der Rest unter Null nennt den Befund in seinem Titel',
    /unter null/i.test(String(restTitel)), restTitel);
  const pidNord26 = await findeId(seite, 'Steueramt Nord');
  pruef('Gegenprobe-Zeile «Steueramt Nord» gefunden', !!pidNord26, pidNord26);
  if (pidNord26) {
    const nordTitel = await titel(seite, `td[data-kr="${pidNord26}"]`);
    pruef('Gegenprobe: ein Rest ueber Null nennt den Befund NICHT',
      !/unter null/i.test(String(nordTitel)), nordTitel);
  }

  const pidDarlehen27 = await id(seite, ARBEITSJAHR + 1, 'Darlehen Blumberg');
  if (pidDarlehen27) {
    const basis27 = await text(seite, `td[data-kb="${pidDarlehen27}"]`);
    gleich('Basis 2027 zeigt DIESELBE negative Zahl (Vererbung, keine zweite Rechnung)',
      lies(basis27), -400);
    const basisKlasse = await klasse(seite, `td[data-kb="${pidDarlehen27}"]`);
    pruef('Basis 2027 steht als geerbte Basis da', /\bgeerbt\b/.test(String(basisKlasse)), basisKlasse);
    const hatFeld27 = await seite.evaluate((pid) =>
      !!document.querySelector(`td[data-kb="${pid}"] input`), pidDarlehen27);
    pruef('Basis 2027 bleibt gesperrt (geerbt, nicht neu getippt)', !hatFeld27);
  }

  /* Befund 1, Gegenprobe in der Ansicht «Alle Jahre». */
  await gehAlle(seite);
  const alleZeile = await seite.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#blatt tbody tr'))
      .find(t => { const td = t.querySelector('td.c-name');
        return td && td.textContent.trim() === 'Restschuld am 31.12.'; });
    return tr ? Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()) : null;
  });
  pruef('Zeile «Restschuld am 31.12.» in der Ansicht «Alle Jahre» gefunden', alleZeile !== null, alleZeile);
  if (alleZeile) {
    gleich('Spalte 2026 zeigt die ungekappte Summe (6000 + 0 − 400 + 5280 + 0)',
      lies(alleZeile[ALLE_SP]), 10880);
    pruef('und eben NICHT die Summe, die eine stille Kappung ergaebe',
      lies(alleZeile[ALLE_SP]) !== 11280, alleZeile[ALLE_SP]);
  }
}

/* ====================================================================
   Befund 3 — Das Kennzahlenband meldet den unstimmigen Plan, statt eine
   gekappte Zahl zu zeigen.
   ====================================================================
   Frueher brauchte es dafuer den Stichmonat Dezember, weil nur dort eine
   Restkorrektur in «Restschuld heute» zaehlt. Im Neubau geht es ohne Eingriff
   in den Zustand: eine Korrektur an der BASIS des laufenden Jahrgangs zaehlt in
   jedem Stichmonat mit. Der Stichmonat bleibt also, wie er in der Datei steht.

   Von Hand hergeleitet. Stand am Stichmonat (August 2026, acht Raten bezahlt):
     Steueramt Nord  12000 − 8×500 = 8000
     Steueramt Sued  0 (2025 durch)
     Blumberg        14400 − 8×150 = 13200
     Tremont          6720 − 8×120 = 5760
     Velohaus Kern     360 − 8×60, klemmt bei 0
   zusammen 26960. Eine Basiskorrektur von −40000 auf Blumberg 2026 ergibt dort
   14400 − 40000 = −25600; eine Rate darf einen Befund nicht wegrechnen, also
   bleibt der Stand −25600. Neue Summe: 8000 + 0 − 25600 + 5760 + 0 = −11840.
   Anfangsstand aller Schulden (jede in ihrem ersten Jahrgang, 2024):
     24000 + 7200 + 18000 + 9600 + 1800 = 60600.
   Getilgt = 60600 − (−11840) = 72440, Quote = 120 Prozent — mehr als hundert,
   also muss das Band auch das benennen. */
console.log('\n3. Das Kennzahlenband meldet den unstimmigen Plan');
await frisch(seite);
const pidDarlehenB = await id(seite, ARBEITSJAHR, 'Darlehen Blumberg');
if (pidDarlehenB) {
  /* Ausgangsstand — die Gegenprobe zu allem, was danach kommt. */
  const restVorher = await kachel(seite, 'Restschuld heute');
  pruef('Kachel «Restschuld heute» gefunden', restVorher !== null, restVorher);
  if (restVorher) {
    gleich('Ausgangsstand: 8000 + 0 + 13200 + 5760 + 0', lies(restVorher.v), 26960);
    pruef('Ausgangsstand: der Titel nennt kein Unterschreiten',
      !/unter null/i.test(String(restVorher.t)), restVorher.t);
  }

  await korrEintragen(seite, { pid: pidDarlehenB, art: 'basis',
    betrag: '-40000', notiz: 'Testkorrektur Band' });
  await korrSchliessen(seite);

  const restheute = await kachel(seite, 'Restschuld heute');
  pruef('Kachel «Restschuld heute» weiterhin da', restheute !== null, restheute);
  if (restheute) {
    gleich('Restschuld heute = 8000 + 0 − 25600 + 5760 + 0, ungekappt', lies(restheute.v), -11840);
    gleich('der Titel nennt den Befund',
      restheute.t, 'Unter null — eine Korrektur nimmt mehr weg, als da ist.');
    gleich('die Meta-Zeile bleibt der Stichmonat und wird nicht zur Fehlermeldung',
      restheute.m, 'Aug ' + ARBEITSJAHR);
  }
  const frei = await kachel(seite, 'Schuldenfrei');
  pruef('Kachel «Schuldenfrei» gefunden', frei !== null, frei);
  if (frei) {
    gleich('Schuldenfrei nennt kein Datum mehr', frei.v, '—');
    gleich('sondern sagt, dass der Plan nicht aufgeht', frei.m, 'der Plan geht nicht auf');
    gleich('und was zu tun ist', frei.t, 'Erst die Korrekturen richtigstellen.');
  }
  /* Neu hinzugekommen: dieselbe Frage an die dritte Kachel. Wer «Restschuld
     heute» unter null zeigt, muss auch eine Tilgungsquote ueber hundert Prozent
     als Befund benennen — sonst steht dort eine Zahl, die niemand nachrechnen
     kann. */
  const getilgt = await kachel(seite, 'Getilgt bisher');
  pruef('Kachel «Getilgt bisher» gefunden', getilgt !== null, getilgt);
  if (getilgt) {
    gleich('Getilgt = 60600 − (−11840)', lies(getilgt.v), 72440);
    gleich('Quote 120 Prozent', getilgt.m, '120 %');
    gleich('und der Titel sagt, dass das nicht aufgeht',
      getilgt.t, 'Die Zahlen gehen nicht auf — 120 % von ' + fmt(60600));
  }
  /* Die Warnfarbe ist gestrichen — der Neubau kennt kein Rot. Gemessen wird
     deshalb, dass die auffaellige Kachel dieselbe Schriftfarbe traegt wie eine
     unauffaellige: der Befund steht im Wort, nicht in der Farbe. */
  const offenK = await kachel(seite, 'Offen im August');
  pruef('Kachel «Offen im August» gefunden (Gegenprobe zur Farbe)', offenK !== null, offenK);
  if (offenK && restheute)
    gleich('die Zahl unter null traegt dieselbe Farbe wie jede andere Kachel',
      restheute.farbe, offenK.farbe);
}

/* ====================================================================
   Befund 4 — «Schuldenfrei» rechnet mit Korrekturen am Anfangssaldo KUENFTIGER
   Jahrgaenge, nicht nur am laufenden.
   ====================================================================
   Der Vorrat endet 2029, und 2028/2029 fuehren keine Raten mehr. Zwei Schulden
   laufen deshalb ins Leere: der Plan geht ueberhaupt nicht auf, und die Kachel
   sagt genau das. Damit die Frage dieses Befunds ueberhaupt eine Antwort haben
   kann, werden die Raten von Blumberg und Tremont zuerst ueber «Uebertragen —
   auch in die Folgejahre» fortgeschrieben; danach wiederholt die Rechnung die
   Raten des letzten Jahrgangs.

   Von Hand hergeleitet, Stand am Stichmonat August 2026 (siehe Abschnitt 3):
     Nord      8000, Rate 500 -> 16 Monate -> Dezember 2027
     Blumberg 13200, Rate 150 -> 88 Monate -> Dezember 2033
     Tremont   5760, Rate 120 -> 48 Monate -> August 2030
     Sued und Kern stehen auf null und laufen nicht mehr.
   Die spaeteste Zahl zaehlt: Dezember 2033, in 88 Monaten.

   Mit +2000 auf die BASIS 2027 des Darlehens (der massgebenden Schuld):
     Sep bis Dez 2026 vier Raten -> 13200 − 600 = 12600, beim Eintritt in 2027
     plus 2000 = 14600, davon 150 im Monat -> 98 weitere Monate.
     Zusammen 4 + 98 = 102 Monate ab August 2026 -> Februar 2035.
   Gegenprobe: nach dem Entfernen der Korrektur steht wieder derselbe Wert da
   wie zu Beginn — nicht neu hergeleitet, sondern verglichen. */
console.log('\n4. «Schuldenfrei» rechnet mit Korrekturen am Anfangssaldo kuenftiger Jahrgaenge');
await frisch(seite);
await allesAuf(seite);

const freiRoh = await kachel(seite, 'Schuldenfrei');
pruef('Kachel «Schuldenfrei» gefunden (Rohzustand)', freiRoh !== null, freiRoh);
if (freiRoh) {
  gleich('Rohzustand: ohne Raten in 2028/2029 geht der Plan nicht auf', freiRoh.v, '—');
  gleich('und die Kachel sagt es mit den richtigen Worten', freiRoh.m, 'nicht nach diesem Plan');
}

const pidBlum26 = await findeId(seite, 'Darlehen Blumberg');
const pidTrem26 = await findeId(seite, 'Kreditkasse Tremont');
pruef('Zeilen «Darlehen Blumberg» und «Kreditkasse Tremont» 2026 gefunden',
  !!pidBlum26 && !!pidTrem26, { pidBlum26, pidTrem26 });
if (pidBlum26 && pidTrem26) {
  for (const pid of [pidBlum26, pidTrem26]) {
    await dbl(seite, `input.zelle[data-z="${pid}"][data-m="0"]`);
    const da = await seite.locator('[data-schleier="ueb"]').count();
    pruef('Fenster «Uebertragen» geht auf', da === 1, da);
    await klick(seite, '[data-ueb-folge="1"]');
    await klick(seite, '[data-ueb-an="1"]');
    await allesAuf(seite);
  }
  const raten29 = await seite.evaluate((j) => {
    const blk = (S.daten[j] || []).find(x => x.art === 'schulden');
    const out = {};
    (blk.gruppen || []).forEach(g => (g.pos || []).forEach(p => { out[p.key] = p.reihe.slice(); }));
    return out;
  }, JAHRE[JAHRE.length - 1]);
  pruef('die Raten stehen jetzt auch im letzten Jahrgang',
    raten29.blumberg && raten29.blumberg[11] === 150 && raten29.tremont && raten29.tremont[11] === 120,
    raten29);
  pruef('Gegenprobe: die uebrigen Schulden wurden dabei NICHT angefasst',
    raten29.steueramt_nord && raten29.steueramt_nord.every(x => x === 0), raten29.steueramt_nord);

  const freiVorher = await kachel(seite, 'Schuldenfrei');
  pruef('Kachel «Schuldenfrei» gefunden (Ausgangsstand)', freiVorher !== null, freiVorher);
  if (freiVorher) {
    gleich('Ausgangsdatum: Dezember 2033 (von Hand hergeleitet)', freiVorher.v, 'Dez 2033');
    gleich('Ausgangsmeta: in 88 Monaten', freiVorher.m, 'in 88 Monaten');
  }

  const pidBlum27 = await id(seite, ARBEITSJAHR + 1, 'Darlehen Blumberg');
  if (pidBlum27) {
    await korrEintragen(seite, { pid: pidBlum27, art: 'basis', betrag: '2000',
      notiz: 'Testkorrektur Schuldenfrei' });
    await korrSchliessen(seite);
    await gehJahr(seite, ARBEITSJAHR);

    const freiNachher = await kachel(seite, 'Schuldenfrei');
    pruef('Kachel «Schuldenfrei» gefunden (nach der Korrektur)', freiNachher !== null, freiNachher);
    if (freiNachher) {
      gleich('+2000 auf die Basis 2027 verschiebt die Kachel auf Februar 2035', freiNachher.v, 'Feb 2035');
      gleich('Meta: in 102 Monaten', freiNachher.m, 'in 102 Monaten');
    }

    /* Gegenprobe: Korrektur entfernen -> wieder das urspruengliche Datum. */
    await gehJahr(seite, ARBEITSJAHR + 1);
    await allesAuf(seite);
    await korrOeffnenBasis(seite, pidBlum27);
    await klick(seite, '.korrliste .korrzeile:not(.leer) button.weg');
    await korrSchliessen(seite);
    await gehJahr(seite, ARBEITSJAHR);
    const freiZurueck = await kachel(seite, 'Schuldenfrei');
    pruef('Gegenprobe: ohne Korrektur steht wieder das urspruengliche Datum da',
      freiZurueck && freiVorher && freiZurueck.v === freiVorher.v && freiZurueck.m === freiVorher.m,
      freiZurueck);
  }
}

/* ====================================================================
   Befund 5 — Kein Rappen bleibt im Bild stehen: 1234.7 + Enter ergibt 1235,
   und alles darueber rechnet mit derselben ganzen Zahl weiter.
   ====================================================================
   «Lohn» 2026 traegt in jedem Monat 5320. Nach der Eingabe:
     Januar 1235, Jahressumme 1235 + 11×5320 = 59755.
     Sektionskopf «Einkommen» im Januar: 1235 + 0 (Lohn 13.er) + 0 (Zulagen). */
console.log('\n5. Kein Rappen bleibt im Bild stehen');
await frisch(seite);
const einkommenId = await blockId(seite, ARBEITSJAHR, 'Einkommen');
pruef('Sektion «Einkommen» gefunden', !!einkommenId, einkommenId);
if (einkommenId) {
  await klappeById(seite, einkommenId);
  const pidLohn = await findeId(seite, 'Lohn');
  pruef('Zeile «Lohn» gefunden', !!pidLohn, pidLohn);
  if (pidLohn) {
    const sel = `input.zelle[data-z="${pidLohn}"][data-m="0"]`;
    const vorher = await feldWert(seite, sel);
    gleich('Ausgangswert Januar', vorher, fmt(5320));
    await tippeEnter(seite, sel, '1234.7');
    const wertNach = await feldWert(seite, sel);
    pruef('Enter allein uebernimmt den Wert — ohne die Zelle zu verlassen',
      wertNach !== '1234.7', wertNach);
    gleich('die Zelle zeigt 1235 (halbe Einheit aufwaerts, ganze Franken)', wertNach, fmt(1235));

    const modell = await seite.evaluate((pid) => {
      let treffer = null;
      Object.keys(S.daten).forEach(j => (S.daten[j] || []).forEach(b => (b.pos || []).forEach(p => {
        if (p.id === pid) treffer = p.reihe[0]; })));
      return treffer;
    }, pidLohn);
    gleich('der Datenstand traegt die ganze Zahl, keine Rappen', modell, 1235);

    const jahrWert = await text(seite, `tr[data-id="${pidLohn}"] td.c-jahr`);
    gleich('die Jahresspalte der Zeile rechnet mit derselben Zahl (1235 + 11 mal 5320)',
      lies(jahrWert), 59755);

    const kopfSel = `tr.kat[data-k="${einkommenId}"] td:nth-child(3)`; /* Name, Basis, dann Januar */
    gleich('der Sektionskopf «Einkommen» zeigt dieselbe Zahl mitgerechnet',
      lies(await text(seite, kopfSel)), 1235);
  }
}

/* ====================================================================
   Befund 6 — «Alle Jahre» gliedert vollstaendig auf, auch eine Kategorie, die
   in keiner festen Liste steht. «Sparziele» liegt im Vorrat als leere Sektion;
   hier bekommt sie ueber die Oberflaeche eine echte Zeile.
   Kategorien + Gruppen + Rechnungen muessen «Ausgaben» GENAU treffen.
   ==================================================================== */
console.log('\n6. «Alle Jahre» gliedert vollstaendig auf, auch eine neu gefuellte Kategorie');
await frisch(seite);
const sparzieleId = await blockId(seite, ARBEITSJAHR, 'Sparziele');
pruef('Sektion «Sparziele» gefunden (im Vorrat leer)', !!sparzieleId, sparzieleId);
if (sparzieleId) {
  await schwebe(seite, `tr.kat[data-k="${sparzieleId}"]`);
  await klick(seite, `[data-neu-pos="${sparzieleId}"]`);
  const neuPid = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []).find(x => x.name === 'Sparziele');
    const p = (b.pos || [])[b.pos.length - 1];
    return p ? p.id : null;
  }, ARBEITSJAHR);
  pruef('eine neue Zeile in «Sparziele» wurde angelegt', !!neuPid, neuPid);
  if (neuPid) {
    await tippe(seite, `input.zelle[data-z="${neuPid}"][data-m="0"]`, '250');

    const namenListe = await seite.evaluate(() => {
      const js = S.jahre.slice().sort((a, b) => a - b);
      const kategorien = [], gruppen = [];
      js.forEach(j => (S.daten[j] || []).forEach(bl => {
        if (bl.art === 'schulden') (bl.gruppen || []).forEach(g => {
          if (gruppen.indexOf(g.name) < 0) gruppen.push(g.name); });
        else if (bl.vz !== 1 && kategorien.indexOf(bl.name) < 0) kategorien.push(bl.name);
      }));
      return { kategorien, gruppen };
    });
    pruef('«Sparziele» steht unter den Kategorien (nicht in einer festen Liste vergessen)',
      namenListe.kategorien.indexOf('Sparziele') >= 0, namenListe.kategorien);
    pruef('die Probenliste ist nicht leer — sonst prueft die Summe unten nichts',
      namenListe.kategorien.length > 1 && namenListe.gruppen.length > 0, namenListe);

    await gehAlle(seite);
    const bild = await seite.evaluate(() =>
      Array.from(document.querySelectorAll('#blatt table tbody tr'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
    const zeileVon = (name) => bild.find(z => z[0] === name);

    const sparzieleZeile = zeileVon('Sparziele');
    pruef('Zeile «Sparziele» steht in der Ansicht «Alle Jahre»', !!sparzieleZeile, sparzieleZeile);
    if (sparzieleZeile)
      gleich('Sparziele 2026 zeigt die eingetragenen 250', lies(sparzieleZeile[ALLE_SP]), 250);

    let summeKategorien = 0, summeGruppen = 0, fehltEineZeile = [];
    namenListe.kategorien.forEach(n => { const z = zeileVon(n);
      if (!z) fehltEineZeile.push(n); else summeKategorien += lies(z[ALLE_SP]); });
    namenListe.gruppen.forEach(n => { const z = zeileVon(n);
      if (!z) fehltEineZeile.push(n); else summeGruppen += lies(z[ALLE_SP]); });
    pruef('jede Kategorie und jede Gruppe steht als eigene Zeile da',
      fehltEineZeile.length === 0, fehltEineZeile);

    const rechnungenZeile = zeileVon('Rechnungen');
    const ausgabenZeile = zeileVon('Ausgaben');
    const ratenZeile = zeileVon('Raten zusammen');
    pruef('Zeilen «Rechnungen», «Ausgaben» und «Raten zusammen» gefunden',
      !!rechnungenZeile && !!ausgabenZeile && !!ratenZeile,
      { rechnungenZeile, ausgabenZeile, ratenZeile });
    if (rechnungenZeile && ausgabenZeile)
      gleich('Kategorien + Gruppen + Rechnungen treffen «Ausgaben» genau (inkl. Sparziele)',
        summeKategorien + summeGruppen + lies(rechnungenZeile[ALLE_SP]), lies(ausgabenZeile[ALLE_SP]));
    if (ratenZeile)
      gleich('Gegenprobe: «Raten zusammen» ist genau die Summe der Gruppen — nichts doppelt gezaehlt',
        lies(ratenZeile[ALLE_SP]), summeGruppen);
  }
}

/* ====================================================================
   Befund 7 — «Rechnungen» heisst nicht zweimal Verschiedenes: «auf Monate
   verteilt» in «Alle Jahre · Rechnungen» muss GENAU die Zeile «Rechnungen» in
   «Alle Jahre» (Budget) sein — auch wenn eine Rechnung nicht vollstaendig
   verteilt ist.
   ====================================================================
   Von Hand aus vorrat.mjs, Jahrgang 2026:
     Rechnungsbetraege 180 + 940 + 365 + 1240 + 95 = 2820, alle vollstaendig
     verteilt. Eine neue Rechnung mit Betrag 500, davon nur 300 im Januar:
     Betraege zusammen 3320, verteilt 3120. */
console.log('\n7. «Rechnungen» heisst nicht zweimal Verschiedenes');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
const stellerNordmann = await seite.evaluate((j) => {
  const g = (S.rechnungen[j] || []).find(x => x.name === 'nordmann'); return g ? g.id : null; }, ARBEITSJAHR);
pruef('Rechnungssteller «nordmann» gefunden', !!stellerNordmann, stellerNordmann);
if (stellerNordmann) {
  await schwebe(seite, `tr.kat[data-k="${stellerNordmann}"]`);
  await klick(seite, `[data-neu-rech="${stellerNordmann}"]`);
  const neueRechId = await seite.evaluate(([j, gid]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === gid);
    const r = g && (g.rechnungen || []).find(x => x.zweck === 'Neue Rechnung');
    return r ? r.id : null;
  }, [ARBEITSJAHR, stellerNordmann]);
  pruef('frische, unvollstaendig verteilte Rechnung angelegt', !!neueRechId, neueRechId);
  if (neueRechId) {
    await tippe(seite, `input.zelle[data-r="${neueRechId}"][data-f="betrag"]`, '500');
    await tippe(seite, `input.zelle[data-rm="${neueRechId}"][data-m="0"]`, '300');

    await gehAlle(seite);
    await gehAnsicht(seite, 'rechnung');
    const bildRech = await seite.evaluate(() =>
      Array.from(document.querySelectorAll('#blatt table tbody tr'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
    const zusammen = bildRech.find(z => z[0] === 'Rechnungsbeträge zusammen');
    const verteiltZeile = bildRech.find(z => z[0] === 'auf Monate verteilt');
    pruef('Zeilen «Rechnungsbeträge zusammen» und «auf Monate verteilt» gefunden',
      !!zusammen && !!verteiltZeile, { zusammen, verteiltZeile });

    await gehAnsicht(seite, 'budget');
    const bildBudget = await seite.evaluate(() =>
      Array.from(document.querySelectorAll('#blatt table tbody tr'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
    const rechnungenBudget = bildBudget.find(z => z[0] === 'Rechnungen');
    pruef('Zeile «Rechnungen» in «Alle Jahre» (Budget) gefunden', !!rechnungenBudget, rechnungenBudget);

    if (zusammen) gleich('«Rechnungsbeträge zusammen» 2026 = 2820 + 500', lies(zusammen[ALLE_SP]), 3320);
    if (verteiltZeile) gleich('«auf Monate verteilt» 2026 = 2820 + 300', lies(verteiltZeile[ALLE_SP]), 3120);
    if (verteiltZeile && zusammen)
      pruef('die beiden Zahlen sind verschieden — die Rechnung ist ja nicht vollstaendig verteilt',
        lies(zusammen[ALLE_SP]) !== lies(verteiltZeile[ALLE_SP]));
    if (verteiltZeile && rechnungenBudget)
      gleich('«auf Monate verteilt» ist GENAU die Zeile «Rechnungen» im Budget',
        lies(verteiltZeile[ALLE_SP]), lies(rechnungenBudget[ALLE_SP]));
  }
}

/* ====================================================================
   Befund 8 — Rechtsklick nimmt zurueck, auch wenn der Stand «Bezahlt» ist
   (dann steht kein einziger Haken): der angeklickte Monat verliert seine
   Marke, die anderen behalten sie, der Stand faellt auf «Offen».
   ====================================================================
   «Behandlung» (Oechsli Zahnpraxis) traegt August und September je 470. Damit
   drei Monate zu vergleichen sind, bekommt der Juli hier 300 dazu — die
   Rechnung muss dafuer nicht aufgehen.
   Die Marke heisst im Neubau «hak» und sitzt an der Zelle, nicht am Feld. */
console.log('\n8. Rechtsklick nimmt zurueck, auch wenn der Stand «Bezahlt» ist');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
const rBehandlung = await seite.evaluate((j) => {
  let out = null;
  (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(r => {
    if (r.zweck === 'Behandlung') out = { id: r.id, gid: g.id }; }));
  return out;
}, ARBEITSJAHR);
pruef('Rechnung «Behandlung» gefunden', !!rBehandlung, rBehandlung);
if (rBehandlung) {
  await klappeById(seite, rBehandlung.gid);
  await tippe(seite, `input.zelle[data-rm="${rBehandlung.id}"][data-m="6"]`, '300');

  await seite.locator(`select.standwahl[data-r="${rBehandlung.id}"][data-f="stand"]`)
    .first().selectOption({ label: 'Bezahlt' });
  await bisRuhe(seite);

  const hakenVorher = await seite.evaluate((rid) =>
    Object.keys(S.haken).filter(k => k.indexOf(rid + ':') === 0).length, rBehandlung.id);
  gleich('Stand ueber die Auswahl auf «Bezahlt» gesetzt — kein einziger Haken', hakenVorher, 0);

  const mSel = (m) => `input.zelle[data-rm="${rBehandlung.id}"][data-m="${m}"]`;
  const markiert = async (m) => hak(await zellKlasse(seite, mSel(m)));
  pruef('Juli steht ueber den Stand als abgehakt da', await markiert(6));
  pruef('August steht ueber den Stand als abgehakt da', await markiert(7));
  pruef('September steht ueber den Stand als abgehakt da', await markiert(8));
  pruef('Gegenprobe: ein Monat ohne Betrag traegt keine Marke', !(await markiert(0)));

  await rklick(seite, mSel(6));   /* Rechtsklick auf Juli */

  pruef('Juli verliert seine Marke nach dem Rechtsklick', !(await markiert(6)));
  pruef('August behaelt seine Marke', await markiert(7));
  pruef('September behaelt seine Marke', await markiert(8));
  const standNach = await feldWert(seite, `select.standwahl[data-r="${rBehandlung.id}"][data-f="stand"]`);
  gleich('der Stand faellt auf «Offen»', standNach, 'Offen');
  const hakenNachher = await seite.evaluate((rid) => ({
    jul: !!S.haken[rid + ':6'], aug: !!S.haken[rid + ':7'], sep: !!S.haken[rid + ':8']
  }), rBehandlung.id);
  pruef('im Datenstand: Juli ohne Haken, August und September mit einem echten Haken',
    !hakenNachher.jul && hakenNachher.aug && hakenNachher.sep, hakenNachher);
}

/* ====================================================================
   Befund 9 — Der Fokus ueberlebt das Neuzeichnen, das auf eine Eingabe folgt.
   ====================================================================
   Frueher wechselte die Zelle dabei ihre eigene Klasse («zelle» -> «zelle
   gruen»), und das Wiederfinden nach dem Neuzeichnen verglich die ganze Klasse
   — der Fokus fiel auf body. Im Neubau sitzt die Marke am <td>, das Feld
   behaelt seine Klasse. Die Frage bleibt dieselbe und wird weiter gefahren:
   Wechselt das Aussehen der Zelle durch die eigene Eingabe, muss der Fokus in
   derselben Zelle stehen bleiben. Damit die Pruefung nichts Leeres misst, wird
   zusaetzlich belegt, dass das Aussehen wirklich gewechselt hat.

   Eine leere Zelle laesst sich nicht abhaken (das waere eine unsichtbare
   Marke) — deshalb beginnt der Versuch mit einer Zelle, die einen Wert traegt. */
console.log('\n9. Der Fokus ueberlebt das Neuzeichnen nach der eigenen Eingabe');

console.log('  9a. Budget-Tafel');
await frisch(seite);
const einkommenId9 = await blockId(seite, ARBEITSJAHR, 'Einkommen');
if (einkommenId9) {
  await klappeById(seite, einkommenId9);
  const pidLohn9 = await findeId(seite, 'Lohn');
  const pidZulagen = await findeId(seite, 'Zulagen');
  pruef('Zeilen «Lohn» (mit Wert) und «Zulagen» (Januar leer) gefunden',
    !!pidLohn9 && !!pidZulagen, { pidLohn9, pidZulagen });
  if (pidLohn9 && pidZulagen) {
    const selLeer = `input.zelle[data-z="${pidZulagen}"][data-m="0"]`;
    gleich('Gegenprobe-Zelle ist wirklich leer', await feldWert(seite, selLeer), '');
    await rklick(seite, selLeer);
    const leerHaken = await seite.evaluate((pid) => !!S.haken[pid + ':0'], pidZulagen);
    pruef('Rechtsklick auf eine leere Zelle setzt keine unsichtbare Marke', !leerHaken, leerHaken);
    pruef('und die leere Zelle bleibt ohne Marke', !hak(await zellKlasse(seite, selLeer)));

    /* September: der Vorrat setzt seine Marken nur bis Juli — diese Zelle traegt
       also einen Wert und noch keine Marke. Beides wird zuerst gemessen, sonst
       naehme der Rechtsklick unten eine Marke weg, statt eine zu setzen. */
    const selB = `input.zelle[data-z="${pidLohn9}"][data-m="8"]`;
    pruef('die Versuchszelle traegt einen Wert', lies(await feldWert(seite, selB)) > 0,
      await feldWert(seite, selB));
    pruef('und noch keine Marke', !hak(await zellKlasse(seite, selB)),
      await zellKlasse(seite, selB));
    await rklick(seite, selB);
    pruef('abgehakte Zelle mit Wert traegt die Marke «hak»', hak(await zellKlasse(seite, selB)),
      await zellKlasse(seite, selB));

    /* Marke da -> Marke weg: der Wert wird 0, damit faellt auch die Marke, und
       das Aussehen der Zelle wechselt. */
    await tippeEnter(seite, selB, '0');
    const akt = await aktivesFeld(seite);
    pruef('Fokus liegt nach dem Neuzeichnen auf derselben Zelle',
      akt && akt.data.z === pidLohn9 && akt.data.m === '8', akt);
    pruef('Fokus liegt NICHT auf body', akt && akt.tag !== 'BODY', akt);
    pruef('das Aussehen der Zelle hat wirklich gewechselt — die Marke ist weg',
      !hak(await zellKlasse(seite, selB)), await zellKlasse(seite, selB));
    const hakenWeg = await seite.evaluate((pid) => !!S.haken[pid + ':8'], pidLohn9);
    pruef('mit dem Betrag faellt auch die Marke im Datenstand', !hakenWeg, hakenWeg);

    /* und zurueck: ein neuer Betrag steht wieder ohne Marke da. */
    await tippeEnter(seite, selB, '300');
    const akt2 = await aktivesFeld(seite);
    pruef('Fokus liegt auch beim naechsten Neuzeichnen auf derselben Zelle',
      akt2 && akt2.data.z === pidLohn9 && akt2.data.m === '8', akt2);
    gleich('der neue Betrag steht da', await feldWert(seite, selB), fmt(300));
    pruef('die Marke kommt nicht von selbst zurueck', !hak(await zellKlasse(seite, selB)));
  }
}

console.log('  9b. Rechnungen-Tafel');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
const rMoebel = await seite.evaluate((j) => {
  let out = null;
  (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(r => {
    if (r.zweck === 'Möbel') out = { id: r.id, gid: g.id }; }));
  return out;
}, ARBEITSJAHR);
pruef('Rechnung «Möbel» gefunden', !!rMoebel, rMoebel);
if (rMoebel) {
  await klappeById(seite, rMoebel.gid);
  const selRleer = `input.zelle[data-rm="${rMoebel.id}"][data-m="0"]`;
  gleich('Gegenprobe-Zelle ist wirklich leer', await feldWert(seite, selRleer), '');
  await rklick(seite, selRleer);
  const leerHakenR = await seite.evaluate((rid) => !!S.haken[rid + ':0'], rMoebel.id);
  pruef('Rechnungen: Rechtsklick auf eine leere Zelle setzt keine unsichtbare Marke',
    !leerHakenR, leerHakenR);

  const selR = `input.zelle[data-rm="${rMoebel.id}"][data-m="8"]`;   /* September, 620 */
  await rklick(seite, selR);
  pruef('Rechnungen: abgehakte Zelle mit Wert traegt die Marke «hak»',
    hak(await zellKlasse(seite, selR)), await zellKlasse(seite, selR));

  await tippeEnter(seite, selR, '0');
  const aktR = await aktivesFeld(seite);
  pruef('Rechnungen-Tafel: Fokus liegt nach dem Neuzeichnen auf derselben Zelle',
    aktR && aktR.data.rm === rMoebel.id && aktR.data.m === '8', aktR);
  pruef('Rechnungen-Tafel: Fokus liegt NICHT auf body', aktR && aktR.tag !== 'BODY', aktR);
  pruef('Rechnungen-Tafel: das Aussehen der Zelle hat wirklich gewechselt',
    !hak(await zellKlasse(seite, selR)), await zellKlasse(seite, selR));
}

/* ====================================================================
   Befund 10 — Der Zaehler sagt, was er zaehlt: «Verbindlichkeiten» traegt den
   Titel «Gruppen in dieser Sektion», eine gewoehnliche Kategorie «Zeilen in
   dieser Sektion», ein Rechnungssteller «Rechnungen dieses Stellers» — und die
   Zahl stimmt jeweils.
   ==================================================================== */
console.log('\n10. Der Zaehler sagt, was er zaehlt');
await frisch(seite);
await allesZu(seite);

const verbId = await blockId(seite, ARBEITSJAHR, 'Verbindlichkeiten');
const fixId10 = await blockId(seite, ARBEITSJAHR, 'Fixkosten');
pruef('Sektionen «Verbindlichkeiten» und «Fixkosten» gefunden', !!verbId && !!fixId10, { verbId, fixId10 });
if (verbId && fixId10) {
  const zahlen = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []);
    const v = b.find(x => x.name === 'Verbindlichkeiten'), f = b.find(x => x.name === 'Fixkosten');
    return { gruppen: (v.gruppen || []).length, zeilen: (f.pos || []).length };
  }, ARBEITSJAHR);

  const zaehler = (id) => seite.evaluate((k) => {
    const tr = document.querySelector('tr.kat[data-k="' + k + '"]');
    const sp = tr ? tr.querySelector('.anzahl') : null;
    return sp ? { titel: sp.getAttribute('title'), text: sp.textContent.trim() } : null;
  }, id);

  const verbSpan = await zaehler(verbId);
  pruef('Zaehler bei «Verbindlichkeiten» gefunden', verbSpan !== null, verbSpan);
  if (verbSpan) {
    gleich('Titel bei «Verbindlichkeiten»', verbSpan.titel, 'Gruppen in dieser Sektion');
    gleich('Zahl bei «Verbindlichkeiten» = Anzahl Gruppen', verbSpan.text, String(zahlen.gruppen));
  }
  const fixSpan = await zaehler(fixId10);
  pruef('Zaehler bei «Fixkosten» gefunden', fixSpan !== null, fixSpan);
  if (fixSpan) {
    gleich('Titel bei «Fixkosten» (gewoehnliche Kategorie)', fixSpan.titel, 'Zeilen in dieser Sektion');
    gleich('Zahl bei «Fixkosten» = Anzahl Zeilen', fixSpan.text, String(zahlen.zeilen));
  }
  /* Neu hinzugekommen: dieselbe Frage in der Rechnungstafel — dort zaehlt der
     Zaehler wieder etwas Drittes und muss es auch sagen. */
  await gehAnsicht(seite, 'rechnung');
  await allesZu(seite);
  const oechsli = await seite.evaluate((j) => {
    const g = (S.rechnungen[j] || []).find(x => x.name === 'Öchsli Zahnpraxis');
    return g ? { id: g.id, n: (g.rechnungen || []).length } : null; }, ARBEITSJAHR);
  pruef('Rechnungssteller «Öchsli Zahnpraxis» gefunden', !!oechsli, oechsli);
  if (oechsli) {
    const stSpan = await zaehler(oechsli.id);
    pruef('Zaehler beim Rechnungssteller gefunden', stSpan !== null, stSpan);
    if (stSpan) {
      gleich('Titel beim Rechnungssteller', stSpan.titel, 'Rechnungen dieses Stellers');
      gleich('Zahl beim Rechnungssteller = Anzahl Rechnungen', stSpan.text, String(oechsli.n));
    }
    /* Gegenprobe: der Zaehler steht nur, solange die Sektion zu ist — sonst
       zaehlte er, was ohnehin dasteht. */
    await klappeById(seite, oechsli.id);
    const nachAuf = await zaehler(oechsli.id);
    pruef('Gegenprobe: aufgeklappt verschwindet der Zaehler', nachAuf === null, nachAuf);
  }
}

/* ====================================================================
   Befund 11 — Das CSV traegt die Monatshaken der Rechnungen: eine Spalte
   «Erledigt», die genau die abgehakten Monate nennt, und eine Zeile «Total»
   mit dem Saldo ueber alle Rechnungen. gib() wird abgefangen.
   ====================================================================
   Neu: die Monate heissen im CSV 01 bis 12 (wie im Blatt), nicht mehr Jan bis
   Dez; und das CSV kommt je Jahrgang als eigene Datei.
   Saldo von Hand: alle Rechnungen des Vorrats sind vollstaendig verteilt
   (Saldo 0). Die hier angelegte Rechnung traegt 500 und verteilt 300 — Saldo
   ueber alle Rechnungen also 200. */
console.log('\n11. Das CSV traegt die Monatshaken der Rechnungen');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
const r11 = await seite.evaluate((j) => {
  let beh = null, nord = null;
  (S.rechnungen[j] || []).forEach(g => {
    if (g.name === 'nordmann') nord = g.id;
    (g.rechnungen || []).forEach(r => { if (r.zweck === 'Behandlung') beh = { id: r.id, gid: g.id }; });
  });
  return { beh, nord };
}, ARBEITSJAHR);
pruef('«Behandlung» und Steller «nordmann» gefunden', !!r11.beh && !!r11.nord, r11);
if (r11.beh && r11.nord) {
  await klappeById(seite, r11.beh.gid);
  await rklick(seite, `input.zelle[data-rm="${r11.beh.id}"][data-m="7"]`);   /* August */
  await rklick(seite, `input.zelle[data-rm="${r11.beh.id}"][data-m="8"]`);   /* September */
  const gesetzt = await seite.evaluate((rid) =>
    Object.keys(S.haken).filter(k => k.indexOf(rid + ':') === 0).sort(), r11.beh.id);
  pruef('zwei echte Monatshaken gesetzt', gesetzt.length === 2, gesetzt);

  /* Eine unvollstaendig verteilte Rechnung, damit der Saldo nicht trivial 0 ist. */
  await schwebe(seite, `tr.kat[data-k="${r11.nord}"]`);
  await klick(seite, `[data-neu-rech="${r11.nord}"]`);
  const neuRechId11 = await seite.evaluate(([j, gid]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === gid);
    const r = g && (g.rechnungen || []).find(x => x.zweck === 'Neue Rechnung');
    return r ? r.id : null;
  }, [ARBEITSJAHR, r11.nord]);
  if (neuRechId11) {
    await tippe(seite, `input.zelle[data-r="${neuRechId11}"][data-f="betrag"]`, '500');
    await tippe(seite, `input.zelle[data-rm="${neuRechId11}"][data-m="0"]`, '300');
  }

  await seite.evaluate(() => { window.__aus = [];
    window.gib = (name, text, typ) => { window.__aus.push({ name, text, typ }); }; });
  await klick(seite, '[data-exp="1"]');
  await klick(seite, '[data-exp-csv="1"]');
  const aus11 = await seite.evaluate(() => window.__aus);
  pruef('genau eine CSV-Datei fuer den gezeigten Jahrgang (gib() abgefangen)',
    aus11.length === 1, aus11.map(a => a.name));
  if (aus11.length) {
    gleich('sie heisst nach dem Jahrgang', aus11[0].name, 'GAEPP-' + ARBEITSJAHR + '.csv');
    const roh = aus11[0].text.replace(/^﻿/, '');
    const zeilen = roh.split('\r\n').map(csvFelder);

    /* Der Budgetteil traegt seine eigene Erledigt-Spalte — Gegenprobe dazu,
       dass die Spalte nicht nur bei den Rechnungen auftaucht. */
    const budgetKopf = zeilen.find(f => f[0] === 'Ebene' && f[1] === 'Position');
    pruef('Budget-Kopfzeile im CSV gefunden', !!budgetKopf, budgetKopf);
    if (budgetKopf)
      pruef('auch der Budgetteil fuehrt eine Spalte «Erledigt»',
        budgetKopf.indexOf('Erledigt') > 0, budgetKopf);

    const startIdx = zeilen.findIndex(f => f[0] === 'Rechnungen ' + ARBEITSJAHR);
    pruef('Abschnitt «Rechnungen ' + ARBEITSJAHR + '» im CSV gefunden', startIdx >= 0, startIdx);
    if (startIdx >= 0) {
      const header = zeilen[startIdx + 1];
      gleich('Kopfzeile traegt «Erledigt» als letzte Spalte', header[header.length - 1], 'Erledigt');
      gleich('Kopfzeile vollstaendig, Monate als Zahl',
        header.join('|'),
        ['Ebene', 'Rechnungssteller / Zweck', 'Datum', 'Betrag']
          .concat(['01','02','03','04','05','06','07','08','09','10','11','12'])
          .concat(['Saldo', 'Stand', 'Erledigt']).join('|'));
      const erledigtIdx = header.indexOf('Erledigt'), saldoIdx = header.indexOf('Saldo');

      const rest = zeilen.slice(startIdx + 2);
      const totalIdx = rest.findIndex(f => f[0] === 'Total');
      const bisTotal = rest.slice(0, totalIdx >= 0 ? totalIdx : rest.length);
      const behandlung = bisTotal.find(f => f[0] === 'Rechnung' && f[1] === 'Behandlung');
      pruef('Zeile «Behandlung» im CSV gefunden', !!behandlung, behandlung);
      if (behandlung) gleich('«Erledigt» nennt genau die zwei abgehakten Monate, in Kalenderreihenfolge',
        behandlung[erledigtIdx], '08 09');
      /* Gegenprobe: eine Rechnung, die als «Bezahlt» gemeldet, aber nirgends
         abgehakt ist, traegt keine Monate — die Spalte zeigt Haken und nicht
         den Stand. */
      const kontrolle = bisTotal.find(f => f[0] === 'Rechnung' && f[1] === 'Kontrolle');
      pruef('Zeile «Kontrolle» im CSV gefunden', !!kontrolle, kontrolle);
      if (kontrolle) {
        gleich('«Kontrolle» ist als bezahlt gemeldet', kontrolle[header.indexOf('Stand')], 'Bezahlt');
        gleich('traegt aber keinen Monat in «Erledigt» — die Spalte zeigt Haken, nicht den Stand',
          kontrolle[erledigtIdx], '');
      }

      pruef('Zeile «Total» im CSV gefunden', totalIdx >= 0, totalIdx);
      if (totalIdx >= 0)
        gleich('«Total» traegt den Saldo ueber alle Rechnungen (500 minus 300)',
          +rest[totalIdx][saldoIdx], 200);
    }
  }
}

/* ====================================================================
   Befund 12 — Der Text im Fenster «Neuer Jahrgang» stimmt in beiden Faellen:
   mit und ohne Haken «Raten fortschreiben».
   ==================================================================== */
console.log('\n12. Text im Fenster «Neuer Jahrgang» — mit und ohne «Raten fortschreiben»');
await frisch(seite);
const letztesJahr = await seite.evaluate(() => Math.max.apply(null, S.jahre));
gleich('letzter Jahrgang aus dem Vorrat', letztesJahr, JAHRE[JAHRE.length - 1]);
await klick(seite, 'button[data-neu-jahr="1"]');
const textOhne = await text(seite, 'div[data-schleier="neu"] p');
pruef('Dialogtext gefunden (ohne «Raten fortschreiben», Ausgangsstand)', textOhne !== null, textOhne);
if (textOhne) {
  pruef('nennt «Restschuld am 31.12.' + letztesJahr + '» als gerechneten Anfangsstand',
    textOhne.includes('Restschuld am 31.12.' + letztesJahr) && textOhne.includes('das ist gerechnet, keine Wahl'),
    textOhne);
  pruef('ohne Haken: «Schulden, die dort auf null stehen, kommen nicht mit.»',
    textOhne.includes('Schulden, die dort auf null stehen, kommen nicht mit.'), textOhne);
  pruef('ohne Haken: keine Erwaehnung des Fortschreibens', !textOhne.includes('fortgeschrieben'), textOhne);
}
await klick(seite, '[data-neu-raten="1"]');
const textMit = await text(seite, 'div[data-schleier="neu"] p');
pruef('Dialogtext gefunden (mit «Raten fortschreiben»)', textMit !== null, textMit);
if (textMit) {
  pruef('nennt weiterhin «Restschuld am 31.12.' + letztesJahr + '» — derselbe erste Satz',
    textMit.includes('Restschuld am 31.12.' + letztesJahr) && textMit.includes('das ist gerechnet, keine Wahl'),
    textMit);
  pruef('mit Haken: «Weil die Raten fortgeschrieben werden, kommen auch Schulden mit, die auf null stehen.»',
    textMit.includes('Weil die Raten fortgeschrieben werden, kommen auch Schulden mit, die auf null stehen.'),
    textMit);
  pruef('mit Haken: nicht mehr «kommen nicht mit»', !textMit.includes('kommen nicht mit'), textMit);
}
/* Gegenprobe: Haken zurueck -> wieder der urspruengliche Text. */
await klick(seite, '[data-neu-raten="1"]');
gleich('Gegenprobe: Haken zurueck ergibt denselben Text wie am Anfang',
  await text(seite, 'div[data-schleier="neu"] p'), textOhne);

/* ====================================================================
   Befund 13 — zahl() liest Schweizer und deutsche Schreibweisen richtig.
   ==================================================================== */
console.log('\n13. zahl() liest die Schreibweisen richtig');
await frisch(seite);
const einkommenId13 = await blockId(seite, ARBEITSJAHR, 'Einkommen');
if (einkommenId13) {
  await klappeById(seite, einkommenId13);
  const pidLohn13 = await findeId(seite, 'Lohn');
  pruef('Zeile «Lohn» gefunden', !!pidLohn13, pidLohn13);
  if (pidLohn13) {
    const sel = `input.zelle[data-z="${pidLohn13}"][data-m="1"]`;   /* Februar */
    const proben = [
      { text: "1'234",     erwartet: 1234 },     /* Apostroph als Tausendertrenner */
      { text: '1.234,50',  erwartet: 1235 },     /* Komma trennt Dezimale, Punkt Tausender */
      { text: '12.50',     erwartet: 13 },       /* kein Komma da: der Punkt ist der Dezimalpunkt */
      { text: '1.234.567', erwartet: 1234567 },  /* zwei Punkte koennen nur Tausender sein */
      { text: '2.5',       erwartet: 3 },        /* halbe Einheit aufwaerts */
      { text: '−500',      erwartet: -500 },     /* echtes Minuszeichen U+2212 */
      { text: '-1 000',    erwartet: -1000 }     /* Leerzeichen als Tausendertrenner */
    ];
    for (const p of proben) {
      await tippe(seite, sel, p.text);
      gleich('zahl("' + p.text + '") ergibt ' + p.erwartet, await feldWert(seite, sel), fmt(p.erwartet));
    }
    /* Gegenprobe: was keine Zahl ist, wird 0 — und mit dem Betrag faellt die
       Marke, sonst wirkte sie spaeter unsichtbar weiter. */
    await tippe(seite, sel, 'kein Betrag');
    gleich('Gegenprobe: was keine Zahl ist, wird 0 und steht leer da',
      await feldWert(seite, sel), '');
    const markeWeg = await seite.evaluate((pid) => !!S.haken[pid + ':1'], pidLohn13);
    pruef('und die Marke des Monats faellt mit', !markeWeg, markeWeg);
  }
}

/* ====================================================================
   Befund 14 — HTML-Export: der Name des Rechnungsstellers bleibt im Rang, den
   er im Werkzeug hat; und der Korrekturpunkt traegt keinen Hinweis mehr auf
   einen Doppelklick — im eingefrorenen Blatt tut ein Doppelklick nichts.
   ====================================================================
   Neu: der Korrekturpunkt heisst nicht mehr «mkorr», sondern «korrmarke» und
   traegt das Wort «korrigiert». Und der Rang steht nicht mehr in einem
   Inline-Stil, sondern in Groesse und Gewicht — gemessen wird deshalb nicht
   der Auszeichnungstext, sondern was der Browser am Element berechnet: der
   Export wird dafuer wirklich geladen. */
console.log('\n14. HTML-Export: Rang des Stellers und Korrekturpunkt ohne Doppelklick-Hinweis');
await frisch(seite);
const pidKredit14 = await id(seite, ARBEITSJAHR, 'Kreditkasse Tremont');
if (pidKredit14) {
  await korrEintragen(seite, { pid: pidKredit14, art: 'basis', betrag: '100',
    notiz: 'Testkorrektur Export' });
  await korrSchliessen(seite);
}
const markeApp = await seite.evaluate(() => {
  const el = document.querySelector('.korrmarke');
  return el ? { text: el.textContent.trim(), titel: el.getAttribute('title') } : null; });
pruef('im Werkzeug steht ein Korrekturpunkt', markeApp !== null, markeApp);
const stellerApp = await seite.evaluate(() => {
  const el = Array.from(document.querySelectorAll('tr.kat .namensfeld'))
    .find(e => e.value === 'Öchsli Zahnpraxis');
  if (!el) return null;
  const c = getComputedStyle(el);
  return { gewicht: c.fontWeight, groesse: c.fontSize };
});
await gehAnsicht(seite, 'rechnung');
const stellerImWerkzeug = await seite.evaluate(() => {
  const el = Array.from(document.querySelectorAll('tr.kat .namensfeld'))
    .find(e => e.value === 'Öchsli Zahnpraxis');
  if (!el) return null;
  const c = getComputedStyle(el);
  return { gewicht: c.fontWeight, groesse: c.fontSize };
});
pruef('der Name des Rechnungsstellers steht im Werkzeug', stellerImWerkzeug !== null, stellerImWerkzeug);
await gehAnsicht(seite, 'budget');

await seite.evaluate(() => { window.__aus = [];
  window.gib = (name, text, typ) => { window.__aus.push({ name, text, typ }); }; });
await klick(seite, '[data-exp="1"]');
await klick(seite, '[data-exp-html="1"]');
const aus14 = await seite.evaluate(() => window.__aus);
pruef('HTML-Export wurde erzeugt', aus14.length === 1, aus14.map(a => a.name));
let expSeite = null;
if (aus14.length) {
  expSeite = await kontext.newPage();
  await expSeite.setContent(aus14[0].text);
  await expSeite.evaluate(() => document.fonts.ready);

  const gemessen = await expSeite.evaluate(() => {
    const kat = Array.from(document.querySelectorAll('tr.kat .namensfeld'))
      .find(e => e.textContent.trim() === 'Öchsli Zahnpraxis');
    const pos = Array.from(document.querySelectorAll('tr.pos .namensfeld'))
      .find(e => e.textContent.trim() === 'Behandlung');
    const marken = Array.from(document.querySelectorAll('.korrmarke'))
      .map(e => ({ text: e.textContent.trim(), titel: e.getAttribute('title') }));
    const st = e => { const c = getComputedStyle(e); return { gewicht: c.fontWeight, groesse: c.fontSize }; };
    return { kat: kat ? st(kat) : null, pos: pos ? st(pos) : null, marken };
  });
  pruef('Name des Rechnungsstellers «Öchsli Zahnpraxis» im Export gefunden',
    gemessen.kat !== null, gemessen);
  if (gemessen.kat && stellerImWerkzeug) {
    gleich('sein Gewicht ist im Export dasselbe wie im Werkzeug',
      gemessen.kat.gewicht, stellerImWerkzeug.gewicht);
    gleich('seine Groesse ebenso', gemessen.kat.groesse, stellerImWerkzeug.groesse);
    pruef('und er steht wirklich halbfett oder staerker da — sonst pruefte der Vergleich nichts',
      parseInt(gemessen.kat.gewicht, 10) >= 500, gemessen.kat);
  }
  if (gemessen.kat && gemessen.pos)
    pruef('Gegenprobe: die Rechnung darunter bleibt leichter als ihr Steller',
      parseInt(gemessen.pos.gewicht, 10) < parseInt(gemessen.kat.gewicht, 10), gemessen);

  pruef('ein Korrekturpunkt steht im Export', gemessen.marken.length > 0, gemessen.marken);
  if (gemessen.marken.length) {
    gleich('er traegt weiterhin sein Wort', gemessen.marken[0].text, 'korrigiert');
    pruef('kein Korrekturpunkt im Export nennt noch «Doppelklick» — im eingefrorenen '
      + 'Blatt tut ein Doppelklick nichts',
      gemessen.marken.every(m => !/Doppelklick/.test(String(m.titel || ''))),
      gemessen.marken.map(m => m.titel));
  }
  /* Gegenprobe zum selben Griff: die Titel an Basis und Rest, die im Werkzeug
     ebenfalls einen Doppelklick versprechen, sind im Export bereits entfernt.
     Der Punkt ist also nicht vergessen worden, weil niemand daran dachte —
     sondern uebersehen worden, als er umbenannt wurde. */
  const restTitelExport = await expSeite.evaluate(() =>
    Array.from(document.querySelectorAll('td.c-jahr[title]')).map(e => e.getAttribute('title')));
  pruef('Gegenprobe: an den Rest-Zellen steht im Export kein Doppelklick-Versprechen mehr',
    restTitelExport.every(t => !/Doppelklick/.test(String(t))), restTitelExport);
}

/* ====================================================================
   Befund 15 — GESTRICHEN in seiner alten Form.
   ====================================================================
   Der alte Punkt hiess «Excel-Layout, helles Schema»: Datenzeilen auf dem
   Zeilengrund, Kopf-, Gruppen- und Summenzeilen als dunkler Balken mit heller
   Schrift, weisse Gitterlinien, dazu der Kontrast Balken gegen Balkenschrift.
   Gemessen wurde an den Rollen --zeile, --balken, --balken2, --aufbalken und
   --gitter und an der Startvorgabe data-theme="hell".

   Nichts davon gibt es im Neubau noch: Das helle Schema ist gestrichen — hell
   ist nur noch das Papier. Die genannten Farbrollen existieren nicht mehr, und
   Flaechen als Rangmittel sind ausdruecklich aufgegeben; Rang entsteht aus
   Groesse und Gewicht. Eine Pruefung auf einen dunklen Balken mit heller
   Schrift wuerde deshalb nicht einen Fehler finden, sondern den Entwurf
   bestreiten.

   Die Frage dahinter bleibt und wird hier in ihrer neuen Gestalt gefahren:
   Traegt das Blatt ausserhalb des Werkzeugs — im HTML-Export und auf dem
   Papier — dieselbe Ordnung wie im Werkzeug, und ist es dort lesbar? */
console.log('\n15. Das Blatt ausserhalb des Werkzeugs (Ersatz fuer das gestrichene helle Schema)');
console.log('  15a. HTML-Export');
if (expSeite) {
  const bau15 = await expSeite.evaluate(() => {
    const st = s => { const e = document.querySelector(s); if (!e) return null;
      const c = getComputedStyle(e);
      return { gewicht: +c.fontWeight, groesse: parseFloat(c.fontSize), flaeche: c.backgroundColor }; };
    return {
      sichten: Array.from(document.querySelectorAll('[data-view]')).map(v => v.id),
      kopf: (document.querySelector('.expkopf') || {}).textContent,
      fuss: (document.querySelector('.expfuss') || {}).textContent,
      knopf: !!document.querySelector('[data-alle-um]'),
      grund: getComputedStyle(document.body).backgroundColor,
      /* Eine abgehakte Monatszelle steht halbfett — das ist der Haken und nicht
         der Rang. Gemessen wird deshalb an Zellen ohne Marke. */
      kat: st('tr.kat td.c-mon:not(.hak)'), grp: st('tr.grp td.c-mon:not(.hak)'),
      pos: st('tr.pos td.c-mon:not(.hak)'),
      hakZelle: st('tr.pos td.c-mon.hak'),
      /* Die Namensspalte klebt am linken Rand; sie traegt den Grund des Blattes,
         damit nichts durchscheint. Das ist kein Balken — gemessen wird deshalb,
         dass sie genau den Grund traegt und keine eigene Flaeche. */
      name: st('tr.kat td.c-name'),
      zellen: document.querySelectorAll('#blatt input, [data-view] input').length
    };
  });
  pruef('der Export traegt fuer jede Ansicht ein eigenes Blatt',
    bau15.sichten.length >= 2, bau15.sichten);
  pruef('er traegt denselben Kopf wie das Papier — Wortmarke, Titel, Stichmonat',
    /GÄPP/.test(String(bau15.kopf)) && /Stichmonat 08 · 2026/.test(String(bau15.kopf)), bau15.kopf);
  pruef('und denselben Fuss', /Beträge in CHF, ohne Rappen/.test(String(bau15.fuss)), bau15.fuss);
  pruef('«Alles zuklappen» lebt im Export als Knopf weiter — im Werkzeug ist es die Taste z',
    bau15.knopf === true, bau15.knopf);
  pruef('kein einziges Eingabefeld ist mitgekommen — das Blatt ist eingefroren',
    bau15.zellen === 0, bau15.zellen);
  pruef('Rang aus Groesse: Kategorie groesser als Gruppe, Gruppe groesser als Position',
    bau15.kat && bau15.grp && bau15.pos
    && bau15.kat.groesse > bau15.grp.groesse && bau15.grp.groesse > bau15.pos.groesse,
    [bau15.kat, bau15.grp, bau15.pos]);
  pruef('Rang aus Gewicht: dieselbe Reihenfolge',
    bau15.kat && bau15.grp && bau15.pos
    && bau15.kat.gewicht > bau15.grp.gewicht && bau15.grp.gewicht > bau15.pos.gewicht,
    [bau15.kat, bau15.grp, bau15.pos].map(x => x && x.gewicht));
  pruef('und die Marke reist mit: eine abgehakte Zelle steht auch im Export halbfett',
    bau15.hakZelle && bau15.hakZelle.gewicht === 500
    && bau15.hakZelle.gewicht > bau15.pos.gewicht, bau15.hakZelle);
  const durchsichtig = f => /rgba\(0, 0, 0, 0\)/.test(String(f));
  pruef('keine Zeile traegt eine Flaeche — der Rang steht nicht im Balken',
    bau15.kat && bau15.grp && bau15.pos && durchsichtig(bau15.kat.flaeche)
    && durchsichtig(bau15.grp.flaeche) && durchsichtig(bau15.pos.flaeche),
    [bau15.kat, bau15.grp, bau15.pos].map(x => x && x.flaeche));
  pruef('auch die klebende Namensspalte traegt nur den Grund des Blattes, keinen Balken',
    bau15.name && bau15.name.flaeche === bau15.grund, [bau15.name, bau15.grund]);

  const bunt = await farbstich(expSeite);
  pruef('der Export hat ueberhaupt Farbwerte zu pruefen (' + bunt.knoten + ' Knoten, '
    + bunt.werte + ' Werte)', bunt.knoten > 50 && bunt.werte > 50, bunt);
  pruef('und kein einziger davon ist bunt — kein Akzent, kein Rot, kein Gruen',
    bunt.treffer.length === 0, bunt.treffer.slice(0, 5));
}

console.log('  15b. Papier');
await frisch(seite);
await allesAuf(seite);
await seite.emulateMedia({ media: 'print' });
await bisRuhe(seite);
const papier = await seite.evaluate(() => {
  const zeig = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : null; };
  const pos = document.querySelector('#blatt tr.pos td');
  return {
    band: zeig('.band'),
    /* Die Kopfzeilen werden gezaehlt statt einzeln benannt. Bis zum 23.08.2026
       waren es drei (.kopf1, .kopf2, .kopf3); die dritte ist gestrichen. Wer
       hier .kopf3 einzeln abfragt, bekommt seither null zurueck und liest das
       als «wird gedruckt» — die Pruefung waere rot geworden, ohne dass an der
       App etwas falsch waere. Gefragt ist ohnehin: wird von den Kopfzeilen, die
       es gibt, eine gedruckt? Also werden genau die genommen, die dastehen. */
    kopfZeilen: [...document.querySelectorAll('#leiste > div')]
      .map(e => ({ k: e.className, zeig: getComputedStyle(e).display })),
    fuss: zeig('.fusszeile'),
    druckkopf: zeig('.druckkopf'), druckfuss: zeig('.druckfuss'),
    druckkopfText: (document.getElementById('druckkopf') || {}).textContent,
    grund: getComputedStyle(document.body).backgroundColor,
    tinte: pos ? getComputedStyle(pos).color : null,
    klappzeichen: zeig('.chev')
  };
});
pruef('auf Papier verschwindet das Fenster: Kopfzeilen, Kennzahlenband und Fusszeile',
  papier.band === 'none' && papier.fuss === 'none'
  && papier.kopfZeilen.length > 0 && papier.kopfZeilen.every(z => z.zeig === 'none'),
  papier);
pruef('Gegenprobe: es gab ueberhaupt Kopfzeilen zu pruefen',
  papier.kopfZeilen.length >= 2, papier.kopfZeilen.map(z => z.k).join(' | '));
pruef('dafuer stehen Druckkopf und Druckfuss da',
  papier.druckkopf === 'flex' && papier.druckfuss === 'flex', papier);
pruef('der Druckkopf nennt Wortmarke, Blatt und Stichmonat',
  /GÄPP/.test(String(papier.druckkopfText)) && /Stichmonat 08 · 2026/.test(String(papier.druckkopfText)),
  papier.druckkopfText);
pruef('die Bedienhilfe «Klappzeichen» wird nicht gedruckt',
  papier.klappzeichen === 'none', papier.klappzeichen);

/* Das helle Schema ist nicht verschwunden, sondern auf das Papier gewandert.
   Also wird dort gemessen, was frueher am hellen Schema gemessen wurde: heller
   Grund, dunkle Schrift, und ein Kontrast, der nach der WCAG-Formel traegt. */
const grundP = parseRgb(papier.grund), tinteP = parseRgb(papier.tinte);
pruef('Papier ist hell und Schrift ist dunkel — gemessen, nicht abgelesen',
  grundP && tinteP && luminanz(grundP) > 0.8 && luminanz(tinteP) < 0.1, papier);
if (grundP && tinteP) {
  const k = kontrast(grundP, tinteP);
  pruef('Kontrast Papier gegen Schrift traegt (WCAG-Formel, mindestens 4.5 zu 1), gemessen: '
    + k.toFixed(2), k >= 4.5, k);
}
const buntP = await farbstich(seite);
pruef('auch auf Papier gibt es Farbwerte zu pruefen (' + buntP.knoten + ' Knoten, '
  + buntP.werte + ' Werte)', buntP.knoten > 50 && buntP.werte > 50, buntP);
pruef('und keiner davon ist bunt', buntP.treffer.length === 0, buntP.treffer.slice(0, 5));

/* Der Zaehler steht nur an einer zugeklappten Sektion. Zugeklappt wird am
   Bildschirm — auf Papier steht die Wortmarke des Fensters nicht, ueber die der
   Fokus aus einem Eingabefeld herauskommt. Auf Papier bedient niemand: auch der
   Zaehler gehoert nicht aufs Blatt. */
await seite.emulateMedia({ media: 'screen' });
await allesZu(seite);
await seite.emulateMedia({ media: 'print' });
await bisRuhe(seite);
const papierZu = await seite.evaluate(() => {
  const e = document.querySelector('.anzahl');
  return { da: !!e, zeig: e ? getComputedStyle(e).display : null };
});
pruef('an einer zugeklappten Sektion steht ueberhaupt ein Zaehler', papierZu.da === true, papierZu);
pruef('die Bedienhilfe «Zaehler» wird nicht gedruckt', papierZu.zeig === 'none', papierZu);

await seite.emulateMedia({ media: 'screen' });
await allesAuf(seite);
await bisRuhe(seite);
const schirm = await seite.evaluate(() => {
  const pos = document.querySelector('#blatt tr.pos td');
  return { band: getComputedStyle(document.querySelector('.band')).display,
    kopfZeilen: [...document.querySelectorAll('#leiste > div')]
      .map(e => ({ k: e.className, zeig: getComputedStyle(e).display })),
    grund: getComputedStyle(document.body).backgroundColor,
    tinte: pos ? getComputedStyle(pos).color : null };
});
pruef('Gegenprobe: am Bildschirm steht das Band wieder da', schirm.band !== 'none', schirm);
pruef('Gegenprobe: am Bildschirm stehen auch die Kopfzeilen wieder da — sonst haette'
  + ' die Papierprobe oben nur gemessen, dass es sie gar nicht gibt',
  schirm.kopfZeilen.length > 0 && schirm.kopfZeilen.every(z => z.zeig !== 'none'),
  schirm.kopfZeilen);
const grundS = parseRgb(schirm.grund), tinteS = parseRgb(schirm.tinte);
pruef('Gegenprobe: am Bildschirm ist es umgekehrt — dunkler Grund, helle Schrift',
  grundS && tinteS && luminanz(grundS) < 0.1 && luminanz(tinteS) > 0.5, schirm);

/* ====================================================================
   Befund 16 — Der Wechsel «Alle Jahre» und Jahrgang behaelt, worauf man schaut:
   aus den Rechnungen nach «Alle Jahre» landet man in der Jahresuebersicht der
   Rechnungen und ueber einen Jahresknopf zurueck wieder in den Rechnungen.
   ====================================================================
   Die Tafelecke traegt keinen Text mehr (die Spaltenkoepfe sind leer), und seit
   dem 23.08.2026 gibt es auch den Blatttitel nicht mehr, an dem dieser Abschnitt
   bis dahin gemessen hat. Gemessen wird jetzt am Ankerpunkt: am hellen Jahrgang
   und am hellen Ansichtswort (siehe anker() oben). Die Frage ist dieselbe
   geblieben — «wechselt der Jahrgang wirklich, und behaelt ‹Alle Jahre›, worauf
   man schaut?» —, nur der Beleg steht eine Zeile hoeher.

   Jede Aussage wird zweimal belegt: einmal an dem, was dasteht (Ankerpunkt),
   und einmal an dem, was die App sich merkt (S.ansicht, S.jahr, S.alleWas).
   Beides muss dasselbe sagen; ginge nur eines von beidem, waere nicht zu
   unterscheiden, ob die App falsch schaltet oder nur falsch anzeigt. */
console.log('\n16. Der Wechsel «Alle Jahre» und Jahrgang behaelt, worauf man schaut');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
gleich('Ausgangsstand: Ansicht Rechnungen', await anker(seite), ARBEITSJAHR + ' · RECHNUNGEN');
const z16a = await ankerZahlen(seite);
/* Gegenprobe: der Ankerpunkt liest aus einer Liste. Steht dort ueberhaupt
   etwas, und ist wirklich nur je eines hell? */
pruef('im Kopf stehen alle Jahrgaenge und die drei Ansichtswoerter (Gegenprobe)',
  z16a.jahrgaenge === JAHRE.length && z16a.woerter === 3, z16a);
pruef('in einem Jahrgang ist genau ein Jahrgang und genau ein Wort hell',
  z16a.hellJahr === 1 && z16a.hellWort === 1, z16a);

await gehAlle(seite);
gleich('«Alle Jahre» von den Rechnungen aus landet in der Jahresuebersicht der Rechnungen',
  await anker(seite), '— · RECHNUNGEN · ALLE JAHRE');
gleich('S.alleWas merkt sich «rechnung»', await seite.evaluate(() => S.alleWas), 'rechnung');
const z16b = await ankerZahlen(seite);
pruef('in «Alle Jahre» ist kein einzelner Jahrgang hell — es sind alle gemeint',
  z16b.hellJahr === 0 && z16b.jahrgaenge === JAHRE.length, z16b);
pruef('dafuer sind zwei Woerter hell: die Ansicht und der Zweig, auf den man schaut',
  z16b.hellWort === 2 && z16b.woerter === 3, z16b);

await gehJahr(seite, ARBEITSJAHR);
const stateNach = await seite.evaluate(() => ({ ansicht: S.ansicht, jahr: S.jahr }));
gleich('ein Jahresknopf aus «Alle Jahre» fuehrt zurueck in die Rechnungen, nicht ins Budget',
  stateNach.ansicht, 'rechnung');
gleich('und in den richtigen Jahrgang', stateNach.jahr, ARBEITSJAHR);
gleich('und der Kopf sagt dasselbe: Jahrgang und Rechnungen',
  await anker(seite), ARBEITSJAHR + ' · RECHNUNGEN');

/* Gegenprobe in die andere Richtung: aus «Alle Jahre» den Zweig auf Budget
   umschalten (bleibt in «Alle Jahre»), dann ueber einen Jahresknopf zurueck —
   und dort im Budget landen, nicht wieder in den Rechnungen. */
await gehAlle(seite);
await gehAnsicht(seite, 'budget');
gleich('Gegenprobe: die Umschaltung innerhalb «Alle Jahre» zeigt jetzt das Budget',
  await anker(seite), '— · BUDGET · ALLE JAHRE');
gleich('und bleibt dabei in «Alle Jahre»', await seite.evaluate(() => S.ansicht), 'alle');
await gehJahr(seite, ARBEITSJAHR);
gleich('Gegenprobe: ein Jahresknopf fuehrt jetzt ins Budget',
  await seite.evaluate(() => S.ansicht), 'budget');
gleich('und der Kopf sagt dasselbe: Jahrgang und Budget',
  await anker(seite), ARBEITSJAHR + ' · BUDGET');

/* Und ein Gegenbeweis dazu, dass der Ankerpunkt ueberhaupt etwas unterscheidet:
   ein anderer Jahrgang muss ein anderes Bild geben als der Arbeitsjahrgang.
   Ein Messpunkt, der immer dasselbe sagt, belegt nichts. */
const andererJg = JAHRE.find(j => j !== ARBEITSJAHR);
await gehJahr(seite, andererJg);
gleich('Gegenprobe: ein anderer Jahrgang gibt ein anderes Bild',
  await anker(seite), andererJg + ' · BUDGET');
await gehJahr(seite, ARBEITSJAHR);

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
