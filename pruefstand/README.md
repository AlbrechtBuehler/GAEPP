# GÄPP — Prüfstand

**Neu aufgebaut am 21.08.2026.** Der alte Prüfstand mit 1'191 Prüfungen ist nicht
wiederhergestellt worden — er lag in keinem der beiden Repos und war seit dem
18.08.2026 nicht mehr gefahren. Was hier steht, ist gemessen an
`index.html` mit SHA-256 `25933bde…` (784'677 Bytes, `SCHEMA_APP` 7, höchste Marke U-94).

## Fahren

Der Ordner liegt **neben** `index.html`, im öffentlichen Repo:

```
GAEPP/
  index.html
  pruefstand/
```

Einmalig:

```
cd pruefstand
npm install
npx playwright install chromium
```

Danach, aus dem Ordner `pruefstand/`:

```
npm test
```

Das startet den Webserver selbst, fährt alle Läufe und rechnet die Bilanz nach.
**Ein Befehl** — das ist Absicht. Ein Prüfstand, den man zusammensuchen muss, wird
nicht gefahren; das ist in vier Tagen fünfmal belegt.

## Die Läufe

| Datei | Was er prüft | Browser |
| --- | --- | --- |
| `huelle.mjs` | **A-78** — keine Beträge, keine Kontonummern, keine Belege in der ausgelieferten Datei. Mit Gegenprobe. | nein |
| `bau.mjs` | **U-89 bis U-93** — Budgetzeile bei den Verbindlichkeiten, Summenkarte über den Rechnungen, «Nachziehen» am Saldovortrag samt Rückgängig | ja |
| `handbuch.mjs` | **U-94** — achtzehn Regeln, Verzeichnis, Sprung, keine überholten Aussagen | ja |

`vorrat.mjs` hält den **konstruierten** Datenstand. **Albrechts echte Daten kommen
hier nicht vor** und dürfen es auch nie — das ist derselbe Grundsatz wie A-78.

## Die Hausregeln

1. **Gemessen wird die Wirkung, nicht der Quelltext.** Der Text in der Zelle, die
   berechnete Farbe, der Datenstand nach einem echten Klick — nicht die CSS-Klasse
   und nicht die Pixelzahl.
2. **Ein neuer Lauf wird in `alles.mjs` eingetragen, sonst zählt er nicht mit.**
3. **Die Gesamtzahl wird nachgerechnet, nie fortgeschrieben.** Sie steht deshalb in
   keinem Dokument als Konstante, sondern nur unten im Ergebnis des Sammellaufs.
4. **Was aus dem Code gelesen wird, veraltet nicht. Was abgeschrieben ist, veraltet
   immer.** Wo eine Prüfung eine Zahl oder einen Namen nennt, die der Code führt,
   wird sie interpoliert und nicht getippt.
5. **Der Prüfstand gehört ins öffentliche Repo, neben die Datei, die er prüft.**
   A-78 verlangt, dass **die `index.html`** keine Daten trägt — nicht, dass im Repo
   nichts anderes liegen darf. Ins **private** Repo gehört er nicht: A-79 sagt dort
   wörtlich «die JSON-Datei — und sonst nichts».

## Was er ausdrücklich nicht prüft

Belegablage im Ordner · Beleglesen aus PDF · GitHub-Sync · Tagessicherung ·
Druckausgabe · das helle Farbschema · Albrechts echten Datenstand · das Verhalten
im Schreibschutz (`_ro`).

**Der Rechenkern ist nicht abgedeckt.** Der alte Prüfstand hatte dafür `rechnen.mjs`
(97), `faltung.mjs` (183) und `ausab.mjs` (73). Diese Läufe sind **nicht**
nachgebaut — das ist die grösste bekannte Lücke dieses Prüfstands und steht hier,
damit niemand die Zahl unten für Vollständigkeit hält.
