'use strict';

const { runden } = require('./dewpoint');

/**
 * Reine Feuchtetrend-Berechnung, portiert aus "Raumklima 0.7.0.js" Z. 867-920.
 *
 * Über die letzten N Messwerte der absoluten Feuchte wird per linearer Regression
 * ein Trend bestimmt und mit dem ältesten Wert verglichen.
 *
 * Hinweis: Die Richtungs-Beschriftung ("steigend"/"fallend") ist 1:1 aus dem
 * Original-Skript übernommen, damit sich der Adapter exakt wie das bewährte
 * Skript verhält.
 */

/**
 * Fügt einen Messwert in den Ringpuffer ein und begrenzt ihn auf maxLen Einträge.
 *
 * @param {Array<{time:number, value:number}>} buffer
 * @param {number} value  absolute Feuchte
 * @param {number} time   Zeitstempel in ms
 * @param {number} maxLen maximale Anzahl Werte (Default 4)
 * @returns {Array<{time:number, value:number}>} der (begrenzte) Puffer
 */
function addSample(buffer, value, time, maxLen = 4) {
    buffer.push({ time, value });
    while (buffer.length > maxLen) {
        buffer.shift();
    }
    return buffer;
}

/**
 * Berechnet den Trend aus dem Puffer.
 *
 * @param {Array<{time:number, value:number}>} buffer
 * @param {number} [nowMs]  aktueller Zeitpunkt in ms (Default: Date.now())
 * @returns {string} "gleichbleibend" | "steigend (Trend: x)" | "fallend (Trend: x)" | "unbestimmt"
 */
function computeTrend(buffer, nowMs = Date.now()) {
    const anzahl = buffer.length;
    if (anzahl < 2) {
        return 'unbestimmt';
    }

    let sumX = 0;
    let sumY = 0;
    for (const s of buffer) {
        sumX += s.time;
        sumY += s.value;
    }
    const avgX = sumX / anzahl;
    const avgY = sumY / anzahl;

    let cvarXY = 0;
    let varX = 0;
    for (const s of buffer) {
        cvarXY += (s.time - avgX) * (s.value - avgY);
        varX += (s.time - avgX) ** 2;
    }
    if (varX === 0) {
        return 'unbestimmt';
    }

    const b = cvarXY / varX;
    const a = avgY - (b * avgX);
    const trendval = runden(a + (b * nowMs), 2);

    const first = buffer[0].value;
    if (first === trendval) {
        return 'gleichbleibend';
    }
    return (first > trendval)
        ? `steigend (Trend: ${trendval})`
        : `fallend (Trend: ${trendval})`;
}

module.exports = { addSample, computeTrend };
