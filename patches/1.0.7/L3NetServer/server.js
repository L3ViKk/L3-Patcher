"use strict";

const http = require("http");
const os = require("os");
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

const clients = new Map();
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
    console.log("[L3Net] Server ready");
    console.log("[L3Net] Local:  ws://127.0.0.1:" + port + "?room=" + defaultRoomId);
    getLanAddresses().forEach(function(address) {
        console.log("[L3Net] LAN:    ws://" + address + ":" + port + "?room=" + defaultRoomId);
    });
    if (publicUrl) {
        console.log("[L3Net] Remote: " + withRoom(publicUrl, defaultRoomId));
    } else {
        console.log("[L3Net] Remote: ws://VOTRE-IP-PUBLIQUE:" + port + "?room=" + defaultRoomId);
    }
    console.log("[L3Net] Rooms:  default=" + defaultRoomId + " maxPlayers=" + maxPlayersPerRoom + " stateTick=" + stateBroadcastInterval + "ms");
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
            players: publicPlayers(client)
        });
        broadcastToRoom(client.roomId, "playerJoined", publicPlayer(client), client.id);
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
        log("rename", client.id, client.name, "room=" + client.roomId);
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
            players: publicPlayers(client)
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
            players: publicPlayers(client)
        });
        broadcastToRoom(client.roomId, "playerJoined", publicPlayer(client), client.id);
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

    if (roomPlayers.length >= maxPlayersPerRoom) {
        log("room full", client.id, "room=" + nextRoom, "players=" + roomPlayers.length, "max=" + maxPlayersPerRoom);
        send(client, "error", {
            code: "room_full",
            message: "La session " + nextRoom + " est pleine.",
            roomId: nextRoom,
            maxPlayers: maxPlayersPerRoom
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
    return {
        playerId: client.id,
        name: client.name,
        roomId: client.roomId,
        joinedAt: client.joinedAt,
        ready: client.ready,
        state: client.state
    };
}

function roomSummary() {
    const rooms = {};
    clients.forEach(function(client) {
        const id = client.roomId || defaultRoomId;
        if (!rooms[id]) rooms[id] = { roomId: id, players: 0, ready: 0 };
        rooms[id].players += 1;
        if (client.ready) rooms[id].ready += 1;
    });
    return Object.keys(rooms).sort().map(function(id) {
        return rooms[id];
    });
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
