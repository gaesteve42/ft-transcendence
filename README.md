# Aucune idee du nom pour l instant ( Vortex ? FindYourGame ?)

---

## 📋 Sommaire
1. [Vue d'ensemble](#vue-densemble)
2. [Pourquoi ce projet ?](#pourquoi-ce-projet)
3. [Concept](#concept)
4. [Stack technique](#stack-technique)
5. [Scope MVP (14 points)](#scope-mvp-14-points)
6. [Fonctionnalités clés](#fonctionnalités-clés)
7. [Planning](#planning)
8. [Organisation d'équipe](#organisation-déquipe)

---

## 🎯 Vue d'ensemble

**nom-du-site** est une plateforme web qui résout un problème qu'on a tous : *"À quoi on joue ce soir ?"*

Au lieu de passer 30 minutes à scroller nos bibliothèques Steam, notre site :
- 🎲 **Mode Groupe (Roulette)** : Synchronise les bibliothèques et laisse le dé décider
- 🧙‍♂️ **Mode Solo (Quest)** : Un questionnaire pour trouver ton prochain jeu *(Phase 2)*

**Focus MVP** : Mode Groupe uniquement

---

## 💡 Pourquoi ce projet ?

### ✅ On résout NOTRE problème
Construire un outil qu'on va vraiment utiliser nous garde motivés.

### ✅ Scope réaliste et flexible
- **MVP simple** : Roulette + bibliothèques Steam = déjà utilisable
- **Extensions naturelles** : Mode solo, stats avancées, algo ML
- **Fallbacks** : Chaque feature complexe a une version simple

### ✅ Stack "industry-standard"
React/Vue, Node/Python, PostgreSQL, WebSockets, OAuth
→ Compétences qu'on utilisera en entreprise

### ✅ Répartition claire des rôles
- Frontend : UI/UX de la roulette
- Backend : API + intégration Steam
- Real-time : Sessions WebSocket
- Data : Algo + stats
→ Pas de dépendances bloquantes

### ✅ Portfolio-ready
- Projet concret et original
- Demo impressive (temps réel)
- Montre qu'on comprend les users

---

## 🎮 Concept

### Flow du Mode Groupe
```
1. User crée une session → lien partageable

2. Les potes rejoignent via le lien
   └─ Tout le monde voit qui est là (temps réel)

3. Configuration des filtres
   ├─ Genre (Action, Coop, Indie...)
   └─ Nombre de joueurs (2-4)

4. Backend trouve les jeux en commun
   └─ Intersection des bibliothèques + filtres

5. Roll the dice 🎲
   └─ Sélection aléatoire + animation

6. Résultat affiché à tout le monde simultanément
   └─ Session sauvegardée dans l'historique
```

---

## 🛠️ Stack technique

### Frontend
```
Framework: React (Vite) ou Vue.js
Style: Tailwind CSS
Real-time: Socket.io-client
HTTP: Axios
```

### Backend
```
Runtime: Node.js
Framework: Express
WebSockets: Socket.io
Database: PostgreSQL
ORM: Prisma
Auth: JWT + Passport.js (OAuth)
```

### DevOps
```
Containers: Docker + Docker Compose
Proxy: Nginx (HTTPS)
```

### APIs externes
```
Steam Web API: Import bibliothèque + données jeux
IGDB API: Métadonnées jeux (backup)
```

---

## 🎯 Scope MVP (14 points)

### Requirements Mandatory (0 points mais obligatoires)
- ✅ App web : Frontend + Backend + Database
- ✅ Docker (une seule commande pour lancer)
- ✅ HTTPS sur le backend
- ✅ Compatible Chrome
- ✅ Git propre (tout le monde contribue)
- ✅ Privacy Policy + Terms of Service
- ✅ Support multi-utilisateurs
- ✅ Auth basique (email/password hashé)
- ✅ Validation inputs (frontend + backend)
- ✅ CSS framework
- ✅ Variables d'environnement (.env)
- ✅ Schema DB clair
- ✅ README complet

### Sélection de modules (15 points)

#### Web (6 points)
| Module | Type | Points |
|--------|------|--------|
| Use frameworks (frontend + backend) | Major | 2 |
| Real-time features (WebSockets) | Major | 2 |
| User interaction (chat, profils, amis) | Major | 2 |

#### User Management (4 points)
| Module | Type | Points |
|--------|------|--------|
| Standard user management | Major | 2 |
| OAuth 2.0 (Steam) | Minor | 1 |
| Game statistics | Minor | 1 |

#### Bonus (5 points)
| Module | Type | Points |
|--------|------|--------|
| Use ORM (Prisma) | Minor | 1 |
| Notification system | Minor | 1 |
| Advanced search | Minor | 1 |
| Custom design system | Minor | 1 |
| PWA (si temps) | Minor | 1 |

**Total : 15 points** (1 point de marge)

---

## 🔑 Fonctionnalités clés

### 1. Authentification
- **Email/Password** : Inscription classique (bcrypt)
- **Steam OAuth** : Login en un clic + import auto de la biblio
- **Fallback** : Upload manuel CSV/JSON si OAuth plante

### 2. Profils utilisateurs
```
Page profil (/profile/:username)
├─ Avatar (upload ou défaut)
├─ Username + Bio
├─ Bibliothèque de jeux
├─ Stats : sessions jouées, jeu préféré
└─ Gestion d'amis (add/remove)
```

### 3. Système d'amis
- Add/remove simple (pas de "pending request" pour MVP)
- Status online/offline (via WebSocket)
- Page liste d'amis : `/friends`

### 4. Bibliothèque de jeux
```
Sources :
├─ Steam API (import auto)
└─ Upload manuel (fallback CSV)

Données par jeu :
├─ ID (Steam AppID)
├─ Nom
├─ Image de couverture
├─ Genres/Tags
└─ Nombre de joueurs (min-max)
```

### 5. Sessions de groupe (Feature principale)
```
Création :
POST /api/sessions/create → /session/:id

Events WebSocket :
├─ user_joined : Mise à jour liste participants
├─ user_left : Retrait de la liste
├─ filters_changed : Re-calcul jeux communs
├─ roll_dice : Animation roulette
└─ result_ready : Affichage résultat

Flow :
1. Créer session
2. Partager lien
3. Attendre participants (updates live)
4. Configurer filtres (host)
5. Roll the dice 🎲
6. Voir résultat (tous en même temps)
7. Session auto-sauvegardée
```

### 6. Chat basique
- Intégré dans la page de session
- Temps réel via WebSocket
- Format simple : "Username: message"
- Pas de persistence (ou 50 derniers messages)

### 7. Algorithme de sélection
```javascript
// Simple mais efficace
function selectGame(commonGames, filters)
{
    // 1. Filtrer selon critères
    let filtered = commonGames.filter(game =>
	{
        if (filters.genre && !game.genres.includes(filters.genre))
            return false;
        if (filters.playerCount && game.maxPlayers < filters.playerCount)
            return false;
        return true;
    });
    // 2. Fallback sur tous les jeux si aucun match
    if (filtered.length === 0) filtered = commonGames;
    // 3. Sélection aléatoire
    return filtered[Math.floor(Math.random() * filtered.length)];
}
```
**Pas de ML pour le MVP** - Random intelligent suffit

### 8. Stats et historique
```
/history
├─ Liste des sessions passées
│  ├─ Date
│  ├─ Participants
│  └─ Jeu choisi

/stats
├─ Nombre total de sessions
├─ Top 5 jeux les plus joués
├─ Top 3 potes avec qui tu joues
└─ Graph simple : sessions par semaine
```

### 9. Recherche avancée
```
/library
├─ Barre de recherche (nom du jeu)
├─ Filtres :
│  ├─ Genre (dropdown)
│  ├─ Multijoueur (toggle)
│  └─ Nombre joueurs (slider 1-8)
└─ Tri :
   ├─ Alphabétique
   ├─ Date d'ajout
   └─ Popularité
```

### 10. Notifications
```
Types :
├─ Invitation à une session
└─ Ami ajouté (optionnel)

Affichage :
├─ Icône cloche avec badge (non lues)
├─ Dropdown liste notifs
└─ Clic → marquer lu + redirect
```

---

## 📅 Planning

### Semaine 1 : Fondations
**Objectif** : Infra + Auth basique

- [ ] Setup Docker (PostgreSQL, Nginx, containers)
- [ ] Schema database
- [ ] Structure frontend/backend
- [ ] Auth email/password
- [ ] Pages Register + Login

**Deliverable** : On peut créer un compte et se login

---

### Semaine 2 : Features core
**Objectif** : Profils + Biblio + Amis

- [ ] OAuth Steam
- [ ] Import auto bibliothèque
- [ ] Profils (view/edit)
- [ ] Upload avatar
- [ ] Système d'amis
- [ ] Affichage bibliothèque

**Deliverable** : On peut se connecter avec Steam, voir ses jeux, add des amis

---

### Semaine 3 : Mode Groupe
**Objectif** : Sessions temps réel

- [ ] Setup WebSocket (Socket.io)
- [ ] Création sessions + liens uniques
- [ ] Tracking participants temps réel
- [ ] Algo intersection biblios
- [ ] Système de filtres
- [ ] Roulette/sélection
- [ ] Chat intégré

**Deliverable** : Session de groupe fonctionne end-to-end

---

### Semaine 4 : Polish + Modules
**Objectif** : MVP complet

- [ ] Historique + stats
- [ ] Advanced search
- [ ] Notifications
- [ ] Privacy Policy + Terms
- [ ] Bug fixing + tests
- [ ] README
- [ ] Prep déploiement

**Deliverable** : Projet validable (14+ points)

---

## 👥 Organisation d'équipe

### Rôles recommandés

**Developers (Tous les membres)**

Spécialisations suggérées :

**Dev Frontend**
- Components React/Vue
- Styling Tailwind
- WebSocket client
- Responsive design

**Dev Backend**
- API Express
- Database + Prisma
- Auth logic
- Intégration Steam API

**Dev Full-stack / Real-time**
- WebSocket server (Socket.io)
- Session management
- Sync état temps réel
- Chat

**Dev Ops / Stats**
- Algo sélection jeux
- Calculs stats
- Logique search/filter
- Data viz

---

## ✅ Critères de succès

### Checklist MVP (doit marcher pour validation)
```
Auth & Profils :
□ Créer compte (email/password)
□ Login avec Steam
□ Jeux Steam importés auto
□ Voir et éditer profil
□ Upload avatar

Amis :
□ Add/remove amis
□ Voir liste amis
□ Status online (temps réel)

Sessions groupe :
□ Créer session avec lien
□ Amis peuvent rejoindre
□ Liste participants update temps réel
□ Filtrer jeux (genre, nb joueurs)
□ Roulette sélectionne jeu aléatoire
□ Résultat affiché simultanément
□ Chat fonctionne

Historique & Stats :
□ Voir historique sessions
□ Stats basiques (top jeux, etc.)

Search & Notifs :
□ Chercher/filtrer sa bibliothèque
□ Recevoir notifications

Technique :
□ Plusieurs users simultanés OK
□ Lance avec une commande Docker
□ HTTPS configuré
□ Pas d'erreurs console
□ Privacy + Terms accessibles
□ README complet
```

---

## 🚫 Hors scope (MVP)

Ces features sont **explicitement PAS** dans le MVP :

❌ Mode Solo (questionnaire)

❌ Algo ML complexe

❌ Import multi-plateformes (Epic, Xbox, PlayStation)

❌ Upload manuel biblio (sauf si OAuth fail)

❌ Voice chat

❌ Intégration streaming

❌ App mobile native

❌ Plusieurs langues

❌ Gamification avancée (badges, XP)

❌ Public API documentée

---

## 🔥 Phase 2 (Si temps)

Après validation du MVP :

1. **Mode Solo - Quest** : Questionnaire perso

2. **Algo ML** : Collaborative filtering

3. **Multi-plateformes** : Epic, Xbox, PlayStation

4. **Gamification** : Badges, XP, challenges

5. **Stats avancées** : Trends, prédictions

6. **PWA** : Install mobile, offline

7. **i18n** : Français, Anglais, Espagnol

8. **Mode Tournoi** : Système de brackets

---

## 📞 Next Steps

1. **Kickoff Meeting**
   - Review ce document ensemble
   - Assigner les rôles
   - Confirmer les choix tech

2. **Setup**
   - Créer repo GitHub
   - Setup outil de PM (Trello/GitHub Projects)
   - Init Docker environment
   - Définir workflow Git (branches, PRs)

3. **Sprint Planning Semaine 1**
   - Découper les tâches
   - Assigner responsabilités
   - Setup daily standup (10min)

---
