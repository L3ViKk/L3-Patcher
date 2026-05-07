/*:
 * @plugindesc L3 UI Core v1.0 - Couche HTML/CSS moderne pour RPG Maker MV.
 * @author L3ViKk
 * @version 1.0.0
 *
 * @param Enabled
 * @text Activer le framework
 * @type boolean
 * @default true
 *
 * @param Load Utility CSS
 * @text Charger les classes utilitaires
 * @type boolean
 * @default true
 *
 * @param Utility CSS File
 * @text Fichier utilitaire
 * @type text
 * @default css/l3-tailwind.css
 *
 * @param Custom CSS File
 * @text Fichier CSS custom
 * @type text
 * @default css/l3-ui.css
 *
 * @param Default Theme
 * @text Theme par defaut
 * @type text
 * @default midnight
 *
 * @param Default Z Index
 * @text Z-index de base
 * @type number
 * @default 9000
 *
 * @param Debug
 * @text Debug
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * L3 UI Core
 * ============================================================================
 *
 * Base commune pour creer des interfaces HTML/CSS propres dans RPG Maker MV.
 * Le plugin ne remplace aucune scene tout seul : il fournit l'API, les themes,
 * les composants, la navigation clavier/manette/souris et la gestion des
 * fenetres. Les plugins de menu viennent ensuite se brancher dessus.
 *
 * API principale :
 *
 *   L3UI.createWindow(id, options)
 *   L3UI.removeWindow(id)
 *   L3UI.addStyle(selector, styles)
 *   L3UI.Theme.set("midnight")
 *   L3UI.Components.Button(options)
 *   L3UI.Components.CommandList(options)
 *   L3UI.Focus.createGroup(id, options)
 *   L3UI.Plugins.register(id, setup)
 *   L3UI.Services.register(id, api)
 *   L3UI.Slots.add(area, id, data)
 *   L3UI.Hooks.after("Scene_Map.prototype", "start", id, callback)
 *   L3UI.Scenes.register(id, setup)
 *
 * Exemple de plugin compatible :
 *
 *   L3UI.Plugins.register("MyQuestMenu", {
 *       version: "1.0.0",
 *       depends: ["L3_UICore"],
 *       init: function(api) {
 *           api.Slots.add("menu.commands", "quests", {
 *               label: "Quetes",
 *               icon: "!",
 *               order: 35,
 *               handler: function() {
 *                   api.Scenes.push("quests");
 *               }
 *           });
 *
 *           api.Scenes.register("quests", {
 *               title: "Quetes",
 *               render: function(scene) {
 *                   return api.Components.Panel({
 *                       kicker: "Journal",
 *                       title: "Quetes",
 *                       content: "A remplir par ton plugin."
 *                   });
 *               }
 *           });
 *       }
 *   });
 *
 * Chargez ce plugin avant les autres plugins L3_UI.
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_UICore";
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
        loadUtilityCss: readBool("Load Utility CSS", true),
        utilityCssFile: readText("Utility CSS File", "css/l3-tailwind.css"),
        customCssFile: readText("Custom CSS File", "css/l3-ui.css"),
        defaultTheme: readText("Default Theme", "midnight"),
        defaultZIndex: readNumber("Default Z Index", 9000),
        debug: readBool("Debug", false)
    };

    var L3UI = window.L3UI || {};
    window.L3UI = L3UI;

    L3UI.version = "1.0.0";
    L3UI.enabled = config.enabled;
    L3UI.config = config;
    L3UI._styles = L3UI._styles || {};
    L3UI._windows = L3UI._windows || {};
    L3UI._sceneLayers = L3UI._sceneLayers || [];
    L3UI._stylesheetLinks = L3UI._stylesheetLinks || {};
    L3UI._ready = false;
    L3UI._readyCallbacks = L3UI._readyCallbacks || [];
    L3UI._modalBlockCount = L3UI._modalBlockCount || 0;

    if (!config.enabled) return;

    function log() {
        if (config.debug && window.console && console.log) {
            console.log.apply(console, arguments);
        }
    }

    function warn() {
        if (window.console && console.warn) {
            console.warn.apply(console, arguments);
        }
    }

    function stopUiInput(event) {
        if (!event) return;
        if (event.stopPropagation) event.stopPropagation();
    }

    function bindInputBlockers(element) {
        if (!element || !element.addEventListener) return;
        var events = ["mousedown", "mouseup", "click", "dblclick", "touchstart", "touchmove", "touchend", "pointerdown", "pointerup", "contextmenu"];
        for (var i = 0; i < events.length; i++) {
            element.addEventListener(events[i], stopUiInput, false);
        }
    }

    function clearRuntimeInput() {
        if (window.TouchInput && TouchInput.clear) TouchInput.clear();
        if (window.Input && Input.clear) Input.clear();
    }

    function safeCall(owner, callback, args) {
        if (typeof callback !== "function") return undefined;
        try {
            return callback.apply(owner || null, args || []);
        } catch (error) {
            warn("[L3UI] Erreur dans une extension :", error);
            return undefined;
        }
    }

    function compareVersions(a, b) {
        var left = String(a || "0").split(".");
        var right = String(b || "0").split(".");
        var length = Math.max(left.length, right.length);
        for (var i = 0; i < length; i++) {
            var l = Number(left[i] || 0);
            var r = Number(right[i] || 0);
            if (l > r) return 1;
            if (l < r) return -1;
        }
        return 0;
    }

    function toCssValue(value) {
        if (typeof value === "number") return value + "px";
        return String(value);
    }

    function applyStyles(element, styles) {
        if (!element || !styles) return element;
        for (var key in styles) {
            if (styles.hasOwnProperty(key)) {
                element.style[key] = styles[key];
            }
        }
        return element;
    }

    function styleObjectToCss(styles) {
        var css = "";
        for (var key in styles) {
            if (styles.hasOwnProperty(key)) {
                var cssKey = key.replace(/[A-Z]/g, function(match) {
                    return "-" + match.toLowerCase();
                });
                css += cssKey + ":" + styles[key] + ";";
            }
        }
        return css;
    }

    function normalizePath(path) {
        return String(path || "").replace(/\\/g, "/");
    }

    function sceneName(scene) {
        if (!scene || !scene.constructor) return "Scene";
        return scene.constructor.name || "Scene";
    }

    function isWindow(value) {
        return typeof Window_Base !== "undefined" && value instanceof Window_Base;
    }

    function paramSource(source) {
        if (typeof source === "string") return PluginManager.parameters(source) || {};
        return source || {};
    }

    L3UI.escapeHtml = function(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    L3UI.clamp = function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    };

    L3UI.formatNumber = function(value) {
        var number = Number(value || 0);
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    L3UI.isReady = function() {
        return !!L3UI._ready;
    };

    L3UI.isModalBlocking = function() {
        return (L3UI._modalBlockCount || 0) > 0;
    };

    L3UI.ready = function(callback) {
        if (typeof callback !== "function") return;
        if (L3UI._ready) {
            safeCall(L3UI, callback, [L3UI]);
        } else {
            L3UI._readyCallbacks.push(callback);
        }
    };

    L3UI._flushReady = function() {
        var callbacks = L3UI._readyCallbacks.slice();
        L3UI._readyCallbacks.length = 0;
        for (var i = 0; i < callbacks.length; i++) {
            safeCall(L3UI, callbacks[i], [L3UI]);
        }
    };

    L3UI.versionAtLeast = function(version) {
        return compareVersions(L3UI.version, version) >= 0;
    };

    L3UI.requireVersion = function(version, owner) {
        if (L3UI.versionAtLeast(version)) return true;
        warn("[L3UI] " + (owner || "Plugin") + " demande L3_UICore " + version + " ou plus recent.");
        return false;
    };

    L3UI.resolveAssetPath = function(path, folder) {
        path = normalizePath(path).trim();
        if (!path) return "";
        if (/^(data:|blob:|https?:|file:)/i.test(path)) return path;
        if (path.charAt(0) === "/") path = path.slice(1);
        if (/^(img|audio|movies|css|fonts)\//i.test(path)) return path;
        if (/^(animations|battlebacks1|battlebacks2|characters|enemies|faces|parallaxes|pictures|sv_actors|sv_enemies|system|tilesets|titles1|titles2)\//i.test(path)) {
            return "img/" + path;
        }
        folder = normalizePath(folder || "img/pictures");
        if (folder && folder.charAt(folder.length - 1) === "/") folder = folder.slice(0, -1);
        if (path.indexOf("/") < 0 && folder) return folder + "/" + path;
        return path;
    };

    L3UI.assetUrl = function(path, folder) {
        return L3UI.resolveAssetPath(path, folder);
    };

    L3UI.cssUrl = function(path) {
        return "url(\"" + L3UI.assetUrl(path).replace(/"/g, "\\\"") + "\")";
    };

    L3UI.addCss = function(id, cssText) {
        if (!id || !cssText) return null;
        var style = document.getElementById(id);
        if (!style) {
            style = document.createElement("style");
            style.id = id;
            style.type = "text/css";
            document.head.appendChild(style);
        }
        style.textContent = cssText;
        return style;
    };

    L3UI.addStyle = function(selector, styles) {
        if (!selector || !styles) return null;
        var id = "l3-ui-dynamic-style";
        L3UI._styles[selector] = styles;
        var css = "";
        for (var key in L3UI._styles) {
            if (L3UI._styles.hasOwnProperty(key)) {
                css += key + "{" + styleObjectToCss(L3UI._styles[key]) + "}\n";
            }
        }
        return L3UI.addCss(id, css);
    };

    L3UI.loadStylesheet = function(path) {
        path = normalizePath(path);
        if (!path || L3UI._stylesheetLinks[path]) return;
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = path;
        document.head.appendChild(link);
        L3UI._stylesheetLinks[path] = link;
    };

    L3UI.root = function() {
        var root = document.getElementById("l3-ui-root");
        if (!root) {
            root = document.createElement("div");
            root.id = "l3-ui-root";
            root.setAttribute("aria-hidden", "false");
            document.body.appendChild(root);
            L3UI.Theme.applyCurrent();
        }
        root.style.position = "fixed";
        root.style.top = "0";
        root.style.right = "0";
        root.style.bottom = "0";
        root.style.left = "0";
        root.style.width = "100%";
        root.style.height = "100%";
        root.style.display = "block";
        root.style.opacity = "1";
        root.style.visibility = "visible";
        root.style.overflow = "hidden";
        root.style.pointerEvents = "none";
        root.style.zIndex = String(config.defaultZIndex);
        root.style.setProperty("--l3-game-width", (Graphics ? Graphics.width : window.innerWidth) + "px");
        root.style.setProperty("--l3-game-height", (Graphics ? Graphics.height : window.innerHeight) + "px");
        return root;
    };

    L3UI.layer = function(scene, name) {
        scene = scene || SceneManager._scene;
        name = name || "main";
        var root = L3UI.root();
        if (!scene) return root;
        if (!scene._l3uiLayers) scene._l3uiLayers = {};
        var layer = scene._l3uiLayers[name];
        if (!layer || !layer.parentNode) {
            layer = document.createElement("div");
            layer.className = "l3-scene-layer l3-scene-" + sceneName(scene);
            layer.setAttribute("data-scene", sceneName(scene));
            layer.setAttribute("data-layer", name);
            layer.style.position = "absolute";
            layer.style.top = "0";
            layer.style.right = "0";
            layer.style.bottom = "0";
            layer.style.left = "0";
            layer.style.width = "100%";
            layer.style.height = "100%";
            layer.style.pointerEvents = "none";
            layer.style.overflow = "hidden";
            root.appendChild(layer);
            scene._l3uiLayers[name] = layer;
            L3UI._sceneLayers.push(layer);
        }
        return layer;
    };

    L3UI.clear = function(scene) {
        if (!scene || !scene._l3uiLayers) return;
        for (var key in scene._l3uiLayers) {
            if (scene._l3uiLayers.hasOwnProperty(key)) {
                var layer = scene._l3uiLayers[key];
                if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
            }
        }
        scene._l3uiLayers = {};
        L3UI._modalBlockCount = 0;
        L3UI.Focus.releaseScene(scene);
    };

    L3UI.clearAll = function() {
        var root = document.getElementById("l3-ui-root");
        if (root) root.innerHTML = "";
        L3UI._windows = {};
        L3UI._modalBlockCount = 0;
        L3UI.Focus.clear();
    };

    L3UI.el = function(tag, options) {
        options = options || {};
        var element = document.createElement(tag || "div");
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.text !== undefined) element.textContent = options.text;
        if (options.html !== undefined) element.innerHTML = options.html;
        if (options.title) element.title = options.title;
        if (options.attrs) {
            for (var attr in options.attrs) {
                if (options.attrs.hasOwnProperty(attr)) {
                    element.setAttribute(attr, options.attrs[attr]);
                }
            }
        }
        if (options.style) applyStyles(element, options.style);
        if (options.on) {
            for (var eventName in options.on) {
                if (options.on.hasOwnProperty(eventName)) {
                    element.addEventListener(eventName, options.on[eventName]);
                }
            }
        }
        if (options.children) {
            L3UI.append(element, options.children);
        }
        return element;
    };

    L3UI.append = function(parent, children) {
        if (!parent || children === undefined || children === null) return parent;
        if (!Array.isArray(children)) children = [children];
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child === undefined || child === null) continue;
            if (typeof child === "string" || typeof child === "number") {
                parent.appendChild(document.createTextNode(String(child)));
            } else if (child.element instanceof HTMLElement) {
                parent.appendChild(child.element);
            } else if (child instanceof HTMLElement) {
                parent.appendChild(child);
            }
        }
        return parent;
    };

    L3UI.empty = function(element) {
        if (!element) return element;
        while (element.firstChild) element.removeChild(element.firstChild);
        return element;
    };

    L3UI.mount = function(scene, element, layerName) {
        if (!element) return null;
        var layer = L3UI.layer(scene, layerName);
        if (element.element instanceof HTMLElement) element = element.element;
        layer.appendChild(element);
        return element;
    };

    L3UI.hideNativeWindows = function(scene) {
        if (!scene) return;
        for (var key in scene) {
            if (scene.hasOwnProperty(key) && isWindow(scene[key])) {
                L3UI.hideNativeWindow(scene[key]);
            }
        }
        if (scene._windowLayer) {
            scene._windowLayer.visible = false;
        }
    };

    L3UI.hideNativeWindow = function(win) {
        if (!win) return;
        win.visible = false;
        win.opacity = 0;
        win.contentsOpacity = 0;
        if (typeof win.deactivate === "function") win.deactivate();
        if (win.hasOwnProperty("openness")) win.openness = 0;
    };

    function L3Window(id, element, scene) {
        this.id = id;
        this.element = element;
        this.scene = scene || null;
        this.visible = true;
    }

    L3Window.prototype.setContent = function(content) {
        if (content instanceof HTMLElement) {
            L3UI.empty(this.element);
            this.element.appendChild(content);
        } else {
            this.element.innerHTML = String(content === undefined || content === null ? "" : content);
        }
        return this;
    };

    L3Window.prototype.show = function() {
        this.visible = true;
        this.element.classList.remove("is-hidden");
        return this;
    };

    L3Window.prototype.hide = function() {
        this.visible = false;
        this.element.classList.add("is-hidden");
        return this;
    };

    L3Window.prototype.remove = function() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        delete L3UI._windows[this.id];
    };

    L3UI.createWindow = function(id, options) {
        options = options || {};
        var scene = options.scene || SceneManager._scene;
        if (!id) id = "l3-window-" + Date.now();
        if (L3UI._windows[id]) L3UI._windows[id].remove();

        var element = L3UI.el("section", {
            className: "l3-window " + (options.className || ""),
            attrs: { "data-window-id": id }
        });

        var style = {};
        if (options.x !== undefined) style.left = toCssValue(options.x);
        if (options.y !== undefined) style.top = toCssValue(options.y);
        if (options.width !== undefined) style.width = toCssValue(options.width);
        if (options.height !== undefined) style.height = toCssValue(options.height);
        if (options.zIndex !== undefined) style.zIndex = String(options.zIndex);
        if (options.position !== false) style.position = "absolute";
        applyStyles(element, style);

        if (options.content !== undefined) {
            if (options.content instanceof HTMLElement) {
                element.appendChild(options.content);
            } else {
                element.innerHTML = String(options.content);
            }
        }

        var layer = options.parent || L3UI.layer(scene, options.layer || "main");
        layer.appendChild(element);

        var win = new L3Window(id, element, scene);
        L3UI._windows[id] = win;
        return win;
    };

    L3UI.getWindow = function(id) {
        return L3UI._windows[id] || null;
    };

    L3UI.removeWindow = function(id) {
        var win = L3UI._windows[id];
        if (!win) return false;
        win.remove();
        return true;
    };

    L3UI.Theme = {
        themes: {},
        active: null,

        register: function(name, theme) {
            if (!name || !theme) return;
            this.themes[name] = theme;
        },

        set: function(name) {
            if (!this.themes[name]) return false;
            this.active = name;
            this.apply(this.themes[name]);
            return true;
        },

        current: function() {
            return this.themes[this.active] || this.themes.midnight;
        },

        applyCurrent: function() {
            this.apply(this.current());
        },

        apply: function(theme) {
            theme = theme || this.current();
            var root = document.getElementById("l3-ui-root");
            if (!root || !theme) return;
            var colors = theme.colors || {};
            var radius = theme.radius || "8px";
            var shadow = theme.shadow || "0 20px 60px rgba(0,0,0,.32)";
            root.style.setProperty("--l3-bg", colors.bg || "#0b1020");
            root.style.setProperty("--l3-surface", colors.surface || "rgba(15,23,42,.96)");
            root.style.setProperty("--l3-panel", colors.panel || "rgba(30,41,59,.92)");
            root.style.setProperty("--l3-panel-soft", colors.panelSoft || "rgba(30,41,59,.68)");
            root.style.setProperty("--l3-line", colors.line || "rgba(148,163,184,.18)");
            root.style.setProperty("--l3-text", colors.text || "#f8fafc");
            root.style.setProperty("--l3-muted", colors.muted || "#94a3b8");
            root.style.setProperty("--l3-accent", colors.accent || "#38bdf8");
            root.style.setProperty("--l3-accent-2", colors.accent2 || "#fb7185");
            root.style.setProperty("--l3-good", colors.good || "#34d399");
            root.style.setProperty("--l3-warn", colors.warn || "#f59e0b");
            root.style.setProperty("--l3-danger", colors.danger || "#fb7185");
            root.style.setProperty("--l3-radius", radius);
            root.style.setProperty("--l3-shadow", shadow);
        },

        background: function(path, overlay) {
            var root = L3UI.root();
            if (!path) {
                root.style.setProperty("--l3-background-image", "none");
                return;
            }
            overlay = overlay || "linear-gradient(90deg, rgba(8,13,24,.94), rgba(8,13,24,.62))";
            root.style.setProperty("--l3-background-image", overlay + ", " + L3UI.cssUrl(path));
        }
    };

    L3UI.Theme.register("midnight", {
        radius: "8px",
        shadow: "0 22px 70px rgba(0,0,0,.35)",
        colors: {
            bg: "#090f1d",
            surface: "rgba(13, 20, 34, .96)",
            panel: "rgba(30, 42, 61, .88)",
            panelSoft: "rgba(30, 42, 61, .58)",
            line: "rgba(148, 163, 184, .18)",
            text: "#f8fafc",
            muted: "#9aa8bd",
            accent: "#38bdf8",
            accent2: "#fb4f7a",
            good: "#35d38a",
            warn: "#f6b23b",
            danger: "#fb4f7a"
        }
    });

    L3UI.Theme.register("ember", {
        radius: "8px",
        shadow: "0 22px 70px rgba(0,0,0,.42)",
        colors: {
            bg: "#101014",
            surface: "rgba(20, 18, 22, .96)",
            panel: "rgba(42, 38, 45, .88)",
            panelSoft: "rgba(42, 38, 45, .58)",
            line: "rgba(255, 255, 255, .13)",
            text: "#fff7ed",
            muted: "#c8b9ad",
            accent: "#f97316",
            accent2: "#ef4444",
            good: "#22c55e",
            warn: "#fbbf24",
            danger: "#ef4444"
        }
    });

    function FocusGroup(id, options) {
        options = options || {};
        this.id = id || ("group-" + Date.now());
        this.scene = options.scene || SceneManager._scene;
        this.items = [];
        this.index = Math.max(0, options.index || 0);
        this.wrap = options.wrap !== false;
        this.columns = Math.max(1, options.columns || 1);
        this.enabled = options.enabled !== false;
        this.onChange = options.onChange || null;
        this.onOk = options.onOk || null;
        this.onCancel = options.onCancel || null;
        this.cancelSound = options.cancelSound !== false;
    }

    FocusGroup.prototype.add = function(element, data, options) {
        options = options || {};
        var group = this;
        var item = {
            element: element,
            data: data || {},
            enabled: options.enabled !== false,
            handler: options.handler || null
        };
        element.classList.add("l3-focusable");
        element.setAttribute("tabindex", "-1");
        element.addEventListener("mouseenter", function() {
            group.select(group.items.indexOf(item), true);
        });
        element.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();
            group.select(group.items.indexOf(item), false);
            group.ok();
        });
        this.items.push(item);
        this.refresh();
        return item;
    };

    FocusGroup.prototype.current = function() {
        return this.items[this.index] || null;
    };

    FocusGroup.prototype.select = function(index, silent) {
        if (!this.items.length) return;
        index = L3UI.clamp(index, 0, this.items.length - 1);
        if (!this.items[index].enabled) return;
        if (this.index !== index && !silent && typeof SoundManager !== "undefined") {
            SoundManager.playCursor();
        }
        this.index = index;
        this.refresh();
        if (this.onChange) this.onChange(this.current(), this.index);
    };

    FocusGroup.prototype.move = function(delta) {
        if (!this.items.length) return;
        var length = this.items.length;
        var next = this.index;
        for (var i = 0; i < length; i++) {
            next += delta;
            if (this.wrap) {
                if (next < 0) next = length - 1;
                if (next >= length) next = 0;
            } else {
                next = L3UI.clamp(next, 0, length - 1);
            }
            if (this.items[next] && this.items[next].enabled) {
                this.select(next);
                return;
            }
        }
    };

    FocusGroup.prototype.ok = function() {
        var item = this.current();
        if (!item || !item.enabled) {
            if (typeof SoundManager !== "undefined") SoundManager.playBuzzer();
            return;
        }
        if (typeof SoundManager !== "undefined") SoundManager.playOk();
        if (item.handler) {
            item.handler(item.data, item, this);
        } else if (this.onOk) {
            this.onOk(item.data, item, this);
        }
    };

    FocusGroup.prototype.cancel = function() {
        if (this.cancelSound && typeof SoundManager !== "undefined") SoundManager.playCancel();
        if (this.onCancel) this.onCancel(this);
    };

    FocusGroup.prototype.refresh = function() {
        for (var i = 0; i < this.items.length; i++) {
            var item = this.items[i];
            item.element.classList.toggle("is-active", i === this.index);
            item.element.classList.toggle("is-disabled", !item.enabled);
            item.element.setAttribute("aria-selected", i === this.index ? "true" : "false");
        }
    };

    L3UI.Focus = {
        groups: {},
        active: null,

        createGroup: function(id, options) {
            var group = new FocusGroup(id, options || {});
            this.groups[group.id] = group;
            return group;
        },

        activate: function(group) {
            if (typeof group === "string") group = this.groups[group];
            if (!group) return null;
            this.active = group;
            group.refresh();
            return group;
        },

        update: function() {
            var group = this.active;
            if (!group || !group.enabled || !group.items.length) return;
            if (Input.isRepeated("down")) group.move(group.columns);
            else if (Input.isRepeated("up")) group.move(-group.columns);
            else if (Input.isRepeated("right")) group.move(1);
            else if (Input.isRepeated("left")) group.move(-1);
            else if (Input.isTriggered("ok")) group.ok();
            else if (Input.isTriggered("cancel")) group.cancel();
        },

        releaseScene: function(scene) {
            for (var id in this.groups) {
                if (this.groups.hasOwnProperty(id) && this.groups[id].scene === scene) {
                    if (this.active === this.groups[id]) this.active = null;
                    delete this.groups[id];
                }
            }
        },

        clear: function() {
            this.groups = {};
            this.active = null;
        }
    };

    L3UI.Components = {
        Panel: function(options) {
            options = options || {};
            var children = [];
            if (options.kicker || options.title) {
                var header = L3UI.el("header", { className: "l3-panel-header" });
                if (options.kicker) header.appendChild(L3UI.el("div", { className: "l3-kicker", text: options.kicker }));
                if (options.title) header.appendChild(L3UI.el("h2", { className: "l3-title", text: options.title }));
                children.push(header);
            }
            if (options.content !== undefined) {
                if (options.content instanceof HTMLElement) {
                    children.push(options.content);
                } else {
                    children.push(L3UI.el("div", { className: "l3-panel-content", html: String(options.content) }));
                }
            }
            return L3UI.el("section", {
                className: "l3-panel " + (options.className || ""),
                style: options.style,
                children: children
            });
        },

        Button: function(options) {
            options = options || {};
            var html = "";
            if (options.icon) html += "<span class=\"l3-icon\">" + L3UI.escapeHtml(options.icon) + "</span>";
            html += "<span class=\"l3-button-label\">" + L3UI.escapeHtml(options.label || "") + "</span>";
            if (options.right) html += "<span class=\"l3-button-right\">" + L3UI.escapeHtml(options.right) + "</span>";
            var button = L3UI.el("button", {
                className: "l3-button " + (options.className || ""),
                html: html,
                attrs: { type: "button" },
                on: options.on
            });
            if (options.disabled) button.classList.add("is-disabled");
            return button;
        },

        CommandList: function(options) {
            options = options || {};
            var scene = options.scene || SceneManager._scene;
            var list = L3UI.el("div", { className: "l3-command-list " + (options.className || "") });
            var group = L3UI.Focus.createGroup(options.id || ("commands-" + Date.now()), {
                scene: scene,
                columns: options.columns || 1,
                wrap: options.wrap !== false,
                onChange: options.onChange,
                onOk: options.onOk,
                onCancel: options.onCancel
            });
            var items = options.items || [];
            for (var i = 0; i < items.length; i++) {
                (function(item) {
                    var button = L3UI.Components.Button({
                        label: item.label,
                        icon: item.icon,
                        right: item.right,
                        className: "l3-command " + (item.className || ""),
                        disabled: item.enabled === false
                    });
                    if (item.detail) {
                        button.appendChild(L3UI.el("span", { className: "l3-command-detail", text: item.detail }));
                    }
                    list.appendChild(button);
                    group.add(button, item, {
                        enabled: item.enabled !== false,
                        handler: function(data) {
                            if (data && data.handler) data.handler(data);
                        }
                    });
                })(items[i]);
            }
            if (items.length) group.select(options.index || 0, true);
            return { element: list, group: group };
        },

        Gauge: function(options) {
            options = options || {};
            var max = Math.max(1, Number(options.max || 1));
            var value = L3UI.clamp(Number(options.value || 0), 0, max);
            var rate = Math.round((value / max) * 100);
            var color = options.color || "#38bdf8";
            return L3UI.el("div", {
                className: "l3-gauge " + (options.className || ""),
                html:
                    "<div class=\"l3-gauge-top\"><span>" + L3UI.escapeHtml(options.label || "") + "</span><strong>" +
                    L3UI.escapeHtml(value + " / " + max) + "</strong></div>" +
                    "<div class=\"l3-gauge-track\"><div class=\"l3-gauge-fill\" style=\"width:" + rate + "%;background:" + color + "\"></div></div>"
            });
        },

        ActorCard: function(actor, options) {
            options = options || {};
            var name = actor ? actor.name() : "-";
            var level = actor ? actor.level : 0;
            var hp = actor ? actor.hp : 0;
            var mhp = actor ? actor.mhp : 1;
            var mp = actor ? actor.mp : 0;
            var mmp = actor ? actor.mmp : 1;
            var faceName = actor && actor.faceName ? actor.faceName() : "";
            var faceIndex = actor && actor.faceIndex ? actor.faceIndex() : 0;
            var faceSize = options.faceSize || 104;
            var card = L3UI.el("article", { className: "l3-actor-card " + (options.className || "") });

            var face = L3UI.el("div", { className: "l3-actor-face" });
            face.style.width = faceSize + "px";
            face.style.height = faceSize + "px";
            if (faceName) {
                if (window.ImageManager && ImageManager.loadFace) ImageManager.loadFace(faceName);
                face.style.backgroundImage = L3UI.cssUrl("img/faces/" + faceName + ".png");
                face.style.backgroundSize = (faceSize * 4) + "px " + (faceSize * 2) + "px";
                face.style.backgroundPosition = (-((faceIndex % 4) * faceSize)) + "px " + (-(Math.floor(faceIndex / 4) * faceSize)) + "px";
            } else {
                face.classList.add("is-empty");
                face.textContent = name.charAt(0);
            }

            var body = L3UI.el("div", { className: "l3-actor-body" });
            body.appendChild(L3UI.el("div", {
                className: "l3-actor-card-head",
                html: "<strong>" + L3UI.escapeHtml(name) + "</strong><span>Lv " + L3UI.escapeHtml(level) + "</span>"
            }));
            body.appendChild(L3UI.Components.Gauge({ label: TextManager.hpA || "HP", value: hp, max: mhp, color: "#35d38a" }));
            body.appendChild(L3UI.Components.Gauge({ label: TextManager.mpA || "MP", value: mp, max: mmp, color: "#fb4f7a" }));
            body.appendChild(L3UI.el("div", {
                className: "l3-actor-class",
                text: actor && actor.currentClass ? actor.currentClass().name : ""
            }));

            card.appendChild(face);
            card.appendChild(body);
            return card;
        },

        Modal: function(options) {
            options = options || {};
            var scene = options.scene || SceneManager._scene;
            var blocksMapInput = options.blockMapInput !== false;
            var closed = false;
            var backdrop = L3UI.el("div", { className: "l3-modal-backdrop " + (options.className || "") });
            var panel = L3UI.Components.Panel({
                className: "l3-modal",
                kicker: options.kicker,
                title: options.title,
                content: options.content
            });
            bindInputBlockers(backdrop);
            backdrop.appendChild(panel);
            L3UI.mount(scene, backdrop, "modal");
            if (blocksMapInput) {
                L3UI._modalBlockCount += 1;
                clearRuntimeInput();
            }
            return {
                element: backdrop,
                panel: panel,
                close: function() {
                    if (closed) return;
                    closed = true;
                    if (blocksMapInput) L3UI._modalBlockCount = Math.max(0, L3UI._modalBlockCount - 1);
                    clearRuntimeInput();
                    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
                }
            };
        },

        Toast: function(message, options) {
            options = options || {};
            var root = L3UI.root();
            var stack = document.getElementById("l3-toast-stack");
            if (!stack) {
                stack = L3UI.el("div", { id: "l3-toast-stack", className: "l3-toast-stack" });
                root.appendChild(stack);
            }
            var toast = L3UI.el("div", {
                className: "l3-toast " + (options.type || ""),
                text: message
            });
            stack.appendChild(toast);
            setTimeout(function() {
                toast.classList.add("is-leaving");
                setTimeout(function() {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 220);
            }, options.duration || 1800);
            return toast;
        }
    };

    L3UI.Events = {
        _events: {},

        on: function(name, callback, owner) {
            if (!name || typeof callback !== "function") return null;
            if (!this._events[name]) this._events[name] = [];
            var listener = { callback: callback, owner: owner || null, once: false };
            this._events[name].push(listener);
            return listener;
        },

        once: function(name, callback, owner) {
            var listener = this.on(name, callback, owner);
            if (listener) listener.once = true;
            return listener;
        },

        off: function(name, callback) {
            var list = this._events[name];
            if (!list) return;
            if (!callback) {
                delete this._events[name];
                return;
            }
            for (var i = list.length - 1; i >= 0; i--) {
                if (list[i].callback === callback) list.splice(i, 1);
            }
        },

        emit: function(name, payload) {
            var list = this._events[name];
            if (!list || !list.length) return [];
            var results = [];
            for (var i = 0; i < list.length; i++) {
                var listener = list[i];
                results.push(safeCall(listener.owner, listener.callback, [payload, L3UI]));
                if (listener.once) {
                    list.splice(i, 1);
                    i--;
                }
            }
            return results;
        }
    };

    L3UI.Services = {
        _items: {},

        register: function(id, api) {
            if (!id) return api;
            this._items[id] = api;
            L3UI.Events.emit("service:ready", { id: id, api: api });
            return api;
        },

        get: function(id, fallback) {
            return this._items.hasOwnProperty(id) ? this._items[id] : fallback;
        },

        has: function(id) {
            return this._items.hasOwnProperty(id);
        },

        remove: function(id) {
            delete this._items[id];
        },

        list: function() {
            var result = [];
            for (var id in this._items) {
                if (this._items.hasOwnProperty(id)) result.push({ id: id, api: this._items[id] });
            }
            return result;
        }
    };

    L3UI.Parameters = {
        of: function(pluginName) {
            return PluginManager.parameters(pluginName) || {};
        },

        text: function(source, name, fallback) {
            var params = paramSource(source);
            var value = params[name];
            return value === undefined || value === null || value === "" ? fallback : String(value);
        },

        bool: function(source, name, fallback) {
            var value = paramSource(source)[name];
            if (value === undefined || value === null || value === "") return fallback;
            return value === true || value === "true" || value === "1" || value === "on";
        },

        number: function(source, name, fallback) {
            var value = Number(paramSource(source)[name]);
            return isNaN(value) ? fallback : value;
        },

        json: function(source, name, fallback) {
            var value = paramSource(source)[name];
            if (value === undefined || value === null || value === "") return fallback;
            try {
                return JSON.parse(value);
            } catch (error) {
                warn("[L3UI] Parametre JSON invalide : " + name, error);
                return fallback;
            }
        }
    };

    L3UI.Plugins = {
        _items: {},
        _order: [],
        _booting: false,

        register: function(id, setup) {
            if (!id) return null;
            setup = setup || {};
            setup.id = id;
            setup.state = setup.state || "registered";
            if (!this._items[id]) this._order.push(id);
            this._items[id] = setup;
            L3UI.Events.emit("plugin:registered", setup);
            this.bootAll();
            return setup;
        },

        has: function(id) {
            return !!this._items[id];
        },

        get: function(id) {
            return this._items[id] || null;
        },

        list: function() {
            var result = [];
            for (var i = 0; i < this._order.length; i++) {
                var plugin = this._items[this._order[i]];
                if (plugin) result.push(plugin);
            }
            return result;
        },

        ready: function(id) {
            var plugin = this._items[id];
            return !!plugin && plugin.state === "ready";
        },

        missingDepends: function(plugin) {
            var missing = [];
            var depends = plugin.depends || plugin.requires || [];
            for (var i = 0; i < depends.length; i++) {
                var dep = depends[i];
                if (dep === "L3_UICore") continue;
                if (!this.ready(dep)) missing.push(dep);
            }
            return missing;
        },

        boot: function(id) {
            var plugin = this._items[id];
            if (!plugin || plugin.state === "ready" || plugin.state === "booting") return false;
            if (plugin.autoStart === false) return false;
            var missing = this.missingDepends(plugin);
            if (missing.length) {
                plugin.state = "waiting";
                plugin.missing = missing;
                return false;
            }
            plugin.state = "booting";
            var ok = true;
            if (typeof plugin.init === "function") {
                ok = safeCall(plugin, plugin.init, [L3UI, plugin]) !== false;
            }
            if (ok && typeof plugin.start === "function") {
                ok = safeCall(plugin, plugin.start, [L3UI, plugin]) !== false;
            }
            plugin.state = ok ? "ready" : "stopped";
            plugin.missing = [];
            L3UI.Events.emit(ok ? "plugin:ready" : "plugin:stopped", plugin);
            return ok;
        },

        bootAll: function() {
            if (this._booting) return;
            this._booting = true;
            var changed = true;
            while (changed) {
                changed = false;
                for (var i = 0; i < this._order.length; i++) {
                    var id = this._order[i];
                    var before = this._items[id] && this._items[id].state;
                    var booted = this.boot(id);
                    var after = this._items[id] && this._items[id].state;
                    if (booted || before !== after) changed = true;
                }
            }
            this._booting = false;
        }
    };

    L3UI.Slots = {
        areas: (L3UI.Extensions && L3UI.Extensions.areas) || {},

        add: function(area, id, data) {
            if (!area || !id) return null;
            if (!this.areas[area]) this.areas[area] = {};
            data = data || {};
            data.id = data.id || id;
            this.areas[area][id] = data;
            L3UI.Events.emit("slot:changed", { area: area, id: id, data: data });
            return data;
        },

        remove: function(area, id) {
            if (this.areas[area]) {
                delete this.areas[area][id];
                L3UI.Events.emit("slot:changed", { area: area, id: id, removed: true });
            }
        },

        get: function(area, id) {
            return this.areas[area] ? this.areas[area][id] || null : null;
        },

        list: function(area, context) {
            var source = this.areas[area] || {};
            var result = [];
            for (var id in source) {
                if (source.hasOwnProperty(id)) {
                    var item = source[id];
                    var visible = item.visible;
                    if (typeof visible === "function") visible = safeCall(item, visible, [context, item]);
                    if (visible === false) continue;
                    item.id = item.id || id;
                    result.push(item);
                }
            }
            result.sort(function(a, b) {
                return (a.order || 0) - (b.order || 0);
            });
            return result;
        },

        render: function(area, context) {
            var items = this.list(area, context);
            var result = [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var rendered = null;
                if (typeof item.render === "function") rendered = safeCall(item, item.render, [context, item, L3UI]);
                else if (item.element instanceof HTMLElement) rendered = item.element;
                else if (item.content !== undefined) rendered = L3UI.el("div", { html: String(item.content) });
                if (rendered && rendered.element instanceof HTMLElement) rendered = rendered.element;
                if (rendered instanceof HTMLElement) result.push(rendered);
            }
            return result;
        },

        append: function(area, parent, context) {
            if (!parent) return [];
            var rendered = this.render(area, context);
            for (var i = 0; i < rendered.length; i++) parent.appendChild(rendered[i]);
            return rendered;
        }
    };

    L3UI.Extensions = {
        areas: L3UI.Slots.areas,
        register: function(area, id, data) { return L3UI.Slots.add(area, id, data); },
        remove: function(area, id) { return L3UI.Slots.remove(area, id); },
        list: function(area, context) { return L3UI.Slots.list(area, context); }
    };

    L3UI.resolvePath = function(path) {
        if (!path) return null;
        if (typeof path !== "string") return path;
        var parts = path.split(".");
        var current = window;
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part || part === "window") continue;
            current = current ? current[part] : null;
            if (!current) return null;
        }
        return current;
    };

    L3UI.Hooks = {
        _hooks: {},

        install: function(targetPath, methodName) {
            var key = targetPath + "#" + methodName;
            if (this._hooks[key]) return this._hooks[key];
            var target = L3UI.resolvePath(targetPath);
            if (!target || typeof target[methodName] !== "function") {
                warn("[L3UI] Hook impossible : " + targetPath + "." + methodName);
                return null;
            }
            var hook = {
                key: key,
                targetPath: targetPath,
                methodName: methodName,
                original: target[methodName],
                before: [],
                after: []
            };
            var self = this;
            target[methodName] = function() {
                var context = {
                    target: this,
                    args: arguments,
                    result: undefined,
                    targetPath: targetPath,
                    methodName: methodName
                };
                self.runList(hook.before, context);
                context.result = hook.original.apply(this, arguments);
                self.runList(hook.after, context);
                return context.result;
            };
            this._hooks[key] = hook;
            return hook;
        },

        runList: function(list, context) {
            list.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
            for (var i = 0; i < list.length; i++) {
                var result = safeCall(list[i], list[i].callback, [context, L3UI]);
                if (result !== undefined) context.result = result;
            }
        },

        add: function(mode, targetPath, methodName, id, callback, order) {
            var hook = this.install(targetPath, methodName);
            if (!hook || !id || typeof callback !== "function") return false;
            var list = mode === "before" ? hook.before : hook.after;
            this.remove(targetPath, methodName, id);
            list.push({ id: id, callback: callback, order: order || 0 });
            return true;
        },

        before: function(targetPath, methodName, id, callback, order) {
            return this.add("before", targetPath, methodName, id, callback, order);
        },

        after: function(targetPath, methodName, id, callback, order) {
            return this.add("after", targetPath, methodName, id, callback, order);
        },

        remove: function(targetPath, methodName, id) {
            var hook = this._hooks[targetPath + "#" + methodName];
            if (!hook) return;
            var lists = [hook.before, hook.after];
            for (var l = 0; l < lists.length; l++) {
                for (var i = lists[l].length - 1; i >= 0; i--) {
                    if (lists[l][i].id === id) lists[l].splice(i, 1);
                }
            }
        }
    };

    L3UI.Layout = {
        backgroundCss: function(path, overlay, folder) {
            path = L3UI.resolveAssetPath(path, folder || "img/pictures");
            if (!path) return "";
            overlay = overlay || "linear-gradient(90deg,rgba(8,13,24,.96),rgba(8,13,24,.72))";
            return overlay + ", " + L3UI.cssUrl(path);
        },

        screen: function(scene, options) {
            options = options || {};
            var screen = L3UI.el("div", { className: "l3-screen " + (options.className || "") });
            var bg = this.backgroundCss(options.background || "", options.overlay, options.assetFolder);
            if (bg) {
                screen.style.backgroundImage = bg;
                screen.style.backgroundSize = "cover";
                screen.style.backgroundPosition = "center";
            }
            if (options.mount !== false) L3UI.mount(scene, screen, options.layer || "main");
            return screen;
        },

        columns: function(scene, options) {
            options = options || {};
            if (options.clear !== false) L3UI.clear(scene);
            if (options.hideNative !== false) L3UI.hideNativeWindows(scene);
            var screen = this.screen(scene, {
                className: "l3-layout-columns " + (options.className || ""),
                background: options.background,
                overlay: options.overlay,
                assetFolder: options.assetFolder,
                layer: options.layer
            });
            var sidebar = L3UI.el("aside", { className: "l3-layout-sidebar l3-panel " + (options.sidebarClass || "") });
            var main = L3UI.el("main", { className: "l3-layout-main l3-panel " + (options.mainClass || "") });
            var detail = null;
            if (options.detail !== false) detail = L3UI.el("aside", { className: "l3-layout-detail l3-panel " + (options.detailClass || "") });
            if (options.kicker) sidebar.appendChild(L3UI.el("div", { className: "l3-kicker", text: options.kicker }));
            if (options.title) sidebar.appendChild(L3UI.el("h1", { className: "l3-title", text: options.title }));
            screen.appendChild(sidebar);
            screen.appendChild(main);
            if (detail) screen.appendChild(detail);
            return { screen: screen, sidebar: sidebar, main: main, detail: detail };
        }
    };

    L3UI.Scenes = {
        _items: {},
        _next: null,

        register: function(id, setup) {
            if (!id || !setup) return null;
            setup.id = id;
            this._items[id] = setup;
            L3UI.Slots.add("scenes", id, setup);
            L3UI.Events.emit("scene:registered", setup);
            return setup;
        },

        remove: function(id) {
            delete this._items[id];
            L3UI.Slots.remove("scenes", id);
        },

        get: function(id) {
            return this._items[id] || null;
        },

        list: function() {
            var result = [];
            for (var id in this._items) {
                if (this._items.hasOwnProperty(id)) result.push(this._items[id]);
            }
            result.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
            return result;
        },

        push: function(id, payload) {
            this._next = { id: id, payload: payload || null };
            SceneManager.push(Scene_L3UIRuntime);
        },

        goto: function(id, payload) {
            this._next = { id: id, payload: payload || null };
            SceneManager.goto(Scene_L3UIRuntime);
        },

        consumeNext: function() {
            var next = this._next || {};
            this._next = null;
            return next;
        }
    };

    L3UI.Debug = {
        overlay: null,
        visible: false,

        show: function() {
            this.visible = true;
            if (!this.overlay) {
                this.overlay = L3UI.el("div", { className: "l3-dev-overlay" });
                L3UI.root().appendChild(this.overlay);
            }
            this.overlay.style.display = "block";
        },

        hide: function() {
            this.visible = false;
            if (this.overlay) this.overlay.style.display = "none";
        },

        update: function() {
            if (!this.visible || !this.overlay) return;
            var scene = SceneManager._scene;
            this.overlay.innerHTML =
                "<strong>L3 UI</strong><br>" +
                "Scene: " + L3UI.escapeHtml(sceneName(scene)) + "<br>" +
                "Windows: " + Object.keys(L3UI._windows).length + "<br>" +
                "Plugins: " + L3UI.Plugins.list().length + "<br>" +
                "Focus: " + L3UI.escapeHtml(L3UI.Focus.active ? L3UI.Focus.active.id : "-");
        }
    };

    function installBaseCss() {
        L3UI.addCss("l3-ui-core-css",
            "#l3-ui-root{position:fixed;top:0;right:0;bottom:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:9000;font-family:GameFont,Arial,sans-serif;color:#f8fafc;color:var(--l3-text);letter-spacing:0;}" +
            "#l3-ui-root *{box-sizing:border-box;letter-spacing:0;}" +
            ".l3-scene-layer{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;}" +
            ".l3-screen{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;display:flex;gap:16px;padding:24px;pointer-events:none;background:linear-gradient(120deg,rgba(9,15,29,.96),rgba(9,15,29,.72));background:var(--l3-background-image,linear-gradient(120deg,rgba(9,15,29,.96),rgba(9,15,29,.72)));background-size:cover;background-position:center;}" +
            ".l3-window,.l3-panel{pointer-events:auto;background:rgba(13,20,34,.96);background:var(--l3-surface);border:1px solid rgba(148,163,184,.18);border:1px solid var(--l3-line);border-radius:8px;border-radius:var(--l3-radius);box-shadow:0 22px 70px rgba(0,0,0,.35);box-shadow:var(--l3-shadow);color:#f8fafc;color:var(--l3-text);}" +
            ".l3-panel{padding:16px;}" +
            ".l3-panel-header{margin-bottom:18px;}" +
            ".l3-kicker{font-size:12px;text-transform:uppercase;color:#9aa8bd;color:var(--l3-muted);letter-spacing:.08em;margin-bottom:5px;}" +
            ".l3-title{margin:0;font-size:24px;line-height:1.1;font-weight:700;color:#f8fafc;color:var(--l3-text);}" +
            ".l3-panel-content{color:#9aa8bd;color:var(--l3-muted);line-height:1.45;}" +
            ".l3-button{width:100%;min-height:46px;display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid transparent;border-radius:6px;background:rgba(30,42,61,.88);background:var(--l3-panel);color:#f8fafc;color:var(--l3-text);font:inherit;text-align:left;cursor:pointer;outline:none;transition:background .12s ease,border-color .12s ease,transform .12s ease;}" +
            ".l3-button:hover,.l3-button.is-active{background:linear-gradient(90deg,rgba(251,79,122,.24),rgba(56,189,248,.10));border-color:#fb4f7a;border-color:var(--l3-accent-2);}" +
            ".l3-button:active{transform:translateY(1px);}" +
            ".l3-button.is-disabled{opacity:.45;filter:saturate(.5);cursor:not-allowed;}" +
            ".l3-icon{width:22px;min-width:22px;text-align:center;color:#38bdf8;color:var(--l3-accent);}" +
            ".l3-button-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
            ".l3-button-right{margin-left:auto;color:#fb4f7a;color:var(--l3-accent-2);}" +
            ".l3-command-list{display:flex;flex-direction:column;gap:8px;}" +
            ".l3-command-list>.l3-button{margin-bottom:8px;}" +
            ".l3-command-list>.l3-button:last-child{margin-bottom:0;}" +
            ".l3-command-detail{display:block;width:100%;margin-left:32px;margin-top:3px;font-size:12px;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-grid{display:grid;gap:4px;}" +
            ".l3-actor-card{display:grid;grid-template-columns:112px minmax(0,1fr);align-items:center;grid-column-gap:24px;column-gap:24px;min-height:210px;padding:24px;border-radius:8px;background:rgba(30,42,61,.88);background:var(--l3-panel);border:1px solid rgba(148,163,184,.16);pointer-events:auto;}" +
            ".l3-actor-card.is-active{border-color:#38bdf8;border-color:var(--l3-accent);background:linear-gradient(135deg,rgba(56,189,248,.18),rgba(251,79,122,.12));}" +
            ".l3-actor-face{width:104px;height:104px;border-radius:10px;align-self:center;background-repeat:no-repeat;background-color:rgba(15,23,42,.82);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 14px 32px rgba(0,0,0,.24);overflow:hidden;}" +
            ".l3-actor-face.is-empty{display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-actor-body{min-width:0;display:flex;flex-direction:column;gap:13px;}" +
            ".l3-actor-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:23px;}" +
            ".l3-actor-card-head strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
            ".l3-actor-card-head span{font-size:16px;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-actor-class{margin-top:2px;color:#9aa8bd;color:var(--l3-muted);font-size:15px;}" +
            ".l3-gauge{display:flex;flex-direction:column;gap:7px;}" +
            ".l3-gauge-top{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-gauge-top strong{color:#f8fafc;color:var(--l3-text);font-weight:500;}" +
            ".l3-gauge-track{height:11px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;}" +
            ".l3-gauge-fill{height:100%;border-radius:999px;transition:width .18s ease;}" +
            ".l3-modal-backdrop{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.56);pointer-events:auto;}" +
            ".l3-modal{width:min(980px,calc(100vw - 48px));max-height:calc(100vh - 72px);overflow:auto;}" +
            ".l3-toast-stack{position:absolute;right:24px;bottom:24px;display:flex;flex-direction:column;gap:8px;z-index:99999;pointer-events:none;}" +
            ".l3-toast{min-width:220px;padding:12px 14px;border:1px solid rgba(148,163,184,.18);border:1px solid var(--l3-line);border-radius:6px;background:rgba(13,20,34,.96);background:var(--l3-surface);box-shadow:0 22px 70px rgba(0,0,0,.35);box-shadow:var(--l3-shadow);transition:opacity .2s ease,transform .2s ease;}" +
            ".l3-toast.is-leaving{opacity:0;transform:translateY(8px);}" +
            ".l3-layout-columns{display:grid;grid-template-columns:320px minmax(0,1fr) 360px;grid-column-gap:22px;grid-row-gap:22px;grid-gap:22px;gap:22px;padding:28px;}" +
            ".l3-layout-sidebar,.l3-layout-main,.l3-layout-detail{min-width:0;min-height:0;padding:20px;overflow:auto;}" +
            ".l3-layout-sidebar{display:flex;flex-direction:column;}" +
            ".l3-runtime-screen{align-items:center;justify-content:center;}" +
            ".l3-runtime-missing{width:520px;max-width:calc(100vw - 48px);}" +
            ".l3-dev-overlay{position:absolute;left:8px;top:8px;z-index:999999;padding:8px 10px;border:1px solid var(--l3-line);border-radius:6px;background:rgba(0,0,0,.72);font:12px/1.35 monospace;color:#fff;pointer-events:none;}" +
            ".is-hidden{display:none!important;}"
        );
    }

    function installLegacyBridge() {
        if (window.CSSWindowSystem) return;
        window.CSSWindowSystem = {
            version: "bridge-" + L3UI.version,
            defaultZIndex: config.defaultZIndex,
            createWindow: function(id, options) {
                return L3UI.createWindow(id, options || {});
            },
            getWindow: function(id) {
                return L3UI.getWindow(id);
            },
            removeWindow: function(id) {
                return L3UI.removeWindow(id);
            },
            addStyle: function(selector, styles) {
                return L3UI.addStyle(selector, styles);
            },
            Utils: {
                escapeHtml: L3UI.escapeHtml
            }
        };
    }

    function Scene_L3UIRuntime() {
        this.initialize.apply(this, arguments);
    }

    window.Scene_L3UIRuntime = Scene_L3UIRuntime;
    Scene_L3UIRuntime.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_L3UIRuntime.prototype.constructor = Scene_L3UIRuntime;

    Scene_L3UIRuntime.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        var next = L3UI.Scenes.consumeNext();
        this._l3RuntimeId = next.id || "";
        this._l3RuntimePayload = next.payload || null;
        this._l3RuntimeDefinition = null;
    };

    Scene_L3UIRuntime.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        L3UI.clear(this);
        L3UI.hideNativeWindows(this);
        this._l3RuntimeDefinition = L3UI.Scenes.get(this._l3RuntimeId);
        if (!this._l3RuntimeDefinition) {
            this.renderMissingScene();
            return;
        }
        L3UI.Events.emit("runtimeScene:create", {
            id: this._l3RuntimeId,
            scene: this,
            payload: this._l3RuntimePayload,
            definition: this._l3RuntimeDefinition
        });
        var rendered = null;
        if (typeof this._l3RuntimeDefinition.create === "function") {
            rendered = safeCall(this._l3RuntimeDefinition, this._l3RuntimeDefinition.create, [this, this._l3RuntimePayload, L3UI]);
        } else if (typeof this._l3RuntimeDefinition.render === "function") {
            rendered = safeCall(this._l3RuntimeDefinition, this._l3RuntimeDefinition.render, [this, this._l3RuntimePayload, L3UI]);
        }
        if (rendered && rendered.element instanceof HTMLElement) rendered = rendered.element;
        if (rendered instanceof HTMLElement) L3UI.mount(this, rendered);
    };

    Scene_L3UIRuntime.prototype.renderMissingScene = function() {
        var screen = L3UI.Layout.screen(this, { className: "l3-runtime-screen" });
        screen.appendChild(L3UI.Components.Panel({
            className: "l3-runtime-missing",
            kicker: "L3 UI",
            title: "Scene introuvable",
            content: "Aucune scene L3 UI n'est enregistree pour : " + L3UI.escapeHtml(this._l3RuntimeId || "-")
        }));
    };

    Scene_L3UIRuntime.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._l3RuntimeDefinition && typeof this._l3RuntimeDefinition.update === "function") {
            safeCall(this._l3RuntimeDefinition, this._l3RuntimeDefinition.update, [this, this._l3RuntimePayload, L3UI]);
        }
    };

    Scene_L3UIRuntime.prototype.terminate = function() {
        if (this._l3RuntimeDefinition && typeof this._l3RuntimeDefinition.terminate === "function") {
            safeCall(this._l3RuntimeDefinition, this._l3RuntimeDefinition.terminate, [this, this._l3RuntimePayload, L3UI]);
        }
        L3UI.Events.emit("runtimeScene:terminate", {
            id: this._l3RuntimeId,
            scene: this,
            payload: this._l3RuntimePayload,
            definition: this._l3RuntimeDefinition
        });
        Scene_MenuBase.prototype.terminate.call(this);
    };

    var _Scene_Base_start = Scene_Base.prototype.start;
    Scene_Base.prototype.start = function() {
        _Scene_Base_start.call(this);
        L3UI.layer(this);
        L3UI.Events.emit("scene:start", { scene: this, name: sceneName(this) });
    };

    var _Scene_Base_update = Scene_Base.prototype.update;
    Scene_Base.prototype.update = function() {
        _Scene_Base_update.call(this);
        L3UI.root();
        L3UI.Focus.update();
        L3UI.Debug.update();
        if (L3UI.Events._events["scene:update"]) {
            L3UI.Events.emit("scene:update", { scene: this, name: sceneName(this) });
        }
    };

    var _Scene_Base_terminate = Scene_Base.prototype.terminate;
    Scene_Base.prototype.terminate = function() {
        L3UI.Events.emit("scene:terminate", { scene: this, name: sceneName(this) });
        L3UI.clear(this);
        _Scene_Base_terminate.call(this);
    };

    Scene_Base.prototype.createL3Window = function(id, options) {
        options = options || {};
        options.scene = this;
        return L3UI.createWindow(id, options);
    };

    Scene_Base.prototype.removeL3Window = function(id) {
        return L3UI.removeWindow(id);
    };

    if (typeof Game_Player !== "undefined" && Game_Player.prototype && !Game_Player.prototype._l3UiCanMovePatched) {
        var _Game_Player_canMove = Game_Player.prototype.canMove;
        Game_Player.prototype.canMove = function() {
            if (window.L3UI && L3UI.isModalBlocking && L3UI.isModalBlocking()) return false;
            return _Game_Player_canMove.call(this);
        };
        Game_Player.prototype._l3UiCanMovePatched = true;
    }

    installBaseCss();
    if (config.loadUtilityCss && config.utilityCssFile) L3UI.loadStylesheet(config.utilityCssFile);
    if (config.customCssFile) L3UI.loadStylesheet(config.customCssFile);
    L3UI.root();
    L3UI.Theme.set(config.defaultTheme);
    installLegacyBridge();
    L3UI.Services.register("core", L3UI);
    L3UI.Plugins.register("L3_UICore", {
        version: L3UI.version,
        title: "L3 UI Core",
        provides: ["core", "components", "events", "hooks", "scenes", "slots"],
        init: function(api) {
            api.Services.register("components", api.Components);
            api.Services.register("events", api.Events);
            api.Services.register("hooks", api.Hooks);
            api.Services.register("scenes", api.Scenes);
            api.Services.register("slots", api.Slots);
        }
    });
    L3UI._ready = true;
    L3UI.Plugins.bootAll();
    L3UI._flushReady();
    L3UI.Events.emit("core:ready", L3UI);
    log("L3 UI Core ready");
})();
