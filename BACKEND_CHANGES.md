# Modifications Backend & Infra — branche `feature/lobby`

> Ces changements ont été faits par l'équipe front pour supporter les **WebSockets**
> et améliorer la gestion du **lobby en temps réel**.
> Merci de les review et de les intégrer côté backend.
> Ce fichier peut être supprimé après merge.

---

## 1. Nouvelles dépendances (`backend/package.json`)

```
@nestjs/websockets        ^11.1.16
@nestjs/platform-socket.io ^11.1.16
socket.io                  ^4.8.3
```

**Pourquoi ?** NestJS a besoin de ces 3 packages pour exposer un serveur WebSocket via Socket.IO.
Penser à `npm ci` après pull.

---

## 2. Nouveau fichier : `backend/src/lobbies/lobby.gateway.ts`

C'est le **WebSocket Gateway** du lobby. Il gère 3 événements :

| Événement         | Direction       | Description                              |
|-------------------|-----------------|------------------------------------------|
| `lobby:join`      | Client → Server | Le client rejoint une room Socket.IO     |
| `lobby:chat`      | Client → Server | Message chat dans le lobby (max 500 car) |
| `lobby:updated`   | Server → Client | Broadcast de l'état du lobby après modif |
| `lobby:state`     | Server → Client | État initial envoyé au client qui rejoint|
| `lobby:deleted`   | Server → Client | Notification si le lobby a été supprimé  |
| `lobby:chat:message` | Server → Client | Diffusion d'un message chat à la room |

La méthode `broadcastLobbyUpdate(lobbyId)` est appelée depuis le controller
après chaque action REST (join, leave, setTags) pour synchroniser tous les clients.

---

## 3. Modifications de `lobbies.module.ts`

Ajout de `LobbyGateway` dans les `providers` pour que NestJS l'instancie.

---

## 4. Modifications de `lobbies.controller.ts`

- **Injection de `LobbyGateway`** dans le constructeur.
- **Nouveau endpoint `GET /api/lobbies/me`** : retourne le lobby du user connecté (ou `null`).
- **join / leave / setTags** sont maintenant `async` et appellent
  `this.gateway.broadcastLobbyUpdate(lobbyId)` après chaque action pour notifier
  les autres clients en temps réel via WebSocket.

---

## 5. Modifications de `lobbies.service.ts`

### 5a. `players` enrichi (breaking change)

Avant : `players: string[]` (juste les userId)
Après : `players: LobbyPlayer[]` avec :

```ts
{ id: string, username: string, avatarUrl: string | null }
```

**Pourquoi ?** Le front a besoin du username et de l'avatar pour afficher les membres
du lobby sans faire de requêtes supplémentaires.

Toutes les requêtes Prisma `members.select` ont été mises à jour pour inclure
`user: { select: { id, username, avatarUrl } }`.

### 5b. Nouveau : `getMyLobby(userId)`

Cherche si le user est déjà dans un lobby. Inclut un **TTL de 30 minutes** :
si le lobby n'a pas été mis à jour depuis 30 min, il est supprimé automatiquement.

### 5c. Auto-leave du lobby précédent

Dans `createMembershipOrThrow` : si le joueur est déjà dans un autre lobby,
il en sort automatiquement avant de rejoindre le nouveau. Si l'ancien lobby
se retrouve vide, il est supprimé. Si le joueur était owner, l'ownership
est transférée au membre le plus ancien.

### 5d. Assertions mises à jour

`assertJoinAllowed` et `assertLeaveAllowed` utilisent maintenant
`.some((p) => p.id === userId)` au lieu de `.includes(userId)` pour refléter
le nouveau type `LobbyPlayer`.

---

## 6. Modifications de `types/lobby.ts`

Ajout du type `LobbyPlayer` et modification du type `Lobby` :

```ts
export type LobbyPlayer = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

// players passe de string[] à LobbyPlayer[]
```

---

## 7. Modifications de `nginx/nginx.conf`

Ajout d'un bloc `location /socket.io` pour proxifier les WebSockets vers le backend :

```nginx
location /socket.io {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ...
}
```

**Sans ce bloc**, les connexions WebSocket du front ne peuvent pas atteindre le backend.

---

## Résumé rapide

| Fichier | Type de modif |
|---------|--------------|
| `backend/package.json` | Ajout de 3 deps WebSocket |
| `backend/src/lobbies/lobby.gateway.ts` | **Nouveau** — WebSocket gateway |
| `backend/src/lobbies/lobbies.module.ts` | Ajout du provider |
| `backend/src/lobbies/lobbies.controller.ts` | Gateway injection + endpoint `/me` + broadcast |
| `backend/src/lobbies/lobbies.service.ts` | Players enrichi, getMyLobby, auto-leave, TTL |
| `backend/src/lobbies/types/lobby.ts` | Nouveau type LobbyPlayer |
| `nginx/nginx.conf` | Proxy WebSocket |
