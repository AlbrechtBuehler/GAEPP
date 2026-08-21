export const HEUTE = '2026-08-21';
const m = v => ({ m: Array(12).fill(v) });
export const D = {
  meta: { schemaVersion: 7, geaendert: '2026-08-21T00:00:00Z' },
  konten: [
    {id:'hhk',   nr:'03', name:'HHK',        art:'frei',       anfangsstand:1000, aktiv:true, dokumente:[], bankwerte:{}},
    {id:'kred',  nr:'05', name:'Kreditoren', art:'kreditoren', anfangsstand:0,    aktiv:true, dokumente:[], bankwerte:{}},
    {id:'schuld',nr:'08', name:'Schulden',   art:'schuld',     anfangsstand:0,    aktiv:true, dokumente:[], bankwerte:{}}
  ],
  kategorien: [
    {id:'kEin', name:'Einkommen', richtung:'ein', kontoId:'hhk', rang:1, aktiv:true},
    {id:'kAus', name:'Haushalt',  richtung:'aus', kontoId:'hhk', rang:2, aktiv:true}
  ],
  zeilen: [
    {id:'zLohn',  kategorieId:'kEin', name:'Lohn',  rang:1, aktiv:true, zahlungsweg:''},
    {id:'zEssen', kategorieId:'kAus', name:'Essen', rang:1, aktiv:true, zahlungsweg:''}
  ],
  budget: { '2024': {}, '2025': {}, '2026': { zLohn: m(5000), zEssen: m(4000) } },
  verbindlichkeiten: [
    {id:'v1', name:'Testschuld', gruppe:'privat', anfangsstand:10000,
     anfangsdatum:'2024-01-01',
     raten:{ '2024':{m:Array(12).fill(100),soll:100}, '2025':{m:Array(12).fill(100),soll:100},
              '2026':{m:Array(12).fill(100),soll:100} },
     staende:{ '2026': 9000 },
     erhoehungen:[], zinssatz:null, gebuehr:null, gebuehrAb:null,
     kontoId:'schuld', aktiv:true, dokumente:[], herkunft:'belegt', hinweis:'',
     auszugswert:null, auszugsdatum:null, vereinbarungBis:null, ausAb:null,
     vertreter:'', nominal:null}
  ],
  rechnungssteller: [{id:'s1', name:'Testfirma', aktiv:true, kontoId:'kred', zeileId:''}],
  rechnungen: [
    {id:'r1', stellerId:'s1', betrag:100, faelligkeit:'2026-08-10', status:'erwartet',
     kontoId:'kred', zeileId:'', verbId:null, rueckstellung:false, dokumente:[], beleg:'', nummer:''},
    {id:'r2', stellerId:'s1', betrag:200, faelligkeit:'2026-08-15', status:'erfasst',
     kontoId:'kred', zeileId:'', verbId:null, rueckstellung:false, dokumente:[], beleg:'', nummer:''},
    {id:'r3', stellerId:'s1', betrag:50,  faelligkeit:'2026-08-20', status:'erfasst',
     kontoId:'kred', zeileId:'', verbId:null, rueckstellung:false, dokumente:[], beleg:'', nummer:''},
    {id:'r4', stellerId:'s1', betrag:300, faelligkeit:'2026-08-05', status:'erledigt',
     kontoId:'kred', zeileId:'', verbId:null, rueckstellung:false, dokumente:[], beleg:'', nummer:''}
  ],
  buchungen: [], sparziele: [], serien: []
};
