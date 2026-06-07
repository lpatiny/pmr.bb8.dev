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

### Points d'accès

| Méthode | Chemin                           | Description                         |
| ------- | -------------------------------- | ----------------------------------- |
| `GET`   | `/api/health`                    | Vérification de l'état du service   |
| `GET`   | `/api/v1/trains/oostende-bruges` | Trains accessibles Ostende → Bruges |
| `GET`   | `/api/v1/trains/bruges-oostende` | Trains accessibles Bruges → Ostende |
| `GET`   | `/docs`                          | Documentation Swagger de l'API      |

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
