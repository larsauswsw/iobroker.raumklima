'use strict';

const { runden } = require('./dewpoint');

/**
 * Reine Lüftungsengine, portiert aus "Raumklima 0.7.0.js" Z. 672-739.
 *
 * Lüften (alle Bedingungen müssen erfüllt sein):
 *  #1 Entfeuchten:   Außenluft ist mind. (hysEntfeuchten+0.1) g/kg trockener als innen
 *  #2 Kühlen:        Außentemperatur ist mind. 0.6 K kühler als innen
 *  #3 Auskühlschutz: Innentemperatur ist höher als Mindesttemperatur + Hysterese
 *  #4 Raumfeuchte:   rel. Raumfeuchte ist höher als der Maximalwert
 *
 * Fenster zu (ein Ausschlusskriterium reicht):
 *  #1 Außenluft ist zu feucht
 *  #2 Außentemperatur zu warm
 *  #3 Innentemperatur niedriger als Mindesttemperatur
 *  #4 Raumfeuchte niedriger als Mindestfeuchte
 *
 * Liegt der Zustand zwischen "lüften" und "fenster zu", greift die Hysterese:
 * die bisherige Empfehlung bleibt bestehen.
 */

const TEXT = {
    b1lp: 'Entfeuchten:    Außenluft ist mind. 0,4 trockener als Innen',
    b2lp: 'Kühlen:         Außentemperatur ist mindestens 0,6 Grad kühler als innen',
    b3lp: 'Auskühlschutz:  Innentemperatur ist höher als die Mindesttemperatur',
    b4lp: 'Raumfeuchte:    Raumfeuchte ist höher als der Maximalfeuchte',
    b1ln: 'Außenluft ist zu feucht',
    b2ln: 'Außentemperatur zu warm',
    b3ln: 'Raum ist zu kalt',
    b4ln: 'Raumfeuchte ist zu niedrig'
};

const DEFAULTS = {
    hysEntfeuchten: 0.3, // g/kg Hysterese Entfeuchten
    hysMinTemp: 0.5      // K Hysterese Auskühlschutz
};

/**
 * @param {{t:number, rh:number, x:number}} indoor   Innenraum (Temperatur, rel. Feuchte, abs. Feuchte)
 * @param {{t:number, x:number}} outdoor             Außensensor (Temperatur, abs. Feuchte)
 * @param {{minTemp:number, humMin:number, humMax:number, hysEntfeuchten?:number, hysMinTemp?:number}} params
 * @param {boolean|null} prevLueften  bisherige Empfehlung (für Hysterese); null = noch keine
 * @returns {{lueften:boolean, hysterese:boolean, b1:boolean, b2:boolean, b3:boolean, b4:boolean, beschreibung:string, rhluft:number}}
 */
function evaluate(indoor, outdoor, params, prevLueften = null) {
    const ti = indoor.t;
    const xi = indoor.x;
    const rh = indoor.rh;
    const ta = outdoor.t;
    const xa = outdoor.x;

    const mi = params.minTemp;
    const xh = params.humMax;
    const xt = params.humMin;
    const hysEntfeuchten = params.hysEntfeuchten != null ? params.hysEntfeuchten : DEFAULTS.hysEntfeuchten;
    const hysMinTemp = params.hysMinTemp != null ? params.hysMinTemp : DEFAULTS.hysMinTemp;

    const mih = mi + hysMinTemp; // Mindesttemperatur + Hysterese
    const mit = mi;              // Mindesttemperatur

    // Bedingungen fürs Lüften (positiv)
    const b1lp = xa <= (xi - (hysEntfeuchten + 0.1));
    const b2lp = ta <= (ti - 0.6);
    const b3lp = ti >= mih;
    const b4lp = rh >= xh;

    // Bedingungen gegen das Lüften (negativ)
    const b1ln = xa >= (xi - 0.1);
    const b2ln = ta >= (ti - 0.1);
    const b3ln = ti <= mit;
    const b4ln = rh <= xt;

    // rel. Feuchte bei Austausch der halben Raumluft (informativer Text)
    const xm = (xi + xa) / 2;
    const xmax = (xi * 100) / rh;
    const rhluft = runden(xm / xmax * 100, 0);

    let lueften;
    let hysterese;
    let beschreibung;

    if (b1lp && b2lp && b3lp && b4lp) {
        lueften = true;
        hysterese = false;
        beschreibung = `Bei Austausch der halben Raumluft beträgt die relative Feuchte ${rhluft}%.`;
    } else if (b1ln || b2ln || b3ln || b4ln) {
        lueften = false;
        hysterese = false;
        let text = 'Fenster zu: ';
        if (b1ln) text += TEXT.b1ln + '<br>';
        if (b2ln) text += TEXT.b2ln + '<br>';
        if (b3ln) text += TEXT.b3ln + '<br>';
        if (b4ln) text += TEXT.b4ln + '<br>';
        beschreibung = text;
    } else {
        // Hysterese: bisherige Empfehlung bleibt bestehen
        hysterese = true;
        lueften = (prevLueften === null || prevLueften === undefined) ? false : prevLueften;
        let text = 'Lüftung bedingt empfohlen, da: <br>';
        if (b1lp) text += TEXT.b1lp + '<br>';
        if (b2lp) text += TEXT.b2lp + '<br>';
        if (b3lp) text += TEXT.b3lp + '<br>';
        if (b4lp) text += TEXT.b4lp + '<br>';
        beschreibung = text;
    }

    return {
        lueften,
        hysterese,
        b1: b1lp,
        b2: b2lp,
        b3: b3lp,
        b4: b4lp,
        beschreibung,
        rhluft
    };
}

module.exports = { evaluate, DEFAULTS, TEXT };
