/* GAEPP — Pruefstand: die Huelle.
   Der Waechter zu A-78: «Die Datei im oeffentlichen Repo enthaelt keine Betraege,
   keine Kontonummern und keine Belege.»

   Herkunft: Diese Pruefung hat es schon einmal gegeben — build_app.py hat sie bei
   jedem Zusammenbau gefahren. Mit dem Zusammenbau fiel sie am 18.08.2026 weg, ohne
   Ersatz. Am 20.08.2026 standen zwei echte Betraege aus Albrechts Bestand in einem
   Quelltextkommentar (U-79/U-85). Ein Waechter, den es nicht mehr gibt, schweigt
   nicht auffaellig — er schweigt gar nicht.

   Dieser Lauf braucht keinen Browser. Er liest die Datei als Text.
   Und er enthaelt selbst keine echten Daten — er sucht Muster, keine Namen.

   Geaendert am 22.08.2026: Die Pruefung «keine Schemaversion als Literal» traf
   nach dem Neubau des Tabellenwerkzeugs zu Unrecht rot — sie fand das Feld
   `schemaVersion: 1` in `nutzdaten()`. Das ist dort der SCHREIBER der Datei
   (die Funktion, die die Ausgabedatei kennzeichnet), kein mitgelieferter
   Datenbestand; die alte Pruefung meinte einen eingebauten Datenbestand wie
   ihn build_app.py frueher mitgeliefert hat. Sie ist deshalb umgebaut worden:
   statt jedes Vorkommens von «schemaVersion» sucht sie jetzt nach der Form
   eines echten Datenbestands — einem Objektliteral mit «jahre:» UND «daten:»
   samt Jahreszahlen in der Naehe (so, wie `vorrat.mjs` seinen Testbestand
   baut), oder einer grossen eingebetteten JSON-Zeichenkette mit denselben
   zwei Schluesseln. Die Schemaversion des Schreibers allein loest sie nicht
   mehr aus — der Zweck der Pruefung bleibt derselbe, nur ihr Treffer ist jetzt
   genauer gefasst. */

import { readFileSync } from 'fs';

const datei = process.argv[2] || new URL('../index.html', import.meta.url).pathname;
const text  = readFileSync(datei, 'utf8');
const zeilen = text.split('\n');

let gut = 0, schlecht = 0;
const pruef = (name, ok, ist) => {
  if (ok) { gut++; console.log('  gruen  ' + name); }
  else { schlecht++; console.log('  ROT    ' + name + (ist !== undefined ? '  ->  ' + ist : '')); }
};

/* Jahreszahlen und Datumsteile sind keine Betraege. */
const istDatumTeil = t =>
  (/^\d{4}$/.test(t) && +t >= 1900 && +t <= 2100) ||
  /^\d{1,2}\.\d{1,2}\.$/.test(t) ||
  /^\d{4}-\d{2}-\d{2}$/.test(t);

const suche = (regex, filter) => {
  const treffer = [];
  zeilen.forEach((z, i) => {
    for (const m of z.matchAll(regex)) {
      if (filter && filter(m[0], z)) continue;
      treffer.push(`Zeile ${i + 1}: ${m[0]}  |  ${z.trim().slice(0, 80)}`);
    }
  });
  return treffer;
};

const istKommentar = z => /^\s*(\/\/|\/\*|\*)/.test(z);

console.log('\nA-78 — keine Daten in der Huelle');

const iban = suche(/CH\d{2}[\s\d]{10,}/g);
pruef('keine IBAN', iban.length === 0, iban[0]);

const apo = suche(/\d{1,3}'\d{3}/g);
pruef('kein Betrag in Schweizer Schreibweise (1\'234)', apo.length === 0, apo[0]);

const mail = suche(/[\w.\-]+@[\w\-]+\.[a-z]{2,}/g);
pruef('keine E-Mail-Adresse', mail.length === 0, mail[0]);

const tel = suche(/\+41[\s\d]{7,}/g);
pruef('keine Telefonnummer', tel.length === 0, tel[0]);

/* Der Fall U-79: ein echter Betrag in einer Kommentarzeile.
   Vierstellig aufwaerts, Jahreszahlen und Datumsteile ausgenommen. */
const kommBetrag = suche(/\b\d{4,}(?:'\d{3})*(?:\.\d{1,2})?\b/g,
  (t, z) => !istKommentar(z) || istDatumTeil(t));
pruef('kein Betrag in einer Kommentarzeile', kommBetrag.length === 0, kommBetrag[0]);

/* Kein eingebetteter Datenbestand. Gesucht wird die FORM eines echten
   Datenbestands, nicht das Feld, mit dem der Schreiber (nutzdaten()) seine
   eigene Ausgabe kennzeichnet: ein Objektliteral, das «jahre:» mit einer
   Jahreszahl UND «daten:» mit einem Zahlen-Schluessel in der Naehe traegt, oder
   eine grosse eingebettete JSON-Zeichenkette mit denselben zwei Schluesseln. */
const findeJahreDatenLiteral = quelle => {
  const treffer = [];
  const reJahre = /jahre\s*:\s*\[\s*['"]?\d{4}/g;
  for (const m of quelle.matchAll(reJahre)) {
    const umfeld = quelle.slice(m.index, m.index + 500);
    if (/daten\s*:\s*\{\s*['"]?\d{4}/.test(umfeld)) {
      const zeile = quelle.slice(0, m.index).split('\n').length;
      treffer.push(`Zeile ${zeile}: ${m[0]} … mit "daten:" in der Nähe`);
    }
  }
  return treffer;
};
const findeGrosseJsonZeichenkette = quelle => {
  const treffer = [];
  /* Eine Zeichenkette (gleiche An- und Abfuehrung) ab 400 Zeichen Inhalt. */
  const reString = /(['"`])((?:(?!\1)[\s\S]){400,}?)\1/g;
  for (const m of quelle.matchAll(reString)) {
    const inhalt = m[2];
    /* Dieselbe FORM wie oben verlangen, nicht nur die beiden Woerter: sonst
       schlaegt der Sucher auf gewoehnlichem Quelltext an, in dem zwischen zwei
       Apostrophen zufaellig «jahre:» und «daten:» stehen — er wuerde dann den
       Schreiber der Datei melden statt eines eingebauten Datenbestands. */
    if (/["']?jahre["']?\s*:\s*\[\s*["']?\d{4}/.test(inhalt)
        && /["']?daten["']?\s*:\s*\{\s*["']?\d{4}/.test(inhalt)) {
      const zeile = quelle.slice(0, m.index).split('\n').length;
      treffer.push(`Zeile ${zeile}: eingebettete Zeichenkette mit ${inhalt.length} Zeichen, trägt jahre/daten`);
    }
  }
  return treffer;
};
const datenbestand = [...findeJahreDatenLiteral(text), ...findeGrosseJsonZeichenkette(text)];
pruef('kein eingebauter Datenbestand (jahre/daten als Literal oder als grosse JSON-Zeichenkette)',
  datenbestand.length === 0, datenbestand[0]);

const anfang = suche(/anfangsstand\s*:\s*[1-9]\d*/g);
pruef('kein Anfangsstand ungleich null im Quelltext', anfang.length === 0, anfang[0]);

/* Gegenprobe. Ein Waechter, der nichts findet, weil er nichts sucht, ist kein Waechter. */
console.log('\nGegenprobe — findet der Sucher ueberhaupt etwas?');
const probe = [
  'const iban = "CH93 0076 2011 6238 5295 7";',
  'const betrag = 12\'500;',
  '/* Anfang 1.1.2024: 18450.00 */',
  'kontakt@beispiel.ch',
  'schemaVersion: 7'
].join('\n');
const trifft = (r) => r.test(probe);
pruef('IBAN-Muster trifft', trifft(/CH\d{2}[\s\d]{10,}/));
pruef('Apostroph-Muster trifft', trifft(/\d{1,3}'\d{3}/));
pruef('E-Mail-Muster trifft', trifft(/[\w.\-]+@[\w\-]+\.[a-z]{2,}/));
pruef('Kommentarbetrag-Muster trifft',
  /\b\d{4,}(?:'\d{3})*(?:\.\d{1,2})?\b/.test('/* Anfang 1.1.2024: 18450.00 */'.replace(/2024/, '')));

/* Gegenprobe fuer die umgebaute Pruefung: Sie muss weiterhin einen echten
   Datenbestand finden — UND darf auf der Schemaversion des Schreibers allein
   nicht mehr anspringen. Das zweite ist die Regressionsprobe fuer genau den
   Fund, der zu dieser Aenderung gefuehrt hat. */
const probeLiteral = 'const EINGEBAUT = {\n'
  + '  jahre: [2024, 2025, 2026],\n'
  + '  daten: { 2024: [{amt:100}], 2025: [{amt:200}] }\n'
  + '};';
pruef('Datenbestand-Muster trifft (jahre + daten als Literal)',
  findeJahreDatenLiteral(probeLiteral).length > 0);
const probeJson = 'const ALT = \'{"jahre":[2024,2025],"daten":{"2024":[1,2,3],"2025":[4,5,6]},'
  + '"fuellstoff":"' + 'x'.repeat(420) + '"}\';';
pruef('Datenbestand-Muster trifft (grosse eingebettete JSON-Zeichenkette)',
  findeGrosseJsonZeichenkette(probeJson).length > 0);
pruef('die Schemaversion des Schreibers allein loest die Pruefung nicht mehr aus (Regressionsprobe)',
  findeJahreDatenLiteral('schemaVersion: 1,').length === 0
  && findeGrosseJsonZeichenkette('schemaVersion: 1,').length === 0);

console.log(`\n  ${gut} gruen, ${schlecht} rot`);
console.log(`BILANZ huelle ${gut} ${schlecht}`);
process.exit(schlecht ? 1 : 0);
