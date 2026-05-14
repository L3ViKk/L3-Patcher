# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.10`

## Derniere mise a jour

- Le serveur distant direct ecrit maintenant automatiquement le lien a partager.
- Heberger une partie utilise le serveur local direct au lieu de relancer Cloudflare quand un lien direct est disponible.
- Le lien affiche en jeu correspond au port 7777 ouvert sur la box.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
