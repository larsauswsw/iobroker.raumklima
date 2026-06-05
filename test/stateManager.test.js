'use strict';

const {
    sanitizeId,
    createRoomStates,
    createGlobalStates,
    updateRoomClimate,
    updateRoomVentilation
} = require('../lib/stateManager');

function makeAdapter() {
    return {
        setObjectNotExistsAsync: jest.fn().mockResolvedValue(undefined),
        setStateAsync: jest.fn().mockResolvedValue(undefined),
        getStateAsync: jest.fn().mockResolvedValue(null)
    };
}

describe('sanitizeId', () => {
    it('ersetzt Leerzeichen und unzulässige Zeichen, behält Umlaute', () => {
        expect(sanitizeId('Wohn zimmer')).toBe('Wohn_zimmer');
        expect(sanitizeId('Küche')).toBe('Küche');
        expect(sanitizeId('Bad [oben]')).toBe('Bad__oben_');
    });
});

describe('createRoomStates', () => {
    it('legt für einen Außenraum den Trend, aber keine Lüftungsempfehlung an', async () => {
        const adapter = makeAdapter();
        await createRoomStates(adapter, { id: 'Aussen', name: 'Aussen', isOutdoor: true });

        const ids = adapter.setObjectNotExistsAsync.mock.calls.map(c => c[0]);
        expect(ids).toContain('rooms.Aussen');
        expect(ids).toContain('rooms.Aussen.Temperatur');
        expect(ids).toContain('rooms.Aussen.Feuchtetrend');
        expect(ids).not.toContain('rooms.Aussen.Lüftungsempfehlung');
    });

    it('legt für einen Innenraum die Lüftungsempfehlung + Engine-Details an', async () => {
        const adapter = makeAdapter();
        await createRoomStates(adapter, { id: 'Wohnzimmer', name: 'Wohnzimmer', isOutdoor: false });

        const ids = adapter.setObjectNotExistsAsync.mock.calls.map(c => c[0]);
        expect(ids).toContain('rooms.Wohnzimmer.Lüftungsempfehlung');
        expect(ids).toContain('rooms.Wohnzimmer.DETAILS_Lüftungsempfehlung.b1_Entfeuchten');
        expect(ids).toContain('rooms.Wohnzimmer.DETAILS_Lüftungsempfehlung.Beschreibung');
        expect(ids).not.toContain('rooms.Wohnzimmer.Feuchtetrend');
    });
});

describe('createGlobalStates', () => {
    it('legt die globalen Info-States an', async () => {
        const adapter = makeAdapter();
        await createGlobalStates(adapter);
        const ids = adapter.setObjectNotExistsAsync.mock.calls.map(c => c[0]);
        expect(ids).toContain('info.Lüften');
        expect(ids).toContain('info.JSON');
        expect(ids).toContain('info.Luftdruck');
    });
});

describe('updateRoomClimate', () => {
    it('schreibt alle Klimawerte mit ack=true', async () => {
        const adapter = makeAdapter();
        await updateRoomClimate(adapter, 'Wohnzimmer', {
            t: 22, rh: 65, x: 10.72, dp: 15.1, h: 49.38, sdd: 26.44, dd: 17.18, rd: 12.62, maxrd: 19.41
        });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('rooms.Wohnzimmer.Temperatur', { val: 22, ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('rooms.Wohnzimmer.Feuchtegehalt_Absolut', { val: 10.72, ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('rooms.Wohnzimmer.DETAILS.Enthalpie', { val: 49.38, ack: true });
    });
});

describe('updateRoomVentilation', () => {
    it('schreibt Empfehlung, Bedingungen und Beschreibung', async () => {
        const adapter = makeAdapter();
        await updateRoomVentilation(adapter, 'Wohnzimmer', {
            lueften: true, hysterese: false, b1: true, b2: true, b3: true, b4: true, beschreibung: 'Test'
        });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('rooms.Wohnzimmer.Lüftungsempfehlung', { val: true, ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('rooms.Wohnzimmer.DETAILS_Lüftungsempfehlung.b1_Entfeuchten', { val: true, ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('rooms.Wohnzimmer.DETAILS_Lüftungsempfehlung.Beschreibung', { val: 'Test', ack: true });
    });
});
