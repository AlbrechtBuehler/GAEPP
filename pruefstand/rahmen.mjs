/* GAEPP — Pruefstand: der Rahmen.
   Prueft, was um die Tabelle herum steht und in allen drei Ansichten (Budget,
   Rechnungen, Alle) gleich sein muss: Fusszeile, Handbuch, Statuspunkt, Druck
   und der HTML-Export.

   Version und Staende sind Zahlen bzw. Namen, die der Code selbst fuehrt (die
   Konstanten VERSION und STAENDE in index.html). Sie werden hier aus dem
   Quelltext GELESEN, nicht abgeschrieben — sonst veraltet die Pruefung beim
   naechsten Versionssprung, ohne dass jemand es merkt. Dasselbe gilt fuer die
   vier Farben des Statuspunkts und die Anspruchsfarbe der Fusszeile: sie
   stehen als CSS-Variablen im :root-Block und werden von dort geparst, nicht
   als Hex-Wert hier hingeschrieben.

   Gemessen wird durchgehend die Wirkung — der berechnete Farbwert (getComputedStyle),
   der tatsaechliche Text im DOM, die erzeugte Zeichenkette des Exports — nicht
   die CSS-Regel oder der Quelltext selbst. */

import { readFileSync } from 'fs';
import { join } from 'path';
import { serve, browser, bilanzbuch, WURZEL, bisRuhe } from './hilfe.mjs';

const PORT = 8103;
const { pruef, gleich, ende } = bilanzbuch('rahmen');

/* ---------------------------------------------------- Aus dem Quelltext gelesen */
const quelltext = readFileSync(join(WURZEL, 'index.html'), 'utf8');

function lies(muster, name) {
  const m = muster.exec(quelltext);
  if (!m) throw new Error('Im Quelltext von index.html nicht gefunden: ' + name);
  return m;
}

const VERSION = lies(/const VERSION = '([^']+)'/, 'VERSION')[1];
const STAENDE = lies(/const STAENDE = \[([^\]]*)\]/, 'STAENDE')[1]
  .split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);

/* Die Farbvariablen des dunklen Schemas (das Standardschema beim Start). */
const WURZELBLOCK = lies(/:root\{([\s\S]*?)\}/, ':root-Farbvariablen')[1];
const FARBEN = {};
for (const m of WURZELBLOCK.matchAll(/--([a-z]+):(#[0-9a-fA-F]{6})/g)) FARBEN[m[1]] = m[2];
const hexZuRgb = hex => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
};
const farbeVon = name => {
  if (!FARBEN[name]) throw new Error('Farbvariable --' + name + ' steht nicht im :root-Block.');
  return hexZuRgb(FARBEN[name]);
};

/* Gegenprobe: die Parser-Funktionen muessen selbst etwas finden und richtig
   umrechnen, sonst waeren alle Farbpruefungen unten vakuos richtig. */
console.log('\nGegenprobe — Quelltext-Leser');
pruef('VERSION hat die Form x.y.z', /^\d+\.\d+\.\d+$/.test(VERSION), VERSION);
pruef('STAENDE traegt vier Eintraege', STAENDE.length === 4, STAENDE.join(', '));
gleich('Hex-nach-RGB rechnet #ee7f00 richtig um', hexZuRgb('#ee7f00'), 'rgb(238, 127, 0)');
gleich('«sichert» ist #EE7F00 im dunklen Schema (Literalwert aus dem Auftrag)',
  farbeVon('porange'), 'rgb(238, 127, 0)');
const zaehleWort = (text, wort) => (text.match(new RegExp(wort, 'gi')) || []).length;
pruef('der Wortzaehler zaehlt richtig (Probe: "Zins Zins zins" -> 3)',
  zaehleWort('Zins Zins zins', 'Zins') === 3);

/* ---------------------------------------------------------------- Ablauf */
(async () => {
  const server = await serve(PORT);
  const { b, seite, fehler } = await browser(PORT);

  /* -------------------------------------------------------------- Fusszeile */
  console.log('\nFusszeile');
  const fuss = await seite.evaluate(() => {
    const claim = document.querySelector('.fusszeile .claim');
    const ver = document.querySelector('.fusszeile .ver');
    return {
      claimText: claim ? claim.textContent : null,
      claimFarbe: claim ? getComputedStyle(claim).color : null,
      verText: ver ? ver.textContent : null
    };
  });
  gleich('Anspruch steht da', fuss.claimText, 'Passend | Präzise | Praktisch');
  gleich('Anspruchsfarbe (berechnet)', fuss.claimFarbe, farbeVon('claim'));
  gleich('Versionszeile nennt die gelesene Version', fuss.verText, 'GÄPP V ' + VERSION);

  /* ---------------------------------------------- Kein Hilfetext mehr (.fuss) */
  console.log('\nKein Hilfetext mehr unter der Tabelle');
  const keinFuss = async label => {
    const anzahl = await seite.evaluate(() => document.querySelectorAll('.fuss').length);
    pruef('.fuss kommt nicht vor — ' + label, anzahl === 0, anzahl);
  };
  await keinFuss('Budget');
  await seite.click('[data-geh-ansicht="rechnung"]');
  await bisRuhe(seite);
  await keinFuss('Rechnungen');
  await seite.click('[data-geh-alle="1"]');
  await bisRuhe(seite);
  await keinFuss('Alle (Budget)');
  await seite.click('[data-geh-ansicht="rechnung"]');
  await bisRuhe(seite);
  await keinFuss('Alle (Rechnungen)');

  /* Zurueck auf einen bekannten Stand fuer die folgenden Pruefungen. */
  await seite.evaluate(() => { S.ansicht = 'budget'; S.jahr = 2026; neu(); });
  await bisRuhe(seite);

  /* ----------------------------------------------------------------- Handbuch */
  console.log('\nHandbuch');
  await seite.click('[data-hb]');
  await bisRuhe(seite);
  const hb = await seite.evaluate(() => {
    const dialog = document.querySelector('[data-schleier="hb"]');
    if (!dialog) return null;
    const h2 = dialog.querySelector('h2');
    const rumpf = dialog.querySelector('.handbuch');
    const kinder = rumpf ? [...rumpf.children] : [];
    const abschnitte = [];
    let aktuell = null;
    kinder.forEach(el => {
      if (el.tagName === 'H3') { aktuell = { titel: el.textContent.trim(), text: '' }; abschnitte.push(aktuell); }
      else if (aktuell) aktuell.text += ' ' + el.textContent;
    });
    return { h2: h2 ? h2.textContent : '', volltext: rumpf ? rumpf.textContent : '', abschnitte };
  });
  pruef('das Handbuch geht auf', hb !== null);
  pruef('der Titel nennt die gelesene Version', hb && hb.h2.includes('V ' + VERSION), hb && hb.h2);
  STAENDE.forEach(s => pruef('nennt den Stand «' + s + '»', hb && hb.volltext.includes(s)));
  pruef('erwaehnt die Pfeiltasten (Pfeil rauf / Pfeil runter)',
    hb && /Pfeil\s+rauf/.test(hb.volltext) && /Pfeil\s+runter/.test(hb.volltext));
  pruef('erwaehnt den Rechtsklick', hb && /Rechtsklick/.test(hb.volltext));
  pruef('erwaehnt den Doppelklick auf die Basis',
    hb && hb.abschnitte.some(a => a.titel === 'Doppelklick auf die Basis'));
  pruef('erwaehnt die Saldokorrektur',
    hb && hb.abschnitte.some(a => /Saldo.*korrigieren/i.test(a.titel)));
  pruef('erwaehnt das Drucken', hb && /\bDrucken\b/.test(hb.volltext));

  const nichtTut = hb && hb.abschnitte.find(a => /Was GÄPP nicht tut/i.test(a.titel));
  pruef('der Abschnitt «Was GÄPP nicht tut» steht da', !!nichtTut, hb && hb.abschnitte.map(a => a.titel).join(' | '));
  const zinsGesamt = hb ? zaehleWort(hb.volltext, 'Zins') : -1;
  const zinsDort = nichtTut ? zaehleWort(nichtTut.text, 'Zins') : 0;
  pruef('«Zins» steht nur dort, wo GÄPP sagt, dass es ihn nicht gibt',
    hb && zinsDort > 0 && zinsGesamt === zinsDort, zinsDort + ' von ' + zinsGesamt);
  const gebuehrGesamt = hb ? zaehleWort(hb.volltext, 'Gebühr') : -1;
  const gebuehrDort = nichtTut ? zaehleWort(nichtTut.text, 'Gebühr') : 0;
  pruef('«Gebühr» steht nur dort, wo GÄPP sagt, dass es sie nicht gibt',
    hb && gebuehrDort > 0 && gebuehrGesamt === gebuehrDort, gebuehrDort + ' von ' + gebuehrGesamt);

  await seite.click('[data-zu="hb"]');
  await bisRuhe(seite);
  const nochOffen = await seite.evaluate(() => !!document.querySelector('[data-schleier="hb"]'));
  pruef('Schliessen schliesst das Handbuch', !nochOffen);

  /* ------------------------------------------------------------ Statuspunkt */
  console.log('\nStatuspunkt');
  const ZUSTAENDE = [
    { s: 'gesichert', farbe: 'pgruen', als: 'gruen' },
    { s: 'sichert', farbe: 'porange', als: 'orange' },
    { s: 'lokal', farbe: 'pgrau', als: 'grau' },
    { s: 'nicht verbunden', farbe: 'pgrau', als: 'grau' },
    { s: 'fehler', farbe: 'prot', als: 'rot' }
  ];
  for (const z of ZUSTAENDE) {
    const gemessen = await seite.evaluate(zustand => {
      S.sync = zustand; zeichne();
      return getComputedStyle(document.querySelector('.punkt')).backgroundColor;
    }, z.s);
    gleich('Punkt bei data-s="' + z.s + '" ist ' + z.als, gemessen, farbeVon(z.farbe));
  }

  /* ------------------------------------------------------------------- Druck */
  console.log('\nDruck');
  await seite.evaluate(() => { S.sync = 'lokal'; S.ansicht = 'budget'; S.jahr = 2026; neu(); });
  await bisRuhe(seite);
  /* Zeilen mit Monatswerten stehen erst nach dem Aufklappen im DOM. */
  await seite.click('[data-alle-um]');
  await bisRuhe(seite);

  const zielFeld = await seite.evaluate(() => {
    const t = [...document.querySelectorAll('input.zelle[data-z]')].find(e => e.value && e.value.trim() !== '');
    return t ? { z: t.dataset.z, m: t.dataset.m } : null;
  });
  pruef('ein Feld mit einem Monatswert wurde gefunden (fuer die Abhak-Probe)', zielFeld !== null);
  if (zielFeld) {
    await seite.locator(`input.zelle[data-z="${zielFeld.z}"][data-m="${zielFeld.m}"]`).click({ button: 'right' });
    await bisRuhe(seite);
  }
  const abgehaktDa = await seite.evaluate(() => !!document.querySelector('td.abgehakt'));
  pruef('eine abgehakte Zelle steht in der Tabelle', abgehaktDa);

  await seite.emulateMedia({ media: 'print' });
  const druck = await seite.evaluate(() => {
    const zelle = document.querySelector('td.abgehakt');
    const proben = [document.body, document.querySelector('th'), document.querySelector('td.name'),
      document.querySelector('tr.kopf td')].filter(Boolean);
    return {
      textFarbe: getComputedStyle(document.body).color,
      hintergruende: proben.map(e => getComputedStyle(e).backgroundColor),
      abgehaktFett: zelle ? getComputedStyle(zelle).fontWeight : null,
      leisteAnzeige: getComputedStyle(document.querySelector('.leiste')).display,
      fusszeileAnzeige: getComputedStyle(document.querySelector('.fusszeile')).display
    };
  });
  gleich('Text ist schwarz', druck.textFarbe, 'rgb(0, 0, 0)');
  const hellODurchsichtig = f => f === 'rgb(255, 255, 255)' || f === 'rgba(0, 0, 0, 0)' || f === 'transparent';
  pruef('keine Graufläche — Hintergründe weiss oder durchsichtig',
    druck.hintergruende.every(hellODurchsichtig), druck.hintergruende.join(' | '));
  gleich('die abgehakte Zelle steht fett', druck.abgehaktFett, '700');
  gleich('die Leiste ist im Druck ausgeblendet', druck.leisteAnzeige, 'none');
  gleich('die Fusszeile ist im Druck ausgeblendet', druck.fusszeileAnzeige, 'none');

  console.log('\nGegenprobe — Bildschirm nach dem Druck');
  await seite.emulateMedia({ media: 'screen' });
  const nachDruck = await seite.evaluate(() => ({
    claimFarbe: getComputedStyle(document.querySelector('.fusszeile .claim')).color,
    leisteAnzeige: getComputedStyle(document.querySelector('.leiste')).display
  }));
  gleich('die Anspruchsfarbe ist wieder orange', nachDruck.claimFarbe, farbeVon('claim'));
  gleich('die Leiste steht wieder da', nachDruck.leisteAnzeige, 'flex');

  /* ------------------------------------------------------------- HTML-Export */
  console.log('\nHTML-Export');
  /* gib() ist die Funktion, die die Datei tatsaechlich erzeugt und den Download
     ausloest. Sie wird abgefangen, statt einen echten Download abzuwarten — so
     steht die erzeugte Zeichenkette direkt zur Pruefung bereit. */
  await seite.evaluate(() => {
    window.__export = null;
    window.gib = (name, text, typ) => { window.__export = { name, text, typ }; };
  });
  await seite.click('[data-exp="1"]');
  await bisRuhe(seite);
  await seite.click('[data-exp-html="1"]');
  await bisRuhe(seite);
  const exp = await seite.evaluate(() => window.__export);
  pruef('die Datei wurde erzeugt', exp !== null);
  pruef('der Dateiname endet auf .html', exp && /\.html$/.test(exp.name), exp && exp.name);
  pruef('die gelesene Version steht in der Datei', exp && exp.text.includes('GÄPP V ' + VERSION));
  pruef('kein <input> mehr in der Datei', exp && !/<input\b/i.test(exp.text));
  pruef('kein <select> mehr in der Datei', exp && !/<select\b/i.test(exp.text));
  pruef('kein <textarea> mehr in der Datei', exp && !/<textarea\b/i.test(exp.text));

  /* ---------------------------------------------------------------- Abschluss */
  await b.close();
  server.close();
  ende(fehler);
})();
