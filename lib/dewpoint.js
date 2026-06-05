'use strict';

/**
 * Reine Klimaphysik, verbatim portiert aus "Raumklima 0.7.0.js".
 * Keine ioBroker-Abhängigkeit, damit unit-testbar.
 *
 * Quellen der Formeln:
 *  - dewpoint-Modul (Magnus-Formel): Raumklima 0.7.0.js Z. 239-261
 *  - Sättigungsdampfdruck/Dampfdruck/Dampfgewicht: Z. 506-539 (wetterochs.de)
 *  - Enthalpie: Z. 576
 *  - mittlerer Luftdruck: Z. 479-488
 */

/**
 * Mittlerer Luftdruck (Barometrische Höhenformel) als Basis für die abs. Feuchte.
 *
 * @param {number} heightNN  eigene Höhe über NN in Metern
 * @param {number} [pressureHpa]  gemessener Luftdruck in hPa (falls Sensor vorhanden)
 * @returns {number} Luftdruck in hPa
 */
function airPressureHpa(heightNN, pressureHpa) {
    const base = (pressureHpa === undefined || pressureHpa === null || pressureHpa === '')
        ? 1013.25
        : Number(pressureHpa);
    const z = 1.0 - (0.0065 / 288.15) * heightNN;
    return base * Math.pow(z, 5.255);
}

/**
 * Mittlerer Luftdruck in bar für den Info-Datenpunkt (Raumklima 0.7.0.js Z. 479-488).
 *
 * @param {number} heightNN  Höhe über NN in Metern
 * @param {number} [pressureHpa]  gemessener Luftdruck in hPa (falls Sensor vorhanden)
 * @returns {number} Luftdruck in bar
 */
function airPressureBar(heightNN, pressureHpa) {
    let p;
    if (pressureHpa === undefined || pressureHpa === null || pressureHpa === '') {
        p = 1013.25 - (heightNN / 8.0);
    } else {
        p = Number(pressureHpa);
    }
    return p / 1000;
}

/**
 * Absolute Feuchte x (g/kg) und Taupunkt dp (°C) nach Magnus.
 *
 * @param {number} t   Temperatur in °C
 * @param {number} rh  relative Luftfeuchte in %
 * @param {number} pHpa  Luftdruck in hPa (aus airPressureHpa)
 * @returns {{x: number, dp: number}}
 */
function dewpoint(t, rh, pHpa) {
    t = parseFloat(t);
    const A = 6.112;
    let m = 17.62;
    let Tn = 243.12;
    if (t < 0.0) {
        m = 22.46;
        Tn = 272.62;
    }
    const sd = A * Math.exp(m * t / (Tn + t));
    const d = sd * rh / 100.0;
    return {
        x: 621.98 * d / (pHpa - d),
        dp: Tn * Math.log(d / A) / (m - Math.log(d / A))
    };
}

/** Sättigungsdampfdruck in hPa (wetterochs.de). */
function saettigungsdampfdruck(t) {
    const a = (t >= 0) ? 7.5 : 7.6;
    const b = (t >= 0) ? 237.3 : 240.7;
    return 6.1078 * Math.pow(10, ((a * t) / (b + t)));
}

/** Dampfdruck in hPa. */
function dampfdruck(sdd, rh) {
    return rh / 100 * sdd;
}

/** Dampfgewicht / Wassergehalt in g/m³. */
function dampfgewicht(dd, t) {
    const tk = t + 273.15;
    const mw = 18.016; // kg/kmol
    const R = 8314.3;  // J/(kmol*K)
    return Math.pow(10, 5) * mw / R * dd / tk;
}

/** maximales Dampfgewicht in g/m³. */
function maxDampfgewicht(rd, rh) {
    return rd / rh * 100;
}

/** Enthalpie in kJ/kg. */
function enthalpie(t, x) {
    return 1.00545 * t + (2.500827 + 0.00185894 * t) * x;
}

/** rundet auf eine bestimmte Anzahl Nachkommastellen. */
function runden(wert, stellen) {
    return Math.round(wert * Math.pow(10, stellen)) / Math.pow(10, stellen);
}

/**
 * Berechnet alle Klimawerte für einen Raum aus Temperatur und rel. Feuchte.
 * Rundung wie im Original-Skript.
 *
 * @param {number} t   Temperatur in °C (inkl. Offset)
 * @param {number} rh  relative Luftfeuchte in % (inkl. Offset)
 * @param {number} heightNN  Höhe über NN in Metern
 * @param {number} [pressureHpa]  gemessener Luftdruck in hPa (optional)
 * @returns {{x:number, dp:number, t:number, rh:number, h:number, sdd:number, dd:number, rd:number, maxrd:number}}
 */
function computeClimate(t, rh, heightNN, pressureHpa) {
    t = parseFloat(t);
    rh = parseFloat(rh);
    const pHpa = airPressureHpa(heightNN, pressureHpa);
    const { x, dp } = dewpoint(t, rh, pHpa);
    const h = enthalpie(t, x);
    const sdd = saettigungsdampfdruck(t);
    const dd = dampfdruck(sdd, rh);
    const rd = dampfgewicht(dd, t);
    const maxrd = maxDampfgewicht(rd, rh);
    return {
        t,
        rh,
        x: runden(x, 2),
        dp: runden(dp, 1),
        h: runden(h, 2),
        sdd: runden(sdd, 2),
        dd: runden(dd, 2),
        rd: runden(rd, 2),
        maxrd: runden(maxrd, 2)
    };
}

module.exports = {
    airPressureHpa,
    airPressureBar,
    dewpoint,
    saettigungsdampfdruck,
    dampfdruck,
    dampfgewicht,
    maxDampfgewicht,
    enthalpie,
    runden,
    computeClimate
};
