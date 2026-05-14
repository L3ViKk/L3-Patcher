"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { WebSocketServer } = require("ws");

const DEFAULT_PORT = 7777;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_ROOM = "LOCAL";
const SERVER_VERSION = "0.5.1";

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || process.env.L3_NET_PORT || process.env.PORT || DEFAULT_PORT);
const host = String(args.host || process.env.L3_NET_HOST || DEFAULT_HOST);
const defaultRoomId = normalizeRoom(args.room || process.env.L3_NET_ROOM || DEFAULT_ROOM);
const maxPlayersPerRoom = clampMaxPlayers(args.maxPlayers || process.env.L3_NET_MAX_PLAYERS || 4);
const stateBroadcastInterval = clampInterval(args.stateInterval || process.env.L3_NET_STATE_INTERVAL || 50, 25, 250);
const publicUrl = String(args.publicUrl || process.env.L3_NET_PUBLIC_URL || "");
const infoPath = path.join(__dirname, "remote-url.json");

const clients = new Map();
const rooms = new Map();
let nextPlayerNumber = 1;

const server = http.createServer(function(req, res) {
    if (req.url === "/health") {
        writeJson(res, 200, {
            ok: true,
            version: SERVER_VERSION,
            defaultRoomId,
            maxPlayersPerRoom,
            stateBroadcastInterval,
            players: clients.size,
            rooms: roomSummary(),
            uptime: Math.round(process.uptime())
        });
        return;
    }

    if (req.url === "/rooms") {
        writeJson(res, 200, {
            ok: true,
            rooms: roomSummary()
        });
        return;
    }

    writeJson(res, 404, { ok: false, error: "not_found" });
});

const wss = new WebSocketServer({ server, perMessageDeflate: false });

wss.on("connection", function(socket, request) {
    try {
        if (request.socket && request.socket.setNoDelay) request.socket.setNoDelay(true);
    } catch (error) {
        // Le serveur reste utilisable meme si la plateforme refuse ce reglage.
    }

    const id = makePlayerId();
    const query = requestQuery(request);
    const remoteAddress = request.socket && request.socket.remoteAddress ? request.socket.remoteAddress : "unknown";
    const client = {
        id,
        socket,
        name: "Joueur " + nextPlayerNumber,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        roomId: normalizeRoom(query.room || defaultRoomId),
        address: remoteAddress,
        state: null,
        ready: false,
        lobbyReady: false,
        client: {}
    };

    clients.set(id, client);
    nextPlayerNumber += 1;

    send(client, "welcome", {
        playerId: id,
        roomId: client.roomId,
        defaultRoomId,
        maxPlayersPerRoom,
        serverVersion: SERVER_VERSION
    });

    socket.on("message", function(raw) {
        handleMessage(client, raw);
    });

    socket.on("pong", function() {
        client.lastSeen = Date.now();
    });

    socket.on("close", function() {
        leaveClient(client);
    });

    socket.on("error", function(error) {
        log("socket error", id, error && error.message ? error.message : error);
    });

    log("joined", id, remoteAddress, "room=" + client.roomId);
});

const heartbeat = setInterval(function() {
    const now = Date.now();
    clients.forEach(function(client) {
        if (now - client.lastSeen > 30000) {
            try {
                client.socket.terminate();
            } catch (error) {
                // Socket already gone.
            }
            leaveClient(client);
            return;
        }

        if (client.socket.readyState === client.socket.OPEN) {
            try {
                client.socket.ping();
            } catch (error) {
                log("ping failed", client.id, error && error.message ? error.message : error);
            }
        }
    });
}, 10000);

const stateBroadcast = setInterval(function() {
    const now = Date.now();
    clients.forEach(function(client) {
        if (!client.ready || !client.state || !client.stateDirty) return;
        client.stateDirty = false;
        client.lastStateBroadcastAt = now;
        broadcastToRoom(client.roomId, "playerState", {
            playerId: client.id,
            name: client.name,
            roomId: client.roomId,
            state: client.state,
            time: now
        }, client.id);
    });
}, stateBroadcastInterval);

server.listen(port, host, function() {
    const lanAddresses = getLanAddresses();
    console.log("[L3Net] Server ready");
    console.log("[L3Net] Local:  ws://127.0.0.1:" + port + "?room=" + defaultRoomId);
    lanAddresses.forEach(function(address) {
        console.log("[L3Net] LAN:    ws://" + address + ":" + port + "?room=" + defaultRoomId);
    });
    console.log("[L3Net] Rooms:  default=" + defaultRoomId + " maxPlayers=" + maxPlayersPerRoom + " stateTick=" + stateBroadcastInterval + "ms");

    resolvePublicUrl().then(function(remoteUrl) {
        const written = writeDirectInfo(remoteUrl, lanAddresses);
        if (remoteUrl) console.log("[L3Net] Remote: " + withRoom(remoteUrl, defaultRoomId));
        else console.log("[L3Net] Remote: ws://VOTRE-IP-PUBLIQUE:" + port + "?room=" + defaultRoomId);
        console.log("[L3Net] Fichier jeu: " + written);
    }).catch(function(error) {
        writeDirectInfo("", lanAddresses);
        console.log("[L3Net] Remote: ws://VOTRE-IP-PUBLIQUE:" + port + "?room=" + defaultRoomId);
        console.log("[L3Net] IP publique non detectee: " + (error && error.message ? error.message : error));
    });
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function handleMessage(client, raw) {
    client.lastSeen = Date.now();

    let message;
    try {
        message = JSON.parse(String(raw));
    } catch (error) {
        send(client, "error", { code: "bad_json", message: "Message JSON invalide." });
        return;
    }

    const type = String(message.type || "");
    const data = message.data || {};

    if (!type) {
        send(client, "error", { code: "missing_type", message: "Type de paquet manquant." });
        return;
    }

    if (type === "hello") {
        const wantedRoom = normalizeRoom(data.roomId || data.room || client.roomId || defaultRoomId);
        if (!joinRoom(client, wantedRoom)) return;
        client.name = cleanName(data.name) || client.name;
        client.client = sanitizeObject(data.client);
        client.ready = true;
        send(client, "session", {
            playerId: client.id,
            roomId: client.roomId,
            maxPlayers: maxPlayersPerRoom,
            players: publicPlayers(client),
            room: publicRoom(client.roomId)
        });
        broadcastToRoom(client.roomId, "playerJoined", publicPlayer(client), client.id);
        broadcastRoomUpdated(client.roomId);
        log("hello", client.id, client.name, "room=" + client.roomId);
        return;
    }

    if (!client.ready) {
        send(client, "error", { code: "not_ready", message: "Envoyez hello avant les paquets de jeu." });
        return;
    }

    if (type === "playerState") {
        client.state = sanitizeObject(data);
        client.stateDirty = true;
        return;
    }

    if (type === "playerMove") {
        const state = sanitizeObject(data);
        client.state = Object.assign({}, client.state || {}, state);
        client.stateDirty = true;
        broadcastToRoom(client.roomId, "playerMove", {
            playerId: client.id,
            name: client.name,
            roomId: client.roomId,
            state,
            time: Date.now()
        }, client.id);
        return;
    }

    if (type === "chat") {
        const text = String(data.text || "").slice(0, 280);
        if (text) {
            broadcastToRoom(client.roomId, "chat", {
                playerId: client.id,
                name: client.name,
                roomId: client.roomId,
                text,
                time: Date.now()
            });
        }
        return;
    }

    if (type === "rename") {
        const nextName = cleanName(data.name);
        if (!nextName) {
            send(client, "error", { code: "bad_name", message: "Nom de joueur invalide." });
            return;
        }
        client.name = nextName;
        send(client, "nameChanged", {
            playerId: client.id,
            name: client.name,
            roomId: client.roomId,
            time: Date.now()
        });
        broadcastToRoom(client.roomId, "playerRenamed", {
            playerId: client.id,
            name: client.name,
            roomId: client.roomId,
            time: Date.now()
        }, client.id);
        updateHostName(client);
        broadcastRoomUpdated(client.roomId);
        log("rename", client.id, client.name, "room=" + client.roomId);
        return;
    }

    if (type === "hostRoom") {
        registerRoom(client, data);
        send(client, "roomUpdated", publicRoom(client.roomId));
        broadcastRoomUpdated(client.roomId, client.id);
        return;
    }

    if (type === "setReady") {
        client.lobbyReady = data.ready === true || data.ready === "true" || data.ready === 1;
        broadcastRoomUpdated(client.roomId);
        return;
    }

    if (type === "startGame") {
        const room = rooms.get(client.roomId);
        if (room && room.hostId && room.hostId !== client.id) {
            send(client, "error", { code: "not_host", message: "Seul l'hote peut lancer la partie." });
            return;
        }
        if (room) {
            room.status = "in_game";
            room.startedAt = Date.now();
            room.updatedAt = Date.now();
        }
        broadcastToRoom(client.roomId, "gameStart", {
            roomId: client.roomId,
            hostId: client.id,
            mapId: Number(data.mapId || data.startMapId || 0),
            x: Number(data.x || data.startX || 0),
            y: Number(data.y || data.startY || 0),
            time: Date.now()
        });
        broadcastRoomUpdated(client.roomId);
        log("startGame", client.id, client.name, "room=" + client.roomId);
        return;
    }

    if (type === "ping") {
        send(client, "pong", { time: Date.now(), roomId: client.roomId, echo: data });
        return;
    }

    if (type === "requestSession") {
        send(client, "session", {
            playerId: client.id,
            roomId: client.roomId,
            maxPlayers: maxPlayersPerRoom,
            players: publicPlayers(client),
            room: publicRoom(client.roomId)
        });
        return;
    }

    if (type === "changeRoom") {
        const nextRoom = normalizeRoom(data.roomId || data.room || defaultRoomId);
        if (!joinRoom(client, nextRoom)) return;
        send(client, "session", {
            playerId: client.id,
            roomId: client.roomId,
            maxPlayers: maxPlayersPerRoom,
            players: publicPlayers(client),
            room: publicRoom(client.roomId)
        });
        broadcastToRoom(client.roomId, "playerJoined", publicPlayer(client), client.id);
        broadcastRoomUpdated(client.roomId);
        return;
    }

    if (type.indexOf("l3:") === 0 || type.indexOf("game:") === 0) {
        broadcastToRoom(client.roomId, type, {
            playerId: client.id,
            name: client.name,
            roomId: client.roomId,
            data: sanitizeObject(data),
            time: Date.now()
        }, data.echo === true ? null : client.id);
        return;
    }

    send(client, "error", {
        code: "unknown_type",
        message: "Type de paquet non gere : " + type
    });
}

function joinRoom(client, nextRoom) {
    nextRoom = normalizeRoom(nextRoom || defaultRoomId);
    const currentRoom = client.roomId;
    const roomPlayers = roomClients(nextRoom).filter(function(other) {
        return other.id !== client.id && other.ready;
    });
    const maxPlayers = roomMaxPlayers(nextRoom);

    if (roomPlayers.length >= maxPlayers) {
        log("room full", client.id, "room=" + nextRoom, "players=" + roomPlayers.length, "max=" + maxPlayers);
        send(client, "error", {
            code: "room_full",
            message: "La session " + nextRoom + " est pleine.",
            roomId: nextRoom,
            maxPlayers
        });
        return false;
    }

    if (client.ready && currentRoom && currentRoom !== nextRoom) {
        broadcastToRoom(currentRoom, "playerLeft", {
            playerId: client.id,
            name: client.name,
            roomId: currentRoom
        }, client.id);
    }

    client.roomId = nextRoom;
    return true;
}

function leaveClient(client) {
    if (!client || !clients.has(client.id)) return;
    clients.delete(client.id);
    if (client.ready) {
        broadcastToRoom(client.roomId, "playerLeft", {
            playerId: client.id,
            name: client.name,
            roomId: client.roomId
        }, client.id);
        updateRoomHostAfterLeave(client);
        broadcastRoomUpdated(client.roomId);
    }
    log("left", client.id, client.name, "room=" + client.roomId);
}

function send(client, type, data) {
    if (!client || !client.socket || client.socket.readyState !== client.socket.OPEN) return false;
    try {
        client.socket.send(JSON.stringify({
            type,
            data: data || {},
            serverTime: Date.now()
        }));
        return true;
    } catch (error) {
        log("send failed", client.id, error && error.message ? error.message : error);
        return false;
    }
}

function broadcastToRoom(roomId, type, data, exceptId) {
    clients.forEach(function(client) {
        if (client.roomId !== roomId) return;
        if (exceptId && client.id === exceptId) return;
        if (!client.ready && type !== "serverClosing") return;
        send(client, type, data);
    });
}

function roomClients(roomId) {
    const result = [];
    clients.forEach(function(client) {
        if (client.roomId === roomId) result.push(client);
    });
    return result;
}

function publicPlayers(client) {
    const result = [];
    clients.forEach(function(other) {
        if (other.id === client.id || other.roomId !== client.roomId || !other.ready) return;
        result.push(publicPlayer(other));
    });
    return result;
}

function publicPlayer(client) {
    const room = rooms.get(client.roomId);
    return {
        playerId: client.id,
        name: client.name,
        roomId: client.roomId,
        joinedAt: client.joinedAt,
        ready: client.ready,
        lobbyReady: client.lobbyReady,
        isHost: !!(room && room.hostId === client.id),
        state: client.state
    };
}

function roomSummary() {
    const summaries = {};
    clients.forEach(function(client) {
        const id = client.roomId || defaultRoomId;
        if (!summaries[id]) summaries[id] = emptyRoomSummary(id);
        summaries[id].players += client.ready ? 1 : 0;
        if (client.ready) summaries[id].ready += 1;
    });
    rooms.forEach(function(room, id) {
        if (!summaries[id]) summaries[id] = emptyRoomSummary(id);
        mergeRoomSummary(summaries[id], room);
    });
    return Object.keys(summaries).sort().map(function(id) {
        const room = summaries[id];
        room.slots = Math.max(0, Number(room.maxPlayers || maxPlayersPerRoom) - Number(room.players || 0));
        return room;
    });
}

function emptyRoomSummary(roomId) {
    return {
        roomId,
        title: roomId,
        hostName: "",
        hostId: "",
        status: "waiting",
        maxPlayers: maxPlayersPerRoom,
        players: 0,
        ready: 0,
        slots: maxPlayersPerRoom,
        private: false,
        createdAt: 0,
        updatedAt: 0,
        startedAt: 0
    };
}

function mergeRoomSummary(summary, room) {
    summary.title = room.title || summary.title || room.roomId;
    summary.hostName = room.hostName || summary.hostName || "";
    summary.hostId = room.hostId || summary.hostId || "";
    summary.status = room.status || summary.status || "waiting";
    summary.maxPlayers = room.maxPlayers || summary.maxPlayers || maxPlayersPerRoom;
    summary.private = !!room.private;
    summary.createdAt = room.createdAt || summary.createdAt || 0;
    summary.updatedAt = room.updatedAt || summary.updatedAt || 0;
    summary.startedAt = room.startedAt || summary.startedAt || 0;
}

function publicRoom(roomId) {
    roomId = normalizeRoom(roomId || defaultRoomId);
    const summary = emptyRoomSummary(roomId);
    const meta = rooms.get(roomId);
    if (meta) mergeRoomSummary(summary, meta);
    roomClients(roomId).forEach(function(client) {
        if (client.ready) summary.players += 1;
        if (client.lobbyReady) summary.ready += 1;
    });
    summary.slots = Math.max(0, Number(summary.maxPlayers || maxPlayersPerRoom) - Number(summary.players || 0));
    summary.playersList = roomClients(roomId).filter(function(client) {
        return client.ready;
    }).map(publicPlayer);
    return summary;
}

function roomMaxPlayers(roomId) {
    const meta = rooms.get(normalizeRoom(roomId || defaultRoomId));
    return clampMaxPlayers(meta && meta.maxPlayers ? meta.maxPlayers : maxPlayersPerRoom);
}

function registerRoom(client, data) {
    const roomId = client.roomId || defaultRoomId;
    const now = Date.now();
    const previous = rooms.get(roomId) || {};
    const title = cleanTitle(data.title || data.name || previous.title || (client.name + " - Partie"));
    const maxPlayers = clampMaxPlayers(data.maxPlayers || previous.maxPlayers || maxPlayersPerRoom);
    rooms.set(roomId, {
        roomId,
        title,
        hostId: previous.hostId || client.id,
        hostName: client.name,
        status: previous.status === "in_game" ? "waiting" : (data.status || previous.status || "waiting"),
        maxPlayers,
        private: data.private === true || data.private === "true",
        createdAt: previous.createdAt || now,
        updatedAt: now,
        startedAt: 0
    });
    client.lobbyReady = true;
    log("hostRoom", client.id, title, "room=" + roomId, "max=" + maxPlayers);
}

function updateHostName(client) {
    const room = rooms.get(client.roomId);
    if (!room || room.hostId !== client.id) return;
    room.hostName = client.name;
    room.updatedAt = Date.now();
}

function updateRoomHostAfterLeave(client) {
    const room = rooms.get(client.roomId);
    if (!room || room.hostId !== client.id) return;
    const nextHost = roomClients(client.roomId).filter(function(other) {
        return other.ready;
    })[0];
    if (!nextHost) {
        rooms.delete(client.roomId);
        return;
    }
    room.hostId = nextHost.id;
    room.hostName = nextHost.name;
    room.updatedAt = Date.now();
}

function broadcastRoomUpdated(roomId, exceptId) {
    const room = publicRoom(roomId);
    broadcastToRoom(roomId, "roomUpdated", room, exceptId);
}

function requestQuery(request) {
    try {
        const url = new URL(request.url || "/", "ws://localhost");
        return {
            room: url.searchParams.get("room") || "",
            name: url.searchParams.get("name") || ""
        };
    } catch (error) {
        return {};
    }
}

function sanitizeObject(value) {
    if (!value || typeof value !== "object") return {};
    return JSON.parse(JSON.stringify(value));
}

function cleanName(name) {
    return String(name || "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function cleanTitle(title) {
    return String(title || "").trim().replace(/\s+/g, " ").slice(0, 48);
}

function clampMaxPlayers(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 4;
    return Math.max(2, Math.min(4, Math.floor(number)));
}

function clampInterval(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 50;
    return Math.max(min, Math.min(max, Math.floor(number)));
}

function normalizeRoom(room) {
    const value = String(room || DEFAULT_ROOM).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    return (value || DEFAULT_ROOM).slice(0, 24);
}

function makePlayerId() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseArgs(list) {
    const result = {};
    for (let i = 0; i < list.length; i += 1) {
        const part = list[i];
        if (part.indexOf("--") !== 0) continue;
        const key = part.slice(2).replace(/-([a-z])/g, function(_, char) {
            return char.toUpperCase();
        });
        const next = list[i + 1];
        if (!next || next.indexOf("--") === 0) {
            result[key] = true;
        } else {
            result[key] = next;
            i += 1;
        }
    }
    return result;
}

function getLanAddresses() {
    const result = [];
    const nets = os.networkInterfaces();
    Object.keys(nets).forEach(function(name) {
        nets[name].forEach(function(net) {
            if (net.family === "IPv4" && !net.internal) result.push(net.address);
        });
    });
    return result;
}

function resolvePublicUrl() {
    if (publicUrl) return Promise.resolve(cleanWsPublicUrl(publicUrl));
    if (args.noPublicUrl || process.env.L3_NET_NO_PUBLIC_URL === "1") return Promise.resolve("");

    return fetchPublicIp("https://api.ipify.org").then(function(ip) {
        return ip ? "ws://" + ip + ":" + port : "";
    }).catch(function() {
        return fetchPublicIp("https://ifconfig.me/ip").then(function(ip) {
            return ip ? "ws://" + ip + ":" + port : "";
        });
    });
}

function fetchPublicIp(url) {
    return new Promise(function(resolve, reject) {
        const req = https.get(url, { timeout: 5000 }, function(res) {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", function(chunk) {
                body += chunk;
                if (body.length > 128) req.destroy();
            });
            res.on("end", function() {
                const ip = String(body || "").trim();
                if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) resolve(ip);
                else reject(new Error("Reponse IP publique invalide."));
            });
        });
        req.on("timeout", function() {
            req.destroy(new Error("Timeout IP publique."));
        });
        req.on("error", reject);
    });
}

function cleanWsPublicUrl(url) {
    url = String(url || "").trim();
    if (!url) return "";
    if (url.indexOf("ws://") !== 0 && url.indexOf("wss://") !== 0) url = "ws://" + url;
    return url.replace(/\?room=.*$/, "").replace(/\/$/, "");
}

function writeDirectInfo(remoteUrl, lanAddresses) {
    const localUrl = "ws://127.0.0.1:" + port;
    const lanUrls = lanAddresses.map(function(address) {
        return "ws://" + address + ":" + port;
    });
    const websocketUrl = remoteUrl || lanUrls[0] || localUrl;
    const info = {
        provider: "direct",
        createdAt: new Date().toISOString(),
        room: defaultRoomId,
        websocketUrl,
        joinUrl: withRoom(websocketUrl, defaultRoomId),
        hostUrl: localUrl,
        localUrl,
        lanUrl: lanUrls[0] || "",
        lanUrls,
        publicUrl: remoteUrl || "",
        port,
        maxPlayers: maxPlayersPerRoom,
        stateInterval: stateBroadcastInterval
    };
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), "utf8");
    return infoPath;
}

function withRoom(url, roomId) {
    if (!url) return "";
    const separator = url.indexOf("?") === -1 ? "?" : "&";
    if (/[?&]room=/.test(url)) return url;
    return url + separator + "room=" + encodeURIComponent(roomId);
}

function writeJson(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify(data));
}

function shutdown() {
    clearInterval(heartbeat);
    clearInterval(stateBroadcast);
    clients.forEach(function(client) {
        try {
            send(client, "serverClosing", { reason: "shutdown" });
            client.socket.close(1001, "Server shutdown");
        } catch (error) {
            // Closing anyway.
        }
    });
    server.close(function() {
        process.exit(0);
    });
}

function log() {
    const parts = Array.prototype.slice.call(arguments);
    console.log("[L3Net]", new Date().toISOString(), parts.join(" "));
}
