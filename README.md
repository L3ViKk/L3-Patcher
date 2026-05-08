# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.4`

## Derniere mise a jour

- Correction de l'updater dans les builds RPG Maker MV anciens.
- Creation des dossiers de backup compatible avec l'ancien NW.js.
- Conserve les ameliorations reseau du patch 1.0.3.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
