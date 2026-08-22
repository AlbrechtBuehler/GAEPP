/* GAEPP — Pruefstand: der Rechenkern.

   Prueft, an einem echten Browser mit echter Bedienung:
     1. Saldo-Uebertrag ueber die Jahre (Basis/Rest 2026/2027, Vererbung gesperrt)
     2. «Kein Vortrag heisst kein Eintrag» (2025 ist ein leeres Geruest)
     3. Manuelle Saldokorrekturen: eintragen, anzeigen, aendern, entfernen, Warnung
     4. Verteilen und Aufrunden bei Basis ausserhalb der Schulden
     5. Kennzahlenband: Restschuld heute, Getilgt bisher, Quote
     6. Der Rest bleibt bei null, nicht im Minus

   Erwartungswerte kommen aus vorrat.mjs (ERWARTET) oder werden von Hand aus den
   Rohwerten dort hergeleitet — nie aus einem Lauf dieser App abgeschrieben.

   Port 8101. */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { ERWARTET } from './vorrat.mjs';

const PORT = 8101;
const { pruef, gleich, ende } = bilanzbuch('rechnen');

/* ---------------------------------------------------------- Lesen und Klicken */

/* Betraege stehen mit Apostroph als Tausendertrennung und U+2212 als Minus. */
function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).trim();
  if (s === '' || s === '—') return 0;
  const n = parseInt(s.replace(/'/g, '').replace(/−/g, '-'), 10);
  return isNaN(n) ? null : n;
}

async function dbl(seite, sel) { await seite.locator(sel).first().dblclick(); await bisRuhe(seite); }
async function klick(seite, sel) { await seite.locator(sel).first().click(); await bisRuhe(seite); }
async function tippe(seite, sel, wert) {
  const el = seite.locator(sel).first();
  await el.fill(String(wert));
  await el.dispatchEvent('change');
  await bisRuhe(seite);
}
async function anzahl(seite, sel) { return seite.locator(sel).count(); }

/* Text einer Zelle — ob sie ein Eingabefeld traegt oder nur Text, ist ihr egal. */
async function zelleText(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const feld = el.matches('input,select') ? el : el.querySelector('input,select');
    return feld ? feld.value : el.textContent.trim();
  }, sel);
}
async function hatEingabefeld(seite, sel) {
  return seite.evaluate((s) => !!document.querySelector(s + ' input'), sel);
}
async function gehJahr(seite, jahr) { await klick(seite, `[data-geh-jahr="${jahr}"]`); }

/* Die Zeile einer Position, gefunden ueber ihren angezeigten Namen — nicht ueber
   eine mitgezaehlte Id. Mehr oder weniger als ein Treffer zaehlt als nicht gefunden:
   die Gegenprobe, dass ueberhaupt eine Zeile da ist, bevor an ihr geprueft wird. */
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
  const x = await findeId(seite, name);
  pruef('Zeile gefunden: «' + name + '» ' + jahr, x !== null, x);
  return x;
}

/* ------------------------------------------------------------ Korrekturdialog */
async function korrOeffnenBasis(seite, pid) { await dbl(seite, `td[data-kb="${pid}"]`); }
async function korrOeffnenRest(seite, pid)  { await dbl(seite, `td[data-kr="${pid}"]`); }
async function korrEintragen(seite, { pid, art, richtung, betrag, notiz }) {
  if (art === 'basis') await korrOeffnenBasis(seite, pid); else await korrOeffnenRest(seite, pid);
  if (richtung === 'minus') await klick(seite, '[data-korr-richt="minus"]');
  await tippe(seite, '[data-korr-betrag]', betrag);
  if (notiz) await tippe(seite, '[data-korr-notiz]', notiz);
  await klick(seite, '[data-korr-add]');
}
async function korrSchliessen(seite) { await klick(seite, '[data-zu="korr"]'); }
async function warnungOffen(seite) { return (await anzahl(seite, '[data-schleier="korrWarn"]')) === 1; }
async function mkorr(seite, pid) { return (await anzahl(seite, `tr[data-id="${pid}"] .mkorr`)) === 1; }

/* --------------------------------------------------------------------- Ablauf */
(async () => {
  await serve(PORT);
  const { seite, fehler } = await browser(PORT);
  await bisRuhe(seite);

  /* Nullen anzeigen — sonst ist eine leere Zelle nicht von «nicht gefunden» zu
     unterscheiden, und jede Null-Erwartung muesste auf Leerstring pruefen. */
  await klick(seite, '[data-nullen]');
  /* Alles aufklappen — einmalig, gilt ueber alle Jahre, weil S.auf global ist. */
  await klick(seite, '[data-alle-um]');

  /* ================================================================ */
  console.log('\n1. Kennzahlenband (Stichmonat aus vorrat.mjs, vor jeder Aenderung)');
  /* ================================================================ */
  /* Von Hand hergeleitet aus SCHULD_2026 in vorrat.mjs (Basis/Rate je Schuld) und
     dem Stichmonat 2026-08 (Januar..August = die ersten 8 Monatsraten):
       steuerplan  12000 − 8×400 = 8800     darlehen  9000 − 8×250 = 7000
       kredit       3600 − 8×300 = 1200     rate      1200 − 8×100 =  400
     Restschuld heute = 8800+7000+1200+400 = 17400
     Getilgt bisher    = 8×(400+250+300+100) = 8×1050 = 8400
     Anfangsstand      = 12000+9000+3600+1200 = 25800  (Summe Basis 2026 — 2025
       fuehrt dieselben Schulden nur dem Namen nach, mit Basis 0)
     Quote             = round(8400/25800*100) = round(32.56) = 33 % */
  const bandAnzahl = await anzahl(seite, '.band > span');
  pruef('das Kennzahlenband zeigt vier Kacheln', bandAnzahl === 4, bandAnzahl);
  const kachel = async (label) => seite.evaluate((lbl) => {
    const s = Array.from(document.querySelectorAll('.band > span'))
      .find(x => x.querySelector('.k') && x.querySelector('.k').textContent.trim() === lbl);
    return s ? { v: s.querySelector('.v').textContent.trim(), m: s.querySelector('.m').textContent.trim() } : null;
  }, label);

  const restheute = await kachel('Restschuld heute');
  pruef('Kachel «Restschuld heute» gefunden', restheute !== null, restheute);
  gleich('Restschuld heute', restheute && lies(restheute.v), 17400);

  const getilgt = await kachel('Getilgt bisher');
  pruef('Kachel «Getilgt bisher» gefunden', getilgt !== null, getilgt);
  gleich('Getilgt bisher', getilgt && lies(getilgt.v), 8400);
  if (getilgt) {
    const m = /^(\d+)\s*%\s*von\s*([\d']+)\s*seit\s*(\d+)$/.exec(getilgt.m);
    pruef('Kachel «Getilgt bisher» nennt Quote, Anfangsstand und Startjahr', m !== null, getilgt.m);
    if (m) {
      gleich('Anfangsstand (Basis 2026 zusammen)', lies(m[2]), 25800);
      gleich('Startjahr der Zaehlung', parseInt(m[3], 10), 2026);
      gleich('Quote', parseInt(m[1], 10), 33);
    }
  }

  /* ================================================================ */
  console.log('\n2. Saldo-Uebertrag ueber die Jahre + «Kein Vortrag heisst kein Eintrag»');
  /* ================================================================ */
  /* Monatsraten aus SCHULD_2026/SCHULD_2027 in vorrat.mjs. Basis 2026 selbst
     steht nicht in ERWARTET — hergeleitet als rest2026 + 12×Rate. */
  const RATE_2026 = { steuerplan: 400, darlehen: 250, kredit: 300, rate: 100 };
  const RATE_2027 = { steuerplan: 400, darlehen: 250, kredit: 0, rate: 0 };
  const SCHULDEN = [
    { name: 'Steuerplan Nordwind', key: 'steuerplan' },
    { name: 'Darlehen Blumberg', key: 'darlehen' },
    { name: 'Kredit Talgut', key: 'kredit' },
    { name: 'Ratenkauf Zwyssig', key: 'rate' }
  ];

  const pruefeSchuld = async (jahr, s, erw) => {
    const pid = await id(seite, jahr, s.name);
    if (!pid) return null;
    const basisTxt = await zelleText(seite, `td[data-kb="${pid}"]`);
    const restTxt = await zelleText(seite, `td[data-kr="${pid}"]`);
    const hatFeld = await hatEingabefeld(seite, `td[data-kb="${pid}"]`);
    gleich('«' + s.name + '» ' + jahr + ' — Basis', lies(basisTxt), erw.basis);
    gleich('«' + s.name + '» ' + jahr + ' — Rest', lies(restTxt), erw.rest);
    pruef('«' + s.name + '» ' + jahr + ' — Basis-Eingabefeld ' +
      (erw.hatFeld ? 'vorhanden (tippbar)' : 'gesperrt (geerbt)'), hatFeld === erw.hatFeld, hatFeld);
    return pid;
  };

  console.log('  2025 — leeres Geruest: Basis 0, tippbar (kein Vortrag, kein Eintrag)');
  for (const s of SCHULDEN) await pruefeSchuld(2025, s, { basis: 0, rest: 0, hatFeld: true });

  console.log('  2026 — eigene Basis, NICHT auf null gezogen vom leeren 2025');
  const ids2026 = {};
  for (const s of SCHULDEN) {
    const basis2026 = ERWARTET.rest2026[s.key] + 12 * RATE_2026[s.key];
    ids2026[s.key] = await pruefeSchuld(2026, s, { basis: basis2026, rest: ERWARTET.rest2026[s.key], hatFeld: true });
  }

  console.log('  2027 — Basis geerbt und gesperrt, Raten fortgeschrieben');
  const ids2027 = {};
  for (const s of SCHULDEN) {
    const rest2027 = ERWARTET.rest2027[s.key] !== undefined
      ? ERWARTET.rest2027[s.key]
      : Math.max(0, ERWARTET.basis2027[s.key] - 12 * RATE_2027[s.key]);
    ids2027[s.key] = await pruefeSchuld(2027, s,
      { basis: ERWARTET.basis2027[s.key], rest: rest2027, hatFeld: false });
  }

  /* ================================================================ */
  console.log('\n3. Der Rest bleibt bei null, nicht im Minus');
  /* ================================================================ */
  /* Darlehen 2026: Basis 9000, Rate 250/Monat. Januar auf 20000 gesetzt macht die
     Jahresrate (22750) weit groesser als die Basis — Rest darf nicht negativ werden. */
  await gehJahr(seite, 2026);
  const pidDarlehen26 = ids2026.darlehen;
  if (pidDarlehen26) {
    const jan0 = await zelleText(seite, `input.zelle[data-z="${pidDarlehen26}"][data-m="0"]`);
    gleich('Darlehen 2026 Januar, Ausgangswert', lies(jan0), 250);
    await tippe(seite, `input.zelle[data-z="${pidDarlehen26}"][data-m="0"]`, 20000);
    const restUeber = await zelleText(seite, `td[data-kr="${pidDarlehen26}"]`);
    const restUeberWert = lies(restUeber);
    pruef('Rest bleibt bei 0, nicht im Minus (Rate 22750 > Basis 9000)', restUeberWert === 0, restUeberWert);
    pruef('kein Minuszeichen in der Zelle', !String(restUeber).includes('−'), restUeber);
    /* zurueck auf den Ausgangswert — die folgenden Abschnitte rechnen mit 9000/6000 */
    await tippe(seite, `input.zelle[data-z="${pidDarlehen26}"][data-m="0"]`, 250);
    const restZurueck = await zelleText(seite, `td[data-kr="${pidDarlehen26}"]`);
    gleich('nach dem Zuruecksetzen wieder Rest 6000', lies(restZurueck), 6000);
  }

  /* ================================================================ */
  console.log('\n4. Verteilen und Aufrunden');
  /* ================================================================ */
  await gehJahr(seite, 2026);
  const pruefeVerteilenBasis = async (name, basisErw) => {
    const pid = await id(seite, 2026, name);
    if (!pid) return null;
    const basisVor = await zelleText(seite, `td[data-bs="${pid}"]`);
    gleich('«' + name + '» — Basis vor dem Verteilen', lies(basisVor), basisErw);
    return pid;
  };

  const pidSteuern = await pruefeVerteilenBasis('Steuern laufendes Jahr', 5000);
  if (pidSteuern) {
    await dbl(seite, `td[data-bs="${pidSteuern}"]`);
    pruef('Basisdialog offen (Steuern)', (await anzahl(seite, '[data-schleier="basis"]')) === 1);
    await klick(seite, '[data-basis-tat="verteilen"]');
    let alle420 = true;
    for (let m = 0; m < 12; m++) {
      const w = lies(await zelleText(seite, `input.zelle[data-z="${pidSteuern}"][data-m="${m}"]`));
      if (w !== 420) alle420 = false;
    }
    pruef('«Steuern laufendes Jahr» verteilt 420 je Monat (5000/12 auf 10 aufgerundet)', alle420);
    const summeSteuern = await zelleText(seite, `tr[data-id="${pidSteuern}"] td.jahr`);
    gleich('«Steuern laufendes Jahr» — Jahressumme nach Verteilen', lies(summeSteuern), 5040);
    const basisNach = await zelleText(seite, `td[data-bs="${pidSteuern}"]`);
    gleich('«Steuern laufendes Jahr» — Basis bleibt 5000 (nur die Monate aendern sich)', lies(basisNach), 5000);
  }

  const pidZahnarzt = await pruefeVerteilenBasis('Zahnarzt', 1200);
  if (pidZahnarzt) {
    await dbl(seite, `td[data-bs="${pidZahnarzt}"]`);
    await klick(seite, '[data-basis-tat="verteilen"]');
    let alle100 = true;
    for (let m = 0; m < 12; m++) {
      const w = lies(await zelleText(seite, `input.zelle[data-z="${pidZahnarzt}"][data-m="${m}"]`));
      if (w !== 100) alle100 = false;
    }
    pruef('«Zahnarzt» verteilt 100 je Monat (1200/12, glatt)', alle100);
    const summeZahnarzt = await zelleText(seite, `tr[data-id="${pidZahnarzt}"] td.jahr`);
    gleich('«Zahnarzt» — Jahressumme nach Verteilen', lies(summeZahnarzt), 1200);
  }

  const pidLohn = await id(seite, 2026, 'Nettolohn');
  if (pidLohn) {
    const basisVor = await zelleText(seite, `td[data-bs="${pidLohn}"]`);
    gleich('«Nettolohn» — Basis', lies(basisVor), 5200);
    await dbl(seite, `td[data-bs="${pidLohn}"]`);
    await klick(seite, '[data-basis-tat="uebertragen"]');
    let alle5200 = true;
    for (let m = 0; m < 12; m++) {
      const w = lies(await zelleText(seite, `input.zelle[data-z="${pidLohn}"][data-m="${m}"]`));
      if (w !== 5200) alle5200 = false;
    }
    pruef('«Nettolohn» uebertraegt 5200 in alle zwoelf Monate', alle5200);
    const eingabefelder = await anzahl(seite, `input.zelle[data-z="${pidLohn}"]`);
    pruef('die Monatszellen bleiben tippbar (zwoelf input.zelle)', eingabefelder === 12, eingabefelder);
  }

  /* ================================================================ */
  console.log('\n5. Manuelle Saldokorrekturen');
  /* ================================================================ */

  console.log('  5a. Erhoehen um 500 auf Rest 2026 (Steuerplan) — wirkt in 2027 weiter, ohne Warnung');
  const pidSteuerplan26 = ids2026.steuerplan;
  if (pidSteuerplan26) {
    await gehJahr(seite, 2026);
    await korrEintragen(seite, { pid: pidSteuerplan26, art: 'rest', richtung: 'plus', betrag: '500', notiz: 'Testkorrektur' });
    pruef('keine Warnung bei der ersten Korrektur (Steuerplan)', !(await warnungOffen(seite)));
    pruef('Punkt neben dem Glaeubiger erscheint (Steuerplan 2026)', await mkorr(seite, pidSteuerplan26));
    await korrSchliessen(seite);
    const restNach = await zelleText(seite, `td[data-kr="${pidSteuerplan26}"]`);
    gleich('Rest 2026 Steuerplan nach +500', lies(restNach), ERWARTET.rest2026.steuerplan + 500);

    const pidSteuerplan27 = ids2027.steuerplan;
    if (pidSteuerplan27) {
      await gehJahr(seite, 2027);
      const basis27 = await zelleText(seite, `td[data-kb="${pidSteuerplan27}"]`);
      gleich('Basis 2027 Steuerplan wandert um +500 weiter', lies(basis27), ERWARTET.basis2027.steuerplan + 500);
      pruef('kein Punkt in 2027 (die Korrektur steht 2026, nicht 2027)', !(await mkorr(seite, pidSteuerplan27)));
    }
  }

  console.log('  5b. Reduzieren um 200 auf Basis 2026 (Darlehen) — eintragen, anzeigen, aendern, entfernen');
  const pidDarlehen26b = ids2026.darlehen;
  if (pidDarlehen26b) {
    await gehJahr(seite, 2026);
    await korrEintragen(seite, { pid: pidDarlehen26b, art: 'basis', richtung: 'minus', betrag: '200', notiz: 'Testkorrektur' });
    pruef('keine Warnung bei der ersten Korrektur (Darlehen)', !(await warnungOffen(seite)));
    pruef('Punkt neben dem Glaeubiger erscheint (Darlehen 2026)', await mkorr(seite, pidDarlehen26b));
    await korrSchliessen(seite);

    const basisNach1 = await zelleText(seite, `td[data-kb="${pidDarlehen26b}"]`);
    gleich('Basis 2026 Darlehen nach −200', lies(basisNach1), 8800);
    const restNach1 = await zelleText(seite, `td[data-kr="${pidDarlehen26b}"]`);
    gleich('Rest 2026 Darlehen nach −200', lies(restNach1), 5800);

    const pidDarlehen27 = ids2027.darlehen;
    if (pidDarlehen27) {
      await gehJahr(seite, 2027);
      const basis27 = await zelleText(seite, `td[data-kb="${pidDarlehen27}"]`);
      gleich('Basis 2027 Darlehen wirkt weiter (−200)', lies(basis27), ERWARTET.basis2027.darlehen - 200);
      const hatFeld27 = await hatEingabefeld(seite, `td[data-kb="${pidDarlehen27}"]`);
      pruef('Basis 2027 Darlehen bleibt gesperrt (weiter geerbt)', !hatFeld27);
      await gehJahr(seite, 2026);
    }

    /* erneuter Doppelklick zeigt die Korrektur, sie ist aenderbar */
    await korrOeffnenBasis(seite, pidDarlehen26b);
    const zeilen1 = await anzahl(seite, '.korrliste .korrzeile');
    pruef('die Korrektur steht in der Liste (genau eine Zeile)', zeilen1 === 1, zeilen1);
    const feld = await zelleText(seite, '.korrliste [data-korr-b]');
    gleich('angezeigter Korrekturbetrag', feld, '−200');
    const eid = await seite.evaluate(() => {
      const f = document.querySelector('.korrliste [data-korr-b]');
      return f ? f.getAttribute('data-korr-b') : null;
    });
    pruef('Id der Korrekturzeile gefunden', eid !== null, eid);
    if (eid) {
      await tippe(seite, `[data-korr-b="${eid}"]`, '-350');
      pruef('das Aendern loest keine Warnung aus (noch keine eigene 2027-Korrektur)', !(await warnungOffen(seite)));
      await korrSchliessen(seite);
      const basisNach2 = await zelleText(seite, `td[data-kb="${pidDarlehen26b}"]`);
      gleich('Basis 2026 Darlehen nach Aendern auf −350', lies(basisNach2), 8650);
      const restNach2 = await zelleText(seite, `td[data-kr="${pidDarlehen26b}"]`);
      gleich('Rest 2026 Darlehen nach Aendern auf −350', lies(restNach2), 5650);

      /* entfernen — danach steht wieder die alte Zahl da, der Punkt ist weg */
      await korrOeffnenBasis(seite, pidDarlehen26b);
      await klick(seite, '.korrliste button.weg');
      const leer = await anzahl(seite, '.korrliste .leerzeile');
      pruef('die Korrekturliste ist wieder leer', leer === 1, leer);
      await korrSchliessen(seite);
      const basisZurueck = await zelleText(seite, `td[data-kb="${pidDarlehen26b}"]`);
      gleich('Basis 2026 Darlehen wieder 9000 nach dem Entfernen', lies(basisZurueck), 9000);
      const restZurueck2 = await zelleText(seite, `td[data-kr="${pidDarlehen26b}"]`);
      gleich('Rest 2026 Darlehen wieder 6000 nach dem Entfernen', lies(restZurueck2), 6000);
      pruef('der Punkt neben dem Glaeubiger ist weg (Darlehen 2026)', !(await mkorr(seite, pidDarlehen26b)));
    }
  }

  console.log('  5c. Warnung «Saldo Folgejahr bereits korrigiert» — «ab» aendert nichts, «beide» behaelt beides');
  const pidKredit27 = ids2027.kredit;
  const pidKredit26 = ids2026.kredit;
  if (pidKredit27 && pidKredit26) {
    await gehJahr(seite, 2027);
    await korrEintragen(seite, { pid: pidKredit27, art: 'basis', richtung: 'plus', betrag: '300', notiz: 'Vorablast' });
    pruef('keine Warnung: 2027 ist das juengste Jahr, kein Folgejahr', !(await warnungOffen(seite)));
    pruef('Punkt neben dem Glaeubiger erscheint (Kredit 2027)', await mkorr(seite, pidKredit27));
    await korrSchliessen(seite);
    const basis27Kredit = await zelleText(seite, `td[data-kb="${pidKredit27}"]`);
    gleich('Basis 2027 Kredit nach +300', lies(basis27Kredit), 300);

    /* «ab» */
    await gehJahr(seite, 2026);
    await korrOeffnenRest(seite, pidKredit26);
    await tippe(seite, '[data-korr-betrag]', '50');
    await klick(seite, '[data-korr-add]');
    pruef('Warnung erscheint: 2027 traegt bereits eine eigene Basis-Korrektur (Kredit)', await warnungOffen(seite));
    await klick(seite, '[data-korr-warn="ab"]');
    pruef('Warnung ist zu nach «ab»', !(await warnungOffen(seite)));
    const leerNachAb = await anzahl(seite, '.korrliste .leerzeile');
    pruef('«ab» hat nichts eingetragen — die Liste bleibt leer', leerNachAb === 1, leerNachAb);
    await korrSchliessen(seite);
    const rest26NachAb = await zelleText(seite, `td[data-kr="${pidKredit26}"]`);
    gleich('Rest 2026 Kredit bleibt bei 0 nach «ab»', lies(rest26NachAb), 0);
    await gehJahr(seite, 2027);
    const basis27NachAb = await zelleText(seite, `td[data-kb="${pidKredit27}"]`);
    gleich('Basis 2027 Kredit bleibt bei 300 nach «ab»', lies(basis27NachAb), 300);

    /* «beide» */
    await gehJahr(seite, 2026);
    await korrOeffnenRest(seite, pidKredit26);
    await tippe(seite, '[data-korr-betrag]', '50');
    await klick(seite, '[data-korr-add]');
    pruef('Warnung erscheint erneut (Kredit)', await warnungOffen(seite));
    await klick(seite, '[data-korr-warn="beide"]');
    pruef('Warnung ist zu nach «beide»', !(await warnungOffen(seite)));
    await korrSchliessen(seite);
    const rest26NachBeide = await zelleText(seite, `td[data-kr="${pidKredit26}"]`);
    gleich('Rest 2026 Kredit nach «beide» = 0+50', lies(rest26NachBeide), 50);
    pruef('Punkt bleibt auf Kredit 2026 (rest-Korrektur)', await mkorr(seite, pidKredit26));
    await gehJahr(seite, 2027);
    const basis27NachBeide = await zelleText(seite, `td[data-kb="${pidKredit27}"]`);
    gleich('Basis 2027 Kredit nach «beide»: eigene 300 + geerbte 50 = 350', lies(basis27NachBeide), 350);
    pruef('Punkt bleibt auf Kredit 2027 (beide Korrekturen stehen)', await mkorr(seite, pidKredit27));
  }

  console.log('  5d. Warnung — «ueber» entfernt die Korrektur im Folgejahr');
  const pidRate27 = ids2027.rate;
  const pidRate26 = ids2026.rate;
  if (pidRate27 && pidRate26) {
    await gehJahr(seite, 2027);
    await korrEintragen(seite, { pid: pidRate27, art: 'basis', richtung: 'plus', betrag: '150', notiz: 'Testkorrektur' });
    pruef('keine Warnung beim Eintragen in 2027 (Ratenkauf)', !(await warnungOffen(seite)));
    await korrSchliessen(seite);
    const basis27Rate = await zelleText(seite, `td[data-kb="${pidRate27}"]`);
    gleich('Basis 2027 Ratenkauf nach +150', lies(basis27Rate), 150);

    await gehJahr(seite, 2026);
    await korrOeffnenRest(seite, pidRate26);
    await tippe(seite, '[data-korr-betrag]', '80');
    await klick(seite, '[data-korr-add]');
    pruef('Warnung erscheint (Ratenkauf)', await warnungOffen(seite));
    await klick(seite, '[data-korr-warn="ueber"]');
    pruef('Warnung ist zu nach «ueber»', !(await warnungOffen(seite)));
    await korrSchliessen(seite);

    const rest26Rate = await zelleText(seite, `td[data-kr="${pidRate26}"]`);
    gleich('Rest 2026 Ratenkauf nach «ueber» = 0+80', lies(rest26Rate), 80);
    pruef('Punkt bleibt auf Ratenkauf 2026', await mkorr(seite, pidRate26));

    await gehJahr(seite, 2027);
    const basis27RateNach = await zelleText(seite, `td[data-kb="${pidRate27}"]`);
    gleich('Basis 2027 Ratenkauf nach «ueber»: eigene Korrektur weg, nur die 80 wandern ein', lies(basis27RateNach), 80);
    pruef('Punkt ist weg auf Ratenkauf 2027 (Folgejahr-Korrektur entfernt)', !(await mkorr(seite, pidRate27)));
    const hatFeldRate27 = await hatEingabefeld(seite, `td[data-kb="${pidRate27}"]`);
    pruef('Basis 2027 Ratenkauf bleibt gesperrt (weiter geerbt)', !hatFeldRate27);
  }

  await seite.close();
  ende(fehler);
})().catch(e => {
  console.log('  ROT    Unerwarteter Fehler im Pruefstand: ' + (e && e.stack || e));
  console.log('\nBILANZ rechnen 0 1');
  process.exit(1);
});
