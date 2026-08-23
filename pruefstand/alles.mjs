/* GAEPP — Pruefstand: der Sammellauf.
   Ein Befehl, von hier aus:      node pruefstand/alles.mjs
   Er faehrt jeden Lauf und rechnet die Bilanz nach.

   Der Sammellauf startet KEINEN eigenen Webserver. Jeder Lauf, der einen
   Browser braucht, bedient sich selbst ueber hilfe.mjs (serve()) auf seinem
   eigenen Port. Das haelt die Laeufe unabhaengig voneinander: wer einen
   einzelnen Lauf von Hand startet (z. B. `node rahmen.mjs`), bekommt genau
   dasselbe wie hier.

   Regel 7 des Pruefstands: Ein neuer Lauf wird hier eingetragen, sonst zaehlt
   er nicht mit.
   Regel 8: Die Gesamtzahl wird NACHGERECHNET, nie fortgeschrieben. Sie steht in
   keinem Dokument als Konstante — sie steht unten im Ergebnis.

   Stand 23.08.2026, Neubau 3.0.0: rangordnung.mjs, ausgabe.mjs und mobil.mjs
   sind neu; rechnen, bedienung, rahmen, eingabe, befunde und haerte sind aus
   der Vorgaengerfassung auf den Neubau portiert. bau.mjs und handbuch.mjs
   stehen nicht mehr in der Liste: sie pruefen die Kachelbauart der
   abgeloesten App, deren Selektoren es nicht mehr gibt. */

import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const hier = dirname(fileURLToPath(import.meta.url));

const LAEUFE = [
  { datei: 'huelle.mjs',      was: 'A-78 — keine Daten in der Huelle', browser: false },
  { datei: 'rangordnung.mjs', was: 'Die Rangordnung: Groesse, Gewicht, Regel, Hoehe, Spaltenbreite, kein bunter Ton', browser: true },
  { datei: 'rechnen.mjs',     was: 'Saldo-Uebertrag, Korrekturen, Verteilen und Aufrunden', browser: true },
  { datei: 'bedienung.mjs',   was: 'Klappen, Zaehler, Pfeiltasten, Rechtsklick, Tasten z und n, Jahresansicht der Rechnungen', browser: true },
  { datei: 'rahmen.mjs',      was: 'Kopf, Band, Fusszeile, Version, Handbuch, Dreieck, eingebettete Schrift, Druck', browser: true },
  { datei: 'eingabe.mjs',     was: 'Eingabe — Fokus nach echtem Klick, Betrag/Zweck/Name/Datum/Stand, stilles Sichern, Tastatur', browser: true },
  { datei: 'ausgabe.mjs',     was: 'HTML-Export, CSV und Papier', browser: true },
  { datei: 'befunde.mjs',     was: 'Die Befunde der Nachkontrolle vom 22.08.2026, auf den Neubau nachgezogen', browser: true },
  { datei: 'haerte.mjs',      was: 'Ziehen und Ablegen, Escape je Fenster, Notausgang, Klick und Doppelklick, Grenzfaelle', browser: true },
  { datei: 'mobil.mjs',       was: 'Das Telefon: 390 x 844, ein Monat untereinander', browser: true }
];

/* Faehrt eine Datei als eigenen Prozess und liest ihre Bilanzzeile aus der
   Ausgabe. Stuerzt der Prozess ab, ohne eine Bilanzzeile zu schreiben, zaehlt
   das als ABGEBROCHEN — nicht als leise Null. */
const fahre = (datei) => new Promise(fertig => {
  const k = spawn(process.execPath, [join(hier, datei)], { stdio: ['ignore', 'pipe', 'inherit'] });
  let aus = '';
  k.stdout.on('data', d => { aus += d; process.stdout.write(d); });
  k.on('close', code => {
    const m = aus.match(/^BILANZ \S+ (\d+) (\d+)$/m);
    fertig(m ? { gut: +m[1], schlecht: +m[2] } : { gut: 0, schlecht: 0, kaputt: true, code });
  });
});

const bilanz = [];
for (const l of LAEUFE) {
  console.log('\n' + '='.repeat(62));
  console.log('  ' + l.datei + '   ·   ' + l.was);
  console.log('='.repeat(62));
  /* Ein fehlender Lauf ist ein rot, kein Abbruch des Sammellaufs — die anderen
     Laeufe zaehlen trotzdem. */
  if (!existsSync(join(hier, l.datei))) {
    console.log('  ROT    Lauf fehlt — ' + l.datei + ' liegt (noch) nicht in pruefstand/');
    bilanz.push({ ...l, gut: 0, schlecht: 1, fehlt: true });
    continue;
  }
  bilanz.push({ ...l, ...(await fahre(l.datei)) });
}

const gut = bilanz.reduce((a, x) => a + x.gut, 0);
const schlecht = bilanz.reduce((a, x) => a + x.schlecht, 0);
const kaputt = bilanz.filter(x => x.kaputt);

console.log('\n' + '='.repeat(62));
console.log('  BILANZ');
console.log('='.repeat(62));
for (const b of bilanz) {
  console.log(`  ${b.datei.padEnd(16)} ${String(b.gut).padStart(4)} gruen  ${String(b.schlecht).padStart(3)} rot` +
              (b.fehlt ? '   LAUF FEHLT' : b.kaputt ? '   ABGEBROCHEN (Code ' + b.code + ')' : ''));
}
console.log('  ' + '-'.repeat(58));
console.log(`  ${'zusammen'.padEnd(16)} ${String(gut).padStart(4)} gruen  ${String(schlecht).padStart(3)} rot`);
console.log('='.repeat(62));
console.log('  Diese Zahl ist nachgerechnet, nicht fortgeschrieben.');
process.exit(schlecht || kaputt.length ? 1 : 0);
