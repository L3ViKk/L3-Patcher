/*:
 * @plugindesc L3 Quest System v1.1 - Quetes, marqueurs PNJ, journal, suivi et recompenses L3.
 * @author L3ViKk
 * @version 1.1.0
 *
 * @param Quest Data File
 * @text Fichier des quetes
 * @type text
 * @default L3Quests.json
 *
 * @param Enable Quest Menu Command
 * @text Commande dans le menu
 * @type boolean
 * @default true
 *
 * @param Quest Menu Label
 * @text Texte du menu
 * @type text
 * @default Quetes
 *
 * @param Quest Menu Icon
 * @text Icone du menu
 * @type text
 * @default ?
 *
 * @param Quest Menu Order
 * @text Position du menu
 * @type number
 * @default 55
 *
 * @param Enable Quest Tracker
 * @text Suivi sur la carte
 * @type boolean
 * @default true
 *
 * @param Max Tracked Side Quests
 * @text Max secondaires suivies
 * @type number
 * @default 3
 *
 * @param Max Tracked Special Quests
 * @text Max speciales suivies
 * @type number
 * @default 3
 *
 * @param Enable Quest Markers
 * @text Marqueurs PNJ
 * @type boolean
 * @default true
 *
 * @param Enable Marker Animation
 * @text Animation marqueurs
 * @type boolean
 * @default true
 *
 * @param Main Quest Color
 * @text Couleur principale
 * @type text
 * @default #facc15
 *
 * @param Side Quest Color
 * @text Couleur secondaire
 * @type text
 * @default #22c55e
 *
 * @param Special Quest Color
 * @text Couleur speciale
 * @type text
 * @default #38bdf8
 *
 * @help
 * ============================================================================
 * L3 Quest System
 * ============================================================================
 *
 * Le systeme charge ses quetes depuis data/L3Quests.json.
 *
 * Commandes plugin :
 *
 *   L3Quest openJournal
 *   L3Quest start quest_id
 *   L3Quest finish quest_id
 *   L3Quest fail quest_id
 *   L3Quest completeObjective quest_id objective_id
 *   L3Quest track quest_id
 *   L3Quest untrack quest_id
 *
 * Les recompenses peuvent aussi donner des points de talents, debloquer un
 * noeud d'arbre ou offrir un jeton de reinitialisation.
 *
 * Tags utilisables dans les notes d'un evenement ou en commentaire de page :
 *
 *   <L3Quest: main_001>
 *   <L3QuestRole: giver,turnin>
 *
 * Les marqueurs peuvent aussi venir directement de L3Quests.json avec giver
 * et turnIn. Les quetes principales sont affichees automatiquement dans le
 * tracker. Les quetes secondaires et speciales proposent le suivi a l'acceptation.
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_QuestSystem";
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

    var config = {
        dataFile: readText("Quest Data File", "L3Quests.json"),
        menuCommand: readBool("Enable Quest Menu Command", true),
        menuLabel: readText("Quest Menu Label", "Quetes"),
        menuIcon: readText("Quest Menu Icon", "?"),
        menuOrder: readNumber("Quest Menu Order", 55),
        tracker: readBool("Enable Quest Tracker", true),
        maxSide: Math.max(0, readNumber("Max Tracked Side Quests", 3)),
        maxSpecial: Math.max(0, readNumber("Max Tracked Special Quests", 3)),
        markers: readBool("Enable Quest Markers", true),
        markerAnimation: readBool("Enable Marker Animation", true),
        colors: {
            main: readText("Main Quest Color", "#facc15"),
            side: readText("Side Quest Color", "#22c55e"),
            special: readText("Special Quest Color", "#38bdf8")
        }
    };

    window.$dataL3Quests = null;
    window.$gameL3Quests = null;

    if (DataManager._databaseFiles) {
        var alreadyListed = DataManager._databaseFiles.some(function(file) {
            return file.name === "$dataL3Quests";
        });
        if (!alreadyListed) DataManager._databaseFiles.push({ name: "$dataL3Quests", src: config.dataFile });
    }

    function defaultState() {
        return {
            version: 1,
            quests: {},
            trackedSide: [],
            trackedSpecial: []
        };
    }

    function state() {
        if (!window.$gameL3Quests) window.$gameL3Quests = defaultState();
        if (!$gameL3Quests.quests) $gameL3Quests.quests = {};
        if (!$gameL3Quests.trackedSide) $gameL3Quests.trackedSide = [];
        if (!$gameL3Quests.trackedSpecial) $gameL3Quests.trackedSpecial = [];
        return $gameL3Quests;
    }

    function questList() {
        var source = window.$dataL3Quests;
        if (!source) return [];
        if (Array.isArray(source)) return source;
        if (Array.isArray(source.quests)) return source.quests;
        return [];
    }

    function questById(id) {
        var list = questList();
        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === id) return list[i];
        }
        return null;
    }

    function allQuestIds() {
        return questList().map(function(quest) { return quest.id; });
    }

    function normalizeType(type) {
        type = String(type || "side").toLowerCase();
        if (type === "main" || type === "principal" || type === "principale") return "main";
        if (type === "special" || type === "speciale" || type === "repeatable") return "special";
        return "side";
    }

    function questType(quest) {
        return normalizeType(quest && quest.type);
    }

    function statusLabel(status) {
        return {
            hidden: "Cachee",
            available: "Disponible",
            active: "En cours",
            ready: "A rendre",
            completed: "Terminee",
            failed: "Echouee"
        }[status] || status;
    }

    function statusRank(status) {
        return { ready: 0, active: 1, available: 2, completed: 3, failed: 4, hidden: 5 }[status] || 9;
    }

    function recordFor(id) {
        var s = state();
        if (!s.quests[id]) {
            s.quests[id] = {
                status: "hidden",
                objectives: {},
                tracked: false,
                startedAt: 0,
                completedAt: 0,
                failedAt: 0
            };
        }
        return s.quests[id];
    }

    function frameNow() {
        return Graphics && Graphics.frameCount ? Graphics.frameCount : 0;
    }

    function objectiveTarget(objective) {
        return Number(objective.amount || objective.count || objective.target || 1);
    }

    function initObjectives(quest, record) {
        record.objectives = record.objectives || {};
        var objectives = quest.objectives || [];
        for (var i = 0; i < objectives.length; i++) {
            var obj = objectives[i];
            if (!obj || !obj.id) continue;
            if (!record.objectives[obj.id]) {
                record.objectives[obj.id] = { done: false, progress: 0 };
            }
        }
    }

    function compareNumber(value, condition) {
        if (condition.eq !== undefined) return value === Number(condition.eq);
        if (condition.gte !== undefined && value < Number(condition.gte)) return false;
        if (condition.gt !== undefined && value <= Number(condition.gt)) return false;
        if (condition.lte !== undefined && value > Number(condition.lte)) return false;
        if (condition.lt !== undefined && value >= Number(condition.lt)) return false;
        return true;
    }

    function checkAvailability(quest) {
        var conditions = quest && quest.availability;
        if (!conditions) return true;

        var i;
        var switchesOn = conditions.switchesOn || [];
        for (i = 0; i < switchesOn.length; i++) {
            if (!$gameSwitches.value(Number(switchesOn[i]))) return false;
        }

        var switchesOff = conditions.switchesOff || [];
        for (i = 0; i < switchesOff.length; i++) {
            if ($gameSwitches.value(Number(switchesOff[i]))) return false;
        }

        var variables = conditions.variables || [];
        for (i = 0; i < variables.length; i++) {
            var variable = variables[i];
            if (!variable || !compareNumber($gameVariables.value(Number(variable.id)), variable)) return false;
        }

        var items = conditions.items || [];
        for (i = 0; i < items.length; i++) {
            var itemCondition = items[i];
            var item = itemCondition && $dataItems[Number(itemCondition.id)];
            var amount = Number(itemCondition.amount || 1);
            if (!item || $gameParty.numItems(item) < amount) return false;
        }

        var actors = conditions.actors || conditions.actorIds || [];
        for (i = 0; i < actors.length; i++) {
            var actor = $gameActors.actor(Number(actors[i]));
            if (!actor || $gameParty.members().indexOf(actor) < 0) return false;
        }

        var selfSwitches = conditions.selfSwitches || [];
        for (i = 0; i < selfSwitches.length; i++) {
            var self = selfSwitches[i];
            var key = [Number(self.mapId || $gameMap.mapId()), Number(self.eventId || 0), String(self.ch || self.switch || "A")];
            var expected = self.value !== false;
            if ($gameSelfSwitches.value(key) !== expected) return false;
        }

        return true;
    }

    function objectiveRecord(questId, objectiveId) {
        var record = recordFor(questId);
        if (!record.objectives) record.objectives = {};
        if (!record.objectives[objectiveId]) record.objectives[objectiveId] = { done: false, progress: 0 };
        return record.objectives[objectiveId];
    }

    function objectiveAutoDone(objective) {
        if (!objective) return false;
        var type = String(objective.type || "").toLowerCase();
        if (type === "item") {
            var item = $dataItems[Number(objective.itemId || objective.id)];
            return item && $gameParty.numItems(item) >= objectiveTarget(objective);
        }
        if (type === "keyitem" || type === "key_item" || type === "key-item") {
            var keyItem = $dataItems[Number(objective.keyItemId || objective.itemId || objective.id)];
            return keyItem && $gameParty.numItems(keyItem) >= objectiveTarget(objective);
        }
        if (type === "weapon") {
            var weapon = $dataWeapons[Number(objective.weaponId || objective.id)];
            return weapon && $gameParty.numItems(weapon) >= objectiveTarget(objective);
        }
        if (type === "armor") {
            var armor = $dataArmors[Number(objective.armorId || objective.id)];
            return armor && $gameParty.numItems(armor) >= objectiveTarget(objective);
        }
        if (type === "switch") {
            return $gameSwitches.value(Number(objective.switchId || objective.id)) === (objective.value !== false);
        }
        if (type === "variable") {
            return compareNumber($gameVariables.value(Number(objective.variableId || objective.id)), objective);
        }
        if (type === "actor") {
            var actor = $gameActors.actor(Number(objective.actorId || objective.id));
            return actor && $gameParty.members().indexOf(actor) >= 0;
        }
        if (type === "map") {
            return $gameMap && $gameMap.mapId && $gameMap.mapId() === Number(objective.mapId);
        }
        return false;
    }

    function objectiveText(objective, record) {
        var label = objective.description || objective.label || objective.title || objective.id;
        var type = String(objective.type || "").toLowerCase();
        if (record && record.done) return label;
        if (type === "item") {
            var item = $dataItems[Number(objective.itemId || objective.id)];
            var have = item ? $gameParty.numItems(item) : 0;
            return label + " (" + have + "/" + objectiveTarget(objective) + ")";
        }
        if (type === "keyitem" || type === "key_item" || type === "key-item") {
            var keyItem = $dataItems[Number(objective.keyItemId || objective.itemId || objective.id)];
            var haveKeyItem = keyItem ? $gameParty.numItems(keyItem) : 0;
            return label + " (" + haveKeyItem + "/" + objectiveTarget(objective) + ")";
        }
        if (type === "weapon") {
            var weapon = $dataWeapons[Number(objective.weaponId || objective.id)];
            var haveWeapon = weapon ? $gameParty.numItems(weapon) : 0;
            return label + " (" + haveWeapon + "/" + objectiveTarget(objective) + ")";
        }
        if (type === "armor") {
            var armor = $dataArmors[Number(objective.armorId || objective.id)];
            var haveArmor = armor ? $gameParty.numItems(armor) : 0;
            return label + " (" + haveArmor + "/" + objectiveTarget(objective) + ")";
        }
        if (type === "enemy" || type === "kill") {
            return label + " (" + ((record && record.progress) || 0) + "/" + objectiveTarget(objective) + ")";
        }
        if (type === "variable") {
            var value = $gameVariables.value(Number(objective.variableId || objective.id));
            var goal = objective.gte !== undefined ? objective.gte : objective.eq;
            if (goal !== undefined) return label + " (" + value + "/" + goal + ")";
        }
        return label;
    }

    function allObjectivesDone(quest, record) {
        initObjectives(quest, record);
        var objectives = quest.objectives || [];
        if (!objectives.length) return true;
        for (var i = 0; i < objectives.length; i++) {
            var obj = objectives[i];
            if (!obj || !obj.id) continue;
            if (!record.objectives[obj.id] || !record.objectives[obj.id].done) return false;
        }
        return true;
    }

    function refreshQuest(quest) {
        if (!quest || !quest.id) return;
        var record = recordFor(quest.id);
        initObjectives(quest, record);
        if (record.status === "active" || record.status === "ready") {
            var objectives = quest.objectives || [];
            for (var i = 0; i < objectives.length; i++) {
                var obj = objectives[i];
                if (!obj || !obj.id) continue;
                var objRecord = objectiveRecord(quest.id, obj.id);
                if (!objRecord.done && objectiveAutoDone(obj)) {
                    objRecord.progress = objectiveTarget(obj);
                    objRecord.done = true;
                }
            }
            record.status = allObjectivesDone(quest, record) ? "ready" : "active";
        }
    }

    function refreshAll(silent) {
        var list = questList();
        for (var i = 0; i < list.length; i++) refreshQuest(list[i]);
        if (!silent) notifyChanged();
    }

    function getStatus(id) {
        var quest = questById(id);
        if (!quest) return "hidden";
        refreshQuest(quest);
        var record = recordFor(id);
        if (record.status === "hidden" && checkAvailability(quest)) return "available";
        if (record.status === "completed" && quest.repeatable && checkAvailability(quest)) return "available";
        return record.status || "hidden";
    }

    function setStatus(id, status) {
        var quest = questById(id);
        if (!quest) return false;
        var record = recordFor(id);
        initObjectives(quest, record);
        record.status = status;
        notifyChanged();
        return true;
    }

    function applyRewards(quest) {
        var rewards = quest.rewards || {};
        var rewardLines = [];
        var amount;
        var i;
        function rewardActors(entry) {
            var actorId = Number(entry && entry.actorId || 0);
            if (actorId > 0 && $gameActors.actor(actorId)) return [$gameActors.actor(actorId)];
            return $gameParty.members();
        }
        if (rewards.gold) {
            amount = Number(rewards.gold);
            $gameParty.gainGold(amount);
            rewardLines.push("+" + amount + " " + (window.TextManager && TextManager.currencyUnit ? TextManager.currencyUnit : "G"));
        }
        if (rewards.exp) {
            amount = Number(rewards.exp);
            rewardLines.push("+" + amount + " EXP");
            $gameParty.members().forEach(function(actor) {
                actor.gainExp(amount);
            });
        }
        var items = rewards.items || [];
        for (i = 0; i < items.length; i++) {
            var item = $dataItems[Number(items[i].id)];
            if (item) {
                amount = Number(items[i].amount || 1);
                $gameParty.gainItem(item, amount);
                rewardLines.push("+" + item.name + " x" + amount);
            }
        }
        var weapons = rewards.weapons || [];
        for (i = 0; i < weapons.length; i++) {
            var weapon = $dataWeapons[Number(weapons[i].id)];
            if (weapon) {
                amount = Number(weapons[i].amount || 1);
                $gameParty.gainItem(weapon, amount);
                rewardLines.push("+" + weapon.name + " x" + amount);
            }
        }
        var armors = rewards.armors || [];
        for (i = 0; i < armors.length; i++) {
            var armor = $dataArmors[Number(armors[i].id)];
            if (armor) {
                amount = Number(armors[i].amount || 1);
                $gameParty.gainItem(armor, amount);
                rewardLines.push("+" + armor.name + " x" + amount);
            }
        }
        var switchesOn = rewards.switchesOn || [];
        for (i = 0; i < switchesOn.length; i++) $gameSwitches.setValue(Number(switchesOn[i]), true);
        var switchesOff = rewards.switchesOff || [];
        for (i = 0; i < switchesOff.length; i++) $gameSwitches.setValue(Number(switchesOff[i]), false);
        var variables = rewards.variables || [];
        for (i = 0; i < variables.length; i++) {
            var variable = variables[i];
            if (!variable) continue;
            var id = Number(variable.id);
            if (variable.add !== undefined) $gameVariables.setValue(id, $gameVariables.value(id) + Number(variable.add));
            else if (variable.value !== undefined) $gameVariables.setValue(id, Number(variable.value));
        }
        var skillPoints = rewards.skillPoints || rewards.skillTreePoints || [];
        for (i = 0; i < skillPoints.length; i++) {
            var pointReward = skillPoints[i] || {};
            amount = Number(pointReward.amount || pointReward.points || 1);
            rewardActors(pointReward).forEach(function(actor) {
                if (window.L3SkillTrees && L3SkillTrees.addPoints) L3SkillTrees.addPoints(actor, amount, pointReward.classId);
            });
            rewardLines.push("+" + amount + " point(s) de competence");
        }
        var skillNodes = rewards.skillNodes || rewards.skillTreeNodes || [];
        for (i = 0; i < skillNodes.length; i++) {
            var nodeReward = skillNodes[i] || {};
            var rewardNodeId = nodeReward.nodeId || nodeReward.id;
            if (!rewardNodeId) continue;
            rewardActors(nodeReward).forEach(function(actor) {
                if (window.L3SkillTrees && L3SkillTrees.grant) L3SkillTrees.grant(actor, rewardNodeId, nodeReward.classId, nodeReward.ranks || 1);
            });
            rewardLines.push("Noeud debloque: " + rewardNodeId);
        }
        var resetRewards = rewards.skillResets || rewards.skillTreeResets || [];
        for (i = 0; i < resetRewards.length; i++) {
            var resetReward = resetRewards[i] || {};
            amount = Number(resetReward.amount || 1);
            rewardActors(resetReward).forEach(function(actor) {
                if (window.L3SkillTrees && L3SkillTrees.addResetToken) L3SkillTrees.addResetToken(actor, amount, resetReward.classId);
            });
            rewardLines.push("+" + amount + " jeton(s) de reinitialisation");
        }
        if (rewardLines.length) notifySystem("Recompenses", rewardLines, "reward");
    }

    function consumeObjectiveItems(quest) {
        var objectives = quest.objectives || [];
        for (var i = 0; i < objectives.length; i++) {
            var obj = objectives[i];
            if (!obj) continue;
            var type = String(obj.type || "").toLowerCase();
            var amount = objectiveTarget(obj);
            var item;
            if (type === "item" && obj.consume !== false) {
                item = $dataItems[Number(obj.itemId || obj.id)];
                if (item && amount > 0) $gameParty.gainItem(item, -Math.min(amount, $gameParty.numItems(item)));
            } else if ((type === "keyitem" || type === "key_item" || type === "key-item") && obj.consume !== false) {
                item = $dataItems[Number(obj.keyItemId || obj.itemId || obj.id)];
                if (item && amount > 0) $gameParty.gainItem(item, -Math.min(amount, $gameParty.numItems(item)));
            } else if (type === "weapon" && obj.consume === true) {
                item = $dataWeapons[Number(obj.weaponId || obj.id)];
                if (item && amount > 0) $gameParty.gainItem(item, -Math.min(amount, $gameParty.numItems(item)));
            } else if (type === "armor" && obj.consume === true) {
                item = $dataArmors[Number(obj.armorId || obj.id)];
                if (item && amount > 0) $gameParty.gainItem(item, -Math.min(amount, $gameParty.numItems(item)));
            }
        }
    }

    function removeFromArray(array, value) {
        var index = array.indexOf(value);
        while (index >= 0) {
            array.splice(index, 1);
            index = array.indexOf(value);
        }
    }

    function trackedListForType(type) {
        var s = state();
        return type === "special" ? s.trackedSpecial : s.trackedSide;
    }

    function trackedLimitForType(type) {
        return type === "special" ? config.maxSpecial : config.maxSide;
    }

    function canTrackQuest(quest) {
        var type = questType(quest);
        if (type === "main") return false;
        var status = getStatus(quest.id);
        return status === "active" || status === "ready";
    }

    function activeTrackStatus(quest) {
        var status = getStatus(quest.id);
        return status === "active" || status === "ready";
    }

    function isTrackedTypeId(type, id) {
        var list = trackedListForType(type);
        return list.indexOf(id) >= 0;
    }

    function notifyChanged() {
        if (window.L3UI && L3UI.Events) L3UI.Events.emit("quest:changed", { quests: Quest });
    }

    function toast(message) {
        if (window.L3UI && L3UI.Components && L3UI.Components.Toast) {
            L3UI.Components.Toast(message);
        }
    }

    function notifySystem(title, lines, type) {
        lines = lines || [];
        if (typeof lines === "string") lines = [lines];
        if (window.L3UIScenes && window.L3UIScenes.notify) {
            window.L3UIScenes.notify({
                title: title,
                lines: lines,
                type: type || "system",
                duration: 4600
            });
        } else if (lines.length) {
            toast(title + " : " + lines.join(", "));
        }
    }

    function offerTrackQuest(quest) {
        if (!quest) return;
        var type = questType(quest);
        if (type !== "side" && type !== "special") return;
        if (Quest.isTracked(quest.id)) return;
        setTimeout(function() {
            if (!questById(quest.id) || Quest.isTracked(quest.id)) return;
            if (!canTrackQuest(quest)) {
                toast("Limite de quetes suivies atteinte.");
                return;
            }
            if (window.L3UI && L3UI.Components && L3UI.Components.Modal && L3UI.Components.Button) {
                var modal = L3UI.Components.Modal({
                    className: "l3-quest-track-prompt",
                    kicker: type === "special" ? "Quete speciale" : "Quete secondaire",
                    title: "Suivre cette quete ?",
                    content: quest.title || quest.id
                });
                var actions = L3UI.el("div", { className: "l3-quest-track-prompt-actions" });
                actions.appendChild(L3UI.Components.Button({
                    label: "Suivre",
                    right: "+",
                    on: { click: function() {
                        if (!Quest.track(quest.id)) toast("Limite de quetes suivies atteinte.");
                        modal.close();
                    } }
                }));
                actions.appendChild(L3UI.Components.Button({
                    label: "Plus tard",
                    right: "-",
                    on: { click: function() {
                        modal.close();
                    } }
                }));
                modal.panel.appendChild(actions);
            } else if (window.confirm && window.confirm("Suivre la quete \"" + (quest.title || quest.id) + "\" ?")) {
                Quest.track(quest.id);
            }
        }, 80);
    }

    function dialogueStore(quest) {
        return quest && quest.dialogues ? quest.dialogues : null;
    }

    function dialogueBlock(quest, names) {
        var store = dialogueStore(quest);
        if (!store) return null;
        for (var i = 0; i < names.length; i++) {
            if (store[names[i]]) return store[names[i]];
        }
        return null;
    }

    function dialogueLines(block) {
        if (!block) return [];
        var lines = block.lines || block.text || block.message || [];
        if (typeof lines === "string") lines = lines.split(/\r?\n/);
        if (!Array.isArray(lines)) lines = [];
        return lines.map(function(line) { return String(line || ""); }).filter(function(line) { return line.length > 0; });
    }

    function setupDialogueFace(block) {
        if (!block || !$gameMessage) return;
        var faceName = block.faceName || block.face || "";
        var faceIndex = Number(block.faceIndex || 0);
        if (faceName) $gameMessage.setFaceImage(faceName, faceIndex);
        if (block.background !== undefined) $gameMessage.setBackground(Number(block.background || 0));
        if (block.position !== undefined) $gameMessage.setPositionType(Number(block.position || 2));
    }

    function queueDialogueBlock(block, fallback) {
        if (!$gameMessage) return false;
        block = block || {};
        var lines = dialogueLines(block);
        if (!lines.length && fallback) lines = [fallback];
        if (!lines.length) return false;
        if (block.speaker) lines = [String(block.speaker) + " :"].concat(lines);
        setupDialogueFace(block);
        for (var i = 0; i < lines.length; i++) {
            $gameMessage.add(lines[i]);
        }
        return true;
    }

    function roleForQuestEvent(quest, event, status) {
        if (!quest || !event) return "";
        var isTurnIn = normalizeLocations(quest.turnIn || quest.turnin || quest.receiver || quest.giver).some(function(location) {
            return locationMatches(location, event);
        });
        var isGiver = normalizeLocations(quest.giver).some(function(location) {
            return locationMatches(location, event);
        });

        if (status === "available") return isGiver ? "giver" : "";
        if (status === "ready") return isTurnIn ? "turnin" : "";
        if (status === "active") return isGiver ? "giver" : (isTurnIn ? "turnin" : "");
        if (status === "completed" || status === "failed") return isTurnIn ? "turnin" : (isGiver ? "giver" : "");

        if (isGiver) return "giver";
        if (isTurnIn) return "turnin";
        return "";
    }

    function autoDialogueCandidate(event) {
        var best = null;
        var list = questList();
        for (var i = 0; i < list.length; i++) {
            var quest = list[i];
            if (!dialogueStore(quest)) continue;
            var status = getStatus(quest.id);
            var role = roleForQuestEvent(quest, event, status);
            if (!role) continue;
            var block = null;
            var priority = 99;
            if (status === "ready" && role === "turnin") {
                block = dialogueBlock(quest, ["ready", "turnIn", "complete"]);
                priority = 0;
            } else if (status === "available" && role === "giver") {
                block = dialogueBlock(quest, ["available", "before", "start"]);
                priority = 1;
            } else if (status === "active") {
                block = dialogueBlock(quest, ["active", "inProgress", "progress"]);
                priority = 2;
            } else if (status === "completed") {
                block = dialogueBlock(quest, ["completed", "done", "after"]);
                priority = 3;
            } else if (status === "failed") {
                block = dialogueBlock(quest, ["failed"]);
                priority = 4;
            }
            if (block && (!best || priority < best.priority)) {
                best = { quest: quest, role: role, status: status, block: block, priority: priority };
            }
        }
        return best;
    }

    function playAcceptDialogue(quest) {
        var block = dialogueBlock(quest, ["accepted", "accept"]);
        queueDialogueBlock(block, "J'accepte.");
        offerTrackWhenMessageFree(quest);
    }

    function runWhenMessageFree(callback) {
        var tries = 0;
        function wait() {
            tries++;
            if (!$gameMessage || !$gameMessage.isBusy() || tries > 120) callback();
            else setTimeout(wait, 80);
        }
        setTimeout(wait, 80);
    }

    function offerTrackWhenMessageFree(quest) {
        setTimeout(function() {
            runWhenMessageFree(function() {
                offerTrackQuest(quest);
            });
        }, 160);
    }

    function playDeclineDialogue(quest) {
        var block = dialogueBlock(quest, ["decline", "refuse", "denied"]);
        queueDialogueBlock(block, "Peut-etre une autre fois.");
    }

    function playAvailableDialogue(quest, block) {
        var choices = block.choices || {};
        var acceptText = choices.accept || block.acceptText || "Accepter";
        var declineText = choices.decline || block.declineText || "Refuser";
        queueDialogueBlock(block, quest.title || quest.id);
        $gameMessage.setChoices([acceptText, declineText], 0, 1);
        $gameMessage.setChoiceCallback(function(index) {
            if (index === 0) {
                Quest.start(quest.id, true, true);
                runWhenMessageFree(function() {
                    playAcceptDialogue(quest);
                });
            } else {
                runWhenMessageFree(function() {
                    playDeclineDialogue(quest);
                });
            }
        });
        return true;
    }

    function playAutoDialogue(event) {
        if (!$gameMessage || $gameMessage.isBusy()) return false;
        var candidate = autoDialogueCandidate(event);
        if (!candidate) return false;
        if (candidate.status === "available" && candidate.role === "giver") {
            return playAvailableDialogue(candidate.quest, candidate.block);
        }
        if (candidate.status === "ready" && candidate.role === "turnin") {
            queueDialogueBlock(candidate.block, "Merci.");
            Quest.finish(candidate.quest.id);
            return true;
        }
        if (candidate.status === "active") Quest.onEventTalk(event);
        return queueDialogueBlock(candidate.block, candidate.quest.title || candidate.quest.id);
    }

    function locationMatches(location, event) {
        if (!location || !event || !$gameMap) return false;
        var mapId = Number(location.mapId || $gameMap.mapId());
        if (mapId !== $gameMap.mapId()) return false;
        if (location.eventId !== undefined && Number(location.eventId) !== event.eventId()) return false;
        if (location.eventName && event.event && event.event().name !== location.eventName) return false;
        return true;
    }

    function normalizeLocations(value) {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }

    function pageComments(event) {
        if (!event || !event.page || !event.page()) return "";
        var list = event.page().list || [];
        var text = "";
        for (var i = 0; i < list.length; i++) {
            if ((list[i].code === 108 || list[i].code === 408) && list[i].parameters) {
                text += String(list[i].parameters[0] || "") + "\n";
            }
        }
        return text;
    }

    function parseEventTags(event) {
        var data = event && event.event ? event.event() : null;
        var source = ((data && data.note) || "") + "\n" + pageComments(event);
        var questIds = [];
        var match;
        var questRegex = /<L3Quest:\s*([^>]+)>/gi;
        while ((match = questRegex.exec(source))) {
            questIds.push(String(match[1]).trim());
        }
        var roleMatch = /<L3QuestRole:\s*([^>]+)>/i.exec(source);
        var markerMatch = /<L3QuestMarker:\s*([^>]+)>/i.exec(source);
        return {
            questIds: questIds,
            roles: roleMatch ? roleMatch[1].split(",").map(function(role) { return String(role).trim().toLowerCase(); }) : null,
            marker: markerMatch ? String(markerMatch[1]).trim().toLowerCase() !== "false" : true
        };
    }

    function eventQuestLinks(event) {
        var result = [];
        if (!event || !$gameMap) return result;

        var tags = parseEventTags(event);
        if (tags.marker === false) return result;

        tags.questIds.forEach(function(id) {
            var quest = questById(id);
            if (quest) result.push({ quest: quest, roles: tags.roles || ["giver", "turnin"] });
        });

        questList().forEach(function(quest) {
            var roles = [];
            normalizeLocations(quest.giver).forEach(function(location) {
                if (locationMatches(location, event)) roles.push("giver");
            });
            normalizeLocations(quest.turnIn || quest.turnin || quest.receiver || quest.giver).forEach(function(location) {
                if (locationMatches(location, event)) roles.push("turnin");
            });
            if (roles.length) result.push({ quest: quest, roles: roles });
        });

        return result;
    }

    function markerForEvent(event) {
        var links = eventQuestLinks(event);
        var candidates = [];
        for (var i = 0; i < links.length; i++) {
            var quest = links[i].quest;
            var roles = links[i].roles || [];
            var status = getStatus(quest.id);
            if (status === "ready" && roles.indexOf("turnin") >= 0) {
                candidates.push({ quest: quest, status: status, symbol: "?", rank: 0 });
            } else if (status === "available" && roles.indexOf("giver") >= 0) {
                candidates.push({ quest: quest, status: status, symbol: "!", rank: 1 });
            }
        }
        if (!candidates.length) return null;
        candidates.sort(function(a, b) {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return statusRank(a.status) - statusRank(b.status);
        });
        var selected = candidates[0];
        selected.type = questType(selected.quest);
        selected.color = config.colors[selected.type] || config.colors.side;
        return selected;
    }

    function canvasRect() {
        if (Graphics && Graphics._canvas && Graphics._canvas.getBoundingClientRect) {
            return Graphics._canvas.getBoundingClientRect();
        }
        return { left: 0, top: 0, width: Graphics.width, height: Graphics.height };
    }

    function markerPosition(event) {
        var rect = canvasRect();
        var sx = rect.width / Math.max(1, Graphics.width || Graphics.boxWidth || rect.width);
        var sy = rect.height / Math.max(1, Graphics.height || Graphics.boxHeight || rect.height);
        var offset = ($gameMap ? $gameMap.tileHeight() : 48) * 1.35;
        return {
            left: rect.left + event.screenX() * sx,
            top: rect.top + (event.screenY() - offset) * sy
        };
    }

    function updateQuestMarkers(scene) {
        if (!config.markers || !window.L3UI || !(scene instanceof Scene_Map) || !$gameMap) return;
        var layer = L3UI.layer(scene, "quest-markers");
        if (!scene._l3QuestMarkers) scene._l3QuestMarkers = {};

        var alive = {};
        var events = $gameMap.events();
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            if (!event || event._erased) continue;
            if (!event.page || !event.page()) continue;
            var marker = markerForEvent(event);
            var id = String(event.eventId());
            if (!marker) continue;
            alive[id] = true;
            var node = scene._l3QuestMarkers[id];
            if (!node || !node.parentNode) {
                node = L3UI.el("div", { className: "l3-quest-marker" });
                layer.appendChild(node);
                scene._l3QuestMarkers[id] = node;
            }
            node.className = "l3-quest-marker is-" + marker.type + " " + (config.markerAnimation ? "is-animated" : "");
            node.textContent = marker.symbol;
            node.style.borderColor = marker.color;
            node.style.color = marker.color;
            node.style.boxShadow = "0 0 18px " + marker.color;
            var pos = markerPosition(event);
            node.style.left = Math.round(pos.left) + "px";
            node.style.top = Math.round(pos.top) + "px";
        }

        for (var key in scene._l3QuestMarkers) {
            if (scene._l3QuestMarkers.hasOwnProperty(key) && !alive[key]) {
                var old = scene._l3QuestMarkers[key];
                if (old && old.parentNode) old.parentNode.removeChild(old);
                delete scene._l3QuestMarkers[key];
            }
        }
    }

    function trackedQuestGroups() {
        refreshAll(true);
        var result = {
            main: [],
            side: [],
            special: []
        };
        var list = questList();
        var i;
        for (i = 0; i < list.length; i++) {
            if (questType(list[i]) === "main") {
                if (activeTrackStatus(list[i])) result.main.push(list[i]);
            }
        }
        var s = state();
        var trackedIds = s.trackedSide.slice();
        for (i = 0; i < trackedIds.length; i++) {
            var sideQuest = questById(trackedIds[i]);
            if (sideQuest && questType(sideQuest) === "side" && activeTrackStatus(sideQuest)) result.side.push(sideQuest);
        }
        trackedIds = s.trackedSpecial.slice();
        for (i = 0; i < trackedIds.length; i++) {
            var specialQuest = questById(trackedIds[i]);
            if (specialQuest && questType(specialQuest) === "special" && activeTrackStatus(specialQuest)) result.special.push(specialQuest);
        }
        return result;
    }

    function trackedQuests() {
        var groups = trackedQuestGroups();
        return groups.main.concat(groups.side).concat(groups.special);
    }

    function trackedSectionSignature(type, quests) {
        var parts = [type, quests.length];
        for (var i = 0; i < quests.length; i++) {
            parts.push(trackedQuestSignature(quests[i]));
        }
        return parts.join("|");
    }

    function trackedQuestSignature(quest) {
        var record = recordFor(quest.id);
        initObjectives(quest, record);
        var objectives = quest.objectives || [];
        var parts = [quest.id, getStatus(quest.id)];
        for (var i = 0; i < objectives.length; i++) {
            var obj = objectives[i];
            var objRecord = record.objectives[obj.id] || {};
            parts.push(obj.id + ":" + (objRecord.done ? 1 : 0) + ":" + (objRecord.progress || 0) + ":" + objectiveText(obj, objRecord));
        }
        return parts.join("/");
    }

    function trackerSignature() {
        var groups = trackedQuestGroups();
        return [
            trackedSectionSignature("main", groups.main),
            trackedSectionSignature("side", groups.side),
            trackedSectionSignature("special", groups.special)
        ].join("||");
    }

    function buildObjectiveList(quest, compact) {
        var record = recordFor(quest.id);
        initObjectives(quest, record);
        var list = L3UI.el("div", { className: compact ? "l3-quest-objectives is-compact" : "l3-quest-objectives" });
        var objectives = quest.objectives || [];
        if (!objectives.length) {
            list.appendChild(L3UI.el("div", { className: "l3-quest-objective is-done", text: "Aucun objectif detaille." }));
            return list;
        }
        for (var i = 0; i < objectives.length; i++) {
            var obj = objectives[i];
            if (!obj || !obj.id) continue;
            var objRecord = record.objectives[obj.id] || {};
            list.appendChild(L3UI.el("div", {
                className: "l3-quest-objective " + (objRecord.done ? "is-done" : ""),
                html:
                    "<span>" + (objRecord.done ? "OK" : "•") + "</span>" +
                    "<p>" + L3UI.escapeHtml(objectiveText(obj, objRecord)) + "</p>"
            }));
        }
        return list;
    }

    function updateQuestTracker(scene, force) {
        if (!config.tracker || !window.L3UI || !(scene instanceof Scene_Map)) return;
        var layer = L3UI.layer(scene, "quest-tracker");
        var groups = trackedQuestGroups();
        var signature = trackerSignature();
        if (!force && scene._l3QuestTrackerSignature === signature) return;
        scene._l3QuestTrackerSignature = signature;
        L3UI.empty(layer);

        var panel = L3UI.el("aside", { className: "l3-quest-tracker" });
        panel.appendChild(L3UI.el("div", { className: "l3-quest-tracker-title", text: config.menuLabel }));
        panel.appendChild(buildTrackerSection("main", "Quete principale", groups.main, null));
        panel.appendChild(buildTrackerSection("side", "Quetes secondaires", groups.side, config.maxSide));
        panel.appendChild(buildTrackerSection("special", "Quetes speciales", groups.special, config.maxSpecial));
        layer.appendChild(panel);
    }

    function buildTrackerSection(type, title, quests, limit) {
        var section = L3UI.el("section", { className: "l3-quest-tracker-section is-" + type });
        var label = title;
        if (limit !== null && limit !== undefined) label += " (" + quests.length + "/" + limit + ")";
        section.appendChild(L3UI.el("div", { className: "l3-quest-tracker-section-title", text: label }));
        if (!quests.length) {
            section.appendChild(L3UI.el("div", { className: "l3-quest-track-empty", text: type === "main" ? "Aucune quete principale en cours." : "Aucune quete suivie." }));
            return section;
        }
        for (var i = 0; i < quests.length; i++) {
            var quest = quests[i];
            var item = L3UI.el("section", { className: "l3-quest-track-item is-" + type });
            item.style.borderLeftColor = config.colors[type] || config.colors.side;
            item.appendChild(L3UI.el("h3", { text: quest.title || quest.id }));
            item.appendChild(buildObjectiveList(quest, true));
            section.appendChild(item);
        }
        return section;
    }

    function questsForTab(tab) {
        refreshAll(true);
        var list = questList().filter(function(quest) {
            var status = getStatus(quest.id);
            var type = questType(quest);
            if (tab === "finished") return status === "completed" || status === "failed";
            if (status !== "active" && status !== "ready") return false;
            return type === tab;
        });
        list.sort(function(a, b) {
            var statusA = getStatus(a.id);
            var statusB = getStatus(b.id);
            if (statusRank(statusA) !== statusRank(statusB)) return statusRank(statusA) - statusRank(statusB);
            return String(a.title || a.id).localeCompare(String(b.title || b.id));
        });
        return list;
    }

    function rewardText(quest) {
        var rewards = quest.rewards || {};
        var lines = [];
        if (rewards.gold) lines.push(rewards.gold + " G");
        if (rewards.exp) lines.push(rewards.exp + " EXP");
        function namedRewards(source, data) {
            var result = [];
            for (var i = 0; i < source.length; i++) {
                var entry = source[i];
                var obj = data[Number(entry.id)];
                if (obj) result.push((entry.amount || 1) + "x " + obj.name);
            }
            return result;
        }
        lines = lines.concat(namedRewards(rewards.items || [], $dataItems));
        lines = lines.concat(namedRewards(rewards.weapons || [], $dataWeapons));
        lines = lines.concat(namedRewards(rewards.armors || [], $dataArmors));
        (rewards.skillPoints || rewards.skillTreePoints || []).forEach(function(entry) {
            lines.push((entry.amount || entry.points || 1) + " point(s) de competence");
        });
        (rewards.skillNodes || rewards.skillTreeNodes || []).forEach(function(entry) {
            lines.push("Noeud: " + (entry.nodeId || entry.id));
        });
        (rewards.skillResets || rewards.skillTreeResets || []).forEach(function(entry) {
            lines.push((entry.amount || 1) + " reset talent");
        });
        return lines.length ? lines.join(", ") : "Aucune recompense affichee.";
    }

    function renderJournal(scene) {
        if (!window.L3UI) return;
        refreshAll();
        L3UI.clear(scene);
        var tab = scene._l3QuestTab || "main";
        var list = questsForTab(tab);
        if (!scene._l3QuestSelected || list.every(function(quest) { return quest.id !== scene._l3QuestSelected; })) {
            scene._l3QuestSelected = list.length ? list[0].id : null;
        }
        var selected = scene._l3QuestSelected ? questById(scene._l3QuestSelected) : null;

        var screen = L3UI.Layout.screen(scene, { className: "l3-quest-journal-screen", mount: false });
        var sidebar = L3UI.el("aside", { className: "l3-quest-journal-sidebar l3-panel" });
        var detail = L3UI.el("main", { className: "l3-quest-journal-detail l3-panel" });

        sidebar.appendChild(L3UI.el("div", { className: "l3-kicker", text: "Journal" }));
        sidebar.appendChild(L3UI.el("h1", { className: "l3-title", text: config.menuLabel }));

        var tabs = [
            { id: "main", label: "Principale" },
            { id: "side", label: "Secondaires" },
            { id: "special", label: "Speciales" },
            { id: "finished", label: "Terminees" }
        ];
        var tabBar = L3UI.el("div", { className: "l3-quest-tabs" });
        tabs.forEach(function(tabItem) {
            tabBar.appendChild(L3UI.Components.Button({
                label: tabItem.label,
                className: tab === tabItem.id ? "is-current" : "",
                on: { click: function() {
                    scene._l3QuestTab = tabItem.id;
                    scene._l3QuestSelected = null;
                    renderJournal(scene);
                } }
            }));
        });
        sidebar.appendChild(tabBar);

        var questButtons = L3UI.el("div", { className: "l3-quest-list" });
        if (!list.length) {
            questButtons.appendChild(L3UI.el("div", { className: "l3-quest-empty", text: "Aucune quete dans cette categorie." }));
        }
        list.forEach(function(quest) {
            var status = getStatus(quest.id);
            questButtons.appendChild(L3UI.Components.Button({
                label: quest.title || quest.id,
                right: statusLabel(status),
                className: (selected && selected.id === quest.id ? "is-current " : "") + "is-" + questType(quest),
                on: { click: function() {
                    scene._l3QuestSelected = quest.id;
                    renderJournal(scene);
                } }
            }));
        });
        sidebar.appendChild(questButtons);
        sidebar.appendChild(L3UI.el("footer", { className: "l3-quest-footer", text: "ESC retour" }));

        if (selected) renderQuestDetail(scene, detail, selected);
        else detail.appendChild(L3UI.Components.Panel({ title: "Aucune selection", content: "Selectionnez une quete pour afficher ses details." }));

        screen.appendChild(sidebar);
        screen.appendChild(detail);
        L3UI.mount(scene, screen);
    }

    function renderQuestDetail(scene, detail, quest) {
        var status = getStatus(quest.id);
        var type = questType(quest);
        var header = L3UI.el("header", { className: "l3-quest-detail-header is-" + type });
        header.style.borderLeftColor = config.colors[type] || config.colors.side;
        header.appendChild(L3UI.el("div", { className: "l3-kicker", text: statusLabel(status) }));
        header.appendChild(L3UI.el("h2", { text: quest.title || quest.id }));
        header.appendChild(L3UI.el("p", { text: quest.description || quest.summary || "" }));
        detail.appendChild(header);

        detail.appendChild(L3UI.el("h3", { className: "l3-quest-section-title", text: "Objectifs" }));
        detail.appendChild(buildObjectiveList(quest, false));

        detail.appendChild(L3UI.el("h3", { className: "l3-quest-section-title", text: "Recompenses" }));
        detail.appendChild(L3UI.el("p", { className: "l3-quest-rewards", text: rewardText(quest) }));

        var actions = L3UI.el("div", { className: "l3-quest-actions" });
        if (status === "available") {
            actions.appendChild(L3UI.Components.Button({
                label: "Demarrer",
                right: ">",
                on: { click: function() {
                    Quest.start(quest.id);
                    renderJournal(scene);
                } }
            }));
        } else if (status === "ready") {
            actions.appendChild(L3UI.Components.Button({
                label: "Terminer",
                right: ">",
                on: { click: function() {
                    Quest.finish(quest.id);
                    renderJournal(scene);
                } }
            }));
        }

        if (type === "main") {
            actions.appendChild(L3UI.el("div", { className: "l3-quest-follow-note", text: "La quete principale est suivie automatiquement." }));
        } else {
            var isTracked = Quest.isTracked(quest.id);
            var canTrack = canTrackQuest(quest);
            actions.appendChild(L3UI.Components.Button({
                label: isTracked ? "Ne plus suivre" : "Suivre cette quete",
                right: isTracked ? "-" : "+",
                disabled: !isTracked && !canTrack,
                on: { click: function() {
                    if (isTracked) Quest.untrack(quest.id);
                    else if (!Quest.track(quest.id)) toast("Limite de quetes suivies atteinte.");
                    renderJournal(scene);
                } }
            }));
        }
        detail.appendChild(actions);
    }

    function installMenuCommand() {
        if (!config.menuCommand || !window.L3UI || !L3UI.Slots) return;
        L3UI.Slots.add("menu.commands", "l3-quests", {
            label: config.menuLabel,
            icon: config.menuIcon,
            order: config.menuOrder,
            handler: function() {
                Quest.openJournal();
            }
        });
    }

    function installCss() {
        if (!window.L3UI) return;
        L3UI.addCss("l3-quest-system-css",
            ".l3-quest-marker{position:absolute;width:30px;height:30px;margin-left:-15px;margin-top:-30px;display:flex;align-items:center;justify-content:center;border:2px solid currentColor;border-radius:999px;background:rgba(8,13,24,.88);font-size:22px;font-weight:900;line-height:1;text-shadow:0 2px 8px rgba(0,0,0,.65);pointer-events:none;z-index:20;}" +
            ".l3-quest-marker:after{content:\"\";position:absolute;left:50%;bottom:-7px;width:9px;height:9px;margin-left:-5px;background:rgba(8,13,24,.88);border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);}" +
            ".l3-quest-marker.is-animated{animation:l3QuestFloat 1.25s ease-in-out infinite;}" +
            "@keyframes l3QuestFloat{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-7px) scale(1.05);}}" +
            ".l3-quest-tracker{position:absolute;right:24px;top:92px;width:360px;max-height:calc(100vh - 138px);overflow:auto;padding:16px;border:1px solid rgba(148,163,184,.22);border-radius:8px;background:rgba(8,13,24,.82);box-shadow:0 18px 54px rgba(0,0,0,.32);pointer-events:none;}" +
            ".l3-quest-tracker-title{margin:0 0 12px;color:#9aa8bd;color:var(--l3-muted);font-size:12px;text-transform:uppercase;letter-spacing:0;}" +
            ".l3-quest-tracker-section{padding:0 0 12px;margin:0 0 12px;border-bottom:1px solid rgba(148,163,184,.12);}" +
            ".l3-quest-tracker-section:last-child{margin-bottom:0;padding-bottom:0;border-bottom:0;}" +
            ".l3-quest-tracker-section-title{margin:0 0 8px;color:#9aa8bd;color:var(--l3-muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0;}" +
            ".l3-quest-track-empty{padding:8px 0 6px 12px;border-left:3px solid rgba(148,163,184,.24);color:#9aa8bd;color:var(--l3-muted);font-size:12px;}" +
            ".l3-quest-track-item{padding:8px 0 8px 12px;border-left:3px solid #38bdf8;}" +
            ".l3-quest-track-item+.l3-quest-track-item{margin-top:8px;border-top:1px solid rgba(148,163,184,.12);}" +
            ".l3-quest-track-item h3{margin:0 0 8px;font-size:16px;line-height:1.15;color:#f8fafc;color:var(--l3-text);}" +
            ".l3-quest-journal-screen{display:grid;grid-template-columns:360px minmax(0,1fr);gap:22px;padding:28px;}" +
            ".l3-quest-journal-sidebar,.l3-quest-journal-detail{min-width:0;min-height:0;padding:20px;overflow:auto;}" +
            ".l3-quest-journal-sidebar{display:flex;flex-direction:column;}" +
            ".l3-quest-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0;}" +
            ".l3-quest-tabs .l3-button{min-height:40px;padding:8px 10px;}" +
            ".l3-quest-list{display:flex;flex-direction:column;gap:8px;}" +
            ".l3-quest-empty{padding:14px;border:1px dashed rgba(148,163,184,.22);border-radius:8px;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-quest-footer{margin-top:auto;padding-top:18px;color:#9aa8bd;color:var(--l3-muted);font-size:13px;}" +
            ".l3-quest-detail-header{padding:0 0 18px 18px;border-left:4px solid #38bdf8;border-bottom:1px solid rgba(148,163,184,.14);}" +
            ".l3-quest-detail-header h2{margin:4px 0 10px;font-size:34px;line-height:1.05;color:#f8fafc;color:var(--l3-text);}" +
            ".l3-quest-detail-header p{margin:0;max-width:860px;color:#9aa8bd;color:var(--l3-muted);line-height:1.45;}" +
            ".l3-quest-section-title{margin:22px 0 10px;font-size:16px;text-transform:uppercase;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-quest-objectives{display:flex;flex-direction:column;gap:8px;}" +
            ".l3-quest-objective{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:rgba(30,42,61,.68);}" +
            ".l3-quest-objective span{min-width:24px;color:#fb4f7a;color:var(--l3-accent-2);font-weight:700;}" +
            ".l3-quest-objective p{margin:0;color:#f8fafc;color:var(--l3-text);line-height:1.3;}" +
            ".l3-quest-objective.is-done{opacity:.62;}" +
            ".l3-quest-objective.is-done p{text-decoration:line-through;}" +
            ".l3-quest-objectives.is-compact{gap:5px;}" +
            ".l3-quest-objectives.is-compact .l3-quest-objective{padding:0;border:0;background:transparent;}" +
            ".l3-quest-objectives.is-compact .l3-quest-objective span{min-width:20px;font-size:11px;}" +
            ".l3-quest-objectives.is-compact .l3-quest-objective p{font-size:13px;color:#cbd5e1;}" +
            ".l3-quest-rewards{margin:0;padding:12px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:rgba(30,42,61,.46);color:#f8fafc;color:var(--l3-text);}" +
            ".l3-quest-actions{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:10px;margin-top:22px;align-items:center;}" +
            ".l3-quest-follow-note{padding:12px;color:#9aa8bd;color:var(--l3-muted);}" +
            ".l3-quest-track-prompt .l3-modal{width:min(520px,calc(100vw - 48px));}" +
            ".l3-quest-track-prompt-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;}" +
            "@media (max-width:1100px){.l3-quest-journal-screen{grid-template-columns:1fr;padding:16px;}.l3-quest-tracker{right:14px;top:72px;width:300px;}}" +
            "@media (max-width:800px){.l3-quest-tracker{display:none;}.l3-quest-actions{grid-template-columns:1fr;}}"
        );
    }

    var Quest = {
        config: config,

        all: function() {
            return questList().slice();
        },

        get: questById,

        state: state,

        status: getStatus,

        isAvailable: function(id) {
            return getStatus(id) === "available";
        },

        isReady: function(id) {
            return getStatus(id) === "ready";
        },

        start: function(id, force, silentTrackOffer) {
            var quest = questById(id);
            if (!quest) return false;
            var status = getStatus(id);
            if (!force && status !== "available") return false;
            var record = recordFor(id);
            record.status = "active";
            record.startedAt = frameNow();
            record.completedAt = 0;
            record.failedAt = 0;
            record.objectives = {};
            initObjectives(quest, record);
            refreshQuest(quest);
            notifyChanged();
            if (!silentTrackOffer) offerTrackQuest(quest);
            return true;
        },

        forceStart: function(id) {
            return this.start(id, true);
        },

        completeObjective: function(id, objectiveId, amount) {
            var quest = questById(id);
            if (!quest || !objectiveId) return false;
            var record = recordFor(id);
            if (record.status === "hidden" || record.status === "available") record.status = "active";
            initObjectives(quest, record);
            var obj = null;
            for (var i = 0; i < (quest.objectives || []).length; i++) {
                if (quest.objectives[i].id === objectiveId) obj = quest.objectives[i];
            }
            var objRecord = objectiveRecord(id, objectiveId);
            var target = obj ? objectiveTarget(obj) : 1;
            objRecord.progress = Math.min(target, Number(objRecord.progress || 0) + Number(amount || target));
            objRecord.done = objRecord.progress >= target;
            refreshQuest(quest);
            notifyChanged();
            return true;
        },

        finish: function(id) {
            var quest = questById(id);
            if (!quest) return false;
            refreshQuest(quest);
            var status = getStatus(id);
            if (status !== "ready" && status !== "active") return false;
            var record = recordFor(id);
            if (!allObjectivesDone(quest, record)) return false;
            record.status = "completed";
            record.completedAt = frameNow();
            consumeObjectiveItems(quest);
            applyRewards(quest);
            this.untrack(id);
            notifyChanged();
            return true;
        },

        fail: function(id) {
            if (!questById(id)) return false;
            var record = recordFor(id);
            record.status = "failed";
            record.failedAt = frameNow();
            this.untrack(id);
            notifyChanged();
            return true;
        },

        track: function(id) {
            var quest = questById(id);
            if (!quest || !canTrackQuest(quest)) return false;
            var type = questType(quest);
            if (type === "main") return false;
            var list = trackedListForType(type);
            if (list.indexOf(id) >= 0) return true;
            if (list.length >= trackedLimitForType(type)) return false;
            list.push(id);
            recordFor(id).tracked = true;
            notifyChanged();
            return true;
        },

        untrack: function(id) {
            var s = state();
            removeFromArray(s.trackedSide, id);
            removeFromArray(s.trackedSpecial, id);
            if (s.quests[id]) s.quests[id].tracked = false;
            notifyChanged();
            return true;
        },

        isTracked: function(id) {
            var s = state();
            return s.trackedSide.indexOf(id) >= 0 || s.trackedSpecial.indexOf(id) >= 0;
        },

        openJournal: function() {
            if (window.L3UI && L3UI.Scenes) L3UI.Scenes.push("l3QuestJournal");
        },

        refresh: refreshAll,

        trackedQuests: trackedQuests,

        playEventDialogue: playAutoDialogue,

        onEventTalk: function(event) {
            if (!event || !$gameMap) return;
            questList().forEach(function(quest) {
                var status = getStatus(quest.id);
                if (status !== "active" && status !== "ready") return;
                var objectives = quest.objectives || [];
                for (var i = 0; i < objectives.length; i++) {
                    var obj = objectives[i];
                    if (!obj || !obj.id) continue;
                    var type = String(obj.type || "").toLowerCase();
                    if (type !== "talk" && type !== "interact" && type !== "event") continue;
                    var mapOk = obj.mapId === undefined || Number(obj.mapId) === $gameMap.mapId();
                    var eventOk = obj.eventId === undefined || Number(obj.eventId) === event.eventId();
                    if (mapOk && eventOk) Quest.completeObjective(quest.id, obj.id);
                }
            });
        },

        onEnemyKilled: function(enemyId) {
            questList().forEach(function(quest) {
                var status = getStatus(quest.id);
                if (status !== "active" && status !== "ready") return;
                var objectives = quest.objectives || [];
                for (var i = 0; i < objectives.length; i++) {
                    var obj = objectives[i];
                    if (!obj || !obj.id) continue;
                    var type = String(obj.type || "").toLowerCase();
                    if (type !== "enemy" && type !== "kill") continue;
                    if (obj.enemyId === undefined || Number(obj.enemyId) === Number(enemyId)) {
                        Quest.completeObjective(quest.id, obj.id, 1);
                    }
                }
            });
        }
    };

    window.L3Quest = Quest;

    var _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        window.$gameL3Quests = defaultState();
    };

    var _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        var contents = _DataManager_makeSaveContents.call(this);
        contents.l3Quests = state();
        return contents;
    };

    var _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        window.$gameL3Quests = contents.l3Quests || defaultState();
    };

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (String(command).toLowerCase() !== "l3quest") return;
        args = args || [];
        var action = String(args[0] || "").toLowerCase();
        var questId = args[1];
        var objectiveId = args[2];
        if (action === "openjournal" || action === "open") Quest.openJournal();
        else if (action === "start") Quest.forceStart(questId);
        else if (action === "finish" || action === "complete") Quest.finish(questId);
        else if (action === "fail") Quest.fail(questId);
        else if (action === "completeobjective" || action === "objective") Quest.completeObjective(questId, objectiveId, Number(args[3] || 1));
        else if (action === "track") Quest.track(questId);
        else if (action === "untrack") Quest.untrack(questId);
        else if (action === "refresh") Quest.refresh();
    };

    var _Game_Event_start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        if (Quest.playEventDialogue(this)) return;
        Quest.onEventTalk(this);
        _Game_Event_start.call(this);
    };

    var _Game_Enemy_die = Game_Enemy.prototype.die;
    Game_Enemy.prototype.die = function() {
        var enemyId = this.enemyId ? this.enemyId() : 0;
        _Game_Enemy_die.call(this);
        if (enemyId) Quest.onEnemyKilled(enemyId);
    };

    var _Game_Party_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
        _Game_Party_gainItem.call(this, item, amount, includeEquip);
        Quest.refresh();
    };

    var _Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        _Game_Switches_setValue.call(this, switchId, value);
        Quest.refresh();
    };

    var _Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        _Game_Variables_setValue.call(this, variableId, value);
        Quest.refresh();
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Graphics.frameCount % 10 === 0) refreshAll(true);
        updateQuestMarkers(this);
        updateQuestTracker(this);
    };

    if (window.L3UI && L3UI.Scenes) {
        L3UI.Scenes.register("l3QuestJournal", {
            title: config.menuLabel,
            render: function(scene) {
                scene._l3QuestTab = scene._l3QuestTab || "main";
                renderJournal(scene);
            },
            update: function(scene) {
                if (Input.isTriggered("cancel") || TouchInput.isCancelled()) SceneManager.pop();
            }
        });
    }

    installCss();
    installMenuCommand();

    if (window.L3UI && L3UI.Services) L3UI.Services.register("quests", Quest);
    if (window.L3UI && L3UI.Plugins) {
        L3UI.Plugins.register(PLUGIN_NAME, {
            version: "1.0.0",
            title: "L3 Quest System",
            depends: ["L3_UICore", "L3_UIMenus"],
            provides: ["quests", "quest.markers", "quest.tracker", "quest.journal"]
        });
    }
})();
