/*:
 * @plugindesc L3 Equipment System v1.0 - Raretes d'equipement et bonus de sets.
 * @author L3ViKk
 *
 * @param Data File
 * @text Fichier de donnees
 * @type string
 * @default L3Equipment.json
 *
 * @param Enable Rarity Colors
 * @text Couleurs des raretes
 * @type boolean
 * @default true
 *
 * @param Enable Set Bonuses
 * @text Bonus de set
 * @type boolean
 * @default true
 *
 * @param Debug
 * @text Debug console
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * L3 Equipment System
 * ============================================================================
 *
 * Ajoute une couche de raretes et de bonus d'ensemble aux armes et armures.
 *
 * Le fichier principal est dans data/L3Equipment.json.
 *
 * Cles d'equipement :
 *   weapon:1
 *   armor:3
 *
 * Bonus disponibles :
 *   params  : mhp, mmp, atk, def, mat, mdf, agi, luk
 *   rates   : multiplicateurs de params, exemple atk: 1.10
 *   xparams : hit, eva, cri, cev, mev, mrf, cnt, hrg, mrg, trg
 *   sparams : tgr, grd, rec, pha, mcr, tcr, pdr, mdr, fdr, exr
 *
 * Notes possibles directement dans la base RPG Maker :
 *   <L3Rarity: rare>
 *   <L3Set: guardian_oath>
 *   <L3Bonus: atk +5>
 *   <L3Bonus: mhp +100>
 *   <L3Rate: def +8%>
 *   <L3XParam: cri +4%>
 *   <L3SParam: rec +10%>
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_EquipmentSystem";
    var params = PluginManager.parameters(PLUGIN_NAME) || {};

    function param(name, fallback) {
        var value = params[name];
        return value === undefined || value === null || value === "" ? fallback : value;
    }

    function boolParam(name, fallback) {
        var value = param(name, fallback ? "true" : "false");
        return value === true || value === "true" || value === "1";
    }

    var config = {
        dataFile: String(param("Data File", "L3Equipment.json")),
        rarityColors: boolParam("Enable Rarity Colors", true),
        setBonuses: boolParam("Enable Set Bonuses", true),
        debug: boolParam("Debug", false)
    };

    var Equipment = {};
    window.L3Equipment = Equipment;

    var databaseReady = false;
    var dataVersion = 1;
    var cssReady = false;

    var PARAM_IDS = {
        mhp: 0, hp: 0, maxhp: 0,
        mmp: 1, mp: 1, maxmp: 1,
        atk: 2, attack: 2,
        def: 3, defense: 3,
        mat: 4, magic: 4, matk: 4,
        mdf: 5, magicdefense: 5, mdef: 5,
        agi: 6, agility: 6,
        luk: 7, luck: 7
    };

    var PARAM_LABELS = [
        "PV max",
        "PM max",
        "Attaque",
        "Defense",
        "Magie",
        "Defense mag.",
        "Agilite",
        "Chance"
    ];

    var XPARAM_IDS = {
        hit: 0,
        eva: 1,
        cri: 2,
        cev: 3,
        mev: 4,
        mrf: 5,
        cnt: 6,
        hrg: 7,
        mrg: 8,
        trg: 9
    };

    var XPARAM_LABELS = [
        "Precision",
        "Esquive",
        "Critique",
        "Esq. critique",
        "Esq. magique",
        "Reflet magique",
        "Contre-attaque",
        "Regen PV",
        "Regen PM",
        "Regen PT"
    ];

    var SPARAM_IDS = {
        tgr: 0,
        grd: 1,
        rec: 2,
        pha: 3,
        mcr: 4,
        tcr: 5,
        pdr: 6,
        mdr: 7,
        fdr: 8,
        exr: 9
    };

    var SPARAM_LABELS = [
        "Ciblage",
        "Garde",
        "Recuperation",
        "Pharmacologie",
        "Cout PM",
        "Charge PT",
        "Degats physiques",
        "Degats magiques",
        "Degats de sol",
        "Experience"
    ];

    var DEFAULT_RARITIES = {
        common: { name: "Commun", color: "#cbd5e1", rank: 0 },
        magic: { name: "Magique", color: "#38bdf8", rank: 1 },
        rare: { name: "Rare", color: "#facc15", rank: 2 },
        epic: { name: "Epique", color: "#c084fc", rank: 3 },
        legendary: { name: "Legendaire", color: "#f97316", rank: 4 },
        unique: { name: "Unique", color: "#fb7185", rank: 5 }
    };

    var emptyBonus = {
        params: {},
        rates: {},
        xparams: {},
        sparams: {}
    };

    function log(message) {
        if (config.debug && window.console) console.log("[L3Equipment] " + message);
    }

    function cloneBonus() {
        return {
            params: {},
            rates: {},
            xparams: {},
            sparams: {}
        };
    }

    function normalizeId(id) {
        return String(id || "").trim().toLowerCase();
    }

    function classSafe(id) {
        return normalizeId(id).replace(/[^a-z0-9_-]/g, "-");
    }

    function idFromMap(map, key) {
        key = normalizeId(key);
        if (map.hasOwnProperty(key)) return map[key];
        var numeric = Number(key);
        if (!isNaN(numeric)) return numeric;
        return null;
    }

    function normalizeNumber(value, fallback) {
        if (value === undefined || value === null || value === "") return fallback || 0;
        if (typeof value === "string") value = value.replace(",", ".").replace("%", "");
        var number = Number(value);
        return isNaN(number) ? (fallback || 0) : number;
    }

    function rateFromValue(value) {
        if (value === undefined || value === null || value === "") return 1;
        if (typeof value === "string") {
            var text = value.replace(",", ".").trim();
            if (text.indexOf("%") >= 0) {
                return 1 + normalizeNumber(text, 0) / 100;
            }
        }
        var number = normalizeNumber(value, 1);
        if (number > 3 || number < -3) return 1 + number / 100;
        return number;
    }

    function additiveRateFromValue(value) {
        if (value === undefined || value === null || value === "") return 0;
        if (typeof value === "string") {
            var text = value.replace(",", ".").trim();
            if (text.indexOf("%") >= 0) return normalizeNumber(text, 0) / 100;
        }
        var number = normalizeNumber(value, 0);
        if (number > 1 || number < -1) return number / 100;
        return number;
    }

    function normalizeParamBlock(source, map, asRate, additiveRate) {
        var result = {};
        if (!source) return result;
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                var id = idFromMap(map, key);
                if (id === null) continue;
                if (asRate) result[id] = rateFromValue(source[key]);
                else if (additiveRate) result[id] = additiveRateFromValue(source[key]);
                else result[id] = normalizeNumber(source[key], 0);
            }
        }
        return result;
    }

    function normalizeBonus(source) {
        var result = cloneBonus();
        source = source || {};
        result.params = normalizeParamBlock(source.params, PARAM_IDS, false, false);
        result.rates = normalizeParamBlock(source.rates, PARAM_IDS, true, false);
        result.xparams = normalizeParamBlock(source.xparams, XPARAM_IDS, false, true);
        result.sparams = normalizeParamBlock(source.sparams, SPARAM_IDS, true, false);
        return result;
    }

    function addFlat(target, category, key, value) {
        if (value === undefined || value === null || value === 0) return;
        if (category === "rates" || category === "sparams") {
            target[category][key] = (target[category][key] || 1) * value;
        } else {
            target[category][key] = (target[category][key] || 0) + value;
        }
    }

    function addBonus(target, source) {
        source = source || emptyBonus;
        var categories = ["params", "rates", "xparams", "sparams"];
        for (var i = 0; i < categories.length; i++) {
            var category = categories[i];
            var block = source[category] || {};
            for (var key in block) {
                if (block.hasOwnProperty(key)) addFlat(target, category, key, block[key]);
            }
        }
        return target;
    }

    function mergeBonus(a, b) {
        var result = cloneBonus();
        addBonus(result, a);
        addBonus(result, b);
        return result;
    }

    function rawData() {
        return window.$dataL3Equipment || {};
    }

    function writableData() {
        if (!window.$dataL3Equipment) window.$dataL3Equipment = {};
        if (!window.$dataL3Equipment.rarities) window.$dataL3Equipment.rarities = {};
        if (!window.$dataL3Equipment.equipment) window.$dataL3Equipment.equipment = {};
        if (!window.$dataL3Equipment.sets) window.$dataL3Equipment.sets = {};
        return window.$dataL3Equipment;
    }

    function rarityData(id) {
        id = normalizeId(id || "common");
        var rarities = rawData().rarities || {};
        return rarities[id] || DEFAULT_RARITIES[id] || DEFAULT_RARITIES.common;
    }

    function allRarityData() {
        var result = {};
        var id;
        for (id in DEFAULT_RARITIES) {
            if (DEFAULT_RARITIES.hasOwnProperty(id)) result[id] = DEFAULT_RARITIES[id];
        }
        var custom = rawData().rarities || {};
        for (id in custom) {
            if (custom.hasOwnProperty(id)) result[normalizeId(id)] = custom[id];
        }
        return result;
    }

    function isWeapon(item) {
        return window.DataManager && DataManager.isWeapon && DataManager.isWeapon(item);
    }

    function isArmor(item) {
        return window.DataManager && DataManager.isArmor && DataManager.isArmor(item);
    }

    function isEquipment(item) {
        return isWeapon(item) || isArmor(item);
    }

    function equipmentKey(item) {
        if (!item) return "";
        if (isWeapon(item)) return "weapon:" + item.id;
        if (isArmor(item)) return "armor:" + item.id;
        return "";
    }

    function parseNotetags(item) {
        if (!item) return { rarity: "", set: "", bonuses: cloneBonus() };
        if (item._l3EquipmentNote) return item._l3EquipmentNote;

        var result = { rarity: "", set: "", bonuses: cloneBonus() };
        var note = item.note || "";
        var lines = note.split(/[\r\n]+/);

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var match;

            match = line.match(/^<L3Rarity:\s*([^>]+)>$/i);
            if (match) {
                result.rarity = normalizeId(match[1]);
                continue;
            }

            match = line.match(/^<L3Set:\s*([^>]+)>$/i);
            if (match) {
                result.set = normalizeId(match[1]);
                continue;
            }

            match = line.match(/^<L3Bonus:\s*([a-z0-9_]+)\s*([+\-]?[0-9]+(?:[\.,][0-9]+)?%?)>$/i);
            if (match) {
                var paramId = idFromMap(PARAM_IDS, match[1]);
                if (paramId !== null) result.bonuses.params[paramId] = (result.bonuses.params[paramId] || 0) + normalizeNumber(match[2], 0);
                continue;
            }

            match = line.match(/^<L3Rate:\s*([a-z0-9_]+)\s*([+\-]?[0-9]+(?:[\.,][0-9]+)?%?)>$/i);
            if (match) {
                var rateId = idFromMap(PARAM_IDS, match[1]);
                if (rateId !== null) result.bonuses.rates[rateId] = (result.bonuses.rates[rateId] || 1) * rateFromValue(match[2]);
                continue;
            }

            match = line.match(/^<L3XParam:\s*([a-z0-9_]+)\s*([+\-]?[0-9]+(?:[\.,][0-9]+)?%?)>$/i);
            if (match) {
                var xparamId = idFromMap(XPARAM_IDS, match[1]);
                if (xparamId !== null) result.bonuses.xparams[xparamId] = (result.bonuses.xparams[xparamId] || 0) + additiveRateFromValue(match[2]);
                continue;
            }

            match = line.match(/^<L3SParam:\s*([a-z0-9_]+)\s*([+\-]?[0-9]+(?:[\.,][0-9]+)?%?)>$/i);
            if (match) {
                var sparamId = idFromMap(SPARAM_IDS, match[1]);
                if (sparamId !== null) result.bonuses.sparams[sparamId] = (result.bonuses.sparams[sparamId] || 1) * rateFromValue(match[2]);
            }
        }

        item._l3EquipmentNote = result;
        return result;
    }

    function equipmentEntry(item) {
        var key = equipmentKey(item);
        var entries = rawData().equipment || {};
        return entries[key] || {};
    }

    function metadata(item) {
        if (!item || !isEquipment(item)) return null;
        var entry = equipmentEntry(item);
        var note = parseNotetags(item);
        var entryBonus = normalizeBonus(entry.bonuses);

        return {
            key: equipmentKey(item),
            rarity: normalizeId(entry.rarity || note.rarity || "common"),
            set: normalizeId(entry.set || note.set || ""),
            bonuses: mergeBonus(note.bonuses, entryBonus)
        };
    }

    function equipSignature(actor) {
        if (!actor || !actor.equips) return "";
        var equips = actor.equips();
        var parts = [];
        for (var i = 0; i < equips.length; i++) {
            var item = equips[i];
            parts.push(item ? equipmentKey(item) : "-");
        }
        return dataVersion + ":" + parts.join("|");
    }

    function setData(setId) {
        setId = normalizeId(setId);
        var sets = rawData().sets || {};
        return sets[setId] || null;
    }

    function setThresholds(set) {
        var result = [];
        var bonuses = set && set.bonuses ? set.bonuses : {};
        for (var key in bonuses) {
            if (bonuses.hasOwnProperty(key)) {
                var count = Number(key);
                if (!isNaN(count)) result.push(count);
            }
        }
        result.sort(function(a, b) { return a - b; });
        return result;
    }

    function buildActorCache(actor) {
        var total = cloneBonus();
        var setCounts = {};
        var activeSets = {};
        var equips = actor && actor.equips ? actor.equips() : [];

        for (var i = 0; i < equips.length; i++) {
            var item = equips[i];
            var meta = metadata(item);
            if (!meta) continue;
            addBonus(total, meta.bonuses);
            if (meta.set) setCounts[meta.set] = (setCounts[meta.set] || 0) + 1;
        }

        if (config.setBonuses) {
            for (var setId in setCounts) {
                if (setCounts.hasOwnProperty(setId)) {
                    var set = setData(setId);
                    if (!set) continue;
                    var thresholds = setThresholds(set);
                    for (var t = 0; t < thresholds.length; t++) {
                        var count = thresholds[t];
                        if (setCounts[setId] >= count) {
                            addBonus(total, normalizeBonus(set.bonuses[String(count)]));
                            activeSets[setId] = activeSets[setId] || [];
                            activeSets[setId].push(count);
                        }
                    }
                }
            }
        }

        return {
            signature: equipSignature(actor),
            bonuses: total,
            setCounts: setCounts,
            activeSets: activeSets
        };
    }

    function actorCache(actor) {
        if (!actor) return buildActorCache(null);
        var signature = equipSignature(actor);
        if (!actor._l3EquipmentCache || actor._l3EquipmentCache.signature !== signature) {
            actor._l3EquipmentCache = buildActorCache(actor);
        }
        return actor._l3EquipmentCache;
    }

    function percent(value) {
        var number = Math.round(value * 100);
        return (number > 0 ? "+" : "") + number + "%";
    }

    function ratePercent(value) {
        var number = Math.round((value - 1) * 100);
        return (number > 0 ? "+" : "") + number + "%";
    }

    function bonusLines(bonus) {
        var lines = [];
        bonus = bonus || emptyBonus;
        var key;

        for (key in bonus.params) {
            if (bonus.params.hasOwnProperty(key) && bonus.params[key]) {
                lines.push((bonus.params[key] > 0 ? "+" : "") + bonus.params[key] + " " + (PARAM_LABELS[Number(key)] || ("Param " + key)));
            }
        }

        for (key in bonus.rates) {
            if (bonus.rates.hasOwnProperty(key) && bonus.rates[key] !== 1) {
                lines.push(ratePercent(bonus.rates[key]) + " " + (PARAM_LABELS[Number(key)] || ("Param " + key)));
            }
        }

        for (key in bonus.xparams) {
            if (bonus.xparams.hasOwnProperty(key) && bonus.xparams[key]) {
                lines.push(percent(bonus.xparams[key]) + " " + (XPARAM_LABELS[Number(key)] || ("XParam " + key)));
            }
        }

        for (key in bonus.sparams) {
            if (bonus.sparams.hasOwnProperty(key) && bonus.sparams[key] !== 1) {
                lines.push(ratePercent(bonus.sparams[key]) + " " + (SPARAM_LABELS[Number(key)] || ("SParam " + key)));
            }
        }

        return lines;
    }

    function colorForRarity(id) {
        return rarityData(id).color || DEFAULT_RARITIES.common.color;
    }

    Equipment.config = config;

    Equipment.refreshDatabase = function() {
        dataVersion += 1;
        databaseReady = true;
        cssReady = false;
        installCss();
        log("Base equipee: " + Object.keys(rawData().equipment || {}).length + " entree(s).");
    };

    Equipment.itemKey = equipmentKey;
    Equipment.isEquipment = isEquipment;
    Equipment.metadata = metadata;
    Equipment.rarityData = rarityData;
    Equipment.allRarityData = allRarityData;
    Equipment.setData = setData;
    Equipment.actorBonuses = function(actor) { return actorCache(actor).bonuses; };
    Equipment.actorSetCounts = function(actor) { return actorCache(actor).setCounts; };
    Equipment.actorActiveSets = function(actor) { return actorCache(actor).activeSets; };
    Equipment.bonusLines = bonusLines;

    Equipment.registerRarity = function(id, data) {
        if (!id || !data) return false;
        writableData().rarities[normalizeId(id)] = data;
        Equipment.refreshDatabase();
        return true;
    };

    Equipment.registerEquipment = function(key, data) {
        if (!key || !data) return false;
        writableData().equipment[String(key)] = data;
        Equipment.refreshDatabase();
        return true;
    };

    Equipment.registerSet = function(id, data) {
        if (!id || !data) return false;
        writableData().sets[normalizeId(id)] = data;
        Equipment.refreshDatabase();
        return true;
    };

    Equipment.rarityId = function(item) {
        var meta = metadata(item);
        return meta ? meta.rarity : "common";
    };

    Equipment.color = function(item) {
        return colorForRarity(Equipment.rarityId(item));
    };

    Equipment.itemClass = function(item) {
        if (!item || !isEquipment(item)) return "";
        return "l3-rarity-" + classSafe(Equipment.rarityId(item));
    };

    Equipment.describeItem = function(item) {
        var meta = metadata(item);
        if (!meta) return [];
        return bonusLines(meta.bonuses);
    };

    Equipment.appendItemDetail = function(panel, item, options) {
        if (!panel || !item || !isEquipment(item) || !window.L3UI) return;

        options = options || {};
        var meta = metadata(item);
        if (!meta) return;

        var rarity = rarityData(meta.rarity);
        var title = panel.querySelector ? panel.querySelector(".l3-title") : null;
        if (title) title.style.color = rarity.color || colorForRarity(meta.rarity);

        var badge = L3UI.el("div", {
            className: "l3-equipment-rarity " + Equipment.itemClass(item),
            text: rarity.name || meta.rarity
        });
        panel.appendChild(badge);

        var lines = bonusLines(meta.bonuses);
        if (lines.length) {
            var bonusBox = L3UI.el("div", { className: "l3-equipment-bonus-box" });
            bonusBox.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Bonus" }));
            for (var i = 0; i < lines.length; i++) {
                bonusBox.appendChild(L3UI.el("div", { className: "l3-equipment-bonus-line", text: lines[i] }));
            }
            panel.appendChild(bonusBox);
        }

        if (meta.set) {
            var set = setData(meta.set);
            if (set) {
                var setBox = L3UI.el("div", { className: "l3-equipment-set-box" });
                var actor = options.actor || null;
                var count = actor ? (Equipment.actorSetCounts(actor)[meta.set] || 0) : 0;
                setBox.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Set" }));
                setBox.appendChild(L3UI.el("strong", { className: "l3-equipment-set-title", text: set.name || meta.set }));
                if (set.description) setBox.appendChild(L3UI.el("p", { className: "l3-detail-desc", text: set.description }));
                var thresholds = setThresholds(set);
                for (var t = 0; t < thresholds.length; t++) {
                    var threshold = thresholds[t];
                    var block = normalizeBonus(set.bonuses[String(threshold)]);
                    var setLines = bonusLines(block);
                    var active = count >= threshold;
                    var row = L3UI.el("div", {
                        className: "l3-set-bonus " + (active ? "is-active" : ""),
                        text: threshold + " pieces : " + (setLines.length ? setLines.join(", ") : "Bonus")
                    });
                    setBox.appendChild(row);
                }
                if (actor) {
                    setBox.appendChild(L3UI.el("div", {
                        className: "l3-equipment-set-count",
                        text: count + " piece(s) equipee(s)"
                    }));
                }
                panel.appendChild(setBox);
            }
        }
    };

    function installCss() {
        if (cssReady || !window.L3UI || !L3UI.addCss || !config.rarityColors) return;
        cssReady = true;
        var rarities = allRarityData();
        var css = "";
        for (var id in rarities) {
            if (rarities.hasOwnProperty(id)) {
                var className = "l3-rarity-" + classSafe(id);
                var color = rarities[id].color || DEFAULT_RARITIES.common.color;
                css += ".l3-button." + className + " .l3-button-label,.l3-button." + className + " .l3-button-right{color:" + color + ";}";
                css += ".l3-equipment-rarity." + className + "{color:" + color + ";}";
            }
        }

        L3UI.addCss("l3-equipment-system-css",
            css +
            ".l3-button.l3-rarity-magic,.l3-button.l3-rarity-rare,.l3-button.l3-rarity-epic,.l3-button.l3-rarity-legendary,.l3-button.l3-rarity-unique{box-shadow:inset 3px 0 0 currentColor;}" +
            ".l3-equipment-rarity{display:inline-flex;align-items:center;width:max-content;margin:4px 0 10px;padding:5px 10px;border-radius:999px;border:1px solid currentColor;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:rgba(15,23,42,.72);}" +
            ".l3-equipment-bonus-box,.l3-equipment-set-box{margin-top:14px;padding:12px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(15,23,42,.46);}" +
            ".l3-equipment-bonus-line{font-size:14px;line-height:1.5;color:#e5e7eb;}" +
            ".l3-equipment-set-title{display:block;margin-bottom:6px;font-size:16px;color:#f8fafc;}" +
            ".l3-set-bonus{margin-top:8px;padding:8px 10px;border-left:3px solid rgba(148,163,184,.35);color:#94a3b8;background:rgba(15,23,42,.42);}" +
            ".l3-set-bonus.is-active{border-left-color:#35d38a;color:#d1fae5;background:rgba(16,185,129,.10);}" +
            ".l3-equipment-set-count{margin-top:10px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;}"
        );
    }

    function registerDataFile() {
        if (!window.DataManager || !DataManager._databaseFiles) return;
        window.$dataL3Equipment = window.$dataL3Equipment || null;
        for (var i = 0; i < DataManager._databaseFiles.length; i++) {
            if (DataManager._databaseFiles[i].name === "$dataL3Equipment") return;
        }
        DataManager._databaseFiles.push({ name: "$dataL3Equipment", src: config.dataFile });
    }

    registerDataFile();

    var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        var loaded = _DataManager_isDatabaseLoaded.call(this);
        if (loaded && !databaseReady) Equipment.refreshDatabase();
        return loaded;
    };

    var _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function(paramId) {
        var value = _Game_Actor_paramPlus.call(this, paramId);
        var bonus = Equipment.actorBonuses(this);
        return value + (bonus.params[paramId] || 0);
    };

    var _Game_BattlerBase_paramRate = Game_BattlerBase.prototype.paramRate;
    Game_BattlerBase.prototype.paramRate = function(paramId) {
        var value = _Game_BattlerBase_paramRate.call(this, paramId);
        if (this.isActor && this.isActor()) {
            var bonus = Equipment.actorBonuses(this);
            value *= bonus.rates[paramId] || 1;
        }
        return value;
    };

    var _Game_BattlerBase_xparam = Game_BattlerBase.prototype.xparam;
    Game_BattlerBase.prototype.xparam = function(xparamId) {
        var value = _Game_BattlerBase_xparam.call(this, xparamId);
        if (this.isActor && this.isActor()) {
            var bonus = Equipment.actorBonuses(this);
            value += bonus.xparams[xparamId] || 0;
        }
        return value;
    };

    var _Game_BattlerBase_sparam = Game_BattlerBase.prototype.sparam;
    Game_BattlerBase.prototype.sparam = function(sparamId) {
        var value = _Game_BattlerBase_sparam.call(this, sparamId);
        if (this.isActor && this.isActor()) {
            var bonus = Equipment.actorBonuses(this);
            value *= bonus.sparams[sparamId] || 1;
        }
        return value;
    };

    installCss();

    if (window.L3UI && L3UI.Services) {
        L3UI.Services.register("equipment", Equipment);
    }
})();
