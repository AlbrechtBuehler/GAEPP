/* GAEPP — Pruefstand: die Rangordnung.

   Was dieser Lauf prueft: dass die Gestaltung, die im Uebergabepaket
   «design_handoff_gaepp_bauhaus» festgelegt ist, im laufenden Werkzeug auch
   ankommt. Leitgedanke des Entwurfs: Rang entsteht aus Schriftgroesse und
   Gewicht, nicht aus Flaeche und nicht aus Farbe.

   Woher die Erwartungswerte kommen. Das Paket hat zwei Stimmen:
     - README.md — die Prosa. Sie nennt Rollen, Groessen, Gewichte, Hoehen.
     - dunkel.dc.html — die Referenzzeichnung («Fidelity: Hi-fi»). Sie traegt
       dieselben Werte als fertige Stilangaben.
   Wo beide dasselbe sagen, ist der Fall klar. Wo die Prosa unscharf ist («Muted»
   ohne Buchstaben) oder sich selbst widerspricht, gilt die Zeichnung — sie ist
   das Bild, die Prosa ihre Zusammenfassung. Jede Stelle, an der das zum Tragen
   kommt, ist unten einzeln vermerkt. Kein Erwartungswert stammt aus einem
   frueheren Lauf dieses Werkzeugs.

   Wie gemessen wird: getComputedStyle, getBoundingClientRect, sichtbarer Text.
   Nie ein Vorkommen im CSS-Text — was im Blatt steht, entscheidet nicht; was am
   Element ankommt, entscheidet. Genau daran haengen zwei der Befunde, die dieser
   Lauf traegt: eine Regel kann dastehen und trotzdem von einer staerkeren
   ueberstimmt werden.

   Gegenproben: wo gegen eine Liste geprueft wird, zaehlt der Lauf mit, wie viele
   Knoten er ueberhaupt angesehen hat, und weist das als eigene Pruefung aus.
   Eine Pruefung, die auf einer leeren Probenliste gruen wird, prueft nichts. */

import { serve, browser, bilanzbuch } from './hilfe.mjs';
import { STICHJAHR, STICHM, JAHRE, daten } from './vorrat.mjs';

const PORT = 8731;
const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);
const { pruef, gleich, ende } = bilanzbuch('rangordnung');

/* Ohne geladene Schrift misst man die Ersatzschrift des Systems — dann stimmen
   Breiten und Zeilenhoehen nicht mehr, und der Ziffernvergleich weiter unten
   wuerde etwas anderes messen als gemeint. */
await seite.evaluate(() => document.fonts.ready);

/* ------------------------------------------------------------ Werkzeug ---- */

/* Ein Messpunkt. Nur berechnete Werte und gemessene Rechtecke. */
const messe = (wahl, nr) => seite.evaluate(([w, n]) => {
  const e = document.querySelectorAll(w)[n || 0];
  if (!e) return null;
  const c = getComputedStyle(e), r = e.getBoundingClientRect();
  const hex = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v || '');
    return m ? '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join('') : v; };
  const rund = x => Math.round(x * 1000) / 1000;
  return {
    text: (e.textContent || '').trim(),
    wert: e.value !== undefined ? e.value : null,
    groesse: parseFloat(c.fontSize),
    gewicht: c.fontWeight,
    sperrung: c.letterSpacing === 'normal' ? 'normal' : rund(parseFloat(c.letterSpacing)),
    versal: c.textTransform,
    farbe: hex(c.color),
    flaeche: c.backgroundColor,
    obenBreit: parseFloat(c.borderTopWidth), obenFarbe: hex(c.borderTopColor),
    obenArt: c.borderTopStyle,
    untenBreit: parseFloat(c.borderBottomWidth), untenFarbe: hex(c.borderBottomColor),
    untenArt: c.borderBottomStyle,
    linksAbstand: parseFloat(c.paddingLeft), rechtsAbstand: parseFloat(c.paddingRight),
    fussAbstand: parseFloat(c.paddingBottom),
    stellung: c.verticalAlign, umbruch: c.whiteSpace,
    breite: Math.round(r.width * 100) / 100, hoehe: Math.round(r.height * 100) / 100
  };
}, [wahl, nr]);

const zaehl = (wahl) => seite.evaluate(w => document.querySelectorAll(w).length, wahl);
const text  = (wahl) => seite.evaluate(w => { const e = document.querySelector(w);
  return e ? (e.textContent || '').trim() : null; }, wahl);
const breiten = (wahl) => seite.evaluate(w => [...document.querySelectorAll(w)]
  .map(e => Math.round(e.getBoundingClientRect().width)), wahl);

/* Die Sperrung steht in der Uebergabe in em, im Browser kommt sie in px an. */
const sperr = (em, px) => Math.round(em * px * 1000) / 1000;

/* Die zwoelf Farbrollen, Spalte «Dunkel (Vorgabe)» der Uebergabe. Sie stehen
   hier einmal; jede Farbpruefung nennt danach die Rolle und nicht den Zahlwert. */
const T = { grund: '#2e3133', umgebung: '#1f2224', tinte: '#f2f4f4', sek: '#d2d5d6',
  ruhig: '#bcbfc0', mA: '#aaaeaf', mB: '#a5a9aa', mC: '#929698',
  rStark: '#878c8e', rMittel: '#5f6467', rLeise: '#43474a', faint: '#6e7274' };

/* Warten, bis das Blatt wirklich das ist, auf das gemessen werden soll. Ein
   fester Zeitwert waere geraten; der Blatttitel ist gemessen. */
const warteTitel = (muster) => seite.waitForFunction(
  m => new RegExp(m).test(document.querySelector('.titel').textContent),
  muster, { timeout: 8000 });

/* Aus «Alle Jahre» heraus schaltet ein Klick auf ein Ansichtswort nur den Zweig
   um, nicht die Ansicht — der Rueckweg fuehrt ueber einen Jahrgang. */
const geh = async (wahl, muster) => {
  for (let i = 0; i < 4; i++) {
    await seite.click(wahl);
    try { await warteTitel(muster); return; } catch (e) { /* weiter unten */ }
    const jahr = await seite.$('.jg');
    if (jahr) { await jahr.click(); await seite.waitForTimeout(300); }
  }
  await warteTitel(muster);
};

/* Im Ruhezustand koennen Sektionen zu sein — dann gibt es keine Gruppen- und
   Positionszeilen zu messen. «z» klappt alles auf. */
const aufklappen = async () => {
  for (let i = 0; i < 3; i++) {
    if (await zaehl('tr.pos')) break;
    await seite.click('.titel');
    await seite.keyboard.press('z');
    await seite.waitForTimeout(400);
  }
  return zaehl('tr.pos');
};

const zumJahr = async (j) => { await seite.click('[data-geh-jahr="' + j + '"]');
  await seite.waitForTimeout(300); await aufklappen(); };

/* Die Farbstich-Suche. Sie liefert nicht nur die Treffer, sondern auch, wie
   viele Knoten und wie viele Farbwerte sie ueberhaupt angesehen hat — sonst
   liesse sich «nichts gefunden» nicht von «nichts gesucht» unterscheiden.
   Ein Ton gilt als bunt, wenn seine Kanaele um mehr als 10 auseinanderliegen;
   die ganze Palette der Uebergabe liegt unter 6 (Grund 2e/31/33 -> 5). */
const farbstich = () => seite.evaluate(() => {
  const felder = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke'];
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
        treffer.push(e.tagName.toLowerCase() + ' ' + p + ' ' + v);
    });
  });
  return { treffer, knoten, werte };
});

/* =========================================================================
   1. Farbrollen in :root
   Die zwoelf Rollen der Farbtabelle. Geprueft wird der Wert, der am Wurzel-
   element ankommt — eine Rolle, die nur im Blatt steht, aber nicht berechnet
   wird, waere keine.
   ========================================================================= */
console.log('\n1 — Farbrollen');
const rollen = await seite.evaluate(() => {
  const c = getComputedStyle(document.documentElement);
  const n = ['--grund','--umgebung','--tinte','--sek','--ruhig','--mA','--mB','--mC',
             '--rStark','--rMittel','--rLeise','--faint'];
  const o = {}; n.forEach(k => o[k] = c.getPropertyValue(k).trim());
  const hex = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v || '');
    return m ? '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('') : v; };
  o.fensterGrund = hex(getComputedStyle(document.body).backgroundColor);
  o.fensterTinte = hex(getComputedStyle(document.body).color);
  return o;
});
gleich('Rolle Grund des Fensters',   rollen['--grund'],    T.grund);
gleich('Rolle Umgebung',             rollen['--umgebung'], T.umgebung);
gleich('Rolle Tinte',                rollen['--tinte'],    T.tinte);
gleich('Rolle Sekundaer',            rollen['--sek'],      T.sek);
gleich('Rolle Ruhiger Text',         rollen['--ruhig'],    T.ruhig);
gleich('Rolle Muted A',              rollen['--mA'],       T.mA);
gleich('Rolle Muted B',              rollen['--mB'],       T.mB);
gleich('Rolle Muted C',              rollen['--mC'],       T.mC);
gleich('Rolle Regel stark',          rollen['--rStark'],   T.rStark);
gleich('Rolle Regel mittel',         rollen['--rMittel'],  T.rMittel);
gleich('Rolle Regel leise',          rollen['--rLeise'],   T.rLeise);
gleich('Rolle Faint',                rollen['--faint'],    T.faint);
/* Gegenprobe zu den zwoelf: die Rollen sind nicht nur gesetzt, sie wirken auch. */
gleich('das Fenster steht auf Grund', rollen.fensterGrund, T.grund);
gleich('das Fenster schreibt in Tinte', rollen.fensterTinte, T.tinte);

/* =========================================================================
   2. Rangordnung im Budgetblatt
   Die Tabelle «Rangordnung im Blatt» der Uebergabe, Zeile fuer Zeile:
   Groesse, Gewicht, Sperrung, Farbe, Regel, Hoehe.
   ========================================================================= */
await geh('[data-geh-ansicht="budget"]', '^Budget');
await zumJahr(STICHJAHR);
console.log('\n2 — Rangordnung im Budget');

/* -- Tabellenkopf: Monate 400 10px .2em uppercase; Regel unten 1px stark; 34px */
const kMon = await messe('thead th.c-mon:not(.stich)');
gleich('Kopf, Monat: Groesse',   kMon.groesse, 10);
gleich('Kopf, Monat: Gewicht',   kMon.gewicht, '400');
gleich('Kopf, Monat: Sperrung',  kMon.sperrung, sperr(.2, 10));
gleich('Kopf, Monat: Versalien', kMon.versal, 'uppercase');
/* Farbe: die Prosa nennt in der Rangtabelle «Muted C», in der Farbtabelle heisst
   Muted B «Versal-Labels» — und ein Monatskopf ist ein Versal-Label. Die
   Referenzzeichnung entscheidet: sie setzt die Monatskoepfe auf #a5a9aa. */
gleich('Kopf, Monat: Farbe Muted B', kMon.farbe, T.mB);
gleich('Kopf: Regel unten stark, Breite', kMon.untenBreit, 1);
gleich('Kopf: Regel unten stark, Farbe',  kMon.untenFarbe, T.rStark);
gleich('Kopf: keine Regel oben',          kMon.obenBreit, 0);
gleich('Kopf: Hoehe',                     kMon.hoehe, 34);

/* -- Stichmonat im Kopf: 500 12px, Tinte. Der Stichmonat ist der einzige Monat
      mit eigenem Rang; welcher es ist, sagt der Vorrat. */
const kStich = await messe('thead th.stich');
gleich('Kopf, Stichmonat: Ziffer',  kStich.text, String(STICHM + 1).padStart(2, '0'));
gleich('Kopf, Stichmonat: Groesse', kStich.groesse, 12);
gleich('Kopf, Stichmonat: Gewicht', kStich.gewicht, '500');
gleich('Kopf, Stichmonat: Farbe Tinte', kStich.farbe, T.tinte);
pruef('Kopf: genau ein Stichmonat ausgezeichnet', (await zaehl('thead th.stich')) === 1);

/* -- Saldo: Name 500 17px .2em uppercase Tinte nowrap; Zahlen 500 17px,
      Jahresspalte 500 18px; Regel unten 1px mittel, padding-bottom 8px; 56px */
const sN = await messe('tr.saldo td.c-name');
const sZ = await messe('tr.saldo td.c-mon');
const sJ = await messe('tr.saldo td.c-jahr');
gleich('Saldo, Name: Groesse',   sN.groesse, 17);
gleich('Saldo, Name: Gewicht',   sN.gewicht, '500');
gleich('Saldo, Name: Sperrung',  sN.sperrung, sperr(.2, 17));
gleich('Saldo, Name: Versalien', sN.versal, 'uppercase');
gleich('Saldo, Name: Farbe Tinte', sN.farbe, T.tinte);
gleich('Saldo, Name: kein Umbruch', sN.umbruch, 'nowrap');
gleich('Saldo, Zahl: Groesse',   sZ.groesse, 17);
gleich('Saldo, Zahl: Gewicht',   sZ.gewicht, '500');
gleich('Saldo, Jahresspalte: Groesse', sJ.groesse, 18);
gleich('Saldo, Jahresspalte: Gewicht', sJ.gewicht, '500');
gleich('Saldo: Regel unten mittel, Breite', sZ.untenBreit, 1);
gleich('Saldo: Regel unten mittel, Farbe',  sZ.untenFarbe, T.rMittel);
gleich('Saldo: Fussabstand',                sZ.fussAbstand, 8);
gleich('Saldo: Hoehe', (await messe('tr.saldo')).hoehe, 56);

/* -- Kategorie: Name 500 15px .26em uppercase; Chevron 200 15px, davor gap 14px;
      Anzahl 300 12px; Zahlen 500 15px, Jahr 500 16px; Regel 1px stark;
      54px, vertical-align bottom, padding-bottom 12px.
      Der Name haengt am Klappknopf, nicht an der Zelle — dort steht er auch in
      der Referenz. */
const katK = await messe('tr.kat .klapper');
const katZ = await messe('tr.kat td.c-mon');
const katJ = await messe('tr.kat td.c-jahr');
gleich('Kategorie, Name: Groesse',   katK.groesse, 15);
gleich('Kategorie, Name: Gewicht',   katK.gewicht, '500');
gleich('Kategorie, Name: Sperrung',  katK.sperrung, sperr(.26, 15));
gleich('Kategorie, Name: Versalien', katK.versal, 'uppercase');
gleich('Kategorie, Name: Farbe Tinte', katK.farbe, T.tinte);
const katC = await messe('tr.kat .chev');
gleich('Kategorie, Chevron: Groesse', katC.groesse, 15);
gleich('Kategorie, Chevron: Gewicht', katC.gewicht, '200');
pruef('Kategorie, Chevron: − offen oder + zu', ['−','+'].indexOf(katC.text) >= 0, katC.text);
gleich('Kategorie, Zahl: Groesse',   katZ.groesse, 15);
gleich('Kategorie, Zahl: Gewicht',   katZ.gewicht, '500');
gleich('Kategorie, Jahr: Groesse',   katJ.groesse, 16);
gleich('Kategorie, Jahr: Gewicht',   katJ.gewicht, '500');
gleich('Kategorie: Regel oben stark, Breite', katZ.obenBreit, 1);
gleich('Kategorie: Regel oben stark, Farbe',  katZ.obenFarbe, T.rStark);
gleich('Kategorie: steht auf der Grundlinie',  katZ.stellung, 'bottom');
gleich('Kategorie: Fussabstand',              katZ.fussAbstand, 12);
gleich('Kategorie: Hoehe', (await messe('tr.kat')).hoehe, 54);

/* -- Gruppe: Name 400 15px .06em; Chevron 200 13px; Einzug 22px;
      Zahlen 400 14px, abgehakt 500 14px, Jahr 500 14px; Regel 1px mittel; 40px */
const grpK = await messe('tr.grp .klapper');
const grpN = await messe('tr.grp td.c-name');
/* Abgehakt hebt das Gewicht — eine abgehakte Zelle ist deshalb der falsche
   Messpunkt fuer die gewoehnliche Gruppenzahl. Beide Faelle stehen unten
   getrennt. */
const grpZ = await messe('tr.grp td.c-mon:not(.hak)');
const grpJ = await messe('tr.grp td.c-jahr');
gleich('Gruppe, Name: Groesse',   grpK.groesse, 15);
gleich('Gruppe, Name: Gewicht',   grpK.gewicht, '400');
gleich('Gruppe, Name: Sperrung',  grpK.sperrung, sperr(.06, 15));
gleich('Gruppe, Name: keine Versalien', grpK.versal, 'none');
gleich('Gruppe, Chevron: Groesse', (await messe('tr.grp .chev')).groesse, 13);
gleich('Gruppe, Chevron: Gewicht', (await messe('tr.grp .chev')).gewicht, '200');
gleich('Gruppe: Einzug',          grpN.linksAbstand, 22);
gleich('Gruppe, Zahl: Groesse',   grpZ.groesse, 14);
gleich('Gruppe, Zahl: Gewicht',   grpZ.gewicht, '400');
gleich('Gruppe, Jahr: Groesse',   grpJ.groesse, 14);
gleich('Gruppe, Jahr: Gewicht',   grpJ.gewicht, '500');
/* «abgehakt 500 14px» — der Rangwechsel auch auf der Gruppenzeile. */
const grpHakZahl = await zaehl('tr.grp td.c-mon.hak');
pruef('abgehakte Gruppenzellen im Blatt vorhanden (Gegenprobe)', grpHakZahl > 0, grpHakZahl);
const grpH = await messe('tr.grp td.c-mon.hak');
gleich('Gruppe, abgehakt: Groesse', grpH.groesse, 14);
gleich('Gruppe, abgehakt: Gewicht', grpH.gewicht, '500');
gleich('Gruppe: Regel oben mittel, Breite', grpZ.obenBreit, 1);
gleich('Gruppe: Regel oben mittel, Farbe',  grpZ.obenFarbe, T.rMittel);
gleich('Gruppe: Hoehe', (await messe('tr.grp')).hoehe, 40);

/* -- Position: Name 300 13.5px .02em; Einzug 40px; Zahlen 300 13.5px,
      abgehakt 500 13.5px Tinte; Jahr 400 13.5px Tinte; Regel 1px leise; 34px.
      Farbe: die Rangtabelle der Prosa sagt «Muted A», ihre eigene Farbtabelle
      weist Sekundaer ausdruecklich den «Positionszahlen» zu — beides zugleich
      geht nicht. Die Referenzzeichnung setzt Name und Zahl auf #d2d5d6. */
const posN = await messe('tr.pos td.c-name');
const posZ = await messe('tr.pos td.c-mon:not(.hak)');
const posJ = await messe('tr.pos td.c-jahr');
gleich('Position, Name: Groesse',  posN.groesse, 13.5);
gleich('Position, Name: Gewicht',  posN.gewicht, '300');
gleich('Position, Name: Sperrung', posN.sperrung, sperr(.02, 13.5));
gleich('Position, Name: Farbe Sekundaer', posN.farbe, T.sek);
gleich('Position: Einzug',         posN.linksAbstand, 40);
gleich('Position, Zahl: Groesse',  posZ.groesse, 13.5);
gleich('Position, Zahl: Gewicht',  posZ.gewicht, '300');
gleich('Position, Zahl: Farbe Sekundaer', posZ.farbe, T.sek);
gleich('Position, Jahr: Groesse',  posJ.groesse, 13.5);
gleich('Position, Jahr: Gewicht',  posJ.gewicht, '400');
gleich('Position, Jahr: Farbe Tinte', posJ.farbe, T.tinte);
gleich('Position: Regel oben leise, Breite', posZ.obenBreit, 1);
gleich('Position: Regel oben leise, Farbe',  posZ.obenFarbe, T.rLeise);
gleich('Position: Hoehe', (await messe('tr.pos')).hoehe, 34);
/* Abgehakt heisst halbfett in Tinte — der einzige Rangwechsel im Blatt, den die
   Bedienung ausloest. Ohne mindestens eine abgehakte Zelle prueft das nichts,
   deshalb steht die Anzahl als eigene Zeile davor. */
const hakenZahl = await zaehl('tr.pos td.c-mon.hak');
pruef('abgehakte Zellen im Blatt vorhanden (Gegenprobe)', hakenZahl > 0, hakenZahl);
const posH = await messe('tr.pos td.c-mon.hak');
gleich('Position, abgehakt: Groesse', posH.groesse, 13.5);
gleich('Position, abgehakt: Gewicht', posH.gewicht, '500');
gleich('Position, abgehakt: Farbe Tinte', posH.farbe, T.tinte);

/* -- Summe: Name 400 11.5px .24em uppercase Muted A; Marke daneben 300 10px
      .16em; Zahlen 400 14px, Jahr 500 14px; Regel 1px stark; 44px.
      Die Prosa nennt die Marke «Faint», die Referenzzeichnung #929698. */
const sumN = await messe('tr.sum td.c-name');
const sumZ = await messe('tr.sum td.c-mon');
const sumJ = await messe('tr.sum td.c-jahr');
gleich('Summe, Name: Groesse',   sumN.groesse, 11.5);
gleich('Summe, Name: Gewicht',   sumN.gewicht, '400');
gleich('Summe, Name: Sperrung',  sumN.sperrung, sperr(.24, 11.5));
gleich('Summe, Name: Versalien', sumN.versal, 'uppercase');
gleich('Summe, Name: Farbe Muted A', sumN.farbe, T.mA);
gleich('Summe, Zahl: Groesse',   sumZ.groesse, 14);
gleich('Summe, Zahl: Gewicht',   sumZ.gewicht, '400');
gleich('Summe, Jahr: Groesse',   sumJ.groesse, 14);
gleich('Summe, Jahr: Gewicht',   sumJ.gewicht, '500');
gleich('Summe: Regel oben stark, Breite', sumZ.obenBreit, 1);
gleich('Summe: Regel oben stark, Farbe',  sumZ.obenFarbe, T.rStark);
gleich('Summe: Hoehe', (await messe('tr.sum')).hoehe, 44);
const markeZahl = await zaehl('tr.sum .marke');
pruef('Summenmarke vorhanden (Gegenprobe)', markeZahl > 0, markeZahl);
const marke = await messe('tr.sum .marke');
gleich('Summenmarke: Groesse',   marke.groesse, 10);
gleich('Summenmarke: Gewicht',   marke.gewicht, '300');
gleich('Summenmarke: Sperrung',  marke.sperrung, sperr(.16, 10));
gleich('Summenmarke: Versalien', marke.versal, 'uppercase');
gleich('Summenmarke: Farbe Muted C', marke.farbe, T.mC);

/* -- Summe stark: Name 500 19px .24em uppercase Tinte; Zahlen 500 18px,
      Jahr 500 19px; Regel 1px stark; 64px */
const stN = await messe('tr.sumstark td.c-name');
const stZ = await messe('tr.sumstark td.c-mon');
const stJ = await messe('tr.sumstark td.c-jahr');
gleich('Summe stark, Name: Groesse',   stN.groesse, 19);
gleich('Summe stark, Name: Gewicht',   stN.gewicht, '500');
gleich('Summe stark, Name: Sperrung',  stN.sperrung, sperr(.24, 19));
gleich('Summe stark, Name: Versalien', stN.versal, 'uppercase');
gleich('Summe stark, Name: Farbe Tinte', stN.farbe, T.tinte);
gleich('Summe stark, Zahl: Groesse',   stZ.groesse, 18);
gleich('Summe stark, Zahl: Gewicht',   stZ.gewicht, '500');
gleich('Summe stark, Jahr: Groesse',   stJ.groesse, 19);
gleich('Summe stark, Jahr: Gewicht',   stJ.gewicht, '500');
gleich('Summe stark: Regel oben stark, Breite', stZ.obenBreit, 1);
gleich('Summe stark: Regel oben stark, Farbe',  stZ.obenFarbe, T.rStark);
gleich('Summe stark: Hoehe', (await messe('tr.sumstark')).hoehe, 64);

/* Die Raenge sind nur dann eine Ordnung, wenn sie sich auch unterscheiden.
   Ohne diese Zeile koennten alle sieben Messungen einzeln stimmen und die
   Ordnung trotzdem eingeebnet sein. */
pruef('Position leiser als Kategorie, Kategorie leiser als Summe stark',
  posZ.groesse < katZ.groesse && katZ.groesse < stZ.groesse,
  posZ.groesse + ' / ' + katZ.groesse + ' / ' + stZ.groesse);

/* =========================================================================
   10. Die geerbte Basis
   «Basis 300 (geerbt 200, Faint)» sagt die Prosa; die Referenzzeichnung setzt
   die geerbte Basis auf 200 und #929698 — Muted C. Das ist der Wert, auf den
   der Bau festgelegt ist (Befund B1).
   Der Befund lag nicht daran, dass die Regel fehlte, sondern daran, dass sie
   von der allgemeineren Regel fuer die Basisspalte ueberstimmt wurde. Deshalb
   wird hier die Wirkung gemessen und nicht das Vorhandensein der Regel — und
   deshalb steht die Gegenprobe dabei: im ersten Jahrgang gibt es keine geerbte
   Basis, dort muss dieselbe Spalte anders aussehen.
   ========================================================================= */
console.log('\n10 — geerbte Basis');
const geerbtZahl = await zaehl('tr.pos td.c-basis.geerbt');
pruef('geerbte Basiszellen im Stichjahr vorhanden (Gegenprobe)', geerbtZahl > 0, geerbtZahl);
const geerbt = await messe('tr.pos td.c-basis.geerbt');
gleich('geerbte Basis: Gewicht',  geerbt.gewicht, '200');
gleich('geerbte Basis: Farbe Muted C', geerbt.farbe, T.mC);
gleich('geerbte Basis: Groesse',  geerbt.groesse, 13.5);
await zumJahr(JAHRE[0]);
const eigenZahl = await zaehl('tr.pos td.c-basis[data-kb]:not(.geerbt)');
pruef('eigener Anfangsstand im ersten Jahrgang vorhanden (Gegenprobe)', eigenZahl > 0, eigenZahl);
const eigen = await messe('tr.pos td.c-basis[data-kb]:not(.geerbt)');
gleich('eigener Anfangsstand: Gewicht', eigen.gewicht, '300');
gleich('eigener Anfangsstand: Farbe Muted A', eigen.farbe, T.mA);
pruef('geerbt und eigen sind wirklich zu unterscheiden',
  geerbt.gewicht !== eigen.gewicht && geerbt.farbe !== eigen.farbe,
  geerbt.gewicht + '/' + geerbt.farbe + ' gegen ' + eigen.gewicht + '/' + eigen.farbe);
pruef('im ersten Jahrgang gibt es keine geerbte Basis',
  (await zaehl('tr.pos td.c-basis.geerbt')) === 0);
await zumJahr(STICHJAHR);

/* =========================================================================
   5a. Spaltenbreiten und Blattrand im Budget
   «Budget: Name 300, Basis 100, 12 Monate (Rest, je ~117), Jahr/Rest 130.
    Blattrand links und rechts 54 px.»
   Die Monatsbreite ist in der Uebergabe ausdruecklich ungefaehr und haengt am
   Fenster — geprueft wird deshalb ihre Anzahl und ihre Gleichheit, nicht ihr
   Zahlwert. Gerundet wird auf ganze Pixel: den Rest einer Division verteilt der
   Browser, das ist keine Frage der Gestaltung.
   ========================================================================= */
console.log('\n5a — Spaltenbreiten Budget');
gleich('Budget: Namensspalte', (await messe('thead th.c-name')).breite, 300);
gleich('Budget: Basisspalte',  (await messe('thead th.c-basis')).breite, 100);
gleich('Budget: Jahresspalte', (await messe('thead th.c-jahr')).breite, 130);
const bMon = await breiten('thead th.c-mon');
gleich('Budget: zwoelf Monatsspalten', bMon.length, 12);
pruef('Budget: alle Monatsspalten gleich breit', new Set(bMon).size === 1, bMon.join('/'));
const blatt = await messe('.blatt');
gleich('Blattrand links',  blatt.linksAbstand, 54);
gleich('Blattrand rechts', blatt.rechtsAbstand, 54);
gleich('Kopf der Namensspalte ohne Beschriftung',  await text('thead th.c-name'), '');
gleich('Kopf der Basisspalte ohne Beschriftung',   await text('thead th.c-basis'), '');

/* =========================================================================
   6. Kopf des Fensters und Fusszeile
   Zeile 1: Hoehe 96, Rand 54, Wortmarke 300 34px .3em uppercase, rechts drei
   Zeichen zu je 26 x 26 px mit gap 26.
   Nicht geprueft: die Hoehe von Zeile 2 («~50 px» — die Uebergabe sagt selbst
   ungefaehr) und die Hoehe von Zeile 3 (die Prosa nennt 44 px, die Referenz-
   zeichnung setzt dort keine Hoehe, sondern 24 px oben und 14 px unten; eine
   Frage mit zwei Antworten stellt dieser Lauf nicht).
   ========================================================================= */
console.log('\n6 — Kopf und Fusszeile');
const kopf1 = await messe('.kopf1');
gleich('Kopfzeile 1: Hoehe',       kopf1.hoehe, 96);
gleich('Kopfzeile 1: Rand links',  kopf1.linksAbstand, 54);
gleich('Kopfzeile 1: Rand rechts', kopf1.rechtsAbstand, 54);
const wort = await messe('.wort');
gleich('Wortmarke: Text',      wort.text, 'GÄPP');
gleich('Wortmarke: Groesse',   wort.groesse, 34);
gleich('Wortmarke: Gewicht',   wort.gewicht, '300');
gleich('Wortmarke: Sperrung',  wort.sperrung, sperr(.3, 34));
gleich('Wortmarke: Versalien', wort.versal, 'uppercase');
gleich('Wortmarke: Farbe Tinte', wort.farbe, T.tinte);

const zeichen = await seite.evaluate(() => {
  const r = document.querySelector('.zeichen');
  const kinder = [...r.children].map(e => {
    const b = e.getBoundingClientRect(), i = e.firstElementChild;
    const ib = i ? i.getBoundingClientRect() : null;
    return { w: Math.round(b.width * 100) / 100, h: Math.round(b.height * 100) / 100,
      titel: e.getAttribute('title'), tag: i ? i.tagName.toLowerCase() : null,
      iw: ib ? Math.round(ib.width * 100) / 100 : null,
      ih: ib ? Math.round(ib.height * 100) / 100 : null,
      rand: i ? parseFloat(getComputedStyle(i).borderTopWidth) : null,
      radius: i ? getComputedStyle(i).borderTopLeftRadius : null };
  });
  return { gap: getComputedStyle(r).gap, kinder };
});
gleich('Werkzeugleiste: drei Zeichen', zeichen.kinder.length, 3);
gleich('Werkzeugleiste: Abstand',      zeichen.gap, '26px');
zeichen.kinder.forEach((z, i) => {
  gleich('Zeichen ' + (i + 1) + ': Klickflaeche breit', z.w, 26);
  gleich('Zeichen ' + (i + 1) + ': Klickflaeche hoch',  z.h, 26);
  pruef('Zeichen ' + (i + 1) + ': hat einen Titel', !!z.titel, z.titel);
});
/* Quadrat 11 x 11 mit 1 px Rand — Export. */
gleich('Quadrat: Breite', zeichen.kinder[0].iw, 11);
gleich('Quadrat: Hoehe',  zeichen.kinder[0].ih, 11);
gleich('Quadrat: Rand',   zeichen.kinder[0].rand, 1);
gleich('Quadrat: Titel nennt den Export',
  /Export/.test(zeichen.kinder[0].titel || '') ? 'Export' : zeichen.kinder[0].titel, 'Export');
/* Kreis 12.5 x 12.5 mit 1 px Rand — Handbuch. */
gleich('Kreis: Breite', zeichen.kinder[1].iw, 12.5);
gleich('Kreis: Hoehe',  zeichen.kinder[1].ih, 12.5);
gleich('Kreis: Rand',   zeichen.kinder[1].rand, 1);
gleich('Kreis: rund',   zeichen.kinder[1].radius, '50%');
gleich('Kreis: Titel',  zeichen.kinder[1].titel, 'Handbuch');
/* Dreieck 12 x 10.5 — Zustand des Datenkanals. */
gleich('Dreieck: Zeichnung', zeichen.kinder[2].tag, 'svg');
gleich('Dreieck: Breite',    zeichen.kinder[2].iw, 12);
gleich('Dreieck: Hoehe',     zeichen.kinder[2].ih, 10.5);
/* Die drei Groessen sind optisch ausgeglichen, nicht gleich — das ist der Punkt. */
pruef('die drei Zeichen sind verschieden gross',
  new Set([zeichen.kinder[0].iw, zeichen.kinder[1].iw, zeichen.kinder[2].iw]).size === 3);

const kopf2 = await messe('.kopf2');
gleich('Kopfzeile 2: Regel unten stark, Breite', kopf2.untenBreit, 1);
gleich('Kopfzeile 2: Regel unten stark, Farbe',  kopf2.untenFarbe, T.rStark);
gleich('Kopfzeile 2: Rand links', kopf2.linksAbstand, 54);
const jgAn = await messe('.jg.an');
gleich('Jahrgang aktiv: Groesse', jgAn.groesse, 30);
gleich('Jahrgang aktiv: Gewicht', jgAn.gewicht, '500');
gleich('Jahrgang aktiv: Farbe Tinte', jgAn.farbe, T.tinte);
const jgAus = await seite.evaluate(() => {
  const e = [...document.querySelectorAll('.jg')].find(x => !x.classList.contains('an'));
  if (!e) return null; const c = getComputedStyle(e);
  return { groesse: parseFloat(c.fontSize), gewicht: c.fontWeight };
});
gleich('Jahrgang ruhend: Groesse', jgAus.groesse, 22);
gleich('Jahrgang ruhend: Gewicht', jgAus.gewicht, '200');
gleich('Jahrgaenge: Abstand', await seite.evaluate(() => getComputedStyle(document.querySelector('.jgs')).gap), '24px');
gleich('Jahrgangs-Tasten: Groesse', (await messe('.jgtat')).groesse, 20);
gleich('Jahrgangs-Tasten: Gewicht', (await messe('.jgtat')).gewicht, '200');
const ansAn = await messe('.ans.an');
gleich('Ansicht aktiv: Groesse',   ansAn.groesse, 14);
gleich('Ansicht aktiv: Gewicht',   ansAn.gewicht, '500');
gleich('Ansicht aktiv: Sperrung',  ansAn.sperrung, sperr(.3, 14));
gleich('Ansicht aktiv: Versalien', ansAn.versal, 'uppercase');
gleich('Ansicht aktiv: Farbe Tinte', ansAn.farbe, T.tinte);
const ansAus = await seite.evaluate(() => {
  const e = [...document.querySelectorAll('.ans')].find(x => !x.classList.contains('an'));
  if (!e) return null; const c = getComputedStyle(e);
  return { groesse: parseFloat(c.fontSize), gewicht: c.fontWeight,
    sperrung: Math.round(parseFloat(c.letterSpacing) * 1000) / 1000, versal: c.textTransform };
});
gleich('Ansicht ruhend: Groesse',   ansAus.groesse, 12);
gleich('Ansicht ruhend: Gewicht',   ansAus.gewicht, '200');
gleich('Ansicht ruhend: Sperrung',  ansAus.sperrung, sperr(.3, 12));
gleich('Ansicht ruhend: Versalien', ansAus.versal, 'uppercase');
gleich('Ansichten: Abstand', await seite.evaluate(() => getComputedStyle(document.querySelector('.anss')).gap), '36px');
gleich('drei Ansichtswoerter', await zaehl('.ans'), 3);

const titel = await messe('.titel');
gleich('Blatttitel: Groesse', titel.groesse, 22);
gleich('Blatttitel: Gewicht', titel.gewicht, '300');
gleich('Blatttitel: Text', titel.text, 'Budget ' + STICHJAHR);
const legende = await messe('.legende');
gleich('Legende: Groesse', legende.groesse, 11.5);
gleich('Legende: Gewicht', legende.gewicht, '300');
gleich('Legende: drei Teile', await zaehl('.legende > span'), 3);
pruef('Legende nennt den Haken', /halbfett/.test(legende.text), legende.text.slice(0, 40));
pruef('Legende nennt den Stichmonat', /Stichmonat/.test(legende.text));
pruef('Legende nennt die beiden Tasten', /z klappt zu/.test(legende.text) && /n zeigt die Nullen/.test(legende.text));

const fuss = await messe('.fusszeile');
gleich('Fusszeile: Hoehe', fuss.hoehe, 44);
gleich('Fusszeile: Regel oben stark, Breite', fuss.obenBreit, 1);
gleich('Fusszeile: Regel oben stark, Farbe',  fuss.obenFarbe, T.rStark);
gleich('Fusszeile: Rand links', fuss.linksAbstand, 54);
const claim = await messe('.fusszeile .claim');
gleich('Anspruch: Text',      claim.text, 'Passend | Präzise | Praktisch');
gleich('Anspruch: Groesse',   claim.groesse, 10);
gleich('Anspruch: Gewicht',   claim.gewicht, '400');
gleich('Anspruch: Sperrung',  claim.sperrung, sperr(.34, 10));
gleich('Anspruch: Versalien', claim.versal, 'uppercase');
const ver = await messe('.fusszeile .ver');
gleich('Fassung: Groesse', ver.groesse, 11.5);
gleich('Fassung: Gewicht', ver.gewicht, '300');
pruef('Fassung nennt eine Versionsnummer', /V \d+\.\d+\.\d+/.test(ver.text), ver.text);
const rechts = await messe('.fusszeile .rechts');
gleich('Fusszeile rechts: Groesse', rechts.groesse, 11.5);
pruef('Fusszeile rechts nennt Jahrgaenge, Haken und «alles gerechnet»',
  /Jahrg/.test(rechts.text) && /Haken/.test(rechts.text) && /alles gerechnet/.test(rechts.text),
  rechts.text);
/* Der Anspruch steht nur noch in der Fusszeile — nicht mehr neben dem Titel. */
pruef('kein Untertitel neben dem Blatttitel', (await zaehl('.kopf3 > *')) === 2);

/* =========================================================================
   7. Kennzahlenband
   Vier gleich breite Felder ohne Rahmen und ohne Trennlinien, padding
   28px 30px 32px, border-bottom 1px stark unter dem ganzen Band.
   Label 400 10px .3em uppercase, Zahl 200 56px Tinte, Kurzzeile 400 10px .24em
   uppercase Muted C, die Langfassung im title. Der Anteilsbalken ist gestrichen.
   Die Labelfarbe nennt die Prosa nur «Muted»; die Referenzzeichnung setzt
   #a5a9aa — Muted B.
   ========================================================================= */
console.log('\n7 — Kennzahlenband');
const band = await seite.evaluate(() => {
  const b = document.querySelector('.band');
  if (!b) return null;
  const c = getComputedStyle(b);
  const hex = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v || '');
    return m ? '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('') : v; };
  return { spalten: c.gridTemplateColumns,
    untenBreit: parseFloat(c.borderBottomWidth), untenFarbe: hex(c.borderBottomColor),
    obenBreit: parseFloat(c.borderTopWidth),
    linksBreit: parseFloat(c.borderLeftWidth), rechtsBreit: parseFloat(c.borderRightWidth),
    felder: [...b.children].map(e => ({
      polster: getComputedStyle(e).padding,
      randOben: parseFloat(getComputedStyle(e).borderTopWidth),
      randLinks: parseFloat(getComputedStyle(e).borderLeftWidth),
      titel: e.getAttribute('title'),
      kurz: (e.querySelector('.m') || {}).textContent || '',
      label: (e.querySelector('.k') || {}).textContent || '',
      zahl: (e.querySelector('.v') || {}).textContent || '' })),
    balken: b.querySelectorAll('progress,.balken,.quote,.anteil').length };
});
pruef('Band ist in der Budgetansicht da', !!band);
gleich('Band: vier Felder', band.felder.length, 4);
pruef('Band: vier gleich breite Felder',
  new Set(band.spalten.split(' ')).size === 1, band.spalten);
gleich('Band: Regel unten stark, Breite', band.untenBreit, 1);
gleich('Band: Regel unten stark, Farbe',  band.untenFarbe, T.rStark);
pruef('Band: sonst kein Rahmen',
  band.obenBreit === 0 && band.linksBreit === 0 && band.rechtsBreit === 0);
pruef('Band: keine Trennlinien zwischen den Feldern',
  band.felder.every(f => f.randOben === 0 && f.randLinks === 0));
band.felder.forEach((f, i) => gleich('Feld ' + (i + 1) + ': Polster', f.polster, '28px 30px 32px'));
band.felder.forEach((f, i) => pruef('Feld ' + (i + 1) + ': Label da', f.label.trim().length > 0, f.label));
band.felder.forEach((f, i) => pruef('Feld ' + (i + 1) + ': Kurzzeile da', f.kurz.trim().length > 0, f.kurz));
band.felder.forEach((f, i) => pruef('Feld ' + (i + 1) + ': Zahl da', f.zahl.trim().length > 0, f.zahl));
/* Die Langfassung steht im title — bei den ersten drei Feldern. Das vierte
   traegt in der Uebergabe ausdruecklich keinen. */
pruef('Feld 1 bis 3 tragen die Langfassung im title',
  band.felder.slice(0, 3).every(f => f.titel && f.titel.length > 0),
  band.felder.map(f => f.titel).join(' | '));
pruef('Feld 4 traegt keinen title', !band.felder[3].titel, band.felder[3].titel);
gleich('Band: kein Anteilsbalken', band.balken, 0);
const bK = await messe('.band .k'), bV = await messe('.band .v'), bM = await messe('.band .m');
gleich('Bandlabel: Groesse',   bK.groesse, 10);
gleich('Bandlabel: Gewicht',   bK.gewicht, '400');
gleich('Bandlabel: Sperrung',  bK.sperrung, sperr(.3, 10));
gleich('Bandlabel: Versalien', bK.versal, 'uppercase');
gleich('Bandlabel: Farbe Muted B', bK.farbe, T.mB);
gleich('Bandzahl: Groesse', bV.groesse, 56);
gleich('Bandzahl: Gewicht', bV.gewicht, '200');
gleich('Bandzahl: Farbe Tinte', bV.farbe, T.tinte);
gleich('Bandkurzzeile: Groesse',   bM.groesse, 10);
gleich('Bandkurzzeile: Gewicht',   bM.gewicht, '400');
gleich('Bandkurzzeile: Sperrung',  bM.sperrung, sperr(.24, 10));
gleich('Bandkurzzeile: Versalien', bM.versal, 'uppercase');
gleich('Bandkurzzeile: Farbe Muted C', bM.farbe, T.mC);

/* =========================================================================
   8. Die Streichungen
   Keine gefuellte Zeile, kein Zebra, keine Akzentfarbe, kein Gruen, kein Rot,
   kein Orange, «Saldo kumuliert» weg, Ziffernmonate, Basis nur bei Schulden.
   ========================================================================= */
console.log('\n8 — die Streichungen');

/* Keine eigene Flaeche: eine Zelle ist entweder durchsichtig oder traegt genau
   den Grund des Fensters — den brauchen die klebenden Zellen als Deckung, sonst
   scrollen die Zeilen sichtbar hindurch. Alles andere waere eine Flaeche.
   Das Blatt hat mindestens den Tabellenkopf und die Saldozeile, also mindestens
   zwei mal fuenfzehn Zellen — daran misst sich, ob ueberhaupt gesucht wurde. */
const flaechen = await seite.evaluate(grund => {
  const zellen = [...document.querySelectorAll('table td, table th')];
  const fremd = zellen.filter(z => {
    const bg = getComputedStyle(z).backgroundColor;
    return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== grund;
  }).map(z => z.className + ' ' + getComputedStyle(z).backgroundColor);
  return { angesehen: zellen.length, fremd };
}, 'rgb(46, 49, 51)');
pruef('Flaechensuche hat die Zellen des Blatts angesehen (Gegenprobe)',
  flaechen.angesehen >= 30, flaechen.angesehen);
pruef('keine Zelle traegt eine eigene Flaeche', flaechen.fremd.length === 0, flaechen.fremd[0]);

/* Kein Zebra: alle Positionszeilen haben denselben Grund. Mit weniger als zwei
   Zeilen waere die Frage sinnlos, deshalb steht die Anzahl als eigene Zeile. */
const zebra = await seite.evaluate(() => {
  const zeilen = [...document.querySelectorAll('tr.pos')];
  const gruende = zeilen.map(t => getComputedStyle(t).backgroundColor + '|'
    + getComputedStyle(t.querySelector('td.c-mon')).backgroundColor);
  return { anzahl: zeilen.length, verschieden: [...new Set(gruende)],
    klassen: zeilen.filter(t => /zebra/.test(t.className)).length };
});
pruef('mindestens zwei Positionszeilen angesehen (Gegenprobe)', zebra.anzahl >= 2, zebra.anzahl);
gleich('alle Positionszeilen haben denselben Grund', zebra.verschieden.length, 1);
gleich('keine Zeile traegt eine Zebra-Auszeichnung', zebra.klassen, 0);

/* Farbstich. Zuerst die Gegenprobe: die Suche muss einen finden, wenn einer da
   ist — sonst sagt ihr Schweigen nichts. Der Claim-Ton #ee7f00, den die
   Uebergabe streicht, ist die Probe. */
const probe = await seite.evaluate(() => {
  const s = document.createElement('span');
  s.id = '__probe'; s.style.color = '#ee7f00'; s.textContent = 'Probe';
  document.body.appendChild(s);
  return true;
});
const mitProbe = await farbstich();
await seite.evaluate(() => { const e = document.getElementById('__probe'); if (e) e.remove(); });
pruef('die Farbstich-Suche findet einen eingesetzten Stich (Gegenprobe)',
  mitProbe.treffer.length > 0, mitProbe.treffer.length);
const budgetZellen = await zaehl('table td, table th');
const stichBudget = await farbstich();
pruef('Farbstich-Suche im Budget hat mehr Knoten angesehen als das Blatt Zellen hat (Gegenprobe)',
  stichBudget.knoten >= budgetZellen && budgetZellen > 0,
  stichBudget.knoten + ' Knoten, ' + budgetZellen + ' Zellen');
pruef('Farbstich-Suche im Budget hat Farbwerte gelesen (Gegenprobe)',
  stichBudget.werte > stichBudget.knoten, stichBudget.werte);
pruef('kein Farbstich im Budget', stichBudget.treffer.length === 0, stichBudget.treffer[0]);
pruef('die Probe ist wieder weg', (await zaehl('#__probe')) === 0);

/* «Saldo kumuliert» ist als Zeile aus dem Tabellenkopf gestrichen. Gefragt ist
   nach einer Zeile, also wird nach Zeilen gesucht und nicht nach einer
   Zeichenkette im Dokument: `textContent` des Fensters enthaelt auch den
   Quelltext im <script>, und `innerText` liefert den Namen versal zurueck,
   weil die Zeile versal gesetzt ist — beides fuehrt in die Irre.
   Die Anzahl der angesehenen Zeilennamen steht als eigene Zeile davor. */
const blattZeilen = await seite.evaluate(() => {
  const namen = [];
  document.querySelectorAll('#blatt tr').forEach(tr => {
    const z = tr.querySelector('td.c-name, th.c-name');
    if (!z) return;
    const feld = z.querySelector('input'), knopf = z.querySelector('.klapper');
    namen.push((feld ? feld.value
      : (knopf ? knopf.textContent.replace(/^[−+]\s*/, '') : z.textContent)).trim());
  });
  return { angesehen: namen.length,
    saldo: namen.filter(n => /^Saldo/i.test(n)),
    kumuliert: namen.filter(n => /kumuliert/i.test(n)) };
});
pruef('Zeilennamen des Blatts angesehen (Gegenprobe)', blattZeilen.angesehen > 10,
  blattZeilen.angesehen);
gleich('genau eine Saldozeile im Blatt', blattZeilen.saldo.length, 1);
gleich('sie heisst «Saldo budgetiert»', blattZeilen.saldo[0], 'Saldo budgetiert');
pruef('keine Zeile «Saldo kumuliert» mehr', blattZeilen.kumuliert.length === 0,
  blattZeilen.kumuliert[0]);

/* Monatsnamen sind zu Ziffern geworden. */
const monatstexte = await seite.evaluate(() =>
  [...document.querySelectorAll('thead th.c-mon')].map(e => e.textContent.trim()));
gleich('zwoelf Monatskoepfe', monatstexte.length, 12);
gleich('Monatskoepfe sind Ziffern 01 bis 12', monatstexte.join(' '),
  Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).join(' '));

/* Basis nur bei Schulden. Welcher Block die Schulden traegt, sagt der Vorrat —
   nicht die Oberflaeche. Geprueft wird: ausserhalb dieses Blocks zeigt keine
   Zeile eine Basis. Umgekehrt muss innerhalb mindestens eine stehen, sonst
   waere die Frage leer. */
const schuldName = (daten().daten[String(STICHJAHR)] || [])
  .filter(b => b.art === 'schulden').map(b => b.name)[0];
pruef('der Vorrat kennt einen Schuldenblock (Gegenprobe)', !!schuldName, schuldName);
const basisLage = await seite.evaluate(name => {
  let sektion = null; const drin = [], draussen = [], alle = [];
  document.querySelectorAll('tbody tr').forEach(tr => {
    if (tr.classList.contains('kat')) {
      const f = tr.querySelector('.namensfeld');
      const k = tr.querySelector('.klapper');
      sektion = f ? f.value.trim()
        : (k ? k.textContent.replace(/^[−+]\s*/, '').trim() : '');
    }
    const z = tr.querySelector('td.c-basis');
    if (!z) return;
    const feld = z.querySelector('input');
    const wert = (feld ? feld.value : z.textContent).trim();
    alle.push(1);
    if (!wert) return;
    (sektion === name ? drin : draussen).push(sektion + ' / ' + tr.className + ' / ' + wert);
  });
  return { angesehen: alle.length, drin: drin.length, draussen };
}, schuldName);
pruef('Basissuche hat Zeilen mit Basiszelle angesehen (Gegenprobe)',
  basisLage.angesehen > 0, basisLage.angesehen);
pruef('im Schuldenblock steht eine Basis (Gegenprobe)', basisLage.drin > 0, basisLage.drin);
pruef('ausserhalb der Schulden steht keine Basis',
  basisLage.draussen.length === 0, basisLage.draussen[0]);

/* =========================================================================
   9. Tabellenziffern
   «Alle Zahlen: font-variant-numeric: tabular-nums.» Ob die Schrift das
   tatsaechlich liefert, sagt kein Merkmal, sondern nur die Breite: drei
   Ziffernfolgen gleicher Laenge muessen gleich breit sein. Gemessen wird in
   einer echten Zelle des Blatts, mit einem Range — so wirkt genau die Schrift,
   die dort steht. Der Text wird danach zurueckgesetzt.
   Gegenprobe: dasselbe Mass an einem Spiegel mit abgeschalteten Tabellenziffern
   muss verschiedene Breiten liefern. Kaeme dort dasselbe heraus, waere das
   Messgeraet stumpf und die Hauptpruefung ohne Aussage.
   ========================================================================= */
console.log('\n9 — Tabellenziffern');
const ziffern = await seite.evaluate(() => {
  const z = document.querySelector('tr.sum td.c-mon') || document.querySelector('tr.saldo td.c-mon');
  if (!z) return null;
  const alt = z.textContent;
  const miss = t => { z.textContent = t; const r = document.createRange();
    r.selectNodeContents(z); return Math.round(r.getBoundingClientRect().width * 1000) / 1000; };
  const echt = { a: miss('111'), b: miss('000'), c: miss('888'),
    lang1: miss('1234567890'), lang2: miss('0000000000') };
  z.textContent = alt;
  const c = getComputedStyle(z);
  const sp = document.createElement('span');
  sp.style.font = c.fontWeight + ' ' + c.fontSize + '/1 ' + c.fontFamily;
  sp.style.letterSpacing = c.letterSpacing;
  sp.style.fontVariantNumeric = 'normal';
  sp.style.fontFeatureSettings = 'normal';
  sp.style.position = 'absolute'; sp.style.visibility = 'hidden'; sp.style.whiteSpace = 'pre';
  document.body.appendChild(sp);
  const m2 = t => { sp.textContent = t; return Math.round(sp.getBoundingClientRect().width * 1000) / 1000; };
  const ohne = { a: m2('111'), b: m2('000'), c: m2('888') };
  sp.remove();
  return { echt, ohne, verlangt: c.fontVariantNumeric, wiederhergestellt: z.textContent === alt };
});
pruef('die Zelle steht danach wieder wie vorher', ziffern.wiederhergestellt);
pruef('Gegenprobe: ohne Tabellenziffern messen sich drei Folgen verschieden breit',
  new Set([ziffern.ohne.a, ziffern.ohne.b, ziffern.ohne.c]).size > 1,
  ziffern.ohne.a + '/' + ziffern.ohne.b + '/' + ziffern.ohne.c);
pruef('111, 000 und 888 sind in der Zelle gleich breit',
  ziffern.echt.a === ziffern.echt.b && ziffern.echt.b === ziffern.echt.c,
  ziffern.echt.a + '/' + ziffern.echt.b + '/' + ziffern.echt.c);
pruef('zehn verschiedene Ziffern sind so breit wie zehn gleiche',
  ziffern.echt.lang1 === ziffern.echt.lang2,
  ziffern.echt.lang1 + '/' + ziffern.echt.lang2);
gleich('die Zelle verlangt Tabellenziffern', ziffern.verlangt, 'tabular-nums');

/* =========================================================================
   4. Rechnungsansicht
   «Steller wie Kategorie (uppercase, 54 px), Rechnungen wie Position;
    Stand-Spalte 500 11px .12em Tinte bei ‹Bezahlt›, 400 11px Muted sonst.»
   Der Stand steht in der Zelle nicht als blosser Text, sondern in einem
   Auswahlfeld — gemessen wird deshalb das Feld, das die Schrift traegt.
   Nicht geprueft: die Farbe des offenen Standes. Die Prosa sagt «Muted» ohne
   Buchstaben, die Referenzzeichnung setzt Tinte — zwei Antworten, keine Frage.
   ========================================================================= */
await geh('[data-geh-ansicht="rechnung"]', '^Rechnungen');
await zumJahr(STICHJAHR);
console.log('\n4 — Rechnungen');
gleich('Blatttitel', await text('.titel'), 'Rechnungen ' + STICHJAHR);
gleich('Band erscheint nur im Budget', await zaehl('.band'), 0);

const stellerName = await messe('tr.kat .namensfeld');
gleich('Steller, Name: Groesse',   stellerName.groesse, 15);
gleich('Steller, Name: Gewicht',   stellerName.gewicht, '500');
gleich('Steller, Name: Sperrung',  stellerName.sperrung, sperr(.26, 15));
gleich('Steller, Name: Versalien', stellerName.versal, 'uppercase');
gleich('Steller, Name: Farbe Tinte', stellerName.farbe, T.tinte);
gleich('Steller: Hoehe', (await messe('tr.kat')).hoehe, 54);
const stellerZ = await messe('tr.kat td.c-betrag');
gleich('Steller, Betrag: Groesse', stellerZ.groesse, 15);
gleich('Steller, Betrag: Gewicht', stellerZ.gewicht, '500');
gleich('Steller: Regel oben stark, Breite', stellerZ.obenBreit, 1);
gleich('Steller: Regel oben stark, Farbe',  stellerZ.obenFarbe, T.rStark);

const rechN = await messe('tr.pos td.c-name');
gleich('Rechnung, Zweck: Groesse',  rechN.groesse, 13.5);
gleich('Rechnung, Zweck: Gewicht',  rechN.gewicht, '300');
gleich('Rechnung, Zweck: Farbe Sekundaer', rechN.farbe, T.sek);
gleich('Rechnung: Einzug', rechN.linksAbstand, 40);
gleich('Rechnung: Hoehe', (await messe('tr.pos')).hoehe, 34);
const rechZ = await messe('tr.pos td.c-mon:not(.hak)');
gleich('Rechnung, Monatszahl: Groesse', rechZ.groesse, 13.5);
gleich('Rechnung, Monatszahl: Gewicht', rechZ.gewicht, '300');
gleich('Rechnung: Regel oben leise, Breite', rechZ.obenBreit, 1);
gleich('Rechnung: Regel oben leise, Farbe',  rechZ.obenFarbe, T.rLeise);

/* Der Stand. Beide Faelle muessen im Blatt vorkommen, sonst prueft der
   Vergleich nichts — die Anzahlen stehen deshalb als eigene Zeilen davor. */
const bezZahl  = await zaehl('tr.pos td.c-stand.bezahlt');
const offZahl  = await zaehl('tr.pos td.c-stand:not(.bezahlt)');
pruef('bezahlte Rechnungen im Blatt (Gegenprobe)', bezZahl > 0, bezZahl);
pruef('offene Rechnungen im Blatt (Gegenprobe)',   offZahl > 0, offZahl);
const standBez = await messe('tr.pos td.c-stand.bezahlt select.standwahl');
const standOff = await messe('tr.pos td.c-stand:not(.bezahlt) select.standwahl');
gleich('Stand «Bezahlt»: Groesse',  standBez.groesse, 11);
gleich('Stand «Bezahlt»: Gewicht',  standBez.gewicht, '500');
gleich('Stand «Bezahlt»: Sperrung', standBez.sperrung, sperr(.12, 11));
gleich('Stand «Bezahlt»: Farbe Tinte', standBez.farbe, T.tinte);
gleich('Stand sonst: Groesse',  standOff.groesse, 11);
gleich('Stand sonst: Gewicht',  standOff.gewicht, '400');
gleich('Stand sonst: Sperrung', standOff.sperrung, sperr(.12, 11));
pruef('bezahlt und offen sind am Gewicht zu unterscheiden',
  standBez.gewicht !== standOff.gewicht, standBez.gewicht + ' gegen ' + standOff.gewicht);
pruef('keine farbige Marke in der Standspalte',
  (await zaehl('tr.pos td.c-stand .marke, tr.pos td.c-stand .badge')) === 0);

/* 5b. Spaltenbreiten Rechnungen: Name 300, Datum 104, Betrag 100,
       12 Monate, Saldo 100, Stand 150. */
console.log('\n5b — Spaltenbreiten Rechnungen');
gleich('Rechnungen: Namensspalte', (await messe('thead th.c-name')).breite, 300);
gleich('Rechnungen: Datumsspalte', (await messe('thead th.c-datum')).breite, 104);
gleich('Rechnungen: Betragsspalte', (await messe('thead th.c-betrag')).breite, 100);
gleich('Rechnungen: Saldospalte',  (await messe('thead th.c-saldo')).breite, 100);
gleich('Rechnungen: Standspalte',  (await messe('thead th.c-stand')).breite, 150);
const rMon = await breiten('thead th.c-mon');
gleich('Rechnungen: zwoelf Monatsspalten', rMon.length, 12);
pruef('Rechnungen: alle Monatsspalten gleich breit', new Set(rMon).size === 1, rMon.join('/'));
const blattR = await messe('.blatt');
gleich('Rechnungen: Blattrand links',  blattR.linksAbstand, 54);
gleich('Rechnungen: Blattrand rechts', blattR.rechtsAbstand, 54);

const stichRech = await farbstich();
const rechZellen = await zaehl('table td, table th');
pruef('Farbstich-Suche in den Rechnungen hat mehr Knoten angesehen als das Blatt Zellen hat (Gegenprobe)',
  stichRech.knoten >= rechZellen && rechZellen > 0,
  stichRech.knoten + ' Knoten, ' + rechZellen + ' Zellen');
pruef('kein Farbstich in den Rechnungen', stichRech.treffer.length === 0, stichRech.treffer[0]);

/* =========================================================================
   3. Alle Jahre
   «Starke Zeilen 500 17px uppercase .24em + Zahlen 500 18px, Regel stark,
    Hoehe 64; Aufgliederung 300 13.5px, Regel leise, Hoehe 40; Zwischenzeilen
    400 12px uppercase .24em Muted + Zahlen 400 15px, Regel mittel, Hoehe 48.»
   Gemessen wird der Budgetzweig: dort sind die starken Namen kurz genug, dass
   sie nicht enger gesetzt werden muessen — im Rechnungszweig setzt der Bau
   lange Versalnamen absichtlich schmaler, das waere ein anderer Fall.

   Nicht geprueft, weil die Uebergabe zwei Antworten gibt: die Totalspalte der
   drei Raenge (die Prosa nennt fuer «Alle Jahre» nur eine Zahlengroesse je Rang,
   die Referenzzeichnung setzt das Total je eine Stufe hoeher — 19px bei den
   starken Zeilen, 400 bei der Aufgliederung, 500 bei den Zwischenzeilen) und
   der Einzug der Aufgliederung (Zeichnung 32 px, Prosa schweigt). Beides ist
   eine Entscheidung, die vor der Messung zu treffen ist, nicht in ihr.
   ========================================================================= */
await geh('[data-geh-ansicht="budget"]', '^Budget');
await seite.click('[data-geh-alle]');
await warteTitel('^Alle Jahre');
console.log('\n3 — Alle Jahre');
gleich('Blatttitel', await text('.titel'), 'Alle Jahre');
pruef('starke Zeilen vorhanden (Gegenprobe)', (await zaehl('tr.stark17')) > 0);
pruef('Aufgliederung vorhanden (Gegenprobe)', (await zaehl('tr.aufglied')) > 0);
pruef('Zwischenzeilen vorhanden (Gegenprobe)', (await zaehl('tr.zwischen')) > 0);
pruef('kein starker Name wird eng gesetzt', (await zaehl('tr.stark17.eng')) === 0);

const a17N = await messe('tr.stark17 td.c-name');
const a17Z = await messe('tr.stark17 td:nth-child(2)');
gleich('stark17, Name: Groesse',   a17N.groesse, 17);
gleich('stark17, Name: Gewicht',   a17N.gewicht, '500');
gleich('stark17, Name: Sperrung',  a17N.sperrung, sperr(.24, 17));
gleich('stark17, Name: Versalien', a17N.versal, 'uppercase');
gleich('stark17, Name: Farbe Tinte', a17N.farbe, T.tinte);
gleich('stark17, Zahl: Groesse',   a17Z.groesse, 18);
gleich('stark17, Zahl: Gewicht',   a17Z.gewicht, '500');
gleich('stark17: Regel oben stark, Breite', a17Z.obenBreit, 1);
gleich('stark17: Regel oben stark, Farbe',  a17Z.obenFarbe, T.rStark);
gleich('stark17: Hoehe', (await messe('tr.stark17')).hoehe, 64);

const aufN = await messe('tr.aufglied td.c-name');
const aufZ = await messe('tr.aufglied td:nth-child(2)');
gleich('aufglied, Name: Groesse', aufN.groesse, 13.5);
gleich('aufglied, Name: Gewicht', aufN.gewicht, '300');
gleich('aufglied, Name: Farbe Sekundaer', aufN.farbe, T.sek);
gleich('aufglied, Zahl: Groesse', aufZ.groesse, 13.5);
gleich('aufglied, Zahl: Gewicht', aufZ.gewicht, '300');
gleich('aufglied: Regel oben leise, Breite', aufZ.obenBreit, 1);
gleich('aufglied: Regel oben leise, Farbe',  aufZ.obenFarbe, T.rLeise);
gleich('aufglied: Hoehe', (await messe('tr.aufglied')).hoehe, 40);

const zwN = await messe('tr.zwischen td.c-name');
const zwZ = await messe('tr.zwischen td:nth-child(2)');
gleich('zwischen, Name: Groesse',   zwN.groesse, 12);
gleich('zwischen, Name: Gewicht',   zwN.gewicht, '400');
gleich('zwischen, Name: Sperrung',  zwN.sperrung, sperr(.24, 12));
gleich('zwischen, Name: Versalien', zwN.versal, 'uppercase');
gleich('zwischen, Name: Farbe Muted A', zwN.farbe, T.mA);
gleich('zwischen, Zahl: Groesse',   zwZ.groesse, 15);
gleich('zwischen, Zahl: Gewicht',   zwZ.gewicht, '400');
gleich('zwischen: Regel oben mittel, Breite', zwZ.obenBreit, 1);
gleich('zwischen: Regel oben mittel, Farbe',  zwZ.obenFarbe, T.rMittel);
gleich('zwischen: Hoehe', (await messe('tr.zwischen')).hoehe, 48);
/* Auch hier: drei Raenge sind nur dann drei, wenn sie sich unterscheiden. */
pruef('die drei Raenge sind der Hoehe nach geordnet',
  (await messe('tr.aufglied')).hoehe < (await messe('tr.zwischen')).hoehe
  && (await messe('tr.zwischen')).hoehe < (await messe('tr.stark17')).hoehe);

/* 5c. Spaltenbreiten Alle Jahre: Name 340, sechs Jahrgaenge, Total 160. */
console.log('\n5c — Spaltenbreiten Alle Jahre');
gleich('Alle Jahre: Namensspalte', (await messe('thead th.c-name')).breite, 340);
gleich('Alle Jahre: Totalspalte',  (await messe('thead th.c-total')).breite, 160);
const aJahr = await breiten('thead th.c-jahrspalte');
gleich('Alle Jahre: eine Spalte je Jahrgang', aJahr.length, JAHRE.length);
pruef('Alle Jahre: alle Jahresspalten gleich breit', new Set(aJahr).size === 1, aJahr.join('/'));
const blattA = await messe('.blatt');
gleich('Alle Jahre: Blattrand links',  blattA.linksAbstand, 54);
gleich('Alle Jahre: Blattrand rechts', blattA.rechtsAbstand, 54);
gleich('Alle Jahre: erste Kopfzelle ohne Beschriftung', await text('thead th.c-name'), '');

const stichAlle = await farbstich();
const alleZellen = await zaehl('table td, table th');
pruef('Farbstich-Suche in «Alle Jahre» hat mehr Knoten angesehen als das Blatt Zellen hat (Gegenprobe)',
  stichAlle.knoten >= alleZellen && alleZellen > 0,
  stichAlle.knoten + ' Knoten, ' + alleZellen + ' Zellen');
pruef('kein Farbstich in «Alle Jahre»', stichAlle.treffer.length === 0, stichAlle.treffer[0]);

/* ====================================================================
   6. Die eine senkrechte Linie — und keine zweite
   «Keine Zebra, keine Zeilenflaeche, keine senkrechten Linien ausser einer
   vor der Summenspalte» sagt die Formensprache. Zwischen den Monaten darf
   also keine stehen: sonst waere das Blatt ein Gitter, und der Rang laege
   wieder in Linien statt in der Schrift.
   Geprueft wird beides — dass die eine da ist UND dass es die einzige ist.
   Ohne die zweite Haelfte waere die Pruefung eine Erlaubnis statt einer Regel.
   ==================================================================== */
console.log('\n6 — die eine senkrechte Linie');
const senkrecht = async () => seite.evaluate(() => {
  const raus = [];
  document.querySelectorAll('#blatt th, #blatt td').forEach(z => {
    const c = getComputedStyle(z);
    const l = parseFloat(c.borderLeftWidth) || 0, r = parseFloat(c.borderRightWidth) || 0;
    if ((l > 0 && c.borderLeftStyle !== 'none') || (r > 0 && c.borderRightStyle !== 'none'))
      raus.push({ klasse: z.className || z.tagName, links: l, rechts: r,
                  farbe: (m => m ? '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('')
                    : c.borderLeftColor)(/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c.borderLeftColor || '')) });
  });
  return { alle: raus, angesehen: document.querySelectorAll('#blatt th, #blatt td').length };
});
/* «Alle Jahre» steht noch. Erst zurueck ins Budget. */
await geh('[data-geh-ansicht="budget"]', '^Budget');
await aufklappen();
const sB = await senkrecht();
pruef('Budget: die Suche hat ueberhaupt Zellen angesehen (Gegenprobe)',
  sB.angesehen > 50, sB.angesehen + ' Zellen');
const nurJahr = sB.alle.every(x => /c-jahr/.test(String(x.klasse)));
pruef('Budget: senkrechte Linien stehen ausschliesslich an der Jahresspalte',
  nurJahr, sB.alle.filter(x => !/c-jahr/.test(String(x.klasse))).map(x => x.klasse).join(' | '));
pruef('Budget: die Jahresspalte traegt sie wirklich (Gegenprobe)',
  sB.alle.length > 0, sB.alle.length + ' Zellen mit Linie');
const bJahr = sB.alle.filter(x => /c-jahr/.test(String(x.klasse)));
pruef('Budget: die Linie steht links, nicht rechts',
  bJahr.every(x => x.links === 1 && x.rechts === 0),
  bJahr.map(x => x.links + '/' + x.rechts).join(','));
gleich('Budget: die Linie ist die Regel mittel', bJahr[0] ? bJahr[0].farbe : null, T.rMittel);

await seite.click('[data-geh-alle]');
await warteTitel('^Alle Jahre');
const sA = await senkrecht();
pruef('Alle Jahre: die Suche hat Zellen angesehen (Gegenprobe)', sA.angesehen > 20, sA.angesehen);
pruef('Alle Jahre: senkrechte Linien stehen ausschliesslich an der Totalspalte',
  sA.alle.every(x => /c-total/.test(String(x.klasse))),
  sA.alle.filter(x => !/c-total/.test(String(x.klasse))).map(x => x.klasse).join(' | '));
pruef('Alle Jahre: die Totalspalte traegt sie wirklich (Gegenprobe)',
  sA.alle.length > 0, sA.alle.length);

await geh('[data-geh-ansicht="rechnung"]', '^Rechnungen');
await aufklappen();
const sR = await senkrecht();
pruef('Rechnungen: die Suche hat Zellen angesehen (Gegenprobe)', sR.angesehen > 50, sR.angesehen);
pruef('Rechnungen: keine einzige senkrechte Linie — es gibt dort keine Summenspalte',
  sR.alle.length === 0, sR.alle.map(x => x.klasse).join(' | '));

await b.close(); server.close();
ende(fehler);
