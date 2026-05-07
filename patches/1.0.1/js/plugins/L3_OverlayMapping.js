/*:
 * @plugindesc L3 Overlay Mapping v1.0 - Couches d'overlay type Orange Overlay pour RPG Maker MV.
 * @author L3ViKk
 * @version 1.0.0
 *
 * @param Enabled
 * @text Activer les overlays
 * @type boolean
 * @default true
 *
 * @param Overlay Folder
 * @text Dossier overlays
 * @type text
 * @default img/overlays/
 *
 * @param File Pattern
 * @text Format des fichiers
 * @type text
 * @default Map%1_%2
 *
 * @param Map Id Padding
 * @text Zeros map ID
 * @type number
 * @default 3
 *
 * @param Orange Overlay Names
 * @text Noms Orange Overlay
 * @type boolean
 * @default true
 *
 * @param Ground Enabled
 * @text Couche sol
 * @type boolean
 * @default true
 *
 * @param Par Enabled
 * @text Couche haute
 * @type boolean
 * @default true
 *
 * @param Shadow Enabled
 * @text Couche ombres
 * @type boolean
 * @default true
 *
 * @param Light Enabled
 * @text Couche lumiere
 * @type boolean
 * @default true
 *
 * @param Fog Enabled
 * @text Couche brouillard
 * @type boolean
 * @default true
 *
 * @param Ground Opacity
 * @text Opacite sol
 * @type number
 * @min 0
 * @max 255
 * @default 255
 *
 * @param Par Opacity
 * @text Opacite haute
 * @type number
 * @min 0
 * @max 255
 * @default 255
 *
 * @param Shadow Opacity
 * @text Opacite ombres
 * @type number
 * @min 0
 * @max 255
 * @default 190
 *
 * @param Light Opacity
 * @text Opacite lumiere
 * @type number
 * @min 0
 * @max 255
 * @default 220
 *
 * @param Fog Opacity
 * @text Opacite brouillard
 * @type number
 * @min 0
 * @max 255
 * @default 140
 *
 * @param Fade Speed
 * @text Vitesse fondu
 * @type number
 * @min 1
 * @default 16
 *
 * @param Debug
 * @text Debug
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * L3 Overlay Mapping
 * ============================================================================
 *
 * Place les images dans :
 *
 *   img/overlays/
 *
 * Noms conseilles pour la map 1 :
 *
 *   Map001_ground.png   couche sous les personnages
 *   Map001_par.png      couche au-dessus des personnages
 *   Map001_shadow.png   ombres
 *   Map001_light.png    lumieres en mode additif
 *   Map001_fog.png      brouillard fixe a l'ecran
 *
 * Le plugin reconnait aussi les noms proches d'Orange Overlay :
 *
 *   ground1.png, par1.png, shadow1.png, light1.png, fog1.png
 *
 * Notes de map possibles :
 *
 *   <L3Overlay ground: MonSol>
 *   <L3Overlay par: MaCoucheHaute>
 *   <L3Overlay light: MaLumiere>
 *   <L3Overlay fog: none>
 *
 * Commandes de plugin :
 *
 *   L3Overlay refresh
 *   L3Overlay show ground
 *   L3Overlay hide light
 *   L3Overlay toggle fog
 *   L3Overlay opacity shadow 160
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_OverlayMapping";
    var params = PluginManager.parameters(PLUGIN_NAME) || {};

    function readBool(name, fallback) {
        var value = params[name];
        if (value === undefined || value === null || value === "") return fallback;
        return value === true || value === "true" || value === "1" || value === "on";
    }

    function readNumber(name, fallback) {
        var value = Number(params[name]);
        return isNaN(value) ? fallback : value;
    }

    function readText(name, fallback) {
        var value = params[name];
        return value === undefined || value === null || value === "" ? fallback : String(value);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number(value || 0)));
    }

    var config = {
        enabled: readBool("Enabled", true),
        folder: normalizeFolder(readText("Overlay Folder", "img/overlays/")),
        pattern: readText("File Pattern", "Map%1_%2"),
        padding: Math.max(1, readNumber("Map Id Padding", 3)),
        orangeNames: readBool("Orange Overlay Names", true),
        debug: readBool("Debug", false),
        fadeSpeed: Math.max(1, readNumber("Fade Speed", 16))
    };

    var layers = {
        ground: { key: "ground", enabled: readBool("Ground Enabled", true), opacity: readNumber("Ground Opacity", 255), z: 2, blendMode: 0, mapLocked: true },
        par: { key: "par", enabled: readBool("Par Enabled", true), opacity: readNumber("Par Opacity", 255), z: 5.6, blendMode: 0, mapLocked: true },
        shadow: { key: "shadow", enabled: readBool("Shadow Enabled", true), opacity: readNumber("Shadow Opacity", 190), z: 6.4, blendMode: 2, mapLocked: true },
        light: { key: "light", enabled: readBool("Light Enabled", true), opacity: readNumber("Light Opacity", 220), z: 8.4, blendMode: 1, mapLocked: true },
        fog: { key: "fog", enabled: readBool("Fog Enabled", true), opacity: readNumber("Fog Opacity", 140), z: 10, blendMode: 0, mapLocked: false }
    };

    var Overlay = window.L3Overlay || {};
    window.L3Overlay = Overlay;

    Overlay.version = "1.0.0";
    Overlay.config = config;
    Overlay.layers = layers;
    Overlay.hidden = Overlay.hidden || {};
    Overlay.customOpacity = Overlay.customOpacity || {};

    if (!config.enabled) return;

    function log() {
        if (config.debug && window.console && console.log) console.log.apply(console, arguments);
    }

    function normalizeFolder(folder) {
        folder = String(folder || "img/overlays/").replace(/\\/g, "/");
        if (folder.charAt(folder.length - 1) !== "/") folder += "/";
        return folder;
    }

    function padMapId(mapId) {
        var value = String(Number(mapId || 0));
        while (value.length < config.padding) value = "0" + value;
        return value;
    }

    function hasNode() {
        return !!window.require;
    }

    function gameRoot() {
        if (!hasNode()) return "";
        var fs = window.require("fs");
        var path = window.require("path");
        var cwd = window.process && process.cwd ? process.cwd() : ".";
        if (fs.existsSync(path.join(cwd, "index.html")) && fs.existsSync(path.join(cwd, "js"))) return cwd;
        if (fs.existsSync(path.join(cwd, "www", "index.html")) && fs.existsSync(path.join(cwd, "www", "js"))) return path.join(cwd, "www");
        return cwd;
    }

    function imageExists(filename) {
        if (!filename || filename.toLowerCase() === "none") return false;
        if (!hasNode()) return true;

        var fs = window.require("fs");
        var path = window.require("path");
        var fullPath = path.join(gameRoot(), config.folder, filename + ".png");
        return fs.existsSync(fullPath);
    }

    function mapNoteLayer(key) {
        var note = window.$dataMap && $dataMap.note ? String($dataMap.note) : "";
        var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        var regexes = [
            new RegExp("<L3Overlay\\s+" + escaped + "\\s*:\\s*([^>]+)>", "i"),
            new RegExp("<Overlay\\s+" + escaped + "\\s*:\\s*([^>]+)>", "i")
        ];

        for (var i = 0; i < regexes.length; i++) {
            var match = note.match(regexes[i]);
            if (match) return String(match[1] || "").trim().replace(/\.png$/i, "");
        }
        return "";
    }

    function patternName(mapId, key) {
        return config.pattern
            .replace(/%1/g, padMapId(mapId))
            .replace(/%id/g, String(mapId))
            .replace(/%2/g, key)
            .replace(/%layer/g, key)
            .replace(/\.png$/i, "");
    }

    function fileCandidates(mapId, key) {
        var padded = padMapId(mapId);
        var candidates = [];
        var noteName = mapNoteLayer(key);
        if (noteName && noteName.toLowerCase() === "none") return ["none"];
        if (noteName) candidates.push(noteName);

        candidates.push(patternName(mapId, key));
        candidates.push("Map" + padded + "_" + key);
        candidates.push("Map" + mapId + "_" + key);

        if (config.orangeNames) {
            candidates.push(key + mapId);
            candidates.push(key + padded);
            candidates.push(key + "_" + mapId);
            candidates.push(key + "_" + padded);
        }

        return candidates;
    }

    function layerFileName(mapId, key) {
        var candidates = fileCandidates(mapId, key);
        for (var i = 0; i < candidates.length; i++) {
            var name = String(candidates[i] || "").replace(/\.png$/i, "");
            if (imageExists(name)) return name;
        }
        return "";
    }

    function targetOpacity(key) {
        var layer = layers[key];
        if (!layer || !layer.enabled || Overlay.hidden[key]) return 0;
        if (Overlay.customOpacity[key] !== undefined) return clamp(Overlay.customOpacity[key], 0, 255);
        return clamp(layer.opacity, 0, 255);
    }

    function createLayerSprite(mapId, key) {
        var layer = layers[key];
        if (!layer || !layer.enabled) return null;

        var filename = layerFileName(mapId, key);
        if (!filename) {
            log("[L3Overlay] aucun fichier pour", key, "map", mapId);
            return null;
        }

        var sprite = new Sprite(ImageManager.loadBitmap(config.folder, filename, 0, true));
        sprite._l3OverlayKey = key;
        sprite._l3OverlayFile = filename;
        sprite._l3OverlayMapLocked = layer.mapLocked;
        sprite.z = layer.z;
        sprite.blendMode = layer.blendMode;
        sprite.opacity = 0;
        sprite.visible = true;
        return sprite;
    }

    function addLayer(spriteset, sprite) {
        if (!sprite) return;
        var key = sprite._l3OverlayKey;
        if (key === "fog") {
            spriteset.addChild(sprite);
        } else if (spriteset._tilemap) {
            spriteset._tilemap.addChild(sprite);
        }
    }

    function createOverlays(spriteset) {
        if (!spriteset || !window.$gameMap) return;
        spriteset._l3OverlaySprites = {};
        spriteset._l3OverlayMapId = $gameMap.mapId();

        var order = ["ground", "par", "shadow", "light", "fog"];
        for (var i = 0; i < order.length; i++) {
            var key = order[i];
            var sprite = createLayerSprite($gameMap.mapId(), key);
            if (!sprite) continue;
            spriteset._l3OverlaySprites[key] = sprite;
            addLayer(spriteset, sprite);
        }
    }

    function updateLayerPosition(sprite) {
        if (!sprite || !window.$gameMap) return;
        if (sprite._l3OverlayMapLocked) {
            sprite.x = -$gameMap.displayX() * $gameMap.tileWidth();
            sprite.y = -$gameMap.displayY() * $gameMap.tileHeight();
        } else {
            sprite.x = 0;
            sprite.y = 0;
        }
    }

    function updateOverlays(spriteset) {
        if (!spriteset || !spriteset._l3OverlaySprites) return;
        if (window.$gameMap && spriteset._l3OverlayMapId !== $gameMap.mapId()) {
            refreshSpriteset(spriteset);
            return;
        }

        for (var key in spriteset._l3OverlaySprites) {
            if (!spriteset._l3OverlaySprites.hasOwnProperty(key)) continue;
            var sprite = spriteset._l3OverlaySprites[key];
            var wanted = targetOpacity(key);
            updateLayerPosition(sprite);
            if (sprite.opacity < wanted) sprite.opacity = Math.min(wanted, sprite.opacity + config.fadeSpeed);
            else if (sprite.opacity > wanted) sprite.opacity = Math.max(wanted, sprite.opacity - config.fadeSpeed);
            sprite.visible = sprite.opacity > 0;
        }
    }

    function removeOverlays(spriteset) {
        if (!spriteset || !spriteset._l3OverlaySprites) return;
        for (var key in spriteset._l3OverlaySprites) {
            if (!spriteset._l3OverlaySprites.hasOwnProperty(key)) continue;
            var sprite = spriteset._l3OverlaySprites[key];
            if (sprite.parent) sprite.parent.removeChild(sprite);
        }
        spriteset._l3OverlaySprites = {};
    }

    function refreshSpriteset(spriteset) {
        removeOverlays(spriteset);
        createOverlays(spriteset);
    }

    Overlay.refresh = function() {
        var scene = SceneManager._scene;
        if (scene && scene._spriteset) refreshSpriteset(scene._spriteset);
    };

    Overlay.show = function(key) {
        key = normalizeKey(key);
        if (!key) return;
        Overlay.hidden[key] = false;
    };

    Overlay.hide = function(key) {
        key = normalizeKey(key);
        if (!key) return;
        Overlay.hidden[key] = true;
    };

    Overlay.toggle = function(key) {
        key = normalizeKey(key);
        if (!key) return;
        Overlay.hidden[key] = !Overlay.hidden[key];
    };

    Overlay.opacity = function(key, value) {
        key = normalizeKey(key);
        if (!key) return;
        Overlay.customOpacity[key] = clamp(value, 0, 255);
    };

    function normalizeKey(key) {
        key = String(key || "").toLowerCase();
        if (key === "above") key = "par";
        return layers[key] ? key : "";
    }

    var _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        createOverlays(this);
    };

    var _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        updateOverlays(this);
    };

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (String(command).toLowerCase() !== "l3overlay") return;
        args = args || [];
        var action = String(args[0] || "").toLowerCase();
        if (action === "refresh") Overlay.refresh();
        else if (action === "show") Overlay.show(args[1]);
        else if (action === "hide") Overlay.hide(args[1]);
        else if (action === "toggle") Overlay.toggle(args[1]);
        else if (action === "opacity") Overlay.opacity(args[1], args[2]);
    };

    if (window.L3UI && L3UI.Services) L3UI.Services.register("overlay", Overlay);
    if (window.L3UI && L3UI.Plugins) {
        L3UI.Plugins.register(PLUGIN_NAME, {
            version: Overlay.version,
            title: "L3 Overlay Mapping",
            depends: [],
            provides: ["overlay", "map.layers"]
        });
    }
})();
