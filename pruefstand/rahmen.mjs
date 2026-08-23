/* GAEPP — Pruefstand: der Rahmen.
   Geprueft wird, was um die Tabelle herum steht und in jeder Ansicht (Budget,
   Rechnungen, Alle Jahre) dasselbe sein muss: die Fusszeile, das Handbuch, das
   Zustandszeichen des Datenkanals, der Kopf und Fuss fuers Papier, die
   eingebettete Schrift und die HTML-Datei, die aus dem Werkzeug herausfaellt.

   Version, Staende und Farbtafel sind Werte, die der Code selbst fuehrt. Sie
   werden hier aus dem Quelltext GELESEN, nicht abgeschrieben — sonst veraltet
   der Lauf beim naechsten Sprung, ohne dass es jemandem auffaellt. Gemessen
   wird danach immer die Wirkung: der berechnete Farbwert, der sichtbare Text,
   das gemessene Rechteck, die erzeugte Zeichenkette — nie die CSS-Regel.

   Was der Umbau auf 3.0.0 an diesem Lauf geaendert hat, steht an jeder
   betroffenen Stelle als Kommentar: gestrichen mit Begruendung, ersetzt mit
   Angabe dessen, was der Neubau an derselben Stelle tut. */

import { readFileSync } from 'fs';
import { join } from 'path';
import { serve, browser, bilanzbuch, WURZEL, bisRuhe } from './hilfe.mjs';
import { daten, STICHMONAT, STICHJAHR, JAHRE } from './vorrat.mjs';

const PORT = 8742;
const { pruef, gleich, ende } = bilanzbuch('rahmen');

/* Ein gestellter Tag fuer den Druckkopf. Er traegt «gedruckt am» aus dem
   Kalender des Rechners; ein Lauf, der den echten Tag erwartet, waere morgen
   rot. Also wird der Tag in der Seite gestellt und danach zurueckgegeben. */
const TAG      = { j: 2027, m: 3, t: 14 };
const zwei     = n => (n < 10 ? '0' : '') + n;
const TAG_TEXT = zwei(TAG.t) + '.' + zwei(TAG.m) + '.' + TAG.j;
const TAG_ISO  = TAG.j + '-' + zwei(TAG.m) + '-' + zwei(TAG.t) + 'T10:00:00';

/* ------------------------------------------------- Aus dem Quelltext gelesen */
const quelltext = readFileSync(join(WURZEL, 'index.html'), 'utf8');

function lies(muster, name) {
  const m = muster.exec(quelltext);
  if (!m) throw new Error('Im Quelltext von index.html nicht gefunden: ' + name);
  return m;
}

const VERSION = lies(/const VERSION = '([^']+)'/, 'VERSION')[1];
const STAENDE = lies(/const STAENDE = \[([^\]]*)\]/, 'STAENDE')[1]
  .split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);

/* Zwei Farbtafeln: die des Fensters (:root) und die des Papiers (:root im
   @media-print-Block). Beide werden gelesen, nicht abgeschrieben. */
const tafel = block => {
  const t = {};
  for (const m of block.matchAll(/--([A-Za-z]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) t[m[1]] = m[2];
  return t;
};
const BILDSCHIRM = tafel(lies(/:root\{([\s\S]*?)\n\}/, 'Farbtafel des Fensters')[1]);
const druckteil  = quelltext.slice(quelltext.indexOf('@media print{'));
const PAPIER     = tafel(/:root\{([\s\S]*?)\n \}/.exec(druckteil)[1]);

const hexZuRgb = hex => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
};
const aus = (tafel, name, wo) => {
  if (!tafel[name]) throw new Error('Farbvariable --' + name + ' steht nicht in der Tafel ' + wo + '.');
  return hexZuRgb(tafel[name]);
};
const farbeVon  = name => aus(BILDSCHIRM, name, 'des Fensters');
const papierVon = name => aus(PAPIER, name, 'des Papiers');

/* Helligkeit und Buntheit einer gemessenen Farbe. Buntheit ist der Abstand
   zwischen dem groessten und dem kleinsten Kanal: ein Grauton hat null. */
const kanaele = rgb => (String(rgb).match(/\d+(?:\.\d+)?/g) || []).slice(0, 3).map(Number);
const helligkeit = rgb => { const [r, g, b] = kanaele(rgb);
  return r === undefined ? null : (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const buntheit = rgb => { const k = kanaele(rgb);
  return k.length < 3 ? null : Math.max(...k) - Math.min(...k); };

/* Ein Wortzaehler mit echten Wortgrenzen. Ohne sie zaehlt «rot» auch in
   «trotzdem» mit, und die Pruefung unten waere eine Aussage ueber die deutsche
   Rechtschreibung statt ueber das Handbuch. */
const zaehleWort = (text, wort) =>
  (String(text).match(new RegExp('(?<!\\p{L})' + wort + '(?!\\p{L})', 'giu')) || []).length;

/* Zahlwoerter fuer die Fusszeile. Das ist deutsche Sprache und keine Abschrift
   aus der App — die Zahl selbst kommt aus dem Pruefvorrat. */
const ZAHLWORT = ['kein','ein','zwei','drei','vier','fünf','sechs','sieben','acht',
                  'neun','zehn','elf','zwölf'];
const gross = w => w.charAt(0).toUpperCase() + w.slice(1);

/* ---------------------------------------------------------------- Gegenproben
   Die Leser muessen selbst etwas finden und richtig umrechnen, sonst waeren
   alle Pruefungen unten vakuos richtig. */
console.log('\nGegenprobe — Quelltext-Leser');
pruef('VERSION hat die Form x.y.z', /^\d+\.\d+\.\d+$/.test(VERSION), VERSION);
pruef('STAENDE traegt vier Eintraege', STAENDE.length === 4, STAENDE.join(', '));
gleich('Hex-nach-RGB rechnet #2e3133 richtig um', hexZuRgb('#2e3133'), 'rgb(46, 49, 51)');
pruef('die Farbtafel des Fensters traegt zwoelf Toene',
  Object.keys(BILDSCHIRM).length === 12, Object.keys(BILDSCHIRM).join(' '));
pruef('die Farbtafel des Papiers traegt dieselben Namen',
  Object.keys(PAPIER).sort().join(' ') === Object.keys(BILDSCHIRM).sort().join(' '),
  Object.keys(PAPIER).join(' '));
pruef('der Wortzaehler zaehlt richtig (Probe: «Rang Rang rang» -> 3)',
  zaehleWort('Rang Rang rang', 'Rang') === 3);
pruef('der Buntheitsmesser sieht einen bunten Ton (Gegenprobe)',
  buntheit('rgb(238, 127, 0)') > 100, buntheit('rgb(238, 127, 0)'));

/* GESTRICHEN: «sichert ist #EE7F00». Die Akzentfarbe gibt es im Neubau nicht
   mehr — --porange, --gruen*, --rot*, --balken*, --zeile, --merk und --claim
   sind aus der Tafel entfernt, Rang entsteht aus Groesse und Gewicht. Eine
   Pruefung auf ihren Wert haette keinen Gegenstand mehr. An ihre Stelle tritt
   die staerkere Aussage: KEIN Ton der beiden Tafeln ist bunt. */
console.log('\nKeine Akzentfarbe mehr — statt ihres Werts ihre Abwesenheit');
['porange','gruen','rot','balken','zeile','merk','claim'].forEach(n =>
  pruef('--' + n + ' steht in keiner der beiden Tafeln',
    !Object.keys(BILDSCHIRM).some(k => k.toLowerCase().indexOf(n) === 0)
    && !Object.keys(PAPIER).some(k => k.toLowerCase().indexOf(n) === 0)));
/* Grau heisst hier, was auch rangordnung.mjs Grau nennt, wenn es das ganze
   Blatt nach einem Farbstich absucht: der Abstand zwischen groesstem und
   kleinstem Kanal bleibt unter elf von 255. Die Tafel traegt kuehle Graus und
   keine reinen — das ist gewollt und mit blossem Auge kein Ton. Ein Akzent
   faengt weit darueber an; der abgeschaffte Orangeton fuellte die Skala fast
   ganz aus, wie die Gegenprobe oben zeigt. */
const GRAUGRENZE = 10;
Object.keys(BILDSCHIRM).forEach(n => pruef('--' + n + ' ist im Fenster ein Grauton',
  buntheit(hexZuRgb(BILDSCHIRM[n])) <= GRAUGRENZE,
  BILDSCHIRM[n] + ' Buntheit ' + buntheit(hexZuRgb(BILDSCHIRM[n]))));
Object.keys(PAPIER).forEach(n => pruef('--' + n + ' ist auf Papier ein Grauton',
  buntheit(hexZuRgb(PAPIER[n])) <= GRAUGRENZE,
  PAPIER[n] + ' Buntheit ' + buntheit(hexZuRgb(PAPIER[n]))));

/* ============================================================== Ablauf ===== */
const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

/* Ohne geladene Schrift misst man die Ersatzschrift des Systems — dann stimmen
   Hoehen und Breiten nicht mehr. */
await seite.evaluate(() => document.fonts.ready);

/* ------------------------------------------------------------- Handgriffe -- */
const ruhe = () => bisRuhe(seite);
const stand = async (fn, mit) => { await seite.evaluate(fn, mit); await ruhe(); };
const messe = (wahl, felder) => seite.evaluate(([w, f]) => {
  const e = document.querySelector(w);
  if (!e) return null;
  const c = getComputedStyle(e), r = e.getBoundingClientRect();
  const raus = { text: (e.textContent || '').trim(),
    breite: Math.round(r.width * 100) / 100, hoehe: Math.round(r.height * 100) / 100 };
  (f || []).forEach(p => { raus[p] = c[p]; });
  return raus;
}, [wahl, felder]);
const zaehl = wahl => seite.evaluate(w => document.querySelectorAll(w).length, wahl);

/* Ein bekannter Stand fuer alles, was folgt. */
await stand(j => { S.ansicht = 'budget'; S.jahr = j; S.sync = 'lokal'; S.syncText = ''; zeichne(); },
  STICHJAHR);

/* ============================================================ Fusszeile ==== */
console.log('\nFusszeile');
const fuss = await seite.evaluate(() => {
  const g = w => document.querySelector('.fusszeile ' + w);
  const c = g('.claim'), v = g('.ver'), r = g('.rechts');
  const s = e => e ? getComputedStyle(e) : null;
  return {
    claimText: c ? c.textContent : null, claimFarbe: c ? s(c).color : null,
    claimVersal: c ? s(c).textTransform : null,
    verText: v ? v.textContent : null, verFarbe: v ? s(v).color : null,
    rechtsText: r ? r.textContent : null, rechtsFarbe: r ? s(r).color : null
  };
});
gleich('Anspruch steht da', fuss.claimText, 'Passend | Präzise | Praktisch');
/* Der Anspruch stand frueher in der Akzentfarbe. Er steht jetzt in Muted A und
   in Versalien — die Auszeichnung ist von der Farbe auf die Form gewandert. */
gleich('Anspruch in Muted A (berechnet)', fuss.claimFarbe, farbeVon('mA'));
gleich('Anspruch in Versalien', fuss.claimVersal, 'uppercase');
gleich('Versionszeile nennt die gelesene Version', fuss.verText, 'GÄPP V ' + VERSION);
gleich('Versionszeile in Muted C', fuss.verFarbe, farbeVon('mC'));

/* Rechts steht, was der Datenstand hergibt. Erwartet wird aus dem Pruefvorrat
   gerechnet, nicht aus der Anzeige gelesen. */
const D = daten();
const HAKEN = Object.keys(D.haken || {}).length;
const sollRechts = gross(ZAHLWORT[JAHRE.length])
  + (JAHRE.length === 1 ? ' Jahrgang' : ' Jahrgänge')
  + ' · ' + HAKEN + ' Haken · alles gerechnet';
gleich('rechts stehen Jahrgaenge, Haken und die Zusage', fuss.rechtsText, sollRechts);
gleich('die Zaehlzeile steht in Muted C', fuss.rechtsFarbe, farbeVon('mC'));
pruef('Gegenprobe: der Vorrat traegt mehr als einen Jahrgang und mehr als einen Haken',
  JAHRE.length > 1 && HAKEN > 1, JAHRE.length + ' Jahrgaenge, ' + HAKEN + ' Haken');
const fz = await messe('.fusszeile', ['borderTopWidth', 'borderTopColor', 'display']);
gleich('die Fusszeile ist eine Zeile', fz.display, 'flex');
gleich('Fusszeile: Hoehe', fz.hoehe, 44);
gleich('Fusszeile: Regel oben, Breite', fz.borderTopWidth, '1px');
gleich('Fusszeile: Regel oben, Farbe', fz.borderTopColor, farbeVon('rStark'));

/* ------------------------------------ Kein Hilfetext mehr unter der Tabelle */
console.log('\nKein Hilfetext mehr unter der Tabelle');
const keinFuss = async label => {
  const z = await zaehl('.fuss');
  pruef('.fuss kommt nicht vor — ' + label, z === 0, z);
  /* Gegenprobe: gemessen wurde an einem Blatt, das wirklich dasteht. */
  const zeilen = await zaehl('.blatt tr, .blatt .mListe > *');
  pruef('Gegenprobe: das Blatt steht da — ' + label, zeilen > 0, zeilen + ' Zeilen');
};
await keinFuss('Budget');
await seite.click('[data-geh-ansicht="rechnung"]'); await ruhe();
await keinFuss('Rechnungen');
await seite.click('[data-geh-alle="1"]'); await ruhe();
await keinFuss('Alle Jahre (Rechnungen)');
await seite.click('[data-geh-ansicht="budget"]'); await ruhe();
await keinFuss('Alle Jahre (Budget)');
await stand(j => { S.ansicht = 'budget'; S.jahr = j; zeichne(); }, STICHJAHR);

/* ================================================== Der Kopf, dreigeteilt == */
/* NEU. Aus einer Werkzeugleiste mit acht Knoepfen sind drei Zeilen und drei
   Zeichen geworden. Der Lauf prueft, was jetzt an dieser Stelle steht. */
console.log('\nDer Kopf — drei Zeilen, drei Zeichen');
/* Die acht Felder gibt es weiter, sie liegen seit dem Rollfeld nur in zwei
   Ebenen: fuenf davon rollen gemeinsam, drei stehen fest. Geprueft wird darum
   die Folge im Dokument UND die Zugehoerigkeit — die alte Fassung las nur die
   unmittelbaren Kinder des Koerpers und wuerde jede Schachtelung fuer einen
   Verlust halten. */
const rahmenFolge = await seite.evaluate(() => [...document.querySelectorAll(
  '#rollfeld,#leiste,#band,#blattkopf,#druckkopf,#blatt,#druckfuss,#fusszeile,#dialoge')]
  .map(e => e.id));
gleich('die acht Felder des Rahmens stehen in dieser Folge',
  rahmenFolge.filter(x => x !== 'rollfeld').join(' '),
  'leiste band blattkopf druckkopf blatt druckfuss fusszeile dialoge');
const rollKinder = await seite.evaluate(() => [...document.querySelector('#rollfeld').children]
  .filter(e => e.id).map(e => e.id));
gleich('fuenf davon liegen im Rollfeld und rollen gemeinsam',
  rollKinder.join(' '), 'leiste band blattkopf druckkopf blatt');
const festeFelder = await seite.evaluate(() => [...document.body.children]
  .filter(e => e.id).map(e => e.id));
gleich('drei stehen daneben fest',
  festeFelder.filter(x => x !== 'rollfeld').join(' '), 'druckfuss fusszeile dialoge');

/* ------------------------------------------------ Das Rollfeld (neu) ------ *
   Auf einem Schirm von 900 px standen vier Kopfbausteine uebereinander und
   liessen elf Datenzeilen uebrig. Seither rollen Wortmarke, Band und
   Blatttitel weg; stehen bleiben Jahrgang und Ansicht, darunter die
   Spaltenkoepfe, darunter die Saldozeile. Gemessen wird die Wirkung: wo die
   Kanten nach dem Rollen liegen — nicht, welche Regel gesetzt ist. */
console.log('\nDas Rollfeld — was beim Rollen stehen bleibt');
const kante = () => seite.evaluate(() => {
  const o = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; };
  const roll = document.querySelector('#rollfeld');
  return { rollTop: roll.scrollTop, roller: Math.round(roll.scrollHeight) > Math.round(roll.clientHeight),
    wort: o('.kopf1'), kopf2: o('.kopf2'), band: o('#band'), blattkopf: o('#blattkopf'),
    spalten: o('thead th'), saldo: o('tr.saldo td'), rollOben: Math.round(roll.getBoundingClientRect().top) };
});
await seite.keyboard.press('z');            /* alles auf, damit es etwas zu rollen gibt */
await ruhe();
const vorRollen = await kante();
pruef('das Blatt ist laenger als das Fenster (Gegenprobe)', vorRollen.roller, vorRollen.roller);
await seite.evaluate(() => { document.querySelector('#rollfeld').scrollTop = 600; });
await seite.waitForTimeout(150);
const nachRollen = await kante();
pruef('gerollt wurde wirklich', nachRollen.rollTop === 600, nachRollen.rollTop);
pruef('die Wortmarke rollt weg',  nachRollen.wort < vorRollen.wort, nachRollen.wort);
pruef('das Kennzahlenband rollt weg', nachRollen.band < vorRollen.band, nachRollen.band);
pruef('der Blatttitel rollt weg',  nachRollen.blattkopf < vorRollen.blattkopf, nachRollen.blattkopf);
gleich('die Zeile mit Jahrgang und Ansicht bleibt oben stehen',
  nachRollen.kopf2 - nachRollen.rollOben, 0);
/* Die drei klebenden Kanten sitzen lueckenlos aufeinander. Gemessen als
   Abstand, nicht als CSS-Wert — eine Zahl im Stilblatt sagt nichts darueber,
   ob sie ankommt. */
const kopf2Hoehe = await seite.evaluate(() => Math.round(document.querySelector('.kopf2').getBoundingClientRect().height));
const spaltenHoehe = await seite.evaluate(() => Math.round(document.querySelector('thead th').getBoundingClientRect().height));
gleich('die Spaltenkoepfe kleben unmittelbar darunter',
  nachRollen.spalten - nachRollen.kopf2, kopf2Hoehe);
gleich('die Saldozeile klebt unmittelbar unter den Spaltenkoepfen',
  nachRollen.saldo - nachRollen.spalten, spaltenHoehe);
/* Gegenprobe: eine Datenzeile, die vorher sichtbar war, ist es nach dem Rollen
   nicht mehr — sonst waere «bleibt stehen» auch dann gruen, wenn gar nichts
   rollt. */
pruef('eine Datenzeile ist unter den Kopf gerollt',
  nachRollen.saldo > nachRollen.spalten && nachRollen.wort < -100, nachRollen.wort);
await seite.evaluate(() => { document.querySelector('#rollfeld').scrollTop = 0; });
await seite.keyboard.press('z');
await ruhe();
gleich('die Kopfleiste traegt Zeile eins', await zaehl('#leiste .kopf1'), 1);
gleich('die Kopfleiste traegt Zeile zwei', await zaehl('#leiste .kopf2'), 1);
gleich('der Blattkopf traegt Zeile drei', await zaehl('#blattkopf .kopf3'), 1);
gleich('das Band steht zwischen Leiste und Blattkopf', await zaehl('#band .band'), 1);
gleich('kein Dialog offen, also ist das Dialogfeld leer',
  await seite.evaluate(() => document.getElementById('dialoge').innerHTML.trim()), '');

const zeichenReihe = await seite.evaluate(() => [...document.querySelectorAll('.zeichen button')]
  .map(kn => {
    const s = kn.firstElementChild;
    return { art: s.tagName.toLowerCase() === 'svg' ? 'dreieck' : s.className,
      griff: [...kn.attributes].map(a => a.name).filter(n => n.indexOf('data-') === 0).join(''),
      titel: kn.getAttribute('title') };
  }));
gleich('genau drei Zeichen oben rechts', zeichenReihe.length, 3);
gleich('Quadrat, Kreis, Dreieck — in dieser Folge',
  zeichenReihe.map(z => z.art).join(' '), 'z-quadrat z-kreis dreieck');
gleich('das Quadrat fuehrt zum Export', zeichenReihe[0] && zeichenReihe[0].griff, 'data-exp');
gleich('der Kreis fuehrt zum Handbuch', zeichenReihe[1] && zeichenReihe[1].griff, 'data-hb');
gleich('das Dreieck fuehrt zum Datenkanal', zeichenReihe[2] && zeichenReihe[2].griff, 'data-sync-auf');

/* GESTRICHEN in dieser Form: der Klick auf [data-alle-um]. Den Knopf gibt es in
   der laufenden App nicht mehr — er lebt nur noch in der Navigationszeile der
   HTML-Datei. Geprueft wird jetzt, was an seine Stelle getreten ist: die Taste. */
gleich('den Knopf «Alles zuklappen» gibt es in der App nicht mehr',
  await zaehl('[data-alle-um]'), 0);
const zuVorher = await zaehl('#blatt tbody tr');
await seite.evaluate(() => document.activeElement && document.activeElement.blur());
await seite.keyboard.press('z'); await ruhe();
const zuNachher = await zaehl('#blatt tbody tr');
pruef('z klappt auf — es stehen mehr Zeilen da als vorher',
  zuNachher > zuVorher, zuVorher + ' -> ' + zuNachher);
await seite.keyboard.press('z'); await ruhe();
gleich('z klappt wieder zu', await zaehl('#blatt tbody tr'), zuVorher);
/* Und die zweite Taste, die aus der Leiste gefallen ist. */
const nullenVorher = await seite.evaluate(() => S.nullen);
await seite.keyboard.press('n'); await ruhe();
const nullenNachher = await seite.evaluate(() => S.nullen);
pruef('n schaltet die Nullen um', nullenVorher !== nullenNachher,
  nullenVorher + ' -> ' + nullenNachher);
await seite.keyboard.press('n'); await ruhe();
gleich('n schaltet sie zurueck', await seite.evaluate(() => S.nullen), nullenVorher);
/* Gegenprobe: in einem Eingabefeld tippt man ein z und klappt nichts zu. */
await seite.keyboard.press('z'); await ruhe();
await seite.click('#blatt input.zelle');
const imFeld = await zaehl('#blatt tbody tr');
await seite.keyboard.press('z'); await ruhe();
gleich('Gegenprobe: im Eingabefeld klappt z nichts zu', await zaehl('#blatt tbody tr'), imFeld);
await seite.evaluate(() => document.activeElement && document.activeElement.blur());

/* ============================================================== Handbuch === */
console.log('\nHandbuch');
/* Die Gegenprobe zur Liste der Staende gehoert neben die Liste: was das
   Werkzeug wirklich anbietet, wird im Auswahlfeld einer Rechnung gelesen —
   nicht im Quelltext. Erst danach wird gefragt, ob das Handbuch es auch sagt. */
await seite.click('[data-geh-ansicht="rechnung"]'); await ruhe();
const angeboten = await seite.evaluate(() => {
  const w = document.querySelector('#blatt select.standwahl');
  return w ? [...w.options].map(o => o.text) : null;
});
await seite.click('[data-geh-ansicht="budget"]'); await ruhe();
gleich('das Werkzeug bietet genau die gelesenen Staende an',
  (angeboten || []).join(' · '), STAENDE.join(' · '));

await seite.click('[data-hb]'); await ruhe();
const hb = await seite.evaluate(() => {
  const dialog = document.querySelector('[data-schleier="hb"]');
  if (!dialog) return null;
  const h2  = dialog.querySelector('.dtitel h2');
  const bei = dialog.querySelector('.dtitel .dbei');
  const rumpf = dialog.querySelector('.handbuch');
  const stuecke = [...(rumpf ? rumpf.children : [])];
  const abschnitte = [];
  let aktuell = null;
  stuecke.forEach(el => {
    if (el.tagName === 'H3') { aktuell = { titel: el.textContent.trim(), text: '' }; abschnitte.push(aktuell); }
    else if (aktuell) aktuell.text += ' ' + el.textContent;
  });
  /* Mit Trennern zusammengesetzt: textContent des Rumpfes klebt die Stuecke
     aneinander, aus «Tastatur» und «z klappt» wuerde «Tastaturz klappt». */
  return { titel: h2 ? h2.textContent.trim() : '', bei: bei ? bei.textContent.trim() : '',
    volltext: stuecke.map(el => el.textContent).join(' '), abschnitte };
});
pruef('das Handbuch geht auf', hb !== null);
gleich('der Kopf heisst «Handbuch»', hb && hb.titel, 'Handbuch');
gleich('der Beisatz nennt die gelesene Version', hb && hb.bei, 'GÄPP V ' + VERSION);
pruef('das Handbuch hat mehr als fuenf Abschnitte (Gegenprobe zur Lesart)',
  hb && hb.abschnitte.length > 5, hb && hb.abschnitte.length);

const drin = m => !!hb && m.test(hb.volltext);
const abschnitt = m => hb ? hb.abschnitte.find(a => m.test(a.titel)) : null;

pruef('erwaehnt die Pfeiltasten (Pfeil rauf / Pfeil runter)',
  drin(/Pfeil\s+rauf/) && drin(/Pfeil\s+runter/));
pruef('erwaehnt den Rechtsklick', drin(/Rechtsklick/));
pruef('erwaehnt das Drucken', drin(/\bdrucken\b/i));
/* Frueher hiess der Abschnitt «Doppelklick auf die Basis». Der Neubau nennt ihn
   «Die Basis» und erklaert den Doppelklick darin — dieselbe Sache, anderer
   Titel. Geprueft wird darum die Sache: ein eigener Abschnitt ueber die Basis,
   in dem der Doppelklick vorkommt. */
const basisAbschnitt = abschnitt(/Basis/i);
pruef('ein eigener Abschnitt ueber die Basis steht da', !!basisAbschnitt,
  hb && hb.abschnitte.map(a => a.titel).join(' | '));
pruef('und er erklaert den Doppelklick auf die Basis',
  !!basisAbschnitt && /Doppelklick/.test(basisAbschnitt.text));
/* Ebenso die Saldokorrektur: frueher ein Abschnitt «Saldo von Hand
   korrigieren», jetzt im Abschnitt ueber die Basis. Geprueft wird, dass das
   Handbuch die Korrektur einer Schuld ueberhaupt erklaert. */
const korrAbschnitt = hb && hb.abschnitte.find(a => /korrigier|Korrektur/i.test(a.text || a.titel));
pruef('die Korrektur einer Schuld wird erklaert', !!korrAbschnitt,
  hb && hb.abschnitte.map(a => a.titel).join(' | '));
pruef('und sie haengt am Doppelklick',
  !!korrAbschnitt && /Doppelklick/.test(korrAbschnitt.text));
pruef('erwaehnt den Saldovortrag ins Folgejahr', drin(/Vortrag|Saldovortrag/));

/* NEU. Was der Umbau an die Stelle der acht Knoepfe gesetzt hat, muss im
   Handbuch stehen — sonst findet niemand mehr, was frueher beschriftet war. */
pruef('erklaert die drei Zeichen (Quadrat, Kreis, Dreieck)',
  drin(/Quadrat/) && drin(/Kreis/) && drin(/Dreieck/));
pruef('erklaert die Tasten z und n',
  drin(/(?<!\p{L})z(?!\p{L})\s*klappt/u) && drin(/(?<!\p{L})n(?!\p{L})\s*zeigt/u));
pruef('sagt, dass abgehakt halbfett heisst', drin(/halbfett/i));
/* Jeder Stand einzeln — so steht im Bericht, welcher fehlt und welcher nicht.
   Das Werkzeug bietet die vier oben gemessen an; wer eines davon im Feld
   antrifft, muss es im Handbuch nachlesen koennen. */
STAENDE.forEach(x => pruef('das Handbuch nennt den Stand «' + x + '»', drin(new RegExp(x))));

/* PORTIERT, nicht gestrichen. Frueher: «Zins» und «Gebuehr» duerfen nur im
   Abschnitt «Was GAEPP nicht tut» stehen — das Handbuch soll nichts
   versprechen, was das Werkzeug nicht kann. Diesen Abschnitt gibt es im Neubau
   nicht mehr, und die beiden Woerter kommen im ganzen Quelltext nicht mehr vor;
   die Pruefung waere ohne Gegenstand. An ihre Stelle tritt dieselbe Frage am
   neuen Gegenstand: der Neubau hat die Farbe abgeschafft, also darf das
   Handbuch keine versprechen. Die Farbwoerter duerfen nur dort stehen, wo GAEPP
   sagt, dass es sie nicht gibt. */
const ohneFarbe = hb && hb.abschnitte.find(a => /Rang/i.test(a.titel));
pruef('der Abschnitt ueber den Rang steht da', !!ohneFarbe,
  hb && hb.abschnitte.map(a => a.titel).join(' | '));
pruef('weder «Zins» noch «Gebühr» stehen im Handbuch — GÄPP rechnet beides nicht',
  hb && !/zins|gebühr/i.test(hb.volltext),
  hb && (hb.volltext.match(/[A-Za-zÄÖÜäöü]*(zins|gebühr)[A-Za-zÄÖÜäöü]*/gi) || []).join(' '));
[['Rot', 'rot'], ['Grün', 'grün'], ['Akzentfarbe', 'akzentfarbe']].forEach(([anzeige, wort]) => {
  const gesamt = hb ? zaehleWort(hb.volltext, wort) : -1;
  const dort   = ohneFarbe ? zaehleWort(ohneFarbe.text, wort) : 0;
  pruef('«' + anzeige + '» steht nur dort, wo GÄPP sagt, dass es das nicht gibt',
    hb && dort > 0 && gesamt === dort, dort + ' von ' + gesamt);
});

await seite.click('[data-zu="hb"]'); await ruhe();
pruef('Schliessen schliesst das Handbuch', (await zaehl('[data-schleier="hb"]')) === 0);

/* ================================================ Zustandszeichen: Dreieck = */
/* Aus dem Punkt in vier Farben ist ein Dreieck in zwei Zustaenden geworden:
   gefuellt heisst gesichert, blosse Kontur heisst alles andere. Die alte
   Pruefung mass vier Fuellfarben — die gibt es nicht mehr. Gemessen wird
   jetzt, was das Zeichen wirklich tut: Mass, Fuellung, Kontur, Titel. */
console.log('\nDas Dreieck — Zustand des Datenkanals');
const dreieckMessen = () => seite.evaluate(() => {
  const kn = document.querySelector('.zeichen [data-sync-auf]');
  const svg = kn.querySelector('svg'), pfad = kn.querySelector('path');
  const r = svg.getBoundingClientRect(), c = getComputedStyle(pfad);
  return { breite: Math.round(r.width * 100) / 100, hoehe: Math.round(r.height * 100) / 100,
    fuellung: c.fill, kontur: c.stroke, konturBreite: c.strokeWidth,
    knopfFarbe: getComputedStyle(kn).color, titel: kn.getAttribute('title'),
    d: pfad.getAttribute('d') };
});
const ZUSTAENDE = [
  { s: 'gesichert',       text: 'Ins Repo gesichert.',    voll: true },
  { s: 'sichert',         text: 'Sichert …',              voll: false },
  { s: 'lokal',           text: 'Im Browser gesichert.',  voll: false },
  { s: 'nicht verbunden', text: 'Kein Repo verbunden.',   voll: false },
  { s: 'fehler',          text: 'Sichern misslungen.',    voll: false }
];
const gestalten = [];
for (const z of ZUSTAENDE) {
  await stand(x => { S.sync = x.s; S.syncText = x.text; zeichne(); }, z);
  const m = await dreieckMessen();
  gestalten.push(m.d);
  gleich('Dreieck bei «' + z.s + '»: Breite', m.breite, 12);
  gleich('Dreieck bei «' + z.s + '»: Hoehe', m.hoehe, 10.5);
  if (z.voll) {
    gleich('bei «' + z.s + '» ist das Dreieck gefuellt', m.fuellung, farbeVon('sek'));
    gleich('bei «' + z.s + '» hat es keine Kontur', m.kontur, 'none');
  } else {
    gleich('bei «' + z.s + '» ist das Dreieck nicht gefuellt', m.fuellung, 'none');
    gleich('bei «' + z.s + '» steht es als Kontur da', m.kontur, farbeVon('sek'));
    gleich('bei «' + z.s + '» ist die Kontur ein Haar breit', m.konturBreite, '1px');
  }
  gleich('bei «' + z.s + '» steht der Satz im Titel', m.titel, z.text);
}
/* Gegenproben: die beiden Gestalten sind wirklich zwei, und keine ist bunt. */
pruef('gefuellt und Kontur sind zwei verschiedene Zeichnungen',
  gestalten[0] !== gestalten[1], gestalten[0] + ' / ' + gestalten[1]);
pruef('die vier Konturzustaende zeichnen dieselbe Gestalt',
  new Set(gestalten.slice(1)).size === 1, gestalten.slice(1).join(' | '));
const dreieckFarbe = (await dreieckMessen()).knopfFarbe;
pruef('das Dreieck traegt keinen Farbstich', buntheit(dreieckFarbe) <= GRAUGRENZE, dreieckFarbe);

/* Im Fenster des Datenkanals steht dasselbe Zeichen — dort in Tinte, wenn
   gesichert ist, und sonst leise. */
for (const z of [{ s: 'gesichert', farbe: 'tinte', voll: true },
                 { s: 'nicht verbunden', farbe: 'mC', voll: false }]) {
  await stand(x => { S.sync = x.s; S.syncAuf = true; zeichne(); }, z);
  const m = await seite.evaluate(() => {
    const kopf = document.querySelector('[data-schleier="sync"] .dtitel');
    const traeger = kopf.querySelector('span[style]'), pfad = kopf.querySelector('path');
    const c = getComputedStyle(pfad);
    return { farbe: getComputedStyle(traeger).color, fuellung: c.fill, kontur: c.stroke };
  });
  gleich('Datenkanal bei «' + z.s + '»: Farbe des Zeichens', m.farbe, farbeVon(z.farbe));
  gleich('Datenkanal bei «' + z.s + '»: ' + (z.voll ? 'gefuellt' : 'Kontur'),
    z.voll ? m.fuellung : m.kontur, farbeVon(z.farbe));
}
await seite.click('[data-zu="sync"]'); await ruhe();
gleich('Schliessen schliesst den Datenkanal', await zaehl('[data-schleier="sync"]'), 0);

/* =================================================== Kopf und Fuss aufs Papier */
console.log('\nDruckkopf und Druckfuss — mit gestelltem Tag');
await stand(j => { S.sync = 'lokal'; S.ansicht = 'budget'; S.jahr = j; zeichne(); }, STICHJAHR);
/* Der Tag wird in der Seite gestellt, nicht aus dem Kalender genommen. */
await seite.evaluate(iso => {
  const fest = new Date(iso).getTime(), Echt = Date;
  function Gestellt(...a) { return a.length ? new Echt(...a) : new Echt(fest); }
  Gestellt.now = () => fest; Gestellt.parse = Echt.parse; Gestellt.UTC = Echt.UTC;
  Gestellt.prototype = Echt.prototype;
  window.__echterKalender = Echt; window.Date = Gestellt;
  zeichne();
}, TAG_ISO);
await ruhe();
const dk = await seite.evaluate(() => {
  const t = w => { const e = document.querySelector(w); return e ? e.textContent.trim() : null; };
  return { wort: t('#druckkopf .dkWort'), titel: t('#druckkopf .dkTitel'),
    stich: t('#druckkopf .dkStich'), rechts: t('#druckkopf .dkRechts'),
    fuss: [...document.querySelectorAll('#druckfuss > span')].map(e => e.textContent.trim()) };
});
gleich('Druckkopf: die Wortmarke', dk.wort, 'GÄPP');
gleich('Druckkopf: der Blatttitel', dk.titel, 'Budget ' + STICHJAHR);
gleich('Druckkopf: der Stichmonat aus dem Datenstand', dk.stich,
  'Stichmonat ' + STICHMONAT.slice(5, 7) + ' · ' + STICHMONAT.slice(0, 4));
gleich('Druckkopf: gestellter Tag und gelesene Version', dk.rechts,
  'gedruckt ' + TAG_TEXT + ' · GÄPP V ' + VERSION);
gleich('Druckfuss: Waehrung, Legende, Anspruch',
  dk.fuss.join(' | '),
  'Beträge in CHF, ohne Rappen | halbfett = abgehakt | Passend | Präzise | Praktisch');
/* Gegenprobe: der gestellte Tag ist wirklich gestellt und nicht zufaellig heute. */
pruef('Gegenprobe: der gestellte Tag ist nicht der heutige',
  TAG_TEXT !== new Date().toLocaleDateString('de-CH'), TAG_TEXT);
await stand(() => { window.Date = window.__echterKalender; zeichne(); });
pruef('der Kalender ist wieder der echte',
  await seite.evaluate(() => Date === window.__echterKalender));

/* ================================================================= Druck === */
console.log('\nDruck');
/* Ein Haken muss dastehen, sonst prueft «abgehakt steht halbfett» nichts. Die
   Zeilen mit Monatswerten stehen erst nach dem Aufklappen im Blatt — und ob
   vorher zugeklappt war, haengt an den Pruefungen davor. Also wird der Stand
   gesetzt und nicht umgeschaltet. */
await stand(() => { if (!S.auf.length) S.auf = alleKlappIds(); zeichne(); });
pruef('das Blatt steht aufgeklappt da (Gegenprobe zur Haken-Probe)',
  (await zaehl('#blatt tr.pos')) > 0, await zaehl('#blatt tr.pos'));
const zielFeld = await seite.evaluate(() => {
  const t = [...document.querySelectorAll('#blatt input.zelle[data-z][data-m]')]
    .find(e => e.value && e.value.trim() !== '' && !e.closest('td').classList.contains('hak'));
  return t ? { z: t.dataset.z, m: t.dataset.m } : null;
});
pruef('ein Feld mit einem Monatswert ohne Haken wurde gefunden', zielFeld !== null);
const hakenVorher = await zaehl('#blatt td.hak');
if (zielFeld) {
  await seite.locator(`#blatt input.zelle[data-z="${zielFeld.z}"][data-m="${zielFeld.m}"]`)
    .click({ button: 'right' });
  await ruhe();
}
const hakenNachher = await zaehl('#blatt td.hak');
pruef('der Rechtsklick setzt genau einen Haken', hakenNachher === hakenVorher + 1,
  hakenVorher + ' -> ' + hakenNachher);

await seite.emulateMedia({ media: 'print' });
const druck = await seite.evaluate(() => {
  const c = w => { const e = document.querySelector(w); return e ? getComputedStyle(e) : null; };
  const flaechen = ['body', '#blatt table', 'thead th', 'td.c-name', 'tr.saldo td',
    'tr.kat td', 'tr.pos td'];
  const hak = document.querySelector('#blatt td.hak input.zelle')
           || document.querySelector('#blatt td.hak');
  const ohne = [...document.querySelectorAll('#blatt tr.pos td.c-mon')]
    .find(td => !td.classList.contains('hak'));
  return {
    textFarbe: c('body').color,
    grund: c('body').backgroundColor,
    hintergruende: flaechen.map(w => { const s = c(w); return w + '=' + (s ? s.backgroundColor : 'fehlt'); }),
    hakGewicht: hak ? getComputedStyle(hak).fontWeight : null,
    ohneGewicht: ohne ? getComputedStyle(ohne).fontWeight : null,
    kopf1: c('.kopf1') ? c('.kopf1').display : 'fehlt',
    kopf2: c('.kopf2') ? c('.kopf2').display : 'fehlt',
    kopf3: c('.kopf3') ? c('.kopf3').display : 'fehlt',
    band: c('.band') ? c('.band').display : 'fehlt',
    fusszeile: c('.fusszeile').display,
    druckkopf: c('.druckkopf').display,
    druckfuss: c('.druckfuss').display,
    blattUeberlauf: c('.blatt').overflowY,
    stichKopf: c('th.stich') ? c('th.stich').fontWeight : null
  };
});
gleich('auf Papier steht der Text in der Papiertinte', druck.textFarbe, papierVon('tinte'));
pruef('und die ist deutlich dunkler als die des Fensters',
  helligkeit(druck.textFarbe) < 0.3 && helligkeit(farbeVon('tinte')) > 0.7,
  helligkeit(druck.textFarbe).toFixed(2) + ' gegen ' + helligkeit(farbeVon('tinte')).toFixed(2));
gleich('der Grund ist weiss', druck.grund, 'rgb(255, 255, 255)');
const hellODurchsichtig = f => f === 'rgb(255, 255, 255)' || f === 'rgba(0, 0, 0, 0)' || f === 'transparent';
pruef('keine Flaeche — alle Hintergruende weiss oder durchsichtig',
  druck.hintergruende.every(x => hellODurchsichtig(x.split('=')[1])),
  druck.hintergruende.join(' | '));
pruef('Gegenprobe: es wurden sieben Flaechen angesehen', druck.hintergruende.length === 7);
/* Abgehakt heisst halbfett — im Neubau ist das 500 und nicht mehr 700, denn
   die Schrift traegt nur bis 500. Gemessen wird der Abstand zur Nachbarzelle. */
gleich('die abgehakte Zelle steht halbfett', druck.hakGewicht, '500');
pruef('Gegenprobe: eine Zelle ohne Haken steht leichter',
  Number(druck.ohneGewicht) < Number(druck.hakGewicht),
  druck.ohneGewicht + ' gegen ' + druck.hakGewicht);
gleich('Kopfzeile eins ist im Druck ausgeblendet', druck.kopf1, 'none');
gleich('Kopfzeile zwei ist im Druck ausgeblendet', druck.kopf2, 'none');
gleich('Kopfzeile drei ist im Druck ausgeblendet', druck.kopf3, 'none');
gleich('das Kennzahlenband ist im Druck ausgeblendet', druck.band, 'none');
gleich('die Fusszeile ist im Druck ausgeblendet', druck.fusszeile, 'none');
gleich('der Druckkopf steht im Druck da', druck.druckkopf, 'flex');
gleich('der Druckfuss steht im Druck da', druck.druckfuss, 'flex');
gleich('das Blatt scrollt auf Papier nicht mehr', druck.blattUeberlauf, 'visible');
gleich('der Stichmonat bleibt auch auf Papier ausgezeichnet', druck.stichKopf, '500');

console.log('\nGegenprobe — Bildschirm nach dem Druck');
await seite.emulateMedia({ media: 'screen' });
const nachDruck = await seite.evaluate(() => ({
  claimFarbe: getComputedStyle(document.querySelector('.fusszeile .claim')).color,
  textFarbe: getComputedStyle(document.body).color,
  kopf1: getComputedStyle(document.querySelector('.kopf1')).display,
  fusszeile: getComputedStyle(document.querySelector('.fusszeile')).display,
  druckkopf: getComputedStyle(document.querySelector('.druckkopf')).display
}));
gleich('der Anspruch steht wieder in Muted A', nachDruck.claimFarbe, farbeVon('mA'));
gleich('die Tinte ist wieder die helle', nachDruck.textFarbe, farbeVon('tinte'));
gleich('die Kopfleiste steht wieder da', nachDruck.kopf1, 'flex');
gleich('die Fusszeile steht wieder da', nachDruck.fusszeile, 'flex');
gleich('der Druckkopf ist am Bildschirm wieder weg', nachDruck.druckkopf, 'none');

/* ==================================================== Die eingebettete Schrift */
/* NEU. Jost liegt als Base64 im @font-face und nicht mehr als Verweis auf
   Google. Das ist keine Kleinigkeit: faellt die Schrift aus, faellt der Browser
   auf eine Ersatzschrift zurueck, und mit ihr faellt die ganze Rangordnung —
   Groesse und Gewicht sind im Neubau das Einzige, was Rang traegt. Gemessen
   wird darum in einem Fenster, das nichts nach draussen laesst. */
console.log('\nDie eingebettete Schrift — ohne Netz');
const kontextOhneNetz = await b.newContext({ viewport: { width: 1440, height: 900 },
  locale: 'de-CH', timezoneId: 'Europe/Zurich' });
const draussen = [];
await kontextOhneNetz.route('**/*', r => {
  const u = r.request().url();
  if (u.indexOf('http://127.0.0.1:') === 0 || u.indexOf('data:') === 0) return r.continue();
  draussen.push(u); return r.abort();
});
const fehlerOhneNetz = [];
const s2 = await kontextOhneNetz.newPage();
s2.on('pageerror', e => fehlerOhneNetz.push('ohne Netz: ' + String(e)));
await s2.goto('http://127.0.0.1:' + PORT + '/index.html');
await s2.waitForFunction(() => document.querySelectorAll('table').length > 0, null, { timeout: 8000 });
const schrift = await s2.evaluate(() => document.fonts.ready.then(() => {
  const probe = document.createElement('span');
  probe.textContent = 'GÄPP Handbuch 0123456789';
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:48px;white-space:nowrap';
  document.body.appendChild(probe);
  const breiteMit = fam => { probe.style.fontFamily = fam;
    return Math.round(probe.getBoundingClientRect().width * 100) / 100; };
  const jost = breiteMit("'Jost'");
  const jostNochmal = breiteMit("'Jost'");
  const ersatz = breiteMit("'GibtEsHierNicht'");
  probe.remove();
  return {
    familie: getComputedStyle(document.body).fontFamily,
    familieZelle: getComputedStyle(document.querySelector('tr.kat td.c-name')).fontFamily,
    flaechen: document.fonts.size,
    gewichte: [200, 300, 400, 500].map(g => document.fonts.check(g + ' 14px Jost')),
    verweise: document.querySelectorAll('link').length,
    blaetter: document.styleSheets.length,
    zeilen: document.querySelectorAll('#blatt tr').length,
    jost, jostNochmal, ersatz
  };
}));
gleich('ohne Netz wurde keine Anfrage nach draussen abgewuergt', draussen.length, 0);
gleich('es gibt keinen einzigen <link> im Dokument', schrift.verweise, 0);
gleich('genau ein Stilblatt, in der Datei selbst', schrift.blaetter, 1);
pruef('die Schriftfamilie des Fensters ist Jost', /^Jost\b/.test(schrift.familie), schrift.familie);
pruef('auch in der Tabelle ist es Jost', /Jost/.test(schrift.familieZelle), schrift.familieZelle);
gleich('eine einzige Schriftflaeche traegt alles', schrift.flaechen, 1);
pruef('sie traegt die Gewichte 200 bis 500',
  schrift.gewichte.every(Boolean), schrift.gewichte.join(' '));
pruef('die Schrift traegt wirklich — sie misst anders als die Ersatzschrift',
  schrift.jost !== schrift.ersatz, schrift.jost + ' gegen ' + schrift.ersatz);
pruef('Gegenprobe: zweimal dieselbe Familie misst zweimal dasselbe',
  schrift.jost === schrift.jostNochmal, schrift.jost + ' / ' + schrift.jostNochmal);
pruef('Gegenprobe: ohne Netz steht dasselbe Blatt da', schrift.zeilen > 10, schrift.zeilen);
await s2.close(); await kontextOhneNetz.close();
fehlerOhneNetz.forEach(f => pruef('kein Fehler im Fenster ohne Netz', false, f));

/* ============================================================ HTML-Export == */
/* gib() ist die Funktion, die die Datei erzeugt und den Download ausloest. Sie
   wird abgefangen, statt auf einen echten Download zu warten — so steht die
   erzeugte Zeichenkette direkt zur Pruefung bereit. Was die Datei sonst noch
   kann, prueft ausgabe.mjs an der geoeffneten Datei; hier steht nur, was zum
   Rahmen gehoert: Version, Anspruch, Schrift und dass nichts Tippbares
   ueberlebt hat. */
console.log('\nHTML-Export');
await stand(j => { S.ansicht = 'budget'; S.jahr = j; zeichne(); }, STICHJAHR);
await seite.evaluate(() => {
  window.__export = null;
  window.gib = (name, text, typ) => { window.__export = { name, text, typ }; };
});
await seite.click('[data-exp]'); await ruhe();
pruef('das Exportfenster geht auf', (await zaehl('[data-schleier="exp"]')) === 1);
await seite.click('[data-exp-html]'); await ruhe();
const exp = await seite.evaluate(() => window.__export);
pruef('die Datei wurde erzeugt', exp !== null);
pruef('der Dateiname endet auf .html', exp && /\.html$/.test(exp.name), exp && exp.name);
gleich('sie wird als HTML ausgegeben', exp && exp.typ, 'text/html');
pruef('die gelesene Version steht in der Datei', exp && exp.text.indexOf('GÄPP V ' + VERSION) >= 0);
pruef('der Anspruch steht in der Datei',
  exp && exp.text.indexOf('Passend | Präzise | Praktisch') >= 0);
pruef('der Blatttitel steht in der Datei',
  exp && exp.text.indexOf('Budget ' + STICHJAHR) >= 0);
pruef('kein <input> mehr in der Datei', exp && !/<input\b/i.test(exp.text));
pruef('kein <select> mehr in der Datei', exp && !/<select\b/i.test(exp.text));
pruef('kein <textarea> mehr in der Datei', exp && !/<textarea\b/i.test(exp.text));
pruef('die Schrift steckt als data:-Quelle mit in der Datei',
  exp && /@font-face\s*\{[^}]*src\s*:\s*url\(\s*data:/.test(exp.text));
pruef('kein <link> und kein Verweis auf Google in der Datei',
  exp && !/<link\b/i.test(exp.text) && !/fonts\.g(oogleapis|static)/i.test(exp.text));
pruef('Gegenprobe: die Datei ist gross genug, um ein Blatt zu tragen',
  exp && exp.text.length > 100000, exp && exp.text.length);
pruef('das Exportfenster ist danach zu', (await zaehl('[data-schleier="exp"]')) === 0);

/* ---------------------------------------------------------------- Abschluss */
await b.close();
server.close();
ende(fehler);
