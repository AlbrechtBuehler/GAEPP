/* GAEPP — Pruefstand: die Huelle.
   Der Waechter zu A-78: «Die Datei im oeffentlichen Repo enthaelt keine Betraege,
   keine Kontonummern und keine Belege.»

   Herkunft: Diese Pruefung hat es schon einmal gegeben — build_app.py hat sie bei
   jedem Zusammenbau gefahren. Mit dem Zusammenbau fiel sie am 18.08.2026 weg, ohne
   Ersatz. Am 20.08.2026 standen zwei echte Betraege aus Albrechts Bestand in einem
   Quelltextkommentar (U-79/U-85). Ein Waechter, den es nicht mehr gibt, schweigt
   nicht auffaellig — er schweigt gar nicht.

   Dieser Lauf braucht keinen Browser. Er liest die Datei als Text.
   Und er enthaelt selbst keine echten Daten — er sucht Muster, keine Namen. */

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

/* Kein eingebetteter Datenbestand. */
const schema = suche(/schemaVersion["']?\s*:\s*\d/g);
pruef('keine Schemaversion als Literal (kein eingebauter Datenstand)', schema.length === 0, schema[0]);

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
pruef('Schemaversion-Muster trifft', trifft(/schemaVersion["']?\s*:\s*\d/));
pruef('Kommentarbetrag-Muster trifft',
  /\b\d{4,}(?:'\d{3})*(?:\.\d{1,2})?\b/.test('/* Anfang 1.1.2024: 18450.00 */'.replace(/2024/, '')));

console.log(`\n  ${gut} gruen, ${schlecht} rot`);
console.log(`BILANZ huelle ${gut} ${schlecht}`);
process.exit(schlecht ? 1 : 0);
