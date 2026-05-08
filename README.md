# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.7`

## Derniere mise a jour

- Le mode en ligne utilise maintenant Cloudflare Quick Tunnel par defaut.
- L'ancien tunnel localtunnel reste disponible avec `npm run net:online:localtunnel`.
- Le bouton heberger du jeu privilegie un tunnel Cloudflare propre pour les sessions 3-4 joueurs.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
