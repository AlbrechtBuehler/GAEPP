/* GAEPP — Pruefstand: das Telefon.
   390 x 844. Am Schreibtisch stehen zwoelf Spalten nebeneinander, auf dem
   Telefon steht ein Monat untereinander — das ist eine eigene Fassung und
   nicht dieselbe Tabelle in klein. Sie kann darum auch eigene Fehler haben,
   und einen hatte sie: Gruppen und ihre Glaeubiger standen flach nebeneinander,
   wer die sichtbaren Zeilen addierte, kam auf das Doppelte. Diese Probe steht
   unten und bleibt stehen.

   hilfe.mjs setzt fest 1440 x 900. Dieser Lauf braucht ein schmales Fenster und
   baut sich den Kontext deshalb selbst — nach derselben Vorlage, nur mit
   anderem Mass. serve() und bilanzbuch() sind unveraendert uebernommen. */

import { readFileSync } from 'fs';
import { chromium } from 'playwright';
import { serve, bilanzbuch } from './hilfe.mjs';
import { daten, STICHMONAT, STICHJAHR, STICHM, JAHRE } from './vorrat.mjs';

const PORT = 8734;
const BREIT = 1440, SCHMAL = 390, HOCH = 844;

/* ============================================ Der Datenstand, unabhaengig ===
   Nachgerechnet wird aus vorrat.mjs, nicht aus der App. Der Pruefvorrat traegt
   weder Korrekturen noch Spiegelzeilen — deshalb reicht hier die schlichte
   Rechnung, und sie ist keine Abschrift der App, sondern die Summe der Reihen. */
const D = daten();
const MZ = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const ML = ['Januar','Februar','März','April','Mai','Juni','Juli','August',
            'September','Oktober','November','Dezember'];
const zaehl = w => seite.evaluate(x => document.querySelectorAll(x).length, w);
const text  = w => seite.evaluate(x => { const e = document.querySelector(x);
  return e ? (e.textContent || '').trim() : null; }, w);
const sektionen = j => D.daten[j] || [];
const posWert  = (p, m) => (p.reihe || [])[m] || 0;
const grpWert  = (g, m) => (g.pos || []).reduce((a, p) => a + posWert(p, m), 0);
const sekWert  = (s, m) => s.art === 'schulden'
  ? (s.gruppen || []).reduce((a, g) => a + grpWert(g, m), 0)
  : (s.pos || []).reduce((a, p) => a + posWert(p, m), 0);
const rechWert = (j, m) => (D.rechnungen[j] || []).reduce((a, g) =>
  a + (g.rechnungen || []).reduce((s, r) => s + ((r.reihe || [])[m] || 0), 0), 0);
const saldoVon = (j, m) => {
  let ein = 0, aus = 0;
  sektionen(j).forEach(s => { const v = sekWert(s, m); if (s.vz === 1) ein += v; else aus += v; });
  return ein - (aus + rechWert(j, m));
};
const sekVon = (j, key) => sektionen(j).find(s => s.key === key);

/* Restschuld am Stichmonat: jede Schuld traegt ihren Anfangsstand aus dem
   ersten Jahrgang, den die Folgejahre fortschreiben. Eine Rate tilgt hoechstens
   bis null. Ohne Korrekturen im Vorrat ist das die ganze Rechnung. */
const nachRaten = (basis, raten) => raten < 0 ? basis - raten
  : (basis <= 0 ? basis : Math.max(0, basis - raten));
const schuldPos = (j, gKey, pKey) => {
  const s = sektionen(j).find(x => x.art === 'schulden'); if (!s) return null;
  const g = (s.gruppen || []).find(x => x.key === gKey); if (!g) return null;
  return (g.pos || []).find(x => x.key === pKey) || null;
};
const vorjahr = j => { const k = JAHRE.filter(x => x < j); return k.length ? Math.max(...k) : null; };
function basisVon(j, gKey, pKey, eigen) {
  const v = vorjahr(j); if (v === null) return eigen || 0;
  const vp = schuldPos(v, gKey, pKey); if (!vp) return eigen || 0;
  const vorBasis = basisVon(v, gKey, pKey, vp.basis);
  const raten = (vp.reihe || []).reduce((a, x) => a + x, 0);
  if (vorBasis === 0 && raten === 0) return eigen || 0;   /* leeres Geruest ist durchlaessig */
  return nachRaten(vorBasis, raten);
}
function restschuld() {
  const s = sektionen(STICHJAHR).find(x => x.art === 'schulden'); if (!s) return 0;
  let r = 0;
  (s.gruppen || []).forEach(g => (g.pos || []).forEach(p => {
    r += nachRaten(basisVon(STICHJAHR, g.key, p.key, p.basis),
      (p.reihe || []).slice(0, STICHM + 1).reduce((a, x) => a + x, 0)); }));
  return r;
}

/* Dieselbe Schreibweise wie im Werkzeug: kaufmaennisch symmetrisch gerundet,
   Tausender mit Apostroph, Minus als echtes Minuszeichen, die Null bleibt leer. */
const runde = n => (n < 0 ? -1 : 1) * Math.round(Math.abs(n));
const schreib = (n, immer) => { const r = runde(n || 0);
  if (r === 0 && !immer) return '';
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'"); };
/* Und zurueck: aus einer gelesenen Zelle eine Zahl. */
const lies = t => { const s = String(t == null ? '' : t)
    .replace(/[’'   ]/g, '').replace(/[−–—]/g, '-').trim();
  if (!s) return 0;
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : null; };

/* ============================================================ Der Lauf ===== */
const server = await serve(PORT);
const wie = process.env.GAEPP_CHROME
  ? { executablePath: process.env.GAEPP_CHROME, args: ['--no-sandbox'] } : {};
const b = await chromium.launch(wie);
const kontext = await b.newContext({ viewport: { width: SCHMAL, height: HOCH },
  locale: 'de-CH', timezoneId: 'Europe/Zurich' });
const seite = await kontext.newPage();
const fehler = [];
seite.on('pageerror', e => fehler.push(String(e)));
const belanglos = t => /Failed to load resource|favicon|fonts\.g/i.test(t);
seite.on('console', m => { if (m.type() === 'error' && !belanglos(m.text()))
  fehler.push('console: ' + m.text()); });
await seite.goto('http://127.0.0.1:' + PORT + '/index.html');
/* Auf dem Telefon steht keine Tabelle — gewartet wird auf die Liste. */
await seite.waitForFunction(() => document.querySelectorAll('.mListe .mZeile').length > 0,
  null, { timeout: 8000 });

const { pruef, gleich, ende } = bilanzbuch('mobil');
const ruhe = () => seite.waitForTimeout(150);

/* Die Liste, so wie sie dasteht: Klasse, gemessener Einzug, Name, Zahl. */
const listeLesen = () => seite.evaluate(() => [...document.querySelectorAll('.mListe > *')]
  .map(x => ({ kl: x.className,
    einzug: Math.round(x.querySelector('.n').getBoundingClientRect().left),
    name: x.querySelector('.n').textContent,
    text: x.querySelector('.w').textContent,
    versal: getComputedStyle(x.querySelector('.n')).textTransform,
    gewicht: getComputedStyle(x.querySelector('.w')).fontWeight })));

/* ================================================================ Kopf ===== */
console.log('\nKopf — 64 px, Wortmarke, drei Zeichen');
const kopf = await seite.evaluate(() => {
  const k = document.querySelector('.mKopf');
  const r = k.getBoundingClientRect();
  const kn = [...k.querySelectorAll('.zeichen button')];
  const mass = e => { const q = e.getBoundingClientRect();
    return { w: Math.round(q.width * 10) / 10, h: Math.round(q.height * 10) / 10 }; };
  return {
    hoch: Math.round(r.height), breit: Math.round(r.width),
    wort: k.querySelector('.wort') ? k.querySelector('.wort').textContent.trim() : null,
    wortVersal: k.querySelector('.wort') ? getComputedStyle(k.querySelector('.wort')).textTransform : null,
    n: kn.length,
    svg: kn[0] ? kn[0].querySelectorAll('svg path').length : 0,
    svgMass: kn[0] && kn[0].querySelector('svg') ? mass(kn[0].querySelector('svg')) : null,
    quadrat: kn[1] && kn[1].querySelector('.z-quadrat')
      ? Object.assign(mass(kn[1].querySelector('.z-quadrat')),
          { rund: getComputedStyle(kn[1].querySelector('.z-quadrat')).borderRadius }) : null,
    kreis: kn[2] && kn[2].querySelector('.z-kreis')
      ? Object.assign(mass(kn[2].querySelector('.z-kreis')),
          { rund: getComputedStyle(kn[2].querySelector('.z-kreis')).borderRadius }) : null,
    zeichenLinks: kn.length ? Math.round(kn[0].getBoundingClientRect().left) : null,
    wortRechts: k.querySelector('.wort') ? Math.round(k.querySelector('.wort').getBoundingClientRect().right) : null,
    zeichenRechts: kn.length ? Math.round(kn[kn.length-1].getBoundingClientRect().right) : null
  };
});
gleich('der Kopf ist 64 px hoch', kopf.hoch, 64);
gleich('der Kopf traegt die Wortmarke', kopf.wort, 'GÄPP');
gleich('die Wortmarke steht in Versalien', kopf.wortVersal, 'uppercase');
gleich('rechts stehen drei Zeichen', kopf.n, 3);
pruef('die Zeichen stehen rechts von der Wortmarke und im Bild',
  kopf.zeichenLinks > kopf.wortRechts && kopf.zeichenRechts <= 390,
  kopf.wortRechts + ' | ' + kopf.zeichenLinks + ' … ' + kopf.zeichenRechts);
pruef('das erste Zeichen ist ein Dreieck (ein SVG-Pfad, breiter als hoch)',
  kopf.svg === 1 && kopf.svgMass && kopf.svgMass.w > kopf.svgMass.h,
  JSON.stringify(kopf.svgMass));
pruef('das zweite Zeichen ist ein Quadrat (gleich breit wie hoch, ohne Rundung)',
  !!kopf.quadrat && kopf.quadrat.w === kopf.quadrat.h && /^0px/.test(kopf.quadrat.rund),
  JSON.stringify(kopf.quadrat));
pruef('das dritte Zeichen ist ein Kreis (gleich breit wie hoch, halb gerundet)',
  !!kopf.kreis && kopf.kreis.w === kopf.kreis.h
  && parseFloat(kopf.kreis.rund) >= kopf.kreis.w / 2 - 0.2,
  JSON.stringify(kopf.kreis));

/* =========================================================== Schiene ======= */
console.log('\nMonatsschiene — zwoelf Ziffern, der gewaehlte gross');
const schiene = await seite.evaluate(() => {
  const s = document.querySelector('.mSchiene');
  const kn = [...s.querySelectorAll('.mMonate button')];
  const j = s.querySelector('.mJahr');
  const jr = j.getBoundingClientRect();
  return { monate: kn.map(x => x.textContent.trim()),
    an: kn.filter(x => x.classList.contains('an')).map(x => x.textContent.trim()),
    masse: kn.map(x => ({ t: x.textContent.trim(),
      gr: parseFloat(getComputedStyle(x).fontSize),
      gw: getComputedStyle(x).fontWeight })),
    /* Gemessen wird der rechte Rand der ROLLENDEN SCHIENE, nicht der der
       einzelnen Knoepfe: bei zwoelf Monaten auf 390 Punkten ragen die hinteren
       ueber den Container hinaus, und ihr Rand sagt nichts darueber, wo die
       Schiene aufhoert. Bis 3.4.0 stand hier das Maximum der Knopfraender und
       war nur zufaellig gruen — aufgefallen, als der Ansichtsumschalter in
       dieselbe Zeile kam und die Schiene schmaler wurde. */
    monateRechts: Math.round(s.querySelector('.mMonate').getBoundingClientRect().right),
    jahr: j.textContent.trim(),
    jl: Math.round(jr.left), jr: Math.round(jr.right), jw: Math.round(jr.width),
    fenster: window.innerWidth };
});
gleich('zwoelf Ziffern in der Schiene', schiene.monate.join(','), MZ.join(','));
pruef('Gegenprobe: so viele Monatsknoepfe hat die Pruefung angesehen',
  schiene.masse.length === 12, schiene.masse.length);
gleich('genau ein Monat ist gewaehlt', schiene.an.join(','), MZ[STICHM]);
const anMass = schiene.masse.find(x => x.t === MZ[STICHM]);
const ausMass = schiene.masse.filter(x => x.t !== MZ[STICHM]);
pruef('der gewaehlte Monat steht groesser als die uebrigen',
  ausMass.every(x => anMass.gr > x.gr), anMass.gr + ' gegen ' + ausMass[0].gr);
pruef('der gewaehlte Monat steht halbfett',
  parseInt(anMass.gw, 10) >= 500 && ausMass.every(x => parseInt(x.gw, 10) < 500),
  anMass.gw + ' gegen ' + ausMass[0].gw);
gleich('der Jahrgang steht in der Schiene', schiene.jahr, String(STICHJAHR));
pruef('der Jahrgang steht rechts von den Monaten',
  schiene.jl >= schiene.monateRechts, schiene.jl + ' >= ' + schiene.monateRechts);
pruef('der Jahrgang ist ganz sichtbar und nicht aus dem Bild geschoben',
  schiene.jw > 0 && schiene.jl >= 0 && schiene.jr <= schiene.fenster,
  'links ' + schiene.jl + ', rechts ' + schiene.jr + ', Fenster ' + schiene.fenster);

/* ========================================================= Kennzahlen ====== */
console.log('\nKennzahlen — Restschuld und Schuldenfrei');
const band = await seite.evaluate(() => ({
  k: [...document.querySelectorAll('.mBand .k')].map(x => x.textContent.trim()),
  v: [...document.querySelectorAll('.mBand .v')].map(x => x.textContent.trim()) }));
gleich('zwei Kennzahlen', band.k.length, 2);
gleich('die Beschriftungen', band.k.join(' · '), 'Restschuld · Schuldenfrei');
gleich('die Restschuld stimmt mit dem Datenstand', band.v[0], schreib(restschuld(), true));
/* «Schuldenfrei» ist ein Termin, den die App aus dem Verlauf jeder einzelnen
   Schuld hochrechnet. Diese Rechnung hier nachzubilden hiesse, sie abzuschreiben
   — die Zahl waere dann keine Pruefung mehr. Geprueft wird darum nur, dass die
   Kennzahl ueberhaupt eine Auskunft traegt; ihr Wert gehoert in den Lauf, der
   die Kennzahlen selbst pruef. */
pruef('«Schuldenfrei» traegt eine Auskunft', (band.v[1] || '').length > 0, band.v[1]);

/* =============================================================== Liste ===== */
console.log('\nListe — drei Stufen, und keine doppelte Summe');
/* Aufgeklappt wird durch Tippen, so wie am Telefon: erst die Kategorie, dann
   ihre Gruppen. */
const tippKat = async name => {
  await seite.evaluate(n => { const kn = [...document.querySelectorAll('.mKat')]
    .find(x => x.querySelector('.n').textContent.trim() === n); if (kn) kn.click(); }, name);
  await ruhe();
};
const tippGrp = async name => {
  await seite.evaluate(n => { const kn = [...document.querySelectorAll('.mGrp')]
    .find(x => x.querySelector('.n').textContent.trim() === n); if (kn) kn.click(); }, name);
  await ruhe();
};
const SCHULD = sektionen(STICHJAHR).find(s => s.art === 'schulden');
const FIX = sekVon(STICHJAHR, 'fixkosten');
await tippKat(SCHULD.name);
for (const g of SCHULD.gruppen) await tippGrp(g.name);
await tippKat(FIX.name);

const liste = await listeLesen();
const einzugKat = (liste.find(x => /(^| )mKat( |$)/.test(x.kl)) || {}).einzug;
const einzugGrp = (liste.find(x => /(^| )mGrp( |$)/.test(x.kl)) || {}).einzug;
const einzugPosTief = (liste.find(x => /mPos tief/.test(x.kl)) || {}).einzug;
const einzugPos = (liste.find(x => /(^| )mPos( |$)/.test(x.kl) && !/tief/.test(x.kl)) || {}).einzug;

const katZeilen = liste.filter(x => x.kl.indexOf('mKat') === 0);
pruef('Kategorien stehen in Versalien',
  katZeilen.length >= 7 && katZeilen.every(x => x.versal === 'uppercase'),
  katZeilen.length + ' Kategorien: ' + katZeilen.map(x => x.versal).join(','));
pruef('Gegenprobe: die Namen im Datenstand sind nicht schon versal geschrieben',
  sektionen(STICHJAHR).every(s => s.name !== s.name.toUpperCase()),
  sektionen(STICHJAHR).map(s => s.name).join(', '));
pruef('Positionen sind gegen die Kategorie eingerueckt',
  einzugPos > einzugKat, einzugKat + ' -> ' + einzugPos);
pruef('Gruppen stehen auf einer EIGENEN Stufe zwischen Kategorie und Position',
  einzugGrp > einzugKat && einzugPosTief > einzugGrp
  && einzugGrp !== einzugPos && einzugGrp !== einzugPosTief,
  'Kat ' + einzugKat + ' · Grp ' + einzugGrp + ' · Pos ' + einzugPos
  + ' · Pos unter Gruppe ' + einzugPosTief);

/* Der Block einer Kategorie: alles, was ihr folgt, bis die naechste Kategorie
   oder eine Summenzeile kommt. */
function block(name) {
  const i = liste.findIndex(x => x.kl.indexOf('mKat') === 0 && x.name.trim() === name);
  if (i < 0) return null;
  const raus = [];
  for (let k = i + 1; k < liste.length; k++) {
    if (liste[k].kl.indexOf('mKat') === 0 || liste[k].kl.indexOf('mSum') === 0) break;
    raus.push(liste[k]);
  }
  return { kopf: liste[i], zeilen: raus };
}
const bSchuld = block(SCHULD.name);
const bFix = block(FIX.name);
pruef('Gegenprobe: so viele Zeilen haben die Summenproben angesehen',
  !!bSchuld && !!bFix && bSchuld.zeilen.length >= 8 && bFix.zeilen.length >= 4,
  (bSchuld ? bSchuld.zeilen.length : '?') + ' unter «' + SCHULD.name + '», '
  + (bFix ? bFix.zeilen.length : '?') + ' unter «' + FIX.name + '»');

/* Die Summe der Positionen einer Gruppe gegen die Gruppenzeile. */
let gruppenGeprueft = 0, gruppenFehler = null;
if (bSchuld) {
  let laufend = null, summe = 0;
  const schliesse = () => { if (!laufend) return;
    gruppenGeprueft++;
    if (summe !== lies(laufend.text) && gruppenFehler === null)
      gruppenFehler = laufend.name + ': Positionen ' + summe + ', Gruppenzeile ' + laufend.text;
    laufend = null; };
  bSchuld.zeilen.forEach(z => {
    if (z.einzug === einzugGrp) { schliesse(); laufend = z; summe = 0; }
    else if (z.einzug === einzugPosTief && laufend) summe += lies(z.text); });
  schliesse();
}
pruef('die Positionen einer Gruppe summieren sich zur Gruppenzeile',
  gruppenFehler === null, gruppenFehler);
gleich('Gegenprobe: so viele Gruppen hat die Pruefung nachgerechnet',
  gruppenGeprueft, SCHULD.gruppen.length);

/* Die Summe der Gruppen gegen die Kategoriezeile — und die Probe, die den
   Fehler gefunden hat: die oberste Stufe darf nicht das Doppelte ergeben. */
const stufe1 = bSchuld ? bSchuld.zeilen.filter(z => z.einzug === einzugGrp) : [];
const stufe1Summe = stufe1.reduce((a, z) => a + lies(z.text), 0);
const katSoll = sekWert(SCHULD, STICHM);
gleich('die Kategoriezeile stimmt mit dem Datenstand',
  lies(bSchuld.kopf.text), katSoll);
gleich('die Gruppen summieren sich zur Kategoriezeile', stufe1Summe, katSoll);
pruef('die Zeilen EINER Stufe addieren sich nicht zur doppelten Kategoriesumme',
  katSoll !== 0 && stufe1Summe !== 2 * katSoll && stufe1Summe === katSoll,
  stufe1Summe + ' gegen ' + katSoll + ' (doppelt waere ' + 2 * katSoll + ')');
/* Der Gegenbeweis dazu: flach gelesen, ueber beide Stufen hinweg, kaeme genau
   das Doppelte heraus. Deshalb muessen die Stufen sichtbar getrennt sein — was
   oben am Einzug gemessen ist. */
const flach = bSchuld.zeilen.reduce((a, z) => a + lies(z.text), 0);
gleich('flach ueber beide Stufen gelesen waere es das Doppelte — daher die Stufen',
  flach, 2 * katSoll);

/* Eine Kategorie ohne Gruppen rechnet auf einer Stufe. */
const fixSoll = sekWert(FIX, STICHM);
gleich('die Kategoriezeile ohne Gruppen stimmt mit dem Datenstand',
  lies(bFix.kopf.text), fixSoll);
gleich('ihre sichtbaren Zeilen summieren sich zur Kategoriezeile',
  bFix.zeilen.reduce((a, z) => a + lies(z.text), 0), fixSoll);

/* ======================================================= Kleinbetraege ===== */
console.log('\nKleinbetraege — eine Zeile fuer viele');
const echteNamen = (FIX.pos || []).map(p => p.name);
const gefaltet = bFix.zeilen.filter(z => z.name.indexOf(' · ') >= 0 && echteNamen.indexOf(z.name) < 0);
pruef('es gibt eine zusammengefasste Zeile', gefaltet.length === 1,
  gefaltet.map(z => z.name).join(' / ') || 'keine');
if (gefaltet.length === 1) {
  const teile = gefaltet[0].name.split(' · ');
  const gefunden = teile.map(t => (FIX.pos || []).find(p => p.name === t));
  pruef('sie nennt lauter Posten aus dem Datenstand',
    gefunden.every(Boolean) && teile.length >= 2, teile.join(' / '));
  const soll = gefunden.filter(Boolean).reduce((a, p) => a + posWert(p, STICHM), 0);
  gleich('ihre Summe stimmt mit der Summe der zusammengefassten Posten',
    lies(gefaltet[0].text), soll);
  pruef('die zusammengefassten Posten stehen nicht zusaetzlich einzeln da',
    teile.every(t => !bFix.zeilen.some(z => z.name.trim() === t)), teile.join(' / '));
  pruef('Gegenprobe: so viele Posten hat die Pruefung zusammengezaehlt',
    teile.length >= 2, teile.length + ' von ' + (FIX.pos || []).length);
}

/* ================================================================ Fuss ===== */
console.log('\nFester Fuss — Saldo des gewaehlten Monats');
const fuss = await seite.evaluate(() => {
  const f = document.querySelector('.fusszeile');
  const r = f.getBoundingClientRect();
  return { k: f.querySelector('.k') ? f.querySelector('.k').textContent.trim() : null,
    v: f.querySelector('.v') ? f.querySelector('.v').textContent.trim() : null,
    unten: Math.round(r.bottom), hoch: Math.round(r.height),
    fenster: window.innerHeight, pos: getComputedStyle(f).position };
});
/* Umgedreht mit Fassung 3.4.0: der Fuss trug «Saldo 08». Jetzt nennt er den
   Monat ausgeschrieben und sagt, was die Zahl bedeutet — sie ist die Auskunft,
   auf die es im Alltag ankommt, und traegt darum auch ein Wort. */
gleich('der Fuss nennt den gewaehlten Monat ausgeschrieben',
  String(fuss.k).split('·')[0].trim(), ML[STICHM]);
pruef('und sagt, ob etwas bleibt oder fehlt',
  /· (bleibt|fehlt)$/.test(String(fuss.k)), fuss.k);
pruef('Gegenprobe: das Wort passt zum Vorzeichen der Zahl',
  (lies(fuss.v) < 0) === /fehlt$/.test(String(fuss.k)), fuss.k + ' / ' + fuss.v);
gleich('er zeigt den Saldo des gewaehlten Monats',
  fuss.v, schreib(saldoVon(STICHJAHR, STICHM), true));
pruef('er steht fest am unteren Rand',
  fuss.hoch > 0 && Math.abs(fuss.unten - fuss.fenster) <= 1,
  'Unterkante ' + fuss.unten + ', Fenster ' + fuss.fenster);

/* ======================================================= Monatswechsel ===== */
console.log('\nMonatswechsel — eine andere Spalte, nicht dieselbe');
const ZIEL = 11;                                   /* Dezember: dort steht mehr als im August */
const posName = 'Steuern';
const zeigt = async name => (await listeLesen())
  .filter(z => z.name.trim() === name).map(z => z.text)[0];
const vorher = await zeigt(posName);
const katVorher = await zeigt(FIX.name);
gleich('vor dem Wechsel: «' + posName + '» steht auf dem Datenstand des Stichmonats',
  vorher, schreib(posWert((FIX.pos || []).find(p => p.name === posName), STICHM)));
gleich('vor dem Wechsel: die Kategorie «' + FIX.name + '» ebenso',
  katVorher, schreib(sekWert(FIX, STICHM)));
await seite.click('[data-m-monat="' + ZIEL + '"]');
await ruhe();
const nachher = await seite.evaluate(() => {
  const kn = [...document.querySelectorAll('.mMonate button')];
  return { an: kn.filter(x => x.classList.contains('an')).map(x => x.textContent.trim()).join(','),
    fuss: document.querySelector('.fusszeile .k').textContent.trim(),
    fussV: document.querySelector('.fusszeile .v').textContent.trim() };
});
gleich('der getippte Monat ist danach der gewaehlte', nachher.an, MZ[ZIEL]);
const nachWert = await zeigt(posName);
const katNachher = await zeigt(FIX.name);
gleich('nach dem Wechsel: «' + posName + '» steht auf dem Datenstand des neuen Monats',
  nachWert, schreib(posWert((FIX.pos || []).find(p => p.name === posName), ZIEL)));
gleich('nach dem Wechsel: die Kategorie «' + FIX.name + '» ebenso',
  katNachher, schreib(sekWert(FIX, ZIEL)));
pruef('die gezeigte Spalte hat sich wirklich geaendert',
  vorher !== nachWert && katVorher !== katNachher,
  '«' + vorher + '» -> «' + nachWert + '», «' + katVorher + '» -> «' + katNachher + '»');
gleich('der Fuss folgt dem Monat', String(nachher.fuss).split('·')[0].trim(), ML[ZIEL]);
gleich('und zeigt dessen Saldo aus dem Datenstand', nachher.fussV,
  schreib(saldoVon(STICHJAHR, ZIEL), true));

/* =================================================== Jahrgang und Ansicht == */
console.log('\nJahrgang und Ansicht');
const ANDERS = JAHRE.find(j => j !== STICHJAHR && (D.rechnungen[j] || []).length === 0)
  || JAHRE[0];
/* Umgebaut mit Fassung 3.4.0. Die Jahrgaenge standen in einer eigenen Zeile
   unter den Monaten; zusammen mit der Monatsschiene war das ein Fuenftel der
   Hoehe fuer etwas, das man selten braucht. Jetzt oeffnet die Jahreszahl die
   Wahl. Geprueft wird der ganze Weg — oeffnen, waehlen, und dass die Wahl
   sich danach von selbst schliesst. */
gleich('die Jahrgangswahl ist zu, bevor man sie oeffnet',
  await zaehl('[data-schleier="mjahr"]'), 0);
await seite.click('[data-m-jahr-auf]');
await ruhe();
gleich('die Jahreszahl oeffnet die Wahl', await zaehl('[data-schleier="mjahr"]'), 1);
gleich('sie fuehrt jeden Jahrgang',
  await zaehl('[data-schleier="mjahr"] [data-geh-jahr]'), JAHRE.length);
await seite.click('[data-schleier="mjahr"] [data-geh-jahr="' + ANDERS + '"]');
await ruhe();
const nachJahr = await seite.evaluate(() => ({
  jahr: document.querySelector('.mJahr').textContent.trim(),
  offen: document.querySelectorAll('[data-schleier="mjahr"]').length }));
gleich('der Jahrgang laesst sich wechseln', nachJahr.jahr, String(ANDERS));
gleich('und die Wahl schliesst sich danach von selbst', nachJahr.offen, 0);
await seite.click('[data-m-jahr-auf]');
await ruhe();
await seite.click('[data-schleier="mjahr"] [data-geh-jahr="' + STICHJAHR + '"]');
await ruhe();

/* Die Ansicht ist ein Umschalter geworden: ein Wort, das nennt, worauf man
   schaut, und beim Tippen wechselt. Zwei Knoepfe nebeneinander passten neben
   Monate und Jahreszahl nicht mehr in eine Zeile. */
gleich('der Umschalter nennt die laufende Ansicht',
  await text('.mSchiene .ans'), 'Budget');
await seite.click('[data-m-ans]');
await ruhe();
const rech = await seite.evaluate(() => ({
  hell: document.querySelector('.mSchiene .ans').textContent.trim(),
  kats: [...document.querySelectorAll('.mListe .mKat .n')].map(x => x.textContent.trim()),
  summe: (document.querySelector('.mListe .mSum.stark .n') || {}).textContent,
  zeilen: document.querySelectorAll('.mListe .mZeile').length }));
gleich('die Ansicht laesst sich wechseln', rech.hell, 'Rechnungen');
pruef('Gegenprobe: die alte zweite Kopfzeile gibt es nicht mehr',
  (await zaehl('.mNav')) === 0, await zaehl('.mNav'));
const stellerSoll = (D.rechnungen[STICHJAHR] || []).map(g => g.name);
/* Verglichen wird die Menge, nicht die Folge: welche Folge die App waehlt, ist
   ihre Sache — dass es genau diese Steller sind, ist der Datenstand. */
gleich('«Rechnungen» zeigt genau die Rechnungssteller aus dem Datenstand',
  rech.kats.slice().sort().join(' | '), stellerSoll.slice().sort().join(' | '));
/* Dass sie alphabetisch stehen, ist eine eigene Zusage — hier an der sichtbaren
   Folge gemessen, nicht an der Sortierregel im Quelltext. */
const abc = rech.kats.every((n, i) => i === 0
  || n.localeCompare(rech.kats[i-1], 'de-CH', { sensitivity:'base', numeric:true }) >= 0);
pruef('die Rechnungssteller stehen alphabetisch', abc, rech.kats.join(' | '));
gleich('und schliesst mit der Monatssumme der Rechnungen',
  (rech.summe || '').trim(), 'Rechnungen ' + MZ[ZIEL]);
pruef('Gegenprobe: so viele Zeilen hat die Rechnungsansicht gezeigt',
  rech.zeilen === stellerSoll.length + 1,
  rech.zeilen + ' Zeilen bei ' + stellerSoll.length + ' Stellern');
await seite.click('[data-m-ans]');   /* zurueck ins Budget — derselbe Umschalter */
await ruhe();

/* ============================================================= Breite ====== */
console.log('\nBreite — die Liste und die Tabelle, in beide Richtungen');
const was = () => seite.evaluate(() => ({
  mobil: document.body.getAttribute('data-mobil'),
  tabellen: document.querySelectorAll('.blatt table').length,
  listen: document.querySelectorAll('.blatt .mListe').length }));
const schmalVor = await was();
pruef('bei 390 px steht die Liste da',
  schmalVor.mobil === '1' && schmalVor.listen === 1 && schmalVor.tabellen === 0,
  JSON.stringify(schmalVor));
await seite.setViewportSize({ width: BREIT, height: HOCH });
await seite.waitForTimeout(250);
const breit = await was();
pruef('bei 1440 px steht die Tabelle da',
  breit.mobil === '0' && breit.tabellen === 1 && breit.listen === 0,
  JSON.stringify(breit));
await seite.setViewportSize({ width: SCHMAL, height: HOCH });
await seite.waitForTimeout(250);
const schmalWieder = await was();
pruef('und zurueck bei 390 px wieder die Liste',
  schmalWieder.mobil === '1' && schmalWieder.listen === 1 && schmalWieder.tabellen === 0,
  JSON.stringify(schmalWieder));

/* ===================================== Der Fuss unter der Browserleiste ==== */
/* Albrechts Befund vom 26.09.2026: auf dem iPhone in Safari war die Zeile mit
   dem Saldo nicht zu sehen — die wichtigste Zahl des Blatts. Ursache war
   `height:100vh`: auf dem Telefon rechnet vh die Adressleiste NICHT mit, die
   Seite wird hoeher als das Sichtbare, und das Unterste faellt dahinter.

   Dieser Lauf hatte es nicht finden koennen, weil ein Browser ohne
   Bedienleisten das Problem nicht hat. Nachgestellt wird es darum mit einem
   kuerzeren Fenster: so viel bleibt uebrig, wenn Safari oben und unten seine
   Leisten stellt. Gemessen wird, ob die Zeile ganz im Fenster liegt. */
console.log('\nDer Fuss bleibt sichtbar, auch wenn der Browser Platz nimmt');
const HOCH_GEKAPPT = 664;
for (const h of [HOCH, HOCH_GEKAPPT, 560]) {
  await seite.setViewportSize({ width: SCHMAL, height: h });
  await seite.waitForTimeout(250);
  const f = await seite.evaluate(() => {
    const e = document.querySelector('.fusszeile');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { unten: Math.round(r.bottom), oben: Math.round(r.top),
      fenster: window.innerHeight, hoehe: Math.round(r.height),
      zahl: (e.querySelector('.v') || {}).textContent };
  });
  pruef('bei ' + h + ' px Fensterhoehe steht der Fuss ganz im Bild',
    f !== null && f.unten <= f.fenster + 1 && f.oben >= 0 && f.hoehe > 0,
    f && (f.oben + '–' + f.unten + ' in ' + f.fenster));
  pruef('und traegt dabei eine Zahl (Gegenprobe: er ist nicht bloss leer da)',
    !!(f && String(f.zahl || '').trim()), f && f.zahl);
}
await seite.setViewportSize({ width: SCHMAL, height: HOCH });
await seite.waitForTimeout(200);

/* Die Messung oben haelt das Layout fest, aber NICHT die Ursache: in einem
   Browser ohne Bedienleisten sind vh und dvh dasselbe, der alte Fehler waere
   hier gruen durchgelaufen. Was sich pruefen laesst, ist die Regel selbst —
   darum wird sie aus dem Quelltext gelesen und nicht aus der Wirkung
   geschlossen. Dass es auf dem Telefon stimmt, hat nur ein Telefon gezeigt;
   dieser Satz steht hier, damit niemand die Messung oben fuer mehr haelt,
   als sie ist. */
const quelle = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const hoehenRegel = /body\{[^}]*?height:100vh;height:100dvh;/.test(quelle);
pruef('der Koerper misst 100dvh, mit 100vh als Rueckfall davor',
  hoehenRegel, (/height:100[a-z]+/.exec(quelle) || [])[0]);
pruef('Gegenprobe: 100vh allein steht nirgends mehr am Koerper',
  !/body\{[^}]*?height:100vh;(?!height:100dvh)/.test(quelle), 'geprueft');
pruef('der Fuss haelt Abstand zur Home-Anzeige (safe-area)',
  /\.fusszeile\{[^}]*safe-area-inset-bottom/.test(quelle.replace(/\s+/g, ' ')),
  'geprueft');

/* ===================================================== Aendern (3.5.0) ===== */
/* Bis 3.4.0 liess sich am Telefon nur lesen. Albrecht am 24.10.2026: «nichts
   aenderbar, Bedienung zaeh». Geprueft wird in einem eigenen Kontext MIT
   Beruehrung — Wischen gibt es ohne nicht —, frisch aus der Startdatei, damit
   nichts aus dem Lauf oben hineinwirkt. Erwartet wird aus vorrat.mjs. */
console.log('\nAendern am Telefon — Tippflaechen, Wertfenster, Wischen');
const tk = await b.newContext({ viewport: { width: SCHMAL, height: HOCH },
  locale: 'de-CH', timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: true });
const tp = await tk.newPage();
tp.on('pageerror', e => fehler.push('beruehrt: ' + String(e)));
tp.on('console', m => { if (m.type() === 'error' && !belanglos(m.text()))
  fehler.push('beruehrt, console: ' + m.text()); });
await tp.goto('http://127.0.0.1:' + PORT + '/index.html');
await tp.waitForFunction(() => document.querySelectorAll('.mListe .mZeile').length > 0,
  null, { timeout: 8000 });
const tRuhe = () => tp.waitForTimeout(150);
const tText = w => tp.evaluate(x => { const e = document.querySelector(x);
  return e ? (e.textContent || '').trim() : null; }, w);
const tZaehl = w => tp.evaluate(x => document.querySelectorAll(x).length, w);

/* Tippflaechen. Gemessen wird nicht die Regel im Quelltext, sondern was der
   Finger trifft: elementFromPoint 20 Punkte ueber und unter der Mitte muss
   noch denselben Knopf liefern. 44 Punkte Hoehe heisst 22 je Seite. */
const flaeche = await tp.evaluate(() => {
  const trifft = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const bei = (dy) => { const t = document.elementFromPoint(cx, cy + dy);
      return !!t && (t === e || e.contains(t)); };
    return { oben: bei(-20), unten: bei(20), weit: bei(60), sichtbarH: Math.round(r.height) }; };
  return { monat: trifft('.mMonate button.an'), jahr: trifft('.mJahr'),
    ans: trifft('.mSchiene .ans'), zeichen: trifft('.mKopf .zeichen button') };
});
for (const [n, f] of Object.entries(flaeche)) {
  pruef('Tippflaeche «' + n + '»: 20 Punkte ueber und unter der Mitte trifft noch',
    !!f && f.oben && f.unten, JSON.stringify(f));
  pruef('Gegenprobe «' + n + '»: 60 Punkte daneben trifft nicht mehr',
    !!f && !f.weit, JSON.stringify(f));
}
pruef('der Monatsknopf sieht aus wie vorher (Bild unveraendert, kleiner als die Flaeche)',
  !!flaeche.monat && flaeche.monat.sichtbarH < 40, flaeche.monat && flaeche.monat.sichtbarH);

/* Die Fixkosten aufklappen, die groesste Zeile aendern. Die groesste wird nie
   gefaltet — sie ist kein Kleinbetrag. */
const tFix = sekVon(STICHJAHR, 'fixkosten');
const gross = (tFix.pos || []).slice().sort((a, c) => posWert(c, STICHM) - posWert(a, STICHM))[0];
await tp.locator('.mKat', { hasText: tFix.name }).first().tap();
await tRuhe();
const tZeilen = await tp.evaluate(() => [...document.querySelectorAll('.mListe .mPos')]
  .map(x => ({ pos: x.dataset.mwPos != null, falt: x.dataset.mEntfalten != null,
    h: Math.round(x.getBoundingClientRect().height), knopf: x.tagName === 'BUTTON' })));
pruef('jede Zeile unter «' + tFix.name + '» ist antippbar (Wert oder Aufklappen)',
  tZeilen.length > 0 && tZeilen.every(z => (z.pos || z.falt) && z.knopf),
  JSON.stringify(tZeilen));
pruef('und mindestens 44 Punkte hoch', tZeilen.every(z => z.h >= 44),
  tZeilen.map(z => z.h).join(','));
/* Die gefaltete Zeile klappt auf: danach steht jede Position einzeln da. */
if (tZeilen.some(z => z.falt)) {
  await tp.locator('[data-m-entfalten]').first().tap();
  await tRuhe();
  gleich('die gefaltete Zeile klappt auf — jede Position einzeln antippbar',
    await tZaehl('.mListe [data-mw-pos]'), (tFix.pos || []).length);
  gleich('und eine gefaltete Zeile gibt es danach nicht mehr',
    await tZaehl('.mListe [data-m-entfalten]'), 0);
} else pruef('Pruefvorrat faltet unter «' + tFix.name + '» etwas (sonst fehlt die Probe)', false);

const zeileWert = name => tp.evaluate(n => { const z = [...document.querySelectorAll('.mListe .mPos')]
  .find(x => x.querySelector('.n').textContent.trim() === n);
  return z ? { w: z.querySelector('.w').textContent.trim(), hak: z.classList.contains('hak') } : null; }, name);
const katWert = name => tp.evaluate(n => { const z = [...document.querySelectorAll('.mListe .mKat')]
  .find(x => x.querySelector('.n').textContent.trim() === n);
  return z ? z.querySelector('.w').textContent.trim() : null; }, name);
const oeffne = async name => { await tp.locator('.mListe [data-mw-pos]', { hasText: name }).first().tap();
  await tRuhe(); };
const alt = posWert(gross, STICHM), neuW = alt + 100;
const vz = tFix.vz === 1 ? 1 : -1;

gleich('vor dem Tippen ist kein Wertfenster offen', await tZaehl('[data-schleier="mWert"]'), 0);
await oeffne(gross.name);
gleich('Antippen oeffnet das Wertfenster', await tZaehl('[data-schleier="mWert"]'), 1);
gleich('es nennt die Zeile', await tText('[data-schleier="mWert"] .dtitel h2'), gross.name);
gleich('und den Monat mit Jahrgang', await tText('[data-schleier="mWert"] .dbei'),
  ML[STICHM] + ' ' + STICHJAHR);
gleich('das Feld traegt den Betrag aus dem Datenstand',
  await tp.inputValue('[data-mw-betrag]'), schreib(alt, true));
gleich('das Feld hat den Fokus — die Tastatur kommt sofort',
  await tp.evaluate(() => document.activeElement && document.activeElement.dataset.mwBetrag), '1');
gleich('das Feld verlangt die Zahlentastatur',
  await tp.getAttribute('[data-mw-betrag]', 'inputmode'), 'decimal');

/* Abbrechen laesst alles stehen. */
await tp.fill('[data-mw-betrag]', '999999');
await tp.locator('[data-zu="mWert"]').tap(); await tRuhe();
gleich('Abbrechen schliesst das Fenster', await tZaehl('[data-schleier="mWert"]'), 0);
gleich('und laesst den Betrag stehen', (await zeileWert(gross.name)).w, schreib(alt));

/* Aendern: Zeile, Kategorie und Saldo folgen — gerechnet aus dem Vorrat. */
await oeffne(gross.name);
await tp.fill('[data-mw-betrag]', String(neuW));
await tp.locator('[data-mw-an]').tap(); await tRuhe();
gleich('Uebernehmen schliesst das Fenster', await tZaehl('[data-schleier="mWert"]'), 0);
gleich('die Zeile zeigt den neuen Betrag', (await zeileWert(gross.name)).w, schreib(neuW));
gleich('die Kategorie rechnet mit', await katWert(tFix.name),
  schreib(sekWert(tFix, STICHM) + 100));
gleich('der Saldo unten rechnet mit', await tText('.fusszeile .v'),
  schreib(saldoVon(STICHJAHR, STICHM) + vz * 100, true));

/* Der getippte Betrag ueberlebt das Antippen eines Hakens — das zeichnet neu,
   bevor das Feld verlassen wird. */
await oeffne(gross.name);
await tp.fill('[data-mw-betrag]', String(neuW + 1));
await tp.locator('[data-mw-hak]').tap(); await tRuhe();
gleich('ein getippter Betrag ueberlebt das Antippen des Hakens',
  await tp.inputValue('[data-mw-betrag]'), String(neuW + 1));
await tp.fill('[data-mw-betrag]', String(neuW));
await tp.locator('[data-mw-an]').tap(); await tRuhe();
pruef('«Erledigt» hakt den Monat ab — die Zeile steht halbfett',
  (await zeileWert(gross.name)).hak, JSON.stringify(await zeileWert(gross.name)));
gleich('Gegenprobe: der Betrag ist derselbe geblieben', (await zeileWert(gross.name)).w, schreib(neuW));

/* Ein Haken haengt an einem Betrag: wer auf null setzt, verliert ihn. */
await oeffne(gross.name);
await tp.fill('[data-mw-betrag]', '');
await tp.locator('[data-mw-an]').tap(); await tRuhe();
const leer = await zeileWert(gross.name);
pruef('Betrag geloescht: der Haken faellt mit', !!leer && !leer.hak && leer.w === '',
  JSON.stringify(leer));
const hakenRest = await tp.evaluate(() => Object.keys(S.haken).length);
await oeffne(gross.name);
pruef('und das Fenster zeigt den Haken danach leer',
  !(await tp.evaluate(() => document.querySelector('[data-mw-hak]').classList.contains('an'))));
await tp.locator('[data-zu="mWert"]').tap(); await tRuhe();

/* «Gleicher Betrag bis Dezember»: der Vormonat bleibt, die Folgemonate folgen. */
await oeffne(gross.name);
await tp.fill('[data-mw-betrag]', '777');
await tp.locator('[data-mw-folge]').tap(); await tRuhe();
await tp.locator('[data-mw-an]').tap(); await tRuhe();
const bisDez = await tp.evaluate(id => { const f = findePos(id); return f ? f.p.reihe.slice() : null; },
  gross.id);
pruef('«bis Dezember» setzt den Monat und alle folgenden',
  !!bisDez && bisDez.slice(STICHM).every(v => v === 777), JSON.stringify(bisDez));
pruef('und laesst die Monate davor stehen',
  !!bisDez && bisDez.slice(0, STICHM).every((v, i) => v === posWert(gross, i)),
  JSON.stringify(bisDez && bisDez.slice(0, STICHM)) + ' gegen '
  + JSON.stringify((gross.reihe || []).slice(0, STICHM)));
gleich('Gegenprobe: die Haken anderer Zeilen sind unberuehrt',
  await tp.evaluate(() => Object.keys(S.haken).length), hakenRest);

/* Es bleibt gespeichert: neu laden, derselbe Betrag. */
await tp.reload();
await tp.waitForFunction(() => document.querySelectorAll('.mListe .mZeile').length > 0,
  null, { timeout: 8000 });
await tRuhe();
/* Nach dem Neuladen kommt der Stand aus dem Browserspeicher — gelesen wird er
   am Stichmonat, nicht am angezeigten: der Monat ist Anzeige und reist nicht mit. */
const gespeichert = await tp.evaluate((a) => { let w = null; (S.daten[a.j] || []).forEach(b => (b.pos || [])
  .forEach(p => { if (p.name === a.n && w == null) w = p.reihe[a.m]; })); return w; },
  { j: STICHJAHR, n: gross.name, m: STICHM });
gleich('der geaenderte Betrag ist im Browserspeicher angekommen', gespeichert, 777);

/* Die feste Zeile (Gegenposten Tilgung) nimmt keinen Finger an. */
const fixTipp = await tp.evaluate(() => [...document.querySelectorAll('[data-mw-pos]')]
  .filter(e => { const f = findePos(e.dataset.mwPos); return !f || f.p.fix; }).length);
gleich('keine feste Zeile ist antippbar', fixTipp, 0);

/* Rechnungen: Antippen, «Bezahlt», Steller im Titel. */
const rechJahr = (D.rechnungen[STICHJAHR] || []);
const mitWert = rechJahr.map(g => ({ g, r: (g.rechnungen || []).find(r => ((r.reihe || [])[STICHM] || 0) !== 0) }))
  .find(x => x.r);
if (mitWert) {
  await tp.locator('[data-m-ans]').tap(); await tRuhe();
  await tp.locator('.mKat', { hasText: mitWert.g.name }).first().tap(); await tRuhe();
  await tp.locator('[data-mw-rech="' + mitWert.r.id + '"]').tap(); await tRuhe();
  gleich('Rechnung: Antippen oeffnet das Wertfenster', await tZaehl('[data-schleier="mWert"]'), 1);
  pruef('Rechnung: der Beisatz nennt den Steller',
    (await tText('[data-schleier="mWert"] .dbei') || '').indexOf(mitWert.g.name.toUpperCase()) >= 0
    || (await tText('[data-schleier="mWert"] .dbei') || '').indexOf(mitWert.g.name) >= 0,
    await tText('[data-schleier="mWert"] .dbei'));
  gleich('Rechnung: der Haken heisst «Bezahlt»',
    (await tText('[data-mw-hak]') || '').replace(/\s+/g, ' '), 'Bezahlt in diesem Monat');
  const vorBez = await tp.evaluate(() => document.querySelector('[data-mw-hak]').classList.contains('an'));
  await tp.locator('[data-mw-hak]').tap(); await tRuhe();
  await tp.locator('[data-mw-an]').tap(); await tRuhe();
  const nachBez = await tp.evaluate(id => { const z = document.querySelector('[data-mw-rech="' + id + '"]');
    return z ? z.classList.contains('hak') : null; }, mitWert.r.id);
  gleich('Rechnung: «Bezahlt» schaltet den Monat um', nachBez, !vorBez);
  gleich('Rechnung: kein Fenster bleibt offen', await tZaehl('[data-schleier="mWert"]'), 0);
  await tp.locator('[data-m-ans]').tap(); await tRuhe();
} else pruef('Pruefvorrat hat im Stichmonat eine Rechnung mit Betrag', false);

/* Wischen. Echte Beruehrungen ueber das Chrome-Protokoll — ein synthetisches
   Ereignis aus dem Seitenskript haette nichts bewiesen. */
const cdp = await tk.newCDPSession(tp);
const wisch = async (x1, y1, x2, y2) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
    touchPoints: [{ x: x1 + (x2 - x1) * i / 6, y: y1 + (y2 - y1) * i / 6 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tRuhe();
};
const monatJetzt = () => tText('.mMonate button.an');
const yListe = await tp.evaluate(() => { const r = document.querySelector('#blatt').getBoundingClientRect();
  return Math.round(r.top + Math.min(r.height / 2, 200)); });
const startM = await monatJetzt();
await wisch(320, yListe, 80, yListe);
gleich('nach links wischen: der naechste Monat', await monatJetzt(), MZ[STICHM + 1]);
gleich('und der Saldo unten folgt', await tText('.fusszeile .k'),
  ML[STICHM + 1] + ' · ' + (saldoVon(STICHJAHR, STICHM + 1) < 0 ? 'fehlt' : 'bleibt'));
await wisch(80, yListe, 320, yListe);
gleich('nach rechts wischen: zurueck', await monatJetzt(), startM);
await wisch(200, yListe, 170, yListe);
gleich('Gegenprobe: eine kurze Bewegung wechselt nichts', await monatJetzt(), startM);
await wisch(200, yListe - 120, 290, yListe + 120);
gleich('Gegenprobe: eine schraege Rollbewegung wechselt nichts', await monatJetzt(), startM);
/* Am Jahresrand: in den Nachbarjahrgang, wenn es ihn gibt. */
await tp.locator('[data-m-monat="11"]').tap(); await tRuhe();
const hatFolge = JAHRE.indexOf(STICHJAHR + 1) >= 0;
await wisch(320, yListe, 80, yListe);
gleich('im Dezember nach links: ' + (hatFolge ? 'Januar des Folgejahrs' : 'bleibt stehen'),
  (await monatJetzt()) + ' ' + (await tText('.mJahr')),
  hatFolge ? MZ[0] + ' ' + (STICHJAHR + 1) : MZ[11] + ' ' + STICHJAHR);
await tk.close();

await b.close(); server.close();
ende(fehler);
