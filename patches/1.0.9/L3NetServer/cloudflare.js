"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawn } = require("child_process");

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(__dirname, "..");
const port = Number(args.port || process.env.L3_NET_PORT || 7777);
const room = normalizeRoom(args.room || process.env.L3_NET_ROOM || "LOCAL");
const maxPlayers = clampMaxPlayers(args.maxPlayers || process.env.L3_NET_MAX_PLAYERS || 4);
const stateInterval = clampInterval(args.stateInterval || process.env.L3_NET_STATE_INTERVAL || 50, 25, 250);
const infoPath = path.join(__dirname, "remote-url.json");
const binDir = path.join(__dirname, "bin");

let serverProcess = null;
let tunnelProcess = null;
let tunnelDiscovered = false;
let tunnelReady = false;

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
            throw new Error("Un ancien serveur est actif avec seulement " + runningMaxPlayers + " joueur(s) max. Ferme-le puis relance.");
        }
        console.log("[L3Online] Serveur local deja actif sur le port " + port + ".");
    } else {
        await ensurePortFree(port);
        serverProcess = startServer();
        await waitForHealth(port, 8000);
    }

    const cloudflared = await ensureCloudflared();
    startTunnel(cloudflared);
}

function startServer() {
    const serverPath = path.join(__dirname, "server.js");
    const child = spawn(process.execPath, [
        serverPath,
        "--port", String(port),
        "--host", "127.0.0.1",
        "--room", room,
        "--max-players", String(maxPlayers),
        "--state-interval", String(stateInterval)
    ], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: false
    });

    child.stdout.on("data", function(data) {
        process.stdout.write(String(data));
    });

    child.stderr.on("data", function(data) {
        process.stderr.write(String(data));
    });

    child.on("exit", function(code) {
        if (code !== 0 && code !== null) console.error("[L3Online] Le serveur local s'est arrete avec le code " + code + ".");
    });

    return child;
}

function startTunnel(cloudflared) {
    try {
        if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);
    } catch (error) {
        // Le fichier sera remplace des que le tunnel sera pret.
    }

    console.log("[L3Online] Demarrage du tunnel Cloudflare...");

    tunnelProcess = spawn(cloudflared, [
        "tunnel",
        "--url", "http://127.0.0.1:" + port,
        "--no-autoupdate",
        "--loglevel", "info"
    ], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: false
    });

    function handleOutput(data) {
        const text = String(data);
        process.stdout.write(text);
        const match = text.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/i);
        if (match) prepareTunnelInfo(match[0]);
    }

    tunnelProcess.stdout.on("data", handleOutput);
    tunnelProcess.stderr.on("data", handleOutput);

    tunnelProcess.on("exit", function(code) {
        if (!tunnelReady) console.error("[L3Online] Le tunnel Cloudflare n'a pas pu demarrer.");
        else console.log("[L3Online] Tunnel Cloudflare ferme.");
        cleanup(false);
        process.exit(code || 0);
    });

    setTimeout(function() {
        if (!tunnelDiscovered) {
            console.error("[L3Online] Aucun lien Cloudflare recu. Verifie ta connexion Internet puis relance.");
        }
    }, 20000);

    setInterval(function() {
        httpGet("http://127.0.0.1:" + port + "/health", function(error) {
            if (!error) return;
            console.error("[L3Online] Le serveur local ne repond plus. Redemarre npm run net:online.");
            cleanup();
            process.exit(1);
        });
    }, 5000);
}

function prepareTunnelInfo(url) {
    if (tunnelDiscovered) return;
    tunnelDiscovered = true;
    writeTunnelInfo(url, false);
    console.log("[L3Online] Verification DNS et serveur en arriere-plan...");
    waitForPublicTunnel(url, 120000).then(function() {
        writeTunnelInfo(url, true);
    }).catch(function(error) {
        console.warn("[L3Online] DNS pas encore confirme : " + (error && error.message ? error.message : error));
        console.warn("[L3Online] Le lien reste valide, mais il peut demander quelques secondes de plus avant de repondre.");
    });
}

function writeTunnelInfo(url, verified) {
    const websocketUrl = url.replace(/^https:/, "wss:");
    const info = {
        ok: true,
        provider: "cloudflare",
        verified: !!verified,
        room,
        port,
        url,
        websocketUrl,
        joinUrl: withRoom(websocketUrl, room),
        createdAt: new Date().toISOString()
    };

    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), "utf8");

    if (!verified) {
        console.log("");
        console.log("[L3Online] Adresse generee");
        console.log("[L3Online] Adresse a envoyer : " + info.joinUrl);
        console.log("[L3Online] Code session       : " + room);
        console.log("[L3Online] Fichier jeu        : " + infoPath);
        console.log("[L3Online] Le jeu retentera automatiquement si le DNS Cloudflare n'est pas encore pret.");
        console.log("");
        return;
    }

    if (tunnelReady) return;
    tunnelReady = true;

    console.log("");
    console.log("[L3Online] Tunnel Cloudflare pret");
    console.log("[L3Online] Adresse a envoyer : " + info.joinUrl);
    console.log("[L3Online] Code session       : " + room);
    console.log("[L3Online] Fichier jeu        : " + infoPath);
    console.log("");
    console.log("Garde cette fenetre ouverte pendant la partie.");
    console.log("");
}

function waitForPublicTunnel(url, timeout) {
    const healthUrl = url.replace(/\/+$/, "") + "/health";
    const started = Date.now();
    let lastError = null;

    return new Promise(function(resolve, reject) {
        function tick() {
            httpsGetJson(healthUrl, function(error, data, statusCode) {
                if (!error && statusCode >= 200 && statusCode < 300 && data && data.ok) {
                    resolve();
                    return;
                }

                lastError = error || new Error("HTTP " + statusCode);
                if (Date.now() - started > timeout) {
                    reject(lastError || new Error("Tunnel non joignable."));
                    return;
                }
                setTimeout(tick, 1000);
            });
        }
        tick();
    });
}

async function ensureCloudflared() {
    const fromPath = await commandExists("cloudflared");
    if (fromPath) return "cloudflared";

    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    const target = cloudflaredPath();
    if (fs.existsSync(target)) return target;

    const url = cloudflaredDownloadUrl();
    if (!url) throw new Error("cloudflared n'est pas disponible pour cette plateforme.");

    console.log("[L3Online] Telechargement de cloudflared...");
    await downloadFile(url, target);
    try {
        fs.chmodSync(target, 0o755);
    } catch (error) {
        // Windows ignore ce chmod.
    }
    return target;
}

function cloudflaredPath() {
    if (process.platform === "win32") return path.join(binDir, "cloudflared.exe");
    return path.join(binDir, "cloudflared");
}

function cloudflaredDownloadUrl() {
    if (process.platform === "win32") return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
    if (process.platform === "darwin" && process.arch === "arm64") return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz";
    if (process.platform === "darwin") return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz";
    if (process.platform === "linux" && process.arch === "arm64") return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64";
    if (process.platform === "linux") return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";
    return "";
}

function downloadFile(url, target) {
    return new Promise(function(resolve, reject) {
        const file = fs.createWriteStream(target);
        https.get(url, function(response) {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlink(target, function() {});
                downloadFile(response.headers.location, target).then(resolve, reject);
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(target, function() {});
                reject(new Error("Telechargement impossible : HTTP " + response.statusCode));
                return;
            }
            response.pipe(file);
            file.on("finish", function() {
                file.close(resolve);
            });
        }).on("error", function(error) {
            file.close();
            fs.unlink(target, function() {});
            reject(error);
        });
    });
}

function commandExists(command) {
    return new Promise(function(resolve) {
        const child = spawn(command, ["--version"], { stdio: "ignore", windowsHide: true });
        child.on("error", function() {
            resolve(false);
        });
        child.on("exit", function(code) {
            resolve(code === 0);
        });
    });
}

function ensurePortFree(portNumber) {
    return new Promise(function(resolve, reject) {
        const net = require("net");
        const probe = net.createServer();
        probe.once("error", function(error) {
            if (error.code === "EADDRINUSE") reject(new Error("Le port " + portNumber + " est deja utilise. Ferme l'ancien serveur."));
            else reject(error);
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

function httpsGetJson(url, callback) {
    const req = https.get(url, function(res) {
        let body = "";
        res.on("data", function(chunk) {
            body += chunk;
        });
        res.on("end", function() {
            try {
                callback(null, JSON.parse(body), res.statusCode);
            } catch (error) {
                callback(error, null, res.statusCode);
            }
        });
    });
    req.on("error", callback);
    req.setTimeout(3000, function() {
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
        if (!next || next.indexOf("--") === 0) result[key] = true;
        else {
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

function clampInterval(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 50;
    return Math.max(min, Math.min(max, Math.floor(number)));
}

function withRoom(url, roomId) {
    if (/[?&]room=/.test(url)) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "room=" + encodeURIComponent(roomId);
}

function cleanup(closeTunnel) {
    if (closeTunnel !== false && tunnelProcess && !tunnelProcess.killed) {
        try {
            tunnelProcess.kill();
        } catch (error) {
            // Already stopped.
        }
    }

    if (serverProcess && !serverProcess.killed) {
        try {
            serverProcess.kill();
        } catch (error2) {
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
