/*:
 * @plugindesc L3 Net Core v0.5.3 - Sessions locales et distantes 2-4 joueurs pour RPG Maker MV.
 * @author L3ViKk
 * @version 0.5.3
 *
 * @param Enabled
 * @text Activer le reseau
 * @type boolean
 * @default true
 *
 * @param Default Server URL
 * @text Adresse locale par defaut
 * @type text
 * @default ws://127.0.0.1:7777
 *
 * @param Remote Server URL
 * @text Adresse distante par defaut
 * @type text
 * @default ws://VOTRE-IP-PUBLIQUE:7777
 *
 * @param Default Room Code
 * @text Code session par defaut
 * @type text
 * @default LOCAL
 *
 * @param Max Players
 * @text Joueurs max
 * @type number
 * @min 2
 * @max 4
 * @default 4
 *
 * @param Player Name Variable
 * @text Variable nom joueur
 * @type variable
 * @default 0
 *
 * @param Auto Connect
 * @text Connexion automatique
 * @type boolean
 * @default false
 *
 * @param Sync Player Position
 * @text Synchroniser les positions
 * @type boolean
 * @default true
 *
 * @param Position Send Interval
 * @text Intervalle position
 * @type number
 * @min 1
 * @default 2
 *
 * @param Position Heartbeat Interval
 * @text Heartbeat position
 * @type number
 * @min 10
 * @default 30
 *
 * @param Interpolation Delay
 * @text Delai interpolation ms
 * @type number
 * @min 0
 * @default 160
 *
 * @param Remote Snap Distance
 * @text Distance correction
 * @type number
 * @decimals 2
 * @default 4
 *
 * @param Network Smooth Profile
 * @text Profil de fluidite
 * @type select
 * @option Local
 * @value local
 * @option Distant
 * @value remote
 * @option Tunnel
 * @value tunnel
 * @default tunnel
 *
 * @param Prediction Limit
 * @text Prediction max ms
 * @type number
 * @min 0
 * @default 220
 *
 * @param Remote Movement Mode
 * @text Mouvement distant
 * @type select
 * @option Hybride
 * @value hybrid
 * @option Interpolation
 * @value smooth
 * @default hybrid
 *
 * @param Show Map HUD
 * @text Afficher le HUD reseau
 * @type boolean
 * @default true
 *
 * @param Show Player Names
 * @text Afficher les noms joueurs
 * @type boolean
 * @default true
 *
 * @param Enable Menu Command
 * @text Commande dans le menu
 * @type boolean
 * @default true
 *
 * @param Menu Label
 * @text Libelle menu
 * @type text
 * @default En ligne
 *
 * @param Menu Icon
 * @text Icone menu
 * @type text
 * @default N
 *
 * @param Menu Order
 * @text Ordre menu
 * @type number
 * @default 85
 *
 * @param Debug
 * @text Debug
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * L3 Net Core
 * ============================================================================
 *
 * Premiere brique reseau pour les sessions locales et distantes.
 *
 * Le serveur se lance avec :
 *
 *   npm run net:start
 *   npm run net:online
 *
 * Commandes de plugin :
 *
 *   L3Net connect
 *   L3Net connect ws://127.0.0.1:7777 LOCAL Alice
 *   L3Net local LOCAL
 *   L3Net remote MONCODE
 *   L3Net room MONCODE
 *   L3Net tunnel MONCODE
 *   L3Net name Alice
 *   L3Net disconnect
 *   L3Net say Bonjour
 *   L3Net status
 *
 * API :
 *
 *   L3Net.connect(url, name, roomCode)
 *   L3Net.connectLocal(roomCode)
 *   L3Net.connectRemote(roomCode)
 *   L3Net.disconnect()
 *   L3Net.send(type, data)
 *   L3Net.isConnected()
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_NetCore";
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

    var config = {
        enabled: readBool("Enabled", true),
        defaultUrl: readText("Default Server URL", "ws://127.0.0.1:7777"),
        remoteUrl: readText("Remote Server URL", "ws://VOTRE-IP-PUBLIQUE:7777"),
        defaultRoomCode: readText("Default Room Code", "LOCAL"),
        maxPlayers: Math.max(2, Math.min(4, readNumber("Max Players", 4))),
        playerNameVariable: readNumber("Player Name Variable", 0),
        autoConnect: readBool("Auto Connect", false),
        syncPosition: readBool("Sync Player Position", true),
        sendInterval: Math.max(1, readNumber("Position Send Interval", 2)),
        heartbeatInterval: Math.max(10, readNumber("Position Heartbeat Interval", 30)),
        interpolationDelay: Math.max(0, readNumber("Interpolation Delay", 160)),
        remoteSnapDistance: Math.max(1, readNumber("Remote Snap Distance", 4)),
        smoothProfile: readText("Network Smooth Profile", "tunnel").toLowerCase(),
        predictionLimit: Math.max(0, readNumber("Prediction Limit", 220)),
        remoteMovementMode: readText("Remote Movement Mode", "hybrid").toLowerCase(),
        showHud: readBool("Show Map HUD", true),
        showPlayerNames: readBool("Show Player Names", true),
        menuCommand: readBool("Enable Menu Command", true),
        menuLabel: readText("Menu Label", "En ligne"),
        menuIcon: readText("Menu Icon", "N"),
        menuOrder: readNumber("Menu Order", 85),
        debug: readBool("Debug", false)
    };

    var Net = window.L3Net || {};
    window.L3Net = Net;

    Net.version = "0.5.3";
    Net.config = config;
    Net.socket = null;
    Net.remoteCharacters = {};
    Net.state = Net.state || {};
    Net.state.status = "offline";
    Net.state.url = config.defaultUrl;
    Net.state.localUrl = config.defaultUrl;
    var storedRemoteUrl = storageGet("l3-net-remote-url", "");
    if (isEphemeralTunnelUrl(storedRemoteUrl)) {
        storageRemove("l3-net-remote-url");
        storedRemoteUrl = "";
    }
    Net.state.remoteUrl = storedRemoteUrl || config.remoteUrl;
    Net.state.roomCode = storageGet("l3-net-room-code", normalizeRoom(config.defaultRoomCode));
    Net.state.tunnelUrl = "";
    Net.state.joinUrl = "";
    Net.state.playerId = "";
    Net.state.roomId = "";
    Net.state.serverVersion = "";
    Net.state.maxPlayers = config.maxPlayers;
    Net.state.name = storageGet("l3-net-player-name", "");
    Net.state.players = {};
    Net.state.lastError = "";
    Net.state.lastMessageAt = 0;
    Net.state.sentPackets = 0;
    Net.state.receivedPackets = 0;
    Net.state.latency = 0;
    Net.state.jitter = 0;
    Net.state.quality = "-";
    Net.tunnelInfoPath = "L3NetServer/remote-url.json";
    Net._onlineHostProcess = null;
    Net._sendSeq = 0;
    Net._lastSentFrame = 0;
    Net._lastSentSignature = "";
    Net._lastMoveSignature = "";
    Net._lastLocalStateForVelocity = null;
    Net._pendingPings = {};
    Net._lastPingFrame = 0;

    if (!config.enabled) return;

    function log() {
        if (config.debug && window.console && console.log) console.log.apply(console, arguments);
    }

    function warn() {
        if (window.console && console.warn) console.warn.apply(console, arguments);
    }

    function emit(name, payload) {
        if (window.L3UI && L3UI.Events) L3UI.Events.emit("net:" + name, payload || Net.state);
    }

    function notify(title, lines, type) {
        lines = lines || [];
        if (typeof lines === "string") lines = [lines];
        if (window.L3UIScenes && L3UIScenes.notify) {
            L3UIScenes.notify({ title: title, lines: lines, type: type || "system" });
        } else if (window.L3UI && L3UI.Components && L3UI.Components.Toast) {
            L3UI.Components.Toast((title ? title + " : " : "") + lines.join(" "));
        } else {
            log("[L3Net]", title, lines.join(" "));
        }
    }

    function storageGet(key, fallback) {
        try {
            var value = window.localStorage ? localStorage.getItem(key) : null;
            return value === undefined || value === null || value === "" ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            if (window.localStorage) localStorage.setItem(key, String(value || ""));
        } catch (error) {
            // Local storage may be unavailable in some runtimes.
        }
    }

    function storageRemove(key) {
        try {
            if (window.localStorage) localStorage.removeItem(key);
        } catch (error) {
            // Local storage may be unavailable in some runtimes.
        }
    }

    function isEphemeralTunnelUrl(url) {
        url = String(url || "").toLowerCase();
        return url.indexOf(".trycloudflare.com") >= 0 || url.indexOf(".loca.lt") >= 0;
    }

    function normalizeRoom(room) {
        var value = String(room || "LOCAL").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
        return (value || "LOCAL").slice(0, 24);
    }

    function cleanPlayerName(name) {
        return String(name || "").replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ").slice(0, 32);
    }

    function urlWithRoom(url, roomCode) {
        url = cleanUrl(url);
        roomCode = normalizeRoom(roomCode || Net.state.roomCode || config.defaultRoomCode);
        if (/[?&]room=/.test(url)) return url;
        return url + (url.indexOf("?") === -1 ? "?" : "&") + "room=" + encodeURIComponent(roomCode);
    }

    function roomFromUrl(url) {
        try {
            var normalized = cleanUrl(url).replace(/^wss?:\/\//, "http://");
            var match = normalized.match(/[?&]room=([^&]+)/);
            return match ? normalizeRoom(decodeURIComponent(match[1])) : "";
        } catch (error) {
            return "";
        }
    }

    function tunnelInfoIsFresh(info) {
        if (!info || !info.createdAt) return false;
        var time = Date.parse(info.createdAt);
        if (!time) return false;
        return Date.now() - time < 2 * 60 * 60 * 1000;
    }

    function readJsonFile(path, silent) {
        if (window.require) {
            try {
                var fs = window.require("fs");
                var pathModule = window.require("path");
                var candidates = [path];
                if (window.process && process.cwd) candidates.push(pathModule.join(process.cwd(), path));
                for (var i = 0; i < candidates.length; i++) {
                    if (fs.existsSync(candidates[i])) return JSON.parse(fs.readFileSync(candidates[i], "utf8"));
                }
            } catch (error) {
                if (!silent) warn("[L3Net] lecture tunnel impossible", error);
            }
        }

        if (silent) return null;

        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path + "?v=" + Date.now(), false);
            xhr.overrideMimeType("application/json");
            xhr.send();
            if (xhr.status < 400 && xhr.responseText) return JSON.parse(xhr.responseText);
        } catch (error2) {
            if (!silent) warn("[L3Net] XHR tunnel impossible", error2);
        }

        return null;
    }

    function clearTunnelInfo(removeFile) {
        Net.state.tunnelUrl = "";
        Net.state.joinUrl = "";
        if (removeFile && window.require) {
            try {
                var fs = window.require("fs");
                if (fs.existsSync(Net.tunnelInfoPath)) fs.unlinkSync(Net.tunnelInfoPath);
            } catch (error) {
                warn("[L3Net] nettoyage tunnel impossible", error);
            }
        }
    }

    function cleanUrl(url) {
        url = String(url || config.defaultUrl || "").trim();
        if (!url) url = config.defaultUrl;
        if (url.indexOf("ws://") !== 0 && url.indexOf("wss://") !== 0) url = "ws://" + url;
        return url;
    }

    function playerName(fallback) {
        var value = cleanPlayerName(fallback);
        if (value) return value;

        if (config.playerNameVariable > 0 && window.$gameVariables) value = $gameVariables.value(config.playerNameVariable);
        value = cleanPlayerName(value);
        if (!value) value = cleanPlayerName(storageGet("l3-net-player-name", ""));
        if (!value && window.$gameParty && $gameParty.leader()) value = cleanPlayerName($gameParty.leader().name());
        if (!value) value = "Joueur";
        return value;
    }

    function askPlayerName() {
        var current = playerName(Net.state.name || "");
        var value = window.prompt("Nom du joueur", current);
        if (value === null) return "";
        return cleanPlayerName(value) || current;
    }

    function socketOpen() {
        return Net.socket && Net.socket.readyState === WebSocket.OPEN;
    }

    function setStatus(status, extra) {
        Net.state.status = status;
        if (extra) {
            for (var key in extra) {
                if (extra.hasOwnProperty(key)) Net.state[key] = extra[key];
            }
        }
        emit("status", Net.state);
    }

    function updateNetworkQuality(latency, jitter) {
        latency = Math.round(numberOr(latency, 0));
        jitter = Math.round(numberOr(jitter, 0));
        Net.state.latency = latency;
        Net.state.jitter = jitter;
        if (!latency) Net.state.quality = "-";
        else if (latency < 90 && jitter < 35) Net.state.quality = "stable";
        else if (latency < 180 && jitter < 80) Net.state.quality = "moyen";
        else Net.state.quality = "instable";
    }

    Net.isConnected = function() {
        return socketOpen() && Net.state.status === "connected";
    };

    Net.connect = function(url, name, roomCode) {
        if (!window.WebSocket) {
            notify("Reseau indisponible", ["Ce runtime ne fournit pas WebSocket."], "error");
            return false;
        }

        url = cleanUrl(url);
        roomCode = normalizeRoom(roomCode || Net.state.roomCode || config.defaultRoomCode);
        name = playerName(name);
        Net.setPlayerName(name, true);

        if (Net.socket) Net.disconnect(true);

        Net.state.players = {};
        Net.remoteCharacters = {};
        Net._sendSeq = 0;
        Net._lastSentFrame = 0;
        Net._lastSentSignature = "";
        Net._lastMoveSignature = "";
        Net._lastLocalStateForVelocity = null;
        Net.state.roomCode = roomCode;
        storageSet("l3-net-room-code", roomCode);

        setStatus("connecting", { url: url, name: name, roomCode: roomCode, lastError: "" });
        notify("Connexion reseau", ["Connexion a " + urlWithRoom(url, roomCode), "Session : " + roomCode], "network");

        var socket;
        try {
            socket = new WebSocket(urlWithRoom(url, roomCode));
            Net.socket = socket;
        } catch (error) {
            setStatus("error", { lastError: error.message || String(error) });
            notify("Connexion impossible", [Net.state.lastError], "error");
            return false;
        }

        socket.onopen = function() {
            if (Net.socket !== socket) return;
            Net.send("hello", {
                name: name,
                roomId: roomCode,
                client: {
                    plugin: PLUGIN_NAME,
                    version: Net.version,
                    title: window.$dataSystem ? $dataSystem.gameTitle : "",
                    mapId: window.$gameMap ? $gameMap.mapId() : 0
                }
            });
            setStatus("handshake");
        };

        socket.onmessage = function(event) {
            if (Net.socket !== socket) return;
            handlePacket(event.data);
        };

        socket.onclose = function(event) {
            if (Net.socket !== socket) return;
            var wasConnected = Net.state.status === "connected" || Net.state.status === "handshake";
            Net.socket = null;
            Net.state.players = {};
            Net.remoteCharacters = {};
            Net._lastLocalStateForVelocity = null;
            Net._lastMoveSignature = "";
            setStatus("offline", { playerId: "", roomId: "", joinUrl: "" });
            if (wasConnected) notify("Session fermee", [event.reason || "Connexion interrompue."], "network");
        };

        socket.onerror = function() {
            if (Net.socket !== socket) return;
            if (Net.state.tunnelUrl && url === Net.state.tunnelUrl) clearTunnelInfo(true);
            setStatus("error", { lastError: "Erreur WebSocket." });
            notify("Erreur reseau", [
                "Connexion impossible.",
                "Verifie que l'hote garde npm run net:online ouvert et que le lien est le dernier genere."
            ], "error");
        };

        return true;
    };

    Net.setPlayerName = function(name, silent) {
        name = cleanPlayerName(name) || playerName();
        Net.state.name = name;
        storageSet("l3-net-player-name", name);
        if (config.playerNameVariable > 0 && window.$gameVariables) $gameVariables.setValue(config.playerNameVariable, name);
        if (Net.isConnected() && !silent) Net.send("rename", { name: name });
        emit("name", { name: name });
        return name;
    };

    Net.rename = function(name) {
        name = Net.setPlayerName(name, false);
        sendPlayerState(true);
        return name;
    };

    Net.connectLocal = function(roomCode) {
        return Net.connect(config.defaultUrl, playerName(), roomCode || Net.state.roomCode);
    };

    Net.connectRemote = function(roomCode) {
        return Net.connect(Net.state.remoteUrl || config.remoteUrl, playerName(), roomCode || Net.state.roomCode);
    };

    Net.loadTunnelUrl = function(silent) {
        var info = readJsonFile(Net.tunnelInfoPath, silent);
        if (!info || !info.websocketUrl) {
            if (!silent) {
                notify("Tunnel introuvable", [
                    "Lance npm run net:online, puis reviens dans ce menu."
                ], "error");
            }
            return null;
        }
        if (!tunnelInfoIsFresh(info)) {
            if (!silent) {
                notify("Lien trop ancien", [
                    "Relance npm run net:online pour obtenir un nouveau lien."
                ], "error");
            }
            return null;
        }

        Net.state.tunnelUrl = info.websocketUrl;
        Net.state.joinUrl = info.joinUrl || urlWithRoom(info.websocketUrl, info.room || Net.state.roomCode);
        Net.setRemoteUrl(info.websocketUrl);
        if (info.room) Net.setRoom(info.room);
        if (!silent) {
            notify("Tunnel charge", [
                info.websocketUrl,
                "Session : " + Net.state.roomCode
            ], "network");
        }
        return info;
    };

    Net.connectTunnel = function(roomCode, silent) {
        var info = Net.loadTunnelUrl(true);
        if (!info) {
            if (!silent) {
                notify("Session en ligne introuvable", [
                    "Lance npm run net:online et garde la fenetre ouverte."
                ], "error");
            }
            return false;
        }
        return Net.connect(info.websocketUrl, playerName(), roomCode || info.room || Net.state.roomCode);
    };

    Net.startOnlineHost = function(roomCode) {
        roomCode = Net.setRoom(roomCode || Net.state.roomCode || config.defaultRoomCode);

        if (Net.isConnected()) {
            notify("Session deja ouverte", ["Tu es deja connecte."], "network");
            return true;
        }

        var existingTunnel = Net.loadTunnelUrl(true);
        if (existingTunnel && existingTunnel.provider === "cloudflare") {
            if (Net.connect(existingTunnel.websocketUrl, playerName(), existingTunnel.room || roomCode)) return true;
        }

        if (!window.require) {
            notify("Action requise", [
                "Lance npm run net:online dans PowerShell.",
                "Puis reviens ici et choisis Creer une partie."
            ], "network");
            return false;
        }

        if (!Net._onlineHostProcess) {
            try {
                var fs = window.require("fs");
                if (fs.existsSync(Net.tunnelInfoPath)) fs.unlinkSync(Net.tunnelInfoPath);
            } catch (error) {
                warn("[L3Net] nettoyage tunnel impossible", error);
            }

            try {
                var childProcess = window.require("child_process");
                var fs2 = window.require("fs");
                var onlineScript = "L3NetServer/cloudflare.js";
                if (!fs2.existsSync(onlineScript)) onlineScript = "L3NetServer/online.js";
                Net._onlineHostProcess = childProcess.spawn("node", [
                    onlineScript,
                    "--room",
                    roomCode,
                    "--max-players",
                    String(config.maxPlayers),
                    "--state-interval",
                    "50"
                ], {
                    cwd: ".",
                    windowsHide: true,
                    shell: false
                });

                Net._onlineHostProcess.on("exit", function() {
                    Net._onlineHostProcess = null;
                });

                Net._onlineHostProcess.on("error", function(error2) {
                    Net._onlineHostProcess = null;
                    notify("Creation impossible", [
                        "Node.js n'a pas pu lancer la session.",
                        error2.message || String(error2)
                    ], "error");
                });
            } catch (error3) {
                notify("Creation impossible", [
                    "Lance npm run net:online dans PowerShell.",
                    error3.message || String(error3)
                ], "error");
                return false;
            }
        }

        notify("Creation de partie", [
            "Preparation de la session en ligne..."
        ], "network");

        var attempts = 0;
        function waitTunnel() {
            attempts += 1;
            var info = Net.loadTunnelUrl(true);
            if (info && info.websocketUrl) {
                Net.connect(info.websocketUrl, playerName(), info.room || roomCode);
                return;
            }
            if (attempts >= 40) {
                notify("Session non prete", [
                    "Le lien en ligne n'a pas ete cree.",
                    "Lance npm run net:online dans PowerShell."
                ], "error");
                return;
            }
            setTimeout(waitTunnel, 500);
        }
        setTimeout(waitTunnel, 600);
        return true;
    };

    Net.setRemoteUrl = function(url) {
        Net.state.remoteUrl = cleanUrl(url || config.remoteUrl);
        if (isEphemeralTunnelUrl(Net.state.remoteUrl)) storageRemove("l3-net-remote-url");
        else storageSet("l3-net-remote-url", Net.state.remoteUrl);
        return Net.state.remoteUrl;
    };

    Net.setRoom = function(roomCode) {
        Net.state.roomCode = normalizeRoom(roomCode || config.defaultRoomCode);
        storageSet("l3-net-room-code", Net.state.roomCode);
        return Net.state.roomCode;
    };

    Net.disconnect = function(silent) {
        if (Net.socket) {
            try {
                Net.socket.close(1000, "Client disconnect");
            } catch (error) {
                warn("[L3Net] close failed", error);
            }
        }
        Net.socket = null;
        Net.state.players = {};
        Net.remoteCharacters = {};
        Net._lastSentSignature = "";
        Net._lastMoveSignature = "";
        Net._lastLocalStateForVelocity = null;
        setStatus("offline", { playerId: "", roomId: "", joinUrl: "" });
        if (Net._onlineHostProcess && !silent) {
            try {
                Net._onlineHostProcess.kill();
            } catch (error2) {
                warn("[L3Net] arret serveur impossible", error2);
            }
            Net._onlineHostProcess = null;
            clearTunnelInfo(true);
        }
        if (!silent) notify("Reseau", ["Deconnecte."], "network");
    };

    Net.send = function(type, data) {
        if (!Net.socket || Net.socket.readyState !== WebSocket.OPEN) return false;
        try {
            Net.socket.send(JSON.stringify({
                type: String(type || ""),
                data: data || {},
                time: Date.now()
            }));
            Net.state.sentPackets += 1;
            return true;
        } catch (error) {
            warn("[L3Net] send failed", error);
            return false;
        }
    };

    Net.chat = function(text) {
        return Net.send("chat", { text: String(text || "") });
    };

    function sendNetworkPing(force) {
        if (!Net.isConnected()) return;
        var frame = window.Graphics ? Graphics.frameCount || 0 : 0;
        if (!force && frame - Net._lastPingFrame < 120) return;
        Net._lastPingFrame = frame;
        var seq = String(Date.now()) + "-" + Math.floor(Math.random() * 9999);
        Net._pendingPings[seq] = Date.now();
        Net.send("ping", { seq: seq });
    }

    Net.players = function() {
        var result = [];
        for (var id in Net.state.players) {
            if (Net.state.players.hasOwnProperty(id)) result.push(Net.state.players[id]);
        }
        result.sort(function(a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
        return result;
    };

    function handlePacket(raw) {
        var packet;
        Net.state.receivedPackets += 1;
        Net.state.lastMessageAt = Date.now();

        try {
            packet = JSON.parse(String(raw));
        } catch (error) {
            warn("[L3Net] packet JSON invalide", raw);
            return;
        }

        var type = String(packet.type || "");
        var data = packet.data || {};

        if (type === "welcome") {
            Net.state.playerId = data.playerId || "";
            Net.state.roomId = data.roomId || Net.state.roomCode || "";
            Net.state.serverVersion = data.serverVersion || "";
            Net.state.maxPlayers = Number(data.maxPlayersPerRoom || data.maxPlayers || Net.state.maxPlayers || 4);
            setStatus("handshake");
        } else if (type === "session") {
            Net.state.playerId = data.playerId || Net.state.playerId;
            Net.state.roomId = data.roomId || Net.state.roomId;
            Net.state.roomCode = normalizeRoom(Net.state.roomId || Net.state.roomCode);
            Net.state.maxPlayers = Number(data.maxPlayers || Net.state.maxPlayers || 4);
            Net.state.players = {};
            mergePlayers(data.players || []);
            setStatus("connected");
            notify("Session rejointe", ["Code : " + Net.state.roomCode, "ID joueur : " + Net.state.playerId], "network");
            sendPlayerState(true);
            emit("session", Net.state);
        } else if (type === "playerJoined") {
            addPlayer(data);
            notify("Joueur connecte", [data.name || data.playerId || "Joueur"], "network");
        } else if (type === "playerLeft") {
            removePlayer(data.playerId);
            notify("Joueur parti", [data.name || data.playerId || "Joueur"], "network");
        } else if (type === "playerState") {
            setRemoteState(data.playerId, data.name, data.state, data.time || packet.serverTime, false);
        } else if (type === "playerMove") {
            setRemoteState(data.playerId, data.name, data.state || data.move || data, data.time || packet.serverTime, true);
        } else if (type === "nameChanged") {
            Net.setPlayerName(data.name || Net.state.name, true);
            sendPlayerState(true);
            emit("players", Net.players());
        } else if (type === "playerRenamed") {
            updateRemoteName(data.playerId, data.name);
        } else if (type === "chat") {
            notify(data.name || "Joueur", [data.text || ""], "chat");
        } else if (type === "pong") {
            var echo = data.echo || {};
            var pingSeq = echo.seq || data.seq || "";
            if (pingSeq && Net._pendingPings[pingSeq]) {
                var latency = Date.now() - Net._pendingPings[pingSeq];
                delete Net._pendingPings[pingSeq];
                var previousLatency = Net.state.latency || latency;
                var jitter = Net.state.jitter ? Net.state.jitter + (Math.abs(latency - previousLatency) - Net.state.jitter) * 0.25 : Math.abs(latency - previousLatency);
                updateNetworkQuality(latency, jitter);
            }
            emit("pong", data);
        } else if (type === "serverClosing") {
            notify("Serveur", ["Le serveur ferme la session."], "network");
        } else if (type === "error") {
            Net.state.lastError = data.message || data.code || "Erreur serveur.";
            if (data.code === "room_full") {
                notify("Session pleine", [
                    Net.state.lastError,
                    "Joueurs max : " + (data.maxPlayers || Net.state.maxPlayers || config.maxPlayers)
                ], "error");
            } else {
                notify("Erreur serveur", [Net.state.lastError], "error");
            }
        } else if (type) {
            emit("packet", { type: type, data: data, packet: packet });
        }
    }

    function mergePlayers(players) {
        for (var i = 0; i < players.length; i++) addPlayer(players[i]);
    }

    function addPlayer(player) {
        if (!player || !player.playerId || player.playerId === Net.state.playerId) return;
        Net.state.players[player.playerId] = player;
        if (player.state) setRemoteState(player.playerId, player.name, player.state);
        emit("players", Net.players());
    }

    function removePlayer(playerId) {
        if (!playerId) return;
        delete Net.state.players[playerId];
        delete Net.remoteCharacters[playerId];
        emit("players", Net.players());
    }

    function updateRemoteName(playerId, name) {
        if (!playerId || playerId === Net.state.playerId) return;
        name = cleanPlayerName(name);
        if (!name) return;

        var player = Net.state.players[playerId] || { playerId: playerId };
        player.name = name;
        Net.state.players[playerId] = player;

        var character = Net.remoteCharacters[playerId];
        if (character) character._l3PlayerName = name;
        emit("players", Net.players());
    }

    function setRemoteState(playerId, name, state, serverTime, immediateMove) {
        if (!playerId || playerId === Net.state.playerId) return;
        var player = Net.state.players[playerId] || { playerId: playerId };
        player.name = name || player.name || playerId;
        player.state = state || {};
        Net.state.players[playerId] = player;

        var character = remoteCharacter(playerId);
        character.applyPlayer(player, serverTime, immediateMove);
        emit("playerState", player);
    }

    function numberOr(value, fallback) {
        value = Number(value);
        return isNaN(value) ? fallback : value;
    }

    function roundNetNumber(value) {
        return Math.round(numberOr(value, 0) * 1000) / 1000;
    }

    function clamp(value, min, max) {
        value = Number(value);
        if (isNaN(value)) value = min;
        return Math.max(min, Math.min(max, value));
    }

    function smoothProfile() {
        if (config.smoothProfile === "local") {
            return { minDelay: 60, maxDelay: 150, smooth: 0.72, predict: Math.min(config.predictionLimit, 90), stateFrames: Math.max(config.sendInterval, 2) };
        }
        if (config.smoothProfile === "remote") {
            return { minDelay: 100, maxDelay: 260, smooth: 0.58, predict: Math.min(config.predictionLimit, 160), stateFrames: Math.max(config.sendInterval, 4) };
        }
        return { minDelay: 140, maxDelay: 380, smooth: 0.48, predict: config.predictionLimit, stateFrames: Math.max(config.sendInterval, 8) };
    }

    function velocityLimited(value) {
        return clamp(value, -10, 10);
    }

    function directionPriority(direction) {
        direction = Number(direction || 2);
        if (direction === 4 || direction === 6) return "x";
        if (direction === 2 || direction === 8) return "y";
        return "x";
    }

    function buildTileSteps(fromX, fromY, toX, toY, preferredDirection) {
        var steps = [];
        var x = Math.round(numberOr(fromX, 0));
        var y = Math.round(numberOr(fromY, 0));
        toX = Math.round(numberOr(toX, x));
        toY = Math.round(numberOr(toY, y));

        function pushStep(direction, nextX, nextY) {
            steps.push({
                direction: direction,
                fromX: x,
                fromY: y,
                x: nextX,
                y: nextY
            });
            x = nextX;
            y = nextY;
        }

        var prefer = directionPriority(preferredDirection);
        var guard = 0;
        while ((x !== toX || y !== toY) && guard < 16) {
            guard += 1;
            var dx = toX - x;
            var dy = toY - y;
            var useX = dx !== 0 && (prefer === "x" || dy === 0);
            var useY = dy !== 0 && (prefer === "y" || dx === 0);

            if (!useX && !useY) useX = Math.abs(dx) >= Math.abs(dy);

            if (useX) pushStep(dx > 0 ? 6 : 4, x + (dx > 0 ? 1 : -1), y);
            else pushStep(dy > 0 ? 2 : 8, x, y + (dy > 0 ? 1 : -1));
        }

        return steps;
    }

    function stateSignature(state) {
        return [
            state.mapId,
            roundNetNumber(state.realX),
            roundNetNumber(state.realY),
            state.x,
            state.y,
            state.direction,
            state.pattern,
            state.moving ? 1 : 0,
            state.characterName,
            state.characterIndex,
            state.actorName
        ].join("|");
    }

    function movementSignature(state) {
        return [
            state.mapId,
            state.x,
            state.y,
            state.direction,
            state.moving ? 1 : 0,
            state.dashing ? 1 : 0,
            state.moveSpeed,
            state.characterName,
            state.characterIndex
        ].join("|");
    }

    function localPlayerState() {
        if (!window.$gamePlayer || !window.$gameMap) return {};
        var actor = window.$gameParty ? $gameParty.leader() : null;
        return {
            mapId: $gameMap.mapId(),
            x: $gamePlayer.x,
            y: $gamePlayer.y,
            realX: roundNetNumber($gamePlayer._realX),
            realY: roundNetNumber($gamePlayer._realY),
            direction: $gamePlayer.direction(),
            pattern: $gamePlayer.pattern(),
            moving: $gamePlayer.isMoving ? $gamePlayer.isMoving() : false,
            dashing: $gamePlayer.isDashing ? $gamePlayer.isDashing() : false,
            moveSpeed: $gamePlayer.realMoveSpeed ? $gamePlayer.realMoveSpeed() : 4,
            screenX: $gamePlayer.screenX ? roundNetNumber($gamePlayer.screenX()) : 0,
            screenY: $gamePlayer.screenY ? roundNetNumber($gamePlayer.screenY()) : 0,
            characterName: $gamePlayer.characterName ? $gamePlayer.characterName() : "",
            characterIndex: $gamePlayer.characterIndex ? $gamePlayer.characterIndex() : 0,
            actorId: actor && actor.actorId ? actor.actorId() : 0,
            actorName: playerName(Net.state.name || (actor && actor.name ? actor.name() : ""))
        };
    }

    function sendPlayerState(force) {
        if (!config.syncPosition || !Net.isConnected()) return;
        var frame = window.Graphics ? Graphics.frameCount || 0 : 0;
        var state = localPlayerState();
        var now = Date.now();
        var previous = Net._lastLocalStateForVelocity;
        state.vx = 0;
        state.vy = 0;
        if (previous && previous.mapId === state.mapId) {
            var seconds = Math.max(0.001, (now - previous.time) / 1000);
            state.vx = roundNetNumber(velocityLimited((state.realX - previous.realX) / seconds));
            state.vy = roundNetNumber(velocityLimited((state.realY - previous.realY) / seconds));
        }

        var signature = stateSignature(state);
        var moveSignature = movementSignature(state);
        var changed = signature !== Net._lastSentSignature;
        var profile = smoothProfile();
        var stateInterval = profile.stateFrames || config.sendInterval;
        var shouldSendState = force || frame - Net._lastSentFrame >= stateInterval;

        if (moveSignature !== Net._lastMoveSignature) {
            Net._sendSeq += 1;
            state.seq = Net._sendSeq;
            state.sentAt = now;
            if (Net.send("playerMove", state)) Net._lastMoveSignature = moveSignature;
        }

        if (!shouldSendState) return;
        if (!force && !changed && frame - Net._lastSentFrame < config.heartbeatInterval) return;

        Net._sendSeq += 1;
        state.seq = Net._sendSeq;
        state.sentAt = now;

        if (Net.send("playerState", state)) {
            Net._lastSentFrame = frame;
            Net._lastSentSignature = signature;
            Net._lastLocalStateForVelocity = {
                mapId: state.mapId,
                realX: state.realX,
                realY: state.realY,
                time: now
            };
        }
    }

    function remoteCharacter(playerId) {
        if (!Net.remoteCharacters[playerId]) Net.remoteCharacters[playerId] = new Game_L3NetRemote(playerId);
        return Net.remoteCharacters[playerId];
    }

    function Game_L3NetRemote() {
        this.initialize.apply(this, arguments);
    }

    Game_L3NetRemote.prototype = Object.create(Game_CharacterBase.prototype);
    Game_L3NetRemote.prototype.constructor = Game_L3NetRemote;

    Game_L3NetRemote.prototype.initialize = function(playerId) {
        Game_CharacterBase.prototype.initialize.call(this);
        this._l3PlayerId = playerId || "";
        this._l3PlayerName = "";
        this._l3MapId = 0;
        this._l3Ready = false;
        this._through = true;
        this._priorityType = 1;
        this._opacity = 230;
        this._stepAnime = true;
        this._l3LastSeq = 0;
        this._l3Samples = [];
        this._l3LastSampleAt = 0;
        this._l3AvgSpacing = 50;
        this._l3Jitter = 0;
        this._l3AdaptiveDelay = config.interpolationDelay;
        this._l3VelocityX = 0;
        this._l3VelocityY = 0;
        this._l3WasMoving = false;
        this._l3MoveQueue = [];
        this._l3QueuedTileX = null;
        this._l3QueuedTileY = null;
        this._l3TargetRealX = 0;
        this._l3TargetRealY = 0;
        this._l3TargetTileX = 0;
        this._l3TargetTileY = 0;
        this._l3TargetMoving = false;
        this._l3LastMoveSeq = 0;
    };

    Game_L3NetRemote.prototype.applyPlayer = function(player, serverTime, immediateMove) {
        var state = player && player.state ? player.state : {};
        var mapId = Number(state.mapId || 0);
        var targetX = Number(state.x || 0);
        var targetY = Number(state.y || 0);
        var targetRealX = numberOr(state.realX, targetX);
        var targetRealY = numberOr(state.realY, targetY);
        var seq = Number(state.seq || 0);

        if (seq && this._l3LastSeq && seq <= this._l3LastSeq) return;
        if (seq) this._l3LastSeq = seq;

        var previousMapId = this._l3MapId;
        this._l3PlayerName = player.name || this._l3PlayerName;
        this._l3MapId = mapId;

        if (state.characterName !== undefined && (this._characterName !== state.characterName || this._characterIndex !== Number(state.characterIndex || 0))) {
            this.setImage(String(state.characterName || ""), Number(state.characterIndex || 0));
        }

        this._moveSpeed = Number(state.moveSpeed || 4);
        this.setDirection(Number(state.direction || this._direction || 2));
        if (state.pattern !== undefined && config.remoteMovementMode === "smooth") this.setPattern(Number(state.pattern || 1));

        var receivedAt = Date.now();
        if (this._l3LastSampleAt) {
            var spacing = clamp(receivedAt - this._l3LastSampleAt, 8, 500);
            this._l3AvgSpacing = this._l3AvgSpacing ? this._l3AvgSpacing + (spacing - this._l3AvgSpacing) * 0.18 : spacing;
            this._l3Jitter = this._l3Jitter + (Math.abs(spacing - this._l3AvgSpacing) - this._l3Jitter) * 0.14;
            var profile = smoothProfile();
            this._l3AdaptiveDelay = clamp(config.interpolationDelay + this._l3Jitter * 2.25 + this._l3AvgSpacing * 0.35, profile.minDelay, profile.maxDelay);
        }

        this._l3VelocityX = velocityLimited(numberOr(state.vx, this._l3VelocityX || 0));
        this._l3VelocityY = velocityLimited(numberOr(state.vy, this._l3VelocityY || 0));
        this._l3WasMoving = !!state.moving;
        this._l3TargetRealX = targetRealX;
        this._l3TargetRealY = targetRealY;
        this._l3TargetTileX = targetX;
        this._l3TargetTileY = targetY;
        this._l3TargetMoving = !!state.moving;

        var sample = {
            mapId: mapId,
            x: targetX,
            y: targetY,
            realX: targetRealX,
            realY: targetRealY,
            direction: Number(state.direction || this._direction || 2),
            pattern: Number(state.pattern || this._pattern || 1),
            moving: !!state.moving,
            vx: this._l3VelocityX,
            vy: this._l3VelocityY,
            receivedAt: receivedAt,
            serverTime: Number(serverTime || state.serverTime || state.sentAt || 0)
        };

        if (!this._l3Ready || previousMapId !== mapId || Math.abs(this._realX - targetRealX) > config.remoteSnapDistance || Math.abs(this._realY - targetRealY) > config.remoteSnapDistance) {
            this.locate(targetX, targetY);
            this._realX = targetRealX;
            this._realY = targetRealY;
            this._l3Samples = [sample];
            this._l3MoveQueue = [];
            this._l3QueuedTileX = targetX;
            this._l3QueuedTileY = targetY;
            this._l3AdaptiveDelay = config.interpolationDelay;
            this._l3Ready = true;
        } else {
            this._l3Samples.push(sample);
            while (this._l3Samples.length > 8) this._l3Samples.shift();
            if (config.remoteMovementMode !== "smooth") this.enqueueTilePath(sample, !!immediateMove);
        }
        this._l3LastSampleAt = sample.receivedAt;
    };

    Game_L3NetRemote.prototype.update = function() {
        if (config.remoteMovementMode === "smooth") {
            this.updateNetInterpolation();
            this.updateAnimation();
        } else {
            this.updateNetPathMovement();
            Game_CharacterBase.prototype.update.call(this);
            this.updateNetPathCorrection();
        }
    };

    Game_L3NetRemote.prototype.enqueueTilePath = function(sample, immediateMove) {
        if (!sample || sample.mapId !== this._l3MapId) return;
        var targetX = Math.round(numberOr(sample.x, this._x));
        var targetY = Math.round(numberOr(sample.y, this._y));
        var startX = this._l3QueuedTileX;
        var startY = this._l3QueuedTileY;

        if (startX === null || startY === null) {
            startX = Math.round(numberOr(this._x, targetX));
            startY = Math.round(numberOr(this._y, targetY));
        }

        if (startX === targetX && startY === targetY) return;

        var distance = Math.abs(targetX - startX) + Math.abs(targetY - startY);
        if (distance > 8 || Math.abs(this._realX - sample.realX) > config.remoteSnapDistance || Math.abs(this._realY - sample.realY) > config.remoteSnapDistance) {
            this.locate(targetX, targetY);
            this._realX = sample.realX;
            this._realY = sample.realY;
            this._l3MoveQueue = [];
            this._l3QueuedTileX = targetX;
            this._l3QueuedTileY = targetY;
            return;
        }

        var steps = buildTileSteps(startX, startY, targetX, targetY, sample.direction);
        if (!steps.length) return;

        if (immediateMove && this._l3MoveQueue.length > 4) this._l3MoveQueue.splice(0, this._l3MoveQueue.length - 2);
        for (var i = 0; i < steps.length; i++) {
            steps[i].speed = Number(sample.moveSpeed || this._moveSpeed || 4);
            steps[i].moving = !!sample.moving;
            this._l3MoveQueue.push(steps[i]);
        }
        while (this._l3MoveQueue.length > 10) this._l3MoveQueue.shift();
        this._l3QueuedTileX = targetX;
        this._l3QueuedTileY = targetY;
    };

    Game_L3NetRemote.prototype.updateNetPathMovement = function() {
        if (!this._l3Ready || this.isMoving() || !this._l3MoveQueue.length) return;
        var step = this._l3MoveQueue.shift();
        if (!step) return;

        var baseSpeed = Number(step.speed || this._moveSpeed || 4);
        this._moveSpeed = clamp(baseSpeed + Math.min(1.25, this._l3MoveQueue.length * 0.25), 3, 6);
        this.setDirection(step.direction || this._direction || 2);
        this.moveStraight(step.direction || this._direction || 2);

        if (this.isMovementSucceeded && !this.isMovementSucceeded()) {
            this._x = step.x;
            this._y = step.y;
            this._realX = step.fromX;
            this._realY = step.fromY;
        }
    };

    Game_L3NetRemote.prototype.updateNetPathCorrection = function() {
        if (!this._l3Ready || this._l3TargetRealX === undefined || this._l3TargetRealY === undefined) return;
        var dx = this._l3TargetRealX - this._realX;
        var dy = this._l3TargetRealY - this._realY;

        if (Math.abs(dx) > config.remoteSnapDistance || Math.abs(dy) > config.remoteSnapDistance) {
            this.locate(this._l3TargetTileX, this._l3TargetTileY);
            this._realX = this._l3TargetRealX;
            this._realY = this._l3TargetRealY;
            this._l3MoveQueue = [];
            this._l3QueuedTileX = this._l3TargetTileX;
            this._l3QueuedTileY = this._l3TargetTileY;
            return;
        }

        if (!this.isMoving() && !this._l3MoveQueue.length && !this._l3TargetMoving) {
            this._realX += dx * 0.18;
            this._realY += dy * 0.18;
            if (Math.abs(this._realX - this._l3TargetRealX) < 0.003) this._realX = this._l3TargetRealX;
            if (Math.abs(this._realY - this._l3TargetRealY) < 0.003) this._realY = this._l3TargetRealY;
            this._x = Math.round(this._l3TargetTileX);
            this._y = Math.round(this._l3TargetTileY);
        }
    };

    Game_L3NetRemote.prototype.updateNetInterpolation = function() {
        if (!this._l3Ready || !this._l3Samples.length) return;

        var profile = smoothProfile();
        var delay = clamp(this._l3AdaptiveDelay || config.interpolationDelay, profile.minDelay, profile.maxDelay);
        var renderAt = Date.now() - delay;
        var samples = this._l3Samples;
        while (samples.length >= 2 && samples[1].receivedAt <= renderAt) samples.shift();

        var from = samples[0];
        var to = samples.length >= 2 ? samples[1] : null;
        var targetRealX = from.realX;
        var targetRealY = from.realY;
        var targetDirection = from.direction;
        var targetPattern = from.pattern;

        if (to) {
            var span = Math.max(1, to.receivedAt - from.receivedAt);
            var ratio = Math.max(0, Math.min(1, (renderAt - from.receivedAt) / span));
            targetRealX = from.realX + (to.realX - from.realX) * ratio;
            targetRealY = from.realY + (to.realY - from.realY) * ratio;
            targetDirection = ratio > 0.5 ? to.direction : from.direction;
            targetPattern = ratio > 0.5 ? to.pattern : from.pattern;
        } else {
            var predictionMs = from.moving ? clamp(renderAt - from.receivedAt, 0, profile.predict) : 0;
            targetRealX = from.realX + velocityLimited(from.vx || 0) * (predictionMs / 1000);
            targetRealY = from.realY + velocityLimited(from.vy || 0) * (predictionMs / 1000);
        }

        if (Math.abs(this._realX - targetRealX) > config.remoteSnapDistance || Math.abs(this._realY - targetRealY) > config.remoteSnapDistance) {
            this.locate(Math.round(targetRealX), Math.round(targetRealY));
            this._realX = targetRealX;
            this._realY = targetRealY;
        } else {
            var smooth = to ? 0.88 : profile.smooth;
            this._realX += (targetRealX - this._realX) * smooth;
            this._realY += (targetRealY - this._realY) * smooth;
            if (Math.abs(this._realX - targetRealX) < 0.002) this._realX = targetRealX;
            if (Math.abs(this._realY - targetRealY) < 0.002) this._realY = targetRealY;
            this._x = Math.round(this._realX);
            this._y = Math.round(this._realY);
        }

        this.setDirection(targetDirection || this._direction || 2);
        this.setPattern(targetPattern || this._pattern || 1);
    };

    Game_L3NetRemote.prototype.screenX = function() {
        if (!window.$gameMap) return this._realX * 48 + 24;
        var tw = window.$gameMap ? $gameMap.tileWidth() : 48;
        return $gameMap.adjustX(this._realX) * tw + tw / 2;
    };

    Game_L3NetRemote.prototype.screenY = function() {
        if (!window.$gameMap) return this._realY * 48 + 48;
        var th = window.$gameMap ? $gameMap.tileHeight() : 48;
        return $gameMap.adjustY(this._realY) * th + th - this.shiftY() - this.jumpHeight();
    };

    Game_L3NetRemote.prototype.isVisibleOnCurrentMap = function() {
        return this._l3Ready && window.$gameMap && this._l3MapId === $gameMap.mapId();
    };

    function Sprite_L3NetCharacter() {
        this.initialize.apply(this, arguments);
    }

    Sprite_L3NetCharacter.prototype = Object.create(Sprite_Character.prototype);
    Sprite_L3NetCharacter.prototype.constructor = Sprite_L3NetCharacter;

    Sprite_L3NetCharacter.prototype.updatePosition = function() {
        this.x = this._character.screenX();
        this.y = this._character.screenY();
        this.z = this._character.screenZ();
    };

    function createNameplate() {
        var sprite = new Sprite(new Bitmap(168, 34));
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 1;
        sprite._l3Text = "";
        return sprite;
    }

    function drawNameplate(sprite, text) {
        var bitmap = sprite.bitmap;
        var width = bitmap.width;
        var height = bitmap.height;
        bitmap.clear();
        bitmap.fontFace = "GameFont";
        bitmap.fontSize = 16;
        bitmap.textColor = "#f8fafc";
        bitmap.outlineColor = "rgba(0,0,0,.95)";
        bitmap.outlineWidth = 5;
        bitmap.paintOpacity = 255;
        bitmap.drawText(text, 4, 4, width - 8, height - 8, "center");
        sprite._l3Text = text;
    }

    function safeCharacterSpriteHeight(sprite) {
        if (!sprite) return 48;
        if (sprite._tileId > 0 && window.$gameMap) return $gameMap.tileHeight();

        var bitmap = sprite.bitmap;
        if (!bitmap || !bitmap.width || !bitmap.height) {
            return window.$gameMap ? $gameMap.tileHeight() : 48;
        }

        if (sprite._isBigCharacter) return bitmap.height / 4;
        return bitmap.height / 8;
    }

    function updateNameplate(sprite, character) {
        if (!sprite || !character) return;
        if (!config.showPlayerNames) {
            if (sprite._l3NetNameplate) sprite._l3NetNameplate.visible = false;
            return;
        }

        if (!sprite._l3NetNameplate) {
            sprite._l3NetNameplate = createNameplate();
            sprite.addChild(sprite._l3NetNameplate);
        }

        var plate = sprite._l3NetNameplate;
        var name = String(character._l3PlayerName || character._l3PlayerId || "").trim().slice(0, 22);
        plate.visible = !!name && character.isVisibleOnCurrentMap();
        if (!plate.visible) return;

        var height = safeCharacterSpriteHeight(sprite);
        plate.y = -height - 8;
        if (plate._l3Text !== name) drawNameplate(plate, name);
    }

    function updateSpriteset(spriteset) {
        if (!spriteset || !spriteset._tilemap) return;
        spriteset._l3NetSprites = spriteset._l3NetSprites || {};
        var active = {};
        var players = Net.state.players || {};

        for (var playerId in players) {
            if (!players.hasOwnProperty(playerId)) continue;
            var character = remoteCharacter(playerId);
            if (!character.isVisibleOnCurrentMap()) {
                removeRemoteSprite(spriteset, playerId);
                continue;
            }

            active[playerId] = true;
            if (!spriteset._l3NetSprites[playerId]) {
                spriteset._l3NetSprites[playerId] = new Sprite_L3NetCharacter(character);
                spriteset._tilemap.addChild(spriteset._l3NetSprites[playerId]);
            }
            var sprite = spriteset._l3NetSprites[playerId];
            character.update();
            if (sprite.update) sprite.update();
            updateNameplate(sprite, character);
        }

        for (var existingId in spriteset._l3NetSprites) {
            if (spriteset._l3NetSprites.hasOwnProperty(existingId) && !active[existingId]) {
                removeRemoteSprite(spriteset, existingId);
            }
        }
    }

    function removeRemoteSprite(spriteset, playerId) {
        if (!spriteset || !spriteset._l3NetSprites || !spriteset._l3NetSprites[playerId]) return;
        var sprite = spriteset._l3NetSprites[playerId];
        if (sprite.parent) sprite.parent.removeChild(sprite);
        delete spriteset._l3NetSprites[playerId];
    }

    function renderHud(scene) {
        if (!config.showHud || !window.L3UI || !(scene instanceof Scene_Map)) return;
        var layer = L3UI.layer(scene, "net-hud");
        if (Graphics.frameCount % 15 !== 0 && layer._l3NetStatus === Net.state.status && layer._l3NetCount === Net.players().length) return;
        layer._l3NetStatus = Net.state.status;
        layer._l3NetCount = Net.players().length;
        L3UI.empty(layer);
        if (Net.state.status === "offline") return;

        var status = Net.state.status === "connected" ? "Connecte" : Net.state.status;
        var panel = L3UI.el("aside", {
            className: "l3-net-hud is-" + Net.state.status,
            html:
                "<div class=\"l3-net-kicker\">RESEAU</div>" +
                "<strong>" + L3UI.escapeHtml(status) + "</strong>" +
                "<span>" + L3UI.escapeHtml("Session " + (Net.state.roomCode || Net.state.roomId || "-")) + "</span>" +
                "<span>" + L3UI.escapeHtml(Net.players().length + " joueur(s) distant(s)") + "</span>" +
                "<span>" + L3UI.escapeHtml(Net.state.latency ? ("Ping " + Net.state.latency + " ms - " + Net.state.quality) : "Ping -") + "</span>"
        });
        layer.appendChild(panel);
    }

    function openScene() {
        if (window.L3UI && L3UI.Scenes) L3UI.Scenes.push("l3NetLobby");
        else notify("Reseau", ["L3 UI n'est pas disponible."], "error");
    }

    function statusLabel() {
        if (Net.state.status === "connected") return "Connecte";
        if (Net.state.status === "connecting" || Net.state.status === "handshake") return "Connexion...";
        if (Net.state.status === "error") return "Erreur";
        return "Hors ligne";
    }

    function statusHint() {
        if (Net.state.status === "connected") return "La session est ouverte. Tes amis peuvent rejoindre avec le lien distant.";
        if (Net.state.status === "connecting" || Net.state.status === "handshake") return "Connexion en cours, garde cet ecran ouvert quelques secondes.";
        if (Net.state.status === "error") return "La connexion a echoue. Verifie que la session est lancee.";
        return "Choisis comment tu veux jouer avec d'autres joueurs.";
    }

    function netSceneSignature() {
        var players = Net.players().map(function(player) {
            return String(player.playerId || "") + ":" + String(player.name || "");
        }).join(",");
        return [
            Net.state.status,
            Net.state.roomCode,
            Net.state.roomId,
            Net.state.remoteUrl,
            Net.state.tunnelUrl,
            Net.state.joinUrl,
            Net.state.playerId,
            Net.state.name,
            Net.state.latency,
            Net.state.quality,
            players
        ].join("|");
    }

    function copyText(text) {
        text = String(text || "");
        if (!text) return false;
        try {
            if (window.nw && nw.Clipboard) {
                nw.Clipboard.get().set(text, "text");
                notify("Lien copie", ["Tu peux l'envoyer aux autres joueurs."], "network");
                return true;
            }
        } catch (error) {
            warn("[L3Net] copie NW impossible", error);
        }

        try {
            var textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            notify("Lien copie", ["Tu peux l'envoyer aux autres joueurs."], "network");
            return true;
        } catch (error2) {
            notify("Copie impossible", ["Copie le lien affiche a l'ecran."], "error");
            return false;
        }
    }

    function renderNetScene(scene) {
        L3UI.clear(scene);
        L3UI.hideNativeWindows(scene);

        scene._l3NetLastSignature = netSceneSignature();

        var status = statusLabel();
        var room = Net.state.roomCode || config.defaultRoomCode;
        var activeSession = Net.state.status !== "offline" && Net.state.status !== "error";
        var remoteLink = activeSession ? (Net.state.joinUrl || urlWithRoom(Net.state.url || Net.state.remoteUrl, room)) : "";
        var currentName = playerName(Net.state.name || "");

        var screen = L3UI.Layout.screen(scene, { className: "l3-net-simple-page" });
        var shell = L3UI.el("main", { className: "l3-net-simple-shell l3-panel" });
        screen.appendChild(shell);

        var commands = [
        ];

        if (activeSession) {
            if (remoteLink) {
                commands.push({
                    label: "Copier le lien",
                    icon: "C",
                    detail: "A envoyer aux autres joueurs.",
                    handler: function() {
                        copyText(remoteLink);
                    }
                });
            }
            commands.push({
                label: "Changer mon nom",
                icon: "N",
                detail: currentName,
                handler: function() {
                    var nextName = askPlayerName();
                    if (!nextName) return;
                    Net.rename(nextName);
                    renderNetScene(scene);
                }
            });
            commands.push({
                label: "Arreter la session",
                icon: "-",
                handler: function() {
                    Net.disconnect();
                    renderNetScene(scene);
                }
            });
        } else {
            commands.push({
                label: "Nom du joueur",
                icon: "N",
                detail: currentName,
                handler: function() {
                    var nextName = askPlayerName();
                    if (!nextName) return;
                    Net.setPlayerName(nextName, true);
                    renderNetScene(scene);
                }
            });
            commands.push({
                label: "Heberger une partie",
                icon: "+",
                detail: "Cree le lien a envoyer.",
                handler: function() {
                    var nextName = askPlayerName();
                    if (!nextName) return;
                    Net.setPlayerName(nextName, true);
                    Net.startOnlineHost(room);
                    renderNetScene(scene);
                }
            });
            commands.push({
                label: "Rejoindre une partie",
                icon: ">",
                detail: "Colle le lien recu.",
                handler: function() {
                    var url = window.prompt("Colle le lien de l'hote", "");
                    if (!url) return;
                    var parsedRoom = roomFromUrl(url);
                    Net.setRemoteUrl(url);
                    if (parsedRoom) Net.setRoom(parsedRoom);
                    var name = askPlayerName();
                    if (!name) return;
                    Net.connect(Net.state.remoteUrl, name, Net.state.roomCode);
                    renderNetScene(scene);
                }
            });
            commands.push({
                label: "Test local",
                icon: "L",
                detail: "Uniquement pour tester.",
                handler: function() {
                    var nextName = askPlayerName();
                    if (!nextName) return;
                    Net.setPlayerName(nextName, true);
                    Net.connectLocal(room);
                    renderNetScene(scene);
                }
            });
        }

        commands.push({
            label: "Retour",
            icon: "<",
            handler: function() {
                SceneManager.pop();
            }
        });

        shell.appendChild(L3UI.el("section", {
            className: "l3-net-hero",
            html:
                "<div class=\"l3-net-kicker\">Multijoueur</div>" +
                "<h1>" + L3UI.escapeHtml(status) + "</h1>" +
                "<p>" + L3UI.escapeHtml(statusHint()) + "</p>" +
                "<span class=\"l3-net-current-name\">Nom joueur : <strong>" + L3UI.escapeHtml(currentName) + "</strong></span>"
        }));

        if (activeSession) {
            shell.appendChild(L3UI.el("section", {
                className: "l3-net-link-card",
                html:
                    "<span>Lien a envoyer</span>" +
                    "<strong>" + L3UI.escapeHtml(remoteLink || "Preparation du lien...") + "</strong>" +
                    "<em>Code session : " + L3UI.escapeHtml(room) + "</em>" +
                    "<em>Reseau : " + L3UI.escapeHtml(Net.state.latency ? (Net.state.latency + " ms - " + Net.state.quality) : "en mesure") + "</em>"
            }));
        } else {
            shell.appendChild(L3UI.el("section", {
                className: "l3-net-quick-help",
                html:
                    "<strong>Pour jouer a plusieurs</strong>" +
                    "<span>1. L'hote clique Heberger une partie.</span>" +
                    "<span>2. Il copie le lien obtenu.</span>" +
                    "<span>3. Les autres joueurs cliquent Rejoindre une partie.</span>"
            }));
        }

        var list = L3UI.Components.CommandList({
            id: "l3-net-commands",
            scene: scene,
            items: commands,
            onCancel: function() {
                SceneManager.pop();
            }
        });
        list.element.className += " l3-net-actions";
        shell.appendChild(list.element);
        L3UI.Focus.activate(list.group);

        var players = Net.players();
        var totalPlayers = activeSession ? players.length + 1 : 0;
        var playersPanel = L3UI.el("section", {
            className: "l3-net-players-panel",
            html:
                "<div class=\"l3-net-panel-title\">" +
                    "<span>Joueurs</span>" +
                    "<strong>" + L3UI.escapeHtml(String(totalPlayers)) + " / " + L3UI.escapeHtml(String(Net.state.maxPlayers || 4)) + "</strong>" +
                "</div>"
        });

        if (!players.length) {
            playersPanel.appendChild(L3UI.el("div", {
                className: "l3-net-empty",
                text: activeSession ? "En attente des autres joueurs." : "Aucune session ouverte."
            }));
        } else {
            var grid = L3UI.el("div", { className: "l3-net-player-grid" });
            for (var i = 0; i < players.length; i++) {
                grid.appendChild(playerCard(players[i]));
            }
            playersPanel.appendChild(grid);
        }
        shell.appendChild(playersPanel);

        if (config.debug) {
            shell.appendChild(L3UI.el("details", {
                className: "l3-net-diagnostic",
                html:
                    "<summary>Diagnostic reseau</summary>" +
                    "<div class=\"l3-net-debug\">" +
                        "<span>Local</span><strong>" + L3UI.escapeHtml(config.defaultUrl) + "</strong>" +
                        "<span>Distant</span><strong>" + L3UI.escapeHtml(Net.state.remoteUrl || "-") + "</strong>" +
                        "<span>Lien</span><strong>" + L3UI.escapeHtml(Net.state.joinUrl || "-") + "</strong>" +
                        "<span>Room</span><strong>" + L3UI.escapeHtml(Net.state.roomId || Net.state.roomCode || "-") + "</strong>" +
                        "<span>Player ID</span><strong>" + L3UI.escapeHtml(Net.state.playerId || "-") + "</strong>" +
                        "<span>Paquets</span><strong>" + Net.state.sentPackets + " / " + Net.state.receivedPackets + "</strong>" +
                    "</div>"
            }));
        }
    }

    function playerCard(player) {
        var state = player.state || {};
        return L3UI.el("section", {
            className: "l3-net-player-card",
            html:
                "<strong>" + L3UI.escapeHtml(player.name || player.playerId) + "</strong>" +
                "<span>Map " + L3UI.escapeHtml(state.mapId || "-") + " - " + L3UI.escapeHtml((state.x || 0) + "," + (state.y || 0)) + "</span>"
        });
    }

    function installMenuCommand() {
        if (!config.menuCommand || !window.L3UI || !L3UI.Slots) return;
        L3UI.Slots.add("menu.commands", "l3-net", {
            label: config.menuLabel,
            icon: config.menuIcon,
            order: config.menuOrder,
            handler: function() {
                openScene();
            }
        });
    }

    function installCss() {
        if (!window.L3UI || !L3UI.addCss) return;
        L3UI.addCss("l3-net-core-css",
            ".l3-net-hud{position:absolute;left:24px;top:24px;z-index:9600;min-width:180px;padding:12px 14px;border:1px solid rgba(56,189,248,.35);border-radius:8px;background:rgba(8,13,24,.78);box-shadow:0 16px 34px rgba(0,0,0,.28);color:#e5eefb;pointer-events:none;}" +
            ".l3-net-hud strong{display:block;font-size:16px;line-height:1.1;margin:2px 0 4px;}" +
            ".l3-net-hud span{display:block;color:#9fb0c4;font-size:12px;}" +
            ".l3-net-hud.is-error{border-color:rgba(251,79,122,.65);}" +
            ".l3-net-simple-page{display:flex;align-items:center;justify-content:center;padding:36px;background:linear-gradient(120deg,rgba(8,13,24,.96),rgba(8,13,24,.78));}" +
            ".l3-net-simple-shell{width:min(920px,calc(100vw - 72px));max-height:calc(100vh - 72px);overflow:auto;padding:28px;display:flex;flex-direction:column;gap:18px;}" +
            ".l3-net-hero{padding-bottom:8px;border-bottom:1px solid rgba(148,163,184,.14);}" +
            ".l3-net-hero h1{margin:4px 0 8px;font-size:38px;line-height:1.05;color:#f8fafc;}" +
            ".l3-net-hero p{max-width:680px;margin:0;color:#b6c4d6;line-height:1.45;}" +
            ".l3-net-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;}" +
            ".l3-net-actions>.l3-button{min-height:72px;align-items:flex-start;justify-content:center;flex-direction:column;padding:14px 16px;margin:0;}" +
            ".l3-net-actions .l3-icon{width:auto;min-width:0;font-size:14px;}" +
            ".l3-net-actions .l3-button-label{white-space:normal;font-size:18px;}" +
            ".l3-net-actions .l3-command-detail{margin:3px 0 0;font-size:12px;line-height:1.35;}" +
            ".l3-net-link-card{display:flex;flex-direction:column;gap:8px;padding:18px;border:1px solid rgba(56,189,248,.28);border-radius:8px;background:rgba(14,165,233,.10);}" +
            ".l3-net-link-card span{font-size:11px;text-transform:uppercase;color:#7dd3fc;}" +
            ".l3-net-link-card strong{padding:12px 14px;border-radius:6px;background:rgba(8,13,24,.52);color:#f8fafc;word-break:break-all;}" +
            ".l3-net-link-card em{font-style:normal;color:#b6c4d6;}" +
            ".l3-net-quick-help{display:grid;gap:7px;padding:16px;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:rgba(15,23,42,.48);color:#b6c4d6;}" +
            ".l3-net-quick-help strong{margin-bottom:4px;color:#f8fafc;font-size:18px;}" +
            ".l3-net-players-panel{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:rgba(15,23,42,.38);}" +
            ".l3-net-panel-title{display:flex;align-items:center;justify-content:space-between;gap:12px;}" +
            ".l3-net-panel-title span{font-size:11px;text-transform:uppercase;color:#8fa1b8;}" +
            ".l3-net-panel-title strong{font-size:16px;color:#e5eefb;}" +
            ".l3-net-screen.is-simple{grid-template-columns:320px minmax(0,1fr);}" +
            ".l3-net-screen.is-simple .l3-layout-main{display:flex;flex-direction:column;gap:16px;}" +
            ".l3-net-kicker{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#38bdf8;}" +
            ".l3-net-status-card{margin:18px 0;padding:16px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(15,23,42,.68);}" +
            ".l3-net-status-card span,.l3-net-status-card small{display:block;color:#9fb0c4;}" +
            ".l3-net-status-card strong{display:block;font-size:26px;margin:4px 0 8px;color:#e5eefb;}" +
            ".l3-net-status-card em{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(56,189,248,.32);border-radius:999px;color:#7dd3fc;font-style:normal;font-size:12px;}" +
            ".l3-net-primary-panel{padding:22px;border:1px solid rgba(56,189,248,.24);border-radius:8px;background:linear-gradient(135deg,rgba(14,165,233,.12),rgba(30,41,59,.72));box-shadow:0 20px 48px rgba(0,0,0,.22);}" +
            ".l3-net-primary-panel h2{margin:4px 0 8px;font-size:30px;line-height:1.1;color:#f8fafc;}" +
            ".l3-net-primary-panel p{margin:0 0 18px;color:#b6c4d6;line-height:1.45;}" +
            ".l3-net-session-grid{display:grid;grid-template-columns:130px minmax(0,1fr);gap:9px 14px;padding:14px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:rgba(8,13,24,.35);}" +
            ".l3-net-session-grid span{font-size:11px;text-transform:uppercase;color:#8fa1b8;}" +
            ".l3-net-session-grid strong{min-width:0;color:#e5eefb;word-break:break-all;}" +
            ".l3-net-steps{padding:18px;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:rgba(15,23,42,.55);}" +
            ".l3-net-steps h3{margin:0 0 10px;font-size:18px;color:#f8fafc;}" +
            ".l3-net-steps ol{margin:0;padding-left:22px;color:#b6c4d6;line-height:1.6;}" +
            ".l3-net-heading{font-size:22px;margin:8px 0 0;color:#f8fafc;}" +
            ".l3-net-empty{padding:22px;border:1px dashed rgba(148,163,184,.24);border-radius:8px;color:#9fb0c4;}" +
            ".l3-net-player-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}" +
            ".l3-net-player-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border:1px solid rgba(56,189,248,.18);border-radius:8px;background:rgba(30,41,59,.72);}" +
            ".l3-net-player-card strong{font-size:18px;color:#f8fafc;}" +
            ".l3-net-player-card span{color:#9fb0c4;}" +
            ".l3-net-help{color:#b6c4d6;line-height:1.55;}" +
            ".l3-net-diagnostic{margin-top:4px;padding:14px 16px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:rgba(8,13,24,.35);color:#9fb0c4;}" +
            ".l3-net-diagnostic summary{cursor:pointer;color:#b6c4d6;}" +
            ".l3-net-debug{display:grid;grid-template-columns:130px minmax(0,1fr);gap:8px 14px;margin-top:14px;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:rgba(15,23,42,.55);}" +
            ".l3-net-debug span{font-size:11px;text-transform:uppercase;color:#8fa1b8;}" +
            ".l3-net-debug strong{display:block;margin-bottom:8px;color:#e5eefb;word-break:break-all;}"
        );
    }

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (String(command).toLowerCase() !== "l3net") return;
        args = args || [];
        var action = String(args[0] || "").toLowerCase();
        if (action === "connect" || action === "join") Net.connect(args[1] || config.defaultUrl, args.slice(3).join(" "), args[2] || Net.state.roomCode);
        else if (action === "local") Net.connectLocal(args[1] || Net.state.roomCode);
        else if (action === "remote") Net.connectRemote(args[1] || Net.state.roomCode);
        else if (action === "host" || action === "create" || action === "online") Net.startOnlineHost(args[1] || Net.state.roomCode);
        else if (action === "tunnel") Net.connectTunnel(args[1] || Net.state.roomCode);
        else if (action === "loadtunnel") Net.loadTunnelUrl(false);
        else if (action === "room") Net.setRoom(args[1] || config.defaultRoomCode);
        else if (action === "remoteurl") Net.setRemoteUrl(args.slice(1).join(" "));
        else if (action === "disconnect" || action === "leave") Net.disconnect();
        else if (action === "say" || action === "chat") Net.chat(args.slice(1).join(" "));
        else if (action === "status") notify("Reseau", [Net.state.status + " - " + (Net.state.url || "-")], "network");
        else if (action === "open") openScene();
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        sendPlayerState(false);
        sendNetworkPing(false);
        renderHud(this);
    };

    var _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        updateSpriteset(this);
    };

    Net.open = openScene;
    Net.localPlayerState = localPlayerState;
    Net.updateSpriteset = updateSpriteset;

    installCss();
    installMenuCommand();

    if (window.L3UI && L3UI.Scenes) {
        L3UI.Scenes.register("l3NetLobby", {
            title: config.menuLabel,
            render: renderNetScene,
            update: function(scene) {
                if (Input.isTriggered("cancel") || TouchInput.isCancelled()) SceneManager.pop();
                sendNetworkPing(false);
                if (Graphics.frameCount % 15 === 0 && scene) {
                    var signature = netSceneSignature();
                    if (scene._l3NetLastSignature !== signature) renderNetScene(scene);
                }
            }
        });
    }

    if (window.L3UI && L3UI.Services) L3UI.Services.register("net", Net);
    if (window.L3UI && L3UI.Plugins) {
        L3UI.Plugins.register(PLUGIN_NAME, {
            version: Net.version,
            title: "L3 Net Core",
            depends: ["L3_UICore"],
            provides: ["net", "net.players", "net.session"]
        });
    }

    if (config.autoConnect) {
        setTimeout(function() {
            Net.connect(config.defaultUrl);
        }, 500);
    }
})();
