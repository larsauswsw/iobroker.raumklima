'use strict';

/**
 * Legt die ioBroker-Objekte/States für Räume und globale Infos an und
 * aktualisiert sie. Verwendet setObjectNotExistsAsync, damit bestehende
 * Objekte nicht überschrieben werden.
 */

const FOLDER_DETAILS = 'DETAILS';
const FOLDER_ENGINE = 'DETAILS_Lüftungsempfehlung';

// Klimawerte, die für JEDEN Raum (innen wie außen) angelegt werden.
const CLIMATE_STATES = [
    { id: 'Temperatur',              name: 'gemessene Temperatur (inkl. Offset)', type: 'number', role: 'value.temperature', unit: '°C' },
    { id: 'relative_Luftfeuchtigkeit', name: 'gemessene relative Luftfeuchtigkeit (inkl. Offset)', type: 'number', role: 'value.humidity', unit: '%' },
    { id: 'Feuchtegehalt_Absolut',   name: 'absoluter Feuchtegehalt', type: 'number', role: 'value', unit: 'g/kg' },
    { id: 'Taupunkt',                name: 'Taupunkt', type: 'number', role: 'value.temperature', unit: '°C' },
    { id: 'Dampfgewicht',            name: 'Dampfgewicht (Wassergehalt)', type: 'number', role: 'value', unit: 'g/m³' }
];

const DETAIL_STATES = [
    { id: `${FOLDER_DETAILS}.Enthalpie`,            name: 'Enthalpie', type: 'number', role: 'value', unit: 'kJ/kg' },
    { id: `${FOLDER_DETAILS}.Sättigungsdampfdruck`, name: 'Sättigungsdampfdruck', type: 'number', role: 'value', unit: 'hPa' },
    { id: `${FOLDER_DETAILS}.Dampfdruck`,           name: 'Dampfdruck', type: 'number', role: 'value', unit: 'hPa' },
    { id: `${FOLDER_DETAILS}.Dampfgewicht_maximal`, name: 'max. Dampfgewicht (Wassergehalt)', type: 'number', role: 'value', unit: 'g/m³' }
];

// Nur für Innenräume (mit Außensensor-Referenz).
const ENGINE_STATES = [
    { id: `${FOLDER_ENGINE}.b1_Entfeuchten`,   name: 'Lüften Bedingung 1 entfeuchten erfüllt', type: 'boolean', role: 'indicator' },
    { id: `${FOLDER_ENGINE}.b2_Kühlen`,        name: 'Lüften Bedingung 2 kühlen erfüllt', type: 'boolean', role: 'indicator' },
    { id: `${FOLDER_ENGINE}.b3_Auskühlschutz`, name: 'Lüften Bedingung 3 Auskühlschutz erfüllt', type: 'boolean', role: 'indicator' },
    { id: `${FOLDER_ENGINE}.b4_Raumfeuchte`,   name: 'Lüften Bedingung 4 Raumfeuchte erfüllt', type: 'boolean', role: 'indicator' },
    { id: `${FOLDER_ENGINE}.Hysterese`,        name: 'Logik im Bereich der Hysterese (keine Änderung der Empfehlung)', type: 'boolean', role: 'indicator' },
    { id: `${FOLDER_ENGINE}.Beschreibung`,     name: 'Lüftungsempfehlung beschreibender Text', type: 'string', role: 'text' }
];

const GLOBAL_STATES = [
    { id: 'info.Lüften',        name: 'Muss irgendwo gelüftet werden', type: 'boolean', role: 'indicator' },
    { id: 'info.Lüften_Liste',  name: 'Liste der Räume in denen gelüftet werden muss', type: 'string', role: 'text' },
    { id: 'info.Lüften_Anzahl', name: 'Anzahl Lüftungsempfehlungen', type: 'number', role: 'value' },
    { id: 'info.JSON',          name: 'JSON-Ausgabe aller Werte', type: 'string', role: 'json' },
    { id: 'info.Aktualisierung', name: 'Aktualisierungszeitpunkt', type: 'string', role: 'date' },
    { id: 'info.Luftdruck',     name: 'mittlerer Luftdruck', type: 'number', role: 'value', unit: 'bar' },
    { id: 'info.Höhe_über_NN',  name: 'eigene Höhe über NN', type: 'number', role: 'value', unit: 'm' }
];

/**
 * Wandelt einen Raumnamen in eine für ioBroker-IDs sichere Form um.
 * @param {string} name
 * @returns {string}
 */
function sanitizeId(name) {
    return String(name)
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_äöüÄÖÜß-]/g, '_');
}

async function createState(adapter, id, def) {
    await adapter.setObjectNotExistsAsync(id, {
        type: 'state',
        common: {
            name: def.name,
            type: def.type,
            role: def.role,
            unit: def.unit,
            read: true,
            write: false,
            def: def.type === 'boolean' ? false : (def.type === 'number' ? 0 : '')
        },
        native: {}
    });
}

async function createFolder(adapter, id, name) {
    await adapter.setObjectNotExistsAsync(id, {
        type: 'folder',
        common: { name },
        native: {}
    });
}

/**
 * Legt Kanal + States für einen Raum an.
 * @param {object} adapter
 * @param {{id:string, name:string, isOutdoor:boolean}} room
 */
async function createRoomStates(adapter, room) {
    const base = `rooms.${room.id}`;
    await adapter.setObjectNotExistsAsync(base, {
        type: 'channel',
        common: { name: room.name },
        native: {}
    });

    for (const s of CLIMATE_STATES) {
        await createState(adapter, `${base}.${s.id}`, s);
    }

    await createFolder(adapter, `${base}.${FOLDER_DETAILS}`, 'Detailwerte');
    for (const s of DETAIL_STATES) {
        await createState(adapter, `${base}.${s.id}`, s);
    }

    if (room.isOutdoor) {
        await createState(adapter, `${base}.Feuchtetrend`,
            { id: 'Feuchtetrend', name: 'Trend abs. Feuchte außen', type: 'string', role: 'text' });
    } else {
        // Innenraum: Lüftungsempfehlung + Engine-Details
        await createState(adapter, `${base}.Lüftungsempfehlung`,
            { id: 'Lüftungsempfehlung', name: 'Lüftungsempfehlung', type: 'boolean', role: 'indicator' });
        await createFolder(adapter, `${base}.${FOLDER_ENGINE}`, 'Details Lüftungsempfehlung');
        for (const s of ENGINE_STATES) {
            await createState(adapter, `${base}.${s.id}`, s);
        }
    }
}

/** Legt die globalen Info-States an. */
async function createGlobalStates(adapter) {
    await createFolder(adapter, 'info', 'Globale Informationen');
    for (const s of GLOBAL_STATES) {
        await createState(adapter, s.id, s);
    }
}

/** Schreibt die berechneten Klimawerte eines Raums. */
async function updateRoomClimate(adapter, roomId, c) {
    const base = `rooms.${roomId}`;
    await adapter.setStateAsync(`${base}.Temperatur`,                       { val: c.t,     ack: true });
    await adapter.setStateAsync(`${base}.relative_Luftfeuchtigkeit`,        { val: c.rh,    ack: true });
    await adapter.setStateAsync(`${base}.Feuchtegehalt_Absolut`,           { val: c.x,     ack: true });
    await adapter.setStateAsync(`${base}.Taupunkt`,                        { val: c.dp,    ack: true });
    await adapter.setStateAsync(`${base}.Dampfgewicht`,                    { val: c.rd,    ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_DETAILS}.Enthalpie`,            { val: c.h,     ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_DETAILS}.Sättigungsdampfdruck`, { val: c.sdd,   ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_DETAILS}.Dampfdruck`,           { val: c.dd,    ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_DETAILS}.Dampfgewicht_maximal`, { val: c.maxrd, ack: true });
}

/** Schreibt das Ergebnis der Lüftungsengine eines Innenraums. */
async function updateRoomVentilation(adapter, roomId, r) {
    const base = `rooms.${roomId}`;
    await adapter.setStateAsync(`${base}.Lüftungsempfehlung`,                { val: r.lueften,     ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_ENGINE}.b1_Entfeuchten`,   { val: r.b1,          ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_ENGINE}.b2_Kühlen`,        { val: r.b2,          ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_ENGINE}.b3_Auskühlschutz`, { val: r.b3,          ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_ENGINE}.b4_Raumfeuchte`,   { val: r.b4,          ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_ENGINE}.Hysterese`,        { val: r.hysterese,   ack: true });
    await adapter.setStateAsync(`${base}.${FOLDER_ENGINE}.Beschreibung`,     { val: r.beschreibung, ack: true });
}

module.exports = {
    sanitizeId,
    createRoomStates,
    createGlobalStates,
    updateRoomClimate,
    updateRoomVentilation,
    CLIMATE_STATES,
    DETAIL_STATES,
    ENGINE_STATES,
    GLOBAL_STATES,
    FOLDER_DETAILS,
    FOLDER_ENGINE
};
