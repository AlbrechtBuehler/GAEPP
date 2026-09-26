# GÄPP — Prüfstand

**Nachgeführt am 26.09.2026**, zu Fassung 3.3.0 (Stichmonat aus dem Kalender, Erlass getrennt von Tilgung, Anfangsstand im Band). Was
hier steht, prüft die heutige `index.html` — Version, Stände und Farben werden dabei
aus ihrem Quelltext gelesen, nie abgeschrieben (Hausregel 4).

> Die Fassung vom 23.08.2026 stand zu 3.0.0 und nannte in Hausregel 8 einen
> «gestellten Tag». Gestellt war nie etwas: `hilfe.mjs` setzte Sprache und Zeitzone,
> den Kalender liess es laufen. Solange der Stichmonat fest im Zustand stand, fiel
> das nicht auf — **und genau deshalb blieb GÄPP im August stehen.** Beides ist
> unten richtiggestellt.

> Die Fassung dieser Datei vom 22.08.2026 beschrieb einen anderen Prüfstand: drei
> Läufe statt zehn, drei Jahrgänge im Vorrat statt sechs, «hell» als Vorgabeschema,
> `rechnen.mjs` als noch fehlend. Sie ist Wort für Wort überholt und darum ersetzt,
> nicht ergänzt. **Das ist derselbe Fall wie F-16:** abgeschriebener Text, der
> veraltet, während der Code weiterläuft.

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

Das fährt alle elf Läufe nacheinander und rechnet die Bilanz nach. **Ein Befehl** —
das ist Absicht. Ein Prüfstand, den man zusammensuchen muss, wird nicht gefahren.

`alles.mjs` startet **keinen eigenen Webserver**: Jeder Lauf, der einen Browser
braucht, bedient sich selbst über `hilfe.mjs` (`serve()`) auf seinem eigenen Port.
Das hält die Läufe unabhängig — `node rahmen.mjs` von Hand liefert genau dasselbe
wie derselbe Lauf innerhalb von `npm test`.

Ist ein Chromium schon auf dem Rechner, nimmt ihn `GAEPP_CHROME=/pfad/zu/chrome`;
ohne die Variable holt sich Playwright seinen eigenen.

## Die elf Läufe

| Datei | Was er prüft | Port | Browser |
| --- | --- | ---: | --- |
| `huelle.mjs` | **A-78** — keine Beträge, keine Kontonummern, keine Belege, keine IBAN, keine E-Mail in der ausgelieferten Datei; auch nicht in einer Kommentarzeile. Mit fünf Gegenproben. | — | nein |
| `rangordnung.mjs` | Die ganze Gestaltung als messbare Aussage: Schriftgrösse, Gewicht, Sperrung, Versalien, Regelstärke, Zeilenhöhe, Spaltenbreite, jede Farbrolle — dass **kein Ton der Tafel bunt** ist, und dass es im Blatt genau **eine** senkrechte Linie gibt (vor der Summenspalte) und sonst keine. | 8731 | ja |
| `rechnen.mjs` | Der Rechenkern: Saldo-Übertrag über die Jahrgänge, Basis und Rest, geerbte Basis, Korrekturen (die nicht klemmen), Verteilen in drei Wegen mit Vorschau, Aufrunden. Dazu der **Erlass**: eine markierte Korrektur senkt den Saldo, zählt aber nicht als getilgt — mit Gegenprobe, Umwidmen in beide Richtungen und der Frage, was davon in die Datendatei gerät. Jeder Erwartungswert ist aus `vorrat.mjs` hergeleitet, nicht aus einem Lauf abgeschrieben. | 8741 | ja |
| `bedienung.mjs` | Klappen und Zähler, Pfeiltasten, Ziehen und Ablegen am Griff, **der Rechtsklick als einziger Hakengriff** — in beiden Ansichten —, die Tasten `z` und `n`, die **Kreuzpeilung**, der Notausgang. | 8732 | ja |
| `rahmen.mjs` | Kopf, Kennzahlenband, Fusszeile, Version, Handbuch, das Zustands-Dreieck, **das Rollfeld** (was beim Rollen stehen bleibt und was wegfährt), die **eingebettete Schrift ohne Netz**, Druck und Export. | 8742 | ja |
| `eingabe.mjs` | Eingabe in allen Feldarten: Betrag, Zweck, Name, Datum, Stand. Fokus nach echtem Mausklick, **der Fokusring an der Zelle** (nicht am Feld), stilles Sichern zerstört keine Eingabe, **kein linker Klick setzt je einen Haken**. | 8746 | ja |
| `ausgabe.mjs` | HTML-Export (alle gewählten Jahrgänge in einer Datei, Navigation bedienbar, Eingabe eingefroren), CSV je Jahrgang, und das Papier samt eigenem Druckkopf. | 8733 / 8743 | ja |
| `befunde.mjs` | Die Befunde der unabhängigen Nachkontrolle vom 22.08.2026, auf den Neubau nachgezogen — Rest und Basis unter null ohne Kappung, Korrekturfenster, Kennzahlenband bei unstimmigem Plan, Rappenrundung, die Aufgliederung in «Alle Jahre», der Zähler am Steller, `zahl()`, der HTML-Export. | 8744 | ja |
| `haerte.mjs` | Grenzfälle: Ziehen und Ablegen über Sektionsgrenzen, Verschieben mit der Tastatur, Escape schliesst je Fenster nur das oberste, eine kaputte `gaepp-daten.json` legt die App nicht still, «Übertragen» fasst keine gleichnamige Zeile einer anderen Kategorie an, Quote ausserhalb 0–100 %, negative Rate bei Basis null, Einzahl und Mehrzahl. | 8745 | ja |
| `mobil.mjs` | Das Telefon: 390 × 844, ein Monat untereinander statt zwölf nebeneinander. Eigene Fassung, eigene Fehler — einen hatte sie. | 8734 | ja |
| `kanal.mjs` | Der Datenkanal beim Start: ob GÄPP im Repo nachsieht, wie es entscheidet, welcher Stand gilt, und ob es den Zustand ehrlich meldet. Dazu der **Stichmonat**: dass er aus dem Kalender kommt, dass nur eine Datei mit `meta.stichFest` ihn hält, dass Sichern ihn nicht festschreibt und ein krummer Wert die Anzeige nicht stilllegt. Fährt nie gegen ein echtes Repo — jede Anfrage an GitHub wird abgefangen, ein Zähler belegt, dass sie gestellt wurde. | 8747 | ja |

**Die Gesamtzahl steht hier nicht.** Sie wird nachgerechnet und erscheint unten im
Ergebnis des Sammellaufs (Hausregel 3). Wer sie in einem Dokument liest und hier eine
andere findet, glaubt dem Sammellauf.

## Der Prüfvorrat

`vorrat.mjs` hält einen **konstruierten** Datenstand: sechs Jahrgänge 2024–2029,
Stichmonat 2026-08 — **festgesetzt** mit `meta.stichFest`. Seit 3.1.0 nimmt GÄPP den
Stichmonat sonst aus dem Kalender des Rechners; ein Vorrat ohne diese Marke ergäbe am
Ersten jedes Monats andere Zahlen («Restschuld heute», «Getilgt bisher», die
halbfette Spalte). Dass der Kalender im Normalfall gilt, prüft `kanal.mjs` —
ausdrücklich gegen den laufenden Monat und nicht gegen den Vorrat. **Albrechts echte Zahlen und Namen kommen hier nicht vor** —
weder Beträge noch Kontonummern noch Gläubiger noch Rechnungssteller — und dürfen es
nie: das ist derselbe Grundsatz wie A-78, nur auf den Prüfstand selbst angewandt.

Was er absichtlich enthält, weil eine Grenze in den Vorrat gehört und nicht in den
Kopf dessen, der gerade baut:

- einen Jahrgang ohne Rechnungen und einen mit
- eine Sektion ohne eine einzige Zeile
- eine Schuld, die auf null endet
- eine Position ohne jeden Wert
- Namen mit Umlaut am Wortanfang, mit Kleinschreibung und mit einer Ziffer
- gesetzte Haken in einem Teil des Jahres, nicht im ganzen
- alle vier Rechnungszustände

**Wer eine neue Grenze baut, trägt sie hier ein.** Sonst ist Grün eine Aussage über
den Vorrat und nicht über die App.

## Die Hausregeln

1. **Gemessen wird die Wirkung, nicht der Quelltext.** Der Text in der Zelle, die
   berechnete Farbe, der Datenstand nach einem echten Klick — nicht die CSS-Klasse
   und nicht die Pixelzahl. Eine gesetzte Klasse, die von einer Regel gleicher Stärke
   überstimmt wird, ergibt sonst eine grüne Prüfung an einer grauen Zahl.
2. **Ein neuer Lauf wird in `alles.mjs` eingetragen, sonst zählt er nicht mit.**
3. **Die Gesamtzahl wird nachgerechnet, nie fortgeschrieben.**
4. **Was aus dem Code gelesen wird, veraltet nicht. Was abgeschrieben ist, veraltet
   immer.** Wo eine Prüfung eine Zahl oder einen Namen nennt, die der Code führt, wird
   sie interpoliert und nicht getippt.
5. **Der Prüfstand gehört ins öffentliche Repo, neben die Datei, die er prüft.**
   A-78 verlangt, dass **die `index.html`** keine Daten trägt — nicht, dass im Repo
   nichts anderes liegen darf. Ins **private** Repo gehört er nicht: A-79 sagt dort
   wörtlich «die JSON-Datei — und sonst nichts».
6. **Eine Prüfung wird nie gelockert, damit sie grün wird.** Wo eine Erwartung sich
   ändert, wird sie **umgedreht** und nicht gestrichen, und daneben steht die
   Gegenprobe. Wo eine Frage gegenstandslos wird, steht der Grund im Kommentar.
7. **Ein rotes Ergebnis ist eine Frage, keine Antwort.** In dieser Reihenfolge:
   Stimmt die **Erwartung**? Stimmt die **Umgebung** des Laufs? Stimmt der
   **Messpunkt**? Und erst dann: ist die **Rechnung** falsch — oder nur die
   **Anzeige** unvollständig?
8. **Ein echter Origin, nie `file://`** — Chromium verwirft den Browserspeicher eines
   file-Origins beim Neuladen, und wer Persistenz prüft, braucht einen echten Origin.
   **Der Kalender läuft; festgehalten wird der Stichmonat, nicht der Tag.** Ein Lauf,
   dessen Erwartung am Kalender hängt, wird am Ersten des Monats von selbst rot —
   deshalb setzt `vorrat.mjs` den Stichmonat fest (`meta.stichFest`). Wer eine
   Erwartung am laufenden Monat messen muss, rechnet ihn im Lauf aus und schreibt
   ihn nicht hin (Hausregel 4). *Bis zum 23.08.2026 stand hier «ein gestellter Tag,
   nie der Kalender» — gestellt war nie etwas.*
9. **`node_modules` gehört nie ins Repo.** Der Ordner entsteht bei `npm install`.

## Was er ausdrücklich nicht prüft

- **Ein echtes GitHub-Repo.** Der Sicherungspfad wird mit erfundenem Repo und
  erfundenem Schlüssel gefahren, die Anfrage an `api.github.com` abgefangen — nie ein
  echter Netzzugriff. Das Lesen aus dem Repo bleibt ganz ungeprüft. **Dieser Satz
  steht hier seit dem 18.08.2026 und ist unverändert offen.**
- **Ob eine Zahl die richtige ist.** Der Prüfstand prüft, ob GÄPP rechnet, was es
  rechnen soll — nicht, ob das Richtige eingetragen ist. Er beweist, dass eine
  Änderung nichts verschoben hat. Er sagt nicht, ob die Zahl die richtige war.
- **Albrechts echten Datenstand.** Ausdrücklich nicht verwendet.
- **Persistenz über einen echten Browser-Neustart hinweg.**

## Was aus der Vorgängerfassung nicht mehr hier liegt

`bau.mjs` und `handbuch.mjs` prüften die Kacheln- und Dashboard-Bauart der App vor
dem 22.08.2026 — Selektoren wie `S.modus`, `S.reiter`, `.praster`, `#btnHandbuch`.
Diese Bauart gibt es nicht mehr. Die Dateien sind aus dem Ordner genommen; sie
stünden sonst da und liessen sich fahren, ohne etwas zu prüfen.
