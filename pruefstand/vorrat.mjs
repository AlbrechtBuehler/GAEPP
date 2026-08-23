/* GAEPP — Pruefstand: der Pruefvorrat.
   Ein konstruierter Datenstand. Albrechts Zahlen kommen hier nicht vor — und
   seine Namen auch nicht. Die Glaeubiger heissen «Darlehen Blumberg», die
   Rechnungssteller «Oechsli Zahnpraxis»; die Betraege sind frei gewaehlt.

   Was der Vorrat absichtlich enthaelt, weil eine Grenze in den Vorrat gehoert
   und nicht in den Kopf dessen, der gerade baut:
     - einen Jahrgang ohne Rechnungen und einen mit
     - eine Sektion ohne eine einzige Zeile («Sparziele»)
     - eine Schuld, die auf null endet (Velohaus Kern)
     - eine Position ohne jeden Wert (Zulagen ausserhalb Februar)
     - Namen mit Umlaut am Wortanfang, mit Kleinschreibung und mit einer Ziffer
     - gesetzte Haken in einem Teil des Jahres, nicht im ganzen
     - alle vier Rechnungszustaende
   Wer eine neue Grenze baut, traegt sie hier ein. Sonst ist Gruen eine Aussage
   ueber den Vorrat und nicht ueber die App. */

const BESTAND = {
 "schemaVersion": 1,
 "meta": {
  "waehrung": "CHF",
  "stichmonat": "2026-08",
  "geaendert": "2026-08-23T09:00:00Z"
 },
 "jahre": [
  2024,
  2025,
  2026,
  2027,
  2028,
  2029
 ],
 "daten": {
  "2024": [
   {
    "id": "p1",
    "key": "einkommen",
    "name": "Einkommen",
    "art": "block",
    "vz": 1,
    "pos": [
     {
      "id": "p2",
      "key": "lohn",
      "name": "Lohn",
      "basis": 5200,
      "reihe": [
       5200,
       5200,
       5200,
       5200,
       5200,
       5200,
       5200,
       5200,
       5200,
       5200,
       5200,
       5200
      ]
     },
     {
      "id": "p3",
      "key": "lohn13",
      "name": "Lohn 13.er",
      "basis": 5200,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       5200
      ]
     },
     {
      "id": "p4",
      "key": "zulagen",
      "name": "Zulagen",
      "basis": 0,
      "reihe": [
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ]
     }
    ]
   },
   {
    "id": "p5",
    "key": "fixkosten",
    "name": "Fixkosten",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p6",
      "key": "miete",
      "name": "Miete | Nebenkosten",
      "basis": 1310,
      "reihe": [
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310
      ]
     },
     {
      "id": "p7",
      "key": "kk",
      "name": "Krankenkasse",
      "basis": 489,
      "reihe": [
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489
      ]
     },
     {
      "id": "p8",
      "key": "mobil",
      "name": "Mobile",
      "basis": 29,
      "reihe": [
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29
      ]
     },
     {
      "id": "p9",
      "key": "netz",
      "name": "Internet",
      "basis": 45,
      "reihe": [
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45
      ]
     },
     {
      "id": "p10",
      "key": "bahn",
      "name": "Bahnabo",
      "basis": 212,
      "reihe": [
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212
      ]
     },
     {
      "id": "p11",
      "key": "steuern",
      "name": "Steuern",
      "basis": 11000,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       1300,
       1300,
       3900
      ]
     }
    ]
   },
   {
    "id": "p12",
    "key": "lebenshaltung",
    "name": "Lebenshaltung",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p13",
      "key": "haushalt",
      "name": "Haushalt",
      "basis": 600,
      "reihe": [
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600
      ]
     },
     {
      "id": "p14",
      "key": "auswaerts",
      "name": "Auswärts",
      "basis": 120,
      "reihe": [
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120
      ]
     }
    ]
   },
   {
    "id": "p15",
    "key": "abonnements",
    "name": "Abonnements",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p16",
      "key": "abo_zeitung",
      "name": "Zeitung",
      "basis": 22,
      "reihe": [
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22
      ]
     },
     {
      "id": "p17",
      "key": "abo_musik",
      "name": "Musik",
      "basis": 16,
      "reihe": [
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16
      ]
     },
     {
      "id": "p18",
      "key": "abo_ablage",
      "name": "Ablage",
      "basis": 11,
      "reihe": [
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11
      ]
     }
    ]
   },
   {
    "id": "p19",
    "key": "rueckstellungen",
    "name": "Rückstellungen",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p20",
      "key": "rs_zahn",
      "name": "Zahnarzt",
      "basis": 1200,
      "reihe": [
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100
      ]
     },
     {
      "id": "p21",
      "key": "rs_geraete",
      "name": "Geräte",
      "basis": 960,
      "reihe": [
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80
      ]
     }
    ]
   },
   {
    "id": "p22",
    "key": "sparziele",
    "name": "Sparziele",
    "art": "block",
    "vz": -1,
    "pos": []
   },
   {
    "id": "p31",
    "key": "verbindlichkeiten",
    "name": "Verbindlichkeiten",
    "art": "schulden",
    "vz": -1,
    "gruppen": [
     {
      "id": "p25",
      "key": "steuer",
      "name": "Steuerverwaltung",
      "pos": [
       {
        "id": "p23",
        "key": "steueramt_nord",
        "name": "Steueramt Nord",
        "basis": 24000,
        "reihe": [
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500
        ]
       },
       {
        "id": "p24",
        "key": "steueramt_sued",
        "name": "Steueramt Süd",
        "basis": 7200,
        "reihe": [
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300
        ]
       }
      ]
     },
     {
      "id": "p27",
      "key": "privat",
      "name": "Schulden Privat",
      "pos": [
       {
        "id": "p26",
        "key": "blumberg",
        "name": "Darlehen Blumberg",
        "basis": 18000,
        "reihe": [
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150
        ]
       }
      ]
     },
     {
      "id": "p30",
      "key": "firmen",
      "name": "Schulden Firmen",
      "pos": [
       {
        "id": "p28",
        "key": "tremont",
        "name": "Kreditkasse Tremont",
        "basis": 9600,
        "reihe": [
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120
        ]
       },
       {
        "id": "p29",
        "key": "velo_kern",
        "name": "Velohaus Kern",
        "basis": 1800,
        "reihe": [
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60
        ]
       }
      ]
     }
    ]
   }
  ],
  "2025": [
   {
    "id": "p32",
    "key": "einkommen",
    "name": "Einkommen",
    "art": "block",
    "vz": 1,
    "pos": [
     {
      "id": "p33",
      "key": "lohn",
      "name": "Lohn",
      "basis": 5260,
      "reihe": [
       5260,
       5260,
       5260,
       5260,
       5260,
       5260,
       5260,
       5260,
       5260,
       5260,
       5260,
       5260
      ]
     },
     {
      "id": "p34",
      "key": "lohn13",
      "name": "Lohn 13.er",
      "basis": 5260,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       5260
      ]
     },
     {
      "id": "p35",
      "key": "zulagen",
      "name": "Zulagen",
      "basis": 0,
      "reihe": [
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ]
     }
    ]
   },
   {
    "id": "p36",
    "key": "fixkosten",
    "name": "Fixkosten",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p37",
      "key": "miete",
      "name": "Miete | Nebenkosten",
      "basis": 1310,
      "reihe": [
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310
      ]
     },
     {
      "id": "p38",
      "key": "kk",
      "name": "Krankenkasse",
      "basis": 489,
      "reihe": [
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489
      ]
     },
     {
      "id": "p39",
      "key": "mobil",
      "name": "Mobile",
      "basis": 29,
      "reihe": [
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29
      ]
     },
     {
      "id": "p40",
      "key": "netz",
      "name": "Internet",
      "basis": 45,
      "reihe": [
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45
      ]
     },
     {
      "id": "p41",
      "key": "bahn",
      "name": "Bahnabo",
      "basis": 212,
      "reihe": [
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212
      ]
     },
     {
      "id": "p42",
      "key": "steuern",
      "name": "Steuern",
      "basis": 11000,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       1300,
       1300,
       3900
      ]
     }
    ]
   },
   {
    "id": "p43",
    "key": "lebenshaltung",
    "name": "Lebenshaltung",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p44",
      "key": "haushalt",
      "name": "Haushalt",
      "basis": 600,
      "reihe": [
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600
      ]
     },
     {
      "id": "p45",
      "key": "auswaerts",
      "name": "Auswärts",
      "basis": 120,
      "reihe": [
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120
      ]
     }
    ]
   },
   {
    "id": "p46",
    "key": "abonnements",
    "name": "Abonnements",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p47",
      "key": "abo_zeitung",
      "name": "Zeitung",
      "basis": 22,
      "reihe": [
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22
      ]
     },
     {
      "id": "p48",
      "key": "abo_musik",
      "name": "Musik",
      "basis": 16,
      "reihe": [
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16
      ]
     },
     {
      "id": "p49",
      "key": "abo_ablage",
      "name": "Ablage",
      "basis": 11,
      "reihe": [
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11
      ]
     }
    ]
   },
   {
    "id": "p50",
    "key": "rueckstellungen",
    "name": "Rückstellungen",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p51",
      "key": "rs_zahn",
      "name": "Zahnarzt",
      "basis": 1200,
      "reihe": [
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100
      ]
     },
     {
      "id": "p52",
      "key": "rs_geraete",
      "name": "Geräte",
      "basis": 960,
      "reihe": [
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80
      ]
     }
    ]
   },
   {
    "id": "p53",
    "key": "sparziele",
    "name": "Sparziele",
    "art": "block",
    "vz": -1,
    "pos": []
   },
   {
    "id": "p62",
    "key": "verbindlichkeiten",
    "name": "Verbindlichkeiten",
    "art": "schulden",
    "vz": -1,
    "gruppen": [
     {
      "id": "p56",
      "key": "steuer",
      "name": "Steuerverwaltung",
      "pos": [
       {
        "id": "p54",
        "key": "steueramt_nord",
        "name": "Steueramt Nord",
        "basis": 0,
        "reihe": [
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500
        ]
       },
       {
        "id": "p55",
        "key": "steueramt_sued",
        "name": "Steueramt Süd",
        "basis": 0,
        "reihe": [
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300
        ]
       }
      ]
     },
     {
      "id": "p58",
      "key": "privat",
      "name": "Schulden Privat",
      "pos": [
       {
        "id": "p57",
        "key": "blumberg",
        "name": "Darlehen Blumberg",
        "basis": 0,
        "reihe": [
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150
        ]
       }
      ]
     },
     {
      "id": "p61",
      "key": "firmen",
      "name": "Schulden Firmen",
      "pos": [
       {
        "id": "p59",
        "key": "tremont",
        "name": "Kreditkasse Tremont",
        "basis": 0,
        "reihe": [
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120
        ]
       },
       {
        "id": "p60",
        "key": "velo_kern",
        "name": "Velohaus Kern",
        "basis": 0,
        "reihe": [
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60
        ]
       }
      ]
     }
    ]
   }
  ],
  "2026": [
   {
    "id": "p63",
    "key": "einkommen",
    "name": "Einkommen",
    "art": "block",
    "vz": 1,
    "pos": [
     {
      "id": "p64",
      "key": "lohn",
      "name": "Lohn",
      "basis": 5320,
      "reihe": [
       5320,
       5320,
       5320,
       5320,
       5320,
       5320,
       5320,
       5320,
       5320,
       5320,
       5320,
       5320
      ]
     },
     {
      "id": "p65",
      "key": "lohn13",
      "name": "Lohn 13.er",
      "basis": 5320,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       5320
      ]
     },
     {
      "id": "p66",
      "key": "zulagen",
      "name": "Zulagen",
      "basis": 0,
      "reihe": [
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ]
     }
    ]
   },
   {
    "id": "p67",
    "key": "fixkosten",
    "name": "Fixkosten",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p68",
      "key": "miete",
      "name": "Miete | Nebenkosten",
      "basis": 1310,
      "reihe": [
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310
      ]
     },
     {
      "id": "p69",
      "key": "kk",
      "name": "Krankenkasse",
      "basis": 489,
      "reihe": [
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489
      ]
     },
     {
      "id": "p70",
      "key": "mobil",
      "name": "Mobile",
      "basis": 29,
      "reihe": [
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29
      ]
     },
     {
      "id": "p71",
      "key": "netz",
      "name": "Internet",
      "basis": 45,
      "reihe": [
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45
      ]
     },
     {
      "id": "p72",
      "key": "bahn",
      "name": "Bahnabo",
      "basis": 212,
      "reihe": [
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212
      ]
     },
     {
      "id": "p73",
      "key": "steuern",
      "name": "Steuern",
      "basis": 11000,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       1300,
       1300,
       3900
      ]
     }
    ]
   },
   {
    "id": "p74",
    "key": "lebenshaltung",
    "name": "Lebenshaltung",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p75",
      "key": "haushalt",
      "name": "Haushalt",
      "basis": 600,
      "reihe": [
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600
      ]
     },
     {
      "id": "p76",
      "key": "auswaerts",
      "name": "Auswärts",
      "basis": 120,
      "reihe": [
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120
      ]
     }
    ]
   },
   {
    "id": "p77",
    "key": "abonnements",
    "name": "Abonnements",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p78",
      "key": "abo_zeitung",
      "name": "Zeitung",
      "basis": 22,
      "reihe": [
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22
      ]
     },
     {
      "id": "p79",
      "key": "abo_musik",
      "name": "Musik",
      "basis": 16,
      "reihe": [
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16
      ]
     },
     {
      "id": "p80",
      "key": "abo_ablage",
      "name": "Ablage",
      "basis": 11,
      "reihe": [
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11
      ]
     }
    ]
   },
   {
    "id": "p81",
    "key": "rueckstellungen",
    "name": "Rückstellungen",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p82",
      "key": "rs_zahn",
      "name": "Zahnarzt",
      "basis": 1200,
      "reihe": [
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100
      ]
     },
     {
      "id": "p83",
      "key": "rs_geraete",
      "name": "Geräte",
      "basis": 960,
      "reihe": [
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80
      ]
     }
    ]
   },
   {
    "id": "p84",
    "key": "sparziele",
    "name": "Sparziele",
    "art": "block",
    "vz": -1,
    "pos": []
   },
   {
    "id": "p93",
    "key": "verbindlichkeiten",
    "name": "Verbindlichkeiten",
    "art": "schulden",
    "vz": -1,
    "gruppen": [
     {
      "id": "p87",
      "key": "steuer",
      "name": "Steuerverwaltung",
      "pos": [
       {
        "id": "p85",
        "key": "steueramt_nord",
        "name": "Steueramt Nord",
        "basis": 0,
        "reihe": [
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500
        ]
       },
       {
        "id": "p86",
        "key": "steueramt_sued",
        "name": "Steueramt Süd",
        "basis": 0,
        "reihe": [
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300
        ]
       }
      ]
     },
     {
      "id": "p89",
      "key": "privat",
      "name": "Schulden Privat",
      "pos": [
       {
        "id": "p88",
        "key": "blumberg",
        "name": "Darlehen Blumberg",
        "basis": 0,
        "reihe": [
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150
        ]
       }
      ]
     },
     {
      "id": "p92",
      "key": "firmen",
      "name": "Schulden Firmen",
      "pos": [
       {
        "id": "p90",
        "key": "tremont",
        "name": "Kreditkasse Tremont",
        "basis": 0,
        "reihe": [
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120
        ]
       },
       {
        "id": "p91",
        "key": "velo_kern",
        "name": "Velohaus Kern",
        "basis": 0,
        "reihe": [
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60
        ]
       }
      ]
     }
    ]
   }
  ],
  "2027": [
   {
    "id": "p103",
    "key": "einkommen",
    "name": "Einkommen",
    "art": "block",
    "vz": 1,
    "pos": [
     {
      "id": "p104",
      "key": "lohn",
      "name": "Lohn",
      "basis": 5380,
      "reihe": [
       5380,
       5380,
       5380,
       5380,
       5380,
       5380,
       5380,
       5380,
       5380,
       5380,
       5380,
       5380
      ]
     },
     {
      "id": "p105",
      "key": "lohn13",
      "name": "Lohn 13.er",
      "basis": 5380,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       5380
      ]
     },
     {
      "id": "p106",
      "key": "zulagen",
      "name": "Zulagen",
      "basis": 0,
      "reihe": [
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ]
     }
    ]
   },
   {
    "id": "p107",
    "key": "fixkosten",
    "name": "Fixkosten",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p108",
      "key": "miete",
      "name": "Miete | Nebenkosten",
      "basis": 1310,
      "reihe": [
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310
      ]
     },
     {
      "id": "p109",
      "key": "kk",
      "name": "Krankenkasse",
      "basis": 489,
      "reihe": [
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489
      ]
     },
     {
      "id": "p110",
      "key": "mobil",
      "name": "Mobile",
      "basis": 29,
      "reihe": [
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29
      ]
     },
     {
      "id": "p111",
      "key": "netz",
      "name": "Internet",
      "basis": 45,
      "reihe": [
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45
      ]
     },
     {
      "id": "p112",
      "key": "bahn",
      "name": "Bahnabo",
      "basis": 212,
      "reihe": [
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212
      ]
     },
     {
      "id": "p113",
      "key": "steuern",
      "name": "Steuern",
      "basis": 11000,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       1300,
       1300,
       3900
      ]
     }
    ]
   },
   {
    "id": "p114",
    "key": "lebenshaltung",
    "name": "Lebenshaltung",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p115",
      "key": "haushalt",
      "name": "Haushalt",
      "basis": 600,
      "reihe": [
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600
      ]
     },
     {
      "id": "p116",
      "key": "auswaerts",
      "name": "Auswärts",
      "basis": 120,
      "reihe": [
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120
      ]
     }
    ]
   },
   {
    "id": "p117",
    "key": "abonnements",
    "name": "Abonnements",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p118",
      "key": "abo_zeitung",
      "name": "Zeitung",
      "basis": 22,
      "reihe": [
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22
      ]
     },
     {
      "id": "p119",
      "key": "abo_musik",
      "name": "Musik",
      "basis": 16,
      "reihe": [
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16
      ]
     },
     {
      "id": "p120",
      "key": "abo_ablage",
      "name": "Ablage",
      "basis": 11,
      "reihe": [
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11
      ]
     }
    ]
   },
   {
    "id": "p121",
    "key": "rueckstellungen",
    "name": "Rückstellungen",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p122",
      "key": "rs_zahn",
      "name": "Zahnarzt",
      "basis": 1200,
      "reihe": [
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100
      ]
     },
     {
      "id": "p123",
      "key": "rs_geraete",
      "name": "Geräte",
      "basis": 960,
      "reihe": [
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80
      ]
     }
    ]
   },
   {
    "id": "p124",
    "key": "sparziele",
    "name": "Sparziele",
    "art": "block",
    "vz": -1,
    "pos": []
   },
   {
    "id": "p133",
    "key": "verbindlichkeiten",
    "name": "Verbindlichkeiten",
    "art": "schulden",
    "vz": -1,
    "gruppen": [
     {
      "id": "p127",
      "key": "steuer",
      "name": "Steuerverwaltung",
      "pos": [
       {
        "id": "p125",
        "key": "steueramt_nord",
        "name": "Steueramt Nord",
        "basis": 0,
        "reihe": [
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500,
         500
        ]
       },
       {
        "id": "p126",
        "key": "steueramt_sued",
        "name": "Steueramt Süd",
        "basis": 0,
        "reihe": [
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300,
         300
        ]
       }
      ]
     },
     {
      "id": "p129",
      "key": "privat",
      "name": "Schulden Privat",
      "pos": [
       {
        "id": "p128",
        "key": "blumberg",
        "name": "Darlehen Blumberg",
        "basis": 0,
        "reihe": [
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150,
         150
        ]
       }
      ]
     },
     {
      "id": "p132",
      "key": "firmen",
      "name": "Schulden Firmen",
      "pos": [
       {
        "id": "p130",
        "key": "tremont",
        "name": "Kreditkasse Tremont",
        "basis": 0,
        "reihe": [
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120,
         120
        ]
       },
       {
        "id": "p131",
        "key": "velo_kern",
        "name": "Velohaus Kern",
        "basis": 0,
        "reihe": [
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60,
         60
        ]
       }
      ]
     }
    ]
   }
  ],
  "2028": [
   {
    "id": "p143",
    "key": "einkommen",
    "name": "Einkommen",
    "art": "block",
    "vz": 1,
    "pos": [
     {
      "id": "p144",
      "key": "lohn",
      "name": "Lohn",
      "basis": 5440,
      "reihe": [
       5440,
       5440,
       5440,
       5440,
       5440,
       5440,
       5440,
       5440,
       5440,
       5440,
       5440,
       5440
      ]
     },
     {
      "id": "p145",
      "key": "lohn13",
      "name": "Lohn 13.er",
      "basis": 5440,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       5440
      ]
     },
     {
      "id": "p146",
      "key": "zulagen",
      "name": "Zulagen",
      "basis": 0,
      "reihe": [
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ]
     }
    ]
   },
   {
    "id": "p147",
    "key": "fixkosten",
    "name": "Fixkosten",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p148",
      "key": "miete",
      "name": "Miete | Nebenkosten",
      "basis": 1310,
      "reihe": [
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310
      ]
     },
     {
      "id": "p149",
      "key": "kk",
      "name": "Krankenkasse",
      "basis": 489,
      "reihe": [
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489
      ]
     },
     {
      "id": "p150",
      "key": "mobil",
      "name": "Mobile",
      "basis": 29,
      "reihe": [
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29
      ]
     },
     {
      "id": "p151",
      "key": "netz",
      "name": "Internet",
      "basis": 45,
      "reihe": [
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45
      ]
     },
     {
      "id": "p152",
      "key": "bahn",
      "name": "Bahnabo",
      "basis": 212,
      "reihe": [
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212
      ]
     },
     {
      "id": "p153",
      "key": "steuern",
      "name": "Steuern",
      "basis": 11000,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       1300,
       1300,
       3900
      ]
     }
    ]
   },
   {
    "id": "p154",
    "key": "lebenshaltung",
    "name": "Lebenshaltung",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p155",
      "key": "haushalt",
      "name": "Haushalt",
      "basis": 600,
      "reihe": [
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600
      ]
     },
     {
      "id": "p156",
      "key": "auswaerts",
      "name": "Auswärts",
      "basis": 120,
      "reihe": [
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120
      ]
     }
    ]
   },
   {
    "id": "p157",
    "key": "abonnements",
    "name": "Abonnements",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p158",
      "key": "abo_zeitung",
      "name": "Zeitung",
      "basis": 22,
      "reihe": [
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22
      ]
     },
     {
      "id": "p159",
      "key": "abo_musik",
      "name": "Musik",
      "basis": 16,
      "reihe": [
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16
      ]
     },
     {
      "id": "p160",
      "key": "abo_ablage",
      "name": "Ablage",
      "basis": 11,
      "reihe": [
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11
      ]
     }
    ]
   },
   {
    "id": "p161",
    "key": "rueckstellungen",
    "name": "Rückstellungen",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p162",
      "key": "rs_zahn",
      "name": "Zahnarzt",
      "basis": 1200,
      "reihe": [
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100
      ]
     },
     {
      "id": "p163",
      "key": "rs_geraete",
      "name": "Geräte",
      "basis": 960,
      "reihe": [
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80
      ]
     }
    ]
   },
   {
    "id": "p164",
    "key": "sparziele",
    "name": "Sparziele",
    "art": "block",
    "vz": -1,
    "pos": []
   },
   {
    "id": "p173",
    "key": "verbindlichkeiten",
    "name": "Verbindlichkeiten",
    "art": "schulden",
    "vz": -1,
    "gruppen": [
     {
      "id": "p167",
      "key": "steuer",
      "name": "Steuerverwaltung",
      "pos": [
       {
        "id": "p165",
        "key": "steueramt_nord",
        "name": "Steueramt Nord",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       },
       {
        "id": "p166",
        "key": "steueramt_sued",
        "name": "Steueramt Süd",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       }
      ]
     },
     {
      "id": "p169",
      "key": "privat",
      "name": "Schulden Privat",
      "pos": [
       {
        "id": "p168",
        "key": "blumberg",
        "name": "Darlehen Blumberg",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       }
      ]
     },
     {
      "id": "p172",
      "key": "firmen",
      "name": "Schulden Firmen",
      "pos": [
       {
        "id": "p170",
        "key": "tremont",
        "name": "Kreditkasse Tremont",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       },
       {
        "id": "p171",
        "key": "velo_kern",
        "name": "Velohaus Kern",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       }
      ]
     }
    ]
   }
  ],
  "2029": [
   {
    "id": "p174",
    "key": "einkommen",
    "name": "Einkommen",
    "art": "block",
    "vz": 1,
    "pos": [
     {
      "id": "p175",
      "key": "lohn",
      "name": "Lohn",
      "basis": 5500,
      "reihe": [
       5500,
       5500,
       5500,
       5500,
       5500,
       5500,
       5500,
       5500,
       5500,
       5500,
       5500,
       5500
      ]
     },
     {
      "id": "p176",
      "key": "lohn13",
      "name": "Lohn 13.er",
      "basis": 5500,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       5500
      ]
     },
     {
      "id": "p177",
      "key": "zulagen",
      "name": "Zulagen",
      "basis": 0,
      "reihe": [
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ]
     }
    ]
   },
   {
    "id": "p178",
    "key": "fixkosten",
    "name": "Fixkosten",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p179",
      "key": "miete",
      "name": "Miete | Nebenkosten",
      "basis": 1310,
      "reihe": [
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310,
       1310
      ]
     },
     {
      "id": "p180",
      "key": "kk",
      "name": "Krankenkasse",
      "basis": 489,
      "reihe": [
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489,
       489
      ]
     },
     {
      "id": "p181",
      "key": "mobil",
      "name": "Mobile",
      "basis": 29,
      "reihe": [
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29,
       29
      ]
     },
     {
      "id": "p182",
      "key": "netz",
      "name": "Internet",
      "basis": 45,
      "reihe": [
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45,
       45
      ]
     },
     {
      "id": "p183",
      "key": "bahn",
      "name": "Bahnabo",
      "basis": 212,
      "reihe": [
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212,
       212
      ]
     },
     {
      "id": "p184",
      "key": "steuern",
      "name": "Steuern",
      "basis": 11000,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       1300,
       1300,
       3900
      ]
     }
    ]
   },
   {
    "id": "p185",
    "key": "lebenshaltung",
    "name": "Lebenshaltung",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p186",
      "key": "haushalt",
      "name": "Haushalt",
      "basis": 600,
      "reihe": [
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600,
       600
      ]
     },
     {
      "id": "p187",
      "key": "auswaerts",
      "name": "Auswärts",
      "basis": 120,
      "reihe": [
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120,
       120
      ]
     }
    ]
   },
   {
    "id": "p188",
    "key": "abonnements",
    "name": "Abonnements",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p189",
      "key": "abo_zeitung",
      "name": "Zeitung",
      "basis": 22,
      "reihe": [
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22,
       22
      ]
     },
     {
      "id": "p190",
      "key": "abo_musik",
      "name": "Musik",
      "basis": 16,
      "reihe": [
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16,
       16
      ]
     },
     {
      "id": "p191",
      "key": "abo_ablage",
      "name": "Ablage",
      "basis": 11,
      "reihe": [
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11,
       11
      ]
     }
    ]
   },
   {
    "id": "p192",
    "key": "rueckstellungen",
    "name": "Rückstellungen",
    "art": "block",
    "vz": -1,
    "pos": [
     {
      "id": "p193",
      "key": "rs_zahn",
      "name": "Zahnarzt",
      "basis": 1200,
      "reihe": [
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100,
       100
      ]
     },
     {
      "id": "p194",
      "key": "rs_geraete",
      "name": "Geräte",
      "basis": 960,
      "reihe": [
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80,
       80
      ]
     }
    ]
   },
   {
    "id": "p195",
    "key": "sparziele",
    "name": "Sparziele",
    "art": "block",
    "vz": -1,
    "pos": []
   },
   {
    "id": "p204",
    "key": "verbindlichkeiten",
    "name": "Verbindlichkeiten",
    "art": "schulden",
    "vz": -1,
    "gruppen": [
     {
      "id": "p198",
      "key": "steuer",
      "name": "Steuerverwaltung",
      "pos": [
       {
        "id": "p196",
        "key": "steueramt_nord",
        "name": "Steueramt Nord",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       },
       {
        "id": "p197",
        "key": "steueramt_sued",
        "name": "Steueramt Süd",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       }
      ]
     },
     {
      "id": "p200",
      "key": "privat",
      "name": "Schulden Privat",
      "pos": [
       {
        "id": "p199",
        "key": "blumberg",
        "name": "Darlehen Blumberg",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       }
      ]
     },
     {
      "id": "p203",
      "key": "firmen",
      "name": "Schulden Firmen",
      "pos": [
       {
        "id": "p201",
        "key": "tremont",
        "name": "Kreditkasse Tremont",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       },
       {
        "id": "p202",
        "key": "velo_kern",
        "name": "Velohaus Kern",
        "basis": 0,
        "reihe": [
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0,
         0
        ]
       }
      ]
     }
    ]
   }
  ]
 },
 "rechnungen": {
  "2024": [],
  "2025": [],
  "2026": [
   {
    "id": "p94",
    "name": "Öchsli Zahnpraxis",
    "rechnungen": [
     {
      "id": "p95",
      "zweck": "Kontrolle",
      "datum": "12.03.2026",
      "betrag": 180,
      "reihe": [
       0,
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ],
      "stand": "Bezahlt"
     },
     {
      "id": "p96",
      "zweck": "Behandlung",
      "datum": "04.08.2026",
      "betrag": 940,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       470,
       470,
       0,
       0,
       0
      ],
      "stand": "Offen"
     }
    ]
   },
   {
    "id": "p97",
    "name": "Ärnst AG",
    "rechnungen": [
     {
      "id": "p98",
      "zweck": "Reparatur",
      "datum": "22.06.2026",
      "betrag": 365,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       365,
       0,
       0,
       0,
       0,
       0,
       0
      ],
      "stand": "Bank"
     }
    ]
   },
   {
    "id": "p99",
    "name": "nordmann",
    "rechnungen": [
     {
      "id": "p100",
      "zweck": "Möbel",
      "datum": "09.09.2026",
      "betrag": 1240,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       620,
       620,
       0,
       0
      ],
      "stand": "Nicht eingetroffen"
     }
    ]
   },
   {
    "id": "p101",
    "name": "Gerber 2",
    "rechnungen": [
     {
      "id": "p102",
      "zweck": "Service",
      "datum": "17.02.2026",
      "betrag": 95,
      "reihe": [
       0,
       95,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ],
      "stand": "Bezahlt"
     }
    ]
   }
  ],
  "2027": [
   {
    "id": "p134",
    "name": "Öchsli Zahnpraxis",
    "rechnungen": [
     {
      "id": "p135",
      "zweck": "Kontrolle",
      "datum": "12.03.2027",
      "betrag": 180,
      "reihe": [
       0,
       0,
       180,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ],
      "stand": "Bezahlt"
     },
     {
      "id": "p136",
      "zweck": "Behandlung",
      "datum": "04.08.2027",
      "betrag": 940,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       470,
       470,
       0,
       0,
       0
      ],
      "stand": "Offen"
     }
    ]
   },
   {
    "id": "p137",
    "name": "Ärnst AG",
    "rechnungen": [
     {
      "id": "p138",
      "zweck": "Reparatur",
      "datum": "22.06.2027",
      "betrag": 365,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       365,
       0,
       0,
       0,
       0,
       0,
       0
      ],
      "stand": "Bank"
     }
    ]
   },
   {
    "id": "p139",
    "name": "nordmann",
    "rechnungen": [
     {
      "id": "p140",
      "zweck": "Möbel",
      "datum": "09.09.2027",
      "betrag": 1240,
      "reihe": [
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       620,
       620,
       0,
       0
      ],
      "stand": "Nicht eingetroffen"
     }
    ]
   },
   {
    "id": "p141",
    "name": "Gerber 2",
    "rechnungen": [
     {
      "id": "p142",
      "zweck": "Service",
      "datum": "17.02.2027",
      "betrag": 95,
      "reihe": [
       0,
       95,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0
      ],
      "stand": "Bezahlt"
     }
    ]
   }
  ],
  "2028": [],
  "2029": []
 },
 "haken": {
  "p64:0": true,
  "p64:1": true,
  "p64:2": true,
  "p64:3": true,
  "p64:4": true,
  "p64:5": true,
  "p64:6": true,
  "p68:0": true,
  "p68:1": true,
  "p68:2": true,
  "p68:3": true,
  "p68:4": true,
  "p68:5": true,
  "p68:6": true,
  "p69:0": true,
  "p69:1": true,
  "p69:2": true,
  "p69:3": true,
  "p69:4": true,
  "p69:5": true,
  "p69:6": true,
  "p85:0": true,
  "p85:1": true,
  "p85:2": true,
  "p85:3": true,
  "p85:4": true,
  "p85:5": true,
  "p85:6": true,
  "p86:0": true,
  "p86:1": true,
  "p86:2": true,
  "p86:3": true,
  "p86:4": true,
  "p86:5": true,
  "p86:6": true,
  "p88:0": true,
  "p88:1": true,
  "p88:2": true,
  "p88:3": true,
  "p88:4": true,
  "p88:5": true,
  "p88:6": true,
  "p90:0": true,
  "p90:1": true,
  "p90:2": true,
  "p90:3": true,
  "p90:4": true,
  "p90:5": true,
  "p90:6": true,
  "p91:0": true,
  "p91:1": true,
  "p91:2": true,
  "p91:3": true,
  "p91:4": true,
  "p91:5": true,
  "p91:6": true
 }
};

/* Jeder Lauf bekommt eine eigene, frische Abschrift — ein Lauf, der den
   Bestand veraendert, darf den naechsten nicht anstecken. */
export const daten = () => JSON.parse(JSON.stringify(BESTAND));

/* Was die Laeufe ueber den Vorrat wissen muessen, steht hier einmal und nicht
   in jedem Lauf abgeschrieben. */
export const STICHMONAT = BESTAND.meta.stichmonat;
export const STICHJAHR  = parseInt(STICHMONAT.slice(0,4), 10);
export const STICHM     = parseInt(STICHMONAT.slice(5,7), 10) - 1;
export const JAHRE      = BESTAND.jahre.slice();
