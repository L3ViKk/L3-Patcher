"use strict";

const http = require("http");
const { WebSocket } = require("ws");

const args = parseArgs(process.argv.slice(2));
const url = String(args.url || "http://127.0.0.1:7777/health");
const wsUrl = String(args.ws || "ws://127.0.0.1:7777?room=CHECK");
const clients = Math.max(1, Math.min(4, Number(args.clients || 1)));

checkHealth(url)
    .then(function(data) {
        console.log("[L3Check] HTTP OK");
        console.log(JSON.stringify(data, null, 2));
        return checkWebSocket(wsUrl, clients);
    })
    .then(function(data) {
        console.log("[L3Check] WebSocket OK");
        console.log(JSON.stringify(data, null, 2));
    })
    .catch(function(error) {
        console.error("[L3Check] " + (error && error.message ? error.message : error));
        process.exit(1);
    });

function checkHealth(target) {
    return new Promise(function(resolve, reject) {
        const req = http.get(target, function(res) {
            let body = "";
            res.on("data", function(chunk) {
                body += chunk;
            });
            res.on("end", function() {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error("Reponse HTTP non JSON : " + body.slice(0, 120)));
                }
            });
        });
        req.on("error", function(error) {
            reject(new Error("HTTP refuse ou inaccessible : " + error.message));
        });
        req.setTimeout(3000, function() {
            req.destroy(new Error("timeout"));
        });
    });
}

function checkWebSocket(target, count) {
    return new Promise(function(resolve, reject) {
        const sockets = [];
        const sessions = [];
        const timeout = setTimeout(function() {
            sockets.forEach(closeSocket);
            reject(new Error("WebSocket timeout avec " + count + " client(s)."));
        }, 4000);

        for (let i = 0; i < count; i += 1) {
            const socket = new WebSocket(target);
            sockets.push(socket);

            socket.on("message", function(raw) {
                const message = JSON.parse(String(raw));
                if (message.type === "welcome") {
                    socket.send(JSON.stringify({ type: "hello", data: { name: "L3Check" + (i + 1), roomId: "CHECK" } }));
                }
                if (message.type === "session") {
                    sessions[i] = {
                        playerId: message.data.playerId,
                        roomId: message.data.roomId,
                        players: message.data.players.length
                    };
                    if (sessions.filter(Boolean).length >= count) {
                        clearTimeout(timeout);
                        sockets.forEach(closeSocket);
                        resolve({
                            clients: count,
                            sessions
                        });
                    }
                }
                if (message.type === "error") {
                    clearTimeout(timeout);
                    sockets.forEach(closeSocket);
                    reject(new Error(message.data && message.data.message ? message.data.message : "Erreur serveur."));
                }
            });

            socket.on("error", function(error) {
                clearTimeout(timeout);
                sockets.forEach(closeSocket);
                reject(new Error("WebSocket refuse ou inaccessible : " + error.message));
            });
        }

        function closeSocket(socket) {
            try {
                socket.close();
            } catch (error) {
                // Closing anyway.
            }
        }
    });
}

function parseArgs(list) {
    const result = {};
    for (let i = 0; i < list.length; i += 1) {
        const part = list[i];
        if (part.indexOf("--") !== 0) continue;
        const key = part.slice(2);
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
