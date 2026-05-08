# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.6`

## Derniere mise a jour

- Reduction forte du trafic reseau en mode tunnel.
- `playerMove` reste immediat, mais `playerState` est moins frequent.
- Meilleure chance de tenir 3-4 joueurs via localtunnel.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
