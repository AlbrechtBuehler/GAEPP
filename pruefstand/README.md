# GÄPP — Prüfstand

**Umgebaut am 22.08.2026** für das Tabellenwerkzeug, das an diesem Tag die
bisherige Kacheln/Dashboard-App abgelöst hat. Was hier steht, prüft die
heutige `index.html` — Version und Stände werden dabei aus ihrem Quelltext
gelesen, nie abgeschrieben (Hausregel 4).

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

Das fährt alle eingetragenen Läufe nacheinander und rechnet die Bilanz nach.
**Ein Befehl** — das ist Absicht. Ein Prüfstand, den man zusammensuchen muss, wird
nicht gefahren; das ist in vier Tagen fünfmal belegt.

Seit dem 22.08.2026 startet `alles.mjs` selbst **keinen Webserver** mehr: Jeder
Lauf, der einen Browser braucht, bedient sich selbst über `hilfe.mjs`
(`serve()`) auf seinem eigenen Port. Das hält die Läufe unabhängig voneinander
— `node rahmen.mjs` von Hand liefert genau dasselbe Ergebnis wie derselbe Lauf
innerhalb von `npm test`.

## Die Läufe

| Datei | Was er prüft | Browser |
| --- | --- | --- |
| `huelle.mjs` | **A-78** — keine Beträge, keine Kontonummern, keine Belege in der ausgelieferten Datei. Mit Gegenprobe. | nein |
| `rechnen.mjs` | Saldo-Übertrag, Korrekturen, Verteilen und Aufrunden | ja |
| `bedienung.mjs` | Zeilenhöhe, Zähler, Pfeiltasten, Rechtsklick, Jahresansicht der Rechnungen | ja |
| `rahmen.mjs` | Fusszeile (Anspruch, Version), Handbuch, Statuspunkt, Druck, HTML-Export | ja |
| `eingabe.mjs` | Eingabe in der Rechnungen-Tabelle: Fokus nach echtem Mausklick (auch quer über zwei Rechnungen desselben Stellers), Betrag/Zweck/Rechnungssteller-Name überschreiben (auch frisch angelegt), stilles Sichern zerstört keine Eingabe, Tab/Pfeiltasten als Gegenprobe | ja |
| `befunde.mjs` | Die vierzehn Befunde einer unabhängigen Nachkontrolle vom 22.08.2026 (Rest/Basis unter Null ohne Kappung, Korrekturfenster, Kennzahlenband bei unstimmigem Saldo, Schuldenfrei mit Korrekturen an Folgejahren, Rappenrundung, vollständige Aufgliederung in „Alle Jahre“, „Rechnungen“ nicht zweimal Verschiedenes, Rechtsklick-Rücknahme bei „Bezahlt“, Fokus über einen Klassenwechsel hinweg, der Zähler-Titel, CSV-Erledigt-Spalte, Dialogtext „Neues Jahr“, `zahl()`, HTML-Export), dazu das Excel-Layout (helles Schema mit gemessenen Farben/Kontrast, Alle/Jahr-Wechsel behält die Ansicht) |
| `haerte.mjs` | Zehn frisch behobene Befunde: Ziehen und Ablegen einer Zeile am Griff (mit Gegenprobe über die Gruppengrenze), Verschieben mit der Tastatur, Escape schliesst je Fenster nur das oberste (inkl. Korrektur/Korrektur-Warnung verschachtelt), eine kaputte `gaepp-daten.json` legt die App nicht still und der Notausgang führt wirklich zurück, „Übertragen … auch in die Folgejahre“ fasst keine gleichnamige Zeile einer anderen Kategorie an, „Getilgt bisher“ zählt keine noch nicht laufende Schuld mit, eine Quote ausserhalb 0–100 % steht in der Warnfarbe, eine negative Rate lässt die Schuld auch bei Basis null wachsen, die Erledigt-Marke fällt mit dem Betrag (beide Tafeln), Einzahl/Mehrzahl im HTML-Export und im Dialog „Jahr löschen“ | ja |

`vorrat.mjs` hält den **konstruierten** Datenstand für das Tabellenwerkzeug —
drei Jahrgänge (ein leeres Gerüst, ein gefüllter Arbeitsjahrgang, ein Gerüst
mit fortgeschriebenen Raten). **Albrechts echte Zahlen und Namen kommen hier
nicht vor** — weder Beträge noch Kontonummern noch Gläubiger noch
Rechnungssteller — und dürfen es auch nie: das ist derselbe Grundsatz wie
A-78, nur auf den Prüfstand selbst angewendet.

### `bau.mjs` und `handbuch.mjs` sind gegenstandslos

Beide Dateien bleiben liegen, stehen aber **nicht mehr** in `alles.mjs` und
zählen deshalb nicht mit. Sie prüfen die Kacheln/Dashboard-Bauart der
Vorgänger-App — Selektoren wie `S.modus`, `S.reiter`, `.praster`, `.k-verbind`,
`#btnHandbuch` — und genau diese Bauart hat der Neubau vom 22.08.2026 durch
das Tabellenwerkzeug ersetzt. Diese Selektoren stehen in der heutigen
`index.html` nicht mehr; ein Versuch, die Dateien zu fahren, bricht sofort ab,
statt etwas Sinnvolles zu prüfen. Gelöscht sind sie trotzdem nicht — falls die
alte Bauart je wieder gebraucht wird, bleiben die Läufe da, wo sie waren.

`rechnen.mjs` und `bedienung.mjs` entstehen zeitgleich in anderen Sitzungen.
Bis sie hier liegen, meldet `alles.mjs` sie einzeln als **rot** («Lauf
fehlt») und rechnet mit den übrigen Läufen weiter, statt abzubrechen — siehe
Hausregel 2.

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

ein echtes GitHub-Repo (`eingabe.mjs` fährt den Sicherungspfad mit erfundenem
Repo/Schlüssel, die Anfrage an `api.github.com` wird abgefangen — nie ein
echter Netzzugriff; das Lesen aus dem Repo bleibt ganz ungeprüft) · CSV-Export
über die Erledigt-Spalte und die Total-Zeile hinaus (den Rest der Datei —
Kennzahlzeilen, Korrekturtext je Position — fährt `befunde.mjs` nicht ab)
· Eingabe in der Budget-Tabelle (das leistet `bedienung.mjs`) · Persistenz über
einen echten Browser-Neustart hinweg · Albrechts echten Datenstand.

Seit dem 22.08.2026 prüft `haerte.mjs` Ziehen und Ablegen von Zeilen (samt
Verschieben mit der Tastatur) und den Dialog «Jahr löschen» (den Dialogtext
«Neues Jahr anlegen» prüft weiterhin `befunde.mjs`) — beides stand bis dahin
hier als ungeprüft.

Seit dem 22.08.2026 ist «hell» das Vorgabeschema (`data-theme="hell"`, direkt
im `:root`-Block) — `befunde.mjs` misst es, samt Kontrast Balken/Schrift nach
der WCAG-Formel. Das dunkle Schema (`[data-theme="dunkel"]`) bleibt ungeprüft.

**Der Rechenkern** — Saldo-Übertrag, Verteilen, Aufrunden, Korrekturen an
Schuldsalden — ist die Aufgabe von `rechnen.mjs`. Solange die Datei fehlt, ist
er die grösste bekannte Lücke dieses Prüfstands; `alles.mjs` zeigt das von
selbst als «Lauf fehlt», damit niemand die Zahl unten für Vollständigkeit
hält.
