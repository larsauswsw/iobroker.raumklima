# Analyse: Welches Skript zur Berechnung des Lüftungszeitpunkts?

Vergleich der vorhandenen ioBroker-Skripte im Ordner `iobroker.Raumklima` bezogen
auf die Frage: **Lüftungszeitpunkt aus Temperatur + Luftfeuchte berechnen.**

> Hinweis: `Raumklima 0.6.8.js` ist die direkte Vorgängerversion der `Raumklima 0.7.0.js`
> (dieselbe Community-Skriptlinie aus dem ioBroker-Forum).

## Überblick der Dateien

| Datei | Zeilen | Ansatz | Externe Abhängigkeit |
|-------|--------|--------|----------------------|
| **Raumklima 0.7.0.js** | 1053 | Vollwertige „Lüftungsengine" mit 4 Bedingungen + Hysterese | ❌ keine (dewpoint integriert) |
| **Raumklima 0.6.8.js** | 1120 | Vorgänger der 0.7.0 | ❌ keine |
| **Lueftungsempfehlung.js** | 354 | Schlank: abs. Feuchte-Vergleich + fester RH-Schwellenwert | ❌ keine |
| **Lueftungsempfehlung_Datenpunkte.js** | 111 | Nur Helfer – legt die Ziel-Datenpunkte an | – |
| **Raumklima.js** | 345 | Älteres paul53/Solear-Skript | ⚠️ `require('dewpoint')` nötig |

## Bewertung

**Das physikalisch korrekte Prinzip** für „wann lüften" ist der Vergleich der
*absoluten* Luftfeuchte innen vs. außen (nur dann senkt Lüften die Feuchte wirklich) –
kombiniert mit Temperatur-/Auskühlschutz. Genau das machen die guten Skripte hier.

### Raumklima 0.7.0.js — Empfehlung

Berechnet pro Raum Taupunkt, absolute Feuchte (g/kg), Enthalpie und entscheidet
über 4 Bedingungen (Entfeuchten / Kühlen / Auskühlschutz / Raumfeuchte) **mit Hysterese**,
sodass die Empfehlung nicht ständig hin- und herspringt. Keine externe Abhängigkeit,
Außensensor mit Luftdruckkorrektur, Trendberechnung, JSON-Ausgabe für VIS.
Das ist die ausgereifteste und robusteste Variante.

- **Nachteil:** komplex, viel Konfiguration; Datenpunkt-Pfad `0_userdata.0.Test`
  und Sensor-IDs müssen angepasst werden.

### Lueftungsempfehlung.js — die schlanke Alternative

Sauber, selbsterklärend, leicht anzupassen (alle Räume in einem `config`-Block).
Liefert zwei Booleans: „RH-Schwellenwert überschritten" und „Lüften senkt absolute
Feuchte". Inkl. Sensor-Verfügbarkeits- und Altersprüfung.

- **Nachteil:** einfachere Logik – **keine Hysterese** auf dem Feuchtevergleich und
  **kein Auskühlschutz/Temperatur-Minimum**. Braucht zusätzlich
  `Lueftungsempfehlung_Datenpunkte.js` zum Anlegen der Datenpunkte.

### Raumklima.js — nicht empfohlen

Hängt am externen npm-Modul `dewpoint` (in der JavaScript-Adapter-Instanz extra
freizugeben) und ist die älteste Logik.

## Fazit

- **Beste, „echte" Lüftungsentscheidung → `Raumklima 0.7.0.js`.**
  Errechnet den optimalen Lüftungszeitpunkt am genauesten und vermeidet durch
  Hysterese Fehlauslösungen.
- **Etwas Einfaches/Wartbares → `Lueftungsempfehlung.js`** (+ das Datenpunkte-Skript).
