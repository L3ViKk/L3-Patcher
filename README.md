# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.12`

## Derniere mise a jour

- Correction de la liste des parties disponibles depuis l'ecran titre.
- Le serveur accepte maintenant `/rooms` avec les parametres de cache du client.
- La synchronisation joueur ne tente plus de lire la map avant le lancement de la partie.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
