/*:
 * @plugindesc L3 Update Manager v1.0.2 - Systeme de patchs pour mettre le jeu a jour sans refaire un build complet.
 * @author L3ViKk
 * @version 1.0.2
 *
 * @param Enabled
 * @text Activer l'updater
 * @type boolean
 * @default true
 *
 * @param Current Version
 * @text Version actuelle
 * @type text
 * @default 1.0.0
 *
 * @param Manifest URL
 * @text URL du manifest
 * @type text
 * @default
 *
 * @param Auto Check
 * @text Verifier au demarrage
 * @type boolean
 * @default false
 *
 * @param Auto Apply
 * @text Installer automatiquement
 * @type boolean
 * @default false
 *
 * @param Backup Folder
 * @text Dossier backup
 * @type text
 * @default patch-backups
 *
 * @param Allow Plugin Updates
 * @text Autoriser plugins
 * @type boolean
 * @default true
 *
 * @param Allow Data Updates
 * @text Autoriser data
 * @type boolean
 * @default true
 *
 * @param Allow Asset Updates
 * @text Autoriser images/audio
 * @type boolean
 * @default true
 *
 * @param Allow Server Updates
 * @text Autoriser serveur reseau
 * @type boolean
 * @default true
 *
 * @param Allow Package Updates
 * @text Autoriser package.json
 * @type boolean
 * @default true
 *
 * @param Restart After Update
 * @text Redemarrer apres patch
 * @type boolean
 * @default false
 *
 * @param Enable Menu Command
 * @text Commande dans le menu
 * @type boolean
 * @default false
 *
 * @param Menu Label
 * @text Libelle menu
 * @type text
 * @default Mise a jour
 *
 * @param Menu Order
 * @text Ordre menu
 * @type number
 * @default 95
 *
 * @param Debug
 * @text Debug
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * L3 Update Manager
 * ============================================================================
 *
 * Le plugin telecharge un manifest JSON, compare la version, sauvegarde les
 * fichiers remplaces, puis applique uniquement les fichiers modifies.
 * Les chemins autorises restent limites aux dossiers du jeu, aux plugins, aux
 * donnees, aux assets, au serveur L3Net et au package du projet.
 *
 * Exemple de manifest :
 *
 * {
 *   "version": "1.0.1",
 *   "baseUrl": "https://monsite.fr/patches/1.0.1/",
 *   "notes": ["Correction des menus", "Nouvel overlay"],
 *   "files": [
 *     { "path": "js/plugins/L3_UIMenus.js" },
 *     { "path": "data/L3Quests.json", "sha256": "optionnel" },
 *     { "path": "img/pictures/background.png" }
 *   ],
 *   "delete": []
 * }
 *
 * Commandes de plugin :
 *
 *   L3Update check
 *   L3Update apply
 *   L3Update open
 *   L3Update status
 *   L3Update manifest https://monsite.fr/version.json
 *
 * Le patch fonctionne dans le jeu Windows/NW.js. Dans un navigateur pur, le
 * plugin peut verifier un manifest mais ne peut pas ecrire les fichiers.
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_UpdateManager";
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
        return value === undefined || value === null ? fallback : String(value);
    }

    var VERSION_STORAGE_KEY = "l3-update-current-version";

    function storageGet(key, fallback) {
        try {
            if (window.localStorage) {
                var value = localStorage.getItem(key);
                if (value !== null && value !== undefined && value !== "") return value;
            }
        } catch (error) {
        }
        return fallback;
    }

    function storageSet(key, value) {
        try {
            if (window.localStorage) localStorage.setItem(key, String(value || ""));
        } catch (error) {
        }
    }

    var config = {
        enabled: readBool("Enabled", true),
        currentVersion: readText("Current Version", "1.0.0"),
        manifestUrl: readText("Manifest URL", ""),
        autoCheck: readBool("Auto Check", false),
        autoApply: readBool("Auto Apply", false),
        backupFolder: readText("Backup Folder", "patch-backups"),
        allowPluginUpdates: readBool("Allow Plugin Updates", true),
        allowDataUpdates: readBool("Allow Data Updates", true),
        allowAssetUpdates: readBool("Allow Asset Updates", true),
        allowServerUpdates: readBool("Allow Server Updates", true),
        allowPackageUpdates: readBool("Allow Package Updates", true),
        restartAfterUpdate: readBool("Restart After Update", false),
        menuCommand: readBool("Enable Menu Command", false),
        menuLabel: readText("Menu Label", "Mise a jour"),
        menuOrder: readNumber("Menu Order", 95),
        debug: readBool("Debug", false)
    };

    var Update = window.L3Update || {};
    window.L3Update = Update;

    Update.version = "1.0.2";
    Update.config = config;
    Update.state = Update.state || {};
    Update.state.status = "idle";
    Update.state.currentVersion = storageGet(VERSION_STORAGE_KEY, config.currentVersion);
    Update.state.remoteVersion = "";
    Update.state.available = false;
    Update.state.manifest = null;
    Update.state.lastError = "";
    Update.state.progress = "";
    Update.state.checkedAt = 0;
    Update.state.appliedAt = 0;

    if (!config.enabled) return;

    function log() {
        if (config.debug && window.console && console.log) console.log.apply(console, arguments);
    }

    function warn() {
        if (window.console && console.warn) console.warn.apply(console, arguments);
    }

    function notify(title, lines, type) {
        lines = lines || [];
        if (typeof lines === "string") lines = [lines];
        if (window.L3UIScenes && L3UIScenes.notify) {
            L3UIScenes.notify({ title: title, lines: lines, type: type || "system" });
        } else if (window.L3UI && L3UI.Components && L3UI.Components.Toast) {
            L3UI.Components.Toast((title ? title + " : " : "") + lines.join(" "));
        } else {
            log("[L3Update]", title, lines.join(" "));
        }
    }

    function setStatus(status, extra) {
        Update.state.status = status;
        if (extra) {
            for (var key in extra) {
                if (extra.hasOwnProperty(key)) Update.state[key] = extra[key];
            }
        }
        if (window.L3UI && L3UI.Events) L3UI.Events.emit("update:status", Update.state);
    }

    function hasNode() {
        return !!window.require;
    }

    function fsModule() {
        return hasNode() ? window.require("fs") : null;
    }

    function pathModule() {
        return hasNode() ? window.require("path") : null;
    }

    function bufferModule() {
        return hasNode() ? window.require("buffer").Buffer : null;
    }

    function gameRoot() {
        if (!hasNode()) return "";
        var fs = fsModule();
        var path = pathModule();
        var cwd = window.process && process.cwd ? process.cwd() : ".";
        if (fs.existsSync(path.join(cwd, "index.html")) && fs.existsSync(path.join(cwd, "js"))) return cwd;
        if (fs.existsSync(path.join(cwd, "www", "index.html")) && fs.existsSync(path.join(cwd, "www", "js"))) return path.join(cwd, "www");
        return cwd;
    }

    function cleanPath(filePath) {
        var value = String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
        if (!value || value.indexOf("..") !== -1 || value.charAt(0) === "/" || /^[A-Za-z]:/.test(value)) return "";
        return value;
    }

    function isAllowedPath(filePath) {
        filePath = cleanPath(filePath);
        if (!filePath) return false;
        if (/^js\/plugins\//i.test(filePath) || /^js\/plugins\.js$/i.test(filePath)) return config.allowPluginUpdates;
        if (/^data\//i.test(filePath)) return config.allowDataUpdates;
        if (/^(img|audio|movies|fonts|css)\//i.test(filePath)) return config.allowAssetUpdates;
        if (/^L3NetServer\//i.test(filePath)) return config.allowServerUpdates;
        if (/^package\.json$/i.test(filePath) || /^package-lock\.json$/i.test(filePath)) return config.allowPackageUpdates;
        return false;
    }

    function resolveGamePath(filePath) {
        return pathModule().join(gameRoot(), cleanPath(filePath));
    }

    function ensureDir(dir) {
        var fs = fsModule();
        var path = pathModule();
        if (!dir || fs.existsSync(dir)) return;

        var resolved = path.resolve(dir);
        var root = path.parse(resolved).root;
        var parts = resolved.slice(root.length).split(path.sep);
        var current = root;

        for (var i = 0; i < parts.length; i++) {
            if (!parts[i]) continue;
            current = path.join(current, parts[i]);
            if (!fs.existsSync(current)) fs.mkdirSync(current);
        }
    }

    function joinUrl(base, filePath) {
        if (/^https?:\/\//i.test(filePath)) return filePath;
        base = String(base || "").trim();
        if (!base) return filePath;
        return base.replace(/\/+$/, "") + "/" + String(filePath || "").replace(/^\/+/, "");
    }

    function versionParts(version) {
        return String(version || "0").split(/[^0-9]+/).filter(Boolean).map(function(part) {
            return Number(part || 0);
        });
    }

    function compareVersion(a, b) {
        var aa = versionParts(a);
        var bb = versionParts(b);
        var max = Math.max(aa.length, bb.length);
        for (var i = 0; i < max; i++) {
            var x = aa[i] || 0;
            var y = bb[i] || 0;
            if (x > y) return 1;
            if (x < y) return -1;
        }
        return 0;
    }

    function effectiveCurrentVersion() {
        var stored = storageGet(VERSION_STORAGE_KEY, "");
        var current = config.currentVersion || "0";
        if (stored && compareVersion(stored, current) > 0) current = stored;
        Update.state.currentVersion = current;
        return current;
    }

    function rememberCurrentVersion(version) {
        version = String(version || config.currentVersion || "0");
        config.currentVersion = version;
        Update.state.currentVersion = version;
        storageSet(VERSION_STORAGE_KEY, version);
    }

    function download(url, binary, done) {
        url = String(url || "").trim();
        if (!url) {
            done(new Error("URL vide."));
            return;
        }

        if (hasNode() && /^https?:\/\//i.test(url)) {
            nodeDownload(url, binary, done, 0);
            return;
        }

        xhrDownload(url, binary, done);
    }

    function nodeDownload(url, binary, done, redirects) {
        var lib = window.require(/^https:\/\//i.test(url) ? "https" : "http");
        var request = lib.get(url, function(response) {
            var status = Number(response.statusCode || 0);
            var location = response.headers.location;
            if (status >= 300 && status < 400 && location && redirects < 5) {
                response.resume();
                var nextUrl = /^https?:\/\//i.test(location) ? location : new URL(location, url).toString();
                nodeDownload(nextUrl, binary, done, redirects + 1);
                return;
            }
            if (status >= 400) {
                response.resume();
                done(new Error("HTTP " + status + " - " + url));
                return;
            }

            var chunks = [];
            response.on("data", function(chunk) { chunks.push(chunk); });
            response.on("end", function() {
                var BufferCtor = bufferModule();
                var buffer = BufferCtor.concat(chunks);
                done(null, binary ? buffer : buffer.toString("utf8"));
            });
        });
        request.on("error", done);
    }

    function xhrDownload(url, binary, done) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            if (binary) xhr.responseType = "arraybuffer";
            xhr.onload = function() {
                if (xhr.status >= 400) {
                    done(new Error("HTTP " + xhr.status + " - " + url));
                    return;
                }
                done(null, binary ? xhr.response : xhr.responseText);
            };
            xhr.onerror = function() {
                done(new Error("Telechargement impossible : " + url));
            };
            xhr.send();
        } catch (error) {
            done(error);
        }
    }

    function bufferFrom(data) {
        var BufferCtor = bufferModule();
        if (BufferCtor && BufferCtor.isBuffer(data)) return data;
        if (BufferCtor && data instanceof ArrayBuffer) return BufferCtor.from(new Uint8Array(data));
        return data;
    }

    function hashBuffer(buffer) {
        if (!hasNode()) return "";
        var crypto = window.require("crypto");
        return crypto.createHash("sha256").update(buffer).digest("hex");
    }

    function backupFile(relativePath, stamp) {
        var fs = fsModule();
        var path = pathModule();
        var target = resolveGamePath(relativePath);
        if (!fs.existsSync(target)) return;

        var backup = path.join(gameRoot(), config.backupFolder, stamp, cleanPath(relativePath));
        ensureDir(path.dirname(backup));
        fs.copyFileSync(target, backup);
    }

    function writeFile(relativePath, data) {
        var fs = fsModule();
        var path = pathModule();
        var target = resolveGamePath(relativePath);
        ensureDir(path.dirname(target));
        fs.writeFileSync(target, bufferFrom(data));
    }

    function removeFile(relativePath, stamp) {
        var fs = fsModule();
        var target = resolveGamePath(relativePath);
        if (!fs.existsSync(target)) return;
        backupFile(relativePath, stamp);
        fs.unlinkSync(target);
    }

    function normalizeManifest(manifest) {
        manifest = manifest || {};
        manifest.version = String(manifest.version || "");
        manifest.baseUrl = String(manifest.baseUrl || "");
        manifest.notes = manifest.notes || [];
        manifest.files = manifest.files || [];
        manifest.delete = manifest.delete || [];
        return manifest;
    }

    Update.check = function(done) {
        done = done || function() {};
        if (!config.manifestUrl) {
            setStatus("error", { lastError: "Aucune URL de manifest configuree." });
            notify("Mise a jour", ["Renseigne Manifest URL dans le plugin."], "error");
            done(false);
            return;
        }

        setStatus("checking", { lastError: "", progress: "Lecture du manifest" });
        download(config.manifestUrl, false, function(error, text) {
            if (error) {
                setStatus("error", { lastError: error.message || String(error) });
                notify("Mise a jour impossible", [Update.state.lastError], "error");
                done(false);
                return;
            }

            var manifest;
            try {
                manifest = normalizeManifest(JSON.parse(String(text || "")));
            } catch (parseError) {
                setStatus("error", { lastError: "Manifest JSON invalide." });
                notify("Mise a jour impossible", [Update.state.lastError], "error");
                done(false);
                return;
            }

            var currentVersion = effectiveCurrentVersion();
            var available = manifest.force === true || compareVersion(manifest.version, currentVersion) > 0;
            setStatus(available ? "available" : "ready", {
                manifest: manifest,
                remoteVersion: manifest.version,
                available: available,
                currentVersion: currentVersion,
                checkedAt: Date.now(),
                progress: ""
            });

            if (available) {
                notify("Mise a jour disponible", [
                    currentVersion + " -> " + manifest.version,
                    String(manifest.files.length || 0) + " fichier(s)"
                ], "system");
                if (config.autoApply) Update.apply(done);
                else done(true);
            } else {
                notify("Mise a jour", ["Le jeu est deja a jour."], "system");
                done(true);
            }
        });
    };

    Update.apply = function(done) {
        done = done || function() {};
        if (!hasNode()) {
            setStatus("error", { lastError: "Ecriture impossible hors NW.js." });
            notify("Patch impossible", ["L'installation de fichiers demande la version Windows du jeu."], "error");
            done(false);
            return;
        }

        if (!Update.state.manifest) {
            Update.check(function(ok) {
                if (ok && Update.state.available) Update.apply(done);
                else done(ok);
            });
            return;
        }

        var manifest = Update.state.manifest;
        var files = manifest.files || [];
        var deleted = manifest.delete || [];
        var stamp = new Date().toISOString().replace(/[:.]/g, "-");
        var index = 0;

        setStatus("applying", { progress: "Preparation du patch", lastError: "" });

        function nextFile() {
            if (index >= files.length) {
                applyDeletes();
                return;
            }

            var item = files[index++];
            var relativePath = cleanPath(item.path || item.file || "");
            if (!isAllowedPath(relativePath)) {
                fail("Chemin non autorise : " + (item.path || ""));
                return;
            }

            var url = item.url ? joinUrl(manifest.baseUrl, item.url) : joinUrl(manifest.baseUrl, relativePath);
            setStatus("applying", { progress: relativePath + " (" + index + "/" + files.length + ")" });

            download(url, true, function(error, data) {
                if (error) {
                    fail(error.message || String(error));
                    return;
                }

                try {
                    var buffer = bufferFrom(data);
                    if (item.sha256 && hashBuffer(buffer).toLowerCase() !== String(item.sha256).toLowerCase()) {
                        fail("Hash invalide : " + relativePath);
                        return;
                    }
                    backupFile(relativePath, stamp);
                    writeFile(relativePath, buffer);
                    nextFile();
                } catch (writeError) {
                    fail(writeError.message || String(writeError));
                }
            });
        }

        function applyDeletes() {
            try {
                for (var i = 0; i < deleted.length; i++) {
                    var relativePath = cleanPath(deleted[i]);
                    if (isAllowedPath(relativePath)) removeFile(relativePath, stamp);
                }
            } catch (error) {
                fail(error.message || String(error));
                return;
            }

            var nextVersion = manifest.version || config.currentVersion;
            rememberCurrentVersion(nextVersion);
            setStatus("updated", {
                available: false,
                currentVersion: nextVersion,
                appliedAt: Date.now(),
                progress: "Patch installe"
            });
            notify("Patch installe", ["Version " + (nextVersion || "?"), "Redemarre le jeu pour charger les nouveaux fichiers."], "system");
            if (config.restartAfterUpdate) Update.restart();
            done(true);
        }

        function fail(message) {
            setStatus("error", { lastError: message, progress: "" });
            notify("Patch interrompu", [message], "error");
            done(false);
        }

        nextFile();
    };

    Update.restart = function() {
        try {
            if (window.nw && nw.App && nw.App.restart) {
                nw.App.restart();
                return true;
            }
        } catch (error) {
            warn("[L3Update] restart NW impossible", error);
        }
        if (window.location && location.reload) location.reload();
        return true;
    };

    Update.setManifestUrl = function(url) {
        config.manifestUrl = String(url || "").trim();
        params["Manifest URL"] = config.manifestUrl;
        return config.manifestUrl;
    };

    function openScene() {
        if (window.L3UI && L3UI.Scenes && L3UI.Scenes.push) L3UI.Scenes.push("l3UpdateManager");
        else Update.check();
    }

    function renderScene(scene) {
        L3UI.clear(scene);
        L3UI.hideNativeWindows(scene);
        var currentVersion = effectiveCurrentVersion();

        var screen = L3UI.Layout.screen(scene, { className: "l3-update-page" });
        var shell = L3UI.el("main", { className: "l3-update-shell l3-panel" });
        screen.appendChild(shell);

        shell.appendChild(L3UI.el("section", {
            className: "l3-update-hero",
                html:
                    "<div class=\"l3-net-kicker\">Updater</div>" +
                    "<h1>" + L3UI.escapeHtml(Update.state.status) + "</h1>" +
                    "<p>Version actuelle : <strong>" + L3UI.escapeHtml(currentVersion) + "</strong></p>" +
                    "<p>Version distante : <strong>" + L3UI.escapeHtml(Update.state.remoteVersion || "-") + "</strong></p>" +
                    "<p>" + L3UI.escapeHtml(Update.state.progress || Update.state.lastError || "Pret.") + "</p>"
        }));

        var commands = [
            { label: "Verifier", icon: "?", handler: function() { Update.check(function() { renderScene(scene); }); } },
            { label: "Installer", icon: "+", handler: function() { Update.apply(function() { renderScene(scene); }); } },
            { label: "Redemarrer", icon: "R", handler: function() { Update.restart(); } },
            { label: "Retour", icon: "<", handler: function() { SceneManager.pop(); } }
        ];

        var list = L3UI.Components.CommandList({
            id: "l3-update-commands",
            scene: scene,
            items: commands,
            onCancel: function() { SceneManager.pop(); }
        });
        list.element.className += " l3-update-actions";
        shell.appendChild(list.element);
        L3UI.Focus.activate(list.group);
    }

    function installCss() {
        if (!window.L3UI || !L3UI.addCss) return;
        L3UI.addCss("l3-update-manager-css",
            ".l3-update-page{display:flex;align-items:center;justify-content:center;padding:36px;background:rgba(8,13,24,.92);}" +
            ".l3-update-shell{width:min(820px,calc(100vw - 72px));padding:28px;display:flex;flex-direction:column;gap:18px;}" +
            ".l3-update-hero h1{margin:4px 0 12px;font-size:38px;color:#f8fafc;}" +
            ".l3-update-hero p{margin:5px 0;color:#b6c4d6;}" +
            ".l3-update-hero strong{color:#f8fafc;}" +
            ".l3-update-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;}"
        );
    }

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (String(command).toLowerCase() !== "l3update") return;
        args = args || [];
        var action = String(args[0] || "").toLowerCase();
        if (action === "check") Update.check();
        else if (action === "apply" || action === "install") Update.apply();
        else if (action === "open") openScene();
        else if (action === "restart") Update.restart();
        else if (action === "manifest") Update.setManifestUrl(args.slice(1).join(" "));
        else if (action === "status") notify("Mise a jour", [Update.state.status, Update.state.progress || Update.state.lastError || "-"], "system");
    };

    installCss();

    if (window.L3UI && L3UI.Scenes) {
        L3UI.Scenes.register("l3UpdateManager", {
            title: config.menuLabel,
            render: renderScene,
            update: function(scene) {
                if (Input.isTriggered("cancel") || TouchInput.isCancelled()) SceneManager.pop();
            }
        });
    }

    if (config.menuCommand && window.L3UI && L3UI.Slots) {
        L3UI.Slots.add("menu.commands", "l3-update-manager", {
            label: config.menuLabel,
            icon: "U",
            order: config.menuOrder,
            handler: openScene
        });
    }

    if (window.L3UI && L3UI.Services) L3UI.Services.register("update", Update);
    if (window.L3UI && L3UI.Plugins) {
        L3UI.Plugins.register(PLUGIN_NAME, {
            version: Update.version,
            title: "L3 Update Manager",
            depends: ["L3_UICore"],
            provides: ["update", "patcher"]
        });
    }

    if (config.autoCheck) {
        setTimeout(function() {
            Update.check(function(ok) {
                if (ok && config.autoApply && Update.state.available) Update.apply();
            });
        }, 1200);
    }
})();
