/*:
 * @plugindesc L3 UI Scenes v1.0 - Menus secondaires CSS pour RPG Maker MV.
 * @author L3ViKk
 * @version 1.0.0
 *
 * @param Enable Item Menu
 * @text Menu objets
 * @type boolean
 * @default true
 *
 * @param Enable Skill Menu
 * @text Menu competences
 * @type boolean
 * @default true
 *
 * @param Enable Equip Menu
 * @text Menu equipement
 * @type boolean
 * @default true
 *
 * @param Enable Status Menu
 * @text Menu etat
 * @type boolean
 * @default true
 *
 * @param Enable Options Menu
 * @text Menu options
 * @type boolean
 * @default true
 *
 * @param Enable File Menu
 * @text Sauvegarde chargement
 * @type boolean
 * @default true
 *
 * @param Enable Game End Menu
 * @text Menu quitter
 * @type boolean
 * @default true
 *
 * @param Enable Game Over Screen
 * @text Ecran game over
 * @type boolean
 * @default true
 *
 * @param Enable Shop Menu
 * @text Boutique
 * @type boolean
 * @default true
 *
 * @param Enable Battle Hud
 * @text HUD combat
 * @type boolean
 * @default true
 *
 * @param Enable Dialogue UI
 * @text Dialogues CSS
 * @type boolean
 * @default true
 *
 * @param Background Image
 * @text Image de fond
 * @type text
 * @default
 * @desc Nom du fichier dans img/pictures, ou chemin complet comme img/pictures/fond.png.
 *
 * @param Game Over Background Image
 * @text Fond game over
 * @type text
 * @default img/system/GameOver.png
 * @desc Nom du fichier dans img/pictures, ou chemin complet comme img/system/GameOver.png.
 *
 * @help
 * ============================================================================
 * L3 UI Scenes
 * ============================================================================
 *
 * Ce plugin complete L3_UIMenus avec les interfaces secondaires :
 * objets, competences, equipement, etat, options, sauvegarde, chargement,
 * quitter, game over, boutique et HUD de combat.
 *
 * Les scenes utilisent les donnees RPG Maker MV directement. Les anciennes
 * fenetres restent creees en arriere-plan quand MV en a besoin, mais
 * l'affichage principal est gere par L3 UI.
 *
 * Chargez ce plugin apres L3_UICore et L3_UIMenus.
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_UIScenes";
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
        item: readBool("Enable Item Menu", true),
        skill: readBool("Enable Skill Menu", true),
        equip: readBool("Enable Equip Menu", true),
        status: readBool("Enable Status Menu", true),
        options: readBool("Enable Options Menu", true),
        file: readBool("Enable File Menu", true),
        gameEnd: readBool("Enable Game End Menu", true),
        gameOver: readBool("Enable Game Over Screen", true),
        shop: readBool("Enable Shop Menu", true),
        battleHud: readBool("Enable Battle Hud", true),
        dialogue: readBool("Enable Dialogue UI", true),
        background: readText("Background Image", ""),
        gameOverBackground: readText("Game Over Background Image", "img/system/GameOver.png")
    };

    if (!window.L3UI || !L3UI.enabled) return;

    var Scenes = {};
    window.L3UIScenes = Scenes;

    function text(name, fallback) {
        if (!window.$dataSystem || !$dataSystem.terms || !window.TextManager) return fallback;
        try {
            return TextManager[name] || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function paramName(paramId) {
        if (window.TextManager && TextManager.param) return TextManager.param(paramId);
        var names = ["PV max", "PM max", "ATK", "DEF", "MAT", "MDF", "AGI", "LUK"];
        return names[paramId] || String(paramId);
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

    function backgroundCss() {
        var path = normalizePicturePath(config.background);
        if (!path && window.L3UI.Menu && L3UI.Menu.background) path = normalizePicturePath(L3UI.Menu.background);
        if (!path) return "";
        return "linear-gradient(90deg,rgba(8,13,24,.96),rgba(8,13,24,.74)), " + L3UI.cssUrl(path);
    }

    function layeredBackground(path, overlay) {
        path = normalizePicturePath(path);
        if (!path) return "";
        return (overlay || "linear-gradient(180deg,rgba(0,0,0,.34),rgba(0,0,0,.86))") + ", " + L3UI.cssUrl(path);
    }

    function itemLabel(item) {
        return item ? item.name : "-";
    }

    function equipmentClass(item) {
        return window.L3Equipment && L3Equipment.itemClass ? L3Equipment.itemClass(item) : "";
    }

    function appendEquipmentDetail(panel, item, actor) {
        if (window.L3Equipment && L3Equipment.appendItemDetail) {
            L3Equipment.appendItemDetail(panel, item, { actor: actor || null });
        }
    }

    function itemQty(item) {
        return item ? $gameParty.numItems(item) : 0;
    }

    function itemPrice(item) {
        return item && item.price !== undefined ? Number(item.price || 0) : 0;
    }

    function typeNameForItem(item) {
        if (!item) return "";
        if (DataManager.isWeapon(item)) return $dataSystem.weaponTypes[item.wtypeId] || text("weapon", "Arme");
        if (DataManager.isArmor(item)) return $dataSystem.armorTypes[item.atypeId] || text("armor", "Armure");
        if (DataManager.isItem(item)) return item.itypeId === 2 ? text("keyItem", "Objet cle") : text("item", "Objet");
        return "";
    }

    function itemDescription(item) {
        return item && item.description ? item.description : "Aucune description.";
    }

    function bestItemUser() {
        var members = $gameParty.movableMembers();
        var bestActor = members[0] || $gameParty.members()[0];
        var bestPha = -1;
        for (var i = 0; i < members.length; i++) {
            if (members[i].pha > bestPha) {
                bestPha = members[i].pha;
                bestActor = members[i];
            }
        }
        return bestActor;
    }

    function screenBase(scene, className, kicker, title) {
        L3UI.clear(scene);
        L3UI.hideNativeWindows(scene);

        var screen = L3UI.el("div", { className: "l3-screen l3-subscene-screen " + (className || "") });
        var bg = backgroundCss();
        if (bg) {
            screen.style.backgroundImage = bg;
            screen.style.backgroundSize = "cover";
            screen.style.backgroundPosition = "center";
        }

        var sidebar = L3UI.el("aside", { className: "l3-sub-sidebar l3-panel" });
        var main = L3UI.el("main", { className: "l3-sub-main l3-panel" });
        var detail = L3UI.el("aside", { className: "l3-sub-detail l3-panel" });

        sidebar.appendChild(L3UI.el("div", { className: "l3-kicker", text: kicker || "Menu" }));
        sidebar.appendChild(L3UI.el("h1", { className: "l3-sub-title", text: title || "" }));

        screen.appendChild(sidebar);
        screen.appendChild(main);
        screen.appendChild(detail);
        L3UI.mount(scene, screen);

        scene._l3SubSidebar = sidebar;
        scene._l3SubMain = main;
        scene._l3SubDetail = detail;
        var shell = { screen: screen, sidebar: sidebar, main: main, detail: detail };
        scene._l3SubShell = shell;
        if (L3UI.Events) {
            L3UI.Events.emit("uiScene:screen", {
                scene: scene,
                className: className || "",
                kicker: kicker || "",
                title: title || "",
                shell: shell
            });
        }
        return shell;
    }

    function setDetail(scene, content) {
        if (!scene._l3SubDetail) return;
        L3UI.empty(scene._l3SubDetail);
        if (content instanceof HTMLElement) {
            scene._l3SubDetail.appendChild(content);
        } else {
            scene._l3SubDetail.innerHTML = String(content || "");
        }
    }

    function helpFooter(parent, textValue) {
        parent.appendChild(L3UI.el("footer", { className: "l3-sub-footer", text: textValue || "ESC retour" }));
    }

    function statLine(label, value) {
        return L3UI.el("div", {
            className: "l3-stat-line",
            html: "<span>" + L3UI.escapeHtml(label) + "</span><strong>" + L3UI.escapeHtml(value) + "</strong>"
        });
    }

    function equipmentLine(label, item) {
        var line = statLine(label, item ? itemLabel(item) : "-");
        if (item && window.L3Equipment && L3Equipment.color) {
            line.className += " " + equipmentClass(item);
            var strong = line.querySelector("strong");
            if (strong) strong.style.color = L3Equipment.color(item);
        }
        return line;
    }

    function equipmentListDetail(item) {
        if (!item) return "Aucun equipement.";
        var parts = [];
        var type = typeNameForItem(item);
        if (type) parts.push(type);
        if (window.L3Equipment && L3Equipment.rarityData && L3Equipment.rarityId) {
            var rarity = L3Equipment.rarityData(L3Equipment.rarityId(item));
            if (rarity && rarity.name) parts.push(rarity.name);
        }
        if (window.L3Equipment && L3Equipment.describeItem) {
            var bonuses = L3Equipment.describeItem(item);
            if (bonuses && bonuses.length) parts.push(bonuses.slice(0, 2).join(", "));
        }
        var desc = itemDescription(item);
        if (desc && desc !== "Aucune description.") parts.push(desc);
        if (!parts.length) parts.push("Aucune description.");
        return parts.join(" | ");
    }

    function buildItemDetail(item, extra, actor) {
        var panel = L3UI.el("div", { className: "l3-detail-stack" });
        panel.appendChild(L3UI.el("div", { className: "l3-kicker", text: typeNameForItem(item) || "Detail" }));
        panel.appendChild(L3UI.el("h2", { className: "l3-title", text: itemLabel(item) }));
        panel.appendChild(L3UI.el("p", { className: "l3-detail-desc", text: itemDescription(item) }));
        if (item) {
            panel.appendChild(statLine("Possession", itemQty(item)));
            if (itemPrice(item) > 0) panel.appendChild(statLine("Prix", itemPrice(item) + " " + text("currencyUnit", "G")));
        }
        appendEquipmentDetail(panel, item, actor);
        if (extra) panel.appendChild(extra);
        return panel;
    }

    function makeButtonList(scene, id, items, options) {
        options = options || {};
        var list = L3UI.Components.CommandList({
            id: id,
            scene: scene,
            items: items,
            columns: options.columns || 1,
            wrap: options.wrap !== false,
            index: options.index || 0,
            onChange: options.onChange,
            onCancel: options.onCancel || function() { scene.popScene(); }
        });
        return list;
    }

    function actorPicker(scene, title, onPick, onCancel) {
        var members = $gameParty.members();
        var modal = L3UI.Components.Modal({
            scene: scene,
            kicker: "Personnage",
            title: title || "Choisir une cible"
        });
        var grid = L3UI.el("div", { className: "l3-scene-actor-picker" });
        modal.panel.appendChild(grid);

        var group = L3UI.Focus.createGroup("l3-scenes-actor-picker", {
            scene: scene,
            columns: 2,
            onCancel: function() {
                modal.close();
                if (onCancel) onCancel();
            }
        });

        for (var i = 0; i < members.length; i++) {
            (function(actor) {
                var card = L3UI.Components.ActorCard(actor, { faceSize: 96 });
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

    function playObjectSound(item) {
        if (DataManager.isSkill(item)) SoundManager.playUseSkill();
        else SoundManager.playUseItem();
    }

    function canUseObject(user, item, targets) {
        if (!user || !item || !user.canUse(item)) return false;
        var action = new Game_Action(user);
        action.setItemObject(item);
        if (!action.isForFriend()) return true;
        targets = targets || $gameParty.members();
        return targets.some(function(target) {
            return action.testApply(target);
        });
    }

    function applyObject(scene, user, item, targets, refresh) {
        if (!canUseObject(user, item, targets)) {
            SoundManager.playBuzzer();
            return;
        }
        var action = new Game_Action(user);
        action.setItemObject(item);
        playObjectSound(item);
        user.useItem(item);
        targets = targets || [];
        for (var i = 0; i < targets.length; i++) {
            for (var r = 0; r < action.numRepeats(); r++) {
                action.apply(targets[i]);
            }
        }
        action.applyGlobal();
        if ($gameTemp.isCommonEventReserved()) {
            SceneManager.goto(Scene_Map);
            return;
        }
        scene.checkGameover();
        if (refresh) refresh();
    }

    function useObject(scene, user, item, refresh) {
        var action = new Game_Action(user);
        action.setItemObject(item);
        if (action.isForFriend()) {
            if (action.isForAll()) {
                applyObject(scene, user, item, $gameParty.members(), refresh);
            } else {
                actorPicker(scene, "Choisir une cible", function(actor) {
                    applyObject(scene, user, item, [actor], refresh);
                }, refresh);
            }
        } else {
            applyObject(scene, user, item, [], refresh);
        }
    }

    function itemCategoryItems(category) {
        var all = $gameParty.allItems();
        var result = [];
        for (var i = 0; i < all.length; i++) {
            var item = all[i];
            if (!item) continue;
            if (category === "item" && DataManager.isItem(item) && item.itypeId === 1) result.push(item);
            if (category === "weapon" && DataManager.isWeapon(item)) result.push(item);
            if (category === "armor" && DataManager.isArmor(item)) result.push(item);
            if (category === "keyItem" && DataManager.isItem(item) && item.itypeId === 2) result.push(item);
        }
        return result;
    }

    function renderItemScene(scene, focus) {
        scene._l3ItemState = scene._l3ItemState || { category: "item" };
        var state = scene._l3ItemState;
        var shell = screenBase(scene, "l3-item-scene", "Inventaire", text("item", "Objets"));
        var categories = [
            { id: "item", label: text("item", "Objets"), right: String(itemCategoryItems("item").length) },
            { id: "weapon", label: text("weapon", "Armes"), right: String(itemCategoryItems("weapon").length) },
            { id: "armor", label: text("armor", "Armures"), right: String(itemCategoryItems("armor").length) },
            { id: "keyItem", label: text("keyItem", "Objets cles"), right: String(itemCategoryItems("keyItem").length) }
        ];

        var catItems = categories.map(function(category) {
            return {
                label: category.label,
                right: category.right,
                className: category.id === state.category ? "is-current" : "",
                handler: function() {
                    state.category = category.id;
                    renderItemScene(scene, "items");
                }
            };
        });
        var catList = makeButtonList(scene, "l3-item-categories", catItems, {
            onCancel: function() { scene.popScene(); }
        });
        shell.sidebar.appendChild(catList.element);
        helpFooter(shell.sidebar, "OK choisir | ESC retour");

        var items = itemCategoryItems(state.category);
        shell.main.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Liste" }));
        shell.main.appendChild(L3UI.el("h2", { className: "l3-title", text: categories.filter(function(c) { return c.id === state.category; })[0].label }));

        if (!items.length) {
            shell.main.appendChild(L3UI.el("div", { className: "l3-empty", text: "Aucun objet dans cette categorie." }));
            setDetail(scene, buildItemDetail(null));
            L3UI.Focus.activate(catList.group);
            return;
        }

        var itemCommands = items.map(function(item) {
            return {
                label: itemLabel(item),
                right: "x" + itemQty(item),
                detail: itemDescription(item),
                className: equipmentClass(item),
                enabled: true,
                handler: function() {
                    if (DataManager.isItem(item)) {
                        $gameParty.setLastItem(item);
                        useObject(scene, bestItemUser(), item, function() { renderItemScene(scene, "items"); });
                    } else {
                        SoundManager.playBuzzer();
                    }
                }
            };
        });
        var itemList = makeButtonList(scene, "l3-item-list", itemCommands, {
            onChange: function(current, index) {
                if (current && current.data) setDetail(scene, buildItemDetail(items[index]));
            },
            onCancel: function() { L3UI.Focus.activate(catList.group); }
        });
        shell.main.appendChild(itemList.element);
        setDetail(scene, buildItemDetail(items[0]));
        L3UI.Focus.activate(focus === "items" ? itemList.group : catList.group);
    }

    function actorForScene(scene) {
        return scene.actor ? scene.actor() : $gameParty.menuActor();
    }

    function renderSkillScene(scene, focus) {
        scene._l3SkillState = scene._l3SkillState || {};
        var actor = actorForScene(scene);
        var state = scene._l3SkillState;
        var typeIds = actor.addedSkillTypes().sort(function(a, b) { return a - b; });
        state.stypeId = state.stypeId || typeIds[0] || 1;
        var shell = screenBase(scene, "l3-skill-scene", "Competences", actor.name());

        shell.sidebar.appendChild(L3UI.Components.ActorCard(actor, { faceSize: 96 }));
        var typeButtons = typeIds.map(function(typeId) {
            return {
                label: $dataSystem.skillTypes[typeId] || ("Type " + typeId),
                className: typeId === state.stypeId ? "is-current" : "",
                handler: function() {
                    state.stypeId = typeId;
                    renderSkillScene(scene, "skills");
                }
            };
        });
        var types = makeButtonList(scene, "l3-skill-types", typeButtons, {
            onCancel: function() { scene.popScene(); }
        });
        shell.sidebar.appendChild(types.element);
        helpFooter(shell.sidebar, "Page acteur natif | ESC retour");

        var skills = actor.skills().filter(function(skill) { return skill.stypeId === state.stypeId; });
        shell.main.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Liste" }));
        shell.main.appendChild(L3UI.el("h2", { className: "l3-title", text: $dataSystem.skillTypes[state.stypeId] || "Competences" }));

        if (!skills.length) {
            shell.main.appendChild(L3UI.el("div", { className: "l3-empty", text: "Aucune competence dans ce type." }));
            setDetail(scene, buildItemDetail(null));
            L3UI.Focus.activate(types.group);
            return;
        }

        var skillButtons = skills.map(function(skill) {
            return {
                label: skill.name,
                right: skill.mpCost ? skill.mpCost + " PM" : "",
                detail: skill.description || "",
                enabled: actor.canUse(skill),
                handler: function() {
                    actor.setLastMenuSkill(skill);
                    useObject(scene, actor, skill, function() { renderSkillScene(scene, "skills"); });
                }
            };
        });
        var skillList = makeButtonList(scene, "l3-skill-list", skillButtons, {
            onChange: function(current, index) {
                setDetail(scene, buildItemDetail(skills[index]));
            },
            onCancel: function() { L3UI.Focus.activate(types.group); }
        });
        shell.main.appendChild(skillList.element);
        setDetail(scene, buildItemDetail(skills[0]));
        L3UI.Focus.activate(focus === "skills" ? skillList.group : types.group);
    }

    function equipCandidates(actor, slotId) {
        var etypeId = actor.equipSlots()[slotId];
        var result = [null];
        var items = $gameParty.equipItems();
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item && item.etypeId === etypeId && actor.canEquip(item)) result.push(item);
        }
        return result;
    }

    function canChangeEquipSlot(actor, slotId) {
        return !actor.isEquipChangeOk || actor.isEquipChangeOk(slotId);
    }

    function applyEquipChange(scene, actor, slotId, item) {
        if (!canChangeEquipSlot(actor, slotId)) {
            SoundManager.playBuzzer();
            return false;
        }
        var oldItem = actor.equips()[slotId];
        actor.changeEquip(slotId, item);
        var newItem = actor.equips()[slotId];
        if (newItem !== item) {
            SoundManager.playBuzzer();
            return false;
        }
        if (oldItem !== newItem) SoundManager.playEquip();
        return true;
    }

    function renderEquipScene(scene, focus) {
        scene._l3EquipState = scene._l3EquipState || { slotId: 0 };
        var state = scene._l3EquipState;
        var actor = actorForScene(scene);
        var shell = screenBase(scene, "l3-equip-scene", "Equipement", actor.name());
        shell.sidebar.appendChild(L3UI.Components.ActorCard(actor, { faceSize: 96 }));

        var tools = makeButtonList(scene, "l3-equip-tools", [
            {
                label: "Optimiser",
                handler: function() {
                    SoundManager.playEquip();
                    actor.optimizeEquipments();
                    renderEquipScene(scene, "slots");
                }
            },
            {
                label: "Tout retirer",
                handler: function() {
                    SoundManager.playEquip();
                    actor.clearEquipments();
                    renderEquipScene(scene, "slots");
                }
            }
        ], {
            onCancel: function() { scene.popScene(); }
        });
        shell.sidebar.appendChild(tools.element);
        helpFooter(shell.sidebar, "OK action | ESC retour");

        shell.main.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Emplacements" }));
        shell.main.appendChild(L3UI.el("h2", { className: "l3-title", text: "Equipement actuel" }));
        var equips = actor.equips();
        var slots = actor.equipSlots();
        var slotButtons = [];
        for (var i = 0; i < slots.length; i++) {
            (function(slotId) {
                var item = equips[slotId];
                slotButtons.push({
                    label: $dataSystem.equipTypes[slots[slotId]] || ("Slot " + (slotId + 1)),
                    right: item ? item.name : "-",
                    detail: item ? item.name : "Vide",
                    className: (slotId === state.slotId ? "is-current " : "") + equipmentClass(item),
                    handler: function() {
                        state.slotId = slotId;
                        renderEquipScene(scene, "items");
                    }
                });
            })(i);
        }
        var slotList = makeButtonList(scene, "l3-equip-slots", slotButtons, {
            onChange: function(current, index) {
                setDetail(scene, buildEquipDetail(actor, equips[index]));
            },
            onCancel: function() { scene.popScene(); }
        });
        shell.main.appendChild(slotList.element);

        var candidates = equipCandidates(actor, state.slotId);
        var candidateBox = L3UI.el("section", { className: "l3-sub-list-section" });
        candidateBox.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Changer" }));
        var currentItem = equips[state.slotId];
        var canChangeSlot = canChangeEquipSlot(actor, state.slotId);
        var candidateDetailItems = [currentItem];
        var candidateButtons = [{
            icon: "-",
            label: currentItem ? itemLabel(currentItem) : "Vide",
            right: "",
            detail: currentItem ? "Retirer cet equipement." : "Aucun equipement porte sur cet emplacement.",
            className: "l3-equip-action l3-equip-remove " + equipmentClass(currentItem),
            enabled: !!currentItem && canChangeSlot,
            handler: function() {
                if (applyEquipChange(scene, actor, state.slotId, null)) {
                    renderEquipScene(scene, "items");
                }
            }
        }];
        for (var ci = 1; ci < candidates.length; ci++) {
            (function(item) {
                candidateButtons.push({
                    icon: "+",
                    label: itemLabel(item),
                    right: "x" + itemQty(item),
                    detail: equipmentListDetail(item),
                    className: "l3-equip-action l3-equip-add " + equipmentClass(item),
                    enabled: canChangeSlot,
                    handler: function() {
                        if (applyEquipChange(scene, actor, state.slotId, item)) {
                            renderEquipScene(scene, "items");
                        }
                    }
                });
                candidateDetailItems.push(item);
            })(candidates[ci]);
        }
        var firstEnabledCandidate = 0;
        for (var c = 0; c < candidateButtons.length; c++) {
            if (candidateButtons[c].enabled !== false) {
                firstEnabledCandidate = c;
                break;
            }
        }
        var candidateList = makeButtonList(scene, "l3-equip-items", candidateButtons, {
            index: firstEnabledCandidate,
            onChange: function(current, index) {
                setDetail(scene, buildEquipDetail(actor, candidateDetailItems[index]));
            },
            onCancel: function() { L3UI.Focus.activate(slotList.group); }
        });
        candidateBox.appendChild(candidateList.element);
        if (candidates.length <= 1) {
            candidateBox.appendChild(L3UI.el("div", {
                className: "l3-empty l3-equip-empty",
                text: currentItem ? "Aucun autre equipement compatible disponible dans l'inventaire." : "Aucun equipement compatible disponible dans l'inventaire."
            }));
        }
        shell.main.appendChild(candidateBox);
        setDetail(scene, buildEquipDetail(actor, equips[state.slotId]));
        L3UI.Focus.activate(focus === "items" ? candidateList.group : slotList.group);
    }

    function buildEquipDetail(actor, item) {
        var panel = buildItemDetail(item, null, actor);
        var params = L3UI.el("div", { className: "l3-param-grid" });
        for (var i = 2; i <= 7; i++) {
            var current = actor.param(i);
            var next = current;
            if (item) {
                var slotId = 0;
                var slots = actor.equipSlots();
                for (var s = 0; s < slots.length; s++) {
                    if (slots[s] === item.etypeId) {
                        slotId = s;
                        break;
                    }
                }
                var old = actor.equips()[slotId];
                next = current + item.params[i] - (old ? old.params[i] : 0);
            }
            params.appendChild(statLine(paramName(i), current + " > " + next));
        }
        panel.appendChild(params);
        return panel;
    }

    function renderStatusScene(scene) {
        var actor = actorForScene(scene);
        var shell = screenBase(scene, "l3-status-scene", "Etat", actor.name());
        var actorButtons = $gameParty.members().map(function(member) {
            return {
                label: member.name(),
                right: "Lv " + member.level,
                className: member === actor ? "is-current" : "",
                handler: function() {
                    $gameParty.setMenuActor(member);
                    if (scene._actor) scene._actor = member;
                    renderStatusScene(scene);
                }
            };
        });
        var actors = makeButtonList(scene, "l3-status-actors", actorButtons, {
            onCancel: function() { scene.popScene(); }
        });
        shell.sidebar.appendChild(actors.element);
        helpFooter(shell.sidebar, "OK acteur | ESC retour");

        shell.main.appendChild(L3UI.Components.ActorCard(actor));
        var grid = L3UI.el("div", { className: "l3-status-grid" });
        for (var i = 0; i <= 7; i++) {
            grid.appendChild(statLine(paramName(i), actor.param(i)));
        }
        shell.main.appendChild(grid);

        var detail = L3UI.el("div", { className: "l3-detail-stack" });
        detail.appendChild(L3UI.el("div", { className: "l3-kicker", text: actor.currentClass().name }));
        detail.appendChild(L3UI.el("h2", { className: "l3-title", text: actor.name() }));
        detail.appendChild(statLine("Niveau", actor.level));
        detail.appendChild(statLine("EXP", actor.currentExp ? actor.currentExp() : "-"));
        if (actor.profile) detail.appendChild(L3UI.el("p", { className: "l3-detail-desc", text: actor.profile() || "" }));
        var equipList = L3UI.el("div", { className: "l3-small-list" });
        actor.equips().forEach(function(item) {
            equipList.appendChild(equipmentLine(item ? typeNameForItem(item) : "Equipement", item));
        });
        detail.appendChild(equipList);
        setDetail(scene, detail);
        L3UI.Focus.activate(actors.group);
    }

    function optionDefinitions() {
        return [
            { symbol: "alwaysDash", label: text("alwaysDash", "Toujours courir"), type: "bool" },
            { symbol: "commandRemember", label: text("commandRemember", "Memoire commande"), type: "bool" },
            { symbol: "bgmVolume", label: text("bgmVolume", "Volume BGM"), type: "volume" },
            { symbol: "bgsVolume", label: text("bgsVolume", "Volume BGS"), type: "volume" },
            { symbol: "meVolume", label: text("meVolume", "Volume ME"), type: "volume" },
            { symbol: "seVolume", label: text("seVolume", "Volume SE"), type: "volume" }
        ];
    }

    function optionValue(option) {
        var value = ConfigManager[option.symbol];
        if (option.type === "bool") return value ? "ON" : "OFF";
        return String(value) + "%";
    }

    function changeOption(option, delta) {
        if (option.type === "bool") {
            ConfigManager[option.symbol] = !ConfigManager[option.symbol];
        } else {
            var value = Number(ConfigManager[option.symbol] || 0) + (delta || 20);
            if (value > 100) value = 0;
            if (value < 0) value = 100;
            ConfigManager[option.symbol] = value;
        }
        SoundManager.playCursor();
        ConfigManager.save();
    }

    function renderOptionsScene(scene) {
        var shell = screenBase(scene, "l3-options-scene", "Systeme", text("options", "Options"));
        var defs = optionDefinitions();
        var buttons = defs.map(function(option) {
            return {
                label: option.label,
                right: optionValue(option),
                handler: function() {
                    changeOption(option, 20);
                    renderOptionsScene(scene);
                }
            };
        });
        var list = makeButtonList(scene, "l3-options-list", buttons, {
            onChange: function(current, index) {
                setDetail(scene, buildOptionDetail(defs[index]));
            },
            onCancel: function() { scene.popScene(); }
        });
        shell.main.appendChild(list.element);
        helpFooter(shell.sidebar, "OK modifier | ESC retour");
        setDetail(scene, buildOptionDetail(defs[0]));
        L3UI.Focus.activate(list.group);
    }

    function buildOptionDetail(option) {
        var panel = L3UI.el("div", { className: "l3-detail-stack" });
        panel.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Option" }));
        panel.appendChild(L3UI.el("h2", { className: "l3-title", text: option.label }));
        panel.appendChild(statLine("Valeur", optionValue(option)));
        panel.appendChild(L3UI.el("p", { className: "l3-detail-desc", text: "OK change la valeur. Les options sont sauvegardees automatiquement." }));
        return panel;
    }

    function savefileInfo(fileId) {
        return DataManager.loadSavefileInfo(fileId);
    }

    function savefileLabel(fileId) {
        var info = savefileInfo(fileId);
        if (!info) return "Fichier " + fileId;
        return info.title || ("Fichier " + fileId);
    }

    function savefileDetail(fileId) {
        var info = savefileInfo(fileId);
        var panel = L3UI.el("div", { className: "l3-detail-stack" });
        panel.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Fichier " + fileId }));
        panel.appendChild(L3UI.el("h2", { className: "l3-title", text: savefileLabel(fileId) }));
        if (info) {
            panel.appendChild(statLine("Temps", info.playtime || "-"));
            panel.appendChild(statLine("Sauvegarde", info.timestamp ? new Date(info.timestamp).toLocaleString() : "-"));
        } else {
            panel.appendChild(L3UI.el("p", { className: "l3-detail-desc", text: "Aucune donnee sur cet emplacement." }));
        }
        return panel;
    }

    function renderFileScene(scene, mode) {
        DataManager.loadAllSavefileImages();
        var title = mode === "save" ? text("save", "Sauvegarder") : text("load", "Charger");
        var shell = screenBase(scene, "l3-file-scene", "Fichiers", title);
        var buttons = [];
        for (var i = 1; i <= DataManager.maxSavefiles(); i++) {
            (function(fileId) {
                var info = savefileInfo(fileId);
                buttons.push({
                    label: "Fichier " + fileId,
                    right: info ? (info.playtime || "") : "Vide",
                    detail: info ? savefileLabel(fileId) : "Aucune sauvegarde",
                    enabled: mode === "save" || !!info,
                    handler: function() {
                        if (mode === "save") doSave(scene, fileId);
                        else doLoad(scene, fileId);
                    }
                });
            })(i);
        }
        var list = makeButtonList(scene, "l3-file-list-" + mode, buttons, {
            onChange: function(current, index) { setDetail(scene, savefileDetail(index + 1)); },
            onCancel: function() { scene.popScene(); }
        });
        shell.main.appendChild(list.element);
        helpFooter(shell.sidebar, "OK " + title.toLowerCase() + " | ESC retour");
        setDetail(scene, savefileDetail(1));
        L3UI.Focus.activate(list.group);
    }

    function doSave(scene, fileId) {
        $gameSystem.onBeforeSave();
        if (DataManager.saveGame(fileId)) {
            SoundManager.playSave();
            StorageManager.cleanBackup(fileId);
            scene.popScene();
        } else {
            SoundManager.playBuzzer();
        }
    }

    function doLoad(scene, fileId) {
        if (!DataManager.loadSavefileInfo(fileId)) {
            SoundManager.playBuzzer();
            return;
        }
        if (DataManager.loadGame(fileId)) {
            SoundManager.playLoad();
            scene.fadeOutAll();
            if (scene.reloadMapIfUpdated) scene.reloadMapIfUpdated();
            SceneManager.goto(Scene_Map);
            scene._loadSuccess = true;
        } else {
            SoundManager.playBuzzer();
        }
    }

    function renderGameEndScene(scene) {
        var shell = screenBase(scene, "l3-game-end-scene", "Systeme", text("gameEnd", "Quitter le jeu"));
        var list = makeButtonList(scene, "l3-game-end-list", [
            {
                label: "Retour au titre",
                right: ">",
                handler: function() {
                    scene.fadeOutAll();
                    SceneManager.goto(Scene_Title);
                }
            },
            {
                label: "Annuler",
                handler: function() { scene.popScene(); }
            }
        ], {
            onCancel: function() { scene.popScene(); }
        });
        shell.main.appendChild(list.element);
        setDetail(scene, L3UI.Components.Panel({
            kicker: "Confirmation",
            title: "Retour au titre",
            content: "La progression non sauvegardee sera perdue."
        }));
        L3UI.Focus.activate(list.group);
    }

    function renderGameoverScene(scene) {
        L3UI.clear(scene);
        if (scene._backSprite) scene._backSprite.visible = false;
        var screen = L3UI.el("div", { className: "l3-gameover-screen" });
        var background = layeredBackground(config.gameOverBackground, "linear-gradient(180deg,rgba(0,0,0,.30),rgba(0,0,0,.88))");
        if (background) {
            screen.style.backgroundImage = background;
            screen.style.backgroundSize = "cover";
            screen.style.backgroundPosition = "center";
        }

        var panel = L3UI.el("section", { className: "l3-gameover-panel" });
        panel.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Fin de partie" }));
        panel.appendChild(L3UI.el("h1", { className: "l3-gameover-title", text: "Game Over" }));
        panel.appendChild(L3UI.el("p", {
            className: "l3-detail-desc",
            text: "La partie est terminee. Retournez au titre pour reprendre depuis une sauvegarde."
        }));

        var commands = L3UI.Components.CommandList({
            id: "l3-gameover-commands",
            scene: scene,
            items: [
                {
                    label: "Retour au titre",
                    right: ">",
                    handler: function() {
                        SoundManager.playOk();
                        scene.gotoTitle();
                    }
                }
            ],
            onCancel: function() {
                scene.gotoTitle();
            }
        });
        panel.appendChild(commands.element);
        screen.appendChild(panel);
        L3UI.mount(scene, screen);
        L3UI.Focus.activate(commands.group);
    }

    function shopItemFromGood(good) {
        if (!good) return null;
        if (good[0] === 0) return $dataItems[good[1]];
        if (good[0] === 1) return $dataWeapons[good[1]];
        if (good[0] === 2) return $dataArmors[good[1]];
        return null;
    }

    function shopPrice(good, item) {
        if (!good || !item) return 0;
        return good[2] === 0 ? item.price : good[3];
    }

    function sellableItems() {
        return $gameParty.allItems().filter(function(item) {
            return item && itemPrice(item) > 0 && itemQty(item) > 0;
        });
    }

    function renderShopScene(scene, mode) {
        scene._l3ShopMode = mode || scene._l3ShopMode || "command";
        var shell = screenBase(scene, "l3-shop-scene", "Boutique", L3UI.formatNumber($gameParty.gold()) + " " + text("currencyUnit", "G"));
        var commandItems = [
            {
                label: "Acheter",
                right: ">",
                handler: function() { scene._l3ShopMode = "buy"; renderShopScene(scene, "buy"); }
            },
            {
                label: "Vendre",
                right: scene._purchaseOnly ? "-" : ">",
                enabled: !scene._purchaseOnly,
                handler: function() { scene._l3ShopMode = "sell"; renderShopScene(scene, "sell"); }
            },
            {
                label: "Quitter",
                handler: function() { scene.popScene(); }
            }
        ];
        var commands = makeButtonList(scene, "l3-shop-commands", commandItems, {
            onCancel: function() { scene.popScene(); }
        });
        shell.sidebar.appendChild(commands.element);
        helpFooter(shell.sidebar, "OK action | ESC retour");

        if (scene._l3ShopMode === "buy") renderShopBuy(scene, shell);
        else if (scene._l3ShopMode === "sell") renderShopSell(scene, shell);
        else {
            shell.main.appendChild(L3UI.el("div", { className: "l3-empty", text: "Choisissez acheter ou vendre." }));
            setDetail(scene, L3UI.Components.Panel({ kicker: "Boutique", title: "Bienvenue", content: "Selectionnez une action." }));
            L3UI.Focus.activate(commands.group);
        }
    }

    function renderShopBuy(scene, shell) {
        var goods = scene._goods || [];
        shell.main.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Articles" }));
        shell.main.appendChild(L3UI.el("h2", { className: "l3-title", text: "Acheter" }));
        if (!goods.length) {
            shell.main.appendChild(L3UI.el("div", { className: "l3-empty", text: "Aucun article disponible." }));
            return;
        }
        var buttons = goods.map(function(good) {
            var item = shopItemFromGood(good);
            var price = shopPrice(good, item);
            return {
                label: itemLabel(item),
                right: price + " " + text("currencyUnit", "G"),
                detail: itemDescription(item),
                className: equipmentClass(item),
                enabled: item && $gameParty.gold() >= price && $gameParty.numItems(item) < $gameParty.maxItems(item),
                handler: function() {
                    var max = maxBuy(item, price);
                    if (!item || max <= 0) {
                        SoundManager.playBuzzer();
                        return;
                    }
                    openQuantityModal(scene, item, max, price, "Acheter", function(number) {
                        SoundManager.playShop();
                        $gameParty.loseGold(price * number);
                        $gameParty.gainItem(item, number);
                        renderShopScene(scene, "buy");
                    }, function() {
                        renderShopScene(scene, "buy");
                    });
                }
            };
        });
        var list = makeButtonList(scene, "l3-shop-buy", buttons, {
            onChange: function(current, index) {
                var good = goods[index];
                var item = shopItemFromGood(good);
                setDetail(scene, buildShopDetail(item, shopPrice(good, item), "Achat x1"));
            },
            onCancel: function() { renderShopScene(scene, "command"); }
        });
        shell.main.appendChild(list.element);
        var firstItem = shopItemFromGood(goods[0]);
        setDetail(scene, buildShopDetail(firstItem, shopPrice(goods[0], firstItem), "Achat x1"));
        L3UI.Focus.activate(list.group);
    }

    function renderShopSell(scene, shell) {
        var items = sellableItems();
        shell.main.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Inventaire" }));
        shell.main.appendChild(L3UI.el("h2", { className: "l3-title", text: "Vendre" }));
        if (!items.length) {
            shell.main.appendChild(L3UI.el("div", { className: "l3-empty", text: "Aucun article a vendre." }));
            return;
        }
        var buttons = items.map(function(item) {
            var price = Math.floor(itemPrice(item) / 2);
            return {
                label: itemLabel(item),
                right: price + " " + text("currencyUnit", "G"),
                detail: "Possession x" + itemQty(item),
                className: equipmentClass(item),
                handler: function() {
                    openQuantityModal(scene, item, itemQty(item), price, "Vendre", function(number) {
                        SoundManager.playShop();
                        $gameParty.gainGold(price * number);
                        $gameParty.loseItem(item, number);
                        renderShopScene(scene, "sell");
                    }, function() {
                        renderShopScene(scene, "sell");
                    });
                }
            };
        });
        var list = makeButtonList(scene, "l3-shop-sell", buttons, {
            onChange: function(current, index) {
                setDetail(scene, buildShopDetail(items[index], Math.floor(itemPrice(items[index]) / 2), "Vente x1"));
            },
            onCancel: function() { renderShopScene(scene, "command"); }
        });
        shell.main.appendChild(list.element);
        setDetail(scene, buildShopDetail(items[0], Math.floor(itemPrice(items[0]) / 2), "Vente x1"));
        L3UI.Focus.activate(list.group);
    }

    function buildShopDetail(item, price, action) {
        var extra = L3UI.el("div", { className: "l3-detail-extra" });
        extra.appendChild(statLine("Action", action));
        extra.appendChild(statLine("Prix", price + " " + text("currencyUnit", "G")));
        extra.appendChild(statLine("Possession", itemQty(item)));
        return buildItemDetail(item, extra);
    }

    function maxBuy(item, price) {
        var max = $gameParty.maxItems(item) - $gameParty.numItems(item);
        if (price > 0) max = Math.min(max, Math.floor($gameParty.gold() / price));
        return Math.max(0, max);
    }

    function openQuantityModal(scene, item, max, price, title, onConfirm, onCancel) {
        var number = 1;
        var modal = L3UI.Components.Modal({
            scene: scene,
            kicker: title,
            title: item.name
        });
        var display = L3UI.el("div", { className: "l3-quantity-display" });
        modal.panel.appendChild(display);

        function refresh() {
            display.innerHTML =
                "<div class=\"l3-quantity-number\">x" + L3UI.escapeHtml(number) + "</div>" +
                "<div class=\"l3-quantity-total\">" + L3UI.escapeHtml(price * number + " " + text("currencyUnit", "G")) + "</div>" +
                "<div class=\"l3-detail-desc\">Maximum : " + L3UI.escapeHtml(max) + "</div>";
        }

        var actions = L3UI.Components.CommandList({
            id: "l3-shop-quantity",
            scene: scene,
            items: [
                { label: "-10", handler: function() { number = Math.max(1, number - 10); refresh(); } },
                { label: "-1", handler: function() { number = Math.max(1, number - 1); refresh(); } },
                { label: "+1", handler: function() { number = Math.min(max, number + 1); refresh(); } },
                { label: "+10", handler: function() { number = Math.min(max, number + 10); refresh(); } },
                {
                    label: "Valider",
                    right: ">",
                    handler: function() {
                        modal.close();
                        if (onConfirm) onConfirm(number);
                    }
                }
            ],
            onCancel: function() {
                modal.close();
                if (onCancel) onCancel();
            }
        });
        modal.panel.appendChild(actions.element);
        refresh();
        L3UI.Focus.activate(actions.group);
    }

    function installBattleHud(scene) {
        if (!config.battleHud || scene._l3BattleHudReady) return;
        scene._l3BattleHudReady = true;
        L3UI.layer(scene, "battle");
        renderBattleHud(scene, true);
    }

    function quietBattleWindow(win, closeWindow, parkWindow) {
        if (!win) return;
        win.opacity = 0;
        win.contentsOpacity = 0;
        win.visible = false;
        if (closeWindow !== false && win.hasOwnProperty("openness")) win.openness = 0;
        if (parkWindow) {
            win.x = -Math.max(win.width || 0, 240) - 80;
            win.y = -Math.max(win.height || 0, 120) - 80;
        }
    }

    function quietBattleWindows(scene) {
        quietBattleWindow(scene._statusWindow, true, true);
        quietBattleWindow(scene._partyCommandWindow, false, true);
        quietBattleWindow(scene._actorCommandWindow, false, true);
        quietBattleWindow(scene._helpWindow, true, true);
        quietBattleWindow(scene._skillWindow, false, true);
        quietBattleWindow(scene._itemWindow, false, true);
        quietBattleWindow(scene._enemyWindow, false, true);
        quietBattleWindow(scene._actorWindow, false, true);
        quietBattleWindow(scene._logWindow, true, true);
        quietBattleWindow(scene._messageWindow, false, true);
        quietBattleWindow(scene._scrollTextWindow, true, true);
        if (scene._messageWindow && scene._messageWindow.subWindows) {
            var subWindows = scene._messageWindow.subWindows();
            for (var s = 0; s < subWindows.length; s++) quietBattleWindow(subWindows[s], false, true);
        }
    }

    function battleHudMode(scene) {
        if (scene._partyCommandWindow && scene._partyCommandWindow.active) return "party";
        if (scene._actorCommandWindow && scene._actorCommandWindow.active && BattleManager.actor()) return "actor";
        if (scene._skillWindow && scene._skillWindow.active) return "skill";
        if (scene._itemWindow && scene._itemWindow.active) return "item";
        if (scene._enemyWindow && scene._enemyWindow.active) return "enemy";
        if (scene._actorWindow && scene._actorWindow.active) return "targetActor";
        return "wait";
    }

    function battleHudSignature(scene) {
        var parts = [battleHudMode(scene)];
        var actor = BattleManager.actor();
        parts.push(actor ? actor.actorId() : 0);
        parts.push(scene._skillWindow && scene._skillWindow._data ? scene._skillWindow._data.length : 0);
        parts.push(scene._itemWindow && scene._itemWindow._data ? scene._itemWindow._data.length : 0);
        parts.push(scene._enemyWindow && scene._enemyWindow._enemies ? scene._enemyWindow._enemies.length : 0);
        $gameParty.battleMembers().forEach(function(member) {
            parts.push([
                member.actorId(),
                member.hp,
                member.mp,
                member.tp || 0,
                member.isAlive() ? 1 : 0,
                member.isInputting ? (member.isInputting() ? 1 : 0) : 0
            ].join(":"));
        });
        return parts.join("|");
    }

    function battleWindowData(win) {
        if (!win) return [];
        if (win._data && win._data.length) return win._data;
        if (win._enemies && win._enemies.length) return win._enemies;
        return [];
    }

    function battleSkillCost(actor, skill) {
        if (!actor || !skill) return "";
        var tp = actor.skillTpCost ? actor.skillTpCost(skill) : (skill.tpCost || 0);
        var mp = actor.skillMpCost ? actor.skillMpCost(skill) : (skill.mpCost || 0);
        if (tp > 0) return tp + " " + text("tpA", "TP");
        if (mp > 0) return mp + " " + text("mpA", "PM");
        return "";
    }

    function battleItemCount(item) {
        if (!item || !$gameParty || !$gameParty.numItems) return "";
        return "x" + $gameParty.numItems(item);
    }

    function battleSelectWindowItem(scene, win, index, okMethod) {
        if (!scene || !win || !okMethod) return;
        if (win.select) win.select(index);
        if (win.updateInputData) win.updateInputData();
        if (win.deactivate) win.deactivate();
        SoundManager.playOk();
        okMethod.call(scene);
        renderBattleHud(scene, true);
    }

    function battleCancelWindow(scene, win, cancelMethod) {
        if (!scene || !cancelMethod) return;
        if (win && win.updateInputData) win.updateInputData();
        if (win && win.deactivate) win.deactivate();
        SoundManager.playCancel();
        cancelMethod.call(scene);
        renderBattleHud(scene, true);
    }

    function battleListButton(options) {
        options = options || {};
        var enabled = options.enabled !== false;
        var locked = false;
        function press(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (locked) return;
            locked = true;
            if (enabled) {
                if (options.handler) options.handler();
            } else {
                SoundManager.playBuzzer();
            }
            setTimeout(function() {
                locked = false;
            }, 220);
        }
        return L3UI.el("button", {
            className: "l3-button l3-battle-list-item " + (enabled ? "" : "is-disabled") + " " + (options.className || ""),
            attrs: { type: "button" },
            html:
                "<span class=\"l3-battle-list-main\"><span>" + L3UI.escapeHtml(options.label || "") + "</span>" +
                "<strong>" + L3UI.escapeHtml(options.right || "") + "</strong></span>" +
                (options.detail ? "<span class=\"l3-battle-list-detail\">" + L3UI.escapeHtml(options.detail) + "</span>" : ""),
            on: {
                mousedown: press,
                touchstart: press,
                click: press
            }
        });
    }

    function appendBattlePanelTitle(panel, kicker, title) {
        panel.appendChild(L3UI.el("div", {
            className: "l3-battle-panel-title",
            html:
                "<span>" + L3UI.escapeHtml(kicker || "") + "</span>" +
                "<strong>" + L3UI.escapeHtml(title || "") + "</strong>"
        }));
    }

    function appendBattleEmpty(panel, message) {
        panel.appendChild(L3UI.el("div", { className: "l3-battle-empty", text: message }));
    }

    function appendBattleBack(panel, label, handler) {
        panel.appendChild(battleButton(label || "Retour", handler, { right: "<", className: "l3-battle-back" }));
    }

    function renderBattlePartyCommands(scene, panel) {
        var commands = scene._partyCommandWindow && scene._partyCommandWindow._list ? scene._partyCommandWindow._list : [];
        if (!commands.length) {
            panel.appendChild(battleButton("Combattre", function() { runPartyBattleCommand(scene, "fight", scene.commandFight); }));
            panel.appendChild(battleButton("Fuir", function() { runPartyBattleCommand(scene, "escape", scene.commandEscape); }));
            return;
        }
        for (var i = 0; i < commands.length; i++) {
            (function(command, index) {
                panel.appendChild(battleButton(command.name, function() {
                    runPartyBattleCommand(scene, command.symbol, battlePartyCommandMethod(scene, command.symbol), index);
                }, { disabled: command.enabled === false }));
            })(commands[i], i);
        }
    }

    function renderBattleActorCommands(scene, panel) {
        var actor = BattleManager.actor();
        appendBattlePanelTitle(panel, actor ? actor.name() : "", "Action");
        var commands = scene._actorCommandWindow && scene._actorCommandWindow._list ? scene._actorCommandWindow._list : [];
        if (!commands.length) {
            panel.appendChild(battleButton("Attaque", function() { runActorBattleCommand(scene, "attack", scene.commandAttack); }));
            panel.appendChild(battleButton("Competence", function() { runActorBattleCommand(scene, "skill", scene.commandSkill); }));
            panel.appendChild(battleButton("Garde", function() { runActorBattleCommand(scene, "guard", scene.commandGuard); }));
            panel.appendChild(battleButton("Objet", function() { runActorBattleCommand(scene, "item", scene.commandItem); }));
            return;
        }
        for (var i = 0; i < commands.length; i++) {
            (function(command, index) {
                panel.appendChild(battleButton(command.name, function() {
                    runActorBattleCommand(scene, command.symbol, battleActorCommandMethod(scene, command.symbol), index);
                }, { disabled: command.enabled === false }));
            })(commands[i], i);
        }
    }

    function renderBattleSkillList(scene, panel) {
        var actor = BattleManager.actor();
        var win = scene._skillWindow;
        var data = battleWindowData(win);
        appendBattlePanelTitle(panel, actor ? actor.name() : "", text("skill", "Competences"));
        var list = L3UI.el("div", { className: "l3-battle-list" });
        var count = 0;
        for (var i = 0; i < data.length; i++) {
            (function(skill, index) {
                if (!skill) return;
                count++;
                var enabled = win && win.isEnabled ? win.isEnabled(skill) : actor && actor.canUse(skill);
                list.appendChild(battleListButton({
                    label: skill.name,
                    right: battleSkillCost(actor, skill),
                    detail: skill.description || "",
                    enabled: enabled,
                    handler: function() {
                        battleSelectWindowItem(scene, win, index, scene.onSkillOk);
                    }
                }));
            })(data[i], i);
        }
        if (count > 0) panel.appendChild(list);
        else appendBattleEmpty(panel, "Aucune competence utilisable.");
        appendBattleBack(panel, "Retour", function() {
            battleCancelWindow(scene, win, scene.onSkillCancel);
        });
    }

    function renderBattleItemList(scene, panel) {
        var win = scene._itemWindow;
        var data = battleWindowData(win);
        appendBattlePanelTitle(panel, "", text("item", "Objets"));
        var list = L3UI.el("div", { className: "l3-battle-list" });
        var count = 0;
        for (var i = 0; i < data.length; i++) {
            (function(item, index) {
                if (!item) return;
                count++;
                var enabled = win && win.isEnabled ? win.isEnabled(item) : $gameParty.canUse(item);
                list.appendChild(battleListButton({
                    label: item.name,
                    right: battleItemCount(item),
                    detail: item.description || "",
                    enabled: enabled,
                    handler: function() {
                        battleSelectWindowItem(scene, win, index, scene.onItemOk);
                    }
                }));
            })(data[i], i);
        }
        if (count > 0) panel.appendChild(list);
        else appendBattleEmpty(panel, "Aucun objet utilisable.");
        appendBattleBack(panel, "Retour", function() {
            battleCancelWindow(scene, win, scene.onItemCancel);
        });
    }

    function renderBattleEnemyTargets(scene, panel) {
        var win = scene._enemyWindow;
        var enemies = win && win._enemies && win._enemies.length ? win._enemies : $gameTroop.aliveMembers();
        appendBattlePanelTitle(panel, "", "Cible ennemie");
        var list = L3UI.el("div", { className: "l3-battle-list" });
        for (var i = 0; i < enemies.length; i++) {
            (function(enemy, index) {
                if (!enemy) return;
                list.appendChild(battleListButton({
                    label: enemy.name(),
                    detail: "Choisir cette cible",
                    handler: function() {
                        battleSelectWindowItem(scene, win, index, scene.onEnemyOk);
                    }
                }));
            })(enemies[i], i);
        }
        if (enemies.length > 0) panel.appendChild(list);
        else appendBattleEmpty(panel, "Aucune cible disponible.");
        appendBattleBack(panel, "Retour", function() {
            battleCancelWindow(scene, win, scene.onEnemyCancel);
        });
    }

    function renderBattleActorTargets(scene, panel) {
        var win = scene._actorWindow;
        var actors = $gameParty.battleMembers();
        appendBattlePanelTitle(panel, "", "Cible alliee");
        var list = L3UI.el("div", { className: "l3-battle-list" });
        for (var i = 0; i < actors.length; i++) {
            (function(actor, index) {
                if (!actor) return;
                list.appendChild(battleListButton({
                    label: actor.name(),
                    right: actor.hp + " / " + actor.mhp,
                    detail: actor.currentClass ? actor.currentClass().name : "",
                    handler: function() {
                        battleSelectWindowItem(scene, win, index, scene.onActorOk);
                    }
                }));
            })(actors[i], i);
        }
        panel.appendChild(list);
        appendBattleBack(panel, "Retour", function() {
            battleCancelWindow(scene, win, scene.onActorCancel);
        });
    }

    function renderBattleHud(scene, force) {
        var layer = L3UI.layer(scene, "battle");
        quietBattleWindows(scene);
        var signature = battleHudSignature(scene);
        if (!force && scene._l3BattleHudSignature === signature) return;
        scene._l3BattleHudSignature = signature;

        L3UI.empty(layer);
        var mode = battleHudMode(scene);
        var hud = L3UI.el("div", { className: "l3-battle-hud " + (mode === "skill" || mode === "item" || mode === "enemy" || mode === "targetActor" ? "is-list" : "") });
        var commandPanel = L3UI.el("div", { className: "l3-battle-command-panel" });
        var actors = L3UI.el("div", { className: "l3-battle-actors" });

        $gameParty.battleMembers().forEach(function(actor) {
            actors.appendChild(L3UI.Components.ActorCard(actor, { faceSize: 82, className: actor === BattleManager.actor() ? "is-active" : "" }));
        });

        if (mode === "party") {
            renderBattlePartyCommands(scene, commandPanel);
        } else if (mode === "actor") {
            renderBattleActorCommands(scene, commandPanel);
        } else if (mode === "skill") {
            renderBattleSkillList(scene, commandPanel);
        } else if (mode === "item") {
            renderBattleItemList(scene, commandPanel);
        } else if (mode === "enemy") {
            renderBattleEnemyTargets(scene, commandPanel);
        } else if (mode === "targetActor") {
            renderBattleActorTargets(scene, commandPanel);
        } else {
            commandPanel.appendChild(L3UI.el("div", { className: "l3-battle-wait", text: "Combat en cours" }));
        }

        hud.appendChild(commandPanel);
        hud.appendChild(actors);
        layer.appendChild(hud);
    }

    function battleButton(label, handler, options) {
        options = options || {};
        var enabled = options.disabled !== true;
        var locked = false;
        function press(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (locked) return;
            locked = true;
            if (enabled) {
                handler();
            } else {
                SoundManager.playBuzzer();
            }
            setTimeout(function() {
                locked = false;
            }, 220);
        }
        return L3UI.Components.Button({
            label: label,
            right: options.right === undefined ? ">" : options.right,
            className: "l3-battle-command " + (options.className || ""),
            disabled: !enabled,
            on: {
                mousedown: press,
                touchstart: press,
                click: press
            }
        });
    }

    function battlePartyCommandMethod(scene, symbol) {
        if (symbol === "fight") return scene.commandFight;
        if (symbol === "escape") return scene.commandEscape;
        return function() {
            if (scene._partyCommandWindow && scene._partyCommandWindow.callHandler) {
                scene._partyCommandWindow.callHandler(symbol);
            }
        };
    }

    function battleActorCommandMethod(scene, symbol) {
        if (symbol === "attack") return scene.commandAttack;
        if (symbol === "skill") return scene.commandSkill;
        if (symbol === "guard") return scene.commandGuard;
        if (symbol === "item") return scene.commandItem;
        return function() {
            if (scene._actorCommandWindow && scene._actorCommandWindow.callHandler) {
                scene._actorCommandWindow.callHandler(symbol);
            }
        };
    }

    function runPartyBattleCommand(scene, symbol, method, index) {
        if (scene._partyCommandWindow) {
            if (index !== undefined && index !== null) scene._partyCommandWindow.select(index);
            else scene._partyCommandWindow.selectSymbol(symbol);
            scene._partyCommandWindow.deactivate();
        }
        SoundManager.playOk();
        method.call(scene);
        renderBattleHud(scene, true);
    }

    function runActorBattleCommand(scene, symbol, method, index) {
        if (scene._actorCommandWindow) {
            if (index !== undefined && index !== null) scene._actorCommandWindow.select(index);
            else scene._actorCommandWindow.selectSymbol(symbol);
            scene._actorCommandWindow.deactivate();
        }
        SoundManager.playOk();
        method.call(scene);
        renderBattleHud(scene, true);
    }

    var dialogueSignature = "";
    var dialogueNoticeKeys = {};
    var dialogueAutoAdvanceKey = "";
    var pendingLevelNoticeLines = [];
    var pendingLevelNoticeTimer = null;

    function quietDialogueNativeWindow(win) {
        if (!win) return;
        win.visible = false;
        win.opacity = 0;
        win.backOpacity = 0;
        win.contentsOpacity = 0;
    }

    function messagePositionClass() {
        var position = window.$gameMessage && $gameMessage.positionType ? $gameMessage.positionType() : 2;
        if (position === 0) return "is-top";
        if (position === 1) return "is-middle";
        return "is-bottom";
    }

    function choicePositionClass() {
        var position = window.$gameMessage && $gameMessage.choicePositionType ? $gameMessage.choicePositionType() : 2;
        if (position === 0) return "is-left";
        if (position === 1) return "is-center";
        return "is-right";
    }

    function stripMessageCodes(value) {
        return String(value || "")
            .replace(/\x1b\$/g, "")
            .replace(/\x1b[.!|^<>]/g, "")
            .replace(/\x1b[A-Z]+\[[^\]]*\]/gi, "")
            .replace(/\x1b[A-Z]+/gi, "")
            .replace(/\\[A-Z]+\[[^\]]*\]/gi, "")
            .replace(/\\[A-Z]+/gi, "");
    }

    function messageText(win) {
        var raw = "";
        if (window.$gameMessage && $gameMessage.hasText && $gameMessage.hasText()) raw = $gameMessage.allText();
        if (!raw && win && win._textState && win._textState.text) raw = win._textState.text;
        if (win && win.convertEscapeCharacters) raw = win.convertEscapeCharacters(raw);
        return stripMessageCodes(raw).replace(/^\s+|\s+$/g, "");
    }

    function messageSpeakerName() {
        if (window.$gameMessage && $gameMessage._speakerName) return String($gameMessage._speakerName);
        return "";
    }

    function isSystemDialogueLine(line) {
        line = String(line || "").replace(/^\s+|\s+$/g, "");
        if (!line) return false;
        if (/est maintenant\s+Niveau\s+\d+\s*!?$/i.test(line)) return true;
        if (/is now\s+Level\s+\d+\s*!?$/i.test(line)) return true;
        if (/^(obtenu|obtention|recu|recompense|reward)\b/i.test(line)) return true;
        if (/^\+?\d+\s*(G|EXP|XP)$/i.test(line)) return true;
        if (/^(nouvelle competence|competence apprise|learned skill)\b/i.test(line)) return true;
        return false;
    }

    function notifyUniqueSystemLines(lines) {
        if (!lines || !lines.length) return;
        var fresh = [];
        for (var i = 0; i < lines.length; i++) {
            var key = "system:" + lines[i];
            if (dialogueNoticeKeys[key]) continue;
            dialogueNoticeKeys[key] = true;
            fresh.push(lines[i]);
        }
        if (fresh.length) pushSystemNotice({ title: "Systeme", lines: fresh, type: "system", duration: 4200 });
    }

    function splitDialogueInfo(textValue, speaker) {
        var lines = String(textValue || "").split(/\r?\n/);
        var clean = [];
        var systemLines = [];
        speaker = speaker || "";

        for (var i = 0; i < lines.length; i++) {
            var line = String(lines[i] || "").replace(/^\s+|\s+$/g, "");
            if (!line) continue;
            if (!speaker && clean.length === 0 && systemLines.length === 0) {
                var match = line.match(/^(.{1,40})\s*:\s*$/);
                if (match) {
                    speaker = match[1];
                    continue;
                }
            }
            if (isSystemDialogueLine(line)) systemLines.push(line);
            else clean.push(line);
        }

        notifyUniqueSystemLines(systemLines);
        return {
            speaker: speaker,
            text: clean.join("\n"),
            lines: clean,
            systemLines: systemLines
        };
    }

    function messageFaceElement(faceName, faceIndex) {
        var size = 144;
        var face = L3UI.el("div", { className: "l3-dialogue-face" });
        face.style.width = size + "px";
        face.style.height = size + "px";
        if (!faceName) {
            face.classList.add("is-empty");
            return face;
        }
        if (window.ImageManager && ImageManager.loadFace) ImageManager.loadFace(faceName);
        faceIndex = Number(faceIndex || 0);
        face.style.backgroundImage = L3UI.cssUrl("img/faces/" + faceName + ".png");
        face.style.backgroundSize = (size * 4) + "px " + (size * 2) + "px";
        face.style.backgroundPosition = (-((faceIndex % 4) * size)) + "px " + (-(Math.floor(faceIndex / 4) * size)) + "px";
        return face;
    }

    function choiceItems(choiceWindow) {
        var items = [];
        if (choiceWindow && choiceWindow._list && choiceWindow._list.length) {
            for (var i = 0; i < choiceWindow._list.length; i++) {
                items.push({
                    label: choiceWindow._list[i].name,
                    enabled: choiceWindow._list[i].enabled !== false
                });
            }
            return items;
        }
        if (window.$gameMessage && $gameMessage.choices) {
            var choices = $gameMessage.choices();
            for (var c = 0; c < choices.length; c++) items.push({ label: choices[c], enabled: true });
        }
        return items;
    }

    function isChoiceVisible(choiceWindow, items) {
        if (!choiceWindow || !items.length) return false;
        if (choiceWindow.active) return true;
        if (choiceWindow.isOpen && choiceWindow.isOpen()) return true;
        return choiceWindow.openness > 0 && !choiceWindow._closing;
    }

    function pulseOkInput() {
        if (!window.Input || !Input._currentState) return;
        Input._currentState.ok = true;
        Input._latestButton = "ok";
        Input._pressedTime = 0;
        setTimeout(function() {
            if (window.Input && Input._currentState) Input._currentState.ok = false;
        }, 80);
    }

    function advanceMessage(win, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!win) return;
        win._showFast = true;
        if (win.pause) win.pause = false;
        pulseOkInput();
    }

    function selectChoice(choiceWindow, index) {
        if (!choiceWindow || !choiceWindow.select) return;
        if (choiceWindow.index && choiceWindow.index() === index) return;
        choiceWindow.select(index);
        if (window.SoundManager && SoundManager.playCursor) SoundManager.playCursor();
        renderDialogueUi(true);
    }

    function confirmChoice(choiceWindow, index, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!choiceWindow || !choiceWindow.select) return;
        choiceWindow.select(index);
        if (choiceWindow.updateInputData) choiceWindow.updateInputData();
        if (choiceWindow.isCurrentItemEnabled && !choiceWindow.isCurrentItemEnabled()) {
            if (window.SoundManager && SoundManager.playBuzzer) SoundManager.playBuzzer();
            return;
        }
        if (choiceWindow.processOk) choiceWindow.processOk();
        else if (choiceWindow.callOkHandler) choiceWindow.callOkHandler();
        renderDialogueUi(true);
    }

    function clearDialogueUi(scene) {
        scene = scene || SceneManager._scene;
        if (!scene || !scene._l3uiLayers || !scene._l3uiLayers.dialogue) return;
        L3UI.empty(scene._l3uiLayers.dialogue);
        dialogueSignature = "";
    }

    function systemNoticeStack() {
        var root = L3UI.root();
        var stack = document.getElementById("l3-system-notice-stack");
        if (!stack) {
            stack = L3UI.el("div", { id: "l3-system-notice-stack", className: "l3-system-notice-stack" });
            root.appendChild(stack);
        }
        return stack;
    }

    function pushSystemNotice(options) {
        if (!window.L3UI || !L3UI.root) return null;
        options = options || {};
        var lines = options.lines || [];
        if (typeof lines === "string") lines = [lines];
        lines = lines.filter(function(line) { return String(line || "").length > 0; });
        if (!lines.length && !options.title) return null;

        var html = "";
        if (options.title) html += "<strong>" + L3UI.escapeHtml(options.title) + "</strong>";
        if (lines.length) {
            html += "<ul>";
            for (var i = 0; i < lines.length; i++) html += "<li>" + L3UI.escapeHtml(lines[i]) + "</li>";
            html += "</ul>";
        }

        var notice = L3UI.el("div", {
            className: "l3-system-notice " + (options.type || "system"),
            html: html
        });
        systemNoticeStack().appendChild(notice);
        setTimeout(function() {
            notice.classList.add("is-leaving");
            setTimeout(function() {
                if (notice.parentNode) notice.parentNode.removeChild(notice);
            }, 260);
        }, options.duration || 3600);
        return notice;
    }

    function queueLevelNotice(lines) {
        lines = lines || [];
        for (var i = 0; i < lines.length; i++) pendingLevelNoticeLines.push(lines[i]);
        if (pendingLevelNoticeTimer) clearTimeout(pendingLevelNoticeTimer);
        pendingLevelNoticeTimer = setTimeout(function() {
            if (pendingLevelNoticeLines.length) {
                pushSystemNotice({
                    title: pendingLevelNoticeLines.length > 1 ? "Niveaux gagnes" : "Niveau gagne",
                    lines: pendingLevelNoticeLines.slice(),
                    type: "level",
                    duration: 5200
                });
            }
            pendingLevelNoticeLines.length = 0;
            pendingLevelNoticeTimer = null;
        }, 80);
    }

    function dialogueRenderSignature(textValue, faceName, faceIndex, speaker, choices, choiceIndex) {
        var choicePart = [];
        for (var i = 0; i < choices.length; i++) choicePart.push(choices[i].label + ":" + (choices[i].enabled ? 1 : 0));
        return [
            textValue,
            faceName || "",
            faceIndex || 0,
            speaker || "",
            messagePositionClass(),
            choicePositionClass(),
            choiceIndex,
            choicePart.join(",")
        ].join("|");
    }

    function renderDialogueUi(force) {
        if (!config.dialogue || !window.L3UI || !SceneManager._scene) return;
        var scene = SceneManager._scene;
        var win = scene._messageWindow;
        if (!win) return;
        var choiceWindow = win._choiceWindow || scene._choiceWindow;
        quietDialogueNativeWindow(win);
        quietDialogueNativeWindow(choiceWindow);

        var rawTextValue = messageText(win);
        var info = splitDialogueInfo(rawTextValue, messageSpeakerName());
        var textValue = info.text;
        var choices = choiceItems(choiceWindow);
        var hasChoices = isChoiceVisible(choiceWindow, choices);
        var hasText = !!textValue;
        if (!hasText && !hasChoices && info.systemLines.length) {
            var autoKey = rawTextValue;
            if (dialogueAutoAdvanceKey !== autoKey) {
                dialogueAutoAdvanceKey = autoKey;
                setTimeout(function() { advanceMessage(win); }, 30);
            }
        } else if (hasText) {
            dialogueAutoAdvanceKey = "";
        }
        if (!hasText && !hasChoices) {
            clearDialogueUi(scene);
            return;
        }

        var faceName = window.$gameMessage && $gameMessage.faceName ? $gameMessage.faceName() : "";
        var faceIndex = window.$gameMessage && $gameMessage.faceIndex ? $gameMessage.faceIndex() : 0;
        var speaker = info.speaker;
        var choiceIndex = choiceWindow && choiceWindow.index ? choiceWindow.index() : -1;
        var signature = dialogueRenderSignature(textValue, faceName, faceIndex, speaker, choices, choiceIndex);
        if (!force && dialogueSignature === signature) return;
        dialogueSignature = signature;

        var layer = L3UI.layer(scene, "dialogue");
        layer.className = "l3-scene-layer l3-dialogue-layer l3-scene-" + (scene.constructor ? scene.constructor.name : "Scene");
        layer.style.setProperty("--l3-dialogue-reserve", (hasText ? Math.max(230, Math.min(420, 150 + (info.lines.length * 36))) : 0) + "px");
        L3UI.empty(layer);

        var choiceBox = null;
        if (hasChoices) {
            choiceBox = L3UI.el("div", {
                className: "l3-choice-box " + (hasText ? "is-inline" : (messagePositionClass() + " " + choicePositionClass() + " is-alone")),
                on: {
                    click: function(event) { event.stopPropagation(); },
                    mousedown: function(event) { event.stopPropagation(); }
                }
            });
            for (var i = 0; i < choices.length; i++) {
                (function(index) {
                    var item = choices[index];
                    var active = index === choiceIndex;
                    choiceBox.appendChild(L3UI.el("button", {
                        className: "l3-choice-button " + (active ? "is-active" : "") + (item.enabled ? "" : " is-disabled"),
                        attrs: { type: "button" },
                        html:
                            "<span class=\"l3-choice-label\">" + L3UI.escapeHtml(item.label || "") + "</span>" +
                            "<strong>></strong>",
                        on: {
                            mouseenter: function() { selectChoice(choiceWindow, index); },
                            click: function(event) { confirmChoice(choiceWindow, index, event); }
                        }
                    }));
                })(i);
            }
        }

        if (hasText) {
            var wrap = L3UI.el("div", { className: "l3-dialogue-wrap " + messagePositionClass() });
            var box = L3UI.el("div", {
                className: "l3-dialogue-box " + (faceName ? "has-face" : "no-face") + (hasChoices ? " has-choices" : ""),
                on: {
                    click: function(event) { advanceMessage(win, event); },
                    mousedown: function(event) { event.stopPropagation(); }
                }
            });
            if (faceName) box.appendChild(messageFaceElement(faceName, faceIndex));
            var body = L3UI.el("div", { className: "l3-dialogue-body" });
            if (speaker) body.appendChild(L3UI.el("div", { className: "l3-dialogue-name", text: speaker }));
            body.appendChild(L3UI.el("div", {
                className: "l3-dialogue-text",
                html: L3UI.escapeHtml(textValue).replace(/\n/g, "<br>")
            }));
            box.appendChild(body);
            if (choiceBox) box.appendChild(choiceBox);
            else body.appendChild(L3UI.el("div", { className: "l3-dialogue-next", text: ">" }));
            wrap.appendChild(box);
            layer.appendChild(wrap);
        } else if (choiceBox) {
            layer.appendChild(choiceBox);
        }
    }

    function installSceneCss() {
        L3UI.addCss("l3-ui-scenes-css",
            ".l3-dialogue-layer{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;pointer-events:none;z-index:80;}" +
            ".l3-dialogue-wrap{position:absolute;left:24px;right:24px;display:block;pointer-events:none;}" +
            ".l3-dialogue-wrap.is-bottom{bottom:22px;}" +
            ".l3-dialogue-wrap.is-top{top:22px;}" +
            ".l3-dialogue-wrap.is-middle{top:50%;transform:translateY(-50%);}" +
            ".l3-dialogue-box{width:100%;min-height:186px;display:grid;grid-template-columns:164px minmax(0,1fr);grid-column-gap:20px;grid-gap:20px;padding:20px 22px;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:linear-gradient(90deg,rgba(8,13,24,.92),rgba(8,13,24,.82));box-shadow:0 20px 60px rgba(0,0,0,.36);pointer-events:auto;color:#f8fafc;color:var(--l3-text);}" +
            ".l3-dialogue-box.no-face{grid-template-columns:1fr;min-height:132px;}" +
            ".l3-dialogue-box.has-choices{min-height:206px;}" +
            ".l3-dialogue-face{align-self:start;border-radius:8px;border:1px solid rgba(148,163,184,.28);background-color:rgba(30,42,61,.82);background-repeat:no-repeat;box-shadow:0 12px 32px rgba(0,0,0,.35);overflow:hidden;}" +
            ".l3-dialogue-face.is-empty{display:none;}" +
            ".l3-dialogue-body{position:relative;min-width:0;display:flex;flex-direction:column;justify-content:flex-start;gap:10px;padding:4px 28px 8px 0;}" +
            ".l3-dialogue-box.has-choices .l3-dialogue-body{padding-bottom:0;}" +
            ".l3-dialogue-name{align-self:flex-start;padding:5px 12px;border:1px solid rgba(56,189,248,.36);border-radius:999px;background:rgba(15,23,42,.82);color:#38bdf8;color:var(--l3-accent);font-size:13px;font-weight:700;line-height:1;text-transform:uppercase;}" +
            ".l3-dialogue-text{font-size:24px;line-height:1.35;color:#f8fafc;color:var(--l3-text);text-shadow:0 2px 6px rgba(0,0,0,.45);white-space:normal;word-break:break-word;}" +
            ".l3-dialogue-next{position:absolute;right:2px;bottom:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:#fb4f7a;color:var(--l3-accent-2);font-size:16px;animation:l3-dialogue-pulse 1s ease-in-out infinite;}" +
            ".l3-choice-box{position:relative;min-width:0;max-width:none;display:flex;gap:8px;pointer-events:auto;}" +
            ".l3-choice-box.is-inline{grid-column:1/-1;align-self:end;justify-content:center;flex-wrap:nowrap;width:720px;max-width:74%;margin:8px auto 0;padding-top:4px;gap:10px;}" +
            ".l3-choice-box.is-alone{position:absolute;right:24px;bottom:24px;min-width:260px;max-width:min(420px,calc(100vw - 48px));}" +
            ".l3-choice-box.is-alone.is-top{top:24px;bottom:auto;}" +
            ".l3-choice-box.is-alone.is-middle{top:50%;bottom:auto;transform:translateY(-50%);}" +
            ".l3-choice-box.is-alone.is-left{left:24px;right:auto;}" +
            ".l3-choice-box.is-alone.is-center{left:50%;right:auto;transform:translateX(-50%);}" +
            ".l3-choice-box.is-alone.is-middle.is-center{transform:translate(-50%,-50%);}" +
            ".l3-choice-box.is-alone{flex-direction:column;padding:12px;border:1px solid rgba(148,163,184,.30);border-radius:8px;background:rgba(8,13,24,.92);box-shadow:0 18px 52px rgba(0,0,0,.38);}" +
            ".l3-choice-button{position:relative;min-width:0;min-height:32px;display:grid;grid-template-columns:minmax(0,1fr) 16px;align-items:center;gap:10px;padding:6px 14px;border:1px solid rgba(148,163,184,.16);border-radius:7px;background:rgba(30,42,61,.78);color:#f8fafc;color:var(--l3-text);font:inherit;font-size:14px;text-align:left;pointer-events:auto;overflow:hidden;}" +
            ".l3-choice-box.is-inline .l3-choice-button{flex:1 1 0;min-width:220px;max-width:none;}" +
            ".l3-choice-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
            ".l3-choice-button strong{color:#fb4f7a;color:var(--l3-accent-2);font-weight:800;}" +
            ".l3-choice-button.is-active{border-color:#38bdf8;border-color:var(--l3-accent);background:linear-gradient(90deg,rgba(56,189,248,.20),rgba(251,79,122,.10));box-shadow:0 0 0 1px rgba(56,189,248,.18),0 10px 26px rgba(0,0,0,.20);}" +
            ".l3-choice-button.is-active:after{content:'';position:absolute;left:12px;right:12px;bottom:6px;height:1px;background:linear-gradient(90deg,rgba(56,189,248,.9),rgba(251,79,122,.65));}" +
            ".l3-choice-button.is-disabled{opacity:.45;}" +
            ".l3-system-notice-stack{position:absolute;left:24px;top:24px;width:min(420px,calc(100vw - 48px));display:flex;flex-direction:column;gap:10px;z-index:99998;pointer-events:none;}" +
            ".l3-system-notice{padding:14px 16px;border:1px solid rgba(148,163,184,.22);border-left:4px solid #38bdf8;border-left-color:var(--l3-accent);border-radius:8px;background:rgba(8,13,24,.92);box-shadow:0 18px 52px rgba(0,0,0,.35);color:#f8fafc;color:var(--l3-text);animation:l3-notice-in .18s ease-out both;transition:opacity .24s ease,transform .24s ease;}" +
            ".l3-system-notice.reward{border-left-color:#facc15;}" +
            ".l3-system-notice.level{border-left-color:#38bdf8;border-left-color:var(--l3-accent);}" +
            ".l3-system-notice.system{border-left-color:#fb4f7a;border-left-color:var(--l3-accent-2);}" +
            ".l3-system-notice strong{display:block;margin-bottom:8px;font-size:16px;line-height:1.1;}" +
            ".l3-system-notice ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;color:#cbd5e1;}" +
            ".l3-system-notice li{position:relative;padding-left:14px;line-height:1.3;}" +
            ".l3-system-notice li:before{content:'+';position:absolute;left:0;color:#fb4f7a;color:var(--l3-accent-2);}" +
            ".l3-system-notice.is-leaving{opacity:0;transform:translateY(-8px);}" +
            "@keyframes l3-notice-in{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}" +
            "@keyframes l3-dialogue-pulse{0%,100%{transform:translateX(0);opacity:.55;}50%{transform:translateX(4px);opacity:1;}}" +
            "@media (max-width: 980px){.l3-choice-box.is-inline{width:100%;max-width:100%;justify-content:center;}.l3-choice-box.is-inline .l3-choice-button{flex:1 1 0;min-width:0;max-width:none;}}" +
            ".l3-subscene-screen{display:grid;grid-template-columns:320px minmax(0,1fr) 360px;grid-column-gap:22px;grid-row-gap:22px;grid-gap:22px;gap:22px;padding:28px;}" +
            ".l3-sub-sidebar,.l3-sub-main,.l3-sub-detail{min-width:0;min-height:0;padding:20px;overflow:hidden;}" +
            ".l3-sub-sidebar{display:flex;flex-direction:column;}" +
            ".l3-sub-main{overflow:auto;}" +
            ".l3-sub-detail{overflow:auto;}" +
            ".l3-sub-title{margin:0 0 28px;font-size:28px;line-height:1.1;}" +
            ".l3-sub-footer{margin-top:auto;padding-top:18px;color:#9aa8bd;color:var(--l3-muted);font-size:13px;}" +
            ".l3-sub-list-section{margin-top:26px;}" +
            ".l3-detail-stack{display:flex;flex-direction:column;gap:14px;}" +
            ".l3-detail-desc{margin:0;color:#9aa8bd;color:var(--l3-muted);line-height:1.45;white-space:pre-wrap;}" +
            ".l3-stat-line{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid rgba(148,163,184,.12);color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-stat-line strong{color:#f8fafc;color:var(--l3-text);font-weight:600;text-align:right;}" +
            ".l3-status-grid,.l3-param-grid{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));grid-column-gap:18px;grid-row-gap:4px;grid-gap:18px;margin-top:20px;}" +
            ".l3-small-list{margin-top:16px;}" +
            ".l3-scene-actor-picker{display:grid;grid-template-columns:repeat(2,minmax(360px,1fr));grid-column-gap:24px;grid-row-gap:24px;grid-gap:24px;margin-top:18px;}" +
            ".l3-quantity-display{display:flex;flex-direction:column;gap:6px;margin:12px 0 18px;padding:18px;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:rgba(30,42,61,.55);text-align:center;}" +
            ".l3-quantity-number{font-size:42px;font-weight:700;line-height:1;color:#f8fafc;color:var(--l3-text);}" +
            ".l3-quantity-total{font-size:18px;color:#fb4f7a;color:var(--l3-accent-2);}" +
            ".l3-button.is-current{border-color:#38bdf8;border-color:var(--l3-accent);background:linear-gradient(90deg,rgba(56,189,248,.20),rgba(251,79,122,.08));}" +
            ".l3-equip-action{flex-wrap:wrap;align-items:flex-start;min-height:68px;padding-top:12px;padding-bottom:12px;}" +
            ".l3-equip-action .l3-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;min-width:28px;height:28px;border-radius:6px;border:1px solid currentColor;background:rgba(15,23,42,.72);font-size:18px;font-weight:800;line-height:1;}" +
            ".l3-equip-action .l3-button-label{flex:1 1 calc(100% - 100px);font-weight:700;white-space:normal;}" +
            ".l3-equip-action .l3-button-right{flex:0 0 auto;margin-left:auto;}" +
            ".l3-equip-action .l3-command-detail{flex:0 0 calc(100% - 38px);margin-left:38px;margin-top:-2px;white-space:normal;line-height:1.35;color:#b7c2d4;}" +
            ".l3-equip-add .l3-icon{color:#35d38a;}" +
            ".l3-equip-remove .l3-icon{color:#fb7185;}" +
            ".l3-equip-action.is-disabled .l3-icon{opacity:.45;}" +
            ".l3-gameover-screen{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.86));background-size:cover;background-position:center;pointer-events:none;}" +
            ".l3-gameover-panel{width:min(520px,calc(100vw - 56px));padding:26px;border:1px solid rgba(251,79,122,.42);border-radius:8px;background:rgba(8,13,24,.78);box-shadow:0 24px 80px rgba(0,0,0,.48);pointer-events:auto;text-align:center;}" +
            ".l3-gameover-title{margin:4px 0 12px;font-size:56px;line-height:1;text-transform:uppercase;color:#f8fafc;text-shadow:0 0 28px rgba(251,79,122,.28);}" +
            ".l3-gameover-panel .l3-command-list{margin-top:22px;}" +
            ".l3-battle-hud{position:absolute;left:0;right:0;bottom:0;padding:20px;display:grid;grid-template-columns:250px minmax(0,1fr);grid-column-gap:18px;grid-gap:18px;pointer-events:none;}" +
            ".l3-battle-hud.is-list{grid-template-columns:minmax(300px,420px) minmax(0,1fr);}" +
            ".l3-battle-command-panel{pointer-events:auto;max-height:calc(100vh - 60px);overflow:auto;padding:14px;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:rgba(8,13,24,.90);box-shadow:0 16px 46px rgba(0,0,0,.32);}" +
            ".l3-battle-command-panel .l3-button{margin-bottom:8px;}" +
            ".l3-battle-command-panel .l3-button:last-child{margin-bottom:0;}" +
            ".l3-battle-actors{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));grid-column-gap:10px;grid-row-gap:10px;grid-gap:10px;pointer-events:none;}" +
            ".l3-battle-actors .l3-actor-card{grid-template-columns:88px minmax(0,1fr);min-height:132px;padding:14px;grid-column-gap:12px;}" +
            ".l3-battle-actors .l3-actor-card.is-active{border-color:#38bdf8;border-color:var(--l3-accent);background:rgba(13,20,34,.94);box-shadow:0 0 0 1px rgba(56,189,248,.48),0 18px 44px rgba(0,0,0,.36);}" +
            ".l3-battle-actors .l3-actor-card-head{font-size:17px;}" +
            ".l3-battle-actors .l3-gauge-top{font-size:11px;}" +
            ".l3-battle-actors .l3-gauge-track{height:7px;}" +
            ".l3-battle-panel-title{margin:0 0 12px;display:flex;flex-direction:column;gap:3px;}" +
            ".l3-battle-panel-title span{font-size:11px;text-transform:uppercase;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-battle-panel-title strong{font-size:18px;color:#f8fafc;color:var(--l3-text);}" +
            ".l3-battle-list{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}" +
            ".l3-battle-list-item{display:flex;flex-direction:column;align-items:stretch;gap:4px;min-height:56px;padding:10px 12px;}" +
            ".l3-battle-list-main{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;}" +
            ".l3-battle-list-main span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
            ".l3-battle-list-main strong{color:#fb4f7a;color:var(--l3-accent-2);font-size:12px;font-weight:700;white-space:nowrap;}" +
            ".l3-battle-list-detail{display:block;width:100%;color:#9aa8bd;color:var(--l3-muted);font-size:12px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
            ".l3-battle-empty{margin:8px 0 12px;padding:12px;border:1px dashed rgba(148,163,184,.22);border-radius:8px;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-battle-back{margin-top:4px;background:rgba(15,23,42,.9);}" +
            ".l3-battle-wait{color:#9aa8bd;color:var(--l3-muted);}" +
            "@media (max-width: 1100px){.l3-subscene-screen{grid-template-columns:280px minmax(0,1fr);}.l3-sub-detail{grid-column:1 / span 2;}.l3-battle-actors{grid-template-columns:repeat(2,minmax(180px,1fr));}}" +
            "@media (max-width: 800px){.l3-subscene-screen{grid-template-columns:1fr;padding:14px;}.l3-sub-detail{grid-column:auto;}.l3-scene-actor-picker{grid-template-columns:1fr;}.l3-battle-hud{grid-template-columns:1fr;}.l3-battle-actors{grid-template-columns:1fr;}}"
        );
    }

    if (typeof Window_Message !== "undefined") {
        var _Window_Message_startMessage = Window_Message.prototype.startMessage;
        Window_Message.prototype.startMessage = function() {
            _Window_Message_startMessage.call(this);
            if (config.dialogue) renderDialogueUi(true);
        };

        var _Window_Message_update = Window_Message.prototype.update;
        Window_Message.prototype.update = function() {
            _Window_Message_update.call(this);
            if (config.dialogue) renderDialogueUi();
        };

        var _Window_Message_terminateMessage = Window_Message.prototype.terminateMessage;
        Window_Message.prototype.terminateMessage = function() {
            _Window_Message_terminateMessage.call(this);
            if (config.dialogue) renderDialogueUi(true);
        };
    }

    if (typeof Window_ChoiceList !== "undefined") {
        var _Window_ChoiceList_start = Window_ChoiceList.prototype.start;
        Window_ChoiceList.prototype.start = function() {
            _Window_ChoiceList_start.call(this);
            if (config.dialogue) renderDialogueUi(true);
        };

        var _Window_ChoiceList_update = Window_ChoiceList.prototype.update;
        Window_ChoiceList.prototype.update = function() {
            _Window_ChoiceList_update.call(this);
            if (config.dialogue) renderDialogueUi();
        };
    }

    if (typeof Game_Actor !== "undefined") {
        var _Game_Actor_displayLevelUp = Game_Actor.prototype.displayLevelUp;
        Game_Actor.prototype.displayLevelUp = function(newSkills) {
            if (!config.dialogue) {
                _Game_Actor_displayLevelUp.call(this, newSkills);
                return;
            }
            var lines = [this.name() + " est maintenant Niveau " + this._level + " !"];
            newSkills = newSkills || [];
            for (var i = 0; i < newSkills.length; i++) {
                if (newSkills[i]) lines.push("Nouvelle competence : " + newSkills[i].name);
            }
            queueLevelNotice(lines);
        };
    }

    var _Scene_Item_create = Scene_Item.prototype.create;
    Scene_Item.prototype.create = function() {
        _Scene_Item_create.call(this);
        if (config.item) renderItemScene(this);
    };

    var _Scene_Skill_create = Scene_Skill.prototype.create;
    Scene_Skill.prototype.create = function() {
        _Scene_Skill_create.call(this);
        if (config.skill) renderSkillScene(this);
    };

    var _Scene_Equip_create = Scene_Equip.prototype.create;
    Scene_Equip.prototype.create = function() {
        _Scene_Equip_create.call(this);
        if (config.equip) renderEquipScene(this);
    };

    var _Scene_Status_create = Scene_Status.prototype.create;
    Scene_Status.prototype.create = function() {
        _Scene_Status_create.call(this);
        if (config.status) renderStatusScene(this);
    };

    var _Scene_Options_create = Scene_Options.prototype.create;
    Scene_Options.prototype.create = function() {
        _Scene_Options_create.call(this);
        if (config.options) renderOptionsScene(this);
    };

    var _Scene_Save_create = Scene_Save.prototype.create;
    Scene_Save.prototype.create = function() {
        _Scene_Save_create.call(this);
        if (config.file) renderFileScene(this, "save");
    };

    var _Scene_Load_create = Scene_Load.prototype.create;
    Scene_Load.prototype.create = function() {
        _Scene_Load_create.call(this);
        if (config.file) renderFileScene(this, "load");
    };

    var _Scene_GameEnd_create = Scene_GameEnd.prototype.create;
    Scene_GameEnd.prototype.create = function() {
        _Scene_GameEnd_create.call(this);
        if (config.gameEnd) renderGameEndScene(this);
    };

    var _Scene_Gameover_create = Scene_Gameover.prototype.create;
    Scene_Gameover.prototype.create = function() {
        _Scene_Gameover_create.call(this);
        if (config.gameOver) renderGameoverScene(this);
    };

    var _Scene_Shop_create = Scene_Shop.prototype.create;
    Scene_Shop.prototype.create = function() {
        _Scene_Shop_create.call(this);
        if (config.shop) renderShopScene(this, "command");
    };

    var _Scene_Battle_create = Scene_Battle.prototype.create;
    Scene_Battle.prototype.create = function() {
        _Scene_Battle_create.call(this);
        installBattleHud(this);
    };

    var _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        if (config.battleHud) renderBattleHud(this);
    };

    Scenes.config = config;
    Scenes.renderItem = renderItemScene;
    Scenes.renderSkill = renderSkillScene;
    Scenes.renderEquip = renderEquipScene;
    Scenes.renderStatus = renderStatusScene;
    Scenes.renderOptions = renderOptionsScene;
    Scenes.renderFile = renderFileScene;
    Scenes.renderShop = renderShopScene;
    Scenes.renderBattleHud = renderBattleHud;
    Scenes.renderDialogue = renderDialogueUi;
    Scenes.notify = pushSystemNotice;
    Scenes.renderGameOver = renderGameoverScene;

    installSceneCss();
    if (L3UI.Services) L3UI.Services.register("uiScenes", Scenes);
    if (L3UI.Plugins) {
        L3UI.Plugins.register("L3_UIScenes", {
            version: "1.0.0",
            title: "L3 UI Scenes",
            depends: ["L3_UICore", "L3_UIMenus"],
            provides: ["uiScenes", "shop", "battleHud", "dialogueUi", "notifications", "gameOver"],
            init: function(api) {
                api.Services.register("uiScenes", Scenes);
            }
        });
    }
    if (L3UI.Events) L3UI.Events.emit("uiScenes:ready", { scenes: Scenes });
})();
