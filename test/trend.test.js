'use strict';

const { addSample, computeTrend } = require('../lib/trend');

describe('addSample', () => {
    it('begrenzt den Puffer auf maxLen Einträge (FIFO)', () => {
        const buf = [];
        addSample(buf, 1, 100, 3);
        addSample(buf, 2, 200, 3);
        addSample(buf, 3, 300, 3);
        addSample(buf, 4, 400, 3);
        expect(buf.length).toBe(3);
        expect(buf[0].value).toBe(2);
        expect(buf[2].value).toBe(4);
    });
});

describe('computeTrend', () => {
    it('liefert "unbestimmt" bei weniger als zwei Werten', () => {
        expect(computeTrend([])).toBe('unbestimmt');
        expect(computeTrend([{ time: 1, value: 5 }])).toBe('unbestimmt');
    });

    it('liefert "gleichbleibend" bei konstanten Werten', () => {
        const buf = [
            { time: 1000, value: 5 },
            { time: 2000, value: 5 },
            { time: 3000, value: 5 }
        ];
        expect(computeTrend(buf, 4000)).toBe('gleichbleibend');
    });

    it('liefert eine Richtungsangabe mit Trendwert bei veränderlichen Werten', () => {
        const buf = [
            { time: 1000, value: 5 },
            { time: 2000, value: 6 },
            { time: 3000, value: 7 },
            { time: 4000, value: 8 }
        ];
        // Beschriftung verbatim aus dem Original-Skript (Vergleich ältester Wert vs. projizierter Wert)
        expect(computeTrend(buf, 5000)).toBe('fallend (Trend: 9)');
    });
});
