/*:
 * @plugindesc L3 UI Menus v1.0 - Menus CSS extensibles construits sur L3 UI Core.
 * @author L3ViKk
 * @version 1.0.0
 *
 * @param Enable Title Screen
 * @text Ecran titre CSS
 * @type boolean
 * @default true
 *
 * @param Enable Main Menu
 * @text Menu principal CSS
 * @type boolean
 * @default true
 *
 * @param Title Background Image
 * @text Image de fond du titre
 * @type text
 * @default
 * @desc Nom du fichier dans img/pictures, ou chemin complet comme img/pictures/fond.png.
 *
 * @param Menu Background Image
 * @text Image de fond du menu
 * @type text
 * @default
 * @desc Nom du fichier dans img/pictures, ou chemin complet comme img/pictures/fond.png.
 *
 * @param Accent Color
 * @text Couleur accent
 * @type text
 * @default #fb4f7a
 *
 * @param Secondary Color
 * @text Couleur secondaire
 * @type text
 * @default #38bdf8
 *
 * @param Hide Native Windows
 * @text Masquer les fenetres natives
 * @type boolean
 * @default true
 *
 * @help
 * ============================================================================
 * L3 UI Menus
 * ============================================================================
 *
 * Menus CSS de base pour RPG Maker MV.
 *
 * Le plugin expose une API publique pour ajouter des commandes ou des panneaux
 * sans modifier le menu principal.
 *
 * Ajouter une commande :
 *
 *   L3UI.Menu.addCommand("questLog", {
 *       label: "Quetes",
 *       icon: "!",
 *       order: 35,
 *       handler: function(scene) {
 *           SceneManager.push(Scene_QuestLog);
 *       }
 *   });
 *
 * Ajouter un panneau dans la partie droite du menu :
 *
 *   L3UI.Menu.addPanel("bonus", {
 *       order: 10,
 *       render: function(scene) {
 *           return L3UI.Components.Panel({
 *               title: "Bonus",
 *               content: "Or : " + $gameParty.gold()
 *           });
 *       }
 *   });
 *
 * Ce plugin doit etre place apres L3_UICore.
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_UIMenus";
    var params = PluginManager.parameters(PLUGIN_NAME) || {};

    function readBool(name, fallback) {
        var value = params[name];
        if (value === undefined || value === null || value === "") return fallback;
        return value === true || value === "true" || value === "1" || value === "on";
    }

    function readText(name, fallback) {
        var value = params[name];
        return value === undefined || value === null ? fallback : String(value);
    }

    var config = {
        title: readBool("Enable Title Screen", true),
        menu: readBool("Enable Main Menu", true),
        titleBackground: readText("Title Background Image", ""),
        menuBackground: readText("Menu Background Image", ""),
        accent: readText("Accent Color", "#fb4f7a"),
        secondary: readText("Secondary Color", "#38bdf8"),
        hideNativeWindows: readBool("Hide Native Windows", true)
    };

    if (!window.L3UI || !L3UI.enabled) return;

    var Menu = L3UI.Menu || {};
    L3UI.Menu = Menu;

    Menu._commands = Menu._commands || {};
    Menu._panels = Menu._panels || {};
    Menu._defaultsReady = false;
    Menu.background = config.menuBackground;

    Menu.addCommand = function(id, command) {
        if (!id || !command) return;
        command.id = id;
        Menu._commands[id] = command;
        if (L3UI.Events) L3UI.Events.emit("menu:commandAdded", { id: id, command: command });
        Menu.refresh();
    };

    Menu.removeCommand = function(id) {
        delete Menu._commands[id];
        if (L3UI.Events) L3UI.Events.emit("menu:commandRemoved", { id: id });
        Menu.refresh();
    };

    Menu.addPanel = function(id, panel) {
        if (!id || !panel) return;
        panel.id = id;
        Menu._panels[id] = panel;
        if (L3UI.Events) L3UI.Events.emit("menu:panelAdded", { id: id, panel: panel });
        Menu.refresh();
    };

    Menu.removePanel = function(id) {
        delete Menu._panels[id];
        if (L3UI.Events) L3UI.Events.emit("menu:panelRemoved", { id: id });
        Menu.refresh();
    };

    Menu.commands = function(scene) {
        installDefaultCommands();
        var result = [];
        var seen = {};
        function pushCommand(command, id, skipVisible) {
            if (!command || seen[id || command.id]) return;
            if (!skipVisible) {
                var visible = command.visible;
                if (typeof visible === "function") visible = visible(scene, command);
                if (visible === false) return;
            }
            command.id = command.id || id;
            seen[command.id] = true;
            result.push(command);
        }
        for (var id in Menu._commands) {
            if (Menu._commands.hasOwnProperty(id)) {
                pushCommand(Menu._commands[id], id);
            }
        }
        if (L3UI.Slots) {
            var slotCommands = L3UI.Slots.list("menu.commands", { scene: scene, menu: Menu });
            for (var i = 0; i < slotCommands.length; i++) pushCommand(slotCommands[i], slotCommands[i].id, true);
        }
        result.sort(function(a, b) {
            return (a.order || 0) - (b.order || 0);
        });
        return result;
    };

    Menu.panels = function(scene) {
        var result = [];
        var seen = {};
        function pushPanel(panel, id, skipVisible) {
            if (!panel || seen[id || panel.id]) return;
            if (!skipVisible) {
                var visible = panel.visible;
                if (typeof visible === "function") visible = visible(scene, panel);
                if (visible === false) return;
            }
            panel.id = panel.id || id;
            seen[panel.id] = true;
            result.push(panel);
        }
        for (var id in Menu._panels) {
            if (Menu._panels.hasOwnProperty(id)) {
                pushPanel(Menu._panels[id], id);
            }
        }
        if (L3UI.Slots) {
            var slotPanels = L3UI.Slots.list("menu.panels", { scene: scene, menu: Menu });
            for (var i = 0; i < slotPanels.length; i++) pushPanel(slotPanels[i], slotPanels[i].id, true);
        }
        result.sort(function(a, b) {
            return (a.order || 0) - (b.order || 0);
        });
        return result;
    };

    Menu.refresh = function() {
        if (Menu._suspendRefresh) return;
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Menu && scene._l3MenuReady) {
            renderMainMenu(scene);
        }
    };

    Menu.setBackground = function(path) {
        config.menuBackground = path || "";
        Menu.background = config.menuBackground;
        Menu.refresh();
    };

    Menu.openActorScene = function(scene, sceneClass, title) {
        var members = $gameParty.members();
        if (!members.length) return;
        if (members.length === 1) {
            $gameParty.setMenuActor(members[0]);
            SceneManager.push(sceneClass);
            return;
        }
        openActorPicker(scene, title, function(actor) {
            $gameParty.setMenuActor(actor);
            SceneManager.push(sceneClass);
        });
    };

    Menu.openFormation = function(scene) {
        var members = $gameParty.members();
        if (members.length < 2) {
            L3UI.Components.Toast("Il faut au moins deux membres dans le groupe.", { type: "warn" });
            return;
        }

        var firstIndex = -1;
        var modal = L3UI.Components.Modal({
            scene: scene,
            kicker: "Groupe",
            title: "Changer la formation"
        });
        var grid = L3UI.el("div", { className: "l3-menu-actor-picker" });
        modal.panel.appendChild(grid);

        var group = L3UI.Focus.createGroup("l3-formation-picker", {
            scene: scene,
            columns: 2,
            onCancel: function() {
                modal.close();
                if (scene._l3MenuGroup) L3UI.Focus.activate(scene._l3MenuGroup);
            }
        });

        for (var i = 0; i < members.length; i++) {
            (function(index) {
                var card = L3UI.Components.ActorCard(members[index]);
                card.classList.add("l3-picker-card");
                grid.appendChild(card);
                group.add(card, { actor: members[index], index: index }, {
                    handler: function(data, item) {
                        if (firstIndex < 0) {
                            firstIndex = data.index;
                            item.element.classList.add("is-marked");
                            L3UI.Components.Toast("Choisis la deuxieme position.");
                            return;
                        }
                        if (firstIndex !== data.index) {
                            $gameParty.swapOrder(firstIndex, data.index);
                            modal.close();
                            renderMainMenu(scene);
                        }
                    }
                });
            })(i);
        }

        L3UI.Focus.activate(group);
    };

    function installDefaultCommands() {
        if (Menu._defaultsReady) return;
        Menu._defaultsReady = true;
        Menu._suspendRefresh = true;

        Menu.addCommand("item", {
            label: text("item", "Objets"),
            icon: "I",
            order: 10,
            handler: function() {
                SceneManager.push(Scene_Item);
            }
        });

        Menu.addCommand("skill", {
            label: text("skill", "Competences"),
            icon: "S",
            order: 20,
            handler: function(scene) {
                Menu.openActorScene(scene, Scene_Skill, text("skill", "Competences"));
            }
        });

        Menu.addCommand("equip", {
            label: text("equip", "Equipement"),
            icon: "E",
            order: 30,
            handler: function(scene) {
                Menu.openActorScene(scene, Scene_Equip, text("equip", "Equipement"));
            }
        });

        Menu.addCommand("status", {
            label: text("status", "Etat"),
            icon: "@",
            order: 40,
            handler: function(scene) {
                Menu.openActorScene(scene, Scene_Status, text("status", "Etat"));
            }
        });

        Menu.addCommand("formation", {
            label: text("formation", "Formation"),
            icon: "<>",
            order: 50,
            visible: function() {
                return $gameParty.size() >= 2;
            },
            handler: function(scene) {
                Menu.openFormation(scene);
            }
        });

        Menu.addCommand("options", {
            label: text("options", "Options"),
            icon: "O",
            order: 60,
            handler: function() {
                SceneManager.push(Scene_Options);
            }
        });

        Menu.addCommand("save", {
            label: text("save", "Sauvegarder"),
            icon: "[]",
            order: 70,
            enabled: function() {
                return $gameSystem.isSaveEnabled();
            },
            handler: function() {
                SceneManager.push(Scene_Save);
            }
        });

        Menu.addCommand("gameEnd", {
            label: text("gameEnd", "Quitter le jeu"),
            icon: "X",
            order: 80,
            handler: function() {
                SceneManager.push(Scene_GameEnd);
            }
        });

        Menu._suspendRefresh = false;
    }

    function text(name, fallback) {
        if (!window.$dataSystem || !$dataSystem.terms || !window.TextManager) return fallback;
        try {
            return TextManager[name] || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function commandEnabled(scene, command) {
        var enabled = command.enabled;
        if (typeof enabled === "function") return enabled(scene, command) !== false;
        return enabled !== false;
    }

    function buildBackground(path) {
        path = normalizePicturePath(path);
        if (!path) {
            return "";
        }
        return "linear-gradient(90deg,rgba(8,13,24,.96),rgba(8,13,24,.72)), " + L3UI.cssUrl(path);
    }

    function normalizePicturePath(path) {
        if (L3UI.resolveAssetPath) return L3UI.resolveAssetPath(path, "img/pictures");
        path = String(path || "").trim().replace(/\\/g, "/");
        if (!path) return "";
        if (/^(data:|blob:|https?:|file:)/i.test(path)) return path;
        if (path.charAt(0) === "/") path = path.slice(1);
        if (path.indexOf("img/") === 0) return path;
        if (path.indexOf("pictures/") === 0) return "img/" + path;
        if (path.indexOf("/") < 0) return "img/pictures/" + path;
        return path;
    }

    function renderTitle(scene) {
        L3UI.clear(scene);
        if (config.hideNativeWindows) L3UI.hideNativeWindows(scene);
        if (scene._commandWindow) L3UI.hideNativeWindow(scene._commandWindow);
        hideNativeTitle(scene);

        var screen = L3UI.el("div", { className: "l3-screen l3-title-screen" });
        var background = buildBackground(config.titleBackground);
        if (background) {
            hideNativeTitleBackground(scene);
            screen.style.backgroundImage = background;
            screen.style.backgroundSize = "cover";
            screen.style.backgroundPosition = "center";
        }

        var title = $dataSystem ? $dataSystem.gameTitle : document.title;
        var block = L3UI.el("section", { className: "l3-title-block" });
        block.appendChild(L3UI.el("div", { className: "l3-kicker", text: "RPG Maker MV" }));
        block.appendChild(L3UI.el("h1", { className: "l3-title-logo", text: title }));
        block.appendChild(L3UI.el("div", { className: "l3-title-sub", text: "Interface L3 UI" }));

        var items = [
            {
                id: "new-game",
                order: 10,
                label: text("newGame", "Nouvelle partie"),
                right: ">",
                handler: function() { scene.commandNewGame(); }
            },
            {
                id: "continue",
                order: 20,
                label: text("continue_", "Continuer"),
                enabled: DataManager.isAnySavefileExists(),
                handler: function() { scene.commandContinue(); }
            },
            {
                id: "options",
                order: 90,
                label: text("options", "Options"),
                handler: function() { scene.commandOptions(); }
            }
        ];
        if (L3UI.Slots) {
            var titleCommands = L3UI.Slots.list("title.commands", { scene: scene, menu: Menu });
            for (var titleIndex = 0; titleIndex < titleCommands.length; titleIndex++) {
                (function(command) {
                    items.push({
                        id: command.id,
                        order: command.order || 50,
                        label: command.label,
                        icon: command.icon,
                        right: command.right,
                        detail: command.detail,
                        enabled: command.enabled !== false,
                        handler: function() {
                            if (command.handler) command.handler(scene, command);
                        }
                    });
                })(titleCommands[titleIndex]);
            }
            items.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
        }
        var commands = L3UI.Components.CommandList({
            id: "l3-title-commands",
            scene: scene,
            items: items
        });
        block.appendChild(commands.element);
        screen.appendChild(block);
        L3UI.mount(scene, screen);
        L3UI.Focus.activate(commands.group);
    }

    function hideNativeTitle(scene) {
        if (!scene) return;
        if (scene._gameTitleSprite) scene._gameTitleSprite.visible = false;
        if (scene._commandWindow) L3UI.hideNativeWindow(scene._commandWindow);
    }

    function hideNativeTitleBackground(scene) {
        if (!scene) return;
        if (scene._backSprite1) scene._backSprite1.visible = false;
        if (scene._backSprite2) scene._backSprite2.visible = false;
    }

    function renderMainMenu(scene) {
        L3UI.clear(scene);
        scene._l3MenuReady = true;
        if (config.hideNativeWindows) L3UI.hideNativeWindows(scene);

        var screen = L3UI.el("div", { className: "l3-screen l3-menu-screen" });
        var background = buildBackground(config.menuBackground);
        if (background) {
            screen.style.backgroundImage = background;
            screen.style.backgroundSize = "cover";
            screen.style.backgroundPosition = "center";
        }

        var sidebar = L3UI.el("aside", { className: "l3-menu-sidebar l3-panel" });
        sidebar.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Menu" }));
        sidebar.appendChild(L3UI.el("h1", { className: "l3-menu-game-title", text: $dataSystem.gameTitle }));

        var commands = Menu.commands(scene);
        var commandItems = [];
        for (var i = 0; i < commands.length; i++) {
            (function(command) {
                commandItems.push({
                    label: command.label,
                    icon: command.icon,
                    right: command.right,
                    detail: command.detail,
                    enabled: commandEnabled(scene, command),
                    handler: function() {
                        if (!commandEnabled(scene, command)) {
                            SoundManager.playBuzzer();
                            return;
                        }
                        if (command.handler) command.handler(scene, command);
                    }
                });
            })(commands[i]);
        }

        var commandList = L3UI.Components.CommandList({
            id: "l3-main-menu-commands",
            scene: scene,
            items: commandItems,
            onCancel: function() {
                SceneManager.pop();
            }
        });
        scene._l3MenuGroup = commandList.group;
        sidebar.appendChild(commandList.element);
        sidebar.appendChild(buildMenuFooter());

        var main = L3UI.el("main", { className: "l3-menu-main l3-panel" });
        main.appendChild(buildPartyHeader());
        main.appendChild(buildActorGrid());
        appendCustomPanels(scene, main);

        screen.appendChild(sidebar);
        screen.appendChild(main);
        L3UI.mount(scene, screen);
        L3UI.Focus.activate(commandList.group);
    }

    function buildMenuFooter() {
        var footer = L3UI.el("footer", { className: "l3-menu-footer" });
        footer.appendChild(L3UI.el("span", { text: "ESC retour" }));
        footer.appendChild(L3UI.el("strong", { text: L3UI.formatNumber($gameParty.gold()) + " " + text("currencyUnit", "G") }));
        return footer;
    }

    function buildPartyHeader() {
        var header = L3UI.el("header", { className: "l3-menu-main-header" });
        var title = L3UI.el("div");
        title.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Groupe" }));
        title.appendChild(L3UI.el("h2", { className: "l3-title", text: "Etat du groupe" }));
        header.appendChild(title);
        header.appendChild(L3UI.el("div", { className: "l3-party-count", text: String($gameParty.members().length) }));
        return header;
    }

    function buildActorGrid() {
        var actors = $gameParty.members();
        var grid = L3UI.el("section", { className: "l3-menu-actor-grid" });
        if (!actors.length) {
            grid.appendChild(L3UI.el("div", { className: "l3-empty", text: "Aucun membre dans le groupe." }));
            return grid;
        }
        for (var i = 0; i < actors.length; i++) {
            grid.appendChild(L3UI.Components.ActorCard(actors[i]));
        }
        return grid;
    }

    function appendCustomPanels(scene, main) {
        var panels = Menu.panels(scene);
        if (!panels.length) return;
        var area = L3UI.el("section", { className: "l3-menu-panels" });
        for (var i = 0; i < panels.length; i++) {
            var rendered = panels[i].render ? panels[i].render(scene, panels[i]) : null;
            if (rendered) area.appendChild(rendered.element instanceof HTMLElement ? rendered.element : rendered);
        }
        main.appendChild(area);
    }

    function openActorPicker(scene, title, onPick) {
        var members = $gameParty.members();
        var modal = L3UI.Components.Modal({
            scene: scene,
            kicker: "Personnage",
            title: title || "Choisir un personnage"
        });
        var grid = L3UI.el("div", { className: "l3-menu-actor-picker" });
        modal.panel.appendChild(grid);

        var group = L3UI.Focus.createGroup("l3-actor-picker", {
            scene: scene,
            columns: 2,
            onCancel: function() {
                modal.close();
                if (scene._l3MenuGroup) L3UI.Focus.activate(scene._l3MenuGroup);
            }
        });

        for (var i = 0; i < members.length; i++) {
            (function(actor) {
                var card = L3UI.Components.ActorCard(actor);
                card.classList.add("l3-picker-card");
                grid.appendChild(card);
                group.add(card, { actor: actor }, {
                    handler: function(data) {
                        modal.close();
                        if (onPick) onPick(data.actor);
                    }
                });
            })(members[i]);
        }

        L3UI.Focus.activate(group);
    }

    function installMenuCss() {
        L3UI.addCss("l3-ui-menu-css",
            "#l3-ui-root{--l3-accent:" + config.secondary + ";--l3-accent-2:" + config.accent + ";}" +
            ".l3-title-screen{align-items:center;justify-content:center;padding:32px;text-align:center;}" +
            ".l3-title-block{width:410px;max-width:calc(100vw - 64px);pointer-events:auto;}" +
            ".l3-title-logo{margin:0 0 6px;font-size:38px;line-height:1.05;color:var(--l3-text);}" +
            ".l3-title-sub{margin-bottom:18px;color:var(--l3-muted);font-size:14px;}" +
            ".l3-title-block .l3-command-list{padding:14px;border:1px solid var(--l3-line);border-radius:var(--l3-radius);background:var(--l3-surface);box-shadow:var(--l3-shadow);}" +
            ".l3-menu-screen{display:grid;grid-template-columns:320px minmax(0,1fr);grid-column-gap:22px;grid-gap:22px;gap:22px;padding:28px;}" +
            ".l3-menu-sidebar{position:relative;display:flex;flex-direction:column;min-height:0;padding:18px;}" +
            ".l3-menu-game-title{margin:0 0 28px;font-size:27px;line-height:1.1;}" +
            ".l3-menu-sidebar .l3-command-list{gap:9px;}" +
            ".l3-menu-sidebar .l3-command{min-height:48px;margin-bottom:9px;}" +
            ".l3-menu-sidebar .l3-command:last-child{margin-bottom:0;}" +
            ".l3-menu-main{min-width:0;display:flex;flex-direction:column;padding:24px;}" +
            ".l3-menu-main-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;}" +
            ".l3-party-count{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;border:1px solid rgba(148,163,184,.32);color:var(--l3-muted);}" +
            ".l3-menu-actor-grid{display:grid;grid-template-columns:repeat(2,minmax(430px,1fr));grid-column-gap:30px;grid-row-gap:30px;grid-gap:30px;gap:30px;}" +
            ".l3-menu-actor-grid>.l3-actor-card{box-shadow:0 16px 42px rgba(0,0,0,.14);}" +
            ".l3-menu-footer{margin-top:auto;display:flex;justify-content:space-between;gap:12px;color:var(--l3-muted);font-size:13px;}" +
            ".l3-menu-footer strong{font-weight:500;color:var(--l3-text);}" +
            ".l3-menu-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));grid-column-gap:18px;grid-row-gap:18px;grid-gap:18px;gap:18px;margin-top:22px;}" +
            ".l3-menu-actor-picker{display:grid;grid-template-columns:repeat(2,minmax(400px,1fr));grid-column-gap:24px;grid-row-gap:24px;grid-gap:24px;gap:24px;margin-top:18px;}" +
            ".l3-picker-card{cursor:pointer;}" +
            ".l3-picker-card.is-marked{border-color:var(--l3-accent-2);background:linear-gradient(135deg,rgba(251,79,122,.28),rgba(56,189,248,.12));}" +
            ".l3-empty{padding:18px;border:1px dashed var(--l3-line);border-radius:6px;color:var(--l3-muted);}" +
            "@media (max-width: 900px){.l3-menu-screen{grid-template-columns:1fr;padding:14px;}.l3-menu-sidebar{min-height:auto}.l3-menu-actor-grid,.l3-menu-actor-picker{grid-template-columns:1fr}.l3-title-logo{font-size:32px;}}"
        );
    }

    var _Scene_Title_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function() {
        _Scene_Title_create.call(this);
        if (config.title) renderTitle(this);
    };

    var _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        if (config.title) {
            hideNativeTitle(this);
            if (buildBackground(config.titleBackground)) hideNativeTitleBackground(this);
        }
    };

    var _Scene_Title_update = Scene_Title.prototype.update;
    Scene_Title.prototype.update = function() {
        _Scene_Title_update.call(this);
        if (config.title) hideNativeTitle(this);
    };

    var _Scene_Menu_create = Scene_Menu.prototype.create;
    Scene_Menu.prototype.create = function() {
        _Scene_Menu_create.call(this);
        if (config.menu) renderMainMenu(this);
    };

    var _Scene_Menu_update = Scene_Menu.prototype.update;
    Scene_Menu.prototype.update = function() {
        _Scene_Menu_update.call(this);
        if (config.menu && this._l3MenuReady && Graphics.frameCount % 30 === 0) {
            if (config.hideNativeWindows) L3UI.hideNativeWindows(this);
        }
    };

    installMenuCss();
    if (L3UI.Services) L3UI.Services.register("menu", Menu);
    if (L3UI.Plugins) {
        L3UI.Plugins.register("L3_UIMenus", {
            version: "1.0.0",
            title: "L3 UI Menus",
            depends: ["L3_UICore"],
            provides: ["menu", "menu.commands", "menu.panels"],
            init: function(api) {
                api.Services.register("menu", Menu);
            }
        });
    }
    if (L3UI.Events) L3UI.Events.emit("menu:ready", { menu: Menu });
})();
