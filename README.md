# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.3`

## Derniere mise a jour

- Rendu des joueurs distants plus fluide avec buffer adaptatif.
- Prediction courte des deplacements pour reduire les saccades visibles.
- Serveur reseau passe a 33 ms avec compression WebSocket desactivee.

Le premier build avec l'updater reste necessaire. Ensuite les joueurs recuperent les prochains patchs automatiquement au lancement du jeu.
