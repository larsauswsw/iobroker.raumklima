'use strict';

const {
    computeClimate,
    airPressureBar,
    airPressureHpa,
    dewpoint
} = require('../lib/dewpoint');

describe('computeClimate', () => {
    it('berechnet plausible Werte für 22 °C / 65 %', () => {
        const c = computeClimate(22, 65, 15);
        expect(c.t).toBe(22);
        expect(c.rh).toBe(65);
        expect(c.x).toBeCloseTo(10.72, 2);
        expect(c.dp).toBeCloseTo(15.1, 1);
        expect(c.h).toBeCloseTo(49.38, 2);
        expect(c.sdd).toBeCloseTo(26.44, 2);
        expect(c.dd).toBeCloseTo(17.18, 2);
        expect(c.rd).toBeCloseTo(12.62, 2);
        expect(c.maxrd).toBeCloseTo(19.41, 2);
    });

    it('Taupunkt liegt unter der Temperatur', () => {
        const c = computeClimate(20, 50, 15);
        expect(c.dp).toBeLessThan(c.t);
        expect(c.x).toBeCloseTo(7.26, 2);
    });

    it('nutzt die Frost-Konstanten für Temperaturen unter 0 °C', () => {
        const c = computeClimate(-5, 80, 15);
        expect(c.x).toBeCloseTo(1.98, 2);
        expect(c.dp).toBeCloseTo(-7.6, 1);
    });

    it('akzeptiert String-Eingaben (Sensorwerte)', () => {
        const c = computeClimate('22', '65', 15);
        expect(c.x).toBeCloseTo(10.72, 2);
    });
});

describe('airPressure', () => {
    it('berechnet bar aus der Höhe, wenn kein Sensor angegeben ist', () => {
        expect(airPressureBar(15)).toBeCloseTo(1.011375, 5);
    });

    it('nutzt den Sensorwert (hPa -> bar), wenn vorhanden', () => {
        expect(airPressureBar(15, 1000)).toBeCloseTo(1.0, 5);
    });

    it('airPressureHpa fällt ohne Sensor auf NN-Druck zurück', () => {
        expect(airPressureHpa(15)).toBeCloseTo(1011.45, 1);
    });
});

describe('dewpoint', () => {
    it('liefert absolute Feuchte und Taupunkt', () => {
        const p = airPressureHpa(15);
        const r = dewpoint(22, 65, p);
        expect(r.x).toBeCloseTo(10.72, 1);
        expect(r.dp).toBeCloseTo(15.1, 1);
    });
});
