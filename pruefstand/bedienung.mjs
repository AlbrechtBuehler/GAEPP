/* GÄPP — Prüfstand: die Bedienwege.
   Neu am 23.08.2026. Er misst, was ein Mensch am Blatt tut: tippen, klicken,
   rechtsklicken, doppelklicken, ziehen, Tasten drücken — und was danach im
   Datenstand steht.

   Warum dieser Lauf so und nicht anders gebaut ist:

   1. Gemessen wird die WIRKUNG, nicht die Anzeige. Nach jeder Bedienung wird
      der Datenstand gelesen (S.daten, S.haken, S.rechnungen, S.jahre) oder der
      Text, den das Blatt zeigt. Eine gesetzte Klasse ist kein Beweis, dass
      etwas gerechnet wurde.
   2. Jede Bedienung zeichnet das Blatt neu. Deshalb hält dieser Lauf NIRGENDS
      einen Elementgriff über einen Klick hinweg — gearbeitet wird mit
      Selektor-Zeichenketten, die vor jedem Klick frisch aufgelöst werden.
      Ein vorher geholtes Element gibt es nach dem Neuzeichnen nicht mehr.
   3. Zwei Klicks sind nur dann zwei Klicks, wenn genug Zeit dazwischen liegt.
      Sonst liest Chromium einen Doppelklick — und der bedeutet in GÄPP etwas
      anderes. Dafür steht GETRENNT.
   4. Wo etwas umschaltet, wird der WECHSEL geprüft, nicht ein fester Zustand:
      der Vorrat trägt absichtlich schon gesetzte Haken, offene wie geschlossene
      Sektionen und alle vier Rechnungszustände.
   5. Erwartete Zahlen sind hergeleitet — aus vorrat.mjs, aus dem gelesenen
      Zustand oder aus der Regel selbst (z. B. «auf volle Zehner aufgerundet»).
      Abgeschrieben wird keine.

   Jeder Abschnitt fängt mit frisch() an: Browserspeicher leeren, neu laden.
   Die Daten kommen dann wieder von serve() aus vorrat.mjs — jeder Abschnitt
   beginnt also am selben, unverfälschten Stand.

   Port 8732. Fahren:  node bedienung.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { STICHJAHR, JAHRE } from './vorrat.mjs';

const PORT = 8732;
const JAHR = STICHJAHR;                 /* 2026 — aus dem Vorrat, nicht getippt */
const GETRENNT = 700;                   /* ms zwischen zwei Klicks, die keiner sein sollen */

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);
const { pruef, gleich, ende } = bilanzbuch('bedienung');

/* ---------------------------------------------------------------- Helfer */

const ruhe = () => bisRuhe(seite);

/* S ist ein «const» auf oberster Ebene eines klassischen Skripts: es hängt
   nicht an window, ist im Skript-Bereich aber sichtbar. Darum überall das
   blosse S — window.S wäre immer undefined und jede Messung liefe blind. */
async function frisch() {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true,
    null, { timeout: 8000 });
  await ruhe();
}

/* Klicken heisst hier immer: den Selektor jetzt auflösen, klicken, das
   Neuzeichnen abwarten. */
async function klick(sel)   { await seite.click(sel); await ruhe(); }
async function rklick(sel)  { await seite.click(sel, { button: 'right' }); await ruhe(); }
async function dklick(sel)  { await seite.dblclick(sel); await ruhe(); }
/* Ein zweiter Klick, der als eigener Klick ankommen soll und nicht als Hälfte
   eines Doppelklicks. */
async function spaeter(sel) { await seite.waitForTimeout(GETRENNT); await klick(sel); }
/* Tippen und die Zelle verlassen — genau das löst die Neuberechnung aus. */
async function tippe(sel, wert) {
  await seite.fill(sel, String(wert));
  await seite.keyboard.press('Tab');
  await ruhe();
}
async function taste(k) { await seite.keyboard.press(k); await ruhe(); }
const oeffne = id => klick('[data-klapp="' + id + '"]');

/* Schweizer Schreibweise zurück in eine Zahl: Apostroph als Tausendertrenner,
   «−» (U+2212) als Minus, leer und «—» sind null. */
const zahlAus = t => {
  const s = String(t == null ? '' : t).replace(/['’\s]/g, '').replace(/−/g, '-');
  if (s === '' || s === '—' || s === '-') return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
};

/* --- Lesen aus dem laufenden Zustand ------------------------------------- */

const blockLesen = (jahr, name) => seite.evaluate(([j, n]) => {
  const b = (S.daten[j] || []).find(x => x.name === n);
  if (!b) return null;
  return { id: b.id, art: b.art, vz: b.vz,
    anzahl: b.art === 'schulden' ? (b.gruppen || []).length : (b.pos || []).length,
    namen: b.art === 'schulden' ? (b.gruppen || []).map(g => g.name) : (b.pos || []).map(p => p.name),
    gruppen: (b.gruppen || []).map(g => ({ id: g.id, key: g.key, name: g.name,
      pos: (g.pos || []).map(p => ({ id: p.id, key: p.key, name: p.name })) })) };
}, [jahr, name]);

const posLesen = (jahr, blockName, posName) => seite.evaluate(([j, bn, pn]) => {
  const b = (S.daten[j] || []).find(x => x.name === bn);
  if (!b) return null;
  const listen = b.art === 'schulden' ? (b.gruppen || []).map(g => g.pos || []) : [b.pos || []];
  for (const L of listen) {
    const p = L.find(x => x.name === pn);
    if (p) return { id: p.id, key: p.key, name: p.name, basis: p.basis,
      reihe: (p.reihe || []).slice(), korr: p.korr || null };
  }
  return null;
}, [jahr, blockName, posName]);

const hakenLesen = (id, m) => seite.evaluate(([i, mm]) => !!S.haken[i + ':' + mm], [id, m]);
const saldoLesen = () => seite.evaluate(() =>
  Array.from(document.querySelectorAll('tr.saldo td.c-mon')).map(td => td.textContent));
const fokusLesen = () => seite.evaluate(() => {
  const a = document.activeElement;
  if (!a) return null;
  return { tag: a.tagName, klasse: String(a.className || '').trim(),
    z: a.dataset ? a.dataset.z : undefined, m: a.dataset ? a.dataset.m : undefined,
    p: a.dataset ? a.dataset.p : undefined, s: a.dataset ? a.dataset.s : undefined,
    r: a.dataset ? a.dataset.r : undefined, f: a.dataset ? a.dataset.f : undefined,
    /* rm trägt die Rechnungszeile — ohne dieses Feld liesse sich in den
       Rechnungen nicht messen, wo der Cursor nach einem Klick steht. */
    rm: a.dataset ? a.dataset.rm : undefined,
    griff: a.dataset ? a.dataset.griff : undefined,
    spalte: a.closest && a.closest('td') ? a.closest('td').cellIndex : null,
    wert: a.value };
});
const titelLesen = () => seite.evaluate(() => {
  const t = document.querySelector('#blattkopf .titel');
  return t ? t.textContent : null;
});
const dialogDa = name => seite.evaluate(n => !!document.querySelector('[data-schleier="' + n + '"]'), name);
const irgendeinDialog = () => seite.evaluate(() => !!document.querySelector('.schleier'));

console.log('\nGÄPP — Bedienwege');

/* ======================================================== 1. Zahlen eintragen
   Der Weg, der am häufigsten gegangen wird. Geprüft wird beides: dass der Wert
   im Datenstand landet UND dass das Blatt ihn weiterrechnet (Saldozeile). */
{
  await frisch();
  const blk = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(blk.id);
  const pos = await posLesen(JAHR, 'Fixkosten', 'Bahnabo');
  const M = 3;
  const zelle = '.zelle[data-z="' + pos.id + '"][data-m="' + M + '"]';
  const altWert = pos.reihe[M];
  const neuWert = altWert + 232;          /* irgendein anderer Wert, hergeleitet */
  const saldoVor = zahlAus((await saldoLesen())[M]);

  await tippe(zelle, neuWert);
  const nach = await posLesen(JAHR, 'Fixkosten', 'Bahnabo');
  gleich('tippen und verlassen trägt den Wert ein', nach.reihe[M], neuWert);

  /* Fixkosten tragen vz −1: eine höhere Ausgabe senkt den Saldo. Das Vorzeichen
     kommt aus dem Datenstand, nicht aus dem Kopf. */
  const saldoNach = zahlAus((await saldoLesen())[M]);
  gleich('der Saldo dieses Monats ist neu gerechnet',
    saldoNach, saldoVor + (blk.vz === 1 ? 1 : -1) * (neuWert - altWert));

  /* Tab springt in die nächste Zelle derselben Zeile — das Neuzeichnen hat den
     Fokus überstanden, sonst stünde er jetzt auf nichts. */
  const nachTab = await fokusLesen();
  pruef('Tab landet in der nächsten Monatsspalte derselben Zeile',
    nachTab.z === pos.id && nachTab.m === String(M + 1),
    nachTab.z + ' m=' + nachTab.m);

  await seite.keyboard.down('Shift'); await taste('Tab'); await seite.keyboard.up('Shift');
  const nachRueck = await fokusLesen();
  pruef('Shift+Tab führt wieder zurück',
    nachRueck.z === pos.id && nachRueck.m === String(M),
    nachRueck.z + ' m=' + nachRueck.m);

  /* Pfeil rauf und runter: dieselbe Spalte, die nächste Zeile. Gemessen wird
     die Spaltennummer der Zelle — quer durch die Zeile wäre der Fehler, den
     eine Prüfung «anderes Feld» nicht sähe. */
  const spalteVor = nachRueck.spalte;
  await taste('ArrowDown');
  const runter = await fokusLesen();
  const naechsterName = blk.namen[blk.namen.indexOf('Bahnabo') + 1];
  const naechster = await posLesen(JAHR, 'Fixkosten', naechsterName);
  pruef('Pfeil runter bleibt in derselben Spalte und geht eine Zeile weiter',
    runter.spalte === spalteVor && runter.m === String(M) && runter.z === naechster.id,
    'Spalte ' + runter.spalte + ' m=' + runter.m + ' Zeile ' + runter.z);

  await taste('ArrowUp');
  const rauf = await fokusLesen();
  pruef('Pfeil rauf führt in derselben Spalte zurück',
    rauf.spalte === spalteVor && rauf.m === String(M) && rauf.z === pos.id,
    'Spalte ' + rauf.spalte + ' m=' + rauf.m + ' Zeile ' + rauf.z);

  /* Der Fokus überlebt das Neuzeichnen: nach dem Übernehmen eines Werts wird
     das ganze Blatt neu gebaut — die Zelle darunter ist eine andere, sie muss
     wiedergefunden werden. */
  const zelle5 = '.zelle[data-z="' + pos.id + '"][data-m="5"]';
  await seite.click(zelle5);
  await seite.fill(zelle5, '321');
  await seite.evaluate(s => document.querySelector(s)
    .dispatchEvent(new Event('change', { bubbles: true })), zelle5);
  await seite.waitForTimeout(150);
  const geblieben = await fokusLesen();
  pruef('der Fokus steht nach dem Neuzeichnen wieder in derselben Zelle',
    geblieben.z === pos.id && geblieben.m === '5' && geblieben.klasse.indexOf('zelle') === 0,
    geblieben.z + ' m=' + geblieben.m + ' «' + geblieben.klasse + '»');
  gleich('und die Zelle trägt den getippten Wert', geblieben.wert, '321');
}

/* ============================================================== 2. Die Haken */
{
  await frisch();
  const blk = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(blk.id);
  const pos = await posLesen(JAHR, 'Fixkosten', 'Bahnabo');
  const zelle = m => '.zelle[data-z="' + pos.id + '"][data-m="' + m + '"]';

  /* Rechtsklick: sofort. Geprüft wird der Wechsel — eine Zelle kann im Vorrat
     schon abgehakt sein. */
  const vorRechts = await hakenLesen(pos.id, 2);
  await rklick(zelle(2));
  const nachRechts = await hakenLesen(pos.id, 2);
  pruef('Rechtsklick schaltet die Marke sofort um', nachRechts === !vorRechts,
    vorRechts + ' → ' + nachRechts);
  /* Und die Zahl wird dabei wirklich halbfett — die sichtbare Seite derselben
     Sache. Verglichen wird das berechnete Gewicht vorher/nachher. */
  const gewicht = await seite.evaluate(s => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).fontWeight : null; }, zelle(2));
  await rklick(zelle(2));
  const gewichtZurueck = await seite.evaluate(s => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).fontWeight : null; }, zelle(2));
  pruef('mit der Marke wechselt auch das Schriftgewicht der Zahl',
    gewicht !== null && gewicht !== gewichtZurueck, gewicht + ' / ' + gewichtZurueck);
  pruef('der zweite Rechtsklick nimmt die Marke wieder zurück',
    (await hakenLesen(pos.id, 2)) === vorRechts, await hakenLesen(pos.id, 2));

  /* Der linke Klick gehört seit dem 23.08.2026 ganz dem Eingeben. Er setzt nur
     den Cursor und NIE eine Marke: nicht beim ersten Klick, nicht beim zweiten,
     auch nicht auf einer Zelle, in der der Cursor schon steht. Bis zum
     22.08.2026 galt hier die umgekehrte Erwartung — «der zweite Klick setzt die
     Marke». Sie ist mit der Regel umgedreht worden, nicht gestrichen; die
     Gegenprobe unten hält fest, dass die Zelle sehr wohl abhakbar ist.
     Zwischen zwei Klicks muss Zeit liegen, sonst liest Chromium einen
     Doppelklick — und der bedeutet wieder etwas anderes. */
  pruef('Voraussetzung: die Probezelle trägt einen Betrag, ist also abhakbar',
    pos.reihe[6] !== 0, pos.reihe[6]);
  const vor6 = await hakenLesen(pos.id, 6);
  await seite.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await klick(zelle(6));
  const nach1 = await hakenLesen(pos.id, 6);
  const fokus1 = await fokusLesen();
  pruef('der erste Klick setzt nur den Cursor, keine Marke',
    nach1 === vor6 && fokus1.z === pos.id && fokus1.m === '6',
    'Marke ' + nach1 + ', Fokus m=' + fokus1.m);
  await spaeter(zelle(6));
  const nach2 = await hakenLesen(pos.id, 6);
  pruef('auch der zweite Klick setzt keine Marke', nach2 === vor6, nach2);
  await spaeter(zelle(6));
  const nach3 = await hakenLesen(pos.id, 6);
  const fokus3 = await fokusLesen();
  pruef('und der dritte ebenso wenig — kein linker Klick setzt je eine Marke',
    nach3 === vor6, nach3);
  pruef('nach allen drei Klicks steht der Cursor weiter in derselben Zelle',
    fokus3.z === pos.id && fokus3.m === '6', fokus3.z + ' m=' + fokus3.m);

  /* Die Gegenprobe zu «keine Marke»: die Erwartung wäre auch dann grün, wenn
     sich diese Zelle überhaupt nicht abhaken liesse. Der Rechtsklick auf genau
     dieselbe Zelle muss also wirken — sofort, schon beim ersten Mal. */
  await rklick(zelle(6));
  const rechts6 = await hakenLesen(pos.id, 6);
  pruef('Gegenprobe: der Rechtsklick auf dieselbe Zelle setzt die Marke sehr wohl',
    rechts6 === !vor6, vor6 + ' → ' + rechts6);
  await rklick(zelle(6));
  gleich('und der zweite Rechtsklick stellt den Ausgangsstand wieder her',
    await hakenLesen(pos.id, 6), vor6);

  /* Die Regel gilt in beide Richtungen: ein linker Klick auf eine Zelle, die
     eine Marke trägt, nimmt sie auch nicht zurück. */
  await rklick(zelle(7));
  const gesetzt7 = await hakenLesen(pos.id, 7);
  await seite.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await klick(zelle(7));
  await spaeter(zelle(7));
  pruef('ein linker Klick nimmt eine gesetzte Marke auch nicht zurück',
    gesetzt7 === true && (await hakenLesen(pos.id, 7)) === true,
    'gesetzt ' + gesetzt7 + ', danach ' + (await hakenLesen(pos.id, 7)));

  /* Doppelklick gehört dem Übertragen. Er setzt keine Marke und nimmt auch
     keine zurück — seit dem 23.08.2026 auch dann nicht, wenn der Cursor bereits
     in der Zelle steht. Vorher war der erste Klick des Doppelklicks der zweite
     Klick dieser Zelle und setzte nach der damaligen Regel die Marke; dieser
     Fall stand hier deshalb ausdrücklich NICHT als Erwartung. Jetzt steht er
     als eine — gemessen wird beides, die fremde und die schon besetzte Zelle. */
  const vor8 = await hakenLesen(pos.id, 8);
  await seite.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await dklick(zelle(8));
  pruef('Doppelklick öffnet «Übertragen»', await dialogDa('ueb'));
  gleich('«Übertragen» meint die angeklickte Zelle',
    await seite.evaluate(() => S.ueb.id + ':' + S.ueb.m), pos.id + ':8');
  pruef('der Doppelklick setzt dabei keine Marke',
    (await hakenLesen(pos.id, 8)) === vor8, await hakenLesen(pos.id, 8));
  await taste('Escape');

  /* Derselbe Doppelklick, diesmal dort, wo der Cursor schon steht. */
  await klick(zelle(8));
  await seite.waitForTimeout(GETRENNT);
  await dklick(zelle(8));
  pruef('der Doppelklick öffnet «Übertragen» auch in der Zelle, die den Fokus schon hat',
    await dialogDa('ueb'));
  pruef('und setzt auch dort keine Marke',
    (await hakenLesen(pos.id, 8)) === vor8, await hakenLesen(pos.id, 8));
  await taste('Escape');

  /* Und er nimmt keine zurück: derselbe Weg auf einer Zelle, die eine trägt. */
  await rklick(zelle(10));
  const gesetzt10 = await hakenLesen(pos.id, 10);
  await seite.waitForTimeout(GETRENNT);
  await dklick(zelle(10));
  pruef('der Doppelklick nimmt eine gesetzte Marke nicht zurück',
    gesetzt10 === true && (await hakenLesen(pos.id, 10)) === true,
    'gesetzt ' + gesetzt10 + ', danach ' + (await hakenLesen(pos.id, 10)));
  await taste('Escape');

  /* Eine leere Zelle lässt sich nicht abhaken: die Marke wäre unsichtbar und
     wirkte später, sobald dort eine Zahl steht. Der Vorrat führt dafür eine
     Position ohne Wert (Zulagen ausserhalb Februar). */
  const ein = await blockLesen(JAHR, 'Einkommen');
  await oeffne(ein.id);
  const leer = await posLesen(JAHR, 'Einkommen', 'Zulagen');
  const leerM = leer.reihe.indexOf(0);
  const vorLeer = await hakenLesen(leer.id, leerM);
  await rklick('.zelle[data-z="' + leer.id + '"][data-m="' + leerM + '"]');
  pruef('eine leere Zelle lässt sich nicht abhaken',
    (await hakenLesen(leer.id, leerM)) === false && vorLeer === false,
    await hakenLesen(leer.id, leerM));

  /* Und die Marke fällt mit dem Betrag. */
  await rklick(zelle(9));
  const gesetzt = await hakenLesen(pos.id, 9);
  await tippe(zelle(9), '0');
  pruef('mit dem Betrag fällt die Marke',
    gesetzt === true && (await hakenLesen(pos.id, 9)) === false,
    'gesetzt ' + gesetzt + ', danach ' + (await hakenLesen(pos.id, 9)));
}

/* ================================= 3. Der Haken — eine Regel, zwei Ansichten
   Seit dem 23.08.2026 ruft der Rechtsklick dieselben zwei Funktionen wie früher
   der Klick: hakenUm() im Budget, rechnungHakenUm() in den Rechnungen. Bis
   dahin stand die Regel im Rechtsklick-Zweig ein zweites Mal, Wort für Wort
   abgeschrieben. Eine Regel, die nur noch an EINER Stelle steht, muss man an
   beiden Enden messen: was das Budget tut, müssen die Rechnungen genauso tun —
   und wo die Rechnungen mehr können, muss dieses Mehr auch wirklich da sein.

   Gemessen wird beide Male derselbe Dreiklang — setzen, zurücknehmen, leere
   Zelle bleibt leer — und dazu die sichtbare Seite: beide Ansichten hängen an
   derselben Regel (tr.pos td.hak, und .zelle erbt die Schrift), also muss auch
   das Schriftgewicht beide Male kippen. Verglichen werden am Ende die beiden
   Ergebnisse miteinander UND jedes für sich gegen die Erwartung: gleich allein
   wäre auch zweimal falsch noch grün. */
{
  await frisch();

  const gewichtVon = sel => seite.evaluate(s => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).fontWeight : null; }, sel);

  /* Der Dreiklang. «voll» ist eine Zelle mit einem Betrag, «leer» eine ohne.
     Gelesen wird jedes Mal der Datenstand, nicht die Klasse an der Zelle. */
  const dreiklang = async (voll, leer) => {
    const vorV = await hakenLesen(voll.id, voll.m);
    await rklick(voll.sel);
    const einmal = await hakenLesen(voll.id, voll.m);
    const gewichtAn = await gewichtVon(voll.sel);
    await rklick(voll.sel);
    const zweimal = await hakenLesen(voll.id, voll.m);
    const gewichtAus = await gewichtVon(voll.sel);
    const vorL = await hakenLesen(leer.id, leer.m);
    await rklick(leer.sel);
    const nachL = await hakenLesen(leer.id, leer.m);
    return { setztSofort: einmal === !vorV,
      nimmtZurueck: zweimal === vorV,
      leerBleibtLeer: vorL === false && nachL === false,
      gewichtKippt: gewichtAn !== null && gewichtAn !== gewichtAus };
  };
  const richtig = { setztSofort: true, nimmtZurueck: true,
    leerBleibtLeer: true, gewichtKippt: true };

  /* --- Ende eins: das Budget ------------------------------------------- */
  const blk = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(blk.id);
  const pos = await posLesen(JAHR, 'Fixkosten', 'Bahnabo');
  const ein = await blockLesen(JAHR, 'Einkommen');
  await oeffne(ein.id);
  const leerPos = await posLesen(JAHR, 'Einkommen', 'Zulagen');
  const bVollM = pos.reihe.findIndex(v => v !== 0);
  const bLeerM = leerPos.reihe.indexOf(0);
  pruef('Voraussetzung Budget: eine gefüllte und eine leere Zelle sind da',
    bVollM >= 0 && bLeerM >= 0, 'voll m=' + bVollM + ', leer m=' + bLeerM);
  const imBudget = await dreiklang(
    { id: pos.id, m: bVollM,
      sel: '.zelle[data-z="' + pos.id + '"][data-m="' + bVollM + '"]' },
    { id: leerPos.id, m: bLeerM,
      sel: '.zelle[data-z="' + leerPos.id + '"][data-m="' + bLeerM + '"]' });
  gleich('im Budget: der Rechtsklick tut, was er soll',
    JSON.stringify(imBudget), JSON.stringify(richtig));

  /* --- Ende zwei: die Rechnungen ---------------------------------------
     Der Prüfstand baut sich seine Rechnungen selbst. Die erste trägt in zwei
     Monaten einen Wert, die übrigen zehn bleiben leer — damit liegt beides
     bereit, die gefüllte Zelle und die leere, und die Zahl der abzuhakenden
     Monate ist bekannt, ohne sie irgendwo abzulesen. Die zweite Rechnung steht
     als Gegenprobe daneben: sie darf von allem, was der ersten geschieht,
     nichts abbekommen. */
  await klick('[data-geh-ansicht="rechnung"]');
  await klick('[data-neu-steller]');
  const sid = await seite.evaluate(j => { const L = S.rechnungen[j] || [];
    return L.length ? L[L.length - 1].id : null; }, JAHR);
  await tippe('.namensfeld[data-s="' + sid + '"]', 'Zweiter Prüfsteller');
  const letzteRechnung = () => seite.evaluate(([j, i]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === i);
    return g.rechnungen.length ? g.rechnungen[g.rechnungen.length - 1].id : null; }, [JAHR, sid]);
  await klick('tr.kat[data-k="' + sid + '"] [data-neu-rech]');
  const rid = await letzteRechnung();
  await klick('tr.kat[data-k="' + sid + '"] [data-neu-rech]');
  const rid2 = await letzteRechnung();
  pruef('Voraussetzung: zwei verschiedene Rechnungen stehen bereit',
    rid !== null && rid2 !== null && rid !== rid2, rid + ' / ' + rid2);

  const zelleVon = (id, m) => '.zelle[data-rm="' + id + '"][data-m="' + m + '"]';
  const rZelle = m => zelleVon(rid, m);
  const rLesen = id => seite.evaluate(([j, i]) => { let o = null;
    (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(r => {
      if (r.id === i) o = { stand: r.stand, reihe: r.reihe.slice() }; }));
    return o; }, [JAHR, id]);
  const rStand = async () => (await rLesen(rid)).stand;

  const rVollM = 4, rZweitM = 7, rLeerM = 1;
  await tippe(rZelle(rVollM), 300);
  await tippe(rZelle(rZweitM), 200);
  await tippe(zelleVon(rid2, rVollM), 150);
  const gebaut = await rLesen(rid);
  pruef('Voraussetzung Rechnungen: genau zwei Monate tragen einen Wert',
    gebaut.reihe.filter(v => v !== 0).length === 2 && gebaut.reihe[rLeerM] === 0
    && gebaut.stand === 'Offen',
    gebaut.reihe.filter(v => v !== 0).length + ' Monate, Stand ' + gebaut.stand);

  const inRechnungen = await dreiklang(
    { id: rid, m: rVollM, sel: rZelle(rVollM) },
    { id: rid, m: rLeerM, sel: rZelle(rLeerM) });
  gleich('in den Rechnungen: der Rechtsklick tut, was er soll',
    JSON.stringify(inRechnungen), JSON.stringify(richtig));
  gleich('und er tut in beiden Ansichten dasselbe',
    JSON.stringify(inRechnungen), JSON.stringify(imBudget));

  /* Auch hier gehört der linke Klick dem Eingeben — dieselbe Gegenprobe wie
     im Budget, damit die Regel nicht nur an einem Ende gilt. */
  const vorLinks = await hakenLesen(rid, rVollM);
  await seite.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await klick(rZelle(rVollM));
  await spaeter(rZelle(rVollM));
  const nachLinks = await hakenLesen(rid, rVollM);
  const fokusR = await fokusLesen();
  pruef('auch in den Rechnungen setzt kein linker Klick eine Marke',
    nachLinks === vorLinks, nachLinks);
  pruef('er setzt dort ebenso nur den Cursor',
    fokusR.rm === rid && fokusR.m === String(rVollM),
    fokusR.rm + ' m=' + fokusR.m);

  /* Die Eigenheit der Rechnungen, und nur dort: sind nach dem Haken ALLE
     Monate mit einem Wert abgehakt, springt der Stand auf «Bezahlt»; wird
     einer zurückgenommen, fällt er auf «Offen». Wie viele Monate das sind,
     kommt aus der eben gebauten Rechnung, nicht aus einer Annahme. */
  gleich('Ausgangslage: die Rechnung steht auf «Offen»', await rStand(), 'Offen');
  await rklick(rZelle(rVollM));
  pruef('der erste von zwei Monaten ist abgehakt — der Stand bleibt «Offen»',
    (await hakenLesen(rid, rVollM)) === true && (await rStand()) === 'Offen',
    await rStand());
  await rklick(rZelle(rZweitM));
  gleich('mit dem letzten Monat springt der Stand auf «Bezahlt»',
    await rStand(), 'Bezahlt');
  const beideAn = (await hakenLesen(rid, rVollM)) && (await hakenLesen(rid, rZweitM));
  pruef('und beide Monatsmarken stehen dabei', beideAn === true, beideAn);

  /* Die Gegenprobe zum Sprung: er gilt dieser einen Rechnung. Die zweite trägt
     im selben Monat einen Wert und steht beim selben Steller — sie darf weder
     eine Marke noch einen anderen Stand bekommen. Sonst wäre «springt auf
     Bezahlt» keine Eigenheit einer Rechnung, sondern etwas, das um sich greift. */
  const nachbar = await rLesen(rid2);
  pruef('die zweite Rechnung bleibt davon unberührt',
    nachbar.stand === 'Offen' && (await hakenLesen(rid2, rVollM)) === false,
    nachbar.stand + ', Marke ' + (await hakenLesen(rid2, rVollM)));

  await rklick(rZelle(rZweitM));
  pruef('einen Monat zurückgenommen — der Stand fällt auf «Offen»',
    (await rStand()) === 'Offen' && (await hakenLesen(rid, rZweitM)) === false
    && (await hakenLesen(rid, rVollM)) === true,
    (await rStand()) + ', Marken ' + (await hakenLesen(rid, rVollM))
      + '/' + (await hakenLesen(rid, rZweitM)));

  /* Und die leere Zelle rührt in den Rechnungen auch den Stand nicht an —
     nicht nur die Marke. */
  const standVorLeer = await rStand();
  await rklick(rZelle(rLeerM));
  pruef('eine leere Rechnungszelle lässt Marke und Stand unberührt',
    (await hakenLesen(rid, rLeerM)) === false && (await rStand()) === standVorLeer,
    (await rStand()) + ', Marke ' + (await hakenLesen(rid, rLeerM)));

  /* Der umgekehrte Weg, den es nur in den Rechnungen gibt: eine als Ganzes auf
     «Bezahlt» gemeldete Rechnung gilt in jedem ihrer Monate als abgehakt, ohne
     dass eine Marke gesetzt wäre. Ein Rechtsklick öffnet dann genau diesen
     einen Monat wieder, schreibt die übrigen fest und lässt den Stand fallen. */
  await rklick(rZelle(rVollM));
  gleich('Zwischenstand: keine Marke mehr, Stand «Offen»',
    (await hakenLesen(rid, rVollM)) + '/' + (await hakenLesen(rid, rZweitM))
      + '/' + (await rStand()), 'false/false/Offen');
  await seite.selectOption('select.standwahl[data-r="' + rid + '"]', 'Bezahlt');
  await ruhe();
  gleich('die Rechnung als Ganzes auf «Bezahlt» stellen', await rStand(), 'Bezahlt');
  await rklick(rZelle(rZweitM));
  pruef('der Rechtsklick öffnet diesen einen Monat wieder',
    (await hakenLesen(rid, rZweitM)) === false, await hakenLesen(rid, rZweitM));
  pruef('er schreibt die übrigen Monate als abgehakt fest',
    (await hakenLesen(rid, rVollM)) === true, await hakenLesen(rid, rVollM));
  gleich('und der Stand fällt auf «Offen»', await rStand(), 'Offen');

  /* Aufräumen: der Prüfstand nimmt zurück, was er gebaut hat. Der nächste
     Abschnitt fängt zwar mit frisch() an — aber ein Abschnitt, der seinen
     eigenen Bau stehen lässt, verdeckt einen Fehler beim Löschen. */
  await klick('[data-weg-steller="' + sid + '"]');
  pruef('der gebaute Steller ist wieder weg',
    (await seite.evaluate(([j, i]) => (S.rechnungen[j] || []).some(g => g.id === i),
      [JAHR, sid])) === false);
}

/* ============================================================== 4. Tastatur
   z und n waren bis zum Umbau Knöpfe. Sie dürfen nicht wirken, während in
   einem Feld getippt wird — sonst klappte «z» die Tabelle zu, statt ein z zu
   schreiben. */
{
  await frisch();
  await klick('#fusszeile');                    /* Fokus weg von jedem Feld */
  const aufVor = await seite.evaluate(() => S.auf.length);
  await taste('z');
  const aufNach = await seite.evaluate(() => S.auf.length);
  const zeilenAuf = await seite.evaluate(() => document.querySelectorAll('tr.pos').length);
  pruef('z klappt auf — die Positionszeilen stehen da',
    aufVor === 0 && aufNach > 0 && zeilenAuf > 0,
    aufVor + ' → ' + aufNach + ' Sektionen, ' + zeilenAuf + ' Zeilen');
  await taste('z');
  pruef('z klappt wieder zu',
    (await seite.evaluate(() => S.auf.length)) === 0
    && (await seite.evaluate(() => document.querySelectorAll('tr.pos').length)) === 0);

  const nullenVor = await seite.evaluate(() =>
    Array.from(document.querySelectorAll('td.c-mon')).filter(x => x.textContent.trim() === '0').length);
  await taste('n');
  const nullenNach = await seite.evaluate(() =>
    Array.from(document.querySelectorAll('td.c-mon')).filter(x => x.textContent.trim() === '0').length);
  pruef('n zeigt die Nullen — vorher stand keine da, jetzt stehen welche',
    nullenVor === 0 && nullenNach > 0, nullenVor + ' → ' + nullenNach);
  await taste('n');
  gleich('n blendet die Nullen wieder aus', await seite.evaluate(() =>
    Array.from(document.querySelectorAll('td.c-mon')).filter(x => x.textContent.trim() === '0').length), 0);

  /* Dieselben Tasten in einem Feld: sie gehören dort dem Feld. */
  const blk = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(blk.id);
  const pos = await posLesen(JAHR, 'Fixkosten', 'Bahnabo');
  await klick('.zelle[data-z="' + pos.id + '"][data-m="0"]');
  const vor = await seite.evaluate(() => ({ auf: S.auf.slice(), nullen: S.nullen }));
  await taste('z'); await taste('n');
  const nach = await seite.evaluate(() => ({ auf: S.auf.slice(), nullen: S.nullen }));
  const feld = await fokusLesen();
  pruef('z und n wirken nicht, während in einem Feld getippt wird',
    JSON.stringify(vor.auf) === JSON.stringify(nach.auf) && vor.nullen === nach.nullen,
    JSON.stringify(nach.auf.length) + '/' + nach.nullen);
  pruef('die beiden Zeichen landen stattdessen im Feld',
    String(feld.wert).indexOf('zn') === 0, feld.wert);
}

/* =============================================================== 5. Klappen */
{
  await frisch();
  const blk = await blockLesen(JAHR, 'Fixkosten');
  const zu = await seite.evaluate(i => {
    const tr = document.querySelector('tr.kat[data-k="' + i + '"]');
    const az = tr.querySelector('.anzahl');
    return { chev: tr.querySelector('.chev').textContent,
      anzahl: az ? az.textContent : null,
      zeilen: document.querySelectorAll('tr.pos[data-p="' + i + '"]').length }; }, blk.id);
  gleich('zugeklappt zeigt das Chevron ein Plus', zu.chev, '+');
  gleich('und der Zähler nennt die Zeilen der Sektion', zu.anzahl, String(blk.anzahl));
  gleich('zugeklappt steht keine Positionszeile da', zu.zeilen, 0);

  await oeffne(blk.id);
  const auf = await seite.evaluate(i => {
    const tr = document.querySelector('tr.kat[data-k="' + i + '"]');
    return { chev: tr.querySelector('.chev').textContent,
      anzahl: !!tr.querySelector('.anzahl'),
      zeilen: document.querySelectorAll('tr.pos[data-p="' + i + '"]').length }; }, blk.id);
  gleich('aufgeklappt zeigt das Chevron ein Minus', auf.chev, '−');
  pruef('aufgeklappt steht kein Zähler mehr da', auf.anzahl === false, auf.anzahl);
  gleich('aufgeklappt stehen alle Zeilen der Sektion da', auf.zeilen, blk.anzahl);

  /* Bei den Schulden zählt der Zähler die Gruppen, nicht die Zeilen. */
  const sch = await blockLesen(JAHR, 'Verbindlichkeiten');
  gleich('bei den Schulden zählt der Zähler die Gruppen',
    await seite.evaluate(i => document.querySelector('tr.kat[data-k="' + i + '"] .anzahl').textContent, sch.id),
    String(sch.gruppen.length));
}

/* ================================================================ 6. Zeilen */
{
  await frisch();
  const blk = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(blk.id);

  await klick('tr.kat[data-k="' + blk.id + '"] [data-neu-pos]');
  const nachNeu = await blockLesen(JAHR, 'Fixkosten');
  gleich('eine Zeile anlegen macht die Sektion um eine länger',
    nachNeu.anzahl, blk.anzahl + 1);
  gleich('die neue Zeile heisst «Neue Zeile»', nachNeu.namen[nachNeu.namen.length - 1], 'Neue Zeile');
  const fokusNeu = await fokusLesen();
  pruef('der Cursor steht gleich im Namensfeld der neuen Zeile',
    fokusNeu.klasse.indexOf('namensfeld') === 0, fokusNeu.klasse);

  const frischePos = await posLesen(JAHR, 'Fixkosten', 'Neue Zeile');
  await tippe('.namensfeld[data-p="' + frischePos.id + '"]', 'Prüfzeile');
  const umbenannt = await posLesen(JAHR, 'Fixkosten', 'Prüfzeile');
  pruef('umbenennen trägt den Namen ein', umbenannt !== null && umbenannt.id === frischePos.id,
    umbenannt && umbenannt.name);
  /* Der Verlegenheitsschlüssel («neu17») wird beim Benennen nachgezogen —
     sonst fände dieselbe Zeile über die Jahrgänge nicht zusammen. Geprüft wird
     genau das: vorher ein Verlegenheitsschlüssel, danach keiner mehr. */
  pruef('und zieht den Schlüssel aus dem Namen nach',
    /^neu\d+$/.test(frischePos.key) && !/^neu\d+$/.test(umbenannt.key)
    && umbenannt.key.length > 0,
    frischePos.key + ' → ' + umbenannt.key);

  /* Mit Pfeil rauf am Griff verschieben. Der Griff behält den Fokus, sonst
     liesse sich nicht zweimal hintereinander verschieben. */
  const ordVor = (await blockLesen(JAHR, 'Fixkosten')).namen;
  await seite.focus('[data-griff="' + umbenannt.id + '"]');
  await taste('ArrowUp');
  const ordNach = (await blockLesen(JAHR, 'Fixkosten')).namen;
  const iVor = ordVor.indexOf('Prüfzeile'), iNach = ordNach.indexOf('Prüfzeile');
  pruef('Pfeil rauf am Griff schiebt die Zeile eine Stelle nach oben',
    iNach === iVor - 1, ordVor.join(',') + '  →  ' + ordNach.join(','));
  gleich('der Griff behält danach den Fokus',
    (await fokusLesen()).griff, umbenannt.id);
  await taste('ArrowDown');
  gleich('Pfeil runter bringt sie wieder zurück',
    (await blockLesen(JAHR, 'Fixkosten')).namen.join(','), ordVor.join(','));

  /* Ziehen und ablegen — derselbe Weg mit der Maus.

   NICHT seite.dragAndDrop(): das setzt die Maus in zwei Spruengen und erzeugt
   je nach Seitenaufbau gar keinen Zug — am 23.08.2026 gemessen, nachdem das
   Rollfeld eingebaut war: keine einzige Zugmeldung, weder dragstart noch drop.
   Von Hand gezogen, mit Zwischenschritten, laeuft derselbe Zug in beiden
   Fassungen durch und die Zeile landet, wo sie soll. Das ist die Umgebung des
   Laufs und nicht die Erwartung — geprueft wird unveraendert, ob die Zeile an
   der Zielstelle liegt. */
async function zieheMitDerMaus(quelleSel, zielSel) {
  const mitte = async sel => seite.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, sel);
  const q = await mitte(quelleSel), z = await mitte(zielSel);
  if (!q || !z) return false;
  await seite.mouse.move(q.x, q.y);
  await seite.waitForTimeout(60);
  await seite.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await seite.mouse.move(q.x + (z.x - q.x) * i / 6, q.y + (z.y - q.y) * i / 6);
    await seite.waitForTimeout(30);
  }
  await seite.mouse.up();
  await ruhe();
  return true;
}

/* Ziehen und ablegen — derselbe Weg mit der Maus. */
  const erste = await posLesen(JAHR, 'Fixkosten', ordVor[0]);
  await zieheMitDerMaus('[data-griff="' + umbenannt.id + '"]',
    'tr.pos[data-id="' + erste.id + '"]');
  await ruhe();
  const ordZug = (await blockLesen(JAHR, 'Fixkosten')).namen;
  gleich('am Griff gezogen liegt die Zeile an der Zielstelle', ordZug[0], 'Prüfzeile');

  await klick('[data-weg="' + umbenannt.id + '"]');
  const ordWeg = (await blockLesen(JAHR, 'Fixkosten')).namen;
  pruef('löschen nimmt genau diese Zeile heraus',
    ordWeg.indexOf('Prüfzeile') < 0 && ordWeg.length === blk.anzahl,
    ordWeg.join(','));
}

/* ============================================================ 7. Rechnungen */
{
  await frisch();
  await klick('[data-geh-ansicht="rechnung"]');
  const stellerVor = await seite.evaluate(j => (S.rechnungen[j] || []).length, JAHR);

  await klick('[data-neu-steller]');
  const sid = await seite.evaluate(j => {
    const L = S.rechnungen[j] || []; return L.length ? L[L.length - 1].id : null; }, JAHR);
  gleich('einen Rechnungssteller anlegen',
    await seite.evaluate(j => (S.rechnungen[j] || []).length, JAHR), stellerVor + 1);
  gleich('der neue Steller trägt den Vorschlagsnamen',
    await seite.evaluate(([j, i]) => (S.rechnungen[j] || []).find(g => g.id === i).name, [JAHR, sid]),
    'Neuer Rechnungssteller');

  await tippe('.namensfeld[data-s="' + sid + '"]', 'Prüfsteller');
  gleich('den Steller umbenennen',
    await seite.evaluate(([j, i]) => (S.rechnungen[j] || []).find(g => g.id === i).name, [JAHR, sid]),
    'Prüfsteller');

  await klick('tr.kat[data-k="' + sid + '"] [data-neu-rech]');
  const rid = await seite.evaluate(([j, i]) => {
    const g = (S.rechnungen[j] || []).find(x => x.id === i);
    return g.rechnungen.length ? g.rechnungen[g.rechnungen.length - 1].id : null; }, [JAHR, sid]);
  const rech = () => seite.evaluate(([j, i]) => {
    let o = null; (S.rechnungen[j] || []).forEach(g => (g.rechnungen || []).forEach(r => {
      if (r.id === i) o = { zweck: r.zweck, stand: r.stand, betrag: r.betrag, reihe: r.reihe.slice() }; }));
    return o; }, [JAHR, rid]);
  const r0 = await rech();
  pruef('eine Rechnung anlegen', r0 !== null && r0.zweck === 'Neue Rechnung' && r0.stand === 'Offen',
    JSON.stringify(r0 && { zweck: r0.zweck, stand: r0.stand }));

  /* Stand umschalten — über das Auswahlfeld, so wie er bedient wird. */
  await seite.selectOption('select.standwahl[data-r="' + rid + '"]', 'Bank');
  await ruhe();
  gleich('den Stand über die Auswahl umschalten', (await rech()).stand, 'Bank');

  /* Und über den Rechtsklick auf den Betrag: die ganze Rechnung auf einmal. */
  await tippe('.zelle[data-rm="' + rid + '"][data-m="2"]', '250');
  gleich('ein Monatsbetrag der Rechnung wird übernommen', (await rech()).reihe[2], 250);
  await rklick('.zelle[data-r="' + rid + '"][data-f="betrag"]');
  gleich('Rechtsklick auf den Betrag schaltet die Rechnung auf «Bezahlt»',
    (await rech()).stand, 'Bezahlt');
  await rklick('.zelle[data-r="' + rid + '"][data-f="betrag"]');
  gleich('und wieder zurück auf «Offen»', (await rech()).stand, 'Offen');

  await klick('[data-weg-rech="' + rid + '"]');
  gleich('die Rechnung löschen',
    await seite.evaluate(([j, i]) => (S.rechnungen[j] || []).find(g => g.id === i).rechnungen.length,
      [JAHR, sid]), 0);
  await klick('[data-weg-steller="' + sid + '"]');
  pruef('den Steller löschen',
    (await seite.evaluate(([j, i]) => (S.rechnungen[j] || []).some(g => g.id === i), [JAHR, sid])) === false
    && (await seite.evaluate(j => (S.rechnungen[j] || []).length, JAHR)) === stellerVor);
}

/* ============================================================ 8. Jahrgänge */
{
  await frisch();
  const jahreVor = await seite.evaluate(() => S.jahre.slice());
  gleich('der Vorrat bringt seine Jahrgänge mit', jahreVor.join(','), JAHRE.join(','));

  await klick('[data-neu-jahr]');
  pruef('«Neuer Jahrgang» öffnet sein Fenster', await dialogDa('neu'));
  const vorschlag = await seite.evaluate(() => S.neu.jahr);
  gleich('vorgeschlagen wird der Jahrgang nach dem letzten',
    vorschlag, Math.max.apply(null, jahreVor) + 1);
  await klick('[data-neu-an]');
  const jahreNach = await seite.evaluate(() => S.jahre.slice());
  pruef('anlegen trägt den Jahrgang ein und springt hin',
    jahreNach.length === jahreVor.length + 1 && jahreNach.indexOf(vorschlag) >= 0
    && (await seite.evaluate(() => S.jahr)) === vorschlag,
    jahreNach.join(','));
  gleich('und die Kopfleiste führt ihn als Knopf',
    await seite.evaluate(v => !!document.querySelector('[data-geh-jahr="' + v + '"]'), vorschlag), true);

  await klick('[data-weg-jahr]');
  pruef('«Jahrgang löschen» fragt vorher', await dialogDa('wegJahr'));
  gleich('und nennt im Titel den Jahrgang, um den es geht',
    await seite.evaluate(() => document.querySelector('[data-schleier="wegJahr"] h2').textContent),
    'Jahrgang ' + vorschlag + ' löschen');
  await klick('[data-weg-jahr-an]');
  pruef('löschen nimmt ihn wieder heraus',
    (await seite.evaluate(() => S.jahre.slice())).join(',') === jahreVor.join(','),
    (await seite.evaluate(() => S.jahre.slice())).join(','));

  /* Wechsel zwischen Jahrgang und Ansicht. Der Blatttitel ist die sichtbare
     Antwort darauf, worauf man gerade schaut. */
  await klick('[data-geh-jahr="' + jahreVor[0] + '"]');
  gleich('ein anderer Jahrgang', await titelLesen(), 'Budget ' + jahreVor[0]);
  await klick('[data-geh-ansicht="rechnung"]');
  gleich('die andere Ansicht', await titelLesen(), 'Rechnungen ' + jahreVor[0]);
  await klick('[data-geh-alle]');
  gleich('«Alle Jahre» behält, worauf man schaut', await titelLesen(), 'Alle Jahre · Rechnungen');
  await klick('[data-geh-ansicht="budget"]');
  gleich('und lässt sich dort umschalten', await titelLesen(), 'Alle Jahre');
  await klick('[data-geh-jahr="' + JAHR + '"]');
  gleich('zurück in einen Jahrgang führt in dieselbe Ansicht',
    await titelLesen(), 'Budget ' + JAHR);
}

/* ===================================================== 9. Verteilen (R1/R5)
   Der Befund R1: das Fenster zeigte eine Vorschau und schrieb etwas anderes —
   den zwölffachen Betrag. Deshalb wird hier NICHT das Bild geprüft, sondern
   der Datenstand, und beides gegeneinander gehalten. Alle drei Wege.
   R5: die Basis ist im Fenster eintragbar geworden.

   Gemessen wird an «Steuern» und nicht an einer Rückstellung: die
   Rückstellungen im Vorrat tragen bereits genau die gleichmässige Verteilung
   ihrer Basis. Dort wäre «gleichmässig» eine Bedienung ohne sichtbare Wirkung
   — und eine Prüfung, die nichts unterscheidet, prüft nichts. «Steuern» trägt
   eine Basis von 11000 auf drei belegten Monaten; jeder der drei Wege
   verändert die Zeile erkennbar, und 11000 geht nicht glatt durch zwölf, so
   dass auch das Aufrunden auf volle Zehner mitgemessen wird. */
{
  await frisch();
  const blk = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(blk.id);
  const pos = await posLesen(JAHR, 'Fixkosten', 'Steuern');
  const zelle = 'td.c-basis[data-bs="' + pos.id + '"]';
  const vorschauLesen = () => seite.evaluate(() =>
    Array.from(document.querySelectorAll('.vorschau tbody td')).map(td => td.textContent));
  /* Dieselbe Schreibweise wie im Blatt: Apostroph als Tausendertrenner, «−»
     als Minus, eine Null ist ein Gedankenstrich. So lassen sich Vorschau und
     Datenstand ohne Umweg nebeneinanderlegen. */
  const wieVorschau = r => r.map(v => {
    if (!v) return '—';
    const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return (v < 0 ? '−' : '') + s; });

  await dklick(zelle);
  pruef('Doppelklick auf die Basis öffnet «Verteilen»', await dialogDa('basis'));
  gleich('das Fenster nennt die Zeile',
    await seite.evaluate(() => document.querySelector('[data-schleier="basis"] .dbei').textContent),
    pos.name);

  /* Weg 1 — gleichmässig. Die Regel: Betrag durch zwölf, auf volle Zehner
     AUFgerundet. Sie steht hier als Erwartung, nicht als Abschrift. */
  const je = Math.ceil(Math.abs(pos.basis) / 12 / 10) * 10 * (pos.basis < 0 ? -1 : 1);
  const vorschau1 = await vorschauLesen();
  await klick('[data-basis-tat]');
  const nach1 = await posLesen(JAHR, 'Fixkosten', 'Steuern');
  gleich('«gleichmässig» schreibt in jeden Monat denselben Betrag',
    nach1.reihe.join(','), new Array(12).fill(je).join(','));
  pruef('und zwar den, den die Vorschau gezeigt hat',
    vorschau1.join('|') === wieVorschau(nach1.reihe).join('|'),
    vorschau1.join('|') + '  statt  ' + wieVorschau(nach1.reihe).join('|'));
  /* Der eigentliche Befund R1: die Summe deckt die Basis, sie ist nicht ihr
     Zwölffaches. */
  pruef('die zwölf Monate decken die Basis (aufgerundet), nicht ihr Zwölffaches',
    nach1.reihe.reduce((s, x) => s + x, 0) >= pos.basis
    && nach1.reihe.reduce((s, x) => s + x, 0) < pos.basis + 12 * 10,
    nach1.reihe.reduce((s, x) => s + x, 0) + ' zu Basis ' + pos.basis);

  /* Weg 2 — in jedem Monat der volle Betrag. */
  await dklick(zelle);
  await klick('[data-basis-weg="voll"]');
  const vorschau2 = await vorschauLesen();
  await klick('[data-basis-tat]');
  const nach2 = await posLesen(JAHR, 'Fixkosten', 'Steuern');
  gleich('«voller Betrag» schreibt die Basis in jeden Monat',
    nach2.reihe.join(','), new Array(12).fill(pos.basis).join(','));
  pruef('auch hier steht im Blatt, was die Vorschau gezeigt hat',
    vorschau2.join('|') === wieVorschau(nach2.reihe).join('|'),
    vorschau2.join('|'));

  /* Weg 3 — einmalig im letzten Monat. */
  await dklick(zelle);
  await klick('[data-basis-weg="einmal"]');
  const vorschau3 = await vorschauLesen();
  await klick('[data-basis-tat]');
  const nach3 = await posLesen(JAHR, 'Fixkosten', 'Steuern');
  gleich('«einmalig» schreibt nur in den zwölften Monat',
    nach3.reihe.join(','), new Array(11).fill(0).concat([pos.basis]).join(','));
  pruef('und die Vorschau hat genau das gezeigt',
    vorschau3.join('|') === wieVorschau(nach3.reihe).join('|'),
    vorschau3.join('|'));

  /* R5 — die Basis ist im Fenster eintragbar. Im Blatt bleibt die Zelle
     ausserhalb der Schulden leer; ohne dieses Feld gäbe es keine Stelle mehr,
     an der sich die Basis überhaupt setzen liesse. */
  await dklick(zelle);
  pruef('das Fenster trägt ein Feld für die Basis',
    await seite.evaluate(() => !!document.querySelector('[data-basis-wert]')));
  const neueBasis = 2400;
  await tippe('[data-basis-wert]', String(neueBasis));
  gleich('die eingetragene Basis steht sofort im Datenstand',
    (await posLesen(JAHR, 'Fixkosten', 'Steuern')).basis, neueBasis);
  const jeNeu = Math.ceil(neueBasis / 12 / 10) * 10;
  gleich('und die Vorschau rechnet mit ihr weiter',
    (await vorschauLesen()).join('|'), new Array(12).fill(String(jeNeu)).join('|'));
  await klick('[data-basis-tat]');
  gleich('verteilt wird dann die neue Basis',
    (await posLesen(JAHR, 'Fixkosten', 'Steuern')).reihe.join(','),
    new Array(12).fill(jeNeu).join(','));
}

/* ==================================================== 10. Korrekturen (R2/R3)
   R2: «Übernehmen» trug die neue Zeile nicht ein.
   R3: die Spalte «wirkt auf» einer BESTEHENDEN Zeile sah aus wie der
       Umschalter der neuen Zeile — und löschte, statt umzuschalten. */
{
  await frisch();
  const sch = await blockLesen(JAHR, 'Verbindlichkeiten');
  const grp = sch.gruppen[1];
  const ziel = grp.pos[0];
  await oeffne(sch.id);
  await oeffne(grp.id);

  const stand = () => seite.evaluate(([j, g, p]) => {
    const pos = posVon(j, g, p);
    return { korr: pos.korr ? JSON.parse(JSON.stringify(pos.korr)) : null,
      basis: basisVon(j, g, p, pos.basis) };
  }, [JAHR, grp.key, ziel.key]);

  const vor = await stand();
  pruef('die Schuldzeile trägt noch keine Korrektur', vor.korr === null, JSON.stringify(vor.korr));

  await dklick('td.c-basis[data-kb="' + ziel.id + '"]');
  pruef('Doppelklick auf die Basis öffnet die Korrekturen', await dialogDa('korr'));
  gleich('das Fenster nennt Zeile und Jahrgang',
    await seite.evaluate(() => document.querySelector('[data-schleier="korr"] .dbei').textContent),
    ziel.name + ' · ' + JAHR);

  const betrag = -300;
  await tippe('[data-korr-betrag]', String(betrag));
  await tippe('[data-korr-notiz]', 'Zahlung nachgetragen');
  await klick('[data-korr-an]');
  const nach = await stand();
  pruef('«Übernehmen» trägt die neue Zeile wirklich ein',
    !!nach.korr && (nach.korr.basis || []).length === 1
    && nach.korr.basis[0].betrag === betrag
    && nach.korr.basis[0].notiz === 'Zahlung nachgetragen',
    JSON.stringify(nach.korr));
  gleich('und die Basis ist um genau diesen Betrag verschoben',
    nach.basis, vor.basis + betrag);
  pruef('das Fenster schliesst sich dabei',
    (await seite.evaluate(() => !!S.korr)) === false && (await irgendeinDialog()) === false);

  /* Die bestehende Zeile: «wirkt auf» ist eine Angabe, kein Knopf. */
  await dklick('td.c-basis[data-kb="' + ziel.id + '"]');
  const zeile = await seite.evaluate(() => {
    const z = document.querySelector('.korrzeile:not(.leer)');
    if (!z) return null;
    const w = z.querySelector('.wirkt'), weg = z.querySelector('[data-korr-weg]');
    return { betrag: z.querySelector('.betrag').value, notiz: z.querySelector('.notiz').value,
      wirktTag: w ? w.tagName : null, wirktText: w ? w.textContent : null,
      wegTag: weg ? weg.tagName : null, wegText: weg ? weg.textContent : null }; });
  pruef('die bestehende Zeile steht im Fenster', zeile !== null && zeile.notiz === 'Zahlung nachgetragen',
    JSON.stringify(zeile));
  gleich('«wirkt auf» ist dort kein Knopf mehr, sondern eine Angabe', zeile.wirktTag, 'SPAN');
  gleich('sie nennt, worauf die Korrektur wirkt', zeile.wirktText, 'Basis');
  gleich('gelöscht wird über ein eigenes Zeichen am Rand', zeile.wegText, '×');

  await klick('.korrzeile:not(.leer) .wirkt');
  const nachKlick = await stand();
  pruef('ein Klick auf «wirkt auf» ändert am Datenstand nichts',
    JSON.stringify(nachKlick.korr) === JSON.stringify(nach.korr)
    && (await seite.evaluate(() => !!S.korr)) === true,
    JSON.stringify(nachKlick.korr));

  await klick('[data-korr-weg]');
  const nachWeg = await stand();
  pruef('das × entfernt die Korrektur', nachWeg.korr === null, JSON.stringify(nachWeg.korr));
  gleich('und die Basis steht wieder, wo sie war', nachWeg.basis, vor.basis);
  await taste('Escape');
}

/* ===================================================== 11. Datenkanal (R4)
   R4: «Schliessen» fehlte, und «Trennen» löschte Adresse und Schlüssel beim
   ersten Klick — an genau der Stelle, an der man gewohnheitsmässig abbricht. */
{
  await frisch();
  const konf = () => seite.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('gaepp.tabelle.anbindung') || '{}'); }
    catch (e) { return null; } });

  await klick('[data-sync-auf]');
  pruef('das Dreieck öffnet den Datenkanal', await dialogDa('sync'));
  gleich('links unten steht «Schliessen»',
    await seite.evaluate(() => {
      const k = document.querySelector('[data-schleier="sync"] [data-zu="sync"]');
      return k ? k.textContent.trim() : null; }), 'Schliessen');

  await tippe('[data-sc="repo"]', 'pruef/vorrat');
  await tippe('[data-sc="token"]', 'geheim123');
  const gesetzt = await konf();
  pruef('Adresse und Schlüssel liegen in diesem Browser',
    gesetzt && gesetzt.repo === 'pruef/vorrat' && gesetzt.token === 'geheim123',
    JSON.stringify(gesetzt && { repo: gesetzt.repo, token: gesetzt.token ? '…' : '' }));

  await klick('[data-trennen]');
  const gefragt = await konf();
  gleich('der erste Klick auf «Trennen» fragt nach',
    await seite.evaluate(() => document.querySelector('[data-trennen]').textContent.trim()),
    'Wirklich trennen?');
  pruef('und lässt Adresse und Schlüssel dabei stehen',
    gefragt.repo === 'pruef/vorrat' && gefragt.token === 'geheim123',
    JSON.stringify({ repo: gefragt.repo, token: gefragt.token ? '…' : '' }));

  /* Der zweite Klick muss als eigener Klick ankommen, nicht als zweite Hälfte
     eines Doppelklicks — sonst misst dieser Lauf etwas anderes als ein Mensch. */
  await spaeter('[data-trennen]');
  const getrennt = await konf();
  pruef('erst der zweite Klick löscht beides',
    getrennt.repo === '' && getrennt.token === '',
    JSON.stringify({ repo: getrennt.repo, token: getrennt.token }));
  pruef('das Fenster bleibt offen und meldet, was geschehen ist',
    (await dialogDa('sync')) === true
    && /[Gg]etrennt/.test(await seite.evaluate(() => S.syncText || '')),
    await seite.evaluate(() => S.syncText));

  await klick('[data-zu="sync"]');
  pruef('«Schliessen» schliesst den Kanal',
    (await seite.evaluate(() => S.syncAuf)) === false && (await irgendeinDialog()) === false);
}

/* ================================================================ 12. Escape
   Escape schliesst das oberste Fenster — aus jedem der acht. Jedes wird auf
   dem Weg geöffnet, auf dem es ein Mensch öffnet. */
{
  await frisch();
  const fix = await blockLesen(JAHR, 'Fixkosten');
  await oeffne(fix.id);
  const bahn = await posLesen(JAHR, 'Fixkosten', 'Bahnabo');
  const steuern = await posLesen(JAHR, 'Fixkosten', 'Steuern');
  const sch = await blockLesen(JAHR, 'Verbindlichkeiten');
  await oeffne(sch.id);
  await oeffne(sch.gruppen[1].id);
  const schuldPos = sch.gruppen[1].pos[0];

  const fenster = [
    ['ueb',     'Übertragen',   async () => {
      await seite.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      await dklick('.zelle[data-z="' + bahn.id + '"][data-m="2"]'); }],
    ['neu',     'Neuer Jahrgang', async () => klick('[data-neu-jahr]')],
    ['wegJahr', 'Jahrgang löschen', async () => klick('[data-weg-jahr]')],
    ['exp',     'Sichern',      async () => klick('[data-exp]')],
    ['sync',    'Datenkanal',   async () => klick('[data-sync-auf]')],
    ['korr',    'Korrekturen',  async () => dklick('td.c-basis[data-kb="' + schuldPos.id + '"]')],
    ['basis',   'Verteilen',    async () => dklick('td.c-basis[data-bs="' + steuern.id + '"]')],
    ['hb',      'Handbuch',     async () => klick('[data-hb]')]
  ];
  for (const [name, wort, auf] of fenster) {
    await auf();
    const offen = await dialogDa(name);
    await taste('Escape');
    const zu = await irgendeinDialog();
    pruef('Escape schliesst «' + wort + '»', offen === true && zu === false,
      'offen ' + offen + ', danach noch offen ' + zu);
  }

  /* Der Fokus kehrt an die Ausgangszelle zurück — geprüft am «Übertragen»,
     dem einzigen Fenster, das aus einer Zelle mit Eingabefeld heraus geöffnet
     wird. «Verteilen» und «Korrekturen» gehen von Zellen aus, die im Blatt
     kein Feld tragen (die Basis ist dort Text); dort gibt es keine
     Ausgangszelle, die den Fokus überhaupt nehmen könnte, und die Frage lässt
     sich nicht sauber stellen. */
  await seite.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await dklick('.zelle[data-z="' + bahn.id + '"][data-m="4"]');
  await taste('Escape');
  const zurueck = await fokusLesen();
  pruef('nach Escape steht der Fokus wieder in der Ausgangszelle',
    zurueck.z === bahn.id && zurueck.m === '4',
    zurueck.klasse + ' z=' + zurueck.z + ' m=' + zurueck.m);
}

/* ======================================================= 13. Notausgang (R13)
   Ein Datenstand, der die Anzeige sprengt, darf die App nicht unbedienbar
   zurücklassen. R13: der Notausgang räumte Kopf, Band und Blattkopf nicht —
   über der Fehlermeldung stand weiter der Blatttitel eines Jahrgangs, den man
   gar nicht mehr sehen konnte.

   Die kaputte Datei kommt hier über den echten Weg herein: sie wird als
   gaepp-daten.json ausgeliefert. Sie ist gültiges JSON und übersteht das
   Einlesen — erst das Zeichnen bricht daran ab (eine Korrekturliste, die keine
   Liste ist). Genau dieser Fall gehört dem Notausgang; unlesbares JSON fängt
   schon der Leser ab.

   Dieser Abschnitt steht zuletzt: danach ist die Seite absichtlich tot. */
{
  const kaputt = await seite.evaluate(() => JSON.parse(JSON.stringify(nutzdaten())));
  const jahrTitel = 'Budget ' + JAHR;
  let getroffen = null;
  (kaputt.daten[JAHR] || []).forEach(bl => {
    if (bl.art !== 'schulden') return;
    (bl.gruppen || []).forEach(g => (g.pos || []).forEach(p => {
      if (!getroffen) { getroffen = p.name; p.korr = { basis: 'keine Liste' }; } }));
  });
  pruef('der Prüfstand hat einen Datenstand zum Zerbrechen gebaut', getroffen !== null, getroffen);

  await seite.route('**/gaepp-daten.json', r => r.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify(kaputt) }));
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() =>
    !!document.querySelector('[data-vergiss]') || !!document.querySelector('table'),
    null, { timeout: 8000 });
  await ruhe();

  const not = await seite.evaluate(() => ({
    ueberschrift: (document.querySelector('#blatt h2') || {}).textContent || '',
    laden: !!document.querySelector('[data-laden]'),
    vergiss: !!document.querySelector('[data-vergiss]'),
    leiste: document.getElementById('leiste').textContent.trim(),
    band: document.getElementById('band').innerHTML.trim(),
    blattkopf: document.getElementById('blattkopf').innerHTML.trim(),
    druckkopf: document.getElementById('druckkopf').innerHTML.trim(),
    fusszeile: document.getElementById('fusszeile').innerHTML.trim(),
    dialoge: document.getElementById('dialoge').innerHTML.trim(),
    tabellen: document.querySelectorAll('table').length,
    kopfbereich: ['leiste', 'band', 'blattkopf', 'druckkopf', 'druckfuss', 'fusszeile']
      .map(id => (document.getElementById(id) || {}).textContent || '').join(' ')
  }));

  gleich('bei kaputten Daten steht die Meldung statt der Tabelle',
    not.ueberschrift, 'Dieser Datenstand lässt sich nicht anzeigen.');
  gleich('keine Tabelle mehr', not.tabellen, 0);
  pruef('beide Knöpfe sind da — andere Datei laden und Browserspeicher leeren',
    not.laden && not.vergiss, 'laden ' + not.laden + ', vergiss ' + not.vergiss);
  pruef('über der Meldung steht kein Blatttitel mehr',
    not.kopfbereich.indexOf(jahrTitel) < 0 && not.kopfbereich.indexOf('Rechnungen ' + JAHR) < 0,
    not.kopfbereich.slice(0, 80));
  pruef('Band und Blattkopf sind geräumt',
    not.band === '' && not.blattkopf === '' && not.druckkopf === '' && not.fusszeile === '',
    'band «' + not.band.slice(0, 30) + '» blattkopf «' + not.blattkopf.slice(0, 30) + '»');
  gleich('in der Kopfleiste bleibt nur die Wortmarke', not.leiste, 'GÄPP');
  gleich('offene Fenster sind weg', not.dialoge, '');
  await seite.unroute('**/gaepp-daten.json');
}

/* ====================================================================
   Die Kreuzpeilung (neu am 23.08.2026)
   Albrechts Befund: «Die Zellen haben keine Begrenzungen. Sehr schwer zu
   erkennen, wo faengt eine Zelle an.» Beim Lesen hilft, dass Spaltenkopf und
   Zeilenname heller werden, sobald die Maus auf einer Zahl steht — keine
   Flaeche, keine Linie, nur Text auf Tinte.
   Gemessen wird die gerechnete Farbe, nicht ob eine Klasse gesetzt ist: eine
   gesetzte Klasse, die von einer Regel gleicher Staerke ueberstimmt wird,
   ergaebe eine gruene Pruefung an einer grauen Zahl.
   ==================================================================== */
console.log('\nDie Kreuzpeilung — Spaltenkopf und Zeilenname folgen der Maus');
{
  /* Der Abschnitt davor laesst die Seite im Notausgang zurueck — ohne
     Kopfleiste gibt es nichts anzuklicken. Erst frisch laden. */
  await frisch();
  await seite.keyboard.press('z'); await ruhe();
  const TINTE = '#f2f4f4';
  const hex = () => seite.evaluate(() => {
    const h = e => { if (!e) return null;
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(e).color || '');
      return m ? '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('') : null; };
    const koepfe = [...document.querySelectorAll('#blatt thead tr:first-child th')];
    return { koepfe: koepfe.map(h), gepeilt: document.querySelectorAll('.peil').length,
             namen: [...document.querySelectorAll('#blatt td.c-name')].slice(0,6).map(h) };
  });

  /* Der Zeiger steht nach dem vorigen Abschnitt irgendwo — erst aus dem Blatt
     heraus, sonst peilt schon etwas, bevor der Lauf hinzeigt. */
  await seite.mouse.move(20, 20);
  await seite.waitForTimeout(120);
  const vorher = await hex();
  gleich('vor dem Zeigen ist nichts gepeilt', vorher.gepeilt, 0);

  /* Auf eine gefuellte Monatszelle zeigen — Zeile und Spalte aus dem Blatt
     gelesen, nicht angenommen. */
  const ziel = await seite.evaluate(() => {
    const el = [...document.querySelectorAll('#blatt tr.pos input.zelle[data-z][data-m]')]
      .find(x => x.value !== '');
    if (!el) return null;
    const td = el.closest('td'), tr = td.closest('tr');
    const r = td.getBoundingClientRect();
    return { spalte: [].indexOf.call(tr.children, td),
             x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  pruef('eine gefuellte Monatszelle ist da (Voraussetzung)', !!ziel, ziel);
  if (ziel) {
    await seite.mouse.move(ziel.x, ziel.y);
    await seite.waitForTimeout(120);
    const drauf = await hex();
    gleich('genau zwei Stellen sind gepeilt — ein Spaltenkopf und ein Name', drauf.gepeilt, 2);
    gleich('der Spaltenkopf dieser Spalte steht in Tinte', drauf.koepfe[ziel.spalte], TINTE);
    /* Gegenprobe: die Nachbarspalte bleibt leise. Ohne sie waere die Pruefung
       auch dann gruen, wenn alle Koepfe in Tinte staenden. */
    const nachbar = ziel.spalte + 1 < drauf.koepfe.length ? ziel.spalte + 1 : ziel.spalte - 1;
    pruef('die Nachbarspalte bleibt leise',
      drauf.koepfe[nachbar] !== TINTE, drauf.koepfe[nachbar]);
    pruef('ein Zeilenname steht in Tinte',
      drauf.namen.some(f => f === TINTE), drauf.namen.join(' '));

    /* Die Peilung wandert und bleibt nicht stehen. */
    /* Eine zweite Zelle in einer ANDEREN Spalte — und sie muss im Fenster
       liegen, sonst zeigt die Maus ins Leere und die Peilung bliebe stehen,
       ohne dass die App etwas falsch macht. */
    const zweit = await seite.evaluate((wegVon) => {
      /* Frei liegen heisst: an ihrem Mittelpunkt liegt wirklich sie und nicht
         der klebende Kopf darueber. Das wird nachgesehen und nicht aus
         Koordinaten geschlossen. */
      const frei = td => { const r = td.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
        const t = document.elementFromPoint(x, y);
        return !!t && (t === td || td.contains(t)); };
      const el = [...document.querySelectorAll('#blatt tr.pos input.zelle[data-z][data-m]')]
        .filter(x => x.value !== '')
        .reverse()
        .find(x => [].indexOf.call(x.closest('tr').children, x.closest('td')) !== wegVon
                   && frei(x.closest('td')));
      if (!el) return null;
      const td = el.closest('td'), r = td.getBoundingClientRect();
      return { spalte: [].indexOf.call(td.closest('tr').children, td),
               x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, ziel.spalte);
    pruef('eine zweite, sichtbare Zelle in einer anderen Spalte ist da (Voraussetzung)',
      !!zweit && zweit.spalte !== ziel.spalte, zweit);
    if (zweit) {
      await seite.mouse.move(zweit.x, zweit.y);
      await seite.waitForTimeout(120);
      const gewandert = await hex();
      gleich('nach dem Wechsel sind es weiterhin genau zwei', gewandert.gepeilt, 2);
      gleich('jetzt steht der Kopf der neuen Spalte in Tinte', gewandert.koepfe[zweit.spalte], TINTE);
      pruef('und der Kopf der alten Spalte ist wieder leise',
        gewandert.koepfe[ziel.spalte] !== TINTE, gewandert.koepfe[ziel.spalte]);
    }

    /* Aus dem Blatt heraus — die Peilung erlischt. */
    await seite.mouse.move(20, 20);
    await seite.waitForTimeout(120);
    gleich('ausserhalb des Blattes ist nichts mehr gepeilt', (await hex()).gepeilt, 0);
  }
}

await b.close();
server.close();
ende(fehler);
