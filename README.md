# ioBroker.raumklima

ioBroker-Adapter, der pro Raum aus **Temperatur** und **Luftfeuchte** berechnet, **wann gelüftet werden soll**.

Portiert die bewährte Community-„Lüftungsengine" aus dem JavaScript-Skript *Raumklima 0.7.0* in einen eigenständigen Adapter, in dem Räume und ihre Datenpunkte über die **Admin-UI** verwaltet werden. Benachrichtigungen laufen über eine vorhandene **Pushover**-Instanz.

## Funktionsweise

Pro Raum werden Taupunkt, absolute Feuchte (g/kg), Enthalpie usw. berechnet. Die Lüftungsempfehlung entsteht aus vier Bedingungen **mit Hysterese** (verhindert ständiges Umschalten):

1. **Entfeuchten** – Außenluft ist absolut trockener als innen
2. **Kühlen** – Außentemperatur mind. 0,6 K kühler als innen
3. **Auskühlschutz** – Innentemperatur über der Mindesttemperatur
4. **Raumfeuchte** – rel. Raumfeuchte über dem Maximalwert

Nur wenn alle vier erfüllt sind, lautet die Empfehlung „lüften". Ein einziges Ausschlusskriterium (z. B. Außenluft zu feucht, Raum zu kalt) ergibt „Fenster zu". Dazwischen bleibt die letzte Empfehlung bestehen (Hysterese).

## Konfiguration

**Haupteinstellungen**
- *Neuberechnung-Intervall* (Minuten) – zusätzlich wird bei jeder Sensoränderung gerechnet
- *Höhe über NN* – Basis für den Luftdruck, wenn kein Drucksensor vorhanden
- *Luftdrucksensor* (optional) – Datenpunkt in hPa
- *Pushover* – Instanz + Test-Button

**Räume-Tabelle** (pro Raum)
- Name, Häkchen **Außen** (markiert den Außensensor)
- Temperatur-Datenpunkt, Feuchte-Datenpunkt (Auswahl aus dem Objektbaum)
- *Außensensor* – Dropdown mit den als *Außen* markierten Räumen; bei einem Außenraum ist das Feld deaktiviert
- Temp-/Feuchte-Offset (Kalibrierung)
- Min-Temperatur (Zahl **oder** Datenpunkt, z. B. Heizungs-Soll) – Auskühlschutz
- Feuchte min / max (%)

Mindestens **ein** Raum muss als *Außen* markiert sein; Innenräume referenzieren ihn über *Außensensor*.

> **Wichtig:** Bitte zuerst die **Außenräume** (Häkchen *Außen*) anlegen und **speichern**. Erst danach stehen sie bei den Innenräumen im Dropdown *Außensensor* zur Auswahl.

## Datenpunkte

Pro Raum unter `raumklima.0.rooms.<Name>`:

```
Temperatur, relative_Luftfeuchtigkeit, Feuchtegehalt_Absolut, Taupunkt, Dampfgewicht
Lüftungsempfehlung            (boolean, nur Innenräume)
DETAILS.                      Enthalpie, Sättigungsdampfdruck, Dampfdruck, Dampfgewicht_maximal
DETAILS_Lüftungsempfehlung.   b1_Entfeuchten … b4_Raumfeuchte, Hysterese, Beschreibung
Feuchtetrend                  (string, nur Außenräume)
```

Global unter `raumklima.0.info`:
`Lüften`, `Lüften_Liste`, `Lüften_Anzahl`, `JSON` (für VIS), `Aktualisierung`, `Luftdruck`, `Höhe_über_NN`.

## Pushover

Bei jeder Änderung der Lüftungsempfehlung eines Raums (in beide Richtungen):
`Raum "<Name>": Lüften empfohlen` bzw. `… nicht mehr nötig`.

## Entwicklung

```bash
npm install
npm test     # Jest – reine Logikmodule (dewpoint, ventilation, trend, stateManager)
```

Die reinen Berechnungsmodule liegen in `lib/` und sind ohne ioBroker testbar. Die Original-Skripte liegen als Referenz unter `reference/`.

## Lizenz

MIT
