'use strict';

const { evaluate } = require('../lib/ventilation');

const PARAMS = { minTemp: 19, humMin: 40, humMax: 60 };

describe('evaluate', () => {
    it('empfiehlt Lüften, wenn alle vier Bedingungen erfüllt sind', () => {
        // innen warm & feucht, außen kühl & trocken
        const r = evaluate({ t: 22, rh: 65, x: 10.5 }, { t: 10, x: 5 }, PARAMS, null);
        expect(r.lueften).toBe(true);
        expect(r.hysterese).toBe(false);
        expect(r.b1 && r.b2 && r.b3 && r.b4).toBe(true);
        expect(r.beschreibung).toContain('relative Feuchte');
    });

    it('empfiehlt Fenster zu, wenn die Außenluft zu feucht ist', () => {
        const r = evaluate({ t: 22, rh: 55, x: 9 }, { t: 10, x: 9.5 }, PARAMS, true);
        expect(r.lueften).toBe(false);
        expect(r.hysterese).toBe(false);
        expect(r.beschreibung).toContain('Fenster zu');
        expect(r.beschreibung).toContain('zu feucht');
    });

    it('hält im Hysterese-Bereich die bisherige Empfehlung (prev=true bleibt true)', () => {
        const r = evaluate({ t: 22, rh: 50, x: 10 }, { t: 20, x: 9 }, PARAMS, true);
        expect(r.hysterese).toBe(true);
        expect(r.lueften).toBe(true);
        expect(r.beschreibung).toContain('bedingt empfohlen');
    });

    it('empfiehlt im Hysterese-Bereich ohne Vorgabe (prev=null) Fenster zu', () => {
        const r = evaluate({ t: 22, rh: 50, x: 10 }, { t: 20, x: 9 }, PARAMS, null);
        expect(r.hysterese).toBe(true);
        expect(r.lueften).toBe(false);
    });

    it('respektiert den Auskühlschutz: zu kalter Raum -> Fenster zu', () => {
        // Innentemperatur unter Mindesttemperatur
        const r = evaluate({ t: 18, rh: 70, x: 12 }, { t: 5, x: 4 }, PARAMS, true);
        expect(r.lueften).toBe(false);
        expect(r.b3).toBe(false);
    });
});
