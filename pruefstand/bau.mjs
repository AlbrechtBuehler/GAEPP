import { chromium } from 'playwright';
import { D, HEUTE } from './vorrat.mjs';

let gut = 0, schlecht = 0;
const pruef = (name, ok, ist) => {
  if (ok) { gut++; console.log('  gruen  ' + name); }
  else { schlecht++; console.log('  ROT    ' + name + (ist !== undefined ? '  →  ' + ist : '')); }
};

const b = await chromium.launch();
const p = await b.newPage();
const fehler = [];
p.on('pageerror', e => fehler.push('pageerror: ' + e.message));
p.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !/Failed to load resource/.test(t)) fehler.push('console: ' + t); });

await p.addInitScript(([d, h]) => {
  window.GAEPP_HEUTE = h;
  localStorage.setItem('gaepp.v1', JSON.stringify({ d, s: null }));
}, [D, HEUTE]);

await p.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);

const stelle = async (reiter, zeitraum, monat) => {
  await p.evaluate(([r, z, mo]) => {
    S.modus = 'tabellen'; S.reiter = r; S.zeitraum = z; S.jahr = 2026;
    if (mo !== null) S.monat = mo;
    zeichne();
  }, [reiter, zeitraum, monat === undefined ? null : monat]);
  await p.waitForTimeout(250);
};

console.log('\n1. Laden');
pruef('Daten sind angekommen', await p.evaluate(() => !!D && D.rechnungen.length === 4));
pruef('keine Skriptfehler beim Start', fehler.length === 0, fehler.join(' | '));

console.log('\n2. U-89 — Budget-Zeile bei den Verbindlichkeiten (Jahr 2026)');
await stelle('verbind', 'jahr');
const bud = await p.evaluate(() => {
  const r = [...document.querySelectorAll('.k-verbind .praster .r.bud')];
  if (!r.length) return null;
  return { name: r[0].querySelector('.p .t').textContent.trim(),
           zellen: [...r[0].querySelectorAll('.c')].map(c => c.textContent.trim()),
           total: r[0].querySelector('.j').textContent.trim(),
           klasse: r[0].querySelector('.j').className };
});
pruef('die Zeile steht da', bud !== null);
pruef('sie heisst «Saldo budgetiert»', bud && bud.name === 'Saldo budgetiert', bud && bud.name);
pruef('zwoelf Monatszellen', bud && bud.zellen.length === 12, bud && bud.zellen.length);
pruef('Januar zeigt +1’000 (5000 − 4000)', bud && bud.zellen[0] === "+1'000", bud && bud.zellen[0]);
pruef('Total zeigt +12’000', bud && bud.total === "+12'000", bud && bud.total);
pruef('Total traegt die Plus-Farbe', bud && /plus/.test(bud.klasse), bud && bud.klasse);
const tilg = await p.evaluate(() => [...document.querySelectorAll('.k-verbind .praster .r')]
  .map(r => (r.querySelector('.p .t') || r.querySelector('.p')).textContent.trim()));
pruef('die zwei Tilgungszeilen stehen unveraendert davor',
      tilg[1] === 'Je Monat' && tilg[2] === 'Kumuliert' && tilg[3] === 'Saldo budgetiert', tilg.join(' / '));

console.log('\n3. U-89 in «Alle Jahre»');
await stelle('verbind', 'alle');
const budA = await p.evaluate(() => {
  const r = document.querySelector('.k-verbind .praster .r.bud');
  return r ? { zellen: [...r.querySelectorAll('.c')].map(c => c.textContent.trim()),
               total: r.querySelector('.j').textContent.trim() } : null;
});
pruef('die Zeile steht auch dort', budA !== null);
pruef('2024 und 2025 sind nicht budgetiert und zeigen «–»',
      budA && budA.zellen[0] === '–' && budA.zellen[1] === '–', budA && budA.zellen.join(','));
pruef('2026 zeigt +12’000', budA && budA.zellen[2] === "+12'000", budA && budA.zellen.join(','));

console.log('\n4. U-90 — Summenkarte Rechnungen (August 2026)');
await stelle('rechnung', 'monat', 7);
const k = await p.evaluate(() => {
  const a = document.querySelector('.k-rechnung .streifen.summenkarte');
  if (!a) return null;
  const r = [...a.querySelectorAll('.praster .r')];
  const z = x => [...x.querySelectorAll('.c')].map(c => c.textContent.trim());
  return { gross: a.querySelector('.n.gross').textContent.trim(),
           hint: a.querySelector('.kbalken .p').textContent.trim(),
           kopf: z(r[0]), betrag: z(r[1]), anzahl: z(r[2]),
           betragTotal: r[1].querySelector('.j').textContent.trim(),
           anzahlTotal: r[2].querySelector('.j').textContent.trim(),
           vorTafel: !!a.closest('.k-rechnung').nextElementSibling };
});
pruef('die Karte steht da', k !== null);
pruef('Kopf: Erwartet · Erfasst · Erledigt',
      k && k.kopf.join('|') === 'Erwartet|Erfasst|Erledigt', k && k.kopf.join('|'));
pruef('Gesamttotal 650.00', k && k.gross === "650.00", k && k.gross);
pruef('Betrag erwartet 100.00', k && k.betrag[0] === '100.00', k && k.betrag.join('|'));
pruef('Betrag erfasst 250.00', k && k.betrag[1] === '250.00', k && k.betrag.join('|'));
pruef('Betrag erledigt 300.00', k && k.betrag[2] === '300.00', k && k.betrag.join('|'));
pruef('Betrag Total 650.00', k && k.betragTotal === '650.00', k && k.betragTotal);
pruef('Anzahl 1 / 2 / 1', k && k.anzahl.join('|') === '1|2|1', k && k.anzahl.join('|'));
pruef('Anzahl Total 4', k && k.anzahlTotal === '4', k && k.anzahlTotal);
pruef('die Karte steht VOR der Tafel', k && k.vorTafel);

console.log('\n5. U-90 — leerer Zeitraum zeigt keine Karte');
await stelle('rechnung', 'monat', 1);
pruef('im Februar steht keine Karte',
      await p.evaluate(() => !document.querySelector('.k-rechnung')));

console.log('\n6. U-90 — Klappen');
await stelle('rechnung', 'monat', 7);
await p.evaluate(() => document.querySelector('.k-rechnung [data-sklapp="rechnung"]').click());
await p.waitForTimeout(200);
pruef('zugeklappt verschwindet das Raster',
      await p.evaluate(() => !document.querySelector('.k-rechnung .praster')));
pruef('der Zustand steht in S.sZu',
      await p.evaluate(() => S.sZu.includes('rechnung')));
await p.evaluate(() => document.querySelector('.k-rechnung [data-sklapp="rechnung"]').click());
await p.waitForTimeout(200);
pruef('wieder aufgeklappt',
      await p.evaluate(() => !!document.querySelector('.k-rechnung .praster')));

console.log('\n7. U-91 — Vortrag nachziehen');
await stelle('verbind', 'jahr');
await p.evaluate(() => blattAuf ? blattAuf('schuld', 'v1') : null).catch(() => {});
const vt = await p.evaluate(() => {
  _blatt = { art:'schuld', id:'v1', reiter:'zahlung' };
  blattZeichnen();
  const b = document.querySelector('[data-vtzieh]');
  return { da: !!b, titel: b ? b.getAttribute('title') : '',
           wert: vortrag(verbind('v1'), 2026),
           gerechnet: rd(vortragGerechnet(verbind('v1'), 2026)) };
});
pruef('der Vortrag 2026 steht auf 9000', vt.wert === 9000, vt.wert);
pruef('durchgerechnet waeren es 7600', vt.gerechnet === 7600, vt.gerechnet);
pruef('der Knopf «Nachziehen» steht da', vt.da);
pruef('sein Titel nennt den Zielwert', /7[’’']600/.test(vt.titel || ''), vt.titel);
await p.evaluate(() => document.querySelector('[data-vtzieh]').click());
await p.waitForTimeout(250);
const nach = await p.evaluate(() => ({
  wert: vortrag(verbind('v1'), 2026),
  abw: vortragDifferenz(verbind('v1'), 2026),
  knopfWeg: !document.querySelector('[data-vtzieh]'),
  undoDa: !document.querySelector('#zurueck').hidden,
  undoText: (document.querySelector('#zurueck .tx') || {}).textContent
}));
pruef('nach dem Klick steht der Vortrag auf 7600', nach.wert === 7600, nach.wert);
pruef('die Abweichung ist null', Math.abs(nach.abw) < 0.005, nach.abw);
pruef('der Knopf ist weg, weil nichts mehr abweicht', nach.knopfWeg);
pruef('die Rueckgaengig-Leiste steht da', nach.undoDa);
pruef('sie nennt den Vorgang', /nachgezogen/.test(nach.undoText || ''), nach.undoText);
await p.evaluate(() => rueckgaengigTun());
await p.waitForTimeout(250);
pruef('Rueckgaengig stellt 9000 wieder her',
      await p.evaluate(() => vortrag(verbind('v1'), 2026)) === 9000);

console.log('\n8. Nichts kaputtgegangen');
for (const [r, z] of [['budget','jahr'],['budget','alle'],['budget','monat'],
                      ['verbind','monat'],['rechnung','jahr'],['rechnung','alle']]) {
  await stelle(r, z, 7);
}
await p.evaluate(() => { S.modus = 'dashboard'; zeichne(); });
await p.waitForTimeout(300);
pruef('alle Bereiche und Zoomstufen ohne Skriptfehler', fehler.length === 0, fehler.join(' | '));

console.log('\n' + '='.repeat(58));
console.log(`  ${gut} gruen, ${schlecht} rot`);
console.log('='.repeat(58));
console.log(`BILANZ bau ${gut} ${schlecht}`);
await b.close();
process.exit(schlecht ? 1 : 0);
