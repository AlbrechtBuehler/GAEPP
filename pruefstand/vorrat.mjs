/* GAEPP — Pruefstand: der Datenvorrat.

   Neu gebaut am 22.08.2026 fuer das Tabellenwerkzeug. Der alte Vorrat trug das
   Schema der abgeloesten App (Konten, Buchungen, Serien) und ist gegenstandslos.

   ALBRECHTS ZAHLEN UND NAMEN KOMMEN HIER NICHT VOR — weder Glaeubiger noch
   Betraege noch Rechnungssteller. Alles hier ist erfunden und so gewaehlt, dass
   die Rechnung von Hand nachvollziehbar bleibt.

   Der Aufbau der Jahrgaenge ist Absicht:
     2025  Geruest ohne eine einzige Zahl  -> prueft «Kein Vortrag heisst kein Eintrag»
     2026  gefuellt                        -> der Arbeitsjahrgang
     2027  Geruest mit fortgeschriebenen Raten, Basis geerbt
*/

export const HEUTE = '2026-08-22';
export const STICHMONAT = '2026-08';

const N12 = () => new Array(12).fill(0);
const alle = v => new Array(12).fill(v);

let n = 0;
const id = () => 'p' + (++n);

/* ---- Aufbau je Jahrgang -------------------------------------------------- */

const BLOECKE = [
  { key:'einkommen', name:'Einkommen', vz:1, pos:[
    { key:'nettolohn', name:'Nettolohn' },
    { key:'nebenerwerb', name:'Nebenerwerb' }
  ]},
  { key:'fixkosten', name:'Fixkosten', vz:-1, pos:[
    { key:'miete', name:'Miete' },
    { key:'strom', name:'Strom' },
    { key:'versicherung', name:'Versicherung' }
  ]},
  { key:'lebenshaltung', name:'Lebenshaltung', vz:-1, pos:[
    { key:'haushalt', name:'Haushalt' }
  ]},
  { key:'abonnements', name:'Abonnements', vz:-1, pos:[
    { key:'mobil', name:'Mobilfunk' },
    { key:'streaming', name:'Streaming' }
  ]},
  { key:'rueckstellungen', name:'Rückstellungen', vz:-1, pos:[
    { key:'steuern', name:'Steuern laufendes Jahr' },
    { key:'zahnarzt', name:'Zahnarzt' }
  ]},
  { key:'sparziele', name:'Sparziele', vz:-1, pos:[] }
];

const GRUPPEN = [
  { key:'steuerverwaltung', name:'Steuerverwaltung', pos:[
    { key:'steuerplan', name:'Steuerplan Nordwind' }
  ]},
  { key:'privat', name:'Schulden Privat', pos:[
    { key:'darlehen', name:'Darlehen Blumberg' }
  ]},
  { key:'firmen', name:'Schulden Firmen', pos:[
    { key:'kredit', name:'Kredit Talgut' },
    { key:'rate', name:'Ratenkauf Zwyssig' }
  ]}
];

/* Zahlen des Arbeitsjahrgangs 2026 — frei gewaehlt, glatt, von Hand nachrechenbar. */
const WERTE_2026 = {
  nettolohn: alle(5200), nebenerwerb: N12(),
  miete: alle(1450), strom: alle(90), versicherung: alle(210),
  haushalt: alle(700),
  mobil: alle(45), streaming: alle(20),
  steuern: N12(), zahnarzt: N12()
};

/* Schulden 2026: Anfangsstand und Monatsrate.
   steuerplan  12000 − 12×400 = 7200 Rest
   darlehen     9000 − 12×250 = 6000 Rest
   kredit       3600 − 12×300 =    0 Rest  (laeuft aus)
   rate         1200 − 12×100 =    0 Rest  (laeuft aus)  */
const SCHULD_2026 = {
  steuerplan: { basis:12000, rate:400 },
  darlehen:   { basis:9000,  rate:250 },
  kredit:     { basis:3600,  rate:300 },
  rate:       { basis:1200,  rate:100 }
};

/* 2027 schreibt die Raten fort, die Basis wird geerbt (nicht getippt). */
const SCHULD_2027 = {
  steuerplan: { basis:0, rate:400 },
  darlehen:   { basis:0, rate:250 },
  kredit:     { basis:0, rate:0 },
  rate:       { basis:0, rate:0 }
};

function jahrgang(werte, schuld) {
  const out = BLOECKE.map(b => ({
    id: id(), art:'block', name:b.name, key:b.key, vz:b.vz,
    pos: b.pos.map(p => ({ id:id(), key:p.key, name:p.name,
      basis: (werte && werte[p.key + ':basis']) || 0,
      reihe: (werte && werte[p.key] ? werte[p.key].slice() : N12()) }))
  }));
  out.push({
    id: id(), art:'schulden', name:'Verbindlichkeiten', key:'verbindlichkeiten', vz:-1,
    gruppen: GRUPPEN.map(g => ({ id:id(), name:g.name, key:g.key,
      pos: g.pos.map(p => ({ id:id(), key:p.key, name:p.name,
        basis: schuld && schuld[p.key] ? schuld[p.key].basis : 0,
        reihe: schuld && schuld[p.key] && schuld[p.key].rate
          ? alle(schuld[p.key].rate) : N12() })) }))
  });
  return out;
}

/* Basis-Werte fuer den Doppelklick-Versuch: Rueckstellungen tragen eine Basis,
   aber keine Monatswerte — genau der Fall, den «verteilen» loest. */
const WERTE_2026_MIT_BASIS = Object.assign({}, WERTE_2026, {
  'steuern:basis': 5000,     /* 5000 / 12 = 416.67 -> auf volle Zehner aufgerundet: 420 */
  'zahnarzt:basis': 1200,    /* 1200 / 12 = 100    -> bleibt 100 */
  'nettolohn:basis': 5200
});

export function daten() {
  n = 0;
  return {
    schemaVersion: 1,
    meta: { waehrung:'CHF', stichmonat:STICHMONAT, geaendert:'2026-08-22T00:00:00.000Z' },
    jahre: [2025, 2026, 2027],
    daten: {
      2025: jahrgang(null, null),
      2026: jahrgang(WERTE_2026_MIT_BASIS, SCHULD_2026),
      2027: jahrgang(null, SCHULD_2027)
    },
    rechnungen: {
      2025: [],
      2026: [
        { id:'r-oechsli', name:'Öchsli Zahnpraxis', rechnungen: [
          { id:'r-oe-1', zweck:'Kontrolle', datum:'2026-03-04', betrag:240,
            reihe:[0,0,240,0,0,0,0,0,0,0,0,0], stand:'Offen' },
          { id:'r-oe-2', zweck:'Behandlung', datum:'2026-05-11', betrag:900,
            reihe:[0,0,0,0,300,300,300,0,0,0,0,0], stand:'Offen' }
        ]},
        { id:'r-aernst', name:'Ärnst AG', rechnungen: [
          { id:'r-ae-1', zweck:'Service', datum:'2026-02-02', betrag:180,
            reihe:[0,180,0,0,0,0,0,0,0,0,0,0], stand:'Bezahlt' }
        ]},
        { id:'r-nordmann', name:'nordmann', rechnungen: [] }
      ],
      2027: []
    },
    haken: {}
  };
}

/* Die erwarteten Zahlen — hergeleitet, nicht aus einem Lauf abgeschrieben. */
export const ERWARTET = {
  rest2026: { steuerplan: 12000 - 12*400, darlehen: 9000 - 12*250, kredit: 0, rate: 0 },
  basis2027: { steuerplan: 7200, darlehen: 6000, kredit: 0, rate: 0 },
  rest2027: { steuerplan: 7200 - 12*400, darlehen: 6000 - 12*250 },
  proMonatSteuern: Math.ceil(5000 / 12 / 10) * 10,     /* 420 */
  proMonatZahnarzt: Math.ceil(1200 / 12 / 10) * 10     /* 100 */
};
