'use strict';

const utils = require('@iobroker/adapter-core');
const { computeClimate, airPressureBar } = require('./lib/dewpoint');
const { evaluate } = require('./lib/ventilation');
const { addSample, computeTrend } = require('./lib/trend');
const {
    sanitizeId,
    createRoomStates,
    createGlobalStates,
    updateRoomClimate,
    updateRoomVentilation
} = require('./lib/stateManager');

const TREND_MAX = 4;

class Raumklima extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'raumklima' });
        this.recalcTimer = null;
        this.interval = null;
        this.rooms = [];
        this.roomById = new Map();
        this.climateById = new Map();   // roomId -> berechnete Klimawerte
        this.prevLueften = new Map();   // roomId -> bisherige Empfehlung (für Hysterese + Änderungserkennung)
        this.trendBuffers = new Map();  // roomId -> [{time,value}]
        this.sensorToRooms = new Map(); // sensor-DP -> Set(roomId) (nur informativ)
        this.subscribedIds = new Set();
        this.pressureHpa = undefined;
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        const cfg = this.config;
        const rawRooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];

        if (rawRooms.length === 0) {
            this.log.warn('Keine Räume konfiguriert. Bitte in der Admin-UI Räume anlegen.');
            return;
        }

        // Räume normalisieren
        const byName = new Map();
        for (const r of rawRooms) {
            if (!r.name || !r.tempSensor || !r.humSensor) {
                this.log.warn(`Überspringe unvollständigen Raum: ${JSON.stringify(r)}`);
                continue;
            }
            const room = {
                id: sanitizeId(r.name),
                name: r.name,
                isOutdoor: !!r.isOutdoor,
                tempSensor: r.tempSensor,
                humSensor: r.humSensor,
                tempOffset: Number(r.tempOffset) || 0,
                humOffset: Number(r.humOffset) || 0,
                outdoorRef: r.outdoorRef ? sanitizeId(r.outdoorRef) : '',
                minTemp: r.minTemp != null && r.minTemp !== '' ? String(r.minTemp) : '19',
                humMin: r.humMin != null && r.humMin !== '' ? Number(r.humMin) : 40,
                humMax: r.humMax != null && r.humMax !== '' ? Number(r.humMax) : 60
            };
            this.rooms.push(room);
            this.roomById.set(room.id, room);
            byName.set(room.id, room);
        }

        if (this.rooms.length === 0) {
            this.log.warn('Keine gültigen Räume. Bitte Name, Temperatur- und Feuchte-Datenpunkt eintragen.');
            return;
        }

        // Außensensor-Referenzen prüfen
        for (const room of this.rooms) {
            if (!room.isOutdoor) {
                if (!room.outdoorRef || !this.roomById.has(room.outdoorRef)) {
                    this.log.warn(`Raum "${room.name}": kein gültiger Außensensor referenziert. Es wird keine Lüftungsempfehlung berechnet.`);
                } else if (!this.roomById.get(room.outdoorRef).isOutdoor) {
                    this.log.warn(`Raum "${room.name}": referenzierter Raum "${room.outdoorRef}" ist nicht als Außensensor markiert.`);
                }
            }
        }

        // Objekte anlegen
        await createGlobalStates(this);
        for (const room of this.rooms) {
            await createRoomStates(this, room);
        }

        // Höhe/Luftdruck schreiben
        await this.setStateAsync('info.Höhe_über_NN', { val: Number(cfg.heightNN) || 0, ack: true });

        // Luftdrucksensor lesen (falls konfiguriert)
        if (cfg.pressureSensor) {
            await this.readPressure(cfg.pressureSensor);
        }
        await this.setStateAsync('info.Luftdruck',
            { val: airPressureBar(Number(cfg.heightNN) || 0, this.pressureHpa), ack: true });

        // Subscriptions: Sensoren + Luftdruck + Min-Temp-DPs
        for (const room of this.rooms) {
            this.subscribe(room.tempSensor);
            this.subscribe(room.humSensor);
            if (!this.isNumeric(room.minTemp)) {
                this.subscribe(room.minTemp);
            }
        }
        if (cfg.pressureSensor) {
            this.subscribe(cfg.pressureSensor);
        }

        // periodische Neuberechnung
        const minutes = Math.max(1, Number(cfg.interval) || 30);
        this.interval = setInterval(() => this.recalcAll(), minutes * 60 * 1000);
        this.log.info(`Raumklima gestartet: ${this.rooms.length} Raum/Räume, Neuberechnung alle ${minutes} Minuten.`);

        await this.recalcAll();
    }

    subscribe(id) {
        if (!id || this.subscribedIds.has(id)) return;
        this.subscribedIds.add(id);
        this.subscribeForeignStates(id);
    }

    isNumeric(v) {
        return v !== '' && v !== null && !isNaN(Number(v));
    }

    async readPressure(id) {
        try {
            const st = await this.getForeignStateAsync(id);
            if (st && st.val != null && !isNaN(Number(st.val))) {
                this.pressureHpa = Number(st.val);
            }
        } catch (e) {
            this.log.warn(`Luftdrucksensor ${id} nicht lesbar: ${e.message}`);
        }
    }

    onStateChange(id, state) {
        if (!state || state.val == null) return;

        if (id === this.config.pressureSensor) {
            if (!isNaN(Number(state.val))) {
                this.pressureHpa = Number(state.val);
                this.setStateAsync('info.Luftdruck',
                    { val: airPressureBar(Number(this.config.heightNN) || 0, this.pressureHpa), ack: true });
            }
        }

        // Änderungen coalescen und einmal neu rechnen
        if (this.recalcTimer) clearTimeout(this.recalcTimer);
        this.recalcTimer = setTimeout(() => this.recalcAll(), 800);
    }

    async getSensorValue(id) {
        try {
            const st = await this.getForeignStateAsync(id);
            if (!st || st.val == null) return null;
            const n = Number(st.val);
            return isNaN(n) ? null : n;
        } catch (e) {
            this.log.warn(`Sensor ${id} nicht lesbar: ${e.message}`);
            return null;
        }
    }

    async resolveMinTemp(room) {
        if (this.isNumeric(room.minTemp)) {
            return Number(room.minTemp);
        }
        const v = await this.getSensorValue(room.minTemp);
        return v == null ? 19 : v;
    }

    /** Klimawerte eines Raums berechnen, States schreiben, Cache füllen. */
    async computeRoom(room) {
        const t = await this.getSensorValue(room.tempSensor);
        const rh = await this.getSensorValue(room.humSensor);
        if (t == null || rh == null) {
            this.log.debug(`Raum "${room.name}": Sensorwerte fehlen (t=${t}, rh=${rh}).`);
            return null;
        }
        const climate = computeClimate(t + room.tempOffset, rh + room.humOffset,
            Number(this.config.heightNN) || 0, this.pressureHpa);
        await updateRoomClimate(this, room.id, climate);
        this.climateById.set(room.id, climate);

        if (room.isOutdoor) {
            const buf = this.trendBuffers.get(room.id) || [];
            addSample(buf, climate.x, Date.now(), TREND_MAX);
            this.trendBuffers.set(room.id, buf);
            await this.setStateAsync(`rooms.${room.id}.Feuchtetrend`,
                { val: computeTrend(buf), ack: true });
        }
        return climate;
    }

    /** Lüftungsengine für einen Innenraum auswerten. */
    async evaluateRoom(room) {
        const indoor = this.climateById.get(room.id);
        if (!indoor) return;
        if (!room.outdoorRef || !this.roomById.has(room.outdoorRef)) return;
        const outdoor = this.climateById.get(room.outdoorRef);
        if (!outdoor) return;

        const minTemp = await this.resolveMinTemp(room);
        const prev = this.prevLueften.has(room.id) ? this.prevLueften.get(room.id) : null;
        const result = evaluate(indoor, outdoor,
            { minTemp, humMin: room.humMin, humMax: room.humMax }, prev);

        await updateRoomVentilation(this, room.id, result);

        const isFirst = !this.prevLueften.has(room.id);
        if (!isFirst && prev !== result.lueften) {
            this.sendPushover(room, result.lueften);
        }
        this.prevLueften.set(room.id, result.lueften);
    }

    async recalcAll() {
        this.recalcTimer = null;

        // 1) Außenräume zuerst (Referenz für innen)
        for (const room of this.rooms) {
            if (room.isOutdoor) await this.computeRoom(room);
        }
        // 2) Innenräume
        for (const room of this.rooms) {
            if (!room.isOutdoor) await this.computeRoom(room);
        }
        // 3) Lüftungsengine für Innenräume
        for (const room of this.rooms) {
            if (!room.isOutdoor) await this.evaluateRoom(room);
        }
        // 4) globale Aggregation
        await this.aggregate();
    }

    async aggregate() {
        let anzahl = 0;
        const liste = [];
        const jsonArr = [];

        for (const room of this.rooms) {
            const c = this.climateById.get(room.id);
            const entry = { Raum: room.name };
            if (c) {
                entry.Temperatur = c.t;
                entry.relative_Luftfeuchtigkeit = c.rh;
                entry.Feuchtegehalt_Absolut = c.x;
                entry.Taupunkt = c.dp;
            }
            if (!room.isOutdoor) {
                const lueften = this.prevLueften.get(room.id);
                entry.Lüftungsempfehlung = !!lueften;
                if (lueften) {
                    anzahl++;
                    liste.push(room.name);
                }
            }
            jsonArr.push(entry);
        }

        await this.setStateAsync('info.Lüften',        { val: anzahl > 0, ack: true });
        await this.setStateAsync('info.Lüften_Liste',  { val: liste.join(', '), ack: true });
        await this.setStateAsync('info.Lüften_Anzahl', { val: anzahl, ack: true });
        await this.setStateAsync('info.JSON',          { val: JSON.stringify(jsonArr), ack: true });
        await this.setStateAsync('info.Aktualisierung', { val: new Date().toISOString(), ack: true });
    }

    sendPushover(room, lueften) {
        const { pushoverEnabled, pushoverInstance } = this.config;
        if (!pushoverEnabled || !pushoverInstance) return;
        const message = `Raum "${room.name}": Lüften ${lueften ? 'empfohlen' : 'nicht mehr nötig'}`;
        this.sendTo(pushoverInstance, 'send', { message, title: 'Raumklima' });
        this.log.info(`Pushover gesendet: ${message}`);
    }

    onMessage(obj) {
        if (!obj || !obj.command) return;

        if (obj.command === 'getOutdoorRooms') {
            // Liefert die als "Außen" markierten Räume als Dropdown-Optionen.
            // Bevorzugt die live übergebenen Tabellendaten, sonst die gespeicherte Config.
            const rooms = (obj.message && Array.isArray(obj.message.rooms))
                ? obj.message.rooms
                : (Array.isArray(this.config.rooms) ? this.config.rooms : []);
            const options = rooms
                .filter(r => r && r.isOutdoor && r.name)
                .map(r => ({ value: r.name, label: r.name }));
            if (obj.callback) this.sendTo(obj.from, obj.command, options, obj.callback);
            return;
        }

        if (obj.command !== 'testPushover') return;
        const instance = (obj.message && obj.message.pushoverInstance) || this.config.pushoverInstance;
        if (!instance) {
            this.log.warn('testPushover: keine Pushover-Instanz konfiguriert.');
            if (obj.callback) this.sendTo(obj.from, obj.command, { error: 'Keine Pushover-Instanz konfiguriert.' }, obj.callback);
            return;
        }
        this.sendTo(instance, 'send', {
            message: 'Test-Nachricht vom Raumklima-Adapter',
            title: 'Raumklima'
        });
        if (obj.callback) this.sendTo(obj.from, obj.command, { result: 'Test-Nachricht gesendet!' }, obj.callback);
    }

    async onUnload(callback) {
        try {
            if (this.interval) clearInterval(this.interval);
            if (this.recalcTimer) clearTimeout(this.recalcTimer);
            this.interval = null;
            this.recalcTimer = null;
        } catch (_e) {
            // ignore
        } finally {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new Raumklima(options);
} else {
    new Raumklima();
}
