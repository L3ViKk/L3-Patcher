/*:
 * @plugindesc L3 Skill Trees v2.0 - Arbres de competences par classe pour L3 UI.
 * @author L3ViKk
 * @version 2.0.0
 *
 * @param Data File
 * @text Fichier de donnees
 * @type text
 * @default L3SkillTrees.json
 *
 * @param Enable Menu Command
 * @text Ajouter au menu
 * @type boolean
 * @default true
 *
 * @param Menu Label
 * @text Libelle du menu
 * @type text
 * @default Talents
 *
 * @param Menu Icon
 * @text Icone du menu
 * @type text
 * @default *
 *
 * @param Menu Order
 * @text Ordre du menu
 * @type number
 * @default 25
 *
 * @param Points Per Level
 * @text Points par niveau
 * @type number
 * @default 1
 *
 * @param First Point Level
 * @text Premier niveau avec point
 * @type number
 * @default 2
 *
 * @param Debug
 * @text Debug
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * L3 Skill Trees
 * ============================================================================
 *
 * Ajoute des arbres de competences par classe. Chaque classe peut avoir autant
 * de branches que necessaire, avec des noeuds passifs ou des skills a apprendre.
 *
 * Commandes de plugin :
 *
 *   L3SkillTree open
 *   L3SkillTree open 1
 *   L3SkillTree addPoints 1 3
 *   L3SkillTree reset 1
 *   L3SkillTree reset 1 1 free
 *   L3SkillTree resetToken 1 1
 *   L3SkillTree grant 1 node_id 1
 *   L3SkillTree learn 1 node_id
 *
 * Les donnees sont dans data/L3SkillTrees.json et peuvent etre editees avec
 * L3 Plugins Management.
 *
 * Ce plugin doit etre place apres L3_UICore, L3_UIMenus et avant ou apres
 * L3_UIScenes.
 */
(function() {
    "use strict";

    var PLUGIN_NAME = "L3_SkillTrees";
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
        dataFile: readText("Data File", "L3SkillTrees.json"),
        menuCommand: readBool("Enable Menu Command", true),
        menuLabel: readText("Menu Label", "Talents"),
        menuIcon: readText("Menu Icon", "*"),
        menuOrder: readNumber("Menu Order", 25),
        pointsPerLevel: readNumber("Points Per Level", 1),
        firstPointLevel: readNumber("First Point Level", 2),
        debug: readBool("Debug", false)
    };

    var PARAM_IDS = {
        mhp: 0,
        mmp: 1,
        atk: 2,
        def: 3,
        mat: 4,
        mdf: 5,
        agi: 6,
        luk: 7
    };

    var PARAM_NAMES = ["mhp", "mmp", "atk", "def", "mat", "mdf", "agi", "luk"];
    var PARAM_LABELS = ["PV max", "PM max", "Attaque", "Defense", "Magie", "Def. mag.", "Agilite", "Chance"];
    var XPARAM_IDS = { hit: 0, eva: 1, cri: 2, cev: 3, mev: 4, mrf: 5, cnt: 6, hrg: 7, mrg: 8, trg: 9 };
    var XPARAM_LABELS = { hit: "Precision", eva: "Esquive", cri: "Critique", cev: "Esq. critique", mev: "Esq. magique", mrf: "Renvoi magie", cnt: "Contre", hrg: "Regen PV", mrg: "Regen PM", trg: "Regen TP" };

    window.$dataL3SkillTrees = null;
    window.L3SkillTrees = window.L3SkillTrees || {};
    var SkillTrees = window.L3SkillTrees;

    function log(message) {
        if (config.debug && window.console && console.log) console.log("[L3 Skill Trees] " + message);
    }

    function registerDataFile() {
        if (!window.DataManager || !Array.isArray(DataManager._databaseFiles)) return;
        for (var i = 0; i < DataManager._databaseFiles.length; i++) {
            if (DataManager._databaseFiles[i].name === "$dataL3SkillTrees") return;
        }
        DataManager._databaseFiles.push({ name: "$dataL3SkillTrees", src: config.dataFile });
    }

    function data() {
        return window.$dataL3SkillTrees || {};
    }

    function settings() {
        return data().settings || {};
    }

    function normalizeId(value) {
        return String(value || "").trim();
    }

    function classIdOf(actor, classId) {
        if (classId) return Number(classId);
        if (actor && actor.currentClass) return Number(actor.currentClass().id || 0);
        return 0;
    }

    function classConfig(classId) {
        var classes = data().classes || {};
        return classes[String(classId)] || classes[classId] || { trees: [] };
    }

    function classTrees(classId) {
        var cfg = classConfig(classId);
        return Array.isArray(cfg.trees) ? cfg.trees : [];
    }

    function allNodes(classId) {
        var result = [];
        var trees = classTrees(classId);
        for (var i = 0; i < trees.length; i++) {
            var nodes = Array.isArray(trees[i].nodes) ? trees[i].nodes : [];
            for (var n = 0; n < nodes.length; n++) result.push({ tree: trees[i], node: nodes[n] });
        }
        return result;
    }

    function findNode(classId, nodeId) {
        nodeId = normalizeId(nodeId);
        var nodes = allNodes(classId);
        for (var i = 0; i < nodes.length; i++) {
            if (normalizeId(nodes[i].node.id) === nodeId) return nodes[i];
        }
        return null;
    }

    function actorFrom(value) {
        if (!value) return null;
        if (value instanceof Game_Actor) return value;
        return $gameActors ? $gameActors.actor(Number(value || 0)) : null;
    }

    function actorState(actor) {
        if (!actor._l3SkillTrees) actor._l3SkillTrees = { classes: {}, grantedSkills: {}, nativeSkills: {} };
        if (!actor._l3SkillTrees.classes) actor._l3SkillTrees.classes = {};
        if (!actor._l3SkillTrees.grantedSkills) actor._l3SkillTrees.grantedSkills = {};
        if (!actor._l3SkillTrees.nativeSkills) actor._l3SkillTrees.nativeSkills = {};
        return actor._l3SkillTrees;
    }

    function classState(actor, classId) {
        var root = actorState(actor);
        var key = String(classId);
        if (!root.classes[key]) root.classes[key] = { learned: {}, bonusPoints: 0, resetTokens: 0, specialization: "" };
        if (!root.classes[key].learned) root.classes[key].learned = {};
        root.classes[key].bonusPoints = Number(root.classes[key].bonusPoints || 0);
        root.classes[key].resetTokens = Number(root.classes[key].resetTokens || 0);
        root.classes[key].specialization = root.classes[key].specialization || "";
        return root.classes[key];
    }

    function learnedValue(actor, classId, nodeId) {
        var value = classState(actor, classId).learned[normalizeId(nodeId)];
        if (value === true) return 1;
        return Math.max(0, Number(value || 0));
    }

    function isLearned(actor, classId, nodeId) {
        return learnedValue(actor, classId, nodeId) > 0;
    }

    function nodeCost(node) {
        return Math.max(1, Number(node && node.cost || 1));
    }

    function nodeMaxRank(node) {
        return Math.max(1, Number(node && (node.maxRank || node.ranks) || 1));
    }

    function nodeRank(actor, classId, nodeId) {
        var info = findNode(classId, nodeId);
        if (!info) return 0;
        return Math.min(nodeMaxRank(info.node), learnedValue(actor, classId, nodeId));
    }

    function isMaxed(actor, classId, node) {
        return nodeRank(actor, classId, node.id) >= nodeMaxRank(node);
    }

    function specializationMode() {
        return String(settings().specializationMode || "free").toLowerCase();
    }

    function treeSpentPoints(actor, classId, treeId) {
        var trees = classTrees(classId);
        for (var i = 0; i < trees.length; i++) {
            if (normalizeId(trees[i].id) !== normalizeId(treeId)) continue;
            var nodes = trees[i].nodes || [];
            var total = 0;
            for (var n = 0; n < nodes.length; n++) total += nodeRank(actor, classId, nodes[n].id) * nodeCost(nodes[n]);
            return total;
        }
        return 0;
    }

    function selectedSpecialization(actor, classId) {
        return classState(actor, classId).specialization || "";
    }

    function setSpecialization(actor, classId, treeId) {
        classState(actor, classId).specialization = normalizeId(treeId || "");
    }

    function basePoints(actor) {
        var first = Number(settings().firstPointLevel || config.firstPointLevel || 2);
        var each = Number(settings().pointsPerLevel || config.pointsPerLevel || 1);
        if (!actor || actor.level < first) return 0;
        return Math.max(0, actor.level - first + 1) * Math.max(0, each);
    }

    function spentPoints(actor, classId) {
        var learned = classState(actor, classId).learned || {};
        var total = 0;
        for (var id in learned) {
            if (learned.hasOwnProperty(id) && learnedValue(actor, classId, id) > 0) {
                var info = findNode(classId, id);
                if (info) total += nodeCost(info.node) * nodeRank(actor, classId, id);
            }
        }
        return total;
    }

    function availablePoints(actor, classId) {
        var state = classState(actor, classId);
        return Math.max(0, basePoints(actor) + Number(state.bonusPoints || 0) - spentPoints(actor, classId));
    }

    function reqsOf(node) {
        return Array.isArray(node.requires) ? node.requires : (Array.isArray(node.prerequisites) ? node.prerequisites : []);
    }

    function conditionArray(value) {
        if (Array.isArray(value)) return value;
        if (value === undefined || value === null || value === "") return [];
        return [value];
    }

    function parseItemKey(key) {
        var parts = String(key || "").split(":");
        if (parts.length < 2) return null;
        return { kind: parts[0].toLowerCase(), id: Number(parts[1] || 0) };
    }

    function actorHasEquipment(actor, key) {
        var itemKey = parseItemKey(key);
        if (!actor || !itemKey) return false;
        var equips = actor.equips ? actor.equips() : [];
        for (var i = 0; i < equips.length; i++) {
            var item = equips[i];
            if (!item) continue;
            if (itemKey.kind === "weapon" && DataManager.isWeapon(item) && item.id === itemKey.id) return true;
            if (itemKey.kind === "armor" && DataManager.isArmor(item) && item.id === itemKey.id) return true;
        }
        return false;
    }

    function actorHasRarity(actor, rarityId) {
        if (!window.L3Equipment || !L3Equipment.rarityId || !actor || !actor.equips) return false;
        var equips = actor.equips();
        for (var i = 0; i < equips.length; i++) {
            if (equips[i] && L3Equipment.rarityId(equips[i]) === String(rarityId)) return true;
        }
        return false;
    }

    function actorHasSet(actor, setId) {
        if (!window.L3Equipment || !L3Equipment.metadata || !actor || !actor.equips) return false;
        var equips = actor.equips();
        for (var i = 0; i < equips.length; i++) {
            var meta = equips[i] ? L3Equipment.metadata(equips[i]) : null;
            if (meta && meta.set === String(setId)) return true;
        }
        return false;
    }

    function questStatus(id) {
        if (!window.L3Quest || !L3Quest.status) return "";
        return String(L3Quest.status(id) || "");
    }

    function variableRequirementOk(entry) {
        if (!entry) return true;
        if (typeof entry === "number") return !!$gameVariables.value(entry);
        var id = Number(entry.id || entry.variableId || 0);
        var value = Number($gameVariables.value(id) || 0);
        if (entry.eq !== undefined || entry.value !== undefined) return value === Number(entry.eq !== undefined ? entry.eq : entry.value);
        if (entry.min !== undefined || entry.gte !== undefined) return value >= Number(entry.min !== undefined ? entry.min : entry.gte);
        if (entry.max !== undefined || entry.lte !== undefined) return value <= Number(entry.max !== undefined ? entry.max : entry.lte);
        return !!value;
    }

    function checkAdvancedConditions(actor, node, classId, tree) {
        var conditions = node.conditions || node.unlock || {};
        var level = Number(conditions.level || conditions.minLevel || node.level || 0);
        if (level > actor.level) return { ok: false, reason: "Niveau " + level + " requis." };
        var pointsInTree = Number(conditions.pointsInTree || conditions.spentInTree || 0);
        if (pointsInTree > 0 && treeSpentPoints(actor, classId, tree && tree.id) < pointsInTree) return { ok: false, reason: pointsInTree + " points requis dans cette branche." };
        var pointsSpent = Number(conditions.pointsSpent || conditions.spentInClass || 0);
        if (pointsSpent > 0 && spentPoints(actor, classId) < pointsSpent) return { ok: false, reason: pointsSpent + " points depenses requis." };
        var switchesOn = conditionArray(conditions.switchesOn || conditions.switchOn);
        for (var i = 0; i < switchesOn.length; i++) if (!$gameSwitches.value(Number(switchesOn[i]))) return { ok: false, reason: "Interrupteur requis." };
        var switchesOff = conditionArray(conditions.switchesOff || conditions.switchOff);
        for (i = 0; i < switchesOff.length; i++) if ($gameSwitches.value(Number(switchesOff[i]))) return { ok: false, reason: "Interrupteur bloque." };
        var variables = conditionArray(conditions.variables || conditions.variable);
        for (i = 0; i < variables.length; i++) if (!variableRequirementOk(variables[i])) return { ok: false, reason: "Variable requise." };
        var questCompleted = conditionArray(conditions.questCompleted || (conditions.quests && conditions.quests.completed));
        for (i = 0; i < questCompleted.length; i++) if (questStatus(questCompleted[i]) !== "completed") return { ok: false, reason: "Quete terminee requise." };
        var questActive = conditionArray(conditions.questActive || (conditions.quests && conditions.quests.active));
        for (i = 0; i < questActive.length; i++) if (questStatus(questActive[i]) !== "active" && questStatus(questActive[i]) !== "ready") return { ok: false, reason: "Quete active requise." };
        var questStarted = conditionArray(conditions.questStarted || (conditions.quests && conditions.quests.started));
        for (i = 0; i < questStarted.length; i++) {
            var status = questStatus(questStarted[i]);
            if (status !== "active" && status !== "ready" && status !== "completed") return { ok: false, reason: "Quete commencee requise." };
        }
        var equipment = conditionArray(conditions.equipment || conditions.equipped);
        for (i = 0; i < equipment.length; i++) if (!actorHasEquipment(actor, equipment[i])) return { ok: false, reason: "Equipement requis." };
        var rarities = conditionArray(conditions.rarities || conditions.rarity);
        if (rarities.length) {
            var hasRarity = false;
            for (i = 0; i < rarities.length; i++) if (actorHasRarity(actor, rarities[i])) hasRarity = true;
            if (!hasRarity) return { ok: false, reason: "Rarete d'equipement requise." };
        }
        var sets = conditionArray(conditions.sets || conditions.set);
        for (i = 0; i < sets.length; i++) if (!actorHasSet(actor, sets[i])) return { ok: false, reason: "Set requis." };
        return { ok: true, reason: "" };
    }

    function canLearn(actor, node, classId) {
        if (!actor || !node) return { ok: false, reason: "Noeud introuvable." };
        var info = findNode(classId, node.id);
        var tree = info ? info.tree : null;
        if (isMaxed(actor, classId, node)) return { ok: false, reason: "Rang maximum." };
        var mode = specializationMode();
        var specialization = selectedSpecialization(actor, classId);
        if ((mode === "commit" || mode === "locked" || mode === "lock") && specialization && tree && normalizeId(tree.id) !== specialization) {
            return { ok: false, reason: "Autre specialisation choisie." };
        }
        var reqs = reqsOf(node);
        for (var i = 0; i < reqs.length; i++) {
            if (!isLearned(actor, classId, reqs[i])) return { ok: false, reason: "Prerequis manquant." };
        }
        var advanced = checkAdvancedConditions(actor, node, classId, tree);
        if (!advanced.ok) return advanced;
        if (availablePoints(actor, classId) < nodeCost(node)) return { ok: false, reason: "Pas assez de points." };
        return { ok: true, reason: "" };
    }

    function nodeSkillId(node) {
        var effects = node && node.effects || {};
        return Number(node.skillId || effects.skillId || 0);
    }

    function syncGrantedSkills(actor) {
        var root = actorState(actor);
        var current = {};
        var classes = root.classes || {};
        for (var classId in classes) {
            if (!classes.hasOwnProperty(classId)) continue;
            var learned = classes[classId].learned || {};
            for (var nodeId in learned) {
                if (!learned.hasOwnProperty(nodeId) || !learned[nodeId]) continue;
                var info = findNode(classId, nodeId);
                var skillId = info ? nodeSkillId(info.node) : 0;
                if (skillId > 0) current[String(skillId)] = true;
            }
        }
        for (var id in root.grantedSkills) {
            if (root.grantedSkills.hasOwnProperty(id) && !current[id] && actor.isLearnedSkill(Number(id))) {
                actor.forgetSkill(Number(id));
            }
        }
        root.grantedSkills = {};
        for (var skillId in current) {
            if (!current.hasOwnProperty(skillId)) continue;
            actor.learnSkill(Number(skillId));
            if (!root.nativeSkills[skillId]) root.grantedSkills[skillId] = true;
        }
    }

    function learnNode(actor, nodeId, classId) {
        actor = actorFrom(actor);
        if (!actor) return false;
        classId = classIdOf(actor, classId);
        var info = findNode(classId, nodeId);
        if (!info) return false;
        var check = canLearn(actor, info.node, classId);
        if (!check.ok) {
            if (window.L3UI && L3UI.Components && L3UI.Components.Toast) L3UI.Components.Toast(check.reason, { type: "warn" });
            return false;
        }
        var state = classState(actor, classId);
        if (!state.specialization && specializationMode() !== "free" && info.tree) setSpecialization(actor, classId, info.tree.id);
        state.learned[normalizeId(info.node.id)] = Math.min(nodeMaxRank(info.node), nodeRank(actor, classId, info.node.id) + 1);
        var skillId = nodeSkillId(info.node);
        if (skillId > 0 && actor.isLearnedSkill(skillId)) actorState(actor).nativeSkills[String(skillId)] = true;
        syncGrantedSkills(actor);
        actor.refresh();
        if (window.L3UI && L3UI.Components && L3UI.Components.Toast) {
            var rank = nodeRank(actor, classId, info.node.id);
            L3UI.Components.Toast((info.node.name || info.node.id) + " rang " + rank + "/" + nodeMaxRank(info.node) + ".", { type: "good" });
        }
        return true;
    }

    function resetCostGold() {
        return Math.max(0, Number(settings().resetCostGold || 0));
    }

    function resetItemId() {
        return Math.max(0, Number(settings().resetItemId || 0));
    }

    function canPayReset(actor, classId) {
        var state = classState(actor, classId);
        if (state.resetTokens > 0) return true;
        var gold = resetCostGold();
        if (gold > 0 && $gameParty.gold() < gold) return false;
        var itemId = resetItemId();
        if (itemId > 0 && (!$dataItems[itemId] || $gameParty.numItems($dataItems[itemId]) <= 0)) return false;
        return true;
    }

    function payReset(actor, classId, free) {
        if (free) return true;
        var state = classState(actor, classId);
        if (state.resetTokens > 0) {
            state.resetTokens--;
            return true;
        }
        var gold = resetCostGold();
        var itemId = resetItemId();
        if (!canPayReset(actor, classId)) return false;
        if (gold > 0) $gameParty.loseGold(gold);
        if (itemId > 0 && $dataItems[itemId]) $gameParty.loseItem($dataItems[itemId], 1);
        return true;
    }

    function resetClass(actor, classId, free) {
        actor = actorFrom(actor);
        if (!actor) return false;
        classId = classIdOf(actor, classId);
        if (!payReset(actor, classId, free)) {
            if (window.L3UI && L3UI.Components && L3UI.Components.Toast) L3UI.Components.Toast("Impossible de reinitialiser cette classe.", { type: "warn" });
            return false;
        }
        var state = classState(actor, classId);
        state.learned = {};
        state.specialization = "";
        syncGrantedSkills(actor);
        actor.refresh();
        return true;
    }

    function addPoints(actor, amount, classId) {
        actor = actorFrom(actor);
        if (!actor) return false;
        classId = classIdOf(actor, classId);
        classState(actor, classId).bonusPoints += Number(amount || 0);
        return true;
    }

    function addResetToken(actor, amount, classId) {
        actor = actorFrom(actor);
        if (!actor) return false;
        classId = classIdOf(actor, classId);
        classState(actor, classId).resetTokens += Math.max(1, Number(amount || 1));
        return true;
    }

    function grantNode(actor, nodeId, classId, ranks) {
        actor = actorFrom(actor);
        if (!actor) return false;
        classId = classIdOf(actor, classId);
        var info = findNode(classId, nodeId);
        if (!info) return false;
        var state = classState(actor, classId);
        var add = Math.max(1, Number(ranks || 1));
        state.learned[normalizeId(info.node.id)] = Math.min(nodeMaxRank(info.node), nodeRank(actor, classId, info.node.id) + add);
        var skillId = nodeSkillId(info.node);
        if (skillId > 0 && actor.isLearnedSkill(skillId)) actorState(actor).nativeSkills[String(skillId)] = true;
        syncGrantedSkills(actor);
        actor.refresh();
        return true;
    }

    function learnedParamTotal(actor, paramId, category) {
        if (!actor || !(actor instanceof Game_Actor)) return category === "rates" ? 1 : 0;
        var multiplier = category === "rates";
        var result = multiplier ? 1 : 0;
        var classId = classIdOf(actor);
        var learned = classState(actor, classId).learned || {};
        for (var nodeId in learned) {
            if (!learned.hasOwnProperty(nodeId) || !learned[nodeId]) continue;
            var info = findNode(classId, nodeId);
            if (!info) continue;
            var effects = info.node.effects || {};
            var paramsBlock = effects[category] || {};
            var key = PARAM_NAMES[paramId];
            var value = Number(paramsBlock[key] || 0);
            var rank = nodeRank(actor, classId, nodeId);
            if (!value && category === "rates") continue;
            if (multiplier) result *= Math.pow(value || 1, rank);
            else result += value * rank;
        }
        return result;
    }

    function learnedXParam(actor, xparamId) {
        if (!actor || !(actor instanceof Game_Actor)) return 0;
        var result = 0;
        var classId = classIdOf(actor);
        var learned = classState(actor, classId).learned || {};
        for (var nodeId in learned) {
            if (!learned.hasOwnProperty(nodeId) || !learned[nodeId]) continue;
            var info = findNode(classId, nodeId);
            if (!info || !info.node.effects || !info.node.effects.xparams) continue;
            var rank = nodeRank(actor, classId, nodeId);
            for (var key in XPARAM_IDS) {
                if (XPARAM_IDS.hasOwnProperty(key) && XPARAM_IDS[key] === xparamId) {
                    result += Number(info.node.effects.xparams[key] || 0) * rank;
                }
            }
        }
        return result;
    }

    function effectsSummary(node, rank) {
        if (!node) return "";
        var parts = [];
        var effects = node.effects || {};
        rank = Math.max(1, Number(rank || 1));
        if (nodeSkillId(node) > 0) {
            var skill = window.$dataSkills && $dataSkills[nodeSkillId(node)];
            parts.push("Apprend " + (skill ? skill.name : "skill #" + nodeSkillId(node)));
        }
        if (effects.params) {
            for (var key in effects.params) {
                if (effects.params.hasOwnProperty(key) && PARAM_IDS[key] !== undefined && Number(effects.params[key] || 0)) {
                    parts.push("+" + (Number(effects.params[key]) * rank) + " " + PARAM_LABELS[PARAM_IDS[key]]);
                }
            }
        }
        if (effects.rates) {
            for (var rkey in effects.rates) {
                if (effects.rates.hasOwnProperty(rkey) && PARAM_IDS[rkey] !== undefined && Number(effects.rates[rkey] || 1) !== 1) {
                    parts.push("+" + Math.round((Math.pow(Number(effects.rates[rkey]), rank) - 1) * 100) + "% " + PARAM_LABELS[PARAM_IDS[rkey]]);
                }
            }
        }
        if (effects.xparams) {
            for (var xkey in effects.xparams) {
                if (effects.xparams.hasOwnProperty(xkey) && Number(effects.xparams[xkey] || 0)) {
                    parts.push("+" + Math.round(Number(effects.xparams[xkey]) * 100 * rank) + "% " + (XPARAM_LABELS[xkey] || xkey));
                }
            }
        }
        return parts.join(", ");
    }

    function conditionSummary(node) {
        var c = node && (node.conditions || node.unlock) || {};
        var parts = [];
        var level = Number(c.level || c.minLevel || node.level || 0);
        if (level > 0) parts.push("Niveau " + level);
        if (c.pointsInTree || c.spentInTree) parts.push((c.pointsInTree || c.spentInTree) + " points dans la branche");
        if (c.pointsSpent || c.spentInClass) parts.push((c.pointsSpent || c.spentInClass) + " points depenses");
        conditionArray(c.questCompleted || (c.quests && c.quests.completed)).forEach(function(id) { parts.push("Quete terminee: " + id); });
        conditionArray(c.questActive || (c.quests && c.quests.active)).forEach(function(id) { parts.push("Quete active: " + id); });
        conditionArray(c.questStarted || (c.quests && c.quests.started)).forEach(function(id) { parts.push("Quete commencee: " + id); });
        conditionArray(c.equipment || c.equipped).forEach(function(id) { parts.push("Equipement: " + id); });
        conditionArray(c.rarities || c.rarity).forEach(function(id) { parts.push("Rarete: " + id); });
        conditionArray(c.sets || c.set).forEach(function(id) { parts.push("Set: " + id); });
        return parts;
    }

    function previewHtml(actor, classId, node) {
        var rank = nodeRank(actor, classId, node.id);
        var nextRank = Math.min(nodeMaxRank(node), rank + 1);
        var effects = node.effects || {};
        var html = "<div class=\"l3-skilltree-preview-title\">Apercu du prochain rang</div>";
        var rows = [];
        if (effects.params) {
            for (var key in effects.params) {
                if (!effects.params.hasOwnProperty(key) || PARAM_IDS[key] === undefined) continue;
                var value = Number(effects.params[key] || 0);
                if (!value) continue;
                rows.push("<span>" + PARAM_LABELS[PARAM_IDS[key]] + "</span><strong>" + actor.param(PARAM_IDS[key]) + " > " + (actor.param(PARAM_IDS[key]) + value) + "</strong>");
            }
        }
        if (effects.xparams) {
            for (var xkey in effects.xparams) {
                if (!effects.xparams.hasOwnProperty(xkey)) continue;
                var xvalue = Number(effects.xparams[xkey] || 0);
                if (!xvalue) continue;
                var current = Math.round(actor.xparam(XPARAM_IDS[xkey] || 0) * 100);
                rows.push("<span>" + (XPARAM_LABELS[xkey] || xkey) + "</span><strong>" + current + "% > " + (current + Math.round(xvalue * 100)) + "%</strong>");
            }
        }
        html += "<div class=\"l3-skilltree-preview-rank\">Rang " + nextRank + "/" + nodeMaxRank(node) + "</div>";
        html += rows.length ? "<div class=\"l3-skilltree-preview-grid\">" + rows.join("") + "</div>" : "<p>" + L3UI.escapeHtml(effectsSummary(node, nextRank) || "Aucun bonus numerique.") + "</p>";
        return html;
    }

    function iconHtml(index) {
        index = Number(index || 0);
        var x = (index % 16) * 32;
        var y = Math.floor(index / 16) * 32;
        return "<span class=\"l3-skilltree-icon\" style=\"background-image:url('img/system/IconSet.png');background-position:-" + x + "px -" + y + "px\"></span>";
    }

    function selectedActor() {
        return $gameParty.menuActor() || $gameParty.members()[0];
    }

    function openScene(actorId) {
        if (actorId && $gameActors.actor(Number(actorId))) $gameParty.setMenuActor($gameActors.actor(Number(actorId)));
        SceneManager.push(Scene_L3SkillTrees);
    }

    function installCss() {
        if (!window.L3UI || !L3UI.addCss) return;
        L3UI.addCss("l3-skilltrees-css",
            ".l3-skilltree-screen{display:grid;grid-template-columns:320px minmax(0,1fr)360px;gap:20px;padding:28px;background:linear-gradient(120deg,rgba(7,12,22,.98),rgba(10,17,30,.9));}" +
            ".l3-skilltree-sidebar,.l3-skilltree-main,.l3-skilltree-detail{min-height:0;pointer-events:auto;background:rgba(12,18,31,.95);border:1px solid rgba(148,163,184,.22);border-radius:8px;box-shadow:0 18px 54px rgba(0,0,0,.35);}" +
            ".l3-skilltree-sidebar{padding:20px;display:flex;flex-direction:column;gap:16px;}" +
            ".l3-skilltree-main{padding:20px;display:flex;flex-direction:column;gap:16px;overflow:hidden;}" +
            ".l3-skilltree-detail{padding:20px;overflow:hidden auto;}" +
            ".l3-skilltree-kicker{font-size:12px;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;}" +
            ".l3-skilltree-title{font-size:26px;font-weight:800;line-height:1.1;margin:0;color:#f8fafc;}" +
            ".l3-skilltree-points{display:grid;grid-template-columns:1fr 1fr;gap:10px;}" +
            ".l3-skilltree-stat{padding:12px;background:rgba(30,42,61,.82);border-radius:7px;border:1px solid rgba(148,163,184,.16);}" +
            ".l3-skilltree-stat span{display:block;color:#94a3b8;font-size:12px;text-transform:uppercase;}" +
            ".l3-skilltree-stat strong{display:block;font-size:24px;margin-top:4px;color:#38bdf8;}" +
            ".l3-skilltree-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}" +
            ".l3-skilltree-tab,.l3-skilltree-action{min-height:50px;text-align:left;padding:10px 12px;border:1px solid rgba(148,163,184,.18);border-radius:7px;background:rgba(30,42,61,.82);color:#f8fafc;font:inherit;cursor:pointer;}" +
            ".l3-skilltree-tab small{display:block;margin-top:3px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
            ".l3-skilltree-tab.is-active,.l3-skilltree-node.is-focused,.l3-skilltree-node:hover,.l3-skilltree-action:hover{border-color:#38bdf8;background:linear-gradient(90deg,rgba(56,189,248,.16),rgba(251,79,122,.12));}" +
            ".l3-skilltree-canvas{position:relative;min-height:600px;overflow:hidden;border-radius:8px;background:radial-gradient(circle at 1px 1px,rgba(56,189,248,.28) 1px,transparent 0);background-size:40px 40px;border:1px solid rgba(148,163,184,.16);}" +
            ".l3-skilltree-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}" +
            ".l3-skilltree-node{position:absolute;width:220px;min-height:82px;text-align:left;border:1px solid rgba(148,163,184,.25);border-radius:8px;background:rgba(20,31,48,.96);color:#f8fafc;font:inherit;padding:10px 12px;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.28);}" +
            ".l3-skilltree-node.is-learned{border-color:#22c55e;background:linear-gradient(120deg,rgba(34,197,94,.22),rgba(20,31,48,.96));}" +
            ".l3-skilltree-node.is-locked{opacity:.58;}" +
            ".l3-skilltree-node-head{display:flex;align-items:center;gap:10px;}" +
            ".l3-skilltree-node strong{display:block;font-size:15px;line-height:1.1;}" +
            ".l3-skilltree-node small{display:block;color:#94a3b8;margin-top:4px;line-height:1.25;}" +
            ".l3-skilltree-icon{display:inline-block;width:32px;height:32px;flex:0 0 32px;background-repeat:no-repeat;image-rendering:pixelated;border-radius:6px;background-color:rgba(15,23,42,.7);border:1px solid rgba(148,163,184,.2);}" +
            ".l3-skilltree-detail h2{margin:6px 0 8px;font-size:24px;}" +
            ".l3-skilltree-detail p{color:#cbd5e1;line-height:1.45;}" +
            ".l3-skilltree-meta{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px;}" +
            ".l3-skilltree-chip{border:1px solid rgba(56,189,248,.35);border-radius:999px;padding:4px 9px;color:#bae6fd;background:rgba(56,189,248,.1);font-size:12px;}" +
            ".l3-skilltree-effects{margin:14px 0;padding:14px;border-radius:8px;background:rgba(30,42,61,.72);border:1px solid rgba(148,163,184,.16);color:#e2e8f0;line-height:1.45;}" +
            ".l3-skilltree-conditions{display:grid;gap:7px;margin:10px 0 14px;}" +
            ".l3-skilltree-conditions span{display:block;padding:8px 10px;border-radius:7px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.18);color:#cbd5e1;font-size:12px;}" +
            ".l3-skilltree-preview{margin:14px 0;padding:14px;border-radius:8px;background:linear-gradient(135deg,rgba(56,189,248,.13),rgba(251,79,122,.09));border:1px solid rgba(56,189,248,.25);}" +
            ".l3-skilltree-preview-title{font-size:12px;text-transform:uppercase;color:#94a3b8;margin-bottom:7px;}" +
            ".l3-skilltree-preview-rank{font-weight:800;color:#38bdf8;margin-bottom:8px;}" +
            ".l3-skilltree-preview-grid{display:grid;grid-template-columns:1fr auto;gap:6px 12px;color:#cbd5e1;}" +
            ".l3-skilltree-preview-grid strong{color:#f8fafc;}" +
            ".l3-skilltree-empty{display:grid;place-items:center;min-height:380px;color:#94a3b8;border:1px dashed rgba(148,163,184,.2);border-radius:8px;}" +
            ".l3-skilltree-actions{margin-top:auto;display:grid;gap:10px;}" +
            ".l3-skilltree-learn{width:100%;min-height:48px;border:1px solid #fb4f7a;border-radius:7px;background:linear-gradient(90deg,rgba(251,79,122,.25),rgba(56,189,248,.12));color:#fff;font:inherit;cursor:pointer;}" +
            ".l3-skilltree-learn.is-disabled{opacity:.5;cursor:not-allowed;border-color:rgba(148,163,184,.25);background:rgba(30,42,61,.62);}" +
            ".l3-skilltree-canvas{min-height:0;flex:1 1 auto;overflow:auto;cursor:grab;background-color:rgba(8,13,24,.72);scrollbar-color:rgba(56,189,248,.45) rgba(15,23,42,.7);scrollbar-width:thin;}" +
            ".l3-skilltree-canvas.is-panning{cursor:grabbing;user-select:none;}" +
            ".l3-skilltree-board{position:relative;min-width:100%;min-height:100%;}" +
            ".l3-skilltree-links{inset:auto;left:0;top:0;overflow:visible;}" +
            ".l3-skilltree-branch-title{position:absolute;width:260px;text-align:center;color:#f8fafc;text-transform:uppercase;letter-spacing:0;font-weight:800;}" +
            ".l3-skilltree-branch-title small{display:block;margin-top:4px;color:#38bdf8;font-size:12px;text-transform:none;font-weight:700;}" +
            ".l3-skilltree-node{width:148px;min-height:112px;padding:0;background:transparent;border:0;box-shadow:none;display:flex;align-items:center;justify-content:flex-start;flex-direction:column;gap:8px;}" +
            ".l3-skilltree-node:hover,.l3-skilltree-node.is-focused{background:transparent;border:0;}" +
            ".l3-skilltree-node-orb{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;position:relative;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.18),rgba(30,42,61,.92));border:3px solid rgba(148,163,184,.7);box-shadow:0 14px 28px rgba(0,0,0,.32),inset 0 0 0 3px rgba(2,6,23,.55);}" +
            ".l3-skilltree-node.is-learned .l3-skilltree-node-orb{border-color:#22c55e;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.22),rgba(21,128,61,.88));}" +
            ".l3-skilltree-node.is-available .l3-skilltree-node-orb{border-color:#facc15;}" +
            ".l3-skilltree-node.is-focused .l3-skilltree-node-orb,.l3-skilltree-node:hover .l3-skilltree-node-orb{border-color:#38bdf8;box-shadow:0 0 0 4px rgba(56,189,248,.18),0 18px 34px rgba(0,0,0,.35),inset 0 0 0 3px rgba(2,6,23,.55);}" +
            ".l3-skilltree-node-cost{position:absolute;right:-7px;bottom:-5px;min-width:27px;height:22px;border-radius:999px;display:grid;place-items:center;font-size:11px;font-weight:800;color:#020617;background:#facc15;border:2px solid rgba(2,6,23,.85);}" +
            ".l3-skilltree-node.is-learned .l3-skilltree-node-cost{background:#22c55e;color:#052e16;}" +
            ".l3-skilltree-node-label{width:148px;text-align:center;font-size:13px;font-weight:800;line-height:1.15;color:#f8fafc;text-shadow:0 2px 4px rgba(0,0,0,.5);}" +
            ".l3-skilltree-node-state{width:132px;text-align:center;font-size:11px;line-height:1.15;color:#94a3b8;}" +
            ".l3-skilltree-node-rank{position:absolute;left:-7px;bottom:-5px;min-width:29px;height:22px;border-radius:999px;display:grid;place-items:center;font-size:11px;font-weight:800;color:#bae6fd;background:#0f172a;border:2px solid rgba(56,189,248,.65);}" +
            ".l3-skilltree-node.is-locked{opacity:.68;}" +
            ".l3-skilltree-icon{margin:0;}" +
            ".l3-skilltree-map-help{display:flex;justify-content:space-between;gap:12px;color:#94a3b8;font-size:12px;}" +
            ".l3-skilltree-map-help strong{color:#e2e8f0;}"
        );
    }

    function Scene_L3SkillTrees() {
        this.initialize.apply(this, arguments);
    }

    Scene_L3SkillTrees.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_L3SkillTrees.prototype.constructor = Scene_L3SkillTrees;

    Scene_L3SkillTrees.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        this._l3TreeIndex = 0;
        this._l3NodeId = null;
        this._l3CanvasScroll = { left: 0, top: 0 };
        this._l3CanvasElement = null;
    };

    Scene_L3SkillTrees.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        installCss();
        this.render();
    };

    Scene_L3SkillTrees.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (Input.isTriggered("cancel")) this.popScene();
    };

    Scene_L3SkillTrees.prototype.render = function() {
        if (!window.L3UI || !L3UI.enabled) return;
        L3UI.clear(this);
        L3UI.hideNativeWindows(this);
        var actor = selectedActor();
        var classId = classIdOf(actor);
        var trees = classTrees(classId);
        if (this._l3TreeIndex >= trees.length) this._l3TreeIndex = 0;
        var first = this.firstNode(trees);
        if (!this._l3NodeId && first) this._l3NodeId = first.id;

        var screen = L3UI.el("div", { className: "l3-screen l3-skilltree-screen" });
        var sidebar = this.renderSidebar(actor, classId);
        var main = this.renderMain(actor, classId, trees);
        var detail = this.renderDetail(actor, classId, trees);
        screen.appendChild(sidebar);
        screen.appendChild(main);
        screen.appendChild(detail);
        L3UI.mount(this, screen, "main");
    };

    Scene_L3SkillTrees.prototype.renderSidebar = function(actor, classId) {
        var panel = L3UI.el("aside", { className: "l3-skilltree-sidebar" });
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-kicker", text: "Classe" }));
        panel.appendChild(L3UI.el("h1", { className: "l3-skilltree-title", text: actor ? actor.name() : "Heros" }));
        if (actor) panel.appendChild(L3UI.Components.ActorCard(actor, { faceSize: 112, className: "l3-skilltree-actor" }));
        var currentClass = actor && actor.currentClass ? actor.currentClass() : null;
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-stat", html: "<span>Specialisation</span><strong>" + L3UI.escapeHtml(currentClass ? currentClass.name : "Classe") + "</strong>" }));
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-points", html:
            "<div class=\"l3-skilltree-stat\"><span>Points</span><strong>" + availablePoints(actor, classId) + "</strong></div>" +
            "<div class=\"l3-skilltree-stat\"><span>Depenses</span><strong>" + spentPoints(actor, classId) + "</strong></div>"
        }));
        var spec = selectedSpecialization(actor, classId);
        if (spec) panel.appendChild(L3UI.el("div", { className: "l3-skilltree-effects", text: "Specialisation: " + spec }));
        var actions = L3UI.el("div", { className: "l3-skilltree-actions" });
        var back = L3UI.el("button", { className: "l3-skilltree-action", text: "Retour", on: { click: this.popScene.bind(this) } });
        var resetLabel = "Reinitialiser cette classe";
        var state = classState(actor, classId);
        if (state.resetTokens > 0) resetLabel += " (" + state.resetTokens + " jeton)";
        else if (resetCostGold() > 0) resetLabel += " (" + resetCostGold() + " G)";
        else if (resetItemId() > 0 && $dataItems[resetItemId()]) resetLabel += " (" + $dataItems[resetItemId()].name + ")";
        var reset = L3UI.el("button", {
            className: "l3-skilltree-action",
            text: resetLabel,
            on: { click: function() {
                if (window.confirm && !confirm("Reinitialiser les points de cette classe ?")) return;
                resetClass(actor, classId, false);
                this._l3NodeId = null;
                this.render();
            }.bind(this) }
        });
        actions.appendChild(reset);
        actions.appendChild(back);
        panel.appendChild(actions);
        return panel;
    };

    Scene_L3SkillTrees.prototype.renderMain = function(actor, classId, trees) {
        var panel = L3UI.el("main", { className: "l3-skilltree-main" });
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-kicker", text: "Arbres de competences" }));
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-map-help", html:
            "<span><strong>Glisser</strong> le fond pour deplacer l'arbre.</span><span>Molette pour parcourir.</span>"
        }));
        var tabs = L3UI.el("div", { className: "l3-skilltree-tabs" });
        for (var i = 0; i < trees.length; i++) {
            (function(index, currentTree, scene) {
                var learned = scene.learnedInTree(actor, classId, currentTree);
                var total = scene.maxRanksInTree(currentTree);
                tabs.appendChild(L3UI.el("button", {
                    className: "l3-skilltree-tab " + (scene.treeHasNode(currentTree, scene._l3NodeId) ? "is-active" : ""),
                    html: "<strong>" + L3UI.escapeHtml(currentTree.name || currentTree.id) + "</strong><small>" + learned + " / " + total + " rangs</small>",
                    on: { click: function() {
                        scene.rememberCanvasScroll();
                        scene._l3NodeId = currentTree.nodes && currentTree.nodes[0] ? currentTree.nodes[0].id : null;
                        scene.render();
                    } }
                }));
            })(i, trees[i], this);
        }
        panel.appendChild(tabs);
        if (!trees.length) {
            panel.appendChild(L3UI.el("div", { className: "l3-skilltree-empty", text: "Aucun arbre pour cette classe." }));
            return panel;
        }
        panel.appendChild(this.renderCanvas(actor, classId, trees));
        return panel;
    };

    Scene_L3SkillTrees.prototype.learnedInTree = function(actor, classId, tree) {
        var total = 0;
        var nodes = tree.nodes || [];
        for (var i = 0; i < nodes.length; i++) total += nodeRank(actor, classId, nodes[i].id);
        return total;
    };

    Scene_L3SkillTrees.prototype.maxRanksInTree = function(tree) {
        var total = 0;
        var nodes = tree.nodes || [];
        for (var i = 0; i < nodes.length; i++) total += nodeMaxRank(nodes[i]);
        return total;
    };

    Scene_L3SkillTrees.prototype.treeHasNode = function(tree, nodeId) {
        var nodes = tree && tree.nodes || [];
        nodeId = normalizeId(nodeId);
        for (var i = 0; i < nodes.length; i++) {
            if (normalizeId(nodes[i].id) === nodeId) return true;
        }
        return false;
    };

    Scene_L3SkillTrees.prototype.firstNode = function(trees) {
        for (var i = 0; i < trees.length; i++) {
            if (trees[i].nodes && trees[i].nodes[0]) return trees[i].nodes[0];
        }
        return null;
    };

    Scene_L3SkillTrees.prototype.nodeLayout = function(node, treeIndex, nodeIndex) {
        var baseX = 120 + treeIndex * 360;
        var baseY = 120;
        return {
            left: Number(node.x !== undefined ? node.x : baseX),
            top: Number(node.y !== undefined ? node.y : baseY + nodeIndex * 128)
        };
    };

    Scene_L3SkillTrees.prototype.branchBaseX = function(tree, treeIndex) {
        var nodes = tree && tree.nodes || [];
        if (nodes.length) return this.nodeLayout(nodes[0], treeIndex, 0).left - 56;
        return 64 + treeIndex * 360;
    };

    Scene_L3SkillTrees.prototype.boardMetrics = function(trees) {
        var maxX = 1180;
        var maxY = 720;
        for (var i = 0; i < trees.length; i++) {
            var nodes = trees[i].nodes || [];
            maxX = Math.max(maxX, this.branchBaseX(trees[i], i) + 300);
            for (var n = 0; n < nodes.length; n++) {
                var pos = this.nodeLayout(nodes[n], i, n);
                maxX = Math.max(maxX, pos.left + 190);
                maxY = Math.max(maxY, pos.top + 170);
            }
        }
        return { width: maxX + 80, height: maxY + 80 };
    };

    Scene_L3SkillTrees.prototype.rememberCanvasScroll = function() {
        if (!this._l3CanvasElement) return;
        this._l3CanvasScroll = {
            left: this._l3CanvasElement.scrollLeft || 0,
            top: this._l3CanvasElement.scrollTop || 0
        };
    };

    Scene_L3SkillTrees.prototype.restoreCanvasScroll = function(canvas) {
        var scroll = this._l3CanvasScroll || { left: 0, top: 0 };
        setTimeout(function() {
            canvas.scrollLeft = scroll.left || 0;
            canvas.scrollTop = scroll.top || 0;
        }, 0);
    };

    Scene_L3SkillTrees.prototype.bindCanvasPan = function(canvas) {
        this._l3CanvasElement = canvas;
        this.restoreCanvasScroll(canvas);
        var dragging = false;
        var moved = false;
        var startX = 0;
        var startY = 0;
        var startLeft = 0;
        var startTop = 0;
        var scene = this;
        canvas.addEventListener("pointerdown", function(event) {
            if (event.button !== 0 || (event.target.closest && event.target.closest(".l3-skilltree-node"))) return;
            dragging = true;
            moved = false;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = canvas.scrollLeft;
            startTop = canvas.scrollTop;
            canvas.classList.add("is-panning");
            if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        canvas.addEventListener("pointermove", function(event) {
            if (!dragging) return;
            var dx = event.clientX - startX;
            var dy = event.clientY - startY;
            if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
            canvas.scrollLeft = startLeft - dx;
            canvas.scrollTop = startTop - dy;
            scene.rememberCanvasScroll();
            event.preventDefault();
        });
        function endDrag(event) {
            if (!dragging) return;
            dragging = false;
            canvas.classList.remove("is-panning");
            scene.rememberCanvasScroll();
            if (canvas.releasePointerCapture && event && event.pointerId !== undefined) canvas.releasePointerCapture(event.pointerId);
            if (moved && event) event.preventDefault();
        }
        canvas.addEventListener("pointerup", endDrag);
        canvas.addEventListener("pointercancel", endDrag);
        canvas.addEventListener("mouseleave", endDrag);
        canvas.addEventListener("scroll", function() { scene.rememberCanvasScroll(); });
    };

    Scene_L3SkillTrees.prototype.renderCanvas = function(actor, classId, trees) {
        var canvas = L3UI.el("div", { className: "l3-skilltree-canvas" });
        var metrics = this.boardMetrics(trees);
        var board = L3UI.el("div", { className: "l3-skilltree-board", style: { width: metrics.width + "px", height: metrics.height + "px" } });
        canvas.appendChild(board);
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "l3-skilltree-links");
        svg.setAttribute("width", metrics.width);
        svg.setAttribute("height", metrics.height);
        svg.setAttribute("viewBox", "0 0 " + metrics.width + " " + metrics.height);
        board.appendChild(svg);
        var byId = {};
        var positions = {};
        var ordered = [];
        for (var t = 0; t < trees.length; t++) {
            var tree = trees[t];
            var treeNodes = tree.nodes || [];
            var learned = this.learnedInTree(actor, classId, tree);
            var headerX = this.branchBaseX(tree, t);
            board.appendChild(L3UI.el("div", {
                className: "l3-skilltree-branch-title",
                style: { left: headerX + "px", top: "24px" },
                html: L3UI.escapeHtml(tree.name || tree.id) + "<small>" + learned + " / " + this.maxRanksInTree(tree) + " rangs</small>"
            }));
            for (var i = 0; i < treeNodes.length; i++) {
                var layout = this.nodeLayout(treeNodes[i], t, i);
                byId[normalizeId(treeNodes[i].id)] = treeNodes[i];
                positions[normalizeId(treeNodes[i].id)] = {
                    left: layout.left,
                    top: layout.top,
                    centerX: layout.left + 74,
                    centerY: layout.top + 32,
                    treeIndex: t
                };
                ordered.push({ tree: tree, node: treeNodes[i], index: i });
            }
        }
        for (var n = 0; n < ordered.length; n++) {
            var node = ordered[n].node;
            var reqs = reqsOf(node);
            for (var r = 0; r < reqs.length; r++) {
                var from = byId[normalizeId(reqs[r])];
                if (!from) continue;
                var start = positions[normalizeId(from.id)];
                var end = positions[normalizeId(node.id)];
                if (!start || !end) continue;
                var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", start.centerX);
                line.setAttribute("y1", start.centerY);
                line.setAttribute("x2", end.centerX);
                line.setAttribute("y2", end.centerY);
                line.setAttribute("stroke", isLearned(actor, classId, from.id) && isLearned(actor, classId, node.id) ? "#22c55e" : "rgba(148,163,184,.35)");
                line.setAttribute("stroke-width", "3");
                line.setAttribute("stroke-linecap", "round");
                svg.appendChild(line);
            }
        }
        var group = L3UI.Focus.createGroup("l3-skilltree-nodes", {
            scene: this,
            columns: 3,
            onCancel: function() { this.popScene(); }.bind(this)
        });
        for (var j = 0; j < ordered.length; j++) {
            (function(entry, scene) {
                var node = entry.node;
                var rank = nodeRank(actor, classId, node.id);
                var learned = rank > 0;
                var maxRank = nodeMaxRank(node);
                var check = canLearn(actor, node, classId);
                var active = normalizeId(scene._l3NodeId) === normalizeId(node.id);
                var pos = positions[normalizeId(node.id)] || { left: 0, top: 0 };
                var button = L3UI.el("button", {
                    className: "l3-skilltree-node " + (rank >= maxRank ? "is-learned " : "") + (rank < maxRank && check.ok ? "is-available " : "") + (rank < maxRank && !check.ok ? "is-locked " : "") + (active ? "is-focused " : ""),
                    style: { left: pos.left + "px", top: pos.top + "px" },
                    html:
                        "<span class=\"l3-skilltree-node-orb\">" + iconHtml(node.iconIndex) + "<span class=\"l3-skilltree-node-cost\">" + nodeCost(node) + "</span><span class=\"l3-skilltree-node-rank\">" + rank + "/" + maxRank + "</span></span>" +
                        "<span class=\"l3-skilltree-node-label\">" + L3UI.escapeHtml(node.name || node.id) + "</span>" +
                        "<span class=\"l3-skilltree-node-state\">" + (rank >= maxRank ? "Maitrise" : (check.ok ? "Disponible" : check.reason)) + "</span>",
                    on: { click: function() {
                        scene.rememberCanvasScroll();
                        scene._l3NodeId = node.id;
                        scene.render();
                    } }
                });
                board.appendChild(button);
                group.add(button, node, {
                    handler: function(data) {
                        scene.rememberCanvasScroll();
                        scene._l3NodeId = data.id;
                        scene.render();
                    }
                });
            })(ordered[j], this);
        }
        this.bindCanvasPan(canvas);
        return canvas;
    };

    Scene_L3SkillTrees.prototype.renderDetail = function(actor, classId, trees) {
        var panel = L3UI.el("aside", { className: "l3-skilltree-detail" });
        if (!trees.length) {
            panel.appendChild(L3UI.el("div", { className: "l3-skilltree-empty", text: "Selectionne une branche." }));
            return panel;
        }
        var first = this.firstNode(trees);
        var info = findNode(classId, this._l3NodeId) || (first ? findNode(classId, first.id) : null);
        var node = info ? info.node : null;
        var tree = info ? info.tree : null;
        if (!node) {
            panel.appendChild(L3UI.el("div", { className: "l3-skilltree-empty", text: "Aucun noeud." }));
            return panel;
        }
        var rank = nodeRank(actor, classId, node.id);
        var maxRank = nodeMaxRank(node);
        var learned = rank >= maxRank;
        var check = canLearn(actor, node, classId);
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-kicker", text: tree.name || "Branche" }));
        panel.appendChild(L3UI.el("h2", { html: iconHtml(node.iconIndex) + " " + L3UI.escapeHtml(node.name || node.id) }));
        panel.appendChild(L3UI.el("p", { text: node.description || "Aucune description." }));
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-meta", html:
            "<span class=\"l3-skilltree-chip\">" + (node.type === "skill" ? "Skill" : "Passif") + "</span>" +
            "<span class=\"l3-skilltree-chip\">" + nodeCost(node) + " point(s)</span>" +
            "<span class=\"l3-skilltree-chip\">Rang " + rank + "/" + maxRank + "</span>" +
            (Number(node.level || 0) > 0 ? "<span class=\"l3-skilltree-chip\">Niveau " + Number(node.level || 0) + "</span>" : "") +
            (learned ? "<span class=\"l3-skilltree-chip\">Maitrise</span>" : "")
        }));
        var conditions = conditionSummary(node);
        if (conditions.length) panel.appendChild(L3UI.el("div", { className: "l3-skilltree-conditions", html: conditions.map(function(line) { return "<span>" + L3UI.escapeHtml(line) + "</span>"; }).join("") }));
        panel.appendChild(L3UI.el("div", { className: "l3-skilltree-effects", text: effectsSummary(node, Math.max(1, rank || 1)) || "Aucun bonus configure." }));
        if (!learned) panel.appendChild(L3UI.el("div", { className: "l3-skilltree-preview", html: previewHtml(actor, classId, node) }));
        var button = L3UI.el("button", {
            className: "l3-skilltree-learn " + (!check.ok || learned ? "is-disabled" : ""),
            text: learned ? "Rang maximum" : (check.ok ? "Apprendre le rang " + (rank + 1) : check.reason),
            on: { click: function() {
                if (learned || !canLearn(actor, node, classId).ok) return;
                this.rememberCanvasScroll();
                learnNode(actor, node.id, classId);
                this.render();
            }.bind(this) }
        });
        panel.appendChild(button);
        return panel;
    };

    window.Scene_L3SkillTrees = Scene_L3SkillTrees;

    SkillTrees.data = data;
    SkillTrees.classTrees = classTrees;
    SkillTrees.findNode = findNode;
    SkillTrees.learn = learnNode;
    SkillTrees.reset = resetClass;
    SkillTrees.addPoints = addPoints;
    SkillTrees.addResetToken = addResetToken;
    SkillTrees.grant = grantNode;
    SkillTrees.availablePoints = availablePoints;
    SkillTrees.spentPoints = spentPoints;
    SkillTrees.isLearned = isLearned;
    SkillTrees.rank = nodeRank;
    SkillTrees.maxRank = nodeMaxRank;
    SkillTrees.canLearn = canLearn;
    SkillTrees.canPayReset = canPayReset;
    SkillTrees.effectsSummary = effectsSummary;
    SkillTrees.conditions = checkAdvancedConditions;
    SkillTrees.specialize = setSpecialization;
    SkillTrees.specialization = selectedSpecialization;
    SkillTrees.treeSpentPoints = treeSpentPoints;
    SkillTrees.open = openScene;

    var _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function(paramId) {
        return _Game_Actor_paramPlus.call(this, paramId) + learnedParamTotal(this, paramId, "params");
    };

    var _Game_BattlerBase_paramRate = Game_BattlerBase.prototype.paramRate;
    Game_BattlerBase.prototype.paramRate = function(paramId) {
        var base = _Game_BattlerBase_paramRate.call(this, paramId);
        if (this instanceof Game_Actor) base *= learnedParamTotal(this, paramId, "rates");
        return base;
    };

    var _Game_BattlerBase_xparam = Game_BattlerBase.prototype.xparam;
    Game_BattlerBase.prototype.xparam = function(xparamId) {
        var base = _Game_BattlerBase_xparam.call(this, xparamId);
        if (this instanceof Game_Actor) base += learnedXParam(this, xparamId);
        return base;
    };

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (String(command).toLowerCase() !== "l3skilltree") return;
        args = args || [];
        var action = String(args[0] || "").toLowerCase();
        if (action === "open") openScene(args[1]);
        else if (action === "addpoints") addPoints(args[1] || $gameParty.leader(), Number(args[2] || 1), args[3]);
        else if (action === "reset") resetClass(args[1] || $gameParty.leader(), args[2], String(args[3] || "").toLowerCase() === "free");
        else if (action === "resettoken") addResetToken(args[1] || $gameParty.leader(), Number(args[2] || 1), args[3]);
        else if (action === "grant") grantNode(args[1] || $gameParty.leader(), args[2], args[3], args[4]);
        else if (action === "specialize") {
            var targetActor = actorFrom(args[1] || $gameParty.leader());
            if (targetActor) setSpecialization(targetActor, classIdOf(targetActor, args[3]), args[2]);
        }
        else if (action === "learn") learnNode(args[1] || $gameParty.leader(), args[2], args[3]);
    };

    function registerMenuCommand() {
        if (!config.menuCommand || !window.L3UI || !L3UI.Menu || !L3UI.Menu.addCommand) return;
        L3UI.Menu.addCommand("skillTrees", {
            label: config.menuLabel,
            icon: config.menuIcon,
            order: config.menuOrder,
            handler: function(scene) {
                L3UI.Menu.openActorScene(scene, Scene_L3SkillTrees, config.menuLabel);
            }
        });
    }

    registerDataFile();
    installCss();
    registerMenuCommand();
    log("Plugin charge.");
})();
