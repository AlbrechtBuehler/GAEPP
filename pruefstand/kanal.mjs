/* GAEPP — Pruefstand: der Datenkanal beim Start.

   Anlass, 23.08.2026: Albrecht meldete, GAEPP verbinde sich nicht automatisch
   mit dem Repo — er muesse jedes Mal neu verbinden. Gemessen war die Lage
   anders, als sie aussah: Adresse und Schluessel standen sehr wohl noch im
   Browserspeicher. Der Start fragte nur nie danach und meldete stur «Aus dem
   Browserspeicher»; das Dreieck blieb Kontur, und wer es las, hielt sich fuer
   nicht verbunden. Dazu kam, dass GAEPP beim Oeffnen ueberhaupt nie im Repo
   nachsah — war lokal etwas da, galt das.

   Dieser Lauf bewacht beides. Er faehrt nie gegen ein echtes Repo: jede
   Anfrage an api.github.com wird abgefangen und aus dem Vorrat beantwortet.
   Ein Zaehler belegt, dass sie ueberhaupt gestellt wurde — sonst waere jede
   Aussage hier gruen, ohne dass etwas geschehen ist.

   Port 8747. Fahren: node kanal.mjs */

import { serve, browser, bilanzbuch, bisRuhe } from './hilfe.mjs';
import { daten } from './vorrat.mjs';

const PORT = 8747;
const REPO = 'Pruefstelle/GAEPP_DATA';
const SCHLUESSEL_TEXT = 'ghp_pruefstand_kein_echter_schluessel';

const server = await serve(PORT);
const { b, seite, fehler } = await browser(PORT);
const { pruef, gleich, ende } = bilanzbuch('kanal');

/* ---------------------------------------------------------------- Werkzeug */

/* Ein Datenstand fuers Repo: derselbe Vorrat, eine Zahl geaendert und ein
   eigener Zeitstempel. Die Zahl ist der Beleg — an ihr ist im Blatt zu sehen,
   welcher Stand gewonnen hat. */
const repoStand = (zeit, marke) => {
  const d = daten();
  d.meta.geaendert = zeit;
  const block = (d.daten[2026] || []).find(x => (x.pos || []).length);
  if (block) block.pos[0].reihe = new Array(12).fill(marke);
  return d;
};

const b64 = (obj) => Buffer.from(JSON.stringify(obj, null, 1), 'utf8').toString('base64');

/* Die Anfrage an GitHub wird abgefangen. `lage` steuert, was zurueckkommt. */
let lage = { art: 'aus' };
let anfragen = 0;
await seite.route('https://api.github.com/**', async route => {
  anfragen++;
  if (lage.art === 'kaputt') return route.fulfill({ status: 500, body: 'Serverfehler' });
  if (lage.art === 'fehlt')  return route.fulfill({ status: 404, body: 'nicht da' });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ sha: 'abc123', content: b64(lage.stand) }) });
});

const anbinden = () => seite.evaluate(([r, t]) => {
  setzeConf('repo', r); setzeConf('token', t); setzeConf('pfad', 'gaepp-daten.json');
}, [REPO, SCHLUESSEL_TEXT]);

const trennen = () => seite.evaluate(() => { setzeConf('repo', ''); setzeConf('token', ''); });

const neuLaden = async () => {
  await seite.reload({ waitUntil: 'load' });
  await seite.waitForFunction(() => typeof S !== 'undefined' && S.geladen === true, null, { timeout: 8000 });
  await seite.waitForTimeout(400);
};

const lies = () => seite.evaluate(() => ({
  sync: S.sync,
  text: S.syncText,
  /* Gefuellt heisst gesichert — das Zeichen wird am gerenderten Knoten
     gemessen und nicht aus S.sync geschlossen. */
  dreieckVoll: (() => {
    const kn = document.querySelector('[data-sync-auf] svg');
    return kn ? kn.getAttribute('fill') === 'currentColor' : null;
  })(),
  titel: (document.querySelector('[data-sync-auf]') || {}).title || null,
  conf: syncConf()
}));

/* Der Wert, an dem im Blatt zu sehen ist, welcher Stand gewonnen hat. */
const ersteReihe = () => seite.evaluate(() => {
  const b = (S.daten[2026] || []).find(x => (x.pos || []).length);
  return b ? b.pos[0].reihe.slice(0, 3) : null;
});

/* ============================================ 1. Ohne Anbindung ========== */
console.log('\n1. Ohne Anbindung bleibt alles, wie es war');
await trennen();
lage = { art: 'aus' };
anfragen = 0;
await neuLaden();
const ohne = await lies();
gleich('ohne Repo meldet GAEPP den Browserspeicher', ohne.sync, 'lokal');
pruef('und sagt es auch im Klartext', /Browserspeicher/.test(ohne.text), ohne.text);
gleich('das Dreieck ist nur Kontur', ohne.dreieckVoll, false);
gleich('ohne Repo wird GitHub gar nicht erst gefragt (Gegenprobe)', anfragen, 0);

/* ============================================ 2. Repo-Stand ist neuer ==== */
console.log('\n2. Im Repo liegt ein neuerer Stand — er wird geholt');
await anbinden();
/* Der lokale Stand bekommt einen alten Stempel, der im Repo einen neuen. */
await seite.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('gaepp.tabelle.v1'));
  d.meta.geaendert = '2026-08-23T09:00:00.000Z';
  localStorage.setItem('gaepp.tabelle.v1', JSON.stringify(d));
});
lage = { art: 'da', stand: repoStand('2026-08-23T18:00:00.000Z', 4242) };
anfragen = 0;
await neuLaden();
const neuer = await lies();
gleich('GitHub wurde wirklich gefragt (Gegenprobe)', anfragen > 0, true);
gleich('der Zustand ist «gesichert»', neuer.sync, 'gesichert');
pruef('die Meldung nennt das Repo', neuer.text.indexOf(REPO) >= 0, neuer.text);
pruef('und sagt, dass geholt wurde', /geholt/.test(neuer.text), neuer.text);
gleich('das Dreieck ist gefuellt', neuer.dreieckVoll, true);
pruef('der Titel am Zeichen traegt denselben Satz', neuer.titel === neuer.text, neuer.titel);
gleich('die Zahlen im Blatt stammen aus dem Repo',
  JSON.stringify(await ersteReihe()), JSON.stringify([4242, 4242, 4242]));
gleich('der geholte Stand liegt danach auch im Browserspeicher',
  await seite.evaluate(() => JSON.parse(localStorage.getItem('gaepp.tabelle.v1')).meta.geaendert),
  '2026-08-23T18:00:00.000Z');

/* ============================================ 3. Beide Staende gleich ==== */
console.log('\n3. Derselbe Stand auf beiden Seiten — es geschieht nichts');
lage = { art: 'da', stand: repoStand('2026-08-23T18:00:00.000Z', 4242) };
anfragen = 0;
await neuLaden();
const gleichStand = await lies();
gleich('GitHub wurde gefragt (Gegenprobe)', anfragen > 0, true);
gleich('der Zustand ist «gesichert»', gleichStand.sync, 'gesichert');
pruef('die Meldung sagt, dass der Stand derselbe ist',
  /derselbe/.test(gleichStand.text), gleichStand.text);
gleich('das Dreieck ist gefuellt', gleichStand.dreieckVoll, true);
gleich('die Zahlen sind unveraendert',
  JSON.stringify(await ersteReihe()), JSON.stringify([4242, 4242, 4242]));

/* ============================================ 4. Lokal ist neuer ========= */
console.log('\n4. Der Stand hier ist neuer — er bleibt stehen');
await seite.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('gaepp.tabelle.v1'));
  d.meta.geaendert = '2026-08-24T12:00:00.000Z';
  const b = (d.daten[2026] || []).find(x => (x.pos || []).length);
  if (b) b.pos[0].reihe = new Array(12).fill(777);
  localStorage.setItem('gaepp.tabelle.v1', JSON.stringify(d));
});
lage = { art: 'da', stand: repoStand('2026-08-23T18:00:00.000Z', 4242) };
anfragen = 0;
await neuLaden();
const lokalNeuer = await lies();
gleich('GitHub wurde gefragt (Gegenprobe)', anfragen > 0, true);
gleich('der Zustand ist «lokal» — noch nicht gesichert', lokalNeuer.sync, 'lokal');
pruef('die Meldung nennt trotzdem das verbundene Repo',
  lokalNeuer.text.indexOf(REPO) >= 0, lokalNeuer.text);
pruef('und sagt, dass der Stand hier neuer ist',
  /neuer/.test(lokalNeuer.text), lokalNeuer.text);
gleich('die Zahlen im Blatt sind die lokalen — nichts wurde ueberschrieben',
  JSON.stringify(await ersteReihe()), JSON.stringify([777, 777, 777]));

/* ============================================ 5. Das Nachsehen misslingt = */
console.log('\n5. Kein Netz, falscher Schluessel — der Stand bleibt unangetastet');
lage = { art: 'kaputt' };
anfragen = 0;
await neuLaden();
const kaputt = await lies();
gleich('GitHub wurde gefragt (Gegenprobe)', anfragen > 0, true);
gleich('der Zustand ist «fehler»', kaputt.sync, 'fehler');
pruef('die Meldung sagt, dass verbunden IST — «nicht verbunden» waere falsch',
  kaputt.text.indexOf(REPO) >= 0 && !/nicht verbunden/.test(kaputt.text), kaputt.text);
pruef('und benennt, was misslang', /misslang/.test(kaputt.text), kaputt.text);
gleich('das Dreieck ist Kontur', kaputt.dreieckVoll, false);
gleich('die Zahlen im Blatt sind unveraendert',
  JSON.stringify(await ersteReihe()), JSON.stringify([777, 777, 777]));

/* ============================================ 6. Die Anbindung haelt ===== */
console.log('\n6. Adresse und Schluessel ueberstehen jedes Neuladen');
const c = (await lies()).conf;
gleich('das Ziel steht noch da', c.repo, REPO);
gleich('der Zugangsschluessel steht noch da', c.token, SCHLUESSEL_TEXT);
/* Und er steht auch im Fenster — dort schaut Albrecht nach. */
await seite.locator('[data-sync-auf]').click();
await bisRuhe(seite);
const felder = await seite.evaluate(() => {
  const f = {};
  document.querySelectorAll('#dialoge input[data-sc]').forEach(i => { f[i.dataset.sc] = i.value; });
  return f;
});
gleich('im Datenkanal steht das Ziel', felder.repo, REPO);
gleich('im Datenkanal steht der Schluessel', felder.token, SCHLUESSEL_TEXT);
pruef('Gegenprobe: das Fenster hat ueberhaupt Felder', Object.keys(felder).length >= 4,
  Object.keys(felder).join(','));

/* ============================================ 7. Der Stichmonat ========== */
/* Befund vom 26.09.2026: GÄPP stand im August. Der Stichmonat lag fest im
   Zustand, ging beim Sichern in die Datendatei und kam beim Laden von dort
   zurueck — «Restschuld heute» zog die Raten bis August ab, waehrend draussen
   der September lief. Seit 3.1.0 gibt der Kalender ihn vor; nur eine Datei mit
   «stichFest» darf ihn halten. Dieser Abschnitt bewacht beide Haelften. */
console.log('\n7. Der Stichmonat kommt aus dem Kalender — festgesetzt aus der Datei');

const kalenderMonat = () => {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
};
const stichLesen = () => seite.evaluate(() => ({ monat: S.stichmonat, fest: S.stichFest }));

/* a) Der Vorrat setzt fest — sonst verschoeben sich seine Zahlen jeden Monat. */
await trennen();
lage = { art: 'aus' };
await seite.evaluate(() => localStorage.removeItem('gaepp.tabelle.v1'));
await neuLaden();
const vorratStich = await stichLesen();
gleich('die Datei mit Marke setzt den Monat', vorratStich.monat, '2026-08');
gleich('und GÄPP weiss, dass er festgesetzt ist', vorratStich.fest, true);

/* b) Dieselbe Datei ohne Marke — jetzt zaehlt der Kalender, nicht der August.
   Der Weg fuehrt absichtlich durch das Repo: so wird geprueft, was ein
   gesicherter Stand bewirkt, und nicht bloss, was uebernimm() tut. */
await anbinden();
const ohneMarke = daten();
delete ohneMarke.meta.stichFest;
ohneMarke.meta.geaendert = '2026-09-26T09:00:00.000Z';
lage = { art: 'da', stand: ohneMarke };
await seite.evaluate(() => localStorage.removeItem('gaepp.tabelle.v1'));
await neuLaden();
const freiStich = await stichLesen();
gleich('ohne Marke gilt der laufende Monat', freiStich.monat, kalenderMonat());
gleich('und nichts ist festgesetzt', freiStich.fest, false);
pruef('Gegenprobe: die Datei nennt trotzdem den August',
  ohneMarke.meta.stichmonat === '2026-08', ohneMarke.meta.stichmonat);

/* c) Was gesichert wird, schreibt den heutigen Monat nicht fuer immer fest —
   sonst waere der alte Fehler beim naechsten Laden zurueck. */
const rueck = await seite.evaluate(() => nutzdaten().meta);
gleich('der gesicherte Stand nennt den laufenden Monat', rueck.stichmonat, kalenderMonat());
gleich('und traegt keine Marke', rueck.stichFest, undefined);

/* d) Ein unbrauchbarer Monat legt die Anzeige nicht still. */
const kaputterMonat = daten();
kaputterMonat.meta.stichFest = true;
kaputterMonat.meta.stichmonat = '2026-8';
kaputterMonat.meta.geaendert = '2026-09-26T10:00:00.000Z';
lage = { art: 'da', stand: kaputterMonat };
await seite.evaluate(() => localStorage.removeItem('gaepp.tabelle.v1'));
await neuLaden();
const krumm = await stichLesen();
gleich('«2026-8» ist kein Monat — der Kalender uebernimmt', krumm.monat, kalenderMonat());
gleich('und festgesetzt ist nichts', krumm.fest, false);
pruef('das Blatt steht trotzdem da (Gegenprobe)',
  await seite.evaluate(() => document.querySelectorAll('table').length > 0), true);

await b.close(); server.close();
ende(fehler);
