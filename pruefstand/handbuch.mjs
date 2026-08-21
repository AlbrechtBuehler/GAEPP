import { chromium } from 'playwright';
import { D, HEUTE } from './vorrat.mjs';
let gut=0, schlecht=0;
const pruef=(n,ok,ist)=>{ ok?(gut++,console.log('  gruen  '+n)):(schlecht++,console.log('  ROT    '+n+(ist!==undefined?'  →  '+ist:''))); };
const b = await chromium.launch();
const p = await b.newPage({ viewport:{ width:1500, height:1000 } });
const fehler=[];
p.on('pageerror', e => fehler.push('pageerror: '+e.message));
p.on('console', m => { const t=m.text(); if (m.type()==='error' && !/Failed to load resource/.test(t)) fehler.push(t); });
await p.addInitScript(([d,h]) => { window.GAEPP_HEUTE=h;
  localStorage.setItem('gaepp.v1', JSON.stringify({ d, s:null })); }, [D, HEUTE]);
await p.goto('http://127.0.0.1:8099/index.html', { waitUntil:'load' });
await p.waitForTimeout(600);
await p.evaluate(() => { try{dialogZu();}catch(e){} });
await p.evaluate(() => document.querySelector('#btnHandbuch').click());
await p.waitForTimeout(400);

console.log('\nHandbuch');
const h = await p.evaluate(() => {
  const hb = document.querySelector('.hb');
  if (!hb) return null;
  const regeln = [...hb.querySelectorAll('.regel h3')].map(x => x.textContent.trim());
  const nav = [...hb.querySelectorAll('.hbnav button')].map(x => x.dataset.hbnav);
  const anker = [...hb.querySelectorAll('[id]')].map(x => x.id);
  return { regeln, nav, anker, text: hb.textContent, zeichen: hb.textContent.length };
});
pruef('das Blatt geht auf', h !== null);
pruef('achtzehn Regeln', h && h.regeln.length === 18, h && h.regeln.length);
pruef('die Einleitung nennt achtzehn', h && /Achtzehn Regeln/.test(h.text));
pruef('jeder Verzeichniseintrag findet sein Ziel',
      h && h.nav.every(n => h.anker.includes(n)),
      h && h.nav.filter(n => !h.anker.includes(n)).join(','));
pruef('das Verzeichnis führt 21 Einträge (18 Regeln + 3 Abschnitte)', h && h.nav.length === 21, h && h.nav.length);

console.log('\nWas nicht mehr drinstehen darf');
pruef('kein «≠» mehr (mit U-62 entfallen)', h && !/≠/.test(h.text));
pruef('keine Kappung mehr versprochen', h && !/gekürzt, was noch offen/.test(h.text));
pruef('«ein Knopf je Posten» ist weg', h && !/mit einem Knopf je\s+Posten/.test(h.text.replace(/\s+/g,' ')));

console.log('\nWas neu drinstehen muss');
for (const [was, muster] of [
  ['die drei Zustände', /erwartet.*erfasst.*erledigt/s],
  ['Freigeben mit Ausführungsdatum', /Ausführungsdatum/],
  ['die Widerspruchsliste', /in beide Richtungen/],
  ['die Vorschau auf der Kontokachel', /Vorschau/],
  ['Grün im Budgetraster', /dieser Monat ist fertig|Monat ist\s+fertig/],
  ['«ausgebucht» bei einer Schuld', /ausgebucht/],
  ['der Knopf «Nachziehen»', /Nachziehen/],
  ['die dritte Zeile bei den Verbindlichkeiten', /dritte Zeile/],
  ['die Karte über den Rechnungen', /ein drittes Mal/],
  ['der Unterordner «Bezahlt»', /Unterordner/],
  ['Mintgrün und Grün sind derselbe Ton', /derselbe Farbton/],
  ['der Richtungsschalter', /Richtungsschalter/],
]) pruef(was, h && muster.test(h.text));

console.log('\nDas Verzeichnis springt');
const vorher = await p.evaluate(() => document.querySelector('.blatt-koerper, .blatt .kb, .hb').closest('[style],div').scrollTop);
await p.evaluate(() => document.querySelector('[data-hbnav="hb18"]').click());
await p.waitForTimeout(600);
const sichtbar = await p.evaluate(() => {
  const z = document.getElementById('hb18'); if (!z) return false;
  const r = z.getBoundingClientRect();
  return r.top > -50 && r.top < window.innerHeight;
});
pruef('Klick auf «18» bringt Regel 18 ins Bild', sichtbar);
pruef('die Adresszeile bleibt sauber (kein #anker)',
      await p.evaluate(() => location.hash === ''), await p.evaluate(() => location.hash));

console.log('\nKeine Skriptfehler');
pruef('sauber', fehler.length === 0, fehler.join(' | '));
console.log(`\n  ${gut} gruen, ${schlecht} rot   ·   Handbuch ${h ? h.zeichen : '?'} Zeichen`);
console.log(`BILANZ handbuch ${gut} ${schlecht}`);
await b.close();
process.exit(schlecht?1:0);
