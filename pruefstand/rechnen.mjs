/* GAEPP — Pruefstand: der Rechenkern.

   Portiert am 23.08.2026 aus dem Lauf der Vorgaengerfassung. Was er prueft, ist
   dasselbe geblieben; wo der Umbau die Stelle veraendert hat, prueft er das
   Neue an derselben Stelle. Die Streichungen stehen unten je einzeln mit Grund.

   Sechs Abschnitte:
     1. Das Blatt, die zwei Tasten und die Gegenproben
     2. Kennzahlenband — Restschuld heute, Schuldenfrei, Getilgt bisher, Offen
     3. Saldo-Uebertrag ueber alle sechs Jahrgaenge; Vererbung gesperrt;
        «Kein Vortrag heisst kein Eintrag»; ein getippter Anfangsstand wandert
     4. Der Rest bleibt bei null — eine Rate klemmt, eine Korrektur nicht
     5. Verteilen und Aufrunden — drei Wege, Vorschau, Basis im Fenster
     6. Manuelle Saldokorrekturen — eintragen, anzeigen, aendern, entfernen,
        Warnung mit ihren drei Antworten, in Einzahl und in Mehrzahl

   WOHER DIE ERWARTUNGSWERTE KOMMEN. Nicht aus einem Lauf dieser App und nicht
   von Hand abgeschrieben. Der Vorrat exportiert kein ERWARTET mehr; dieser Lauf
   rechnet jede erwartete Zahl selbst aus `daten()` aus — nach dem Rechenweg,
   den der Quelltext ueber `basisVon()` als Regel hinschreibt:

     basis(J) = (geerbt ? rest(J-1) : eigener Anfangsstand) + Summe korr.basis(J)
     rest(J)  = max(0, basis(J) − Summe Raten(J))          + Summe korr.rest(J)

   dazu die beiden Kanten, die der Quelltext daneben nennt: Raten klemmen bei
   null, Korrekturen klemmen nicht — und ein Jahrgang, der die Schuld nur dem
   Namen nach fuehrt, ist durchlaessig. Die Nachrechnung unten steht deshalb
   fuer sich; sie liest nichts aus der laufenden App. Was der Lauf selbst an
   Werten setzt (getippte Raten, eingetragene Korrekturen), fuehrt er in einem
   eigenen Merkzettel mit — sonst waere die Erwartung nach dem ersten Klick
   nicht mehr hergeleitet, sondern geraten.

   WAS GESTRICHEN IST — mit Grund, nicht stillschweigend:

   a) «Punkt neben dem Glaeubiger erscheint». Der Punkt war eine Farbflaeche
      (`.mkorr`, `background: var(--merk)`). Die Akzentfarben sind im Umbau
      ersatzlos gestrichen; `--merk` gibt es nicht mehr. An derselben Stelle
      steht jetzt das Wort «korrigiert» (`.korrmarke`) — Rang aus Schrift statt
      aus Farbe. Der Lauf prueft das Wort, nicht mehr den Punkt.
   b) «Basis vor dem Verteilen» aus der Blattzelle gelesen. Ausserhalb der
      Schulden ist `td[data-bs]` jetzt absichtlich leer — die Basis ist dort
      eine Referenzzahl und kein Anfangsstand. Gelesen wird sie im Fenster
      (`[data-basis-wert]`); dass die Zelle leer und trotzdem doppelklickbar
      ist, ist eine eigene Pruefung geworden.
   c) `[data-korr-richt="minus"]`. Den Richtungsschalter gibt es nicht mehr;
      das Vorzeichen steht im Betrag. Reduzieren heisst jetzt: Minus tippen.
   d) `.leerzeile` («Noch keine Korrektur an dieser Zahl.»). Die Liste traegt
      jetzt immer eine leere Eingabezeile `.korrzeile.leer`; gezaehlt wird
      darum `:not(.leer)`, und dass die leere Zeile da ist, ist Gegenprobe.
   e) `[data-basis-tat="uebertragen"]` und `="verteilen"` als zwei Knoepfe.
      Es gibt jetzt drei Wege zur Wahl (gleich, voll, einmal) und einen Knopf,
      der den gewaehlten traegt. Alle drei werden geprueft, nicht nur zwei.
   f) Die Knoepfe `[data-nullen]` und `[data-alle-um]`. In der laufenden App
      gibt es sie nicht mehr — `[data-alle-um]` lebt nur noch im HTML-Export.
      Ihre Arbeit tun die Tasten `n` und `z`. Dass die Blattlegende genau diese
      zwei Tasten nennt, ist eine neue Pruefung.

   WAS BEIM PORTIEREN AUFGEFALLEN IST — festgehalten, nicht geglaettet:

   Das Feld `verteilen`, das der Quelltext an zwei Stellen aus
   `istRueckstellung()` fuellt (in `bau()` an jeder freien Zeile und beim
   Oeffnen des Verteilfensters), wird nirgends gelesen. Der Kommentar bei
   `istRueckstellung` sagt, der Vorschlag im Fenster haenge daran; gemessen
   haengt er an nichts — voreingestellt ist immer «gleich». Der Lauf prueft
   deshalb das Gebaute und haelt den Befund an der Messstelle fest, statt eine
   Erwartung aus einem Kommentar zu bauen, den der Umbau abgeloest hat.

   Port 8741. Fahren:  node rechnen.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { daten, STICHJAHR, STICHM, JAHRE } from './vorrat.mjs';

const PORT = 8741;
const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);
const { pruef, gleich, ende } = bilanzbuch('rechnen');

/* =========================================================== Nachrechnung ==
   Der Vorrat, wie er vom Server ausgeliefert wird — eine eigene Kopie. Der
   Lauf aendert daran dieselben Werte, die er in der App aendert; danach
   stimmen Erwartung und Anzeige wieder ueberein, ohne dass eine Zahl aus der
   App abgeschrieben waere. */
let V, KORR;
function vorratZuruecksetzen() { V = daten(); KORR = {}; }
vorratZuruecksetzen();

const su = r => (r || []).reduce((s, x) => s + (x || 0), 0);
const vorjahr = j => { const k = JAHRE.filter(x => x < j); return k.length ? Math.max(...k) : null; };
const schuldBlock = j => (V.daten[j] || []).find(x => x.art === 'schulden');
/* Alle Schulden eines Jahrgangs, in der Reihenfolge des Blatts. */
function schulden(j) {
  const blk = schuldBlock(j); if (!blk) return [];
  const out = [];
  (blk.gruppen || []).forEach(g => (g.pos || []).forEach(p =>
    out.push({ gKey: g.key, pKey: p.key, gName: g.name, name: p.name })));
  return out;
}
const posVon = (j, g, p) => {
  const blk = schuldBlock(j); if (!blk) return null;
  const gr = (blk.gruppen || []).find(x => x.key === g); if (!gr) return null;
  return (gr.pos || []).find(x => x.key === p) || null;
};

/* Der Merkzettel fuer alles, was dieser Lauf selbst an Korrekturen eintraegt.
   Er haelt Betraege, keine Anzeigewerte — die Anzeige ist das, was geprueft
   wird, und darf darum nicht die Quelle der Erwartung sein. */
const kSchl = (j, g, p) => j + '|' + g + '|' + p;
function kListe(j, g, p, art) {
  const s = kSchl(j, g, p);
  if (!KORR[s]) KORR[s] = { basis: [], rest: [] };
  return KORR[s][art];
}
const kSum = (j, g, p, art) => su(kListe(j, g, p, art));
/* Die Antwort «Folgejahr ueberschreiben» raeumt in ALLEN spaeteren Jahrgaengen
   die Basiskorrekturen weg — der Merkzettel muss dasselbe tun. */
function kBasisWegAb(j, g, p) {
  JAHRE.filter(x => x > j).forEach(x => { kListe(x, g, p, 'basis').length = 0; });
}

/* Raten klemmen bei null. Eine Basis, die schon im Minus steht, bleibt dort —
   eine Rate darf einen Befund nicht wegrechnen. Eine negative Rate laesst die
   Schuld wachsen. */
const nachRaten = (basis, raten) => {
  if (raten < 0) return basis - raten;
  return basis <= 0 ? basis : Math.max(0, basis - raten);
};
const raten = (j, g, p) => { const x = posVon(j, g, p); return x ? su(x.reihe) : 0; };

function basisE(j, g, p) {
  const me = posVon(j, g, p); if (!me) return 0;
  const selbst = () => (me.basis || 0) + kSum(j, g, p, 'basis');
  const v = vorjahr(j);
  if (v === null) return selbst();
  const vp = posVon(v, g, p);
  if (!vp) return selbst();
  const vb = basisE(v, g, p);
  /* Durchlaessig: kein Anfangsstand, keine Rate, keine Restkorrektur. */
  if (vb === 0 && raten(v, g, p) === 0 && kSum(v, g, p, 'rest') === 0) return selbst();
  return nachRaten(vb, raten(v, g, p)) + kSum(v, g, p, 'rest') + kSum(j, g, p, 'basis');
}
const restE = (j, g, p) => nachRaten(basisE(j, g, p), raten(j, g, p)) + kSum(j, g, p, 'rest');
function geerbtE(j, g, p) {
  const v = vorjahr(j); if (v === null) return false;
  if (!posVon(v, g, p)) return false;
  return basisE(v, g, p) !== 0 || raten(v, g, p) !== 0 || kSum(v, g, p, 'rest') !== 0;
}

/* Die vier Kennzahlen, aus demselben Vorrat hergeleitet. */
const hakenAn = (id, m) => !!V.haken[id + ':' + m];
function kennzahlenE() {
  const hj = STICHJAHR, hm = STICHM;
  const standHeute = (g, p) => {
    const x = posVon(hj, g, p); if (!x) return 0;
    return nachRaten(basisE(hj, g, p), su((x.reihe || []).slice(0, hm + 1)))
      + (hm === 11 ? kSum(hj, g, p, 'rest') : 0);
  };
  let rest = 0;
  schulden(hj).forEach(s => { rest += standHeute(s.gKey, s.pKey); });

  /* Anfangsstand: jede Schuld mit dem Stand ihres EIGENEN ersten Jahres. */
  let anfang = 0, erstJahr = null;
  schulden(hj).forEach(s => {
    for (const j of JAHRE) {
      if (j > hj) break;
      if (!posVon(j, s.gKey, s.pKey) || geerbtE(j, s.gKey, s.pKey)) continue;
      const a = basisE(j, s.gKey, s.pKey);
      if (a === 0) continue;
      anfang += a;
      if (erstJahr === null || j < erstJahr) erstJahr = j;
      break;
    }
  });

  /* Offen im Stichmonat: alles auf der Ausgabenseite ohne Haken, dazu jede
     Rechnung, die weder «Bezahlt» noch abgehakt ist. */
  let offen = 0;
  (V.daten[hj] || []).forEach(bl => {
    if (bl.vz === 1) return;
    const liste = bl.art === 'schulden'
      ? (bl.gruppen || []).reduce((a, g) => a.concat(g.pos || []), []) : (bl.pos || []);
    liste.forEach(p => { const w = (p.reihe || [])[hm];
      if (w !== 0 && !hakenAn(p.id, hm)) offen += w; });
  });
  (V.rechnungen[hj] || []).forEach(g => (g.rechnungen || []).forEach(r => {
    if (r.stand !== 'Bezahlt' && !hakenAn(r.id, hm)) offen += (r.reihe || [])[hm] || 0; }));

  const getilgt = anfang - rest;
  return { rest, anfang, getilgt, erstJahr, offen,
    quote: anfang ? Math.round(getilgt / anfang * 100) : 0 };
}

/* Verteilen: Betrag durch zwoelf, auf volle Zehner AUFgerundet, nie ab. */
const RUNDE = 10;
const proMonat = w => Math.ceil(Math.abs(w) / 12 / RUNDE) * RUNDE * (w < 0 ? -1 : 1);
const wegeE = w => ({
  gleich: new Array(12).fill(proMonat(w)),
  voll:   new Array(12).fill(w),
  einmal: new Array(11).fill(0).concat([w])
});

/* ================================================================ Werkzeug */

const ruhe = () => bisRuhe(seite);
const MK = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const ML = ['Januar','Februar','März','April','Mai','Juni','Juli','August',
            'September','Oktober','November','Dezember'];

/* Betraege stehen mit Apostroph als Tausendertrennung und U+2212 als Minus. */
function lies(txt) {
  if (txt == null) return null;
  const s = String(txt).trim().replace(/['’\s]/g, '').replace(/−/g, '-');
  if (s === '' || s === '—') return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

const zaehl = w => seite.evaluate(s => document.querySelectorAll(s).length, w);
const text  = w => seite.evaluate(s => { const e = document.querySelector(s);
  return e ? (e.textContent || '').trim() : null; }, w);

async function klick(w) { await seite.click(w); await ruhe(); }
async function dklick(w) { await seite.dblclick(w); await ruhe(); }
async function tippe(w, wert) {
  await seite.fill(w, String(wert));
  await seite.dispatchEvent(w, 'change');
  await ruhe();
}
async function taste(k) { await seite.keyboard.press(k); await ruhe(); }

/* Jeder Abschnitt faengt hier an: Browserspeicher leeren, neu laden, Nullen
   zeigen, alles aufklappen — und den Merkzettel derselben Lage zuruecksetzen.
   Ohne das leere Fenster wuerde ein Abschnitt auf den Aenderungen des
   vorigen rechnen, und die Erwartung waere nicht mehr herleitbar. */
async function frisch() {
  await seite.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true,
    null, { timeout: 8000 });
  await ruhe();
  vorratZuruecksetzen();
  /* Die Tasten wirken nur ausserhalb eines Eingabefelds — darum vorher auf den
     Blatttitel klicken, der keines ist. */
  await seite.click('.titel');
  if (!(await seite.evaluate(() => S.nullen))) await taste('n');
  for (let i = 0; i < 3; i++) {
    if (await zaehl('tr.pos')) break;
    await seite.click('.titel'); await taste('z'); await seite.waitForTimeout(250);
  }
}

const gehJahr = async j => { await klick('[data-geh-jahr="' + j + '"]'); };

/* Die Zeile einer Position, gefunden ueber ihren angezeigten Namen — nicht
   ueber eine mitgezaehlte Id. Mehr oder weniger als ein Treffer zaehlt als
   nicht gefunden: die Gegenprobe, dass ueberhaupt eine Zeile da ist, bevor an
   ihr geprueft wird. */
const findeId = name => seite.evaluate(n => {
  const t = Array.from(document.querySelectorAll('#blatt input.namensfeld'))
    .filter(e => e.value === n);
  if (t.length !== 1) return null;
  const tr = t[0].closest('tr[data-id]');
  return tr ? tr.getAttribute('data-id') : null;
}, name);
async function id(jahr, name) {
  await gehJahr(jahr);
  const x = await findeId(name);
  pruef('Zeile gefunden: «' + name + '» ' + jahr, x !== null, x);
  return x;
}

/* Text einer Zelle — ob sie ein Eingabefeld traegt oder nur Text, ist ihr egal. */
const zelle = w => seite.evaluate(s => {
  const e = document.querySelector(s);
  if (!e) return null;
  const f = e.matches('input,select') ? e : e.querySelector('input,select');
  return f ? f.value : e.textContent.trim();
}, w);
const hatFeld = w => seite.evaluate(s => !!document.querySelector(s + ' input'), w);
const monat = (pid, m) => zelle('input.zelle[data-z="' + pid + '"][data-m="' + m + '"]');
const monate = pid => seite.evaluate(i =>
  Array.from(document.querySelectorAll('input.zelle[data-z="' + i + '"]')).map(e => e.value), pid);
const jahrwert = pid => zelle('tr[data-id="' + pid + '"] td.c-jahr');
const basisZelle = pid => zelle('td[data-kb="' + pid + '"]');
const restZelle  = pid => zelle('td[data-kr="' + pid + '"]');
/* Das Wort «korrigiert» neben dem Glaeubiger — Nachfolger des Farbpunkts. */
const marke = pid => text('tr[data-id="' + pid + '"] .korrmarke');

/* ---- Korrekturfenster ---------------------------------------------------- */
const korrAufBasis = pid => dklick('td[data-kb="' + pid + '"]');
const korrAufRest  = pid => dklick('td[data-kr="' + pid + '"]');
const korrZu       = () => klick('[data-zu="korr"]');
const warnungOffen = async () => (await zaehl('[data-schleier="korrWarn"]')) === 1;
const korrZeilen   = () => zaehl('.korrliste .korrzeile:not(.leer)');
const korrListe    = () => seite.evaluate(() =>
  Array.from(document.querySelectorAll('.korrliste .korrzeile:not(.leer)')).map(z => ({
    eid: z.querySelector('[data-korr-b]').getAttribute('data-korr-b'),
    betrag: z.querySelector('[data-korr-b]').value,
    notiz: z.querySelector('[data-korr-n]').value,
    wirkt: z.querySelector('.wirkt').textContent.trim(),
    weg: !!z.querySelector('[data-korr-weg]') })));
/* Der Fuss des Fensters zeigt Basis und Rest ein zweites Mal. Zwei Anzeigen
   derselben Zahl duerfen nicht auseinanderlaufen — darum wird er mitgelesen. */
const korrFuss = () => seite.evaluate(() => {
  const e = document.querySelector('.korrfuss .ergebnis'); if (!e) return null;
  const b = e.querySelectorAll('b');
  return b.length === 2 ? { basis: b[0].textContent, rest: b[1].textContent } : null;
});
async function korrEintragen(betrag, notiz) {
  await tippe('[data-korr-betrag]', betrag);
  if (notiz !== undefined) await tippe('[data-korr-notiz]', notiz);
  await klick('[data-korr-add]');
}

/* ---- Verteilfenster ------------------------------------------------------ */
const basisFenster = () => seite.evaluate(() => {
  const d = document.querySelector('[data-schleier="basis"]'); if (!d) return null;
  return {
    wert: d.querySelector('[data-basis-wert]').value,
    gewaehlt: (d.querySelector('[data-basis-weg].an') || {}).dataset
      ? d.querySelector('[data-basis-weg].an').dataset.basisWeg : null,
    wege: Array.from(d.querySelectorAll('[data-basis-weg]')).map(x => x.dataset.basisWeg),
    tat: d.querySelector('[data-basis-tat]').dataset.basisTat,
    vorschau: Array.from(d.querySelectorAll('.vorschau tbody td')).map(x => x.textContent.trim())
  };
});

/* ============================================================== 1. Ruestzeug */
console.log('\n1. Das Blatt, die zwei Tasten und die Gegenproben');

await frisch();

const posZeilen = await zaehl('#blatt tr.pos');
pruef('das Blatt traegt Positionszeilen (Gegenprobe fuer alles Folgende)',
  posZeilen > 0, posZeilen);
const kbZellen = await zaehl('#blatt td[data-kb]');
const bsZellen = await zaehl('#blatt td[data-bs]');
pruef('es gibt ueberhaupt Basiszellen an Schulden (Gegenprobe)', kbZellen > 0, kbZellen);
pruef('es gibt ueberhaupt Basiszellen ausserhalb der Schulden (Gegenprobe)',
  bsZellen > 0, bsZellen);
gleich('so viele Schuldzeilen wie der Vorrat fuehrt', kbZellen, schulden(STICHJAHR).length);
gleich('so viele Rest-Zellen wie Basis-Zellen', await zaehl('#blatt td[data-kr]'), kbZellen);

/* Die beiden Knoepfe von frueher sind weg — an ihrer Stelle stehen zwei Tasten,
   und die Legende sagt es. Gemessen wird der Text, nicht das Vorhandensein
   einer Regel im Blatt. */
gleich('der Knopf «alles zuklappen» ist aus der laufenden App verschwunden',
  await zaehl('[data-alle-um]'), 0);
gleich('der Knopf «Nullen» ist aus der laufenden App verschwunden',
  await zaehl('[data-nullen]'), 0);
const legende = await text('.kopf3 .legende');
pruef('die Blattlegende nennt beide Tasten', legende !== null
  && /z\s+klappt\s+zu/.test(legende) && /n\s+zeigt\s+die\s+Nullen/.test(legende), legende);

/* «n» schaltet die Nullen — gemessen an einer Zelle, die null traegt. Zulagen
   sind ausserhalb des Februars ohne Wert; genau dafuer steht die Zeile im
   Vorrat. */
const pidZulagen = await id(STICHJAHR, 'Zulagen');
if (pidZulagen) {
  gleich('Zulagen im Januar mit gezeigten Nullen', await monat(pidZulagen, 0), '0');
  await seite.click('.titel'); await taste('n');
  gleich('nach «n» ist dieselbe Zelle leer', await monat(pidZulagen, 0), '');
  await seite.click('.titel'); await taste('n');
  gleich('nach «n» steht die Null wieder da', await monat(pidZulagen, 0), '0');
}
/* «z» klappt zu und wieder auf. Gemessen wird, dass die Positionszeilen
   verschwinden und zurueckkommen — nicht, dass ein Zustandsfeld sich aendert. */
await seite.click('.titel'); await taste('z'); await seite.waitForTimeout(250);
gleich('nach «z» ist keine Positionszeile mehr da', await zaehl('tr.pos'), 0);
await seite.click('.titel'); await taste('z'); await seite.waitForTimeout(250);
gleich('nach «z» stehen wieder alle Positionszeilen', await zaehl('tr.pos'), posZeilen);

/* ======================================================= 2. Kennzahlenband */
console.log('\n2. Kennzahlenband (Stichmonat aus dem Vorrat, vor jeder Aenderung)');

const K = kennzahlenE();
gleich('das Kennzahlenband zeigt vier Kacheln', await zaehl('.band > span'), 4);
const kachel = lbl => seite.evaluate(l => {
  const s = Array.from(document.querySelectorAll('.band > span'))
    .find(x => x.querySelector('.k') && x.querySelector('.k').textContent.trim() === l);
  return s ? { v: s.querySelector('.v').textContent.trim(),
               m: s.querySelector('.m').textContent.trim(),
               t: s.getAttribute('title') } : null;
}, lbl);

const restheute = await kachel('Restschuld heute');
pruef('Kachel «Restschuld heute» gefunden', restheute !== null, restheute);
gleich('Restschuld heute', restheute && lies(restheute.v), K.rest);
gleich('Restschuld heute nennt den Stichmonat', restheute && restheute.m,
  MK[STICHM] + ' ' + STICHJAHR);

const getilgt = await kachel('Getilgt bisher');
pruef('Kachel «Getilgt bisher» gefunden', getilgt !== null, getilgt);
gleich('Getilgt bisher', getilgt && lies(getilgt.v), K.getilgt);
/* Die Kurzzeile traegt seit dem Umbau nur noch die Quote; Anfangsstand und
   Startjahr sind in den Titel gewandert. Beide Stellen werden gelesen. */
gleich('Getilgt bisher — Kurzzeile ist die Quote', getilgt && getilgt.m, K.quote + ' %');
if (getilgt) {
  const m = /^von\s+([\d'’]+)\s+seit\s+(\d{4})$/.exec(String(getilgt.t || ''));
  pruef('Getilgt bisher — der Titel nennt Anfangsstand und Startjahr', m !== null, getilgt.t);
  if (m) {
    gleich('Anfangsstand (jede Schuld mit ihrem eigenen ersten Jahr)', lies(m[1]), K.anfang);
    gleich('Startjahr der Zaehlung', parseInt(m[2], 10), K.erstJahr);
  }
}
/* Der Quelltext verlangt es ausdruecklich: Anfang minus Getilgt muss die
   Restschuld ergeben, sonst steht im Band eine Quote, die niemand nachrechnen
   kann. Gemessen an den drei angezeigten Zahlen, nicht an der Rechnung. */
if (restheute && getilgt) {
  const m = /^von\s+([\d'’]+)\s+seit/.exec(String(getilgt.t || ''));
  const anfangGezeigt = m ? lies(m[1]) : null;
  pruef('die drei gezeigten Zahlen gehen auf: Anfang − Getilgt = Restschuld',
    anfangGezeigt !== null && anfangGezeigt - lies(getilgt.v) === lies(restheute.v),
    anfangGezeigt + ' − ' + getilgt.v + ' vs ' + restheute.v);
}

const offen = await kachel('Offen im ' + ML[STICHM]);
pruef('Kachel «Offen im ' + ML[STICHM] + '» gefunden', offen !== null, offen);
gleich('Offen im Stichmonat', offen && lies(offen.v), K.offen);
gleich('Offen im Stichmonat — Kurzzeile', offen && offen.m, K.offen > 0 ? 'noch offen' : 'erledigt');

/* Schuldenfrei. Der Vorrat laesst den letzten Jahrgang ohne Raten laufen,
   waehrend Schulden offen bleiben — nach diesem Plan wird also keine fertig.
   Die Bedingung wird hier aus dem Vorrat hergeleitet und nicht behauptet. */
const letzterJg = JAHRE[JAHRE.length - 1];
const haengtEs = schulden(STICHJAHR).some(s => {
  const p = posVon(STICHJAHR, s.gKey, s.pKey);
  const stand = p ? nachRaten(basisE(STICHJAHR, s.gKey, s.pKey),
    su((p.reihe || []).slice(0, STICHM + 1))) : 0;
  return stand > 0 && raten(letzterJg, s.gKey, s.pKey) === 0;
});
const frei = await kachel('Schuldenfrei');
pruef('Kachel «Schuldenfrei» gefunden', frei !== null, frei);
pruef('im Vorrat bleibt mindestens eine Schuld ohne Rate im letzten Jahrgang offen '
  + '(Gegenprobe zur Erwartung darunter)', haengtEs, haengtEs);
if (haengtEs) {
  gleich('Schuldenfrei zeigt keinen Zeitpunkt', frei && frei.v, '—');
  gleich('Schuldenfrei sagt warum', frei && frei.m, 'nicht nach diesem Plan');
}

/* ============================================ 3. Saldo-Uebertrag ueber alle */
console.log('\n3. Saldo-Uebertrag ueber alle sechs Jahrgaenge, Vererbung gesperrt');

let schuldPruefungen = 0;
for (const j of JAHRE) {
  console.log('  ' + j);
  for (const s of schulden(j)) {
    const pid = await id(j, s.name);
    if (!pid) continue;
    schuldPruefungen++;
    gleich('«' + s.name + '» ' + j + ' — Basis', lies(await basisZelle(pid)), basisE(j, s.gKey, s.pKey));
    gleich('«' + s.name + '» ' + j + ' — Rest',  lies(await restZelle(pid)),  restE(j, s.gKey, s.pKey));
    const feld = await hatFeld('td[data-kb="' + pid + '"]');
    const erw = !geerbtE(j, s.gKey, s.pKey);
    pruef('«' + s.name + '» ' + j + ' — Basis ' + (erw ? 'tippbar (eigener Anfangsstand)'
      : 'gesperrt (geerbt)'), feld === erw, feld);
    /* Die geerbte Zelle traegt die Klasse, an der sie im Blatt leiser steht. */
    const geerbtKlasse = await seite.evaluate(i =>
      document.querySelector('td[data-kb="' + i + '"]').classList.contains('geerbt'), pid);
    pruef('«' + s.name + '» ' + j + ' — Kennzeichnung «geerbt» stimmt mit dem Feld ueberein',
      geerbtKlasse === !erw, geerbtKlasse);
  }
}
const zeilenSoll = JAHRE.reduce((a, j) => a + schulden(j).length, 0);
pruef('jede Schuldzeile jedes Jahrgangs ist angesehen worden (Gegenprobe)',
  schuldPruefungen === zeilenSoll && zeilenSoll > 0, schuldPruefungen + ' von ' + zeilenSoll);

/* «Kein Vortrag heisst kein Eintrag»: der vorletzte Jahrgang fuehrt einen Teil
   der Schulden nur noch dem Namen nach — kein Stand, keine Rate. Ein solcher
   Jahrgang ist durchlaessig, und der Jahrgang danach faengt wieder mit seinem
   EIGENEN Anfangsstand an, statt auf null gezogen zu werden. Welche Schulden
   das sind, steht im Vorrat und wird hier ausgerechnet, nicht aufgezaehlt. */
console.log('  «Kein Vortrag heisst kein Eintrag» im letzten Jahrgang');
const durchlaessig = schulden(letzterJg).filter(s => !geerbtE(letzterJg, s.gKey, s.pKey));
const geerbte = schulden(letzterJg).filter(s => geerbtE(letzterJg, s.gKey, s.pKey));
pruef('im letzten Jahrgang stehen beide Faelle nebeneinander (Gegenprobe)',
  durchlaessig.length > 0 && geerbte.length > 0,
  durchlaessig.length + ' durchlaessig, ' + geerbte.length + ' geerbt');
await gehJahr(letzterJg);
for (const s of durchlaessig) {
  const pid = await findeId(s.name);
  if (!pid) { pruef('Zeile gefunden: «' + s.name + '» ' + letzterJg, false, null); continue; }
  const vj = vorjahr(letzterJg);
  pruef('«' + s.name + '» ' + vj + ' traegt weder Stand noch Rate noch Korrektur',
    basisE(vj, s.gKey, s.pKey) === 0 && raten(vj, s.gKey, s.pKey) === 0
    && kSum(vj, s.gKey, s.pKey, 'rest') === 0);
  pruef('«' + s.name + '» ' + letzterJg + ' — Basis wieder tippbar, kein Vortrag',
    await hatFeld('td[data-kb="' + pid + '"]'));
  gleich('«' + s.name + '» ' + letzterJg + ' — Basis ist der eigene Anfangsstand',
    lies(await basisZelle(pid)), basisE(letzterJg, s.gKey, s.pKey));
}

/* Der Uebertrag als Kette: ein neuer Anfangsstand im ersten Jahrgang muss sich
   durch alle folgenden ziehen, ohne dass irgendwo etwas ausgeloest wird. */
console.log('  ein getippter Anfangsstand wandert durch alle Jahrgaenge');
const ersterJg = JAHRE[0];
const kette = schulden(ersterJg).find(s => !geerbtE(ersterJg, s.gKey, s.pKey)
  && basisE(ersterJg, s.gKey, s.pKey) > 0);
pruef('im ersten Jahrgang gibt es eine Schuld mit eigenem Anfangsstand (Gegenprobe)',
  !!kette, kette && kette.name);
if (kette) {
  const pidK = await id(ersterJg, kette.name);
  if (pidK) {
    const alt = basisE(ersterJg, kette.gKey, kette.pKey);
    const neu = alt + 6000;
    await tippe('td[data-kb="' + pidK + '"] input', neu);
    posVon(ersterJg, kette.gKey, kette.pKey).basis = neu;
    gleich('«' + kette.name + '» ' + ersterJg + ' — Basis nach dem Tippen',
      lies(await basisZelle(pidK)), basisE(ersterJg, kette.gKey, kette.pKey));
    for (const j of JAHRE) {
      const pid = await id(j, kette.name);
      if (!pid) continue;
      gleich('«' + kette.name + '» ' + j + ' — Basis wandert mit',
        lies(await basisZelle(pid)), basisE(j, kette.gKey, kette.pKey));
      gleich('«' + kette.name + '» ' + j + ' — Rest wandert mit',
        lies(await restZelle(pid)), restE(j, kette.gKey, kette.pKey));
    }
  }
}

/* =========================================== 4. Der Rest bleibt bei null ... */
console.log('\n4. Der Rest bleibt bei null — und eine Korrektur klemmt nicht');

await frisch();

/* Der Vorrat traegt den Fall schon von sich aus: eine Schuld, deren Jahresrate
   groesser ist als ihr Anfangsstand. Sie wird zuerst ohne jede Bedienung
   gemessen — der ruhende Fall vor dem gemachten. */
const klemmend = schulden(STICHJAHR).filter(s =>
  basisE(STICHJAHR, s.gKey, s.pKey) >= 0
  && raten(STICHJAHR, s.gKey, s.pKey) > basisE(STICHJAHR, s.gKey, s.pKey));
pruef('der Vorrat traegt mindestens eine Schuld, deren Jahresrate groesser ist '
  + 'als ihr Stand (Gegenprobe)', klemmend.length > 0, klemmend.length);
for (const s of klemmend) {
  const pid = await id(STICHJAHR, s.name);
  if (!pid) continue;
  const t = await restZelle(pid);
  gleich('«' + s.name + '» ' + STICHJAHR + ' — Rest klemmt bei null', lies(t), 0);
  pruef('«' + s.name + '» ' + STICHJAHR + ' — kein Minuszeichen in der Zelle',
    !String(t).includes('−'), t);
}

/* Derselbe Fall, diesmal gemacht: eine Monatsrate weit ueber den Anfangsstand
   heben. Geprueft wird die Wirkung an drei Stellen — Rest, Folgejahr, und dass
   der Weg zurueckfuehrt. */
const gross = schulden(STICHJAHR).find(s => basisE(STICHJAHR, s.gKey, s.pKey) > 0
  && raten(STICHJAHR, s.gKey, s.pKey) < basisE(STICHJAHR, s.gKey, s.pKey));
pruef('es gibt eine Schuld, deren Plan aufgeht (Gegenprobe zum Gegenteil)',
  !!gross, gross && gross.name);
if (gross) {
  const pidG = await id(STICHJAHR, gross.name);
  const folgeJ = JAHRE.find(x => x > STICHJAHR);
  if (pidG) {
    const p = posVon(STICHJAHR, gross.gKey, gross.pKey);
    const jan = p.reihe[0];
    gleich('«' + gross.name + '» Januar, Ausgangswert', lies(await monat(pidG, 0)), jan);
    const hoch = basisE(STICHJAHR, gross.gKey, gross.pKey) + 5000;
    await tippe('input.zelle[data-z="' + pidG + '"][data-m="0"]', hoch);
    p.reihe[0] = hoch;
    const t = await restZelle(pidG);
    pruef('Rest bleibt bei 0, nicht im Minus (Jahresrate weit ueber dem Stand)',
      lies(t) === 0, t);
    pruef('kein Minuszeichen in der Zelle', !String(t).includes('−'), t);
    /* Die Rate selbst wird nicht kleiner gerechnet — geklemmt wird der Rest,
       nicht die Zahl, die getippt wurde. (Eine Jahressumme der Raten gibt es
       bei einer Schuldzeile nicht: die letzte Spalte traegt dort den Rest.) */
    gleich('die getippte Rate steht unveraendert in ihrer Zelle',
      lies(await monat(pidG, 0)), hoch);
    if (folgeJ) {
      const pidF = await id(folgeJ, gross.name);
      if (pidF) {
        gleich('das Folgejahr erbt die geklemmte Null',
          lies(await basisZelle(pidF)), basisE(folgeJ, gross.gKey, gross.pKey));
        pruef('das Folgejahr bleibt gesperrt (weiter geerbt)',
          !(await hatFeld('td[data-kb="' + pidF + '"]')));
      }
    }
    /* zurueck auf den Ausgangswert */
    await gehJahr(STICHJAHR);
    await tippe('input.zelle[data-z="' + pidG + '"][data-m="0"]', jan);
    p.reihe[0] = jan;
    gleich('nach dem Zuruecksetzen steht der alte Rest wieder da',
      lies(await restZelle(pidG)), restE(STICHJAHR, gross.gKey, gross.pKey));
  }
}

/* Die andere Kante, die der Quelltext ausdruecklich nennt: eine Rate klemmt,
   eine Korrektur nicht. Wer mehr wegnimmt, als da ist, soll das sehen — und
   das Band soll es Befund nennen statt Zahl. */
console.log('  eine Korrektur klemmt NICHT — der Befund bleibt sichtbar');
if (gross) {
  const pidG = await id(STICHJAHR, gross.name);
  if (pidG) {
    /* Gross genug, dass nicht nur diese eine Schuld, sondern die Restschuld im
       Band unter null faellt — dann sind beide Befundwege des Bandes zu sehen. */
    const zuviel = -(basisE(STICHJAHR, gross.gKey, gross.pKey) + kennzahlenE().rest + 3000);
    await korrAufBasis(pidG);
    await korrEintragen(zuviel, 'unter null');
    kListe(STICHJAHR, gross.gKey, gross.pKey, 'basis').push(zuviel);
    await korrZu();
    const bt = await basisZelle(pidG);
    gleich('Basis steht unter null und wird nicht weggerechnet',
      lies(bt), basisE(STICHJAHR, gross.gKey, gross.pKey));
    pruef('das Minuszeichen steht in der Zelle', String(bt).includes('−'), bt);
    gleich('der Rest zeigt dieselbe Zahl (eine Rate rechnet den Befund nicht weg)',
      lies(await restZelle(pidG)), restE(STICHJAHR, gross.gKey, gross.pKey));
    const freiJetzt = await kachel('Schuldenfrei');
    gleich('«Schuldenfrei» nennt den Befund statt eines Zeitpunkts',
      freiJetzt && freiJetzt.m, 'der Plan geht nicht auf');
    gleich('«Schuldenfrei» zeigt keinen Zeitpunkt', freiJetzt && freiJetzt.v, '—');

    /* Das Band hat fuer diesen Fall zwei eigene Saetze. Sie sind nur zu sehen,
       wenn die Zahlen wirklich nicht aufgehen — darum steht die Gegenprobe
       daneben, dass sie das jetzt tun. */
    const K2 = kennzahlenE();
    pruef('die Restschuld im Band ist jetzt tatsaechlich unter null (Gegenprobe)',
      K2.rest < 0, K2.rest);
    pruef('die Quote liegt jetzt tatsaechlich ausserhalb von null bis hundert (Gegenprobe)',
      K2.quote > 100 || K2.quote < 0, K2.quote);
    const rJetzt = await kachel('Restschuld heute');
    gleich('«Restschuld heute» zeigt die Zahl unter null', rJetzt && lies(rJetzt.v), K2.rest);
    gleich('«Restschuld heute» sagt im Titel, woher sie kommt', rJetzt && rJetzt.t,
      'Unter null — eine Korrektur nimmt mehr weg, als da ist.');
    const gJetzt = await kachel('Getilgt bisher');
    gleich('«Getilgt bisher» zeigt weiter Anfang minus Restschuld',
      gJetzt && lies(gJetzt.v), K2.getilgt);
    gleich('«Getilgt bisher» — Kurzzeile bleibt die Quote', gJetzt && gJetzt.m, K2.quote + ' %');
    const gT = String(gJetzt && gJetzt.t || '');
    pruef('«Getilgt bisher» nennt im Titel, dass die Zahlen nicht aufgehen',
      gT.startsWith('Die Zahlen gehen nicht auf'), gT);
    const gm = /nicht auf — (-?\d+) % von ([\d'’]+)$/.exec(gT);
    pruef('der Titel nennt Quote und Anfangsstand', gm !== null, gT);
    if (gm) {
      gleich('Quote im Titel', parseInt(gm[1], 10), K2.quote);
      gleich('Anfangsstand im Titel bleibt unveraendert', lies(gm[2]), K2.anfang);
    }
    /* wieder wegnehmen — der naechste Abschnitt faengt ohnehin frisch an, aber
       der Weg zurueck gehoert mitgeprueft */
    await korrAufBasis(pidG);
    const l = await korrListe();
    gleich('die Korrektur steht in der Liste', l.length, 1);
    if (l.length === 1) {
      await klick('[data-korr-weg="' + l[0].eid + '"]');
      kListe(STICHJAHR, gross.gKey, gross.pKey, 'basis').length = 0;
      await korrZu();
      gleich('nach dem Entfernen steht die alte Basis wieder da',
        lies(await basisZelle(pidG)), basisE(STICHJAHR, gross.gKey, gross.pKey));
    }
  }
}

/* ==================================================== 5. Verteilen und Runden */
console.log('\n5. Verteilen und Aufrunden');

await frisch();
await gehJahr(STICHJAHR);

/* Ausserhalb der Schulden ist die Basiszelle leer und trotzdem der Griff zum
   Fenster. Beides gehoert geprueft — das eine ist Absicht, das andere waere
   sonst unerreichbar. */
const leerAberGriff = await seite.evaluate(() => {
  const z = Array.from(document.querySelectorAll('#blatt td[data-bs]'));
  return { anzahl: z.length, mitText: z.filter(x => x.textContent.trim() !== '').length };
});
pruef('es gibt Basiszellen ausserhalb der Schulden (Gegenprobe)',
  leerAberGriff.anzahl > 0, leerAberGriff.anzahl);
gleich('keine von ihnen zeigt eine Zahl — die Basis ist dort Referenz, kein Stand',
  leerAberGriff.mitText, 0);

/* Der Weg durch das Fenster, einmal geschrieben. Er misst zuerst die Vorschau
   und danach das Blatt: die Vorschau ist ein Versprechen, und ein Versprechen
   ist erst dann geprueft, wenn das Ergebnis daneben steht. */
async function verteile(name, weg, erwBasis) {
  const pid = await id(STICHJAHR, name);
  if (!pid) return null;
  await dklick('td[data-bs="' + pid + '"]');
  const f = await basisFenster();
  pruef('Verteilfenster offen: «' + name + '»', f !== null, f);
  if (!f) return null;
  gleich('«' + name + '» — Basis im Fenster', lies(f.wert), erwBasis);
  gleich('«' + name + '» — drei Wege stehen zur Wahl', f.wege.join(','), 'gleich,voll,einmal');
  gleich('«' + name + '» — voreingestellt ist «gleich»', f.gewaehlt, 'gleich');
  if (weg !== 'gleich') {
    await klick('[data-basis-weg="' + weg + '"]');
    const g = await basisFenster();
    gleich('«' + name + '» — «' + weg + '» ist gewaehlt', g && g.gewaehlt, weg);
    gleich('«' + name + '» — der Knopf traegt den gewaehlten Weg', g && g.tat, weg);
  }
  const soll = wegeE(erwBasis)[weg];
  const vor = (await basisFenster()).vorschau;
  gleich('«' + name + '» — die Vorschau zeigt zwoelf Monate', vor.length, 12);
  pruef('«' + name + '» — die Vorschau zeigt «' + weg + '» richtig',
    vor.every((v, m) => lies(v) === soll[m]), vor.join('|'));
  await klick('[data-basis-tat="' + weg + '"]');
  gleich('«' + name + '» — das Fenster ist zu', await zaehl('[data-schleier="basis"]'), 0);
  const ist = (await monate(pid)).map(lies);
  gleich('«' + name + '» — zwoelf Monatszellen, alle tippbar', ist.length, 12);
  pruef('«' + name + '» — im Blatt steht, was die Vorschau versprochen hat',
    ist.every((v, m) => v === soll[m]), ist.join('|'));
  gleich('«' + name + '» — Jahressumme nach dem Verteilen', lies(await jahrwert(pid)), su(soll));
  return pid;
}

/* Aufrunden: der Betrag geht durch zwoelf nicht auf, und die Regel rundet auf
   volle Zehner AUFwaerts. Welche Zeile das ist, sucht der Lauf im Vorrat. */
const bl2026 = (V.daten[STICHJAHR] || []);
const alleFrei = bl2026.filter(x => x.art !== 'schulden')
  .reduce((a, x) => a.concat((x.pos || []).map(p => ({ name: p.name, basis: p.basis }))), []);
const krumm = alleFrei.find(p => p.basis > 0 && p.basis % 12 !== 0
  && proMonat(p.basis) * 12 !== p.basis);
const glatt = alleFrei.find(p => p.basis > 0 && proMonat(p.basis) * 12 === p.basis);
pruef('der Vorrat traegt eine Basis, die durch zwoelf nicht aufgeht (Gegenprobe)',
  !!krumm, krumm && krumm.name);
pruef('der Vorrat traegt eine Basis, die glatt aufgeht (Gegenprobe)',
  !!glatt, glatt && glatt.name);

if (krumm) {
  console.log('  gleichmaessig, aufgerundet: «' + krumm.name + '»');
  const pidK = await verteile(krumm.name, 'gleich', krumm.basis);
  /* Die drei Eigenschaften der Regel, am Blatt gemessen und nicht an der
     Nachrechnung: aufgerundet statt abgerundet, hoechstens um eine Rundung
     darueber, und auf vollen Zehnern. */
  if (pidK) {
    const ist = (await monate(pidK)).map(lies);
    pruef('aufgerundet, nie abgerundet: die zwoelf Monatsraten sind zusammen '
      + 'mindestens die Basis', su(ist) >= krumm.basis, su(ist) + ' zu ' + krumm.basis);
    pruef('und hoechstens um eine Rundung je Monat darueber',
      su(ist) - krumm.basis < RUNDE * 12, su(ist) - krumm.basis);
    pruef('jede Monatsrate im Blatt steht auf vollen Zehnern',
      ist.length === 12 && ist.every(v => v % RUNDE === 0), ist.join('|'));
  }
}
if (glatt) {
  console.log('  gleichmaessig, glatt: «' + glatt.name + '»');
  await verteile(glatt.name, 'gleich', glatt.basis);
}

/* «voll» ist der Nachfolger des alten «Auf alle Monate uebertragen». */
const vollZeile = alleFrei.find(p => p.basis > 0 && p !== krumm && p !== glatt);
if (vollZeile) {
  console.log('  voller Betrag je Monat: «' + vollZeile.name + '»');
  const pid = await verteile(vollZeile.name, 'voll', vollZeile.basis);
  if (pid) gleich('die Monatszellen bleiben tippbar (zwoelf input.zelle)',
    await zaehl('input.zelle[data-z="' + pid + '"]'), 12);
}
/* «einmal» ist im Umbau dazugekommen — im alten Fenster gab es nur zwei Wege. */
const einmalZeile = alleFrei.find(p => p.basis > 0 && p !== krumm && p !== glatt && p !== vollZeile);
if (einmalZeile) {
  console.log('  einmalig im zwoelften Monat: «' + einmalZeile.name + '»');
  const pid = await verteile(einmalZeile.name, 'einmal', einmalZeile.basis);
  if (pid) {
    gleich('die elf Monate davor bleiben leer',
      su((await monate(pid)).slice(0, 11).map(lies)), 0);
    gleich('der zwoelfte Monat traegt den vollen Betrag',
      lies(await monat(pid, 11)), einmalZeile.basis);
  }
}

/* Die Vorwahl im Verteilfenster. Der Quelltext haelt bei `istRueckstellung`
   fest: «Rueckstellungen werden verteilt, alle anderen Kategorien uebertragen —
   der Vorschlag im Basis-Fenster haengt daran, nicht die Wahl selbst.» Gemessen
   wird, ob das zutrifft: an einer Zeile aus den Rueckstellungen und an einer aus
   einer anderen Kategorie. Beide Faelle werden angesehen; welcher Weg
   voreingestellt ist, entscheidet die Messung und nicht dieser Kommentar. */
console.log('  die Vorwahl im Verteilfenster');
const istRs = bl => /r(ue|ü|u)ckstell/i.test(String(bl.key || '') + ' ' + String(bl.name || ''));
const rsBlock  = bl2026.find(x => x.art !== 'schulden' && istRs(x) && (x.pos || []).length);
const andBlock = bl2026.find(x => x.art !== 'schulden' && !istRs(x) && (x.pos || []).length);
pruef('der Vorrat traegt eine Rueckstellungskategorie und eine andere (Gegenprobe)',
  !!(rsBlock && andBlock), (rsBlock && rsBlock.name) + ' / ' + (andBlock && andBlock.name));
if (rsBlock && andBlock) {
  const vorwahl = async name => {
    const pid = await id(STICHJAHR, name);
    if (!pid) return null;
    await dklick('td[data-bs="' + pid + '"]');
    const f = await basisFenster();
    await klick('[data-zu="basis"]');
    return f && f.gewaehlt;
  };
  const vRs  = await vorwahl(rsBlock.pos[0].name);
  const vAnd = await vorwahl(andBlock.pos[0].name);
  pruef('«' + rsBlock.pos[0].name + '» (Rueckstellung) — es gibt ueberhaupt eine '
    + 'Vorwahl (Gegenprobe)', vRs !== null, vRs);
  pruef('«' + andBlock.pos[0].name + '» (keine Rueckstellung) — es gibt ueberhaupt eine '
    + 'Vorwahl (Gegenprobe)', vAnd !== null, vAnd);
  /* Befund, hier festgehalten statt weggelassen: die Vorwahl ist in beiden
     Faellen dieselbe. Das Feld `verteilen`, das der Quelltext an zwei Stellen
     aus `istRueckstellung` fuellt, wird nirgends gelesen; der Kommentar
     beschreibt einen Zustand, den der Umbau abgeloest hat. Geprueft wird das
     Gebaute — die Vorwahl steht fest und haengt nicht an der Kategorie. */
  gleich('die Vorwahl ist bei beiden dieselbe — die Kategorie steuert sie nicht',
    vRs, vAnd);
  gleich('und sie ist «gleich»', vRs, 'gleich');
}

/* Die Basis selbst ist im Fenster eintragbar — im Blatt gaebe es dafuer keine
   Stelle mehr. Geprueft wird, dass die neue Basis sowohl die Vorschau als auch
   das Blatt traegt, und dass sie beim naechsten Oeffnen wieder dasteht. */
console.log('  die Basis im Fenster aendern');
if (glatt) {
  const pid = await id(STICHJAHR, glatt.name);
  if (pid) {
    const neueBasis = 5000;                       /* geht durch zwoelf nicht auf */
    await dklick('td[data-bs="' + pid + '"]');
    await tippe('[data-basis-wert]', neueBasis);
    const f = await basisFenster();
    gleich('die neue Basis steht im Fenster', f && lies(f.wert), neueBasis);
    const soll = wegeE(neueBasis).gleich;
    pruef('die Vorschau rechnet mit der neuen Basis',
      f && f.vorschau.every((v, m) => lies(v) === soll[m]), f && f.vorschau.join('|'));
    await klick('[data-basis-tat="gleich"]');
    pruef('das Blatt traegt die neue Verteilung',
      (await monate(pid)).map(lies).every((v, m) => v === soll[m]));
    gleich('Jahressumme aus der neuen Basis', lies(await jahrwert(pid)), su(soll));
    await dklick('td[data-bs="' + pid + '"]');
    const g = await basisFenster();
    gleich('beim naechsten Oeffnen steht die neue Basis wieder da', g && lies(g.wert), neueBasis);
    gleich('die Blattzelle bleibt trotzdem leer',
      await text('td[data-bs="' + pid + '"]'), '');
    await klick('[data-zu="basis"]');
    gleich('«Abbrechen» schliesst das Fenster', await zaehl('[data-schleier="basis"]'), 0);
  }
}

/* ================================================ 6. Manuelle Saldokorrekturen */
console.log('\n6. Manuelle Saldokorrekturen');

await frisch();

const folgeJahr = JAHRE.find(x => x > STICHJAHR);
const spaeter   = JAHRE.filter(x => x > STICHJAHR);
/* Vier getrennte Schulden fuer vier Faelle — jede Korrektur soll fuer sich
   stehen und nicht die naechste Pruefung mitbewegen. Gewaehlt werden die mit
   einem Stand ueber null: an einer Schuld, die ohnehin bei null steht, waere
   «reduzieren» keine Reduktion und die Pruefung sagte nichts. */
const traeger = schulden(STICHJAHR).filter(s => basisE(STICHJAHR, s.gKey, s.pKey) > 0);
const [S1, S2, S3, S4] = traeger;
pruef('der Vorrat traegt vier Schulden mit einem Stand ueber null (Gegenprobe)',
  !!(S1 && S2 && S3 && S4 && folgeJahr), traeger.map(s => s.name).join(', '));

/* ---- 6a: auf den Rest erhoehen — wirkt im Folgejahr weiter, ohne Warnung --- */
console.log('  6a. Erhoehen auf den Rest — wandert von selbst ins Folgejahr');
if (S1 && folgeJahr) {
  const pid = await id(STICHJAHR, S1.name);
  if (pid) {
    gleich('vorher steht kein Wort «korrigiert» neben «' + S1.name + '»', await marke(pid), null);
    await korrAufRest(pid);
    gleich('das Korrekturfenster ist offen', await zaehl('[data-schleier="korr"]'), 1);
    gleich('die Liste ist leer, die Eingabezeile steht da', await korrZeilen(), 0);
    gleich('die leere Eingabezeile ist genau einmal da (Gegenprobe)',
      await zaehl('.korrliste .korrzeile.leer'), 1);
    gleich('der Umschalter zeigt, worauf die neue Zeile wirkt',
      await text('[data-korr-art]'), 'Rest');
    const fussVor = await korrFuss();
    gleich('der Fuss zeigt dieselbe Basis wie das Blatt',
      fussVor && lies(fussVor.basis), basisE(STICHJAHR, S1.gKey, S1.pKey));
    gleich('der Fuss zeigt denselben Rest wie das Blatt',
      fussVor && lies(fussVor.rest), restE(STICHJAHR, S1.gKey, S1.pKey));

    await korrEintragen('500', 'Testkorrektur');
    kListe(STICHJAHR, S1.gKey, S1.pKey, 'rest').push(500);
    pruef('keine Warnung bei der ersten Korrektur', !(await warnungOffen()));
    gleich('die Korrektur steht in der Liste', await korrZeilen(), 1);
    const l = await korrListe();
    gleich('der angezeigte Betrag traegt sein Vorzeichen', l[0] && l[0].betrag, '+500');
    gleich('die Notiz steht daneben', l[0] && l[0].notiz, 'Testkorrektur');
    gleich('die Zeile sagt, worauf sie wirkt', l[0] && l[0].wirkt, 'Rest');
    pruef('jede Zeile traegt ihr eigenes Loeschzeichen', l[0] && l[0].weg);
    gleich('das Eingabefeld ist wieder leer', await zelle('[data-korr-betrag]'), '');
    const fussNach = await korrFuss();
    gleich('der Fuss rechnet sofort mit',
      fussNach && lies(fussNach.rest), restE(STICHJAHR, S1.gKey, S1.pKey));

    await korrZu();
    /* Statt des gestrichenen Farbpunkts steht das Wort. */
    gleich('neben dem Glaeubiger steht «korrigiert»', await marke(pid), 'korrigiert');
    gleich('Rest ' + STICHJAHR + ' nach der Korrektur',
      lies(await restZelle(pid)), restE(STICHJAHR, S1.gKey, S1.pKey));

    const pidF = await id(folgeJahr, S1.name);
    if (pidF) {
      gleich('die Basis des Folgejahrs wandert um denselben Betrag weiter',
        lies(await basisZelle(pidF)), basisE(folgeJahr, S1.gKey, S1.pKey));
      gleich('kein Wort «korrigiert» im Folgejahr — die Korrektur steht im Stichjahr',
        await marke(pidF), null);
      pruef('die Basis des Folgejahrs bleibt gesperrt',
        !(await hatFeld('td[data-kb="' + pidF + '"]')));
    }
  }
}

/* ---- 6b: auf die Basis reduzieren — eintragen, aendern, entfernen ---------- */
console.log('  6b. Reduzieren auf die Basis — anzeigen, aendern, entfernen');
if (S2 && folgeJahr) {
  const pid = await id(STICHJAHR, S2.name);
  if (pid) {
    const g = S2.gKey, p = S2.pKey;
    await korrAufBasis(pid);
    gleich('der Umschalter zeigt «Basis»', await text('[data-korr-art]'), 'Basis');
    /* Kein Richtungsschalter mehr — das Minus steht im Betrag. */
    await korrEintragen('-200', 'Testkorrektur');
    kListe(STICHJAHR, g, p, 'basis').push(-200);
    pruef('keine Warnung bei der ersten Korrektur', !(await warnungOffen()));
    const l1 = await korrListe();
    gleich('genau eine Zeile in der Liste', l1.length, 1);
    gleich('der angezeigte Korrekturbetrag', l1[0] && l1[0].betrag, '−200');
    gleich('die Zeile sagt «Basis»', l1[0] && l1[0].wirkt, 'Basis');
    await korrZu();
    gleich('neben dem Glaeubiger steht «korrigiert»', await marke(pid), 'korrigiert');
    gleich('Basis ' + STICHJAHR + ' nach −200', lies(await basisZelle(pid)), basisE(STICHJAHR, g, p));
    gleich('Rest ' + STICHJAHR + ' nach −200', lies(await restZelle(pid)), restE(STICHJAHR, g, p));

    const pidF = await id(folgeJahr, S2.name);
    if (pidF) {
      gleich('die Basis des Folgejahrs wirkt weiter', lies(await basisZelle(pidF)), basisE(folgeJahr, g, p));
      pruef('die Basis des Folgejahrs bleibt gesperrt',
        !(await hatFeld('td[data-kb="' + pidF + '"]')));
    }
    await gehJahr(STICHJAHR);

    /* Aendern: der erneute Doppelklick zeigt die Zeile, sie ist ueberschreibbar. */
    await korrAufBasis(pid);
    const l2 = await korrListe();
    pruef('die Korrektur steht beim erneuten Oeffnen noch da', l2.length === 1, l2.length);
    if (l2.length === 1) {
      await tippe('[data-korr-b="' + l2[0].eid + '"]', '-350');
      kListe(STICHJAHR, g, p, 'basis')[0] = -350;
      pruef('das Aendern loest keine Warnung aus (noch keine eigene Korrektur spaeter)',
        !(await warnungOffen()));
      const fuss = await korrFuss();
      gleich('der Fuss rechnet die Aenderung sofort mit',
        fuss && lies(fuss.basis), basisE(STICHJAHR, g, p));
      await korrZu();
      gleich('Basis nach dem Aendern auf −350', lies(await basisZelle(pid)), basisE(STICHJAHR, g, p));
      gleich('Rest nach dem Aendern auf −350', lies(await restZelle(pid)), restE(STICHJAHR, g, p));

      /* Auf null gesetzt loescht die Zeile — der Quelltext sagt es, also wird es
         geprueft; das war im alten Lauf nicht dabei. */
      await korrAufBasis(pid);
      const l3 = await korrListe();
      await tippe('[data-korr-b="' + l3[0].eid + '"]', '0');
      kListe(STICHJAHR, g, p, 'basis').length = 0;
      gleich('eine Korrektur auf null ist keine Korrektur mehr', await korrZeilen(), 0);
      gleich('die leere Eingabezeile bleibt (Gegenprobe)',
        await zaehl('.korrliste .korrzeile.leer'), 1);
      await korrZu();
      gleich('die alte Basis steht wieder da', lies(await basisZelle(pid)), basisE(STICHJAHR, g, p));
      gleich('der alte Rest steht wieder da', lies(await restZelle(pid)), restE(STICHJAHR, g, p));
      gleich('das Wort «korrigiert» ist weg', await marke(pid), null);

      /* Entfernen ueber das Loeschzeichen — der zweite Weg zum selben Ziel. */
      await korrAufBasis(pid);
      await korrEintragen('-400', 'nochmal');
      kListe(STICHJAHR, g, p, 'basis').push(-400);
      const l4 = await korrListe();
      gleich('die zweite Korrektur steht da', l4.length, 1);
      if (l4.length === 1) {
        await klick('[data-korr-weg="' + l4[0].eid + '"]');
        kListe(STICHJAHR, g, p, 'basis').length = 0;
        gleich('die Liste ist wieder leer', await korrZeilen(), 0);
        await korrZu();
        gleich('Basis wieder wie zuvor', lies(await basisZelle(pid)), basisE(STICHJAHR, g, p));
        gleich('Rest wieder wie zuvor', lies(await restZelle(pid)), restE(STICHJAHR, g, p));
        gleich('das Wort «korrigiert» ist weg', await marke(pid), null);
      }
    }
  }
}

/* ---- 6c: die Warnung — «Abbrechen» und «Beide behalten» -------------------- */
console.log('  6c. Warnung «Saldo Folgejahr bereits korrigiert» — «Abbrechen», «Beide behalten»');
if (S3 && folgeJahr) {
  const g = S3.gKey, p = S3.pKey;
  const pidF = await id(folgeJahr, S3.name);
  const pid  = await id(STICHJAHR, S3.name);
  if (pidF && pid) {
    await gehJahr(folgeJahr);
    await korrAufBasis(pidF);
    await korrEintragen('300', 'Vorablast');
    kListe(folgeJahr, g, p, 'basis').push(300);
    pruef('keine Warnung: es gibt keinen spaeteren Jahrgang mit eigener Korrektur',
      !(await warnungOffen()));
    await korrZu();
    gleich('neben dem Glaeubiger im Folgejahr steht «korrigiert»', await marke(pidF), 'korrigiert');
    gleich('Basis ' + folgeJahr + ' nach +300', lies(await basisZelle(pidF)), basisE(folgeJahr, g, p));

    /* «Abbrechen» */
    await gehJahr(STICHJAHR);
    await korrAufRest(pid);
    await korrEintragen('50');
    pruef('Warnung erscheint: das Folgejahr traegt bereits eine eigene Basiskorrektur',
      await warnungOffen());
    gleich('die Warnung nennt den Fall in der Einzahl',
      await text('[data-schleier="korrWarn"] .dtitel h2'), 'Saldo Folgejahr bereits korrigiert');
    const warnSatz = String(await text('[data-schleier="korrWarn"] .dsatz'));
    pruef('die Warnung nennt den Jahrgang und den Betrag',
      warnSatz.includes(String(folgeJahr)) && /\+\s*300/.test(warnSatz), warnSatz);
    await klick('[data-korr-warn="ab"]');
    pruef('die Warnung ist zu nach «Abbrechen»', !(await warnungOffen()));
    gleich('«Abbrechen» hat nichts eingetragen', await korrZeilen(), 0);
    await korrZu();
    gleich('Rest ' + STICHJAHR + ' unveraendert nach «Abbrechen»',
      lies(await restZelle(pid)), restE(STICHJAHR, g, p));
    await gehJahr(folgeJahr);
    gleich('Basis ' + folgeJahr + ' unveraendert nach «Abbrechen»',
      lies(await basisZelle(pidF)), basisE(folgeJahr, g, p));

    /* «Beide behalten» */
    await gehJahr(STICHJAHR);
    await korrAufRest(pid);
    await korrEintragen('50');
    pruef('die Warnung erscheint erneut', await warnungOffen());
    await klick('[data-korr-warn="beide"]');
    kListe(STICHJAHR, g, p, 'rest').push(50);
    pruef('die Warnung ist zu nach «Beide behalten»', !(await warnungOffen()));
    await korrZu();
    gleich('Rest ' + STICHJAHR + ' nach «Beide behalten»',
      lies(await restZelle(pid)), restE(STICHJAHR, g, p));
    gleich('das Wort «korrigiert» steht im Stichjahr', await marke(pid), 'korrigiert');
    const pidF2 = await id(folgeJahr, S3.name);
    if (pidF2) {
      gleich('Basis ' + folgeJahr + ': die eigene Korrektur und die geerbte wirken zusammen',
        lies(await basisZelle(pidF2)), basisE(folgeJahr, g, p));
      gleich('das Wort «korrigiert» steht auch im Folgejahr', await marke(pidF2), 'korrigiert');
      await korrAufBasis(pidF2);
      gleich('die eigene Korrektur des Folgejahrs steht noch in seiner Liste',
        await korrZeilen(), 1);
      await korrZu();
    }
  }
}

/* ---- 6d: die Warnung — «Folgejahr ueberschreiben» -------------------------- */
console.log('  6d. Warnung — «Folgejahr ueberschreiben» raeumt die spaetere Korrektur weg');
if (S4 && folgeJahr) {
  const g = S4.gKey, p = S4.pKey;
  const pidF = await id(folgeJahr, S4.name);
  const pid  = await id(STICHJAHR, S4.name);
  if (pidF && pid) {
    await gehJahr(folgeJahr);
    await korrAufBasis(pidF);
    await korrEintragen('150', 'Testkorrektur');
    kListe(folgeJahr, g, p, 'basis').push(150);
    pruef('keine Warnung beim Eintragen im Folgejahr', !(await warnungOffen()));
    await korrZu();
    gleich('Basis ' + folgeJahr + ' nach +150', lies(await basisZelle(pidF)), basisE(folgeJahr, g, p));

    await gehJahr(STICHJAHR);
    await korrAufRest(pid);
    await korrEintragen('80');
    pruef('die Warnung erscheint', await warnungOffen());
    await klick('[data-korr-warn="ueber"]');
    kListe(STICHJAHR, g, p, 'rest').push(80);
    kBasisWegAb(STICHJAHR, g, p);
    pruef('die Warnung ist zu nach «Folgejahr ueberschreiben»', !(await warnungOffen()));
    await korrZu();
    gleich('Rest ' + STICHJAHR + ' traegt die neue Korrektur',
      lies(await restZelle(pid)), restE(STICHJAHR, g, p));
    gleich('das Wort «korrigiert» steht im Stichjahr', await marke(pid), 'korrigiert');

    const pidF2 = await id(folgeJahr, S4.name);
    if (pidF2) {
      gleich('Basis ' + folgeJahr + ': die eigene Korrektur ist weg, nur die Fortschreibung bleibt',
        lies(await basisZelle(pidF2)), basisE(folgeJahr, g, p));
      gleich('das Wort «korrigiert» ist im Folgejahr weg', await marke(pidF2), null);
      pruef('die Basis des Folgejahrs bleibt gesperrt',
        !(await hatFeld('td[data-kb="' + pidF2 + '"]')));
      await korrAufBasis(pidF2);
      gleich('die Liste des Folgejahrs ist leer', await korrZeilen(), 0);
      await korrZu();
    }
  }
}

/* ---- 6e: mehr als ein spaeterer Jahrgang — die Warnung spricht im Plural --- */
console.log('  6e. Zwei spaetere Jahrgaenge korrigiert — die Warnung spricht in der Mehrzahl');
if (S1 && spaeter.length >= 2) {
  await frisch();
  const g = S1.gKey, p = S1.pKey;
  for (const j of spaeter.slice(0, 2)) {
    const pj = await id(j, S1.name);
    if (!pj) continue;
    await korrAufBasis(pj);
    await korrEintragen('100', 'spaeter');
    kListe(j, g, p, 'basis').push(100);
    await korrZu();
  }
  const pid = await id(STICHJAHR, S1.name);
  if (pid) {
    await korrAufRest(pid);
    await korrEintragen('10');
    pruef('die Warnung erscheint', await warnungOffen());
    gleich('die Warnung spricht in der Mehrzahl',
      await text('[data-schleier="korrWarn"] .dtitel h2'), 'Spätere Jahrgänge bereits korrigiert');
    await klick('[data-korr-warn="ueber"]');
    kListe(STICHJAHR, g, p, 'rest').push(10);
    kBasisWegAb(STICHJAHR, g, p);
    await korrZu();
    for (const j of spaeter.slice(0, 2)) {
      const pj = await id(j, S1.name);
      if (!pj) continue;
      gleich('«Ueberschreiben» hat auch ' + j + ' geraeumt', await marke(pj), null);
      gleich('Basis ' + j + ' traegt nur noch die Fortschreibung',
        lies(await basisZelle(pj)), basisE(j, g, p));
    }
  }
}

await b.close(); server.close();
ende(fehler);
