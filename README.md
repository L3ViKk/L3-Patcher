# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.14`

## Derniere mise a jour

- Patch complet du lobby titre multijoueur pour les builds qui ont saute une version.
- Le bouton Multijoueur est injecte correctement dans l'ecran titre.
- Le serveur de lobby et le NetCore sont remis au meme niveau.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
