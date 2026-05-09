# L3 Net Server

Petit serveur WebSocket pour les sessions multijoueur de Project1.

Il fonctionne en local, sur le meme reseau, ou a distance via tunnel public sans toucher a la box.

## Demarrer

```bash
npm run net:start
```

Le serveur ecoute par defaut sur le port `7777`.

Au demarrage, il affiche plusieurs adresses :

```text
Local:  ws://127.0.0.1:7777?room=LOCAL
LAN:    ws://192.168.1.42:7777?room=LOCAL
Remote: ws://VOTRE-IP-PUBLIQUE:7777?room=LOCAL
```

## Jouer sur le meme reseau

Les autres joueurs utilisent l'adresse `LAN`.

Exemple :

```text
ws://192.168.1.42:7777
```

Le code session est choisi dans le menu `En ligne` du jeu.

## Jouer a distance, methode simple

Lance :

```bash
npm run net:online
```

Le script demarre le serveur local, ouvre un tunnel Cloudflare, puis affiche une adresse de ce genre :

```text
wss://petit-nom.trycloudflare.com?room=LOCAL
```

Au premier lancement, le script peut telecharger `cloudflared` dans `L3NetServer/bin`.

Dans le jeu, va dans `En ligne` puis utilise :

```text
Connexion tunnel
```

Les autres joueurs doivent mettre la meme adresse distante dans leur menu `En ligne` ou utiliser l'adresse que tu leur envoies.

Garde la fenetre `npm run net:online` ouverte pendant toute la partie.

Si Cloudflare vient juste de creer le lien, le DNS peut prendre quelques secondes avant de repondre.
Le jeu retente automatiquement la connexion pendant ce delai.

Si tu veux revenir a l'ancien tunnel localtunnel :

```bash
npm run net:online:localtunnel
```

## Jouer a distance, methode directe

Deux options :

1. L'hote lance le serveur sur son PC et ouvre le port `7777` sur sa box/pare-feu.
2. Le serveur est deploye sur une machine distante/VPS, puis tous les joueurs utilisent son adresse.

Exemple :

```text
ws://82.120.10.44:7777
```

ou avec un domaine :

```text
wss://mon-serveur.example.com
```

Chaque groupe de joueurs doit utiliser le meme code session. Le serveur isole les joueurs par room.

## Options

```bash
node L3NetServer/server.js --port 7777 --host 0.0.0.0 --room LOCAL --max-players 4 --state-interval 50
```

Pour afficher une adresse publique dans les logs :

```bash
node L3NetServer/server.js --public-url ws://82.120.10.44:7777
```

## Diagnostic

Quand le serveur est lance :

```bash
npm run net:check
```

Si ce test echoue, le jeu echouera aussi. Si le tunnel est lance, l'adresse publique est aussi ecrite ici :

```text
L3NetServer/remote-url.json
```

Variables d'environnement utiles :

```text
PORT
L3_NET_PORT
L3_NET_HOST
L3_NET_ROOM
L3_NET_MAX_PLAYERS
L3_NET_STATE_INTERVAL
L3_NET_PUBLIC_URL
```

Le serveur ne contient pas de logique RPG Maker lourde. Il coordonne les connexions, les rooms, les joueurs et les messages temps reel. Le jeu reste responsable de son gameplay.

Depuis la V3 de la synchronisation, le jeu envoie deux types de paquets :

- `playerMove`, envoye immediatement quand un joueur change de tuile ou de direction ;
- `playerState`, envoye regulierement pour corriger la position, le sprite et les infos joueur.

Cette separation garde les deplacements plus naturels sur RPG Maker MV, surtout avec un tunnel public qui ajoute de la latence.
