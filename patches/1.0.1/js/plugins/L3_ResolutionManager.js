/*:
 * @plugindesc L3 Resolution Manager v1.1 - Gestion de la résolution et suppression des bandes noires
 * @author L3ViKk
 * @version 1.0.0
 *
 * @param Screen Width
 * @desc Largeur de l'écran de jeu (par défaut: 816)
 * @type number
 * @min 640
 * @max 1920
 * @default 816
 *
 * @param Screen Height
 * @desc Hauteur de l'écran de jeu (par défaut: 624)
 * @type number
 * @min 480
 * @max 1080
 * @default 624
 *
 * @param Remove Black Bars
 * @desc Retirer les bandes noires et utiliser toute la fenêtre
 * @type boolean
 * @default true
 *
 * @param Stretch Mode
 * @desc Mode d'étirement: 'stretch' (étirer), 'fit' (adapter), 'fill' (remplir)
 * @type select
 * @option stretch
 * @option fit
 * @option fill
 * @default stretch
 *
 * @param Scale Battlebacks
 * @desc Agrandir les fonds de combat pour eviter la repetition en haute resolution
 * @type boolean
 * @default true
 *
 * @help
 * ============================================================================
 * L3 Resolution Manager v1.1
 * ============================================================================
 *
 * Ce plugin permet de :
 * - Augmenter la résolution du jeu
 * - Retirer les bandes noires
 * - Configurer le mode d'affichage
 * - Adapter les fonds de combat a la resolution
 *
 * UTILISATION :
 * =============
 *
 * Configurez la largeur et la hauteur souhaitées dans les paramètres du plugin.
 * Activez "Remove Black Bars" pour utiliser toute la fenêtre.
 *
 * ============================================================================
 */

(function() {
    'use strict';

    // =========================================================================
    // PARAMÈTRES
    // =========================================================================
    var parameters = PluginManager.parameters('L3_ResolutionManager');
    var screenWidth = Number(parameters['Screen Width'] || 816);
    var screenHeight = Number(parameters['Screen Height'] || 624);
    var removeBlackBars = String(parameters['Remove Black Bars'] || 'true') === 'true';
    var stretchMode = String(parameters['Stretch Mode'] || 'stretch');
    var scaleBattlebacks = String(parameters['Scale Battlebacks'] || 'true') === 'true';

    // =========================================================================
    // LOGGING
    // =========================================================================
    var log = function(message) {
        console.log('%c[L3_ResolutionManager] ' + message, 'color: #00aaff; font-weight: bold');
    };

    log('Plugin chargé !');
    log('Résolution configurée: ' + screenWidth + 'x' + screenHeight);
    log('Retirer bandes noires: ' + removeBlackBars);
    log('Mode étirement: ' + stretchMode);
    log('Adapter fonds de combat: ' + scaleBattlebacks);

    // =========================================================================
    // MODIFICATION DE SceneManager
    // =========================================================================
    var _SceneManager_initGraphics = SceneManager.initGraphics;
    SceneManager.initGraphics = function() {
        this._screenWidth = screenWidth;
        this._screenHeight = screenHeight;
        this._boxWidth = screenWidth;
        this._boxHeight = screenHeight;

        _SceneManager_initGraphics.call(this);

        Graphics._width = screenWidth;
        Graphics._height = screenHeight;
        Graphics._boxWidth = screenWidth;
        Graphics._boxHeight = screenHeight;

        log('Résolution appliquée: ' + screenWidth + 'x' + screenHeight);
    };

    // =========================================================================
    // SUPPRESSION DES BANDES NOIRES
    // =========================================================================
    if (removeBlackBars) {
        var _Graphics__updateRealScale = Graphics._updateRealScale;
        Graphics._updateRealScale = function() {
            _Graphics__updateRealScale.call(this);
            
            if (stretchMode === 'stretch') {
                this._stretchEnabled = true;
            } else if (stretchMode === 'fit') {
                this._stretchEnabled = false;
            } else if (stretchMode === 'fill') {
                this._stretchEnabled = true;
            }
        };

        var resizeGame = function() {
            if (removeBlackBars) {
                var windowWidth = window.innerWidth || document.documentElement.clientWidth;
                var windowHeight = window.innerHeight || document.documentElement.clientHeight;
                
                Graphics._width = windowWidth;
                Graphics._height = windowHeight;
                Graphics._boxWidth = windowWidth;
                Graphics._boxHeight = windowHeight;
                
                if (Graphics._canvas) {
                    Graphics._canvas.width = Graphics._width;
                    Graphics._canvas.height = Graphics._height;
                    Graphics._canvas.style.width = windowWidth + 'px';
                    Graphics._canvas.style.height = windowHeight + 'px';
                    Graphics._canvas.style.position = 'absolute';
                    Graphics._canvas.style.top = '0';
                    Graphics._canvas.style.left = '0';
                    Graphics._canvas.style.margin = '0';
                    Graphics._canvas.style.padding = '0';
                }
                
                if (Graphics._renderer && Graphics._renderer.resize) {
                    Graphics._renderer.resize(Graphics._width, Graphics._height);
                }
                
                if (Graphics._upperCanvas) {
                    Graphics._upperCanvas.width = Graphics._width;
                    Graphics._upperCanvas.height = Graphics._height;
                    Graphics._upperCanvas.style.width = windowWidth + 'px';
                    Graphics._upperCanvas.style.height = windowHeight + 'px';
                }
                
                if (Graphics._updateAllElements) {
                    Graphics._updateAllElements();
                }
                
                log('Jeu redimensionné: ' + Graphics._width + 'x' + Graphics._height + ' (fenêtre: ' + windowWidth + 'x' + windowHeight + ')');
            }
        };

        var _SceneManager_onWindowResize = SceneManager._onWindowResize;
        SceneManager._onWindowResize = function() {
            if (removeBlackBars) {
                resizeGame();
            } else {
                if (_SceneManager_onWindowResize) {
                    _SceneManager_onWindowResize.call(this);
                }
            }
        };

        window.addEventListener('resize', function() {
            if (removeBlackBars) {
                resizeGame();
            } else if (SceneManager._onWindowResize) {
                SceneManager._onWindowResize();
            }
        });

        log('Mode suppression des bandes noires activé');
    }

    // =========================================================================
    // MODIFICATION DU CANVAS POUR REMPLIR TOUTE LA FENÊTRE
    // =========================================================================
    if (removeBlackBars) {
        var style = document.createElement('style');
        style.id = 'l3-resolution-manager-style';
        style.textContent = `
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
            }
            #GameCanvas, #GameUpperCanvas {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                right: auto !important;
                bottom: auto !important;
            }
        `;
        document.head.appendChild(style);
        
        var _Graphics__centerElement = Graphics._centerElement;
        Graphics._centerElement = function(element) {
            if (removeBlackBars && (element === this._canvas || element === this._upperCanvas)) {
                return;
            }
            if (_Graphics__centerElement) {
                _Graphics__centerElement.call(this, element);
            }
        };
        
        var _Graphics__updateCanvas = Graphics._updateCanvas;
        Graphics._updateCanvas = function() {
            if (removeBlackBars) {
                var windowWidth = window.innerWidth || document.documentElement.clientWidth;
                var windowHeight = window.innerHeight || document.documentElement.clientHeight;
                
                this._width = windowWidth;
                this._height = windowHeight;
                this._boxWidth = windowWidth;
                this._boxHeight = windowHeight;
                
                this._canvas.width = windowWidth;
                this._canvas.height = windowHeight;
                this._canvas.style.width = windowWidth + 'px';
                this._canvas.style.height = windowHeight + 'px';
                this._canvas.style.position = 'absolute';
                this._canvas.style.top = '0';
                this._canvas.style.left = '0';
                this._canvas.style.margin = '0';
                this._canvas.style.padding = '0';
                this._canvas.style.zIndex = '1';
            } else {
                _Graphics__updateCanvas.call(this);
            }
        };
        
        var _Graphics__updateUpperCanvas = Graphics._updateUpperCanvas;
        Graphics._updateUpperCanvas = function() {
            if (removeBlackBars) {
                var windowWidth = window.innerWidth || document.documentElement.clientWidth;
                var windowHeight = window.innerHeight || document.documentElement.clientHeight;
                
                this._upperCanvas.width = windowWidth;
                this._upperCanvas.height = windowHeight;
                this._upperCanvas.style.width = windowWidth + 'px';
                this._upperCanvas.style.height = windowHeight + 'px';
                this._upperCanvas.style.position = 'absolute';
                this._upperCanvas.style.top = '0';
                this._upperCanvas.style.left = '0';
                this._upperCanvas.style.margin = '0';
                this._upperCanvas.style.padding = '0';
                this._upperCanvas.style.zIndex = '2';
            } else {
                _Graphics__updateUpperCanvas.call(this);
            }
        };
        
        var _Graphics__createAllElements = Graphics._createAllElements;
        Graphics._createAllElements = function() {
            _Graphics__createAllElements.call(this);
            
            setTimeout(function() {
                if (Graphics._canvas) {
                    if (Graphics._container) {
                        Graphics._container.style.width = '100%';
                        Graphics._container.style.height = '100%';
                        Graphics._container.style.position = 'fixed';
                        Graphics._container.style.top = '0';
                        Graphics._container.style.left = '0';
                        Graphics._container.style.margin = '0';
                        Graphics._container.style.padding = '0';
                    }
                    
                    resizeGame();
                    
                    log('Canvas configuré pour remplir toute la fenêtre');
                }
            }, 100);
        };
    }

    // =========================================================================
    // ADAPTATION DES FONDS DE COMBAT
    // =========================================================================
    if (scaleBattlebacks && typeof Spriteset_Battle !== 'undefined') {
        Spriteset_Battle.prototype.l3FitBattlebacks = function() {
            this.l3FitBattlebackSprite(this._back1Sprite, true);
            this.l3FitBattlebackSprite(this._back2Sprite, false);
        };

        Spriteset_Battle.prototype.l3FitBattlebackSprite = function(sprite, bottomAlign) {
            if (!sprite || !sprite.bitmap) return;
            var bitmap = sprite.bitmap;
            if ((!bitmap.width || !bitmap.height) && bitmap.addLoadListener) {
                var self = this;
                bitmap.addLoadListener(function() {
                    self.l3FitBattlebackSprite(sprite, bottomAlign);
                });
                return;
            }
            if (!bitmap.width || !bitmap.height || !sprite.tileScale) return;

            var targetWidth = sprite._width || Graphics.width;
            var targetHeight = sprite._height || Graphics.height;
            var scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height) * 1.01;
            var drawnWidth = bitmap.width * scale;
            var drawnHeight = bitmap.height * scale;
            var extraWidth = Math.max(0, drawnWidth - targetWidth);
            var extraHeight = Math.max(0, drawnHeight - targetHeight);

            sprite.tileScale.x = scale;
            sprite.tileScale.y = scale;
            sprite.origin.x = Math.round(extraWidth / 2);
            sprite.origin.y = bottomAlign && $gameSystem.isSideView() ? Math.round(extraHeight) : Math.round(extraHeight / 2);
        };

        var _Spriteset_Battle_locateBattleback = Spriteset_Battle.prototype.locateBattleback;
        Spriteset_Battle.prototype.locateBattleback = function() {
            _Spriteset_Battle_locateBattleback.call(this);
            this.l3FitBattlebacks();
        };

        var _Spriteset_Battle_updateBattleback = Spriteset_Battle.prototype.updateBattleback;
        Spriteset_Battle.prototype.updateBattleback = function() {
            _Spriteset_Battle_updateBattleback.call(this);
            var width = this._battleField ? this._battleField.width : Graphics.width;
            var height = this._battleField ? this._battleField.height : Graphics.height;
            var signature = width + 'x' + height;
            if (this._l3BattlebackSize !== signature) {
                this._l3BattlebackSize = signature;
                this.l3FitBattlebacks();
            }
        };
    }

    // =========================================================================
    // INITIALISATION APRÈS LE CHARGEMENT
    // =========================================================================
    var _SceneManager_run = SceneManager.run;
    SceneManager.run = function(sceneClass) {
        _SceneManager_run.call(this, sceneClass);
        
        if (removeBlackBars) {
            setTimeout(function() {
                resizeGame();
                log('Redimensionnement forcé après démarrage');
            }, 100);
        }
    };

    log('Plugin initialisé avec succès !');

})();

