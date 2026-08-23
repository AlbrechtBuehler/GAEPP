/* GAEPP — Pruefstand: die Eingabe in der Rechnungen-Tabelle.

   Herkunft. Dieser Lauf ist am 22.08.2026 fuer Albrechts Meldung entstanden:
   das Textfeld in der ersten Spalte sprang auf die Standardbeschriftung (oder
   Teile davon) zurueck, Betraege liessen sich nur erschwert ueberschreiben,
   der Cursor sprang in die zuvor bearbeitete Zelle. Vier Ursachen waren
   gefunden — sie sind die Achse dieses Laufs und bleiben es:

     Ursache 1  MERKFELD kannte «rm» nicht — nach dem Neuzeichnen wurde eine
                Rechnungs-Monatszelle nur ueber [data-m] wiedergesucht, und der
                Fokus landete in der Zelle einer ANDEREN Rechnung.
                -> Abschnitt 1 und 2 (2 ist der eigentliche Fehlerfall).
     Ursache 2  Sofortiges Neuzeichnen im «change» riss die angeklickte Zelle
                weg, bevor der Klick dort ankam. neu() zeichnet ueber
                zeichneBald() erst im naechsten Durchgang; die Tastatur erzwingt
                ueber zeichneJetztFalls() das sofortige Zeichnen.
                -> Abschnitt 1-5, Gegenprobe in Abschnitt 7.
     Ursache 3  Das stille Sichern zeichnete das ganze Blatt neu und riss einen
                halb getippten Namen weg. Es zeichnet jetzt ueber
                zeichneRahmen() nur noch den Kopf nach.  -> Abschnitt 6.
     Ursache 4  zeichne() nahm den noch nicht uebernommenen Wert und die Auswahl
                im Feld nicht mit.  -> jede Pruefung «ist uebernommen».

   Portiert am 23.08.2026 auf den Neubau (V 3.0.0, Bauhaus-Umbau). Was dabei
   nachgezogen wurde — die Namen, nicht die Absicht:
     · Der Rechnungssteller ist keine «kopf»-Zeile mehr, sondern tr.kat.
     · Der Statuspunkt (.punkt) ist fort. Der Zustand des Datenkanals steht
       jetzt im Dreieck oben rechts: gefuellt heisst gesichert, Kontur heisst
       nicht verbunden oder es laeuft gerade etwas — dazu der Satz im Titel des
       Knopfes. Abschnitt 6 misst das Dreieck und den Satz statt der alten Marke.
     · Der Kopf war dreigeteilt (#leiste, #band, #blattkopf), dazu #druckkopf,
       #druckfuss, #fusszeile und #dialoge. Abschnitt 6 sieht deshalb nicht mehr
       nur #blatt und #leiste an, sondern belegt fuer JEDEN dieser Bereiche,
       dass das stille Sichern ihn in Ruhe laesst — nur die Leiste darf sich
       ruehren. Der Anspruch ist damit strenger als vorher, nicht milder.
       Am 23.08.2026 ist die dritte Kopfzeile gestrichen: #blattkopf faellt aus
       der Liste, die uebrigen sechs Bereiche bleiben unter Beobachtung. Dazu
       eine Gegenprobe, dass jeder Bereich der Liste wirklich existiert — sonst
       waere ein weiterer weggefallener Bereich eine Beobachtung ins Leere.
     · Kennungen: data-r/data-f (Rechnung/Feld), data-rm/data-m (Monatszelle),
       data-s (Steller). Felder: .zelle, .namensfeld, .datumsfeld, .standwahl.

   Was am selben Ort neu ist und hier deshalb mitgeprueft wird:
     · Abschnitt 8  Der Rechnungsstand ist ein Auswahlfeld (select.standwahl)
                    geworden. Es ist ein Eingabefeld derselben Zeile und faellt
                    unter dieselbe Frage: kommt die Eingabe an, und bleibt der
                    Fokus, wo er hingehoert.
     · Abschnitt 9  Der Haken liegt seit dem 23.08.2026 wieder allein auf dem
                    Rechtsklick — wie in Fassung 2.0.0. Der linke Klick gehoert
                    ganz dem Eingeben und setzt nur den Cursor, nie einen
                    Haken; auch nicht beim zweiten Klick, auch nicht auf einer
                    Zelle, die den Fokus schon hat. Der Doppelklick oeffnet im
                    Budget «Uebertragen» und nimmt in den Rechnungen keinen
                    Haken mehr zurueck. Das ist die Bedingung dafuer, dass
                    Abschnitt 1-3 ueberhaupt etwas anderes messen als einen
                    Haken.
     · Abschnitt 10 «Alles zuklappen» und «Nullen zeigen» sind keine Knoepfe
                    mehr, sondern die Tasten z und n. Wer in einem Namensfeld
                    «zusatz» tippt, darf damit nicht die Tabelle zuklappen.
     · Abschnitt 3  Das Datumsfeld wird jetzt mitgeprueft: es ist das vierte
                    Feld derselben Zeile und geht denselben Weg wie Betrag,
                    Zweck und Name.

   Gestrichen ist keine Pruefung. Eine ist ersetzt: «der Statuspunkt hat sich
   geaendert» hatte in .punkt einen Messpunkt, den es nicht mehr gibt; an ihre
   Stelle treten zwei Pruefungen am Dreieck — es ist danach gefuellt, und der
   Zustand des Kanals ist ein anderer als vorher. Gefallen sind ausserdem die
   festen Kennungen («r-oechsli», «r-oe-1»). Sie waren nie eine Pruefung,
   sondern eine Abschrift: der Vorrat vergibt seine Kennungen selbst und
   verschiebt sie, sobald ein Jahrgang dazukommt. Gesucht wird jetzt die ROLLE,
   die der Abschnitt braucht — ein Steller mit zwei Rechnungen, ein zweiter mit
   einer, ein dritter zum Wegklicken; ebenso die Monate, in die getippt werden
   darf, ohne einen bestehenden Betrag anzuhaengen. Faellt eine Rolle aus, sagt
   das eine eigene Pruefung; kein Abschnitt wird still uebersprungen.

   Ein Wort zum Auswahlfeld in Abschnitt 8 und zum Budget in Abschnitt 9: beide
   Stellen waren beim ersten Fahren rot, und beide Male lag es am Messpunkt,
   nicht an der App. Das Auswahlfeld wurde ohne vorherigen Klick beschrieben —
   dann hatte es nie den Fokus, und «der Fokus bleibt stehen» war eine Frage an
   das Werkzeug. Im Budget wurde ein Haken absolut geprueft, obwohl der Vorrat
   dort schon einen traegt; gefragt ist die Veraenderung. Beide Pruefungen sind
   praeziser geworden, nicht milder — die Fundstellen stehen unten im Text.

   Gemessen wird durchgehend mit ECHTEN Mausklicks (locator.click(), nie
   fill()) und echten Tastendruecken — die Wirkung im DOM und im Datenstand,
   nicht der Quelltext. Was der Quelltext selbst festlegt (die Verzoegerung des
   stillen Sicherns, der Schluessel des Browserspeichers, MERKFELD), wird von
   dort gelesen, nicht abgeschrieben. Was vorrat.mjs als Ausgangswert traegt
   (Betraege, Zwecke, Namen), wird von dort gelesen, nicht hier ein zweites Mal
   hingeschrieben.

   Albrechts echte Zahlen, Namen und Zugangsschluessel kommen hier nicht vor:
   Repo und Zugangsschluessel in Abschnitt 6 sind erfunden, und die Anfrage an
   api.github.com wird abgefangen, bevor sie das Netz beruehrt.

   Was dieser Lauf ausdruecklich NICHT prueft: ein echtes GitHub-Repo (immer
   abgefangen) · Persistenz ueber einen echten Browser-Neustart hinweg · die
   Eingabe in der Budget-Tabelle (das leistet bedienung.mjs; die vier Ursachen
   betreffen namentlich die Rechnungen-Tabelle — der Budget-Doppelklick kommt
   in Abschnitt 9 nur als Gegenprobe vor) · Ziehen und Ablegen · die Ansicht
   «Alle Jahre» · das Telefon (mobil.mjs).

   Port 8746. Fahren: node eingabe.mjs */

import { readFileSync } from 'fs';
import { join } from 'path';
import { serve, browser, bilanzbuch, bisRuhe, WURZEL } from './hilfe.mjs';
import { daten as vorratDaten, STICHJAHR } from './vorrat.mjs';

const PORT = 8746;
const ARBEITSJAHR = STICHJAHR;          /* 2026 — aus dem Vorrat, nicht getippt */
const GETRENNT = 700;                   /* ms zwischen zwei Klicks, die keiner sein sollen */
const { pruef, gleich, ende } = bilanzbuch('eingabe');

/* ------------------------------------------------ Rollen statt Kennungen ---
   Der konstruierte Datenstand, unveraendert wie der Server ihn ausliefert.
   Ausgangswerte werden von hier gelesen, nicht ein zweites Mal hingeschrieben. */
const FIXTUR = vorratDaten();
const STELLER = FIXTUR.rechnungen[ARBEITSJAHR] || [];
const rech = g => (g && g.rechnungen) || [];

/* MEHR traegt zwei Rechnungen — nur dort laesst sich der Fehlerfall aus
   Ursache 1 ueberhaupt stellen. EIN und DRITT sind zwei weitere Steller:
   einer zum Ueberschreiben, einer zum Wegklicken. */
const MEHR  = STELLER.find(g => rech(g).length >= 2);
const EIN   = STELLER.find(g => g !== MEHR && rech(g).length >= 1);
const DRITT = STELLER.find(g => g !== MEHR && g !== EIN);
const R1 = rech(MEHR)[0], R2 = rech(MEHR)[1], RA = rech(EIN)[0];

/* Zwei benachbarte leere Monate: dort laesst sich tippen, ohne dass das
   Getippte an einen bestehenden Wert angehaengt wird. */
function zweiLeere(r) {
  const R = (r && r.reihe) || [];
  for (let m = 0; m + 1 < 12; m++) if (R[m] === 0 && R[m + 1] === 0) return [m, m + 1];
  return [null, null];
}
const vollerMonat = r => ((r && r.reihe) || []).findIndex(v => v !== 0);
const volleMonate = r => ((r && r.reihe) || [])
  .map((v, m) => (v !== 0 ? m : -1)).filter(m => m >= 0);
/* Fuer den Quergang: ein Monat, den R2 fuehrt und R1 nicht — dann sagt
   «R2 bleibt unberuehrt» wirklich etwas, statt leer gegen leer zu vergleichen. */
const querMonat = () => ((R2 && R2.reihe) || [])
  .findIndex((v, m) => v !== 0 && (((R1 && R1.reihe) || [])[m] || 0) === 0);

/* ---------------------------------------------------- Aus dem Quelltext gelesen */
const quelltext = readFileSync(join(WURZEL, 'index.html'), 'utf8');
/* Findet der Sucher nichts, ist das ein rotes Ergebnis und kein Abbruch: ein
   Lauf, der vor der ersten Pruefung stirbt, sagt nichts ueber die App. */
const lies = muster => muster.exec(quelltext);

const mVerz = lies(/warteMerken\s*=\s*setTimeout\(\(\)\s*=>\s*\{\s*warteMerken\s*=\s*null;\s*insRepo\(true\);\s*\},\s*(\d+)\)/);
const VERZOEGERUNG = mVerz ? parseInt(mVerz[1], 10) : 2500;
const mConf = lies(/const CONF = '([^']+)'/);
const CONFSCHLUESSEL = mConf ? mConf[1] : null;
/* Abschnitt 9 liest den gesicherten Datenstand aus dem Browserspeicher. Wo er
   liegt, sagt der Quelltext — abgeschrieben waere es eine zweite Wahrheit. */
const mSchl = lies(/const SCHLUESSEL = '([^']+)'/);
const SPEICHER = mSchl ? mSchl[1] : null;
const mMerk = lies(/const MERKFELD = \[([\s\S]*?)\];/);
const MERKFELDTEXT = mMerk ? mMerk[1].replace(/\s+/g, ' ').trim() : null;

console.log('\nGegenprobe — aus dem Quelltext gelesen');
pruef('die Verzoegerung des stillen Sicherns steht im Quelltext', !!mVerz, mVerz && mVerz[1]);
pruef('Verzoegerung des stillen Sicherns ist eine plausible Zahl (500-10000 ms)',
  VERZOEGERUNG >= 500 && VERZOEGERUNG <= 10000, VERZOEGERUNG);
gleich('Schluessel des Browserspeichers fuer die Datenanbindung', CONFSCHLUESSEL, 'gaepp.tabelle.anbindung');
gleich('Schluessel des Browserspeichers fuer den Datenstand (Abschnitt 9 liest ihn dort)',
  SPEICHER, 'gaepp.tabelle.v1');
pruef('MERKFELD kennt «rm» (Ursache 1 — Rechnungs-Monatszelle, Vorbedingung fuer Abschnitt 1 und 2)',
  !!MERKFELDTEXT && /\[\s*'rm'\s*,\s*'rm'\s*\]/.test(MERKFELDTEXT), MERKFELDTEXT);
pruef('MERKFELD kennt «s» (Rechnungssteller — Vorbedingung fuer Abschnitt 4 und 5)',
  !!MERKFELDTEXT && /\[\s*'s'\s*,\s*'s'\s*\]/.test(MERKFELDTEXT), MERKFELDTEXT);

console.log('\nGegenprobe — die Rollen im Pruefvorrat');
pruef('ein Rechnungssteller mit zwei Rechnungen ist da (Abschnitt 1, 2, 9)', !!(MEHR && R1 && R2),
  MEHR && MEHR.id);
pruef('ein zweiter Rechnungssteller mit einer Rechnung ist da (Abschnitt 3, 4, 6, 8, 10)', !!(EIN && RA),
  EIN && EIN.id);
pruef('ein dritter Rechnungssteller zum Wegklicken ist da (Abschnitt 4, 5)', !!DRITT, DRITT && DRITT.id);
pruef('R1 hat zwei benachbarte leere Monate (Abschnitt 1 tippt dorthin, Abschnitt 9 klickt rechts darauf)',
  zweiLeere(R1)[0] !== null, zweiLeere(R1));
pruef('es gibt einen Monat, den R2 fuehrt und R1 nicht (Abschnitt 2)', querMonat() >= 0, querMonat());
pruef('R2 fuehrt mindestens zwei Monate mit einem Betrag (Abschnitt 9)',
  volleMonate(R2).length >= 2, volleMonate(R2));
/* Abschnitt 9 misst das Setzen und das Wegnehmen eines Hakens. Das sagt nur
   dann etwas, wenn dort keiner steht — der Vorrat traegt anderswo welche. */
pruef('auf diesen beiden Monaten von R2 steht im Vorrat noch kein Haken (Abschnitt 9)',
  volleMonate(R2).slice(0, 2).every(m => !FIXTUR.haken[R2.id + ':' + m]),
  volleMonate(R2).slice(0, 2).map(m => R2.id + ':' + m + '=' + !!FIXTUR.haken[R2.id + ':' + m]).join(' '));

/* ---------------------------------------------------------------- Helfer */

/* Wie in index.html: Apostroph als Tausendertrenner, U+2212 als Minus, null
   bleibt leer, solange die Nullen nicht gezeigt werden. */
function fmt(n) {
  const r = Math.round(n || 0);
  if (r === 0) return '';
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
async function zuRechnungen(seite) {
  await seite.locator('button[data-geh-ansicht="rechnung"]').click();
  await bisRuhe(seite);
}
/* Ein Rechnungssteller ist in der Rechnungen-Tafel eine «kat»-Zeile — im
   Neubau traegt sie den Rang der Kategorie, frueher hiess sie «kopf». */
async function klappeSteller(seite, gid) {
  await seite.locator('tr.kat[data-k="' + gid + '"] button.klapper').click();
  await bisRuhe(seite);
}
async function wertVon(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
}
/* Das aktive Feld ueber sein volles dataset — nicht nur die Merkmale, die
   dieser Lauf gerade erwartet, sonst waere die Pruefung blind fuer genau die
   Verwechslung, um die es hier geht (Ursache 1). */
async function aktivesFeld(seite) {
  return seite.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const d = {};
    if (el.dataset) Object.keys(el.dataset).forEach(k => { d[k] = el.dataset[k]; });
    return { data: d, tag: el.tagName, klasse: el.className,
      value: (typeof el.value === 'string') ? el.value : null };
  });
}
const monatZelle  = (rid, m) => 'input.zelle[data-rm="' + rid + '"][data-m="' + m + '"]';
const betragZelle = rid => 'input.zelle[data-r="' + rid + '"][data-f="betrag"]';
const zweckZelle  = rid => 'input.namensfeld[data-r="' + rid + '"][data-f="zweck"]';
const datumZelle  = rid => 'input.datumsfeld[data-r="' + rid + '"][data-f="datum"]';
const standWahl   = rid => 'select.standwahl[data-r="' + rid + '"][data-f="stand"]';
const stellerZelle = gid => 'input.namensfeld[data-s="' + gid + '"]';

/* Text markieren wie mit der Maus (Dreifachklick) und echt tippen — nie fill().
   Einen Haken setzt der Dreifachklick seit dem 23.08.2026 nirgends mehr — der
   liegt allein auf dem Rechtsklick. Er enthaelt aber einen Doppelklick, und
   der oeffnet in der Budget-Tabelle «Uebertragen». Er kommt deshalb weiterhin
   nur auf Text- und Betragsfelder, die kein data-m tragen. */
async function markierenUndTippen(seite, sel, text) {
  await seite.locator(sel).click({ clickCount: 3 });
  await seite.locator(sel).pressSequentially(text);
}
/* Ein zweiter Klick, der als eigener Klick ankommen soll und nicht als Haelfte
   eines Doppelklicks. */
async function spaeterKlick(seite, sel) {
  await seite.waitForTimeout(GETRENNT);
  await seite.locator(sel).click();
  await bisRuhe(seite);
}
const hakenLesen = (seite, rid, m) =>
  seite.evaluate(([i, mm]) => !!S.haken[i + ':' + mm], [rid, m]);
/* Der Haken zeigt sich am Feld nicht, sondern an der Zelle darum: td.hak. */
const hakenSichtbar = (seite, rid, m) => seite.evaluate((s) => {
  const el = document.querySelector(s);
  const td = el && el.closest ? el.closest('td') : null;
  return td ? td.className.split(/\s+/).indexOf('hak') >= 0 : null;
}, monatZelle(rid, m));
/* Der Zustand des Datenkanals: das Dreieck oben rechts und sein Satz. */
const kanalLesen = (seite) => seite.evaluate(() => {
  const kn = document.querySelector('[data-sync-auf]');
  if (!kn) return null;
  const svg = kn.querySelector('svg');
  return { titel: kn.getAttribute('title'),
    gefuellt: !!svg && svg.getAttribute('fill') === 'currentColor' };
});

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   1. Echte Mausklicks zwischen zwei Monatszellen derselben Rechnung
   ==================================================================== */
console.log('\n1. Echte Mausklicks zwischen zwei Monatszellen derselben Rechnung');
if (MEHR && R1) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, MEHR.id);

  const [MA, MB] = zweiLeere(R1);
  const MV = vollerMonat(R1);

  /* Vorprobe: kommt der Vorrat im Blatt ueberhaupt an? Ein leeres Feld gegen
     ein leeres Feld zu halten wuerde nichts sagen — deshalb steht der gefuellte
     Monat daneben. */
  const vorLeer = await wertVon(seite, monatZelle(R1.id, MA));
  gleich('der leere Monat steht leer im Blatt', vorLeer, '');
  if (MV >= 0) {
    const vorVoll = await wertVon(seite, monatZelle(R1.id, MV));
    gleich('der gefuellte Monat traegt den Wert aus vorrat.mjs', vorVoll, fmt(R1.reihe[MV]));
  }

  const neuWert = 1234;
  await seite.locator(monatZelle(R1.id, MA)).click();
  await seite.locator(monatZelle(R1.id, MA)).pressSequentially(String(neuWert));
  const fehlerVor = fehler.length;
  await seite.locator(monatZelle(R1.id, MB)).click();          /* echter Mausklick, kein fill() */
  await bisRuhe(seite);

  const akt = await aktivesFeld(seite);
  pruef('Fokus liegt nach dem Klick genau auf der angeklickten Zelle (Monat ' + MB + ')',
    !!akt && akt.data.rm === R1.id && akt.data.m === String(MB), akt && akt.data);
  pruef('kein JavaScript-Fehler beim Klickwechsel', fehler.length === fehlerVor, fehler.slice(fehlerVor));

  const nach = await wertVon(seite, monatZelle(R1.id, MA));
  gleich('der zuvor getippte Wert ist uebernommen (Ursache 4)', nach, fmt(neuWert));
  const imStand = await seite.evaluate(([j, rid, m]) => {
    let w = null;
    (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(r => {
      if (r.id === rid) w = r.reihe[m]; }));
    return w;
  }, [ARBEITSJAHR, R1.id, MA]);
  gleich('der Datenstand traegt denselben Wert', imStand, neuWert);
}

/* ====================================================================
   2. Quer ueber zwei verschiedene Rechnungen desselben Stellers — der
      eigentliche Fehlerfall: der Fokus sprang frueher in die falsche Rechnung.
   ==================================================================== */
console.log('\n2. Quer ueber zwei Rechnungen desselben Stellers (Ursache 1)');
if (MEHR && R1 && R2 && querMonat() >= 0) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, MEHR.id);   /* enthaelt R1 UND R2 */

  const MQ = querMonat();
  /* Derselbe Monat in beiden Rechnungen — genau der Fall, in dem MERKFELD
     frueher nur ueber [data-m] wiedersuchte und den ersten Treffer nahm,
     gleich zu welcher Rechnung er gehoerte. */
  const vor1 = await wertVon(seite, monatZelle(R1.id, MQ));
  gleich('Ausgangswert der ersten Rechnung in diesem Monat', vor1, fmt(R1.reihe[MQ]));
  const vor2 = await wertVon(seite, monatZelle(R2.id, MQ));
  gleich('Ausgangswert der zweiten Rechnung in diesem Monat', vor2, fmt(R2.reihe[MQ]));

  const neuWert = 777;
  await seite.locator(monatZelle(R1.id, MQ)).click();
  await seite.locator(monatZelle(R1.id, MQ)).pressSequentially(String(neuWert));
  const fehlerVor = fehler.length;
  await seite.locator(monatZelle(R2.id, MQ)).click();        /* echter Mausklick in die ANDERE Rechnung */
  await bisRuhe(seite);

  const akt = await aktivesFeld(seite);
  pruef('Fokus liegt auf der tatsaechlich angeklickten Rechnung, gleicher Monat',
    !!akt && akt.data.rm === R2.id && akt.data.m === String(MQ), akt && akt.data);
  pruef('Gegenprobe: Fokus liegt NICHT mehr auf der zuvor bearbeiteten Rechnung (der alte Fehler)',
    !!akt && akt.data.rm !== R1.id, akt && akt.data);
  pruef('kein JavaScript-Fehler beim Wechsel ueber zwei Rechnungen',
    fehler.length === fehlerVor, fehler.slice(fehlerVor));

  const nach1 = await wertVon(seite, monatZelle(R1.id, MQ));
  gleich('der zuvor getippte Wert ist in der ersten Rechnung uebernommen (Ursache 4)', nach1, fmt(neuWert));
  const nach2 = await wertVon(seite, monatZelle(R2.id, MQ));
  gleich('die zweite Rechnung bleibt in diesem Monat unberuehrt', nach2, fmt(R2.reihe[MQ]));
}

/* ====================================================================
   3. Betrag und Datum ueberschreiben
   ==================================================================== */
console.log('\n3. Betrag und Datum ueberschreiben');
if (EIN && RA) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, EIN.id);

  const vorBetrag = await wertVon(seite, betragZelle(RA.id));
  gleich('Ausgangsbetrag stimmt mit vorrat.mjs ueberein', vorBetrag, fmt(RA.betrag));

  const neuerBetrag = 4500;
  await markierenUndTippen(seite, betragZelle(RA.id), String(neuerBetrag));  /* markieren, ueberschreiben */
  await seite.locator(datumZelle(RA.id)).click();                            /* in eine andere Zelle klicken */
  await bisRuhe(seite);

  const nachBetrag = await wertVon(seite, betragZelle(RA.id));
  gleich('der neue Betrag steht formatiert in der Zelle', nachBetrag, fmt(neuerBetrag));
  pruef('Gegenprobe: der alte Betrag (' + RA.betrag + ') steckt nicht mehr im Feld',
    !String(nachBetrag).includes(String(RA.betrag)), nachBetrag);

  const modell = await seite.evaluate(([j, gid, rid]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === gid);
    const r = g && (g.rechnungen || []).find(x => x.id === rid);
    return r ? r.betrag : null;
  }, [ARBEITSJAHR, EIN.id, RA.id]);
  gleich('der Datenstand traegt denselben neuen Betrag', modell, neuerBetrag);

  /* Das Datumsfeld ist das vierte Feld derselben Zeile und geht denselben Weg. */
  const vorDatum = await wertVon(seite, datumZelle(RA.id));
  gleich('Ausgangsdatum stimmt mit vorrat.mjs ueberein', vorDatum, RA.datum);

  const neuesDatum = '05.11.2026';
  await markierenUndTippen(seite, datumZelle(RA.id), neuesDatum);
  await seite.locator(betragZelle(RA.id)).click();
  await bisRuhe(seite);

  const nachDatum = await wertVon(seite, datumZelle(RA.id));
  gleich('das neue Datum steht unveraendert in der Zelle', nachDatum, neuesDatum);
  const datumModell = await seite.evaluate(([j, gid, rid]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === gid);
    const r = g && (g.rechnungen || []).find(x => x.id === rid);
    return r ? r.datum : null;
  }, [ARBEITSJAHR, EIN.id, RA.id]);
  gleich('der Datenstand traegt dasselbe neue Datum', datumModell, neuesDatum);
  pruef('Gegenprobe: das alte Datum ist weg', datumModell !== RA.datum, datumModell);
}

/* ====================================================================
   4. Zweck-Feld und Rechnungssteller-Name ueberschreiben (bestehende Eintraege)
   ==================================================================== */
console.log('\n4. Zweck-Feld und Rechnungssteller-Name ueberschreiben (bestehend)');
if (EIN && RA && DRITT) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, EIN.id);

  const vorZweck = await wertVon(seite, zweckZelle(RA.id));
  gleich('Ausgangszweck stimmt mit vorrat.mjs ueberein', vorZweck, RA.zweck);

  const neuerZweck = 'Jahresabschluss Kontrolle';
  await markierenUndTippen(seite, zweckZelle(RA.id), neuerZweck);
  await seite.locator(stellerZelle(DRITT.id)).click();   /* eine ganz andere Zelle */
  await bisRuhe(seite);

  const nachZweck = await wertVon(seite, zweckZelle(RA.id));
  gleich('der neue Zweck-Text steht unveraendert in der Zelle', nachZweck, neuerZweck);
  pruef('Gegenprobe: der alte Zweck («' + RA.zweck + '») ist weg',
    !String(nachZweck).includes(RA.zweck), nachZweck);

  const vorName = await wertVon(seite, stellerZelle(DRITT.id));
  gleich('Ausgangsname des Stellers stimmt mit vorrat.mjs ueberein', vorName, DRITT.name);

  const neuerName = 'Suedwind Treuhand';
  await markierenUndTippen(seite, stellerZelle(DRITT.id), neuerName);
  await seite.locator(stellerZelle(EIN.id)).click();     /* eine ganz andere Zelle */
  await bisRuhe(seite);

  const nachName = await wertVon(seite, stellerZelle(DRITT.id));
  gleich('der neue Rechnungssteller-Name steht unveraendert in der Zelle', nachName, neuerName);
  pruef('Gegenprobe: der alte Name («' + DRITT.name + '») ist weg',
    !String(nachName).toLowerCase().includes(String(DRITT.name).toLowerCase()), nachName);
  const nameModell = await seite.evaluate(([j, gid]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === gid);
    return g ? g.name : null;
  }, [ARBEITSJAHR, DRITT.id]);
  gleich('der Datenstand traegt denselben neuen Namen', nameModell, neuerName);
}

/* ====================================================================
   5. Frisch angelegter Rechnungssteller und frisch angelegte Rechnung —
      genau dort fiel das Feld frueher auf die Standardbeschriftung zurueck.
   ==================================================================== */
console.log('\n5. Frisch angelegter Rechnungssteller und frisch angelegte Rechnung');
if (EIN) {
  await frisch(seite);
  await zuRechnungen(seite);

  await seite.locator('button[data-neu-steller]').click();
  await bisRuhe(seite);
  const neuerStellerId = await seite.evaluate((j) => {
    const g = (S.rechnungen[j] || []).find(x => x.name === 'Neuer Rechnungssteller');
    return g ? g.id : null;
  }, ARBEITSJAHR);
  pruef('frischer Rechnungssteller wurde angelegt', !!neuerStellerId, neuerStellerId);

  if (neuerStellerId) {
    const stellerSelNeu = stellerZelle(neuerStellerId);
    const vorNameSteller = await wertVon(seite, stellerSelNeu);
    gleich('traegt vor der Eingabe die Standardbeschriftung', vorNameSteller, 'Neuer Rechnungssteller');

    /* Wer eine Zeile anlegt, will sie benennen: der Fokus steht schon im neuen
       Feld, und die Standardbeschriftung ist markiert — der erste Buchstabe
       ersetzt sie. */
    const gleichDrin = await seite.evaluate((s) => {
      const el = document.querySelector(s);
      return { aktiv: document.activeElement === el,
        markiert: !!el && el.selectionStart === 0 && el.selectionEnd === el.value.length };
    }, stellerSelNeu);
    pruef('der Fokus steht nach dem Anlegen schon im neuen Namensfeld', gleichDrin.aktiv, gleichDrin);
    pruef('die Standardbeschriftung ist markiert — der erste Buchstabe ersetzt sie',
      gleichDrin.markiert, gleichDrin);

    const neuerNameSteller = 'Frischling Handel AG';
    await markierenUndTippen(seite, stellerSelNeu, neuerNameSteller);
    await seite.locator(stellerZelle(EIN.id)).click();   /* eine ganz andere Zelle */
    await bisRuhe(seite);

    const nameSteller = await wertVon(seite, stellerSelNeu);
    gleich('der neue Name eines frischen Stellers bleibt stehen', nameSteller, neuerNameSteller);
    pruef('Gegenprobe: faellt NICHT auf «Neuer Rechnungssteller» zurueck (auch nicht auf Teile davon)',
      !nameSteller.includes('Neu') && !nameSteller.includes('Rechnungssteller'), nameSteller);

    await seite.locator('tr.kat[data-k="' + neuerStellerId + '"]').hover();
    await seite.locator('[data-neu-rech="' + neuerStellerId + '"]').click();
    await bisRuhe(seite);
    const neueRechnungId = await seite.evaluate(([j, gid]) => {
      const g = (S.rechnungen[j] || []).find(x => x.id === gid);
      const r = g && (g.rechnungen || []).find(x => x.zweck === 'Neue Rechnung');
      return r ? r.id : null;
    }, [ARBEITSJAHR, neuerStellerId]);
    pruef('frische Rechnung wurde im frischen Steller angelegt', !!neueRechnungId, neueRechnungId);

    if (neueRechnungId) {
      const zweckSelNeu = zweckZelle(neueRechnungId);
      const vorZweckNeu = await wertVon(seite, zweckSelNeu);
      gleich('traegt vor der Eingabe die Standardbeschriftung', vorZweckNeu, 'Neue Rechnung');

      const neuerZweckFrisch = 'Erste Lieferung';
      await markierenUndTippen(seite, zweckSelNeu, neuerZweckFrisch);
      await seite.locator(stellerZelle(EIN.id)).click();
      await bisRuhe(seite);

      const zweckFrisch = await wertVon(seite, zweckSelNeu);
      gleich('der neue Zweck einer frischen Rechnung bleibt stehen', zweckFrisch, neuerZweckFrisch);
      pruef('Gegenprobe: faellt NICHT auf «Neue Rechnung» zurueck (auch nicht auf Teile davon)',
        !zweckFrisch.includes('Neue') && !zweckFrisch.includes('Rechnung'), zweckFrisch);
    }
  }
}

/* ====================================================================
   6. Das stille Sichern zerstoert keine Eingabe (Ursache 3)
   ==================================================================== */
console.log('\n6. Das stille Sichern zerstoert keine Eingabe (Verzoegerung '
  + VERZOEGERUNG + ' ms, aus dem Quelltext gelesen)');
if (EIN && RA && CONFSCHLUESSEL) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, EIN.id);

  /* Erfundenes Repo, erfundener Zugangsschluessel — nie ein echtes. Die Anfrage
     an api.github.com wird abgefangen und sofort mit einer erfundenen Antwort
     beantwortet, damit kein echtes Netz beruehrt wird und der Lauf nicht von
     einer echten Netzwerklaufzeit abhaengt. */
  await seite.route('https://api.github.com/**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: { sha: 'erfunden-0000000' } })
  }));
  await seite.evaluate((schluessel) => {
    try {
      localStorage.setItem(schluessel, JSON.stringify({
        repo: 'erfunden-konto/erfundenes-repo', pfad: 'erfunden/pruefstand.json',
        zweig: 'erfundener-zweig', token: 'erfunden-schluessel-000'
      }));
    } catch (e) {}
  }, CONFSCHLUESSEL);

  const [MA] = zweiLeere(RA);
  /* Eine Aenderung ausloesen und uebernehmen — das startet die Verzoegerung. */
  await seite.locator(monatZelle(RA.id, MA)).click();
  await seite.locator(monatZelle(RA.id, MA)).pressSequentially('50');
  await seite.locator(datumZelle(RA.id)).click();
  await bisRuhe(seite);

  const kanalVorher = await kanalLesen(seite);
  pruef('das Dreieck des Datenkanals ist da (Messpunkt fuer den Zustand)', !!kanalVorher, kanalVorher);

  /* Jetzt in ein Textfeld tippen — OHNE es zu verlassen. */
  const textWaehrendSicherns = 'Zwischenstand waehrend des Sicherns';
  await markierenUndTippen(seite, zweckZelle(RA.id), textWaehrendSicherns);

  /* Die eigentliche Probe fuer Ursache 3: waehrend der stillen Sicherung darf
     NUR die Leiste angefasst werden, kein anderer Bereich — gemessen ueber
     MutationObserver auf den echten DOM-Knoten, nicht ueber das Ergebnis
     (Fokus/Text) allein, das Ursache 1 und 4 fuer sich schon retten wuerden.
     Der Neubau hat den Kopf mehrgeteilt; deshalb steht jeder Bereich einzeln
     unter Beobachtung und nicht nur das Blatt.

     GESTRICHEN am 23.08.2026: 'blattkopf'. Die dritte Kopfzeile ist ersatzlos
     entfallen — es gibt keinen Knoten #blattkopf mehr, an den sich ein
     Beobachter haengen liesse. Die Aussage dieses Abschnitts wird dadurch
     nicht schwaecher: die uebrigen sechs Bereiche bleiben vollzaehlig unter
     Beobachtung, und der Anspruch ist unveraendert — nur die Leiste darf sich
     ruehren. Ersatz braucht es nicht: ein Bereich, den es nicht gibt, kann
     beim stillen Sichern auch nicht angefasst werden. */
  const RUHIG = ['blatt', 'band', 'druckkopf', 'druckfuss', 'fusszeile', 'dialoge'];
  /* Gegenprobe zur Liste: jeder beobachtete Bereich muss es wirklich geben.
     Ohne sie liefe die Beobachtung nach einem weiteren Umbau still ins Leere
     und die Pruefung waere gruen, ohne etwas gemessen zu haben. */
  const fehlend = await seite.evaluate((ruhig) => ruhig.concat(['leiste'])
    .filter(id => !document.getElementById(id)), RUHIG);
  gleich('jeder beobachtete Bereich ist wirklich da (Gegenprobe zur Liste)',
    fehlend.join(','), '');
  gleich('die dritte Kopfzeile gibt es nicht mehr — nichts zu beobachten',
    await seite.evaluate(() => document.querySelectorAll('#blattkopf, .kopf3').length), 0);
  await seite.evaluate((ruhig) => {
    window.__mut = {}; window.__mo = [];
    const opts = { childList: true, subtree: true, attributes: true, characterData: true };
    ruhig.concat(['leiste']).forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      window.__mut[id] = 0;
      const mo = new MutationObserver(m => { window.__mut[id] += m.length; });
      mo.observe(el, opts); window.__mo.push(mo);
    });
  }, RUHIG);

  const fehlerVor = fehler.length;
  await seite.waitForTimeout(VERZOEGERUNG + 800);   /* laenger als die gelesene Verzoegerung */

  const mut = await seite.evaluate(() => {
    (window.__mo || []).forEach(mo => mo.disconnect());
    return window.__mut;
  });
  RUHIG.forEach(id => {
    gleich('#' + id + ' wird waehrend des stillen Sicherns NICHT angefasst (Ursache 3)', mut[id], 0);
  });
  pruef('die Leiste (#leiste) veraendert sich waehrend des stillen Sicherns (der Zustand wird nachgefuehrt)',
    mut.leiste > 0, mut);

  const nach = await seite.evaluate((sel) => {
    const el = document.querySelector(sel);
    const akt = document.activeElement;
    return { wert: el ? el.value : null, istAktiv: akt === el };
  }, zweckZelle(RA.id));
  const kanalNachher = await kanalLesen(seite);

  gleich('der getippte Text steht nach dem stillen Sichern unveraendert im Feld',
    nach.wert, textWaehrendSicherns);
  pruef('der Fokus ist waehrend des stillen Sicherns im Feld geblieben', nach.istAktiv, nach);
  pruef('das Dreieck ist danach gefuellt — gesichert', kanalNachher && kanalNachher.gefuellt, kanalNachher);
  pruef('der Zustand des Datenkanals hat sich geaendert («' + (kanalVorher && kanalVorher.titel)
    + '» -> «' + (kanalNachher && kanalNachher.titel) + '»)',
    !!kanalVorher && !!kanalNachher
    && (kanalVorher.titel !== kanalNachher.titel || kanalVorher.gefuellt !== kanalNachher.gefuellt),
    kanalNachher);
  pruef('kein JavaScript-Fehler waehrend des stillen Sicherns',
    fehler.length === fehlerVor, fehler.slice(fehlerVor));

  await seite.unroute('https://api.github.com/**');
}

/* ====================================================================
   7. Gegenprobe zur Tastatur — Tab und Pfeile zeichnen weiterhin sofort
      (die Verzoegerung aus Abschnitt 6 darf sie nicht ins Leere laufen lassen)
   ==================================================================== */
console.log('\n7. Gegenprobe zur Tastatur — Tab und Pfeile zeichnen weiterhin sofort');
if (MEHR && R1 && R2) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, MEHR.id);

  const [MA, MB] = zweiLeere(R1);
  const tabWert = 321;
  await seite.locator(monatZelle(R1.id, MA)).click();
  await seite.locator(monatZelle(R1.id, MA)).pressSequentially(String(tabWert));
  const fehlerVorTab = fehler.length;
  await seite.locator(monatZelle(R1.id, MA)).press('Tab');
  await bisRuhe(seite);

  const aktTab = await aktivesFeld(seite);
  pruef('Tab springt sofort einen Monat weiter, in derselben Rechnung',
    !!aktTab && aktTab.data.rm === R1.id && aktTab.data.m === String(MB), aktTab && aktTab.data);
  const nachTab = await wertVon(seite, monatZelle(R1.id, MA));
  gleich('der getippte Wert ist nach Tab sofort uebernommen', nachTab, fmt(tabWert));
  pruef('kein JavaScript-Fehler bei Tab', fehler.length === fehlerVorTab, fehler.slice(fehlerVorTab));

  const fehlerVorPfeil = fehler.length;
  await seite.locator(betragZelle(R1.id)).click();
  await seite.locator(betragZelle(R1.id)).press('ArrowDown');
  await bisRuhe(seite);
  const aktRunter = await aktivesFeld(seite);
  pruef('Pfeil runter springt sofort vom Betrag der ersten zur zweiten Rechnung (gleiche Spalte)',
    !!aktRunter && aktRunter.data.r === R2.id && aktRunter.data.f === 'betrag', aktRunter && aktRunter.data);
  pruef('kein JavaScript-Fehler bei Pfeil runter', fehler.length === fehlerVorPfeil, fehler.slice(fehlerVorPfeil));

  await seite.locator(betragZelle(R2.id)).press('ArrowUp');
  await bisRuhe(seite);
  const aktRauf = await aktivesFeld(seite);
  pruef('Pfeil rauf springt zurueck zum Betrag der ersten Rechnung',
    !!aktRauf && aktRauf.data.r === R1.id && aktRauf.data.f === 'betrag', aktRauf && aktRauf.data);
}

/* ====================================================================
   8. Der Rechnungsstand ist ein Auswahlfeld (neu im Umbau)
      Es steht in derselben Zeile wie Betrag, Zweck und Datum und faellt unter
      dieselbe Frage: kommt die Eingabe an, und bleibt der Fokus, wo er hingehoert.
   ==================================================================== */
console.log('\n8. Der Rechnungsstand — Auswahlfeld in derselben Zeile');
if (EIN && RA) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, EIN.id);

  const staende = await seite.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? { wert: el.value, auswahl: Array.from(el.options).map(o => o.value) } : null;
  }, standWahl(RA.id));
  pruef('das Auswahlfeld ist da', !!staende, staende);
  gleich('es zeigt den Stand aus vorrat.mjs', staende && staende.wert, RA.stand);

  if (staende) {
    /* Ein anderer Stand als der jetzige — welcher, entscheidet die Liste selbst. */
    const anderer = staende.auswahl.find(x => x !== RA.stand && x !== 'Bezahlt');
    pruef('die Liste bietet einen anderen Stand als den jetzigen an', !!anderer, staende.auswahl);
    if (anderer) {
      const fehlerVor = fehler.length;
      /* Erst ein echter Mausklick auf das Auswahlfeld, dann die Wahl. Der Klick
         gehoert dazu: er ist der Weg, auf dem ein Mensch dieses Feld ueberhaupt
         erreicht — Tab laeuft an ihm vorbei. Ohne ihn setzt das Werkzeug den
         Wert an einem Feld, das nie den Fokus hatte, und die Frage «bleibt der
         Fokus stehen» waere eine Frage an den Prueflauf und nicht an die App. */
      await seite.locator(standWahl(RA.id)).click();
      await bisRuhe(seite);
      const vorWahl = await aktivesFeld(seite);
      pruef('der Klick setzt den Fokus ins Auswahlfeld (Messpunkt fuer die naechste Pruefung)',
        !!vorWahl && vorWahl.tag === 'SELECT' && vorWahl.data.r === RA.id, vorWahl && vorWahl.tag);
      await seite.selectOption(standWahl(RA.id), anderer);
      await bisRuhe(seite);

      const nach = await wertVon(seite, standWahl(RA.id));
      gleich('das Auswahlfeld zeigt danach den neuen Stand', nach, anderer);
      const modell = await seite.evaluate(([j, gid, rid]) => {
        const g = (S.rechnungen[j] || []).find(x => x.id === gid);
        const r = g && (g.rechnungen || []).find(x => x.id === rid);
        return r ? r.stand : null;
      }, [ARBEITSJAHR, EIN.id, RA.id]);
      gleich('der Datenstand traegt denselben neuen Stand', modell, anderer);
      pruef('Gegenprobe: der alte Stand («' + RA.stand + '») steht nicht mehr da',
        modell !== RA.stand, modell);

      const akt = await aktivesFeld(seite);
      pruef('der Fokus bleibt nach dem Neuzeichnen auf dem Auswahlfeld derselben Rechnung',
        !!akt && akt.tag === 'SELECT' && akt.data.r === RA.id && akt.data.f === 'stand', akt && akt.data);
      pruef('kein JavaScript-Fehler beim Wechsel des Stands',
        fehler.length === fehlerVor, fehler.slice(fehlerVor));
    }
  }
}

/* ====================================================================
   9. Der Haken haengt am RECHTSKLICK — der linke Klick gehoert dem Eingeben
      Bis zum 23.08.2026 setzte der linke Klick den Haken, sobald die Zelle
      den Fokus schon hatte, und der zweite Klick eines Doppelklicks nahm ihn
      wieder zurueck. Eine Monatszelle ist aber zugleich ein Eingabefeld, und
      jede Geste, mit der man eine Zahl ueberschreibt, enthaelt einen Klick.
      Albrecht hat am 23.08.2026 zurueck auf die Regel von 2.0.0 entschieden:

        · Der linke Klick setzt nur den Cursor. Nie einen Haken — auch nicht
          beim zweiten Klick, auch nicht auf einer Zelle, die den Fokus schon
          hat.
        · Der Doppelklick oeffnet im Budget «Uebertragen». In den Rechnungen
          setzt er keinen Haken und nimmt auch keinen zurueck; die fruehere
          Ruecknahme-Mechanik ist ersatzlos entfallen.
        · Der Rechtsklick setzt und nimmt den Haken, und er wirkt sofort, auch
          beim ersten Mal. Eine leere Zelle laesst sich weiterhin nicht
          abhaken.

      Der Abschnitt ist deshalb umgedreht und nicht gestrichen worden: wo
      frueher «der Klick setzt den Haken» stand, steht jetzt «er setzt keinen»
      — und daneben, auf genau demselben Platz, die Gegenprobe mit dem
      Rechtsklick. Ohne sie waere «kein Haken» auch dann gruen, wenn die Zelle
      ueberhaupt nicht abhakbar waere.

      Der Abschnitt bleibt die Vorbedingung dieses ganzen Laufs: ohne diese
      Regel wuerde Abschnitt 1-3 bei jedem Klick nebenbei einen Haken setzen.
   ==================================================================== */
console.log('\n9. Der Haken haengt am Rechtsklick — der linke Klick setzt nur den Cursor');
if (MEHR && R1 && R2 && volleMonate(R2).length >= 2 && zweiLeere(R1)[0] !== null) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, MEHR.id);

  const [H1, H2] = volleMonate(R2);
  const LEER = zweiLeere(R1)[0];
  const fehlerVor = fehler.length;

  /* Ein eigener Zaehler fuer Doppelklicks. Er misst nicht die App, sondern die
     Umgebung: ohne ihn waere «der Doppelklick setzt keinen Haken» auch dann
     gruen, wenn nie ein Doppelklick angekommen ist. */
  await seite.evaluate(() => { window.__dbl = 0;
    document.addEventListener('dblclick', () => { window.__dbl++; }); });

  const rechtsklick = async (sel) => {
    await seite.locator(sel).click({ button: 'right' });
    await bisRuhe(seite);
  };
  /* Der gesicherte Stand, nicht nur der Arbeitsspeicher: merke() schreibt bei
     jedem Haken den ganzen Datenstand in den Browserspeicher. «Der Datenstand
     traegt ihn» heisst das — und nicht bloss «S.haken kennt den Schluessel». */
  const gesichert = (rid, m) => seite.evaluate(([sch, k]) => {
    try { const d = JSON.parse(localStorage.getItem(sch) || '{}');
      return !!(d.haken && d.haken[k]); } catch (e) { return null; }
  }, [SPEICHER, rid + ':' + m]);

  /* --- Der Rechtsklick wirkt sofort, schon beim ersten Mal ---------------
     Auf einer Zelle, die noch nie den Fokus hatte. Nach der alten Regel
     brauchte der Haken einen Klick zum Fokussieren und einen zweiten zum
     Setzen; heute genuegt der erste Rechtsklick. */
  gleich('vor dem ersten Rechtsklick traegt die Zelle keinen Haken',
    await hakenLesen(seite, R2.id, H2), false);
  await rechtsklick(monatZelle(R2.id, H2));
  gleich('der erste Rechtsklick auf eine unberuehrte Zelle setzt den Haken sofort',
    await hakenLesen(seite, R2.id, H2), true);
  gleich('die Zelle zeigt ihn (td.hak)', await hakenSichtbar(seite, R2.id, H2), true);
  gleich('und der gesicherte Datenstand traegt ihn', await gesichert(R2.id, H2), true);

  await rechtsklick(monatZelle(R2.id, H2));
  gleich('noch ein Rechtsklick nimmt den Haken wieder weg',
    await hakenLesen(seite, R2.id, H2), false);
  gleich('die Zelle zeigt ihn danach nicht mehr',
    await hakenSichtbar(seite, R2.id, H2), false);
  gleich('und er ist auch aus dem gesicherten Datenstand fort',
    await gesichert(R2.id, H2), false);

  /* --- Der linke Klick: nur der Cursor ----------------------------------- */
  await seite.locator(monatZelle(R2.id, H1)).click();
  await bisRuhe(seite);
  gleich('der erste linke Klick in eine Zelle setzt KEINEN Haken',
    await hakenLesen(seite, R2.id, H1), false);
  gleich('und die Zelle zeigt auch keinen', await hakenSichtbar(seite, R2.id, H1), false);
  const aktErst = await aktivesFeld(seite);
  pruef('dafuer steht der Cursor im Feld dieser Zelle',
    !!aktErst && aktErst.data.rm === R2.id && aktErst.data.m === String(H1),
    aktErst && aktErst.data);

  /* Der zweite, getrennte Klick auf dieselbe — nun fokussierte — Zelle. Genau
     hier setzte die alte Regel den Haken; heute geschieht nichts. */
  await spaeterKlick(seite, monatZelle(R2.id, H1));
  gleich('der zweite Klick auf die schon fokussierte Zelle setzt ebenfalls keinen Haken',
    await hakenLesen(seite, R2.id, H1), false);
  gleich('die Zelle zeigt weiterhin keinen', await hakenSichtbar(seite, R2.id, H1), false);
  gleich('auch der gesicherte Datenstand traegt keinen', await gesichert(R2.id, H1), false);
  const aktZweit = await aktivesFeld(seite);
  pruef('und der Cursor steht immer noch in derselben Zelle',
    !!aktZweit && aktZweit.data.rm === R2.id && aktZweit.data.m === String(H1),
    aktZweit && aktZweit.data);

  await spaeterKlick(seite, monatZelle(R2.id, H1));
  gleich('auch ein dritter Klick auf denselben Platz setzt keinen Haken',
    await hakenLesen(seite, R2.id, H1), false);

  /* --- Der Doppelklick in den Rechnungen: kein Haken --------------------- */
  await seite.waitForTimeout(GETRENNT);
  await seite.locator(monatZelle(R2.id, H1)).dblclick();
  await bisRuhe(seite);
  gleich('Doppelklick auf die fokussierte Zelle setzt keinen Haken',
    await hakenLesen(seite, R2.id, H1), false);
  gleich('und die Zelle zeigt auch keinen', await hakenSichtbar(seite, R2.id, H1), false);
  gleich('Gegenprobe: der Doppelklick ist ueberhaupt angekommen',
    await seite.evaluate(() => window.__dbl), 1);

  await seite.waitForTimeout(GETRENNT);
  await seite.locator(monatZelle(R2.id, H2)).dblclick();
  await bisRuhe(seite);
  gleich('Doppelklick auf eine noch nicht fokussierte Zelle setzt auch keinen',
    await hakenLesen(seite, R2.id, H2), false);
  gleich('Gegenprobe: auch dieser Doppelklick ist angekommen',
    await seite.evaluate(() => window.__dbl), 2);

  /* --- Gegenprobe auf genau demselben Platz ------------------------------
     Der Rechtsklick tut dort sehr wohl, was der linke Klick und der
     Doppelklick eben gelassen haben. Ohne diese Probe waere «kein Haken» auch
     dann gruen, wenn die Zelle ueberhaupt nicht abhakbar waere. */
  await rechtsklick(monatZelle(R2.id, H1));
  gleich('auf demselben Platz setzt der Rechtsklick den Haken sehr wohl',
    await hakenLesen(seite, R2.id, H1), true);
  gleich('und die Zelle zeigt ihn', await hakenSichtbar(seite, R2.id, H1), true);
  gleich('der gesicherte Datenstand traegt ihn ebenfalls', await gesichert(R2.id, H1), true);
  await rechtsklick(monatZelle(R2.id, H1));
  gleich('und der naechste Rechtsklick nimmt ihn wieder weg',
    await hakenLesen(seite, R2.id, H1), false);

  /* --- Eine leere Zelle laesst sich nicht abhaken ------------------------
     Die Marke waere unsichtbar und wuerde wieder wirken, sobald dort eine
     Zahl steht. Gefragt ist nicht nur diese eine Zelle, sondern der ganze
     Haken-Bestand: es darf ueberhaupt keiner dazukommen. */
  const hakenZahlVor = await seite.evaluate(() => Object.keys(S.haken).length);
  gleich('die Probezelle ist wirklich leer',
    await wertVon(seite, monatZelle(R1.id, LEER)), '');
  await rechtsklick(monatZelle(R1.id, LEER));
  gleich('der Rechtsklick auf eine leere Zelle setzt keinen Haken',
    await hakenLesen(seite, R1.id, LEER), false);
  gleich('die leere Zelle zeigt auch keinen',
    await hakenSichtbar(seite, R1.id, LEER), false);
  gleich('und es ist ueberhaupt kein Haken dazugekommen',
    await seite.evaluate(() => Object.keys(S.haken).length), hakenZahlVor);
  gleich('die Zelle steht danach immer noch leer',
    await wertVon(seite, monatZelle(R1.id, LEER)), '');

  /* --- Was nebenbei nicht geschehen sein darf ---------------------------- */
  const nachher = await seite.evaluate(([j, ids]) => {
    const raus = {};
    (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(x => {
      if (ids.indexOf(x.id) >= 0) raus[x.id] = { reihe: x.reihe.slice(), stand: x.stand }; }));
    return raus;
  }, [ARBEITSJAHR, [R1.id, R2.id]]);
  pruef('kein Klick hat nebenbei einen Betrag veraendert (die abgehakte Rechnung)',
    !!nachher[R2.id] && JSON.stringify(nachher[R2.id].reihe) === JSON.stringify(R2.reihe),
    nachher[R2.id] && nachher[R2.id].reihe);
  pruef('und auch nicht bei der Rechnung mit der leeren Zelle',
    !!nachher[R1.id] && JSON.stringify(nachher[R1.id].reihe) === JSON.stringify(R1.reihe),
    nachher[R1.id] && nachher[R1.id].reihe);
  gleich('der Rechnungsstand steht noch, wo er stand',
    nachher[R2.id] && nachher[R2.id].stand, R2.stand);
  pruef('kein JavaScript-Fehler beim Haken-Setzen', fehler.length === fehlerVor,
    fehler.slice(fehlerVor));

  /* Gegenprobe am Nachbarplatz: im Budget bedeutet derselbe Doppelklick etwas
     anderes — er oeffnet «Uebertragen». Das belegt, dass der Doppelklick als
     Doppelklick verstanden wird und nicht bloss verschluckt. */
  await seite.locator('button[data-geh-ansicht="budget"]').click();
  await bisRuhe(seite);
  await seite.locator('tr.kat button.klapper').first().click();
  await bisRuhe(seite);
  const budgetZelle = await seite.evaluate(() => {
    const el = Array.from(document.querySelectorAll('input.zelle[data-z][data-m]'))
      .find(x => x.value !== '');
    return el ? { z: el.dataset.z, m: el.dataset.m } : null;
  });
  pruef('eine gefuellte Budget-Monatszelle ist da (Voraussetzung der Gegenprobe)',
    !!budgetZelle, budgetZelle);
  if (budgetZelle) {
    const sel = 'input.zelle[data-z="' + budgetZelle.z + '"][data-m="' + budgetZelle.m + '"]';
    /* Der Vorrat traegt absichtlich schon gesetzte Haken. Gefragt ist deshalb
       nicht, ob dort ein Haken steht, sondern ob der Doppelklick daran etwas
       geaendert hat — der Zustand davor wird gelesen, nicht angenommen. */
    const hakenVorher = await seite.evaluate(([z, m]) => !!S.haken[z + ':' + m],
      [budgetZelle.z, budgetZelle.m]);
    await seite.waitForTimeout(GETRENNT);
    await seite.locator(sel).dblclick();
    await bisRuhe(seite);
    const ueb = await seite.evaluate(() => (S.ueb ? { id: S.ueb.id, m: S.ueb.m } : null));
    pruef('im Budget oeffnet der Doppelklick «Uebertragen»',
      !!ueb && ueb.id === budgetZelle.z && ueb.m === +budgetZelle.m, ueb);
    gleich('und laesst den Haken dieser Zelle, wie er war',
      await seite.evaluate(([z, m]) => !!S.haken[z + ':' + m], [budgetZelle.z, budgetZelle.m]),
      hakenVorher);
    await seite.keyboard.press('Escape');
    await bisRuhe(seite);
    gleich('Escape schliesst das Fenster wieder',
      await seite.evaluate(() => !!S.ueb), false);
  }
}

/* ====================================================================
   10. z und n sind Tasten geworden — sie duerfen nicht ins Tippen greifen
       «Alles zuklappen» und «Nullen zeigen» waren Knoepfe. Wer jetzt in einem
       Namensfeld «zusatz» schreibt, klappt sonst die Tabelle zu.
   ==================================================================== */
console.log('\n10. z und n wirken nicht, waehrend in einem Feld getippt wird');
if (EIN && RA && MEHR && R1) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, EIN.id);

  const vorher = await seite.evaluate(() => ({ auf: S.auf.slice(), nullen: S.nullen }));
  const text = 'zusatz nachtrag';   /* traegt z und n ohne Umschalttaste */
  await markierenUndTippen(seite, zweckZelle(RA.id), text);
  await bisRuhe(seite);

  gleich('die Buchstaben landen im Feld', await wertVon(seite, zweckZelle(RA.id)), text);
  const nachher = await seite.evaluate(() => ({ auf: S.auf.slice(), nullen: S.nullen }));
  pruef('«z» im Feld klappt nichts zu',
    JSON.stringify(nachher.auf) === JSON.stringify(vorher.auf), nachher.auf);
  gleich('«n» im Feld schaltet die Nullen nicht um', nachher.nullen, vorher.nullen);

  /* Gegenprobe: ausserhalb eines Feldes wirken beide Tasten. Sonst waere die
     Pruefung oben allein deshalb gruen, weil die Tasten gar nichts tun. */
  await seite.locator('tr.sumstark td.c-name').first().click();   /* Fokus aus dem Feld heraus */
  await bisRuhe(seite);
  await seite.keyboard.press('z');
  await bisRuhe(seite);
  gleich('ausserhalb eines Feldes klappt «z» alles zu',
    await seite.evaluate(() => S.auf.length), 0);
  gleich('und die Rechnungszeilen sind weg',
    await seite.evaluate(() => document.querySelectorAll('tr.pos').length), 0);

  await seite.keyboard.press('z');
  await bisRuhe(seite);
  pruef('ein zweites «z» klappt alles wieder auf',
    await seite.evaluate(() => document.querySelectorAll('tr.pos').length) > 0,
    await seite.evaluate(() => document.querySelectorAll('tr.pos').length));

  const [MA] = zweiLeere(R1);
  gleich('vor «n» steht der leere Monat leer', await wertVon(seite, monatZelle(R1.id, MA)), '');
  await seite.keyboard.press('n');
  await bisRuhe(seite);
  gleich('nach «n» zeigt derselbe Monat die Null',
    await wertVon(seite, monatZelle(R1.id, MA)), '0');
  gleich('und der Datenstand steht weiterhin auf null',
    await seite.evaluate(([j, rid, m]) => {
      let w = null;
      (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(r => {
        if (r.id === rid) w = r.reihe[m]; }));
      return w;
    }, [ARBEITSJAHR, R1.id, MA]), 0);
}

/* ====================================================================
   11. Der Ring zeigt die ZELLE, nicht das Eingabefeld
      Bis zum 23.08.2026 war der Fokus eine Linie von einem Pixel unter der
      Zahl. Auf 34 px Zeilenhoehe war nicht zu erkennen, in welcher Zelle man
      steht — Albrechts Befund. Der Ring sitzt seither an der Zelle: er zeigt
      die Zellgrenze und nicht die Breite des Felds.
      Gemessen wird die Wirkung am gerenderten Rechteck, nicht die Regel.
   ==================================================================== */
console.log('\n11. Der Fokusring sitzt an der Zelle');
if (MEHR && R2 && volleMonate(R2).length >= 2) {
  await frisch(seite);
  await zuRechnungen(seite);
  await klappeSteller(seite, MEHR.id);
  const [M1, M2] = volleMonate(R2);
  const fehlerVor = fehler.length;

  const ringe = () => seite.evaluate(() => {
    const raus = [];
    document.querySelectorAll('#blatt td').forEach(td => {
      const c = getComputedStyle(td);
      if (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0)
        raus.push({ klasse: td.className, breite: parseFloat(c.outlineWidth),
          farbe: (m => m ? '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('') : c.outlineColor)
            (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c.outlineColor || '')),
          breiteRechteck: Math.round(td.getBoundingClientRect().width) });
    });
    const feld = document.activeElement;
    const fc = feld ? getComputedStyle(feld) : null;
    return { zellen: raus,
      feldRing: fc ? (fc.outlineStyle !== 'none' && parseFloat(fc.outlineWidth) > 0) : null,
      feldBreite: feld && feld.getBoundingClientRect ? Math.round(feld.getBoundingClientRect().width) : null };
  });

  /* Gegenprobe zuerst: ohne Fokus traegt keine Zelle einen Ring. Ohne sie
     waere «genau ein Ring» auch dann gruen, wenn alle einen haetten. */
  const ohne = await ringe();
  gleich('ohne Fokus traegt keine Zelle einen Ring', ohne.zellen.length, 0);

  await seite.locator(monatZelle(R2.id, M1)).click();
  await bisRuhe(seite);
  const mit = await ringe();
  gleich('nach dem Klick traegt genau eine Zelle einen Ring', mit.zellen.length, 1);
  gleich('der Ring ist einen Pixel breit', mit.zellen[0] ? mit.zellen[0].breite : null, 1);
  gleich('der Ring steht in Tinte', mit.zellen[0] ? mit.zellen[0].farbe : null, '#f2f4f4');
  pruef('der Ring sitzt an der Monatszelle',
    !!mit.zellen[0] && /c-mon/.test(mit.zellen[0].klasse), mit.zellen[0] && mit.zellen[0].klasse);
  gleich('das Eingabefeld selbst traegt keinen Ring', mit.feldRing, false);
  /* Der Kern des Befunds: der Ring ist so breit wie die Zelle, nicht so breit
     wie das Feld. Das Feld sitzt im Zellenpolster und ist schmaler. */
  pruef('der Ring ist so breit wie die Zelle und nicht wie das Feld',
    !!mit.zellen[0] && mit.zellen[0].breiteRechteck > mit.feldBreite,
    (mit.zellen[0] && mit.zellen[0].breiteRechteck) + ' gegen ' + mit.feldBreite);

  /* Der Ring wandert mit — er bleibt nicht auf der alten Zelle stehen. */
  await spaeterKlick(seite, monatZelle(R2.id, M2));
  const gewandert = await ringe();
  gleich('nach dem Wechsel traegt weiterhin genau eine Zelle einen Ring', gewandert.zellen.length, 1);
  const wo = await seite.evaluate((s) => {
    const el = document.querySelector(s), td = el ? el.closest('td') : null;
    return td ? (getComputedStyle(td).outlineStyle !== 'none') : null;
  }, monatZelle(R2.id, M2));
  pruef('und zwar die neue', wo === true, wo);

  /* Dieselbe Frage an den drei anderen Feldarten derselben Zeile. */
  for (const [was, sel] of [['Betrag', betragZelle(R2.id)],
                            ['Zweck',  zweckZelle(R2.id)],
                            ['Datum',  datumZelle(R2.id)],
                            ['Stand',  standWahl(R2.id)]]) {
    await spaeterKlick(seite, sel);
    const r = await ringe();
    gleich(was + ': genau eine Zelle traegt den Ring', r.zellen.length, 1);
  }
  pruef('kein JavaScript-Fehler beim Fokusring', fehler.length === fehlerVor, fehler.slice(fehlerVor));
}

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
