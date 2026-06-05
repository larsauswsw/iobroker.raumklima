/**
 * Skript: Ziel-Datenpunkte erstellen
 *
 * Beschreibung:
 * Dieses Skript erstellt alle in der Konfiguration definierten Ziel-Datenpunkte, 
 * in denen später die Lüftungsempfehlungen abgelegt werden.
 * Für jeden Raum werden zwei Datenpunkte erzeugt:
 *   - fixedDP: Für die Lüftungsempfehlung basierend auf einem festen Schwellenwert der relativen Luftfeuchte.
 *   - reduceDP: Für die Empfehlung, ob Lüften die absolute Luftfeuchte senken kann.
 *
 * Die Datenpunkte werden als Boolean (true/false) erstellt.
 *
 * Hinweis: Falls ein Datenpunkt bereits existiert, wird er nicht erneut erstellt.
 *
 * Konfiguration:
 * Die Räume und die zugehörigen Datenpunkt-Namen werden in der Variable "config" definiert.
 */
 
// =============================
// Konfiguration
// =============================
var config = {
    rooms: {
        "Wohnzimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Wohnzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Wohnzimmer"
        },
        "Arbeitszimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Arbeitszimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Arbeitszimmer"
        },
        "Badezimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Badezimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Badezimmer"
        },
        "Buegelzimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Buegelzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Buegelzimmer"
        },
        "Essflur": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Essflur",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Essflur"
        },
        "Schlafzimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Schlafzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Schlafzimmer"
        },
        "Waschkueche": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.Waschkueche",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.Waschkueche"
        },
        "GG-Kueche": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Kueche",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Kueche"
        },
        "GG-Schlafzimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Schlafzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Schlafzimmer"
        },
        "GG-Wohnzimmer": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Wohnzimmer",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Wohnzimmer"
        },
        "GG-Bad": {
            fixedDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.FesterWert-ueberschritten.GG-Bad",
            reduceDP: "0_userdata.0.EigeneDatenpunkte.Raumklima.Luefungsempfehlung.LF-Senken-moeglich.GG-Bad"
        }
    }
};
 
// Optionaler Debug-Modus (true = ausführliche Logausgaben)
var debug = true;
 
/**
 * Erstellt einen Datenpunkt, falls dieser noch nicht existiert.
 *
 * @param {string} dp - Der vollständige Name des Datenpunkts.
 * @param {object} options - Optionen für den Datenpunkt (z. B. Typ, Rolle, Beschreibung).
 */
function createTargetState(dp, options) {
    if (!existsState(dp)) {
        // Erstelle den Datenpunkt mit initialem Wert false.
        createState(dp, false, options);
        if (debug) log("Datenpunkt erstellt: " + dp, "info");
    } else {
        if (debug) log("Datenpunkt existiert bereits: " + dp, "info");
    }
}
 
// =============================
// Hauptteil: Ziel-Datenpunkte erstellen
// =============================
for (var roomName in config.rooms) {
    var room = config.rooms[roomName];
 
    // Erstelle den Datenpunkt für die feste Schwellenwert-Berechnung (fixedDP)
    createTargetState(room.fixedDP, {
        name: "Lüftungsempfehlung (Fester Wert) für " + roomName,
        type: "boolean",
        role: "indicator"
    });
 
    // Erstelle den Datenpunkt für die absolute Luftfeuchte-Berechnung (reduceDP)
    createTargetState(room.reduceDP, {
        name: "Lüftungsempfehlung (LF senken möglich) für " + roomName,
        type: "boolean",
        role: "indicator"
    });
}
 
log("Alle Ziel-Datenpunkte wurden überprüft und ggf. erstellt.", "info");
 