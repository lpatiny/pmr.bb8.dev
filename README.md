# pmr.bb8.dev

Application web très simple, en français, qui affiche **uniquement les trains
directs accessibles aux personnes à mobilité réduite (PMR) et aux vélos** entre
deux gares belges. Par défaut **Ostende → Bruges**, mais on peut choisir
n'importe quelle gare de départ et d'arrivée (parmi les ~700 gares SNCB) ainsi
qu'une date de voyage.

Ces trains correspondent aux trajets « verts » du planificateur officiel SNCB
[BikeOnTrain](https://bikeontrain.belgiantrain.be/) — c.-à-d. ceux dont le score
d'accessibilité est maximal (voiture PMR + emplacements vélo à bord).

Déployée sur **https://pmr.bb8.dev**.

## Architecture

- **backend/** — API Fastify (TypeScript, exécuté directement par Node 24).
  Elle interroge le point d'accès BikeOnTrain côté serveur, filtre les trains
  directs entièrement accessibles (`itineraryScore === 4`) et expose une réponse
  simplifiée. Un backend est nécessaire car le point d'accès SNCB n'autorise le
  CORS que pour des origines `localhost` : un navigateur sur un domaine déployé
  serait refusé.
- **frontend/** — interface React + Vite : sélection des gares de départ et
  d'arrivée, de la date (Aujourd'hui / Demain / date personnalisée) et de
  l'heure, puis une liste de trains à gros caractères, conçue pour une personne
  âgée. Des boutons « Plus tôt » / « Plus tard » étendent la liste.

Le backend sert également le frontend compilé via `@fastify/static` — un seul
processus Node, pas de nginx.

### Hors ligne (PWA)

Le frontend est une **application web progressive (PWA)** installable sur
l'écran d'accueil (iOS : _Partager → « Sur l'écran d'accueil »_ ; Android :
bouton « Installer »). Un _service worker_ met en cache l'application et les
horaires :

- au démarrage, à chaque retour de focus et au retour de la connexion, les
  trains des **deux sens**, pour **aujourd'hui et demain**, sont préchargés ;
- en ligne, les horaires sont toujours rafraîchis depuis le réseau
  (_network-first_) ; hors ligne, la dernière réponse en cache est affichée ;
- l'`index.html` et le _service worker_ sont servis en `no-cache`, et les
  fichiers `assets/*` (au nom empreinté) en `immutable` : une nouvelle version
  déployée est donc reprise automatiquement, sans cache figé.

### Points d'accès

| Méthode | Chemin             | Description                                     |
| ------- | ------------------ | ----------------------------------------------- |
| `GET`   | `/api/health`      | Vérification de l'état du service               |
| `GET`   | `/api/v1/stations` | Liste complète des gares (id, nom, coordonnées) |
| `GET`   | `/api/v1/trains`   | Trains accessibles (voir paramètres ci-dessous) |
| `GET`   | `/docs`            | Documentation Swagger de l'API                  |

Paramètres de `GET /api/v1/trains` :

| Paramètre | Requis | Description                                                   |
| --------- | ------ | ------------------------------------------------------------- |
| `from`    | oui    | Id de la gare de départ                                       |
| `to`      | oui    | Id de la gare d'arrivée                                       |
| `date`    | non    | Date de voyage `YYYY-MM-DD` (défaut : aujourd'hui)            |
| `hour`    | non    | Heure de départ `00`–`23` (défaut : maintenant / minuit)      |
| `after`   | non    | Trains partant après ce timestamp (ms) — bouton « plus tard » |
| `before`  | non    | Trains partant avant ce timestamp (ms) — bouton « plus tôt »  |

## Développement local

```sh
npm install        # installe tous les workspaces
npm run dev        # backend sur :3000 et frontend sur :5173
```

Ouvrir http://localhost:5173.

## Tests

```sh
npm test           # types + eslint + prettier + tests backend
```

## Déploiement (Docker)

Trois modes sont fournis. Choisir un fichier compose dans `.env` :

```sh
cp .env.example .env
# décommenter une ligne COMPOSE_FILE=… dans .env
docker compose up -d
```

- **`compose.cloudflared.yaml`** — Cloudflare Tunnel (recommandé pour
  `pmr.bb8.dev`) ; renseigner `TUNNEL_TOKEN` dans `.env`.
- **`compose.traefik.yaml`** — derrière un reverse proxy Traefik (réseau Docker
  externe `traefik`, hôte `pmr.bb8.dev`).
- **`compose.port.yaml`** — port publié directement sur l'hôte.

## Variables d'environnement

| Variable       | Description                                           | Défaut |
| -------------- | ----------------------------------------------------- | ------ |
| `PORT`         | Port d'écoute du service                              | `3000` |
| `TUNNEL_TOKEN` | Jeton Cloudflare Tunnel (mode cloudflared uniquement) | —      |

## Journal des modifications

Voir [CHANGELOG.md](./CHANGELOG.md) (généré par release-please).
