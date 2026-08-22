/* GAEPP — Pruefstand: die Eingabe in der Rechnungen-Tabelle.
   Neu am 22.08.2026, fuer Albrechts Meldung: das Textfeld in der ersten Spalte
   sprang auf die Standardbeschriftung (oder Teile davon) zurueck, Betraege
   liessen sich nur erschwert ueberschreiben, der Cursor sprang in die zuvor
   bearbeitete Zelle. Vier Ursachen sind gefunden und behoben:

     Ursache 1  MERKFELD kannte "data-rm" nicht — nach dem Neuzeichnen wurde
                eine Rechnungs-Monatszelle nur ueber [data-m] wiedergesucht und
                der Fokus landete in der Zelle einer ANDEREN Rechnung.
                -> Abschnitt 1 und 2 (2 ist der eigentliche Fehlerfall: quer
                   ueber zwei Rechnungen desselben Stellers).
     Ursache 2  Sofortiges Neuzeichnen im "change" riss die angeklickte Zelle
                weg, bevor der Klick dort ankam. neu() zeichnet jetzt ueber
                zeichneBald() erst im naechsten Durchgang; die Tastatur
                erzwingt ueber zeichneJetztFalls() das sofortige Zeichnen.
                -> Abschnitt 1-5 (jeder echte Klickwechsel durchlaeuft das),
                   Abschnitt 7 ist die Gegenprobe: die Tastatur darf davon
                   nicht betroffen sein.
     Ursache 3  Das stille Sichern (insRepo(true), 2,5 s nach der letzten
                Aenderung) zeichnete frueher das ganze Blatt neu und riss dabei
                einen halb getippten Namen weg. Es zeichnet jetzt ueber
                zeichneRahmen() nur noch den Statuspunkt oben nach.
                -> Abschnitt 6.
     Ursache 4  zeichne() nahm den noch nicht uebernommenen Wert und die
                Auswahl im Feld frueher nicht mit.
                -> Abschnitt 1-5 (jede Pruefung "Wert/Text ist uebernommen").

   Gemessen wird durchgehend mit ECHTEN Mausklicks (locator.click(), nicht
   fill()) und echten Tastendruecken — die Wirkung im DOM und im Datenstand,
   nicht der Quelltext. Was der Quelltext selbst festlegt (die Verzoegerung
   des stillen Sicherns, der Schluessel des Browserspeichers, MERKFELD), wird
   von dort gelesen, nicht abgeschrieben (Hausregel 4). Was vorrat.mjs als
   Ausgangswert traegt (Betraege, Zwecke, Namen), wird von dort gelesen, nicht
   hier ein zweites Mal hingeschrieben.

   Albrechts echte Zahlen, Namen und Zugangsschluessel kommen hier nicht vor:
   Repo und Zugangsschluessel in Abschnitt 6 sind erfunden, und die Anfrage an
   api.github.com wird abgefangen, bevor sie das Netz beruehrt.

   Was dieser Lauf ausdruecklich NICHT prueft: ein echtes GitHub-Repo (immer
   abgefangen) · Persistenz ueber einen echten Browser-Neustart hinweg ·
   Eingabe in der Budget-Tabelle (das leistet bedienung.mjs mit Pfeiltasten;
   die vier Ursachen hier betreffen namentlich die Rechnungen-Tabelle) ·
   Ziehen und Ablegen · die Ansicht "Alle".

   Port 8104. Fahren: node eingabe.mjs */

import { readFileSync } from 'fs';
import { join } from 'path';
import { serve, browser, bilanzbuch, bisRuhe, WURZEL } from './hilfe.mjs';
import { daten as vorratDaten, STICHMONAT } from './vorrat.mjs';

const PORT = 8104;
const ARBEITSJAHR = parseInt(STICHMONAT.slice(0, 4), 10);   /* 2026 — hergeleitet, nicht getippt */
const { pruef, gleich, ende } = bilanzbuch('eingabe');

/* Der konstruierte Datenstand, unveraendert wie der Server ihn ausliefert —
   Ausgangswerte werden von hier gelesen, nicht ein zweites Mal hingeschrieben. */
const FIXTUR = vorratDaten();
function fixSteller(gid) { return (FIXTUR.rechnungen[ARBEITSJAHR] || []).find(x => x.id === gid); }
function fixRechnung(gid, rid) { const g = fixSteller(gid); return g && (g.rechnungen || []).find(x => x.id === rid); }

/* ---------------------------------------------------- Aus dem Quelltext gelesen */
const quelltext = readFileSync(join(WURZEL, 'index.html'), 'utf8');
function lies(muster, name) {
  const m = muster.exec(quelltext);
  if (!m) throw new Error('Im Quelltext von index.html nicht gefunden: ' + name);
  return m;
}
/* Die Verzoegerung des stillen Sicherns — Hausregel 4: gelesen, nicht abgeschrieben. */
const VERZOEGERUNG = parseInt(lies(
  /warteMerken\s*=\s*setTimeout\(\(\)\s*=>\s*\{\s*warteMerken\s*=\s*null;\s*insRepo\(true\);\s*\},\s*(\d+)\)/,
  'Verzoegerung des stillen Sicherns (warteMerken)')[1], 10);
const CONFSCHLUESSEL = lies(/const CONF = '([^']+)'/, 'CONF')[1];
const MERKFELDTEXT = lies(/const MERKFELD = \[([\s\S]*?)\];/, 'MERKFELD')[1];

console.log('\nGegenprobe — aus dem Quelltext gelesen');
pruef('Verzoegerung des stillen Sicherns ist eine plausible Zahl (500-10000 ms)',
  VERZOEGERUNG >= 500 && VERZOEGERUNG <= 10000, VERZOEGERUNG);
gleich('Schluessel des Browserspeichers fuer die Datenanbindung', CONFSCHLUESSEL, 'gaepp.tabelle.anbindung');
pruef('MERKFELD kennt "rm" (Ursache 1 — Rechnungs-Monatszelle, Vorbedingung fuer Abschnitt 1 und 2)',
  /\[\s*'rm'\s*,\s*'rm'\s*\]/.test(MERKFELDTEXT), MERKFELDTEXT.replace(/\s+/g, ' ').trim());

/* ---------------------------------------------------------------- Helfer */

/* Wie in index.html: Apostroph als Tausendertrenner, U+2212 als Minus, null bleibt leer. */
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
/* Ein Rechnungssteller ist in der Rechnungen-Tafel immer eine "kopf"-Zeile. */
async function klappeSteller(seite, gid) {
  await seite.locator('tr.kopf[data-k="' + gid + '"] button.klapper').click();
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
const monatZelle = (rid, m) => 'input.zelle[data-rm="' + rid + '"][data-m="' + m + '"]';
const betragZelle = rid => 'input.zelle[data-r="' + rid + '"][data-f="betrag"]';
const zweckZelle = rid => 'input.namensfeld[data-r="' + rid + '"][data-f="zweck"]';
const datumZelle = rid => 'input.datumsfeld[data-r="' + rid + '"][data-f="datum"]';
const stellerZelle = gid => 'input.namensfeld[data-s="' + gid + '"]';

/* Text markieren wie mit der Maus (Dreifachklick) und echt tippen — nie fill(). */
async function markierenUndTippen(seite, sel, text) {
  await seite.locator(sel).click({ clickCount: 3 });
  await seite.locator(sel).pressSequentially(text);
}

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   1. Echte Mausklicks zwischen zwei Monatszellen derselben Rechnung
   ==================================================================== */
console.log('\n1. Echte Mausklicks zwischen zwei Monatszellen derselben Rechnung');
await frisch(seite);
await zuRechnungen(seite);
await klappeSteller(seite, 'r-oechsli');

const rOe1 = fixRechnung('r-oechsli', 'r-oe-1');
pruef('Rechnung "r-oe-1" in vorrat.mjs gefunden (Voraussetzung)', !!rOe1, rOe1);

if (rOe1) {
  const vorJan = await wertVon(seite, monatZelle('r-oe-1', 0));
  gleich('Ausgangswert Januar (r-oe-1) stimmt mit vorrat.mjs ueberein', vorJan, fmt(rOe1.reihe[0]));

  const neuJan = 1234;
  await seite.locator(monatZelle('r-oe-1', 0)).click();
  await seite.locator(monatZelle('r-oe-1', 0)).pressSequentially(String(neuJan));
  const fehlerVor = fehler.length;
  await seite.locator(monatZelle('r-oe-1', 1)).click();          /* echter Mausklick, kein fill() */
  await bisRuhe(seite);

  const akt = await aktivesFeld(seite);
  pruef('Fokus liegt nach dem Klick genau auf der angeklickten Zelle (r-oe-1, Monat Februar)',
    akt && akt.data.rm === 'r-oe-1' && akt.data.m === '1', akt && akt.data);
  pruef('kein JavaScript-Fehler beim Klickwechsel', fehler.length === fehlerVor, fehler.slice(fehlerVor));

  const nachJan = await wertVon(seite, monatZelle('r-oe-1', 0));
  gleich('der zuvor getippte Wert in Monat Januar ist uebernommen (Ursache 4)', nachJan, fmt(neuJan));
}

/* ====================================================================
   2. Quer ueber zwei verschiedene Rechnungen desselben Stellers — der
      eigentliche Fehlerfall: der Fokus sprang frueher in die falsche Rechnung.
   ==================================================================== */
console.log('\n2. Quer ueber zwei Rechnungen desselben Stellers (Ursache 1)');
await frisch(seite);
await zuRechnungen(seite);
await klappeSteller(seite, 'r-oechsli');   /* enthaelt r-oe-1 UND r-oe-2 */

const rOe2 = fixRechnung('r-oechsli', 'r-oe-2');
pruef('Rechnung "r-oe-2" in vorrat.mjs gefunden (Voraussetzung)', !!rOe2, rOe2);

if (rOe1 && rOe2) {
  /* Gleicher Monat (Mai, m=4) in beiden Rechnungen — genau der Fall, in dem
     MERKFELD frueher nur ueber [data-m="4"] wiedersuchte und den ersten
     Treffer nahm, egal zu welcher Rechnung er gehoerte. */
  const vorMai1 = await wertVon(seite, monatZelle('r-oe-1', 4));
  gleich('Ausgangswert Mai (r-oe-1) stimmt mit vorrat.mjs ueberein', vorMai1, fmt(rOe1.reihe[4]));
  const vorMai2 = await wertVon(seite, monatZelle('r-oe-2', 4));
  gleich('Ausgangswert Mai (r-oe-2) stimmt mit vorrat.mjs ueberein', vorMai2, fmt(rOe2.reihe[4]));

  const neuMai = 777;
  await seite.locator(monatZelle('r-oe-1', 4)).click();
  await seite.locator(monatZelle('r-oe-1', 4)).pressSequentially(String(neuMai));
  const fehlerVor = fehler.length;
  await seite.locator(monatZelle('r-oe-2', 4)).click();          /* echter Mausklick in die ANDERE Rechnung */
  await bisRuhe(seite);

  const akt = await aktivesFeld(seite);
  pruef('Fokus liegt auf r-oe-2 (der tatsaechlich angeklickten Rechnung), Monat Mai',
    akt && akt.data.rm === 'r-oe-2' && akt.data.m === '4', akt && akt.data);
  pruef('Gegenprobe: Fokus liegt NICHT mehr auf r-oe-1 (der zuvor bearbeiteten Rechnung — der alte Fehler)',
    !!akt && akt.data.rm !== 'r-oe-1', akt && akt.data);
  pruef('kein JavaScript-Fehler beim Wechsel ueber zwei Rechnungen', fehler.length === fehlerVor, fehler.slice(fehlerVor));

  const nachMai1 = await wertVon(seite, monatZelle('r-oe-1', 4));
  gleich('der zuvor getippte Wert in r-oe-1/Mai ist uebernommen (Ursache 4)', nachMai1, fmt(neuMai));
  const nachMai2 = await wertVon(seite, monatZelle('r-oe-2', 4));
  gleich('r-oe-2/Mai bleibt unberuehrt', nachMai2, fmt(rOe2.reihe[4]));
}

/* ====================================================================
   3. Betrag ueberschreiben
   ==================================================================== */
console.log('\n3. Betrag ueberschreiben');
await frisch(seite);
await zuRechnungen(seite);
await klappeSteller(seite, 'r-aernst');

const rAe1 = fixRechnung('r-aernst', 'r-ae-1');
pruef('Rechnung "r-ae-1" in vorrat.mjs gefunden (Voraussetzung)', !!rAe1, rAe1);

if (rAe1) {
  const vorBetrag = await wertVon(seite, betragZelle('r-ae-1'));
  gleich('Ausgangsbetrag von r-ae-1 stimmt mit vorrat.mjs ueberein', vorBetrag, fmt(rAe1.betrag));

  const neuerBetragWert = 4500;
  await markierenUndTippen(seite, betragZelle('r-ae-1'), String(neuerBetragWert));   /* markieren, ueberschreiben */
  await seite.locator(datumZelle('r-ae-1')).click();                                /* in eine andere Zelle klicken */
  await bisRuhe(seite);

  const nachBetrag = await wertVon(seite, betragZelle('r-ae-1'));
  gleich('der neue Betrag steht formatiert in der Zelle', nachBetrag, fmt(neuerBetragWert));
  pruef('Gegenprobe: der alte Betrag (' + rAe1.betrag + ') steckt nicht mehr im Feld',
    !nachBetrag.includes(String(rAe1.betrag)), nachBetrag);

  const modell = await seite.evaluate(([jahr, gid, rid]) => {
    const g = (S.rechnungen[jahr] || []).find(x => x.id === gid);
    const r = g && (g.rechnungen || []).find(x => x.id === rid);
    return r ? r.betrag : null;
  }, [ARBEITSJAHR, 'r-aernst', 'r-ae-1']);
  gleich('der Datenstand traegt denselben neuen Betrag', modell, neuerBetragWert);
}

/* ====================================================================
   4. Zweck-Feld und Rechnungssteller-Name ueberschreiben (bestehende Eintraege)
   ==================================================================== */
console.log('\n4. Zweck-Feld und Rechnungssteller-Name ueberschreiben (bestehend)');
await frisch(seite);
await zuRechnungen(seite);
await klappeSteller(seite, 'r-aernst');

const stellerNord = fixSteller('r-nordmann');
pruef('Rechnungssteller "r-nordmann" in vorrat.mjs gefunden (Voraussetzung)', !!stellerNord, stellerNord);

if (rAe1) {
  const vorZweck = await wertVon(seite, zweckZelle('r-ae-1'));
  gleich('Ausgangszweck von r-ae-1 stimmt mit vorrat.mjs ueberein', vorZweck, rAe1.zweck);

  const neuerZweck = 'Jahresabschluss Kontrolle';
  await markierenUndTippen(seite, zweckZelle('r-ae-1'), neuerZweck);
  await seite.locator(stellerZelle('r-nordmann')).click();   /* eine ganz andere Zelle */
  await bisRuhe(seite);

  const nachZweck = await wertVon(seite, zweckZelle('r-ae-1'));
  gleich('der neue Zweck-Text steht unveraendert in der Zelle', nachZweck, neuerZweck);
  pruef('Gegenprobe: der alte Zweck ("' + rAe1.zweck + '") ist weg',
    !nachZweck.includes(rAe1.zweck), nachZweck);
}

if (stellerNord) {
  const vorName = await wertVon(seite, stellerZelle('r-nordmann'));
  gleich('Ausgangsname von r-nordmann stimmt mit vorrat.mjs ueberein', vorName, stellerNord.name);

  const neuerName = 'Suedwind Treuhand';
  await markierenUndTippen(seite, stellerZelle('r-nordmann'), neuerName);
  await seite.locator(stellerZelle('r-aernst')).click();     /* eine ganz andere Zelle */
  await bisRuhe(seite);

  const nachName = await wertVon(seite, stellerZelle('r-nordmann'));
  gleich('der neue Rechnungssteller-Name steht unveraendert in der Zelle', nachName, neuerName);
  pruef('Gegenprobe: der alte Name ("' + stellerNord.name + '") ist weg',
    !nachName.toLowerCase().includes(String(stellerNord.name).toLowerCase()), nachName);
}

/* ====================================================================
   5. Frisch angelegter Rechnungssteller und frisch angelegte Rechnung —
      genau dort fiel das Feld frueher auf die Standardbeschriftung zurueck.
   ==================================================================== */
console.log('\n5. Frisch angelegter Rechnungssteller und frisch angelegte Rechnung');
await frisch(seite);
await zuRechnungen(seite);

await seite.locator('button[data-neu-steller]').click();
await bisRuhe(seite);
const neuerStellerId = await seite.evaluate((jahr) => {
  const g = (S.rechnungen[jahr] || []).find(x => x.name === 'Neuer Rechnungssteller');
  return g ? g.id : null;
}, ARBEITSJAHR);
pruef('frischer Rechnungssteller wurde angelegt', !!neuerStellerId, neuerStellerId);

if (neuerStellerId) {
  const stellerSelNeu = stellerZelle(neuerStellerId);
  const vorNameSteller = await wertVon(seite, stellerSelNeu);
  gleich('traegt vor der Eingabe die Standardbeschriftung', vorNameSteller, 'Neuer Rechnungssteller');

  const neuerNameSteller = 'Frischling Handel AG';
  await markierenUndTippen(seite, stellerSelNeu, neuerNameSteller);
  await seite.locator(stellerZelle('r-aernst')).click();   /* eine ganz andere Zelle */
  await bisRuhe(seite);

  const nameSteller = await wertVon(seite, stellerSelNeu);
  gleich('der neue Name eines frischen Stellers bleibt stehen', nameSteller, neuerNameSteller);
  pruef('Gegenprobe: faellt NICHT auf "Neuer Rechnungssteller" zurueck (auch nicht auf Teile davon)',
    !nameSteller.includes('Neu') && !nameSteller.includes('Rechnungssteller'), nameSteller);

  await seite.locator('tr.kopf[data-k="' + neuerStellerId + '"]').hover();
  await seite.locator('[data-neu-rech="' + neuerStellerId + '"]').click();
  await bisRuhe(seite);
  const neueRechnungId = await seite.evaluate(([jahr, gid]) => {
    const g = (S.rechnungen[jahr] || []).find(x => x.id === gid);
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
    await seite.locator(stellerZelle('r-aernst')).click();
    await bisRuhe(seite);

    const zweckFrisch = await wertVon(seite, zweckSelNeu);
    gleich('der neue Zweck einer frischen Rechnung bleibt stehen', zweckFrisch, neuerZweckFrisch);
    pruef('Gegenprobe: faellt NICHT auf "Neue Rechnung" zurueck (auch nicht auf Teile davon)',
      !zweckFrisch.includes('Neue') && !zweckFrisch.includes('Rechnung'), zweckFrisch);
  }
}

/* ====================================================================
   6. Das stille Sichern zerstoert keine Eingabe (Ursache 3)
   ==================================================================== */
console.log('\n6. Das stille Sichern zerstoert keine Eingabe (Verzoegerung '
  + VERZOEGERUNG + ' ms, aus dem Quelltext gelesen)');
await frisch(seite);
await zuRechnungen(seite);
await klappeSteller(seite, 'r-aernst');

/* Erfundenes Repo, erfundener Zugangsschluessel — nie ein echtes (Hausregel).
   Die Anfrage an api.github.com wird abgefangen und sofort mit einer
   erfundenen Antwort beantwortet, damit kein echtes Netz beruehrt wird und
   der Lauf nicht von einer echten Netzwerklaufzeit abhaengt. */
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

if (rAe1) {
  /* Eine Aenderung ausloesen und committen — das startet die Verzoegerung. */
  await seite.locator(monatZelle('r-ae-1', 0)).click();
  await seite.locator(monatZelle('r-ae-1', 0)).pressSequentially('50');
  await seite.locator(datumZelle('r-ae-1')).click();
  await bisRuhe(seite);

  const punktVorher = await seite.evaluate(() => {
    const p = document.querySelector('.punkt'); return p ? p.dataset.s : null;
  });

  /* Jetzt in ein Textfeld tippen — OHNE es zu verlassen. */
  const textWaehrendSicherns = 'Zwischenstand waehrend des Sicherns';
  await markierenUndTippen(seite, zweckZelle('r-ae-1'), textWaehrendSicherns);

  /* Die eigentliche Probe fuer Ursache 3: waehrend der stillen Sicherung darf
     NUR die Leiste angefasst werden, nicht das Blatt — gemessen ueber einen
     MutationObserver auf den echten DOM-Knoten, nicht ueber das Ergebnis
     (Fokus/Text) allein, das Ursache 1 und 4 fuer sich schon retten wuerden. */
  await seite.evaluate(() => {
    window.__mutBlatt = 0; window.__mutLeiste = 0;
    const opts = { childList: true, subtree: true, attributes: true, characterData: true };
    window.__moBlatt = new MutationObserver(muts => { window.__mutBlatt += muts.length; });
    window.__moLeiste = new MutationObserver(muts => { window.__mutLeiste += muts.length; });
    window.__moBlatt.observe(document.getElementById('blatt'), opts);
    window.__moLeiste.observe(document.getElementById('leiste'), opts);
  });

  const fehlerVor = fehler.length;
  await seite.waitForTimeout(VERZOEGERUNG + 800);   /* laenger als die gelesene Verzoegerung */

  const mutationen = await seite.evaluate(() => {
    window.__moBlatt.disconnect(); window.__moLeiste.disconnect();
    return { blatt: window.__mutBlatt, leiste: window.__mutLeiste };
  });
  gleich('das Blatt (#blatt) wird waehrend des stillen Sicherns NICHT angefasst (Ursache 3, ueber MutationObserver gemessen)',
    mutationen.blatt, 0);
  pruef('die Leiste (#leiste) veraendert sich waehrend des stillen Sicherns (der Statuspunkt wird nachgefuehrt)',
    mutationen.leiste > 0, mutationen);

  const nach = await seite.evaluate((sel) => {
    const el = document.querySelector(sel);
    const akt = document.activeElement;
    const p = document.querySelector('.punkt');
    return { wert: el ? el.value : null, istAktiv: akt === el, punkt: p ? p.dataset.s : null };
  }, zweckZelle('r-ae-1'));

  gleich('der getippte Text steht nach dem stillen Sichern unveraendert im Feld', nach.wert, textWaehrendSicherns);
  pruef('der Fokus ist waehrend des stillen Sicherns im Feld geblieben', nach.istAktiv, nach);
  pruef('der Statuspunkt hat sich trotzdem geaendert (' + punktVorher + ' -> ' + nach.punkt + ')',
    nach.punkt !== punktVorher, nach.punkt);
  pruef('kein JavaScript-Fehler waehrend des stillen Sicherns', fehler.length === fehlerVor, fehler.slice(fehlerVor));
}
await seite.unroute('https://api.github.com/**');

/* ====================================================================
   7. Gegenprobe zur Tastatur — Tab und Pfeile zeichnen weiterhin sofort
      (die Verzoegerung aus Abschnitt 6 darf sie nicht ins Leere laufen lassen)
   ==================================================================== */
console.log('\n7. Gegenprobe zur Tastatur — Tab und Pfeile zeichnen weiterhin sofort');
await frisch(seite);
await zuRechnungen(seite);
await klappeSteller(seite, 'r-oechsli');

if (rOe1) {
  const tabWert = 321;
  await seite.locator(monatZelle('r-oe-1', 0)).click();
  await seite.locator(monatZelle('r-oe-1', 0)).pressSequentially(String(tabWert));
  const fehlerVorTab = fehler.length;
  await seite.locator(monatZelle('r-oe-1', 0)).press('Tab');
  await bisRuhe(seite);

  const aktTab = await aktivesFeld(seite);
  pruef('Tab springt sofort von Monat Januar zu Monat Februar derselben Rechnung',
    aktTab && aktTab.data.rm === 'r-oe-1' && aktTab.data.m === '1', aktTab && aktTab.data);
  const nachTab = await wertVon(seite, monatZelle('r-oe-1', 0));
  gleich('der getippte Wert ist nach Tab sofort uebernommen', nachTab, fmt(tabWert));
  pruef('kein JavaScript-Fehler bei Tab', fehler.length === fehlerVorTab, fehler.slice(fehlerVorTab));
}

if (rOe1 && rOe2) {
  const fehlerVorPfeil = fehler.length;
  await seite.locator(betragZelle('r-oe-1')).click();
  await seite.locator(betragZelle('r-oe-1')).press('ArrowDown');
  await bisRuhe(seite);
  const aktRunter = await aktivesFeld(seite);
  pruef('Pfeil runter springt sofort vom Betrag r-oe-1 zum Betrag r-oe-2 (gleiche Spalte)',
    aktRunter && aktRunter.data.r === 'r-oe-2' && aktRunter.data.f === 'betrag', aktRunter && aktRunter.data);
  pruef('kein JavaScript-Fehler bei Pfeil runter', fehler.length === fehlerVorPfeil, fehler.slice(fehlerVorPfeil));

  await seite.locator(betragZelle('r-oe-2')).press('ArrowUp');
  await bisRuhe(seite);
  const aktRauf = await aktivesFeld(seite);
  pruef('Pfeil rauf springt zurueck vom Betrag r-oe-2 zum Betrag r-oe-1',
    aktRauf && aktRauf.data.r === 'r-oe-1' && aktRauf.data.f === 'betrag', aktRauf && aktRauf.data);
}

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
