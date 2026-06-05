# GameFinder — Résultats Load Testing (k6)

> Date : 2026-06-05 · Machine de test : 14 cœurs / 36 GB (Docker Desktop, sans limites de ressources)
> Modèle de charge **réaliste** : chaque utilisateur s'authentifie **une fois** puis navigue en boucle
> (profile → liste lobbies → création lobby 30% → recherche → WebSocket 20% → ping).

---

## 1. Synthèse par palier (après optimisation bcrypt natif)

| Users | Latence médiane | Latence p95 | Erreurs | Login OK | Verdict |
|------:|----------------:|------------:|--------:|---------:|---------|
| 100   | < 10 ms         | ~0.8 s      | ~0 %    | 100 %    | ✅ Confortable |
| 500   | 6 ms            | 1.92 s      | 0 %     | 100 %    | ✅ OK (queue p95 qui monte) |
| 1000  | 57 ms           | **280 ms**  | 1.6 %   | 95 %     | ✅ Tient bien |

## 2. Consommation ressources observée

| Service | 500 users | 1000 users (bcrypt natif) | Notes |
|---------|-----------|---------------------------|-------|
| **backend** CPU | pic 204 %, soutenu 120-170 % | **pic 885 %** (≈8.8 cœurs), soutenu 400-700 % | Burst au pic d'auth |
| **backend** RAM | ~920 MB | ~985 MB - 1.16 GB | Stable |
| **postgres** CPU | pic 60 % | pic ~92 % (≈1 cœur) | 2e goulot potentiel |
| **postgres** RAM | ~345 MB | ~270-680 MB | OK |
| nginx | négligeable | négligeable | < 5 MB |

> Le pic CPU correspond au **burst d'authentification** (tous les VUs se connectent quasi simultanément au ramp-up).
> En navigation steady-state, le backend reste autour de 150-250 % CPU.

## 3. Le goulot identifié et corrigé

### Problème : `bcryptjs` (JS pur) bloquait l'event loop
- `auth.service.ts` importait `bcryptjs` → hashing sur le **thread principal** mono-cœur.
- Sous charge, chaque register/login sérialisait → file d'attente event loop → effondrement.

### Avant le fix — 1000 users échouent
| p95 | Erreurs | Login |
|----:|--------:|------:|
| 3.61 s | 4.68 % | **67 %** |

### Fix appliqué
1. `auth.service.ts` : `import * as bcrypt from "bcryptjs"` → `from "bcrypt"` (natif, délègue au thread pool libuv).
2. `docker-compose.yml` backend : `UV_THREADPOOL_SIZE: 12` (thread pool par défaut = 4).
3. `@types/bcrypt` ajouté en devDependency.
- ✅ Hashes **rétro-compatibles** (format bcrypt standard) — mots de passe existants valides.

### Après le fix — 1000 users tiennent
| p95 | Erreurs | Login | Gain |
|----:|--------:|------:|------|
| **280 ms** | 1.59 % | **95 %** | p95 ×13, login +28 pts |

## 4. Recommandations de dimensionnement (production)

| Cible | Backend | PostgreSQL | Stratégie |
|-------|---------|------------|-----------|
| **100 users** | 1 vCPU, 1 GB RAM | 1 vCPU, 512 MB | Mono-instance suffit |
| **500 users** | 2 vCPU, 1.5 GB RAM | 1 vCPU, 1 GB | Mono-instance, surveiller p95 |
| **1000 users** | 4 vCPU (burst), 2 GB RAM | 2 vCPU, 1 GB | Idéal : **2 répliques backend** derrière nginx (load-balance le burst d'auth) |

### Pistes d'amélioration restantes (par priorité)
1. **Scale horizontal backend** : le burst d'auth pousse à ~9 cœurs. 2-3 répliques Node derrière nginx lissent le pic et apportent de la redondance.
2. **PostgreSQL à ~92 %** à 1000 users : prochaine limite. Vérifier les index sur les requêtes lobbies/search, envisager un pool de connexions (PgBouncer) et un read-replica si on vise > 1000.
3. **Rate-limiting** sur `/api/auth/*` : protège du burst d'auth (et des abus).
4. **Cache** (Redis) sur la liste des lobbies / recherche users pour décharger la DB.

## 5. Comment reproduire

```bash
cd docs/load-testing
./run.sh small    # 100 users  (~3 min)
./run.sh medium   # 500 users  (~4.5 min)
./run.sh large    # 1000 users (~8 min)

# Monitoring ressources en parallèle :
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
  gamefinder_backend gamefinder_db gamefinder_nginx
```
