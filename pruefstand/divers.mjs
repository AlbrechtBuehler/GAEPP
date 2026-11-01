/* GAEPP — Pruefstand: «Diverse Einnahmen» (seit 3.6.0).

   Die Frage dahinter, wie Albrecht sie am 01.11.2026 gestellt hat: Geld, das
   zurueckkommt — eine Rueckerstattung aus der Nebenkostenabrechnung, ein
   zurueckgezahltes Darlehen —, stand bis dahin als Minus bei den Rechnungen. Das
   rechnete richtig, machte aber die Summe der Rechnungen kleiner, als in
   Rechnung gestellt war. Die Antwort ist eine eigene Sektion unter den
   Einnahmen. Sie zaehlt im Saldo mit und verwaessert weder das Einkommen noch
   die Rechnungen.

   Was dieser Lauf prueft, je Abschnitt:
     1. Laden: jeder Jahrgang fuehrt die Sektion genau einmal, direkt nach den
        Einnahmen. Wo die Datei sie traegt (2025), bleibt sie, wie sie ist; wo
        nicht, entsteht sie leer — und eine falsch gezeichnete wird Einnahme.
     2. Budget 2025: Sektionskopf mit den Betraegen aus dem Vorrat, der Saldo
        rechnet sie dazu, Einkommen und Rechnungen bleiben unberuehrt.
     3. Alle Jahre: eigene Zeile unter «Einnahmen»; «Einnahmen» ohne sie; der
        Saldo ist beides zusammen minus Ausgaben.
     4. Eintragen ueber die Oberflaeche im Stichjahr: der Saldo waechst um genau
        den Betrag, sonst bewegt sich nichts; nach dem Neuladen ist es dieselbe
        eine Sektion mit demselben Betrag.
     5. Neuer Jahrgang: die Sektion geht mit, ihre Zeilen nicht — auch nicht mit
        «Budget uebernehmen».
     6. Telefon: die Sektion steht unter dem Einkommen, zeigt den Monatsbetrag,
        und ihre Zeilen oeffnen das Wertfenster.
     7. Das Handbuch nennt sie.

   Jede Zahl ist aus vorrat.mjs gerechnet, nicht abgeschrieben (Hausregel 4).
   Port 8748. Fahren: node divers.mjs */

import { chromium } from 'playwright';
import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { daten, STICHJAHR, JAHRE, DIVERSJAHR } from './vorrat.mjs';

const PORT = 8748;
const KEY = 'diverse-einnahmen';
const NAME = 'Diverse Einnahmen';
const { pruef, gleich, ende } = bilanzbuch('divers');

/* --------------------------------------------- Was der Vorrat dazu sagt */
const D = daten();
const su = r => (r || []).reduce((s, x) => s + (x || 0), 0);
const plus = (a, b) => a.map((x, i) => x + (b[i] || 0));
const N12 = () => new Array(12).fill(0);
const istD = b => b.art === 'block' && b.key === KEY;
const reiheVon = b => (b.pos || []).reduce((r, p) => plus(r, p.reihe || N12()), N12());
/* Einnahmen ohne die diversen, je Monat — der Vorrat fuehrt keine Spiegelzeile,
   also ist die Summe der Zeilen die Summe der Sektion. */
const einVorrat = j => (D.daten[j] || []).filter(b => b.vz === 1 && !istD(b))
  .reduce((r, b) => plus(r, reiheVon(b)), N12());
const diversVorrat = j => (D.daten[j] || []).filter(istD).reduce((r, b) => plus(r, reiheVon(b)), N12());
const rechVorrat = j => (D.rechnungen[j] || []).reduce((r, g) =>
  (g.rechnungen || []).reduce((rr, x) => plus(rr, x.reihe || N12()), r), N12());

const DV = diversVorrat(DIVERSJAHR);
const DMON = DV.findIndex(v => v !== 0);                 /* erster Monat mit Wert */
pruef('der Vorrat fuehrt ' + DIVERSJAHR + ' «' + NAME + '» mit Werten', su(DV) > 0 && DMON >= 0,
  JSON.stringify(DV));
pruef('und ' + STICHJAHR + ' fuehrt sie nicht — dort entsteht sie beim Laden',
  !(D.daten[STICHJAHR] || []).some(istD));

/* -------------------------------------------------------------- Helfer */
function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).trim();
  if (s === '' || s === '—') return 0;
  const n = parseInt(s.replace(/'/g, '').replace(/−/g, '-'), 10);
  return isNaN(n) ? null : n;
}
const klick = async (seite, sel) => { await seite.locator(sel).first().click(); await bisRuhe(seite); };
async function frisch(seite) {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
async function neuLaden(seite) {
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await bisRuhe(seite);
}
/* Die Sektionen eines Jahrgangs, wie der Zustand sie fuehrt. */
const sektionen = (seite, j) => seite.evaluate(j => (S.daten[j] || []).map(b =>
  ({ id: b.id, key: b.key, name: b.name, vz: b.vz, art: b.art, n: (b.pos || []).length,
     pos: (b.pos || []).map(p => ({ id: p.id, name: p.name, reihe: p.reihe.slice() })) })), j);
/* Das Budgetblatt, wie es dasteht: Sektionskoepfe in ihrer Reihenfolge,
   die Saldozeile und die Summenzeilen — gelesen aus dem Bild. */
const blattBild = seite => seite.evaluate(() => {
  const zellen = tr => [...tr.querySelectorAll('td.c-mon')].map(td => {
    const f = td.querySelector('input'); return (f ? f.value : td.textContent).trim(); });
  const kat = [...document.querySelectorAll('#blatt tr.kat')].map(tr => ({ id: tr.dataset.k,
    /* Der Name steht im Klappknopf hinter dem Zeichen «+»/«−»; sein Titel
       traegt ihn rein. */
    name: (tr.querySelector('.klapper') || {}).title || '',
    mon: zellen(tr) }));
  const saldo = document.querySelector('#blatt tr.saldo');
  const sum = [...document.querySelectorAll('#blatt tr.sum, #blatt tr.sumstark')].map(tr => ({
    name: tr.querySelector('td.c-name').firstChild.textContent.trim(), mon: zellen(tr) }));
  return { kat, saldo: saldo ? zellen(saldo) : null, sum };
});
const alleBild = seite => seite.evaluate(() =>
  [...document.querySelectorAll('#blatt table tbody tr')]
    .map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())));

/* ============================================================ Der Lauf */
const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);

/* ---------------------------------------------- 1. Laden */
console.log('\n1. Laden: jeder Jahrgang fuehrt die Sektion genau einmal');
await frisch(seite);
for (const j of JAHRE) {
  const s = await sektionen(seite, j);
  const da = s.filter(x => x.art === 'block' && x.key === KEY);
  gleich(j + ': genau eine Sektion «' + NAME + '»', da.length, 1);
  if (da.length !== 1) continue;
  const i = s.findIndex(x => x.key === KEY);
  let letzte = -1; s.forEach((x, k) => { if (x.vz === 1 && x.key !== KEY) letzte = k; });
  gleich(j + ': sie steht direkt nach der letzten Einnahmen-Sektion', i, letzte + 1);
  gleich(j + ': sie ist eine Einnahme', da[0].vz, 1);
  const imVorrat = (D.daten[j] || []).find(istD);
  if (imVorrat) {
    gleich(j + ': die Sektion aus der Datei behaelt ihre Id', da[0].id, imVorrat.id);
    gleich(j + ': und ihre Zeilen', da[0].pos.map(p => p.name).join(' | '),
      imVorrat.pos.map(p => p.name).join(' | '));
  } else {
    gleich(j + ': angelegt mit der Id des Jahrgangs', da[0].id, 'divers' + j);
    gleich(j + ': und leer', da[0].n, 0);
  }
}
/* Gegenprobe: Anlegen beim Laden ist kein Aendern. Der Fingerabdruck wird nach
   dem Uebernehmen genommen und traegt die Sektion schon — sonst wuerde GAEPP
   beim naechsten Merken einen Stand ins Repo schicken, den niemand gemacht hat.
   (Dass die Startdatei neben der App beim ersten Start in den Browserspeicher
   geht, ist der Weg von vor 3.6.0 und hier nicht gefragt — gefragt ist, dass
   der gespeicherte Stand die Sektion je Jahrgang genau einmal traegt.) */
gleich('Gegenprobe: nach dem Laden meldet der Fingerabdruck keine Aenderung',
  await seite.evaluate(() => finger() === letzterFinger), true);
{
  const roh = await seite.evaluate(() => JSON.parse(localStorage.getItem('gaepp.tabelle.v1') || 'null'));
  pruef('der gespeicherte Stand traegt sie in jedem Jahrgang genau einmal',
    !!roh && JAHRE.every(j => (roh.daten[j] || []).filter(x => x.key === KEY).length === 1),
    roh ? JAHRE.map(j => (roh.daten[j] || []).filter(x => x.key === KEY).length).join(',') : 'nichts gespeichert');
}
/* Gegenprobe: zweimal laden legt nicht zweimal an. */
await seite.evaluate(() => { uebernimm(JSON.parse(JSON.stringify(nutzdaten()))); });
gleich('Gegenprobe: ein zweites Uebernehmen legt keine zweite Sektion an',
  (await sektionen(seite, STICHJAHR)).filter(x => x.key === KEY).length, 1);

/* Eine Datei, in der die Sektion als Ausgabe gezeichnet ist (von Hand
   bearbeitet), rechnet sie trotzdem als Einnahme — sonst stuende eine
   Rueckzahlung auf der falschen Seite des Saldos. */
{
  const krumm = daten();
  const blk = krumm.daten[DIVERSJAHR].find(istD);
  blk.vz = -1;
  await seite.evaluate(d => { uebernimm(d); }, krumm);
  const vz = await seite.evaluate(j => (S.daten[j].find(b => b.key === 'diverse-einnahmen') || {}).vz, DIVERSJAHR);
  gleich('eine als Ausgabe gezeichnete Sektion wird beim Laden Einnahme', vz, 1);
  const div = await seite.evaluate(j => bau(j).divers, DIVERSJAHR);
  gleich('und rechnet als Einnahme (' + DIVERSJAHR + ', Jahr)', su(div), su(DV));
}

/* ---------------------------------------------- 2. Budget 2025 */
console.log('\n2. Budget ' + DIVERSJAHR + ': eigene Sektion, im Saldo, sonst nichts');
await frisch(seite);
await klick(seite, `[data-geh-jahr="${DIVERSJAHR}"]`);
{
  const bild = await blattBild(seite);
  const namen = bild.kat.map(k => k.name);
  const iE = namen.indexOf('Einkommen'), iD = namen.indexOf(NAME);
  pruef('Sektionskopf «' + NAME + '» steht im Blatt', iD >= 0, namen.join(' | '));
  gleich('direkt unter «Einkommen»', iD, iE + 1);
  const kopf = bild.kat[iD];
  if (kopf) {
    gleich('der Kopf zeigt ' + (DMON + 1) + '. Monat aus dem Vorrat', lies(kopf.mon[DMON]), DV[DMON]);
    gleich('und jeder Monat stimmt', kopf.mon.map(lies).join(','), DV.join(','));
  }
  const ein = bild.kat[iE];
  if (ein) gleich('«Einkommen» ohne die Rueckzahlungen', ein.mon.map(lies).join(','),
    einVorrat(DIVERSJAHR).join(','));
  const rech = bild.sum.find(s => s.name === 'Rechnungen');
  pruef('Zeile «Rechnungen» gefunden', !!rech, bild.sum.map(s => s.name).join(' | '));
  if (rech) gleich('«Rechnungen» bleibt, was in Rechnung gestellt wurde',
    rech.mon.map(lies).join(','), rechVorrat(DIVERSJAHR).join(','));
  const aus = bild.sum.find(s => s.name === 'Ausgaben zusammen');
  pruef('Zeile «Ausgaben zusammen» gefunden', !!aus);
  if (aus && bild.saldo) {
    /* Saldo = Einnahmen + Diverse − Ausgaben. Die Einnahmen kommen aus dem
       Vorrat, die Ausgaben aus der Zeile, die andere Laeufe schon pruefen. */
    const soll = einVorrat(DIVERSJAHR).map((e, m) => e + DV[m] - lies(aus.mon[m]));
    gleich('der Saldo rechnet die Rueckzahlungen dazu, jeden Monat',
      bild.saldo.map(lies).join(','), soll.join(','));
    gleich('Gegenprobe: ohne sie waere der Saldo im ' + (DMON + 1) + '. Monat um genau so viel kleiner',
      lies(bild.saldo[DMON]) - (einVorrat(DIVERSJAHR)[DMON] - lies(aus.mon[DMON])), DV[DMON]);
  }
}

/* ---------------------------------------------- 3. Alle Jahre */
console.log('\n3. Alle Jahre: eigene Zeile, «Einnahmen» ohne sie');
await klick(seite, '[data-geh-alle="1"]');
{
  const bild = await alleBild(seite);
  const zeile = n => bild.find(z => z[0] === n);
  const iE = bild.findIndex(z => z[0] === 'Einnahmen'), iD = bild.findIndex(z => z[0] === NAME);
  pruef('Zeile «' + NAME + '» steht in «Alle Jahre»', iD >= 0, bild.map(z => z[0]).join(' | '));
  gleich('direkt unter «Einnahmen»', iD, iE + 1);
  const ein = zeile('Einnahmen'), div = zeile(NAME), aus = zeile('Ausgaben'), sal = zeile('Saldo');
  if (ein && div && aus && sal) {
    JAHRE.forEach((j, k) => {
      gleich(j + ': «' + NAME + '»', lies(div[k + 1]), su(diversVorrat(j)));
      gleich(j + ': «Einnahmen» ohne sie', lies(ein[k + 1]), su(einVorrat(j)));
      gleich(j + ': Saldo = Einnahmen + ' + NAME + ' − Ausgaben', lies(sal[k + 1]),
        lies(ein[k + 1]) + lies(div[k + 1]) - lies(aus[k + 1]));
    });
    gleich('die Totalspalte von «' + NAME + '»', lies(div[JAHRE.length + 1]),
      JAHRE.reduce((s, j) => s + su(diversVorrat(j)), 0));
  } else pruef('Zeilen Einnahmen, ' + NAME + ', Ausgaben und Saldo gefunden', false);
}

/* ---------------------------------------------- 4. Eintragen */
console.log('\n4. Eintragen im Stichjahr ' + STICHJAHR + ': der Saldo waechst um genau den Betrag');
await frisch(seite);
await klick(seite, `[data-geh-jahr="${STICHJAHR}"]`);
const BETRAG = 300, MON = 3;                               /* April */
{
  const vor = await blattBild(seite);
  const kopf = vor.kat.find(k => k.name === NAME);
  pruef('die angelegte Sektion steht im Blatt', !!kopf);
  if (kopf) {
    await seite.locator(`tr.kat[data-k="${kopf.id}"]`).first().hover(); await bisRuhe(seite);
    await klick(seite, `[data-neu-pos="${kopf.id}"]`);
    const neu = (await sektionen(seite, STICHJAHR)).find(x => x.key === KEY).pos.slice(-1)[0];
    pruef('eine Zeile in «' + NAME + '» angelegt', !!neu);
    if (neu) {
      const name = seite.locator(`.namensfeld[data-p="${neu.id}"]`).first();
      await name.fill('Rückerstattung Nebenkosten'); await name.dispatchEvent('change'); await bisRuhe(seite);
      const feld = seite.locator(`input.zelle[data-z="${neu.id}"][data-m="${MON}"]`).first();
      await feld.fill(String(BETRAG)); await feld.dispatchEvent('change'); await bisRuhe(seite);

      const nach = await blattBild(seite);
      const k2 = nach.kat.find(k => k.name === NAME);
      gleich('der Sektionskopf zeigt den Betrag', lies(k2.mon[MON]), BETRAG);
      gleich('der Saldo im April waechst um genau den Betrag',
        lies(nach.saldo[MON]) - lies(vor.saldo[MON]), BETRAG);
      gleich('Gegenprobe: die anderen Monate des Saldos bleiben',
        nach.saldo.filter((_, m) => m !== MON).join(','), vor.saldo.filter((_, m) => m !== MON).join(','));
      gleich('«Einkommen» bleibt', nach.kat.find(k => k.name === 'Einkommen').mon.join(','),
        vor.kat.find(k => k.name === 'Einkommen').mon.join(','));
      for (const n of ['Rechnungen', 'Ausgaben zusammen'])
        gleich('«' + n + '» bleibt', (nach.sum.find(s => s.name === n) || {}).mon.join(','),
          (vor.sum.find(s => s.name === n) || {}).mon.join(','));

      /* Gespeichert: der Browserspeicher traegt die Sektion jetzt selbst. */
      const roh = await seite.evaluate(() => JSON.parse(localStorage.getItem('gaepp.tabelle.v1') || 'null'));
      const imSpeicher = roh && (roh.daten[STICHJAHR] || []).filter(istDHier => istDHier.key === KEY);
      gleich('der Browserspeicher traegt genau eine Sektion', imSpeicher ? imSpeicher.length : null, 1);

      await neuLaden(seite);
      const s = (await sektionen(seite, STICHJAHR)).filter(x => x.key === KEY);
      gleich('nach dem Neuladen: weiterhin genau eine Sektion', s.length, 1);
      gleich('mit derselben Id', s[0] && s[0].id, 'divers' + STICHJAHR);
      gleich('und demselben Betrag', s[0] && s[0].pos[0] && s[0].pos[0].reihe[MON], BETRAG);

      await klick(seite, '[data-geh-alle="1"]');
      const alle = await alleBild(seite);
      const k = JAHRE.indexOf(STICHJAHR) + 1;
      gleich('«Alle Jahre»: ' + STICHJAHR + ' zeigt den Betrag bei «' + NAME + '»',
        lies((alle.find(z => z[0] === NAME) || [])[k]), BETRAG);
      gleich('und «Einnahmen» ' + STICHJAHR + ' bleibt ohne ihn',
        lies((alle.find(z => z[0] === 'Einnahmen') || [])[k]), su(einVorrat(STICHJAHR)));
    }
  }
}

/* ---------------------------------------------- 5. Neuer Jahrgang */
console.log('\n5. Neuer Jahrgang: die Sektion geht mit, ihre Zeilen nicht');
await frisch(seite);
{
  const letztes = Math.max.apply(null, JAHRE);
  /* Damit die Frage etwas bedeutet, traegt das letzte Jahr eine Rueckzahlung. */
  await seite.evaluate((j) => {
    const b = S.daten[j].find(x => x.key === 'diverse-einnahmen');
    b.pos.push({ id: neueId(), key: 'probe', name: 'Probe', basis: 0, reihe: [0,0,0,0,0,90,0,0,0,0,0,0] });
  }, letztes);
  await klick(seite, '[data-neu-jahr]');
  const budgetMit = await seite.evaluate(() => S.neu && S.neu.budget);
  gleich('«Budget übernehmen» ist angehakt', budgetMit, true);
  await klick(seite, '[data-neu-an]');
  const neuJ = letztes + 1;
  const s = await sektionen(seite, neuJ);
  const d = s.filter(x => x.key === KEY);
  gleich(neuJ + ': genau eine Sektion «' + NAME + '»', d.length, 1);
  gleich(neuJ + ': und sie ist leer', d[0] && d[0].n, 0);
  gleich(neuJ + ': an derselben Stelle wie im Vorjahr', s.findIndex(x => x.key === KEY),
    (await sektionen(seite, letztes)).findIndex(x => x.key === KEY));
  const einNeu = s.find(x => x.name === 'Einkommen');
  pruef('Gegenprobe: «Einkommen» nimmt seine Zeilen mit', !!einNeu && einNeu.n > 0, einNeu && einNeu.n);
}

/* ---------------------------------------------- 6. Telefon */
console.log('\n6. Telefon: unter dem Einkommen, Monatsbetrag, Wertfenster');
{
  const tk = await b.newContext({ viewport: { width: 390, height: 844 },
    locale: 'de-CH', timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: true });
  const tp = await tk.newPage();
  tp.on('pageerror', e => fehler.push('Telefon: ' + String(e)));
  await tp.goto('http://127.0.0.1:' + PORT + '/index.html');
  await tp.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true && S.mobil === true,
    null, { timeout: 8000 });
  const ruhe = () => tp.waitForTimeout(150);
  await tp.locator('[data-m-jahr-auf]').tap(); await ruhe();
  await tp.locator(`[data-geh-jahr="${DIVERSJAHR}"]`).first().tap(); await ruhe();
  await tp.locator(`[data-m-monat="${DMON}"]`).tap(); await ruhe();
  const kats = await tp.evaluate(() => [...document.querySelectorAll('.mKat')].map(e =>
    ({ n: e.querySelector('.n').textContent.trim(), w: e.querySelector('.w').textContent.trim() })));
  const iE = kats.findIndex(k => k.n === 'Einkommen'), iD = kats.findIndex(k => k.n === NAME);
  pruef('die Sektion steht am Telefon', iD >= 0, kats.map(k => k.n).join(' | '));
  gleich('direkt unter «Einkommen»', iD, iE + 1);
  if (iD >= 0) {
    gleich('mit dem Betrag des Monats', lies(kats[iD].w), DV[DMON]);
    await tp.locator('.mKat', { hasText: NAME }).first().tap(); await ruhe();
    const pid = (D.daten[DIVERSJAHR].find(istD).pos.find(p => p.reihe[DMON] !== 0) || {}).id;
    const zeile = tp.locator(`[data-mw-pos="${pid}"]`);
    gleich('aufgeklappt steht ihre Zeile antippbar da', await zeile.count(), 1);
    if (await zeile.count()) {
      await zeile.first().tap(); await ruhe();
      gleich('Antippen oeffnet das Wertfenster', await tp.locator('[data-schleier="mWert"]').count(), 1);
      gleich('mit dem Betrag des Monats',
        lies(await tp.inputValue('[data-mw-betrag]')), DV[DMON]);
    }
  }
  await tk.close();
}

/* ---------------------------------------------- 7. Handbuch */
console.log('\n7. Das Handbuch nennt die Sektion');
await frisch(seite);
await klick(seite, '[data-hb="1"]');
{
  const hb = await seite.evaluate(() => (document.querySelector('[data-schleier="hb"]') || {}).textContent || '');
  pruef('das Handbuch hat einen Abschnitt «' + NAME + '»', hb.indexOf(NAME) >= 0);
  pruef('und sagt, dass sie nicht zu den Rechnungen gehoert',
    /nicht als Minus zu den Rechnungen/.test(hb));
}

await b.close(); server.close();
ende(fehler);
