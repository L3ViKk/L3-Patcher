/*:
 * @plugindesc L3 CSS Window System v1.0 - Système révolutionnaire de fenêtres HTML/CSS pour RPG Maker MV
 * @author L3ViKk
 * @version 1.0.0
 *
 * @param ---General Settings---
 * @default
 *
 * @param Enable CSS Windows
 * @desc Activer le système de fenêtres CSS
 * @type boolean
 * @default true
 *
 * @param Default Z-Index
 * @desc Z-index par défaut pour les fenêtres CSS
 * @type number
 * @min 0
 * @max 10000
 * @default 1000
 *
 * @param Auto Cleanup
 * @desc Nettoyage automatique des fenêtres lors du changement de scène
 * @type boolean
 * @default true
 *
 * @param ---CSS Settings---
 * @default
 *
 * @param Default CSS File
 * @desc Fichier CSS par défaut à charger (relatif à la racine du projet)
 * @type text
 * @default css/windows.css
 *
 * @param Enable Tailwind Utilities
 * @desc Charger le CSS Tailwind compilé pour les interfaces custom
 * @type boolean
 * @default true
 *
 * @param Tailwind CSS File
 * @desc Fichier Tailwind compilé (relatif à la racine du projet)
 * @type text
 * @default css/l3-tailwind.css
 *
 * @param Enable CSS Animations
 * @desc Activer les animations CSS (transitions, keyframes)
 * @type boolean
 * @default true
 *
 * @param ---Debug---
 * @default
 *
 * @param Debug Mode
 * @desc Activer les logs de debug
 * @type boolean
 * @default false
 *
 * @param Enable Dev Overlay
 * @desc Activer l'overlay développeur du système UI
 * @type boolean
 * @default false
 *
 * @help
 * ============================================================================
 * CSS Window System v1.0
 * ============================================================================
 *
 * Ce plugin révolutionne la création de fenêtres dans RPG Maker MV en
 * permettant l'utilisation de HTML/CSS natif pour styliser les fenêtres.
 *
 * FONCTIONNALITÉS :
 * ================
 * - Création de fenêtres HTML/CSS au-dessus du canvas PIXI.js
 * - Support CSS natif complet (styles, animations, transitions)
 * - API extensible pour les développeurs de plugins
 * - Compatibilité avec les fenêtres natives RPG Maker MV
 * - Gestion automatique du z-index et du positionnement
 * - Support des événements (clic, survol, etc.)
 * - SYSTÈME CENTRALISÉ DE DONNÉES RPG MAKER
 * - SYSTÈME CENTRALISÉ D'ACTIONS SYSTÈME
 * - API UNIFIÉE POUR TOUS LES PLUGINS L3_CSS
 *
 * UTILISATION DE BASE :
 * ====================
 *
 * // Dans une scène, créer une fenêtre CSS
 * var window = this.createCSSWindow('myWindow', {
 *     x: 100,
 *     y: 100,
 *     width: 300,
 *     height: 200,
 *     content: '<p>Contenu de la fenêtre</p>',
 *     cssClass: 'my-custom-window'
 * });
 *
 * // Ajouter du CSS personnalisé
 * CSSWindowSystem.addStyle('.my-custom-window', {
 *     'background-color': '#2a2a2a',
 *     'border': '2px solid #ffffff',
 *     'border-radius': '10px',
 *     'padding': '20px',
 *     'color': '#ffffff'
 * });
 *
 * API POUR DÉVELOPPEURS DE PLUGINS :
 * ===================================
 *
 * CSSWindowSystem.createWindow(id, config)
 *   Crée une nouvelle fenêtre CSS
 *
 * CSSWindowSystem.getWindow(id)
 *   Récupère une fenêtre par son ID
 *
 * CSSWindowSystem.removeWindow(id)
 *   Supprime une fenêtre
 *
 * CSSWindowSystem.addStyle(selector, styles)
 *   Ajoute des styles CSS personnalisés
 *
 * CSSWindowSystem.addClass(windowId, className)
 *   Ajoute une classe CSS à une fenêtre
 *
 * CSSWindowSystem.removeClass(windowId, className)
 *   Retire une classe CSS d'une fenêtre
 *
 * CSSWindowSystem.on(event, callback)
 *   Écoute un événement global
 *
 * API DE DONNÉES RPG MAKER :
 * ==========================
 *
 * CSSWindowSystem.Data.getActor(id)
 *   Récupère un acteur par son ID
 *
 * CSSWindowSystem.Data.getAllActors()
 *   Récupère tous les acteurs
 *
 * CSSWindowSystem.Data.getSkill(id)
 *   Récupère une compétence par son ID
 *
 * CSSWindowSystem.Data.getItem(id)
 *   Récupère un objet par son ID
 *
 * CSSWindowSystem.Data.getWeapon(id)
 *   Récupère une arme par son ID
 *
 * CSSWindowSystem.Data.getArmor(id)
 *   Récupère une armure par son ID
 *
 * CSSWindowSystem.Data.getVariable(id)
 *   Récupère la valeur d'une variable
 *
 * CSSWindowSystem.Data.setVariable(id, value)
 *   Définit la valeur d'une variable
 *
 * CSSWindowSystem.Data.getSwitch(id)
 *   Récupère l'état d'un commutateur
 *
 * CSSWindowSystem.Data.setSwitch(id, value)
 *   Définit l'état d'un commutateur
 *
 * CSSWindowSystem.Data.getParty()
 *   Récupère le groupe de personnages
 *
 * CSSWindowSystem.Data.findActor(predicate)
 *   Trouve un acteur selon un critère
 *
 * CSSWindowSystem.Data.filterItems(predicate)
 *   Filtre les objets selon un critère
 *
 * API D'ACTIONS SYSTÈME :
 * =======================
 *
 * CSSWindowSystem.Actions.goto(sceneClass, params)
 *   Change de scène (remplace la scène actuelle)
 *
 * CSSWindowSystem.Actions.push(sceneClass, params)
 *   Empile une nouvelle scène (retour possible avec pop)
 *
 * CSSWindowSystem.Actions.pop()
 *   Retire la scène actuelle et retourne à la précédente
 *
 * CSSWindowSystem.Actions.save(savefileId)
 *   Sauvegarde le jeu dans un emplacement
 *
 * CSSWindowSystem.Actions.load(savefileId)
 *   Charge un jeu depuis un emplacement
 *
 * CSSWindowSystem.Actions.newGame()
 *   Démarre un nouveau jeu
 *
 * CSSWindowSystem.Actions.getSavefileInfo(savefileId)
 *   Récupère les informations d'une sauvegarde
 *
 * CSSWindowSystem.Actions.getAllSavefiles()
 *   Récupère toutes les sauvegardes disponibles
 *
 * ÉVÉNEMENTS DISPONIBLES :
 * ========================
 *
 * 'dataRefreshed' - Déclenché quand les données sont rafraîchies
 * 'beforeSceneChange' - Déclenché avant un changement de scène
 * 'beforeSave' - Déclenché avant une sauvegarde
 * 'afterSave' - Déclenché après une sauvegarde
 * 'beforeLoad' - Déclenché avant un chargement
 * 'afterLoad' - Déclenché après un chargement
 * 'beforeNewGame' - Déclenché avant la création d'un nouveau jeu
 * 'afterNewGame' - Déclenché après la création d'un nouveau jeu
 * 'variableChanged' - Déclenché quand une variable change
 * 'switchChanged' - Déclenché quand un commutateur change
 *
 * ============================================================================
 */

(function() {
    'use strict';

    // =========================================================================
    // PARAMÈTRES
    // =========================================================================
    var parameters = PluginManager.parameters('L3_CSSWindowSystem');
    var CSSWindowSystem = {
        enabled: String(parameters['Enable CSS Windows'] || 'true') === 'true',
        defaultZIndex: Number(parameters['Default Z-Index'] || 1000),
        autoCleanup: String(parameters['Auto Cleanup'] || 'true') === 'true',
        defaultCSSFile: String(parameters['Default CSS File'] || 'css/windows.css'),
        enableTailwind: String(parameters['Enable Tailwind Utilities'] || 'true') === 'true',
        tailwindCSSFile: String(parameters['Tailwind CSS File'] || 'css/l3-tailwind.css'),
        enableAnimations: String(parameters['Enable CSS Animations'] || 'true') === 'true',
        debug: String(parameters['Debug Mode'] || 'false') === 'true',
        enableDevOverlay: String(parameters['Enable Dev Overlay'] || 'false') === 'true'
    };

    // =========================================================================
    // SYSTÈME DE REGISTRY DES DONNÉES RPG MAKER
    // =========================================================================
    CSSWindowSystem.DataRegistry = {
        _cache: {},
        _watchers: {},
        _initialized: false,

        initialize: function() {
            if (this._initialized) return;
            
            this._cache = {
                actors: null,
                classes: null,
                skills: null,
                items: null,
                weapons: null,
                armors: null,
                enemies: null,
                troops: null,
                states: null,
                animations: null,
                tilesets: null,
                commonEvents: null,
                system: null,
                mapInfos: null,
                map: null
            };

            this._watchDataChanges();
            this._initialized = true;
            CSSWindowSystem.log('Data Registry initialisé', 'info');
        },

        _watchDataChanges: function() {
            var self = this;
            
            var checkDataLoaded = function() {
                if (DataManager.isDatabaseLoaded()) {
                    self.refresh();
                } else {
                    setTimeout(checkDataLoaded, 100);
                }
            };
            checkDataLoaded();
        },

        refresh: function() {
            try {
                this._cache.actors = (typeof $dataActors !== 'undefined' && $dataActors) ? $dataActors : null;
                this._cache.classes = (typeof $dataClasses !== 'undefined' && $dataClasses) ? $dataClasses : null;
                this._cache.skills = (typeof $dataSkills !== 'undefined' && $dataSkills) ? $dataSkills : null;
                this._cache.items = (typeof $dataItems !== 'undefined' && $dataItems) ? $dataItems : null;
                this._cache.weapons = (typeof $dataWeapons !== 'undefined' && $dataWeapons) ? $dataWeapons : null;
                this._cache.armors = (typeof $dataArmors !== 'undefined' && $dataArmors) ? $dataArmors : null;
                this._cache.enemies = (typeof $dataEnemies !== 'undefined' && $dataEnemies) ? $dataEnemies : null;
                this._cache.troops = (typeof $dataTroops !== 'undefined' && $dataTroops) ? $dataTroops : null;
                this._cache.states = (typeof $dataStates !== 'undefined' && $dataStates) ? $dataStates : null;
                this._cache.animations = (typeof $dataAnimations !== 'undefined' && $dataAnimations) ? $dataAnimations : null;
                this._cache.tilesets = (typeof $dataTilesets !== 'undefined' && $dataTilesets) ? $dataTilesets : null;
                this._cache.commonEvents = (typeof $dataCommonEvents !== 'undefined' && $dataCommonEvents) ? $dataCommonEvents : null;
                this._cache.system = (typeof $dataSystem !== 'undefined' && $dataSystem) ? $dataSystem : null;
                this._cache.mapInfos = (typeof $dataMapInfos !== 'undefined' && $dataMapInfos) ? $dataMapInfos : null;
                this._cache.map = (typeof $dataMap !== 'undefined' && $dataMap) ? $dataMap : null;

                CSSWindowSystem._triggerEvent('dataRefreshed', { registry: this._cache });
                CSSWindowSystem.log('Data Registry rafraîchi', 'info');
            } catch (e) {
                CSSWindowSystem.log('Erreur lors du rafraîchissement du Data Registry: ' + e.message, 'error');
                if (e.stack) {
                    CSSWindowSystem.log('Stack trace: ' + e.stack, 'error');
                }
            }
        },

        get: function(type, id) {
            if (!this._cache[type]) return null;
            if (id !== undefined) {
                return this._cache[type][id] || null;
            }
            return this._cache[type];
        },

        getAll: function(type) {
            return this.get(type);
        },

        find: function(type, predicate) {
            var data = this.getAll(type);
            if (!data || !Array.isArray(data)) return null;
            
            for (var i = 0; i < data.length; i++) {
                if (data[i] && predicate(data[i])) {
                    return data[i];
                }
            }
            return null;
        },

        filter: function(type, predicate) {
            var data = this.getAll(type);
            if (!data || !Array.isArray(data)) return [];
            
            var results = [];
            for (var i = 0; i < data.length; i++) {
                if (data[i] && predicate(data[i])) {
                    results.push(data[i]);
                }
            }
            return results;
        }
    };

    // =========================================================================
    // SYSTÈME DE GESTION DES ACTIONS SYSTÈME
    // =========================================================================
    CSSWindowSystem.ActionManager = {
        _sceneStack: [],
        _actionQueue: [],
        _processing: false,

        gotoScene: function(sceneClass, params) {
            if (!sceneClass) {
                CSSWindowSystem.log('Action gotoScene: sceneClass invalide', 'error');
                return false;
            }

            CSSWindowSystem._triggerEvent('beforeSceneChange', {
                type: 'goto',
                sceneClass: sceneClass,
                params: params
            });

            try {
                if (params) {
                    SceneManager.prepareNextScene.apply(SceneManager, params);
                }
                SceneManager.goto(sceneClass);
                var sceneName = (sceneClass && sceneClass.name) ? sceneClass.name : 'Unknown';
                CSSWindowSystem.log('Action gotoScene: ' + sceneName, 'info');
                return true;
            } catch (e) {
                CSSWindowSystem.log('Erreur lors du changement de scène: ' + e.message, 'error');
                return false;
            }
        },

        pushScene: function(sceneClass, params) {
            if (!sceneClass) {
                CSSWindowSystem.log('Action pushScene: sceneClass invalide', 'error');
                return false;
            }

            CSSWindowSystem._triggerEvent('beforeSceneChange', {
                type: 'push',
                sceneClass: sceneClass,
                params: params
            });

            try {
                if (params) {
                    SceneManager.prepareNextScene.apply(SceneManager, params);
                }
                SceneManager.push(sceneClass);
                var sceneName = (sceneClass && sceneClass.name) ? sceneClass.name : 'Unknown';
                CSSWindowSystem.log('Action pushScene: ' + sceneName, 'info');
                return true;
            } catch (e) {
                CSSWindowSystem.log('Erreur lors du push de scène: ' + e.message, 'error');
                return false;
            }
        },

        popScene: function() {
            CSSWindowSystem._triggerEvent('beforeSceneChange', {
                type: 'pop'
            });

            try {
                SceneManager.pop();
                CSSWindowSystem.log('Action popScene', 'info');
                return true;
            } catch (e) {
                CSSWindowSystem.log('Erreur lors du pop de scène: ' + e.message, 'error');
                return false;
            }
        },

        saveGame: function(savefileId) {
            if (!savefileId || savefileId < 1) {
                CSSWindowSystem.log('Action saveGame: savefileId invalide', 'error');
                return false;
            }

            CSSWindowSystem._triggerEvent('beforeSave', { savefileId: savefileId });

            try {
                var result = DataManager.saveGame(savefileId);
                if (result) {
                    CSSWindowSystem._triggerEvent('afterSave', { savefileId: savefileId, success: true });
                    CSSWindowSystem.log('Action saveGame: succès (#' + savefileId + ')', 'info');
                } else {
                    CSSWindowSystem._triggerEvent('afterSave', { savefileId: savefileId, success: false });
                    CSSWindowSystem.log('Action saveGame: échec (#' + savefileId + ')', 'warning');
                }
                return result;
            } catch (e) {
                CSSWindowSystem.log('Erreur lors de la sauvegarde: ' + e.message, 'error');
                return false;
            }
        },

        loadGame: function(savefileId) {
            if (!savefileId || savefileId < 1) {
                CSSWindowSystem.log('Action loadGame: savefileId invalide', 'error');
                return false;
            }

            CSSWindowSystem._triggerEvent('beforeLoad', { savefileId: savefileId });

            try {
                var result = DataManager.loadGame(savefileId);
                if (result) {
                    // Rafraîchir le cache de données de manière sécurisée
                    try {
                        CSSWindowSystem.DataRegistry.refresh();
                    } catch (refreshError) {
                        CSSWindowSystem.log('Erreur lors du rafraîchissement du cache: ' + refreshError.message, 'warning');
                    }
                    
                    CSSWindowSystem._triggerEvent('afterLoad', { savefileId: savefileId, success: true });
                    CSSWindowSystem.log('Action loadGame: succès (#' + savefileId + ')', 'info');
                    
                    if ($gameSystem && typeof $gameSystem.onAfterLoad === 'function') {
                        try {
                            $gameSystem.onAfterLoad();
                        } catch (onAfterLoadError) {
                            CSSWindowSystem.log('Erreur dans onAfterLoad: ' + onAfterLoadError.message, 'warning');
                        }
                    }
                    
                    // Vérifier que Scene_Map est disponible avant de changer de scène
                    if (typeof Scene_Map !== 'undefined' && Scene_Map) {
                        SceneManager.goto(Scene_Map);
                    } else {
                        CSSWindowSystem.log('Scene_Map non disponible, tentative de chargement différé', 'warning');
                        setTimeout(function() {
                            if (typeof Scene_Map !== 'undefined' && Scene_Map) {
                                SceneManager.goto(Scene_Map);
                            } else {
                                CSSWindowSystem.log('Scene_Map toujours non disponible après délai', 'error');
                            }
                        }, 100);
                    }
                } else {
                    CSSWindowSystem._triggerEvent('afterLoad', { savefileId: savefileId, success: false });
                    CSSWindowSystem.log('Action loadGame: échec (#' + savefileId + ')', 'warning');
                }
                return result;
            } catch (e) {
                CSSWindowSystem.log('Erreur lors du chargement: ' + e.message, 'error');
                if (e.stack) {
                    CSSWindowSystem.log('Stack trace: ' + e.stack, 'error');
                }
                return false;
            }
        },

        setupNewGame: function() {
            CSSWindowSystem._triggerEvent('beforeNewGame', {});

            try {
                DataManager.setupNewGame();
                CSSWindowSystem.DataRegistry.refresh();
                CSSWindowSystem._triggerEvent('afterNewGame', {});
                CSSWindowSystem.log('Action setupNewGame: succès', 'info');
                SceneManager.goto(Scene_Map);
                return true;
            } catch (e) {
                CSSWindowSystem.log('Erreur lors de la création d\'un nouveau jeu: ' + e.message, 'error');
                return false;
            }
        },

        getSavefileInfo: function(savefileId) {
            return DataManager.loadSavefileInfo(savefileId);
        },

        getAllSavefiles: function() {
            var globalInfo = DataManager.loadGlobalInfo();
            var savefiles = [];
            for (var i = 1; i <= DataManager.maxSavefiles(); i++) {
                var info = globalInfo[i] || null;
                savefiles.push({
                    id: i,
                    exists: !!info,
                    info: info
                });
            }
            return savefiles;
        }
    };

    // =========================================================================
    // API UNIFIÉE POUR LES DONNÉES RPG MAKER
    // =========================================================================
    CSSWindowSystem.Data = {
        getActor: function(id) {
            return CSSWindowSystem.DataRegistry.get('actors', id);
        },

        getAllActors: function() {
            return CSSWindowSystem.DataRegistry.getAll('actors');
        },

        getClass: function(id) {
            return CSSWindowSystem.DataRegistry.get('classes', id);
        },

        getAllClasses: function() {
            return CSSWindowSystem.DataRegistry.getAll('classes');
        },

        getSkill: function(id) {
            return CSSWindowSystem.DataRegistry.get('skills', id);
        },

        getAllSkills: function() {
            return CSSWindowSystem.DataRegistry.getAll('skills');
        },

        getItem: function(id) {
            return CSSWindowSystem.DataRegistry.get('items', id);
        },

        getAllItems: function() {
            return CSSWindowSystem.DataRegistry.getAll('items');
        },

        getWeapon: function(id) {
            return CSSWindowSystem.DataRegistry.get('weapons', id);
        },

        getAllWeapons: function() {
            return CSSWindowSystem.DataRegistry.getAll('weapons');
        },

        getArmor: function(id) {
            return CSSWindowSystem.DataRegistry.get('armors', id);
        },

        getAllArmors: function() {
            return CSSWindowSystem.DataRegistry.getAll('armors');
        },

        getEnemy: function(id) {
            return CSSWindowSystem.DataRegistry.get('enemies', id);
        },

        getAllEnemies: function() {
            return CSSWindowSystem.DataRegistry.getAll('enemies');
        },

        getState: function(id) {
            return CSSWindowSystem.DataRegistry.get('states', id);
        },

        getAllStates: function() {
            return CSSWindowSystem.DataRegistry.getAll('states');
        },

        getSystem: function() {
            return CSSWindowSystem.DataRegistry.get('system');
        },

        getVariable: function(id) {
            return $gameVariables ? $gameVariables.value(id) : null;
        },

        setVariable: function(id, value) {
            if ($gameVariables) {
                $gameVariables.setValue(id, value);
                CSSWindowSystem._triggerEvent('variableChanged', { id: id, value: value });
            }
        },

        getSwitch: function(id) {
            return $gameSwitches ? $gameSwitches.value(id) : false;
        },

        setSwitch: function(id, value) {
            if ($gameSwitches) {
                $gameSwitches.setValue(id, value);
                CSSWindowSystem._triggerEvent('switchChanged', { id: id, value: value });
            }
        },

        getParty: function() {
            return $gameParty || null;
        },

        getActors: function() {
            return $gameActors || null;
        },

        getPlayer: function() {
            return $gamePlayer || null;
        },

        getMap: function() {
            return $gameMap || null;
        },

        findActor: function(predicate) {
            return CSSWindowSystem.DataRegistry.find('actors', predicate);
        },

        findSkill: function(predicate) {
            return CSSWindowSystem.DataRegistry.find('skills', predicate);
        },

        findItem: function(predicate) {
            return CSSWindowSystem.DataRegistry.find('items', predicate);
        },

        filterActors: function(predicate) {
            return CSSWindowSystem.DataRegistry.filter('actors', predicate);
        },

        filterSkills: function(predicate) {
            return CSSWindowSystem.DataRegistry.filter('skills', predicate);
        },

        filterItems: function(predicate) {
            return CSSWindowSystem.DataRegistry.filter('items', predicate);
        }
    };

    // =========================================================================
    // API UNIFIÉE POUR LES ACTIONS SYSTÈME
    // =========================================================================
    CSSWindowSystem.Actions = {
        goto: function(sceneClass, params) {
            return CSSWindowSystem.ActionManager.gotoScene(sceneClass, params);
        },

        push: function(sceneClass, params) {
            return CSSWindowSystem.ActionManager.pushScene(sceneClass, params);
        },

        pop: function() {
            return CSSWindowSystem.ActionManager.popScene();
        },

        save: function(savefileId) {
            return CSSWindowSystem.ActionManager.saveGame(savefileId);
        },

        load: function(savefileId) {
            return CSSWindowSystem.ActionManager.loadGame(savefileId);
        },

        newGame: function() {
            return CSSWindowSystem.ActionManager.setupNewGame();
        },

        getSavefileInfo: function(savefileId) {
            return CSSWindowSystem.ActionManager.getSavefileInfo(savefileId);
        },

        getAllSavefiles: function() {
            return CSSWindowSystem.ActionManager.getAllSavefiles();
        }
    };

    // =========================================================================
    // SYSTÈME DE LOGGING
    // =========================================================================
    CSSWindowSystem.log = function(message, type) {
        // Toujours afficher les erreurs et les messages critiques
        if (!this.debug && type !== 'error' && type !== 'critical') return;
        var prefix = '[CSSWindowSystem]';
        var style = type === 'error' ? 'color: #ff4444' : 
                   type === 'warning' ? 'color: #ffaa00' : 
                   type === 'critical' ? 'color: #ff00ff' :
                   'color: #00aaff';
        console.log('%c' + prefix + ' ' + message, style);
    };

    // Log immédiat pour confirmer le chargement
    console.log('%c[CSSWindowSystem] Plugin chargé !', 'color: #00aaff; font-weight: bold');

    // =========================================================================
    // CONTAINER PRINCIPAL
    // =========================================================================
    CSSWindowSystem._container = null;
    CSSWindowSystem._windows = {};
    CSSWindowSystem._styles = {};
    CSSWindowSystem._eventListeners = {};
    CSSWindowSystem._windowCounter = 0;
    CSSWindowSystem._layers = {};
    CSSWindowSystem._layerOrder = ['background', 'scene', 'hud', 'menu', 'modal', 'tooltip', 'debug'];
    CSSWindowSystem._initialized = false;
    CSSWindowSystem._schedulerStarted = false;
    CSSWindowSystem._lastTickFrame = -1;
    CSSWindowSystem._resizeHandler = null;

    // =========================================================================
    // INITIALISATION
    // =========================================================================
    CSSWindowSystem.initialize = function() {
        if (!this.enabled) {
            this.log('Système désactivé', 'warning');
            return;
        }

        if (this._initialized) {
            return;
        }

        this._createContainer();
        this._loadDefaultCSS();
        this._setupEventHandlers();
        this.DataRegistry.initialize();
        this.ThemeManager.apply('default');
        this.FocusManager.initialize();
        this.DevOverlay.initialize();
        this._startScheduler();
        this._initialized = true;
        this.log('Système initialisé', 'info');
    };

    // =========================================================================
    // CRÉATION DU CONTAINER HTML
    // =========================================================================
    CSSWindowSystem._createContainer = function() {
        if (this._container) return;

        // Créer le container principal
        this._container = document.createElement('div');
        this._container.id = 'css-window-system-container';
        this._container.style.cssText = [
            'position: fixed',
            'top: 0',
            'left: 0',
            'width: 100%',
            'height: 100%',
            'pointer-events: none',
            'z-index: ' + (this.defaultZIndex + 1000),
            'overflow: hidden'
        ].join('; ');

        this._layers = {};
        for (var i = 0; i < this._layerOrder.length; i++) {
            this._createLayer(this._layerOrder[i], i);
        }

        // Ajouter au body
        document.body.appendChild(this._container);
        this.log('Container créé', 'info');
    };

    CSSWindowSystem._createLayer = function(name, index) {
        if (!this._container || this._layers[name]) return this._layers[name] || null;

        var layer = document.createElement('div');
        layer.className = 'css-window-layer css-window-layer-' + name;
        layer.setAttribute('data-layer', name);
        layer.style.cssText = [
            'position: absolute',
            'top: 0',
            'left: 0',
            'width: 100%',
            'height: 100%',
            'pointer-events: none',
            'z-index: ' + (this.defaultZIndex + (index * 100)),
            'overflow: hidden'
        ].join('; ');

        this._container.appendChild(layer);
        this._layers[name] = layer;
        return layer;
    };

    CSSWindowSystem.getLayerElement = function(name) {
        name = name || 'scene';
        if (!this._layers[name]) {
            this._createLayer(name, this._layerOrder.length);
            this._layerOrder.push(name);
        }
        return this._layers[name] || this._container;
    };

    // =========================================================================
    // CHARGEMENT DU CSS PAR DÉFAUT
    // =========================================================================
    CSSWindowSystem._loadDefaultCSS = function() {
        if (this.defaultCSSFile) {
            this.loadCSSFile(this.defaultCSSFile);
        }
        if (this.enableTailwind && this.tailwindCSSFile) {
            this.loadCSSFile(this.tailwindCSSFile);
        }
    };

    CSSWindowSystem.loadCSSFile = function(filePath) {
        if (!filePath) return false;

        // Vérifier si le fichier n'est pas déjà chargé
        var existingLink = document.querySelector('link[data-css-window-system="' + filePath + '"]');
        if (existingLink) {
            this.log('CSS déjà chargé: ' + filePath, 'info');
            return true;
        }

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = filePath;
        link.setAttribute('data-css-window-system', filePath);
        link.onerror = function() {
            CSSWindowSystem.log('Impossible de charger le CSS: ' + filePath, 'warning');
        };
        link.onload = function() {
            CSSWindowSystem.log('CSS chargé: ' + filePath, 'info');
        };
        document.head.appendChild(link);
        return true;
    };

    // =========================================================================
    // GESTION DES ÉVÉNEMENTS
    // =========================================================================
    CSSWindowSystem._setupEventHandlers = function() {
        if (this._resizeHandler) return;
        this._resizeHandler = this._onResize.bind(this);
        window.addEventListener('resize', this._resizeHandler);
    };

    CSSWindowSystem._startScheduler = function() {
        if (this._schedulerStarted) return;
        this._schedulerStarted = true;

        var self = this;
        var raf = window.requestAnimationFrame || function(callback) {
            return setTimeout(callback, 16);
        };

        var loop = function() {
            self._tick();
            raf(loop);
        };

        raf(loop);
    };

    CSSWindowSystem._tick = function() {
        if (!this.enabled) return;

        var frame = (typeof Graphics !== 'undefined' && Graphics.frameCount !== undefined) ? Graphics.frameCount : Date.now();
        if (this._lastTickFrame === frame) return;
        this._lastTickFrame = frame;

        this._updateAllWindows();
        this.FocusManager.update();
        this.DevOverlay.update();
    };

    CSSWindowSystem._onResize = function() {
        // Mettre à jour la position des fenêtres si nécessaire
        this._updateAllWindows();
    };

    CSSWindowSystem._updateAllWindows = function() {
        for (var id in this._windows) {
            var window = this._windows[id];
            if (window && window.update) {
                try {
                    window.update();
                } catch (e) {
                    this.log('Erreur lors de la mise à jour de la fenêtre ' + id + ': ' + e.message, 'error');
                }
            }
        }
    };

    // =========================================================================
    // CRÉATION DE FENÊTRE
    // =========================================================================
    CSSWindowSystem.createWindow = function(id, config) {
        if (!this.enabled) {
            this.log('Tentative de création de fenêtre alors que le système est désactivé', 'warning');
            return null;
        }

        if (!id) {
            id = 'css-window-' + (++this._windowCounter);
        }

        if (this._windows[id]) {
            this.log('Fenêtre déjà existante: ' + id + ' - Suppression et recréation', 'warning');
            this.removeWindow(id);
        }

        config = config || {};
        var window = new CSSWindow(id, config);
        this._windows[id] = window;
        
        if (this._container) {
            var mount = this.getLayerElement(window.config.layer || 'scene');
            mount.appendChild(window.element);
        }

        this.log('Fenêtre créée: ' + id + ' (x:' + window.config.x + ', y:' + window.config.y + ', w:' + window.config.width + ', h:' + window.config.height + ')', 'info');
        this._triggerEvent('windowCreated', { id: id, window: window });

        return window;
    };

    // =========================================================================
    // RÉCUPÉRATION DE FENÊTRE
    // =========================================================================
    CSSWindowSystem.getWindow = function(id) {
        return this._windows[id] || null;
    };

    // =========================================================================
    // SUPPRESSION DE FENÊTRE
    // =========================================================================
    CSSWindowSystem.removeWindow = function(id) {
        var window = this._windows[id];
        if (!window) {
            this.log('Fenêtre introuvable: ' + id, 'warning');
            return false;
        }

        window.destroy();
        delete this._windows[id];
        this.log('Fenêtre supprimée: ' + id, 'info');
        this._triggerEvent('windowRemoved', { id: id });

        return true;
    };

    // =========================================================================
    // GESTION DES STYLES CSS
    // =========================================================================
    CSSWindowSystem.addStyle = function(selector, styles) {
        if (!this._styles[selector]) {
            this._styles[selector] = {};
        }

        // Fusionner les styles
        for (var property in styles) {
            this._styles[selector][property] = styles[property];
        }

        // Appliquer les styles
        this._applyStyle(selector, this._styles[selector]);
        this.log('Style ajouté: ' + selector, 'info');
    };

    CSSWindowSystem._applyStyle = function(selector, styles) {
        var styleElement = document.getElementById('css-window-system-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'css-window-system-styles';
            document.head.appendChild(styleElement);
        }

        var css = selector + ' { ';
        for (var property in styles) {
            css += property + ': ' + styles[property] + '; ';
        }
        css += '}';

        // Ajouter ou mettre à jour la règle
        var sheet = styleElement.sheet;
        var rules = sheet.cssRules || sheet.rules;
        var existingIndex = -1;

        for (var i = 0; i < rules.length; i++) {
            if (rules[i].selectorText === selector) {
                existingIndex = i;
                break;
            }
        }

        if (existingIndex >= 0) {
            sheet.deleteRule(existingIndex);
        }

        try {
            sheet.insertRule(css, sheet.cssRules.length);
        } catch (e) {
            // Fallback pour les navigateurs plus anciens
            styleElement.appendChild(document.createTextNode(css));
        }
    };

    // =========================================================================
    // GESTION DES CLASSES CSS
    // =========================================================================
    CSSWindowSystem.addClass = function(windowId, className) {
        var window = this.getWindow(windowId);
        if (window) {
            window.addClass(className);
            return true;
        }
        return false;
    };

    CSSWindowSystem.removeClass = function(windowId, className) {
        var window = this.getWindow(windowId);
        if (window) {
            window.removeClass(className);
            return true;
        }
        return false;
    };

    CSSWindowSystem.toggleClass = function(windowId, className) {
        var window = this.getWindow(windowId);
        if (window) {
            window.toggleClass(className);
            return true;
        }
        return false;
    };

    // =========================================================================
    // SYSTÈME D'ÉVÉNEMENTS
    // =========================================================================
    CSSWindowSystem.on = function(event, callback) {
        if (!this._eventListeners[event]) {
            this._eventListeners[event] = [];
        }
        this._eventListeners[event].push(callback);
    };

    CSSWindowSystem.off = function(event, callback) {
        if (!this._eventListeners[event]) return;
        var index = this._eventListeners[event].indexOf(callback);
        if (index >= 0) {
            this._eventListeners[event].splice(index, 1);
        }
    };

    CSSWindowSystem._triggerEvent = function(event, data) {
        if (!this._eventListeners[event]) return;
        this._eventListeners[event].forEach(function(callback) {
            try {
                callback(data);
            } catch (e) {
                CSSWindowSystem.log('Erreur dans le callback d\'événement: ' + e.message, 'error');
            }
        });
    };

    // =========================================================================
    // NETTOYAGE
    // =========================================================================
    CSSWindowSystem.cleanup = function() {
        if (!this.autoCleanup) return;

        var count = 0;
        var ids = [];
        for (var id in this._windows) {
            var window = this._windows[id];
            if (window && !window.config.persistent) {
                ids.push(id);
            }
        }
        for (var i = 0; i < ids.length; i++) {
            if (this.removeWindow(ids[i])) {
                count++;
            }
        }
        this.log('Nettoyage: ' + count + ' fenêtres supprimées', 'info');
    };

    // =========================================================================
    // CLASSE CSSWindow
    // =========================================================================
    function CSSWindow(id, config) {
        this.id = id;
        this.config = this._mergeConfig(config);
        this.element = null;
        this._isVisible = true;
        this._isDestroyed = false;
        this._updateFunction = null;

        this._create();
    }

    CSSWindow.prototype._mergeConfig = function(config) {
        return {
            x: config.x || 0,
            y: config.y || 0,
            width: config.width || 300,
            height: config.height || 200,
            maxWidth: config.maxWidth || null,
            maxHeight: config.maxHeight || null,
            autoSize: config.autoSize || false, // Si true, calcule automatiquement la taille en fonction du contenu
            content: config.content || '',
            contentElement: config.contentElement || null,
            cssClass: config.cssClass || 'css-window',
            cssId: config.cssId || this.id,
            zIndex: config.zIndex || CSSWindowSystem.defaultZIndex,
            layer: config.layer || 'scene',
            scopeId: config.scopeId || null,
            visible: config.visible !== undefined ? config.visible : true,
            persistent: config.persistent || false,
            interactive: config.interactive !== undefined ? config.interactive : true,
            styles: config.styles || {},
            data: config.data || {},
            dirty: config.dirty !== undefined ? config.dirty : !!config.renderFunction,
            autoUpdate: config.autoUpdate !== undefined ? config.autoUpdate : true,
            renderFunction: config.renderFunction || null,
            onCreated: config.onCreated || null,
            onDestroyed: config.onDestroyed || null,
            onClick: config.onClick || null,
            onHover: config.onHover || null,
            onOut: config.onOut || null,
            updateFunction: config.updateFunction || null
        };
    };

    CSSWindow.prototype._create = function() {
        // Créer l'élément HTML
        this.element = document.createElement('div');
        this.element.id = this.config.cssId;
        this.element.className = this.config.cssClass;
        
        // Appliquer les dimensions inline en premier (priorité)
        this.element.style.position = 'absolute';
        this.element.style.left = this.config.x + 'px';
        this.element.style.top = this.config.y + 'px';
        
        // Gérer les dimensions auto ou fixes
        var width = this.config.width;
        var height = this.config.height;
        
        if (width === 'auto' || this.config.autoSize) {
            this.element.style.width = 'auto';
            this.element.style.minWidth = '0';
        } else {
            this.element.style.width = width + 'px';
        }
        
        if (height === 'auto' || this.config.autoSize) {
            this.element.style.height = 'auto';
            this.element.style.minHeight = '0';
        } else {
            this.element.style.height = height + 'px';
        }
        
        this.element.style.zIndex = this.config.zIndex;
        this.element.style.pointerEvents = this.config.interactive ? 'auto' : 'none';
        this.element.style.boxSizing = 'border-box';
        
        if (CSSWindowSystem.enableAnimations) {
            this.element.style.transition = 'all 0.3s ease';
        }

        if (this.config.scopeId) {
            this.element.setAttribute('data-scope-id', this.config.scopeId);
        }
        this.element.setAttribute('data-window-id', this.id);
        this.element.setAttribute('data-layer', this.config.layer);

        // Ajouter le contenu
        if (this.config.contentElement) {
            this.element.appendChild(this.config.contentElement);
        } else if (this.config.renderFunction) {
            this.render();
        } else if (this.config.content) {
            this.setContent(this.config.content);
        }
        
        // Appliquer maxWidth et maxHeight si définis
        if (this.config.maxWidth) {
            this.element.style.maxWidth = this.config.maxWidth + 'px';
        }
        if (this.config.maxHeight) {
            this.element.style.maxHeight = this.config.maxHeight + 'px';
        }
        
        // Si autoSize est activé, calculer les dimensions après avoir ajouté le contenu
        if (this.config.autoSize) {
            // Attendre que le DOM soit rendu et que les styles CSS soient appliqués
            var self = this;
            var calculateSize = function() {
                // Temporairement retirer les contraintes de taille pour mesurer le contenu naturel
                var originalWidth = self.element.style.width;
                var originalHeight = self.element.style.height;
                var originalMaxWidth = self.element.style.maxWidth;
                var originalMaxHeight = self.element.style.maxHeight;
                
                // Permettre au contenu de s'étendre naturellement
                self.element.style.width = 'auto';
                self.element.style.height = 'auto';
                self.element.style.maxWidth = 'none';
                self.element.style.maxHeight = 'none';
                self.element.style.position = 'absolute';
                self.element.style.visibility = 'hidden';
                
                // Forcer un reflow pour que le navigateur calcule les dimensions
                var forceReflow = self.element.offsetHeight;
                
                // Obtenir les dimensions naturelles du contenu
                var naturalWidth = self.element.scrollWidth;
                var naturalHeight = self.element.scrollHeight;
                
                // Restaurer la visibilité
                self.element.style.visibility = 'visible';
                
                // Si width n'est pas 'auto', utiliser la largeur configurée
                var finalWidth = naturalWidth;
                if (self.config.width !== 'auto' && typeof self.config.width === 'number') {
                    finalWidth = self.config.width;
                }
                
                // Limiter aux maxWidth/maxHeight si définis
                if (self.config.maxWidth && finalWidth > self.config.maxWidth) {
                    finalWidth = self.config.maxWidth;
                }
                var finalHeight = naturalHeight;
                if (self.config.maxHeight && finalHeight > self.config.maxHeight) {
                    finalHeight = self.config.maxHeight;
                    // Activer le scroll si le contenu dépasse
                    self.element.style.overflowY = 'auto';
                } else {
                    // Pas besoin de scroll si tout le contenu tient
                    self.element.style.overflowY = 'visible';
                }
                
                // Restaurer les styles originaux
                self.element.style.width = '';
                self.element.style.height = '';
                self.element.style.maxWidth = originalMaxWidth || '';
                self.element.style.maxHeight = originalMaxHeight || '';
                
                // Appliquer les dimensions calculées avec !important
                if (self.config.width === 'auto' || self.config.autoSize) {
                    self.element.style.setProperty('width', finalWidth + 'px', 'important');
                    self.config.width = finalWidth;
                }
                if (self.config.height === 'auto' || self.config.autoSize) {
                    self.element.style.setProperty('height', finalHeight + 'px', 'important');
                    self.config.height = finalHeight;
                }
                
                if (CSSWindowSystem.debug) {
                    CSSWindowSystem.log('Dimensions auto calculées pour ' + self.config.cssId + ': width=' + finalWidth + 'px, height=' + finalHeight + 'px (naturel: ' + naturalWidth + 'x' + naturalHeight + ')', 'info');
                }
            };
            
            // Essayer plusieurs fois pour s'assurer que le DOM est prêt
            setTimeout(calculateSize, 0);
            setTimeout(calculateSize, 50);
            setTimeout(calculateSize, 100);
        }

        // Appliquer les styles personnalisés (mais ne pas écraser width/height)
        for (var property in this.config.styles) {
            if (property !== 'width' && property !== 'height' && property !== 'left' && property !== 'top') {
                this.element.style[property] = this.config.styles[property];
            }
        }
        
        // Forcer les dimensions avec !important via setProperty pour garantir qu'elles ne soient pas écrasées
        // (sauf si autoSize est activé, dans ce cas on attend le calcul)
        if (!this.config.autoSize) {
            if (this.config.width !== 'auto') {
                this.element.style.setProperty('width', this.config.width + 'px', 'important');
            }
            if (this.config.height !== 'auto') {
                this.element.style.setProperty('height', this.config.height + 'px', 'important');
            }
        }
        this.element.style.setProperty('left', this.config.x + 'px', 'important');
        this.element.style.setProperty('top', this.config.y + 'px', 'important');
        
        // Log pour debug
        if (CSSWindowSystem.debug) {
            CSSWindowSystem.log('Dimensions appliquées à ' + this.config.cssId + ': width=' + this.config.width + 'px, height=' + this.config.height + 'px', 'info');
        }

        // Gestion des événements
        this._setupEvents();

        // Visibilité
        if (!this.config.visible) {
            this.hide();
        }

        // Callback de création
        if (this.config.onCreated) {
            try {
                this.config.onCreated.call(this, this);
            } catch (e) {
                CSSWindowSystem.log('Erreur dans onCreated: ' + e.message, 'error');
            }
        }
    };

    CSSWindow.prototype._buildStyleString = function() {
        var styles = [
            'position: absolute',
            'left: ' + this.config.x + 'px',
            'top: ' + this.config.y + 'px',
            'width: ' + this.config.width + 'px',
            'height: ' + this.config.height + 'px',
            'z-index: ' + this.config.zIndex,
            'pointer-events: ' + (this.config.interactive ? 'auto' : 'none'),
            'box-sizing: border-box'
        ];

        if (CSSWindowSystem.enableAnimations) {
            styles.push('transition: all 0.3s ease');
        }

        return styles.join('; ');
    };

    CSSWindow.prototype._setupEvents = function() {
        var self = this;

        if (this.config.onClick) {
            this.element.addEventListener('click', function(e) {
                try {
                    self.config.onClick.call(self, e, self);
                } catch (err) {
                    CSSWindowSystem.log('Erreur dans onClick: ' + err.message, 'error');
                }
            });
        }

        if (this.config.onHover) {
            this.element.addEventListener('mouseenter', function(e) {
                try {
                    self.config.onHover.call(self, e, self);
                } catch (err) {
                    CSSWindowSystem.log('Erreur dans onHover: ' + err.message, 'error');
                }
            });
        }

        if (this.config.onOut) {
            this.element.addEventListener('mouseleave', function(e) {
                try {
                    self.config.onOut.call(self, e, self);
                } catch (err) {
                    CSSWindowSystem.log('Erreur dans onOut: ' + err.message, 'error');
                }
            });
        }
        
        // Support de la molette de souris pour le scroll
        this.element.addEventListener('wheel', function(e) {
            // Vérifier si l'élément a un overflow et peut scroller
            var style = window.getComputedStyle(self.element);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                style.overflow === 'auto' || style.overflow === 'scroll') {
                // Si le contenu dépasse, permettre le scroll
                if (self.element.scrollHeight > self.element.clientHeight) {
                    e.preventDefault();
                    self.element.scrollTop += e.deltaY;
                }
            }
        }, { passive: false });
    };

    CSSWindow.prototype.show = function() {
        if (this._isDestroyed) return;
        this.element.style.display = 'block';
        this.element.style.visibility = 'visible';
        this.element.style.opacity = '1';
        this._isVisible = true;
    };

    CSSWindow.prototype.hide = function() {
        if (this._isDestroyed) return;
        this.element.style.display = 'none';
        this.element.style.visibility = 'hidden';
        this._isVisible = false;
    };

    CSSWindow.prototype.setContent = function(content) {
        if (this._isDestroyed) return;
        this.element.innerHTML = content || '';
        this.config.content = content;
        this.config.dirty = false;
    };

    CSSWindow.prototype.setText = function(text) {
        if (this._isDestroyed) return;
        this.element.textContent = text || '';
        this.config.content = text || '';
        this.config.dirty = false;
    };

    CSSWindow.prototype.setData = function(data, merge) {
        if (this._isDestroyed) return;
        if (merge === false) {
            this.config.data = data || {};
        } else {
            data = data || {};
            for (var key in data) {
                this.config.data[key] = data[key];
            }
        }
        this.markDirty();
    };

    CSSWindow.prototype.setRenderer = function(renderFunction) {
        if (this._isDestroyed) return;
        this.config.renderFunction = renderFunction || null;
        this.markDirty();
    };

    CSSWindow.prototype.markDirty = function() {
        if (this._isDestroyed) return;
        this.config.dirty = true;
    };

    CSSWindow.prototype.render = function() {
        if (this._isDestroyed || !this.config.renderFunction) return;
        try {
            var result = this.config.renderFunction.call(this, this.config.data, this);
            if (result instanceof HTMLElement) {
                this.element.innerHTML = '';
                this.element.appendChild(result);
            } else if (result !== undefined && result !== null) {
                this.setContent(String(result));
            }
            this.config.dirty = false;
        } catch (e) {
            CSSWindowSystem.log('Erreur dans renderFunction: ' + e.message, 'error');
        }
    };

    CSSWindow.prototype.setPosition = function(x, y) {
        if (this._isDestroyed) return;
        this.config.x = x;
        this.config.y = y;
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
    };

    CSSWindow.prototype.setSize = function(width, height) {
        if (this._isDestroyed) return;
        this.config.width = width;
        this.config.height = height;
        this.element.style.width = width + 'px';
        this.element.style.height = height + 'px';
    };

    CSSWindow.prototype.addClass = function(className) {
        if (this._isDestroyed) return;
        this.element.classList.add(className);
    };

    CSSWindow.prototype.removeClass = function(className) {
        if (this._isDestroyed) return;
        this.element.classList.remove(className);
    };

    CSSWindow.prototype.toggleClass = function(className) {
        if (this._isDestroyed) return;
        this.element.classList.toggle(className);
    };

    CSSWindow.prototype.setStyle = function(property, value) {
        if (this._isDestroyed) return;
        this.element.style[property] = value;
        this.config.styles[property] = value;
    };

    CSSWindow.prototype.update = function() {
        if (this._isDestroyed) return;

        var frame = (typeof Graphics !== 'undefined' && Graphics.frameCount !== undefined) ? Graphics.frameCount : Date.now();
        if (this._lastUpdateFrame === frame) return;
        this._lastUpdateFrame = frame;

        if (this.config.dirty && this.config.renderFunction) {
            this.render();
        }

        if (this.config.autoUpdate && this.config.updateFunction) {
            try {
                this.config.updateFunction.call(this, this);
            } catch (e) {
                CSSWindowSystem.log('Erreur dans updateFunction: ' + e.message, 'error');
            }
        }
    };

    CSSWindow.prototype.destroy = function() {
        if (this._isDestroyed) return;

        if (this.config.onDestroyed) {
            try {
                this.config.onDestroyed.call(this, this);
            } catch (e) {
                CSSWindowSystem.log('Erreur dans onDestroyed: ' + e.message, 'error');
            }
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this._isDestroyed = true;
        this.element = null;
    };

    // =========================================================================
    // EXTENSIONS V2: HELPERS, THEMES, SCOPES, FOCUS, COMPOSANTS, DEBUG
    // =========================================================================
    CSSWindowSystem.Utils = {
        _escapeMap: {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        },

        escapeHtml: function(value) {
            if (value === null || value === undefined) return '';
            return String(value).replace(/[&<>"']/g, function(character) {
                return CSSWindowSystem.Utils._escapeMap[character];
            });
        },

        escapeAttr: function(value) {
            return this.escapeHtml(value);
        },

        clamp: function(value, min, max) {
            value = Number(value) || 0;
            return Math.max(min, Math.min(max, value));
        },

        uid: function(prefix) {
            CSSWindowSystem._windowCounter++;
            return (prefix || 'l3-ui') + '-' + CSSWindowSystem._windowCounter;
        },

        cx: function() {
            var classes = [];
            for (var i = 0; i < arguments.length; i++) {
                var value = arguments[i];
                if (!value) continue;
                if (typeof value === 'string') {
                    classes.push(value);
                } else if (Array.isArray(value)) {
                    classes.push(this.cx.apply(this, value));
                } else if (typeof value === 'object') {
                    for (var key in value) {
                        if (value[key]) classes.push(key);
                    }
                }
            }
            return classes.join(' ').replace(/\s+/g, ' ').trim();
        },

        attrs: function(attributes) {
            var html = '';
            attributes = attributes || {};
            for (var key in attributes) {
                var value = attributes[key];
                if (value === false || value === null || value === undefined) continue;
                if (value === true) {
                    html += ' ' + key;
                } else {
                    html += ' ' + key + '="' + this.escapeAttr(value) + '"';
                }
            }
            return html;
        },

        h: function(tag, attributes, children) {
            tag = tag || 'div';
            attributes = attributes || {};
            if (children === undefined || children === null) children = '';
            if (Array.isArray(children)) children = children.join('');
            return '<' + tag + this.attrs(attributes) + '>' + children + '</' + tag + '>';
        },

        text: function(value) {
            return this.escapeHtml(value);
        }
    };

    CSSWindowSystem.ThemeManager = {
        _themes: {
            default: {
                '--l3-bg': '#121826',
                '--l3-panel': '#1c2433',
                '--l3-panel-2': '#263247',
                '--l3-text': '#f7f7fb',
                '--l3-muted': '#9ca8bd',
                '--l3-accent': '#e94560',
                '--l3-border': '#31405a',
                '--l3-success': '#39c980',
                '--l3-warning': '#f7b955',
                '--l3-danger': '#ff5c78',
                '--l3-radius': '6px',
                '--l3-gap': '12px',
                '--l3-font': 'GameFont, Arial, sans-serif'
            }
        },
        _active: 'default',

        define: function(name, tokens) {
            if (!name || !tokens) return false;
            this._themes[name] = tokens;
            return true;
        },

        apply: function(name, target) {
            name = name || 'default';
            var tokens = this._themes[name] || this._themes.default;
            var root = target || document.documentElement;
            for (var key in tokens) {
                root.style.setProperty(key, tokens[key]);
            }
            this._active = name;
            CSSWindowSystem._triggerEvent('themeChanged', { name: name, tokens: tokens });
            return tokens;
        },

        get: function(name) {
            return this._themes[name || this._active] || this._themes.default;
        }
    };

    CSSWindowSystem.ScopeManager = {
        _scopes: {},
        _currentId: null,
        _counter: 0,

        create: function(scene, name) {
            var id = 'scope-' + (++this._counter);
            this._scopes[id] = {
                id: id,
                name: name || (scene && scene.constructor ? scene.constructor.name : 'Scene'),
                scene: scene || null,
                windows: {},
                timers: [],
                listeners: []
            };
            this._currentId = id;
            return this._scopes[id];
        },

        current: function() {
            return this._scopes[this._currentId] || null;
        },

        get: function(id) {
            return this._scopes[id] || null;
        },

        addWindow: function(scopeId, windowId) {
            var scope = this.get(scopeId);
            if (scope) scope.windows[windowId] = true;
        },

        setTimeout: function(scopeId, callback, delay) {
            var scope = this.get(scopeId);
            var timerId = setTimeout(callback, delay);
            if (scope) scope.timers.push(timerId);
            return timerId;
        },

        addListener: function(scopeId, target, eventName, handler, options) {
            var scope = this.get(scopeId);
            if (!target || !target.addEventListener) return false;
            target.addEventListener(eventName, handler, options);
            if (scope) {
                scope.listeners.push({
                    target: target,
                    eventName: eventName,
                    handler: handler,
                    options: options
                });
            }
            return true;
        },

        destroy: function(scopeId) {
            var scope = this.get(scopeId);
            if (!scope) return;

            for (var timerIndex = 0; timerIndex < scope.timers.length; timerIndex++) {
                clearTimeout(scope.timers[timerIndex]);
            }

            for (var listenerIndex = 0; listenerIndex < scope.listeners.length; listenerIndex++) {
                var listener = scope.listeners[listenerIndex];
                if (listener.target && listener.target.removeEventListener) {
                    listener.target.removeEventListener(listener.eventName, listener.handler, listener.options);
                }
            }

            for (var windowId in scope.windows) {
                var window = CSSWindowSystem.getWindow(windowId);
                if (window && !window.config.persistent) {
                    CSSWindowSystem.removeWindow(windowId);
                }
            }

            delete this._scopes[scopeId];
            if (this._currentId === scopeId) this._currentId = null;
        }
    };

    CSSWindowSystem.FocusManager = {
        _groups: {},
        _activeGroupId: null,
        _initialized: false,
        _lastFrame: -1,

        initialize: function() {
            if (this._initialized) return;
            this._initialized = true;
        },

        registerGroup: function(id, config) {
            if (!id) return null;
            config = config || {};
            this._groups[id] = {
                id: id,
                windowId: config.windowId || null,
                root: config.root || null,
                itemSelector: config.itemSelector || '[data-focus-item]',
                selectedClass: config.selectedClass || 'selected',
                disabledClass: config.disabledClass || 'disabled',
                index: Number(config.index || 0),
                columns: Number(config.columns || 1),
                wrap: config.wrap !== false,
                enabled: config.enabled !== false,
                onChange: config.onChange || null,
                onOk: config.onOk || null,
                onCancel: config.onCancel || null
            };
            this.sync(id);
            return this._groups[id];
        },

        unregisterGroup: function(id) {
            if (this._activeGroupId === id) this._activeGroupId = null;
            delete this._groups[id];
        },

        activate: function(id) {
            if (!this._groups[id]) return false;
            this._activeGroupId = id;
            this.sync(id);
            return true;
        },

        deactivate: function(id) {
            if (!id || this._activeGroupId === id) {
                this._activeGroupId = null;
            }
        },

        active: function() {
            return this._groups[this._activeGroupId] || null;
        },

        _rootFor: function(group) {
            if (group.root) return group.root;
            if (group.windowId) {
                var window = CSSWindowSystem.getWindow(group.windowId);
                return window ? window.element : null;
            }
            return null;
        },

        _itemsFor: function(group) {
            var root = this._rootFor(group);
            if (!root) return [];
            var nodes = root.querySelectorAll(group.itemSelector);
            var items = [];
            for (var i = 0; i < nodes.length; i++) {
                items.push(nodes[i]);
            }
            return items;
        },

        setIndex: function(id, index, silent) {
            var group = this._groups[id];
            if (!group) return;
            var items = this._itemsFor(group);
            if (!items.length) {
                group.index = 0;
                return;
            }
            group.index = CSSWindowSystem.Utils.clamp(index, 0, items.length - 1);
            this.sync(id);
            if (!silent && group.onChange) {
                group.onChange(group.index, items[group.index], group);
            }
        },

        move: function(delta) {
            var group = this.active();
            if (!group || !group.enabled) return false;
            var items = this._itemsFor(group);
            if (!items.length) return false;

            var next = group.index + delta;
            if (group.wrap) {
                next = (next + items.length) % items.length;
            } else {
                next = CSSWindowSystem.Utils.clamp(next, 0, items.length - 1);
            }

            this.setIndex(group.id, next);
            if (typeof SoundManager !== 'undefined' && SoundManager.playCursor) {
                SoundManager.playCursor();
            }
            return true;
        },

        sync: function(id) {
            var group = this._groups[id];
            if (!group) return;
            var items = this._itemsFor(group);
            for (var i = 0; i < items.length; i++) {
                if (i === group.index) {
                    items[i].classList.add(group.selectedClass);
                    items[i].setAttribute('aria-selected', 'true');
                } else {
                    items[i].classList.remove(group.selectedClass);
                    items[i].removeAttribute('aria-selected');
                }
            }
        },

        update: function() {
            var group = this.active();
            if (!group || !group.enabled || typeof Input === 'undefined') return;
            var frame = (typeof Graphics !== 'undefined' && Graphics.frameCount !== undefined) ? Graphics.frameCount : Date.now();
            if (this._lastFrame === frame) return;
            this._lastFrame = frame;

            if (Input.isTriggered('down') || Input.isRepeated('down')) this.move(group.columns);
            if (Input.isTriggered('up') || Input.isRepeated('up')) this.move(-group.columns);
            if (Input.isTriggered('right') || Input.isRepeated('right')) this.move(1);
            if (Input.isTriggered('left') || Input.isRepeated('left')) this.move(-1);
            if (Input.isTriggered('ok') || Input.isTriggered('space') || Input.isTriggered('enter')) {
                if (group.onOk) {
                    var okItems = this._itemsFor(group);
                    group.onOk(group.index, okItems[group.index], group);
                }
            }
            if (Input.isTriggered('cancel') || Input.isTriggered('escape') || Input.isTriggered('touchCancel')) {
                if (group.onCancel) group.onCancel(group);
            }
        }
    };

    CSSWindowSystem.Components = {
        button: function(label, options) {
            options = options || {};
            var u = CSSWindowSystem.Utils;
            return u.h('button', {
                class: u.cx('l3-ui-button', options.className),
                type: 'button',
                'data-action': options.action || '',
                disabled: options.disabled || false
            }, u.text(label));
        },

        gauge: function(label, current, max, options) {
            options = options || {};
            var u = CSSWindowSystem.Utils;
            var percent = max > 0 ? u.clamp((current / max) * 100, 0, 100) : 0;
            return '<div class="' + u.cx('l3-ui-gauge', options.className) + '">' +
                '<div class="l3-ui-gauge-label"><span>' + u.text(label) + '</span><span>' + u.text(current) + ' / ' + u.text(max) + '</span></div>' +
                '<div class="l3-ui-gauge-track"><div class="l3-ui-gauge-fill" style="width:' + percent + '%;background:' + u.escapeAttr(options.color || 'var(--l3-accent)') + ';"></div></div>' +
                '</div>';
        },

        list: function(items, options) {
            options = options || {};
            var u = CSSWindowSystem.Utils;
            var html = '<div class="' + u.cx('l3-ui-list', options.className) + '">';
            items = items || [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i] || {};
                html += '<div class="' + u.cx('l3-ui-list-item', item.className, { selected: item.selected, disabled: item.disabled }) + '" data-focus-item data-index="' + i + '">' +
                    (item.icon ? '<span class="l3-ui-list-icon">' + u.text(item.icon) + '</span>' : '') +
                    '<span class="l3-ui-list-label">' + u.text(item.label || item.name || '') + '</span>' +
                    '</div>';
            }
            html += '</div>';
            return html;
        },

        tabs: function(tabs, selectedIndex, options) {
            options = options || {};
            var u = CSSWindowSystem.Utils;
            var html = '<div class="' + u.cx('l3-ui-tabs', options.className) + '">';
            tabs = tabs || [];
            for (var i = 0; i < tabs.length; i++) {
                var tab = tabs[i] || {};
                html += '<button type="button" class="' + u.cx('l3-ui-tab', { selected: i === selectedIndex }) + '" data-index="' + i + '">' + u.text(tab.label || tab.name || '') + '</button>';
            }
            html += '</div>';
            return html;
        },

        modal: function(title, body, actions, options) {
            options = options || {};
            var u = CSSWindowSystem.Utils;
            var actionHtml = '';
            actions = actions || [];
            for (var i = 0; i < actions.length; i++) {
                actionHtml += this.button(actions[i].label, actions[i]);
            }
            return '<div class="' + u.cx('l3-ui-modal', options.className) + '">' +
                '<div class="l3-ui-modal-header">' + u.text(title) + '</div>' +
                '<div class="l3-ui-modal-body">' + (options.rawBody ? body : u.text(body)) + '</div>' +
                '<div class="l3-ui-modal-actions">' + actionHtml + '</div>' +
                '</div>';
        }
    };

    CSSWindowSystem.DevOverlay = {
        _element: null,
        _visible: false,
        _initialized: false,

        initialize: function() {
            if (this._initialized) return;
            this._initialized = true;
            this._visible = !!CSSWindowSystem.enableDevOverlay;
            this._create();

            var self = this;
            window.addEventListener('keydown', function(event) {
                if (event.keyCode === 121 && (CSSWindowSystem.debug || CSSWindowSystem.enableDevOverlay)) {
                    self.toggle();
                    event.preventDefault();
                }
            });
        },

        _create: function() {
            if (this._element || !CSSWindowSystem._container) return;
            this._element = document.createElement('div');
            this._element.id = 'l3-ui-dev-overlay';
            this._element.style.cssText = [
                'position: fixed',
                'right: 12px',
                'top: 12px',
                'min-width: 260px',
                'max-width: 420px',
                'max-height: 70vh',
                'overflow: auto',
                'padding: 10px',
                'background: rgba(0,0,0,0.82)',
                'border: 1px solid rgba(255,255,255,0.22)',
                'color: #fff',
                'font: 12px/1.45 monospace',
                'z-index: 99999',
                'pointer-events: auto',
                'display: none'
            ].join('; ');
            document.body.appendChild(this._element);
        },

        show: function() {
            this._visible = true;
            if (this._element) this._element.style.display = 'block';
            this.update(true);
        },

        hide: function() {
            this._visible = false;
            if (this._element) this._element.style.display = 'none';
        },

        toggle: function() {
            if (this._visible) this.hide();
            else this.show();
        },

        update: function(force) {
            if (!this._visible || !this._element) return;
            var frame = (typeof Graphics !== 'undefined' && Graphics.frameCount !== undefined) ? Graphics.frameCount : Date.now();
            if (!force && frame % 15 !== 0) return;

            var html = '<div><strong>L3 CSSWindowSystem v2</strong></div>';
            html += '<div>Windows: ' + Object.keys(CSSWindowSystem._windows).length + '</div>';
            html += '<div>Focus: ' + (CSSWindowSystem.FocusManager._activeGroupId || '-') + '</div>';
            html += '<div>Theme: ' + CSSWindowSystem.ThemeManager._active + '</div>';
            html += '<hr style="border-color:rgba(255,255,255,0.18)">';
            for (var id in CSSWindowSystem._windows) {
                var window = CSSWindowSystem._windows[id];
                if (!window) continue;
                html += '<div>' + CSSWindowSystem.Utils.escapeHtml(id) + ' | ' +
                    CSSWindowSystem.Utils.escapeHtml(window.config.layer) + ' | z:' +
                    CSSWindowSystem.Utils.escapeHtml(window.config.zIndex) + '</div>';
            }
            this._element.innerHTML = html;
        }
    };

    // =========================================================================
    // INTÉGRATION AVEC SCENE_MANAGER
    // =========================================================================
    var _SceneManager_initialize = SceneManager.initialize;
    SceneManager.initialize = function() {
        _SceneManager_initialize.call(this);
        console.log('%c[CSSWindowSystem] Initialisation du système...', 'color: #00aaff; font-weight: bold');
        CSSWindowSystem.initialize();
    };

    var _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        setTimeout(function() {
            if (CSSWindowSystem.DataRegistry) {
                CSSWindowSystem.DataRegistry.refresh();
            }
        }, 100);
    };

    var _DataManager_loadMapData = DataManager.loadMapData;
    DataManager.loadMapData = function(mapId) {
        _DataManager_loadMapData.call(this, mapId);
        setTimeout(function() {
            if (CSSWindowSystem.DataRegistry) {
                CSSWindowSystem.DataRegistry.refresh();
            }
        }, 100);
    };

    var _SceneManager_changeScene = SceneManager.changeScene;
    SceneManager.changeScene = function() {
        // Ne pas nettoyer lors du changement vers Scene_Menu
        if (!this._nextScene || this._nextScene.constructor !== Scene_Menu) {
            CSSWindowSystem.cleanup();
        }
        _SceneManager_changeScene.call(this);
    };

    // =========================================================================
    // EXTENSION DE SCENE_BASE
    // =========================================================================
    var _Scene_Base_create = Scene_Base.prototype.create;
    Scene_Base.prototype.create = function() {
        _Scene_Base_create.call(this);
        if (!this._cssScopeId && CSSWindowSystem && CSSWindowSystem.ScopeManager) {
            var scope = CSSWindowSystem.ScopeManager.create(this, this.constructor ? this.constructor.name : 'Scene');
            this._cssScopeId = scope.id;
        }
    };

    var _Scene_Base_terminate = Scene_Base.prototype.terminate;
    Scene_Base.prototype.terminate = function() {
        if (this._cssScopeId && CSSWindowSystem && CSSWindowSystem.ScopeManager) {
            CSSWindowSystem.ScopeManager.destroy(this._cssScopeId);
            this._cssScopeId = null;
        }
        _Scene_Base_terminate.call(this);
    };

    Scene_Base.prototype.createCSSWindow = function(id, config) {
        config = config || {};
        if (!config.scopeId && this._cssScopeId) {
            config.scopeId = this._cssScopeId;
        }
        var window = CSSWindowSystem.createWindow(id, config);
        if (window && config.scopeId) {
            CSSWindowSystem.ScopeManager.addWindow(config.scopeId, id);
        }
        return window;
    };

    Scene_Base.prototype.getCSSWindow = function(id) {
        return CSSWindowSystem.getWindow(id);
    };

    Scene_Base.prototype.removeCSSWindow = function(id) {
        return CSSWindowSystem.removeWindow(id);
    };

    Scene_Base.prototype.setCSSTimeout = function(callback, delay) {
        if (!this._cssScopeId) return setTimeout(callback, delay);
        return CSSWindowSystem.ScopeManager.setTimeout(this._cssScopeId, callback, delay);
    };

    Scene_Base.prototype.addCSSListener = function(target, eventName, handler, options) {
        if (!this._cssScopeId) {
            target.addEventListener(eventName, handler, options);
            return true;
        }
        return CSSWindowSystem.ScopeManager.addListener(this._cssScopeId, target, eventName, handler, options);
    };

    // =========================================================================
    // EXPOSITION GLOBALE
    // =========================================================================
    window.CSSWindowSystem = CSSWindowSystem;
    
    // Exposer la classe CSSWindow pour l'extension
    window.CSSWindow = CSSWindow;

    CSSWindowSystem.log('Plugin chargé et prêt', 'info');

})();

