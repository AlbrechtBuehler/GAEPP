/* GAEPP — Pruefstand: die vierzehn Befunde einer unabhaengigen Nachkontrolle,
   dazu zwei weitere Punkte zum Excel-Layout vom 22.08.2026. Alle sechzehn
   sind inzwischen behoben — dieser Lauf haelt die Behebung fest. Jeder
   Abschnitt wird rot, wenn der jeweilige Fehler zurueckkaeme.

   Gemessen wird durchgehend die Wirkung: der gerenderte Text, die berechnete
   Farbe, der Datenstand nach einer echten Bedienung — nicht der Quelltext.
   Wo eine Erwartung eine Zahl nennt, ist sie aus vorrat.mjs hergeleitet oder
   von Hand nachgerechnet (siehe Kommentare je Abschnitt), nirgends aus einem
   Lauf dieser App abgeschrieben.

   Port 8105. Fahren: node befunde.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';

const PORT = 8105;
const ARBEITSJAHR = 2026;
const { pruef, gleich, ende } = bilanzbuch('befunde');

/* ---------------------------------------------------------------- Helfer,
   dieselben Muster wie in rechnen.mjs/bedienung.mjs/eingabe.mjs — jede Datei
   im Pruefstand traegt ihre eigenen, es gibt bewusst keine gemeinsame Datei
   ausser hilfe.mjs/vorrat.mjs. */

/* Betraege stehen mit Apostroph als Tausendertrennung und U+2212 als Minus;
   eine leere Zelle oder ein Strich zaehlt als 0. */
function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).trim();
  if (s === '' || s === '—') return 0;
  const n = parseInt(s.replace(/'/g, '').replace(/−/g, '-'), 10);
  return isNaN(n) ? null : n;
}
/* Formatierung wie in index.html — fmt(n, immer). */
function fmt(n, immer) {
  const r = Math.round(n || 0);
  if (r === 0 && !immer) return '';
  return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

async function dbl(seite, sel) { await seite.locator(sel).first().dblclick(); await bisRuhe(seite); }
async function klick(seite, sel) { await seite.locator(sel).first().click(); await bisRuhe(seite); }
async function rklick(seite, sel) { await seite.locator(sel).first().click({ button: 'right' }); await bisRuhe(seite); }
async function tippe(seite, sel, wert) {
  const el = seite.locator(sel).first();
  await el.fill(String(wert));
  await el.dispatchEvent('change');
  await bisRuhe(seite);
}
/* Echtes Tippen mit echtem Enter — anders als tippe() (fill+change), fuer die
   Befunde, die die Bedienung selbst pruefen (5 und 9). Ein Enter auf einem
   alleinstehenden <input> (kein <form> drumherum) loest in Chromium tatsaechlich
   ein "change" aus, ohne das Feld zu verlassen — geprueft mit einer eigenen
   Probe, bevor dieser Lauf sich darauf verlaesst. */
async function tippeEnter(seite, sel, wert) {
  const el = seite.locator(sel).first();
  /* Ein einzelner Klick, dann alles markieren. Ein Dreifachklick waere ein
     Doppelklick — und der oeffnet in einer Monatszelle das Uebertragen-Fenster. */
  await el.click();
  await el.press('Control+a');
  await el.pressSequentially(String(wert));
  await el.press('Enter');
  await bisRuhe(seite);
}
async function anzahl(seite, sel) { return seite.locator(sel).count(); }
async function zelleText(seite, sel) {
  return seite.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const feld = el.matches('input,select') ? el : el.querySelector('input,select');
    return feld ? feld.value : el.textContent.trim();
  }, sel);
}
async function klasse(seite, sel) {
  return seite.evaluate((s) => { const el = document.querySelector(s); return el ? el.className : null; }, sel);
}
async function farbeVar(seite, name) {
  return seite.evaluate((v) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(' + v + ')';
    document.body.appendChild(probe);
    const wert = getComputedStyle(probe).color;
    probe.remove();
    return wert;
  }, name);
}
async function farbeVon(seite, sel, was) {
  return seite.evaluate(([s, w]) => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el)[w || 'color'] : null;
  }, [sel, was]);
}
async function aktivesFeld(seite) {
  return seite.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const d = {};
    if (el.dataset) Object.keys(el.dataset).forEach(k => { d[k] = el.dataset[k]; });
    return { data: d, tag: el.tagName, klasse: el.className };
  });
}
async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
async function gehJahr(seite, jahr) { await klick(seite, `[data-geh-jahr="${jahr}"]`); }
async function gehAnsicht(seite, was) { await klick(seite, `[data-geh-ansicht="${was}"]`); }
async function gehAlle(seite) { await klick(seite, '[data-geh-alle="1"]'); }
async function allesAuf(seite) { await klick(seite, '[data-alle-um]'); }

/* Zeile ueber ihren angezeigten Namen finden — nicht ueber eine mitgezaehlte
   Id. Mehr oder weniger als ein Treffer zaehlt als nicht gefunden. */
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
async function blockId(seite, jahr, name) {
  return seite.evaluate(([jahr, name]) => {
    const b = (S.daten[jahr] || []).find(x => x.name === name);
    return b ? b.id : null;
  }, [jahr, name]);
}
async function klappeById(seite, id) {
  await seite.locator('button.klapper[data-klapp="' + id + '"]').first().click();
  await bisRuhe(seite);
}

/* -------------------------------------------------------- Korrekturdialog */
async function korrOeffnenBasis(seite, pid) { await dbl(seite, `td[data-kb="${pid}"]`); }
async function korrOeffnenRest(seite, pid) { await dbl(seite, `td[data-kr="${pid}"]`); }
async function korrEintragen(seite, { pid, art, richtung, betrag, notiz }) {
  if (art === 'basis') await korrOeffnenBasis(seite, pid); else await korrOeffnenRest(seite, pid);
  if (richtung === 'minus') await klick(seite, '[data-korr-richt="minus"]');
  await tippe(seite, '[data-korr-betrag]', betrag);
  if (notiz) await tippe(seite, '[data-korr-notiz]', notiz);
  await klick(seite, '[data-korr-add]');
}
async function korrSchliessen(seite) { await klick(seite, '[data-zu="korr"]'); }

const kachel = async (seite, label) => seite.evaluate((lbl) => {
  const s = Array.from(document.querySelectorAll('.band > span'))
    .find(x => x.querySelector('.k') && x.querySelector('.k').textContent.trim() === lbl);
  return s ? { v: s.querySelector('.v').textContent.trim(), m: s.querySelector('.m').textContent.trim(),
    vStyle: s.querySelector('.v').getAttribute('style') || '' } : null;
}, label);

/* Ein CSV-Feld, so wie index.html es schreibt (Semikolon getrennt, Anfuehrung
   verdoppelt bei Bedarf) — hier rueckwaerts zerlegt. */
function csvFelder(zeile) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (inQ) { if (c === '"') { if (zeile[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ';') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/* WCAG-Kontrast — eine oeffentliche Formel, unabhaengig von index.html nachgebaut,
   angewendet auf die vom Browser TATSAECHLICH berechneten Farben (nicht auf von
   Hand aus dem Quelltext abgelesene Hexwerte). */
function parseRgb(s) { const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; }
function linKanal(c) { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
function luminanz([r, g, b]) { return 0.2126 * linKanal(r) + 0.7152 * linKanal(g) + 0.0722 * linKanal(b); }
function kontrast(rgb1, rgb2) {
  const l1 = luminanz(rgb1), l2 = luminanz(rgb2);
  const hell = Math.max(l1, l2), dunkel = Math.min(l1, l2);
  return (hell + 0.05) / (dunkel + 0.05);
}

/* ---------------------------------------------------------------- Fahrt */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

try {

/* ====================================================================
   Befund 1 + 2 — Rest/Basis unter Null werden NICHT gekappt, und das
   Korrekturfenster geht auf (Gerechnet + Korrektur = Ergebnis), auch dann
   ====================================================================
   Darlehen Blumberg 2026: Rest = 6000 (9000 − 12×250, aus vorrat.mjs). Eine
   Reduktion von 6500 ist groesser als der Rest -> neuer Rest = 6000−6500 = −500.
   Dieselbe Zahl muss als Basis 2027 erscheinen (Vererbung), und in der Ansicht
   "Alle" muss die Zeile "Restschuld am 31.12." die UNGEKAPPTE Summe zeigen:
   Steuerplan 7200 + Darlehen(−500) + Kredit 0 + Ratenkauf 0 = 6700 — nicht 7200,
   was sie waere, wenn die Reduktion irgendwo stillschweigend auf 0 gekappt wuerde. */
console.log('\n1+2. Rest/Basis unter Null werden nicht gekappt; Korrekturfenster geht auf');
await frisch(seite);
await allesAuf(seite);

const pidDarlehen26 = await id(seite, 2026, 'Darlehen Blumberg');
if (pidDarlehen26) {
  const restVor = await zelleText(seite, `td[data-kr="${pidDarlehen26}"]`);
  gleich('Darlehen 2026, Rest vor der Korrektur', lies(restVor), 6000);

  await korrOeffnenRest(seite, pidDarlehen26);
  await klick(seite, '[data-korr-richt="minus"]');
  await tippe(seite, '[data-korr-betrag]', '6500');
  await tippe(seite, '[data-korr-notiz]', 'Testkorrektur ueber den Rest hinaus');
  await klick(seite, '[data-korr-add]');

  /* Befund 2 — das Korrekturfenster: Gerechnet + Korrektur = Ergebnis. */
  const vorschau = await seite.evaluate(() => {
    const el = document.querySelector('.vorschau'); return el ? el.textContent : null;
  });
  pruef('Korrekturfenster zeigt eine Vorschau', vorschau !== null, vorschau);
  const m = vorschau && /Gerechnet\s+([−-]?[\d']+).*?Korrektur\s+([−+][\d']+).*?Ergebnis\s+([−-]?[\d']+)/s.exec(vorschau);
  pruef('Vorschau nennt Gerechnet, Korrektur und Ergebnis', m !== null, vorschau);
  if (m) {
    const gerechnet = lies(m[1]), korrektur = lies(m[2].replace('+', '')), ergebnis = lies(m[3]);
    gleich('Gerechnet (vor der Korrektur)', gerechnet, 6000);
    gleich('Korrektur', korrektur, -6500);
    gleich('Ergebnis', ergebnis, -500);
    gleich('Gerechnet + Korrektur = Ergebnis, auch unter Null', gerechnet + korrektur, ergebnis);
  }
  await korrSchliessen(seite);

  /* Befund 1 — Rest 2026 und Basis 2027 zeigen dieselbe negative Zahl, beide
     als Befund gekennzeichnet (Klasse unstimmig, Teil von Befund 3). */
  const restNach = await zelleText(seite, `td[data-kr="${pidDarlehen26}"]`);
  gleich('Darlehen 2026, Rest NICHT auf 0 gekappt', lies(restNach), -500);
  const restKlasse = await klasse(seite, `td[data-kr="${pidDarlehen26}"]`);
  pruef('Rest 2026 traegt die Klasse "unstimmig"', /\bunstimmig\b/.test(restKlasse), restKlasse);

  const pidDarlehen27 = await id(seite, 2027, 'Darlehen Blumberg');
  if (pidDarlehen27) {
    const basis27 = await zelleText(seite, `td[data-kb="${pidDarlehen27}"]`);
    gleich('Basis 2027 zeigt DIESELBE negative Zahl (Vererbung, keine zweite Rechnung)', lies(basis27), -500);
    const basisKlasse = await klasse(seite, `td[data-kb="${pidDarlehen27}"]`);
    pruef('Basis 2027 traegt ebenfalls die Klasse "unstimmig"', /\bunstimmig\b/.test(basisKlasse), basisKlasse);
    const hatFeld27 = await seite.evaluate((pid) =>
      !!document.querySelector(`td[data-kb="${pid}"] input`), pidDarlehen27);
    pruef('Basis 2027 bleibt gesperrt (geerbt, nicht neu getippt)', !hatFeld27);
  }

  /* Befund 1, Gegenprobe in der Ansicht "Alle": die ungekappte Summe steht da,
     nicht die (falsche) gekappte 7200. */
  await gehAlle(seite);
  const alleZeile = await seite.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('#blatt tbody tr'));
    const tr = trs.find(t => { const td = t.querySelector('td.name'); return td && td.textContent.trim() === 'Restschuld am 31.12.'; });
    if (!tr) return null;
    return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
  });
  pruef('Zeile "Restschuld am 31.12." in der Ansicht "Alle" gefunden', alleZeile !== null, alleZeile);
  if (alleZeile) {
    /* Spalten: Name, 2025, 2026, 2027, Total (Total = letztes Jahr, "letzte:1"). */
    gleich('Ansicht "Alle" — Spalte 2026 zeigt die ungekappte Summe (7200−500+0+0=6700), nicht 7200',
      lies(alleZeile[2]), 6700);
  }
}

/* ====================================================================
   Befund 3, zweiter Teil — Kennzahlenband: «der Plan geht nicht auf»
   ====================================================================
   Der Kennzahlenband-Wert "Restschuld heute" ist NUR dann kappungsfrei, wenn
   der Stichmonat Dezember ist (eine Korrektur ist dort "am 31.12. gebucht" —
   so der Text im Handbuch). Deshalb wird der Stichmonat hier direkt auf den
   31.12.2026 gesetzt (das kann die App selbst nicht ueber die Oberflaeche,
   der Stichmonat kommt nur aus der geladenen Datei — ein direkter Eingriff in
   S ist deshalb der einzige Weg, um diesen Ast wirklich zu erreichen, im
   selben Stil wie andere Laeufe hier S.auf/S.ansicht direkt setzen).
   Reduktion −14000 auf Darlehen-Rest: Gesamtrest Dezember = 7200+6000+0+0 =
   13200, davon −14000 -> 13200−14000 = −800. */
console.log('\n3. Kennzahlenband bei unstimmigem Saldo (Stichmonat 31.12.2026)');
await frisch(seite);
await allesAuf(seite);
const pidDarlehenB = await id(seite, 2026, 'Darlehen Blumberg');
if (pidDarlehenB) {
  await korrEintragen(seite, { pid: pidDarlehenB, art: 'rest', richtung: 'minus', betrag: '14000', notiz: 'Testkorrektur Band' });
  await korrSchliessen(seite);
  await seite.evaluate(() => { S.stichmonat = '2026-12'; zeichne(); });
  await bisRuhe(seite);

  const restheute = await kachel(seite, 'Restschuld heute');
  pruef('Kachel "Restschuld heute" gefunden', restheute !== null, restheute);
  if (restheute) {
    gleich('Restschuld heute = 13200−14000 = −800, ungekappt', lies(restheute.v), -800);
    pruef('Restschuld heute steht in der Warnfarbe', /--prot/.test(restheute.vStyle), restheute.vStyle);
    const rot = await farbeVar(seite, '--prot');
    const gemesseneFarbe = await farbeVon(seite, '.band > span:first-child .v');
    gleich('die tatsaechlich berechnete Farbe ist --prot', gemesseneFarbe, rot);
    gleich('Meta-Zeile nennt den Befund statt eines Datums',
      restheute.m, 'unter null — eine Korrektur nimmt mehr weg, als da ist');
  }
  const frei = await kachel(seite, 'Schuldenfrei');
  pruef('Kachel "Schuldenfrei" gefunden', frei !== null, frei);
  if (frei) {
    gleich('Schuldenfrei zeigt "der Plan geht nicht auf" statt eines Datums', frei.v, 'der Plan geht nicht auf');
    gleich('Meta-Zeile: erst die Korrekturen richtigstellen', frei.m, 'erst die Korrekturen richtigstellen');
  }
}

/* ====================================================================
   Befund 4 — Schuldenfrei rechnet mit Korrekturen am Anfangssaldo KUENFTIGER
   Jahre (nicht nur am laufenden Jahr).
   ====================================================================
   Von Hand hergeleitet aus vorrat.mjs. JEDE SCHULD LAEUFT FUER SICH — wer alle
   Raten in einen Topf wirft, rechnet die Rate einer getilgten Schuld auf die
   uebrigen an und wird zu frueh fertig. Stichmonat ist August 2026 (Index 7),
   also sind acht Monatsraten bezahlt:
     Steuerplan   12000 − 8×400 =  8800, Rate 400 -> 22 Monate -> Juni 2028
     Darlehen      9000 − 8×250 =  7000, Rate 250 -> 28 Monate -> Dezember 2028
     Kredit        3600 − 8×300 =  1200, Rate 300 -> vier Monate -> Dezember 2026
     Ratenkauf     1200 − 8×100 =   400, Rate 100 -> vier Monate -> Dezember 2026
   Die spaeteste dieser vier Zahlen zaehlt: Dezember 2028, in 28 Monaten.

   Mit +2000 auf die Basis 2027 des Darlehens (der massgebenden Schuld):
     Rest Darlehen Ende 2026 = 9000 − 12×250 = 6000, plus 2000 beim Eintritt in
     2027 = 8000, Rate 250 -> 32 Monate ab Januar 2027 -> August 2029
     (vier Monate bis Ende 2026 + 32 = 36 Monate gesamt).
   Gegenprobe: nach Entfernen der Korrektur steht wieder das urspruengliche
   Datum da (nicht neu hergeleitet, sondern derselbe Wert wie zu Beginn). */
console.log('\n4. Schuldenfrei rechnet mit Korrekturen am Anfangssaldo kuenftiger Jahre');
await frisch(seite);
await allesAuf(seite);

const freiVorher = await kachel(seite, 'Schuldenfrei');
pruef('Kachel "Schuldenfrei" gefunden (Ausgangsstand)', freiVorher !== null, freiVorher);
if (freiVorher) {
  gleich('Ausgangsdatum: Dezember 2028 (von Hand hergeleitet)', freiVorher.v, 'Dezember 2028');
  gleich('Ausgangsmeta: in 28 Monaten', freiVorher.m, 'in 28 Monaten, wenn die Raten so laufen');
}

const pidSteuerplan27 = await id(seite, 2027, 'Darlehen Blumberg');
if (pidSteuerplan27) {
  await korrEintragen(seite, { pid: pidSteuerplan27, art: 'basis', richtung: 'plus', betrag: '2000', notiz: 'Testkorrektur Schuldenfrei' });
  await korrSchliessen(seite);
  await gehJahr(seite, 2026);

  const freiNachher = await kachel(seite, 'Schuldenfrei');
  pruef('Kachel "Schuldenfrei" gefunden (nach Korrektur)', freiNachher !== null, freiNachher);
  if (freiNachher) {
    gleich('+2000 auf Basis 2027 verschiebt die Kachel auf August 2029 (hergeleitet)', freiNachher.v, 'August 2029');
    gleich('Meta: in 36 Monaten', freiNachher.m, 'in 36 Monaten, wenn die Raten so laufen');
  }

  /* Gegenprobe: Korrektur entfernen -> wieder das urspruengliche Datum.
     Die Zeile mit td[data-kb=...] steht nur in der Ansicht des Jahrgangs 2027. */
  await gehJahr(seite, 2027);
  await korrOeffnenBasis(seite, pidSteuerplan27);
  await klick(seite, '.korrliste button.weg');
  await korrSchliessen(seite);
  await gehJahr(seite, 2026);
  const freiZurueck = await kachel(seite, 'Schuldenfrei');
  pruef('Gegenprobe: ohne Korrektur steht wieder das urspruengliche Datum da',
    freiZurueck && freiVorher && freiZurueck.v === freiVorher.v && freiZurueck.m === freiVorher.m,
    freiZurueck);
}

/* ====================================================================
   Befund 5 — Kein Rappen bleibt im Bild stehen: 1234.7 + Enter -> 1'235,
   und der Sektionskopf darueber zeigt dieselbe Zahl mitgerechnet.
   ==================================================================== */
console.log('\n5. Kein Rappen bleibt im Bild stehen (1234.7 + Enter -> 1\'235)');
await frisch(seite);
const einkommenId = await blockId(seite, ARBEITSJAHR, 'Einkommen');
pruef('Block "Einkommen" gefunden', !!einkommenId, einkommenId);
if (einkommenId) {
  await klappeById(seite, einkommenId);
  const pidLohn = await findeId(seite, 'Nettolohn');
  pruef('Zeile "Nettolohn" gefunden', !!pidLohn, pidLohn);
  if (pidLohn) {
    const sel = `input.zelle[data-z="${pidLohn}"][data-m="0"]`;
    await tippeEnter(seite, sel, '1234.7');
    const wertNach = await zelleText(seite, sel);
    gleich('Zelle zeigt "1\'235" (Math.round(1234.7) = 1235, ganze Franken)', wertNach, fmt(1235, true));

    const modell = await seite.evaluate((pid) => {
      let treffer = null;
      Object.keys(S.daten).forEach(j => (S.daten[j] || []).forEach(b => (b.pos || []).forEach(p => {
        if (p.id === pid) treffer = p.reihe[0]; })));
      return treffer;
    }, pidLohn);
    gleich('der Datenstand traegt die ganze Zahl 1235, keine Rappen', modell, 1235);

    const kopfSel = `tr.kopf[data-k="${einkommenId}"] td:nth-child(3)`; /* Name, Basis, dann Jan */
    const kopfWert = await zelleText(seite, kopfSel);
    gleich('Sektionskopf "Einkommen" zeigt dieselbe Zahl mitgerechnet (Nebenerwerb bleibt 0)',
      lies(kopfWert), 1235);
  }
}

/* ====================================================================
   Befund 6 — "Alle Jahre" gliedert vollstaendig auf, auch eine Kategorie, die
   frueher nicht in einer festen Liste stand ("Sparziele" — im Vorrat als leere
   Kategorie vorhanden, hier ueber die Oberflaeche mit einer echten Zeile
   gefuellt). Kategorien+Gruppen+Rechnungen muessen "Ausgaben" GENAU treffen.
   ==================================================================== */
console.log('\n6. "Alle Jahre" gliedert vollstaendig auf, auch eine neue Kategorie (Sparziele)');
await frisch(seite);
const sparzieleId = await blockId(seite, ARBEITSJAHR, 'Sparziele');
pruef('Block "Sparziele" gefunden (leer im Vorrat)', !!sparzieleId, sparzieleId);
if (sparzieleId) {
  await seite.locator(`tr.kopf[data-k="${sparzieleId}"]`).hover();
  await klick(seite, `[data-neu-pos="${sparzieleId}"]`);
  const neuPid = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []).find(x => x.name === 'Sparziele');
    const p = (b.pos || [])[b.pos.length - 1];
    return p ? p.id : null;
  }, ARBEITSJAHR);
  pruef('eine neue Zeile in "Sparziele" wurde angelegt', !!neuPid, neuPid);
  if (neuPid) {
    await tippe(seite, `input.zelle[data-z="${neuPid}"][data-m="0"]`, '250');

    const namenListe = await seite.evaluate(() => {
      const js = S.jahre.slice().sort((a, b) => a - b);
      const kategorien = [], gruppen = [];
      js.forEach(j => (S.daten[j] || []).forEach(bl => {
        if (bl.art === 'schulden') (bl.gruppen || []).forEach(g => { if (gruppen.indexOf(g.name) < 0) gruppen.push(g.name); });
        else if (bl.vz !== 1 && kategorien.indexOf(bl.name) < 0) kategorien.push(bl.name);
      }));
      return { kategorien, gruppen };
    });
    pruef('"Sparziele" steht unter den Kategorien (nicht in einer festen Liste vergessen)',
      namenListe.kategorien.indexOf('Sparziele') >= 0, namenListe.kategorien);

    await gehAlle(seite);
    const bild = await seite.evaluate(() => {
      const zeilen = Array.from(document.querySelectorAll('#blatt table tbody tr'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
      return zeilen;
    });
    const zeileVon = (name) => bild.find(z => z[0] === name);
    const jahrIdx = 1 + 1; /* Name, 2025, 2026(hier), 2027, Total — 2026 ist die zweite Jahrspalte */

    const sparzieleZeile = zeileVon('Sparziele');
    pruef('Zeile "Sparziele" steht in der Ansicht "Alle"', !!sparzieleZeile, sparzieleZeile);
    if (sparzieleZeile) gleich('Sparziele 2026 zeigt die eingetragenen 250', lies(sparzieleZeile[jahrIdx]), 250);

    let summeKategorienUndGruppen = 0, fehltEineZeile = false;
    namenListe.kategorien.concat(namenListe.gruppen).forEach(name => {
      const z = zeileVon(name);
      if (!z) { fehltEineZeile = true; return; }
      summeKategorienUndGruppen += lies(z[jahrIdx]);
    });
    pruef('jede Kategorie und jede Gruppe steht als eigene Zeile da', !fehltEineZeile);
    const rechnungenZeile = zeileVon('Rechnungen');
    const ausgabenZeile = zeileVon('Ausgaben');
    pruef('Zeilen "Rechnungen" und "Ausgaben" gefunden', !!rechnungenZeile && !!ausgabenZeile,
      { rechnungenZeile, ausgabenZeile });
    if (rechnungenZeile && ausgabenZeile) {
      const summeAusgabezeilen = summeKategorienUndGruppen + lies(rechnungenZeile[jahrIdx]);
      gleich('Summe aus Kategorien + Gruppen + Rechnungen trifft "Ausgaben" genau (inkl. Sparziele)',
        summeAusgabezeilen, lies(ausgabenZeile[jahrIdx]));
    }
  }
}

/* ====================================================================
   Befund 7 — "Rechnungen" heisst nicht zweimal Verschiedenes: "auf Monate
   verteilt" (Ansicht Alle/Rechnungen) muss GENAU der Zeile "Rechnungen" in
   der Ansicht Alle/Budget entsprechen — auch wenn eine Rechnung nicht
   vollstaendig verteilt ist (Rechnungsbetrag != verteilter Betrag).
   ==================================================================== */
console.log('\n7. "Rechnungen" heisst nicht zweimal Verschiedenes (unvollstaendig verteilte Rechnung)');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
await seite.locator('tr.kopf[data-k="r-nordmann"]').hover();
await klick(seite, '[data-neu-rech="r-nordmann"]');
const neueRechId = await seite.evaluate((jahr) => {
  const g = (S.rechnungen[jahr] || []).find(x => x.id === 'r-nordmann');
  const r = g && (g.rechnungen || []).find(x => x.zweck === 'Neue Rechnung');
  return r ? r.id : null;
}, ARBEITSJAHR);
pruef('frische, unvollstaendig verteilte Rechnung angelegt', !!neueRechId, neueRechId);
if (neueRechId) {
  await tippe(seite, `input.zelle[data-r="${neueRechId}"][data-f="betrag"]`, '500');
  await tippe(seite, `input.zelle[data-rm="${neueRechId}"][data-m="0"]`, '300'); /* 500 Betrag, nur 300 verteilt */

  const erw = await seite.evaluate((jahr) => {
    let betrag = 0, verteilt = 0;
    (S.rechnungen[jahr] || []).forEach(g => (g.rechnungen || []).forEach(r => {
      betrag += r.betrag || 0;
      verteilt += (r.reihe || []).reduce((s, x) => s + (x || 0), 0);
    }));
    return { betrag, verteilt };
  }, ARBEITSJAHR);
  pruef('Rechnungsbetrag und verteilter Betrag unterscheiden sich (Voraussetzung des Befunds)',
    erw.betrag !== erw.verteilt, erw);

  await gehAlle(seite);
  await gehAnsicht(seite, 'rechnung');
  const bildRech = await seite.evaluate(() => Array.from(document.querySelectorAll('#blatt table tbody tr'))
    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
  const zusammen = bildRech.find(z => z[0] === 'Rechnungsbeträge zusammen');
  const verteiltZeile = bildRech.find(z => z[0] === 'auf Monate verteilt');
  pruef('Zeilen "Rechnungsbeträge zusammen" und "auf Monate verteilt" gefunden',
    !!zusammen && !!verteiltZeile, { zusammen, verteiltZeile });

  await gehAnsicht(seite, 'budget');
  const bildBudget = await seite.evaluate(() => Array.from(document.querySelectorAll('#blatt table tbody tr'))
    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
  const rechnungenBudget = bildBudget.find(z => z[0] === 'Rechnungen');
  pruef('Zeile "Rechnungen" in Ansicht Alle/Budget gefunden', !!rechnungenBudget, rechnungenBudget);

  const jahrIdx = 2; /* Name, 2025, 2026(hier), 2027, Total */
  if (zusammen) gleich('"Rechnungsbeträge zusammen" 2026 = Summe aller Rechnungsbetraege', lies(zusammen[jahrIdx]), erw.betrag);
  if (verteiltZeile) gleich('"auf Monate verteilt" 2026 = Summe der verteilten Betraege', lies(verteiltZeile[jahrIdx]), erw.verteilt);
  if (verteiltZeile && zusammen)
    pruef('"Rechnungsbeträge zusammen" != "auf Monate verteilt" (die Rechnung ist ja nicht vollstaendig verteilt)',
      lies(zusammen[jahrIdx]) !== lies(verteiltZeile[jahrIdx]));
  if (verteiltZeile && rechnungenBudget)
    gleich('"auf Monate verteilt" (Alle/Rechnungen) entspricht GENAU "Rechnungen" (Alle/Budget) — dieselbe Zahl',
      lies(verteiltZeile[jahrIdx]), lies(rechnungenBudget[jahrIdx]));
}

/* ====================================================================
   Befund 8 — Rechtsklick nimmt zurueck, auch wenn Stand = "Bezahlt" ist
   (dann steht kein einziger Haken): der angeklickte Monat verliert sein
   Gruen, die anderen behalten es, der Stand faellt auf "Offen".
   ==================================================================== */
console.log('\n8. Rechtsklick nimmt zurueck, auch wenn Stand "Bezahlt" ist (ohne Haken)');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
await klappeById(seite, 'r-oechsli');
/* r-oe-2 ("Behandlung"): 900, verteilt auf Mai/Jun/Jul (m=4,5,6). */
await seite.locator('select.stand[data-r="r-oe-2"]').selectOption({ label: 'Bezahlt' });
await bisRuhe(seite);

const hakenVorher = await seite.evaluate(() =>
  Object.keys(S.haken).filter(k => k.indexOf('r-oe-2:') === 0).length);
gleich('Stand ueber die Auswahl auf "Bezahlt" gesetzt — kein einziger Haken', hakenVorher, 0);

const mSel = (m) => `input.zelle[data-rm="r-oe-2"][data-m="${m}"]`;
const abgehakt = async (m) => /\babgehakt\b/.test(
  await seite.evaluate((s) => document.querySelector(s).closest('td').className, mSel(m)));
pruef('Mai steht (ueber den Stand-Fallback) gruen/abgehakt da', await abgehakt(4));
pruef('Juni steht (ueber den Stand-Fallback) gruen/abgehakt da', await abgehakt(5));
pruef('Juli steht (ueber den Stand-Fallback) gruen/abgehakt da', await abgehakt(6));

await rklick(seite, mSel(4)); /* Rechtsklick auf Mai */

pruef('Mai verliert sein Gruen nach dem Rechtsklick', !(await abgehakt(4)));
pruef('Juni behaelt sein Gruen', await abgehakt(5));
pruef('Juli behaelt sein Gruen', await abgehakt(6));
const standNach = await zelleText(seite, 'select.stand[data-r="r-oe-2"]');
gleich('der Stand faellt auf "Offen"', standNach, 'Offen');
const hakenNachher = await seite.evaluate(() => ({
  mai: !!S.haken['r-oe-2:4'], jun: !!S.haken['r-oe-2:5'], jul: !!S.haken['r-oe-2:6']
}));
pruef('im Datenstand: Mai kein Haken, Juni und Juli haben jetzt einen echten Haken',
  !hakenNachher.mai && hakenNachher.jun && hakenNachher.jul, hakenNachher);

/* ====================================================================
   Befund 9 — Der Fokus ueberlebt einen Klassenwechsel der Zelle. Beim Wiederfinden
   nach dem Neuzeichnen wird nur der ERSTE Klassenteil verglichen; sonst faellt der
   Fokus auf body, sobald aus "zelle" ein "zelle gruen" wird oder umgekehrt.
   Gefahren wird der Wechsel in beide Richtungen und in beiden Tafeln.

   Eine leere Zelle laesst sich nicht abhaken (das waere eine unsichtbare Marke) —
   deshalb beginnt der Versuch mit einer Zelle, die einen Wert traegt. */
console.log('\n9. Fokus ueberlebt einen Klassenwechsel der Zelle (in beiden Tafeln)');

console.log('  9a. Budget-Tafel');
await frisch(seite);
const einkommenId9 = await blockId(seite, ARBEITSJAHR, 'Einkommen');
if (einkommenId9) {
  await klappeById(seite, einkommenId9);
  const pidLohn9 = await findeId(seite, 'Nettolohn'); /* traegt 5200 in jedem Monat */
  pruef('Zeile "Nettolohn" gefunden (traegt einen Wert)', !!pidLohn9, pidLohn9);
  if (pidLohn9) {
    const selB = `input.zelle[data-z="${pidLohn9}"][data-m="0"]`;
    /* Gegenprobe zuerst: eine leere Zelle bekommt keinen Haken. */
    const pidNeben = await findeId(seite, 'Nebenerwerb');
    if (pidNeben) {
      const selLeer = `input.zelle[data-z="${pidNeben}"][data-m="0"]`;
      await rklick(seite, selLeer);
      const leerHaken = await seite.evaluate((pid) => !!S.haken[pid + ':0'], pidNeben);
      pruef('Rechtsklick auf eine leere Zelle setzt keine unsichtbare Marke', !leerHaken, leerHaken);
    }

    await rklick(seite, selB);
    const vorKlasse = await klasse(seite, selB);
    gleich('abgehakte Zelle mit Wert traegt "zelle gruen"', vorKlasse, 'zelle gruen');

    /* gruen -> nicht gruen: der Wert wird 0, der Haken bleibt, die Klasse wechselt. */
    await tippeEnter(seite, selB, '0');
    const akt = await aktivesFeld(seite);
    pruef('Fokus liegt nach dem Klassenwechsel (zelle gruen -> zelle) auf derselben Zelle',
      akt && akt.data.z === pidLohn9 && akt.data.m === '0', akt);
    pruef('Fokus liegt NICHT auf body', akt && akt.tag !== 'BODY', akt);
    gleich('die Klasse ist jetzt tatsaechlich "zelle"', await klasse(seite, selB), 'zelle');

    /* Mit dem Betrag faellt auch die Marke — eine Marke ohne Betrag waere
       unsichtbar und wuerde spaeter wieder wirken. */
    const hakenWeg = await seite.evaluate((pid) => !!S.haken[pid + ':0'], pidLohn9);
    pruef('mit dem Betrag faellt auch die Marke', !hakenWeg, hakenWeg);

    /* und zurueck: ein neuer Betrag steht wieder ohne Marke da. */
    await tippeEnter(seite, selB, '300');
    const akt2 = await aktivesFeld(seite);
    pruef('Fokus liegt auch beim naechsten Neuzeichnen auf derselben Zelle',
      akt2 && akt2.data.z === pidLohn9 && akt2.data.m === '0', akt2);
    gleich('die Klasse ist "zelle" — die Marke kommt nicht von selbst zurueck',
      await klasse(seite, selB), 'zelle');
  }
}

console.log('  9b. Rechnungen-Tafel');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
await klappeById(seite, 'r-oechsli');
/* r-oe-1 ("Kontrolle"): Maerz (m=2) traegt 240, Januar (m=0) ist leer. */
const selRleer = 'input.zelle[data-rm="r-oe-1"][data-m="0"]';
await rklick(seite, selRleer);
const leerHakenR = await seite.evaluate(() => !!S.haken['r-oe-1:0']);
pruef('Rechnungen: Rechtsklick auf eine leere Zelle setzt keine unsichtbare Marke', !leerHakenR, leerHakenR);

const selR = 'input.zelle[data-rm="r-oe-1"][data-m="2"]';
await rklick(seite, selR);
gleich('Rechnungen: abgehakte Zelle mit Wert traegt "zelle gruen"',
  await klasse(seite, selR), 'zelle gruen');

await tippeEnter(seite, selR, '0');
const aktR = await aktivesFeld(seite);
pruef('Rechnungen-Tafel: Fokus liegt nach dem Klassenwechsel auf derselben Zelle',
  aktR && aktR.data.rm === 'r-oe-1' && aktR.data.m === '2', aktR);
pruef('Rechnungen-Tafel: Fokus liegt NICHT auf body', aktR && aktR.tag !== 'BODY', aktR);
gleich('Rechnungen-Tafel: die Klasse ist jetzt "zelle"', await klasse(seite, selR), 'zelle');

/* ====================================================================
   Befund 10 — Der Zaehler sagt, was er zaehlt: "Verbindlichkeiten" traegt
   den Titel "Gruppen in dieser Sektion", eine gewoehnliche Kategorie
   "Zeilen in dieser Sektion" — und die Zahl stimmt jeweils.
   ==================================================================== */
console.log('\n10. Der Zaehler sagt, was er zaehlt (Titel-Attribut)');
await frisch(seite); /* zugeklappter Ausgangsstand */

const verbId = await blockId(seite, ARBEITSJAHR, 'Verbindlichkeiten');
const fixId10 = await blockId(seite, ARBEITSJAHR, 'Fixkosten');
pruef('Bloecke "Verbindlichkeiten" und "Fixkosten" gefunden', !!verbId && !!fixId10, { verbId, fixId10 });
if (verbId && fixId10) {
  const gruppenZahl = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []).find(x => x.name === 'Verbindlichkeiten');
    return (b.gruppen || []).length;
  }, ARBEITSJAHR);
  const fixZahl = await seite.evaluate((jahr) => {
    const b = (S.daten[jahr] || []).find(x => x.name === 'Fixkosten');
    return (b.pos || []).length;
  }, ARBEITSJAHR);

  const verbSpan = await seite.evaluate((id) => {
    const tr = document.querySelector('tr.kopf[data-k="' + id + '"]');
    const sp = tr ? tr.querySelector('.anzahl') : null;
    return sp ? { titel: sp.getAttribute('title'), text: sp.textContent.trim() } : null;
  }, verbId);
  pruef('Zaehler bei "Verbindlichkeiten" gefunden', verbSpan !== null, verbSpan);
  if (verbSpan) {
    gleich('Titel bei "Verbindlichkeiten"', verbSpan.titel, 'Gruppen in dieser Sektion');
    gleich('Zahl bei "Verbindlichkeiten" = Anzahl Gruppen', verbSpan.text, String(gruppenZahl));
  }

  const fixSpan = await seite.evaluate((id) => {
    const tr = document.querySelector('tr.kopf[data-k="' + id + '"]');
    const sp = tr ? tr.querySelector('.anzahl') : null;
    return sp ? { titel: sp.getAttribute('title'), text: sp.textContent.trim() } : null;
  }, fixId10);
  pruef('Zaehler bei "Fixkosten" gefunden', fixSpan !== null, fixSpan);
  if (fixSpan) {
    gleich('Titel bei "Fixkosten" (gewoehnliche Kategorie)', fixSpan.titel, 'Zeilen in dieser Sektion');
    gleich('Zahl bei "Fixkosten" = Anzahl Zeilen', fixSpan.text, String(fixZahl));
  }
}

/* ====================================================================
   Befund 11 — Das CSV traegt die Monatshaken der Rechnungen: Kopfzeile mit
   Spalte "Erledigt", eine Rechnung mit zwei abgehakten Monaten fuehrt sie
   auf, die Zeile "Total" traegt den Saldo. gib() wird abgefangen.
   ==================================================================== */
console.log('\n11. Das CSV traegt die Monatshaken der Rechnungen (gib() abgefangen)');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
await klappeById(seite, 'r-oechsli');
await rklick(seite, 'input.zelle[data-rm="r-oe-2"][data-m="4"]'); /* Mai */
await rklick(seite, 'input.zelle[data-rm="r-oe-2"][data-m="5"]'); /* Juni */

/* Eine unvollstaendig verteilte Rechnung, damit der Saldo in der Total-Zeile
   nicht trivial 0 ist. */
await seite.locator('tr.kopf[data-k="r-nordmann"]').hover();
await klick(seite, '[data-neu-rech="r-nordmann"]');
const neuRechId11 = await seite.evaluate((jahr) => {
  const g = (S.rechnungen[jahr] || []).find(x => x.id === 'r-nordmann');
  const r = g && (g.rechnungen || []).find(x => x.zweck === 'Neue Rechnung');
  return r ? r.id : null;
}, ARBEITSJAHR);
if (neuRechId11) {
  await tippe(seite, `input.zelle[data-r="${neuRechId11}"][data-f="betrag"]`, '500');
  await tippe(seite, `input.zelle[data-rm="${neuRechId11}"][data-m="0"]`, '300');
}
const erwSaldo = await seite.evaluate((jahr) => {
  let ts = 0;
  (S.rechnungen[jahr] || []).forEach(g => (g.rechnungen || []).forEach(r => {
    ts += (r.betrag || 0) - (r.reihe || []).reduce((s, x) => s + (x || 0), 0);
  }));
  return ts;
}, ARBEITSJAHR);
pruef('Saldo ueber alle Rechnungen ist nicht 0 (sonst waere die Saldo-Probe trivial)', erwSaldo !== 0, erwSaldo);

await seite.evaluate(() => { window.__export = null; window.gib = (name, text, typ) => { window.__export = { name, text, typ }; }; });
await klick(seite, '[data-exp="1"]');
await klick(seite, '[data-exp-csv="1"]');
const exp11 = await seite.evaluate(() => window.__export);
pruef('CSV-Datei wurde erzeugt (gib() abgefangen)', exp11 !== null, exp11);
if (exp11) {
  const roh = exp11.text.replace(/^﻿/, '');
  const zeilen = roh.split('\r\n').map(csvFelder);
  const startIdx = zeilen.findIndex(f => f[0] === 'Rechnungen ' + ARBEITSJAHR);
  pruef('Abschnitt "Rechnungen ' + ARBEITSJAHR + '" im CSV gefunden', startIdx >= 0, startIdx);
  if (startIdx >= 0) {
    const header = zeilen[startIdx + 1];
    gleich('Kopfzeile traegt die Spalte "Erledigt" als letzte Spalte',
      header[header.length - 1], 'Erledigt');
    gleich('Kopfzeile vollstaendig',
      header.join('|'),
      ['Ebene', 'Rechnungssteller / Zweck', 'Datum', 'Betrag'].concat(
        ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'])
        .concat(['Saldo', 'Stand', 'Erledigt']).join('|'));
    const erledigtIdx = header.indexOf('Erledigt'), saldoIdx = header.indexOf('Saldo');

    const rest = zeilen.slice(startIdx + 2);
    const totalIdx = rest.findIndex(f => f[0] === 'Total');
    const zeilenBisTotal = rest.slice(0, totalIdx >= 0 ? totalIdx : rest.length);
    const behandlung = zeilenBisTotal.find(f => f[0] === 'Rechnung' && f[1] === 'Behandlung');
    pruef('Zeile fuer "Behandlung" (r-oe-2) im CSV gefunden', !!behandlung, behandlung);
    if (behandlung) gleich('Spalte "Erledigt" nennt genau die zwei abgehakten Monate, in Kalenderreihenfolge',
      behandlung[erledigtIdx], 'Mai Jun');

    pruef('Zeile "Total" im CSV gefunden', totalIdx >= 0, totalIdx);
    if (totalIdx >= 0) {
      const totalZeile = rest[totalIdx];
      gleich('Zeile "Total" traegt den Saldo ueber alle Rechnungen', +totalZeile[saldoIdx], erwSaldo);
    }
  }
}

/* ====================================================================
   Befund 12 — Der Text im Fenster "Neues Jahr anlegen" stimmt in beiden
   Faellen: mit und ohne Haken "Raten fortschreiben".
   ==================================================================== */
console.log('\n12. Text im Fenster "Neues Jahr anlegen" — mit und ohne "Raten fortschreiben"');
await frisch(seite);
const letztesJahr = await seite.evaluate(() => Math.max.apply(null, S.jahre));
await klick(seite, 'button[data-neu-jahr="1"]');
const textOhne = await zelleText(seite, 'div[data-schleier="neu"] p');
pruef('Dialogtext gefunden (ohne "Raten fortschreiben", Ausgangsstand)', textOhne !== null, textOhne);
if (textOhne) {
  pruef('nennt "Restschuld am 31.12.' + letztesJahr + '" als gerechneten Anfangsstand',
    textOhne.includes('Restschuld am 31.12.' + letztesJahr) && textOhne.includes('das ist gerechnet, keine Wahl'),
    textOhne);
  pruef('ohne Haken: "Schulden, die dort auf null stehen, kommen nicht mit."',
    textOhne.includes('Schulden, die dort auf null stehen, kommen nicht mit.'), textOhne);
  pruef('ohne Haken: KEINE Erwaehnung des Fortschreibens', !textOhne.includes('fortgeschrieben'), textOhne);
}
await klick(seite, '[data-neu-raten="1"]');
const textMit = await zelleText(seite, 'div[data-schleier="neu"] p');
pruef('Dialogtext gefunden (mit "Raten fortschreiben")', textMit !== null, textMit);
if (textMit) {
  pruef('nennt weiterhin "Restschuld am 31.12.' + letztesJahr + '" — derselbe erste Satz',
    textMit.includes('Restschuld am 31.12.' + letztesJahr) && textMit.includes('das ist gerechnet, keine Wahl'),
    textMit);
  pruef('mit Haken: "Weil die Raten fortgeschrieben werden, kommen auch Schulden mit, die auf null stehen."',
    textMit.includes('Weil die Raten fortgeschrieben werden, kommen auch Schulden mit, die auf null stehen.'),
    textMit);
  pruef('mit Haken: NICHT mehr "kommen nicht mit"', !textMit.includes('kommen nicht mit'), textMit);
}
/* Gegenprobe: Haken zurueck -> wieder der urspruengliche Text. */
await klick(seite, '[data-neu-raten="1"]');
const textZurueck = await zelleText(seite, 'div[data-schleier="neu"] p');
gleich('Gegenprobe: Haken zurueck -> derselbe Text wie am Anfang', textZurueck, textOhne);

/* ====================================================================
   Befund 13 — zahl() liest Schweizer Schreibweisen richtig.
   ==================================================================== */
console.log('\n13. zahl() liest Schweizer Schreibweisen richtig');
await frisch(seite);
const einkommenId13 = await blockId(seite, ARBEITSJAHR, 'Einkommen');
if (einkommenId13) {
  await klappeById(seite, einkommenId13);
  const pidLohn13 = await findeId(seite, 'Nettolohn');
  if (pidLohn13) {
    const sel = `input.zelle[data-z="${pidLohn13}"][data-m="1"]`; /* Februar, unberuehrt von Befund 5 */
    const proben = [
      { text: "1'234", erwartet: 1234 },
      { text: '1.234,50', erwartet: 1235 },  /* Komma = Dezimaltrenner, Punkt = Tausender: 1234.50 -> gerundet 1235 */
      { text: '12.50', erwartet: 13 },       /* kein Komma da -> Punkt ist Dezimalpunkt: 12.5 -> gerundet 13 */
      { text: '−500', erwartet: -500 },      /* echtes U+2212 */
      { text: '-1 000', erwartet: -1000 }    /* Leerzeichen als Tausendertrenner */
    ];
    for (const p of proben) {
      await tippe(seite, sel, p.text);
      const wert = await zelleText(seite, sel);
      gleich('zahl("' + p.text + '") -> ' + p.erwartet, wert, fmt(p.erwartet, true));
    }
  }
}

/* ====================================================================
   Befund 14 — HTML-Export: der fett gesetzte Name des Rechnungsstellers
   bleibt fett; der Korrekturpunkt traegt keinen Hinweis mehr auf einen
   Doppelklick.
   ==================================================================== */
console.log('\n14. HTML-Export: Rechnungssteller bleibt fett, Korrekturpunkt ohne Doppelklick-Hinweis');
await frisch(seite);
await allesAuf(seite);
const pidKredit14 = await id(seite, 2026, 'Kredit Talgut');
if (pidKredit14) {
  await korrEintragen(seite, { pid: pidKredit14, art: 'basis', richtung: 'plus', betrag: '100', notiz: 'Testkorrektur Export' });
  await korrSchliessen(seite);
}
await gehJahr(seite, 2026);
await seite.evaluate(() => { window.__export = null; window.gib = (name, text, typ) => { window.__export = { name, text, typ }; }; });
await klick(seite, '[data-exp="1"]');
await klick(seite, '[data-exp-html="1"]');
const exp14 = await seite.evaluate(() => window.__export);
pruef('HTML-Export wurde erzeugt', exp14 !== null, exp14);
if (exp14) {
  const auswertung = await seite.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const steller = Array.from(doc.querySelectorAll('span.namensfeld'))
      .find(el => el.textContent.trim() === 'Öchsli Zahnpraxis');
    const mkorr = doc.querySelector('.mkorr');
    return {
      stellerGefunden: !!steller,
      stellerFett: steller ? /font-weight\s*:\s*700/.test(steller.getAttribute('style') || '') : null,
      mkorrGefunden: !!mkorr,
      mkorrTitel: mkorr ? mkorr.getAttribute('title') : null
    };
  }, exp14.text);
  pruef('Name des Rechnungsstellers "Öchsli Zahnpraxis" im Export gefunden', auswertung.stellerGefunden, auswertung);
  pruef('sein Name bleibt fett (font-weight:700 aus dem Original-Inline-Stil)', auswertung.stellerFett === true, auswertung);
  pruef('ein Korrekturpunkt (.mkorr) steht im Export', auswertung.mkorrGefunden, auswertung);
  gleich('sein Titel ist nur noch "Manuell angepasst"', auswertung.mkorrTitel, 'Manuell angepasst');
  /* Befund 14 ist auf den Korrekturpunkt (.mkorr) beschraenkt — andere Titel im
     eingefrorenen Blatt (z. B. auf den Basis-/Rest-Zellen selbst) sind nicht
     Teil dieses Befunds und werden von htmlSichern() bewusst nicht angefasst.
     Die richtige, engere Probe: KEIN .mkorr im Export nennt "Doppelklick". */
  pruef('kein .mkorr im Export nennt noch "Doppelklick" (auch bei mehreren Korrekturpunkten)',
    !/Doppelklick/.test(auswertung.mkorrTitel || ''));
}

/* ====================================================================
   Befund 15 — Excel-Layout: helles Schema. Datenzeilen tragen den
   Zeilengrund, Kopf-/Gruppen-/Summenzeilen einen dunklen Balken mit heller
   Schrift, Gitterlinien sind weiss, die Schrift hebt sich vom Balken ab
   (Kontrast), und in der Ansicht "Alle" tragen die Detailzeilen keinen
   Balken. Gemessen werden die tatsaechlich vom Browser berechneten Farben
   (ueber die CSS-Variablen selbst), nicht von Hand aus dem Quelltext
   abgeschriebene Hexwerte.
   ==================================================================== */
console.log('\n15. Excel-Layout — helles Schema (gemessene Farben, aus den CSS-Variablen)');
await frisch(seite);
const themeAttr = await seite.evaluate(() => document.documentElement.getAttribute('data-theme'));
gleich('die App startet im hellen Schema (Vorgabe)', themeAttr, 'hell');

await allesAuf(seite);
const gehalt = await seite.evaluate(() => {
  const zeileFarbe = varname => {
    const probe = document.createElement('span'); probe.style.color = 'var(' + varname + ')';
    document.body.appendChild(probe); const w = getComputedStyle(probe).color; probe.remove(); return w;
  };
  const bgUnd = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).backgroundColor : null; };
  const fgUnd = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).color : null; };
  const posZellen = Array.from(document.querySelectorAll('#blatt tbody tr.pos:not(.zebra) td:not(.name)'));
  const kopfZellen = Array.from(document.querySelectorAll('#blatt tbody tr.kopf td:not(.name)'));
  const gkopfZellen = Array.from(document.querySelectorAll('#blatt tbody tr.gkopf td:not(.name)'));
  const summeZellen = Array.from(document.querySelectorAll('#blatt tbody tr.summe td:not(.name)'));
  const irgendeineDatenzelle = posZellen[0];
  const irgendeinKopf = kopfZellen[0];
  const irgendeinGkopf = gkopfZellen[0];
  const irgendeineSumme = summeZellen[0];
  return {
    varZeile: zeileFarbe('--zeile'), varBalken: zeileFarbe('--balken'), varBalken2: zeileFarbe('--balken2'),
    varAufbalken: zeileFarbe('--aufbalken'), varGitter: zeileFarbe('--gitter'),
    datenzelleBg: irgendeineDatenzelle ? getComputedStyle(irgendeineDatenzelle).backgroundColor : null,
    datenzelleGitterOben: irgendeineDatenzelle ? getComputedStyle(irgendeineDatenzelle).borderTopColor : null,
    datenzelleGitterRechts: irgendeineDatenzelle ? getComputedStyle(irgendeineDatenzelle).borderRightColor : null,
    kopfBg: irgendeinKopf ? getComputedStyle(irgendeinKopf).backgroundColor : null,
    kopfFg: irgendeinKopf ? getComputedStyle(irgendeinKopf).color : null,
    gkopfBg: irgendeinGkopf ? getComputedStyle(irgendeinGkopf).backgroundColor : null,
    gkopfFg: irgendeinGkopf ? getComputedStyle(irgendeinGkopf).color : null,
    summeBg: irgendeineSumme ? getComputedStyle(irgendeineSumme).backgroundColor : null,
    summeFg: irgendeineSumme ? getComputedStyle(irgendeineSumme).color : null,
    zaehlerDaten: posZellen.length, zaehlerKopf: kopfZellen.length,
    zaehlerGkopf: gkopfZellen.length, zaehlerSumme: summeZellen.length
  };
});
pruef('Datenzeilen, Kopf-, Gruppen- und Summenzeilen im Bild gefunden',
  gehalt.zaehlerDaten > 0 && gehalt.zaehlerKopf > 0 && gehalt.zaehlerGkopf > 0 && gehalt.zaehlerSumme > 0, gehalt);
gleich('Datenzeile traegt den Zeilengrund (--zeile)', gehalt.datenzelleBg, gehalt.varZeile);
gleich('Kopfzeile traegt den dunklen Balken (--balken)', gehalt.kopfBg, gehalt.varBalken);
gleich('Kopfzeile-Schrift ist die helle Balkenschrift (--aufbalken)', gehalt.kopfFg, gehalt.varAufbalken);
gleich('Gruppenkopf traegt den zweiten Balken (--balken2)', gehalt.gkopfBg, gehalt.varBalken2);
gleich('Gruppenkopf-Schrift ist die helle Balkenschrift (--aufbalken)', gehalt.gkopfFg, gehalt.varAufbalken);
gleich('Summenzeile traegt den dunklen Balken (--balken)', gehalt.summeBg, gehalt.varBalken);
gleich('Summenzeile-Schrift ist die helle Balkenschrift (--aufbalken)', gehalt.summeFg, gehalt.varAufbalken);
gleich('Gitterlinie oben ist weiss (--gitter)', gehalt.datenzelleGitterOben, gehalt.varGitter);
gleich('Gitterlinie rechts ist weiss (--gitter)', gehalt.datenzelleGitterRechts, gehalt.varGitter);

const rgbBalken = parseRgb(gehalt.varBalken), rgbBalken2 = parseRgb(gehalt.varBalken2), rgbAuf = parseRgb(gehalt.varAufbalken);
if (rgbBalken && rgbAuf) {
  const k1 = kontrast(rgbBalken, rgbAuf);
  pruef('Kontrast Balken/Balkenschrift ist deutlich lesbar (WCAG-Formel, >= 4.5:1), gemessen: ' + k1.toFixed(2),
    k1 >= 4.5, k1);
}
if (rgbBalken2 && rgbAuf) {
  const k2 = kontrast(rgbBalken2, rgbAuf);
  pruef('Kontrast Gruppenbalken/Balkenschrift ist deutlich lesbar (WCAG-Formel, >= 3:1), gemessen: ' + k2.toFixed(2),
    k2 >= 3, k2);
}

/* In der Ansicht "Alle" tragen die Detailzeilen (tr.hoch) KEINEN Balken —
   Gegenprobe: die starken Summenzeilen (Einnahmen/Ausgaben/Saldo) tragen ihn. */
await gehAlle(seite);
const alleFarben = await seite.evaluate(() => {
  const varBg = () => { const probe = document.createElement('span'); probe.style.color = 'var(--zeile)';
    document.body.appendChild(probe); const w = getComputedStyle(probe).color; probe.remove(); return w; };
  const varBalkenBg = () => { const probe = document.createElement('span'); probe.style.color = 'var(--balken)';
    document.body.appendChild(probe); const w = getComputedStyle(probe).color; probe.remove(); return w; };
  const hoch = document.querySelector('#blatt tbody tr.hoch td:not(.name)');
  const stark = document.querySelector('#blatt tbody tr.kopf.stark td:not(.name)');
  return {
    varZeile: varBg(), varBalken: varBalkenBg(),
    hochBg: hoch ? getComputedStyle(hoch).backgroundColor : null,
    starkBg: stark ? getComputedStyle(stark).backgroundColor : null,
    hochDa: !!hoch, starkDa: !!stark
  };
});
pruef('Detailzeile (tr.hoch) und starke Summenzeile in "Alle" gefunden',
  alleFarben.hochDa && alleFarben.starkDa, alleFarben);
gleich('Detailzeile in "Alle" traegt KEINEN Balken (nur den Zeilengrund)', alleFarben.hochBg, alleFarben.varZeile);
gleich('Gegenprobe: die starke Summenzeile in "Alle" traegt weiterhin den Balken', alleFarben.starkBg, alleFarben.varBalken);
pruef('Gegenprobe wirkt: Detailzeile und starke Zeile sind tatsaechlich verschieden gefaerbt',
  alleFarben.hochBg !== alleFarben.starkBg, alleFarben);

/* ====================================================================
   Befund 16 — Der Wechsel Alle <-> Jahr behaelt, worauf man schaut: aus den
   Rechnungen nach "Alle" landet man in der Jahresansicht der Rechnungen und
   ueber einen Jahresknopf zurueck wieder in den Rechnungen (nicht im Budget).
   ==================================================================== */
console.log('\n16. Der Wechsel Alle <-> Jahr behaelt, worauf man schaut');
await frisch(seite);
await gehAnsicht(seite, 'rechnung');
const eckeRechnung = await zelleText(seite, '#blatt table thead th.ecke');
gleich('Ausgangsstand: Ansicht Rechnungen', eckeRechnung, 'Rechnungssteller');

await gehAlle(seite);
const eckeAlleRech = await zelleText(seite, '#blatt table thead th.ecke');
gleich('"Alle" von den Rechnungen aus landet in der Jahresansicht der Rechnungen', eckeAlleRech, 'Alle Jahre · Rechnungen');
const alleWasNach = await seite.evaluate(() => S.alleWas);
gleich('S.alleWas merkt sich "rechnung"', alleWasNach, 'rechnung');

await gehJahr(seite, 2026);
const stateNach = await seite.evaluate(() => ({ ansicht: S.ansicht, jahr: S.jahr }));
gleich('ein Jahresknopf aus "Alle" fuehrt zurueck in die Ansicht "Rechnungen" (nicht Budget)', stateNach.ansicht, 'rechnung');
gleich('das richtige Jahr steht danach', stateNach.jahr, 2026);
const eckeZurueck = await zelleText(seite, '#blatt table thead th.ecke');
gleich('die Tafel zeigt wieder "Rechnungssteller"', eckeZurueck, 'Rechnungssteller');

/* Gegenprobe in die andere Richtung: aus "Alle" den Reiter auf Budget
   umschalten (bleibt in "Alle"), dann ueber einen Jahresknopf zurueck ins
   Budget landen — nicht wieder in den Rechnungen. */
await gehAlle(seite);
await gehAnsicht(seite, 'budget');
const eckeAlleBudget = await zelleText(seite, '#blatt table thead th.ecke');
gleich('Gegenprobe: Reiter-Umschaltung innerhalb "Alle" zeigt jetzt "Alle Jahre" (Budget)', eckeAlleBudget, 'Alle Jahre');
await gehJahr(seite, 2026);
const stateZurueck2 = await seite.evaluate(() => S.ansicht);
gleich('Gegenprobe: ein Jahresknopf fuehrt jetzt ins Budget (S.alleWas korrekt nachgefuehrt)', stateZurueck2, 'budget');

} catch (e) {
  pruef('Lauf ohne unerwarteten Abbruch', false, String(e && e.stack || e));
} finally {
  await b.close();
  server.close();
}

ende(fehler);
