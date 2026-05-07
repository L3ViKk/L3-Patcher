"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const localtunnel = require("localtunnel");

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(__dirname, "..");
const port = Number(args.port || process.env.L3_NET_PORT || 7777);
const room = normalizeRoom(args.room || process.env.L3_NET_ROOM || "LOCAL");
const maxPlayers = clampMaxPlayers(args.maxPlayers || process.env.L3_NET_MAX_PLAYERS || 4);
const subdomain = args.subdomain || process.env.L3_NET_SUBDOMAIN || "";
const infoPath = path.join(__dirname, "remote-url.json");

let serverProcess = null;
let tunnel = null;

main().catch(function(error) {
    console.error("[L3Online] " + (error && error.stack ? error.stack : error));
    cleanup();
    process.exit(1);
});

async function main() {
    const runningInfo = await serverInfo(port);
    if (runningInfo && runningInfo.ok) {
        const runningMaxPlayers = Number(runningInfo.maxPlayersPerRoom || 0);
        if (runningMaxPlayers && runningMaxPlayers < maxPlayers) {
            throw new Error(
                "Un ancien serveur est deja actif sur le port " + port +
                " avec seulement " + runningMaxPlayers + " joueur(s) max. " +
                "Ferme cette ancienne fenetre serveur puis relance npm run net:online."
            );
        }
        console.log("[L3Online] Serveur local deja actif sur le port " + port + ".");
    } else {
        await ensurePortFree(port);
        serverProcess = startServer();
        await waitForHealth(port, 8000);
    }

    tunnel = await localtunnel({
        port,
        local_host: "127.0.0.1",
        subdomain: subdomain || undefined
    });

    const websocketUrl = tunnel.url.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
    const info = {
        ok: true,
        room,
        port,
        url: tunnel.url,
        websocketUrl,
        joinUrl: withRoom(websocketUrl, room),
        createdAt: new Date().toISOString()
    };

    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), "utf8");

    console.log("");
    console.log("[L3Online] Tunnel pret");
    console.log("[L3Online] Adresse a envoyer : " + info.joinUrl);
    console.log("[L3Online] Code session       : " + room);
    console.log("[L3Online] Fichier jeu        : " + infoPath);
    console.log("");
    console.log("Garde cette fenetre ouverte pendant la partie.");
    console.log("");

    tunnel.on("close", function() {
        console.log("[L3Online] Tunnel ferme.");
        cleanup();
        process.exit(0);
    });

    setInterval(function() {
        httpGet("http://127.0.0.1:" + port + "/health", function(error) {
            if (!error) return;
            console.error("[L3Online] Le serveur local ne repond plus. Redemarre npm run net:online.");
            cleanup();
            process.exit(1);
        });
    }, 5000);
}

function startServer() {
    const serverPath = path.join(__dirname, "server.js");
    const child = spawn(process.execPath, [
        serverPath,
        "--port", String(port),
        "--host", "127.0.0.1",
        "--room", room,
        "--max-players", String(maxPlayers)
    ], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", function(data) {
        process.stdout.write(String(data));
    });

    child.stderr.on("data", function(data) {
        process.stderr.write(String(data));
    });

    child.on("exit", function(code) {
        if (code !== 0 && code !== null) {
            console.error("[L3Online] Le serveur local s'est arrete avec le code " + code + ".");
        }
    });

    return child;
}

function ensurePortFree(portNumber) {
    return new Promise(function(resolve, reject) {
        const net = require("net");
        const probe = net.createServer();
        probe.once("error", function(error) {
            if (error.code === "EADDRINUSE") {
                reject(new Error("Le port " + portNumber + " est deja utilise. Ferme l'ancien serveur ou change de port."));
            } else {
                reject(error);
            }
        });
        probe.once("listening", function() {
            probe.close(resolve);
        });
        probe.listen(portNumber, "127.0.0.1");
    });
}

function waitForHealth(portNumber, timeout) {
    const started = Date.now();
    return new Promise(function(resolve, reject) {
        function tick() {
            httpGet("http://127.0.0.1:" + portNumber + "/health", function(error) {
                if (!error) {
                    resolve();
                    return;
                }
                if (Date.now() - started > timeout) {
                    reject(new Error("Le serveur local n'a pas repondu sur /health."));
                    return;
                }
                setTimeout(tick, 200);
            });
        }
        tick();
    });
}

function isServerRunning(portNumber) {
    return new Promise(function(resolve) {
        httpGet("http://127.0.0.1:" + portNumber + "/health", function(error, statusCode) {
            resolve(!error && statusCode === 200);
        });
    });
}

function serverInfo(portNumber) {
    return new Promise(function(resolve) {
        httpGetJson("http://127.0.0.1:" + portNumber + "/health", function(error, data) {
            resolve(error ? null : data);
        });
    });
}

function httpGet(url, callback) {
    const http = require("http");
    const req = http.get(url, function(res) {
        res.resume();
        callback(null, res.statusCode);
    });
    req.on("error", callback);
    req.setTimeout(1200, function() {
        req.destroy(new Error("timeout"));
    });
}

function httpGetJson(url, callback) {
    const http = require("http");
    const req = http.get(url, function(res) {
        let body = "";
        res.on("data", function(chunk) {
            body += chunk;
        });
        res.on("end", function() {
            try {
                callback(null, JSON.parse(body));
            } catch (error) {
                callback(error);
            }
        });
    });
    req.on("error", callback);
    req.setTimeout(1200, function() {
        req.destroy(new Error("timeout"));
    });
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

function normalizeRoom(value) {
    return String(value || "LOCAL").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24) || "LOCAL";
}

function clampMaxPlayers(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 4;
    return Math.max(2, Math.min(4, Math.floor(number)));
}

function withRoom(url, roomId) {
    if (/[?&]room=/.test(url)) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "room=" + encodeURIComponent(roomId);
}

function cleanup() {
    if (tunnel && tunnel.close) {
        try {
            tunnel.close();
        } catch (error) {
            // Already closed.
        }
    }

    if (serverProcess && !serverProcess.killed) {
        try {
            serverProcess.kill();
        } catch (error) {
            // Already stopped.
        }
    }
}

process.on("SIGINT", function() {
    cleanup();
    process.exit(0);
});

process.on("SIGTERM", function() {
    cleanup();
    process.exit(0);
});
