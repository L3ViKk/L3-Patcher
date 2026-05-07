# L3 Patcher

Depot de patchs pour Project1.

Le jeu lit ersion.json, puis telecharge les fichiers declares depuis patches/<version>/.

## URL du manifest

`	ext
https://raw.githubusercontent.com/L3ViKk/L3-Patcher/main/version.json
`

## Version actuelle

$version

## Utilisation

1. Active L3_UpdateManager dans RPG Maker MV.
2. Mets l'URL du manifest dans le parametre Manifest URL.
3. Compile une premiere build avec l'updater actif.
4. Pour les versions suivantes, incremente ersion.json, ajoute les fichiers dans patches/<nouvelle-version>/, puis publie sur GitHub.

Le premier build avec l'updater reste necessaire. Ensuite les joueurs recuperent les prochains patchs automatiquement au lancement du jeu.
