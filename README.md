# FindYourGame - Brief Projet

*Projet Transcendance 42 - Équipe [Leo, Gauthier, Kevin, Pierre]*

---

## 🎯 Le Concept

**Problème :** "À quoi on joue ce soir ?"

**Solution :** Une plateforme web qui synchronise les bibliothèques Steam de ton groupe d'amis et recommande intelligemment les meilleurs jeux à jouer ensemble selon vos envies du moment.

**Focus MVP :** Mode Groupe uniquement

---

## 🎮 Comment ça marche ?

### Flow utilisateur
```
1. Tu crées une session → tu obtiens un lien

2. Tes potes rejoignent via le lien
   └─ Tout le monde se voit en temps réel

3. Chaque participant indique ses envies :
   ├─ Mood : Chill / Compétitif / Coopératif / Fun
   └─ Genre préféré
   └─ combien d argent pret a mettre ( 10$, 20$, 30$...)

4. Le système analyse :
   ├─ Trouve les jeux que TOUT LE MONDE possède ( si aucun jeu possible, jeu a buy ? / jeu gratuit ?)
   ├─ Calcule un score de compatibilité pour chaque jeu
   └─ Prend en compte vos préférences du moment

5. Résultat : Top 5 jeux recommandés
   └─ Avec scores

6. Le groupe vote
   └─ Session sauvegardée dans l'historique
```

---

## 💡 Pourquoi ce projet ?

### ✅ On résout NOTRE problème
Pas un projet théorique, on construit un outil qu'on utilisera vraiment.

### ✅ Scope réaliste
- MVP simple mais fonctionnel = 14+ points garantis
- Extensible si on a le temps (stats avancées, mode solo, etc.)
- Chaque feature a un fallback simple

### ✅ Stack moderne
- Technologies demandées en entreprise
- Compétences valorisables sur le CV
- Pas de technos obscures

### ✅ Rôles clairs
- Chacun a son domaine (frontend, backend, real-time, data)
- Pas de dépendances bloquantes entre nous
- Parallélisation du travail possible

---

## 🛠️ Stack Technique

### Frontend
- **React** (avec Vite) + **Tailwind CSS**
- Socket.io-client (temps réel)
- Axios (appels API)
- React Router (navigation)

### Backend
- **Node.js** + **Express**
- **PostgreSQL** + **Prisma** (ORM)
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

### User Management (3 points)
- Standard user management **(Major - 2pts)**
- OAuth 2.0 Steam **(Minor - 1pt)**

### Bonus (6 points pour sécurité)
- Use ORM Prisma **(Minor - 1pt)**
- Game statistics **(Minor - 1pt)**
- Notification system **(Minor - 1pt)**
- Advanced search **(Minor - 1pt)**
- Custom design system **(Minor - 1pt)**
- File upload (avatars) **(Minor - 1pt)**

**Total : 15 points** (marge de sécurité)

---

## 🔑 Features MVP (Ce qui DOIT marcher)

### Auth & Profils
- Inscription/Login (email + password)
- Connexion Steam OAuth → import auto de la biblio
- Profil utilisateur (avatar, bio, bibliothèque)

### Social
- Système d'amis (add/remove, liste)
- Status online/offline (temps réel)

### Session de groupe (CORE)
- Création de session → lien unique partageable
- Les potes rejoignent (updates temps réel)
- Chacun indique ses préférences (mood, durée, genre)
- **Algorithme intelligent** :
  - Trouve les jeux en commun
  - Calcule un score selon les préférences du groupe
  - Retourne Top 5 jeux avec explications
- Vote ou choix du host
- Chat intégré (temps réel)
- Session sauvegardée automatiquement

### Historique & Stats
- Liste des sessions passées (date, participants, jeu)
- Stats simples :
  - Nombre de sessions
  - Top 3 jeux les plus joués
  - Top 3 amis avec qui tu joues

### Autres
- Search/filter dans sa bibliothèque
- Notifications (invitations à des sessions)

---

## 🧠 L'Algorithme (Logique)

**Objectif :** Pas de random bête, un vrai matching intelligent.

### Comment ça marche ?
```
Pour chaque jeu en commun :

1. Mood matching (40% du score)
   └─ Le jeu correspond aux moods choisis par le groupe ?

2. Genre matching (30% du score)
   └─ Le jeu correspond aux genres préférés ?

3. Player count (20% du score)
   └─ Le jeu supporte le nombre de joueurs ?

4. Freshness bonus (10% du score)
   └─ Le jeu n'a pas été joué récemment par le groupe ?

→ Score total sur 100
→ On affiche le Top 5
```

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

## 📅 Planning (4 semaines)

### Semaine 1 : Setup + Auth
**Objectif :** Infrastructure + Authentification
- Docker setup complet
- Database schema
- Auth (register/login + Steam OAuth)
- Pages Register/Login frontend

**Deliverable :** On peut créer un compte et se connecter avec Steam

---

### Semaine 2 : Profils + Biblios + Amis
**Objectif :** Données utilisateurs + Social
- Profils (view/edit, avatars)
- Import biblio Steam
- Système d'amis
- Affichage bibliothèque de jeux

**Deliverable :** Profils complets, on voit nos jeux, on peut add des amis

---

### Semaine 3 : Sessions + Algo + Chat
**Objectif :** Feature principale (CORE)
- WebSocket setup (sessions temps réel)
- Page session complète
- Algorithme de recommandation avec scoring
- Chat intégré
- Vote/choix final

**Deliverable :** Session end-to-end fonctionnelle avec algo qui donne des résultats cohérents

---

### Semaine 4 : Finitions + Validation
**Objectif :** Modules restants + Polish
- Historique sessions
- Stats basiques
- Notifications
- Search/filter avancé
- Privacy Policy + Terms
- README complet
- Tests finaux + bug fixes

**Deliverable :** Projet validable à 100%

---

## 👥 Organisation d'Équipe

### Rôles (à définir ensemble)

**Product Owner** (1 personne)
- Vision produit + priorités
- Validation des features
- Décisions UX/UI

**Project Manager** (1 personne)
- Organisation quotidienne
- Planning + tracking
- Coordination équipe

**Tech Lead** (1 personne)
- Architecture technique
- Décisions tech
- Code reviews critiques

**Developers** (tous)
- Frontend Lead : React + UI/UX
- Backend Lead : API + Database
- Real-time Dev : WebSockets + Chat
- Data/Algo : Scoring + Stats

> Une personne peut avoir plusieurs rôles (ex: PO + Frontend Dev)

---

## 🚫 Hors Scope MVP

On ne fait **PAS** dans le MVP (Phase 2 si temps) :

❌ Mode Solo (questionnaire personnel)
❌ Algo ML complexe (on fait du scoring simple)
❌ Multi-plateformes (Epic, Xbox, PlayStation)
❌ Gamification (badges, XP, achievements)
❌ Stats avancées (graphiques complexes, trends)
❌ PWA (installation mobile)
❌ Public API documentée
❌ Plusieurs langues (anglais uniquement)
❌ Voice chat

---

## ✅ Checklist de Réussite

### Le projet est validable si :
```
Auth :
□ Register + Login fonctionnent
□ Steam OAuth + import biblio OK

Profils :
□ Profils éditables avec avatars
□ Bibliothèques de jeux affichées

Social :
□ Système d'amis fonctionne
□ Status online/offline

Sessions :
□ Création + join via lien
□ Temps réel (participants, chat)
□ Préférences → Top 5 recommandations pertinentes
□ Session sauvegardée

Autres :
□ Historique accessible
□ Stats basiques
□ Notifications marchent
□ Search/filter biblio

Technique :
□ Multi-utilisateurs simultanés OK
□ Docker → une commande
□ HTTPS configuré
□ Pas d'erreurs console
□ Privacy + Terms accessibles
□ README complet (rôles, modules, setup)
```

---

## 🎯 En Résumé

**Objectif :** Un outil qui résout vraiment le problème "À quoi jouer ce soir ?"

**Comment :** Algo intelligent basé sur les préférences du moment, pas du random

**Scope :** Features essentielles pour garantir 14+ points, pas de fioritures

**Timing :** 4 semaines, planning réaliste et serré

**Philosophie :** Mieux vaut un MVP propre et fonctionnel qu'un projet avec plein de features à moitié finies

---

**Let's build something useful! 🚀**
