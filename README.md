# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit `version.json`, puis telecharge les fichiers declares depuis `patches/<version>/`.

## URL du manifest

```text
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
```

## Version actuelle

`1.0.11`

## Derniere mise a jour

- Ajout du lobby multijoueur directement depuis l'ecran titre.
- Le serveur annonce les parties ouvertes avec nom, hote, statut et slots disponibles.
- L'hote peut creer une salle d'attente et lancer la partie pour tous les joueurs.

Le premier build avec l'updater reste necessaire. Si un vieux build bloque sur la creation du backup, remplace une fois `www/js/plugins/L3_UpdateManager.js`, puis relance le jeu.
