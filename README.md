# FindYourGame - Brief Projet

*Projet Transcendance 42 - Équipe [Leo, Gauthier, Kevin, Pierre]*

---

## 🛠️ Stack Technique

### Frontend
- **React** (avec React) + **Tailwind CSS**

- Socket.io-client (temps réel)
- Axios (appels API)
- React Router (navigation)

### Backend
- **Node.js** + **Express**

- Socket.io (WebSockets)
- Passport.js (OAuth Steam)
- bcrypt + JWT (auth)

### DevOps
- **Docker** + Docker Compose
- Nginx (reverse proxy HTTPS)

### APIs externes
- Steam Web API (bibliothèques + métadonnées jeux)
- IGDB API (backup pour infos jeux)

---

## 🎯 Modules pour 14 points

### Web (6 points)
- Use frameworks frontend + backend **(Major - 2pts)**
- Real-time features WebSockets **(Major - 2pts)**
- User interaction (chat, profils, amis) **(Major - 2pts)**

### User Management (2 points)
- Standard user management **(Major - 2pts)**

### IA (2 points)
- Recommendation system using machine learning. **(Major - 2pts)**

### DEVOPS (4 points)
- Infrastructure for log management using ELK **(Major - 2pts)**
- Monitoring system with Prometheus and Grafana. **(Major - 2pts)**

### Bonus
- OAuth 2.0 Steam **(Minor - 1pt)**
- Notification system **(Minor - 1pt)**
- Advanced search **(Minor - 1pt)**
- Custom design system **(Minor - 1pt)**
- File upload (avatars) **(Minor - 1pt)**
- Health check and status page system **(Minor - 1pt)**

---

### Mapping Mood → Tags de jeux

- **Chill** → Tags : casual, relaxing, exploration
- **Compétitif** → Tags : competitive, pvp, ranked
- **Coopératif** → Tags : coop, co-op, pve, team
- **Fun** → Tags : party, funny, arcade

### Exemple de résultat
```
🎮 Recommandations pour votre groupe :

1. ⭐⭐⭐⭐⭐ Overcooked 2 (96%)
   └─ Match parfait : Coop + Fun + 4 joueurs

2. ⭐⭐⭐⭐ Rocket League (85%)
   └─ Bon match : Compétitif + sessions courtes

3. ⭐⭐⭐⭐ Left 4 Dead 2 (82%)
   └─ Match : Coop + Action

4. ⭐⭐⭐ GTA V (68%)
   └─ Match partiel : Action mais sessions longues

5. ⭐⭐⭐ Minecraft (65%)
   └─ Match partiel : mood mixte
```

---
