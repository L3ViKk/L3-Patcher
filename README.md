# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.8`

## Derniere mise a jour

- Le jeu ne reutilise plus les anciens liens temporaires `trycloudflare` ou `loca.lt` stockes.
- Le script Cloudflare attend que le DNS et le serveur soient vraiment joignables avant d'ecrire le lien.
- Correction du cas ou l'interface affichait un ancien lien different de celui de PowerShell.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
