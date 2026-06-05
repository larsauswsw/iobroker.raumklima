/**
 * Skript: Lüftungsempfehlung basierend auf Raumklima
 *
 * Beschreibung:
 * Dieses Skript liest für mehrere Räume die aktuellen Sensorwerte für relative Luftfeuchte und Temperatur ein.
 * Es berechnet daraus zum einen:
 *   - Eine Lüftungsempfehlung auf Basis eines festen Schwellenwertes (z. B. 57 % relative Luftfeuchte).
 *   - Eine Empfehlung, ob eine Lüftung durch Austausch der Luft die absolute Luftfeuchte senken würde.
 * 
 * Für die absolute Luftfeuchte wird folgende Formel verwendet:
 *   AH = (6.112 * exp((17.67 * T)/(T + 243.5)) * RH * 2.1674) / (T + 273.15)
 * Für Außensensoren wird zusätzlich der Luftdruck als Korrekturfaktor einbezogen:
 *   AH_out = AH * (P / 1013.25)
 *
 * Beide Berechnungen können über die Konfiguration (enableFixedCalculation und
 * enableAbsoluteHumidityCalculation) ein- bzw. ausgeschaltet werden.
 *
 * Für jeden Raum werden die ermittelten Empfehlungen (true/false) in die definierten Datenpunkte geschrieben.
 *
 * Zusätzlich:
 * - Es gibt einen Debug-Log, der detaillierte Informationen zu den Berechnungen ausgibt,
 *   wenn debug auf true gesetzt ist.
 * - Optional wird geprüft, ob alle Sensoren erreichbar sind. Fehlende Sensoren werden im Debug-Log ausgegeben.
 * - Zusätzlich wird (optional) überprüft, ob Sensoren länger als ein einstellbarer Zeitraum (in Stunden)
 *   keinen aktualisierten Wert gesendet haben. Diese Warnung wird grafisch (z. B. mit "⚠️") im Debug-Log angezeigt.
 *
 * Die Berechnungen werden je nach Tageszeit unterschiedlich oft ausgeführt:
 *   - Zwischen 06:00 und 22:59 alle 10 Minuten
 *   - Zwischen 23:00 und 05:59 alle 30 Minuten
 */
 
// =============================
// Konfiguration
// =============================
var config = {
    // Berechnungen ein- bzw. ausschalten:
    enableFixedCalculation: true,              // Aktiviert die Berechnung der Lüftungsempfehlung basierend auf einem festen RH-Schwellenwert.
    enableAbsoluteHumidityCalculation: true,   // Aktiviert die Berechnung, ob Lüften (Austausch mit Außenluft) die absolute Luftfeuchte senkt.
    globalRHThreshold: 40,                       // Global einstellbarer Schwellenwert für relative Luftfeuchte in %.
    absoluteHumidityOffset: 0,                   // Optionaler Offset in g/m³, der beim Vergleich der absoluten Luftfeuchte berücksichtigt wird.
    debug: true,                                 // Schaltet die ausführliche Debug-Ausgabe an (true) oder aus (false).
 
    // Optionale Prüfung der Sensorverfügbarkeit:
    enableSensorCheck: true,
 
    // Optionale Prüfung des Sensoralters:
    // Es wird geprüft, ob ein Sensor länger als maxAgeHours keinen neuen Wert gesendet hat.
    sensorAgeCheck: {
        enabled: true,
        maxAgeHours: 3  // Maximale erlaubte Zeitspanne (in Stunden) ohne Aktualisierung.
    },
 
    // Definition der Räume:
    rooms: {
        "Wohnzimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Wohnzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Wohnzimmer",
            threshold: null  // Falls null, wird der globale Schwellenwert verwendet.
        },
        "Arbeitszimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Arbeitszimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Arbeitszimmer",
            threshold: null
        },
        "Badezimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Badezimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Badezimmer",
            threshold: null
        },
        "Buegelzimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Buegelzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Buegelzimmer",
            threshold: null
        },
        "Essflur": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Essflur",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Essflur",
            threshold: null
        },
        "Schlafzimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Schlafzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Schlafzimmer",
            threshold: null
        },
        "Waschkueche": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Waschkueche",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Waschkueche",
            threshold: null
        },
        "GG-Kueche": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Kueche",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Kueche",
            threshold: null
        },
        "GG-Schlafzimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Schlafzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Schlafzimmer",
            threshold: null
        },
        "GG-Wohnzimmer": {
            enabled: true,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Wohnzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Wohnzimmer",
            threshold: null
        },
        "GG-Bad": {
            enabled: false,
            indoorRH: "Euer.Datenpunkt.des.Objekts.Feuchtigkeit",
            indoorTemp: "Euer.Datenpunkt.des.Objekts.Temperatur",
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Bad",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Bad",
            threshold: null
        }
    },
 
    // Definition der Außensensoren:
    outside: {
        rh: "Euer.Datenpunkt.des.Objekts.Luftfeuchte",
        temp: "Euer.Datenpunkt.des.Objekts.Temperatur",
        pressure: "Euer.Datenpunkt.des.Objekts.Luftdruck"
    }
};
 
// =============================
// Funktion: calcAbsoluteHumidity
// =============================
/**
 * Berechnet die absolute Luftfeuchte (g/m³) basierend auf Temperatur, relativer Luftfeuchte
 * und optional dem Luftdruck.
 *
 * Formel:
 *   AH = (6.112 * exp((17.67 * T) / (T + 243.5)) * RH * 2.1674) / (T + 273.15)
 *
 * Falls der optionale Parameter "pressure" (Luftdruck in hPa) übergeben wird, wird der Wert
 * als Korrekturfaktor (bezogen auf 1013.25 hPa) einbezogen:
 *   AH = AH * (pressure / 1013.25)
 *
 * @param {number} T - Temperatur in °C.
 * @param {number} RH - Relative Luftfeuchte in %.
 * @param {number} [pressure] - (Optional) Luftdruck in hPa.
 * @returns {number} Berechnete absolute Luftfeuchte in g/m³.
 */
function calcAbsoluteHumidity(T, RH, pressure) {
    var AH = (6.112 * Math.exp((17.67 * T) / (T + 243.5)) * RH * 2.1674) / (T + 273.15);
    if (pressure !== undefined && pressure > 0) {
        AH = AH * (pressure / 1013.25);
    }
    return AH;
}
 
// =============================
// Funktion: checkSensorAge
// =============================
/**
 * Prüft, ob ein Sensor seit mehr als der konfigurierten Zeit (in Stunden) keinen neuen Wert gesendet hat.
 *
 * Falls der Sensor zu alt ist, wird eine Warnung mit grafischer Kennzeichnung (⚠️) im Debug-Log ausgegeben.
 *
 * @param {object} sensorState - Der Zustand des Sensors, der u.a. den Zeitstempel (ts) enthalten sollte.
 * @param {string} sensorName - Bezeichner des Sensors (z. B. Datenpunktname), der in der Warnung angezeigt wird.
 */
function checkSensorAge(sensorState, sensorName) {
    if (config.sensorAgeCheck && config.sensorAgeCheck.enabled && sensorState && sensorState.ts) {
        var now = Date.now();
        var age = (now - sensorState.ts) / 3600000; // Zeitdifferenz in Stunden
        if (age > config.sensorAgeCheck.maxAgeHours) {
            // Grafische Kennzeichnung mit dem Warnsymbol ⚠️
            if (config.debug) {
                log("⚠️⚠️⚠️ Sensor " + sensorName + " hat seit " + age.toFixed(2) +
                    " Stunden keinen neuen Wert gesendet!", "warn");
            }
        }
    }
}
 
// =============================
// Funktion: runCalculation
// =============================
/**
 * Führt die vollständige Berechnung der Lüftungsempfehlungen durch.
 *
 * Ablauf:
 * 1. Außensensoren auslesen und (optional) auf Verfügbarkeit sowie das Sensoralter prüfen.
 * 2. Berechne die absolute Luftfeuchte für die Außenluft.
 * 3. Für jeden aktivierten Raum:
 *    a. Raum-Sensoren (Temperatur und RH) auslesen, optional deren Verfügbarkeit und Alter prüfen.
 *    b. Berechne die absolute Luftfeuchte im Raum.
 *    c. Falls aktiviert: Vergleiche den gemessenen RH-Wert mit dem Schwellenwert und speichere das Ergebnis in fixedDP.
 *    d. Falls aktiviert: Vergleiche die absolute Luftfeuchte im Raum (AH_in) mit der Außenluft (AH_out) (plus Offset)
 *       und speichere das Ergebnis in reduceDP.
 *
 * Bei fehlenden kritischen Sensoren (sowohl außen als auch pro Raum) wird eine Warnung im Debug-Log ausgegeben
 * und die Berechnung (bzw. für den Raum) abgebrochen.
 */
function runCalculation() {
    // Außensensoren auslesen
    var outsideTempState = getState(config.outside.temp);
    var outsideRHState = getState(config.outside.rh);
    var outsidePressureState = getState(config.outside.pressure);
 
    // Optionale Prüfung der Außensensoren (Verfügbarkeit)
    if (config.enableSensorCheck) {
        var missingOutsideSensors = [];
        if (!outsideTempState) missingOutsideSensors.push("Außentemperatur (" + config.outside.temp + ")");
        if (!outsideRHState) missingOutsideSensors.push("Außen RH (" + config.outside.rh + ")");
        if (!outsidePressureState) missingOutsideSensors.push("Außen Druck (" + config.outside.pressure + ")");
        if (missingOutsideSensors.length > 0) {
            log("Fehlende Außensensoren: " + missingOutsideSensors.join(", "), "warn");
        }
    }
 
    // Sensor-Alter-Prüfung für Außensensoren
    if (config.sensorAgeCheck && config.sensorAgeCheck.enabled) {
        checkSensorAge(outsideTempState, config.outside.temp);
        checkSensorAge(outsideRHState, config.outside.rh);
        checkSensorAge(outsidePressureState, config.outside.pressure);
    }
 
    // Kritische Außensensoren müssen vorhanden sein; andernfalls wird die Berechnung abgebrochen.
    if (!outsideTempState || !outsideRHState || !outsidePressureState) {
        log("Kritische Außensensoren nicht vollständig verfügbar! Berechnung wird abgebrochen.", "error");
        return;
    }
 
    // Umwandlung der Außensensorwerte in Zahlen
    var outsideTemp = parseFloat(outsideTempState.val);
    var outsideRH = parseFloat(outsideRHState.val);
    var outsidePressure = parseFloat(outsidePressureState.val);
    var AH_out = calcAbsoluteHumidity(outsideTemp, outsideRH, outsidePressure);
 
    // Debug-Ausgabe der Außensensorwerte und der berechneten absoluten Luftfeuchte
    if (config.debug) {
        log("Außenwerte: Temp=" + outsideTemp + "°C, RH=" + outsideRH + "%, Druck=" + outsidePressure +
            " hPa, AH_out=" + AH_out.toFixed(2) + " g/m³");
    }
 
    // Iteration über alle Räume
    for (var roomName in config.rooms) {
        var room = config.rooms[roomName];
        if (!room.enabled) {
            if (config.debug) log("Raum " + roomName + " ist deaktiviert.");
            continue;
        }
        
        // Raum-Sensoren auslesen
        var indoorTempState = getState(room.indoorTemp);
        var indoorRHState = getState(room.indoorRH);
 
        // Optionale Prüfung der Raum-Sensoren (Verfügbarkeit)
        if (config.enableSensorCheck) {
            var missingRoomSensors = [];
            if (!indoorTempState) missingRoomSensors.push("Temperatur (" + room.indoorTemp + ")");
            if (!indoorRHState) missingRoomSensors.push("Luftfeuchte (" + room.indoorRH + ")");
            if (missingRoomSensors.length > 0) {
                log("Fehlende Sensoren für " + roomName + ": " + missingRoomSensors.join(", "), "warn");
            }
        }
 
        // Sensor-Alter-Prüfung für Raum-Sensoren
        if (config.sensorAgeCheck && config.sensorAgeCheck.enabled) {
            checkSensorAge(indoorTempState, room.indoorTemp + " in " + roomName);
            checkSensorAge(indoorRHState, room.indoorRH + " in " + roomName);
        }
        
        // Falls kritische Sensoren im Raum fehlen, wird dieser übersprungen.
        if (!indoorTempState || !indoorRHState) {
            if (config.debug) log("Berechnung für " + roomName + " wird übersprungen, da Sensoren fehlen.", "warn");
            continue;
        }
        
        // Umwandlung der Raumwerte in Zahlen und Berechnung der absoluten Luftfeuchte im Raum
        var indoorTemp = parseFloat(indoorTempState.val);
        var indoorRH = parseFloat(indoorRHState.val);
        var AH_in = calcAbsoluteHumidity(indoorTemp, indoorRH);
        
        // -----------------------------
        // Feste Schwellenwert-Berechnung (Fixed Calculation)
        // -----------------------------
        if (config.enableFixedCalculation) {
            var threshold = (room.threshold !== null) ? room.threshold : config.globalRHThreshold;
            var fixedRecommendation = (indoorRH >= threshold);
            setState(room.fixedDP, fixedRecommendation, true);
            if (config.debug) {
                log("[" + roomName + "] Fixed Calculation: RH_in=" + indoorRH + "%, Threshold=" + threshold +
                    " -> Empfehlung Lüften: " + fixedRecommendation);
            }
        }
        
        // -----------------------------
        // Berechnung, ob Lüften die absolute Luftfeuchte senken kann (Absolute Humidity Calculation)
        // -----------------------------
        if (config.enableAbsoluteHumidityCalculation) {
            var reduceRec = (AH_in > (AH_out + config.absoluteHumidityOffset));
            setState(room.reduceDP, reduceRec, true);
            if (config.debug) {
                log("[" + roomName + "] Absolute Humidity Calculation: AH_in=" + AH_in.toFixed(2) + " g/m³, AH_out=" +
                    AH_out.toFixed(2) + " g/m³, Offset=" + config.absoluteHumidityOffset +
                    " -> Lüften senkt Luftfeuchte: " + reduceRec);
            }
        }
    }
}
 
// =============================
// Zeitgesteuerte Ausführung (Scheduling)
// =============================
//
// Der erste Cron-Job führt runCalculation() alle 10 Minuten im Zeitfenster von 06:00 bis 22:59 aus.
// Der zweite Cron-Job führt runCalculation() alle 30 Minuten im Zeitfenster von 23:00 bis 05:59 aus.
// Beim Laden des Skripts wird runCalculation() einmalig initial aufgerufen.
 
// Von 06:00 bis 22:59 alle 10 Minuten:
schedule("*/10 6-22 * * *", function() {
    runCalculation();
    if (config.debug) log("runCalculation ausgelöst (10-Minuten-Intervall)", "info");
});
 
// Von 23:00 bis 05:59 alle 30 Minuten:
schedule("*/30 23,0-5 * * *", function() {
    runCalculation();
    if (config.debug) log("runCalculation ausgelöst (30-Minuten-Intervall)", "info");
});
 
// Initialer Aufruf beim Laden des Skripts:
runCalculation();
 