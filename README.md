# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.9`

## Derniere mise a jour

- Le script Cloudflare n'abandonne plus si le DNS met du temps a propager le nouveau lien.
- Le lien est ecrit des sa generation, puis verifie en arriere-plan.
- Le jeu retente automatiquement la connexion au tunnel Cloudflare pendant son activation.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
