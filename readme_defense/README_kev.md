*This project has been created as part of the 42 curriculum by  gaesteve, lpellegr, picarlie, kpourcel.*

# GameFinder

## Description

GameFinder est une plateforme de recommandation de jeux multijoueur. Les joueurs rejoignent un lobby commun, et un moteur hybride (contenu + filtrage collaboratif) suggère des jeux adaptés aux goûts du groupe entier — en excluant les jeux déjà possédés par l'un des membres.

### Key Features

- **Authentification** : inscription locale (email/password) + OAuth Steam
- **Bibliothèque** : import automatique de la bibliothèque Steam, ajout manuel via IGDB
- **Lobbies** : création/rejoindre, chat temps réel, sélection de genres (max 3 tags)
- **Recommandations** : moteur ML hybride (TF-IDF + ALS) avec scoring de groupe
- **Amis** : envoi/acceptation de demandes, suivi de présence (last seen)
- **Monitoring** : Prometheus + Grafana + Loki (logs)

---

## Team Information

### kpourcel (Kévin Pourcel)
- **Role(s):** Backend 
- **Responsibilities:** API NestJS (auth, lobbies, users, games, friendships), WebSocket gateway, schéma Prisma, intégration Steam OAuth, Steam Web API & IGDB

### gaesteve42 (Gauthier Esteve)
- **Role(s):** Frontend 
- **Responsibilities:** UI React (Dashboard, Library, Session/Lobby, Profile), routing, Tailwind CSS, intégration Socket.io côté client, SteamCallback

### picarlie (Pierre)
- **Role(s):** ML / Recommandation
- **Responsibilities:** Microservice Python/FastAPI, TF-IDF content-based filtering, ALS collaborative filtering, scoring de groupe, gestion cold-start (ALPHA adaptatif)

### leo
- **Role(s):** DevOps
- **Responsibilities:** Migrations, Docker Compose, monitoring (Prometheus/Grafana/Loki)

---

## Project Management

### Work Organization
Chaque membre est responsable de son domaine. Les intégrations inter-services (ex: appel backend → microservice ML, frontend → WebSocket) sont coordonnées via PR et tests manuels.

### Project Management Tools
- GitHub (branches feature, PRs)
- Notion (tickets / suivi)

### Communication Channels
- Discord (coordination quotidienne, webhook alertes Grafana)

---

## Technical Stack

### Frontend
- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 4** + **Motion** (animations)
- **Socket.io-client 4** (WebSocket)
- Routage : **React Router 7**

### Backend
- **NestJS 11** (TypeScript, Node.js) — architecture modulaire
- **Prisma 6** — ORM type-safe, migrations auto au démarrage
- **Socket.io 4** — WebSocket gateway pour les lobbies (chat, statuts)
- **Passport + JWT** — authentification, guards globaux
- **bcryptjs** — hachage des mots de passe
- **class-validator / class-transformer** — validation des DTOs

### Microservice Recommandation
- **Python 3.12** + **FastAPI** + **Uvicorn** (port 8001)
- **SQLAlchemy** (accès DB), **scikit-learn** (TF-IDF), **implicit** (ALS), **numpy / pandas / scipy**

### Database
- **PostgreSQL 16**
- PgAdmin 4 (interface d'administration, port 5050)

### Other Technologies & Libraries
| Outil | Rôle |
|-------|------|
| Docker + Docker Compose | Containerisation de tous les services |
| Nginx (Alpine) | Reverse proxy SSL, entrée unique (`https://localhost`) puis
| via hebergement (`https://gamefinder.quest`) |
| Prometheus | Collecte de métriques |
| Grafana | Dashboards métriques + alertes Discord |
| Loki + Promtail | Centralisation des logs |
| pg-exporter, nginx-exporter, blackbox-exporter | Exporteurs Prometheus |
| Steam Web API | Import bibliothèque + métadonnées jeux |
| IGDB API | Base de données jeux alternative |

### Justification for Major Technical Choices

- **NestJS** : architecture modulaire native (controllers/services/modules), injection de dépendances, intégration facile de Guards/Interceptors, WebSocket gateway intégré. Idéal pour une API REST + temps réel dans un même process.
- **Prisma** : schéma déclaratif unique (source de vérité), migrations versionnées, client type-safe généré automatiquement — évite les erreurs de runtime sur les requêtes DB.
- **JWT stateless** : pas de session server-side, scalable, compatible WebSocket (token passé au handshake).
- **Microservice ML séparé** (Python/FastAPI) : isolation du runtime Python du backend Node, déploiement indépendant, scikit-learn/implicit natifs en Python.

---

## Database Schema

### Tables & Relationships

```
User ──┬── UserGame ──── Game ──── GameSourceTag ──── Tag
       ├── Lobby (owner)           │
       ├── LobbyMember ────────────┘ (Lobby)
       ├── LobbyTagPreference ──── Lobby + Tag
       └── Friendship (requester/addressee)
                 GameExternalId ──── Game
```

### Key Fields & Data Types

| Table | Champs clés |
|-------|-------------|
| **User** | `id` (UUID), `username` (String), `email` (String unique), `passwordHash` (String nullable), `steamId` (String nullable), `authProvider` (LOCAL \| STEAM), `avatarUrl`, `lastSeenAt` |
| **Game** | `id` (UUID), `canonicalSlug` (String unique), `name`, `summary`, `coverUrl`, `firstReleaseDate` |
| **UserGame** | `userId` + `gameId` (PK composite), `owned` (Bool), `playtimeMinutes` (Int), `lastSyncedAt` |
| **GameExternalId** | `gameId`, `source` (STEAM \| IGDB), `externalId`, `externalUrl` |
| **GameSourceTag** | `gameId`, `source`, `externalTagId`, `label`, `weight`, `normalizedTagId` |
| **Tag** | `id` (UUID), `slug` (unique), `label` |
| **Lobby** | `id` (UUID), `name`, `maxPlayers`, `ownerId` (FK User) |
| **LobbyMember** | `lobbyId` + `userId` (PK composite), `joinedAt` |
| **LobbyTagPreference** | `lobbyId` + `userId` + `tagId` (PK composite) — max 3 tags par user/lobby |
| **Friendship** | `requesterId` + `addresseeId` (PK composite), `status` (PENDING \| ACCEPTED), `createdAt` |

---

## Instructions

### Prerequisites
- Docker + Docker Compose
- Fichier `.env` à la racine (copier `.env.example` et renseigner les clés API)
  - `STEAM_API_KEY` — clé Steam Web API
  - `JWT_SECRET` — secret arbitraire
  - `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — pour IGDB (OAuth Twitch)

### Installation & Configuration
```bash
cp .env.example .env
# Renseigner les variables dans .env
```

### Running the Project
```bash
# Démarrer tous les services (build inclus)
make up
# ou : docker compose up -d --build

# Accès principal
https://localhost          # Application (via Nginx)
https://localhost/api      # API REST
http://localhost:5050      # PgAdmin
http://localhost:3000      # Grafana
http://localhost:9090      # Prometheus
https://gamefinder.quest   # Url Hébergé 

# Logs en direct
make logs

# Arrêt (données conservées)
make down

# Reset complet de la DB
make reset-db

# Nettoyage total (images + volumes)
make fclean
```

---

## Features List

| Feature | Description | Team Member(s) |
|---------|-------------|----------------|
| Inscription / Connexion locale | Email + password, JWT | kpourcel |
| OAuth Steam | Connexion via compte Steam | kpourcel |
| Import bibliothèque Steam | Sync jeux + playtime depuis Steam API | kpourcel |
| Recherche de jeux (IGDB) | Ajout manuel de jeux à sa bibliothèque | kpourcel |
| Gestion des lobbies | Création, rejoindre, quitter | kpourcel |
| Chat temps réel (lobby) | Messages via WebSocket, historique 100 msg | gaesteve |
| Sélection de tags de genre | Max 3 tags par user/lobby pour booster les reco | kpourcel / gaesteve42 |
| Recommandations de groupe | Moteur ML hybride, top 10, scores de compatibilité | picarlie |
| Système d'amis | Demandes, acceptation, statut en ligne | lpellegr42 |
| Upload d'avatar | Image de profil personnalisée | gaesteve42 |
| Dashboard utilisateur | Vue d'ensemble bibliothèque + historique | gaesteve42 |
| Monitoring | Dashboards Grafana, alertes Discord | lpellegr42 |
| Logs centralisés | Loki + Promtail + Grafana | lpellegr42 |
| Page de statut | Status page statique des services | lpellegr42 |
| Privacy Policy / CGU | Pages légales | gaesteve42 |

---

## Modules

| Module | Type | Points | Team Member(s) | Justification |
|--------|------|--------|----------------|---------------|
| Frameworks frontend (React) + backend (NestJS) | Major | 2 | gaesteve42 / kpourcel | React : UI composant réutilisable + état réactif. NestJS : architecture modulaire, DI, guards. |
| Real-time WebSockets | Major | 2 | kpourcel / gaesteve| Socket.io pour chat et mises à jour live du lobby (join/leave, readiness, résultats) |
| User interaction (chat, profils, amis) | Major | 2 | kpourcel / gaesteve42 | Chat lobby, pages profil éditables, système de friendship PENDING/ACCEPTED |
| ORM (Prisma) | Minor | 1 | kpourcel | Schéma déclaratif, client type-safe, migrations versionnées, zero SQL manuel |
| Support navigateurs supplémentaires | Minor | 1 | gaesteve42 | Compatible Chrome, Firefox, Safari (CSS standard + Tailwind) |
| Gestion utilisateur standard | Major | 2 | kpourcel | Register/login, JWT, profil, avatar, changement de mot de passe |
| Système de recommandation ML | Major | 2 | picarlie  | TF-IDF (contenu) + ALS (collaboratif), scoring de groupe, cold-start adaptatif |
| Monitoring Prometheus + Grafana | Major | 2 | lpellegr42 | Métriques système + app, dashboards, alertes Discord via webhook |
| Health check + status page | Minor | 1 | lpellegr42 | Endpoints `/health` sur chaque service + page statique de statut |
| Loki — gestion des logs | Minor | 1 | lpellegr42 | Promtail collecte les logs Docker, Loki les agrège, Grafana les visualise. Remplace la consultation manuelle des conteneurs. |
| Steam Auth (remplacement auth) | Minor | 1 | kpourcel | Steam OpenID comme provider OAuth alternatif, mappage steamId → User, import automatique de la bibliothèque post-login |

**Total points: 17**

---

## Individual Contributions

### kpourcel (Kévin Pourcel)
- Architecture backend NestJS complète (8 modules : auth, lobbies, users, games, steam-games, igdb, friendships, tags)
- Schéma Prisma + toutes les migrations
- Authentification JWT (guards globaux, decorator `@Public()`) + Steam OAuth (OpenID)
- Intégration Steam Web API (import bibliothèque + métadonnées) et IGDB
- Endpoint `POST /lobbies/:id/recommend` → appel microservice Python

### gaesteve42 (Gauthier Esteve)
- Toutes les pages frontend React (Home, Register/Login, Dashboard, Library, Session, Profile, SteamCallback, Privacy, ToS)
- Routing React Router 7
- WebSocket gateway (lobbies : join/leave/chat/readiness/recommend)
- Intégration Socket.io côté client (events lobby en temps réel)
- Design UI Tailwind CSS + animations Motion
- Upload d'avatar (multer, stockage local)

### picarlie (Pierre) / lpellegr42 (Leo)
- Microservice Python FastAPI (`/recommend/{lobby_id}`)
- Pipeline ML : TF-IDF vectorization des tags, ALS collaborative filtering, agrégation scores de groupe

### lpellegr42 (Leo)
- Infrastructure Docker Compose (8 services)
- Nginx : reverse proxy SSL, routing `/api` et `/socket.io`
- Stack monitoring : Prometheus, Grafana (dashboards + alertes Discord), Loki, Promtail, exporteurs (pg, nginx, blackbox)
- Système de friendship (PENDING/ACCEPTED, last seen)
---

## Resources

### Documentation & References
- [NestJS](https://docs.nestjs.com)
- [Prisma](https://www.prisma.io/docs)
- [Socket.io](https://socket.io/docs/v4/)
- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [IGDB API](https://api-docs.igdb.com/)

### AI Usage
- Génération du template README.
- Use for debug.
- AI was used in learning mode in order to understand some key concepts for machine learning algorithms.
