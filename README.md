# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.13`

## Derniere mise a jour

- Le joueur est maintenant deconnecte automatiquement quand il revient a l'ecran titre.
- Le slot reseau est libere cote serveur apres un retour titre.
- Les joueurs distants sont nettoyes localement a la sortie de session.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
