# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.5`

## Derniere mise a jour

- Synchronisation reseau V3 avec paquets de mouvement immediats.
- Deplacements distants par file de tuiles pour mieux respecter RPG Maker MV.
- Ping et qualite reseau visibles dans le HUD et le menu En ligne.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
