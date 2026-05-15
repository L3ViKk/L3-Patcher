/*:
 * @plugindesc L3 Overlay Mapping v1.1 - Couches d'overlay et capture de map pour RPG Maker MV.
 * @author L3ViKk
 * @version 1.1.0
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
 * @param Capture Tools
 * @text Outils de capture
 * @type boolean
 * @default true
 *
 * @param Capture Hotkey
 * @text Touche capture
 * @type text
 * @default F10
 *
 * @param Capture Folder
 * @text Dossier captures
 * @type text
 * @default img/overlays/captures/
 *
 * @param Capture Hide Events
 * @text Masquer evenements
 * @type boolean
 * @default true
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
 *   L3Overlay capture
 *   L3Overlay capture base
 *   L3Overlay capture grid
 *   L3Overlay capture templates
 *
 * Capture de map :
 *
 *   F10 capture la map complete dans img/overlays/captures/.
 *   Deux fichiers sont generes : une base propre et une version avec grille.
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
        fadeSpeed: Math.max(1, readNumber("Fade Speed", 16)),
        captureTools: readBool("Capture Tools", true),
        captureHotkey: readText("Capture Hotkey", "F10"),
        captureFolder: normalizeFolder(readText("Capture Folder", "img/overlays/captures/")),
        captureHideEvents: readBool("Capture Hide Events", true)
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

    Overlay.version = "1.1.0";
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
        if (Overlay._captureBusy) {
            for (var captureKey in spriteset._l3OverlaySprites) {
                if (spriteset._l3OverlaySprites.hasOwnProperty(captureKey)) {
                    spriteset._l3OverlaySprites[captureKey].visible = false;
                }
            }
            return;
        }
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

    function notify(title, lines, type) {
        lines = Array.isArray(lines) ? lines : [String(lines || "")];
        if (window.L3UIScenes && L3UIScenes.notify) {
            L3UIScenes.notify({ title: title, lines: lines, type: type || "system" });
        } else if (window.console && console.log) {
            console.log("[L3Overlay] " + title + " - " + lines.join(" "));
        }
    }

    function captureKeyCode(key) {
        key = String(key || "F10").toUpperCase().replace(/\s+/g, "");
        var fMatch = key.match(/^F(\d{1,2})$/);
        if (fMatch) {
            var number = Number(fMatch[1]);
            if (number >= 1 && number <= 12) return 111 + number;
        }
        if (key.length === 1) return key.charCodeAt(0);
        var named = {
            PRINTSCREEN: 44,
            INSERT: 45,
            HOME: 36,
            END: 35,
            PAGEUP: 33,
            PAGEDOWN: 34
        };
        return named[key] || 121;
    }

    function fsTools() {
        if (!hasNode()) return null;
        return {
            fs: window.require("fs"),
            path: window.require("path"),
            buffer: window.Buffer || window.require("buffer").Buffer
        };
    }

    function ensureDirectory(fullDir) {
        var tools = fsTools();
        if (!tools) return false;
        if (tools.fs.existsSync(fullDir)) return true;
        var parent = tools.path.dirname(fullDir);
        if (parent && parent !== fullDir) ensureDirectory(parent);
        if (!tools.fs.existsSync(fullDir)) tools.fs.mkdirSync(fullDir);
        return true;
    }

    function absoluteFolder(folder) {
        var tools = fsTools();
        if (!tools) return "";
        return tools.path.join(gameRoot(), folder);
    }

    function absoluteFile(folder, filename) {
        var tools = fsTools();
        if (!tools) return "";
        return tools.path.join(absoluteFolder(folder), filename);
    }

    function fileAlreadyExists(folder, filename) {
        var tools = fsTools();
        return !!tools && tools.fs.existsSync(absoluteFile(folder, filename));
    }

    function writeCanvasPng(canvas, folder, filename, overwrite) {
        var tools = fsTools();
        if (!tools) throw new Error("Capture disponible uniquement dans le jeu desktop.");
        var fullDir = absoluteFolder(folder);
        ensureDirectory(fullDir);
        var fullPath = tools.path.join(fullDir, filename);
        if (!overwrite && tools.fs.existsSync(fullPath)) return "";
        var base64 = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
        var buffer = tools.buffer.from ? tools.buffer.from(base64, "base64") : new tools.buffer(base64, "base64");
        tools.fs.writeFileSync(fullPath, buffer);
        return normalizeFolder(folder) + filename;
    }

    function cloneCanvas(source) {
        var canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        canvas.getContext("2d").drawImage(source, 0, 0);
        return canvas;
    }

    function drawCaptureGrid(canvas) {
        var ctx = canvas.getContext("2d");
        var tw = $gameMap.tileWidth();
        var th = $gameMap.tileHeight();
        var cols = $gameMap.width();
        var rows = $gameMap.height();
        var mapLabel = "Map " + padMapId($gameMap.mapId()) + " - " + cols + " x " + rows + " tiles";

        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.42)";
        ctx.lineWidth = 1;
        for (var x = 0; x <= canvas.width; x += tw) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, canvas.height);
            ctx.stroke();
        }
        for (var y = 0; y <= canvas.height; y += th) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(canvas.width, y + 0.5);
            ctx.stroke();
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 2;
        for (var bx = 0; bx <= canvas.width; bx += tw * 10) {
            ctx.beginPath();
            ctx.moveTo(bx + 0.5, 0);
            ctx.lineTo(bx + 0.5, canvas.height);
            ctx.stroke();
        }
        for (var by = 0; by <= canvas.height; by += th * 10) {
            ctx.beginPath();
            ctx.moveTo(0, by + 0.5);
            ctx.lineTo(canvas.width, by + 0.5);
            ctx.stroke();
        }

        ctx.font = "20px GameFont, Arial";
        ctx.textBaseline = "top";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.strokeText(mapLabel, 12, 12);
        ctx.fillText(mapLabel, 12, 12);
        ctx.restore();
    }

    function captureFileName(suffix) {
        return "Map" + padMapId($gameMap.mapId()) + "_" + suffix + ".png";
    }

    function axisOrigins(total, view) {
        var origins = [];
        if (total <= view) return [0];
        var last = Math.max(0, total - view);
        var position = 0;
        while (position < total) {
            var origin = Math.min(position, last);
            if (origins.length === 0 || origins[origins.length - 1] !== origin) origins.push(origin);
            if (origin === last) break;
            position += view;
        }
        return origins;
    }

    function setDisplayRaw(displayX, displayY) {
        $gameMap._displayX = displayX;
        $gameMap._displayY = displayY;
        $gameMap._parallaxX = displayX;
        $gameMap._parallaxY = displayY;
    }

    function storeCaptureVisibility(scene) {
        var spriteset = scene && scene._spriteset;
        var states = [];
        function store(target) {
            if (!target) return;
            states.push({ target: target, visible: target.visible, hiding: target._hiding });
            if (target.hide) target.hide();
            else target.visible = false;
        }

        if (!spriteset) return states;
        var characterSprites = spriteset._characterSprites || [];
        for (var i = 0; i < characterSprites.length; i++) store(characterSprites[i]);
        store(spriteset._destinationSprite);
        store(spriteset._weather);
        store(spriteset._shadowSprite);

        var overlaySprites = spriteset._l3OverlaySprites || {};
        for (var key in overlaySprites) {
            if (overlaySprites.hasOwnProperty(key)) store(overlaySprites[key]);
        }
        return states;
    }

    function restoreCaptureVisibility(states) {
        for (var i = 0; i < states.length; i++) {
            if (states[i].target.show && states[i].hiding !== undefined) {
                states[i].target._hiding = states[i].hiding;
                states[i].target.updateVisibility();
            }
            states[i].target.visible = states[i].visible;
        }
    }

    function saveBlankTemplates(width, height) {
        var blank = document.createElement("canvas");
        blank.width = width;
        blank.height = height;
        var order = ["ground", "par", "shadow", "light", "fog"];
        var files = [];
        var skipped = [];
        for (var i = 0; i < order.length; i++) {
            var filename = patternName($gameMap.mapId(), order[i]) + ".png";
            if (fileAlreadyExists(config.folder, filename)) {
                skipped.push(filename);
                continue;
            }
            files.push(writeCanvasPng(blank, config.folder, filename, false));
        }
        if (skipped.length > 0) files.push("Deja presents : " + skipped.join(", "));
        return files;
    }

    function saveCaptureResult(mode, canvas) {
        var files = [];
        if (mode === "templates") {
            files = saveBlankTemplates(canvas.width, canvas.height);
        } else if (mode === "base") {
            files.push(writeCanvasPng(canvas, config.captureFolder, captureFileName("base"), true));
        } else if (mode === "grid") {
            var gridOnly = cloneCanvas(canvas);
            drawCaptureGrid(gridOnly);
            files.push(writeCanvasPng(gridOnly, config.captureFolder, captureFileName("grid"), true));
        } else {
            files.push(writeCanvasPng(canvas, config.captureFolder, captureFileName("base"), true));
            var grid = cloneCanvas(canvas);
            drawCaptureGrid(grid);
            files.push(writeCanvasPng(grid, config.captureFolder, captureFileName("grid"), true));
        }
        notify("Capture overlay terminee", files.length ? files : ["Aucun fichier cree."], "success");
    }

    Overlay.capture = function(mode) {
        mode = String(mode || "pack").toLowerCase();
        if (mode !== "base" && mode !== "grid" && mode !== "templates") mode = "pack";
        if (!config.captureTools) return;
        if (!hasNode()) {
            notify("Capture impossible", ["La capture de fichier demande la version desktop de RPG Maker MV."], "error");
            return;
        }
        if (Overlay._captureBusy) {
            notify("Capture deja en cours", ["Attends la fin de la capture actuelle."], "warning");
            return;
        }

        var scene = SceneManager._scene;
        if (!(scene instanceof Scene_Map) || !scene._spriteset || !window.$gameMap) {
            notify("Capture impossible", ["Lance la capture depuis une map."], "error");
            return;
        }

        var tileW = $gameMap.tileWidth();
        var tileH = $gameMap.tileHeight();
        var mapW = Math.max(tileW, $gameMap.width() * tileW);
        var mapH = Math.max(tileH, $gameMap.height() * tileH);
        var viewW = Graphics.width;
        var viewH = Graphics.height;
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var originalDisplay = {
            x: $gameMap._displayX,
            y: $gameMap._displayY,
            px: $gameMap._parallaxX,
            py: $gameMap._parallaxY
        };
        var visibility = config.captureHideEvents ? storeCaptureVisibility(scene) : [];
        var xs = axisOrigins(mapW, viewW);
        var ys = axisOrigins(mapH, viewH);
        var xi = 0;
        var yi = 0;

        canvas.width = mapW;
        canvas.height = mapH;
        Overlay._captureBusy = true;
        notify("Capture overlay", ["Capture de la map complete en cours..."], "system");

        function finish(error) {
            setDisplayRaw(originalDisplay.x, originalDisplay.y);
            $gameMap._parallaxX = originalDisplay.px;
            $gameMap._parallaxY = originalDisplay.py;
            restoreCaptureVisibility(visibility);
            if (scene._spriteset) scene._spriteset.update();
            Overlay._captureBusy = false;

            if (error) {
                notify("Capture interrompue", [error.message || String(error)], "error");
                return;
            }

            try {
                saveCaptureResult(mode, canvas);
            } catch (saveError) {
                notify("Capture interrompue", [saveError.message || String(saveError)], "error");
            }
        }

        function step() {
            try {
                if (yi >= ys.length) {
                    finish();
                    return;
                }

                var originX = xs[xi];
                var originY = ys[yi];
                setDisplayRaw(originX / tileW, originY / tileH);
                scene._spriteset.update();

                var snap = Bitmap.snap(scene._spriteset).canvas;
                var drawW = Math.min(viewW, mapW - originX);
                var drawH = Math.min(viewH, mapH - originY);
                ctx.drawImage(snap, 0, 0, drawW, drawH, originX, originY, drawW, drawH);

                xi++;
                if (xi >= xs.length) {
                    xi = 0;
                    yi++;
                }
                setTimeout(step, 0);
            } catch (error) {
                finish(error);
            }
        }

        setTimeout(step, 0);
    };

    var captureInputCode = captureKeyCode(config.captureHotkey);
    if (config.captureTools && window.Input && Input.keyMapper) {
        Input.keyMapper[captureInputCode] = "l3OverlayCapture";
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

    var _Input_shouldPreventDefault = Input._shouldPreventDefault;
    Input._shouldPreventDefault = function(keyCode) {
        if (config.captureTools && keyCode === captureInputCode) return true;
        return _Input_shouldPreventDefault.call(this, keyCode);
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (config.captureTools && Input.isTriggered("l3OverlayCapture")) Overlay.capture("pack");
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
        else if (action === "capture") Overlay.capture(args[1]);
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
